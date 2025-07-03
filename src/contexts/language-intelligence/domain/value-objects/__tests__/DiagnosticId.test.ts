import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { DiagnosticId } from '../DiagnosticId.js';

describe('DiagnosticId', () => {
  describe('create', () => {
    it('should create valid DiagnosticId', () => {
      const result = DiagnosticId.create('valid-diagnostic-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-diagnostic-id');
      }
    });

    it('should trim whitespace from value', () => {
      const result = DiagnosticId.create('  valid-diagnostic-id  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-diagnostic-id');
      }
    });

    it('should accept minimum length of 3 characters', () => {
      const result = DiagnosticId.create('abc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('abc');
      }
    });

    it('should reject empty string', () => {
      const result = DiagnosticId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Diagnostic ID cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = DiagnosticId.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic ID cannot be empty');
      }
    });

    it('should reject string shorter than 3 characters', () => {
      const result = DiagnosticId.create('ab');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic ID must be at least 3 characters long');
      }
    });

    it('should reject string that becomes too short after trimming', () => {
      const result = DiagnosticId.create('  a  ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic ID must be at least 3 characters long');
      }
    });
  });

  describe('generate', () => {
    it('should generate unique DiagnosticId', () => {
      const id1 = DiagnosticId.generate();
      const id2 = DiagnosticId.generate();

      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate ID with expected prefix', () => {
      const id = DiagnosticId.generate();

      expect(id.getValue()).toMatch(/^diag_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should generate ID with sufficient length', () => {
      const id = DiagnosticId.generate();

      expect(id.getValue().length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = DiagnosticId.create('test-diagnostic-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('test-diagnostic-id');
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical IDs', () => {
      const result1 = DiagnosticId.create('same-id');
      const result2 = DiagnosticId.create('same-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different IDs', () => {
      const result1 = DiagnosticId.create('first-id');
      const result2 = DiagnosticId.create('second-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return true for IDs with same trimmed value', () => {
      const result1 = DiagnosticId.create('test-id');
      const result2 = DiagnosticId.create('  test-id  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the ID value as string', () => {
      const result = DiagnosticId.create('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('test-id');
      }
    });

    it('should return the generated ID value', () => {
      const id = DiagnosticId.generate();

      expect(id.toString()).toBe(id.getValue());
    });
  });
});
