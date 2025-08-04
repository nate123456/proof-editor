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

// Helper functions for creating test value objects
function createTestDocumentContent(content: string): DocumentContent {
  const result = DocumentContent.create(content);
  if (result.isErr()) {
    throw new Error(`Failed to create DocumentContent: ${content}`);
  }
  return result.value;
}

function createTestErrorCode(code: string): ErrorCode {
  const result = ErrorCode.create(code);
  if (result.isErr()) {
    throw new Error(`Failed to create ErrorCode: ${code}`);
  }
  return result.value;
}

function createTestErrorMessage(message: string): ErrorMessage {
  const result = ErrorMessage.create(message);
  if (result.isErr()) {
    throw new Error(`Failed to create ErrorMessage: ${message}`);
  }
  return result.value;
}

function createTestFilePath(path: string): FilePath {
  const result = FilePath.create(path);
  if (result.isErr()) {
    throw new Error(`Failed to create FilePath: ${path}`);
  }
  return result.value;
}

function createTestDocumentId(id: string): DocumentId {
  const result = DocumentId.create(id);
  if (result.isErr()) {
    throw new Error(`Failed to create DocumentId: ${id}`);
  }
  return result.value;
}

function createTestTitle(title: string): Title {
  const result = Title.create(title);
  if (result.isErr()) {
    throw new Error(`Failed to create Title: ${title}`);
  }
  return result.value;
}

function createTestDocumentVersion(version: number): DocumentVersion {
  const result = DocumentVersion.create(version);
  if (result.isErr()) {
    throw new Error(`Failed to create DocumentVersion: ${version}`);
  }
  return result.value;
}

function _createTestTimestamp(timestamp: number): Timestamp {
  const result = Timestamp.create(timestamp);
  if (result.isErr()) {
    throw new Error(`Failed to create Timestamp: ${timestamp}`);
  }
  return result.value;
}

function createTestFileName(name: string): FileName {
  const result = FileName.create(name);
  if (result.isErr()) {
    throw new Error(`Failed to create FileName: ${name}`);
  }
  return result.value;
}

