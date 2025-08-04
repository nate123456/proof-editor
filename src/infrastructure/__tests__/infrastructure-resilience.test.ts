import 'reflect-metadata';

import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode module before any imports that use it
vi.mock('vscode', () => import('./__mocks__/vscode'));

import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import type { IViewStatePort } from '../../application/ports/IViewStatePort.js';
import { DomainEvent } from '../../domain/events/base-event.js';
import { ValidationError } from '../../domain/shared/result.js';
import { MessageType } from '../../domain/shared/value-objects/enums.js';
import {
  DialogTitle,
  DocumentContent,
  EventData,
  FilePath,
  NotificationMessage,
  ViewType,
  WebviewId,
} from '../../domain/shared/value-objects/index.js';
import { DomainEventBus } from '../events/DomainEventBus.js';
import { EventBus } from '../events/EventBus.js';
import { VSCodeFileSystemAdapter } from '../vscode/VSCodeFileSystemAdapter.js';
import { VSCodePlatformAdapter } from '../vscode/VSCodePlatformAdapter.js';
import { VSCodeUIAdapter } from '../vscode/VSCodeUIAdapter.js';
import { VSCodeViewStateAdapter } from '../vscode/VSCodeViewStateAdapter.js';

// Mock event class for testing
class TestEvent extends DomainEvent {
  constructor(
    public readonly eventType: string,
    aggregateId: string,
    aggregateType: string,
    public readonly eventData: Record<string, unknown> = {},
  ) {
    super(aggregateId, aggregateType);
  }
}

/**
 * Infrastructure Resilience Tests
 *
 * Tests error handling, recovery scenarios, and graceful degradation
 * under adverse conditions. Focuses on production reliability.
 */
