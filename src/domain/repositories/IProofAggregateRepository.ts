import type { Result } from 'neverthrow';

import type { ProofAggregate } from '../aggregates/ProofAggregate.js';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { ProofId } from '../shared/value-objects/index.js';

export interface IProofAggregateRepository {
  save(aggregate: ProofAggregate): Promise<Result<void, RepositoryError>>;

  findById(id: ProofId): Promise<Result<ProofAggregate, RepositoryError>>;

  findAll(): Promise<Result<ProofAggregate[], RepositoryError>>;

  delete(id: ProofId): Promise<Result<void, RepositoryError>>;

  exists(id: ProofId): Promise<Result<boolean, RepositoryError>>;

  count(): Promise<Result<number, RepositoryError>>;
}
