import { err, ok } from 'neverthrow';
import { describe, expect, test, vi } from 'vitest';
import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  ErrorCode,
  ErrorMessage,
  FileName,
  FilePath,
  FileSize,
  Timestamp,
  Title,
} from '../../../domain/shared/value-objects/index.js';
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
    test('readFile returns Result<DocumentContent, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(DocumentContent.create('file content').unwrapOr(null)!);
      const errorResult = err({
        code: ErrorCode.create('NOT_FOUND').unwrapOr(null)!,
        message: ErrorMessage.create('File not found').unwrapOr(null)!,
        path: FilePath.create('/test/path').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.readFile).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readFile).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readFile(
        FilePath.create('/existing/file.txt').unwrapOr(null)!,
      );
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.getValue()).toBe('file content');
      }

      const result2 = await mockPort.readFile(
        FilePath.create('/nonexistent/file.txt').unwrapOr(null)!,
      );
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code.getValue()).toBe('NOT_FOUND');
        expect(result2.error.path?.getValue()).toBe('/test/path');
      }
    });

    test('writeFile returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: ErrorCode.create('PERMISSION_DENIED').unwrapOr(null)!,
        message: ErrorMessage.create('Access denied').unwrapOr(null)!,
        path: FilePath.create('/readonly/file.txt').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.writeFile).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.writeFile).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.writeFile(
        FilePath.create('/writable/file.txt').unwrapOr(null)!,
        DocumentContent.create('content').unwrapOr(null)!,
      );
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.writeFile(
        FilePath.create('/readonly/file.txt').unwrapOr(null)!,
        DocumentContent.create('content').unwrapOr(null)!,
      );
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code.getValue()).toBe('PERMISSION_DENIED');
      }
    });

    test('exists returns Result<boolean, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const existsResult = ok(true);
      const notExistsResult = ok(false);
      const errorResult = err({
        code: ErrorCode.create('PERMISSION_DENIED').unwrapOr(null)!,
        message: ErrorMessage.create('Cannot access path').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.exists).mockResolvedValueOnce(existsResult);
      vi.mocked(mockPort.exists).mockResolvedValueOnce(notExistsResult);
      vi.mocked(mockPort.exists).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.exists(FilePath.create('/existing/file.txt').unwrapOr(null)!);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe(true);
      }

      const result2 = await mockPort.exists(
        FilePath.create('/nonexistent/file.txt').unwrapOr(null)!,
      );
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(false);
      }

      const result3 = await mockPort.exists(FilePath.create('/restricted/path').unwrapOr(null)!);
      expect(result3.isErr()).toBe(true);
    });

    test('delete returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: ErrorCode.create('NOT_FOUND').unwrapOr(null)!,
        message: ErrorMessage.create('File not found').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.delete).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.delete).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.delete(FilePath.create('/existing/file.txt').unwrapOr(null)!);
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.delete(
        FilePath.create('/nonexistent/file.txt').unwrapOr(null)!,
      );
      expect(result2.isErr()).toBe(true);
    });
  });

  describe('Directory Operations', () => {
    test('readDirectory returns Result<FileInfo[], FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const files: FileInfo[] = [
        {
          path: FilePath.create('/dir/file1.txt').unwrapOr(null)!,
          name: FileName.create('file1.txt').unwrapOr(null)!,
          isDirectory: false,
          size: FileSize.create(100).unwrapOr(null)!,
          modifiedAt: new Date('2023-01-01'),
        },
        {
          path: FilePath.create('/dir/subdir').unwrapOr(null)!,
          name: FileName.create('subdir').unwrapOr(null)!,
          isDirectory: true,
          modifiedAt: new Date('2023-01-02'),
        },
      ];

      const successResult = ok(files);
      const errorResult = err({
        code: ErrorCode.create('NOT_FOUND').unwrapOr(null)!,
        message: ErrorMessage.create('Directory not found').unwrapOr(null)!,
        path: FilePath.create('/nonexistent').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.readDirectory).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readDirectory).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readDirectory(
        FilePath.create('/existing/dir').unwrapOr(null)!,
      );
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toHaveLength(2);
        expect(result1.value?.[0]?.name.getValue()).toBe('file1.txt');
        expect(result1.value?.[1]?.isDirectory).toBe(true);
      }

      const result2 = await mockPort.readDirectory(FilePath.create('/nonexistent').unwrapOr(null)!);
      expect(result2.isErr()).toBe(true);
    });

    test('createDirectory returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: ErrorCode.create('PERMISSION_DENIED').unwrapOr(null)!,
        message: ErrorMessage.create('Cannot create directory').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.createDirectory).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.createDirectory).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.createDirectory(
        FilePath.create('/writable/newdir').unwrapOr(null)!,
      );
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.createDirectory(
        FilePath.create('/readonly/newdir').unwrapOr(null)!,
      );
      expect(result2.isErr()).toBe(true);
    });
  });

  describe('Watch Operations (Optional)', () => {
    test('watch returns Disposable when supported', () => {
      const mockPort = createMockFileSystemPort();
      const mockDisposable = { dispose: vi.fn() } as Disposable;

      // Mock the optional watch method
      mockPort.watch = (path: FilePath, callback: (event: FileChangeEvent) => void) => {
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
      const disposable = mockPort.watch?.(
        FilePath.create('/test/path').unwrapOr(null)!,
        (event) => {
          receivedEvent = event;
        },
      );

      expect(disposable).toBeDefined();
      expect(mockDisposable.dispose).toBeDefined();

      // Test that events are received
      setTimeout(() => {
        expect(receivedEvent).not.toBeNull();
        expect(receivedEvent?.type).toBe('changed');
        expect(receivedEvent?.path.getValue()).toBe('/test/path');
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
        id: DocumentId.create('doc1').unwrapOr(null)!,
        content: DocumentContent.create('document content').unwrapOr(null)!,
        metadata: {
          id: DocumentId.create('doc1').unwrapOr(null)!,
          title: Title.create('Test Document').unwrapOr(null)!,
          modifiedAt: Timestamp.fromDate(new Date('2023-01-01')),
          size: FileSize.create(16).unwrapOr(null)!,
          syncStatus: 'local',
        },
        version: DocumentVersion.create(1).unwrapOr(null)!,
      };

      const foundResult = ok(document);
      const notFoundResult = ok(null);
      const errorResult = err({
        code: ErrorCode.create('UNKNOWN').unwrapOr(null)!,
        message: ErrorMessage.create('Storage error').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(foundResult);
      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(notFoundResult);
      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.getStoredDocument(DocumentId.create('doc1').unwrapOr(null)!);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value?.id.getValue()).toBe('doc1');
        expect(result1.value?.content.getValue()).toBe('document content');
      }

      const result2 = await mockPort.getStoredDocument(
        DocumentId.create('nonexistent').unwrapOr(null)!,
      );
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.getStoredDocument(
        DocumentId.create('error-doc').unwrapOr(null)!,
      );
      expect(result3.isErr()).toBe(true);
    });

    test('storeDocument returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const document: StoredDocument = {
        id: DocumentId.create('doc1').unwrapOr(null)!,
        content: DocumentContent.create('document content').unwrapOr(null)!,
        metadata: {
          id: DocumentId.create('doc1').unwrapOr(null)!,
          title: Title.create('Test Document').unwrapOr(null)!,
          modifiedAt: Timestamp.now(),
          size: FileSize.create(16).unwrapOr(null)!,
        },
        version: DocumentVersion.create(1).unwrapOr(null)!,
      };

      const successResult = ok(undefined);
      const errorResult = err({
        code: ErrorCode.create('QUOTA_EXCEEDED').unwrapOr(null)!,
        message: ErrorMessage.create('Storage quota exceeded').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.storeDocument).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.storeDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.storeDocument(document);
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.storeDocument(document);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code.getValue()).toBe('QUOTA_EXCEEDED');
      }
    });

    test('deleteStoredDocument returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: ErrorCode.create('NOT_FOUND').unwrapOr(null)!,
        message: ErrorMessage.create('Document not found').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.deleteStoredDocument).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.deleteStoredDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.deleteStoredDocument(
        DocumentId.create('doc1').unwrapOr(null)!,
      );
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.deleteStoredDocument(
        DocumentId.create('nonexistent').unwrapOr(null)!,
      );
      expect(result2.isErr()).toBe(true);
    });

    test('listStoredDocuments returns Result<DocumentMetadata[], FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const metadata: DocumentMetadata[] = [
        {
          id: DocumentId.create('doc1').unwrapOr(null)!,
          title: Title.create('Document 1').unwrapOr(null)!,
          modifiedAt: Timestamp.fromDate(new Date('2023-01-01')),
          size: FileSize.create(100).unwrapOr(null)!,
          syncStatus: 'local',
        },
        {
          id: DocumentId.create('doc2').unwrapOr(null)!,
          title: Title.create('Document 2').unwrapOr(null)!,
          modifiedAt: Timestamp.fromDate(new Date('2023-01-02')),
          size: FileSize.create(200).unwrapOr(null)!,
          syncStatus: 'synced',
        },
      ];

      const successResult = ok(metadata);
      const errorResult = err({
        code: ErrorCode.create('UNKNOWN').unwrapOr(null)!,
        message: ErrorMessage.create('Storage error').unwrapOr(null)!,
      } as FileSystemError);

      vi.mocked(mockPort.listStoredDocuments).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.listStoredDocuments).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.listStoredDocuments();
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toHaveLength(2);
        expect(result1.value?.[0]?.id.getValue()).toBe('doc1');
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
        maxFileSize: FileSize.create(1024 * 1024).unwrapOr(null)!,
        supportsOfflineStorage: true,
        persistence: 'session',
      };

      vi.mocked(mockPort.capabilities).mockReturnValue(capabilities);

      const result = mockPort.capabilities();
      expect(result.canWatch).toBe(true);
      expect(result.canAccessArbitraryPaths).toBe(false);
      expect(result.maxFileSize?.getValue()).toBe(1024 * 1024);
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
          code: ErrorCode.create(code).unwrapOr(null)!,
          message: ErrorMessage.create(`Test error: ${code}`).unwrapOr(null)!,
          path: FilePath.create('/test/path').unwrapOr(null)!,
        };

        expect(error.code.getValue()).toBe(code);
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
      });
    });

    test('FileSystemError path is optional', () => {
      const error: FileSystemError = {
        code: ErrorCode.create('UNKNOWN').unwrapOr(null)!,
        message: ErrorMessage.create('Generic error').unwrapOr(null)!,
      };

      expect(error.path).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    test('FileInfo structure is well-typed', () => {
      const fileInfo: FileInfo = {
        path: FilePath.create('/test/file.txt').unwrapOr(null)!,
        name: FileName.create('file.txt').unwrapOr(null)!,
        isDirectory: false,
        size: FileSize.create(1024).unwrapOr(null)!,
        modifiedAt: new Date(),
      };

      expect(fileInfo.path.getValue()).toBe('/test/file.txt');
      expect(fileInfo.name.getValue()).toBe('file.txt');
      expect(fileInfo.isDirectory).toBe(false);
      expect(fileInfo.size?.getValue()).toBe(1024);
      expect(fileInfo.modifiedAt).toBeInstanceOf(Date);
    });

    test('FileInfo optional fields can be undefined', () => {
      const minimalFileInfo: FileInfo = {
        path: FilePath.create('/test/file.txt').unwrapOr(null)!,
        name: FileName.create('file.txt').unwrapOr(null)!,
        isDirectory: false,
      };

      expect(minimalFileInfo.size).toBeUndefined();
      expect(minimalFileInfo.modifiedAt).toBeUndefined();
    });

    test('StoredDocument structure is well-typed', () => {
      const document: StoredDocument = {
        id: DocumentId.create('doc1').unwrapOr(null)!,
        content: DocumentContent.create('content').unwrapOr(null)!,
        metadata: {
          id: DocumentId.create('doc1').unwrapOr(null)!,
          title: Title.create('Test').unwrapOr(null)!,
          modifiedAt: Timestamp.now(),
          size: FileSize.create(7).unwrapOr(null)!,
        },
        version: DocumentVersion.create(1).unwrapOr(null)!,
      };

      expect(document.id.getValue()).toBe('doc1');
      expect(document.content.getValue()).toBe('content');
      expect(document.metadata.id.getValue()).toBe('doc1');
      expect(document.version.getValue()).toBe(1);
    });

    test('DocumentMetadata syncStatus is optional', () => {
      const metadataWithSync: DocumentMetadata = {
        id: DocumentId.create('doc1').unwrapOr(null)!,
        title: Title.create('Test').unwrapOr(null)!,
        modifiedAt: Timestamp.now(),
        size: FileSize.create(100).unwrapOr(null)!,
        syncStatus: 'conflict',
      };

      const metadataWithoutSync: DocumentMetadata = {
        id: DocumentId.create('doc2').unwrapOr(null)!,
        title: Title.create('Test 2').unwrapOr(null)!,
        modifiedAt: Timestamp.now(),
        size: FileSize.create(200).unwrapOr(null)!,
      };

      expect(metadataWithSync.syncStatus).toBe('conflict');
      expect(metadataWithoutSync.syncStatus).toBeUndefined();
    });
  });
});
