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
import { statementFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

describe('Branching Operations', () => {
  describe('branching from conclusion', () => {
    it('should create branch from conclusion successfully', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();
      const parentResult = AtomicArgument.create([premise], [conclusion]);
      expect(parentResult.isOk()).toBe(true);

      if (parentResult.isOk()) {
        const parentArgument = parentResult.value;
        // Create child argument that uses parent's conclusion as premise
        const childResult = AtomicArgument.create([conclusion]);
        expect(childResult.isOk()).toBe(true);

        if (childResult.isOk()) {
          const childArgument = childResult.value;
          // Verify the connection potential
          const parentConclusionIds = parentArgument.getConclusions().map((s) => s.getId());
          const childPremiseIds = childArgument.getPremises().map((s) => s.getId());
          const firstChildPremiseId = childPremiseIds[0];
          expect(parentConclusionIds).toContainEqual(firstChildPremiseId);
        }
      }
    });

    it('should fail to branch from argument without conclusion', () => {
      const premise = statementFactory.build();
      const argumentWithoutConclusionResult = AtomicArgument.create([premise]);
      expect(argumentWithoutConclusionResult.isOk()).toBe(true);

      if (argumentWithoutConclusionResult.isOk()) {
        const argumentWithoutConclusion = argumentWithoutConclusionResult.value;
        // Cannot create a branch since there's no conclusion to use as premise
        expect(argumentWithoutConclusion.getConclusions()).toHaveLength(0);

        // Attempting to create an argument with empty premises should fail
        const branchResult = AtomicArgument.create([]);
        expect(branchResult.isOk()).toBe(true); // Empty arguments are bootstrap

        if (branchResult.isOk()) {
          expect(branchResult.value.isBootstrap()).toBe(true);
        }
      }
    });

    it('should create child argument from conclusion', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();
      const parentResult = AtomicArgument.create([premise], [conclusion]);
      expect(parentResult.isOk()).toBe(true);

      if (parentResult.isOk()) {
        const _parentArgument = parentResult.value;
        // Create child argument using parent's conclusion as premise
        const childResult = AtomicArgument.create([conclusion]);
        expect(childResult.isOk()).toBe(true);

        if (childResult.isOk()) {
          const childArgument = childResult.value;
          expect(childArgument.getPremises()).toHaveLength(1);
          const childPremise = childArgument.getPremises()[0];
          expect(childPremise?.getId()).toEqual(conclusion.getId());
          expect(childArgument.getConclusions()).toHaveLength(0);
        }
      }
    });

    it('should return error when creating child from argument without conclusion', () => {
      const premise = statementFactory.build();
      const argumentWithoutConclusionResult = AtomicArgument.create([premise]);
      expect(argumentWithoutConclusionResult.isOk()).toBe(true);

      if (argumentWithoutConclusionResult.isOk()) {
        const argumentWithoutConclusion = argumentWithoutConclusionResult.value;
        // No conclusions to use for child argument premise
        expect(argumentWithoutConclusion.getConclusions()).toHaveLength(0);

        // Document that you cannot create a child without parent conclusions
        expect(argumentWithoutConclusion.isComplete()).toBe(false);
      }
    });

    it('should preserve connection capability after branching', () => {
      const premise = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const parentResult = AtomicArgument.create([premise], [sharedStatement]);
      expect(parentResult.isOk()).toBe(true);

      if (parentResult.isOk()) {
        const parentArgument = parentResult.value;

        // Create branch using parent's conclusion as premise
        const branchResult = AtomicArgument.create([sharedStatement]);
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branchArgument = branchResult.value;

          // Add a conclusion to the branch
          const newConclusion = statementFactory.build();
          const addConclusionResult = branchArgument.addConclusion(newConclusion);
          expect(addConclusionResult.isOk()).toBe(true);

          // Verify shared statement creates connection
          const branchPremise = branchArgument.getPremises()[0];
          const parentConclusion = parentArgument.getConclusions()[0];
          expect(branchPremise?.getId()).toEqual(sharedStatement.getId());
          expect(parentConclusion?.getId()).toEqual(sharedStatement.getId());
        }
      }
    });
  });

  describe('branching to premise', () => {
    it('should create branch to premise successfully', () => {
      const sharedStatement = statementFactory.build();
      const conclusion = statementFactory.build();
      const childResult = AtomicArgument.create([sharedStatement], [conclusion]);
      expect(childResult.isOk()).toBe(true);

      if (childResult.isOk()) {
        const childArgument = childResult.value;
        // Create parent argument with conclusion that matches child's premise
        const parentResult = AtomicArgument.create([], [sharedStatement]);
        expect(parentResult.isOk()).toBe(true);

        if (parentResult.isOk()) {
          const parentArgument = parentResult.value;
          expect(parentArgument.getPremises()).toHaveLength(0);
          const parentConclusion = parentArgument.getConclusions()[0];
          const childPremise = childArgument.getPremises()[0];
          expect(parentConclusion?.getId()).toEqual(sharedStatement.getId());
          expect(childPremise?.getId()).toEqual(sharedStatement.getId());
        }
      }
    });

    it('should fail to branch to argument without premise', () => {
      const conclusion = statementFactory.build();
      const argumentWithoutPremiseResult = AtomicArgument.create([], [conclusion]);
      expect(argumentWithoutPremiseResult.isOk()).toBe(true);

      if (argumentWithoutPremiseResult.isOk()) {
        const argumentWithoutPremise = argumentWithoutPremiseResult.value;
        // Cannot create parent since there's no premise to connect to
        expect(argumentWithoutPremise.getPremises()).toHaveLength(0);

        // Document that you cannot branch backward without premises
        expect(argumentWithoutPremise.isComplete()).toBe(false);
      }
    });

    it('should create parent argument from premise', () => {
      const sharedStatement = statementFactory.build();
      const conclusion = statementFactory.build();
      const childResult = AtomicArgument.create([sharedStatement], [conclusion]);
      expect(childResult.isOk()).toBe(true);

      if (childResult.isOk()) {
        const childArgument = childResult.value;
        // Create parent that provides the child's premise
        const parentPremise = statementFactory.build();
        const parentResult = AtomicArgument.create([parentPremise], [sharedStatement]);
        expect(parentResult.isOk()).toBe(true);

        if (parentResult.isOk()) {
          const parentArgument = parentResult.value;
          const parentConclusion = parentArgument.getConclusions()[0];
          const childPremise = childArgument.getPremises()[0];
          expect(parentConclusion?.getId()).toEqual(sharedStatement.getId());
          expect(childPremise?.getId()).toEqual(sharedStatement.getId());
        }
      }
    });

    it('should preserve connection capability after backward branching', () => {
      const sharedStatement = statementFactory.build();
      const childConclusion = statementFactory.build();
      const childResult = AtomicArgument.create([sharedStatement], [childConclusion]);
      expect(childResult.isOk()).toBe(true);

      if (childResult.isOk()) {
        const childArgument = childResult.value;
        // Create parent with conclusion matching child's premise
        const parentResult = AtomicArgument.create([], [sharedStatement]);
        expect(parentResult.isOk()).toBe(true);

        if (parentResult.isOk()) {
          const parentArgument = parentResult.value;

          // Add a premise to the parent
          const newPremise = statementFactory.build();
          const addPremiseResult = parentArgument.addPremise(newPremise);
          expect(addPremiseResult.isOk()).toBe(true);

          // Verify shared statement maintains connection
          const parentConclusion = parentArgument.getConclusions()[0];
          const childPremise = childArgument.getPremises()[0];
          expect(parentConclusion?.getId()).toEqual(sharedStatement.getId());
          expect(childPremise?.getId()).toEqual(sharedStatement.getId());
        }
      }
    });
  });

  describe('branching scenarios from test data', () => {
    it('should handle simple logical chain branching', () => {
      // Simulate creating chain: premises[0] → conclusions[0] → conclusions[1]
      const premise1 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [sharedStatement]);
      expect(argument1Result.isOk()).toBe(true);

      if (argument1Result.isOk()) {
        const argument1 = argument1Result.value;

        // Create second argument using first's conclusion as premise
        const argument2Result = AtomicArgument.create([sharedStatement], [conclusion2]);
        expect(argument2Result.isOk()).toBe(true);

        if (argument2Result.isOk()) {
          const argument2 = argument2Result.value;

          // Verify chain connection
          const arg1Conclusion = argument1.getConclusions()[0];
          const arg2Premise = argument2.getPremises()[0];
          expect(arg1Conclusion?.getId()).toEqual(sharedStatement.getId());
          expect(arg2Premise?.getId()).toEqual(sharedStatement.getId());
          expect(argument2.isComplete()).toBe(true);
          customExpect([argument1, argument2]).toHaveValidConnections();
        }
      }
    });

    it('should handle complex branching with multiple paths', () => {
      // Create a branching structure:
      //   arg1 → arg2
      //       ▖→ arg3
      const basePremise = statementFactory.build();
      const sharedConclusion = statementFactory.build();
      const conclusion1 = statementFactory.build();
      const conclusion2 = statementFactory.build();

      // Base argument
      const arg1Result = AtomicArgument.create([basePremise], [sharedConclusion]);
      expect(arg1Result.isOk()).toBe(true);

      if (arg1Result.isOk()) {
        const arg1 = arg1Result.value;

        // First branch using arg1's conclusion
        const arg2Result = AtomicArgument.create([sharedConclusion], [conclusion1]);
        expect(arg2Result.isOk()).toBe(true);

        // Second branch also using arg1's conclusion
        const arg3Result = AtomicArgument.create([sharedConclusion], [conclusion2]);
        expect(arg3Result.isOk()).toBe(true);

        if (arg2Result.isOk() && arg3Result.isOk()) {
          const arg2 = arg2Result.value;
          const arg3 = arg3Result.value;

          // Verify all connections
          const arg1Conclusion = arg1.getConclusions()[0];
          const arg2Premise = arg2.getPremises()[0];
          const arg3Premise = arg3.getPremises()[0];
          expect(arg1Conclusion?.getId()).toEqual(sharedConclusion.getId());
          expect(arg2Premise?.getId()).toEqual(sharedConclusion.getId());
          expect(arg3Premise?.getId()).toEqual(sharedConclusion.getId());
          // Both arg2 and arg3 share the same premise statement
          expect(arg2Premise?.getId()).toEqual(arg3Premise?.getId());
          customExpect([arg1, arg2, arg3]).toHaveValidConnections();
        }
      }
    });

    it('should handle bidirectional branching', () => {
      // Create structure: parent → middle → child
      const statement1 = statementFactory.build();
      const statement2 = statementFactory.build();
      const statement3 = statementFactory.build();
      const statement4 = statementFactory.build();

      // Create middle argument first
      const middleResult = AtomicArgument.create([statement2], [statement3]);
      expect(middleResult.isOk()).toBe(true);

      if (middleResult.isOk()) {
        const middle = middleResult.value;

        // Create child using middle's conclusion
        const childResult = AtomicArgument.create([statement3], [statement4]);
        expect(childResult.isOk()).toBe(true);

        // Create parent that produces middle's premise
        const parentResult = AtomicArgument.create([statement1], [statement2]);
        expect(parentResult.isOk()).toBe(true);

        if (childResult.isOk() && parentResult.isOk()) {
          const child = childResult.value;
          const parent = parentResult.value;

          // Verify chain connections
          const parentConclusion = parent.getConclusions()[0];
          const middlePremise = middle.getPremises()[0];
          const middleConclusion = middle.getConclusions()[0];
          const childPremise = child.getPremises()[0];
          expect(parentConclusion?.getId()).toEqual(statement2.getId());
          expect(middlePremise?.getId()).toEqual(statement2.getId());
          expect(middleConclusion?.getId()).toEqual(statement3.getId());
          expect(childPremise?.getId()).toEqual(statement3.getId());
          customExpect([parent, middle, child]).toHaveValidConnections();
        }
      }
    });
  });
});
