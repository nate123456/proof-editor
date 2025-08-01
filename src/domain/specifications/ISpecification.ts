import type { Result } from 'neverthrow';
import type { RepositoryError } from '../errors/DomainErrors.js';

/**
 * Base specification interface for encapsulating business rules as objects.
 * Specifications can be composed and reused across the domain.
 */
export interface ISpecification<T> {
  /**
   * Determines if the specification is satisfied by the given entity.
   */
  isSatisfiedBy(entity: T): boolean;

  /**
   * Combines this specification with another using logical AND.
   */
  and(other: ISpecification<T>): ISpecification<T>;

  /**
   * Combines this specification with another using logical OR.
   */
  or(other: ISpecification<T>): ISpecification<T>;

  /**
   * Negates this specification.
   */
  not(): ISpecification<T>;

  /**
   * Optional: Returns reason why specification is not satisfied.
   */
  reasonForDissatisfaction?(entity: T): string | null;
}

/**
 * Query specification interface for repository queries.
 * Extends base specification with query execution capabilities.
 */
export interface IQuerySpecification<T> extends ISpecification<T> {
  /**
   * Executes the specification as a query against a repository.
   */
  executeQuery(repository: ISpecificationRepository<T>): Promise<Result<T[], RepositoryError>>;
}

/**
 * Repository interface that supports specification-based queries.
 */
export interface ISpecificationRepository<T> {
  /**
   * Finds entities that satisfy the given specification.
   */
  findBySpecification(specification: ISpecification<T>): Promise<Result<T[], RepositoryError>>;

  /**
   * Counts entities that satisfy the given specification.
   */
  countBySpecification(specification: ISpecification<T>): Promise<Result<number, RepositoryError>>;

  /**
   * Checks if any entity satisfies the given specification.
   */
  existsBySpecification(
    specification: ISpecification<T>,
  ): Promise<Result<boolean, RepositoryError>>;
}
