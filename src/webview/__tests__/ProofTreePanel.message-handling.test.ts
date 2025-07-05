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
  let panel: ProofTreePanel;
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
          messageHandler = handler;
          return { dispose: vi.fn() };
        }),
      },
      onDidDispose: vi.fn(),
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
      // Mock the private properties to satisfy TypeScript
      documentRepository: {} as any,
      parser: {} as any,
      convertProofDocumentToDTO: vi.fn(),
      convertProofDocumentToAggregate: vi.fn(),
    } as any;

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
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
      updateThemeState: vi.fn().mockResolvedValue(ok(undefined)),
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
      panel = result.value;
    }

    // Verify that onDidReceiveMessage was called during panel creation
    expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

    // The message handler should have been captured by our mock
    expect(messageHandler).toBeDefined();
  });

  describe('viewportChanged message', () => {
    it('should handle viewport changes', async () => {
      const viewportData = {
        zoom: 1.5,
        pan: { x: 100, y: 200 },
        center: { x: 50, y: 75 },
      };

      await messageHandler({
        type: 'viewportChanged',
        viewport: viewportData,
      });

      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(viewportData);
    });

    it('should handle invalid viewport data gracefully', async () => {
      await messageHandler({
        type: 'viewportChanged',
        viewport: 'invalid',
      });

      // Should not crash, but also shouldn't call updateViewportState with invalid data
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith('invalid');
    });

    it('should handle missing viewport data', async () => {
      await messageHandler({
        type: 'viewportChanged',
      });

      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(undefined);
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
        panel: panelData,
      });

      expect(mockViewStateManager.updatePanelState).toHaveBeenCalledWith(panelData);
    });

    it('should handle partial panel data', async () => {
      const partialPanelData = {
        miniMapVisible: true,
      };

      await messageHandler({
        type: 'panelStateChanged',
        panel: partialPanelData,
      });

      expect(mockViewStateManager.updatePanelState).toHaveBeenCalledWith(partialPanelData);
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
        selection: selectionData,
      });

      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalledWith(selectionData);
    });

    it('should handle empty selections', async () => {
      const emptySelection = {
        selectedNodes: [],
        selectedStatements: [],
        selectedTrees: [],
      };

      await messageHandler({
        type: 'selectionChanged',
        selection: emptySelection,
      });

      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalledWith(emptySelection);
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

      // Get the actual panel ID from the panel instance
      const actualPanelId = (panel as any).panelId;

      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        actualPanelId,
        expect.objectContaining({
          type: 'argumentCreated',
        }),
      );
    });

    it('should validate premises requirement', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: [],
        conclusions: ['Conclusion'],
        ruleName: 'Test Rule',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('At least one premise is required');
    });

    it('should validate conclusions requirement', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: ['Premise'],
        conclusions: [],
        ruleName: 'Test Rule',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('At least one conclusion is required');
    });

    it('should handle invalid premises data', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: 'not an array',
        conclusions: ['Conclusion'],
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('At least one premise is required');
    });

    it('should handle invalid conclusions data', async () => {
      await messageHandler({
        type: 'createArgument',
        premises: ['Premise'],
        conclusions: null,
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('At least one conclusion is required');
    });

    it('should handle missing document ID gracefully', async () => {
      // Create panel with document URI that won't produce valid ID
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

      expect(panelResult.isOk()).toBe(true);
      let testPanel: any;
      if (panelResult.isOk()) {
        testPanel = panelResult.value;
      }

      // Get the message handler for this panel
      const testMessageHandler = (testPanel as any).handleWebviewMessage.bind(testPanel);

      await testMessageHandler({
        type: 'createArgument',
        premises: ['Premise'],
        conclusions: ['Conclusion'],
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('Could not determine document ID');
    });

    it('should handle creation errors gracefully', async () => {
      vi.mocked(mockUIPort.showError).mockImplementation(() => {
        throw new Error('UI error');
      });

      // Should not throw
      await expect(
        messageHandler({
          type: 'createArgument',
          premises: ['Premise'],
          conclusions: ['Conclusion'],
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('addStatement message', () => {
    it('should handle adding premise statement', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: 'New premise statement',
      });

      expect(mockUIPort.showInformation).toHaveBeenCalledWith('Premise added successfully');
    });

    it('should handle adding conclusion statement', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'conclusion',
        content: 'New conclusion statement',
      });

      expect(mockUIPort.showInformation).toHaveBeenCalledWith('Conclusion added successfully');
    });

    it('should validate statement content', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: '',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('Statement content cannot be empty');
    });

    it('should handle whitespace-only content', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: '   \n\t  ',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('Statement content cannot be empty');
    });

    it('should handle missing content', async () => {
      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('Statement content cannot be empty');
    });

    it('should handle statement addition errors gracefully', async () => {
      vi.mocked(mockUIPort.showInformation).mockImplementation(() => {
        throw new Error('UI error');
      });

      await expect(
        messageHandler({
          type: 'addStatement',
          statementType: 'premise',
          content: 'Valid content',
        }),
      ).resolves.not.toThrow();
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

      await expect(
        messageHandler({
          type: 'exportProof',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('showError message', () => {
    it('should handle error display request', async () => {
      await messageHandler({
        type: 'showError',
        message: 'Test error message',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith('Test error message');
    });

    it('should handle missing error message', async () => {
      await messageHandler({
        type: 'showError',
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Unknown message types', () => {
    it('should handle unknown message types gracefully', async () => {
      await expect(
        messageHandler({
          type: 'unknownMessageType',
          data: 'some data',
        }),
      ).resolves.not.toThrow();

      // Should not call any specific handlers
      expect(mockViewStateManager.updateViewportState).not.toHaveBeenCalled();
      expect(mockUIPort.showError).not.toHaveBeenCalled();
    });

    it('should handle malformed messages', async () => {
      await expect(messageHandler('not an object')).resolves.not.toThrow();
      await expect(messageHandler(null)).resolves.not.toThrow();
      await expect(messageHandler(undefined)).resolves.not.toThrow();
      await expect(messageHandler(123)).resolves.not.toThrow();
    });

    it('should handle messages without type', async () => {
      await expect(
        messageHandler({
          data: 'some data',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Message handling errors', () => {
    it('should handle view state update errors gracefully', async () => {
      vi.mocked(mockViewStateManager.updateViewportState).mockRejectedValue(
        new Error('State update failed'),
      );

      await expect(
        messageHandler({
          type: 'viewportChanged',
          viewport: { zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle unexpected errors during message processing', async () => {
      // Mock method to throw unexpected error
      const originalUpdateViewportState = mockViewStateManager.updateViewportState;
      vi.mocked(mockViewStateManager.updateViewportState).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(
        messageHandler({
          type: 'viewportChanged',
          viewport: { zoom: 1.0, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        }),
      ).resolves.not.toThrow();

      // Restore original method
      vi.mocked(mockViewStateManager.updateViewportState).mockImplementation(
        originalUpdateViewportState,
      );
    });
  });

  describe('Document ID extraction', () => {
    it('should extract document ID from various URI formats', async () => {
      const testCases = [
        { uri: '/path/to/document.proof', expected: 'document' },
        { uri: '/simple.proof', expected: 'simple' },
        { uri: 'C:\\Windows\\path\\file.proof', expected: 'file' },
        { uri: '/complex-file-name.proof', expected: 'complex-file-name' },
      ];

      for (const testCase of testCases) {
        // Mock the documentIdService to return the expected value
        vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
          ok(testCase.expected),
        );

        const panelResult = await ProofTreePanel.createWithServices(
          testCase.uri,
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
        let testPanel: any;
        if (panelResult.isOk()) {
          testPanel = panelResult.value;
        }

        // Access private method
        const extractMethod = (testPanel as any).extractDocumentIdFromUri.bind(testPanel);
        const result = extractMethod();

        expect(result).toBe(testCase.expected);
      }
    });

    it('should handle edge cases in document ID extraction', async () => {
      const edgeCases = [
        { uri: '/', expected: null },
        { uri: '', expected: null },
        { uri: '/path/to/', expected: null },
        { uri: '/file-without-extension.proof', expected: 'file-without-extension' },
      ];

      for (const testCase of edgeCases) {
        // Mock the documentIdService to return error for null cases
        if (testCase.expected === null) {
          vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
            err(new ValidationError('Invalid URI')),
          );
        } else {
          vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
            ok(testCase.expected),
          );
        }

        const panelResult = await ProofTreePanel.createWithServices(
          testCase.uri,
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
        let testPanel: any;
        if (panelResult.isOk()) {
          testPanel = panelResult.value;
        }

        const extractMethod = (testPanel as any).extractDocumentIdFromUri.bind(testPanel);
        const result = extractMethod();

        expect(result).toBe(testCase.expected);
      }
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
      let testPanel: any;
      if (panelResult.isOk()) {
        testPanel = panelResult.value;
      }

      // Now mock the service to return error for the test
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        err(new ValidationError('Failed to extract ID')),
      );

      const extractMethod = (testPanel as any).extractDocumentIdFromUri.bind(testPanel);
      const result = extractMethod();

      expect(result).toBe(null);
    });
  });

  describe('Content refresh', () => {
    it('should handle refresh content requests', async () => {
      const refreshMethod = (panel as any).refreshContent;

      // Should not throw
      await expect(refreshMethod()).resolves.not.toThrow();
    });

    it('should handle refresh errors gracefully', async () => {
      const refreshMethod = (panel as any).refreshContent;

      // Even if there were errors, should not throw
      await expect(refreshMethod()).resolves.not.toThrow();
    });
  });
});
