import { err, ok, type Result } from 'neverthrow';

import { ConflictType } from '../value-objects/ConflictType';
import { type DeviceId } from '../value-objects/DeviceId';
import { LogicalTimestamp } from '../value-objects/LogicalTimestamp';
import { OperationId } from '../value-objects/OperationId';
import { OperationPayload } from '../value-objects/OperationPayload';
import { type OperationType } from '../value-objects/OperationType';
import { type VectorClock } from './VectorClock';

export type TransformationType =
  | 'OPERATIONAL_TRANSFORM'
  | 'LAST_WRITER_WINS'
  | 'POSITION_ADJUSTMENT'
  | 'CONTENT_MERGE'
  | 'STRUCTURAL_REORDER';

export type TransformationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type TransformationComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'INTRACTABLE';

export interface TransformationContext {
  readonly sourceOperation: Operation;
  readonly targetOperation: Operation;
  readonly transformationType: TransformationType;
  readonly priority: TransformationPriority;
}

export class Operation {
  private constructor(
    private readonly id: OperationId,
    private readonly deviceId: DeviceId,
    private readonly operationType: OperationType,
    private readonly targetPath: string,
    private readonly payload: OperationPayload,
    private readonly vectorClock: VectorClock,
    private readonly timestamp: LogicalTimestamp,
    private readonly parentOperationId?: OperationId
  ) {}

  static create(
    id: OperationId,
    deviceId: DeviceId,
    operationType: OperationType,
    targetPath: string,
    payload: OperationPayload,
    vectorClock: VectorClock,
    parentOperationId?: OperationId
  ): Result<Operation, Error> {
    // Operation ID is already validated by OperationId value object

    if (!targetPath.trim()) {
      return err(new Error('Target path cannot be empty'));
    }

    const timestampResult = LogicalTimestamp.fromVectorClock(vectorClock);
    if (timestampResult.isErr()) {
      return err(timestampResult.error);
    }

    return ok(
      new Operation(
        id,
        deviceId,
        operationType,
        targetPath,
        payload,
        vectorClock,
        timestampResult.value,
        parentOperationId
      )
    );
  }

  getId(): OperationId {
    return this.id;
  }

  getDeviceId(): DeviceId {
    return this.deviceId;
  }

  getOperationType(): OperationType {
    return this.operationType;
  }

  getTargetPath(): string {
    return this.targetPath;
  }

  getPayload(): OperationPayload {
    return this.payload;
  }

  getVectorClock(): VectorClock {
    return this.vectorClock;
  }

  getTimestamp(): LogicalTimestamp {
    return this.timestamp;
  }

  getParentOperationId(): OperationId | undefined {
    return this.parentOperationId;
  }

  isStructuralOperation(): boolean {
    return this.operationType.isStructural();
  }

  isSemanticOperation(): boolean {
    return this.operationType.isSemantic();
  }

  canCommutewWith(otherOperation: Operation): boolean {
    if (this.targetPath !== otherOperation.targetPath) {
      return true;
    }

    if (this.isStructuralOperation() && otherOperation.isStructuralOperation()) {
      return this.operationType.canCommuteWith(otherOperation.operationType);
    }

    return false;
  }

  canTransformWith(otherOperation: Operation): boolean {
    // Cannot transform operations that have causal dependencies
    if (this.hasCausalDependencyOn(otherOperation) || otherOperation.hasCausalDependencyOn(this)) {
      return false;
    }

    // Operations must be concurrent to require transformation
    if (!this.isConcurrentWith(otherOperation)) {
      return false;
    }

    // Check if operation types can be transformed
    return this.areOperationTypesCompatible(otherOperation.operationType);
  }

  hasCausalDependencyOn(otherOperation: Operation): boolean {
    return this.vectorClock.happensAfter(otherOperation.vectorClock);
  }

  isConcurrentWith(otherOperation: Operation): boolean {
    return this.vectorClock.isConcurrentWith(otherOperation.vectorClock);
  }

  transformWith(otherOperation: Operation): Result<Operation, Error> {
    if (!this.canTransformWith(otherOperation)) {
      return err(
        new Error('Operations cannot be transformed due to incompatible types or conflicts')
      );
    }

    const transformationType = this.determineTransformationType(otherOperation);
    const context: TransformationContext = {
      sourceOperation: this,
      targetOperation: otherOperation,
      transformationType,
      priority: this.calculateTransformationPriority(otherOperation),
    };

    return this.executeTransformation(context);
  }

