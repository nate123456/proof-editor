import { err, ok, type Result } from 'neverthrow';
import type { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { ValidationError } from '../../domain/shared/result.js';
import {
  AtomicArgumentId,
  OrderedSetId,
  ProofDocumentId,
  StatementId,
} from '../../domain/shared/value-objects.js';
import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type {
  CreateAtomicArgumentCommand,
  DeleteAtomicArgumentCommand,
  UpdateAtomicArgumentCommand,
} from '../commands/argument-commands.js';
import type {
  CreateStatementCommand,
  DeleteStatementCommand,
  UpdateStatementCommand,
} from '../commands/statement-commands.js';
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
}
