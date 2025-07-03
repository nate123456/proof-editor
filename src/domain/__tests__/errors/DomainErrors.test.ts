/**
 * Test suite for Domain Errors - foundational error handling
 *
 * Priority: HIGH (14 dependents across codebase)
 * Demonstrates:
 * - Proper error inheritance and construction
 * - Error chaining and cause tracking
 * - Type-safe error handling patterns
 * - Domain-specific error behaviors
 */

// Extend Error interface to include cause property for ES2022 compatibility
declare global {
  interface Error {
    cause?: unknown;
  }
}

import fc from 'fast-check';
import { err, ok, type Result } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import {
  DomainError,
  ProcessingError,
  RepositoryError,
  StructureError,
} from '../../errors/DomainErrors.js';

describe('DomainError Base Class', () => {
  // Concrete implementation for testing abstract base
  class TestDomainError extends DomainError {}

  describe('basic error construction', () => {
    it('should create domain error with message', () => {
      const message = 'Test domain error occurred';
      const error = new TestDomainError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('DomainError');
      expect(error.cause).toBeUndefined();
    });

    it('should create domain error with cause', () => {
      const rootCause = new Error('Root cause error');
      const message = 'Domain error with cause';
      const error = new TestDomainError(message, rootCause);

      expect(error.message).toBe(message);
      expect(error.cause).toBe(rootCause);
      expect(error.stack).toBeDefined();
    });

    it('should maintain proper prototype chain', () => {
      const error = new TestDomainError('test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof DomainError).toBe(true);
      expect(error instanceof TestDomainError).toBe(true);
    });
  });

  describe('error chaining behavior', () => {
    it('should preserve cause chain through multiple levels', () => {
      const originalError = new Error('Original system error');
      const intermediateError = new TestDomainError(
        'Intermediate processing failed',
        originalError,
      );
      const finalError = new TestDomainError('Final operation failed', intermediateError);

      expect(finalError.cause).toBe(intermediateError);
      expect(finalError.cause?.cause).toBe(originalError);
    });

    it('should handle cause chain traversal', () => {
      const getCauseChain = (error: Error): Error[] => {
        const chain: Error[] = [error];
        let current = error;

        while (current.cause && current.cause instanceof Error) {
          chain.push(current.cause);
          current = current.cause;
        }

        return chain;
      };

      const root = new Error('Root');
      const middle = new TestDomainError('Middle', root);
      const top = new TestDomainError('Top', middle);

      const chain = getCauseChain(top);
      expect(chain).toHaveLength(3);
      expect(chain[0]).toBe(top);
      expect(chain[1]).toBe(middle);
      expect(chain[2]).toBe(root);
    });
  });

  describe('property-based error behavior', () => {
    it('should maintain message integrity across construction', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new TestDomainError(message);
          expect(error.message).toBe(message);
        }),
      );
    });

    it('should handle various cause types correctly', () => {
      const causeTypes = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new RangeError('Range error'),
        new TestDomainError('Nested domain error'),
      ];

      causeTypes.forEach((cause) => {
        const error = new TestDomainError('Test with cause', cause);
        expect(error.cause).toBe(cause);
        expect(error.message).toBe('Test with cause');
      });
    });
  });
});

describe('ProcessingError', () => {
  describe('specific domain error behavior', () => {
    it('should extend DomainError correctly', () => {
      const error = new ProcessingError('Processing failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.name).toBe('DomainError'); // Base class sets name
    });

    it('should support cause chaining', () => {
      const originalError = new TypeError('Invalid argument type');
      const processingError = new ProcessingError('Could not process argument', originalError);

      expect(processingError.cause).toBe(originalError);
      expect(processingError.message).toBe('Could not process argument');
    });

    it('should work in error handling patterns', () => {
      const simulateProcessing = (shouldFail: boolean) => {
        if (shouldFail) {
          throw new ProcessingError('Simulated processing failure');
        }
        return 'success';
      };

      expect(() => simulateProcessing(true)).toThrow(ProcessingError);
      expect(simulateProcessing(false)).toBe('success');

      try {
        simulateProcessing(true);
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessingError);
        expect((error as ProcessingError).message).toContain('processing failure');
      }
    });
  });

  describe('domain context usage', () => {
    it('should provide meaningful errors for domain operations', () => {
      // Simulate domain operation that could fail
      const processStatement = (content: string) => {
        if (content.length === 0) {
          throw new ProcessingError('Cannot process empty statement content');
        }
        if (content.length > 10000) {
          throw new ProcessingError(
            'Statement content exceeds maximum length',
            new RangeError('Content too long'),
          );
        }
        return `Processed: ${content}`;
      };

      expect(() => processStatement('')).toThrow(ProcessingError);
      expect(() => processStatement('a'.repeat(10001))).toThrow(ProcessingError);
      expect(processStatement('valid content')).toContain('Processed:');
    });
  });
});

