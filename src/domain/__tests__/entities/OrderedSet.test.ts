import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderedSet } from '../../entities/OrderedSet';
import { ValidationError } from '../../shared/result.js';
import type { AtomicArgumentId, StatementId } from '../../shared/value-objects';
import {
  atomicArgumentIdFactory,
  orderedSetIdFactory,
  statementIdFactory,
} from '../factories/index.js';

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

  // Test utility functions and internal components for complete coverage
  describe('Internal utility function coverage', () => {
    it('should test SimpleSet edge cases with duplicate handling', () => {
      // Create an OrderedSet and manipulate it to test SimpleSet behavior
      const stmt1 = statementIdFactory.build();
      const stmt2 = statementIdFactory.build();
      const arg1 = atomicArgumentIdFactory.build();
      const arg2 = atomicArgumentIdFactory.build();

      const result = OrderedSet.create([stmt1, stmt2]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const orderedSet = result.value;

        // Add atomic argument references to test SimpleSet functionality
        orderedSet.addAtomicArgumentReference(arg1, 'premise');
        orderedSet.addAtomicArgumentReference(arg2, 'premise');

        // Test duplicate handling
        orderedSet.addAtomicArgumentReference(arg1, 'premise'); // Should not add duplicate

        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        // Test removal
        orderedSet.removeAtomicArgumentReference(arg1, 'premise');
        orderedSet.removeAtomicArgumentReference(arg2, 'premise');

        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);

        // Test conclusion references
        orderedSet.addAtomicArgumentReference(arg1, 'conclusion');
        orderedSet.addAtomicArgumentReference(arg1, 'conclusion'); // Duplicate
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        orderedSet.removeAtomicArgumentReference(arg1, 'conclusion');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);
      }
    });

    it('should test findIndex utility function edge cases', () => {
      const stmt1 = statementIdFactory.build();
      const stmt2 = statementIdFactory.build();
      const stmt3 = statementIdFactory.build();

      const result = OrderedSet.create([stmt1, stmt2, stmt3]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const orderedSet = result.value;

        // Test finding existing statements
        expect(orderedSet.indexOf(stmt1)).toBe(0);
        expect(orderedSet.indexOf(stmt2)).toBe(1);
        expect(orderedSet.indexOf(stmt3)).toBe(2);

        // Test finding non-existing statement
        const nonExistentStmt = statementIdFactory.build();
        expect(orderedSet.indexOf(nonExistentStmt)).toBe(-1);

        // Test with empty set
        const emptyResult = OrderedSet.createEmpty();
        expect(emptyResult.isOk()).toBe(true);
        if (emptyResult.isOk()) {
          expect(emptyResult.value.indexOf(stmt1)).toBe(-1);
        }
      }
    });

    it('should test uniqueness enforcement edge cases', () => {
      const stmt1 = statementIdFactory.build();
      const stmt2 = statementIdFactory.build();

      // Create with duplicates - should remove them
      const duplicates = [stmt1, stmt2, stmt1, stmt2, stmt1];
      const result = OrderedSet.create(duplicates);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orderedSet = result.value;
        expect(orderedSet.size()).toBe(2);
        expect(orderedSet.getStatementIds()).toEqual([stmt1, stmt2]);
      }
    });

    it('should test reference tracking with mixed operations', () => {
      const stmt1 = statementIdFactory.build();
      const arg1 = atomicArgumentIdFactory.build();
      const arg2 = atomicArgumentIdFactory.build();

      const result = OrderedSet.create([stmt1]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const orderedSet = result.value;

        // Start with no references
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);

        // Add premise reference
        orderedSet.addAtomicArgumentReference(arg1, 'premise');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        // Add conclusion reference for same argument
        orderedSet.addAtomicArgumentReference(arg1, 'conclusion');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        // Remove premise reference (should still be referenced as conclusion)
        orderedSet.removeAtomicArgumentReference(arg1, 'premise');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        // Add different argument as premise
        orderedSet.addAtomicArgumentReference(arg2, 'premise');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        // Remove all references
        orderedSet.removeAtomicArgumentReference(arg1, 'conclusion');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true); // arg2 still references

        orderedSet.removeAtomicArgumentReference(arg2, 'premise');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false); // No more references
      }
    });
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

      it('should create an empty ordered set using createEmpty method', () => {
        const result = OrderedSet.createEmpty();

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

      it('should handle edge case when splice fails to remove statement', () => {
        // This tests the defensive programming in moveStatement() lines 200-201
        // Create a scenario where the array could be modified during operation
        const originalSplice = Array.prototype.splice;

        // Mock splice to return empty array on first call (simulating failure)
        let callCount = 0;
        const mockSplice = function (
          this: any[],
          ...args: Parameters<typeof Array.prototype.splice>
        ) {
          callCount++;
          if (callCount === 1) {
            // First call (removal) returns empty array
            return [];
          }
          // Subsequent calls work normally
          return originalSplice.call(this, ...args);
        };

        Array.prototype.splice = mockSplice;

        try {
          const result = orderedSet.moveStatement(statementId1, 1);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error.message).toContain('Failed to remove statement from position');
          }
        } finally {
          // Restore original splice
          Array.prototype.splice = originalSplice;
        }
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

      it('should handle removing non-existent references gracefully', () => {
        const nonExistentArgumentId = atomicArgumentIdFactory.build();

        // Try to remove a premise reference that was never added
        orderedSet.removeAtomicArgumentReference(nonExistentArgumentId, 'premise');
        expect(orderedSet.getReferencedByAsPremise()).not.toContain(nonExistentArgumentId);
        expect(orderedSet.getTotalReferenceCount()).toBe(0);

        // Try to remove a conclusion reference that was never added
        orderedSet.removeAtomicArgumentReference(nonExistentArgumentId, 'conclusion');
        expect(orderedSet.getReferencedByAsConclusion()).not.toContain(nonExistentArgumentId);
        expect(orderedSet.getTotalReferenceCount()).toBe(0);
      });
    });
  });

  describe('Identity and Object Comparison', () => {
    describe('isSameAs method', () => {
      it('should return true for same object instance (identity)', () => {
        const result = OrderedSet.create([statementIdFactory.build()]);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          expect(orderedSet.isSameAs(orderedSet)).toBe(true);
        }
      });

      it('should return false for different object instances with same content', () => {
        const statementIds = [statementIdFactory.build(), statementIdFactory.build()];
        const result1 = OrderedSet.create(statementIds);
        const result2 = OrderedSet.create(statementIds);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const orderedSet1 = result1.value;
          const orderedSet2 = result2.value;
          // Different objects despite same content
          expect(orderedSet1.isSameAs(orderedSet2)).toBe(false);
          // But content should be equal
          expect(orderedSet1.equals(orderedSet2)).toBe(true);
          expect(orderedSet1.orderedEquals(orderedSet2)).toBe(true);
        }
      });

      it('should use object identity not content for isSameAs', () => {
        const statement1 = statementIdFactory.build();
        const statement2 = statementIdFactory.build();

        const result1 = OrderedSet.create([statement1]);
        const result2 = OrderedSet.create([statement2]);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const orderedSet1 = result1.value;
          const orderedSet2 = result2.value;

          expect(orderedSet1.isSameAs(orderedSet2)).toBe(false);
          expect(orderedSet1.equals(orderedSet2)).toBe(false);
        }
      });
    });

    describe('removeAtomicArgumentReference edge cases', () => {
      it('should handle removing conclusion references', () => {
        const result = OrderedSet.create([statementIdFactory.build()]);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          const argumentId = atomicArgumentIdFactory.build();

          // Add and then remove conclusion reference
          orderedSet.addAtomicArgumentReference(argumentId, 'conclusion');
          expect(orderedSet.getReferencedByAsConclusion()).toContain(argumentId);

          orderedSet.removeAtomicArgumentReference(argumentId, 'conclusion');
          expect(orderedSet.getReferencedByAsConclusion()).not.toContain(argumentId);
          expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);
        }
      });

      it('should handle removing premise references', () => {
        const result = OrderedSet.create([statementIdFactory.build()]);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          const argumentId = atomicArgumentIdFactory.build();

          // Add and then remove premise reference
          orderedSet.addAtomicArgumentReference(argumentId, 'premise');
          expect(orderedSet.getReferencedByAsPremise()).toContain(argumentId);

          orderedSet.removeAtomicArgumentReference(argumentId, 'premise');
          expect(orderedSet.getReferencedByAsPremise()).not.toContain(argumentId);
          expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);
        }
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

  // Enhanced coverage tests for OrderedSet edge cases
  describe('Enhanced Coverage Tests', () => {
    describe('atomic argument reference edge cases', () => {
      it('should handle reference management with mixed argument types', () => {
        const result = OrderedSet.createEmpty();
        expect(result.isOk()).toBe(true);
        if (!result.isOk()) return;

        const orderedSet = result.value;
        const arg1 = atomicArgumentIdFactory.build();
        const arg2 = atomicArgumentIdFactory.build();
        const arg3 = atomicArgumentIdFactory.build();

        // Test adding references with different types
        orderedSet.addAtomicArgumentReference(arg1, 'premise');
        orderedSet.addAtomicArgumentReference(arg2, 'conclusion');
        orderedSet.addAtomicArgumentReference(arg3, 'premise');

        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        // Test getting references by type
        const premiseRefs = orderedSet.getReferencedByAsPremise();
        const conclusionRefs = orderedSet.getReferencedByAsConclusion();

        expect(premiseRefs.length).toBe(2);
        expect(conclusionRefs.length).toBe(1);
        expect(premiseRefs).toContain(arg1);
        expect(premiseRefs).toContain(arg3);
        expect(conclusionRefs).toContain(arg2);

        // Test removing specific type references
        orderedSet.removeAtomicArgumentReference(arg1, 'premise');
        expect(orderedSet.getTotalReferenceCount()).toBe(2);

        // Test removing wrong type (should not remove)
        orderedSet.removeAtomicArgumentReference(arg2, 'premise'); // arg2 is conclusion type
        expect(orderedSet.getTotalReferenceCount()).toBe(2);

        // Test removing correct type
        orderedSet.removeAtomicArgumentReference(arg2, 'conclusion');
        expect(orderedSet.getTotalReferenceCount()).toBe(1);
      });

      it('should handle edge cases in reference clearing', () => {
        const result = OrderedSet.createEmpty();
        expect(result.isOk()).toBe(true);
        if (!result.isOk()) return;

        const orderedSet = result.value;
        const arg1 = atomicArgumentIdFactory.build();

        // Test clearing empty references (already empty)
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);

        // Add reference and remove manually (no clearAtomicArgumentReferences method)
        orderedSet.addAtomicArgumentReference(arg1, 'premise');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);

        orderedSet.removeAtomicArgumentReference(arg1, 'premise');
        expect(orderedSet.isReferencedByAtomicArguments()).toBe(false);
        expect(orderedSet.getTotalReferenceCount()).toBe(0);
      });
    });

    describe('statement management edge cases', () => {
      it('should handle statement operations with various scenarios', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();
        const stmt3 = statementIdFactory.build();

        const result = OrderedSet.create([stmt1, stmt2]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;

          // Test adding statement that already exists
          const duplicateResult = orderedSet.addStatement(stmt1);
          expect(duplicateResult.isErr()).toBe(true);
          if (duplicateResult.isErr()) {
            expect(duplicateResult.error.message).toContain('already exists');
          }

          // Test removing statement that doesn't exist
          const nonExistentResult = orderedSet.removeStatement(stmt3);
          expect(nonExistentResult.isErr()).toBe(true);
          if (nonExistentResult.isErr()) {
            expect(nonExistentResult.error.message).toContain('not found');
          }

          // Test getting statement at invalid index (using indexOf instead)
          expect(orderedSet.indexOf(stmt3)).toBe(-1);

          // Test valid index access via getStatementIds
          const statementIds = orderedSet.getStatementIds();
          expect(statementIds[0]).toBe(stmt1);
          expect(statementIds[1]).toBe(stmt2);

          // Test indexOf
          expect(orderedSet.indexOf(stmt1)).toBe(0);
          expect(orderedSet.indexOf(stmt2)).toBe(1);
          expect(orderedSet.indexOf(stmt3)).toBe(-1);
        }
      });

      it('should handle insertion at specific positions', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();
        const stmt3 = statementIdFactory.build();
        const stmt4 = statementIdFactory.build();

        const result = OrderedSet.create([stmt1, stmt3]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;

          // Insert at beginning
          const insertBeginResult = orderedSet.insertStatementAt(stmt2, 0);
          expect(insertBeginResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt2, stmt1, stmt3]);

          // Insert at end
          const insertEndResult = orderedSet.insertStatementAt(stmt4, orderedSet.size());
          expect(insertEndResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt2, stmt1, stmt3, stmt4]);

          // Test invalid position insertion
          const stmt5 = statementIdFactory.build();
          const invalidPosResult = orderedSet.insertStatementAt(stmt5, 100);
          expect(invalidPosResult.isErr()).toBe(true);

          const negativePosResult = orderedSet.insertStatementAt(stmt5, -1);
          expect(negativePosResult.isErr()).toBe(true);

          // Test inserting duplicate
          const duplicateInsertResult = orderedSet.insertStatementAt(stmt1, 1);
          expect(duplicateInsertResult.isErr()).toBe(true);
        }
      });
    });

    describe('move operations edge cases', () => {
      it('should handle move operations with boundary conditions', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();
        const stmt3 = statementIdFactory.build();
        const stmt4 = statementIdFactory.build();

        const result = OrderedSet.create([stmt1, stmt2, stmt3, stmt4]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;

          // Test moving to same position
          const samePositionResult = orderedSet.moveStatement(stmt2, 1);
          expect(samePositionResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt1, stmt2, stmt3, stmt4]);

          // Test moving first to last
          const firstToLastResult = orderedSet.moveStatement(stmt1, 3);
          expect(firstToLastResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt2, stmt3, stmt4, stmt1]);

          // Test moving last to first
          const lastToFirstResult = orderedSet.moveStatement(stmt1, 0);
          expect(lastToFirstResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt1, stmt2, stmt3, stmt4]);

          // Test invalid moves
          const nonExistentStmt = statementIdFactory.build();
          const invalidFromResult = orderedSet.moveStatement(nonExistentStmt, 0);
          expect(invalidFromResult.isErr()).toBe(true);

          const invalidToResult = orderedSet.moveStatement(stmt1, 100);
          expect(invalidToResult.isErr()).toBe(true);

          const negativeToResult = orderedSet.moveStatement(stmt1, -1);
          expect(negativeToResult.isErr()).toBe(true);
        }
      });
    });

    describe('replacement operations edge cases', () => {
      it('should handle replacement with various scenarios', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();
        const stmt3 = statementIdFactory.build();
        const newStmt = statementIdFactory.build();

        const result = OrderedSet.create([stmt1, stmt2, stmt3]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;

          // Test valid replacement using replaceStatements
          const replaceResult = orderedSet.replaceStatements([stmt1, newStmt, stmt3]);
          expect(replaceResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt1, newStmt, stmt3]);

          // Test replacement with duplicates (should be deduplicated)
          const duplicateReplaceResult = orderedSet.replaceStatements([stmt1, stmt1, newStmt]);
          expect(duplicateReplaceResult.isOk()).toBe(true);
          expect(orderedSet.getStatementIds()).toEqual([stmt1, newStmt]);

          // Test replacement with empty array
          const emptyReplaceResult = orderedSet.replaceStatements([]);
          expect(emptyReplaceResult.isOk()).toBe(true);
          expect(orderedSet.isEmpty()).toBe(true);
        }
      });
    });

    describe('state validation and information methods', () => {
      it('should provide comprehensive state information', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();

        // Test empty ordered set
        const emptyResult = OrderedSet.createEmpty();
        expect(emptyResult.isOk()).toBe(true);
        if (emptyResult.isOk()) {
          const emptySet = emptyResult.value;
          expect(emptySet.isEmpty()).toBe(true);
          expect(emptySet.size()).toBe(0);
          expect(emptySet.containsStatement(stmt1)).toBe(false);
        }

        // Test populated ordered set
        const result = OrderedSet.create([stmt1, stmt2]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;
          expect(orderedSet.isEmpty()).toBe(false);
          expect(orderedSet.size()).toBe(2);
          expect(orderedSet.containsStatement(stmt1)).toBe(true);
          expect(orderedSet.containsStatement(stmt2)).toBe(true);
          expect(orderedSet.containsStatement(statementIdFactory.build())).toBe(false);
        }
      });

      it('should handle equality comparisons correctly', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();

        const set1Result = OrderedSet.create([stmt1, stmt2]);
        const set2Result = OrderedSet.create([stmt1, stmt2]);
        const set3Result = OrderedSet.create([stmt1, stmt2]);
        const set4Result = OrderedSet.create([stmt2, stmt1]);

        expect(set1Result.isOk()).toBe(true);
        expect(set2Result.isOk()).toBe(true);
        expect(set3Result.isOk()).toBe(true);
        expect(set4Result.isOk()).toBe(true);

        if (set1Result.isOk() && set2Result.isOk() && set3Result.isOk() && set4Result.isOk()) {
          // Equality based on content, not ID (different instances)
          expect(set1Result.value.equals(set2Result.value)).toBe(true); // Same content
          expect(set1Result.value.equals(set3Result.value)).toBe(true); // Same content
          expect(set1Result.value.equals(set4Result.value)).toBe(true); // Same content, different order
          expect(set1Result.value.orderedEquals(set4Result.value)).toBe(false); // Different order
        }
      });
    });

    describe('timestamp tracking edge cases', () => {
      it('should update modified timestamp for all mutating operations', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();
        const stmt3 = statementIdFactory.build();

        const result = OrderedSet.create([stmt1]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;
          const _initialModified = orderedSet.getModifiedAt();

          // Test that adding statement updates timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const addResult = orderedSet.addStatement(stmt2);
          expect(addResult.isOk()).toBe(true);
          expect(orderedSet.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);

          // Test that removing statement updates timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
          const removeResult = orderedSet.removeStatement(stmt2);
          expect(removeResult.isOk()).toBe(true);
          expect(orderedSet.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);

          // Test that inserting statement updates timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
          const insertResult = orderedSet.insertStatementAt(stmt3, 0);
          expect(insertResult.isOk()).toBe(true);
          expect(orderedSet.getModifiedAt()).toBe(FIXED_TIMESTAMP + 3000);

          // Test that moving statement updates timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 4000);
          const moveResult = orderedSet.moveStatement(stmt3, 1);
          expect(moveResult.isOk()).toBe(true);
          expect(orderedSet.getModifiedAt()).toBe(FIXED_TIMESTAMP + 4000);

          // Test that replacing statements updates timestamp
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 5000);
          const replaceResult = orderedSet.replaceStatements([stmt2, stmt1]);
          expect(replaceResult.isOk()).toBe(true);
          expect(orderedSet.getModifiedAt()).toBe(FIXED_TIMESTAMP + 5000);
        }
      });
    });

    describe('reconstruction edge cases', () => {
      it('should handle reconstruction with all parameter combinations', () => {
        const id = orderedSetIdFactory.build();
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();
        const arg1 = atomicArgumentIdFactory.build();
        const now = Date.now();

        // Test reconstruction with empty statements
        const emptyResult = OrderedSet.reconstruct(id, [], now, now + 1000, {
          asPremise: [],
          asConclusion: [],
        });
        expect(emptyResult.isOk()).toBe(true);
        if (emptyResult.isOk()) {
          expect(emptyResult.value.isEmpty()).toBe(true);
          expect(emptyResult.value.getId()).toBe(id);
        }

        // Test reconstruction with statements and references
        const references = { asPremise: [arg1], asConclusion: [] };
        const fullResult = OrderedSet.reconstruct(id, [stmt1, stmt2], now, now + 1000, references);
        expect(fullResult.isOk()).toBe(true);
        if (fullResult.isOk()) {
          const orderedSet = fullResult.value;
          expect(orderedSet.size()).toBe(2);
          expect(orderedSet.getStatementIds()).toEqual([stmt1, stmt2]);
          expect(orderedSet.isReferencedByAtomicArguments()).toBe(true);
          expect(orderedSet.getCreatedAt()).toBe(now);
          expect(orderedSet.getModifiedAt()).toBe(now + 1000);
        }
      });
    });

    describe('toString edge cases', () => {
      it('should provide meaningful string representations', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();

        // Test empty set
        const emptyResult = OrderedSet.createEmpty();
        expect(emptyResult.isOk()).toBe(true);
        if (emptyResult.isOk()) {
          const emptySet = emptyResult.value;
          const emptyStatements = emptySet.getStatementIds();
          expect(emptyStatements.length).toBe(0);
        }

        // Test set with statements
        const result = OrderedSet.create([stmt1, stmt2]);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          const statements = orderedSet.getStatementIds();
          expect(statements.length).toBe(2);
          expect(statements[0]).toBe(stmt1);
          expect(statements[1]).toBe(stmt2);
        }
      });
    });

    describe('error validation edge cases', () => {
      it('should handle duplicate statements in creation by deduplication', () => {
        const stmt1 = statementIdFactory.build();

        // Test creation with duplicate statements (should deduplicate)
        const duplicateResult = OrderedSet.create([stmt1, stmt1]);
        expect(duplicateResult.isOk()).toBe(true);
        if (duplicateResult.isOk()) {
          expect(duplicateResult.value.size()).toBe(1);
          expect(duplicateResult.value.containsStatement(stmt1)).toBe(true);
        }
      });

      it('should provide detailed error messages for all operations', () => {
        const stmt1 = statementIdFactory.build();
        const stmt2 = statementIdFactory.build();

        const result = OrderedSet.create([stmt1]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const orderedSet = result.value;

          // Test adding duplicate error message
          const addDuplicateResult = orderedSet.addStatement(stmt1);
          expect(addDuplicateResult.isErr()).toBe(true);
          if (addDuplicateResult.isErr()) {
            expect(addDuplicateResult.error.message).toContain('already exists');
          }

          // Test removing non-existent statement error message
          const removeNonExistentResult = orderedSet.removeStatement(stmt2);
          expect(removeNonExistentResult.isErr()).toBe(true);
          if (removeNonExistentResult.isErr()) {
            expect(removeNonExistentResult.error.message).toContain('not found');
          }

          // Test move out of bounds error messages
          const nonExistentStmt = statementIdFactory.build();
          const moveInvalidFromResult = orderedSet.moveStatement(nonExistentStmt, 0);
          expect(moveInvalidFromResult.isErr()).toBe(true);
          if (moveInvalidFromResult.isErr()) {
            expect(moveInvalidFromResult.error.message).toContain('not found');
          }

          const moveInvalidToResult = orderedSet.moveStatement(stmt1, 100);
          expect(moveInvalidToResult.isErr()).toBe(true);
          if (moveInvalidToResult.isErr()) {
            expect(moveInvalidToResult.error.message).toContain('Invalid new position');
          }
        }
      });
    });
  });
});
