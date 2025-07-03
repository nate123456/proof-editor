import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { ValidationResultId } from '../ValidationResultId.js';

describe('ValidationResultId', () => {
  describe('create', () => {
    it('should create valid ValidationResultId', () => {
      const result = ValidationResultId.create('valid-result-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-result-id');
      }
    });

    it('should trim whitespace from value', () => {
      const result = ValidationResultId.create('  valid-result-id  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-result-id');
      }
    });

    it('should accept minimum length of 5 characters', () => {
      const result = ValidationResultId.create('12345');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('12345');
      }
    });

    it('should reject empty string', () => {
      const result = ValidationResultId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Validation result ID cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = ValidationResultId.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Validation result ID cannot be empty');
      }
    });

    it('should reject string shorter than 5 characters', () => {
      const result = ValidationResultId.create('abcd');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Validation result ID must be at least 5 characters long'
        );
      }
    });

    it('should reject string that becomes too short after trimming', () => {
      const result = ValidationResultId.create('  abc  ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Validation result ID must be at least 5 characters long'
        );
      }
    });
  });

  describe('generate', () => {
    it('should generate unique ValidationResultId', () => {
      const id1 = ValidationResultId.generate();
      const id2 = ValidationResultId.generate();

      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate ID with expected prefix', () => {
      const id = ValidationResultId.generate();

      expect(id.getValue()).toMatch(/^vr_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should generate ID with sufficient length', () => {
      const id = ValidationResultId.generate();

      expect(id.getValue().length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = ValidationResultId.create('test-result-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('test-result-id');
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical IDs', () => {
      const result1 = ValidationResultId.create('same-id');
      const result2 = ValidationResultId.create('same-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different IDs', () => {
      const result1 = ValidationResultId.create('first-id');
      const result2 = ValidationResultId.create('second-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return true for IDs with same trimmed value', () => {
      const result1 = ValidationResultId.create('test-id');
      const result2 = ValidationResultId.create('  test-id  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the ID value as string', () => {
      const result = ValidationResultId.create('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('test-id');
      }
    });

    it('should return the generated ID value', () => {
      const id = ValidationResultId.generate();

      expect(id.toString()).toBe(id.getValue());
    });
  });
});
