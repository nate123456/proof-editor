/**
 * Tests for complex document event integration scenarios
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { activate } from '../extension.js';
import {
  createMockPanelManager,
  createMockValidationController,
  setupServiceMocks,
} from './shared/service-mocks.js';
import {
  createMockChangeEvent,
  createMockExtensionContext,
  createMockTextDocument,
  createMockTextEditor,
  createVSCodeMock,
} from './shared/vscode-test-setup.js';

// Set up all mocks
createVSCodeMock();
setupServiceMocks();

// Import mocked services
const mockValidationController = createMockValidationController();
const mockPanelManager = createMockPanelManager();

describe('Document Integration Scenarios', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service mocks
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentDebounced.mockClear();
    mockValidationController.clearDocumentValidation.mockClear();
    mockPanelManager.createPanelWithServices.mockClear();

    // Create test fixtures
    mockContext = createMockExtensionContext();

    // Set up VS Code API mock implementations
    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockImplementation((_handler) => {
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation((_handler) => {
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.onDidCloseTextDocument).mockImplementation((_handler) => {
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation((_handler) => {
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.commands.registerCommand).mockReturnValue({ dispose: vi.fn() });
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    });
  });

  describe('multiple document workflows', () => {
    it('should handle multiple proof files being opened', async () => {
      const doc1 = createMockTextDocument({ fileName: 'file1.proof' });
      const doc2 = createMockTextDocument({ fileName: 'file2.proof' });
      const doc3 = createMockTextDocument({ fileName: 'file3.proof' });

      const editor1 = createMockTextEditor(doc1);
      const editor2 = createMockTextEditor(doc2);
      const editor3 = createMockTextEditor(doc3);

      // Mock visibleTextEditors to include all editors
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [editor1, editor2, editor3],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const openHandler = onOpenCall?.[0];

      if (!openHandler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await openHandler(doc1);
      await openHandler(doc2);
      await openHandler(doc3);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(3);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed file types correctly', async () => {
      const proofDoc = createMockTextDocument();
      const jsDoc = createMockTextDocument({ languageId: 'javascript' });
      const pyDoc = createMockTextDocument({ languageId: 'python' });

      // Mock visibleTextEditors to include only the proof editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(proofDoc)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(proofDoc);
      await handler(jsDoc);
      await handler(pyDoc);

      // Only proof file should be processed
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(1);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
    });

    it('should handle documents with no visible editors', async () => {
      const mockTextDocument = createMockTextDocument();

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      // Should handle gracefully without trying to show tree
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });

    it('should handle rapid document opening and closing', async () => {
      const documents = Array.from({ length: 5 }, (_, i) =>
        createMockTextDocument({ fileName: `file${i}.proof` }),
      );

      const editors = documents.map((doc) => createMockTextEditor(doc));

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: editors,
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
      const openHandler = onOpenCall?.[0];
      const closeHandler = onCloseCall?.[0];

      if (!openHandler || !closeHandler) {
        throw new Error('Event handlers not registered');
      }

      // Rapidly open and close documents
      for (const doc of documents) {
        await openHandler(doc);
        await closeHandler(doc);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(5);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(5);
      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledTimes(5);
    });
  });

  describe('document change integration', () => {
    it('should handle rapid document changes', async () => {
      const mockTextDocument = createMockTextDocument();
      const mockChangeEvent = createMockChangeEvent(mockTextDocument);

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      // Clear mocks before this test
      mockValidationController.validateDocumentDebounced.mockClear();
      mockPanelManager.createPanelWithServices.mockClear();

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const changeHandler = onChangeCall?.[0];

      if (!changeHandler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      // Simulate rapid document changes
      for (let i = 0; i < 10; i++) {
        await changeHandler(mockChangeEvent);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(10);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(10);
    });

    it('should handle interleaved open/change/close events', async () => {
      const mockTextDocument = createMockTextDocument();
      const mockChangeEvent = createMockChangeEvent(mockTextDocument);

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];

      const openHandler = onOpenCall?.[0];
      const changeHandler = onChangeCall?.[0];
      const closeHandler = onCloseCall?.[0];

      if (!openHandler || !changeHandler || !closeHandler) {
        throw new Error('Event handlers not registered');
      }

      // Interleaved events
      await openHandler(mockTextDocument);
      await changeHandler(mockChangeEvent);
      await changeHandler(mockChangeEvent);
      await closeHandler(mockTextDocument);

      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(2);
      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent document operations', async () => {
      const documents = Array.from({ length: 3 }, (_, i) =>
        createMockTextDocument({ fileName: `concurrent${i}.proof` }),
      );

      const changeEvents = documents.map((doc) => createMockChangeEvent(doc));

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: documents.map((doc) => createMockTextEditor(doc)),
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];

      const openHandler = onOpenCall?.[0];
      const changeHandler = onChangeCall?.[0];

      if (!openHandler || !changeHandler) {
        throw new Error('Event handlers not registered');
      }

      // Concurrent operations
      const openPromises = documents.map((doc) => openHandler(doc));
      const changePromises = changeEvents.map((event) => changeHandler(event));

      await Promise.all([...openPromises, ...changePromises]);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(6); // 3 opens + 3 changes
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(3);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(3);
    });
  });

  describe('editor switching scenarios', () => {
    it('should handle switching between proof and non-proof editors', async () => {
      const proofDoc = createMockTextDocument();
      const jsDoc = createMockTextDocument({ languageId: 'javascript' });

      const proofEditor = createMockTextEditor(proofDoc);
      const jsEditor = createMockTextEditor(jsDoc);

      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      // Switch to proof editor
      await handler(proofEditor);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);

      // Switch to non-proof editor
      mockValidationController.validateDocumentImmediate.mockClear();
      await handler(jsEditor);
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();

      // Switch back to proof editor
      await handler(proofEditor);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid editor switching', async () => {
      const editors = Array.from({ length: 5 }, (_, i) =>
        createMockTextEditor(createMockTextDocument({ fileName: `rapid${i}.proof` })),
      );

      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      // Rapid switching
      for (const editor of editors) {
        await handler(editor);
      }

      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(5);
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(5);
    });

    it('should handle undefined editor states during switching', async () => {
      const proofEditor = createMockTextEditor(createMockTextDocument());

      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      // Start with undefined
      await handler(undefined);
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();

      // Switch to proof editor
      await handler(proofEditor);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);

      // Back to undefined
      mockValidationController.validateDocumentImmediate.mockClear();
      await handler(undefined);
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('workspace edge cases', () => {
    it('should handle extremely large document content', async () => {
      const hugeContent = 'a'.repeat(1_000_000); // 1MB string
      const hugeDocument = createMockTextDocument({
        getText: () => hugeContent,
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(hugeDocument)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // Should handle large documents without performance issues
      const startTime = Date.now();
      await handler(hugeDocument);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });

    it('should handle special characters in file paths', async () => {
      const specialPaths = [
        '/path/with spaces/file.proof',
        '/path/with-unicode-ñáéíóú/file.proof',
        '/path/with@special#chars$/file.proof',
        '/path/with[brackets]/file.proof',
      ];

      const documents = specialPaths.map((path) =>
        createMockTextDocument({
          fileName: path,
          uri: vscode.Uri.file(path),
        }),
      );

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: documents.map((doc) => createMockTextEditor(doc)),
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      for (const doc of documents) {
        await handler(doc);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(4);
    });

    it('should handle documents with unusual line endings', async () => {
      const documents = [
        createMockTextDocument({ eol: 1 }), // LF
        createMockTextDocument({ eol: 2 }), // CRLF
      ];

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: documents.map((doc) => createMockTextEditor(doc)),
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      for (const doc of documents) {
        await handler(doc);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(2);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(2);
    });
  });

  describe('memory and performance integration', () => {
    it('should handle high-frequency events without memory leaks', async () => {
      const mockTextDocument = createMockTextDocument();
      const mockChangeEvent = createMockChangeEvent(mockTextDocument);

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      // Simulate high-frequency changes
      const promises = Array.from({ length: 100 }, () => handler(mockChangeEvent));
      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // Should handle high frequency efficiently
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max for 100 operations
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(100);
    });

    it('should maintain performance with many open documents', async () => {
      const documents = Array.from({ length: 20 }, (_, i) =>
        createMockTextDocument({ fileName: `performance${i}.proof` }),
      );

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: documents.map((doc) => createMockTextEditor(doc)),
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      const startTime = Date.now();
      for (const doc of documents) {
        await handler(doc);
      }
      const endTime = Date.now();

      // Should handle many documents efficiently
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds max for 20 documents
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(20);
    });
  });
});
