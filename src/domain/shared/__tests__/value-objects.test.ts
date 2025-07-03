/**
 * Comprehensive test suite for value objects - foundational domain types
 *
 * Priority: CRITICAL (Used throughout entire codebase)
 * Demonstrates:
 * - Value object immutability patterns
 * - Validation boundary testing
 * - Type safety enforcement
 * - Property-based testing with fast-check
 * - Error handling with neverthrow Result types
 * - Edge cases and boundary conditions
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../result.js';
import {
  type AlignmentMode,
  AtomicArgumentId,
  Attachment,
  DocumentId,
  type ExpansionDirection,
  type LayoutStyle,
  NodeId,
  OrderedSetId,
  PackageId,
  PhysicalProperties,
  Position2D,
  StatementContent,
  StatementId,
  Timestamp,
  TreeId,
  ValueObject,
  Version,
} from '../value-objects.js';

// Property-based test generators
const validStringArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter(s => s.trim().length > 0);
const emptyOrWhitespaceArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n\r'),
  fc.constant('  \t  \n  ')
);
const oversizedStringArbitrary = fc.string({ minLength: 256, maxLength: 300 });
const validPositionArbitrary = fc.tuple(
  fc.float({ min: -1000, max: 1000, noNaN: true }),
  fc.float({ min: -1000, max: 1000, noNaN: true })
);
const invalidPositionArbitrary = fc.oneof(
  fc.tuple(fc.constant(Number.NaN), fc.float({ noNaN: true })),
  fc.tuple(fc.float({ noNaN: true }), fc.constant(Number.NaN)),
  fc.tuple(fc.constant(Number.POSITIVE_INFINITY), fc.float({ noNaN: true })),
  fc.tuple(fc.float({ noNaN: true }), fc.constant(Number.NEGATIVE_INFINITY))
);

describe('Value Objects', () => {
  describe('ValueObject Base Class', () => {
    // Create a concrete implementation for testing
    class TestValueObject extends ValueObject<string> {
      constructor(value: string) {
        super(value);
      }
    }

    describe('equals method', () => {
      it('should return true for same values', () => {
        const obj1 = new TestValueObject('test');
        const obj2 = new TestValueObject('test');
        expect(obj1.equals(obj2)).toBe(true);
      });

      it('should return false for different values', () => {
        const obj1 = new TestValueObject('test1');
        const obj2 = new TestValueObject('test2');
        expect(obj1.equals(obj2)).toBe(false);
      });

      it('should satisfy reflexivity', () => {
        fc.assert(
          fc.property(fc.string(), value => {
            const obj = new TestValueObject(value);
            expect(obj.equals(obj)).toBe(true);
          })
        );
      });

      it('should satisfy symmetry', () => {
        fc.assert(
          fc.property(fc.string(), fc.string(), (value1, value2) => {
            const obj1 = new TestValueObject(value1);
            const obj2 = new TestValueObject(value2);
            expect(obj1.equals(obj2)).toBe(obj2.equals(obj1));
          })
        );
      });
    });

    describe('getValue method', () => {
      it('should return the underlying value', () => {
        fc.assert(
          fc.property(fc.string(), value => {
            const obj = new TestValueObject(value);
            expect(obj.getValue()).toBe(value);
          })
        );
      });
    });

    describe('toString method', () => {
      it('should return string representation of value', () => {
        fc.assert(
          fc.property(fc.string(), value => {
            const obj = new TestValueObject(value);
            expect(obj.toString()).toBe(String(value));
          })
        );
      });
    });
  });

  describe('StatementId', () => {
    describe('creation and validation', () => {
      it('should create valid StatementId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = StatementId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, value => {
            const result = StatementId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('StatementId cannot be empty');
            }
          })
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, value => {
            const result = StatementId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          })
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  test-id  ';
        const result = StatementId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('test-id');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = StatementId.generate();
        const id2 = StatementId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or throw', () => {
        const validId = StatementId.fromString('valid-id');
        expect(validId.getValue()).toBe('valid-id');

        expect(() => StatementId.fromString('')).toThrow(ValidationError);
        expect(() => StatementId.fromString('x'.repeat(256))).toThrow(ValidationError);
      });
    });

    describe('edge cases', () => {
      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'a'.repeat(255);
        const result = StatementId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'a'.repeat(256);
        const overResult = StatementId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });

      it('should handle special characters and Unicode', () => {
        const specialChars = 'äöü-βγδ-🌟-\n\t';
        const result = StatementId.create(specialChars);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(specialChars.trim());
        }
      });
    });
  });

  describe('OrderedSetId', () => {
    describe('creation and validation', () => {
      it('should create valid OrderedSetId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = OrderedSetId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should generate unique IDs', () => {
        const id1 = OrderedSetId.generate();
        const id2 = OrderedSetId.generate();

        expect(id1.equals(id2)).toBe(false);
      });

      it('should follow same validation rules as StatementId', () => {
        expect(OrderedSetId.create('').isErr()).toBe(true);
        expect(OrderedSetId.create('x'.repeat(256)).isErr()).toBe(true);
        expect(OrderedSetId.create('  valid  ').isOk()).toBe(true);
      });
    });
  });

  describe('AtomicArgumentId', () => {
    describe('creation and validation', () => {
      it('should create valid AtomicArgumentId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = AtomicArgumentId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should generate unique IDs', () => {
        const id1 = AtomicArgumentId.generate();
        const id2 = AtomicArgumentId.generate();

        expect(id1.equals(id2)).toBe(false);
      });
    });
  });

  describe('NodeId', () => {
    describe('creation and validation', () => {
      it('should create valid NodeId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = NodeId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should generate unique IDs', () => {
        const id1 = NodeId.generate();
        const id2 = NodeId.generate();

        expect(id1.equals(id2)).toBe(false);
      });
    });
  });

  describe('TreeId', () => {
    describe('creation and validation', () => {
      it('should create valid TreeId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = TreeId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should generate unique IDs', () => {
        const id1 = TreeId.generate();
        const id2 = TreeId.generate();

        expect(id1.equals(id2)).toBe(false);
      });
    });
  });

  describe('DocumentId', () => {
    describe('creation and validation', () => {
      it('should create valid DocumentId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = DocumentId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should generate unique IDs', () => {
        const id1 = DocumentId.generate();
        const id2 = DocumentId.generate();

        expect(id1.equals(id2)).toBe(false);
      });
    });
  });

  describe('PackageId', () => {
    describe('creation and validation', () => {
      it('should create valid PackageId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, value => {
            const result = PackageId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          })
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, value => {
            const result = PackageId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('PackageId cannot be empty');
            }
          })
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, value => {
            const result = PackageId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          })
        );
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'a'.repeat(255);
        const result = PackageId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'a'.repeat(256);
        const overResult = PackageId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });

      it('should generate unique IDs', () => {
        const id1 = PackageId.generate();
        const id2 = PackageId.generate();

        expect(id1.equals(id2)).toBe(false);
      });

      it('should create from string or throw', () => {
        const validId = PackageId.fromString('valid-package-id');
        expect(validId.getValue()).toBe('valid-package-id');

        expect(() => PackageId.fromString('')).toThrow(ValidationError);
        expect(() => PackageId.fromString('x'.repeat(256))).toThrow(ValidationError);
      });

      it('should trim whitespace during creation', () => {
        const value = '  package-id  ';
        const result = PackageId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('package-id');
        }
      });
    });
  });

  describe('StatementContent', () => {
    describe('creation and validation', () => {
      it('should create valid StatementContent from valid strings', () => {
        fc.assert(
          fc.property(fc.string({ minLength: 1, maxLength: 10000 }), value => {
            if (value.trim().length > 0) {
              const result = StatementContent.create(value);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                expect(result.value.getValue()).toBe(value.trim());
              }
            }
          })
        );
      });

      it('should reject null and undefined values', () => {
        const nullResult = StatementContent.create(null as any);
        expect(nullResult.isErr()).toBe(true);

        if (nullResult.isErr()) {
          expect(nullResult.error.message).toContain('cannot be null or undefined');
        }

        const undefinedResult = StatementContent.create(undefined as any);
        expect(undefinedResult.isErr()).toBe(true);
      });

      it('should reject empty and whitespace-only content', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, value => {
            const result = StatementContent.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('StatementContent cannot be empty');
            }
          })
        );
      });

      it('should reject content exceeding 10000 characters', () => {
        const longContent = 'x'.repeat(10001);
        const result = StatementContent.create(longContent);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('cannot exceed 10000 characters');
        }
      });

      it('should handle boundary length values', () => {
        // Test exactly 10000 characters
        const maxContent = 'a'.repeat(10000);
        const result = StatementContent.create(maxContent);
        expect(result.isOk()).toBe(true);

        // Test 10001 characters
        const overContent = 'a'.repeat(10001);
        const overResult = StatementContent.create(overContent);
        expect(overResult.isErr()).toBe(true);
      });

      it('should trim whitespace during creation', () => {
        const content = '  This is a test statement  \n\t';
        const result = StatementContent.create(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('This is a test statement');
        }
      });

      it('should throw when using fromString with invalid content', () => {
        expect(() => StatementContent.fromString('')).toThrow(ValidationError);
        expect(() => StatementContent.fromString('x'.repeat(10001))).toThrow(ValidationError);

        const validContent = StatementContent.fromString('Valid content');
        expect(validContent.getValue()).toBe('Valid content');
      });
    });

    describe('isEmpty property', () => {
      it('should correctly identify empty content', () => {
        // Note: isEmpty checks the actual value, not trimmed
        const emptyContent = new (StatementContent as any)('');
        expect(emptyContent.isEmpty).toBe(true);

        // But create() trims, so normal creation won't create empty content
        const validResult = StatementContent.create('   content   ');
        expect(validResult.isOk()).toBe(true);
        if (validResult.isOk()) {
          expect(validResult.value.isEmpty).toBe(false);
        }
      });
    });

    describe('wordCount property', () => {
      it('should count words correctly', () => {
        const testCases = [
          { content: 'one', expected: 1 },
          { content: 'one two', expected: 2 },
          { content: 'one  two   three', expected: 3 },
          { content: 'one\ntwo\tthree', expected: 3 },
          { content: 'word-with-dashes', expected: 1 },
          { content: 'punctuation, and symbols!', expected: 3 },
        ];

        testCases.forEach(({ content, expected }) => {
          const result = StatementContent.create(content);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.wordCount).toBe(expected);
          }
        });
      });

      it('should handle edge cases in word counting', () => {
        const singleChar = StatementContent.create('a');
        expect(singleChar.isOk()).toBe(true);
        if (singleChar.isOk()) {
          expect(singleChar.value.wordCount).toBe(1);
        }

        const numbersAndSymbols = StatementContent.create('123 @#$ test');
        expect(numbersAndSymbols.isOk()).toBe(true);
        if (numbersAndSymbols.isOk()) {
          expect(numbersAndSymbols.value.wordCount).toBe(3);
        }
      });
    });
  });

  describe('Version', () => {
    describe('creation and validation', () => {
      it('should create valid Version from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), value => {
            const result = Version.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          })
        );
      });

      it('should reject negative numbers', () => {
        fc.assert(
          fc.property(fc.integer({ max: -1 }), value => {
            const result = Version.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('must be a non-negative integer');
            }
          })
        );
      });

      it('should reject non-integers', () => {
        const floatResult = Version.create(1.5);
        expect(floatResult.isErr()).toBe(true);

        const nanResult = Version.create(Number.NaN);
        expect(nanResult.isErr()).toBe(true);

        const infinityResult = Version.create(Number.POSITIVE_INFINITY);
        expect(infinityResult.isErr()).toBe(true);
      });

      it('should create initial version', () => {
        const initial = Version.initial();
        expect(initial.getValue()).toBe(0);
      });
    });

    describe('version operations', () => {
      it('should increment version correctly', () => {
        fc.assert(
          fc.property(fc.nat({ max: 1000 }), value => {
            const versionResult = Version.create(value);
            expect(versionResult.isOk()).toBe(true);

            if (versionResult.isOk()) {
              const version = versionResult.value;
              const next = version.nextVersion();
              expect(next.getValue()).toBe(value + 1);
            }
          })
        );
      });

      it('should compare versions correctly', () => {
        const v1Result = Version.create(1);
        const v2Result = Version.create(2);
        const v3Result = Version.create(2);

        expect(v1Result.isOk()).toBe(true);
        expect(v2Result.isOk()).toBe(true);
        expect(v3Result.isOk()).toBe(true);

        if (v1Result.isOk() && v2Result.isOk() && v3Result.isOk()) {
          const v1 = v1Result.value;
          const v2 = v2Result.value;
          const v3 = v3Result.value;

          expect(v2.isAfter(v1)).toBe(true);
          expect(v1.isBefore(v2)).toBe(true);
          expect(v2.isAfter(v3)).toBe(false);
          expect(v3.isBefore(v2)).toBe(false);
        }
      });

      it('should satisfy version ordering properties', () => {
        fc.assert(
          fc.property(fc.nat(), fc.nat(), (a, b) => {
            const vaResult = Version.create(a);
            const vbResult = Version.create(b);

            expect(vaResult.isOk()).toBe(true);
            expect(vbResult.isOk()).toBe(true);

            if (vaResult.isOk() && vbResult.isOk()) {
              const va = vaResult.value;
              const vb = vbResult.value;

              // Trichotomy: exactly one of <, =, > must be true
              const isAfter = va.isAfter(vb);
              const isBefore = va.isBefore(vb);
              const isEqual = va.equals(vb);

              expect(Number(isAfter) + Number(isBefore) + Number(isEqual)).toBe(1);
            }
          })
        );
      });
    });
  });

  describe('Timestamp', () => {
    describe('creation and validation', () => {
      it('should create valid Timestamp from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), value => {
            const result = Timestamp.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          })
        );
      });

      it('should reject negative numbers and non-integers', () => {
        expect(Timestamp.create(-1).isErr()).toBe(true);
        expect(Timestamp.create(1.5).isErr()).toBe(true);
        expect(Timestamp.create(Number.NaN).isErr()).toBe(true);
      });

      it('should create timestamp from current time', () => {
        const now = Timestamp.now();
        const currentTime = Date.now();

        // Should be very close to current time (within 1 second)
        expect(Math.abs(now.getValue() - currentTime)).toBeLessThan(1000);
      });

      it('should create timestamp from Date object', () => {
        const date = new Date('2023-01-01T00:00:00.000Z');
        const timestamp = Timestamp.fromDate(date);

        expect(timestamp.getValue()).toBe(date.getTime());
      });
    });

    describe('timestamp operations', () => {
      it('should convert back to Date correctly', () => {
        fc.assert(
          fc.property(fc.nat(), value => {
            const timestampResult = Timestamp.create(value);
            expect(timestampResult.isOk()).toBe(true);

            if (timestampResult.isOk()) {
              const timestamp = timestampResult.value;
              const date = timestamp.toDate();
              expect(date.getTime()).toBe(value);
            }
          })
        );
      });

      it('should compare timestamps correctly', () => {
        const t1Result = Timestamp.create(1000);
        const t2Result = Timestamp.create(2000);
        const t3Result = Timestamp.create(2000);

        expect(t1Result.isOk()).toBe(true);
        expect(t2Result.isOk()).toBe(true);
        expect(t3Result.isOk()).toBe(true);

        if (t1Result.isOk() && t2Result.isOk() && t3Result.isOk()) {
          const t1 = t1Result.value;
          const t2 = t2Result.value;
          const t3 = t3Result.value;

          expect(t2.isAfter(t1)).toBe(true);
          expect(t1.isBefore(t2)).toBe(true);
          expect(t2.isAfter(t3)).toBe(false);
          expect(t3.isBefore(t2)).toBe(false);
        }
      });
    });
  });

  describe('Position2D', () => {
    describe('creation and validation', () => {
      it('should create valid Position2D from finite numbers', () => {
        fc.assert(
          fc.property(validPositionArbitrary, ([x, y]) => {
            const result = Position2D.create(x, y);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getX()).toBe(x);
              expect(result.value.getY()).toBe(y);
            }
          })
        );
      });

      it('should reject infinite or NaN coordinates', () => {
        fc.assert(
          fc.property(invalidPositionArbitrary, ([x, y]) => {
            const result = Position2D.create(x, y);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toMatch(/coordinate must be a finite number/);
            }
          })
        );
      });

      it('should create origin position', () => {
        const origin = Position2D.origin();
        expect(origin.getX()).toBe(0);
        expect(origin.getY()).toBe(0);
      });
    });

    describe('position operations', () => {
      it('should move by delta correctly', () => {
        fc.assert(
          fc.property(
            validPositionArbitrary,
            validPositionArbitrary,
            ([x, y], [deltaX, deltaY]) => {
              const posResult = Position2D.create(x, y);
              expect(posResult.isOk()).toBe(true);

              if (posResult.isOk()) {
                const position = posResult.value;
                const moveResult = position.moveBy(deltaX, deltaY);

                if (moveResult.isOk()) {
                  expect(moveResult.value.getX()).toBeCloseTo(x + deltaX, 10);
                  expect(moveResult.value.getY()).toBeCloseTo(y + deltaY, 10);
                }
              }
            }
          )
        );
      });

      it('should calculate distance correctly', () => {
        const pos1Result = Position2D.create(0, 0);
        const pos2Result = Position2D.create(3, 4);

        expect(pos1Result.isOk()).toBe(true);
        expect(pos2Result.isOk()).toBe(true);

        if (pos1Result.isOk() && pos2Result.isOk()) {
          const distance = pos1Result.value.distanceTo(pos2Result.value);
          expect(distance).toBeCloseTo(5, 10); // 3-4-5 triangle
        }
      });

      it('should handle equality correctly', () => {
        const pos1Result = Position2D.create(1.5, 2.5);
        const pos2Result = Position2D.create(1.5, 2.5);
        const pos3Result = Position2D.create(1.5, 3.0);

        expect(pos1Result.isOk()).toBe(true);
        expect(pos2Result.isOk()).toBe(true);
        expect(pos3Result.isOk()).toBe(true);

        if (pos1Result.isOk() && pos2Result.isOk() && pos3Result.isOk()) {
          expect(pos1Result.value.equals(pos2Result.value)).toBe(true);
          expect(pos1Result.value.equals(pos3Result.value)).toBe(false);
        }
      });

      it('should provide meaningful string representation', () => {
        const posResult = Position2D.create(10.5, -20.3);
        expect(posResult.isOk()).toBe(true);

        if (posResult.isOk()) {
          expect(posResult.value.toString()).toBe('(10.5, -20.3)');
        }
      });
    });

    describe('edge cases', () => {
      it('should handle very large coordinates', () => {
        const largeResult = Position2D.create(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
        expect(largeResult.isOk()).toBe(true);
      });

      it('should handle zero coordinates', () => {
        const zeroResult = Position2D.create(0, 0);
        expect(zeroResult.isOk()).toBe(true);

        if (zeroResult.isOk()) {
          expect(zeroResult.value.distanceTo(zeroResult.value)).toBe(0);
        }
      });
    });
  });

  describe('Attachment', () => {
    describe('creation and validation', () => {
      it('should create valid attachment with valid parameters', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getParentNodeId()).toBe(nodeId);
          expect(result.value.getPremisePosition()).toBe(0);
          expect(result.value.getFromPosition()).toBeUndefined();
          expect(result.value.hasMultipleConclusionSource()).toBe(false);
        }
      });

      it('should create attachment with from position', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 1, 2);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPremisePosition()).toBe(1);
          expect(result.value.getFromPosition()).toBe(2);
          expect(result.value.hasMultipleConclusionSource()).toBe(true);
        }
      });

      it('should reject negative premise positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Premise position must be a non-negative integer');
        }
      });

      it('should reject non-integer premise positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 1.5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Premise position must be a non-negative integer');
        }
      });

      it('should reject negative from positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('From position must be a non-negative integer');
        }
      });

      it('should reject non-integer from positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0, 2.5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('From position must be a non-negative integer');
        }
      });
    });

    describe('attachment operations', () => {
      it('should implement equality correctly', () => {
        const nodeId1 = NodeId.generate();
        const nodeId2 = NodeId.generate();

        const att1Result = Attachment.create(nodeId1, 0, 1);
        const att2Result = Attachment.create(nodeId1, 0, 1);
        const att3Result = Attachment.create(nodeId2, 0, 1);
        const att4Result = Attachment.create(nodeId1, 1, 1);
        const att5Result = Attachment.create(nodeId1, 0, 2);

        expect(att1Result.isOk()).toBe(true);
        expect(att2Result.isOk()).toBe(true);
        expect(att3Result.isOk()).toBe(true);
        expect(att4Result.isOk()).toBe(true);
        expect(att5Result.isOk()).toBe(true);

        if (
          att1Result.isOk() &&
          att2Result.isOk() &&
          att3Result.isOk() &&
          att4Result.isOk() &&
          att5Result.isOk()
        ) {
          const att1 = att1Result.value;
          const att2 = att2Result.value;
          const att3 = att3Result.value;
          const att4 = att4Result.value;
          const att5 = att5Result.value;

          expect(att1.equals(att2)).toBe(true); // Same everything
          expect(att1.equals(att3)).toBe(false); // Different parent
          expect(att1.equals(att4)).toBe(false); // Different premise position
          expect(att1.equals(att5)).toBe(false); // Different from position
        }
      });

      it('should provide meaningful string representation', () => {
        const nodeId = NodeId.fromString('test-node-id');

        const simpleResult = Attachment.create(nodeId, 2);
        expect(simpleResult.isOk()).toBe(true);
        if (simpleResult.isOk()) {
          const str = simpleResult.value.toString();
          expect(str).toContain('parent=test-node-id');
          expect(str).toContain('position=2');
          expect(str).not.toContain('from=');
        }

        const complexResult = Attachment.create(nodeId, 1, 3);
        expect(complexResult.isOk()).toBe(true);
        if (complexResult.isOk()) {
          const str = complexResult.value.toString();
          expect(str).toContain('parent=test-node-id');
          expect(str).toContain('position=1');
          expect(str).toContain('from=3');
        }
      });
    });

    describe('property-based testing', () => {
      it('should handle various valid position combinations', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 100 }),
            fc.option(fc.nat({ max: 100 }), { nil: undefined }),
            (premisePos, fromPos) => {
              const nodeId = NodeId.generate();
              const result = Attachment.create(nodeId, premisePos, fromPos);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.getPremisePosition()).toBe(premisePos);
                expect(result.value.getFromPosition()).toBe(fromPos);
                expect(result.value.hasMultipleConclusionSource()).toBe(fromPos !== undefined);
              }
            }
          )
        );
      });
    });
  });

  describe('PhysicalProperties', () => {
    describe('creation and validation', () => {
      it('should create with default values', () => {
        const defaultProps = PhysicalProperties.default();

        expect(defaultProps.getLayoutStyle()).toBe('bottom-up');
        expect(defaultProps.getSpacingX()).toBe(50);
        expect(defaultProps.getSpacingY()).toBe(40);
        expect(defaultProps.getMinWidth()).toBe(100);
        expect(defaultProps.getMinHeight()).toBe(80);
        expect(defaultProps.getExpansionDirection()).toBe('vertical');
        expect(defaultProps.getAlignmentMode()).toBe('center');
      });

      it('should create with custom values', () => {
        const result = PhysicalProperties.create(
          'top-down' as LayoutStyle,
          60,
          45,
          120,
          90,
          'horizontal' as ExpansionDirection,
          'left' as AlignmentMode
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const props = result.value;
          expect(props.getLayoutStyle()).toBe('top-down');
          expect(props.getSpacingX()).toBe(60);
          expect(props.getSpacingY()).toBe(45);
          expect(props.getMinWidth()).toBe(120);
          expect(props.getMinHeight()).toBe(90);
          expect(props.getExpansionDirection()).toBe('horizontal');
          expect(props.getAlignmentMode()).toBe('left');
        }
      });

      it('should reject negative spacing values', () => {
        const negativeXResult = PhysicalProperties.create('bottom-up', -1, 40);
        expect(negativeXResult.isErr()).toBe(true);
        if (negativeXResult.isErr()) {
          expect(negativeXResult.error.message).toContain(
            'Horizontal spacing must be non-negative'
          );
        }

        const negativeYResult = PhysicalProperties.create('bottom-up', 50, -1);
        expect(negativeYResult.isErr()).toBe(true);
        if (negativeYResult.isErr()) {
          expect(negativeYResult.error.message).toContain('Vertical spacing must be non-negative');
        }
      });

      it('should reject non-positive dimensions', () => {
        const zeroWidthResult = PhysicalProperties.create('bottom-up', 50, 40, 0);
        expect(zeroWidthResult.isErr()).toBe(true);
        if (zeroWidthResult.isErr()) {
          expect(zeroWidthResult.error.message).toContain('Minimum width must be positive');
        }

        const zeroHeightResult = PhysicalProperties.create('bottom-up', 50, 40, 100, 0);
        expect(zeroHeightResult.isErr()).toBe(true);
        if (zeroHeightResult.isErr()) {
          expect(zeroHeightResult.error.message).toContain('Minimum height must be positive');
        }
      });

      it('should reject infinite values', () => {
        const infiniteSpacingResult = PhysicalProperties.create(
          'bottom-up',
          Number.POSITIVE_INFINITY,
          40
        );
        expect(infiniteSpacingResult.isErr()).toBe(true);

        const infiniteDimensionResult = PhysicalProperties.create(
          'bottom-up',
          50,
          40,
          Number.POSITIVE_INFINITY
        );
        expect(infiniteDimensionResult.isErr()).toBe(true);
      });
    });

    describe('property modification', () => {
      it('should modify layout style', () => {
        const originalResult = PhysicalProperties.create('bottom-up');
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withLayoutStyle('top-down');
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getLayoutStyle()).toBe('top-down');
            // Other properties should remain the same
            expect(modifiedResult.value.getSpacingX()).toBe(originalResult.value.getSpacingX());
          }
        }
      });

      it('should modify spacing', () => {
        const originalResult = PhysicalProperties.create();
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withSpacing(75, 65);
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getSpacingX()).toBe(75);
            expect(modifiedResult.value.getSpacingY()).toBe(65);
            // Other properties should remain the same
            expect(modifiedResult.value.getLayoutStyle()).toBe(
              originalResult.value.getLayoutStyle()
            );
          }
        }
      });

      it('should modify dimensions', () => {
        const originalResult = PhysicalProperties.create();
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withMinDimensions(150, 120);
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getMinWidth()).toBe(150);
            expect(modifiedResult.value.getMinHeight()).toBe(120);
          }
        }
      });

      it('should modify expansion direction', () => {
        const originalResult = PhysicalProperties.create();
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withExpansionDirection('radial');
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getExpansionDirection()).toBe('radial');
          }
        }
      });

      it('should modify alignment mode', () => {
        const originalResult = PhysicalProperties.create();
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withAlignmentMode('justify');
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getAlignmentMode()).toBe('justify');
          }
        }
      });
    });

    describe('flow direction helpers', () => {
      it('should correctly identify flow directions', () => {
        const bottomUpResult = PhysicalProperties.create('bottom-up');
        const topDownResult = PhysicalProperties.create('top-down');
        const leftRightResult = PhysicalProperties.create('left-right');
        const rightLeftResult = PhysicalProperties.create('right-left');

        expect(bottomUpResult.isOk()).toBe(true);
        expect(topDownResult.isOk()).toBe(true);
        expect(leftRightResult.isOk()).toBe(true);
        expect(rightLeftResult.isOk()).toBe(true);

        if (
          bottomUpResult.isOk() &&
          topDownResult.isOk() &&
          leftRightResult.isOk() &&
          rightLeftResult.isOk()
        ) {
          // Bottom-up
          expect(bottomUpResult.value.isBottomUpFlow()).toBe(true);
          expect(bottomUpResult.value.isTopDownFlow()).toBe(false);
          expect(bottomUpResult.value.isVerticalFlow()).toBe(true);
          expect(bottomUpResult.value.isHorizontalFlow()).toBe(false);

          // Top-down
          expect(topDownResult.value.isBottomUpFlow()).toBe(false);
          expect(topDownResult.value.isTopDownFlow()).toBe(true);
          expect(topDownResult.value.isVerticalFlow()).toBe(true);
          expect(topDownResult.value.isHorizontalFlow()).toBe(false);

          // Left-right
          expect(leftRightResult.value.isBottomUpFlow()).toBe(false);
          expect(leftRightResult.value.isTopDownFlow()).toBe(false);
          expect(leftRightResult.value.isVerticalFlow()).toBe(false);
          expect(leftRightResult.value.isHorizontalFlow()).toBe(true);

          // Right-left
          expect(rightLeftResult.value.isBottomUpFlow()).toBe(false);
          expect(rightLeftResult.value.isTopDownFlow()).toBe(false);
          expect(rightLeftResult.value.isVerticalFlow()).toBe(false);
          expect(rightLeftResult.value.isHorizontalFlow()).toBe(true);
        }
      });
    });

    describe('equality and string representation', () => {
      it('should implement equality correctly', () => {
        const props1Result = PhysicalProperties.create('bottom-up', 50, 40, 100, 80);
        const props2Result = PhysicalProperties.create('bottom-up', 50, 40, 100, 80);
        const props3Result = PhysicalProperties.create('top-down', 50, 40, 100, 80);

        expect(props1Result.isOk()).toBe(true);
        expect(props2Result.isOk()).toBe(true);
        expect(props3Result.isOk()).toBe(true);

        if (props1Result.isOk() && props2Result.isOk() && props3Result.isOk()) {
          expect(props1Result.value.equals(props2Result.value)).toBe(true);
          expect(props1Result.value.equals(props3Result.value)).toBe(false);
        }
      });

      it('should provide meaningful string representation', () => {
        const propsResult = PhysicalProperties.create('bottom-up', 60, 45, 120, 90);
        expect(propsResult.isOk()).toBe(true);

        if (propsResult.isOk()) {
          const str = propsResult.value.toString();
          expect(str).toContain('bottom-up');
          expect(str).toContain('60×45');
          expect(str).toContain('120×90');
        }
      });
    });

    describe('property-based testing', () => {
      it('should handle various valid parameter combinations', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('bottom-up', 'top-down', 'left-right', 'right-left'),
            fc.float({ min: 0, max: 1000, noNaN: true }),
            fc.float({ min: 0, max: 1000, noNaN: true }),
            fc.float({ min: 1, max: 1000, noNaN: true }),
            fc.float({ min: 1, max: 1000, noNaN: true }),
            fc.constantFrom('horizontal', 'vertical', 'radial'),
            fc.constantFrom('left', 'center', 'right', 'justify'),
            (layout, spacingX, spacingY, minWidth, minHeight, expansion, alignment) => {
              const result = PhysicalProperties.create(
                layout as LayoutStyle,
                spacingX,
                spacingY,
                minWidth,
                minHeight,
                expansion as ExpansionDirection,
                alignment as AlignmentMode
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const props = result.value;
                expect(props.getLayoutStyle()).toBe(layout);
                expect(props.getSpacingX()).toBe(spacingX);
                expect(props.getSpacingY()).toBe(spacingY);
                expect(props.getMinWidth()).toBe(minWidth);
                expect(props.getMinHeight()).toBe(minHeight);
                expect(props.getExpansionDirection()).toBe(expansion);
                expect(props.getAlignmentMode()).toBe(alignment);
              }
            }
          )
        );
      });
    });
  });
});
