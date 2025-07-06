/**
 * Tests for document content change events
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextDocumentChangeEvent } from 'vscode';
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

describe('Document Content Change Events', () => {
  let mockContext: vscode.ExtensionContext;
  let mockTextDocument: TextDocument;
  let mockChangeEvent: TextDocumentChangeEvent;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service mocks
    mockValidationController.validateDocumentDebounced.mockClear();
    mockPanelManager.createPanelWithServices.mockClear();

    // Create test fixtures
    mockContext = createMockExtensionContext();
    mockTextDocument = createMockTextDocument();
    mockChangeEvent = createMockChangeEvent(mockTextDocument);

    // Set up VS Code API mock implementations
    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockImplementation((_handler) => {
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

  describe('document change events', () => {
    it('should register document change event handler', async () => {
      await activate(mockContext);

      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle proof file changes with proper services', async () => {
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

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
        expect.any(String), // uri
        'mock proof content',
        expect.objectContaining({
          getDocumentById: expect.any(Function),
          parseDocumentContent: expect.any(Function),
          validateDocumentContent: expect.any(Function),
        }),
        expect.any(Object), // visualizationService
        expect.any(Object), // uiPort
        expect.any(Object), // renderer
        expect.any(Object), // viewStateManager
        expect.any(Object), // viewStatePort
        expect.any(Object), // bootstrapController
        expect.any(Object), // proofApplicationService
        expect.any(Object), // yamlSerializer
        expect.any(Object), // exportService
        expect.any(Object), // documentIdService
      );
    });

    it('should trigger debounced validation for proof file changes', async () => {
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

    it('should ignore non-proof file changes', async () => {
      const nonProofDoc = createMockTextDocument({ languageId: 'javascript' });
      const nonProofChangeEvent = createMockChangeEvent(nonProofDoc);

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      await handler(nonProofChangeEvent);

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).not.toHaveBeenCalled();
    });

    it('should handle rapid document changes', async () => {
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
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      // Simulate rapid document changes
      for (let i = 0; i < 10; i++) {
        await handler(mockChangeEvent);
      }

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(10);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(10);
    });

    it('should handle changes with different content change types', async () => {
      const changeEventWithContent = {
        ...mockChangeEvent,
        contentChanges: [
          {
            range: new vscode.Range(0, 0, 0, 5),
            rangeOffset: 0,
            rangeLength: 5,
            text: 'new content',
          },
        ],
      };

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

      await handler(changeEventWithContent);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalled();
    });

    it('should handle empty content changes', async () => {
      const changeEventEmpty = {
        ...mockChangeEvent,
        contentChanges: [],
      };

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

      await handler(changeEventEmpty);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalled();
    });

    it('should handle documents with extremely large content changes', async () => {
      const hugeContent = 'a'.repeat(1_000_000); // 1MB string
      const hugeDocument = createMockTextDocument({
        getText: () => hugeContent,
      });
      const hugeChangeEvent = createMockChangeEvent(hugeDocument);

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(hugeDocument)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onChangeCall = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0];
      const handler = onChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeTextDocument handler not registered');
      }

      // Should handle large documents without performance issues
      const startTime = Date.now();
      await handler(hugeChangeEvent);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalled();
    });
  });

  describe('change event edge cases', () => {
    it('should handle change events with multiple content changes', async () => {
      const multiChangeEvent = {
        ...mockChangeEvent,
        contentChanges: [
          {
            range: new vscode.Range(0, 0, 0, 3),
            rangeOffset: 0,
            rangeLength: 3,
            text: 'foo',
          },
          {
            range: new vscode.Range(1, 0, 1, 3),
            rangeOffset: 10,
            rangeLength: 3,
            text: 'bar',
          },
        ],
      };

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

      await handler(multiChangeEvent);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalled();
    });

    it('should handle change events with different save reasons', async () => {
      const manualSaveEvent = {
        ...mockChangeEvent,
        reason: vscode.TextDocumentSaveReason.Manual,
      };

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

      await handler(manualSaveEvent);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalled();
    });

    it('should handle concurrent change events', async () => {
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

      // Simulate concurrent change events
      const promises = Array.from({ length: 5 }, () => handler(mockChangeEvent));
      await Promise.all(promises);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(5);
      expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(5);
    });
  });
});
