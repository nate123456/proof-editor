import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { IOperation } from '../entities/shared-types';
import { ConflictType } from '../value-objects/ConflictType';

export interface ConflictInfo {
  id: string;
  conflictType: ConflictType;
  targetPath: string;
  operations: [IOperation, IOperation];
}

export interface IConflictDetectionService {
  detectConflictBetween(
    operation1: IOperation,
    operation2: IOperation,
  ): Result<ConflictInfo | null, Error>;
  detectConflictsInSequence(operations: IOperation[]): Result<ConflictInfo[], Error>;
  findConcurrentGroups(operations: IOperation[]): IOperation[][];
  canOperationsConflict(operation1: IOperation, operation2: IOperation): boolean;
  determineConflictType(operation1: IOperation, operation2: IOperation): ConflictType;
}

@injectable()
export class ConflictDetectionService implements IConflictDetectionService {
  detectConflictBetween(
    operation1: IOperation,
    operation2: IOperation,
  ): Result<ConflictInfo | null, Error> {
    if (operation1.getTargetPath() !== operation2.getTargetPath()) {
      return ok(null);
    }

    if (!operation1.isConcurrentWith(operation2)) {
      return ok(null);
    }

    try {
      const conflictType = this.determineConflictType(operation1, operation2);
      const conflictId = `conflict-${operation1.getId().getValue()}-${operation2.getId().getValue()}`;

      return ok({
        id: conflictId,
        conflictType,
        targetPath: operation1.getTargetPath(),
        operations: [operation1, operation2],
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to detect conflict'));
    }
  }

  detectConflictsInSequence(operations: IOperation[]): Result<ConflictInfo[], Error> {
    const conflicts: ConflictInfo[] = [];

    try {
      for (let i = 0; i < operations.length; i++) {
        for (let j = i + 1; j < operations.length; j++) {
          const op1 = operations[i];
          const op2 = operations[j];

          if (!op1 || !op2) continue;

          const conflictResult = this.detectConflictBetween(op1, op2);
          if (conflictResult.isErr()) {
            return err(conflictResult.error);
          }

          if (conflictResult.value) {
            conflicts.push(conflictResult.value);
          }
        }
      }

      return ok(conflicts);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Failed to detect conflicts in sequence'),
      );
    }
  }

  findConcurrentGroups(operations: IOperation[]): IOperation[][] {
    const groups: IOperation[][] = [];
    const processed = new Set<string>();

    for (const op of operations) {
      if (processed.has(op.getId().toString())) continue;

      const group = [op];
      processed.add(op.getId().toString());

      for (const otherOp of operations) {
        if (
          !op.getId().equals(otherOp.getId()) &&
          !processed.has(otherOp.getId().toString()) &&
          op.isConcurrentWith(otherOp)
        ) {
          group.push(otherOp);
          processed.add(otherOp.getId().toString());
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  canOperationsConflict(operation1: IOperation, operation2: IOperation): boolean {
    // Operations must target the same path to conflict
    if (operation1.getTargetPath() !== operation2.getTargetPath()) {
      return false;
    }

    // Operations must be concurrent to conflict
    if (!operation1.isConcurrentWith(operation2)) {
      return false;
    }

    // Check if operation types can lead to conflicts
    return this.areOperationTypesConflicting(operation1, operation2);
  }

  determineConflictType(operation1: IOperation, operation2: IOperation): ConflictType {
    const hasDeletions =
      operation1.getOperationType().isDeletion() || operation2.getOperationType().isDeletion();
    const hasUpdates =
      operation1.getOperationType().isUpdate() || operation2.getOperationType().isUpdate();
    const bothAreUpdates =
      operation1.getOperationType().isUpdate() && operation2.getOperationType().isUpdate();

    // DELETE vs UPDATE = DELETION conflict (treating as deletion type)
    if (hasDeletions && hasUpdates && !bothAreUpdates) {
      const result = ConflictType.deletion();
      if (result.isErr()) {
        throw new Error('Failed to create deletion conflict type');
      }
      return result.value;
    }

    // DELETE vs anything else = DELETION conflict
    if (hasDeletions) {
      const result = ConflictType.deletion();
      if (result.isErr()) {
        throw new Error('Failed to create deletion conflict type');
      }
      return result.value;
    }

    // Both UPDATE operations = CONCURRENT_MODIFICATION conflict
    if (bothAreUpdates) {
      const result = ConflictType.concurrentModification();
      if (result.isErr()) {
        throw new Error('Failed to create concurrent modification conflict type');
      }
      return result.value;
    }

    // Structural operations
    if (operation1.isStructuralOperation() || operation2.isStructuralOperation()) {
      const result = ConflictType.structural();
      if (result.isErr()) {
        throw new Error('Failed to create structural conflict type');
      }
      return result.value;
    }

    // Check for semantic conflicts
    if (operation1.isSemanticOperation() && operation2.isSemanticOperation()) {
      const result = this.detectSemanticConflict(operation1, operation2);
      if (result.isErr()) {
        throw new Error('Failed to detect semantic conflict');
      }
      if (result.value) {
        return result.value;
      }
    }

    // Default to concurrent modification
    const result = ConflictType.concurrentModification();
    if (result.isErr()) {
      throw new Error('Failed to create concurrent modification conflict type');
    }
    return result.value;
  }

  private areOperationTypesConflicting(operation1: IOperation, operation2: IOperation): boolean {
    const type1 = operation1.getOperationType();
    const type2 = operation2.getOperationType();

    // Deletion operations always conflict with other operations on the same target
    if (type1.isDeletion() || type2.isDeletion()) {
      return true;
    }

    // Two update operations on the same target conflict
    if (type1.isUpdate() && type2.isUpdate()) {
      return true;
    }

    // Creation operations conflict if they create the same target
    if (type1.isCreation() && type2.isCreation()) {
      return true;
    }

    // Update and creation operations can conflict if they target the same path
    if ((type1.isUpdate() && type2.isCreation()) || (type1.isCreation() && type2.isUpdate())) {
      return true;
    }

    return false;
  }

  private detectSemanticConflict(
    operation1: IOperation,
    operation2: IOperation,
  ): Result<ConflictType | null, Error> {
    try {
      // Check if both operations modify semantic content
      const payload1 = operation1.getPayload().getData();
      const payload2 = operation2.getPayload().getData();

      if (this.hasSemanticContentModification(payload1, payload2)) {
        const result = ConflictType.semanticConflict();
        if (result.isErr()) {
          return err(result.error);
        }
        return ok(result.value);
      }

      return ok(null);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to detect semantic conflict'));
    }
  }

  private hasSemanticContentModification(payload1: unknown, payload2: unknown): boolean {
    // Simple heuristic: if both payloads modify 'content' or 'text' fields
    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      const obj1 = payload1 as Record<string, unknown>;
      const obj2 = payload2 as Record<string, unknown>;

      const hasContentField1 = 'content' in obj1 || 'text' in obj1;
      const hasContentField2 = 'content' in obj2 || 'text' in obj2;

      return hasContentField1 && hasContentField2;
    }

    return false;
  }

  /**
   * Analyzes conflict severity for prioritization
   */
  analyzeConflictSeverity(conflict: ConflictInfo): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const conflictType = conflict.conflictType.getValue();
    const operationCount = conflict.operations.length;

    // Deletion conflicts are always high severity
    if (conflictType === 'DELETION') {
      return 'HIGH';
    }

    // Semantic conflicts are critical
    if (conflictType === 'SEMANTIC_CONFLICT') {
      return 'CRITICAL';
    }

    // Structural conflicts depend on operation count
    if (conflictType === 'STRUCTURAL') {
      return operationCount > 2 ? 'HIGH' : 'MEDIUM';
    }

    // Concurrent modifications are generally medium
    if (conflictType === 'CONCURRENT_MODIFICATION') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Estimates the complexity of resolving a conflict
   */
  estimateResolutionComplexity(conflict: ConflictInfo): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
    const severity = this.analyzeConflictSeverity(conflict);
    const conflictType = conflict.conflictType.getValue();

    // Critical or high severity conflicts are complex
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return 'COMPLEX';
    }

    // Semantic conflicts are always complex regardless of severity
    if (conflictType === 'SEMANTIC_CONFLICT') {
      return 'COMPLEX';
    }

    // Structural conflicts are moderate
    if (conflictType === 'STRUCTURAL') {
      return 'MODERATE';
    }

    return 'SIMPLE';
  }

  /**
   * Determines if a conflict can be automatically resolved
   */
  canAutoResolve(conflict: ConflictInfo): boolean {
    const complexity = this.estimateResolutionComplexity(conflict);
    const conflictType = conflict.conflictType.getValue();

    // Never auto-resolve semantic conflicts
    if (conflictType === 'SEMANTIC_CONFLICT') {
      return false;
    }

    // Only auto-resolve simple conflicts
    if (complexity === 'SIMPLE') {
      return true;
    }

    // Some moderate conflicts can be auto-resolved
    if (complexity === 'MODERATE' && conflictType === 'CONCURRENT_MODIFICATION') {
      return true;
    }

    return false;
  }
}
