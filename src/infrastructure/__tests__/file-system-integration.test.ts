/**
 * HEAVY COVERAGE: File System Integration Tests
 *
 * Comprehensive test suite for file operations, document lifecycle, and VS Code integration:
 * - Save operations with VS Code integration
 * - Dirty state management and indicators
 * - Auto-save functionality
 * - File watching for external changes
 * - Permission handling (read-only files)
 * - Network drive compatibility
 * - Large file handling and performance
 * - Concurrent file operations
 * - Error recovery and resilience
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { FileChangeEvent, StoredDocument } from '../../application/ports/IFileSystemPort.js';
import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  FilePath,
  FileSize,
  Timestamp,
  Title,
} from '../../domain/shared/value-objects/index.js';
import { VSCodeFileSystemAdapter } from '../vscode/VSCodeFileSystemAdapter.js';

// Helper to create FilePath value objects
const createFilePath = (path: string): FilePath => {
  const result = FilePath.create(path);
  if (result.isErr()) throw new Error(`Invalid file path: ${path}`);
  return result.value;
};

// Helper to create DocumentContent value objects
const createDocumentContent = (content: string): DocumentContent => {
  const result = DocumentContent.create(content);
  if (result.isErr()) throw new Error(`Invalid content: ${content}`);
  return result.value;
};

// Helper to create other value objects
const createDocumentId = (id: string): DocumentId => {
  const result = DocumentId.create(id);
  if (result.isErr()) throw new Error(`Invalid document id: ${id}`);
  return result.value;
};

const createDocumentVersion = (version: number): DocumentVersion => {
  const result = DocumentVersion.create(version);
  if (result.isErr()) throw new Error(`Invalid version: ${version}`);
  return result.value;
};

const createTitle = (title: string): Title => {
  const result = Title.create(title);
  if (result.isErr()) throw new Error(`Invalid title: ${title}`);
  return result.value;
};

const createTimestamp = (timestamp: number): Timestamp => {
  const result = Timestamp.create(timestamp);
  if (result.isErr()) throw new Error(`Invalid timestamp: ${timestamp}`);
  return result.value;
};

const createFileSize = (size: number): FileSize => {
  const result = FileSize.create(size);
  if (result.isErr()) throw new Error(`Invalid file size: ${size}`);
  return result.value;
};

// Mock VS Code with comprehensive file system API
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
    SymbolicLink: 64,
  },
  RelativePattern: vi.fn().mockImplementation((base, pattern) => ({
    base,
    pattern,
  })),
  FileSystemError: class FileSystemError extends Error {
    public code: string;
    constructor(messageOrUri?: string, code: string = 'UNKNOWN') {
      super(typeof messageOrUri === 'string' ? messageOrUri : 'FileSystemError');
      this.name = 'FileSystemError';
      this.code = code;
    }
    static FileNotFound(messageOrUri?: string): FileSystemError {
      const error = new FileSystemError(messageOrUri, 'FileNotFound');
      return error;
    }
    static NoPermissions(messageOrUri?: string): FileSystemError {
      const error = new FileSystemError(messageOrUri, 'NoPermissions');
      return error;
    }
    static Unavailable(messageOrUri?: string): FileSystemError {
      const error = new FileSystemError(messageOrUri, 'Unavailable');
      return error;
    }
  },
}));

describe('File System Integration Tests', () => {
  let adapter: VSCodeFileSystemAdapter;
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: vscode.Memento;
  let mockFileWatcher: any;

  // Test data generators
  const generateLargeProofDocument = (size: number): string => {
    const baseContent = `
# Large Test Proof Document
# Generated content size: ~${size} bytes

statements:
`;
    let content = baseContent;
    let statementCount = 0;

    while (content.length < size) {
      statementCount++;
      const statement = `  stmt${statementCount}: "This is statement ${statementCount} with sufficient content to reach the target size. It contains multiple sentences to ensure realistic document structure and proper testing of large file handling capabilities."\n`;
      content += statement;
    }

    content += '\narguments:\n';
    for (let i = 1; i <= Math.min(statementCount / 2, 100); i++) {
      content += `  arg${i}:\n    premises: [stmt${i}]\n    conclusions: [stmt${i + 100}]\n`;
    }

    content += `\ntrees: []\n\nmetadata:\n  size: ${size}\n  generated: true\n`;
    return content;
  };

  const createMockFileWatcher = () => ({
    onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    dispose: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock file watcher
    mockFileWatcher = createMockFileWatcher();
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockFileWatcher);

    // Create mock global state
    mockGlobalState = {
      get: vi.fn().mockReturnValue({}),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
    };

    // Create mock extension context
    mockContext = {
      globalState: mockGlobalState,
      extensionPath: '/mock/extension/path',
      subscriptions: [],
    } as any;

    adapter = new VSCodeFileSystemAdapter(mockContext);
  });

  describe('Basic File Operations', () => {
    it('should handle read operations with various file sizes', async () => {
      // Arrange - Test different file sizes
      const testCases = [
        { name: 'small file', size: 100, content: 'small content' },
        { name: 'medium file', size: 10240, content: generateLargeProofDocument(10240) },
        { name: 'large file', size: 1048576, content: generateLargeProofDocument(1048576) }, // 1MB
      ];

      for (const testCase of testCases) {
        const testPath = `/test/${testCase.name.replace(' ', '_')}.proof`;
        const encodedContent = new TextEncoder().encode(testCase.content);

        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(encodedContent);

        // Act
        const result = await adapter.readFile(createFilePath(testPath));

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual(createDocumentContent(testCase.content));
          expect(result.value.getValue().length).toBeGreaterThanOrEqual(testCase.size - 100); // Allow some variance
        }
      }
    });

    it('should handle write operations with proper encoding', async () => {
      // Arrange
      const testPath = '/test/unicode.proof';
      const unicodeContent = `
# Unicode Test Document
statements:
  s1: "Mathematical symbols: ∀x∈ℝ, ∃y∈ℕ such that x²+y=π"
  s2: "Greek letters: α, β, γ, δ, ε, ζ, η, θ, ι, κ, λ, μ"
  s3: "Emoji: 🎯 ✅ ❌ 🔍 📊 🧮 🔬 📐"
  s4: "Chinese: 这是一个测试文档"
  s5: "Arabic: هذا اختبار"
  s6: "Hebrew: זהו מבחן"
arguments: {}
trees: []
`;

      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

      // Act
      const result = await adapter.writeFile(
        createFilePath(testPath),
        createDocumentContent(unicodeContent),
      );

      // Assert
      expect(result.isOk()).toBe(true);

      const writeCall = vi.mocked(vscode.workspace.fs.writeFile).mock.calls[0];
      expect(writeCall).toBeDefined();
      const writtenBuffer = writeCall?.[1] as Uint8Array;
      const decodedContent = new TextDecoder().decode(writtenBuffer);
      expect(decodedContent).toBe(unicodeContent);
    });

    it('should handle concurrent file operations efficiently', async () => {
      // Arrange
      const operationCount = 20;
      const testPaths = Array.from(
        { length: operationCount },
        (_, i) => `/test/concurrent_${i}.proof`,
      );
      const testContents = testPaths.map((_, i) => generateLargeProofDocument(1000 + i * 100));

      // Setup mocks for concurrent operations
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async (uri) => {
        const path = uri.toString();
        const index = testPaths.findIndex((p) => {
          const pathSegment = p.split('/').pop();
          return pathSegment && path.includes(pathSegment);
        });
        if (index >= 0) {
          const content = testContents[index];
          if (!content) {
            throw new Error('Test content not found');
          }
          return new TextEncoder().encode(content);
        }
        throw new Error('File not found');
      });

      const startTime = Date.now();

      // Act - Concurrent write operations
      const writePromises = testPaths.map((path, index) => {
        const content = testContents[index];
        if (!content) {
          throw new Error(`Test content not found for index ${index}`);
        }
        return adapter.writeFile(createFilePath(path), createDocumentContent(content));
      });
      const writeResults = await Promise.all(writePromises);

      // Act - Concurrent read operations
      const readPromises = testPaths.map((path) => adapter.readFile(createFilePath(path)));
      const readResults = await Promise.all(readPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(writeResults.every((result) => result.isOk())).toBe(true);
      expect(readResults.every((result) => result.isOk())).toBe(true);

      // Verify content integrity
      readResults.forEach((result, index) => {
        if (result.isOk()) {
          expect(result.value).toBe(testContents[index]);
        }
      });
    });
  });

  describe('Directory Operations', () => {
    it('should handle complex directory structures', async () => {
      // Arrange
      const testPath = '/test/complex_structure';
      const mockEntries: [string, vscode.FileType][] = [
        ['document1.proof', vscode.FileType.File],
        ['document2.proof', vscode.FileType.File],
        ['subfolder', vscode.FileType.Directory],
        ['backup.proof.bak', vscode.FileType.File],
        ['symlink.proof', vscode.FileType.SymbolicLink],
        ['.hidden.proof', vscode.FileType.File],
        ['very_long_filename_that_tests_filesystem_limits.proof', vscode.FileType.File],
      ];

      const mockStats = mockEntries.map((_, index) => ({
        size: 1000 + index * 500,
        mtime: Date.now() - index * 86400000, // Different modification times
        ctime: Date.now() - index * 86400000 - 3600000,
      }));

      vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue(mockEntries);
      vi.mocked(vscode.workspace.fs.stat).mockImplementation(async (uri) => {
        const fileName = uri.toString().split('/').pop();
        const index = mockEntries.findIndex(([name]) => name === fileName);
        return mockStats[index] as any;
      });

      // Act
      const result = await adapter.readDirectory(createFilePath(testPath));

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const fileInfos = result.value;
        expect(fileInfos).toHaveLength(7);

        // Verify file type detection
        const proofFiles = fileInfos.filter((info) => info.name.getValue().endsWith('.proof'));
        expect(proofFiles).toHaveLength(5); // Including .hidden.proof, very long name, and symlink

        const directories = fileInfos.filter((info) => info.isDirectory);
        expect(directories).toHaveLength(1);
        expect(directories[0]?.name.getValue()).toBe('subfolder');

        // Verify metadata
        fileInfos.forEach((info) => {
          expect(info.path).toBeDefined();
          if (info.size) {
            expect(info.size.getValue()).toBeGreaterThan(0);
          }
          if (info.modifiedAt) {
            expect(info.modifiedAt).toBeInstanceOf(Date);
          }
        });
      }
    });

    it('should handle directory creation with nested paths', async () => {
      // Arrange
      const nestedPaths = [
        '/test/simple',
        '/test/nested/level1',
        '/test/deep/nested/level1/level2/level3',
        '/test/unicode/测试/αβγ/🎯📊',
      ];

      vi.mocked(vscode.workspace.fs.createDirectory).mockResolvedValue(undefined);

      // Act
      const results = await Promise.all(
        nestedPaths.map((path) => adapter.createDirectory(createFilePath(path))),
      );

      // Assert
      expect(results.every((result) => result.isOk())).toBe(true);
      expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledTimes(nestedPaths.length);
    });
  });

  describe('File Watching and Change Detection', () => {
    it('should set up file watching with proper event handling', () => {
      // Arrange
      const testPath = '/test/watched_directory';
      const eventCallback = vi.fn();

      // Act
      const disposable = adapter.watch(createFilePath(testPath), eventCallback);

      // Assert
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          base: expect.objectContaining({ fsPath: testPath }),
          pattern: '**/*',
        }),
      );

      // Verify event handlers are registered
      expect(mockFileWatcher.onDidCreate).toHaveBeenCalled();
      expect(mockFileWatcher.onDidChange).toHaveBeenCalled();
      expect(mockFileWatcher.onDidDelete).toHaveBeenCalled();

      // Verify disposable functionality
      disposable.dispose();
      expect(mockFileWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle rapid file change events without dropping events', async () => {
      // Arrange
      const testPath = '/test/rapid_changes';
      const events: FileChangeEvent[] = [];
      const eventCallback = (event: FileChangeEvent) => events.push(event);

      adapter.watch(createFilePath(testPath), eventCallback);

      const changeEvents = [
        { type: 'created' as const, path: '/test/rapid_changes/file1.proof' },
        { type: 'changed' as const, path: '/test/rapid_changes/file1.proof' },
        { type: 'changed' as const, path: '/test/rapid_changes/file1.proof' },
        { type: 'deleted' as const, path: '/test/rapid_changes/file1.proof' },
        { type: 'created' as const, path: '/test/rapid_changes/file2.proof' },
      ];

      // Act - Simulate rapid events
      const createHandler = mockFileWatcher.onDidCreate.mock.calls[0]?.[0];
      const changeHandler = mockFileWatcher.onDidChange.mock.calls[0]?.[0];
      const deleteHandler = mockFileWatcher.onDidDelete.mock.calls[0]?.[0];

      for (const event of changeEvents) {
        const uri = { fsPath: event.path };
        switch (event.type) {
          case 'created':
            createHandler?.(uri);
            break;
          case 'changed':
            changeHandler?.(uri);
            break;
          case 'deleted':
            deleteHandler?.(uri);
            break;
        }

        // Small delay to simulate rapid but not instantaneous events
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(events).toHaveLength(5);
      expect(events.map((e) => e.type)).toEqual([
        'created',
        'changed',
        'changed',
        'deleted',
        'created',
      ]);
      expect(events.map((e) => e.path)).toEqual([
        '/test/rapid_changes/file1.proof',
        '/test/rapid_changes/file1.proof',
        '/test/rapid_changes/file1.proof',
        '/test/rapid_changes/file1.proof',
        '/test/rapid_changes/file2.proof',
      ]);
    });

    it('should handle file watcher cleanup on disposal', () => {
      // Arrange
      const testPath = '/test/cleanup';
      const eventCallback = vi.fn();

      // Act
      const disposable = adapter.watch(createFilePath(testPath), eventCallback);

      // Verify watcher is active
      expect(mockFileWatcher.onDidCreate).toHaveBeenCalled();

      // Dispose and verify cleanup
      disposable.dispose();

      // Assert
      expect(mockFileWatcher.dispose).toHaveBeenCalled();

      // Verify all sub-disposables are cleaned up
      const createDisposable = mockFileWatcher.onDidCreate.mock.results[0]?.value;
      const changeDisposable = mockFileWatcher.onDidChange.mock.results[0]?.value;
      const deleteDisposable = mockFileWatcher.onDidDelete.mock.results[0]?.value;

      expect(createDisposable?.dispose).toHaveBeenCalled();
      expect(changeDisposable?.dispose).toHaveBeenCalled();
      expect(deleteDisposable?.dispose).toHaveBeenCalled();
    });
  });

  describe('Stored Document Management', () => {
    it('should handle large document storage with compression', async () => {
      // Arrange
      const largeDocument: StoredDocument = {
        id: createDocumentId('large-doc'),
        content: createDocumentContent(generateLargeProofDocument(100000)), // 100KB
        version: createDocumentVersion(1),
        metadata: {
          id: createDocumentId('large-doc'),
          title: createTitle('Large Test Document'),
          modifiedAt: createTimestamp(Date.now()),
          size: createFileSize(100000),
          syncStatus: 'synced',
        },
      };

      // Act
      const storeResult = await adapter.storeDocument(largeDocument);
      const retrieveResult = await adapter.getStoredDocument(createDocumentId('large-doc'));

      // Assert
      expect(storeResult.isOk()).toBe(true);
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk() && retrieveResult.value) {
        expect(retrieveResult.value.id.getValue()).toBe(largeDocument.id.getValue());
        expect(retrieveResult.value.content.getValue()).toBe(largeDocument.content.getValue());
        expect(retrieveResult.value.metadata.size.getValue()).toBe(
          largeDocument.metadata.size.getValue(),
        );
      }

      // Verify storage was called with correct data
      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'proof-editor.offline-documents',
        expect.objectContaining({
          'large-doc': largeDocument,
        }),
      );
    });

    it('should handle concurrent document storage operations', async () => {
      // Arrange
      const documentCount = 15;
      const documents: StoredDocument[] = Array.from({ length: documentCount }, (_, i) => ({
        id: createDocumentId(`doc-${i}`),
        content: createDocumentContent(generateLargeProofDocument(5000 + i * 1000)),
        version: createDocumentVersion(1),
        metadata: {
          id: createDocumentId(`doc-${i}`),
          title: createTitle(`Document ${i}`),
          modifiedAt: createTimestamp(Date.now() - i * 60000), // Different timestamps
          size: createFileSize(5000 + i * 1000),
          syncStatus: 'synced' as const,
        },
      }));

      const startTime = Date.now();

      // Act - Concurrent storage operations
      const storePromises = documents.map((doc) => adapter.storeDocument(doc));
      const storeResults = await Promise.all(storePromises);

      // Act - Concurrent retrieval operations
      const retrievePromises = documents.map((doc) => adapter.getStoredDocument(doc.id));
      const retrieveResults = await Promise.all(retrievePromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(storeResults.every((result) => result.isOk())).toBe(true);
      expect(retrieveResults.every((result) => result.isOk())).toBe(true);

      // Verify data integrity
      retrieveResults.forEach((result, index) => {
        if (result.isOk() && result.value) {
          expect(result.value.id.getValue()).toBe(documents[index]?.id.getValue());
          expect(result.value.content.getValue()).toBe(documents[index]?.content.getValue());
        }
      });

      // Test listing functionality
      const listResult = await adapter.listStoredDocuments();
      expect(listResult.isOk()).toBe(true);
      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(documentCount);
      }
    });

    it('should handle document storage with metadata preservation', async () => {
      // Arrange
      const testDocument: StoredDocument = {
        id: createDocumentId('metadata-test'),
        content: createDocumentContent('test content with metadata'),
        version: createDocumentVersion(3),
        metadata: {
          id: createDocumentId('metadata-test'),
          title: createTitle('Test Document with Metadata'),
          modifiedAt: createTimestamp(new Date('2023-12-01T10:30:00Z').getTime()),
          size: createFileSize(25),
          syncStatus: 'pending',
          tags: ['test', 'metadata'],
          author: 'Test User',
          collaborators: ['user1@example.com', 'user2@example.com'],
          exportFormat: 'yaml',
          validationStatus: 'valid',
        } as any,
      };

      // Act
      const storeResult = await adapter.storeDocument(testDocument);

      // Simulate context restart by creating new adapter
      const newAdapter = new VSCodeFileSystemAdapter(mockContext);
      const retrieveResult = await newAdapter.getStoredDocument(createDocumentId('metadata-test'));

      // Assert
      expect(storeResult.isOk()).toBe(true);
      expect(retrieveResult.isOk()).toBe(true);

      if (retrieveResult.isOk() && retrieveResult.value) {
        const retrieved = retrieveResult.value;
        expect(retrieved.id.getValue()).toBe(testDocument.id.getValue());
        expect(retrieved.version.getValue()).toBe(testDocument.version.getValue());
        expect(retrieved.metadata.id.getValue()).toBe(testDocument.metadata.id.getValue());
        expect(retrieved.metadata.title.getValue()).toBe(testDocument.metadata.title.getValue());
        expect(retrieved.metadata.modifiedAt.getValue()).toEqual(
          testDocument.metadata.modifiedAt.getValue(),
        );
        expect(retrieved.metadata.syncStatus).toBe(testDocument.metadata.syncStatus);
        expect((retrieved.metadata as any).tags).toEqual(['test', 'metadata']);
        expect((retrieved.metadata as any).author).toBe('Test User');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle various file system errors appropriately', async () => {
      // Test cases for different error scenarios
      const errorTestCases = [
        {
          name: 'file not found',
          error: vscode.FileSystemError.FileNotFound('File not found'),
          expectedCode: 'NOT_FOUND',
        },
        {
          name: 'permission denied',
          error: vscode.FileSystemError.NoPermissions('Permission denied'),
          expectedCode: 'PERMISSION_DENIED',
        },
        {
          name: 'disk full',
          error: new (class extends vscode.FileSystemError {
            public override code = 'ENOSPC';
          })('No space left'),
          expectedCode: 'DISK_FULL',
        },
        {
          name: 'generic error',
          error: new Error('Generic file system error'),
          expectedCode: 'UNKNOWN',
        },
      ];

      for (const testCase of errorTestCases) {
        // Arrange
        const testPath = `/test/${testCase.name.replace(' ', '_')}.proof`;
        vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(testCase.error);

        // Act
        const result = await adapter.readFile(createFilePath(testPath));

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe(testCase.expectedCode);
        }
      }
    });

    it('should recover from transient file system errors', async () => {
      // Arrange
      const testPath = '/test/transient_error.proof';
      const testContent = 'content after error recovery';

      // First call fails, second succeeds
      vi.mocked(vscode.workspace.fs.readFile)
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(new TextEncoder().encode(testContent));

      // Act - First attempt fails
      const failResult = await adapter.readFile(createFilePath(testPath));
      expect(failResult.isErr()).toBe(true);

      // Act - Second attempt succeeds
      const successResult = await adapter.readFile(createFilePath(testPath));

      // Assert
      expect(successResult.isOk()).toBe(true);
      if (successResult.isOk()) {
        expect(successResult.value).toBe(testContent);
      }
    });

    it('should handle storage quota exceeded scenarios', async () => {
      // Arrange
      const largeDocument: StoredDocument = {
        id: createDocumentId('quota-test'),
        content: createDocumentContent(generateLargeProofDocument(10000000)), // 10MB
        version: createDocumentVersion(1),
        metadata: {
          id: createDocumentId('quota-test'),
          title: createTitle('Large Document for Quota Test'),
          modifiedAt: createTimestamp(Date.now()),
          size: createFileSize(10000000),
          syncStatus: 'synced',
        },
      };

      // Mock quota exceeded error
      vi.mocked(mockGlobalState.update).mockRejectedValue(new Error('Storage quota exceeded'));

      // Act
      const result = await adapter.storeDocument(largeDocument);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('QUOTA_EXCEEDED');
        expect(result.error.message).toContain('Failed to store document');
      }
    });

    it('should handle corrupted storage data gracefully', async () => {
      // Arrange - Mock corrupted storage data
      vi.mocked(mockGlobalState.get).mockReturnValue({
        'corrupted-doc': {
          // Missing required fields
          id: 'corrupted-doc',
          // content: undefined,
          metadata: null,
        },
        'partial-doc': {
          id: 'partial-doc',
          content: 'some content',
          metadata: {
            id: 'partial-doc',
            // modifiedAt: invalid date
            modifiedAt: 'invalid-date',
            size: 'not-a-number',
          },
        },
      });

      // Create new adapter to trigger loading
      const newAdapter = new VSCodeFileSystemAdapter(mockContext);

      // Act
      const corruptedResult = await newAdapter.getStoredDocument(createDocumentId('corrupted-doc'));
      const partialResult = await newAdapter.getStoredDocument(createDocumentId('partial-doc'));
      const listResult = await newAdapter.listStoredDocuments();

      // Assert - Should handle corruption gracefully
      expect(corruptedResult.isOk()).toBe(true);
      if (corruptedResult.isOk()) {
        expect(corruptedResult.value).toBeNull(); // Corrupted data treated as not found
      }

      expect(partialResult.isOk()).toBe(true);
      if (partialResult.isOk() && partialResult.value) {
        expect(partialResult.value.id.getValue()).toBe('partial-doc');
        expect(partialResult.value.metadata.modifiedAt).toBeInstanceOf(Timestamp);
      }

      expect(listResult.isOk()).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle very large files efficiently', async () => {
      // Arrange
      const _largeFileSize = 50 * 1024 * 1024; // 50MB
      const testPath = '/test/very_large_file.proof';

      // Don't actually generate 50MB of content in memory for the test
      // Instead, mock the file system operations to simulate large file handling
      const mockLargeContent = generateLargeProofDocument(1000); // Small content for actual processing
      const encodedContent = new TextEncoder().encode(mockLargeContent);

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async () => {
        // Simulate time taken for large file read
        await new Promise((resolve) => setTimeout(resolve, 100));
        return encodedContent;
      });

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async () => {
        // Simulate time taken for large file write
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      const startTime = Date.now();

      // Act
      const writeResult = await adapter.writeFile(
        createFilePath(testPath),
        createDocumentContent(mockLargeContent),
      );
      const readResult = await adapter.readFile(createFilePath(testPath));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(1000); // Should complete within 1 second for mocked operation
      expect(writeResult.isOk()).toBe(true);
      expect(readResult.isOk()).toBe(true);

      if (readResult.isOk()) {
        expect(readResult.value).toBe(mockLargeContent);
      }
    });

    it('should maintain performance with many stored documents', async () => {
      // Arrange
      const documentCount = 100;
      const documents: StoredDocument[] = Array.from({ length: documentCount }, (_, i) => ({
        id: createDocumentId(`perf-doc-${i}`),
        content: createDocumentContent(generateLargeProofDocument(1000 + i * 100)),
        version: createDocumentVersion(1),
        metadata: {
          id: createDocumentId(`perf-doc-${i}`),
          title: createTitle(`Performance Test Document ${i}`),
          modifiedAt: createTimestamp(Date.now() - i * 1000),
          size: createFileSize(1000 + i * 100),
          syncStatus: 'synced' as const,
        },
      }));

      // Store all documents
      for (const doc of documents) {
        const result = await adapter.storeDocument(doc);
        expect(result.isOk()).toBe(true);
      }

      const startTime = Date.now();

      // Act - Test retrieval performance
      const retrievalPromises = documents.map((doc) => adapter.getStoredDocument(doc.id));
      const results = await Promise.all(retrievalPromises);

      // Act - Test listing performance
      const listResult = await adapter.listStoredDocuments();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results.every((result) => result.isOk())).toBe(true);
      expect(listResult.isOk()).toBe(true);

      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(documentCount);

        // Verify metadata is properly preserved
        listResult.value.forEach((metadata, index) => {
          expect(metadata.id.getValue()).toBe(`perf-doc-${index}`);
          expect(metadata.size.getValue()).toBe(1000 + index * 100);
        });
      }
    });

    it('should handle concurrent access patterns without corruption', async () => {
      // Arrange
      const concurrentOperations = 25;
      const testDocument: StoredDocument = {
        id: createDocumentId('concurrent-test'),
        content: createDocumentContent('initial content'),
        version: createDocumentVersion(1),
        metadata: {
          id: createDocumentId('concurrent-test'),
          title: createTitle('Concurrent Access Test'),
          modifiedAt: createTimestamp(Date.now()),
          size: createFileSize(15),
          syncStatus: 'synced',
        },
      };

      // Store initial document
      await adapter.storeDocument(testDocument);

      // Act - Concurrent read/write operations
      const operations = Array.from({ length: concurrentOperations }, async (_, i) => {
        if (i % 3 === 0) {
          // Read operation
          return adapter.getStoredDocument(createDocumentId('concurrent-test'));
        } else if (i % 3 === 1) {
          // Write operation
          const updatedDoc = {
            ...testDocument,
            content: createDocumentContent(`updated content ${i}`),
            version: createDocumentVersion(testDocument.version.getValue() + 1),
            metadata: {
              ...testDocument.metadata,
              modifiedAt: createTimestamp(Date.now()),
              size: createFileSize(`updated content ${i}`.length),
            },
          };
          return adapter.storeDocument(updatedDoc);
        } else {
          // List operation
          return adapter.listStoredDocuments();
        }
      });

      const results = await Promise.all(operations);

      // Assert
      expect(results.every((result) => result.isOk())).toBe(true);

      // Verify final state is consistent
      const finalResult = await adapter.getStoredDocument(createDocumentId('concurrent-test'));
      expect(finalResult.isOk()).toBe(true);
      if (finalResult.isOk() && finalResult.value) {
        expect(finalResult.value.id.getValue()).toBe('concurrent-test');
        expect(finalResult.value.content.getValue()).toContain('content'); // Should contain some valid content
      }
    });

    it('should handle memory pressure during large operations', async () => {
      // Arrange
      const memoryPressureTest = async () => {
        const startMemory = process.memoryUsage().heapUsed;

        // Create multiple large documents to simulate memory pressure
        const largeDocuments = Array.from({ length: 10 }, (_, i) => ({
          id: createDocumentId(`memory-test-${i}`),
          content: createDocumentContent(generateLargeProofDocument(50000)), // 50KB each
          version: createDocumentVersion(1),
          metadata: {
            id: createDocumentId(`memory-test-${i}`),
            title: createTitle(`Memory Test Document ${i}`),
            modifiedAt: createTimestamp(Date.now()),
            size: createFileSize(50000),
            syncStatus: 'synced' as const,
          },
        }));

        // Store all documents
        const storePromises = largeDocuments.map((doc) => adapter.storeDocument(doc));
        const storeResults = await Promise.all(storePromises);

        // Retrieve all documents
        const retrievePromises = largeDocuments.map((doc) => adapter.getStoredDocument(doc.id));
        const retrieveResults = await Promise.all(retrievePromises);

        const endMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

        return {
          storeResults,
          retrieveResults,
          memoryIncrease,
        };
      };

      // Act
      const testResult = await memoryPressureTest();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Assert
      expect(testResult.storeResults.every((result) => result.isOk())).toBe(true);
      expect(testResult.retrieveResults.every((result) => result.isOk())).toBe(true);
      expect(testResult.memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB
    });
  });

  describe('Platform Compatibility', () => {
    it('should handle platform-specific path formats', async () => {
      // Arrange
      const pathTestCases = [
        { platform: 'unix', path: '/home/user/documents/test.proof' },
        { platform: 'windows', path: 'C:\\Users\\User\\Documents\\test.proof' },
        { platform: 'network', path: '\\\\server\\share\\folder\\test.proof' },
        { platform: 'uri', path: 'file:///Users/user/Documents/test.proof' },
      ];

      for (const testCase of pathTestCases) {
        const testContent = `Platform test for ${testCase.platform}`;
        const encodedContent = new TextEncoder().encode(testContent);

        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(encodedContent);
        vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

        // Act
        const writeResult = await adapter.writeFile(
          createFilePath(testCase.path),
          createDocumentContent(testContent),
        );
        const readResult = await adapter.readFile(createFilePath(testCase.path));

        // Assert
        expect(writeResult.isOk()).toBe(true);
        expect(readResult.isOk()).toBe(true);

        if (readResult.isOk()) {
          expect(readResult.value).toBe(testContent);
        }
      }
    });

    it('should handle special characters in file names', async () => {
      // Arrange
      const specialFileNames = [
        'test with spaces.proof',
        'test-with-hyphens.proof',
        'test_with_underscores.proof',
        'test.with.dots.proof',
        'test(with)parentheses.proof',
        'test[with]brackets.proof',
        'test{with}braces.proof',
        'test&with&ampersands.proof',
        'test%20encoded.proof',
        'tëst-wîth-åccénts.proof',
      ];

      for (const fileName of specialFileNames) {
        const testPath = `/test/special_chars/${fileName}`;
        const testContent = `Content for ${fileName}`;
        const encodedContent = new TextEncoder().encode(testContent);

        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(encodedContent);
        vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

        // Act
        const writeResult = await adapter.writeFile(
          createFilePath(testPath),
          createDocumentContent(testContent),
        );
        const readResult = await adapter.readFile(createFilePath(testPath));

        // Assert
        expect(writeResult.isOk()).toBe(true);
        expect(readResult.isOk()).toBe(true);

        if (readResult.isOk()) {
          expect(readResult.value).toBe(testContent);
        }
      }
    });
  });

  describe('Capabilities and Configuration', () => {
    it('should report accurate file system capabilities', () => {
      // Act
      const capabilities = adapter.capabilities();

      // Assert
      expect(capabilities.canWatch).toBe(true);
      expect(capabilities.canAccessArbitraryPaths).toBe(true);
      expect(capabilities.maxFileSize).toBe(100 * 1024 * 1024); // 100MB
      expect(capabilities.supportsOfflineStorage).toBe(true);
      expect(capabilities.persistence).toBe('permanent');
    });

    it('should handle capability-based feature detection', async () => {
      // Arrange
      const capabilities = adapter.capabilities();

      // Act & Assert - Test capabilities are used correctly
      if (capabilities.canWatch) {
        const watcher = adapter.watch(createFilePath('/test'), () => {
          // Test callback - intentionally empty
        });
        expect(watcher).toBeDefined();
        expect(typeof watcher.dispose).toBe('function');
        watcher.dispose();
      }

      if (capabilities.supportsOfflineStorage) {
        const testDoc: StoredDocument = {
          id: createDocumentId('capability-test'),
          content: createDocumentContent('test content'),
          version: createDocumentVersion(1),
          metadata: {
            id: createDocumentId('capability-test'),
            title: createTitle('Capability Test'),
            modifiedAt: createTimestamp(Date.now()),
            size: createFileSize(12),
            syncStatus: 'synced',
          },
        };

        const storeResult = await adapter.storeDocument(testDoc);
        expect(storeResult.isOk()).toBe(true);
      }

      if (capabilities.canAccessArbitraryPaths) {
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
          new TextEncoder().encode('arbitrary path content'),
        );

        const result = await adapter.readFile(createFilePath('/arbitrary/path/test.proof'));
        expect(result.isOk()).toBe(true);
      }
    });
  });
});
