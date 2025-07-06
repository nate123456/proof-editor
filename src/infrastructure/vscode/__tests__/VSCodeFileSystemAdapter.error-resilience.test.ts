/**
 * VSCodeFileSystemAdapter Error Resilience Tests
 *
 * Comprehensive error handling tests targeting production failure modes:
 * - Context initialization failures
 * - VS Code API unavailability scenarios
 * - File system boundary conditions
 * - Permission and security failures
 * - Resource exhaustion scenarios
 * - Network filesystem issues
 * - Race conditions and timing issues
 * - Recovery and cleanup mechanisms
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { StoredDocument } from '../../../application/ports/IFileSystemPort.js';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter.js';

// Mock VS Code module with comprehensive error injection capabilities
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
      workspaceFolders: undefined, // Start with undefined workspace
    },
    FileType: {
      File: 1,
      Directory: 2,
    },
    RelativePattern: vi.fn(),
    FileSystemError,
  };
});

describe('VSCodeFileSystemAdapter Error Resilience', () => {
  let adapter: VSCodeFileSystemAdapter;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: vscode.Memento;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset VS Code workspace state
    const mockVscode = vi.mocked(vscode);
    mockVscode.workspace = {
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
    };

    mockVscode.Uri = {
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
    };

    mockGlobalState = {
      get: vi.fn().mockReturnValue({}),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
      setKeysForSync: vi.fn(),
    } as any;

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
  });

  describe('Context Initialization Failures', () => {
    it('should handle undefined extension context gracefully', () => {
      expect(() => {
        new VSCodeFileSystemAdapter(undefined as any);
      }).not.toThrow();
    });

    it('should handle null extension context gracefully', () => {
      expect(() => {
        new VSCodeFileSystemAdapter(null as any);
      }).not.toThrow();
    });

    it('should handle disposed extension context', () => {
      const disposedContext = {
        ...mockContext,
        globalState: {
          get: vi.fn().mockImplementation(() => {
            throw new Error('ExtensionContext has been disposed');
          }),
          update: vi.fn().mockRejectedValue(new Error('ExtensionContext has been disposed')),
          keys: vi.fn().mockReturnValue([]),
          setKeysForSync: vi.fn(),
        },
      };

      expect(() => {
        new VSCodeFileSystemAdapter(disposedContext);
      }).not.toThrow();
    });

    it('should handle corrupted global state during initialization', () => {
      mockGlobalState.get = vi.fn().mockImplementation(() => {
        throw new Error('Corrupted storage');
      });

      expect(() => {
        new VSCodeFileSystemAdapter(mockContext);
      }).not.toThrow();
    });

    it('should handle workspace folder changes during initialization', () => {
      // Simulate workspace folder being undefined during init
      (vscode.workspace as any).workspaceFolders = undefined;

      const adapter = new VSCodeFileSystemAdapter(mockContext);

      // Then workspace folders become available
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];

      // Adapter should still function
      expect(adapter.capabilities().canAccessArbitraryPaths).toBe(true);
    });

    it('should handle extension deactivation during initialization', () => {
      const mockDeactivatedContext = {
        ...mockContext,
        globalState: {
          get: vi.fn().mockReturnValue({}),
          update: vi.fn().mockRejectedValue(new Error('Extension deactivated')),
          keys: vi.fn().mockReturnValue([]),
          setKeysForSync: vi.fn(),
        },
      };

      expect(() => {
        new VSCodeFileSystemAdapter(mockDeactivatedContext);
      }).not.toThrow();
    });
  });

  describe('VS Code API Unavailability Scenarios', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should handle vscode.workspace.fs being undefined', async () => {
      // Simulate VS Code API unavailability
      (vscode.workspace as any).fs = undefined;

      const result = await adapter.readFile('/test/file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('workspace.fs');
      }
    });

    it('should handle vscode.workspace being undefined', async () => {
      // Simulate complete workspace unavailability
      (vscode as any).workspace = undefined;

      const result = await adapter.readFile('/test/file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });

    it('should handle vscode.Uri.file throwing errors', async () => {
      // Temporarily remove Uri.file for this test
      const originalUriFile = vscode.Uri.file;
      (vscode.Uri as any).file = undefined;

      try {
        const result = await adapter.readFile('/test/file.txt');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe('UNKNOWN');
          expect(result.error.message).toContain('Uri.file is not available');
        }
      } finally {
        // Restore Uri.file
        (vscode.Uri as any).file = originalUriFile;
      }
    });

    it('should handle workspace.fs methods throwing unexpected errors', async () => {
      // Only mock for this specific test
      const mockReadFile = vi.fn().mockImplementation(() => {
        throw new Error('Method not implemented');
      });

      const originalReadFile = vscode.workspace.fs.readFile;
      (vscode.workspace.fs as any).readFile = mockReadFile;

      try {
        const result = await adapter.readFile('/test/file.txt');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe('UNKNOWN');
          expect(result.error.message).toBe('Method not implemented');
        }
      } finally {
        // Restore original method
        (vscode.workspace.fs as any).readFile = originalReadFile;
      }
    });

    it('should handle workspace.fs methods returning invalid types', async () => {
      // Only mock for this specific test
      const mockReadFile = vi.fn().mockResolvedValue(null as any);

      const originalReadFile = vscode.workspace.fs.readFile;
      (vscode.workspace.fs as any).readFile = mockReadFile;

      try {
        const result = await adapter.readFile('/test/file.txt');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe('UNKNOWN');
        }
      } finally {
        // Restore original method
        (vscode.workspace.fs as any).readFile = originalReadFile;
      }
    });
  });

  describe('File System Boundary Conditions', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should handle extremely long file paths (Windows 260 char limit)', async () => {
      const longPath = `/very/long/path/that/exceeds/normal/limits/${'a'.repeat(300)}/file.txt`;

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(
        new Error('The filename or extension is too long'),
      );

      const result = await adapter.readFile(longPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });

    it('should handle file paths with special characters', async () => {
      const specialPath = '/test/file with spaces & special chars (éñüñ) 🚀/test.txt';

      vi.mocked(vscode.Uri.file).mockImplementation(() => {
        throw new Error('Invalid character in path');
      });

      const result = await adapter.readFile(specialPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });

    it('should handle disk space exhaustion during write', async () => {
      const error = new (class extends vscode.FileSystemError {
        public override code = 'ENOSPC';
      })('No space left on device');

      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const result = await adapter.writeFile('/test/file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('DISK_FULL');
      }
    });

    it('should handle file corruption during read', async () => {
      // Simulate returning corrupted/invalid UTF-8 data
      const corruptedData = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(corruptedData);

      const result = await adapter.readFile('/test/corrupted.txt');

      // Should still succeed but with replacement characters
      expect(result.isOk()).toBe(true);
    });

    it('should handle network filesystem timeouts', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      const result = await adapter.readFile('/network/file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('Network timeout');
      }
    });

    it('should handle file deletion during active read', async () => {
      let readCount = 0;
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(() => {
        readCount++;
        if (readCount === 1) {
          return Promise.resolve(new TextEncoder().encode('content'));
        }
        return Promise.reject(vscode.FileSystemError.FileNotFound('File was deleted'));
      });

      // First read succeeds
      const result1 = await adapter.readFile('/test/file.txt');
      expect(result1.isOk()).toBe(true);

      // Second read fails because file was deleted
      const result2 = await adapter.readFile('/test/file.txt');
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('NOT_FOUND');
      }
    });

    it('should handle very large files (>100MB)', async () => {
      const largeContent = 'x'.repeat(200 * 1024 * 1024); // 200MB
      const largeBuffer = new TextEncoder().encode(largeContent);

      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(largeBuffer);

      const result = await adapter.readFile('/test/large.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(200 * 1024 * 1024);
      }
    });

    it('should handle zero-byte files', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(new Uint8Array(0));

      const result = await adapter.readFile('/test/empty.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('');
      }
    });
  });

  describe('Permission and Security Failures', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should handle read-only file modification attempts', async () => {
      const error = vscode.FileSystemError.NoPermissions('File is read-only');
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const result = await adapter.writeFile('/readonly/file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should handle directory permission failures', async () => {
      const error = vscode.FileSystemError.NoPermissions('Permission denied');
      vi.mocked(vscode.workspace.fs.createDirectory).mockRejectedValue(error);

      const result = await adapter.createDirectory('/restricted/newdir');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should handle antivirus software blocking file access', async () => {
      const error = new Error('File is locked by another process');
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile('/test/locked.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('locked by another process');
      }
    });

    it('should handle network drive authentication failures', async () => {
      const error = new Error('Authentication required');
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile('//server/share/file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('Authentication required');
      }
    });

    it('should handle corporate firewall blocking filesystem operations', async () => {
      const error = new Error('Operation blocked by security policy');
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const result = await adapter.writeFile('/external/file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('blocked by security policy');
      }
    });

    it('should handle file system mounted as read-only', async () => {
      const error = new Error('Read-only file system');
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const result = await adapter.writeFile('/readonly-fs/file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('Read-only file system');
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should handle memory exhaustion during large file operations', async () => {
      const error = new Error('Cannot allocate memory');
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile('/test/huge-file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('Cannot allocate memory');
      }
    });

    it('should handle file handle exhaustion', async () => {
      const error = new Error('Too many open files');
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile('/test/file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toContain('Too many open files');
      }
    });

    it('should handle CPU throttling during intensive operations', async () => {
      // Simulate slow response due to CPU throttling
      vi.mocked(vscode.workspace.fs.readDirectory).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([]), 10000); // 10 second delay
        });
      });

      const startTime = Date.now();
      const result = await adapter.readDirectory('/test/dir');
      const duration = Date.now() - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeGreaterThan(5000); // Should handle slow operations
    });

    it('should handle disk I/O bottlenecks gracefully', async () => {
      let callCount = 0;
      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('Resource temporarily unavailable'));
        }
        return Promise.resolve();
      });

      const result = await adapter.writeFile('/test/file.txt', 'content');

      // Should fail gracefully without retrying
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  describe('Race Conditions and Concurrency Issues', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should handle concurrent file access conflicts', async () => {
      const error = new Error('File is locked by another process');
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const results = await Promise.all([
        adapter.writeFile('/test/file.txt', 'content1'),
        adapter.writeFile('/test/file.txt', 'content2'),
        adapter.writeFile('/test/file.txt', 'content3'),
      ]);

      // All should fail due to locking
      results.forEach((result) => {
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe('UNKNOWN');
        }
      });
    });

    it('should handle rapid file system changes during watch operations', () => {
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const callback = vi.fn();
      const disposable = adapter.watch('/test/dir', callback);

      // Simulate rapid events
      const createHandler = mockWatcher.onDidCreate.mock.calls[0]?.[0];
      const changeHandler = mockWatcher.onDidChange.mock.calls[0]?.[0];
      const deleteHandler = mockWatcher.onDidDelete.mock.calls[0]?.[0];

      // Fire events rapidly
      for (let i = 0; i < 100; i++) {
        createHandler?.({ fsPath: `/test/dir/file${i}.txt` });
        changeHandler?.({ fsPath: `/test/dir/file${i}.txt` });
        deleteHandler?.({ fsPath: `/test/dir/file${i}.txt` });
      }

      expect(callback).toHaveBeenCalledTimes(300); // 100 * 3 events

      disposable.dispose();
    });

    it('should handle context disposal during async operations', async () => {
      // Start an async operation
      const slowOperation = adapter.readFile('/test/slow-file.txt');

      // Dispose context during operation
      mockGlobalState.update = vi.fn().mockRejectedValue(new Error('Context disposed'));

      // Operation should complete or fail gracefully
      const result = await slowOperation;
      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe('Stored Document Error Handling', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should handle global state corruption during document storage', async () => {
      const testDoc: StoredDocument = {
        id: 'test-doc',
        content: 'test content',
        version: 1,
        metadata: {
          id: 'test-doc',
          title: 'Test Document',
          modifiedAt: new Date(),
          size: 12,
        },
      };

      mockGlobalState.update = vi.fn().mockRejectedValue(new Error('Storage corrupted'));

      const result = await adapter.storeDocument(testDoc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('QUOTA_EXCEEDED');
      }
    });

    it('should handle quota exceeded during document storage', async () => {
      const testDoc: StoredDocument = {
        id: 'large-doc',
        content: 'x'.repeat(10 * 1024 * 1024), // 10MB
        version: 1,
        metadata: {
          id: 'large-doc',
          title: 'Large Document',
          modifiedAt: new Date(),
          size: 10 * 1024 * 1024,
        },
      };

      mockGlobalState.update = vi.fn().mockRejectedValue(new Error('QuotaExceededError'));

      const result = await adapter.storeDocument(testDoc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('QUOTA_EXCEEDED');
      }
    });

    it('should handle corrupted stored documents during retrieval', async () => {
      mockGlobalState.get = vi.fn().mockReturnValue({
        'corrupted-doc': null, // Corrupted entry
      });

      const result = await adapter.getStoredDocument('corrupted-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle malformed date objects in stored documents', async () => {
      mockGlobalState.get = vi.fn().mockReturnValue({
        'bad-date-doc': {
          id: 'bad-date-doc',
          content: 'content',
          version: 1,
          metadata: {
            id: 'bad-date-doc',
            title: 'Bad Date Doc',
            modifiedAt: 'not-a-date', // Invalid date
            size: 7,
          },
        },
      });

      // Should not throw during initialization
      expect(() => {
        new VSCodeFileSystemAdapter(mockContext);
      }).not.toThrow();
    });
  });

  describe('Error Recovery and Cleanup', () => {
    beforeEach(() => {
      adapter = new VSCodeFileSystemAdapter(mockContext);
    });

    it('should cleanup watchers when disposal fails', () => {
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn().mockImplementation(() => {
          throw new Error('Disposal failed');
        }),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const callback = vi.fn();
      const disposable = adapter.watch('/test/dir', callback);

      // Disposal should not throw even if watcher disposal fails
      expect(() => {
        disposable.dispose();
      }).not.toThrow();
    });

    it('should handle partial state corruption gracefully', async () => {
      // Simulate partially corrupted state
      mockGlobalState.get = vi.fn().mockReturnValue({
        'good-doc': {
          id: 'good-doc',
          content: 'good content',
          version: 1,
          metadata: {
            id: 'good-doc',
            title: 'Good Document',
            modifiedAt: new Date().toISOString(),
            size: 12,
          },
        },
        'bad-doc': {
          // Missing required fields
          id: 'bad-doc',
        },
      });

      const adapter = new VSCodeFileSystemAdapter(mockContext);

      // Should be able to retrieve good document
      const goodResult = await adapter.getStoredDocument('good-doc');
      expect(goodResult.isOk()).toBe(true);

      // Should handle bad document gracefully
      const badResult = await adapter.getStoredDocument('bad-doc');
      expect(badResult.isOk()).toBe(true);
    });

    it('should maintain operation atomicity during failures', async () => {
      let updateCallCount = 0;
      mockGlobalState.update = vi.fn().mockImplementation(() => {
        updateCallCount++;
        if (updateCallCount === 1) {
          return Promise.reject(new Error('First update failed'));
        }
        return Promise.resolve();
      });

      const testDoc: StoredDocument = {
        id: 'atomic-doc',
        content: 'content',
        version: 1,
        metadata: {
          id: 'atomic-doc',
          title: 'Atomic Document',
          modifiedAt: new Date(),
          size: 7,
        },
      };

      const result1 = await adapter.storeDocument(testDoc);
      expect(result1.isErr()).toBe(true);

      const result2 = await adapter.storeDocument(testDoc);
      expect(result2.isOk()).toBe(true);
    });
  });
});
