/**
 * Test suite for AtomicArgument edge cases and error conditions
 *
 * Focuses on:
 * - Boundary conditions
 * - Timestamp edge cases
 * - Error handling and validation
 * - Null/undefined handling
 * - Empty state handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { Statement } from '../../entities/Statement.js';
import {
  sharesStatementWith,
  validateConnectionSafety,
} from '../../services/AtomicArgumentConnectionService.js';
import { AtomicArgumentId } from '../../shared/value-objects/index.js';
import { FIXED_TIMESTAMP } from './atomic-argument-test-utils.js';

describe('Edge Cases and Error Conditions', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('boundary conditions', () => {
    it('should handle empty premises and conclusions correctly', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual([]);
        expect(argument.getConclusions()).toEqual([]);
        expect(argument.isBootstrapArgument()).toBe(true);
      }
    });

    it('should handle empty side labels correctly', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getSideLabels()).toEqual({});
        expect(argument.hasSideLabels()).toBe(false);
      }
    });

    it('should handle empty arguments in connections', () => {
      const premiseResult = Statement.create('Test premise');
      const conclusionResult = Statement.create('Test conclusion');

      expect(premiseResult.isOk()).toBe(true);
      expect(conclusionResult.isOk()).toBe(true);

      if (premiseResult.isOk() && conclusionResult.isOk()) {
        const completeResult = AtomicArgument.create(
          [premiseResult.value],
          [conclusionResult.value],
        );
        const incompleteResult = AtomicArgument.create();

        expect(completeResult.isOk()).toBe(true);
        expect(incompleteResult.isOk()).toBe(true);

        if (completeResult.isOk() && incompleteResult.isOk()) {
          // Empty argument has no premises or conclusions to connect
          expect(incompleteResult.value.getPremiseCount()).toBe(0);
          expect(incompleteResult.value.getConclusionCount()).toBe(0);
        }
      }
    });

    it('should handle setting same statement multiple times', () => {
      const statementResult = Statement.create('Test statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const originalModified = argument.getModifiedAt();

          // Add premise
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 100);
          const addResult1 = argument.addPremise(statement);
          expect(addResult1.isOk()).toBe(true);
          const firstModified = argument.getModifiedAt();
          expect(firstModified).toBeGreaterThan(originalModified);

          // Try to add same statement again
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const addResult2 = argument.addPremise(statement);
          // Adding duplicate statement might fail
          if (addResult2.isOk()) {
            const secondModified = argument.getModifiedAt();
            expect(secondModified).toBeGreaterThan(firstModified); // Should update
            expect(argument.getPremiseCount()).toBe(2); // Both added
          } else {
            // Or it might be rejected as duplicate
            expect(argument.getPremiseCount()).toBe(1); // Only first added
          }
        }
      }
    });

    it('should handle adding and removing statements', () => {
      const statement1Result = Statement.create('Statement 1');
      const statement2Result = Statement.create('Statement 2');

      expect(statement1Result.isOk()).toBe(true);
      expect(statement2Result.isOk()).toBe(true);

      if (statement1Result.isOk() && statement2Result.isOk()) {
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          // Start as bootstrap
          expect(argument.isBootstrapArgument()).toBe(true);

          // Add premise
          const addPremiseResult = argument.addPremise(statement1);
          expect(addPremiseResult.isOk()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.hasPremiseSet()).toBe(true);

          // Remove premise
          const removePremiseResult = argument.removePremiseAt(0);
          expect(removePremiseResult.isOk()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(true);
          expect(argument.hasPremiseSet()).toBe(false);

          // Add conclusion
          const addConclusionResult = argument.addConclusion(statement2);
          expect(addConclusionResult.isOk()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.hasConclusionSet()).toBe(true);

          // Remove conclusion
          const removeConclusionResult = argument.removeConclusionAt(0);
          expect(removeConclusionResult.isOk()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(true);
          expect(argument.hasConclusionSet()).toBe(false);
        }
      }
    });
  });

  describe('timestamp edge cases', () => {
    it('should handle zero timestamp correctly', () => {
      mockDateNow.mockReturnValue(0);
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getCreatedAt()).toBe(0);
        expect(argument.getModifiedAt()).toBe(0);
      }
    });

    it('should handle very large timestamps', () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      mockDateNow.mockReturnValue(largeTimestamp);

      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getCreatedAt()).toBe(largeTimestamp);
        expect(argument.getModifiedAt()).toBe(largeTimestamp);
      }
    });

    it('should maintain timestamp precision', () => {
      const preciseTimestamp = 1234567890123.456;
      mockDateNow.mockReturnValue(preciseTimestamp);

      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        // JavaScript timestamps are integers (Date.now returns integers)
        expect(argument.getCreatedAt()).toBe(preciseTimestamp);
      }
    });

    it('should handle rapid timestamp changes', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const timestamps: number[] = [];

        for (let i = 0; i < 10; i++) {
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + i);
          argument.updateSideLabels({ left: `Update ${i}` });
          timestamps.push(argument.getModifiedAt());
        }

        // All timestamps should be unique and increasing
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]!).toBeGreaterThan(timestamps[i - 1]!);
        }
      }
    });
  });

  describe('side label edge cases', () => {
    it('should handle undefined in side label objects', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Set left label only
        const setLeftResult = argument.setLeftSideLabel('Valid');
        expect(setLeftResult.isOk()).toBe(true);

        const labels = argument.getSideLabels();
        expect(labels.left).toBe('Valid');
        expect(labels.right).toBeUndefined();
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(false);
      }
    });

    it('should handle clearing side labels', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Set both labels
        argument.setLeftSideLabel('Left');
        argument.setRightSideLabel('Right');

        // Clear left label
        argument.setLeftSideLabel(undefined);

        const labels = argument.getSideLabels();
        expect(labels.left).toBeUndefined();
        expect(labels.right).toBe('Right');
      }
    });

    it('should handle extremely long side label strings', () => {
      const veryLongLabel = 'A'.repeat(10000);
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        // SideLabel value object may have length restrictions
        const setResult = argument.setLeftSideLabel(veryLongLabel);
        if (setResult.isErr()) {
          // If it fails due to length, that's expected
          expect(setResult.error.message).toMatch(/length|exceed|100|characters/i);
          expect(argument.hasLeftSideLabel()).toBe(false);
        } else {
          // If it succeeds, verify it was set
          expect(argument.getSideLabels().left).toBe(veryLongLabel);
          expect(argument.hasLeftSideLabel()).toBe(true);
        }
      }
    });

    it('should handle Unicode in side labels', () => {
      const unicodeLabels = {
        left: '😀🎉✨', // Emojis
        right: '中文日本語', // Chinese/Japanese characters
      };
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const updateResult = argument.updateSideLabels(unicodeLabels);
        expect(updateResult.isOk()).toBe(true);
        expect(argument.getSideLabels()).toEqual(unicodeLabels);
        expect(argument.hasSideLabels()).toBe(true);
      }
    });
  });

  describe('connection edge cases', () => {
    it('should handle self-referential statements', () => {
      const statementResult = Statement.create('Self-referential');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        const argResult = AtomicArgument.create([statement], [statement]);
        expect(argResult.isOk()).toBe(true);

        if (argResult.isOk()) {
          const argument = argResult.value;

          // Has both premise and conclusion with same statement
          expect(argument.getPremiseAt(0)).toBe(statement);
          expect(argument.getConclusionAt(0)).toBe(statement);

          // Safety validation should fail for self-connection
          const safetyResult = validateConnectionSafety(argument, argument);
          expect(safetyResult.isErr()).toBe(true);
        }
      }
    });

    it('should handle arguments with empty statements', () => {
      const emptyResult1 = AtomicArgument.create();
      const emptyResult2 = AtomicArgument.create();

      expect(emptyResult1.isOk()).toBe(true);
      expect(emptyResult2.isOk()).toBe(true);

      if (emptyResult1.isOk() && emptyResult2.isOk()) {
        const empty1 = emptyResult1.value;
        const empty2 = emptyResult2.value;

        // Empty arguments share no statements
        expect(sharesStatementWith(empty1, empty2)).toBe(false);

        // Both are bootstrap arguments
        expect(empty1.isBootstrapArgument()).toBe(true);
        expect(empty2.isBootstrapArgument()).toBe(true);
      }
    });

    it('should handle partial arguments with only premises or conclusions', () => {
      const sharedStatementResult = Statement.create('Shared statement');
      const otherStatementResult = Statement.create('Other statement');

      expect(sharedStatementResult.isOk()).toBe(true);
      expect(otherStatementResult.isOk()).toBe(true);

      if (sharedStatementResult.isOk() && otherStatementResult.isOk()) {
        const sharedStatement = sharedStatementResult.value;
        const otherStatement = otherStatementResult.value;

        const partialArgResult = AtomicArgument.create([sharedStatement]); // Only premise
        const completeArgResult = AtomicArgument.create([sharedStatement], [otherStatement]);

        expect(partialArgResult.isOk()).toBe(true);
        expect(completeArgResult.isOk()).toBe(true);

        if (partialArgResult.isOk() && completeArgResult.isOk()) {
          const partialArg = partialArgResult.value;
          const completeArg = completeArgResult.value;

          // They share a statement
          expect(sharesStatementWith(partialArg, completeArg)).toBe(true);

          // But partial has no conclusions to connect
          expect(partialArg.getConclusionCount()).toBe(0);
          expect(completeArg.getConclusionCount()).toBe(1);
        }
      }
    });
  });

  describe('reconstruction edge cases', () => {
    it('should handle reconstruction with mismatched timestamps', () => {
      const id = AtomicArgumentId.generate();
      const createdAt = 1000;
      const modifiedAt = 500; // Modified before created!

      const result = AtomicArgument.reconstruct(id, [], [], createdAt, modifiedAt);

      // Should fail - timestamps are validated (modified before created)
      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        const arg = result.value;
        expect(arg.getCreatedAt()).toBe(createdAt);
        expect(arg.getModifiedAt()).toBe(modifiedAt);
      }
    });

    it('should handle reconstruction with extreme values', () => {
      const id = AtomicArgumentId.generate();
      const result = AtomicArgument.reconstruct(
        id,
        [],
        [],
        Number.MAX_SAFE_INTEGER,
        0,
        { left: '', right: '' }, // Empty strings
      );

      // Should fail - modified timestamp cannot be before created timestamp
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'modified timestamp cannot be before created timestamp',
        );
      }
    });
  });
});
