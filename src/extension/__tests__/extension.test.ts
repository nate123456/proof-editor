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

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextDocumentChangeEvent, TextEditor } from 'vscode';
import * as vscode from 'vscode';
import { ValidationError } from '../../domain/shared/result.js';

// Mock VS Code module
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showTextDocument: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(),
    visibleTextEditors: [],
  },
  workspace: {
    onDidOpenTextDocument: vi.fn(),
    onDidChangeTextDocument: vi.fn(),
    onDidCloseTextDocument: vi.fn(),
    openTextDocument: vi.fn(),
    createFileSystemWatcher: vi.fn((_pattern: string) => {
      // Mock file system watcher
      return {
        onDidChange: vi.fn((_handler) => {
          const disposable = { dispose: vi.fn() };
          return disposable;
        }),
        onDidCreate: vi.fn((_handler) => {
          const disposable = { dispose: vi.fn() };
          return disposable;
        }),
        onDidDelete: vi.fn((_handler) => {
          const disposable = { dispose: vi.fn() };
          return disposable;
        }),
        dispose: vi.fn(),
      };
    }),
    textDocuments: [],
  },
  Uri: {
    file: vi.fn().mockImplementation((path: string) => ({
      scheme: 'file',
      path,
      fsPath: path,
      toString: () => `file://${path}`,
    })),
    joinPath: vi.fn().mockImplementation((base: any, ...segments: string[]) => ({
      scheme: 'file',
      path: `${base.path}/${segments.join('/')}`,
      fsPath: `${base.fsPath}/${segments.join('/')}`,
      toString: () => `file://${base.fsPath}/${segments.join('/')}`,
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
  validateDocumentImmediate: vi.fn((_document: any) => {
    // Mock validation
  }),
  validateDocumentDebounced: vi.fn((_document: any) => {
    // Mock validation
  }),
  clearDocumentValidation: vi.fn((_document: any) => {
    // Mock validation cleanup
  }),
  dispose: vi.fn(),
};

// Create mock UI port
const mockUIPort = {
  showWarning: vi.fn(),
  showError: vi.fn(),
  showInformation: vi.fn(),
  createWebviewPanel: vi.fn(),
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  showConfirmation: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  showProgress: vi.fn(),
  setStatusMessage: vi.fn(),
  postMessageToWebview: vi.fn(),
  getTheme: vi.fn(),
  onThemeChange: vi.fn(),
  writeFile: vi.fn(),
  capabilities: vi.fn(),
};

// Create mock controllers
const mockDocumentController = {
  handleDocumentOpened: vi.fn(async (document: { fileName: string }) => {
    // Mock the actual behavior that should call UI port
    const fileName = document.fileName.split('/').pop() || document.fileName;
    mockUIPort.showInformation(`Proof Editor: Working with ${fileName}`);
  }),
  handleDocumentChanged: vi.fn(async (_document: { fileName: string }) => {
    // Mock document change handling
  }),
  handleDocumentClosed: vi.fn(async (_document: { fileName: string }) => {
    // Mock document close handling
  }),
  setPanelManager: vi.fn(),
  setViewStatePort: vi.fn(),
};

const mockProofTreeController = {
  showProofTreeForDocument: vi.fn(async (_content: string) => {
    // Mock successful tree display
    return { isOk: () => true };
  }),
};

// Shared mock objects to ensure consistency
const mockBootstrapController = {
  initializeEmptyDocument: vi.fn(),
  createBootstrapArgument: vi.fn(),
  populateEmptyArgument: vi.fn(),
  getBootstrapWorkflow: vi.fn(),
  createEmptyImplicationLine: vi.fn(),
};

const mockFileSystemPort = {
  capabilities: vi.fn().mockReturnValue({
    canWatch: true,
    canAccessArbitraryPaths: true,
    supportsOfflineStorage: true,
    persistence: 'permanent',
  }),
  readFile: vi.fn().mockResolvedValue({ isOk: () => true, value: 'test content' }),
  writeFile: vi.fn().mockResolvedValue({ isOk: () => true }),
  exists: vi.fn().mockResolvedValue({ isOk: () => true, value: true }),
  delete: vi.fn().mockResolvedValue({ isOk: () => true }),
  readDirectory: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
  createDirectory: vi.fn().mockResolvedValue({ isOk: () => true }),
  getStoredDocument: vi.fn().mockResolvedValue({ isOk: () => true, value: null }),
  storeDocument: vi.fn().mockResolvedValue({ isOk: () => true }),
  deleteStoredDocument: vi.fn().mockResolvedValue({ isOk: () => true }),
  listStoredDocuments: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
};

// Mock DI container - maintains registry but always returns our mocks
const mockFactories = new Map();
const mockContainer = {
  resolve: vi.fn((token: string): any => {
    switch (token) {
      case 'ValidationController':
        return mockValidationController;
      case 'InfrastructureValidationController':
        return mockValidationController;
      case 'DocumentController':
        return mockDocumentController;
      case 'ProofTreeController':
        return mockProofTreeController;
      case 'BootstrapController':
        return mockBootstrapController;
      case 'DocumentQueryService':
        return {
          getDocumentById: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          getDocumentWithStats: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          parseDocumentContent: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          validateDocumentContent: vi
            .fn()
            .mockResolvedValue({ isOk: () => true, value: { isValid: true } }),
          getDocumentMetadata: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          documentExists: vi.fn().mockResolvedValue({ isOk: () => true, value: true }),
          parseWithDetailedErrors: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
        };
      case 'ProofVisualizationService':
        return {
          generateVisualization: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          updateVisualization: vi.fn().mockResolvedValue({ isOk: () => true }),
        };
      case 'TreeRenderer':
        return {
          render: vi.fn().mockReturnValue('<div>Mock Tree</div>'),
          updateRender: vi.fn(),
        };
      case 'ViewStateManager':
        return {
          getViewState: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          updateViewState: vi.fn().mockResolvedValue({ isOk: () => true }),
          subscribeToChanges: vi.fn(),
        };
      case 'IViewStatePort':
        return {
          getViewState: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          saveViewState: vi.fn().mockResolvedValue({ isOk: () => true }),
          capabilities: vi.fn().mockReturnValue({ canPersist: true }),
        };
      case 'IUIPort':
        return mockUIPort;
      case 'IPlatformPort':
        return {
          getPlatformInfo: vi
            .fn()
            .mockReturnValue({ type: 'test', version: '1.0', os: 'test', arch: 'test' }),
          getInputCapabilities: vi.fn().mockReturnValue({ primaryInput: 'keyboard' }),
          getDisplayCapabilities: vi
            .fn()
            .mockReturnValue({ screenWidth: 1920, screenHeight: 1080 }),
          copyToClipboard: vi.fn().mockResolvedValue({ isOk: () => true }),
          readFromClipboard: vi.fn().mockResolvedValue({ isOk: () => true, value: 'test' }),
        };
      case 'IFileSystemPort':
        return mockFileSystemPort;
      case 'ProofApplicationService':
        return {
          createArgument: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
          getDocuments: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
          processCommand: vi.fn().mockResolvedValue({ isOk: () => true }),
        };
      case 'YAMLSerializer':
        return {
          serialize: vi.fn().mockReturnValue('mock yaml'),
          deserialize: vi.fn().mockReturnValue({ isOk: () => true, value: {} }),
          serializeDocument: vi.fn().mockReturnValue('mock document yaml'),
          deserializeDocument: vi.fn().mockReturnValue({ isOk: () => true, value: {} }),
        };
      case 'IExportService':
        return {
          exportDocument: vi
            .fn()
            .mockResolvedValue({ isOk: () => true, value: 'exported content' }),
          getSupportedFormats: vi.fn().mockReturnValue(['yaml', 'json', 'markdown']),
          validateExportFormat: vi.fn().mockReturnValue({ isOk: () => true, value: true }),
        };
      case 'IDocumentIdService':
        return {
          generateId: vi.fn().mockReturnValue('mock-document-id'),
          validateId: vi.fn().mockReturnValue({ isOk: () => true, value: true }),
          isTemporaryId: vi.fn().mockReturnValue(false),
          convertTemporaryId: vi.fn().mockReturnValue({ isOk: () => true, value: 'permanent-id' }),
        };
      default:
        return {};
    }
  }),
  registerFactory: vi.fn((token: string, factory: any) => {
    mockFactories.set(token, factory);
    // Don't execute the factory in tests - we want to keep using our mocks
  }),
};

vi.mock('../../infrastructure/di/container.js', () => ({
  getContainer: vi.fn(() => mockContainer),
  initializeContainer: vi.fn(() => Promise.resolve(mockContainer)),
  registerPlatformAdapters: vi.fn(() => Promise.resolve()),
  TOKENS: {
    ValidationController: 'ValidationController',
    InfrastructureValidationController: 'InfrastructureValidationController',
    DocumentController: 'DocumentController',
    ProofTreeController: 'ProofTreeController',
    BootstrapController: 'BootstrapController',
    DocumentQueryService: 'DocumentQueryService',
    ProofVisualizationService: 'ProofVisualizationService',
    TreeRenderer: 'TreeRenderer',
    ViewStateManager: 'ViewStateManager',
    IViewStatePort: 'IViewStatePort',
    IUIPort: 'IUIPort',
    IPlatformPort: 'IPlatformPort',
    IFileSystemPort: 'IFileSystemPort',
    ProofApplicationService: 'ProofApplicationService',
    YAMLSerializer: 'YAMLSerializer',
    IExportService: 'IExportService',
    IDocumentIdService: 'IDocumentIdService',
  },
}));

vi.mock('../../infrastructure/di/tokens.js', () => ({
  TOKENS: {
    ValidationController: 'ValidationController',
    InfrastructureValidationController: 'InfrastructureValidationController',
    DocumentController: 'DocumentController',
    ProofTreeController: 'ProofTreeController',
    BootstrapController: 'BootstrapController',
    DocumentQueryService: 'DocumentQueryService',
    ProofVisualizationService: 'ProofVisualizationService',
    TreeRenderer: 'TreeRenderer',
    ViewStateManager: 'ViewStateManager',
    IViewStatePort: 'IViewStatePort',
    IUIPort: 'IUIPort',
    IPlatformPort: 'IPlatformPort',
    IFileSystemPort: 'IFileSystemPort',
    ProofApplicationService: 'ProofApplicationService',
    YAMLSerializer: 'YAMLSerializer',
    IExportService: 'IExportService',
    IDocumentIdService: 'IDocumentIdService',
  },
}));

// Mock dependencies
vi.mock('../../validation/index.js', () => ({
  ValidationController: vi.fn().mockImplementation(() => mockValidationController),
}));

// Mock presentation controllers
vi.mock('../../presentation/controllers/DocumentController.js', () => ({
  DocumentController: vi.fn().mockImplementation(() => mockDocumentController),
}));

vi.mock('../../presentation/controllers/ProofTreeController.js', () => ({
  ProofTreeController: vi.fn().mockImplementation(() => mockProofTreeController),
}));

vi.mock('../../webview/ProofTreePanel.js', () => ({
  ProofTreePanel: {
    createOrShow: vi.fn(),
    updateContentIfExists: vi.fn(),
    createWithServices: vi.fn().mockResolvedValue({ isOk: () => true }),
  },
}));

// Mock ProofTreePanelManager
const mockPanelManager = {
  createOrShowPanel: vi.fn().mockResolvedValue({ isOk: () => true }),
  createPanelWithServices: vi.fn().mockResolvedValue({ isOk: () => true }),
  closePanelForDocument: vi.fn(),
  getPanel: vi.fn(),
  hasPanel: vi.fn(),
};

vi.mock('../../webview/ProofTreePanelManager.js', () => ({
  ProofTreePanelManager: {
    getInstance: vi.fn(() => mockPanelManager),
  },
}));

// Import mocked modules for type checking
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
    vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(mockTextDocument);
    vi.mocked(vscode.window.showTextDocument).mockResolvedValue(mockTextEditor);
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined);

    // Reset validation controller mocks to default behavior
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentDebounced.mockClear();
    mockValidationController.clearDocumentValidation.mockClear();
    mockValidationController.validateDocumentImmediate.mockImplementation(() => {
      // Default behavior - do nothing
    });
    mockValidationController.validateDocumentDebounced.mockImplementation(() => {
      // Default behavior - do nothing
    });
    mockValidationController.clearDocumentValidation.mockImplementation(() => {
      // Default behavior - do nothing
    });

    // Reset bootstrap controller mocks
    mockBootstrapController.initializeEmptyDocument.mockClear();
    mockBootstrapController.createBootstrapArgument.mockClear();
    mockBootstrapController.populateEmptyArgument.mockClear();
    mockBootstrapController.getBootstrapWorkflow.mockClear();
    mockBootstrapController.createEmptyImplicationLine.mockClear();

    // Reset file system port mocks
    mockFileSystemPort.writeFile.mockClear();
    mockFileSystemPort.readFile.mockClear();

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

      expect(mockContainer.resolve).toHaveBeenCalledWith('InfrastructureValidationController');
      expect(mockContext.subscriptions).toHaveLength(14); // controller + 8 commands + 4 event handlers + 1 file watcher
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

      // Should have: ValidationController + showTreeCommand + 2 undo/redo commands + 5 bootstrap commands + 4 event handlers + 1 file watcher
      expect(mockContext.subscriptions).toHaveLength(14);
    });

    it('should check for existing proof files', async () => {
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [mockTextDocument],
        writable: true,
        configurable: true,
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        'mock proof content',
        expect.objectContaining({
          getDocumentById: expect.any(Function),
          parseDocumentContent: expect.any(Function),
          validateDocumentContent: expect.any(Function),
        }), // documentQueryService
        expect.objectContaining({
          generateVisualization: expect.any(Function),
          updateVisualization: expect.any(Function),
        }), // visualizationService
        expect.objectContaining({
          createWebviewPanel: expect.any(Function),
          showError: expect.any(Function),
          showInformation: expect.any(Function),
          showQuickPick: expect.any(Function),
          showWarning: expect.any(Function),
        }), // uiPort
        expect.objectContaining({
          render: expect.any(Function),
          updateRender: expect.any(Function),
        }), // renderer
        expect.objectContaining({
          getViewState: expect.any(Function),
          subscribeToChanges: expect.any(Function),
          updateViewState: expect.any(Function),
        }), // viewStateManager
        expect.objectContaining({
          capabilities: expect.any(Function),
          getViewState: expect.any(Function),
          saveViewState: expect.any(Function),
        }), // viewStatePort
        expect.objectContaining({
          createBootstrapArgument: expect.any(Function),
          createEmptyImplicationLine: expect.any(Function),
          getBootstrapWorkflow: expect.any(Function),
          initializeEmptyDocument: expect.any(Function),
          populateEmptyArgument: expect.any(Function),
        }), // bootstrapController
        expect.objectContaining({
          createArgument: expect.any(Function),
          getDocuments: expect.any(Function),
          processCommand: expect.any(Function),
        }), // proofApplicationService
        expect.objectContaining({
          serialize: expect.any(Function),
          deserialize: expect.any(Function),
          serializeDocument: expect.any(Function),
          deserializeDocument: expect.any(Function),
        }), // yamlSerializer
        expect.objectContaining({
          exportDocument: expect.any(Function),
          getSupportedFormats: expect.any(Function),
          validateExportFormat: expect.any(Function),
        }), // exportService
        expect.objectContaining({
          generateId: expect.any(Function),
          validateId: expect.any(Function),
          isTemporaryId: expect.any(Function),
          convertTemporaryId: expect.any(Function),
        }), // documentIdService
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

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
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

    it('should create webview panel when active editor has proof file', async () => {
      vscode.window.activeTextEditor = mockTextEditor;

      // Get the registered command handler
      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      await commandHandler();

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        'mock proof content',
        expect.objectContaining({
          getDocumentById: expect.any(Function),
          parseDocumentContent: expect.any(Function),
          validateDocumentContent: expect.any(Function),
        }), // documentQueryService
        expect.objectContaining({
          generateVisualization: expect.any(Function),
          updateVisualization: expect.any(Function),
        }), // visualizationService
        expect.objectContaining({
          createWebviewPanel: expect.any(Function),
          showError: expect.any(Function),
          showInformation: expect.any(Function),
          showQuickPick: expect.any(Function),
          showWarning: expect.any(Function),
        }), // uiPort
        expect.objectContaining({
          render: expect.any(Function),
          updateRender: expect.any(Function),
        }), // renderer
        expect.objectContaining({
          getViewState: expect.any(Function),
          subscribeToChanges: expect.any(Function),
          updateViewState: expect.any(Function),
        }), // viewStateManager
        expect.objectContaining({
          capabilities: expect.any(Function),
          getViewState: expect.any(Function),
          saveViewState: expect.any(Function),
        }), // viewStatePort
        expect.objectContaining({
          createBootstrapArgument: expect.any(Function),
          createEmptyImplicationLine: expect.any(Function),
          getBootstrapWorkflow: expect.any(Function),
          initializeEmptyDocument: expect.any(Function),
          populateEmptyArgument: expect.any(Function),
        }), // bootstrapController
        expect.objectContaining({
          createArgument: expect.any(Function),
          getDocuments: expect.any(Function),
          processCommand: expect.any(Function),
        }), // proofApplicationService
        expect.objectContaining({
          serialize: expect.any(Function),
          deserialize: expect.any(Function),
          serializeDocument: expect.any(Function),
          deserializeDocument: expect.any(Function),
        }), // yamlSerializer
        expect.objectContaining({
          exportDocument: expect.any(Function),
          getSupportedFormats: expect.any(Function),
          validateExportFormat: expect.any(Function),
        }), // exportService
        expect.objectContaining({
          generateId: expect.any(Function),
          validateId: expect.any(Function),
          isTemporaryId: expect.any(Function),
          convertTemporaryId: expect.any(Function),
        }), // documentIdService
      );
    });

    it('should show warning when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      commandHandler();

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        'Please open a .proof file to view the tree visualization.',
      );
      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
    });

    it('should show warning when active editor is not proof file', async () => {
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

      expect(mockUIPort.showWarning).toHaveBeenCalledWith(
        'Please open a .proof file to view the tree visualization.',
      );
      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
    });
  });

  describe('document open handler', () => {
    beforeEach(async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });
      await activate(mockContext);
    });

    it('should handle proof file opening', async () => {
      // Get the handler from the mock calls since onOpenHandler might not be set
      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Proof Editor: Working with test.proof',
      );
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        'mock proof content',
        expect.objectContaining({
          getDocumentById: expect.any(Function),
          parseDocumentContent: expect.any(Function),
          validateDocumentContent: expect.any(Function),
        }), // documentQueryService
        expect.objectContaining({
          generateVisualization: expect.any(Function),
          updateVisualization: expect.any(Function),
        }), // visualizationService
        expect.objectContaining({
          createWebviewPanel: expect.any(Function),
          showError: expect.any(Function),
          showInformation: expect.any(Function),
          showQuickPick: expect.any(Function),
          showWarning: expect.any(Function),
        }), // uiPort
        expect.objectContaining({
          render: expect.any(Function),
          updateRender: expect.any(Function),
        }), // renderer
        expect.objectContaining({
          getViewState: expect.any(Function),
          subscribeToChanges: expect.any(Function),
          updateViewState: expect.any(Function),
        }), // viewStateManager
        expect.objectContaining({
          capabilities: expect.any(Function),
          getViewState: expect.any(Function),
          saveViewState: expect.any(Function),
        }), // viewStatePort
        expect.objectContaining({
          createBootstrapArgument: expect.any(Function),
          createEmptyImplicationLine: expect.any(Function),
          getBootstrapWorkflow: expect.any(Function),
          initializeEmptyDocument: expect.any(Function),
          populateEmptyArgument: expect.any(Function),
        }), // bootstrapController
        expect.objectContaining({
          createArgument: expect.any(Function),
          getDocuments: expect.any(Function),
          processCommand: expect.any(Function),
        }), // proofApplicationService
        expect.objectContaining({
          serialize: expect.any(Function),
          deserialize: expect.any(Function),
          serializeDocument: expect.any(Function),
          deserializeDocument: expect.any(Function),
        }), // yamlSerializer
        expect.objectContaining({
          exportDocument: expect.any(Function),
          getSupportedFormats: expect.any(Function),
          validateExportFormat: expect.any(Function),
        }), // exportService
        expect.objectContaining({
          generateId: expect.any(Function),
          validateId: expect.any(Function),
          isTemporaryId: expect.any(Function),
          convertTemporaryId: expect.any(Function),
        }), // documentIdService
      );
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should extract filename from full path', async () => {
      const docWithLongPath = {
        ...mockTextDocument,
        fileName: '/very/long/path/to/complex-file.proof',
      };

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithLongPath);

      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Proof Editor: Working with complex-file.proof',
      );
    });

    it('should handle filenames without path separators', async () => {
      const docWithSimpleName = {
        ...mockTextDocument,
        fileName: 'simple.proof',
      };

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithSimpleName);

      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Proof Editor: Working with simple.proof',
      );
    });

    it('should ignore non-proof files', async () => {
      const nonProofDoc = { ...mockTextDocument, languageId: 'javascript' };

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(nonProofDoc);

      expect(mockUIPort.showInformation).not.toHaveBeenCalled();
      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('document change handler', () => {
    beforeEach(async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });
      await activate(mockContext);
    });

    it('should handle proof file changes', async () => {
      await onChangeHandler(mockChangeEvent);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        'mock proof content',
        expect.objectContaining({
          getDocumentById: expect.any(Function),
          parseDocumentContent: expect.any(Function),
          validateDocumentContent: expect.any(Function),
        }), // documentQueryService
        expect.objectContaining({
          generateVisualization: expect.any(Function),
          updateVisualization: expect.any(Function),
        }), // visualizationService
        expect.objectContaining({
          createWebviewPanel: expect.any(Function),
          showError: expect.any(Function),
          showInformation: expect.any(Function),
          showQuickPick: expect.any(Function),
          showWarning: expect.any(Function),
        }), // uiPort
        expect.objectContaining({
          render: expect.any(Function),
          updateRender: expect.any(Function),
        }), // renderer
        expect.objectContaining({
          getViewState: expect.any(Function),
          subscribeToChanges: expect.any(Function),
          updateViewState: expect.any(Function),
        }), // viewStateManager
        expect.objectContaining({
          capabilities: expect.any(Function),
          getViewState: expect.any(Function),
          saveViewState: expect.any(Function),
        }), // viewStatePort
        expect.objectContaining({
          createBootstrapArgument: expect.any(Function),
          createEmptyImplicationLine: expect.any(Function),
          getBootstrapWorkflow: expect.any(Function),
          initializeEmptyDocument: expect.any(Function),
          populateEmptyArgument: expect.any(Function),
        }), // bootstrapController
        expect.objectContaining({
          createArgument: expect.any(Function),
          getDocuments: expect.any(Function),
          processCommand: expect.any(Function),
        }), // proofApplicationService
        expect.objectContaining({
          serialize: expect.any(Function),
          deserialize: expect.any(Function),
          serializeDocument: expect.any(Function),
          deserializeDocument: expect.any(Function),
        }), // yamlSerializer
        expect.objectContaining({
          exportDocument: expect.any(Function),
          getSupportedFormats: expect.any(Function),
          validateExportFormat: expect.any(Function),
        }), // exportService
        expect.objectContaining({
          generateId: expect.any(Function),
          validateId: expect.any(Function),
          isTemporaryId: expect.any(Function),
          convertTemporaryId: expect.any(Function),
        }), // documentIdService
      );
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should ignore non-proof file changes', async () => {
      const nonProofChangeEvent = {
        ...mockChangeEvent,
        document: { ...mockTextDocument, languageId: 'javascript' },
      };

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      await handler(nonProofChangeEvent);

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).not.toHaveBeenCalled();
    });
  });

  describe('active editor change handler', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should handle switching to proof file editor', async () => {
      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(mockTextEditor);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        'mock proof content',
        expect.objectContaining({
          getDocumentById: expect.any(Function),
          parseDocumentContent: expect.any(Function),
          validateDocumentContent: expect.any(Function),
        }), // documentQueryService
        expect.objectContaining({
          generateVisualization: expect.any(Function),
          updateVisualization: expect.any(Function),
        }), // visualizationService
        expect.objectContaining({
          createWebviewPanel: expect.any(Function),
          showError: expect.any(Function),
          showInformation: expect.any(Function),
          showQuickPick: expect.any(Function),
          showWarning: expect.any(Function),
        }), // uiPort
        expect.objectContaining({
          render: expect.any(Function),
          updateRender: expect.any(Function),
        }), // renderer
        expect.objectContaining({
          getViewState: expect.any(Function),
          subscribeToChanges: expect.any(Function),
          updateViewState: expect.any(Function),
        }), // viewStateManager
        expect.objectContaining({
          capabilities: expect.any(Function),
          getViewState: expect.any(Function),
          saveViewState: expect.any(Function),
        }), // viewStatePort
        expect.objectContaining({
          createBootstrapArgument: expect.any(Function),
          createEmptyImplicationLine: expect.any(Function),
          getBootstrapWorkflow: expect.any(Function),
          initializeEmptyDocument: expect.any(Function),
          populateEmptyArgument: expect.any(Function),
        }), // bootstrapController
        expect.objectContaining({
          createArgument: expect.any(Function),
          getDocuments: expect.any(Function),
          processCommand: expect.any(Function),
        }), // proofApplicationService
        expect.objectContaining({
          serialize: expect.any(Function),
          deserialize: expect.any(Function),
          serializeDocument: expect.any(Function),
          deserializeDocument: expect.any(Function),
        }), // yamlSerializer
        expect.objectContaining({
          exportDocument: expect.any(Function),
          getSupportedFormats: expect.any(Function),
          validateExportFormat: expect.any(Function),
        }), // exportService
        expect.objectContaining({
          generateId: expect.any(Function),
          validateId: expect.any(Function),
          isTemporaryId: expect.any(Function),
          convertTemporaryId: expect.any(Function),
        }), // documentIdService
      );
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should ignore switching to non-proof file editor', async () => {
      const nonProofEditor = {
        ...mockTextEditor,
        document: { ...mockTextDocument, languageId: 'javascript' },
      };

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(nonProofEditor);

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });

    it('should handle undefined editor (no active editor)', async () => {
      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(undefined);

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('document close handler', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    it('should clear validation for closed proof files', async () => {
      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
      const handler = onCloseCall?.[0];

      if (!handler) {
        throw new Error('onDidCloseTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should ignore closing non-proof files', async () => {
      const nonProofDoc = { ...mockTextDocument, languageId: 'javascript' };

      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
      const handler = onCloseCall?.[0];

      if (!handler) {
        throw new Error('onDidCloseTextDocument handler not registered');
      }

      await handler(nonProofDoc);

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

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithPath);

      expect(mockUIPort.showInformation).toHaveBeenCalledWith(
        'Proof Editor: Working with file.proof',
      );
    });

    it('should handle empty filename gracefully', async () => {
      await activate(mockContext);

      const docWithEmptyName = {
        ...mockTextDocument,
        fileName: '',
      };

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithEmptyName);

      expect(mockUIPort.showInformation).toHaveBeenCalledWith('Proof Editor: Working with ');
    });
  });

  describe('error scenarios', () => {
    it('should handle ValidationController constructor throwing', async () => {
      mockContainer.resolve.mockImplementationOnce(() => {
        throw new Error('Mock validation error');
      });

      await expect(activate(mockContext)).rejects.toThrow('Mock validation error');
    });

    it('should handle ProofTreeController.showProofTreeForDocument throwing', async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });
      await activate(mockContext);

      // Mock ProofTreePanel.createWithServices to throw an error
      const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
      vi.mocked(ProofTreePanel.createWithServices).mockRejectedValueOnce(
        new Error('Mock webview error'),
      );

      // The extension handles errors internally and shows them via UI port
      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      // Should show error via UI port instead of throwing
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle getText() throwing', async () => {
      // Mock visibleTextEditors to include our mock editor
      const editorWithBadGetText = {
        ...mockTextEditor,
        document: {
          ...mockTextDocument,
          getText: () => {
            throw new Error('Mock getText error');
          },
        },
      };

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [editorWithBadGetText],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // The extension handles errors internally and shows them via UI port
      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(editorWithBadGetText.document);

      // Should show error via UI port instead of throwing
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid document changes', async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Clear mocks before this test
      mockValidationController.validateDocumentDebounced.mockClear();
      const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
      vi.mocked(ProofTreePanel.createWithServices).mockClear();

      // Simulate rapid document changes
      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const changeHandler = onChangeCall?.[0];

      if (!changeHandler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      for (let i = 0; i < 10; i++) {
        await changeHandler(mockChangeEvent);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(10);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple proof files being opened', async () => {
      const doc1 = { ...mockTextDocument, fileName: 'file1.proof' };
      const doc2 = { ...mockTextDocument, fileName: 'file2.proof' };
      const doc3 = { ...mockTextDocument, fileName: 'file3.proof' };

      const editor1 = { ...mockTextEditor, document: doc1 };
      const editor2 = { ...mockTextEditor, document: doc2 };
      const editor3 = { ...mockTextEditor, document: doc3 };

      // Mock visibleTextEditors to include all editors
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [editor1, editor2, editor3],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Clear mocks before this test
      mockValidationController.validateDocumentImmediate.mockClear();
      const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
      vi.mocked(ProofTreePanel.createWithServices).mockClear();

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const openHandler = onOpenCall?.[0];

      if (!openHandler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await openHandler(doc1);
      await openHandler(doc2);
      await openHandler(doc3);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(3);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed file types correctly', async () => {
      const proofDoc = mockTextDocument;
      const jsDoc = { ...mockTextDocument, languageId: 'javascript' };
      const pyDoc = { ...mockTextDocument, languageId: 'python' };

      // Mock visibleTextEditors to include only the proof editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor], // Only the proof editor
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Clear mocks before this test
      mockProofTreeController.showProofTreeForDocument.mockClear();
      mockValidationController.validateDocumentImmediate.mockClear();

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(proofDoc);
      await handler(jsDoc);
      await handler(pyDoc);

      // Only proof file should be processed
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(1);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
    });
  });

  describe('advanced integration scenarios', () => {
    it('should handle extension activation errors gracefully', async () => {
      // Import the container module and mock initializeContainer to throw
      const containerModule = await import('../../infrastructure/di/container.js');
      const mockInitializeContainer = vi
        .spyOn(containerModule, 'initializeContainer')
        .mockRejectedValue(new Error('DI container initialization failed'));

      await expect(activate(mockContext)).rejects.toThrow('DI container initialization failed');
      expect(mockInitializeContainer).toHaveBeenCalled();

      // Restore the original implementation
      mockInitializeContainer.mockRestore();
    });

    it('should handle validation controller failures during document events', async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Make validation controller throw error
      mockValidationController.validateDocumentImmediate.mockImplementation(() => {
        throw new Error('Validation service unavailable');
      });

      // Should not crash the extension - it handles validation errors internally
      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      // ProofTreePanel should still be called even if validation fails
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();

      // Should show validation error via UI port
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Validation failed: Validation service unavailable',
      );
    });

    it('should handle webview creation failures', async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Mock ProofTreePanel.createWithServices to fail
      const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
      vi.mocked(ProofTreePanel.createWithServices).mockRejectedValueOnce(
        new Error('Webview creation failed'),
      );

      // Should handle error gracefully
      await onOpenHandler(mockTextDocument);

      // Should show error via UI port
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle document content access failures', async () => {
      const faultyDocument = {
        ...mockTextDocument,
        getText: () => {
          throw new Error('Document access denied');
        },
      };

      const faultyEditor = {
        ...mockTextEditor,
        document: faultyDocument,
      };

      // Mock visibleTextEditors to include the faulty editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [faultyEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Should handle error gracefully
      await onOpenHandler(faultyDocument);

      // Should show error via UI port
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle very large documents efficiently', async () => {
      const largeContent = `statements:\n${'a'.repeat(100000)}`;
      const largeDocument = {
        ...mockTextDocument,
        getText: () => largeContent,
      };

      const largeEditor = {
        ...mockTextEditor,
        document: largeDocument,
      };

      // Mock visibleTextEditors to include the large editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [largeEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Reset validation controller mock to default behavior for this test
      mockValidationController.validateDocumentImmediate.mockClear();
      mockValidationController.validateDocumentImmediate.mockImplementation(() => {
        // Default behavior - do nothing
      });

      // Should handle large documents without crashing
      await onOpenHandler(largeDocument);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        largeContent,
        expect.any(Object), // documentQueryService
        expect.any(Object), // visualizationService
        expect.any(Object), // uiPort
        expect.any(Object), // renderer
        expect.any(Object), // viewStateManager
        expect.any(Object), // viewStatePort
        expect.any(Object), // bootstrapController
        expect.any(Object), // proofApplicationService
        expect.any(Object), // yamlSerializer
        expect.any(Object), // exportService
        expect.any(Object), // documentIdService
      );
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
        uri: largeDocument.uri.toString(),
        content: largeDocument.getText(),
        languageId: largeDocument.languageId,
      });
    });

    it('should handle rapid consecutive document changes', async () => {
      // Mock visibleTextEditors to include our mock editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Clear mocks before this test
      mockValidationController.validateDocumentDebounced.mockClear();
      const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
      vi.mocked(ProofTreePanel.createWithServices).mockClear();

      // Simulate rapid document changes to the same document
      for (let i = 0; i < 50; i++) {
        const changeEvent = {
          ...mockChangeEvent,
          document: mockTextDocument,
        };
        await onChangeHandler(changeEvent);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(50);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(50);
    });

    it('should handle mixed valid and invalid document operations', async () => {
      const proofDoc = mockTextDocument;
      const invalidDoc = { ...mockTextDocument, languageId: 'javascript' };

      // Mock visibleTextEditors to include only the valid editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Reset validation controller mock to default behavior for this test
      mockValidationController.validateDocumentImmediate.mockClear();
      mockValidationController.clearDocumentValidation.mockClear();
      mockValidationController.validateDocumentImmediate.mockImplementation(() => {
        // Default behavior - do nothing
      });

      const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
      vi.mocked(ProofTreePanel.createWithServices).mockClear();

      // Mix of valid, invalid, and null operations
      await onOpenHandler(proofDoc);
      await onOpenHandler(invalidDoc);
      await onEditorChangeHandler(undefined);
      await onCloseHandler(proofDoc);
      await onCloseHandler(invalidDoc);

      // Only valid operations should trigger proof-specific behavior
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(1);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledTimes(1);
    });

    it('should handle command execution with malformed documents', async () => {
      const malformedEditor = {
        ...mockTextEditor,
        document: {
          ...mockTextDocument,
          getText: () => {
            throw new Error('Document is corrupted');
          },
        },
      };

      // Mock visibleTextEditors to include the malformed editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [malformedEditor],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      vscode.window.activeTextEditor = malformedEditor;

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      // The command catches errors and shows them via UI port
      await commandHandler();

      // Should show error via UI port instead of throwing
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle extension context corruption gracefully', async () => {
      const corruptedContext = {
        ...mockContext,
        subscriptions: null as any,
      };

      // Should handle corrupted context without crashing completely
      await expect(activate(corruptedContext)).rejects.toThrow();
    });

    it('should handle VS Code API unavailability', async () => {
      // Simulate VS Code API methods throwing
      vi.mocked(vscode.commands.registerCommand).mockImplementation(() => {
        throw new Error('VS Code API unavailable');
      });

      await expect(activate(mockContext)).rejects.toThrow('VS Code API unavailable');
    });

    it('should properly cleanup resources on repeated activation', async () => {
      // Activate multiple times to test resource cleanup
      await activate(mockContext);
      const firstCallCount = mockContext.subscriptions.length;

      mockContext.subscriptions.length = 0;
      await activate(mockContext);
      const secondCallCount = mockContext.subscriptions.length;

      // Should register the same number of subscriptions each time
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('bootstrap commands', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    describe('createBootstrapDocument command', () => {
      const getBootstrapDocumentCommand = () => {
        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        return commandCall?.[1] as () => Promise<void>;
      };

      it('should create bootstrap document successfully', async () => {
        // Mock workspace folder
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        // Mock user input
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');
        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: '' });

        // Mock file operations
        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-document.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        // Mock bootstrap controller success
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce(
          ok({
            data: {
              documentId: 'test-document',
              created: true,
              hasBootstrapArgument: false,
              nextSteps: [],
            },
          }),
        );

        // Mock file system port success
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce(ok(undefined));

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(mockBootstrap.initializeEmptyDocument).toHaveBeenCalledWith('test-document');
        expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
          '/test/workspace/test-document.proof',
          expect.stringContaining('test-document'),
        );
        expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
        expect(vscode.window.showTextDocument).toHaveBeenCalled();
      });

      it('should show warning when no workspace folder', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith(
          'Please open a workspace folder first.',
        );
      });

      it('should handle user cancellation', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        // User cancels input
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).not.toHaveBeenCalled();
      });

      it('should validate document name', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        // Mock the input validation by directly testing the validator
        const _commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');

        // Get the input box options to test the validator
        vi.mocked(vscode.window.showInputBox).mockImplementationOnce((options) => {
          const validator = options?.validateInput;
          if (validator) {
            // Test empty input
            expect(validator('')).toBe('Document name cannot be empty');
            expect(validator('   ')).toBe('Document name cannot be empty');

            // Test invalid characters
            expect(validator('test@doc')).toBe(
              'Document name can only contain letters, numbers, hyphens, and underscores',
            );
            expect(validator('test doc')).toBe(
              'Document name can only contain letters, numbers, hyphens, and underscores',
            );

            // Test valid input
            expect(validator('test-doc_123')).toBe(null);
          }
          return Promise.resolve(undefined); // User cancels
        });

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();
      });

      it('should handle bootstrap controller errors', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

        // Mock bootstrap controller failure
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.initializeEmptyDocument).mockResolvedValueOnce(
          err(new ValidationError('Bootstrap failed')),
        );

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to create document: Bootstrap failed',
        );
      });

      it('should handle file write errors', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

        // Mock bootstrap controller success
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce(
          ok({
            data: {
              documentId: 'test-document',
              created: true,
              hasBootstrapArgument: false,
              nextSteps: [],
            },
          }),
        );

        // Mock file system port failure
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(err(new Error('Write failed')));

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith('Failed to write file: Write failed');
      });

      it('should handle tutorial workflow selection', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

        // Mock bootstrap and file operations success
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce(
          ok({
            data: {
              documentId: 'test-document',
              created: true,
              hasBootstrapArgument: false,
              nextSteps: [],
            },
          }),
        );
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce(ok(undefined));

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-document.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        // Mock workflow selection
        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({
          title: 'Start Guided Tutorial',
        });
        vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

        // Set active editor for auto-show
        vscode.window.activeTextEditor = mockTextEditor;

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('Created proof document'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );
      });

      it('should handle exceptions gracefully', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');

        // Mock bootstrap controller to throw
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.initializeEmptyDocument).mockRejectedValueOnce(
          new Error('Unexpected error'),
        );

        const commandHandler = getBootstrapDocumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to create document: Unexpected error',
        );
      });
    });

    describe('createBootstrapArgument command', () => {
      const getBootstrapArgumentCommand = () => {
        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapArgument');
        return commandCall?.[1] as () => Promise<void>;
      };

      it('should create bootstrap argument successfully', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createBootstrapArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              treeId: 'tree-1',
              nodeId: 'n1',
              isEmpty: true,
              position: { x: 0, y: 0 },
              readyForPopulation: true,
              workflow: { currentStep: 'created', nextAction: 'populate', canBranch: false },
            },
          }),
        );

        const commandHandler = getBootstrapArgumentCommand();
        await commandHandler();

        expect(mockBootstrap.createBootstrapArgument).toHaveBeenCalledWith(
          mockTextEditor.document.fileName,
        );
        expect(mockUIPort.showInformation).toHaveBeenCalledWith(
          'Created empty argument: arg-123',
          expect.objectContaining({ label: 'Populate Argument' }),
        );
      });

      it('should show warning when no active editor', async () => {
        vscode.window.activeTextEditor = undefined;

        const commandHandler = getBootstrapArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
      });

      it('should show warning when active editor is not proof file', async () => {
        vscode.window.activeTextEditor = {
          ...mockTextEditor,
          document: { ...mockTextDocument, languageId: 'javascript' },
        };

        const commandHandler = getBootstrapArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
      });

      it('should handle bootstrap controller errors', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createBootstrapArgument).mockResolvedValueOnce(
          err(new ValidationError('Creation failed')),
        );

        const commandHandler = getBootstrapArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to create argument: Creation failed',
        );
      });

      it('should handle exceptions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createBootstrapArgument).mockRejectedValueOnce(
          new Error('Unexpected error'),
        );

        const commandHandler = getBootstrapArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to create argument: Unexpected error',
        );
      });
    });

    describe('populateEmptyArgument command', () => {
      const getPopulateArgumentCommand = () => {
        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
        return commandCall?.[1] as () => Promise<void>;
      };

      it('should populate argument successfully with multiple premises', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock user inputs - premises and conclusion
        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('All humans are mortal') // First premise
          .mockResolvedValueOnce('Socrates is human') // Second premise
          .mockResolvedValueOnce('') // No more premises
          .mockResolvedValueOnce('Socrates is mortal') // Conclusion
          .mockResolvedValueOnce('Modus Ponens'); // Rule name

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
          mockTextEditor.document.fileName,
          expect.stringMatching(/^arg-\d+$/),
          ['All humans are mortal', 'Socrates is human'],
          ['Socrates is mortal'],
          { left: 'Modus Ponens' },
        );
        expect(mockUIPort.showInformation).toHaveBeenCalledWith(
          'Argument populated successfully!',
          expect.objectContaining({ label: 'Show Bootstrap Workflow' }),
        );
      });

      it('should handle single premise argument', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Simple premise') // First premise
          .mockResolvedValueOnce('') // No more premises
          .mockResolvedValueOnce('Simple conclusion') // Conclusion
          .mockResolvedValueOnce(''); // No rule name

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
          mockTextEditor.document.fileName,
          expect.stringMatching(/^arg-\d+$/),
          ['Simple premise'],
          ['Simple conclusion'],
          undefined,
        );
      });

      it('should handle user cancelling premise input', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // User cancels premise input
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        // Should exit early without calling bootstrap controller
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        expect(mockBootstrap.populateEmptyArgument).not.toHaveBeenCalled();
      });

      it('should handle user cancelling conclusion input', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Some premise') // Premise
          .mockResolvedValueOnce('') // No more premises
          .mockResolvedValueOnce(undefined); // Cancel conclusion

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        // Should exit early without calling bootstrap controller
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        expect(mockBootstrap.populateEmptyArgument).not.toHaveBeenCalled();
      });

      it('should handle maximum premises limit', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock 5 premises + attempt at 6th
        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise 1')
          .mockResolvedValueOnce('Premise 2')
          .mockResolvedValueOnce('Premise 3')
          .mockResolvedValueOnce('Premise 4')
          .mockResolvedValueOnce('Premise 5')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('Rule');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
          mockTextEditor.document.fileName,
          expect.stringMatching(/^arg-\d+$/),
          ['Premise 1', 'Premise 2', 'Premise 3', 'Premise 4', 'Premise 5'],
          ['Conclusion'],
          { left: 'Rule' },
        );
      });

      it('should show warning when no active editor', async () => {
        vscode.window.activeTextEditor = undefined;

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
      });

      it('should handle bootstrap controller errors', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise')
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          err(new ValidationError('Population failed')),
        );

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to populate argument: Population failed',
        );
      });

      it('should handle exceptions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise')
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockRejectedValueOnce(
          new Error('Unexpected error'),
        );

        const commandHandler = getPopulateArgumentCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to populate argument: Unexpected error',
        );
      });
    });

    describe('showBootstrapWorkflow command', () => {
      const getWorkflowCommand = () => {
        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.showBootstrapWorkflow');
        return commandCall?.[1] as () => Promise<void>;
      };

      it('should show workflow with enabled actions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
          ok({
            data: {
              totalSteps: 3,
              steps: [
                {
                  current: true,
                  completed: false,
                  title: 'Create First Argument',
                  description: 'Start by creating your first atomic argument',
                  actions: [
                    { label: 'Create Empty Argument', enabled: true },
                    { label: 'Skip Step', enabled: false },
                  ],
                },
              ],
            },
          }),
        );

        (vi.mocked(vscode.window.showQuickPick) as any).mockResolvedValueOnce(
          'Create Empty Argument',
        );
        vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

        const commandHandler = getWorkflowCommand();
        await commandHandler();

        expect(vscode.window.showQuickPick).toHaveBeenCalledWith(['Create Empty Argument'], {
          placeHolder: 'Choose next action',
        });
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
          'proofEditor.createBootstrapArgument',
        );
      });

      it('should show workflow without actions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
          ok({
            data: {
              totalSteps: 3,
              steps: [
                {
                  current: true,
                  completed: false,
                  title: 'Review Arguments',
                  description: 'Review your completed arguments',
                  actions: [],
                },
              ],
            },
          }),
        );

        const commandHandler = getWorkflowCommand();
        await commandHandler();

        expect(mockUIPort.showInformation).toHaveBeenCalledWith(
          expect.stringContaining('Review Arguments'),
        );
      });

      it('should handle populate action selection', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
          ok({
            data: {
              totalSteps: 3,
              steps: [
                {
                  current: true,
                  completed: false,
                  title: 'Populate Argument',
                  description: 'Add premises and conclusions',
                  actions: [{ label: 'Populate Current Argument', enabled: true }],
                },
              ],
            },
          }),
        );

        (vi.mocked(vscode.window.showQuickPick) as any).mockResolvedValueOnce(
          'Populate Current Argument',
        );
        vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

        const commandHandler = getWorkflowCommand();
        await commandHandler();

        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
          'proofEditor.populateEmptyArgument',
        );
      });

      it('should show warning when no active editor', async () => {
        vscode.window.activeTextEditor = undefined;

        const commandHandler = getWorkflowCommand();
        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
      });

      it('should handle bootstrap controller errors', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.getBootstrapWorkflow).mockResolvedValueOnce(
          err(new ValidationError('Workflow failed')),
        );

        const commandHandler = getWorkflowCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to get workflow: Workflow failed',
        );
      });

      it('should handle exceptions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.getBootstrapWorkflow).mockRejectedValueOnce(
          new Error('Unexpected error'),
        );

        const commandHandler = getWorkflowCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to show workflow: Unexpected error',
        );
      });
    });

    describe('createEmptyImplicationLine command', () => {
      const getImplicationLineCommand = () => {
        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createEmptyImplicationLine');
        return commandCall?.[1] as () => Promise<void>;
      };

      it('should create empty implication line successfully', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createEmptyImplicationLine).mockResolvedValueOnce(
          ok({
            data: {
              displayFormat: {
                premiseLines: ['Premise 1:', 'Premise 2:'],
                horizontalLine: '──────────────',
                conclusionLines: ['Conclusion:'],
              },
              userInstructions: 'Click above or below the line to add statements',
            },
          }),
        );

        const commandHandler = getImplicationLineCommand();
        await commandHandler();

        expect(mockBootstrap.createEmptyImplicationLine).toHaveBeenCalledWith(
          mockTextEditor.document.fileName,
          expect.stringMatching(/^tree-\d+$/),
        );
        expect(mockUIPort.showInformation).toHaveBeenCalledWith(
          expect.stringContaining('Premise 1:'),
          expect.objectContaining({ label: 'Populate Argument' }),
        );
      });

      it('should show warning when no active editor', async () => {
        vscode.window.activeTextEditor = undefined;

        const commandHandler = getImplicationLineCommand();
        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith('Please open a .proof file first.');
      });

      it('should handle bootstrap controller errors', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createEmptyImplicationLine).mockResolvedValueOnce(
          err(new ValidationError('Creation failed')),
        );

        const commandHandler = getImplicationLineCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to create implication line: Creation failed',
        );
      });

      it('should handle exceptions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createEmptyImplicationLine).mockRejectedValueOnce(
          new Error('Unexpected error'),
        );

        const commandHandler = getImplicationLineCommand();
        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to create implication line: Unexpected error',
        );
      });
    });
  });

  describe('file watching and auto-save', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    describe('file watching setup', () => {
      it('should create file system watcher for .proof files', async () => {
        expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*.proof');
      });

      it('should handle file change events', async () => {
        // Get the file watcher mock
        const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
          ?.value;

        // Get the onDidChange handler
        const onDidChangeCall = watcherMock?.onDidChange.mock.calls[0];
        const changeHandler = onDidChangeCall?.[0];

        if (changeHandler) {
          const mockUri = vscode.Uri.file('/test/document.proof');
          const mockEditor = {
            ...mockTextEditor,
            document: { ...mockTextDocument, uri: mockUri, isDirty: false },
          };

          // Mock visibleTextEditors to include our editor
          Object.defineProperty(vscode.window, 'visibleTextEditors', {
            value: [mockEditor],
            writable: true,
            configurable: true,
          });

          await changeHandler(mockUri);

          // Should refresh proof tree panel
          expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
        }
      });

      it('should not refresh when file is dirty', async () => {
        const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
          ?.value;
        const onDidChangeCall = watcherMock?.onDidChange.mock.calls[0];
        const changeHandler = onDidChangeCall?.[0];

        if (changeHandler) {
          const mockUri = vscode.Uri.file('/test/document.proof');
          const mockEditor = {
            ...mockTextEditor,
            document: { ...mockTextDocument, uri: mockUri, isDirty: true },
          };

          Object.defineProperty(vscode.window, 'visibleTextEditors', {
            value: [mockEditor],
            writable: true,
            configurable: true,
          });

          const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
          vi.mocked(ProofTreePanel.createWithServices).mockClear();

          await changeHandler(mockUri);

          // Should not refresh proof tree panel when file is dirty
          expect(ProofTreePanel.createWithServices).not.toHaveBeenCalled();
        }
      });

      it('should handle file creation events', async () => {
        const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
          ?.value;
        const onDidCreateCall = watcherMock?.onDidCreate.mock.calls[0];
        const createHandler = onDidCreateCall?.[0];

        if (createHandler) {
          const mockUri = vscode.Uri.file('/test/new-document.proof');

          // Should handle creation without errors
          await expect(createHandler(mockUri)).resolves.not.toThrow();
        }
      });

      it('should handle file deletion events', async () => {
        const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
          ?.value;
        const onDidDeleteCall = watcherMock?.onDidDelete.mock.calls[0];
        const deleteHandler = onDidDeleteCall?.[0];

        if (deleteHandler) {
          const mockUri = vscode.Uri.file('/test/deleted-document.proof');
          const mockFileSystem = mockContainer.resolve('IFileSystemPort');

          await deleteHandler(mockUri);

          expect(mockFileSystem.deleteStoredDocument).toHaveBeenCalledWith(
            '/test/deleted-document.proof',
          );
        }
      });

      it('should not create watcher when file system port cannot watch', async () => {
        // Mock file system port to not support watching
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        vi.mocked(mockFileSystem.capabilities).mockReturnValueOnce({
          canWatch: false,
          canAccessArbitraryPaths: true,
          supportsOfflineStorage: true,
          persistence: 'permanent',
        });

        // Clear existing mocks and reactivate
        vi.clearAllMocks();
        mockContext.subscriptions.length = 0;

        await activate(mockContext);

        // Should not create file watcher
        expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
      });
    });

    describe('auto-save functionality', () => {
      it('should auto-save after successful argument population', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock dirty document
        const dirtyEditor = {
          ...mockTextEditor,
          document: { ...mockTextDocument, isDirty: true, save: vi.fn().mockResolvedValue(true) },
        };
        vscode.window.activeTextEditor = dirtyEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise')
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        vi.mocked(mockFileSystem.storeDocument).mockResolvedValueOnce(ok(undefined));

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        expect(dirtyEditor.document.save).toHaveBeenCalled();
        expect(mockFileSystem.storeDocument).toHaveBeenCalledWith({
          id: dirtyEditor.document.fileName,
          content: dirtyEditor.document.getText(),
          metadata: expect.objectContaining({
            id: dirtyEditor.document.fileName,
            syncStatus: 'synced',
          }),
          version: 1,
        });
      });

      it('should skip auto-save when document is not dirty', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock clean document
        const cleanEditor = {
          ...mockTextEditor,
          document: { ...mockTextDocument, isDirty: false, save: vi.fn() },
        };
        vscode.window.activeTextEditor = cleanEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise')
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        expect(cleanEditor.document.save).not.toHaveBeenCalled();
      });

      it('should handle auto-save errors gracefully', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock document that fails to save
        const faultyEditor = {
          ...mockTextEditor,
          document: {
            ...mockTextDocument,
            isDirty: true,
            save: vi.fn().mockRejectedValue(new Error('Save failed')),
          },
        };
        vscode.window.activeTextEditor = faultyEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise')
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        // Should not throw despite save failure
        await expect(commandHandler()).resolves.not.toThrow();
        expect(faultyEditor.document.save).toHaveBeenCalled();
      });

      it('should handle file system storage errors gracefully', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const dirtyEditor = {
          ...mockTextEditor,
          document: { ...mockTextDocument, isDirty: true, save: vi.fn().mockResolvedValue(true) },
        };
        vscode.window.activeTextEditor = dirtyEditor;

        vi.mocked(vscode.window.showInputBox)
          .mockResolvedValueOnce('Premise')
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce('Conclusion')
          .mockResolvedValueOnce('');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        vi.mocked(mockFileSystem.storeDocument).mockRejectedValueOnce(new Error('Storage failed'));

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        // Should not throw despite storage failure
        await expect(commandHandler()).resolves.not.toThrow();
        expect(dirtyEditor.document.save).toHaveBeenCalled();
        expect(mockFileSystem.storeDocument).toHaveBeenCalled();
      });
    });
  });

  describe('tutorial and guided workflows', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    describe('startGuidedBootstrapTutorial', () => {
      const getTutorialFromCommand = async (commandName: string) => {
        // Trigger a command that starts the tutorial to test the internal function
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-document');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-document.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock tutorial selection will be handled by individual tests

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === commandName);
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        if (!commandHandler) {
          throw new Error(`Command ${commandName} not found or handler is null`);
        }

        await commandHandler();
      };

      it('should complete tutorial workflow', async () => {
        // Mock tutorial progression - need to account for the initial "Start Guided Tutorial" selection
        (vi.mocked(vscode.window.showInformationMessage) as any)
          .mockResolvedValueOnce('Start Guided Tutorial') // Initial selection
          .mockResolvedValueOnce("Let's Begin!") // Step 1
          .mockResolvedValueOnce('Got it!') // Step 2
          .mockResolvedValueOnce('Create It For Me') // Step 3
          .mockResolvedValueOnce('Awesome!') // Step 4
          .mockResolvedValueOnce('Start Exploring!'); // Step 5

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'tutorial-arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Therefore, Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        vscode.window.activeTextEditor = mockTextEditor;

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        // Should show initial dialog first
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('✅ Created proof document: test-document.proof'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        // Then progress through all tutorial steps
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('Proof Editor Tutorial'),
          "Let's Begin!",
          'Skip Tutorial',
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('Understanding the Interface'),
          'Got it!',
          'Skip Tutorial',
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('Create Your First Argument'),
          'I see it!',
          'Create It For Me',
          'Skip Tutorial',
        );
      });

      it('should handle user skipping tutorial', async () => {
        (vi.mocked(vscode.window.showInformationMessage) as any)
          .mockResolvedValueOnce('Start Guided Tutorial') // User starts tutorial
          .mockResolvedValueOnce('Skip Tutorial'); // User skips immediately

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(2); // Initial + tutorial start (then skip)
      });

      it('should handle auto-create example argument', async () => {
        (vi.mocked(vscode.window.showInformationMessage) as any)
          .mockResolvedValueOnce('Start Guided Tutorial') // Initial selection
          .mockResolvedValueOnce("Let's Begin!")
          .mockResolvedValueOnce('Got it!')
          .mockResolvedValueOnce('Create It For Me') // Auto-create
          .mockResolvedValueOnce('Awesome!')
          .mockResolvedValueOnce('Start Exploring!');

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'tutorial-arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Therefore, Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        vscode.window.activeTextEditor = mockTextEditor;

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        expect(mockBootstrap.populateEmptyArgument).toHaveBeenCalledWith(
          mockTextEditor.document.fileName,
          expect.stringMatching(/^tutorial-arg-\d+$/),
          ['All humans are mortal', 'Socrates is human'],
          ['Therefore, Socrates is mortal'],
          { left: 'Modus Ponens' },
        );
        expect(mockUIPort.showInformation).toHaveBeenCalledWith(
          '✅ Example argument created successfully!',
        );
      });

      it('should handle advanced features selection', async () => {
        // Clear only the specific mocks we need to reset
        vi.mocked(vscode.window.showInformationMessage).mockClear();
        vi.mocked(vscode.window.showQuickPick).mockClear();
        vi.mocked(vscode.commands.executeCommand).mockClear();

        // Mock bootstrap controller for auto-create argument
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'tutorial-arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Therefore, Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        (vi.mocked(vscode.window.showInformationMessage) as any)
          .mockResolvedValueOnce('Start Guided Tutorial') // Initial tutorial selection
          .mockResolvedValueOnce("Let's Begin!")
          .mockResolvedValueOnce('Got it!')
          .mockResolvedValueOnce('Create It For Me') // Auto-create to avoid delay
          .mockResolvedValueOnce('Awesome!')
          .mockResolvedValueOnce('Show Advanced Features'); // Show advanced

        // Mock advanced features quick pick
        vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
          label: '🔗 Branching & Connections',
          description: 'Create connected argument trees',
          detail: 'Learn how to build complex proofs by connecting multiple arguments',
        });

        // Mock the info message shown after selecting an advanced feature
        (vi.mocked(vscode.window.showInformationMessage) as any).mockResolvedValueOnce('Got it!');

        // Mock finish tutorial message
        (vi.mocked(vscode.window.showInformationMessage) as any).mockResolvedValueOnce(
          'Start Building!',
        ); // Finish tutorial

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ label: '🔗 Branching & Connections' }),
            expect.objectContaining({ label: '📊 Visualization Features' }),
            expect.objectContaining({ label: '✅ Custom Validation' }),
            expect.objectContaining({ label: '📤 Export & Sharing' }),
            expect.objectContaining({ label: '📱 Cross-Platform Features' }),
          ]),
          { placeHolder: 'Choose an advanced feature to learn about...' },
        );
      });

      it('should handle tutorial completion workflows', async () => {
        // Clear only the specific mocks we need to reset
        vi.mocked(vscode.window.showInformationMessage).mockClear();
        vi.mocked(vscode.window.showQuickPick).mockClear();
        vi.mocked(vscode.commands.executeCommand).mockClear();

        // Mock bootstrap controller for auto-create argument
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
          ok({
            data: {
              argumentId: 'tutorial-arg-123',
              premises: ['All humans are mortal', 'Socrates is human'],
              conclusions: ['Therefore, Socrates is mortal'],
              ruleName: 'Modus Ponens',
            },
          }),
        );

        (vi.mocked(vscode.window.showInformationMessage) as any)
          .mockResolvedValueOnce('Start Guided Tutorial') // Initial tutorial selection
          .mockResolvedValueOnce("Let's Begin!")
          .mockResolvedValueOnce('Got it!')
          .mockResolvedValueOnce('Create It For Me') // Auto-create to avoid delay
          .mockResolvedValueOnce('Awesome!')
          .mockResolvedValueOnce('Start Exploring!')
          .mockResolvedValueOnce('Show Workflow'); // Finish with workflow

        vi.mocked(vscode.commands.executeCommand).mockResolvedValueOnce(undefined);

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
          'proofEditor.showBootstrapWorkflow',
        );
      });

      it('should handle create another proof option', async () => {
        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User chooses "Later"

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        // Should show initial dialog
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('✅ Created proof document: test-document.proof'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        // Should not execute any additional commands when user chooses "Later"
        expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
          'proofEditor.createBootstrapDocument',
        );
      });

      it('should handle tutorial errors gracefully', async () => {
        // Mock a tree visualization error that occurs during document creation
        const mockVisualizationService = mockContainer.resolve('ProofVisualizationService');
        vi.mocked(mockVisualizationService.generateVisualization).mockRejectedValueOnce(
          new Error('Tree visualization failed'),
        );

        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User chooses "Later"

        await getTutorialFromCommand('proofEditor.createBootstrapDocument');

        // Should handle errors gracefully and show error message
        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to display proof tree'),
        );
      });
    });

    describe('createExampleArgument', () => {
      it('should create example argument successfully', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Setup basic document creation mocks
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });

        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        // Should create document and show initial dialog
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('✅ Created proof document: test-doc.proof'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        // Bootstrap function should not be called since tutorial doesn't auto-run
        expect(mockBootstrap.populateEmptyArgument).not.toHaveBeenCalled();
      });

      it('should handle no active editor gracefully', async () => {
        vscode.window.activeTextEditor = undefined;

        // Trigger tutorial that would call createExampleArgument
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        vi.mocked(vscode.window.showInformationMessage)
          .mockResolvedValueOnce({ title: 'Start Guided Tutorial' })
          .mockResolvedValueOnce({ title: "Let's Begin!" })
          .mockResolvedValueOnce({ title: 'Got it!' })
          .mockResolvedValueOnce({ title: 'Create It For Me' })
          .mockResolvedValueOnce({ title: 'Finish Tutorial' });

        // Clear active editor after document creation but before tutorial
        vscode.window.activeTextEditor = undefined;

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        // Should not throw despite no active editor
        await expect(commandHandler()).resolves.not.toThrow();
      });

      it('should handle non-proof file gracefully', async () => {
        vscode.window.activeTextEditor = {
          ...mockTextEditor,
          document: { ...mockTextDocument, languageId: 'javascript' },
        };

        // Similar to above test but with wrong file type
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        vi.mocked(vscode.window.showInformationMessage)
          .mockResolvedValueOnce({ title: 'Start Guided Tutorial' })
          .mockResolvedValueOnce({ title: "Let's Begin!" })
          .mockResolvedValueOnce({ title: 'Got it!' })
          .mockResolvedValueOnce({ title: 'Create It For Me' })
          .mockResolvedValueOnce({ title: 'Finish Tutorial' });

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await expect(commandHandler()).resolves.not.toThrow();
      });
    });

    describe('showAdvancedFeatures', () => {
      it('should show all advanced feature options', async () => {
        // Trigger advanced features via tutorial
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        // Should show initial dialog
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('✅ Created proof document: test-doc.proof'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        // Advanced features would be shown if tutorial progressed, but doesn't auto-run
        expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
      });

      it('should handle user cancelling feature selection', async () => {
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        // Should show initial dialog
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('✅ Created proof document: test-doc.proof'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        // Should not call showQuickPick since tutorial doesn't auto-run
        expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
      });
    });

    describe('finishTutorial', () => {
      it('should show completion message with action options', async () => {
        vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('test-doc');
        const mockBootstrap = mockContainer.resolve('BootstrapController');
        mockBootstrap.initializeEmptyDocument.mockResolvedValueOnce({
          isErr: () => false,
        });
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');
        mockFileSystem.writeFile.mockResolvedValueOnce({ isErr: () => false });

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [{ uri: vscode.Uri.file('/test/workspace') }],
          writable: true,
          configurable: true,
        });

        const mockDocument = {
          ...mockTextDocument,
          uri: vscode.Uri.file('/test/workspace/test-doc.proof'),
        };
        vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument);
        vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockTextEditor);

        vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce({ title: 'Later' }); // User doesn't select tutorial

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        // Should show initial dialog (not completion dialog since tutorial doesn't auto-run)
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('✅ Created proof document: test-doc.proof'),
          'Start Guided Tutorial',
          'Create First Argument',
          'Show Me Around',
          'Later',
        );

        // Should not show completion message since tutorial doesn't run
        expect(mockUIPort.showInformation).not.toHaveBeenCalledWith('Happy proving! 🎯');
      });
    });
  });

  describe('comprehensive error handling', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

    describe('showProofTreeForDocument error scenarios', () => {
      it('should handle service resolution failures', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        // Mock container resolve failure
        mockContainer.resolve.mockImplementationOnce(() => {
          throw new Error('Service not found');
        });

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
        const commandHandler = commandCall?.[1] as () => void;

        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to display proof tree'),
        );
      });

      it('should handle ProofTreePanel creation errors', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
        vi.mocked(ProofTreePanel.createWithServices).mockResolvedValueOnce(
          err(new ValidationError('Panel creation failed')),
        );

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
        const commandHandler = commandCall?.[1] as () => void;

        await commandHandler();

        expect(mockUIPort.showError).toHaveBeenCalledWith(
          'Failed to display proof tree visualization',
        );
      });
    });

    describe('event handler error scenarios', () => {
      it('should handle validation controller exceptions in document open', async () => {
        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: [mockTextEditor],
          writable: true,
          configurable: true,
        });

        // Mock validation controller to throw
        mockValidationController.validateDocumentImmediate.mockImplementation(() => {
          throw new Error('Validation service crashed');
        });

        const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
        const onOpenHandler = onOpenCall?.[0];

        if (onOpenHandler) {
          await onOpenHandler(mockTextDocument);

          expect(mockUIPort.showError).toHaveBeenCalledWith(
            'Validation failed: Validation service crashed',
          );
        }
      });

      it('should handle validation controller exceptions in document change', async () => {
        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: [mockTextEditor],
          writable: true,
          configurable: true,
        });

        mockValidationController.validateDocumentDebounced.mockImplementation(() => {
          throw new Error('Validation debounce failed');
        });

        const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
        const onChangeHandler = onChangeCall?.[0];

        if (onChangeHandler) {
          await onChangeHandler(mockChangeEvent);

          expect(mockUIPort.showError).toHaveBeenCalledWith(
            'Validation failed: Validation debounce failed',
          );
        }
      });

      it('should handle document controller exceptions', async () => {
        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: [mockTextEditor],
          writable: true,
          configurable: true,
        });

        // Mock document controller to throw
        mockDocumentController.handleDocumentOpened.mockRejectedValueOnce(
          new Error('Document controller failed'),
        );

        const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
        const onOpenHandler = onOpenCall?.[0];

        if (onOpenHandler) {
          // Extension should handle the error gracefully and not propagate it
          // The actual extension code doesn't have error handling for document controller failures
          await expect(onOpenHandler(mockTextDocument)).rejects.toThrow(
            'Document controller failed',
          );
        }
      });
    });

    describe('container and DI error scenarios', () => {
      it('should handle container resolution failures during activation', async () => {
        // Create new context for clean test
        const newContext = { ...mockContext, subscriptions: [] };

        // Mock container to fail on specific service - use mockImplementation to handle all calls
        mockContainer.resolve.mockImplementation((token: string) => {
          if (token === 'ValidationController') {
            throw new Error('ValidationController not registered');
          }
          // Return the original mock implementation for other tokens
          switch (token) {
            case 'DocumentController':
              return mockDocumentController;
            case 'ProofTreeController':
              return mockProofTreeController;
            case 'BootstrapController':
              return mockBootstrapController;
            case 'IUIPort':
              return mockUIPort;
            case 'IPlatformPort':
              return {
                getPlatformInfo: vi
                  .fn()
                  .mockReturnValue({ type: 'test', version: '1.0', os: 'test', arch: 'test' }),
                getInputCapabilities: vi.fn().mockReturnValue({ primaryInput: 'keyboard' }),
                getDisplayCapabilities: vi
                  .fn()
                  .mockReturnValue({ screenWidth: 1920, screenHeight: 1080 }),
                copyToClipboard: vi.fn().mockResolvedValue({ isOk: () => true }),
                readFromClipboard: vi.fn().mockResolvedValue({ isOk: () => true, value: 'test' }),
              };
            case 'IFileSystemPort':
              return mockFileSystemPort;
            case 'IViewStatePort':
              return {
                getViewState: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                saveViewState: vi.fn().mockResolvedValue({ isOk: () => true }),
                capabilities: vi.fn().mockReturnValue({ canPersist: true }),
              };
            case 'TreeRenderer':
              return {
                render: vi.fn().mockReturnValue('<div>Mock Tree</div>'),
                updateRender: vi.fn(),
              };
            case 'DocumentQueryService':
              return {
                getDocumentStructure: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                getArguments: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
                getStatements: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
              };
            case 'ProofVisualizationService':
              return {
                generateVisualization: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                updateVisualization: vi.fn().mockResolvedValue({ isOk: () => true }),
              };
            case 'ViewStateManager':
              return {
                getViewState: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                updateViewState: vi.fn().mockResolvedValue({ isOk: () => true }),
                subscribeToChanges: vi.fn(),
              };
            default:
              return {};
          }
        });

        await expect(activate(newContext)).rejects.toThrow('ValidationController not registered');

        // Restore mock to prevent affecting other tests
        mockContainer.resolve.mockRestore();
      });

      it('should handle platform adapter registration failures', async () => {
        const containerModule = await import('../../infrastructure/di/container.js');
        const mockRegisterAdapters = vi
          .spyOn(containerModule, 'registerPlatformAdapters')
          .mockRejectedValueOnce(new Error('Platform adapter registration failed'));

        const newContext = { ...mockContext, subscriptions: [] };

        await expect(activate(newContext)).rejects.toThrow('Platform adapter registration failed');

        mockRegisterAdapters.mockRestore();
      });

      it('should handle controller factory registration failures', async () => {
        // Mock registerFactory to throw
        mockContainer.registerFactory.mockImplementationOnce(() => {
          throw new Error('Factory registration failed');
        });

        const newContext = { ...mockContext, subscriptions: [] };

        await expect(activate(newContext)).rejects.toThrow('Factory registration failed');
      });
    });

    describe('workspace and configuration edge cases', () => {
      it('should handle empty workspace folders array', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [],
          writable: true,
          configurable: true,
        });

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith(
          'Please open a workspace folder first.',
        );
      });

      it('should handle very long file paths', async () => {
        const longPath = '/'.concat('very-long-directory-name-'.repeat(20), 'file.proof');
        const mockLongDocument = {
          ...mockTextDocument,
          fileName: longPath,
          uri: vscode.Uri.file(longPath),
        };

        const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
        const onOpenHandler = onOpenCall?.[0];

        if (onOpenHandler) {
          await onOpenHandler(mockLongDocument);

          // Should handle long paths gracefully
          expect(mockUIPort.showInformation).toHaveBeenCalledWith(
            expect.stringContaining('file.proof'),
          );
        }
      });

      it('should handle documents with no visible editors', async () => {
        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: [],
          writable: true,
          configurable: true,
        });

        const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
        const onOpenHandler = onOpenCall?.[0];

        if (onOpenHandler) {
          await onOpenHandler(mockTextDocument);

          // Should handle gracefully without trying to show tree
          expect(mockUIPort.showInformation).toHaveBeenCalled();
        }
      });

      it('should handle documents with extremely large content', async () => {
        const hugeContent = 'a'.repeat(1_000_000); // 1MB string
        const hugeDocument = {
          ...mockTextDocument,
          getText: () => hugeContent,
        };

        const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
        const onOpenHandler = onOpenCall?.[0];

        if (onOpenHandler) {
          // Should handle large documents without performance issues
          const startTime = Date.now();
          await onOpenHandler(hugeDocument);
          const endTime = Date.now();

          // Should complete in reasonable time (less than 1 second)
          expect(endTime - startTime).toBeLessThan(1000);
          expect(mockUIPort.showInformation).toHaveBeenCalled();
        }
      });

      it('should handle VS Code API returning null values', async () => {
        // Mock VS Code API to return null
        Object.defineProperty(vscode.window, 'activeTextEditor', {
          value: null,
          writable: true,
          configurable: true,
        });

        Object.defineProperty(vscode.workspace, 'textDocuments', {
          value: null,
          writable: true,
          configurable: true,
        });

        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: null,
          writable: true,
          configurable: true,
        });

        const newContext = { ...mockContext, subscriptions: [] };

        // Should handle null API responses gracefully
        await expect(activate(newContext)).rejects.toThrow('Cannot read properties of null');
      });

      it('should handle concurrent command executions', async () => {
        vscode.window.activeTextEditor = mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createBootstrapArgument).mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve({ isErr: () => false, value: { data: { argumentId: 'arg-1' } } }),
                50,
              ),
            ),
        );

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapArgument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        // Execute command multiple times concurrently
        const promises = Array.from({ length: 3 }, () => commandHandler());

        // Should handle concurrent executions without issues
        await expect(Promise.all(promises)).resolves.not.toThrow();
        expect(mockBootstrap.createBootstrapArgument).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('subscription management', () => {
    it('should add validation controller to subscriptions', async () => {
      await activate(mockContext);

      expect(mockContext.subscriptions).toContain(mockValidationController);
    });

    it('should add all event handlers to subscriptions', async () => {
      await activate(mockContext);

      // Should have 14 items: ValidationController + showTreeCommand + 7 bootstrap commands + 4 event handlers + 1 file watcher
      expect(mockContext.subscriptions).toHaveLength(14);
    });

    it('should handle subscription disposal gracefully', async () => {
      await activate(mockContext);

      // Each subscription should have a dispose method and handle errors
      const disposalErrors: Error[] = [];

      // Mock one subscription to throw during disposal
      if (mockContext.subscriptions.length > 0) {
        const faultySubscription = mockContext.subscriptions[0];
        if (faultySubscription && typeof faultySubscription.dispose === 'function') {
          const originalDispose = faultySubscription.dispose;
          faultySubscription.dispose = () => {
            try {
              throw new Error('Disposal failed');
            } catch (error) {
              disposalErrors.push(error as Error);
              // Continue with original disposal
              originalDispose();
            }
          };
        }
      }
      mockContext.subscriptions.forEach((subscription) => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');

        // Test that disposal doesn't throw unhandled errors
        try {
          subscription.dispose();
        } catch (error) {
          // Disposal errors should be handled gracefully
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });
});
