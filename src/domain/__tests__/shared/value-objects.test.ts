/**
 * Comprehensive test suite for value objects - foundational domain layer
 *
 * Priority: CRITICAL (24 dependents across codebase)
 * Demonstrates:
 * - Red-Green-Refactor TDD cycle
 * - Property-based testing with domain constraints
 * - Custom domain matchers
 * - Error handling patterns
 * - Type-safe value object behaviors
 */

import fc from 'fast-check';
import { err } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared/result.js';
import {
  AtomicArgumentId,
  Attachment,
  DocumentId,
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
} from '../../shared/value-objects.js';

// Property-based test generators for domain values
const validIdArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter(s => s.trim().length > 0);
const invalidIdArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.string({ minLength: 256 })
);
const validContentArbitrary = fc
  .string({ minLength: 1, maxLength: 10000 })
  .filter(s => s.trim().length > 0);
const invalidContentArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.string({ minLength: 10001, maxLength: 15000 }) // Add reasonable upper bound
);

describe('Utility Functions Coverage', () => {
  // Test the internal utility functions for complete coverage
  it('should cover edge cases in UUID generation', () => {
    // Test multiple UUID generations to ensure pattern coverage
    const uuids = Array.from({ length: 10 }, () => StatementId.generate().getValue());

    // All should match UUID pattern
    uuids.forEach(uuid => {
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    // All should be unique
    const uniqueUuids = new Set(uuids);
    expect(uniqueUuids.size).toBe(uuids.length);
  });

  it('should test Version with edge integer values', () => {
    // Test integer validation edge cases
    const maxSafeInteger = Number.MAX_SAFE_INTEGER;
    const result = Version.create(maxSafeInteger);
    expect(result.isOk()).toBe(true);

    // Test zero case specifically
    const zeroResult = Version.create(0);
    expect(zeroResult.isOk()).toBe(true);
    if (zeroResult.isOk()) {
      expect(zeroResult.value.getValue()).toBe(0);
    }
  });

  it('should test Position2D with edge finite values', () => {
    // Test very small finite numbers
    const smallResult = Position2D.create(Number.MIN_VALUE, -Number.MIN_VALUE);
    expect(smallResult.isOk()).toBe(true);

    // Test large finite numbers
    const largeResult = Position2D.create(Number.MAX_VALUE, -Number.MAX_VALUE);
    expect(largeResult.isOk()).toBe(true);
  });

  it('should test PhysicalProperties with all update methods', () => {
    const original = PhysicalProperties.default();

    // Test withExpansionDirection
    const withHorizontal = original.withExpansionDirection('horizontal');
    expect(withHorizontal.isOk()).toBe(true);
    if (withHorizontal.isOk()) {
      expect(withHorizontal.value.getExpansionDirection()).toBe('horizontal');
    }

    // Test withAlignmentMode
    const withLeft = original.withAlignmentMode('left');
    expect(withLeft.isOk()).toBe(true);
    if (withLeft.isOk()) {
      expect(withLeft.value.getAlignmentMode()).toBe('left');
    }

    // Test withMinDimensions
    const withDims = original.withMinDimensions(200, 150);
    expect(withDims.isOk()).toBe(true);
    if (withDims.isOk()) {
      expect(withDims.value.getMinWidth()).toBe(200);
      expect(withDims.value.getMinHeight()).toBe(150);
    }
  });
});

describe('ValueObject Base Class', () => {
  // Example concrete implementation for testing
  class TestValueObject extends ValueObject<string> {
    constructor(value: string) {
      super(value);
    }
  }

  describe('equality behavior', () => {
    it('should implement value equality correctly', () => {
      const obj1 = new TestValueObject('test');
      const obj2 = new TestValueObject('test');
      const obj3 = new TestValueObject('different');

      expect(obj1.equals(obj2)).toBe(true);
      expect(obj1.equals(obj3)).toBe(false);
      expect(obj2.equals(obj3)).toBe(false);
    });

    it('should be reflexive, symmetric, and transitive', () => {
      fc.assert(
        fc.property(fc.string(), value => {
          const obj1 = new TestValueObject(value);
          const obj2 = new TestValueObject(value);
          const obj3 = new TestValueObject(value);

          // Reflexive: obj.equals(obj) === true
          expect(obj1.equals(obj1)).toBe(true);

          // Symmetric: obj1.equals(obj2) === obj2.equals(obj1)
          expect(obj1.equals(obj2)).toBe(obj2.equals(obj1));

          // Transitive: if obj1.equals(obj2) && obj2.equals(obj3), then obj1.equals(obj3)
          if (obj1.equals(obj2) && obj2.equals(obj3)) {
            expect(obj1.equals(obj3)).toBe(true);
          }
        })
      );
    });
  });

  describe('value access', () => {
    it('should provide access to wrapped value', () => {
      const value = 'test-value';
      const obj = new TestValueObject(value);

      expect(obj.getValue()).toBe(value);
      expect(obj.toString()).toBe(value);
    });
  });
});

describe('ID Value Objects', () => {
  const idTypes = [
    { name: 'StatementId', class: StatementId },
    { name: 'OrderedSetId', class: OrderedSetId },
    { name: 'AtomicArgumentId', class: AtomicArgumentId },
    { name: 'NodeId', class: NodeId },
    { name: 'TreeId', class: TreeId },
    { name: 'DocumentId', class: DocumentId },
    { name: 'PackageId', class: PackageId },
  ];

  idTypes.forEach(({ name, class: IdClass }) => {
    describe(name, () => {
      describe('creation patterns', () => {
        it('should create valid IDs from strings', () => {
          fc.assert(
            fc.property(validIdArbitrary, validId => {
              const result = IdClass.create(validId);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                expect(result.value).toBeInstanceOf(IdClass);
                expect(result.value.getValue()).toBe(validId.trim());
              }
            })
          );
        });

        it('should generate valid UUID-based IDs', () => {
          const generated = IdClass.generate();
          expect(generated).toBeInstanceOf(IdClass);
          expect(generated.getValue()).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          );
        });

        it('should create from string via convenience method', () => {
          const testId = 'test-id-123';
          const id = IdClass.fromString(testId);
          expect(id).toBeInstanceOf(IdClass);
          expect(id.getValue()).toBe(testId);
        });
      });

      describe('validation rules', () => {
        it('should reject empty and whitespace-only strings', () => {
          fc.assert(
            fc.property(invalidIdArbitrary, invalidId => {
              const result = IdClass.create(invalidId);
              expect(result.isErr()).toBe(true);

              if (result.isErr()) {
                expect(result.error).toBeInstanceOf(ValidationError);
                expect(result.error.message).toMatch(/cannot be empty|cannot exceed/i);
              }
            })
          );
        });

        it('should reject null and undefined', () => {
          const nullResult = IdClass.create(null as any);
          expect(nullResult.isErr()).toBe(true);

          const undefinedResult = IdClass.create(undefined as any);
          expect(undefinedResult.isErr()).toBe(true);
        });

        it('should throw when fromString receives invalid input', () => {
          expect(() => IdClass.fromString('')).toThrow(ValidationError);
          expect(() => IdClass.fromString('   ')).toThrow(ValidationError);
          expect(() => IdClass.fromString('a'.repeat(256))).toThrow(ValidationError);
        });
      });

      describe('domain behavior', () => {
        it('should trim whitespace during creation', () => {
          const result = IdClass.create('  valid-id  ');
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.getValue()).toBe('valid-id');
          }
        });

        it('should maintain identity across equal values', () => {
          const id1 = IdClass.fromString('test-id');
          const id2 = IdClass.fromString('test-id');

          expect(id1.equals(id2 as any)).toBe(true);
          expect(id1.getValue()).toBe(id2.getValue());
        });

        it('should provide readable string representation', () => {
          const testValue = 'readable-id-123';
          const id = IdClass.fromString(testValue);
          expect(id.toString()).toBe(testValue);
        });
      });
    });
  });
});

