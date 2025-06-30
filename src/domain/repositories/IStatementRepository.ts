import { StatementEntity, StatementId, Result } from '../index.js';
import { RepositoryError } from '../errors/DomainErrors.js';

export interface IStatementRepository {
  save(statement: StatementEntity): Promise<Result<void, RepositoryError>>;
  findById(id: StatementId): Promise<StatementEntity | null>;
  findByContent(content: string): Promise<StatementEntity | null>;
  findAll(): Promise<StatementEntity[]>;
  delete(id: StatementId): Promise<Result<void, RepositoryError>>;
}