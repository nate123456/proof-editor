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
  fc.string({ minLength: 10001 })
);

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
          // @ts-expect-error Testing invalid input
          const nullResult = IdClass.create(null);
          expect(nullResult.isErr()).toBe(true);

          // @ts-expect-error Testing invalid input
          const undefinedResult = IdClass.create(undefined);
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

          expect(id1.equals(id2)).toBe(true);
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
      // @ts-expect-error Testing invalid input
      const nullResult = StatementContent.create(null);
      expect(nullResult.isErr()).toBe(true);

      // @ts-expect-error Testing invalid input
      const undefinedResult = StatementContent.create(undefined);
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
      const v1 = Version.create(5).value!;
      const v2 = Version.create(10).value!;
      const v3 = Version.create(5).value!;

      expect(v2.isAfter(v1)).toBe(true);
      expect(v1.isBefore(v2)).toBe(true);
      expect(v1.isAfter(v3)).toBe(false);
      expect(v1.isBefore(v3)).toBe(false);
    });
  });

  describe('version ordering properties', () => {
    it('should maintain ordering invariants', () => {
      fc.assert(
        fc.property(fc.nat(), fc.nat(), (a, b) => {
          const vA = Version.create(a).value!;
          const vB = Version.create(b).value!;

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
  });

  describe('temporal operations', () => {
    it('should compare timestamps correctly', () => {
      const early = Timestamp.create(1000).value!;
      const late = Timestamp.create(2000).value!;

      expect(late.isAfter(early)).toBe(true);
      expect(early.isBefore(late)).toBe(true);
      expect(early.isAfter(early)).toBe(false);
      expect(early.isBefore(early)).toBe(false);
    });

    it('should convert to Date consistently', () => {
      fc.assert(
        fc.property(fc.nat(), timestamp => {
          const ts = Timestamp.create(timestamp).value!;
          const date = ts.toDate();
          const roundTrip = Timestamp.fromDate(date);

          expect(roundTrip.getValue()).toBe(timestamp);
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
      const pos = Position2D.create(10, 20).value!;
      const moved = pos.moveBy(5, -3).value!;

      expect(moved.getX()).toBe(15);
      expect(moved.getY()).toBe(17);
    });

    it('should calculate distance correctly', () => {
      const p1 = Position2D.create(0, 0).value!;
      const p2 = Position2D.create(3, 4).value!;

      expect(p1.distanceTo(p2)).toBe(5); // 3-4-5 triangle
      expect(p2.distanceTo(p1)).toBe(5); // Distance is symmetric
    });

    it('should implement equality correctly', () => {
      const p1 = Position2D.create(1.5, 2.7).value!;
      const p2 = Position2D.create(1.5, 2.7).value!;
      const p3 = Position2D.create(1.5, 2.8).value!;

      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
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
            const p1 = Position2D.create(x1, y1).value!;
            const p2 = Position2D.create(x2, y2).value!;

            const distance = p1.distanceTo(p2);

            // Distance is non-negative
            expect(distance).toBeGreaterThanOrEqual(0);

            // Distance is symmetric
            expect(p2.distanceTo(p1)).toBeCloseTo(distance);

            // Distance to self is zero
            expect(p1.distanceTo(p1)).toBe(0);
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
      const attachment1 = Attachment.create(parentId, 0).value!;
      const attachment2 = Attachment.create(parentId, 0).value!;
      const attachment3 = Attachment.create(parentId, 1).value!;

      expect(attachment1.equals(attachment2)).toBe(true);
      expect(attachment1.equals(attachment3)).toBe(false);
    });

    it('should provide readable string representation', () => {
      const parentId = NodeId.fromString('test-parent');

      const simple = Attachment.create(parentId, 0).value!;
      expect(simple.toString()).toContain('parent=test-parent');
      expect(simple.toString()).toContain('position=0');

      const withFrom = Attachment.create(parentId, 1, 2).value!;
      expect(withFrom.toString()).toContain('from=2');
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
      const negativeSpacing = PhysicalProperties.create('bottom-up', -10, 40);
      expect(negativeSpacing.isErr()).toBe(true);

      const infiniteSpacing = PhysicalProperties.create('bottom-up', Infinity, 40);
      expect(infiniteSpacing.isErr()).toBe(true);
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

      const withNewStyle = original.withLayoutStyle('top-down').value!;
      expect(withNewStyle.getLayoutStyle()).toBe('top-down');
      expect(original.getLayoutStyle()).toBe('bottom-up'); // Original unchanged

      const withNewSpacing = original.withSpacing(100, 80).value!;
      expect(withNewSpacing.getSpacingX()).toBe(100);
      expect(withNewSpacing.getSpacingY()).toBe(80);
    });

    it('should maintain validation in updates', () => {
      const original = PhysicalProperties.default();

      const invalidUpdate = original.withSpacing(-10, 40);
      expect(invalidUpdate.isErr()).toBe(true);
    });
  });

  describe('layout analysis', () => {
    it('should detect flow directions correctly', () => {
      const bottomUp = PhysicalProperties.create('bottom-up').value!;
      expect(bottomUp.isBottomUpFlow()).toBe(true);
      expect(bottomUp.isVerticalFlow()).toBe(true);
      expect(bottomUp.isHorizontalFlow()).toBe(false);

      const leftRight = PhysicalProperties.create('left-right').value!;
      expect(leftRight.isHorizontalFlow()).toBe(true);
      expect(leftRight.isVerticalFlow()).toBe(false);
    });

    it('should provide readable string representation', () => {
      const props = PhysicalProperties.create('bottom-up', 50, 40, 100, 80).value!;
      const str = props.toString();

      expect(str).toContain('bottom-up');
      expect(str).toContain('50×40');
      expect(str).toContain('100×80');
    });
  });
});

describe('Error Handling Patterns', () => {
  it('should provide consistent error contexts', () => {
    const result = StatementId.create('');
    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.context).toBeDefined();
      expect(result.error.context?.field).toBe('value');
      expect(result.error.context?.value).toBe('');
    }
  });

  it('should maintain error information through fromString', () => {
    expect(() => StatementContent.fromString('')).toThrow(ValidationError);

    try {
      StatementContent.fromString('');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('cannot be empty');
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
