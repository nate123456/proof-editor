import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import {
  AtomicArgumentId,
  Dimensions,
  DocumentId,
  ErrorCode,
  ErrorMessage,
  NodeCount,
  NodeId,
  Position2D,
  SideLabel,
  StatementId,
  TreeId,
  Version,
} from '../../../domain/shared/value-objects/index.js';
import type { YAMLSerializer } from '../../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { TreeRenderer } from '../../../webview/TreeRenderer.js';
import { ValidationApplicationError } from '../../dtos/operation-results.js';
import type { ExportOptions, IExportService } from '../../ports/IExportService.js';
import type { IUIPort } from '../../ports/IUIPort.js';
import type { DocumentDTO } from '../../queries/document-queries.js';
import type { DocumentQueryService } from '../DocumentQueryService.js';
import { ExportService } from '../ExportService.js';
import type { ProofVisualizationService } from '../ProofVisualizationService.js';

describe('ExportService', () => {
  let service: IExportService;
  let mockDocumentQueryService: ReturnType<typeof vi.mocked<DocumentQueryService>>;
  let mockVisualizationService: ReturnType<typeof vi.mocked<ProofVisualizationService>>;
  let mockYamlSerializer: ReturnType<typeof vi.mocked<YAMLSerializer>>;
  let mockTreeRenderer: ReturnType<typeof vi.mocked<TreeRenderer>>;
  let mockUIPort: ReturnType<typeof vi.mocked<IUIPort>>;

  const mockDocument: DocumentDTO = {
    id: 'test-doc-id',
    version: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    modifiedAt: '2023-01-01T00:00:00.000Z',
    statements: {
      s1: {
        id: 's1',
        content: 'All men are mortal',
        usageCount: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      },
      s2: {
        id: 's2',
        content: 'Socrates is a man',
        usageCount: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      },
      s3: {
        id: 's3',
        content: 'Therefore, Socrates is mortal',
        usageCount: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      },
    },
    orderedSets: {},
    atomicArguments: {
      arg1: {
        id: (() => {
          const r = AtomicArgumentId.create('arg1');
          return r.isOk() ? r.value : ('arg1' as any);
        })(),
        premiseIds: [
          (() => {
            const r = StatementId.create('s1');
            return r.isOk() ? r.value : ('s1' as any);
          })(),
          (() => {
            const r = StatementId.create('s2');
            return r.isOk() ? r.value : ('s2' as any);
          })(),
        ],
        conclusionIds: [
          (() => {
            const r = StatementId.create('s3');
            return r.isOk() ? r.value : ('s3' as any);
          })(),
        ],
        sideLabels: (() => {
          const r = SideLabel.create('Modus Ponens');
          if (r.isOk()) return { left: r.value };
          return {};
        })(),
      },
    },
    trees: {
      tree1: {
        id: (() => {
          const r = TreeId.create('tree1');
          return r.isOk() ? r.value : ('tree1' as any);
        })(),
        position: (() => {
          const r = Position2D.create(100, 100);
          if (!r.isOk()) throw new Error('Failed to create test Position2D');
          return r.value;
        })(),
        ...(() => {
          const r = Dimensions.create(400, 200);
          return r.isOk() ? { bounds: r.value } : {};
        })(),
        nodeCount: (() => {
          const r = NodeCount.create(1);
          return r.isOk() ? r.value : (1 as any);
        })(),
        rootNodeIds: [
          (() => {
            const r = NodeId.create('n1');
            return r.isOk() ? r.value : ('n1' as any);
          })(),
        ],
      },
    },
  };

  beforeEach(() => {
    mockDocumentQueryService = {
      getDocumentById: vi.fn(),
      getDocumentWithStats: vi.fn(),
      parseDocumentContent: vi.fn(),
      validateDocumentContent: vi.fn(),
      getDocumentMetadata: vi.fn(),
      documentExists: vi.fn(),
      parseWithDetailedErrors: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<DocumentQueryService>>;

    mockVisualizationService = {
      generateVisualization: vi.fn(),
      generateOptimizedVisualization: vi.fn(),
      getDefaultConfig: vi.fn(),
      createConfig: vi.fn(),
      getVisualizationStats: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<ProofVisualizationService>>;

    mockYamlSerializer = {
      serialize: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<YAMLSerializer>>;

    mockTreeRenderer = {
      generateSVG: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<TreeRenderer>>;

    mockUIPort = {
      showSaveDialog: vi.fn(),
      writeFile: vi.fn(),
      createWebviewPanel: vi.fn(),
      postMessageToWebview: vi.fn(),
      showError: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<IUIPort>>;

    service = new ExportService(
      mockDocumentQueryService,
      mockVisualizationService,
      mockYamlSerializer,
      mockTreeRenderer,
      mockUIPort,
    );
  });

  describe('exportDocument - YAML format', () => {
    test('exports document to YAML format successfully', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'yaml', includeMetadata: true };
      const expectedYamlContent = `
version: 1
metadata:
  id: test-doc-id
  createdAt: "2023-01-01T00:00:00.000Z"
  modifiedAt: "2023-01-01T00:00:00.000Z"
  schemaVersion: "1.0.0"
statements:
  s1: "All men are mortal"
  s2: "Socrates is a man"
  s3: "Therefore, Socrates is mortal"
orderedSets:
  os1: ["s1", "s2"]
  os2: ["s3"]
atomicArguments:
  arg1:
    premises: "os1"
    conclusions: "os2"
    sideLabel: "Modus Ponens"
trees:
  tree1:
    offset: { x: 100, y: 100 }
    nodes: {}
      `.trim();

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockYamlSerializer.serialize.mockResolvedValue(ok(expectedYamlContent));

      const result = await service.exportDocument(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.filename).toBe('test-doc-id.proof');
        expect(result.value.content).toBe(expectedYamlContent);
        expect(result.value.mimeType).toBe('application/x-yaml');
      }
    });

    test('returns error when document not found', async () => {
      const documentId = 'nonexistent-doc';
      const options: ExportOptions = { format: 'yaml' };

      mockDocumentQueryService.getDocumentById.mockResolvedValue(
        err(new ValidationApplicationError('Document not found')),
      );

      const result = await service.exportDocument(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Document not found');
      }
    });

    test('returns error when YAML serialization fails', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'yaml' };

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockYamlSerializer.serialize.mockResolvedValue(
        err(new ValidationError('Serialization failed')),
      );

      const result = await service.exportDocument(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to export document');
      }
    });
  });

  describe('exportDocument - PDF format', () => {
    test('exports document to PDF format successfully', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'pdf', includeVisualization: true };

      const docIdResult = DocumentId.create('test-doc-id');
      const dimensionsResult = Dimensions.create(800, 600);

      const versionResult = Version.create(1);
      const mockVisualization = {
        documentId: docIdResult.isOk() ? docIdResult.value : ('test-doc-id' as any),
        version: versionResult.isOk() ? versionResult.value : (1 as any),
        trees: [],
        totalDimensions: dimensionsResult.isOk() ? dimensionsResult.value : ({} as any),
        isEmpty: false,
      };

      const mockSvgContent = '<svg>...</svg>';
      const _expectedPdfBuffer = Buffer.from('PDF content');

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockVisualizationService.generateVisualization.mockReturnValue(ok(mockVisualization));
      mockTreeRenderer.generateSVG.mockReturnValue(mockSvgContent);

      const result = await service.exportDocument(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.filename).toBe('test-doc-id.pdf');
        expect(result.value.mimeType).toBe('application/pdf');
        expect(Buffer.isBuffer(result.value.content)).toBe(true);
      }
    });

    test('returns error when visualization generation fails', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'pdf' };

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockVisualizationService.generateVisualization.mockReturnValue(
        err(new ValidationError('Visualization failed')),
      );

      const result = await service.exportDocument(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to export document');
      }
    });
  });

  describe('exportDocument - JSON format', () => {
    test('exports document to JSON format successfully', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'json', includeMetadata: true };

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));

      const result = await service.exportDocument(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.filename).toBe('test-doc-id.json');
        expect(result.value.mimeType).toBe('application/json');

        const parsedContent = JSON.parse(result.value.content as string);
        expect(parsedContent.id).toBe('test-doc-id');
        expect(parsedContent.statements).toBeDefined();
        expect(parsedContent.atomicArguments).toBeDefined();
      }
    });
  });

  describe('exportDocument - SVG format', () => {
    test('exports document to SVG format successfully', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'svg' };

      const docIdResult = DocumentId.create('test-doc-id');
      const dimensionsResult = Dimensions.create(800, 600);

      const versionResult = Version.create(1);
      const mockVisualization = {
        documentId: docIdResult.isOk() ? docIdResult.value : ('test-doc-id' as any),
        version: versionResult.isOk() ? versionResult.value : (1 as any),
        trees: [],
        totalDimensions: dimensionsResult.isOk() ? dimensionsResult.value : ({} as any),
        isEmpty: false,
      };

      const expectedSvgContent = '<svg width="800" height="600">...</svg>';

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockVisualizationService.generateVisualization.mockReturnValue(ok(mockVisualization));
      mockTreeRenderer.generateSVG.mockReturnValue(expectedSvgContent);

      const result = await service.exportDocument(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.filename).toBe('test-doc-id.svg');
        expect(result.value.content).toBe(expectedSvgContent);
        expect(result.value.mimeType).toBe('image/svg+xml');
      }
    });
  });

  describe('saveToFile', () => {
    test('saves exported file via platform dialog successfully', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'yaml' };
      const expectedFilePath = '/user/documents/test-doc-id.proof';

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockYamlSerializer.serialize.mockResolvedValue(ok('yaml content'));
      mockUIPort.showSaveDialog.mockResolvedValue(
        ok({ filePath: expectedFilePath, cancelled: false }),
      );
      mockUIPort.writeFile.mockResolvedValue(ok(undefined));

      const result = await service.saveToFile(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.filePath).toBe(expectedFilePath);
        expect(result.value.savedSuccessfully).toBe(true);
      }

      expect(mockUIPort.showSaveDialog).toHaveBeenCalledWith({
        defaultFilename: 'test-doc-id.proof',
        filters: [{ name: 'Proof Files', extensions: ['proof'] }],
        title: 'Export Proof Document',
      });
    });

    test('returns error when user cancels save dialog', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'yaml' };

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockYamlSerializer.serialize.mockResolvedValue(ok('yaml content'));
      mockUIPort.showSaveDialog.mockResolvedValue(ok({ filePath: '', cancelled: true }));

      const result = await service.saveToFile(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Export cancelled by user');
      }
    });

    test('returns error when file write fails', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'yaml' };
      const expectedFilePath = '/user/documents/test-doc-id.proof';

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));
      mockYamlSerializer.serialize.mockResolvedValue(ok('yaml content'));
      mockUIPort.showSaveDialog.mockResolvedValue(
        ok({ filePath: expectedFilePath, cancelled: false }),
      );
      mockUIPort.writeFile.mockResolvedValue(
        err({
          code: (() => {
            const r = ErrorCode.create('PLATFORM_ERROR');
            return r.isOk() ? r.value : ('PLATFORM_ERROR' as any);
          })(),
          message: (() => {
            const r = ErrorMessage.create('Write failed');
            return r.isOk() ? r.value : ('Write failed' as any);
          })(),
        }),
      );

      const result = await service.saveToFile(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to save exported file');
      }
    });
  });

  describe('getSupportedFormats', () => {
    test('returns all supported formats for valid document', async () => {
      const documentId = 'test-doc-id';

      mockDocumentQueryService.documentExists.mockResolvedValue(ok(true));

      const result = await service.getSupportedFormats(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(['yaml', 'pdf', 'json', 'svg']);
      }
    });

    test('returns error for nonexistent document', async () => {
      const documentId = 'nonexistent-doc';

      mockDocumentQueryService.documentExists.mockResolvedValue(ok(false));

      const result = await service.getSupportedFormats(documentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Document not found');
      }
    });
  });

  describe('exportDocumentContent', () => {
    test('exports document content without file operations', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'json' };

      mockDocumentQueryService.getDocumentById.mockResolvedValue(ok(mockDocument));

      const result = await service.exportDocumentContent(documentId, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.filename).toBe('test-doc-id.json');
        expect(result.value.mimeType).toBe('application/json');

        const parsedContent = JSON.parse(result.value.content as string);
        expect(parsedContent.id).toBe('test-doc-id');
      }

      // Should not call file system operations
      expect(mockUIPort.showSaveDialog).not.toHaveBeenCalled();
      expect(mockUIPort.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('handles invalid export format', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'invalid' as any };

      const result = await service.exportDocument(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Unsupported export format');
      }
    });

    test('handles document service errors gracefully', async () => {
      const documentId = 'test-doc-id';
      const options: ExportOptions = { format: 'yaml' };

      mockDocumentQueryService.getDocumentById.mockRejectedValue(new Error('Service error'));

      const result = await service.exportDocument(documentId, options);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to export document');
      }
    });
  });
});