describe('StatementContent', () => {
  describe('creation and validation', () => {
    it('should create valid content from strings', () => {
      fc.assert(
        fc.property(validContentArbitrary, validContent => {
          const result = StatementContent.create(validContent);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value).toBeInstanceOf(StatementContent);
            expect(result.value.getValue()).toBe(validContent.trim());
          }
        })
      );
    });

    it('should reject empty content and oversized content', () => {
      fc.assert(
        fc.property(invalidContentArbitrary, invalidContent => {
          const result = StatementContent.create(invalidContent);
          expect(result.isErr()).toBe(true);

          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
          }
        })
      );
    });

    it('should handle null and undefined gracefully', () => {
      const nullResult = StatementContent.create(null as any);
      expect(nullResult.isErr()).toBe(true);

      const undefinedResult = StatementContent.create(undefined as any);
      expect(undefinedResult.isErr()).toBe(true);
    });
  });

  describe('domain-specific behavior', () => {
    it('should provide word count functionality', () => {
      const content = StatementContent.fromString('This is a test statement');
      expect(content.wordCount).toBe(5);

      const singleSpace = StatementContent.fromString(' a ');
      expect(singleSpace.wordCount).toBe(1);

      const singleWord = StatementContent.fromString('Word');
      expect(singleWord.wordCount).toBe(1);
    });

    it('should detect empty content correctly', () => {
      // Note: Empty content can't be created due to validation
      // This tests the isEmpty property implementation
      const content = StatementContent.fromString('Not empty');
      expect(content.isEmpty).toBe(false);

      // Edge case: minimal content
      const minimal = StatementContent.fromString('a');
      expect(minimal.isEmpty).toBe(false);
    });

    it('should trim whitespace consistently', () => {
      const content = StatementContent.fromString('  Important statement  ');
      expect(content.getValue()).toBe('Important statement');
      expect(content.toString()).toBe('Important statement');
    });
  });

  describe('property-based content analysis', () => {
    it('should maintain word count invariants', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), text => {
          fc.pre(text.trim().length > 0); // Only test valid content

          const content = StatementContent.fromString(text);
          const words = text
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0);

          expect(content.wordCount).toBe(words.length);
          expect(content.wordCount).toBeGreaterThanOrEqual(0);
        })
      );
    });
  });
});