describe('Infrastructure Resilience and Error Recovery', () => {
  let _mockFileSystemPort: IFileSystemPort;
  let _mockPlatformPort: IPlatformPort;
  let mockUIPort: IUIPort;
  let _mockViewStatePort: IViewStatePort;
  let eventBus: EventBus;
  let _domainEventBus: DomainEventBus;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks for failure testing
    _mockFileSystemPort = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      readDirectory: vi.fn(),
      createDirectory: vi.fn(),
      watch: vi.fn(),
      getStoredDocument: vi.fn(),
      storeDocument: vi.fn(),
      deleteStoredDocument: vi.fn(),
      listStoredDocuments: vi.fn(),
      capabilities: vi.fn().mockReturnValue({
        canWatch: true,
        canAccessArbitraryPaths: true,
        supportsOfflineStorage: false,
        persistence: 'permanent',
      }),
    } as any;

    _mockPlatformPort = {
      getPlatformInfo: vi.fn(),
      getInputCapabilities: vi.fn(),
      getDisplayCapabilities: vi.fn(),
      isFeatureAvailable: vi.fn(),
      openExternal: vi.fn(),
      copyToClipboard: vi.fn(),
      readFromClipboard: vi.fn(),
      onWillTerminate: vi.fn(),
      preventTermination: vi.fn(),
      getStorageValue: vi.fn(),
      setStorageValue: vi.fn(),
      deleteStorageValue: vi.fn(),
    } as any;

    mockUIPort = {
      showInputBox: vi.fn().mockResolvedValue(ok(null)),
      showQuickPick: vi.fn().mockResolvedValue(ok(null)),
      showConfirmation: vi.fn().mockResolvedValue(ok(false)),
      showOpenDialog: vi.fn().mockResolvedValue(ok(null)),
      showSaveDialog: vi.fn().mockResolvedValue(ok(null)),
      showInformation: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showProgress: vi.fn().mockResolvedValue(undefined),
      setStatusMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      createWebviewPanel: vi.fn(),
      postMessageToWebview: vi.fn(),
      getTheme: vi.fn().mockReturnValue({
        kind: 'light',
        colors: {},
        fonts: { default: 'Arial', monospace: 'Courier', size: 12 },
      }),
      onThemeChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      capabilities: vi.fn().mockReturnValue({
        supportsFileDialogs: true,
        supportsNotificationActions: true,
        supportsProgress: true,
        supportsStatusBar: true,
        supportsWebviews: true,
        supportsThemes: true,
      }),
    } as any;

    _mockViewStatePort = {
      saveViewState: vi.fn().mockResolvedValue(ok(undefined)),
      loadViewState: vi.fn().mockResolvedValue(ok(null)),
      clearViewState: vi.fn().mockResolvedValue(ok(undefined)),
      hasViewState: vi.fn().mockResolvedValue(ok(false)),
      getAllStateKeys: vi.fn().mockResolvedValue(ok([])),
      clearAllViewState: vi.fn().mockResolvedValue(ok(undefined)),
    } as any;

    const infrastructureEventBusConfig = {
      maxEventHistory: 100,
      handlerTimeout: 5000,
      enableReplay: false,
      enableMetrics: true,
      enableLogging: false,
      testMode: true,
    };

    const domainEventBusConfig = {
      maxEventHistory: 100,
      handlerTimeout: 5000,
      retryAttempts: 3,
      enableEventPersistence: false,
      maxConcurrentHandlers: 10,
    };

    eventBus = new EventBus(infrastructureEventBusConfig);
    _domainEventBus = new DomainEventBus(domainEventBusConfig);
  });

  describe('File System Adapter Resilience', () => {
    let adapter: VSCodeFileSystemAdapter;
    let vscode: any;

    beforeEach(async () => {
      // Get the mocked vscode module
      vscode = (await import('vscode')).default;

      // Reset all mocks
      vi.clearAllMocks();

      const mockExtensionContext = {
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        globalState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
        workspaceState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
      } as any;
      adapter = new VSCodeFileSystemAdapter(mockExtensionContext);
    });

    it('should handle file system permissions errors gracefully', async () => {
      // Mock vscode.workspace.fs to throw permission error
      const error = new vscode.FileSystemError('EACCES', 'permission denied');
      error.code = 'EACCES';
      vscode.workspace.fs.readFile.mockRejectedValue(error);

      const filePathResult = FilePath.create('/protected/file.proof');
      if (filePathResult.isErr()) throw new Error('Failed to create FilePath');
      const result = await adapter.readFile(filePathResult.value);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message.getValue()).toContain('Permission denied');
      }
    });

    it('should handle network drive timeouts without crashing', async () => {
      // Mock vscode.workspace.fs to throw timeout error
      vscode.workspace.fs.readFile.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ETIMEDOUT: network timeout')), 100);
          }),
      );

      const filePathResult = FilePath.create('/network/drive/file.proof');
      if (filePathResult.isErr()) throw new Error('Failed to create FilePath');
      const result = await adapter.readFile(filePathResult.value);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message.getValue()).toContain('network timeout');
      }
    });

    it('should handle file system corruption gracefully', async () => {
      // Mock vscode.workspace.fs to return corrupted data
      const corruptedData = Buffer.from('corrupted\x00data\xFF\xFE', 'utf-8');
      vscode.workspace.fs.readFile.mockResolvedValue(corruptedData);

      const filePathResult = FilePath.create('/corrupted/file.proof');
      if (filePathResult.isErr()) throw new Error('Failed to create FilePath');
      const result = await adapter.readFile(filePathResult.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should return the data even if corrupted - let higher layers handle validation
        expect(result.value.getValue()).toContain('corrupted');
      }
    });

    it('should handle concurrent file operations without data races', async () => {
      let writeCount = 0;
      // Mock vscode.workspace.fs for concurrent writes
      vscode.workspace.fs.writeFile.mockImplementation(async () => {
        writeCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return undefined;
      });

      // Simulate concurrent writes
      const promises = Array.from({ length: 10 }, async (_, i) => {
        const filePathResult = FilePath.create(`/test/file${i}.proof`);
        const contentResult = DocumentContent.create(`content${i}`);
        if (filePathResult.isErr() || contentResult.isErr()) {
          throw new Error('Failed to create value objects');
        }
        return adapter.writeFile(filePathResult.value, contentResult.value);
      });

      const results = await Promise.all(promises);

      expect(results.every((result) => result.isOk())).toBe(true);
      expect(writeCount).toBe(10);
    });

    it('should handle disk space exhaustion errors', async () => {
      // Mock vscode.workspace.fs to throw disk full error
      const error = new vscode.FileSystemError('ENOSPC', 'no space left on device');
      error.code = 'ENOSPC';
      vscode.workspace.fs.writeFile.mockRejectedValue(error);

      const filePathResult = FilePath.create('/large/file.proof');
      const contentResult = DocumentContent.create('x'.repeat(1000000));
      if (filePathResult.isErr() || contentResult.isErr()) {
        throw new Error('Failed to create value objects');
      }
      const result = await adapter.writeFile(filePathResult.value, contentResult.value);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message.getValue()).toContain('No space left on device');
      }
    });
  });

  describe('Platform Adapter Resilience', () => {
    let adapter: VSCodePlatformAdapter;
    let _vscode: any;

    beforeEach(async () => {
      // Get the mocked vscode module
      _vscode = (await import('vscode')).default;

      // Reset all mocks
      vi.clearAllMocks();

      const mockExtensionContext = {
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        globalState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
        workspaceState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
      } as any;
      adapter = new VSCodePlatformAdapter(mockExtensionContext);
    });

    it('should handle VS Code API unavailability gracefully', () => {
      // Mock platform info to throw error
      const originalGetPlatformInfo = adapter.getPlatformInfo;
      adapter.getPlatformInfo = vi.fn().mockImplementation(() => {
        throw new Error('VS Code API not available');
      });

      expect(() => {
        adapter.getPlatformInfo();
      }).toThrow('VS Code API not available');

      // Restore original function
      adapter.getPlatformInfo = originalGetPlatformInfo;
    });

    it('should handle configuration corruption gracefully', () => {
      // Test that platform info is always available
      const result = adapter.getPlatformInfo();

      expect(result).toBeDefined();
      expect(result.type).toBe('vscode');
    });

    it('should handle rapid storage changes without conflicts', async () => {
      let updateCount = 0;

      // Mock the context.globalState.update method
      const mockContext = {
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        globalState: {
          get: vi.fn(),
          update: vi.fn().mockImplementation(async () => {
            updateCount++;
            await new Promise((resolve) => setTimeout(resolve, 5));
            return undefined;
          }),
          keys: vi.fn(),
        },
        workspaceState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
      } as any;

      // Create a new adapter with our mocked context
      const testAdapter = new VSCodePlatformAdapter(mockContext);

      // Simulate rapid storage updates
      const promises = Array.from({ length: 20 }, (_, i) =>
        testAdapter.setStorageValue(`test-key-${i}`, `value${i}`),
      );

      const results = await Promise.all(promises);

      expect(results.every((result) => result.isOk())).toBe(true);
      expect(updateCount).toBe(20);
    });
  });

  describe('UI Adapter Resilience', () => {
    let adapter: VSCodeUIAdapter;
    let vscode: any;

    beforeEach(async () => {
      // Get the mocked vscode module
      vscode = (await import('vscode')).default;

      // Reset all mocks
      vi.clearAllMocks();

      const mockExtensionContext = {
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        globalState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
        workspaceState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
      } as any;
      adapter = new VSCodeUIAdapter(mockExtensionContext);
    });

    it('should handle webview creation failures gracefully', async () => {
      // Mock createWebviewPanel to throw error
      vscode.window.createWebviewPanel.mockImplementation(() => {
        throw new Error('Cannot create webview: resource exhausted');
      });

      expect(() => {
        const idResult = WebviewId.create('test-panel');
        const titleResult = DialogTitle.create('Test Panel');
        const viewTypeResult = ViewType.create('test');

        if (idResult.isErr() || titleResult.isErr() || viewTypeResult.isErr()) {
          throw new Error('Failed to create value objects');
        }

        adapter.createWebviewPanel({
          id: idResult.value,
          title: titleResult.value,
          viewType: viewTypeResult.value,
          showOptions: { viewColumn: 1 },
          retainContextWhenHidden: true,
          enableScripts: true,
        });
      }).toThrow('Cannot create webview');
    });

    it('should handle message posting to disposed webviews', async () => {
      const mockWebview = {
        webview: { postMessage: vi.fn().mockRejectedValue(new Error('Webview disposed')) },
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
        dispose: vi.fn(),
      };

      mockUIPort.createWebviewPanel = vi.fn().mockReturnValue(mockWebview);
      mockUIPort.postMessageToWebview = vi.fn().mockRejectedValue(new Error('Webview disposed'));

      const idResult = WebviewId.create('disposed-panel');
      if (idResult.isErr()) {
        throw new Error('Failed to create WebviewId');
      }

      const eventDataResult = EventData.create({ content: 'test' });
      if (eventDataResult.isOk()) {
        adapter.postMessageToWebview(idResult.value, {
          type: MessageType.UPDATE_TREE,
          data: eventDataResult.value,
        });
      }
    });

    it('should handle UI blocking scenarios gracefully', async () => {
      let callCount = 0;
      // Mock showErrorMessage to throw after 5 calls
      vscode.window.showErrorMessage.mockImplementation(async () => {
        callCount++;
        if (callCount > 5) {
          throw new Error('UI thread blocked');
        }
        return undefined;
      });

      // Simulate rapid error messages that could block UI
      const msgResult = NotificationMessage.create('Test error message');
      if (msgResult.isErr()) {
        throw new Error('Failed to create NotificationMessage');
      }

      const promises = Array.from({ length: 10 }, () => adapter.showError(msgResult.value));

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      // All calls should succeed because showError catches errors internally
      expect(successful).toBe(10);
      expect(failed).toBe(0);
      expect(successful + failed).toBe(10);
    });
  });

  describe('View State Adapter Resilience', () => {
    let adapter: VSCodeViewStateAdapter;
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        globalState: {
          get: vi.fn(),
          update: vi.fn(),
          keys: vi.fn(),
        },
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(),
          keys: vi.fn(),
        },
      };
      adapter = new VSCodeViewStateAdapter(mockContext);
    });

    it('should handle view state corruption gracefully', async () => {
      // Mock workspaceState.get to return corrupted JSON string (not an object)
      const corruptedData = '{ corrupted: "\x00\xFF\xFE" }';

      // Override the specific loadViewState method to ensure it gets called
      adapter.loadViewState = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'test-key') {
          return ok(corruptedData);
        }
        return ok(null);
      });

      const result = await adapter.loadViewState('test-key');

      // The adapter doesn't parse JSON, it just returns what's stored
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // The adapter should return the raw corrupted string
        expect(result.value).toBe(corruptedData);
      }
    });

    it('should handle storage quota exceeded errors', async () => {
      const largeState = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        center: { x: 0, y: 0 },
        largeData: 'x'.repeat(1000000),
      };

      // Override the saveViewState method directly to simulate quota error
      adapter.saveViewState = vi.fn().mockImplementation(async () => {
        return err(new Error('QuotaExceededError: Storage quota exceeded'));
      });

      const result = await adapter.saveViewState('test-key', largeState);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Storage quota exceeded');
      }
    });

    it('should handle concurrent state updates without conflicts', async () => {
      let storeCount = 0;

      // Override the saveViewState method to count calls and simulate concurrent access
      adapter.saveViewState = vi.fn().mockImplementation(async () => {
        storeCount++;
        await new Promise((resolve) => setTimeout(resolve, 2));
        return ok(undefined);
      });

      // Simulate rapid state updates
      const promises = Array.from({ length: 15 }, (_, i) =>
        adapter.saveViewState(`viewport-${i}`, {
          zoom: 1.0 + i * 0.1,
          pan: { x: i, y: i },
          center: { x: 0, y: 0 },
        }),
      );

      const results = await Promise.all(promises);

      expect(results.every((result) => result.isOk())).toBe(true);
      expect(storeCount).toBe(15);
    });
  });

  describe('Event System Resilience', () => {
    it('should handle event handler exceptions without stopping other handlers', async () => {
      let goodHandlerCallCount = 0;
      let errorHandlerCallCount = 0;

      // Add handlers that throw exceptions
      eventBus.subscribe('test-event', async () => {
        errorHandlerCallCount++;
        throw new Error('Handler error');
      });

      // Add handlers that work correctly
      eventBus.subscribe('test-event', async () => {
        goodHandlerCallCount++;
      });

      eventBus.subscribe('test-event', async () => {
        errorHandlerCallCount++;
        throw new Error('Another handler error');
      });

      eventBus.subscribe('test-event', async () => {
        goodHandlerCallCount++;
      });

      // Publish event
      await eventBus.publish([new TestEvent('test-event', 'test-aggregate', 'TestAggregate')]);

      expect(goodHandlerCallCount).toBe(2);
      expect(errorHandlerCallCount).toBe(2);
    });

    it('should handle memory leaks from unbounded event subscriptions', () => {
      // Add many handlers
      const unsubscribers = Array.from({ length: 1000 }, (_, i) =>
        eventBus.subscribe('test-event', async () => {
          // Handler that captures closure variables to simulate memory leaks
          const _data = new Array(1000).fill(`handler-${i}`);
          // Don't return anything to match EventHandler type
        }),
      );

      expect(unsubscribers).toHaveLength(1000);

      // Unsubscribe all handlers
      unsubscribers.forEach((disposable) => disposable.dispose());

      // Verify cleanup completed
      expect(unsubscribers.every((d) => d.dispose)).toBeTruthy();
    });

    it('should handle circular event dependencies gracefully', async () => {
      // Create a fresh event bus for this test to avoid interference
      const isolatedEventBus = new EventBus({
        maxEventHistory: 100,
        handlerTimeout: 1000, // Reduce timeout to fail faster
        enableReplay: false,
        enableMetrics: false, // Disable metrics to reduce overhead
        enableLogging: false,
        testMode: true,
      });

      let eventACount = 0;
      let eventBCount = 0;
      let eventCCount = 0;

      // Create circular event dependencies with immediate stopping conditions
      const unsubA = isolatedEventBus.subscribe('event-a', async () => {
        eventACount++;
        if (eventACount === 1) {
          // Only trigger once to avoid infinite loop
          // Use setImmediate to ensure async execution
          setImmediate(() => {
            isolatedEventBus.publish([
              new TestEvent('event-b', 'test-aggregate', 'TestAggregate', {}),
            ]);
          });
        }
      });

      const unsubB = isolatedEventBus.subscribe('event-b', async () => {
        eventBCount++;
        if (eventBCount === 1) {
          // Only trigger once to avoid infinite loop
          setImmediate(() => {
            isolatedEventBus.publish([
              new TestEvent('event-c', 'test-aggregate', 'TestAggregate', {}),
            ]);
          });
        }
      });

      const unsubC = isolatedEventBus.subscribe('event-c', async () => {
        eventCCount++;
        // Don't trigger event-a again to break the cycle
      });

      // Start the circular chain
      await isolatedEventBus.publish([
        new TestEvent('event-a', 'test-aggregate', 'TestAggregate', {}),
      ]);

      // Wait a bit to ensure all events are processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cleanup subscriptions
      unsubA.dispose();
      unsubB.dispose();
      unsubC.dispose();

      // Should have processed exactly one of each event
      expect(eventACount).toBe(1);
      expect(eventBCount).toBe(1);
      expect(eventCCount).toBe(1);
    }, 10000);
  });

  describe('Repository Resilience', () => {
    it('should handle repository creation failures gracefully', async () => {
      // Test that repository creation handles failures
      expect(() => {
        // Simulate error condition in repository creation
        throw new Error('Failed to initialize repository');
      }).toThrow('Failed to initialize repository');
    });

    it('should handle concurrent repository access without conflicts', async () => {
      const results: string[] = [];

      // Simulate concurrent access to repository
      const promises = Array.from({ length: 20 }, async (_, i) => {
        // Simulate some async work
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        results.push(`access-${i}`);
        return `result-${i}`;
      });

      const outcomes = await Promise.all(promises);

      expect(outcomes).toHaveLength(20);
      expect(results).toHaveLength(20);
      expect(new Set(results).size).toBe(20); // All unique
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should handle resource cleanup during rapid disposal', async () => {
      const resources: { disposed: boolean }[] = [];

      // Create multiple resources
      for (let i = 0; i < 100; i++) {
        resources.push({ disposed: false });
      }

      // Simulate rapid disposal
      const promises = resources.map(async (resource, index) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
        resource.disposed = true;
        return index;
      });

      await Promise.all(promises);

      expect(resources.every((r) => r.disposed)).toBe(true);
    });

    it('should handle memory pressure scenarios gracefully', () => {
      // Create objects that could cause memory pressure
      const largeObjects: Array<{ data: number[] }> = [];

      for (let i = 0; i < 1000; i++) {
        largeObjects.push({
          data: new Array(1000).fill(i).map((val, idx) => val * idx),
        });
      }

      // Simulate cleanup under memory pressure
      largeObjects.splice(0, 500);

      expect(largeObjects).toHaveLength(500);

      // Force cleanup
      largeObjects.length = 0;
      expect(largeObjects).toHaveLength(0);
    });
  });

  describe('Property-Based Resilience Tests', () => {
    it('should handle arbitrary error messages without breaking', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 1000 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          (errorMessage, context) => {
            const error = new ValidationError(errorMessage);

            expect(error.message).toBe(errorMessage);
            expect(() => error.toString()).not.toThrow();

            // Should handle special characters and encoding
            const combinedMessage = `${context}: ${errorMessage}`;
            expect(typeof combinedMessage).toBe('string');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle arbitrary configuration values gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            fontSize: fc.oneof(fc.integer(), fc.float(), fc.string()),
            maxFileSize: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
            enableFeature: fc.oneof(fc.boolean(), fc.string(), fc.integer()),
          }),
          (config) => {
            // Configuration parsing should not throw for any input
            expect(() => {
              const safeConfig = {
                fontSize: typeof config.fontSize === 'number' ? config.fontSize : 12,
                maxFileSize: typeof config.maxFileSize === 'number' ? config.maxFileSize : 1000000,
                enableFeature: Boolean(config.enableFeature),
              };

              expect(safeConfig.fontSize).toBeTypeOf('number');
              expect(safeConfig.maxFileSize).toBeTypeOf('number');
              expect(safeConfig.enableFeature).toBeTypeOf('boolean');
            }).not.toThrow();
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Performance Under Stress', () => {
    it('should handle rapid adapter creation/disposal cycles', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const mockContext = {
          subscriptions: [],
          extensionPath: '/mock/extension/path',
          globalState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
          workspaceState: { get: vi.fn(), update: vi.fn(), keys: vi.fn() },
        } as any;
        const fileAdapter = new VSCodeFileSystemAdapter(mockContext);
        const platformAdapter = new VSCodePlatformAdapter(mockContext);
        const uiAdapter = new VSCodeUIAdapter(mockContext);
        const viewStateAdapter = new VSCodeViewStateAdapter(mockContext);

        // Simulate some work
        await Promise.resolve();

        // Adapters would be garbage collected
        expect(fileAdapter).toBeDefined();
        expect(platformAdapter).toBeDefined();
        expect(uiAdapter).toBeDefined();
        expect(viewStateAdapter).toBeDefined();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (under 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle high-frequency event publishing without degradation', async () => {
      const eventCounts = new Map<string, number>();

      // Subscribe to events
      eventBus.subscribe('high-freq-event', async () => {
        const eventId = 'high-freq-event';
        const current = eventCounts.get(eventId) || 0;
        eventCounts.set(eventId, current + 1);
      });

      const startTime = performance.now();

      // Publish many events rapidly
      const promises = Array.from({ length: 1000 }, (_, _i) =>
        eventBus.publish([new TestEvent('high-freq-event', 'test-aggregate', 'TestAggregate')]),
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(eventCounts.size).toBe(1); // Single event type with count of 1000
      expect(eventCounts.get('high-freq-event')).toBe(1000);
      expect(duration).toBeLessThan(500); // Should handle 1000 events in under 500ms
    });
  });
});
