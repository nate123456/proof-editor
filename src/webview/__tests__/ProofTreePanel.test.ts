import 'reflect-metadata';

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createTestContainer, resetContainer } from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import { ProofTreePanelLegacy } from '../ProofTreePanelLegacy.js';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    activeTextEditor: null,
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

// Mock the parser and renderer
const mockParseProofFile = vi.fn();
const mockGenerateSVG = vi.fn();
const mockParseDocumentContent = vi.fn();
const _mockGenerateVisualization = vi.fn();

// Create mock implementations for DI
const mockProofFileParser = {
  parseProofFile: mockParseProofFile,
};

const mockTreeRenderer = {
  generateSVG: mockGenerateSVG,
};

const mockDocumentQueryService = {
  parseDocumentContent: mockParseDocumentContent,
  getDocumentById: vi.fn(),
  listDocuments: vi.fn(),
};

describe('ProofTreePanel', () => {
  const mockPanel = {
    webview: {
      html: '',
      postMessage: vi.fn(),
    },
    onDidDispose: vi.fn(),
    reveal: vi.fn(),
    dispose: vi.fn(),
  };

  const mockExtensionUri = { scheme: 'file', path: '/test' } as vscode.Uri;

  let mockProofVisualizationService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

    // Reset static state
    (ProofTreePanelLegacy as any).currentPanel = undefined;
    (ProofTreePanelLegacy as any).creationPromise = undefined;

    // Reset container
    resetContainer();

    // Register required dependencies in test container
    mockContainer.registerInstance(TOKENS.ProofFileParser, mockProofFileParser);
    mockContainer.registerInstance(TOKENS.TreeRenderer, mockTreeRenderer);
    mockContainer.registerInstance(TOKENS.DocumentQueryService, mockDocumentQueryService);

    // Register ProofVisualizationService mock
    mockProofVisualizationService = {
      generateVisualization: vi.fn().mockReturnValue(
        ok({
          trees: [],
          metadata: { totalNodes: 0, totalTrees: 0 },
        }),
      ),
      updateConfig: vi.fn(),
    };
    mockContainer.registerInstance(TOKENS.ProofVisualizationService, mockProofVisualizationService);

    // Register ViewStateManager and IViewStatePort mocks
    const mockViewStateManager = {
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
    };
    mockContainer.registerInstance(TOKENS.ViewStateManager, mockViewStateManager);

    const mockViewStatePort = {
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
    };
    mockContainer.registerInstance(TOKENS.IViewStatePort, mockViewStatePort);

    // Reset parser mock to default success behavior
    mockParseProofFile.mockReturnValue(
      ok({
        statements: new Map(),
        orderedSets: new Map(),
        atomicArguments: new Map(),
        trees: new Map(),
        nodes: new Map(),
      }),
    );

    // Reset DocumentQueryService mock to default success behavior
    mockParseDocumentContent.mockResolvedValue(
      ok({
        statements: new Map(),
        orderedSets: new Map(),
        atomicArguments: new Map(),
        trees: new Map(),
        nodes: new Map(),
      }),
    );

    // Reset ProofVisualizationService mock to default success behavior
    mockProofVisualizationService.generateVisualization.mockReturnValue(
      ok({
        trees: [],
        metadata: { totalNodes: 0, totalTrees: 0 },
      }),
    );

    // Reset renderer mock to default behavior
    mockGenerateSVG.mockReturnValue('<svg>test</svg>');
  });

  describe('createOrShow', () => {
    it('should create new panel when none exists', async () => {
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        1,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockExtensionUri],
        },
      );
    });

    it('should reveal existing panel when it exists', async () => {
      // Create first panel
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for first panel creation to complete properly
      await ProofTreePanelLegacy.waitForCreation();

      // Verify panel was created
      if (!ProofTreePanelLegacy.hasCurrentPanel()) {
        const error = ProofTreePanelLegacy.getLastCreationError();
        console.log('Panel creation failed with error:', error);
      }
      expect(ProofTreePanelLegacy.hasCurrentPanel()).toBe(true);

      // Clear the mock call count
      vi.clearAllMocks();

      // Try to create another panel
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'updated content');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
      expect(mockPanel.reveal).toHaveBeenCalled();
    });
  });

  describe('updateContentIfExists', () => {
    it('should not throw when no panel exists', () => {
      expect(() => {
        ProofTreePanelLegacy.updateContentIfExists('test content');
      }).not.toThrow();
    });

    it('should update content when panel exists', async () => {
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'initial content');

      // Wait for panel creation to complete
      await ProofTreePanelLegacy.waitForCreation();

      // Clear previous calls to focus on the updateContentIfExists call
      mockPanel.webview.postMessage.mockClear();

      ProofTreePanelLegacy.updateContentIfExists('updated content');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not throw and should call postMessage for the update
      expect(mockPanel.webview.postMessage).toHaveBeenCalled();
    });
  });

  describe('HTML content generation', () => {
    it('should generate proper HTML with VS Code theme support', async () => {
      // Mock the webview panel to capture HTML content when set
      let capturedHtml = '';
      const mockPanelWithHtmlCapture = {
        webview: {
          postMessage: vi.fn(),
          get html() {
            return capturedHtml;
          },
          set html(value) {
            capturedHtml = value;
          },
        },
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
        dispose: vi.fn(),
      };

      // Set up the new mock (don't clear all mocks as it breaks the setup)
      vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanelWithHtmlCapture as any);

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'test content');

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Check that createWebviewPanel was called with the right parameters
      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        1,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockExtensionUri],
        },
      );

      // The HTML should now be captured
      expect(capturedHtml).toContain('var(--vscode-editor-background)');
      expect(capturedHtml).toContain('var(--vscode-editor-foreground)');
      expect(capturedHtml).toContain('tree-container');
      expect(capturedHtml).toContain("window.addEventListener('message'");
    });
  });

  describe('Error handling', () => {
    it('should handle parse errors by showing error content', async () => {
      // Mock the DocumentQueryService to return errors
      mockParseDocumentContent.mockResolvedValue(
        err({
          message: 'Syntax error on line 1',
        }),
      );

      // Create panel and trigger error
      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'invalid: [content');

      // Wait for async operations to complete - need more time for full async chain
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should post error message
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        type: 'showError',
        content: expect.stringContaining('Parse Errors'),
      });
    });

    it('should escape HTML in error messages', async () => {
      mockParseDocumentContent.mockResolvedValue(
        err({
          message: 'Error with <script>alert("xss")</script> content',
        }),
      );

      ProofTreePanelLegacy.createOrShow(mockExtensionUri, 'malicious content');

      // Wait for async operations to complete - need more time for full async chain
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should escape HTML entities
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        type: 'showError',
        content: expect.stringContaining('&lt;script&gt;'),
      });
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        type: 'showError',
        content: expect.stringContaining('&quot;xss&quot;'),
      });
    });
  });
});
