import { AtomicArgument } from '../entities/AtomicArgument';
import { OrderedSet } from '../entities/OrderedSet';
import { Statement } from '../entities/Statement';
import { ProcessingError } from '../errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../repositories/IOrderedSetRepository';
import type { IStatementRepository } from '../repositories/IStatementRepository';
import { err, ok, type Result, type ValidationError } from '../shared/result.js';
import type { AtomicArgumentId, StatementId } from '../shared/value-objects.js';

export class StatementProcessingService {
  constructor(
    private readonly statementRepo: IStatementRepository,
    private readonly orderedSetRepo: IOrderedSetRepository,
    private readonly atomicArgumentRepo: IAtomicArgumentRepository,
  ) {}

  async createStatementFlow(
    sourceStatements: string[],
    targetStatements: string[],
  ): Promise<Result<AtomicArgument, ProcessingError>> {
    const premiseStatements = await this.createOrFindStatements(sourceStatements);
    if (premiseStatements.isErr()) return err(premiseStatements.error);

    const conclusionStatements = await this.createOrFindStatements(targetStatements);
    if (conclusionStatements.isErr()) return err(conclusionStatements.error);

    const premiseSetResult = await this.createOrderedSet(premiseStatements.value);
    if (premiseSetResult.isErr()) return err(premiseSetResult.error);

    const conclusionSetResult = await this.createOrderedSet(conclusionStatements.value);
    if (conclusionSetResult.isErr()) return err(conclusionSetResult.error);

    const atomicArgument = AtomicArgument.createComplete(
      premiseSetResult.value.getId(),
      conclusionSetResult.value.getId(),
    );

    const saveResult = await this.atomicArgumentRepo.save(atomicArgument);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save atomic argument', saveResult.error));
    }

    return ok(atomicArgument);
  }

  async createBranchConnection(
    parentArgumentId: AtomicArgumentId,
  ): Promise<Result<AtomicArgument, ProcessingError>> {
    const parent = await this.atomicArgumentRepo.findById(parentArgumentId);
    if (!parent) {
      return err(new ProcessingError('Parent argument not found'));
    }

    if (parent.getConclusionSetRef() === null) {
      return err(new ProcessingError('Parent argument has no conclusion to branch from'));
    }

    const childArgument = parent.createChildArgument();

    const saveResult = await this.atomicArgumentRepo.save(childArgument);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save child argument', saveResult.error));
    }

    return ok(childArgument);
  }

  async validateStatementFlow(
    argumentId: AtomicArgumentId,
  ): Promise<Result<StatementFlowValidationResult, ProcessingError>> {
    const argument = await this.atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return err(new ProcessingError('Argument not found'));
    }

    const isComplete = argument.isComplete();
    const isEmpty = argument.isEmpty();

    const validationResult = new StatementFlowValidationResult(isComplete, isEmpty, []);
    return ok(validationResult);
  }

  async processStatementReuse(
    statementContent: string,
  ): Promise<Result<Statement, ProcessingError>> {
    const existingStatement = await this.statementRepo.findByContent(statementContent);

    if (existingStatement) {
      existingStatement.incrementUsageCount();
      const saveResult = await this.statementRepo.save(existingStatement);
      if (saveResult.isErr()) {
        return err(new ProcessingError('Failed to update statement usage', saveResult.error));
      }
      return ok(existingStatement);
    }

    const newStatementResult = Statement.create(statementContent);
    if (newStatementResult.isErr()) {
      return err(new ProcessingError('Invalid statement content', newStatementResult.error));
    }

    const saveResult = await this.statementRepo.save(newStatementResult.value);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save new statement', saveResult.error));
    }

    return ok(newStatementResult.value);
  }

  async updateStatementContent(
    statementId: StatementId,
    newContent: string,
  ): Promise<Result<void, ProcessingError>> {
    const statement = await this.statementRepo.findById(statementId);
    if (!statement) {
      return err(new ProcessingError('Statement not found'));
    }

    const updateResult = statement.updateContent(newContent);
    if (updateResult.isErr()) {
      return err(new ProcessingError('Invalid content update', updateResult.error));
    }

    const saveResult = await this.statementRepo.save(statement);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save statement update', saveResult.error));
    }

    return ok(undefined);
  }

  private async createOrFindStatements(
    contents: string[],
  ): Promise<Result<Statement[], ProcessingError>> {
    const statements: Statement[] = [];

    for (const content of contents) {
      const statementResult = await this.processStatementReuse(content);
      if (statementResult.isErr()) {
        return err(
          new ProcessingError(`Failed to process statement: ${content}`, statementResult.error),
        );
      }
      statements.push(statementResult.value);
    }

    return ok(statements);
  }

  private async createOrderedSet(
    statements: Statement[],
  ): Promise<Result<OrderedSet, ProcessingError>> {
    const statementIds = statements.map((s) => s.getId());
    const orderedSetResult = OrderedSet.createFromStatements(statementIds);

    if (orderedSetResult.isErr()) {
      return err(new ProcessingError('Failed to create ordered set', orderedSetResult.error));
    }

    const saveResult = await this.orderedSetRepo.save(orderedSetResult.value);
    if (saveResult.isErr()) {
      return err(new ProcessingError('Failed to save ordered set', saveResult.error));
    }

    return ok(orderedSetResult.value);
  }
}

export class StatementFlowValidationResult {
  constructor(
    public readonly isComplete: boolean,
    public readonly isEmpty: boolean,
    public readonly violations: ValidationError[],
  ) {}
}
