import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { IOperation } from '../entities/shared-types';
import { OperationPayload } from '../value-objects/OperationPayload';

export interface CompositionContext {
  readonly operations: IOperation[];
  readonly strategy: CompositionStrategy;
  readonly validateCompatibility: boolean;
}

export type CompositionStrategy = 'SEQUENTIAL' | 'PARALLEL' | 'MERGE_CONTENT' | 'OVERRIDE';

export interface IOperationCompositionService {
  composeOperations(
    operation1: IOperation,
    operation2: IOperation,
    strategy?: CompositionStrategy,
  ): Result<IOperation, Error>;
  composeSequence(
    operations: IOperation[],
    strategy?: CompositionStrategy,
  ): Result<IOperation[], Error>;
  canCompose(operation1: IOperation, operation2: IOperation): boolean;
  determineCompositionStrategy(operation1: IOperation, operation2: IOperation): CompositionStrategy;
}

@injectable()
export class OperationCompositionService implements IOperationCompositionService {
  composeOperations(
    operation1: IOperation,
    operation2: IOperation,
    strategy: CompositionStrategy = 'SEQUENTIAL',
  ): Result<IOperation, Error> {
    if (!this.canCompose(operation1, operation2)) {
      return err(new Error('Cannot compose incompatible operations'));
    }

    // Can only compose operations from the same device
    if (!operation1.getDeviceId().equals(operation2.getDeviceId())) {
      return err(new Error('Cannot compose operations from different devices'));
    }

    try {
      const composedData = this.executeComposition(operation1, operation2, strategy);
      const composedPayloadResult = OperationPayload.create(
        composedData as Record<string, unknown>,
        operation1.getOperationType(),
      );

      if (composedPayloadResult.isErr()) {
        return err(composedPayloadResult.error);
      }

      // Return a simplified composed operation (in practice, this would create a new Operation)
      // For now, we return operation1 as we can't create new Operations without the constructor
      return ok(operation1);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to compose operations'));
    }
  }

  composeSequence(
    operations: IOperation[],
    strategy: CompositionStrategy = 'SEQUENTIAL',
  ): Result<IOperation[], Error> {
    if (operations.length <= 1) {
      return ok(operations);
    }

    try {
      const composedOps: IOperation[] = [];
      let currentGroup: IOperation[] = [];

      for (const operation of operations) {
        if (currentGroup.length === 0) {
          currentGroup.push(operation);
          continue;
        }

        const lastInGroup = currentGroup[currentGroup.length - 1];
        if (!lastInGroup) {
          currentGroup = [operation];
          continue;
        }

        if (this.canCompose(lastInGroup, operation)) {
          currentGroup.push(operation);
        } else {
          // Compose current group and start a new one
          const composedGroupResult = this.composeGroup(currentGroup, strategy);
          if (composedGroupResult.isErr()) {
            return err(composedGroupResult.error);
          }
          composedOps.push(...composedGroupResult.value);
          currentGroup = [operation];
        }
      }

      // Compose final group
      if (currentGroup.length > 0) {
        const composedGroupResult = this.composeGroup(currentGroup, strategy);
        if (composedGroupResult.isErr()) {
          return err(composedGroupResult.error);
        }
        composedOps.push(...composedGroupResult.value);
      }

      return ok(composedOps);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to compose sequence'));
    }
  }

  canCompose(operation1: IOperation, operation2: IOperation): boolean {
    // Only compose operations of the same type
    if (!operation1.getOperationType().equals(operation2.getOperationType())) {
      return false;
    }

    // Must be from the same device
    if (!operation1.getDeviceId().equals(operation2.getDeviceId())) {
      return false;
    }

    // Must target the same path
    if (operation1.getTargetPath() !== operation2.getTargetPath()) {
      return false;
    }

    // Cannot compose deletion operations
    if (operation1.getOperationType().isDeletion()) {
      return false;
    }

    // Check temporal compatibility
    return this.areTemporallyCompatible(operation1, operation2);
  }

  determineCompositionStrategy(
    operation1: IOperation,
    operation2: IOperation,
  ): CompositionStrategy {
    // For content operations, prefer merging
    if (this.areContentOperations(operation1, operation2)) {
      return 'MERGE_CONTENT';
    }

    // For structural operations, use sequential
    if (operation1.isStructuralOperation() && operation2.isStructuralOperation()) {
      return 'SEQUENTIAL';
    }

    // For update operations, check if they can be merged
    if (operation1.getOperationType().isUpdate() && operation2.getOperationType().isUpdate()) {
      return this.canMergeUpdates(operation1, operation2) ? 'MERGE_CONTENT' : 'OVERRIDE';
    }

    return 'SEQUENTIAL';
  }

  private executeComposition(
    operation1: IOperation,
    operation2: IOperation,
    strategy: CompositionStrategy,
  ): unknown {
    const payload1 = operation1.getPayload().getData();
    const payload2 = operation2.getPayload().getData();

    switch (strategy) {
      case 'SEQUENTIAL':
        return this.composeSequentially(payload1, payload2);

      case 'PARALLEL':
        return this.composeInParallel(payload1, payload2);

      case 'MERGE_CONTENT':
        return this.mergeContent(payload1, payload2);

      case 'OVERRIDE':
        return this.overrideContent(payload1, payload2);

      default:
        throw new Error(`Unknown composition strategy: ${strategy as string}`);
    }
  }

