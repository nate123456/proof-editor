import type { Result } from '../../../../domain/shared/result';
import { DeviceId } from '../value-objects/DeviceId';
import { LogicalTimestamp } from '../value-objects/LogicalTimestamp';
import { OperationId } from '../value-objects/OperationId';
import { OperationPayload } from '../value-objects/OperationPayload';
import { OperationType } from '../value-objects/OperationType';
import { ConflictType } from '../value-objects/ConflictType';
import { VectorClockEntity } from './VectorClockEntity';

export class OperationEntity {
  private constructor(
    private readonly id: OperationId,
    private readonly deviceId: DeviceId,
    private readonly operationType: OperationType,
    private readonly targetPath: string,
    private readonly payload: OperationPayload,
    private readonly vectorClock: VectorClockEntity,
    private readonly timestamp: LogicalTimestamp,
    private readonly parentOperationId?: OperationId
  ) {}

  static create(
    id: OperationId,
    deviceId: DeviceId,
    operationType: OperationType,
    targetPath: string,
    payload: OperationPayload,
    vectorClock: VectorClockEntity,
    parentOperationId?: OperationId
  ): Result<OperationEntity, Error> {
    // Operation ID is already validated by OperationId value object

    if (!targetPath.trim()) {
      return { success: false, error: new Error('Target path cannot be empty') };
    }

    const timestampResult = LogicalTimestamp.fromVectorClock(vectorClock);
    if (!timestampResult.success) {
      return timestampResult;
    }

    return {
      success: true,
      data: new OperationEntity(
        id,
        deviceId,
        operationType,
        targetPath,
        payload,
        vectorClock,
        timestampResult.data,
        parentOperationId
      )
    };
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

  getVectorClock(): VectorClockEntity {
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

  canCommutewWith(otherOperation: OperationEntity): boolean {
    if (this.targetPath !== otherOperation.targetPath) {
      return true;
    }

    if (this.isStructuralOperation() && otherOperation.isStructuralOperation()) {
      return this.operationType.canCommuteWith(otherOperation.operationType);
    }

    return false;
  }

  hasCausalDependencyOn(otherOperation: OperationEntity): boolean {
    return this.vectorClock.happensAfter(otherOperation.vectorClock);
  }

  isConcurrentWith(otherOperation: OperationEntity): boolean {
    return this.vectorClock.isConcurrentWith(otherOperation.vectorClock);
  }

  transformWith(otherOperation: OperationEntity): Result<OperationEntity, Error> {
    if (!this.canCommutewWith(otherOperation)) {
      return { success: false, error: new Error('Operations cannot be transformed') };
    }

    if (this.hasCausalDependencyOn(otherOperation)) {
      return { success: true, data: this };
    }

    const transformedPayloadResult = this.payload.transform(otherOperation.payload, 'OPERATIONAL_TRANSFORM');
    if (!transformedPayloadResult.success) {
      return transformedPayloadResult;
    }

    const newOperationIdResult = OperationId.generate(this.deviceId, Date.now());
    if (!newOperationIdResult.success) {
      return newOperationIdResult;
    }

    return OperationEntity.create(
      newOperationIdResult.data,
      this.deviceId,
      this.operationType,
      this.targetPath,
      transformedPayloadResult.data,
      this.vectorClock,
      this.parentOperationId
    );
  }

  applyTo(currentState: unknown): Result<unknown, Error> {
    const validationResult = this.validateApplicationTo(currentState);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      const newState = this.executeOn(currentState);
      return { success: true, data: newState };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Operation execution failed')
      };
    }
  }

  detectConflictWith(otherOperation: OperationEntity): Result<ConflictType | null, Error> {
    if (this.targetPath !== otherOperation.targetPath) {
      return { success: true, data: null };
    }

    if (!this.isConcurrentWith(otherOperation)) {
      return { success: true, data: null };
    }

    const conflictType = this.determineConflictTypeWith(otherOperation);
    return { success: true, data: conflictType };
  }

  transformAgainstOperations(operations: OperationEntity[]): Result<OperationEntity, Error> {
    let transformedOperation: OperationEntity = this;

    for (const againstOp of operations) {
      if (transformedOperation.isConcurrentWith(againstOp)) {
        const transformResult = transformedOperation.transformWith(againstOp);
        if (!transformResult.success) {
          return transformResult;
        }
        transformedOperation = transformResult.data;
      }
    }

    return { success: true, data: transformedOperation };
  }

  private validateApplicationTo(currentState: unknown): Result<void, Error> {
    if (this.operationType.isDeletion() && !this.targetExistsIn(currentState)) {
      return { success: false, error: new Error('Cannot delete non-existent target') };
    }

    if (this.operationType.isUpdate() && !this.targetExistsIn(currentState)) {
      return { success: false, error: new Error('Cannot update non-existent target') };
    }

    if (this.operationType.isCreation() && this.targetExistsIn(currentState)) {
      return { success: false, error: new Error('Cannot create already existing target') };
    }

    return { success: true, data: undefined };
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

  private determineConflictTypeWith(otherOperation: OperationEntity): ConflictType {
    const hasDeletions = this.operationType.isDeletion() || otherOperation.operationType.isDeletion();
    const hasSemanticOperations = this.isSemanticOperation() || otherOperation.isSemanticOperation();
    const hasStructuralOperations = this.isStructuralOperation() || otherOperation.isStructuralOperation();

    if (hasDeletions) {
      const result = ConflictType.deletion();
      if (!result.success) {
        throw new Error('Failed to create deletion conflict type');
      }
      return result.data;
    }

    if (hasSemanticOperations) {
      const result = ConflictType.semantic();
      if (!result.success) {
        throw new Error('Failed to create semantic conflict type');
      }
      return result.data;
    }

    if (hasStructuralOperations) {
      const result = ConflictType.structural();
      if (!result.success) {
        throw new Error('Failed to create structural conflict type');
      }
      return result.data;
    }

    const result = ConflictType.concurrentModification();
    if (!result.success) {
      throw new Error('Failed to create concurrent modification conflict type');
    }
    return result.data;
  }

  private targetExistsIn(state: unknown): boolean {
    return state !== null && state !== undefined;
  }

  private createTargetIn(currentState: unknown): unknown {
    return { ...currentState as Record<string, unknown>, [this.targetPath]: this.payload };
  }

  private updateTargetIn(currentState: unknown): unknown {
    return { ...currentState as Record<string, unknown>, [this.targetPath]: this.payload };
  }

  private deleteTargetFrom(currentState: unknown): unknown {
    const newState = { ...currentState as Record<string, unknown> };
    delete newState[this.targetPath];
    return newState;
  }
}