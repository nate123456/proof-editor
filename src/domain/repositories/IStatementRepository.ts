import { type RepositoryError } from '../errors/DomainErrors.js';
import { type Result, type Statement, type StatementId } from '../index.js';

export interface IStatementRepository {
  save(statement: Statement): Promise<Result<void, RepositoryError>>;
  findById(id: StatementId): Promise<Statement | null>;
  findByContent(content: string): Promise<Statement | null>;
  findAll(): Promise<Statement[]>;
  delete(id: StatementId): Promise<Result<void, RepositoryError>>;
}
