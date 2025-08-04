import { err, ok, type Result } from 'neverthrow';

import type { ConflictInfo } from '../services/ConflictDetectionService';
import type {
  IOperationComplexityAnalyzer,
  TransformationComplexity,
} from '../services/OperationComplexityAnalyzer';
import type {
  IOperationTransformationService,
  TransformationPriority,
  TransformationType,
} from '../services/OperationTransformationService';
import { ConflictType } from '../value-objects/ConflictType';
import { DeviceId } from '../value-objects/DeviceId';
import { LogicalTimestamp } from '../value-objects/LogicalTimestamp';
import { OperationId } from '../value-objects/OperationId';
import { OperationPayload } from '../value-objects/OperationPayload';
import { OperationType, type OperationTypeValue } from '../value-objects/OperationType';
import type { IOperation } from './shared-types';
import { VectorClock } from './VectorClock';

export class Operation implements IOperation {
  private constructor(
    private readonly id: OperationId,
    private readonly deviceId: DeviceId,
    private readonly operationType: OperationType,
    private readonly targetPath: string,
    private readonly payload: OperationPayload,
    private readonly vectorClock: VectorClock,
    private readonly timestamp: LogicalTimestamp,
    private readonly parentOperationId?: OperationId,
    private readonly transformationService?: IOperationTransformationService,
    private readonly complexityAnalyzer?: IOperationComplexityAnalyzer,
  ) {}

  static create(
    id: OperationId,
    deviceId: DeviceId,
    operationType: OperationType,
    targetPath: string,
    payload: OperationPayload,
    vectorClock: VectorClock,
    parentOperationId?: OperationId,
  ): Result<Operation, Error> {
    return Operation.createWithServices(
      id,
      deviceId,
      operationType,
      targetPath,
      payload,
      vectorClock,
      parentOperationId,
    );
  }

  static createWithServices(
    id: OperationId,
    deviceId: DeviceId,
    operationType: OperationType,
    targetPath: string,
    payload: OperationPayload,
    vectorClock: VectorClock,
    parentOperationId?: OperationId,
    transformationService?: IOperationTransformationService,
    complexityAnalyzer?: IOperationComplexityAnalyzer,
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
        parentOperationId,
        transformationService,
        complexityAnalyzer,
      ),
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

  canCommuteWith(otherOperation: IOperation): boolean {
    if (this.targetPath !== otherOperation.getTargetPath()) {
      return true;
    }

    if (this.isStructuralOperation() && otherOperation.isStructuralOperation()) {
      return this.operationType.canCommuteWith(otherOperation.getOperationType());
    }

    return false;
  }

  canTransformWith(otherOperation: IOperation): boolean {
    // Cannot transform operations that have causal dependencies
    if (this.hasCausalDependencyOn(otherOperation) || otherOperation.hasCausalDependencyOn(this)) {
      return false;
    }

    // Operations on different paths are incompatible for transformation
    if (this.targetPath !== otherOperation.getTargetPath()) {
      return false;
    }

    // Check if operation types can be transformed
    return this.areOperationTypesCompatible(otherOperation.getOperationType());
  }

  hasCausalDependencyOn(otherOperation: IOperation): boolean {
    return otherOperation.getVectorClock().happensBefore(this.vectorClock);
  }

  isConcurrentWith(otherOperation: IOperation): boolean {
    return this.vectorClock.isConcurrent(otherOperation.getVectorClock());
  }

