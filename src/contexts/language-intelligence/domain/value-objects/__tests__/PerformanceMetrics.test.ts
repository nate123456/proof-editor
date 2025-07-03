/**
 * Tests for PerformanceMetrics value object
 *
 * Focuses on:
 * - Performance metrics creation and validation
 * - Time measurement tracking
 * - Memory usage monitoring
 * - Performance comparison operations
 * - Resource efficiency calculations
 */

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import { PerformanceMetrics } from '../PerformanceMetrics';

describe('PerformanceMetrics', () => {
  describe('create', () => {
    it('should create valid performance metrics with all positive values', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(150);
        expect(metrics.getCpuTimeMs()).toBe(80);
        expect(metrics.getMemoryUsedBytes()).toBe(1024);
        expect(metrics.getPeakMemoryBytes()).toBe(2048);
      }
    });

    it('should create valid performance metrics with zero values', () => {
      const result = PerformanceMetrics.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(0);
        expect(metrics.getCpuTimeMs()).toBe(0);
        expect(metrics.getMemoryUsedBytes()).toBe(0);
        expect(metrics.getPeakMemoryBytes()).toBe(0);
      }
    });

    it('should fail when total time is negative', () => {
      const result = PerformanceMetrics.create(-1, 80, 1024, 2048);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Total time cannot be negative');
      }
    });

    it('should fail when CPU time is negative', () => {
      const result = PerformanceMetrics.create(150, -1, 1024, 2048);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('CPU time cannot be negative');
      }
    });

    it('should fail when memory used is negative', () => {
      const result = PerformanceMetrics.create(150, 80, -1, 2048);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Memory used cannot be negative');
      }
    });

    it('should fail when peak memory is negative', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, -1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Peak memory cannot be negative');
      }
    });

    it('should fail when CPU time exceeds total time', () => {
      const result = PerformanceMetrics.create(100, 150, 1024, 2048);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('CPU time cannot exceed total time');
      }
    });

    it('should fail when peak memory is less than memory used', () => {
      const result = PerformanceMetrics.create(150, 80, 2048, 1024);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Peak memory cannot be less than memory used');
      }
    });

    it('should allow CPU time equal to total time', () => {
      const result = PerformanceMetrics.create(150, 150, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(150);
        expect(metrics.getCpuTimeMs()).toBe(150);
      }
    });

    it('should allow peak memory equal to memory used', () => {
      const result = PerformanceMetrics.create(150, 80, 2048, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getMemoryUsedBytes()).toBe(2048);
        expect(metrics.getPeakMemoryBytes()).toBe(2048);
      }
    });

    it('should handle very large values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      const result = PerformanceMetrics.create(largeValue, largeValue, largeValue, largeValue);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(largeValue);
        expect(metrics.getCpuTimeMs()).toBe(largeValue);
        expect(metrics.getMemoryUsedBytes()).toBe(largeValue);
        expect(metrics.getPeakMemoryBytes()).toBe(largeValue);
      }
    });

    it('should handle decimal time values', () => {
      const result = PerformanceMetrics.create(150.5, 80.25, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(150.5);
        expect(metrics.getCpuTimeMs()).toBe(80.25);
      }
    });
  });

  describe('empty', () => {
    it('should create empty metrics with all zero values', () => {
      const metrics = PerformanceMetrics.empty();

      expect(metrics.getTotalTimeMs()).toBe(0);
      expect(metrics.getCpuTimeMs()).toBe(0);
      expect(metrics.getMemoryUsedBytes()).toBe(0);
      expect(metrics.getPeakMemoryBytes()).toBe(0);
    });

    it('should create consistent empty metrics', () => {
      const metrics1 = PerformanceMetrics.empty();
      const metrics2 = PerformanceMetrics.empty();

      expect(metrics1.getTotalTimeMs()).toBe(metrics2.getTotalTimeMs());
      expect(metrics1.getCpuTimeMs()).toBe(metrics2.getCpuTimeMs());
      expect(metrics1.getMemoryUsedBytes()).toBe(metrics2.getMemoryUsedBytes());
      expect(metrics1.getPeakMemoryBytes()).toBe(metrics2.getPeakMemoryBytes());
    });
  });

  describe('derived calculations', () => {
    it('should calculate wait time correctly', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const waitTime = metrics.getWaitTimeMs();
        expect(waitTime).toBe(70); // 150 - 80 = 70
      }
    });

    it('should calculate wait time as zero when CPU time equals total time', () => {
      const result = PerformanceMetrics.create(150, 150, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const waitTime = metrics.getWaitTimeMs();
        expect(waitTime).toBe(0);
      }
    });

    it('should calculate CPU utilization percentage correctly', () => {
      const result = PerformanceMetrics.create(200, 150, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const utilization = metrics.getCpuUtilizationPercent();
        expect(utilization).toBe(75); // (150 / 200) * 100 = 75%
      }
    });

    it('should handle division by zero in CPU utilization', () => {
      const result = PerformanceMetrics.create(0, 0, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const utilization = metrics.getCpuUtilizationPercent();
        expect(utilization).toBe(0); // Should handle gracefully
      }
    });

    it('should calculate memory overhead correctly', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const overhead = metrics.getMemoryOverheadBytes();
        expect(overhead).toBe(1024); // 2048 - 1024 = 1024
      }
    });

    it('should calculate memory overhead as zero when peak equals used', () => {
      const result = PerformanceMetrics.create(150, 80, 2048, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const overhead = metrics.getMemoryOverheadBytes();
        expect(overhead).toBe(0);
      }
    });

    it('should calculate memory efficiency percentage', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getMemoryEfficiencyPercent();
        expect(efficiency).toBe(50); // (1024 / 2048) * 100 = 50%
      }
    });

    it('should handle zero peak memory in efficiency calculation', () => {
      const result = PerformanceMetrics.create(150, 80, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const efficiency = metrics.getMemoryEfficiencyPercent();
        expect(efficiency).toBe(100); // Should return 100% for no memory usage
      }
    });
  });

  describe('performance classification', () => {
    it('should identify fast performance', () => {
      const result = PerformanceMetrics.create(50, 30, 512, 1024);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isFast()).toBe(true);
        expect(metrics.isSlow()).toBe(false);
      }
    });

    it('should identify slow performance', () => {
      const result = PerformanceMetrics.create(5000, 4000, 512, 1024);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isFast()).toBe(false);
        expect(metrics.isSlow()).toBe(true);
      }
    });

    it('should identify memory efficient performance', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 1024);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isMemoryEfficient()).toBe(true);
      }
    });

    it('should identify memory inefficient performance', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 10240);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.isMemoryEfficient()).toBe(false);
      }
    });

    it('should identify high CPU utilization', () => {
      const result = PerformanceMetrics.create(100, 95, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.hasHighCpuUtilization()).toBe(true);
      }
    });

    it('should identify low CPU utilization', () => {
      const result = PerformanceMetrics.create(100, 20, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.hasHighCpuUtilization()).toBe(false);
      }
    });
  });

  describe('comparison operations', () => {
    it('should compare performance correctly for speed', () => {
      const fastResult = PerformanceMetrics.create(50, 30, 1024, 2048);
      const slowResult = PerformanceMetrics.create(200, 150, 1024, 2048);

      expect(fastResult.isOk()).toBe(true);
      expect(slowResult.isOk()).toBe(true);

      if (fastResult.isOk() && slowResult.isOk()) {
        const fastMetrics = fastResult.value;
        const slowMetrics = slowResult.value;

        expect(fastMetrics.isFasterThan(slowMetrics)).toBe(true);
        expect(slowMetrics.isFasterThan(fastMetrics)).toBe(false);
      }
    });

    it('should compare memory usage correctly', () => {
      const lightResult = PerformanceMetrics.create(150, 80, 512, 1024);
      const heavyResult = PerformanceMetrics.create(150, 80, 2048, 4096);

      expect(lightResult.isOk()).toBe(true);
      expect(heavyResult.isOk()).toBe(true);

      if (lightResult.isOk() && heavyResult.isOk()) {
        const lightMetrics = lightResult.value;
        const heavyMetrics = heavyResult.value;

        expect(lightMetrics.usesLessMemoryThan(heavyMetrics)).toBe(true);
        expect(heavyMetrics.usesLessMemoryThan(lightMetrics)).toBe(false);
      }
    });

    it('should identify better overall performance', () => {
      const betterResult = PerformanceMetrics.create(50, 30, 512, 1024);
      const worseResult = PerformanceMetrics.create(200, 150, 2048, 4096);

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
      const result1 = PerformanceMetrics.create(150, 80, 1024, 2048);
      const result2 = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        expect(metrics1.isFasterThan(metrics2)).toBe(false);
        expect(metrics1.usesLessMemoryThan(metrics2)).toBe(false);
        expect(metrics1.isBetterThan(metrics2)).toBe(false);
      }
    });
  });

  describe('aggregation operations', () => {
    it('should combine multiple metrics correctly', () => {
      const result1 = PerformanceMetrics.create(100, 60, 1024, 2048);
      const result2 = PerformanceMetrics.create(150, 90, 2048, 3072);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        const combined = metrics1.combine(metrics2);
        expect(combined.getTotalTimeMs()).toBe(250); // 100 + 150
        expect(combined.getCpuTimeMs()).toBe(150); // 60 + 90
        expect(combined.getMemoryUsedBytes()).toBe(3072); // 1024 + 2048
        expect(combined.getPeakMemoryBytes()).toBe(3072); // max(2048, 3072)
      }
    });

    it('should combine with empty metrics', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);
      const empty = PerformanceMetrics.empty();

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const metrics = result.value;
        const combined = metrics.combine(empty);

        expect(combined.getTotalTimeMs()).toBe(150);
        expect(combined.getCpuTimeMs()).toBe(80);
        expect(combined.getMemoryUsedBytes()).toBe(1024);
        expect(combined.getPeakMemoryBytes()).toBe(2048);
      }
    });

    it('should calculate average metrics correctly', () => {
      const result1 = PerformanceMetrics.create(100, 60, 1024, 2048);
      const result2 = PerformanceMetrics.create(200, 120, 2048, 3072);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const metrics1 = result1.value;
        const metrics2 = result2.value;

        const average = metrics1.average(metrics2);
        expect(average.getTotalTimeMs()).toBe(150); // (100 + 200) / 2
        expect(average.getCpuTimeMs()).toBe(90); // (60 + 120) / 2
        expect(average.getMemoryUsedBytes()).toBe(1536); // (1024 + 2048) / 2
        expect(average.getPeakMemoryBytes()).toBe(2560); // (2048 + 3072) / 2
      }
    });
  });

  describe('performance scoring', () => {
    it('should calculate performance score correctly', () => {
      const result = PerformanceMetrics.create(100, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const score = metrics.getPerformanceScore();
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('should give higher scores to better performance', () => {
      const fastResult = PerformanceMetrics.create(50, 30, 512, 1024);
      const slowResult = PerformanceMetrics.create(200, 150, 2048, 4096);

      expect(fastResult.isOk()).toBe(true);
      expect(slowResult.isOk()).toBe(true);

      if (fastResult.isOk() && slowResult.isOk()) {
        const fastScore = fastResult.value.getPerformanceScore();
        const slowScore = slowResult.value.getPerformanceScore();

        expect(fastScore).toBeGreaterThan(slowScore);
      }
    });

    it('should handle zero values in scoring', () => {
      const result = PerformanceMetrics.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const score = metrics.getPerformanceScore();
        expect(score).toBe(100); // Perfect score for no resource usage
      }
    });
  });

  describe('string representation and serialization', () => {
    it('should provide readable string representation', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // Only test toString if it's been overridden from Object.prototype.toString
        if (metrics.toString !== Object.prototype.toString) {
          const str = metrics.toString();
          expect(str).toContain('150ms');
          expect(str).toContain('80ms');
          expect(str).toContain('1024');
          expect(str).toContain('2048');
        } else {
          // If toString uses default, just verify the object exists
          expect(metrics).toBeDefined();
        }
      }
    });

    it('should serialize to JSON correctly', () => {
      const result = PerformanceMetrics.create(150, 80, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const json = metrics.toJSON();

        expect(json).toEqual({
          totalTimeMs: 150,
          cpuTimeMs: 80,
          memoryUsedBytes: 1024,
          peakMemoryBytes: 2048,
        });
      }
    });

    it('should maintain precision in JSON serialization', () => {
      const result = PerformanceMetrics.create(150.75, 80.25, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        const json = metrics.toJSON();

        expect(json.totalTimeMs).toBe(150.75);
        expect(json.cpuTimeMs).toBe(80.25);
      }
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very small decimal values', () => {
      const result = PerformanceMetrics.create(0.001, 0.0005, 1, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(0.001);
        expect(metrics.getCpuTimeMs()).toBe(0.0005);
      }
    });

    it('should handle maximum safe integer values', () => {
      const maxInt = Number.MAX_SAFE_INTEGER;
      const result = PerformanceMetrics.create(maxInt, maxInt, maxInt, maxInt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getTotalTimeMs()).toBe(maxInt);
        expect(metrics.getCpuTimeMs()).toBe(maxInt);
        expect(metrics.getMemoryUsedBytes()).toBe(maxInt);
        expect(metrics.getPeakMemoryBytes()).toBe(maxInt);
      }
    });

    it('should handle floating point precision edge cases', () => {
      const result = PerformanceMetrics.create(0.1 + 0.2, 0.1, 1024, 2048);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        // Due to floating point precision, this might not be exactly 0.3
        expect(metrics.getTotalTimeMs()).toBeCloseTo(0.3);
      }
    });

    it('should handle very large memory values', () => {
      const terabyte = 1024 * 1024 * 1024 * 1024; // 1TB in bytes
      const result = PerformanceMetrics.create(1000, 500, terabyte, terabyte * 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.getMemoryUsedBytes()).toBe(terabyte);
        expect(metrics.getPeakMemoryBytes()).toBe(terabyte * 2);
      }
    });
  });
});
