import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  AnalysisError,
  DomainError,
  EducationalFeedbackError,
  LanguagePackageError,
  PatternRecognitionError,
  RepositoryError,
  ValidationError,
} from '../DomainErrors.js';

describe('DomainError', () => {
  describe('basic functionality', () => {
    class TestDomainError extends DomainError {}

    it('should create error with message', () => {
      const error = new TestDomainError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TestDomainError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const originalError = new Error('Original error');
      const error = new TestDomainError('Test error', originalError);

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TestDomainError');
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
  });

  describe('error chaining', () => {
    class TestDomainError extends DomainError {}

    it('should preserve cause error information', () => {
      const originalError = new Error('Root cause');
      originalError.stack = 'original stack trace';

      const error = new TestDomainError('Wrapper error', originalError);

      expect(error.cause).toBe(originalError);
      expect(error.cause?.message).toBe('Root cause');
      expect(error.cause?.stack).toBe('original stack trace');
    });

    it('should handle null cause gracefully', () => {
      const error = new TestDomainError('Test error', undefined);

      expect(error.cause).toBeUndefined();
      expect(error.message).toBe('Test error');
    });

    it('should handle nested error chains', () => {
      const rootError = new Error('Root error');
      const intermediateError = new TestDomainError('Intermediate error', rootError);
      const topError = new TestDomainError('Top error', intermediateError);

      expect(topError.cause).toBe(intermediateError);
      expect((topError.cause as any)?.cause).toBe(rootError);
    });
  });
});

describe('ValidationError', () => {
  it('should extend DomainError', () => {
    const error = new ValidationError('Validation failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
  });

  it('should create error with message only', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with message and cause', () => {
    const originalError = new Error('Parse error');
    const error = new ValidationError('Validation failed', originalError);

    expect(error.message).toBe('Validation failed');
    expect(error.cause).toBe(originalError);
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new ValidationError('Test validation error');
    }).toThrow(ValidationError);

    expect(() => {
      throw new ValidationError('Test validation error');
    }).toThrow('Test validation error');
  });
});

