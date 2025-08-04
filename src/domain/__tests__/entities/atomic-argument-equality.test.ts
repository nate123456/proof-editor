import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { statementFactory } from '../factories/index.js';
import { statementArbitrary } from './atomic-argument-test-utils.js';

describe('Equality and Comparison', () => {
  describe('identity-based equality', () => {
    it('should implement identity-based equality', () => {
      const premises = [statementFactory.build(), statementFactory.build()];
      const conclusions = [statementFactory.build()];

      const result1 = AtomicArgument.create(premises, conclusions);
      const result2 = AtomicArgument.create(premises, conclusions);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const argument1 = result1.value;
        const argument2 = result2.value;

        // Same properties but different identities
        expect(argument1.equals(argument2)).toBe(false);
        expect(argument1.equals(argument1)).toBe(true);
        expect(argument2.equals(argument2)).toBe(true);
      }
    });

    it('should maintain equality after modifications', () => {
      const premises = [statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const originalSelf = argument;

        // Modify the argument
        argument.updateSideLabels({ left: 'Modified' });

        // Identity should remain the same
        expect(argument.equals(originalSelf)).toBe(true);
        expect(originalSelf.equals(argument)).toBe(true);
      }
    });

    it('should handle different argument configurations', () => {
      // Complete arguments
      const complete1Result = AtomicArgument.create(
        [statementFactory.build()],
        [statementFactory.build()],
      );
      const complete2Result = AtomicArgument.create(
        [statementFactory.build()],
        [statementFactory.build()],
      );

      // Incomplete arguments
      const incomplete1Result = AtomicArgument.create([statementFactory.build()], []);
      const incomplete2Result = AtomicArgument.create([], [statementFactory.build()]);

      expect(complete1Result.isOk()).toBe(true);
      expect(complete2Result.isOk()).toBe(true);
      expect(incomplete1Result.isOk()).toBe(true);
      expect(incomplete2Result.isOk()).toBe(true);

      if (
        complete1Result.isOk() &&
        complete2Result.isOk() &&
        incomplete1Result.isOk() &&
        incomplete2Result.isOk()
      ) {
        const complete1 = complete1Result.value;
        const complete2 = complete2Result.value;
        const incomplete1 = incomplete1Result.value;
        const incomplete2 = incomplete2Result.value;

        // Each instance should only equal itself
        expect(complete1.equals(complete1)).toBe(true);
        expect(complete1.equals(complete2)).toBe(false);
        expect(incomplete1.equals(incomplete1)).toBe(true);
        expect(incomplete1.equals(incomplete2)).toBe(false);
      }
    });
  });

  describe('equality properties', () => {
    it('should satisfy reflexivity property', () => {
      const result1 = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);
      const result2 = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (!result1.isOk() || !result2.isOk()) return;

      const argument1 = result1.value;
      const argument2 = result2.value;

      // Each argument should equal itself
      expect(argument1.equals(argument1)).toBe(true);
      expect(argument2.equals(argument2)).toBe(true);
    });

    it('should satisfy symmetry property', () => {
      // Since equality is identity-based, only same object equals itself
      const result = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;

      // Self-equality is symmetric
      expect(argument.equals(argument)).toBe(true);
    });

    it('should handle null/undefined comparison gracefully', () => {
      const result = AtomicArgument.create([statementFactory.build()], [statementFactory.build()]);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const argument = result.value;

      // Should handle comparison with null/undefined gracefully
      expect(argument.equals(null as any)).toBe(false);
      expect(argument.equals(undefined as any)).toBe(false);
    });
  });

  describe('property-based equality tests', () => {
    it('should maintain identity-based equality across property variations', () => {
      fc.assert(
        fc.property(
          fc.array(statementArbitrary, { minLength: 0, maxLength: 5 }),
          fc.array(statementArbitrary, { minLength: 0, maxLength: 5 }),
          (premises, conclusions) => {
            const argument1Result = AtomicArgument.create(premises, conclusions);
            const argument2Result = AtomicArgument.create(premises, conclusions);

            if (argument1Result.isOk() && argument2Result.isOk()) {
              const argument1 = argument1Result.value;
              const argument2 = argument2Result.value;

              // Identity-based equality: same instance equals itself, different instances don't
              expect(argument1.equals(argument1)).toBe(true);
              expect(argument2.equals(argument2)).toBe(true);
              expect(argument1.equals(argument2)).toBe(false);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain equality after side label modifications', () => {
      fc.assert(
        fc.property(
          fc.array(statementArbitrary, { minLength: 1, maxLength: 3 }),
          fc.array(statementArbitrary, { minLength: 1, maxLength: 3 }),
          fc.string(),
          fc.string(),
          (premises, conclusions, leftLabel, rightLabel) => {
            const argumentResult = AtomicArgument.create(premises, conclusions);

            if (argumentResult.isOk()) {
              const argument = argumentResult.value;
              const originalArgument = argument;

              // Modify side labels
              argument.updateSideLabels({ left: leftLabel, right: rightLabel });

              // Identity should remain the same
              expect(argument.equals(originalArgument)).toBe(true);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
