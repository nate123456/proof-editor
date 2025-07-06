/**
 * Extension Command Handling Tests
 *
 * Tests for VS Code extension command registration and handling:
 * - showTree command registration and execution
 * - Command parameter validation
 * - Error handling for command execution
 * - UI interaction patterns
 *
 * Follows Single Responsibility Principle - focused solely on command handling logic
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextEditor } from 'vscode';
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
    workspaceFolders: [],
    textDocuments: [],
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, path })),
  },
  Range: vi.fn().mockImplementation((start, end) => ({ start, end })),
  Position: vi.fn().mockImplementation((line: number, character: number) => ({
    line,
    character,
  })),
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  WebviewPanel: vi.fn(),
  languages: {
    registerDocumentSymbolProvider: vi.fn(),
    registerDefinitionProvider: vi.fn(),
    registerHoverProvider: vi.fn(),
    registerCompletionItemProvider: vi.fn(),
    createDiagnosticCollection: vi.fn(() => ({
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      forEach: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      dispose: vi.fn(),
    })),
  },
}));

// Import the real activate function (don't mock it)
import { activate } from '../extension.js';

vi.mock('../../infrastructure/container/DIContainer.js', () => ({
  createContainer: vi.fn(),
}));

vi.mock('../../webview/ProofTreePanel.js', () => ({
  ProofTreePanel: {
    createWithServices: vi.fn(),
  },
}));

vi.mock('../../infrastructure/vscode/VSCodeFileSystemAdapter.js', () => ({
  VSCodeFileSystemAdapter: vi.fn(),
}));

vi.mock('../../infrastructure/vscode/VSCodeUIAdapter.js', () => ({
  VSCodeUIAdapter: vi.fn(),
}));

vi.mock('../../infrastructure/vscode/VSCodeViewStateAdapter.js', () => ({
  VSCodeViewStateAdapter: vi.fn(),
}));

vi.mock('../../infrastructure/vscode/VSCodePlatformAdapter.js', () => ({
  VSCodePlatformAdapter: vi.fn(),
}));

vi.mock('../../webview/TreeRenderer.js', () => ({
  TreeRenderer: vi.fn(),
}));

vi.mock('../../application/services/DocumentQueryService.js', () => ({
  DocumentQueryService: vi.fn(),
}));

vi.mock('../../application/services/VisualizationService.js', () => ({
  VisualizationService: vi.fn(),
}));

vi.mock('../../application/services/ViewStateManager.js', () => ({
  ViewStateManager: vi.fn(),
}));

vi.mock('../../application/services/DocumentController.js', () => ({
  DocumentController: vi.fn(),
}));

vi.mock('../../application/services/ValidationController.js', () => ({
  ValidationController: vi.fn(),
}));

vi.mock('../../application/services/BootstrapController.js', () => ({
  BootstrapController: vi.fn(),
}));

vi.mock('../../application/services/ProofApplicationService.js', () => ({
  ProofApplicationService: vi.fn(),
}));

vi.mock('../../application/services/YAMLSerializer.js', () => ({
  YAMLSerializer: vi.fn(),
}));

vi.mock('../../application/services/ExportService.js', () => ({
  ExportService: vi.fn(),
}));

vi.mock('../../application/services/DocumentIdService.js', () => ({
  DocumentIdService: vi.fn(),
}));

vi.mock('../../webview/PanelManager.js', () => ({
  PanelManager: vi.fn(),
}));

// Mock text document
const mockTextDocument: TextDocument = {
  uri: vscode.Uri.file('/test/file.proof'),
  fileName: '/test/file.proof',
  isUntitled: false,
  languageId: 'proof',
  version: 1,
  isDirty: false,
  isClosed: false,
  save: vi.fn(),
  eol: 1,
  lineCount: 1,
  getText: vi.fn().mockReturnValue('mock proof content'),
  getWordRangeAtPosition: vi.fn(),
  lineAt: vi.fn(),
  offsetAt: vi.fn(),
  positionAt: vi.fn(),
  validatePosition: vi.fn(),
  validateRange: vi.fn(),
} as any;

// Mock text editor
const mockTextEditor: TextEditor = {
  document: mockTextDocument,
  selection: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
  selections: [],
  visibleRanges: [],
  options: {},
  viewColumn: vscode.ViewColumn.One,
  edit: vi.fn(),
  insertSnippet: vi.fn(),
  setDecorations: vi.fn(),
  revealRange: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
} as any;

// Mock webview panel
const mockWebviewPanel = {
  webview: {
    html: '',
    postMessage: vi.fn(),
    onDidReceiveMessage: vi.fn(),
    cspSource: 'mock-csp',
    asWebviewUri: vi.fn((uri) => uri),
  },
  title: 'Test Panel',
  dispose: vi.fn(),
  onDidDispose: vi.fn(),
  onDidChangeViewState: vi.fn(),
  reveal: vi.fn(),
  visible: true,
  active: true,
  viewColumn: vscode.ViewColumn.One,
} as any;

// Mock extension context
const mockContext = {
  subscriptions: [],
  extensionPath: '/test/extension',
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(),
  },
  workspaceState: {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(),
  },
  extensionUri: vscode.Uri.file('/test/extension'),
  environmentVariableCollection: {
    persistent: false,
    replace: vi.fn(),
    append: vi.fn(),
    prepend: vi.fn(),
    get: vi.fn(),
    forEach: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  storageUri: vscode.Uri.file('/test/storage'),
  globalStorageUri: vscode.Uri.file('/test/global'),
  logUri: vscode.Uri.file('/test/log'),
  asAbsolutePath: vi.fn((path) => `/test/extension/${path}`),
  logPath: '/test/log',
  storagePath: '/test/storage',
  globalStoragePath: '/test/global',
  secrets: {
    get: vi.fn(),
    store: vi.fn(),
    delete: vi.fn(),
    onDidChange: vi.fn(),
  },
  extension: {
    id: 'test.extension',
    extensionPath: '/test/extension',
    isActive: true,
    packageJSON: {},
    extensionKind: 1,
    exports: {},
    extensionUri: vscode.Uri.file('/test/extension'),
    activate: vi.fn(),
  },
} as any;

// Mock UI Port
const mockUIPort = {
  showInformation: vi.fn(),
  showWarning: vi.fn(),
  showError: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  createWebviewPanel: vi.fn(),
};

// Mock Panel Manager
const mockPanelManager = {
  createPanelWithServices: vi.fn().mockResolvedValue(ok(mockWebviewPanel)),
  dispose: vi.fn(),
};

// Mock Container
const mockContainer = {
  resolve: vi.fn((token: string) => {
    switch (token) {
      case 'IUIPort':
        return mockUIPort;
      case 'PanelManager':
        return mockPanelManager;
      case 'IFileSystemPort':
        return {
          readFile: vi.fn().mockResolvedValue(ok('mock content')),
          writeFile: vi.fn().mockResolvedValue(ok(undefined)),
          storeDocument: vi.fn().mockResolvedValue(ok(undefined)),
          capabilities: vi.fn().mockReturnValue({
            canReadFile: true,
            canWriteFile: true,
            canAccessArbitraryPaths: true,
            canWatch: true,
          }),
        };
      case 'DocumentQueryService':
        return {
          getDocumentById: vi.fn().mockResolvedValue(ok({})),
          parseDocumentContent: vi.fn().mockResolvedValue(ok({})),
          validateDocumentContent: vi.fn().mockResolvedValue(ok({})),
        };
      case 'VisualizationService':
        return {
          generateVisualization: vi.fn().mockResolvedValue(ok({})),
          updateVisualization: vi.fn().mockResolvedValue(ok({})),
        };
      case 'TreeRenderer':
        return {
          render: vi.fn().mockResolvedValue(ok({})),
          updateRender: vi.fn().mockResolvedValue(ok({})),
        };
      case 'ViewStateManager':
        return {
          getViewState: vi.fn().mockResolvedValue(ok({})),
          subscribeToChanges: vi.fn().mockResolvedValue(ok({})),
          updateViewState: vi.fn().mockResolvedValue(ok({})),
        };
      case 'IViewStatePort':
        return {
          capabilities: vi.fn().mockReturnValue({ canPersist: true }),
          getViewState: vi.fn().mockResolvedValue(ok({})),
          saveViewState: vi.fn().mockResolvedValue(ok({})),
        };
      case 'BootstrapController':
        return {
          createBootstrapArgument: vi.fn().mockResolvedValue(ok({})),
          createEmptyImplicationLine: vi.fn().mockResolvedValue(ok({})),
          getBootstrapWorkflow: vi.fn().mockResolvedValue(ok({})),
          initializeEmptyDocument: vi.fn().mockResolvedValue(ok({})),
          populateEmptyArgument: vi.fn().mockResolvedValue(ok({})),
        };
      case 'ProofApplicationService':
        return {
          createArgument: vi.fn().mockResolvedValue(ok({})),
          getDocuments: vi.fn().mockResolvedValue(ok([])),
          processCommand: vi.fn().mockResolvedValue(ok({})),
        };
      case 'YAMLSerializer':
        return {
          serialize: vi.fn().mockReturnValue('mock yaml'),
          deserialize: vi.fn().mockReturnValue(ok({})),
          serializeDocument: vi.fn().mockReturnValue('mock yaml'),
          deserializeDocument: vi.fn().mockReturnValue(ok({})),
        };
      case 'ExportService':
        return {
          exportDocument: vi.fn().mockResolvedValue(ok({})),
          getSupportedFormats: vi.fn().mockReturnValue(['json', 'yaml']),
          validateExportFormat: vi.fn().mockReturnValue(ok({})),
        };
      case 'DocumentIdService':
        return {
          generateId: vi.fn().mockReturnValue('mock-id'),
          validateId: vi.fn().mockReturnValue(ok({})),
          isTemporaryId: vi.fn().mockReturnValue(false),
          convertTemporaryId: vi.fn().mockReturnValue(ok('converted-id')),
        };
      default:
        return {};
    }
  }),
};

// Mock the container creation
vi.mock('../../infrastructure/container/DIContainer.js', () => ({
  createContainer: vi.fn().mockResolvedValue(mockContainer),
}));

describe('Extension Command Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset VS Code mocks
    vi.mocked(vscode.commands.registerCommand).mockReturnValue({ dispose: vi.fn() });
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockWebviewPanel);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(mockTextDocument);
    vi.mocked(vscode.window.showTextDocument).mockResolvedValue(mockTextEditor);
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined);

    // Reset workspace folders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: undefined,
      writable: true,
      configurable: true,
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

  describe('showTree command error handling', () => {
    beforeEach(async () => {
      await activate(mockContext);
    });

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
        'Failed to show proof tree: Service not found',
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
        'Failed to show proof tree: Panel creation failed',
      );
    });

    it('should handle malformed document content', async () => {
      // Create a mock editor with malformed content
      const malformedEditor = {
        ...mockTextEditor,
        document: {
          ...mockTextDocument,
          getText: vi.fn().mockReturnValue('invalid yaml content'),
        },
      };

      // Mock visibleTextEditors to include malformed editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [malformedEditor],
        writable: true,
        configurable: true,
      });

      vscode.window.activeTextEditor = malformedEditor;

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showTree');
      const commandHandler = commandCall?.[1] as () => void;

      // The command catches errors and shows them via UI port
      await commandHandler();

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to show proof tree:'),
      );
    });
  });

  describe('command registration', () => {
    it('should register showTree command on activation', async () => {
      await activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'proofEditor.showTree',
        expect.any(Function),
      );
    });

    it('should handle VS Code API unavailability', async () => {
      // Simulate VS Code API methods throwing
      vi.mocked(vscode.commands.registerCommand).mockImplementation(() => {
        throw new Error('VS Code API unavailable');
      });

      await expect(activate(mockContext)).rejects.toThrow('VS Code API unavailable');
    });
  });
});
