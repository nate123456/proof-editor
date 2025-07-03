import { beforeEach, describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import { Node } from '../../domain/entities/Node.js';
import { OrderedSet } from '../../domain/entities/OrderedSet.js';
import { Statement } from '../../domain/entities/Statement.js';
import { Tree } from '../../domain/entities/Tree.js';
import {
  AtomicArgumentId,
  Attachment,
  NodeId,
  OrderedSetId,
  Position2D,
  StatementId,
} from '../../domain/shared/value-objects.js';
import type { ProofDocument } from '../../parser/ProofDocument.js';
import { TreeRenderer } from '../TreeRenderer.js';

describe('TreeRenderer', () => {
  let renderer: TreeRenderer;
  let mockProofDoc: ProofDocument;

  beforeEach(() => {
    renderer = new TreeRenderer();
    mockProofDoc = {
      statements: new Map(),
      orderedSets: new Map(),
      atomicArguments: new Map(),
      trees: new Map(),
      nodes: new Map(),
    };
  });

  describe('generateSVG', () => {
    it('should create a TreeRenderer instance', () => {
      expect(renderer).toBeInstanceOf(TreeRenderer);
    });

    it('should generate empty message when no trees exist', () => {
      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('No proof trees to display');
      expect(result).toContain('color: var(--vscode-descriptionForeground)');
      expect(result).toContain('<div');
    });

    it('should include proper styling', () => {
      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('display: flex');
      expect(result).toContain('align-items: center');
      expect(result).toContain('justify-content: center');
    });

    it('should be valid HTML structure for empty state', () => {
      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toMatch(/<div[^>]*>[\s\S]*<\/div>/);
      expect(result).toContain('font-style: italic');
    });

    it('should generate SVG with tree content when proof document has data', () => {
      // Create test data
      const s1Result = Statement.create('All men are mortal');
      const s2Result = Statement.create('Socrates is a man');
      const s3Result = Statement.create('Socrates is mortal');

      if (s1Result.isErr() || s2Result.isErr() || s3Result.isErr()) {
        throw new Error('Failed to create statements');
      }

      const s1 = s1Result.value;
      const s2 = s2Result.value;
      const s3 = s3Result.value;

      // Add statements to mock document
      mockProofDoc.statements.set('s1', s1);
      mockProofDoc.statements.set('s2', s2);
      mockProofDoc.statements.set('s3', s3);

      // Create ordered sets
      const s1Id = StatementId.create('s1');
      const s2Id = StatementId.create('s2');
      const s3Id = StatementId.create('s3');

      if (s1Id.isErr() || s2Id.isErr() || s3Id.isErr()) {
        throw new Error('Failed to create statement IDs');
      }

      const premisesResult = OrderedSet.create([s1Id.value, s2Id.value]);
      const conclusionsResult = OrderedSet.create([s3Id.value]);

      if (premisesResult.isErr() || conclusionsResult.isErr()) {
        throw new Error('Failed to create ordered sets');
      }

      const premises = premisesResult.value;
      const conclusions = conclusionsResult.value;

      mockProofDoc.orderedSets.set('os1', premises);
      mockProofDoc.orderedSets.set('os2', conclusions);

      // Create atomic argument
      const premisesId = OrderedSetId.create('os1');
      const conclusionsId = OrderedSetId.create('os2');

      if (premisesId.isErr() || conclusionsId.isErr()) {
        throw new Error('Failed to create ordered set IDs');
      }

      const argumentResult = AtomicArgument.create(premisesId.value, conclusionsId.value, {
        left: 'Modus Ponens',
      });

      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      const argument = argumentResult.value;
      mockProofDoc.atomicArguments.set('arg1', argument);

      // Create tree and node
      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const node = nodeResult.value;

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', node);

      // Generate SVG
      const result = renderer.generateSVG(mockProofDoc);

      // Verify SVG structure
      expect(result).toContain('<svg');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(result).toContain('<defs>');
      expect(result).toContain('id="arrowhead"');
      expect(result).toContain('All men are mortal');
      expect(result).toContain('Socrates is a man');
      expect(result).toContain('Socrates is mortal');
      expect(result).toContain('Modus Ponens');

      // Also verify it's a complete SVG with proper dimensions
      expect(result).toMatch(/<svg[^>]*width="[^"]*"[^>]*height="[^"]*"/);
      expect(result).toContain('</svg>');
      expect(result).toContain('class="argument-node-group"');
      expect(result).toContain('class="implication-line"');
    });
  });

  describe('calculateTreeLayouts', () => {
    it('should handle multiple trees with different positions', () => {
      // Create multiple trees with different positions
      const tree1Position = Position2D.create(50, 100);
      const tree2Position = Position2D.create(300, 200);

      if (tree1Position.isErr() || tree2Position.isErr()) {
        throw new Error('Failed to create positions');
      }

      const tree1Result = Tree.create('document', tree1Position.value);
      const tree2Result = Tree.create('document', tree2Position.value);

      if (tree1Result.isErr() || tree2Result.isErr()) {
        throw new Error('Failed to create trees');
      }

      mockProofDoc.trees.set('tree1', tree1Result.value);
      mockProofDoc.trees.set('tree2', tree2Result.value);

      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('<svg');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      // Should have proper dimensions for multiple trees
      expect(result).toMatch(/height="[^"]*"/);
      expect(result).toMatch(/width="[^"]*"/);
    });

    it('should handle empty trees in layout calculation', () => {
      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      // Add tree with no nodes
      mockProofDoc.trees.set('emptyTree', treeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });
  });

  describe('renderStatements', () => {
    it('should render empty statements with italic placeholder', () => {
      // Create atomic argument with empty premises
      const emptyOrderedSetResult = OrderedSet.create([]);
      const conclusionsResult = OrderedSet.create([]);

      if (emptyOrderedSetResult.isErr() || conclusionsResult.isErr()) {
        throw new Error('Failed to create ordered sets');
      }

      const emptyPremises = emptyOrderedSetResult.value;
      const conclusions = conclusionsResult.value;

      mockProofDoc.orderedSets.set('empty', emptyPremises);
      mockProofDoc.orderedSets.set('conclusions', conclusions);

      const premisesId = OrderedSetId.create('empty');
      const conclusionsId = OrderedSetId.create('conclusions');

      if (premisesId.isErr() || conclusionsId.isErr()) {
        throw new Error('Failed to create ordered set IDs');
      }

      const argumentResult = AtomicArgument.create(premisesId.value, conclusionsId.value, {});

      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      mockProofDoc.atomicArguments.set('arg1', argumentResult.value);

      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', nodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('(empty)');
      expect(result).toContain('font-style: italic');
    });

    it('should render multiple statements with proper line spacing', () => {
      // Create statements
      const s1Result = Statement.create('First premise statement');
      const s2Result = Statement.create('Second premise statement');
      const s3Result = Statement.create('Third premise statement');
      const conclusionResult = Statement.create('Conclusion statement');

      if (s1Result.isErr() || s2Result.isErr() || s3Result.isErr() || conclusionResult.isErr()) {
        throw new Error('Failed to create statements');
      }

      const s1 = s1Result.value;
      const s2 = s2Result.value;
      const s3 = s3Result.value;
      const conclusion = conclusionResult.value;

      mockProofDoc.statements.set('s1', s1);
      mockProofDoc.statements.set('s2', s2);
      mockProofDoc.statements.set('s3', s3);
      mockProofDoc.statements.set('c1', conclusion);

      // Create ordered sets with multiple statements
      const s1Id = StatementId.create('s1');
      const s2Id = StatementId.create('s2');
      const s3Id = StatementId.create('s3');
      const c1Id = StatementId.create('c1');

      if (s1Id.isErr() || s2Id.isErr() || s3Id.isErr() || c1Id.isErr()) {
        throw new Error('Failed to create statement IDs');
      }

      const premisesResult = OrderedSet.create([s1Id.value, s2Id.value, s3Id.value]);
      const conclusionsResult = OrderedSet.create([c1Id.value]);

      if (premisesResult.isErr() || conclusionsResult.isErr()) {
        throw new Error('Failed to create ordered sets');
      }

      const premises = premisesResult.value;
      const conclusions = conclusionsResult.value;

      mockProofDoc.orderedSets.set('premises', premises);
      mockProofDoc.orderedSets.set('conclusions', conclusions);

      const premisesId = OrderedSetId.create('premises');
      const conclusionsId = OrderedSetId.create('conclusions');

      if (premisesId.isErr() || conclusionsId.isErr()) {
        throw new Error('Failed to create ordered set IDs');
      }

      const argumentResult = AtomicArgument.create(premisesId.value, conclusionsId.value, {});

      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      mockProofDoc.atomicArguments.set('arg1', argumentResult.value);

      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', nodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('First premise statement');
      expect(result).toContain('Second premise statement');
      expect(result).toContain('Third premise statement');
      expect(result).toContain('Conclusion statement');
      expect(result).toContain('class="statement-text"');
    });
  });

  describe('renderConnections', () => {
    it('should render connections between parent and child nodes', () => {
      // Create statements for parent and child
      const parentPremise = Statement.create('Parent premise');
      const sharedConclusion = Statement.create('Shared statement');
      const childConclusion = Statement.create('Child conclusion');

      if (parentPremise.isErr() || sharedConclusion.isErr() || childConclusion.isErr()) {
        throw new Error('Failed to create statements');
      }

      mockProofDoc.statements.set('pp', parentPremise.value);
      mockProofDoc.statements.set('shared', sharedConclusion.value);
      mockProofDoc.statements.set('cc', childConclusion.value);

      // Create statement IDs
      const ppId = StatementId.create('pp');
      const sharedId = StatementId.create('shared');
      const ccId = StatementId.create('cc');

      if (ppId.isErr() || sharedId.isErr() || ccId.isErr()) {
        throw new Error('Failed to create statement IDs');
      }

      // Create ordered sets
      const parentPremises = OrderedSet.create([ppId.value]);
      const sharedSet = OrderedSet.create([sharedId.value]);
      const childConclusions = OrderedSet.create([ccId.value]);

      if (parentPremises.isErr() || sharedSet.isErr() || childConclusions.isErr()) {
        throw new Error('Failed to create ordered sets');
      }

      mockProofDoc.orderedSets.set('parentPremises', parentPremises.value);
      mockProofDoc.orderedSets.set('shared', sharedSet.value);
      mockProofDoc.orderedSets.set('childConclusions', childConclusions.value);

      // Create ordered set IDs
      const parentPremisesId = OrderedSetId.create('parentPremises');
      const sharedSetId = OrderedSetId.create('shared');
      const childConclusionsId = OrderedSetId.create('childConclusions');

      if (parentPremisesId.isErr() || sharedSetId.isErr() || childConclusionsId.isErr()) {
        throw new Error('Failed to create ordered set IDs');
      }

      // Create atomic arguments
      const parentArg = AtomicArgument.create(parentPremisesId.value, sharedSetId.value, {});
      const childArg = AtomicArgument.create(sharedSetId.value, childConclusionsId.value, {});

      if (parentArg.isErr() || childArg.isErr()) {
        throw new Error('Failed to create atomic arguments');
      }

      mockProofDoc.atomicArguments.set('parentArg', parentArg.value);
      mockProofDoc.atomicArguments.set('childArg', childArg.value);

      // Create tree
      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      // Create nodes
      const parentArgId = AtomicArgumentId.create('parentArg');
      const childArgId = AtomicArgumentId.create('childArg');

      if (parentArgId.isErr() || childArgId.isErr()) {
        throw new Error('Failed to create argument IDs');
      }

      const parentNodeResult = Node.createRoot(parentArgId.value);
      if (parentNodeResult.isErr()) {
        throw new Error('Failed to create parent node');
      }

      const parentNodeId = NodeId.create('parent');
      const childNodeId = NodeId.create('child');

      if (parentNodeId.isErr() || childNodeId.isErr()) {
        throw new Error('Failed to create node IDs');
      }

      // Create attachment for child node
      const attachmentResult = Attachment.create(parentNodeId.value, 0);
      if (attachmentResult.isErr()) {
        throw new Error('Failed to create attachment');
      }

      const childNodeResult = Node.createChild(childArgId.value, attachmentResult.value);
      if (childNodeResult.isErr()) {
        throw new Error('Failed to create child node');
      }

      tree.addNode(parentNodeId.value);
      tree.addNode(childNodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('parent', parentNodeResult.value);
      mockProofDoc.nodes.set('child', childNodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('class="connection-line"');
      expect(result).toContain('<line');
      expect(result).toContain('x1=');
      expect(result).toContain('y1=');
      expect(result).toContain('x2=');
      expect(result).toContain('y2=');
    });

    it('should handle missing nodes in connections gracefully', () => {
      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      // Add node ID to tree but don't add actual node to document
      const nodeId = NodeId.create('missingNode');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);
      mockProofDoc.trees.set('tree1', tree);

      const result = renderer.generateSVG(mockProofDoc);

      // Should not crash and should generate valid SVG
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should handle missing orderedSets in getStatementsFromOrderedSet', () => {
      // Create atomic argument with non-existent ordered set reference
      const nonExistentId = OrderedSetId.create('nonExistent');
      if (nonExistentId.isErr()) {
        throw new Error('Failed to create ordered set ID');
      }

      const emptySet = OrderedSet.create([]);
      if (emptySet.isErr()) {
        throw new Error('Failed to create empty set');
      }

      mockProofDoc.orderedSets.set('empty', emptySet.value);
      const emptyId = OrderedSetId.create('empty');
      if (emptyId.isErr()) {
        throw new Error('Failed to create empty ID');
      }

      const argumentResult = AtomicArgument.create(nonExistentId.value, emptyId.value, {});
      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      mockProofDoc.atomicArguments.set('arg1', argumentResult.value);

      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', nodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      // Should handle missing ordered set gracefully
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('(empty)'); // Non-existent ordered set should render as empty
    });
  });

  describe('utility methods', () => {
    it('should truncate long text properly', () => {
      const longStatement = Statement.create(
        'This is a very long statement that should be truncated when rendered in the tree visualization because it exceeds the maximum length'
      );
      if (longStatement.isErr()) {
        throw new Error('Failed to create long statement');
      }

      mockProofDoc.statements.set('long', longStatement.value);

      const longId = StatementId.create('long');
      if (longId.isErr()) {
        throw new Error('Failed to create statement ID');
      }

      const orderedSetResult = OrderedSet.create([longId.value]);
      if (orderedSetResult.isErr()) {
        throw new Error('Failed to create ordered set');
      }

      mockProofDoc.orderedSets.set('longSet', orderedSetResult.value);

      const setId = OrderedSetId.create('longSet');
      if (setId.isErr()) {
        throw new Error('Failed to create ordered set ID');
      }

      const argumentResult = AtomicArgument.create(setId.value, setId.value, {});
      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      mockProofDoc.atomicArguments.set('arg1', argumentResult.value);

      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', nodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      // Should contain truncated text with ellipsis
      expect(result).toContain('...');
    });

    it('should escape XML special characters', () => {
      // Use shorter text so special characters aren't truncated
      const specialStatement = Statement.create('<>&"\'');
      if (specialStatement.isErr()) {
        throw new Error('Failed to create statement');
      }

      mockProofDoc.statements.set('special', specialStatement.value);

      const specialId = StatementId.create('special');
      if (specialId.isErr()) {
        throw new Error('Failed to create statement ID');
      }

      const orderedSetResult = OrderedSet.create([specialId.value]);
      if (orderedSetResult.isErr()) {
        throw new Error('Failed to create ordered set');
      }

      mockProofDoc.orderedSets.set('specialSet', orderedSetResult.value);

      const setId = OrderedSetId.create('specialSet');
      if (setId.isErr()) {
        throw new Error('Failed to create ordered set ID');
      }

      const argumentResult = AtomicArgument.create(setId.value, setId.value, {});
      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      mockProofDoc.atomicArguments.set('arg1', argumentResult.value);

      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', nodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      // Should contain escaped XML characters
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
    });

    it('should handle missing ordered sets gracefully', () => {
      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      mockProofDoc.trees.set('tree1', treeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      // Should not crash
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });
  });

  describe('side labels', () => {
    it('should render side labels when present', () => {
      const s1Result = Statement.create('Premise');
      const s2Result = Statement.create('Conclusion');

      if (s1Result.isErr() || s2Result.isErr()) {
        throw new Error('Failed to create statements');
      }

      mockProofDoc.statements.set('s1', s1Result.value);
      mockProofDoc.statements.set('s2', s2Result.value);

      const s1Id = StatementId.create('s1');
      const s2Id = StatementId.create('s2');

      if (s1Id.isErr() || s2Id.isErr()) {
        throw new Error('Failed to create statement IDs');
      }

      const premisesResult = OrderedSet.create([s1Id.value]);
      const conclusionsResult = OrderedSet.create([s2Id.value]);

      if (premisesResult.isErr() || conclusionsResult.isErr()) {
        throw new Error('Failed to create ordered sets');
      }

      mockProofDoc.orderedSets.set('os1', premisesResult.value);
      mockProofDoc.orderedSets.set('os2', conclusionsResult.value);

      const premisesId = OrderedSetId.create('os1');
      const conclusionsId = OrderedSetId.create('os2');

      if (premisesId.isErr() || conclusionsId.isErr()) {
        throw new Error('Failed to create ordered set IDs');
      }

      // Create argument with side label
      const argumentResult = AtomicArgument.create(premisesId.value, conclusionsId.value, {
        left: 'Rule Name',
      });

      if (argumentResult.isErr()) {
        throw new Error('Failed to create atomic argument');
      }

      mockProofDoc.atomicArguments.set('arg1', argumentResult.value);

      const position = Position2D.create(100, 200);
      if (position.isErr()) {
        throw new Error('Failed to create position');
      }

      const treeResult = Tree.create('document', position.value);
      if (treeResult.isErr()) {
        throw new Error('Failed to create tree');
      }

      const tree = treeResult.value;

      const argumentId = AtomicArgumentId.create('arg1');
      if (argumentId.isErr()) {
        throw new Error('Failed to create argument ID');
      }

      const nodeResult = Node.createRoot(argumentId.value);
      if (nodeResult.isErr()) {
        throw new Error('Failed to create node');
      }

      const nodeId = NodeId.create('n1');
      if (nodeId.isErr()) {
        throw new Error('Failed to create node ID');
      }

      tree.addNode(nodeId.value);

      mockProofDoc.trees.set('tree1', tree);
      mockProofDoc.nodes.set('n1', nodeResult.value);

      const result = renderer.generateSVG(mockProofDoc);

      expect(result).toContain('Rule Name');
      expect(result).toContain('class="side-label"');
    });
  });
});
