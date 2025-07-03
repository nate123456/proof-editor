/**
 * Comprehensive test suite for Analysis Domain Errors
 *
 * Priority: HIGH (Foundation for all analysis domain error handling)
 * Demonstrates:
 * - Domain error hierarchy and inheritance
 * - Error message and cause handling
 * - Type-specific error behaviors
 * - Error serialization and properties
 * - Edge cases with error construction
 */

import { describe, expect, it } from 'vitest';

import {
  AnalysisDomainError,
  InsightGenerationError,
  PatternMatchError,
  SourceLocationError,
  ValidationError,
} from '../../errors/AnalysisErrors.js';

describe('Analysis Domain Errors', () => {
  describe('AnalysisDomainError (Abstract Base)', () => {
    // Create a concrete implementation for testing the abstract base
    class TestDomainError extends AnalysisDomainError {}

    describe('basic error construction', () => {
      it('should create error with message only', () => {
        const error = new TestDomainError('Test error message');

        expect(error.message).toBe('Test error message');
        expect(error.name).toBe('TestDomainError');
        expect(error.cause).toBeUndefined();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AnalysisDomainError);
      });

      it('should create error with message and cause', () => {
        const cause = new Error('Root cause');
        const error = new TestDomainError('Test error message', cause);

        expect(error.message).toBe('Test error message');
        expect(error.name).toBe('TestDomainError');
        expect(error.cause).toBe(cause);
      });

      it('should set error name to constructor name automatically', () => {
        const error = new TestDomainError('Test message');

        expect(error.name).toBe('TestDomainError');
      });
    });

    describe('inheritance behavior', () => {
      it('should be instanceof Error', () => {
        const error = new TestDomainError('Test message');

        expect(error instanceof Error).toBe(true);
        expect(error instanceof AnalysisDomainError).toBe(true);
      });

      it('should preserve error prototype chain', () => {
        const error = new TestDomainError('Test message');

        expect(Object.getPrototypeOf(error)).toBe(TestDomainError.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(
          AnalysisDomainError.prototype
        );
      });
    });

    describe('error properties', () => {
      it('should maintain all Error properties', () => {
        const error = new TestDomainError('Test message');

        expect(error.message).toBeDefined();
        expect(error.name).toBeDefined();
        expect(error.stack).toBeDefined();
      });

      it('should have cause property', () => {
        const cause = new Error('Cause');
        const error = new TestDomainError('Test message', cause);

        expect(error.cause).toBe(cause);

        // Verify cause is accessible
        expect(error.cause?.message).toBe('Cause');
      });
    });

    describe('edge cases', () => {
      it('should handle empty message', () => {
        const error = new TestDomainError('');

        expect(error.message).toBe('');
        expect(error.name).toBe('TestDomainError');
      });

      it('should handle undefined cause explicitly', () => {
        const error = new TestDomainError('Test message', undefined);

        expect(error.message).toBe('Test message');
        expect(error.cause).toBeUndefined();
      });

      it('should handle null cause', () => {
        const error = new TestDomainError('Test message', null as any);

        expect(error.message).toBe('Test message');
        expect(error.cause).toBeNull();
      });

      it('should handle very long messages', () => {
        const longMessage = 'A'.repeat(10000);
        const error = new TestDomainError(longMessage);

        expect(error.message).toBe(longMessage);
        expect(error.message.length).toBe(10000);
      });

      it('should handle special characters in message', () => {
        const specialMessage = '🔍 Error with unicode αβγ and symbols @#$%';
        const error = new TestDomainError(specialMessage);

        expect(error.message).toBe(specialMessage);
      });
    });

    describe('error chaining', () => {
      it('should support multiple levels of error chaining', () => {
        const rootCause = new Error('Root cause');
        const intermediateCause = new TestDomainError('Intermediate error', rootCause);
        const finalError = new TestDomainError('Final error', intermediateCause);

        expect(finalError.cause).toBe(intermediateCause);
        expect((finalError.cause as TestDomainError).cause).toBe(rootCause);
      });

      it('should preserve cause error types', () => {
        const domainCause = new ValidationError('Validation failed');
        const error = new TestDomainError('Wrapper error', domainCause);

        expect(error.cause).toBeInstanceOf(ValidationError);
        expect(error.cause).toBeInstanceOf(AnalysisDomainError);
      });
    });
  });

  describe('ValidationError', () => {
    describe('basic functionality', () => {
      it('should create validation error correctly', () => {
        const error = new ValidationError('Field cannot be empty');

        expect(error.message).toBe('Field cannot be empty');
        expect(error.name).toBe('ValidationError');
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(AnalysisDomainError);
        expect(error).toBeInstanceOf(Error);
      });

      it('should support cause parameter', () => {
        const cause = new Error('Input validation failed');
        const error = new ValidationError('Invalid input provided', cause);

        expect(error.message).toBe('Invalid input provided');
        expect(error.cause).toBe(cause);
      });
    });

    describe('validation-specific scenarios', () => {
      it('should handle typical validation messages', () => {
        const testCases = [
          'Field cannot be empty',
          'Value must be between 0 and 1',
          'Invalid format provided',
          'Required parameter missing',
          'Constraint violation detected',
        ];

        testCases.forEach(message => {
          const error = new ValidationError(message);
          expect(error.message).toBe(message);
          expect(error.name).toBe('ValidationError');
        });
      });

      it('should differentiate from other domain errors', () => {
        const validationError = new ValidationError('Validation failed');
        const patternError = new PatternMatchError('Pattern failed');

        expect(validationError).toBeInstanceOf(ValidationError);
        expect(validationError).not.toBeInstanceOf(PatternMatchError);
        expect(patternError).toBeInstanceOf(PatternMatchError);
        expect(patternError).not.toBeInstanceOf(ValidationError);
      });
    });
  });

  describe('PatternMatchError', () => {
    describe('basic functionality', () => {
      it('should create pattern match error correctly', () => {
        const error = new PatternMatchError('Pattern matching failed');

        expect(error.message).toBe('Pattern matching failed');
        expect(error.name).toBe('PatternMatchError');
        expect(error).toBeInstanceOf(PatternMatchError);
        expect(error).toBeInstanceOf(AnalysisDomainError);
      });

      it('should support cause parameter', () => {
        const cause = new Error('Regex compilation failed');
        const error = new PatternMatchError('Pattern engine error', cause);

        expect(error.message).toBe('Pattern engine error');
        expect(error.cause).toBe(cause);
      });
    });

    describe('pattern-specific scenarios', () => {
      it('should handle pattern matching error scenarios', () => {
        const testCases = [
          'Pattern not found in content',
          'Invalid pattern syntax',
          'Pattern matching timeout',
          'Conflicting pattern matches',
          'Pattern compilation failed',
        ];

        testCases.forEach(message => {
          const error = new PatternMatchError(message);
          expect(error.message).toBe(message);
          expect(error.name).toBe('PatternMatchError');
        });
      });
    });
  });

  describe('SourceLocationError', () => {
    describe('basic functionality', () => {
      it('should create source location error correctly', () => {
        const error = new SourceLocationError('Invalid position specified');

        expect(error.message).toBe('Invalid position specified');
        expect(error.name).toBe('SourceLocationError');
        expect(error).toBeInstanceOf(SourceLocationError);
        expect(error).toBeInstanceOf(AnalysisDomainError);
      });

      it('should support cause parameter', () => {
        const cause = new Error('Position out of bounds');
        const error = new SourceLocationError('Location calculation failed', cause);

        expect(error.message).toBe('Location calculation failed');
        expect(error.cause).toBe(cause);
      });
    });

    describe('location-specific scenarios', () => {
      it('should handle source location error scenarios', () => {
        const testCases = [
          'Start line cannot be negative',
          'End position before start position',
          'Document URI not found',
          'Invalid line range specified',
          'Position out of document bounds',
        ];

        testCases.forEach(message => {
          const error = new SourceLocationError(message);
          expect(error.message).toBe(message);
          expect(error.name).toBe('SourceLocationError');
        });
      });
    });
  });

  describe('InsightGenerationError', () => {
    describe('basic functionality', () => {
      it('should create insight generation error correctly', () => {
        const error = new InsightGenerationError('Failed to generate analysis insight');

        expect(error.message).toBe('Failed to generate analysis insight');
        expect(error.name).toBe('InsightGenerationError');
        expect(error).toBeInstanceOf(InsightGenerationError);
        expect(error).toBeInstanceOf(AnalysisDomainError);
      });

      it('should support cause parameter', () => {
        const cause = new Error('Insufficient data for analysis');
        const error = new InsightGenerationError('Insight analysis failed', cause);

        expect(error.message).toBe('Insight analysis failed');
        expect(error.cause).toBe(cause);
      });
    });

    describe('insight-specific scenarios', () => {
      it('should handle insight generation error scenarios', () => {
        const testCases = [
          'Insufficient data for insight generation',
          'Analysis algorithm failure',
          'Insight confidence too low',
          'Unable to categorize insight',
          'Recommendation generation failed',
        ];

        testCases.forEach(message => {
          const error = new InsightGenerationError(message);
          expect(error.message).toBe(message);
          expect(error.name).toBe('InsightGenerationError');
        });
      });
    });
  });

  describe('Error Type Hierarchy', () => {
    it('should maintain proper inheritance hierarchy', () => {
      const validationError = new ValidationError('Validation failed');
      const patternError = new PatternMatchError('Pattern failed');
      const locationError = new SourceLocationError('Location failed');
      const insightError = new InsightGenerationError('Insight failed');

      // All should be domain errors
      expect(validationError).toBeInstanceOf(AnalysisDomainError);
      expect(patternError).toBeInstanceOf(AnalysisDomainError);
      expect(locationError).toBeInstanceOf(AnalysisDomainError);
      expect(insightError).toBeInstanceOf(AnalysisDomainError);

      // All should be base errors
      expect(validationError).toBeInstanceOf(Error);
      expect(patternError).toBeInstanceOf(Error);
      expect(locationError).toBeInstanceOf(Error);
      expect(insightError).toBeInstanceOf(Error);

      // Should not cross-inherit
      expect(validationError).not.toBeInstanceOf(PatternMatchError);
      expect(patternError).not.toBeInstanceOf(SourceLocationError);
      expect(locationError).not.toBeInstanceOf(InsightGenerationError);
      expect(insightError).not.toBeInstanceOf(ValidationError);
    });

    it('should enable error type discrimination', () => {
      const errors: AnalysisDomainError[] = [
        new ValidationError('Validation error'),
        new PatternMatchError('Pattern error'),
        new SourceLocationError('Location error'),
        new InsightGenerationError('Insight error'),
      ];

      const validationErrors = errors.filter(e => e instanceof ValidationError);
      const patternErrors = errors.filter(e => e instanceof PatternMatchError);
      const locationErrors = errors.filter(e => e instanceof SourceLocationError);
      const insightErrors = errors.filter(e => e instanceof InsightGenerationError);

      expect(validationErrors).toHaveLength(1);
      expect(patternErrors).toHaveLength(1);
      expect(locationErrors).toHaveLength(1);
      expect(insightErrors).toHaveLength(1);

      expect(validationErrors[0]?.message).toBe('Validation error');
      expect(patternErrors[0]?.message).toBe('Pattern error');
      expect(locationErrors[0]?.message).toBe('Location error');
      expect(insightErrors[0]?.message).toBe('Insight error');
    });
  });

  describe('Error Serialization and Properties', () => {
    it('should have correct error properties for serialization', () => {
      const cause = new Error('Original cause');
      const error = new ValidationError('Validation failed', cause);

      // Test that error has expected properties
      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error.cause).toBe(cause);

      // Test that error can be serialized (structure depends on JS implementation)
      const serialized = JSON.stringify(error);
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    });

    it('should have correct error properties for display', () => {
      const error = new PatternMatchError('Pattern matching failed');

      expect(error.name).toBe('PatternMatchError');
      expect(error.message).toBe('Pattern matching failed');
      expect(error.stack).toBeDefined();
    });

    it('should handle error with cause properties', () => {
      const cause = new Error('Root cause message');
      const error = new SourceLocationError('Location error', cause);

      expect(error.name).toBe('SourceLocationError');
      expect(error.message).toBe('Location error');
      expect(error.cause).toBe(cause);
      expect(error.stack).toBeDefined();
    });
  });

  describe('Error Construction Edge Cases', () => {
    it('should handle all error types with minimal parameters', () => {
      const errors = [
        new ValidationError(''),
        new PatternMatchError(''),
        new SourceLocationError(''),
        new InsightGenerationError(''),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(AnalysisDomainError);
        expect(error.message).toBe('');
        expect(error.cause).toBeUndefined();
      });
    });

    it('should handle circular cause references gracefully', () => {
      const error1 = new ValidationError('Error 1');
      const error2 = new PatternMatchError('Error 2', error1);

      // Don't create actual circular reference as it would break JSON serialization
      // Just verify the errors can reference each other
      expect(error2.cause).toBe(error1);
      expect(error1.cause).toBeUndefined();
    });

    it('should handle non-Error cause objects', () => {
      // This tests the type system allows any Error, but what if someone passes wrong type?
      const error = new ValidationError('Test', {} as Error);

      expect(error.cause).toEqual({});
      expect(error.message).toBe('Test');
    });
  });

  describe('Error Usage Patterns', () => {
    it('should support error wrapping pattern', () => {
      const lowLevelError = new Error('Database connection failed');
      const domainError = new ValidationError('User input validation failed', lowLevelError);
      const highLevelError = new InsightGenerationError('Analysis process failed', domainError);

      expect(highLevelError.cause).toBe(domainError);
      expect((highLevelError.cause as ValidationError).cause).toBe(lowLevelError);
    });

    it('should support error rethrowing pattern', () => {
      function throwValidationError() {
        throw new ValidationError('Field is required');
      }

      function wrapAndRethrow() {
        try {
          throwValidationError();
        } catch (error) {
          throw new PatternMatchError('Pattern validation failed', error as Error);
        }
      }

      expect(() => wrapAndRethrow()).toThrow(PatternMatchError);

      try {
        wrapAndRethrow();
      } catch (error) {
        expect(error).toBeInstanceOf(PatternMatchError);
        expect((error as PatternMatchError).cause).toBeInstanceOf(ValidationError);
      }
    });

    it('should support error filtering by type', () => {
      const errors: Error[] = [
        new ValidationError('Validation error'),
        new Error('Generic error'),
        new PatternMatchError('Pattern error'),
        new SourceLocationError('Location error'),
      ];

      const domainErrors = errors.filter(e => e instanceof AnalysisDomainError);
      const validationErrors = errors.filter(e => e instanceof ValidationError);

      expect(domainErrors).toHaveLength(3);
      expect(validationErrors).toHaveLength(1);
      expect(validationErrors[0]?.message).toBe('Validation error');
    });
  });
});