  applyTo(currentState: unknown): Result<unknown, Error> {
    const validationResult = this.validateApplicationTo(currentState);
    if (validationResult.isErr()) {
      return validationResult;
    }

    try {
      const newState = this.executeOn(currentState);
      return ok(newState);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Operation execution failed'));
    }
  }

  detectConflictWith(otherOperation: Operation): Result<ConflictType | null, Error> {
    if (this.targetPath !== otherOperation.targetPath) {
      return ok(null);
    }

    if (!this.isConcurrentWith(otherOperation)) {
      return ok(null);
    }

    const conflictType = this.determineConflictTypeWith(otherOperation);
    return ok(conflictType);
  }

  transformAgainstOperations(operations: Operation[]): Result<Operation, Error> {
    let transformedOperation: Operation = this;

    for (const againstOp of operations) {
      if (transformedOperation.isConcurrentWith(againstOp)) {
        const transformResult = transformedOperation.transformWith(againstOp);
        if (transformResult.isErr()) {
          return err(transformResult.error);
        }
        transformedOperation = transformResult.value;
      }
    }

    return ok(transformedOperation);
  }

  static transformOperationSequence(operations: Operation[]): Result<Operation[], Error> {
    if (operations.length <= 1) {
      return ok(operations);
    }

    try {
      const sortedOps = Operation.sortOperationsByDependency(operations);
      const transformedOps: Operation[] = [];

      for (let i = 0; i < sortedOps.length; i++) {
        let currentOp = sortedOps[i];
        if (!currentOp) continue;

        // Transform against all previously processed operations
        for (const processedOp of transformedOps) {
          if (currentOp.isConcurrentWith(processedOp)) {
            const transformResult = currentOp.transformWith(processedOp);
            if (transformResult.isErr()) {
              return err(transformResult.error);
            }
            currentOp = transformResult.value;
          }
        }

        if (currentOp) {
          transformedOps.push(currentOp);
        }
      }

      return ok(transformedOps);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Sequence transformation failed'));
    }
  }

  static calculateTransformationComplexity(operations: Operation[]): TransformationComplexity {
    if (operations.length <= 2) {
      return 'SIMPLE';
    }

    if (operations.length > 20) {
      return 'INTRACTABLE';
    }

    const structuralOps = operations.filter(op => op.isStructuralOperation());
    const semanticOps = operations.filter(op => op.isSemanticOperation());
    const concurrentGroups = Operation.findConcurrentGroups(operations);

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

  private validateApplicationTo(currentState: unknown): Result<void, Error> {
    if (this.operationType.isDeletion() && !this.targetExistsIn(currentState)) {
      return err(new Error('Cannot delete non-existent target'));
    }

    if (this.operationType.isUpdate() && !this.targetExistsIn(currentState)) {
      return err(new Error('Cannot update non-existent target'));
    }

    if (this.operationType.isCreation() && this.targetExistsIn(currentState)) {
      return err(new Error('Cannot create already existing target'));
    }

    return ok(undefined);
  }

  private executeOn(currentState: unknown): unknown {
    switch (this.operationType.getValue()) {
      case 'CREATE_STATEMENT':
      case 'CREATE_ARGUMENT':
      case 'CREATE_TREE':
      case 'CREATE_CONNECTION':
        return this.createTargetIn(currentState);

      case 'UPDATE_STATEMENT':
      case 'UPDATE_ARGUMENT':
      case 'UPDATE_TREE_POSITION':
      case 'UPDATE_METADATA':
        return this.updateTargetIn(currentState);

      case 'DELETE_STATEMENT':
      case 'DELETE_ARGUMENT':
      case 'DELETE_TREE':
      case 'DELETE_CONNECTION':
        return this.deleteTargetFrom(currentState);

      default:
        throw new Error(`Unsupported operation type: ${this.operationType.getValue()}`);
    }
  }

  private determineConflictTypeWith(otherOperation: Operation): ConflictType {
    const hasDeletions =
      this.operationType.isDeletion() || otherOperation.operationType.isDeletion();
    const hasSemanticOperations =
      this.isSemanticOperation() || otherOperation.isSemanticOperation();
    const hasStructuralOperations =
      this.isStructuralOperation() || otherOperation.isStructuralOperation();

    if (hasDeletions) {
      const result = ConflictType.deletion();
      if (result.isErr()) {
        throw new Error('Failed to create deletion conflict type');
      }
      return result.value;
    }

    if (hasSemanticOperations) {
      const result = ConflictType.semantic();
      if (result.isErr()) {
        throw new Error('Failed to create semantic conflict type');
      }
      return result.value;
    }

    if (hasStructuralOperations) {
      const result = ConflictType.structural();
      if (result.isErr()) {
        throw new Error('Failed to create structural conflict type');
      }
      return result.value;
    }

    const result = ConflictType.concurrentModification();
    if (result.isErr()) {
      throw new Error('Failed to create concurrent modification conflict type');
    }
    return result.value;
  }

  private targetExistsIn(state: unknown): boolean {
    return state !== null && state !== undefined;
  }

  private createTargetIn(currentState: unknown): unknown {
    return { ...(currentState as Record<string, unknown>), [this.targetPath]: this.payload };
  }

  private updateTargetIn(currentState: unknown): unknown {
    return { ...(currentState as Record<string, unknown>), [this.targetPath]: this.payload };
  }

  private deleteTargetFrom(currentState: unknown): unknown {
    const newState = { ...(currentState as Record<string, unknown>) };
    delete newState[this.targetPath];
    return newState;
  }

  private executeTransformation(context: TransformationContext): Result<Operation, Error> {
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
        return err(new Error(`Unknown transformation type: ${context.transformationType}`));
    }
  }

