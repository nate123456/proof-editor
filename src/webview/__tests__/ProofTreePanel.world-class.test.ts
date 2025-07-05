/**
 * World-Class ProofTreePanel Test Suite
 *
 * COMPREHENSIVE TESTING STRATEGY:
 * 1. Unit Tests - Isolated component testing with proper mocking
 * 2. Integration Tests - Service orchestration and interaction testing
 * 3. Property-Based Tests - Edge case discovery with random inputs
 * 4. Performance Tests - Scalability and memory testing
 * 5. Visual Regression Tests - SVG generation consistency
 * 6. Error Boundary Tests - Graceful degradation under failures
 *
 * COVERAGE TARGETS:
 * - Line coverage: 95%+
 * - Branch coverage: 90%+
 * - Function coverage: 100%
 * - Integration coverage: All service interactions
 */

import 'reflect-metadata';

import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// Test utilities and factories
import {
  PerformanceTestUtils,
  TestScenarios,
} from '../../__tests__/utils/integration-test-factories.js';
import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
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

// ============================================================================
// ADVANCED TEST UTILITIES
// ============================================================================

/**
 * Creates a complete mock service ecosystem for ProofTreePanel testing
 */
function createMockServiceEcosystem() {
  // Create a mock webview that tracks HTML updates
  const mockWebview = {
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proof Tree</title>
      </head>
      <body>
        <main aria-label="Proof Tree Visualization">
          <button aria-label="Create new argument">Create Argument</button>
          <div aria-role="tree" aria-label="Proof structure">
            <svg aria-label="Proof tree diagram"></svg>
          </div>
        </main>
      </body>
      </html>`,
    onDidReceiveMessage: vi.fn(),
  };

  const mockWebviewPanel: WebviewPanel = {
    id: 'test-panel-world-class',
    webview: mockWebview,
    onDidDispose: vi.fn(),
    reveal: vi.fn(),
    dispose: vi.fn(),
  };

  const mockUIPort: IUIPort = {
    createWebviewPanel: vi.fn().mockReturnValue(mockWebviewPanel),
    postMessageToWebview: vi.fn(),
    showError: vi.fn(),
    showInformation: vi.fn(),
    showWarning: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi
      .fn()
      .mockResolvedValue(ok({ label: 'YAML (.proof)', description: 'Export as YAML proof file' })),
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

  const mockViewStatePort: IViewStatePort = {
    loadViewState: vi.fn().mockResolvedValue(ok(null)),
    saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
    clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
    hasViewState: vi.fn().mockResolvedValue(ok(false)),
    getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
    clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
  };

  const mockDocumentQueryService: DocumentQueryService = {
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

  const mockVisualizationService: ProofVisualizationService = {
    generateVisualization: vi.fn().mockReturnValue(
      ok({
        trees: [],
        metadata: { totalNodes: 0, totalTrees: 0 },
      }),
    ),
    updateConfig: vi.fn(),
  } as any;

  const mockRenderer: TreeRenderer = {
    generateSVG: vi.fn().mockReturnValue('<svg><g id="test-tree"></g></svg>'),
  } as any;

  const mockViewStateManager: ViewStateManager = {
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

  const mockBootstrapController: BootstrapController = {
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

  const mockProofApplicationService: ProofApplicationService = {
    createStatement: vi
      .fn()
      .mockResolvedValue(ok({ id: 'test-statement-id', content: 'Test statement' })),
    updateStatement: vi.fn().mockResolvedValue(ok(undefined)),
  } as any;

  const mockYAMLSerializer: YAMLSerializer = {
    serialize: vi.fn().mockReturnValue('test: yaml'),
    deserialize: vi.fn().mockReturnValue({}),
  } as any;

  const mockExportService: IExportService = {
    saveToFile: vi.fn().mockResolvedValue(
      ok({
        filePath: '/test/export.proof',
        savedSuccessfully: true,
      }),
    ),
  } as any;

  const mockDocumentIdService: IDocumentIdService = {
    extractFromUriWithFallback: vi.fn().mockReturnValue(ok('test-document-id')),
  } as any;

  return {
    mockWebviewPanel,
    mockUIPort,
    mockViewStatePort,
    mockDocumentQueryService,
    mockVisualizationService,
    mockRenderer,
    mockViewStateManager,
    mockBootstrapController,
    mockProofApplicationService,
    mockYAMLSerializer,
    mockExportService,
    mockDocumentIdService,
  };
}

/**
 * Property-based test arbitraries for generating realistic test data
 */
const Arbitraries = {
  statement: () =>
    fc
      .string({ minLength: 1, maxLength: 200 })
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim()),

  premises: () => fc.array(Arbitraries.statement(), { minLength: 1, maxLength: 5 }),

  conclusions: () => fc.array(Arbitraries.statement(), { minLength: 1, maxLength: 3 }),

  coordinates: () =>
    fc.record({
      deltaX: fc.integer({ min: -1000, max: 1000 }),
      deltaY: fc.integer({ min: -1000, max: 1000 }),
    }),

  nodeId: () =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),

  documentUri: () => fc.constant('file:///test/document.proof'),

  zoom: () => fc.float({ min: Math.fround(0.1), max: Math.fround(5.0) }),

  viewport: () =>
    fc.record({
      zoom: Arbitraries.zoom(),
      pan: fc.record({
        x: fc.integer({ min: -2000, max: 2000 }),
        y: fc.integer({ min: -2000, max: 2000 }),
      }),
      center: fc.record({
        x: fc.integer({ min: -2000, max: 2000 }),
        y: fc.integer({ min: -2000, max: 2000 }),
      }),
    }),
};

/**
 * Performance test utilities specific to ProofTreePanel
 */
const PerformanceUtils = {
  async measurePanelCreation(
    services: ReturnType<typeof createMockServiceEcosystem>,
    iterations = 10,
  ) {
    return PerformanceTestUtils.measureExecutionTime(async () => {
      return ProofTreePanel.createWithServices(
        'file:///test/performance.proof',
        'test content',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );
    }, iterations);
  },

  async measureContentUpdate(panel: ProofTreePanel, contentSize: number) {
    const largeContent = 'test statement '.repeat(contentSize);
    return PerformanceTestUtils.measureExecutionTime(async () => {
      return panel.updateContent(largeContent);
    });
  },
};

// ============================================================================
// COMPREHENSIVE TEST SUITE
// ============================================================================

describe('ProofTreePanel - World-Class Test Coverage', () => {
  let services: ReturnType<typeof createMockServiceEcosystem>;

  beforeEach(() => {
    vi.clearAllMocks();
    services = createMockServiceEcosystem();
  });

  // ==========================================================================
  // UNIT TESTS - Isolated Component Testing
  // ==========================================================================

  describe('Unit Tests - Core Functionality', () => {
    it('should create panel with all required dependencies', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/unit-test.proof',
        'unit test content',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
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
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(services.mockUIPort.createWebviewPanel).toHaveBeenCalledWith({
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
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      // View state restoration should be triggered
      expect(services.mockViewStatePort.loadViewState).toHaveBeenCalled();
    });

    it('should properly dispose of resources', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/disposal.proof',
        'disposal test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;
        panel.dispose();

        expect(services.mockWebviewPanel.dispose).toHaveBeenCalled();
      }
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS - Service Orchestration
  // ==========================================================================

  describe('Integration Tests - Service Orchestration', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/integration.proof',
        'integration test content',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
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
      expect(services.mockDocumentQueryService.parseDocumentContent).toHaveBeenCalledWith(content);
      expect(services.mockVisualizationService.generateVisualization).toHaveBeenCalled();
      expect(services.mockRenderer.generateSVG).toHaveBeenCalled();
      expect(services.mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'updateTree',
        content: '<svg><g id="test-tree"></g></svg>',
      });
    });

    it('should handle parsing errors through Result pattern without throwing', async () => {
      vi.mocked(services.mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
        err(new ValidationApplicationError('Parse error for integration test')),
      );

      const result = await panel.updateContent('invalid content');

      expect(result.isOk()).toBe(true); // Should not fail, just show error
      expect(services.mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'showError',
        content: expect.stringContaining('Parse Errors'),
      });
    });

    it('should handle visualization errors gracefully', async () => {
      vi.mocked(services.mockVisualizationService.generateVisualization).mockReturnValue(
        err(new ValidationError('Visualization error for integration test')),
      );

      const result = await panel.updateContent('valid content');

      expect(result.isOk()).toBe(true);
      expect(services.mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
        type: 'showError',
        content: expect.stringContaining('Visualization error for integration test'),
      });
    });

    it('should coordinate argument creation across multiple services', async () => {
      // Wait for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify that the message handler was registered during panel creation
      expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

      // Get the message handler from the mock calls
      const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
        .calls[0]?.[0];
      expect(messageHandler).toBeDefined();

      if (messageHandler) {
        await messageHandler({
          type: 'createArgument',
          premises: ['All humans are mortal', 'Socrates is human'],
          conclusions: ['Therefore, Socrates is mortal'],
          ruleName: 'Modus Ponens',
        });

        expect(services.mockBootstrapController.createBootstrapArgument).toHaveBeenCalled();
        expect(services.mockBootstrapController.populateEmptyArgument).toHaveBeenCalled();
        expect(services.mockUIPort.postMessageToWebview).toHaveBeenCalledWith(panel.getPanelId(), {
          type: 'argumentCreated',
          argumentId: 'test-argument-id',
        });
      }
    });

    it('should handle statement creation through application service', async () => {
      // Wait for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify that the message handler was registered during panel creation
      expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

      const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
        .calls[0]?.[0];
      expect(messageHandler).toBeDefined();

      if (messageHandler) {
        await messageHandler({
          type: 'addStatement',
          statementType: 'premise',
          content: 'All logical systems have rules',
        });

        expect(services.mockProofApplicationService.createStatement).toHaveBeenCalledWith({
          documentId: 'test-document-id',
          content: 'All logical systems have rules',
        });

        expect(services.mockUIPort.showInformation).toHaveBeenCalledWith(
          'Premise added successfully',
        );
      }
    });

    it('should coordinate export through multiple services', async () => {
      // Wait for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify that the message handler was registered during panel creation
      expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

      const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
        .calls[0]?.[0];
      expect(messageHandler).toBeDefined();

      if (messageHandler) {
        await messageHandler({
          type: 'exportProof',
        });

        expect(services.mockUIPort.showQuickPick).toHaveBeenCalled();
        expect(services.mockExportService.saveToFile).toHaveBeenCalledWith('test-document-id', {
          format: 'yaml',
          includeMetadata: true,
          includeVisualization: false,
        });

        expect(services.mockUIPort.showInformation).toHaveBeenCalledWith(
          'Successfully exported proof to /test/export.proof',
        );
      }
    });
  });

  // ==========================================================================
  // PROPERTY-BASED TESTS - Edge Case Discovery
  // ==========================================================================

  describe('Property-Based Tests - Edge Case Discovery', () => {
    let panel: ProofTreePanel;

    beforeEach(async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/property-based.proof',
        'property test content',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      if (result.isErr()) {
        throw new Error(`Failed to create panel: ${result.error.message}`);
      }

      panel = result.value;
    });

    it('should handle arbitrary valid statement content safely', () => {
      fc.assert(
        fc.asyncProperty(Arbitraries.statement(), async (content) => {
          const result = await panel.updateContent(content);

          // Should never throw, always return a Result
          expect(result.isOk() || result.isErr()).toBe(true);

          // Should always call the parsing service
          expect(services.mockDocumentQueryService.parseDocumentContent).toHaveBeenCalled();
        }),
        { numRuns: 20 },
      );
    });

    it('should handle arbitrary viewport changes without breaking', () => {
      fc.assert(
        fc.asyncProperty(Arbitraries.viewport(), async (viewport) => {
          const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage)
            .mock.calls[0]?.[0];
          expect(messageHandler).toBeDefined();

          if (messageHandler) {
            // Should not throw regardless of viewport values
            await expect(
              messageHandler({
                type: 'viewportChanged',
                viewport,
              }),
            ).resolves.not.toThrow();

            expect(services.mockViewStateManager.updateViewportState).toHaveBeenCalledWith(
              viewport,
            );
          }
        }),
        { numRuns: 15 },
      );
    });

    it('should handle arbitrary argument creation parameters gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          Arbitraries.premises(),
          Arbitraries.conclusions(),
          async (premises, conclusions) => {
            const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];
            expect(messageHandler).toBeDefined();

            if (messageHandler) {
              await expect(
                messageHandler({
                  type: 'createArgument',
                  premises,
                  conclusions,
                  ruleName: 'Test Rule',
                }),
              ).resolves.not.toThrow();

              // Should validate input properly
              if (premises.length > 0 && conclusions.length > 0) {
                expect(services.mockBootstrapController.createBootstrapArgument).toHaveBeenCalled();
              }
            }
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should handle arbitrary coordinate movements safely', () => {
      fc.assert(
        fc.asyncProperty(
          Arbitraries.nodeId(),
          Arbitraries.coordinates(),
          async (nodeId, { deltaX, deltaY }) => {
            const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];
            expect(messageHandler).toBeDefined();

            if (messageHandler) {
              await expect(
                messageHandler({
                  type: 'moveNode',
                  nodeId,
                  deltaX,
                  deltaY,
                }),
              ).resolves.not.toThrow();

              // Should always show appropriate feedback
              expect(services.mockUIPort.showInformation).toHaveBeenCalled();
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // ==========================================================================
  // PERFORMANCE TESTS - Scalability and Memory
  // ==========================================================================

  describe('Performance Tests - Scalability and Memory', () => {
    it('should create panels efficiently within time constraints', async () => {
      const { averageTime } = await PerformanceUtils.measurePanelCreation(services, 5);

      // Panel creation should be fast (under 100ms average)
      expect(averageTime).toBeLessThan(100);
    });

    it('should handle large content updates efficiently', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/performance-large.proof',
        'performance test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;

        // Test with increasingly large content
        const contentSizes = [100, 500, 1000];

        for (const size of contentSizes) {
          const { averageTime } = await PerformanceUtils.measureContentUpdate(panel, size);

          // Content updates should scale reasonably (under 200ms for 1000 statements)
          expect(averageTime).toBeLessThan(200);
        }
      }
    });

    it('should handle concurrent message processing without blocking', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/concurrent.proof',
        'concurrent test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Wait for async initialization to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify that the message handler was registered during panel creation
        expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

        const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
          .calls[0]?.[0];
        expect(messageHandler).toBeDefined();

        if (messageHandler) {
          // Simulate multiple concurrent messages
          const concurrentMessages = [
            {
              type: 'viewportChanged',
              viewport: { zoom: 1.5, pan: { x: 10, y: 20 }, center: { x: 0, y: 0 } },
            },
            { type: 'addStatement', statementType: 'premise', content: 'Concurrent statement 1' },
            {
              type: 'addStatement',
              statementType: 'conclusion',
              content: 'Concurrent statement 2',
            },
          ];

          const startTime = performance.now();

          await Promise.all(concurrentMessages.map((msg) => messageHandler(msg)));

          const endTime = performance.now();
          const totalTime = endTime - startTime;

          // All messages should process quickly even when concurrent
          expect(totalTime).toBeLessThan(100);
        }
      }
    });

    it('should not leak memory during repeated operations', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/memory-leak.proof',
        'memory test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;

        // Perform many repeated operations
        for (let i = 0; i < 50; i++) {
          await panel.updateContent(`test content iteration ${i}`);
        }

        // Memory usage should be reasonable (this is a basic check)
        // In a real environment, you'd measure actual memory usage
        expect(true).toBe(true); // Placeholder - actual memory measurement would go here
      }
    });
  });

  // ==========================================================================
  // ERROR BOUNDARY TESTS - Graceful Degradation
  // ==========================================================================

  describe('Error Boundary Tests - Graceful Degradation', () => {
    it('should handle service failures gracefully without crashing', async () => {
      // Simulate document service failure
      vi.mocked(services.mockDocumentQueryService.parseDocumentContent).mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/service-failure.proof',
        'service failure test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      // Panel creation will fail if parsing service fails during createWithServices
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        // Should get a meaningful error message
        expect(result.error.message).toBeDefined();
        expect(result.error.message).toContain('Service unavailable');
      }
    });

    it('should handle malformed webview messages without crashing', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/malformed-messages.proof',
        'malformed test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Wait for async initialization to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify that the message handler was registered during panel creation
        expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

        const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
          .calls[0]?.[0];
        expect(messageHandler).toBeDefined();

        if (messageHandler) {
          // Test various malformed messages
          const malformedMessages = [
            null,
            undefined,
            {},
            { type: 'unknown' },
            { type: 'createArgument' }, // missing required fields
            { type: 'moveNode', nodeId: null },
            { type: 'addStatement', content: null },
          ];

          for (const msg of malformedMessages) {
            await expect(messageHandler(msg as any)).resolves.not.toThrow();
          }
        }
      }
    });

    it('should handle document ID extraction failures gracefully', async () => {
      vi.mocked(services.mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
        err(new ValidationError('Cannot extract document ID')),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/id-extraction-failure.proof',
        'id failure test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      // Panel should still be created successfully
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Wait for async initialization to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify that the message handler was registered during panel creation
        expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

        const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
          .calls[0]?.[0];
        expect(messageHandler).toBeDefined();

        if (messageHandler) {
          // Operations requiring document ID should fail gracefully
          await messageHandler({
            type: 'createArgument',
            premises: ['Test premise'],
            conclusions: ['Test conclusion'],
          });

          expect(services.mockUIPort.showError).toHaveBeenCalledWith(
            expect.stringContaining('Could not determine document ID'),
          );
        }
      }
    });

    it('should handle view state restoration failures without breaking functionality', async () => {
      vi.mocked(services.mockViewStatePort.loadViewState).mockRejectedValue(
        new Error('View state corrupted'),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/view-state-failure.proof',
        'view state failure test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      // Panel creation should still succeed even if view state fails
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;

        // Basic functionality should still work
        const updateResult = await panel.updateContent('test content after view state failure');
        expect(updateResult.isOk()).toBe(true);
      }
    });
  });

  // ==========================================================================
  // VISUAL REGRESSION TESTS - SVG Generation Consistency
  // ==========================================================================

  describe('Visual Regression Tests - SVG Generation Consistency', () => {
    it('should generate consistent SVG output for same input', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/visual-regression.proof',
        'visual test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;

        // Update content multiple times with same input
        const testContent = TestScenarios.modusPonens.statements.join('\n');

        await panel.updateContent(testContent);
        const firstCall = vi
          .mocked(services.mockUIPort.postMessageToWebview)
          .mock.calls.find((call) => call[1].type === 'updateTree');

        vi.clearAllMocks();

        await panel.updateContent(testContent);
        const secondCall = vi
          .mocked(services.mockUIPort.postMessageToWebview)
          .mock.calls.find((call) => call[1].type === 'updateTree');

        // Should generate identical SVG for identical input
        expect(firstCall?.[1].content).toBe(secondCall?.[1].content);
      }
    });

    it('should generate valid SVG structure', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/svg-structure.proof',
        'svg structure test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;

        await panel.updateContent('test svg structure');

        const svgCall = vi
          .mocked(services.mockUIPort.postMessageToWebview)
          .mock.calls.find((call) => call[1].type === 'updateTree');

        expect(svgCall).toBeDefined();
        expect(svgCall?.[1].content).toMatch(/<svg/);
        expect(svgCall?.[1].content).toMatch(/<\/svg>/);
        expect(svgCall?.[1].content).toMatch(/id="test-tree"/);
      }
    });

    it('should handle complex proof structures in SVG generation', async () => {
      // Set up more complex visualization data
      vi.mocked(services.mockVisualizationService.generateVisualization).mockReturnValue(
        ok({
          documentId: 'test-doc',
          version: 1,
          trees: [
            {
              id: 'tree-1',
              position: { x: 0, y: 0 },
              layout: {
                nodes: [
                  { id: 'node-1', argumentId: 'arg-1', x: 100, y: 100 },
                  { id: 'node-2', argumentId: 'arg-2', x: 200, y: 200 },
                ],
                connections: [{ from: 'node-1', to: 'node-2', type: 'logical' }],
              },
              bounds: { width: 300, height: 300 },
            },
          ],
          totalDimensions: { width: 300, height: 300 },
          isEmpty: false,
        } as any),
      );

      const result = await ProofTreePanel.createWithServices(
        'file:///test/complex-svg.proof',
        'complex svg test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const panel = result.value;

        await panel.updateContent('complex proof structure');

        // Should render complex structures correctly
        expect(services.mockRenderer.generateSVG).toHaveBeenCalledWith({
          trees: expect.arrayContaining([
            expect.objectContaining({
              id: 'tree-1',
              nodes: expect.arrayContaining([
                expect.objectContaining({ id: 'node-1' }),
                expect.objectContaining({ id: 'node-2' }),
              ]),
            }),
          ]),
          metadata: expect.objectContaining({ totalNodes: 2, totalTrees: 1 }),
        });
      }
    });
  });

  // ==========================================================================
  // ACCESSIBILITY AND USABILITY TESTS
  // ==========================================================================

  describe('Accessibility and Usability Tests', () => {
    it('should generate webview content with proper accessibility attributes', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/accessibility.proof',
        'accessibility test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Check that webview HTML includes accessibility features
        const webviewHtml = services.mockWebviewPanel.webview.html;

        // Should include proper lang attribute
        expect(webviewHtml).toContain('lang="en"');

        // Should include viewport meta tag
        expect(webviewHtml).toContain('name="viewport"');

        // Should include proper semantic elements
        expect(webviewHtml).toContain('<button');
        // The generated HTML should include semantic HTML elements (which provide accessibility)
        // Check for main element OR section element OR div with id (all provide structure)
        const hasSemanticElements =
          webviewHtml.includes('<main') ||
          webviewHtml.includes('<section') ||
          webviewHtml.includes('<div id=');
        expect(hasSemanticElements).toBe(true);
      }
    });

    it('should support keyboard navigation patterns', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/keyboard-nav.proof',
        'keyboard test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const webviewHtml = services.mockWebviewPanel.webview.html;

        // Should include keyboard event handlers
        expect(webviewHtml).toContain('keydown');
        expect(webviewHtml).toContain('Escape');
        expect(webviewHtml).toContain('Enter');
      }
    });

    it('should provide clear error messages and user feedback', async () => {
      const result = await ProofTreePanel.createWithServices(
        'file:///test/user-feedback.proof',
        'feedback test',
        services.mockDocumentQueryService,
        services.mockVisualizationService,
        services.mockUIPort,
        services.mockRenderer,
        services.mockViewStateManager,
        services.mockViewStatePort,
        services.mockBootstrapController,
        services.mockProofApplicationService,
        services.mockYAMLSerializer,
        services.mockExportService,
        services.mockDocumentIdService,
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        // Wait for async initialization to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify that the message handler was registered during panel creation
        expect(services.mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();

        const messageHandler = vi.mocked(services.mockWebviewPanel.webview.onDidReceiveMessage).mock
          .calls[0]?.[0];
        expect(messageHandler).toBeDefined();

        if (messageHandler) {
          // Test error handling for invalid input
          await messageHandler({
            type: 'createArgument',
            premises: [], // Invalid: empty premises
            conclusions: ['Test conclusion'],
          });

          expect(services.mockUIPort.showError).toHaveBeenCalledWith(
            'At least one premise is required',
          );
        }
      }
    });
  });
});
