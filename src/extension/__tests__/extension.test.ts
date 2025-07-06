/**
 * Core extension functionality tests
 *
 * This file contains tests for basic extension functionality including:
 * - Extension activation and initialization
 * - Command registration and basic setup
 * - Core document event handler registration
 * - Basic webview panel creation
 *
 * More specialized tests are located in:
 * - extension-integration-scenarios.test.ts: Advanced integration and error scenarios
 * - extension-bootstrap-commands.test.ts: Bootstrap command functionality
 * - extension-filesystem-operations.test.ts: File system operations and auto-save
 * - extension-tutorial-workflows.test.ts: Tutorial and guided workflows
 * - extension-webview-management.test.ts: Webview management and error handling
 *
 * Domain: Core extension infrastructure and basic functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../extension.js';
import { type ExtensionTestContext, setupExtensionTest } from './shared/extension-test-setup.js';

describe('Extension - Core Functionality', () => {
  let testContext: ExtensionTestContext;

  beforeEach(() => {
    testContext = setupExtensionTest();
  });

  describe('extension activation', () => {
    it('should activate successfully with valid context', async () => {
      await expect(activate(testContext.mockContext)).resolves.not.toThrow();
    });

    it('should register all required commands', async () => {
      await activate(testContext.mockContext);

      const registeredCommands = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.map((call) => call[0]);

      expect(registeredCommands).toContain('proofEditor.showProofTree');
      expect(registeredCommands).toContain('proofEditor.createBootstrapDocument');
      expect(registeredCommands).toContain('proofEditor.createBootstrapArgument');
      expect(registeredCommands).toContain('proofEditor.populateEmptyArgument');
      expect(registeredCommands).toContain('proofEditor.showBootstrapWorkflow');
      expect(registeredCommands).toContain('proofEditor.createEmptyImplicationLine');
      expect(registeredCommands).toContain('proofEditor.exportDocument');
      expect(registeredCommands).toContain('proofEditor.openDocumentWithId');
    });

    it('should register document event handlers', async () => {
      await activate(testContext.mockContext);

      expect(vscode.workspace.onDidOpenTextDocument).toHaveBeenCalled();
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
      expect(vscode.workspace.onDidCloseTextDocument).toHaveBeenCalled();
      expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
    });

    it('should add all subscriptions to context', async () => {
      await activate(testContext.mockContext);

      // Should have validation controller + commands + event handlers + file watcher
      expect(testContext.mockContext.subscriptions.length).toBeGreaterThan(0);

      // All subscriptions should be disposable
      testContext.mockContext.subscriptions.forEach((subscription) => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');
      });
    });
  });

  describe('basic document event handling', () => {
    it('should handle proof document opening', async () => {
      await activate(testContext.mockContext);

      // Mock visibleTextEditors to include our editor
      Object.defineProperty(vscode.window, 'visibleTextEditors', {
        value: [testContext.mockTextEditor],
        writable: true,
        configurable: true,
      });

      // Trigger document open event
      await testContext.onOpenHandler(testContext.mockTextDocument);

      // Should not throw and should handle proof documents
      expect(testContext.mockTextDocument.languageId).toBe('proof');
    });

    it('should handle document changes', async () => {
      await activate(testContext.mockContext);

      // Should handle document change events without throwing
      await expect(testContext.onChangeHandler(testContext.mockChangeEvent)).resolves.not.toThrow();
    });

    it('should handle document closing', async () => {
      await activate(testContext.mockContext);

      // Should handle document close events without throwing
      await expect(testContext.onCloseHandler(testContext.mockTextDocument)).resolves.not.toThrow();
    });

    it('should handle active editor changes', async () => {
      await activate(testContext.mockContext);

      // Should handle editor change events without throwing
      await expect(
        testContext.onEditorChangeHandler(testContext.mockTextEditor),
      ).resolves.not.toThrow();

      await expect(testContext.onEditorChangeHandler(undefined)).resolves.not.toThrow();
    });
  });

  describe('command registration validation', () => {
    it('should register showProofTree command with handler', async () => {
      await activate(testContext.mockContext);

      const showTreeCall = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.find((call) => call[0] === 'proofEditor.showProofTree');

      expect(showTreeCall).toBeDefined();
      expect(typeof showTreeCall?.[1]).toBe('function');
    });

    it('should register all bootstrap commands with handlers', async () => {
      await activate(testContext.mockContext);

      const bootstrapCommands = [
        'proofEditor.createBootstrapDocument',
        'proofEditor.createBootstrapArgument',
        'proofEditor.populateEmptyArgument',
        'proofEditor.showBootstrapWorkflow',
        'proofEditor.createEmptyImplicationLine',
      ];

      for (const commandName of bootstrapCommands) {
        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === commandName);

        expect(commandCall).toBeDefined();
        expect(typeof commandCall?.[1]).toBe('function');
      }
    });
  });
});
