import type { RepositoryError } from '../errors/DomainErrors.js';
import type { Result, Statement, StatementId } from '../index.js';
import type {
  LogicalStructureType,
  PatternSearchOptions,
  QueryOptions,
  UsageMetrics,
} from '../shared/repository-types.js';

export interface IStatementRepository {
  save(statement: Statement): Promise<Result<void, RepositoryError>>;
  findById(id: StatementId): Promise<Statement | null>;
  findByContent(content: string): Promise<Statement | null>;
  findAll(): Promise<Statement[]>;
  delete(id: StatementId): Promise<Result<void, RepositoryError>>;

  findStatementsByPattern(pattern: RegExp, options?: PatternSearchOptions): Promise<Statement[]>;
  findFrequentlyUsedStatements(options?: QueryOptions): Promise<Statement[]>;
  findByLogicalStructure(
    structureType: LogicalStructureType,
    options?: QueryOptions,
  ): Promise<Statement[]>;
  findStatementsByUsageCount(minUsage: number, options?: QueryOptions): Promise<Statement[]>;
  findRelatedStatements(statementId: StatementId, options?: QueryOptions): Promise<Statement[]>;
  searchStatementsByKeywords(keywords: string[], options?: QueryOptions): Promise<Statement[]>;
  findStatementsInProof(proofId: string, options?: QueryOptions): Promise<Statement[]>;
  getStatementUsageMetrics(statementId: StatementId): Promise<UsageMetrics | null>;
  findUnusedStatements(options?: QueryOptions): Promise<Statement[]>;
}