  private performOperationalTransform(context: TransformationContext): Result<Operation, Error> {
    const { targetOperation } = context;

    if (this.hasCausalDependencyOn(targetOperation)) {
      return ok(this);
    }

    const transformedPayloadResult = this.payload.transform(
      targetOperation.payload,
      'OPERATIONAL_TRANSFORM'
    );
    if (transformedPayloadResult.isErr()) {
      return err(transformedPayloadResult.error);
    }

    return this.createTransformedOperation(
      transformedPayloadResult.value,
      'Operationally transformed'
    );
  }

  private performPositionAdjustment(context: TransformationContext): Result<Operation, Error> {
    const { targetOperation } = context;

    if (this.operationType.getValue() !== 'UPDATE_TREE_POSITION') {
      return ok(this);
    }

    const sourcePayload = this.payload.getData();
    const targetPayload = targetOperation.payload.getData();

    if (!this.isPositionPayload(sourcePayload) || !this.isPositionPayload(targetPayload)) {
      return ok(this);
    }

    const adjustedPosition = this.calculatePositionAdjustment(
      sourcePayload as { x: number; y: number },
      targetPayload as { x: number; y: number }
    );

    const adjustedPayloadResult = OperationPayload.create(
      adjustedPosition as any,
      this.operationType
    );
    if (adjustedPayloadResult.isErr()) {
      return err(adjustedPayloadResult.error);
    }

    return this.createTransformedOperation(
      adjustedPayloadResult.value,
      'Position adjusted to avoid overlap'
    );
  }

  private performContentMerge(context: TransformationContext): Result<Operation, Error> {
    const { targetOperation } = context;

    if (!this.isSemanticOperation() || !targetOperation.isSemanticOperation()) {
      return ok(this);
    }

    const mergedContent = this.mergeSemanticContent(
      this.payload.getData(),
      targetOperation.payload.getData()
    );

    const mergedPayloadResult = OperationPayload.create(mergedContent as any, this.operationType);
    if (mergedPayloadResult.isErr()) {
      return err(mergedPayloadResult.error);
    }

    return this.createTransformedOperation(
      mergedPayloadResult.value,
      'Content merged from concurrent operations'
    );
  }

  private performStructuralReorder(context: TransformationContext): Result<Operation, Error> {
    const { targetOperation } = context;

    // For structural operations, maintain the operation but adjust internal references
    if (this.requiresReferenceAdjustment(targetOperation)) {
      const adjustedPayload = this.adjustStructuralReferences(
        this.payload.getData(),
        targetOperation
      );

      const adjustedPayloadResult = OperationPayload.create(
        adjustedPayload as any,
        this.operationType
      );
      if (adjustedPayloadResult.isErr()) {
        return err(adjustedPayloadResult.error);
      }

      return this.createTransformedOperation(
        adjustedPayloadResult.value,
        'Structural references adjusted'
      );
    }

    return ok(this);
  }

  private performLastWriterWins(context: TransformationContext): Result<Operation, Error> {
    const { targetOperation } = context;

    if (this.vectorClock.happensAfter(targetOperation.vectorClock)) {
      return ok(this);
    } else {
      // Return a no-op version of the operation
      return this.createNoOpOperation();
    }
  }

