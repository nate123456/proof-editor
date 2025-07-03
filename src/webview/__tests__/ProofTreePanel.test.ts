import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { ProofTreePanel } from '../ProofTreePanel.js';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(),
    activeTextEditor: null,
  },
  ViewColumn: {
    One: 1,
  },
  Uri: {
    file: vi.fn(),
  },
}));

// Mock the parser and renderer
const mockParseProofFile = vi.fn();

vi.mock('../../parser/index.js', () => ({
  ProofFileParser: vi.fn(() => ({
    parseProofFile: mockParseProofFile,
  })),
}));

vi.mock('../TreeRenderer.js', () => ({
  TreeRenderer: vi.fn(() => ({
    generateSVG: vi.fn(() => '<svg>test</svg>'),
  })),
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel as any);

    // Reset parser mock to default success behavior
    mockParseProofFile.mockReturnValue({
      isErr: vi.fn(() => false),
      isOk: vi.fn(() => true),
      value: {
        statements: new Map(),
        orderedSets: new Map(),
        atomicArguments: new Map(),
        trees: new Map(),
        nodes: new Map(),
      },
    });
  });

  describe('createOrShow', () => {
    it('should create new panel when none exists', () => {
      ProofTreePanel.createOrShow(mockExtensionUri, 'test content');

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'proofTreeVisualization',
        'Proof Tree Visualization',
        1,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockExtensionUri],
        }
      );
    });

    it('should reveal existing panel when it exists', () => {
      // Create first panel
      ProofTreePanel.createOrShow(mockExtensionUri, 'test content');

      // Clear the mock call count
      vi.clearAllMocks();

      // Try to create another panel
      ProofTreePanel.createOrShow(mockExtensionUri, 'updated content');

      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
      expect(mockPanel.reveal).toHaveBeenCalled();
    });
  });

  describe('updateContentIfExists', () => {
    it('should not throw when no panel exists', () => {
      expect(() => {
        ProofTreePanel.updateContentIfExists('test content');
      }).not.toThrow();
    });

    it('should update content when panel exists', () => {
      ProofTreePanel.createOrShow(mockExtensionUri, 'initial content');
      ProofTreePanel.updateContentIfExists('updated content');

      // Should not throw and should call postMessage
      expect(mockPanel.webview.postMessage).toHaveBeenCalled();
    });
  });

  describe('HTML content generation', () => {
    it('should generate proper HTML with VS Code theme support', () => {
      ProofTreePanel.createOrShow(mockExtensionUri, 'test content');

      const htmlContent = mockPanel.webview.html;
      expect(htmlContent).toContain('var(--vscode-editor-background)');
      expect(htmlContent).toContain('var(--vscode-editor-foreground)');
      expect(htmlContent).toContain('tree-container');
      expect(htmlContent).toContain("window.addEventListener('message'");
    });
  });

  describe('Error handling', () => {
    it('should handle parse errors by showing error content', () => {
      // Mock the parser to return errors
      mockParseProofFile.mockReturnValue({
        isErr: vi.fn(() => true),
        isOk: vi.fn(() => false),
        error: {
          errors: [{ message: 'Syntax error on line 1' }, { message: 'Missing reference: s1' }],
        },
      });

      // Create panel and trigger error
      ProofTreePanel.createOrShow(mockExtensionUri, 'invalid: [content');

      // Should post error message
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        type: 'showError',
        content: expect.stringContaining('Parse Errors'),
      });
    });

    it('should escape HTML in error messages', () => {
      mockParseProofFile.mockReturnValue({
        isErr: vi.fn(() => true),
        isOk: vi.fn(() => false),
        error: {
          errors: [{ message: 'Error with <script>alert("xss")</script> content' }],
        },
      });

      ProofTreePanel.createOrShow(mockExtensionUri, 'malicious content');

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
