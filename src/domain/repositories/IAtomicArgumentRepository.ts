import type { AtomicArgument } from '../entities/AtomicArgument';
import type { RepositoryError } from '../errors/DomainErrors';
import type { ComplexityLevel, QueryOptions } from '../shared/repository-types.js';
import type { Result } from '../shared/result.js';
import type {
  AtomicArgumentId,
  OrderedSetId,
  StatementContent,
  StatementId,
  ValidationStatus,
} from '../shared/value-objects.js';

export interface IAtomicArgumentRepository {
  save(argument: AtomicArgument): Promise<Result<void, RepositoryError>>;
  findById(id: AtomicArgumentId): Promise<AtomicArgument | null>;
  findAll(): Promise<AtomicArgument[]>;
  findByOrderedSetReference(orderedSetId: OrderedSetId): Promise<AtomicArgument[]>;
  delete(id: AtomicArgumentId): Promise<Result<void, RepositoryError>>;

  findArgumentsByPremiseCount(count: number, options?: QueryOptions): Promise<AtomicArgument[]>;
  findArgumentsUsingStatement(
    statementId: StatementId,
    options?: QueryOptions,
  ): Promise<AtomicArgument[]>;
  findArgumentsByComplexity(
    complexity: ComplexityLevel,
    options?: QueryOptions,
  ): Promise<AtomicArgument[]>;
  findArgumentsWithConclusion(
    conclusion: StatementContent,
    options?: QueryOptions,
  ): Promise<AtomicArgument[]>;
  findArgumentChains(
    startArgumentId: AtomicArgumentId,
    maxDepth?: number,
  ): Promise<AtomicArgument[]>;
  findCircularDependencies(): Promise<AtomicArgument[][]>;
  findArgumentsByValidationStatus(
    status: ValidationStatus,
    options?: QueryOptions,
  ): Promise<AtomicArgument[]>;
  findMostReferencedArguments(options?: QueryOptions): Promise<AtomicArgument[]>;
  findOrphanedArguments(options?: QueryOptions): Promise<AtomicArgument[]>;
}
