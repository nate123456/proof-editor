/**
 * Test suite for proof-related ID value objects
 * Tests proof domain specific ID types
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../result.js';
import { ProofDocumentId, ProofId, ProofTreeId } from '../value-objects/index.js';

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

describe('Proof-related ID Value Objects', () => {
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

      it('should generate unique IDs', () => {
        const id1 = ProofTreeId.generate();
        const id2 = ProofTreeId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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

      it('should generate unique IDs', () => {
        const id1 = ProofDocumentId.generate();
        const id2 = ProofDocumentId.generate();

        expect(id1.equals(id2)).toBe(false);
        expect(id1.getValue()).not.toBe(id2.getValue());
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
});
