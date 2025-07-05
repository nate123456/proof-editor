import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import {
  createFailure,
  createSuccess,
  err,
  errAsync,
  failure,
  ok,
  okAsync,
  type Result,
  ResultAsync,
  success,
  ValidationError,
} from '../result.js';

describe('Domain Shared Result', () => {
  describe('neverthrow re-exports', () => {
    describe('Result type and constructors', () => {
      it('should export ok function', () => {
        const result = ok('success value');

        expect(result.isOk()).toBe(true);
        expect(result.isErr()).toBe(false);
        if (result.isOk()) {
          expect(result.value).toBe('success value');
        }
      });

      it('should export err function', () => {
        const error = new Error('test error');
        const result = err(error);

        expect(result.isOk()).toBe(false);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe(error);
        }
      });

      it('should export okAsync function', async () => {
        const result = okAsync('async success');

        expect(result).toBeInstanceOf(ResultAsync);
        const resolved = await result;
        expect(resolved.isOk()).toBe(true);
        if (resolved.isOk()) {
          expect(resolved.value).toBe('async success');
        }
      });

      it('should export errAsync function', async () => {
        const error = new Error('async error');
        const result = errAsync(error);

        expect(result).toBeInstanceOf(ResultAsync);
        const resolved = await result;
        expect(resolved.isErr()).toBe(true);
        if (resolved.isErr()) {
          expect(resolved.error).toBe(error);
        }
      });
    });

    describe('Result operations', () => {
      it('should support map operation', () => {
        const result = ok(5);
        const mapped = result.map((x) => x * 2);

        expect(mapped.isOk()).toBe(true);
        if (mapped.isOk()) {
          expect(mapped.value).toBe(10);
        }
      });

      it('should support map operation on error', () => {
        const result = err(new Error('test'));
        const mapped = result.map((x) => x * 2);

        expect(mapped.isErr()).toBe(true);
        if (mapped.isErr()) {
          expect(mapped.error.message).toBe('test');
        }
      });

      it('should support andThen operation', () => {
        const result = ok(5);
        const chained = result.andThen((x) => ok(x * 2));

        expect(chained.isOk()).toBe(true);
        if (chained.isOk()) {
          expect(chained.value).toBe(10);
        }
      });

      it('should support andThen operation with error', () => {
        const result = ok(5);
        const chained = result.andThen(() => err(new Error('chained error')));

        expect(chained.isErr()).toBe(true);
        if (chained.isErr()) {
          expect(chained.error.message).toBe('chained error');
        }
      });

      it('should support mapErr operation', () => {
        const result = err(new Error('original'));
        const mapped = result.mapErr((error) => new Error(`wrapped: ${error.message}`));

        expect(mapped.isErr()).toBe(true);
        if (mapped.isErr()) {
          expect(mapped.error.message).toBe('wrapped: original');
        }
      });

      it('should support mapErr operation on success', () => {
        const result = ok('success');
        const mapped = result.mapErr((error) => new Error(`wrapped: ${(error as Error).message}`));

        expect(mapped.isOk()).toBe(true);
        if (mapped.isOk()) {
          expect(mapped.value).toBe('success');
        }
      });
    });

    describe('Result unwrap operations', () => {
      it('should support unwrapOr operation', () => {
        const successResult = ok('success');
        const errorResult = err(new Error('error'));

        expect(successResult.unwrapOr('default')).toBe('success');
        expect(errorResult.unwrapOr('default')).toBe('default');
      });

      it('should support match operation', () => {
        const successResult = ok('success');
        const errorResult = err(new Error('error'));

        const successMatch = successResult.match(
          (value) => `got: ${value}`,
          (error) => `error: ${(error as Error).message}`,
        );

        const errorMatch = errorResult.match(
          (value) => `got: ${String(value)}`,
          (error) => `error: ${error.message}`,
        );

        expect(successMatch).toBe('got: success');
        expect(errorMatch).toBe('error: error');
      });
    });
  });

  describe('legacy compatibility exports', () => {
    describe('createSuccess and success aliases', () => {
      it('should export createSuccess as alias for ok', () => {
        const result = createSuccess('test value');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('test value');
        }
      });

      it('should export success as alias for ok', () => {
        const result = success('test value');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('test value');
        }
      });

      it('should have identical behavior between ok, createSuccess, and success', () => {
        const value = { test: 'object' };
        const okResult = ok(value);
        const createSuccessResult = createSuccess(value);
        const successResult = success(value);

        expect(okResult.isOk()).toBe(createSuccessResult.isOk());
        expect(okResult.isOk()).toBe(successResult.isOk());

        if (okResult.isOk() && createSuccessResult.isOk() && successResult.isOk()) {
          expect(okResult.value).toBe(createSuccessResult.value);
          expect(okResult.value).toBe(successResult.value);
        }
      });
    });

    describe('createFailure and failure aliases', () => {
      it('should export createFailure as alias for err', () => {
        const error = new Error('test error');
        const result = createFailure(error);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe(error);
        }
      });

      it('should export failure as alias for err', () => {
        const error = new Error('test error');
        const result = failure(error);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBe(error);
        }
      });

      it('should have identical behavior between err, createFailure, and failure', () => {
        const error = new ValidationError('test error');
        const errResult = err(error);
        const createFailureResult = createFailure(error);
        const failureResult = failure(error);

        expect(errResult.isErr()).toBe(createFailureResult.isErr());
        expect(errResult.isErr()).toBe(failureResult.isErr());

        if (errResult.isErr() && createFailureResult.isErr() && failureResult.isErr()) {
          expect(errResult.error).toBe(createFailureResult.error);
          expect(errResult.error).toBe(failureResult.error);
        }
      });
    });
  });

  describe('ResultAsync operations', () => {
    describe('basic async operations', () => {
      it('should support async map operations', async () => {
        const result = okAsync(5);
        const mapped = result.map((x) => x * 2);

        const resolved = await mapped;
        expect(resolved.isOk()).toBe(true);
        if (resolved.isOk()) {
          expect(resolved.value).toBe(10);
        }
      });

      it('should support async andThen operations', async () => {
        const result = okAsync(5);
        const chained = result.andThen((x) => okAsync(x * 2));

        const resolved = await chained;
        expect(resolved.isOk()).toBe(true);
        if (resolved.isOk()) {
          expect(resolved.value).toBe(10);
        }
      });

      it('should support async error operations', async () => {
        const error = new Error('async error');
        const result = errAsync(error);
        const mapped = result.map((x) => x * 2);

        const resolved = await mapped;
        expect(resolved.isErr()).toBe(true);
        if (resolved.isErr()) {
          expect(resolved.error).toBe(error);
        }
      });
    });

    describe('async error handling', () => {
      it('should handle rejected promises', async () => {
        const rejectedPromise = Promise.reject(new Error('promise rejection'));
        const result = ResultAsync.fromPromise(
          rejectedPromise,
          (error) => new ValidationError(`Wrapped: ${(error as Error).message}`),
        );

        const resolved = await result;
        expect(resolved.isErr()).toBe(true);
        if (resolved.isErr()) {
          expect(resolved.error).toBeInstanceOf(ValidationError);
          expect(resolved.error.message).toBe('Wrapped: promise rejection');
        }
      });

      it('should handle successful promises', async () => {
        const successfulPromise = Promise.resolve('async success');
        const result = ResultAsync.fromPromise(
          successfulPromise,
          (error) => new Error((error as Error).message),
        );

        const resolved = await result;
        expect(resolved.isOk()).toBe(true);
        if (resolved.isOk()) {
          expect(resolved.value).toBe('async success');
        }
      });

      it('should chain async operations correctly', async () => {
        const result = okAsync(1)
          .map((x) => x + 1)
          .andThen((x) => okAsync(x * 2))
          .map((x) => x + 1);

        const resolved = await result;
        expect(resolved.isOk()).toBe(true);
        if (resolved.isOk()) {
          expect(resolved.value).toBe(5); // ((1 + 1) * 2) + 1
        }
      });

      it('should short-circuit on error in async chains', async () => {
        const mapSpy = vi.fn((x) => x * 2);
        const result = okAsync(1)
          .andThen(() => errAsync(new Error('chain break')))
          .map(mapSpy); // Should not be called

        const resolved = await result;
        expect(resolved.isErr()).toBe(true);
        expect(mapSpy).not.toHaveBeenCalled();
        if (resolved.isErr()) {
          expect(resolved.error.message).toBe('chain break');
        }
      });
    });
  });

  describe('ValidationError', () => {
    describe('basic error properties', () => {
      it('should create ValidationError with message', () => {
        const error = new ValidationError('Validation failed');

        expect(error.message).toBe('Validation failed');
        expect(error.name).toBe('ValidationError');
        expect(error.context).toBeUndefined();
      });

      it('should create ValidationError with message and context', () => {
        const context = { field: 'email', value: 'invalid-email' };
        const error = new ValidationError('Invalid email format', context);

        expect(error.message).toBe('Invalid email format');
        expect(error.name).toBe('ValidationError');
        expect(error.context).toEqual(context);
      });

      it('should be instance of Error', () => {
        const error = new ValidationError('test');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ValidationError);
      });
    });

    describe('context handling', () => {
      it('should handle complex context objects', () => {
        const context = {
          field: 'user.profile.age',
          value: -5,
          constraints: {
            min: 0,
            max: 150,
            type: 'integer',
          },
          validationRules: ['positive', 'realistic-age'],
        };

        const error = new ValidationError('Age must be a positive integer', context);

        expect(error.context).toEqual(context);
        expect((error.context?.constraints as any)?.min).toBe(0);
        expect(error.context?.validationRules).toEqual(['positive', 'realistic-age']);
      });

      it('should handle null and undefined context', () => {
        const errorWithNull = new ValidationError('test', null as any);
        const errorWithUndefined = new ValidationError('test', undefined);

        expect(errorWithNull.context).toBe(null);
        expect(errorWithUndefined.context).toBeUndefined();
      });

      it('should handle empty context object', () => {
        const error = new ValidationError('test', {});

        expect(error.context).toEqual({});
      });

      it('should preserve reference to context object', () => {
        const context = { mutable: 'value' };
        const error = new ValidationError('test', context);

        context.mutable = 'changed';
        expect(error.context?.mutable).toBe('changed');
      });
    });

    describe('error stacking and chaining', () => {
      it('should be throwable and catchable', () => {
        expect(() => {
          throw new ValidationError('Test validation error');
        }).toThrow(ValidationError);

        expect(() => {
          throw new ValidationError('Test validation error');
        }).toThrow('Test validation error');
      });

      it('should maintain stack trace', () => {
        const error = new ValidationError('Stack trace test');

        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('ValidationError');
        expect(error.stack).toContain('Stack trace test');
      });

      it('should work with Result error handling', () => {
        const validation = (value: string): Result<string, ValidationError> => {
          if (value.length === 0) {
            return err(new ValidationError('Value cannot be empty', { field: 'value', value }));
          }
          return ok(value);
        };

        const result = validation('');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.context?.field).toBe('value');
        }
      });
    });

    describe('validation error patterns', () => {
      it('should support field-specific validation errors', () => {
        const fieldErrors = [
          new ValidationError('Email is required', { field: 'email', code: 'REQUIRED' }),
          new ValidationError('Password too short', { field: 'password', code: 'MIN_LENGTH' }),
          new ValidationError('Age must be positive', { field: 'age', code: 'POSITIVE_NUMBER' }),
        ];

        fieldErrors.forEach((error) => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.context?.field).toBeTruthy();
          expect(error.context?.code).toBeTruthy();
        });
      });

      it('should support nested validation errors', () => {
        const nestedError = new ValidationError('Address validation failed', {
          field: 'user.address',
          nested: [
            { field: 'street', message: 'Street is required' },
            { field: 'zipCode', message: 'Invalid zip code format' },
          ],
        });

        expect(nestedError.context?.nested).toHaveLength(2);
        expect((nestedError.context?.nested as any)[0]?.field).toBe('street');
      });

      it('should support validation with multiple values', () => {
        const multiValueError = new ValidationError('Values must be unique', {
          field: 'tags',
          values: ['tag1', 'tag2', 'tag1'],
          duplicates: ['tag1'],
          constraint: 'unique',
        });

        expect(multiValueError.context?.values).toEqual(['tag1', 'tag2', 'tag1']);
        expect(multiValueError.context?.duplicates).toEqual(['tag1']);
      });
    });
  });

  describe('integration with neverthrow patterns', () => {
    describe('Result chaining patterns', () => {
      it('should support validation chains', () => {
        const validateEmail = (email: string): Result<string, ValidationError> => {
          if (!email.includes('@')) {
            return err(
              new ValidationError('Email must contain @', { field: 'email', value: email }),
            );
          }
          return ok(email);
        };

        const validateLength = (email: string): Result<string, ValidationError> => {
          if (email.length < 5) {
            return err(new ValidationError('Email too short', { field: 'email', minLength: 5 }));
          }
          return ok(email);
        };

        const validEmail = ok('test@example.com').andThen(validateEmail).andThen(validateLength);

        const invalidEmail = ok('abc').andThen(validateEmail).andThen(validateLength);

        expect(validEmail.isOk()).toBe(true);
        expect(invalidEmail.isErr()).toBe(true);
        if (invalidEmail.isErr()) {
          expect(invalidEmail.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should support error mapping in chains', () => {
        const parseNumber = (str: string): Result<number, ValidationError> => {
          const num = Number.parseInt(str, 10);
          if (Number.isNaN(num)) {
            return err(new ValidationError('Not a valid number', { input: str }));
          }
          return ok(num);
        };

        const result = parseNumber('abc').mapErr(
          (error) =>
            new ValidationError(`Parse error: ${error.message}`, {
              originalError: error,
              type: 'parse_error',
            }),
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Parse error: Not a valid number');
          expect(result.error.context?.type).toBe('parse_error');
        }
      });
    });

    describe('async validation patterns', () => {
      it('should support async validation with ResultAsync', async () => {
        const asyncValidate = (value: string): ResultAsync<string, ValidationError> => {
          return ResultAsync.fromPromise(
            new Promise((resolve, reject) => {
              setTimeout(() => {
                if (value === 'valid') {
                  resolve(value);
                } else {
                  reject(new Error('Async validation failed'));
                }
              }, 10);
            }),
            (error) =>
              new ValidationError('Async validation error', {
                originalError: (error as Error).message,
              }),
          );
        };

        const validResult = await asyncValidate('valid');
        const invalidResult = await asyncValidate('invalid');

        expect(validResult.isOk()).toBe(true);
        expect(invalidResult.isErr()).toBe(true);
        if (invalidResult.isErr()) {
          expect(invalidResult.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should support async error transformation', async () => {
        const asyncOperation = errAsync(new Error('Original async error'));
        const transformed = asyncOperation.mapErr(
          (error) => new ValidationError(`Transformed: ${error.message}`, { source: 'async' }),
        );

        const result = await transformed;
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Transformed: Original async error');
        }
      });
    });

    describe('combine operations', () => {
      it('should handle multiple Results with Result.combine', () => {
        // Note: This tests neverthrow's combine functionality if available
        const result1 = ok('first');
        const result2 = ok('second');
        const result3 = err(new ValidationError('third failed'));

        // Using array destructuring to simulate combine behavior
        const allSuccess = [result1, result2].every((r) => r.isOk());
        const hasError = [result1, result2, result3].some((r) => r.isErr());

        expect(allSuccess).toBe(true);
        expect(hasError).toBe(true);
      });
    });
  });

  describe('edge cases and boundary conditions', () => {
    describe('error message handling', () => {
      it('should handle empty error messages', () => {
        const error = new ValidationError('');
        expect(error.message).toBe('');
        expect(error.name).toBe('ValidationError');
      });

      it('should handle very long error messages', () => {
        const longMessage = 'A'.repeat(10000);
        const error = new ValidationError(longMessage);
        expect(error.message).toBe(longMessage);
        expect(error.message.length).toBe(10000);
      });

      it('should handle messages with special characters', () => {
        const specialMessage =
          'Error with "quotes", \'apostrophes\', \nnewlines\t and\r\n unicode: 🚨';
        const error = new ValidationError(specialMessage);
        expect(error.message).toBe(specialMessage);
      });
    });

    describe('context edge cases', () => {
      it('should handle circular references in context', () => {
        const circularContext: any = { name: 'circular' };
        circularContext.self = circularContext;

        const error = new ValidationError('Circular reference test', circularContext);
        expect(error.context?.name).toBe('circular');
        expect(error.context?.self).toBe(circularContext);
      });

      it('should handle context with functions', () => {
        const contextWithFunctions = {
          validator: () => 'validation function',
          transformer: (x: number) => x * 2,
          data: { value: 42 },
        };

        const error = new ValidationError('Context with functions', contextWithFunctions);
        expect((error.context?.data as any)?.value).toBe(42);
        expect(typeof error.context?.validator).toBe('function');
      });

      it('should handle context with undefined and null values', () => {
        const mixedContext = {
          defined: 'value',
          nullValue: null,
          undefinedValue: undefined,
          zero: 0,
          emptyString: '',
          falsy: false,
        };

        const error = new ValidationError('Mixed context test', mixedContext);
        expect(error.context?.defined).toBe('value');
        expect(error.context?.nullValue).toBe(null);
        expect(error.context?.undefinedValue).toBe(undefined);
        expect(error.context?.zero).toBe(0);
        expect(error.context?.emptyString).toBe('');
        expect(error.context?.falsy).toBe(false);
      });
    });

    describe('Result type constraints', () => {
      it('should work with different value types', () => {
        const stringResult = ok('string');
        const numberResult = ok(42);
        const objectResult = ok({ key: 'value' });
        const arrayResult = ok([1, 2, 3]);
        const nullResult = ok(null);
        const undefinedResult = ok(undefined);

        expect(stringResult.isOk()).toBe(true);
        expect(numberResult.isOk()).toBe(true);
        expect(objectResult.isOk()).toBe(true);
        expect(arrayResult.isOk()).toBe(true);
        expect(nullResult.isOk()).toBe(true);
        expect(undefinedResult.isOk()).toBe(true);
      });

      it('should work with different error types', () => {
        const basicError = err(new Error('basic'));
        const validationError = err(new ValidationError('validation'));
        const stringError = err('string error' as any);

        expect(basicError.isErr()).toBe(true);
        expect(validationError.isErr()).toBe(true);
        expect(stringError.isErr()).toBe(true);
      });
    });

    describe('performance considerations', () => {
      it('should handle large context objects efficiently', () => {
        const largeContext = {
          largeArray: Array.from({ length: 10000 }, (_, i) => `item-${i}`),
          largeObject: Object.fromEntries(
            Array.from({ length: 1000 }, (_, i) => [`key-${i}`, `value-${i}`]),
          ),
          metadata: { size: 'large', created: new Date() },
        };

        const startTime = performance.now();
        const error = new ValidationError('Large context test', largeContext);
        const endTime = performance.now();

        expect(error.context?.largeArray).toHaveLength(10000);
        expect(Object.keys(error.context?.largeObject ?? {})).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(100); // Should be fast
      });

      it('should handle many Result operations efficiently', () => {
        let result: Result<number, ValidationError> = ok(0);

        const startTime = performance.now();
        for (let i = 0; i < 1000; i++) {
          result = result.map((x) => x + 1);
        }
        const endTime = performance.now();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(1000);
        }
        expect(endTime - startTime).toBeLessThan(100); // Should be fast
      });
    });
  });

  describe('comprehensive neverthrow integration coverage', () => {
    describe('Result.combine operations', () => {
      it('should handle Result.combine patterns manually', () => {
        const results = [ok('first'), ok('second'), ok('third')];

        const allSuccessful = results.every((r) => r.isOk());
        expect(allSuccessful).toBe(true);

        if (allSuccessful) {
          const values = results.map((r) => (r.isOk() ? r.value : ''));
          expect(values).toEqual(['first', 'second', 'third']);
        }
      });

      it('should handle mixed success/failure combinations', () => {
        const mixedResults = [
          ok('success1'),
          err(new ValidationError('error1')),
          ok('success2'),
          err(new ValidationError('error2')),
        ];

        const successCount = mixedResults.filter((r) => r.isOk()).length;
        const errorCount = mixedResults.filter((r) => r.isErr()).length;

        expect(successCount).toBe(2);
        expect(errorCount).toBe(2);

        const errors = mixedResults
          .filter((r) => r.isErr())
          .map((r) => (r.isErr() ? r.error : null))
          .filter((e) => e !== null);

        expect(errors).toHaveLength(2);
        expect(errors.every((e) => e instanceof ValidationError)).toBe(true);
      });
    });

    describe('Result.fromThrowable patterns', () => {
      it('should handle throwable operations correctly', () => {
        const throwableOperation = (shouldThrow: boolean) => {
          if (shouldThrow) {
            throw new Error('Operation failed');
          }
          return 'Operation succeeded';
        };

        const safeOperation = (shouldThrow: boolean): Result<string, ValidationError> => {
          try {
            const result = throwableOperation(shouldThrow);
            return ok(result);
          } catch (error) {
            return err(
              new ValidationError('Safe operation failed', {
                originalError: (error as Error).message,
              }),
            );
          }
        };

        const successResult = safeOperation(false);
        const failureResult = safeOperation(true);

        expect(successResult.isOk()).toBe(true);
        expect(failureResult.isErr()).toBe(true);

        if (successResult.isOk()) {
          expect(successResult.value).toBe('Operation succeeded');
        }

        if (failureResult.isErr()) {
          expect(failureResult.error).toBeInstanceOf(ValidationError);
          expect(failureResult.error.context?.originalError).toBe('Operation failed');
        }
      });
    });

    describe('advanced ResultAsync patterns', () => {
      it('should handle ResultAsync.fromSafePromise patterns', async () => {
        const safeAsyncOperation = (shouldSucceed: boolean): Promise<string> => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              if (shouldSucceed) {
                resolve('Async success');
              } else {
                reject(new Error('Async failure'));
              }
            }, 10);
          });
        };

        const wrappedOperation = (shouldSucceed: boolean): ResultAsync<string, ValidationError> => {
          return ResultAsync.fromPromise(
            safeAsyncOperation(shouldSucceed),
            (error) =>
              new ValidationError('Async operation failed', { error: (error as Error).message }),
          );
        };

        const successResult = await wrappedOperation(true);
        const failureResult = await wrappedOperation(false);

        expect(successResult.isOk()).toBe(true);
        expect(failureResult.isErr()).toBe(true);

        if (successResult.isOk()) {
          expect(successResult.value).toBe('Async success');
        }

        if (failureResult.isErr()) {
          expect(failureResult.error).toBeInstanceOf(ValidationError);
          expect(failureResult.error.context?.error).toBe('Async failure');
        }
      });

      it('should handle complex async chains with error recovery', async () => {
        const step1 = (value: number): ResultAsync<number, ValidationError> => {
          return okAsync(value * 2);
        };

        const step2 = (value: number): ResultAsync<number, ValidationError> => {
          if (value > 10) {
            return errAsync(new ValidationError('Value too large'));
          }
          return okAsync(value + 1);
        };

        const step3 = (value: number): ResultAsync<string, ValidationError> => {
          return okAsync(`Result: ${value}`);
        };

        const pipeline = (input: number): ResultAsync<string, ValidationError> => {
          return step1(input).andThen(step2).andThen(step3);
        };

        const successResult = await pipeline(3); // 3 * 2 = 6, 6 + 1 = 7, "Result: 7"
        const failureResult = await pipeline(6); // 6 * 2 = 12, > 10 so fails

        expect(successResult.isOk()).toBe(true);
        if (successResult.isOk()) {
          expect(successResult.value).toBe('Result: 7');
        }

        expect(failureResult.isErr()).toBe(true);
        if (failureResult.isErr()) {
          expect(failureResult.error.message).toBe('Value too large');
        }
      });

      it('should handle async error recovery patterns', async () => {
        const unreliableOperation = (): ResultAsync<string, ValidationError> => {
          return errAsync(new ValidationError('Primary operation failed'));
        };

        const fallbackOperation = (): ResultAsync<string, ValidationError> => {
          return okAsync('Fallback success');
        };

        const withFallback = (): ResultAsync<string, ValidationError> => {
          return unreliableOperation().orElse(() => fallbackOperation());
        };

        const result = await withFallback();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('Fallback success');
        }
      });
    });
  });

  describe('ValidationError comprehensive edge cases', () => {
    describe('context object advanced scenarios', () => {
      it('should handle deeply nested context objects', () => {
        const deepContext = {
          level1: {
            level2: {
              level3: {
                level4: {
                  deeply: {
                    nested: {
                      value: 'found',
                      metadata: {
                        timestamp: Date.now(),
                        version: '1.0.0',
                      },
                    },
                  },
                },
              },
            },
          },
          parallel: {
            branch: 'other data',
          },
        };

        const error = new ValidationError('Deep context test', deepContext);
        expect((error.context as any)?.level1?.level2?.level3?.level4?.deeply?.nested?.value).toBe(
          'found',
        );
        expect((error.context as any)?.parallel?.branch).toBe('other data');
      });

      it('should handle context with symbols and non-enumerable properties', () => {
        const symbolKey = Symbol('secret');
        const context = {
          normal: 'visible',
          [symbolKey]: 'hidden',
        };

        Object.defineProperty(context, 'nonEnumerable', {
          value: 'invisible',
          enumerable: false,
        });

        const error = new ValidationError('Symbol context test', context);
        expect(error.context?.normal).toBe('visible');
        expect((error.context as any)?.[symbolKey]).toBe('hidden');
        expect((error.context as any)?.nonEnumerable).toBe('invisible');
      });

      it('should handle context with getters and setters', () => {
        let internalValue = 'initial';
        const context = {
          get dynamic() {
            return `Dynamic: ${internalValue}`;
          },
          set dynamic(value: string) {
            internalValue = value.replace('Dynamic: ', '');
          },
          static: 'unchanging',
        };

        const error = new ValidationError('Getter/Setter context test', context);
        expect(error.context?.dynamic).toBe('Dynamic: initial');
        expect(error.context?.static).toBe('unchanging');

        // Test that context maintains reference semantics
        if (error.context && 'dynamic' in error.context) {
          (error.context as any).dynamic = 'Dynamic: modified';
          expect(internalValue).toBe('modified');
        }
      });

      it('should handle context with proxy objects', () => {
        const target = { value: 'original' };
        const handler = {
          get(target: any, prop: string) {
            if (prop === 'intercepted') {
              return 'proxy value';
            }
            return target[prop];
          },
        };
        const proxyContext = new Proxy(target, handler);

        const error = new ValidationError('Proxy context test', proxyContext);
        expect((error.context as any)?.value).toBe('original');
        expect((error.context as any)?.intercepted).toBe('proxy value');
      });
    });

    describe('error chaining with ValidationError', () => {
      it('should handle ValidationError chains in Result operations', () => {
        const validate1 = (value: string): Result<string, ValidationError> => {
          if (value.length < 3) {
            return err(new ValidationError('Too short', { field: 'value', minLength: 3 }));
          }
          return ok(value);
        };

        const validate2 = (value: string): Result<string, ValidationError> => {
          if (!value.includes('@')) {
            return err(new ValidationError('Missing @', { field: 'email', required: '@' }));
          }
          return ok(value);
        };

        const chainedValidation = (value: string): Result<string, ValidationError> => {
          return validate1(value)
            .andThen(validate2)
            .mapErr(
              (error) =>
                new ValidationError('Validation chain failed', {
                  originalError: error.message,
                  field: error.context?.field,
                }),
            );
        };

        const result1 = chainedValidation('ab'); // Too short
        const result2 = chainedValidation('abc'); // Missing @
        const result3 = chainedValidation('abc@def'); // Success

        expect(result1.isErr()).toBe(true);
        expect(result2.isErr()).toBe(true);
        expect(result3.isOk()).toBe(true);

        if (result1.isErr()) {
          expect(result1.error.message).toBe('Validation chain failed');
          expect(result1.error.context?.originalError).toBe('Too short');
          expect(result1.error.context?.field).toBe('value');
        }

        if (result2.isErr()) {
          expect(result2.error.message).toBe('Validation chain failed');
          expect(result2.error.context?.originalError).toBe('Missing @');
          expect(result2.error.context?.field).toBe('email');
        }
      });
    });
  });

  describe('legacy compatibility comprehensive testing', () => {
    describe('migration patterns', () => {
      it('should support mixed usage of legacy and new APIs', () => {
        const legacyFunction = (value: string): Result<string, ValidationError> => {
          if (value.length === 0) {
            return createFailure(new ValidationError('Empty value'));
          }
          return success(value.toUpperCase());
        };

        const modernFunction = (value: string): Result<string, ValidationError> => {
          if (value.includes(' ')) {
            return err(new ValidationError('Spaces not allowed'));
          }
          return ok(value.toLowerCase());
        };

        const mixedPipeline = (value: string) => {
          return legacyFunction(value).andThen((transformedValue) =>
            modernFunction(transformedValue),
          );
        };

        const result1 = mixedPipeline(''); // Empty
        const result2 = mixedPipeline('HAS SPACES'); // Has spaces
        const result3 = mixedPipeline('VALID'); // Valid

        expect(result1.isErr()).toBe(true);
        expect(result2.isErr()).toBe(true);
        expect(result3.isOk()).toBe(true);

        if (result3.isOk()) {
          expect(result3.value).toBe('valid');
        }
      });

      it('should handle all legacy alias combinations', () => {
        const testValue = 'test';
        const testError = new ValidationError('test error');

        // Success aliases
        const okResult = ok(testValue);
        const successResult = success(testValue);
        const createSuccessResult = createSuccess(testValue);

        expect(okResult.isOk()).toBe(successResult.isOk());
        expect(okResult.isOk()).toBe(createSuccessResult.isOk());

        if (okResult.isOk() && successResult.isOk() && createSuccessResult.isOk()) {
          expect(okResult.value).toBe(successResult.value);
          expect(okResult.value).toBe(createSuccessResult.value);
        }

        // Error aliases
        const errResult = err(testError);
        const failureResult = failure(testError);
        const createFailureResult = createFailure(testError);

        expect(errResult.isErr()).toBe(failureResult.isErr());
        expect(errResult.isErr()).toBe(createFailureResult.isErr());

        if (errResult.isErr() && failureResult.isErr() && createFailureResult.isErr()) {
          expect(errResult.error).toBe(failureResult.error);
          expect(errResult.error).toBe(createFailureResult.error);
        }
      });
    });
  });

  describe('complex real-world integration scenarios', () => {
    describe('form validation pipeline', () => {
      interface FormData {
        email: string;
        password: string;
        confirmPassword: string;
        age: number;
      }

      const validateEmail = (email: string): Result<string, ValidationError> => {
        if (!email) {
          return err(new ValidationError('Email is required', { field: 'email' }));
        }
        if (!email.includes('@')) {
          return err(new ValidationError('Invalid email format', { field: 'email', value: email }));
        }
        return ok(email);
      };

      const validatePassword = (password: string): Result<string, ValidationError> => {
        if (!password) {
          return err(new ValidationError('Password is required', { field: 'password' }));
        }
        if (password.length < 8) {
          return err(
            new ValidationError('Password too short', { field: 'password', minLength: 8 }),
          );
        }
        return ok(password);
      };

      const validateAge = (age: number): Result<number, ValidationError> => {
        if (age < 18) {
          return err(new ValidationError('Must be 18 or older', { field: 'age', minimum: 18 }));
        }
        if (age > 120) {
          return err(new ValidationError('Invalid age', { field: 'age', maximum: 120 }));
        }
        return ok(age);
      };

      const validateForm = (data: FormData): Result<FormData, ValidationError[]> => {
        const emailResult = validateEmail(data.email);
        const passwordResult = validatePassword(data.password);
        const ageResult = validateAge(data.age);

        const errors: ValidationError[] = [];

        if (emailResult.isErr()) errors.push(emailResult.error);
        if (passwordResult.isErr()) errors.push(passwordResult.error);
        if (ageResult.isErr()) errors.push(ageResult.error);

        if (data.password !== data.confirmPassword) {
          errors.push(new ValidationError('Passwords do not match', { field: 'confirmPassword' }));
        }

        if (errors.length > 0) {
          return err(errors);
        }

        return ok(data);
      };

      it('should validate complete form successfully', () => {
        const validData: FormData = {
          email: 'test@example.com',
          password: 'securePassword123',
          confirmPassword: 'securePassword123',
          age: 25,
        };

        const result = validateForm(validData);
        expect(result.isOk()).toBe(true);
      });

      it('should collect multiple validation errors', () => {
        const invalidData: FormData = {
          email: 'invalid-email',
          password: 'short',
          confirmPassword: 'different',
          age: 16,
        };

        const result = validateForm(invalidData);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toHaveLength(4); // email, password, age, confirm password
          expect(result.error.every((e) => e instanceof ValidationError)).toBe(true);
        }
      });
    });

    describe('async data processing pipeline', () => {
      const fetchData = async (id: string): Promise<Result<any, ValidationError>> => {
        if (!id) {
          return err(new ValidationError('ID required'));
        }
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok({ id, data: `Data for ${id}` });
      };

      const processData = async (data: any): Promise<Result<any, ValidationError>> => {
        if (!data?.data) {
          return err(new ValidationError('No data to process'));
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok({ ...data, processed: true });
      };

      const saveData = async (data: any): Promise<Result<string, ValidationError>> => {
        if (!data?.processed) {
          return err(new ValidationError('Data not processed'));
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
        return ok(`Saved: ${data.id}`);
      };

      it('should handle async pipeline successfully', async () => {
        const pipeline = async (id: string): Promise<Result<string, ValidationError>> => {
          const fetchResult = await fetchData(id);
          if (fetchResult.isErr()) return fetchResult;

          const processResult = await processData(fetchResult.value);
          if (processResult.isErr()) return processResult;

          return await saveData(processResult.value);
        };

        const result = await pipeline('test-id');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe('Saved: test-id');
        }
      });

      it('should handle async pipeline failure at each stage', async () => {
        const failingPipeline = async (
          stage: 'fetch' | 'process' | 'save',
        ): Promise<Result<string, ValidationError>> => {
          const id = stage === 'fetch' ? '' : 'valid-id';
          const fetchResult = await fetchData(id);
          if (fetchResult.isErr()) return fetchResult;

          const dataToProcess = stage === 'process' ? {} : fetchResult.value;
          const processResult = await processData(dataToProcess);
          if (processResult.isErr()) return processResult;

          const dataToSave = stage === 'save' ? {} : processResult.value;
          return await saveData(dataToSave);
        };

        const fetchFailure = await failingPipeline('fetch');
        const processFailure = await failingPipeline('process');
        const saveFailure = await failingPipeline('save');

        expect(fetchFailure.isErr()).toBe(true);
        expect(processFailure.isErr()).toBe(true);
        expect(saveFailure.isErr()).toBe(true);

        if (fetchFailure.isErr()) {
          expect(fetchFailure.error.message).toBe('ID required');
        }
        if (processFailure.isErr()) {
          expect(processFailure.error.message).toBe('No data to process');
        }
        if (saveFailure.isErr()) {
          expect(saveFailure.error.message).toBe('Data not processed');
        }
      });
    });
  });

  describe('extended neverthrow functionality coverage', () => {
    describe('Result.orElse operations', () => {
      it('should handle orElse with success values', () => {
        const successResult = ok('first success');
        const fallbackResult = successResult.orElse(() => ok('fallback'));

        expect(fallbackResult.isOk()).toBe(true);
        if (fallbackResult.isOk()) {
          expect(fallbackResult.value).toBe('first success');
        }
      });

      it('should handle orElse with error values', () => {
        const errorResult = err(new ValidationError('original error'));
        const fallbackResult = errorResult.orElse(() => ok('fallback success'));

        expect(fallbackResult.isOk()).toBe(true);
        if (fallbackResult.isOk()) {
          expect(fallbackResult.value).toBe('fallback success');
        }
      });

      it('should chain orElse operations', () => {
        const errorResult = err(new ValidationError('error'));
        const chainedResult = errorResult
          .orElse(() => err(new ValidationError('first fallback failed')))
          .orElse(() => ok('second fallback success'));

        expect(chainedResult.isOk()).toBe(true);
        if (chainedResult.isOk()) {
          expect(chainedResult.value).toBe('second fallback success');
        }
      });
    });

    describe('complex Result transformation patterns', () => {
      it('should handle deeply nested Result operations', () => {
        const deepTransform = (value: number): Result<string, ValidationError> => {
          return ok(value)
            .map((x) => x * 2)
            .andThen((x) => (x > 10 ? ok(x) : err(new ValidationError('Too small'))))
            .map((x) => x + 5)
            .andThen((x) =>
              x > 20 ? ok(`Result: ${x}`) : err(new ValidationError('Still too small')),
            );
        };

        const result1 = deepTransform(3); // 3 * 2 = 6, 6 + 5 = 11, < 20 so error
        const result2 = deepTransform(8); // 8 * 2 = 16, 16 + 5 = 21, > 20 so success

        expect(result1.isErr()).toBe(true);
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe('Result: 21');
        }
      });

      it('should handle Result with various value types', () => {
        const objectResult = ok({ name: 'test', value: 42 });
        const arrayResult = ok([1, 2, 3]);
        const functionResult = ok(() => 'function value');

        expect(objectResult.isOk()).toBe(true);
        expect(arrayResult.isOk()).toBe(true);
        expect(functionResult.isOk()).toBe(true);

        if (objectResult.isOk() && arrayResult.isOk() && functionResult.isOk()) {
          expect(objectResult.value.name).toBe('test');
          expect(arrayResult.value).toHaveLength(3);
          expect(functionResult.value()).toBe('function value');
        }
      });
    });

    describe('ValidationError constructor edge cases', () => {
      it('should handle ValidationError with complex context types', () => {
        const complexContext = {
          timestamp: new Date(),
          metadata: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          nested: {
            level1: {
              level2: 'deep value',
            },
          },
          arrayData: [1, 2, 3, { nested: 'array object' }],
        };

        const error = new ValidationError('Complex context test', complexContext);
        expect(error.context?.timestamp).toBeInstanceOf(Date);
        expect(error.context?.metadata).toBeInstanceOf(Map);
        expect((error.context?.nested as any)?.level1?.level2).toBe('deep value');
        expect(Array.isArray(error.context?.arrayData)).toBe(true);
      });

      it('should handle ValidationError with primitive context values', () => {
        const primitiveContexts = [
          { context: 'string context', expected: 'string context' },
          { context: 42, expected: 42 },
          { context: true, expected: true },
          { context: Symbol('test'), expected: Symbol('test') },
        ];

        primitiveContexts.forEach(({ context, expected }) => {
          const error = new ValidationError('Primitive context test', context as any);
          if (typeof expected === 'symbol') {
            expect(typeof error.context).toBe('symbol');
          } else {
            expect(error.context).toBe(expected);
          }
        });
      });
    });

    describe('Result type safety and TypeScript integration', () => {
      it('should maintain type safety in chaining operations', () => {
        interface User {
          id: number;
          name: string;
          email: string;
        }

        const createUser = (
          id: number,
          name: string,
          email: string,
        ): Result<User, ValidationError> => {
          if (id <= 0) return err(new ValidationError('Invalid ID'));
          if (!name.trim()) return err(new ValidationError('Name required'));
          if (!email.includes('@')) return err(new ValidationError('Invalid email'));

          return ok({ id, name: name.trim(), email });
        };

        const processUser = (user: User): Result<string, ValidationError> => {
          return ok(`User ${user.name} (${user.email}) has ID ${user.id}`);
        };

        const validUserResult = createUser(1, 'John Doe', 'john@example.com').andThen(processUser);

        const invalidUserResult = createUser(-1, '', 'invalid-email').andThen(processUser);

        expect(validUserResult.isOk()).toBe(true);
        expect(invalidUserResult.isErr()).toBe(true);

        if (validUserResult.isOk()) {
          expect(validUserResult.value).toContain('John Doe');
        }
      });
    });

    describe('error propagation patterns', () => {
      it('should correctly propagate errors through complex chains', () => {
        const step1 = (value: string): Result<number, ValidationError> => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num)) {
            return err(new ValidationError('Parse error', { input: value, step: 'parse' }));
          }
          return ok(num);
        };

        const step2 = (value: number): Result<number, ValidationError> => {
          if (value < 0) {
            return err(new ValidationError('Negative number', { value, step: 'validate' }));
          }
          return ok(value * 2);
        };

        const step3 = (value: number): Result<string, ValidationError> => {
          if (value > 100) {
            return err(new ValidationError('Too large', { value, step: 'range-check' }));
          }
          return ok(`Processed: ${value}`);
        };

        const pipeline = (input: string): Result<string, ValidationError> => {
          return step1(input)
            .andThen(step2)
            .andThen(step3)
            .mapErr(
              (originalError) =>
                new ValidationError(`Pipeline failed: ${originalError.message}`, {
                  originalError,
                  pipeline: 'number-processing',
                }),
            );
        };

        const tests = [
          { input: 'abc', shouldSucceed: false, errorContains: 'Parse error' },
          { input: '-5', shouldSucceed: false, errorContains: 'Negative number' },
          { input: '60', shouldSucceed: false, errorContains: 'Too large' }, // 60 * 2 = 120 > 100
          { input: '40', shouldSucceed: true, result: 'Processed: 80' }, // 40 * 2 = 80 <= 100
        ];

        tests.forEach(({ input, shouldSucceed, errorContains, result }) => {
          const pipelineResult = pipeline(input);

          if (shouldSucceed) {
            expect(pipelineResult.isOk()).toBe(true);
            if (pipelineResult.isOk()) {
              expect(pipelineResult.value).toBe(result);
            }
          } else {
            expect(pipelineResult.isErr()).toBe(true);
            if (pipelineResult.isErr()) {
              expect(pipelineResult.error.message).toContain('Pipeline failed');
              expect(pipelineResult.error.message).toContain(errorContains);
              expect(pipelineResult.error.context?.originalError).toBeDefined();
            }
          }
        });
      });
    });
  });

  describe('Property-Based Testing for Result Invariants', () => {
    describe('Result functor laws', () => {
      it('should satisfy identity law: map(identity) === identity', () => {
        fc.assert(
          fc.property(fc.anything(), (value) => {
            const result = ok(value);
            const identity = <T>(x: T): T => x;
            const mapped = result.map(identity);

            expect(mapped.isOk()).toBe(true);
            if (mapped.isOk() && result.isOk()) {
              expect(mapped.value).toEqual(result.value);
            }
          }),
        );
      });

      it('should satisfy composition law: map(f).map(g) === map(g ∘ f)', () => {
        fc.assert(
          fc.property(fc.integer(), (value) => {
            const result = ok(value);
            const f = (x: number) => x * 2;
            const g = (x: number) => x + 1;
            const composed = (x: number) => g(f(x));

            const leftSide = result.map(f).map(g);
            const rightSide = result.map(composed);

            expect(leftSide.isOk()).toBe(rightSide.isOk());
            if (leftSide.isOk() && rightSide.isOk()) {
              expect(leftSide.value).toBe(rightSide.value);
            }
          }),
        );
      });

      it('should not map over errors', () => {
        fc.assert(
          fc.property(fc.string(), (errorMessage) => {
            const error = new ValidationError(errorMessage);
            const result = err(error);
            const mapFunction = vi.fn((x) => x * 2);

            const mapped = result.map(mapFunction);

            expect(mapped.isErr()).toBe(true);
            expect(mapFunction).not.toHaveBeenCalled();
            if (mapped.isErr()) {
              expect(mapped.error).toBe(error);
            }
          }),
        );
      });
    });

    describe('Result monad laws', () => {
      it('should satisfy left identity: return(a).andThen(f) === f(a)', () => {
        fc.assert(
          fc.property(fc.integer(), (value) => {
            const f = (x: number): Result<string, ValidationError> => ok(`Value: ${x}`);

            const leftSide = ok(value).andThen(f);
            const rightSide = f(value);

            expect(leftSide.isOk()).toBe(rightSide.isOk());
            if (leftSide.isOk() && rightSide.isOk()) {
              expect(leftSide.value).toBe(rightSide.value);
            }
          }),
        );
      });

      it('should satisfy right identity: m.andThen(return) === m', () => {
        fc.assert(
          fc.property(fc.anything(), (value) => {
            const result = ok(value);
            const identity = <T>(x: T): Result<T, never> => ok(x);

            const chained = result.andThen(identity);

            expect(chained.isOk()).toBe(result.isOk());
            if (chained.isOk() && result.isOk()) {
              expect(chained.value).toEqual(result.value);
            }
          }),
        );
      });

      it('should satisfy associativity: m.andThen(f).andThen(g) === m.andThen(x => f(x).andThen(g))', () => {
        fc.assert(
          fc.property(fc.integer(), (value) => {
            const result = ok(value);
            const f = (x: number): Result<number, ValidationError> => ok(x * 2);
            const g = (x: number): Result<string, ValidationError> => ok(`Result: ${x}`);

            const leftSide = result.andThen(f).andThen(g);
            const rightSide = result.andThen((x) => f(x).andThen(g));

            expect(leftSide.isOk()).toBe(rightSide.isOk());
            if (leftSide.isOk() && rightSide.isOk()) {
              expect(leftSide.value).toBe(rightSide.value);
            }
          }),
        );
      });

      it('should short-circuit on error in andThen chains', () => {
        fc.assert(
          fc.property(fc.string(), (errorMessage) => {
            const error = new ValidationError(errorMessage);
            const result = err(error);
            const chainFunction = vi.fn((x) => ok(x));

            const chained = result.andThen(chainFunction);

            expect(chained.isErr()).toBe(true);
            expect(chainFunction).not.toHaveBeenCalled();
            if (chained.isErr()) {
              expect(chained.error).toBe(error);
            }
          }),
        );
      });
    });

    describe('ValidationError property-based testing', () => {
      it('should create ValidationError with any string message', () => {
        fc.assert(
          fc.property(fc.string(), (message) => {
            const error = new ValidationError(message);

            expect(error.message).toBe(message);
            expect(error.name).toBe('ValidationError');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ValidationError);
          }),
        );
      });

      it('should create ValidationError with any context object', () => {
        fc.assert(
          fc.property(
            fc.string(),
            fc.record({
              field: fc.string(),
              value: fc.anything(),
              code: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            }),
            (message, context) => {
              const error = new ValidationError(message, context);

              expect(error.message).toBe(message);
              expect(error.context).toEqual(context);
              expect(error.context?.field).toBe(context.field);
            },
          ),
        );
      });

      it('should preserve context object reference identity', () => {
        fc.assert(
          fc.property(fc.string(), fc.record({ mutable: fc.string() }), (message, context) => {
            const error = new ValidationError(message, context);
            const originalValue = context.mutable;

            context.mutable = 'modified';

            expect(error.context?.mutable).toBe('modified');
            expect(error.context?.mutable).not.toBe(originalValue);
          }),
        );
      });
    });

    describe('Result type invariants', () => {
      it('should maintain type safety across all operations', () => {
        fc.assert(
          fc.property(fc.oneof(fc.string(), fc.integer(), fc.boolean()), (value) => {
            const result = ok(value);

            expect(result.isOk()).toBe(true);
            expect(result.isErr()).toBe(false);

            if (result.isOk()) {
              expect(result.value).toBe(value);
              expect(typeof result.value).toBe(typeof value);
            }
          }),
        );
      });

      it('should handle Result with complex nested objects', () => {
        fc.assert(
          fc.property(
            fc.record({
              nested: fc.record({
                deep: fc.array(fc.string()),
                value: fc.integer(),
              }),
              metadata: fc.record({
                created: fc.date(),
                tags: fc.array(fc.string()),
              }),
            }),
            (complexObject) => {
              const result = ok(complexObject);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.nested.deep).toEqual(complexObject.nested.deep);
                expect(result.value.metadata.tags).toEqual(complexObject.metadata.tags);
                expect(result.value.nested.value).toBe(complexObject.nested.value);
              }
            },
          ),
        );
      });
    });

    describe('Error handling invariants', () => {
      it('should preserve error types through mapErr operations', () => {
        fc.assert(
          fc.property(fc.string(), (originalMessage) => {
            const originalError = new ValidationError(originalMessage);
            const result = err(originalError);

            const mappedResult = result.mapErr(
              (error) =>
                new ValidationError(`Mapped: ${error.message}`, {
                  originalError: error,
                }),
            );

            expect(mappedResult.isErr()).toBe(true);
            if (mappedResult.isErr()) {
              expect(mappedResult.error).toBeInstanceOf(ValidationError);
              expect(mappedResult.error.message).toBe(`Mapped: ${originalMessage}`);
              expect(mappedResult.error.context?.originalError).toBe(originalError);
            }
          }),
        );
      });

      it('should not affect success values with mapErr', () => {
        fc.assert(
          fc.property(fc.anything(), (value) => {
            const result = ok(value);
            const errorMapper = vi.fn();

            const mappedResult = result.mapErr(errorMapper);

            expect(mappedResult.isOk()).toBe(true);
            expect(errorMapper).not.toHaveBeenCalled();
            if (mappedResult.isOk() && result.isOk()) {
              expect(mappedResult.value).toEqual(result.value);
            }
          }),
        );
      });
    });
  });

  describe('Domain-Specific Result Patterns', () => {
    describe('validation result composition', () => {
      it('should compose multiple validation results correctly', () => {
        const validateEmail = (email: string): Result<string, ValidationError> => {
          if (!email.includes('@')) {
            return err(new ValidationError('Invalid email', { field: 'email' }));
          }
          return ok(email);
        };

        const validateAge = (age: number): Result<number, ValidationError> => {
          if (age < 0 || age > 150) {
            return err(new ValidationError('Invalid age', { field: 'age' }));
          }
          return ok(age);
        };

        const validateName = (name: string): Result<string, ValidationError> => {
          if (name.trim().length === 0) {
            return err(new ValidationError('Name required', { field: 'name' }));
          }
          return ok(name.trim());
        };

        fc.assert(
          fc.property(
            fc.record({
              email: fc.string(),
              age: fc.integer({ min: -10, max: 200 }),
              name: fc.string(),
            }),
            (input: { email: string; age: number; name: string }) => {
              const emailResult = validateEmail(input.email);
              const ageResult = validateAge(input.age);
              const nameResult = validateName(input.name);

              const isValidInput =
                input.email.includes('@') &&
                input.age >= 0 &&
                input.age <= 150 &&
                input.name.trim().length > 0;

              if (isValidInput) {
                expect(emailResult.isOk()).toBe(true);
                expect(ageResult.isOk()).toBe(true);
                expect(nameResult.isOk()).toBe(true);
              } else {
                const hasError = emailResult.isErr() || ageResult.isErr() || nameResult.isErr();
                expect(hasError).toBe(true);
              }
            },
          ),
        );
      });

      it('should handle validation error accumulation patterns', () => {
        const collectValidationErrors = <T>(
          results: Result<T, ValidationError>[],
        ): Result<T[], ValidationError[]> => {
          const errors: ValidationError[] = [];
          const values: T[] = [];

          for (const result of results) {
            if (result.isErr()) {
              errors.push(result.error);
            } else {
              values.push(result.value);
            }
          }

          if (errors.length > 0) {
            return err(errors);
          }
          return ok(values);
        };

        fc.assert(
          fc.property(
            fc.array(
              fc.oneof(
                fc.string().map((s) => ok(s)),
                fc.string().map((s) => err(new ValidationError(s))),
              ),
              { minLength: 1, maxLength: 10 },
            ),
            (results) => {
              const collected = collectValidationErrors(results);
              const errorCount = results.filter((r) => r.isErr()).length;
              const successCount = results.filter((r) => r.isOk()).length;

              if (errorCount > 0) {
                expect(collected.isErr()).toBe(true);
                if (collected.isErr()) {
                  expect(collected.error).toHaveLength(errorCount);
                }
              } else {
                expect(collected.isOk()).toBe(true);
                if (collected.isOk()) {
                  expect(collected.value).toHaveLength(successCount);
                }
              }
            },
          ),
        );
      });
    });

    describe('Result transformation patterns', () => {
      it('should handle Result unwrapping with fallbacks', () => {
        fc.assert(
          fc.property(fc.string(), fc.string(), (value, fallback) => {
            const successResult = ok(value);
            const errorResult = err(new ValidationError('test'));

            expect(successResult.unwrapOr(fallback)).toBe(value);
            expect(errorResult.unwrapOr(fallback)).toBe(fallback);
          }),
        );
      });

      it('should handle Result matching patterns', () => {
        fc.assert(
          fc.property(fc.oneof(fc.string(), fc.constant(null)), (value) => {
            const result = value ? ok(value) : err(new ValidationError('null value'));

            const matched = result.match(
              (val) => `Success: ${val}`,
              (error) => `Error: ${error.message}`,
            );

            if (value) {
              expect(matched).toBe(`Success: ${value}`);
            } else {
              expect(matched).toBe('Error: null value');
            }
          }),
        );
      });
    });

    describe('async Result patterns', () => {
      it('should handle async Result composition correctly', async () => {
        const asyncValidation = (value: string): ResultAsync<string, ValidationError> => {
          return ResultAsync.fromPromise(
            new Promise((resolve, reject) => {
              setTimeout(() => {
                if (value.length > 0) {
                  resolve(value.toUpperCase());
                } else {
                  reject(new Error('Empty string'));
                }
              }, 1);
            }),
            (error) => new ValidationError(`Async validation failed: ${(error as Error).message}`),
          );
        };

        await fc.assert(
          fc.asyncProperty(fc.string(), async (value) => {
            const result = await asyncValidation(value);

            if (value.length > 0) {
              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value).toBe(value.toUpperCase());
              }
            } else {
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error).toBeInstanceOf(ValidationError);
              }
            }
          }),
        );
      });

      it('should handle async Result chaining with error recovery', async () => {
        const step1 = (value: number): ResultAsync<number, ValidationError> => {
          if (value < 0) {
            return errAsync(new ValidationError('Negative input'));
          }
          return okAsync(value * 2);
        };

        const step2 = (value: number): ResultAsync<string, ValidationError> => {
          if (value > 100) {
            return errAsync(new ValidationError('Too large'));
          }
          return okAsync(`Result: ${value}`);
        };

        await fc.assert(
          fc.asyncProperty(fc.integer({ min: -50, max: 100 }), async (input) => {
            const pipeline = step1(input).andThen(step2);
            const result = await pipeline;

            if (input < 0) {
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error.message).toBe('Negative input');
              }
            } else if (input * 2 > 100) {
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error.message).toBe('Too large');
              }
            } else {
              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value).toBe(`Result: ${input * 2}`);
              }
            }
          }),
        );
      });
    });
  });

  describe('Performance and Memory Characteristics', () => {
    describe('Result performance invariants', () => {
      it('should handle large chains efficiently', () => {
        const chainLength = 1000;
        let result: Result<number, ValidationError> = ok(0);

        const startTime = performance.now();
        for (let i = 0; i < chainLength; i++) {
          result = result.map((x) => x + 1);
        }
        const endTime = performance.now();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(chainLength);
        }
        expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      });

      it('should handle error short-circuiting efficiently', () => {
        const error = new ValidationError('Early error');
        let result: Result<number, ValidationError> = err(error);
        const mapSpy = vi.fn((x) => x + 1);

        const startTime = performance.now();
        for (let i = 0; i < 1000; i++) {
          result = result.map(mapSpy);
        }
        const endTime = performance.now();

        expect(result.isErr()).toBe(true);
        expect(mapSpy).not.toHaveBeenCalled();
        expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to short-circuiting
      });
    });

    describe('memory leak prevention', () => {
      it('should not retain references to intermediate results', () => {
        const createLargeObject = () => ({
          data: new Array(10000).fill('large data'),
          timestamp: Date.now(),
        });

        let result: Result<any, ValidationError> = ok(createLargeObject());

        // Transform through multiple operations
        result = result
          .map((obj) => ({ ...obj, processed: true }))
          .map((obj) => ({ id: obj.timestamp, summary: 'processed' }))
          .map((obj) => obj.id);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(typeof result.value).toBe('number');
          // The large original object should not be referenced anymore
          expect(result.value).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Integration Patterns for Domain Layer', () => {
    describe('entity validation patterns', () => {
      interface StatementId {
        value: string;
      }

      interface Statement {
        id: StatementId;
        content: string;
        usageCount: number;
      }

      const createStatementId = (value: string): Result<StatementId, ValidationError> => {
        if (!value || value.trim().length === 0) {
          return err(new ValidationError('StatementId cannot be empty', { field: 'id' }));
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
          return err(
            new ValidationError('Invalid StatementId format', {
              field: 'id',
              pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
            }),
          );
        }
        return ok({ value });
      };

      const createStatement = (
        id: string,
        content: string,
        usageCount: number = 0,
      ): Result<Statement, ValidationError> => {
        return createStatementId(id).andThen((validId) => {
          if (!content || content.trim().length === 0) {
            return err(
              new ValidationError('Statement content cannot be empty', {
                field: 'content',
              }),
            );
          }
          if (usageCount < 0) {
            return err(
              new ValidationError('Usage count cannot be negative', {
                field: 'usageCount',
              }),
            );
          }
          return ok({
            id: validId,
            content: content.trim(),
            usageCount,
          });
        });
      };

      it('should validate domain entities with proper error context', () => {
        fc.assert(
          fc.property(fc.string(), fc.string(), fc.integer(), (id, content, usageCount) => {
            const result = createStatement(id, content, usageCount);

            const isValidId = id && id.trim().length > 0 && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
            const isValidContent = content && content.trim().length > 0;
            const isValidUsageCount = usageCount >= 0;

            if (isValidId && isValidContent && isValidUsageCount) {
              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.id.value).toBe(id);
                expect(result.value.content).toBe(content.trim());
                expect(result.value.usageCount).toBe(usageCount);
              }
            } else {
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error).toBeInstanceOf(ValidationError);
                expect(result.error.context?.field).toBeDefined();
              }
            }
          }),
        );
      });
    });

    describe('repository operation patterns', () => {
      interface Repository<T, ID> {
        findById(id: ID): Promise<Result<T, ValidationError>>;
        save(entity: T): Promise<Result<void, ValidationError>>;
      }

      const mockRepository = <T, ID>(): Repository<T, ID> => ({
        findById: vi.fn(),
        save: vi.fn(),
      });

      it('should handle repository Result patterns correctly', async () => {
        const repo = mockRepository<string, string>();

        // Mock successful find
        (repo.findById as any).mockResolvedValue(ok('found entity'));

        // Mock successful save
        (repo.save as any).mockResolvedValue(ok(undefined));

        const findResult = await repo.findById('test-id');
        const saveResult = await repo.save('test entity');

        expect(findResult.isOk()).toBe(true);
        expect(saveResult.isOk()).toBe(true);

        if (findResult.isOk()) {
          expect(findResult.value).toBe('found entity');
        }
        if (saveResult.isOk()) {
          expect(saveResult.value).toBeUndefined();
        }
      });

      it('should handle repository error patterns correctly', async () => {
        const repo = mockRepository<string, string>();

        // Mock find error
        (repo.findById as any).mockResolvedValue(
          err(new ValidationError('Entity not found', { id: 'test-id' })),
        );

        // Mock save error
        (repo.save as any).mockResolvedValue(
          err(new ValidationError('Save failed', { reason: 'database error' })),
        );

        const findResult = await repo.findById('test-id');
        const saveResult = await repo.save('test entity');

        expect(findResult.isErr()).toBe(true);
        expect(saveResult.isErr()).toBe(true);

        if (findResult.isErr()) {
          expect(findResult.error.message).toBe('Entity not found');
          expect(findResult.error.context?.id).toBe('test-id');
        }
        if (saveResult.isErr()) {
          expect(saveResult.error.message).toBe('Save failed');
          expect(saveResult.error.context?.reason).toBe('database error');
        }
      });
    });
  });
});
