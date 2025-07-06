/**
 * Test suite for AtomicArgument connection safety and validation
 *
 * Focuses on:
 * - Cycle detection (direct and indirect)
 * - Connection safety validation
 * - Self-connection prevention
 * - Incomplete argument connection handling
 * - Connection requirement validation
 */

import { describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

describe('Connection Safety and Validation', () => {
  describe('cycle detection', () => {
    it('should detect direct cycles', () => {
      const setRef1 = orderedSetIdFactory.build();
      const setRef2 = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(setRef1, setRef2);
      const argument2 = AtomicArgument.createComplete(setRef2, setRef1);

      expect(argument1.wouldCreateDirectCycle(argument2)).toBe(true);
      expect(argument2.wouldCreateDirectCycle(argument1)).toBe(true);
    });

    it('should not detect cycles in non-connecting arguments', () => {
      const argument1 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );
      const argument2 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      expect(argument1.wouldCreateDirectCycle(argument2)).toBe(false);
      expect(argument2.wouldCreateDirectCycle(argument1)).toBe(false);
    });

    it('should not detect cycles in one-way connections', () => {
      const sharedSetRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
      const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

      expect(argument1.wouldCreateDirectCycle(argument2)).toBe(false);
      expect(argument2.wouldCreateDirectCycle(argument1)).toBe(false);
    });

    it('should detect self-referential cycles', () => {
      const selfRef = orderedSetIdFactory.build();

      // Argument where conclusion feeds back to premise
      const selfReferentialArg = AtomicArgument.createComplete(selfRef, selfRef);

      // This argument creates a cycle with itself
      expect(selfReferentialArg.wouldCreateDirectCycle(selfReferentialArg)).toBe(true);
    });

    it('should handle incomplete arguments in cycle detection', () => {
      const sharedRef = orderedSetIdFactory.build();

      const completeArg = AtomicArgument.createComplete(sharedRef, orderedSetIdFactory.build());
      const incompleteResult = AtomicArgument.create(orderedSetIdFactory.build());

      expect(incompleteResult.isOk()).toBe(true);
      if (incompleteResult.isOk()) {
        const incompleteArg = incompleteResult.value;

        // Incomplete arguments cannot create cycles
        expect(completeArg.wouldCreateDirectCycle(incompleteArg)).toBe(false);
        expect(incompleteArg.wouldCreateDirectCycle(completeArg)).toBe(false);
      }
    });
  });

  describe('connection safety validation', () => {
    it('should validate safe connections', () => {
      const sharedSetRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
      const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

      const validationResult = argument1.validateConnectionSafety(argument2);
      expect(validationResult.isOk()).toBe(true);

      if (validationResult.isOk()) {
        expect(validationResult.value).toBe(true);
      }
    });

    it('should reject self-connection', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      const validationResult = argument.validateConnectionSafety(argument);
      expect(validationResult.isErr()).toBe(true);

      if (validationResult.isErr()) {
        customExpect(validationResult.error).toBeValidationError(
          'Cannot connect argument to itself',
        );
      }
    });

    it('should reject connection from argument without conclusion', () => {
      const argumentWithoutConclusion = AtomicArgument.create(orderedSetIdFactory.build());
      const targetArgument = AtomicArgument.create(orderedSetIdFactory.build());

      expect(argumentWithoutConclusion.isOk()).toBe(true);
      expect(targetArgument.isOk()).toBe(true);

      if (argumentWithoutConclusion.isOk() && targetArgument.isOk()) {
        const validationResult = argumentWithoutConclusion.value.validateConnectionSafety(
          targetArgument.value,
        );
        expect(validationResult.isErr()).toBe(true);

        if (validationResult.isErr()) {
          customExpect(validationResult.error).toBeValidationError(
            'Source argument has no conclusion set',
          );
        }
      }
    });

    it('should reject connection to argument without premise', () => {
      const sourceArgument = AtomicArgument.create(undefined, orderedSetIdFactory.build());
      const targetWithoutPremise = AtomicArgument.create(undefined, orderedSetIdFactory.build());

      expect(sourceArgument.isOk()).toBe(true);
      expect(targetWithoutPremise.isOk()).toBe(true);

      if (sourceArgument.isOk() && targetWithoutPremise.isOk()) {
        const validationResult = sourceArgument.value.validateConnectionSafety(
          targetWithoutPremise.value,
        );
        expect(validationResult.isErr()).toBe(true);

        if (validationResult.isErr()) {
          customExpect(validationResult.error).toBeValidationError(
            'Target argument has no premise set',
          );
        }
      }
    });

    it('should reject connections that would create direct cycles', () => {
      const setRef1 = orderedSetIdFactory.build();
      const setRef2 = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(setRef1, setRef2);
      const argument2 = AtomicArgument.createComplete(setRef2, setRef1);

      const validationResult = argument1.validateConnectionSafety(argument2);
      expect(validationResult.isErr()).toBe(true);

      if (validationResult.isErr()) {
        customExpect(validationResult.error).toBeValidationError(
          'Connection would create direct cycle',
        );
      }
    });

    it('should validate non-connecting arguments as safe', () => {
      const argument1 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );
      const argument2 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      const validationResult = argument1.validateConnectionSafety(argument2);
      expect(validationResult.isOk()).toBe(true);

      if (validationResult.isOk()) {
        expect(validationResult.value).toBe(false); // Safe but no connection possible
      }
    });

    it('should handle bootstrap arguments in validation', () => {
      const bootstrapResult = AtomicArgument.create();
      const normalArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      expect(bootstrapResult.isOk()).toBe(true);
      if (bootstrapResult.isOk()) {
        const bootstrap = bootstrapResult.value;

        // Bootstrap as source (no conclusion)
        const result1 = bootstrap.validateConnectionSafety(normalArgument);
        expect(result1.isErr()).toBe(true);
        if (result1.isErr()) {
          expect(result1.error.message).toContain('no conclusion set');
        }

        // Bootstrap as target (no premise)
        const result2 = normalArgument.validateConnectionSafety(bootstrap);
        expect(result2.isErr()).toBe(true);
        if (result2.isErr()) {
          expect(result2.error.message).toContain('no premise set');
        }
      }
    });

    it('should validate complex connection scenarios', () => {
      const ref1 = orderedSetIdFactory.build();
      const ref2 = orderedSetIdFactory.build();
      const ref3 = orderedSetIdFactory.build();
      const ref4 = orderedSetIdFactory.build();

      // Create a potential three-argument chain
      const arg1 = AtomicArgument.createComplete(ref1, ref2);
      const arg2 = AtomicArgument.createComplete(ref2, ref3);
      const arg3 = AtomicArgument.createComplete(ref3, ref4);
      const arg4 = AtomicArgument.createComplete(ref4, ref1); // Would complete a cycle

      // First three connections are safe
      expect(arg1.validateConnectionSafety(arg2).isOk()).toBe(true);
      expect(arg2.validateConnectionSafety(arg3).isOk()).toBe(true);

      // But this would create a cycle through the chain
      const cycleResult = arg3.validateConnectionSafety(arg4);
      expect(cycleResult.isOk()).toBe(true); // Direct validation passes

      // The cycle detection only checks direct cycles, not transitive ones
      expect(arg3.wouldCreateDirectCycle(arg4)).toBe(false);
      expect(arg4.wouldCreateDirectCycle(arg1)).toBe(true); // This is the direct cycle
    });
  });
});
