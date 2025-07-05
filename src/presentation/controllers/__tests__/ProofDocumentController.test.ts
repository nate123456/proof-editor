import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import type { CrossContextOrchestrationService } from '../../../application/services/CrossContextOrchestrationService.js';
import type { DocumentOrchestrationService } from '../../../application/services/DocumentOrchestrationService.js';
import type { DocumentQueryService } from '../../../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../../../application/services/ProofVisualizationService.js';
import type { YAMLSerializer } from '../../../infrastructure/repositories/yaml/YAMLSerializer.js';
import { ProofDocumentController } from '../ProofDocumentController.js';

describe('ProofDocumentController', () => {
  let controller: ProofDocumentController;
  let mockOrchestrationService: ReturnType<typeof vi.mocked<CrossContextOrchestrationService>>;
  let mockDocumentOrchestration: ReturnType<typeof vi.mocked<DocumentOrchestrationService>>;
  let mockDocumentQuery: ReturnType<typeof vi.mocked<DocumentQueryService>>;
  let mockFileSystem: ReturnType<typeof vi.mocked<IFileSystemPort>>;
  let mockPlatform: ReturnType<typeof vi.mocked<IPlatformPort>>;
  let mockUI: ReturnType<typeof vi.mocked<IUIPort>>;
  let mockYAMLSerializer: ReturnType<typeof vi.mocked<YAMLSerializer>>;
  let mockVisualizationService: ReturnType<typeof vi.mocked<ProofVisualizationService>>;

  beforeEach(() => {
    mockOrchestrationService = vi.mocked<CrossContextOrchestrationService>(
      {} as CrossContextOrchestrationService,
    );

    mockDocumentOrchestration = vi.mocked<DocumentOrchestrationService>({
      createDocument: vi.fn().mockResolvedValue(ok({ documentId: 'test-doc-id' })),
      validateDocument: vi.fn().mockResolvedValue(ok(undefined)),
      processDocument: vi.fn().mockResolvedValue(ok(undefined)),
      parseDocument: vi.fn().mockResolvedValue(ok({ isValid: true, documentId: 'test-doc-id' })),
      clearDocumentValidation: vi.fn().mockResolvedValue(ok(undefined)),
    } as DocumentOrchestrationService);

    mockDocumentQuery = vi.mocked<DocumentQueryService>({
      getDocumentById: vi.fn().mockImplementation((id: string) =>
        Promise.resolve(
          ok({
            id: id, // Use the actual ID passed in
            version: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            statements: {},
            orderedSets: {},
            atomicArguments: {},
            trees: {},
            stats: {
              statementCount: 1, // Default to 1 for tests
              argumentCount: 0,
              treeCount: 0,
              connectionCount: 0,
              unusedStatements: [],
              unconnectedArguments: [],
              cyclesDetected: [],
              validationStatus: {
                isValid: true,
                errors: [],
              },
            },
          }),
        ),
      ),
      getDocumentWithStats: vi.fn().mockImplementation((id: string) =>
        Promise.resolve(
          ok({
            id: id, // Use the actual ID passed in
            version: 1,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            statements: {},
            orderedSets: {},
            atomicArguments: {},
            trees: {},
            stats: {
              statementCount: 1, // Default to 1 for tests
              argumentCount: 0,
              treeCount: 0,
              connectionCount: 0,
              unusedStatements: [],
              unconnectedArguments: [],
              cyclesDetected: [],
              validationStatus: {
                isValid: true,
                errors: [],
              },
            },
          }),
        ),
      ),
    } as unknown as DocumentQueryService);

    mockFileSystem = vi.mocked<IFileSystemPort>({
      readFile: vi
        .fn()
        .mockResolvedValue(
          ok('# Mock YAML content\nstatements: {}\natomicArguments: {}\ntrees: {}'),
        ),
      writeFile: vi.fn().mockResolvedValue(ok(undefined)),
      exists: vi.fn().mockResolvedValue(ok(true)),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      readDirectory: vi.fn().mockResolvedValue(ok([])),
      createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
      getStoredDocument: vi.fn().mockResolvedValue(ok(null)),
      storeDocument: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStoredDocument: vi.fn().mockResolvedValue(ok(undefined)),
      listStoredDocuments: vi.fn().mockResolvedValue(ok([])),
      capabilities: vi.fn().mockReturnValue({
        supportsDirectories: true,
        supportsMetadata: true,
        supportsBinary: false,
        maxFileSize: 1024 * 1024,
        supportedExtensions: ['.yaml', '.yml'],
      }),
    } as unknown as IFileSystemPort);

    mockPlatform = vi.mocked<IPlatformPort>({
      getPlatformInfo: vi.fn().mockReturnValue({
        type: 'vscode',
        version: '1.0.0',
        os: 'macos',
        arch: 'x64',
        isDebug: false,
      }),
      getInputCapabilities: vi.fn(),
      getDisplayCapabilities: vi.fn(),
      isFeatureAvailable: vi.fn(),
      openExternal: vi.fn(),
      copyToClipboard: vi.fn(),
      readFromClipboard: vi.fn(),
      onWillTerminate: vi.fn(),
      preventTermination: vi.fn(),
      getStorageValue: vi.fn(),
      setStorageValue: vi.fn(),
      deleteStorageValue: vi.fn(),
    } as unknown as IPlatformPort);
    mockUI = vi.mocked<IUIPort>({} as IUIPort);

    mockYAMLSerializer = vi.mocked<YAMLSerializer>({
      serialize: vi.fn().mockResolvedValue(ok('# Mock YAML content')),
      deserialize: vi.fn().mockResolvedValue(ok({})),
    } as unknown as YAMLSerializer);

    mockVisualizationService = vi.mocked<ProofVisualizationService>({
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          trees: [],
          totalDimensions: { width: 800, height: 600 },
          isEmpty: true,
        }),
      ),
      generateTreeVisualization: vi.fn().mockReturnValue(
        ok({
          treeId: 'test-tree',
          bounds: { width: 400, height: 300 },
          nodes: [],
          edges: [],
        }),
      ),
      generateSVGVisualization: vi.fn().mockReturnValue(ok('<svg>Mock SVG content</svg>')),
    } as unknown as ProofVisualizationService);

    controller = new ProofDocumentController(
      mockOrchestrationService,
      mockDocumentOrchestration,
      mockDocumentQuery,
      mockFileSystem,
      mockPlatform,
      mockUI,
      mockYAMLSerializer,
      mockVisualizationService,
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

  describe('createDocument', () => {
    test('creates document with initial statement successfully', async () => {
      const initialStatement = 'All humans are mortal';

      // Mock query to return 1 statement when there's an initial statement
      mockDocumentQuery.getDocumentById = vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc-id',
          version: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
          stats: {
            statementCount: 1,
            argumentCount: 0,
            treeCount: 0,
            connectionCount: 0,
            unusedStatements: [],
            unconnectedArguments: [],
            cyclesDetected: [],
            validationStatus: {
              isValid: true,
              errors: [],
            },
          },
        }),
      );

      const result = await controller.createDocument(initialStatement);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBeDefined();
        expect(result.value.data?.name).toContain('Document');
        expect(result.value.data?.statementCount).toBe(1);
        expect(result.value.metadata?.operationId).toBe('create-document');
      }
    });

    test('creates document without initial statement successfully', async () => {
      // Mock query to return 0 statements when there's no initial statement
      mockDocumentQuery.getDocumentById = vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc-id',
          version: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
          stats: {
            statementCount: 0,
            argumentCount: 0,
            treeCount: 0,
            connectionCount: 0,
            unusedStatements: [],
            unconnectedArguments: [],
            cyclesDetected: [],
            validationStatus: {
              isValid: true,
              errors: [],
            },
          },
        }),
      );

      const result = await controller.createDocument();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBeDefined();
        expect(result.value.data?.statementCount).toBe(0);
      }
    });

    test('handles unexpected errors gracefully', async () => {
      // Force an error by making the DocumentOrchestrationService mock fail
      mockDocumentOrchestration.createDocument = vi
        .fn()
        .mockResolvedValue(err(new Error('Service error')));

      const result = await controller.createDocument();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Service error');
      }
    });
  });

  describe('loadDocument', () => {
    test('loads document successfully with valid path', async () => {
      const validPath = '/path/to/document.proof';

      const result = await controller.loadDocument(validPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBeDefined();
        expect(result.value.metadata?.operationId).toBe('load-document');
        expect(result.value.metadata?.source).toBe('file');
      }
    });

    test('rejects empty document path', async () => {
      const result = await controller.loadDocument('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document path cannot be empty');
      }
    });

    test('rejects whitespace-only document path', async () => {
      const result = await controller.loadDocument('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document path cannot be empty');
      }
    });

    test('handles unexpected errors gracefully', async () => {
      // Force an error by making the file system readFile fail
      mockFileSystem.readFile.mockResolvedValueOnce(
        err({ code: 'NOT_FOUND', message: 'File system error' }),
      );

      const result = await controller.loadDocument('/valid/path');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to read file');
      }

      // Restore the original mock
      mockFileSystem.readFile.mockResolvedValue(
        ok('# Mock YAML content\nstatements: {}\natomicArguments: {}\ntrees: {}'),
      );
    });
  });

  describe('saveDocument', () => {
    test('saves document successfully', async () => {
      const documentId = 'doc-123';
      const path = '/path/to/save.yaml';

      const result = await controller.saveDocument(documentId, path);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata?.operationId).toBe('save-document');
      }
    });

    test('saves document without path successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.saveDocument(documentId);

      expect(result.isOk()).toBe(true);
    });

    test('rejects empty document ID', async () => {
      const result = await controller.saveDocument('', '/path');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });

    test('trims whitespace from inputs', async () => {
      const result = await controller.saveDocument('  doc-123  ', '  /path/to/file.yaml  ');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('importDocument', () => {
    test('imports valid YAML content successfully', async () => {
      const yamlContent = `
        statements:
          stmt1: "All humans are mortal"
        arguments: {}
      `;

      const result = await controller.importDocument(yamlContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBe('test-doc-id'); // This comes from the parseDocument mock
        expect(result.value.data?.name).toContain('Imported Document');
        expect(result.value.metadata?.operationId).toBe('import-document');
      }
    });

    test('rejects empty YAML content', async () => {
      const result = await controller.importDocument('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('YAML content cannot be empty');
      }
    });

    test('imports with optional path', async () => {
      const yamlContent = 'statements: {}';
      const path = '/import/path.proof';

      const result = await controller.importDocument(yamlContent, path);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('exportDocument', () => {
    test('exports document as YAML successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.exportDocument(documentId, 'yaml');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toContain('version: 1');
        expect(result.value.data).toContain(documentId);
      }
    });

    test('exports document as JSON successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.exportDocument(documentId, 'json');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toContain('"id": "doc-123"');
      }
    });

    test('exports document as SVG successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.exportDocument(documentId, 'svg');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toContain('<svg');
      }
    });

    test('rejects invalid export format', async () => {
      const documentId = 'doc-123';

      // @ts-expect-error - Testing invalid format
      const result = await controller.exportDocument(documentId, 'pdf');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid format');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.exportDocument('', 'yaml');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('validateDocument', () => {
    test('validates document successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.validateDocument(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.isValid).toBe(true);
        expect(result.value.data?.errorCount).toBe(0);
      }
    });

    test('validates document with custom scripts', async () => {
      const documentId = 'doc-123';

      const result = await controller.validateDocument(documentId, true);

      expect(result.isOk()).toBe(true);
    });

    test('rejects empty document ID', async () => {
      const result = await controller.validateDocument('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('getDocument', () => {
    test('retrieves document successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.getDocument(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.id).toBe(documentId);
        expect(result.value.metadata?.operationId).toBe('get-document');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getDocument('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('getDocumentState', () => {
    test('retrieves document state successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.getDocumentState(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.totalStatements).toBeDefined();
        expect(result.value.data?.completenessScore).toBeDefined();
      }
    });

    test('retrieves document state with stats', async () => {
      const documentId = 'doc-123';

      const result = await controller.getDocumentState(documentId, true);

      expect(result.isOk()).toBe(true);
    });

    test('rejects empty document ID', async () => {
      const result = await controller.getDocumentState('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('analyzeProofStructure', () => {
    test('analyzes completeness successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.analyzeProofStructure(documentId, 'completeness');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.analysisType).toBe('completeness');
        expect(result.value.data?.score).toBeDefined();
      }
    });

    test('analyzes consistency successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.analyzeProofStructure(documentId, 'consistency');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.analysisType).toBe('consistency');
      }
    });

    test('analyzes complexity successfully', async () => {
      const documentId = 'doc-123';

      const result = await controller.analyzeProofStructure(documentId, 'complexity');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data?.analysisType).toBe('complexity');
      }
    });

    test('rejects invalid analysis type', async () => {
      const documentId = 'doc-123';

      // @ts-expect-error - Testing invalid analysis type
      const result = await controller.analyzeProofStructure(documentId, 'invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid analysis type');
      }
    });

    test('rejects empty document ID', async () => {
      const result = await controller.analyzeProofStructure('', 'completeness');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Document ID cannot be empty');
      }
    });
  });

  describe('DTO mapping', () => {
    test('maps DocumentDTO to view DTO correctly', async () => {
      // Test the private mapping through a public method
      const result = await controller.getDocument('test-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const viewDto = result.value.data;
        expect(viewDto?.id).toBeDefined();
        expect(viewDto?.name).toBeDefined();
        expect(viewDto?.statementCount).toBeDefined();
        expect(viewDto?.argumentCount).toBeDefined();
        expect(viewDto?.treeCount).toBeDefined();
        expect(viewDto?.lastModified).toBeDefined();
        expect(typeof viewDto?.isValid).toBe('boolean');
      }
    });
  });

  describe('metadata generation', () => {
    test('generates consistent metadata for operations', async () => {
      const result = await controller.createDocument();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value.metadata;
        expect(metadata?.timestamp).toBeDefined();
        expect(metadata?.operationId).toBeDefined();
        expect(metadata?.source).toBeDefined();

        // Verify timestamp is valid ISO string
        expect(() => new Date(metadata?.timestamp || '')).not.toThrow();
      }
    });
  });
});
