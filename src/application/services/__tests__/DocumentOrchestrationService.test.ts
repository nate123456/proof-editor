import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import type { EventBus } from '../../../infrastructure/events/EventBus.js';
import type { ParseFailureError } from '../../../parser/ParseError.js';
import type { ProofFileParser } from '../../../parser/ProofFileParser.js';
import type { OrchestrationError } from '../../errors/OrchestrationErrors.js';
import type { ProofValidationResult } from '../../interfaces/OrchestrationInterfaces.js';
import type { CrossContextOrchestrationService } from '../CrossContextOrchestrationService.js';
import {
  type DocumentOrchestrationService,
  DocumentOrchestrationServiceImpl,
} from '../DocumentOrchestrationService.js';
import type { DocumentQueryService } from '../DocumentQueryService.js';
import type { ProofApplicationService } from '../ProofApplicationService.js';

describe('DocumentOrchestrationService', () => {
  let service: DocumentOrchestrationService;
  let mockParser: ProofFileParser;
  let mockEventBus: EventBus;
  let mockDocumentQuery: DocumentQueryService;
  let mockProofApplication: ProofApplicationService;
  let mockCrossContextOrchestration: CrossContextOrchestrationService;

  beforeEach(() => {
    mockParser = {
      parseProofFile: vi.fn(),
      parse: vi.fn(),
      validator: {} as any,
      createStatements: vi.fn(),
      createOrderedSets: vi.fn(),
      createAtomicArguments: vi.fn(),
      createArguments: vi.fn(),
      createTreesAndNodes: vi.fn(),
      createNodesForTree: vi.fn(),
      isRootNode: vi.fn(),
      extractArgumentId: vi.fn(),
      createAttachment: vi.fn(),
      validateCrossReferences: vi.fn(),
    } as any;

    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      subscribeAll: vi.fn(),
      subscriptions: new Map(),
      globalSubscriptions: new Set(),
      eventHistory: [],
      metrics: {} as any,
      capturedEvents: [],
      publishQueue: Promise.resolve(),
      handlerExecutionTimes: [],
      config: {} as any,
      publishInternal: vi.fn(),
      executeHandlerSafely: vi.fn(),
      createTimeoutPromise: vi.fn(),
      addToEventHistory: vi.fn(),
      replayEventsForHandler: vi.fn(),
      replayAllEventsForHandler: vi.fn(),
      recordHandlerExecutionTime: vi.fn(),
      calculateAverageExecutionTime: vi.fn(),
      filterByAggregateId: vi.fn(),
      getMetrics: vi.fn(),
      getCapturedEvents: vi.fn(),
      clearCapturedEvents: vi.fn(),
      clearHistory: vi.fn(),
    } as any;

    mockDocumentQuery = {
      validateDocumentContent: vi.fn(),
      documentRepository: {} as any,
      parser: {} as any,
      getDocumentById: vi.fn(),
      getDocumentWithStats: vi.fn(),
      getDocumentsByType: vi.fn(),
      searchDocuments: vi.fn(),
      getDocumentHistory: vi.fn(),
      getDocumentMetadata: vi.fn(),
      validateDocumentStructure: vi.fn(),
      getDocumentDependencies: vi.fn(),
    } as any;

    mockProofApplication = {
      createStatement: vi.fn(),
      repository: {} as any,
      eventBus: {} as any,
      updateStatement: vi.fn(),
      deleteStatement: vi.fn(),
      getStatement: vi.fn(),
      getAllStatements: vi.fn(),
      searchStatements: vi.fn(),
      getStatementHistory: vi.fn(),
    } as any;

    mockCrossContextOrchestration = {
      orchestrateProofValidation: vi.fn(),
      statementFlow: {} as any,
      treeStructure: {} as any,
      pathCompleteness: {} as any,
      logicValidation: {} as any,
      packageValidation: {} as any,
      synchronization: {} as any,
      requestQueue: [] as any,
      activeRequests: new Map(),
      contextTimeouts: new Map(),
      coordinationMetrics: {} as any,
      coordinationHistory: [] as any,
      executeValidationRequest: vi.fn(),
      coordinateContexts: vi.fn(),
      handleContextTimeout: vi.fn(),
      calculatePriority: vi.fn(),
      updateMetrics: vi.fn(),
      recordCoordination: vi.fn(),
    } as any;

    service = new DocumentOrchestrationServiceImpl(
      mockParser,
      mockEventBus,
      mockDocumentQuery,
      mockProofApplication,
      mockCrossContextOrchestration,
    );
  });

  describe('processDocument', () => {
    it('should process document successfully when parsing succeeds', async () => {
      // Arrange
      const content = 'test document content';
      const fileName = 'test.proof';
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.processDocument(content, fileName);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockParser.parseProofFile).toHaveBeenCalledWith(content);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'DocumentProcessed',
            eventData: {
              fileName,
              documentId: expect.any(String),
              contentLength: content.length,
            },
          }),
        ]),
      );
    });

    it('should handle parsing errors gracefully', async () => {
      // Arrange
      const content = 'invalid document content';
      const fileName = 'test.proof';
      const parseError = new Error('Parse error');

      (mockParser.parseProofFile as any).mockReturnValue(err(parseError as ParseFailureError));

      // Act
      const result = await service.processDocument(content, fileName);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle empty document gracefully', async () => {
      // Arrange
      const content = '';
      const fileName = 'empty.proof';

      (mockParser.parseProofFile as any).mockReturnValue(
        err(new ValidationError('Empty content') as ParseFailureError),
      );

      // Act
      const result = await service.processDocument(content, fileName);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle event bus errors', async () => {
      // Arrange
      const content = 'test document content';
      const fileName = 'test.proof';
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockEventBus.publish as any).mockRejectedValue(new Error('Event bus error'));

      // Act
      const result = await service.processDocument(content, fileName);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Event bus error');
      }
    });
  });

  describe('validateDocument', () => {
    it('should validate document with content validation only', async () => {
      // Arrange
      const content = 'test document content';
      const validationResult = {
        isValid: false,
        errors: [new ValidationError('Invalid syntax')],
      };

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(ok(validationResult));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockDocumentQuery.validateDocumentContent).toHaveBeenCalledWith(content);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'DocumentValidated',
            eventData: {
              isValid: false,
              errors: ['Invalid syntax'],
              timestamp: expect.any(Number),
            },
          }),
        ]),
      );
    });

    it('should perform cross-context validation for valid documents', async () => {
      // Arrange
      const content = 'valid document content';
      const validationResult = { isValid: true, errors: [] };
      const mockProofDocument = {
        statements: new Map([
          ['stmt1', { getContent: () => 'Statement 1' }],
          ['stmt2', { getContent: () => 'Statement 2' }],
        ]),
      };

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(ok(validationResult));
      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));

      const validationResult2: ProofValidationResult = {
        requestId: 'test-request-123',
        success: true,
        contextResults: new Map(),
        executionTime: 100,
        structuralValid: true,
        logicalValid: true,
        dependenciesResolved: true,
        syncCoordinated: true,
        errors: [],
      };

      (mockCrossContextOrchestration.orchestrateProofValidation as any).mockResolvedValue(
        ok(validationResult2),
      );
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCrossContextOrchestration.orchestrateProofValidation).toHaveBeenCalledWith({
        requestId: expect.stringMatching(/^validation-\d+$/),
        statements: ['Statement 1', 'Statement 2'],
        packageDependencies: [],
        contexts: ['language-intelligence', 'package-ecosystem', 'synchronization'],
        priority: 'medium',
      });
    });

    it('should handle cross-context validation errors', async () => {
      // Arrange
      const content = 'valid document content';
      const validationResult = { isValid: true, errors: [] };
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };
      const crossContextError = new Error('Cross-context validation failed');

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(ok(validationResult));
      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockCrossContextOrchestration.orchestrateProofValidation as any).mockResolvedValue(
        err(crossContextError as OrchestrationError),
      );

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(crossContextError);
      }
    });

    it('should handle empty statement lists', async () => {
      // Arrange
      const content = 'valid document content';
      const validationResult = { isValid: true, errors: [] };
      const mockProofDocument = {
        statements: new Map(),
      };

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(ok(validationResult));
      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(
        mockCrossContextOrchestration.orchestrateProofValidation as any,
      ).not.toHaveBeenCalled();
    });

    it('should handle document query service errors', async () => {
      // Arrange
      const content = 'test document content';
      const queryError = new Error('Query service error');

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(err(queryError));

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(queryError);
      }
    });
  });

  describe('clearDocumentValidation', () => {
    it('should clear document validation successfully', async () => {
      // Arrange
      const fileName = 'test.proof';
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.clearDocumentValidation(fileName);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'ValidationCleared',
            eventData: {
              fileName,
              timestamp: expect.any(Number),
            },
          }),
        ]),
      );
    });

    it('should handle event bus errors during clearing', async () => {
      // Arrange
      const fileName = 'test.proof';
      const eventError = new Error('Event bus error');

      (mockEventBus.publish as any).mockRejectedValue(eventError);

      // Act
      const result = await service.clearDocumentValidation(fileName);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(eventError);
      }
    });
  });

  describe('parseDocument', () => {
    it('should parse document successfully', async () => {
      // Arrange
      const content = 'valid document content';
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));

      // Act
      const result = await service.parseDocument(content);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
        expect(result.value.documentId).toMatch(/^doc-\d+-[a-z0-9]+$/);
      }
    });

    it('should handle parsing errors gracefully', async () => {
      // Arrange
      const content = 'invalid document content';
      const parseError = new Error('Parse error');

      (mockParser.parseProofFile as any).mockReturnValue(err(parseError as ParseFailureError));

      // Act
      const result = await service.parseDocument(content);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(result.value.documentId).toBeUndefined();
      }
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const content = 'test document content';

      (mockParser.parseProofFile as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await service.parseDocument(content);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Unexpected error');
      }
    });
  });

  describe('createDocument', () => {
    it('should create document without initial statement', async () => {
      // Arrange
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.createDocument();

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.documentId).toMatch(/^doc-\d+$/);
      }
      expect(mockProofApplication.createStatement).not.toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'DocumentCreated',
            eventData: {
              documentId: expect.any(String),
              hasInitialStatement: false,
              timestamp: expect.any(Number),
            },
          }),
        ]),
      );
    });

    it('should create document with initial statement', async () => {
      // Arrange
      const initialStatement = 'Initial statement content';
      const mockStatement = { id: 'stmt1', content: initialStatement };

      (mockProofApplication.createStatement as any).mockResolvedValue(ok(mockStatement));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.createDocument(initialStatement);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.documentId).toMatch(/^doc-\d+$/);
      }
      expect(mockProofApplication.createStatement).toHaveBeenCalledWith({
        documentId: expect.any(String),
        content: initialStatement,
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'DocumentCreated',
            eventData: {
              documentId: expect.any(String),
              hasInitialStatement: true,
              timestamp: expect.any(Number),
            },
          }),
        ]),
      );
    });

    it('should handle statement creation errors', async () => {
      // Arrange
      const initialStatement = 'Initial statement content';
      const statementError = new Error('Statement creation failed');

      (mockProofApplication.createStatement as any).mockResolvedValue(err(statementError));

      // Act
      const result = await service.createDocument(initialStatement);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(statementError);
      }
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle event bus errors during creation', async () => {
      // Arrange
      const eventError = new Error('Event bus error');

      (mockEventBus.publish as any).mockRejectedValue(eventError);

      // Act
      const result = await service.createDocument();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(eventError);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle concurrent document processing', async () => {
      // Arrange
      const contents = ['doc1 content', 'doc2 content', 'doc3 content'];
      const fileNames = ['doc1.proof', 'doc2.proof', 'doc3.proof'];
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const results = await Promise.all(
        contents.map((content, index) =>
          service.processDocument(content, fileNames[index] ?? `doc${index}.proof`),
        ),
      );

      // Assert
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
      expect(mockParser.parseProofFile).toHaveBeenCalledTimes(3);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(3);
    });

    it('should handle validation workflow with multiple contexts', async () => {
      // Arrange
      const content = 'complex document content';
      const validationResult = { isValid: true, errors: [] };
      const mockProofDocument = {
        statements: new Map([
          ['stmt1', { getContent: () => 'Statement 1' }],
          ['stmt2', { getContent: () => 'Statement 2' }],
        ]),
      };

      const validationResult3: ProofValidationResult = {
        requestId: 'test-request-456',
        success: true,
        contextResults: new Map(),
        executionTime: 150,
        structuralValid: true,
        logicalValid: true,
        dependenciesResolved: true,
        syncCoordinated: true,
        errors: [],
      };

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(ok(validationResult));
      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockCrossContextOrchestration.orchestrateProofValidation as any).mockResolvedValue(
        ok(validationResult3),
      );
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCrossContextOrchestration.orchestrateProofValidation).toHaveBeenCalledWith({
        requestId: expect.stringMatching(/^validation-\d+$/),
        statements: ['Statement 1', 'Statement 2'],
        packageDependencies: [],
        contexts: ['language-intelligence', 'package-ecosystem', 'synchronization'],
        priority: 'medium',
      });
    });

    it('should handle error propagation through workflow', async () => {
      // Arrange
      const content = 'test document content';
      const fileName = 'test.proof';

      // First call fails, second succeeds
      (mockParser.parseProofFile as any)
        .mockReturnValueOnce(err(new Error('First parse error') as ParseFailureError))
        .mockReturnValueOnce(ok({ statements: new Map() } as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const firstResult = await service.processDocument(content, fileName);
      const secondResult = await service.processDocument(content, fileName);

      // Assert
      expect(firstResult.isOk()).toBe(true);
      expect(secondResult.isOk()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large document content', async () => {
      // Arrange
      const largeContent = 'x'.repeat(1000000); // 1MB content
      const fileName = 'large.proof';
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.processDocument(largeContent, fileName);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventData: expect.objectContaining({
              contentLength: 1000000,
            }),
          }),
        ]),
      );
    });

    it('should handle document with special characters in filename', async () => {
      // Arrange
      const content = 'test document content';
      const fileName = 'test-file_with.special@chars.proof';
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const result = await service.processDocument(content, fileName);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventData: expect.objectContaining({
              fileName: 'test-file_with.special@chars.proof',
            }),
          }),
        ]),
      );
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient errors', async () => {
      // Arrange
      const content = 'test document content';

      (mockDocumentQuery.validateDocumentContent as any)
        .mockResolvedValueOnce(err(new Error('Transient error')))
        .mockResolvedValueOnce(ok({ isValid: true, errors: [] }));

      (mockParser.parseProofFile as any).mockReturnValue(ok({ statements: new Map() } as any));
      (mockEventBus.publish as any).mockResolvedValue(ok(undefined));

      // Act
      const firstResult = await service.validateDocument(content);
      const secondResult = await service.validateDocument(content);

      // Assert
      expect(firstResult.isErr()).toBe(true);
      expect(secondResult.isOk()).toBe(true);
    });

    it('should handle partial failures in complex workflows', async () => {
      // Arrange
      const content = 'test document content';
      const validationResult = { isValid: true, errors: [] };
      const mockProofDocument = {
        statements: new Map([['stmt1', { getContent: () => 'Statement 1' }]]),
      };

      (mockDocumentQuery.validateDocumentContent as any).mockResolvedValue(ok(validationResult));
      (mockParser.parseProofFile as any).mockReturnValue(ok(mockProofDocument as any));
      (mockCrossContextOrchestration.orchestrateProofValidation as any).mockResolvedValue(
        err(new Error('Partial failure') as OrchestrationError),
      );

      // Act
      const result = await service.validateDocument(content);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Partial failure');
      }
    });
  });
});