describe('Version', () => {
  describe('creation and validation', () => {
    it('should create valid versions from non-negative integers', () => {
      fc.assert(
        fc.property(fc.nat(), version => {
          const result = Version.create(version);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.getValue()).toBe(version);
          }
        })
      );
    });

    it('should reject negative numbers and non-integers', () => {
      const invalidVersions = [-1, -100, 1.5, 3.14, NaN, Infinity];

      invalidVersions.forEach(invalid => {
        const result = Version.create(invalid);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });
  });

  describe('version operations', () => {
    it('should provide initial version', () => {
      const initial = Version.initial();
      expect(initial.getValue()).toBe(0);
    });

    it('should increment versions correctly', () => {
      fc.assert(
        fc.property(fc.nat({ max: 1000 }), startVersion => {
          const version = Version.create(startVersion);
          expect(version.isOk()).toBe(true);

          if (version.isOk()) {
            const next = version.value.nextVersion();
            expect(next.getValue()).toBe(startVersion + 1);
          }
        })
      );
    });

    it('should compare versions correctly', () => {
      const v1Result = Version.create(5);
      const v2Result = Version.create(10);
      const v3Result = Version.create(5);

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);
      expect(v3Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk() && v3Result.isOk()) {
        const v1 = v1Result.value;
        const v2 = v2Result.value;
        const v3 = v3Result.value;

        expect(v2.isAfter(v1)).toBe(true);
        expect(v1.isBefore(v2)).toBe(true);
        expect(v1.isAfter(v3)).toBe(false);
        expect(v1.isBefore(v3)).toBe(false);
      }
    });
  });

  describe('version ordering properties', () => {
    it('should maintain ordering invariants', () => {
      fc.assert(
        fc.property(fc.nat(), fc.nat(), (a, b) => {
          const vAResult = Version.create(a);
          const vBResult = Version.create(b);

          expect(vAResult.isOk()).toBe(true);
          expect(vBResult.isOk()).toBe(true);

          if (vAResult.isOk() && vBResult.isOk()) {
            const vA = vAResult.value;
            const vB = vBResult.value;

            if (a < b) {
              expect(vA.isBefore(vB)).toBe(true);
              expect(vB.isAfter(vA)).toBe(true);
            } else if (a > b) {
              expect(vA.isAfter(vB)).toBe(true);
              expect(vB.isBefore(vA)).toBe(true);
            } else {
              expect(vA.isBefore(vB)).toBe(false);
              expect(vA.isAfter(vB)).toBe(false);
            }
          }
        })
      );
    });
  });
});

