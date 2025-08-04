import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBranchToPremise } from '../../services/AtomicArgumentBranchingService.js';
import {
  canConnectAt,
  connectConclusionToPremise,
  findConnectionsTo,
  sharesStatementWith,
  validateConnectionSafety,
} from '../../services/AtomicArgumentConnectionService.js';
import { ValidationError } from '../../shared/result.js';
import { AtomicArgumentId } from '../../shared/value-objects/index.js';
import { AtomicArgument } from '../AtomicArgument.js';
import { Statement } from '../Statement.js';

describe('AtomicArgument Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  const createTestStatement = (content: string): Statement => {
    const result = Statement.create(content);
    if (result.isErr()) throw new Error(`Failed to create test statement: ${result.error.message}`);
    return result.value;
  };

  describe('Creation and Basic Properties', () => {
    it('should create empty bootstrap argument', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual([]);
        expect(argument.getConclusions()).toEqual([]);
        expect(argument.getPremiseCount()).toBe(0);
        expect(argument.getConclusionCount()).toBe(0);
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.isEmpty()).toBe(true);
        expect(argument.isComplete()).toBe(false);
        expect(argument.getCreatedAt()).toBe(FIXED_TIMESTAMP);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP);
        expect(argument.getSideLabels()).toEqual({});
        expect(argument.hasSideLabels()).toBe(false);
      }
    });

    it('should create argument with premises only', () => {
      const premise1 = createTestStatement('All men are mortal');
      const premise2 = createTestStatement('Socrates is a man');
      const premises = [premise1, premise2];

      const result = AtomicArgument.create(premises);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual(premises);
        expect(argument.getConclusions()).toEqual([]);
        expect(argument.getPremiseCount()).toBe(2);
        expect(argument.getConclusionCount()).toBe(0);
        expect(argument.getPremiseAt(0)).toBe(premise1);
        expect(argument.getPremiseAt(1)).toBe(premise2);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
      }
    });

    it('should create argument with conclusions only', () => {
      const conclusion = createTestStatement('Therefore, Socrates is mortal');
      const conclusions = [conclusion];

      const result = AtomicArgument.create([], conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual([]);
        expect(argument.getConclusions()).toEqual(conclusions);
        expect(argument.getPremiseCount()).toBe(0);
        expect(argument.getConclusionCount()).toBe(1);
        expect(argument.getConclusionAt(0)).toBe(conclusion);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
      }
    });

    it('should create complete argument with premises and conclusions', () => {
      const premise = createTestStatement('All men are mortal');
      const conclusion = createTestStatement('Therefore, Socrates is mortal');

      const result = AtomicArgument.create([premise], [conclusion]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual([premise]);
        expect(argument.getConclusions()).toEqual([conclusion]);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(true);
      }
    });

    it('should create bootstrap argument using static method', () => {
      const argument = AtomicArgument.createBootstrap();

      expect(argument.getPremises()).toEqual([]);
      expect(argument.getConclusions()).toEqual([]);
      expect(argument.isBootstrapArgument()).toBe(true);
      expect(argument.isBootstrap()).toBe(true);
      expect(argument.canPopulate()).toBe(true);
    });
  });

  describe('Statement Management', () => {
    it('should add premises and conclusions', () => {
      const argument = AtomicArgument.createBootstrap();
      const premise = createTestStatement('All men are mortal');
      const conclusion = createTestStatement('Socrates is mortal');

      const addPremiseResult = argument.addPremise(premise);
      expect(addPremiseResult.isOk()).toBe(true);
      expect(argument.getPremiseCount()).toBe(1);
      expect(argument.getPremiseAt(0)).toBe(premise);

      const addConclusionResult = argument.addConclusion(conclusion);
      expect(addConclusionResult.isOk()).toBe(true);
      expect(argument.getConclusionCount()).toBe(1);
      expect(argument.getConclusionAt(0)).toBe(conclusion);

      expect(argument.isComplete()).toBe(true);
    });

    it('should set statements at specific positions', () => {
      const premise1 = createTestStatement('Original premise');
      const premise2 = createTestStatement('New premise');
      const result = AtomicArgument.create([premise1]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const setPremiseResult = argument.setPremiseAt(0, premise2);
        expect(setPremiseResult.isOk()).toBe(true);
        expect(argument.getPremiseAt(0)).toBe(premise2);
      }
    });

    it('should remove statements at specific positions', () => {
      const premise1 = createTestStatement('Premise 1');
      const premise2 = createTestStatement('Premise 2');
      const result = AtomicArgument.create([premise1, premise2]);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const removeResult = argument.removePremiseAt(0);
        expect(removeResult.isOk()).toBe(true);
        if (removeResult.isOk()) {
          expect(removeResult.value).toBe(premise1);
        }
        expect(argument.getPremiseCount()).toBe(1);
        expect(argument.getPremiseAt(0)).toBe(premise2);
      }
    });

    it('should validate position bounds for setting statements', () => {
      const argument = AtomicArgument.createBootstrap();
      const statement = createTestStatement('Test statement');

      const invalidPremiseResult = argument.setPremiseAt(0, statement);
      expect(invalidPremiseResult.isErr()).toBe(true);
      if (invalidPremiseResult.isErr()) {
        expect(invalidPremiseResult.error).toBeInstanceOf(ValidationError);
        expect(invalidPremiseResult.error.message).toBe('Invalid premise position');
      }

      const invalidConclusionResult = argument.setConclusionAt(5, statement);
      expect(invalidConclusionResult.isErr()).toBe(true);
    });
  });

  describe('Connection Logic - The Core Domain Truth', () => {
    it('should find connections between arguments at specific positions', () => {
      const sharedStatement = createTestStatement('Socrates is mortal');
      const premise = createTestStatement('All men are mortal');

      const arg1Result = AtomicArgument.create([premise], [sharedStatement]);
      const arg2Result = AtomicArgument.create([sharedStatement], []);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        const connections = findConnectionsTo(arg1, arg2);
        expect(connections).toHaveLength(1);

        const connection = connections[0];
        if (connection) {
          expect(connection.statement).toBe(sharedStatement);
          expect(connection.fromConclusionPosition).toBe(0);
          expect(connection.toPremisePosition.getValue()).toBe(0);
        }
      }
    });

    it('should check if arguments can connect at specific positions', () => {
      const sharedStatement = createTestStatement('Socrates is mortal');
      const otherStatement = createTestStatement('Plato is wise');

      const arg1Result = AtomicArgument.create([], [sharedStatement, otherStatement]);
      const arg2Result = AtomicArgument.create([sharedStatement], []);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        // Should connect at positions (0, 0) because they share the same statement
        expect(canConnectAt(arg1, 0, arg2, 0)).toBe(true);

        // Should not connect at positions (1, 0) because different statements
        expect(canConnectAt(arg1, 1, arg2, 0)).toBe(false);
      }
    });

    it('should establish connections through shared statement references', () => {
      const sharedStatement = createTestStatement('Socrates is mortal');
      const premise = createTestStatement('All men are mortal');

      const arg1Result = AtomicArgument.create([premise], [createTestStatement('Temp')]);
      const arg2Result = AtomicArgument.create([createTestStatement('Temp')], []);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        const connectResult = connectConclusionToPremise(arg1, 0, arg2, 0, sharedStatement);
        expect(connectResult.isOk()).toBe(true);

        // After connection, both should reference the same statement object
        expect(arg1.getConclusionAt(0)).toBe(sharedStatement);
        expect(arg2.getPremiseAt(0)).toBe(sharedStatement);
        expect(arg1.getConclusionAt(0)).toBe(arg2.getPremiseAt(0)); // Same object reference
      }
    });

    it('should detect direct connections between arguments', () => {
      const sharedStatement = createTestStatement('Socrates is mortal');

      const arg1Result = AtomicArgument.create([], [sharedStatement]);
      const arg2Result = AtomicArgument.create([sharedStatement], []);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        // Check if they share statements (direct connection check removed)
        expect(sharesStatementWith(arg1, arg2)).toBe(true);
        expect(sharesStatementWith(arg2, arg1)).toBe(true);
      }
    });

    it('should detect shared statements between arguments', () => {
      const sharedStatement = createTestStatement('Socrates is mortal');
      const otherStatement = createTestStatement('Plato is wise');

      const arg1Result = AtomicArgument.create([sharedStatement], [otherStatement]);
      const arg2Result = AtomicArgument.create([otherStatement], []);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        expect(sharesStatementWith(arg1, arg2)).toBe(true);
      }
    });
  });

  describe('Branching Operations', () => {
    it('should create branch from conclusion at specific position', () => {
      const conclusion1 = createTestStatement('Socrates is mortal');
      const conclusion2 = createTestStatement('Plato is wise');

      const parentResult = AtomicArgument.create([], [conclusion1, conclusion2]);
      expect(parentResult.isOk()).toBe(true);

      if (parentResult.isOk()) {
        const parent = parentResult.value;

        const branchResult = parent.createBranchFromConclusion(1);
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branch = branchResult.value;
          expect(branch.getPremiseCount()).toBe(1);
          expect(branch.getPremiseAt(0)).toBe(conclusion2);
          expect(branch.getConclusionCount()).toBe(0);
        }
      }
    });

    it('should create branch to premise at specific position', () => {
      const premise1 = createTestStatement('All men are mortal');
      const premise2 = createTestStatement('Socrates is a man');

      const childResult = AtomicArgument.create([premise1, premise2], []);
      expect(childResult.isOk()).toBe(true);

      if (childResult.isOk()) {
        const child = childResult.value;

        const branchResult = createBranchToPremise(child, 0);
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branch = branchResult.value;
          expect(branch.getPremiseCount()).toBe(0);
          expect(branch.getConclusionCount()).toBe(1);
          expect(branch.getConclusionAt(0)).toBe(premise1);
        }
      }
    });

    it('should validate branching position bounds', () => {
      const argument = AtomicArgument.createBootstrap();

      const invalidConclusionBranch = argument.createBranchFromConclusion(0);
      expect(invalidConclusionBranch.isErr()).toBe(true);

      const invalidPremiseBranch = createBranchToPremise(argument, 0);
      expect(invalidPremiseBranch.isErr()).toBe(true);
    });
  });

  describe('Connection Safety Validation', () => {
    it('should prevent self-connections', () => {
      const argument = AtomicArgument.createBootstrap();

      const result = validateConnectionSafety(argument, argument);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Cannot connect argument to itself');
      }
    });

    it('should require conclusions in source argument', () => {
      const source = AtomicArgument.createBootstrap();
      const targetResult = AtomicArgument.create([createTestStatement('premise')]);
      expect(targetResult.isOk()).toBe(true);

      if (targetResult.isOk()) {
        const target = targetResult.value;

        const result = validateConnectionSafety(source, target);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Source argument has no conclusions');
        }
      }
    });

    it('should require premises in target argument', () => {
      const sourceResult = AtomicArgument.create([], [createTestStatement('conclusion')]);
      const target = AtomicArgument.createBootstrap();
      expect(sourceResult.isOk()).toBe(true);

      if (sourceResult.isOk()) {
        const source = sourceResult.value;

        const result = validateConnectionSafety(source, target);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Target argument has no premises');
        }
      }
    });

    it('should detect potential cycles', () => {
      const sharedStatement = createTestStatement('Socrates is mortal');

      const arg1Result = AtomicArgument.create([], [sharedStatement]);
      const arg2Result = AtomicArgument.create([sharedStatement], [sharedStatement]);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        // arg1 -> arg2 is valid (arg1.conclusion matches arg2.premise)
        const forwardResult = validateConnectionSafety(arg1, arg2);
        expect(forwardResult.isOk()).toBe(true);

        // arg2 -> arg1 would create cycle (arg2.conclusion matches arg1.premise... but arg1 has no premises)
        // Actually, let's test a real cycle scenario
        const arg1ModifiedResult = AtomicArgument.create([sharedStatement], [sharedStatement]);
        expect(arg1ModifiedResult.isOk()).toBe(true);

        if (arg1ModifiedResult.isOk()) {
          const arg1Modified = arg1ModifiedResult.value;

          // Now both args have premise=conclusion=sharedStatement, so they'd create cycles
          const cycleResult = validateConnectionSafety(arg1Modified, arg2);
          expect(cycleResult.isErr()).toBe(true);
          if (cycleResult.isErr()) {
            expect(cycleResult.error.message).toBe('Connection would create direct cycle');
          }
        }
      }
    });
  });

  describe('Side Labels', () => {
    it('should manage side labels correctly', () => {
      const argument = AtomicArgument.createBootstrap();

      expect(argument.hasSideLabels()).toBe(false);
      expect(argument.hasLeftSideLabel()).toBe(false);
      expect(argument.hasRightSideLabel()).toBe(false);

      const setLeftResult = argument.setLeftSideLabel('Modus Ponens');
      expect(setLeftResult.isOk()).toBe(true);
      expect(argument.hasLeftSideLabel()).toBe(true);
      expect(argument.hasSideLabels()).toBe(true);

      const setRightResult = argument.setRightSideLabel('Rule 1');
      expect(setRightResult.isOk()).toBe(true);
      expect(argument.hasRightSideLabel()).toBe(true);

      const labels = argument.getSideLabels();
      expect(labels.left).toBe('Modus Ponens');
      expect(labels.right).toBe('Rule 1');

      const clearLeftResult = argument.setLeftSideLabel(undefined);
      expect(clearLeftResult.isOk()).toBe(true);
      expect(argument.hasLeftSideLabel()).toBe(false);
      expect(argument.hasSideLabels()).toBe(true); // Still has right label
    });

    it('should update all side labels at once', () => {
      const argument = AtomicArgument.createBootstrap();
      const newLabels = { left: 'Logic Rule', right: 'Reference 1' };

      const updateResult = argument.updateSideLabels(newLabels);
      expect(updateResult.isOk()).toBe(true);

      const labels = argument.getSideLabels();
      expect(labels).toEqual(newLabels);
    });
  });

  describe('Equality and Identity', () => {
    it('should implement correct equality based on ID', () => {
      const statement = createTestStatement('Test statement');
      const arg1Result = AtomicArgument.create([statement]);
      const arg2Result = AtomicArgument.create([statement]);

      expect(arg1Result.isOk()).toBe(true);
      expect(arg2Result.isOk()).toBe(true);

      if (arg1Result.isOk() && arg2Result.isOk()) {
        const arg1 = arg1Result.value;
        const arg2 = arg2Result.value;

        expect(arg1.equals(arg2)).toBe(false); // Different IDs
        expect(arg1.equals(arg1)).toBe(true); // Same object
        expect(arg1.equals(null)).toBe(false);
        expect(arg1.equals(undefined)).toBe(false);
      }
    });
  });

  describe('String Representation', () => {
    it('should provide meaningful string representation', () => {
      const premise = createTestStatement('All men are mortal');
      const conclusion = createTestStatement('Socrates is mortal');

      const argResult = AtomicArgument.create([premise], [conclusion]);
      expect(argResult.isOk()).toBe(true);

      if (argResult.isOk()) {
        const arg = argResult.value;
        const str = arg.toString();

        expect(str).toContain('AtomicArgument');
        expect(str).toContain('premises(1)');
        expect(str).toContain('conclusions(1)');
        expect(str).not.toContain('(bootstrap)');
      }

      // Test bootstrap representation
      const bootstrap = AtomicArgument.createBootstrap();
      const bootstrapStr = bootstrap.toString();
      expect(bootstrapStr).toContain('premises(0)');
      expect(bootstrapStr).toContain('conclusions(0)');
      expect(bootstrapStr).toContain('(bootstrap)');
    });

    it('should include side labels in string representation', () => {
      const argument = AtomicArgument.createBootstrap();
      argument.setLeftSideLabel('MP');
      argument.setRightSideLabel('R1');

      const str = argument.toString();
      expect(str).toContain('[MP|R1]');
    });
  });

  describe('Property-Based Testing', () => {
    const validStatementContent = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    it('should maintain Statement array immutability in getters', () => {
      fc.assert(
        fc.property(
          fc.array(validStatementContent, { minLength: 1, maxLength: 5 }),
          fc.array(validStatementContent, { minLength: 1, maxLength: 5 }),
          (premiseContents, conclusionContents) => {
            const premises = premiseContents.map((content) => createTestStatement(content));
            const conclusions = conclusionContents.map((content) => createTestStatement(content));

            const result = AtomicArgument.create(premises, conclusions);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;
              const gotPremises = argument.getPremises();
              const gotConclusions = argument.getConclusions();

              // Test that returned arrays are truly immutable
              // The arrays should be frozen/readonly, so this should throw
              let _premiseError: Error | null = null;
              let _conclusionError: Error | null = null;

              try {
                // @ts-expect-error - Testing immutability
                gotPremises.push(createTestStatement('Should not affect internal'));
              } catch (e) {
                _premiseError = e as Error;
              }

              try {
                // @ts-expect-error - Testing immutability
                gotConclusions.push(createTestStatement('Should not affect internal'));
              } catch (e) {
                _conclusionError = e as Error;
              }

              // The arrays should be immutable, so we expect errors or unchanged lengths
              expect(gotPremises.length).toBe(premises.length);
              expect(gotConclusions.length).toBe(conclusions.length);
              expect(argument.getPremiseCount()).toBe(premises.length);
              expect(argument.getConclusionCount()).toBe(conclusions.length);
            }
          },
        ),
      );
    });

    it('should correctly identify connections across various argument configurations', () => {
      fc.assert(
        fc.property(
          fc.array(validStatementContent, { minLength: 1, maxLength: 3 }),
          fc.array(validStatementContent, { minLength: 1, maxLength: 3 }),
          fc.array(validStatementContent, { minLength: 1, maxLength: 3 }),
          (shared, unique1, unique2) => {
            const sharedStatements = shared.map((content) => createTestStatement(content));
            const unique1Statements = unique1.map((content) => createTestStatement(content));
            const unique2Statements = unique2.map((content) => createTestStatement(content));

            // Create arg1 with shared statements as conclusions
            const arg1Conclusions = [...sharedStatements, ...unique1Statements];
            const arg1Result = AtomicArgument.create([], arg1Conclusions);

            // Create arg2 with shared statements as premises
            const arg2Premises = [...sharedStatements, ...unique2Statements];
            const arg2Result = AtomicArgument.create(arg2Premises, []);

            expect(arg1Result.isOk()).toBe(true);
            expect(arg2Result.isOk()).toBe(true);

            if (arg1Result.isOk() && arg2Result.isOk()) {
              const arg1 = arg1Result.value;
              const arg2 = arg2Result.value;

              const connections = findConnectionsTo(arg1, arg2);

              // Should find exactly as many connections as shared statements
              expect(connections.length).toBe(sharedStatements.length);

              // Each connection should involve a shared statement
              connections.forEach((conn) => {
                expect(sharedStatements).toContain(conn.statement);
              });
            }
          },
        ),
      );
    });
  });

  describe('Reconstruction', () => {
    it('should reconstruct from valid parameters', () => {
      const id = AtomicArgumentId.generate();
      const premise = createTestStatement('Test premise');
      const conclusion = createTestStatement('Test conclusion');
      const createdAt = 1000;
      const modifiedAt = 2000;
      const sideLabels = { left: 'Test', right: 'Label' };

      const result = AtomicArgument.reconstruct(
        id,
        [premise],
        [conclusion],
        createdAt,
        modifiedAt,
        sideLabels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getId()).toBe(id);
        expect(argument.getPremises()).toEqual([premise]);
        expect(argument.getConclusions()).toEqual([conclusion]);
        expect(argument.getCreatedAt()).toBe(createdAt);
        expect(argument.getModifiedAt()).toBe(modifiedAt);
        expect(argument.getSideLabels()).toEqual(sideLabels);
      }
    });

    it('should validate timestamps during reconstruction', () => {
      const id = AtomicArgumentId.generate();

      const negativeCreatedResult = AtomicArgument.reconstruct(id, [], [], -1, 0);
      expect(negativeCreatedResult.isErr()).toBe(true);

      const negativeModifiedResult = AtomicArgument.reconstruct(id, [], [], 0, -1);
      expect(negativeModifiedResult.isErr()).toBe(true);

      const invalidOrderResult = AtomicArgument.reconstruct(id, [], [], 2000, 1000);
      expect(invalidOrderResult.isErr()).toBe(true);
      if (invalidOrderResult.isErr()) {
        expect(invalidOrderResult.error.message).toBe(
          'modified timestamp cannot be before created timestamp',
        );
      }
    });
  });
});
