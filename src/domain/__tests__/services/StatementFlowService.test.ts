import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AtomicArgument } from '../../entities/AtomicArgument.js';
import type { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import { StatementFlowService } from '../../services/StatementFlowService.js';
import type { AtomicArgumentId } from '../../shared/value-objects/index.js';
import {
  createTestStatements,
  statementContentFactory,
  testScenarios,
} from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

describe('StatementFlowService', () => {
  let service: StatementFlowService;
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    service = new StatementFlowService();

    // Mock Date.now for consistent testing
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createStatementFromContent', () => {
    describe('successful creation cases', () => {
      it('should create statement from valid content', () => {
        const content = 'All men are mortal';
        const result = service.createStatementFromContent(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidStatement();
          expect(result.value.getContent()).toBe(content);
        }
      });

      it('should create statements with different content using factory', () => {
        const content = statementContentFactory.build();
        const result = service.createStatementFromContent(content.getValue());

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidStatement();
          expect(result.value.getContent()).toBe(content.getValue());
        }
      });

      it('should create multiple unique statements', () => {
        const contents = createTestStatements(3);
        const statements = contents.map((content) => service.createStatementFromContent(content));

        statements.forEach((result) => {
          expect(result.isOk()).toBe(true);
        });

        // Verify they have unique IDs
        if (statements.every((s) => s.isOk())) {
          const ids = statements.map((s) => (s.isOk() ? s.value.getId() : null));
          const uniqueIds = new Set(ids.map((id) => id?.toString()));
          expect(uniqueIds.size).toBe(3);
        }
      });
    });

    describe('error cases', () => {
      it('should fail with empty content', () => {
        const result = service.createStatementFromContent('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          customExpect(result.error).toBeValidationError('empty');
        }
      });

      it('should fail with whitespace-only content', () => {
        const result = service.createStatementFromContent('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          customExpect(result.error).toBeValidationError();
        }
      });
    });

    describe('property-based testing', () => {
      it('should handle any valid string content', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
            (content) => {
              const result = service.createStatementFromContent(content);
              expect(result.isOk()).toBe(true);
            },
          ),
        );
      });
    });
  });

  describe('createOrderedSetFromStatements', () => {
    describe('successful creation cases', () => {
      it('should create ordered set from valid statements', () => {
        const statement1 = Statement.create('All men are mortal');
        const statement2 = Statement.create('Socrates is a man');

        expect(statement1.isOk() && statement2.isOk()).toBe(true);

        if (statement1.isOk() && statement2.isOk()) {
          const result = service.createOrderedSetFromStatements([
            statement1.value,
            statement2.value,
          ]);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            customExpect(result.value).toBeValidOrderedSet();
            expect(result.value.size()).toBe(2);
          }
        }
      });

      it('should preserve order of statements', () => {
        const contents = testScenarios.simpleChain.premises;
        const statements = contents
          .map((content) => {
            const result = Statement.create(content);
            expect(result.isOk()).toBe(true);
            return result.isOk() ? result.value : null;
          })
          .filter((s): s is Statement => s !== null);

        const result = service.createOrderedSetFromStatements(statements);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const orderedSet = result.value;
          const items = orderedSet.getStatementIds();
          expect(items.length).toBe(statements.length);
          // Order should be preserved
          items.forEach((itemId, index) => {
            const statement = statements[index];
            if (statement) {
              expect(itemId.equals(statement.getId())).toBe(true);
            }
          });
        }
      });

      it('should handle empty statement array', () => {
        const result = service.createOrderedSetFromStatements([]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidOrderedSet();
          expect(result.value.size()).toBe(0);
          expect(result.value.isEmpty()).toBe(true);
        }
      });
    });
  });

  describe('createEmptyOrderedSet', () => {
    it('should create valid empty ordered set', () => {
      const result = service.createEmptyOrderedSet();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        customExpect(result.value).toBeValidOrderedSet();
        expect(result.value.size()).toBe(0);
        expect(result.value.isEmpty()).toBe(true);
      }
    });

    it('should create unique ordered sets', () => {
      const result1 = service.createEmptyOrderedSet();
      const result2 = service.createEmptyOrderedSet();

      expect(result1.isOk() && result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getId().equals(result2.value.getId())).toBe(false);
      }
    });
  });

  describe('addStatementToOrderedSet', () => {
    let orderedSet: OrderedSet;
    let statement: Statement;

    beforeEach(() => {
      const orderedSetResult = service.createEmptyOrderedSet();
      const statementResult = service.createStatementFromContent('Test statement');

      expect(orderedSetResult.isOk() && statementResult.isOk()).toBe(true);
      if (orderedSetResult.isOk() && statementResult.isOk()) {
        orderedSet = orderedSetResult.value;
        statement = statementResult.value;
      }
    });

    describe('successful addition cases', () => {
      it('should add statement to ordered set', () => {
        const result = service.addStatementToOrderedSet(orderedSet, statement);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.size()).toBe(1);
        expect(orderedSet.containsStatement(statement.getId())).toBe(true);
      });

      it('should track statement reference in ordered set', () => {
        const result = service.addStatementToOrderedSet(orderedSet, statement);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.getStatementIds()).toHaveLength(1);
        expect(orderedSet.getStatementIds()[0]?.equals(statement.getId())).toBe(true);
      });
    });

    describe('error cases', () => {
      it('should fail when adding duplicate statement', () => {
        // Add statement first time
        const firstResult = service.addStatementToOrderedSet(orderedSet, statement);
        expect(firstResult.isOk()).toBe(true);

        // Try to add same statement again
        const secondResult = service.addStatementToOrderedSet(orderedSet, statement);

        expect(secondResult.isErr()).toBe(true);
        if (secondResult.isErr()) {
          customExpect(secondResult.error).toBeValidationError();
        }
      });
    });
  });

  describe('createAtomicArgumentFromStatements', () => {
    let premiseStatements: Statement[];
    let conclusionStatements: Statement[];

    beforeEach(() => {
      const premise1Result = service.createStatementFromContent('All men are mortal');
      const premise2Result = service.createStatementFromContent('Socrates is a man');
      const conclusionResult = service.createStatementFromContent('Socrates is mortal');

      expect(premise1Result.isOk() && premise2Result.isOk() && conclusionResult.isOk()).toBe(true);
      if (premise1Result.isOk() && premise2Result.isOk() && conclusionResult.isOk()) {
        premiseStatements = [premise1Result.value, premise2Result.value];
        conclusionStatements = [conclusionResult.value];
      }
    });

    describe('successful creation cases', () => {
      it('should create atomic argument with statements', () => {
        const result = service.createAtomicArgumentFromStatements(
          premiseStatements,
          conclusionStatements,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremises()).toHaveLength(2);
          expect(result.value.getConclusions()).toHaveLength(1);
        }
      });

      it('should create atomic argument with premise statements only', () => {
        const result = service.createAtomicArgumentFromStatements(premiseStatements, []);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremises()).toHaveLength(2);
          expect(result.value.getConclusions()).toHaveLength(0);
        }
      });

      it('should create atomic argument with conclusion statements only', () => {
        const result = service.createAtomicArgumentFromStatements([], conclusionStatements);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremises()).toHaveLength(0);
          expect(result.value.getConclusions()).toHaveLength(1);
        }
      });

      it('should create empty atomic argument', () => {
        const result = service.createAtomicArgumentFromStatements([], []);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremises()).toEqual([]);
          expect(result.value.getConclusions()).toEqual([]);
        }
      });
    });
  });

  describe('createBranchFromArgumentConclusion', () => {
    let parentArg: AtomicArgument;
    let conclusionStatement: Statement;

    beforeEach(() => {
      const conclusionResult = service.createStatementFromContent('Parent conclusion');
      expect(conclusionResult.isOk()).toBe(true);

      if (conclusionResult.isOk()) {
        conclusionStatement = conclusionResult.value;
        const parentResult = service.createAtomicArgumentFromStatements([], [conclusionStatement]);
        expect(parentResult.isOk()).toBe(true);
        if (parentResult.isOk()) {
          parentArg = parentResult.value;
        }
      }
    });

    describe('successful branching cases', () => {
      it('should create branch from parent conclusion', () => {
        const result = service.createBranchFromArgumentConclusion(parentArg, 0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremises()).toHaveLength(1);
          expect(result.value.getPremises()[0]?.getId().equals(conclusionStatement.getId())).toBe(
            true,
          );
        }
      });

      it('should create branch with correct statement reference', () => {
        const result = service.createBranchFromArgumentConclusion(parentArg);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const childArg = result.value;
          expect(childArg.getPremises()).toHaveLength(1);
          expect(childArg.getPremises()[0]?.getId().equals(conclusionStatement.getId())).toBe(true);
        }
      });
    });

    describe('error cases', () => {
      it('should fail when conclusion index is out of bounds', () => {
        const result = service.createBranchFromArgumentConclusion(parentArg, 1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          customExpect(result.error).toBeValidationError('has no conclusion to branch from');
        }
      });

      it('should fail when parent has no conclusion', () => {
        const emptyParentResult = service.createAtomicArgumentFromStatements([], []);
        expect(emptyParentResult.isOk()).toBe(true);

        if (emptyParentResult.isOk()) {
          const emptyParent = emptyParentResult.value;
          const result = service.createBranchFromArgumentConclusion(emptyParent);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('has no conclusion to branch from');
          }
        }
      });
    });
  });

  describe('findDirectlyConnectedArguments', () => {
    let argument1: AtomicArgument;
    let argument2: AtomicArgument;
    let argument3: AtomicArgument;
    let argumentsMap: Map<AtomicArgumentId, AtomicArgument>;

    beforeEach(() => {
      const sharedStatementResult = service.createStatementFromContent('Shared statement');
      expect(sharedStatementResult.isOk()).toBe(true);

      if (sharedStatementResult.isOk()) {
        const sharedStatement = sharedStatementResult.value;

        // Create connected arguments: arg1 → arg2
        const arg1Result = service.createAtomicArgumentFromStatements([], [sharedStatement]);
        const arg2Result = service.createAtomicArgumentFromStatements([sharedStatement], []);

        // Create unconnected argument
        const arg3Result = service.createAtomicArgumentFromStatements([], []);

        expect(arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk()).toBe(true);

        if (arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk()) {
          argument1 = arg1Result.value;
          argument2 = arg2Result.value;
          argument3 = arg3Result.value;

          argumentsMap = new Map([
            [argument1.getId(), argument1],
            [argument2.getId(), argument2],
            [argument3.getId(), argument3],
          ]);
        }
      }
    });

    describe('connection finding cases', () => {
      it('should find directly connected arguments', () => {
        const connected = service.findDirectlyConnectedArguments(argument1, argumentsMap);

        expect(connected).toHaveLength(1);
        expect(connected[0]?.getId().equals(argument2.getId())).toBe(true);
      });

      it('should not include the argument itself', () => {
        const connected = service.findDirectlyConnectedArguments(argument1, argumentsMap);

        expect(connected.every((arg) => !arg.getId().equals(argument1.getId()))).toBe(true);
      });

      it('should not find unconnected arguments', () => {
        const connected = service.findDirectlyConnectedArguments(argument1, argumentsMap);

        expect(connected.some((arg) => arg.getId().equals(argument3.getId()))).toBe(false);
      });

      it('should return empty array when no connections exist', () => {
        const connected = service.findDirectlyConnectedArguments(argument3, argumentsMap);

        expect(connected).toHaveLength(0);
      });

      it('should work with bidirectional connections', () => {
        const connectedFrom1 = service.findDirectlyConnectedArguments(argument1, argumentsMap);
        const connectedFrom2 = service.findDirectlyConnectedArguments(argument2, argumentsMap);

        expect(connectedFrom1).toHaveLength(1);
        expect(connectedFrom2).toHaveLength(1);
        expect(connectedFrom1[0]?.getId().equals(argument2.getId())).toBe(true);
        expect(connectedFrom2[0]?.getId().equals(argument1.getId())).toBe(true);
      });
    });
  });

  describe('findAllConnectedArguments', () => {
    let argument1: AtomicArgument;
    let argument2: AtomicArgument;
    let argument3: AtomicArgument;
    let argument4: AtomicArgument;
    let argumentsMap: Map<AtomicArgumentId, AtomicArgument>;

    beforeEach(() => {
      // Create chain: arg1 → arg2 → arg3, with arg4 disconnected
      const statement1Result = service.createStatementFromContent('Statement 1');
      const statement2Result = service.createStatementFromContent('Statement 2');
      expect(statement1Result.isOk() && statement2Result.isOk()).toBe(true);

      if (statement1Result.isOk() && statement2Result.isOk()) {
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;

        const arg1Result = service.createAtomicArgumentFromStatements([], [statement1]);
        const arg2Result = service.createAtomicArgumentFromStatements([statement1], [statement2]);
        const arg3Result = service.createAtomicArgumentFromStatements([statement2], []);
        const arg4Result = service.createAtomicArgumentFromStatements([], []); // Disconnected

        expect(
          arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk() && arg4Result.isOk(),
        ).toBe(true);

        if (arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk() && arg4Result.isOk()) {
          argument1 = arg1Result.value;
          argument2 = arg2Result.value;
          argument3 = arg3Result.value;
          argument4 = arg4Result.value;

          argumentsMap = new Map([
            [argument1.getId(), argument1],
            [argument2.getId(), argument2],
            [argument3.getId(), argument3],
            [argument4.getId(), argument4],
          ]);
        }
      }
    });

    describe('connected components finding', () => {
      it('should find all arguments in connected component', () => {
        const connected = service.findAllConnectedArguments(argument1, argumentsMap);

        expect(connected.size).toBe(3);
        expect(connected.has(argument1)).toBe(true);
        expect(connected.has(argument2)).toBe(true);
        expect(connected.has(argument3)).toBe(true);
        expect(connected.has(argument4)).toBe(false);
      });

      it('should find same component regardless of starting point', () => {
        const fromArg1 = service.findAllConnectedArguments(argument1, argumentsMap);
        const fromArg2 = service.findAllConnectedArguments(argument2, argumentsMap);
        const fromArg3 = service.findAllConnectedArguments(argument3, argumentsMap);

        expect(fromArg1.size).toBe(fromArg2.size);
        expect(fromArg2.size).toBe(fromArg3.size);
        expect(fromArg1.size).toBe(3);
      });

      it('should find only self for disconnected argument', () => {
        const connected = service.findAllConnectedArguments(argument4, argumentsMap);

        expect(connected.size).toBe(1);
        expect(connected.has(argument4)).toBe(true);
      });

      it('should handle empty arguments map', () => {
        const emptyMap = new Map<AtomicArgumentId, AtomicArgument>();
        const connected = service.findAllConnectedArguments(argument1, emptyMap);

        expect(connected.size).toBe(1);
        expect(connected.has(argument1)).toBe(true);
      });
    });
  });

  describe('validateStatementFlow', () => {
    let fromArgument: AtomicArgument;
    let toArgument: AtomicArgument;
    let sharedStatement: Statement;

    beforeEach(() => {
      const sharedStatementResult = service.createStatementFromContent('Test statement');
      expect(sharedStatementResult.isOk()).toBe(true);

      if (sharedStatementResult.isOk()) {
        sharedStatement = sharedStatementResult.value;

        const fromResult = service.createAtomicArgumentFromStatements([], [sharedStatement]);
        const toResult = service.createAtomicArgumentFromStatements([sharedStatement], []);

        expect(fromResult.isOk() && toResult.isOk()).toBe(true);
        if (fromResult.isOk() && toResult.isOk()) {
          fromArgument = fromResult.value;
          toArgument = toResult.value;
        }
      }
    });

    describe('successful validation cases', () => {
      it('should validate proper statement flow', () => {
        const result = service.validateStatementFlow(fromArgument, toArgument);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('error cases', () => {
      it('should fail when from argument has no conclusion', () => {
        const emptyFromResult = service.createAtomicArgumentFromStatements([], []);
        expect(emptyFromResult.isOk()).toBe(true);

        if (emptyFromResult.isOk()) {
          const emptyFrom = emptyFromResult.value;
          const result = service.validateStatementFlow(emptyFrom, toArgument);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('not connected by shared statements');
          }
        }
      });

      it('should fail when to argument has no premise', () => {
        const emptyToResult = service.createAtomicArgumentFromStatements([], []);
        expect(emptyToResult.isOk()).toBe(true);

        if (emptyToResult.isOk()) {
          const emptyTo = emptyToResult.value;
          const result = service.validateStatementFlow(fromArgument, emptyTo);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('not connected by shared statements');
          }
        }
      });

      it('should fail when arguments are not connected', () => {
        const otherStatementResult = service.createStatementFromContent('Other statement');
        expect(otherStatementResult.isOk()).toBe(true);

        if (otherStatementResult.isOk()) {
          const otherStatement = otherStatementResult.value;
          const disconnectedResult = service.createAtomicArgumentFromStatements(
            [otherStatement],
            [],
          );
          expect(disconnectedResult.isOk()).toBe(true);

          if (disconnectedResult.isOk()) {
            const disconnected = disconnectedResult.value;
            const result = service.validateStatementFlow(fromArgument, disconnected);

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              customExpect(result.error).toBeValidationError('not connected by shared statements');
            }
          }
        }
      });
    });
  });

  describe('canStatementsFlowBetween', () => {
    let connectedFrom: AtomicArgument;
    let connectedTo: AtomicArgument;
    let disconnectedArg: AtomicArgument;

    beforeEach(() => {
      const sharedStatementResult = service.createStatementFromContent('Shared statement');
      expect(sharedStatementResult.isOk()).toBe(true);

      if (sharedStatementResult.isOk()) {
        const sharedStatement = sharedStatementResult.value;

        const fromResult = service.createAtomicArgumentFromStatements([], [sharedStatement]);
        const toResult = service.createAtomicArgumentFromStatements([sharedStatement], []);
        const disconnectedResult = service.createAtomicArgumentFromStatements([], []);

        expect(fromResult.isOk() && toResult.isOk() && disconnectedResult.isOk()).toBe(true);
        if (fromResult.isOk() && toResult.isOk() && disconnectedResult.isOk()) {
          connectedFrom = fromResult.value;
          connectedTo = toResult.value;
          disconnectedArg = disconnectedResult.value;
        }
      }
    });

    describe('flow detection cases', () => {
      it('should return true for connected arguments', () => {
        const canFlow = service.canStatementsFlowBetween(connectedFrom, connectedTo);

        expect(canFlow).toBe(true);
      });

      it('should return false for disconnected arguments', () => {
        const canFlow = service.canStatementsFlowBetween(connectedFrom, disconnectedArg);

        expect(canFlow).toBe(false);
      });

      it('should return false when from argument has no conclusion', () => {
        const emptyFromResult = service.createAtomicArgumentFromStatements([], []);
        expect(emptyFromResult.isOk()).toBe(true);

        if (emptyFromResult.isOk()) {
          const emptyFrom = emptyFromResult.value;
          const canFlow = service.canStatementsFlowBetween(emptyFrom, connectedTo);

          expect(canFlow).toBe(false);
        }
      });

      it('should return false when to argument has no premise', () => {
        const emptyToResult = service.createAtomicArgumentFromStatements([], []);
        expect(emptyToResult.isOk()).toBe(true);

        if (emptyToResult.isOk()) {
          const emptyTo = emptyToResult.value;
          const canFlow = service.canStatementsFlowBetween(connectedFrom, emptyTo);

          expect(canFlow).toBe(false);
        }
      });
    });
  });

  describe('findStatementFlowPath', () => {
    let argument1: AtomicArgument;
    let argument2: AtomicArgument;
    let argument3: AtomicArgument;
    let disconnectedArg: AtomicArgument;
    let argumentsMap: Map<AtomicArgumentId, AtomicArgument>;

    beforeEach(() => {
      // Create chain: arg1 → arg2 → arg3
      const statement1Result = service.createStatementFromContent('Statement 1');
      const statement2Result = service.createStatementFromContent('Statement 2');
      expect(statement1Result.isOk() && statement2Result.isOk()).toBe(true);

      if (statement1Result.isOk() && statement2Result.isOk()) {
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;

        const arg1Result = service.createAtomicArgumentFromStatements([], [statement1]);
        const arg2Result = service.createAtomicArgumentFromStatements([statement1], [statement2]);
        const arg3Result = service.createAtomicArgumentFromStatements([statement2], []);
        const disconnectedResult = service.createAtomicArgumentFromStatements([], []);

        expect(
          arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk() && disconnectedResult.isOk(),
        ).toBe(true);

        if (
          arg1Result.isOk() &&
          arg2Result.isOk() &&
          arg3Result.isOk() &&
          disconnectedResult.isOk()
        ) {
          argument1 = arg1Result.value;
          argument2 = arg2Result.value;
          argument3 = arg3Result.value;
          disconnectedArg = disconnectedResult.value;

          argumentsMap = new Map([
            [argument1.getId(), argument1],
            [argument2.getId(), argument2],
            [argument3.getId(), argument3],
            [disconnectedArg.getId(), disconnectedArg],
          ]);
        }
      }
    });

    describe('path finding cases', () => {
      it('should find direct path between adjacent arguments', () => {
        const path = service.findStatementFlowPath(argument1, argument2, argumentsMap);

        expect(path).not.toBe(null);
        expect(path).toHaveLength(2);
        expect(path?.[0]?.getId().equals(argument1.getId())).toBe(true);
        expect(path?.[1]?.getId().equals(argument2.getId())).toBe(true);
      });

      it('should find path through intermediate arguments', () => {
        const path = service.findStatementFlowPath(argument1, argument3, argumentsMap);

        expect(path).not.toBe(null);
        expect(path).toHaveLength(3);
        expect(path?.[0]?.getId().equals(argument1.getId())).toBe(true);
        expect(path?.[1]?.getId().equals(argument2.getId())).toBe(true);
        expect(path?.[2]?.getId().equals(argument3.getId())).toBe(true);
      });

      it('should return path with single argument for same start and end', () => {
        const path = service.findStatementFlowPath(argument1, argument1, argumentsMap);

        expect(path).not.toBe(null);
        expect(path).toHaveLength(1);
        expect(path?.[0]?.getId().equals(argument1.getId())).toBe(true);
      });

      it('should return null when no path exists', () => {
        const path = service.findStatementFlowPath(argument1, disconnectedArg, argumentsMap);

        expect(path).toBe(null);
      });

      it('should return null when arguments are not in map', () => {
        const emptyMap = new Map<AtomicArgumentId, AtomicArgument>();
        const path = service.findStatementFlowPath(argument1, argument2, emptyMap);

        expect(path).toBe(null);
      });

      it('should return null for reverse direction (no backward flow)', () => {
        // Statement flow is unidirectional: from conclusion to premise
        // In chain arg1 → arg2 → arg3, cannot flow backward from arg3 to arg1
        const path = service.findStatementFlowPath(argument3, argument1, argumentsMap);

        expect(path).toBe(null);
      });
    });

    describe('complex flow patterns', () => {
      it('should handle multiple possible paths', () => {
        // Create diamond pattern: arg1 → arg2a, arg2b → arg3
        const statement1Result = service.createStatementFromContent('Statement 1');
        const statement2aResult = service.createStatementFromContent('Statement 2a');
        const statement2bResult = service.createStatementFromContent('Statement 2b');
        const statement3Result = service.createStatementFromContent('Statement 3');

        expect(
          statement1Result.isOk() &&
            statement2aResult.isOk() &&
            statement2bResult.isOk() &&
            statement3Result.isOk(),
        ).toBe(true);

        if (
          statement1Result.isOk() &&
          statement2aResult.isOk() &&
          statement2bResult.isOk() &&
          statement3Result.isOk()
        ) {
          const statement1 = statement1Result.value;
          const statement2a = statement2aResult.value;
          const statement2b = statement2bResult.value;
          const statement3 = statement3Result.value;

          const startResult = service.createAtomicArgumentFromStatements([], [statement1]);
          const branch2aResult = service.createAtomicArgumentFromStatements(
            [statement1],
            [statement2a],
          );
          const branch2bResult = service.createAtomicArgumentFromStatements(
            [statement1],
            [statement2b],
          );
          const endResult = service.createAtomicArgumentFromStatements([statement2a], [statement3]); // Only connect through 2a

          expect(
            startResult.isOk() &&
              branch2aResult.isOk() &&
              branch2bResult.isOk() &&
              endResult.isOk(),
          ).toBe(true);

          if (
            startResult.isOk() &&
            branch2aResult.isOk() &&
            branch2bResult.isOk() &&
            endResult.isOk()
          ) {
            const start = startResult.value;
            const branch2a = branch2aResult.value;
            const branch2b = branch2bResult.value;
            const end = endResult.value;

            const diamondMap = new Map([
              [start.getId(), start],
              [branch2a.getId(), branch2a],
              [branch2b.getId(), branch2b],
              [end.getId(), end],
            ]);

            const path = service.findStatementFlowPath(start, end, diamondMap);

            expect(path).not.toBe(null);
            expect(path?.length).toBeGreaterThanOrEqual(3);
            expect(path?.[0]?.getId().equals(start.getId())).toBe(true);
            expect(path?.[path?.length - 1]?.getId().equals(end.getId())).toBe(true);
          }
        }
      });
    });
  });

  describe('integration and edge cases', () => {
    describe('complex argument chains', () => {
      it('should handle complete workflow from statements to connected arguments', () => {
        // Create statements
        const { premises, conclusions } = testScenarios.simpleChain;

        const premiseStatements = premises
          .map((content) => {
            const result = service.createStatementFromContent(content);
            expect(result.isOk()).toBe(true);
            return result.isOk() ? result.value : null;
          })
          .filter((s): s is Statement => s !== null);

        const conclusionStatements = conclusions
          .map((content) => {
            const result = service.createStatementFromContent(content);
            expect(result.isOk()).toBe(true);
            return result.isOk() ? result.value : null;
          })
          .filter((s): s is Statement => s !== null);

        // Create atomic argument
        const argumentResult = service.createAtomicArgumentFromStatements(
          premiseStatements,
          conclusionStatements,
        );
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const argument = argumentResult.value;
          customExpect(argument).toBeValidAtomicArgument();

          // Create branch
          const branchResult = service.createBranchFromArgumentConclusion(argument, 0);
          expect(branchResult.isOk()).toBe(true);

          if (branchResult.isOk()) {
            const branch = branchResult.value;
            customExpect(branch).toBeValidAtomicArgument();

            // Verify connection
            expect(service.canStatementsFlowBetween(argument, branch)).toBe(true);
          }
        }
      });
    });

    describe('property-based tests', () => {
      it('should maintain argument identity through operations', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
            (content) => {
              const statementResult = service.createStatementFromContent(content);
              expect(statementResult.isOk()).toBe(true);

              if (statementResult.isOk()) {
                const statement = statementResult.value;
                const argumentResult = service.createAtomicArgumentFromStatements(
                  [statement],
                  [statement],
                );
                expect(argumentResult.isOk()).toBe(true);

                if (argumentResult.isOk()) {
                  const argument = argumentResult.value;
                  // Argument should maintain consistent identity
                  expect(argument.getId().equals(argument.getId())).toBe(true);
                }
              }
            },
          ),
        );
      });

      it('should handle statement flow consistency', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
              { minLength: 1, maxLength: 5 },
            ),
            (contents) => {
              const statements = contents
                .map((content) => {
                  const result = service.createStatementFromContent(content);
                  expect(result.isOk()).toBe(true);
                  return result.isOk() ? result.value : null;
                })
                .filter((s): s is Statement => s !== null);

              if (statements.length > 0) {
                const orderedSetResult = service.createOrderedSetFromStatements(statements);
                expect(orderedSetResult.isOk()).toBe(true);

                if (orderedSetResult.isOk()) {
                  const orderedSet = orderedSetResult.value;
                  expect(orderedSet.size()).toBe(statements.length);

                  // All statements should be in the ordered set
                  statements.forEach((statement) => {
                    expect(orderedSet.containsStatement(statement.getId())).toBe(true);
                  });
                }
              }
            },
          ),
        );
      });
    });

    describe('error recovery and resilience', () => {
      it('should handle partial operation failures gracefully', () => {
        const validStatementResult = service.createStatementFromContent('Valid statement');
        expect(validStatementResult.isOk()).toBe(true);

        if (validStatementResult.isOk()) {
          const validStatement = validStatementResult.value;
          const orderedSetResult = service.createEmptyOrderedSet();
          expect(orderedSetResult.isOk()).toBe(true);

          if (orderedSetResult.isOk()) {
            const orderedSet = orderedSetResult.value;

            // Add statement successfully
            const addResult = service.addStatementToOrderedSet(orderedSet, validStatement);
            expect(addResult.isOk()).toBe(true);

            // Try to add again (should fail)
            const duplicateResult = service.addStatementToOrderedSet(orderedSet, validStatement);
            expect(duplicateResult.isErr()).toBe(true);

            // Original state should be preserved
            expect(orderedSet.size()).toBe(1);
            expect(orderedSet.containsStatement(validStatement.getId())).toBe(true);
          }
        }
      });
    });
  });
});
