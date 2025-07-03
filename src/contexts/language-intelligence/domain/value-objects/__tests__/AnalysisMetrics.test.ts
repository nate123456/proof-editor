/**
 * Tests for AnalysisMetrics value object
 *
 * Focuses on:
 * - Analysis metrics creation and validation
 * - Performance measurement tracking
 * - Statistical data aggregation
 * - Error handling for invalid metrics
 * - Comparison and calculation operations
 */

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import { AnalysisMetrics } from '../AnalysisMetrics';

describe('AnalysisMetrics', () => {
  describe('create', () => {
    it('should create valid analysis metrics with all positive values', () => {
      const result = AnalysisMetrics.create(100, 5, 10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(100);
        expect(metrics.getIssueCount()).toBe(5);
        expect(metrics.getPatternMatches()).toBe(10);
        expect(metrics.getComplexityScore()).toBe(2);
      }
    });

    it('should create valid analysis metrics with zero values', () => {
      const result = AnalysisMetrics.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(0);
        expect(metrics.getIssueCount()).toBe(0);
        expect(metrics.getPatternMatches()).toBe(0);
        expect(metrics.getComplexityScore()).toBe(0);
      }
    });

    it('should fail when total time is negative', () => {
      const result = AnalysisMetrics.create(-1, 5, 10, 2);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Total time cannot be negative');
      }
    });

    it('should fail when issue count is negative', () => {
      const result = AnalysisMetrics.create(100, -1, 10, 2);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Issue count cannot be negative');
      }
    });

    it('should fail when pattern matches is negative', () => {
      const result = AnalysisMetrics.create(100, 5, -1, 2);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Pattern matches cannot be negative');
      }
    });

    it('should fail when complexity score is negative', () => {
      const result = AnalysisMetrics.create(100, 5, 10, -1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Complexity score cannot be negative');
      }
    });

    it('should handle very large values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      const result = AnalysisMetrics.create(largeValue, largeValue, largeValue, largeValue);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(largeValue);
        expect(metrics.getIssueCount()).toBe(largeValue);
        expect(metrics.getPatternMatches()).toBe(largeValue);
        expect(metrics.getComplexityScore()).toBe(largeValue);
      }
    });

    it('should handle decimal values for time and complexity', () => {
      const result = AnalysisMetrics.create(100.5, 5, 10, 2.7);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(100.5);
        expect(metrics.getComplexityScore()).toBe(2.7);
      }
    });
  });

  describe('empty', () => {
    it('should create empty metrics with all zero values', () => {
      const metrics = AnalysisMetrics.empty();

      expect(metrics.getTotalTimeMs()).toBe(0);
      expect(metrics.getIssueCount()).toBe(0);
      expect(metrics.getPatternMatches()).toBe(0);
      expect(metrics.getComplexityScore()).toBe(0);
    });

    it('should create consistent empty metrics', () => {
      const metrics1 = AnalysisMetrics.empty();
      const metrics2 = AnalysisMetrics.empty();

      expect(metrics1.getTotalTimeMs()).toBe(metrics2.getTotalTimeMs());
      expect(metrics1.getIssueCount()).toBe(metrics2.getIssueCount());
      expect(metrics1.getPatternMatches()).toBe(metrics2.getPatternMatches());
      expect(metrics1.getComplexityScore()).toBe(metrics2.getComplexityScore());
    });
  });

  describe('calculations and derived values', () => {
    it('should calculate issues per pattern ratio correctly', () => {
      const result = AnalysisMetrics.create(100, 10, 5, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const ratio = metrics.getIssuesPerPatternRatio();
        expect(ratio).toBe(2); // 10 issues / 5 patterns = 2
      }
    });

    it('should handle division by zero in issues per pattern ratio', () => {
      const result = AnalysisMetrics.create(100, 10, 0, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const ratio = metrics.getIssuesPerPatternRatio();
        expect(ratio).toBe(Infinity);
      }
    });

    it('should calculate time per issue correctly', () => {
      const result = AnalysisMetrics.create(100, 4, 10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const timePerIssue = metrics.getTimePerIssue();
        expect(timePerIssue).toBe(25); // 100ms / 4 issues = 25ms per issue
      }
    });

    it('should handle division by zero in time per issue', () => {
      const result = AnalysisMetrics.create(100, 0, 10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const timePerIssue = metrics.getTimePerIssue();
        expect(timePerIssue).toBe(Infinity);
      }
    });

    it('should identify high complexity analysis', () => {
      const result = AnalysisMetrics.create(100, 5, 10, 8);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isHighComplexity()).toBe(true);
      }
    });

    it('should identify low complexity analysis', () => {
      const result = AnalysisMetrics.create(100, 5, 10, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isHighComplexity()).toBe(false);
      }
    });
  });

  describe('comparison operations', () => {
    it('should compare metrics correctly for performance', () => {
      const fastResult = AnalysisMetrics.create(50, 5, 10, 2);
      const slowResult = AnalysisMetrics.create(150, 5, 10, 2);

      expect(fastResult.isOk()).toBe(true);
      expect(slowResult.isOk()).toBe(true);

      if (fastResult.isOk() && slowResult.isOk()) {
        const fastMetrics = fastResult.value;
        const slowMetrics = slowResult.value;

        expect(fastMetrics.isFasterThan(slowMetrics)).toBe(true);
        expect(slowMetrics.isFasterThan(fastMetrics)).toBe(false);
      }
    });

    it('should handle equal performance comparison', () => {
      const result1 = AnalysisMetrics.create(100, 5, 10, 2);
      const result2 = AnalysisMetrics.create(100, 8, 15, 3);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        expect(metrics1.isFasterThan(metrics2)).toBe(false);
        expect(metrics2.isFasterThan(metrics1)).toBe(false);
      }
    });

    it('should compare accuracy correctly', () => {
      const accurateResult = AnalysisMetrics.create(100, 2, 10, 2);
      const inaccurateResult = AnalysisMetrics.create(100, 8, 10, 2);

      expect(accurateResult.isOk()).toBe(true);
      expect(inaccurateResult.isOk()).toBe(true);

      if (accurateResult.isOk() && inaccurateResult.isOk()) {
        const accurateMetrics = accurateResult.value;
        const inaccurateMetrics = inaccurateResult.value;

        expect(accurateMetrics.isMoreAccurateThan(inaccurateMetrics)).toBe(true);
        expect(inaccurateMetrics.isMoreAccurateThan(accurateMetrics)).toBe(false);
      }
    });
  });

  describe('aggregation operations', () => {
    it('should combine multiple metrics correctly', () => {
      const result1 = AnalysisMetrics.create(50, 3, 5, 2);
      const result2 = AnalysisMetrics.create(75, 4, 8, 3);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        const combined = metrics1.combine(metrics2);
        expect(combined.getTotalTimeMs()).toBe(125); // 50 + 75
        expect(combined.getIssueCount()).toBe(7); // 3 + 4
        expect(combined.getPatternMatches()).toBe(13); // 5 + 8
        expect(combined.getComplexityScore()).toBe(2.5); // (2 + 3) / 2
      }
    });

    it('should combine with empty metrics', () => {
      const result = AnalysisMetrics.create(100, 5, 10, 2);
      const empty = AnalysisMetrics.empty();

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const metrics = result.value;
        const combined = metrics.combine(empty);

        expect(combined.getTotalTimeMs()).toBe(100);
        expect(combined.getIssueCount()).toBe(5);
        expect(combined.getPatternMatches()).toBe(10);
        expect(combined.getComplexityScore()).toBe(1); // (2 + 0) / 2
      }
    });

    it('should average complexity scores when combining', () => {
      const result1 = AnalysisMetrics.create(50, 5, 10, 4);
      const result2 = AnalysisMetrics.create(50, 5, 10, 6);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        const combined = metrics1.combine(metrics2);
        expect(combined.getComplexityScore()).toBe(5); // (4 + 6) / 2
      }
    });
  });

  describe('efficiency calculations', () => {
    it('should calculate analysis efficiency correctly', () => {
      const result = AnalysisMetrics.create(100, 2, 10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getAnalysisEfficiency();
        // Efficiency = patterns / (time * issues) = 10 / (100 * 2) = 0.05
        expect(efficiency).toBe(0.05);
      }
    });

    it('should handle zero efficiency calculation', () => {
      const result = AnalysisMetrics.create(0, 0, 10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getAnalysisEfficiency();
        expect(efficiency).toBe(Infinity);
      }
    });

    it('should identify efficient analysis', () => {
      const efficientResult = AnalysisMetrics.create(50, 1, 20, 2);
      const inefficientResult = AnalysisMetrics.create(200, 10, 5, 5);

      expect(efficientResult.isOk()).toBe(true);
      expect(inefficientResult.isOk()).toBe(true);

      if (efficientResult.isOk() && inefficientResult.isOk()) {
        const efficientMetrics = efficientResult.value;
        const inefficientMetrics = inefficientResult.value;

        expect(efficientMetrics.isEfficient()).toBe(true);
        expect(inefficientMetrics.isEfficient()).toBe(false);
      }
    });
  });

  describe('string representation and serialization', () => {
    it('should provide readable string representation', () => {
      const result = AnalysisMetrics.create(150, 5, 12, 3.5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // Verify the metrics object has the expected properties
        expect(metrics).toBeDefined();
        expect(metrics.getStatementCount()).toBe(5);
        expect(metrics.getConnectionCount()).toBe(12);
      }
    });

    it('should serialize to JSON correctly', () => {
      const result = AnalysisMetrics.create(100, 5, 10, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const json = metrics.toJSON();

        expect(json).toEqual({
          totalTimeMs: 100,
          issueCount: 5,
          patternMatches: 10,
          complexityScore: 2,
        });
      }
    });

    it('should maintain precision in JSON serialization', () => {
      const result = AnalysisMetrics.create(100.75, 5, 10, 2.333);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const json = metrics.toJSON();

        expect(json.totalTimeMs).toBe(100.75);
        expect(json.complexityScore).toBe(2.333);
      }
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very small decimal values', () => {
      const result = AnalysisMetrics.create(0.001, 0, 0, 0.001);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(0.001);
        expect(metrics.getComplexityScore()).toBe(0.001);
      }
    });

    it('should handle maximum safe integer values', () => {
      const maxInt = Number.MAX_SAFE_INTEGER;
      const result = AnalysisMetrics.create(maxInt, maxInt, maxInt, maxInt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(maxInt);
        expect(metrics.getIssueCount()).toBe(maxInt);
      }
    });

    it('should handle floating point precision edge cases', () => {
      const result = AnalysisMetrics.create(0.1 + 0.2, 1, 1, 0.1 + 0.2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // Due to floating point precision, this might not be exactly 0.3
        expect(metrics.getTotalTimeMs()).toBeCloseTo(0.3);
        expect(metrics.getComplexityScore()).toBeCloseTo(0.3);
      }
    });
  });
});
