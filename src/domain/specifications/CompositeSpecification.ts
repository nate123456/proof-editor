import type { Result } from 'neverthrow';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type {
  IQuerySpecification,
  ISpecification,
  ISpecificationRepository,
} from './ISpecification.js';

/**
 * Abstract base class for specifications that provides composition methods.
 */
export abstract class CompositeSpecification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(entity: T): boolean;

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  reasonForDissatisfaction?(entity: T): string | null {
    return this.isSatisfiedBy(entity) ? null : 'Specification not satisfied';
  }
}

/**
 * Logical AND specification.
 */
export class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }

  reasonForDissatisfaction(entity: T): string | null {
    const leftReason = this.left.reasonForDissatisfaction?.(entity);
    const rightReason = this.right.reasonForDissatisfaction?.(entity);

    if (leftReason && rightReason) {
      return `Both conditions failed: ${leftReason} AND ${rightReason}`;
    }
    return leftReason || rightReason;
  }
}

/**
 * Logical OR specification.
 */
export class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }

  reasonForDissatisfaction(entity: T): string | null {
    if (this.isSatisfiedBy(entity)) {
      return null;
    }

    const leftReason = this.left.reasonForDissatisfaction?.(entity);
    const rightReason = this.right.reasonForDissatisfaction?.(entity);

    return `Neither condition satisfied: ${leftReason} OR ${rightReason}`;
  }
}

/**
 * Logical NOT specification.
 */
export class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private readonly specification: ISpecification<T>) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return !this.specification.isSatisfiedBy(entity);
  }

  reasonForDissatisfaction(entity: T): string | null {
    return this.isSatisfiedBy(entity) ? null : 'Negated condition was satisfied';
  }
}

/**
 * Base class for query specifications that can be executed against repositories.
 */
export abstract class QuerySpecification<T>
  extends CompositeSpecification<T>
  implements IQuerySpecification<T>
{
  abstract executeQuery(
    repository: ISpecificationRepository<T>,
  ): Promise<Result<T[], RepositoryError>>;
}