describe('AnalysisError', () => {
  it('should extend DomainError', () => {
    const error = new AnalysisError('Analysis failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(AnalysisError);
    expect(error.name).toBe('AnalysisError');
  });

  it('should create error with message only', () => {
    const error = new AnalysisError('Analysis could not complete');

    expect(error.message).toBe('Analysis could not complete');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with message and cause', () => {
    const originalError = new Error('Data corrupted');
    const error = new AnalysisError('Analysis failed', originalError);

    expect(error.message).toBe('Analysis failed');
    expect(error.cause).toBe(originalError);
  });

  it('should handle complex analysis scenarios', () => {
    const dataError = new Error('Invalid data format');
    const processingError = new AnalysisError('Processing failed', dataError);
    const finalError = new AnalysisError('Complete analysis failure', processingError);

    expect(finalError.cause).toBe(processingError);
    expect((finalError.cause as any)?.cause).toBe(dataError);
  });
});

describe('LanguagePackageError', () => {
  it('should extend DomainError', () => {
    const error = new LanguagePackageError('Package error');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(LanguagePackageError);
    expect(error.name).toBe('LanguagePackageError');
  });

  it('should create error with message only', () => {
    const error = new LanguagePackageError('Package not found');

    expect(error.message).toBe('Package not found');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with message and cause', () => {
    const networkError = new Error('Network timeout');
    const error = new LanguagePackageError('Failed to load package', networkError);

    expect(error.message).toBe('Failed to load package');
    expect(error.cause).toBe(networkError);
  });

  it('should handle package loading scenarios', () => {
    const ioError = new Error('File system error');
    const packageError = new LanguagePackageError('Package corrupted', ioError);

    expect(packageError.cause).toBe(ioError);
    expect(packageError.message).toBe('Package corrupted');
  });
});

describe('PatternRecognitionError', () => {
  it('should extend DomainError', () => {
    const error = new PatternRecognitionError('Pattern not found');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(PatternRecognitionError);
    expect(error.name).toBe('PatternRecognitionError');
  });

  it('should create error with message only', () => {
    const error = new PatternRecognitionError('No patterns matched');

    expect(error.message).toBe('No patterns matched');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with message and cause', () => {
    const regexError = new Error('Invalid regex pattern');
    const error = new PatternRecognitionError('Pattern recognition failed', regexError);

    expect(error.message).toBe('Pattern recognition failed');
    expect(error.cause).toBe(regexError);
  });

  it('should handle complex pattern scenarios', () => {
    const algorithmError = new Error('Algorithm timeout');
    const recognitionError = new PatternRecognitionError('Recognition timeout', algorithmError);

    expect(recognitionError.cause).toBe(algorithmError);
    expect(recognitionError.name).toBe('PatternRecognitionError');
  });
});

describe('EducationalFeedbackError', () => {
  it('should extend DomainError', () => {
    const error = new EducationalFeedbackError('Feedback generation failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(EducationalFeedbackError);
    expect(error.name).toBe('EducationalFeedbackError');
  });

  it('should create error with message only', () => {
    const error = new EducationalFeedbackError('Cannot generate feedback');

    expect(error.message).toBe('Cannot generate feedback');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with message and cause', () => {
    const apiError = new Error('LLM API unavailable');
    const error = new EducationalFeedbackError('Feedback service down', apiError);

    expect(error.message).toBe('Feedback service down');
    expect(error.cause).toBe(apiError);
  });

  it('should handle educational context scenarios', () => {
    const contextError = new Error('Context too large');
    const feedbackError = new EducationalFeedbackError('Cannot process context', contextError);

    expect(feedbackError.cause).toBe(contextError);
    expect(feedbackError.name).toBe('EducationalFeedbackError');
  });
});

describe('RepositoryError', () => {
  it('should extend DomainError', () => {
    const error = new RepositoryError('Repository operation failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(RepositoryError);
    expect(error.name).toBe('RepositoryError');
  });

  it('should create error with message only', () => {
    const error = new RepositoryError('Database connection failed');

    expect(error.message).toBe('Database connection failed');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with message and cause', () => {
    const sqlError = new Error('Foreign key constraint violation');
    const error = new RepositoryError('Save operation failed', sqlError);

    expect(error.message).toBe('Save operation failed');
    expect(error.cause).toBe(sqlError);
  });

  it('should handle repository operation scenarios', () => {
    const connectionError = new Error('Connection pool exhausted');
    const repositoryError = new RepositoryError('Repository unavailable', connectionError);

    expect(repositoryError.cause).toBe(connectionError);
    expect(repositoryError.name).toBe('RepositoryError');
  });
});

describe('error hierarchy integration', () => {
  it('should allow instanceof checks at any level', () => {
    const validationError = new ValidationError('Validation failed');
    const analysisError = new AnalysisError('Analysis failed');
    const packageError = new LanguagePackageError('Package failed');

    expect(validationError).toBeInstanceOf(Error);
    expect(validationError).toBeInstanceOf(DomainError);
    expect(validationError).toBeInstanceOf(ValidationError);

    expect(analysisError).toBeInstanceOf(Error);
    expect(analysisError).toBeInstanceOf(DomainError);
    expect(analysisError).toBeInstanceOf(AnalysisError);

    expect(packageError).toBeInstanceOf(Error);
    expect(packageError).toBeInstanceOf(DomainError);
    expect(packageError).toBeInstanceOf(LanguagePackageError);
  });

  it('should distinguish between different error types', () => {
    const validationError = new ValidationError('Validation failed');
    const analysisError = new AnalysisError('Analysis failed');

    expect(validationError).not.toBeInstanceOf(AnalysisError);
    expect(analysisError).not.toBeInstanceOf(ValidationError);
    expect(validationError).not.toBeInstanceOf(LanguagePackageError);
  });

  it('should allow error handling by base type', () => {
    const errors: DomainError[] = [
      new ValidationError('Validation failed'),
      new AnalysisError('Analysis failed'),
      new LanguagePackageError('Package failed'),
      new PatternRecognitionError('Pattern failed'),
      new EducationalFeedbackError('Feedback failed'),
      new RepositoryError('Repository failed'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBeTruthy();
      expect(error.message).toBeTruthy();
    });
  });

  it('should preserve error context in complex scenarios', () => {
    const networkError = new Error('Network timeout');
    const repositoryError = new RepositoryError('Database unreachable', networkError);
    const analysisError = new AnalysisError('Analysis incomplete', repositoryError);
    const validationError = new ValidationError('Validation skipped', analysisError);

    // Check error chain integrity
    expect(validationError.cause).toBe(analysisError);
    expect(analysisError.cause).toBe(repositoryError);
    expect(repositoryError.cause).toBe(networkError);

    // Check type preservation
    expect(validationError).toBeInstanceOf(ValidationError);
    expect(validationError.cause).toBeInstanceOf(AnalysisError);
    expect((validationError.cause as any)?.cause).toBeInstanceOf(RepositoryError);
    expect((validationError.cause as any)?.cause?.cause).toBeInstanceOf(Error);
  });
});

describe('edge cases and error conditions', () => {
  it('should handle empty error messages', () => {
    const error = new ValidationError('');

    expect(error.message).toBe('');
    expect(error.name).toBe('ValidationError');
  });

  it('should handle undefined cause gracefully', () => {
    const error = new AnalysisError('Test', undefined);

    expect(error.cause).toBeUndefined();
    expect(error.message).toBe('Test');
  });

  it('should handle non-Error cause objects', () => {
    const nonErrorCause = { message: 'Not an error' } as Error;
    const error = new LanguagePackageError('Test', nonErrorCause);

    expect(error.cause).toBe(nonErrorCause);
  });

  it('should maintain stack trace information', () => {
    const error = new PatternRecognitionError('Stack test');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('PatternRecognitionError');
  });

  it('should handle circular error references', () => {
    const error1 = new ValidationError('Error 1');
    const error2 = new AnalysisError('Error 2', error1);

    // Simulate circular reference (though not recommended)
    (error1 as any).cause = error2;

    expect(error2.cause).toBe(error1);
    expect(error2.message).toBe('Error 2');
  });
});

describe('property-based testing', () => {
  describe('DomainError properties', () => {
    it('should maintain error properties with arbitrary messages', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new ValidationError(message);

          expect(error.message).toBe(message);
          expect(error.name).toBe('ValidationError');
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(DomainError);
        }),
      );
    });

    it('should handle arbitrary error chains', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (msg1, msg2, msg3) => {
          const rootError = new Error(msg1);
          const midError = new AnalysisError(msg2, rootError);
          const topError = new ValidationError(msg3, midError);

          expect(topError.message).toBe(msg3);
          expect(topError.cause).toBe(midError);
          expect(topError.cause?.message).toBe(msg2);
          expect((topError.cause as any)?.cause).toBe(rootError);
          expect((topError.cause as any)?.cause?.message).toBe(msg1);
        }),
      );
    });

    it('should preserve name property across all error types', () => {
      const errorTypes = [
        { constructor: ValidationError, expectedName: 'ValidationError' },
        { constructor: AnalysisError, expectedName: 'AnalysisError' },
        { constructor: LanguagePackageError, expectedName: 'LanguagePackageError' },
        { constructor: PatternRecognitionError, expectedName: 'PatternRecognitionError' },
        { constructor: EducationalFeedbackError, expectedName: 'EducationalFeedbackError' },
        { constructor: RepositoryError, expectedName: 'RepositoryError' },
      ];

      fc.assert(
        fc.property(fc.string(), (message) => {
          errorTypes.forEach(({ constructor: ErrorConstructor, expectedName }) => {
            const error = new ErrorConstructor(message);
            expect(error.name).toBe(expectedName);
            expect(error.message).toBe(message);
            expect(error).toBeInstanceOf(DomainError);
          });
        }),
      );
    });
  });

  describe('error serialization and JSON compatibility', () => {
    it('should handle JSON serialization scenarios', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new ValidationError(message);

          // Test that error can be serialized (common in logging scenarios)
          const serialized = JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          });

          const parsed = JSON.parse(serialized);
          expect(parsed.name).toBe('ValidationError');
          expect(parsed.message).toBe(message);
          expect(parsed.stack).toBeDefined();
        }),
      );
    });
  });
});

