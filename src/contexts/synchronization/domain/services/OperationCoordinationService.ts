import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import { Conflict } from '../entities/Conflict';
import type { Operation } from '../entities/Operation';

export interface IOperationCoordinationService {
  applyOperation(operation: Operation, currentState: unknown): Promise<Result<unknown, Error>>;
  detectConflicts(operations: Operation[]): Promise<Result<Conflict[], Error>>;
  orderOperations(operations: Operation[]): Result<Operation[], Error>;
  transformOperation(
    operation: Operation,
    againstOperations: Operation[],
  ): Promise<Result<Operation, Error>>;
}

@injectable()
export class OperationCoordinationService implements IOperationCoordinationService {
  async applyOperation(
    operation: Operation,
    currentState: unknown,
  ): Promise<Result<unknown, Error>> {
    return Promise.resolve(operation.applyTo(currentState));
  }

  async detectConflicts(operations: Operation[]): Promise<Result<Conflict[], Error>> {
    if (operations.length < 2) {
      return Promise.resolve(ok([]));
    }

    try {
      const conflicts: Conflict[] = [];
      const groupedOperations = this.groupOperationsByTarget(operations);

      for (const [targetPath, targetOperations] of Array.from(groupedOperations.entries())) {
        if (targetOperations.length < 2) {
          continue;
        }

        const conflictResult = await this.analyzeOperationsForConflictsUsingEntities(
          targetPath,
          targetOperations,
        );
        if (conflictResult.isOk() && conflictResult.value.length > 0) {
          conflicts.push(...conflictResult.value);
        }
      }

      return ok(conflicts);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Conflict detection failed'));
    }
  }

  orderOperations(operations: Operation[]): Result<Operation[], Error> {
    try {
      const orderedOperations = [...operations];

      orderedOperations.sort((a, b) => {
        if (a.hasCausalDependencyOn(b)) {
          return 1;
        }
        if (b.hasCausalDependencyOn(a)) {
          return -1;
        }

        return a.getTimestamp().compareTo(b.getTimestamp());
      });

      const validationResult = this.validateOperationOrdering(orderedOperations);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      return ok(orderedOperations);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Operation ordering failed'));
    }
  }

  async transformOperation(
    operation: Operation,
    againstOperations: Operation[],
  ): Promise<Result<Operation, Error>> {
    return Promise.resolve(operation.transformAgainstOperations(againstOperations));
  }

  private groupOperationsByTarget(operations: Operation[]): Map<string, Operation[]> {
    const groups = new Map<string, Operation[]>();

    for (const operation of operations) {
      const targetPath = operation.getTargetPath();
      if (!groups.has(targetPath)) {
        groups.set(targetPath, []);
      }
      groups.get(targetPath)?.push(operation);
    }

    return groups;
  }

  private async analyzeOperationsForConflictsUsingEntities(
    _targetPath: string,
    operations: Operation[],
  ): Promise<Result<Conflict[], Error>> {
    const conflicts: Conflict[] = [];

    const concurrentOperations = this.findConcurrentOperations(operations);

    for (const concurrentGroup of concurrentOperations) {
      if (concurrentGroup.length < 2) {
        continue;
      }

      const primaryOperation = concurrentGroup[0];
      if (!primaryOperation) continue;

      const conflictingOperations = concurrentGroup.slice(1);

      for (const conflictingOp of conflictingOperations) {
        const conflictResult = primaryOperation.detectConflictWith(conflictingOp);
        if (conflictResult.isErr()) {
          continue;
        }

        const conflictData = conflictResult.value;
        if (!conflictData) {
          continue;
        }

        // Create proper Conflict instance
        const conflictInstance = Conflict.create(
          conflictData.id,
          conflictData.conflictType,
          conflictData.targetPath,
          conflictData.operations,
        );

        if (conflictInstance.isOk()) {
          conflicts.push(conflictInstance.value);
        }
      }
    }

    return Promise.resolve(ok(conflicts));
  }

  private findConcurrentOperations(operations: Operation[]): Operation[][] {
    const concurrentGroups: Operation[][] = [];
    const processed = new Set<string>();

    for (const operation of operations) {
      if (processed.has(operation.getId().getValue())) {
        continue;
      }

      const concurrentGroup = [operation];
      processed.add(operation.getId().getValue());

      for (const otherOperation of operations) {
        if (
          operation.getId().equals(otherOperation.getId()) ||
          processed.has(otherOperation.getId().getValue())
        ) {
          continue;
        }

        if (operation.isConcurrentWith(otherOperation)) {
          concurrentGroup.push(otherOperation);
          processed.add(otherOperation.getId().getValue());
        }
      }

      if (concurrentGroup.length > 1) {
        concurrentGroups.push(concurrentGroup);
      }
    }

    return concurrentGroups;
  }

  private validateOperationOrdering(operations: Operation[]): Result<void, Error> {
    for (let i = 0; i < operations.length - 1; i++) {
      const current = operations[i];
      const next = operations[i + 1];

      if (current && next?.hasCausalDependencyOn(current) && current.hasCausalDependencyOn(next)) {
        return err(new Error('Circular dependency detected in operation ordering'));
      }
    }

    return ok(undefined);
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }
    return Math.abs(hash).toString(36);
  }

  canOperationsCommute(op1: Operation, op2: Operation): boolean {
    return op1.canCommuteWith(op2);
  }

  calculateOperationDependencies(operations: Operation[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const operation of operations) {
      const deps: string[] = [];

      for (const otherOperation of operations) {
        if (
          !operation.getId().equals(otherOperation.getId()) &&
          operation.hasCausalDependencyOn(otherOperation)
        ) {
          deps.push(otherOperation.getId().getValue());
        }
      }

      dependencies.set(operation.getId().getValue(), deps);
    }

    return dependencies;
  }
}
