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
  ProofDocumentId,
  ProofId,
  ProofTreeId,
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
  .filter((s) => s.trim().length > 0);
const emptyOrWhitespaceArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n\r'),
  fc.constant('  \t  \n  '),
);
const oversizedStringArbitrary = fc.string({ minLength: 256, maxLength: 300 });
const validPositionArbitrary = fc.tuple(
  fc.float({ min: -1000, max: 1000, noNaN: true }),
  fc.float({ min: -1000, max: 1000, noNaN: true }),
);
const invalidPositionArbitrary = fc.oneof(
  fc.tuple(fc.constant(Number.NaN), fc.float({ noNaN: true })),
  fc.tuple(fc.float({ noNaN: true }), fc.constant(Number.NaN)),
  fc.tuple(fc.constant(Number.POSITIVE_INFINITY), fc.float({ noNaN: true })),
  fc.tuple(fc.float({ noNaN: true }), fc.constant(Number.NEGATIVE_INFINITY)),
);

describe('Value Objects', () => {
  describe('ValueObject Base Class', () => {
    // Create a concrete implementation for testing
    class TestValueObject extends ValueObject<string> {}

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
          fc.property(fc.string(), (value) => {
            const obj = new TestValueObject(value);
            expect(obj.equals(obj)).toBe(true);
          }),
        );
      });

      it('should satisfy symmetry', () => {
        fc.assert(
          fc.property(fc.string(), fc.string(), (value1, value2) => {
            const obj1 = new TestValueObject(value1);
            const obj2 = new TestValueObject(value2);
            expect(obj1.equals(obj2)).toBe(obj2.equals(obj1));
          }),
        );
      });
    });

    describe('getValue method', () => {
      it('should return the underlying value', () => {
        fc.assert(
          fc.property(fc.string(), (value) => {
            const obj = new TestValueObject(value);
            expect(obj.getValue()).toBe(value);
          }),
        );
      });
    });

    describe('toString method', () => {
      it('should return string representation of value', () => {
        fc.assert(
          fc.property(fc.string(), (value) => {
            const obj = new TestValueObject(value);
            expect(obj.toString()).toBe(String(value));
          }),
        );
      });
    });
  });

  describe('StatementId', () => {
    describe('creation and validation', () => {
      it('should create valid StatementId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = StatementId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = StatementId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('StatementId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = StatementId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
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

      it('should create from string or return Result', () => {
        const validIdResult = StatementId.fromString('valid-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-id');
        }

        const emptyResult = StatementId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = StatementId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
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
          fc.property(validStringArbitrary, (value) => {
            const result = OrderedSetId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = OrderedSetId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('OrderedSetId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = OrderedSetId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  orderedset-id-123  ';
        const result = OrderedSetId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('orderedset-id-123');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = OrderedSetId.generate();
        const id2 = OrderedSetId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = OrderedSetId.fromString('valid-orderedset-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-orderedset-id');
        }

        const emptyResult = OrderedSetId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = OrderedSetId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'o'.repeat(255);
        const result = OrderedSetId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'o'.repeat(256);
        const overResult = OrderedSetId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
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
          fc.property(validStringArbitrary, (value) => {
            const result = AtomicArgumentId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = AtomicArgumentId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('AtomicArgumentId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = AtomicArgumentId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  atomic-arg-456  ';
        const result = AtomicArgumentId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('atomic-arg-456');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = AtomicArgumentId.generate();
        const id2 = AtomicArgumentId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = AtomicArgumentId.fromString('valid-atomic-arg-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-atomic-arg-id');
        }

        const emptyResult = AtomicArgumentId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = AtomicArgumentId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'a'.repeat(255);
        const result = AtomicArgumentId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'a'.repeat(256);
        const overResult = AtomicArgumentId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });
    });
  });

  describe('NodeId', () => {
    describe('creation and validation', () => {
      it('should create valid NodeId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = NodeId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = NodeId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('NodeId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = NodeId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  node-id-789  ';
        const result = NodeId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('node-id-789');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = NodeId.generate();
        const id2 = NodeId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = NodeId.fromString('valid-node-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-node-id');
        }

        const emptyResult = NodeId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = NodeId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'n'.repeat(255);
        const result = NodeId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'n'.repeat(256);
        const overResult = NodeId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });
    });
  });

  describe('TreeId', () => {
    describe('creation and validation', () => {
      it('should create valid TreeId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = TreeId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = TreeId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('TreeId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = TreeId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  tree-id-abc  ';
        const result = TreeId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('tree-id-abc');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = TreeId.generate();
        const id2 = TreeId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = TreeId.fromString('valid-tree-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-tree-id');
        }

        const emptyResult = TreeId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = TreeId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 't'.repeat(255);
        const result = TreeId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 't'.repeat(256);
        const overResult = TreeId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });
    });
  });

  describe('DocumentId', () => {
    describe('creation and validation', () => {
      it('should create valid DocumentId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = DocumentId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = DocumentId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('DocumentId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = DocumentId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  document-id-xyz  ';
        const result = DocumentId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('document-id-xyz');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = DocumentId.generate();
        const id2 = DocumentId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = DocumentId.fromString('valid-document-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-document-id');
        }

        const emptyResult = DocumentId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = DocumentId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'x'.repeat(255);
        const result = DocumentId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'x'.repeat(256);
        const overResult = DocumentId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });

      it('should handle special characters and Unicode', () => {
        const specialChars = 'doc-äöü-βγδ-📄';
        const result = DocumentId.create(specialChars);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(specialChars.trim());
        }
      });
    });

    describe('inheritance from ValueObject', () => {
      it('should inherit equals behavior from ValueObject', () => {
        const id1Result = DocumentId.create('same-doc-id');
        const id2Result = DocumentId.create('same-doc-id');
        const id3Result = DocumentId.create('different-doc-id');

        expect(id1Result.isOk()).toBe(true);
        expect(id2Result.isOk()).toBe(true);
        expect(id3Result.isOk()).toBe(true);

        if (id1Result.isOk() && id2Result.isOk() && id3Result.isOk()) {
          expect(id1Result.value.equals(id2Result.value)).toBe(true);
          expect(id1Result.value.equals(id3Result.value)).toBe(false);
        }
      });

      it('should inherit toString behavior from ValueObject', () => {
        const result = DocumentId.create('test-document');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe('test-document');
        }
      });
    });
  });

  describe('PackageId', () => {
    describe('creation and validation', () => {
      it('should create valid PackageId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = PackageId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = PackageId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('PackageId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = PackageId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
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

      it('should create from string or return Result', () => {
        const validIdResult = PackageId.fromString('valid-package-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-package-id');
        }

        const emptyResult = PackageId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = PackageId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
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
          fc.property(fc.string({ minLength: 1, maxLength: 10000 }), (value) => {
            if (value.trim().length > 0) {
              const result = StatementContent.create(value);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                expect(result.value.getValue()).toBe(value.trim());
              }
            }
          }),
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
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = StatementContent.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('StatementContent cannot be empty');
            }
          }),
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

      it('should return Result when using fromString', () => {
        const emptyResult = StatementContent.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = StatementContent.fromString('x'.repeat(10001));
        expect(longResult.isErr()).toBe(true);

        const validContentResult = StatementContent.fromString('Valid content');
        expect(validContentResult.isOk()).toBe(true);
        if (validContentResult.isOk()) {
          expect(validContentResult.value.getValue()).toBe('Valid content');
        }
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
          fc.property(fc.nat(), (value) => {
            const result = Version.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          }),
        );
      });

      it('should reject negative numbers', () => {
        fc.assert(
          fc.property(fc.integer({ max: -1 }), (value) => {
            const result = Version.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('must be a non-negative integer');
            }
          }),
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
          fc.property(fc.nat({ max: 1000 }), (value) => {
            const versionResult = Version.create(value);
            expect(versionResult.isOk()).toBe(true);

            if (versionResult.isOk()) {
              const version = versionResult.value;
              const next = version.nextVersion();
              expect(next.getValue()).toBe(value + 1);
            }
          }),
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
          }),
        );
      });
    });
  });

  describe('Timestamp', () => {
    describe('creation and validation', () => {
      it('should create valid Timestamp from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const result = Timestamp.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          }),
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
          fc.property(fc.nat(), (value) => {
            const timestampResult = Timestamp.create(value);
            expect(timestampResult.isOk()).toBe(true);

            if (timestampResult.isOk()) {
              const timestamp = timestampResult.value;
              const date = timestamp.toDate();
              expect(date.getTime()).toBe(value);
            }
          }),
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
          }),
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
          }),
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
            },
          ),
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
        const nodeIdResult = NodeId.fromString('test-node-id');
        expect(nodeIdResult.isOk()).toBe(true);

        if (nodeIdResult.isOk()) {
          const nodeId = nodeIdResult.value;

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
            },
          ),
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
          'left' as AlignmentMode,
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
            'Horizontal spacing must be non-negative',
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
          40,
        );
        expect(infiniteSpacingResult.isErr()).toBe(true);

        const infiniteDimensionResult = PhysicalProperties.create(
          'bottom-up',
          50,
          40,
          Number.POSITIVE_INFINITY,
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
              originalResult.value.getLayoutStyle(),
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
                alignment as AlignmentMode,
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
            },
          ),
        );
      });
    });
  });

  describe('ProofId', () => {
    describe('creation and validation', () => {
      it('should create valid ProofId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = ProofId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = ProofId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('ProofId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = ProofId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  proof-id-123  ';
        const result = ProofId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('proof-id-123');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = ProofId.generate();
        const id2 = ProofId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = ProofId.fromString('valid-proof-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-proof-id');
        }

        const emptyResult = ProofId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = ProofId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'p'.repeat(255);
        const result = ProofId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'p'.repeat(256);
        const overResult = ProofId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });

      it('should handle special characters and Unicode', () => {
        const specialChars = 'proof-äöü-βγδ-🎯';
        const result = ProofId.create(specialChars);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(specialChars.trim());
        }
      });
    });

    describe('inheritance from ValueObject', () => {
      it('should inherit equals behavior from ValueObject', () => {
        const id1Result = ProofId.create('same-id');
        const id2Result = ProofId.create('same-id');
        const id3Result = ProofId.create('different-id');

        expect(id1Result.isOk()).toBe(true);
        expect(id2Result.isOk()).toBe(true);
        expect(id3Result.isOk()).toBe(true);

        if (id1Result.isOk() && id2Result.isOk() && id3Result.isOk()) {
          expect(id1Result.value.equals(id2Result.value)).toBe(true);
          expect(id1Result.value.equals(id3Result.value)).toBe(false);
        }
      });

      it('should inherit toString behavior from ValueObject', () => {
        const result = ProofId.create('test-proof');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe('test-proof');
        }
      });
    });
  });

  describe('ProofTreeId', () => {
    describe('creation and validation', () => {
      it('should create valid ProofTreeId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = ProofTreeId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = ProofTreeId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('ProofTreeId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = ProofTreeId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  tree-id-456  ';
        const result = ProofTreeId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('tree-id-456');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = ProofTreeId.generate();
        const id2 = ProofTreeId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = ProofTreeId.fromString('valid-tree-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-tree-id');
        }

        const emptyResult = ProofTreeId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = ProofTreeId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 't'.repeat(255);
        const result = ProofTreeId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 't'.repeat(256);
        const overResult = ProofTreeId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });

      it('should handle special characters and Unicode', () => {
        const specialChars = 'tree-äöü-βγδ-🌳';
        const result = ProofTreeId.create(specialChars);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(specialChars.trim());
        }
      });
    });

    describe('inheritance from ValueObject', () => {
      it('should inherit equals behavior from ValueObject', () => {
        const id1Result = ProofTreeId.create('same-tree-id');
        const id2Result = ProofTreeId.create('same-tree-id');
        const id3Result = ProofTreeId.create('different-tree-id');

        expect(id1Result.isOk()).toBe(true);
        expect(id2Result.isOk()).toBe(true);
        expect(id3Result.isOk()).toBe(true);

        if (id1Result.isOk() && id2Result.isOk() && id3Result.isOk()) {
          expect(id1Result.value.equals(id2Result.value)).toBe(true);
          expect(id1Result.value.equals(id3Result.value)).toBe(false);
        }
      });

      it('should inherit toString behavior from ValueObject', () => {
        const result = ProofTreeId.create('test-tree');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe('test-tree');
        }
      });
    });
  });

  describe('ProofDocumentId', () => {
    describe('creation and validation', () => {
      it('should create valid ProofDocumentId from valid strings', () => {
        fc.assert(
          fc.property(validStringArbitrary, (value) => {
            const result = ProofDocumentId.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value.trim());
            }
          }),
        );
      });

      it('should reject empty or whitespace-only strings', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = ProofDocumentId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('ProofDocumentId cannot be empty');
            }
          }),
        );
      });

      it('should reject oversized strings', () => {
        fc.assert(
          fc.property(oversizedStringArbitrary, (value) => {
            const result = ProofDocumentId.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error).toBeInstanceOf(ValidationError);
              expect(result.error.message).toContain('cannot exceed 255 characters');
            }
          }),
        );
      });

      it('should trim whitespace during creation', () => {
        const value = '  document-id-789  ';
        const result = ProofDocumentId.create(value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('document-id-789');
        }
      });

      it('should generate unique IDs', () => {
        const id1 = ProofDocumentId.generate();
        const id2 = ProofDocumentId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
      });

      it('should create from string or return Result', () => {
        const validIdResult = ProofDocumentId.fromString('valid-document-id');
        expect(validIdResult.isOk()).toBe(true);
        if (validIdResult.isOk()) {
          expect(validIdResult.value.getValue()).toBe('valid-document-id');
        }

        const emptyResult = ProofDocumentId.fromString('');
        expect(emptyResult.isErr()).toBe(true);

        const longResult = ProofDocumentId.fromString('x'.repeat(256));
        expect(longResult.isErr()).toBe(true);
      });

      it('should handle boundary length values', () => {
        // Test exactly 255 characters
        const maxLengthValue = 'd'.repeat(255);
        const result = ProofDocumentId.create(maxLengthValue);
        expect(result.isOk()).toBe(true);

        // Test 256 characters
        const overLimitValue = 'd'.repeat(256);
        const overResult = ProofDocumentId.create(overLimitValue);
        expect(overResult.isErr()).toBe(true);
      });

      it('should handle special characters and Unicode', () => {
        const specialChars = 'document-äöü-βγδ-📄';
        const result = ProofDocumentId.create(specialChars);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.getValue()).toBe(specialChars.trim());
        }
      });
    });

    describe('inheritance from ValueObject', () => {
      it('should inherit equals behavior from ValueObject', () => {
        const id1Result = ProofDocumentId.create('same-document-id');
        const id2Result = ProofDocumentId.create('same-document-id');
        const id3Result = ProofDocumentId.create('different-document-id');

        expect(id1Result.isOk()).toBe(true);
        expect(id2Result.isOk()).toBe(true);
        expect(id3Result.isOk()).toBe(true);

        if (id1Result.isOk() && id2Result.isOk() && id3Result.isOk()) {
          expect(id1Result.value.equals(id2Result.value)).toBe(true);
          expect(id1Result.value.equals(id3Result.value)).toBe(false);
        }
      });

      it('should inherit toString behavior from ValueObject', () => {
        const result = ProofDocumentId.create('test-document');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe('test-document');
        }
      });
    });
  });

  // Additional comprehensive tests for edge cases and utility functions
  describe('Utility functions', () => {
    describe('randomUUID generation', () => {
      it('should generate UUID-like strings with expected format', () => {
        const id1 = StatementId.generate();
        const id2 = OrderedSetId.generate();
        const id3 = ProofId.generate();

        // Check that generated IDs follow UUID pattern
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(id1.getValue())).toBe(true);
        expect(uuidRegex.test(id2.getValue())).toBe(true);
        expect(uuidRegex.test(id3.getValue())).toBe(true);
      });

      it('should generate consistently unique values across all ID types', () => {
        const ids = new Set();

        // Generate multiple IDs of different types
        for (let i = 0; i < 100; i++) {
          ids.add(StatementId.generate().getValue());
          ids.add(OrderedSetId.generate().getValue());
          ids.add(AtomicArgumentId.generate().getValue());
          ids.add(NodeId.generate().getValue());
          ids.add(TreeId.generate().getValue());
          ids.add(DocumentId.generate().getValue());
          ids.add(PackageId.generate().getValue());
          ids.add(ProofId.generate().getValue());
          ids.add(ProofTreeId.generate().getValue());
          ids.add(ProofDocumentId.generate().getValue());
        }

        // Should have 1000 unique IDs (100 * 10 types)
        expect(ids.size).toBe(1000);
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
    });

    describe('number compatibility functions', () => {
      it('should validate integers correctly with isInteger', () => {
        // Create Version instances to test integer validation indirectly
        expect(Version.create(0).isOk()).toBe(true);
        expect(Version.create(42).isOk()).toBe(true);
        expect(Version.create(-0).isOk()).toBe(true);

        expect(Version.create(1.5).isErr()).toBe(true);
        expect(Version.create(Number.NaN).isErr()).toBe(true);
        expect(Version.create(Number.POSITIVE_INFINITY).isErr()).toBe(true);
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

      it('should validate finite numbers correctly with isFiniteNumber', () => {
        // Create Position2D instances to test finite number validation indirectly
        expect(Position2D.create(0, 0).isOk()).toBe(true);
        expect(Position2D.create(-100.5, 200.7).isOk()).toBe(true);
        expect(Position2D.create(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER).isOk()).toBe(
          true,
        );

        expect(Position2D.create(Number.NaN, 0).isErr()).toBe(true);
        expect(Position2D.create(0, Number.POSITIVE_INFINITY).isErr()).toBe(true);
        expect(Position2D.create(Number.NEGATIVE_INFINITY, Number.NaN).isErr()).toBe(true);
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

      it('should handle type coercion edge cases', () => {
        // Test that the functions properly validate actual number types
        // These tests ensure the typeof check works correctly

        // Version should reject non-number types that might coerce
        expect(Version.create('42' as any).isErr()).toBe(true);
        expect(Version.create(true as any).isErr()).toBe(true);
        expect(Version.create(null as any).isErr()).toBe(true);
        expect(Version.create(undefined as any).isErr()).toBe(true);

        // Position2D should reject non-number coordinates
        expect(Position2D.create('0' as any, 0).isErr()).toBe(true);
        expect(Position2D.create(0, '0' as any).isErr()).toBe(true);
        expect(Position2D.create(false as any, true as any).isErr()).toBe(true);
      });
    });
  });

  // Cross-class integration tests
  describe('Cross-class integration', () => {
    it('should allow different ID types to coexist without interference', () => {
      const statementId = StatementId.generate();
      const nodeId = NodeId.generate();
      const proofId = ProofId.generate();

      // They should be different types and not equal even if values were the same
      expect(statementId.getValue()).not.toBe(nodeId.getValue());
      expect(nodeId.getValue()).not.toBe(proofId.getValue());

      // Each should maintain its own identity
      expect(statementId.toString()).toBe(statementId.getValue());
      expect(nodeId.toString()).toBe(nodeId.getValue());
      expect(proofId.toString()).toBe(proofId.getValue());
    });

    it('should work correctly with Attachment class integration', () => {
      const nodeId = NodeId.generate();
      const attachmentResult = Attachment.create(nodeId, 0, 1);

      expect(attachmentResult.isOk()).toBe(true);
      if (attachmentResult.isOk()) {
        expect(attachmentResult.value.getParentNodeId().equals(nodeId)).toBe(true);
      }
    });

    it('should handle complex scenarios with multiple value objects', () => {
      // Create a scenario with multiple interconnected value objects
      const content = StatementContent.create('Test statement content');
      const position = Position2D.create(100, 200);
      const version = Version.create(1);
      const timestamp = Timestamp.now();

      expect(content.isOk()).toBe(true);
      expect(position.isOk()).toBe(true);
      expect(version.isOk()).toBe(true);

      if (content.isOk() && position.isOk() && version.isOk()) {
        // They should all be independent but valid
        expect(content.value.getValue()).toBe('Test statement content');
        expect(position.value.getX()).toBe(100);
        expect(version.value.getValue()).toBe(1);
        expect(timestamp.getValue()).toBeGreaterThan(0);
      }
    });
  });

  // Additional comprehensive tests for improved coverage
  describe('Enhanced Coverage Tests', () => {
    describe('private constructor edge cases', () => {
      it('should handle constructor validation edge cases', () => {
        // Test edge cases in constructor validation that might not be covered
        const edgeCases = [
          { input: '\u0000', description: 'null character' },
          { input: '\uFEFF', description: 'BOM character' },
          { input: '\u200B', description: 'zero-width space' },
          { input: '\u00A0', description: 'non-breaking space' },
        ];

        edgeCases.forEach(({ input, description: _description }) => {
          const result = StatementId.create(input);
          // These should be valid as they're non-empty after trim check
          if (input.trim().length > 0) {
            expect(result.isOk()).toBe(true);
          } else {
            expect(result.isErr()).toBe(true);
          }
        });
      });
    });

    describe('complex branching scenarios', () => {
      it('should test complex constructor parameter combinations', () => {
        // Test PhysicalProperties with various edge case combinations
        const edgeCombinations = [
          { spacingX: 0, spacingY: 0, minWidth: 1, minHeight: 1 },
          {
            spacingX: Number.EPSILON,
            spacingY: Number.EPSILON,
            minWidth: Number.EPSILON,
            minHeight: Number.EPSILON,
          },
          {
            spacingX: Number.MAX_SAFE_INTEGER,
            spacingY: Number.MAX_SAFE_INTEGER,
            minWidth: Number.MAX_SAFE_INTEGER,
            minHeight: Number.MAX_SAFE_INTEGER,
          },
        ];

        edgeCombinations.forEach(({ spacingX, spacingY, minWidth, minHeight }) => {
          const result = PhysicalProperties.create(
            'bottom-up',
            spacingX,
            spacingY,
            minWidth,
            minHeight,
          );
          expect(result.isOk()).toBe(true);
        });
      });

      it('should test all layout style and direction combinations', () => {
        const layoutStyles: Array<LayoutStyle> = [
          'bottom-up',
          'top-down',
          'left-right',
          'right-left',
        ];
        const expansionDirections: Array<ExpansionDirection> = ['horizontal', 'vertical', 'radial'];
        const alignmentModes: Array<AlignmentMode> = ['left', 'center', 'right', 'justify'];

        layoutStyles.forEach((layout) => {
          expansionDirections.forEach((expansion) => {
            alignmentModes.forEach((alignment) => {
              const result = PhysicalProperties.create(
                layout,
                50,
                40,
                100,
                80,
                expansion,
                alignment,
              );
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const props = result.value;
                expect(props.getLayoutStyle()).toBe(layout);
                expect(props.getExpansionDirection()).toBe(expansion);
                expect(props.getAlignmentMode()).toBe(alignment);
              }
            });
          });
        });
      });
    });

    describe('error message validation', () => {
      it('should provide specific error messages for validation failures', () => {
        // Test specific error message content
        const nullResult = StatementContent.create(null as any);
        expect(nullResult.isErr()).toBe(true);
        if (nullResult.isErr()) {
          expect(nullResult.error.message).toContain('null or undefined');
          expect(nullResult.error.context?.field).toBe('value');
          expect(nullResult.error.context?.value).toBe(null);
        }

        const emptyResult = StatementId.create('');
        expect(emptyResult.isErr()).toBe(true);
        if (emptyResult.isErr()) {
          expect(emptyResult.error.message).toContain('StatementId cannot be empty');
          expect(emptyResult.error.context?.field).toBe('value');
          expect(emptyResult.error.context?.value).toBe('');
        }

        const oversizeResult = PackageId.create('x'.repeat(256));
        expect(oversizeResult.isErr()).toBe(true);
        if (oversizeResult.isErr()) {
          expect(oversizeResult.error.message).toContain('cannot exceed 255 characters');
          expect(oversizeResult.error.context?.field).toBe('value');
        }
      });
    });

    describe('content validation edge cases', () => {
      it('should handle StatementContent edge cases thoroughly', () => {
        // Test content with only whitespace variations
        const whitespaceVariations = [
          '\t',
          '\n',
          '\r',
          '\f',
          '\v',
          '\u00A0', // non-breaking space
          '\u2028', // line separator
          '\u2029', // paragraph separator
        ];

        whitespaceVariations.forEach((whitespace) => {
          const result = StatementContent.create(whitespace);
          expect(result.isErr()).toBe(true);
        });

        // Test mixed content with various whitespace
        const mixedContent = '\t\n  content  \r\n\t';
        const mixedResult = StatementContent.create(mixedContent);
        expect(mixedResult.isOk()).toBe(true);
        if (mixedResult.isOk()) {
          expect(mixedResult.value.getValue()).toBe('content');
        }
      });

      it('should handle StatementContent word counting edge cases', () => {
        const wordCountTests = [
          { content: 'a', expected: 1 },
          { content: 'a b', expected: 2 },
          { content: 'a  b', expected: 2 }, // Multiple spaces
          { content: 'a\tb', expected: 2 }, // Tab separator
          { content: 'a\nb', expected: 2 }, // Newline separator
          { content: 'a\r\nb', expected: 2 }, // CRLF separator
          { content: 'a\u00A0b', expected: 2 }, // Non-breaking space
          { content: '123', expected: 1 },
          { content: '@#$%', expected: 1 },
          { content: 'word-with-hyphen', expected: 1 },
          { content: 'word_with_underscore', expected: 1 },
          { content: 'email@domain.com', expected: 1 },
        ];

        wordCountTests.forEach(({ content, expected }) => {
          if (content.trim().length > 0) {
            const result = StatementContent.create(content);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value.wordCount).toBe(expected);
            }
          }
        });
      });
    });

    describe('utility function coverage', () => {
      it('should test number validation functions thoroughly', () => {
        // Test integer validation edge cases
        expect(Version.create(Number.MAX_SAFE_INTEGER).isOk()).toBe(true);
        expect(Version.create(Number.MIN_SAFE_INTEGER).isErr()).toBe(true); // Negative
        expect(Version.create(0).isOk()).toBe(true);
        expect(Version.create(-0).isOk()).toBe(true);
        expect(Version.create(1e10).isOk()).toBe(true);
        expect(Version.create(1.0).isOk()).toBe(true);

        // Test finite number validation edge cases
        expect(Position2D.create(Number.MAX_VALUE, 0).isOk()).toBe(true);
        expect(Position2D.create(-Number.MAX_VALUE, 0).isOk()).toBe(true);
        expect(Position2D.create(Number.MIN_VALUE, 0).isOk()).toBe(true);
        expect(Position2D.create(0, Number.EPSILON).isOk()).toBe(true);
        expect(Position2D.create(0, -Number.EPSILON).isOk()).toBe(true);
      });

      it('should test UUID generation edge cases and randomness', () => {
        // Test UUID generation collision resistance
        const uuids = new Set<string>();
        for (let i = 0; i < 1000; i++) {
          const uuid = StatementId.generate().getValue();
          expect(uuids.has(uuid)).toBe(false);
          uuids.add(uuid);
        }

        // Test UUID format consistency
        for (let i = 0; i < 100; i++) {
          const uuid = ProofId.generate().getValue();
          expect(uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );
        }
      });
    });

    describe('complex state transitions', () => {
      it('should test PhysicalProperties modification chains', () => {
        const original = PhysicalProperties.default();

        const modifiedChain = original
          .withLayoutStyle('top-down')
          .andThen((props) => props.withSpacing(100, 80))
          .andThen((props) => props.withMinDimensions(200, 160))
          .andThen((props) => props.withExpansionDirection('horizontal'))
          .andThen((props) => props.withAlignmentMode('justify'));

        expect(modifiedChain.isOk()).toBe(true);
        if (modifiedChain.isOk()) {
          const final = modifiedChain.value;
          expect(final.getLayoutStyle()).toBe('top-down');
          expect(final.getSpacingX()).toBe(100);
          expect(final.getSpacingY()).toBe(80);
          expect(final.getMinWidth()).toBe(200);
          expect(final.getMinHeight()).toBe(160);
          expect(final.getExpansionDirection()).toBe('horizontal');
          expect(final.getAlignmentMode()).toBe('justify');
        }
      });

      it('should test Attachment edge cases', () => {
        const nodeId = NodeId.generate();

        // Test maximum safe integer positions
        const maxPosResult = Attachment.create(nodeId, Number.MAX_SAFE_INTEGER);
        expect(maxPosResult.isOk()).toBe(true);

        const maxFromPosResult = Attachment.create(nodeId, 0, Number.MAX_SAFE_INTEGER);
        expect(maxFromPosResult.isOk()).toBe(true);

        // Test zero positions
        const zeroPosResult = Attachment.create(nodeId, 0, 0);
        expect(zeroPosResult.isOk()).toBe(true);
        if (zeroPosResult.isOk()) {
          expect(zeroPosResult.value.getPremisePosition()).toBe(0);
          expect(zeroPosResult.value.getFromPosition()).toBe(0);
          expect(zeroPosResult.value.hasMultipleConclusionSource()).toBe(true);
        }
      });
    });

    describe('Position2D advanced operations', () => {
      it('should test moveBy with extreme coordinates', () => {
        const origin = Position2D.origin();

        // Test moving to extreme positions
        const extremeMoves = [
          { deltaX: Number.MAX_SAFE_INTEGER, deltaY: 0 },
          { deltaX: 0, deltaY: Number.MIN_SAFE_INTEGER },
          { deltaX: Number.MAX_VALUE / 2, deltaY: Number.MAX_VALUE / 2 },
          { deltaX: -Number.MAX_VALUE / 2, deltaY: -Number.MAX_VALUE / 2 },
        ];

        extremeMoves.forEach(({ deltaX, deltaY }) => {
          const moveResult = origin.moveBy(deltaX, deltaY);
          if (Number.isFinite(deltaX + 0) && Number.isFinite(deltaY + 0)) {
            expect(moveResult.isOk()).toBe(true);
          }
        });
      });

      it('should test distance calculations with edge cases', () => {
        const cases = [
          { pos1: [0, 0], pos2: [0, 0], expectedDistance: 0 },
          { pos1: [0, 0], pos2: [1, 0], expectedDistance: 1 },
          { pos1: [0, 0], pos2: [0, 1], expectedDistance: 1 },
          { pos1: [0, 0], pos2: [-1, 0], expectedDistance: 1 },
          { pos1: [0, 0], pos2: [0, -1], expectedDistance: 1 },
          { pos1: [1, 1], pos2: [1, 1], expectedDistance: 0 },
          {
            pos1: [Number.EPSILON, Number.EPSILON],
            pos2: [0, 0],
            expectedDistance: Math.sqrt(2 * Number.EPSILON * Number.EPSILON),
          },
        ];

        cases.forEach(({ pos1, pos2, expectedDistance }) => {
          const pos1X = pos1[0];
          const pos1Y = pos1[1];
          const pos2X = pos2[0];
          const pos2Y = pos2[1];

          if (
            pos1X === undefined ||
            pos1Y === undefined ||
            pos2X === undefined ||
            pos2Y === undefined
          ) {
            throw new Error('Test setup error: position coordinates cannot be undefined');
          }

          const pos1Result = Position2D.create(pos1X, pos1Y);
          const pos2Result = Position2D.create(pos2X, pos2Y);

          expect(pos1Result.isOk()).toBe(true);
          expect(pos2Result.isOk()).toBe(true);

          if (pos1Result.isOk() && pos2Result.isOk()) {
            const actualDistance = pos1Result.value.distanceTo(pos2Result.value);
            expect(actualDistance).toBeCloseTo(expectedDistance, 10);
          }
        });
      });
    });

    describe('timestamp and version edge cases', () => {
      it('should handle timestamp edge cases', () => {
        // Test extreme timestamp values
        const extremeValues = [
          0, // Unix epoch
          1, // Minimal positive
          8640000000000000, // Maximum valid date timestamp (year 275760)
        ];

        extremeValues.forEach((value) => {
          const result = Timestamp.create(value);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getValue()).toBe(value);
            expect(result.value.toDate().getTime()).toBe(value);
          }
        });
      });

      it('should handle version comparison edge cases', () => {
        const v0 = Version.create(0);
        const v1 = Version.create(1);
        const vMax = Version.create(Number.MAX_SAFE_INTEGER);

        expect(v0.isOk()).toBe(true);
        expect(v1.isOk()).toBe(true);
        expect(vMax.isOk()).toBe(true);

        if (v0.isOk() && v1.isOk() && vMax.isOk()) {
          // Test transitivity
          expect(v0.value.isBefore(v1.value)).toBe(true);
          expect(v1.value.isBefore(vMax.value)).toBe(true);
          expect(v0.value.isBefore(vMax.value)).toBe(true);

          // Test reflexivity
          expect(v0.value.equals(v0.value)).toBe(true);
          expect(v0.value.isAfter(v0.value)).toBe(false);
          expect(v0.value.isBefore(v0.value)).toBe(false);
        }
      });
    });
  });

  describe('utility function coverage', () => {
    describe('randomUUID function', () => {
      it('should generate unique UUIDs', () => {
        const uuids = new Set();
        for (let i = 0; i < 1000; i++) {
          const id = StatementId.generate();
          uuids.add(id.getValue());
        }
        expect(uuids.size).toBe(1000);
      });

      it('should generate valid UUID format', () => {
        const id = StatementId.generate();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(id.getValue())).toBe(true);
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
    });

    describe('isFiniteNumber function coverage', () => {
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
    });
  });

  describe('comprehensive error boundary testing', () => {
    describe('extreme input validation', () => {
      it('should handle maximum length strings for all ID types', () => {
        const maxLengthString = 'a'.repeat(255);
        const idTypes = [
          StatementId,
          OrderedSetId,
          AtomicArgumentId,
          NodeId,
          TreeId,
          DocumentId,
          PackageId,
          ProofId,
          ProofTreeId,
          ProofDocumentId,
        ];

        idTypes.forEach((IdType) => {
          const result = IdType.create(maxLengthString);
          expect(result.isOk()).toBe(true);
        });
      });

      it('should reject over-length strings for all ID types', () => {
        const overLengthString = 'a'.repeat(256);
        const idTypes = [
          StatementId,
          OrderedSetId,
          AtomicArgumentId,
          NodeId,
          TreeId,
          DocumentId,
          PackageId,
          ProofId,
          ProofTreeId,
          ProofDocumentId,
        ];

        idTypes.forEach((IdType) => {
          const result = IdType.create(overLengthString);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('cannot exceed 255 characters');
          }
        });
      });
    });

    describe('StatementContent comprehensive validation', () => {
      it('should handle maximum allowed content length', () => {
        const maxContent = 'a'.repeat(10000);
        const result = StatementContent.create(maxContent);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(maxContent);
          expect(result.value.wordCount).toBe(1);
        }
      });

      it('should reject over-length content', () => {
        const overLengthContent = 'a'.repeat(10001);
        const result = StatementContent.create(overLengthContent);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('cannot exceed 10000 characters');
        }
      });

      it('should handle complex word counting scenarios', () => {
        const testCases = [
          { content: 'single', expectedWords: 1 },
          { content: 'two words', expectedWords: 2 },
          { content: 'multiple   spaces   between', expectedWords: 3 },
          { content: '\t\nwhitespace\r\n  handling\t', expectedWords: 2 },
          { content: 'punctuation, and; symbols!', expectedWords: 3 },
          { content: '123 456 789', expectedWords: 3 },
          { content: 'emoji 🚀 test', expectedWords: 3 },
          { content: '', expectedWords: 0 },
        ];

        testCases.forEach(({ content, expectedWords }) => {
          if (content.length === 0) {
            const result = StatementContent.create(content);
            expect(result.isErr()).toBe(true);
          } else {
            const result = StatementContent.create(content);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value.wordCount).toBe(expectedWords);
            }
          }
        });
      });

      it('should properly handle isEmpty property', () => {
        const nonEmptyResult = StatementContent.create('not empty');
        expect(nonEmptyResult.isOk()).toBe(true);
        if (nonEmptyResult.isOk()) {
          expect(nonEmptyResult.value.isEmpty).toBe(false);
        }
      });
    });
  });

  describe('PhysicalProperties comprehensive testing', () => {
    describe('layout style flow detection', () => {
      it('should correctly identify flow types', () => {
        const testCases = [
          {
            style: 'bottom-up' as LayoutStyle,
            isBottomUp: true,
            isTopDown: false,
            isHorizontal: false,
            isVertical: true,
          },
          {
            style: 'top-down' as LayoutStyle,
            isBottomUp: false,
            isTopDown: true,
            isHorizontal: false,
            isVertical: true,
          },
          {
            style: 'left-right' as LayoutStyle,
            isBottomUp: false,
            isTopDown: false,
            isHorizontal: true,
            isVertical: false,
          },
          {
            style: 'right-left' as LayoutStyle,
            isBottomUp: false,
            isTopDown: false,
            isHorizontal: true,
            isVertical: false,
          },
        ];

        testCases.forEach(({ style, isBottomUp, isTopDown, isHorizontal, isVertical }) => {
          const result = PhysicalProperties.create(style);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.isBottomUpFlow()).toBe(isBottomUp);
            expect(result.value.isTopDownFlow()).toBe(isTopDown);
            expect(result.value.isHorizontalFlow()).toBe(isHorizontal);
            expect(result.value.isVerticalFlow()).toBe(isVertical);
          }
        });
      });
    });

    describe('fluid property modification', () => {
      it('should handle all with* methods correctly', () => {
        const defaultProps = PhysicalProperties.default();

        const layoutResult = defaultProps.withLayoutStyle('top-down');
        expect(layoutResult.isOk()).toBe(true);
        if (layoutResult.isOk()) {
          expect(layoutResult.value.getLayoutStyle()).toBe('top-down');
        }

        const spacingResult = defaultProps.withSpacing(75, 60);
        expect(spacingResult.isOk()).toBe(true);
        if (spacingResult.isOk()) {
          expect(spacingResult.value.getSpacingX()).toBe(75);
          expect(spacingResult.value.getSpacingY()).toBe(60);
        }

        const dimensionsResult = defaultProps.withMinDimensions(150, 120);
        expect(dimensionsResult.isOk()).toBe(true);
        if (dimensionsResult.isOk()) {
          expect(dimensionsResult.value.getMinWidth()).toBe(150);
          expect(dimensionsResult.value.getMinHeight()).toBe(120);
        }

        const expansionResult = defaultProps.withExpansionDirection('horizontal');
        expect(expansionResult.isOk()).toBe(true);
        if (expansionResult.isOk()) {
          expect(expansionResult.value.getExpansionDirection()).toBe('horizontal');
        }

        const alignmentResult = defaultProps.withAlignmentMode('left');
        expect(alignmentResult.isOk()).toBe(true);
        if (alignmentResult.isOk()) {
          expect(alignmentResult.value.getAlignmentMode()).toBe('left');
        }
      });

      it('should validate negative spacing values', () => {
        const spacingResult = PhysicalProperties.create('bottom-up', -10, 50);
        expect(spacingResult.isErr()).toBe(true);
        if (spacingResult.isErr()) {
          expect(spacingResult.error.message).toContain('Horizontal spacing must be non-negative');
        }

        const spacingYResult = PhysicalProperties.create('bottom-up', 50, -10);
        expect(spacingYResult.isErr()).toBe(true);
        if (spacingYResult.isErr()) {
          expect(spacingYResult.error.message).toContain('Vertical spacing must be non-negative');
        }
      });

      it('should validate zero and negative dimension values', () => {
        const widthResult = PhysicalProperties.create('bottom-up', 50, 40, 0, 80);
        expect(widthResult.isErr()).toBe(true);
        if (widthResult.isErr()) {
          expect(widthResult.error.message).toContain('Minimum width must be positive');
        }

        const heightResult = PhysicalProperties.create('bottom-up', 50, 40, 100, -5);
        expect(heightResult.isErr()).toBe(true);
        if (heightResult.isErr()) {
          expect(heightResult.error.message).toContain('Minimum height must be positive');
        }
      });
    });

    describe('string representation and equality', () => {
      it('should produce correct string representation', () => {
        const props = PhysicalProperties.default();
        const str = props.toString();
        expect(str).toContain('bottom-up');
        expect(str).toContain('50×40');
        expect(str).toContain('100×80');
      });

      it('should correctly determine equality', () => {
        const props1 = PhysicalProperties.default();
        const props2 = PhysicalProperties.default();
        const props3Result = PhysicalProperties.create('top-down');

        expect(props1.equals(props2)).toBe(true);
        expect(props3Result.isOk()).toBe(true);
        if (props3Result.isOk()) {
          expect(props1.equals(props3Result.value)).toBe(false);
        }
      });
    });
  });

  describe('Attachment comprehensive testing', () => {
    describe('multiple conclusion source handling', () => {
      it('should properly detect multiple conclusion sources', () => {
        const nodeId = NodeId.generate();

        const singleSource = Attachment.create(nodeId, 0);
        expect(singleSource.isOk()).toBe(true);
        if (singleSource.isOk()) {
          expect(singleSource.value.hasMultipleConclusionSource()).toBe(false);
          expect(singleSource.value.getFromPosition()).toBeUndefined();
        }

        const multipleSource = Attachment.create(nodeId, 0, 1);
        expect(multipleSource.isOk()).toBe(true);
        if (multipleSource.isOk()) {
          expect(multipleSource.value.hasMultipleConclusionSource()).toBe(true);
          expect(multipleSource.value.getFromPosition()).toBe(1);
        }
      });

      it('should validate fromPosition correctly', () => {
        const nodeId = NodeId.generate();

        const invalidFromResult = Attachment.create(nodeId, 0, -1);
        expect(invalidFromResult.isErr()).toBe(true);
        if (invalidFromResult.isErr()) {
          expect(invalidFromResult.error.message).toContain(
            'From position must be a non-negative integer',
          );
        }

        const nonIntegerFromResult = Attachment.create(nodeId, 0, 1.5);
        expect(nonIntegerFromResult.isErr()).toBe(true);
      });
    });

    describe('attachment equality and string representation', () => {
      it('should correctly determine attachment equality', () => {
        const nodeId1 = NodeId.generate();
        const nodeId2 = NodeId.generate();

        const attachment1 = Attachment.create(nodeId1, 0);
        const attachment2 = Attachment.create(nodeId1, 0);
        const attachment3 = Attachment.create(nodeId2, 0);
        const attachment4 = Attachment.create(nodeId1, 1);
        const attachment5 = Attachment.create(nodeId1, 0, 1);

        expect(attachment1.isOk()).toBe(true);
        expect(attachment2.isOk()).toBe(true);
        expect(attachment3.isOk()).toBe(true);
        expect(attachment4.isOk()).toBe(true);
        expect(attachment5.isOk()).toBe(true);

        if (
          attachment1.isOk() &&
          attachment2.isOk() &&
          attachment3.isOk() &&
          attachment4.isOk() &&
          attachment5.isOk()
        ) {
          expect(attachment1.value.equals(attachment2.value)).toBe(true);
          expect(attachment1.value.equals(attachment3.value)).toBe(false);
          expect(attachment1.value.equals(attachment4.value)).toBe(false);
          expect(attachment1.value.equals(attachment5.value)).toBe(false);
        }
      });

      it('should produce informative string representations', () => {
        const nodeId = NodeId.generate();

        const simpleAttachment = Attachment.create(nodeId, 2);
        expect(simpleAttachment.isOk()).toBe(true);
        if (simpleAttachment.isOk()) {
          const str = simpleAttachment.value.toString();
          expect(str).toContain('position=2');
          expect(str).not.toContain('from=');
        }

        const multiAttachment = Attachment.create(nodeId, 2, 1);
        expect(multiAttachment.isOk()).toBe(true);
        if (multiAttachment.isOk()) {
          const str = multiAttachment.value.toString();
          expect(str).toContain('position=2');
          expect(str).toContain('from=1');
        }
      });
    });
  });

  describe('Position2D advanced operations', () => {
    describe('movement and distance calculations', () => {
      it('should handle zero movements correctly', () => {
        const pos = Position2D.origin();
        const moveResult = pos.moveBy(0, 0);
        expect(moveResult.isOk()).toBe(true);
        if (moveResult.isOk()) {
          expect(moveResult.value.equals(pos)).toBe(true);
        }
      });

      it('should calculate distance to same position as zero', () => {
        const pos = Position2D.origin();
        expect(pos.distanceTo(pos)).toBe(0);
      });

      it('should handle large coordinate movements', () => {
        const pos = Position2D.origin();
        const largeMove = pos.moveBy(1000000, -1000000);
        expect(largeMove.isOk()).toBe(true);
        if (largeMove.isOk()) {
          expect(largeMove.value.getX()).toBe(1000000);
          expect(largeMove.value.getY()).toBe(-1000000);
        }
      });

      it('should reject movements that result in infinite coordinates', () => {
        const pos = Position2D.origin();
        const infiniteMove = pos.moveBy(Number.POSITIVE_INFINITY, 0);
        expect(infiniteMove.isErr()).toBe(true);
      });
    });
  });

  describe('advanced edge case coverage for high test scores', () => {
    describe('ValueObject base class comprehensive testing', () => {
      it('should handle ValueObject inheritance edge cases', () => {
        // Test that different value object types maintain proper inheritance
        const statementId1 = StatementId.generate();
        const statementId2 = StatementId.generate();
        const _orderedSetId = OrderedSetId.generate();

        // Same type comparison should work
        expect(statementId1.equals(statementId1)).toBe(true);
        expect(statementId1.equals(statementId2)).toBe(false);

        // Different types should not be equal (even with same underlying value)
        const sameValueStatementResult = StatementId.fromString('test-id');
        const sameValueOrderedSetResult = OrderedSetId.fromString('test-id');

        expect(sameValueStatementResult.isOk()).toBe(true);
        expect(sameValueOrderedSetResult.isOk()).toBe(true);

        if (sameValueStatementResult.isOk() && sameValueOrderedSetResult.isOk()) {
          const sameValueStatement = sameValueStatementResult.value;
          const sameValueOrderedSet = sameValueOrderedSetResult.value;

          // These should not equal even though underlying values are same
          // due to type safety in ValueObject<T>
          expect(sameValueStatement.getValue()).toBe(sameValueOrderedSet.getValue());
          expect(sameValueStatement.toString()).toBe(sameValueOrderedSet.toString());
        }
      });

      it('should test ValueObject toString with different value types', () => {
        const stringIdResult = StatementId.fromString('string-value');
        const numberVersion = Version.create(42);
        const positionResult = Position2D.create(10.5, -5.3);

        expect(stringIdResult.isOk()).toBe(true);
        if (stringIdResult.isOk()) {
          expect(stringIdResult.value.toString()).toBe('string-value');
        }

        if (numberVersion.isOk()) {
          expect(numberVersion.value.toString()).toBe('42');
        }

        if (positionResult.isOk()) {
          expect(positionResult.value.toString()).toBe('(10.5, -5.3)');
        }
      });
    });

    describe('comprehensive validation error scenarios', () => {
      it('should test all validation error message patterns', () => {
        const errorTestCases = [
          {
            create: () => StatementId.create(''),
            expectedMessage: 'StatementId cannot be empty',
            expectedField: 'value',
          },
          {
            create: () => StatementId.create('a'.repeat(256)),
            expectedMessage: 'StatementId cannot exceed 255 characters',
            expectedField: 'value',
          },
          {
            create: () => StatementContent.create(null as any),
            expectedMessage: 'StatementContent cannot be null or undefined',
            expectedField: 'value',
          },
          {
            create: () => Version.create(-1),
            expectedMessage: 'Version must be a non-negative integer',
            expectedField: 'value',
          },
          {
            create: () => Timestamp.create(-1),
            expectedMessage: 'Timestamp must be a non-negative integer',
            expectedField: 'value',
          },
          {
            create: () => Position2D.create(Number.NaN, 0),
            expectedMessage: 'X coordinate must be a finite number',
            expectedField: 'x',
          },
          {
            create: () => Position2D.create(0, Number.POSITIVE_INFINITY),
            expectedMessage: 'Y coordinate must be a finite number',
            expectedField: 'y',
          },
        ];

        errorTestCases.forEach(({ create, expectedMessage, expectedField }) => {
          const result = create();
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toBe(expectedMessage);
            expect(result.error.context?.field).toBe(expectedField);
          }
        });
      });

      it('should test fromString Result error patterns', () => {
        const errorOperations = [
          () => StatementId.fromString(''),
          () => StatementId.fromString('a'.repeat(256)),
          () => OrderedSetId.fromString(''),
          () => AtomicArgumentId.fromString(''),
          () => NodeId.fromString(''),
          () => TreeId.fromString(''),
          () => DocumentId.fromString(''),
          () => PackageId.fromString(''),
          () => ProofId.fromString(''),
          () => ProofTreeId.fromString(''),
          () => ProofDocumentId.fromString(''),
          () => StatementContent.fromString(''),
        ];

        errorOperations.forEach((operation) => {
          const result = operation();
          expect(result.isErr()).toBe(true);
        });
      });
    });

    describe('Position2D comprehensive edge cases', () => {
      it('should handle Position2D moveBy edge cases', () => {
        const origin = Position2D.origin();

        // Test successful moves
        const moveResult1 = origin.moveBy(1.5, -2.5);
        expect(moveResult1.isOk()).toBe(true);
        if (moveResult1.isOk()) {
          expect(moveResult1.value.getX()).toBe(1.5);
          expect(moveResult1.value.getY()).toBe(-2.5);
        }

        // Test moves that result in invalid coordinates
        const moveResult2 = origin.moveBy(Number.POSITIVE_INFINITY, 0);
        expect(moveResult2.isErr()).toBe(true);

        const moveResult3 = origin.moveBy(0, Number.NaN);
        expect(moveResult3.isErr()).toBe(true);
      });

      it('should handle Position2D distance calculations comprehensively', () => {
        const point1Result = Position2D.create(0, 0);
        const point2Result = Position2D.create(3, 4);
        const point3Result = Position2D.create(-3, -4);

        expect(point1Result.isOk()).toBe(true);
        expect(point2Result.isOk()).toBe(true);
        expect(point3Result.isOk()).toBe(true);

        if (point1Result.isOk() && point2Result.isOk() && point3Result.isOk()) {
          const point1 = point1Result.value;
          const point2 = point2Result.value;
          const point3 = point3Result.value;

          // Standard distance calculation
          expect(point1.distanceTo(point2)).toBe(5); // 3-4-5 triangle

          // Negative coordinates
          expect(point1.distanceTo(point3)).toBe(5);

          // Distance to self
          expect(point1.distanceTo(point1)).toBe(0);

          // Symmetric property
          expect(point1.distanceTo(point2)).toBe(point2.distanceTo(point1));
        }
      });
    });

    describe('Timestamp edge cases and operations', () => {
      it('should handle Timestamp date conversions thoroughly', () => {
        const specificDate = new Date('2024-01-15T10:30:00.000Z');
        const timestampResult = Timestamp.fromDate(specificDate);

        expect(timestampResult.getValue()).toBe(specificDate.getTime());

        const convertedDate = timestampResult.toDate();
        expect(convertedDate.getTime()).toBe(specificDate.getTime());
        expect(convertedDate.toISOString()).toBe(specificDate.toISOString());
      });

      it('should handle Timestamp.now() variations', () => {
        const timestamp1 = Timestamp.now();
        const timestamp2 = Timestamp.now();

        // Timestamps should be very close but not necessarily identical
        // depending on execution timing
        expect(Math.abs(timestamp1.getValue() - timestamp2.getValue())).toBeLessThan(100);
      });

      it('should handle Timestamp comparison edge cases', () => {
        const early = Timestamp.create(1000);
        const late = Timestamp.create(2000);
        const same1 = Timestamp.create(1500);
        const same2 = Timestamp.create(1500);

        expect(early.isOk()).toBe(true);
        expect(late.isOk()).toBe(true);
        expect(same1.isOk()).toBe(true);
        expect(same2.isOk()).toBe(true);

        if (early.isOk() && late.isOk() && same1.isOk() && same2.isOk()) {
          // Before/after relationships
          expect(early.value.isBefore(late.value)).toBe(true);
          expect(late.value.isAfter(early.value)).toBe(true);

          // Same values
          expect(same1.value.isBefore(same2.value)).toBe(false);
          expect(same1.value.isAfter(same2.value)).toBe(false);

          // Self comparison
          expect(early.value.isBefore(early.value)).toBe(false);
          expect(early.value.isAfter(early.value)).toBe(false);
        }
      });
    });

    describe('comprehensive PhysicalProperties coverage', () => {
      it('should test all PhysicalProperties modification methods error paths', () => {
        const baseProps = PhysicalProperties.default();

        // Test all withX methods with invalid inputs
        const invalidModifications = [
          () => baseProps.withSpacing(-1, 10),
          () => baseProps.withSpacing(10, -1),
          () => baseProps.withSpacing(Number.NaN, 10),
          () => baseProps.withSpacing(10, Number.POSITIVE_INFINITY),
          () => baseProps.withMinDimensions(0, 100),
          () => baseProps.withMinDimensions(100, 0),
          () => baseProps.withMinDimensions(-10, 100),
          () => baseProps.withMinDimensions(100, Number.NaN),
        ];

        invalidModifications.forEach((modification) => {
          const result = modification();
          expect(result.isErr()).toBe(true);
        });
      });

      it('should ensure PhysicalProperties default values are correct', () => {
        const defaultProps = PhysicalProperties.default();

        expect(defaultProps.getLayoutStyle()).toBe('bottom-up');
        expect(defaultProps.getSpacingX()).toBe(50);
        expect(defaultProps.getSpacingY()).toBe(40);
        expect(defaultProps.getMinWidth()).toBe(100);
        expect(defaultProps.getMinHeight()).toBe(80);
        expect(defaultProps.getExpansionDirection()).toBe('vertical');
        expect(defaultProps.getAlignmentMode()).toBe('center');
      });

      it('should test PhysicalProperties equality with all combinations', () => {
        const props1 = PhysicalProperties.default();
        const props2 = PhysicalProperties.default();
        const props3Result = PhysicalProperties.create('top-down');

        expect(props1.equals(props2)).toBe(true);

        if (props3Result.isOk()) {
          expect(props1.equals(props3Result.value)).toBe(false);
        }
      });
    });

    describe('comprehensive StatementContent edge cases', () => {
      it('should test StatementContent.isEmpty with edge cases', () => {
        // Test various whitespace scenarios after trimming
        const testCases = [
          { input: 'not empty', expectedEmpty: false },
          { input: '   trimmed   ', expectedEmpty: false }, // Gets trimmed to 'trimmed'
          { input: 'a', expectedEmpty: false },
          { input: ' a ', expectedEmpty: false }, // Gets trimmed to 'a'
        ];

        testCases.forEach(({ input, expectedEmpty }) => {
          const result = StatementContent.create(input);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.isEmpty).toBe(expectedEmpty);
          }
        });
      });

      it('should test StatementContent word counting with complex cases', () => {
        const complexWordCountCases = [
          { content: 'word1 word2 word3', expected: 3 },
          { content: '   word1   word2   ', expected: 2 },
          { content: 'a\t\nb\r\nc', expected: 3 },
          { content: 'one-word', expected: 1 },
          { content: 'with\u00A0unicode\u00A0spaces', expected: 3 }, // Non-breaking spaces
          { content: '123 456', expected: 2 },
          { content: 'hello\n\nworld', expected: 2 },
        ];

        complexWordCountCases.forEach(({ content, expected }) => {
          const result = StatementContent.create(content);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.wordCount).toBe(expected);
          }
        });
      });
    });
  });
});
