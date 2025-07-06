/**
 * Test suite for AtomicArgument branching operations
 *
 * Focuses on:
 * - Creating branches from conclusions (forward branching)
 * - Creating branches to premises (backward branching)
 * - Child argument creation patterns
 * - Branching validation and error handling
 * - Complex branching scenarios
 */

import { describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { ValidationError } from '../../shared/result.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

describe('Branching Operations', () => {
  describe('branching from conclusion', () => {
    it('should create branch from conclusion successfully', () => {
      const conclusionSetRef = orderedSetIdFactory.build();
      const parentArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        conclusionSetRef,
      );

      const branchResult = parentArgument.createBranchFromConclusion();
      expect(branchResult.isOk()).toBe(true);

      if (branchResult.isOk()) {
        const branchArgument = branchResult.value;
        expect(branchArgument.getPremiseSet()).toBe(conclusionSetRef);
        expect(branchArgument.getConclusionSet()).toBeNull();
        expect(parentArgument.canConnectToPremiseOf(branchArgument)).toBe(true);
      }
    });

    it('should fail to branch from argument without conclusion', () => {
      const argumentWithoutConclusion = AtomicArgument.create(orderedSetIdFactory.build());
      expect(argumentWithoutConclusion.isOk()).toBe(true);

      if (argumentWithoutConclusion.isOk()) {
        const branchResult = argumentWithoutConclusion.value.createBranchFromConclusion();
        expect(branchResult.isErr()).toBe(true);

        if (branchResult.isErr()) {
          customExpect(branchResult.error).toBeValidationError(
            'Cannot branch from argument without conclusion set',
          );
        }
      }
    });

    it('should create child argument from conclusion', () => {
      const conclusionSetRef = orderedSetIdFactory.build();
      const parentArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        conclusionSetRef,
      );

      const childResult = parentArgument.createChildArgument();
      expect(childResult.isOk()).toBe(true);

      if (childResult.isOk()) {
        const childArgument = childResult.value;
        expect(childArgument.getPremiseSet()).toBe(conclusionSetRef);
        expect(childArgument.getConclusionSet()).toBeNull();
        expect(parentArgument.canConnectToPremiseOf(childArgument)).toBe(true);
      }
    });

    it('should return error when creating child from argument without conclusion', () => {
      const argumentWithoutConclusion = AtomicArgument.create(orderedSetIdFactory.build());
      expect(argumentWithoutConclusion.isOk()).toBe(true);

      if (argumentWithoutConclusion.isOk()) {
        const childResult = argumentWithoutConclusion.value.createChildArgument();
        expect(childResult.isErr()).toBe(true);

        if (childResult.isErr()) {
          expect(childResult.error).toBeInstanceOf(ValidationError);
          expect(childResult.error.message).toBe(
            'Cannot create child argument without conclusion set',
          );
        }
      }
    });

    it('should preserve connection capability after branching', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const parentArgument = AtomicArgument.createComplete(
        orderedSetIdFactory.build(),
        sharedSetRef,
      );

      const branchResult = parentArgument.createBranchFromConclusion();
      expect(branchResult.isOk()).toBe(true);

      if (branchResult.isOk()) {
        const branchArgument = branchResult.value;

        // Add a conclusion to the branch
        const newConclusionRef = orderedSetIdFactory.build();
        branchArgument.setConclusionSetRef(newConclusionRef);

        // Verify connection maintained
        expect(branchArgument.getPremiseSet()).toBe(parentArgument.getConclusionSet());
        expect(parentArgument.canConnectToPremiseOf(branchArgument)).toBe(true);
        expect(branchArgument.canConnectToConclusionOf(parentArgument)).toBe(true);
      }
    });
  });

  describe('branching to premise', () => {
    it('should create branch to premise successfully', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const childArgument = AtomicArgument.createComplete(
        premiseSetRef,
        orderedSetIdFactory.build(),
      );

      const branchResult = childArgument.createBranchToPremise();
      expect(branchResult.isOk()).toBe(true);

      if (branchResult.isOk()) {
        const branchArgument = branchResult.value;
        expect(branchArgument.getPremiseSet()).toBeNull();
        expect(branchArgument.getConclusionSet()).toBe(premiseSetRef);
        expect(branchArgument.canConnectToPremiseOf(childArgument)).toBe(true);
      }
    });

    it('should fail to branch to argument without premise', () => {
      const argumentWithoutPremise = AtomicArgument.create(undefined, orderedSetIdFactory.build());
      expect(argumentWithoutPremise.isOk()).toBe(true);

      if (argumentWithoutPremise.isOk()) {
        const branchResult = argumentWithoutPremise.value.createBranchToPremise();
        expect(branchResult.isErr()).toBe(true);

        if (branchResult.isErr()) {
          customExpect(branchResult.error).toBeValidationError(
            'Cannot branch to argument without premise set',
          );
        }
      }
    });

    it('should create parent argument from premise', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const childArgument = AtomicArgument.createComplete(
        premiseSetRef,
        orderedSetIdFactory.build(),
      );

      const parentResult = childArgument.createParentArgument();
      expect(parentResult.isOk()).toBe(true);

      if (parentResult.isOk()) {
        const parentArgument = parentResult.value;
        expect(parentArgument.getConclusionSet()).toBe(premiseSetRef);
        expect(parentArgument.getPremiseSet()).toBeNull();
        expect(parentArgument.canConnectToPremiseOf(childArgument)).toBe(true);
      }
    });

    it('should preserve connection capability after backward branching', () => {
      const sharedSetRef = orderedSetIdFactory.build();
      const childArgument = AtomicArgument.createComplete(
        sharedSetRef,
        orderedSetIdFactory.build(),
      );

      const branchResult = childArgument.createBranchToPremise();
      expect(branchResult.isOk()).toBe(true);

      if (branchResult.isOk()) {
        const parentArgument = branchResult.value;

        // Add a premise to the parent
        const newPremiseRef = orderedSetIdFactory.build();
        parentArgument.setPremiseSetRef(newPremiseRef);

        // Verify connection maintained
        expect(parentArgument.getConclusionSet()).toBe(childArgument.getPremiseSet());
        expect(parentArgument.canConnectToPremiseOf(childArgument)).toBe(true);
        expect(childArgument.canConnectToConclusionOf(parentArgument)).toBe(true);
      }
    });
  });

  describe('branching scenarios from test data', () => {
    it('should handle simple logical chain branching', () => {
      // Simulate creating chain: premises[0] → conclusions[0] → conclusions[1]
      const premiseRef1 = orderedSetIdFactory.build();
      const conclusionRef1 = orderedSetIdFactory.build();
      const conclusionRef2 = orderedSetIdFactory.build();

      const argument1 = AtomicArgument.createComplete(premiseRef1, conclusionRef1);
      const branchResult = argument1.createBranchFromConclusion();

      expect(branchResult.isOk()).toBe(true);
      if (branchResult.isOk()) {
        const argument2 = branchResult.value;
        argument2.setConclusionSetRef(conclusionRef2);

        expect(argument1.canConnectToPremiseOf(argument2)).toBe(true);
        expect(argument2.isComplete()).toBe(true);
        customExpect([argument1, argument2]).toHaveValidConnections();
      }
    });

    it('should handle complex branching with multiple paths', () => {
      // Create a branching structure:
      //   arg1 → arg2
      //       ▖→ arg3
      const baseRef = orderedSetIdFactory.build();
      const branch1Ref = orderedSetIdFactory.build();
      const _branch2Ref = orderedSetIdFactory.build();
      const conclusion1Ref = orderedSetIdFactory.build();
      const conclusion2Ref = orderedSetIdFactory.build();

      // Base argument
      const arg1 = AtomicArgument.createComplete(baseRef, branch1Ref);

      // First branch
      const branch1Result = arg1.createBranchFromConclusion();
      expect(branch1Result.isOk()).toBe(true);
      if (branch1Result.isOk()) {
        const arg2 = branch1Result.value;
        arg2.setConclusionSetRef(conclusion1Ref);

        // Second branch from same parent
        const branch2Result = arg1.createBranchFromConclusion();
        expect(branch2Result.isOk()).toBe(true);
        if (branch2Result.isOk()) {
          const arg3 = branch2Result.value;
          arg3.setConclusionSetRef(conclusion2Ref);

          // Verify all connections
          expect(arg1.canConnectToPremiseOf(arg2)).toBe(true);
          expect(arg1.canConnectToPremiseOf(arg3)).toBe(true);
          expect(arg2.sharesOrderedSetWith(arg3)).toBe(true); // Both share premise from arg1
          customExpect([arg1, arg2, arg3]).toHaveValidConnections();
        }
      }
    });

    it('should handle bidirectional branching', () => {
      // Create structure: parent → middle → child
      // Then branch backward from middle
      const ref1 = orderedSetIdFactory.build();
      const ref2 = orderedSetIdFactory.build();
      const ref3 = orderedSetIdFactory.build();
      const ref4 = orderedSetIdFactory.build();

      const middle = AtomicArgument.createComplete(ref2, ref3);

      // Branch forward to create child
      const childResult = middle.createBranchFromConclusion();
      expect(childResult.isOk()).toBe(true);

      // Branch backward to create parent
      const parentResult = middle.createBranchToPremise();
      expect(parentResult.isOk()).toBe(true);

      if (childResult.isOk() && parentResult.isOk()) {
        const child = childResult.value;
        const parent = parentResult.value;

        // Complete the arguments
        child.setConclusionSetRef(ref4);
        parent.setPremiseSetRef(ref1);

        // Verify chain connections
        expect(parent.canConnectToPremiseOf(middle)).toBe(true);
        expect(middle.canConnectToPremiseOf(child)).toBe(true);
        customExpect([parent, middle, child]).toHaveValidConnections();
      }
    });
  });
});
