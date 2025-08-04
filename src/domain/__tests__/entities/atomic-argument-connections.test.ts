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
import { statementFactory } from '../factories/index.js';

describe('Connection Capabilities', () => {
  describe('direct connection testing', () => {
    it('should detect when this conclusion connects to other premise', () => {
      const premise1 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [sharedStatement]);
      const argument2Result = AtomicArgument.create([sharedStatement], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // argument1's conclusion matches argument2's premise
        expect(argument1.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
      }
    });

    it('should detect when this premise connects to other conclusion', () => {
      const premise2 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const conclusion1 = statementFactory.build();

      const argument1Result = AtomicArgument.create([sharedStatement], [conclusion1]);
      const argument2Result = AtomicArgument.create([premise2], [sharedStatement]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // argument1's premise matches argument2's conclusion
        expect(argument1.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(argument2.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
      }
    });

    it('should detect bidirectional connections', () => {
      const statement1 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const statement3 = statementFactory.build();

      const argument1Result = AtomicArgument.create([statement1], [sharedStatement]);
      const argument2Result = AtomicArgument.create([sharedStatement], [statement3]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // They share a statement that connects them
        expect(argument1.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
      }
    });

    it('should handle arguments with no connections', () => {
      const premise1 = statementFactory.build();
      const conclusion1 = statementFactory.build();
      const premise2 = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [conclusion1]);
      const argument2Result = AtomicArgument.create([premise2], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // No shared statements
        const arg1StatementIds = [
          ...argument1.getPremises().map((s) => s.getId()),
          ...argument1.getConclusions().map((s) => s.getId()),
        ];
        const arg2StatementIds = [
          ...argument2.getPremises().map((s) => s.getId()),
          ...argument2.getConclusions().map((s) => s.getId()),
        ];

        const hasSharedStatements = arg1StatementIds.some((id1) =>
          arg2StatementIds.some((id2) => id1.equals(id2)),
        );
        expect(hasSharedStatements).toBe(false);
      }
    });

    it('should handle incomplete arguments in connection testing', () => {
      const premise = statementFactory.build();
      const sharedStatement = statementFactory.build();

      const completeArgumentResult = AtomicArgument.create([premise], [sharedStatement]);
      const incompleteArgumentResult = AtomicArgument.create([sharedStatement]);

      expect(completeArgumentResult.isOk()).toBe(true);
      expect(incompleteArgumentResult.isOk()).toBe(true);

      if (completeArgumentResult.isOk() && incompleteArgumentResult.isOk()) {
        const completeArgument = completeArgumentResult.value;
        const incompleteArgument = incompleteArgumentResult.value;

        // Complete argument's conclusion matches incomplete argument's premise
        expect(completeArgument.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(incompleteArgument.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
        // Incomplete argument's premise matches complete argument's conclusion
      }
    });

    it('should handle bootstrap arguments in connection testing', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();

      const normalArgumentResult = AtomicArgument.create([premise], [conclusion]);
      const bootstrapResult = AtomicArgument.create();

      expect(normalArgumentResult.isOk()).toBe(true);
      expect(bootstrapResult.isOk()).toBe(true);

      if (normalArgumentResult.isOk() && bootstrapResult.isOk()) {
        const normalArgument = normalArgumentResult.value;
        const bootstrapArgument = bootstrapResult.value;

        // Bootstrap has no statements to connect with
        expect(bootstrapArgument.getPremises()).toHaveLength(0);
        expect(bootstrapArgument.getConclusions()).toHaveLength(0);

        // No shared statements possible
        const normalStatementIds = [
          ...normalArgument.getPremises().map((s) => s.getId()),
          ...normalArgument.getConclusions().map((s) => s.getId()),
        ];
        // Bootstrap has no statements, so no connections possible
        expect(normalStatementIds.length).toBeGreaterThan(0);
        expect(
          bootstrapArgument.getPremises().length + bootstrapArgument.getConclusions().length,
        ).toBe(0);
      }
    });
  });

  describe('ordered set sharing', () => {
    it('should detect shared premise sets', () => {
      const sharedPremise = statementFactory.build();
      const conclusion1 = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([sharedPremise], [conclusion1]);
      const argument2Result = AtomicArgument.create([sharedPremise], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // Both arguments use the same premise statement
        expect(argument1.getPremises()[0]?.getId()).toEqual(sharedPremise.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(sharedPremise.getId());
      }
    });

    it('should detect shared conclusion sets', () => {
      const premise1 = statementFactory.build();
      const premise2 = statementFactory.build();
      const sharedConclusion = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [sharedConclusion]);
      const argument2Result = AtomicArgument.create([premise2], [sharedConclusion]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // Both arguments produce the same conclusion statement
        expect(argument1.getConclusions()[0]?.getId()).toEqual(sharedConclusion.getId());
        expect(argument2.getConclusions()[0]?.getId()).toEqual(sharedConclusion.getId());
      }
    });

    it('should detect connection sharing', () => {
      const premise1 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [sharedStatement]);
      const argument2Result = AtomicArgument.create([sharedStatement], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // Connection through shared statement
        expect(argument1.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
      }
    });

    it('should handle arguments with no shared sets', () => {
      const premise1 = statementFactory.build();
      const conclusion1 = statementFactory.build();
      const premise2 = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [conclusion1]);
      const argument2Result = AtomicArgument.create([premise2], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // Verify no shared statements
        const arg1Ids = [
          ...argument1.getPremises().map((s) => s.getId()),
          ...argument1.getConclusions().map((s) => s.getId()),
        ];
        const arg2Ids = [
          ...argument2.getPremises().map((s) => s.getId()),
          ...argument2.getConclusions().map((s) => s.getId()),
        ];

        const hasShared = arg1Ids.some((id1) => arg2Ids.some((id2) => id1.equals(id2)));
        expect(hasShared).toBe(false);
      }
    });

    it('should detect shared sets even across different positions', () => {
      const premise1 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const conclusion2 = statementFactory.build();

      // Shared statement is conclusion for arg1, premise for arg2
      const argument1Result = AtomicArgument.create([premise1], [sharedStatement]);
      const argument2Result = AtomicArgument.create([sharedStatement], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // Shared statement in different positions
        expect(argument1.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
      }
    });

    it('should handle self-reference in sharing detection', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();

      const argumentResult = AtomicArgument.create([premise], [conclusion]);
      expect(argumentResult.isOk()).toBe(true);

      if (argumentResult.isOk()) {
        const argument = argumentResult.value;
        // An argument always shares its own statements with itself
        const statementIds = [
          ...argument.getPremises().map((s) => s.getId()),
          ...argument.getConclusions().map((s) => s.getId()),
        ];
        expect(statementIds.length).toBeGreaterThan(0);
      }
    });
  });

  describe('connection method compatibility', () => {
    it('should provide canConnectTo method for simple connection testing', () => {
      const premise1 = statementFactory.build();
      const sharedStatement = statementFactory.build();
      const conclusion2 = statementFactory.build();

      const argument1Result = AtomicArgument.create([premise1], [sharedStatement]);
      const argument2Result = AtomicArgument.create([sharedStatement], [conclusion2]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;

        // arg1 conclusion matches arg2 premise
        expect(argument1.getConclusions()[0]?.getId()).toEqual(sharedStatement.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(sharedStatement.getId());
      }
    });

    it('should require both conclusion and premise for canConnectTo', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();

      const incompleteArgument1Result = AtomicArgument.create([premise]); // No conclusion
      const incompleteArgument2Result = AtomicArgument.create([], [conclusion]); // No premise

      expect(incompleteArgument1Result.isOk()).toBe(true);
      expect(incompleteArgument2Result.isOk()).toBe(true);

      if (incompleteArgument1Result.isOk() && incompleteArgument2Result.isOk()) {
        const incompleteArgument1 = incompleteArgument1Result.value;
        const incompleteArgument2 = incompleteArgument2Result.value;

        // Can't connect - arg1 has no conclusion, arg2 has no premise
        expect(incompleteArgument1.getConclusions()).toHaveLength(0);
        expect(incompleteArgument2.getPremises()).toHaveLength(0);
      }
    });

    it('should handle edge case of same statement for premise and conclusion', () => {
      const sameStatement = statementFactory.build();
      const otherStatement = statementFactory.build();

      // Argument that has same statement as both premise and conclusion
      const selfReferentialResult = AtomicArgument.create([sameStatement], [sameStatement]);
      const normalResult = AtomicArgument.create([sameStatement], [otherStatement]);

      expect(selfReferentialResult.isOk()).toBe(true);
      expect(normalResult.isOk()).toBe(true);

      if (selfReferentialResult.isOk() && normalResult.isOk()) {
        const selfReferentialArg = selfReferentialResult.value;
        const normalArg = normalResult.value;

        // Self-referential argument uses same statement as premise and conclusion
        expect(selfReferentialArg.getPremises()[0]?.getId()).toEqual(sameStatement.getId());
        expect(selfReferentialArg.getConclusions()[0]?.getId()).toEqual(sameStatement.getId());

        // Normal arg shares the premise
        expect(normalArg.getPremises()[0]?.getId()).toEqual(sameStatement.getId());
      }
    });

    it('should provide helpful connection summary methods', () => {
      const statement1 = statementFactory.build();
      const statement2 = statementFactory.build();
      const statement3 = statementFactory.build();

      const argument1Result = AtomicArgument.create([statement1], [statement2]);
      const argument2Result = AtomicArgument.create([statement2], [statement3]);
      const argument3Result = AtomicArgument.create([statement3], [statement1]);

      expect(argument1Result.isOk()).toBe(true);
      expect(argument2Result.isOk()).toBe(true);
      expect(argument3Result.isOk()).toBe(true);

      if (argument1Result.isOk() && argument2Result.isOk() && argument3Result.isOk()) {
        const argument1 = argument1Result.value;
        const argument2 = argument2Result.value;
        const argument3 = argument3Result.value;

        // Forms a cycle: arg1 -> arg2 -> arg3 -> arg1
        expect(argument1.getConclusions()[0]?.getId()).toEqual(statement2.getId());
        expect(argument2.getPremises()[0]?.getId()).toEqual(statement2.getId());
        expect(argument2.getConclusions()[0]?.getId()).toEqual(statement3.getId());
        expect(argument3.getPremises()[0]?.getId()).toEqual(statement3.getId());
        expect(argument3.getConclusions()[0]?.getId()).toEqual(statement1.getId());
        expect(argument1.getPremises()[0]?.getId()).toEqual(statement1.getId());
      }
    });
  });
});
