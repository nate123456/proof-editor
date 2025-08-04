/**
 * Comprehensive tests for VSCodeFileSystemAdapter
 *
 * Tests cover:
 * - File system operations (read, write, exists, delete, createDirectory)
 * - Directory operations (readDirectory)
 * - File watching with proper event handling
 * - Stored document management (offline storage)
 * - Error handling and VS Code API integration
 * - Result pattern compliance with neverthrow
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { StoredDocument } from '../../../application/ports/IFileSystemPort.js';
import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  FileSize,
  Timestamp,
  Title,
} from '../../../domain/shared/value-objects/index.js';
import {
  createTestDocumentContent,
  createTestDocumentId,
  createTestDocumentVersion,
  createTestFilePath,
  createTestFileSize,
  createTestTimestamp,
  createTestTitle,
} from '../../__tests__/test-helpers.js';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter.js';

// Mock VS Code module
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
  },
  FileType: {
    File: 1,
    Directory: 2,
  },
  RelativePattern: vi.fn().mockImplementation((base, pattern) => ({
    base,
    pattern,
  })),
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
    static Unavailable(messageOrUri?: string): any {
      const error = new (class extends vscode.FileSystemError {
        public override code = 'Unavailable';
      })(messageOrUri);
      return error;
    }
  },
}));

describe('VSCodeFileSystemAdapter', () => {
  let adapter: VSCodeFileSystemAdapter;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: vscode.Memento;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock global state
    mockGlobalState = {
      get: vi.fn().mockReturnValue({}),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
    };

    // Create mock extension context
    mockContext = {
      globalState: mockGlobalState,
    } as any;

    adapter = new VSCodeFileSystemAdapter(mockContext);
  });

  describe('constructor and initialization', () => {
    it('should initialize with empty stored documents', () => {
      expect(mockGlobalState.get).toHaveBeenCalledWith('proof-editor.offline-documents', {});
    });

    it('should load existing stored documents from global state', () => {
      const existingDocs = {
        doc1: {
          id: createTestDocumentId('doc1'),
          content: createTestDocumentContent('test content'),
          version: createTestDocumentVersion(1),
          metadata: {
            id: createTestDocumentId('doc1'),
            title: createTestTitle('Test Document'),
            modifiedAt: createTestTimestamp(new Date('2023-01-01T00:00:00.000Z')),
            size: createTestFileSize(12),
          },
        },
      };

      mockGlobalState.get = vi.fn().mockReturnValue(existingDocs);

      const _newAdapter = new VSCodeFileSystemAdapter(mockContext);

      expect(mockGlobalState.get).toHaveBeenCalledWith('proof-editor.offline-documents', {});
    });
  });

  describe('readFile', () => {
    it('should successfully read file content', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test file content';
      const encodedContent = new TextEncoder().encode(testContent);

      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(encodedContent);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(testContent);
      }
      expect(vscode.Uri.file).toHaveBeenCalledWith(testPath);
      expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fsPath: testPath,
        }),
      );
    });

    it('should handle file not found error', async () => {
      const testPath = '/nonexistent/file.txt';
      const error = vscode.FileSystemError.FileNotFound('File not found');

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.path).toBe(testPath);
      }
    });

    it('should handle permission denied error', async () => {
      const testPath = '/restricted/file.txt';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
        expect(result.error.path).toBe(testPath);
      }
    });

    it('should handle unknown errors', async () => {
      const testPath = '/test/file.txt';
      const error = new Error('Unknown error');

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toBe('Unknown error');
      }
    });

    it('should handle UTF-8 decoding', async () => {
      const testPath = '/test/unicode.txt';
      const testContent = 'Hello 世界 🌍';
      const encodedContent = new TextEncoder().encode(testContent);

      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(encodedContent);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(testContent);
      }
    });
  });

  describe('writeFile', () => {
    it('should successfully write file content', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test file content';

      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

      const result = await adapter.writeFile(
        createTestFilePath(testPath),
        createTestDocumentContent(testContent),
      );

      expect(result.isOk()).toBe(true);
      expect(vscode.Uri.file).toHaveBeenCalledWith(testPath);
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: testPath }),
        expect.any(Uint8Array),
      );
    });

    it('should handle write permission errors', async () => {
      const testPath = '/readonly/file.txt';
      const testContent = 'content';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const result = await adapter.writeFile(
        createTestFilePath(testPath),
        createTestDocumentContent(testContent),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should handle disk full errors', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'content';
      const error = new (class extends vscode.FileSystemError {
        public override code = 'ENOSPC';
      })('No space left');

      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValue(error);

      const result = await adapter.writeFile(
        createTestFilePath(testPath),
        createTestDocumentContent(testContent),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('DISK_FULL');
      }
    });

    it('should properly encode UTF-8 content', async () => {
      const testPath = '/test/unicode.txt';
      const testContent = 'Hello 世界 🌍';

      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

      const result = await adapter.writeFile(
        createTestFilePath(testPath),
        createTestDocumentContent(testContent),
      );

      expect(result.isOk()).toBe(true);

      const writeCall = vi.mocked(vscode.workspace.fs.writeFile).mock.calls[0];
      expect(writeCall).toBeDefined();
      const writtenBuffer = writeCall?.[1] as Uint8Array;
      const decodedContent = new TextDecoder().decode(writtenBuffer);
      expect(decodedContent).toBe(testContent);
    });
  });

  describe('exists', () => {
    it('should return true for existing files', async () => {
      const testPath = '/test/existing.txt';
      const mockStat = { size: 100, mtime: Date.now(), ctime: Date.now() };

      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue(mockStat as any);

      const result = await adapter.exists(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false for non-existing files', async () => {
      const testPath = '/test/nonexistent.txt';
      const error = vscode.FileSystemError.FileNotFound('File not found');

      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(error);

      const result = await adapter.exists(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should handle other errors during stat', async () => {
      const testPath = '/test/file.txt';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(error);

      const result = await adapter.exists(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('delete', () => {
    it('should successfully delete files', async () => {
      const testPath = '/test/file.txt';

      vi.mocked(vscode.workspace.fs.delete).mockResolvedValue(undefined);

      const result = await adapter.delete(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: testPath }),
        { recursive: false, useTrash: true },
      );
    });

    it('should handle delete errors', async () => {
      const testPath = '/test/file.txt';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.delete).mockRejectedValue(error);

      const result = await adapter.delete(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('readDirectory', () => {
    it('should successfully read directory contents', async () => {
      const testPath = '/test/directory';
      const mockEntries: [string, vscode.FileType][] = [
        ['file1.txt', vscode.FileType.File],
        ['subdir', vscode.FileType.Directory],
        ['file2.txt', vscode.FileType.File],
      ];

      const mockStats = [
        { size: 100, mtime: 1640995200000 }, // file1.txt
        { size: 0, mtime: 1640995300000 }, // subdir
        { size: 200, mtime: 1640995400000 }, // file2.txt
      ];

      vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue(mockEntries);
      vi.mocked(vscode.workspace.fs.stat).mockImplementation(async (uri) => {
        const index = mockEntries.findIndex(([name]) => uri.toString().endsWith(name));
        return mockStats[index] as any;
      });

      const result = await adapter.readDirectory(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const fileInfos = result.value;
        expect(fileInfos).toHaveLength(3);

        expect(fileInfos[0]?.name).toBe('file1.txt');
        expect(fileInfos[0]?.isDirectory).toBe(false);
        expect(fileInfos[0]?.size).toBe(100);

        expect(fileInfos[1]?.name).toBe('subdir');
        expect(fileInfos[1]?.isDirectory).toBe(true);

        expect(fileInfos[2]?.name).toBe('file2.txt');
        expect(fileInfos[2]?.isDirectory).toBe(false);
      }
    });

    it('should handle directory read errors', async () => {
      const testPath = '/restricted/directory';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.readDirectory).mockRejectedValue(error);

      const result = await adapter.readDirectory(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('createDirectory', () => {
    it('should successfully create directories', async () => {
      const testPath = '/test/newdir';

      vi.mocked(vscode.workspace.fs.createDirectory).mockResolvedValue(undefined);

      const result = await adapter.createDirectory(createTestFilePath(testPath));

      expect(result.isOk()).toBe(true);
      expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: testPath }),
      );
    });

    it('should handle create directory errors', async () => {
      const testPath = '/readonly/newdir';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.createDirectory).mockRejectedValue(error);

      const result = await adapter.createDirectory(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('watch', () => {
    it('should create file system watcher and handle events', () => {
      const testPath = '/test/watch';
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const eventCallback = vi.fn();
      const disposable = adapter.watch(createTestFilePath(testPath), eventCallback);

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          base: expect.objectContaining({ fsPath: testPath }),
          pattern: '**/*',
        }),
      );

      // Verify event handlers are registered
      expect(mockWatcher.onDidCreate).toHaveBeenCalled();
      expect(mockWatcher.onDidChange).toHaveBeenCalled();
      expect(mockWatcher.onDidDelete).toHaveBeenCalled();

      // Test disposable
      disposable.dispose();
      expect(mockWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle create events', () => {
      const testPath = '/test/watch';
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const eventCallback = vi.fn();
      adapter.watch(createTestFilePath(testPath), eventCallback);

      // Simulate create event
      const createHandler = mockWatcher.onDidCreate.mock.calls[0]?.[0];
      const testUri = { fsPath: '/test/watch/newfile.txt' };
      createHandler?.(testUri);

      expect(eventCallback).toHaveBeenCalledWith({
        type: 'created',
        path: '/test/watch/newfile.txt',
      });
    });

    it('should handle change events', () => {
      const testPath = '/test/watch';
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const eventCallback = vi.fn();
      adapter.watch(createTestFilePath(testPath), eventCallback);

      // Simulate change event
      const changeHandler = mockWatcher.onDidChange.mock.calls[0]?.[0];
      const testUri = { fsPath: '/test/watch/changed.txt' };
      changeHandler?.(testUri);

      expect(eventCallback).toHaveBeenCalledWith({
        type: 'changed',
        path: '/test/watch/changed.txt',
      });
    });

    it('should handle delete events', () => {
      const testPath = '/test/watch';
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const eventCallback = vi.fn();
      adapter.watch(createTestFilePath(testPath), eventCallback);

      // Simulate delete event
      const deleteHandler = mockWatcher.onDidDelete.mock.calls[0]?.[0];
      const testUri = { fsPath: '/test/watch/deleted.txt' };
      deleteHandler?.(testUri);

      expect(eventCallback).toHaveBeenCalledWith({
        type: 'deleted',
        path: '/test/watch/deleted.txt',
      });
    });
  });

  describe('stored document management', () => {
    it('should get stored document', async () => {
      const testDoc: StoredDocument = {
        id: createTestDocumentId('test-doc'),
        content: createTestDocumentContent('test content'),
        version: createTestDocumentVersion(1),
        metadata: {
          id: createTestDocumentId('test-doc'),
          title: createTestTitle('Test Document'),
          modifiedAt: createTestTimestamp(new Date('2023-01-01')),
          size: createTestFileSize(12),
        },
      };

      // Mock the stored documents
      (adapter as any).storedDocuments.set('test-doc', testDoc);

      const result = await adapter.getStoredDocument(createTestDocumentId('test-doc'));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(testDoc);
      }
    });

    it('should return null for non-existent stored document', async () => {
      const result = await adapter.getStoredDocument(createTestDocumentId('nonexistent'));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should store document and save to global state', async () => {
      const testDoc: StoredDocument = {
        id: createTestDocumentId('new-doc'),
        content: createTestDocumentContent('new content'),
        version: createTestDocumentVersion(1),
        metadata: {
          id: createTestDocumentId('new-doc'),
          title: createTestTitle('New Document'),
          modifiedAt: createTestTimestamp(new Date('2023-01-01')),
          size: createTestFileSize(11),
        },
      };

      const result = await adapter.storeDocument(testDoc);

      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.offline-documents',
        expect.objectContaining({
          'new-doc': testDoc,
        }),
      );
    });

    it('should delete stored document and update global state', async () => {
      const testDoc: StoredDocument = {
        id: createTestDocumentId('to-delete'),
        content: createTestDocumentContent('content'),
        version: createTestDocumentVersion(1),
        metadata: {
          id: createTestDocumentId('to-delete'),
          title: createTestTitle('Document to Delete'),
          modifiedAt: createTestTimestamp(new Date('2023-01-01')),
          size: createTestFileSize(7),
        },
      };

      // Store document first
      (adapter as any).storedDocuments.set('to-delete', testDoc);

      const result = await adapter.deleteStoredDocument(createTestDocumentId('to-delete'));

      expect(result.isOk()).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith('proof-editor.offline-documents', {});
    });

    it('should list stored documents metadata', async () => {
      const testDocs: StoredDocument[] = [
        {
          id: createTestDocumentId('doc1'),
          content: createTestDocumentContent('content1'),
          version: createTestDocumentVersion(1),
          metadata: {
            id: createTestDocumentId('doc1'),
            title: createTestTitle('Doc 1'),
            modifiedAt: createTestTimestamp(new Date('2023-01-01')),
            size: createTestFileSize(8),
          },
        },
        {
          id: createTestDocumentId('doc2'),
          content: createTestDocumentContent('content2'),
          version: createTestDocumentVersion(1),
          metadata: {
            id: createTestDocumentId('doc2'),
            title: createTestTitle('Doc 2'),
            modifiedAt: createTestTimestamp(new Date('2023-01-02')),
            size: createTestFileSize(8),
          },
        },
      ];

      // Store documents
      testDocs.forEach((doc) => {
        (adapter as any).storedDocuments.set(doc.id.getValue(), doc);
      });

      const result = await adapter.listStoredDocuments();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata).toHaveLength(2);
        expect(metadata[0]).toEqual(testDocs[0]?.metadata);
        expect(metadata[1]).toEqual(testDocs[1]?.metadata);
      }
    });

    it('should handle storage errors gracefully', async () => {
      const testDoc: StoredDocument = {
        id: createTestDocumentId('error-doc'),
        content: createTestDocumentContent('content'),
        version: createTestDocumentVersion(1),
        metadata: {
          id: createTestDocumentId('error-doc'),
          title: createTestTitle('Error Document'),
          modifiedAt: createTestTimestamp(new Date('2023-01-01')),
          size: createTestFileSize(7),
        },
      };

      mockGlobalState.update = vi.fn().mockRejectedValue(new Error('Storage error'));

      const result = await adapter.storeDocument(testDoc);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('QUOTA_EXCEEDED');
      }
    });
  });

  describe('capabilities', () => {
    it('should return correct file system capabilities', () => {
      const capabilities = adapter.capabilities();

      expect(capabilities).toEqual({
        canWatch: true,
        canAccessArbitraryPaths: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportsOfflineStorage: true,
        persistence: 'permanent',
      });
    });
  });

  describe('error mapping edge cases', () => {
    it('should handle ENOENT error code', async () => {
      const testPath = '/test/file.txt';
      const error = vscode.FileSystemError.FileNotFound('No such file');

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should handle EACCES error code', async () => {
      const testPath = '/test/file.txt';
      const error = vscode.FileSystemError.NoPermissions('Permission denied');

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PERMISSION_DENIED');
      }
    });

    it('should handle non-FileSystemError errors', async () => {
      const testPath = '/test/file.txt';
      const error = new Error('Generic error');

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toBe('Generic error');
      }
    });

    it('should handle string errors', async () => {
      const testPath = '/test/file.txt';
      const error = 'String error';

      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const result = await adapter.readFile(createTestFilePath(testPath));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toBe('String error');
      }
    });
  });
});
