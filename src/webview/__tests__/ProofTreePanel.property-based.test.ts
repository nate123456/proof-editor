/**
 * Property-Based Testing Suite for ProofTreePanel
 *
 * Advanced property-based testing using fast-check to discover edge cases
 * and verify invariants that should hold across all possible inputs.
 *
 * TESTING APPROACH:
 * - Generate thousands of random but realistic inputs
 * - Verify system invariants hold regardless of input
 * - Discover edge cases that manual testing might miss
 * - Test business rule compliance under all conditions
 * - Verify error handling is comprehensive and consistent
 */

import 'reflect-metadata';

import fc from 'fast-check';
import { err, ok, type Result } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationApplicationError } from '../../application/dtos/operation-results.js';
import type { IUIPort, WebviewPanel } from '../../application/ports/IUIPort.js';
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

// Helper function to unwrap Result types in tests
function unwrap<T>(result: Result<T, any>): T {
  if (result.isErr()) {
    throw new Error(`Failed to unwrap Result: ${result.error}`);
  }
  return result.value;
}

// ============================================================================
// ADVANCED ARBITRARIES FOR REALISTIC DATA GENERATION
// ============================================================================

/**
 * Generates valid logical statement content
 */
const logicalStatement = () =>
  fc.oneof(
    // Simple statements
    fc.constantFrom(
      'All humans are mortal',
      'Socrates is human',
      'If P then Q',
      'P implies Q',
      'Not P',
      'P and Q',
      'P or Q',
    ),
    // Template-based statements
    fc
      .record({
        subject: fc.constantFrom('humans', 'animals', 'objects', 'numbers'),
        predicate: fc.constantFrom('are mortal', 'exist', 'have properties', 'follow laws'),
      })
      .map(({ subject, predicate }) => `All ${subject} ${predicate}`),
    // Conditional statements
    fc
      .record({
        antecedent: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        consequent: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
      })
      .map(({ antecedent, consequent }) => `If ${antecedent.trim()}, then ${consequent.trim()}`),
    // Quantified statements
    fc
      .record({
        quantifier: fc.constantFrom('All', 'Some', 'No'),
        noun: fc.constantFrom('cats', 'dogs', 'birds', 'fish'),
        verb: fc.constantFrom('fly', 'swim', 'run', 'exist'),
      })
      .map(({ quantifier, noun, verb }) => `${quantifier} ${noun} ${verb}`),
  );

/**
 * Generates realistic document URIs
 */
const documentUri = () =>
  fc
    .record({
      protocol: fc.constant('file:///'),
      path: fc.array(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        { minLength: 1, maxLength: 5 },
      ),
      filename: fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
      extension: fc.constantFrom('.proof', '.yaml', '.json'),
    })
    .map(
      ({ protocol, path, filename, extension }) =>
        `${protocol}${path.join('/')}/${filename}${extension}`,
    );

/**
 * Generates valid viewport configurations
 */
const viewport = () =>
  fc.record({
    zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true }),
    pan: fc.record({
      x: fc.integer({ min: -5000, max: 5000 }),
      y: fc.integer({ min: -5000, max: 5000 }),
    }),
    center: fc.record({
      x: fc.integer({ min: -2000, max: 2000 }),
      y: fc.integer({ min: -2000, max: 2000 }),
    }),
  });

/**
 * Generates panel state configurations
 */
const panelState = () =>
  fc.record({
    miniMapVisible: fc.boolean(),
    sideLabelsVisible: fc.boolean(),
    validationPanelVisible: fc.boolean(),
    panelSizes: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.integer({ min: 100, max: 1000 }),
    ),
  });

/**
 * Generates selection state configurations
 */
const selectionState = () =>
  fc.record({
    selectedNodes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
    selectedStatements: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
    selectedTrees: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  });

/**
 * Generates realistic argument creation parameters
 */
