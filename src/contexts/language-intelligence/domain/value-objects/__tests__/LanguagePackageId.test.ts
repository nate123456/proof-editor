import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { LanguagePackageId } from '../LanguagePackageId.js';

describe('LanguagePackageId', () => {
  describe('create', () => {
    it('should create valid LanguagePackageId with letters and numbers', () => {
      const result = LanguagePackageId.create('package123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('package123');
      }
    });

    it('should create valid LanguagePackageId with hyphens and underscores', () => {
      const result = LanguagePackageId.create('package-name_123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('package-name_123');
      }
    });

    it('should trim whitespace from value', () => {
      const result = LanguagePackageId.create('  package123  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('package123');
      }
    });

    it('should accept minimum length of 3 characters', () => {
      const result = LanguagePackageId.create('abc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('abc');
      }
    });

    it('should accept maximum length of 100 characters', () => {
      const longId = 'a'.repeat(100);
      const result = LanguagePackageId.create(longId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(longId);
      }
    });

    it('should reject empty string', () => {
      const result = LanguagePackageId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Language package ID cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = LanguagePackageId.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID cannot be empty');
      }
    });

    it('should reject string shorter than 3 characters', () => {
      const result = LanguagePackageId.create('ab');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID must be at least 3 characters long');
      }
    });

    it('should reject string longer than 100 characters', () => {
      const longId = 'a'.repeat(101);
      const result = LanguagePackageId.create(longId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID cannot exceed 100 characters');
      }
    });

    it('should reject string with invalid characters', () => {
      const result = LanguagePackageId.create('package!name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Language package ID can only contain letters, numbers, dots, hyphens, and underscores',
        );
      }
    });

    it('should reject string with spaces', () => {
      const result = LanguagePackageId.create('package name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Language package ID can only contain letters, numbers, dots, hyphens, and underscores',
        );
      }
    });

    it('should reject string with special characters', () => {
      const result = LanguagePackageId.create('package@name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Language package ID can only contain letters, numbers, dots, hyphens, and underscores',
        );
      }
    });
  });

  describe('generate', () => {
    it('should generate unique LanguagePackageId', () => {
      const id1 = LanguagePackageId.generate();
      const id2 = LanguagePackageId.generate();

      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate ID with expected prefix', () => {
      const id = LanguagePackageId.generate();

      expect(id.getValue()).toMatch(/^pkg_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should generate ID with sufficient length', () => {
      const id = LanguagePackageId.generate();

      expect(id.getValue().length).toBeGreaterThanOrEqual(3);
    });

    it('should generate ID that passes validation', () => {
      const id = LanguagePackageId.generate();
      const result = LanguagePackageId.create(id.getValue());

      expect(result.isOk()).toBe(true);
    });
  });

  describe('fromNameAndVersion', () => {
    it('should create ID from valid name and version', () => {
      const result = LanguagePackageId.fromNameAndVersion('Modal Logic', '1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('modal-logic-1.0.0');
      }
    });

    it('should sanitize name with spaces', () => {
      const result = LanguagePackageId.fromNameAndVersion('Propositional Logic Package', '2.1.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('propositional-logic-package-2.1.3');
      }
    });

    it('should sanitize name with special characters', () => {
      const result = LanguagePackageId.fromNameAndVersion('Package@Name#123!', '1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('package-name-123-1.0.0');
      }
    });

    it('should sanitize version with special characters', () => {
      const result = LanguagePackageId.fromNameAndVersion('TestPackage', '1.0.0-beta+build');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('testpackage-1.0.0-beta');
      }
    });

    it('should reject empty name', () => {
      const result = LanguagePackageId.fromNameAndVersion('', '1.0.0');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package name cannot be empty');
      }
    });

    it('should reject whitespace-only name', () => {
      const result = LanguagePackageId.fromNameAndVersion('   ', '1.0.0');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package name cannot be empty');
      }
    });

    it('should reject empty version', () => {
      const result = LanguagePackageId.fromNameAndVersion('TestPackage', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package version cannot be empty');
      }
    });

    it('should reject whitespace-only version', () => {
      const result = LanguagePackageId.fromNameAndVersion('TestPackage', '   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Package version cannot be empty');
      }
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = LanguagePackageId.create('test-package-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('test-package-id');
      }
    });
  });

  describe('getDisplayName', () => {
    it('should convert underscores and hyphens to spaces', () => {
      const result = LanguagePackageId.create('modal_logic-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDisplayName()).toBe('modal logic package');
      }
    });

    it('should handle mixed separators', () => {
      const result = LanguagePackageId.create('test-package_name-1_0_0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDisplayName()).toBe('test package name 1 0 0');
      }
    });
  });

  describe('isGenerated', () => {
    it('should return true for generated IDs', () => {
      const id = LanguagePackageId.generate();

      expect(id.isGenerated()).toBe(true);
    });

    it('should return false for manually created IDs', () => {
      const result = LanguagePackageId.create('manual-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isGenerated()).toBe(false);
      }
    });

    it('should return false for IDs created from name and version', () => {
      const result = LanguagePackageId.fromNameAndVersion('Test Package', '1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isGenerated()).toBe(false);
      }
    });
  });

  describe('isUserDefined', () => {
    it('should return false for generated IDs', () => {
      const id = LanguagePackageId.generate();

      expect(id.isUserDefined()).toBe(false);
    });

    it('should return true for manually created IDs', () => {
      const result = LanguagePackageId.create('manual-package');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isUserDefined()).toBe(true);
      }
    });

    it('should return true for IDs created from name and version', () => {
      const result = LanguagePackageId.fromNameAndVersion('Test Package', '1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isUserDefined()).toBe(true);
      }
    });
  });

  describe('extractVersion', () => {
    it('should extract version from package ID with version', () => {
      const result = LanguagePackageId.fromNameAndVersion('TestPackage', '1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.extractVersion()).toBe('1.2.3');
      }
    });

    it('should extract version with pre-release info', () => {
      const result = LanguagePackageId.create('testpackage-1.2.3-alpha');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.extractVersion()).toBe('1.2.3-alpha');
      }
    });

    it('should return null for package ID without version', () => {
      const result = LanguagePackageId.create('testpackage');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.extractVersion()).toBeNull();
      }
    });

    it('should return null for generated package ID', () => {
      const id = LanguagePackageId.generate();

      expect(id.extractVersion()).toBeNull();
    });
  });

  describe('extractBaseName', () => {
    it('should extract base name from package ID with version', () => {
      const result = LanguagePackageId.fromNameAndVersion('TestPackage', '1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.extractBaseName()).toBe('testpackage');
      }
    });

    it('should return full ID for package without version', () => {
      const result = LanguagePackageId.create('testpackage');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.extractBaseName()).toBe('testpackage');
      }
    });

    it('should handle complex package names', () => {
      const result = LanguagePackageId.create('complex-package-name-1.2.3');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.extractBaseName()).toBe('complex-package-name');
      }
    });
  });

  describe('withVersion', () => {
    it('should create new ID with updated version', () => {
      const originalResult = LanguagePackageId.fromNameAndVersion('TestPackage', '1.0.0');

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const updatedResult = originalResult.value.withVersion('2.1.0');

        expect(updatedResult.isOk()).toBe(true);
        if (updatedResult.isOk()) {
          expect(updatedResult.value.getValue()).toBe('testpackage-2.1.0');
          expect(updatedResult.value.extractVersion()).toBe('2.1.0');
        }
      }
    });

    it('should work with package without existing version', () => {
      const originalResult = LanguagePackageId.create('testpackage');

      expect(originalResult.isOk()).toBe(true);
      if (originalResult.isOk()) {
        const updatedResult = originalResult.value.withVersion('1.0.0');

        expect(updatedResult.isOk()).toBe(true);
        if (updatedResult.isOk()) {
          expect(updatedResult.value.getValue()).toBe('testpackage-1.0.0');
        }
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical IDs', () => {
      const result1 = LanguagePackageId.create('same-id');
      const result2 = LanguagePackageId.create('same-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different IDs', () => {
      const result1 = LanguagePackageId.create('first-id');
      const result2 = LanguagePackageId.create('second-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return true for IDs with same trimmed value', () => {
      const result1 = LanguagePackageId.create('test-id');
      const result2 = LanguagePackageId.create('  test-id  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the ID value as string', () => {
      const result = LanguagePackageId.create('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('test-id');
      }
    });

    it('should return the generated ID value', () => {
      const id = LanguagePackageId.generate();

      expect(id.toString()).toBe(id.getValue());
    });
  });
});
