import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { AnalysisReportId } from '../AnalysisReportId.js';

describe('AnalysisReportId', () => {
  describe('create', () => {
    it('should create valid AnalysisReportId', () => {
      const result = AnalysisReportId.create('valid-report-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-report-id');
      }
    });

    it('should trim whitespace from value', () => {
      const result = AnalysisReportId.create('  valid-report-id  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-report-id');
      }
    });

    it('should accept minimum length of 5 characters', () => {
      const result = AnalysisReportId.create('12345');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('12345');
      }
    });

    it('should reject empty string', () => {
      const result = AnalysisReportId.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Analysis report ID cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = AnalysisReportId.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Analysis report ID cannot be empty');
      }
    });

    it('should reject string shorter than 5 characters', () => {
      const result = AnalysisReportId.create('abc');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Analysis report ID must be at least 5 characters long');
      }
    });

    it('should reject string that becomes too short after trimming', () => {
      const result = AnalysisReportId.create('  ab  ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Analysis report ID must be at least 5 characters long');
      }
    });
  });

  describe('generate', () => {
    it('should generate unique AnalysisReportId', () => {
      const id1 = AnalysisReportId.generate();
      const id2 = AnalysisReportId.generate();

      expect(id1.getValue()).not.toBe(id2.getValue());
    });

    it('should generate ID with expected prefix', () => {
      const id = AnalysisReportId.generate();

      expect(id.getValue()).toMatch(/^ar_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should generate ID with sufficient length', () => {
      const id = AnalysisReportId.generate();

      expect(id.getValue().length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = AnalysisReportId.create('test-report-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('test-report-id');
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical IDs', () => {
      const result1 = AnalysisReportId.create('same-id');
      const result2 = AnalysisReportId.create('same-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different IDs', () => {
      const result1 = AnalysisReportId.create('first-id');
      const result2 = AnalysisReportId.create('second-id');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return true for IDs with same trimmed value', () => {
      const result1 = AnalysisReportId.create('test-id');
      const result2 = AnalysisReportId.create('  test-id  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the ID value as string', () => {
      const result = AnalysisReportId.create('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('test-id');
      }
    });

    it('should return the generated ID value', () => {
      const id = AnalysisReportId.generate();

      expect(id.toString()).toBe(id.getValue());
    });
  });
});
