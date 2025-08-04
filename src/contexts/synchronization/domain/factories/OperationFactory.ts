import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import { Operation } from '../entities/Operation';
import type { IOperation } from '../entities/shared-types';
import { VectorClock } from '../entities/VectorClock';
import { DeviceId } from '../value-objects/DeviceId';
import { OperationId } from '../value-objects/OperationId';
import { OperationPayload } from '../value-objects/OperationPayload';
import { OperationType, type OperationTypeValue } from '../value-objects/OperationType';

export interface CreateOperationRequest {
  deviceId: string;
  operationType: OperationTypeValue;
  targetPath: string;
  payload: Record<string, unknown>;
  vectorClock?: Map<string, number>;
  parentOperationId?: string;
}

export interface CloneOperationRequest {
  sourceOperation: IOperation;
  newDeviceId?: string;
  newTargetPath?: string;
  payloadModifications?: Record<string, unknown>;
}

export interface TransformationRequest {
  operation: IOperation;
  newPayload: OperationPayload;
  transformationNote: string;
}

export interface IOperationFactory {
  createOperation(request: CreateOperationRequest): Result<Operation, Error>;
  createFromJSON(json: Record<string, unknown>): Result<Operation, Error>;
  cloneOperation(request: CloneOperationRequest): Result<Operation, Error>;
  createTransformedOperation(request: TransformationRequest): Result<Operation, Error>;
  createNoOpOperation(originalOperation: IOperation, reason: string): Result<Operation, Error>;
  createBatchOperations(requests: CreateOperationRequest[]): Result<Operation[], Error>;
}

@injectable()
export class OperationFactory implements IOperationFactory {
  createOperation(request: CreateOperationRequest): Result<Operation, Error> {
    try {
      // Create value objects
      const deviceIdResult = DeviceId.create(request.deviceId);
      if (deviceIdResult.isErr()) {
        return err(deviceIdResult.error);
      }

      const operationTypeResult = OperationType.create(request.operationType);
      if (operationTypeResult.isErr()) {
        return err(operationTypeResult.error);
      }

      const operationIdResult = OperationId.generateWithUUID(deviceIdResult.value);
      if (operationIdResult.isErr()) {
        return err(operationIdResult.error);
      }

      const payloadResult = OperationPayload.create(request.payload, operationTypeResult.value);
      if (payloadResult.isErr()) {
        return err(payloadResult.error);
      }

      // Create or use provided vector clock
      let vectorClock: VectorClock;
      if (request.vectorClock) {
        const vectorClockResult = VectorClock.fromMap(request.vectorClock);
        if (vectorClockResult.isErr()) {
          return err(vectorClockResult.error);
        }
        vectorClock = vectorClockResult.value;
      } else {
        const vectorClockResult = VectorClock.create();
        if (vectorClockResult.isErr()) {
          return err(vectorClockResult.error);
        }
        vectorClock = vectorClockResult.value;
        const incrementResult = vectorClock.incrementForDevice(deviceIdResult.value);
        if (incrementResult.isErr()) {
          return err(incrementResult.error);
        }
        vectorClock = incrementResult.value;
      }

      // Handle parent operation ID
      let parentOpId: OperationId | undefined;
      if (request.parentOperationId) {
        const parentOpIdResult = OperationId.create(request.parentOperationId);
        if (parentOpIdResult.isErr()) {
          return err(parentOpIdResult.error);
        }
        parentOpId = parentOpIdResult.value;
      }

      // Create the operation
      return Operation.create(
        operationIdResult.value,
        deviceIdResult.value,
        operationTypeResult.value,
        request.targetPath,
        payloadResult.value,
        vectorClock,
        parentOpId,
      );
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create operation'));
    }
  }