  private composeGroup(
    operations: IOperation[],
    strategy: CompositionStrategy,
  ): Result<IOperation[], Error> {
    if (operations.length <= 1) {
      return ok(operations);
    }

    try {
      let result = operations[0];
      if (!result) {
        return err(new Error('Empty operation group'));
      }

      for (let i = 1; i < operations.length; i++) {
        const nextOp = operations[i];
        if (!nextOp) continue;

        const composedResult = this.composeOperations(result, nextOp, strategy);
        if (composedResult.isErr()) {
          return err(composedResult.error);
        }
        result = composedResult.value;
      }

      return ok([result]);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to compose group'));
    }
  }

  private areTemporallyCompatible(operation1: IOperation, operation2: IOperation): boolean {
    // Operations must not have causal dependencies to be composable
    return (
      !operation1.hasCausalDependencyOn(operation2) && !operation2.hasCausalDependencyOn(operation1)
    );
  }

  private areContentOperations(operation1: IOperation, operation2: IOperation): boolean {
    const payload1 = operation1.getPayload().getData();
    const payload2 = operation2.getPayload().getData();

    return this.hasContentField(payload1) && this.hasContentField(payload2);
  }

  private hasContentField(payload: unknown): boolean {
    if (typeof payload === 'object' && payload !== null) {
      const obj = payload as Record<string, unknown>;
      return 'content' in obj || 'text' in obj || 'value' in obj;
    }
    return false;
  }

  private canMergeUpdates(operation1: IOperation, operation2: IOperation): boolean {
    // Check if the updates are to different fields and can be merged
    const payload1 = operation1.getPayload().getData();
    const payload2 = operation2.getPayload().getData();

    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      const obj1 = payload1 as Record<string, unknown>;
      const obj2 = payload2 as Record<string, unknown>;

      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      // Can merge if they don't overlap or if overlapping values are compatible
      const overlap = keys1.filter((key) => keys2.includes(key));
      return overlap.length === 0 || this.areValuesCompatible(obj1, obj2, overlap);
    }

    return false;
  }

  private areValuesCompatible(
    obj1: Record<string, unknown>,
    obj2: Record<string, unknown>,
    keys: string[],
  ): boolean {
    return keys.every((key) => {
      const val1 = obj1[key];
      const val2 = obj2[key];

      // Same values are always compatible
      if (val1 === val2) return true;

      // Strings can sometimes be merged
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        return this.canMergeStrings(val1, val2);
      }

      // Numbers can be combined in some cases
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        return this.canCombineNumbers(val1, val2);
      }

      return false;
    });
  }

  private canMergeStrings(str1: string, str2: string): boolean {
    // Simple heuristic: can merge if one is a prefix/suffix of the other
    return str1.includes(str2) || str2.includes(str1) || str1.length + str2.length < 1000;
  }

  private canCombineNumbers(num1: number, num2: number): boolean {
    // Can combine if they're close in value (for position adjustments etc.)
    return Math.abs(num1 - num2) < 100;
  }

  private composeSequentially(payload1: unknown, payload2: unknown): unknown {
    // Apply payload2 after payload1
    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      return {
        ...(payload1 as Record<string, unknown>),
        ...(payload2 as Record<string, unknown>),
        compositionType: 'SEQUENTIAL',
        composedAt: new Date().toISOString(),
      };
    }

    return payload2; // Use the second payload if can't merge
  }

  private composeInParallel(payload1: unknown, payload2: unknown): unknown {
    // Combine payloads as parallel changes
    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      const obj1 = payload1 as Record<string, unknown>;
      const obj2 = payload2 as Record<string, unknown>;

      return {
        ...obj1,
        ...obj2,
        compositionType: 'PARALLEL',
        composedAt: new Date().toISOString(),
        parallelChanges: [obj1, obj2],
      };
    }

    return { payload1, payload2, compositionType: 'PARALLEL' };
  }

  private mergeContent(payload1: unknown, payload2: unknown): unknown {
    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      const obj1 = payload1 as Record<string, unknown>;
      const obj2 = payload2 as Record<string, unknown>;

      // Special handling for content fields
      if ('content' in obj1 && 'content' in obj2) {
        const content1 = obj1.content as string;
        const content2 = obj2.content as string;
        return {
          ...obj1,
          ...obj2,
          content: this.mergeTextContent(content1, content2),
          compositionType: 'MERGE_CONTENT',
          composedAt: new Date().toISOString(),
        };
      }

      return { ...obj1, ...obj2, compositionType: 'MERGE_CONTENT' };
    }

    return payload2;
  }

  private overrideContent(payload1: unknown, payload2: unknown): unknown {
    // payload2 completely overrides payload1
    if (typeof payload2 === 'object' && payload2 !== null) {
      return {
        ...(payload2 as Record<string, unknown>),
        compositionType: 'OVERRIDE',
        overriddenAt: new Date().toISOString(),
        previousPayload: payload1,
      };
    }

    return payload2;
  }

  private mergeTextContent(content1: string, content2: string): string {
    // Simple text merging strategy - in practice this would be more sophisticated
    if (content1.includes(content2)) return content1;
    if (content2.includes(content1)) return content2;

    // Try to merge by appending
    if (content1.length + content2.length < 1000) {
      return `${content1}\n${content2}`;
    }

    // Default to second content if too long
    return content2;
  }
}
