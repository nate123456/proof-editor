import { err, ok, type Result } from 'neverthrow';

import type { ConflictResolutionStrategy } from '../entities/Conflict';
import { type Conflict } from '../entities/Conflict';
import { type Operation } from '../entities/Operation';
import { ConflictType } from '../value-objects/ConflictType';
import type { OperationPayload, OperationPayloadData } from '../value-objects/OperationPayload';
import { OperationType } from '../value-objects/OperationType';

export interface IConflictResolutionService {
  resolveConflictAutomatically(conflict: Conflict): Promise<Result<unknown, Error>>;
  resolveConflictWithUserInput(
    conflict: Conflict,
    userChoice: ConflictResolutionStrategy,
    userInput?: unknown
  ): Promise<Result<unknown, Error>>;
  canResolveAutomatically(conflict: Conflict): boolean;
  getRecommendedResolution(conflict: Conflict): ConflictResolutionStrategy;
}

export class ConflictResolutionService implements IConflictResolutionService {
  async resolveConflictAutomatically(conflict: Conflict): Promise<Result<unknown, Error>> {
    if (!this.canResolveAutomatically(conflict)) {
      return err(new Error('Conflict requires manual resolution'));
    }

    const strategy = this.getRecommendedResolution(conflict);

    switch (strategy) {
      case 'MERGE_OPERATIONS':
        return this.mergeOperations(conflict.getConflictingOperations());

      case 'LAST_WRITER_WINS':
        return this.applyLastWriterWins(conflict.getConflictingOperations());

      case 'FIRST_WRITER_WINS':
        return this.applyFirstWriterWins(conflict.getConflictingOperations());

      default:
        return err(new Error(`Unsupported automatic resolution strategy: ${strategy}`));
    }
  }

  async resolveConflictWithUserInput(
    conflict: Conflict,
    userChoice: ConflictResolutionStrategy,
    userInput?: unknown
  ): Promise<Result<unknown, Error>> {
    switch (userChoice) {
      case 'USER_DECISION_REQUIRED':
        if (userInput === undefined) {
          return err(new Error('User input required for manual resolution'));
        }
        return this.applyUserDecision(conflict, userInput);

      case 'MERGE_OPERATIONS':
        return this.mergeOperations(conflict.getConflictingOperations());

      case 'LAST_WRITER_WINS':
        return this.applyLastWriterWins(conflict.getConflictingOperations());

      case 'FIRST_WRITER_WINS':
        return this.applyFirstWriterWins(conflict.getConflictingOperations());

      default:
        return err(new Error(`Unsupported resolution strategy: ${userChoice}`));
    }
  }

  canResolveAutomatically(conflict: Conflict): boolean {
    return (
      conflict.canBeAutomaticallyResolved() &&
      conflict.getConflictType().canBeAutomaticallyResolved()
    );
  }

  getRecommendedResolution(conflict: Conflict): ConflictResolutionStrategy {
    const conflictType = conflict.getConflictType();
    const operations = conflict.getConflictingOperations();

    if (conflictType.isSemantic()) {
      return 'USER_DECISION_REQUIRED';
    }

    if (conflictType.isStructural()) {
      if (this.canMergeStructuralOperations(operations)) {
        return 'MERGE_OPERATIONS';
      }
      return 'LAST_WRITER_WINS';
    }

    return 'LAST_WRITER_WINS';
  }

  private canMergeStructuralOperations(operations: readonly Operation[]): boolean {
    return (
      operations.every(op => op.isStructuralOperation()) &&
      operations.every(op => {
        const firstOp = operations[0];
        return firstOp && op.getOperationType().canCommuteWith(firstOp.getOperationType());
      })
    );
  }

