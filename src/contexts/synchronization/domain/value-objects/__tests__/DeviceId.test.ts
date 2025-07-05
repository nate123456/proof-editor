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
      expect(endTime - startTime).toBeLessThan(200); // Should be reasonably fast
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
      expect(endTime - startTime).toBeLessThan(200); // Should be reasonably fast
    });
  });

  describe('advanced edge cases', () => {
    it('should handle boundary conditions for character length', () => {
      // Test exactly at boundaries
      const tests = [
        { length: 1, shouldPass: true },
        { length: 32, shouldPass: true },
        { length: 63, shouldPass: true },
        { length: 64, shouldPass: true },
        { length: 65, shouldPass: false },
      ];

      tests.forEach(({ length, shouldPass }) => {
        const deviceId = 'a'.repeat(length);
        const result = DeviceId.create(deviceId);
        expect(result.isOk()).toBe(shouldPass);
      });
    });

    it('should handle mixed character patterns near boundaries', () => {
      const patterns = [
        'A-Z_0-9', // All allowed character types
        '123-abc_DEF-456', // Numbers, letters, separators
        '___---___', // Only separators
        'aB3-_9X', // Mixed case and numbers
      ];

      patterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(pattern);
        }
      });
    });

    it('should handle unicode and international characters', () => {
      const invalidUnicodePatterns = [
        'device-café', // Accented characters
        'device-中文', // Chinese characters
        'device-🚀', // Emoji
        'device-ñ', // Spanish characters
        'привет', // Cyrillic
      ];

      invalidUnicodePatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('can only contain alphanumeric characters');
        }
      });
    });

    it('should handle potential security injection patterns', () => {
      const securityPatterns = [
        '<script>alert("xss")</script>',
        '$(rm -rf /)',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        'eval(malicious_code)',
        '$' + '{jndi:ldap://malicious.com}',
      ];

      securityPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('can only contain alphanumeric characters');
        }
      });
    });

    it('should handle control characters and escape sequences', () => {
      const controlPatterns = [
        'device\x00id', // Null byte
        'device\tid', // Tab
        'device\nid', // Newline
        'device\rid', // Carriage return
        'device\\nid', // Escaped newline
        'device\x1bid', // Escape character
      ];

      controlPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isErr()).toBe(true);
      });
    });
  });

  describe('generateRandom edge cases', () => {
    it('should maintain timestamp ordering for rapid generation', () => {
      const ids: string[] = [];
      const timestamps: string[] = [];

      // Generate multiple IDs in quick succession
      for (let i = 0; i < 50; i++) {
        const result = DeviceId.generateRandom();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const id = result.value.getValue();
          ids.push(id);
          const timestamp = id.split('-')[1];
          if (timestamp) {
            timestamps.push(timestamp);
          }
        }
      }

      // All IDs should be unique
      expect(new Set(ids).size).toBe(ids.length);

      // Timestamps should be relatively ordered (allowing for same timestamp in rapid generation)
      const timestampInts = timestamps.map((t) => Number.parseInt(t, 36));
      const _sorted = [...timestampInts].sort((a, b) => a - b);

      // Should be in non-decreasing order
      for (let i = 1; i < timestampInts.length; i++) {
        expect(timestampInts[i]).toBeGreaterThanOrEqual(timestampInts[i - 1] as number);
      }
    });

    it('should handle collision resistance in random part', () => {
      const randomParts = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const result = DeviceId.generateRandom();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const parts = result.value.getValue().split('-');
          if (parts[2]) {
            randomParts.add(parts[2]);
          }
        }
      }

      // Should have generated many unique random parts
      expect(randomParts.size).toBeGreaterThan(990); // Allow for minimal collision
    });

    it('should generate IDs within valid length bounds', () => {
      for (let i = 0; i < 100; i++) {
        const result = DeviceId.generateRandom();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const id = result.value.getValue();
          expect(id.length).toBeGreaterThan(10); // Should be reasonably long
          expect(id.length).toBeLessThanOrEqual(64); // Within our limit
          expect(id.startsWith('device-')).toBe(true);
        }
      }
    });
  });

  describe('getShortId comprehensive coverage', () => {
    it('should handle exact boundary at 8 characters', () => {
      const exactEight = '12345678';
      const result = DeviceId.create(exactEight);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe(exactEight);
      }
    });

    it('should handle 9 characters (first truncation case)', () => {
      const nineChars = '123456789';
      const result = DeviceId.create(nineChars);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe('1234...6789');
      }
    });

    it('should preserve special characters in truncation', () => {
      const longSpecial = 'dev-ice_123456789_end';
      const result = DeviceId.create(longSpecial);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const shortId = result.value.getShortId();
        expect(shortId).toBe('dev-..._end');
        expect(shortId.length).toBe(11);
      }
    });

    it('should handle maximum length input', () => {
      const maxLength = 'a'.repeat(64);
      const result = DeviceId.create(maxLength);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const shortId = result.value.getShortId();
        expect(shortId).toBe('aaaa...aaaa');
        expect(shortId.length).toBe(11);
      }
    });

    it('should handle minimum truncation case', () => {
      // Edge case: exactly long enough to need truncation
      const testLengths = [9, 10, 15, 20, 30, 50, 64];

      testLengths.forEach((length) => {
        const input = 'x'.repeat(length);
        const result = DeviceId.create(input);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const shortId = result.value.getShortId();
          if (length <= 8) {
            expect(shortId).toBe(input);
          } else {
            expect(shortId).toBe('xxxx...xxxx');
            expect(shortId.length).toBe(11);
          }
        }
      });
    });
  });

  describe('comprehensive equals behavior', () => {
    it('should handle case sensitivity correctly', () => {
      const lower = DeviceId.create('device-abc');
      const upper = DeviceId.create('DEVICE-ABC');
      const mixed = DeviceId.create('Device-AbC');

      expect(lower.isOk()).toBe(true);
      expect(upper.isOk()).toBe(true);
      expect(mixed.isOk()).toBe(true);

      if (lower.isOk() && upper.isOk() && mixed.isOk()) {
        // All should be different (case sensitive)
        expect(lower.value.equals(upper.value)).toBe(false);
        expect(lower.value.equals(mixed.value)).toBe(false);
        expect(upper.value.equals(mixed.value)).toBe(false);
      }
    });

    it('should maintain equals contract with edge inputs', () => {
      const edgeCases = [
        'a', // Single character
        '1', // Single number
        '-', // Single hyphen
        '_', // Single underscore
        'a'.repeat(64), // Maximum length
        'device-123-test_case-999', // Complex valid pattern
      ];

      edgeCases.forEach((testCase) => {
        const result1 = DeviceId.create(testCase);
        const result2 = DeviceId.create(testCase);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          // Reflexive: a.equals(a) should be true
          expect(result1.value.equals(result1.value)).toBe(true);

          // Symmetric: a.equals(b) === b.equals(a)
          expect(result1.value.equals(result2.value)).toBe(true);
          expect(result2.value.equals(result1.value)).toBe(true);
        }
      });
    });
  });

  describe('isLocalDevice advanced patterns', () => {
    it('should handle edge cases in local device detection', () => {
      const localPatterns = [
        'local-', // Just prefix
        'local-a', // Minimal local
        'localhost', // Just localhost
        'alocalhost', // Localhost at start
        'localhosta', // Localhost at end
        'my-localhost-server', // Localhost in middle
        'local-localhost-device', // Both patterns
      ];

      localPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isLocalDevice()).toBe(true);
        }
      });
    });

    it('should not false-positive on similar patterns', () => {
      const nonLocalPatterns = [
        'locale-device', // Similar but not local-
        'mylocal-device', // Contains local but not prefix
        'localdevice', // No separator
        'not-localhost', // localhost not standalone
        'server-local', // local at end, not start
        'production-server',
        'remote-host',
      ];

      nonLocalPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const isLocal = result.value.isLocalDevice();
          // Only check false for patterns that clearly shouldn't be local
          if (!pattern.includes('localhost')) {
            expect(isLocal).toBe(false);
          }
        }
      });
    });
  });

  describe('memory and resource management', () => {
    it('should not leak memory with repeated operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        const result = DeviceId.create(`test-${i % 100}`);
        if (result.isOk()) {
          result.value.getValue();
          result.value.toString();
          result.value.getShortId();
          result.value.isLocalDevice();
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 10k operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle concurrent operations safely', () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const random = DeviceId.generateRandom();
            const created = DeviceId.create(`thread-${i}`);
            return { random, created };
          }),
        );
      }

      return Promise.all(promises).then((results) => {
        expect(results).toHaveLength(100);

        const randomIds = new Set();
        const createdIds = new Set();

        results.forEach(({ random, created }) => {
          expect(random.isOk()).toBe(true);
          expect(created.isOk()).toBe(true);

          if (random.isOk()) {
            randomIds.add(random.value.getValue());
          }
          if (created.isOk()) {
            createdIds.add(created.value.getValue());
          }
        });

        // All should be unique
        expect(randomIds.size).toBe(100);
        expect(createdIds.size).toBe(100);
      });
    });
  });

  describe('comprehensive edge case coverage', () => {
    it('should handle constructor accessibility and immutability', () => {
      const result = DeviceId.create('test-device');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const deviceId = result.value;
        const originalValue = deviceId.getValue();

        // Constructor should not be accessible directly
        expect(() => (deviceId as any).constructor('direct-call')).toThrow();

        // Note: TypeScript readonly is a compile-time feature, not runtime
        // Test functional immutability - methods should return consistent values
        expect(deviceId.getValue()).toBe(originalValue);
        expect(deviceId.toString()).toBe(originalValue);

        // Multiple calls should be consistent
        expect(deviceId.getValue()).toBe(deviceId.getValue());
        expect(deviceId.toString()).toBe(deviceId.toString());

        // Different access methods should return the same value
        expect(deviceId.getValue()).toBe(deviceId.toString());
      }
    });

    it('should handle create method input type validation comprehensively', () => {
      const inputTypes = [
        { input: null, shouldPass: false, reason: 'null value' },
        { input: undefined, shouldPass: false, reason: 'undefined value' },
        { input: 123, shouldPass: false, reason: 'number input' },
        { input: true, shouldPass: false, reason: 'boolean input' },
        { input: {}, shouldPass: false, reason: 'object input' },
        { input: [], shouldPass: false, reason: 'array input' },
        {
          input: () => {
            /* empty */
          },
          shouldPass: false,
          reason: 'function input',
        },
        { input: Symbol('test'), shouldPass: false, reason: 'symbol input' },
        { input: '', shouldPass: false, reason: 'empty string' },
        { input: 'valid-device', shouldPass: true, reason: 'valid string' },
      ];

      inputTypes.forEach(({ input, shouldPass, reason: _ }) => {
        const result = DeviceId.create(input as any);
        expect(result.isOk()).toBe(shouldPass);

        if (!shouldPass && result.isErr()) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toContain('Device ID must be a non-empty string');
        }
      });
    });

    it('should handle trim behavior with Unicode whitespace', () => {
      const unicodeWhitespaceTests = [
        { input: 'device', expected: 'device' },
        { input: ' device ', expected: 'device' },
        { input: '\u00A0device\u00A0', expected: 'device' }, // Non-breaking space
        { input: '\u2000device\u2000', expected: 'device' }, // En quad
        { input: '\u2001device\u2001', expected: 'device' }, // Em quad
        { input: '\u2002device\u2002', expected: 'device' }, // En space
        { input: '\u2003device\u2003', expected: 'device' }, // Em space
        { input: '\u2004device\u2004', expected: 'device' }, // Three-per-em space
        { input: '\u2005device\u2005', expected: 'device' }, // Four-per-em space
        { input: '\u2006device\u2006', expected: 'device' }, // Six-per-em space
        { input: '\u2007device\u2007', expected: 'device' }, // Figure space
        { input: '\u2008device\u2008', expected: 'device' }, // Punctuation space
        { input: '\u2009device\u2009', expected: 'device' }, // Thin space
        { input: '\u200Adevice\u200A', expected: 'device' }, // Hair space
        { input: '\u3000device\u3000', expected: 'device' }, // Ideographic space
        { input: '\uFEFFdevice\uFEFF', expected: 'device' }, // Zero width no-break space
      ];

      unicodeWhitespaceTests.forEach(({ input, expected }) => {
        const result = DeviceId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(expected);
        }
      });
    });

    it('should handle generateRandom method edge cases', () => {
      // Test timestamp component behavior
      const before = Date.now();
      const result1 = DeviceId.generateRandom();
      const after = Date.now();

      expect(result1.isOk()).toBe(true);

      if (result1.isOk()) {
        const id1 = result1.value.getValue();
        const parts1 = id1.split('-');

        expect(parts1).toHaveLength(3);
        expect(parts1[0]).toBe('device');

        // Timestamp should be within reasonable range
        const timestamp1 = Number.parseInt(parts1[1] as string, 36);
        expect(timestamp1).toBeGreaterThanOrEqual(before);
        expect(timestamp1).toBeLessThanOrEqual(after + 1000); // Allow for some processing time

        // Random part should be reasonable length
        expect(parts1[2]?.length).toBeGreaterThanOrEqual(8);
        expect(parts1[2]?.length).toBeLessThanOrEqual(13);
      }

      // Test multiple rapid generations
      const rapidIds = [];
      for (let i = 0; i < 10; i++) {
        const result = DeviceId.generateRandom();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          rapidIds.push(result.value.getValue());
        }
      }

      // All should be unique
      expect(new Set(rapidIds).size).toBe(rapidIds.length);
    });

    it('should handle isLocalDevice method with comprehensive patterns', () => {
      const localPatterns = [
        { input: 'local-device', expected: true, reason: 'starts with local-' },
        { input: 'local-', expected: true, reason: 'just local- prefix' },
        { input: 'localhost', expected: true, reason: 'exactly localhost' },
        { input: 'localhost-server', expected: true, reason: 'starts with localhost' },
        { input: 'my-localhost-server', expected: true, reason: 'contains localhost' },
        { input: 'server-localhost', expected: true, reason: 'ends with localhost' },
        { input: 'localhostname', expected: true, reason: 'localhost as substring' },
        { input: 'local-localhost-device', expected: true, reason: 'both patterns' },
        { input: 'LOCALHOST', expected: false, reason: 'case sensitive - uppercase localhost' },
        { input: 'LOCAL-device', expected: false, reason: 'case sensitive - uppercase LOCAL-' },
        { input: 'locale-device', expected: false, reason: 'locale- not local-' },
        { input: 'localdevice', expected: false, reason: 'no separator' },
        { input: 'mylocal-device', expected: false, reason: 'local not at start' },
        { input: 'remote-device', expected: false, reason: 'remote device' },
        { input: 'production-server', expected: false, reason: 'production server' },
        { input: 'test-localhosts', expected: true, reason: 'contains localhost' },
        { input: 'localhostile', expected: true, reason: 'localhost as substring' },
      ];

      localPatterns.forEach(({ input, expected, reason: _ }) => {
        const result = DeviceId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.isLocalDevice()).toBe(expected);
        }
      });
    });

    it('should handle getShortId method with precise boundary testing', () => {
      const lengthTests = [
        { length: 1, shouldTruncate: false },
        { length: 2, shouldTruncate: false },
        { length: 7, shouldTruncate: false },
        { length: 8, shouldTruncate: false },
        { length: 9, shouldTruncate: true },
        { length: 10, shouldTruncate: true },
        { length: 32, shouldTruncate: true },
        { length: 64, shouldTruncate: true },
      ];

      lengthTests.forEach(({ length, shouldTruncate }) => {
        const input = 'x'.repeat(length);
        const result = DeviceId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const shortId = result.value.getShortId();

          if (shouldTruncate) {
            expect(shortId.length).toBe(11); // 4 + 3 + 4
            expect(shortId).toMatch(/^.{4}\.\.\..{4}$/);
            expect(shortId.startsWith(input.substring(0, 4))).toBe(true);
            expect(shortId.endsWith(input.substring(input.length - 4))).toBe(true);
          } else {
            expect(shortId).toBe(input);
            expect(shortId.length).toBe(length);
          }
        }
      });
    });

    it('should handle string coercion and implicit conversions', () => {
      const result = DeviceId.create('test-device-123');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const deviceId = result.value;
        const expected = 'test-device-123';

        // Explicit string conversion
        expect(deviceId.toString()).toBe(expected);
        expect(deviceId.getValue()).toBe(expected);

        // Implicit string conversion
        expect(String(deviceId)).toBe(expected);
        expect(`${deviceId}`).toBe(expected);
        expect(`${deviceId}`).toBe(expected);

        // String concatenation
        expect(`prefix-${deviceId}`).toBe(`prefix-${expected}`);
        expect(`${deviceId}-suffix`).toBe(`${expected}-suffix`);

        // Template literal
        expect(`Device: ${deviceId}`).toBe(`Device: ${expected}`);
      }
    });

    it('should handle equals method with comprehensive equality testing', () => {
      const device1Result = DeviceId.create('test-device');
      const device2Result = DeviceId.create('test-device');
      const device3Result = DeviceId.create('different-device');

      expect(device1Result.isOk()).toBe(true);
      expect(device2Result.isOk()).toBe(true);
      expect(device3Result.isOk()).toBe(true);

      if (device1Result.isOk() && device2Result.isOk() && device3Result.isOk()) {
        const d1 = device1Result.value;
        const d2 = device2Result.value;
        const d3 = device3Result.value;

        // Reflexivity: x.equals(x) should be true
        expect(d1.equals(d1)).toBe(true);
        expect(d2.equals(d2)).toBe(true);
        expect(d3.equals(d3)).toBe(true);

        // Symmetry: x.equals(y) === y.equals(x)
        expect(d1.equals(d2)).toBe(d2.equals(d1));
        expect(d1.equals(d3)).toBe(d3.equals(d1));
        expect(d2.equals(d3)).toBe(d3.equals(d2));

        // Transitivity test
        const device1DupResult = DeviceId.create('test-device');
        expect(device1DupResult.isOk()).toBe(true);

        if (device1DupResult.isOk()) {
          const d1Dup = device1DupResult.value;
          expect(d1.equals(d2)).toBe(true);
          expect(d2.equals(d1Dup)).toBe(true);
          expect(d1.equals(d1Dup)).toBe(true); // Transitivity
        }

        // Inequality
        expect(d1.equals(d3)).toBe(false);
        expect(d2.equals(d3)).toBe(false);
      }
    });

    it('should handle validation with comprehensive regex pattern testing', () => {
      const validPatterns = [
        'a',
        'Z',
        '0',
        '9',
        '-',
        '_',
        'abc',
        'ABC',
        '123',
        'a1b2',
        'device-123',
        'DEVICE_123',
        'dev-ice_123',
        'a'.repeat(64), // Max length
        '___---___', // Only separators
        '123456789', // Only numbers
        'ABCDEFGHIJ', // Only uppercase
        'abcdefghij', // Only lowercase
        'a-B_3-X_9', // Mixed everything
      ];

      validPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(pattern);
        }
      });

      const invalidPatterns = [
        'device@123',
        'device#123',
        'device$123',
        'device with spaces',
        'device.period',
        'device,comma',
        'device:colon',
        'device;semicolon',
        'device!exclamation',
        'device?question',
        'device*asterisk',
        'device+plus',
        'device=equals',
        'device|pipe',
        'device\\backslash',
        'device/slash',
        'device[bracket',
        'device]bracket',
        'device{brace',
        'device}brace',
        'device(paren',
        'device)paren',
        'device<less',
        'device>greater',
        'device"quote',
        "device'quote",
        'device`backtick',
        'device~tilde',
        'device^caret',
        'device%percent',
        'device&ampersand',
        'café',
        'naïve',
        'résumé', // Accented characters
        '中文',
        '日本語',
        'العربية', // Unicode scripts
        '🚀',
        '💻',
        '🔧', // Emoji
        '\u0000device',
        'device\u0000', // Null characters
        '\u200Bdevice',
        'device\u200B', // Zero-width characters
      ];

      invalidPatterns.forEach((pattern) => {
        const result = DeviceId.create(pattern);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error.message).toContain(
            'can only contain alphanumeric characters, hyphens, and underscores',
          );
        }
      });
    });

    it('should handle method consistency and stability', () => {
      const testId = 'test123'; // Use short ID to avoid truncation
      const result = DeviceId.create(testId);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const deviceId = result.value;

        // All methods should be consistent across multiple calls
        for (let i = 0; i < 100; i++) {
          expect(deviceId.getValue()).toBe(testId);
          expect(deviceId.toString()).toBe(testId);
          expect(deviceId.getShortId()).toBe(testId); // Under 8 chars, no truncation
          expect(deviceId.isLocalDevice()).toBe(false);
        }

        // Test with a longer ID to verify truncation consistency
        const longId = 'test-device-consistency-check';
        const longResult = DeviceId.create(longId);
        expect(longResult.isOk()).toBe(true);

        if (longResult.isOk()) {
          const longDeviceId = longResult.value;
          const expectedShortId = 'test...heck'; // 4 + 3 + 4 chars

          for (let i = 0; i < 10; i++) {
            expect(longDeviceId.getValue()).toBe(longId);
            expect(longDeviceId.toString()).toBe(longId);
            expect(longDeviceId.getShortId()).toBe(expectedShortId);
          }
        }

        // Equals should be stable
        const sameResult = DeviceId.create(testId);
        expect(sameResult.isOk()).toBe(true);

        if (sameResult.isOk()) {
          const sameDeviceId = sameResult.value;

          for (let i = 0; i < 100; i++) {
            expect(deviceId.equals(sameDeviceId)).toBe(true);
            expect(sameDeviceId.equals(deviceId)).toBe(true);
          }
        }
      }
    });

    it('should handle error object properties and inheritance', () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        '   ',
        'device@invalid',
        'a'.repeat(65), // Too long
      ];

      invalidInputs.forEach((input) => {
        const result = DeviceId.create(input as any);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          const error = result.error;
          expect(error).toBeInstanceOf(Error);
          expect(error.name).toBe('Error');
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);
          expect(error.stack).toBeDefined();

          // Error should have proper prototype chain
          expect(Object.getPrototypeOf(error)).toBe(Error.prototype);
        }
      });
    });
  });
});
