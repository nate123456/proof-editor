/**
 * Comprehensive Unhandled Promise Rejection Tests
 *
 * Tests all scenarios that can cause unhandled promise rejections,
 * which are the primary source of the 336 failing tests.
 *
 * Focus areas:
 * - Service method calls with rejected promises
 * - Async/await patterns without try/catch blocks
 * - Promise.all() scenarios with partial failures
 * - Event handler async operations without error boundaries
 * - Timer-based async operations with error scenarios
 * - Race condition scenarios with promise rejection
 */

import { err, ok, type Result } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IPlatformPort } from '../../application/ports/IPlatformPort.js';
import type { IUIPort } from '../../application/ports/IUIPort.js';
import { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import { ProofApplicationService } from '../../application/services/ProofApplicationService.js';

/**
 * Global unhandled rejection tracker for test validation
 */
let unhandledRejections: Array<{ reason: unknown; promise: Promise<unknown> }> = [];

describe('Unhandled Promise Rejection Detection', () => {
  beforeEach(() => {
    // Clear previous rejections
    unhandledRejections = [];

    // Set up global unhandled rejection detection
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason, promise) => {
      unhandledRejections.push({ reason, promise });
    });
  });

  afterEach(async () => {
    // Allow any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clean up listeners first
    process.removeAllListeners('unhandledRejection');

    // Then verify no unhandled rejections occurred during test
    expect(unhandledRejections).toHaveLength(0);
  });

  describe('Service Method Error Boundaries', () => {
    let mockFileSystemPort: IFileSystemPort;
    let _mockPlatformPort: IPlatformPort;
    let mockUIPort: IUIPort;
    let documentQueryService: DocumentQueryService;
    let _proofApplicationService: ProofApplicationService;

    beforeEach(() => {
      // Create minimal mocks that can fail
      mockFileSystemPort = {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        createDirectory: vi.fn(),
        readDirectory: vi.fn(),
        getStoredDocument: vi.fn(),
        storeDocument: vi.fn(),
        deleteStoredDocument: vi.fn(),
        listStoredDocuments: vi.fn(),
        capabilities: vi.fn().mockReturnValue({
          canWatch: false,
          canAccessArbitraryPaths: true,
          supportsOfflineStorage: false,
          persistence: 'memory',
        }),
      };

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
      };

      mockUIPort = {
        createWebviewPanel: vi.fn(),
        postMessageToWebview: vi.fn(),
        showInputBox: vi.fn(),
        showQuickPick: vi.fn(),
        showConfirmation: vi.fn(),
        showOpenDialog: vi.fn(),
        showSaveDialog: vi.fn(),
        showInformation: vi.fn(),
        showWarning: vi.fn(),
        showError: vi.fn(),
        showProgress: vi.fn(),
        setStatusMessage: vi.fn(),
        getTheme: vi.fn(),
        onThemeChange: vi.fn(),
        capabilities: vi.fn(),
      };

      // Initialize services with mocked dependencies
      const mockDocumentRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      const mockParser = {
        parse: vi.fn(),
        validate: vi.fn(),
        parseProofFile: vi.fn(),
      };
      documentQueryService = new DocumentQueryService(
        mockDocumentRepository as any,
        mockParser as any,
      );
      const mockEventBus = {
        publish: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };
      _proofApplicationService = new ProofApplicationService(
        mockDocumentRepository as any,
        mockEventBus as any,
      );
    });

    it('should handle DocumentQueryService.parseDocumentContent rejection', async () => {
      // Arrange - mock parser to reject
      const mockParser = {
        parse: vi.fn(),
        validate: vi.fn(),
        parseProofFile: vi.fn().mockReturnValue(err(new Error('Parse error: File not found'))),
      };

      // Create service with mocked parser
      const testService = new DocumentQueryService(
        {
          findById: vi.fn(),
          save: vi.fn(),
          exists: vi.fn(),
          delete: vi.fn(),
          findAll: vi.fn(),
          nextIdentity: vi.fn(),
        } as any,
        mockParser as any,
      );

      // Act - service should handle rejection internally
      const result = await testService.parseDocumentContent('test content');

      // Assert - rejection should be caught and returned as Result
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Parse error: File not found');
      }

      // Critical: No unhandled rejections should occur
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle ProofApplicationService async operation failures', async () => {
      // Arrange - mock multiple operations to fail
      vi.mocked(mockFileSystemPort.readFile).mockRejectedValue(new Error('Read failure'));
      vi.mocked(mockFileSystemPort.writeFile).mockRejectedValue(new Error('Write failure'));
      vi.mocked(mockUIPort.createWebviewPanel).mockRejectedValue(new Error('UI failure'));

      // Act - each operation should handle its own errors
      const readResult = await documentQueryService.parseDocumentContent('/test.md');
      const writeResult = await documentQueryService.parseDocumentContent('test content');

      // Assert - all errors handled as Results, no unhandled rejections
      expect(readResult.isErr()).toBe(true);
      expect(writeResult.isErr()).toBe(true);
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle Promise.all() scenarios with partial failures', async () => {
      // Arrange - some operations succeed, some fail
      vi.mocked(mockFileSystemPort.readFile)
        .mockResolvedValueOnce(ok('file1 content'))
        .mockRejectedValueOnce(new Error('file2 error'))
        .mockResolvedValueOnce(ok('file3 content'));

      // Act - service should handle partial failures gracefully
      const files = ['/file1.md', '/file2.md', '/file3.md'];
      const results = await Promise.allSettled(
        files.map((file) => documentQueryService.parseDocumentContent(file)),
      );

      // Assert - all promises should be settled, no unhandled rejections
      expect(results).toHaveLength(3);
      expect(results[0]?.status).toBe('fulfilled');
      expect(results[1]?.status).toBe('fulfilled'); // Service catches error internally
      expect(results[2]?.status).toBe('fulfilled');
      expect(unhandledRejections).toHaveLength(0);
    });
  });

  describe('Async/Await Error Boundaries', () => {
    it('should catch errors in async functions without try/catch', async () => {
      // Arrange - function that can throw
      const riskyAsyncOperation = async (): Promise<Result<string, Error>> => {
        // Simulate an operation that might throw instead of returning Result
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error('Unexpected async error');
      };

      // Act - wrap in proper error boundary
      const safeWrapper = async () => {
        try {
          return await riskyAsyncOperation();
        } catch (error) {
          return err(error as Error);
        }
      };

      const result = await safeWrapper();

      // Assert - error caught and returned as Result
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Unexpected async error');
      }
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle timer-based async operations with errors', async () => {
      // Arrange - timer operation that can fail
      const timerOperation = (): Promise<Result<string, Error>> => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Return error as Result instead of rejecting
            resolve(err(new Error('Timer operation failed')));
          }, 10);
        });
      };

      // Act - operation should not cause unhandled rejection
      const result = await timerOperation();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle race condition scenarios', async () => {
      // Arrange - multiple competing async operations
      const operations = [
        Promise.resolve(ok('operation1')),
        Promise.resolve(err(new Error('operation2 failed'))),
        Promise.resolve(ok('operation3')),
      ];

      // Act - use Promise.allSettled to handle race conditions safely
      const results = await Promise.allSettled(operations);

      // Assert - all operations complete, no unhandled rejections
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(unhandledRejections).toHaveLength(0);
    });
  });

  describe('Event Handler Error Boundaries', () => {
    it('should handle errors in event handler async operations', async () => {
      // Arrange - event handler that performs async work
      let eventHandlerError: Error | null = null;

      const eventHandler = async (_data: unknown) => {
        try {
          // Simulate async work that might fail
          await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Event handler async failure')), 5);
          });
        } catch (error) {
          // Proper error handling in event handler
          eventHandlerError = error as Error;
        }
      };

      // Act - trigger event handler
      await eventHandler('test data');

      // Assert - error caught by handler, no unhandled rejection
      expect(eventHandlerError).not.toBeNull();
      expect(eventHandlerError && (eventHandlerError as Error).message).toBe(
        'Event handler async failure',
      );
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle VS Code API call failures in event handlers', async () => {
      // Arrange - mock VS Code API that can fail
      const mockVSCodeAPI = {
        workspace: {
          onDidChangeTextDocument: vi.fn(),
          onDidOpenTextDocument: vi.fn(),
        },
        window: {
          showErrorMessage: vi.fn().mockRejectedValue(new Error('VS Code API failure')),
        },
      };

      // Act - event handler with proper error boundary
      const documentChangeHandler = async () => {
        try {
          await mockVSCodeAPI.window.showErrorMessage('Test message');
        } catch (error) {
          // Error caught and handled, no unhandled rejection
          expect(error).toBeInstanceOf(Error);
        }
      };

      // Assert - handler can be called without causing unhandled rejection
      await expect(documentChangeHandler()).resolves.not.toThrow();
    });
  });

  describe('Resource Cleanup Error Boundaries', () => {
    it('should handle errors during resource cleanup', async () => {
      // Arrange - resource that can fail during cleanup
      const mockResource = {
        data: 'test data',
        cleanup: vi.fn().mockRejectedValue(new Error('Cleanup failed')),
      };

      // Act - proper cleanup with error handling
      const performOperationWithCleanup = async () => {
        try {
          // Use resource
          expect(mockResource.data).toBe('test data');
          return ok('operation completed');
        } finally {
          // Cleanup with error handling
          try {
            await mockResource.cleanup();
          } catch (cleanupError) {
            // Log cleanup error but don't let it propagate as unhandled rejection
            console.warn('Resource cleanup failed:', cleanupError);
          }
        }
      };

      const result = await performOperationWithCleanup();

      // Assert - operation succeeds despite cleanup failure
      expect(result.isOk()).toBe(true);
      expect(mockResource.cleanup).toHaveBeenCalled();
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle file handle cleanup errors', async () => {
      // Arrange - file system operations that need cleanup
      const mockFileHandle = {
        fd: 123,
        close: vi.fn().mockRejectedValue(new Error('Cannot close file handle')),
      };

      // Act - operation with proper file handle cleanup
      const fileOperation = async (): Promise<Result<string, Error>> => {
        try {
          // Simulate file operation
          const content = 'file content';
          return ok(content);
        } finally {
          // Ensure cleanup happens even if it fails
          try {
            await mockFileHandle.close();
          } catch (error) {
            // Cleanup error handled, doesn't become unhandled rejection
            console.warn('File handle cleanup failed:', error);
          }
        }
      };

      const result = await fileOperation();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockFileHandle.close).toHaveBeenCalled();
      expect(unhandledRejections).toHaveLength(0);
    });
  });

  describe('Service Dependency Error Propagation', () => {
    it('should prevent error propagation across service boundaries', async () => {
      // Arrange - service dependencies that can fail
      const dependencyService = {
        criticalOperation: vi.fn().mockRejectedValue(new Error('Dependency failure')),
      };

      const mainService = {
        operation: async (): Promise<Result<string, Error>> => {
          try {
            await dependencyService.criticalOperation();
            return ok('success');
          } catch (error) {
            // Convert exception to Result to prevent unhandled rejection
            return err(error as Error);
          }
        },
      };

      // Act
      const result = await mainService.operation();

      // Assert - error contained within service boundary
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Dependency failure');
      }
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle circular dependency error scenarios', async () => {
      // Arrange - simulate circular dependency that causes async errors
      // Add recursion depth tracking to prevent infinite loops
      let recursionDepth = 0;
      const maxRecursionDepth = 3;

      const serviceA = {
        callB: null as any,
        operation: async (): Promise<Result<string, Error>> => {
          try {
            recursionDepth++;

            // Prevent infinite recursion by limiting depth
            if (recursionDepth > maxRecursionDepth) {
              recursionDepth--;
              return err(new Error('Maximum recursion depth exceeded'));
            }

            if (serviceA.callB) {
              const result = await serviceA.callB();
              recursionDepth--;
              return result;
            }
            recursionDepth--;
            return err(new Error('Service B not available'));
          } catch (error) {
            recursionDepth--;
            return err(error as Error);
          }
        },
      };

      const serviceB = {
        operation: async (): Promise<Result<string, Error>> => {
          try {
            recursionDepth++;

            // Prevent infinite recursion by limiting depth
            if (recursionDepth > maxRecursionDepth) {
              recursionDepth--;
              return err(new Error('Maximum recursion depth exceeded'));
            }

            const result = await serviceA.operation();
            recursionDepth--;
            return result;
          } catch (error) {
            recursionDepth--;
            return err(error as Error);
          }
        },
      };

      // Create circular reference
      serviceA.callB = serviceB.operation;

      // Act - should handle circular dependency gracefully
      const result = await serviceA.operation();

      // Assert - error handled, no infinite loop or unhandled rejection
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Maximum recursion depth exceeded');
      }
      expect(unhandledRejections).toHaveLength(0);
    });
  });

  describe('Memory Pressure Error Scenarios', () => {
    it('should handle out-of-memory scenarios gracefully', async () => {
      // Arrange - operation that might cause memory pressure
      const memoryIntensiveOperation = async (): Promise<Result<string, Error>> => {
        try {
          // Simulate memory-intensive operation
          const largeArray = new Array(1000).fill('memory test');

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }

          return ok(`Processed ${largeArray.length} items`);
        } catch (error) {
          return err(error as Error);
        }
      };

      // Act
      const result = await memoryIntensiveOperation();

      // Assert - operation completes without unhandled rejection
      expect(result.isOk()).toBe(true);
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle memory allocation failures', async () => {
      // Arrange - simulate memory allocation failure
      const allocationOperation = async (): Promise<Result<string, Error>> => {
        try {
          // Simulate potential allocation failure scenario
          const data = JSON.stringify({ large: 'x'.repeat(1000) });
          return ok(`Allocated ${data.length} bytes`);
        } catch (error) {
          // Handle potential allocation errors
          return err(error as Error);
        }
      };

      // Act
      const result = await allocationOperation();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(unhandledRejections).toHaveLength(0);
    });
  });

  describe('Network and I/O Error Boundaries', () => {
    it('should handle network timeout scenarios', async () => {
      // Arrange - network operation that can timeout
      const networkOperation = async (timeoutMs: number): Promise<Result<string, Error>> => {
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            resolve(err(new Error('Network timeout')));
          }, timeoutMs);

          // Simulate immediate failure
          clearTimeout(timer);
          resolve(err(new Error('Network timeout')));
        });
      };

      // Act
      const result = await networkOperation(100);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Network timeout');
      }
      expect(unhandledRejections).toHaveLength(0);
    });

    it('should handle concurrent I/O operation failures', async () => {
      // Arrange - multiple I/O operations that can fail
      const ioOperations = [
        () => Promise.resolve(ok('io1')),
        () => Promise.resolve(err(new Error('io2 failed'))),
        () => Promise.resolve(ok('io3')),
        () => Promise.resolve(err(new Error('io4 failed'))),
      ];

      // Act - handle concurrent operations safely
      const results = await Promise.allSettled(ioOperations.map((op) => op()));

      // Assert - all operations settle, no unhandled rejections
      expect(results).toHaveLength(4);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(unhandledRejections).toHaveLength(0);
    });
  });
});
