import { describe, expect, it } from 'vitest';
import {
  type ContextType,
  ContextUnavailableError,
  CrossContextConflictError,
  OrchestrationError,
  OrchestrationTimeoutError,
} from '../OrchestrationErrors.js';

describe('OrchestrationErrors', () => {
  describe('OrchestrationError', () => {
    it('should create basic orchestration error', () => {
      const context: ContextType = 'core';
      const message = 'Something went wrong';

      const error = new OrchestrationError(message, context);

      expect(error.name).toBe('OrchestrationError');
      expect(error.message).toBe(message);
      expect(error.context).toBe(context);
      expect(error.originalError).toBeUndefined();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof OrchestrationError).toBe(true);
    });

    it('should create orchestration error with original error', () => {
      const context: ContextType = 'language-intelligence';
      const message = 'Validation failed';
      const originalError = new Error('Original cause');

      const error = new OrchestrationError(message, context, originalError);

      expect(error.name).toBe('OrchestrationError');
      expect(error.message).toBe(message);
      expect(error.context).toBe(context);
      expect(error.originalError).toBe(originalError);
    });

    it('should work with all context types', () => {
      const contexts: ContextType[] = [
        'core',
        'language-intelligence',
        'package-ecosystem',
        'synchronization',
      ];

      for (const context of contexts) {
        const error = new OrchestrationError(`Error in ${context}`, context);
        expect(error.context).toBe(context);
        expect(error.message).toBe(`Error in ${context}`);
      }
    });
  });

  describe('ContextUnavailableError', () => {
    it('should create context unavailable error without original error', () => {
      const context: ContextType = 'package-ecosystem';

      const error = new ContextUnavailableError(context);

      expect(error.name).toBe('ContextUnavailableError');
      expect(error.message).toBe(`Context '${context}' is currently unavailable`);
      expect(error.context).toBe(context);
      expect(error.originalError).toBeUndefined();
      expect(error instanceof OrchestrationError).toBe(true);
      expect(error instanceof ContextUnavailableError).toBe(true);
    });

    it('should create context unavailable error with original error', () => {
      const context: ContextType = 'synchronization';
      const originalError = new Error('Network timeout');

      const error = new ContextUnavailableError(context, originalError);

      expect(error.name).toBe('ContextUnavailableError');
      expect(error.message).toBe(`Context '${context}' is currently unavailable`);
      expect(error.context).toBe(context);
      expect(error.originalError).toBe(originalError);
    });

    it('should work with all context types', () => {
      const contexts: ContextType[] = [
        'core',
        'language-intelligence',
        'package-ecosystem',
        'synchronization',
      ];

      for (const context of contexts) {
        const error = new ContextUnavailableError(context);
        expect(error.context).toBe(context);
        expect(error.message).toBe(`Context '${context}' is currently unavailable`);
      }
    });
  });

  describe('OrchestrationTimeoutError', () => {
    it('should create timeout error without original error', () => {
      const context: ContextType = 'language-intelligence';
      const timeoutMs = 5000;

      const error = new OrchestrationTimeoutError(context, timeoutMs);

      expect(error.name).toBe('OrchestrationTimeoutError');
      expect(error.message).toBe(`Context '${context}' operation timed out after ${timeoutMs}ms`);
      expect(error.context).toBe(context);
      expect(error.timeoutMs).toBe(timeoutMs);
      expect(error.originalError).toBeUndefined();
      expect(error instanceof OrchestrationError).toBe(true);
      expect(error instanceof OrchestrationTimeoutError).toBe(true);
    });

    it('should create timeout error with original error', () => {
      const context: ContextType = 'package-ecosystem';
      const timeoutMs = 10000;
      const originalError = new Error('Request aborted');

      const error = new OrchestrationTimeoutError(context, timeoutMs, originalError);

      expect(error.name).toBe('OrchestrationTimeoutError');
      expect(error.message).toBe(`Context '${context}' operation timed out after ${timeoutMs}ms`);
      expect(error.context).toBe(context);
      expect(error.timeoutMs).toBe(timeoutMs);
      expect(error.originalError).toBe(originalError);
    });

    it('should work with different timeout values', () => {
      const context: ContextType = 'core';
      const timeouts = [1000, 5000, 15000, 30000];

      for (const timeout of timeouts) {
        const error = new OrchestrationTimeoutError(context, timeout);
        expect(error.timeoutMs).toBe(timeout);
        expect(error.message).toContain(`${timeout}ms`);
      }
    });

    it('should work with all context types', () => {
      const contexts: ContextType[] = [
        'core',
        'language-intelligence',
        'package-ecosystem',
        'synchronization',
      ];
      const timeoutMs = 5000;

      for (const context of contexts) {
        const error = new OrchestrationTimeoutError(context, timeoutMs);
        expect(error.context).toBe(context);
        expect(error.message).toBe(`Context '${context}' operation timed out after ${timeoutMs}ms`);
      }
    });
  });

  describe('CrossContextConflictError', () => {
    it('should create cross-context conflict error without original error', () => {
      const conflictingContexts: ContextType[] = ['language-intelligence', 'package-ecosystem'];
      const message = 'Conflicting validation results';

      const error = new CrossContextConflictError(conflictingContexts, message);

      expect(error.name).toBe('CrossContextConflictError');
      expect(error.message).toBe(message);
      expect(error.context).toBe('core'); // CrossContextConflictError always uses 'core' context
      expect(error.conflictingContexts).toEqual(conflictingContexts);
      expect(error.originalError).toBeUndefined();
      expect(error instanceof OrchestrationError).toBe(true);
      expect(error instanceof CrossContextConflictError).toBe(true);
    });

    it('should create cross-context conflict error with original error', () => {
      const conflictingContexts: ContextType[] = ['synchronization', 'core'];
      const message = 'State synchronization conflict';
      const originalError = new Error('Version mismatch');

      const error = new CrossContextConflictError(conflictingContexts, message, originalError);

      expect(error.name).toBe('CrossContextConflictError');
      expect(error.message).toBe(message);
      expect(error.context).toBe('core');
      expect(error.conflictingContexts).toEqual(conflictingContexts);
      expect(error.originalError).toBe(originalError);
    });

    it('should work with different combinations of conflicting contexts', () => {
      const testCases = [
        ['core', 'language-intelligence'],
        ['package-ecosystem', 'synchronization'],
        ['core', 'package-ecosystem', 'language-intelligence'],
        ['synchronization', 'core', 'package-ecosystem', 'language-intelligence'],
      ] as ContextType[][];

      for (const contexts of testCases) {
        const error = new CrossContextConflictError(contexts, 'Test conflict');
        expect(error.conflictingContexts).toEqual(contexts);
        expect(error.context).toBe('core'); // Always 'core' for cross-context conflicts
      }
    });

    it('should handle single context in conflicting contexts array', () => {
      const conflictingContexts: ContextType[] = ['language-intelligence'];
      const message = 'Single context conflict';

      const error = new CrossContextConflictError(conflictingContexts, message);

      expect(error.conflictingContexts).toEqual(conflictingContexts);
      expect(error.conflictingContexts).toHaveLength(1);
    });

    it('should handle empty conflicting contexts array', () => {
      const conflictingContexts: ContextType[] = [];
      const message = 'No specific context conflict';

      const error = new CrossContextConflictError(conflictingContexts, message);

      expect(error.conflictingContexts).toEqual([]);
      expect(error.conflictingContexts).toHaveLength(0);
    });
  });

  describe('Error inheritance chain', () => {
    it('should properly inherit from Error and OrchestrationError', () => {
      const orchestrationError = new OrchestrationError('Base error', 'core');
      const contextUnavailableError = new ContextUnavailableError('language-intelligence');
      const timeoutError = new OrchestrationTimeoutError('package-ecosystem', 5000);
      const conflictError = new CrossContextConflictError(['core', 'synchronization'], 'Conflict');

      // All should be instances of Error
      expect(orchestrationError instanceof Error).toBe(true);
      expect(contextUnavailableError instanceof Error).toBe(true);
      expect(timeoutError instanceof Error).toBe(true);
      expect(conflictError instanceof Error).toBe(true);

      // All should be instances of OrchestrationError
      expect(orchestrationError instanceof OrchestrationError).toBe(true);
      expect(contextUnavailableError instanceof OrchestrationError).toBe(true);
      expect(timeoutError instanceof OrchestrationError).toBe(true);
      expect(conflictError instanceof OrchestrationError).toBe(true);

      // Each should be instance of its specific type
      expect(contextUnavailableError instanceof ContextUnavailableError).toBe(true);
      expect(timeoutError instanceof OrchestrationTimeoutError).toBe(true);
      expect(conflictError instanceof CrossContextConflictError).toBe(true);
    });

    it('should have proper error stack traces', () => {
      const error = new OrchestrationError('Test error', 'core');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack?.includes('OrchestrationError')).toBe(true);
    });
  });
});
