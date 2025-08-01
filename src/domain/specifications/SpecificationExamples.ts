import type { Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { Statement } from '../entities/Statement.js';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { IAtomicArgumentQueryRepository } from '../repositories/IAtomicArgumentQueryRepository.js';
import type { IStatementQueryRepository } from '../repositories/IStatementQueryRepository.js';
import type { LogicalStructureType } from '../shared/repository-types.js';
import type { StatementId } from '../shared/value-objects/index.js';
import {
  AtomicArgumentComplexitySpecification,
  AtomicArgumentPremiseCountSpecification,
  AtomicArgumentReferencesStatementSpecification,
  CompleteAtomicArgumentSpecification,
  StatementKeywordSpecification,
  StatementLogicalStructureSpecification,
  StatementPatternSpecification,
  StatementUsageSpecification,
  UnusedStatementSpecification,
} from './index.js';

/**
 * Example service demonstrating how to use specifications instead of primitive queries.
 * This shows how business logic moves from repositories to specifications.
 */
export class SpecificationExampleService {
  constructor(
    private readonly statementRepo: IStatementQueryRepository,
    private readonly argumentRepo: IAtomicArgumentQueryRepository,
  ) {}

  /**
   * Find statements containing logical operators using specifications.
   * OLD WAY: repository.findByLogicalStructure('conditional')
   * NEW WAY: Composable specifications with business logic
   */
  async findLogicalStatements(
    structureType: LogicalStructureType,
    minUsage = 0,
  ): Promise<Result<Statement[], RepositoryError>> {
    const logicalStructureSpec = new StatementLogicalStructureSpecification(structureType);
    const usageSpec = new StatementUsageSpecification(minUsage);

    // Compose specifications using business logic
    const composedSpec = logicalStructureSpec.and(usageSpec);

    return this.statementRepo.findBySpecification(composedSpec);
  }

  /**
   * Find complex statements by pattern and keywords.
   * Shows how multiple criteria can be combined using specifications.
   */
  async findComplexStatements(
    pattern: RegExp,
    keywords: string[],
    excludeUnused = true,
  ): Promise<Result<Statement[], RepositoryError>> {
    const patternSpec = new StatementPatternSpecification(pattern);
    const keywordSpec = new StatementKeywordSpecification(keywords);
    let spec = patternSpec.and(keywordSpec);

    if (excludeUnused) {
      const unusedSpec = new UnusedStatementSpecification();
      spec = spec.and(unusedSpec.not()); // NOT unused = used
    }

    return this.statementRepo.findBySpecification(spec);
  }

  /**
   * Find arguments that are both complete and reference a specific statement.
   * Shows how domain concepts are encapsulated in specifications.
   */
  async findCompleteArgumentsUsingStatement(
    statementId: StatementId,
  ): Promise<Result<AtomicArgument[], RepositoryError>> {
    const completeSpec = new CompleteAtomicArgumentSpecification();
    const referencesSpec = new AtomicArgumentReferencesStatementSpecification(statementId);

    const composedSpec = completeSpec.and(referencesSpec);

    return this.argumentRepo.findBySpecification(composedSpec);
  }

  /**
   * Find arguments matching complex business criteria.
   * Shows how business rules are expressed through specifications.
   */
  async findArgumentsForAnalysis(): Promise<Result<AtomicArgument[], RepositoryError>> {
    // Business rule: "Arguments suitable for analysis are complete,
    // have moderate complexity, and have at least 2 premises"
    const completeSpec = new CompleteAtomicArgumentSpecification();
    const complexitySpec = new AtomicArgumentComplexitySpecification('moderate');
    const premiseCountSpec = new AtomicArgumentPremiseCountSpecification(2);

    const analysisSpec = completeSpec.and(complexitySpec).and(premiseCountSpec);

    return this.argumentRepo.findBySpecification(analysisSpec);
  }

  /**
   * Advanced composition: Find arguments that are either simple OR (complex AND complete).
   * Shows how complex business logic can be expressed through specification composition.
   */
  async findArgumentsForDisplay(): Promise<Result<AtomicArgument[], RepositoryError>> {
    const simpleSpec = new AtomicArgumentComplexitySpecification('simple');
    const complexSpec = new AtomicArgumentComplexitySpecification('complex');
    const completeSpec = new CompleteAtomicArgumentSpecification();

    // Business rule: Show simple arguments OR complex complete arguments
    const displaySpec = simpleSpec.or(complexSpec.and(completeSpec));

    return this.argumentRepo.findBySpecification(displaySpec);
  }

  /**
   * Demonstrates how specifications can be reused across different contexts.
   * Same business logic, different application.
   */
  async validateArgumentForProof(argument: AtomicArgument): Promise<{
    isValid: boolean;
    reasons: string[];
  }> {
    const completeSpec = new CompleteAtomicArgumentSpecification();
    const minPremiseSpec = new AtomicArgumentPremiseCountSpecification(1);

    const specs = [completeSpec, minPremiseSpec];
    const reasons: string[] = [];

    for (const spec of specs) {
      if (!spec.isSatisfiedBy(argument)) {
        const reason = spec.reasonForDissatisfaction?.(argument);
        if (reason) reasons.push(reason);
      }
    }

    return {
      isValid: reasons.length === 0,
      reasons,
    };
  }
}

/**
 * Example factory for creating common specification combinations.
 * Shows how to create reusable specification patterns.
 */
export const createFrequentLogicalStatementSpec = (
  structureType: LogicalStructureType,
  minUsage = 5,
) => {
  const logicalSpec = new StatementLogicalStructureSpecification(structureType);
  const usageSpec = new StatementUsageSpecification(minUsage);
  return logicalSpec.and(usageSpec);
};

export const createValidationReadyArgumentSpec = () => {
  const completeSpec = new CompleteAtomicArgumentSpecification();
  const minPremiseSpec = new AtomicArgumentPremiseCountSpecification(1);
  return completeSpec.and(minPremiseSpec);
};

export const createCleanupCandidateStatementSpec = () => {
  const unusedSpec = new UnusedStatementSpecification();
  const emptyKeywordSpec = new StatementKeywordSpecification([]);
  return unusedSpec.and(emptyKeywordSpec);
};