  createFromJSON(json: Record<string, unknown>): Result<Operation, Error> {
    try {
      return Operation.fromJSON(json);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Failed to create operation from JSON'),
      );
    }
  }

  cloneOperation(request: CloneOperationRequest): Result<Operation, Error> {
    try {
      const { sourceOperation, newDeviceId, newTargetPath, payloadModifications } = request;

      // Use existing or new device ID
      let deviceId: DeviceId;
      if (newDeviceId) {
        const deviceIdResult = DeviceId.create(newDeviceId);
        if (deviceIdResult.isErr()) {
          return err(deviceIdResult.error);
        }
        deviceId = deviceIdResult.value;
      } else {
        deviceId = sourceOperation.getDeviceId();
      }

      // Generate new operation ID
      const operationIdResult = OperationId.generateWithUUID(deviceId);
      if (operationIdResult.isErr()) {
        return err(operationIdResult.error);
      }

      // Use existing or new target path
      const targetPath = newTargetPath || sourceOperation.getTargetPath();

      // Modify payload if requested
      let payload: OperationPayload;
      if (payloadModifications) {
        const originalData = sourceOperation.getPayload().getData();
        const modifiedData = {
          ...(typeof originalData === 'object' && originalData !== null ? originalData : {}),
          ...payloadModifications,
        };
        const payloadResult = OperationPayload.create(
          modifiedData as Record<string, unknown>,
          sourceOperation.getOperationType(),
        );
        if (payloadResult.isErr()) {
          return err(payloadResult.error);
        }
        payload = payloadResult.value;
      } else {
        payload = sourceOperation.getPayload();
      }

      // Clone vector clock and increment for new device
      const vectorClockResult = VectorClock.fromMap(
        sourceOperation.getVectorClock().getClockState(),
      );
      if (vectorClockResult.isErr()) {
        return err(vectorClockResult.error);
      }
      let vectorClock = vectorClockResult.value;
      const incrementResult = vectorClock.incrementForDevice(deviceId);
      if (incrementResult.isErr()) {
        return err(incrementResult.error);
      }
      vectorClock = incrementResult.value;

      return Operation.create(
        operationIdResult.value,
        deviceId,
        sourceOperation.getOperationType(),
        targetPath,
        payload,
        vectorClock,
        sourceOperation.getParentOperationId(),
      );
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to clone operation'));
    }
  }

  createTransformedOperation(request: TransformationRequest): Result<Operation, Error> {
    try {
      const { operation, newPayload, transformationNote } = request;

      // Generate new operation ID for the transformed operation
      const newOpIdResult = OperationId.generateWithUUID(operation.getDeviceId());
      if (newOpIdResult.isErr()) {
        return err(newOpIdResult.error);
      }

      // Add transformation metadata to payload
      const payloadData = newPayload.getData();
      const payloadWithMetadata = OperationPayload.create(
        {
          ...(typeof payloadData === 'object' && payloadData !== null ? payloadData : {}),
          transformationApplied: true,
          transformationNote,
          originalOperationId: operation.getId().getValue(),
          transformedAt: new Date().toISOString(),
        } as Record<string, unknown>,
        operation.getOperationType(),
      );

      if (payloadWithMetadata.isErr()) {
        return err(payloadWithMetadata.error);
      }

      return Operation.create(
        newOpIdResult.value,
        operation.getDeviceId(),
        operation.getOperationType(),
        operation.getTargetPath(),
        payloadWithMetadata.value,
        operation.getVectorClock(),
        operation.getParentOperationId(),
      );
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Failed to create transformed operation'),
      );
    }
  }

  createNoOpOperation(originalOperation: IOperation, reason: string): Result<Operation, Error> {
    try {
      const originalData = originalOperation.getPayload().getData();
      const noOpPayload = OperationPayload.create(
        {
          noOp: true,
          reason,
          originalPayload:
            typeof originalData === 'object' && originalData !== null ? originalData : {},
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>,
        originalOperation.getOperationType(),
      );

      if (noOpPayload.isErr()) {
        return err(noOpPayload.error);
      }

      return this.createTransformedOperation({
        operation: originalOperation,
        newPayload: noOpPayload.value,
        transformationNote: `Converted to no-op: ${reason}`,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create no-op operation'));
    }
  }

  createBatchOperations(requests: CreateOperationRequest[]): Result<Operation[], Error> {
    const operations: Operation[] = [];
    const errors: Error[] = [];

    for (const request of requests) {
      const result = this.createOperation(request);
      if (result.isErr()) {
        errors.push(result.error);
      } else {
        operations.push(result.value);
      }
    }

    if (errors.length > 0) {
      const combinedError = new Error(
        `Failed to create ${errors.length} operations: ${errors.map((e) => e.message).join(', ')}`,
      );
      return err(combinedError);
    }

    return ok(operations);
  }

  /**
   * Creates a series of related operations with proper dependency tracking
   */
  createDependentOperations(
    baseRequest: CreateOperationRequest,
    dependentRequests: Omit<CreateOperationRequest, 'parentOperationId'>[],
  ): Result<Operation[], Error> {
    // Create the base operation first
    const baseOpResult = this.createOperation(baseRequest);
    if (baseOpResult.isErr()) {
      return err(baseOpResult.error);
    }

    const baseOp = baseOpResult.value;
    const operations = [baseOp];

    // Create dependent operations
    for (const depRequest of dependentRequests) {
      const fullRequest: CreateOperationRequest = {
        ...depRequest,
        parentOperationId: baseOp.getId().getValue(),
      };

      const depOpResult = this.createOperation(fullRequest);
      if (depOpResult.isErr()) {
        return err(depOpResult.error);
      }

      operations.push(depOpResult.value);
    }

    return ok(operations);
  }

  /**
   * Creates operations for common patterns
   */
  createStatementOperation(
    deviceId: string,
    content: string,
    operationType: 'CREATE_STATEMENT' | 'UPDATE_STATEMENT' | 'DELETE_STATEMENT',
    targetPath: string,
    vectorClock?: Map<string, number>,
  ): Result<Operation, Error> {
    const request: CreateOperationRequest = {
      deviceId,
      operationType,
      targetPath,
      payload: { content },
      vectorClock,
    };

    return this.createOperation(request);
  }

  createArgumentOperation(
    deviceId: string,
    premises: string[],
    conclusions: string[],
    operationType: 'CREATE_ARGUMENT' | 'UPDATE_ARGUMENT' | 'DELETE_ARGUMENT',
    targetPath: string,
    vectorClock?: Map<string, number>,
  ): Result<Operation, Error> {
    const request: CreateOperationRequest = {
      deviceId,
      operationType,
      targetPath,
      payload: { premises, conclusions },
      vectorClock,
    };

    return this.createOperation(request);
  }

  createTreePositionOperation(
    deviceId: string,
    position: { x: number; y: number },
    targetPath: string,
    vectorClock?: Map<string, number>,
  ): Result<Operation, Error> {
    const request: CreateOperationRequest = {
      deviceId,
      operationType: 'UPDATE_TREE_POSITION',
      targetPath,
      payload: position,
      vectorClock,
    };

    return this.createOperation(request);
  }

  createConnectionOperation(
    deviceId: string,
    sourceId: string,
    targetId: string,
    operationType: 'CREATE_CONNECTION' | 'DELETE_CONNECTION',
    targetPath: string,
    vectorClock?: Map<string, number>,
  ): Result<Operation, Error> {
    const request: CreateOperationRequest = {
      deviceId,
      operationType,
      targetPath,
      payload: { sourceId, targetId },
      vectorClock,
    };

    return this.createOperation(request);
  }
}
