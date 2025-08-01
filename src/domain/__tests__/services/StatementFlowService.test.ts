import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AtomicArgument } from '../../entities/AtomicArgument.js';
import type { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import { StatementFlowService } from '../../services/StatementFlowService.js';
import type { AtomicArgumentId, OrderedSetId } from '../../shared/value-objects/index.js';
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
        const result = service.createStatementFromContent(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidStatement();
          expect(result.value.getContent()).toBe(content);
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

      it('should increment statement usage count', () => {
        const initialUsage = statement.getUsageCount();
        const result = service.addStatementToOrderedSet(orderedSet, statement);

        expect(result.isOk()).toBe(true);
        expect(statement.getUsageCount()).toBe(initialUsage + 1);
      });

      it('should not increment usage on duplicate addition', () => {
        // Add once
        service.addStatementToOrderedSet(orderedSet, statement);
        const usageAfterFirst = statement.getUsageCount();

        // Try to add again (should fail)
        const result = service.addStatementToOrderedSet(orderedSet, statement);

        expect(result.isErr()).toBe(true);
        expect(statement.getUsageCount()).toBe(usageAfterFirst);
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

  describe('removeStatementFromOrderedSet', () => {
    let orderedSet: OrderedSet;
    let statement: Statement;

    beforeEach(() => {
      const orderedSetResult = service.createEmptyOrderedSet();
      const statementResult = service.createStatementFromContent('Test statement');

      expect(orderedSetResult.isOk() && statementResult.isOk()).toBe(true);
      if (orderedSetResult.isOk() && statementResult.isOk()) {
        orderedSet = orderedSetResult.value;
        statement = statementResult.value;
        // Add statement first
        service.addStatementToOrderedSet(orderedSet, statement);
      }
    });

    describe('successful removal cases', () => {
      it('should remove statement from ordered set', () => {
        const result = service.removeStatementFromOrderedSet(orderedSet, statement);

        expect(result.isOk()).toBe(true);
        expect(orderedSet.size()).toBe(0);
        expect(orderedSet.containsStatement(statement.getId())).toBe(false);
      });

      it('should decrement statement usage count', () => {
        const initialUsage = statement.getUsageCount();
        const result = service.removeStatementFromOrderedSet(orderedSet, statement);

        expect(result.isOk()).toBe(true);
        expect(statement.getUsageCount()).toBe(initialUsage - 1);
      });
    });

    describe('error cases', () => {
      it('should fail when removing non-existent statement', () => {
        const otherStatementResult = service.createStatementFromContent('Other statement');
        expect(otherStatementResult.isOk()).toBe(true);

        if (otherStatementResult.isOk()) {
          const result = service.removeStatementFromOrderedSet(
            orderedSet,
            otherStatementResult.value,
          );

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError();
          }
        }
      });

      it('should fail when statement usage count would go negative', () => {
        // Create statement with zero usage
        const statementResult = service.createStatementFromContent('Zero usage statement');
        expect(statementResult.isOk()).toBe(true);

        if (statementResult.isOk()) {
          const zeroUsageStatement = statementResult.value;
          expect(zeroUsageStatement.getUsageCount()).toBe(0);

          const result = service.removeStatementFromOrderedSet(orderedSet, zeroUsageStatement);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError();
          }
        }
      });
    });
  });

  describe('createAtomicArgumentWithSets', () => {
    let premiseSet: OrderedSet;
    let conclusionSet: OrderedSet;

    beforeEach(() => {
      const premiseResult = service.createEmptyOrderedSet();
      const conclusionResult = service.createEmptyOrderedSet();

      expect(premiseResult.isOk() && conclusionResult.isOk()).toBe(true);
      if (premiseResult.isOk() && conclusionResult.isOk()) {
        premiseSet = premiseResult.value;
        conclusionSet = conclusionResult.value;
      }
    });

    describe('successful creation cases', () => {
      it('should create atomic argument with both sets', () => {
        const result = service.createAtomicArgumentWithSets(premiseSet, conclusionSet);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremiseSet()?.equals(premiseSet.getId())).toBe(true);
          expect(result.value.getConclusionSet()?.equals(conclusionSet.getId())).toBe(true);
        }
      });

      it('should create atomic argument with premise set only', () => {
        const result = service.createAtomicArgumentWithSets(premiseSet);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremiseSet()?.equals(premiseSet.getId())).toBe(true);
          expect(result.value.getConclusionSet()).toBe(null);
        }
      });

      it('should create atomic argument with conclusion set only', () => {
        const result = service.createAtomicArgumentWithSets(undefined, conclusionSet);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremiseSet()).toBe(null);
          expect(result.value.getConclusionSet()?.equals(conclusionSet.getId())).toBe(true);
        }
      });

      it('should create empty atomic argument', () => {
        const result = service.createAtomicArgumentWithSets();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          expect(result.value.getPremiseSet()).toBe(null);
          expect(result.value.getConclusionSet()).toBe(null);
        }
      });

      it('should add argument references to ordered sets', () => {
        const result = service.createAtomicArgumentWithSets(premiseSet, conclusionSet);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          // Verify references were added
          expect(
            premiseSet.getReferencedByAsPremise().some((id) => id.equals(argument.getId())),
          ).toBe(true);
          expect(
            conclusionSet.getReferencedByAsConclusion().some((id) => id.equals(argument.getId())),
          ).toBe(true);
        }
      });
    });
  });

  describe('connectAtomicArgumentsBySharedSet', () => {
    let parentArg: AtomicArgument;
    let childArg: AtomicArgument;
    let sharedSet: OrderedSet;

    beforeEach(() => {
      const sharedSetResult = service.createEmptyOrderedSet();
      expect(sharedSetResult.isOk()).toBe(true);

      if (sharedSetResult.isOk()) {
        sharedSet = sharedSetResult.value;

        // Create parent argument with shared set as conclusion
        const parentResult = service.createAtomicArgumentWithSets(undefined, sharedSet);
        expect(parentResult.isOk()).toBe(true);
        if (parentResult.isOk()) {
          parentArg = parentResult.value;
        }

        // Create child argument with shared set as premise
        const childResult = service.createAtomicArgumentWithSets(sharedSet);
        expect(childResult.isOk()).toBe(true);
        if (childResult.isOk()) {
          childArg = childResult.value;
        }
      }
    });

    describe('successful connection cases', () => {
      it('should validate properly connected arguments', () => {
        const result = service.connectAtomicArgumentsBySharedSet(parentArg, childArg, sharedSet);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('error cases', () => {
      it('should fail when parent has no conclusion set', () => {
        const emptyParentResult = service.createAtomicArgumentWithSets();
        expect(emptyParentResult.isOk()).toBe(true);

        if (emptyParentResult.isOk()) {
          const emptyParent = emptyParentResult.value;
          const result = service.connectAtomicArgumentsBySharedSet(
            emptyParent,
            childArg,
            sharedSet,
          );

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must have the relevant ordered sets');
          }
        }
      });

      it('should fail when child has no premise set', () => {
        const emptyChildResult = service.createAtomicArgumentWithSets();
        expect(emptyChildResult.isOk()).toBe(true);

        if (emptyChildResult.isOk()) {
          const emptyChild = emptyChildResult.value;
          const result = service.connectAtomicArgumentsBySharedSet(
            parentArg,
            emptyChild,
            sharedSet,
          );

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must have the relevant ordered sets');
          }
        }
      });

      it('should fail when shared set does not match parent conclusion', () => {
        const otherSetResult = service.createEmptyOrderedSet();
        expect(otherSetResult.isOk()).toBe(true);

        if (otherSetResult.isOk()) {
          const otherSet = otherSetResult.value;
          const result = service.connectAtomicArgumentsBySharedSet(parentArg, childArg, otherSet);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must match both argument references');
          }
        }
      });

      it('should fail when shared set does not match child premise', () => {
        const otherSetResult = service.createEmptyOrderedSet();
        expect(otherSetResult.isOk()).toBe(true);

        if (otherSetResult.isOk()) {
          const otherSet = otherSetResult.value;
          // Create new child with different premise set
          const newChildResult = service.createAtomicArgumentWithSets(otherSet);
          expect(newChildResult.isOk()).toBe(true);

          if (newChildResult.isOk()) {
            const newChild = newChildResult.value;
            const result = service.connectAtomicArgumentsBySharedSet(
              parentArg,
              newChild,
              sharedSet,
            );

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              customExpect(result.error).toBeValidationError('must match both argument references');
            }
          }
        }
      });
    });
  });

  describe('createBranchFromArgumentConclusion', () => {
    let parentArg: AtomicArgument;
    let conclusionSet: OrderedSet;

    beforeEach(() => {
      const conclusionSetResult = service.createEmptyOrderedSet();
      expect(conclusionSetResult.isOk()).toBe(true);

      if (conclusionSetResult.isOk()) {
        conclusionSet = conclusionSetResult.value;
        const parentResult = service.createAtomicArgumentWithSets(undefined, conclusionSet);
        expect(parentResult.isOk()).toBe(true);
        if (parentResult.isOk()) {
          parentArg = parentResult.value;
        }
      }
    });

    describe('successful branching cases', () => {
      it('should create branch from parent conclusion', () => {
        const result = service.createBranchFromArgumentConclusion(parentArg, conclusionSet);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          customExpect(result.value).toBeValidAtomicArgument();
          // Child should use parent's conclusion as premise
          expect(result.value.getPremiseSet()?.equals(conclusionSet.getId())).toBe(true);
        }
      });

      it('should add reference to conclusion set', () => {
        const result = service.createBranchFromArgumentConclusion(parentArg, conclusionSet);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const childArg = result.value;
          expect(
            conclusionSet.getReferencedByAsPremise().some((id) => id.equals(childArg.getId())),
          ).toBe(true);
        }
      });
    });

    describe('error cases', () => {
      it('should fail when conclusion set does not match parent', () => {
        const otherSetResult = service.createEmptyOrderedSet();
        expect(otherSetResult.isOk()).toBe(true);

        if (otherSetResult.isOk()) {
          const otherSet = otherSetResult.value;
          const result = service.createBranchFromArgumentConclusion(parentArg, otherSet);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must match parent argument');
          }
        }
      });

      it('should fail when parent has no conclusion set', () => {
        const emptyParentResult = service.createAtomicArgumentWithSets();
        expect(emptyParentResult.isOk()).toBe(true);

        if (emptyParentResult.isOk()) {
          const emptyParent = emptyParentResult.value;
          const result = service.createBranchFromArgumentConclusion(emptyParent, conclusionSet);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must match parent argument');
          }
        }
      });
    });
  });

  describe('findDirectlyConnectedArguments', () => {
    let argument1: AtomicArgument;
    let argument2: AtomicArgument;
    let argument3: AtomicArgument;
    let sharedSet: OrderedSet;
    let argumentsMap: Map<AtomicArgumentId, AtomicArgument>;

    beforeEach(() => {
      const sharedSetResult = service.createEmptyOrderedSet();
      expect(sharedSetResult.isOk()).toBe(true);

      if (sharedSetResult.isOk()) {
        sharedSet = sharedSetResult.value;

        // Create connected arguments: arg1 → arg2
        const arg1Result = service.createAtomicArgumentWithSets(undefined, sharedSet);
        const arg2Result = service.createAtomicArgumentWithSets(sharedSet);

        // Create unconnected argument
        const arg3Result = service.createAtomicArgumentWithSets();

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
      const set1Result = service.createEmptyOrderedSet();
      const set2Result = service.createEmptyOrderedSet();
      expect(set1Result.isOk() && set2Result.isOk()).toBe(true);

      if (set1Result.isOk() && set2Result.isOk()) {
        const set1 = set1Result.value;
        const set2 = set2Result.value;

        const arg1Result = service.createAtomicArgumentWithSets(undefined, set1);
        const arg2Result = service.createAtomicArgumentWithSets(set1, set2);
        const arg3Result = service.createAtomicArgumentWithSets(set2);
        const arg4Result = service.createAtomicArgumentWithSets(); // Disconnected

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
    let sharedSet: OrderedSet;
    let orderedSetsMap: Map<OrderedSetId, OrderedSet>;

    beforeEach(() => {
      const sharedSetResult = service.createEmptyOrderedSet();
      expect(sharedSetResult.isOk()).toBe(true);

      if (sharedSetResult.isOk()) {
        sharedSet = sharedSetResult.value;

        // Add some statements to make it non-empty
        const statementResult = service.createStatementFromContent('Test statement');
        expect(statementResult.isOk()).toBe(true);
        if (statementResult.isOk()) {
          service.addStatementToOrderedSet(sharedSet, statementResult.value);
        }

        const fromResult = service.createAtomicArgumentWithSets(undefined, sharedSet);
        const toResult = service.createAtomicArgumentWithSets(sharedSet);

        expect(fromResult.isOk() && toResult.isOk()).toBe(true);
        if (fromResult.isOk() && toResult.isOk()) {
          fromArgument = fromResult.value;
          toArgument = toResult.value;
        }

        orderedSetsMap = new Map([[sharedSet.getId(), sharedSet]]);
      }
    });

    describe('successful validation cases', () => {
      it('should validate proper statement flow', () => {
        const result = service.validateStatementFlow(fromArgument, toArgument, orderedSetsMap);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('error cases', () => {
      it('should fail when from argument has no conclusion set', () => {
        const emptyFromResult = service.createAtomicArgumentWithSets();
        expect(emptyFromResult.isOk()).toBe(true);

        if (emptyFromResult.isOk()) {
          const emptyFrom = emptyFromResult.value;
          const result = service.validateStatementFlow(emptyFrom, toArgument, orderedSetsMap);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must have relevant ordered sets');
          }
        }
      });

      it('should fail when to argument has no premise set', () => {
        const emptyToResult = service.createAtomicArgumentWithSets();
        expect(emptyToResult.isOk()).toBe(true);

        if (emptyToResult.isOk()) {
          const emptyTo = emptyToResult.value;
          const result = service.validateStatementFlow(fromArgument, emptyTo, orderedSetsMap);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            customExpect(result.error).toBeValidationError('must have relevant ordered sets');
          }
        }
      });

      it('should fail when arguments are not connected', () => {
        const otherSetResult = service.createEmptyOrderedSet();
        expect(otherSetResult.isOk()).toBe(true);

        if (otherSetResult.isOk()) {
          const otherSet = otherSetResult.value;
          const disconnectedResult = service.createAtomicArgumentWithSets(otherSet);
          expect(disconnectedResult.isOk()).toBe(true);

          if (disconnectedResult.isOk()) {
            const disconnected = disconnectedResult.value;
            const result = service.validateStatementFlow(
              fromArgument,
              disconnected,
              orderedSetsMap,
            );

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              customExpect(result.error).toBeValidationError('not connected by shared ordered set');
            }
          }
        }
      });

      it('should fail when shared set is not found in map', () => {
        const emptyMap = new Map<OrderedSetId, OrderedSet>();
        const result = service.validateStatementFlow(fromArgument, toArgument, emptyMap);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          customExpect(result.error).toBeValidationError('not found');
        }
      });

      it('should fail when shared set is empty', () => {
        const emptySetResult = service.createEmptyOrderedSet();
        expect(emptySetResult.isOk()).toBe(true);

        if (emptySetResult.isOk()) {
          const emptySet = emptySetResult.value;
          const emptyFromResult = service.createAtomicArgumentWithSets(undefined, emptySet);
          const emptyToResult = service.createAtomicArgumentWithSets(emptySet);

          expect(emptyFromResult.isOk() && emptyToResult.isOk()).toBe(true);
          if (emptyFromResult.isOk() && emptyToResult.isOk()) {
            const emptyFrom = emptyFromResult.value;
            const emptyTo = emptyToResult.value;
            const emptySetMap = new Map([[emptySet.getId(), emptySet]]);

            const result = service.validateStatementFlow(emptyFrom, emptyTo, emptySetMap);

            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              customExpect(result.error).toBeValidationError('empty ordered set');
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
      const sharedSetResult = service.createEmptyOrderedSet();
      expect(sharedSetResult.isOk()).toBe(true);

      if (sharedSetResult.isOk()) {
        const sharedSet = sharedSetResult.value;

        const fromResult = service.createAtomicArgumentWithSets(undefined, sharedSet);
        const toResult = service.createAtomicArgumentWithSets(sharedSet);
        const disconnectedResult = service.createAtomicArgumentWithSets();

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
        const emptyFromResult = service.createAtomicArgumentWithSets();
        expect(emptyFromResult.isOk()).toBe(true);

        if (emptyFromResult.isOk()) {
          const emptyFrom = emptyFromResult.value;
          const canFlow = service.canStatementsFlowBetween(emptyFrom, connectedTo);

          expect(canFlow).toBe(false);
        }
      });

      it('should return false when to argument has no premise', () => {
        const emptyToResult = service.createAtomicArgumentWithSets();
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
      const set1Result = service.createEmptyOrderedSet();
      const set2Result = service.createEmptyOrderedSet();
      expect(set1Result.isOk() && set2Result.isOk()).toBe(true);

      if (set1Result.isOk() && set2Result.isOk()) {
        const set1 = set1Result.value;
        const set2 = set2Result.value;

        const arg1Result = service.createAtomicArgumentWithSets(undefined, set1);
        const arg2Result = service.createAtomicArgumentWithSets(set1, set2);
        const arg3Result = service.createAtomicArgumentWithSets(set2);
        const disconnectedResult = service.createAtomicArgumentWithSets();

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
        const set1Result = service.createEmptyOrderedSet();
        const set2aResult = service.createEmptyOrderedSet();
        const set2bResult = service.createEmptyOrderedSet();
        const set3Result = service.createEmptyOrderedSet();

        expect(
          set1Result.isOk() && set2aResult.isOk() && set2bResult.isOk() && set3Result.isOk(),
        ).toBe(true);

        if (set1Result.isOk() && set2aResult.isOk() && set2bResult.isOk() && set3Result.isOk()) {
          const set1 = set1Result.value;
          const set2a = set2aResult.value;
          const set2b = set2bResult.value;
          const set3 = set3Result.value;

          const startResult = service.createAtomicArgumentWithSets(undefined, set1);
          const branch2aResult = service.createAtomicArgumentWithSets(set1, set2a);
          const branch2bResult = service.createAtomicArgumentWithSets(set1, set2b);
          const endResult = service.createAtomicArgumentWithSets(set2a, set3); // Only connect through 2a

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

        // Create ordered sets
        const premiseSetResult = service.createOrderedSetFromStatements(premiseStatements);
        const conclusionSetResult = service.createOrderedSetFromStatements(conclusionStatements);

        expect(premiseSetResult.isOk() && conclusionSetResult.isOk()).toBe(true);

        if (premiseSetResult.isOk() && conclusionSetResult.isOk()) {
          const premiseSet = premiseSetResult.value;
          const conclusionSet = conclusionSetResult.value;

          // Create atomic argument
          const argumentResult = service.createAtomicArgumentWithSets(premiseSet, conclusionSet);
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            const argument = argumentResult.value;
            customExpect(argument).toBeValidAtomicArgument();

            // Create branch
            const branchResult = service.createBranchFromArgumentConclusion(
              argument,
              conclusionSet,
            );
            expect(branchResult.isOk()).toBe(true);

            if (branchResult.isOk()) {
              const branch = branchResult.value;
              customExpect(branch).toBeValidAtomicArgument();

              // Verify connection
              expect(service.canStatementsFlowBetween(argument, branch)).toBe(true);
            }
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
                const orderedSetResult = service.createOrderedSetFromStatements([statement]);
                expect(orderedSetResult.isOk()).toBe(true);

                if (orderedSetResult.isOk()) {
                  const orderedSet = orderedSetResult.value;
                  const argumentResult = service.createAtomicArgumentWithSets(
                    orderedSet,
                    orderedSet,
                  );
                  expect(argumentResult.isOk()).toBe(true);

                  if (argumentResult.isOk()) {
                    const argument = argumentResult.value;
                    // Argument should maintain consistent identity
                    expect(argument.getId().equals(argument.getId())).toBe(true);
                  }
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
