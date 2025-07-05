/**
 * Integration tests for synchronization patterns and CRDT operations
 *
 * Tests distributed system scenarios, conflict resolution patterns,
 * and complex synchronization workflows using property-based testing.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { VectorClock } from '../../entities/VectorClock';
import { DeviceId } from '../../value-objects/DeviceId';
import { OperationType, type OperationTypeValue } from '../../value-objects/OperationType';

const createTestDeviceId = (deviceId: string): DeviceId => {
  const result = DeviceId.create(deviceId);
  if (result.isErr()) {
    throw new Error(`Failed to create DeviceId: ${deviceId}`);
  }
  return result.value;
};

describe('Synchronization Patterns Integration Tests', () => {
  describe('CRDT Property-Based Testing', () => {
    it('should maintain vector clock causality properties', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
          (deviceNames, timestamps) => {
            // Create vector clocks with random device/timestamp combinations
            const clocks: VectorClock[] = [];

            for (let i = 0; i < Math.min(deviceNames.length, 3); i++) {
              const deviceName = deviceNames[i];
              if (!deviceName) continue;

              const clockMap = new Map<string, number>();
              for (let j = 0; j < Math.min(timestamps.length, deviceNames.length); j++) {
                const ts = timestamps[j];
                const devName = deviceNames[j];
                if (ts !== undefined && devName) {
                  clockMap.set(`device-${devName.replace(/[^a-zA-Z0-9]/g, '')}`, ts);
                }
              }

              const clockResult = VectorClock.fromMap(clockMap);
              if (clockResult.isOk()) {
                clocks.push(clockResult.value);
              }
            }

            if (clocks.length < 2) return true; // Skip if insufficient clocks

            // Test causality properties
            for (let i = 0; i < clocks.length; i++) {
              for (let j = 0; j < clocks.length; j++) {
                const clock1 = clocks[i];
                const clock2 = clocks[j];
                if (!clock1 || !clock2) continue;

                // Antisymmetry: if A happens before B, then B does not happen before A
                if (clock1.happensBefore(clock2)) {
                  expect(clock2.happensBefore(clock1)).toBe(false);
                }

                // Irreflexivity: no clock happens before itself (unless equal)
                if (!clock1.equals(clock2)) {
                  expect(clock1.happensBefore(clock1)).toBe(false);
                }

                // Consistency: if not happens-before and not equal, should be concurrent
                if (
                  !clock1.happensBefore(clock2) &&
                  !clock2.happensBefore(clock1) &&
                  !clock1.equals(clock2)
                ) {
                  expect(clock1.isConcurrentWith(clock2)).toBe(true);
                }
              }
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain merge commutativity and associativity properties', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(fc.string({ minLength: 1, maxLength: 8 }), fc.integer({ min: 0, max: 50 })),
            { minLength: 1, maxLength: 4 },
          ),
          fc.array(
            fc.tuple(fc.string({ minLength: 1, maxLength: 8 }), fc.integer({ min: 0, max: 50 })),
            { minLength: 1, maxLength: 4 },
          ),
          fc.array(
            fc.tuple(fc.string({ minLength: 1, maxLength: 8 }), fc.integer({ min: 0, max: 50 })),
            { minLength: 1, maxLength: 4 },
          ),
          (clock1Data, clock2Data, clock3Data) => {
            const createClock = (data: Array<[string, number]>) => {
              const clockMap = new Map<string, number>();
              data.forEach(([device, timestamp]) => {
                clockMap.set(`dev-${device.replace(/[^a-zA-Z0-9]/g, '')}`, timestamp);
              });
              return VectorClock.fromMap(clockMap);
            };

            const clock1Result = createClock(clock1Data);
            const clock2Result = createClock(clock2Data);
            const clock3Result = createClock(clock3Data);

            if (clock1Result.isErr() || clock2Result.isErr() || clock3Result.isErr()) {
              return true; // Skip invalid clocks
            }

            const clock1 = clock1Result.value;
            const clock2 = clock2Result.value;
            const clock3 = clock3Result.value;

            // Test commutativity: A ∪ B = B ∪ A
            const merge12Result = clock1.mergeWith(clock2);
            const merge21Result = clock2.mergeWith(clock1);

            if (merge12Result.isOk() && merge21Result.isOk()) {
              expect(merge12Result.value.equals(merge21Result.value)).toBe(true);

              // Test associativity: (A ∪ B) ∪ C = A ∪ (B ∪ C)
              const merge123Result = merge12Result.value.mergeWith(clock3);
              const merge23Result = clock2.mergeWith(clock3);

              if (merge123Result.isOk() && merge23Result.isOk()) {
                const merge1_23Result = clock1.mergeWith(merge23Result.value);
                if (merge1_23Result.isOk()) {
                  expect(merge123Result.value.equals(merge1_23Result.value)).toBe(true);
                }
              }
            }

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should maintain operation commutativity properties', () => {
      const allOperationTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...allOperationTypes),
          fc.constantFrom(...allOperationTypes),
          (type1, type2) => {
            const op1Result = OperationType.create(type1);
            const op2Result = OperationType.create(type2);

            if (op1Result.isErr() || op2Result.isErr()) return true;

            const op1 = op1Result.value;
            const op2 = op2Result.value;

            // Test symmetry: if A commutes with B, then B commutes with A
            const commute12 = op1.canCommuteWith(op2);
            const commute21 = op2.canCommuteWith(op1);
            expect(commute12).toBe(commute21);

            // Test reflexivity rules
            const commuteSelf = op1.canCommuteWith(op1);
            const isUpdateType =
              op1.isUpdate() &&
              (op1.getValue() === 'UPDATE_TREE_POSITION' || op1.getValue() === 'UPDATE_METADATA');
            expect(commuteSelf).toBe(isUpdateType);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Distributed System Scenarios', () => {
    it('should handle network partition and reunion patterns', () => {
      // Simulate network partition scenario
      const deviceA = createTestDeviceId('device-a');
      const deviceB = createTestDeviceId('device-b');
      const deviceC = createTestDeviceId('device-c');

      // Initial synchronized state
      let clockA = VectorClock.create(deviceA);
      let clockB = VectorClock.create(deviceB);
      let clockC = VectorClock.create(deviceC);

      expect(clockA.isOk()).toBe(true);
      expect(clockB.isOk()).toBe(true);
      expect(clockC.isOk()).toBe(true);

      if (clockA.isOk() && clockB.isOk() && clockC.isOk()) {
        // Phase 1: Device A performs operation, then all sync
        const incrementAResult = clockA.value.incrementForDevice(deviceA);
        expect(incrementAResult.isOk()).toBe(true);

        if (incrementAResult.isOk()) {
          clockA = incrementAResult;

          // Now sync B and C with A's updated state
          const syncBResult = clockB.value.mergeWith(clockA.value);
          const syncCResult = clockC.value.mergeWith(clockA.value);

          expect(syncBResult.isOk()).toBe(true);
          expect(syncCResult.isOk()).toBe(true);

          if (syncBResult.isOk() && syncCResult.isOk()) {
            clockB = syncBResult;
            clockC = syncCResult;

            // Verify all devices have consistent view after synchronization
            // All should have device-a:1
            expect(clockA.value.getTimestampForDevice(deviceA)).toBe(1);
            expect(clockB.value.getTimestampForDevice(deviceA)).toBe(1);
            expect(clockC.value.getTimestampForDevice(deviceA)).toBe(1);

            // After synchronization, all clocks should at least know about device A
            expect(clockA.value.getAllDeviceIds().length).toBeGreaterThanOrEqual(1);
            expect(clockB.value.getAllDeviceIds().length).toBeGreaterThanOrEqual(1);
            expect(clockC.value.getAllDeviceIds().length).toBeGreaterThanOrEqual(1);

            // Phase 2: Network partition (A|B, C isolated)
            const partitionAResult = clockA.value.incrementForDevice(deviceA);
            const partitionBResult = clockB.value.incrementForDevice(deviceB);
            const partitionCResult = clockC.value.incrementForDevice(deviceC);

            expect(partitionAResult.isOk()).toBe(true);
            expect(partitionBResult.isOk()).toBe(true);
            expect(partitionCResult.isOk()).toBe(true);

            if (partitionAResult.isOk() && partitionBResult.isOk() && partitionCResult.isOk()) {
              // A and B can still sync with each other
              const abSyncResult = partitionAResult.value.mergeWith(partitionBResult.value);
              expect(abSyncResult.isOk()).toBe(true);

              if (abSyncResult.isOk()) {
                const partitionAB = abSyncResult.value;
                const partitionC = partitionCResult.value;

                // Verify partition state
                expect(partitionAB.isConcurrentWith(partitionC)).toBe(true);
                expect(partitionC.isConcurrentWith(partitionAB)).toBe(true);

                // Phase 3: Network reunion
                const reunionResult = partitionAB.mergeWith(partitionC);
                expect(reunionResult.isOk()).toBe(true);

                if (reunionResult.isOk()) {
                  const finalClock = reunionResult.value;

                  // Verify final state includes all updates
                  expect(finalClock.getTimestampForDevice(deviceA)).toBeGreaterThanOrEqual(1);
                  expect(finalClock.getTimestampForDevice(deviceB)).toBeGreaterThanOrEqual(1);
                  expect(finalClock.getTimestampForDevice(deviceC)).toBeGreaterThanOrEqual(1);

                  // All devices should converge to same state
                  const finalAResult = partitionAB.mergeWith(partitionC);
                  const finalBResult = partitionAB.mergeWith(partitionC);
                  const finalCResult = partitionC.mergeWith(partitionAB);

                  expect(finalAResult.isOk()).toBe(true);
                  expect(finalBResult.isOk()).toBe(true);
                  expect(finalCResult.isOk()).toBe(true);

                  if (finalAResult.isOk() && finalBResult.isOk() && finalCResult.isOk()) {
                    expect(finalAResult.value.equals(finalBResult.value)).toBe(true);
                    expect(finalBResult.value.equals(finalCResult.value)).toBe(true);
                  }
                }
              }
            }
          }
        }
      }
    });

    it('should handle cascading updates and dependencies', () => {
      // Test complex operation dependencies in distributed environment
      const operations = [
        'CREATE_TREE',
        'CREATE_ARGUMENT',
        'CREATE_CONNECTION',
        'UPDATE_ARGUMENT',
        'DELETE_CONNECTION',
        'DELETE_ARGUMENT',
      ] as const;

      // Test each operation against others for dependency relationships
      operations.forEach((op1Type) => {
        operations.forEach((op2Type) => {
          const op1Result = OperationType.create(op1Type);
          const op2Result = OperationType.create(op2Type);

          expect(op1Result.isOk()).toBe(true);
          expect(op2Result.isOk()).toBe(true);

          if (op1Result.isOk() && op2Result.isOk()) {
            const op1 = op1Result.value;
            const op2 = op2Result.value;

            const canCommute = op1.canCommuteWith(op2);

            // Verify specific dependency rules
            if (op1.isDeletion() && op2.isCreation()) {
              // Deletions should not commute with subsequent creations
              if (op1.getValue() === 'DELETE_ARGUMENT' && op2.getValue() === 'CREATE_CONNECTION') {
                expect(canCommute).toBe(false);
              }
            }

            if (op1.getValue() === 'DELETE_CONNECTION' && op2.getValue() === 'UPDATE_ARGUMENT') {
              // Connection deletion affects argument updates
              expect(canCommute).toBe(false);
            }

            // Verify operation classification consistency
            if (op1.isStructural() && op2.isSemantic()) {
              const crossCommute = op1.canCommuteWith(op2);
              const reverseCommute = op2.canCommuteWith(op1);
              expect(crossCommute).toBe(reverseCommute); // Should be symmetric
            }
          }
        });
      });
    });
  });

  describe('Conflict Resolution Patterns', () => {
    it('should handle concurrent updates with different devices', () => {
      const devices = ['alpha', 'beta', 'gamma'].map((name) =>
        createTestDeviceId(`device-${name}`),
      );

      // Create independent operations on different devices
      const clocks = devices
        .map((device) => {
          const clockResult = VectorClock.create(device);
          expect(clockResult.isOk()).toBe(true);
          return clockResult.isOk() ? clockResult.value : undefined;
        })
        .filter((clock): clock is NonNullable<typeof clock> => Boolean(clock));

      expect(clocks).toHaveLength(3);

      // Simulate concurrent operations
      const concurrentClocks = clocks
        .map((clock, index) => {
          if (!clock) return undefined;
          const device = devices[index];
          if (!device) return undefined;

          // Each device performs multiple operations
          let current = clock;
          for (let i = 0; i < 3; i++) {
            const incrementResult = current.incrementForDevice(device);
            if (incrementResult.isOk()) {
              current = incrementResult.value;
            }
          }
          return current;
        })
        .filter(Boolean);

      expect(concurrentClocks).toHaveLength(3);

      // All concurrent clocks should be mutually concurrent
      for (let i = 0; i < concurrentClocks.length; i++) {
        for (let j = i + 1; j < concurrentClocks.length; j++) {
          const clock1 = concurrentClocks[i];
          const clock2 = concurrentClocks[j];
          if (clock1 && clock2) {
            expect(clock1.isConcurrentWith(clock2)).toBe(true);
            expect(clock2.isConcurrentWith(clock1)).toBe(true);
          }
        }
      }

      // Merge all concurrent clocks
      let merged = concurrentClocks[0];
      for (let i = 1; i < concurrentClocks.length; i++) {
        const clock = concurrentClocks[i];
        if (merged && clock) {
          const mergeResult = merged.mergeWith(clock);
          expect(mergeResult.isOk()).toBe(true);
          if (mergeResult.isOk()) {
            merged = mergeResult.value;
          }
        }
      }

      // Final merged clock should have all device updates
      if (merged) {
        devices.forEach((device) => {
          expect(merged?.getTimestampForDevice(device)).toBe(3);
        });
      }
    });

    it('should handle device ID edge cases in distributed scenarios', () => {
      // Test various device ID patterns in synchronization
      const devicePatterns = [
        'local-device',
        'localhost-server',
        'device-123',
        'a',
        'X'.repeat(64), // Maximum length
        'device-with_special-chars',
      ];

      const validDevices = devicePatterns
        .map((pattern) => {
          const result = DeviceId.create(pattern);
          return result.isOk() ? result.value : undefined;
        })
        .filter((device): device is NonNullable<typeof device> => Boolean(device));

      expect(validDevices.length).toBeGreaterThan(0);

      // Create vector clocks with these devices
      const clocks = validDevices
        .map((device) => {
          const clockResult = VectorClock.create(device);
          return clockResult.isOk() ? clockResult.value : undefined;
        })
        .filter((clock): clock is NonNullable<typeof clock> => Boolean(clock));

      // Test synchronization between diverse device types
      if (clocks.length >= 2) {
        const clock1 = clocks[0];
        const clock2 = clocks[1];

        if (clock1 && clock2) {
          // Perform operations on both clocks
          const devices1 = clock1.getAllDeviceIds();
          const devices2 = clock2.getAllDeviceIds();

          if (devices1.length > 0 && devices2.length > 0) {
            const firstDevice1 = devices1[0];
            const firstDevice2 = devices2[0];
            if (!firstDevice1 || !firstDevice2) return;

            const inc1Result = clock1.incrementForDevice(firstDevice1);
            const inc2Result = clock2.incrementForDevice(firstDevice2);

            expect(inc1Result.isOk()).toBe(true);
            expect(inc2Result.isOk()).toBe(true);

            if (inc1Result.isOk() && inc2Result.isOk()) {
              // Merge clocks with different device ID patterns
              const mergeResult = inc1Result.value.mergeWith(inc2Result.value);
              expect(mergeResult.isOk()).toBe(true);

              if (mergeResult.isOk()) {
                const merged = mergeResult.value;
                expect(merged.getAllDeviceIds().length).toBeGreaterThanOrEqual(2);
              }
            }
          }
        }
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with many concurrent devices', () => {
      const deviceCount = 100;
      const operationsPerDevice = 10;

      const startTime = performance.now();

      // Create many devices
      const devices: DeviceId[] = [];
      for (let i = 0; i < deviceCount; i++) {
        const deviceResult = DeviceId.create(`device-${i}`);
        if (deviceResult.isOk()) {
          devices.push(deviceResult.value);
        }
      }

      expect(devices).toHaveLength(deviceCount);

      // Create vector clocks and perform operations
      const clocks: VectorClock[] = [];
      devices.forEach((device) => {
        const clockResult = VectorClock.create(device);
        expect(clockResult.isOk()).toBe(true);

        if (clockResult.isOk()) {
          let current = clockResult.value;

          // Perform multiple operations per device
          for (let i = 0; i < operationsPerDevice; i++) {
            const incrementResult = current.incrementForDevice(device);
            if (incrementResult.isOk()) {
              current = incrementResult.value;
            }
          }

          clocks.push(current);
        }
      });

      // Merge all clocks (simulating synchronization)
      let merged = clocks[0];
      for (let i = 1; i < Math.min(clocks.length, 20); i++) {
        // Limit to prevent timeout
        const clock = clocks[i];
        if (merged && clock) {
          const mergeResult = merged.mergeWith(clock);
          if (mergeResult.isOk()) {
            merged = mergeResult.value;
          }
        }
      }

      const duration = performance.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
      expect(merged).toBeDefined();

      if (merged) {
        expect(merged.getAllDeviceIds().length).toBeGreaterThan(0);
      }
    });

    it('should handle rapid operation type checking efficiently', () => {
      const operationTypes: OperationTypeValue[] = [
        'CREATE_STATEMENT',
        'UPDATE_STATEMENT',
        'DELETE_STATEMENT',
        'CREATE_ARGUMENT',
        'UPDATE_ARGUMENT',
        'DELETE_ARGUMENT',
        'CREATE_TREE',
        'UPDATE_TREE_POSITION',
        'DELETE_TREE',
        'CREATE_CONNECTION',
        'DELETE_CONNECTION',
        'UPDATE_METADATA',
      ];

      const startTime = performance.now();
      let totalChecks = 0;

      // Create operation instances
      const operations = operationTypes
        .map((type) => {
          const result = OperationType.create(type);
          return result.isOk() ? result.value : undefined;
        })
        .filter((op): op is NonNullable<typeof op> => Boolean(op));

      // Perform extensive commutativity checking
      operations.forEach((op1) => {
        operations.forEach((op2) => {
          if (op1 && op2) {
            op1.canCommuteWith(op2);
            op1.equals(op2);
            op1.getCategory();
            op1.getVerb();
            op1.getTarget();
            totalChecks++;
          }
        });
      });

      const duration = performance.now() - startTime;

      expect(totalChecks).toBeGreaterThan(100);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});
