import { err, ok } from 'neverthrow';
import { describe, expect, test, vi } from 'vitest';
import type {
  Disposable,
  DocumentMetadata,
  FileChangeEvent,
  FileInfo,
  FileSystemCapabilities,
  FileSystemError,
  IFileSystemPort,
  StoredDocument,
} from '../IFileSystemPort.js';

// Helper function to create a mock IFileSystemPort
function createMockFileSystemPort(): IFileSystemPort {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    delete: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    watch: vi.fn(),
    getStoredDocument: vi.fn(),
    storeDocument: vi.fn(),
    deleteStoredDocument: vi.fn(),
    listStoredDocuments: vi.fn(),
    capabilities: vi.fn(),
  } as IFileSystemPort;
}

describe('IFileSystemPort Interface Contract', () => {
  describe('Basic File Operations', () => {
    test('readFile returns Result<string, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok('file content');
      const errorResult = err({
        code: 'NOT_FOUND',
        message: 'File not found',
        path: '/test/path',
      } as FileSystemError);

      vi.mocked(mockPort.readFile).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readFile).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readFile('/existing/file.txt');
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe('file content');
      }

      const result2 = await mockPort.readFile('/nonexistent/file.txt');
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('NOT_FOUND');
        expect(result2.error.path).toBe('/test/path');
      }
    });

    test('writeFile returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'PERMISSION_DENIED',
        message: 'Access denied',
        path: '/readonly/file.txt',
      } as FileSystemError);

      vi.mocked(mockPort.writeFile).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.writeFile).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.writeFile('/writable/file.txt', 'content');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.writeFile('/readonly/file.txt', 'content');
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('PERMISSION_DENIED');
      }
    });

    test('exists returns Result<boolean, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const existsResult = ok(true);
      const notExistsResult = ok(false);
      const errorResult = err({
        code: 'PERMISSION_DENIED',
        message: 'Cannot access path',
      } as FileSystemError);

      vi.mocked(mockPort.exists).mockResolvedValueOnce(existsResult);
      vi.mocked(mockPort.exists).mockResolvedValueOnce(notExistsResult);
      vi.mocked(mockPort.exists).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.exists('/existing/file.txt');
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe(true);
      }

      const result2 = await mockPort.exists('/nonexistent/file.txt');
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(false);
      }

      const result3 = await mockPort.exists('/restricted/path');
      expect(result3.isErr()).toBe(true);
    });

    test('delete returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'NOT_FOUND',
        message: 'File not found',
      } as FileSystemError);

      vi.mocked(mockPort.delete).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.delete).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.delete('/existing/file.txt');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.delete('/nonexistent/file.txt');
      expect(result2.isErr()).toBe(true);
    });
  });

  describe('Directory Operations', () => {
    test('readDirectory returns Result<FileInfo[], FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const files: FileInfo[] = [
        {
          path: '/dir/file1.txt',
          name: 'file1.txt',
          isDirectory: false,
          size: 100,
          modifiedAt: new Date('2023-01-01'),
        },
        {
          path: '/dir/subdir',
          name: 'subdir',
          isDirectory: true,
          modifiedAt: new Date('2023-01-02'),
        },
      ];

      const successResult = ok(files);
      const errorResult = err({
        code: 'NOT_FOUND',
        message: 'Directory not found',
        path: '/nonexistent',
      } as FileSystemError);

      vi.mocked(mockPort.readDirectory).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readDirectory).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readDirectory('/existing/dir');
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toHaveLength(2);
        expect(result1.value?.[0]?.name).toBe('file1.txt');
        expect(result1.value?.[1]?.isDirectory).toBe(true);
      }

      const result2 = await mockPort.readDirectory('/nonexistent');
      expect(result2.isErr()).toBe(true);
    });

    test('createDirectory returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'PERMISSION_DENIED',
        message: 'Cannot create directory',
      } as FileSystemError);

      vi.mocked(mockPort.createDirectory).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.createDirectory).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.createDirectory('/writable/newdir');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.createDirectory('/readonly/newdir');
      expect(result2.isErr()).toBe(true);
    });
  });

  describe('Watch Operations (Optional)', () => {
    test('watch returns Disposable when supported', () => {
      const mockPort = createMockFileSystemPort();
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      // Mock the optional watch method
      mockPort.watch = (path: string, callback: (event: FileChangeEvent) => void) => {
        // Simulate a file change event
        setTimeout(() => {
          callback({
            type: 'changed',
            path: path,
          });
        }, 0);
        return mockDisposable;
      };

      let receivedEvent: FileChangeEvent | null = null;
      const disposable = mockPort.watch?.('/test/path', (event) => {
        receivedEvent = event;
      });

      expect(disposable).toBeDefined();
      expect(mockDisposable.dispose).toBeDefined();

      // Test that events are received
      setTimeout(() => {
        expect(receivedEvent).not.toBeNull();
        expect(receivedEvent?.type).toBe('changed');
        expect(receivedEvent?.path).toBe('/test/path');
      }, 10);
    });

    test('watch may be undefined for platforms that do not support it', () => {
      const mockPort = createMockFileSystemPort();
      // Create a mock without watch method to simulate unsupported platform
      const mockPortWithoutWatch = { ...mockPort };
      delete (mockPortWithoutWatch as any).watch;

      expect((mockPortWithoutWatch as any).watch).toBeUndefined();
    });
  });

  describe('Offline Storage Operations', () => {
    test('getStoredDocument returns Result<StoredDocument | null, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const document: StoredDocument = {
        id: 'doc1',
        content: 'document content',
        metadata: {
          id: 'doc1',
          title: 'Test Document',
          modifiedAt: new Date('2023-01-01'),
          size: 16,
          syncStatus: 'local',
        },
        version: 1,
      };

      const foundResult = ok(document);
      const notFoundResult = ok(null);
      const errorResult = err({
        code: 'UNKNOWN',
        message: 'Storage error',
      } as FileSystemError);

      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(foundResult);
      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(notFoundResult);
      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.getStoredDocument('doc1');
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value?.id).toBe('doc1');
        expect(result1.value?.content).toBe('document content');
      }

      const result2 = await mockPort.getStoredDocument('nonexistent');
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.getStoredDocument('error-doc');
      expect(result3.isErr()).toBe(true);
    });

    test('storeDocument returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const document: StoredDocument = {
        id: 'doc1',
        content: 'document content',
        metadata: {
          id: 'doc1',
          title: 'Test Document',
          modifiedAt: new Date(),
          size: 16,
        },
        version: 1,
      };

      const successResult = ok(undefined);
      const errorResult = err({
        code: 'QUOTA_EXCEEDED',
        message: 'Storage quota exceeded',
      } as FileSystemError);

      vi.mocked(mockPort.storeDocument).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.storeDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.storeDocument(document);
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.storeDocument(document);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('QUOTA_EXCEEDED');
      }
    });

    test('deleteStoredDocument returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: 'NOT_FOUND',
        message: 'Document not found',
      } as FileSystemError);

      vi.mocked(mockPort.deleteStoredDocument).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.deleteStoredDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.deleteStoredDocument('doc1');
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.deleteStoredDocument('nonexistent');
      expect(result2.isErr()).toBe(true);
    });

    test('listStoredDocuments returns Result<DocumentMetadata[], FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const metadata: DocumentMetadata[] = [
        {
          id: 'doc1',
          title: 'Document 1',
          modifiedAt: new Date('2023-01-01'),
          size: 100,
          syncStatus: 'local',
        },
        {
          id: 'doc2',
          title: 'Document 2',
          modifiedAt: new Date('2023-01-02'),
          size: 200,
          syncStatus: 'synced',
        },
      ];

      const successResult = ok(metadata);
      const errorResult = err({
        code: 'UNKNOWN',
        message: 'Storage error',
      } as FileSystemError);

      vi.mocked(mockPort.listStoredDocuments).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.listStoredDocuments).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.listStoredDocuments();
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toHaveLength(2);
        expect(result1.value?.[0]?.id).toBe('doc1');
        expect(result1.value?.[1]?.syncStatus).toBe('synced');
      }

      const result2 = await mockPort.listStoredDocuments();
      expect(result2.isErr()).toBe(true);
    });
  });

  describe('Platform Capabilities', () => {
    test('capabilities returns FileSystemCapabilities', () => {
      const mockPort = createMockFileSystemPort();
      const capabilities: FileSystemCapabilities = {
        canWatch: true,
        canAccessArbitraryPaths: false,
        maxFileSize: 1024 * 1024,
        supportsOfflineStorage: true,
        persistence: 'session',
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(capabilities);

      const result = mockPort.capabilities();
      expect(result.canWatch).toBe(true);
      expect(result.canAccessArbitraryPaths).toBe(false);
      expect(result.maxFileSize).toBe(1024 * 1024);
      expect(result.supportsOfflineStorage).toBe(true);
      expect(result.persistence).toBe('session');
    });

    test('capabilities should handle all persistence types', () => {
      const mockPort = createMockFileSystemPort();
      const persistenceTypes: Array<'memory' | 'session' | 'permanent'> = [
        'memory',
        'session',
        'permanent',
      ];

      persistenceTypes.forEach((persistence) => {
        const capabilities: FileSystemCapabilities = {
          canWatch: false,
          canAccessArbitraryPaths: true,
          supportsOfflineStorage: false,
          persistence,
        };

        vi.mocked(mockPort.capabilities).mockReturnValue(capabilities);
        const result = mockPort.capabilities();
        expect(result.persistence).toBe(persistence);
      });
    });
  });

  describe('Error Handling', () => {
    test('FileSystemError has all required error codes', () => {
      const errorCodes = [
        'NOT_FOUND',
        'PERMISSION_DENIED',
        'DISK_FULL',
        'INVALID_PATH',
        'QUOTA_EXCEEDED',
        'UNKNOWN',
      ] as const;

      errorCodes.forEach((code) => {
        const error: FileSystemError = {
          code,
          message: `Test error: ${code}`,
          path: '/test/path',
        };

        expect(error.code).toBe(code);
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
      });
    });

    test('FileSystemError path is optional', () => {
      const error: FileSystemError = {
        code: 'UNKNOWN',
        message: 'Generic error',
      };

      expect(error.path).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    test('FileInfo structure is well-typed', () => {
      const fileInfo: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        isDirectory: false,
        size: 1024,
        modifiedAt: new Date(),
      };

      expect(fileInfo.path).toBe('/test/file.txt');
      expect(fileInfo.name).toBe('file.txt');
      expect(fileInfo.isDirectory).toBe(false);
      expect(fileInfo.size).toBe(1024);
      expect(fileInfo.modifiedAt).toBeInstanceOf(Date);
    });

    test('FileInfo optional fields can be undefined', () => {
      const minimalFileInfo: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        isDirectory: false,
      };

      expect(minimalFileInfo.size).toBeUndefined();
      expect(minimalFileInfo.modifiedAt).toBeUndefined();
    });

    test('StoredDocument structure is well-typed', () => {
      const document: StoredDocument = {
        id: 'doc1',
        content: 'content',
        metadata: {
          id: 'doc1',
          title: 'Test',
          modifiedAt: new Date(),
          size: 7,
        },
        version: 1,
      };

      expect(document.id).toBe('doc1');
      expect(document.content).toBe('content');
      expect(document.metadata.id).toBe('doc1');
      expect(document.version).toBe(1);
    });

    test('DocumentMetadata syncStatus is optional', () => {
      const metadataWithSync: DocumentMetadata = {
        id: 'doc1',
        title: 'Test',
        modifiedAt: new Date(),
        size: 100,
        syncStatus: 'conflict',
      };

      const metadataWithoutSync: DocumentMetadata = {
        id: 'doc2',
        title: 'Test 2',
        modifiedAt: new Date(),
        size: 200,
      };

      expect(metadataWithSync.syncStatus).toBe('conflict');
      expect(metadataWithoutSync.syncStatus).toBeUndefined();
    });
  });
});
