import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { InferenceRuleId } from '../InferenceRuleId.js';

describe('InferenceRuleId', () => {
  describe('create', () => {
    it('should create valid InferenceRuleId with letters and numbers', () => {
      const result = InferenceRuleId.create('rule123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rule123');
      }
    });

    it('should create valid InferenceRuleId with hyphens and underscores', () => {
      const result = InferenceRuleId.create('rule-name_123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rule-name_123');
      }
    });

    it('should trim whitespace from value', () => {
      const result = InferenceRuleId.create('  rule123  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rule123');
      }
    });

    it('should accept minimum length of 3 characters', () => {
      const result = InferenceRuleId.create('abc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('abc');
      }
    });

    it('should reject empty string', () => {
      const result = InferenceRuleId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Inference rule ID cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = InferenceRuleId.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Inference rule ID cannot be empty');
      }
    });

    it('should reject string shorter than 3 characters', () => {
      const result = InferenceRuleId.create('ab');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Inference rule ID must be at least 3 characters long');
      }
    });

    it('should reject string with invalid characters', () => {
      const result = InferenceRuleId.create('rule@name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Inference rule ID can only contain letters, numbers, hyphens, and underscores',
        );
      }
    });

    it('should reject string with spaces', () => {
      const result = InferenceRuleId.create('rule name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Inference rule ID can only contain letters, numbers, hyphens, and underscores',
        );
      }
    });

    it('should reject string with special characters', () => {
      const result = InferenceRuleId.create('rule.name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Inference rule ID can only contain letters, numbers, hyphens, and underscores',
        );
      }
    });
  });

  describe('generate', () => {
    it('should generate unique InferenceRuleId', () => {
      const id1 = InferenceRuleId.generate();
      const id2 = InferenceRuleId.generate();

      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate ID with expected prefix', () => {
      const id = InferenceRuleId.generate();

      expect(id.getValue()).toMatch(/^rule_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should generate ID with sufficient length', () => {
      const id = InferenceRuleId.generate();

      expect(id.getValue().length).toBeGreaterThanOrEqual(3);
    });

    it('should generate ID that passes validation', () => {
      const id = InferenceRuleId.generate();
      const result = InferenceRuleId.create(id.getValue());

      expect(result.isOk()).toBe(true);
    });
  });

  describe('fromName', () => {
    it('should create ID from valid name', () => {
      const result = InferenceRuleId.fromName('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('modus-ponens');
      }
    });

    it('should sanitize name with multiple spaces', () => {
      const result = InferenceRuleId.fromName('Multiple   Spaces   Rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('multiple-spaces-rule');
      }
    });

    it('should sanitize name with special characters', () => {
      const result = InferenceRuleId.fromName('Rule@Name#123!');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rulename123');
      }
    });

    it('should remove leading and trailing hyphens', () => {
      const result = InferenceRuleId.fromName('---Rule Name---');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rule-name');
      }
    });

    it('should collapse multiple hyphens', () => {
      const result = InferenceRuleId.fromName('Rule----Name');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rule-name');
      }
    });

    it('should reject empty name', () => {
      const result = InferenceRuleId.fromName('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule name cannot be empty');
      }
    });

    it('should reject whitespace-only name', () => {
      const result = InferenceRuleId.fromName('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule name cannot be empty');
      }
    });

    it('should reject name that becomes too short after sanitization', () => {
      const result = InferenceRuleId.fromName('!@');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Sanitized rule name too short');
      }
    });

    it('should handle name with numbers', () => {
      const result = InferenceRuleId.fromName('Rule 123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('rule-123');
      }
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = InferenceRuleId.create('test-rule-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('test-rule-id');
      }
    });
  });

  describe('isGenerated', () => {
    it('should return true for generated IDs', () => {
      const id = InferenceRuleId.generate();

      expect(id.isGenerated()).toBe(true);
    });

    it('should return false for manually created IDs', () => {
      const result = InferenceRuleId.create('manual-rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isGenerated()).toBe(false);
      }
    });

    it('should return false for IDs created from names', () => {
      const result = InferenceRuleId.fromName('Test Rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isGenerated()).toBe(false);
      }
    });
  });

  describe('isUserDefined', () => {
    it('should return false for generated IDs', () => {
      const id = InferenceRuleId.generate();

      expect(id.isUserDefined()).toBe(false);
    });

    it('should return true for manually created IDs', () => {
      const result = InferenceRuleId.create('manual-rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isUserDefined()).toBe(true);
      }
    });

    it('should return true for IDs created from names', () => {
      const result = InferenceRuleId.fromName('Test Rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isUserDefined()).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical IDs', () => {
      const result1 = InferenceRuleId.create('same-id');
      const result2 = InferenceRuleId.create('same-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different IDs', () => {
      const result1 = InferenceRuleId.create('first-id');
      const result2 = InferenceRuleId.create('second-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return true for IDs with same trimmed value', () => {
      const result1 = InferenceRuleId.create('test-id');
      const result2 = InferenceRuleId.create('  test-id  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the ID value as string', () => {
      const result = InferenceRuleId.create('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('test-id');
      }
    });

    it('should return the generated ID value', () => {
      const id = InferenceRuleId.generate();

      expect(id.toString()).toBe(id.getValue());
    });
  });
});
