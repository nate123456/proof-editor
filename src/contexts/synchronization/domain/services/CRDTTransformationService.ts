import type { Result } from '../../../../domain/shared/result';
import { OperationEntity } from '../entities/OperationEntity';
import { VectorClockEntity } from '../entities/VectorClockEntity';
import { ConflictResolution } from '../value-objects/ConflictResolution';
import { DeviceId } from '../value-objects/DeviceId';
import { OperationId } from '../value-objects/OperationId';
import { OperationPayload } from '../value-objects/OperationPayload';
import { OperationType } from '../value-objects/OperationType';

export interface TransformationContext {
  readonly sourceOperation: OperationEntity;
  readonly targetOperation: OperationEntity;
  readonly transformationType: TransformationType;
  readonly priority: TransformationPriority;
}

export type TransformationType = 
  | 'OPERATIONAL_TRANSFORM'
  | 'LAST_WRITER_WINS'
  | 'POSITION_ADJUSTMENT'
  | 'CONTENT_MERGE'
  | 'STRUCTURAL_REORDER';

export type TransformationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ICRDTTransformationService {
  transformOperation(
    operation: OperationEntity, 
    againstOperation: OperationEntity
  ): Promise<Result<OperationEntity, Error>>;
  
  transformOperationSequence(
    operations: OperationEntity[]
  ): Promise<Result<OperationEntity[], Error>>;
  
  canTransformOperations(
    op1: OperationEntity, 
    op2: OperationEntity
  ): boolean;
  
  calculateTransformationComplexity(
    operations: OperationEntity[]
  ): TransformationComplexity;
}

export type TransformationComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'INTRACTABLE';

