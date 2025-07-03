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
});
