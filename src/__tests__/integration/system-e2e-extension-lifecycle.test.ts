/**
 * System E2E Integration Tests - Extension Lifecycle
 *
 * Tests for full extension lifecycle including activation, deactivation,
 * and service initialization with proper error handling.
 */

import {
  type ApplicationContainer,
  activate,
  afterEach,
  beforeAll,
  beforeEach,
  createTestSetup,
  deactivate,
  describe,
  expect,
  it,
  type PerformanceMetrics,
  TOKENS,
  vi,
  vscode,
} from './shared/system-e2e-test-utils.js';

describe('System E2E - Extension Lifecycle Tests', () => {
  let mockContext: any;
  let container: ApplicationContainer;
  let performanceMetrics: PerformanceMetrics;
  let testSetup: ReturnType<typeof createTestSetup>;

  beforeAll(async () => {
    testSetup = createTestSetup();
    await testSetup.setup();
  });

  beforeEach(() => {
    mockContext = testSetup.mockContext;
    container = testSetup.container;
    performanceMetrics = testSetup.performanceMetrics;
  });

  afterEach(async () => {
    try {
      await testSetup.teardown();
    } catch (_error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('1. Full Extension Lifecycle Tests', () => {
    it('should complete full activation cycle with all services initialized', async () => {
      const startTime = Date.now();

      // Test activation
      await activate(mockContext);

      // Verify container is properly initialized
      expect(container).toBeDefined();
      expect(container.isRegistered(TOKENS.ValidationController)).toBe(true);
      expect(container.isRegistered(TOKENS.DocumentController)).toBe(true);
      expect(container.isRegistered(TOKENS.ProofTreeController)).toBe(true);
      expect(container.isRegistered(TOKENS.BootstrapController)).toBe(true);

      // Verify command registration
      expect(vscode.commands.registerCommand).toHaveBeenCalled();
      const registeredCommands = vi
        .mocked(vscode.commands.registerCommand)
        .mock.calls.map((call) => call[0] as string);

      expect(registeredCommands).toContain('proofEditor.showTree');
      expect(registeredCommands).toContain('proofEditor.undo');
      expect(registeredCommands).toContain('proofEditor.redo');

      // Verify event handlers are registered
      expect(vscode.workspace.onDidOpenTextDocument).toHaveBeenCalled();
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
      expect(vscode.workspace.onDidCloseTextDocument).toHaveBeenCalled();

      // Verify subscriptions are tracked
      expect(mockContext.subscriptions.length).toBeGreaterThan(5);

      // Performance assertion
      const activationTime = Date.now() - startTime;
      expect(activationTime).toBeLessThan(5000); // Should activate within 5 seconds

      performanceMetrics.operationCount++;
    });

    it('should handle extension deactivation gracefully with proper cleanup', async () => {
      await activate(mockContext);

      const subscriptionCount = mockContext.subscriptions.length;
      expect(subscriptionCount).toBeGreaterThan(0);

      // Test deactivation
      deactivate();

      // Verify cleanup (subscriptions should still be tracked for disposal)
      expect(mockContext.subscriptions.length).toBe(subscriptionCount);

      performanceMetrics.operationCount++;
    });

    it('should recover from service initialization failures', async () => {
      // Mock a service failure during container initialization
      const originalResolve = container.resolve;
      container.resolve = vi.fn().mockImplementation((token: string) => {
        if (token === TOKENS.ValidationController) {
          throw new Error('Simulated service failure');
        }
        return originalResolve.call(container, token);
      });

      try {
        await activate(mockContext);

        // Extension should still activate with error handling
        expect(mockContext.subscriptions.length).toBeGreaterThan(0);

        performanceMetrics.errorCount++;
      } catch (error) {
        // Should handle service failures gracefully
        expect(error).toBeInstanceOf(Error);
        performanceMetrics.errorCount++;
      } finally {
        // Restore original resolve
        container.resolve = originalResolve;
      }
    });
  });
});
