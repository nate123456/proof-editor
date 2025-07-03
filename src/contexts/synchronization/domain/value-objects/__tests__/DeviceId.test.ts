import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DeviceId } from '../DeviceId.js';

describe('DeviceId', () => {
  describe('creation and validation', () => {
    it('should create valid DeviceId from valid strings', () => {
      const validInputs = [
        'device-123',
        'local-device-1',
        'server_node_01',
        'CLIENT-ABC-123',
        'a',
        'device-123456789012345678901234567890',
        'test-device_2024',
      ];

      validInputs.forEach((input) => {
        const result = DeviceId.create(input);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(input);
        }
      });
    });

    it('should reject empty or invalid inputs', () => {
      const invalidInputs = [
        '',
        '   ',
        '\t\n',
        null as any,
        undefined as any,
        123 as any,
        {} as any,
        [] as any,
      ];

      invalidInputs.forEach((input) => {
        const result = DeviceId.create(input);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toMatch(/must be a non-empty string|cannot be empty/);
        }
      });
    });

    it('should trim whitespace during creation', () => {
      const inputs = [
        { input: '  device-123  ', expected: 'device-123' },
        { input: '\tdevice-456\n', expected: 'device-456' },
        { input: ' local-device ', expected: 'local-device' },
      ];

      inputs.forEach(({ input, expected }) => {
        const result = DeviceId.create(input);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(expected);
        }
      });
    });

    it('should reject strings exceeding 64 characters', () => {
      const tooLong = 'a'.repeat(65);
      const exactLimit = 'a'.repeat(64);

      const tooLongResult = DeviceId.create(tooLong);
      expect(tooLongResult.isErr()).toBe(true);
      if (tooLongResult.isErr()) {
        expect(tooLongResult.error.message).toContain('cannot exceed 64 characters');
      }

      const exactLimitResult = DeviceId.create(exactLimit);
      expect(exactLimitResult.isOk()).toBe(true);
    });

    it('should reject strings with invalid characters', () => {
      const invalidCharInputs = [
        'device@123',
        'device#456',
        'device with spaces',
        'device!test',
        'device$money',
        'device%percent',
        'device&and',
        'device*star',
        'device(parens)',
        'device[brackets]',
        'device{braces}',
        'device.period',
        'device,comma',
        'device;semicolon',
        'device:colon',
        'device/slash',
        'device\\backslash',
        'device|pipe',
        'device?question',
        'device=equals',
        'device+plus',
      ];

      invalidCharInputs.forEach((input) => {
        const result = DeviceId.create(input);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'can only contain alphanumeric characters, hyphens, and underscores',
          );
        }
      });
    });

    it('should accept valid character combinations', () => {
      const validPatterns = [
        'ABC123',
        'abc-123',
        'ABC_123',
        'a1b2c3',
        '123-456-789',
        '__test__',
        '--device--',
        'a-b_c-d_e',
        '0123456789',
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      ];

      validPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('generateRandom', () => {
    it('should generate valid random device IDs', () => {
      for (let i = 0; i < 100; i++) {
        const result = DeviceId.generateRandom();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const value = result.value.getValue();
          expect(value).toMatch(/^device-[a-z0-9]+-[a-z0-9]+$/);
          expect(value.length).toBeGreaterThan(10);
          expect(value.length).toBeLessThanOrEqual(64);
        }
      }
    });

    it('should generate unique device IDs', () => {
      const generatedIds = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const result = DeviceId.generateRandom();
        if (result.isOk()) {
          generatedIds.add(result.value.getValue());
        }
      }
      // Should have generated 1000 unique IDs
      expect(generatedIds.size).toBe(1000);
    });

    it('should generate IDs with consistent format', () => {
      const result = DeviceId.generateRandom();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const value = result.value.getValue();
        const parts = value.split('-');
        expect(parts.length).toBe(3);
        expect(parts[0]).toBe('device');
        expect(parts[1]).toMatch(/^[a-z0-9]+$/); // timestamp in base36
        expect(parts[2]).toMatch(/^[a-z0-9]+$/); // random part
      }
    });
  });

  describe('equals method', () => {
    it('should return true for identical device IDs', () => {
      const id1Result = DeviceId.create('device-123');
      const id2Result = DeviceId.create('device-123');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);

      if (id1Result.isOk() && id2Result.isOk()) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
      }
    });

    it('should return false for different device IDs', () => {
      const id1Result = DeviceId.create('device-123');
      const id2Result = DeviceId.create('device-456');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);

      if (id1Result.isOk() && id2Result.isOk()) {
        expect(id1Result.value.equals(id2Result.value)).toBe(false);
      }
    });

    it('should be reflexive', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 64 }).filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
          (value) => {
            const result = DeviceId.create(value);
            if (result.isOk()) {
              expect(result.value.equals(result.value)).toBe(true);
            }
          },
        ),
      );
    });

    it('should be symmetric', () => {
      const id1Result = DeviceId.create('device-abc');
      const id2Result = DeviceId.create('device-xyz');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);

      if (id1Result.isOk() && id2Result.isOk()) {
        const id1 = id1Result.value;
        const id2 = id2Result.value;
        expect(id1.equals(id2)).toBe(id2.equals(id1));
      }
    });
  });

  describe('toString method', () => {
    it('should return the device ID value', () => {
      const testIds = ['device-123', 'local-device', 'server_node_01'];

      testIds.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });
  });

  describe('isLocalDevice method', () => {
    it('should identify local devices starting with "local-"', () => {
      const localDevices = ['local-device', 'local-123', 'local-test-machine'];

      localDevices.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isLocalDevice()).toBe(true);
        }
      });
    });

    it('should identify local devices containing "localhost"', () => {
      const localhostDevices = [
        'localhost-device',
        'device-localhost-123',
        'mylocalhost',
        'test-localhost-test',
      ];

      localhostDevices.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isLocalDevice()).toBe(true);
        }
      });
    });

    it('should not identify non-local devices', () => {
      const nonLocalDevices = [
        'server-123',
        'cloud-device',
        'remote-host',
        'device-456',
        'production-server',
        'staging-env',
      ];

      nonLocalDevices.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isLocalDevice()).toBe(false);
        }
      });
    });
  });

  describe('getShortId method', () => {
    it('should return full ID for short device IDs', () => {
      const shortIds = ['a', 'ab', 'abc', 'abcd', 'abcde', 'abcdef', 'abcdefg', 'abcdefgh'];

      shortIds.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getShortId()).toBe(id);
        }
      });
    });

    it('should truncate long device IDs with ellipsis', () => {
      const longIds = [
        { full: 'abcdefghi', expected: 'abcd...fghi' },
        { full: 'device-123456789', expected: 'devi...6789' },
        { full: 'this-is-a-very-long-device-id-123', expected: 'this...-123' },
        {
          full: 'a'.repeat(64),
          expected: 'aaaa...aaaa',
        },
      ];

      longIds.forEach(({ full, expected }) => {
        const result = DeviceId.create(full);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getShortId()).toBe(expected);
        }
      });
    });

    it('should handle exactly 8 character IDs', () => {
      const id = '12345678';
      const result = DeviceId.create(id);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe(id);
      }
    });

    it('should maintain consistent truncation', () => {
      const result = DeviceId.create('abcdefghijklmnopqrstuvwxyz');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const shortId = result.value.getShortId();
        expect(shortId).toBe('abcd...wxyz');
        expect(shortId.length).toBe(11); // 4 + 3 + 4
      }
    });
  });

  describe('property-based testing', () => {
    const validDeviceIdArbitrary = fc
      .string({ minLength: 1, maxLength: 64 })
      .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s.trim()) && s.trim().length > 0);

    describe('valid device ID properties', () => {
      it('should accept all valid alphanumeric strings with hyphens and underscores', () => {
        fc.assert(
          fc.property(validDeviceIdArbitrary, (value) => {
            const result = DeviceId.create(value);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should maintain immutability', () => {
        fc.assert(
          fc.property(validDeviceIdArbitrary, (value) => {
            const result = DeviceId.create(value);
            if (result.isOk()) {
              const deviceId = result.value;
              const value1 = deviceId.getValue();
              const value2 = deviceId.getValue();
              expect(value1).toBe(value2);
              expect(value1).toBe(value.trim());
            }
          }),
        );
      });

      it('should have consistent equality behavior', () => {
        fc.assert(
          fc.property(validDeviceIdArbitrary, (value) => {
            const result1 = DeviceId.create(value);
            const result2 = DeviceId.create(value);

            if (result1.isOk() && result2.isOk()) {
              expect(result1.value.equals(result2.value)).toBe(true);
              expect(result1.value.toString()).toBe(result2.value.toString());
            }
          }),
        );
      });
    });

    describe('invalid device ID properties', () => {
      it('should reject strings with invalid characters', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 64 }).filter((s) => {
              const trimmed = s.trim();
              return trimmed.length > 0 && !/^[a-zA-Z0-9-_]+$/.test(trimmed);
            }),
            (value) => {
              const result = DeviceId.create(value);
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error.message).toContain(
                  'can only contain alphanumeric characters, hyphens, and underscores',
                );
              }
            },
          ),
        );
      });

      it('should reject strings longer than 64 characters', () => {
        fc.assert(
          fc.property(
            fc
              .string({ minLength: 65, maxLength: 200 })
              .map((s) => s.replace(/[^a-zA-Z0-9-_]/g, 'a')),
            (value) => {
              const result = DeviceId.create(value);
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error.message).toContain('cannot exceed 64 characters');
              }
            },
          ),
        );
      });
    });

    describe('shortId properties', () => {
      it('should produce appropriate short IDs', () => {
        fc.assert(
          fc.property(validDeviceIdArbitrary, (value) => {
            const result = DeviceId.create(value);
            if (result.isOk()) {
              const deviceId = result.value;
              const fullId = deviceId.getValue();
              const shortId = deviceId.getShortId();

              if (fullId.length <= 8) {
                // Short IDs should be returned as-is
                expect(shortId).toBe(fullId);
                expect(shortId.length).toBe(fullId.length);
              } else {
                // Long IDs should be truncated to 11 chars: 4 + 3 + 4
                expect(shortId.length).toBe(11);
                expect(shortId).toMatch(/^.{4}\.\.\..{4}$/);
                expect(shortId.startsWith(fullId.substring(0, 4))).toBe(true);
                expect(shortId.endsWith(fullId.substring(fullId.length - 4))).toBe(true);
              }
            }
          }),
        );
      });

      it('should preserve beginning and end of long IDs', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 9, maxLength: 64 }).filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
            (value) => {
              const result = DeviceId.create(value);
              if (result.isOk()) {
                const shortId = result.value.getShortId();
                expect(shortId.startsWith(value.substring(0, 4))).toBe(true);
                expect(shortId.endsWith(value.substring(value.length - 4))).toBe(true);
                expect(shortId).toContain('...');
              }
            },
          ),
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should handle single character device IDs', () => {
      const singleChars = ['a', 'Z', '0', '9', '-', '_'];

      singleChars.forEach((char) => {
        const result = DeviceId.create(char);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(char);
          expect(result.value.getShortId()).toBe(char);
        }
      });
    });

    it('should handle maximum length device IDs', () => {
      const maxLength = 'a'.repeat(64);
      const result = DeviceId.create(maxLength);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(maxLength);
        expect(result.value.getShortId()).toBe('aaaa...aaaa');
      }
    });

    it('should handle device IDs with only special allowed characters', () => {
      const specialIds = ['---', '___', '-_-', '_-_', '----____'];

      specialIds.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(id);
        }
      });
    });

    it('should handle numeric-only device IDs', () => {
      const numericIds = ['123', '000', '999', '123456789'];

      numericIds.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(id);
        }
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle common device ID patterns', () => {
      const realWorldIds = [
        'desktop-johndoe',
        'mobile-ios-12345',
        'server-prod-01',
        'laptop-work-2024',
        'tablet-android-abc',
        'iot-sensor-kitchen',
        'vm-staging-03',
        'container-docker-xyz',
        'edge-device-001',
        'workstation-dev-team',
      ];

      realWorldIds.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(id);
        }
      });
    });

    it('should handle UUIDs as device IDs', () => {
      // Simplified UUID format (without hyphens in standard positions)
      const uuidStyle = [
        'a1b2c3d4e5f6',
        '123e4567e89b12d3a456426614174000',
        'device_550e8400_e29b_41d4_a716_446655440000',
      ];

      uuidStyle.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
      });
    });

    it('should handle timestamp-based device IDs', () => {
      const timestampIds = [
        'device-1234567890',
        'client-2024-01-15',
        'session-20240115-143052',
        'temp-1705331452000',
      ];

      timestampIds.forEach((id) => {
        const result = DeviceId.create(id);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('performance', () => {
    it('should handle rapid creation of many device IDs', () => {
      const startTime = performance.now();
      const results: boolean[] = [];

      for (let i = 0; i < 10000; i++) {
        const result = DeviceId.create(`device-${i}`);
        results.push(result.isOk());
      }

      const endTime = performance.now();

      expect(results.every((r) => r)).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle rapid generation of random IDs', () => {
      const startTime = performance.now();
      const results: boolean[] = [];

      for (let i = 0; i < 1000; i++) {
        const result = DeviceId.generateRandom();
        results.push(result.isOk());
      }

      const endTime = performance.now();

      expect(results.every((r) => r)).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});