  transformWith(otherOperation: IOperation): Result<[Operation, Operation], Error> {
    if (!this.canTransformWith(otherOperation)) {
      return err(
        new Error('Operations cannot be transformed due to incompatible types or conflicts'),
      );
    }

    // Use transformation service if available
    if (this.transformationService) {
      const transformationType = this.transformationService.determineTransformationType(
        this,
        otherOperation,
      );
      const priority = this.transformationService.calculateTransformationPriority(
        this,
        otherOperation,
      );

      const context = {
        sourceOperation: this,
        targetOperation: otherOperation,
        transformationType,
        priority,
      };

      const transformedSelfResult = this.transformationService.executeTransformation(this, context);
      if (transformedSelfResult.isErr()) {
        return err(transformedSelfResult.error);
      }

      const reverseContext = {
        sourceOperation: otherOperation,
        targetOperation: this,
        transformationType,
        priority: this.transformationService.calculateTransformationPriority(otherOperation, this),
      };

      const transformedOtherResult = this.transformationService.executeTransformation(
        otherOperation,
        reverseContext,
      );
      if (transformedOtherResult.isErr()) {
        return err(transformedOtherResult.error);
      }

      // Cast results back to Operation type (simplified for this refactoring)
      return ok([
        transformedSelfResult.value as Operation,
        transformedOtherResult.value as Operation,
      ]);
    }

    // Fallback to original implementation if no service available
    return this.legacyTransformWith(otherOperation);
  }

