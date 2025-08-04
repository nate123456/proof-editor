/**
 * Performance and Resilience Integration Tests
 *
 * Focused on system behavior under stress, load, and adverse conditions.
 * These tests ensure the system performs well in production environments.
 */

import { err } from 'neverthrow';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { DocumentQueryService } from '../../application/services/DocumentQueryService.js';
import type { ProofVisualizationService } from '../../application/services/ProofVisualizationService.js';
import type { ViewStateManager } from '../../application/services/ViewStateManager.js';
import { ValidationError } from '../../domain/shared/result.js';
import {
  DocumentContent,
  DocumentId,
  DocumentVersion,
  FileSize,
  Position2D,
  Timestamp,
  Title,
  ZoomLevel,
} from '../../domain/shared/value-objects/index.js';
import { activate } from '../../extension/extension.js';
import {
  type ApplicationContainer,
  getContainer,
  initializeContainer,
} from '../../infrastructure/di/container.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';
import type { TreeRenderer } from '../../webview/TreeRenderer.js';

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage;
  private metrics: Array<{ operation: string; duration: number; memoryDelta: number }> = [];

  constructor() {
    this.startMemory = process.memoryUsage();
  }

  start(_operation: string): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }

  end(operation: string): { duration: number; memoryDelta: number } {
    const duration = performance.now() - this.startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = (endMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024; // MB

    this.metrics.push({ operation, duration, memoryDelta });

    return { duration, memoryDelta };
  }

  getMetrics() {
    return this.metrics;
  }

  clear() {
    this.metrics = [];
  }
}

// Load testing utilities
const generateStressTestDocument = (complexity: 'low' | 'medium' | 'high' | 'extreme'): string => {
  const config = {
    low: { statements: 10, arguments: 5, trees: 1 },
    medium: { statements: 100, arguments: 50, trees: 3 },
    high: { statements: 500, arguments: 250, trees: 5 },
    extreme: { statements: 2000, arguments: 1000, trees: 10 },
  };

  const { statements: stmtCount, arguments: argCount, trees: treeCount } = config[complexity];

  const statements: Record<string, string> = {};
  const argumentsMap: Record<string, any> = {};
  const trees: any[] = [];

  // Generate statements with realistic complexity
  for (let i = 1; i <= stmtCount; i++) {
    statements[`s${i}`] =
      `Statement ${i}: This is a complex statement with detailed content that might appear in real philosophical or logical arguments. It contains multiple clauses and sophisticated reasoning patterns that require careful analysis.`;
  }

  // Generate interconnected arguments
  for (let i = 1; i <= argCount; i++) {
    const premiseCount = Math.min(5, Math.max(1, Math.floor(Math.random() * 4) + 1));
    const premises = Array.from({ length: premiseCount }, (_, j) => {
      const stmtIndex = Math.max(1, Math.min(stmtCount, i - premiseCount + j + 1));
      return `s${stmtIndex}`;
    });

    const conclusionIndex = Math.min(stmtCount + i, stmtCount * 2);
    statements[`s${conclusionIndex}`] =
      `Conclusion ${i}: This conclusion follows from the premises through logical inference.`;

    argumentsMap[`arg${i}`] = {
      premises,
      conclusions: [`s${conclusionIndex}`],
      metadata: {
        rule: `InferenceRule${i % 10}`,
        confidence: Math.random(),
        complexity: complexity,
        created: new Date().toISOString(),
      },
    };
  }

  // Generate tree structures
  for (let t = 1; t <= treeCount; t++) {
    const nodesPerTree = Math.ceil(argCount / treeCount);
    const nodes: Record<string, any> = {};

    const startArg = (t - 1) * nodesPerTree + 1;
    const endArg = Math.min(t * nodesPerTree, argCount);

    if (startArg <= argCount) {
      nodes[`n${t}_1`] = { arg: `arg${startArg}` };

      for (let n = startArg + 1; n <= endArg; n++) {
        const nodeId = `n${t}_${n - startArg + 1}`;
        const parentId = `n${t}_${n - startArg}`;
        nodes[nodeId] = { [parentId]: `arg${n}`, on: 0 };
      }
    }

    if (Object.keys(nodes).length > 0) {
      trees.push({
        id: `tree${t}`,
        offset: { x: t * 200, y: t * 150 },
        nodes,
      });
    }
  }

  return `# Stress Test Document - ${complexity.toUpperCase()} complexity
# ${stmtCount} statements, ${argCount} arguments, ${treeCount} trees

statements:
${Object.entries(statements)
  .map(([id, content]) => `  ${id}: "${content}"`)
  .join('\n')}

arguments:
${Object.entries(argumentsMap)
  .map(
    ([id, arg]) =>
      `  ${id}:
    premises: [${arg.premises.join(', ')}]
    conclusions: [${arg.conclusions.join(', ')}]
    metadata:
      rule: "${arg.metadata.rule}"
      confidence: ${arg.metadata.confidence}
      complexity: "${arg.metadata.complexity}"
      created: "${arg.metadata.created}"`,
  )
  .join('\n')}

trees:
${trees
  .map(
    (tree) =>
      `- id: ${tree.id}
    offset:
      x: ${tree.offset.x}
      y: ${tree.offset.y}
    nodes:
${Object.entries(tree.nodes)
  .map(([nodeId, nodeData]) => {
    if (!nodeData || typeof nodeData !== 'object') {
      return `      ${nodeId}: {arg: unknown}`;
    }
    if ('arg' in nodeData) {
      return `      ${nodeId}: {arg: ${(nodeData as any).arg}}`;
    } else {
      const parentKey = Object.keys(nodeData as Record<string, any>).find((k) => k !== 'on');
      return `      ${nodeId}: {${parentKey || 'unknown'}: ${(nodeData as any)[parentKey || 'unknown']}, on: ${(nodeData as any).on}}`;
    }
  })
  .join('\n')}`,
  )
  .join('\n')}

metadata:
  title: "Stress Test Document"
  complexity: "${complexity}"
  generated: "${new Date().toISOString()}"
  statementCount: ${stmtCount}
  argumentCount: ${argCount}
  treeCount: ${treeCount}
`;
};

