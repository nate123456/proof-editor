import type { Result } from '../../../../domain/shared/result';
import { ConflictEntity } from '../entities/ConflictEntity';
import { OperationEntity } from '../entities/OperationEntity';
import { VectorClockEntity } from '../entities/VectorClockEntity';
import { ConflictType } from '../value-objects/ConflictType';
import { DeviceId } from '../value-objects/DeviceId';
import { OperationType } from '../value-objects/OperationType';

export interface IOperationCoordinationService {
  applyOperation(operation: OperationEntity, currentState: unknown): Promise<Result<unknown, Error>>;
  detectConflicts(operations: OperationEntity[]): Promise<Result<ConflictEntity[], Error>>;
  orderOperations(operations: OperationEntity[]): Result<OperationEntity[], Error>;
  transformOperation(operation: OperationEntity, againstOperations: OperationEntity[]): Promise<Result<OperationEntity, Error>>;
}

export class OperationCoordinationService implements IOperationCoordinationService {
  async applyOperation(operation: OperationEntity, currentState: unknown): Promise<Result<unknown, Error>> {
    return operation.applyTo(currentState);
  }

  async detectConflicts(operations: OperationEntity[]): Promise<Result<ConflictEntity[], Error>> {
    if (operations.length < 2) {
      return { success: true, data: [] };
    }

    try {
      const conflicts: ConflictEntity[] = [];
      const groupedOperations = this.groupOperationsByTarget(operations);

      for (const [targetPath, targetOperations] of groupedOperations) {
        if (targetOperations.length < 2) {
          continue;
        }

        const conflictResult = await this.analyzeOperationsForConflictsUsingEntities(targetPath, targetOperations);
        if (conflictResult.success && conflictResult.data.length > 0) {
          conflicts.push(...conflictResult.data);
        }
      }

      return { success: true, data: conflicts };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Conflict detection failed') 
      };
    }
  }

  orderOperations(operations: OperationEntity[]): Result<OperationEntity[], Error> {
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
      if (!validationResult.success) {
        return validationResult;
      }

      return { success: true, data: orderedOperations };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Operation ordering failed') 
      };
    }
  }

  async transformOperation(
    operation: OperationEntity, 
    againstOperations: OperationEntity[]
  ): Promise<Result<OperationEntity, Error>> {
    return operation.transformAgainstOperations(againstOperations);
  }



  private groupOperationsByTarget(operations: OperationEntity[]): Map<string, OperationEntity[]> {
    const groups = new Map<string, OperationEntity[]>();

    for (const operation of operations) {
      const targetPath = operation.getTargetPath();
      if (!groups.has(targetPath)) {
        groups.set(targetPath, []);
      }
      groups.get(targetPath)!.push(operation);
    }

    return groups;
  }

  private async analyzeOperationsForConflictsUsingEntities(
    targetPath: string, 
    operations: OperationEntity[]
  ): Promise<Result<ConflictEntity[], Error>> {
    const conflicts: ConflictEntity[] = [];
    
    const concurrentOperations = this.findConcurrentOperations(operations);
    
    for (const concurrentGroup of concurrentOperations) {
      if (concurrentGroup.length < 2) {
        continue;
      }

      const primaryOperation = concurrentGroup[0];
      const conflictingOperations = concurrentGroup.slice(1);
      
      for (const conflictingOp of conflictingOperations) {
        const conflictTypeResult = primaryOperation.detectConflictWith(conflictingOp);
        if (!conflictTypeResult.success) {
          continue;
        }
        
        const conflictType = conflictTypeResult.data;
        if (!conflictType) {
          continue;
        }

        const conflictId = this.generateConflictId(targetPath, [primaryOperation, conflictingOp]);
        const conflictResult = ConflictEntity.create(
          conflictId,
          conflictType,
          targetPath,
          [primaryOperation, conflictingOp]
        );

        if (conflictResult.success) {
          conflicts.push(conflictResult.data);
        }
      }
    }

    return { success: true, data: conflicts };
  }

  private findConcurrentOperations(operations: OperationEntity[]): OperationEntity[][] {
    const concurrentGroups: OperationEntity[][] = [];
    const processed = new Set<string>();

    for (const operation of operations) {
      if (processed.has(operation.getId().getValue())) {
        continue;
      }

      const concurrentGroup = [operation];
      processed.add(operation.getId().getValue());

      for (const otherOperation of operations) {
        if (operation.getId().equals(otherOperation.getId()) || processed.has(otherOperation.getId().getValue())) {
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


  private generateConflictId(targetPath: string, operations: OperationEntity[]): string {
    const operationIds = operations.map(op => op.getId()).sort().join('-');
    const pathHash = this.simpleHash(targetPath);
    return `conflict-${pathHash}-${this.simpleHash(operationIds)}`;
  }

  private validateOperationOrdering(operations: OperationEntity[]): Result<void, Error> {
    for (let i = 0; i < operations.length - 1; i++) {
      const current = operations[i];
      const next = operations[i + 1];

      if (next.hasCausalDependencyOn(current) && current.hasCausalDependencyOn(next)) {
        return { success: false, error: new Error('Circular dependency detected in operation ordering') };
      }
    }

    return { success: true, data: undefined };
  }


  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  canOperationsCommute(op1: OperationEntity, op2: OperationEntity): boolean {
    return op1.canCommutewWith(op2);
  }

  calculateOperationDependencies(operations: OperationEntity[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const operation of operations) {
      const deps: string[] = [];
      
      for (const otherOperation of operations) {
        if (!operation.getId().equals(otherOperation.getId()) && 
            operation.hasCausalDependencyOn(otherOperation)) {
          deps.push(otherOperation.getId().getValue());
        }
      }

      dependencies.set(operation.getId().getValue(), deps);
    }

    return dependencies;
  }
}