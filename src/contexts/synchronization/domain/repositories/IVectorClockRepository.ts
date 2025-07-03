import type { Result } from 'neverthrow';

import type { RepositoryError } from '../../../../domain/errors/DomainErrors.js';
import type { VectorClock } from '../entities/VectorClock';
import type { DeviceId } from '../value-objects/DeviceId';

export interface IVectorClockRepository {
  save(vectorClock: VectorClock): Promise<Result<void, RepositoryError>>;
  findByDeviceId(deviceId: DeviceId): Promise<VectorClock | null>;
  findLatestClocks(): Promise<VectorClock[]>;
  findAll(): Promise<VectorClock[]>;
  delete(deviceId: DeviceId): Promise<Result<void, RepositoryError>>;
}
