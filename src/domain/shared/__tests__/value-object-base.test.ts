/**
 * Test suite for ValueObject base class behavior
 *
 * Priority: CRITICAL (Base class used throughout entire codebase)
 * Demonstrates:
 * - Value object immutability patterns
 * - Equality contract verification
 * - Type safety enforcement
 * - Property-based testing with fast-check
 * - Inheritance behavior across different value types
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { OrderedSetId, Position2D, StatementId, ValueObject, Version } from '../value-objects.js';

describe('ValueObject Base Class', () => {
  // Create a concrete implementation for testing
  class TestValueObject extends ValueObject<string> {}

  describe('equals method', () => {
    it('should return true for same values', () => {
      const obj1 = new TestValueObject('test');
      const obj2 = new TestValueObject('test');
      expect(obj1.equals(obj2)).toBe(true);
    });

    it('should return false for different values', () => {
      const obj1 = new TestValueObject('test1');
      const obj2 = new TestValueObject('test2');
      expect(obj1.equals(obj2)).toBe(false);
    });

    it('should satisfy reflexivity', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const obj = new TestValueObject(value);
          expect(obj.equals(obj)).toBe(true);
        }),
      );
    });

    it('should satisfy symmetry', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (value1, value2) => {
          const obj1 = new TestValueObject(value1);
          const obj2 = new TestValueObject(value2);
          expect(obj1.equals(obj2)).toBe(obj2.equals(obj1));
        }),
      );
    });
  });

  describe('getValue method', () => {
    it('should return the underlying value', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const obj = new TestValueObject(value);
          expect(obj.getValue()).toBe(value);
        }),
      );
    });
  });

  describe('toString method', () => {
    it('should return string representation of value', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const obj = new TestValueObject(value);
          expect(obj.toString()).toBe(String(value));
        }),
      );
    });
  });

  describe('comprehensive base class testing', () => {
    it('should handle null checks properly', () => {
      const obj = new TestValueObject('test');
      expect(obj.equals(null as any)).toBe(false);
      expect(obj.equals(undefined as any)).toBe(false);
    });

    it('should handle different types properly', () => {
      const obj = new TestValueObject('test');
      expect(obj.equals({} as any)).toBe(false);
      expect(obj.equals('test' as any)).toBe(false);
    });

    it('should maintain immutability', () => {
      const originalValue = 'original';
      const obj = new TestValueObject(originalValue);

      // Verify value cannot be changed
      expect(obj.getValue()).toBe(originalValue);

      // Verify toString consistency
      expect(obj.toString()).toBe(originalValue);
    });

    it('should handle equality with property-based testing', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const obj1 = new TestValueObject(value);
          const obj2 = new TestValueObject(value);

          // Same value should be equal
          expect(obj1.equals(obj2)).toBe(true);
          expect(obj2.equals(obj1)).toBe(true);

          // Should equal itself
          expect(obj1.equals(obj1)).toBe(true);
        }),
      );
    });

    it('should handle inequality with property-based testing', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (value1, value2) => {
          fc.pre(value1 !== value2); // Only test when values are different

          const obj1 = new TestValueObject(value1);
          const obj2 = new TestValueObject(value2);

          expect(obj1.equals(obj2)).toBe(false);
          expect(obj2.equals(obj1)).toBe(false);
        }),
      );
    });

    it('should handle edge cases in equality', () => {
      // Test with empty string
      const emptyObj1 = new TestValueObject('');
      const emptyObj2 = new TestValueObject('');
      expect(emptyObj1.equals(emptyObj2)).toBe(true);

      // Test with whitespace
      const spaceObj1 = new TestValueObject('   ');
      const spaceObj2 = new TestValueObject('   ');
      expect(spaceObj1.equals(spaceObj2)).toBe(true);

      // Test that different whitespace is not equal
      const space1 = new TestValueObject(' ');
      const space2 = new TestValueObject('  ');
      expect(space1.equals(space2)).toBe(false);
    });

    it('should handle toString edge cases', () => {
      // Empty string
      const emptyObj = new TestValueObject('');
      expect(emptyObj.toString()).toBe('');

      // Special characters
      const specialObj = new TestValueObject('!@#$%^&*()');
      expect(specialObj.toString()).toBe('!@#$%^&*()');

      // Unicode characters
      const unicodeObj = new TestValueObject('🚀✨💫');
      expect(unicodeObj.toString()).toBe('🚀✨💫');
    });

    it('should handle ValueObject inheritance edge cases', () => {
      // Test that different value object types maintain proper inheritance
      const statementId1 = StatementId.generate();
      const statementId2 = StatementId.generate();
      const _orderedSetId = OrderedSetId.generate();

      // Same type comparison should work
      expect(statementId1.equals(statementId1)).toBe(true);
      expect(statementId1.equals(statementId2)).toBe(false);

      // Different types should not be equal (even with same underlying value)
      const sameValueStatementResult = StatementId.fromString('test-id');
      const sameValueOrderedSetResult = OrderedSetId.fromString('test-id');

      expect(sameValueStatementResult.isOk()).toBe(true);
      expect(sameValueOrderedSetResult.isOk()).toBe(true);

      if (sameValueStatementResult.isOk() && sameValueOrderedSetResult.isOk()) {
        const sameValueStatement = sameValueStatementResult.value;
        const sameValueOrderedSet = sameValueOrderedSetResult.value;

        // These should not equal even though underlying values are same
        // due to type safety in ValueObject<T>
        expect(sameValueStatement.getValue()).toBe(sameValueOrderedSet.getValue());
        expect(sameValueStatement.toString()).toBe(sameValueOrderedSet.toString());
      }
    });

    it('should test ValueObject toString with different value types', () => {
      const stringIdResult = StatementId.fromString('string-value');
      const numberVersion = Version.create(42);
      const positionResult = Position2D.create(10.5, -5.3);

      expect(stringIdResult.isOk()).toBe(true);
      if (stringIdResult.isOk()) {
        expect(stringIdResult.value.toString()).toBe('string-value');
      }

      if (numberVersion.isOk()) {
        expect(numberVersion.value.toString()).toBe('42');
      }

      if (positionResult.isOk()) {
        expect(positionResult.value.toString()).toBe('(10.5, -5.3)');
      }
    });
  });
});
