import type { Result } from 'neverthrow';
import type { RepositoryError } from '../../errors/DomainErrors.js';
import type { QueryOptions } from '../../shared/repository-types.js';

export interface IQueryRepository<TEntity, TId> {
  findById(id: TId): Promise<Result<TEntity, RepositoryError>>;
  findAll(): Promise<Result<TEntity[], RepositoryError>>;
  count(): Promise<Result<number, RepositoryError>>;
}

export interface IAdvancedQueryRepository<TEntity, TId> extends IQueryRepository<TEntity, TId> {
  findWithOptions(options: QueryOptions): Promise<Result<TEntity[], RepositoryError>>;
  findByDateRange(from: Date, to: Date): Promise<Result<TEntity[], RepositoryError>>;
}