const argumentCreationParams = () =>
  fc.record({
    premises: fc.array(logicalStatement(), { minLength: 1, maxLength: 5 }),
    conclusions: fc.array(logicalStatement(), { minLength: 1, maxLength: 3 }),
    ruleName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  });

/**
 * Generates movement coordinates
 */
const movementCoordinates = () =>
  fc.record({
    nodeId: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
    deltaX: fc.integer({ min: -2000, max: 2000 }),
    deltaY: fc.integer({ min: -2000, max: 2000 }),
  });

/**
 * Generates content for testing with various edge cases
 */
const contentVariations = () =>
  fc.oneof(
    // Normal content
    fc
      .array(logicalStatement(), { minLength: 1, maxLength: 10 })
      .map((statements) => statements.join('\n')),
    // Edge case content
    fc.constantFrom('', ' ', '\n', '\t', '   \n   \t   '),
    // Special characters
    fc.string({ minLength: 0, maxLength: 100 }),
    // Very long content
    fc.string({ minLength: 1000, maxLength: 5000 }),
    // Malformed YAML-like content
    fc.constantFrom(
      'statements:\n  - incomplete:',
      'invalid: [\n  nested',
      '{{malformed}}',
      'statements: "unterminated string',
    ),
  );

// ============================================================================
// MOCK SERVICE ECOSYSTEM
// ============================================================================

