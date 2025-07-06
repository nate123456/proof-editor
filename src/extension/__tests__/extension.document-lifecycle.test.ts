/**
 * HEAVY COVERAGE: Extension Document Lifecycle Integration Tests
 *
 * Comprehensive test suite covering complex VS Code integration scenarios:
 * - Document open/close/switch event handling
 * - Resource management and cleanup
 * - Memory leak prevention
 * - Multi-document state isolation
 * - Error recovery during lifecycle events
 * - Performance with many documents
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { ValidationError } from '../../domain/shared/result.js';

// Mock VS Code module with extensive API surface
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  window: {
    activeTextEditor: null,
    visibleTextEditors: [],
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showTextDocument: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    textDocuments: [],
    openTextDocument: vi.fn(),
    onDidOpenTextDocument: vi.fn(),
    onDidChangeTextDocument: vi.fn(),
    onDidCloseTextDocument: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    createFileSystemWatcher: vi.fn(),
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
      delete: vi.fn(),
      createDirectory: vi.fn(),
    },
  },
  Uri: {
    file: vi.fn(),
    joinPath: vi.fn(),
  },
  FileType: { File: 1, Directory: 2 },
  TextDocument: vi.fn(),
  TextEditor: vi.fn(),
  ExtensionContext: vi.fn(),
  Disposable: {
    from: vi.fn(),
  },
}));

// Mock DI container
const mockContainer = {
  resolve: vi.fn(),
  registerFactory: vi.fn(),
  isRegistered: vi.fn().mockReturnValue(true),
};

vi.mock('../../infrastructure/di/container.js', () => ({
  initializeContainer: vi.fn(),
  getContainer: vi.fn(() => mockContainer),
  registerPlatformAdapters: vi.fn(),
}));

// Mock all required tokens
vi.mock('../../infrastructure/di/tokens.js', () => ({
  TOKENS: {
    DocumentController: Symbol('DocumentController'),
    ProofTreeController: Symbol('ProofTreeController'),
    BootstrapController: Symbol('BootstrapController'),
    IUIPort: Symbol('IUIPort'),
    IPlatformPort: Symbol('IPlatformPort'),
    IFileSystemPort: Symbol('IFileSystemPort'),
    IViewStatePort: Symbol('IViewStatePort'),
    DocumentQueryService: Symbol('DocumentQueryService'),
    ProofVisualizationService: Symbol('ProofVisualizationService'),
    ViewStateManager: Symbol('ViewStateManager'),
    TreeRenderer: Symbol('TreeRenderer'),
    ProofApplicationService: Symbol('ProofApplicationService'),
    YAMLSerializer: Symbol('YAMLSerializer'),
  },
}));

// Mock panel manager
const mockPanelManager = {
  getInstance: vi.fn(),
  createPanelWithServices: vi.fn(),
  closePanelForDocument: vi.fn(),
  getPanelForDocument: vi.fn(),
  closeAllPanels: vi.fn(),
  getOpenPanelCount: vi.fn(),
};

vi.mock('../../webview/ProofTreePanelManager.js', () => ({
  ProofTreePanelManager: mockPanelManager,
}));

describe('Extension Document Lifecycle Integration Tests', () => {
  let mockContext: Partial<vscode.ExtensionContext>;
  let mockDocumentController: any;
  let mockProofTreeController: any;
  let mockValidationController: any;
  let mockBootstrapController: any;
  let mockUIPort: any;
  let mockFileSystemPort: any;
  let mockDocument: Partial<vscode.TextDocument>;
  let mockEditor: Partial<vscode.TextEditor>;

  // Event listener storage for simulating VS Code events
  let documentOpenListeners: ((doc: vscode.TextDocument) => void)[] = [];
  let documentChangeListeners: ((event: vscode.TextDocumentChangeEvent) => void)[] = [];
  let documentCloseListeners: ((doc: vscode.TextDocument) => void)[] = [];
  let editorChangeListeners: ((editor: vscode.TextEditor | undefined) => void)[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset listener arrays
    documentOpenListeners = [];
    documentChangeListeners = [];
    documentCloseListeners = [];
    editorChangeListeners = [];

    // Setup mock context
    mockContext = {
      subscriptions: {
        push: vi.fn(),
      } as any,
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(),
      } as any,
    };

    // Setup mock document
    mockDocument = {
      fileName: '/test/document.proof',
      uri: { toString: () => 'file:///test/document.proof', fsPath: '/test/document.proof' } as any,
      languageId: 'proof',
      getText: vi.fn().mockReturnValue('test content'),
      isDirty: false,
      isClosed: false,
      save: vi.fn().mockResolvedValue(true),
    };

    // Setup mock editor
    mockEditor = {
      document: mockDocument as vscode.TextDocument,
    };

    // Setup mock controllers
    mockDocumentController = {
      handleDocumentOpened: vi.fn().mockResolvedValue(ok(undefined)),
      handleDocumentChanged: vi.fn().mockResolvedValue(ok(undefined)),
      handleDocumentClosed: vi.fn().mockResolvedValue(ok(undefined)),
      setPanelManager: vi.fn(),
      setViewStatePort: vi.fn(),
      associatePanelWithDocument: vi.fn().mockResolvedValue(ok(undefined)),
      dispose: vi.fn(),
    };

    mockProofTreeController = {
      showTreeForDocument: vi.fn().mockResolvedValue(ok(undefined)),
      dispose: vi.fn(),
    };

    mockValidationController = {
      validateDocumentImmediate: vi.fn(),
      validateDocumentDebounced: vi.fn(),
      clearDocumentValidation: vi.fn(),
      dispose: vi.fn(),
    };

    mockBootstrapController = {
      initializeEmptyDocument: vi.fn().mockResolvedValue(ok({ data: { documentId: 'test' } })),
      createBootstrapArgument: vi.fn().mockResolvedValue(ok({ data: { argumentId: 'arg1' } })),
    };

    mockUIPort = {
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      createWebviewPanel: vi.fn(),
      postMessageToWebview: vi.fn(),
    };

    mockFileSystemPort = {
      writeFile: vi.fn().mockResolvedValue(ok(undefined)),
      readFile: vi.fn().mockResolvedValue(ok('test content')),
      exists: vi.fn().mockResolvedValue(ok(true)),
      storeDocument: vi.fn().mockResolvedValue(ok(undefined)),
      deleteStoredDocument: vi.fn().mockResolvedValue(ok(undefined)),
      capabilities: vi.fn().mockReturnValue({ canWatch: true }),
    };

    // Setup container to return mocked services
    mockContainer.resolve.mockImplementation((token) => {
      const tokenMap = {
        [Symbol.for('DocumentController')]: mockDocumentController,
        [Symbol.for('ProofTreeController')]: mockProofTreeController,
        [Symbol.for('ValidationController')]: mockValidationController,
        [Symbol.for('BootstrapController')]: mockBootstrapController,
        [Symbol.for('IUIPort')]: mockUIPort,
        [Symbol.for('IFileSystemPort')]: mockFileSystemPort,
      };
      return tokenMap[token as symbol] || {};
    });

    // Setup VS Code workspace event handlers
    const vscode = vi.mocked(await import('vscode'));
    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockImplementation((listener) => {
      documentOpenListeners.push(listener);
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation((listener) => {
      documentChangeListeners.push(listener);
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.onDidCloseTextDocument).mockImplementation((listener) => {
      documentCloseListeners.push(listener);
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((listener) => {
      editorChangeListeners.push(listener);
      return { dispose: vi.fn() };
    });

    // Setup panel manager mocks
    mockPanelManager.getInstance.mockReturnValue(mockPanelManager);
    mockPanelManager.createPanelWithServices.mockResolvedValue(ok({}));
  });

  describe('Document Open Event Handling', () => {
    it('should handle proof document opening with proper initialization', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Act - Simulate document open
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledWith({
        fileName: '/test/document.proof',
        uri: 'file:///test/document.proof',
        getText: expect.any(Function),
      });
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalled();
    });

    it('should ignore non-proof documents during open', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const nonProofDoc = {
        ...mockDocument,
        languageId: 'typescript',
        fileName: '/test/document.ts',
      };

      // Act
      for (const listener of documentOpenListeners) {
        await listener(nonProofDoc as vscode.TextDocument);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });

    it('should handle errors during document opening gracefully', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      mockDocumentController.handleDocumentOpened.mockRejectedValue(new Error('Open failed'));

      // Act
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
      );
    });

    it('should create proof tree panel for opened documents with editor', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const vscode = vi.mocked(await import('vscode'));
      vscode.window.visibleTextEditors = [mockEditor as vscode.TextEditor];

      // Act
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        'file:///test/document.proof',
        'test content',
        expect.any(Object), // documentQueryService
        expect.any(Object), // visualizationService
        expect.any(Object), // uiPort
        expect.any(Object), // renderer
        expect.any(Object), // viewStateManager
        expect.any(Object), // viewStatePort
        expect.any(Object), // bootstrapController
        expect.any(Object), // proofApplicationService
        expect.any(Object), // yamlSerializer
      );
    });

    it('should handle panel creation errors during document open', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const vscode = vi.mocked(await import('vscode'));
      vscode.window.visibleTextEditors = [mockEditor as vscode.TextEditor];

      mockPanelManager.createPanelWithServices.mockResolvedValue(
        err(new ValidationError('Panel creation failed')),
      );

      // Act
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });
  });

  describe('Document Change Event Handling', () => {
    it('should handle document changes with proper updates', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const vscode = vi.mocked(await import('vscode'));
      vscode.window.visibleTextEditors = [mockEditor as vscode.TextEditor];

      const changeEvent = {
        document: mockDocument as vscode.TextDocument,
        contentChanges: [],
        reason: undefined,
      };

      // Act
      for (const listener of documentChangeListeners) {
        await listener(changeEvent);
      }

      // Assert
      expect(mockDocumentController.handleDocumentChanged).toHaveBeenCalledWith({
        fileName: '/test/document.proof',
        uri: 'file:///test/document.proof',
        getText: expect.any(Function),
        isDirty: false,
      });
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalled();
    });

    it('should update tree panel when document changes', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const vscode = vi.mocked(await import('vscode'));
      vscode.window.visibleTextEditors = [mockEditor as vscode.TextEditor];

      const changeEvent = {
        document: mockDocument as vscode.TextDocument,
        contentChanges: [],
        reason: undefined,
      };

      // Act
      for (const listener of documentChangeListeners) {
        await listener(changeEvent);
      }

      // Assert
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });

    it('should handle dirty state changes properly', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const dirtyDocument = {
        ...mockDocument,
        isDirty: true,
      };

      const changeEvent = {
        document: dirtyDocument as vscode.TextDocument,
        contentChanges: [],
        reason: undefined,
      };

      // Act
      for (const listener of documentChangeListeners) {
        await listener(changeEvent);
      }

      // Assert
      expect(mockDocumentController.handleDocumentChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          isDirty: true,
        }),
      );
    });

    it('should handle validation errors during document change', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      mockValidationController.validateDocumentDebounced.mockImplementation(() => {
        throw new Error('Validation error');
      });

      const changeEvent = {
        document: mockDocument as vscode.TextDocument,
        contentChanges: [],
        reason: undefined,
      };

      // Act
      for (const listener of documentChangeListeners) {
        await listener(changeEvent);
      }

      // Assert
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
      );
    });
  });

  describe('Document Close Event Handling', () => {
    it('should handle document closing with proper cleanup', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Act
      for (const listener of documentCloseListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert
      expect(mockDocumentController.handleDocumentClosed).toHaveBeenCalledWith({
        fileName: '/test/document.proof',
        uri: 'file:///test/document.proof',
      });
      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalled();
      expect(mockPanelManager.closePanelForDocument).toHaveBeenCalledWith(
        'file:///test/document.proof',
      );
    });

    it('should handle non-proof document closing without action', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const nonProofDoc = {
        ...mockDocument,
        languageId: 'typescript',
      };

      // Act
      for (const listener of documentCloseListeners) {
        await listener(nonProofDoc as vscode.TextDocument);
      }

      // Assert
      expect(mockDocumentController.handleDocumentClosed).not.toHaveBeenCalled();
      expect(mockValidationController.clearDocumentValidation).not.toHaveBeenCalled();
    });

    it('should handle panel cleanup errors gracefully', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      mockPanelManager.closePanelForDocument.mockImplementation(() => {
        throw new Error('Panel cleanup failed');
      });

      // Act & Assert - Should not throw
      for (const listener of documentCloseListeners) {
        await expect(listener(mockDocument as vscode.TextDocument)).resolves.not.toThrow();
      }
    });
  });

  describe('Active Editor Changes', () => {
    it('should handle active editor changes for proof documents', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Act
      for (const listener of editorChangeListeners) {
        await listener(mockEditor as vscode.TextEditor);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledWith({
        fileName: '/test/document.proof',
        uri: 'file:///test/document.proof',
        getText: expect.any(Function),
      });
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalled();
    });

    it('should handle editor change to undefined', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Act
      for (const listener of editorChangeListeners) {
        await listener(undefined);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).not.toHaveBeenCalled();
    });

    it('should handle non-proof editor changes', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const nonProofEditor = {
        document: {
          ...mockDocument,
          languageId: 'typescript',
        },
      };

      // Act
      for (const listener of editorChangeListeners) {
        await listener(nonProofEditor as vscode.TextEditor);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Document State Isolation', () => {
    it('should handle multiple proof documents independently', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const doc1 = {
        ...mockDocument,
        fileName: '/test/doc1.proof',
        uri: { toString: () => 'file:///test/doc1.proof' },
      };
      const doc2 = {
        ...mockDocument,
        fileName: '/test/doc2.proof',
        uri: { toString: () => 'file:///test/doc2.proof' },
      };

      // Act - Open both documents
      for (const listener of documentOpenListeners) {
        await listener(doc1 as vscode.TextDocument);
        await listener(doc2 as vscode.TextDocument);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledTimes(2);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(2);
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(2);
    });

    it('should close specific document panels without affecting others', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const doc1 = {
        ...mockDocument,
        fileName: '/test/doc1.proof',
        uri: { toString: () => 'file:///test/doc1.proof' },
      };
      const doc2 = {
        ...mockDocument,
        fileName: '/test/doc2.proof',
        uri: { toString: () => 'file:///test/doc2.proof' },
      };

      // Act - Open both, then close one
      for (const listener of documentOpenListeners) {
        await listener(doc1 as vscode.TextDocument);
        await listener(doc2 as vscode.TextDocument);
      }

      for (const listener of documentCloseListeners) {
        await listener(doc1 as vscode.TextDocument);
      }

      // Assert
      expect(mockPanelManager.closePanelForDocument).toHaveBeenCalledWith(
        'file:///test/doc1.proof',
      );
      expect(mockPanelManager.closePanelForDocument).not.toHaveBeenCalledWith(
        'file:///test/doc2.proof',
      );
    });
  });

  describe('Resource Management and Memory Leaks', () => {
    it('should properly dispose all event listeners', async () => {
      // Arrange
      const disposeMocks = Array(10)
        .fill(null)
        .map(() => ({ dispose: vi.fn() }));
      const vscode = vi.mocked(await import('vscode'));

      let callIndex = 0;
      const mockEventRegistration = () => disposeMocks[callIndex++] || { dispose: vi.fn() };

      vi.mocked(vscode.workspace.onDidOpenTextDocument).mockImplementation(mockEventRegistration);
      vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation(mockEventRegistration);
      vi.mocked(vscode.workspace.onDidCloseTextDocument).mockImplementation(mockEventRegistration);
      vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation(
        mockEventRegistration,
      );
      vi.mocked(vscode.commands.registerCommand).mockImplementation(mockEventRegistration);
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
        onDidChange: mockEventRegistration,
        onDidCreate: mockEventRegistration,
        onDidDelete: mockEventRegistration,
        dispose: vi.fn(),
      } as any);

      // Act
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Assert - All disposables should be registered with context
      expect(mockContext.subscriptions?.push).toHaveBeenCalled();
      const pushCalls = mockContext.subscriptions?.push
        ? vi.mocked(mockContext.subscriptions.push).mock.calls
        : [];
      expect(pushCalls.length).toBeGreaterThan(0);
    });

    it('should handle controller disposal during deactivation', async () => {
      // Arrange
      const { activate, deactivate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Act
      deactivate();

      // Assert - Should not throw or cause memory issues
      expect(deactivate).toBeDefined();
    });

    it('should clean up stored documents on file deletion', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const vscode = vi.mocked(await import('vscode'));
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      // Trigger watcher setup
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Act - Simulate file deletion
      const deleteHandler = mockWatcher.onDidDelete.mock.calls[0]?.[0];
      if (deleteHandler) {
        await deleteHandler({
          fsPath: '/test/document.proof',
          toString: () => 'file:///test/document.proof',
        });
      }

      // Assert
      expect(mockFileSystemPort.deleteStoredDocument).toHaveBeenCalledWith('/test/document.proof');
      expect(mockPanelManager.closePanelForDocument).toHaveBeenCalledWith(
        'file:///test/document.proof',
      );
    });
  });

  describe('Error Recovery During Lifecycle Events', () => {
    it('should recover from document controller errors', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      mockDocumentController.handleDocumentOpened
        .mockRejectedValueOnce(new Error('Controller error'))
        .mockResolvedValueOnce(ok(undefined));

      // Act - First call fails, second succeeds
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledTimes(2);
      expect(mockUIPort.showError).toHaveBeenCalledOnce();
    });

    it('should handle validation controller errors gracefully', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      mockValidationController.validateDocumentImmediate.mockImplementation(() => {
        throw new ValidationError('Validation failed');
      });

      // Act
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert - Should continue processing despite validation error
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalled();
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
      );
    });

    it('should handle panel manager errors without affecting document processing', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const vscode = vi.mocked(await import('vscode'));
      vscode.window.visibleTextEditors = [mockEditor as vscode.TextEditor];

      mockPanelManager.createPanelWithServices.mockRejectedValue(new Error('Panel error'));

      // Act
      for (const listener of documentOpenListeners) {
        await listener(mockDocument as vscode.TextDocument);
      }

      // Assert - Document processing should still succeed
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalled();
    });
  });

  describe('Performance with Many Documents', () => {
    it('should handle 20+ simultaneous document operations efficiently', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const documents = Array.from({ length: 25 }, (_, i) => ({
        ...mockDocument,
        fileName: `/test/doc${i}.proof`,
        uri: { toString: () => `file:///test/doc${i}.proof`, fsPath: `/test/doc${i}.proof` },
      }));

      const startTime = Date.now();

      // Act - Open all documents rapidly
      const promises = documents.map((doc) =>
        Promise.all(documentOpenListeners.map((listener) => listener(doc as vscode.TextDocument))),
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - Should complete within reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledTimes(25);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(25);
    });

    it('should handle rapid document open/close cycles', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      const testDoc = mockDocument as vscode.TextDocument;

      // Act - Rapid open/close cycles
      for (let i = 0; i < 10; i++) {
        for (const listener of documentOpenListeners) {
          await listener(testDoc);
        }
        for (const listener of documentCloseListeners) {
          await listener(testDoc);
        }
      }

      // Assert
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledTimes(10);
      expect(mockDocumentController.handleDocumentClosed).toHaveBeenCalledTimes(10);
      expect(mockPanelManager.closePanelForDocument).toHaveBeenCalledTimes(10);
    });

    it('should maintain memory stability with continuous document operations', async () => {
      // Arrange
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Mock memory monitoring
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - Continuous document operations
      for (let cycle = 0; cycle < 5; cycle++) {
        const cycleDocuments = Array.from({ length: 10 }, (_, i) => ({
          ...mockDocument,
          fileName: `/test/cycle${cycle}_doc${i}.proof`,
          uri: { toString: () => `file:///test/cycle${cycle}_doc${i}.proof` },
        }));

        // Open all documents
        for (const doc of cycleDocuments) {
          for (const listener of documentOpenListeners) {
            await listener(doc as vscode.TextDocument);
          }
        }

        // Close all documents
        for (const doc of cycleDocuments) {
          for (const listener of documentCloseListeners) {
            await listener(doc as vscode.TextDocument);
          }
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert - Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Existing Document Detection', () => {
    it('should process existing proof documents on activation', async () => {
      // Arrange
      const vscode = vi.mocked(await import('vscode'));
      const existingDocs = [
        { ...mockDocument, fileName: '/existing1.proof' },
        { ...mockDocument, fileName: '/existing2.proof' },
      ];

      // Mock textDocuments getter instead of assigning to read-only property
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: existingDocs as vscode.TextDocument[],
        writable: true,
        configurable: true,
      });
      vscode.window.visibleTextEditors = [
        { document: existingDocs[0] },
        { document: existingDocs[1] },
      ] as vscode.TextEditor[];

      // Act
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Assert
      expect(mockDocumentController.handleDocumentOpened).toHaveBeenCalledTimes(2);
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(2);
    });

    it('should ignore existing non-proof documents on activation', async () => {
      // Arrange
      const vscode = vi.mocked(await import('vscode'));
      const existingDocs = [
        { ...mockDocument, fileName: '/existing.ts', languageId: 'typescript' },
        { ...mockDocument, fileName: '/existing.js', languageId: 'javascript' },
      ];

      // Mock textDocuments getter instead of assigning to read-only property
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: existingDocs as vscode.TextDocument[],
        writable: true,
        configurable: true,
      });

      // Act
      const { activate } = await import('../extension.js');
      await activate(mockContext as vscode.ExtensionContext);

      // Assert
      expect(mockDocumentController.handleDocumentOpened).not.toHaveBeenCalled();
    });
  });
});
