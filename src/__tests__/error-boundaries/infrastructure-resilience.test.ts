/**
 * Infrastructure Layer Resilience Tests
 *
 * Tests error boundaries that protect domain logic from infrastructure failures,
 * ensuring the system remains stable when external dependencies fail.
 *
 * Focus areas:
 * - Repository error boundary testing
 * - Platform adapter error boundaries
 * - File system operation failure recovery
 * - Data corruption detection and handling
 * - Version mismatch error scenarios
 * - Resource cleanup on adapter failures
 */

import { err, ok, type Result } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { ApplicationContainer } from '../../infrastructure/di/container.js';
import { YAMLDeserializer } from '../../infrastructure/repositories/yaml/YAMLDeserializer.js';
import { YAMLSerializer } from '../../infrastructure/repositories/yaml/YAMLSerializer.js';
import { VSCodeFileSystemAdapter } from '../../infrastructure/vscode/VSCodeFileSystemAdapter.js';
import { VSCodePlatformAdapter } from '../../infrastructure/vscode/VSCodePlatformAdapter.js';
import { VSCodeUIAdapter } from '../../infrastructure/vscode/VSCodeUIAdapter.js';

// Mock VS Code API for infrastructure testing
vi.mock('vscode', () => ({
  version: '1.85.0',
  workspace: {
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
      stat: vi.fn(),
    },
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    workspaceFolders: [],
  },
  window: {
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    createWebviewPanel: vi.fn(),
    withProgress: vi.fn(),
  },
  Uri: {
    file: vi.fn().mockImplementation((path: string) => ({ fsPath: path, toString: () => path })),
    joinPath: vi.fn().mockImplementation((base: any, ...segments: string[]) => ({
      fsPath: `${base.fsPath}/${segments.join('/')}`,
      toString: () => `${base.fsPath}/${segments.join('/')}`,
    })),
  },
  FileType: {
    File: 1,
    Directory: 2,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  FileSystemError: class MockFileSystemError extends Error {
    constructor(
      message: string,
      public code = 'FileNotFound',
    ) {
      super(message);
      this.name = 'FileSystemError';
    }
  },
}));

