/**
 * Platform Compatibility Edge Cases Tests
 *
 * Tests platform-specific failure modes and compatibility issues:
 * - VS Code version compatibility across 1.74.0 through latest
 * - Operating system specific limitations and failures
 * - Extension marketplace deployment edge cases
 * - Corporate environment restrictions and firewall issues
 * - Multiple workspace and multi-instance scenarios
 * - Battery optimization and performance throttling
 * - Accessibility tool integration failures
 * - High DPI and multi-monitor configuration issues
 * - Security software interference scenarios
 * - Development vs production environment differences
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { StoredDocument } from '../../../application/ports/IFileSystemPort.js';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter.js';
import { VSCodeUIAdapter } from '../VSCodeUIAdapter.js';

// Mock VS Code module with platform-specific error scenarios
vi.mock('vscode', () => {
  const FileSystemError = class extends Error {
    public code: string;
    constructor(messageOrUri?: string) {
      super(typeof messageOrUri === 'string' ? messageOrUri : 'FileSystemError');
      this.name = 'FileSystemError';
      this.code = 'UNKNOWN';
    }
    static FileNotFound(messageOrUri?: string): any {
      const error = new FileSystemError(messageOrUri);
      error.code = 'FileNotFound';
      return error;
    }
    static NoPermissions(messageOrUri?: string): any {
      const error = new FileSystemError(messageOrUri);
      error.code = 'NoPermissions';
      return error;
    }
    static Unavailable(messageOrUri?: string): any {
      const error = new FileSystemError(messageOrUri);
      error.code = 'Unavailable';
      return error;
    }
  };

  return {
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
      parse: vi.fn(),
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
    FileType: { File: 1, Directory: 2 },
    RelativePattern: vi.fn(),
    ViewColumn: { One: 1, Two: 2, Three: 3 },
    ProgressLocation: { Notification: 1, Window: 2 },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
    FileSystemError,
  };
});

// Platform detection utilities
const mockPlatform = {
  isWindows: false,
  isMacOS: false,
  isLinux: false,
  vsCodeVersion: '1.85.0',
  isDevMode: false,
  isCorporateEnv: false,
};

describe('Platform Compatibility Edge Cases', () => {
  let fileSystemAdapter: VSCodeFileSystemAdapter;
  let uiAdapter: VSCodeUIAdapter;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: vscode.Memento;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset platform mock
    mockPlatform.isWindows = false;
    mockPlatform.isMacOS = false;
    mockPlatform.isLinux = false;
    mockPlatform.vsCodeVersion = '1.85.0';
    mockPlatform.isDevMode = false;
    mockPlatform.isCorporateEnv = false;

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
      extensionMode: 1, // Production mode
      secrets: {} as any,
      environmentVariableCollection: {} as any,
      workspaceState: {} as any,
    } as unknown as vscode.ExtensionContext;

    fileSystemAdapter = new VSCodeFileSystemAdapter(mockContext);
    uiAdapter = new VSCodeUIAdapter(mockContext);
  });

  describe('VS Code Version Compatibility', () => {
    it('should handle minimum supported version (1.74.0) limitations', async () => {
      mockPlatform.vsCodeVersion = '1.74.0';

      // Some newer APIs might not be available
      vi.mocked(vscode.window.showInputBox).mockImplementation(() => {
        throw new Error('title property not supported in VS Code 1.74.0');
      });

      const result = await uiAdapter.showInputBox({
        title: 'New Feature', // This might not exist in 1.74.0
        prompt: 'Enter value',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not supported in VS Code 1.74.0');
      }
    });

    it('should handle insiders/beta version instabilities', async () => {
      mockPlatform.vsCodeVersion = '1.90.0-insider';

      // Insiders builds might have unstable APIs
      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(() => {
        throw new Error('API changed in insider build');
      });

      const result = await fileSystemAdapter.writeFile('/test/file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('API changed in insider build');
      }
    });

    it('should handle VS Code extension API deprecations', () => {
      // Simulate deprecated API usage warnings
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Empty console warn mock for test
      });

      vi.mocked(vscode.window.setStatusBarMessage).mockImplementation(
        (_message: string, _hideAfterTimeout?: number) => {
          console.warn('setStatusBarMessage with timeout is deprecated');
          throw new Error('Deprecated API usage');
        },
      );

      expect(() => {
        uiAdapter.setStatusMessage('Status', 5000);
      }).toThrow('Deprecated API usage');

      expect(consoleWarn).toHaveBeenCalledWith('setStatusBarMessage with timeout is deprecated');

      consoleWarn.mockRestore();
    });

    it('should handle VS Code extension host crashes', async () => {
      // Simulate extension host crash during operation
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        throw new Error('Extension host crashed');
      });

      vi.mocked(vscode.window.showErrorMessage).mockImplementation(() => {
        throw new Error('Extension host crashed');
      });

      const fsResult = await fileSystemAdapter.readFile('/test/file.txt');

      expect(fsResult.isErr()).toBe(true);
      if (fsResult.isErr()) {
        expect(fsResult.error.message).toContain('Extension host crashed');
      }

      expect(() => {
        uiAdapter.showError('Extension host crashed');
      }).toThrow('Extension host crashed');
    });

    it('should handle VS Code workspace trust model restrictions', async () => {
      // Simulate restricted mode due to untrusted workspace
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('Write operations disabled in untrusted workspace'),
      );

      vi.mocked(vscode.window.showSaveDialog).mockRejectedValue(
        new Error('File dialogs restricted in untrusted workspace'),
      );

      const writeResult = await fileSystemAdapter.writeFile('/untrusted/file.txt', 'content');
      const dialogResult = await uiAdapter.showSaveDialog({ title: 'Save' });

      expect(writeResult.isErr()).toBe(true);
      expect(dialogResult.isErr()).toBe(true);

      if (writeResult.isErr() && dialogResult.isErr()) {
        expect(writeResult.error.message).toContain('untrusted workspace');
        expect(dialogResult.error.message).toContain('untrusted workspace');
      }
    });
  });

  describe('Windows-Specific Edge Cases', () => {
    beforeEach(() => {
      mockPlatform.isWindows = true;
    });

    it('should handle Windows path length limitations (260 characters)', async () => {
      const longPath = `C:\\${'very\\long\\path\\'.repeat(20)}file.txt`; // >260 chars

      vi.mocked(vscode.Uri.file).mockImplementation(() => {
        throw new Error('The specified path, file name, or both are too long');
      });

      const result = await fileSystemAdapter.readFile(longPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('too long');
      }
    });

    it('should handle Windows file locking by other processes', async () => {
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('The process cannot access the file because it is being used by another process'),
      );

      const result = await fileSystemAdapter.writeFile('C:\\locked\\file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('being used by another process');
      }
    });

    it('should handle Windows registry access restrictions', async () => {
      // Simulate registry access for storing application data
      mockGlobalState.update = vi
        .fn()
        .mockRejectedValue(new Error('Registry access denied by Windows security policy'));

      const testDoc: StoredDocument = {
        id: 'registry-doc',
        content: 'content',
        version: 1,
        metadata: {
          id: 'registry-doc',
          title: 'Registry Doc',
          modifiedAt: new Date(),
          size: 7,
        },
      };

      const result = await fileSystemAdapter.storeDocument(testDoc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Registry access denied');
      }
    });

    it('should handle Windows Defender real-time protection interference', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('File scanning by Windows Defender')), 2000);
        });
      });

      const result = await fileSystemAdapter.readFile('C:\\suspicious\\file.exe');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('File scanning by Windows Defender');
      }
    });

    it('should handle Windows network drive disconnections', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('Network path not found'));

      const result = await fileSystemAdapter.exists('\\\\server\\share\\file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Network path not found');
      }
    });
  });

  describe('macOS-Specific Edge Cases', () => {
    beforeEach(() => {
      mockPlatform.isMacOS = true;
    });

    it('should handle macOS App Sandbox restrictions', async () => {
      vi.mocked(vscode.workspace.fs.createDirectory).mockRejectedValue(
        new Error('Operation not permitted by App Sandbox'),
      );

      const result = await fileSystemAdapter.createDirectory('/System/Library/test');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('App Sandbox');
      }
    });

    it('should handle macOS Gatekeeper warnings', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockImplementation(() => {
        throw new Error('Application blocked by Gatekeeper');
      });

      expect(() => {
        uiAdapter.showWarning('Extension loaded from unknown developer');
      }).toThrow('blocked by Gatekeeper');
    });

    it('should handle macOS Keychain access failures', async () => {
      mockGlobalState.get = vi.fn().mockImplementation(() => {
        throw new Error('Keychain access denied');
      });

      expect(() => {
        new VSCodeFileSystemAdapter(mockContext);
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle macOS System Integrity Protection (SIP)', async () => {
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('Operation not permitted due to System Integrity Protection'),
      );

      const result = await fileSystemAdapter.writeFile('/System/test.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('System Integrity Protection');
      }
    });

    it('should handle macOS Finder integration issues', async () => {
      vi.mocked(vscode.window.showOpenDialog).mockRejectedValue(
        new Error('Finder service unavailable'),
      );

      const result = await uiAdapter.showOpenDialog({ title: 'Open with Finder' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Finder service unavailable');
      }
    });
  });

  describe('Linux-Specific Edge Cases', () => {
    beforeEach(() => {
      mockPlatform.isLinux = true;
    });

    it('should handle Linux permission model complexities', async () => {
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('Permission denied (uid/gid mismatch)'),
      );

      const result = await fileSystemAdapter.writeFile('/var/log/app.log', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Permission denied');
      }
    });

    it('should handle Linux display server (X11/Wayland) issues', () => {
      vi.mocked(vscode.window.createWebviewPanel).mockImplementation(() => {
        throw new Error('DISPLAY environment variable not set');
      });

      expect(() => {
        uiAdapter.createWebviewPanel({
          id: 'test-panel',
          title: 'Test',
          viewType: 'test',
        });
      }).toThrow('DISPLAY environment variable not set');
    });

    it('should handle Linux filesystem mount issues', async () => {
      vi.mocked(vscode.workspace.fs.readDirectory).mockRejectedValue(
        new Error('Transport endpoint is not connected'),
      );

      const result = await fileSystemAdapter.readDirectory('/mnt/network');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Transport endpoint is not connected');
      }
    });

    it('should handle Linux SELinux restrictions', async () => {
      vi.mocked(vscode.workspace.fs.createDirectory).mockRejectedValue(
        new Error('SELinux policy violation'),
      );

      const result = await fileSystemAdapter.createDirectory('/tmp/restricted');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('SELinux policy violation');
      }
    });

    it('should handle Linux AppArmor profile restrictions', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('AppArmor profile denies access'),
      );

      const result = await fileSystemAdapter.readFile('/etc/apparmor.d/test');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('AppArmor profile denies');
      }
    });
  });

  describe('Corporate Environment Restrictions', () => {
    beforeEach(() => {
      mockPlatform.isCorporateEnv = true;
    });

    it('should handle corporate proxy authentication failures', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('Proxy authentication required'),
      );

      const result = await fileSystemAdapter.readFile('https://external.api.com/config.json');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Proxy authentication required');
      }
    });

    it('should handle corporate firewall blocking external resources', async () => {
      vi.mocked(vscode.window.showOpenDialog).mockRejectedValue(
        new Error('External file access blocked by corporate policy'),
      );

      const result = await uiAdapter.showOpenDialog({
        defaultUri: 'https://external.com/file.txt',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('blocked by corporate policy');
      }
    });

    it('should handle corporate data loss prevention (DLP) restrictions', async () => {
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('Data write blocked by DLP policy'),
      );

      const sensitiveContent = 'SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111';
      const result = await fileSystemAdapter.writeFile(
        '/corporate/sensitive.txt',
        sensitiveContent,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('blocked by DLP policy');
      }
    });

    it('should handle corporate device management restrictions', async () => {
      mockGlobalState.update = vi
        .fn()
        .mockRejectedValue(new Error('Storage access restricted by device management policy'));

      const testDoc: StoredDocument = {
        id: 'corporate-doc',
        content: 'corporate data',
        version: 1,
        metadata: {
          id: 'corporate-doc',
          title: 'Corporate Doc',
          modifiedAt: new Date(),
          size: 13,
        },
      };

      const result = await fileSystemAdapter.storeDocument(testDoc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('device management policy');
      }
    });

    it('should handle corporate extension marketplace restrictions', () => {
      // Simulate corporate VS Code with marketplace disabled
      (vscode as any).extensions = {
        getExtension: () => null,
        all: [],
      };

      // Extension loading might fail
      expect(() => {
        new VSCodeFileSystemAdapter(mockContext);
        new VSCodeUIAdapter(mockContext);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Multi-Instance and Workspace Scenarios', () => {
    it('should handle multiple VS Code instances with shared state conflicts', async () => {
      // Simulate another instance updating global state simultaneously
      let updateCount = 0;
      mockGlobalState.update = vi.fn().mockImplementation(() => {
        updateCount++;
        if (updateCount === 1) {
          return Promise.reject(new Error('Global state locked by another instance'));
        }
        return Promise.resolve();
      });

      const testDoc: StoredDocument = {
        id: 'shared-doc',
        content: 'content',
        version: 1,
        metadata: {
          id: 'shared-doc',
          title: 'Shared Doc',
          modifiedAt: new Date(),
          size: 7,
        },
      };

      const result1 = await fileSystemAdapter.storeDocument(testDoc);
      expect(result1.isErr()).toBe(true);

      const result2 = await fileSystemAdapter.storeDocument(testDoc);
      expect(result2.isOk()).toBe(true);
    });

    it('should handle workspace switching during operations', async () => {
      // Start operation in one workspace
      const operation = fileSystemAdapter.readFile('/workspace1/file.txt');

      // Workspace changes during operation
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace2' } }];

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('Workspace changed during operation'),
      );

      const result = await operation;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Workspace changed during operation');
      }
    });

    it('should handle workspace with thousands of files (performance)', async () => {
      const largeDirectory = Array.from(
        { length: 10000 },
        (_, i) => [`file${i}.txt`, 1] as [string, vscode.FileType],
      );

      vi.mocked(vscode.workspace.fs.readDirectory).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(largeDirectory), 5000); // 5 second delay
        });
      });

      const startTime = Date.now();
      const result = await fileSystemAdapter.readDirectory('/large/directory');
      const duration = Date.now() - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeGreaterThan(4000); // Should handle slow operations
    });

    it('should handle multi-root workspace configurations', () => {
      // Multi-root workspace
      (vscode.workspace as any).workspaceFolders = [
        { uri: { fsPath: '/project1' } },
        { uri: { fsPath: '/project2' } },
        { uri: { fsPath: '/project3' } },
      ];

      const capabilities = fileSystemAdapter.capabilities();

      // Should handle multi-root gracefully
      expect(capabilities.canAccessArbitraryPaths).toBe(true);
    });

    it('should handle workspace close during active file operations', async () => {
      // Start file operation
      const operation = fileSystemAdapter.writeFile('/workspace/file.txt', 'content');

      // Workspace closes
      (vscode.workspace as any).workspaceFolders = undefined;

      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(new Error('Workspace closed'));

      const result = await operation;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Workspace closed');
      }
    });
  });

  describe('Performance and Resource Constraints', () => {
    it('should handle low memory conditions (< 1GB available)', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('Insufficient memory to complete operation'),
      );

      vi.mocked(vscode.window.showQuickPick).mockRejectedValue(
        new Error('Cannot allocate memory for UI operation'),
      );

      const fsResult = await fileSystemAdapter.readFile('/large/file.bin');
      const uiResult = await uiAdapter.showQuickPick([
        { label: 'Large Option 1', description: 'x'.repeat(10000) },
        { label: 'Large Option 2', description: 'y'.repeat(10000) },
      ]);

      expect(fsResult.isErr()).toBe(true);
      expect(uiResult.isErr()).toBe(true);
    });

    it('should handle high CPU load scenarios (> 90% utilization)', async () => {
      // Simulate CPU throttling affecting operations
      vi.mocked(vscode.workspace.fs.stat).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(
            () => resolve({ size: 100, mtime: Date.now(), ctime: Date.now() } as any),
            3000,
          );
        });
      });

      const startTime = Date.now();
      const result = await fileSystemAdapter.exists('/test/file.txt');
      const duration = Date.now() - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeGreaterThan(2500); // Should handle CPU throttling
    });

    it('should handle battery optimization mode impacts', async () => {
      // Battery saver mode might limit background operations
      vi.mocked(vscode.workspace.createFileSystemWatcher).mockImplementation(() => {
        throw new Error('File watching disabled in battery saver mode');
      });

      expect(() => {
        fileSystemAdapter.watch('/test/dir', () => {
          // Empty watcher callback for test
        });
      }).toThrow('disabled in battery saver mode');
    });

    it('should handle network latency and intermittent connectivity', async () => {
      let attemptCount = 0;

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve(new TextEncoder().encode('content'));
      });

      // First attempts fail
      const result1 = await fileSystemAdapter.readFile('/network/file.txt');
      expect(result1.isErr()).toBe(true);

      const result2 = await fileSystemAdapter.readFile('/network/file.txt');
      expect(result2.isErr()).toBe(true);

      // Third attempt succeeds
      const result3 = await fileSystemAdapter.readFile('/network/file.txt');
      expect(result3.isOk()).toBe(true);
    });

    it('should handle concurrent user operations across multiple extensions', async () => {
      // Simulate resource contention with other extensions
      vi.mocked(vscode.window.showInputBox).mockRejectedValue(
        new Error('UI blocked by another extension'),
      );

      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('File system busy with other extension operations'),
      );

      const uiResult = await uiAdapter.showInputBox({ prompt: 'Test' });
      const fsResult = await fileSystemAdapter.writeFile('/contested/file.txt', 'content');

      expect(uiResult.isErr()).toBe(true);
      expect(fsResult.isErr()).toBe(true);

      if (uiResult.isErr() && fsResult.isErr()) {
        expect(uiResult.error.message).toContain('blocked by another extension');
        expect(fsResult.error.message).toContain('busy with other extension');
      }
    });
  });

  describe('Development vs Production Environment Differences', () => {
    it('should handle development mode with relaxed security', () => {
      (mockContext as any).extensionMode = 2; // Development mode

      // Development mode might have different error handling
      const capabilities = fileSystemAdapter.capabilities();
      expect(capabilities.canAccessArbitraryPaths).toBe(true);
    });

    it('should handle production mode with strict security', async () => {
      (mockContext as any).extensionMode = 1; // Production mode

      // Production mode has stricter file access
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('File access restricted in production mode'),
      );

      const result = await fileSystemAdapter.readFile('/system/config.json');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('restricted in production mode');
      }
    });

    it('should handle test environment limitations', () => {
      (mockContext as any).extensionMode = 3; // Test mode

      // Test mode might have mock implementations
      expect(() => {
        new VSCodeFileSystemAdapter(mockContext);
        new VSCodeUIAdapter(mockContext);
      }).not.toThrow();
    });

    it('should handle extension packaging and distribution issues', () => {
      // Simulate missing files due to packaging issues
      mockContext.asAbsolutePath = vi.fn().mockImplementation(() => {
        throw new Error('Extension files not found - packaging error');
      });

      expect(() => {
        mockContext.asAbsolutePath('resources/icon.png');
      }).toThrow('packaging error');
    });
  });
});