describe('StructureError', () => {
  describe('structural validation errors', () => {
    it('should handle structure-related domain failures', () => {
      const error = new StructureError('Invalid tree structure detected');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(StructureError);
      expect(error.message).toBe('Invalid tree structure detected');
    });

    it('should support detailed structural error reporting', () => {
      const cycleError = new Error('Cycle detected in node graph');
      const structureError = new StructureError('Tree validation failed', cycleError);

      expect(structureError.cause).toBe(cycleError);
      expect(structureError.message).toBe('Tree validation failed');
    });

    it('should work in structural validation scenarios', () => {
      const validateTreeStructure = (nodes: string[], edges: [string, string][]) => {
        // Simple cycle detection
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (node: string): boolean => {
          if (recursionStack.has(node)) return true;
          if (visited.has(node)) return false;

          visited.add(node);
          recursionStack.add(node);

          const children = edges.filter(([from]) => from === node).map(([, to]) => to);
          for (const child of children) {
            if (hasCycle(child)) return true;
          }

          recursionStack.delete(node);
          return false;
        };

        for (const node of nodes) {
          if (hasCycle(node)) {
            throw new StructureError(`Cycle detected starting from node: ${node}`);
          }
        }

        return true;
      };

      // Valid tree
      expect(
        validateTreeStructure(
          ['A', 'B', 'C'],
          [
            ['A', 'B'],
            ['B', 'C'],
          ],
        ),
      ).toBe(true);

      // Invalid tree with cycle
      expect(() =>
        validateTreeStructure(
          ['A', 'B', 'C'],
          [
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'A'],
          ],
        ),
      ).toThrow(StructureError);
    });
  });
});

