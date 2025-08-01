import type { Result } from 'neverthrow';
import type { RepositoryError } from '../errors/DomainErrors.js';
import type { Statement, StatementId } from '../index.js';
import type {
  LogicalStructureType,
  PatternSearchOptions,
  QueryOptions,
  UsageMetrics,
} from '../shared/repository-types.js';
import type { ISpecificationRepository } from '../specifications/ISpecification.js';
import type { IAdvancedQueryRepository } from './base/index.js';

export interface IStatementQueryRepository
  extends IAdvancedQueryRepository<Statement, StatementId>,
    ISpecificationRepository<Statement> {
  findByContent(content: string): Promise<Result<Statement, RepositoryError>>;
  findStatementsByPattern(
    pattern: RegExp,
    options?: PatternSearchOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  findByLogicalStructure(
    structureType: LogicalStructureType,
    options?: QueryOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  findStatementsByUsageCount(
    minUsage: number,
    options?: QueryOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  searchStatementsByKeywords(
    keywords: string[],
    options?: QueryOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  findStatementsInProof(
    proofId: string,
    options?: QueryOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  getStatementUsageMetrics(
    statementId: StatementId,
  ): Promise<Result<UsageMetrics, RepositoryError>>;
  findFrequentlyUsedStatements(
    options?: QueryOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  findRelatedStatements(
    statementId: StatementId,
    options?: QueryOptions,
  ): Promise<Result<Statement[], RepositoryError>>;
  findUnusedStatements(options?: QueryOptions): Promise<Result<Statement[], RepositoryError>>;
}
