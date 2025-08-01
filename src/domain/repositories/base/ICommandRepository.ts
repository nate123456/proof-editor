import type { Result } from 'neverthrow';
import type { RepositoryError } from '../../errors/DomainErrors.js';

export interface ICommandRepository<TEntity, TId> {
  save(entity: TEntity): Promise<Result<void, RepositoryError>>;
  delete(id: TId): Promise<Result<void, RepositoryError>>;
}
