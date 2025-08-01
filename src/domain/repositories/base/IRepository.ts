import type { Result } from 'neverthrow';
import type { RepositoryError } from '../../errors/DomainErrors.js';

export interface IRepository<TEntity, TId> {
  findById(id: TId): Promise<Result<TEntity, RepositoryError>>;
  findAll(): Promise<Result<TEntity[], RepositoryError>>;
  exists(id: TId): Promise<Result<boolean, RepositoryError>>;
}
