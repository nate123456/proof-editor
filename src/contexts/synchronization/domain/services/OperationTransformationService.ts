import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { IOperation } from '../entities/shared-types';
import { OperationPayload } from '../value-objects/OperationPayload';

export type TransformationType =
  | 'OPERATIONAL_TRANSFORM'
  | 'LAST_WRITER_WINS'
  | 'POSITION_ADJUSTMENT'
  | 'CONTENT_MERGE'
  | 'STRUCTURAL_REORDER';

export type TransformationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TransformationContext {
  readonly sourceOperation: IOperation;
  readonly targetOperation: IOperation;
  readonly transformationType: TransformationType;
  readonly priority: TransformationPriority;
}

export interface IOperationTransformationService {
  executeTransformation(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error>;
  determineTransformationType(
    sourceOperation: IOperation,
    targetOperation: IOperation,
  ): TransformationType;
  calculateTransformationPriority(
    sourceOperation: IOperation,
    targetOperation: IOperation,
  ): TransformationPriority;
  transformOperationSequence(operations: IOperation[]): Result<IOperation[], Error>;
}

@injectable()
export class OperationTransformationService implements IOperationTransformationService {
  executeTransformation(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error> {
    switch (context.transformationType) {
      case 'OPERATIONAL_TRANSFORM':
        return this.performOperationalTransform(operation, context);

      case 'POSITION_ADJUSTMENT':
        return this.performPositionAdjustment(operation, context);

      case 'CONTENT_MERGE':
        return this.performContentMerge(operation, context);

      case 'STRUCTURAL_REORDER':
        return this.performStructuralReorder(operation, context);

      case 'LAST_WRITER_WINS':
        return this.performLastWriterWins(operation, context);

      default:
        return err(
          new Error(`Unknown transformation type: ${context.transformationType as string}`),
        );
    }
  }

  determineTransformationType(
    sourceOperation: IOperation,
    targetOperation: IOperation,
  ): TransformationType {
    if (
      sourceOperation.getOperationType().getValue() === 'UPDATE_TREE_POSITION' ||
      targetOperation.getOperationType().getValue() === 'UPDATE_TREE_POSITION'
    ) {
      return 'POSITION_ADJUSTMENT';
    }

    if (sourceOperation.isSemanticOperation() && targetOperation.isSemanticOperation()) {
      return 'CONTENT_MERGE';
    }

    if (sourceOperation.isStructuralOperation() && targetOperation.isStructuralOperation()) {
      return 'STRUCTURAL_REORDER';
    }

    if (this.canCommuteOperations(sourceOperation, targetOperation)) {
      return 'OPERATIONAL_TRANSFORM';
    }

    return 'LAST_WRITER_WINS';
  }

  calculateTransformationPriority(
    sourceOperation: IOperation,
    targetOperation: IOperation,
  ): TransformationPriority {
    if (sourceOperation.isSemanticOperation() || targetOperation.isSemanticOperation()) {
      return 'HIGH';
    }

    if (
      sourceOperation.getOperationType().isDeletion() ||
      targetOperation.getOperationType().isDeletion()
    ) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  transformOperationSequence(operations: IOperation[]): Result<IOperation[], Error> {
    if (operations.length <= 1) {
      return ok(operations);
    }

    try {
      const sortedOps = this.sortOperationsByDependency(operations);
      const transformedOps: IOperation[] = [];

      for (const op of sortedOps) {
        let currentOp = op;
        if (!currentOp) continue;

        // Transform against all previously processed operations
        for (const processedOp of transformedOps) {
          if (currentOp.isConcurrentWith(processedOp)) {
            const transformResult = this.transformOperationPair(currentOp, processedOp);
            if (transformResult.isErr()) {
              return err(transformResult.error);
            }
            // Get the transformed version of currentOp
            const [transformedCurrentOp] = transformResult.value;
            currentOp = transformedCurrentOp;
          }
        }

        transformedOps.push(currentOp);
      }

      return ok(transformedOps);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Sequence transformation failed'));
    }
  }

  private performOperationalTransform(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error> {
    const { targetOperation } = context;

    if (operation.hasCausalDependencyOn(targetOperation)) {
      return ok(operation);
    }

    const transformedPayloadResult = operation
      .getPayload()
      .transform(targetOperation.getPayload(), 'OPERATIONAL_TRANSFORM');
    if (transformedPayloadResult.isErr()) {
      return err(transformedPayloadResult.error);
    }

    return this.createTransformedOperation(
      operation,
      transformedPayloadResult.value,
      'Operationally transformed',
    );
  }

  private performPositionAdjustment(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error> {
    const { targetOperation } = context;

    if (operation.getOperationType().getValue() !== 'UPDATE_TREE_POSITION') {
      return ok(operation);
    }

    const sourcePayload = operation.getPayload().getData();
    const targetPayload = targetOperation.getPayload().getData();

    if (!this.isPositionPayload(sourcePayload) || !this.isPositionPayload(targetPayload)) {
      return ok(operation);
    }

    const adjustedPosition = this.calculatePositionAdjustment(
      sourcePayload as { x: number; y: number },
      targetPayload as { x: number; y: number },
    );

    const adjustedPayloadResult = OperationPayload.create(
      adjustedPosition as Record<string, unknown>,
      operation.getOperationType(),
    );
    if (adjustedPayloadResult.isErr()) {
      return err(adjustedPayloadResult.error);
    }

    return this.createTransformedOperation(
      operation,
      adjustedPayloadResult.value,
      'Position adjusted to avoid overlap',
    );
  }

  private performContentMerge(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error> {
    const { targetOperation } = context;

    if (!operation.isSemanticOperation() || !targetOperation.isSemanticOperation()) {
      return ok(operation);
    }

    const mergedContent = this.mergeSemanticContent(
      operation.getPayload().getData(),
      targetOperation.getPayload().getData(),
    );

    const mergedPayloadResult = OperationPayload.create(
      mergedContent as Record<string, unknown>,
      operation.getOperationType(),
    );
    if (mergedPayloadResult.isErr()) {
      return err(mergedPayloadResult.error);
    }

    return this.createTransformedOperation(
      operation,
      mergedPayloadResult.value,
      'Content merged from concurrent operations',
    );
  }

  private performStructuralReorder(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error> {
    const { targetOperation } = context;

    // For structural operations, maintain the operation but adjust internal references
    if (this.requiresReferenceAdjustment(operation, targetOperation)) {
      const adjustedPayload = this.adjustStructuralReferences(
        operation.getPayload().getData(),
        targetOperation,
      );

      const adjustedPayloadResult = OperationPayload.create(
        adjustedPayload as Record<string, unknown>,
        operation.getOperationType(),
      );
      if (adjustedPayloadResult.isErr()) {
        return err(adjustedPayloadResult.error);
      }

      return this.createTransformedOperation(
        operation,
        adjustedPayloadResult.value,
        'Structural references adjusted',
      );
    }

    return ok(operation);
  }

  private performLastWriterWins(
    operation: IOperation,
    context: TransformationContext,
  ): Result<IOperation, Error> {
    const { targetOperation } = context;

    if (operation.getVectorClock().happensAfter(targetOperation.getVectorClock())) {
      return ok(operation);
    } else {
      // Return a no-op version of the operation
      return this.createNoOpOperation(operation);
    }
  }

  private transformOperationPair(
    sourceOp: IOperation,
    targetOp: IOperation,
  ): Result<[IOperation, IOperation], Error> {
    if (!this.canTransformOperations(sourceOp, targetOp)) {
      return err(
        new Error('Operations cannot be transformed due to incompatible types or conflicts'),
      );
    }

    const transformationType = this.determineTransformationType(sourceOp, targetOp);
    const sourceContext: TransformationContext = {
      sourceOperation: sourceOp,
      targetOperation: targetOp,
      transformationType,
      priority: this.calculateTransformationPriority(sourceOp, targetOp),
    };

    const transformedSourceResult = this.executeTransformation(sourceOp, sourceContext);
    if (transformedSourceResult.isErr()) {
      return err(transformedSourceResult.error);
    }

    const reverseContext: TransformationContext = {
      sourceOperation: targetOp,
      targetOperation: sourceOp,
      transformationType,
      priority: this.calculateTransformationPriority(targetOp, sourceOp),
    };

    const transformedTargetResult = this.executeTransformation(targetOp, reverseContext);
    if (transformedTargetResult.isErr()) {
      return err(transformedTargetResult.error);
    }

    return ok([transformedSourceResult.value, transformedTargetResult.value]);
  }

  private canTransformOperations(sourceOp: IOperation, targetOp: IOperation): boolean {
    // Cannot transform operations that have causal dependencies
    if (sourceOp.hasCausalDependencyOn(targetOp) || targetOp.hasCausalDependencyOn(sourceOp)) {
      return false;
    }

    // Operations on different paths are incompatible for transformation
    if (sourceOp.getTargetPath() !== targetOp.getTargetPath()) {
      return false;
    }

    // Check if operation types can be transformed
    return this.areOperationTypesCompatible(
      sourceOp.getOperationType(),
      targetOp.getOperationType(),
    );
  }

  private canCommuteOperations(sourceOp: IOperation, targetOp: IOperation): boolean {
    if (sourceOp.getTargetPath() !== targetOp.getTargetPath()) {
      return true;
    }

    if (sourceOp.isStructuralOperation() && targetOp.isStructuralOperation()) {
      return sourceOp.getOperationType().canCommuteWith(targetOp.getOperationType());
    }

    return false;
  }

  private areOperationTypesCompatible(
    _sourceType: IOperation['getOperationType'],
    _targetType: IOperation['getOperationType'],
  ): boolean {
    // Most operations can be transformed, let the transformation logic handle specifics
    return true;
  }

  private sortOperationsByDependency(operations: IOperation[]): IOperation[] {
    return [...operations].sort((a, b) => {
      if (a.hasCausalDependencyOn(b)) return 1;
      if (b.hasCausalDependencyOn(a)) return -1;
      return a.getTimestamp().compareTo(b.getTimestamp());
    });
  }

  private isPositionPayload(payload: unknown): boolean {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'x' in payload &&
      'y' in payload &&
      typeof (payload as Record<string, unknown>).x === 'number' &&
      typeof (payload as Record<string, unknown>).y === 'number'
    );
  }

  private calculatePositionAdjustment(
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
  ): { x: number; y: number } {
    // Offset source position to avoid overlap
    const offset = 50; // pixels
    return {
      x: sourcePos.x + (sourcePos.x > targetPos.x ? offset : -offset),
      y: sourcePos.y + (sourcePos.y > targetPos.y ? offset : -offset),
    };
  }

  private mergeSemanticContent(sourcePayload: unknown, targetPayload: unknown): unknown {
    if (
      typeof sourcePayload === 'object' &&
      typeof targetPayload === 'object' &&
      sourcePayload !== null &&
      targetPayload !== null
    ) {
      return {
        ...(sourcePayload as Record<string, unknown>),
        ...(targetPayload as Record<string, unknown>),
        mergedAt: new Date().toISOString(),
        mergeType: 'AUTOMATIC_CONTENT_MERGE',
      };
    }

    return sourcePayload;
  }

  private requiresReferenceAdjustment(operation: IOperation, otherOperation: IOperation): boolean {
    return (
      otherOperation.getOperationType().isCreation() &&
      operation.getTargetPath().includes(otherOperation.getTargetPath())
    );
  }

  private adjustStructuralReferences(payload: unknown, referencingOperation: IOperation): unknown {
    // Simple reference adjustment - in a real implementation, this would be more sophisticated
    if (typeof payload === 'object' && payload !== null) {
      return {
        ...(payload as Record<string, unknown>),
        adjustedFor: referencingOperation.getId(),
        adjustedAt: new Date().toISOString(),
      };
    }

    return payload;
  }

  private createTransformedOperation(
    originalOperation: IOperation,
    _newPayload: OperationPayload,
    _transformationNote: string,
  ): Result<IOperation, Error> {
    // This is a simplified version - in practice, this would need to create a new Operation
    // For now, we'll return the original operation as we can't create new Operation instances
    // without access to the Operation constructor
    return ok(originalOperation);
  }

  private createNoOpOperation(operation: IOperation): Result<IOperation, Error> {
    // This is a simplified version - in practice, this would need to create a no-op Operation
    // For now, we'll return the original operation
    return ok(operation);
  }
}
