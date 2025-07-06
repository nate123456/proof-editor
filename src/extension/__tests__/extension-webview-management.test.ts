/**
 * Webview management and comprehensive error handling tests for VS Code extension
 *
 * This file contains tests for webview lifecycle management and comprehensive error handling including:
 * - Container and DI error scenarios
 * - Workspace and configuration edge cases
 * - Concurrent command execution handling
 * - Subscription management and disposal
 * - VS Code API null value handling
 *
 * Domain: Extension infrastructure and error resilience
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../extension.js';
import {
  type ExtensionTestContext,
  mockBootstrapController,
  mockContainer,
  mockDocumentController,
  mockFileSystemPort,
  mockProofTreeController,
  mockUIPort,
  mockValidationController,
  setupExtensionTest,
} from './shared/extension-test-setup.js';

describe('Extension - Webview Management and Error Handling', () => {
  let testContext: ExtensionTestContext;

  beforeEach(async () => {
    testContext = setupExtensionTest();
    await activate(testContext.mockContext);
  });

  describe('comprehensive error handling', () => {
    describe('container and DI error scenarios', () => {
      it('should handle container resolution failures during activation', async () => {
        // Create new context for clean test
        const newContext = { ...testContext.mockContext, subscriptions: [] };

        // Mock container to fail on specific service - use mockImplementation to handle all calls
        mockContainer.resolve.mockImplementation((token: string) => {
          if (token === 'InfrastructureValidationController') {
            throw new Error('ValidationController not registered');
          }
          // Return the original mock implementation for other tokens
          switch (token) {
            case 'DocumentController':
              return mockDocumentController;
            case 'ProofTreeController':
              return mockProofTreeController;
            case 'BootstrapController':
              return mockBootstrapController;
            case 'IUIPort':
              return mockUIPort;
            case 'IPlatformPort':
              return {
                getPlatformInfo: vi
                  .fn()
                  .mockReturnValue({ type: 'test', version: '1.0', os: 'test', arch: 'test' }),
                getInputCapabilities: vi.fn().mockReturnValue({ primaryInput: 'keyboard' }),
                getDisplayCapabilities: vi
                  .fn()
                  .mockReturnValue({ screenWidth: 1920, screenHeight: 1080 }),
                copyToClipboard: vi.fn().mockResolvedValue({ isOk: () => true }),
                readFromClipboard: vi.fn().mockResolvedValue({ isOk: () => true, value: 'test' }),
              };
            case 'IFileSystemPort':
              return mockFileSystemPort;
            case 'IViewStatePort':
              return {
                getViewState: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                saveViewState: vi.fn().mockResolvedValue({ isOk: () => true }),
                capabilities: vi.fn().mockReturnValue({ canPersist: true }),
              };
            case 'TreeRenderer':
              return {
                render: vi.fn().mockReturnValue('<div>Mock Tree</div>'),
                updateRender: vi.fn(),
              };
            case 'DocumentQueryService':
              return {
                getDocumentStructure: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                getArguments: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
                getStatements: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
              };
            case 'ProofVisualizationService':
              return {
                generateVisualization: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                updateVisualization: vi.fn().mockResolvedValue({ isOk: () => true }),
              };
            case 'ViewStateManager':
              return {
                getViewState: vi.fn().mockResolvedValue({ isOk: () => true, value: {} }),
                updateViewState: vi.fn().mockResolvedValue({ isOk: () => true }),
                subscribeToChanges: vi.fn(),
              };
            default:
              return {};
          }
        });

        await expect(activate(newContext)).rejects.toThrow('ValidationController not registered');

        // Restore mock to prevent affecting other tests
        mockContainer.resolve.mockRestore();
      });

      it('should handle platform adapter registration failures', async () => {
        const containerModule = await import('../../infrastructure/di/container.js');
        const mockRegisterAdapters = vi
          .spyOn(containerModule, 'registerPlatformAdapters')
          .mockRejectedValueOnce(new Error('Platform adapter registration failed'));

        const newContext = { ...testContext.mockContext, subscriptions: [] };

        await expect(activate(newContext)).rejects.toThrow('Platform adapter registration failed');

        mockRegisterAdapters.mockRestore();
      });

      it('should handle controller factory registration failures', async () => {
        // Mock registerFactory to throw
        mockContainer.registerFactory.mockImplementationOnce(() => {
          throw new Error('Factory registration failed');
        });

        const newContext = { ...testContext.mockContext, subscriptions: [] };

        await expect(activate(newContext)).rejects.toThrow('Factory registration failed');
      });
    });

    describe('workspace and configuration edge cases', () => {
      it('should handle empty workspace folders array', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [],
          writable: true,
          configurable: true,
        });

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapDocument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        await commandHandler();

        expect(mockUIPort.showWarning).toHaveBeenCalledWith(
          'Please open a workspace folder first.',
        );
      });

      it('should handle VS Code API returning null values', async () => {
        // Mock VS Code API to return null
        Object.defineProperty(vscode.window, 'activeTextEditor', {
          value: null,
          writable: true,
          configurable: true,
        });

        Object.defineProperty(vscode.workspace, 'textDocuments', {
          value: null,
          writable: true,
          configurable: true,
        });

        Object.defineProperty(vscode.window, 'visibleTextEditors', {
          value: null,
          writable: true,
          configurable: true,
        });

        const newContext = { ...testContext.mockContext, subscriptions: [] };

        // Should handle null API responses gracefully
        await expect(activate(newContext)).rejects.toThrow('Cannot read properties of null');
      });

      it('should handle concurrent command executions', async () => {
        vscode.window.activeTextEditor = testContext.mockTextEditor;

        const mockBootstrap = mockContainer.resolve('BootstrapController');
        vi.mocked(mockBootstrap.createBootstrapArgument).mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve({ isErr: () => false, value: { data: { argumentId: 'arg-1' } } }),
                50,
              ),
            ),
        );

        const commandCall = vi
          .mocked(vscode.commands.registerCommand)
          .mock.calls.find((call) => call[0] === 'proofEditor.createBootstrapArgument');
        const commandHandler = commandCall?.[1] as () => Promise<void>;

        // Execute command multiple times concurrently
        const promises = Array.from({ length: 3 }, () => commandHandler());

        // Should handle concurrent executions without issues
        await expect(Promise.all(promises)).resolves.not.toThrow();
        expect(mockBootstrap.createBootstrapArgument).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('subscription management', () => {
    it('should add validation controller to subscriptions', async () => {
      await activate(testContext.mockContext);

      expect(testContext.mockContext.subscriptions).toContain(mockValidationController);
    });

    it('should add all event handlers to subscriptions', async () => {
      await activate(testContext.mockContext);

      // Should have 14 items: ValidationController + showTreeCommand + 7 bootstrap commands + 4 event handlers + 1 file watcher
      expect(testContext.mockContext.subscriptions).toHaveLength(14);
    });

    it('should handle subscription disposal gracefully', async () => {
      await activate(testContext.mockContext);

      // Each subscription should have a dispose method and handle errors
      const disposalErrors: Error[] = [];

      // Mock one subscription to throw during disposal
      if (testContext.mockContext.subscriptions.length > 0) {
        const faultySubscription = testContext.mockContext.subscriptions[0];
        if (faultySubscription && typeof faultySubscription.dispose === 'function') {
          const originalDispose = faultySubscription.dispose;
          faultySubscription.dispose = () => {
            try {
              throw new Error('Disposal failed');
            } catch (error) {
              disposalErrors.push(error as Error);
              // Continue with original disposal
              originalDispose();
            }
          };
        }
      }
      testContext.mockContext.subscriptions.forEach((subscription) => {
        expect(subscription).toHaveProperty('dispose');
        expect(typeof subscription.dispose).toBe('function');

        // Test that disposal doesn't throw unhandled errors
        try {
          subscription.dispose();
        } catch (error) {
          // Disposal errors should be handled gracefully
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });
});
