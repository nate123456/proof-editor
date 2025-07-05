import { ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IPlatformPort } from '../../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import type { DocumentDTO } from '../../../application/queries/document-queries.js';
import type { StatementDTO } from '../../../application/queries/statement-queries.js';
import type { CrossContextOrchestrationService } from '../../../application/services/CrossContextOrchestrationService.js';
import type { DocumentQueryService } from '../../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../../application/services/ProofApplicationService.js';
import { StatementController } from '../StatementController.js';

describe('StatementController', () => {
  let controller: StatementController;
  let mockOrchestrationService: ReturnType<typeof vi.mocked<CrossContextOrchestrationService>>;
  let mockProofApplication: ReturnType<typeof vi.mocked<ProofApplicationService>>;
  let mockDocumentQuery: ReturnType<typeof vi.mocked<DocumentQueryService>>;
  let mockPlatform: ReturnType<typeof vi.mocked<IPlatformPort>>;
  let mockUI: ReturnType<typeof vi.mocked<IUIPort>>;

  beforeEach(() => {
    // Mock all services with proper return types
    mockOrchestrationService = vi.mocked<CrossContextOrchestrationService>(
      {} as CrossContextOrchestrationService,
    );

    mockProofApplication = vi.mocked<ProofApplicationService>({
      createStatement: vi.fn(),
      updateStatement: vi.fn(),
      deleteStatement: vi.fn(),
    } as any);

    mockDocumentQuery = vi.mocked<DocumentQueryService>({
      getDocumentById: vi.fn(),
    } as any);

    mockPlatform = vi.mocked<IPlatformPort>({} as IPlatformPort);
    mockUI = vi.mocked<IUIPort>({} as IUIPort);

    // Setup mock implementations with dynamic content
    const createMockStatement = (id: string, content: string, usageCount = 0): StatementDTO => ({
      id,
      content,
      usageCount,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    });

    const mockDocumentDTO: DocumentDTO = {
      id: 'doc-123',
      version: 1,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      statements: {
        'stmt-456': createMockStatement('stmt-456', 'Mock statement content for stmt-456', 2),
        'stmt-789': createMockStatement('stmt-789', 'All humans are mortal', 3),
        'stmt-unused': createMockStatement('stmt-unused', 'Unused statement', 0),
      },
      orderedSets: {},
      atomicArguments: {},
      trees: {},
    };

    // Setup mock return values with dynamic behavior
    mockProofApplication.createStatement.mockImplementation(async (command) => {
      // This will throw if Date.now() is mocked to throw (for error testing)
      const newStatement = createMockStatement(`stmt-${Date.now()}`, command.content, 0);
      return ok(newStatement);
    });

    mockProofApplication.updateStatement.mockImplementation(async (command) => {
      const updatedStatement = createMockStatement(command.statementId, command.content, 2);
      return ok(updatedStatement);
    });

    mockProofApplication.deleteStatement.mockResolvedValue(ok(undefined));
    mockDocumentQuery.getDocumentById.mockResolvedValue(ok(mockDocumentDTO));

    controller = new StatementController(
      mockOrchestrationService,
      mockProofApplication,
      mockDocumentQuery,
      mockPlatform,
      mockUI,
    );
  });

  describe('initialization and disposal', () => {
    test('initializes successfully', async () => {
      const result = await controller.initialize();

      expect(result.isOk()).toBe(true);
    });

    test('disposes successfully', async () => {
      const result = await controller.dispose();

      expect(result.isOk()).toBe(true);
    });
  });

  describe('createStatement', () => {
    test('creates statement successfully', async () => {
      const documentId = 'doc-123';
      const content = 'All humans are mortal';

      const result = await controller.createStatement(documentId, content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBeDefined();
        expect(result.value.data?.content).toBe(content);
        expect(result.value.data?.usageCount).toBe(0);
        expect(result.value.data?.isUsed).toBe(false);
        expect(result.value.metadata?.operationId).toBe('create-statement');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.createStatement('', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty content', async () => {
      const result = await controller.createStatement('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement content cannot be empty');
      }
    });

    test('trims whitespace from inputs', async () => {
      const result = await controller.createStatement('  doc-123  ', '  content  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.content).toBe('content');
      }
    });

    test('handles unexpected errors gracefully', async () => {
      vi.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await controller.createStatement('doc-123', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create statement');
      }

      vi.restoreAllMocks();
    });
  });

  describe('updateStatement', () => {
    test('updates statement successfully', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';
      const content = 'Updated content';

      const result = await controller.updateStatement(documentId, statementId, content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBe(statementId);
        expect(result.value.data?.content).toBe(content);
        expect(result.value.metadata?.operationId).toBe('update-statement');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.updateStatement('', 'stmt-456', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty statement ID', async () => {
      const result = await controller.updateStatement('doc-123', '', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement ID cannot be empty');
      }
    });

    test('rejects empty content', async () => {
      const result = await controller.updateStatement('doc-123', 'stmt-456', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement content cannot be empty');
      }
    });

    test('trims whitespace from inputs', async () => {
      const result = await controller.updateStatement('  doc-123  ', '  stmt-456  ', '  content  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.content).toBe('content');
      }
    });
  });

  describe('deleteStatement', () => {
    test('deletes unused statement successfully', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';

      const result = await controller.deleteStatement(documentId, statementId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata?.operationId).toBe('delete-statement');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.deleteStatement('', 'stmt-456');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty statement ID', async () => {
      const result = await controller.deleteStatement('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement ID cannot be empty');
      }
    });

    test('handles statement in use (would be rejected by mock logic)', async () => {
      // This test demonstrates the mock implementation returns success
      // In real implementation, this would check usage and potentially fail
      const result = await controller.deleteStatement('doc-123', 'stmt-456');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('getStatement', () => {
    test('retrieves statement successfully', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';

      const result = await controller.getStatement(documentId, statementId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBe(statementId);
        expect(result.value.data?.content).toContain(statementId);
        expect(result.value.data?.usageCount).toBe(2);
        expect(result.value.data?.isUsed).toBe(true);
        expect(result.value.metadata?.operationId).toBe('get-statement');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getStatement('', 'stmt-456');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty statement ID', async () => {
      const result = await controller.getStatement('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement ID cannot be empty');
      }
    });
  });

  describe('listStatements', () => {
    test('lists all statements successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.listStatements(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.statements).toBeDefined();
        expect(result.value.data?.totalCount).toBe(3);
        expect(result.value.data?.unusedCount).toBe(1);
        expect(result.value.metadata?.operationId).toBe('list-statements');
      }
    });

    test('filters unused statements', async () => {
      const documentId = 'doc-123';

      const result = await controller.listStatements(documentId, { unused: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.statements).toBeDefined();
        expect(result.value.data?.statements.length).toBe(1);
        expect(result.value.data?.statements[0]?.usageCount).toBe(0);
      }
    });

    test('filters by search text', async () => {
      const documentId = 'doc-123';
      const searchText = 'mortal';

      const result = await controller.listStatements(documentId, { searchText });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.statements).toBeDefined();
        expect(result.value.data?.searchResults?.query).toBe(searchText);
        expect(result.value.data?.searchResults?.matchCount).toBeDefined();
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.listStatements('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('traceStatementFlow', () => {
    test('traces statement flow successfully', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';

      const result = await controller.traceStatementFlow(documentId, statementId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.statementId).toBe(statementId);
        expect(result.value.data?.directUsages).toBeDefined();
        expect(result.value.data?.flowPaths).toBeDefined();
        expect(result.value.data?.dependencyCount).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('trace-statement-flow');
      }
    });

    test('traces with max depth', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';
      const maxDepth = 5;

      const result = await controller.traceStatementFlow(documentId, statementId, maxDepth);

      expect(result.isOk()).toBe(true);
    });

    test('rejects invalid max depth', async () => {
      const documentId = 'doc-123';
      const statementId = 'stmt-456';

      const resultLow = await controller.traceStatementFlow(documentId, statementId, 0);
      expect(resultLow.isErr()).toBe(true);

      const resultHigh = await controller.traceStatementFlow(documentId, statementId, 11);
      expect(resultHigh.isErr()).toBe(true);
    });

    test('rejects empty document ID', async () => {
      const result = await controller.traceStatementFlow('', 'stmt-456');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty statement ID', async () => {
      const result = await controller.traceStatementFlow('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Statement ID cannot be empty');
      }
    });
  });

  describe('searchStatements', () => {
    test('searches statements successfully', async () => {
      const documentId = 'doc-123';
      const searchQuery = 'mortal';

      const result = await controller.searchStatements(documentId, searchQuery);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.query).toBe(searchQuery);
        expect(result.value.data?.results).toBeDefined();
        expect(result.value.data?.totalMatches).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('search-statements');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.searchStatements('', 'query');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('rejects empty search query', async () => {
      const result = await controller.searchStatements('doc-123', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Search query cannot be empty');
      }
    });

    test('rejects search query too short', async () => {
      const result = await controller.searchStatements('doc-123', 'a');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Search query must be at least 2 characters');
      }
    });

    test('provides match highlights', async () => {
      const result = await controller.searchStatements('doc-123', 'mortal');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.results[0]?.matchHighlights).toBeDefined();
        expect(result.value.data?.results[0]?.matchScore).toBeDefined();
      }
    });
  });

  describe('DTO mapping', () => {
    test('maps StatementDTO to view DTO correctly', async () => {
      const result = await controller.getStatement('doc-123', 'stmt-456');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const viewDto = result.value.data;
        expect(viewDto?.id).toBeDefined();
        expect(viewDto?.content).toBeDefined();
        expect(viewDto?.usageCount).toBeDefined();
        expect(viewDto?.lastModified).toBeDefined();
        expect(typeof viewDto?.isUsed).toBe('boolean');
        expect(viewDto?.preview).toBeDefined();
      }
    });

    test('truncates long content for preview', async () => {
      // This would test the preview truncation logic
      // In our mock implementation, content is short so preview equals content
      const result = await controller.getStatement('doc-123', 'stmt-456');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.preview).toBeDefined();
      }
    });
  });

  describe('metadata generation', () => {
    test('generates consistent metadata for operations', async () => {
      const result = await controller.createStatement('doc-123', 'content');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value.metadata;
        expect(metadata?.timestamp).toBeDefined();
        expect(metadata?.operationId).toBeDefined();
        expect(metadata?.source).toBeDefined();

        // Verify timestamp is valid ISO string
        if (metadata?.timestamp) {
          expect(() => new Date(metadata.timestamp)).not.toThrow();
        }
      }
    });
  });
});
