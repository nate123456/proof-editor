import type { Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { ComplexityLevel } from '../shared/repository-types.js';
import type { StatementId } from '../shared/value-objects/index.js';
import { CompositeSpecification, QuerySpecification } from './CompositeSpecification.js';
import type { ISpecificationRepository } from './ISpecification.js';

/**
 * Specification for atomic arguments with specific premise count.
 */
export class AtomicArgumentPremiseCountSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(private readonly expectedCount: number) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    return argument.getPremiseCount() === this.expectedCount;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Expected ${this.expectedCount} premises, but got ${argument.getPremiseCount()}`;
  }
}

/**
 * Specification for atomic arguments with specific conclusion count.
 */
export class AtomicArgumentConclusionCountSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(private readonly expectedCount: number) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    return argument.getConclusionCount() === this.expectedCount;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Expected ${this.expectedCount} conclusions, but got ${argument.getConclusionCount()}`;
  }
}

/**
 * Specification for atomic arguments that reference a specific statement.
 */
export class AtomicArgumentReferencesStatementSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(private readonly statementId: StatementId) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    const premises = argument.getPremises();
    const conclusions = argument.getConclusions();

    return [...premises, ...conclusions].some((statement) =>
      statement.getId().equals(this.statementId),
    );
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Argument does not reference statement with ID ${this.statementId.toString()}`;
  }
}

/**
 * Specification for atomic arguments that use a specific statement as premise.
 */
export class AtomicArgumentUsesPremiseSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(private readonly statementId: StatementId) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    return argument.getPremises().some((statement) => statement.getId().equals(this.statementId));
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Argument does not use statement ${this.statementId.toString()} as premise`;
  }
}

/**
 * Specification for atomic arguments that have a specific conclusion.
 */
export class AtomicArgumentHasConclusionSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(private readonly conclusionContent: string) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    return argument
      .getConclusions()
      .some((statement) => statement.getContent() === this.conclusionContent);
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Argument does not have conclusion with content "${this.conclusionContent}"`;
  }
}

/**
 * Specification for atomic arguments with specific complexity level.
 */
export class AtomicArgumentComplexitySpecification extends CompositeSpecification<AtomicArgument> {
  constructor(private readonly complexityLevel: ComplexityLevel) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    const complexity = this.calculateComplexity(argument);
    return complexity === this.complexityLevel;
  }

  private calculateComplexity(argument: AtomicArgument): ComplexityLevel {
    const totalStatements = argument.getPremiseCount() + argument.getConclusionCount();
    const hasLabels = Object.keys(argument.getSideLabels()).length > 0;

    if (totalStatements <= 2 && !hasLabels) return 'simple';
    if (totalStatements <= 4 && !hasLabels) return 'moderate';
    if (totalStatements <= 6 || hasLabels) return 'complex';
    return 'expert';
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Argument complexity is ${this.calculateComplexity(argument)}, expected ${this.complexityLevel}`;
  }
}

/**
 * Specification for atomic arguments created within a date range.
 */
export class AtomicArgumentDateRangeSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(
    private readonly fromDate: Date,
    private readonly toDate: Date,
  ) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    const createdAt = new Date(argument.getCreatedAt());
    return createdAt >= this.fromDate && createdAt <= this.toDate;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Argument created at ${new Date(argument.getCreatedAt())} is outside date range`;
  }
}

/**
 * Specification for atomic arguments with side labels.
 */
export class AtomicArgumentHasLabelsSpecification extends CompositeSpecification<AtomicArgument> {
  isSatisfiedBy(argument: AtomicArgument): boolean {
    const labels = argument.getSideLabels();
    return labels.left !== undefined || labels.right !== undefined;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument) ? null : 'Argument has no side labels';
  }
}

/**
 * Specification for atomic arguments with specific side label.
 */
export class AtomicArgumentHasSpecificLabelSpecification extends CompositeSpecification<AtomicArgument> {
  constructor(
    private readonly labelText: string,
    private readonly side: 'left' | 'right',
  ) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    const labels = argument.getSideLabels();
    return labels[this.side] === this.labelText;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument)
      ? null
      : `Argument does not have "${this.labelText}" on ${this.side} side`;
  }
}

/**
 * Specification for empty atomic arguments (bootstrap state).
 */
export class EmptyAtomicArgumentSpecification extends CompositeSpecification<AtomicArgument> {
  isSatisfiedBy(argument: AtomicArgument): boolean {
    return argument.getPremiseCount() === 0 && argument.getConclusionCount() === 0;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    return this.isSatisfiedBy(argument) ? null : 'Argument is not empty';
  }
}

/**
 * Specification for complete atomic arguments (has both premises and conclusions).
 */
export class CompleteAtomicArgumentSpecification extends CompositeSpecification<AtomicArgument> {
  isSatisfiedBy(argument: AtomicArgument): boolean {
    return argument.getPremiseCount() > 0 && argument.getConclusionCount() > 0;
  }

  reasonForDissatisfaction(argument: AtomicArgument): string | null {
    if (this.isSatisfiedBy(argument)) return null;

    if (argument.getPremiseCount() === 0) {
      return 'Argument has no premises';
    }
    if (argument.getConclusionCount() === 0) {
      return 'Argument has no conclusions';
    }
    return 'Argument is incomplete';
  }
}

/**
 * Query specification for finding atomic arguments by statement reference.
 */
export class AtomicArgumentByStatementQuerySpecification extends QuerySpecification<AtomicArgument> {
  constructor(private readonly statementId: StatementId) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    return new AtomicArgumentReferencesStatementSpecification(this.statementId).isSatisfiedBy(
      argument,
    );
  }

  async executeQuery(
    repository: ISpecificationRepository<AtomicArgument>,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return repository.findBySpecification(this);
  }
}

/**
 * Query specification for finding atomic arguments by complexity level.
 */
export class AtomicArgumentByComplexityQuerySpecification extends QuerySpecification<AtomicArgument> {
  constructor(private readonly complexityLevel: ComplexityLevel) {
    super();
  }

  isSatisfiedBy(argument: AtomicArgument): boolean {
    return new AtomicArgumentComplexitySpecification(this.complexityLevel).isSatisfiedBy(argument);
  }

  async executeQuery(
    repository: ISpecificationRepository<AtomicArgument>,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    return repository.findBySpecification(this);
  }
}
