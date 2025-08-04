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

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { statementFactory } from '../factories/index.js';

describe('String Representation', () => {
  describe('toString method', () => {
    it('should represent complete arguments', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();

      const result = AtomicArgument.create([premise], [conclusion]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        expect(stringRep).toContain('premises(1)');
        expect(stringRep).toContain('conclusions(1)');
        expect(stringRep).toContain('→');
      }
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
      const premise = statementFactory.build();
      const result = AtomicArgument.create([premise], []);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        expect(stringRep).toContain('premises(1)');
        expect(stringRep).toContain('conclusions(0)');
        expect(stringRep).toContain('→');
      }
    });

    it('should represent partial arguments with conclusion only', () => {
      const conclusion = statementFactory.build();
      const result = AtomicArgument.create([], [conclusion]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        expect(stringRep).toContain('premises(0)');
        expect(stringRep).toContain('conclusions(1)');
        expect(stringRep).toContain('→');
      }
    });

    it('should include side labels in string representation', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();
      const result = AtomicArgument.create([premise], [conclusion]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const updateResult = argument.updateSideLabels({ left: 'Modus Ponens', right: 'MP' });
        expect(updateResult.isOk()).toBe(true);

        const stringRep = argument.toString();

        // Should include side labels in the representation
        expect(stringRep).toContain('Modus Ponens');
        expect(stringRep).toContain('MP');
      }
    });

    it('should handle single side label correctly', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();

      const leftResult = AtomicArgument.create([premise], [conclusion]);
      const rightResult = AtomicArgument.create([premise], [conclusion]);

      expect(leftResult.isOk()).toBe(true);
      expect(rightResult.isOk()).toBe(true);

      if (leftResult.isOk() && rightResult.isOk()) {
        const leftArg = leftResult.value;
        const rightArg = rightResult.value;

        leftArg.updateSideLabels({ left: 'Left Label Only' });
        rightArg.updateSideLabels({ right: 'Right Label Only' });

        expect(leftArg.toString()).toContain('Left Label Only');
        expect(rightArg.toString()).toContain('Right Label Only');
      }
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

    it('should handle arguments with multiple statements', () => {
      const premises = [statementFactory.build(), statementFactory.build()];
      const conclusions = [
        statementFactory.build(),
        statementFactory.build(),
        statementFactory.build(),
      ];

      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();

        // Should show correct counts
        expect(stringRep).toContain('premises(2)');
        expect(stringRep).toContain('conclusions(3)');
      }
    });

    it('should include argument ID in string representation', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();

      const result = AtomicArgument.create([premise], [conclusion]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const stringRep = argument.toString();
        const argId = argument.getId().getValue();

        // Should include the argument ID
        expect(stringRep).toContain(`AtomicArgument(${argId})`);
        expect(stringRep).toContain('→');
      }
    });

    it('should maintain consistent arrow formatting', () => {
      const testCases = [
        AtomicArgument.createBootstrap(),
        AtomicArgument.create([statementFactory.build()], []),
        AtomicArgument.create([], [statementFactory.build()]),
        AtomicArgument.create([statementFactory.build()], [statementFactory.build()]),
      ];

      testCases.forEach((argOrResult) => {
        const arg = 'isOk' in argOrResult && argOrResult.isOk() ? argOrResult.value : argOrResult;
        const strRep = arg.toString();

        // All should contain exactly one arrow
        const arrowCount = (strRep.match(/→/g) || []).length;
        expect(arrowCount).toBe(1);

        // Arrow should have consistent spacing
        expect(strRep).toMatch(/\s*→\s*/);
      });
    });
  });
});
