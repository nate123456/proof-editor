import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceId } from '../DeviceId.js';
import { OperationId } from '../OperationId.js';

describe('OperationId', () => {
  let mockDeviceId: DeviceId;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const deviceResult = DeviceId.create('test-device');
    expect(deviceResult.isOk()).toBe(true);
    if (deviceResult.isOk()) {
      mockDeviceId = deviceResult.value;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create operation ID with valid string', () => {
      const validIds = [
        'simple-id',
        'operation_123',
        'op:test:456',
        'test.operation.id',
        'Op-123_Test:456.789',
        'a',
        '1',
        'op_device-1_123_abc123',
      ];

      for (const id of validIds) {
        const result = OperationId.create(id);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(id);
        }
      }
    });

    it('should reject null and undefined', () => {
      // @ts-expect-error - Testing invalid input
      const nullResult = OperationId.create(null);
      // @ts-expect-error - Testing invalid input
      const undefinedResult = OperationId.create(undefined);

      expect(nullResult.isErr()).toBe(true);
      expect(undefinedResult.isErr()).toBe(true);
      if (nullResult.isErr()) {
        expect(nullResult.error.message).toContain('must be a non-empty string');
      }
    });

    it('should reject non-string values', () => {
      // @ts-expect-error - Testing invalid input
      const numberResult = OperationId.create(123);
      // @ts-expect-error - Testing invalid input
      const objectResult = OperationId.create({});

      expect(numberResult.isErr()).toBe(true);
      expect(objectResult.isErr()).toBe(true);
    });

    it('should reject empty and whitespace-only strings', () => {
      // Empty string hits the first validation
      const emptyResult = OperationId.create('');
      expect(emptyResult.isErr()).toBe(true);
      if (emptyResult.isErr()) {
        expect(emptyResult.error.message).toContain('must be a non-empty string');
      }

      // Whitespace-only strings hit the second validation
      const whitespaceIds = ['   ', '\t', '\n', '  \t\n  '];
      for (const id of whitespaceIds) {
        const result = OperationId.create(id);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('cannot be empty or whitespace');
        }
      }
    });

    it('should trim whitespace from valid strings', () => {
      const result = OperationId.create('  valid-id  ');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('valid-id');
      }
    });

    it('should reject strings longer than 128 characters', () => {
      const longId = 'a'.repeat(129);
      const result = OperationId.create(longId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot exceed 128 characters');
      }
    });

    it('should accept strings up to 128 characters', () => {
      const maxId = 'a'.repeat(128);
      const result = OperationId.create(maxId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(maxId);
      }
    });

    it('should reject invalid characters', () => {
      const invalidIds = [
        'invalid@id',
        'invalid#id',
        'invalid id', // space
        'invalid$id',
        'invalid%id',
        'invalid/id',
        'invalid\\id',
        'invalid[id]',
        'invalid{id}',
        'invalid|id',
      ];

      for (const id of invalidIds) {
        const result = OperationId.create(id);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('can only contain alphanumeric characters');
        }
      }
    });

    it('should accept valid character set', () => {
      const validCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:.';
      const result = OperationId.create(validCharacters);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(validCharacters);
      }
    });
  });

  describe('generate', () => {
    it('should generate operation ID with device and sequence', () => {
      const result = OperationId.generate(mockDeviceId, 42);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const id = result.value.getValue();
        expect(id).toMatch(/^op_/);
        expect(id).toContain(mockDeviceId.getShortId());
        expect(id).toContain('_42_');
      }
    });

    it('should include timestamp in generated ID', () => {
      const result = OperationId.generate(mockDeviceId, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const id = result.value.getValue();
        const parts = id.split('_');
        expect(parts).toHaveLength(4);
        expect(parts[0]).toBe('op');
        expect(parts[1]).toBe(mockDeviceId.getShortId());
        expect(parts[2]).toBe('1');
        expect(parts[3]).toBeTruthy(); // timestamp part
      }
    });

    it('should reject negative sequence numbers', () => {
      const result = OperationId.generate(mockDeviceId, -1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Sequence number cannot be negative');
      }
    });

    it('should accept zero sequence number', () => {
      const result = OperationId.generate(mockDeviceId, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toContain('_0_');
      }
    });

    it('should generate different IDs for different timestamps', () => {
      const result1 = OperationId.generate(mockDeviceId, 1);

      // Advance time
      vi.setSystemTime(new Date('2024-01-01T00:01:00Z'));
      const result2 = OperationId.generate(mockDeviceId, 1);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getValue()).not.toBe(result2.value.getValue());
      }
    });
  });

  describe('generateWithUUID', () => {
    it('should generate operation ID with UUID', () => {
      const result = OperationId.generateWithUUID(mockDeviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const id = result.value.getValue();
        expect(id).toMatch(/^op_/);
        expect(id).toContain(mockDeviceId.getShortId());
        // Should contain UUID pattern
        expect(id).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      }
    });

    it('should generate different UUIDs each time', () => {
      const result1 = OperationId.generateWithUUID(mockDeviceId);
      const result2 = OperationId.generateWithUUID(mockDeviceId);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getValue()).not.toBe(result2.value.getValue());
      }
    });

    it('should generate valid UUID v4 format', () => {
      const result = OperationId.generateWithUUID(mockDeviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const id = result.value.getValue();
        // Extract UUID part (after last underscore)
        const uuid = id.split('_').pop();
        expect(uuid).toMatch(
          /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
        );
      }
    });
  });

  describe('equals', () => {
    it('should return true for equal operation IDs', () => {
      const id1Result = OperationId.create('test-operation-id');
      const id2Result = OperationId.create('test-operation-id');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);
      if (id1Result.isOk() && id2Result.isOk()) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
      }
    });

    it('should return false for different operation IDs', () => {
      const id1Result = OperationId.create('test-operation-1');
      const id2Result = OperationId.create('test-operation-2');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);
      if (id1Result.isOk() && id2Result.isOk()) {
        expect(id1Result.value.equals(id2Result.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the operation ID value', () => {
      const testId = 'test-operation-id';
      const result = OperationId.create(testId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(testId);
      }
    });
  });

  describe('getDeviceId', () => {
    it('should extract device ID from generated operation ID', () => {
      const result = OperationId.generate(mockDeviceId, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const extractedDeviceId = result.value.getDeviceId();
        expect(extractedDeviceId).toBe(mockDeviceId.getShortId());
      }
    });

    it('should return null for non-generated operation IDs', () => {
      const result = OperationId.create('custom-operation-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDeviceId()).toBeNull();
      }
    });

    it('should return null for malformed generated IDs', () => {
      const result = OperationId.create('op_device'); // Missing parts

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDeviceId()).toBeNull();
      }
    });

    it('should handle UUID-based operation IDs', () => {
      const result = OperationId.generateWithUUID(mockDeviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const extractedDeviceId = result.value.getDeviceId();
        expect(extractedDeviceId).toBe(mockDeviceId.getShortId());
      }
    });
  });

  describe('getSequenceNumber', () => {
    it('should extract sequence number from generated operation ID', () => {
      const result = OperationId.generate(mockDeviceId, 42);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const sequenceNumber = result.value.getSequenceNumber();
        expect(sequenceNumber).toBe(42);
      }
    });

    it('should return null for non-generated operation IDs', () => {
      const result = OperationId.create('custom-operation-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBeNull();
      }
    });

    it('should return null for UUID-based operation IDs', () => {
      const result = OperationId.generateWithUUID(mockDeviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBeNull();
      }
    });

    it('should handle zero sequence number', () => {
      const result = OperationId.generate(mockDeviceId, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBe(0);
      }
    });

    it('should return null for invalid sequence numbers', () => {
      const result = OperationId.create('op_device_not-a-number_timestamp');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBeNull();
      }
    });
  });

  describe('getTimestamp', () => {
    it('should extract timestamp from generated operation ID', () => {
      const result = OperationId.generate(mockDeviceId, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const timestamp = result.value.getTimestamp();
        expect(timestamp).toBeGreaterThan(0);
        expect(typeof timestamp).toBe('number');
      }
    });

    it('should return null for non-generated operation IDs', () => {
      const result = OperationId.create('custom-operation-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp()).toBeNull();
      }
    });

    it('should return null for UUID-based operation IDs', () => {
      const result = OperationId.generateWithUUID(mockDeviceId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp()).toBeNull();
      }
    });

    it('should return null for invalid timestamps', () => {
      // Use empty string for timestamp which should result in NaN when parsed
      const result = OperationId.create('op_device_1_');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTimestamp()).toBeNull();
      }
    });
  });

  describe('isFromDevice', () => {
    it('should return true for matching device ID', () => {
      const result = OperationId.generate(mockDeviceId, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isFromDevice(mockDeviceId)).toBe(true);
      }
    });

    it('should return false for different device ID', () => {
      const otherDeviceResult = DeviceId.create('other-device');
      expect(otherDeviceResult.isOk()).toBe(true);

      if (otherDeviceResult.isOk()) {
        const result = OperationId.generate(mockDeviceId, 1);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.isFromDevice(otherDeviceResult.value)).toBe(false);
        }
      }
    });

    it('should return false for non-generated operation IDs', () => {
      const result = OperationId.create('custom-operation-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isFromDevice(mockDeviceId)).toBe(false);
      }
    });
  });

  describe('isOlderThan', () => {
    it('should compare timestamps correctly', () => {
      const result1 = OperationId.generate(mockDeviceId, 1);

      // Advance time
      vi.setSystemTime(new Date('2024-01-01T00:01:00Z'));
      const result2 = OperationId.generate(mockDeviceId, 2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.isOlderThan(result2.value)).toBe(true);
        expect(result2.value.isOlderThan(result1.value)).toBe(false);
      }
    });

    it('should return false when either timestamp is null', () => {
      const generatedResult = OperationId.generate(mockDeviceId, 1);
      const customResult = OperationId.create('custom-id');

      expect(generatedResult.isOk()).toBe(true);
      expect(customResult.isOk()).toBe(true);
      if (generatedResult.isOk() && customResult.isOk()) {
        expect(generatedResult.value.isOlderThan(customResult.value)).toBe(false);
        expect(customResult.value.isOlderThan(generatedResult.value)).toBe(false);
      }
    });

    it('should return false for equal timestamps', () => {
      const result1 = OperationId.generate(mockDeviceId, 1);
      const result2 = OperationId.generate(mockDeviceId, 2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        // Same timestamp (same millisecond)
        expect(result1.value.isOlderThan(result2.value)).toBe(false);
      }
    });
  });

  describe('isNewerThan', () => {
    it('should compare timestamps correctly', () => {
      const result1 = OperationId.generate(mockDeviceId, 1);

      // Advance time
      vi.setSystemTime(new Date('2024-01-01T00:01:00Z'));
      const result2 = OperationId.generate(mockDeviceId, 2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result2.value.isNewerThan(result1.value)).toBe(true);
        expect(result1.value.isNewerThan(result2.value)).toBe(false);
      }
    });

    it('should return false when either timestamp is null', () => {
      const generatedResult = OperationId.generate(mockDeviceId, 1);
      const customResult = OperationId.create('custom-id');

      expect(generatedResult.isOk()).toBe(true);
      expect(customResult.isOk()).toBe(true);
      if (generatedResult.isOk() && customResult.isOk()) {
        expect(generatedResult.value.isNewerThan(customResult.value)).toBe(false);
        expect(customResult.value.isNewerThan(generatedResult.value)).toBe(false);
      }
    });
  });

  describe('getShortId', () => {
    it('should return full ID for short operation IDs', () => {
      const shortId = 'short';
      const result = OperationId.create(shortId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe(shortId);
      }
    });

    it('should return full ID for 16-character operation IDs', () => {
      const sixteenCharId = '1234567890123456';
      const result = OperationId.create(sixteenCharId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getShortId()).toBe(sixteenCharId);
      }
    });

    it('should truncate long operation IDs', () => {
      const longId = 'very-long-operation-id-that-should-be-truncated-for-display';
      const result = OperationId.create(longId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const shortId = result.value.getShortId();
        expect(shortId).toContain('...');
        expect(shortId.length).toBeLessThan(longId.length);
        expect(shortId).toMatch(/^.{8}\.\.\..*$/);
        expect(shortId.endsWith(longId.slice(-8))).toBe(true);
      }
    });

    it('should show first and last 8 characters for long IDs', () => {
      const longId = 'abcdefgh-middle-part-12345678';
      const result = OperationId.create(longId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const shortId = result.value.getShortId();
        expect(shortId).toBe('abcdefgh...12345678');
      }
    });
  });

  describe('compareBySequence', () => {
    it('should compare by sequence number when both have sequences', () => {
      const result1 = OperationId.generate(mockDeviceId, 1);
      const result2 = OperationId.generate(mockDeviceId, 5);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.compareBySequence(result2.value)).toBeLessThan(0);
        expect(result2.value.compareBySequence(result1.value)).toBeGreaterThan(0);
      }
    });

    it('should return 0 for equal sequence numbers', () => {
      const result1 = OperationId.generate(mockDeviceId, 5);
      const result2 = OperationId.generate(mockDeviceId, 5);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.compareBySequence(result2.value)).toBe(0);
      }
    });

    it('should fallback to string comparison when sequence numbers unavailable', () => {
      const result1 = OperationId.create('abc');
      const result2 = OperationId.create('xyz');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        const comparison = result1.value.compareBySequence(result2.value);
        expect(comparison).toBeLessThan(0); // 'abc' < 'xyz'
      }
    });

    it('should fallback to string comparison when one has no sequence', () => {
      const generatedResult = OperationId.generate(mockDeviceId, 1);
      const customResult = OperationId.create('custom-id');

      expect(generatedResult.isOk()).toBe(true);
      expect(customResult.isOk()).toBe(true);
      if (generatedResult.isOk() && customResult.isOk()) {
        const comparison = generatedResult.value.compareBySequence(customResult.value);
        expect(typeof comparison).toBe('number');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle boundary sequence numbers', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      const result = OperationId.generate(mockDeviceId, maxSafeInt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSequenceNumber()).toBe(maxSafeInt);
      }
    });

    it('should handle special characters in valid range', () => {
      const specialChars = 'test-id_with:special.chars';
      const result = OperationId.create(specialChars);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(specialChars);
      }
    });
  });
});