  private legacyTransformWith(otherOperation: IOperation): Result<[Operation, Operation], Error> {
    // Check if otherOperation is an instance of Operation for transformation
    if (!(otherOperation instanceof Operation)) {
      return err(new Error('Cannot transform with non-Operation instance'));
    }

    const transformationType = this.determineTransformationType(otherOperation);
    const context = {
      sourceOperation: this,
      targetOperation: otherOperation,
      transformationType,
      priority: this.calculateTransformationPriority(otherOperation),
    };

    const transformedSelfResult = this.executeTransformation(context);
    if (transformedSelfResult.isErr()) {
      return err(transformedSelfResult.error);
    }

    const reverseContext = {
      sourceOperation: otherOperation,
      targetOperation: this,
      transformationType,
      priority: otherOperation.calculateTransformationPriority(this),
    };

    const transformedOtherResult = otherOperation.executeTransformation(reverseContext);
    if (transformedOtherResult.isErr()) {
      return err(transformedOtherResult.error);
    }

    return ok([transformedSelfResult.value, transformedOtherResult.value]);
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

  /**
   * Detects if this operation conflicts with another operation
   * Returns conflict information without creating a Conflict instance to avoid circular dependency
   */
  detectConflictWith(otherOperation: IOperation): Result<ConflictInfo | null, Error> {
    if (this.targetPath !== otherOperation.getTargetPath()) {
      return ok(null);
    }

    if (!this.isConcurrentWith(otherOperation)) {
      return ok(null);
    }

    try {
      const conflictType = this.determineConflictTypeWith(otherOperation);
      const conflictId = `conflict-${this.id.getValue()}-${otherOperation.getId().getValue()}`;

      return ok({
        id: conflictId,
        conflictType,
        targetPath: this.targetPath,
        operations: [this, otherOperation],
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to detect conflict'));
    }
  }

  transformAgainstOperations(operations: IOperation[]): Result<Operation, Error> {
    return operations.reduce<Result<Operation, Error>>((currentResult, againstOp) => {
      if (currentResult.isErr()) {
        return currentResult;
      }

      const currentOp = currentResult.value;
      if (currentOp.isConcurrentWith(againstOp)) {
        const transformResult = currentOp.transformWith(againstOp);
        if (transformResult.isErr()) {
          return err(transformResult.error);
        }
        // transformWith returns [Operation, Operation], we want the first one (transformed version of currentOp)
        const [transformedCurrentOp] = transformResult.value;
        return ok(transformedCurrentOp);
      }

      return currentResult;
    }, ok(this));
  }

  static transformOperationSequence(
    operations: IOperation[],
    transformationService?: IOperationTransformationService,
  ): Result<IOperation[], Error> {
    if (operations.length <= 1) {
      return ok(operations);
    }

    // Use service if available, otherwise fallback to legacy method
    if (transformationService) {
      return transformationService.transformOperationSequence(operations);
    }

    return Operation.legacyTransformOperationSequence(operations);
  }

  private static legacyTransformOperationSequence(
    operations: IOperation[],
  ): Result<IOperation[], Error> {
    try {
      const sortedOps = Operation.sortOperationsByDependency(operations);
      const transformedOps: IOperation[] = [];

      for (const op of sortedOps) {
        let currentOp = op;
        if (!currentOp) continue;

        // Transform against all previously processed operations
        for (const processedOp of transformedOps) {
          if (currentOp.isConcurrentWith(processedOp)) {
            // Only attempt transformation if currentOp is an Operation instance
            if (!(currentOp instanceof Operation)) {
              return err(new Error('Cannot transform non-Operation instance'));
            }
            const transformResult = currentOp.transformWith(processedOp);
            if (transformResult.isErr()) {
              return err(transformResult.error);
            }
            // transformWith returns [Operation, Operation], we want the first one (transformed version of currentOp)
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

  static calculateTransformationComplexity(
    operations: IOperation[],
    complexityAnalyzer?: IOperationComplexityAnalyzer,
  ): TransformationComplexity {
    // Use service if available, otherwise fallback to legacy method
    if (complexityAnalyzer) {
      return complexityAnalyzer.calculateComplexity(operations);
    }

    return Operation.legacyCalculateTransformationComplexity(operations);
  }

  private static legacyCalculateTransformationComplexity(
    operations: IOperation[],
  ): TransformationComplexity {
    if (operations.length <= 2) {
      return 'SIMPLE';
    }

    if (operations.length > 20) {
      return 'INTRACTABLE';
    }

    const structuralOps = operations.filter((op) => op.isStructuralOperation());
    const semanticOps = operations.filter((op) => op.isSemanticOperation());
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

  private determineConflictTypeWith(otherOperation: IOperation): ConflictType {
    const hasDeletions =
      this.operationType.isDeletion() || otherOperation.getOperationType().isDeletion();
    const hasUpdates =
      this.operationType.isUpdate() || otherOperation.getOperationType().isUpdate();
    const bothAreUpdates =
      this.operationType.isUpdate() && otherOperation.getOperationType().isUpdate();

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
    if (this.isStructuralOperation() || otherOperation.isStructuralOperation()) {
      const result = ConflictType.structural();
      if (result.isErr()) {
        throw new Error('Failed to create structural conflict type');
      }
      return result.value;
    }

    // Default to concurrent modification
    const result = ConflictType.concurrentModification();
    if (result.isErr()) {
      throw new Error('Failed to create concurrent modification conflict type');
    }
    return result.value;
  }

  private targetExistsIn(state: unknown): boolean {
    if (state === null || state === undefined || typeof state !== 'object') {
      return false;
    }

    const stateObj = state as Record<string, unknown>;
    return Object.hasOwn(stateObj, this.targetPath);
  }

  private createTargetIn(currentState: unknown): unknown {
    return {
      ...(currentState as Record<string, unknown>),
      [this.targetPath]: this.payload.getData(),
    };
  }

  private updateTargetIn(currentState: unknown): unknown {
    return {
      ...(currentState as Record<string, unknown>),
      [this.targetPath]: this.payload.getData(),
    };
  }

  private deleteTargetFrom(currentState: unknown): unknown {
    const newState = { ...(currentState as Record<string, unknown>) };
    delete newState[this.targetPath];
    return newState;
  }

  private executeTransformation(context: {
    sourceOperation: Operation;
    targetOperation: Operation;
    transformationType: TransformationType;
    priority: TransformationPriority;
  }): Result<Operation, Error> {
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
        return err(
          new Error(`Unknown transformation type: ${context.transformationType as string}`),
        );
    }
  }

  // Legacy transformation methods - kept for backward compatibility
  private performOperationalTransform(context: {
    targetOperation: Operation;
    transformationType: TransformationType;
    priority: TransformationPriority;
  }): Result<Operation, Error> {
    const { targetOperation } = context;

    if (this.hasCausalDependencyOn(targetOperation)) {
      return ok(this);
    }

    const transformedPayloadResult = this.payload.transform(
      targetOperation.payload,
      'OPERATIONAL_TRANSFORM',
    );
    if (transformedPayloadResult.isErr()) {
      return err(transformedPayloadResult.error);
    }

    return this.createTransformedOperation(
      transformedPayloadResult.value,
      'Operationally transformed',
    );
  }

  private performPositionAdjustment(context: {
    targetOperation: Operation;
    transformationType: TransformationType;
    priority: TransformationPriority;
  }): Result<Operation, Error> {
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
      targetPayload as { x: number; y: number },
    );

    const adjustedPayloadResult = OperationPayload.create(
      adjustedPosition as Record<string, unknown>,
      this.operationType,
    );
    if (adjustedPayloadResult.isErr()) {
      return err(adjustedPayloadResult.error);
    }

    return this.createTransformedOperation(
      adjustedPayloadResult.value,
      'Position adjusted to avoid overlap',
    );
  }

  private performContentMerge(context: {
    targetOperation: Operation;
    transformationType: TransformationType;
    priority: TransformationPriority;
  }): Result<Operation, Error> {
    const { targetOperation } = context;

    if (!this.isSemanticOperation() || !targetOperation.isSemanticOperation()) {
      return ok(this);
    }

    const mergedContent = this.mergeSemanticContent(
      this.payload.getData(),
      targetOperation.payload.getData(),
    );

    const mergedPayloadResult = OperationPayload.create(
      mergedContent as Record<string, unknown>,
      this.operationType,
    );
    if (mergedPayloadResult.isErr()) {
      return err(mergedPayloadResult.error);
    }

    return this.createTransformedOperation(
      mergedPayloadResult.value,
      'Content merged from concurrent operations',
    );
  }

  private performStructuralReorder(context: {
    targetOperation: Operation;
    transformationType: TransformationType;
    priority: TransformationPriority;
  }): Result<Operation, Error> {
    const { targetOperation } = context;

    // For structural operations, maintain the operation but adjust internal references
    if (this.requiresReferenceAdjustment(targetOperation)) {
      const adjustedPayload = this.adjustStructuralReferences(
        this.payload.getData(),
        targetOperation,
      );

      const adjustedPayloadResult = OperationPayload.create(
        adjustedPayload as Record<string, unknown>,
        this.operationType,
      );
      if (adjustedPayloadResult.isErr()) {
        return err(adjustedPayloadResult.error);
      }

      return this.createTransformedOperation(
        adjustedPayloadResult.value,
        'Structural references adjusted',
      );
    }

    return ok(this);
  }

  private performLastWriterWins(context: {
    targetOperation: Operation;
    transformationType: TransformationType;
    priority: TransformationPriority;
  }): Result<Operation, Error> {
    const { targetOperation } = context;

    if (this.vectorClock.happensAfter(targetOperation.vectorClock)) {
      return ok(this);
    } else {
      // Return a no-op version of the operation
      return this.createNoOpOperation();
    }
  }

  private determineTransformationType(otherOperation: IOperation): TransformationType {
    if (
      this.operationType.getValue() === 'UPDATE_TREE_POSITION' ||
      otherOperation.getOperationType().getValue() === 'UPDATE_TREE_POSITION'
    ) {
      return 'POSITION_ADJUSTMENT';
    }

    if (this.isSemanticOperation() && otherOperation.isSemanticOperation()) {
      return 'CONTENT_MERGE';
    }

    if (this.isStructuralOperation() && otherOperation.isStructuralOperation()) {
      return 'STRUCTURAL_REORDER';
    }

    if (this.canCommuteWith(otherOperation)) {
      return 'OPERATIONAL_TRANSFORM';
    }

    return 'LAST_WRITER_WINS';
  }

  private calculateTransformationPriority(otherOperation: IOperation): TransformationPriority {
    if (this.isSemanticOperation() || otherOperation.isSemanticOperation()) {
      return 'HIGH';
    }

    if (this.operationType.isDeletion() || otherOperation.getOperationType().isDeletion()) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  private areOperationTypesCompatible(_otherType: OperationType): boolean {
    // Most operations can be transformed, let the transformation logic handle specifics
    return true;
  }

  private static sortOperationsByDependency(operations: IOperation[]): IOperation[] {
    return [...operations].sort((a, b) => {
      if (a.hasCausalDependencyOn(b)) return 1;
      if (b.hasCausalDependencyOn(a)) return -1;
      return a.getTimestamp().compareTo(b.getTimestamp());
    });
  }

  static findConcurrentGroups(operations: IOperation[]): IOperation[][] {
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

  private requiresReferenceAdjustment(otherOperation: IOperation): boolean {
    return (
      otherOperation.getOperationType().isCreation() &&
      this.targetPath.includes(otherOperation.getTargetPath())
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
    newPayload: OperationPayload,
    transformationNote: string,
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
      } as Record<string, unknown>,
      this.operationType,
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
      this.parentOperationId,
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
      } as Record<string, unknown>,
      this.operationType,
    );

    if (noOpPayload.isErr()) {
      return err(noOpPayload.error);
    }

    return this.createTransformedOperation(
      noOpPayload.value,
      'Converted to no-op due to conflict resolution',
    );
  }

  // Additional methods required by tests
  isIdempotent(): boolean {
    return this.operationType.isDeletion() || this.operationType.getValue() === 'UPDATE_METADATA';
  }

  isReversible(): boolean {
    // Most operations are reversible except for certain metadata updates
    return this.operationType.getValue() !== 'UPDATE_METADATA';
  }

  getSize(): number {
    const payloadSize = JSON.stringify(this.payload.getData()).length;
    const metadataSize = this.targetPath.length + this.id.getValue().length;
    return payloadSize + metadataSize;
  }

  getComplexity(): TransformationComplexity {
    // Use service if available, otherwise fallback to legacy method
    if (this.complexityAnalyzer) {
      return this.complexityAnalyzer.getOperationComplexity(this);
    }

    return this.legacyGetComplexity();
  }

  private legacyGetComplexity(): TransformationComplexity {
    const size = this.getSize();
    const isStructural = this.isStructuralOperation();
    const isSemantic = this.isSemanticOperation();

    if (size > 50000 || (isSemantic && isStructural && size > 10000)) {
      return 'COMPLEX';
    }

    if (size > 10000 || (isSemantic && size > 5000)) {
      return 'MODERATE';
    }

    return 'SIMPLE';
  }

  compose(otherOperation: IOperation): Result<Operation, Error> {
    // Can only compose operations from the same device
    if (!this.deviceId.equals(otherOperation.getDeviceId())) {
      return err(new Error('Cannot compose operations from different devices'));
    }

    // Can only compose compatible operation types
    if (!this.canComposeWith(otherOperation)) {
      return err(new Error('Cannot compose incompatible operations'));
    }

    // Create a new composed operation
    const composedData = this.composePayloads(
      this.payload.getData(),
      otherOperation.getPayload().getData(),
    );

    const composedPayloadResult = OperationPayload.create(
      composedData as Record<string, unknown>,
      this.operationType,
    );

    if (composedPayloadResult.isErr()) {
      return err(composedPayloadResult.error);
    }

    const newOpIdResult = OperationId.generateWithUUID(this.deviceId);
    if (newOpIdResult.isErr()) {
      return err(newOpIdResult.error);
    }

    return Operation.create(
      newOpIdResult.value,
      this.deviceId,
      this.operationType,
      this.targetPath,
      composedPayloadResult.value,
      this.vectorClock,
      this.parentOperationId,
    );
  }

  private canComposeWith(otherOperation: IOperation): boolean {
    // Only compose operations of the same type
    if (!this.operationType.equals(otherOperation.getOperationType())) {
      return false;
    }

    // Cannot compose deletion operations
    if (this.operationType.isDeletion()) {
      return false;
    }

    return true;
  }

  private composePayloads(payload1: unknown, payload2: unknown): unknown {
    if (
      typeof payload1 === 'object' &&
      typeof payload2 === 'object' &&
      payload1 !== null &&
      payload2 !== null
    ) {
      const obj1 = payload1 as Record<string, unknown>;
      const obj2 = payload2 as Record<string, unknown>;

      // For CREATE_STATEMENT operations, concatenate content
      if (
        this.operationType.getValue() === 'CREATE_STATEMENT' &&
        'content' in obj1 &&
        'content' in obj2
      ) {
        return {
          ...obj1,
          content: (obj1.content as string) + (obj2.content as string),
        };
      }

      return { ...obj1, ...obj2 };
    }

    return payload2; // Use the second payload if can't merge
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id.getValue(),
      deviceId: this.deviceId.getValue(),
      operationType: this.operationType.getValue(),
      targetPath: this.targetPath,
      payload: this.payload.getData(),
      vectorClock: this.vectorClock.getClockState(),
      timestamp: this.timestamp.getTimestamp(),
      ...(this.parentOperationId && { parentOperationId: this.parentOperationId.getValue() }),
    };
  }

  static fromJSON(
    json: Record<string, unknown>,
    transformationService?: IOperationTransformationService,
    complexityAnalyzer?: IOperationComplexityAnalyzer,
  ): Result<Operation, Error> {
    try {
      // Extract and validate required fields
      const id = json.id as string;
      const deviceId = json.deviceId as string;
      const operationType = json.operationType as string;
      const targetPath = json.targetPath as string;
      const payload = json.payload as Record<string, unknown>;
      const vectorClockData = json.vectorClock as Map<string, number> | Record<string, number>;
      const parentOperationId = json.parentOperationId as string | undefined;

      if (!id || !deviceId || !operationType || !targetPath || !payload || !vectorClockData) {
        return err(new Error('Missing required fields in JSON'));
      }

      // Create value objects
      const deviceIdResult = DeviceId.create(deviceId);
      if (deviceIdResult.isErr()) {
        return err(deviceIdResult.error);
      }

      const operationTypeResult = OperationType.create(operationType as OperationTypeValue);
      if (operationTypeResult.isErr()) {
        return err(operationTypeResult.error);
      }

      const operationIdResult = OperationId.create(id);
      if (operationIdResult.isErr()) {
        return err(operationIdResult.error);
      }

      const payloadResult = OperationPayload.create(payload, operationTypeResult.value);
      if (payloadResult.isErr()) {
        return err(payloadResult.error);
      }

      // Handle both Map and object formats for vectorClock
      let vectorClockMap: Map<string, number>;
      if (vectorClockData instanceof Map) {
        vectorClockMap = vectorClockData;
      } else {
        vectorClockMap = new Map(Object.entries(vectorClockData));
      }

      const vectorClockResult = VectorClock.fromMap(vectorClockMap);
      if (vectorClockResult.isErr()) {
        return err(vectorClockResult.error);
      }

      let parentOpId: OperationId | undefined;
      if (parentOperationId) {
        const parentOpIdResult = OperationId.create(parentOperationId);
        if (parentOpIdResult.isErr()) {
          return err(parentOpIdResult.error);
        }
        parentOpId = parentOpIdResult.value;
      }

      return Operation.createWithServices(
        operationIdResult.value,
        deviceIdResult.value,
        operationTypeResult.value,
        targetPath,
        payloadResult.value,
        vectorClockResult.value,
        parentOpId,
        transformationService,
        complexityAnalyzer,
      );
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to deserialize operation'));
    }
  }

  equals(other: IOperation): boolean {
    return this.id.getValue() === other.getId().getValue();
  }
}
