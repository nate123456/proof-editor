import type { Result } from 'neverthrow';

import type { ProofAggregate } from '../aggregates/ProofAggregate.js';
import type { ProofId } from '../shared/value-objects.js';

export interface RepositoryError extends Error {
  name: 'RepositoryError';
  code: string;
  cause?: Error;
}

export interface IProofAggregateRepository {
  save(aggregate: ProofAggregate): Promise<Result<void, RepositoryError>>;

  findById(id: ProofId): Promise<ProofAggregate | null>;

  findAll(): Promise<ProofAggregate[]>;

  delete(id: ProofId): Promise<Result<void, RepositoryError>>;

  exists(id: ProofId): Promise<boolean>;

  count(): Promise<number>;
}
