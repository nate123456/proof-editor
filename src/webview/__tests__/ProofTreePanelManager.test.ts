import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import { ProofTreePanelManager } from '../ProofTreePanelManager.js';
import type { TreeRenderer } from '../TreeRenderer.js';

// Mock ProofTreePanel
vi.mock('../ProofTreePanel.js', () => ({
  ProofTreePanel: {
    createWithServices: vi.fn(),
  },
}));

// Mock the DI container - will be set up in describe block
vi.mock('../../infrastructure/di/container.js', () => ({
  getContainer: vi.fn(),
}));

// Mock TOKENS
vi.mock('../../infrastructure/di/tokens.js', () => ({
  TOKENS: {
    DocumentQueryService: 'DocumentQueryService',
    ProofVisualizationService: 'ProofVisualizationService',
    TreeRenderer: 'TreeRenderer',
    ViewStateManager: 'ViewStateManager',
    IViewStatePort: 'IViewStatePort',
  },
}));

describe('ProofTreePanelManager', () => {
  let manager: ProofTreePanelManager;
  let mockUIPort: IUIPort;
  let mockViewStatePort: IViewStatePort;
  let mockDocumentQueryService: DocumentQueryService;
  let mockVisualizationService: ProofVisualizationService;
  let mockRenderer: TreeRenderer;
  let mockViewStateManager: ViewStateManager;
  let mockPanel: ProofTreePanel;
  let mockContainer: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset singleton instance
    (ProofTreePanelManager as any).instance = undefined;

    // Get fresh manager instance
    manager = ProofTreePanelManager.getInstance();

    // Clear any existing panels
    (manager as any).panels.clear();

    // Mock services
    mockUIPort = {
      createWebviewPanel: vi.fn(),
      postMessageToWebview: vi.fn(),
      showError: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
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
      getDocumentById: vi.fn(),
      getDocumentWithStats: vi.fn(),
      documentRepository: {} as any,
      parser: {} as any,
    } as any;

    mockVisualizationService = {
      generateVisualization: vi.fn(),
      generateOptimizedVisualization: vi.fn(),
      getDefaultConfig: vi.fn(),
      createConfig: vi.fn(),
      getVisualizationStats: vi.fn(),
    } as any;

    mockRenderer = {
      generateSVG: vi.fn(),
    } as any;

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
      notifyObservers: vi.fn(),
      observers: new Set(),
      storagePort: {} as any,
    } as any;

    // Mock panel
    mockPanel = {
      reveal: vi.fn(),
      updateContent: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn(),
      getDocumentUri: vi.fn(),
      getPanelId: vi.fn(),
    } as any;

    // Setup DI container mocks
    mockContainer = {
      isRegistered: vi.fn().mockReturnValue(true),
      resolve: vi.fn().mockImplementation((token: string) => {
        switch (token) {
          case 'DocumentQueryService':
            return mockDocumentQueryService;
          case 'ProofVisualizationService':
            return mockVisualizationService;
          case 'TreeRenderer':
            return mockRenderer;
          case 'ViewStateManager':
            return mockViewStateManager;
          case 'IViewStatePort':
            return mockViewStatePort;
          default:
            return {};
        }
      }),
    } as any;

    const { getContainer } = await import('../../infrastructure/di/container.js');
    vi.mocked(getContainer).mockReturnValue(mockContainer);
  });

  describe('Singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = ProofTreePanelManager.getInstance();
      const instance2 = ProofTreePanelManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance if none exists', () => {
      const instance = ProofTreePanelManager.getInstance();
      expect(instance).toBeInstanceOf(ProofTreePanelManager);
    });
  });

  describe('createOrShowPanel', () => {
    it('should create new panel when none exists', async () => {
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const result = await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result._unsafeUnwrap()).toBe(mockPanel);
      }
      expect(ProofTreePanel.createWithServices).toHaveBeenCalledWith(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );
    });

    it('should reveal existing panel and update content', async () => {
      // First create a panel
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const result1 = await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);
      expect(result1.isOk()).toBe(true);

      // Clear mocks to test second call
      vi.clearAllMocks();
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      // Second call should reveal existing panel
      const result2 = await manager.createOrShowPanel(
        '/test/doc.proof',
        'updated content',
        mockUIPort,
      );

      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(mockPanel);
      }
      expect(mockPanel.reveal).toHaveBeenCalled();
      expect(mockPanel.updateContent).toHaveBeenCalledWith('updated content');
      expect(ProofTreePanel.createWithServices).not.toHaveBeenCalled();
    });

    it('should handle update content errors for existing panels', async () => {
      // First create a panel
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const result1 = await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);
      expect(result1.isOk()).toBe(true);

      // Clear mocks and setup error
      vi.clearAllMocks();
      const updateError = new ValidationError('Update failed');
      vi.mocked(mockPanel.updateContent).mockResolvedValue(err(updateError));

      const result2 = await manager.createOrShowPanel(
        '/test/doc.proof',
        'updated content',
        mockUIPort,
      );

      expect(result2.isErr()).toBe(true);
      expect(result2._unsafeUnwrapErr()).toBe(updateError);
    });

    it('should handle panel creation errors', async () => {
      const createError = new ValidationError('Panel creation failed');
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(err(createError));

      const result = await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(createError);
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(ProofTreePanel.createWithServices).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to create new panel');
    });
  });

  describe('createPanelWithServices', () => {
    it('should create panel with explicit services', async () => {
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.onDidDispose).mockImplementation((callback) => {
        callback();
      });

      const result = await manager.createPanelWithServices(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(mockPanel);
      expect(ProofTreePanel.createWithServices).toHaveBeenCalledWith(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );
    });

    it('should reveal existing panel when called with services', async () => {
      // First create a panel
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const result1 = await manager.createPanelWithServices(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );
      expect(result1.isOk()).toBe(true);

      // Clear mocks and try again
      vi.clearAllMocks();
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const result2 = await manager.createPanelWithServices(
        '/test/doc.proof',
        'updated content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );

      expect(result2.isOk()).toBe(true);
      expect(mockPanel.reveal).toHaveBeenCalled();
      expect(mockPanel.updateContent).toHaveBeenCalledWith('updated content');
    });

    it('should handle panel creation errors with services', async () => {
      const createError = new ValidationError('Panel creation failed');
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(err(createError));

      const result = await manager.createPanelWithServices(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(createError);
    });

    it('should handle unexpected errors with services', async () => {
      vi.mocked(ProofTreePanel.createWithServices).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await manager.createPanelWithServices(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create panel with services');
      }
    });
  });

  describe('updateAllPanels', () => {
    it('should update all panels successfully', async () => {
      // Create two panels
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const mockPanel2 = {
        reveal: vi.fn(),
        updateContent: vi.fn(),
        dispose: vi.fn(),
        onDidDispose: vi.fn(),
        getDocumentUri: vi.fn(),
        getPanelId: vi.fn(),
      } as any;
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValueOnce(ok(mockPanel));
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValueOnce(ok(mockPanel2));

      await manager.createOrShowPanel('/test/doc1.proof', 'content1', mockUIPort);
      await manager.createOrShowPanel('/test/doc2.proof', 'content2', mockUIPort);

      // Clear mocks and setup for update
      vi.clearAllMocks();
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));
      vi.mocked(mockPanel2.updateContent).mockResolvedValue(ok(undefined));

      const result = await manager.updateAllPanels('updated content');

      expect(result.isOk()).toBe(true);
      expect(mockPanel.updateContent).toHaveBeenCalledWith('updated content');
      expect(mockPanel2.updateContent).toHaveBeenCalledWith('updated content');
    });

    it('should handle update errors', async () => {
      // Create panel
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      // Clear mocks and setup error
      vi.clearAllMocks();
      const updateError = new ValidationError('Update failed');
      vi.mocked(mockPanel.updateContent).mockResolvedValue(err(updateError));

      const result = await manager.updateAllPanels('updated content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result._unsafeUnwrapErr().message).toContain('Failed to update panel');
      }
    });

    it('should handle unexpected errors during update', async () => {
      // Create panel
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      // Clear mocks and setup error
      vi.clearAllMocks();
      vi.mocked(mockPanel.updateContent).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await manager.updateAllPanels('updated content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result._unsafeUnwrapErr().message).toContain('Failed to update all panels');
      }
    });
  });

  describe('updateContentForDocument', () => {
    it('should update content for specific document', async () => {
      // Create panel
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      // Clear mocks and update
      vi.clearAllMocks();
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      const result = await manager.updateContentForDocument('/test/doc.proof', 'updated content');

      expect(result.isOk()).toBe(true);
      expect(mockPanel.updateContent).toHaveBeenCalledWith('updated content');
    });

    it('should handle missing panel', async () => {
      const result = await manager.updateContentForDocument('/nonexistent/doc.proof', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result._unsafeUnwrapErr().message).toContain('No panel found for document');
      }
    });
  });

  describe('Panel management methods', () => {
    beforeEach(async () => {
      // Create a panel for testing
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);
    });

    it('should return panel for document', () => {
      const panel = manager.getPanelForDocument('/test/doc.proof');
      expect(panel).toBe(mockPanel);
    });

    it('should return undefined for non-existent panel', () => {
      const panel = manager.getPanelForDocument('/nonexistent/doc.proof');
      expect(panel).toBeUndefined();
    });

    it('should check if panel exists for document', () => {
      expect(manager.hasPanelForDocument('/test/doc.proof')).toBe(true);
      expect(manager.hasPanelForDocument('/nonexistent/doc.proof')).toBe(false);
    });

    it('should return active document URIs', () => {
      const uris = manager.getActiveDocumentUris();
      expect(uris).toEqual(['/test/doc.proof']);
    });

    it('should return active panel count', () => {
      expect(manager.getActivePanelCount()).toBe(1);
    });

    it('should close panel for document', () => {
      const result = manager.closePanelForDocument('/test/doc.proof');

      expect(result.isOk()).toBe(true);
      expect(mockPanel.dispose).toHaveBeenCalled();
      expect(manager.hasPanelForDocument('/test/doc.proof')).toBe(false);
    });

    it('should handle closing non-existent panel', () => {
      const result = manager.closePanelForDocument('/nonexistent/doc.proof');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result._unsafeUnwrapErr().message).toContain('No panel found for document');
      }
    });

    it('should handle disposal errors', () => {
      vi.mocked(mockPanel.dispose).mockImplementation(() => {
        throw new Error('Disposal failed');
      });

      const result = manager.closePanelForDocument('/test/doc.proof');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result._unsafeUnwrapErr().message).toContain('Failed to close panel');
      }
    });

    it('should close all panels', () => {
      const result = manager.closeAllPanels();

      expect(result.isOk()).toBe(true);
      expect(mockPanel.dispose).toHaveBeenCalled();
      expect(manager.getActivePanelCount()).toBe(0);
    });

    it('should handle errors when closing all panels', () => {
      vi.mocked(mockPanel.dispose).mockImplementation(() => {
        throw new Error('Disposal failed');
      });

      const result = manager.closeAllPanels();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result._unsafeUnwrapErr().message).toContain('Failed to close all panels');
      }
    });
  });

  describe('Panel disposal handling', () => {
    it('should remove panel from registry when disposed', async () => {
      let disposeCallback: (() => void) | undefined;

      vi.mocked(mockPanel.onDidDispose).mockImplementation((callback) => {
        disposeCallback = callback;
      });

      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));
      vi.mocked(mockPanel.updateContent).mockResolvedValue(ok(undefined));

      await manager.createOrShowPanel('/test/doc.proof', 'content', mockUIPort);

      expect(manager.hasPanelForDocument('/test/doc.proof')).toBe(true);

      // Simulate panel disposal
      if (disposeCallback) {
        disposeCallback();
      }

      expect(manager.hasPanelForDocument('/test/doc.proof')).toBe(false);
    });
  });

  describe('safeResolveDependencies', () => {
    it('should resolve all dependencies successfully', async () => {
      const resolveMethod = (ProofTreePanelManager as any).safeResolveDependencies;
      const result = resolveMethod();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          documentQueryService: mockDocumentQueryService,
          visualizationService: mockVisualizationService,
          renderer: mockRenderer,
          viewStateManager: mockViewStateManager,
          viewStatePort: mockViewStatePort,
        });
      }
    });

    it('should handle missing service registration', async () => {
      const { getContainer } = await import('../../infrastructure/di/container.js');
      mockContainer.isRegistered.mockReturnValue(false);
      vi.mocked(getContainer).mockReturnValue(mockContainer);

      const resolveMethod = (ProofTreePanelManager as any).safeResolveDependencies;
      const result = resolveMethod();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Required service');
      }
    });

    it('should handle resolution errors', async () => {
      const { getContainer } = await import('../../infrastructure/di/container.js');
      mockContainer.resolve.mockImplementation(() => {
        throw new Error('Resolution failed');
      });
      vi.mocked(getContainer).mockReturnValue(mockContainer);

      const resolveMethod = (ProofTreePanelManager as any).safeResolveDependencies;
      const result = resolveMethod();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to resolve panel dependencies');
      }
    });
  });

  describe('createNewPanel', () => {
    it('should create new panel with DI resolved dependencies', async () => {
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(ok(mockPanel));

      // Ensure the container is properly set up for this test
      const { getContainer } = await import('../../infrastructure/di/container.js');
      vi.mocked(getContainer).mockReturnValue(mockContainer);

      const result = await (manager as any).createNewPanel(
        '/test/doc.proof',
        'content',
        mockUIPort,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockPanel);
      }
      expect(ProofTreePanel.createWithServices).toHaveBeenCalledWith(
        '/test/doc.proof',
        'content',
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
      );
    });

    it('should handle dependency resolution errors', async () => {
      const { getContainer } = await import('../../infrastructure/di/container.js');
      mockContainer.isRegistered.mockReturnValue(false);
      vi.mocked(getContainer).mockReturnValue(mockContainer);

      const result = await (manager as any).createNewPanel(
        '/test/doc.proof',
        'content',
        mockUIPort,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Required service');
      }
    });

    it('should handle panel creation errors', async () => {
      const createError = new ValidationError('Panel creation failed');
      vi.mocked(ProofTreePanel.createWithServices).mockResolvedValue(err(createError));

      const result = await (manager as any).createNewPanel(
        '/test/doc.proof',
        'content',
        mockUIPort,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(createError);
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(ProofTreePanel.createWithServices).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await (manager as any).createNewPanel(
        '/test/doc.proof',
        'content',
        mockUIPort,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create new panel');
      }
    });
  });
});
