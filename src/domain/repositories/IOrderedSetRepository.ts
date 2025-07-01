import { type OrderedSet } from '../entities/OrderedSet';
import { type RepositoryError } from '../errors/DomainErrors';
import { type Result } from '../shared/result.js';
import { type OrderedSetId } from '../shared/value-objects.js';

export interface IOrderedSetRepository {
  save(orderedSet: OrderedSet): Promise<Result<void, RepositoryError>>;
  findById(id: OrderedSetId): Promise<OrderedSet | null>;
  findAll(): Promise<OrderedSet[]>;
  delete(id: OrderedSetId): Promise<Result<void, RepositoryError>>;
}