describe('Performance and Resilience Integration Tests', () => {
  let container: ApplicationContainer;
  let monitor: PerformanceMonitor;
  let mockContext: any;

  beforeAll(async () => {
    // Mock VS Code environment for performance tests
    vi.mock('vscode', () => ({
      commands: {
        registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
        executeCommand: vi.fn().mockResolvedValue(undefined),
      },
      window: {
        showInformationMessage: vi.fn().mockResolvedValue('OK'),
        showErrorMessage: vi.fn().mockResolvedValue('OK'),
        showWarningMessage: vi.fn().mockResolvedValue('OK'),
        createWebviewPanel: vi.fn(() => ({
          webview: { html: '', postMessage: vi.fn(), onDidReceiveMessage: vi.fn() },
          dispose: vi.fn(),
          onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
        })),
        activeTextEditor: {
          document: {
            getText: vi.fn(() => ''),
            languageId: 'proof',
            fileName: '/test/performance.proof',
          },
        },
        onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
        visibleTextEditors: [],
      },
      workspace: {
        getConfiguration: vi.fn(() => ({ get: vi.fn(), update: vi.fn() })),
        onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
        onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
        createFileSystemWatcher: vi.fn(() => ({
          onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
          onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
          onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
          dispose: vi.fn(),
        })),
        workspaceFolders: [
          {
            uri: { scheme: 'file', path: '/test/workspace' },
            name: 'test-workspace',
            index: 0,
          },
        ],
        textDocuments: [],
      },
      ViewColumn: { One: 1, Two: 2 },
      Uri: { file: vi.fn(), parse: vi.fn() },
      languages: {
        createDiagnosticCollection: vi.fn(() => ({
          set: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          dispose: vi.fn(),
        })),
        registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      },
    }));
  });

  beforeEach(async () => {
    monitor = new PerformanceMonitor();

    // Create fresh extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/extension/path',
      extensionUri: { scheme: 'file', path: '/mock/extension/path' },
      globalState: { get: vi.fn(), update: vi.fn().mockResolvedValue(undefined) },
      workspaceState: { get: vi.fn(), update: vi.fn().mockResolvedValue(undefined) },
    };

    // Initialize container
    await initializeContainer();
    container = getContainer();

    // Activate extension
    await activate(mockContext);
  });

  afterAll(() => {
    // Report performance summary
    const metrics = monitor.getMetrics();
    if (metrics.length > 0) {
      console.log('\n=== PERFORMANCE SUMMARY ===');
      metrics.forEach((metric) => {
        console.log(
          `${metric.operation}: ${metric.duration.toFixed(2)}ms, Memory: ${metric.memoryDelta.toFixed(2)}MB`,
        );
      });
      console.log('===========================\n');
    }
  });

  describe('Load Testing', () => {
    it('should handle low complexity documents efficiently', async () => {
      const testDocument = generateStressTestDocument('low');

      monitor.start('low-complexity-parse');

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(testDocument);

      const { duration, memoryDelta } = monitor.end('low-complexity-parse');

      expect(parseResult.isOk()).toBe(true);
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(memoryDelta).toBeLessThan(10); // Under 10MB
    });

    it('should handle medium complexity documents within acceptable limits', async () => {
      const testDocument = generateStressTestDocument('medium');

      monitor.start('medium-complexity-parse');

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(testDocument);

      const { duration, memoryDelta } = monitor.end('medium-complexity-parse');

      expect(parseResult.isOk()).toBe(true);
      expect(duration).toBeLessThan(5000); // Under 5 seconds
      expect(memoryDelta).toBeLessThan(50); // Under 50MB
    });

    it('should handle high complexity documents with degraded but acceptable performance', async () => {
      const testDocument = generateStressTestDocument('high');

      monitor.start('high-complexity-parse');

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(testDocument);

      const { duration, memoryDelta } = monitor.end('high-complexity-parse');

      expect(parseResult.isOk()).toBe(true);
      expect(duration).toBeLessThan(15000); // Under 15 seconds
      expect(memoryDelta).toBeLessThan(100); // Under 100MB
    });

    it('should handle extreme complexity documents or fail gracefully', async () => {
      const testDocument = generateStressTestDocument('extreme');

      monitor.start('extreme-complexity-parse');

      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );

      try {
        const parseResult = await documentQueryService.parseDocumentContent(testDocument);

        const { duration, memoryDelta } = monitor.end('extreme-complexity-parse');

        if (parseResult.isOk()) {
          // If it succeeds, it should still be within reasonable bounds
          expect(duration).toBeLessThan(30000); // Under 30 seconds
          expect(memoryDelta).toBeLessThan(200); // Under 200MB
        } else {
          // If it fails, it should fail gracefully with proper error handling
          expect(parseResult.error).toBeInstanceOf(ValidationError);
        }
      } catch (error) {
        // Should not throw unhandled errors
        expect(error).toBeInstanceOf(Error);
        monitor.end('extreme-complexity-parse');
      }
    });
  });

  describe('Concurrency Testing', () => {
    it('should handle multiple concurrent parsing operations', async () => {
      const concurrencyLevel = 10;
      const operations: Promise<any>[] = [];

      monitor.start('concurrent-operations');

      for (let i = 0; i < concurrencyLevel; i++) {
        const complexity = i % 2 === 0 ? 'low' : 'medium';
        const testDocument = generateStressTestDocument(complexity);

        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );
        const operation = documentQueryService.parseDocumentContent(testDocument);
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      const { duration, memoryDelta } = monitor.end('concurrent-operations');

      // All operations should succeed
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(20000); // Under 20 seconds for all
      expect(memoryDelta).toBeLessThan(200); // Under 200MB total

      // Average time per operation should be reasonable
      const avgTime = duration / concurrencyLevel;
      expect(avgTime).toBeLessThan(5000); // Under 5 seconds average
    });

    it('should handle concurrent visualization generation', async () => {
      const testDocument = generateStressTestDocument('medium');
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(testDocument);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        const concurrencyLevel = 5;
        const operations: Promise<any>[] = [];

        monitor.start('concurrent-visualization');

        for (let i = 0; i < concurrencyLevel; i++) {
          const visualizationService = container.resolve<ProofVisualizationService>(
            TOKENS.ProofVisualizationService,
          );
          const operation = Promise.resolve().then(() =>
            visualizationService.generateVisualization(parseResult.value),
          );
          operations.push(operation);
        }

        const results = await Promise.all(operations);
        const { duration, memoryDelta } = monitor.end('concurrent-visualization');

        // All visualizations should succeed
        results.forEach((result) => {
          expect(result.isOk()).toBe(true);
        });

        expect(duration).toBeLessThan(10000); // Under 10 seconds
        expect(memoryDelta).toBeLessThan(100); // Under 100MB
      }
    });

    it('should handle concurrent file system operations', async () => {
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);
      const concurrencyLevel = 20;
      const operations: Promise<any>[] = [];

      monitor.start('concurrent-file-operations');

      for (let i = 0; i < concurrencyLevel; i++) {
        const contentResult = DocumentContent.create(generateStressTestDocument('low'));
        const docIdResult = DocumentId.create(`concurrent-test-${i}`);
        const titleResult = Title.create(`Concurrent Test ${i}`);
        const sizeResult = FileSize.create(1000);
        const versionResult = DocumentVersion.create(1);

        if (
          contentResult.isErr() ||
          docIdResult.isErr() ||
          titleResult.isErr() ||
          sizeResult.isErr() ||
          versionResult.isErr()
        ) {
          throw new Error('Failed to create value objects for test document');
        }

        const testDocument = {
          id: docIdResult.value,
          content: contentResult.value,
          metadata: {
            id: docIdResult.value,
            title: titleResult.value,
            modifiedAt: Timestamp.now(),
            size: sizeResult.value,
            syncStatus: 'synced' as const,
          },
          version: versionResult.value,
        };

        const operation = fileSystemPort.storeDocument(testDocument);
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      const { duration, memoryDelta } = monitor.end('concurrent-file-operations');

      // All file operations should succeed
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      expect(duration).toBeLessThan(15000); // Under 15 seconds
      expect(memoryDelta).toBeLessThan(50); // Under 50MB
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 50;

      monitor.start('memory-leak-test');

      for (let i = 0; i < iterations; i++) {
        const testDocument = generateStressTestDocument('low');
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );

        const parseResult = await documentQueryService.parseDocumentContent(testDocument);
        expect(parseResult.isOk()).toBe(true);

        // Force garbage collection every 10 iterations if available
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const { duration } = monitor.end('memory-leak-test');
      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      expect(duration).toBeLessThan(30000); // Under 30 seconds total
      expect(totalMemoryIncrease).toBeLessThan(100); // Under 100MB increase

      // Memory growth should be reasonable for the number of operations
      const memoryPerOperation = totalMemoryIncrease / iterations;
      expect(memoryPerOperation).toBeLessThan(2); // Under 2MB per operation
    });

    it('should handle large document cleanup properly', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      monitor.start('large-document-cleanup');

      // Process large document
      const largeDocument = generateStressTestDocument('high');
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(largeDocument);

      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Generate visualization
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(parseResult.value);

        expect(vizResult.isOk()).toBe(true);

        if (vizResult.isOk()) {
          // Render visualization
          const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
          const svg = renderer.generateSVG(vizResult.value);
          expect(svg).toContain('<svg');
        }
      }

      // Force cleanup
      if (global.gc) {
        global.gc();
      }

      const { duration } = monitor.end('large-document-cleanup');
      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      expect(duration).toBeLessThan(20000); // Under 20 seconds
      expect(totalMemoryIncrease).toBeLessThan(150); // Under 150MB increase
    });
  });

  describe('Error Recovery Under Load', () => {
    it('should recover from parser errors during high load', async () => {
      const concurrencyLevel = 10;
      const operations: Promise<any>[] = [];

      monitor.start('error-recovery-load');

      for (let i = 0; i < concurrencyLevel; i++) {
        const testDocument =
          i % 3 === 0
            ? 'invalid yaml content {{{' // Inject parsing errors
            : generateStressTestDocument('medium');

        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );
        const operation = documentQueryService.parseDocumentContent(testDocument);
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      const { duration, memoryDelta } = monitor.end('error-recovery-load');

      // Some operations should fail, but system should remain stable
      const successCount = results.filter((r) => r.isOk()).length;
      const errorCount = results.filter((r) => r.isErr()).length;

      expect(successCount).toBeGreaterThan(0); // Some should succeed
      expect(errorCount).toBeGreaterThan(0); // Some should fail (as intended)
      expect(successCount + errorCount).toBe(concurrencyLevel);

      // System should remain responsive despite errors
      expect(duration).toBeLessThan(25000); // Under 25 seconds
      expect(memoryDelta).toBeLessThan(100); // Under 100MB
    });

    it('should handle service failures during concurrent operations', async () => {
      const viewStateManager = container.resolve<ViewStateManager>(TOKENS.ViewStateManager);

      // Mock service failure for some operations
      const originalUpdateViewState = viewStateManager.updateViewportState;
      let failureCount = 0;

      viewStateManager.updateViewportState = vi.fn().mockImplementation(async (state: any) => {
        failureCount++;
        if (failureCount % 3 === 0) {
          return err(new ValidationError('Simulated service failure'));
        }
        return originalUpdateViewState.call(viewStateManager, state);
      });

      const concurrencyLevel = 15;
      const operations: Promise<any>[] = [];

      monitor.start('service-failure-recovery');

      for (let i = 0; i < concurrencyLevel; i++) {
        const zoomResult = ZoomLevel.create(1.0 + i * 0.1);
        const panResult = Position2D.create(i * 10, i * 10);
        const centerResult = Position2D.create(0, 0);

        if (zoomResult.isErr() || panResult.isErr() || centerResult.isErr()) {
          throw new Error('Failed to create value objects for test state');
        }

        const testState = {
          zoom: zoomResult.value,
          pan: panResult.value,
          center: centerResult.value,
        };

        const operation = viewStateManager.updateViewportState(testState);
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      const { duration, memoryDelta } = monitor.end('service-failure-recovery');

      // Some operations should succeed despite service failures
      const successCount = results.filter((r) => r.isOk()).length;
      expect(successCount).toBeGreaterThan(0);

      // System should remain stable
      expect(duration).toBeLessThan(10000); // Under 10 seconds
      expect(memoryDelta).toBeLessThan(50); // Under 50MB

      // Restore original function
      viewStateManager.updateViewportState = originalUpdateViewState;
    });
  });

  describe('Degradation Testing', () => {
    it('should degrade gracefully under extreme memory pressure', async () => {
      // Create memory pressure
      const memoryHogs: any[] = [];

      try {
        // Allocate significant memory
        for (let i = 0; i < 50; i++) {
          memoryHogs.push(new Array(1000000).fill(`memory-pressure-${i}`));
        }

        monitor.start('memory-pressure-operation');

        // Try to perform normal operations under memory pressure
        const testDocument = generateStressTestDocument('medium');
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );
        const parseResult = await documentQueryService.parseDocumentContent(testDocument);

        const { duration, memoryDelta } = monitor.end('memory-pressure-operation');

        // Should either succeed with degraded performance or fail gracefully
        if (parseResult.isOk()) {
          expect(duration).toBeLessThan(30000); // Degraded but still functional
        } else {
          expect(parseResult.error).toBeInstanceOf(ValidationError);
        }

        // Memory increase should be reasonable despite pressure
        expect(memoryDelta).toBeLessThan(500); // Under 500MB additional
      } finally {
        // Clean up memory pressure
        memoryHogs.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
    });

    it('should handle network-like latency simulation', async () => {
      const fileSystemPort = container.resolve<IFileSystemPort>(TOKENS.IFileSystemPort);

      // Mock network latency
      const originalStoreDocument = fileSystemPort.storeDocument;
      fileSystemPort.storeDocument = vi.fn().mockImplementation(async (doc) => {
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));
        return originalStoreDocument.call(fileSystemPort, doc);
      });

      const concurrencyLevel = 10;
      const operations: Promise<any>[] = [];

      monitor.start('network-latency-simulation');

      for (let i = 0; i < concurrencyLevel; i++) {
        const contentResult = DocumentContent.create(generateStressTestDocument('low'));
        const docIdResult = DocumentId.create(`latency-test-${i}`);
        const titleResult = Title.create(`Latency Test ${i}`);
        const sizeResult = FileSize.create(1000);
        const versionResult = DocumentVersion.create(1);

        if (
          contentResult.isErr() ||
          docIdResult.isErr() ||
          titleResult.isErr() ||
          sizeResult.isErr() ||
          versionResult.isErr()
        ) {
          throw new Error('Failed to create value objects for test document');
        }

        const testDocument = {
          id: docIdResult.value,
          content: contentResult.value,
          metadata: {
            id: docIdResult.value,
            title: titleResult.value,
            modifiedAt: Timestamp.now(),
            size: sizeResult.value,
            syncStatus: 'synced' as const,
          },
          version: versionResult.value,
        };

        const operation = fileSystemPort.storeDocument(testDocument);
        operations.push(operation);
      }

      const results = await Promise.all(operations);
      const { duration, memoryDelta } = monitor.end('network-latency-simulation');

      // All operations should eventually succeed
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // Should handle latency gracefully
      expect(duration).toBeLessThan(5000); // Under 5 seconds despite latency
      expect(memoryDelta).toBeLessThan(100); // Under 100MB

      // Restore original function
      fileSystemPort.storeDocument = originalStoreDocument;
    });
  });
});
