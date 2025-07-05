import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ValidationError } from '../../domain/shared/result.js';
import { createTestContainer, resetContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import {
  createOrShowProofTreePanel,
  ProofTreePanelLegacy,
  updateProofTreePanelContent,
} from '../ProofTreePanelLegacy.js';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    activeTextEditor: null as any,
  },
  ViewColumn: {
    One: 1,
  },
  Uri: {
    file: vi.fn(),
  },
}));

// Mock the global container to use our test container
const mockContainer = createTestContainer();

// Mock getContainer to return our test container
vi.mock('../../infrastructure/di/container.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../infrastructure/di/container.js')>();
  return {
    ...original,
    getContainer: () => mockContainer,
  };
});

// Mock ProofTreePanel
vi.mock('../ProofTreePanel.js', () => ({
  ProofTreePanel: {
    createWithServices: vi.fn(),
  },
}));

describe('ProofTreePanelLegacy Edge Cases', () => {
  const mockPanel = {
    webview: {
      html: '',
      postMessage: vi.fn(),
      onDidReceiveMessage: vi.fn(),
    },
    onDidDispose: vi.fn(),
    reveal: vi.fn(),
    dispose: vi.fn(),
  };

  const mockExtensionUri = { scheme: 'file', path: '/test' } as vscode.Uri;

  let mockProofTreePanel: any;
  let mockDocumentQueryService: any;
  let mockProofVisualizationService: any;
  let mockTreeRenderer: any;
  let mockViewStateManager: any;
  let mockViewStatePort: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

    // Reset static state
    (ProofTreePanelLegacy as any).currentPanel = undefined;
    (ProofTreePanelLegacy as any).creationPromise = undefined;
    (ProofTreePanelLegacy as any).lastCreationError = undefined;

    // Reset container
    resetContainer();

    // Create mock services
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

    mockProofVisualizationService = {
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

    mockTreeRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg>test</svg>'),
    };

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
        .mockResolvedValue(
          ok({ colorScheme: 'auto' as const, fontSize: 14, fontFamily: 'default' }),
        ),
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
    };

    mockViewStatePort = {
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
    };

    mockProofTreePanel = {
      reveal: vi.fn(),
      updateContent: vi.fn().mockResolvedValue(ok(undefined)),
      dispose: vi.fn(),
      onDidDispose: vi.fn(),
      getDocumentUri: vi.fn().mockReturnValue('legacy-document'),
      getPanelId: vi.fn().mockReturnValue('legacy-panel'),
    };

    // Register dependencies in test container
    mockContainer.registerInstance(TOKENS.DocumentQueryService, mockDocumentQueryService);
    mockContainer.registerInstance(TOKENS.ProofVisualizationService, mockProofVisualizationService);
    mockContainer.registerInstance(TOKENS.TreeRenderer, mockTreeRenderer);
    mockContainer.registerInstance(TOKENS.ViewStateManager, mockViewStateManager);
    mockContainer.registerInstance(TOKENS.IViewStatePort, mockViewStatePort);

    // Ensure isRegistered returns true for all registered services by default
    vi.spyOn(mockContainer, 'isRegistered').mockReturnValue(true);

    // Mock resolve method to return our mocked services
    vi.spyOn(mockContainer, 'resolve').mockImplementation((token: string) => {
      switch (token) {
        case TOKENS.DocumentQueryService:
          return mockDocumentQueryService;
        case TOKENS.ProofVisualizationService:
          return mockProofVisualizationService;
        case TOKENS.TreeRenderer:
          return mockTreeRenderer;
        case TOKENS.ViewStateManager:
          return mockViewStateManager;
        case TOKENS.IViewStatePort:
          return mockViewStatePort;
        default:
          throw new Error(`Unknown token: ${token}`);
      }
    });
  });

  describe('safeLegacyResolve edge cases', () => {
    it('should handle missing service registrations', () => {
      // Mock container to return false for some services
      vi.spyOn(mockContainer, 'isRegistered').mockImplementation((token) => {
        return token !== TOKENS.DocumentQueryService;
      });

      const resolveMethod = (ProofTreePanelLegacy as any).safeLegacyResolve;
      const result = resolveMethod();

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('Required service');
    });

    it('should handle container resolution errors', () => {
      // Override the default isRegistered mock to return true for all services
      vi.spyOn(mockContainer, 'isRegistered').mockReturnValue(true);
      vi.spyOn(mockContainer, 'resolve').mockImplementation(() => {
        throw new Error('Container resolution failed');
      });

      const resolveMethod = (ProofTreePanelLegacy as any).safeLegacyResolve;
      const result = resolveMethod();

      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('Failed to resolve legacy dependencies');
    });

    it('should handle successful resolution', () => {
      const resolveMethod = (ProofTreePanelLegacy as any).safeLegacyResolve;
      const result = resolveMethod();

      expect(result.isOk()).toBe(true);
      expect(result.value).toHaveProperty('documentQueryService');
      expect(result.value).toHaveProperty('visualizationService');
      expect(result.value).toHaveProperty('renderer');
      expect(result.value).toHaveProperty('viewStateManager');
      expect(result.value).toHaveProperty('viewStatePort');
    });
  });

  describe('createOrShow with various editor states', () => {
    it('should handle active text editor with view column', async () => {
      const mockEditor = {
        viewColumn: 2,
        document: { uri: vscode.Uri.file('/test/file.proof') },
      };
      (vscode.window as any).activeTextEditor = mockEditor;

      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        2,
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockExtensionUri],
        }),
      );
    });

    it('should handle no active text editor', async () => {
      (vscode.window as any).activeTextEditor = null;

      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        1, // Default to ViewColumn.One
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockExtensionUri],
        }),
      );
    });

    it('should handle active text editor with undefined view column', async () => {
      const mockEditor = {
        viewColumn: undefined,
        document: { uri: vscode.Uri.file('/test/file.proof') },
      };
      (vscode.window as any).activeTextEditor = mockEditor;

      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        1, // Default to ViewColumn.One when undefined
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockExtensionUri],
        }),
      );
    });
  });

  describe('Panel creation promise handling', () => {
    it('should handle concurrent creation requests', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));

      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: any) => void = () => {
        /* intentionally empty until assigned */
      };
      const createPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(ProofTreePanel.createWithServices).mockReturnValue(createPromise as any);

      // First call - should start creation
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'content 1');
      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(false);

      // Second call while first is still creating - should wait
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'content 2');

      // Resolve the creation promise
      resolvePromise(ok(mockProofTreePanel));

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProofTreePanel.reveal).toHaveBeenCalled();
      expect(mockProofTreePanel.updateContent).toHaveBeenCalledWith('content 2');
    });

    it('should handle panel creation errors', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      const createError = new ValidationError('Panel creation failed');
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(err(createError));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to create proof tree panel: Panel creation failed',
      );
      expect(ProofTreePanelLegacy.getLastCreationError()).toBe('Panel creation failed');
    });

    it('should handle unexpected errors during panel creation', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      const unexpectedError = new Error('Unexpected error');
      vi.mocked(ProofTreePanel.createWithServices).mockRejectedValue(unexpectedError);

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to create proof tree panel: Error: Unexpected error',
      );
      expect(ProofTreePanelLegacy.getLastCreationError()).toBe(
        'Unexpected error: Error: Unexpected error',
      );
    });

    it('should clear creation promise after successful creation', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for async operations
      await ProofTreePanelLegacy.waitForCreation();

      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(true);
      expect((ProofTreePanelLegacy as any).creationPromise).toBeUndefined();
    });

    it('should clear creation promise after failed creation', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(
        err(new ValidationError('Creation failed')),
      );

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for async operations
      await ProofTreePanelLegacy.waitForCreation();

      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(false);
      expect((ProofTreePanelLegacy as any).creationPromise).toBeUndefined();
    });
  });

  describe('Panel disposal handling', () => {
    it('should clean up state when panel is disposed', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      let disposeCallback: (() => void) | undefined;
      vi.mocked(mockProofTreePanel.onDidDispose).mockImplementation((callback: () => void) => {
        disposeCallback = callback;
      });

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for creation
      await ProofTreePanelLegacy.waitForCreation();

      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(true);

      // Simulate panel disposal
      if (disposeCallback) {
        disposeCallback();
      }

      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(false);
      expect((ProofTreePanelLegacy as any).creationPromise).toBeUndefined();
    });
  });

  describe('updateContentIfExists edge cases', () => {
    it('should handle update when panel exists', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'initial content');
      await ProofTreePanelLegacy.waitForCreation();

      ProofTreePanelLegacy.updateContentIfExists('updated content');

      expect(mockProofTreePanel.updateContent).toHaveBeenCalledWith('updated content');
    });

    it('should handle update when panel is being created', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));

      // Create a delayed promise
      let resolvePromise: (value: any) => void = () => {
        /* intentionally empty until assigned */
      };
      const createPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(ProofTreePanel.createWithServices).mockReturnValue(createPromise as any);

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'initial content');

      // Try to update while creation is pending
      ProofTreePanelLegacy.updateContentIfExists('updated content');

      // Resolve creation
      resolvePromise(ok(mockProofTreePanel));

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProofTreePanel.updateContent).toHaveBeenCalledWith('updated content');
    });

    it('should handle update when no panel exists', () => {
      // Should not throw
      expect(() => {
        ProofTreePanelLegacy.updateContentIfExists('content');
      }).not.toThrow();
    });

    it('should handle update content errors gracefully', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'initial content');
      await ProofTreePanelLegacy.waitForCreation();

      // Mock updateContent to throw error
      vi.mocked(mockProofTreePanel.updateContent).mockRejectedValue(
        new Error('Update content failed'),
      );

      // Should not throw
      expect(() => {
        ProofTreePanelLegacy.updateContentIfExists('updated content');
      }).not.toThrow();
    });
  });

  describe('Legacy UI port capabilities', () => {
    it('should create UI port with proper legacy capabilities', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));

      let capturedUIPort: any;
      vi.mocked(ProofTreePanel.createWithServices).mockImplementation(
        (
          _uri: any,
          _content: any,
          _docs: any,
          _viz: any,
          uiPort: any,
          _renderer: any,
          _viewState: any,
          _viewStatePort: any,
        ) => {
          capturedUIPort = uiPort;
          return Promise.resolve(ok(mockProofTreePanel));
        },
      );

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for creation
      await ProofTreePanelLegacy.waitForCreation();

      expect(capturedUIPort).toBeDefined();

      // Test UI port capabilities
      const capabilities = capturedUIPort.capabilities();
      expect(capabilities.supportsWebviews).toBe(true);
      expect(capabilities.supportsFileDialogs).toBe(false);
      expect(capabilities.supportsProgress).toBe(false);

      // Test unsupported methods
      const inputResult = await capturedUIPort.showInputBox();
      expect(inputResult.isErr()).toBe(true);

      const pickResult = await capturedUIPort.showQuickPick();
      expect(pickResult.isErr()).toBe(true);

      const confirmResult = await capturedUIPort.showConfirmation();
      expect(confirmResult.isErr()).toBe(true);

      const openResult = await capturedUIPort.showOpenDialog();
      expect(openResult.isErr()).toBe(true);

      const saveResult = await capturedUIPort.showSaveDialog();
      expect(saveResult.isErr()).toBe(true);

      // Test progress throws
      await expect(capturedUIPort.showProgress()).rejects.toThrow(
        'Progress not supported in legacy mode',
      );

      // Test theme methods
      const theme = capturedUIPort.getTheme();
      expect(theme.kind).toBe('dark');

      const statusDisposable = capturedUIPort.setStatusMessage('test');
      expect(statusDisposable.dispose).toBeDefined();

      const themeDisposable = capturedUIPort.onThemeChange(() => {
        /* Theme change handler - intentionally empty for test */
      });
      expect(themeDisposable.dispose).toBeDefined();
    });

    it('should handle webview panel forwarding correctly', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));

      let capturedWebviewPanel: any;
      vi.mocked(ProofTreePanel.createWithServices).mockImplementation(
        (
          _uri: any,
          _content: any,
          _docs: any,
          _viz: any,
          uiPort: any,
          _renderer: any,
          _viewState: any,
          _viewStatePort: any,
        ) => {
          capturedWebviewPanel = uiPort.createWebviewPanel({
            id: 'test',
            title: 'Test',
            viewType: 'test',
            showOptions: { viewColumn: 1 },
            retainContextWhenHidden: true,
            enableScripts: true,
          });
          return Promise.resolve(ok(mockProofTreePanel));
        },
      );

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');
      await ProofTreePanelLegacy.waitForCreation();

      expect(capturedWebviewPanel).toBeDefined();

      // Test HTML forwarding
      capturedWebviewPanel.webview.html = '<html>test</html>';
      expect(mockPanel.webview.html).toBe('<html>test</html>');

      const retrievedHtml = capturedWebviewPanel.webview.html;
      expect(retrievedHtml).toBe('<html>test</html>');

      // Test method forwarding
      capturedWebviewPanel.reveal(2, true);
      expect(mockPanel.reveal).toHaveBeenCalledWith(2, true);

      capturedWebviewPanel.dispose();
      expect(mockPanel.dispose).toHaveBeenCalled();

      // Test event handler forwarding
      const callback = vi.fn();
      capturedWebviewPanel.onDidDispose(callback);
      expect(mockPanel.onDidDispose).toHaveBeenCalledWith(callback);

      capturedWebviewPanel.webview.onDidReceiveMessage(callback);
      expect(mockPanel.webview.onDidReceiveMessage).toHaveBeenCalledWith(callback);
    });
  });

  describe('Legacy compatibility functions', () => {
    it('should handle createOrShowProofTreePanel without document URI', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      createOrShowProofTreePanel(mockExtensionUri, 'test content');

      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });

    it('should handle createOrShowProofTreePanel with document URI', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      createOrShowProofTreePanel(mockExtensionUri, 'test content', '/test/document.proof');

      // Should fallback to legacy mode for now
      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });

    it('should handle updateProofTreePanelContent', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      // Create a panel first
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'initial content');
      await ProofTreePanelLegacy.waitForCreation();

      updateProofTreePanelContent('updated content');

      expect(mockProofTreePanel.updateContent).toHaveBeenCalledWith('updated content');
    });

    it('should handle updateProofTreePanelContent with document URI', () => {
      updateProofTreePanelContent('content', '/test/document.proof');

      // Should not throw when no panel exists
      expect(() => {
        updateProofTreePanelContent('content', '/test/document.proof');
      }).not.toThrow();
    });
  });

  describe('Test helper methods', () => {
    it('should handle waitForCreation when no promise exists', async () => {
      await expect(ProofTreePanelLegacy.waitForCreation()).resolves.not.toThrow();
    });

    it('should handle waitForCreation with existing promise', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      await expect(ProofTreePanelLegacy.waitForCreation()).resolves.not.toThrow();
      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(true);
    });

    it('should return correct panel existence status', async () => {
      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(false);

      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockProofTreePanel));

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');
      await ProofTreePanelLegacy.waitForCreation();

      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(true);
    });

    it('should return undefined for last creation error when none exists', () => {
      expect(ProofTreePanelLegacy.getLastCreationError()).toBeUndefined();
    });

    it('should return last creation error after error occurs', async () => {
      const { ProofTreePanel } = vi.mocked(await import('../ProofTreePanel.js'));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(
        err(new ValidationError('Test error')),
      );

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');
      await ProofTreePanelLegacy.waitForCreation();

      expect(ProofTreePanelLegacy.getLastCreationError()).toBe('Test error');
    });
  });

  describe('Service registration failure cases', () => {
    it('should show error when service resolution fails', () => {
      // Mock container to fail registration check
      vi.spyOn(mockContainer, 'isRegistered').mockReturnValue(false);

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize proof tree panel'),
      );
    });

    it('should handle vs code webview creation errors', () => {
      vi.mocked(vscode.window.createWebviewPanel).mockImplementation(() => {
        throw new Error('VS Code webview creation failed');
      });

      expect(() => {
        ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');
      }).toThrow('VS Code webview creation failed');
    });
  });
});
