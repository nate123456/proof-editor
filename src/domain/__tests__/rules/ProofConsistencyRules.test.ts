import { describe, expect, it } from 'vitest';
import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { Node } from '../../entities/Node.js';
import { OrderedSet } from '../../entities/OrderedSet.js';
import { Statement } from '../../entities/Statement.js';
import {
  validateAggregateConsistency,
  validateArgumentConnections,
  validateStatementUsage,
  validateTreeStructure,
} from '../../rules/ProofConsistencyRules.js';
import { AtomicArgumentId, Attachment, NodeId } from '../../shared/value-objects.js';

describe('ProofConsistencyRules', () => {
  describe('validateStatementUsage', () => {
    it('should validate correct statement usage counts', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      // Create statement
      const statementResult = Statement.create('Test statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statement.incrementUsage(); // Manually set usage count to 1
        statements.set(statement.getId(), statement);

        // Create ordered set with the statement
        const orderedSetResult = OrderedSet.create([statement.getId()]);
        expect(orderedSetResult.isOk()).toBe(true);

        if (orderedSetResult.isOk()) {
          const orderedSet = orderedSetResult.value;

          // Create argument that references the ordered set
          const argumentResult = AtomicArgument.create(orderedSet.getId());
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            const argument = argumentResult.value;
            argumentsMap.set(argument.getId(), argument);

            const result = validateStatementUsage(statements, argumentsMap);
            expect(result.isOk()).toBe(true);
          }
        }
      }
    });

    it('should detect statement usage count mismatch', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      const statementResult = Statement.create('Test statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        // Don't increment usage count, but create argument that uses it
        statements.set(statement.getId(), statement);

        const orderedSetResult = OrderedSet.create([statement.getId()]);
        expect(orderedSetResult.isOk()).toBe(true);

        if (orderedSetResult.isOk()) {
          const orderedSet = orderedSetResult.value;
          const argumentResult = AtomicArgument.create(orderedSet.getId());
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            const argument = argumentResult.value;
            argumentsMap.set(argument.getId(), argument);

            const result = validateStatementUsage(statements, argumentsMap);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toContain('usage count mismatch');
            }
          }
        }
      }
    });

    it('should detect orphaned statements', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      const statementResult = Statement.create('Orphaned statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statements.set(statement.getId(), statement);

        // Add some arguments but don't reference the statement
        const dummyArgumentResult = AtomicArgument.create();
        expect(dummyArgumentResult.isOk()).toBe(true);

        if (dummyArgumentResult.isOk()) {
          const dummyArgument = dummyArgumentResult.value;
          argumentsMap.set(dummyArgument.getId(), dummyArgument);

          const result = validateStatementUsage(statements, argumentsMap);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('Orphaned statement');
          }
        }
      }
    });

    it('should allow orphaned statements when nodes are present', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      const statementResult = Statement.create('Orphaned statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statements.set(statement.getId(), statement);

        // Add some arguments but don't reference the statement
        const dummyArgumentResult = AtomicArgument.create();
        expect(dummyArgumentResult.isOk()).toBe(true);

        if (dummyArgumentResult.isOk()) {
          const dummyArgument = dummyArgumentResult.value;
          argumentsMap.set(dummyArgument.getId(), dummyArgument);

          // With nodes=true, orphaned statements should be allowed
          const result = validateStatementUsage(statements, argumentsMap, true);
          expect(result.isOk()).toBe(true);
        }
      }
    });

    it('should handle empty statement map', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      // Add an argument to make the count mismatch test meaningful
      const argumentResult = AtomicArgument.create();
      expect(argumentResult.isOk()).toBe(true);

      if (argumentResult.isOk()) {
        argumentsMap.set(argumentResult.value.getId(), argumentResult.value);

        const result = validateStatementUsage(statements, argumentsMap);
        expect(result.isOk()).toBe(true); // Empty statements with empty usage should be fine
      }
    });

    it('should handle empty arguments map', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      const statementResult = Statement.create('Lonely statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statements.set(statement.getId(), statement);

        const result = validateStatementUsage(statements, argumentsMap);
        expect(result.isOk()).toBe(true); // No arguments means no usage requirements
      }
    });

    it('should handle complex usage count scenarios', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      // Create multiple statements with different usage patterns
      const statement1Result = Statement.create('Statement 1');
      const statement2Result = Statement.create('Statement 2');
      const statement3Result = Statement.create('Statement 3');

      expect(statement1Result.isOk() && statement2Result.isOk() && statement3Result.isOk()).toBe(
        true,
      );

      if (statement1Result.isOk() && statement2Result.isOk() && statement3Result.isOk()) {
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;
        const statement3 = statement3Result.value;

        // Set up usage counts manually
        statement1.incrementUsage(); // Used once
        statement1.incrementUsage(); // Used twice
        statement2.incrementUsage(); // Used once
        // statement3 has 0 usage

        statements.set(statement1.getId(), statement1);
        statements.set(statement2.getId(), statement2);
        statements.set(statement3.getId(), statement3);

        // Create ordered sets and arguments to match usage
        const orderedSet1Result = OrderedSet.create([statement1.getId(), statement2.getId()]);
        const orderedSet2Result = OrderedSet.create([statement1.getId()]);

        expect(orderedSet1Result.isOk() && orderedSet2Result.isOk()).toBe(true);

        if (orderedSet1Result.isOk() && orderedSet2Result.isOk()) {
          const argument1Result = AtomicArgument.create(orderedSet1Result.value.getId());
          const argument2Result = AtomicArgument.create(orderedSet2Result.value.getId());

          expect(argument1Result.isOk() && argument2Result.isOk()).toBe(true);

          if (argument1Result.isOk() && argument2Result.isOk()) {
            argumentsMap.set(argument1Result.value.getId(), argument1Result.value);
            argumentsMap.set(argument2Result.value.getId(), argument2Result.value);

            // Total set references: 2 (from 2 arguments)
            // Total statement usage: 2 + 1 + 0 = 3
            // This should fail due to mismatch
            const result = validateStatementUsage(statements, argumentsMap);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toContain('usage count mismatch');
              expect(result.error.details?.expectedTotalUsage).toBe(2);
              expect(result.error.details?.actualTotalUsage).toBe(3);
            }
          }
        }
      }
    });

    it('should handle error during statement usage validation', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      // Create a mock statement that will throw an error during getUsageCount
      const mockStatement = {
        getId: () => ({ getValue: () => 'mock-id' }),
        getUsageCount: () => {
          throw new Error('Mock error during usage count check');
        },
        getContent: () => 'Mock statement',
      } as any;

      statements.set(mockStatement.getId(), mockStatement);

      const argumentResult = AtomicArgument.create();
      expect(argumentResult.isOk()).toBe(true);

      if (argumentResult.isOk()) {
        argumentsMap.set(argumentResult.value.getId(), argumentResult.value);

        const result = validateStatementUsage(statements, argumentsMap);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Statement usage validation failed');
        }
      }
    });
  });

  describe('validateArgumentConnections', () => {
    it('should validate valid argument connections', () => {
      const argumentsMap = new Map();

      // Create two compatible arguments
      const orderedSet1Result = OrderedSet.create([]);
      const orderedSet2Result = OrderedSet.create([]);

      expect(orderedSet1Result.isOk() && orderedSet2Result.isOk()).toBe(true);

      if (orderedSet1Result.isOk() && orderedSet2Result.isOk()) {
        const arg1Result = AtomicArgument.create(undefined, orderedSet1Result.value.getId());
        const arg2Result = AtomicArgument.create(
          orderedSet1Result.value.getId(),
          orderedSet2Result.value.getId(),
        );

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

        if (arg1Result.isOk() && arg2Result.isOk()) {
          argumentsMap.set(arg1Result.value.getId(), arg1Result.value);
          argumentsMap.set(arg2Result.value.getId(), arg2Result.value);

          const result = validateArgumentConnections(argumentsMap);
          expect(result.isOk()).toBe(true);
        }
      }
    });

    it('should detect argument with same premise and conclusion set', () => {
      const argumentsMap = new Map();

      const orderedSetResult = OrderedSet.create([]);
      expect(orderedSetResult.isOk()).toBe(true);

      if (orderedSetResult.isOk()) {
        const orderedSet = orderedSetResult.value;
        const argumentResult = AtomicArgument.create(orderedSet.getId(), orderedSet.getId());
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const argument = argumentResult.value;
          argumentsMap.set(argument.getId(), argument);

          const result = validateArgumentConnections(argumentsMap);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('same premise and conclusion set');
          }
        }
      }
    });

    it('should detect cycles in argument connections', () => {
      const argumentsMap = new Map();

      // Create a cycle: A -> B -> C -> A
      const orderedSet1Result = OrderedSet.create([]);
      const orderedSet2Result = OrderedSet.create([]);
      const orderedSet3Result = OrderedSet.create([]);

      expect(orderedSet1Result.isOk() && orderedSet2Result.isOk() && orderedSet3Result.isOk()).toBe(
        true,
      );

      if (orderedSet1Result.isOk() && orderedSet2Result.isOk() && orderedSet3Result.isOk()) {
        const set1 = orderedSet1Result.value;
        const set2 = orderedSet2Result.value;
        const set3 = orderedSet3Result.value;

        // Create arguments that form a cycle
        const arg1Result = AtomicArgument.create(set1.getId(), set2.getId()); // A -> B
        const arg2Result = AtomicArgument.create(set2.getId(), set3.getId()); // B -> C
        const arg3Result = AtomicArgument.create(set3.getId(), set1.getId()); // C -> A (creates cycle)

        expect(arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk()).toBe(true);

        if (arg1Result.isOk() && arg2Result.isOk() && arg3Result.isOk()) {
          argumentsMap.set(arg1Result.value.getId(), arg1Result.value);
          argumentsMap.set(arg2Result.value.getId(), arg2Result.value);
          argumentsMap.set(arg3Result.value.getId(), arg3Result.value);

          const result = validateArgumentConnections(argumentsMap);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('cycles');
            expect(result.error.details?.cycles).toBeDefined();
          }
        }
      }
    });

    it('should detect self-referencing argument cycles', () => {
      const argumentsMap = new Map();

      // Create a self-referencing cycle (though this should be caught by same premise/conclusion check)
      const orderedSet1Result = OrderedSet.create([]);
      const orderedSet2Result = OrderedSet.create([]);

      expect(orderedSet1Result.isOk() && orderedSet2Result.isOk()).toBe(true);

      if (orderedSet1Result.isOk() && orderedSet2Result.isOk()) {
        const set1 = orderedSet1Result.value;
        const set2 = orderedSet2Result.value;

        // Create argument that connects to itself indirectly
        const arg1Result = AtomicArgument.create(set1.getId(), set2.getId());
        const arg2Result = AtomicArgument.create(set2.getId(), set1.getId());

        expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

        if (arg1Result.isOk() && arg2Result.isOk()) {
          argumentsMap.set(arg1Result.value.getId(), arg1Result.value);
          argumentsMap.set(arg2Result.value.getId(), arg2Result.value);

          const result = validateArgumentConnections(argumentsMap);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('cycles');
          }
        }
      }
    });

    it('should handle complex cycle detection paths', () => {
      const argumentsMap = new Map();

      // Create a more complex graph with multiple paths and a cycle
      const orderedSets = [];
      for (let i = 0; i < 5; i++) {
        const setResult = OrderedSet.create([]);
        expect(setResult.isOk()).toBe(true);
        if (setResult.isOk()) {
          orderedSets.push(setResult.value);
        }
      }

      if (orderedSets.length === 5) {
        // Create arguments: 0->1, 1->2, 2->3, 3->4, 4->2 (cycle at 2,3,4)
        const args = [
          AtomicArgument.create(orderedSets[0]?.getId(), orderedSets[1]?.getId()),
          AtomicArgument.create(orderedSets[1]?.getId(), orderedSets[2]?.getId()),
          AtomicArgument.create(orderedSets[2]?.getId(), orderedSets[3]?.getId()),
          AtomicArgument.create(orderedSets[3]?.getId(), orderedSets[4]?.getId()),
          AtomicArgument.create(orderedSets[4]?.getId(), orderedSets[2]?.getId()), // Creates cycle
        ];

        expect(args.every((arg) => arg.isOk())).toBe(true);

        args.forEach((argResult) => {
          if (argResult.isOk()) {
            argumentsMap.set(argResult.value.getId(), argResult.value);
          }
        });

        const result = validateArgumentConnections(argumentsMap);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('cycles');
          expect(result.error.details?.cycles).toBeDefined();
          expect(Array.isArray(result.error.details?.cycles)).toBe(true);
        }
      }
    });

    it('should handle error during cycle detection', () => {
      const argumentsMap = new Map();

      // Create a mock argument that will throw an error during iteration
      const mockId = AtomicArgumentId.generate();
      const mockArgument = {
        getId: () => mockId,
        canConnectTo: () => false, // Valid return
        getPremiseSet: () => null,
        getConclusionSet: () => null,
      } as any;

      // Override the Map.prototype.values to throw an error during iteration
      const originalValues = Map.prototype.values;
      Map.prototype.values = function () {
        if (this === argumentsMap) {
          throw new Error('Mock error during iteration');
        }
        return originalValues.call(this);
      };

      argumentsMap.set(mockId, mockArgument);

      try {
        const result = validateArgumentConnections(argumentsMap);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Argument connection validation failed');
        }
      } finally {
        // Restore original method
        Map.prototype.values = originalValues;
      }
    });
  });

  describe('validateTreeStructure', () => {
    it('should validate valid tree structure', () => {
      const nodes = new Map();

      // Create a root node
      const argumentId = AtomicArgumentId.generate();
      const rootNodeResult = Node.createRoot(argumentId);
      expect(rootNodeResult.isOk()).toBe(true);

      if (rootNodeResult.isOk()) {
        const rootNode = rootNodeResult.value;
        nodes.set(rootNode.getId(), rootNode);

        const result = validateTreeStructure(nodes);
        expect(result.isOk()).toBe(true);
      }
    });

    it('should detect non-root node without parent', () => {
      const nodes = new Map();

      // Create a node with attachment but parent doesn't exist
      const argumentId = AtomicArgumentId.generate();
      const fakeParentId = NodeId.generate();
      const attachmentResult = Attachment.create(fakeParentId, 0);
      expect(attachmentResult.isOk()).toBe(true);

      if (attachmentResult.isOk()) {
        const childNodeResult = Node.createChild(argumentId, attachmentResult.value);
        expect(childNodeResult.isOk()).toBe(true);

        if (childNodeResult.isOk()) {
          const childNode = childNodeResult.value;
          nodes.set(childNode.getId(), childNode);

          const result = validateTreeStructure(nodes);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toContain('references non-existent parent');
          }
        }
      }
    });

    it('should detect invalid premise position', () => {
      const nodes = new Map();

      const parentArgumentId = AtomicArgumentId.generate();
      const _childArgumentId = AtomicArgumentId.generate();

      const parentNodeResult = Node.createRoot(parentArgumentId);
      expect(parentNodeResult.isOk()).toBe(true);

      if (parentNodeResult.isOk()) {
        const parentNode = parentNodeResult.value;
        nodes.set(parentNode.getId(), parentNode);

        // Create attachment with invalid position
        const attachmentResult = Attachment.create(parentNode.getId(), -1);
        expect(attachmentResult.isErr()).toBe(true); // Should fail at attachment creation
      }
    });

    it('should detect multiple nodes at same position', () => {
      const nodes = new Map();

      const parentArgumentId = AtomicArgumentId.generate();
      const child1ArgumentId = AtomicArgumentId.generate();
      const child2ArgumentId = AtomicArgumentId.generate();

      const parentNodeResult = Node.createRoot(parentArgumentId);
      expect(parentNodeResult.isOk()).toBe(true);

      if (parentNodeResult.isOk()) {
        const parentNode = parentNodeResult.value;
        nodes.set(parentNode.getId(), parentNode);

        // Create two children at the same position
        const attachment1Result = Attachment.create(parentNode.getId(), 0);
        const attachment2Result = Attachment.create(parentNode.getId(), 0);

        expect(attachment1Result.isOk() && attachment2Result.isOk()).toBe(true);

        if (attachment1Result.isOk() && attachment2Result.isOk()) {
          const child1NodeResult = Node.createChild(child1ArgumentId, attachment1Result.value);
          const child2NodeResult = Node.createChild(child2ArgumentId, attachment2Result.value);

          expect(child1NodeResult.isOk() && child2NodeResult.isOk()).toBe(true);

          if (child1NodeResult.isOk() && child2NodeResult.isOk()) {
            nodes.set(child1NodeResult.value.getId(), child1NodeResult.value);
            nodes.set(child2NodeResult.value.getId(), child2NodeResult.value);

            const result = validateTreeStructure(nodes);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toContain('Multiple nodes at same position');
            }
          }
        }
      }
    });

    it('should detect cycles in tree structures', () => {
      const nodes = new Map();

      // Create nodes that will form a cycle
      const arg1Id = AtomicArgumentId.generate();
      const arg2Id = AtomicArgumentId.generate();
      const arg3Id = AtomicArgumentId.generate();

      const node1Id = NodeId.generate();
      const node2Id = NodeId.generate();
      const node3Id = NodeId.generate();

      // Create nodes with circular parent-child relationships
      // This requires creating mock nodes that bypass normal validation
      const mockNode1 = {
        getId: () => node1Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node3Id, // Points to node3
        getPremisePosition: () => 0,
        getArgumentId: () => arg1Id,
      } as any;

      const mockNode2 = {
        getId: () => node2Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node1Id, // Points to node1
        getPremisePosition: () => 0,
        getArgumentId: () => arg2Id,
      } as any;

      const mockNode3 = {
        getId: () => node3Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node2Id, // Points to node2, completing cycle
        getPremisePosition: () => 0,
        getArgumentId: () => arg3Id,
      } as any;

      nodes.set(node1Id, mockNode1);
      nodes.set(node2Id, mockNode2);
      nodes.set(node3Id, mockNode3);

      const result = validateTreeStructure(nodes);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Tree structure contains cycles');
        expect(result.error.details?.cycles).toBeDefined();
      }
    });

    it('should handle complex tree cycle detection', () => {
      const nodes = new Map();

      // Create a more complex tree structure with cycle
      const arg1Id = AtomicArgumentId.generate();
      const arg2Id = AtomicArgumentId.generate();
      const arg3Id = AtomicArgumentId.generate();
      const arg4Id = AtomicArgumentId.generate();
      const arg5Id = AtomicArgumentId.generate();

      const node1Id = NodeId.generate();
      const node2Id = NodeId.generate();
      const node3Id = NodeId.generate();
      const node4Id = NodeId.generate();
      const node5Id = NodeId.generate();

      // Create a structure: 1 -> 2 -> 3 -> 4 -> 5 -> 3 (cycle at 3-4-5)
      const mockNode1 = {
        getId: () => node1Id,
        isRoot: () => true,
        isChild: () => false,
        getParentNodeId: () => null,
        getPremisePosition: () => null,
        getArgumentId: () => arg1Id,
      } as any;

      const mockNode2 = {
        getId: () => node2Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node1Id,
        getPremisePosition: () => 0,
        getArgumentId: () => arg2Id,
      } as any;

      const mockNode3 = {
        getId: () => node3Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node2Id,
        getPremisePosition: () => 0,
        getArgumentId: () => arg3Id,
      } as any;

      const mockNode4 = {
        getId: () => node4Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node3Id,
        getPremisePosition: () => 0,
        getArgumentId: () => arg4Id,
      } as any;

      const mockNode5 = {
        getId: () => node5Id,
        isRoot: () => false,
        isChild: () => true,
        getParentNodeId: () => node4Id,
        getPremisePosition: () => 0,
        getArgumentId: () => arg5Id,
      } as any;

      // Add cycle: modify node3 to point to node5 as well
      mockNode3.getParentNodeId = () => node5Id; // Creates cycle: 3 -> 5 -> 4 -> 3

      nodes.set(node1Id, mockNode1);
      nodes.set(node2Id, mockNode2);
      nodes.set(node3Id, mockNode3);
      nodes.set(node4Id, mockNode4);
      nodes.set(node5Id, mockNode5);

      const result = validateTreeStructure(nodes);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Tree structure contains cycles');
        expect(result.error.details?.cycles).toBeDefined();
        expect(Array.isArray(result.error.details?.cycles)).toBe(true);
      }
    });

    it('should handle tree structure validation with visited nodes', () => {
      const nodes = new Map();

      // Create a valid tree structure first
      const parentArgumentId = AtomicArgumentId.generate();
      const child1ArgumentId = AtomicArgumentId.generate();
      const child2ArgumentId = AtomicArgumentId.generate();
      const grandchild1ArgumentId = AtomicArgumentId.generate();

      const parentNodeResult = Node.createRoot(parentArgumentId);
      expect(parentNodeResult.isOk()).toBe(true);

      if (parentNodeResult.isOk()) {
        const parentNode = parentNodeResult.value;
        nodes.set(parentNode.getId(), parentNode);

        // Create two children
        const attachment1Result = Attachment.create(parentNode.getId(), 0);
        const attachment2Result = Attachment.create(parentNode.getId(), 1);

        expect(attachment1Result.isOk() && attachment2Result.isOk()).toBe(true);

        if (attachment1Result.isOk() && attachment2Result.isOk()) {
          const child1NodeResult = Node.createChild(child1ArgumentId, attachment1Result.value);
          const child2NodeResult = Node.createChild(child2ArgumentId, attachment2Result.value);

          expect(child1NodeResult.isOk() && child2NodeResult.isOk()).toBe(true);

          if (child1NodeResult.isOk() && child2NodeResult.isOk()) {
            const child1Node = child1NodeResult.value;
            const child2Node = child2NodeResult.value;
            nodes.set(child1Node.getId(), child1Node);
            nodes.set(child2Node.getId(), child2Node);

            // Add grandchild to child1
            const grandchildAttachmentResult = Attachment.create(child1Node.getId(), 0);
            expect(grandchildAttachmentResult.isOk()).toBe(true);

            if (grandchildAttachmentResult.isOk()) {
              const grandchildNodeResult = Node.createChild(
                grandchild1ArgumentId,
                grandchildAttachmentResult.value,
              );
              expect(grandchildNodeResult.isOk()).toBe(true);

              if (grandchildNodeResult.isOk()) {
                nodes.set(grandchildNodeResult.value.getId(), grandchildNodeResult.value);

                // This should pass - it's a valid tree
                const result = validateTreeStructure(nodes);
                expect(result.isOk()).toBe(true);
              }
            }
          }
        }
      }
    });

    it('should handle error during tree structure validation', () => {
      const nodes = new Map();

      // Create a mock node that will throw an error during validation
      const mockNode = {
        getId: () => NodeId.generate(),
        isRoot: () => {
          throw new Error('Mock error during tree validation');
        },
        isChild: () => false,
        getParentNodeId: () => null,
        getPremisePosition: () => null,
      } as any;

      nodes.set(mockNode.getId(), mockNode);

      const result = validateTreeStructure(nodes);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Tree structure validation failed');
      }
    });
  });

  describe('validateAggregateConsistency', () => {
    it('should validate consistent aggregate', () => {
      const statements = new Map();
      const argumentsMap = new Map();
      const nodes = new Map();

      // Create valid statement and argument
      const statementResult = Statement.create('Valid statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statements.set(statement.getId(), statement);

        const argumentResult = AtomicArgument.create();
        expect(argumentResult.isOk()).toBe(true);

        if (argumentResult.isOk()) {
          const argument = argumentResult.value;
          argumentsMap.set(argument.getId(), argument);

          // Create valid node
          const nodeResult = Node.createRoot(argument.getId());
          expect(nodeResult.isOk()).toBe(true);

          if (nodeResult.isOk()) {
            const node = nodeResult.value;
            nodes.set(node.getId(), node);

            const result = validateAggregateConsistency(statements, argumentsMap, nodes);
            expect(result.isOk()).toBe(true);
          }
        }
      }
    });

    it('should detect statement usage inconsistencies in aggregate', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      const statementResult = Statement.create('Inconsistent statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        // Don't increment usage count
        statements.set(statement.getId(), statement);

        const orderedSetResult = OrderedSet.create([statement.getId()]);
        expect(orderedSetResult.isOk()).toBe(true);

        if (orderedSetResult.isOk()) {
          const orderedSet = orderedSetResult.value;
          const argumentResult = AtomicArgument.create(orderedSet.getId());
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            const argument = argumentResult.value;
            argumentsMap.set(argument.getId(), argument);

            const result = validateAggregateConsistency(statements, argumentsMap);
            expect(result.isErr()).toBe(true);
          }
        }
      }
    });

    it('should detect tree structure issues in aggregate', () => {
      const statements = new Map();
      const argumentsMap = new Map();
      const nodes = new Map();

      // Create valid statements and arguments
      const statementResult = Statement.create('Valid statement');
      const argumentResult = AtomicArgument.create();

      expect(statementResult.isOk() && argumentResult.isOk()).toBe(true);

      if (statementResult.isOk() && argumentResult.isOk()) {
        statements.set(statementResult.value.getId(), statementResult.value);
        argumentsMap.set(argumentResult.value.getId(), argumentResult.value);

        // Create invalid node structure
        const fakeParentId = NodeId.generate();
        const attachmentResult = Attachment.create(fakeParentId, 0);
        expect(attachmentResult.isOk()).toBe(true);

        if (attachmentResult.isOk()) {
          const nodeResult = Node.createChild(argumentResult.value.getId(), attachmentResult.value);
          expect(nodeResult.isOk()).toBe(true);

          if (nodeResult.isOk()) {
            const node = nodeResult.value;
            nodes.set(node.getId(), node);

            const result = validateAggregateConsistency(statements, argumentsMap, nodes);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toContain('Tree structure validation failed');
            }
          }
        }
      }
    });

    it('should propagate argument connection errors in aggregate validation', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      // Create statement with correct usage - need to account for 2 sets (premise and conclusion)
      const statementResult = Statement.create('Valid statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statement.incrementUsage();
        statement.incrementUsage(); // Increment twice because same set is used as both premise and conclusion
        statements.set(statement.getId(), statement);

        // Create argument with same premise and conclusion set (invalid)
        const orderedSetResult = OrderedSet.create([statement.getId()]);
        expect(orderedSetResult.isOk()).toBe(true);

        if (orderedSetResult.isOk()) {
          const orderedSet = orderedSetResult.value;
          const argumentResult = AtomicArgument.create(orderedSet.getId(), orderedSet.getId());
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            const argument = argumentResult.value;
            argumentsMap.set(argument.getId(), argument);

            const result = validateAggregateConsistency(statements, argumentsMap);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toContain('same premise and conclusion set');
            }
          }
        }
      }
    });

    it('should handle complex aggregate consistency with all components', () => {
      const statements = new Map();
      const argumentsMap = new Map();
      const nodes = new Map();

      // Create a complex but valid scenario
      const statement1Result = Statement.create('Statement 1');
      const statement2Result = Statement.create('Statement 2');
      const statement3Result = Statement.create('Statement 3');

      expect(statement1Result.isOk() && statement2Result.isOk() && statement3Result.isOk()).toBe(
        true,
      );

      if (statement1Result.isOk() && statement2Result.isOk() && statement3Result.isOk()) {
        const statement1 = statement1Result.value;
        const statement2 = statement2Result.value;
        const statement3 = statement3Result.value;

        // Set up proper usage counts to match the set references
        // statement1 is used in orderedSet1 (premise of arg1)
        // statement2 is used in orderedSet2 (conclusion of arg1, premise of arg2)
        // statement3 is used in orderedSet3 (conclusion of arg2)
        statement1.incrementUsage(); // Used once in orderedSet1
        statement2.incrementUsage(); // Used once in orderedSet2
        statement2.incrementUsage(); // Used again in orderedSet2 (shared between args)
        statement3.incrementUsage(); // Used once in orderedSet3

        statements.set(statement1.getId(), statement1);
        statements.set(statement2.getId(), statement2);
        statements.set(statement3.getId(), statement3);

        // Create ordered sets
        const orderedSet1Result = OrderedSet.create([statement1.getId()]);
        const orderedSet2Result = OrderedSet.create([statement2.getId()]);
        const orderedSet3Result = OrderedSet.create([statement3.getId()]);

        expect(
          orderedSet1Result.isOk() && orderedSet2Result.isOk() && orderedSet3Result.isOk(),
        ).toBe(true);

        if (orderedSet1Result.isOk() && orderedSet2Result.isOk() && orderedSet3Result.isOk()) {
          // Create valid arguments
          const arg1Result = AtomicArgument.create(
            orderedSet1Result.value.getId(),
            orderedSet2Result.value.getId(),
          );
          const arg2Result = AtomicArgument.create(
            orderedSet2Result.value.getId(),
            orderedSet3Result.value.getId(),
          );

          expect(arg1Result.isOk() && arg2Result.isOk()).toBe(true);

          if (arg1Result.isOk() && arg2Result.isOk()) {
            argumentsMap.set(arg1Result.value.getId(), arg1Result.value);
            argumentsMap.set(arg2Result.value.getId(), arg2Result.value);

            // Create valid node structure
            const rootNodeResult = Node.createRoot(arg1Result.value.getId());
            expect(rootNodeResult.isOk()).toBe(true);

            if (rootNodeResult.isOk()) {
              const rootNode = rootNodeResult.value;
              nodes.set(rootNode.getId(), rootNode);

              const attachmentResult = Attachment.create(rootNode.getId(), 0);
              expect(attachmentResult.isOk()).toBe(true);

              if (attachmentResult.isOk()) {
                const childNodeResult = Node.createChild(
                  arg2Result.value.getId(),
                  attachmentResult.value,
                );
                expect(childNodeResult.isOk()).toBe(true);

                if (childNodeResult.isOk()) {
                  nodes.set(childNodeResult.value.getId(), childNodeResult.value);

                  // This should pass all validations
                  const result = validateAggregateConsistency(statements, argumentsMap, nodes);
                  expect(result.isOk()).toBe(true);
                }
              }
            }
          }
        }
      }
    });

    it('should handle aggregate validation without nodes', () => {
      const statements = new Map();
      const argumentsMap = new Map();

      // Create a valid scenario without nodes
      const statementResult = Statement.create('Statement without nodes');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        statement.incrementUsage();
        statements.set(statement.getId(), statement);

        const orderedSetResult = OrderedSet.create([statement.getId()]);
        expect(orderedSetResult.isOk()).toBe(true);

        if (orderedSetResult.isOk()) {
          const argumentResult = AtomicArgument.create(orderedSetResult.value.getId());
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            argumentsMap.set(argumentResult.value.getId(), argumentResult.value);

            // Validate without nodes parameter (undefined)
            const result = validateAggregateConsistency(statements, argumentsMap);
            expect(result.isOk()).toBe(true);
          }
        }
      }
    });

    it('should handle edge case with empty maps', () => {
      const statements = new Map();
      const argumentsMap = new Map();
      const nodes = new Map();

      // All empty maps should be valid
      const result = validateAggregateConsistency(statements, argumentsMap, nodes);
      expect(result.isOk()).toBe(true);
    });

    it('should handle mixed validation failures with comprehensive error details', () => {
      const statements = new Map();
      const argumentsMap = new Map();
      const nodes = new Map();

      // Create statements with incorrect usage
      const statementResult = Statement.create('Misused statement');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        const statement = statementResult.value;
        // Don't increment usage but create argument that uses it
        statements.set(statement.getId(), statement);

        const orderedSetResult = OrderedSet.create([statement.getId()]);
        expect(orderedSetResult.isOk()).toBe(true);

        if (orderedSetResult.isOk()) {
          const argumentResult = AtomicArgument.create(orderedSetResult.value.getId());
          expect(argumentResult.isOk()).toBe(true);

          if (argumentResult.isOk()) {
            argumentsMap.set(argumentResult.value.getId(), argumentResult.value);

            // Add valid nodes to ensure tree validation isn't the issue
            const nodeResult = Node.createRoot(argumentResult.value.getId());
            expect(nodeResult.isOk()).toBe(true);

            if (nodeResult.isOk()) {
              nodes.set(nodeResult.value.getId(), nodeResult.value);

              // Should fail on statement usage validation first
              const result = validateAggregateConsistency(statements, argumentsMap, nodes);
              expect(result.isErr()).toBe(true);
              if (result.isErr()) {
                expect(result.error.message).toContain('usage count mismatch');
                expect(result.error.details?.expectedTotalUsage).toBe(1);
                expect(result.error.details?.actualTotalUsage).toBe(0);
              }
            }
          }
        }
      }
    });
  });
});