describe('Timestamp', () => {
  describe('creation patterns', () => {
    it('should create from valid timestamps', () => {
      fc.assert(
        fc.property(fc.nat(), timestamp => {
          const result = Timestamp.create(timestamp);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.getValue()).toBe(timestamp);
          }
        })
      );
    });

    it('should create current timestamp', () => {
      const before = Date.now();
      const timestamp = Timestamp.now();
      const after = Date.now();

      expect(timestamp.getValue()).toBeGreaterThanOrEqual(before);
      expect(timestamp.getValue()).toBeLessThanOrEqual(after);
    });

    it('should create from Date objects', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const timestamp = Timestamp.fromDate(date);

      expect(timestamp.getValue()).toBe(date.getTime());
      expect(timestamp.toDate()).toEqual(date);
    });

    it('should reject invalid timestamp values', () => {
      const negativeResult = Timestamp.create(-1);
      expect(negativeResult.isErr()).toBe(true);

      const floatResult = Timestamp.create(123.45);
      expect(floatResult.isErr()).toBe(true);

      const nanResult = Timestamp.create(NaN);
      expect(nanResult.isErr()).toBe(true);

      const infiniteResult = Timestamp.create(Infinity);
      expect(infiniteResult.isErr()).toBe(true);
    });
  });

  describe('temporal operations', () => {
    it('should compare timestamps correctly', () => {
      const earlyResult = Timestamp.create(1000);
      const lateResult = Timestamp.create(2000);

      expect(earlyResult.isOk()).toBe(true);
      expect(lateResult.isOk()).toBe(true);

      if (earlyResult.isOk() && lateResult.isOk()) {
        const early = earlyResult.value;
        const late = lateResult.value;

        expect(late.isAfter(early)).toBe(true);
        expect(early.isBefore(late)).toBe(true);
        expect(early.isAfter(early)).toBe(false);
        expect(early.isBefore(early)).toBe(false);
      }
    });

    it('should convert to Date consistently', () => {
      fc.assert(
        fc.property(fc.nat(), timestamp => {
          const tsResult = Timestamp.create(timestamp);
          expect(tsResult.isOk()).toBe(true);

          if (tsResult.isOk()) {
            const ts = tsResult.value;
            const date = ts.toDate();
            const roundTrip = Timestamp.fromDate(date);

            expect(roundTrip.getValue()).toBe(timestamp);
          }
        })
      );
    });
  });
});

