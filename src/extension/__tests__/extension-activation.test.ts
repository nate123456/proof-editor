/**
 * Extension activation/deactivation lifecycle tests
 *
 * Tests cover:
 * - Extension activation process
 * - Extension deactivation process
 * - Service registration and initialization
 * - Context subscription management
 * - Error handling during activation/deactivation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextEditor } from 'vscode';
import * as vscode from 'vscode';

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

describe('Extension Activation/Deactivation', () => {
  let mockContext: vscode.ExtensionContext;
  let mockTextDocument: TextDocument;
  let mockTextEditor: TextEditor;
  let mockWebviewPanel: vscode.WebviewPanel;

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

    // Set up VS Code API mocks
    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockReturnValue({ dispose: vi.fn() });
    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockReturnValue({ dispose: vi.fn() });
    vi.mocked(vscode.workspace.onDidCloseTextDocument).mockReturnValue({ dispose: vi.fn() });
    vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockReturnValue({ dispose: vi.fn() });
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
    mockBootstrapController.initializeEmptyDocument.mockImplementation(() => {
      // Default behavior - do nothing
    });
    mockBootstrapController.createBootstrapArgument.mockImplementation(() => {
      // Default behavior - do nothing
    });
    mockBootstrapController.populateEmptyArgument.mockImplementation(() => {
      // Default behavior - do nothing
    });
    mockBootstrapController.getBootstrapWorkflow.mockImplementation(() => {
      // Default behavior - do nothing
    });
    mockBootstrapController.createEmptyImplicationLine.mockImplementation(() => {
      // Default behavior - do nothing
    });

    // Reset panel manager mocks
    mockPanelManager.createOrShowPanel.mockClear();
    mockPanelManager.createPanelWithServices.mockClear();
    mockPanelManager.closePanelForDocument.mockClear();
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
});