describe('performance and memory testing', () => {
  it('should handle large numbers of error instances efficiently', () => {
    const errors: DomainError[] = [];
    const startTime = performance.now();

    // Create many error instances
    for (let i = 0; i < 1000; i++) {
      errors.push(new ValidationError(`Error ${i}`));
      errors.push(new AnalysisError(`Analysis ${i}`));
      errors.push(new LanguagePackageError(`Package ${i}`));
    }

    const endTime = performance.now();

    // Should complete reasonably quickly (less than 200ms)
    expect(endTime - startTime).toBeLessThan(200);
    expect(errors).toHaveLength(3000);

    // Verify random samples
    expect(errors[0]).toBeInstanceOf(ValidationError);
    expect(errors[1]).toBeInstanceOf(AnalysisError);
    expect(errors[2]).toBeInstanceOf(LanguagePackageError);
  });

  it('should handle deep error chains without stack overflow', () => {
    let error: DomainError = new ValidationError('Root');

    // Create a deep chain of 100 errors
    for (let i = 0; i < 100; i++) {
      error = new AnalysisError(`Level ${i}`, error);
    }

    // Should be able to traverse the chain
    let depth = 0;
    let current: any = error;
    while (current?.cause) {
      current = current.cause;
      depth++;
    }

    expect(depth).toBe(100);
    expect(current.message).toBe('Root');
  });
});

