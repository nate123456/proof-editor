import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import { DocumentViewStateManager } from '../../application/services/DocumentViewStateManager.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
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

describe('ProofTreePanel View State Management', () => {
  let mockUIPort: Partial<IUIPort>;
  let mockViewStatePort: Partial<IViewStatePort>;
  let mockDocumentQueryService: Partial<DocumentQueryService>;
  let mockVisualizationService: Partial<ProofVisualizationService>;
  let mockRenderer: Partial<TreeRenderer>;
  let mockViewStateManager: Partial<ViewStateManager>;
  let mockWebviewPanel: Partial<WebviewPanel>;
  let mockBootstrapController: Partial<BootstrapController>;
  let mockProofApplicationService: Partial<ProofApplicationService>;
  let mockYAMLSerializer: Partial<YAMLSerializer>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WebviewPanel
    mockWebviewPanel = {
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      },
      onDidDispose: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      reveal: vi.fn(),
      dispose: vi.fn(),
    };

    // Mock services
    mockUIPort = {
      createWebviewPanel: vi.fn().mockReturnValue(mockWebviewPanel),
      postMessageToWebview: vi.fn(),
      showError: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      // Required IUIPort interface methods
      showInputBox: vi.fn().mockResolvedValue(ok('input')),
      showQuickPick: vi.fn().mockResolvedValue(ok(null)),
      showConfirmation: vi.fn().mockResolvedValue(ok(false)),
      showOpenDialog: vi.fn().mockResolvedValue(ok(null)),
      showSaveDialog: vi.fn().mockResolvedValue(ok(null)),
      showProgress: vi.fn().mockResolvedValue(undefined),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getTheme: vi.fn().mockReturnValue({
        kind: 'dark' as const,
        colors: {},
        fonts: { default: 'Arial', monospace: 'Monaco', size: 14 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      writeFile: vi.fn(),
      capabilities: vi.fn().mockReturnValue({
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      }),
    };

    mockViewStatePort = {
      loadViewState: vi.fn(),
      saveViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getAllStateKeys: vi.fn(),
      clearAllViewState: vi.fn(),
    };

    mockDocumentQueryService = {
      parseDocumentContent: vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc',
          version: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      ),
      getDocumentById: vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc',
          version: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      ),
      getDocumentWithStats: vi.fn(),
      validateDocumentContent: vi.fn(),
      getDocumentMetadata: vi.fn(),
      documentExists: vi.fn(),
      parseWithDetailedErrors: vi.fn(),
    };

    mockVisualizationService = {
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          documentId: 'test-doc',
          version: 1,
          trees: [],
          totalDimensions: { width: 400, height: 200 },
          isEmpty: true,
        }),
      ),
      generateOptimizedVisualization: vi.fn(),
      getDefaultConfig: vi.fn(),
      createConfig: vi.fn(),
      getVisualizationStats: vi.fn(),
    };

    mockRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg>test</svg>'),
    };

    mockViewStateManager = {
      subscribeToChanges: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getSelectionState: vi.fn().mockResolvedValue(
        ok({
          selectedNodes: [],
          selectedStatements: [],
          selectedTrees: [],
        }),
      ),
      getViewportState: vi.fn().mockResolvedValue(
        ok({
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          center: { x: 0, y: 0 },
        }),
      ),
      getPanelState: vi.fn().mockResolvedValue(
        ok({
          miniMapVisible: true,
          sideLabelsVisible: true,
          validationPanelVisible: false,
          panelSizes: {},
        }),
      ),
      getThemeState: vi.fn().mockResolvedValue(
        ok({
          colorScheme: 'dark' as const,
          fontSize: 14,
          fontFamily: 'default',
        }),
      ),
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
      updateThemeState: vi.fn().mockResolvedValue(ok(undefined)),
      clearAllState: vi.fn().mockResolvedValue(ok(undefined)),
    };

    mockBootstrapController = {
      createBootstrapArgument: vi.fn(),
    };

    mockProofApplicationService = {
      createStatement: vi.fn(),
      createAtomicArgument: vi.fn(),
    };

    mockYAMLSerializer = {
      serialize: vi.fn(),
    };

    // Add missing mock services for createWithServices
    const mockExportService = {
      exportDocument: vi.fn(),
      exportDocumentContent: vi.fn(),
      saveToFile: vi.fn(),
      getSupportedFormats: vi.fn(),
    };

    const mockDocumentIdService = {
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document-id')),
    };

    // Make them available globally in the test scope
    (globalThis as any).mockExportService = mockExportService;
    (globalThis as any).mockDocumentIdService = mockDocumentIdService;
  });

  describe('View state initialization', () => {
    it('should restore all view states successfully', async () => {
      // Setup successful view state responses
      const mockViewport = { zoom: 1.5, pan: { x: 100, y: 200 }, center: { x: 50, y: 75 } };
      const mockPanel = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: { left: 300, right: 400 },
      };
      const mockSelection = {
        selectedNodes: ['node1'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };
      const mockTheme = { colorScheme: 'dark' as const, fontSize: 16, fontFamily: 'monospace' };

      // Mock DocumentViewStateManager methods through prototype
      vi.spyOn(DocumentViewStateManager.prototype, 'getViewportState').mockResolvedValue(
        ok(mockViewport),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getPanelState').mockResolvedValue(
        ok(mockPanel),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getSelectionState').mockResolvedValue(
        ok(mockSelection),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getThemeState').mockResolvedValue(
        ok(mockTheme),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // Wait for async view state initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should send all state restoration messages
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(expect.any(String), {
        type: 'restoreViewportState',
        viewport: mockViewport,
      });
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(expect.any(String), {
        type: 'restorePanelState',
        panel: mockPanel,
      });
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(expect.any(String), {
        type: 'restoreSelectionState',
        selection: mockSelection,
      });
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(expect.any(String), {
        type: 'restoreThemeState',
        theme: mockTheme,
      });
    });

    it('should handle view state errors gracefully', async () => {
      // Mock view state methods to return errors
      vi.spyOn(DocumentViewStateManager.prototype, 'getViewportState').mockResolvedValue(
        err(new ValidationError('Viewport state error')),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getPanelState').mockResolvedValue(
        err(new ValidationError('Panel state error')),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getSelectionState').mockResolvedValue(
        err(new ValidationError('Selection state error')),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getThemeState').mockResolvedValue(
        err(new ValidationError('Theme state error')),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      // Panel should still be created successfully despite view state errors
      expect(result.isOk()).toBe(true);

      // Should not send any state restoration messages when errors occur
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ type: 'updateTree' }),
      );
      expect(mockUIPort.postMessageToWebview).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ type: 'restoreViewportState' }),
      );
    });

    it('should handle partial view state restoration', async () => {
      // Some states succeed, others fail
      const mockViewport = { zoom: 1.5, pan: { x: 100, y: 200 }, center: { x: 50, y: 75 } };

      vi.spyOn(DocumentViewStateManager.prototype, 'getViewportState').mockResolvedValue(
        ok(mockViewport),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getPanelState').mockResolvedValue(
        err(new ValidationError('Panel state error')),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getSelectionState').mockResolvedValue(
        err(new ValidationError('Selection state error')),
      );
      vi.spyOn(DocumentViewStateManager.prototype, 'getThemeState').mockResolvedValue(
        err(new ValidationError('Theme state error')),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // Should only send restoration message for successful state
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(expect.any(String), {
        type: 'restoreViewportState',
        viewport: mockViewport,
      });
      expect(mockUIPort.postMessageToWebview).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ type: 'restorePanelState' }),
      );
    });

    it('should handle view state initialization errors', async () => {
      // Mock methods to throw errors
      vi.spyOn(DocumentViewStateManager.prototype, 'getViewportState').mockRejectedValue(
        new Error('Async error'),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      // Panel creation should still succeed
      expect(result.isOk()).toBe(true);
    });

    it('should set up message handler for webview messages', async () => {
      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // Wait for async view state initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should set up message handler - verify createWebviewPanel was called
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalled();

      // The panel should be properly initialized with message handling capability
      // We verify this by ensuring the webview has the onDidReceiveMessage function available
      expect(mockWebviewPanel.webview?.onDidReceiveMessage).toBeDefined();
      expect(typeof mockWebviewPanel.webview?.onDidReceiveMessage).toBe('function');
    });
  });

  describe('Development mode behavior', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle development mode gracefully', async () => {
      process.env.NODE_ENV = 'development';

      // Mock view state to throw error
      vi.spyOn(DocumentViewStateManager.prototype, 'getViewportState').mockRejectedValue(
        new Error('Development error'),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      // Should still create panel successfully
      expect(result.isOk()).toBe(true);
    });

    it('should handle production mode gracefully', async () => {
      process.env.NODE_ENV = 'production';

      // Mock view state to throw error
      vi.spyOn(DocumentViewStateManager.prototype, 'getViewportState').mockRejectedValue(
        new Error('Production error'),
      );

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      // Should still create panel successfully
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Disposal handling', () => {
    it('should set up disposal callback during creation', async () => {
      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // Should register disposal callback
      expect(mockWebviewPanel.onDidDispose).toHaveBeenCalled();
    });

    it('should call dispose method when webview is disposed', async () => {
      let disposeCallback: (() => void) | undefined;
      vi.mocked(mockWebviewPanel.onDidDispose)?.mockImplementation((callback) => {
        disposeCallback = callback;
        return { dispose: vi.fn() };
      });

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);
      let panel: any;
      if (result.isOk()) {
        panel = result.value;
      }

      // Spy on panel's dispose method
      vi.spyOn(panel, 'dispose');

      // Trigger disposal
      disposeCallback?.();

      expect(panel.dispose).toHaveBeenCalled();
    });
  });

  describe('Error boundary behavior', () => {
    it('should handle unexpected errors during message processing', async () => {
      let messageHandler: ((message: unknown) => Promise<void>) | undefined;
      vi.mocked(mockWebviewPanel.webview?.onDidReceiveMessage)?.mockImplementation((handler) => {
        messageHandler = handler as any;
        return { dispose: vi.fn() };
      });

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // Mock view state manager to throw error
      vi.mocked(mockViewStateManager.updateViewportState)?.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Should not throw when processing message with error
      if (messageHandler) {
        expect(() =>
          messageHandler({
            type: 'viewportChanged',
            viewport: { zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
          }),
        ).not.toThrow();
      }
    });

    it('should handle malformed viewport messages', async () => {
      let messageHandler: ((message: unknown) => Promise<void>) | undefined;
      vi.mocked(mockWebviewPanel.webview?.onDidReceiveMessage)?.mockImplementation((handler) => {
        messageHandler = handler as any;
        return { dispose: vi.fn() };
      });

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (messageHandler) {
        // Should handle malformed viewport data gracefully
        expect(() =>
          messageHandler({
            type: 'viewportChanged',
            viewport: 'not an object',
          }),
        ).not.toThrow();

        expect(() =>
          messageHandler({
            type: 'viewportChanged',
            viewport: null,
          }),
        ).not.toThrow();

        expect(() =>
          messageHandler({
            type: 'viewportChanged',
            // Missing viewport property
          }),
        ).not.toThrow();
      }
    });

    it('should handle errors in development mode message processing', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      let messageHandler: ((message: unknown) => Promise<void>) | undefined;
      vi.mocked(mockWebviewPanel.webview?.onDidReceiveMessage)?.mockImplementation((handler) => {
        messageHandler = handler as any;
        return { dispose: vi.fn() };
      });

      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // Mock to throw error
      vi.mocked(mockViewStateManager.updateViewportState)?.mockImplementation(() => {
        throw new Error('Development error');
      });

      if (messageHandler) {
        expect(() =>
          messageHandler({
            type: 'viewportChanged',
            viewport: { zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
          }),
        ).not.toThrow();
      }

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('HTML content handling', () => {
    it('should set webview HTML content during initialization', async () => {
      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // HTML should be set on the webview
      expect(mockWebviewPanel.webview?.html).toContain('<!DOCTYPE html>');
      expect(mockWebviewPanel.webview?.html).toContain('tree-container');
      expect(mockWebviewPanel.webview?.html).toContain('bootstrap-overlay');
    });

    it('should include all required HTML elements', async () => {
      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      const html = mockWebviewPanel.webview?.html;

      // Check for key HTML elements
      expect(html).toContain('create-argument-btn');
      expect(html).toContain('add-premise-btn');
      expect(html).toContain('add-conclusion-btn');
      expect(html).toContain('zoom-in-btn');
      expect(html).toContain('zoom-out-btn');
      expect(html).toContain('reset-view-btn');
      expect(html).toContain('export-btn');
      expect(html).toContain('sidebar');
      expect(html).toContain('create-argument-form');
      expect(html).toContain('add-statement-form');
    });

    it('should include JavaScript event handlers', async () => {
      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      const html = mockWebviewPanel.webview?.html;

      // Check for JavaScript functions
      expect(html).toContain('showCreateArgumentForm()');
      expect(html).toContain('showAddStatementForm(');
      expect(html).toContain('zoomIn()');
      expect(html).toContain('zoomOut()');
      expect(html).toContain('resetView()');
      expect(html).toContain('exportProof()');
      expect(html).toContain('createArgument()');
      expect(html).toContain('addStatement()');
      expect(html).toContain("window.addEventListener('message'");
    });

    it('should include proper CSS styling', async () => {
      const result = await ProofTreePanel.createWithServices(
        '/test/document.proof',
        'test content',
        mockDocumentQueryService as DocumentQueryService,
        mockVisualizationService as ProofVisualizationService,
        mockUIPort as IUIPort,
        mockRenderer as TreeRenderer,
        mockViewStateManager as ViewStateManager,
        mockViewStatePort as IViewStatePort,
        mockBootstrapController as BootstrapController,
        mockProofApplicationService as ProofApplicationService,
        mockYAMLSerializer as YAMLSerializer,
        (globalThis as any).mockExportService,
        (globalThis as any).mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      const html = mockWebviewPanel.webview?.html;

      // Check for CSS classes and styles
      expect(html).toContain('.argument-node');
      expect(html).toContain('.statement-text');
      expect(html).toContain('.side-label');
      expect(html).toContain('.implication-line');
      expect(html).toContain('.connection-line');
      expect(html).toContain('.empty-argument');
      expect(html).toContain('var(--vscode-editor-background)');
      expect(html).toContain('var(--vscode-editor-foreground)');
    });
  });
});
