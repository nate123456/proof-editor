import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestScenarios } from '../../__tests__/utils/integration-test-factories.js';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { IExportService } from '../../application/ports/IExportService.js';
import type { IUIPort, WebviewMessage, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { IDocumentIdService } from '../../application/services/DocumentIdService.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofApplicationService } from '../../application/services/ProofApplicationService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
import { MessageType } from '../../domain/shared/value-objects/enums.js';
import { WebviewId } from '../../domain/shared/value-objects/identifiers.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import type { TreeRenderer } from '../TreeRenderer.js';

describe('ProofTreePanel - Integration Tests', () => {
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
      id: WebviewId.create('test-panel-integration').unwrapOr(null as any),
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
      showQuickPick: vi
        .fn()
        .mockResolvedValue(
          ok({ label: 'YAML (.proof)', description: 'Export as YAML proof file' }),
        ),
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
      getDocumentById: vi.fn().mockResolvedValue(
        ok({
          statements: new Map(),
          orderedSets: new Map(),
          atomicArguments: new Map(),
          trees: new Map(),
          nodes: new Map(),
        }),
      ),
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
      generateSVG: vi.fn().mockReturnValue('<svg><g id="test-tree"></g></svg>'),
    } as any;

    mockViewStateManager = {
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
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
    } as any;

    mockBootstrapController = {
      createBootstrapArgument: vi.fn().mockResolvedValue(
        ok({
          success: true,
          data: { argumentId: 'test-argument-id' },
        }),
      ),
      populateEmptyArgument: vi.fn().mockResolvedValue(
        ok({
          success: true,
          data: { argumentId: 'test-argument-id' },
        }),
      ),
    } as any;

    mockProofApplicationService = {
      createStatement: vi
        .fn()
        .mockResolvedValue(ok({ id: 'test-statement-id', content: 'Test statement' })),
      updateStatement: vi.fn().mockResolvedValue(ok(undefined)),
    } as any;

    mockYAMLSerializer = {
      serialize: vi.fn().mockReturnValue('test: yaml'),
      deserialize: vi.fn().mockReturnValue({}),
    } as any;

    mockExportService = {
      saveToFile: vi.fn().mockResolvedValue(
        ok({
          filePath: '/test/export.proof',
          savedSuccessfully: true,
        }),
      ),
    } as any;

    mockDocumentIdService = {
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document-id')),
    } as any;
  });

  describe('Service Orchestration', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/integration.proof',
        'integration test content',
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

    it('should orchestrate content parsing and visualization pipeline', async () => {
      const content = TestScenarios.modusPonens.statements.join('\n');

      const result = await panel.updateContent(content);

      expect(result.isOk()).toBe(true);
      expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledWith(content);
      expect(mockVisualizationService.generateVisualization).toHaveBeenCalled();
      expect(mockRenderer.generateSVG).toHaveBeenCalled();
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'updateTree',
        content: '<svg><g id="test-tree"></g></svg>',
      });
    });

    it('should handle parsing errors through Result pattern without throwing', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        err(new ValidationApplicationError('Parse error for integration test')),
      );

      const result = await panel.updateContent('invalid content');

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'showError',
        content: expect.stringContaining('Parse Errors'),
      });
    });

    it('should handle visualization errors gracefully', async () => {
      vi.mocked(mockVisualizationService.generateVisualization).mockReturnValue(
        err(new ValidationError('Visualization error for integration test')),
      );

      const result = await panel.updateContent('valid content');

      expect(result.isOk()).toBe(true);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'showError',
        content: expect.stringContaining('Visualization error for integration test'),
      });
    });
  });

  describe('Message Handling and Service Coordination', () => {
    let panel: ProofTreePanel;
    let messageHandler: any;

    beforeEach(async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/message-handling.proof',
        'message handling test',
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

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
      messageHandler = vi.mocked(mockWebviewPanel.webview.onDidReceiveMessage).mock.calls[0]?.[0];
    });

    it('should coordinate argument creation across multiple services', async () => {
      if (!messageHandler) {
        return;
      }

      await messageHandler({
        type: 'createArgument',
        premises: ['All humans are mortal', 'Socrates is human'],
        conclusions: ['Therefore, Socrates is mortal'],
        ruleName: 'Modus Ponens',
      });

      expect(mockBootstrapController.createBootstrapArgument).toHaveBeenCalled();
      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalled();
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'argumentCreated',
        argumentId: 'test-argument-id',
      });
    });

    it('should handle statement creation through application service', async () => {
      if (!messageHandler) {
        return;
      }

      await messageHandler({
        type: 'addStatement',
        statementType: 'premise',
        content: 'All logical systems have rules',
      });

      expect(mockProofApplicationService.createStatement).toHaveBeenCalledWith({
        documentId: 'test-document-id',
        content: 'All logical systems have rules',
      });

      expect(mockUIPort.showInformation).toHaveBeenCalledWith('Premise added successfully');
    });

    it('should coordinate export through multiple services', async () => {
      if (!messageHandler) {
        return;
      }

      await messageHandler({
        type: 'exportProof',
      });

      expect(mockUIPort.showQuickPick).toHaveBeenCalled();
      expect(mockExportService.saveToFile).toHaveBeenCalledWith('test-document-id', {
        format: 'yaml',
        includeMetadata: true,
        includeVisualization: false,
      });

      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Successfully exported proof to /test/export.proof',
      );
    });

    it('should handle viewport changes and coordinate with view state manager', async () => {
      if (!messageHandler) {
        return;
      }

      const viewport = { zoom: 1.5, pan: { x: 10, y: 20 }, center: { x: 0, y: 0 } };

      await messageHandler({
        type: 'viewportChanged',
        viewport,
      });

      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(viewport);
    });

    it('should handle malformed webview messages without crashing', async () => {
      if (!messageHandler) {
        return;
      }

      const malformedMessages = [
        null,
        undefined,
        {},
        { type: 'unknown' },
        { type: 'createArgument' },
        { type: 'moveNode', nodeId: null },
        { type: 'addStatement', content: null },
      ];

      for (const msg of malformedMessages) {
        expect(() => messageHandler(msg as any)).not.toThrow();
      }
    });

    it('should handle document ID extraction failures during operations', async () => {
      vi.mocked(mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        err(new ValidationError('Cannot extract document ID')),
      );

      if (!messageHandler) {
        return;
      }

      await messageHandler({
        type: 'createArgument',
        premises: ['Test premise'],
        conclusions: ['Test conclusion'],
      });

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine document ID'),
      );
    });
  });

  describe('Service Failure Handling', () => {
    it('should handle service failures gracefully without crashing', async () => {
      vi.mocked(mockDocumentQueryService.parseDocumentContent).mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/service-failure.proof',
        'service failure test',
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

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.message).toBeDefined();
        expect(result.error.message).toContain('Service unavailable');
      }
    });

    it('should handle concurrent message processing without blocking', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/concurrent.proof',
        'concurrent test',
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
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

        const messageHandler = vi.mocked(mockWebviewPanel.webview.onDidReceiveMessage).mock
          .calls[0]?.[0];

        if (!messageHandler) {
          return;
        }

        const concurrentMessages: WebviewMessage[] = [
          {
            type: MessageType.STATEMENT_ADDED,
            content: 'Concurrent statement 1' as any,
            data: { statementType: 'premise' } as any,
          },
          {
            type: MessageType.STATEMENT_ADDED,
            content: 'Concurrent statement 2' as any,
            data: { statementType: 'conclusion' } as any,
          },
        ];

        const startTime = performance.now();

        await Promise.all(concurrentMessages.map((msg) => messageHandler(msg)));

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        expect(totalTime).toBeLessThan(100);
      }
    });
  });
});
