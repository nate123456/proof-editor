import type { Result } from 'neverthrow';

import type { ProofTreeAggregate } from '../aggregates/ProofTreeAggregate.js';
import type { ProofId, ProofTreeId } from '../shared/value-objects.js';

export interface RepositoryError extends Error {
  name: 'RepositoryError';
  code: string;
  cause?: Error;
}

export interface IProofTreeAggregateRepository {
  save(aggregate: ProofTreeAggregate): Promise<Result<void, RepositoryError>>;

  findById(id: ProofTreeId): Promise<ProofTreeAggregate | null>;

  findByProofId(proofId: ProofId): Promise<ProofTreeAggregate[]>;

  findAll(): Promise<ProofTreeAggregate[]>;

  delete(id: ProofTreeId): Promise<Result<void, RepositoryError>>;

  exists(id: ProofTreeId): Promise<boolean>;

  count(): Promise<number>;
}
