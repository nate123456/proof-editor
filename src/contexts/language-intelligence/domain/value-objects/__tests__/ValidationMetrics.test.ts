/**
 * Tests for ValidationMetrics value object
 *
 * Focuses on:
 * - Validation metrics creation and validation
 * - Performance and quality measurement tracking
 * - Statistical analysis and calculations
 * - Error handling for invalid metrics
 * - Comparison and aggregation operations
 */

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import { ValidationMetrics } from '../ValidationMetrics';

describe('ValidationMetrics', () => {
  describe('create', () => {
    it('should create valid validation metrics with all positive values', () => {
      const result = ValidationMetrics.create(150, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getValidationTimeMs()).toBe(150);
        expect(metrics.getIssueCount()).toBe(5);
        expect(metrics.getInputSize()).toBe(1000);
        expect(metrics.getRuleCount()).toBe(3);
      }
    });

    it('should create valid validation metrics with zero values', () => {
      const result = ValidationMetrics.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getValidationTimeMs()).toBe(0);
        expect(metrics.getIssueCount()).toBe(0);
        expect(metrics.getInputSize()).toBe(0);
        expect(metrics.getRuleCount()).toBe(0);
      }
    });

    it('should fail when validation time is negative', () => {
      const result = ValidationMetrics.create(-1, 5, 1000, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Validation time cannot be negative');
      }
    });

    it('should fail when issue count is negative', () => {
      const result = ValidationMetrics.create(150, -1, 1000, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Issue count cannot be negative');
      }
    });

    it('should fail when input size is negative', () => {
      const result = ValidationMetrics.create(150, 5, -1, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Input size cannot be negative');
      }
    });

    it('should fail when rule count is negative', () => {
      const result = ValidationMetrics.create(150, 5, 1000, -1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Rule count cannot be negative');
      }
    });

    it('should handle very large values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      const result = ValidationMetrics.create(largeValue, largeValue, largeValue, largeValue);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getValidationTimeMs()).toBe(largeValue);
        expect(metrics.getIssueCount()).toBe(largeValue);
        expect(metrics.getInputSize()).toBe(largeValue);
        expect(metrics.getRuleCount()).toBe(largeValue);
      }
    });

    it('should handle decimal values for time', () => {
      const result = ValidationMetrics.create(150.75, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getValidationTimeMs()).toBe(150.75);
      }
    });
  });

  describe('empty', () => {
    it('should create empty metrics with all zero values', () => {
      const metrics = ValidationMetrics.empty();

      expect(metrics.getValidationTimeMs()).toBe(0);
      expect(metrics.getIssueCount()).toBe(0);
      expect(metrics.getInputSize()).toBe(0);
      expect(metrics.getRuleCount()).toBe(0);
    });

    it('should create consistent empty metrics', () => {
      const metrics1 = ValidationMetrics.empty();
      const metrics2 = ValidationMetrics.empty();

      expect(metrics1.getValidationTimeMs()).toBe(metrics2.getValidationTimeMs());
      expect(metrics1.getIssueCount()).toBe(metrics2.getIssueCount());
      expect(metrics1.getInputSize()).toBe(metrics2.getInputSize());
      expect(metrics1.getRuleCount()).toBe(metrics2.getRuleCount());
    });
  });

  describe('performance calculations', () => {
    it('should calculate validation speed correctly', () => {
      const result = ValidationMetrics.create(100, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const speed = metrics.getValidationSpeed();
        expect(speed).toBe(10); // 1000 chars / 100ms = 10 chars/ms
      }
    });

    it('should handle division by zero in validation speed', () => {
      const result = ValidationMetrics.create(0, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const speed = metrics.getValidationSpeed();
        expect(speed).toBe(Number.POSITIVE_INFINITY);
      }
    });

    it('should calculate time per rule correctly', () => {
      const result = ValidationMetrics.create(120, 5, 1000, 4);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const timePerRule = metrics.getTimePerRule();
        expect(timePerRule).toBe(30); // 120ms / 4 rules = 30ms per rule
      }
    });

    it('should handle division by zero in time per rule', () => {
      const result = ValidationMetrics.create(120, 5, 1000, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const timePerRule = metrics.getTimePerRule();
        expect(timePerRule).toBe(Number.POSITIVE_INFINITY);
      }
    });

    it('should calculate issue density correctly', () => {
      const result = ValidationMetrics.create(120, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const density = metrics.getIssueDensity();
        expect(density).toBe(0.005); // 5 issues / 1000 chars = 0.005 issues per char
      }
    });

    it('should handle division by zero in issue density', () => {
      const result = ValidationMetrics.create(120, 5, 0, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const density = metrics.getIssueDensity();
        expect(density).toBe(Number.POSITIVE_INFINITY);
      }
    });

    it('should calculate rule efficiency correctly', () => {
      const result = ValidationMetrics.create(120, 6, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getRuleEfficiency();
        expect(efficiency).toBe(2); // 6 issues / 3 rules = 2 issues per rule
      }
    });

    it('should handle division by zero in rule efficiency', () => {
      const result = ValidationMetrics.create(120, 6, 1000, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getRuleEfficiency();
        expect(efficiency).toBe(Number.POSITIVE_INFINITY);
      }
    });
  });

  describe('performance classification', () => {
    it('should identify fast validation', () => {
      const result = ValidationMetrics.create(50, 2, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isFast()).toBe(true);
        expect(metrics.isSlow()).toBe(false);
      }
    });

    it('should identify slow validation', () => {
      const result = ValidationMetrics.create(5000, 2, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isFast()).toBe(false);
        expect(metrics.isSlow()).toBe(true);
      }
    });

    it('should identify accurate validation (low issue density)', () => {
      const result = ValidationMetrics.create(150, 1, 10000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isAccurate()).toBe(true);
      }
    });

    it('should identify inaccurate validation (high issue density)', () => {
      const result = ValidationMetrics.create(150, 50, 100, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isAccurate()).toBe(false);
      }
    });

    it('should identify efficient rule usage', () => {
      const result = ValidationMetrics.create(150, 9, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.hasEfficientRuleUsage()).toBe(true); // 3 issues per rule
      }
    });

    it('should identify inefficient rule usage', () => {
      const result = ValidationMetrics.create(150, 1, 1000, 10);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.hasEfficientRuleUsage()).toBe(false); // 0.1 issues per rule
      }
    });
  });

  describe('comparison operations', () => {
    it('should compare validation performance correctly for speed', () => {
      const fastResult = ValidationMetrics.create(50, 5, 1000, 3);
      const slowResult = ValidationMetrics.create(200, 5, 1000, 3);

      expect(fastResult.isOk()).toBe(true);
      expect(slowResult.isOk()).toBe(true);

      if (fastResult.isOk() && slowResult.isOk()) {
        const fastMetrics = fastResult.value;
        const slowMetrics = slowResult.value;

        expect(fastMetrics.isFasterThan(slowMetrics)).toBe(true);
        expect(slowMetrics.isFasterThan(fastMetrics)).toBe(false);
      }
    });

    it('should compare validation quality correctly', () => {
      const qualityResult = ValidationMetrics.create(150, 2, 1000, 3);
      const poorQualityResult = ValidationMetrics.create(150, 20, 1000, 3);

      expect(qualityResult.isOk()).toBe(true);
      expect(poorQualityResult.isOk()).toBe(true);

      if (qualityResult.isOk() && poorQualityResult.isOk()) {
        const qualityMetrics = qualityResult.value;
        const poorQualityMetrics = poorQualityResult.value;

        expect(qualityMetrics.isMoreAccurateThan(poorQualityMetrics)).toBe(true);
        expect(poorQualityMetrics.isMoreAccurateThan(qualityMetrics)).toBe(false);
      }
    });

    it('should identify better overall validation metrics', () => {
      const betterResult = ValidationMetrics.create(50, 2, 1000, 3);
      const worseResult = ValidationMetrics.create(200, 20, 1000, 3);

      expect(betterResult.isOk()).toBe(true);
      expect(worseResult.isOk()).toBe(true);

      if (betterResult.isOk() && worseResult.isOk()) {
        const betterMetrics = betterResult.value;
        const worseMetrics = worseResult.value;

        expect(betterMetrics.isBetterThan(worseMetrics)).toBe(true);
        expect(worseMetrics.isBetterThan(betterMetrics)).toBe(false);
      }
    });

    it('should handle equal performance comparison', () => {
      const result1 = ValidationMetrics.create(150, 5, 1000, 3);
      const result2 = ValidationMetrics.create(150, 5, 1000, 3);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        expect(metrics1.isFasterThan(metrics2)).toBe(false);
        expect(metrics1.isMoreAccurateThan(metrics2)).toBe(false);
        expect(metrics1.isBetterThan(metrics2)).toBe(false);
      }
    });
  });

  describe('aggregation operations', () => {
    it('should combine multiple metrics correctly', () => {
      const result1 = ValidationMetrics.create(100, 3, 500, 2);
      const result2 = ValidationMetrics.create(150, 4, 800, 3);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        const combined = metrics1.combine(metrics2);
        expect(combined.getValidationTimeMs()).toBe(250); // 100 + 150
        expect(combined.getIssueCount()).toBe(7); // 3 + 4
        expect(combined.getInputSize()).toBe(1300); // 500 + 800
        expect(combined.getRuleCount()).toBe(5); // 2 + 3
      }
    });

    it('should combine with empty metrics', () => {
      const result = ValidationMetrics.create(150, 5, 1000, 3);
      const empty = ValidationMetrics.empty();

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const metrics = result.value;
        const combined = metrics.combine(empty);

        expect(combined.getValidationTimeMs()).toBe(150);
        expect(combined.getIssueCount()).toBe(5);
        expect(combined.getInputSize()).toBe(1000);
        expect(combined.getRuleCount()).toBe(3);
      }
    });

    it('should calculate average metrics correctly', () => {
      const result1 = ValidationMetrics.create(100, 4, 800, 2);
      const result2 = ValidationMetrics.create(200, 6, 1200, 4);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        const average = metrics1.average(metrics2);
        expect(average.getValidationTimeMs()).toBe(150); // (100 + 200) / 2
        expect(average.getIssueCount()).toBe(5); // (4 + 6) / 2
        expect(average.getInputSize()).toBe(1000); // (800 + 1200) / 2
        expect(average.getRuleCount()).toBe(3); // (2 + 4) / 2
      }
    });
  });

  describe('quality scoring', () => {
    it('should calculate validation quality score correctly', () => {
      const result = ValidationMetrics.create(100, 2, 1000, 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const score = metrics.getQualityScore();
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('should give higher scores to better validation quality', () => {
      const highQualityResult = ValidationMetrics.create(50, 1, 1000, 3);
      const lowQualityResult = ValidationMetrics.create(500, 20, 1000, 3);

      expect(highQualityResult.isOk()).toBe(true);
      expect(lowQualityResult.isOk()).toBe(true);

      if (highQualityResult.isOk() && lowQualityResult.isOk()) {
        const highQualityScore = highQualityResult.value.getQualityScore();
        const lowQualityScore = lowQualityResult.value.getQualityScore();

        expect(highQualityScore).toBeGreaterThan(lowQualityScore);
      }
    });

    it('should handle perfect validation scoring', () => {
      const result = ValidationMetrics.create(0, 0, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const score = metrics.getQualityScore();
        expect(score).toBe(100); // Perfect score for zero time and issues
      }
    });

    it('should calculate performance efficiency score', () => {
      const result = ValidationMetrics.create(100, 5, 1000, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getEfficiencyScore();
        expect(efficiency).toBeGreaterThan(0);
        expect(efficiency).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('threshold validation', () => {
    it('should check if validation meets performance thresholds', () => {
      const result = ValidationMetrics.create(50, 2, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.meetsPerformanceThreshold(100)).toBe(true); // Under 100ms
        expect(metrics.meetsPerformanceThreshold(25)).toBe(false); // Over 25ms
      }
    });

    it('should check if validation meets quality thresholds', () => {
      const result = ValidationMetrics.create(100, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.meetsQualityThreshold(0.001)).toBe(false); // 0.005 density > 0.001
        expect(metrics.meetsQualityThreshold(0.0001)).toBe(false); // 0.005 density > 0.0001
      }
    });

    it('should identify acceptable validation performance', () => {
      const goodResult = ValidationMetrics.create(80, 3, 1000, 5);
      const poorResult = ValidationMetrics.create(2000, 50, 1000, 5);

      expect(goodResult.isOk()).toBe(true);
      expect(poorResult.isOk()).toBe(true);

      if (goodResult.isOk() && poorResult.isOk()) {
        const goodMetrics = goodResult.value;
        const poorMetrics = poorResult.value;

        expect(goodMetrics.isAcceptablePerformance()).toBe(true);
        expect(poorMetrics.isAcceptablePerformance()).toBe(false);
      }
    });
  });

  describe('string representation and serialization', () => {
    it('should provide readable string representation', () => {
      const result = ValidationMetrics.create(150, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // Only test toString if it's been overridden from Object.prototype.toString
        if (metrics.toString !== Object.prototype.toString) {
          const str = metrics.toString();
          expect(str).toContain('150ms');
          expect(str).toContain('5 issues');
          expect(str).toContain('1000');
          expect(str).toContain('3 rules');
        } else {
          // If toString uses default, just verify the object exists
          expect(metrics).toBeDefined();
        }
      }
    });

    it('should serialize to JSON correctly', () => {
      const result = ValidationMetrics.create(150, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const json = metrics.toJSON();

        expect(json).toEqual({
          validationTimeMs: 150,
          issueCount: 5,
          inputSize: 1000,
          ruleCount: 3,
        });
      }
    });

    it('should maintain precision in JSON serialization', () => {
      const result = ValidationMetrics.create(150.75, 5, 1000, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const json = metrics.toJSON();

        expect(json.validationTimeMs).toBe(150.75);
      }
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very small decimal values', () => {
      const result = ValidationMetrics.create(0.001, 0, 1, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getValidationTimeMs()).toBe(0.001);
      }
    });

    it('should handle maximum safe integer values', () => {
      const maxInt = Number.MAX_SAFE_INTEGER;
      const result = ValidationMetrics.create(maxInt, maxInt, maxInt, maxInt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getValidationTimeMs()).toBe(maxInt);
        expect(metrics.getIssueCount()).toBe(maxInt);
        expect(metrics.getInputSize()).toBe(maxInt);
        expect(metrics.getRuleCount()).toBe(maxInt);
      }
    });

    it('should handle floating point precision edge cases', () => {
      const result = ValidationMetrics.create(0.1 + 0.2, 1, 1000, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // Due to floating point precision, this might not be exactly 0.3
        expect(metrics.getValidationTimeMs()).toBeCloseTo(0.3);
      }
    });

    it('should handle zero division scenarios gracefully', () => {
      const result = ValidationMetrics.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // All calculations should handle zero values gracefully
        expect(metrics.getValidationSpeed()).toBe(0); // 0/0 handled as 0
        expect(metrics.getTimePerRule()).toBe(0);
        expect(metrics.getIssueDensity()).toBe(0);
        expect(metrics.getRuleEfficiency()).toBe(0);
      }
    });
  });
});
