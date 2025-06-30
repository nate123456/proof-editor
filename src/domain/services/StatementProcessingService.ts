import { StatementEntity } from '../entities/StatementEntity';
import { OrderedSetEntity } from '../entities/OrderedSetEntity';
import { AtomicArgumentEntity } from '../entities/AtomicArgumentEntity';
import { AtomicArgumentId, StatementId } from '../shared/value-objects.js';
import type { IStatementRepository } from '../repositories/IStatementRepository';
import type { IOrderedSetRepository } from '../repositories/IOrderedSetRepository';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
import type { Result } from '../shared/result.js';
import { ProcessingError } from '../errors/DomainErrors.js';
import { ValidationError } from '../shared/result.js';

export class StatementProcessingService {
  constructor(
    private readonly statementRepo: IStatementRepository,
    private readonly orderedSetRepo: IOrderedSetRepository,
    private readonly atomicArgumentRepo: IAtomicArgumentRepository
  ) {}

  async createStatementFlow(
    sourceStatements: string[],
    targetStatements: string[]
  ): Promise<Result<AtomicArgumentEntity, ProcessingError>> {
    const premiseStatements = await this.createOrFindStatements(sourceStatements);
    if (!premiseStatements.success) return premiseStatements;

    const conclusionStatements = await this.createOrFindStatements(targetStatements);
    if (!conclusionStatements.success) return conclusionStatements;

    const premiseSetResult = await this.createOrderedSet(premiseStatements.data);
    if (!premiseSetResult.success) return premiseSetResult;

    const conclusionSetResult = await this.createOrderedSet(conclusionStatements.data);
    if (!conclusionSetResult.success) return conclusionSetResult;

    const atomicArgument = AtomicArgumentEntity.createComplete(
      premiseSetResult.data.getId(),
      conclusionSetResult.data.getId()
    );

    const saveResult = await this.atomicArgumentRepo.save(atomicArgument);
    if (!saveResult.success) {
      return {
        success: false,
        error: new ProcessingError('Failed to save atomic argument', saveResult.error)
      };
    }

    return { success: true, data: atomicArgument };
  }

  async createBranchConnection(
    parentArgumentId: AtomicArgumentId
  ): Promise<Result<AtomicArgumentEntity, ProcessingError>> {
    const parent = await this.atomicArgumentRepo.findById(parentArgumentId);
    if (!parent) {
      return {
        success: false,
        error: new ProcessingError('Parent argument not found')
      };
    }

    if (parent.getConclusionSetRef() === null) {
      return {
        success: false,
        error: new ProcessingError('Parent argument has no conclusion to branch from')
      };
    }

    const childArgument = parent.createChildArgument();

    const saveResult = await this.atomicArgumentRepo.save(childArgument);
    if (!saveResult.success) {
      return {
        success: false,
        error: new ProcessingError('Failed to save child argument', saveResult.error)
      };
    }

    return { success: true, data: childArgument };
  }

  async validateStatementFlow(
    argumentId: AtomicArgumentId
  ): Promise<Result<StatementFlowValidationResult, ProcessingError>> {
    const argument = await this.atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return {
        success: false,
        error: new ProcessingError('Argument not found')
      };
    }

    const isComplete = argument.isComplete();
    const isEmpty = argument.isEmpty();
    
    const validationResult = new StatementFlowValidationResult(isComplete, isEmpty, []);
    return { success: true, data: validationResult };
  }

  async processStatementReuse(
    statementContent: string
  ): Promise<Result<StatementEntity, ProcessingError>> {
    const existingStatement = await this.statementRepo.findByContent(statementContent);
    
    if (existingStatement) {
      existingStatement.incrementUsageCount();
      const saveResult = await this.statementRepo.save(existingStatement);
      if (!saveResult.success) {
        return {
          success: false,
          error: new ProcessingError('Failed to update statement usage', saveResult.error)
        };
      }
      return { success: true, data: existingStatement };
    }

    const newStatementResult = StatementEntity.create(statementContent);
    if (!newStatementResult.success) {
      return {
        success: false,
        error: new ProcessingError('Invalid statement content', newStatementResult.error)
      };
    }

    const saveResult = await this.statementRepo.save(newStatementResult.data);
    if (!saveResult.success) {
      return {
        success: false,
        error: new ProcessingError('Failed to save new statement', saveResult.error)
      };
    }

    return { success: true, data: newStatementResult.data };
  }

  async updateStatementContent(
    statementId: StatementId,
    newContent: string
  ): Promise<Result<void, ProcessingError>> {
    const statement = await this.statementRepo.findById(statementId);
    if (!statement) {
      return {
        success: false,
        error: new ProcessingError('Statement not found')
      };
    }

    const updateResult = statement.updateContent(newContent);
    if (!updateResult.success) {
      return {
        success: false,
        error: new ProcessingError('Invalid content update', updateResult.error)
      };
    }

    const saveResult = await this.statementRepo.save(statement);
    if (!saveResult.success) {
      return {
        success: false,
        error: new ProcessingError('Failed to save statement update', saveResult.error)
      };
    }

    return { success: true, data: undefined };
  }

  private async createOrFindStatements(
    contents: string[]
  ): Promise<Result<StatementEntity[], ProcessingError>> {
    const statements: StatementEntity[] = [];

    for (const content of contents) {
      const statementResult = await this.processStatementReuse(content);
      if (!statementResult.success) {
        return {
          success: false,
          error: new ProcessingError(`Failed to process statement: ${content}`, statementResult.error)
        };
      }
      statements.push(statementResult.data);
    }

    return { success: true, data: statements };
  }

  private async createOrderedSet(
    statements: StatementEntity[]
  ): Promise<Result<OrderedSetEntity, ProcessingError>> {
    const statementIds = statements.map(s => s.getId());
    const orderedSetResult = OrderedSetEntity.createFromStatements(statementIds);
    
    if (!orderedSetResult.success) {
      return {
        success: false,
        error: new ProcessingError('Failed to create ordered set', orderedSetResult.error)
      };
    }

    const saveResult = await this.orderedSetRepo.save(orderedSetResult.data);
    if (!saveResult.success) {
      return {
        success: false,
        error: new ProcessingError('Failed to save ordered set', saveResult.error)
      };
    }

    return { success: true, data: orderedSetResult.data };
  }
}

export class StatementFlowValidationResult {
  constructor(
    public readonly isComplete: boolean,
    public readonly isEmpty: boolean,
    public readonly violations: ValidationError[]
  ) {}
}