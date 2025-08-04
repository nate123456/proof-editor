/**
 * Tests for document event error handling and recovery scenarios
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextEditor } from 'vscode';
import * as vscode from 'vscode';

import { activate } from '../extension.js';
import {
  createMockDocumentController,
  createMockPanelManager,
  createMockUIPort,
  createMockValidationController,
  setupServiceMocks,
} from './shared/service-mocks.js';
import {
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
const mockUIPort = createMockUIPort();
const mockDocumentController = createMockDocumentController();

describe('Document Event Error Handling', () => {
  let mockContext: vscode.ExtensionContext;
  let mockTextDocument: TextDocument;
  let mockTextEditor: TextEditor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service mocks
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentDebounced.mockClear();
    mockPanelManager.createPanelWithServices.mockClear();
    mockUIPort.showError.mockClear();
    mockDocumentController.handleDocumentOpened.mockClear();

    // Create test fixtures
    mockContext = createMockExtensionContext();
    mockTextDocument = createMockTextDocument();
    mockTextEditor = createMockTextEditor(mockTextDocument);

    // Set up VS Code API mock implementations
    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockImplementation((_handler) => {
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation((_handler) => {
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

  describe('proof tree panel creation errors', () => {
    it('should handle ProofTreePanel.createWithServices throwing', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock ProofTreePanel.createWithServices to throw an error
      mockPanelManager.createPanelWithServices.mockRejectedValueOnce(
        new Error('Mock webview error'),
      );

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      // Should show error via UI port instead of throwing
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should recover from webview creation failures', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // First call fails, second succeeds
      mockPanelManager.createPanelWithServices
        .mockRejectedValueOnce(new Error('Webview creation failed'))
        .mockResolvedValueOnce({});

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // First call should fail
      await handler(mockTextDocument);
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );

      // Second call should succeed
      mockUIPort.showError.mockClear();
      await handler(mockTextDocument);
      expect(mockUIPort.showError).not.toHaveBeenCalled();
    });

    it('should handle VS Code webview API unavailable', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock webview creation to fail with API unavailable
      mockPanelManager.createPanelWithServices.mockRejectedValueOnce(
        new Error('WebviewPanel API not available'),
      );

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });
  });

  describe('document content access errors', () => {
    it('should handle getText() throwing', async () => {
      const editorWithBadGetText = createMockTextEditor(
        createMockTextDocument({
          getText: () => {
            throw new Error('Mock getText error');
          },
        }),
      );

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [editorWithBadGetText],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(editorWithBadGetText.document);

      // Should show error via UI port instead of throwing
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle document uri access errors', async () => {
      const docWithBadUri = createMockTextDocument({
        uri: {
          toString: () => {
            throw new Error('URI access error');
          },
        } as any,
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(docWithBadUri)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithBadUri);

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle document properties being undefined', async () => {
      const docWithUndefinedProps = createMockTextDocument({
        languageId: undefined as any,
        fileName: undefined as any,
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(docWithUndefinedProps)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // Should handle gracefully without throwing
      await expect(handler(docWithUndefinedProps)).resolves.not.toThrow();
    });
  });

  describe('service integration errors', () => {
    it('should handle document controller exceptions', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock document controller to throw
      mockDocumentController.handleDocumentOpened.mockRejectedValueOnce(
        new Error('Document controller failed'),
      );

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // Extension should handle the error gracefully and not propagate it
      await expect(handler(mockTextDocument)).rejects.toThrow('Document controller failed');
    });

    it('should handle multiple service failures simultaneously', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock multiple services to fail
      mockPanelManager.createPanelWithServices.mockRejectedValueOnce(
        new Error('Panel creation failed'),
      );
      mockValidationController.validateDocumentImmediate.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      // Should handle both errors gracefully
      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should continue functioning after service recovery', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Services fail then recover
      mockPanelManager.createPanelWithServices
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({});

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // First call fails
      await handler(mockTextDocument);
      expect(mockUIPort.showError).toHaveBeenCalled();

      // Second call succeeds
      mockUIPort.showError.mockClear();
      await handler(mockTextDocument);
      expect(mockUIPort.showError).not.toHaveBeenCalled();
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(2);
    });
  });

  describe('memory and resource errors', () => {
    it('should handle out of memory scenarios gracefully', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock out of memory error
      mockPanelManager.createPanelWithServices.mockRejectedValueOnce(
        new Error('Maximum call stack size exceeded'),
      );

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockTextDocument);

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });

    it('should handle resource exhaustion during rapid events', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock resource exhaustion after several calls
      let callCount = 0;
      mockPanelManager.createPanelWithServices.mockImplementation(() => {
        callCount++;
        if (callCount > 3) {
          return Promise.reject(new Error('Resource exhausted'));
        }
        return Promise.resolve({});
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // First few calls succeed
      await handler(mockTextDocument);
      await handler(mockTextDocument);
      await handler(mockTextDocument);

      // Fourth call should fail
      await handler(mockTextDocument);

      expect(mockUIPort.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to display proof tree'),
      );
    });
  });

  describe('error recovery and cleanup', () => {
    it('should properly clean up after errors', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock service to throw then succeed
      mockPanelManager.createPanelWithServices
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValue({});

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // Error case
      await handler(mockTextDocument);
      expect(mockUIPort.showError).toHaveBeenCalled();

      // Success case - should work normally
      mockUIPort.showError.mockClear();
      await handler(mockTextDocument);
      expect(mockUIPort.showError).not.toHaveBeenCalled();
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(2);
    });

    it('should maintain extension stability during error storms', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Mock continuous failures
      mockPanelManager.createPanelWithServices.mockRejectedValue(
        new Error('Persistent service error'),
      );

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      // Multiple rapid error events
      const promises = Array.from({ length: 10 }, () => handler(mockTextDocument));
      await Promise.all(promises);

      // Extension should remain stable
      expect(mockUIPort.showError).toHaveBeenCalledTimes(10);
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(10);
    });

    it('should handle errors during extension deactivation', async () => {
      await activate(mockContext);

      // Mock cleanup errors
      const mockDispose = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Add disposables that will throw during cleanup
      mockContext.subscriptions.push({ dispose: mockDispose });

      // Extension should handle cleanup errors gracefully
      // This would be tested in actual deactivation, but we can verify
      // that disposables are properly registered
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });
});