export class CRDTTransformationService implements ICRDTTransformationService {
  async transformOperation(
    operation: OperationEntity, 
    againstOperation: OperationEntity
  ): Promise<Result<OperationEntity, Error>> {
    try {
      if (!this.canTransformOperations(operation, againstOperation)) {
        return { 
          success: false, 
          error: new Error('Operations cannot be transformed due to incompatible types or conflicts') 
        };
      }

      const transformationType = this.determineTransformationType(operation, againstOperation);
      const context: TransformationContext = {
        sourceOperation: operation,
        targetOperation: againstOperation,
        transformationType,
        priority: this.calculateTransformationPriority(operation, againstOperation)
      };

      return await this.executeTransformation(context);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown transformation error') 
      };
    }
  }

  async transformOperationSequence(
    operations: OperationEntity[]
  ): Promise<Result<OperationEntity[], Error>> {
    if (operations.length <= 1) {
      return { success: true, data: operations };
    }

    try {
      const sortedOps = this.sortOperationsByDependency(operations);
      const transformedOps: OperationEntity[] = [];
      
      for (let i = 0; i < sortedOps.length; i++) {
        let currentOp = sortedOps[i];
        
        // Transform against all previously processed operations
        for (const processedOp of transformedOps) {
          if (currentOp.isConcurrentWith(processedOp)) {
            const transformResult = await this.transformOperation(currentOp, processedOp);
            if (!transformResult.success) {
              return transformResult;
            }
            currentOp = transformResult.data;
          }
        }
        
        transformedOps.push(currentOp);
      }

      return { success: true, data: transformedOps };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Sequence transformation failed') 
      };
    }
  }

  canTransformOperations(op1: OperationEntity, op2: OperationEntity): boolean {
    // Cannot transform operations that have causal dependencies
    if (op1.hasCausalDependencyOn(op2) || op2.hasCausalDependencyOn(op1)) {
      return false;
    }

    // Operations must be concurrent to require transformation
    if (!op1.isConcurrentWith(op2)) {
      return false;
    }

    // Check if operation types can be transformed
    return this.areOperationTypesCompatible(
      op1.getOperationType(), 
      op2.getOperationType()
    );
  }

  calculateTransformationComplexity(operations: OperationEntity[]): TransformationComplexity {
    if (operations.length <= 2) {
      return 'SIMPLE';
    }

    if (operations.length > 20) {
      return 'INTRACTABLE';
    }

    const structuralOps = operations.filter(op => op.isStructuralOperation());
    const semanticOps = operations.filter(op => op.isSemanticOperation());
    const concurrentGroups = this.findConcurrentGroups(operations);

    if (semanticOps.length > 5) {
      return 'COMPLEX';
    }

    if (concurrentGroups.length > 3) {
      return 'COMPLEX';
    }

    if (structuralOps.length > 10) {
      return 'MODERATE';
    }

    return 'MODERATE';
  }

  private async executeTransformation(
    context: TransformationContext
  ): Promise<Result<OperationEntity, Error>> {
    switch (context.transformationType) {
      case 'OPERATIONAL_TRANSFORM':
        return this.performOperationalTransform(context);
      
      case 'POSITION_ADJUSTMENT':
        return this.performPositionAdjustment(context);
      
      case 'CONTENT_MERGE':
        return this.performContentMerge(context);
      
      case 'STRUCTURAL_REORDER':
        return this.performStructuralReorder(context);
      
      case 'LAST_WRITER_WINS':
        return this.performLastWriterWins(context);
      
      default:
        return { 
          success: false, 
          error: new Error(`Unknown transformation type: ${context.transformationType}`) 
        };
    }
  }

  private async performOperationalTransform(
    context: TransformationContext
  ): Promise<Result<OperationEntity, Error>> {
    const { sourceOperation, targetOperation } = context;
    
    // Use existing transformation logic from OperationEntity
    const transformResult = sourceOperation.transformWith(targetOperation);
    if (!transformResult.success) {
      return transformResult;
    }

    return { success: true, data: transformResult.data };
  }

  private async performPositionAdjustment(
    context: TransformationContext
  ): Promise<Result<OperationEntity, Error>> {
    const { sourceOperation, targetOperation } = context;
    
    if (sourceOperation.getOperationType().getValue() !== 'UPDATE_TREE_POSITION') {
      return { success: true, data: sourceOperation };
    }

    const sourcePayload = sourceOperation.getPayload().getData();
    const targetPayload = targetOperation.getPayload().getData();

    if (!this.isPositionPayload(sourcePayload) || !this.isPositionPayload(targetPayload)) {
      return { success: true, data: sourceOperation };
    }

    const adjustedPosition = this.calculatePositionAdjustment(
      sourcePayload as {x: number, y: number}, 
      targetPayload as {x: number, y: number}
    );

    return this.createTransformedOperation(
      sourceOperation, 
      adjustedPosition,
      'Position adjusted to avoid overlap'
    );
  }

  private async performContentMerge(
    context: TransformationContext
  ): Promise<Result<OperationEntity, Error>> {
    const { sourceOperation, targetOperation } = context;
    
    if (!sourceOperation.isSemanticOperation() || !targetOperation.isSemanticOperation()) {
      return { success: true, data: sourceOperation };
    }

    const mergedContent = this.mergeSemanticContent(
      sourceOperation.getPayload().getData(),
      targetOperation.getPayload().getData()
    );

    return this.createTransformedOperation(
      sourceOperation,
      mergedContent,
      'Content merged from concurrent operations'
    );
  }

  private async performStructuralReorder(
    context: TransformationContext
  ): Promise<Result<OperationEntity, Error>> {
    const { sourceOperation, targetOperation } = context;
    
    // For structural operations, maintain the operation but adjust internal references
    if (this.requiresReferenceAdjustment(sourceOperation, targetOperation)) {
      const adjustedPayload = this.adjustStructuralReferences(
        sourceOperation.getPayload().getData(),
        targetOperation
      );
      
      return this.createTransformedOperation(
        sourceOperation,
        adjustedPayload,
        'Structural references adjusted'
      );
    }

    return { success: true, data: sourceOperation };
  }

  private async performLastWriterWins(
    context: TransformationContext
  ): Promise<Result<OperationEntity, Error>> {
    const { sourceOperation, targetOperation } = context;
    
    if (sourceOperation.getVectorClock().happensAfter(targetOperation.getVectorClock())) {
      return { success: true, data: sourceOperation };
    } else {
      // Return a no-op version of the source operation
      return this.createNoOpOperation(sourceOperation);
    }
  }

  private determineTransformationType(
    op1: OperationEntity, 
    op2: OperationEntity
  ): TransformationType {
    if (op1.getOperationType().getValue() === 'UPDATE_TREE_POSITION' ||
        op2.getOperationType().getValue() === 'UPDATE_TREE_POSITION') {
      return 'POSITION_ADJUSTMENT';
    }

    if (op1.isSemanticOperation() && op2.isSemanticOperation()) {
      return 'CONTENT_MERGE';
    }

    if (op1.isStructuralOperation() && op2.isStructuralOperation()) {
      return 'STRUCTURAL_REORDER';
    }

    if (op1.canCommutewWith(op2)) {
      return 'OPERATIONAL_TRANSFORM';
    }

    return 'LAST_WRITER_WINS';
  }

  private calculateTransformationPriority(
    op1: OperationEntity, 
    op2: OperationEntity
  ): TransformationPriority {
    if (op1.isSemanticOperation() || op2.isSemanticOperation()) {
      return 'HIGH';
    }

    if (op1.getOperationType().isDeletion() || op2.getOperationType().isDeletion()) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  private sortOperationsByDependency(operations: OperationEntity[]): OperationEntity[] {
    return [...operations].sort((a, b) => {
      if (a.hasCausalDependencyOn(b)) return 1;
      if (b.hasCausalDependencyOn(a)) return -1;
      return a.getTimestamp().compareTo(b.getTimestamp());
    });
  }

  private areOperationTypesCompatible(type1: OperationType, type2: OperationType): boolean {
    // Deletion operations cannot be transformed with creation operations on same target
    if ((type1.isDeletion() && type2.isCreation()) || 
        (type1.isCreation() && type2.isDeletion())) {
      return false;
    }

    // Some semantic operations cannot be automatically transformed
    if (type1.isSemantic() && type2.isSemantic() && 
        (type1.getValue().includes('STATEMENT') || type2.getValue().includes('STATEMENT'))) {
      return false;
    }

    return true;
  }

  private findConcurrentGroups(operations: OperationEntity[]): OperationEntity[][] {
    const groups: OperationEntity[][] = [];
    const processed = new Set<string>();

    for (const op of operations) {
      if (processed.has(op.getId())) continue;

      const group = [op];
      processed.add(op.getId());

      for (const otherOp of operations) {
        if (op.getId() !== otherOp.getId() && 
            !processed.has(otherOp.getId()) && 
            op.isConcurrentWith(otherOp)) {
          group.push(otherOp);
          processed.add(otherOp.getId());
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  private isPositionPayload(payload: unknown): boolean {
    return typeof payload === 'object' && 
           payload !== null &&
           'x' in payload && 
           'y' in payload &&
           typeof (payload as any).x === 'number' &&
           typeof (payload as any).y === 'number';
  }

  private calculatePositionAdjustment(
    sourcePos: {x: number, y: number}, 
    targetPos: {x: number, y: number}
  ): {x: number, y: number} {
    // Offset source position to avoid overlap
    const offset = 50; // pixels
    return {
      x: sourcePos.x + (sourcePos.x > targetPos.x ? offset : -offset),
      y: sourcePos.y + (sourcePos.y > targetPos.y ? offset : -offset)
    };
  }

  private mergeSemanticContent(sourcePayload: unknown, targetPayload: unknown): unknown {
    if (typeof sourcePayload === 'object' && typeof targetPayload === 'object' &&
        sourcePayload !== null && targetPayload !== null) {
      return { 
        ...sourcePayload as Record<string, unknown>, 
        ...targetPayload as Record<string, unknown>,
        mergedAt: new Date().toISOString(),
        mergeType: 'AUTOMATIC_CONTENT_MERGE'
      };
    }
    
    return sourcePayload;
  }

  private requiresReferenceAdjustment(
    sourceOp: OperationEntity, 
    targetOp: OperationEntity
  ): boolean {
    return targetOp.getOperationType().isCreation() && 
           sourceOp.getTargetPath().includes(targetOp.getTargetPath());
  }

  private adjustStructuralReferences(
    payload: unknown, 
    referencingOperation: OperationEntity
  ): unknown {
    // Simple reference adjustment - in a real implementation, this would be more sophisticated
    if (typeof payload === 'object' && payload !== null) {
      return {
        ...payload as Record<string, unknown>,
        adjustedFor: referencingOperation.getId(),
        adjustedAt: new Date().toISOString()
      };
    }
    
    return payload;
  }

  private async createTransformedOperation(
    originalOperation: OperationEntity,
    newPayload: unknown,
    transformationNote: string
  ): Promise<Result<OperationEntity, Error>> {
    const newOpIdResult = OperationId.generateWithUUID(originalOperation.getDeviceId());
    if (!newOpIdResult.success) {
      return { success: false, error: newOpIdResult.error };
    }

    const payloadResult = OperationPayload.create({
      ...newPayload,
      transformationApplied: true,
      transformationNote,
      originalOperationId: originalOperation.getId().getValue()
    }, originalOperation.getOperationType());
    
    if (!payloadResult.success) {
      return { success: false, error: payloadResult.error };
    }

    const transformedOpResult = OperationEntity.create(
      newOpIdResult.data,
      originalOperation.getDeviceId(),
      originalOperation.getOperationType(),
      originalOperation.getTargetPath(),
      payloadResult.data,
      originalOperation.getVectorClock(),
      originalOperation.getParentOperationId()
    );

    return transformedOpResult;
  }

  private async createNoOpOperation(
    originalOperation: OperationEntity
  ): Promise<Result<OperationEntity, Error>> {
    return this.createTransformedOperation(
      originalOperation,
      { 
        noOp: true, 
        reason: 'Last writer wins - operation superseded',
        originalPayload: originalOperation.getPayload().getData()
      },
      'Converted to no-op due to conflict resolution'
    );
  }

  // Utility methods for analysis and debugging
  
  getTransformationStatistics(operations: OperationEntity[]): {
    totalOperations: number;
    concurrentOperations: number;
    transformableOperations: number;
    complexityDistribution: Record<TransformationComplexity, number>;
  } {
    const concurrentGroups = this.findConcurrentGroups(operations);
    const concurrentOperationCount = concurrentGroups.reduce((sum, group) => sum + group.length, 0);
    
    let transformableCount = 0;
    const complexityDistribution: Record<TransformationComplexity, number> = {
      'SIMPLE': 0,
      'MODERATE': 0,
      'COMPLEX': 0,
      'INTRACTABLE': 0
    };

    for (const group of concurrentGroups) {
      const complexity = this.calculateTransformationComplexity(group);
      complexityDistribution[complexity]++;
      
      if (complexity !== 'INTRACTABLE') {
        transformableCount += group.length;
      }
    }

    return {
      totalOperations: operations.length,
      concurrentOperations: concurrentOperationCount,
      transformableOperations: transformableCount,
      complexityDistribution
    };
  }

  validateTransformationResult(
    original: OperationEntity, 
    transformed: OperationEntity
  ): Result<void, Error> {
    if (original.getDeviceId() !== transformed.getDeviceId()) {
      return { success: false, error: new Error('Transformation must preserve device ID') };
    }

    if (original.getOperationType() !== transformed.getOperationType()) {
      return { success: false, error: new Error('Transformation must preserve operation type') };
    }

    if (original.getTargetPath() !== transformed.getTargetPath()) {
      return { success: false, error: new Error('Transformation must preserve target path') };
    }

    return { success: true, data: undefined };
  }
}