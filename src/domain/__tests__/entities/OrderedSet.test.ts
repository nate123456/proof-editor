import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderedSet } from '../../entities/OrderedSet';
import { ValidationError } from '../../shared/result';
import type { AtomicArgumentId, StatementId } from '../../shared/value-objects';
import { atomicArgumentIdFactory, orderedSetIdFactory, statementIdFactory } from '../factories';

describe('OrderedSet Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('OrderedSet Creation', () => {
    describe('valid creation cases', () => {
      it('should create an empty ordered set', () => {
        const result = OrderedSet.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          expect(orderedSet.getStatementIds()).toEqual([]);
          expect(orderedSet.size()).toBe(0);
          expect(orderedSet.isEmpty()).toBe(true);
          expect(orderedSet.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(orderedSet.getModifiedAt()).toBe(FIXED_TIMESTAMP);
        }
      });

      it('should create an ordered set with statement IDs', () => {
        const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
        const result = OrderedSet.create(statementIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          expect(orderedSet.getStatementIds()).toEqual(statementIds);
          expect(orderedSet.size()).toBe(2);
          expect(orderedSet.isEmpty()).toBe(false);
          expect(statementIds.length).toBeGreaterThanOrEqual(2);
          if (statementIds[0] && statementIds[1]) {
            expect(orderedSet.containsStatement(statementIds[0])).toBe(true);
            expect(orderedSet.containsStatement(statementIds[1])).toBe(true);
          }
        }
      });

      it('should create ordered set from statements using createFromStatements', () => {
        const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
        const result = OrderedSet.createFromStatements(statementIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          expect(orderedSet.getStatementIds()).toEqual(statementIds);
          expect(orderedSet.size()).toBe(2);
        }
      });

      it('should remove duplicates while preserving order', () => {
        const statementId1 = statementIdFactory.build();
        const statementId2 = statementIdFactory.build();
        const statementIds = [statementId1, statementId2, statementId1]; // Duplicate

        const result = OrderedSet.create(statementIds);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          expect(orderedSet.size()).toBe(2);
          expect(orderedSet.getStatementIds()).toEqual([statementId1, statementId2]);
        }
      });
    });
  });

  describe('OrderedSet Reconstruction', () => {
    it('should reconstruct an ordered set with all parameters', () => {
      const id = orderedSetIdFactory.build();
      const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
      const referencedBy = {
        asPremise: [atomicArgumentIdFactory.build()],
        asConclusion: [atomicArgumentIdFactory.build()],
      };
      const createdAt = 1000000;
      const modifiedAt = 2000000;

      const result = OrderedSet.reconstruct(id, statementIds, createdAt, modifiedAt, referencedBy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        expect(orderedSet.getId()).toEqual(id);
        expect(orderedSet.getStatementIds()).toEqual(statementIds);
        expect(orderedSet.getReferencedByAsPremise()).toEqual(referencedBy.asPremise);
        expect(orderedSet.getReferencedByAsConclusion()).toEqual(referencedBy.asConclusion);
        expect(orderedSet.getCreatedAt()).toBe(createdAt);
        expect(orderedSet.getModifiedAt()).toBe(modifiedAt);
      }
    });
  });

  describe('Statement Management', () => {
    let orderedSet: OrderedSet;
    let statementId1: StatementId;
    let statementId2: StatementId;
    let statementId3: StatementId;

    beforeEach(() => {
      const result = OrderedSet.create();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        orderedSet = result.value;
      }
      statementId1 = statementIdFactory.build();
      statementId2 = statementIdFactory.build();
      statementId3 = statementIdFactory.build();
    });

    describe('addStatement', () => {
      it('should add a statement to the end', () => {
        const laterTimestamp = FIXED_TIMESTAMP + 1000;
        mockDateNow.mockReturnValueOnce(laterTimestamp);

        const result = orderedSet.addStatement(statementId1);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.containsStatement(statementId1)).toBe(true);
        expect(orderedSet.size()).toBe(1);
        expect(orderedSet.getStatementIds()).toEqual([statementId1]);
        expect(orderedSet.getModifiedAt()).toBe(laterTimestamp);
      });

      it('should not add duplicate statements', () => {
        orderedSet.addStatement(statementId1);
        const result = orderedSet.addStatement(statementId1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Statement already exists');
        }
        expect(orderedSet.size()).toBe(1);
      });

      it('should maintain order when adding multiple statements', () => {
        orderedSet.addStatement(statementId1);
        orderedSet.addStatement(statementId2);
        orderedSet.addStatement(statementId3);

        expect(orderedSet.getStatementIds()).toEqual([statementId1, statementId2, statementId3]);
        expect(orderedSet.size()).toBe(3);
      });
    });

    describe('removeStatement', () => {
      beforeEach(() => {
        orderedSet.addStatement(statementId1);
        orderedSet.addStatement(statementId2);
        orderedSet.addStatement(statementId3);
      });

      it('should remove an existing statement', () => {
        const result = orderedSet.removeStatement(statementId2);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.containsStatement(statementId2)).toBe(false);
        expect(orderedSet.size()).toBe(2);
        expect(orderedSet.getStatementIds()).toEqual([statementId1, statementId3]);
      });

      it('should fail to remove non-existent statement', () => {
        const nonExistentId = statementIdFactory.build();
        const result = orderedSet.removeStatement(nonExistentId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Statement not found');
        }
        expect(orderedSet.size()).toBe(3);
      });

      it('should become empty when all statements removed', () => {
        orderedSet.removeStatement(statementId1);
        orderedSet.removeStatement(statementId2);
        orderedSet.removeStatement(statementId3);

        expect(orderedSet.isEmpty()).toBe(true);
        expect(orderedSet.size()).toBe(0);
      });
    });

    describe('insertStatementAt', () => {
      beforeEach(() => {
        orderedSet.addStatement(statementId1);
        orderedSet.addStatement(statementId3);
      });

      it('should insert statement at specified position', () => {
        const result = orderedSet.insertStatementAt(statementId2, 1);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()).toEqual([statementId1, statementId2, statementId3]);
        expect(orderedSet.size()).toBe(3);
      });

      it('should insert at beginning when position is 0', () => {
        const newStatementId = statementIdFactory.build();
        const result = orderedSet.insertStatementAt(newStatementId, 0);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()[0]).toEqual(newStatementId);
      });

      it('should reject invalid positions', () => {
        const result = orderedSet.insertStatementAt(statementId2, 10);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('position');
        }
      });

      it('should not insert duplicate statements', () => {
        orderedSet.addStatement(statementId1);
        const result = orderedSet.insertStatementAt(statementId1, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Statement already exists');
        }
      });

      it('should reject negative positions', () => {
        const result = orderedSet.insertStatementAt(statementId2, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('position');
        }
      });
    });

    describe('moveStatement', () => {
      beforeEach(() => {
        orderedSet.addStatement(statementId1);
        orderedSet.addStatement(statementId2);
        orderedSet.addStatement(statementId3);
      });

      it('should move statement to new position', () => {
        const result = orderedSet.moveStatement(statementId1, 2);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()).toEqual([statementId2, statementId3, statementId1]);
      });

      it('should fail to move non-existent statement', () => {
        const nonExistentId = statementIdFactory.build();
        const result = orderedSet.moveStatement(nonExistentId, 1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Statement not found');
        }
      });

      it('should reject invalid new positions', () => {
        const result = orderedSet.moveStatement(statementId1, 10);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Invalid new position');
        }
      });

      it('should reject negative positions', () => {
        const result = orderedSet.moveStatement(statementId1, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Invalid new position');
        }
      });

      it('should return ok when moving to same position', () => {
        const result = orderedSet.moveStatement(statementId1, 0);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()).toEqual([statementId1, statementId2, statementId3]);
      });
    });

    describe('replaceStatements', () => {
      beforeEach(() => {
        orderedSet.addStatement(statementId1);
        orderedSet.addStatement(statementId2);
      });

      it('should replace all statements', () => {
        const newStatements = [statementId3];
        const result = orderedSet.replaceStatements(newStatements);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()).toEqual(newStatements);
        expect(orderedSet.size()).toBe(1);
      });

      it('should remove duplicates when replacing statements', () => {
        const duplicateStatements = [statementId3, statementId3, statementId1];
        const result = orderedSet.replaceStatements(duplicateStatements);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()).toEqual([statementId3, statementId1]);
        expect(orderedSet.size()).toBe(2);
      });

      it('should replace with empty array', () => {
        const result = orderedSet.replaceStatements([]);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.isEmpty()).toBe(true);
        expect(orderedSet.size()).toBe(0);
      });
    });
  });

  describe('Reference Management', () => {
    let orderedSet: OrderedSet;
    let argumentId1: AtomicArgumentId;

    beforeEach(() => {
      const result = OrderedSet.create([statementIdFactory.build()]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        orderedSet = result.value;
      }
      argumentId1 = atomicArgumentIdFactory.build();
    });

    describe('atomic argument references', () => {
      it('should add premise reference', () => {
        orderedSet.addAtomicArgumentReference(argumentId1, 'premise');

        expect(orderedSet.getReferencedByAsPremise()).toContain(argumentId1);
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);
        expect(orderedSet.getTotalReferenceCount()).toBe(1);
      });

      it('should add conclusion reference', () => {
        orderedSet.addAtomicArgumentReference(argumentId1, 'conclusion');

        expect(orderedSet.getReferencedByAsConclusion()).toContain(argumentId1);
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);
        expect(orderedSet.getTotalReferenceCount()).toBe(1);
      });

      it('should remove references', () => {
        orderedSet.addAtomicArgumentReference(argumentId1, 'premise');
        orderedSet.removeAtomicArgumentReference(argumentId1, 'premise');

        expect(orderedSet.getReferencedByAsPremise()).not.toContain(argumentId1);
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);
        expect(orderedSet.getTotalReferenceCount()).toBe(0);
      });
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal to itself', () => {
      const result = OrderedSet.create([statementIdFactory.build()]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        expect(orderedSet.equals(orderedSet)).toBe(true);
        expect(orderedSet.orderedEquals(orderedSet)).toBe(true);
      }
    });

    it('should be equal to another set with same statements in same order', () => {
      const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
      const result1 = OrderedSet.create(statementIds);
      const result2 = OrderedSet.create(statementIds);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.orderedEquals(result2.value)).toBe(true);
      }
    });

    it('should not be ordered equal to set with different order', () => {
      const statementId1 = statementIdFactory.build();
      const statementId2 = statementIdFactory.build();

      const result1 = OrderedSet.create([statementId1, statementId2]);
      const result2 = OrderedSet.create([statementId2, statementId1]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.orderedEquals(result2.value)).toBe(false);
        // But they should still be equal as sets (unordered)
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should not be ordered equal to sets with different lengths', () => {
      const statementId1 = statementIdFactory.build();
      const statementId2 = statementIdFactory.build();

      const result1 = OrderedSet.create([statementId1]);
      const result2 = OrderedSet.create([statementId1, statementId2]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.orderedEquals(result2.value)).toBe(false);
        expect(result2.value.orderedEquals(result1.value)).toBe(false);
      }
    });

    it('should not be equal to sets with different lengths', () => {
      const statementId1 = statementIdFactory.build();
      const statementId2 = statementIdFactory.build();

      const result1 = OrderedSet.create([statementId1]);
      const result2 = OrderedSet.create([statementId1, statementId2]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
        expect(result2.value.equals(result1.value)).toBe(false);
      }
    });
  });

  describe('Basic Properties', () => {
    it('should provide basic properties', () => {
      const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
      const result = OrderedSet.create(statementIds);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        // Test that the object has basic properties we expect
        expect(orderedSet.size()).toBe(2);
        expect(orderedSet.getId()).toBeDefined();
        expect(orderedSet.isEmpty()).toBe(false);
        expect(orderedSet.getCreatedAt()).toBeDefined();
        expect(orderedSet.getModifiedAt()).toBeDefined();
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let orderedSet: OrderedSet;

    beforeEach(() => {
      const result = OrderedSet.create();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        orderedSet = result.value;
      }
    });

    it('should handle insert at end position', () => {
      const statementId = statementIdFactory.build();
      orderedSet.addStatement(statementIdFactory.build());

      const result = orderedSet.insertStatementAt(statementId, orderedSet.size());

      expect(result.isOk()).toBe(true);
      expect(orderedSet.containsStatement(statementId)).toBe(true);
    });

    it('should handle reconstruction with empty reference arrays', () => {
      const id = orderedSetIdFactory.build();
      const statementIds = [statementIdFactory.build()];
      const referencedBy = {
        asPremise: [],
        asConclusion: [],
      };

      const result = OrderedSet.reconstruct(id, statementIds, 1000, 2000, referencedBy);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        expect(orderedSet.getReferencedByAsPremise()).toEqual([]);
        expect(orderedSet.getReferencedByAsConclusion()).toEqual([]);
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);
      }
    });

    it('should update modified timestamp on all mutating operations', () => {
      const statementId1 = statementIdFactory.build();
      const statementId2 = statementIdFactory.build();
      const initialTime = orderedSet.getModifiedAt();

      // Test addStatement
      const laterTime = initialTime + 1000;
      mockDateNow.mockReturnValueOnce(laterTime);
      orderedSet.addStatement(statementId1);
      expect(orderedSet.getModifiedAt()).toBe(laterTime);

      // Test removeStatement
      mockDateNow.mockReturnValueOnce(laterTime + 1000);
      orderedSet.removeStatement(statementId1);
      expect(orderedSet.getModifiedAt()).toBe(laterTime + 1000);

      // Test insertStatementAt
      orderedSet.addStatement(statementId1);
      mockDateNow.mockReturnValueOnce(laterTime + 2000);
      orderedSet.insertStatementAt(statementId2, 0);
      expect(orderedSet.getModifiedAt()).toBe(laterTime + 2000);

      // Test moveStatement - move statementId1 from position 1 to position 0
      mockDateNow.mockReturnValueOnce(laterTime + 3000);
      orderedSet.moveStatement(statementId1, 0);
      expect(orderedSet.getModifiedAt()).toBe(laterTime + 3000);

      // Test replaceStatements
      mockDateNow.mockReturnValueOnce(laterTime + 4000);
      orderedSet.replaceStatements([statementId2]);
      expect(orderedSet.getModifiedAt()).toBe(laterTime + 4000);
    });
  });

  describe('Property-Based Testing', () => {
    describe('statement management consistency', () => {
      it('should maintain consistency across operations', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.constant(null).map(() => statementIdFactory.build()),
              {
                minLength: 0,
                maxLength: 10,
              },
            ),
            (statementIds) => {
              // Create unique statement IDs to avoid duplicates
              const uniqueIds = statementIds.filter(
                (id, index, arr) =>
                  arr.findIndex((otherId) => otherId.getValue() === id.getValue()) === index,
              );

              const result = OrderedSet.create(uniqueIds);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const orderedSet = result.value;

                // Verify all unique statements are present
                expect(orderedSet.size()).toBe(uniqueIds.length);
                expect(orderedSet.isEmpty()).toBe(uniqueIds.length === 0);

                // Verify order is preserved
                const retrievedIds = orderedSet.getStatementIds();
                expect(retrievedIds).toEqual(uniqueIds);

                // Verify all statements can be found
                uniqueIds.forEach((id) => {
                  expect(orderedSet.containsStatement(id)).toBe(true);
                });
              }
            },
          ),
        );
      });

      it('should maintain ordering invariants under mutation', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.constant(null).map(() => statementIdFactory.build()),
              { maxLength: 5 },
            ),
            fc.array(
              fc.constant(null).map(() => statementIdFactory.build()),
              { maxLength: 3 },
            ),
            (initialIds, additionalIds) => {
              // Ensure unique IDs
              const uniqueInitial = initialIds.filter(
                (id, i, arr) => arr.findIndex((other) => other.getValue() === id.getValue()) === i,
              );
              const uniqueAdditional = additionalIds.filter(
                (id, i, arr) =>
                  arr.findIndex((other) => other.getValue() === id.getValue()) === i &&
                  !uniqueInitial.some((initial) => initial.getValue() === id.getValue()),
              );

              const result = OrderedSet.create(uniqueInitial);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const orderedSet = result.value;

                // Add additional statements
                uniqueAdditional.forEach((id) => {
                  const addResult = orderedSet.addStatement(id);
                  expect(addResult.isOk()).toBe(true);
                });

                // Verify final state
                const expectedIds = [...uniqueInitial, ...uniqueAdditional];
                expect(orderedSet.getStatementIds()).toEqual(expectedIds);
                expect(orderedSet.size()).toBe(expectedIds.length);
              }
            },
          ),
        );
      });
    });
  });
});
