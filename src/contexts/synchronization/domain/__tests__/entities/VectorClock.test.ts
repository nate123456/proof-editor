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
        expect(clock.getAllDeviceIds()[0]?.getValue()).toBe('device-1');
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

        const deviceValues = deviceIds.map((d) => d.getValue()).sort();
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
          largeTimestamp,
        );

        const incremented = clock.incrementForDevice(createTestDeviceId('device-large'));
        expect(incremented.isOk()).toBe(true);
        if (incremented.isOk()) {
          expect(incremented.value.getTimestampForDevice(createTestDeviceId('device-large'))).toBe(
            largeTimestamp + 1,
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
        const validDevices = deviceIds.filter((d) => d.getValue() === 'valid-device');
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
            1,
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

    it('should handle distributed system partition scenarios', () => {
      // Simulate network partition where devices progress independently
      const partition1Clock = new Map([
        ['device-a', 10],
        ['device-b', 5],
        ['device-c', 0], // Not seen recent updates from C
      ]);

      const partition2Clock = new Map([
        ['device-a', 3], // Stale view of A
        ['device-b', 2], // Stale view of B
        ['device-c', 15], // Progressed independently
      ]);

      const clock1Result = VectorClock.fromMap(partition1Clock);
      const clock2Result = VectorClock.fromMap(partition2Clock);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;

        // Neither partition happens after the other
        expect(clock1.happensAfter(clock2)).toBe(false);
        expect(clock2.happensAfter(clock1)).toBe(false);

        // They are concurrent (network partition scenario)
        expect(clock1.isConcurrentWith(clock2)).toBe(true);
        expect(clock2.isConcurrentWith(clock1)).toBe(true);

        // Merge should take maximum of each device
        const mergedResult = clock1.mergeWith(clock2);
        expect(mergedResult.isOk()).toBe(true);
        if (mergedResult.isOk()) {
          const merged = mergedResult.value;
          expect(merged.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(10); // max(10, 3)
          expect(merged.getTimestampForDevice(createTestDeviceId('device-b'))).toBe(5); // max(5, 2)
          expect(merged.getTimestampForDevice(createTestDeviceId('device-c'))).toBe(15); // max(0, 15)
        }
      }
    });

    it('should handle asymmetric device knowledge', () => {
      // Clock 1 knows about devices A, B, C
      // Clock 2 only knows about devices A, D
      const clock1Map = new Map([
        ['device-a', 5],
        ['device-b', 3],
        ['device-c', 7],
      ]);

      const clock2Map = new Map([
        ['device-a', 8], // Higher timestamp for shared device
        ['device-d', 2], // New device unknown to clock1
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;

        // Neither completely dominates the other
        expect(clock1.happensAfter(clock2)).toBe(false);
        expect(clock2.happensAfter(clock1)).toBe(false);
        expect(clock1.isConcurrentWith(clock2)).toBe(true);

        // Test merge behavior with asymmetric knowledge
        const mergedResult = clock1.mergeWith(clock2);
        expect(mergedResult.isOk()).toBe(true);
        if (mergedResult.isOk()) {
          const merged = mergedResult.value;
          expect(merged.getAllDeviceIds()).toHaveLength(4); // A, B, C, D
          expect(merged.getTimestampForDevice(createTestDeviceId('device-a'))).toBe(8); // max(5, 8)
          expect(merged.getTimestampForDevice(createTestDeviceId('device-b'))).toBe(3); // only in clock1
          expect(merged.getTimestampForDevice(createTestDeviceId('device-c'))).toBe(7); // only in clock1
          expect(merged.getTimestampForDevice(createTestDeviceId('device-d'))).toBe(2); // only in clock2
        }
      }
    });
  });

  describe('CRDT-specific edge cases', () => {
    it('should handle rapid increments from same device', () => {
      const deviceId = createTestDeviceId('rapid-device');
      const clockResult = VectorClock.create(deviceId);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        let current = clockResult.value;

        // Simulate rapid operations from same device
        for (let i = 1; i <= 1000; i++) {
          const incrementResult = current.incrementForDevice(deviceId);
          expect(incrementResult.isOk()).toBe(true);
          if (incrementResult.isOk()) {
            current = incrementResult.value;
            expect(current.getTimestampForDevice(deviceId)).toBe(i);
          }
        }

        // Final state should have correct timestamp
        expect(current.getTimestampForDevice(deviceId)).toBe(1000);
      }
    });

    it('should handle clock synchronization scenarios', () => {
      // Scenario: Three devices start at different times and sync
      const deviceA = createTestDeviceId('device-a');
      const deviceB = createTestDeviceId('device-b');
      const deviceC = createTestDeviceId('device-c');

      // Device A starts first
      let clockA = VectorClock.create(deviceA);
      expect(clockA.isOk()).toBe(true);
      if (clockA.isOk()) {
        clockA = clockA.value.incrementForDevice(deviceA); // A: {a: 1}
        expect(clockA.isOk()).toBe(true);
        if (clockA.isOk()) {
          clockA = clockA.value.incrementForDevice(deviceA); // A: {a: 2}
        }
      }

      // Device B starts later, syncs with A
      let clockB = VectorClock.create(deviceB);
      expect(clockB.isOk()).toBe(true);
      if (clockB.isOk() && clockA.isOk()) {
        const syncResult = clockB.value.mergeWith(clockA.value);
        expect(syncResult.isOk()).toBe(true);
        if (syncResult.isOk()) {
          clockB = syncResult;
          clockB = clockB.value.incrementForDevice(deviceB); // B: {a: 2, b: 1}
        }
      }

      // Device C starts last, syncs with B
      let clockC = VectorClock.create(deviceC);
      expect(clockC.isOk()).toBe(true);
      if (clockC.isOk() && clockB.isOk()) {
        const syncResult = clockC.value.mergeWith(clockB.value);
        expect(syncResult.isOk()).toBe(true);
        if (syncResult.isOk()) {
          clockC = syncResult;
          clockC = clockC.value.incrementForDevice(deviceC); // C: {a: 2, b: 1, c: 1}
        }
      }

      // Verify final state relationships
      if (clockA.isOk() && clockB.isOk() && clockC.isOk()) {
        // A should happen before B and C
        expect(clockA.value.happensBefore(clockB.value)).toBe(true);
        expect(clockA.value.happensBefore(clockC.value)).toBe(true);

        // B should happen before C
        expect(clockB.value.happensBefore(clockC.value)).toBe(true);

        // No concurrency in this synchronized chain
        expect(clockA.value.isConcurrentWith(clockB.value)).toBe(false);
        expect(clockB.value.isConcurrentWith(clockC.value)).toBe(false);
      }
    });

    it('should handle merge commutativity and associativity', () => {
      const clock1Map = new Map([
        ['device-a', 3],
        ['device-b', 1],
      ]);
      const clock2Map = new Map([
        ['device-a', 1],
        ['device-c', 2],
      ]);
      const clock3Map = new Map([
        ['device-b', 3],
        ['device-d', 1],
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);
      const clock3Result = VectorClock.fromMap(clock3Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);
      expect(clock3Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk() && clock3Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;
        const clock3 = clock3Result.value;

        // Test commutativity: A ∪ B === B ∪ A
        const merge12Result = clock1.mergeWith(clock2);
        const merge21Result = clock2.mergeWith(clock1);

        expect(merge12Result.isOk()).toBe(true);
        expect(merge21Result.isOk()).toBe(true);

        if (merge12Result.isOk() && merge21Result.isOk()) {
          expect(merge12Result.value.equals(merge21Result.value)).toBe(true);

          // Test associativity: (A ∪ B) ∪ C === A ∪ (B ∪ C)
          const merge123Result = merge12Result.value.mergeWith(clock3);
          const merge23Result = clock2.mergeWith(clock3);

          expect(merge123Result.isOk()).toBe(true);
          expect(merge23Result.isOk()).toBe(true);

          if (merge123Result.isOk() && merge23Result.isOk()) {
            const merge1_23Result = clock1.mergeWith(merge23Result.value);
            expect(merge1_23Result.isOk()).toBe(true);

            if (merge1_23Result.isOk()) {
              expect(merge123Result.value.equals(merge1_23Result.value)).toBe(true);
            }
          }
        }
      }
    });
  });

  describe('performance and scalability', () => {
    it('should handle large numbers of devices efficiently', () => {
      const startTime = performance.now();
      const deviceCount = 1000;
      const clockMap = new Map<string, number>();

      // Create large clock with many devices
      for (let i = 0; i < deviceCount; i++) {
        clockMap.set(`device-${i}`, Math.floor(Math.random() * 100));
      }

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;

        // Test operations on large clock
        expect(clock.getAllDeviceIds()).toHaveLength(deviceCount);

        // Test increment performance
        const incrementTime = performance.now();
        const newDevice = createTestDeviceId('new-device');
        const incrementResult = clock.incrementForDevice(newDevice);
        const incrementDuration = performance.now() - incrementTime;

        expect(incrementResult.isOk()).toBe(true);
        expect(incrementDuration).toBeLessThan(20); // Should be fast even with many devices

        // Test merge performance with another large clock
        const clock2Map = new Map<string, number>();
        for (let i = deviceCount / 2; i < deviceCount + deviceCount / 2; i++) {
          clock2Map.set(`device-${i}`, Math.floor(Math.random() * 100));
        }

        const clock2Result = VectorClock.fromMap(clock2Map);
        expect(clock2Result.isOk()).toBe(true);

        if (clock2Result.isOk()) {
          const mergeTime = performance.now();
          const mergeResult = clock.mergeWith(clock2Result.value);
          const mergeDuration = performance.now() - mergeTime;

          expect(mergeResult.isOk()).toBe(true);
          expect(mergeDuration).toBeLessThan(50); // Merge should be reasonably fast

          if (mergeResult.isOk()) {
            expect(mergeResult.value.getAllDeviceIds().length).toBeGreaterThan(deviceCount);
          }
        }
      }

      const totalDuration = performance.now() - startTime;
      expect(totalDuration).toBeLessThan(1000); // Entire test should complete quickly
    });

    it('should maintain performance with repeated operations', () => {
      const deviceId = createTestDeviceId('perf-device');
      const clockResult = VectorClock.create(deviceId);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        let current = clockResult.value;
        const operationCount = 10000;
        const startTime = performance.now();

        // Perform many increment operations
        for (let i = 0; i < operationCount; i++) {
          const incrementResult = current.incrementForDevice(deviceId);
          expect(incrementResult.isOk()).toBe(true);
          if (incrementResult.isOk()) {
            current = incrementResult.value;
          }
        }

        const duration = performance.now() - startTime;
        const opsPerMs = operationCount / duration;

        // Should maintain good performance (at least 10 ops per ms)
        expect(opsPerMs).toBeGreaterThan(10);
        expect(current.getTimestampForDevice(deviceId)).toBe(operationCount);
      }
    });

    it('should handle memory efficiently with large clocks', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const clocks: any[] = [];

      // Create many clock instances
      for (let i = 0; i < 1000; i++) {
        const clockMap = new Map([
          [`device-${i}-a`, i],
          [`device-${i}-b`, i * 2],
          [`device-${i}-c`, i * 3],
        ]);

        const clockResult = VectorClock.fromMap(clockMap);
        if (clockResult.isOk()) {
          clocks.push(clockResult.value);
        }
      }

      // Perform operations on all clocks
      clocks.forEach((clock) => {
        clock.toCompactString();
        clock.getAllDeviceIds();
        clock.getClockState();
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 clocks)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(clocks).toHaveLength(1000);
    });
  });

  describe('additional coverage enhancements', () => {
    it('should handle invalid DeviceId creation failures during getAllDeviceIds edge cases', () => {
      // Force invalid device IDs that will fail DeviceId.create
      const clockMap = new Map([
        ['valid-device', 5],
        ['', 3], // Empty string - invalid for DeviceId
        [
          'device-with-very-long-name-that-exceeds-the-64-character-limit-for-device-ids-causing-creation-to-fail',
          7,
        ],
        ['device@with#invalid*chars!', 2], // Invalid characters
        ['device with spaces', 1], // Spaces are invalid
        [' leading-whitespace', 4], // Leading whitespace
        ['trailing-whitespace ', 6], // Trailing whitespace
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const deviceIds = clock.getAllDeviceIds();

        // Should filter out invalid device IDs that fail DeviceId.create
        expect(deviceIds.length).toBeLessThanOrEqual(7);

        // At least the valid one should be included
        const validDevices = deviceIds.filter((d) => d.getValue() === 'valid-device');
        expect(validDevices).toHaveLength(1);

        // All returned device IDs should be valid
        deviceIds.forEach((deviceId) => {
          expect(deviceId.getValue().length).toBeGreaterThan(0);
          expect(deviceId.getValue().length).toBeLessThanOrEqual(64);
          expect(/^[a-zA-Z0-9-_]+$/.test(deviceId.getValue())).toBe(true);
        });
      }
    });

    it('should handle complex merge scenarios with asymmetric device knowledge', () => {
      // Test complex merge with completely different device sets
      const clock1Map = new Map([
        ['server-node-1', 15],
        ['server-node-2', 8],
        ['worker-process-a', 12],
      ]);

      const clock2Map = new Map([
        ['mobile-client-1', 5],
        ['mobile-client-2', 3],
        ['edge-cache-x', 20],
      ]);

      const clock1Result = VectorClock.fromMap(clock1Map);
      const clock2Result = VectorClock.fromMap(clock2Map);

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;

        // Should be concurrent (no causal relationship)
        expect(clock1.isConcurrentWith(clock2)).toBe(true);
        expect(clock2.isConcurrentWith(clock1)).toBe(true);
        expect(clock1.happensAfter(clock2)).toBe(false);
        expect(clock1.happensBefore(clock2)).toBe(false);

        // Merge should combine all devices
        const mergedResult = clock1.mergeWith(clock2);
        expect(mergedResult.isOk()).toBe(true);
        if (mergedResult.isOk()) {
          const merged = mergedResult.value;
          expect(merged.getAllDeviceIds()).toHaveLength(6);

          // Verify all original timestamps preserved
          expect(merged.getTimestampForDevice(createTestDeviceId('server-node-1'))).toBe(15);
          expect(merged.getTimestampForDevice(createTestDeviceId('mobile-client-1'))).toBe(5);
          expect(merged.getTimestampForDevice(createTestDeviceId('edge-cache-x'))).toBe(20);
        }
      }
    });

    it('should handle incrementForDevice with new device on complex clock', () => {
      // Start with complex multi-device clock
      const baseClockMap = new Map([
        ['existing-a', 10],
        ['existing-b', 5],
        ['existing-c', 15],
        ['existing-d', 1],
      ]);

      const baseClockResult = VectorClock.fromMap(baseClockMap);
      expect(baseClockResult.isOk()).toBe(true);

      if (baseClockResult.isOk()) {
        const baseClock = baseClockResult.value;
        const newDevice = createTestDeviceId('completely-new-device');

        // Increment for new device should add it with timestamp 1
        const incrementedResult = baseClock.incrementForDevice(newDevice);
        expect(incrementedResult.isOk()).toBe(true);

        if (incrementedResult.isOk()) {
          const incremented = incrementedResult.value;

          // Should have 5 devices now
          expect(incremented.getAllDeviceIds()).toHaveLength(5);

          // New device should have timestamp 1
          expect(incremented.getTimestampForDevice(newDevice)).toBe(1);

          // All existing devices should be unchanged
          expect(incremented.getTimestampForDevice(createTestDeviceId('existing-a'))).toBe(10);
          expect(incremented.getTimestampForDevice(createTestDeviceId('existing-b'))).toBe(5);
          expect(incremented.getTimestampForDevice(createTestDeviceId('existing-c'))).toBe(15);
          expect(incremented.getTimestampForDevice(createTestDeviceId('existing-d'))).toBe(1);

          // Original clock should be unchanged (immutability)
          expect(baseClock.getAllDeviceIds()).toHaveLength(4);
          expect(baseClock.getTimestampForDevice(newDevice)).toBe(0);
        }
      }
    });

    it('should handle fromMap with edge case timestamp values', () => {
      const edgeCaseMap = new Map([
        ['zero-timestamp', 0],
        ['one-timestamp', 1],
        ['large-timestamp', Number.MAX_SAFE_INTEGER],
        ['medium-timestamp', 1000000],
      ]);

      const clockResult = VectorClock.fromMap(edgeCaseMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;

        // All timestamps should be preserved exactly
        expect(clock.getTimestampForDevice(createTestDeviceId('zero-timestamp'))).toBe(0);
        expect(clock.getTimestampForDevice(createTestDeviceId('one-timestamp'))).toBe(1);
        expect(clock.getTimestampForDevice(createTestDeviceId('large-timestamp'))).toBe(
          Number.MAX_SAFE_INTEGER,
        );
        expect(clock.getTimestampForDevice(createTestDeviceId('medium-timestamp'))).toBe(1000000);

        // Increment large timestamp should work
        const incrementResult = clock.incrementForDevice(createTestDeviceId('large-timestamp'));
        expect(incrementResult.isOk()).toBe(true);
        if (incrementResult.isOk()) {
          expect(
            incrementResult.value.getTimestampForDevice(createTestDeviceId('large-timestamp')),
          ).toBe(Number.MAX_SAFE_INTEGER + 1);
        }
      }
    });

    it('should handle toCompactString with complex device ordering', () => {
      const complexClockMap = new Map([
        ['z-last-device', 1],
        ['a-first-device', 10],
        ['m-middle-device', 5],
        ['device-with-hyphens-and-numbers-123', 7],
        ['simple', 0],
      ]);

      const clockResult = VectorClock.fromMap(complexClockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const compactString = clock.toCompactString();

        // Should be alphabetically sorted
        expect(compactString).toBe(
          '{a-first-device:10,device-with-hyphens-and-numbers-123:7,m-middle-device:5,simple:0,z-last-device:1}',
        );

        // Should handle special characters properly
        expect(compactString).toContain('device-with-hyphens-and-numbers-123:7');
        expect(compactString).toContain('simple:0');
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle getAllDeviceIds with invalid device ID strings', () => {
      // Create a clock with invalid device ID that can't be converted back
      const clockMap = new Map([
        ['valid-device', 5],
        ['invalid@device!', 3], // Contains characters invalid for DeviceId
        ['another-invalid-device-with-very-long-name-exceeding-64-character-limit-should-fail', 1],
      ]);

      const clockResult = VectorClock.fromMap(clockMap);
      expect(clockResult.isOk()).toBe(true);

      if (clockResult.isOk()) {
        const clock = clockResult.value;
        const deviceIds = clock.getAllDeviceIds();

        // Should only return valid device IDs that can be created
        expect(deviceIds.length).toBeLessThanOrEqual(3);

        // At least the valid one should be included
        const validDevices = deviceIds.filter((d) => d.getValue() === 'valid-device');
        expect(validDevices).toHaveLength(1);

        // Invalid devices should be filtered out
        const hasInvalidChars = deviceIds.some(
          (d) => d.getValue().includes('@') || d.getValue().includes('!'),
        );
        expect(hasInvalidChars).toBe(false);

        const hasTooLong = deviceIds.some((d) => d.getValue().length > 64);
        expect(hasTooLong).toBe(false);
      }
    });

    it('should handle edge cases in causality with single device', () => {
      const _deviceId = createTestDeviceId('single-device');

      // Create two clocks with same device at different timestamps
      const clock1Result = VectorClock.fromMap(new Map([['single-device', 1]]));
      const clock2Result = VectorClock.fromMap(new Map([['single-device', 5]]));

      expect(clock1Result.isOk()).toBe(true);
      expect(clock2Result.isOk()).toBe(true);

      if (clock1Result.isOk() && clock2Result.isOk()) {
        const clock1 = clock1Result.value;
        const clock2 = clock2Result.value;

        // Clear causality relationship with single device
        expect(clock1.happensBefore(clock2)).toBe(true);
        expect(clock2.happensAfter(clock1)).toBe(true);
        expect(clock1.isConcurrentWith(clock2)).toBe(false);
        expect(clock2.isConcurrentWith(clock1)).toBe(false);
      }
    });

    it('should handle boundary conditions in timestamp comparisons', () => {
      const testCases = [
        { ts1: 0, ts2: 0, expectEqual: true },
        { ts1: 0, ts2: 1, expectBefore: true },
        { ts1: Number.MAX_SAFE_INTEGER - 1, ts2: Number.MAX_SAFE_INTEGER, expectBefore: true },
        { ts1: Number.MAX_SAFE_INTEGER, ts2: Number.MAX_SAFE_INTEGER, expectEqual: true },
      ];

      testCases.forEach(({ ts1, ts2, expectEqual, expectBefore }) => {
        const clock1Map = new Map([['device-test', ts1]]);
        const clock2Map = new Map([['device-test', ts2]]);

        const clock1Result = VectorClock.fromMap(clock1Map);
        const clock2Result = VectorClock.fromMap(clock2Map);

        expect(clock1Result.isOk()).toBe(true);
        expect(clock2Result.isOk()).toBe(true);

        if (clock1Result.isOk() && clock2Result.isOk()) {
          const clock1 = clock1Result.value;
          const clock2 = clock2Result.value;

          if (expectEqual) {
            expect(clock1.equals(clock2)).toBe(true);
            expect(clock1.happensBefore(clock2)).toBe(false);
            expect(clock1.happensAfter(clock2)).toBe(false);
            expect(clock1.isConcurrentWith(clock2)).toBe(false);
          } else if (expectBefore) {
            expect(clock1.happensBefore(clock2)).toBe(true);
            expect(clock2.happensAfter(clock1)).toBe(true);
            expect(clock1.isConcurrentWith(clock2)).toBe(false);
          }
        }
      });
    });

    it('should handle empty clock edge cases consistently', () => {
      const emptyResult = VectorClock.create();
      const nonEmptyResult = VectorClock.fromMap(new Map([['device-a', 1]]));

      expect(emptyResult.isOk()).toBe(true);
      expect(nonEmptyResult.isOk()).toBe(true);

      if (emptyResult.isOk() && nonEmptyResult.isOk()) {
        const empty = emptyResult.value;
        const nonEmpty = nonEmptyResult.value;

        // Empty clock relationships
        expect(empty.happensBefore(nonEmpty)).toBe(true);
        expect(nonEmpty.happensAfter(empty)).toBe(true);
        expect(empty.isConcurrentWith(nonEmpty)).toBe(false);

        // Empty clock with itself
        expect(empty.equals(empty)).toBe(true);
        expect(empty.happensBefore(empty)).toBe(false);
        expect(empty.happensAfter(empty)).toBe(false);
        expect(empty.isConcurrentWith(empty)).toBe(false);

        // Operations on empty clock
        expect(empty.toCompactString()).toBe('{}');
        expect(empty.getAllDeviceIds()).toHaveLength(0);
        expect(empty.getClockState().size).toBe(0);

        const deviceId = createTestDeviceId('test-device');
        expect(empty.getTimestampForDevice(deviceId)).toBe(0);
      }
    });
  });
});
