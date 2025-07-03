import type { Result } from 'neverthrow';

import type { RepositoryError } from '../../../../domain/errors/DomainErrors.js';
import type { Conflict } from '../entities/Conflict';
import type { ConflictType } from '../value-objects/ConflictType';
import type { DeviceId } from '../value-objects/DeviceId';

export interface IConflictRepository {
  save(conflict: Conflict): Promise<Result<void, RepositoryError>>;
  findById(id: string): Promise<Conflict | null>;
  findByDeviceId(deviceId: DeviceId): Promise<Conflict[]>;
  findByType(type: ConflictType): Promise<Conflict[]>;
  findUnresolvedConflicts(): Promise<Conflict[]>;
  findAll(): Promise<Conflict[]>;
  delete(id: string): Promise<Result<void, RepositoryError>>;
}
