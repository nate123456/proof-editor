import { describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import { Node } from '../../domain/entities/Node.js';
import { OrderedSet } from '../../domain/entities/OrderedSet.js';
import { Statement } from '../../domain/entities/Statement.js';
import { Tree } from '../../domain/entities/Tree.js';
import { AtomicArgumentId, Position2D, StatementId } from '../../domain/shared/value-objects.js';
import type { NodeSpec, ParsedYAMLStructure, ProofDocument } from '../ProofDocument.js';

describe('ProofDocument', () => {
  describe('ProofDocument interface', () => {
    it('should create and access ProofDocument with all map properties', () => {
      // Create sample domain objects
      const statementResult = Statement.create('Test statement');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) throw new Error('Failed to create statement');
      const statement = statementResult.value;

      const statementIdResult = StatementId.create('s1');
      expect(statementIdResult.isOk()).toBe(true);
      if (!statementIdResult.isOk()) throw new Error('Failed to create statement ID');
      const statementIds = [statementIdResult.value];

      const orderedSetResult = OrderedSet.create(statementIds);
      expect(orderedSetResult.isOk()).toBe(true);
      if (!orderedSetResult.isOk()) throw new Error('Failed to create ordered set');
      const orderedSet = orderedSetResult.value;

      const atomicArgResult = AtomicArgument.create();
      expect(atomicArgResult.isOk()).toBe(true);
      if (!atomicArgResult.isOk()) throw new Error('Failed to create atomic argument');
      const atomicArg = atomicArgResult.value;

      const positionResult = Position2D.create(100, 200);
      expect(positionResult.isOk()).toBe(true);
      if (!positionResult.isOk()) throw new Error('Failed to create position');
      const position = positionResult.value;

      const treeResult = Tree.create('document', position);
      expect(treeResult.isOk()).toBe(true);
      if (!treeResult.isOk()) throw new Error('Failed to create tree');
      const tree = treeResult.value;

      const atomicArgIdResult = AtomicArgumentId.create('arg1');
      expect(atomicArgIdResult.isOk()).toBe(true);
      if (!atomicArgIdResult.isOk()) throw new Error('Failed to create atomic argument ID');
      const nodeResult = Node.createRoot(atomicArgIdResult.value);
      expect(nodeResult.isOk()).toBe(true);
      if (!nodeResult.isOk()) throw new Error('Failed to create node');
      const node = nodeResult.value;

      // Create ProofDocument
      const document: ProofDocument = {
        statements: new Map([['s1', statement]]),
        orderedSets: new Map([['os1', orderedSet]]),
        atomicArguments: new Map([['arg1', atomicArg]]),
        trees: new Map([['tree1', tree]]),
        nodes: new Map([['n1', node]]),
      };

      // Test all map operations
      expect(document.statements.size).toBe(1);
      expect(document.statements.has('s1')).toBe(true);
      expect(document.statements.get('s1')).toBe(statement);

      expect(document.orderedSets.size).toBe(1);
      expect(document.orderedSets.has('os1')).toBe(true);
      expect(document.orderedSets.get('os1')).toBe(orderedSet);

      expect(document.atomicArguments.size).toBe(1);
      expect(document.atomicArguments.has('arg1')).toBe(true);
      expect(document.atomicArguments.get('arg1')).toBe(atomicArg);

      expect(document.trees.size).toBe(1);
      expect(document.trees.has('tree1')).toBe(true);
      expect(document.trees.get('tree1')).toBe(tree);

      expect(document.nodes.size).toBe(1);
      expect(document.nodes.has('n1')).toBe(true);
      expect(document.nodes.get('n1')).toBe(node);
    });

    it('should handle empty ProofDocument', () => {
      const document: ProofDocument = {
        statements: new Map(),
        orderedSets: new Map(),
        atomicArguments: new Map(),
        trees: new Map(),
        nodes: new Map(),
      };

      expect(document.statements.size).toBe(0);
      expect(document.orderedSets.size).toBe(0);
      expect(document.atomicArguments.size).toBe(0);
      expect(document.trees.size).toBe(0);
      expect(document.nodes.size).toBe(0);
    });

    it('should support map iteration operations', () => {
      const statement1Result = Statement.create('Statement 1');
      expect(statement1Result.isOk()).toBe(true);
      if (!statement1Result.isOk()) throw new Error('Failed to create statement 1');
      const statement1 = statement1Result.value;

      const statement2Result = Statement.create('Statement 2');
      expect(statement2Result.isOk()).toBe(true);
      if (!statement2Result.isOk()) throw new Error('Failed to create statement 2');
      const statement2 = statement2Result.value;

      const document: ProofDocument = {
        statements: new Map([
          ['s1', statement1],
          ['s2', statement2],
        ]),
        orderedSets: new Map(),
        atomicArguments: new Map(),
        trees: new Map(),
        nodes: new Map(),
      };

      // Test iteration
      const statementKeys = Array.from(document.statements.keys());
      expect(statementKeys).toEqual(['s1', 's2']);

      const statementValues = Array.from(document.statements.values());
      expect(statementValues).toEqual([statement1, statement2]);

      const statementEntries = Array.from(document.statements.entries());
      expect(statementEntries).toEqual([
        ['s1', statement1],
        ['s2', statement2],
      ]);
    });

    it('should support map mutation operations', () => {
      const document: ProofDocument = {
        statements: new Map(),
        orderedSets: new Map(),
        atomicArguments: new Map(),
        trees: new Map(),
        nodes: new Map(),
      };

      const statementResult = Statement.create('New statement');
      expect(statementResult.isOk()).toBe(true);
      if (!statementResult.isOk()) throw new Error('Failed to create new statement');
      const statement = statementResult.value;

      // Test set and delete operations
      document.statements.set('s1', statement);
      expect(document.statements.has('s1')).toBe(true);
      expect(document.statements.size).toBe(1);

      document.statements.delete('s1');
      expect(document.statements.has('s1')).toBe(false);
      expect(document.statements.size).toBe(0);

      // Test clear operation
      document.statements.set('s1', statement);
      document.statements.set('s2', statement);
      expect(document.statements.size).toBe(2);

      document.statements.clear();
      expect(document.statements.size).toBe(0);
    });
  });

  describe('ParsedYAMLStructure interface', () => {
    it('should represent valid parsed YAML structure with all sections', () => {
      const structure: ParsedYAMLStructure = {
        statements: {
          s1: 'All men are mortal',
          s2: 'Socrates is a man',
          s3: 'Socrates is mortal',
        },
        orderedSets: {
          os1: ['s1', 's2'],
          os2: ['s3'],
        },
        atomicArguments: {
          arg1: {
            premises: 'os1',
            conclusions: 'os2',
            sideLabel: 'Modus Ponens',
          },
        },
        trees: {
          tree1: {
            offset: { x: 100, y: 200 },
            nodes: {
              n1: { arg: 'arg1' },
              n2: { n1: 'arg2', on: 0 },
            },
          },
        },
      };

      // Test statements section
      expect(structure.statements).toBeDefined();
      if (structure.statements) {
        expect(Object.keys(structure.statements)).toEqual(['s1', 's2', 's3']);
        expect(structure.statements.s1).toBe('All men are mortal');
      }

      // Test orderedSets section
      expect(structure.orderedSets).toBeDefined();
      if (structure.orderedSets) {
        expect(Object.keys(structure.orderedSets)).toEqual(['os1', 'os2']);
        expect(structure.orderedSets.os1).toEqual(['s1', 's2']);
      }

      // Test atomicArguments section
      expect(structure.atomicArguments).toBeDefined();
      if (structure.atomicArguments) {
        expect(Object.keys(structure.atomicArguments)).toEqual(['arg1']);
        const { arg1 } = structure.atomicArguments;
        if (arg1) {
          expect(arg1.premises).toBe('os1');
          expect(arg1.conclusions).toBe('os2');
          expect(arg1.sideLabel).toBe('Modus Ponens');
        }
      }

      // Test trees section
      expect(structure.trees).toBeDefined();
      if (structure.trees) {
        expect(Object.keys(structure.trees)).toEqual(['tree1']);
        const { tree1 } = structure.trees;
        if (tree1) {
          expect(tree1.offset).toEqual({ x: 100, y: 200 });
          expect(tree1.nodes).toBeDefined();
          if (tree1.nodes) {
            expect(Object.keys(tree1.nodes)).toEqual(['n1', 'n2']);
          }
        }
      }
    });

    it('should handle minimal parsed YAML structure', () => {
      const structure: ParsedYAMLStructure = {
        statements: {
          s1: 'Single statement',
        },
      };

      expect(structure.statements).toBeDefined();
      expect(structure.orderedSets).toBeUndefined();
      expect(structure.atomicArguments).toBeUndefined();
      expect(structure.trees).toBeUndefined();
    });

    it('should handle empty parsed YAML structure', () => {
      const structure: ParsedYAMLStructure = {};

      expect(structure.statements).toBeUndefined();
      expect(structure.orderedSets).toBeUndefined();
      expect(structure.atomicArguments).toBeUndefined();
      expect(structure.trees).toBeUndefined();
    });

    it('should handle atomic arguments with partial properties', () => {
      const structure: ParsedYAMLStructure = {
        atomicArguments: {
          arg1: {
            premises: 'os1',
            // No conclusions or sideLabel
          },
          arg2: {
            conclusions: 'os2',
            sideLabel: 'Rule Name',
            // No premises
          },
          arg3: {
            // Empty argument (bootstrap case)
          },
        },
      };

      if (structure.atomicArguments) {
        const { arg1, arg2, arg3 } = structure.atomicArguments;
        if (arg1) {
          expect(arg1.premises).toBe('os1');
          expect(arg1.conclusions).toBeUndefined();
          expect(arg1.sideLabel).toBeUndefined();
        }

        if (arg2) {
          expect(arg2.premises).toBeUndefined();
          expect(arg2.conclusions).toBe('os2');
          expect(arg2.sideLabel).toBe('Rule Name');
        }

        if (arg3) {
          expect(arg3.premises).toBeUndefined();
          expect(arg3.conclusions).toBeUndefined();
          expect(arg3.sideLabel).toBeUndefined();
        }
      }
    });

    it('should handle trees with optional properties', () => {
      const structure: ParsedYAMLStructure = {
        trees: {
          tree1: {
            offset: { x: 0, y: 0 },
            nodes: {
              n1: { arg: 'arg1' },
            },
          },
          tree2: {
            // No offset (defaults to origin)
            nodes: {
              root: { arg: 'arg2' },
            },
          },
          tree3: {
            offset: { x: 50, y: 100 },
            // No nodes
          },
          tree4: {
            // Minimal tree with no offset or nodes
          },
        },
      };

      if (structure.trees) {
        const { tree1, tree2, tree3, tree4 } = structure.trees;
        if (tree1) {
          expect(tree1.offset).toEqual({ x: 0, y: 0 });
          expect(tree1.nodes).toBeDefined();
        }

        if (tree2) {
          expect(tree2.offset).toBeUndefined();
          expect(tree2.nodes).toBeDefined();
        }

        if (tree3) {
          expect(tree3.offset).toEqual({ x: 50, y: 100 });
          expect(tree3.nodes).toBeUndefined();
        }

        if (tree4) {
          expect(tree4.offset).toBeUndefined();
          expect(tree4.nodes).toBeUndefined();
        }
      }
    });
  });

  describe('NodeSpec interface', () => {
    it('should represent root node specification', () => {
      const nodeSpec: NodeSpec = {
        arg: 'arg1',
      };

      expect(nodeSpec.arg).toBe('arg1');
      expect(nodeSpec.on).toBeUndefined();
    });

    it('should represent child node specification with parent and position', () => {
      const nodeSpec: NodeSpec = {
        n1: 'arg2',
        on: 0,
      };

      expect(nodeSpec.arg).toBeUndefined();
      expect(nodeSpec.n1).toBe('arg2');
      expect(nodeSpec.on).toBe(0);
    });

    it('should represent child node with complex position format', () => {
      const nodeSpec: NodeSpec = {
        parent: 'arg3',
        on: '1:0', // from:to format
      };

      expect(nodeSpec.parent).toBe('arg3');
      expect(nodeSpec.on).toBe('1:0');
    });

    it('should handle multiple parent-like properties', () => {
      const nodeSpec: NodeSpec = {
        arg: 'arg1',
        someParent: 'arg2',
        anotherParent: 5,
        on: 2,
        extraProp: 'value',
      };

      expect(nodeSpec.arg).toBe('arg1');
      expect(nodeSpec.someParent).toBe('arg2');
      expect(nodeSpec.anotherParent).toBe(5);
      expect(nodeSpec.on).toBe(2);
      expect(nodeSpec.extraProp).toBe('value');
    });

    it('should handle node specification with only position', () => {
      const nodeSpec: NodeSpec = {
        parentNode: 3, // Old format: parent ID as key, position as value
      };

      expect(nodeSpec.parentNode).toBe(3);
      expect(nodeSpec.on).toBeUndefined();
    });

    it('should handle node specification with string position', () => {
      const nodeSpec: NodeSpec = {
        parentId: 'arg4',
        on: '0', // String position
      };

      expect(nodeSpec.parentId).toBe('arg4');
      expect(nodeSpec.on).toBe('0');
    });

    it('should handle optional NodeSpec properties', () => {
      const nodeSpec: NodeSpec = {
        // All properties are optional, so we can create an empty object
      };

      expect(nodeSpec.arg).toBeUndefined();
      expect(nodeSpec.parent).toBeUndefined();
      expect(nodeSpec.on).toBeUndefined();
    });
  });
});
