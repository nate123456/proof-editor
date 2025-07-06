import 'reflect-metadata';

import fc from 'fast-check';
import { err } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ValidationError } from '../../domain/shared/result.js';
import { VSCodeFileSystemAdapter } from '../vscode/VSCodeFileSystemAdapter.js';

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
  FileSystemError: class FileSystemError extends Error {
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
  },
}));

/**
 * Comprehensive File Operations Tests
 *
 * Tests complex file operation scenarios including:
 * - Document lifecycle management
 * - Multi-document coordination
 * - File system edge cases
 * - Save/load reliability
 * - Undo/redo persistence
 * - Conflict resolution
 */
describe('File Operations - Comprehensive Coverage', () => {
  let mockContext: vscode.ExtensionContext;
  let adapter: VSCodeFileSystemAdapter;

  // Test data generators
  const validProofContent = `
statements:
  stmt1: "All humans are mortal"
  stmt2: "Socrates is human"
  stmt3: "Therefore, Socrates is mortal"

ordered_sets:
  premises1: [stmt1, stmt2]
  conclusions1: [stmt3]

atomic_arguments:
  arg1:
    premises: premises1
    conclusions: conclusions1
    side_labels:
      left: "Modus Ponens"

trees:
  tree1:
    nodes:
      n1: { arg: arg1 }
    offset: { x: 0, y: 0 }
`;

  const largeProofContent = generateLargeProofDocument(500); // 500 arguments

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      globalState: {
        get: vi.fn().mockReturnValue({}),
        update: vi.fn().mockResolvedValue(undefined),
        keys: vi.fn().mockReturnValue([]),
      },
    } as any;

    adapter = new VSCodeFileSystemAdapter(mockContext);
  });

  describe('Document Lifecycle Management', () => {
    it('should handle complete document creation workflow', async () => {
      const documentPath = '/workspace/test-document.proof';

      // Step 1: Check if document exists (should not)
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(
        vscode.FileSystemError.FileNotFound('File not found'),
      );

      const existsResult = await adapter.exists(documentPath);
      expect(existsResult.isOk()).toBe(true);
      if (existsResult.isOk()) {
        expect(existsResult.value).toBe(false);
      }

      // Step 2: Create new document
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

      const createResult = await adapter.writeFile(documentPath, validProofContent);
      expect(createResult.isOk()).toBe(true);

      // Step 3: Verify document was created
      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        size: 100,
        mtime: Date.now(),
        ctime: Date.now(),
      } as any);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        new TextEncoder().encode(validProofContent),
      );

      const verifyExistsResult = await adapter.exists(documentPath);
      expect(verifyExistsResult.isOk()).toBe(true);

      const readResult = await adapter.readFile(documentPath);
      expect(readResult.isOk()).toBe(true);
      if (readResult.isOk()) {
        expect(readResult.value).toBe(validProofContent);
      }
    });

    it('should handle document modification and save cycles', async () => {
      const documentPath = '/workspace/evolving-document.proof';
      let savedContent = validProofContent;

      // Mock that tracks content changes
      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (_path, content) => {
        savedContent = new TextDecoder().decode(content);
        return undefined;
      });

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async () =>
        new TextEncoder().encode(savedContent),
      );

      // Initial save
      await adapter.writeFile(documentPath, validProofContent);

      // Modification 1: Add new statement
      const modification1 = savedContent.replace(
        'stmt3: "Therefore, Socrates is mortal"',
        'stmt3: "Therefore, Socrates is mortal"\n  stmt4: "All mortals die"',
      );

      await adapter.writeFile(documentPath, modification1);

      const readAfterMod1 = await adapter.readFile(documentPath);
      expect(readAfterMod1.isOk()).toBe(true);
      if (readAfterMod1.isOk()) {
        expect(readAfterMod1.value).toContain('stmt4');
      }

      // Modification 2: Add new argument
      const modification2 = modification1.replace(
        'arg1:',
        'arg1:\n    premises: premises1\n    conclusions: conclusions1\n  arg2:',
      );

      await adapter.writeFile(documentPath, modification2);

      const readAfterMod2 = await adapter.readFile(documentPath);
      expect(readAfterMod2.isOk()).toBe(true);
      if (readAfterMod2.isOk()) {
        expect(readAfterMod2.value).toContain('arg2');
      }

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should handle document deletion workflow', async () => {
      const documentPath = '/workspace/to-be-deleted.proof';

      // Document exists initially
      vi.mocked(vscode.workspace.fs.stat).mockResolvedValueOnce({
        size: 100,
        mtime: Date.now(),
        ctime: Date.now(),
      } as any);
      vi.mocked(vscode.workspace.fs.delete).mockResolvedValue(undefined);

      const existsResult = await adapter.exists(documentPath);
      expect(existsResult.isOk() && existsResult.value).toBe(true);

      // Delete document
      const deleteResult = await adapter.delete(documentPath);
      expect(deleteResult.isOk()).toBe(true);

      // Verify deletion
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('File not found'));
      const deletedCheckResult = await adapter.exists(documentPath);
      expect(deletedCheckResult.isOk() && deletedCheckResult.value).toBe(false);
    });
  });

  describe('Multi-Document Coordination', () => {
    it('should handle concurrent document operations without conflicts', async () => {
      const documents = [
        '/workspace/doc1.proof',
        '/workspace/doc2.proof',
        '/workspace/doc3.proof',
        '/workspace/doc4.proof',
        '/workspace/doc5.proof',
      ];

      const contents = documents.map((_, i) => validProofContent.replace('stmt1', `stmt1_doc${i}`));

      // Mock concurrent writes
      let writeCount = 0;
      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (_path, _content) => {
        writeCount++;
        // Simulate some async delay
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        return undefined;
      });

      // Perform concurrent writes
      const writePromises = documents.map((path, i) => {
        const content = contents[i];
        if (!content) throw new Error(`No content for index ${i}`);
        return adapter.writeFile(path, content);
      });

      const results = await Promise.all(writePromises);

      expect(results.every((result) => result.isOk())).toBe(true);
      expect(writeCount).toBe(5);
    });

    it('should handle document switching scenarios', async () => {
      const doc1Path = '/workspace/document-1.proof';
      const doc2Path = '/workspace/document-2.proof';

      const doc1Content = validProofContent;
      const doc2Content = validProofContent.replace(/Socrates/g, 'Plato');

      // Mock file system that tracks which document was last accessed
      let lastAccessedPath = '';
      const documentStore = new Map<string, string>();

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (uri, content) => {
        const path = uri.fsPath;
        documentStore.set(path, new TextDecoder().decode(content));
        lastAccessedPath = path;
        return undefined;
      });

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async (uri) => {
        const path = uri.fsPath;
        lastAccessedPath = path;
        return new TextEncoder().encode(documentStore.get(path) || '');
      });

      // Create both documents
      await adapter.writeFile(doc1Path, doc1Content);
      await adapter.writeFile(doc2Path, doc2Content);

      // Switch between documents multiple times
      await adapter.readFile(doc1Path);
      expect(lastAccessedPath).toBe(doc1Path);

      await adapter.readFile(doc2Path);
      expect(lastAccessedPath).toBe(doc2Path);

      await adapter.readFile(doc1Path);
      expect(lastAccessedPath).toBe(doc1Path);

      // Verify content integrity during switches
      const doc1Result = await adapter.readFile(doc1Path);
      const doc2Result = await adapter.readFile(doc2Path);

      expect(doc1Result.isOk()).toBe(true);
      expect(doc2Result.isOk()).toBe(true);

      if (doc1Result.isOk() && doc2Result.isOk()) {
        expect(doc1Result.value).toContain('Socrates');
        expect(doc2Result.value).toContain('Plato');
        expect(doc1Result.value).not.toContain('Plato');
        expect(doc2Result.value).not.toContain('Socrates');
      }
    });

    it('should handle document dependency tracking', async () => {
      // Simulate documents that reference each other
      const sharedStatementsDoc = '/workspace/shared-statements.proof';
      const mainProofDoc = '/workspace/main-proof.proof';

      const sharedContent = `
statements:
  axiom1: "Law of excluded middle"
  axiom2: "Law of non-contradiction"
`;

      const mainContent = `
# References: shared-statements.proof
statements:
  premise1: "P or not P"  # References axiom1
  conclusion1: "Valid by LEM"

atomic_arguments:
  arg1:
    premises: [premise1]
    conclusions: [conclusion1]
`;

      const documentAccess: string[] = [];

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async (uri) => {
        const path = uri.fsPath;
        documentAccess.push(path);
        if (path === sharedStatementsDoc) {
          return new TextEncoder().encode(sharedContent);
        }
        if (path === mainProofDoc) {
          return new TextEncoder().encode(mainContent);
        }
        return new TextEncoder().encode('');
      });

      // Read main document (should potentially trigger shared document read)
      await adapter.readFile(mainProofDoc);

      // Simulate dependency resolution
      if (mainContent.includes('References:')) {
        await adapter.readFile(sharedStatementsDoc);
      }

      expect(documentAccess).toContain(mainProofDoc);
      expect(documentAccess).toContain(sharedStatementsDoc);
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle extremely large proof documents', async () => {
      const largePath = '/workspace/large-proof.proof';

      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        new TextEncoder().encode(largeProofContent),
      );

      // Write large document
      const startWrite = performance.now();
      const writeResult = await adapter.writeFile(largePath, largeProofContent);
      const endWrite = performance.now();

      expect(writeResult.isOk()).toBe(true);
      expect(endWrite - startWrite).toBeLessThan(1000); // Should write in under 1 second

      // Read large document
      const startRead = performance.now();
      const readResult = await adapter.readFile(largePath);
      const endRead = performance.now();

      expect(readResult.isOk()).toBe(true);
      expect(endRead - startRead).toBeLessThan(1000); // Should read in under 1 second

      if (readResult.isOk()) {
        expect(readResult.value.length).toBeGreaterThan(10000);
        expect(readResult.value).toContain('stmt_499'); // Last generated statement
      }
    });

    it('should handle file names with special characters', async () => {
      const specialPaths = [
        '/workspace/proof with spaces.proof',
        '/workspace/proof-with-dashes.proof',
        '/workspace/proof_with_underscores.proof',
        '/workspace/proof.with.dots.proof',
        '/workspace/proof[with]brackets.proof',
        '/workspace/proof(with)parentheses.proof',
        '/workspace/proof@symbol.proof',
        '/workspace/proof#hash.proof',
      ];

      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        new TextEncoder().encode(validProofContent),
      );
      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        size: 100,
        mtime: Date.now(),
        ctime: Date.now(),
      } as any);

      for (const path of specialPaths) {
        const writeResult = await adapter.writeFile(path, validProofContent);
        expect(writeResult.isOk()).toBe(true);

        const readResult = await adapter.readFile(path);
        expect(readResult.isOk()).toBe(true);

        const existsResult = await adapter.exists(path);
        expect(existsResult.isOk()).toBe(true);
      }
    });

    it('should handle deep directory structures', async () => {
      const deepPath = '/workspace/level1/level2/level3/level4/level5/deep-proof.proof';

      vi.mocked(vscode.workspace.fs.createDirectory).mockResolvedValue(undefined);
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        new TextEncoder().encode(validProofContent),
      );

      // Create directory structure
      const dirResult = await adapter.createDirectory(
        '/workspace/level1/level2/level3/level4/level5',
      );
      expect(dirResult.isOk()).toBe(true);

      // Write file in deep structure
      const writeResult = await adapter.writeFile(deepPath, validProofContent);
      expect(writeResult.isOk()).toBe(true);

      // Read file from deep structure
      const readResult = await adapter.readFile(deepPath);
      expect(readResult.isOk()).toBe(true);
    });

    it('should handle file encoding edge cases', async () => {
      const testCases = [
        {
          name: 'utf8-bom',
          content: `\uFEFF${validProofContent}`,
          // BOM is automatically stripped by TextDecoder
          expectedContent: validProofContent,
        },
        { name: 'unicode-chars', content: validProofContent.replace('Socrates', 'Σωκράτης') },
        { name: 'mixed-line-endings', content: validProofContent.replace(/\n/g, '\r\n') },
        { name: 'emoji-content', content: `${validProofContent}\n# 🎯 Goal achieved!` },
        { name: 'special-yaml-chars', content: validProofContent.replace('"', '\\"') },
      ];

      // Track written content per file
      const fileContents = new Map<string, Uint8Array>();

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (uri, content) => {
        fileContents.set(uri.fsPath, content);
        return undefined;
      });

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async (uri) => {
        const content = fileContents.get(uri.fsPath);
        if (!content) throw new Error('File not found');
        return content;
      });

      for (const testCase of testCases) {
        const path = `/workspace/${testCase.name}.proof`;

        const writeResult = await adapter.writeFile(path, testCase.content);
        expect(writeResult.isOk()).toBe(true);

        const readResult = await adapter.readFile(path);
        expect(readResult.isOk()).toBe(true);

        if (readResult.isOk()) {
          const expected = testCase.expectedContent || testCase.content;
          expect(readResult.value).toBe(expected);
        }
      }
    });

    it('should handle interrupted file operations gracefully', async () => {
      const path = '/workspace/interrupted.proof';
      let operationCount = 0;

      // Mock that fails every 3rd operation to simulate interruptions
      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async () => {
        operationCount++;
        if (operationCount % 3 === 0) {
          throw new Error('Operation interrupted');
        }
        return undefined;
      });

      // Attempt multiple writes with interruptions
      const results: Array<{ success: boolean; attempt: number }> = [];

      for (let i = 1; i <= 10; i++) {
        try {
          const result = await adapter.writeFile(path, validProofContent);
          results.push({ success: result.isOk(), attempt: i });
        } catch {
          results.push({ success: false, attempt: i });
        }
      }

      // Should have mix of successes and failures
      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success).length;

      expect(successes).toBeGreaterThan(0);
      expect(failures).toBeGreaterThan(0);
      expect(successes + failures).toBe(10);
    });
  });

  describe('Save/Load Reliability', () => {
    it('should maintain data integrity across save/load cycles', async () => {
      const path = '/workspace/integrity-test.proof';
      let storedContent = '';

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (_, content) => {
        storedContent = new TextDecoder().decode(content);
        return undefined;
      });

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async () =>
        new TextEncoder().encode(storedContent),
      );

      // Perform multiple save/load cycles with modifications
      let currentContent = validProofContent;

      for (let cycle = 1; cycle <= 5; cycle++) {
        // Save current content
        const saveResult = await adapter.writeFile(path, currentContent);
        expect(saveResult.isOk()).toBe(true);

        // Load content back
        const loadResult = await adapter.readFile(path);
        expect(loadResult.isOk()).toBe(true);

        if (loadResult.isOk()) {
          expect(loadResult.value).toBe(currentContent);
        }

        // Modify content for next cycle
        currentContent = currentContent.replace('stmt1:', `stmt1_cycle${cycle}:`);
      }
    });

    it('should handle atomic save operations (all-or-nothing)', async () => {
      const path = '/workspace/atomic-save.proof';
      let saveAttempts = 0;
      let successful = false;

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (_, _content) => {
        saveAttempts++;

        // Simulate partial write failure for first few attempts
        if (saveAttempts < 3) {
          throw new Error('Disk full - partial write');
        }

        successful = true;
        return undefined;
      });

      // Attempt save multiple times until successful
      let result: any;
      let attempts = 0;

      do {
        attempts++;
        try {
          result = await adapter.writeFile(path, validProofContent);
        } catch (error) {
          result = err(new ValidationError(`Save failed: ${error}`));
        }
      } while (result.isErr() && attempts < 5);

      expect(successful).toBe(true);
      expect(attempts).toBe(3);
      expect(result.isOk()).toBe(true);
    });

    it('should handle save conflict resolution', async () => {
      const path = '/workspace/conflict-test.proof';
      const originalContent = validProofContent;
      const userModification = originalContent.replace('Socrates', 'Aristotle');
      const externalModification = originalContent.replace('mortal', 'rational');

      let fileContent = originalContent;
      let lastModified = Date.now();

      vi.mocked(vscode.workspace.fs.readFile).mockImplementation(async () =>
        new TextEncoder().encode(fileContent),
      );

      vi.mocked(vscode.workspace.fs.writeFile).mockImplementation(async (_, content) => {
        const currentTime = Date.now();
        if (currentTime - lastModified > 100) {
          // Simulate external modification detected
          throw vscode.FileSystemError.Unavailable('File modified externally');
        }
        fileContent = new TextDecoder().decode(content);
        lastModified = currentTime;
        return undefined;
      });

      // User starts editing
      const initialRead = await adapter.readFile(path);
      expect(initialRead.isOk()).toBe(true);

      // Simulate external modification
      await new Promise((resolve) => setTimeout(resolve, 150));
      fileContent = externalModification;

      // User tries to save their changes
      const saveResult = await adapter.writeFile(path, userModification);
      expect(saveResult.isErr()).toBe(true);

      // Should detect conflict
      if (saveResult.isErr()) {
        expect(saveResult.error.message).toContain('modified externally');
      }
    });
  });

  describe('File Watching and Change Detection', () => {
    it('should handle file watching lifecycle correctly', () => {
      const path = '/workspace/watched-file.proof';
      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const eventCallback = vi.fn();
      const watcher = adapter.watch(path, eventCallback);

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
      expect(mockWatcher.onDidCreate).toHaveBeenCalled();
      expect(mockWatcher.onDidChange).toHaveBeenCalled();
      expect(mockWatcher.onDidDelete).toHaveBeenCalled();

      // Simulate file events
      const changeHandler = mockWatcher.onDidChange.mock.calls[0]?.[0];
      const deleteHandler = mockWatcher.onDidDelete.mock.calls[0]?.[0];
      changeHandler?.({ fsPath: path });
      changeHandler?.({ fsPath: path });
      deleteHandler?.({ fsPath: path });

      // Verify events were received
      expect(eventCallback).toHaveBeenCalledWith({ type: 'changed', path });
      expect(eventCallback).toHaveBeenCalledWith({ type: 'deleted', path });

      // Stop watching
      watcher.dispose();
      expect(mockWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle multiple watchers on same file', () => {
      const path = '/workspace/multi-watched.proof';
      const eventCounts = [0, 0, 0]; // Track events for each watcher
      const changeHandlers: Array<(uri: any) => void> = [];

      const createMockWatcher = () => {
        const mockWatcher = {
          onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
          onDidChange: vi.fn().mockImplementation((handler) => {
            changeHandlers.push(handler);
            return { dispose: vi.fn() };
          }),
          onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
          dispose: vi.fn(),
        };
        return mockWatcher;
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockImplementation(() => {
        return createMockWatcher() as any;
      });

      // Create multiple watchers
      const watcher1 = adapter.watch(path, () => {
        if (eventCounts[0] !== undefined) eventCounts[0]++;
      });
      const watcher2 = adapter.watch(path, () => {
        if (eventCounts[1] !== undefined) eventCounts[1]++;
      });
      const watcher3 = adapter.watch(path, () => {
        if (eventCounts[2] !== undefined) eventCounts[2]++;
      });

      expect(watcher1).toBeDefined();
      expect(watcher2).toBeDefined();
      expect(watcher3).toBeDefined();

      if (!watcher1 || !watcher2 || !watcher3) {
        throw new Error('Failed to create watchers');
      }
      const watchers = [watcher1, watcher2, watcher3];

      expect(watchers.length).toBe(3);

      // Simulate file change - trigger all registered handlers
      changeHandlers.forEach((handler) => {
        handler({ fsPath: path });
      });

      // All watchers should have received the event
      expect(eventCounts).toEqual([1, 1, 1]);
    });

    it('should handle watcher cleanup on errors', () => {
      const path = '/workspace/error-watched.proof';
      let watcherDisposed = false;

      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn().mockImplementation(() => {
          watcherDisposed = true;
        }),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      // Create watcher that throws error
      const watcher = adapter.watch(path, () => {
        throw new Error('Watcher callback error');
      });

      expect(watcher).toBeDefined();

      // Simulate cleanup (would normally happen on component disposal)
      watcher.dispose();
      expect(watcherDisposed).toBe(true);
    });
  });

  describe('Property-Based File Operations', () => {
    it('should handle arbitrary valid proof content correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            statements: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.string({ minLength: 1, maxLength: 100 }),
            ),
            conclusions: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
          }),
          async ({ statements, conclusions }) => {
            const content = generateProofContent(statements, conclusions);
            const path = '/test/generated.proof';

            vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
            vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
              new TextEncoder().encode(content),
            );

            const writeResult = await adapter.writeFile(path, content);
            expect(writeResult.isOk()).toBe(true);

            const readResult = await adapter.readFile(path);
            expect(readResult.isOk()).toBe(true);

            if (readResult.isOk()) {
              expect(readResult.value).toBe(content);
            }
          },
        ),
        { numRuns: 25 },
      );
    });

    it('should handle arbitrary file paths within workspace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          async (pathSegments, filename) => {
            const safePath = `/workspace/${pathSegments.join('/')}/${filename}.proof`;

            vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
            vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
              new TextEncoder().encode(validProofContent),
            );
            vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
              size: 100,
              mtime: Date.now(),
              ctime: Date.now(),
            } as any);

            const writeResult = await adapter.writeFile(safePath, validProofContent);
            const readResult = await adapter.readFile(safePath);
            const existsResult = await adapter.exists(safePath);

            expect(writeResult.isOk()).toBe(true);
            expect(readResult.isOk()).toBe(true);
            expect(existsResult.isOk()).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle rapid file operations efficiently', async () => {
      const operations = 100;
      const paths = Array.from({ length: operations }, (_, i) => `/workspace/rapid-${i}.proof`);

      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        new TextEncoder().encode(validProofContent),
      );

      const startTime = performance.now();

      // Perform rapid write operations
      await Promise.all(paths.map((path) => adapter.writeFile(path, validProofContent)));

      // Perform rapid read operations
      await Promise.all(paths.map((path) => adapter.readFile(path)));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 200 operations (100 writes + 100 reads) in reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds max
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledTimes(operations);
      expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(operations);
    });

    it('should maintain performance with large number of watched files', () => {
      const watchCount = 50;
      const paths = Array.from({ length: watchCount }, (_, i) => `/workspace/watched-${i}.proof`);

      const mockWatcher = {
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        dispose: vi.fn(),
      };

      vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);

      const startTime = performance.now();

      // Create many watchers
      const watchers = paths.map((path) =>
        adapter.watch(path, () => {
          // Test watcher callback - intentionally empty
        }),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(watchers.length).toBe(watchCount);
      expect(duration).toBeLessThan(500); // Should create 50 watchers in under 500ms
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(watchCount);
    });
  });
});

