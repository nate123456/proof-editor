import { describe, expect, it } from 'vitest';

import { DomainError, ProcessingError, RepositoryError, StructureError } from '../DomainErrors.js';

describe('Domain Errors', () => {
  describe('DomainError base class', () => {
    class TestDomainError extends DomainError {}

    it('should create error with message', () => {
      const error = new TestDomainError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('DomainError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const originalError = new Error('Root cause');
      const error = new TestDomainError('Wrapper error', originalError);

      expect(error.message).toBe('Wrapper error');
      expect(error.name).toBe('DomainError');
      expect(error.cause).toBe(originalError);
    });

    it('should be instance of Error', () => {
      const error = new TestDomainError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have correct prototype chain', () => {
      const error = new TestDomainError('Test error');

      expect(Object.getPrototypeOf(error)).toBe(TestDomainError.prototype);
      expect(Object.getPrototypeOf(TestDomainError.prototype)).toBe(DomainError.prototype);
      expect(Object.getPrototypeOf(DomainError.prototype)).toBe(Error.prototype);
    });

    it('should preserve cause error information', () => {
      const originalError = new Error('Root cause');
      originalError.stack = 'original stack trace';

      const error = new TestDomainError('Wrapper error', originalError);

      expect(error.cause).toBe(originalError);
      expect((error.cause as Error).message).toBe('Root cause');
      expect((error.cause as Error).stack).toBe('original stack trace');
    });

    it('should handle undefined cause gracefully', () => {
      const error = new TestDomainError('Test error', undefined);

      expect(error.cause).toBeUndefined();
      expect(error.message).toBe('Test error');
    });

    it('should handle nested error chains', () => {
      const rootError = new Error('Root error');
      const intermediateError = new TestDomainError('Intermediate error', rootError);
      const topError = new TestDomainError('Top error', intermediateError);

      expect(topError.cause).toBe(intermediateError);
      expect((topError.cause as TestDomainError).cause).toBe(rootError);
    });
  });

  describe('ProcessingError', () => {
    it('should extend DomainError', () => {
      const error = new ProcessingError('Processing failed');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.name).toBe('DomainError');
    });

    it('should create error with message only', () => {
      const error = new ProcessingError('Processing operation failed');

      expect(error.message).toBe('Processing operation failed');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const originalError = new Error('Data corruption detected');
      const error = new ProcessingError('Processing failed', originalError);

      expect(error.message).toBe('Processing failed');
      expect(error.cause).toBe(originalError);
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new ProcessingError('Test processing error');
      }).toThrow(ProcessingError);

      expect(() => {
        throw new ProcessingError('Test processing error');
      }).toThrow('Test processing error');
    });

    it('should handle complex processing scenarios', () => {
      const parseError = new Error('Invalid format');
      const validationError = new ProcessingError('Validation failed', parseError);
      const transformError = new ProcessingError('Transform failed', validationError);

      expect(transformError.cause).toBe(validationError);
      expect((transformError.cause as ProcessingError).cause).toBe(parseError);
    });
  });

  describe('StructureError', () => {
    it('should extend DomainError', () => {
      const error = new StructureError('Structure is invalid');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(StructureError);
      expect(error.name).toBe('DomainError');
    });

    it('should create error with message only', () => {
      const error = new StructureError('Tree structure is malformed');

      expect(error.message).toBe('Tree structure is malformed');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const originalError = new Error('Cycle detected in graph');
      const error = new StructureError('Invalid tree structure', originalError);

      expect(error.message).toBe('Invalid tree structure');
      expect(error.cause).toBe(originalError);
    });

    it('should handle structural validation scenarios', () => {
      const cycleError = new Error('Cycle detected: A -> B -> A');
      const structureError = new StructureError('Tree contains cycles', cycleError);

      expect(structureError.cause).toBe(cycleError);
      expect(structureError.message).toBe('Tree contains cycles');
    });

    it('should be distinguishable from other error types', () => {
      const structureError = new StructureError('Structure error');
      const processingError = new ProcessingError('Processing error');

      expect(structureError).not.toBeInstanceOf(ProcessingError);
      expect(processingError).not.toBeInstanceOf(StructureError);
    });
  });

  describe('RepositoryError', () => {
    it('should extend Error directly (not DomainError)', () => {
      const error = new RepositoryError('Repository operation failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RepositoryError);
      expect(error).not.toBeInstanceOf(DomainError);
      expect(error.name).toBe('RepositoryError');
    });

    it('should create error with message only', () => {
      const error = new RepositoryError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const sqlError = new Error('Connection timeout');
      const error = new RepositoryError('Database operation failed', sqlError);

      expect(error.message).toBe('Database operation failed');
      expect(error.cause).toBe(sqlError);
    });

    it('should handle repository operation scenarios', () => {
      const connectionError = new Error('Network unreachable');
      const repositoryError = new RepositoryError('Repository unavailable', connectionError);

      expect(repositoryError.cause).toBe(connectionError);
      expect(repositoryError.name).toBe('RepositoryError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new RepositoryError('Test repository error');
      }).toThrow(RepositoryError);

      expect(() => {
        throw new RepositoryError('Test repository error');
      }).toThrow('Test repository error');
    });

    it('should handle database-specific error scenarios', () => {
      const scenarios = [
        { cause: new Error('Connection pool exhausted'), message: 'Too many connections' },
        { cause: new Error('Deadlock detected'), message: 'Transaction failed' },
        { cause: new Error('Foreign key constraint'), message: 'Reference integrity violation' },
        { cause: new Error('Table not found'), message: 'Schema mismatch' },
      ];

      scenarios.forEach(({ cause, message }) => {
        const error = new RepositoryError(message, cause);
        expect(error.cause).toBe(cause);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(RepositoryError);
      });
    });
  });

  describe('error hierarchy and inheritance', () => {
    it('should allow instanceof checks at appropriate levels', () => {
      const processingError = new ProcessingError('Processing failed');
      const structureError = new StructureError('Structure failed');
      const repositoryError = new RepositoryError('Repository failed');

      // Domain errors should be instances of DomainError and Error
      expect(processingError).toBeInstanceOf(Error);
      expect(processingError).toBeInstanceOf(DomainError);
      expect(processingError).toBeInstanceOf(ProcessingError);

      expect(structureError).toBeInstanceOf(Error);
      expect(structureError).toBeInstanceOf(DomainError);
      expect(structureError).toBeInstanceOf(StructureError);

      // Repository error should be instance of Error but NOT DomainError
      expect(repositoryError).toBeInstanceOf(Error);
      expect(repositoryError).not.toBeInstanceOf(DomainError);
      expect(repositoryError).toBeInstanceOf(RepositoryError);
    });

    it('should distinguish between different domain error types', () => {
      const processingError = new ProcessingError('Processing failed');
      const structureError = new StructureError('Structure failed');

      expect(processingError).not.toBeInstanceOf(StructureError);
      expect(structureError).not.toBeInstanceOf(ProcessingError);
      expect(processingError).not.toBeInstanceOf(RepositoryError);
      expect(structureError).not.toBeInstanceOf(RepositoryError);
    });

    it('should allow error handling by base type for domain errors', () => {
      const domainErrors: DomainError[] = [
        new ProcessingError('Processing failed'),
        new StructureError('Structure failed'),
      ];

      domainErrors.forEach((error) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBeTruthy();
        expect(error.message).toBeTruthy();
      });
    });

    it('should preserve error context in complex scenarios', () => {
      const ioError = new Error('File system error');
      const repositoryError = new RepositoryError('Data persistence failed', ioError);
      const processingError = new ProcessingError('Processing incomplete', repositoryError);
      const structureError = new StructureError('Structure validation failed', processingError);

      // Check error chain integrity
      expect(structureError.cause).toBe(processingError);
      expect(processingError.cause).toBe(repositoryError);
      expect(repositoryError.cause).toBe(ioError);

      // Check type preservation
      expect(structureError).toBeInstanceOf(StructureError);
      expect(structureError.cause).toBeInstanceOf(ProcessingError);
      expect((structureError.cause as ProcessingError).cause).toBeInstanceOf(RepositoryError);
      expect(
        ((structureError.cause as ProcessingError).cause as RepositoryError).cause,
      ).toBeInstanceOf(Error);
    });
  });

  describe('error name property behavior', () => {
    it('should have correct name property for each error type', () => {
      const processingError = new ProcessingError('test');
      const structureError = new StructureError('test');
      const repositoryError = new RepositoryError('test');

      expect(processingError.name).toBe('DomainError');
      expect(structureError.name).toBe('DomainError');
      expect(repositoryError.name).toBe('RepositoryError');
    });

    it('should preserve name property in inheritance chain', () => {
      class CustomProcessingError extends ProcessingError {}
      const customError = new CustomProcessingError('test');

      expect(customError.name).toBe('DomainError');
      expect(customError).toBeInstanceOf(ProcessingError);
      expect(customError).toBeInstanceOf(DomainError);
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle empty error messages', () => {
      const processingError = new ProcessingError('');
      const structureError = new StructureError('');
      const repositoryError = new RepositoryError('');

      expect(processingError.message).toBe('');
      expect(structureError.message).toBe('');
      expect(repositoryError.message).toBe('');
    });

    it('should handle null and undefined causes gracefully', () => {
      const processingError = new ProcessingError('test', undefined);
      const structureError = new StructureError('test', null as any);

      expect(processingError.cause).toBeUndefined();
      expect(structureError.cause).toBeUndefined();
    });

    it('should handle non-Error cause objects', () => {
      const nonErrorCause = { message: 'Not an error object' } as Error;
      const error = new ProcessingError('test', nonErrorCause);

      expect(error.cause).toBe(nonErrorCause);
    });

    it('should maintain stack trace information', () => {
      const processingError = new ProcessingError('Stack test');
      const structureError = new StructureError('Stack test');
      const repositoryError = new RepositoryError('Stack test');

      expect(processingError.stack).toBeDefined();
      expect(processingError.stack).toContain('DomainError');

      expect(structureError.stack).toBeDefined();
      expect(structureError.stack).toContain('DomainError');

      expect(repositoryError.stack).toBeDefined();
      expect(repositoryError.stack).toContain('RepositoryError');
    });

    it('should handle circular error references', () => {
      const error1 = new ProcessingError('Error 1');
      const error2 = new StructureError('Error 2', error1);

      // Simulate circular reference (though not recommended)
      (error1 as any).cause = error2;

      expect(error2.cause).toBe(error1);
      expect(error2.message).toBe('Error 2');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new ProcessingError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it('should handle messages with special characters', () => {
      const specialMessage = 'Error with "quotes", \'apostrophes\', \nnewlines\t and unicode: 🚨';
      const error = new StructureError(specialMessage);

      expect(error.message).toBe(specialMessage);
    });
  });

  describe('practical usage scenarios', () => {
    it('should support argument tree validation errors', () => {
      const cycleError = new Error('Node A references Node B which references Node A');
      const structureError = new StructureError('Argument tree contains cycle', cycleError);

      expect(structureError.message).toBe('Argument tree contains cycle');
      expect((structureError.cause as Error)?.message).toBe(
        'Node A references Node B which references Node A',
      );
    });

    it('should support statement processing errors', () => {
      const parseError = new Error('Invalid statement format');
      const processingError = new ProcessingError(
        'Failed to process statement content',
        parseError,
      );

      expect(processingError.message).toBe('Failed to process statement content');
      expect(processingError.cause).toBe(parseError);
    });

    it('should support repository operation errors', () => {
      const connectionError = new Error('Database connection refused');
      const repositoryError = new RepositoryError('Cannot save proof document', connectionError);

      expect(repositoryError.message).toBe('Cannot save proof document');
      expect(repositoryError.cause).toBe(connectionError);
      expect(repositoryError).not.toBeInstanceOf(DomainError);
    });

    it('should support error escalation chains', () => {
      // Start with infrastructure error
      const dbError = new Error('Connection timeout');
      const repoError = new RepositoryError('Save failed', dbError);

      // Escalate to domain processing error
      const processingError = new ProcessingError('Document processing failed', repoError);

      // Escalate to structure validation error
      const structureError = new StructureError('Document structure invalid', processingError);

      expect(structureError.cause).toBe(processingError);
      expect(processingError.cause).toBe(repoError);
      expect(repoError.cause).toBe(dbError);

      // Verify type chain
      expect(structureError).toBeInstanceOf(DomainError);
      expect(structureError.cause).toBeInstanceOf(DomainError);
      expect((structureError.cause as ProcessingError).cause).not.toBeInstanceOf(DomainError);
      expect((structureError.cause as ProcessingError).cause).toBeInstanceOf(RepositoryError);
    });
  });
});
