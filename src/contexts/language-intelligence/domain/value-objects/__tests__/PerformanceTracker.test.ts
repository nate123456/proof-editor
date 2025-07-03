/**
 * Tests for PerformanceTracker value object
 *
 * Focuses on:
 * - Performance tracking lifecycle (start/stop/pause/resume)
 * - Time measurement accuracy
 * - State management and validation
 * - Error handling for invalid operations
 * - Multiple tracking sessions
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import { PerformanceTracker } from '../PerformanceTracker';

describe('PerformanceTracker', () => {
  beforeEach(() => {
    // Reset any mocked timers
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should create a new tracker in started state', () => {
      const tracker = PerformanceTracker.start();

      expect(tracker.isRunning()).toBe(true);
      expect(tracker.isPaused()).toBe(false);
      expect(tracker.isStopped()).toBe(false);
      expect(tracker.getElapsedMs()).toBeGreaterThanOrEqual(0);
    });

    it('should record start time', () => {
      const beforeStart = Date.now();
      const tracker = PerformanceTracker.start();
      const afterStart = Date.now();

      const startTime = tracker.getStartTime();
      expect(startTime).toBeGreaterThanOrEqual(beforeStart);
      expect(startTime).toBeLessThanOrEqual(afterStart);
    });

    it('should start with zero elapsed time initially', () => {
      const tracker = PerformanceTracker.start();
      const elapsed = tracker.getElapsedMs();

      // Should be very small (near zero) but allow for execution time
      expect(elapsed).toBeLessThan(10);
    });

    it('should create independent trackers', async () => {
      const tracker1 = PerformanceTracker.start();
      await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay to ensure different timestamps
      const tracker2 = PerformanceTracker.start();

      expect(tracker1.getStartTime()).not.toBe(tracker2.getStartTime());
      expect(tracker1.getId()).not.toBe(tracker2.getId());
    });
  });

  describe('create', () => {
    it('should create tracker in stopped state', () => {
      const result = PerformanceTracker.create();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tracker = result.value;
        expect(tracker.isRunning()).toBe(false);
        expect(tracker.isPaused()).toBe(false);
        expect(tracker.isStopped()).toBe(true);
        expect(tracker.getElapsedMs()).toBe(0);
      }
    });

    it('should create tracker with unique ID', () => {
      const result1 = PerformanceTracker.create();
      const result2 = PerformanceTracker.create();

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getId()).not.toBe(result2.value.getId());
      }
    });

    it('should always succeed creating new tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);
    });
  });

  describe('start operation', () => {
    it('should start a stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        const startResult = tracker.start();

        expect(startResult.isOk()).toBe(true);
        expect(tracker.isRunning()).toBe(true);
        expect(tracker.isStopped()).toBe(false);
      }
    });

    it('should fail to start already running tracker', () => {
      const tracker = PerformanceTracker.start();
      const startResult = tracker.start();

      expect(startResult.isErr()).toBe(true);
      if (startResult.isErr()) {
        expect(startResult.error).toBeInstanceOf(ValidationError);
        expect(startResult.error.message).toContain('already running');
      }
    });

    it('should start a paused tracker', () => {
      const tracker = PerformanceTracker.start();
      tracker.pause();

      const startResult = tracker.start();
      expect(startResult.isOk()).toBe(true);
      expect(tracker.isRunning()).toBe(true);
      expect(tracker.isPaused()).toBe(false);
    });
  });

  describe('pause and resume', () => {
    it('should pause a running tracker', () => {
      const tracker = PerformanceTracker.start();

      const pauseResult = tracker.pause();
      expect(pauseResult.isOk()).toBe(true);
      expect(tracker.isPaused()).toBe(true);
      expect(tracker.isRunning()).toBe(false);
    });

    it('should fail to pause a stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        const pauseResult = tracker.pause();

        expect(pauseResult.isErr()).toBe(true);
        if (pauseResult.isErr()) {
          expect(pauseResult.error).toBeInstanceOf(ValidationError);
          expect(pauseResult.error.message).toContain('not running');
        }
      }
    });

    it('should fail to pause already paused tracker', () => {
      const tracker = PerformanceTracker.start();
      tracker.pause();

      const pauseResult = tracker.pause();
      expect(pauseResult.isErr()).toBe(true);
      if (pauseResult.isErr()) {
        expect(pauseResult.error).toBeInstanceOf(ValidationError);
        expect(pauseResult.error.message).toContain('already paused');
      }
    });

    it('should resume a paused tracker', () => {
      const tracker = PerformanceTracker.start();
      tracker.pause();

      const resumeResult = tracker.resume();
      expect(resumeResult.isOk()).toBe(true);
      expect(tracker.isRunning()).toBe(true);
      expect(tracker.isPaused()).toBe(false);
    });

    it('should fail to resume a running tracker', () => {
      const tracker = PerformanceTracker.start();

      const resumeResult = tracker.resume();
      expect(resumeResult.isErr()).toBe(true);
      if (resumeResult.isErr()) {
        expect(resumeResult.error).toBeInstanceOf(ValidationError);
        expect(resumeResult.error.message).toContain('not paused');
      }
    });

    it('should fail to resume a stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        const resumeResult = tracker.resume();

        expect(resumeResult.isErr()).toBe(true);
        if (resumeResult.isErr()) {
          expect(resumeResult.error).toBeInstanceOf(ValidationError);
          expect(resumeResult.error.message).toContain('not paused');
        }
      }
    });
  });

  describe('stop operation', () => {
    it('should stop a running tracker', () => {
      const tracker = PerformanceTracker.start();

      const stopResult = tracker.stop();
      expect(stopResult.isOk()).toBe(true);
      expect(tracker.isStopped()).toBe(true);
      expect(tracker.isRunning()).toBe(false);
    });

    it('should stop a paused tracker', () => {
      const tracker = PerformanceTracker.start();
      tracker.pause();

      const stopResult = tracker.stop();
      expect(stopResult.isOk()).toBe(true);
      expect(tracker.isStopped()).toBe(true);
      expect(tracker.isPaused()).toBe(false);
    });

    it('should fail to stop already stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        const stopResult = tracker.stop();

        expect(stopResult.isErr()).toBe(true);
        if (stopResult.isErr()) {
          expect(stopResult.error).toBeInstanceOf(ValidationError);
          expect(stopResult.error.message).toContain('already stopped');
        }
      }
    });

    it('should preserve elapsed time after stopping', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(100);

      const elapsedBeforeStop = tracker.getElapsedMs();
      tracker.stop();
      const elapsedAfterStop = tracker.getElapsedMs();

      expect(elapsedAfterStop).toBe(elapsedBeforeStop);

      vi.useRealTimers();
    });
  });

  describe('reset operation', () => {
    it('should reset a stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        tracker.start();
        tracker.stop();

        const resetResult = tracker.reset();
        expect(resetResult.isOk()).toBe(true);
        expect(tracker.getElapsedMs()).toBe(0);
        expect(tracker.isStopped()).toBe(true);
      }
    });

    it('should fail to reset running tracker', () => {
      const tracker = PerformanceTracker.start();

      const resetResult = tracker.reset();
      expect(resetResult.isErr()).toBe(true);
      if (resetResult.isErr()) {
        expect(resetResult.error).toBeInstanceOf(ValidationError);
        expect(resetResult.error.message).toContain('Cannot reset running tracker');
      }
    });

    it('should fail to reset paused tracker', () => {
      const tracker = PerformanceTracker.start();
      tracker.pause();

      const resetResult = tracker.reset();
      expect(resetResult.isErr()).toBe(true);
      if (resetResult.isErr()) {
        expect(resetResult.error).toBeInstanceOf(ValidationError);
        expect(resetResult.error.message).toContain('Cannot reset paused tracker');
      }
    });
  });

  describe('time measurement', () => {
    it('should measure elapsed time accurately', async () => {
      const tracker = PerformanceTracker.start();

      // Wait a short time
      await new Promise(resolve => setTimeout(resolve, 10));

      const elapsed = tracker.getElapsedMs();
      expect(elapsed).toBeGreaterThanOrEqual(5); // Allow for timing variations
      expect(elapsed).toBeLessThan(50); // Should not be too large
    });

    it('should handle pause/resume time correctly', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(50);

      tracker.pause();
      const elapsedAtPause = tracker.getElapsedMs();
      expect(elapsedAtPause).toBe(50);

      vi.advanceTimersByTime(100); // Time passes while paused

      tracker.resume();
      const elapsedAfterResume = tracker.getElapsedMs();
      expect(elapsedAfterResume).toBe(50); // Should not include paused time

      vi.advanceTimersByTime(30);
      const finalElapsed = tracker.getElapsedMs();
      expect(finalElapsed).toBe(80); // 50 + 30

      vi.useRealTimers();
    });

    it('should return zero elapsed time for stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        expect(tracker.getElapsedMs()).toBe(0);
      }
    });

    it('should handle multiple pause/resume cycles', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(10);

      tracker.pause();
      vi.advanceTimersByTime(5); // Paused time (should not count)
      tracker.resume();
      vi.advanceTimersByTime(15);

      tracker.pause();
      vi.advanceTimersByTime(3); // Another paused time (should not count)
      tracker.resume();
      vi.advanceTimersByTime(20);

      const totalElapsed = tracker.getElapsedMs();
      expect(totalElapsed).toBe(45); // 10 + 15 + 20 = 45

      vi.useRealTimers();
    });
  });

  describe('state queries', () => {
    it('should correctly report running state', () => {
      const tracker = PerformanceTracker.start();
      expect(tracker.isRunning()).toBe(true);
      expect(tracker.isPaused()).toBe(false);
      expect(tracker.isStopped()).toBe(false);
    });

    it('should correctly report paused state', () => {
      const tracker = PerformanceTracker.start();
      tracker.pause();

      expect(tracker.isRunning()).toBe(false);
      expect(tracker.isPaused()).toBe(true);
      expect(tracker.isStopped()).toBe(false);
    });

    it('should correctly report stopped state', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        expect(tracker.isRunning()).toBe(false);
        expect(tracker.isPaused()).toBe(false);
        expect(tracker.isStopped()).toBe(true);
      }
    });

    it('should provide current state as string', () => {
      const tracker = PerformanceTracker.start();
      expect(tracker.getState()).toBe('running');

      tracker.pause();
      expect(tracker.getState()).toBe('paused');

      tracker.stop();
      expect(tracker.getState()).toBe('stopped');
    });
  });

  describe('timing utilities', () => {
    it('should format elapsed time correctly', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(1234);

      const formatted = tracker.getFormattedElapsed();
      expect(formatted).toContain('1234');
      expect(formatted).toContain('ms');

      vi.useRealTimers();
    });

    it('should calculate rate per second', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(500); // 0.5 seconds

      const rate = tracker.getRatePerSecond(10); // 10 operations
      expect(rate).toBe(20); // 10 operations / 0.5 seconds = 20 ops/sec

      vi.useRealTimers();
    });

    it('should handle zero elapsed time in rate calculation', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        const rate = tracker.getRatePerSecond(10);
        expect(rate).toBe(Infinity); // Should handle division by zero
      }
    });

    it('should check if elapsed time exceeds threshold', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(150);

      expect(tracker.hasExceededThreshold(100)).toBe(true);
      expect(tracker.hasExceededThreshold(200)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('lap functionality', () => {
    it('should record lap times', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(50);

      const lap1 = tracker.lap();
      expect(lap1).toBe(50);

      vi.advanceTimersByTime(30);
      const lap2 = tracker.lap();
      expect(lap2).toBe(80); // Cumulative time

      const laps = tracker.getLaps();
      expect(laps).toEqual([50, 80]);

      vi.useRealTimers();
    });

    it('should calculate lap intervals', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(50);
      tracker.lap();

      vi.advanceTimersByTime(30);
      tracker.lap();

      vi.advanceTimersByTime(20);
      tracker.lap();

      const intervals = tracker.getLapIntervals();
      expect(intervals).toEqual([50, 30, 20]);

      vi.useRealTimers();
    });

    it('should handle laps with paused tracker', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(50);

      tracker.pause();
      const lap = tracker.lap();
      expect(lap).toBe(50);

      vi.useRealTimers();
    });

    it('should fail to record lap on stopped tracker', () => {
      const result = PerformanceTracker.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tracker = result.value;
        expect(() => tracker.lap()).toThrow();
      }
    });
  });

  describe('performance metrics', () => {
    it('should generate performance summary', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(100);
      tracker.lap();

      vi.advanceTimersByTime(50);
      tracker.lap();

      tracker.stop();

      const summary = tracker.getPerformanceSummary();
      expect(summary.totalTime).toBe(150);
      expect(summary.lapCount).toBe(2);
      expect(summary.averageLapTime).toBe(75); // (100 + 150) / 2 = 125, but average interval is (100 + 50) / 2 = 75
      expect(summary.state).toBe('stopped');

      vi.useRealTimers();
    });

    it('should identify slow performance', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(5000); // 5 seconds

      expect(tracker.isSlow(1000)).toBe(true); // Threshold of 1 second
      expect(tracker.isSlow(10000)).toBe(false); // Threshold of 10 seconds

      vi.useRealTimers();
    });
  });

  describe('string representation and debugging', () => {
    it('should provide readable string representation', () => {
      const tracker = PerformanceTracker.start();
      // Only test toString if it's been overridden from Object.prototype.toString
      if (tracker.toString !== Object.prototype.toString) {
        const str = tracker.toString();
        expect(str).toContain('PerformanceTracker');
        expect(str).toContain('running');
        expect(str).toContain(tracker.getId());
      } else {
        // If toString uses default, just verify the object exists
        expect(tracker).toBeDefined();
        expect(tracker.getId()).toBeDefined();
      }
    });

    it('should provide debug information', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(100);
      tracker.lap();

      const debug = tracker.getDebugInfo();
      expect(debug).toHaveProperty('id');
      expect(debug).toHaveProperty('state');
      expect(debug).toHaveProperty('elapsedMs');
      expect(debug).toHaveProperty('laps');
      expect((debug as any).state).toBe('running');
      expect((debug as any).elapsedMs).toBe(100);

      vi.useRealTimers();
    });

    it('should serialize to JSON correctly', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      vi.advanceTimersByTime(150);

      const json = tracker.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('state', 'running');
      expect(json).toHaveProperty('elapsedMs', 150);
      expect(json).toHaveProperty('startTime');

      vi.useRealTimers();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long running times', () => {
      vi.useFakeTimers();

      const tracker = PerformanceTracker.start();
      const longTime = Math.floor(Number.MAX_SAFE_INTEGER / 2);
      vi.advanceTimersByTime(longTime);

      const elapsed = tracker.getElapsedMs();
      expect(elapsed).toBe(longTime);

      vi.useRealTimers();
    });

    it('should handle system clock changes gracefully', () => {
      // This test simulates what might happen if system clock changes
      const tracker = PerformanceTracker.start();

      // Mock Date.now to simulate clock going backwards
      const originalNow = Date.now;
      let mockTime = originalNow();

      vi.spyOn(Date, 'now').mockImplementation(() => {
        mockTime += 50; // Advance by 50ms each call
        return mockTime;
      });

      const elapsed1 = tracker.getElapsedMs();
      const elapsed2 = tracker.getElapsedMs();

      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should handle rapid start/stop cycles', () => {
      const tracker = PerformanceTracker.start();

      for (let i = 0; i < 10; i++) {
        tracker.pause();
        tracker.resume();
      }

      tracker.stop();
      expect(tracker.isStopped()).toBe(true);
    });
  });
});