function __createTestFileSize(size: number): FileSize {
  const result = FileSize.create(size);
  if (result.isErr()) {
    throw new Error(`Failed to create FileSize: ${size}`);
  }
  return result.value;
}

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
      const successResult = ok(createTestDocumentContent('file content'));
      const errorResult = err({
        code: createTestErrorCode('NOT_FOUND'),
        message: createTestErrorMessage('File not found'),
        path: createTestFilePath('/test/path'),
      } as FileSystemError);

      vi.mocked(mockPort.readFile).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readFile).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readFile(createTestFilePath('/existing/file.txt'));
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.getValue()).toBe('file content');
      }

      const result2 = await mockPort.readFile(createTestFilePath('/nonexistent/file.txt'));
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
        code: createTestErrorCode('PERMISSION_DENIED'),
        message: createTestErrorMessage('Access denied'),
        path: createTestFilePath('/readonly/file.txt'),
      } as FileSystemError);

      vi.mocked(mockPort.writeFile).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.writeFile).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.writeFile(
        createTestFilePath('/writable/file.txt'),
        createTestDocumentContent('content'),
      );
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.writeFile(
        createTestFilePath('/readonly/file.txt'),
        createTestDocumentContent('content'),
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
        code: createTestErrorCode('PERMISSION_DENIED'),
        message: createTestErrorMessage('Cannot access path'),
      } as FileSystemError);

      vi.mocked(mockPort.exists).mockResolvedValueOnce(existsResult);
      vi.mocked(mockPort.exists).mockResolvedValueOnce(notExistsResult);
      vi.mocked(mockPort.exists).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.exists(createTestFilePath('/existing/file.txt'));
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe(true);
      }

      const result2 = await mockPort.exists(createTestFilePath('/nonexistent/file.txt'));
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(false);
      }

      const result3 = await mockPort.exists(createTestFilePath('/restricted/path'));
      expect(result3.isErr()).toBe(true);
    });

    test('delete returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: createTestErrorCode('NOT_FOUND'),
        message: createTestErrorMessage('File not found'),
      } as FileSystemError);

      vi.mocked(mockPort.delete).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.delete).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.delete(createTestFilePath('/existing/file.txt'));
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.delete(createTestFilePath('/nonexistent/file.txt'));
      expect(result2.isErr()).toBe(true);
    });
  });

  describe('Directory Operations', () => {
    test('readDirectory returns Result<FileInfo[], FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const files: FileInfo[] = [
        {
          path: createTestFilePath('/dir/file1.txt'),
          name: createTestFileName('file1.txt'),
          isDirectory: false,
          size: __createTestFileSize(100),
          modifiedAt: new Date('2023-01-01'),
        },
        {
          path: createTestFilePath('/dir/subdir'),
          name: createTestFileName('subdir'),
          isDirectory: true,
          modifiedAt: new Date('2023-01-02'),
        },
      ];

      const successResult = ok(files);
      const errorResult = err({
        code: createTestErrorCode('NOT_FOUND'),
        message: createTestErrorMessage('Directory not found'),
        path: createTestFilePath('/nonexistent'),
      } as FileSystemError);

      vi.mocked(mockPort.readDirectory).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.readDirectory).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.readDirectory(createTestFilePath('/existing/dir'));
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toHaveLength(2);
        expect(result1.value?.[0]?.name.getValue()).toBe('file1.txt');
        expect(result1.value?.[1]?.isDirectory).toBe(true);
      }

      const result2 = await mockPort.readDirectory(createTestFilePath('/nonexistent'));
      expect(result2.isErr()).toBe(true);
    });

    test('createDirectory returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const successResult = ok(undefined);
      const errorResult = err({
        code: createTestErrorCode('PERMISSION_DENIED'),
        message: createTestErrorMessage('Cannot create directory'),
      } as FileSystemError);

      vi.mocked(mockPort.createDirectory).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.createDirectory).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.createDirectory(createTestFilePath('/writable/newdir'));
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.createDirectory(createTestFilePath('/readonly/newdir'));
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
      const disposable = mockPort.watch?.(createTestFilePath('/test/path'), (event) => {
        receivedEvent = event;
      });

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
        id: createTestDocumentId('doc1'),
        content: createTestDocumentContent('document content'),
        metadata: {
          id: createTestDocumentId('doc1'),
          title: createTestTitle('Test Document'),
          modifiedAt: Timestamp.fromDate(new Date('2023-01-01')),
          size: __createTestFileSize(16),
          syncStatus: 'local',
        },
        version: createTestDocumentVersion(1),
      };

      const foundResult = ok(document);
      const notFoundResult = ok(null);
      const errorResult = err({
        code: createTestErrorCode('UNKNOWN'),
        message: createTestErrorMessage('Storage error'),
      } as FileSystemError);

      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(foundResult);
      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(notFoundResult);
      vi.mocked(mockPort.getStoredDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.getStoredDocument(createTestDocumentId('doc1'));
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value?.id.getValue()).toBe('doc1');
        expect(result1.value?.content.getValue()).toBe('document content');
      }

      const result2 = await mockPort.getStoredDocument(createTestDocumentId('nonexistent'));
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBeNull();
      }

      const result3 = await mockPort.getStoredDocument(createTestDocumentId('error-doc'));
      expect(result3.isErr()).toBe(true);
    });

    test('storeDocument returns Result<void, FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const document: StoredDocument = {
        id: createTestDocumentId('doc1'),
        content: createTestDocumentContent('document content'),
        metadata: {
          id: createTestDocumentId('doc1'),
          title: createTestTitle('Test Document'),
          modifiedAt: Timestamp.now(),
          size: __createTestFileSize(16),
        },
        version: createTestDocumentVersion(1),
      };

      const successResult = ok(undefined);
      const errorResult = err({
        code: createTestErrorCode('QUOTA_EXCEEDED'),
        message: createTestErrorMessage('Storage quota exceeded'),
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
        code: createTestErrorCode('NOT_FOUND'),
        message: createTestErrorMessage('Document not found'),
      } as FileSystemError);

      vi.mocked(mockPort.deleteStoredDocument).mockResolvedValueOnce(successResult);
      vi.mocked(mockPort.deleteStoredDocument).mockResolvedValueOnce(errorResult);

      const result1 = await mockPort.deleteStoredDocument(createTestDocumentId('doc1'));
      expect(result1.isOk()).toBe(true);

      const result2 = await mockPort.deleteStoredDocument(createTestDocumentId('nonexistent'));
      expect(result2.isErr()).toBe(true);
    });

    test('listStoredDocuments returns Result<DocumentMetadata[], FileSystemError>', async () => {
      const mockPort = createMockFileSystemPort();
      const metadata: DocumentMetadata[] = [
        {
          id: createTestDocumentId('doc1'),
          title: createTestTitle('Document 1'),
          modifiedAt: Timestamp.fromDate(new Date('2023-01-01')),
          size: __createTestFileSize(100),
          syncStatus: 'local',
        },
        {
          id: createTestDocumentId('doc2'),
          title: createTestTitle('Document 2'),
          modifiedAt: Timestamp.fromDate(new Date('2023-01-02')),
          size: __createTestFileSize(200),
          syncStatus: 'synced',
        },
      ];

      const successResult = ok(metadata);
      const errorResult = err({
        code: createTestErrorCode('UNKNOWN'),
        message: createTestErrorMessage('Storage error'),
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
        maxFileSize: __createTestFileSize(1024 * 1024),
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
          code: createTestErrorCode(code),
          message: createTestErrorMessage(`Test error: ${code}`),
          path: createTestFilePath('/test/path'),
        };

        expect(error.code.getValue()).toBe(code);
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
      });
    });

    test('FileSystemError path is optional', () => {
      const error: FileSystemError = {
        code: createTestErrorCode('UNKNOWN'),
        message: createTestErrorMessage('Generic error'),
      };

      expect(error.path).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    test('FileInfo structure is well-typed', () => {
      const fileInfo: FileInfo = {
        path: createTestFilePath('/test/file.txt'),
        name: createTestFileName('file.txt'),
        isDirectory: false,
        size: __createTestFileSize(1024),
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
        path: createTestFilePath('/test/file.txt'),
        name: createTestFileName('file.txt'),
        isDirectory: false,
      };

      expect(minimalFileInfo.size).toBeUndefined();
      expect(minimalFileInfo.modifiedAt).toBeUndefined();
    });

    test('StoredDocument structure is well-typed', () => {
      const document: StoredDocument = {
        id: createTestDocumentId('doc1'),
        content: createTestDocumentContent('content'),
        metadata: {
          id: createTestDocumentId('doc1'),
          title: createTestTitle('Test'),
          modifiedAt: Timestamp.now(),
          size: __createTestFileSize(7),
        },
        version: createTestDocumentVersion(1),
      };

      expect(document.id.getValue()).toBe('doc1');
      expect(document.content.getValue()).toBe('content');
      expect(document.metadata.id.getValue()).toBe('doc1');
      expect(document.version.getValue()).toBe(1);
    });

    test('DocumentMetadata syncStatus is optional', () => {
      const metadataWithSync: DocumentMetadata = {
        id: createTestDocumentId('doc1'),
        title: createTestTitle('Test'),
        modifiedAt: Timestamp.now(),
        size: __createTestFileSize(100),
        syncStatus: 'conflict',
      };

      const metadataWithoutSync: DocumentMetadata = {
        id: createTestDocumentId('doc2'),
        title: createTestTitle('Test 2'),
        modifiedAt: Timestamp.now(),
        size: __createTestFileSize(200),
      };

      expect(metadataWithSync.syncStatus).toBe('conflict');
      expect(metadataWithoutSync.syncStatus).toBeUndefined();
    });
  });
});
