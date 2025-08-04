/**
 * Tests for document validation events and error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextDocumentChangeEvent } from 'vscode';
import * as vscode from 'vscode';

import { activate } from '../extension.js';
import {
  createMockPanelManager,
  createMockUIPort,
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
const _mockPanelManager = createMockPanelManager();
const mockUIPort = createMockUIPort();

describe('Document Validation Events', () => {
  let mockContext: vscode.ExtensionContext;
  let mockTextDocument: TextDocument;
  let mockChangeEvent: TextDocumentChangeEvent;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service mocks
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentDebounced.mockClear();
    mockValidationController.clearDocumentValidation.mockClear();
    mockUIPort.showError.mockClear();

    // Create test fixtures
    mockContext = createMockExtensionContext();
    mockTextDocument = createMockTextDocument();
    mockChangeEvent = createMockChangeEvent(mockTextDocument);

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
      ignoreCreateEvents: false,
      ignoreChangeEvents: false,
      ignoreDeleteEvents: false,
    });
  });

  describe('validation on document open', () => {
    it('should trigger immediate validation when document opens', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
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

      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should handle validation controller exceptions in document open', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      // Mock validation controller to throw
      mockValidationController.validateDocumentImmediate.mockImplementation(() => {
        throw new Error('Validation service crashed');
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Validation failed: Validation service crashed',
      );
    });

    it('should not validate non-proof documents on open', async () => {
      const nonProofDoc = createMockTextDocument({ languageId: 'javascript' });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(nonProofDoc);

      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('validation on document change', () => {
    it('should trigger debounced validation when document changes', async () => {
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

      await handler(mockChangeEvent);

      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should handle validation controller exceptions in document change', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      mockValidationController.validateDocumentDebounced.mockImplementation(() => {
        throw new Error('Validation debounce failed');
      });

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      await handler(mockChangeEvent);

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Validation failed: Validation debounce failed',
      );
    });

    it('should not validate non-proof documents on change', async () => {
      const nonProofDoc = createMockTextDocument({ languageId: 'javascript' });
      const nonProofChangeEvent = createMockChangeEvent(nonProofDoc);

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      await handler(nonProofChangeEvent);

      expect(mockValidationController.validateDocumentDebounced).not.toHaveBeenCalled();
    });
  });

  describe('validation on editor change', () => {
    it('should trigger immediate validation when switching to proof editor', async () => {
      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(createMockTextEditor(mockTextDocument));

      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should not validate when switching to non-proof editor', async () => {
      const nonProofEditor = createMockTextEditor(
        createMockTextDocument({ languageId: 'javascript' }),
      );

      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(nonProofEditor);

      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('validation cleanup on document close', () => {
    it('should clear validation when proof document closes', async () => {
      await activate(mockContext);

      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
      const handler = onCloseCall?.[0];

      if (!handler) {
        throw new Error('onDidCloseTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should not clear validation for non-proof document close', async () => {
      const nonProofDoc = createMockTextDocument({ languageId: 'javascript' });

      await activate(mockContext);

      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
      const handler = onCloseCall?.[0];

      if (!handler) {
        throw new Error('onDidCloseTextDocument handler not registered');
      }

      await handler(nonProofDoc);

      expect(mockValidationController.clearDocumentValidation).not.toHaveBeenCalled();
    });

    it('should handle validation cleanup exceptions gracefully', async () => {
      mockValidationController.clearDocumentValidation.mockImplementation(() => {
        throw new Error('Validation cleanup failed');
      });

      await activate(mockContext);

      const onCloseCall = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
      const handler = onCloseCall?.[0];

      if (!handler) {
        throw new Error('onDidCloseTextDocument handler not registered');
      }

      // Should not throw even if validation cleanup fails
      await expect(handler(mockTextDocument)).resolves.not.toThrow();
    });
  });

  describe('validation error scenarios', () => {
    it('should handle validation errors for corrupted document content', async () => {
      const corruptedDoc = createMockTextDocument({
        getText: () => {
          throw new Error('Document content corrupted');
        },
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(corruptedDoc)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(corruptedDoc);

      // Should handle document content errors gracefully
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle multiple concurrent validation failures', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      mockValidationController.validateDocumentDebounced.mockImplementation(() => {
        throw new Error('Concurrent validation failure');
      });

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      // Simulate multiple concurrent validation failures
      const promises = Array.from({ length: 3 }, () => handler(mockChangeEvent));
      await Promise.all(promises);

      expect(mockUIPort.showError).toHaveBeenCalledTimes(3);
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Validation failed: Concurrent validation failure',
      );
    });

    it('should recover from validation service crashes', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      // First call fails, second succeeds
      mockValidationController.validateDocumentImmediate
        .mockImplementationOnce(() => {
          throw new Error('Validation service crashed');
        })
        .mockImplementationOnce(() => {
          // Success
        });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // First call should fail and show error
      await handler(mockTextDocument);
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        'Validation failed: Validation service crashed',
      );

      // Second call should succeed
      mockUIPort.showError.mockClear();
      await handler(mockTextDocument);
      expect(mockUIPort.showError).not.toHaveBeenCalled();
    });
  });

  describe('validation performance', () => {
    it('should handle validation of large documents efficiently', async () => {
      const largeContent = 'a'.repeat(100_000); // 100KB string
      const largeDoc = createMockTextDocument({
        getText: () => largeContent,
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(largeDoc)],
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
      await handler(largeDoc);
      const endTime = Date.now();

      // Validation should complete quickly (less than 100ms for mocked services)
      expect(endTime - startTime).toBeLessThan(100);
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalled();
    });

    it('should not block on debounced validation calls', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockTextDocument)],
        writable: true,
        configurable: true,
      });

      // Mock debounced validation to take some time
      mockValidationController.validateDocumentDebounced.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      const startTime = Date.now();
      await handler(mockChangeEvent);
      const endTime = Date.now();

      // Handler should return quickly even with debounced validation
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
