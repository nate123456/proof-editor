/**
 * Comprehensive tests for VS Code extension activation and functionality
 *
 * Tests cover:
 * - Extension activation/deactivation lifecycle
 * - Command registration and handling
 * - Document event handlers (open/change/close/editor change)
 * - WebView panel creation and management
 * - Context subscription management
 * - Error handling and edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextDocumentChangeEvent, TextEditor } from 'vscode';
import * as vscode from 'vscode';

// Mock VS Code module
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
  },
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(),
  },
  workspace: {
    onDidOpenTextDocument: vi.fn(),
    onDidChangeTextDocument: vi.fn(),
    onDidCloseTextDocument: vi.fn(),
    textDocuments: [],
  },
  Uri: {
    file: vi.fn().mockImplementation((path: string) => ({
      scheme: 'file',
      path,
      fsPath: path,
      toString: () => `file://${path}`,
    })),
  },
  Range: vi
    .fn()
    .mockImplementation(
      (startLine: number, startChar: number, endLine: number, endChar: number) => ({
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar },
        isEmpty: startLine === endLine && startChar === endChar,
        isSingleLine: startLine === endLine,
      }),
    ),
  Position: vi.fn().mockImplementation((line: number, character: number) => ({
    line,
    character,
  })),
  Selection: vi
    .fn()
    .mockImplementation(
      (anchorLine: number, anchorChar: number, activeLine: number, activeChar: number) => ({
        anchor: { line: anchorLine, character: anchorChar },
        active: { line: activeLine, character: activeChar },
        start: {
          line: Math.min(anchorLine, activeLine),
          character: anchorLine < activeLine ? anchorChar : activeChar,
        },
        end: {
          line: Math.max(anchorLine, activeLine),
          character: anchorLine > activeLine ? anchorChar : activeChar,
        },
        isEmpty: anchorLine === activeLine && anchorChar === activeChar,
        isSingleLine: anchorLine === activeLine,
        isReversed:
          anchorLine > activeLine || (anchorLine === activeLine && anchorChar > activeChar),
      }),
    ),
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
}));

// Create mock validation controller instance that will be reused
const mockValidationController = {
  validateDocumentImmediate: vi.fn(),
  validateDocumentDebounced: vi.fn(),
  clearDocumentValidation: vi.fn(),
  dispose: vi.fn(),
};

// Mock DI container
const mockContainer = {
  resolve: vi.fn((token: string) => {
    if (token === 'ValidationController') {
      return mockValidationController;
    }
    return {};
  }),
};

vi.mock('../../infrastructure/di/container.js', () => ({
  getContainer: vi.fn(() => mockContainer),
  initializeContainer: vi.fn(() => Promise.resolve(mockContainer)),
  TOKENS: {
    ValidationController: 'ValidationController',
  },
}));

vi.mock('../../infrastructure/di/tokens.js', () => ({
  TOKENS: {
    ValidationController: 'ValidationController',
  },
}));

// Mock dependencies
vi.mock('../../validation/index.js', () => ({
  ValidationController: vi.fn().mockImplementation(() => mockValidationController),
}));

vi.mock('../../webview/ProofTreePanel.js', () => ({
  ProofTreePanel: {
    createOrShow: vi.fn(),
    updateContentIfExists: vi.fn(),
  },
}));

// Import mocked modules for type checking
import { ProofTreePanel } from '../../webview/ProofTreePanel.js';
import { activate, deactivate } from '../extension.js';

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockTextDocument: TextDocument;
  let mockTextEditor: TextEditor;
  let mockWebviewPanel: vscode.WebviewPanel;
  let mockChangeEvent: TextDocumentChangeEvent;

  // Event handler storage for testing
  let onOpenHandler: (doc: TextDocument) => void;
  let onChangeHandler: (event: TextDocumentChangeEvent) => void;
  let onEditorChangeHandler: (editor: TextEditor | undefined) => void;
  let onCloseHandler: (doc: TextDocument) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock validation controller
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentDebounced.mockClear();
    mockValidationController.clearDocumentValidation.mockClear();
    mockValidationController.dispose.mockClear();

    // Create mock context
    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn().mockReturnValue([]),
      },
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn().mockReturnValue([]),
        setKeysForSync: vi.fn(),
      },
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn(),
      },
      extensionPath: '/test/extension',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/logs',
      logUri: vscode.Uri.file('/test/logs'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      storageUri: vscode.Uri.file('/test/storage'),
      languageModelAccessInformation: {
        onDidChange: vi.fn(),
        canSendRequest: vi.fn(),
      },
      asAbsolutePath: vi.fn().mockImplementation((path: string) => `/test/extension/${path}`),
      extensionMode: 1,
      environmentVariableCollection: {
        persistent: true,
        description: '',
        replace: vi.fn(),
        append: vi.fn(),
        prepend: vi.fn(),
        get: vi.fn(),
        forEach: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getScoped: vi.fn(),
        [Symbol.iterator]: vi.fn(),
      },
      extension: {
        id: 'test.extension',
        extensionUri: vscode.Uri.file('/test/extension'),
        extensionPath: '/test/extension',
        isActive: true,
        packageJSON: {},
        exports: undefined,
        activate: vi.fn(),
        extensionKind: 1,
      },
    };

    // Create mock text document
    mockTextDocument = {
      languageId: 'proof',
      uri: vscode.Uri.file('/test.proof'),
      getText: () => 'mock proof content',
      lineCount: 5,
      lineAt: vi.fn().mockImplementation((line: number | vscode.Position) => {
        const lineNumber = typeof line === 'number' ? line : line.line;
        return {
          text: `line ${lineNumber}`,
          lineNumber,
          range: new vscode.Range(lineNumber, 0, lineNumber, 10),
          rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber, 11),
          firstNonWhitespaceCharacterIndex: 0,
          isEmptyOrWhitespace: false,
        };
      }),
      fileName: '/path/to/test.proof',
      isUntitled: false,
      encoding: 'utf8',
      version: 1,
      isDirty: false,
      isClosed: false,
      save: vi.fn().mockResolvedValue(true),
      eol: 1,
      getWordRangeAtPosition: vi.fn(),
      validateRange: vi.fn(),
      validatePosition: vi.fn(),
      offsetAt: vi.fn(),
      positionAt: vi.fn(),
    };

    // Create mock text editor
    mockTextEditor = {
      document: mockTextDocument,
      viewColumn: 1,
      selection: new vscode.Selection(0, 0, 0, 0),
      selections: [],
      visibleRanges: [],
      options: {},
      edit: vi.fn(),
      insertSnippet: vi.fn(),
      setDecorations: vi.fn(),
      revealRange: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    };

    // Create mock webview panel
    mockWebviewPanel = {
      viewType: 'proofTree',
      title: 'Proof Tree',
      options: {},
      viewColumn: vscode.ViewColumn.Two,
      active: true,
      visible: true,
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn(),
      onDidChangeViewState: vi.fn(),
      webview: {
        html: '',
        postMessage: vi.fn(),
        options: {},
        onDidReceiveMessage: vi.fn(),
        asWebviewUri: vi.fn(),
        cspSource: 'test',
      },
    };

    // Create mock change event
    mockChangeEvent = {
      document: mockTextDocument,
      contentChanges: [],
      reason: 1,
    };

    // Set up VS Code API mocks to capture event handlers
    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockImplementation((handler) => {
      onOpenHandler = handler;
      return { dispose: vi.fn() };
    });

    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation((handler) => {
      onChangeHandler = handler;
      return { dispose: vi.fn() };
    });

    vi.mocked(vscode.workspace.onDidCloseTextDocument).mockImplementation((handler) => {
      onCloseHandler = handler;
      return { dispose: vi.fn() };
    });

    vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((handler) => {
      onEditorChangeHandler = handler;
      return { dispose: vi.fn() };
    });

    vi.mocked(vscode.commands.registerCommand).mockReturnValue({ dispose: vi.fn() });
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockWebviewPanel);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);
    // Clear the textDocuments array for testing
    Object.defineProperty(vscode.workspace, 'textDocuments', {
      value: [],
      writable: true,
      configurable: true,
    });
  });

  describe('activate', () => {
    it('should create and register validation controller', async () => {
      await activate(mockContext);

      expect(mockContainer.resolve).toHaveBeenCalledWith('ValidationController');
      expect(mockContext.subscriptions).toHaveLength(6); // controller + command + 4 event handlers
    });

    it('should register showTree command', async () => {
      await activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'proofEditor.showTree',
        expect.any(Function),
      );
    });

    it('should register all event handlers', async () => {
      await activate(mockContext);

      expect(vscode.workspace.onDidOpenTextDocument).toHaveBeenCalledWith(expect.any(Function));
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalledWith(expect.any(Function));
      expect(vscode.workspace.onDidCloseTextDocument).toHaveBeenCalledWith(expect.any(Function));
      expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should add all disposables to context subscriptions', async () => {
      await activate(mockContext);

      // Should have: ValidationController + showTreeCommand + 4 event handlers
      expect(mockContext.subscriptions).toHaveLength(6);
    });

    it('should check for existing proof files', async () => {
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [mockTextDocument],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      expect(ProofTreePanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        'mock proof content',
      );
    });

    it('should not process non-proof files during initialization', async () => {
      const nonProofDoc = { ...mockTextDocument, languageId: 'javascript' };
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [nonProofDoc],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      expect(ProofTreePanel.createOrShow).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should complete without error', () => {
      expect(() => {
        deactivate();
      }).not.toThrow();
    });

    it('should be callable multiple times', () => {
      expect(() => {
        deactivate();
        deactivate();
        deactivate();
      }).not.toThrow();
    });
  });

  describe('showTree command', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should create webview panel when active editor has proof file', () => {
      vscode.window.activeTextEditor = mockTextEditor;

      // Get the registered command handler
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      commandHandler();

      expect(ProofTreePanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        'mock proof content',
      );
    });

    it('should show warning when no active editor', () => {
      vscode.window.activeTextEditor = undefined;

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      commandHandler();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Please open a .proof file to view the tree visualization.',
      );
      expect(ProofTreePanel.createOrShow).not.toHaveBeenCalled();
    });

    it('should show warning when active editor is not proof file', () => {
      const nonProofEditor = {
        ...mockTextEditor,
        document: { ...mockTextDocument, languageId: 'javascript' },
      };
      vscode.window.activeTextEditor = nonProofEditor;

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      commandHandler();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Please open a .proof file to view the tree visualization.',
      );
      expect(ProofTreePanel.createOrShow).not.toHaveBeenCalled();
    });
  });

  describe('document open handler', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should handle proof file opening', () => {
      onOpenHandler(mockTextDocument);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Proof Editor: Working with test.proof',
      );
      expect(ProofTreePanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        'mock proof content',
      );
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith(
        mockTextDocument,
      );
    });

    it('should extract filename from full path', () => {
      const docWithLongPath = {
        ...mockTextDocument,
        fileName: '/very/long/path/to/complex-file.proof',
      };

      onOpenHandler(docWithLongPath);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Proof Editor: Working with complex-file.proof',
      );
    });

    it('should handle filenames without path separators', () => {
      const docWithSimpleName = {
        ...mockTextDocument,
        fileName: 'simple.proof',
      };

      onOpenHandler(docWithSimpleName);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Proof Editor: Working with simple.proof',
      );
    });

    it('should ignore non-proof files', () => {
      const nonProofDoc = { ...mockTextDocument, languageId: 'javascript' };

      onOpenHandler(nonProofDoc);

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
      expect(ProofTreePanel.createOrShow).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('document change handler', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should handle proof file changes', () => {
      onChangeHandler(mockChangeEvent);

      expect(ProofTreePanel.updateContentIfExists).toHaveBeenCalledWith('mock proof content');
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledWith(
        mockTextDocument,
      );
    });

    it('should ignore non-proof file changes', () => {
      const nonProofChangeEvent = {
        ...mockChangeEvent,
        document: { ...mockTextDocument, languageId: 'javascript' },
      };

      onChangeHandler(nonProofChangeEvent);

      expect(ProofTreePanel.updateContentIfExists).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).not.toHaveBeenCalled();
    });
  });

  describe('active editor change handler', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should handle switching to proof file editor', () => {
      onEditorChangeHandler(mockTextEditor);

      expect(ProofTreePanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        'mock proof content',
      );
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith(
        mockTextDocument,
      );
    });

    it('should ignore switching to non-proof file editor', () => {
      const nonProofEditor = {
        ...mockTextEditor,
        document: { ...mockTextDocument, languageId: 'javascript' },
      };

      onEditorChangeHandler(nonProofEditor);

      expect(ProofTreePanel.createOrShow).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });

    it('should handle undefined editor (no active editor)', () => {
      onEditorChangeHandler(undefined);

      expect(ProofTreePanel.createOrShow).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('document close handler', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should clear validation for closed proof files', () => {
      onCloseHandler(mockTextDocument);

      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledWith(
        mockTextDocument,
      );
    });

    it('should ignore closing non-proof files', () => {
      const nonProofDoc = { ...mockTextDocument, languageId: 'javascript' };

      onCloseHandler(nonProofDoc);

      expect(mockValidationController.clearDocumentValidation).not.toHaveBeenCalled();
    });
  });

  describe('helper functions', () => {
    it('should extract filename from path with forward slashes', async () => {
      await activate(mockContext);

      const docWithPath = {
        ...mockTextDocument,
        fileName: 'folder/subfolder/file.proof',
      };

      onOpenHandler(docWithPath);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Proof Editor: Working with file.proof',
      );
    });

    it('should handle empty filename gracefully', async () => {
      await activate(mockContext);

      const docWithEmptyName = {
        ...mockTextDocument,
        fileName: '',
      };

      onOpenHandler(docWithEmptyName);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Proof Editor: Working with ',
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle ValidationController constructor throwing', async () => {
      mockContainer.resolve.mockImplementationOnce(() => {
        throw new Error('Mock validation error');
      });

      await expect(activate(mockContext)).rejects.toThrow('Mock validation error');
    });

    it('should handle ProofTreePanel.createOrShow throwing', async () => {
      await activate(mockContext);
      vi.mocked(ProofTreePanel.createOrShow).mockImplementationOnce(() => {
        throw new Error('Mock webview error');
      });

      expect(() => {
        onOpenHandler(mockTextDocument);
      }).toThrow('Mock webview error');
    });

    it('should handle getText() throwing', async () => {
      await activate(mockContext);
      const docWithBadGetText = {
        ...mockTextDocument,
        getText: () => {
          throw new Error('Mock getText error');
        },
      };

      expect(() => {
        onOpenHandler(docWithBadGetText);
      }).toThrow('Mock getText error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid document changes', async () => {
      await activate(mockContext);

      // Simulate rapid document changes
      for (let i = 0; i < 10; i++) {
        onChangeHandler(mockChangeEvent);
      }

      expect(ProofTreePanel.updateContentIfExists).toHaveBeenCalledTimes(10);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple proof files being opened', async () => {
      await activate(mockContext);

      const doc1 = { ...mockTextDocument, fileName: 'file1.proof' };
      const doc2 = { ...mockTextDocument, fileName: 'file2.proof' };
      const doc3 = { ...mockTextDocument, fileName: 'file3.proof' };

      onOpenHandler(doc1);
      onOpenHandler(doc2);
      onOpenHandler(doc3);

      expect(ProofTreePanel.createOrShow).toHaveBeenCalledTimes(3);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed file types correctly', async () => {
      await activate(mockContext);

      const proofDoc = mockTextDocument;
      const jsDoc = { ...mockTextDocument, languageId: 'javascript' };
      const pyDoc = { ...mockTextDocument, languageId: 'python' };

      onOpenHandler(proofDoc);
      onOpenHandler(jsDoc);
      onOpenHandler(pyDoc);

      // Only proof file should be processed
      expect(ProofTreePanel.createOrShow).toHaveBeenCalledTimes(1);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscription management', () => {
    it('should add validation controller to subscriptions', async () => {
      await activate(mockContext);

      expect(mockContext.subscriptions).toContain(mockValidationController);
    });

    it('should add all event handlers to subscriptions', async () => {
      await activate(mockContext);

      // Should have 6 items: ValidationController + showTreeCommand + 4 event handlers
      expect(mockContext.subscriptions).toHaveLength(6);
    });

    it('should handle subscription disposal', async () => {
      await activate(mockContext);

      // Each subscription should have a dispose method
      mockContext.subscriptions.forEach((subscription) => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');
      });
    });
  });
});
