import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IExportService } from '../../application/ports/IExportService.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { IDocumentIdService } from '../../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
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

describe('ProofTreePanel Message Handling', () => {
  let _panel: ProofTreePanel;
  let mockUIPort: IUIPort;
  let mockViewStatePort: IViewStatePort;
  let mockDocumentQueryService: DocumentQueryService;
  let mockVisualizationService: ProofVisualizationService;
  let mockRenderer: TreeRenderer;
  let mockViewStateManager: ViewStateManager;
  let mockWebviewPanel: WebviewPanel;
  let messageHandler: (message: unknown) => Promise<void>;
  let mockBootstrapController: BootstrapController;
  let mockProofApplicationService: ProofApplicationService;
  let mockYAMLSerializer: YAMLSerializer;
  let mockExportService: IExportService;
  let mockDocumentIdService: IDocumentIdService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock WebviewPanel
    mockWebviewPanel = {
      id: 'test-panel',
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn((handler) => {
          // Capture the last handler that's registered
          messageHandler = handler;
          return { dispose: vi.fn() };
        }),
      },
      onDidDispose: vi.fn((_handler) => {
        return { dispose: vi.fn() };
      }),
      reveal: vi.fn(),
      dispose: vi.fn(),
    } as any;

    // Mock services
    mockUIPort = {
      // Dialog methods
      showInputBox: vi.fn().mockResolvedValue({ ok: true, value: null }),
      showQuickPick: vi.fn().mockResolvedValue({ ok: true, value: null }),
      showConfirmation: vi.fn().mockResolvedValue({ ok: true, value: false }),
      showOpenDialog: vi.fn().mockResolvedValue({ ok: true, value: null }),
      showSaveDialog: vi.fn().mockResolvedValue({ ok: true, value: null }),

      // Notification methods
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showProgress: vi.fn().mockResolvedValue(undefined),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),

      // Webview methods
      createWebviewPanel: vi.fn().mockReturnValue(mockWebviewPanel),
      postMessageToWebview: vi.fn(),

      // Theme methods
      getTheme: vi.fn().mockReturnValue({
        kind: 'light',
        colors: {},
        fonts: { default: 'Arial', monospace: 'Courier', size: 14 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),

      // Capabilities
      capabilities: vi.fn().mockReturnValue({
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      }),
      writeFile: vi.fn().mockResolvedValue(ok(undefined)),
    };

    mockViewStatePort = {
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
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
      // Mock the private properties to satisfy TypeScript
      documentRepository: {} as any,
      parser: {} as any,
      convertProofDocumentToDTO: vi.fn(),
      convertProofDocumentToAggregate: vi.fn(),
    } as any;

    mockVisualizationService = {
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          documentId: 'test-doc' as any,
          version: 1 as any,
          trees: [],
          totalDimensions: { width: 400, height: 200 } as any,
          isEmpty: true,
        }),
      ) as any,
      generateOptimizedVisualization: vi.fn(),
      getDefaultConfig: vi.fn(),
      createConfig: vi.fn(),
      getVisualizationStats: vi.fn(),
      // Mock the private properties to satisfy TypeScript
      defaultConfig: {} as any,
      layoutService: {} as any,
      validateDocument: vi.fn(),
      calculateTotalDimensions: vi.fn(),
      applyVisualEnhancements: vi.fn(),
      filterVisibleTrees: vi.fn(),
      isTreeInViewport: vi.fn(),
      mergeConfigs: vi.fn(),
    } as any;

    mockRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg>test</svg>'),
      // Mock the private properties to satisfy TypeScript
      config: {} as any,
      generateEmptyMessage: vi.fn(),
      renderAllTrees: vi.fn(),
      renderSingleTree: vi.fn(),
      renderAtomicArgument: vi.fn(),
      renderStatements: vi.fn(),
      renderConnection: vi.fn(),
      truncateText: vi.fn(),
      escapeXml: vi.fn(),
    } as any;

    mockViewStateManager = {
      subscribeToChanges: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getSelectionState: vi
        .fn()
        .mockResolvedValue(ok({ selectedNodes: [], selectedStatements: [], selectedTrees: [] })),
      getViewportState: vi
        .fn()
        .mockResolvedValue(ok({ zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } })),
      getPanelState: vi.fn().mockResolvedValue(
        ok({
          miniMapVisible: true,
          sideLabelsVisible: true,
          validationPanelVisible: false,
          panelSizes: {},
        }),
      ),
      getThemeState: vi
        .fn()
        .mockResolvedValue(ok({ colorScheme: 'auto', fontSize: 14, fontFamily: 'default' })),
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)) as any,
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)) as any,
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)) as any,
      updateThemeState: vi.fn().mockResolvedValue(ok(undefined)) as any,
      clearAllState: vi.fn().mockResolvedValue(ok(undefined)),
      // Mock the private properties to satisfy TypeScript
      observers: new Set() as any,
      storagePort: {} as any,
      notifyObservers: vi.fn(),
    } as any;

    // Create mock BootstrapController
    mockBootstrapController = {
      createBootstrapDocument: vi.fn(),
      validateBootstrapData: vi.fn(),
      createBootstrapArgument: vi.fn().mockResolvedValue(
        ok({
          success: true,
          data: {
            argumentId: 'test-arg-id',
          },
        }),
      ),
      populateEmptyArgument: vi.fn().mockResolvedValue(
        ok({
          success: true,
          data: {
            argumentId: 'test-arg-id',
          },
        }),
      ),
    } as any;

    // Create mock ProofApplicationService
    mockProofApplicationService = {
      processCommand: vi.fn(),
      validateProof: vi.fn(),
      createStatement: vi.fn().mockResolvedValue(
        ok({
          id: 'test-statement-id',
          content: 'Test statement content',
        }),
      ),
    } as any;

    // Create mock YAMLSerializer
    mockYAMLSerializer = {
      serialize: vi.fn(),
      deserialize: vi.fn(),
    } as any;

    // Create mock ExportService
    mockExportService = {
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
    } as any;

    // Create mock DocumentIdService
    mockDocumentIdService = {
      extractFromUri: vi.fn().mockReturnValue(ok('test-document')),
      validateDocumentId: vi.fn().mockReturnValue(ok('test-document')),
      generateFallbackId: vi.fn().mockReturnValue('fallback-id'),
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document')),
    } as any;

    // Create panel and capture message handler
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
      mockExportService,
      mockDocumentIdService,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      _panel = result.value;
    } else {
      throw new Error(`Panel creation failed: ${result.error.message}`);
    }

    // Wait a tick for async initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify that onDidReceiveMessage was called during panel creation
    expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

    // The message handler should have been captured by our mock
    expect(messageHandler).toBeDefined();

    // Bind the message handler to ensure proper context
    if (!messageHandler) {
      throw new Error('Message handler was not captured');
    }
  });

  describe('messageHandler verification', () => {
    it('should have captured the message handler', () => {
      expect(messageHandler).toBeDefined();
      expect(typeof messageHandler).toBe('function');
    });
  });

  describe('viewportChanged message', () => {
    it('should handle viewport changes', async () => {
      const viewportData = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };

      // Call the handler
      await messageHandler({
        type: 'viewportChanged',
        ...viewportData,
      });

      // Since viewport messages are delegated to stateManager, check that updateViewportState was eventually called
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalled();
    });

    it('should handle invalid viewport data gracefully', async () => {
      // Mock validation to fail for invalid data
      vi.clearAllMocks();

      await messageHandler({
        type: 'viewportChanged',
        zoom: -1, // Invalid zoom
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      });

      // Should not call updateViewportState with invalid zoom
      expect(mockViewStateManager.updateViewportState).not.toHaveBeenCalled();
    });

    it('should handle missing viewport data', async () => {
      vi.clearAllMocks();

      await messageHandler({
        type: 'viewportChanged',
        // Missing required viewport data
      });

      // Should not call updateViewportState without proper data
      expect(mockViewStateManager.updateViewportState).not.toHaveBeenCalled();
    });
  });

  describe('panelStateChanged message', () => {
    it('should handle panel state changes', async () => {
      const panelData = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: true,
        panelSizes: { left: 300, right: 400 },
      };

      await messageHandler({
        type: 'panelStateChanged',
        ...panelData,
      });

      expect(mockViewStateManager.updatePanelState).toHaveBeenCalled();
    });

    it('should handle partial panel data', async () => {
      const partialPanelData = {
        miniMapVisible: true,
        sideLabelsVisible: false,
        validationPanelVisible: false,
        panelSizes: {}, // Empty but valid
      };

      vi.clearAllMocks();

      await messageHandler({
        type: 'panelStateChanged',
        ...partialPanelData,
      });

      expect(mockViewStateManager.updatePanelState).toHaveBeenCalled();
    });
  });

  describe('selectionChanged message', () => {
    it('should handle selection changes', async () => {
      const selectionData = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1'],
        selectedTrees: ['tree1'],
      };

      await messageHandler({
        type: 'selectionChanged',
        ...selectionData,
      });

      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalled();
    });

    it('should handle empty selections', async () => {
      const emptySelection = {
        selectedNodes: [],
        selectedStatements: [],
        selectedTrees: [],
      };

      vi.clearAllMocks();

      await messageHandler({
        type: 'selectionChanged',
        ...emptySelection,
      });

      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalled();
    });
  });

  describe('createArgument message', () => {
    it('should handle valid argument creation', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: ['All humans are mortal', 'Socrates is human'],
        conclusions: ['Socrates is mortal'],
        ruleName: 'Modus Ponens',
      });

      // Should call bootstrap controller to create the argument
      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalled();
    });

    it('should validate premises requirement', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: [],
        conclusions: ['Conclusion'],
        ruleName: 'Test Rule',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'At least one premise is required',
        }),
      );
    });

    it('should validate conclusions requirement', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: ['Premise'],
        conclusions: [],
        ruleName: 'Test Rule',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'At least one conclusion is required',
        }),
      );
    });

    it('should handle invalid premises data', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: 'not an array',
        conclusions: ['Conclusion'],
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'At least one premise is required',
        }),
      );
    });

    it('should handle invalid conclusions data', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: ['Premise'],
        conclusions: null,
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'At least one conclusion is required',
        }),
      );
    });

    it('should handle missing document ID gracefully', async () => {
      // Mock documentIdService to return error for empty URI
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValueOnce(
        err(new ValidationError('Invalid URI')),
      );

      // Create a new webview panel mock for this test
      let capturedHandler: any;
      const testWebviewPanel = {
        id: 'test-panel-2',
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn((handler) => {
            capturedHandler = handler;
            return { dispose: vi.fn() };
          }),
        },
        onDidDispose: vi.fn(() => {
          return { dispose: vi.fn() };
        }),
        reveal: vi.fn(),
        dispose: vi.fn(),
      } as any;

      // Mock UIPort to return the test webview panel
      const testUIPort = {
        ...mockUIPort,
        createWebviewPanel: vi.fn().mockReturnValue(testWebviewPanel),
      };

      // Create panel with empty URI
      const panelResult = await ProofTreePanel.createWithServices(
        '',
        'test content',
        mockDocumentQueryService,
        mockVisualizationService,
        testUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYAMLSerializer,
        mockExportService,
        mockDocumentIdService,
      );

      expect(panelResult.isOk()).toBe(true);

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify handler was captured
      expect(capturedHandler).toBeDefined();

      // Call the handler with a createArgument message
      await capturedHandler({
        type: 'createArgument',
        premises: ['Premise'],
        conclusions: ['Conclusion'],
      });

      expect(testUIPort.showError).toHaveBeenCalledWith('Could not determine document ID');
    });

    it('should handle creation errors gracefully', async () => {
      vi.mocked(mockUIPort.showError).mockImplementation(() => {
        throw new Error('UI error');
      });

      // Should not throw
      expect(() =>
        messageHandler({
          type: 'createArgument',
          premises: ['Premise'],
          conclusions: ['Conclusion'],
        }),
      ).not.toThrow();
    });
  });

  describe('addStatement message', () => {
    it('should handle adding premise statement', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: 'New premise statement',
      });

      // Should call the proof application service to create a statement
      expect(mockProofApplicationService.createStatement).toHaveBeenCalled();
    });

    it('should handle adding conclusion statement', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'conclusion',
        content: 'New conclusion statement',
      });

      // Should call the proof application service to create a statement
      expect(mockProofApplicationService.createStatement).toHaveBeenCalled();
    });

    it('should validate statement content', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: '',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Statement content cannot be empty',
        }),
      );
    });

    it('should handle whitespace-only content', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: '   \n\t  ',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Statement content cannot be empty',
        }),
      );
    });

    it('should handle missing content', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Statement content cannot be empty',
        }),
      );
    });

    it('should handle statement addition errors gracefully', async () => {
      vi.mocked(mockUIPort.showInformation).mockImplementation(() => {
        throw new Error('UI error');
      });

      expect(() =>
        messageHandler({
          type: 'addStatement',
          statementType: 'premise',
          content: 'Valid content',
        }),
      ).not.toThrow();
    });
  });

  describe('exportProof message', () => {
    it('should handle export request', async () => {
      // Mock the quick pick selection
      vi.mocked(mockUIPort.showQuickPick).mockResolvedValue(
        ok({ label: 'YAML (.proof)', description: 'Export as YAML proof file' }),
      );

      await messageHandler({
        type: 'exportProof',
      });

      expect(mockUIPort.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ label: 'YAML (.proof)' })]),
        expect.any(Object),
      );
    });

    it('should handle export errors gracefully', async () => {
      vi.mocked(mockUIPort.showError).mockImplementation(() => {
        throw new Error('UI error');
      });

      expect(() =>
        messageHandler({
          type: 'exportProof',
        }),
      ).not.toThrow();
    });
  });

  describe('showError message', () => {
    it('should handle error display request', async () => {
      await messageHandler({
        type: 'showError',
        message: 'Test error message',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Test error message',
        }),
      );
    });

    it('should handle missing error message', async () => {
      await messageHandler({
        type: 'showError',
      });

      // When message is missing, no showError should be called since NotificationMessage.create will fail
      expect(mockUIPort.showError).not.toHaveBeenCalled();
    });
  });

  describe('Unknown message types', () => {
    it('should handle unknown message types gracefully', async () => {
      expect(() =>
        messageHandler({
          type: 'unknownMessageType',
          data: 'some data',
        }),
      ).not.toThrow();

      // Should not call any specific handlers
      expect(mockViewStateManager.updateViewportState).not.toHaveBeenCalled();
      expect(mockUIPort.showError).not.toHaveBeenCalled();
    });

    it('should handle malformed messages', async () => {
      expect(() => messageHandler('not an object')).not.toThrow();
      expect(() => messageHandler(null)).not.toThrow();
      expect(() => messageHandler(undefined)).not.toThrow();
      expect(() => messageHandler(123)).not.toThrow();
    });

    it('should handle messages without type', async () => {
      expect(() =>
        messageHandler({
          data: 'some data',
        }),
      ).not.toThrow();
    });
  });

  describe('Message handling errors', () => {
    it('should handle view state update errors gracefully', async () => {
      vi.mocked(mockViewStateManager.updateViewportState).mockRejectedValue(
        new Error('State update failed'),
      );

      expect(() =>
        messageHandler({
          type: 'viewportChanged',
          viewport: { zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        }),
      ).not.toThrow();
    });

    it('should handle unexpected errors during message processing', async () => {
      // Mock method to throw unexpected error
      const originalUpdateViewportState = mockViewStateManager.updateViewportState;
      vi.mocked(mockViewStateManager.updateViewportState).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      expect(() =>
        messageHandler({
          type: 'viewportChanged',
          viewport: { zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        }),
      ).not.toThrow();

      // Restore original method
      vi.mocked(mockViewStateManager.updateViewportState).mockImplementation(
        originalUpdateViewportState,
      );
    });
  });

  describe('Document ID extraction', () => {
    it('should extract document ID from various URI formats', async () => {
      // Just verify that the document ID service is used during panel creation
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(ok('test-id'));

      const panelResult = await ProofTreePanel.createWithServices(
        '/path/to/document.proof',
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
        mockExportService,
        mockDocumentIdService,
      );

      expect(panelResult.isOk()).toBe(true);
      // The service should have been called during panel creation
      expect(mockDocumentIdService.extractFromUriWithFallback).toHaveBeenCalled();
    });

    it('should handle edge cases in document ID extraction', async () => {
      // Test that panel creation succeeds even when document ID extraction fails
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        err(new ValidationError('Invalid URI')),
      );

      const panelResult = await ProofTreePanel.createWithServices(
        '',
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
        mockExportService,
        mockDocumentIdService,
      );

      // Panel creation should still succeed with fallback
      expect(panelResult.isOk()).toBe(true);
    });

    it('should handle extraction errors gracefully', async () => {
      // First create panel with valid mock
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        ok('test-document'),
      );

      const panelResult = await ProofTreePanel.createWithServices(
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
        mockExportService,
        mockDocumentIdService,
      );

      expect(panelResult.isOk()).toBe(true);

      // Verify error handling - when a message needs document ID and it fails
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        err(new ValidationError('Failed to extract ID')),
      );

      // Try to create argument which requires document ID
      await messageHandler({
        type: 'createArgument',
        premises: ['Test premise'],
        conclusions: ['Test conclusion'],
      });

      // Should show error about missing document ID
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Could not determine document ID',
        }),
      );
    });
  });

  describe('Content refresh', () => {
    it('should handle refresh content requests', async () => {
      // refreshContent is called internally by message handlers
      // Let's test it through a message that triggers refresh
      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'test-doc-id' as any,
          version: 1 as any,
          trees: [],
          totalDimensions: { width: 800, height: 600 } as any,
          isEmpty: false,
        }),
      );

      await messageHandler({
        type: 'createArgument',
        premises: ['Test premise'],
        conclusions: ['Test conclusion'],
      });

      // Should have called visualization service
      expect(mockVisualizationService.generateVisualization).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      // Mock visualization to return error
      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        err(new ValidationError('Visualization failed')),
      );

      // Should not throw even with errors
      await expect(
        messageHandler({
          type: 'createArgument',
          premises: ['Test premise'],
          conclusions: ['Test conclusion'],
        }),
      ).resolves.not.toThrow();
    });
  });
});
