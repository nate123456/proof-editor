import type { Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { ComplexityLevel, QueryOptions } from '../shared/repository-types.js';
import type {
  AtomicArgumentId,
  PremiseCount,
  SearchDepth,
  StatementContent,
  StatementId,
  ValidationStatus,
} from '../shared/value-objects/index.js';
import type { ISpecificationRepository } from '../specifications/ISpecification.js';
import type { IAdvancedQueryRepository } from './base/index.js';

export interface IAtomicArgumentQueryRepository
  extends IAdvancedQueryRepository<AtomicArgument, AtomicArgumentId>,
    ISpecificationRepository<AtomicArgument> {
  findByStatementReference(
    statementId: StatementId,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findArgumentsByPremiseCount(
    count: PremiseCount,
    options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findArgumentsUsingStatement(
    statementId: StatementId,
    options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findArgumentsByComplexity(
    complexity: ComplexityLevel,
    options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findArgumentsWithConclusion(
    conclusion: StatementContent,
    options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findArgumentsByValidationStatus(
    status: ValidationStatus,
    options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findArgumentChains(
    startArgumentId: AtomicArgumentId,
    maxDepth?: SearchDepth,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findCircularDependencies(): Promise<Result<AtomicArgument[][], RepositoryError>>;
  findMostReferencedArguments(
    options?: QueryOptions,
  ): Promise<Result<AtomicArgument[], RepositoryError>>;
  findOrphanedArguments(options?: QueryOptions): Promise<Result<AtomicArgument[], RepositoryError>>;
}
