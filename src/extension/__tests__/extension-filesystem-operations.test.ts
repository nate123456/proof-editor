/**
 * File system operations tests for VS Code extension
 *
 * This file contains tests for file system integration including:
 * - File watching and change detection
 * - Auto-save functionality and error handling
 * - File creation, modification, and deletion events
 * - Storage synchronization and backup
 * - File system capability detection
 *
 * Domain: File system integration and persistence layer
 */

import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../extension.js';
import {
  type ExtensionTestContext,
  mockContainer,
  mockPanelManager,
  setupExtensionTest,
} from './shared/extension-test-setup.js';

describe('Extension - File System Operations', () => {
  let testContext: ExtensionTestContext;

  beforeEach(async () => {
    testContext = setupExtensionTest();
    await activate(testContext.mockContext);
  });

  describe('file watching setup', () => {
    it('should create file system watcher for .proof files', async () => {
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*.proof');
    });

    it('should handle file change events', async () => {
      // Get the file watcher mock
      const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
        ?.value;

      // Get the onDidChange handler
      const onDidChangeCall = watcherMock?.onDidChange.mock.calls[0];
      const changeHandler = onDidChangeCall?.[0];

      if (changeHandler) {
        const mockUri = vscode.Uri.file('/test/document.proof');
        const mockEditor = {
          ...testContext.mockTextEditor,
          document: { ...testContext.mockTextDocument, uri: mockUri, isDirty: false },
        };

        // Mock visibleTextEditors to include our editor
        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: [mockEditor],
          writable: true,
          configurable: true,
        });

        await changeHandler(mockUri);

        // Should refresh proof tree panel
        expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      }
    });

    it('should not refresh when file is dirty', async () => {
      const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
        ?.value;
      const onDidChangeCall = watcherMock?.onDidChange.mock.calls[0];
      const changeHandler = onDidChangeCall?.[0];

      if (changeHandler) {
        const mockUri = vscode.Uri.file('/test/document.proof');
        const mockEditor = {
          ...testContext.mockTextEditor,
          document: { ...testContext.mockTextDocument, uri: mockUri, isDirty: true },
        };

        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: [mockEditor],
          writable: true,
          configurable: true,
        });

        const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
        vi.mocked(ProofTreePanel.createWithServices).mockClear();

        await changeHandler(mockUri);

        // Should not refresh proof tree panel when file is dirty
        expect(ProofTreePanel.createWithServices).not.toHaveBeenCalled();
      }
    });

    it('should handle file creation events', async () => {
      const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
        ?.value;
      const onDidCreateCall = watcherMock?.onDidCreate.mock.calls[0];
      const createHandler = onDidCreateCall?.[0];

      if (createHandler) {
        const mockUri = vscode.Uri.file('/test/new-document.proof');

        // Should handle creation without errors
        await expect(createHandler(mockUri)).resolves.not.toThrow();
      }
    });

    it('should handle file deletion events', async () => {
      const watcherMock = vi.mocked(vscode.workspace.createFileSystemWatcher).mock.results[0]
        ?.value;
      const onDidDeleteCall = watcherMock?.onDidDelete.mock.calls[0];
      const deleteHandler = onDidDeleteCall?.[0];

      if (deleteHandler) {
        const mockUri = vscode.Uri.file('/test/deleted-document.proof');
        const mockFileSystem = mockContainer.resolve('IFileSystemPort');

        await deleteHandler(mockUri);

        expect(mockFileSystem.deleteStoredDocument).toHaveBeenCalledWith(
          '/test/deleted-document.proof',
        );
      }
    });

    it('should not create watcher when file system port cannot watch', async () => {
      // Mock file system port to not support watching
      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      vi.mocked(mockFileSystem.capabilities).mockReturnValueOnce({
        canWatch: false,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: true,
        persistence: 'permanent',
      });

      // Clear existing mocks and reactivate
      vi.clearAllMocks();
      testContext.mockContext.subscriptions.length = 0;

      await activate(testContext.mockContext);

      // Should not create file watcher
      expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
    });
  });

  describe('auto-save functionality', () => {
    it('should auto-save after successful argument population', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock dirty document
      const dirtyEditor = {
        ...testContext.mockTextEditor,
        document: {
          ...testContext.mockTextDocument,
          isDirty: true,
          save: vi.fn().mockResolvedValue(true),
        },
      };
      vscode.window.activeTextEditor = dirtyEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      vi.mocked(mockFileSystem.storeDocument).mockResolvedValueOnce(ok(undefined));

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await commandHandler();

      expect(dirtyEditor.document.save).toHaveBeenCalled();
      expect(mockFileSystem.storeDocument).toHaveBeenCalledWith({
        id: dirtyEditor.document.fileName,
        content: dirtyEditor.document.getText(),
        metadata: expect.objectContaining({
          id: dirtyEditor.document.fileName,
          syncStatus: 'synced',
        }),
        version: 1,
      });
    });

    it('should skip auto-save when document is not dirty', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock clean document
      const cleanEditor = {
        ...testContext.mockTextEditor,
        document: { ...testContext.mockTextDocument, isDirty: false, save: vi.fn() },
      };
      vscode.window.activeTextEditor = cleanEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      await commandHandler();

      expect(cleanEditor.document.save).not.toHaveBeenCalled();
    });

    it('should handle auto-save errors gracefully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      // Mock document that fails to save
      const faultyEditor = {
        ...testContext.mockTextEditor,
        document: {
          ...testContext.mockTextDocument,
          isDirty: true,
          save: vi.fn().mockRejectedValue(new Error('Save failed')),
        },
      };
      vscode.window.activeTextEditor = faultyEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      // Should not throw despite save failure
      await expect(commandHandler()).resolves.not.toThrow();
      expect(faultyEditor.document.save).toHaveBeenCalled();
    });

    it('should handle file system storage errors gracefully', async () => {
      vscode.window.activeTextEditor = testContext.mockTextEditor;

      const dirtyEditor = {
        ...testContext.mockTextEditor,
        document: {
          ...testContext.mockTextDocument,
          isDirty: true,
          save: vi.fn().mockResolvedValue(true),
        },
      };
      vscode.window.activeTextEditor = dirtyEditor;

      vi.mocked(vscode.window.showInputBox)
        .mockResolvedValueOnce('Premise')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Conclusion')
        .mockResolvedValueOnce('');

      const mockBootstrap = mockContainer.resolve('BootstrapController');
      vi.mocked(mockBootstrap.populateEmptyArgument).mockResolvedValueOnce(
        ok({
          data: {
            argumentId: 'arg-123',
            premises: ['All humans are mortal', 'Socrates is human'],
            conclusions: ['Socrates is mortal'],
            ruleName: 'Modus Ponens',
          },
        }),
      );

      const mockFileSystem = mockContainer.resolve('IFileSystemPort');
      vi.mocked(mockFileSystem.storeDocument).mockRejectedValueOnce(new Error('Storage failed'));

      const commandCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.populateEmptyArgument');
      const commandHandler = commandCall?.[1] as () => Promise<void>;

      // Should not throw despite storage failure
      await expect(commandHandler()).resolves.not.toThrow();
      expect(dirtyEditor.document.save).toHaveBeenCalled();
      expect(mockFileSystem.storeDocument).toHaveBeenCalled();
    });
  });
});
