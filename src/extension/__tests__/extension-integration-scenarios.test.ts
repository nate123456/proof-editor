/**
 * Advanced integration scenario tests for VS Code extension
 *
 * This file contains tests for complex integration scenarios including:
 * - Error handling and recovery
 * - Edge cases and boundary conditions
 * - Performance under stress
 * - Resource management and cleanup
 * - API failure scenarios
 *
 * Domain: Extension integration scenarios requiring comprehensive error handling
 */

import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../extension.js';
import {
  type ExtensionTestContext,
  mockPanelManager,
  mockUIPort,
  mockValidationController,
  setupExtensionTest,
} from './shared/extension-test-setup.js';

describe('Extension - Advanced Integration Scenarios', () => {
  let testContext: ExtensionTestContext;

  beforeEach(() => {
    testContext = setupExtensionTest();
  });

  it('should handle extension activation errors gracefully', async () => {
    // Import the container module and mock initializeContainer to throw
    const containerModule = await import('../../infrastructure/di/container.js');
    const mockInitializeContainer = vi
      .spyOn(containerModule, 'initializeContainer')
      .mockRejectedValue(new Error('DI container initialization failed'));

    await expect(activate(testContext.mockContext)).rejects.toThrow(
      'DI container initialization failed',
    );
    expect(mockInitializeContainer).toHaveBeenCalled();

    // Restore the original implementation
    mockInitializeContainer.mockRestore();
  });

  it('should handle validation controller failures during document events', async () => {
    // Mock visibleTextEditors to include our mock editor
    Object.defineProperty(vscode.window, 'visibleTextEditors', {
      value: [testContext.mockTextEditor],
      writable: true,
      configurable: true,
    });

    await activate(testContext.mockContext);

    // Make validation controller throw error
    mockValidationController.validateDocumentImmediate.mockImplementation(() => {
      throw new Error('Validation service unavailable');
    });

    // Should not crash the extension - it handles validation errors internally
    const onOpenCall = vi.mocked(vscode.workspace.onDidOpenTextDocument).mock.calls[0];
    const handler = onOpenCall?.[0];

    if (!handler) {
      throw new Error('onDidOpenTextDocument handler not registered');
    }

    await handler(testContext.mockTextDocument);

    // ProofTreePanel should still be called even if validation fails
    expect(mockPanelManager.createPanelWithServices).toHaveBeenCalled();

    // Should show validation error via UI port
    expect(mockUIPort.showError).toHaveBeenCalledWith(
      'Validation failed: Validation service unavailable',
    );
  });

  it('should handle webview creation failures', async () => {
    // Mock visibleTextEditors to include our mock editor
    Object.defineProperty(vscode.window, 'visibleTextEditors', {
      value: [testContext.mockTextEditor],
      writable: true,
      configurable: true,
    });

    await activate(testContext.mockContext);

    // Mock ProofTreePanel.createWithServices to fail
    const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
    vi.mocked(ProofTreePanel.createWithServices).mockRejectedValueOnce(
      new Error('Webview creation failed'),
    );

    // Should handle error gracefully
    await testContext.onOpenHandler(testContext.mockTextDocument);

    // Should show error via UI port
    expect(mockUIPort.showError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to display proof tree'),
    );
  });

  it('should handle document content access failures', async () => {
    const faultyDocument = {
      ...testContext.mockTextDocument,
      getText: () => {
        throw new Error('Document access denied');
      },
    };

    const faultyEditor = {
      ...testContext.mockTextEditor,
      document: faultyDocument,
    };

    // Mock visibleTextEditors to include the faulty editor
    Object.defineProperty(vscode.window, 'visibleTextEditors', {
      value: [faultyEditor],
      writable: true,
      configurable: true,
    });

    await activate(testContext.mockContext);

    // Should handle error gracefully
    await testContext.onOpenHandler(faultyDocument);

    // Should show error via UI port
    expect(mockUIPort.showError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to display proof tree'),
    );
  });

  it('should handle very large documents efficiently', async () => {
    const largeContent = `statements:\n${'a'.repeat(100000)}`;
    const largeDocument = {
      ...testContext.mockTextDocument,
      getText: () => largeContent,
    };

    const largeEditor = {
      ...testContext.mockTextEditor,
      document: largeDocument,
    };

    // Mock visibleTextEditors to include the large editor
    Object.defineProperty(vscode.window, 'visibleTextEditors', {
      value: [largeEditor],
      writable: true,
      configurable: true,
    });

    await activate(testContext.mockContext);

    // Reset validation controller mock to default behavior for this test
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.validateDocumentImmediate.mockImplementation(() => {
      // Default behavior - do nothing
    });

    // Should handle large documents without crashing
    await testContext.onOpenHandler(largeDocument);

    expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledWith(
      expect.any(String), // uri
      largeContent,
      expect.any(Object), // documentQueryService
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
    expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledWith({
      uri: largeDocument.uri.toString(),
      content: largeDocument.getText(),
      languageId: largeDocument.languageId,
    });
  });

  it('should handle rapid consecutive document changes', async () => {
    // Mock visibleTextEditors to include our mock editor
    Object.defineProperty(vscode.window, 'visibleTextEditors', {
      value: [testContext.mockTextEditor],
      writable: true,
      configurable: true,
    });

    await activate(testContext.mockContext);

    // Clear mocks before this test
    mockValidationController.validateDocumentDebounced.mockClear();
    const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
    vi.mocked(ProofTreePanel.createWithServices).mockClear();

    // Simulate rapid document changes to the same document
    for (let i = 0; i < 50; i++) {
      const changeEvent = {
        ...testContext.mockChangeEvent,
        document: testContext.mockTextDocument,
      };
      await testContext.onChangeHandler(changeEvent);
    }

    expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(50);
    expect(mockValidationController.validateDocumentDebounced).toHaveBeenCalledTimes(50);
  });

  it('should handle mixed valid and invalid document operations', async () => {
    const proofDoc = testContext.mockTextDocument;
    const invalidDoc = { ...testContext.mockTextDocument, languageId: 'javascript' };

    // Mock visibleTextEditors to include only the valid editor
    Object.defineProperty(vscode.window, 'visibleTextEditors', {
      value: [testContext.mockTextEditor],
      writable: true,
      configurable: true,
    });

    await activate(testContext.mockContext);

    // Reset validation controller mock to default behavior for this test
    mockValidationController.validateDocumentImmediate.mockClear();
    mockValidationController.clearDocumentValidation.mockClear();
    mockValidationController.validateDocumentImmediate.mockImplementation(() => {
      // Default behavior - do nothing
    });

    const { ProofTreePanel } = await import('../../webview/ProofTreePanel.js');
    vi.mocked(ProofTreePanel.createWithServices).mockClear();

    // Mix of valid, invalid, and null operations
    await testContext.onOpenHandler(proofDoc);
    await testContext.onOpenHandler(invalidDoc);
    await testContext.onEditorChangeHandler(undefined);
    await testContext.onCloseHandler(proofDoc);
    await testContext.onCloseHandler(invalidDoc);

    // Only valid operations should trigger proof-specific behavior
    expect(mockPanelManager.createPanelWithServices).toHaveBeenCalledTimes(1);
    expect(mockValidationController.validateDocumentImmediate).toHaveBeenCalledTimes(1);
    expect(mockValidationController.clearDocumentValidation).toHaveBeenCalledTimes(1);
  });

  it('should handle extension context corruption gracefully', async () => {
    const corruptedContext = {
      ...testContext.mockContext,
      subscriptions: null as any,
    };

    // Should handle corrupted context without crashing completely
    await expect(activate(corruptedContext)).rejects.toThrow();
  });

  it('should handle VS Code API unavailability', async () => {
    // Simulate VS Code API methods throwing
    vi.mocked(vscode.commands.registerCommand).mockImplementation(() => {
      throw new Error('VS Code API unavailable');
    });

    await expect(activate(testContext.mockContext)).rejects.toThrow('VS Code API unavailable');
  });

  it('should properly cleanup resources on repeated activation', async () => {
    // Activate multiple times to test resource cleanup
    await activate(testContext.mockContext);
    const firstCallCount = testContext.mockContext.subscriptions.length;

    testContext.mockContext.subscriptions.length = 0;
    await activate(testContext.mockContext);
    const secondCallCount = testContext.mockContext.subscriptions.length;

    // Should register the same number of subscriptions each time
    expect(secondCallCount).toBe(firstCallCount);
  });
});
