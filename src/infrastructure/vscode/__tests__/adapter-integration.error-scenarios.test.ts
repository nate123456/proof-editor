/**
 * Adapter Integration Error Scenarios Tests
 *
 * Tests cross-adapter interactions and integration failure modes:
 * - File system and UI adapter coordination failures
 * - Service layer integration with multiple adapters
 * - Cross-context dependencies and lifecycle issues
 * - Platform abstraction layer failures
 * - Error propagation across adapter boundaries
 * - Recovery coordination between adapters
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { StoredDocument } from '../../../application/ports/IFileSystemPort.js';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter.js';
import { VSCodeUIAdapter } from '../VSCodeUIAdapter.js';

// Mock VS Code module with cross-adapter error scenarios
vi.mock('vscode', () => ({
  Uri: {
    file: vi.fn().mockImplementation((path: string) => ({
      scheme: 'file',
      path,
      fsPath: path,
      toString: () => `file://${path}`,
    })),
    joinPath: vi.fn().mockImplementation((base, ...segments) => ({
      scheme: base.scheme,
      path: `${base.path}/${segments.join('/')}`,
      fsPath: `${base.fsPath}/${segments.join('/')}`,
      toString: () => `file://${base.fsPath}/${segments.join('/')}`,
    })),
    parse: vi.fn().mockImplementation((uri: string) => ({
      toString: () => uri,
      fsPath: uri.replace('file://', ''),
    })),
  },
  workspace: {
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
    },
    createFileSystemWatcher: vi.fn(),
    workspaceFolders: undefined,
  },
  window: {
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    withProgress: vi.fn(),
    setStatusBarMessage: vi.fn(),
    createWebviewPanel: vi.fn(),
    activeColorTheme: { kind: 1 },
    onDidChangeActiveColorTheme: vi.fn(),
  },
  FileType: {
    File: 1,
    Directory: 2,
  },
  RelativePattern: vi.fn(),
  ViewColumn: { One: 1, Two: 2, Three: 3 },
  ProgressLocation: { Notification: 1, Window: 2 },
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
  FileSystemError: class extends Error {
    public code: string;
    constructor(messageOrUri?: string) {
      super(typeof messageOrUri === 'string' ? messageOrUri : 'FileSystemError');
      this.name = 'FileSystemError';
      this.code = 'UNKNOWN';
    }
    static FileNotFound(messageOrUri?: string): any {
      const error = new (class extends vscode.FileSystemError {
        public override code = 'FileNotFound';
      })(messageOrUri);
      return error;
    }
    static NoPermissions(messageOrUri?: string): any {
      const error = new (class extends vscode.FileSystemError {
        public override code = 'NoPermissions';
      })(messageOrUri);
      return error;
    }
  },
}));

describe('Adapter Integration Error Scenarios', () => {
  let fileSystemAdapter: VSCodeFileSystemAdapter;
  let uiAdapter: VSCodeUIAdapter;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: vscode.Memento;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGlobalState = {
      get: vi.fn().mockReturnValue({}),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
    };

    mockContext = {
      globalState: mockGlobalState,
      subscriptions: [],
      extensionUri: { fsPath: '/test/extension' } as vscode.Uri,
      extensionPath: '/test/extension',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/logs',
      asAbsolutePath: vi.fn(),
      extensionMode: 1,
      secrets: {} as any,
      environmentVariableCollection: {} as any,
      workspaceState: {} as any,
    } as unknown as vscode.ExtensionContext;

    fileSystemAdapter = new VSCodeFileSystemAdapter(mockContext);
    uiAdapter = new VSCodeUIAdapter(mockContext);
  });

  describe('Shared Context Failures', () => {
    it('should handle shared context corruption affecting both adapters', async () => {
      // Corrupt the shared context
      mockGlobalState.update = vi.fn().mockRejectedValue(new Error('Context corrupted'));
      vi.mocked(vscode.window.showInputBox).mockRejectedValue(new Error('UI unavailable'));

      const testDoc: StoredDocument = {
        id: 'test-doc',
        content: 'content',
        version: 1,
        metadata: {
          id: 'test-doc',
          title: 'Test',
          modifiedAt: new Date(),
          size: 7,
        },
      };

      // Both operations should fail due to context corruption
      const fsResult = await fileSystemAdapter.storeDocument(testDoc);
      const uiResult = await uiAdapter.showInputBox({ prompt: 'Test' });

      expect(fsResult.isErr()).toBe(true);
      expect(uiResult.isErr()).toBe(true);
    });

    it('should handle context disposal affecting multiple adapters simultaneously', async () => {
      // Simulate context disposal before operations
      (mockContext as any).subscriptions = [];
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('Context disposed'));
      vi.mocked(vscode.window.showInformationMessage).mockRejectedValue(
        new Error('Context disposed'),
      );

      // Start operations on both adapters after context disposal
      const fsOperation = fileSystemAdapter.readFile('/test/file.txt');
      const uiOperation = uiAdapter.showConfirmation({
        title: 'Confirm',
        message: 'Continue?',
      });

      const [fsResult, uiResult] = await Promise.all([fsOperation, uiOperation]);

      expect(fsResult.isErr()).toBe(true);
      expect(uiResult.isErr()).toBe(true);
    });

    it('should handle extension deactivation during cross-adapter operations', async () => {
      // Simulate file save workflow with user confirmation
      vi.mocked(vscode.window.showInformationMessage).mockRejectedValue(
        new Error('Extension deactivated'),
      );
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('Extension deactivated'),
      );

      const confirmResult = await uiAdapter.showConfirmation({
        title: 'Save File',
        message: 'Save changes?',
      });

      const writeResult = await fileSystemAdapter.writeFile('/test/file.txt', 'content');

      expect(confirmResult.isErr()).toBe(true);
      expect(writeResult.isErr()).toBe(true);

      if (confirmResult.isErr() && writeResult.isErr()) {
        expect(confirmResult.error.message).toContain('Extension deactivated');
        expect(writeResult.error.message).toContain('Extension deactivated');
      }
    });

    it('should handle workspace folder changes affecting both adapters', () => {
      // Initial state - no workspace
      (vscode.workspace as any).workspaceFolders = undefined;

      // Both adapters should handle missing workspace
      const fsCapabilities = fileSystemAdapter.capabilities();
      const uiCapabilities = uiAdapter.capabilities();

      expect(fsCapabilities.canAccessArbitraryPaths).toBe(true);
      expect(uiCapabilities.supportsFileDialogs).toBe(true);

      // Workspace becomes available
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/new/workspace' } }];

      // Capabilities should remain consistent
      const newFsCapabilities = fileSystemAdapter.capabilities();
      const newUiCapabilities = uiAdapter.capabilities();

      expect(newFsCapabilities.canAccessArbitraryPaths).toBe(true);
      expect(newUiCapabilities.supportsFileDialogs).toBe(true);
    });
  });

  describe('Cross-Adapter Workflow Failures', () => {
    it('should handle file dialog + file operation failures', async () => {
      // File dialog fails
      vi.mocked(vscode.window.showOpenDialog).mockRejectedValue(new Error('Dialog failed to open'));

      const dialogResult = await uiAdapter.showOpenDialog({
        title: 'Open File',
        canSelectFiles: true,
      });

      expect(dialogResult.isErr()).toBe(true);

      // Even if dialog succeeded, file read might fail
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        vscode.FileSystemError.NoPermissions('Permission denied'),
      );

      const readResult = await fileSystemAdapter.readFile('/selected/file.txt');

      expect(readResult.isErr()).toBe(true);
      if (readResult.isErr()) {
        expect(readResult.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should handle progress tracking + file operations coordination', async () => {
      // Set up file operation that will fail
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(new Error('Disk full'));

      // Set up progress tracking
      vi.mocked(vscode.window.withProgress).mockImplementation(async (_options, task) => {
        const mockProgress = { report: vi.fn() };
        const mockToken = {
          isCancellationRequested: false,
          onCancellationRequested: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        };
        return task(mockProgress, mockToken);
      });

      const progressTask = async (progress: any) => {
        progress.report({ message: 'Saving file...', increment: 50 });
        const result = await fileSystemAdapter.writeFile('/test/file.txt', 'content');
        if (result.isErr()) {
          throw new Error(`Save failed: ${result.error.message}`);
        }
        return 'Success';
      };

      await expect(
        uiAdapter.showProgress({ title: 'Saving...', location: 'notification' }, progressTask),
      ).rejects.toThrow('Save failed: Disk full');
    });

    it('should handle user notification + file cleanup coordination', async () => {
      // File operation fails
      vi.mocked(vscode.workspace.fs.delete).mockRejectedValue(
        vscode.FileSystemError.NoPermissions('Cannot delete file'),
      );

      // UI notification also fails
      vi.mocked(vscode.window.showErrorMessage).mockImplementation(() => {
        throw new Error('Cannot show error message');
      });

      const deleteResult = await fileSystemAdapter.delete('/test/file.txt');

      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error.code).toBe('PERMISSION_DENIED');
      }

      // Attempting to show error notification fails
      expect(() => {
        uiAdapter.showError('Failed to delete file');
      }).toThrow('Cannot show error message');
    });

    it('should handle file watching + UI updates coordination failures', () => {
      // File watcher setup fails
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockImplementation(() => {
        throw new Error('Cannot create file watcher');
      });

      // UI status update fails
      vi.mocked(vscode.window.setStatusBarMessage).mockImplementation(() => {
        throw new Error('Status bar unavailable');
      });

      expect(() => {
        fileSystemAdapter.watch('/test/dir', () => {
          // Empty watcher callback for test
        });
      }).toThrow('Cannot create file watcher');

      expect(() => {
        uiAdapter.setStatusMessage('Watching files...');
      }).toThrow('Status bar unavailable');
    });
  });

  describe('Resource Competition and Conflicts', () => {
    it('should handle concurrent resource access by both adapters', async () => {
      let callCount = 0;

      // Simulate resource contention
      const resourceError = new Error('Resource busy');

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(resourceError);
        }
        return Promise.resolve();
      });

      vi.mocked(vscode.window.showSaveDialog).mockImplementation(() => {
        if (callCount > 0) {
          return Promise.reject(new Error('Dialog blocked by file operation'));
        }
        return Promise.resolve({ fsPath: '/test/save.txt' } as any);
      });

      // Try concurrent operations
      const results = await Promise.allSettled([
        fileSystemAdapter.writeFile('/test/file1.txt', 'content1'),
        fileSystemAdapter.writeFile('/test/file2.txt', 'content2'),
        uiAdapter.showSaveDialog({ title: 'Save As' }),
      ]);

      // Most operations should fail due to resource contention
      let errorCount = 0;
      results.forEach((result) => {
        if (
          result.status === 'rejected' ||
          (result.status === 'fulfilled' &&
            result.value &&
            'isErr' in result.value &&
            result.value.isErr())
        ) {
          errorCount++;
        }
      });

      expect(errorCount).toBeGreaterThan(0);
    });

    it('should handle memory pressure affecting both adapters', async () => {
      const memoryError = new Error('Out of memory');

      // Both adapters fail due to memory pressure
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(memoryError);
      vi.mocked(vscode.window.showQuickPick).mockRejectedValue(memoryError);

      const fsResult = await fileSystemAdapter.readFile('/large/file.txt');
      const uiResult = await uiAdapter.showQuickPick([
        { label: 'Option 1' },
        { label: 'Option 2' },
      ]);

      expect(fsResult.isErr()).toBe(true);
      expect(uiResult.isErr()).toBe(true);

      if (fsResult.isErr() && uiResult.isErr()) {
        expect(fsResult.error.message).toContain('Out of memory');
        expect(uiResult.error.message).toContain('Out of memory');
      }
    });

    it('should handle UI thread blocking affecting file operations', async () => {
      // UI operation blocks thread
      vi.mocked(vscode.window.showInputBox).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('result'), 5000); // Long blocking operation
        });
      });

      // File operation times out due to blocked thread
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), 1000);
        });
      });

      const [uiResult, fsResult] = await Promise.all([
        uiAdapter.showInputBox({ prompt: 'Enter value' }),
        fileSystemAdapter.readFile('/test/file.txt'),
      ]);

      expect(uiResult.isOk()).toBe(true);
      expect(fsResult.isErr()).toBe(true);

      if (fsResult.isErr()) {
        expect(fsResult.error.message).toContain('Operation timed out');
      }
    }, 10000); // 10 second timeout
  });

  describe('Error Propagation and Recovery', () => {
    it('should handle cascading failures across adapters', async () => {
      // Initial file system failure
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        vscode.FileSystemError.FileNotFound('Config file not found'),
      );

      // This triggers UI error display, which also fails
      vi.mocked(vscode.window.showErrorMessage).mockImplementation(() => {
        throw new Error('Cannot display error');
      });

      // Primary operation fails
      const readResult = await fileSystemAdapter.readFile('/config.json');
      expect(readResult.isErr()).toBe(true);

      // Error display also fails
      expect(() => {
        uiAdapter.showError('Configuration file not found');
      }).toThrow('Cannot display error');

      // Recovery attempt through alternative UI fails too
      vi.mocked(vscode.window.setStatusBarMessage).mockImplementation(() => {
        throw new Error('Status bar also unavailable');
      });

      expect(() => {
        uiAdapter.setStatusMessage('Using default configuration');
      }).toThrow('Status bar also unavailable');
    });

    it('should handle partial recovery scenarios', async () => {
      // File system operation fails
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(new Error('Write failed'));

      // But stored document fallback works
      mockGlobalState.update = vi.fn().mockResolvedValue(undefined);

      // And UI notification works
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(undefined);

      const testDoc: StoredDocument = {
        id: 'recovery-doc',
        content: 'content',
        version: 1,
        metadata: {
          id: 'recovery-doc',
          title: 'Recovery Document',
          modifiedAt: new Date(),
          size: 7,
        },
      };

      // Primary operation fails
      const writeResult = await fileSystemAdapter.writeFile('/test/file.txt', 'content');
      expect(writeResult.isErr()).toBe(true);

      // Fallback storage succeeds
      const storeResult = await fileSystemAdapter.storeDocument(testDoc);
      expect(storeResult.isOk()).toBe(true);

      // UI notification succeeds
      expect(() => {
        uiAdapter.showWarning('File saved to offline storage');
      }).not.toThrow();
    });

    it('should handle error recovery coordination between adapters', async () => {
      let recoveryAttempt = 0;

      // File operation fails initially
      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(() => {
        recoveryAttempt++;
        if (recoveryAttempt === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve(); // Recovery succeeds
      });

      // UI provides recovery feedback
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Retry' as any);

      // Initial attempt fails
      const firstResult = await fileSystemAdapter.writeFile('/test/file.txt', 'content');
      expect(firstResult.isErr()).toBe(true);

      // UI asks user to retry
      const userChoice = await uiAdapter.showConfirmation({
        title: 'Retry',
        message: 'Operation failed. Retry?',
        confirmLabel: 'Retry',
      });

      expect(userChoice.isOk()).toBe(true);
      if (userChoice.isOk() && userChoice.value) {
        // Retry succeeds
        const retryResult = await fileSystemAdapter.writeFile('/test/file.txt', 'content');
        expect(retryResult.isOk()).toBe(true);
      }
    });
  });

  describe('Platform Abstraction Layer Failures', () => {
    it('should handle VS Code API version incompatibilities affecting both adapters', async () => {
      // Simulate older VS Code version missing newer APIs
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        throw new Error('Method not available in this VS Code version');
      });

      vi.mocked(vscode.window.showOpenDialog).mockImplementation(() => {
        throw new Error('showOpenDialog requires VS Code 1.74+');
      });

      const fsResult = await fileSystemAdapter.readFile('/test/file.txt');
      const uiResult = await uiAdapter.showOpenDialog({ title: 'Open' });

      expect(fsResult.isErr()).toBe(true);
      expect(uiResult.isErr()).toBe(true);

      if (fsResult.isErr() && uiResult.isErr()) {
        expect(fsResult.error.message).toContain('not available in this VS Code version');
        expect(uiResult.error.message).toContain('requires VS Code 1.74+');
      }
    });

    it('should handle platform-specific limitations across adapters', async () => {
      // Simulate macOS sandbox restrictions
      vi.mocked(vscode.workspace.fs.createDirectory).mockRejectedValue(
        new Error('Sandbox prevents directory creation outside workspace'),
      );

      vi.mocked(vscode.window.showSaveDialog).mockRejectedValue(
        new Error('Sandbox restricts file dialog access'),
      );

      const fsResult = await fileSystemAdapter.createDirectory('/System/test');
      const uiResult = await uiAdapter.showSaveDialog({
        defaultUri: '/System/test/file.txt',
      });

      expect(fsResult.isErr()).toBe(true);
      expect(uiResult.isErr()).toBe(true);

      if (fsResult.isErr() && uiResult.isErr()) {
        expect(fsResult.error.message).toContain('Sandbox prevents');
        expect(uiResult.error.message).toContain('Sandbox restricts');
      }
    });

    it('should handle extension marketplace deployment issues', () => {
      // Simulate missing dependencies or corrupted installation by making key methods throw
      const originalWorkspace = vscode.workspace;
      const originalWindow = vscode.window;

      // Mock corrupted APIs
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        throw new Error('Extension corrupted - API unavailable');
      });
      vi.mocked(vscode.window.showErrorMessage).mockImplementation(() => {
        throw new Error('Extension corrupted - UI unavailable');
      });

      // Adapters should still construct successfully
      expect(() => {
        new VSCodeFileSystemAdapter(mockContext);
      }).not.toThrow(); // Should handle gracefully

      expect(() => {
        new VSCodeUIAdapter(mockContext);
      }).not.toThrow(); // Should handle gracefully

      // Restore original mocks
      (vscode as any).workspace = originalWorkspace;
      (vscode as any).window = originalWindow;
    });

    it('should handle corporate environment restrictions', async () => {
      // Simulate corporate firewall/proxy issues
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('Network operation blocked by corporate policy'),
      );

      vi.mocked(vscode.window.showErrorMessage).mockImplementation(() => {
        throw new Error('UI operations restricted by corporate policy');
      });

      const fsResult = await fileSystemAdapter.readFile('https://external.com/config.json');

      expect(fsResult.isErr()).toBe(true);
      if (fsResult.isErr()) {
        expect(fsResult.error.message).toContain('blocked by corporate policy');
      }

      expect(() => {
        uiAdapter.showError('Network access denied');
      }).toThrow('restricted by corporate policy');
    });
  });
});
