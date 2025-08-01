import type { Result } from 'neverthrow';
import type { Statement } from '../entities/Statement.js';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { LogicalStructureType } from '../shared/repository-types.js';
import { CompositeSpecification, QuerySpecification } from './CompositeSpecification.js';
import type { ISpecificationRepository } from './ISpecification.js';

/**
 * Specification for statements with specific content.
 */
export class StatementContentSpecification extends CompositeSpecification<Statement> {
  constructor(private readonly expectedContent: string) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    return statement.getContent() === this.expectedContent;
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Expected content "${this.expectedContent}", but got "${statement.getContent()}"`;
  }
}

/**
 * Specification for statements matching a pattern.
 */
export class StatementPatternSpecification extends CompositeSpecification<Statement> {
  constructor(
    private readonly pattern: RegExp,
    private readonly caseSensitive = false,
    private readonly wholeWords = false,
  ) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    const content = statement.getContent();
    let regex = this.pattern;

    if (!this.caseSensitive) {
      regex = new RegExp(this.pattern.source, `${this.pattern.flags}i`);
    }

    if (this.wholeWords) {
      regex = new RegExp(`\\b${regex.source}\\b`, regex.flags);
    }

    return regex.test(content);
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Content "${statement.getContent()}" does not match pattern ${this.pattern}`;
  }
}

/**
 * Specification for statements with specific logical structure.
 */
export class StatementLogicalStructureSpecification extends CompositeSpecification<Statement> {
  constructor(private readonly structureType: LogicalStructureType) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    const content = statement.getContent();

    switch (this.structureType) {
      case 'conditional':
        return /\b(if|implies?|→|⊃)\b/i.test(content);
      case 'biconditional':
        return /\b(if and only if|iff|↔|⊅)\b/i.test(content);
      case 'conjunction':
        return /\b(and|∧|&)\b/i.test(content);
      case 'disjunction':
        return /\b(or|∨|\|)\b/i.test(content);
      case 'negation':
        return /\b(not|¬|~)\b/i.test(content);
      case 'quantified':
        return /\b(all|every|some|exists|∀|∃)\b/i.test(content);
      default:
        return false;
    }
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Statement does not have logical structure type: ${this.structureType}`;
  }
}

/**
 * Specification for statements with minimum usage count.
 */
export class StatementUsageSpecification extends CompositeSpecification<Statement> {
  constructor(private readonly minUsage: number) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    return statement.getUsageCount() >= this.minUsage;
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Usage count ${statement.getUsageCount()} is below minimum ${this.minUsage}`;
  }
}

/**
 * Specification for statements containing specific keywords.
 */
export class StatementKeywordSpecification extends CompositeSpecification<Statement> {
  constructor(private readonly keywords: string[]) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    const content = statement.getContent().toLowerCase();
    return this.keywords.some((keyword) => content.includes(keyword.toLowerCase()));
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Statement does not contain any of the keywords: ${this.keywords.join(', ')}`;
  }
}

/**
 * Specification for statements created within a date range.
 */
export class StatementDateRangeSpecification extends CompositeSpecification<Statement> {
  constructor(
    private readonly fromDate: Date,
    private readonly toDate: Date,
  ) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    const createdAt = new Date(statement.getCreatedAt());
    return createdAt >= this.fromDate && createdAt <= this.toDate;
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Statement created at ${new Date(statement.getCreatedAt())} is outside date range`;
  }
}

/**
 * Specification for unused statements.
 */
export class UnusedStatementSpecification extends CompositeSpecification<Statement> {
  isSatisfiedBy(statement: Statement): boolean {
    return !statement.isInUse();
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement)
      ? null
      : `Statement is in use with count ${statement.getUsageCount()}`;
  }
}

/**
 * Specification for statements with content.
 */
export class StatementHasContentSpecification extends CompositeSpecification<Statement> {
  isSatisfiedBy(statement: Statement): boolean {
    return statement.hasContent();
  }

  reasonForDissatisfaction(statement: Statement): string | null {
    return this.isSatisfiedBy(statement) ? null : 'Statement has no content';
  }
}

/**
 * Query specification for finding statements by pattern.
 */
export class StatementPatternQuerySpecification extends QuerySpecification<Statement> {
  constructor(
    private readonly pattern: RegExp,
    private readonly caseSensitive = false,
    private readonly wholeWords = false,
  ) {
    super();
  }

  isSatisfiedBy(statement: Statement): boolean {
    return new StatementPatternSpecification(
      this.pattern,
      this.caseSensitive,
      this.wholeWords,
    ).isSatisfiedBy(statement);
  }

  async executeQuery(
    repository: ISpecificationRepository<Statement>,
  ): Promise<Result<Statement[], RepositoryError>> {
    return repository.findBySpecification(this);
  }
}
