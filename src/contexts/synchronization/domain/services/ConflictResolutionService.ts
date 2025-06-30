import type { Result } from '../../../../domain/shared/result';
import { ConflictEntity, ConflictResolutionStrategy } from '../entities/ConflictEntity';
import { OperationEntity } from '../entities/OperationEntity';
import { ConflictType } from '../value-objects/ConflictType';
import { OperationType } from '../value-objects/OperationType';

export interface IConflictResolutionService {
  resolveConflictAutomatically(conflict: ConflictEntity): Promise<Result<unknown, Error>>;
  resolveConflictWithUserInput(conflict: ConflictEntity, userChoice: ConflictResolutionStrategy, userInput?: unknown): Promise<Result<unknown, Error>>;
  canResolveAutomatically(conflict: ConflictEntity): boolean;
  getRecommendedResolution(conflict: ConflictEntity): ConflictResolutionStrategy;
}

export class ConflictResolutionService implements IConflictResolutionService {
  async resolveConflictAutomatically(conflict: ConflictEntity): Promise<Result<unknown, Error>> {
    if (!this.canResolveAutomatically(conflict)) {
      return { success: false, error: new Error('Conflict requires manual resolution') };
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
        return { success: false, error: new Error(`Unsupported automatic resolution strategy: ${strategy}`) };
    }
  }

  async resolveConflictWithUserInput(
    conflict: ConflictEntity, 
    userChoice: ConflictResolutionStrategy, 
    userInput?: unknown
  ): Promise<Result<unknown, Error>> {
    switch (userChoice) {
      case 'USER_DECISION_REQUIRED':
        if (userInput === undefined) {
          return { success: false, error: new Error('User input required for manual resolution') };
        }
        return this.applyUserDecision(conflict, userInput);
      
      case 'MERGE_OPERATIONS':
        return this.mergeOperations(conflict.getConflictingOperations());
      
      case 'LAST_WRITER_WINS':
        return this.applyLastWriterWins(conflict.getConflictingOperations());
      
      case 'FIRST_WRITER_WINS':
        return this.applyFirstWriterWins(conflict.getConflictingOperations());
      
      default:
        return { success: false, error: new Error(`Unsupported resolution strategy: ${userChoice}`) };
    }
  }

  canResolveAutomatically(conflict: ConflictEntity): boolean {
    return conflict.canBeAutomaticallyResolved() && 
           conflict.getConflictType().canBeAutomaticallyResolved();
  }

  getRecommendedResolution(conflict: ConflictEntity): ConflictResolutionStrategy {
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

  private canMergeStructuralOperations(operations: ReadonlyArray<OperationEntity>): boolean {
    return operations.every(op => op.isStructuralOperation()) &&
           operations.every(op => op.getOperationType().canCommuteWith(operations[0].getOperationType()));
  }

  private async mergeOperations(operations: ReadonlyArray<OperationEntity>): Promise<Result<unknown, Error>> {
    if (operations.length < 2) {
      return { success: false, error: new Error('Cannot merge less than 2 operations') };
    }

    try {
      const sortedOperations = this.sortOperationsByTimestamp(operations);
      let currentResult = sortedOperations[0].getPayload();

      for (let i = 1; i < sortedOperations.length; i++) {
        const transformResult = sortedOperations[i].transformWith(sortedOperations[i - 1]);
        
        if (!transformResult.success) {
          return { success: false, error: transformResult.error };
        }

        currentResult = this.combinePayloads(currentResult, transformResult.data.getPayload().getData());
      }

      return { success: true, data: currentResult };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error('Unknown merge error') };
    }
  }

  private async applyLastWriterWins(operations: ReadonlyArray<OperationEntity>): Promise<Result<unknown, Error>> {
    if (operations.length === 0) {
      return { success: false, error: new Error('No operations to resolve') };
    }

    const latestOperation = operations.reduce((latest, current) => {
      return current.getVectorClock().happensAfter(latest.getVectorClock()) ? current : latest;
    });

    return { success: true, data: latestOperation.getPayload().getData() };
  }

  private async applyFirstWriterWins(operations: ReadonlyArray<OperationEntity>): Promise<Result<unknown, Error>> {
    if (operations.length === 0) {
      return { success: false, error: new Error('No operations to resolve') };
    }

    const earliestOperation = operations.reduce((earliest, current) => {
      return current.getVectorClock().happensBefore(earliest.getVectorClock()) ? current : earliest;
    });

    return { success: true, data: earliestOperation.getPayload().getData() };
  }

  private async applyUserDecision(conflict: ConflictEntity, userInput: unknown): Promise<Result<unknown, Error>> {
    if (!this.isValidUserInput(userInput)) {
      return { success: false, error: new Error('Invalid user input for conflict resolution') };
    }

    return { success: true, data: userInput };
  }

  private sortOperationsByTimestamp(operations: ReadonlyArray<OperationEntity>): OperationEntity[] {
    return Array.from(operations).sort((a, b) => {
      const aTimestamp = a.getTimestamp();
      const bTimestamp = b.getTimestamp();
      return aTimestamp.compareTo(bTimestamp);
    });
  }

  private combinePayloads(payload1: unknown, payload2: unknown): unknown {
    if (typeof payload1 === 'object' && typeof payload2 === 'object' && 
        payload1 !== null && payload2 !== null) {
      return { ...payload1 as Record<string, unknown>, ...payload2 as Record<string, unknown> };
    }

    return payload2;
  }

  private isValidUserInput(input: unknown): boolean {
    return input !== null && input !== undefined;
  }

  generateResolutionPreview(conflict: ConflictEntity, strategy: ConflictResolutionStrategy): string {
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

  estimateResolutionComplexity(conflict: ConflictEntity): 'LOW' | 'MEDIUM' | 'HIGH' {
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