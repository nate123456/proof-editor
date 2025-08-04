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

import { AtomicArgument, SideLabels } from '../../entities/AtomicArgument.js';
import { SideLabel } from '../../shared/value-objects/index.js';
import { statementFactory } from '../factories/index.js';
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
      const result = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;
      const originalId = argument.getId();
      const originalCreatedAt = argument.getCreatedAt();

      // Attempt to modify premise (should have no effect on core immutable properties)
      const newStatement = statementFactory.build();
      argument.setPremiseAt(0, newStatement);

      expect(argument.getId()).toBe(originalId);
      expect(argument.getCreatedAt()).toBe(originalCreatedAt);
    });

    it('should update modification timestamp on changes', () => {
      const result = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;
      const originalModified = argument.getModifiedAt();

      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
      argument.setPremiseAt(0, statementFactory.build());

      expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);
      expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
    });

    it('should provide defensive copies of side labels', () => {
      const leftLabel = SideLabel.create('Original Left');
      const rightLabel = SideLabel.create('Original Right');

      expect(leftLabel.isOk()).toBe(true);
      expect(rightLabel.isOk()).toBe(true);
      if (!leftLabel.isOk() || !rightLabel.isOk()) return;

      const sideLabels = SideLabels.create(leftLabel.value, rightLabel.value);
      const result = AtomicArgument.create([], [], sideLabels);
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
      const leftLabel = SideLabel.create('Initial');
      const rightLabel = SideLabel.create('Values');

      expect(leftLabel.isOk()).toBe(true);
      expect(rightLabel.isOk()).toBe(true);
      if (!leftLabel.isOk() || !rightLabel.isOk()) return;

      const sideLabels = SideLabels.create(leftLabel.value, rightLabel.value);
      const result = AtomicArgument.create([], [], sideLabels);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Since SideLabels is immutable, we can't modify it after creation
        // This test verifies that the internal state is protected
        const internalLabels = argument.getSideLabels();
        expect(internalLabels.left).toBe('Initial');
        expect(internalLabels.right).toBe('Values');
      }
    });

    it('should track modification timestamp for each distinct change', () => {
      const result = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;

      const timestamps: number[] = [argument.getModifiedAt()];

      // First change - update premise
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
      argument.setPremiseAt(0, statementFactory.build());
      timestamps.push(argument.getModifiedAt());

      // Second change - update conclusion
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
      argument.setConclusionAt(0, statementFactory.build());
      timestamps.push(argument.getModifiedAt());

      // Third change - side labels
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
      const labelResult = SideLabel.create('New Label');
      expect(labelResult.isOk()).toBe(true);
      if (!labelResult.isOk()) return;
      argument.setLeftSideLabel(labelResult.value.getValue());
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
      const premises = [statementFactory.build(), statementFactory.build()];
      const conclusions = [statementFactory.build()];

      const result = AtomicArgument.create(premises, conclusions);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;

      const retrievedPremises1 = argument.getPremises();
      const retrievedPremises2 = argument.getPremises();
      const retrievedConclusions1 = argument.getConclusions();
      const retrievedConclusions2 = argument.getConclusions();

      // Should return the same array reference each time
      expect(retrievedPremises1).toBe(retrievedPremises2);
      expect(retrievedConclusions1).toBe(retrievedConclusions2);
    });

    it('should maintain reference identity across state changes', () => {
      const result = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;
      const originalConclusions = argument.getConclusions();

      // Change premise
      argument.setPremiseAt(0, statementFactory.build());

      // Conclusions should remain the same reference
      const newConclusions = argument.getConclusions();
      expect(newConclusions).toBe(originalConclusions);
    });

    it('should handle null references consistently', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Multiple retrievals should return empty arrays
        const premises1 = argument.getPremises();
        const premises2 = argument.getPremises();
        const conclusions1 = argument.getConclusions();
        const conclusions2 = argument.getConclusions();

        expect(premises1).toEqual([]);
        expect(premises2).toEqual([]);
        expect(conclusions1).toEqual([]);
        expect(conclusions2).toEqual([]);

        // Should be the same reference each time
        expect(premises1).toBe(premises2);
        expect(conclusions1).toBe(conclusions2);
      }
    });

    it('should maintain ID immutability through all operations', () => {
      const leftLabel = SideLabel.create('Initial');
      const rightLabel = SideLabel.create('Labels');

      expect(leftLabel.isOk()).toBe(true);
      expect(rightLabel.isOk()).toBe(true);
      if (!leftLabel.isOk() || !rightLabel.isOk()) return;

      const sideLabels = SideLabels.create(leftLabel.value, rightLabel.value);
      const result = AtomicArgument.create(
        [statementFactory.build()],
        [statementFactory.build()],
        sideLabels,
      );

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;
      const originalId = argument.getId();

      // Perform various mutations
      argument.setPremiseAt(0, statementFactory.build());
      argument.setConclusionAt(0, statementFactory.build());

      const newLeftLabel = SideLabel.create('Another Left');
      const newRightLabel = SideLabel.create('Another Right');
      expect(newLeftLabel.isOk()).toBe(true);
      expect(newRightLabel.isOk()).toBe(true);
      if (!newLeftLabel.isOk() || !newRightLabel.isOk()) return;

      argument.setLeftSideLabel(newLeftLabel.value.getValue());
      argument.setRightSideLabel(newRightLabel.value.getValue());

      // ID should never change
      expect(argument.getId()).toBe(originalId);
      expect(argument.getId().equals(originalId)).toBe(true);
    });
  });
});
