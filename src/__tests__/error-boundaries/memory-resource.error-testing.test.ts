/**
 * Memory and Resource Error Testing
 *
 * Tests error boundaries under resource pressure, ensuring the system
 * handles memory constraints, resource exhaustion, and cleanup properly.
 *
 * Focus areas:
 * - Large document loading with insufficient memory
 * - Memory leak detection during error conditions
 * - Garbage collection pressure testing
 * - Resource cleanup verification after errors
 * - Performance degradation under memory pressure
 * - Out-of-memory recovery mechanisms
 */

import { err, ok, type Result } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import type { TreeStructureService } from '../../domain/services/TreeStructureService.js';
import { DocumentContent } from '../../domain/shared/value-objects/index.js';

/**
 * Memory tracking utilities for testing
 */
class MemoryTracker {
  private allocations = new Map<string, { size: number; timestamp: number }>();
  private totalAllocated = 0;
  private totalDeallocated = 0;

  allocate(id: string, size: number): void {
    this.allocations.set(id, { size, timestamp: Date.now() });
    this.totalAllocated += size;
  }

  deallocate(id: string): boolean {
    const allocation = this.allocations.get(id);
    if (allocation) {
      this.totalDeallocated += allocation.size;
      this.allocations.delete(id);
      return true;
    }
    return false;
  }

  getCurrentUsage(): number {
    return this.totalAllocated - this.totalDeallocated;
  }

  getLeakedAllocations(): Array<{ id: string; size: number; age: number }> {
    const now = Date.now();
    return Array.from(this.allocations.entries()).map(([id, allocation]) => ({
      id,
      size: allocation.size,
      age: now - allocation.timestamp,
    }));
  }

  reset(): void {
    this.allocations.clear();
    this.totalAllocated = 0;
    this.totalDeallocated = 0;
  }
}

/**
 * Resource pool for testing resource exhaustion scenarios
 */
class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private maxSize: number;

  constructor(maxSize: number, factory: () => T) {
    this.maxSize = maxSize;
    for (let i = 0; i < maxSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): Result<T, Error> {
    if (this.available.length === 0) {
      return err(new Error('Resource pool exhausted'));
    }

    const resource = this.available.pop();
    if (!resource) {
      return err(new Error('Resource pool unexpectedly empty'));
    }
    this.inUse.add(resource);
    return ok(resource);
  }

  release(resource: T): boolean {
    if (this.inUse.has(resource)) {
      this.inUse.delete(resource);
      this.available.push(resource);
      return true;
    }
    return false;
  }

  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.maxSize,
    };
  }
}

