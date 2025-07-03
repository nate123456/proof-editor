/**
 * Comprehensive test suite for Language Intelligence Domain Errors
 *
 * Tests all error classes for:
 * - Constructor behavior and inheritance
 * - Error message handling and formatting
 * - Cause chaining functionality
 * - Property-based edge cases
 * - TypeScript type safety
 */

import fc from 'fast-check';

// Extend Error interface to include cause property for ES2022 compatibility
declare global {
  interface Error {
    cause?: unknown;
  }
}

import { describe, expect, it } from 'vitest';

import {
  AnalysisError,
  DomainError,
  EducationalFeedbackError,
  LanguagePackageError,
  PatternRecognitionError,
  RepositoryError,
  ValidationError,
} from '../../errors/DomainErrors.js';

describe('DomainError (abstract base class)', () => {
  // We can't instantiate abstract DomainError directly, so we test through a concrete subclass
  class ConcreteDomainError extends DomainError {}

  describe('constructor', () => {
    it('should create error with message only', () => {
      const message = 'Test error message';
      const error = new ConcreteDomainError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('ConcreteDomainError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should create error with message and cause', () => {
      const message = 'Test error message';
      const cause = new Error('Original cause');
      const error = new ConcreteDomainError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('ConcreteDomainError');
      expect(error.cause).toBe(cause);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should not set cause when undefined is passed', () => {
      const message = 'Test error message';
      const error = new ConcreteDomainError(message, undefined);

      expect(error.message).toBe(message);
      expect(error.name).toBe('ConcreteDomainError');
      expect(error.cause).toBeUndefined();
    });

    it('should properly set name to constructor name', () => {
      class SpecialDomainError extends DomainError {}
      const error = new SpecialDomainError('test');

      expect(error.name).toBe('SpecialDomainError');
    });
  });

  describe('inheritance chain', () => {
    it('should be instance of Error', () => {
      const error = new ConcreteDomainError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of DomainError', () => {
      const error = new ConcreteDomainError('test');
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have correct prototype chain', () => {
      const error = new ConcreteDomainError('test');
      expect(Object.getPrototypeOf(error)).toBe(ConcreteDomainError.prototype);
      expect(Object.getPrototypeOf(ConcreteDomainError.prototype)).toBe(DomainError.prototype);
      expect(Object.getPrototypeOf(DomainError.prototype)).toBe(Error.prototype);
    });
  });

  describe('cause chaining', () => {
    it('should chain multiple error causes', () => {
      const rootCause = new Error('Root cause');
      const intermediateCause = new ConcreteDomainError('Intermediate', rootCause);
      const finalError = new ConcreteDomainError('Final error', intermediateCause);

      expect(finalError.cause).toBe(intermediateCause);
      expect(finalError.cause?.cause).toBe(rootCause);
    });

    it('should handle complex cause chains', () => {
      const originalError = new TypeError('Type error');
      const domainError = new ConcreteDomainError('Domain error', originalError);
      const serviceError = new ConcreteDomainError('Service error', domainError);

      expect(serviceError.message).toBe('Service error');
      expect(serviceError.cause).toBe(domainError);
      expect((serviceError.cause as ConcreteDomainError).cause).toBe(originalError);
    });
  });

  describe('property-based tests', () => {
    it('should handle any valid string message', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new ConcreteDomainError(message);
          expect(error.message).toBe(message);
          expect(error.name).toBe('ConcreteDomainError');
          expect(error).toBeInstanceOf(DomainError);
        }),
      );
    });

    it('should handle messages with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          (message) => {
            const error = new ConcreteDomainError(message);
            expect(error.message).toBe(message);
            expect(error.name).toBe('ConcreteDomainError');
          },
        ),
      );
    });

    it('should handle various Error types as cause', () => {
      const errorTypes = [
        () => new Error('Generic error'),
        () => new TypeError('Type error'),
        () => new ReferenceError('Reference error'),
        () => new RangeError('Range error'),
        () => new ConcreteDomainError('Nested domain error'),
      ];

      errorTypes.forEach((createError) => {
        const cause = createError();
        const error = new ConcreteDomainError('Test message', cause);

        expect(error.cause).toBe(cause);
        expect(error.message).toBe('Test message');
      });
    });
  });
});

