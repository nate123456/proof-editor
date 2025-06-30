import { AtomicArgumentEntity } from '../entities/AtomicArgumentEntity';
import { AtomicArgumentId, OrderedSetId } from '../shared/value-objects.js';
import type { Result } from '../shared/result.js';
import { RepositoryError } from '../errors/DomainErrors';

export interface IAtomicArgumentRepository {
  save(argument: AtomicArgumentEntity): Promise<Result<void, RepositoryError>>;
  findById(id: AtomicArgumentId): Promise<AtomicArgumentEntity | null>;
  findAll(): Promise<AtomicArgumentEntity[]>;
  findByOrderedSetReference(orderedSetId: OrderedSetId): Promise<AtomicArgumentEntity[]>;
  delete(id: AtomicArgumentId): Promise<Result<void, RepositoryError>>;
}