describe('real-world error scenarios', () => {
  it('should handle validation failure scenarios', () => {
    const scenarios = [
      'Schema validation failed: missing required field "name"',
      'Type validation error: expected string, got number',
      'Range validation failed: value 150 exceeds maximum of 100',
      'Pattern validation failed: invalid email format',
      'Custom validation rule "uniqueUsername" failed',
    ];

    scenarios.forEach((message) => {
      const error = new ValidationError(message);
      expect(error.message).toBe(message);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  it('should handle analysis failure scenarios', () => {
    const scenarios = [
      'Syntax analysis failed: unexpected token at line 42',
      'Semantic analysis error: undefined variable "userInput"',
      'Data flow analysis failed: unreachable code detected',
      'Performance analysis timeout: analysis exceeded 30 seconds',
      'Memory analysis failed: heap overflow detected',
    ];

    scenarios.forEach((message) => {
      const error = new AnalysisError(message);
      expect(error.message).toBe(message);
      expect(error).toBeInstanceOf(AnalysisError);
    });
  });

  it('should handle package management scenarios', () => {
    const scenarios = [
      'Package download failed: network timeout',
      'Package verification failed: checksum mismatch',
      'Package installation failed: insufficient permissions',
      'Package dependency conflict: version 2.0 required, 1.5 installed',
      'Package not found: "unknown-package" does not exist in registry',
    ];

    scenarios.forEach((message) => {
      const error = new LanguagePackageError(message);
      expect(error.message).toBe(message);
      expect(error).toBeInstanceOf(LanguagePackageError);
    });
  });

  it('should handle pattern recognition scenarios', () => {
    const scenarios = [
      'Pattern compilation failed: invalid regex syntax',
      'Pattern matching timeout: pattern too complex',
      'Pattern not found: no matches in input text',
      'Pattern ambiguity error: multiple conflicting patterns',
      'Pattern engine failed: insufficient memory',
    ];

    scenarios.forEach((message) => {
      const error = new PatternRecognitionError(message);
      expect(error.message).toBe(message);
      expect(error).toBeInstanceOf(PatternRecognitionError);
    });
  });

  it('should handle educational feedback scenarios', () => {
    const scenarios = [
      'Feedback generation failed: AI service unavailable',
      'Context too large: input exceeds token limit',
      'Feedback quality check failed: response too generic',
      'Language model error: request rate limit exceeded',
      'Educational context missing: insufficient information for feedback',
    ];

    scenarios.forEach((message) => {
      const error = new EducationalFeedbackError(message);
      expect(error.message).toBe(message);
      expect(error).toBeInstanceOf(EducationalFeedbackError);
    });
  });

  it('should handle repository operation scenarios', () => {
    const scenarios = [
      'Database connection failed: connection pool exhausted',
      'Transaction failed: deadlock detected',
      'Query execution failed: syntax error in SQL',
      'Data constraint violation: foreign key constraint failed',
      'Repository timeout: operation exceeded 30 seconds',
    ];

    scenarios.forEach((message) => {
      const error = new RepositoryError(message);
      expect(error.message).toBe(message);
      expect(error).toBeInstanceOf(RepositoryError);
    });
  });
});

describe('error message formatting and internationalization', () => {
  it('should handle various character encodings', () => {
    const messages = [
      'Error with émojis: 🚨 Something went wrong!',
      'Unicode test: 测试错误信息',
      'Cyrillic: Ошибка в системе',
      'Arabic: خطأ في النظام',
      'Special chars: ¡¿Error with inverted punctuation?!',
    ];

    messages.forEach((message) => {
      const error = new ValidationError(message);
      expect(error.message).toBe(message);
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  it('should preserve whitespace in error messages', () => {
    const messages = [
      '   Leading whitespace',
      'Trailing whitespace   ',
      '  Both sides  ',
      'Multiple\n\nline\nerror',
      'Tab\tseparated\terror',
    ];

    messages.forEach((message) => {
      const error = new AnalysisError(message);
      expect(error.message).toBe(message);
    });
  });
});

describe('abstract class behavior and inheritance patterns', () => {
  it('should enforce abstract class pattern through TypeScript', () => {
    // DomainError is abstract - TypeScript prevents direct instantiation
    // We can only test that concrete subclasses work properly
    expect(() => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(ValidationError);
    }).not.toThrow();
  });

  it('should properly handle constructor.name assignment in subclasses', () => {
    const errorTypes = [
      { constructor: ValidationError, expectedName: 'ValidationError' },
      { constructor: AnalysisError, expectedName: 'AnalysisError' },
      { constructor: LanguagePackageError, expectedName: 'LanguagePackageError' },
      { constructor: PatternRecognitionError, expectedName: 'PatternRecognitionError' },
      { constructor: EducationalFeedbackError, expectedName: 'EducationalFeedbackError' },
      { constructor: RepositoryError, expectedName: 'RepositoryError' },
    ];

    errorTypes.forEach(({ constructor: ErrorConstructor, expectedName }) => {
      const error = new ErrorConstructor('Test message');
      expect(error.name).toBe(expectedName);
      expect(error.constructor.name).toBe(expectedName);
    });
  });

  it('should handle cause assignment in constructor conditionally', () => {
    const originalError = new Error('Original');

    // Test with cause
    const withCause = new ValidationError('Test with cause', originalError);
    expect(withCause.cause).toBe(originalError);

    // Test without cause (undefined)
    const withoutCause = new ValidationError('Test without cause');
    expect(withoutCause.cause).toBeUndefined();

    // Test with null cause
    const withNullCause = new ValidationError('Test with null', undefined);
    expect(withNullCause.cause).toBeUndefined();
  });
});

describe('enhanced error constructor edge cases', () => {
  it('should handle special Error object properties as cause', () => {
    const specialError = new Error('Special error');
    specialError.name = 'CustomError';
    (specialError as any).code = 'E001';
    (specialError as any).severity = 'high';

    const domainError = new ValidationError('Wrapped special error', specialError);

    expect(domainError.cause).toBe(specialError);
    expect((domainError.cause as any)?.name).toBe('CustomError');
    expect((domainError.cause as any)?.code).toBe('E001');
    expect((domainError.cause as any)?.severity).toBe('high');
  });

  it('should handle Error subclasses as cause', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const customError = new CustomError('Custom error message');
    const domainError = new AnalysisError('Analysis failed', customError);

    expect(domainError.cause).toBe(customError);
    expect(domainError.cause).toBeInstanceOf(Error);
    expect(domainError.cause).toBeInstanceOf(CustomError);
    expect(domainError.cause?.name).toBe('CustomError');
  });

  it('should preserve cause override property', () => {
    const originalError = new Error('Original');
    const error = new PatternRecognitionError('Pattern error', originalError);

    // Test that cause property works correctly
    expect(error.cause).toBe(originalError);
    expect('cause' in error).toBe(true);
  });
});

describe('error debugging and development support', () => {
  it('should provide useful error information for debugging', () => {
    const error = new ValidationError('Test error for debugging');

    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test error for debugging');
    expect(error instanceof ValidationError).toBe(true);
    expect(error instanceof DomainError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('should maintain constructor reference', () => {
    const errorTypes = [
      ValidationError,
      AnalysisError,
      LanguagePackageError,
      PatternRecognitionError,
      EducationalFeedbackError,
      RepositoryError,
    ];

    errorTypes.forEach((ErrorType) => {
      const error = new ErrorType('Test');
      expect(error.constructor).toBe(ErrorType);
      expect(error.constructor.name).toBe(ErrorType.name);
    });
  });

  it('should support error filtering and categorization', () => {
    const errors: DomainError[] = [
      new ValidationError('Validation 1'),
      new AnalysisError('Analysis 1'),
      new ValidationError('Validation 2'),
      new LanguagePackageError('Package 1'),
      new AnalysisError('Analysis 2'),
    ];

    const validationErrors = errors.filter((e) => e instanceof ValidationError);
    const analysisErrors = errors.filter((e) => e instanceof AnalysisError);
    const packageErrors = errors.filter((e) => e instanceof LanguagePackageError);

    expect(validationErrors).toHaveLength(2);
    expect(analysisErrors).toHaveLength(2);
    expect(packageErrors).toHaveLength(1);
  });

  describe('comprehensive serialization and deserialization', () => {
    it('should handle JSON serialization scenarios', () => {
      const errors = [
        new ValidationError('Validation message'),
        new AnalysisError('Analysis message'),
        new LanguagePackageError('Package message'),
        new PatternRecognitionError('Pattern message'),
        new EducationalFeedbackError('Feedback message'),
        new RepositoryError('Repository message'),
      ];

      errors.forEach((error) => {
        const serialized = JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
            ? {
                name: error.cause.name,
                message: error.cause.message,
              }
            : undefined,
        });

        const parsed = JSON.parse(serialized);
        expect(parsed.name).toBe(error.name);
        expect(parsed.message).toBe(error.message);
        expect(parsed.stack).toBeDefined();
      });
    });

    it('should handle complex error serialization with nested causes', () => {
      const rootError = new Error('Database connection failed');
      const repositoryError = new RepositoryError('Query execution failed', rootError);
      const analysisError = new AnalysisError('Data analysis incomplete', repositoryError);
      const validationError = new ValidationError(
        'Validation skipped due to analysis failure',
        analysisError,
      );

      const serialized = JSON.stringify({
        name: validationError.name,
        message: validationError.message,
        cause: validationError.cause
          ? {
              name: validationError.cause.name,
              message: validationError.cause.message,
              cause: (validationError.cause as any).cause
                ? {
                    name: ((validationError.cause as any).cause as Error).name,
                    message: ((validationError.cause as any).cause as Error).message,
                  }
                : undefined,
            }
          : undefined,
      });

      const parsed = JSON.parse(serialized);
      expect(parsed.name).toBe('ValidationError');
      expect(parsed.cause?.name).toBe('AnalysisError');
      expect(parsed.cause?.cause?.name).toBe('RepositoryError');
    });
  });

  describe('error inheritance and polymorphism', () => {
    it('should support polymorphic error handling', () => {
      const handleDomainError = (error: DomainError): string => {
        switch (error.constructor) {
          case ValidationError:
            return `Validation: ${error.message}`;
          case AnalysisError:
            return `Analysis: ${error.message}`;
          case LanguagePackageError:
            return `Package: ${error.message}`;
          case PatternRecognitionError:
            return `Pattern: ${error.message}`;
          case EducationalFeedbackError:
            return `Feedback: ${error.message}`;
          case RepositoryError:
            return `Repository: ${error.message}`;
          default:
            return `Unknown: ${error.message}`;
        }
      };

      const errors: DomainError[] = [
        new ValidationError('validation failed'),
        new AnalysisError('analysis failed'),
        new LanguagePackageError('package failed'),
        new PatternRecognitionError('pattern failed'),
        new EducationalFeedbackError('feedback failed'),
        new RepositoryError('repository failed'),
      ];

      const results = errors.map(handleDomainError);
      expect(results).toEqual([
        'Validation: validation failed',
        'Analysis: analysis failed',
        'Package: package failed',
        'Pattern: pattern failed',
        'Feedback: feedback failed',
        'Repository: repository failed',
      ]);
    });

    it('should support error filtering by type', () => {
      const errors: DomainError[] = [
        new ValidationError('v1'),
        new AnalysisError('a1'),
        new ValidationError('v2'),
        new LanguagePackageError('p1'),
        new ValidationError('v3'),
        new AnalysisError('a2'),
      ];

      const validationErrors = errors.filter(
        (e): e is ValidationError => e instanceof ValidationError,
      );
      const analysisErrors = errors.filter((e): e is AnalysisError => e instanceof AnalysisError);
      const packageErrors = errors.filter(
        (e): e is LanguagePackageError => e instanceof LanguagePackageError,
      );

      expect(validationErrors).toHaveLength(3);
      expect(analysisErrors).toHaveLength(2);
      expect(packageErrors).toHaveLength(1);

      expect(validationErrors.every((e) => e instanceof ValidationError)).toBe(true);
      expect(analysisErrors.every((e) => e instanceof AnalysisError)).toBe(true);
      expect(packageErrors.every((e) => e instanceof LanguagePackageError)).toBe(true);
    });
  });

  describe('memory and performance optimization', () => {
    it('should handle large-scale error creation efficiently', () => {
      const startTime = performance.now();
      const errors: DomainError[] = [];

      for (let i = 0; i < 10000; i++) {
        errors.push(
          new ValidationError(`Validation error ${i}`),
          new AnalysisError(`Analysis error ${i}`),
          new LanguagePackageError(`Package error ${i}`),
          new PatternRecognitionError(`Pattern error ${i}`),
          new EducationalFeedbackError(`Feedback error ${i}`),
          new RepositoryError(`Repository error ${i}`),
        );
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(errors).toHaveLength(60000);

      // Verify random samples
      expect(errors[0]).toBeInstanceOf(ValidationError);
      expect(errors[1]).toBeInstanceOf(AnalysisError);
      expect(errors[59999]).toBeInstanceOf(RepositoryError);
    });

    it('should handle deep error chain traversal without stack overflow', () => {
      let error: DomainError = new ValidationError('Root error');

      // Create deep chain of 1000 errors
      for (let i = 0; i < 1000; i++) {
        const errorTypes = [
          AnalysisError,
          LanguagePackageError,
          PatternRecognitionError,
          EducationalFeedbackError,
          RepositoryError,
        ];
        const errorType = errorTypes[i % 5];
        if (!errorType) {
          throw new Error('Error type should never be undefined');
        }
        error = new errorType(`Level ${i}`, error);
      }

      // Traverse the entire chain
      let depth = 0;
      let current: any = error;
      while (current?.cause) {
        current = current.cause;
        depth++;
      }

      expect(depth).toBe(1000);
      expect(current.message).toBe('Root error');
    });

    it('should efficiently handle error chain inspection', () => {
      const createErrorChain = (depth: number): DomainError => {
        let error: DomainError = new ValidationError('Root');
        for (let i = 0; i < depth; i++) {
          error = new AnalysisError(`Level ${i}`, error);
        }
        return error;
      };

      const findRootCause = (error: DomainError): Error => {
        let current: any = error;
        while (current.cause) {
          current = current.cause;
        }
        return current;
      };

      const deepChain = createErrorChain(500);
      const startTime = performance.now();
      const rootCause = findRootCause(deepChain);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
      expect(rootCause.message).toBe('Root');
    });
  });

  describe('advanced error context scenarios', () => {
    it('should handle concurrent error creation', async () => {
      const createErrorAsync = async (id: number): Promise<DomainError> => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(new ValidationError(`Async error ${id}`));
          }, Math.random() * 10);
        });
      };

      const promises = Array.from({ length: 100 }, (_, i) => createErrorAsync(i));
      const errors = await Promise.all(promises);

      expect(errors).toHaveLength(100);
      errors.forEach((error, index) => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe(`Async error ${index}`);
      });
    });

    it('should handle error message mutation scenarios', () => {
      const error = new ValidationError('Original message');
      const _originalMessage = error.message;
      const _originalName = error.name;

      // JavaScript Error objects allow mutation, this is expected behavior
      // The test verifies the initial state and mutation capability
      expect(error.message).toBe('Original message');
      expect(error.name).toBe('ValidationError');

      // After mutation, properties should reflect changes (this is standard JS Error behavior)
      (error as any).message = 'Mutated message';
      (error as any).name = 'MutatedError';

      // Verify mutation occurred (this is how JS Error objects work)
      expect(error.message).toBe('Mutated message');
      expect(error.name).toBe('MutatedError');
      expect(typeof error.message).toBe('string');
      expect(typeof error.name).toBe('string');
    });

    it('should handle error in error scenarios', () => {
      const createProblematicError = (): DomainError => {
        const originalError = new Error('Original problem');
        try {
          throw new Error('Nested problem');
        } catch (_nestedError) {
          return new ValidationError('Validation failed during error handling', originalError);
        }
      };

      const error = createProblematicError();
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause?.message).toBe('Original problem');
    });
  });

  describe('domain-specific error patterns', () => {
    it('should support multi-step validation error chains', () => {
      const validateStep1 = (input: string): void => {
        if (!input) throw new ValidationError('Step 1: Input required');
      };

      const validateStep2 = (input: string): void => {
        try {
          validateStep1(input);
        } catch (error) {
          throw new ValidationError('Step 2: Validation chain failed', error as Error);
        }
        if (input.length < 5) throw new ValidationError('Step 2: Input too short');
      };

      const validateStep3 = (input: string): void => {
        try {
          validateStep2(input);
        } catch (error) {
          throw new ValidationError('Step 3: Final validation failed', error as Error);
        }
      };

      expect(() => validateStep3('')).toThrow(ValidationError);
      expect(() => validateStep3('abc')).toThrow(ValidationError);
      expect(() => validateStep3('valid input')).not.toThrow();

      try {
        validateStep3('');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Step 3');
        expect((error as ValidationError).cause).toBeInstanceOf(ValidationError);
        expect(((error as ValidationError).cause as ValidationError).message).toContain('Step 2');
      }
    });

    it('should support analysis pipeline error propagation', () => {
      const analysisSteps = [
        (data: any) => {
          if (!data?.content) throw new AnalysisError('Content analysis failed: missing content');
          return { ...data, contentAnalyzed: true };
        },
        (data: any) => {
          if (!data.contentAnalyzed)
            throw new AnalysisError('Semantic analysis failed: content not analyzed');
          return { ...data, semanticAnalyzed: true };
        },
        (data: any) => {
          if (!data.semanticAnalyzed)
            throw new AnalysisError('Final analysis failed: semantic analysis incomplete');
          return { ...data, complete: true };
        },
      ];

      const runAnalysis = (data: any): any => {
        let result = data;
        for (let index = 0; index < analysisSteps.length; index++) {
          const step = analysisSteps[index];
          if (!step) {
            throw new Error('Analysis step should not be undefined');
          }
          try {
            result = step(result);
          } catch (error) {
            throw new AnalysisError(
              `Analysis pipeline failed at step ${index + 1}`,
              error as Error,
            );
          }
        }
        return result;
      };

      expect(() => runAnalysis({})).toThrow(AnalysisError);
      expect(() => runAnalysis({ content: 'test' })).not.toThrow();

      const result = runAnalysis({ content: 'test' });
      expect(result.complete).toBe(true);
    });
  });
});

describe('Cross-Context Error Handling Patterns', () => {
  describe('bounded context integrity', () => {
    it('should maintain error boundaries across domain contexts', () => {
      // Language Intelligence context errors
      const langIntelErrors = [
        new ValidationError('Syntax validation failed'),
        new AnalysisError('Semantic analysis failed'),
        new PatternRecognitionError('Pattern not recognized'),
        new EducationalFeedbackError('Feedback unavailable'),
      ];

      // Repository/Infrastructure context errors
      const infraErrors = [new RepositoryError('Database connection failed')];

      // Package Ecosystem context errors
      const packageErrors = [new LanguagePackageError('Package dependency missing')];

      langIntelErrors.forEach((error) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error.name).toMatch(
          /ValidationError|AnalysisError|PatternRecognitionError|EducationalFeedbackError/,
        );
      });

      infraErrors.forEach((error) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error.name).toBe('RepositoryError');
      });

      packageErrors.forEach((error) => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error.name).toBe('LanguagePackageError');
      });
    });

    it('should support error composition across service boundaries', () => {
      const _validationError = new ValidationError('Field validation failed');
      const analysisError = new AnalysisError('Analysis timeout');
      const _packageError = new LanguagePackageError('Package load failed');

      // Test chained error context preservation
      const chainedError = new RepositoryError('Repository operation failed', analysisError);

      expect(chainedError.message).toContain('Repository operation failed');
      expect(chainedError.cause).toBe(analysisError);
      expect(chainedError.cause?.message).toContain('Analysis timeout');
    });

    it('should handle error categorization by domain context', () => {
      const errors = [
        new ValidationError('Input validation failed'),
        new AnalysisError('Semantic analysis failed'),
        new LanguagePackageError('Package loading failed'),
        new PatternRecognitionError('Pattern matching failed'),
        new EducationalFeedbackError('Feedback generation failed'),
        new RepositoryError('Data persistence failed'),
      ];

      // Categorize by context type
      const validationErrors = errors.filter((e) => e instanceof ValidationError);
      const analysisErrors = errors.filter((e) => e instanceof AnalysisError);
      const packageErrors = errors.filter((e) => e instanceof LanguagePackageError);
      const patternErrors = errors.filter((e) => e instanceof PatternRecognitionError);
      const feedbackErrors = errors.filter((e) => e instanceof EducationalFeedbackError);
      const repositoryErrors = errors.filter((e) => e instanceof RepositoryError);

      expect(validationErrors).toHaveLength(1);
      expect(analysisErrors).toHaveLength(1);
      expect(packageErrors).toHaveLength(1);
      expect(patternErrors).toHaveLength(1);
      expect(feedbackErrors).toHaveLength(1);
      expect(repositoryErrors).toHaveLength(1);

      // All should be categorizable as domain errors
      const domainErrors = errors.filter((e) => e instanceof DomainError);
      expect(domainErrors).toHaveLength(6);
    });
  });

  describe('domain-specific error patterns', () => {
    it('should handle validation-specific error patterns', () => {
      const validationMessages = [
        'Field validation failed: statement is required',
        'Type validation failed: expected string, got number',
        'Length validation failed: max 1000 characters',
        'Schema validation failed: missing premise and invalid conclusion',
      ];

      validationMessages.forEach((message) => {
        const error = new ValidationError(message);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.name).toBe('ValidationError');
      });
    });

    it('should handle analysis-specific error patterns', () => {
      const analysisMessages = [
        'Semantic analysis failed: parsing error in malformed statement',
        'Inference engine timeout: high complexity analysis exceeded 30s',
        'Logic validator failed: modus ponens rule violation',
        'Statement processor failed: batch processing errors at indices 1, 15, 67',
      ];

      analysisMessages.forEach((message) => {
        const error = new AnalysisError(message);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(AnalysisError);
        expect(error.name).toBe('AnalysisError');
      });
    });

    it('should handle language package-specific error patterns', () => {
      const packageMessages = [
        'Package load failed: logic-rules-v1@1.2.0 from registry',
        'Package dependency missing: semantic-validators requires 2.0.0',
        'Package integrity check failed: proof-templates checksum mismatch',
        'Package manifest invalid: missing version and invalid dependencies',
      ];

      packageMessages.forEach((message) => {
        const error = new LanguagePackageError(message);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(LanguagePackageError);
        expect(error.name).toBe('LanguagePackageError');
      });
    });

    it('should handle pattern recognition-specific error patterns', () => {
      const patternMessages = [
        'Pattern recognition failed: modus ponens pattern not found in argument structure',
        'Pattern matcher timeout: algorithm exceeded 5000ms processing syllogism patterns',
        'Recognition engine memory exhausted: processed 1000 patterns',
        'Pattern library incompatible: version 1.0 not supported',
      ];

      patternMessages.forEach((message) => {
        const error = new PatternRecognitionError(message);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(PatternRecognitionError);
        expect(error.name).toBe('PatternRecognitionError');
      });
    });

    it('should handle educational feedback-specific error patterns', () => {
      const feedbackMessages = [
        'Feedback generation failed: user-123 beginner exercise proof-exercise-1',
        'LLM service unavailable: gpt-4 token limit exceeded (4096 tokens)',
        'Feedback template error: variables missing for feedback-template-v2',
        'Learning session limit reached: learning-session-456 exceeded hint limit',
      ];

      feedbackMessages.forEach((message) => {
        const error = new EducationalFeedbackError(message);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(EducationalFeedbackError);
        expect(error.name).toBe('EducationalFeedbackError');
      });
    });

    it('should handle repository-specific error patterns', () => {
      const repositoryMessages = [
        'Repository save failed: Statement stmt-123 violates unique constraint',
        'Repository find timeout: argument query exceeded 10000ms',
        'Repository delete failed: cascade operation affected stmt-1, stmt-2 in tx-456',
        'Repository connection failed: database pool exhausted (100/100 active)',
      ];

      repositoryMessages.forEach((message) => {
        const error = new RepositoryError(message);
        expect(error.message).toBe(message);
        expect(error).toBeInstanceOf(RepositoryError);
        expect(error.name).toBe('RepositoryError');
      });
    });
  });

  describe('error propagation across service boundaries', () => {
    it('should maintain error propagation patterns', () => {
      // Simulate service-to-service error propagation
      const serviceChain = [
        { service: 'ValidationService', error: new ValidationError('Schema validation failed') },
        { service: 'AnalysisService', error: new AnalysisError('Analysis engine failure') },
        { service: 'PackageService', error: new LanguagePackageError('Package resolution failed') },
        { service: 'RepositoryService', error: new RepositoryError('Persistence layer failure') },
      ];

      // Each service can handle errors from previous services
      const aggregatedContext: { services: Array<{ name: string; error: string; type: string }> } =
        { services: [] };

      serviceChain.forEach(({ service, error }) => {
        aggregatedContext.services.push({
          name: service,
          error: error.message,
          type: error.constructor.name,
        });

        // Each error maintains its domain-specific context
        expect(error).toBeInstanceOf(DomainError);
        expect(error.name).toBeTruthy();
        expect(error.message).toBeTruthy();
      });

      expect(aggregatedContext.services).toHaveLength(4);
      expect(aggregatedContext.services[0]?.name).toBe('ValidationService');
      expect(aggregatedContext.services[3]?.name).toBe('RepositoryService');
    });

    it('should support error correlation across request lifecycle', () => {
      const requestId = 'req-12345';

      // Errors occurring throughout request lifecycle
      const lifecycleErrors = [
        new ValidationError(`Request validation failed [${requestId}] at input stage`),
        new AnalysisError(`Processing failed [${requestId}] at analysis stage`),
        new RepositoryError(`Storage failed [${requestId}] at persistence stage`),
      ];

      lifecycleErrors.forEach((error, index) => {
        expect(error.message).toContain(requestId);
        expect(error).toBeInstanceOf(DomainError);

        const stages = ['input', 'analysis', 'persistence'];
        expect(error.message).toContain(stages[index]);
      });
    });
  });

  describe('advanced error handling scenarios', () => {
    it('should handle concurrent error aggregation', () => {
      // Simulate concurrent operations with multiple failures
      const concurrentErrors = [
        new ValidationError('Input 1 validation failed on worker-1'),
        new ValidationError('Input 2 validation failed on worker-2'),
        new AnalysisError('Analysis timeout for input 3 on worker-3'),
        new PatternRecognitionError('Pattern not found for input 4 on worker-4'),
      ];

      // Aggregate errors by type
      const errorsByType = concurrentErrors.reduce(
        (acc, error) => {
          const type = error.constructor.name;
          if (!acc[type]) acc[type] = [];
          acc[type].push(error);
          return acc;
        },
        {} as Record<string, DomainError[]>,
      );

      expect(errorsByType.ValidationError).toHaveLength(2);
      expect(errorsByType.AnalysisError).toHaveLength(1);
      expect(errorsByType.PatternRecognitionError).toHaveLength(1);

      // Each error should maintain its contextual information in the message
      errorsByType.ValidationError?.forEach((error, index) => {
        expect(error.message).toContain(`Input ${index + 1}`);
        expect(error.message).toContain(`worker-${index + 1}`);
      });
    });

    it('should handle error transformation across abstraction layers', () => {
      // Low-level infrastructure error
      const infraError = new Error('Database connection timeout');

      // Domain layer transforms infrastructure error
      const repositoryError = new RepositoryError(
        'Data access failed: findById operation on Statement entity',
        infraError,
      );

      // Application layer transforms domain error
      const validationError = new ValidationError(
        'Statement validation failed for stmt-123',
        repositoryError,
      );

      // Each layer adds its own context while preserving previous context through error chaining
      expect(validationError.message).toContain('stmt-123');
      expect(validationError.cause).toBe(repositoryError);
      expect(repositoryError.message).toContain('findById');
      expect(repositoryError.message).toContain('Statement');
      expect(repositoryError.cause).toBe(infraError);
    });

    it('should handle error recovery and retry patterns', () => {
      // Simulate retry scenario with different error types
      const retryAttempts = [
        {
          attempt: 1,
          error: new RepositoryError('Transient connection error (retryable)'),
        },
        { attempt: 2, error: new AnalysisError('Temporary analysis failure (retryable)') },
        {
          attempt: 3,
          error: new ValidationError('Permanent validation error (non-retryable)'),
        },
      ];

      const retryableErrors = retryAttempts.filter(
        (attempt) =>
          attempt.error.message.includes('retryable') &&
          !attempt.error.message.includes('non-retryable'),
      );
      const permanentErrors = retryAttempts.filter((attempt) =>
        attempt.error.message.includes('non-retryable'),
      );

      expect(retryableErrors).toHaveLength(2);
      expect(permanentErrors).toHaveLength(1);

      // Retryable errors should indicate retry capability in message
      retryableErrors.forEach(({ attempt, error }) => {
        expect(error.message).toContain('retryable');
        expect(attempt).toBeLessThan(3);
      });

      // Permanent errors should stop retry cycle
      permanentErrors.forEach(({ error }) => {
        expect(error.message).toContain('non-retryable');
        expect(error).toBeInstanceOf(ValidationError);
      });
    });
  });
});
