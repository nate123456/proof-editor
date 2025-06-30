import { OrderedSetEntity } from '../entities/OrderedSetEntity';
import { OrderedSetId } from '../shared/value-objects.js';
import type { Result } from '../shared/result.js';
import { RepositoryError } from '../errors/DomainErrors';

export interface IOrderedSetRepository {
  save(orderedSet: OrderedSetEntity): Promise<Result<void, RepositoryError>>;
  findById(id: OrderedSetId): Promise<OrderedSetEntity | null>;
  findAll(): Promise<OrderedSetEntity[]>;
  delete(id: OrderedSetId): Promise<Result<void, RepositoryError>>;
}