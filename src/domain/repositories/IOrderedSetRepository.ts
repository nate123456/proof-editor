import type { OrderedSet } from '../entities/OrderedSet';
import type { RepositoryError } from '../errors/DomainErrors';
import type { QueryOptions } from '../shared/repository-types.js';
import type { Result } from '../shared/result.js';
import type { OrderedSetId, StatementId } from '../shared/value-objects.js';

export interface IOrderedSetRepository {
  save(orderedSet: OrderedSet): Promise<Result<void, RepositoryError>>;
  findById(id: OrderedSetId): Promise<OrderedSet | null>;
  findAll(): Promise<OrderedSet[]>;
  delete(id: OrderedSetId): Promise<Result<void, RepositoryError>>;

  findOrderedSetsBySize(size: number, options?: QueryOptions): Promise<OrderedSet[]>;
  findOrderedSetsContaining(
    statementId: StatementId,
    options?: QueryOptions,
  ): Promise<OrderedSet[]>;
  findSharedOrderedSets(minSharedCount?: number, options?: QueryOptions): Promise<OrderedSet[]>;
  findOrderedSetsByPattern(
    pattern: string[],
    exactMatch?: boolean,
    options?: QueryOptions,
  ): Promise<OrderedSet[]>;
  findUnusedOrderedSets(options?: QueryOptions): Promise<OrderedSet[]>;
  findOrderedSetsByReferenceCount(
    minReferences: number,
    options?: QueryOptions,
  ): Promise<OrderedSet[]>;
  findSimilarOrderedSets(
    orderedSetId: OrderedSetId,
    similarityThreshold?: number,
    options?: QueryOptions,
  ): Promise<OrderedSet[]>;
  findEmptyOrderedSets(options?: QueryOptions): Promise<OrderedSet[]>;
}
