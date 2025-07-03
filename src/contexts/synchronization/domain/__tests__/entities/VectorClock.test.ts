/**
 * Tests for VectorClock entity
 *
 * Focuses on:
 * - VectorClock creation and initialization
 * - Clock increment and merge operations
 * - Causality detection (happens-before, happens-after)
 * - Concurrency detection between clocks
 * - Clock comparison and equality
 * - Device ID management and timestamp retrieval
 * - Serialization and string representation
 * - High coverage for vector clock logic
 */

import { describe, expect, it } from 'vitest';

import { VectorClock } from '../../entities/VectorClock';
import { DeviceId } from '../../value-objects/DeviceId';

const createTestDeviceId = (deviceId: string): DeviceId => {
  const result = DeviceId.create(deviceId);
  if (result.isErr()) {
    throw new Error(`Failed to create DeviceId: ${deviceId}`);
  }
  return result.value;
};

describe('VectorClock', () => {
  describe('create', () => {
    it('should create empty vector clock without initial device', () => {
      const result = VectorClock.create();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clock = result.value;
        expect(clock.getAllDeviceIds()).toHaveLength(0);
        expect(clock.getClockState().size).toBe(0);
      }
    });

    it('should create vector clock with initial device', () => {
      const deviceId = createTestDeviceId('device-1');
      const result = VectorClock.create(deviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clock = result.value;
        expect(clock.getAllDeviceIds()).toHaveLength(1);
        expect(clock.getTimestampForDevice(deviceId)).toBe(0);
        expect(clock.getAllDeviceIds()[0].getValue()).toBe('device-1');
      }
    });

    it('should create vector clock with initial timestamp of 0', () => {
      const deviceId = createTestDeviceId('initial-device');
      const result = VectorClock.create(deviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clock = result.value;
        const clockState = clock.getClockState();
        expect(clockState.get('initial-device')).toBe(0);
      }
    });
  });

  describe('fromMap', () => {
    it('should create vector clock from valid map', () => {
      const clockMap = new Map([
        ['device-a', 5],
        ['device-b', 3],
        ['device-c', 7],
      ]);

      const result = VectorClock.fromMap(clockMap);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clock = result.value;
        expect(clock.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(5);
        expect(clock.getTimestampForDevice(createTestDeviceId('device-b'))).toBe(3);
        expect(clock.getTimestampForDevice(createTestDeviceId('device-c'))).toBe(7);
      }
    });

    it('should fail with negative timestamps', () => {
      const clockMap = new Map([
        ['device-a', 5],
        ['device-b', -1], // Invalid negative timestamp
        ['device-c', 3],
      ]);

      const result = VectorClock.fromMap(clockMap);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid timestamp for device device-b');
      }
    });

    it('should handle empty map', () => {
      const clockMap = new Map<string, number>();
      const result = VectorClock.fromMap(clockMap);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clock = result.value;
        expect(clock.getAllDeviceIds()).toHaveLength(0);
      }
    });

    it('should handle map with zero timestamps', () => {
      const clockMap = new Map([
        ['device-a', 0],
        ['device-b', 0],
      ]);

      const result = VectorClock.fromMap(clockMap);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const clock = result.value;
        expect(clock.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(0);
        expect(clock.getTimestampForDevice(createTestDeviceId('device-b'))).toBe(0);
      }
    });
  });

  describe('incrementForDevice', () => {
    it('should increment existing device timestamp', () => {
      const deviceId = createTestDeviceId('device-1');
      const clockResult = VectorClock.create(deviceId);

      expect(clockResult.isOk()).toBe(true);
      if (clockResult.isOk()) {
        const incremented = clockResult.value.incrementForDevice(deviceId);

        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          expect(incremented.value.getTimestampForDevice(deviceId)).toBe(1);
        }
      }
    });

    it('should add new device with timestamp 1', () => {
      const existingDevice = createTestDeviceId('existing-device');
      const newDevice = createTestDeviceId('new-device');

      const clockResult = VectorClock.create(existingDevice);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const incremented = clockResult.value.incrementForDevice(newDevice);

        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          const clock = incremented.value;
          expect(clock.getTimestampForDevice(newDevice)).toBe(1);
          expect(clock.getTimestampForDevice(existingDevice)).toBe(0); // Unchanged
          expect(clock.getAllDeviceIds()).toHaveLength(2);
        }
      }
    });

    it('should increment multiple times', () => {
      const deviceId = createTestDeviceId('multi-increment');
      const clockResult = VectorClock.create(deviceId);

      expect(clockResult.isOk()).toBe(true);
      if (clockResult.isOk()) {
        let current = clockResult.value;

        for (let i = 1; i <= 5; i++) {
          const incremented = current.incrementForDevice(deviceId);
          expect(incremented.isOk()).toBe(true);
          if (incremented.isOk()) {
            current = incremented.value;
            expect(current.getTimestampForDevice(deviceId)).toBe(i);
          }
        }
      }
    });

    it('should preserve immutability', () => {
      const deviceId = createTestDeviceId('immutable-test');
      const clockResult = VectorClock.create(deviceId);

      expect(clockResult.isOk()).toBe(true);
      if (clockResult.isOk()) {
        const original = clockResult.value;
        const incremented = original.incrementForDevice(deviceId);

        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          // Original should be unchanged
          expect(original.getTimestampForDevice(deviceId)).toBe(0);
          // New instance should be incremented
          expect(incremented.value.getTimestampForDevice(deviceId)).toBe(1);
          expect(incremented.value).not.toBe(original);
        }
      }
    });
  });

  describe('mergeWith', () => {
    it('should merge two non-overlapping clocks', () => {
      const clock1Map = new Map([['device-a', 5]]);
      const clock2Map = new Map([['device-b', 3]]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const merged = clock1Result.value.mergeWith(clock2Result.value);

        expect(merged.isOk()).toBe(true);
        if (merged.isOk()) {
          const mergedClock = merged.value;
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(5);
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-b'))).toBe(3);
          expect(mergedClock.getAllDeviceIds()).toHaveLength(2);
        }
      }
    });

    it('should merge overlapping clocks taking maximum timestamps', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 2],
        ['device-c', 8],
      ]);
      const clock2Map = new Map([
        ['device-a', 3], // Lower than clock1
        ['device-b', 7], // Higher than clock1
        ['device-d', 4], // New device
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const merged = clock1Result.value.mergeWith(clock2Result.value);

        expect(merged.isOk()).toBe(true);
        if (merged.isOk()) {
          const mergedClock = merged.value;
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(5); // max(5, 3)
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-b'))).toBe(7); // max(2, 7)
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-c'))).toBe(8); // only in clock1
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-d'))).toBe(4); // only in clock2
          expect(mergedClock.getAllDeviceIds()).toHaveLength(4);
        }
      }
    });

    it('should merge with empty clock', () => {
      const clock1Map = new Map([['device-a', 5]]);
      const emptyClockResult = VectorClock.create();
      const clock1Result = VectorClock.fromMap(clock1Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(emptyClockResult.isOk()).toBe(true);

      if (clock1Result.isOk() && emptyClockResult.isOk()) {
        const merged = clock1Result.value.mergeWith(emptyClockResult.value);

        expect(merged.isOk()).toBe(true);
        if (merged.isOk()) {
          const mergedClock = merged.value;
          expect(mergedClock.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(5);
          expect(mergedClock.getAllDeviceIds()).toHaveLength(1);
        }
      }
    });

    it('should preserve immutability during merge', () => {
      const clock1Map = new Map([['device-a', 5]]);
      const clock2Map = new Map([['device-b', 3]]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const original1 = clock1Result.value;
        const original2 = clock2Result.value;
        const merged = original1.mergeWith(original2);

        expect(merged.isOk()).toBe(true);
        if (merged.isOk()) {
          // Originals should be unchanged
          expect(original1.getAllDeviceIds()).toHaveLength(1);
          expect(original2.getAllDeviceIds()).toHaveLength(1);
          // Merged should be new instance
          expect(merged.value.getAllDeviceIds()).toHaveLength(2);
          expect(merged.value).not.toBe(original1);
          expect(merged.value).not.toBe(original2);
        }
      }
    });
  });

  describe('causality detection - happensAfter', () => {
    it('should detect when clock happens after another', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);
      const clock2Map = new Map([
        ['device-a', 4], // Less than clock1
        ['device-b', 2], // Less than clock1
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.happensAfter(clock2Result.value)).toBe(true);
        expect(clock2Result.value.happensAfter(clock1Result.value)).toBe(false);
      }
    });

    it('should detect when clocks are not causally related', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 2], // Less than clock2
      ]);
      const clock2Map = new Map([
        ['device-a', 4], // Less than clock1
        ['device-b', 3], // Greater than clock1
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.happensAfter(clock2Result.value)).toBe(false);
        expect(clock2Result.value.happensAfter(clock1Result.value)).toBe(false);
      }
    });

    it('should handle clocks with different device sets', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);
      const clock2Map = new Map([
        ['device-a', 4],
        ['device-c', 2], // Different device
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        // clock1 has device-b with timestamp > 0, but clock2 doesn't have device-b
        // clock2 has device-c with timestamp > 0, but clock1 doesn't have device-c
        expect(clock1Result.value.happensAfter(clock2Result.value)).toBe(false);
        expect(clock2Result.value.happensAfter(clock1Result.value)).toBe(false);
      }
    });

    it('should detect equal clocks do not happen after each other', () => {
      const clockMap = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);

      const clock1Result = VectorClock.fromMap(clockMap);
      const clock2Result = VectorClock.fromMap(clockMap);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.happensAfter(clock2Result.value)).toBe(false);
        expect(clock2Result.value.happensAfter(clock1Result.value)).toBe(false);
      }
    });
  });

  describe('causality detection - happensBefore', () => {
    it('should detect when clock happens before another', () => {
      const clock1Map = new Map([
        ['device-a', 2],
        ['device-b', 1],
      ]);
      const clock2Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.happensBefore(clock2Result.value)).toBe(true);
        expect(clock2Result.value.happensBefore(clock1Result.value)).toBe(false);
      }
    });

    it('should be consistent with happensAfter', () => {
      const clock1Map = new Map([['device-a', 3]]);
      const clock2Map = new Map([['device-a', 7]]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;

        // If clock1 happens before clock2, then clock2 happens after clock1
        expect(clock1.happensBefore(clock2)).toBe(clock2.happensAfter(clock1));
        expect(clock2.happensBefore(clock1)).toBe(clock1.happensAfter(clock2));
      }
    });
  });

  describe('concurrency detection', () => {
    it('should detect concurrent clocks', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 2],
      ]);
      const clock2Map = new Map([
        ['device-a', 3],
        ['device-b', 4],
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.isConcurrentWith(clock2Result.value)).toBe(true);
        expect(clock2Result.value.isConcurrentWith(clock1Result.value)).toBe(true);
      }
    });

    it('should detect non-concurrent clocks with causal relationship', () => {
      const clock1Map = new Map([
        ['device-a', 2],
        ['device-b', 1],
      ]);
      const clock2Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.isConcurrentWith(clock2Result.value)).toBe(false);
        expect(clock2Result.value.isConcurrentWith(clock1Result.value)).toBe(false);
      }
    });

    it('should provide isConcurrent alias method', () => {
      const clock1Map = new Map([['device-a', 5]]);
      const clock2Map = new Map([['device-a', 3]]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;

        expect(clock1.isConcurrent(clock2)).toBe(clock1.isConcurrentWith(clock2));
        expect(clock2.isConcurrent(clock1)).toBe(clock2.isConcurrentWith(clock1));
      }
    });

    it('should detect equal clocks are not concurrent', () => {
      const clockMap = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);

      const clock1Result = VectorClock.fromMap(clockMap);
      const clock2Result = VectorClock.fromMap(clockMap);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.isConcurrentWith(clock2Result.value)).toBe(false);
      }
    });
  });

  describe('equality comparison', () => {
    it('should detect equal clocks', () => {
      const clockMap = new Map([
        ['device-a', 5],
        ['device-b', 3],
        ['device-c', 7],
      ]);

      const clock1Result = VectorClock.fromMap(clockMap);
      const clock2Result = VectorClock.fromMap(clockMap);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.equals(clock2Result.value)).toBe(true);
        expect(clock2Result.value.equals(clock1Result.value)).toBe(true);
      }
    });

    it('should detect unequal clocks with different sizes', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);
      const clock2Map = new Map([['device-a', 5]]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.equals(clock2Result.value)).toBe(false);
        expect(clock2Result.value.equals(clock1Result.value)).toBe(false);
      }
    });

    it('should detect unequal clocks with different timestamps', () => {
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
      ]);
      const clock2Map = new Map([
        ['device-a', 5],
        ['device-b', 4], // Different timestamp
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        expect(clock1Result.value.equals(clock2Result.value)).toBe(false);
      }
    });

    it('should handle empty clocks equality', () => {
      const empty1 = VectorClock.create();
      const empty2 = VectorClock.create();

      expect(empty1.isOk()).toBe(true);
      expect(empty2.isOk()).toBe(true);

      if (empty1.isOk() && empty2.isOk()) {
        expect(empty1.value.equals(empty2.value)).toBe(true);
      }
    });
  });

  describe('device and timestamp access', () => {
    it('should return correct timestamp for existing device', () => {
      const clockMap = new Map([
        ['device-alpha', 10],
        ['device-beta', 25],
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        expect(clock.getTimestampForDevice(createTestDeviceId('device-alpha'))).toBe(10);
        expect(clock.getTimestampForDevice(createTestDeviceId('device-beta'))).toBe(25);
      }
    });

    it('should return 0 for non-existent device', () => {
      const clockMap = new Map([['device-exists', 5]]);
      const clockResult = VectorClock.fromMap(clockMap);

      expect(clockResult.isOk()).toBe(true);
      if (clockResult.isOk()) {
        const clock = clockResult.value;
        expect(clock.getTimestampForDevice(createTestDeviceId('device-nonexistent'))).toBe(0);
      }
    });

    it('should return all device IDs correctly', () => {
      const clockMap = new Map([
        ['device-1', 3],
        ['device-2', 7],
        ['device-3', 1],
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const deviceIds = clock.getAllDeviceIds();
        expect(deviceIds).toHaveLength(3);

        const deviceValues = deviceIds.map(d => d.getValue()).sort();
        expect(deviceValues).toEqual(['device-1', 'device-2', 'device-3']);
      }
    });

    it('should handle empty clock device access', () => {
      const emptyResult = VectorClock.create();
      expect(emptyResult.isOk()).toBe(true);

      if (emptyResult.isOk()) {
        const empty = emptyResult.value;
        expect(empty.getAllDeviceIds()).toHaveLength(0);
        expect(empty.getTimestampForDevice(createTestDeviceId('any-device'))).toBe(0);
      }
    });

    it('should return correct clock state map', () => {
      const originalMap = new Map([
        ['device-x', 15],
        ['device-y', 8],
      ]);

      const clockResult = VectorClock.fromMap(originalMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const clockState = clock.getClockState();

        expect(clockState.size).toBe(2);
        expect(clockState.get('device-x')).toBe(15);
        expect(clockState.get('device-y')).toBe(8);
        expect(clockState).not.toBe(originalMap); // Should be a copy
      }
    });
  });

  describe('string representation', () => {
    it('should generate compact string representation', () => {
      const clockMap = new Map([
        ['device-b', 3],
        ['device-a', 5], // Will be sorted alphabetically
        ['device-c', 1],
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const compactString = clock.toCompactString();

        // Should be sorted alphabetically
        expect(compactString).toBe('{device-a:5,device-b:3,device-c:1}');
      }
    });

    it('should generate compact string for empty clock', () => {
      const emptyResult = VectorClock.create();
      expect(emptyResult.isOk()).toBe(true);

      if (emptyResult.isOk()) {
        const empty = emptyResult.value;
        expect(empty.toCompactString()).toBe('{}');
      }
    });

    it('should generate compact string for single device', () => {
      const deviceId = createTestDeviceId('single-device');
      const clockResult = VectorClock.create(deviceId);

      expect(clockResult.isOk()).toBe(true);
      if (clockResult.isOk()) {
        const clock = clockResult.value;
        expect(clock.toCompactString()).toBe('{single-device:0}');
      }
    });

    it('should handle special characters in device names', () => {
      const clockMap = new Map([['device-with-hyphens_and_underscores', 42]]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const compactString = clock.toCompactString();
        expect(compactString).toBe('{device-with-hyphens_and_underscores:42}');
      }
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle very large timestamps', () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      const clockMap = new Map([['device-large', largeTimestamp]]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        expect(clock.getTimestampForDevice(createTestDeviceId('device-large'))).toBe(
          largeTimestamp
        );

        const incremented = clock.incrementForDevice(createTestDeviceId('device-large'));
        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          expect(incremented.value.getTimestampForDevice(createTestDeviceId('device-large'))).toBe(
            largeTimestamp + 1
          );
        }
      }
    });

    it('should handle many devices efficiently', () => {
      const manyDevices = new Map<string, number>();
      for (let i = 0; i < 100; i++) {
        manyDevices.set(`device-${i}`, i * 2);
      }

      const clockResult = VectorClock.fromMap(manyDevices);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        expect(clock.getAllDeviceIds()).toHaveLength(100);
        expect(clock.getTimestampForDevice(createTestDeviceId('device-50'))).toBe(100);

        // Test operations on large clock
        const merged = clock.mergeWith(clock);
        expect(merged.isOk()).toBe(true);
        if (merged.isOk()) {
          expect(merged.value.getAllDeviceIds()).toHaveLength(100);
        }
      }
    });

    it('should handle device ID creation failures gracefully', () => {
      const clockMap = new Map([
        ['valid-device', 5],
        ['invalid@device', 3], // Contains invalid character for DeviceId
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const deviceIds = clock.getAllDeviceIds();

        // Should only include devices that can be converted to valid DeviceIds
        expect(deviceIds.length).toBeLessThanOrEqual(2);
        const validDevices = deviceIds.filter(d => d.getValue() === 'valid-device');
        expect(validDevices).toHaveLength(1);
      }
    });

    it('should handle zero timestamps correctly in all operations', () => {
      const clockMap = new Map([
        ['device-zero', 0],
        ['device-nonzero', 5],
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;

        // Test all operations with zero timestamps
        expect(clock.getTimestampForDevice(createTestDeviceId('device-zero'))).toBe(0);

        const incremented = clock.incrementForDevice(createTestDeviceId('device-zero'));
        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          expect(incremented.value.getTimestampForDevice(createTestDeviceId('device-zero'))).toBe(
            1
          );
        }

        const compactString = clock.toCompactString();
        expect(compactString).toContain('device-zero:0');
      }
    });
  });

  describe('complex causality scenarios', () => {
    it('should correctly handle complex causality chains', () => {
      // Simulate a causality chain: A → B → C
      const clockA = new Map([['device-a', 1]]);
      const clockB = new Map([
        ['device-a', 1],
        ['device-b', 1],
      ]);
      const clockC = new Map([
        ['device-a', 1],
        ['device-b', 1],
        ['device-c', 1],
      ]);

      const aResult = VectorClock.fromMap(clockA);
      const bResult = VectorClock.fromMap(clockB);
      const cResult = VectorClock.fromMap(clockC);

      expect(aResult.isOk()).toBe(true);
      expect(bResult.isOk()).toBe(true);
      expect(cResult.isOk()).toBe(true);

      if (aResult.isOk() && bResult.isOk() && cResult.isOk()) {
        const a = aResult.value;
        const b = bResult.value;
        const c = cResult.value;

        // Verify causality chain
        expect(a.happensBefore(b)).toBe(true);
        expect(b.happensBefore(c)).toBe(true);
        expect(a.happensBefore(c)).toBe(true); // Transitivity

        expect(c.happensAfter(b)).toBe(true);
        expect(b.happensAfter(a)).toBe(true);
        expect(c.happensAfter(a)).toBe(true); // Transitivity

        // No concurrency in causal chain
        expect(a.isConcurrentWith(b)).toBe(false);
        expect(b.isConcurrentWith(c)).toBe(false);
        expect(a.isConcurrentWith(c)).toBe(false);
      }
    });

    it('should handle diamond causality pattern', () => {
      // Diamond pattern: A → B, A → C, B → D, C → D
      const clockA = new Map([['device-a', 1]]);
      const clockB = new Map([
        ['device-a', 1],
        ['device-b', 1],
      ]);
      const clockC = new Map([
        ['device-a', 1],
        ['device-c', 1],
      ]);
      const clockD = new Map([
        ['device-a', 1],
        ['device-b', 1],
        ['device-c', 1],
      ]);

      const aResult = VectorClock.fromMap(clockA);
      const bResult = VectorClock.fromMap(clockB);
      const cResult = VectorClock.fromMap(clockC);
      const dResult = VectorClock.fromMap(clockD);

      expect(aResult.isOk()).toBe(true);
      expect(bResult.isOk()).toBe(true);
      expect(cResult.isOk()).toBe(true);
      expect(dResult.isOk()).toBe(true);

      if (aResult.isOk() && bResult.isOk() && cResult.isOk() && dResult.isOk()) {
        const a = aResult.value;
        const b = bResult.value;
        const c = cResult.value;
        const d = dResult.value;

        // A happens before all others
        expect(a.happensBefore(b)).toBe(true);
        expect(a.happensBefore(c)).toBe(true);
        expect(a.happensBefore(d)).toBe(true);

        // B and C are concurrent (both depend only on A)
        expect(b.isConcurrentWith(c)).toBe(true);
        expect(c.isConcurrentWith(b)).toBe(true);

        // D happens after all others
        expect(d.happensAfter(a)).toBe(true);
        expect(d.happensAfter(b)).toBe(true);
        expect(d.happensAfter(c)).toBe(true);
      }
    });
  });
});
