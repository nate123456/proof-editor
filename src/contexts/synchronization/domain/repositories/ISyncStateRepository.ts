import { type Result } from 'neverthrow';

import { type RepositoryError } from '../../../../domain/errors/DomainErrors.js';
import { type SyncState } from '../entities/SyncState';
import { type DeviceId } from '../value-objects/DeviceId';

export interface ISyncStateRepository {
  save(syncState: SyncState): Promise<Result<void, RepositoryError>>;
  findByDeviceId(deviceId: DeviceId): Promise<SyncState | null>;
  findConflictingStates(): Promise<SyncState[]>;
  findOfflineStates(): Promise<SyncState[]>;
  findAll(): Promise<SyncState[]>;
  delete(deviceId: DeviceId): Promise<Result<void, RepositoryError>>;
}
