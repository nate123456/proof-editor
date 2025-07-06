/**
 * Test suite for AtomicArgument string representation
 *
 * Focuses on:
 * - toString() method implementation
 * - String formatting for complete arguments
 * - String formatting for empty/bootstrap arguments
 * - String formatting for partial arguments
 * - Side label inclusion in string representation
 */

import { describe, expect, it } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { OrderedSetId } from '../../shared/value-objects.js';
import { orderedSetIdFactory } from '../factories/index.js';

describe('String Representation', () => {
  describe('toString method', () => {
    it('should represent complete arguments', () => {
      const premiseRefResult = OrderedSetId.fromString('premise-set-1');
      const conclusionRefResult = OrderedSetId.fromString('conclusion-set-1');

      expect(premiseRefResult.isOk()).toBe(true);
      expect(conclusionRefResult.isOk()).toBe(true);

      if (!premiseRefResult.isOk() || !conclusionRefResult.isOk()) return;

      const argument = AtomicArgument.createComplete(
        premiseRefResult.value,
        conclusionRefResult.value,
      );
      const stringRep = argument.toString();

      expect(stringRep).toContain('premise-set-1');
      expect(stringRep).toContain('conclusion-set-1');
      expect(stringRep).toContain('→');
    });

    it('should represent empty arguments', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        expect(stringRep).toContain('empty');
        expect(stringRep).toContain('→');
      }
    });

    it('should represent partial arguments with premise only', () => {
      const premiseRefResult = OrderedSetId.fromString('premise-only');
      expect(premiseRefResult.isOk()).toBe(true);
      if (!premiseRefResult.isOk()) return;

      const premiseRef = premiseRefResult.value;
      const result = AtomicArgument.create(premiseRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        expect(stringRep).toContain('premise-only');
        expect(stringRep).toContain('empty');
        expect(stringRep).toContain('→');
      }
    });

    it('should represent partial arguments with conclusion only', () => {
      const conclusionRefResult = OrderedSetId.fromString('conclusion-only');
      expect(conclusionRefResult.isOk()).toBe(true);
      if (!conclusionRefResult.isOk()) return;

      const conclusionRef = conclusionRefResult.value;
      const result = AtomicArgument.create(undefined, conclusionRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        expect(stringRep).toContain('empty');
        expect(stringRep).toContain('conclusion-only');
        expect(stringRep).toContain('→');
      }
    });

    it('should include side labels in string representation', () => {
      const sideLabels: SideLabels = { left: 'Modus Ponens', right: 'MP' };
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
        sideLabels,
      );

      const stringRep = argument.toString();

      // Should include side labels in the representation
      expect(stringRep).toContain('Modus Ponens');
      expect(stringRep).toContain('MP');
    });

    it('should handle single side label correctly', () => {
      const leftOnlyLabels: SideLabels = { left: 'Left Label Only' };
      const rightOnlyLabels: SideLabels = { right: 'Right Label Only' };

      const leftArg = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
        leftOnlyLabels,
      );

      const rightArg = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
        rightOnlyLabels,
      );

      expect(leftArg.toString()).toContain('Left Label Only');
      expect(rightArg.toString()).toContain('Right Label Only');
    });

    it('should produce consistent format for bootstrap arguments', () => {
      const bootstrap1 = AtomicArgument.createBootstrap();
      const bootstrap2Result = AtomicArgument.create();

      expect(bootstrap2Result.isOk()).toBe(true);
      if (bootstrap2Result.isOk()) {
        const bootstrap2 = bootstrap2Result.value;

        // Both should produce similar string representations
        const str1 = bootstrap1.toString();
        const str2 = bootstrap2.toString();

        expect(str1).toContain('empty');
        expect(str1).toContain('→');
        expect(str2).toContain('empty');
        expect(str2).toContain('→');

        // Format should be consistent
        expect(str1.split('→').length).toBe(str2.split('→').length);
      }
    });

    it('should handle special characters in IDs correctly', () => {
      const specialIdResult = OrderedSetId.fromString('special-chars-!@#$%');
      expect(specialIdResult.isOk()).toBe(true);
      if (!specialIdResult.isOk()) return;

      const result = AtomicArgument.create(specialIdResult.value);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        // Should preserve special characters
        expect(stringRep).toContain('special-chars-!@#$%');
      }
    });

    it('should format long IDs appropriately', () => {
      const longId = 'very-long-ordered-set-id-that-might-need-special-handling-in-display';
      const longIdResult = OrderedSetId.fromString(longId);
      expect(longIdResult.isOk()).toBe(true);
      if (!longIdResult.isOk()) return;

      const argument = AtomicArgument.createComplete(
        longIdResult.value,
        orderedSetIdFactory.build(),
      );

      const stringRep = argument.toString();

      // Should include the full ID
      expect(stringRep).toContain(longId);
      expect(stringRep).toContain('→');
    });

    it('should maintain consistent arrow formatting', () => {
      const testCases = [
        AtomicArgument.createBootstrap(),
        AtomicArgument.create(orderedSetIdFactory.build()),
        AtomicArgument.create(undefined, orderedSetIdFactory.build()),
        AtomicArgument.createComplete(orderedSetIdFactory.build(), orderedSetIdFactory.build()),
      ];

      testCases.forEach((arg) => {
        const strRep = 'isOk' in arg && arg.isOk() ? arg.value.toString() : arg.toString();

        // All should contain exactly one arrow
        const arrowCount = (strRep.match(/→/g) || []).length;
        expect(arrowCount).toBe(1);

        // Arrow should have consistent spacing
        expect(strRep).toMatch(/\s*→\s*/);
      });
    });
  });
});