describe('Position2D', () => {
  describe('coordinate validation', () => {
    it('should create valid positions from finite numbers', () => {
      fc.assert(
        fc.property(
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          (x, y) => {
            const result = Position2D.create(x, y);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getX()).toBe(x);
              expect(result.value.getY()).toBe(y);
            }
          }
        )
      );
    });

    it('should reject NaN and infinite coordinates', () => {
      const invalidCoords = [NaN, Infinity, -Infinity];

      invalidCoords.forEach(invalid => {
        const xResult = Position2D.create(invalid, 0);
        const yResult = Position2D.create(0, invalid);

        expect(xResult.isErr()).toBe(true);
        expect(yResult.isErr()).toBe(true);
      });
    });
  });

  describe('spatial operations', () => {
    it('should provide origin position', () => {
      const origin = Position2D.origin();
      expect(origin.getX()).toBe(0);
      expect(origin.getY()).toBe(0);
    });

    it('should move by delta correctly', () => {
      const posResult = Position2D.create(10, 20);
      expect(posResult.isOk()).toBe(true);

      if (posResult.isOk()) {
        const pos = posResult.value;
        const movedResult = pos.moveBy(5, -3);
        expect(movedResult.isOk()).toBe(true);

        if (movedResult.isOk()) {
          const moved = movedResult.value;

          expect(moved.getX()).toBe(15);
          expect(moved.getY()).toBe(17);
        }
      }
    });

    it('should calculate distance correctly', () => {
      const p1Result = Position2D.create(0, 0);
      const p2Result = Position2D.create(3, 4);

      expect(p1Result.isOk()).toBe(true);
      expect(p2Result.isOk()).toBe(true);

      if (p1Result.isOk() && p2Result.isOk()) {
        const p1 = p1Result.value;
        const p2 = p2Result.value;

        expect(p1.distanceTo(p2)).toBe(5); // 3-4-5 triangle
        expect(p2.distanceTo(p1)).toBe(5); // Distance is symmetric
      }
    });

    it('should implement equality correctly', () => {
      const p1Result = Position2D.create(1.5, 2.7);
      const p2Result = Position2D.create(1.5, 2.7);
      const p3Result = Position2D.create(1.5, 2.8);

      expect(p1Result.isOk()).toBe(true);
      expect(p2Result.isOk()).toBe(true);
      expect(p3Result.isOk()).toBe(true);

      if (p1Result.isOk() && p2Result.isOk() && p3Result.isOk()) {
        const p1 = p1Result.value;
        const p2 = p2Result.value;
        const p3 = p3Result.value;

        expect(p1.equals(p2)).toBe(true);
        expect(p1.equals(p3)).toBe(false);
      }
    });

    it('should provide readable string representation', () => {
      const posResult = Position2D.create(10.5, -20.3);
      expect(posResult.isOk()).toBe(true);

      if (posResult.isOk()) {
        const pos = posResult.value;
        expect(pos.toString()).toBe('(10.5, -20.3)');
      }
    });
  });

  describe('geometric properties', () => {
    it('should maintain distance properties', () => {
      fc.assert(
        fc.property(
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          (x1, y1, x2, y2) => {
            const p1Result = Position2D.create(x1, y1);
            const p2Result = Position2D.create(x2, y2);

            expect(p1Result.isOk()).toBe(true);
            expect(p2Result.isOk()).toBe(true);

            if (p1Result.isOk() && p2Result.isOk()) {
              const p1 = p1Result.value;
              const p2 = p2Result.value;

              const distance = p1.distanceTo(p2);

              // Distance is non-negative
              expect(distance).toBeGreaterThanOrEqual(0);

              // Distance is symmetric
              expect(p2.distanceTo(p1)).toBeCloseTo(distance);

              // Distance to self is zero
              expect(p1.distanceTo(p1)).toBe(0);
            }
          }
        )
      );
    });
  });
});

