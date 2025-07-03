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
      expect(topError.cause?.cause).toBe(rootError);
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
    expect(finalError.cause?.cause).toBe(dataError);
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
    expect(validationError.cause?.cause).toBeInstanceOf(RepositoryError);
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

    // Should complete reasonably quickly (less than 100ms)
    expect(endTime - startTime).toBeLessThan(100);
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
});
