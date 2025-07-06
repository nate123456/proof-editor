/**
 * Test suite for simple ID value objects
 * Tests basic ID types with string validation and generation
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../result.js';
import {
  AtomicArgumentId,
  DocumentId,
  NodeId,
  OrderedSetId,
  PackageId,
  StatementId,
  TreeId,
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

describe('Simple ID Value Objects', () => {
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

      it('should generate unique IDs', () => {
        const id1 = OrderedSetId.generate();
        const id2 = OrderedSetId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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

      it('should generate unique IDs', () => {
        const id1 = AtomicArgumentId.generate();
        const id2 = AtomicArgumentId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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

      it('should generate unique IDs', () => {
        const id1 = NodeId.generate();
        const id2 = NodeId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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

      it('should generate unique IDs', () => {
        const id1 = TreeId.generate();
        const id2 = TreeId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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

      it('should generate unique IDs', () => {
        const id1 = DocumentId.generate();
        const id2 = DocumentId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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

      it('should generate unique IDs', () => {
        const id1 = PackageId.generate();
        const id2 = PackageId.generate();

        expect(id1.equals(id2)).toBe(false);
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
});
