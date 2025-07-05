import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import type { TreeRenderer } from '../TreeRenderer.js';

// Mock the DI container
vi.mock('../../infrastructure/di/container.js', () => ({
  getContainer: vi.fn().mockReturnValue({
    isRegistered: vi.fn().mockReturnValue(true),
    resolve: vi.fn(),
  }),
}));

// Mock TOKENS
vi.mock('../../infrastructure/di/tokens.js', () => ({
  TOKENS: {
    IViewStatePort: 'IViewStatePort',
  },
}));

describe('ProofTreePanel Comprehensive Tests', () => {
  let mockUIPort: IUIPort;
  let mockViewStatePort: IViewStatePort;
  let mockDocumentQueryService: DocumentQueryService;
  let mockVisualizationService: ProofVisualizationService;
  let mockRenderer: TreeRenderer;
  let mockViewStateManager: ViewStateManager;
  let mockWebviewPanel: WebviewPanel;
  let mockBootstrapController: BootstrapController;
  let mockProofApplicationService: ProofApplicationService;
  let mockYAMLSerializer: YAMLSerializer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WebviewPanel
    mockWebviewPanel = {
      id: 'test-panel',
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(),
      },
      onDidDispose: vi.fn(),
      reveal: vi.fn(),
      dispose: vi.fn(),
    };

    // Mock IUIPort
    mockUIPort = {
      createWebviewPanel: vi.fn().mockReturnValue(mockWebviewPanel),
      postMessageToWebview: vi.fn(),
      showError: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      // Required dialog methods
      showInputBox: vi.fn(),
      showQuickPick: vi.fn(),
      showConfirmation: vi.fn(),
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      showProgress: vi.fn(),
      setStatusMessage: vi.fn(),
      // Theme support
      getTheme: vi.fn(),
      onThemeChange: vi.fn(),
      // Platform capabilities
      capabilities: vi.fn(),
    };

    // Mock IViewStatePort
    mockViewStatePort = {
      loadViewState: vi.fn(),
      saveViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getAllStateKeys: vi.fn(),
      clearAllViewState: vi.fn(),
    };

    // Mock DocumentQueryService
    mockDocumentQueryService = {
      parseDocumentContent: vi.fn(),
      getDocumentById: vi.fn(),
      getDocumentWithStats: vi.fn(),
      validateDocumentContent: vi.fn(),
      getDocumentMetadata: vi.fn(),
      documentRepository: {} as any,
      parser: {} as any,
    } as any;

    // Mock ProofVisualizationService
    mockVisualizationService = {
      generateVisualization: vi.fn(),
    } as any;

    // Mock TreeRenderer
    mockRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg>test</svg>'),
      renderStatements: vi.fn(),
      renderConnections: vi.fn(),
    } as any;

    // Mock ViewStateManager - cast to avoid property type checking
    mockViewStateManager = {
      subscribeToChanges: vi.fn(),
      getSelectionState: vi.fn(),
      getViewportState: vi.fn(),
      getPanelState: vi.fn(),
      getThemeState: vi.fn(),
      updateViewportState: vi.fn(),
      updatePanelState: vi.fn(),
      updateSelectionState: vi.fn(),
      updateThemeState: vi.fn(),
      clearAllState: vi.fn(),
    } as any;

    // Mock BootstrapController
    mockBootstrapController = {
      createBootstrapDocument: vi.fn(),
      validateBootstrapData: vi.fn(),
    } as any;

    // Mock ProofApplicationService
    mockProofApplicationService = {
      processCommand: vi.fn(),
      validateProof: vi.fn(),
    } as any;

    // Mock YAMLSerializer
    mockYAMLSerializer = {
      serialize: vi.fn(),
      deserialize: vi.fn(),
    } as any;
  });

  describe('createWithServices', () => {
    it('should create ProofTreePanel with valid inputs', async () => {
      // Setup successful mocks
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledWith({
        id: expect.stringContaining('proof-tree-panel-'),
        title: 'Proof Tree: document.proof',
        viewType: 'proofTreeVisualization',
        showOptions: {
          viewColumn: 1,
          preserveFocus: false,
        },
        retainContextWhenHidden: true,
        enableScripts: true,
      });
    });

    it('should handle document parsing errors', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        err(new ValidationApplicationError('Parse error')),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'invalid content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      // Panel creation succeeds but error is shown in UI
      expect(result.isOk()).toBe(true);
      // Verify error was shown in the UI
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('Parse error'),
        }),
      );
    });

    it('should handle visualization errors', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        err(new ValidationApplicationError('Visualization error')),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      // Panel creation succeeds but error is shown in UI
      expect(result.isOk()).toBe(true);
      // Verify error was shown in the UI
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('Parse Errors'),
        }),
      );
    });

    it('should handle exception during panel creation', async () => {
      vi.mocked(mockUIPort.createWebviewPanel).mockImplementation(() => {
        throw new Error('Failed to create webview');
      });

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create ProofTreePanel');
      }
    });

    it('should extract document name from complex URI', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/complex/path/to/my-proof-document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Proof Tree: my-proof-document.proof',
        }),
      );
    });

    it('should handle missing document name gracefully', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/path/to/',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Proof Tree: Unknown Document',
        }),
      );
    });
  });

  describe('safeResolveViewStatePort', () => {
    it('should resolve IViewStatePort successfully', async () => {
      const mockContainer = {
        isRegistered: vi.fn().mockReturnValue(true),
        resolve: vi.fn().mockReturnValue(mockViewStatePort),
      };

      const { getContainer } = await import('../../infrastructure/di/container.js');
      vi.mocked(getContainer).mockReturnValue(mockContainer as any);

      // Access the private method through reflection
      const resolveMethod = (ProofTreePanel as any).safeResolveViewStatePort;
      const result = resolveMethod();

      expect(result.isOk()).toBe(true);
      expect(mockContainer.isRegistered).toHaveBeenCalledWith('IViewStatePort');
      expect(mockContainer.resolve).toHaveBeenCalledWith('IViewStatePort');
    });

    it('should handle unregistered IViewStatePort', async () => {
      const mockContainer = {
        isRegistered: vi.fn().mockReturnValue(false),
        resolve: vi.fn(),
      };

      const { getContainer } = await import('../../infrastructure/di/container.js');
      vi.mocked(getContainer).mockReturnValue(mockContainer as any);

      const resolveMethod = (ProofTreePanel as any).safeResolveViewStatePort;
      const result = resolveMethod();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('IViewStatePort not registered');
      }
    });

    it('should handle container resolution errors', async () => {
      const mockContainer = {
        isRegistered: vi.fn().mockReturnValue(true),
        resolve: vi.fn().mockImplementation(() => {
          throw new Error('Resolution failed');
        }),
      };

      const { getContainer } = await import('../../infrastructure/di/container.js');
      vi.mocked(getContainer).mockReturnValue(mockContainer as any);

      const resolveMethod = (ProofTreePanel as any).safeResolveViewStatePort;
      const result = resolveMethod();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to resolve IViewStatePort');
      }
    });
  });

  describe('updateContent', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        panel = result.value;
      }
    });

    it('should update content successfully', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {
            s1: {
              id: 's1',
              content: 'Test statement',
              usageCount: 1,
              createdAt: '2023-01-01T00:00:00Z',
              modifiedAt: '2023-01-01T00:00:00Z',
            },
          },
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [
            {
              id: 'tree1',
              position: { x: 0, y: 0 },
              layout: {
                nodes: [],
                connections: [],
                dimensions: { width: 100, height: 100 },
              },
              bounds: { width: 100, height: 100 },
            },
          ],
          totalDimensions: { width: 100, height: 100 },
          isEmpty: false,
        }),
      );

      const result = await panel.updateContent('updated content');

      expect(result.isOk()).toBe(true);
      expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledWith('updated content');
      expect(mockVisualizationService.generateVisualization).toHaveBeenCalled();
      expect(mockRenderer.generateSVG).toHaveBeenCalled();
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'updateTree',
          content: '<svg>test</svg>',
        }),
      );
    });

    it('should handle parsing errors and show error content', async () => {
      const parseError = new ValidationApplicationError('Invalid syntax');
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(err(parseError));

      const result = await panel.updateContent('invalid content');

      expect(result.isOk()).toBe(true); // Should still succeed but show error
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('Parse Errors'),
        }),
      );
    });

    it('should handle visualization errors and show error content', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      const vizError = new ValidationApplicationError('Visualization failed');
      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(err(vizError));

      const result = await panel.updateContent('test content');

      expect(result.isOk()).toBe(true); // Should still succeed but show error
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('Parse Errors'),
        }),
      );
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await panel.updateContent('test content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Unexpected error');
      }
    });
  });

  describe('showParseErrors', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        panel = result.value;
      }
    });

    it('should format errors with sections', async () => {
      // Reset mock to ensure clean state
      vi.mocked(mockUIPort.postMessageToWebview).mockClear();
      vi.mocked(mockUIPort.postMessageToWebview).mockReturnValue(undefined);

      const errors = [
        { message: 'Error 1', section: 'statements' },
        { message: 'Error 2', section: 'arguments' },
        { message: 'Error 3' },
      ];

      // Access private method using type assertion with proper binding
      const showParseErrorsMethod = (panel as any).showParseErrors.bind(panel);
      const result = showParseErrorsMethod(errors);

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('[statements] Error 1'),
        }),
      );
    });

    it('should escape HTML in error messages', async () => {
      // Reset mock to ensure clean state
      vi.mocked(mockUIPort.postMessageToWebview).mockClear();
      vi.mocked(mockUIPort.postMessageToWebview).mockReturnValue(undefined);

      const errors = [
        { message: '<script>alert("xss")</script>' },
        { message: 'Error with "quotes" and <tags>' },
      ];

      const showParseErrorsMethod = (panel as any).showParseErrors.bind(panel);
      const result = showParseErrorsMethod(errors);

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'showError',
          content: expect.stringContaining('&lt;script&gt;'),
        }),
      );
    });

    it('should handle errors during error display', async () => {
      vi.mocked(mockUIPort.postMessageToWebview).mockImplementation(() => {
        throw new Error('Message sending failed');
      });

      const errors = [{ message: 'Test error' }];

      const showParseErrorsMethod = (panel as any).showParseErrors.bind(panel);
      const result = showParseErrorsMethod(errors);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to show parse errors');
      }
    });
  });

  describe('HTML escaping', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        panel = result.value;
      }
    });

    it('should escape all HTML entities', () => {
      const escapeMethod = (panel as any).escapeHtml;

      expect(escapeMethod('&')).toBe('&amp;');
      expect(escapeMethod('<')).toBe('&lt;');
      expect(escapeMethod('>')).toBe('&gt;');
      expect(escapeMethod('"')).toBe('&quot;');
      expect(escapeMethod("'")).toBe('&#x27;');
      expect(escapeMethod('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('should handle empty strings', () => {
      const escapeMethod = (panel as any).escapeHtml;
      expect(escapeMethod('')).toBe('');
    });

    it('should handle strings with no HTML entities', () => {
      const escapeMethod = (panel as any).escapeHtml;
      expect(escapeMethod('normal text')).toBe('normal text');
    });
  });

  describe('Public methods', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        panel = result.value;
      }
    });

    it('should reveal panel with correct parameters', () => {
      panel.reveal(2, true);
      expect(mockWebviewPanel.reveal).toHaveBeenCalledWith(2, true);
    });

    it('should reveal panel with default parameters', () => {
      panel.reveal();
      expect(mockWebviewPanel.reveal).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return correct document URI', () => {
      expect(panel.getDocumentUri()).toBe('/test/document.proof');
    });

    it('should return panel ID', () => {
      const panelId = panel.getPanelId();
      expect(panelId).toMatch(/^proof-tree-panel-\d+$/);
    });

    it('should set up disposal callback', () => {
      const callback = vi.fn();
      panel.onDidDispose(callback);
      expect(mockWebviewPanel.onDidDispose).toHaveBeenCalledWith(callback);
    });

    it('should dispose panel', () => {
      panel.dispose();
      expect(mockWebviewPanel.dispose).toHaveBeenCalled();
    });
  });

  describe('Webview content generation', () => {
    let _panel: ProofTreePanel;

    beforeEach(async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        ok({
          id: 'doc-1',
          version: 1,
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );

      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'doc-1',
          version: 1,
          trees: [],
          totalDimensions: { width: 0, height: 0 },
          isEmpty: true,
        }),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        _panel = result.value;
      }
    });

    it('should generate complete HTML content', () => {
      // The HTML is set during panel creation
      expect(mockWebviewPanel.webview.html).toContain('<!DOCTYPE html>');
      expect(mockWebviewPanel.webview.html).toContain('<title>Proof Tree Visualization</title>');
      expect(mockWebviewPanel.webview.html).toContain('tree-container');
      expect(mockWebviewPanel.webview.html).toContain('bootstrap-overlay');
      expect(mockWebviewPanel.webview.html).toContain('Create First Argument');
      expect(mockWebviewPanel.webview.html).toContain('tailwind');
    });

    it('should include VS Code theme variables', () => {
      expect(mockWebviewPanel.webview.html).toContain('var(--vscode-editor-background)');
      expect(mockWebviewPanel.webview.html).toContain('var(--vscode-editor-foreground)');
      expect(mockWebviewPanel.webview.html).toContain('var(--vscode-panel-background)');
      expect(mockWebviewPanel.webview.html).toContain('var(--vscode-button-background)');
    });

    it('should include JavaScript functions', () => {
      expect(mockWebviewPanel.webview.html).toContain('function showCreateArgumentForm()');
      expect(mockWebviewPanel.webview.html).toContain('function zoomIn()');
      expect(mockWebviewPanel.webview.html).toContain('function exportProof()');
      expect(mockWebviewPanel.webview.html).toContain("window.addEventListener('message'");
    });

    it('should include CSS styles', () => {
      expect(mockWebviewPanel.webview.html).toContain('.argument-node');
      expect(mockWebviewPanel.webview.html).toContain('.statement-text');
      expect(mockWebviewPanel.webview.html).toContain('.connection-line');
    });
  });
});
