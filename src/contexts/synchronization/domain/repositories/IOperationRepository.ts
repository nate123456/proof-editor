import { err, ok, type Result } from 'neverthrow';

import { type RepositoryError } from '../../../../domain/errors/DomainErrors.js';
import { type Operation } from '../entities/Operation';
import { type DeviceId } from '../value-objects/DeviceId';
import { type OperationId } from '../value-objects/OperationId';
import { type OperationType } from '../value-objects/OperationType';

export interface IOperationRepository {
  save(operation: Operation): Promise<Result<void, RepositoryError>>;
  findById(id: OperationId): Promise<Operation | null>;
  findByDeviceId(deviceId: DeviceId): Promise<Operation[]>;
  findByType(type: OperationType): Promise<Operation[]>;
  findPendingOperations(): Promise<Operation[]>;
  findOperationsAfterTimestamp(timestamp: Date): Promise<Operation[]>;
  findAll(): Promise<Operation[]>;
  delete(id: OperationId): Promise<Result<void, RepositoryError>>;
}
