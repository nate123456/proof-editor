import { describe, expect, it } from 'vitest';

import {
  createFailure,
  createSuccess,
  err,
  errAsync,
  failure,
  ok,
  okAsync,
  success,
  ValidationError,
} from '../result.js';

describe('Result Creation and Factory Methods', () => {
  describe('neverthrow Result constructors', () => {
    it('should create success result with ok function', () => {
      const result = ok('success value');

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe('success value');
      }
    });

    it('should create error result with err function', () => {
      const error = new Error('test error');
      const result = err(error);

      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    it('should handle different value types in success results', () => {
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

    it('should handle different error types', () => {
      const basicError = err(new Error('basic'));
      const validationError = err(new ValidationError('validation'));
      const customError = err({ type: 'custom', message: 'error' } as any);

      expect(basicError.isErr()).toBe(true);
      expect(validationError.isErr()).toBe(true);
      expect(customError.isErr()).toBe(true);
    });
  });

  describe('async Result constructors', () => {
    it('should create async success with okAsync', async () => {
      const result = okAsync('async success');

      const resolved = await result;
      expect(resolved.isOk()).toBe(true);
      if (resolved.isOk()) {
        expect(resolved.value).toBe('async success');
      }
    });

    it('should create async error with errAsync', async () => {
      const error = new Error('async error');
      const result = errAsync(error);

      const resolved = await result;
      expect(resolved.isErr()).toBe(true);
      if (resolved.isErr()) {
        expect(resolved.error).toBe(error);
      }
    });
  });

  describe('legacy compatibility aliases', () => {
    it('should support createSuccess as alias for ok', () => {
      const result = createSuccess('test value');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('test value');
      }
    });

    it('should support success as alias for ok', () => {
      const result = success('test value');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('test value');
      }
    });

    it('should support createFailure as alias for err', () => {
      const error = new Error('test error');
      const result = createFailure(error);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    it('should support failure as alias for err', () => {
      const error = new Error('test error');
      const result = failure(error);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    it('should have identical behavior between all success aliases', () => {
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

    it('should have identical behavior between all error aliases', () => {
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

  describe('Result type safety', () => {
    it('should maintain type information through creation', () => {
      interface User {
        id: number;
        name: string;
      }

      const userResult = ok<User, Error>({ id: 1, name: 'John' });
      const errorResult = err<User, ValidationError>(new ValidationError('Invalid user'));

      if (userResult.isOk()) {
        expect(userResult.value.id).toBe(1);
        expect(userResult.value.name).toBe('John');
      }

      if (errorResult.isErr()) {
        expect(errorResult.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should work with complex nested types', () => {
      interface ComplexType {
        nested: {
          deep: string[];
          value: number;
        };
        metadata: {
          created: Date;
          tags: string[];
        };
      }

      const complexValue: ComplexType = {
        nested: {
          deep: ['a', 'b', 'c'],
          value: 42,
        },
        metadata: {
          created: new Date(),
          tags: ['test', 'complex'],
        },
      };

      const result = ok(complexValue);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.nested.deep).toEqual(['a', 'b', 'c']);
        expect(result.value.metadata.tags).toEqual(['test', 'complex']);
      }
    });
  });
});