describe('Attachment', () => {
  describe('creation and validation', () => {
    it('should create valid attachments', () => {
      const parentId = NodeId.generate();
      const result = Attachment.create(parentId, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getParentNodeId()).toBe(parentId);
        expect(result.value.getPremisePosition()).toBe(0);
        expect(result.value.getFromPosition()).toBeUndefined();
        expect(result.value.hasMultipleConclusionSource()).toBe(false);
      }
    });

    it('should create attachments with from position', () => {
      const parentId = NodeId.generate();
      const result = Attachment.create(parentId, 1, 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getFromPosition()).toBe(2);
        expect(result.value.hasMultipleConclusionSource()).toBe(true);
      }
    });

    it('should reject negative positions', () => {
      const parentId = NodeId.generate();

      const negativePremise = Attachment.create(parentId, -1);
      expect(negativePremise.isErr()).toBe(true);

      const negativeFrom = Attachment.create(parentId, 0, -1);
      expect(negativeFrom.isErr()).toBe(true);
    });

    it('should reject non-integer positions', () => {
      const parentId = NodeId.generate();

      const floatPremise = Attachment.create(parentId, 1.5);
      expect(floatPremise.isErr()).toBe(true);

      const floatFrom = Attachment.create(parentId, 0, 2.7);
      expect(floatFrom.isErr()).toBe(true);
    });
  });

  describe('attachment equality and representation', () => {
    it('should implement equality correctly', () => {
      const parentId = NodeId.generate();
      const attachment1Result = Attachment.create(parentId, 0);
      const attachment2Result = Attachment.create(parentId, 0);
      const attachment3Result = Attachment.create(parentId, 1);

      expect(attachment1Result.isOk()).toBe(true);
      expect(attachment2Result.isOk()).toBe(true);
      expect(attachment3Result.isOk()).toBe(true);

      if (attachment1Result.isOk() && attachment2Result.isOk() && attachment3Result.isOk()) {
        const attachment1 = attachment1Result.value;
        const attachment2 = attachment2Result.value;
        const attachment3 = attachment3Result.value;

        expect(attachment1.equals(attachment2)).toBe(true);
        expect(attachment1.equals(attachment3)).toBe(false);
      }
    });

    it('should provide readable string representation', () => {
      const parentId = NodeId.fromString('test-parent');

      const simpleResult = Attachment.create(parentId, 0);
      expect(simpleResult.isOk()).toBe(true);

      if (simpleResult.isOk()) {
        const simple = simpleResult.value;
        expect(simple.toString()).toContain('parent=test-parent');
        expect(simple.toString()).toContain('position=0');
      }

      const withFromResult = Attachment.create(parentId, 1, 2);
      expect(withFromResult.isOk()).toBe(true);

      if (withFromResult.isOk()) {
        const withFrom = withFromResult.value;
        expect(withFrom.toString()).toContain('from=2');
      }
    });
  });
});