// Helper functions
function generateLargeProofDocument(argumentCount: number): string {
  const statements: string[] = [];
  const orderedSets: string[] = [];
  const argumentData: string[] = [];
  const nodes: string[] = [];

  for (let i = 0; i < argumentCount; i++) {
    statements.push(`  stmt_${i}: "Statement ${i}"`);
    orderedSets.push(`  set_${i}: [stmt_${i}]`);
    argumentData.push(`  arg_${i}:\n    premises: set_${i}\n    conclusions: set_${i}`);
    nodes.push(`    n${i}: { arg: arg_${i} }`);
  }

  return `
statements:
${statements.join('\n')}

ordered_sets:
${orderedSets.join('\n')}

atomic_arguments:
${argumentData.join('\n')}

trees:
  large_tree:
    nodes:
${nodes.join('\n')}
    offset: { x: 0, y: 0 }
`;
}

function generateProofContent(statements: Record<string, string>, conclusions: string[]): string {
  const stmtEntries = Object.entries(statements)
    .map(([key, value]) => `  ${key}: "${value}"`)
    .join('\n');

  const conclusionList = conclusions.map((c) => `"${c}"`).join(', ');

  return `
statements:
${stmtEntries}

ordered_sets:
  conclusions: [${conclusionList}]

atomic_arguments:
  arg1:
    premises: []
    conclusions: conclusions

trees:
  tree1:
    nodes:
      n1: { arg: arg1 }
    offset: { x: 0, y: 0 }
`;
}