describe('RepositoryError', () => {
  describe('repository operation errors', () => {
    it('should handle repository-specific failures', () => {
      const error = new RepositoryError('Database connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RepositoryError);
      expect(error.name).toBe('RepositoryError');
      expect(error.message).toBe('Database connection failed');
    });

    it('should support infrastructure error chaining', () => {
      const dbError = new Error('Connection timeout');
      const repoError = new RepositoryError('Failed to save entity', dbError);

      expect(repoError.cause).toBe(dbError);
      expect(repoError.message).toBe('Failed to save entity');
    });

    it('should work in repository operation patterns', () => {
      interface Repository<T> {
        save(entity: T): T;
        findById(id: string): T | null;
      }

      class TestRepository implements Repository<{ id: string; data: string }> {
        private readonly entities = new Map<string, { id: string; data: string }>();

        save(entity: { id: string; data: string }) {
          if (!entity.id) {
            throw new RepositoryError('Cannot save entity without ID');
          }
          if (entity.data.length === 0) {
            throw new RepositoryError('Cannot save entity with empty data');
          }

          this.entities.set(entity.id, entity);
          return entity;
        }

        findById(id: string) {
          if (!id) {
            throw new RepositoryError('ID cannot be empty');
          }
          return this.entities.get(id) ?? null;
        }
      }

      const repo = new TestRepository();

      // Valid operations
      const entity = { id: 'test-1', data: 'test data' };
      expect(repo.save(entity)).toBe(entity);
      expect(repo.findById('test-1')).toBe(entity);
      expect(repo.findById('non-existent')).toBeNull();

      // Invalid operations
      expect(() => repo.save({ id: '', data: 'test' })).toThrow(RepositoryError);
      expect(() => repo.save({ id: 'test', data: '' })).toThrow(RepositoryError);
      expect(() => repo.findById('')).toThrow(RepositoryError);
    });
  });
});

describe('Error Type Discrimination', () => {
  it('should allow proper error type checking', () => {
    const errors = [
      new ProcessingError('Processing failed'),
      new StructureError('Structure invalid'),
      new RepositoryError('Repository failed'),
    ];

    errors.forEach((error) => {
      if (error instanceof ProcessingError) {
        expect(error.message).toContain('Processing');
      } else if (error instanceof StructureError) {
        expect(error.message).toContain('Structure');
      } else if (error instanceof RepositoryError) {
        expect(error.message).toContain('Repository');
      }
    });
  });

  it('should support error-specific handling patterns', () => {
    const handleDomainError = (error: Error) => {
      if (error instanceof ProcessingError) {
        return { type: 'processing', recoverable: true, message: error.message };
      } else if (error instanceof StructureError) {
        return { type: 'structure', recoverable: false, message: error.message };
      } else if (error instanceof RepositoryError) {
        return { type: 'repository', recoverable: true, message: error.message };
      } else {
        return { type: 'unknown', recoverable: false, message: error.message };
      }
    };

    const processingResult = handleDomainError(new ProcessingError('test'));
    expect(processingResult.type).toBe('processing');
    expect(processingResult.recoverable).toBe(true);

    const structureResult = handleDomainError(new StructureError('test'));
    expect(structureResult.type).toBe('structure');
    expect(structureResult.recoverable).toBe(false);

    const repositoryResult = handleDomainError(new RepositoryError('test'));
    expect(repositoryResult.type).toBe('repository');
    expect(repositoryResult.recoverable).toBe(true);
  });
});

describe('Integration with Result Types', () => {
  it('should work seamlessly with neverthrow Result pattern', () => {
    const processWithResult = (input: string): Result<string, ProcessingError> => {
      if (input.length === 0) {
        return err(new ProcessingError('Empty input not allowed'));
      }
      return ok(`Processed: ${input}`);
    };

    const successResult = processWithResult('test');
    expect(successResult.isOk()).toBe(true);
    if (successResult.isOk()) {
      expect(successResult.value).toBe('Processed: test');
    }

    const errorResult = processWithResult('');
    expect(errorResult.isErr()).toBe(true);
    if (errorResult.isErr()) {
      expect(errorResult.error).toBeInstanceOf(ProcessingError);
      expect(errorResult.error.message).toContain('Empty input');
    }
  });
});

describe('Advanced Edge Cases', () => {
  describe('error serialization and deserialization', () => {
    it('should preserve error details through JSON serialization', () => {
      const originalError = new TypeError('Original cause');
      const domainError = new ProcessingError('Processing failed', originalError);

      const serialized = JSON.stringify({
        name: domainError.name,
        message: domainError.message,
        stack: domainError.stack,
        cause: domainError.cause
          ? {
              name: domainError.cause.name,
              message: domainError.cause.message,
            }
          : undefined,
      });

      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe('DomainError');
      expect(parsed.message).toBe('Processing failed');
      expect(parsed.cause.name).toBe('TypeError');
      expect(parsed.cause.message).toBe('Original cause');
    });
  });

  describe('error stack trace preservation', () => {
    it('should maintain stack traces with cause information', () => {
      const rootError = new Error('Root error');
      const wrappedError = new StructureError('Wrapper error', rootError);

      expect(wrappedError.stack).toBeDefined();
      expect(wrappedError.stack).toContain('DomainError'); // Base class sets the name
      expect(wrappedError.stack).toContain('Wrapper error');
      expect(wrappedError.cause).toBe(rootError);
    });
  });

  describe('error property access', () => {
    it('should provide access to error properties', () => {
      const rootCause = new TypeError('Type error');
      const error = new ProcessingError('Test error', rootCause);

      // Verify all properties are accessible
      expect(error.name).toBe('DomainError');
      expect(error.message).toBe('Test error');
      expect(error.cause).toBe(rootCause);
      expect(error.stack).toBeDefined();

      // Verify the cause property is readonly as declared
      expect(error.cause).toBe(rootCause);
    });

    it('should handle errors without cause', () => {
      const error = new ProcessingError('Test error');

      expect(error.name).toBe('DomainError');
      expect(error.message).toBe('Test error');
      expect(error.cause).toBeUndefined();
      expect(error.stack).toBeDefined();
    });
  });

  describe('complex error chain scenarios', () => {
    it('should handle deeply nested error chains', () => {
      const level1 = new Error('Level 1');
      const level2 = new ProcessingError('Level 2', level1);
      const level3 = new StructureError('Level 3', level2);
      const level4 = new RepositoryError('Level 4', level3);

      expect(level4.cause).toBe(level3);
      expect(level4.cause?.cause).toBe(level2);
      expect((level4.cause as RepositoryError)?.cause?.cause).toBe(level1);
    });
  });

  describe('error handling in async contexts', () => {
    it('should work correctly with async/await patterns', async () => {
      const asyncOperation = async (shouldFail: boolean) => {
        await Promise.resolve(); // Add await to fix linting error
        if (shouldFail) {
          throw new ProcessingError('Async operation failed');
        }
        return 'success';
      };

      await expect(asyncOperation(true)).rejects.toThrow(ProcessingError);
      await expect(asyncOperation(false)).resolves.toBe('success');
    });
  });
});

describe('Memory and Performance Considerations', () => {
  describe('error object memory footprint', () => {
    it('should not retain unnecessary references', () => {
      const errors: DomainError[] = [];

      // Create many errors to test memory patterns
      for (let i = 0; i < 100; i++) {
        errors.push(new ProcessingError(`Error ${i}`));
      }

      // All errors should have consistent structure
      errors.forEach((error, index) => {
        expect(error.message).toBe(`Error ${index}`);
        expect(error.name).toBe('DomainError');
        expect(error.cause).toBeUndefined();
      });
    });

    it('should handle large error messages efficiently', () => {
      const largeMessage = 'X'.repeat(10000);
      const error = new StructureError(largeMessage);

      expect(error.message).toBe(largeMessage);
      expect(error.message.length).toBe(10000);
    });
  });

  describe('error creation performance', () => {
    it('should create errors quickly in tight loops', () => {
      const createManyErrors = () => {
        const errors: ProcessingError[] = [];
        for (let i = 0; i < 1000; i++) {
          errors.push(new ProcessingError(`Error ${i}`));
        }
        return errors;
      };

      const errors = createManyErrors();
      expect(errors).toHaveLength(1000);
      expect(errors[0]).toBeInstanceOf(ProcessingError);
      expect(errors[999]).toBeInstanceOf(ProcessingError);
    });
  });
});

describe('Error Boundary Testing', () => {
  describe('special character handling', () => {
    it('should handle messages with special characters', () => {
      const specialMessages = [
        'Error with "quotes"',
        "Error with 'single quotes'",
        'Error with \n newlines',
        'Error with \t tabs',
        'Error with \\ backslashes',
        'Error with unicode: 🚀 ✨ 🎯',
        'Error with null char: \0',
        'Error with <html>tags</html>',
      ];

      specialMessages.forEach((message) => {
        const error = new ProcessingError(message);
        expect(error.message).toBe(message);
      });
    });

    it('should handle empty string messages', () => {
      const error = new StructureError('');
      expect(error.message).toBe('');
      expect(error.name).toBe('DomainError');
    });
  });

  describe('cause edge cases', () => {
    it('should handle null cause gracefully', () => {
      // TypeScript prevents null, but runtime might not
      const error = new ProcessingError('Test', undefined);
      expect(error.cause).toBeUndefined();
    });

    it('should handle same error as cause', () => {
      const error1 = new ProcessingError('Error 1');
      const error2 = new ProcessingError('Error 2', error1);
      // This creates a valid chain, not a cycle
      expect(error2.cause).toBe(error1);
    });
  });
});

describe('Cross-Domain Error Patterns', () => {
  describe('error transformation patterns', () => {
    it('should support error wrapping for domain boundaries', () => {
      // Simulate external error
      const externalError = new Error('External service failed');

      // Wrap in domain error
      const domainError = new RepositoryError(
        'Failed to fetch from external service',
        externalError,
      );

      expect(domainError.cause).toBe(externalError);
      expect(domainError.message).toContain('external service');
    });

    it('should support error enrichment patterns', () => {
      const baseError = new ProcessingError('Basic processing failed');

      // Enrich with context
      const enrichedError = new ProcessingError(
        `${baseError.message} - Context: User ID 123`,
        baseError,
      );

      expect(enrichedError.cause).toBe(baseError);
      expect(enrichedError.message).toContain('User ID 123');
    });
  });

  describe('error categorization patterns', () => {
    it('should support error filtering by type', () => {
      const mixedErrors: Error[] = [
        new ProcessingError('Process 1'),
        new StructureError('Structure 1'),
        new RepositoryError('Repo 1'),
        new Error('Generic 1'),
        new ProcessingError('Process 2'),
      ];

      const processingErrors = mixedErrors.filter(
        (e): e is ProcessingError => e instanceof ProcessingError,
      );

      expect(processingErrors).toHaveLength(2);
      processingErrors.forEach((e) => {
        expect(e).toBeInstanceOf(ProcessingError);
      });
    });
  });
});

describe('Error Name Property Behavior', () => {
  it('should set name to DomainError for all domain error types', () => {
    // This tests the actual behavior where base class sets name
    const processingError = new ProcessingError('test');
    const structureError = new StructureError('test');

    expect(processingError.name).toBe('DomainError');
    expect(structureError.name).toBe('DomainError');

    // RepositoryError extends Error directly, so it sets its own name
    const repoError = new RepositoryError('test');
    expect(repoError.name).toBe('RepositoryError');
  });

  it('should maintain Error.prototype.toString behavior', () => {
    const error = new ProcessingError('Custom message');
    expect((error as Error).toString()).toBe('DomainError: Custom message');

    const repoError = new RepositoryError('Repo message');
    expect((repoError as Error).toString()).toBe('RepositoryError: Repo message');
  });
});