describe('PhysicalProperties', () => {
  describe('creation with validation', () => {
    it('should create with default values', () => {
      const defaults = PhysicalProperties.default();

      expect(defaults.getLayoutStyle()).toBe('bottom-up');
      expect(defaults.getSpacingX()).toBe(50);
      expect(defaults.getSpacingY()).toBe(40);
      expect(defaults.getMinWidth()).toBe(100);
      expect(defaults.getMinHeight()).toBe(80);
      expect(defaults.getExpansionDirection()).toBe('vertical');
      expect(defaults.getAlignmentMode()).toBe('center');
    });

    it('should validate spacing constraints', () => {
      const negativeSpacingX = PhysicalProperties.create('bottom-up', -10, 40);
      expect(negativeSpacingX.isErr()).toBe(true);

      const negativeSpacingY = PhysicalProperties.create('bottom-up', 50, -10);
      expect(negativeSpacingY.isErr()).toBe(true);

      const infiniteSpacingX = PhysicalProperties.create('bottom-up', Infinity, 40);
      expect(infiniteSpacingX.isErr()).toBe(true);

      const infiniteSpacingY = PhysicalProperties.create('bottom-up', 50, Infinity);
      expect(infiniteSpacingY.isErr()).toBe(true);

      const nanSpacingX = PhysicalProperties.create('bottom-up', NaN, 40);
      expect(nanSpacingX.isErr()).toBe(true);

      const nanSpacingY = PhysicalProperties.create('bottom-up', 50, NaN);
      expect(nanSpacingY.isErr()).toBe(true);
    });

    it('should validate dimension constraints', () => {
      const zeroDimension = PhysicalProperties.create('bottom-up', 50, 40, 0, 80);
      expect(zeroDimension.isErr()).toBe(true);

      const negativeDimension = PhysicalProperties.create('bottom-up', 50, 40, 100, -80);
      expect(negativeDimension.isErr()).toBe(true);
    });
  });

  describe('immutable updates', () => {
    it('should create new instances on updates', () => {
      const original = PhysicalProperties.default();

      const withNewStyleResult = original.withLayoutStyle('top-down');
      expect(withNewStyleResult.isOk()).toBe(true);

      if (withNewStyleResult.isOk()) {
        const withNewStyle = withNewStyleResult.value;
        expect(withNewStyle.getLayoutStyle()).toBe('top-down');
        expect(original.getLayoutStyle()).toBe('bottom-up'); // Original unchanged
      }

      const withNewSpacingResult = original.withSpacing(100, 80);
      expect(withNewSpacingResult.isOk()).toBe(true);

      if (withNewSpacingResult.isOk()) {
        const withNewSpacing = withNewSpacingResult.value;
        expect(withNewSpacing.getSpacingX()).toBe(100);
        expect(withNewSpacing.getSpacingY()).toBe(80);
      }
    });

    it('should maintain validation in updates', () => {
      const original = PhysicalProperties.default();

      const invalidUpdate = original.withSpacing(-10, 40);
      expect(invalidUpdate.isErr()).toBe(true);
    });
  });

  describe('layout analysis', () => {
    it('should detect flow directions correctly', () => {
      const bottomUpResult = PhysicalProperties.create('bottom-up');
      expect(bottomUpResult.isOk()).toBe(true);

      if (bottomUpResult.isOk()) {
        const bottomUp = bottomUpResult.value;
        expect(bottomUp.isBottomUpFlow()).toBe(true);
        expect(bottomUp.isVerticalFlow()).toBe(true);
        expect(bottomUp.isHorizontalFlow()).toBe(false);
      }

      const topDownResult = PhysicalProperties.create('top-down');
      expect(topDownResult.isOk()).toBe(true);

      if (topDownResult.isOk()) {
        const topDown = topDownResult.value;
        expect(topDown.isTopDownFlow()).toBe(true);
        expect(topDown.isVerticalFlow()).toBe(true);
        expect(topDown.isBottomUpFlow()).toBe(false);
      }

      const leftRightResult = PhysicalProperties.create('left-right');
      expect(leftRightResult.isOk()).toBe(true);

      if (leftRightResult.isOk()) {
        const leftRight = leftRightResult.value;
        expect(leftRight.isHorizontalFlow()).toBe(true);
        expect(leftRight.isVerticalFlow()).toBe(false);
      }

      const rightLeftResult = PhysicalProperties.create('right-left');
      expect(rightLeftResult.isOk()).toBe(true);

      if (rightLeftResult.isOk()) {
        const rightLeft = rightLeftResult.value;
        expect(rightLeft.isHorizontalFlow()).toBe(true);
        expect(rightLeft.isVerticalFlow()).toBe(false);
      }
    });

    it('should provide readable string representation', () => {
      const propsResult = PhysicalProperties.create('bottom-up', 50, 40, 100, 80);
      expect(propsResult.isOk()).toBe(true);

      if (propsResult.isOk()) {
        const props = propsResult.value;
        const str = props.toString();

        expect(str).toContain('bottom-up');
        expect(str).toContain('50×40');
        expect(str).toContain('100×80');
      }
    });
  });

  describe('equality behavior', () => {
    it('should implement equality correctly for identical properties', () => {
      const props1Result = PhysicalProperties.create(
        'bottom-up',
        50,
        40,
        100,
        80,
        'vertical',
        'center'
      );
      const props2Result = PhysicalProperties.create(
        'bottom-up',
        50,
        40,
        100,
        80,
        'vertical',
        'center'
      );

      expect(props1Result.isOk()).toBe(true);
      expect(props2Result.isOk()).toBe(true);

      if (props1Result.isOk() && props2Result.isOk()) {
        const props1 = props1Result.value;
        const props2 = props2Result.value;

        expect(props1.equals(props2)).toBe(true);
      }
    });

    it('should detect differences in all properties', () => {
      const baseResult = PhysicalProperties.create(
        'bottom-up',
        50,
        40,
        100,
        80,
        'vertical',
        'center'
      );
      expect(baseResult.isOk()).toBe(true);

      if (baseResult.isOk()) {
        const base = baseResult.value;

        const diffLayoutResult = PhysicalProperties.create(
          'top-down',
          50,
          40,
          100,
          80,
          'vertical',
          'center'
        );
        expect(diffLayoutResult.isOk()).toBe(true);

        if (diffLayoutResult.isOk()) {
          const diffLayout = diffLayoutResult.value;
          expect(base.equals(diffLayout)).toBe(false);
        }

        const diffSpacingXResult = PhysicalProperties.create(
          'bottom-up',
          60,
          40,
          100,
          80,
          'vertical',
          'center'
        );
        expect(diffSpacingXResult.isOk()).toBe(true);
        if (diffSpacingXResult.isOk()) {
          expect(base.equals(diffSpacingXResult.value)).toBe(false);
        }

        const diffSpacingYResult = PhysicalProperties.create(
          'bottom-up',
          50,
          50,
          100,
          80,
          'vertical',
          'center'
        );
        expect(diffSpacingYResult.isOk()).toBe(true);
        if (diffSpacingYResult.isOk()) {
          expect(base.equals(diffSpacingYResult.value)).toBe(false);
        }

        const diffMinWidthResult = PhysicalProperties.create(
          'bottom-up',
          50,
          40,
          120,
          80,
          'vertical',
          'center'
        );
        expect(diffMinWidthResult.isOk()).toBe(true);
        if (diffMinWidthResult.isOk()) {
          expect(base.equals(diffMinWidthResult.value)).toBe(false);
        }

        const diffMinHeightResult = PhysicalProperties.create(
          'bottom-up',
          50,
          40,
          100,
          90,
          'vertical',
          'center'
        );
        expect(diffMinHeightResult.isOk()).toBe(true);
        if (diffMinHeightResult.isOk()) {
          expect(base.equals(diffMinHeightResult.value)).toBe(false);
        }

        const diffExpansionResult = PhysicalProperties.create(
          'bottom-up',
          50,
          40,
          100,
          80,
          'horizontal',
          'center'
        );
        expect(diffExpansionResult.isOk()).toBe(true);
        if (diffExpansionResult.isOk()) {
          expect(base.equals(diffExpansionResult.value)).toBe(false);
        }

        const diffAlignmentResult = PhysicalProperties.create(
          'bottom-up',
          50,
          40,
          100,
          80,
          'vertical',
          'left'
        );
        expect(diffAlignmentResult.isOk()).toBe(true);
        if (diffAlignmentResult.isOk()) {
          expect(base.equals(diffAlignmentResult.value)).toBe(false);
        }
      }
    });
  });
});

