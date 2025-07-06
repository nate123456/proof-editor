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
import { orderedSetIdFactory } from '../factories/index.js';
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
    it('should handle null ordered set references correctly', () => {
      const result = AtomicArgument.create(undefined, undefined);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremiseSet()).toBeNull();
        expect(argument.getConclusionSet()).toBeNull();
        expect(argument.isBootstrapArgument()).toBe(true);
      }
    });

    it('should handle empty side labels correctly', () => {
      const result = AtomicArgument.create(undefined, undefined, {});
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getSideLabels()).toEqual({});
        expect(argument.hasSideLabels()).toBe(false);
      }
    });

    it('should handle undefined ordered set references in connections', () => {
      const completeArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );
      const incompleteArgument = AtomicArgument.create();

      expect(incompleteArgument.isOk()).toBe(true);
      if (incompleteArgument.isOk()) {
        expect(completeArgument.canConnectToPremiseOf(incompleteArgument.value)).toBe(false);
        expect(incompleteArgument.value.canConnectToConclusionOf(completeArgument)).toBe(false);
      }
    });

    it('should handle setting same reference multiple times', () => {
      const sharedRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const originalModified = argument.getModifiedAt();

        // Set premise multiple times with same reference
        argument.setPremiseSetRef(sharedRef);
        const firstModified = argument.getModifiedAt();
        expect(firstModified).toBeGreaterThan(originalModified);

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setPremiseSetRef(sharedRef); // Same reference
        const secondModified = argument.getModifiedAt();
        expect(secondModified).toBe(firstModified); // Should not update
      }
    });

    it('should handle alternating between null and non-null references', () => {
      const ref1 = orderedSetIdFactory.build();
      const ref2 = orderedSetIdFactory.build();
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Start as bootstrap
        expect(argument.isBootstrapArgument()).toBe(true);

        // Add premise
        argument.setPremiseSetRef(ref1);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.hasPremiseSet()).toBe(true);

        // Clear premise
        argument.setPremiseSetRef(null);
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.hasPremiseSet()).toBe(false);

        // Add conclusion
        argument.setConclusionSetRef(ref2);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.hasConclusionSet()).toBe(true);

        // Clear conclusion
        argument.setConclusionSetRef(null);
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.hasConclusionSet()).toBe(false);
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
        // JavaScript timestamps are integers
        expect(argument.getCreatedAt()).toBe(Math.floor(preciseTimestamp));
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
          expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
        }
      }
    });
  });

  describe('side label edge cases', () => {
    it('should handle undefined in side label objects', () => {
      const labelsWithUndefined: any = { left: 'Valid', right: undefined };
      const result = AtomicArgument.create(undefined, undefined, labelsWithUndefined);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const labels = argument.getSideLabels();
        expect(labels.left).toBe('Valid');
        expect(labels.right).toBeUndefined();
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(false);
      }
    });

    it('should handle null values in side labels', () => {
      const labelsWithNull: any = { left: null, right: 'Valid' };
      const result = AtomicArgument.create(undefined, undefined, labelsWithNull);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const labels = argument.getSideLabels();
        expect(labels.left).toBeNull();
        expect(labels.right).toBe('Valid');
      }
    });

    it('should handle extremely long side label strings', () => {
      const veryLongLabel = 'A'.repeat(10000);
      const result = AtomicArgument.create(undefined, undefined, { left: veryLongLabel });
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getSideLabels().left).toBe(veryLongLabel);
        expect(argument.hasLeftSideLabel()).toBe(true);
      }
    });

    it('should handle Unicode in side labels', () => {
      const unicodeLabels = {
        left: '😀🎉✨', // Emojis
        right: '中文日本語', // Chinese/Japanese characters
      };
      const result = AtomicArgument.create(undefined, undefined, unicodeLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getSideLabels()).toEqual(unicodeLabels);
        expect(argument.hasSideLabels()).toBe(true);
      }
    });
  });

  describe('connection edge cases', () => {
    it('should handle self-referential ordered sets', () => {
      const selfRef = orderedSetIdFactory.build();
      const selfReferential = AtomicArgument.createComplete(selfRef, selfRef);

      // Can connect to itself
      expect(selfReferential.canConnectTo(selfReferential)).toBe(true);
      expect(selfReferential.canConnectToPremiseOf(selfReferential)).toBe(true);
      expect(selfReferential.canConnectToConclusionOf(selfReferential)).toBe(true);

      // Would create a direct cycle
      expect(selfReferential.wouldCreateDirectCycle(selfReferential)).toBe(true);

      // Safety validation should fail
      const safetyResult = selfReferential.validateConnectionSafety(selfReferential);
      expect(safetyResult.isErr()).toBe(true);
    });

    it('should handle arguments with all null references', () => {
      const emptyResult1 = AtomicArgument.create();
      const emptyResult2 = AtomicArgument.create();

      expect(emptyResult1.isOk()).toBe(true);
      expect(emptyResult2.isOk()).toBe(true);

      if (emptyResult1.isOk() && emptyResult2.isOk()) {
        const empty1 = emptyResult1.value;
        const empty2 = emptyResult2.value;

        // Cannot connect
        expect(empty1.canConnectTo(empty2)).toBe(false);
        expect(empty1.isDirectlyConnectedTo(empty2)).toBe(false);
        expect(empty1.sharesOrderedSetWith(empty2)).toBe(false);

        // Cannot create cycles
        expect(empty1.wouldCreateDirectCycle(empty2)).toBe(false);
      }
    });

    it('should handle mixed null/non-null reference comparisons', () => {
      const sharedRef = orderedSetIdFactory.build();
      const partialArg = AtomicArgument.create(sharedRef); // Only premise
      const completeArg = AtomicArgument.createComplete(sharedRef, orderedSetIdFactory.build());

      expect(partialArg.isOk()).toBe(true);
      if (partialArg.isOk()) {
        // They share a premise set
        expect(partialArg.value.sharesOrderedSetWith(completeArg)).toBe(true);

        // But partial cannot connect (no conclusion)
        expect(partialArg.value.canConnectTo(completeArg)).toBe(false);

        // Complete can potentially connect to partial's premise
        expect(completeArg.canConnectToPremiseOf(partialArg.value)).toBe(false); // Different premises
      }
    });
  });

  describe('reconstruction edge cases', () => {
    it('should handle reconstruction with mismatched timestamps', () => {
      const id = orderedSetIdFactory.build();
      const createdAt = 1000;
      const modifiedAt = 500; // Modified before created!

      const result = AtomicArgument.reconstruct(id, null, null, createdAt, modifiedAt);

      // Should still succeed - timestamps are not validated
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const arg = result.value;
        expect(arg.getCreatedAt()).toBe(createdAt);
        expect(arg.getModifiedAt()).toBe(modifiedAt);
      }
    });

    it('should handle reconstruction with extreme values', () => {
      const id = orderedSetIdFactory.build();
      const result = AtomicArgument.reconstruct(
        id,
        null,
        null,
        Number.MAX_SAFE_INTEGER,
        0,
        { left: '', right: '' }, // Empty strings
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const arg = result.value;
        expect(arg.getCreatedAt()).toBe(Number.MAX_SAFE_INTEGER);
        expect(arg.getModifiedAt()).toBe(0);
        expect(arg.hasSideLabels()).toBe(false); // Empty strings count as no labels
      }
    });
  });
});
