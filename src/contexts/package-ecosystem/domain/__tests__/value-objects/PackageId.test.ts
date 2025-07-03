/**
 * Tests for PackageId value object
 *
 * Focuses on:
 * - Package ID creation and validation
 * - Character set restrictions (lowercase, numbers, hyphens)
 * - Length constraints
 * - Format validation (no consecutive hyphens, start/end restrictions)
 * - Error conditions and edge cases
 * - Equality comparison and serialization
 * - High coverage for all validation rules
 */

import { describe, expect, it } from 'vitest';

import { PackageValidationError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';

describe('PackageId', () => {
  describe('create', () => {
    it('should create valid package ID with lowercase letters', () => {
      const result = PackageId.create('test-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('test-package');
      }
    });

    it('should create valid package ID with numbers', () => {
      const result = PackageId.create('package123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('package123');
      }
    });

    it('should create valid package ID with mixed letters, numbers, and hyphens', () => {
      const result = PackageId.create('test-package-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('test-package-123');
      }
    });

    it('should create valid package ID with single character', () => {
      const result = PackageId.create('a');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('a');
      }
    });

    it('should create valid package ID with maximum length', () => {
      const maxLength = 'a'.repeat(100);
      const result = PackageId.create(maxLength);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe(maxLength);
      }
    });

    it('should trim whitespace and create valid package ID', () => {
      const result = PackageId.create('  test-package  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('test-package');
      }
    });

    it('should fail with empty string', () => {
      const result = PackageId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot be empty');
      }
    });

    it('should fail with whitespace-only string', () => {
      const result = PackageId.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot be empty');
      }
    });

    it('should fail with package ID exceeding maximum length', () => {
      const tooLong = 'a'.repeat(101);
      const result = PackageId.create(tooLong);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot exceed 100 characters');
      }
    });

    it('should fail with uppercase letters', () => {
      const result = PackageId.create('Test-Package');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Package ID must contain only lowercase letters, numbers, and hyphens',
        );
      }
    });

    it('should fail with special characters', () => {
      const specialChars = [
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        '+',
        '=',
        '[',
        ']',
        '{',
        '}',
        '|',
        '\\',
        ':',
        ';',
        '"',
        "'",
        '<',
        '>',
        ',',
        '.',
        '?',
        '/',
        '`',
        '~',
      ];

      for (const char of specialChars) {
        const result = PackageId.create(`test${char}package`);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe(
            'Package ID must contain only lowercase letters, numbers, and hyphens',
          );
        }
      }
    });

    it('should fail with spaces', () => {
      const result = PackageId.create('test package');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Package ID must contain only lowercase letters, numbers, and hyphens',
        );
      }
    });

    it('should fail with underscores', () => {
      const result = PackageId.create('test_package');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Package ID must contain only lowercase letters, numbers, and hyphens',
        );
      }
    });

    it('should fail when starting with hyphen', () => {
      const result = PackageId.create('-test-package');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot start or end with hyphen');
      }
    });

    it('should fail when ending with hyphen', () => {
      const result = PackageId.create('test-package-');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot start or end with hyphen');
      }
    });

    it('should fail when starting and ending with hyphen', () => {
      const result = PackageId.create('-test-package-');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot start or end with hyphen');
      }
    });

    it('should fail with consecutive hyphens', () => {
      const result = PackageId.create('test--package');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot contain consecutive hyphens');
      }
    });

    it('should fail with multiple consecutive hyphens', () => {
      const result = PackageId.create('test---package');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot contain consecutive hyphens');
      }
    });

    it('should fail with consecutive hyphens at different positions', () => {
      const testCases = ['test--package', 'test-package--more', 'start--middle--end', 'a--b'];

      for (const testCase of testCases) {
        const result = PackageId.create(testCase);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package ID cannot contain consecutive hyphens');
        }
      }
    });

    it('should handle edge case with single hyphen', () => {
      const result = PackageId.create('-');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot start or end with hyphen');
      }
    });

    it('should handle edge case with double hyphen', () => {
      const result = PackageId.create('--');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Package ID cannot start or end with hyphen');
      }
    });

    describe('valid package ID examples', () => {
      const validIds = [
        'a',
        'ab',
        'abc',
        'test',
        'test-package',
        'test-package-123',
        'my-awesome-package',
        'package123',
        '123package',
        'a-b-c-d-e-f',
        'very-long-package-name-with-many-hyphens',
        '1-2-3-4-5',
        'x'.repeat(100), // max length
      ];

      it.each(validIds)('should accept valid package ID: %s', (validId) => {
        const result = PackageId.create(validId);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('invalid package ID examples', () => {
      const invalidIds = [
        { id: '', reason: 'empty string' },
        { id: '   ', reason: 'whitespace only' },
        { id: 'Test', reason: 'uppercase letter' },
        { id: 'test_package', reason: 'underscore' },
        { id: 'test package', reason: 'space' },
        { id: 'test.package', reason: 'period' },
        { id: 'test@package', reason: 'at symbol' },
        { id: '-test', reason: 'starts with hyphen' },
        { id: 'test-', reason: 'ends with hyphen' },
        { id: 'test--package', reason: 'consecutive hyphens' },
        { id: 'x'.repeat(101), reason: 'too long' },
      ];

      it.each(invalidIds)('should reject invalid package ID: $id ($reason)', ({ id }) => {
        const result = PackageId.create(id);
        expect(result.isErr()).toBe(true);
      });
    });
  });

  describe('toString', () => {
    it('should return the package ID string', () => {
      const result = PackageId.create('test-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('test-package');
      }
    });

    it('should return trimmed string', () => {
      const result = PackageId.create('  test-package  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toString()).toBe('test-package');
      }
    });
  });

  describe('equals', () => {
    it('should be equal to itself', () => {
      const result = PackageId.create('test-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.equals(packageId)).toBe(true);
      }
    });

    it('should be equal to another PackageId with same value', () => {
      const result1 = PackageId.create('test-package');
      const result2 = PackageId.create('test-package');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const packageId1 = result1.value;
        const packageId2 = result2.value;
        expect(packageId1.equals(packageId2)).toBe(true);
        expect(packageId2.equals(packageId1)).toBe(true);
      }
    });

    it('should be equal after trimming whitespace', () => {
      const result1 = PackageId.create('test-package');
      const result2 = PackageId.create('  test-package  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const packageId1 = result1.value;
        const packageId2 = result2.value;
        expect(packageId1.equals(packageId2)).toBe(true);
      }
    });

    it('should not be equal to PackageId with different value', () => {
      const result1 = PackageId.create('test-package');
      const result2 = PackageId.create('other-package');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const packageId1 = result1.value;
        const packageId2 = result2.value;
        expect(packageId1.equals(packageId2)).toBe(false);
        expect(packageId2.equals(packageId1)).toBe(false);
      }
    });

    it('should distinguish similar but different package IDs', () => {
      const testPairs = [
        ['test-package', 'test-packages'],
        ['package-1', 'package-2'],
        ['my-package', 'my-packages'],
        ['a', 'aa'],
        ['test', 'tests'],
      ];

      for (const [id1, id2] of testPairs) {
        const result1 = PackageId.create(id1);
        const result2 = PackageId.create(id2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const packageId1 = result1.value;
          const packageId2 = result2.value;
          expect(packageId1.equals(packageId2)).toBe(false);
        }
      }
    });
  });

  describe('toJSON', () => {
    it('should return the package ID string in JSON format', () => {
      const result = PackageId.create('test-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toJSON()).toBe('test-package');
      }
    });

    it('should return trimmed string in JSON format', () => {
      const result = PackageId.create('  test-package  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toJSON()).toBe('test-package');
      }
    });

    it('should be serializable with JSON.stringify', () => {
      const result = PackageId.create('test-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageId = result.value;
        const jsonString = JSON.stringify({ id: packageId });
        expect(jsonString).toBe('{"id":"test-package"}');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should work in collections and maps', () => {
      const packageIds = [
        PackageId.create('package-a'),
        PackageId.create('package-b'),
        PackageId.create('package-c'),
      ];

      expect(packageIds.every((result) => result.isOk())).toBe(true);

      if (packageIds.every((result) => result.isOk())) {
        const ids = packageIds
          .map((result) => (result.isOk() ? result.value : undefined))
          .filter(Boolean) as PackageId[];

        // Test with Set
        const idSet = new Set(ids.map((id) => id.toString()));
        expect(idSet.size).toBe(3);
        expect(idSet.has('package-a')).toBe(true);
        expect(idSet.has('package-b')).toBe(true);
        expect(idSet.has('package-c')).toBe(true);

        // Test with Map
        const idMap = new Map(ids.map((id) => [id.toString(), id]));
        expect(idMap.size).toBe(3);
        expect(idMap.get('package-a')?.toString()).toBe('package-a');
      }
    });

    it('should maintain equality across different creation patterns', () => {
      const directResult = PackageId.create('my-package');
      const trimmedResult = PackageId.create('  my-package  ');

      expect(directResult.isOk()).toBe(true);
      expect(trimmedResult.isOk()).toBe(true);

      if (directResult.isOk() && trimmedResult.isOk()) {
        const directId = directResult.value;
        const trimmedId = trimmedResult.value;

        expect(directId.equals(trimmedId)).toBe(true);
        expect(directId.toString()).toBe(trimmedId.toString());
        expect(directId.toJSON()).toBe(trimmedId.toJSON());
      }
    });
  });
});