  private async mergeOperations(operations: readonly Operation[]): Promise<Result<unknown, Error>> {
    if (operations.length < 2) {
      return err(new Error('Cannot merge less than 2 operations'));
    }

    try {
      const sortedOperations = this.sortOperationsByTimestamp(operations);
      const firstOp = sortedOperations[0];
      if (!firstOp) {
        return err(new Error('No operations to apply'));
      }
      let currentResult: OperationPayloadData = firstOp.getPayload().getData();

      for (let i = 1; i < sortedOperations.length; i++) {
        const currentOp = sortedOperations[i];
        const previousOp = sortedOperations[i - 1];
        if (!currentOp || !previousOp) {
          return err(new Error('Invalid operation sequence'));
        }
        const transformResult = currentOp.transformWith(previousOp);

        if (transformResult.isErr()) {
          return err(transformResult.error);
        }

        currentResult = this.combinePayloads(
          currentResult,
          transformResult.value.getPayload().getData()
        );
      }

      return ok(currentResult);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Unknown merge error'));
    }
  }

  private async applyLastWriterWins(
    operations: readonly Operation[]
  ): Promise<Result<unknown, Error>> {
    if (operations.length === 0) {
      return err(new Error('No operations to resolve'));
    }

    const latestOperation = operations.reduce((latest, current) => {
      return current.getVectorClock().happensAfter(latest.getVectorClock()) ? current : latest;
    });

    return ok(latestOperation.getPayload().getData());
  }

  private async applyFirstWriterWins(
    operations: readonly Operation[]
  ): Promise<Result<unknown, Error>> {
    if (operations.length === 0) {
      return err(new Error('No operations to resolve'));
    }

    const earliestOperation = operations.reduce((earliest, current) => {
      return current.getVectorClock().happensBefore(earliest.getVectorClock()) ? current : earliest;
    });

    return ok(earliestOperation.getPayload().getData());
  }

  private async applyUserDecision(
    conflict: Conflict,
    userInput: unknown
  ): Promise<Result<unknown, Error>> {
    if (!this.isValidUserInput(userInput)) {
      return err(new Error('Invalid user input for conflict resolution'));
    }

    return ok(userInput);
  }

  private sortOperationsByTimestamp(operations: readonly Operation[]): Operation[] {
    return Array.from(operations).sort((a, b) => {
      const aTimestamp = a.getTimestamp();
      const bTimestamp = b.getTimestamp();
      return aTimestamp.compareTo(bTimestamp);
    });
  }

  private combinePayloads(
    payload1: OperationPayloadData,
    payload2: OperationPayloadData
  ): OperationPayloadData {
    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      return { ...(payload1 as Record<string, unknown>), ...(payload2 as Record<string, unknown>) };
    }

    return payload2;
  }

  private isValidUserInput(input: unknown): boolean {
    return input !== null && input !== undefined;
  }

  generateResolutionPreview(conflict: Conflict, strategy: ConflictResolutionStrategy): string {
    const operations = conflict.getConflictingOperations();

    switch (strategy) {
      case 'MERGE_OPERATIONS':
        return `Merge ${operations.length} operations using operational transformation`;

      case 'LAST_WRITER_WINS':
        const latest = operations.reduce((latest, current) =>
          current.getVectorClock().happensAfter(latest.getVectorClock()) ? current : latest
        );
        return `Keep changes from ${latest.getDeviceId().getShortId()}`;

      case 'FIRST_WRITER_WINS':
        const earliest = operations.reduce((earliest, current) =>
          current.getVectorClock().happensBefore(earliest.getVectorClock()) ? current : earliest
        );
        return `Keep changes from ${earliest.getDeviceId().getShortId()}`;

      case 'USER_DECISION_REQUIRED':
        return 'Manual resolution required - user must choose how to resolve';

      default:
        return 'Unknown resolution strategy';
    }
  }

  estimateResolutionComplexity(conflict: Conflict): 'LOW' | 'MEDIUM' | 'HIGH' {
    const operationCount = conflict.getConflictingOperations().length;
    const conflictType = conflict.getConflictType();

    if (conflictType.isSemantic()) {
      return 'HIGH';
    }

    if (operationCount > 5) {
      return 'HIGH';
    }

    if (operationCount > 2 || conflictType.getResolutionComplexity() === 'COMPLEX') {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
