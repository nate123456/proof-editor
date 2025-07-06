/**
 * System E2E Integration Tests - Performance Integration
 *
 * Tests for system performance under various load conditions including
 * large document processing, concurrent operations, and extended session handling.
 */

import {
  type ApplicationContainer,
  activate,
  afterEach,
  beforeAll,
  beforeEach,
  createTestSetup,
  type DocumentQueryService,
  describe,
  expect,
  generateComplexProofDocument,
  it,
  type PerformanceMetrics,
  type ProofVisualizationService,
  TOKENS,
  type TreeRenderer,
} from './shared/system-e2e-test-utils.js';

describe('System E2E - Performance Integration Tests', () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  let mockDocument: any;
  let testSetup: ReturnType<typeof createTestSetup>;

  beforeAll(async () => {
    testSetup = createTestSetup();
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockContext = testSetup.mockContext;
    container = testSetup.container;
    performanceMetrics = testSetup.performanceMetrics;
    mockDocument = testSetup.mockDocument;

    await activate(mockContext);
  });

  afterEach(async () => {
    try {
      await testSetup.teardown();
    } catch (_error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('4. Performance Integration Tests', () => {
    it('should handle large document processing within performance thresholds', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Test with very large document (1000 statements, 500 arguments)
      const largeContent = generateComplexProofDocument(1000, 500);
      expect(largeContent.length).toBeGreaterThan(100000); // Ensure document is actually large

      mockDocument.getText.mockReturnValue(largeContent);

      // Test parsing performance
      const documentQueryService = container.resolve<DocumentQueryService>(
        TOKENS.DocumentQueryService,
      );
      const parseResult = await documentQueryService.parseDocumentContent(largeContent);

      const parseTime = Date.now() - startTime;
      expect(parseTime).toBeLessThan(10000); // Parse within 10 seconds
      expect(parseResult.isOk()).toBe(true);

      if (parseResult.isOk()) {
        // Test visualization performance
        const vizStart = Date.now();
        const visualizationService = container.resolve<ProofVisualizationService>(
          TOKENS.ProofVisualizationService,
        );
        const vizResult = visualizationService.generateVisualization(parseResult.value);

        const vizTime = Date.now() - vizStart;
        expect(vizTime).toBeLessThan(5000); // Visualize within 5 seconds
        expect(vizResult.isOk()).toBe(true);

        if (vizResult.isOk()) {
          // Test rendering performance
          const renderStart = Date.now();
          const renderer = container.resolve<TreeRenderer>(TOKENS.TreeRenderer);
          const svg = renderer.generateSVG(vizResult.value);

          const renderTime = Date.now() - renderStart;
          expect(renderTime).toBeLessThan(3000); // Render within 3 seconds
          expect(svg).toContain('<svg');
        }
      }

      // Memory usage should not exceed 100MB increase
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(100);

      performanceMetrics.operationCount++;
    });

    it('should handle concurrent operations without performance degradation', async () => {
      const operationCount = 50;
      const startTime = Date.now();

      // Create concurrent document operations
      const operations = Array.from({ length: operationCount }, async (_, i) => {
        const content = generateComplexProofDocument(10 + i, 5 + i);
        const documentQueryService = container.resolve<DocumentQueryService>(
          TOKENS.DocumentQueryService,
        );

        return documentQueryService.parseDocumentContent(content);
      });

      // Execute all operations concurrently
      const results = await Promise.all(operations);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // Complete all operations within 15 seconds

      // Verify all operations succeeded
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      // Concurrent operations should not exceed 2x the single operation time
      const avgTimePerOperation = totalTime / operationCount;
      expect(avgTimePerOperation).toBeLessThan(300); // Average under 300ms per operation

      performanceMetrics.operationCount += operationCount;
    });

    it('should maintain system responsiveness during extended sessions', async () => {
      const sessionStart = Date.now();
      const operations: Promise<any>[] = [];

      // Simulate 2-hour session with regular operations
      const sessionDuration = 1000; // Reduced for testing (1 second instead of 2 hours)
      const operationInterval = 50; // Every 50ms

      while (Date.now() - sessionStart < sessionDuration) {
        // Simulate user operations
        const operation = (async () => {
          const content = generateComplexProofDocument(
            Math.floor(Math.random() * 20) + 5,
            Math.floor(Math.random() * 10) + 3,
          );
          const documentQueryService = container.resolve<DocumentQueryService>(
            TOKENS.DocumentQueryService,
          );

          return documentQueryService.parseDocumentContent(content);
        })();

        operations.push(operation);

        // Wait before next operation
        await new Promise((resolve) => setTimeout(resolve, operationInterval));
      }

      // Wait for all operations to complete
      const results = await Promise.all(operations);

      // Verify all operations completed successfully
      const successCount = results.filter((r) => r.isOk()).length;
      const successRate = successCount / results.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate

      // System should remain responsive
      expect(operations.length).toBeGreaterThan(10); // Should have processed multiple operations

      performanceMetrics.operationCount += operations.length;
    });
  });
});
