import { type AtomicArgument } from '../entities/AtomicArgument';
import { type RepositoryError } from '../errors/DomainErrors';
import { type Result } from '../shared/result.js';
import { type AtomicArgumentId, type OrderedSetId } from '../shared/value-objects.js';

export interface IAtomicArgumentRepository {
  save(argument: AtomicArgument): Promise<Result<void, RepositoryError>>;
  findById(id: AtomicArgumentId): Promise<AtomicArgument | null>;
  findAll(): Promise<AtomicArgument[]>;
  findByOrderedSetReference(orderedSetId: OrderedSetId): Promise<AtomicArgument[]>;
  delete(id: AtomicArgumentId): Promise<Result<void, RepositoryError>>;
}