describe('Error Handling Patterns', () => {
  it('should provide consistent error contexts', () => {
    const result = StatementId.create('');
    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.context).toBeDefined();
      expect(result.error.context?.['field']).toBe('value');
      expect(result.error.context?.['value']).toBe('');
    }
  });

  it('should maintain error information through fromString', () => {
    expect(() => StatementContent.fromString('')).toThrow(ValidationError);

    try {
      StatementContent.fromString('');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('cannot be empty');
    }
  });
});

describe('Domain Integration Patterns', () => {
  it('should support chained operations with Result types', () => {
    const createAndValidateId = (input: string) => {
      const result = StatementId.create(input);
      if (result.isErr()) return result;

      // Simulate additional domain logic
      const id = result.value;
      if (id.getValue().includes('invalid')) {
        return err(new ValidationError('Business rule violation'));
      }

      return result;
    };

    const validResult = createAndValidateId('valid-id-123');
    expect(validResult.isOk()).toBe(true);

    const invalidResult = createAndValidateId('invalid-id');
    expect(invalidResult.isErr()).toBe(true);
  });

  it('should demonstrate factory patterns for related objects', () => {
    // Simulate creating related objects that need consistent IDs
    const createRelatedIds = () => ({
      statement: StatementId.generate(),
      orderedSet: OrderedSetId.generate(),
      argument: AtomicArgumentId.generate(),
    });

    const ids = createRelatedIds();

    expect(ids.statement).toBeInstanceOf(StatementId);
    expect(ids.orderedSet).toBeInstanceOf(OrderedSetId);
    expect(ids.argument).toBeInstanceOf(AtomicArgumentId);

    // IDs should be unique
    expect(ids.statement.getValue()).not.toBe(ids.orderedSet.getValue());
    expect(ids.statement.getValue()).not.toBe(ids.argument.getValue());
  });
});