  private determineTransformationType(otherOperation: Operation): TransformationType {
    if (
      this.operationType.getValue() === 'UPDATE_TREE_POSITION' ||
      otherOperation.operationType.getValue() === 'UPDATE_TREE_POSITION'
    ) {
      return 'POSITION_ADJUSTMENT';
    }

    if (this.isSemanticOperation() && otherOperation.isSemanticOperation()) {
      return 'CONTENT_MERGE';
    }

    if (this.isStructuralOperation() && otherOperation.isStructuralOperation()) {
      return 'STRUCTURAL_REORDER';
    }

    if (this.canCommutewWith(otherOperation)) {
      return 'OPERATIONAL_TRANSFORM';
    }

    return 'LAST_WRITER_WINS';
  }

  private calculateTransformationPriority(otherOperation: Operation): TransformationPriority {
    if (this.isSemanticOperation() || otherOperation.isSemanticOperation()) {
      return 'HIGH';
    }

    if (this.operationType.isDeletion() || otherOperation.operationType.isDeletion()) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  private areOperationTypesCompatible(otherType: OperationType): boolean {
    // Deletion operations cannot be transformed with creation operations on same target
    if (
      (this.operationType.isDeletion() && otherType.isCreation()) ||
      (this.operationType.isCreation() && otherType.isDeletion())
    ) {
      return false;
    }

    // Some semantic operations cannot be automatically transformed
    if (
      this.operationType.isSemantic() &&
      otherType.isSemantic() &&
      (this.operationType.getValue().includes('STATEMENT') ||
        otherType.getValue().includes('STATEMENT'))
    ) {
      return false;
    }

    return true;
  }

  private static sortOperationsByDependency(operations: Operation[]): Operation[] {
    return [...operations].sort((a, b) => {
      if (a.hasCausalDependencyOn(b)) return 1;
      if (b.hasCausalDependencyOn(a)) return -1;
      return a.timestamp.compareTo(b.timestamp);
    });
  }

  static findConcurrentGroups(operations: Operation[]): Operation[][] {
    const groups: Operation[][] = [];
    const processed = new Set<string>();

    for (const op of operations) {
      if (processed.has(op.id.toString())) continue;

      const group = [op];
      processed.add(op.id.toString());

      for (const otherOp of operations) {
        if (
          op.id !== otherOp.id &&
          !processed.has(otherOp.id.toString()) &&
          op.isConcurrentWith(otherOp)
        ) {
          group.push(otherOp);
          processed.add(otherOp.id.toString());
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  private isPositionPayload(payload: unknown): boolean {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'x' in payload &&
      'y' in payload &&
      typeof (payload as any).x === 'number' &&
      typeof (payload as any).y === 'number'
    );
  }

  private calculatePositionAdjustment(
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number }
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

  private requiresReferenceAdjustment(otherOperation: Operation): boolean {
    return (
      otherOperation.operationType.isCreation() &&
      this.targetPath.includes(otherOperation.targetPath)
    );
  }

  private adjustStructuralReferences(payload: unknown, referencingOperation: Operation): unknown {
    // Simple reference adjustment - in a real implementation, this would be more sophisticated
    if (typeof payload === 'object' && payload !== null) {
      return {
        ...(payload as Record<string, unknown>),
        adjustedFor: referencingOperation.id,
        adjustedAt: new Date().toISOString(),
      };
    }

    return payload;
  }

  private createTransformedOperation(
    newPayload: OperationPayload,
    transformationNote: string
  ): Result<Operation, Error> {
    const newOpIdResult = OperationId.generateWithUUID(this.deviceId);
    if (newOpIdResult.isErr()) {
      return err(newOpIdResult.error);
    }

    const payloadData = newPayload.getData();
    const payloadWithMetadata = OperationPayload.create(
      {
        ...(typeof payloadData === 'object' && payloadData !== null ? payloadData : {}),
        transformationApplied: true,
        transformationNote,
        originalOperationId: this.id.getValue(),
      } as any,
      this.operationType
    );

    if (payloadWithMetadata.isErr()) {
      return err(payloadWithMetadata.error);
    }

    return Operation.create(
      newOpIdResult.value,
      this.deviceId,
      this.operationType,
      this.targetPath,
      payloadWithMetadata.value,
      this.vectorClock,
      this.parentOperationId
    );
  }

  private createNoOpOperation(): Result<Operation, Error> {
    const originalData = this.payload.getData();
    const noOpPayload = OperationPayload.create(
      {
        noOp: true,
        reason: 'Last writer wins - operation superseded',
        originalPayload:
          typeof originalData === 'object' && originalData !== null ? originalData : {},
      } as any,
      this.operationType
    );

    if (noOpPayload.isErr()) {
      return err(noOpPayload.error);
    }

    return this.createTransformedOperation(
      noOpPayload.value,
      'Converted to no-op due to conflict resolution'
    );
  }
}