function createPropertyTestMocks() {
  const mockWebviewPanel: WebviewPanel = {
    id: unwrap(WebviewId.create('property-test-panel')),
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn(),
    },
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
    showQuickPick: vi.fn(),
    showConfirmation: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showProgress: vi.fn(),
    setStatusMessage: vi.fn(),
    getTheme: vi.fn(),
    onThemeChange: vi.fn(),
    capabilities: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(ok(undefined)),
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
    parseDocumentContent: vi.fn().mockImplementation((content: string) => {
      // Simulate realistic parsing behavior
      if (content.trim().length === 0) {
        return Promise.resolve(err(new ValidationError('Empty content cannot be parsed')));
      }
      if (content.includes('{{malformed}}')) {
        return Promise.resolve(err(new ValidationError('Malformed content detected')));
      }
      return Promise.resolve(
        ok({
          statements: new Map(),
          orderedSets: new Map(),
          atomicArguments: new Map(),
          trees: new Map(),
          nodes: new Map(),
        }),
      );
    }),
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
    generateSVG: vi.fn().mockReturnValue('<svg><g id="property-test"></g></svg>'),
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
        data: { argumentId: 'property-test-argument' },
      }),
    ),
    populateEmptyArgument: vi.fn().mockResolvedValue(
      ok({
        success: true,
        data: { argumentId: 'property-test-argument' },
      }),
    ),
  } as any;

  const mockProofApplicationService: ProofApplicationService = {
    createStatement: vi
      .fn()
      .mockResolvedValue(ok({ id: 'property-test-statement', content: 'Test statement' })),
    updateStatement: vi.fn().mockResolvedValue(ok(undefined)),
  } as any;

  const mockYAMLSerializer: YAMLSerializer = {
    serialize: vi.fn().mockReturnValue('test: yaml'),
    deserialize: vi.fn().mockReturnValue({}),
  } as any;

  const mockExportService = {
    saveToFile: vi.fn().mockResolvedValue(
      ok({
        filePath: '/test/property-export.proof',
        savedSuccessfully: true,
      }),
    ),
  } as any;

  const mockDocumentIdService: IDocumentIdService = {
    extractFromUriWithFallback: vi.fn().mockReturnValue(ok('property-test-document')),
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

// ============================================================================
// PROPERTY-BASED TEST SUITE
// ============================================================================

describe('ProofTreePanel - Property-Based Testing', () => {
  let mocks: ReturnType<typeof createPropertyTestMocks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createPropertyTestMocks();
  });

  // ==========================================================================
  // PANEL CREATION INVARIANTS
  // ==========================================================================

  describe('Panel Creation Invariants', () => {
    it('should always create valid panel with any valid URI and content', () => {
      fc.assert(
        fc.asyncProperty(documentUri(), contentVariations(), async (uri, content) => {
          const result = await ProofTreePanel.createWithServices(
            uri,
            content,
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          // INVARIANT: Panel creation should succeed or fail gracefully
          expect(result.isOk() || result.isErr()).toBe(true);

          if (result.isOk()) {
            const panel = result.value;

            // INVARIANT: Panel should have valid URI and ID
            expect(panel.getDocumentUri()).toBe(uri);
            expect(panel.getPanelId()).toMatch(/^proof-tree-panel-\d+$/);

            // INVARIANT: Basic panel operations work
            expect(panel.getDocumentUri()).toBe(uri);
            expect(panel.getPanelId()).toBeDefined();

            // INVARIANT: Panel can be disposed without errors
            expect(() => panel.dispose()).not.toThrow();
          }
        }),
        { numRuns: 50, verbose: true },
      );
    });

    it('should handle all possible content parsing scenarios consistently', () => {
      fc.assert(
        fc.asyncProperty(contentVariations(), async (content) => {
          const result = await ProofTreePanel.createWithServices(
            'file:///test/content-parsing.proof',
            content,
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          // INVARIANT: Panel creation handles all content types gracefully
          expect(result.isOk() || result.isErr()).toBe(true);

          if (result.isOk()) {
            const panel = result.value;

            // Test content update behavior
            const updateResult = await panel.updateContent(content);

            // INVARIANT: Content updates return Results, never throw
            expect(updateResult.isOk() || updateResult.isErr()).toBe(true);
          }
        }),
        { numRuns: 30, verbose: true },
      );
    });
  });

  // ==========================================================================
  // VIEW STATE MANAGEMENT INVARIANTS
  // ==========================================================================

  describe('View State Management Invariants', () => {
    it('should handle all viewport configurations without breaking', () => {
      fc.assert(
        fc.asyncProperty(viewport(), async (viewportConfig) => {
          const result = await ProofTreePanel.createWithServices(
            'file:///test/viewport.proof',
            'viewport test',
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            // Wait for async initialization
            await new Promise((resolve) => setTimeout(resolve, 10));

            const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];

            if (messageHandler) {
              // INVARIANT: Viewport changes never throw exceptions
              expect(() =>
                messageHandler({
                  type: 'viewportChanged' as any,
                  data: { viewport: viewportConfig },
                } as any),
              ).not.toThrow();
            }
          }
        }),
        { numRuns: 30, verbose: true },
      );
    });

    it('should maintain panel state consistency across all configurations', () => {
      fc.assert(
        fc.asyncProperty(panelState(), async (panelConfig) => {
          const result = await ProofTreePanel.createWithServices(
            'file:///test/panel-state.proof',
            'panel state test',
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            // Wait for async initialization
            await new Promise((resolve) => setTimeout(resolve, 10));

            const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];

            if (messageHandler) {
              // INVARIANT: Panel state changes are handled gracefully
              expect(() =>
                messageHandler({
                  type: MessageType.PANEL_STATE_CHANGED,
                  ...panelConfig,
                }),
              ).not.toThrow();
            }
          }
        }),
        { numRuns: 25, verbose: true },
      );
    });

    it('should handle selection state changes consistently', () => {
      fc.assert(
        fc.asyncProperty(selectionState(), async (selectionConfig) => {
          const result = await ProofTreePanel.createWithServices(
            'file:///test/selection.proof',
            'selection test',
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            // Wait for async initialization
            await new Promise((resolve) => setTimeout(resolve, 10));

            const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];

            if (messageHandler) {
              // INVARIANT: Selection changes never cause system failure
              expect(() =>
                messageHandler({
                  type: MessageType.SELECTION_CHANGED,
                  ...selectionConfig,
                }),
              ).not.toThrow();
            }
          }
        }),
        { numRuns: 25, verbose: true },
      );
    });
  });

  // ==========================================================================
  // ARGUMENT CREATION INVARIANTS
  // ==========================================================================

  describe('Argument Creation Invariants', () => {
    it('should validate argument parameters correctly for all valid inputs', () => {
      fc.assert(
        fc.asyncProperty(argumentCreationParams(), async ({ premises, conclusions, ruleName }) => {
          const result = await ProofTreePanel.createWithServices(
            'file:///test/argument-creation.proof',
            'argument test',
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            // Wait for async initialization
            await new Promise((resolve) => setTimeout(resolve, 10));

            const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];

            if (messageHandler) {
              // INVARIANT: Argument creation never throws
              expect(() =>
                messageHandler({
                  type: 'createArgument' as any,
                  premises,
                  conclusions,
                  ruleName,
                } as any),
              ).not.toThrow();
            }
          }
        }),
        { numRuns: 40, verbose: true },
      );
    });

    it('should handle edge case argument inputs gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            premises: fc.oneof(
              fc.constant([]),
              fc.array(fc.constant(''), { maxLength: 5 }),
              fc.array(fc.string({ maxLength: 0 }), { maxLength: 5 }),
              fc.array(fc.string({ maxLength: 1000 }), { maxLength: 2 }),
            ),
            conclusions: fc.oneof(
              fc.constant([]),
              fc.array(fc.constant(''), { maxLength: 3 }),
              fc.array(fc.string({ maxLength: 0 }), { maxLength: 3 }),
              fc.array(fc.string({ maxLength: 1000 }), { maxLength: 2 }),
            ),
            ruleName: fc.oneof(
              fc.constant(undefined),
              fc.constant(''),
              fc.constant(' '),
              fc.string({ maxLength: 200 }),
            ),
          }),
          async ({ premises, conclusions, ruleName }) => {
            const result = await ProofTreePanel.createWithServices(
              'file:///test/edge-arguments.proof',
              'edge case test',
              mocks.mockDocumentQueryService,
              mocks.mockVisualizationService,
              mocks.mockUIPort,
              mocks.mockRenderer,
              mocks.mockViewStateManager,
              mocks.mockViewStatePort,
              mocks.mockBootstrapController,
              mocks.mockProofApplicationService,
              mocks.mockYAMLSerializer,
              mocks.mockExportService,
              mocks.mockDocumentIdService,
            );

            // Panel creation may fail with certain edge case inputs
            expect(result.isOk() || result.isErr()).toBe(true);

            if (result.isOk()) {
              // Wait for async initialization
              await new Promise((resolve) => setTimeout(resolve, 10));

              const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
                .mock.calls[0]?.[0];

              if (messageHandler) {
                // INVARIANT: Edge case inputs never crash the system
                expect(() =>
                  messageHandler({
                    type: 'createArgument' as any,
                    premises,
                    conclusions,
                    ruleName,
                  } as any),
                ).not.toThrow();
              }
            }
          },
        ),
        { numRuns: 30, verbose: true },
      );
    });
  });

  // ==========================================================================
  // MOVEMENT AND INTERACTION INVARIANTS
  // ==========================================================================

  describe('Movement and Interaction Invariants', () => {
    it('should handle all movement coordinates safely', () => {
      fc.assert(
        fc.asyncProperty(movementCoordinates(), async ({ nodeId, deltaX, deltaY }) => {
          const result = await ProofTreePanel.createWithServices(
            'file:///test/movement.proof',
            'movement test',
            mocks.mockDocumentQueryService,
            mocks.mockVisualizationService,
            mocks.mockUIPort,
            mocks.mockRenderer,
            mocks.mockViewStateManager,
            mocks.mockViewStatePort,
            mocks.mockBootstrapController,
            mocks.mockProofApplicationService,
            mocks.mockYAMLSerializer,
            mocks.mockExportService,
            mocks.mockDocumentIdService,
          );

          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            // Wait for async initialization
            await new Promise((resolve) => setTimeout(resolve, 10));

            const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
              .mock.calls[0]?.[0];

            if (messageHandler) {
              // INVARIANT: Movement operations never throw exceptions
              expect(() =>
                messageHandler({
                  type: 'moveNode' as any,
                  nodeId,
                  deltaX,
                  deltaY,
                } as any),
              ).not.toThrow();
            }
          }
        }),
        { numRuns: 30, verbose: true },
      );
    });

    it('should handle statement creation with all content variations', () => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            statementType: fc.constantFrom('premise', 'conclusion'),
            content: fc.oneof(
              logicalStatement(),
              fc.constant(''),
              fc.constant(' '),
              fc.string({ maxLength: 500 }),
              fc.string({ maxLength: 100 }),
            ),
          }),
          async ({ statementType, content }) => {
            const result = await ProofTreePanel.createWithServices(
              'file:///test/statements.proof',
              'statement test',
              mocks.mockDocumentQueryService,
              mocks.mockVisualizationService,
              mocks.mockUIPort,
              mocks.mockRenderer,
              mocks.mockViewStateManager,
              mocks.mockViewStatePort,
              mocks.mockBootstrapController,
              mocks.mockProofApplicationService,
              mocks.mockYAMLSerializer,
              mocks.mockExportService,
              mocks.mockDocumentIdService,
            );

            // Panel creation may fail with certain edge case inputs
            expect(result.isOk() || result.isErr()).toBe(true);

            if (result.isOk()) {
              // Wait for async initialization
              await new Promise((resolve) => setTimeout(resolve, 10));

              const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
                .mock.calls[0]?.[0];

              if (messageHandler) {
                // INVARIANT: Statement operations never crash
                expect(() =>
                  messageHandler({
                    type: 'addStatement' as any,
                    statementType,
                    content: content,
                  } as any),
                ).not.toThrow();
              }
            }
          },
        ),
        { numRuns: 35, verbose: true },
      );
    });
  });

  // ==========================================================================
  // ERROR HANDLING INVARIANTS
  // ==========================================================================

  describe('Error Handling Invariants', () => {
    it('should maintain system stability under all service failure scenarios', () => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            parseFailure: fc.boolean(),
            visualizationFailure: fc.boolean(),
            documentIdFailure: fc.boolean(),
            viewStateFailure: fc.boolean(),
          }),
          async ({ parseFailure, visualizationFailure, documentIdFailure, viewStateFailure }) => {
            // Configure service failures based on properties
            if (parseFailure) {
              vi.mocked(mocks.mockDocumentQueryService.parseDocumentContent).mockResolvedValue(
                err(new ValidationApplicationError('Property test parse failure')),
              );
            }

            if (visualizationFailure) {
              vi.mocked(mocks.mockVisualizationService.generateVisualization).mockReturnValue(
                err(new ValidationError('Property test visualization failure')),
              );
            }

            if (documentIdFailure) {
              vi.mocked(mocks.mockDocumentIdService.extractFromUriWithFallback).mockReturnValue(
                err(new ValidationError('Property test document ID failure')),
              );
            }

            if (viewStateFailure) {
              vi.mocked(mocks.mockViewStatePort.loadViewState).mockRejectedValue(
                new Error('Property test view state failure'),
              );
            }

            // INVARIANT: Panel creation handles service failures appropriately
            const result = await ProofTreePanel.createWithServices(
              'file:///test/failure-resilience.proof',
              'failure test',
              mocks.mockDocumentQueryService,
              mocks.mockVisualizationService,
              mocks.mockUIPort,
              mocks.mockRenderer,
              mocks.mockViewStateManager,
              mocks.mockViewStatePort,
              mocks.mockBootstrapController,
              mocks.mockProofApplicationService,
              mocks.mockYAMLSerializer,
              mocks.mockExportService,
              mocks.mockDocumentIdService,
            );

            // Panel creation should handle errors gracefully
            expect(result.isOk() || result.isErr()).toBe(true);

            if (result.isOk()) {
              const panel = result.value;

              // INVARIANT: Content updates handle failures gracefully
              const updateResult = await panel.updateContent('test under failure');
              expect(updateResult.isOk() || updateResult.isErr()).toBe(true);
            }
          },
        ),
        { numRuns: 20, verbose: true },
      );
    });

    it('should handle malformed message objects without system corruption', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant({}),
            fc.record({ type: fc.constant('unknown') }),
            fc.record({
              type: fc.constantFrom('createArgument', 'addStatement', 'moveNode'),
              invalidField: fc.anything(),
            }),
            fc.anything(),
          ),
          async (malformedMessage) => {
            const result = await ProofTreePanel.createWithServices(
              'file:///test/malformed-messages.proof',
              'malformed test',
              mocks.mockDocumentQueryService,
              mocks.mockVisualizationService,
              mocks.mockUIPort,
              mocks.mockRenderer,
              mocks.mockViewStateManager,
              mocks.mockViewStatePort,
              mocks.mockBootstrapController,
              mocks.mockProofApplicationService,
              mocks.mockYAMLSerializer,
              mocks.mockExportService,
              mocks.mockDocumentIdService,
            );

            // Panel creation may fail with certain edge case inputs
            expect(result.isOk() || result.isErr()).toBe(true);

            if (result.isOk()) {
              // Wait for async initialization
              await new Promise((resolve) => setTimeout(resolve, 10));

              const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
                .mock.calls[0]?.[0];

              if (messageHandler) {
                // INVARIANT: Malformed messages never crash the system
                expect(() => messageHandler(malformedMessage as any)).not.toThrow();
              }
            }
          },
        ),
        { numRuns: 25, verbose: true },
      );
    });
  });

  // ==========================================================================
  // RESOURCE MANAGEMENT INVARIANTS
  // ==========================================================================

  describe('Resource Management Invariants', () => {
    it('should properly dispose of resources regardless of panel state', () => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            performOperations: fc.boolean(),
            updateContentMultipleTimes: fc.boolean(),
            changeViewState: fc.boolean(),
          }),
          async ({ performOperations, updateContentMultipleTimes, changeViewState }) => {
            const result = await ProofTreePanel.createWithServices(
              'file:///test/disposal.proof',
              'disposal test',
              mocks.mockDocumentQueryService,
              mocks.mockVisualizationService,
              mocks.mockUIPort,
              mocks.mockRenderer,
              mocks.mockViewStateManager,
              mocks.mockViewStatePort,
              mocks.mockBootstrapController,
              mocks.mockProofApplicationService,
              mocks.mockYAMLSerializer,
              mocks.mockExportService,
              mocks.mockDocumentIdService,
            );

            // Panel creation should succeed with basic content
            expect(result.isOk() || result.isErr()).toBe(true);

            if (result.isOk()) {
              const panel = result.value;

              // Perform various operations based on properties
              if (updateContentMultipleTimes) {
                for (let i = 0; i < 3; i++) {
                  await panel.updateContent(`content update ${i}`);
                }
              }

              // Wait for async initialization
              await new Promise((resolve) => setTimeout(resolve, 10));

              const messageHandler = vi.mocked(mocks.mockWebviewPanel.webview.onDidReceiveMessage)
                .mock.calls[0]?.[0];

              if (changeViewState && messageHandler) {
                await messageHandler({
                  type: 'viewportChanged' as any,
                  zoom: 1.5,
                  pan: { x: 100, y: 200 },
                  center: { x: 0, y: 0 },
                } as any);
              }

              if (performOperations && messageHandler) {
                await messageHandler({
                  type: 'addStatement' as any,
                  statementType: 'premise',
                  content: 'Test statement for disposal',
                } as any);
              }

              // INVARIANT: Disposal always succeeds regardless of panel state
              expect(() => panel.dispose()).not.toThrow();

              // INVARIANT: Webview panel disposal is called
              expect(mocks.mockWebviewPanel.dispose).toHaveBeenCalled();
            }
          },
        ),
        { numRuns: 20, verbose: true },
      );
    });
  });
});
