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
  });
});
