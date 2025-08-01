import type { Statement, StatementId } from '../index.js';
import type { IRepository } from './base/index.js';
import type { IStatementCommandRepository } from './IStatementCommandRepository.js';
import type { IStatementQueryRepository } from './IStatementQueryRepository.js';

export interface IStatementRepository
  extends IRepository<Statement, StatementId>,
    IStatementCommandRepository,
    IStatementQueryRepository {}
