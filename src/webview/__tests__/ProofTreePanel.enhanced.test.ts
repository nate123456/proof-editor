import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { ProofVisualizationDTO } from '../../application/dtos/view-dtos.js';
import type { IExportService } from '../../application/ports/IExportService.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentDTO } from '../../application/queries/document-queries.js';
import type { IDocumentIdService } from '../../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { SideLabel, Version } from '../../domain/shared/value-objects/content.js';
import { Dimensions, Position2D } from '../../domain/shared/value-objects/geometry.js';
import {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  StatementId,
  TreeId,
  WebviewId,
} from '../../domain/shared/value-objects/identifiers.js';
import { NodeCount } from '../../domain/shared/value-objects/validation.js';
import { createTestContainer, resetContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import type { TreeRenderer } from '../TreeRenderer.js';

describe('ProofTreePanel Enhanced Integration Tests', () => {
  let mockContainer: ReturnType<typeof createTestContainer>;
  let mockDocumentQueryService: DocumentQueryService;
  let mockProofVisualizationService: ProofVisualizationService;
  let mockUIPort: IUIPort;
  let mockTreeRenderer: TreeRenderer;
  let mockViewStateManager: ViewStateManager;
  let mockViewStatePort: IViewStatePort;
  let mockWebviewPanel: WebviewPanel;
  let _mockBootstrapController: BootstrapController;
  let _mockProofApplicationService: ProofApplicationService;
  let _mockYAMLSerializer: YAMLSerializer;
  let _mockExportService: IExportService;
  let _mockDocumentIdService: IDocumentIdService;

  const testDocumentDTO: DocumentDTO = {
    id: DocumentId.fromString('doc-1').unwrapOr(null as any),
    version: 1,
    createdAt: '2023-01-01T00:00:00Z',
    modifiedAt: '2023-01-01T00:00:00Z',
    statements: {
      s1: {
        id: 's1',
        content: 'All men are mortal',
        usageCount: 1,
        createdAt: '2023-01-01T00:00:00Z',
        modifiedAt: '2023-01-01T00:00:00Z',
      },
      s2: {
        id: 's2',
        content: 'Socrates is a man',
        usageCount: 1,
        createdAt: '2023-01-01T00:00:00Z',
        modifiedAt: '2023-01-01T00:00:00Z',
      },
    },
    orderedSets: {},
    atomicArguments: {
      arg1: {
        id: AtomicArgumentId.fromString('arg-1').unwrapOr(null as any),
        premiseIds: [StatementId.fromString('stmt-1').unwrapOr(null as any)],
        conclusionIds: [StatementId.fromString('stmt-2').unwrapOr(null as any)],
        sideLabels: {
          left: SideLabel.create('Modus Ponens').unwrapOr(null as any),
        },
      },
    },
    trees: {
      tree1: {
        id: TreeId.fromString('tree-1').unwrapOr(null as any),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        nodeCount: NodeCount.create(1).unwrapOr(NodeCount.zero()),
        rootNodeIds: [NodeId.fromString('node-1').unwrapOr(null as any)],
      },
    },
  };

  const testVisualizationDTO: ProofVisualizationDTO = {
    documentId: DocumentId.fromString('doc-1').unwrapOr(null as any),
    version: Version.create(1).unwrapOr(null as any),
    trees: [
      {
        id: TreeId.fromString('tree-1').unwrapOr(null as any),
        position: Position2D.create(100, 100).unwrapOr(Position2D.origin()),
        layout: {
          nodes: [],
          connections: [],
          dimensions: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
        },
        bounds: Dimensions.create(300, 200).unwrapOr(Dimensions.fullHD()),
      },
    ],
    totalDimensions: Dimensions.create(500, 400).unwrapOr(Dimensions.fullHD()),
    isEmpty: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetContainer();
    mockContainer = createTestContainer();

    // Create mock webview panel
    mockWebviewPanel = {
      id: WebviewId.create('webview-1').unwrapOr(null as any),
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      reveal: vi.fn(),
      dispose: vi.fn(),
    };

    // Create mock DocumentQueryService
    mockDocumentQueryService = {
      parseDocumentContent: vi.fn(),
      getDocumentById: vi.fn(),
      getDocumentWithStats: vi.fn(),
      validateDocumentContent: vi.fn(),
      getDocumentMetadata: vi.fn(),
      documentExists: vi.fn(),
      parseWithDetailedErrors: vi.fn(),
    } as unknown as DocumentQueryService;

    // Create mock ProofVisualizationService
    mockProofVisualizationService = {
      generateVisualization: vi.fn(),
      generateOptimizedVisualization: vi.fn(),
      getDefaultConfig: vi.fn(),
      createConfig: vi.fn(),
      getVisualizationStats: vi.fn(),
    } as unknown as ProofVisualizationService;

    // Create mock IUIPort
    mockUIPort = {
      createWebviewPanel: vi.fn(() => mockWebviewPanel),
      postMessageToWebview: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showInputBox: vi.fn(),
      showQuickPick: vi.fn(),
      showConfirmation: vi.fn(),
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      showProgress: vi.fn(),
      setStatusMessage: vi.fn(),
      getTheme: vi.fn(),
      onThemeChange: vi.fn(),
      capabilities: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(ok(undefined)),
    } as unknown as IUIPort;

    // Create mock TreeRenderer
    mockTreeRenderer = {
      generateSVG: vi.fn(() => '<svg>test</svg>'),
    } as unknown as TreeRenderer;

    // Create mock ViewStateManager
    mockViewStateManager = {
      getSelectionState: vi.fn(() =>
        Promise.resolve(ok({ selectedNodes: [], selectedStatements: [], selectedTrees: [] })),
      ),
      updateSelectionState: vi.fn(() => Promise.resolve(ok(undefined))),
      getViewportState: vi.fn(() => Promise.resolve(ok({ zoom: 1, panX: 0, panY: 0 }))),
      updateViewportState: vi.fn(() => Promise.resolve(ok(undefined))),
      getPanelState: vi.fn(() => Promise.resolve(ok({ isVisible: true, width: 800, height: 600 }))),
      updatePanelState: vi.fn(() => Promise.resolve(ok(undefined))),
      getThemeState: vi.fn(() =>
        Promise.resolve(
          ok({ kind: 'dark', colors: {}, fonts: { default: '', monospace: '', size: 14 } }),
        ),
      ),
      updateThemeState: vi.fn(() => Promise.resolve(ok(undefined))),
      clearAllState: vi.fn(() => Promise.resolve(ok(undefined))),
      subscribeToChanges: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as ViewStateManager;

    // Create mock IViewStatePort
    mockViewStatePort = {
      saveViewState: vi.fn(() => Promise.resolve(ok(undefined))),
      loadViewState: vi.fn(() => Promise.resolve(ok(null))),
      clearViewState: vi.fn(() => Promise.resolve(ok(undefined))),
      hasViewState: vi.fn(() => Promise.resolve(ok(false))),
    } as unknown as IViewStatePort;

    // Create mock BootstrapController
    _mockBootstrapController = {
      createBootstrapDocument: vi.fn(),
      validateBootstrapData: vi.fn(),
    } as unknown as BootstrapController;

    // Create mock ProofApplicationService
    _mockProofApplicationService = {
      processCommand: vi.fn(),
      validateProof: vi.fn(),
    } as unknown as ProofApplicationService;

    // Create mock YAMLSerializer
    _mockYAMLSerializer = {
      serialize: vi.fn(),
      deserialize: vi.fn(),
    } as unknown as YAMLSerializer;

    // Create mock ExportService
    _mockExportService = {
      exportDocument: vi
        .fn()
        .mockResolvedValue(
          ok({ filename: 'test.yaml', content: 'test content', mimeType: 'text/yaml' }),
        ),
      exportDocumentContent: vi
        .fn()
        .mockResolvedValue(
          ok({ filename: 'test.yaml', content: 'test content', mimeType: 'text/yaml' }),
        ),
      saveToFile: vi
        .fn()
        .mockResolvedValue(ok({ filePath: '/test/path', savedSuccessfully: true })),
      getSupportedFormats: vi.fn().mockResolvedValue(ok(['yaml', 'json'])),
    } as unknown as IExportService;

    // Create mock DocumentIdService
    _mockDocumentIdService = {
      extractFromUri: vi.fn().mockReturnValue(ok('test-document')),
      validateDocumentId: vi.fn().mockReturnValue(ok('test-document')),
      generateFallbackId: vi.fn().mockReturnValue('fallback-id'),
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document')),
    } as unknown as IDocumentIdService;

    // Setup default successful service responses (can be overridden in individual tests)
    vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(ok(testDocumentDTO));
    vi.mocked(mockProofVisualizationService.generateVisualization).mockReturnValue(
      ok(testVisualizationDTO),
    );

    // Register mocks in container
    mockContainer.registerInstance(TOKENS.DocumentQueryService, mockDocumentQueryService);
    mockContainer.registerInstance(TOKENS.ProofVisualizationService, mockProofVisualizationService);
    mockContainer.registerInstance(TOKENS.IUIPort, mockUIPort);
    mockContainer.registerInstance(TOKENS.TreeRenderer, mockTreeRenderer);
    mockContainer.registerInstance(TOKENS.ViewStateManager, mockViewStateManager);
    mockContainer.registerInstance(TOKENS.IViewStatePort, mockViewStatePort);
    mockContainer.registerInstance(TOKENS.BootstrapController, _mockBootstrapController);
    mockContainer.registerInstance(TOKENS.ProofApplicationService, _mockProofApplicationService);
    mockContainer.registerInstance(TOKENS.YAMLSerializer, _mockYAMLSerializer);
    mockContainer.registerInstance(TOKENS.IExportService, _mockExportService);
    mockContainer.registerInstance(TOKENS.IDocumentIdService, _mockDocumentIdService);
  });

  describe('Service Integration', () => {
    it('should integrate services correctly for successful content parsing', async () => {
      const content = 'statements:\n  s1: "All men are mortal"';

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);
      expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledWith(content);
      expect(mockProofVisualizationService.generateVisualization).toHaveBeenCalledWith(
        testDocumentDTO,
      );
      expect(mockTreeRenderer.generateSVG).toHaveBeenCalledWith(testVisualizationDTO);
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalled();
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'updateTree',
          content: '<svg>test</svg>',
        }),
      );
    });

    it('should handle parsing errors through Result pattern', async () => {
      const content = 'invalid: yaml content';
      const parseError = new ValidationApplicationError('YAML parse error');

      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(err(parseError));

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      // Should succeed in creating panel but show error in webview
      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('YAML parse error'),
        }),
      );
    });

    it('should handle visualization errors through Result pattern', async () => {
      const content = 'valid yaml content';
      const visualizationError = new ValidationApplicationError('Layout calculation failed');

      vi.mocked(mockProofVisualizationService.generateVisualization).mockReturnValue(
        err(visualizationError),
      );

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      // Should succeed in creating panel but show error in webview
      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('Layout calculation failed'),
        }),
      );
    });
  });

  describe('Platform Abstraction', () => {
    it('should use IUIPort for webview creation instead of direct VS Code API', async () => {
      // This test enforces platform independence
      const content = 'test content';

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledWith({
        id: expect.any(String),
        title: 'Proof Tree: test-document-uri',
        viewType: 'proofTreeVisualization',
        showOptions: {
          viewColumn: 1,
          preserveFocus: false,
        },
        retainContextWhenHidden: true,
        enableScripts: true,
      });
    });

    it('should use IUIPort for message posting instead of direct webview API', async () => {
      const content = 'test content';

      // Reset mocks to ensure clean state
      vi.clearAllMocks();

      // Setup successful service responses for this specific test
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok(testDocumentDTO),
      );
      vi.mocked(mockProofVisualizationService.generateVisualization).mockReturnValue(
        ok(testVisualizationDTO),
      );

      // Test that we use IUIPort.postMessageToWebview instead of panel.webview.postMessage
      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'updateTree',
          content: '<svg>test</svg>',
        }),
      );
    });
  });

  describe('Architecture Compliance', () => {
    it('should only use DTOs in communication with services', async () => {
      // Verify that ProofTreePanel only deals with DTOs, not domain entities
      const content = 'test content';

      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok(testDocumentDTO),
      );
      vi.mocked(mockProofVisualizationService.generateVisualization).mockReturnValue(
        ok(testVisualizationDTO),
      );

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);
      // Verify only DTO types are used:
      // - DocumentDTO passed to visualization service
      expect(mockProofVisualizationService.generateVisualization).toHaveBeenCalledWith(
        testDocumentDTO,
      );
      // - ProofVisualizationDTO passed to renderer
      expect(mockTreeRenderer.generateSVG).toHaveBeenCalledWith(testVisualizationDTO);
      // - No direct domain entity access (verified by architecture)
    });

    it('should follow Result pattern consistently without throwing errors', async () => {
      // Ensure no exceptions are thrown from ProofTreePanel methods
      // All errors should be handled through Result pattern

      const content = 'test content that causes errors';

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        content,
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      // Should not throw even on errors, handles all errors gracefully through Result pattern
      expect(result.isOk()).toBe(true);
    });

    it('should demonstrate proper dependency injection with services', () => {
      // Test that ProofTreePanel receives its dependencies correctly through DI

      expect(() => {
        mockContainer.resolve(TOKENS.DocumentQueryService);
        mockContainer.resolve(TOKENS.ProofVisualizationService);
        mockContainer.resolve(TOKENS.IUIPort);
        mockContainer.resolve(TOKENS.TreeRenderer);
      }).not.toThrow();

      // Services should be properly registered and resolvable
      expect(mockContainer.isRegistered(TOKENS.DocumentQueryService)).toBe(true);
      expect(mockContainer.isRegistered(TOKENS.ProofVisualizationService)).toBe(true);
      expect(mockContainer.isRegistered(TOKENS.IUIPort)).toBe(true);
      expect(mockContainer.isRegistered(TOKENS.TreeRenderer)).toBe(true);
    });
  });

  describe('Performance and Error Boundaries', () => {
    it('should handle large document visualization through service optimization', async () => {
      // Test that large documents are handled properly through ProofVisualizationService
      const largeDocumentDTO: DocumentDTO = {
        ...testDocumentDTO,
        statements: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `s${i}`,
            {
              id: `s${i}`,
              content: `Statement ${i}`,
              usageCount: 1,
              createdAt: '2023-01-01T00:00:00Z',
              modifiedAt: '2023-01-01T00:00:00Z',
            },
          ]),
        ),
      };

      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok(largeDocumentDTO),
      );

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        'large content',
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);
      expect(mockProofVisualizationService.generateVisualization).toHaveBeenCalledWith(
        largeDocumentDTO,
      );
    });

    it('should recover gracefully from unexpected service failures', async () => {
      // Test resilience when services fail unexpectedly

      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockRejectedValue(
        new Error('Unexpected service failure'),
      );

      const result = await ProofTreePanel.createWithServices(
        'test-document-uri',
        'content',
        mockContainer.resolve(TOKENS.DocumentQueryService),
        mockContainer.resolve(TOKENS.ProofVisualizationService),
        mockContainer.resolve(TOKENS.IUIPort),
        mockContainer.resolve(TOKENS.TreeRenderer),
        mockContainer.resolve(TOKENS.ViewStateManager),
        mockContainer.resolve(TOKENS.IViewStatePort),
        mockContainer.resolve(TOKENS.BootstrapController),
        mockContainer.resolve(TOKENS.ProofApplicationService),
        mockContainer.resolve(TOKENS.YAMLSerializer),
        _mockExportService,
        _mockDocumentIdService,
      );

      // Should handle gracefully without crashing - in this case, the promise rejection
      // will be caught and handled gracefully, resulting in an error being shown
      if (result.isErr()) {
        expect(result.error.message).toContain('Unexpected service failure');
      } else {
        // If result is Ok, this is unexpected in this test scenario
        expect.fail('Expected service failure to result in error Result');
      }
    });
  });
});
