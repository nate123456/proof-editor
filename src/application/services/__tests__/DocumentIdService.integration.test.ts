import { beforeEach, describe, expect, it } from 'vitest';
import { getContainer, resetContainer } from '../../../infrastructure/di/container.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';
import type { IDocumentIdService } from '../DocumentIdService.js';

describe('DocumentIdService Integration', () => {
  beforeEach(() => {
    resetContainer();
  });

  it('should be properly registered in DI container', async () => {
    const container = getContainer();

    // Register application services to get DocumentIdService
    const { registerApplicationServices } = await import('../../../infrastructure/di/container.js');
    await registerApplicationServices(container);

    // Verify the service is registered
    expect(container.isRegistered(TOKENS.DocumentIdService)).toBe(true);
    expect(container.isRegistered(TOKENS.IDocumentIdService)).toBe(true);

    // Resolve and test the service
    const documentIdService = container.resolve<IDocumentIdService>(TOKENS.IDocumentIdService);
    expect(documentIdService).toBeDefined();

    // Test basic functionality
    const result = documentIdService.extractFromUri('/Users/test/document.proof');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe('document');
    }
  });

  it('should provide same instance when resolved multiple times', async () => {
    const container = getContainer();

    const { registerApplicationServices } = await import('../../../infrastructure/di/container.js');
    await registerApplicationServices(container);

    const service1 = container.resolve<IDocumentIdService>(TOKENS.IDocumentIdService);
    const service2 = container.resolve<IDocumentIdService>(TOKENS.IDocumentIdService);

    // Should be same instance (singleton)
    expect(service1).toBe(service2);
  });

  it('should handle real-world URI patterns', async () => {
    const container = getContainer();

    const { registerApplicationServices } = await import('../../../infrastructure/di/container.js');
    await registerApplicationServices(container);

    const documentIdService = container.resolve<IDocumentIdService>(TOKENS.IDocumentIdService);

    const testCases = [
      // Standard VS Code file URIs
      { uri: 'file:///Users/user/Documents/my-proof.proof', expected: 'my-proof' },
      { uri: 'vscode://file/C:/Users/user/proof.proof', expected: 'proof' },

      // Cross-platform paths
      { uri: '/home/user/logic/syllogism.proof', expected: 'syllogism' },
      { uri: 'C:\\Documents\\formal-logic\\modus-ponens.proof', expected: 'modus-ponens' },

      // Special characters
      { uri: '/tmp/proof with spaces.proof', expected: 'proof with spaces' },
      { uri: '/Users/user/논리증명.proof', expected: '논리증명' },

      // Edge cases that should use fallback
      { uri: '', expectedPattern: /^fallback-\d+-[a-f0-9]+$/ },
      { uri: '/path/ending/with/', expectedPattern: /^fallback-\d+-[a-f0-9]+$/ },
    ];

    for (const testCase of testCases) {
      const result = documentIdService.extractFromUriWithFallback(testCase.uri);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        if ('expected' in testCase) {
          expect(result.value).toBe(testCase.expected);
        } else if ('expectedPattern' in testCase) {
          expect(result.value).toMatch(testCase.expectedPattern);
        }
      }
    }
  });
});
