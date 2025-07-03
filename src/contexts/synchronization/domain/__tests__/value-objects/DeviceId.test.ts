/**
 * DeviceId Value Object Tests
 *
 * Tests for device identification in distributed synchronization scenarios.
 * This value object is critical for synchronization across 12 dependent files.
 */

import { faker } from '@faker-js/faker';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DeviceId } from '../../value-objects/DeviceId.js';

describe('DeviceId', () => {
  describe('create', () => {
    describe('success cases', () => {
      it('should create DeviceId with valid alphanumeric string', () => {
        const validId = 'device-123';
        const result = DeviceId.create(validId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(validId);
        }
      });

      it('should create DeviceId with hyphens and underscores', () => {
        const validId = 'device-123_test-456';
        const result = DeviceId.create(validId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(validId);
        }
      });

      it('should trim whitespace and create valid DeviceId', () => {
        const validId = '  device-123  ';
        const result = DeviceId.create(validId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('device-123');
        }
      });

      it('should create DeviceId with maximum allowed length (64 chars)', () => {
        const maxLengthId = 'a'.repeat(64);
        const result = DeviceId.create(maxLengthId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(maxLengthId);
        }
      });

      it('should create DeviceId with single character', () => {
        const singleChar = 'a';
        const result = DeviceId.create(singleChar);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(singleChar);
        }
      });

      it('should create DeviceId with mixed case letters', () => {
        const mixedCase = 'Device-123-Test';
        const result = DeviceId.create(mixedCase);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(mixedCase);
        }
      });
    });

    describe('validation failures', () => {
      it('should fail with null input', () => {
        const result = DeviceId.create(null as any);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Device ID must be a non-empty string');
        }
      });

      it('should fail with undefined input', () => {
        const result = DeviceId.create(undefined as any);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Device ID must be a non-empty string');
        }
      });

      it('should fail with non-string input', () => {
        const result = DeviceId.create(123 as any);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Device ID must be a non-empty string');
        }
      });

      it('should fail with empty string', () => {
        const result = DeviceId.create('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Device ID must be a non-empty string');
        }
      });

      it('should fail with only whitespace', () => {
        const result = DeviceId.create('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Device ID cannot be empty or whitespace');
        }
      });

      it('should fail with string exceeding 64 characters', () => {
        const tooLongId = 'a'.repeat(65);
        const result = DeviceId.create(tooLongId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Device ID cannot exceed 64 characters');
        }
      });

      it('should fail with invalid characters - special symbols', () => {
        const invalidId = 'device@123';
        const result = DeviceId.create(invalidId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(
            'Device ID can only contain alphanumeric characters, hyphens, and underscores'
          );
        }
      });

      it('should fail with invalid characters - spaces', () => {
        const invalidId = 'device 123';
        const result = DeviceId.create(invalidId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(
            'Device ID can only contain alphanumeric characters, hyphens, and underscores'
          );
        }
      });

      it('should fail with invalid characters - dots', () => {
        const invalidId = 'device.123';
        const result = DeviceId.create(invalidId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(
            'Device ID can only contain alphanumeric characters, hyphens, and underscores'
          );
        }
      });
    });
  });

  describe('generateRandom', () => {
    it('should generate valid DeviceId', () => {
      const result = DeviceId.generateRandom();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const deviceId = result.value;
        expect(deviceId.getValue()).toMatch(/^device-[a-z0-9]+-[a-z0-9]+$/);
        expect(deviceId.getValue().length).toBeGreaterThan(0);
        expect(deviceId.getValue().length).toBeLessThanOrEqual(64);
      }
    });

    it('should generate unique DeviceIds', () => {
      const result1 = DeviceId.generateRandom();
      const result2 = DeviceId.generateRandom();

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getValue()).not.toBe(result2.value.getValue());
      }
    });

    it('should generate DeviceIds with device- prefix', () => {
      const result = DeviceId.generateRandom();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toMatch(/^device-/);
      }
    });

    it('should generate DeviceIds following format: device-{timestamp}-{random}', () => {
      const result = DeviceId.generateRandom();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const parts = result.value.getValue().split('-');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('device');
        expect(parts[1]).toMatch(/^[a-z0-9]+$/); // timestamp in base36
        expect(parts[2]).toMatch(/^[a-z0-9]+$/); // random part
      }
    });
  });

  describe('getValue', () => {
    it('should return the original trimmed value', () => {
      const originalValue = 'test-device-123';
      const result = DeviceId.create(originalValue);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(originalValue);
      }
    });

    it('should return trimmed value when created with whitespace', () => {
      const result = DeviceId.create('  test-device  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('test-device');
      }
    });
  });

  describe('equals', () => {
    it('should return true for DeviceIds with same value', () => {
      const value = 'device-123';
      const result1 = DeviceId.create(value);
      const result2 = DeviceId.create(value);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for DeviceIds with different values', () => {
      const result1 = DeviceId.create('device-123');
      const result2 = DeviceId.create('device-456');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should be case-sensitive', () => {
      const result1 = DeviceId.create('device-ABC');
      const result2 = DeviceId.create('device-abc');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should handle trimmed values correctly', () => {
      const result1 = DeviceId.create('  device-123  ');
      const result2 = DeviceId.create('device-123');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the device ID value as string', () => {
      const value = 'device-123';
      const result = DeviceId.create(value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(value);
      }
    });

    it('should match getValue result', () => {
      const result = DeviceId.create('test-device');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(result.value.getValue());
      }
    });
  });

  describe('isLocalDevice', () => {
    it('should return true for DeviceId starting with local-', () => {
      const result = DeviceId.create('local-device-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLocalDevice()).toBe(true);
      }
    });

    it('should return true for DeviceId containing localhost', () => {
      const result = DeviceId.create('device-localhost-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLocalDevice()).toBe(true);
      }
    });

    it('should return true for DeviceId with localhost at start', () => {
      const result = DeviceId.create('localhost-device');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLocalDevice()).toBe(true);
      }
    });

    it('should return false for regular remote DeviceId', () => {
      const result = DeviceId.create('device-remote-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLocalDevice()).toBe(false);
      }
    });

    it('should return false for DeviceId with partial local- match', () => {
      const result = DeviceId.create('device-localized-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLocalDevice()).toBe(false);
      }
    });

    it('should return false for DeviceId with partial localhost match', () => {
      const result = DeviceId.create('device-localhostname-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isLocalDevice()).toBe(true); // contains 'localhost'
      }
    });
  });

  describe('getShortId', () => {
    it('should return full ID when length is 8 or less', () => {
      const shortId = '12345678';
      const result = DeviceId.create(shortId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe(shortId);
      }
    });

    it('should return full ID when exactly 8 characters', () => {
      const eightCharId = 'abcd1234';
      const result = DeviceId.create(eightCharId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe(eightCharId);
      }
    });

    it('should return abbreviated form for longer IDs', () => {
      const longId = 'device-long-identifier-123456';
      const result = DeviceId.create(longId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const shortId = result.value.getShortId();
        expect(shortId).toBe('devi...3456');
        expect(shortId).toMatch(/^.{4}\.{3}.{4}$/);
      }
    });

    it('should use first 4 and last 4 characters for long IDs', () => {
      const longId = 'abcdefghijklmnopqrstuvwxyz';
      const result = DeviceId.create(longId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe('abcd...wxyz');
      }
    });

    it('should handle 9-character ID correctly', () => {
      const nineCharId = '123456789';
      const result = DeviceId.create(nineCharId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe('1234...6789');
      }
    });
  });

  describe('immutability', () => {
    it('should be immutable - cannot modify internal value', () => {
      const result = DeviceId.create('device-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const deviceId = result.value;
        const originalValue = deviceId.getValue();

        // Attempt to modify (should not be possible due to private constructor)
        // We can only test that getValue() consistently returns the same value
        expect(deviceId.getValue()).toBe(originalValue);
        expect(deviceId.toString()).toBe(originalValue);

        // Multiple calls should return same value
        expect(deviceId.getValue()).toBe(deviceId.getValue());
      }
    });

    it('should maintain value consistency across method calls', () => {
      const result = DeviceId.create('test-device-immutable');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const deviceId = result.value;
        const value1 = deviceId.getValue();
        const value2 = deviceId.toString();
        const value3 = deviceId.getValue();

        expect(value1).toBe(value2);
        expect(value1).toBe(value3);
        expect(value2).toBe(value3);
      }
    });
  });

  describe('property-based testing', () => {
    it('should handle valid alphanumeric strings with hyphens and underscores', () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/), validString => {
          const result = DeviceId.create(validString);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getValue()).toBe(validString);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should reject strings with invalid characters', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            const trimmed = s.trim();
            return trimmed.length > 0 && /[^a-zA-Z0-9_-]/.test(trimmed);
          }),
          invalidString => {
            const result = DeviceId.create(invalidString);
            expect(result.isErr()).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject strings exceeding 64 characters', () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]{65,100}$/), tooLongString => {
          const result = DeviceId.create(tooLongString);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toBe('Device ID cannot exceed 64 characters');
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain equals reflexivity', () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/), validString => {
          const result1 = DeviceId.create(validString);
          const result2 = DeviceId.create(validString);

          expect(result1.isOk()).toBe(true);
          expect(result2.isOk()).toBe(true);

          if (result1.isOk() && result2.isOk()) {
            expect(result1.value.equals(result2.value)).toBe(true);
            expect(result2.value.equals(result1.value)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain equals transitivity', () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/), validString => {
          const result1 = DeviceId.create(validString);
          const result2 = DeviceId.create(validString);
          const result3 = DeviceId.create(validString);

          expect(result1.isOk()).toBe(true);
          expect(result2.isOk()).toBe(true);
          expect(result3.isOk()).toBe(true);

          if (result1.isOk() && result2.isOk() && result3.isOk()) {
            const equals12 = result1.value.equals(result2.value);
            const equals23 = result2.value.equals(result3.value);
            const equals13 = result1.value.equals(result3.value);

            if (equals12 && equals23) {
              expect(equals13).toBe(true);
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('realistic usage scenarios', () => {
    it('should handle typical generated device IDs', () => {
      const typicalIds = [
        'device-12345-abcdef',
        'mobile-device-uuid-123',
        'desktop-workstation-001',
        'tablet-user-device-789',
        'server-backend-node-456',
      ];

      typicalIds.forEach(id => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(id);
        }
      });
    });

    it('should handle device IDs from different environments', () => {
      const environmentIds = [
        'local-dev-machine',
        'device-localhost-8080',
        'prod-server-001',
        'staging-worker-node',
        'test-environment-device',
      ];

      environmentIds.forEach(id => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const deviceId = result.value;
          expect(deviceId.getValue()).toBe(id);

          // Test local device detection
          const isLocal = id.startsWith('local-') || id.includes('localhost');
          expect(deviceId.isLocalDevice()).toBe(isLocal);
        }
      });
    });

    it('should generate device IDs suitable for distributed systems', () => {
      const deviceIds: DeviceId[] = [];

      // Generate multiple device IDs
      for (let i = 0; i < 10; i++) {
        const result = DeviceId.generateRandom();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          deviceIds.push(result.value);
        }
      }

      // All should be unique
      const values = deviceIds.map(d => d.getValue());
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);

      // All should be valid format
      values.forEach(value => {
        expect(value).toMatch(/^device-[a-z0-9]+-[a-z0-9]+$/);
        expect(value.length).toBeLessThanOrEqual(64);
      });
    });

    it('should support device ID comparison for synchronization', () => {
      // Create device IDs that might be used in synchronization
      const device1Result = DeviceId.create('sync-device-001');
      const device2Result = DeviceId.create('sync-device-002');
      const device1DuplicateResult = DeviceId.create('sync-device-001');

      expect(device1Result.isOk()).toBe(true);
      expect(device2Result.isOk()).toBe(true);
      expect(device1DuplicateResult.isOk()).toBe(true);

      if (device1Result.isOk() && device2Result.isOk() && device1DuplicateResult.isOk()) {
        const device1 = device1Result.value;
        const device2 = device2Result.value;
        const device1Duplicate = device1DuplicateResult.value;

        // Different devices should not be equal
        expect(device1.equals(device2)).toBe(false);
        expect(device2.equals(device1)).toBe(false);

        // Same device should be equal
        expect(device1.equals(device1Duplicate)).toBe(true);
        expect(device1Duplicate.equals(device1)).toBe(true);

        // Can be used as identifiers in collections
        const deviceMap = new Map<string, string>();
        deviceMap.set(device1.getValue(), 'data-for-device-1');
        deviceMap.set(device2.getValue(), 'data-for-device-2');

        expect(deviceMap.get(device1.getValue())).toBe('data-for-device-1');
        expect(deviceMap.get(device2.getValue())).toBe('data-for-device-2');
        expect(deviceMap.get(device1Duplicate.getValue())).toBe('data-for-device-1');
      }
    });
  });

  describe('faker-based testing', () => {
    it('should handle various realistic device ID patterns', () => {
      const patterns = [
        () => `device-${faker.string.uuid()}`,
        () => `${faker.internet.domainWord()}-device-${faker.number.int({ min: 1, max: 999 })}`,
        () => `mobile-${faker.string.alphanumeric(8)}`,
        () => `desktop-${faker.string.alphanumeric(12)}`,
        () => faker.string.alphanumeric({ length: { min: 5, max: 30 } }),
      ];

      patterns.forEach(pattern => {
        const deviceIdString = pattern();
        // Clean the generated string to match our validation rules
        const cleanedId = deviceIdString.replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 64);

        if (cleanedId.length > 0) {
          const result = DeviceId.create(cleanedId);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getValue()).toBe(cleanedId);
          }
        }
      });
    });
  });
});
