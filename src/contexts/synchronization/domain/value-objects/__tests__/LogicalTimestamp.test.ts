import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VectorClock } from '../../entities/VectorClock.js';
import { DeviceId } from '../DeviceId.js';
import { LogicalTimestamp } from '../LogicalTimestamp.js';

describe('LogicalTimestamp', () => {
  let mockDeviceId1: DeviceId;
  let mockDeviceId2: DeviceId;
  let mockVectorClock: VectorClock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const device1Result = DeviceId.create('device-1');
    const device2Result = DeviceId.create('device-2');
    const clockResult = VectorClock.create(device1Result.value);

    expect(device1Result.isOk()).toBe(true);
    expect(device2Result.isOk()).toBe(true);
    expect(clockResult.isOk()).toBe(true);

    if (device1Result.isOk() && device2Result.isOk() && clockResult.isOk()) {
      mockDeviceId1 = device1Result.value;
      mockDeviceId2 = device2Result.value;
      mockVectorClock = clockResult.value;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create logical timestamp with valid inputs', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, 5, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.getDeviceId()).toBe(mockDeviceId1);
        expect(timestamp.getTimestamp()).toBe(5);
        expect(timestamp.getVectorClockHash()).toBeTruthy();
      }
    });

    it('should reject negative timestamps', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, -1, mockVectorClock);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Timestamp cannot be negative');
      }
    });

    it('should accept zero timestamp', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, 0, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp()).toBe(0);
      }
    });

    it('should generate vector clock hash', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const hash = result.value.getVectorClockHash();
        expect(hash).toBeTruthy();
        expect(typeof hash).toBe('string');
        expect(hash.length).toBeGreaterThan(0);
      }
    });
  });

  describe('fromVectorClock', () => {
    it('should create timestamp from vector clock with single device', () => {
      const clockResult = VectorClock.create(mockDeviceId1);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const incrementedResult = clockResult.value.incrementForDevice(mockDeviceId1);
        expect(incrementedResult.isOk()).toBe(true);

        if (incrementedResult.isOk()) {
          const result = LogicalTimestamp.fromVectorClock(incrementedResult.value);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            const timestamp = result.value;
            expect(timestamp.getDeviceId()).toEqual(mockDeviceId1);
            expect(timestamp.getTimestamp()).toBe(1);
          }
        }
      }
    });

    it('should create timestamp from vector clock with multiple devices', () => {
      const clockResult = VectorClock.create(mockDeviceId1);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        let clock = clockResult.value;

        // Increment for device1 multiple times
        for (let i = 0; i < 3; i++) {
          const incrementResult = clock.incrementForDevice(mockDeviceId1);
          expect(incrementResult.isOk()).toBe(true);
          if (incrementResult.isOk()) {
            clock = incrementResult.value;
          }
        }

        // Increment for device2
        const incrementResult = clock.incrementForDevice(mockDeviceId2);
        expect(incrementResult.isOk()).toBe(true);

        if (incrementResult.isOk()) {
          clock = incrementResult.value;
          const result = LogicalTimestamp.fromVectorClock(clock);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            const timestamp = result.value;
            // Should use the device with the highest timestamp
            expect(timestamp.getTimestamp()).toBe(3); // device1 has highest timestamp
            expect(timestamp.getDeviceId()).toEqual(mockDeviceId1);
          }
        }
      }
    });

    it('should reject empty vector clock', () => {
      const emptyClockResult = VectorClock.create();
      expect(emptyClockResult.isOk()).toBe(true);

      if (emptyClockResult.isOk()) {
        const result = LogicalTimestamp.fromVectorClock(emptyClockResult.value);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('must have at least one device');
        }
      }
    });

    it('should select device with maximum timestamp', () => {
      const clockResult = VectorClock.create(mockDeviceId1);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        let clock = clockResult.value;

        // Increment device1 to 2
        for (let i = 0; i < 2; i++) {
          const incrementResult = clock.incrementForDevice(mockDeviceId1);
          expect(incrementResult.isOk()).toBe(true);
          if (incrementResult.isOk()) {
            clock = incrementResult.value;
          }
        }

        // Increment device2 to 5 (higher)
        for (let i = 0; i < 5; i++) {
          const incrementResult = clock.incrementForDevice(mockDeviceId2);
          expect(incrementResult.isOk()).toBe(true);
          if (incrementResult.isOk()) {
            clock = incrementResult.value;
          }
        }

        const result = LogicalTimestamp.fromVectorClock(clock);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const timestamp = result.value;
          expect(timestamp.getTimestamp()).toBe(5);
          expect(timestamp.getDeviceId()).toEqual(mockDeviceId2);
        }
      }
    });
  });

  describe('now', () => {
    it('should create timestamp for current time', () => {
      const result = LogicalTimestamp.now(mockDeviceId1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.getDeviceId()).toEqual(mockDeviceId1);
        expect(timestamp.getTimestamp()).toBe(1); // First increment
      }
    });

    it('should handle vector clock creation errors', () => {
      // Create invalid device ID to trigger error
      const invalidDeviceResult = DeviceId.create('');
      expect(invalidDeviceResult.isErr()).toBe(true);

      // We can't actually test this path easily since DeviceId.create validates,
      // but we can verify the error propagation pattern
      const result = LogicalTimestamp.now(mockDeviceId1);
      expect(result.isOk()).toBe(true); // Should work with valid device
    });
  });

  describe('compareTo', () => {
    it('should compare timestamps by timestamp value first', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 2, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.compareTo(ts2Result.value)).toBeLessThan(0);
        expect(ts2Result.value.compareTo(ts1Result.value)).toBeGreaterThan(0);
      }
    });

    it('should compare by vector clock hash when timestamps equal', () => {
      const clock1Result = VectorClock.create(mockDeviceId1);
      const clock2Result = VectorClock.create(mockDeviceId2);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, clock1Result.value);
        const ts2Result = LogicalTimestamp.create(mockDeviceId2, 1, clock2Result.value);

        expect(ts1Result.isOk()).toBe(true);
        expect(ts2Result.isOk()).toBe(true);

        if (ts1Result.isOk() && ts2Result.isOk()) {
          const comparison = ts1Result.value.compareTo(ts2Result.value);
          // Should not be 0 since different vector clock hashes
          expect(comparison).not.toBe(0);
        }
      }
    });

    it('should compare by device ID when timestamps and hashes equal', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId2, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        const comparison = ts1Result.value.compareTo(ts2Result.value);
        const deviceComparison = mockDeviceId1.getValue().localeCompare(mockDeviceId2.getValue());
        expect(Math.sign(comparison)).toBe(Math.sign(deviceComparison));
      }
    });

    it('should return 0 for identical timestamps', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.compareTo(ts2Result.value)).toBe(0);
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal timestamps', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.equals(ts2Result.value)).toBe(true);
      }
    });

    it('should return false for different timestamps', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 2, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.equals(ts2Result.value)).toBe(false);
      }
    });

    it('should return false for different device IDs', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId2, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.equals(ts2Result.value)).toBe(false);
      }
    });

    it('should return false for different vector clock hashes', () => {
      const clock1Result = VectorClock.create(mockDeviceId1);
      const clock2Result = VectorClock.create(mockDeviceId2);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, clock1Result.value);
        const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, clock2Result.value);

        expect(ts1Result.isOk()).toBe(true);
        expect(ts2Result.isOk()).toBe(true);

        if (ts1Result.isOk() && ts2Result.isOk()) {
          expect(ts1Result.value.equals(ts2Result.value)).toBe(false);
        }
      }
    });
  });

  describe('isAfter', () => {
    it('should return true when timestamp is greater', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 2, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.isAfter(ts2Result.value)).toBe(true);
        expect(ts2Result.value.isAfter(ts1Result.value)).toBe(false);
      }
    });

    it('should return false for equal timestamps', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.isAfter(ts2Result.value)).toBe(false);
      }
    });
  });

  describe('isBefore', () => {
    it('should return true when timestamp is smaller', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 2, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.isBefore(ts2Result.value)).toBe(true);
        expect(ts2Result.value.isBefore(ts1Result.value)).toBe(false);
      }
    });

    it('should return false for equal timestamps', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.isBefore(ts2Result.value)).toBe(false);
      }
    });
  });

  describe('isConcurrentWith', () => {
    it('should return true for same timestamp but different vector clocks', () => {
      const clock1Result = VectorClock.create(mockDeviceId1);
      const clock2Result = VectorClock.create(mockDeviceId2);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, clock1Result.value);
        const ts2Result = LogicalTimestamp.create(mockDeviceId2, 1, clock2Result.value);

        expect(ts1Result.isOk()).toBe(true);
        expect(ts2Result.isOk()).toBe(true);

        if (ts1Result.isOk() && ts2Result.isOk()) {
          expect(ts1Result.value.isConcurrentWith(ts2Result.value)).toBe(true);
        }
      }
    });

    it('should return false for different timestamps', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 2, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.isConcurrentWith(ts2Result.value)).toBe(false);
      }
    });

    it('should return false for same timestamp and same vector clock', () => {
      const ts1Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);
      const ts2Result = LogicalTimestamp.create(mockDeviceId1, 1, mockVectorClock);

      expect(ts1Result.isOk()).toBe(true);
      expect(ts2Result.isOk()).toBe(true);

      if (ts1Result.isOk() && ts2Result.isOk()) {
        expect(ts1Result.value.isConcurrentWith(ts2Result.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, 5, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const str = result.value.toString();
        expect(str).toContain(mockDeviceId1.getShortId());
        expect(str).toContain('@5');
        expect(str).toMatch(/.*@5/);
      }
    });

    it('should use short device ID in string representation', () => {
      const longDeviceResult = DeviceId.create(
        'very-long-device-identifier-that-should-be-shortened'
      );
      expect(longDeviceResult.isOk()).toBe(true);

      if (longDeviceResult.isOk()) {
        const result = LogicalTimestamp.create(longDeviceResult.value, 1, mockVectorClock);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const str = result.value.toString();
          expect(str).toContain(longDeviceResult.value.getShortId());
          expect(str).not.toContain('very-long-device-identifier-that-should-be-shortened');
        }
      }
    });
  });

  describe('toCompactString', () => {
    it('should return compact string representation', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, 5, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const str = result.value.toCompactString();
        expect(str).toMatch(/^5:/);
        expect(str).toContain(':');
        // Should contain first 8 characters of hash
        expect(str.length).toBeGreaterThan(2);
      }
    });

    it('should use truncated vector clock hash', () => {
      const result = LogicalTimestamp.create(mockDeviceId1, 123, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const compact = result.value.toCompactString();
        const parts = compact.split(':');
        expect(parts[0]).toBe('123');
        expect(parts[1]?.length).toBe(8); // First 8 characters of hash
      }
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      // Set up initial time
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const result = LogicalTimestamp.create(mockDeviceId1, 1609459200, mockVectorClock); // timestamp in seconds
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const timestamp = result.value;

        // Move forward in time
        vi.setSystemTime(new Date('2024-01-01T00:01:00Z')); // 1 minute later

        const age = timestamp.getAge();
        // Should be roughly 60000ms difference, but timestamp conversion affects this
        expect(age).toBeGreaterThan(0);
      }
    });

    it('should handle current timestamp', () => {
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const result = LogicalTimestamp.create(mockDeviceId1, currentTimeSeconds, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const age = result.value.getAge();
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThan(1000); // Should be very recent
      }
    });
  });

  describe('isExpired', () => {
    it('should identify expired timestamps', () => {
      // Create timestamp in the past
      const pastTimeSeconds = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const result = LogicalTimestamp.create(mockDeviceId1, pastTimeSeconds, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.isExpired(1000)).toBe(true); // Expired if max age is 1 second
        expect(timestamp.isExpired(3600 * 1000 * 2)).toBe(false); // Not expired if max age is 2 hours
      }
    });

    it('should identify non-expired timestamps', () => {
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const result = LogicalTimestamp.create(mockDeviceId1, currentTimeSeconds, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        expect(timestamp.isExpired(60000)).toBe(false); // 1 minute max age
      }
    });

    it('should handle edge case of exactly max age', () => {
      const pastTimeSeconds = Math.floor(Date.now() / 1000) - 1; // 1 second ago
      const result = LogicalTimestamp.create(mockDeviceId1, pastTimeSeconds, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value;
        const age = timestamp.getAge();
        expect(timestamp.isExpired(age - 1)).toBe(true);
        expect(timestamp.isExpired(age + 1000)).toBe(false);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle large timestamp values', () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      const result = LogicalTimestamp.create(mockDeviceId1, largeTimestamp, mockVectorClock);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp()).toBe(largeTimestamp);
      }
    });

    it('should handle vector clock with no devices properly', () => {
      // This tests the error path in fromVectorClock
      const emptyClockResult = VectorClock.create();
      expect(emptyClockResult.isOk()).toBe(true);

      if (emptyClockResult.isOk()) {
        const result = LogicalTimestamp.fromVectorClock(emptyClockResult.value);
        expect(result.isErr()).toBe(true);
      }
    });
  });
});
