import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { Conflict, ConflictResolutionStrategy } from '../entities/Conflict';
import { Operation } from '../entities/Operation';
import type { IOperation } from '../entities/shared-types';
import type { OperationPayloadData } from '../value-objects/OperationPayload';

export interface IConflictResolutionService {
  resolveConflictAutomatically(conflict: Conflict): Promise<Result<unknown, Error>>;
  resolveConflictWithUserInput(
    conflict: Conflict,
    userChoice: ConflictResolutionStrategy,
    userInput?: unknown,
  ): Promise<Result<unknown, Error>>;
  canResolveAutomatically(conflict: Conflict): boolean;
  getRecommendedResolution(conflict: Conflict): ConflictResolutionStrategy;
}

@injectable()
export class ConflictResolutionService implements IConflictResolutionService {
  async resolveConflictAutomatically(conflict: Conflict): Promise<Result<unknown, Error>> {
    // Check if conflict has enough operations
    if (conflict.getConflictingOperations().length < 2) {
      return err(new Error('Cannot resolve conflict with less than 2 operations'));
    }

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

      case 'USER_DECISION_REQUIRED':
        return err(new Error('Conflict requires manual resolution'));

      default: {
        const never: never = strategy;
        return err(new Error(`Unsupported automatic resolution strategy: ${String(never)}`));
      }
    }
  }

  async resolveConflictWithUserInput(
    conflict: Conflict,
    userChoice: ConflictResolutionStrategy,
    userInput?: unknown,
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

      default: {
        const never: never = userChoice;
        return err(new Error(`Unsupported resolution strategy: ${String(never)}`));
      }
    }
  }

  canResolveAutomatically(conflict: Conflict): boolean {
    return conflict.canBeAutomaticallyResolved();
  }

  getRecommendedResolution(conflict: Conflict): ConflictResolutionStrategy {
    const automaticOptions = conflict.getAutomaticResolutionOptions();

    if (automaticOptions.length > 0 && automaticOptions[0]) {
      // Return the first automatic option as the recommendation
      return automaticOptions[0].strategy;
    }

    // If no automatic options, recommend user decision
    return 'USER_DECISION_REQUIRED';
  }

  private async mergeOperations(
    operations: readonly IOperation[],
  ): Promise<Result<unknown, Error>> {
    if (operations.length < 2) {
      return Promise.resolve(err(new Error('Cannot merge less than 2 operations')));
    }

    try {
      const sortedOperations = this.sortOperationsByTimestamp(operations);
      const firstOp = sortedOperations[0];
      if (!firstOp) {
        return Promise.resolve(err(new Error('No operations to apply')));
      }
      let currentResult: OperationPayloadData = firstOp.getPayload().getData();

      for (let i = 1; i < sortedOperations.length; i++) {
        const currentOp = sortedOperations[i];
        const previousOp = sortedOperations[i - 1];
        if (!currentOp || !previousOp) {
          return Promise.resolve(err(new Error('Invalid operation sequence')));
        }

        // Check if both operations are Operation instances for transformation
        if (currentOp instanceof Operation && previousOp instanceof Operation) {
          const transformResult = currentOp.transformWith(previousOp);
          if (transformResult.isErr()) {
            // If transformation fails, fall back to combining payloads directly
            currentResult = this.combinePayloads(currentResult, currentOp.getPayload().getData());
          } else {
            const [transformedOp] = transformResult.value;
            currentResult = this.combinePayloads(
              currentResult,
              transformedOp.getPayload().getData(),
            );
          }
        } else {
          // If not Operation instances, just combine payloads
          currentResult = this.combinePayloads(currentResult, currentOp.getPayload().getData());
        }
      }

      return Promise.resolve(ok(currentResult));
    } catch (error) {
      return Promise.resolve(
        err(error instanceof Error ? error : new Error('Unknown merge error')),
      );
    }
  }

  private async applyLastWriterWins(
    operations: readonly IOperation[],
  ): Promise<Result<unknown, Error>> {
    if (operations.length === 0) {
      return Promise.resolve(err(new Error('No operations to resolve')));
    }

    const latestOperation = operations.reduce((latest, current) => {
      return current.getVectorClock().happensAfter(latest.getVectorClock()) ? current : latest;
    });

    return Promise.resolve(ok(latestOperation.getPayload().getData()));
  }

  private async applyFirstWriterWins(
    operations: readonly IOperation[],
  ): Promise<Result<unknown, Error>> {
    if (operations.length === 0) {
      return Promise.resolve(err(new Error('No operations to resolve')));
    }

    const earliestOperation = operations.reduce((earliest, current) => {
      return current.getVectorClock().happensBefore(earliest.getVectorClock()) ? current : earliest;
    });

    return Promise.resolve(ok(earliestOperation.getPayload().getData()));
  }

  private async applyUserDecision(
    _conflict: Conflict,
    userInput: unknown,
  ): Promise<Result<unknown, Error>> {
    if (!this.isValidUserInput(userInput)) {
      return Promise.resolve(err(new Error('Invalid user input for conflict resolution')));
    }

    return Promise.resolve(ok(userInput));
  }

  private sortOperationsByTimestamp(operations: readonly IOperation[]): IOperation[] {
    return Array.from(operations).sort((a, b) => {
      const aTimestamp = a.getTimestamp();
      const bTimestamp = b.getTimestamp();
      return aTimestamp.compareTo(bTimestamp);
    });
  }

  private combinePayloads(
    payload1: OperationPayloadData,
    payload2: OperationPayloadData,
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

      case 'LAST_WRITER_WINS': {
        if (operations.length === 0) {
          return 'No operations to resolve';
        }
        const firstOp = operations[0];
        if (!firstOp) {
          return 'No operations to resolve';
        }
        const latest = operations
          .slice(1)
          .reduce(
            (latest, current) =>
              current.getVectorClock().happensAfter(latest.getVectorClock()) ? current : latest,
            firstOp,
          );
        return `Keep changes from ${latest.getDeviceId().getShortId()}`;
      }

      case 'FIRST_WRITER_WINS': {
        if (operations.length === 0) {
          return 'No operations to resolve';
        }
        const firstOp = operations[0];
        if (!firstOp) {
          return 'No operations to resolve';
        }
        const earliest = operations
          .slice(1)
          .reduce(
            (earliest, current) =>
              current.getVectorClock().happensBefore(earliest.getVectorClock())
                ? current
                : earliest,
            firstOp,
          );
        return `Keep changes from ${earliest.getDeviceId().getShortId()}`;
      }

      case 'USER_DECISION_REQUIRED':
        return 'Manual resolution required - user must choose how to resolve';

      default:
        return 'Unknown resolution strategy';
    }
  }

  estimateResolutionComplexity(conflict: Conflict): 'LOW' | 'MEDIUM' | 'HIGH' {
    const operationCount = conflict.getConflictingOperations().length;
    const conflictType = conflict.getConflictType();

    // Primary factor: operation count
    if (operationCount > 5) {
      return 'HIGH';
    }

    if (operationCount >= 3) {
      // For 3-5 operations, generally MEDIUM unless special cases
      if (conflictType.getValue() === 'SEMANTIC_CONFLICT') {
        return 'HIGH'; // Semantic conflicts are more complex even with moderate operation count
      }
      return 'MEDIUM';
    }

    // For 1-2 operations, generally LOW unless semantic
    if (conflictType.getValue() === 'SEMANTIC_CONFLICT') {
      return 'HIGH'; // Semantic conflicts are always high complexity
    }

    return 'LOW';
  }
}
