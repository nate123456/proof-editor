/**
 * Test suite for utility functions
 * Tests helper functions used throughout value objects
 */

import { describe, expect, it } from 'vitest';

import {
  PhysicalProperties,
  Position2D,
  StatementId,
  Timestamp,
  Version,
} from '../value-objects.js';

describe('Utility Functions', () => {
  describe('randomUUID generation', () => {
    it('should generate UUID-like strings with expected format', () => {
      const id1 = StatementId.generate();
      const id2 = StatementId.generate();
      const id3 = StatementId.generate();

      // Check that generated IDs follow UUID pattern
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(id1.getValue())).toBe(true);
      expect(uuidRegex.test(id2.getValue())).toBe(true);
      expect(uuidRegex.test(id3.getValue())).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 1000; i++) {
        const id = StatementId.generate();
        uuids.add(id.getValue());
      }
      expect(uuids.size).toBe(1000);
    });

    it('should generate valid UUID v4 format with correct version and variant bits', () => {
      // Generate multiple UUIDs to test consistency
      for (let i = 0; i < 50; i++) {
        const uuid = StatementId.generate().getValue();

        // Split into components
        const parts = uuid.split('-');
        expect(parts).toHaveLength(5);
        expect(parts[0]).toHaveLength(8);
        expect(parts[1]).toHaveLength(4);
        expect(parts[2]).toHaveLength(4);
        expect(parts[3]).toHaveLength(4);
        expect(parts[4]).toHaveLength(12);

        // Version should be 4 (UUID v4)
        expect(parts[2]?.[0]).toBe('4');

        // Variant bits should be 8, 9, a, or b
        expect(['8', '9', 'a', 'b']).toContain(parts[3]?.[0]);
      }
    });

    it('should ensure version 4 UUID format constraints', () => {
      for (let i = 0; i < 100; i++) {
        const uuid = StatementId.generate().getValue();

        // Version 4 UUID should have '4' at position 14
        expect(uuid.charAt(14)).toBe('4');

        // Variant bits should be '8', '9', 'a', or 'b' at position 19
        const variantChar = uuid.charAt(19);
        expect(['8', '9', 'a', 'b']).toContain(variantChar);
      }
    });

    it('should handle edge cases in random number generation', () => {
      // Mock Math.random to test edge cases
      const originalRandom = Math.random;

      try {
        // Test with minimum random value (0)
        Math.random = () => 0;
        const uuid1 = StatementId.generate().getValue();
        expect(uuid1).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );

        // Test with maximum random value (just under 1)
        Math.random = () => 0.9999999;
        const uuid2 = StatementId.generate().getValue();
        expect(uuid2).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );

        // Ensure they're different
        expect(uuid1).not.toBe(uuid2);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should handle all characters in UUID template', () => {
      // Test that randomUUID function covers both 'x' and 'y' replacement paths
      const uuids = Array.from({ length: 100 }, () => StatementId.generate().getValue());

      // All UUIDs should have the same structure
      uuids.forEach((uuid) => {
        expect(uuid.length).toBe(36);
        expect(uuid.charAt(8)).toBe('-');
        expect(uuid.charAt(13)).toBe('-');
        expect(uuid.charAt(18)).toBe('-');
        expect(uuid.charAt(23)).toBe('-');
      });

      // Should generate variety in random positions
      const firstChars = uuids.map((uuid) => uuid.charAt(0));
      const uniqueFirstChars = new Set(firstChars);
      expect(uniqueFirstChars.size).toBeGreaterThan(1); // Should have variety
    });
  });

  describe('isInteger function coverage', () => {
    it('should validate integers correctly with isInteger', () => {
      // Create Version instances to test integer validation indirectly
      expect(Version.create(0).isOk()).toBe(true);
      expect(Version.create(42).isOk()).toBe(true);
      expect(Version.create(-0).isOk()).toBe(true);

      expect(Version.create(1.5).isErr()).toBe(true);
      expect(Version.create(Number.NaN).isErr()).toBe(true);
      expect(Version.create(Number.POSITIVE_INFINITY).isErr()).toBe(true);
    });

    it('should handle edge cases for integer validation', () => {
      const testCases = [
        { value: 0, expected: true },
        { value: -0, expected: true },
        { value: 1.0, expected: true },
        { value: -1.0, expected: false }, // Version must be non-negative
        { value: 1.1, expected: false },
        { value: Number.MAX_SAFE_INTEGER, expected: true },
        { value: Number.MIN_SAFE_INTEGER, expected: false }, // Version must be non-negative
        { value: Number.POSITIVE_INFINITY, expected: false },
        { value: Number.NEGATIVE_INFINITY, expected: false },
        { value: Number.NaN, expected: false },
      ];

      testCases.forEach(({ value, expected }) => {
        const versionResult = Version.create(value);
        expect(versionResult.isOk()).toBe(expected);
      });
    });

    it('should validate typeof number requirement', () => {
      // Test that isInteger checks typeof number first
      const nonNumberVersions = [
        '1' as any,
        true as any,
        [] as any,
        {} as any,
        null as any,
        undefined as any,
      ];

      nonNumberVersions.forEach((value) => {
        const result = Version.create(value);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Version must be a non-negative integer');
        }
      });
    });

    it('should handle floating point precision edge cases', () => {
      const precisionTestCases = [
        { value: 0.1 + 0.2, expected: false }, // 0.30000000000000004
        { value: 1.0000000000001, expected: false },
        { value: 999999999999999.9, expected: false },
        { value: 1e-10, expected: false },
        { value: 1e10, expected: true },
      ];

      precisionTestCases.forEach(({ value, expected }) => {
        const result = Version.create(value);
        expect(result.isOk()).toBe(expected);
      });
    });

    it('should test isInteger with direct function calls via Timestamp', () => {
      // Use Timestamp to ensure we test the isInteger function thoroughly
      const integerTestCases = [
        { value: 42, expected: true },
        { value: 0, expected: true },
        { value: -5, expected: false }, // Timestamp must be non-negative
        { value: 3.14, expected: false },
        { value: Number.MAX_SAFE_INTEGER, expected: true },
      ];

      integerTestCases.forEach(({ value, expected }) => {
        const result = Timestamp.create(value);
        expect(result.isOk()).toBe(expected);
      });
    });

    it('should validate edge cases in integer validation', () => {
      // Test maximum safe integer boundaries
      expect(Version.create(Number.MAX_SAFE_INTEGER).isOk()).toBe(true);
      expect(Version.create(0).isOk()).toBe(true);

      // Test very small decimal differences
      expect(Version.create(1).isOk()).toBe(true); // Integer
      expect(Version.create(1.1).isErr()).toBe(true);

      // Test negative zero vs positive zero
      expect(Version.create(-0).isOk()).toBe(true);
      expect(Version.create(+0).isOk()).toBe(true);

      // Test edge cases with non-integers
      expect(Version.create(2.5).isErr()).toBe(true);
    });
  });

  describe('isFiniteNumber function coverage', () => {
    it('should validate finite numbers correctly with isFiniteNumber', () => {
      // Create Position2D instances to test finite number validation indirectly
      expect(Position2D.create(0, 0).isOk()).toBe(true);
      expect(Position2D.create(-100.5, 200.7).isOk()).toBe(true);
      expect(Position2D.create(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER).isOk()).toBe(true);

      expect(Position2D.create(Number.NaN, 0).isErr()).toBe(true);
      expect(Position2D.create(0, Number.POSITIVE_INFINITY).isErr()).toBe(true);
      expect(Position2D.create(Number.NEGATIVE_INFINITY, Number.NaN).isErr()).toBe(true);
    });

    it('should handle all finite number edge cases', () => {
      const testCases = [
        { x: 0, y: 0, expected: true },
        { x: -0, y: -0, expected: true },
        { x: Number.MAX_VALUE, y: Number.MIN_VALUE, expected: true },
        { x: Number.EPSILON, y: -Number.EPSILON, expected: true },
        { x: Number.POSITIVE_INFINITY, y: 0, expected: false },
        { x: 0, y: Number.NEGATIVE_INFINITY, expected: false },
        { x: Number.NaN, y: 0, expected: false },
        { x: 0, y: Number.NaN, expected: false },
      ];

      testCases.forEach(({ x, y, expected }) => {
        const positionResult = Position2D.create(x, y);
        expect(positionResult.isOk()).toBe(expected);
      });
    });

    it('should validate typeof number requirement for coordinates', () => {
      const nonNumberCoordinates = [
        '1' as any,
        true as any,
        [] as any,
        {} as any,
        null as any,
        undefined as any,
      ];

      nonNumberCoordinates.forEach((value) => {
        const xResult = Position2D.create(value, 0);
        const yResult = Position2D.create(0, value);

        expect(xResult.isErr()).toBe(true);
        expect(yResult.isErr()).toBe(true);

        if (xResult.isErr()) {
          expect(xResult.error.message).toBe('X coordinate must be a finite number');
        }
        if (yResult.isErr()) {
          expect(yResult.error.message).toBe('Y coordinate must be a finite number');
        }
      });
    });

    it('should test isFiniteNumber via PhysicalProperties spacing validation', () => {
      const spacingTestCases = [
        { spacingX: 10, spacingY: 20, expected: true },
        { spacingX: 0, spacingY: 0, expected: true },
        { spacingX: Number.POSITIVE_INFINITY, spacingY: 10, expected: false },
        { spacingX: 10, spacingY: Number.NEGATIVE_INFINITY, expected: false },
        { spacingX: Number.NaN, spacingY: 10, expected: false },
        { spacingX: 10, spacingY: Number.NaN, expected: false },
        { spacingX: -5, spacingY: 10, expected: false }, // Negative spacing
        { spacingX: 10, spacingY: -5, expected: false }, // Negative spacing
      ];

      spacingTestCases.forEach(({ spacingX, spacingY, expected }) => {
        const result = PhysicalProperties.create('bottom-up', spacingX, spacingY);
        expect(result.isOk()).toBe(expected);
      });
    });

    it('should test isFiniteNumber via PhysicalProperties dimensions validation', () => {
      const dimensionTestCases = [
        { minWidth: 100, minHeight: 80, expected: true },
        { minWidth: Number.POSITIVE_INFINITY, minHeight: 80, expected: false },
        { minWidth: 100, minHeight: Number.NEGATIVE_INFINITY, expected: false },
        { minWidth: Number.NaN, minHeight: 80, expected: false },
        { minWidth: 100, minHeight: Number.NaN, expected: false },
        { minWidth: 0, minHeight: 80, expected: false }, // Zero width
        { minWidth: 100, minHeight: 0, expected: false }, // Zero height
        { minWidth: -10, minHeight: 80, expected: false }, // Negative width
        { minWidth: 100, minHeight: -10, expected: false }, // Negative height
      ];

      dimensionTestCases.forEach(({ minWidth, minHeight, expected }) => {
        const result = PhysicalProperties.create('bottom-up', 50, 40, minWidth, minHeight);
        expect(result.isOk()).toBe(expected);
      });
    });

    it('should validate edge cases in finite number validation', () => {
      // Test extreme but finite values
      expect(Position2D.create(Number.MAX_VALUE, Number.MIN_VALUE).isOk()).toBe(true);
      expect(Position2D.create(-Number.MAX_VALUE, -Number.MIN_VALUE).isOk()).toBe(true);

      // Test smallest possible numbers
      expect(Position2D.create(Number.EPSILON, -Number.EPSILON).isOk()).toBe(true);

      // Test edge cases that might be confusing
      expect(Position2D.create(1.7976931348623157e308, 0).isOk()).toBe(true); // MAX_VALUE
      expect(Position2D.create(Number.POSITIVE_INFINITY, 0).isErr()).toBe(true); // Infinity

      // Test special values that should fail
      expect(Position2D.create(Number.NEGATIVE_INFINITY, 0).isErr()).toBe(true);
      expect(Position2D.create(0, Number.POSITIVE_INFINITY).isErr()).toBe(true);
      expect(Position2D.create(Number.NaN, Number.NaN).isErr()).toBe(true);
    });
  });
});
