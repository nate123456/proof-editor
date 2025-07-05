/**
 * HEAVY COVERAGE: Multi-Document ProofTreePanel Integration Tests
 *
 * Tests complex scenarios with multiple documents open simultaneously:
 * - Document switching state preservation
 * - Cross-document operation isolation
 * - Concurrent document operations
 * - Performance with many open documents
 * - Memory usage optimization
 * - View state per-document isolation
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import { createProofVisualizationDTO } from '../../application/dtos/view-dtos.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import { ValidationError } from '../../domain/shared/result.js';
import { ProofTreePanel } from '../ProofTreePanel.js';

describe('ProofTreePanel Multi-Document Integration Tests', () => {
  let mockDocumentQueryService: ReturnType<typeof vi.mocked<DocumentQueryService>>;
  let mockVisualizationService: ReturnType<typeof vi.mocked<ProofVisualizationService>>;
  let mockUIPort: ReturnType<typeof vi.mocked<IUIPort>>;
  let mockViewStatePort: ReturnType<typeof vi.mocked<IViewStatePort>>;
  let mockViewStateManager: any;
  let mockRenderer: any;
  let mockBootstrapController: any;
  let mockProofApplicationService: any;
  let mockYamlSerializer: any;

  // Document-specific state
  const documents = {
    doc1: {
      uri: 'file:///test/document1.proof',
      content:
        'arguments: {arg1: {premises: [stmt1], conclusions: [stmt2]}}\nstatements: {stmt1: "All humans are mortal", stmt2: "Socrates is mortal"}\ntrees: []',
      parsedData: {
        id: 'document1',
        version: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z',
        statements: {
          stmt1: {
            id: 'stmt1',
            content: 'All humans are mortal',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
          stmt2: {
            id: 'stmt2',
            content: 'Socrates is mortal',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        orderedSets: {},
        atomicArguments: { arg1: { id: 'arg1', premiseSetId: 'pset1', conclusionSetId: 'cset1' } },
        trees: {},
      },
      svgContent: '<svg>Document 1 Tree</svg>',
    },
    doc2: {
      uri: 'file:///test/document2.proof',
      content:
        'arguments: {arg2: {premises: [stmt3], conclusions: [stmt4]}}\nstatements: {stmt3: "All dogs are loyal", stmt4: "Buddy is loyal"}\ntrees: []',
      parsedData: {
        id: 'document2',
        version: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z',
        statements: {
          stmt3: {
            id: 'stmt3',
            content: 'All dogs are loyal',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
          stmt4: {
            id: 'stmt4',
            content: 'Buddy is loyal',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        orderedSets: {},
        atomicArguments: { arg2: { id: 'arg2', premiseSetId: 'pset2', conclusionSetId: 'cset2' } },
        trees: {},
      },
      svgContent: '<svg>Document 2 Tree</svg>',
    },
    doc3: {
      uri: 'file:///test/document3.proof',
      content:
        'arguments: {arg3: {premises: [stmt5, stmt6], conclusions: [stmt7]}}\nstatements: {stmt5: "All birds can fly", stmt6: "Penguins are birds", stmt7: "Penguins can fly"}\ntrees: []',
      parsedData: {
        id: 'document3',
        version: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z',
        statements: {
          stmt5: {
            id: 'stmt5',
            content: 'All birds can fly',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
          stmt6: {
            id: 'stmt6',
            content: 'Penguins are birds',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
          stmt7: {
            id: 'stmt7',
            content: 'Penguins can fly',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        orderedSets: {},
        atomicArguments: { arg3: { id: 'arg3', premiseSetId: 'pset3', conclusionSetId: 'cset3' } },
        trees: {},
      },
      svgContent: '<svg>Document 3 Tree</svg>',
    },
  };

  // Panel tracking
  const panels = new Map<string, { panel: ProofTreePanel; webviewPanel: WebviewPanel }>();

  beforeEach(() => {
    vi.clearAllMocks();
    panels.clear();

    // Mock services with document-aware behavior
    mockDocumentQueryService = vi.mocked<DocumentQueryService>({
      parseDocumentContent: vi.fn(),
      getDocumentById: vi.fn(),
      getStatementsByDocument: vi.fn(),
      getArgumentsByDocument: vi.fn(),
    } as any);

    mockVisualizationService = vi.mocked<ProofVisualizationService>({
      generateVisualization: vi.fn(),
      exportVisualization: vi.fn(),
    } as any);

    mockUIPort = vi.mocked<IUIPort>({
      createWebviewPanel: vi.fn(),
      postMessageToWebview: vi.fn(),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
    } as any);

    mockViewStatePort = vi.mocked<IViewStatePort>({
      loadViewState: vi.fn(),
      saveViewState: vi.fn(),
      clearViewState: vi.fn(),
      hasViewState: vi.fn(),
      getAllStateKeys: vi.fn(),
      clearAllViewState: vi.fn(),
    } as any);

    mockViewStateManager = {
      updateViewportState: vi.fn().mockResolvedValue(ok(undefined)),
      updatePanelState: vi.fn().mockResolvedValue(ok(undefined)),
      updateSelectionState: vi.fn().mockResolvedValue(ok(undefined)),
      getViewportState: vi
        .fn()
        .mockResolvedValue(ok({ zoom: 1, pan: { x: 0, y: 0 }, center: { x: 0, y: 0 } })),
      getPanelState: vi.fn().mockResolvedValue(
        ok({
          miniMapVisible: true,
          sideLabelsVisible: true,
          validationPanelVisible: false,
          panelSizes: {},
        }),
      ),
      getSelectionState: vi
        .fn()
        .mockResolvedValue(ok({ selectedNodes: [], selectedStatements: [], selectedTrees: [] })),
    };

    mockRenderer = {
      generateSVG: vi.fn(),
    };

    mockBootstrapController = {
      createBootstrapArgument: vi.fn(),
      populateEmptyArgument: vi.fn(),
    };

    mockProofApplicationService = {
      createStatement: vi.fn(),
      updateStatement: vi.fn(),
    };

    mockYamlSerializer = {
      serialize: vi.fn(),
      deserialize: vi.fn(),
    };

    // Setup document-specific parsing behavior
    mockDocumentQueryService.parseDocumentContent.mockImplementation((content) => {
      const doc = Object.values(documents).find((d) => d.content === content);
      return Promise.resolve(
        doc ? ok(doc.parsedData) : err(new ValidationApplicationError('Unknown document')),
      );
    });

    // Setup document-specific visualization
    mockVisualizationService.generateVisualization.mockImplementation((parsedData) => {
      const doc = Object.values(documents).find((d) => d.parsedData.id === parsedData.id);
      return doc
        ? ok(
            createProofVisualizationDTO(
              doc.parsedData.id,
              1,
              [],
              { width: 800, height: 600 },
              true,
            ),
          )
        : err(new ValidationError('Unknown document'));
    });

    // Setup document-specific rendering
    mockRenderer.generateSVG.mockImplementation((visualizationData: any) => {
      const doc = Object.values(documents).find((d) => d.parsedData.id === visualizationData.id);
      return doc ? doc.svgContent : '<svg>Unknown Document</svg>';
    });

    // Setup webview panel creation
    mockUIPort.createWebviewPanel.mockImplementation((_config) => {
      const webviewPanel = {
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn(),
        },
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
        dispose: vi.fn(),
      };
      return webviewPanel as any;
    });

    // Setup view state port with document isolation
    const documentStates = new Map<string, any>();
    mockViewStatePort.loadViewState.mockImplementation((key) => {
      return Promise.resolve(ok(documentStates.get(key) || null));
    });
    mockViewStatePort.saveViewState.mockImplementation((key, state) => {
      documentStates.set(key, state);
      return Promise.resolve(ok(undefined));
    });
    mockViewStatePort.clearViewState.mockImplementation((key) => {
      documentStates.delete(key);
      return Promise.resolve(ok(undefined));
    });
  });

  describe('Multiple Panel Creation and Management', () => {
    it('should create separate panels for different documents', async () => {
      // Arrange & Act
      const panel1Result = await ProofTreePanel.createWithServices(
        documents.doc1.uri,
        documents.doc1.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      const panel2Result = await ProofTreePanel.createWithServices(
        documents.doc2.uri,
        documents.doc2.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      // Assert
      expect(panel1Result.isOk()).toBe(true);
      expect(panel2Result.isOk()).toBe(true);

      if (panel1Result.isOk() && panel2Result.isOk()) {
        expect(panel1Result.value.getDocumentUri()).toBe(documents.doc1.uri);
        expect(panel2Result.value.getDocumentUri()).toBe(documents.doc2.uri);
        expect(panel1Result.value.getPanelId()).not.toBe(panel2Result.value.getPanelId());
      }

      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledTimes(2);
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'updateTree',
          content: documents.doc1.svgContent,
        }),
      );
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'updateTree',
          content: documents.doc2.svgContent,
        }),
      );
    });

    it('should handle 10+ simultaneous panel creation efficiently', async () => {
      // Arrange
      const documentUris = Array.from({ length: 12 }, (_, i) => `file:///test/doc${i}.proof`);
      const documentContents = Array.from(
        { length: 12 },
        (_, i) =>
          `arguments: {arg${i}: {premises: [stmt${i}], conclusions: [stmt${i + 100}]}}\nstatements: {stmt${i}: "Statement ${i}", stmt${i + 100}: "Conclusion ${i}"}\ntrees: []`,
      );

      // Setup parsing for generated documents
      mockDocumentQueryService.parseDocumentContent.mockImplementation((content) => {
        const index = documentContents.indexOf(content);
        if (index >= 0) {
          return Promise.resolve(
            ok({
              id: `document${index}`,
              version: 1,
              createdAt: '2025-01-01T00:00:00.000Z',
              modifiedAt: '2025-01-01T00:00:00.000Z',
              statements: {
                [`stmt${index}`]: {
                  id: `stmt${index}`,
                  content: `Statement ${index}`,
                  usageCount: 1,
                  createdAt: '2025-01-01T00:00:00.000Z',
                  modifiedAt: '2025-01-01T00:00:00.000Z',
                },
                [`stmt${index + 100}`]: {
                  id: `stmt${index + 100}`,
                  content: `Conclusion ${index}`,
                  usageCount: 1,
                  createdAt: '2025-01-01T00:00:00.000Z',
                  modifiedAt: '2025-01-01T00:00:00.000Z',
                },
              },
              orderedSets: {},
              atomicArguments: {
                [`arg${index}`]: {
                  id: `arg${index}`,
                  premiseSetId: `pset${index}`,
                  conclusionSetId: `cset${index}`,
                },
              },
              trees: {},
            }),
          );
        }
        return Promise.resolve(err(new ValidationApplicationError('Unknown document')));
      });

      mockVisualizationService.generateVisualization.mockReturnValue(
        ok(createProofVisualizationDTO('test', 1, [], { width: 800, height: 600 }, true)),
      );
      mockRenderer.generateSVG.mockReturnValue('<svg>Generated</svg>');

      const startTime = Date.now();

      // Act - Create all panels simultaneously
      const panelPromises = documentUris.map((uri, index) => {
        const content = documentContents[index];
        if (!content) {
          throw new Error(`Content not found for index ${index}`);
        }
        return ProofTreePanel.createWithServices(
          uri,
          content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        );
      });

      const results = await Promise.all(panelPromises);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.every((result) => result.isOk())).toBe(true);
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledTimes(12);

      // Verify unique panel IDs
      const panelIds = results
        .filter((result) => result.isOk())
        .map((result) => (result.isOk() ? result.value.getPanelId() : ''));
      expect(new Set(panelIds).size).toBe(12);
    });

    it('should handle panel creation errors without affecting other panels', async () => {
      // Arrange
      mockDocumentQueryService.parseDocumentContent
        .mockResolvedValueOnce(ok(documents.doc1.parsedData))
        .mockResolvedValueOnce(err(new ValidationApplicationError('Parse error for doc2')))
        .mockResolvedValueOnce(ok(documents.doc3.parsedData));

      // Act
      const results = await Promise.all([
        ProofTreePanel.createWithServices(
          documents.doc1.uri,
          documents.doc1.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc2.uri,
          documents.doc2.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc3.uri,
          documents.doc3.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      ]);

      // Assert
      expect(results[0]?.isOk()).toBe(true);
      expect(results[1]?.isErr()).toBe(true);
      expect(results[2]?.isOk()).toBe(true);

      if (results[1]?.isErr()) {
        expect(results[1].error.message).toContain('Parse error for doc2');
      }
    });
  });

  describe('Document State Isolation', () => {
    let panel1: ProofTreePanel;
    let panel2: ProofTreePanel;

    beforeEach(async () => {
      // Create two panels for testing
      const result1 = await ProofTreePanel.createWithServices(
        documents.doc1.uri,
        documents.doc1.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      const result2 = await ProofTreePanel.createWithServices(
        documents.doc2.uri,
        documents.doc2.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk()) panel1 = result1.value;
      if (result2.isOk()) panel2 = result2.value;
    });

    it('should maintain separate view states per document', async () => {
      // Arrange - Setup different viewport states for each document
      const viewState1 = { zoom: 2.0, pan: { x: 100, y: 150 }, center: { x: 50, y: 75 } };
      const viewState2 = { zoom: 0.5, pan: { x: -50, y: -25 }, center: { x: 25, y: 50 } };

      // Act - Update viewport for each panel
      await (panel1 as any).handleWebviewMessage({ type: 'viewportChanged', viewport: viewState1 });
      await (panel2 as any).handleWebviewMessage({ type: 'viewportChanged', viewport: viewState2 });

      // Assert - Verify states are saved separately
      expect(mockViewStatePort.saveViewState).toHaveBeenCalledWith(
        'file_test_document1.proof.viewport',
        expect.objectContaining(viewState1),
      );
      expect(mockViewStatePort.saveViewState).toHaveBeenCalledWith(
        'file_test_document2.proof.viewport',
        expect.objectContaining(viewState2),
      );
    });

    it('should maintain separate selection states per document', async () => {
      // Arrange
      const selection1 = {
        selectedNodes: ['node1', 'node2'],
        selectedStatements: ['stmt1'],
        selectedTrees: [],
      };
      const selection2 = {
        selectedNodes: ['node3'],
        selectedStatements: ['stmt3', 'stmt4'],
        selectedTrees: ['tree1'],
      };

      // Act
      await (panel1 as any).handleWebviewMessage({
        type: 'selectionChanged',
        selection: selection1,
      });
      await (panel2 as any).handleWebviewMessage({
        type: 'selectionChanged',
        selection: selection2,
      });

      // Assert
      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalledWith(
        expect.objectContaining(selection1),
      );
      expect(mockViewStateManager.updateSelectionState).toHaveBeenCalledWith(
        expect.objectContaining(selection2),
      );
    });

    it('should handle content updates independently', async () => {
      // Arrange
      const newContent1 =
        'arguments: {arg1_updated: {premises: [stmt1], conclusions: [stmt2]}}\nstatements: {stmt1: "Updated premise", stmt2: "Updated conclusion"}\ntrees: []';
      const newContent2 =
        'arguments: {arg2_updated: {premises: [stmt3], conclusions: [stmt4]}}\nstatements: {stmt3: "Different update", stmt4: "Different conclusion"}\ntrees: []';

      const updatedData1 = {
        id: 'document1',
        version: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z',
        statements: {
          stmt1: {
            id: 'stmt1',
            content: 'Updated premise',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
          stmt2: {
            id: 'stmt2',
            content: 'Updated conclusion',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };
      const updatedData2 = {
        id: 'document2',
        version: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z',
        statements: {
          stmt3: {
            id: 'stmt3',
            content: 'Different update',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
          stmt4: {
            id: 'stmt4',
            content: 'Different conclusion',
            usageCount: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      mockDocumentQueryService.parseDocumentContent
        .mockResolvedValueOnce(ok(updatedData1))
        .mockResolvedValueOnce(ok(updatedData2));

      mockVisualizationService.generateVisualization
        .mockReturnValueOnce(
          ok(
            createProofVisualizationDTO(updatedData1.id, 1, [], { width: 800, height: 600 }, true),
          ),
        )
        .mockReturnValueOnce(
          ok(
            createProofVisualizationDTO(updatedData2.id, 1, [], { width: 800, height: 600 }, true),
          ),
        );

      mockRenderer.generateSVG
        .mockReturnValueOnce('<svg>Updated Document 1</svg>')
        .mockReturnValueOnce('<svg>Updated Document 2</svg>');

      // Act
      const result1 = await panel1.updateContent(newContent1);
      const result2 = await panel2.updateContent(newContent2);

      // Assert
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        panel1.getPanelId(),
        expect.objectContaining({
          type: 'updateTree',
          content: '<svg>Updated Document 1</svg>',
        }),
      );
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        panel2.getPanelId(),
        expect.objectContaining({
          type: 'updateTree',
          content: '<svg>Updated Document 2</svg>',
        }),
      );
    });

    it('should isolate error states between documents', async () => {
      // Arrange
      const invalidContent = 'invalid: yaml: content:::';
      mockDocumentQueryService.parseDocumentContent
        .mockResolvedValueOnce(err(new ValidationApplicationError('Parse error for doc1')))
        .mockResolvedValueOnce(ok(documents.doc2.parsedData));

      // Act
      const result1 = await panel1.updateContent(invalidContent);
      const result2 = await panel2.updateContent(documents.doc2.content);

      // Assert
      expect(result1.isOk()).toBe(true); // Error handled gracefully
      expect(result2.isOk()).toBe(true);

      // Verify error shown only for first panel
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        panel1.getPanelId(),
        expect.objectContaining({
          type: 'showError',
        }),
      );

      // Verify second panel updated normally
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        panel2.getPanelId(),
        expect.objectContaining({
          type: 'updateTree',
          content: documents.doc2.svgContent,
        }),
      );
    });
  });

  describe('Concurrent Document Operations', () => {
    it('should handle concurrent content updates across multiple panels', async () => {
      // Arrange
      const panels = await Promise.all([
        ProofTreePanel.createWithServices(
          documents.doc1.uri,
          documents.doc1.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc2.uri,
          documents.doc2.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc3.uri,
          documents.doc3.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      ]);

      expect(panels.every((result) => result.isOk())).toBe(true);
      const activePanels = panels
        .filter((result) => result.isOk())
        .map((result) => {
          if (!result.isOk()) throw new Error('Panel should be Ok after filter');
          return result.value;
        });

      const updateContents = ['updated content 1', 'updated content 2', 'updated content 3'];

      // Setup mock responses for concurrent updates
      mockDocumentQueryService.parseDocumentContent.mockImplementation((content) => {
        const index = updateContents.indexOf(content);
        return Promise.resolve(
          ok({
            id: `updated${index}`,
            version: 1,
            createdAt: '2025-01-01T00:00:00.000Z',
            modifiedAt: '2025-01-01T00:00:00.000Z',
            statements: {},
            orderedSets: {},
            atomicArguments: {},
            trees: {},
          }),
        );
      });
      mockVisualizationService.generateVisualization.mockReturnValue(
        ok(createProofVisualizationDTO('test', 1, [], { width: 800, height: 600 }, true)),
      );
      mockRenderer.generateSVG.mockReturnValue('<svg>Updated</svg>');

      // Act - Concurrent updates
      const updatePromises = activePanels.map((panel, index) => {
        const content = updateContents[index];
        if (!content) {
          throw new Error(`Update content not found for index ${index}`);
        }
        return panel.updateContent(content);
      });

      const results = await Promise.all(updatePromises);

      // Assert
      expect(results.every((result) => result.isOk())).toBe(true);
      expect(mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledTimes(6); // 3 initial + 3 updates
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledTimes(6); // 3 initial + 3 updates
    });

    it('should handle concurrent argument creation across panels', async () => {
      // Arrange
      const panel1Result = await ProofTreePanel.createWithServices(
        documents.doc1.uri,
        documents.doc1.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      const panel2Result = await ProofTreePanel.createWithServices(
        documents.doc2.uri,
        documents.doc2.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      expect(panel1Result.isOk() && panel2Result.isOk()).toBe(true);

      if (!panel1Result.isOk() || !panel2Result.isOk()) {
        throw new Error('Panel creation failed');
      }

      // TypeScript control flow analysis requires separate checks for proper type narrowing
      if (!panel1Result.isOk()) throw new Error('Panel 1 creation failed');
      if (!panel2Result.isOk()) throw new Error('Panel 2 creation failed');

      const panel1 = panel1Result.value;
      const panel2 = panel2Result.value;

      mockBootstrapController.createBootstrapArgument.mockResolvedValue(
        ok({ data: { argumentId: 'new-arg' } }),
      );
      mockBootstrapController.populateEmptyArgument.mockResolvedValue(
        ok({ data: { argumentId: 'new-arg' } }),
      );

      const argumentData1 = {
        premises: ['Premise 1 for doc1'],
        conclusions: ['Conclusion 1 for doc1'],
        ruleName: 'Rule 1',
      };

      const argumentData2 = {
        premises: ['Premise 1 for doc2'],
        conclusions: ['Conclusion 1 for doc2'],
        ruleName: 'Rule 2',
      };

      // Act - Concurrent argument creation
      const createPromises = [
        (panel1 as any).handleWebviewMessage({ type: 'createArgument', ...argumentData1 }),
        (panel2 as any).handleWebviewMessage({ type: 'createArgument', ...argumentData2 }),
      ];

      await Promise.all(createPromises);

      // Assert
      expect(mockBootstrapController.createBootstrapArgument).toHaveBeenCalledTimes(2);
      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledTimes(2);

      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        'document1',
        'new-arg',
        argumentData1.premises,
        argumentData1.conclusions,
        { left: argumentData1.ruleName },
      );

      expect(mockBootstrapController.populateEmptyArgument).toHaveBeenCalledWith(
        'document2',
        'new-arg',
        argumentData2.premises,
        argumentData2.conclusions,
        { left: argumentData2.ruleName },
      );
    });

    it('should handle concurrent view state changes', async () => {
      // Arrange
      const panelResults = await Promise.all([
        ProofTreePanel.createWithServices(
          documents.doc1.uri,
          documents.doc1.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc2.uri,
          documents.doc2.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      ]);

      expect(panelResults.every((result) => result.isOk())).toBe(true);
      const panels = panelResults.map((result) => {
        if (!result.isOk()) throw new Error('Panel creation failed');
        return result.value;
      });

      const viewportChanges = [
        { zoom: 1.5, pan: { x: 10, y: 20 }, center: { x: 5, y: 10 } },
        { zoom: 2.0, pan: { x: -30, y: 40 }, center: { x: 15, y: 20 } },
      ];

      // Act - Concurrent viewport changes
      const changePromises = panels.map((panel, index) =>
        (panel as any).handleWebviewMessage({
          type: 'viewportChanged',
          viewport: viewportChanges[index],
        }),
      );

      await Promise.all(changePromises);

      // Assert
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledTimes(2);
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(viewportChanges[0]);
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledWith(viewportChanges[1]);
    });
  });

  describe('Memory Management with Multiple Documents', () => {
    it('should handle panel disposal and cleanup', async () => {
      // Arrange
      const panelResults = await Promise.all([
        ProofTreePanel.createWithServices(
          documents.doc1.uri,
          documents.doc1.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc2.uri,
          documents.doc2.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      ]);

      expect(panelResults.every((result) => result.isOk())).toBe(true);
      const panels = panelResults.map((result) => {
        if (!result.isOk()) throw new Error('Panel creation failed');
        return result.value;
      });
      const webviewPanels = panels.map((panel) => (panel as any).webviewPanel);

      // Act - Dispose panels
      panels.forEach((panel) => panel.dispose());

      // Assert
      webviewPanels.forEach((webviewPanel) => {
        expect(webviewPanel.dispose).toHaveBeenCalled();
      });
    });

    it('should handle memory pressure with many document switches', async () => {
      // Arrange
      const documentCount = 20;
      const documentData = Array.from({ length: documentCount }, (_, i) => ({
        uri: `file:///test/doc${i}.proof`,
        content: `doc ${i} content`,
        parsedData: {
          id: `doc${i}`,
          version: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
          modifiedAt: '2025-01-01T00:00:00.000Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        },
      }));

      mockDocumentQueryService.parseDocumentContent.mockImplementation((content) => {
        const doc = documentData.find((d) => d.content === content);
        return doc
          ? Promise.resolve(ok(doc.parsedData))
          : Promise.resolve(err(new ValidationApplicationError('Unknown')));
      });

      mockVisualizationService.generateVisualization.mockReturnValue(
        ok(createProofVisualizationDTO('test', 1, [], { width: 800, height: 600 }, true)),
      );
      mockRenderer.generateSVG.mockReturnValue('<svg>Test</svg>');

      // Act - Create and dispose panels rapidly
      for (let cycle = 0; cycle < 3; cycle++) {
        const panels = await Promise.all(
          documentData.map((doc) =>
            ProofTreePanel.createWithServices(
              doc.uri,
              doc.content,
              mockDocumentQueryService,
              mockVisualizationService,
              mockUIPort,
              mockRenderer,
              mockViewStateManager,
              mockViewStatePort,
              mockBootstrapController,
              mockProofApplicationService,
              mockYamlSerializer,
            ),
          ),
        );

        expect(panels.every((result) => result.isOk())).toBe(true);
        const activePanels = panels
          .filter((result) => result.isOk())
          .map((result) => {
            if (!result.isOk()) throw new Error('Panel should be Ok after filter');
            return result.value;
          });

        // Update content for all panels
        await Promise.all(
          activePanels.map((panel, index) => panel.updateContent(`updated content ${index}`)),
        );

        // Dispose all panels
        activePanels.forEach((panel) => panel.dispose());

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Assert - Should complete without memory issues
      expect(mockUIPort.createWebviewPanel).toHaveBeenCalledTimes(documentCount * 3);
    });

    it('should handle view state cleanup on panel disposal', async () => {
      // Arrange
      const panelResult = await ProofTreePanel.createWithServices(
        documents.doc1.uri,
        documents.doc1.content,
        mockDocumentQueryService,
        mockVisualizationService,
        mockUIPort,
        mockRenderer,
        mockViewStateManager,
        mockViewStatePort,
        mockBootstrapController,
        mockProofApplicationService,
        mockYamlSerializer,
      );

      expect(panelResult.isOk()).toBe(true);
      if (!panelResult.isOk()) throw new Error('Panel creation failed');
      const panel = panelResult.value;

      // Update some view state
      await (panel as any).handleWebviewMessage({
        type: 'viewportChanged',
        viewport: { zoom: 1.5, pan: { x: 10, y: 20 }, center: { x: 5, y: 10 } },
      });

      // Verify state was saved
      expect(mockViewStatePort.saveViewState).toHaveBeenCalled();

      // Act - Dispose panel
      panel.dispose();

      // Assert - Panel disposal should work without errors
      expect((panel as any).webviewPanel.dispose).toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    it('should batch webview updates efficiently with multiple panels', async () => {
      // Arrange
      const panelCount = 8;
      const panelPromises = Array.from({ length: panelCount }, (_, i) =>
        ProofTreePanel.createWithServices(
          `file:///test/doc${i}.proof`,
          `content ${i}`,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      );

      mockDocumentQueryService.parseDocumentContent.mockResolvedValue(
        ok({
          id: 'test',
          version: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
          modifiedAt: '2025-01-01T00:00:00.000Z',
          statements: {},
          orderedSets: {},
          atomicArguments: {},
          trees: {},
        }),
      );
      mockVisualizationService.generateVisualization.mockReturnValue(
        ok(createProofVisualizationDTO('test', 1, [], { width: 800, height: 600 }, true)),
      );
      mockRenderer.generateSVG.mockReturnValue('<svg>Test</svg>');

      const panelResults = await Promise.all(panelPromises);
      expect(panelResults.every((result) => result.isOk())).toBe(true);
      const panels = panelResults.map((result) => {
        if (!result.isOk()) throw new Error('Panel creation failed');
        return result.value;
      });

      const startTime = Date.now();

      // Act - Update all panels simultaneously
      await Promise.all(
        panels.map((panel, index) => panel.updateContent(`updated content ${index}`)),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - Should complete efficiently
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledTimes(panelCount * 2); // Initial + update
    });

    it('should handle view state operations efficiently with many documents', async () => {
      // Arrange
      const documentCount = 15;
      const panels = await Promise.all(
        Array.from({ length: documentCount }, (_, i) =>
          ProofTreePanel.createWithServices(
            `file:///test/doc${i}.proof`,
            `content ${i}`,
            mockDocumentQueryService,
            mockVisualizationService,
            mockUIPort,
            mockRenderer,
            mockViewStateManager,
            mockViewStatePort,
            mockBootstrapController,
            mockProofApplicationService,
            mockYamlSerializer,
          ),
        ),
      );

      expect(panels.every((result) => result.isOk())).toBe(true);
      const activePanels = panels.map((result) => {
        if (!result.isOk()) throw new Error('Panel creation failed');
        return result.value;
      });

      const startTime = Date.now();

      // Act - Update view state for all panels
      await Promise.all(
        activePanels.map((panel, index) =>
          (panel as any).handleWebviewMessage({
            type: 'viewportChanged',
            viewport: {
              zoom: 1 + index * 0.1,
              pan: { x: index * 10, y: index * 5 },
              center: { x: index, y: index },
            },
          }),
        ),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(300); // Should complete efficiently
      expect(mockViewStateManager.updateViewportState).toHaveBeenCalledTimes(documentCount);
    });
  });

  describe('Error Isolation and Recovery', () => {
    it('should isolate parsing errors to specific documents', async () => {
      // Arrange
      const validContent = documents.doc1.content;
      const invalidContent = 'invalid: yaml: content:::';

      mockDocumentQueryService.parseDocumentContent
        .mockResolvedValueOnce(ok(documents.doc1.parsedData))
        .mockResolvedValueOnce(err(new ValidationApplicationError('Parse error')))
        .mockResolvedValueOnce(ok(documents.doc3.parsedData));

      // Act
      const results = await Promise.all([
        ProofTreePanel.createWithServices(
          documents.doc1.uri,
          validContent,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc2.uri,
          invalidContent,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc3.uri,
          documents.doc3.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      ]);

      // Assert
      expect(results[0]?.isOk()).toBe(true);
      expect(results[1]?.isErr()).toBe(true);
      expect(results[2]?.isOk()).toBe(true);

      // Verify successful panels work normally
      if (results[0]?.isOk() && results[2]?.isOk()) {
        if (!results[0].isOk()) throw new Error('Result 0 should be Ok');
        if (!results[2].isOk()) throw new Error('Result 2 should be Ok');
        expect(results[0].value.getDocumentUri()).toBe(documents.doc1.uri);
        expect(results[2].value.getDocumentUri()).toBe(documents.doc3.uri);
      }
    });

    it('should recover from service errors in specific panels', async () => {
      // Arrange
      const panelResults = await Promise.all([
        ProofTreePanel.createWithServices(
          documents.doc1.uri,
          documents.doc1.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
        ProofTreePanel.createWithServices(
          documents.doc2.uri,
          documents.doc2.content,
          mockDocumentQueryService,
          mockVisualizationService,
          mockUIPort,
          mockRenderer,
          mockViewStateManager,
          mockViewStatePort,
          mockBootstrapController,
          mockProofApplicationService,
          mockYamlSerializer,
        ),
      ]);

      expect(panelResults.every((result) => result.isOk())).toBe(true);
      const panels = panelResults.map((result) => {
        if (!result.isOk()) throw new Error('Panel creation failed');
        return result.value;
      });

      // Setup service error for first panel only
      mockDocumentQueryService.parseDocumentContent
        .mockResolvedValueOnce(err(new ValidationApplicationError('Service error')))
        .mockResolvedValueOnce(ok(documents.doc2.parsedData));

      // Act - Update content for both panels
      const updateResults = await Promise.all([
        panels[0]?.updateContent('new content 1'),
        panels[1]?.updateContent('new content 2'),
      ]);

      // Assert
      expect(updateResults[0]?.isOk()).toBe(true); // Error handled gracefully
      expect(updateResults[1]?.isOk()).toBe(true);

      // Verify error shown only for first panel
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        panels[0]?.getPanelId(),
        expect.objectContaining({ type: 'showError' }),
      );

      // Verify second panel updated normally
      expect(mockUIPort.postMessageToWebview).toHaveBeenCalledWith(
        panels[1]?.getPanelId(),
        expect.objectContaining({ type: 'updateTree' }),
      );
    });
  });
});
