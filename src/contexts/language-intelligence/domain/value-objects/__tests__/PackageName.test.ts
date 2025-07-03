import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { PackageName } from '../PackageName.js';

describe('PackageName', () => {
  describe('create', () => {
    it('should create valid PackageName with letters and numbers', () => {
      const result = PackageName.create('Package123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Package123');
      }
    });

    it('should create valid PackageName with spaces and special characters', () => {
      const result = PackageName.create('Modal Logic Package-1.0_beta.2');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Modal Logic Package-1.0_beta.2');
      }
    });

    it('should trim whitespace from value', () => {
      const result = PackageName.create('  Package Name  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Package Name');
      }
    });

    it('should accept minimum length of 2 characters', () => {
      const result = PackageName.create('Ab');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Ab');
      }
    });

    it('should accept maximum length of 100 characters', () => {
      const longName = 'A'.repeat(100);
      const result = PackageName.create(longName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(longName);
      }
    });

    it('should reject empty string', () => {
      const result = PackageName.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Package name cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = PackageName.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package name cannot be empty');
      }
    });

    it('should reject string shorter than 2 characters', () => {
      const result = PackageName.create('A');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package name must be at least 2 characters long');
      }
    });

    it('should reject string longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = PackageName.create(longName);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package name cannot exceed 100 characters');
      }
    });

    it('should reject string with invalid characters', () => {
      const result = PackageName.create('Package@Name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Package name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
        );
      }
    });

    it('should reject string with special symbols', () => {
      const result = PackageName.create('Package#Name!');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Package name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
        );
      }
    });

    it('should accept allowed special characters', () => {
      const result = PackageName.create('Package-Name_1.0 beta');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Package-Name_1.0 beta');
      }
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = PackageName.create('Test Package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Test Package');
      }
    });
  });

  describe('getNormalizedValue', () => {
    it('should return lowercase trimmed value', () => {
      const result = PackageName.create('  Test Package  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getNormalizedValue()).toBe('test package');
      }
    });

    it('should handle mixed case', () => {
      const result = PackageName.create('Modal LOGIC Package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getNormalizedValue()).toBe('modal logic package');
      }
    });
  });

  describe('getDisplayName', () => {
    it('should return the original value for display', () => {
      const result = PackageName.create('Modal Logic Package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDisplayName()).toBe('Modal Logic Package');
      }
    });
  });

  describe('getSlug', () => {
    it('should convert to URL-friendly slug', () => {
      const result = PackageName.create('Modal Logic Package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('modal-logic-package');
      }
    });

    it('should handle special characters', () => {
      const result = PackageName.create('Package_Name-1.0 Beta');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('package-name-1-0-beta');
      }
    });

    it('should remove leading and trailing hyphens', () => {
      const result = PackageName.create('---Package Name---');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('package-name');
      }
    });

    it('should handle consecutive special characters', () => {
      const result = PackageName.create('Package...Name___1.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('package-name-1-0');
      }
    });
  });

  describe('isReservedName', () => {
    it('should return true for reserved names', () => {
      const reservedNames = [
        'system',
        'core',
        'builtin',
        'internal',
        'default',
        'base',
        'standard',
        'reserved',
      ];

      for (const name of reservedNames) {
        const result = PackageName.create(name);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isReservedName()).toBe(true);
        }
      }
    });

    it('should return true for reserved names in different cases', () => {
      const result1 = PackageName.create('SYSTEM');
      const result2 = PackageName.create('Core');
      const result3 = PackageName.create('DEFAULT');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        expect(result1.value.isReservedName()).toBe(true);
        expect(result2.value.isReservedName()).toBe(true);
        expect(result3.value.isReservedName()).toBe(true);
      }
    });

    it('should return false for non-reserved names', () => {
      const result = PackageName.create('Modal Logic');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isReservedName()).toBe(false);
      }
    });

    it('should return false for names containing reserved words', () => {
      const result = PackageName.create('system-extended');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isReservedName()).toBe(false);
      }
    });
  });

  describe('containsKeyword', () => {
    it('should find keyword case-insensitively', () => {
      const result = PackageName.create('Modal Logic Package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageName = result.value;
        expect(packageName.containsKeyword('modal')).toBe(true);
        expect(packageName.containsKeyword('LOGIC')).toBe(true);
        expect(packageName.containsKeyword('package')).toBe(true);
        expect(packageName.containsKeyword('quantum')).toBe(false);
      }
    });

    it('should handle partial matches', () => {
      const result = PackageName.create('Propositional Logic');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.containsKeyword('position')).toBe(true);
        expect(result.value.containsKeyword('logic')).toBe(true);
        expect(result.value.containsKeyword('prop')).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical normalized names', () => {
      const result1 = PackageName.create('Modal Logic');
      const result2 = PackageName.create('modal logic');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return true for names with different casing', () => {
      const result1 = PackageName.create('MODAL LOGIC');
      const result2 = PackageName.create('Modal Logic');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return true for names with different whitespace', () => {
      const result1 = PackageName.create('Modal Logic');
      const result2 = PackageName.create('  Modal Logic  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different names', () => {
      const result1 = PackageName.create('Modal Logic');
      const result2 = PackageName.create('Propositional Logic');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the original value as string', () => {
      const result = PackageName.create('Modal Logic Package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('Modal Logic Package');
      }
    });

    it('should preserve case and formatting', () => {
      const result = PackageName.create('My-Package_1.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('My-Package_1.0');
      }
    });
  });
});
