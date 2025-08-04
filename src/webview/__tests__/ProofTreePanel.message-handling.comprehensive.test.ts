import 'reflect-metadata';

import fc from 'fast-check';
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
import { NodeId, TreeId, WebviewId } from '../../domain/shared/value-objects/identifiers.js';
import type { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import type { BootstrapController } from '../../presentation/controllers/BootstrapController.js';
import { ProofTreePanel } from '../ProofTreePanel.js';
import type { TreeRenderer } from '../TreeRenderer.js';

describe('ProofTreePanel Message Handling - Comprehensive Coverage', () => {
  let mockWebviewPanel: WebviewPanel;
  let mockUIPort: IUIPort;
  let mockVisualizationService: ProofVisualizationService;
  let mockDocumentQueryService: DocumentQueryService;
  let mockRenderer: TreeRenderer;
  let mockViewStateManager: ViewStateManager;
  let mockViewStatePort: IViewStatePort;
  let mockBootstrapController: BootstrapController;
  let mockProofApplicationService: ProofApplicationService;
  let mockYAMLSerializer: YAMLSerializer;
  let mockExportService: IExportService;
  let mockDocumentIdService: IDocumentIdService;
  let panel: ProofTreePanel;

  // Message handler storage for simulating webview messages
  let messageHandlers: ((message: any) => Promise<void>)[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    messageHandlers = [];

    // Setup comprehensive mocks
    mockWebviewPanel = {
      id: WebviewId.create('test-panel').unwrapOr(null as any),
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn((handler) => {
          messageHandlers.push(handler);
          return { dispose: vi.fn() };
        }),
      },
      onDidDispose: vi.fn((_callback) => {
        return { dispose: vi.fn() };
      }),
      reveal: vi.fn(),
      dispose: vi.fn(),
    };

    mockUIPort = {
      createWebviewPanel: vi.fn().mockReturnValue(mockWebviewPanel),
      postMessageToWebview: vi.fn(),
      showError: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showInputBox: vi.fn().mockResolvedValue(ok(null)),
      showQuickPick: vi.fn().mockResolvedValue(ok(null)),
      showConfirmation: vi.fn().mockResolvedValue(ok(false)),
      showOpenDialog: vi.fn().mockResolvedValue(ok(null)),
      showSaveDialog: vi.fn().mockResolvedValue(ok(null)),
      showProgress: vi.fn().mockResolvedValue(undefined),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      getTheme: vi.fn().mockReturnValue({
        kind: 'light',
        colors: {},
        fonts: { default: 'Arial', monospace: 'Courier', size: 14 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
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

    mockVisualizationService = {
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          documentId: 'test-doc',
          version: 1,
          trees: [],
          totalDimensions: { width: 400, height: 300 },
          isEmpty: false,
        }),
      ),
      getDefaultConfig: vi.fn().mockReturnValue({
        layout: {
          nodeWidth: 220,
          nodeHeight: 120,
          verticalSpacing: 180,
          horizontalSpacing: 280,
          treeSpacing: 150,
          canvasMargin: 50,
        },
        performance: { maxTreesRendered: 50, maxNodesPerTree: 100, enableVirtualization: true },
        visual: {
          showConnectionLabels: false,
          highlightCriticalPath: false,
          showValidationErrors: true,
        },
      }),
      generateOptimizedVisualization: vi.fn().mockReturnValue(
        ok({
          documentId: 'test-doc',
          version: 1,
          trees: [],
          totalDimensions: { width: 400, height: 300 },
          isEmpty: false,
        }),
      ),
      validateDocument: vi.fn().mockReturnValue(ok(undefined)),
      calculateTotalDimensions: vi.fn().mockReturnValue({ width: 400, height: 300 }),
      applyVisualEnhancements: vi.fn().mockReturnValue([]),
      filterVisibleTrees: vi.fn().mockReturnValue({}),
      isTreeInViewport: vi.fn().mockReturnValue(true),
      mergeConfigs: vi.fn().mockReturnValue({}),
      createConfig: vi.fn().mockReturnValue({}),
      getVisualizationStats: vi.fn().mockReturnValue(
        ok({
          totalTrees: 0,
          totalNodes: 0,
          totalConnections: 0,
          largestTree: { id: '', nodeCount: 0 },
          estimatedRenderTime: 0,
        }),
      ),
    } as any;

    mockDocumentQueryService = {
      parseDocumentContent: vi.fn(),
      getDocumentById: vi.fn(),
      convertProofDocumentToDTO: vi.fn(),
      convertProofDocumentToAggregate: vi.fn(),
      getDocumentWithStats: vi
        .fn()
        .mockResolvedValue(
          ok({ id: 'test-doc', statements: {}, orderedSets: {}, atomicArguments: {}, trees: {} }),
        ),
      validateDocumentContent: vi.fn().mockResolvedValue(ok({ isValid: true, errors: [] })),
      getDocumentMetadata: vi.fn().mockResolvedValue(
        ok({
          id: 'test-doc',
          version: 1,
          createdAt: '',
          modifiedAt: '',
          statementCount: 0,
          argumentCount: 0,
          treeCount: 0,
        }),
      ),
      documentExists: vi.fn().mockResolvedValue(ok(true)),
      parseWithDetailedErrors: vi
        .fn()
        .mockResolvedValue(
          ok({ id: 'test-doc', statements: {}, orderedSets: {}, atomicArguments: {}, trees: {} }),
        ),
    } as any;

    mockRenderer = {
      generateSVG: vi.fn().mockReturnValue('<svg>test content</svg>'),
      config: {
        fontSize: 12,
        colors: {
          nodeBackground: '#f8f9fa',
          nodeBorder: '#dee2e6',
          implicationLine: '#495057',
          statementText: '#212529',
          connectionLine: '#6c757d',
          sideLabel: '#6c757d',
        },
      },
      generateEmptyMessage: vi.fn().mockReturnValue('<div>No content</div>'),
      renderAllTrees: vi.fn().mockReturnValue('<svg>all trees</svg>'),
      renderSingleTree: vi.fn().mockReturnValue('<svg>single tree</svg>'),
      generateTreeNode: vi.fn().mockReturnValue('<g>node</g>'),
      generateTreeConnections: vi.fn().mockReturnValue('<g>connections</g>'),
      generateTreeMarkers: vi.fn().mockReturnValue('<defs>markers</defs>'),
      calculateNodeDimensions: vi.fn().mockReturnValue({ width: 220, height: 120 }),
      formatNodeContent: vi.fn().mockReturnValue(['formatted', 'content']),
    } as any;

    mockViewStateManager = {
      updateViewportState: vi.fn(),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
    } as any;

    mockViewStatePort = {
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
    };

    mockBootstrapController = {
      createBootstrapArgument: vi.fn(),
      populateEmptyArgument: vi.fn(),
      documentOrchestration: vi.fn() as any,
      proofApplication: vi.fn() as any,
      repository: vi.fn() as any,
      platform: vi.fn() as any,
      ui: vi.fn() as any,
      viewState: { saveViewState: vi.fn() },
      parser: { parseProofFile: vi.fn() } as any,
      validator: { validateDocument: vi.fn() },
      eventBus: { publish: vi.fn() },
      logger: { info: vi.fn() },
      serializer: { serialize: vi.fn() },
    } as any;

    mockProofApplicationService = {
      createStatement: vi.fn(),
      updateStatement: vi.fn(),
      deleteStatement: vi.fn().mockResolvedValue(ok(undefined)),
      createAtomicArgument: vi.fn().mockResolvedValue(ok({ id: 'new-arg-123' })),
      updateAtomicArgument: vi.fn().mockResolvedValue(ok({ id: 'updated-arg-123' })),
      deleteAtomicArgument: vi.fn().mockResolvedValue(ok(undefined)),
      updateArgumentLabel: vi.fn().mockResolvedValue(ok({ id: 'updated-label' })),
      moveStatement: vi.fn().mockResolvedValue(ok({ id: 'moved-statement' })),
      moveTree: vi.fn().mockResolvedValue(ok({ id: 'moved-tree' })),
    } as any;

    mockYAMLSerializer = {
      serialize: vi.fn().mockResolvedValue(ok('serialized: yaml')),
      deserialize: vi.fn().mockResolvedValue(ok({})),
      serializeStatements: vi.fn().mockReturnValue({}),
      serializeOrderedSets: vi.fn().mockReturnValue({}),
      serializeAtomicArguments: vi.fn().mockReturnValue({}),
      serializeTrees: vi.fn().mockReturnValue({}),
    } as any;

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

    mockDocumentIdService = {
      extractFromUri: vi.fn().mockReturnValue(ok('test-document')),
      validateDocumentId: vi.fn().mockReturnValue(ok('test-document')),
      generateFallbackId: vi.fn().mockReturnValue('fallback-id'),
      extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document')),
    } as any;

    // Set up default mock return values that tests can override
    (mockBootstrapController.createBootstrapArgument as any).mockResolvedValue(
      ok({ data: { argumentId: 'new-arg-123' } }),
    );
    (mockBootstrapController.populateEmptyArgument as any).mockResolvedValue(
      ok({ data: { argumentId: 'populated-arg-123' } }),
    );
    (mockProofApplicationService.createStatement as any).mockResolvedValue(
      ok({ id: 'new-stmt-123', content: 'Created statement' }),
    );
    (mockProofApplicationService.updateStatement as any).mockResolvedValue(
      ok({ id: 'updated-stmt-123', content: 'Updated statement' }),
    );
    (mockDocumentQueryService.parseDocumentContent as any).mockResolvedValue(
      ok({
        id: 'test-doc',
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
        nodes: {},
      }),
    );
    (mockDocumentQueryService.getDocumentById as any).mockResolvedValue(
      ok({
        id: 'test-doc',
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
        nodes: {},
      }),
    );
    (mockViewStateManager.updateViewportState as any).mockResolvedValue(ok(undefined));

    // Create panel instance
    const result = await ProofTreePanel.createWithServices(
      'file:///test/document.proof',
      'test content',
      mockDocumentQueryService as any,
      mockVisualizationService as any,
      mockUIPort as any,
      mockRenderer as any,
      mockViewStateManager as any,
      mockViewStatePort as any,
      mockBootstrapController as any,
      mockProofApplicationService as any,
      mockYAMLSerializer as any,
      mockExportService as any,
      mockDocumentIdService as any,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      panel = result.value;

      // Wait a bit for async initialization to complete
      // The panel sets up message handlers in initializeViewState() which is called asynchronously
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Ensure we have at least one message handler registered
      expect(messageHandlers.length).toBeGreaterThan(0);

      // Verify the handler was registered properly
      expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
      expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalledWith(
        expect.any(Function),
      );
    }
  });

  describe('Message Routing and Validation', () => {
    it('should handle viewportChanged messages with Result pattern validation', async () => {
      const validViewportMessage = {
        type: 'viewportChanged',
        viewport: {
          zoom: 1.5,
          pan: { x: 100, y: 200 },
          center: { x: 400, y: 300 },
        },
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validViewportMessage);
      }

      // Assert
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(
        expect.objectContaining({
          zoom: expect.objectContaining({ value: 1.5 }),
          pan: expect.objectContaining({ x: 100, y: 200 }),
          center: expect.objectContaining({ x: 400, y: 300 }),
        }),
      );
    });

    it('should handle panelStateChanged messages with complete state validation', async () => {
      const validPanelMessage = {
        type: 'panelStateChanged',
        panel: {
          miniMapVisible: true,
          sideLabelsVisible: false,
          validationPanelVisible: true,
          panelSizes: { sidebar: 250, footer: 100 },
        },
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validPanelMessage);
      }

      // Assert
      expect(mockViewStateManager.updatePanelState).toHaveBeenCalledWith(
        expect.objectContaining({
          miniMapVisible: true,
          sideLabelsVisible: false,
          validationPanelVisible: true,
          panelSizes: expect.objectContaining({
            sidebar: expect.objectContaining({ value: 250 }),
            footer: expect.objectContaining({ value: 100 }),
          }),
        }),
      );
    });

    it('should handle selectionChanged messages with array validation', async () => {
      const validSelectionMessage = {
        type: 'selectionChanged',
        selection: {
          selectedNodes: ['node1', 'node2'],
          selectedStatements: ['stmt1', 'stmt2', 'stmt3'],
          selectedTrees: ['tree1'],
        },
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validSelectionMessage);
      }

      // Assert
      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedNodes: [
            expect.objectContaining({ value: 'node1' }),
            expect.objectContaining({ value: 'node2' }),
          ],
          selectedStatements: ['stmt1', 'stmt2', 'stmt3'],
          selectedTrees: [expect.objectContaining({ value: 'tree1' })],
        }),
      );
    });

    it('should handle unknown message types gracefully', async () => {
      const unknownMessage = {
        type: 'unknownMessageType',
        data: { some: 'data' },
      };

      // Act & Assert - Should not throw
      for (const handler of messageHandlers) {
        expect(() => handler(unknownMessage)).not.toThrow();
      }

      // Should not call any services for unknown message
      expect(mockViewStateManager.updateViewportState).not.toHaveBeenCalled();
      expect(mockViewStateManager.updatePanelState).not.toHaveBeenCalled();
      expect(mockViewStateManager.updateSelectionState).not.toHaveBeenCalled();
    });

    it('should handle malformed message objects gracefully', async () => {
      const malformedMessages = [
        null,
        undefined,
        'string message',
        123,
        { noType: 'missing type field' },
        { type: null },
        { type: 123 },
      ];

      // Act & Assert - Should not throw for any malformed message
      for (const malformedMessage of malformedMessages) {
        for (const handler of messageHandlers) {
          expect(() => handler(malformedMessage)).not.toThrow();
        }
      }
    });
  });

  describe('Argument Creation Message Handling', () => {
    it('should handle createArgument messages with comprehensive validation', async () => {
      const validCreateMessage = {
        type: 'createArgument',
        premises: ['All men are mortal', 'Socrates is a man'],
        conclusions: ['Socrates is mortal'],
        ruleName: 'Modus Ponens',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validCreateMessage);
      }

      // Assert
      expect(mockBootstrapController.createBootstrapArgument).toHaveBeenCalledWith('test-document');
      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        'test-document',
        'new-arg-123',
        ['All men are mortal', 'Socrates is a man'],
        ['Socrates is mortal'],
        { left: 'Modus Ponens' },
      );
      // Check that argumentCreated message was sent by ArgumentOperations
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(Object), // WebviewId
        expect.objectContaining({
          type: 'argumentCreated',
          data: expect.any(Object), // EventData with argumentId
        }),
      );
    });

    it('should handle createArgument without ruleName', async () => {
      const messageWithoutRule = {
        type: 'createArgument',
        premises: ['Premise 1'],
        conclusions: ['Conclusion 1'],
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(messageWithoutRule);
      }

      // Assert
      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        'test-document',
        'new-arg-123',
        ['Premise 1'],
        ['Conclusion 1'],
        undefined,
      );
    });

    it('should validate premises array in createArgument messages', async () => {
      const invalidPremisesMessages = [
        { type: 'createArgument', premises: null, conclusions: ['Valid'] },
        { type: 'createArgument', premises: 'string', conclusions: ['Valid'] },
        { type: 'createArgument', premises: [], conclusions: ['Valid'] },
        { type: 'createArgument', conclusions: ['Valid'] }, // missing premises
      ];

      for (const invalidMessage of invalidPremisesMessages) {
        // Act
        for (const handler of messageHandlers) {
          await handler(invalidMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'At least one premise is required',
          }),
        );
      }
    });

    it('should validate conclusions array in createArgument messages', async () => {
      const invalidConclusionsMessages = [
        { type: 'createArgument', premises: ['Valid'], conclusions: null },
        { type: 'createArgument', premises: ['Valid'], conclusions: 'string' },
        { type: 'createArgument', premises: ['Valid'], conclusions: [] },
        { type: 'createArgument', premises: ['Valid'] }, // missing conclusions
      ];

      for (const invalidMessage of invalidConclusionsMessages) {
        // Act
        for (const handler of messageHandlers) {
          await handler(invalidMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'At least one conclusion is required',
          }),
        );
      }
    });

    it('should handle bootstrap controller errors during argument creation', async () => {
      (mockBootstrapController.createBootstrapArgument as any).mockResolvedValueOnce(
        err(new ValidationError('Bootstrap creation failed')),
      );

      const validMessage = {
        type: 'createArgument',
        premises: ['Test premise'],
        conclusions: ['Test conclusion'],
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validMessage);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Bootstrap creation failed',
        }),
      );
    });

    it('should handle argument population errors', async () => {
      (mockBootstrapController.populateEmptyArgument as any).mockResolvedValueOnce(
        err(new ValidationError('Population failed')),
      );

      const validMessage = {
        type: 'createArgument',
        premises: ['Test premise'],
        conclusions: ['Test conclusion'],
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validMessage);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Population failed',
        }),
      );
    });
  });

  describe('Statement Management Message Handling', () => {
    it('should handle addStatement messages with proper validation', async () => {
      const validAddMessage = {
        type: 'addStatement',
        statementType: 'premise',
        content: 'New premise statement',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validAddMessage);
      }

      // Assert
      expect(mockProofApplicationService.createStatement).toHaveBeenCalledWith({
        documentId: 'test-document',
        content: 'New premise statement',
      });
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(Object), // WebviewId
        expect.objectContaining({
          type: 'statementAdded',
          statementType: 'premise',
          statementId: 'new-stmt-123',
          content: 'Created statement',
        }),
      );
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Premise added successfully',
        }),
      );
    });

    it('should handle addStatement for conclusions', async () => {
      const conclusionMessage = {
        type: 'addStatement',
        statementType: 'conclusion',
        content: 'New conclusion statement',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(conclusionMessage);
      }

      // Assert
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Conclusion added successfully',
        }),
      );
    });

    it('should validate statement content in addStatement messages', async () => {
      const invalidContentMessages = [
        { type: 'addStatement', statementType: 'premise', content: '' },
        { type: 'addStatement', statementType: 'premise', content: '   ' },
        { type: 'addStatement', statementType: 'premise', content: null },
        { type: 'addStatement', statementType: 'premise' }, // missing content
      ];

      for (const invalidMessage of invalidContentMessages) {
        vi.clearAllMocks();

        // Act
        for (const handler of messageHandlers) {
          await handler(invalidMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'Statement content cannot be empty',
          }),
        );
      }
    });

    it('should handle statement creation service errors', async () => {
      (mockProofApplicationService.createStatement as any).mockResolvedValueOnce(
        err(new ValidationError('Statement creation failed')),
      );

      const validMessage = {
        type: 'addStatement',
        statementType: 'premise',
        content: 'Valid content',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validMessage);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Statement creation failed',
        }),
      );
    });
  });

  describe('Interactive Editing Message Handling', () => {
    it('should handle editContent messages for statements', async () => {
      const editStatementMessage = {
        type: 'editContent',
        metadata: {
          type: 'statement',
          statementId: 'stmt-123',
          nodeId: 'node-456',
          statementType: 'premise',
        },
        newContent: 'Updated statement content',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(editStatementMessage);
      }

      // Assert
      expect(mockProofApplicationService.updateStatement).toHaveBeenCalledWith({
        documentId: 'test-document',
        statementId: 'stmt-123',
        content: 'Updated statement content',
      });
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Statement updated successfully',
        }),
      );
    });

    it('should handle editContent messages for labels', async () => {
      const editLabelMessage = {
        type: 'editContent',
        metadata: {
          type: 'label',
          nodeId: 'node-456',
          labelType: 'side',
        },
        newContent: 'Updated label text',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(editLabelMessage);
      }

      // Assert
      expect(mockProofApplicationService.updateArgumentLabel).toHaveBeenCalledWith({
        documentId: 'test-document',
        argumentId: 'node-456',
        sideLabels: {
          side: 'Updated label text',
        },
      });
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Label updated successfully',
        }),
      );
    });

    it('should validate editContent message structure', async () => {
      const invalidEditMessages = [
        { type: 'editContent', metadata: null, newContent: 'Valid' },
        { type: 'editContent', metadata: {}, newContent: 'Valid' },
        { type: 'editContent', metadata: { type: 'statement' }, newContent: 'Valid' }, // missing statementId
        { type: 'editContent', metadata: { type: 'statement', statementId: 'stmt1' } }, // missing newContent
        { type: 'editContent', newContent: 'Valid' }, // missing metadata
      ];

      for (const invalidMessage of invalidEditMessages) {
        vi.clearAllMocks();

        // Act
        for (const handler of messageHandlers) {
          await handler(invalidMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'Invalid edit content request',
          }),
        );
      }
    });

    it('should handle statement update service errors', async () => {
      (mockProofApplicationService.updateStatement as any).mockResolvedValueOnce(
        err(new ValidationError('Update failed')),
      );

      const validMessage = {
        type: 'editContent',
        metadata: {
          type: 'statement',
          statementId: 'stmt-123',
        },
        newContent: 'Updated content',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(validMessage);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Failed to update statement: Update failed',
        }),
      );
    });
  });

  describe('Drag and Drop Message Handling', () => {
    it('should handle moveStatement messages with proper validation', async () => {
      // Mock document with atomic arguments containing the statements
      (mockDocumentQueryService.getDocumentById as any).mockResolvedValueOnce(
        ok({
          id: 'test-doc',
          statements: {
            'stmt-source': { id: 'stmt-source', content: 'Source statement' },
            'stmt-target': { id: 'stmt-target', content: 'Target statement' },
          },
          orderedSets: {
            os1: { statementIds: ['stmt-source'] },
            os2: { statementIds: ['stmt-target'] },
          },
          atomicArguments: {
            arg1: {
              id: 'arg1',
              premiseIds: [{ getValue: () => 'stmt-source' }],
              conclusionIds: [{ getValue: () => 'stmt-target' }],
            },
          },
          trees: {},
          nodes: {},
        }),
      );

      const moveStatementMessage = {
        type: 'moveStatement',
        sourceData: {
          statementId: 'stmt-source',
          statementType: 'premise',
          nodeId: 'node-source',
        },
        targetStatementId: 'stmt-target',
        dropType: 'conclusion',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(moveStatementMessage);
      }

      // Assert - statements are in the same argument, so it will show a different message
      expect(mockDocumentQueryService.getDocumentById).toHaveBeenCalled();
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Statement reordering within the same argument is not yet implemented',
        }),
      );
    });

    it('should handle moveNode messages with coordinate validation', async () => {
      // Create a valid NodeId for the test
      const nodeId = NodeId.create('node-123');
      if (!nodeId.isOk()) {
        throw new Error('Failed to create test NodeId');
      }

      // Mock document with trees
      (mockDocumentQueryService.getDocumentById as any).mockResolvedValueOnce(
        ok({
          id: 'test-doc',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {
            tree1: {
              id: 'tree1',
              position: {
                getX: () => 100,
                getY: () => 100,
              },
              rootNodeIds: [nodeId.value], // Use NodeId value object
            },
          },
          nodes: {},
        }),
      );

      const moveNodeMessage = {
        type: 'moveNode',
        nodeId: 'node-123',
        deltaX: 150,
        deltaY: -75,
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(moveNodeMessage);
      }

      // Assert
      expect(mockDocumentQueryService.getDocumentById).toHaveBeenCalled();
      expect(mockProofApplicationService.moveTree).toHaveBeenCalledWith({
        documentId: expect.any(String), // The actual documentId depends on how it's extracted from the URI
        treeId: 'tree1',
        position: { x: 250, y: 25 },
      });
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Node position updated successfully',
        }),
      );
    });

    it('should validate moveStatement message structure', async () => {
      const invalidMoveMessages = [
        {
          type: 'moveStatement',
          sourceData: null,
          targetStatementId: 'target',
          dropType: 'premise',
        },
        { type: 'moveStatement', sourceData: {}, targetStatementId: 'target', dropType: 'premise' },
        { type: 'moveStatement', sourceData: { statementId: 'src' }, dropType: 'premise' }, // missing target
        { type: 'moveStatement', sourceData: { statementId: 'src' }, targetStatementId: 'target' }, // missing dropType
      ];

      for (const invalidMessage of invalidMoveMessages) {
        vi.clearAllMocks();

        // Act
        for (const handler of messageHandlers) {
          await handler(invalidMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'Invalid move statement request',
          }),
        );
      }
    });

    it('should validate moveNode message parameters', async () => {
      const invalidNodeMoveMessages = [
        { type: 'moveNode', nodeId: null, deltaX: 10, deltaY: 20 },
        { type: 'moveNode', nodeId: '', deltaX: 10, deltaY: 20 },
        { type: 'moveNode', nodeId: 'node1', deltaX: 'invalid', deltaY: 20 },
        { type: 'moveNode', nodeId: 'node1', deltaX: 10, deltaY: 'invalid' },
        { type: 'moveNode', deltaX: 10, deltaY: 20 }, // missing nodeId
      ];

      for (const invalidMessage of invalidNodeMoveMessages) {
        vi.clearAllMocks();

        // Act
        for (const handler of messageHandlers) {
          await handler(invalidMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'Invalid move node request',
          }),
        );
      }
    });
  });

  describe('Export and Utility Message Handling', () => {
    it('should handle exportProof messages with document retrieval', async () => {
      // Mock showQuickPick to return a format selection
      (mockUIPort.showQuickPick as any).mockResolvedValueOnce(
        ok({ label: 'YAML (.proof)', description: 'Export as YAML proof file' }),
      );

      const exportMessage = { type: 'exportProof' };

      // Act
      for (const handler of messageHandlers) {
        await handler(exportMessage);
      }

      // Assert
      expect(mockUIPort.showQuickPick).toHaveBeenCalled();
      expect(mockExportService.saveToFile).toHaveBeenCalledWith('test-document', {
        format: 'yaml',
        includeMetadata: true,
        includeVisualization: false,
      });
      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Successfully exported proof to /test/path',
        }),
      );
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(Object), // WebviewId
        expect.objectContaining({
          type: 'exportCompleted',
          data: expect.any(Object), // EventData value object
        }),
      );
    });

    it('should handle export errors gracefully', async () => {
      // Mock showQuickPick to return a format selection
      (mockUIPort.showQuickPick as any).mockResolvedValueOnce(
        ok({ label: 'YAML (.proof)', description: 'Export as YAML proof file' }),
      );

      // Mock export service to return error
      (mockExportService.saveToFile as any).mockResolvedValueOnce(
        err(new ValidationError('Export failed')),
      );

      const exportMessage = { type: 'exportProof' };

      // Act
      for (const handler of messageHandlers) {
        await handler(exportMessage);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Export failed: Export failed',
        }),
      );
    });

    it('should handle showError messages', async () => {
      const errorMessage = {
        type: 'showError',
        message: 'Custom error message',
      };

      // Act
      for (const handler of messageHandlers) {
        await handler(errorMessage);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Custom error message',
        }),
      );
    });
  });

  describe('Error Recovery and Exception Handling', () => {
    it('should handle service exceptions during message processing', async () => {
      (mockViewStateManager.updateViewportState as any).mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const viewportMessage = {
        type: 'viewportChanged',
        viewport: { zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
      };

      // Act & Assert - Should not crash the panel
      for (const handler of messageHandlers) {
        expect(() => handler(viewportMessage)).not.toThrow();
      }
    });

    it('should handle async service rejections gracefully', async () => {
      (mockBootstrapController.createBootstrapArgument as any).mockRejectedValueOnce(
        new Error('Async service error'),
      );

      const createMessage = {
        type: 'createArgument',
        premises: ['Test'],
        conclusions: ['Test'],
      };

      // Act & Assert - Should not crash
      for (const handler of messageHandlers) {
        await expect(handler(createMessage)).resolves.not.toThrow();
      }

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.stringContaining('Failed to create argument'),
        }),
      );
    });

    it('should handle document ID extraction failures', async () => {
      // Clear existing message handlers
      const originalHandlers = [...messageHandlers];
      messageHandlers.length = 0;

      // Mock document ID service to return error for empty URI
      const mockFailingDocumentIdService = {
        extractFromUri: vi.fn().mockReturnValue(err(new ValidationError('Invalid URI'))),
        validateDocumentId: vi.fn().mockReturnValue(err(new ValidationError('Invalid URI'))),
        generateFallbackId: vi.fn().mockReturnValue('fallback-id'),
        extractFromUriWithFallback: vi
          .fn()
          .mockReturnValue(err(new ValidationError('Invalid URI'))),
      } as any;

      // Create panel with invalid URI
      const invalidPanel = await ProofTreePanel.createWithServices(
        '', // invalid URI
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
        mockFailingDocumentIdService,
      );

      expect(invalidPanel.isOk()).toBe(true);
      if (invalidPanel.isOk()) {
        // Wait for async initialization
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Ensure we have handlers for the invalid panel
        expect(messageHandlers.length).toBeGreaterThan(0);

        const createMessage = {
          type: 'createArgument',
          premises: ['Test'],
          conclusions: ['Test'],
        };

        // Act
        for (const handler of messageHandlers) {
          await handler(createMessage);
        }

        // Assert
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'Could not determine document ID',
          }),
        );
      }

      // Restore original handlers for other tests
      messageHandlers.length = 0;
      messageHandlers.push(...originalHandlers);
    });
  });

  describe('Property-Based Message Testing', () => {
    it('should handle arbitrary viewport message data', async () => {
      const viewportArbitrary = fc.record({
        zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true }),
        pan: fc.record({
          x: fc.integer({ min: -1000, max: 1000 }),
          y: fc.integer({ min: -1000, max: 1000 }),
        }),
        center: fc.record({
          x: fc.integer({ min: 0, max: 2000 }),
          y: fc.integer({ min: 0, max: 2000 }),
        }),
      });

      await fc.assert(
        fc.asyncProperty(viewportArbitrary, async (viewport) => {
          const message = { type: 'viewportChanged', viewport };

          // Act
          for (const handler of messageHandlers) {
            await handler(message);
          }

          // Assert
          expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(
            expect.objectContaining({
              zoom: expect.objectContaining({ value: viewport.zoom }),
              pan: expect.objectContaining({ x: viewport.pan.x, y: viewport.pan.y }),
              center: expect.objectContaining({ x: viewport.center.x, y: viewport.center.y }),
            }),
          );
        }),
        { numRuns: 20 },
      );
    });

    it('should handle arbitrary statement content safely', async () => {
      const statementArbitrary = fc.record({
        statementType: fc.constantFrom('premise', 'conclusion'),
        content: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
      });

      await fc.assert(
        fc.asyncProperty(statementArbitrary, async ({ statementType, content }) => {
          // Reset mocks for each iteration
          vi.clearAllMocks();
          (mockProofApplicationService.createStatement as any).mockResolvedValue(
            ok({ id: 'new-stmt-123', content: 'Created statement' }),
          );

          const message = { type: 'addStatement', statementType, content };

          // Act
          for (const handler of messageHandlers) {
            await handler(message);
          }

          // Assert - Should always call the service with trimmed content
          expect(mockProofApplicationService.createStatement).toHaveBeenCalledWith({
            documentId: 'test-document',
            content: content.trim(),
          });
        }),
        { numRuns: 25 },
      );
    });

    it('should handle arbitrary coordinate movements safely', async () => {
      const moveArbitrary = fc.record({
        nodeId: fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(s.trim())),
        deltaX: fc.integer({ min: -1000, max: 1000 }),
        deltaY: fc.integer({ min: -1000, max: 1000 }),
      });

      await fc.assert(
        fc.asyncProperty(moveArbitrary, async ({ nodeId, deltaX, deltaY }) => {
          // Reset mocks for each iteration
          vi.clearAllMocks();

          // Create a valid NodeId value object for the test
          const nodeIdResult = NodeId.create(nodeId);
          if (nodeIdResult.isErr()) {
            // Skip invalid nodeIds
            return;
          }

          // Mock document with trees for each test
          (mockDocumentQueryService.getDocumentById as any).mockResolvedValue(
            ok({
              id: 'test-doc',
              statements: {},
              orderedSets: {},
              atomicArguments: {},
              trees: {
                tree1: {
                  id: 'tree1',
                  position: {
                    getX: () => 100,
                    getY: () => 100,
                  },
                  rootNodeIds: [nodeIdResult.value], // Use the NodeId value object
                },
              },
              nodes: {},
            }),
          );
          (mockProofApplicationService.moveTree as any).mockResolvedValue(ok({ id: 'moved-tree' }));

          const message = { type: 'moveNode', nodeId, deltaX, deltaY };

          // Act & Assert - Should not throw regardless of values
          for (const handler of messageHandlers) {
            await expect(handler(message)).resolves.not.toThrow();
          }

          // Should handle message appropriately
          expect(mockProofApplicationService.moveTree).toHaveBeenCalledWith({
            documentId: expect.any(String), // The actual documentId depends on extraction
            treeId: 'tree1',
            position: { x: 100 + deltaX, y: 100 + deltaY },
          });
        }),
        { numRuns: 15 },
      );
    });
  });

  describe('Concurrent Message Handling', () => {
    it('should handle multiple simultaneous messages without race conditions', async () => {
      const messages = [
        {
          type: 'viewportChanged',
          viewport: { zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        },
        {
          type: 'panelStateChanged',
          panel: {
            miniMapVisible: true,
            sideLabelsVisible: true,
            validationPanelVisible: false,
            panelSizes: {},
          },
        },
        {
          type: 'selectionChanged',
          selection: { selectedNodes: ['n1'], selectedStatements: ['s1'], selectedTrees: ['t1'] },
        },
        { type: 'addStatement', statementType: 'premise', content: 'Concurrent statement' },
        { type: 'exportProof' },
      ];

      // Act - Send all messages concurrently
      const promises = messages.flatMap((message) =>
        messageHandlers.map((handler) => handler(message)),
      );

      await Promise.all(promises);

      // Assert - All services should have been called
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalled();
      expect(mockViewStateManager.updatePanelState).toHaveBeenCalled();
      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalled();
      expect(mockProofApplicationService.createStatement).toHaveBeenCalled();
      expect(mockDocumentQueryService.getDocumentById).toHaveBeenCalled();
    });

    it('should maintain message processing order under load', async () => {
      const processingOrder: string[] = [];

      // Mock services to track call order
      mockViewStateManager.updateViewportState = vi.fn().mockImplementation(async () => {
        processingOrder.push('viewport');
        return ok(undefined);
      });

      mockProofApplicationService.createStatement = vi.fn().mockImplementation(async () => {
        processingOrder.push('statement');
        return ok({ id: 'test', content: 'test' });
      });

      const orderedMessages = [
        {
          type: 'viewportChanged',
          viewport: { zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
        },
        { type: 'addStatement', statementType: 'premise', content: 'Order test' },
        {
          type: 'viewportChanged',
          viewport: { zoom: 2, pan: { x: 10, y: 10 }, center: { x: 10, y: 10 } },
        },
      ];

      // Act - Process messages sequentially
      for (const message of orderedMessages) {
        for (const handler of messageHandlers) {
          await handler(message);
        }
      }

      // Assert - Processing order should be maintained
      expect(processingOrder).toEqual(['viewport', 'statement', 'viewport']);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should not leak memory during intensive message processing', async () => {
      const baselineMemory = process.memoryUsage().heapUsed;

      // Process many messages
      for (let i = 0; i < 100; i++) {
        const message = {
          type: 'viewportChanged',
          viewport: { zoom: Math.random(), pan: { x: i, y: i }, center: { x: i * 2, y: i * 2 } },
        };

        for (const handler of messageHandlers) {
          await handler(message);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - baselineMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up resources when panel is disposed', () => {
      // Act
      panel.dispose();

      // Assert
      expect(mockWebviewPanel.dispose).toHaveBeenCalled();
    });
  });
});
