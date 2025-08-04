import { err, ok, type Result } from 'neverthrow';
import { AtomicArgument } from '../entities/AtomicArgument.js';
import { Statement } from '../entities/Statement.js';
import { ProcessingError } from '../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { IStatementRepository } from '../repositories/IStatementRepository';
import type { ValidationError } from '../shared/result.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects/index.js';

export class StatementProcessingService {
  async createStatementFlow(
    sourceStatements: string[],
    targetStatements: string[],
    statementRepo: IStatementRepository,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<AtomicArgument, ProcessingError>> {
    const premiseStatements = await this.createOrFindStatements(sourceStatements, statementRepo);
    if (premiseStatements.isErr()) return err(premiseStatements.error);

    const conclusionStatements = await this.createOrFindStatements(targetStatements, statementRepo);
    if (conclusionStatements.isErr()) return err(conclusionStatements.error);

    const atomicArgumentResult = AtomicArgument.create(
      premiseStatements.value,
      conclusionStatements.value,
    );

    if (atomicArgumentResult.isErr()) {
      return err(
        new ProcessingError('Failed to create atomic argument', atomicArgumentResult.error),
      );
    }

    const saveResult = await atomicArgumentRepo.save(atomicArgumentResult.value);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save atomic argument', saveResult.error));
    }

    return ok(atomicArgumentResult.value);
  }

  async createBranchConnection(
    parentArgumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
    conclusionIndex: number = 0,
  ): Promise<Result<AtomicArgument, ProcessingError>> {
    const parentResult = await atomicArgumentRepo.findById(parentArgumentId);
    if (parentResult.isErr()) {
      return err(new ProcessingError('Parent argument not found'));
    }

    const parent = parentResult.value;
    const branchResult = parent.createBranchFromConclusion(conclusionIndex);
    if (branchResult.isErr()) {
      return err(new ProcessingError(branchResult.error.message, branchResult.error));
    }

    const saveResult = await atomicArgumentRepo.save(branchResult.value);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save child argument', saveResult.error));
    }

    return ok(branchResult.value);
  }

  async validateStatementFlow(
    argumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
  ): Promise<Result<StatementFlowValidationResult, ProcessingError>> {
    const argumentResult = await atomicArgumentRepo.findById(argumentId);
    if (argumentResult.isErr()) {
      return err(new ProcessingError('Argument not found'));
    }

    const argument = argumentResult.value;
    const isComplete = argument.isComplete();
    const isEmpty = argument.isEmpty();

    const validationResult = new StatementFlowValidationResult(isComplete, isEmpty, []);
    return ok(validationResult);
  }

  async processStatementReuse(
    statementContent: string,
    statementRepo: IStatementRepository,
  ): Promise<Result<Statement, ProcessingError>> {
    const existingStatementResult = await statementRepo.findByContent(statementContent);

    if (existingStatementResult.isOk() && existingStatementResult.value) {
      const existingStatement = existingStatementResult.value;
      const updatedStatement = existingStatement.incrementUsage();
      const saveResult = await statementRepo.save(updatedStatement);
      if (saveResult.isErr()) {
        return err(new ProcessingError('Failed to update statement usage', saveResult.error));
      }
      return ok(updatedStatement);
    }

    const newStatementResult = Statement.create(statementContent);
    if (newStatementResult.isErr()) {
      return err(new ProcessingError('Invalid statement content', newStatementResult.error));
    }

    const saveResult = await statementRepo.save(newStatementResult.value);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save new statement', saveResult.error));
    }

    return ok(newStatementResult.value);
  }

  async updateStatementContent(
    statementId: StatementId,
    newContent: string,
    statementRepo: IStatementRepository,
  ): Promise<Result<void, ProcessingError>> {
    const statementResult = await statementRepo.findById(statementId);
    if (statementResult.isErr()) {
      return err(new ProcessingError('Statement not found'));
    }

    const statement = statementResult.value;
    const updateResult = statement.updateContent(newContent);
    if (updateResult.isErr()) {
      return err(new ProcessingError('Invalid content update', updateResult.error));
    }

    const saveResult = await statementRepo.save(updateResult.value);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save statement update', saveResult.error));
    }

    return ok(undefined);
  }

  private async createOrFindStatements(
    contents: string[],
    statementRepo: IStatementRepository,
  ): Promise<Result<Statement[], ProcessingError>> {
    const statements: Statement[] = [];

    for (const content of contents) {
      const statementResult = await this.processStatementReuse(content, statementRepo);
      if (statementResult.isErr()) {
        return err(
          new ProcessingError(`Failed to process statement: ${content}`, statementResult.error),
        );
      }
      statements.push(statementResult.value);
    }

    return ok(statements);
  }
}

export class StatementFlowValidationResult {
  constructor(
    public readonly isComplete: boolean,
    public readonly isEmpty: boolean,
    public readonly violations: ValidationError[],
  ) {}
}