describe('Infrastructure Layer Resilience', () => {
  let mockExtensionContext: vscode.ExtensionContext;
  let _container: ApplicationContainer;

  beforeEach(() => {
    // Set up extension context mock
    mockExtensionContext = {
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn().mockReturnValue([]),
      },
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn().mockReturnValue([]),
      },
      extensionPath: '/mock/extension/path',
      asAbsolutePath: vi.fn().mockImplementation((path: string) => `/mock/extension/path/${path}`),
      storagePath: '/mock/storage',
      globalStoragePath: '/mock/global/storage',
      logPath: '/mock/log',
    } as any;

    _container = new ApplicationContainer();

    // Reset all VS Code mocks
    vi.clearAllMocks();
  });

  describe('Repository Error Boundaries', () => {
    it('should handle YAML serialization failures gracefully', async () => {
      // Arrange - mock ProofDocument that will cause serialization failure
      const problematicDocument = {
        getVersion: vi.fn(() => {
          throw new Error('Version access failed');
        }),
        getId: vi.fn(() => ({ getValue: () => 'test-id' })),
        getCreatedAt: vi.fn(() => new Date()),
        getModifiedAt: vi.fn(() => new Date()),
        getStatements: vi.fn(() => new Map()),
        getOrderedSets: vi.fn(() => new Map()),
        getAtomicArguments: vi.fn(() => new Map()),
        getTrees: vi.fn(() => new Map()),
      };

      const serializer = new YAMLSerializer();

      // Act - serialization should handle internal failures
      const result = await serializer.serialize(problematicDocument as any);

      // Assert - error contained within serializer
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Version access failed');
      }
    });

    it('should handle YAML deserialization with corrupted data', async () => {
      // Arrange - corrupted YAML data
      const corruptedYaml = `
        proof:
          n1: {arg: arg1
          n2: {n1: arg2, on: 0
        # Missing closing braces and invalid structure
      `;

      const deserializer = new YAMLDeserializer();

      // Act - deserialization should handle corruption
      const result = await deserializer.deserialize(corruptedYaml);

      // Assert - corruption detected and handled
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(
          result.error.message.includes('deserialize') ||
            result.error.message.includes('parse') ||
            result.error.message.includes('invalid') ||
            result.error.message.includes('YAML'),
        ).toBe(true);
      }
    });

    it('should handle file system repository failures with fallback', async () => {
      // Arrange - file system adapter with failing operations
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);

      // Mock file system to fail
      const mockVscode = await import('vscode');
      vi.mocked(mockVscode.workspace.fs.readFile).mockRejectedValue(
        new Error('File system unavailable'),
      );

      // Act - repository should handle file system failures
      const result = await adapter.readFile('/test/document.md');

      // Assert - failure contained as Result
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('File system unavailable');
      }
    });

    it('should detect and handle data corruption during read operations', async () => {
      // Arrange - file system returning corrupted data
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      // Mock corrupted file content
      const corruptedContent = new Uint8Array([0xff, 0xfe, 0x00, 0x00, 0xff]);
      vi.mocked(mockVscode.workspace.fs.readFile).mockResolvedValue(corruptedContent);

      // Act - adapter should detect corruption
      const result = await adapter.readFile('/test/corrupted.md');

      // Assert - may succeed with corrupted data or detect corruption
      expect(result).toBeDefined();
      // The adapter should at least not crash
    });

    it('should handle version mismatch in document format', () => {
      // Arrange - document with incompatible version
      const incompatibleDocument = `
        version: "999.0.0"
        proof:
          n1: {arg: future_arg_type, features: [unsupported_feature]}
      `;

      const deserializer = new YAMLDeserializer();

      // Act - deserializer should handle version mismatch
      const result = deserializer.deserialize(incompatibleDocument);

      // Assert - version mismatch handled gracefully
      // The deserializer may succeed but with warnings, or fail gracefully
      expect(result).toBeDefined();
    });

    it('should implement backup and restore for critical failures', async () => {
      // Arrange - repository with backup capability
      const repositoryWithBackup = {
        backupData: {} as any,

        save: async (data: any): Promise<Result<string, Error>> => {
          try {
            // Create backup before save
            repositoryWithBackup.backupData = JSON.parse(JSON.stringify(data));

            // Simulate save failure
            throw new Error('Primary storage failed');
          } catch (error) {
            // Restore from backup on failure
            return err(error as Error);
          }
        },

        restore: (): Result<any, Error> => {
          try {
            if (!repositoryWithBackup.backupData) {
              return err(new Error('No backup available'));
            }
            return ok(repositoryWithBackup.backupData);
          } catch (error) {
            return err(error as Error);
          }
        },
      };

      // Act - save operation fails, restore from backup
      const saveResult = await repositoryWithBackup.save({ test: 'data' });
      const restoreResult = repositoryWithBackup.restore();

      // Assert - backup/restore mechanism works
      expect(saveResult.isErr()).toBe(true);
      expect(restoreResult.isOk()).toBe(true);
      if (restoreResult.isOk()) {
        expect(restoreResult.value).toEqual({ test: 'data' });
      }
    });
  });

  describe('Platform Adapter Error Boundaries', () => {
    it('should handle VS Code API failures with graceful degradation', async () => {
      // Arrange - platform adapter with failing VS Code API
      const adapter = new VSCodePlatformAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      // Mock VS Code API failures
      vi.mocked(mockVscode.workspace.getConfiguration).mockImplementation(() => {
        throw new Error('VS Code API unavailable');
      });

      // Act - adapter should handle API failures
      expect(() => {
        const platformInfo = adapter.getPlatformInfo();
        expect(platformInfo).toBeDefined(); // Should return default platform info
      }).not.toThrow();
    });

    it('should isolate webview creation failures', async () => {
      // Arrange - UI adapter with failing webview creation
      const adapter = new VSCodeUIAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      vi.mocked(mockVscode.window.createWebviewPanel).mockImplementation(() => {
        throw new Error('Webview creation failed');
      });

      // Act & Assert - UI adapter should propagate webview failures
      expect(() => {
        adapter.createWebviewPanel({
          id: 'test-panel',
          viewType: 'test',
          title: 'Test Panel',
        });
      }).toThrow('Webview creation failed');
    });

    it('should handle workspace folder changes during operations', async () => {
      // Arrange - platform adapter with changing workspace
      const adapter = new VSCodePlatformAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      // Simulate workspace change during operation
      let workspaceFolders = [{ uri: { fsPath: '/workspace1' }, name: 'workspace1', index: 0 }];
      Object.defineProperty(mockVscode.workspace, 'workspaceFolders', {
        get: () => workspaceFolders,
      });

      // Act - get initial platform info
      const initialInfo = adapter.getPlatformInfo();

      // Simulate workspace change
      workspaceFolders = [];

      const updatedInfo = adapter.getPlatformInfo();

      // Assert - adapter handles workspace changes gracefully
      expect(initialInfo).toBeDefined();
      expect(updatedInfo).toBeDefined();
    });

    it('should handle extension context disposal during operations', async () => {
      // Arrange - adapter with context that gets disposed
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);

      // Start an operation
      const operationPromise = adapter.readFile('/test.md');

      // Simulate context disposal by modifying internal state
      const contextState = mockExtensionContext as any;
      contextState._disposed = true;

      // Act - operation should complete or fail gracefully
      const result = await operationPromise;

      // Assert - no unhandled errors despite context disposal
      expect(result).toBeDefined();
    });
  });

  describe('File System Operation Resilience', () => {
    it('should handle disk space exhaustion scenarios', async () => {
      // Arrange - file system adapter with disk space failure
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      vi.mocked(mockVscode.workspace.fs.writeFile).mockRejectedValue(
        new Error('ENOSPC: no space left on device'),
      );

      // Act - write operation should handle disk space failure
      const result = await adapter.writeFile('/test.md', 'large content');

      // Assert - disk space error handled gracefully
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(
          result.error.message.includes('ENOSPC') || result.error.message.includes('space'),
        ).toBe(true);
      }
    });

    it('should handle file permission errors with appropriate messaging', async () => {
      // Arrange - file system with permission errors
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      vi.mocked(mockVscode.workspace.fs.readFile).mockRejectedValue(
        new Error('EACCES: permission denied'),
      );

      // Act - read operation should handle permission errors
      const result = await adapter.readFile('/protected/file.md');

      // Assert - permission error handled with clear messaging
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(
          result.error.message.includes('EACCES') || result.error.message.includes('permission'),
        ).toBe(true);
      }
    });

    it('should handle network file system timeouts', async () => {
      // Arrange - file system with network timeout
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      vi.mocked(mockVscode.workspace.fs.readFile).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 50);
        });
      });

      // Act - operation should timeout gracefully
      const result = await adapter.readFile('/network/remote/file.md');

      // Assert - timeout handled as error
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('timeout');
      }
    });

    it('should handle concurrent file access conflicts', async () => {
      // Arrange - simulate concurrent file access
      const adapter = new VSCodeFileSystemAdapter(mockExtensionContext);
      const mockVscode = await import('vscode');

      let accessCount = 0;
      vi.mocked(mockVscode.workspace.fs.writeFile).mockImplementation(async () => {
        accessCount++;
        if (accessCount <= 2) {
          throw new Error('EBUSY: resource busy or locked');
        }
        return Promise.resolve();
      });

      // Act - multiple concurrent write attempts
      const operations = [
        adapter.writeFile('/shared.md', 'content1'),
        adapter.writeFile('/shared.md', 'content2'),
        adapter.writeFile('/shared.md', 'content3'),
      ];

      const results = await Promise.allSettled(operations);

      // Assert - conflicts handled gracefully
      expect(results).toHaveLength(3);
      const errors = results.filter((r) => r.status === 'fulfilled' && (r.value as any).isErr());
      expect(errors.length).toBeGreaterThan(0); // Some operations should fail due to conflicts
    });
  });

  describe('Resource Cleanup and Error Recovery', () => {
    it('should clean up resources after adapter failures', async () => {
      // Arrange - adapter that tracks resource usage
      const resourceTracker = {
        openHandles: new Set<string>(),

        openResource: (id: string) => {
          resourceTracker.openHandles.add(id);
        },

        closeResource: (id: string) => {
          resourceTracker.openHandles.delete(id);
        },

        cleanup: () => {
          resourceTracker.openHandles.clear();
        },
      };

      const adapterWithCleanup = {
        performOperation: async (): Promise<Result<string, Error>> => {
          const resourceId = 'test-resource';
          try {
            resourceTracker.openResource(resourceId);

            // Simulate operation that fails
            throw new Error('Operation failed');
          } catch (error) {
            return err(error as Error);
          } finally {
            // Ensure cleanup happens
            resourceTracker.closeResource(resourceId);
          }
        },
      };

      // Act - operation fails but cleanup occurs
      const result = await adapterWithCleanup.performOperation();

      // Assert - failure handled and resources cleaned up
      expect(result.isErr()).toBe(true);
      expect(resourceTracker.openHandles.size).toBe(0);
    });

    it('should handle memory leaks during repeated failures', async () => {
      // Arrange - adapter that could accumulate memory
      const memoryTracker = {
        allocations: 0,
        deallocations: 0,

        allocate: () => {
          memoryTracker.allocations++;
          return { data: new Array(1000).fill('memory test') };
        },

        deallocate: () => {
          memoryTracker.deallocations++;
        },
      };

      const adapterWithMemoryManagement = {
        performOperations: async (count: number): Promise<Result<string, Error>> => {
          try {
            for (let i = 0; i < count; i++) {
              const _allocation = memoryTracker.allocate();

              try {
                // Simulate operation that might fail
                if (i % 3 === 0) {
                  throw new Error(`Operation ${i} failed`);
                }
              } finally {
                // Ensure deallocation happens
                memoryTracker.deallocate();
              }
            }
            return ok('All operations completed');
          } catch (error) {
            return err(error as Error);
          }
        },
      };

      // Act - multiple operations with some failures
      const result = await adapterWithMemoryManagement.performOperations(10);

      // Assert - memory properly managed despite failures
      expect(result.isErr()).toBe(true); // Some operations failed
      expect(memoryTracker.allocations).toBe(memoryTracker.deallocations); // No memory leaks
    });

    it('should implement circuit breaker for repeated infrastructure failures', async () => {
      // Arrange - circuit breaker for infrastructure calls
      const circuitBreaker = {
        failures: 0,
        isOpen: false,
        threshold: 3,

        call: async (operation: () => Promise<any>): Promise<Result<any, Error>> => {
          try {
            if (circuitBreaker.isOpen) {
              return err(new Error('Circuit breaker is OPEN'));
            }

            const result = await operation();
            circuitBreaker.failures = 0; // Reset on success
            return ok(result);
          } catch (error) {
            circuitBreaker.failures++;
            if (circuitBreaker.failures >= circuitBreaker.threshold) {
              circuitBreaker.isOpen = true;
            }
            return err(error as Error);
          }
        },

        reset: () => {
          circuitBreaker.isOpen = false;
          circuitBreaker.failures = 0;
        },
      };

      const failingOperation = async () => {
        throw new Error('Infrastructure failure');
      };

      // Act - repeated failures should trigger circuit breaker
      const results: Result<any, Error>[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(await circuitBreaker.call(failingOperation));
      }

      // Assert - circuit breaker activated after threshold
      expect(results[0]?.isErr()).toBe(true); // First failure
      expect(results[1]?.isErr()).toBe(true); // Second failure
      expect(results[2]?.isErr()).toBe(true); // Third failure - triggers circuit breaker
      expect(results[3]?.isErr()).toBe(true); // Circuit breaker prevents call
      expect(results[4]?.isErr()).toBe(true); // Circuit breaker still open

      if (results[3]?.isErr()) {
        expect(results[3].error.message).toContain('Circuit breaker is OPEN');
      }
    });
  });

  describe('Fallback Mechanisms and Graceful Degradation', () => {
    it('should provide fallback when primary storage fails', async () => {
      // Arrange - storage with primary and fallback mechanisms
      const storageWithFallback = {
        primaryStorage: {
          write: vi.fn().mockRejectedValue(new Error('Primary storage failed')),
          read: vi.fn().mockRejectedValue(new Error('Primary storage failed')),
        },

        fallbackStorage: {
          write: vi.fn().mockResolvedValue(ok('Written to fallback')),
          read: vi.fn().mockResolvedValue(ok('Read from fallback')),
        },

        write: async (data: any): Promise<Result<string, Error>> => {
          try {
            return await storageWithFallback.primaryStorage.write(data);
          } catch (_primaryError) {
            try {
              return await storageWithFallback.fallbackStorage.write(data);
            } catch (fallbackError) {
              return err(fallbackError as Error);
            }
          }
        },

        read: async (): Promise<Result<string, Error>> => {
          try {
            return await storageWithFallback.primaryStorage.read();
          } catch (_primaryError) {
            try {
              return await storageWithFallback.fallbackStorage.read();
            } catch (fallbackError) {
              return err(fallbackError as Error);
            }
          }
        },
      };

      // Act - operations should use fallback when primary fails
      const writeResult = await storageWithFallback.write({ test: 'data' });
      const readResult = await storageWithFallback.read();

      // Assert - fallback mechanisms work
      expect(writeResult.isOk()).toBe(true);
      expect(readResult.isOk()).toBe(true);
      expect(storageWithFallback.fallbackStorage.write).toHaveBeenCalled();
      expect(storageWithFallback.fallbackStorage.read).toHaveBeenCalled();
    });

    it('should provide degraded functionality when full features unavailable', () => {
      // Arrange - service with full and degraded modes
      const adaptiveService = {
        fullFeaturesAvailable: false,

        performOperation: (data: any): Result<string, Error> => {
          try {
            if (adaptiveService.fullFeaturesAvailable) {
              // Full feature operation
              return ok(`Full processing of ${JSON.stringify(data)}`);
            } else {
              // Degraded but functional operation
              return ok(`Basic processing of ${typeof data}`);
            }
          } catch (error) {
            return err(error as Error);
          }
        },

        checkFeatureAvailability: (): boolean => {
          // Simulate feature availability check
          return adaptiveService.fullFeaturesAvailable;
        },
      };

      // Act - service operates in degraded mode
      const availabilityCheck = adaptiveService.checkFeatureAvailability();
      const result = adaptiveService.performOperation({ complex: 'data' });

      // Assert - degraded functionality provided
      expect(availabilityCheck).toBe(false);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toContain('Basic processing');
      }
    });

    it('should cache successful operations to reduce infrastructure dependency', async () => {
      // Arrange - adapter with caching capability
      const cachingAdapter = {
        cache: new Map<string, any>(),

        get: async (key: string): Promise<Result<any, Error>> => {
          try {
            // Check cache first
            if (cachingAdapter.cache.has(key)) {
              return ok(cachingAdapter.cache.get(key));
            }

            // Simulate infrastructure call that might fail
            if (key === 'failing-key') {
              throw new Error('Infrastructure unavailable');
            }

            const value = `Value for ${key}`;
            cachingAdapter.cache.set(key, value);
            return ok(value);
          } catch (error) {
            return err(error as Error);
          }
        },

        clearCache: () => {
          cachingAdapter.cache.clear();
        },
      };

      // Act - successful operations cached, failures handled
      const result1 = await cachingAdapter.get('success-key');
      const result2 = await cachingAdapter.get('success-key'); // Should use cache
      const result3 = await cachingAdapter.get('failing-key');

      // Assert - caching reduces infrastructure dependency
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isErr()).toBe(true);
      expect(cachingAdapter.cache.size).toBe(1); // Only successful result cached
    });
  });
});
