import type { Statement, StatementId } from '../index.js';
import type { ICommandRepository } from './base/index.js';

export interface IStatementCommandRepository extends ICommandRepository<Statement, StatementId> {}