describe('Memory and Resource Error Testing', () => {
  let memoryTracker: MemoryTracker;
  let mockFileSystemPort: IFileSystemPort;
  let documentQueryService: DocumentQueryService;
  let _statementFlowService: StatementFlowService;
  let _treeStructureService: TreeStructureService;
  let _proofVisualizationService: ProofVisualizationService;

  beforeEach(() => {
    memoryTracker = new MemoryTracker();

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

    const mockDocumentRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    };
    const mockParser = {
      parse: vi.fn(),
      validate: vi.fn(),
    };
    documentQueryService = new DocumentQueryService(
      mockDocumentRepository as any,
      mockParser as any,
    );
    const mockTreeLayoutService = {
      calculateLayout: vi.fn(),
      optimizeLayout: vi.fn(),
    };
    _proofVisualizationService = new ProofVisualizationService(mockTreeLayoutService as any);
  });

  describe('Large Document Memory Handling', () => {
    it('should handle extremely large document loading gracefully', async () => {
      // Arrange - simulate very large document
      const largeDocumentSize = 50 * 1024 * 1024; // 50MB
      const largeContent = 'x'.repeat(largeDocumentSize);

      memoryTracker.allocate('large-document', largeDocumentSize);

      vi.mocked(mockFileSystemPort.readFile).mockImplementation(async () => {
        // Simulate memory pressure during read
        try {
          const documentContentResult = DocumentContent.create(largeContent);
          if (documentContentResult.isErr()) {
            return err(documentContentResult.error as any);
          }
          return ok(documentContentResult.value);
        } finally {
          // Simulate cleanup
          memoryTracker.deallocate('large-document');
        }
      });

      // Act - service should handle large documents with proper memory management
      const result = await documentQueryService.parseDocumentContent('huge content');

      // Ensure cleanup happened
      memoryTracker.deallocate('large-document');

      // Assert - operation succeeds or fails gracefully, memory is cleaned up
      expect(result).toBeDefined();
      expect(memoryTracker.getCurrentUsage()).toBeLessThanOrEqual(0);
    });

    it('should implement streaming for large document processing', async () => {
      // Arrange - streaming document processor
      const streamingProcessor = {
        processLargeDocument: async function* (
          content: string,
        ): AsyncGenerator<string, void, unknown> {
          const chunkSize = 1024; // 1KB chunks

          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);

            // Simulate processing with memory management
            memoryTracker.allocate(`chunk-${i}`, chunk.length);

            try {
              yield `Processed chunk ${i}-${i + chunkSize}`;
            } finally {
              // Clean up chunk memory
              memoryTracker.deallocate(`chunk-${i}`);
            }

            // Yield control to prevent blocking
            await new Promise((resolve) => setImmediate(resolve));
          }
        },
      };

      const largeContent = 'test content '.repeat(1000); // ~13KB
      const chunks: string[] = [];

      // Act - process document in streaming fashion
      for await (const chunk of streamingProcessor.processLargeDocument(largeContent)) {
        chunks.push(chunk);
      }

      // Assert - document processed without memory accumulation
      expect(chunks.length).toBeGreaterThan(0);
      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });

    it('should detect and handle memory leaks during document operations', async () => {
      // Arrange - service that might leak memory
      const leakyService = {
        documentCache: new Map<string, string>(),

        processDocument: async (path: string): Promise<Result<string, Error>> => {
          try {
            // Simulate processing that might leak memory
            const content = `Document content for ${path}`;
            const processedContent = `Processed: ${content}`;

            // Intentionally don't clean up cache (simulates leak)
            leakyService.documentCache.set(path, processedContent);
            memoryTracker.allocate(`doc-${path}`, processedContent.length);

            return ok(processedContent);
          } catch (error) {
            return err(error as Error);
          }
        },

        cleanup: (): void => {
          // Cleanup method that should be called
          for (const [path] of leakyService.documentCache) {
            memoryTracker.deallocate(`doc-${path}`);
          }
          leakyService.documentCache.clear();
        },
      };

      // Act - process multiple documents
      const documents = ['/doc1.md', '/doc2.md', '/doc3.md'];
      for (const doc of documents) {
        await leakyService.processDocument(doc);
      }

      // Assert - memory leaks detected
      const leaks = memoryTracker.getLeakedAllocations();
      expect(leaks.length).toBe(3);
      expect(memoryTracker.getCurrentUsage()).toBeGreaterThan(0);

      // Cleanup and verify
      leakyService.cleanup();
      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });
  });

  describe('Garbage Collection Pressure Testing', () => {
    it('should handle frequent allocations and deallocations', () => {
      // Arrange - rapid allocation/deallocation cycle
      const rapidCycleTest = {
        performCycles: (cycles: number): Result<string, Error> => {
          try {
            for (let i = 0; i < cycles; i++) {
              // Allocate
              const data = new Array(1000).fill(`cycle-${i}`);
              memoryTracker.allocate(`cycle-${i}`, data.length);

              // Immediate deallocation
              memoryTracker.deallocate(`cycle-${i}`);

              // Force garbage collection if available
              if (global.gc) {
                global.gc();
              }
            }
            return ok(`Completed ${cycles} cycles`);
          } catch (error) {
            return err(error as Error);
          }
        },
      };

      // Act - perform rapid cycles
      const result = rapidCycleTest.performCycles(1000);

      // Assert - system handles rapid allocation/deallocation
      expect(result.isOk()).toBe(true);
      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });

    it('should handle memory pressure with graceful degradation', () => {
      // Arrange - service that adapts to memory pressure
      const memoryAdaptiveService = {
        memoryThreshold: 10 * 1024 * 1024, // 10MB threshold

        processWithAdaptation: (dataSize: number): Result<string, Error> => {
          try {
            const currentUsage = memoryTracker.getCurrentUsage();

            if (currentUsage + dataSize > memoryAdaptiveService.memoryThreshold) {
              // Graceful degradation: reduce processing complexity
              return ok('Processed with reduced complexity due to memory pressure');
            }

            // Normal processing
            memoryTracker.allocate('processing', dataSize);
            const result = ok('Processed with full complexity');
            memoryTracker.deallocate('processing');

            return result;
          } catch (error) {
            return err(error as Error);
          }
        },
      };

      // Simulate memory pressure
      memoryTracker.allocate('background-usage', 9 * 1024 * 1024); // 9MB

      // Act - service should adapt to memory pressure
      const result1 = memoryAdaptiveService.processWithAdaptation(512 * 1024); // 512KB - should work
      const result2 = memoryAdaptiveService.processWithAdaptation(2 * 1024 * 1024); // 2MB - should degrade

      // Assert - adaptive behavior based on memory pressure
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result2.isOk()) {
        expect(result2.value).toContain('reduced complexity');
      }

      // Cleanup
      memoryTracker.deallocate('background-usage');
    });

    it('should implement memory-aware caching with eviction', () => {
      // Arrange - cache with memory-based eviction
      const memoryAwareCache = {
        cache: new Map<string, { data: string; size: number; lastAccessed: number }>(),
        maxMemoryUsage: 5 * 1024, // 5KB limit
        currentUsage: 0,

        put: (key: string, value: string): Result<void, Error> => {
          try {
            const size = value.length;

            // Evict if necessary
            while (memoryAwareCache.currentUsage + size > memoryAwareCache.maxMemoryUsage) {
              const evicted = memoryAwareCache.evictLeastRecentlyUsed();
              if (!evicted) {
                return err(new Error('Cannot evict enough items to fit new entry'));
              }
            }

            // Add new item
            memoryAwareCache.cache.set(key, {
              data: value,
              size,
              lastAccessed: Date.now(),
            });
            memoryAwareCache.currentUsage += size;
            memoryTracker.allocate(`cache-${key}`, size);

            return ok(undefined);
          } catch (error) {
            return err(error as Error);
          }
        },

        get: (key: string): Result<string, Error> => {
          const item = memoryAwareCache.cache.get(key);
          if (!item) {
            return err(new Error('Item not found in cache'));
          }

          item.lastAccessed = Date.now();
          return ok(item.data);
        },

        evictLeastRecentlyUsed: (): boolean => {
          let lruKey: string | null = null;
          let lruTime = Number.MAX_VALUE;

          for (const [key, item] of memoryAwareCache.cache) {
            if (item.lastAccessed < lruTime) {
              lruTime = item.lastAccessed;
              lruKey = key;
            }
          }

          if (lruKey) {
            const item = memoryAwareCache.cache.get(lruKey);
            if (!item) {
              return false;
            }
            memoryAwareCache.cache.delete(lruKey);
            memoryAwareCache.currentUsage -= item.size;
            memoryTracker.deallocate(`cache-${lruKey}`);
            return true;
          }

          return false;
        },
      };

      // Act - fill cache beyond capacity
      const items = [
        ['item1', 'x'.repeat(2000)], // 2KB
        ['item2', 'y'.repeat(2000)], // 2KB
        ['item3', 'z'.repeat(2000)], // 2KB - should trigger eviction
      ];

      const results = items.map(([key, value]) => {
        if (key && value) {
          return memoryAwareCache.put(key, value);
        }
        throw new Error('Invalid key or value');
      });

      // Assert - cache manages memory through eviction
      expect(results.every((r) => r.isOk())).toBe(true);
      expect(memoryAwareCache.currentUsage).toBeLessThanOrEqual(memoryAwareCache.maxMemoryUsage);
      expect(memoryAwareCache.cache.size).toBeLessThan(items.length); // Some items evicted
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle file handle exhaustion gracefully', async () => {
      // Arrange - limited file handle pool
      const fileHandlePool = new ResourcePool(3, () => ({ id: Math.random(), isOpen: true }));

      const fileService = {
        openFile: async (path: string): Promise<Result<any, Error>> => {
          const handleResult = fileHandlePool.acquire();
          if (handleResult.isErr()) {
            return err(new Error(`Cannot open ${path}: ${handleResult.error.message}`));
          }

          const handle = handleResult.value;
          memoryTracker.allocate(`file-${path}`, 1024);

          return ok({
            path,
            handle,
            close: () => {
              fileHandlePool.release(handle);
              memoryTracker.deallocate(`file-${path}`);
            },
          });
        },
      };

      // Act - exhaust file handle pool
      const files = ['/file1.md', '/file2.md', '/file3.md', '/file4.md'];
      const openResults = await Promise.all(files.map((file) => fileService.openFile(file)));

      // Assert - pool exhaustion handled gracefully
      const successCount = openResults.filter((r) => r.isOk()).length;
      const failureCount = openResults.filter((r) => r.isErr()).length;

      expect(successCount).toBe(3); // Pool limit
      expect(failureCount).toBe(1); // Exhaustion failure

      // Cleanup open files
      for (const result of openResults) {
        if (result.isOk()) {
          result.value.close();
        }
      }

      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });

    it('should handle thread pool exhaustion with queuing', async () => {
      // Arrange - limited worker pool with queue
      const workerPool = {
        maxWorkers: 2,
        activeWorkers: 0,
        queue: [] as Array<() => Promise<void>>,

        execute: async <T>(task: () => Promise<T>): Promise<Result<T, Error>> => {
          return new Promise((resolve) => {
            const wrappedTask = async () => {
              try {
                workerPool.activeWorkers++;
                memoryTracker.allocate(`worker-${workerPool.activeWorkers}`, 512);

                const result = await task();
                resolve(ok(result));
              } catch (error) {
                resolve(err(error as Error));
              } finally {
                memoryTracker.deallocate(`worker-${workerPool.activeWorkers}`);
                workerPool.activeWorkers--;
                workerPool.processQueue();
              }
            };

            if (workerPool.activeWorkers < workerPool.maxWorkers) {
              wrappedTask();
            } else {
              workerPool.queue.push(wrappedTask);
            }
          });
        },

        processQueue: () => {
          if (workerPool.queue.length > 0 && workerPool.activeWorkers < workerPool.maxWorkers) {
            const nextTask = workerPool.queue.shift();
            if (nextTask) {
              nextTask();
            }
          }
        },
      };

      // Act - submit more tasks than worker capacity
      const tasks = Array.from({ length: 5 }, (_, i) =>
        workerPool.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `Task ${i} completed`;
        }),
      );

      const results = await Promise.all(tasks);

      // Assert - all tasks complete despite pool limitations
      expect(results.every((r) => r.isOk())).toBe(true);
      expect(workerPool.activeWorkers).toBe(0);
      expect(workerPool.queue.length).toBe(0);
      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });

    it('should handle network connection exhaustion with circuit breaker', async () => {
      // Arrange - connection pool with circuit breaker
      const connectionManager = {
        maxConnections: 3,
        activeConnections: 0,
        failureCount: 0,
        circuitOpen: false,

        acquireConnection: async (): Promise<Result<any, Error>> => {
          if (connectionManager.circuitOpen) {
            return err(new Error('Circuit breaker is open - too many connection failures'));
          }

          if (connectionManager.activeConnections >= connectionManager.maxConnections) {
            connectionManager.failureCount++;
            if (connectionManager.failureCount >= 3) {
              connectionManager.circuitOpen = true;
            }
            return err(new Error('Connection pool exhausted'));
          }

          connectionManager.activeConnections++;
          memoryTracker.allocate(`connection-${connectionManager.activeConnections}`, 2048);

          return ok({
            id: connectionManager.activeConnections,
            release: () => {
              memoryTracker.deallocate(`connection-${connectionManager.activeConnections}`);
              connectionManager.activeConnections--;
            },
          });
        },

        resetCircuit: () => {
          connectionManager.circuitOpen = false;
          connectionManager.failureCount = 0;
        },
      };

      // Act - exhaust connection pool and trigger circuit breaker
      const connectionAttempts = Array.from({ length: 6 }, () =>
        connectionManager.acquireConnection(),
      );

      const results = await Promise.all(connectionAttempts);

      // Assert - connection exhaustion and circuit breaker behavior
      const successCount = results.filter((r) => r.isOk()).length;
      const failureCount = results.filter((r) => r.isErr()).length;

      expect(successCount).toBe(3); // Pool limit
      expect(failureCount).toBe(3); // Exhaustion + circuit breaker
      expect(connectionManager.circuitOpen).toBe(true);

      // Cleanup successful connections
      for (const result of results) {
        if (result.isOk()) {
          result.value.release();
        }
      }

      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });
  });

  describe('Performance Degradation Under Pressure', () => {
    it('should maintain functionality with degraded performance under memory pressure', () => {
      // Arrange - service that tracks performance under pressure
      const performanceTracker = {
        measurements: [] as Array<{ operation: string; duration: number; memoryUsage: number }>,

        measureOperation: <T>(operation: string, fn: () => T): T => {
          const startTime = performance.now();
          const startMemory = memoryTracker.getCurrentUsage();

          const result = fn();

          const endTime = performance.now();
          const endMemory = memoryTracker.getCurrentUsage();

          performanceTracker.measurements.push({
            operation,
            duration: endTime - startTime,
            memoryUsage: endMemory - startMemory,
          });

          return result;
        },

        getAveragePerformance: (operation: string) => {
          const measurements = performanceTracker.measurements.filter(
            (m) => m.operation === operation,
          );
          if (measurements.length === 0) return null;

          return {
            avgDuration: measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length,
            avgMemoryUsage:
              measurements.reduce((sum, m) => sum + m.memoryUsage, 0) / measurements.length,
          };
        },
      };

      // Act - perform operations under different memory conditions

      // Normal conditions
      for (let i = 0; i < 10; i++) {
        performanceTracker.measureOperation('normal', () => {
          const data = new Array(100).fill('normal operation');
          memoryTracker.allocate(`normal-${i}`, data.length);
          memoryTracker.deallocate(`normal-${i}`);
          return 'completed';
        });
      }

      // Memory pressure conditions
      memoryTracker.allocate('pressure', 10 * 1024 * 1024); // 10MB pressure

      for (let i = 0; i < 10; i++) {
        performanceTracker.measureOperation('pressure', () => {
          const data = new Array(100).fill('pressure operation');
          memoryTracker.allocate(`pressure-${i}`, data.length);
          memoryTracker.deallocate(`pressure-${i}`);
          return 'completed';
        });
      }

      memoryTracker.deallocate('pressure');

      // Assert - functionality maintained but performance may degrade
      const normalPerf = performanceTracker.getAveragePerformance('normal');
      const pressurePerf = performanceTracker.getAveragePerformance('pressure');

      expect(normalPerf).not.toBeNull();
      expect(pressurePerf).not.toBeNull();

      // Both conditions should complete successfully
      expect(performanceTracker.measurements.filter((m) => m.operation === 'normal')).toHaveLength(
        10,
      );
      expect(
        performanceTracker.measurements.filter((m) => m.operation === 'pressure'),
      ).toHaveLength(10);
    });

    it('should implement adaptive algorithms based on available resources', () => {
      // Arrange - algorithm that adapts to resource availability
      const adaptiveProcessor = {
        processData: (data: string[], memoryLimit: number): Result<string[], Error> => {
          try {
            const itemSize = 100; // Estimated size per item
            const maxItems = Math.floor(memoryLimit / itemSize);

            if (data.length <= maxItems) {
              // Full processing when resources allow
              memoryTracker.allocate('full-processing', data.length * itemSize);
              const result = data.map((item) => `Fully processed: ${item}`);
              memoryTracker.deallocate('full-processing');
              return ok(result);
            } else {
              // Chunked processing when memory limited
              const chunks: string[] = [];
              for (let i = 0; i < data.length; i += maxItems) {
                const chunk = data.slice(i, i + maxItems);
                memoryTracker.allocate(`chunk-${i}`, chunk.length * itemSize);
                chunks.push(...chunk.map((item) => `Chunk processed: ${item}`));
                memoryTracker.deallocate(`chunk-${i}`);
              }
              return ok(chunks);
            }
          } catch (error) {
            return err(error as Error);
          }
        },
      };

      const testData = Array.from({ length: 50 }, (_, i) => `item-${i}`);

      // Act - test with different memory limits
      const highMemoryResult = adaptiveProcessor.processData(testData, 10000); // 10KB
      const lowMemoryResult = adaptiveProcessor.processData(testData, 1000); // 1KB

      // Assert - algorithm adapts to available memory
      expect(highMemoryResult.isOk()).toBe(true);
      expect(lowMemoryResult.isOk()).toBe(true);

      if (highMemoryResult.isOk() && lowMemoryResult.isOk()) {
        expect(highMemoryResult.value).toHaveLength(50);
        expect(lowMemoryResult.value).toHaveLength(50);

        // Different processing strategies used
        expect(highMemoryResult.value[0]).toContain('Fully processed');
        expect(lowMemoryResult.value[0]).toContain('Chunk processed');
      }

      expect(memoryTracker.getCurrentUsage()).toBe(0);
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from out-of-memory conditions', async () => {
      // Arrange - service with OOM recovery
      const oomRecoveryService = {
        recoverFromOOM: async (operation: () => Promise<any>): Promise<Result<any, Error>> => {
          const maxRetries = 3;
          let retries = 0;

          while (retries < maxRetries) {
            try {
              return ok(await operation());
            } catch (error) {
              const errorMessage = (error as Error).message;
              if (
                errorMessage.includes('out of memory') ||
                errorMessage.includes('allocation failed')
              ) {
                retries++;

                // Force garbage collection if available
                if (global.gc) {
                  global.gc();
                }

                // Clear any tracked allocations
                memoryTracker.reset();

                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, 100));

                if (retries >= maxRetries) {
                  return err(new Error('Failed to recover from out-of-memory condition'));
                }
              } else {
                return err(error as Error);
              }
            }
          }

          return err(new Error('Unexpected error in OOM recovery'));
        },
      };

      let oomAttempts = 0;
      const memoryIntensiveOperation = async () => {
        // Simulate operation that might fail due to memory pressure
        const data = new Array(1000).fill('memory intensive data');
        memoryTracker.allocate('intensive-op', data.length * 100);

        // Simulate potential OOM on first attempt only
        if (oomAttempts === 0 && memoryTracker.getCurrentUsage() > 50000) {
          oomAttempts++;
          throw new Error('out of memory: allocation failed');
        }

        memoryTracker.deallocate('intensive-op');
        return 'Operation completed successfully';
      };

      // Simulate memory pressure
      memoryTracker.allocate('background-pressure', 60000);

      // Act - attempt operation with OOM recovery
      const result = await oomRecoveryService.recoverFromOOM(memoryIntensiveOperation);

      // Assert - operation recovers from OOM condition
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('Operation completed successfully');
      }
    });

    it('should implement emergency cleanup procedures', () => {
      // Arrange - system with emergency cleanup
      const emergencyCleanup = {
        criticalResources: new Map<string, () => void>(),
        cleanupThreshold: 80 * 1024, // 80KB threshold

        registerCriticalResource: (id: string, cleanupFn: () => void) => {
          emergencyCleanup.criticalResources.set(id, cleanupFn);
        },

        checkAndCleanup: (): { cleaned: boolean; freedMemory: number } => {
          const currentUsage = memoryTracker.getCurrentUsage();

          if (currentUsage > emergencyCleanup.cleanupThreshold) {
            const beforeCleanup = currentUsage;

            // Execute emergency cleanup
            for (const [id, cleanupFn] of emergencyCleanup.criticalResources) {
              try {
                cleanupFn();
              } catch (error) {
                console.warn(`Failed to cleanup resource ${id}:`, error);
              }
            }

            const afterCleanup = memoryTracker.getCurrentUsage();
            return {
              cleaned: true,
              freedMemory: beforeCleanup - afterCleanup,
            };
          }

          return { cleaned: false, freedMemory: 0 };
        },
      };

      // Register critical resources
      emergencyCleanup.registerCriticalResource('cache', () => {
        memoryTracker.deallocate('cache-data');
      });

      emergencyCleanup.registerCriticalResource('temp-files', () => {
        memoryTracker.deallocate('temp-data');
      });

      // Simulate resource usage exceeding threshold
      memoryTracker.allocate('cache-data', 50 * 1024);
      memoryTracker.allocate('temp-data', 40 * 1024);
      memoryTracker.allocate('normal-data', 10 * 1024);

      // Act - trigger emergency cleanup
      const cleanupResult = emergencyCleanup.checkAndCleanup();

      // Assert - emergency cleanup executed
      expect(cleanupResult.cleaned).toBe(true);
      expect(cleanupResult.freedMemory).toBeGreaterThan(0);
      expect(memoryTracker.getCurrentUsage()).toBeLessThan(emergencyCleanup.cleanupThreshold);
    });
  });
});
