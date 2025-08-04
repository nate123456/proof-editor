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
import { WebviewId } from '../../domain/shared/value-objects/identifiers.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import type { TreeRenderer } from '../TreeRenderer.js';

describe('ProofTreePanel - Unit Tests', () => {
  let mockWebviewPanel: WebviewPanel;
  let mockUIPort: IUIPort;
  let mockViewStatePort: IViewStatePort;
  let mockDocumentQueryService: DocumentQueryService;
  let mockVisualizationService: ProofVisualizationService;
  let mockRenderer: TreeRenderer;
  let mockViewStateManager: ViewStateManager;
  let mockBootstrapController: BootstrapController;
  let mockProofApplicationService: ProofApplicationService;
  let mockYAMLSerializer: YAMLSerializer;
  let mockExportService: IExportService;
  let mockDocumentIdService: IDocumentIdService;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockWebview = {
      html: '',
      onDidReceiveMessage: vi.fn(),
    };

    mockWebviewPanel = {
      id: WebviewId.create('test-panel-unit').unwrapOr(null as any),
      webview: mockWebview,
      onDidDispose: vi.fn(),
      reveal: vi.fn(),
      dispose: vi.fn(),
    };

    mockUIPort = {
      createWebviewPanel: vi.fn().mockReturnValue(mockWebviewPanel),
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
      writeFile: vi.fn(),
      capabilities: vi.fn(),
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
          statements: new Map(),
          orderedSets: new Map(),
          atomicArguments: new Map(),
          trees: new Map(),
          nodes: new Map(),
        }),
      ),
      getDocumentById: vi.fn(),
      getDocumentWithStats: vi.fn(),
      validateDocumentContent: vi.fn(),
      getDocumentMetadata: vi.fn(),
      documentRepository: {} as any,
      parser: {} as any,
    } as any;

    mockVisualizationService = {
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          trees: [],
          metadata: { totalNodes: 0, totalTrees: 0 },
        }),
      ),
      updateConfig: vi.fn(),
    } as any;

    mockRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg></svg>'),
    } as any;

    mockViewStateManager = {
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
      subscribeToChanges: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getSelectionState: vi.fn(),
      getViewportState: vi.fn(),
      getPanelState: vi.fn(),
      getThemeState: vi.fn(),
    } as any;

    mockBootstrapController = {
      createBootstrapArgument: vi.fn(),
      populateEmptyArgument: vi.fn(),
    } as any;

    mockProofApplicationService = {
      createStatement: vi.fn(),
      updateStatement: vi.fn(),
    } as any;

    mockYAMLSerializer = {
      serialize: vi.fn().mockReturnValue('test: yaml'),
      deserialize: vi.fn().mockReturnValue({}),
    } as any;

    mockExportService = {
      saveToFile: vi.fn(),
    } as any;

    mockDocumentIdService = {
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document-id')),
    } as any;
  });

  describe('Panel Creation and Initialization', () => {
    it('should create panel with all required dependencies', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/unit-test.proof',
        'unit test content',
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
        const panel = result.value;
        expect(panel.getDocumentUri()).toBe('file:///test/unit-test.proof');
        expect(panel.getPanelId()).toMatch(/^proof-tree-panel-\d+$/);
      }
    });

    it('should handle webview panel creation through IUIPort abstraction', async () => {
      await ProofTreePanel.createWithServices(
        'file:///test/ui-port.proof',
        'ui port test',
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

      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledWith({
        id: expect.stringMatching(/^proof-tree-panel-\d+$/),
        title: 'Proof Tree: ui-port.proof',
        viewType: 'proofTreeVisualization',
        showOptions: {
          viewColumn: 1,
          preserveFocus: false,
        },
        retainContextWhenHidden: true,
        enableScripts: true,
      });
    });

    it('should initialize view state persistence on creation', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/view-state.proof',
        'view state test',
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
      expect(mockViewStatePort.loadViewState).toHaveBeenCalled();
    });

    it('should handle document ID extraction failures gracefully', async () => {
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        err(new ValidationError('Cannot extract document ID')),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/id-extraction-failure.proof',
        'id failure test',
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
    });
  });

  describe('Resource Management', () => {
    it('should properly dispose of resources', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/disposal.proof',
        'disposal test',
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
        const panel = result.value;
        panel.dispose();

        expect(mockWebviewPanel.dispose).toHaveBeenCalled();
      }
    });

    it('should handle view state restoration failures without breaking functionality', async () => {
      vi.mocked(mockViewStatePort.loadViewState).mockRejectedValue(
        new Error('View state corrupted'),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/view-state-failure.proof',
        'view state failure test',
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
        const panel = result.value;
        const updateResult = await panel.updateContent('test content after view state failure');
        expect(updateResult.isOk()).toBe(true);
      }
    });
  });

  describe('Content Updates', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/content-update.proof',
        'content update test',
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

      if (result.isErr()) {
        throw new Error(`Failed to create panel: ${result.error.message}`);
      }

      panel = result.value;
    });

    it('should handle content updates successfully', async () => {
      const result = await panel.updateContent('updated content');

      expect(result.isOk()).toBe(true);
      expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledWith('updated content');
      expect(mockVisualizationService.generateVisualization).toHaveBeenCalled();
      expect(mockRenderer.generateSVG).toHaveBeenCalled();
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'updateTree',
        content: '<svg></svg>',
      });
    });

    it('should handle empty content gracefully', async () => {
      const result = await panel.updateContent('');

      expect(result.isOk()).toBe(true);
      expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledWith('');
    });
  });
});
