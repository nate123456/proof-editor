/**
 * Test suite for AtomicArgument connection capabilities
 *
 * Focuses on:
 * - Direct connection detection (premise-to-conclusion)
 * - Bidirectional connection testing
 * - OrderedSet sharing detection
 * - Connection validation for incomplete arguments
 * - Connection method compatibility and shortcuts
 */

import { describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';

describe('Connection Capabilities', () => {
  describe('direct connection testing', () => {
    it('should detect when this conclusion connects to other premise', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const premiseSetRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(premiseSetRef, sharedSetRef);
      const argument2 = AtomicArgument.createComplete(sharedSetRef, conclusionSetRef);

      expect(argument1.canConnectToPremiseOf(argument2)).toBe(true);
      expect(argument2.canConnectToPremiseOf(argument1)).toBe(false);
    });

    it('should detect when this premise connects to other conclusion', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const premiseSetRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(sharedSetRef, conclusionSetRef);
      const argument2 = AtomicArgument.createComplete(premiseSetRef, sharedSetRef);

      expect(argument1.canConnectToConclusionOf(argument2)).toBe(true);
      expect(argument2.canConnectToConclusionOf(argument1)).toBe(false);
    });

    it('should detect bidirectional connections', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const otherSetRef1 = orderedSetIdFactory.build();
      const otherSetRef2 = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(otherSetRef1, sharedSetRef);
      const argument2 = AtomicArgument.createComplete(sharedSetRef, otherSetRef2);

      expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
      expect(argument2.isDirectlyConnectedTo(argument1)).toBe(true);
    });

    it('should handle arguments with no connections', () => {
      const argument1 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );
      const argument2 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      expect(argument1.canConnectToPremiseOf(argument2)).toBe(false);
      expect(argument1.canConnectToConclusionOf(argument2)).toBe(false);
      expect(argument1.isDirectlyConnectedTo(argument2)).toBe(false);
    });

    it('should handle incomplete arguments in connection testing', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const completeArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        sharedSetRef,
      );
      const incompleteArgumentResult = AtomicArgument.create(sharedSetRef);

      expect(incompleteArgumentResult.isOk()).toBe(true);
      if (incompleteArgumentResult.isOk()) {
        expect(completeArgument.canConnectToPremiseOf(incompleteArgumentResult.value)).toBe(true);
        expect(incompleteArgumentResult.value.canConnectToConclusionOf(completeArgument)).toBe(
          true,
        );
      }
    });

    it('should handle bootstrap arguments in connection testing', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const normalArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        sharedSetRef,
      );
      const bootstrapResult = AtomicArgument.create();

      expect(bootstrapResult.isOk()).toBe(true);
      if (bootstrapResult.isOk()) {
        const bootstrapArgument = bootstrapResult.value;
        expect(normalArgument.canConnectToPremiseOf(bootstrapArgument)).toBe(false);
        expect(normalArgument.canConnectToConclusionOf(bootstrapArgument)).toBe(false);
        expect(normalArgument.isDirectlyConnectedTo(bootstrapArgument)).toBe(false);
        expect(bootstrapArgument.isDirectlyConnectedTo(normalArgument)).toBe(false);
      }
    });
  });

  describe('ordered set sharing', () => {
    it('should detect shared premise sets', () => {
      const sharedPremiseRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.create(sharedPremiseRef, orderedSetIdFactory.build());
      const argument2 = AtomicArgument.create(sharedPremiseRef, orderedSetIdFactory.build());

      expect(argument1.isOk()).toBe(true);
      expect(argument2.isOk()).toBe(true);

      if (argument1.isOk() && argument2.isOk()) {
        expect(argument1.value.sharesOrderedSetWith(argument2.value)).toBe(true);
        expect(argument1.value.sharesSetWith(argument2.value)).toBe(true);
      }
    });

    it('should detect shared conclusion sets', () => {
      const sharedConclusionRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.create(orderedSetIdFactory.build(), sharedConclusionRef);
      const argument2 = AtomicArgument.create(orderedSetIdFactory.build(), sharedConclusionRef);

      expect(argument1.isOk()).toBe(true);
      expect(argument2.isOk()).toBe(true);

      if (argument1.isOk() && argument2.isOk()) {
        expect(argument1.value.sharesOrderedSetWith(argument2.value)).toBe(true);
      }
    });

    it('should detect connection sharing', () => {
      const sharedSetRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.create(orderedSetIdFactory.build(), sharedSetRef);
      const argument2 = AtomicArgument.create(sharedSetRef, orderedSetIdFactory.build());

      expect(argument1.isOk()).toBe(true);
      expect(argument2.isOk()).toBe(true);

      if (argument1.isOk() && argument2.isOk()) {
        expect(argument1.value.sharesOrderedSetWith(argument2.value)).toBe(true);
        expect(argument1.value.isDirectlyConnectedTo(argument2.value)).toBe(true);
      }
    });

    it('should handle arguments with no shared sets', () => {
      const argument1 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );
      const argument2 = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      expect(argument1.sharesOrderedSetWith(argument2)).toBe(false);
      expect(argument1.sharesSetWith(argument2)).toBe(false);
    });

    it('should detect shared sets even across different positions', () => {
      const sharedSetRef = orderedSetIdFactory.build();

      // Shared set is conclusion for arg1, premise for arg2
      const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
      const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

      expect(argument1.sharesOrderedSetWith(argument2)).toBe(true);
      expect(argument2.sharesOrderedSetWith(argument1)).toBe(true);
    });

    it('should handle self-reference in sharing detection', () => {
      const argument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        orderedSetIdFactory.build(),
      );

      expect(argument.sharesOrderedSetWith(argument)).toBe(true);
      expect(argument.sharesSetWith(argument)).toBe(true);
    });
  });

  describe('connection method compatibility', () => {
    it('should provide canConnectTo method for simple connection testing', () => {
      const sharedSetRef = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
      const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

      expect(argument1.canConnectTo(argument2)).toBe(true);
      expect(argument2.canConnectTo(argument1)).toBe(false);
    });

    it('should require both conclusion and premise for canConnectTo', () => {
      const incompleteArgument1 = AtomicArgument.create(orderedSetIdFactory.build()); // No conclusion
      const incompleteArgument2 = AtomicArgument.create(undefined, orderedSetIdFactory.build()); // No premise

      expect(incompleteArgument1.isOk()).toBe(true);
      expect(incompleteArgument2.isOk()).toBe(true);

      if (incompleteArgument1.isOk() && incompleteArgument2.isOk()) {
        expect(incompleteArgument1.value.canConnectTo(incompleteArgument2.value)).toBe(false);
      }
    });

    it('should handle edge case of same ordered set for premise and conclusion', () => {
      const sameSetRef = orderedSetIdFactory.build();
      const otherSetRef = orderedSetIdFactory.build();

      // Argument that has same set as both premise and conclusion
      const selfReferentialArg = AtomicArgument.createComplete(sameSetRef, sameSetRef);
      const normalArg = AtomicArgument.createComplete(sameSetRef, otherSetRef);

      // Self-referential argument can connect to anything that has sameSetRef as premise
      expect(selfReferentialArg.canConnectTo(normalArg)).toBe(true);
      expect(normalArg.canConnectTo(selfReferentialArg)).toBe(false);
      expect(selfReferentialArg.canConnectTo(selfReferentialArg)).toBe(true); // Can connect to itself!
    });

    it('should provide helpful connection summary methods', () => {
      const sharedSet1 = orderedSetIdFactory.build();
      const sharedSet2 = orderedSetIdFactory.build();
      const uniqueSet = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(sharedSet1, sharedSet2);
      const argument2 = AtomicArgument.createComplete(sharedSet2, uniqueSet);
      const argument3 = AtomicArgument.createComplete(uniqueSet, sharedSet1);

      // Forward connections
      expect(argument1.canConnectTo(argument2)).toBe(true);
      expect(argument2.canConnectTo(argument3)).toBe(true);
      expect(argument3.canConnectTo(argument1)).toBe(true); // Forms a cycle!

      // Direct connections only
      expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
      expect(argument1.isDirectlyConnectedTo(argument3)).toBe(true); // Both directions
      expect(argument2.isDirectlyConnectedTo(argument3)).toBe(true);
    });
  });
});
