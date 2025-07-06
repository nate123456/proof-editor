/**
 * Test suite for AtomicArgument immutability verification
 *
 * Focuses on:
 * - Core immutable properties (ID, creation timestamp)
 * - Modification timestamp tracking
 * - Defensive copying of mutable data
 * - Reference identity consistency
 * - State protection and encapsulation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { FIXED_TIMESTAMP } from './atomic-argument-test-utils.js';

describe('Immutability Verification', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('core immutable properties', () => {
    it('should maintain immutability of ID and timestamps', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      const originalId = argument.getId();
      const originalCreatedAt = argument.getCreatedAt();

      // Attempt to modify (should have no effect on core immutable properties)
      argument.setPremiseSetRef(orderedSetIdFactory.build());

      expect(argument.getId()).toBe(originalId);
      expect(argument.getCreatedAt()).toBe(originalCreatedAt);
    });

    it('should update modification timestamp on changes', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      const originalModified = argument.getModifiedAt();

      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
      argument.setPremiseSetRef(orderedSetIdFactory.build());

      expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);
      expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
    });

    it('should provide defensive copies of side labels', () => {
      const sideLabels: SideLabels = { left: 'Original Left', right: 'Original Right' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const retrievedLabels = argument.getSideLabels();

        // Modify the retrieved object
        retrievedLabels.left = 'Modified';
        retrievedLabels.right = 'Also Modified';

        // Original should be unchanged
        const freshLabels = argument.getSideLabels();
        expect(freshLabels.left).toBe('Original Left');
        expect(freshLabels.right).toBe('Original Right');
      }
    });

    it('should protect against external side label mutations', () => {
      const sideLabels: SideLabels = { left: 'Initial', right: 'Values' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Modify the original object after creation
        sideLabels.left = 'Externally Modified';
        sideLabels.right = 'Should Not Affect';

        // Internal state should remain unchanged
        const internalLabels = argument.getSideLabels();
        expect(internalLabels.left).toBe('Initial');
        expect(internalLabels.right).toBe('Values');
      }
    });

    it('should track modification timestamp for each distinct change', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      const timestamps: number[] = [argument.getModifiedAt()];

      // First change
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
      argument.setPremiseSetRef(orderedSetIdFactory.build());
      timestamps.push(argument.getModifiedAt());

      // Second change
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
      argument.setConclusionSetRef(orderedSetIdFactory.build());
      timestamps.push(argument.getModifiedAt());

      // Third change (side labels)
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
      argument.updateSideLabels({ left: 'New Label' });
      timestamps.push(argument.getModifiedAt());

      // Verify all timestamps are different and increasing
      expect(timestamps).toEqual([
        FIXED_TIMESTAMP,
        FIXED_TIMESTAMP + 1000,
        FIXED_TIMESTAMP + 2000,
        FIXED_TIMESTAMP + 3000,
      ]);
    });
  });

  describe('reference immutability', () => {
    it('should maintain consistent reference identity', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();

      const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);

      const retrievedPremise1 = argument.getPremiseSet();
      const retrievedPremise2 = argument.getPremiseSet();
      const retrievedConclusion1 = argument.getConclusionSet();
      const retrievedConclusion2 = argument.getConclusionSet();

      expect(retrievedPremise1).toBe(retrievedPremise2);
      expect(retrievedConclusion1).toBe(retrievedConclusion2);
      expect(retrievedPremise1).toBe(premiseSetRef);
      expect(retrievedConclusion1).toBe(conclusionSetRef);
    });

    it('should maintain reference identity across state changes', () => {
      const initialPremiseRef = orderedSetIdFactory.build();
      const initialConclusionRef = orderedSetIdFactory.build();
      const newPremiseRef = orderedSetIdFactory.build();

      const argument = AtomicArgument.createComplete(initialPremiseRef, initialConclusionRef);

      // Change premise reference
      argument.setPremiseSetRef(newPremiseRef);

      // Conclusion should remain the same reference
      expect(argument.getConclusionSet()).toBe(initialConclusionRef);
      expect(argument.getPremiseSet()).toBe(newPremiseRef);
      expect(argument.getPremiseSet()).not.toBe(initialPremiseRef);
    });

    it('should handle null references consistently', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Multiple retrievals of null references
        const premise1 = argument.getPremiseSet();
        const premise2 = argument.getPremiseSet();
        const conclusion1 = argument.getConclusionSet();
        const conclusion2 = argument.getConclusionSet();

        expect(premise1).toBeNull();
        expect(premise2).toBeNull();
        expect(conclusion1).toBeNull();
        expect(conclusion2).toBeNull();
      }
    });

    it('should maintain ID immutability through all operations', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
        { left: 'Initial', right: 'Labels' },
      );

      const originalId = argument.getId();

      // Perform various mutations
      argument.setPremiseSetRef(orderedSetIdFactory.build());
      argument.setConclusionSetRef(orderedSetIdFactory.build());
      argument.updateSideLabels({ left: 'New', right: 'Labels' });
      argument.setLeftSideLabel('Another Left');
      argument.setRightSideLabel('Another Right');

      // ID should never change
      expect(argument.getId()).toBe(originalId);
      expect(argument.getId().equals(originalId)).toBe(true);
    });
  });
});
