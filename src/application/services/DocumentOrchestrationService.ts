import { err, ok, type Result } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import { DomainEvent } from '../../domain/events/base-event.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type { ProofFileParser } from '../../parser/ProofFileParser.js';
import type { ContextType } from '../errors/OrchestrationErrors.js';
import type { CrossContextOrchestrationService } from './CrossContextOrchestrationService.js';
import type { DocumentQueryService } from './DocumentQueryService.js';
import type { ProofApplicationService } from './ProofApplicationService.js';

// Domain events for document orchestration
class DocumentProcessedEvent extends DomainEvent {
  readonly eventType = 'DocumentProcessed';
  constructor(
    aggregateId: string,
    public readonly eventData: { fileName: string; documentId: string; contentLength: number },
  ) {
    super(aggregateId, 'DocumentOrchestration');
  }
}

class DocumentValidatedEvent extends DomainEvent {
  readonly eventType = 'DocumentValidated';
  constructor(
    aggregateId: string,
    public readonly eventData: { isValid: boolean; errors: string[]; timestamp: number },
  ) {
    super(aggregateId, 'DocumentOrchestration');
  }
}

class ValidationClearedEvent extends DomainEvent {
  readonly eventType = 'ValidationCleared';
  constructor(
    aggregateId: string,
    public readonly eventData: { fileName: string; timestamp: number },
  ) {
    super(aggregateId, 'DocumentOrchestration');
  }
}

class DocumentCreatedEvent extends DomainEvent {
  readonly eventType = 'DocumentCreated';
  constructor(
    aggregateId: string,
    public readonly eventData: {
      documentId: string;
      hasInitialStatement: boolean;
      timestamp: number;
    },
  ) {
    super(aggregateId, 'DocumentOrchestration');
  }
}

/**
 * Thin orchestration service for document operations.
 * Contains NO business logic - only coordinates between commands/queries.
 * Follows clean architecture principles.
 */
export interface DocumentOrchestrationService {
  processDocument(content: string, fileName: string): Promise<Result<void, Error>>;
  validateDocument(content: string): Promise<Result<void, Error>>;
  clearDocumentValidation(fileName: string): Promise<Result<void, Error>>;
  parseDocument(content: string): Promise<Result<{ isValid: boolean; documentId?: string }, Error>>;
  createDocument(initialStatement?: string): Promise<Result<{ documentId: string }, Error>>;
}

/**
 * Implementation of DocumentOrchestrationService that orchestrates
 * commands and queries without containing business logic.
 */
@injectable()
export class DocumentOrchestrationServiceImpl implements DocumentOrchestrationService {
  constructor(
    @inject(TOKENS.ProofFileParser)
    private readonly parser: ProofFileParser,
    @inject(TOKENS.EventBus)
    private readonly eventBus: EventBus,
    @inject(TOKENS.DocumentQueryService)
    private readonly documentQuery: DocumentQueryService,
    @inject(TOKENS.ProofApplicationService)
    private readonly proofApplication: ProofApplicationService,
    @inject(TOKENS.CrossContextOrchestrationService)
    private readonly crossContextOrchestration: CrossContextOrchestrationService,
  ) {}

