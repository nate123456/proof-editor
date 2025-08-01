import type { Result } from 'neverthrow';

import type { ProofTreeAggregate } from '../aggregates/ProofTreeAggregate.js';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { ProofId, ProofTreeId } from '../shared/value-objects/index.js';

export interface IProofTreeAggregateRepository {
  save(aggregate: ProofTreeAggregate): Promise<Result<void, RepositoryError>>;

  findById(id: ProofTreeId): Promise<Result<ProofTreeAggregate, RepositoryError>>;

  findByProofId(proofId: ProofId): Promise<Result<ProofTreeAggregate[], RepositoryError>>;

  findAll(): Promise<Result<ProofTreeAggregate[], RepositoryError>>;

  delete(id: ProofTreeId): Promise<Result<void, RepositoryError>>;

  exists(id: ProofTreeId): Promise<Result<boolean, RepositoryError>>;

  count(): Promise<Result<number, RepositoryError>>;
}
