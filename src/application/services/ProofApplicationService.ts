import { err, ok, type Result } from 'neverthrow';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { ValidationError } from '../../domain/shared/result.js';
import {
  AtomicArgumentId,
  OrderedSetId,
  ProofDocumentId,
  StatementId,
  TreeId,
} from '../../domain/shared/value-objects.js';
import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type {
  CreateAtomicArgumentCommand,
  DeleteAtomicArgumentCommand,
  UpdateArgumentSideLabelsCommand,
  UpdateAtomicArgumentCommand,
} from '../commands/argument-commands.js';
import type {
  CreateStatementCommand,
  DeleteStatementCommand,
  MoveStatementCommand,
  UpdateStatementCommand,
} from '../commands/statement-commands.js';
import type {
  CreateBranchFromSelectionCommand,
  MoveTreeCommand,
} from '../commands/tree-commands.js';
import { atomicArgumentToDTO } from '../mappers/AtomicArgumentMapper.js';
import { statementToDTO } from '../mappers/StatementMapper.js';
import type { AtomicArgumentDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';

/**
 * Application service that orchestrates domain operations and publishes events.
 * Follows the pattern: Load aggregate → Execute operation → Save → Publish events
 */
export class ProofApplicationService {
  constructor(
    private readonly repository: IProofDocumentRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Creates a new statement in the document and publishes domain events
   */
  async createStatement(
    command: CreateStatementCommand,
  ): Promise<Result<StatementDTO, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Execute domain operation
    const result = document.createStatement(command.content);
    if (result.isErr()) {
      return err(result.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events using existing pattern
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    // Return DTO
    return ok(statementToDTO(result.value));
  }

  /**
   * Updates an existing statement and publishes domain events
   */
  async updateStatement(
    command: UpdateStatementCommand,
  ): Promise<Result<StatementDTO, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse statement ID
    const statementIdResult = StatementId.create(command.statementId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }

    // Execute domain operation
    const result = document.updateStatement(statementIdResult.value, command.content);
    if (result.isErr()) {
      return err(result.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(statementToDTO(result.value));
  }

  /**
   * Deletes a statement and publishes domain events
   */
  async deleteStatement(command: DeleteStatementCommand): Promise<Result<void, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse statement ID
    const statementIdResult = StatementId.create(command.statementId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }

    // Execute domain operation
    const result = document.deleteStatement(statementIdResult.value);
    if (result.isErr()) {
      return err(result.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(undefined);
  }

  /**
   * Creates an atomic argument and publishes domain events
   */
  async createAtomicArgument(
    command: CreateAtomicArgumentCommand,
  ): Promise<Result<AtomicArgumentDTO, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Create premise set if statement IDs provided
    let premiseSet = null;
    if (command.premiseStatementIds.length > 0) {
      const premiseStatementIds = command.premiseStatementIds.map((id) => StatementId.create(id));
      for (const result of premiseStatementIds) {
        if (result.isErr()) {
          return err(result.error);
        }
      }
      const validPremiseIds = premiseStatementIds
        .map((r) => (r.isOk() ? r.value : null))
        .filter(Boolean) as StatementId[];

      const premiseSetResult = document.createOrderedSet(validPremiseIds);
      if (premiseSetResult.isErr()) {
        return err(premiseSetResult.error);
      }
      premiseSet = premiseSetResult.value;
    }

    // Create conclusion set if statement IDs provided
    let conclusionSet = null;
    if (command.conclusionStatementIds.length > 0) {
      const conclusionStatementIds = command.conclusionStatementIds.map((id) =>
        StatementId.create(id),
      );
      for (const result of conclusionStatementIds) {
        if (result.isErr()) {
          return err(result.error);
        }
      }
      const validConclusionIds = conclusionStatementIds
        .map((r) => (r.isOk() ? r.value : null))
        .filter(Boolean) as StatementId[];

      const conclusionSetResult = document.createOrderedSet(validConclusionIds);
      if (conclusionSetResult.isErr()) {
        return err(conclusionSetResult.error);
      }
      conclusionSet = conclusionSetResult.value;
    }

    // Execute domain operation
    const result = document.createAtomicArgument(premiseSet, conclusionSet);
    if (result.isErr()) {
      return err(result.error);
    }

    // Update side labels if provided
    if (command.sideLabel) {
      const labelResult = result.value.updateSideLabels(command.sideLabel);
      if (labelResult.isErr()) {
        return err(labelResult.error);
      }
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(atomicArgumentToDTO(result.value));
  }

  /**
   * Updates an atomic argument and publishes domain events
   */
  async updateAtomicArgument(
    command: UpdateAtomicArgumentCommand,
  ): Promise<Result<AtomicArgumentDTO, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse argument ID
    const argumentIdResult = AtomicArgumentId.create(command.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    // Get premise and conclusion sets if provided
    let premiseSet = null;
    let conclusionSet = null;

    if (command.premiseSetId) {
      const premiseSetIdResult = OrderedSetId.create(command.premiseSetId);
      if (premiseSetIdResult.isErr()) {
        return err(premiseSetIdResult.error);
      }
      premiseSet = document.getOrderedSet(premiseSetIdResult.value);
      if (!premiseSet) {
        return err(new ValidationError('Premise OrderedSet not found'));
      }
    }

    if (command.conclusionSetId) {
      const conclusionSetIdResult = OrderedSetId.create(command.conclusionSetId);
      if (conclusionSetIdResult.isErr()) {
        return err(conclusionSetIdResult.error);
      }
      conclusionSet = document.getOrderedSet(conclusionSetIdResult.value);
      if (!conclusionSet) {
        return err(new ValidationError('Conclusion OrderedSet not found'));
      }
    }

    // Execute domain operation
    const result = document.updateAtomicArgument(argumentIdResult.value, premiseSet, conclusionSet);
    if (result.isErr()) {
      return err(result.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(atomicArgumentToDTO(result.value));
  }

  /**
   * Deletes an atomic argument and publishes domain events
   */
  async deleteAtomicArgument(
    command: DeleteAtomicArgumentCommand,
  ): Promise<Result<void, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse argument ID
    const argumentIdResult = AtomicArgumentId.create(command.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    // Execute domain operation
    const result = document.deleteAtomicArgument(argumentIdResult.value);
    if (result.isErr()) {
      return err(result.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(undefined);
  }

  /**
   * Updates side labels for an atomic argument and publishes domain events
   */
  async updateArgumentLabel(
    command: UpdateArgumentSideLabelsCommand,
  ): Promise<Result<AtomicArgumentDTO, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse argument ID
    const argumentIdResult = AtomicArgumentId.create(command.argumentId);
    if (argumentIdResult.isErr()) {
      return err(argumentIdResult.error);
    }

    // Get the atomic argument
    const argument = document.getArgument(argumentIdResult.value);
    if (!argument) {
      return err(new ValidationError('Atomic argument not found'));
    }

    // Update side labels
    const updateResult = argument.updateSideLabels(command.sideLabels);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(atomicArgumentToDTO(argument));
  }

  /**
   * Moves a statement from one ordered set to another and publishes domain events
   */
  async moveStatement(command: MoveStatementCommand): Promise<Result<void, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse IDs
    const statementIdResult = StatementId.create(command.statementId);
    if (statementIdResult.isErr()) {
      return err(statementIdResult.error);
    }

    const sourceOrderedSetIdResult = OrderedSetId.create(command.sourceOrderedSetId);
    if (sourceOrderedSetIdResult.isErr()) {
      return err(sourceOrderedSetIdResult.error);
    }

    const targetOrderedSetIdResult = OrderedSetId.create(command.targetOrderedSetId);
    if (targetOrderedSetIdResult.isErr()) {
      return err(targetOrderedSetIdResult.error);
    }

    // Get the ordered sets
    const sourceOrderedSet = document.getOrderedSet(sourceOrderedSetIdResult.value);
    if (!sourceOrderedSet) {
      return err(new ValidationError('Source ordered set not found'));
    }

    const targetOrderedSet = document.getOrderedSet(targetOrderedSetIdResult.value);
    if (!targetOrderedSet) {
      return err(new ValidationError('Target ordered set not found'));
    }

    // Remove from source
    const removeResult = sourceOrderedSet.removeStatement(statementIdResult.value);
    if (removeResult.isErr()) {
      return err(removeResult.error);
    }

    // Add to target at specified position or append at end
    const addResult =
      command.targetPosition !== undefined
        ? targetOrderedSet.insertStatementAt(statementIdResult.value, command.targetPosition)
        : targetOrderedSet.addStatement(statementIdResult.value);
    if (addResult.isErr()) {
      // If adding fails, we need to restore the statement to source
      sourceOrderedSet.addStatement(statementIdResult.value);
      return err(addResult.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(undefined);
  }

  /**
   * Moves a tree to a new position and publishes domain events
   */
  async moveTree(command: MoveTreeCommand): Promise<Result<void, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse tree ID
    const treeIdResult = TreeId.create(command.treeId);
    if (treeIdResult.isErr()) {
      return err(treeIdResult.error);
    }

    // Trees are managed by ProofTreeAggregate, not ProofDocument
    // For now, return a not implemented error since trees are managed separately
    // In a full implementation, this would delegate to a TreeApplicationService
    return err(
      new ValidationError(
        'Tree movement not yet implemented - trees are managed by ProofTreeAggregate',
      ),
    );
  }

  /**
   * Creates a new argument by branching from selected text in an existing argument
   */
  async createBranchFromSelection(
    command: CreateBranchFromSelectionCommand,
  ): Promise<Result<AtomicArgumentDTO, ValidationError>> {
    // Load aggregate
    const documentIdResult = ProofDocumentId.create(command.documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const document = await this.repository.findById(documentIdResult.value);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Parse source argument ID
    const sourceArgumentIdResult = AtomicArgumentId.create(command.sourceArgumentId);
    if (sourceArgumentIdResult.isErr()) {
      return err(sourceArgumentIdResult.error);
    }

    // Get source argument
    const sourceArgument = document.getArgument(sourceArgumentIdResult.value);
    if (!sourceArgument) {
      return err(new ValidationError('Source argument not found'));
    }

    // Find the Statement that contains the selected text
    const matchingStatement = this.findStatementContainingText(
      sourceArgument,
      command.selectedText,
      command.position,
    );
    if (matchingStatement.isErr()) {
      return err(matchingStatement.error);
    }

    // Create new argument based on branch type
    let newArgument: Result<
      import('../../domain/entities/AtomicArgument.js').AtomicArgument,
      ValidationError
    >;

    if (command.position === 'conclusion') {
      // Branch from conclusion: new argument has the statement as premise
      newArgument = sourceArgument.createBranchFromConclusion(matchingStatement.value.index);
    } else {
      // Branch to premise: new argument has the statement as conclusion
      newArgument = sourceArgument.createBranchToPremise(matchingStatement.value.index);
    }

    if (newArgument.isErr()) {
      return err(newArgument.error);
    }

    // Add the new argument to the document
    const addResult = document.addArgument(newArgument.value);
    if (addResult.isErr()) {
      return err(addResult.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    return ok(atomicArgumentToDTO(newArgument.value));
  }

  /**
   * Find Statement in argument that contains the selected text
   */
  private findStatementContainingText(
    argument: import('../../domain/entities/AtomicArgument.js').AtomicArgument,
    selectedText: string,
    position: 'premise' | 'conclusion',
  ): Result<
    { statement: import('../../domain/entities/Statement.js').Statement; index: number },
    ValidationError
  > {
    const statements = position === 'premise' ? argument.getPremises() : argument.getConclusions();

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement?.getContent().includes(selectedText)) {
        return ok({ statement, index: i });
      }
    }

    return err(new ValidationError(`Selected text "${selectedText}" not found in ${position}s`));
  }
}