describe('ValidationError', () => {
  describe('constructor and inheritance', () => {
    it('should create ValidationError with message only', () => {
      const message = 'Validation failed';
      const error = new ValidationError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('ValidationError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should create ValidationError with message and cause', () => {
      const message = 'Validation failed';
      const cause = new Error('Invalid input');
      const error = new ValidationError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('ValidationError');
      expect(error.cause).toBe(cause);
    });

    it('should work with custom validation matcher', () => {
      const error = new ValidationError('Test validation error');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Test validation error');
    });
  });

  describe('typical use cases', () => {
    it('should handle input validation errors', () => {
      const error = new ValidationError('Input cannot be empty');
      expect(error.message).toBe('Input cannot be empty');
      expect(error.name).toBe('ValidationError');
    });

    it('should handle format validation errors', () => {
      const error = new ValidationError('Invalid email format');
      expect(error.message).toBe('Invalid email format');
      expect(error.name).toBe('ValidationError');
    });

    it('should handle constraint validation errors', () => {
      const error = new ValidationError('Value must be between 1 and 100');
      expect(error.message).toBe('Value must be between 1 and 100');
      expect(error.name).toBe('ValidationError');
    });
  });
});

describe('AnalysisError', () => {
  describe('constructor and inheritance', () => {
    it('should create AnalysisError with message only', () => {
      const message = 'Analysis failed';
      const error = new AnalysisError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('AnalysisError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(AnalysisError);
    });

    it('should create AnalysisError with message and cause', () => {
      const message = 'Analysis processing failed';
      const cause = new Error('Insufficient data');
      const error = new AnalysisError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('AnalysisError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('typical use cases', () => {
    it('should handle analysis processing errors', () => {
      const error = new AnalysisError('Unable to process code analysis');
      expect(error.message).toBe('Unable to process code analysis');
      expect(error.name).toBe('AnalysisError');
    });

    it('should handle analysis data errors', () => {
      const error = new AnalysisError('Corrupted analysis data');
      expect(error.message).toBe('Corrupted analysis data');
      expect(error.name).toBe('AnalysisError');
    });
  });
});

describe('LanguagePackageError', () => {
  describe('constructor and inheritance', () => {
    it('should create LanguagePackageError with message only', () => {
      const message = 'Language package error';
      const error = new LanguagePackageError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('LanguagePackageError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(LanguagePackageError);
    });

    it('should create LanguagePackageError with message and cause', () => {
      const message = 'Package loading failed';
      const cause = new Error('Network timeout');
      const error = new LanguagePackageError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('LanguagePackageError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('typical use cases', () => {
    it('should handle package loading errors', () => {
      const error = new LanguagePackageError('Failed to load TypeScript language package');
      expect(error.message).toBe('Failed to load TypeScript language package');
      expect(error.name).toBe('LanguagePackageError');
    });

    it('should handle package version errors', () => {
      const error = new LanguagePackageError('Incompatible package version');
      expect(error.message).toBe('Incompatible package version');
      expect(error.name).toBe('LanguagePackageError');
    });
  });
});

describe('PatternRecognitionError', () => {
  describe('constructor and inheritance', () => {
    it('should create PatternRecognitionError with message only', () => {
      const message = 'Pattern recognition failed';
      const error = new PatternRecognitionError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('PatternRecognitionError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(PatternRecognitionError);
    });

    it('should create PatternRecognitionError with message and cause', () => {
      const message = 'Pattern matching failed';
      const cause = new Error('Invalid regex pattern');
      const error = new PatternRecognitionError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('PatternRecognitionError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('typical use cases', () => {
    it('should handle pattern matching errors', () => {
      const error = new PatternRecognitionError('No matching patterns found');
      expect(error.message).toBe('No matching patterns found');
      expect(error.name).toBe('PatternRecognitionError');
    });

    it('should handle pattern compilation errors', () => {
      const error = new PatternRecognitionError('Invalid pattern syntax');
      expect(error.message).toBe('Invalid pattern syntax');
      expect(error.name).toBe('PatternRecognitionError');
    });
  });
});

describe('EducationalFeedbackError', () => {
  describe('constructor and inheritance', () => {
    it('should create EducationalFeedbackError with message only', () => {
      const message = 'Educational feedback generation failed';
      const error = new EducationalFeedbackError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('EducationalFeedbackError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(EducationalFeedbackError);
    });

    it('should create EducationalFeedbackError with message and cause', () => {
      const message = 'Feedback processing failed';
      const cause = new Error('Template not found');
      const error = new EducationalFeedbackError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('EducationalFeedbackError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('typical use cases', () => {
    it('should handle feedback generation errors', () => {
      const error = new EducationalFeedbackError('Unable to generate helpful feedback');
      expect(error.message).toBe('Unable to generate helpful feedback');
      expect(error.name).toBe('EducationalFeedbackError');
    });

    it('should handle feedback template errors', () => {
      const error = new EducationalFeedbackError('Feedback template missing');
      expect(error.message).toBe('Feedback template missing');
      expect(error.name).toBe('EducationalFeedbackError');
    });
  });
});

describe('RepositoryError', () => {
  describe('constructor and inheritance', () => {
    it('should create RepositoryError with message only', () => {
      const message = 'Repository operation failed';
      const error = new RepositoryError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('RepositoryError');
      expect(error.cause).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(RepositoryError);
    });

    it('should create RepositoryError with message and cause', () => {
      const message = 'Database connection failed';
      const cause = new Error('Connection timeout');
      const error = new RepositoryError(message, cause);

      expect(error.message).toBe(message);
      expect(error.name).toBe('RepositoryError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('typical use cases', () => {
    it('should handle data access errors', () => {
      const error = new RepositoryError('Failed to save entity');
      expect(error.message).toBe('Failed to save entity');
      expect(error.name).toBe('RepositoryError');
    });

    it('should handle query errors', () => {
      const error = new RepositoryError('Invalid query parameters');
      expect(error.message).toBe('Invalid query parameters');
      expect(error.name).toBe('RepositoryError');
    });

    it('should handle connection errors', () => {
      const error = new RepositoryError('Database connection lost');
      expect(error.message).toBe('Database connection lost');
      expect(error.name).toBe('RepositoryError');
    });
  });
});

describe('Cross-cutting error behavior', () => {
  const allErrorClasses = [
    ValidationError,
    AnalysisError,
    LanguagePackageError,
    PatternRecognitionError,
    EducationalFeedbackError,
    RepositoryError,
  ];

  describe('consistent inheritance behavior', () => {
    it('should all extend DomainError', () => {
      allErrorClasses.forEach((ErrorClass) => {
        const error = new ErrorClass('test message');
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should all properly set constructor name', () => {
      const expectedNames = [
        'ValidationError',
        'AnalysisError',
        'LanguagePackageError',
        'PatternRecognitionError',
        'EducationalFeedbackError',
        'RepositoryError',
      ];

      allErrorClasses.forEach((ErrorClass, index) => {
        const error = new ErrorClass('test message');
        expect(error.name).toBe(expectedNames[index]);
      });
    });

    it('should all handle cause parameter consistently', () => {
      const cause = new Error('Original cause');

      allErrorClasses.forEach((ErrorClass) => {
        const errorWithoutCause = new ErrorClass('test message');
        const errorWithCause = new ErrorClass('test message', cause);

        expect(errorWithoutCause.cause).toBeUndefined();
        expect(errorWithCause.cause).toBe(cause);
      });
    });
  });

  describe('serialization behavior', () => {
    it('should maintain error properties after JSON roundtrip', () => {
      allErrorClasses.forEach((ErrorClass) => {
        const originalError = new ErrorClass('test message');
        const serialized = JSON.stringify({
          name: originalError.name,
          message: originalError.message,
          cause: originalError.cause?.message,
        });
        const parsed = JSON.parse(serialized);

        expect(parsed.name).toBe(originalError.name);
        expect(parsed.message).toBe(originalError.message);
      });
    });
  });

  describe('property-based tests for all error types', () => {
    it('should handle arbitrary valid messages consistently', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.constantFrom(...allErrorClasses),
          (message, ErrorClass) => {
            const error = new ErrorClass(message);
            expect(error.message).toBe(message);
            expect(error).toBeInstanceOf(DomainError);
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(ErrorClass.name);
          },
        ),
      );
    });

    it('should handle edge case messages', () => {
      const edgeCaseMessages = [
        '',
        ' ',
        '\n',
        '\t',
        'a'.repeat(1000),
        '🚫 Unicode error message',
        'Error with "quotes" and \'apostrophes\'',
        'Error\nwith\nnewlines',
        'Error with special chars: !@#$%^&*()',
      ];

      allErrorClasses.forEach((ErrorClass) => {
        edgeCaseMessages.forEach((message) => {
          const error = new ErrorClass(message);
          expect(error.message).toBe(message);
          expect(error.name).toBe(ErrorClass.name);
        });
      });
    });
  });
});

describe('Error composition and chaining scenarios', () => {
  it('should support complex error composition patterns', () => {
    // Simulate a realistic error scenario with multiple layers
    const networkError = new Error('Network connection failed');
    const repositoryError = new RepositoryError('Failed to fetch data', networkError);
    const analysisError = new AnalysisError('Cannot analyze without data', repositoryError);
    const validationError = new ValidationError('Analysis result validation failed', analysisError);

    // Verify the complete chain
    expect(validationError.message).toBe('Analysis result validation failed');
    expect(validationError.cause).toBe(analysisError);
    expect(validationError.cause?.cause).toBe(repositoryError);
    expect((validationError.cause?.cause as RepositoryError).cause).toBe(networkError);

    // Verify types throughout the chain
    expect(validationError).toBeInstanceOf(ValidationError);
    expect(validationError.cause).toBeInstanceOf(AnalysisError);
    expect(validationError.cause?.cause).toBeInstanceOf(RepositoryError);
    expect((validationError.cause?.cause as RepositoryError).cause).toBeInstanceOf(Error);
  });

  it('should support error recovery scenarios', () => {
    const originalError = new PatternRecognitionError('Pattern matching failed');
    const recoveryAttempt = new AnalysisError('Fallback analysis failed', originalError);

    expect(recoveryAttempt.message).toBe('Fallback analysis failed');
    expect(recoveryAttempt.cause).toBe(originalError);
    expect(recoveryAttempt.cause?.message).toBe('Pattern matching failed');
  });
});
