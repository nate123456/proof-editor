/**
 * Enhanced coverage tests for result.ts module
 *
 * This file provides comprehensive testing for ValidationError and neverthrow integration
 * to ensure 95% coverage across all edge cases and error scenarios.
 */

import { describe, expect, it } from 'vitest';

import {
  err as createFailure,
  ok as createSuccess,
  err,
  err as failure,
  ok,
  type Result,
  ok as success,
  ValidationError,
} from '../result';

describe('Enhanced Result Module Coverage', () => {
  describe('ValidationError comprehensive testing', () => {
    it('should create ValidationError with message only', () => {
      const error = new ValidationError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error message');
      expect(error.context).toBeUndefined();
    });

    it('should create ValidationError with message and context', () => {
      const context = { field: 'testField', value: 'testValue', code: 'TEST_ERROR' };
      const error = new ValidationError('Test error with context', context);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error with context');
      expect(error.context).toEqual(context);
      expect(error.context?.field).toBe('testField');
      expect(error.context?.value).toBe('testValue');
      expect(error.context?.code).toBe('TEST_ERROR');
    });

    it('should handle context with various data types', () => {
      const complexContext = {
        field: 'complexField',
        value: { nested: { data: [1, 2, 3] } },
        timestamp: Date.now(),
        isValid: false,
        details: null,
        metadata: undefined,
      };

      const error = new ValidationError('Complex context error', complexContext);

      expect(error.context).toEqual(complexContext);
      expect(error.context?.field).toBe('complexField');
      expect(error.context?.value).toEqual({ nested: { data: [1, 2, 3] } });
      expect(error.context?.timestamp).toBeTypeOf('number');
      expect(error.context?.isValid).toBe(false);
      expect(error.context?.details).toBe(null);
      expect(error.context?.metadata).toBeUndefined();
    });

    it('should handle empty context object', () => {
      const error = new ValidationError('Empty context error', {});

      expect(error.context).toEqual({});
      expect(Object.keys(error.context ?? {}).length).toBe(0);
    });

    it('should preserve error stack trace', () => {
      const error = new ValidationError('Stack trace test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
      expect(error.stack).toContain('Stack trace test');
    });

    it('should be serializable to JSON', () => {
      const context = { field: 'jsonTest', value: 42 };
      const error = new ValidationError('JSON serialization test', context);

      // Test that the error can be stringified
      const jsonString = JSON.stringify({
        name: error.name,
        message: error.message,
        context: error.context,
      });

      const parsed = JSON.parse(jsonString);
      expect(parsed.name).toBe('ValidationError');
      expect(parsed.message).toBe('JSON serialization test');
      expect(parsed.context).toEqual(context);
    });

    it('should handle special characters in message and context', () => {
      const specialMessage =
        'Error with special chars: αβγ 中文 🚨 "quotes" \\backslash\nNewline\tTab';
      const specialContext = {
        field: 'special-field-äöü',
        value: 'value with 🔥 emoji and \n newlines \t tabs',
        unicodeKey: '中文-key',
      };

      const error = new ValidationError(specialMessage, specialContext);

      expect(error.message).toBe(specialMessage);
      expect(error.context).toEqual(specialContext);
      expect(error.context?.field).toBe('special-field-äöü');
      expect(error.context?.unicodeKey).toBe('中文-key');
    });
  });

  describe('neverthrow integration edge cases', () => {
    it('should work with ok() function correctly', () => {
      const successValue = { data: 'test', count: 42 };
      const result = ok(successValue);

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);

      if (result.isOk()) {
        expect(result.value).toBe(successValue);
        expect(result.value.data).toBe('test');
        expect(result.value.count).toBe(42);
      }
    });

    it('should work with err() function correctly', () => {
      const error = new ValidationError('Test error');
      const result = err(error);

      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);

      if (result.isErr()) {
        expect(result.error).toBe(error);
        expect(result.error.message).toBe('Test error');
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle Result type with generic parameters', () => {
      interface TestData {
        id: string;
        name: string;
        optional?: number;
      }

      const successResult: Result<TestData, ValidationError> = ok({
        id: 'test-id',
        name: 'test-name',
        optional: 123,
      });

      const errorResult: Result<TestData, ValidationError> = err(
        new ValidationError('Test validation error', { field: 'name' }),
      );

      expect(successResult.isOk()).toBe(true);
      expect(errorResult.isErr()).toBe(true);

      if (successResult.isOk()) {
        expect(successResult.value.id).toBe('test-id');
        expect(successResult.value.name).toBe('test-name');
        expect(successResult.value.optional).toBe(123);
      }

      if (errorResult.isErr()) {
        expect(errorResult.error.message).toBe('Test validation error');
        expect(errorResult.error.context?.field).toBe('name');
      }
    });

    it('should handle undefined and null values correctly', () => {
      const undefinedResult = ok(undefined);
      const nullResult = ok(null);

      expect(undefinedResult.isOk()).toBe(true);
      expect(nullResult.isOk()).toBe(true);

      if (undefinedResult.isOk()) {
        expect(undefinedResult.value).toBeUndefined();
      }

      if (nullResult.isOk()) {
        expect(nullResult.value).toBe(null);
      }
    });

    it('should handle primitive types as success values', () => {
      const stringResult = ok('test string');
      const numberResult = ok(42);
      const booleanResult = ok(true);
      const arrayResult = ok([1, 2, 3]);

      expect(stringResult.isOk()).toBe(true);
      expect(numberResult.isOk()).toBe(true);
      expect(booleanResult.isOk()).toBe(true);
      expect(arrayResult.isOk()).toBe(true);

      if (stringResult.isOk()) expect(stringResult.value).toBe('test string');
      if (numberResult.isOk()) expect(numberResult.value).toBe(42);
      if (booleanResult.isOk()) expect(booleanResult.value).toBe(true);
      if (arrayResult.isOk()) expect(arrayResult.value).toEqual([1, 2, 3]);
    });

    it('should handle complex nested Result operations', () => {
      const createUser = (name: string): Result<{ id: string; name: string }, ValidationError> => {
        if (!name || name.trim().length === 0) {
          return err(new ValidationError('Name cannot be empty', { field: 'name', value: name }));
        }
        return ok({ id: `user-${Date.now()}`, name: name.trim() });
      };

      const processUser = (user: { id: string; name: string }): Result<string, ValidationError> => {
        if (user.name.length < 2) {
          return err(new ValidationError('Name too short', { field: 'name', minLength: 2 }));
        }
        return ok(`Processed user: ${user.name}`);
      };

      // Test successful flow
      const validResult = createUser('John Doe').andThen((user) => processUser(user));

      expect(validResult.isOk()).toBe(true);
      if (validResult.isOk()) {
        expect(validResult.value).toBe('Processed user: John Doe');
      }

      // Test error in first step
      const emptyNameResult = createUser('').andThen((user) => processUser(user));

      expect(emptyNameResult.isErr()).toBe(true);
      if (emptyNameResult.isErr()) {
        expect(emptyNameResult.error.message).toBe('Name cannot be empty');
        expect(emptyNameResult.error.context?.field).toBe('name');
      }

      // Test error in second step
      const shortNameResult = createUser('A').andThen((user) => processUser(user));

      expect(shortNameResult.isErr()).toBe(true);
      if (shortNameResult.isErr()) {
        expect(shortNameResult.error.message).toBe('Name too short');
        expect(shortNameResult.error.context?.field).toBe('name');
        expect(shortNameResult.error.context?.minLength).toBe(2);
      }
    });
  });

  describe('legacy compatibility aliases', () => {
    it('should support createSuccess alias', () => {
      const result = createSuccess('test data');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('test data');
      }
    });

    it('should support createFailure alias', () => {
      const error = new ValidationError('Test failure');
      const result = createFailure(error);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(error);
      }
    });

    it('should support success and failure aliases', () => {
      const successResult = success({ data: 'success' });
      const failureResult = failure(new ValidationError('failure'));

      expect(successResult.isOk()).toBe(true);
      expect(failureResult.isErr()).toBe(true);
    });
  });

  describe('error context edge cases', () => {
    it('should handle deeply nested context objects', () => {
      const deepContext = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep value',
                  array: [{ nested: true }, { nested: false }],
                },
              },
            },
          },
        },
        metadata: {
          timestamp: Date.now(),
          source: 'test',
        },
      };

      const error = new ValidationError('Deep context test', deepContext);

      expect(error.context).toEqual(deepContext);
      expect((error.context as any)?.level1?.level2?.level3?.level4?.level5?.value).toBe(
        'deep value',
      );
      expect((error.context as any)?.metadata?.source).toBe('test');
    });

    it('should handle context with circular references gracefully', () => {
      const circularContext: any = { field: 'test' };
      circularContext.self = circularContext;

      // Should not throw when creating the error
      expect(() => {
        const error = new ValidationError('Circular context test', circularContext);
        expect(error.context?.field).toBe('test');
        expect(error.context?.self).toBe(circularContext);
      }).not.toThrow();
    });

    it('should handle context with function values', () => {
      const contextWithFunction = {
        field: 'test',
        validator: () => true,
        transform: (x: number) => x * 2,
      };

      const error = new ValidationError('Function context test', contextWithFunction);

      expect(error.context?.field).toBe('test');
      expect(typeof error.context?.validator).toBe('function');
      expect(typeof error.context?.transform).toBe('function');

      // Test that functions in context are preserved
      if (error.context?.transform) {
        expect((error.context.transform as any)(5)).toBe(10);
      }
    });

    it('should handle context with Symbol and BigInt values', () => {
      const symbolKey = Symbol('test');
      const contextWithSpecialTypes = {
        field: 'special',
        symbol: symbolKey,
        bigint: BigInt(123456789012345678901234567890n),
        date: new Date(),
        regex: /test-pattern/gi,
      };

      const error = new ValidationError('Special types context test', contextWithSpecialTypes);

      expect(error.context?.field).toBe('special');
      expect(error.context?.symbol).toBe(symbolKey);
      expect(error.context?.bigint).toBe(BigInt(123456789012345678901234567890n));
      expect(error.context?.date).toBeInstanceOf(Date);
      expect(error.context?.regex).toBeInstanceOf(RegExp);
    });
  });

  describe('Result type inference and usage patterns', () => {
    it('should properly infer types in success scenarios', () => {
      const stringResult = ok('test');
      const numberResult = ok(42);
      const objectResult = ok({ name: 'test', age: 25 });

      // Type inference tests
      if (stringResult.isOk()) {
        // TypeScript should infer result.value as string
        expect(typeof stringResult.value).toBe('string');
        expect(stringResult.value.length).toBe(4);
      }

      if (numberResult.isOk()) {
        // TypeScript should infer result.value as number
        expect(typeof numberResult.value).toBe('number');
        expect(numberResult.value + 1).toBe(43);
      }

      if (objectResult.isOk()) {
        // TypeScript should infer result.value as the object type
        expect(typeof objectResult.value).toBe('object');
        expect(objectResult.value.name).toBe('test');
        expect(objectResult.value.age).toBe(25);
      }
    });

    it('should properly handle error type inference', () => {
      const validationError = new ValidationError('Validation failed');
      const customError = new Error('Custom error');

      const validationResult = err(validationError);
      const customResult = err(customError);

      if (validationResult.isErr()) {
        expect(validationResult.error).toBeInstanceOf(ValidationError);
        expect(validationResult.error.name).toBe('ValidationError');
      }

      if (customResult.isErr()) {
        expect(customResult.error).toBeInstanceOf(Error);
        expect(customResult.error.message).toBe('Custom error');
      }
    });
  });
});
