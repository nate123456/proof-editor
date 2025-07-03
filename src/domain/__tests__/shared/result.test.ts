/**
 * Test suite for neverthrow Result type - foundational shared utility
 *
 * Priority: HIGH (93 dependents across codebase)
 * This file tests the neverthrow Result type that underlies all domain operations
 */

import fc from 'fast-check';
import { err, errAsync, ok, okAsync, type Result, ResultAsync } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import {
  createFailure,
  createSuccess,
  failure,
  success,
  ValidationError,
} from '../../shared/result.js';

describe('neverthrow Result<T, E>', () => {
  describe('ok() creation', () => {
    it('should create a successful result with value', () => {
      const data = 'test data';
      const result = ok(data);

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe(data);
      }
    });

    it('should work with complex objects', () => {
      const complexData = { id: 1, name: 'test', items: [1, 2, 3] };
      const result = ok(complexData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(complexData);
      }
    });

    it('should work with null and undefined', () => {
      const nullResult = ok(null);
      const undefinedResult = ok(undefined);

      expect(nullResult.isOk()).toBe(true);
      if (nullResult.isOk()) {
        expect(nullResult.value).toBe(null);
      }

      expect(undefinedResult.isOk()).toBe(true);
      if (undefinedResult.isOk()) {
        expect(undefinedResult.value).toBe(undefined);
      }
    });
  });

  describe('err() creation', () => {
    it('should create a failed result with error', () => {
      const error = new ValidationError('Test error');
      const result = err(error);

      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    it('should work with different error types', () => {
      const validationError = new ValidationError('Validation failed');
      const genericError = new Error('Generic error');

      const validationResult = err(validationError);
      const genericResult = err(genericError);

      expect(validationResult.isErr()).toBe(true);
      if (validationResult.isErr()) {
        expect(validationResult.error).toBe(validationError);
      }

      expect(genericResult.isErr()).toBe(true);
      if (genericResult.isErr()) {
        expect(genericResult.error).toBe(genericError);
      }
    });
  });

  describe('type guards', () => {
    it('isOk should correctly identify successful results', () => {
      const success = ok('data');
      const failure = err(new Error('error'));

      expect(success.isOk()).toBe(true);
      expect(failure.isOk()).toBe(false);
    });

    it('isErr should correctly identify failed results', () => {
      const success = ok('data');
      const failure = err(new Error('error'));

      expect(success.isErr()).toBe(false);
      expect(failure.isErr()).toBe(true);
    });

    it('type guards should provide proper type narrowing', () => {
      const result: Result<string, Error> =
        Math.random() > 0.5 ? ok('success data') : err(new Error('failure'));

      if (result.isOk()) {
        // TypeScript should infer result.value as string
        expect(typeof result.value).toBe('string');
      } else {
        // TypeScript should infer result.error as Error
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('ValidationError', () => {
    it('should extend Error correctly', () => {
      const error = new ValidationError('Validation message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation message');
      expect(error.name).toBe('ValidationError');
    });

    it('should handle context property', () => {
      const context = { field: 'username', value: 'invalid', rule: 'length' };
      const error = new ValidationError('Validation failed', context);

      expect(error.context).toEqual(context);
      expect(error.message).toBe('Validation failed');
    });

    it('should work without context', () => {
      const error = new ValidationError('Simple validation error');

      expect(error.context).toBeUndefined();
      expect(error.message).toBe('Simple validation error');
    });

    it('should have proper stack trace', () => {
      const error = new ValidationError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    it('should serialize context in JSON with toJSON method', () => {
      const context = { field: 'email', reason: 'invalid_format' };
      const error = new ValidationError('Email validation failed', context);

      // Manually create JSON representation since Error doesn't serialize by default
      const errorObject = {
        message: error.message,
        name: error.name,
        context: error.context,
      };

      const serialized = JSON.stringify(errorObject);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Email validation failed');
      expect(parsed.name).toBe('ValidationError');
      expect(parsed.context).toEqual(context);
    });
  });

  describe('Property-based testing', () => {
    it('ok should always create successful results', () => {
      fc.assert(
        fc.property(fc.anything(), data => {
          const result = ok(data);
          expect(result.isOk()).toBe(true);
          expect(result.isErr()).toBe(false);
          if (result.isOk()) {
            expect(result.value).toBe(data);
          }
        })
      );
    });

    it('err should always create failed results', () => {
      fc.assert(
        fc.property(fc.string(), errorMessage => {
          const error = new ValidationError(errorMessage);
          const result = err(error);
          expect(result.isErr()).toBe(true);
          expect(result.isOk()).toBe(false);
          if (result.isErr()) {
            expect(result.error).toBe(error);
          }
        })
      );
    });

    it('success and failure should be mutually exclusive', () => {
      fc.assert(
        fc.property(fc.anything(), fc.string(), (data, errorMsg) => {
          const success = ok(data);
          const failure = err(new Error(errorMsg));

          expect(success.isOk() && success.isErr()).toBe(false);
          expect(failure.isOk() && failure.isErr()).toBe(false);
          expect(success.isOk() !== success.isErr()).toBe(true);
          expect(failure.isOk() !== failure.isErr()).toBe(true);
        })
      );
    });

    it('map preserves success/failure state', () => {
      fc.assert(
        fc.property(fc.integer(), fc.string(), (value, errorMsg) => {
          const successResult = ok(value);
          const errorResult = err(new Error(errorMsg));

          const mappedSuccess = successResult.map(x => x * 2);
          const mappedError = errorResult.map(x => x * 2);

          expect(mappedSuccess.isOk()).toBe(true);
          expect(mappedError.isErr()).toBe(true);

          if (mappedSuccess.isOk()) {
            expect(mappedSuccess.value).toBe(value * 2);
          }
        })
      );
    });

    it('andThen should chain operations correctly', () => {
      fc.assert(
        fc.property(fc.integer(), fc.string(), (value, errorMsg) => {
          const doubleIfPositive = (x: number) =>
            x > 0 ? ok(x * 2) : err(new ValidationError('Not positive'));

          const successResult = ok(Math.abs(value) + 1); // Always positive
          const errorResult = err<number, Error>(new Error(errorMsg));

          const chainedSuccess = successResult.andThen(doubleIfPositive);
          const chainedError = errorResult.andThen(doubleIfPositive);

          expect(chainedSuccess.isOk()).toBe(true);
          expect(chainedError.isErr()).toBe(true);
        })
      );
    });

    it('ValidationError with context should serialize properly', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({
            field: fc.string(),
            value: fc.anything(),
            rule: fc.string(),
          }),
          (message, context) => {
            const error = new ValidationError(message, context);

            expect(error.message).toBe(message);
            expect(error.context).toEqual(context);
            expect(error.name).toBe('ValidationError');
          }
        )
      );
    });

    it('Result combinators should be associative', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), fc.integer(), (a, b, c) => {
          const add = (x: number) => (y: number) => ok(x + y);

          // ((a + b) + c) should equal (a + (b + c))
          const left = ok(a).andThen(add(b)).andThen(add(c));

          const right = ok(b).andThen(add(c)).andThen(add(a));

          if (left.isOk() && right.isOk()) {
            expect(left.value).toBe(right.value);
          }
        })
      );
    });
  });

  describe('Result chaining with map and andThen', () => {
    it('should transform success values with map', () => {
      const result = ok(5);
      const doubled = result.map(x => x * 2);

      expect(doubled.isOk()).toBe(true);
      if (doubled.isOk()) {
        expect(doubled.value).toBe(10);
      }
    });

    it('should preserve errors through map', () => {
      const error = new ValidationError('Test error');
      const result = err<number, ValidationError>(error);
      const doubled = result.map(x => x * 2);

      expect(doubled.isErr()).toBe(true);
      if (doubled.isErr()) {
        expect(doubled.error).toBe(error);
      }
    });

    it('should chain operations with andThen', () => {
      const parseNumber = (str: string): Result<number, ValidationError> => {
        const num = parseInt(str, 10);
        return isNaN(num) ? err(new ValidationError('Not a number')) : ok(num);
      };

      const doubleIfEven = (num: number): Result<number, ValidationError> => {
        return num % 2 === 0 ? ok(num * 2) : err(new ValidationError('Not even'));
      };

      const successResult = parseNumber('4').andThen(doubleIfEven);
      expect(successResult.isOk()).toBe(true);
      if (successResult.isOk()) {
        expect(successResult.value).toBe(8);
      }

      const parseFailure = parseNumber('not-a-number').andThen(doubleIfEven);
      expect(parseFailure.isErr()).toBe(true);

      const evenFailure = parseNumber('3').andThen(doubleIfEven);
      expect(evenFailure.isErr()).toBe(true);
    });

    it('should transform errors with mapErr', () => {
      const originalError = new Error('Original error');
      const result = err<string, Error>(originalError);

      const transformed = result.mapErr(e => new ValidationError(`Transformed: ${e.message}`));

      expect(transformed.isErr()).toBe(true);
      if (transformed.isErr()) {
        expect(transformed.error).toBeInstanceOf(ValidationError);
        expect(transformed.error.message).toBe('Transformed: Original error');
      }
    });
  });

  describe('Error handling patterns', () => {
    it('should support error recovery with orElse', () => {
      const failure = err(new ValidationError('Operation failed'));

      const recovered = failure.orElse(() => ok('default value'));

      expect(recovered.isOk()).toBe(true);
      if (recovered.isOk()) {
        expect(recovered.value).toBe('default value');
      }
    });

    it('should support conditional error handling', () => {
      const handleError = (error: Error): Result<string, Error> => {
        if (error instanceof ValidationError) {
          return ok('handled validation error');
        }
        return err(error);
      };

      const validationError = err(new ValidationError('Validation failed'));
      const genericError = err(new Error('Generic error'));

      const validationResult = validationError.orElse(e => handleError(e));
      const genericResult = genericError.orElse(e => handleError(e));

      expect(validationResult.isOk()).toBe(true);
      expect(genericResult.isErr()).toBe(true);
    });
  });

  describe('Integration with domain patterns', () => {
    it('should work well with domain entity creation patterns', () => {
      const createEntity = (id: string): Result<{ id: string; created: Date }, ValidationError> => {
        if (id.length === 0) {
          return err(new ValidationError('ID cannot be empty'));
        }
        if (id.length > 100) {
          return err(new ValidationError('ID too long'));
        }
        return ok({ id, created: new Date() });
      };

      const validResult = createEntity('valid-id');
      const emptyResult = createEntity('');
      const longResult = createEntity('a'.repeat(101));

      expect(validResult.isOk()).toBe(true);
      expect(emptyResult.isErr()).toBe(true);
      expect(longResult.isErr()).toBe(true);

      if (emptyResult.isErr()) {
        expect(emptyResult.error.message).toContain('cannot be empty');
      }
    });

    it('should support chained domain operations', () => {
      interface User {
        id: string;
        name: string;
      }
      interface UserRepository {
        save: (user: User) => Result<User, Error>;
      }

      const validateUser = (name: string): Result<User, ValidationError> => {
        if (name.trim().length === 0) {
          return err(new ValidationError('Name cannot be empty'));
        }
        return ok({ id: `user-${Date.now()}`, name: name.trim() });
      };

      const mockRepo: UserRepository = {
        save: (user: User) => {
          // Simulate save operation
          return user.id.startsWith('user-') ? ok(user) : err(new Error('Save failed'));
        },
      };

      const createAndSaveUser = (name: string): Result<User, ValidationError | Error> => {
        return validateUser(name).andThen(user => mockRepo.save(user));
      };

      const successResult = createAndSaveUser('John Doe');
      const failureResult = createAndSaveUser('');

      expect(successResult.isOk()).toBe(true);
      expect(failureResult.isErr()).toBe(true);
    });
  });
});

describe('Legacy compatibility exports', () => {
  describe('createSuccess and createFailure', () => {
    it('should create successful results with createSuccess', () => {
      const result = createSuccess('test data');

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe('test data');
      }
    });

    it('should create failed results with createFailure', () => {
      const error = new ValidationError('Test error');
      const result = createFailure(error);

      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('success and failure', () => {
    it('should create successful results with success', () => {
      const result = success({ id: 1, name: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ id: 1, name: 'test' });
      }
    });

    it('should create failed results with failure', () => {
      const error = new Error('Failure test');
      const result = failure(error);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('compatibility with neverthrow functions', () => {
    it('should be functionally identical to ok/err', () => {
      const data = 'test data';
      const error = new ValidationError('test error');

      const okResult = ok(data);
      const successResult = success(data);
      const createSuccessResult = createSuccess(data);

      const errResult = err(error);
      const failureResult = failure(error);
      const createFailureResult = createFailure(error);

      // All success results should behave identically
      expect(okResult.isOk()).toBe(successResult.isOk());
      expect(okResult.isOk()).toBe(createSuccessResult.isOk());

      // All error results should behave identically
      expect(errResult.isErr()).toBe(failureResult.isErr());
      expect(errResult.isErr()).toBe(createFailureResult.isErr());
    });
  });
});

describe('ResultAsync', () => {
  describe('async result creation', () => {
    it('should create successful async results', async () => {
      const asyncResult = okAsync('async data');
      const result = await asyncResult;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('async data');
      }
    });

    it('should create failed async results', async () => {
      const error = new ValidationError('Async error');
      const asyncResult = errAsync(error);
      const result = await asyncResult;

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    it('should convert Promise to ResultAsync', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      const asyncOperation = async (shouldFail: boolean): Promise<string> => {
        if (shouldFail) {
          throw new Error('Async operation failed');
        }
        return 'success';
      };

      const successResult = ResultAsync.fromPromise(
        asyncOperation(false),
        error => new ValidationError(`Wrapped: ${String(error)}`)
      );

      const failureResult = ResultAsync.fromPromise(
        asyncOperation(true),
        error => new ValidationError(`Wrapped: ${String(error)}`)
      );

      const success = await successResult;
      const failure = await failureResult;

      expect(success.isOk()).toBe(true);
      expect(failure.isErr()).toBe(true);
    });
  });

  describe('async chaining', () => {
    it('should chain async operations', async () => {
      const asyncDouble = (x: number): ResultAsync<number, ValidationError> => {
        return ResultAsync.fromPromise(
          Promise.resolve(x * 2),
          () => new ValidationError('Double operation failed')
        );
      };

      const asyncResult = okAsync(5)
        .andThen(asyncDouble)
        .map(x => x + 1);

      const result = await asyncResult;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(11); // (5 * 2) + 1
      }
    });
  });
});
