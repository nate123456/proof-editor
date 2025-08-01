/**
 * Comprehensive test suite for AtomicArgument entity - critical reasoning component
 *
 * Priority: CRITICAL (Core entity for logical argument construction)
 * Demonstrates:
 * - AtomicArgument creation and validation patterns
 * - Statement-based connection logic
 * - Immutability verification and state transitions
 * - Property-based testing for complex scenarios
 * - Connection safety and cycle detection
 * - Bootstrap argument handling
 * - Strategy analysis functionality
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { ValidationError } from '../../shared/result.js';
import { SideLabel } from '../../shared/value-objects/index.js';
import { atomicArgumentIdFactory, statementFactory } from '../factories/index.js';

// Property-based test generators for AtomicArgument domain
const validSideLabelsArbitrary = fc
  .record({
    left: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    right: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  })
  .map((labels) => {
    const result: SideLabels = {};
    if (labels.left !== null) result.left = labels.left;
    if (labels.right !== null) result.right = labels.right;
    return result;
  });

// Fast-check arbitraries for factory replacements
const statementArbitrary = fc.constant(null).map(() => statementFactory.build());

describe('AtomicArgument Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  // Helper function to create test statements
  const createTestStatements = (count: number) => {
    return Array.from({ length: count }, () => statementFactory.build());
  };

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('AtomicArgument Creation', () => {
    describe('basic creation patterns', () => {
      it('should create empty bootstrap arguments', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getId()).toBeDefined();
          expect(argument.getPremises()).toHaveLength(0);
          expect(argument.getConclusions()).toHaveLength(0);
          expect(argument.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(argument.isBootstrapArgument()).toBe(true);
          expect(argument.isEmpty()).toBe(true);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should create arguments with premises only', () => {
        const premises = createTestStatements(2);
        const result = AtomicArgument.create(premises);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremises()).toEqual(premises);
          expect(argument.getConclusions()).toHaveLength(0);
          expect(argument.getPremiseCount()).toBe(2);
          expect(argument.getConclusionCount()).toBe(0);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should create arguments with conclusions only', () => {
        const conclusions = createTestStatements(1);
        const result = AtomicArgument.create([], conclusions);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremises()).toHaveLength(0);
          expect(argument.getConclusions()).toEqual(conclusions);
          expect(argument.getPremiseCount()).toBe(0);
          expect(argument.getConclusionCount()).toBe(1);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should create complete arguments with premises and conclusions', () => {
        const premises = createTestStatements(2);
        const conclusions = createTestStatements(1);
        const result = AtomicArgument.create(premises, conclusions);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremises()).toEqual(premises);
          expect(argument.getConclusions()).toEqual(conclusions);
          expect(argument.getPremiseCount()).toBe(2);
          expect(argument.getConclusionCount()).toBe(1);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(true);
        }
      });

      it('should create arguments with side labels', () => {
        const leftLabel = SideLabel.create('Modus Ponens');
        const rightLabel = SideLabel.create('MP');
        expect(leftLabel.isOk()).toBe(true);
        expect(rightLabel.isOk()).toBe(true);

        if (leftLabel.isOk() && rightLabel.isOk()) {
          const sideLabels: SideLabels = { left: leftLabel.value, right: rightLabel.value };
          const result = AtomicArgument.create([], [], sideLabels);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            const argument = result.value;
            expect(argument.getSideLabels()).toEqual({ left: 'Modus Ponens', right: 'MP' });
            expect(argument.hasLeftSideLabel()).toBe(true);
            expect(argument.hasRightSideLabel()).toBe(true);
            expect(argument.hasSideLabels()).toBe(true);
          }
        }
      });
    });

    describe('createBootstrap method', () => {
      it('should create bootstrap arguments with no validation', () => {
        const argument = AtomicArgument.createBootstrap();

        expect(argument.getId()).toBeDefined();
        expect(argument.getPremises()).toHaveLength(0);
        expect(argument.getConclusions()).toHaveLength(0);
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.isEmpty()).toBe(true);
        expect(argument.isComplete()).toBe(false);
        expect(argument.canPopulate()).toBe(true);
      });
    });
  });

  describe('AtomicArgument Reconstruction', () => {
    it('should reconstruct arguments with all parameters', () => {
      const id = atomicArgumentIdFactory.build();
      const premises = createTestStatements(2);
      const conclusions = createTestStatements(1);
      const createdAt = FIXED_TIMESTAMP - 1000;
      const modifiedAt = FIXED_TIMESTAMP;
      const sideLabels = { left: 'Reconstructed', right: 'Test' };

      const result = AtomicArgument.reconstruct(
        id,
        premises,
        conclusions,
        createdAt,
        modifiedAt,
        sideLabels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getId()).toBe(id);
        expect(argument.getPremises()).toEqual(premises);
        expect(argument.getConclusions()).toEqual(conclusions);
        expect(argument.getCreatedAt()).toBe(createdAt);
        expect(argument.getModifiedAt()).toBe(modifiedAt);
        expect(argument.getSideLabels()).toEqual(sideLabels);
      }
    });

    it('should reject invalid timestamps during reconstruction', () => {
      const id = atomicArgumentIdFactory.build();
      const premises = createTestStatements(1);
      const conclusions = createTestStatements(1);
      const createdAt = FIXED_TIMESTAMP;
      const modifiedAt = FIXED_TIMESTAMP - 1000; // Before created

      const result = AtomicArgument.reconstruct(id, premises, conclusions, createdAt, modifiedAt);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain(
          'modified timestamp cannot be before created timestamp',
        );
      }
    });
  });

  describe('Statement Collection Management', () => {
    describe('premise manipulation', () => {
      it('should add premise statements', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const premise = statementFactory.build();
          const originalModified = argument.getModifiedAt();

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const addResult = argument.addPremise(premise);
          expect(addResult.isOk()).toBe(true);

          expect(argument.getPremises()).toContain(premise);
          expect(argument.getPremiseCount()).toBe(1);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });

      it('should remove premise statements', () => {
        const premises = createTestStatements(2);
        const result = AtomicArgument.create(premises);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const originalModified = argument.getModifiedAt();
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

          const removeResult = argument.removePremiseAt(0);
          expect(removeResult.isOk()).toBe(true);

          expect(argument.getPremiseCount()).toBe(1);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });

      it('should set premise at specific index', () => {
        const premises = createTestStatements(2);
        const result = AtomicArgument.create(premises);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const newPremise = statementFactory.build();
          const originalModified = argument.getModifiedAt();

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const setResult = argument.setPremiseAt(0, newPremise);
          expect(setResult.isOk()).toBe(true);

          expect(argument.getPremiseAt(0)).toBe(newPremise);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });
    });

    describe('conclusion manipulation', () => {
      it('should add conclusion statements', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const conclusion = statementFactory.build();
          const originalModified = argument.getModifiedAt();

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const addResult = argument.addConclusion(conclusion);
          expect(addResult.isOk()).toBe(true);

          expect(argument.getConclusions()).toContain(conclusion);
          expect(argument.getConclusionCount()).toBe(1);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });

      it('should remove conclusion statements', () => {
        const conclusions = createTestStatements(2);
        const result = AtomicArgument.create([], conclusions);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const originalModified = argument.getModifiedAt();

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const removeResult = argument.removeConclusionAt(0);
          expect(removeResult.isOk()).toBe(true);

          expect(argument.getConclusionCount()).toBe(1);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });

      it('should set conclusion at specific index', () => {
        const conclusions = createTestStatements(2);
        const result = AtomicArgument.create([], conclusions);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const newConclusion = statementFactory.build();
          const originalModified = argument.getModifiedAt();

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const setResult = argument.setConclusionAt(0, newConclusion);
          expect(setResult.isOk()).toBe(true);

          expect(argument.getConclusionAt(0)).toBe(newConclusion);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
        }
      });
    });

    describe('statement state transitions', () => {
      it('should handle bootstrap → partial → complete transitions', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          // Bootstrap state
          expect(argument.isBootstrapArgument()).toBe(true);
          expect(argument.isEmpty()).toBe(true);
          expect(argument.isComplete()).toBe(false);

          // Add premise → partial state
          const premise = statementFactory.build();
          const addPremiseResult = argument.addPremise(premise);
          expect(addPremiseResult.isOk()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);

          // Add conclusion → complete state
          const conclusion = statementFactory.build();
          const addConclusionResult = argument.addConclusion(conclusion);
          expect(addConclusionResult.isOk()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(true);
        }
      });

      it('should handle complete → partial → bootstrap transitions', () => {
        const premises = createTestStatements(1);
        const conclusions = createTestStatements(1);
        const result = AtomicArgument.create(premises, conclusions);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          // Complete state
          expect(argument.isComplete()).toBe(true);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isBootstrapArgument()).toBe(false);

          // Remove premise → partial state
          const removePremiseResult = argument.removePremiseAt(0);
          expect(removePremiseResult.isOk()).toBe(true);
          expect(argument.isComplete()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isBootstrapArgument()).toBe(false);

          // Remove conclusion → bootstrap state
          const removeConclusionResult = argument.removeConclusionAt(0);
          expect(removeConclusionResult.isOk()).toBe(true);
          expect(argument.isComplete()).toBe(false);
          expect(argument.isEmpty()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(true);
        }
      });
    });
  });

  describe('Side Labels Management', () => {
    it('should set and get side labels', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const leftLabelResult = argument.setLeftSideLabel('Left Label');
        expect(leftLabelResult.isOk()).toBe(true);

        const rightLabelResult = argument.setRightSideLabel('Right Label');
        expect(rightLabelResult.isOk()).toBe(true);

        expect(argument.getSideLabels()).toEqual({
          left: 'Left Label',
          right: 'Right Label',
        });
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(true);
        expect(argument.hasSideLabels()).toBe(true);
      }
    });

    it('should clear side labels', () => {
      const leftLabel = SideLabel.create('Left');
      const rightLabel = SideLabel.create('Right');
      expect(leftLabel.isOk()).toBe(true);
      expect(rightLabel.isOk()).toBe(true);

      if (leftLabel.isOk() && rightLabel.isOk()) {
        const sideLabels: SideLabels = { left: leftLabel.value, right: rightLabel.value };
        const result = AtomicArgument.create([], [], sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          const clearLeftResult = argument.setLeftSideLabel(undefined);
          expect(clearLeftResult.isOk()).toBe(true);

          const clearRightResult = argument.setRightSideLabel(undefined);
          expect(clearRightResult.isOk()).toBe(true);

          expect(argument.getSideLabels()).toEqual({});
          expect(argument.hasLeftSideLabel()).toBe(false);
          expect(argument.hasRightSideLabel()).toBe(false);
          expect(argument.hasSideLabels()).toBe(false);
        }
      }
    });
  });

  describe('Connection Capabilities', () => {
    describe('direct connection testing', () => {
      it('should detect when arguments share statements', () => {
        const sharedStatement = statementFactory.build();
        const premise1 = statementFactory.build();
        const conclusion2 = statementFactory.build();

        const result1 = AtomicArgument.create([premise1], [sharedStatement]);
        const result2 = AtomicArgument.create([sharedStatement], [conclusion2]);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
          expect(argument2.isDirectlyConnectedTo(argument1)).toBe(true);
          expect(argument1.sharesStatementWith(argument2)).toBe(true);
          expect(argument2.sharesStatementWith(argument1)).toBe(true);
        }
      });

      it('should handle arguments with no connections', () => {
        const premises1 = createTestStatements(1);
        const conclusions1 = createTestStatements(1);
        const premises2 = createTestStatements(1);
        const conclusions2 = createTestStatements(1);

        const result1 = AtomicArgument.create(premises1, conclusions1);
        const result2 = AtomicArgument.create(premises2, conclusions2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          expect(argument1.isDirectlyConnectedTo(argument2)).toBe(false);
          expect(argument1.sharesStatementWith(argument2)).toBe(false);
        }
      });

      it('should find specific connections between arguments', () => {
        const sharedStatement = statementFactory.build();
        const premise = statementFactory.build();
        const conclusion = statementFactory.build();

        const result1 = AtomicArgument.create([premise], [sharedStatement]);
        const result2 = AtomicArgument.create([sharedStatement], [conclusion]);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          const connections = argument1.findConnectionsTo(argument2);
          expect(connections).toHaveLength(1);
          expect(connections[0].statement).toBe(sharedStatement);
          expect(connections[0].fromConclusionPosition).toBe(0);
        }
      });

      it('should validate connection at specific indices', () => {
        const sharedStatement = statementFactory.build();
        const premise = statementFactory.build();
        const conclusion = statementFactory.build();

        const result1 = AtomicArgument.create([premise], [sharedStatement]);
        const result2 = AtomicArgument.create([sharedStatement], [conclusion]);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          expect(argument1.canConnectAt(0, argument2, 0)).toBe(true);
          expect(argument1.canConnectAt(0, argument2, 1)).toBe(false); // Invalid premise index
          expect(argument1.canConnectAt(1, argument2, 0)).toBe(false); // Invalid conclusion index
        }
      });
    });

    describe('connection safety validation', () => {
      it('should validate safe connections', () => {
        const sharedStatement = statementFactory.build();
        const premise = statementFactory.build();
        const conclusion = statementFactory.build();

        const result1 = AtomicArgument.create([premise], [sharedStatement]);
        const result2 = AtomicArgument.create([sharedStatement], [conclusion]);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          const safetyResult = argument1.validateConnectionSafety(argument2);
          expect(safetyResult.isOk()).toBe(true);
          if (safetyResult.isOk()) {
            expect(safetyResult.value).toBe(true);
          }
        }
      });

      it('should reject self-connections', () => {
        const statements = createTestStatements(2);
        const result = AtomicArgument.create([statements[0]], [statements[1]]);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const safetyResult = argument.validateConnectionSafety(argument);
          expect(safetyResult.isErr()).toBe(true);
          if (safetyResult.isErr()) {
            expect(safetyResult.error.message).toContain('Cannot connect argument to itself');
          }
        }
      });

      it('should reject connections when source has no conclusions', () => {
        const premise = statementFactory.build();
        const conclusion = statementFactory.build();

        const result1 = AtomicArgument.create([premise]); // No conclusions
        const result2 = AtomicArgument.create([premise], [conclusion]);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          const safetyResult = argument1.validateConnectionSafety(argument2);
          expect(safetyResult.isErr()).toBe(true);
          if (safetyResult.isErr()) {
            expect(safetyResult.error.message).toContain('Source argument has no conclusions');
          }
        }
      });

      it('should reject connections when target has no premises', () => {
        const premise = statementFactory.build();
        const conclusion = statementFactory.build();

        const result1 = AtomicArgument.create([premise], [conclusion]);
        const result2 = AtomicArgument.create([], [conclusion]); // No premises

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const argument1 = result1.value;
          const argument2 = result2.value;

          const safetyResult = argument1.validateConnectionSafety(argument2);
          expect(safetyResult.isErr()).toBe(true);
          if (safetyResult.isErr()) {
            expect(safetyResult.error.message).toContain('Target argument has no premises');
          }
        }
      });
    });
  });

  describe('Branching Operations', () => {
    it('should create branch from conclusion', () => {
      const premises = createTestStatements(1);
      const conclusions = createTestStatements(1);
      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const branchResult = argument.createBranchFromConclusion(0);
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branch = branchResult.value;
          expect(branch.getPremises()).toContain(conclusions[0]);
          expect(branch.getConclusions()).toHaveLength(0);
          expect(branch.isBootstrapArgument()).toBe(false);
          expect(branch.isEmpty()).toBe(false);
          expect(branch.isComplete()).toBe(false);
        }
      }
    });

    it('should create branch to premise', () => {
      const premises = createTestStatements(1);
      const conclusions = createTestStatements(1);
      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const branchResult = argument.createBranchToPremise(0);
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branch = branchResult.value;
          expect(branch.getPremises()).toHaveLength(0);
          expect(branch.getConclusions()).toContain(premises[0]);
          expect(branch.isBootstrapArgument()).toBe(false);
          expect(branch.isEmpty()).toBe(false);
          expect(branch.isComplete()).toBe(false);
        }
      }
    });

    it('should reject invalid branching indices', () => {
      const premises = createTestStatements(1);
      const conclusions = createTestStatements(1);
      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        const invalidConclusionBranch = argument.createBranchFromConclusion(5);
        expect(invalidConclusionBranch.isErr()).toBe(true);

        const invalidPremiseBranch = argument.createBranchToPremise(5);
        expect(invalidPremiseBranch.isErr()).toBe(true);
      }
    });
  });

  describe('Argument Classification', () => {
    it('should identify definition arguments (no premises)', () => {
      const conclusions = createTestStatements(1);
      const result = AtomicArgument.create([], conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.isDefinition()).toBe(true);
        expect(argument.getPremiseCount()).toBe(0);
        expect(argument.getConclusionCount()).toBe(1);
      }
    });

    it('should identify non-definition arguments (with premises)', () => {
      const premises = createTestStatements(1);
      const conclusions = createTestStatements(1);
      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.isDefinition()).toBe(false);
        expect(argument.getPremiseCount()).toBe(1);
        expect(argument.getConclusionCount()).toBe(1);
      }
    });

    it('should identify bootstrap arguments as definitions', () => {
      const argument = AtomicArgument.createBootstrap();
      expect(argument.isDefinition()).toBe(true);
      expect(argument.isBootstrapArgument()).toBe(true);
      expect(argument.getPremiseCount()).toBe(0);
      expect(argument.getConclusionCount()).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should provide correct string representation', () => {
      const premises = createTestStatements(2);
      const conclusions = createTestStatements(1);
      const leftLabel = SideLabel.create('MP');
      const rightLabel = SideLabel.create('Valid');
      expect(leftLabel.isOk()).toBe(true);
      expect(rightLabel.isOk()).toBe(true);

      if (leftLabel.isOk() && rightLabel.isOk()) {
        const sideLabels: SideLabels = { left: leftLabel.value, right: rightLabel.value };
        const result = AtomicArgument.create(premises, conclusions, sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('AtomicArgument');
          expect(str).toContain('premises(2)');
          expect(str).toContain('conclusions(1)');
          expect(str).toContain('MP');
          expect(str).toContain('Valid');
        }
      }
    });

    it('should handle equality comparisons', () => {
      const premises = createTestStatements(1);
      const conclusions = createTestStatements(1);
      const result1 = AtomicArgument.create(premises, conclusions);
      const result2 = AtomicArgument.create(premises, conclusions);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const argument1 = result1.value;
        const argument2 = result2.value;

        expect(argument1.equals(argument1)).toBe(true);
        expect(argument1.equals(argument2)).toBe(false); // Different IDs
        expect(argument1.equals(null)).toBe(false);
        expect(argument1.equals(undefined)).toBe(false);
      }
    });
  });

  describe('Property-Based Testing', () => {
    it('should handle various statement combinations', () => {
      fc.assert(
        fc.property(
          fc.array(statementArbitrary, { minLength: 0, maxLength: 5 }),
          fc.array(statementArbitrary, { minLength: 0, maxLength: 5 }),
          validSideLabelsArbitrary,
          (premises, conclusions, sideLabels) => {
            const result = AtomicArgument.create(premises, conclusions, sideLabels);

            if (result.isOk()) {
              const argument = result.value;
              expect(argument.getPremises()).toEqual(premises);
              expect(argument.getConclusions()).toEqual(conclusions);
              expect(argument.getPremiseCount()).toBe(premises.length);
              expect(argument.getConclusionCount()).toBe(conclusions.length);

              const isEmpty = premises.length === 0 && conclusions.length === 0;
              const isComplete = premises.length > 0 && conclusions.length > 0;

              expect(argument.isEmpty()).toBe(isEmpty);
              expect(argument.isComplete()).toBe(isComplete);
              expect(argument.isBootstrapArgument()).toBe(isEmpty);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain connection consistency', () => {
      fc.assert(
        fc.property(
          statementArbitrary,
          statementArbitrary,
          statementArbitrary,
          (sharedStatement, statement1, statement2) => {
            const result1 = AtomicArgument.create([statement1], [sharedStatement]);
            const result2 = AtomicArgument.create([sharedStatement], [statement2]);

            if (result1.isOk() && result2.isOk()) {
              const argument1 = result1.value;
              const argument2 = result2.value;

              expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
              expect(argument2.isDirectlyConnectedTo(argument1)).toBe(true);
              expect(argument1.sharesStatementWith(argument2)).toBe(true);
              expect(argument2.sharesStatementWith(argument1)).toBe(true);

              const connections = argument1.findConnectionsTo(argument2);
              expect(connections.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: 25 },
      );
    });
  });
});
