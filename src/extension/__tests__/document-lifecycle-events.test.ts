/**
 * Tests for document lifecycle events (open, close, editor changes)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextDocument, TextEditor } from 'vscode';
import * as vscode from 'vscode';

import { activate } from '../extension.js';
import {
  createMockPanelManager,
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

describe('Document Lifecycle Events', () => {
  let mockContext: vscode.ExtensionContext;
  let mockTextDocument: TextDocument;
  let mockTextEditor: TextEditor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset service mocks
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentDebounced.mockClear();
    mockValidationController.clearDocumentValidation.mockClear();
    mockPanelManager.createPanelWithServices.mockClear();

    // Create test fixtures
    mockContext = createMockExtensionContext();
    mockTextDocument = createMockTextDocument();
    mockTextEditor = createMockTextEditor(mockTextDocument);

    // Set up VS Code API mock implementations
    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockImplementation((_handler) => {
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

  describe('document open events', () => {
    it('should register document open event handler', async () => {
      await activate(mockContext);

      expect(vscode.workspace.onDidOpenTextDocument).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle proof file opening with proper services', async () => {
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [mockTextEditor],
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

    it('should extract filename from full path for user notification', async () => {
      const docWithLongPath = createMockTextDocument({
        fileName: '/very/long/path/to/complex-file.proof',
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(docWithLongPath)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithLongPath);

      // Should extract just the filename for user notification
      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });

    it('should handle filenames without path separators', async () => {
      const docWithSimpleName = createMockTextDocument({
        fileName: 'simple.proof',
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(docWithSimpleName)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithSimpleName);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });

    it('should ignore non-proof files', async () => {
      const nonProofDoc = createMockTextDocument({ languageId: 'javascript' });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(nonProofDoc);

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('document close events', () => {
    it('should register document close event handler', async () => {
      await activate(mockContext);

      expect(vscode.workspace.onDidCloseTextDocument).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should clear validation for closed proof files', async () => {
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

    it('should ignore closing non-proof files', async () => {
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
  });

  describe('active editor change events', () => {
    it('should register active editor change event handler', async () => {
      await activate(mockContext);

      expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle switching to proof file editor', async () => {
      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(mockTextEditor);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
        uri: mockTextDocument.uri.toString(),
        content: mockTextDocument.getText(),
        languageId: mockTextDocument.languageId,
      });
    });

    it('should ignore switching to non-proof file editor', async () => {
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

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });

    it('should handle undefined editor (no active editor)', async () => {
      await activate(mockContext);

      const onEditorChangeCall = vi.mocked(vscode.window.onDidChangeActiveTextEditor).mock.calls[0];
      const handler = onEditorChangeCall?.[0];

      if (!handler) {
        throw new Error('onDidChangeActiveTextEditor handler not registered');
      }

      await handler(undefined);

      expect(mockPanelManager.createPanelWithServices).not.toHaveBeenCalled();
      expect(mockValidationController.validateDocumentImmediate).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty filename gracefully', async () => {
      const docWithEmptyName = createMockTextDocument({
        fileName: '',
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(docWithEmptyName)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(docWithEmptyName);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });

    it('should handle very long file paths', async () => {
      const longPath = '/'.concat('very-long-directory-name-'.repeat(20), 'file.proof');
      const mockLongDocument = createMockTextDocument({
        fileName: longPath,
        uri: vscode.Uri.file(longPath),
      });

      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [createMockTextEditor(mockLongDocument)],
        writable: true,
        configurable: true,
      });

      await activate(mockContext);

      const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
      const handler = onOpenCall?.[0];

      if (!handler) {
        throw new Error('onDidOpenTextDocument handler not registered');
      }

      await handler(mockLongDocument);

      expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();
    });
  });
});