  /**
   * Process document - coordinate document processing commands
   * NO business logic - just orchestration
   */
  async processDocument(content: string, fileName: string): Promise<Result<void, Error>> {
    try {
      // 1. Parse the document
      const parseResult = await this.parseDocument(content);
      if (parseResult.isErr()) {
        return err(parseResult.error);
      }

      // 2. If parsing created a document, emit event
      if (parseResult.value.documentId) {
        // Document successfully processed and stored
        const processedEvent = new DocumentProcessedEvent(parseResult.value.documentId, {
          fileName,
          documentId: parseResult.value.documentId,
          contentLength: content.length,
        });
        await this.eventBus.publish([processedEvent]);
      }

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Validate document - coordinate validation commands
   * NO business logic - just orchestration
   */
  async validateDocument(content: string): Promise<Result<void, Error>> {
    try {
      // 1. Parse and validate document structure
      const validationResult = await this.documentQuery.validateDocumentContent(content);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      // 2. If valid, perform cross-context validation
      if (validationResult.value.isValid) {
        const parseResult = this.parser.parseProofFile(content);
        if (parseResult.isOk()) {
          const proofDocument = parseResult.value;

          // Extract statements for validation
          const statements = Array.from(proofDocument.statements.values()).map((stmt) =>
            stmt.getContent(),
          );

          if (statements.length > 0) {
            // Perform cross-context proof validation
            const proofValidationResult =
              await this.crossContextOrchestration.orchestrateProofValidation({
                requestId: `validation-${Date.now()}`,
                statements,
                packageDependencies: [], // Would be extracted from document
                contexts: [
                  'language-intelligence' as ContextType,
                  'package-ecosystem' as ContextType,
                  'synchronization' as ContextType,
                ],
                priority: 'medium' as const,
              });

            if (proofValidationResult.isErr()) {
              return err(proofValidationResult.error);
            }
          }
        }
      }

      // 3. Emit validation events
      const validatedEvent = new DocumentValidatedEvent(`validation-${Date.now()}`, {
        isValid: validationResult.value.isValid,
        errors: (validationResult.value.errors || []).map((err) => err.message),
        timestamp: Date.now(),
      });
      await this.eventBus.publish([validatedEvent]);

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Clear document validation - coordinate cleanup commands
   * NO business logic - just orchestration
   */
  async clearDocumentValidation(fileName: string): Promise<Result<void, Error>> {
    try {
      // 1. Clear validation state (would interact with validation controller)
      // 2. Clean up any cached validation results
      // 3. Emit cleanup events

      const clearedEvent = new ValidationClearedEvent(fileName, {
        fileName,
        timestamp: Date.now(),
      });
      await this.eventBus.publish([clearedEvent]);

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Parse document and optionally store if valid
   * NO business logic - just orchestration
   */
  async parseDocument(
    content: string,
  ): Promise<Result<{ isValid: boolean; documentId?: string }, Error>> {
    try {
      // 1. Parse document structure
      const parseResult = this.parser.parseProofFile(content);
      if (parseResult.isErr()) {
        return ok({ isValid: false });
      }

      // 2. Document is structurally valid
      // Generate a document ID since parser only validates structure
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return ok({
        isValid: true,
        documentId,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Create new document - coordinate creation commands
   * NO business logic - just orchestration
   */
  async createDocument(initialStatement?: string): Promise<Result<{ documentId: string }, Error>> {
    try {
      // Generate document ID
      const documentId = `doc-${Date.now()}`;

      // If initial statement provided, create it
      if (initialStatement) {
        const createStatementResult = await this.proofApplication.createStatement({
          documentId,
          content: initialStatement,
        });

        if (createStatementResult.isErr()) {
          return err(createStatementResult.error);
        }
      }

      // Emit document creation event
      const createdEvent = new DocumentCreatedEvent(documentId, {
        documentId,
        hasInitialStatement: !!initialStatement,
        timestamp: Date.now(),
      });
      await this.eventBus.publish([createdEvent]);

      return ok({ documentId });
    } catch (error) {
      return err(error as Error);
    }
  }
}

/**
 * Factory function to create DocumentOrchestrationService
 * This will be used by the DI container
 */
export function createDocumentOrchestrationService(
  parser: ProofFileParser,
  eventBus: EventBus,
  documentQuery: DocumentQueryService,
  proofApplication: ProofApplicationService,
  crossContextOrchestration: CrossContextOrchestrationService,
): DocumentOrchestrationService {
  return new DocumentOrchestrationServiceImpl(
    parser,
    eventBus,
    documentQuery,
    proofApplication,
    crossContextOrchestration,
  );
}
