import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ProofTreeQueryService } from '../../../application/queries/ProofTreeQueryService.js';
import type {
  FindPathBetweenNodesQuery,
  GetSubtreeQuery,
} from '../../../application/queries/tree-queries.js';
import type { AtomicArgument } from '../../../domain/entities/AtomicArgument.js';
import type { Node } from '../../../domain/entities/Node.js';
import type { Tree } from '../../../domain/entities/Tree.js';
import type { IAtomicArgumentRepository } from '../../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../../domain/repositories/INodeRepository.js';
import type { ITreeRepository } from '../../../domain/repositories/ITreeRepository.js';
import type { IGraphTraversalService } from '../../../domain/services/IGraphTraversalService.js';
import {
  AtomicArgumentId,
  NodeId,
  OrderedSetId,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';

/**
 * Integration tests demonstrating how graphology works with the existing query system.
 * These tests show real-world usage patterns and verify the integration works end-to-end.
 */
describe('ProofTreeQueryService Integration with Graphology', () => {
  let queryService: ProofTreeQueryService;
  let mockTreeRepository: ITreeRepository;
  let mockNodeRepository: INodeRepository;
  let mockArgumentRepository: IAtomicArgumentRepository;
  let mockGraphTraversalService: IGraphTraversalService;

  beforeEach(() => {
    mockTreeRepository = mock<ITreeRepository>();
    mockNodeRepository = mock<INodeRepository>();
    mockArgumentRepository = mock<IAtomicArgumentRepository>();
    mockGraphTraversalService = mock<IGraphTraversalService>();

    queryService = new ProofTreeQueryService(
      mockTreeRepository,
      mockNodeRepository,
      mockArgumentRepository,
      mockGraphTraversalService,
    );
  });

  describe('Real-world logical argument tree scenarios', () => {
    it('should find path in classical syllogism structure', async () => {
      // Arrange - Classical syllogism: All men are mortal, Socrates is a man, therefore Socrates is mortal
      const tree = createSyllogismTree();
      const nodes = createSyllogismNodes();
      const atomicArguments = createSyllogismArguments();

      setupMockRepositories(tree, nodes, atomicArguments);

      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc1',
        treeId: 'tree1',
        fromNodeId: 'socrates_premise',
        toNodeId: 'conclusion',
        includeArguments: true,
      };

      // Act
      const result = await queryService.findPathBetweenNodes(query);

      // Assert
      expect(result.isOk()).toBe(true);
      const path = result.value;
      expect(path).toHaveLength(3);

      // Verify the logical flow: premise → major premise → conclusion
      expect(path[0]?.nodeId).toBe('socrates_premise');
      expect(path[1]?.nodeId).toBe('major_premise');
      expect(path[2]?.nodeId).toBe('conclusion');

      // Verify argument details are included
      expect(path[0]?.argument?.id).toBe('socrates_is_man');
      expect(path[2]?.argument?.id).toBe('socrates_is_mortal');
    });

    it('should get subtree with complex branching structure', async () => {
      // Arrange - Complex proof tree with multiple branches
      const tree = createComplexTree();
      const nodes = createComplexNodes();
      const atomicArguments = createComplexArguments();

      setupMockRepositories(tree, nodes, atomicArguments);

      const query: GetSubtreeQuery = {
        documentId: 'doc1',
        treeId: 'tree1',
        rootNodeId: 'theorem_root',
        maxDepth: 2,
        includeArguments: true,
      };

      // Act
      const result = await queryService.getSubtree(query);

      // Assert
      expect(result.isOk()).toBe(true);
      const subtree = result.value;

      expect(subtree.nodes.length).toBeGreaterThan(3);
      expect(subtree.connections.length).toBeGreaterThan(2);
      expect(subtree.depth).toBe(2);
      expect(subtree.breadth).toBeGreaterThan(1);

      // Verify root node
      const rootNode = subtree.nodes.find((n) => n.nodeId === 'theorem_root');
      expect(rootNode?.isRoot).toBe(true);

      // Verify connections maintain parent-child relationships
      for (const connection of subtree.connections) {
        const parentNode = subtree.nodes.find((n) => n.nodeId === connection.toNodeId);
        const childNode = subtree.nodes.find((n) => n.nodeId === connection.fromNodeId);
        expect(parentNode).toBeDefined();
        expect(childNode).toBeDefined();
        expect(connection.premisePosition).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle disconnected argument components', async () => {
      // Arrange - Tree with disconnected components
      const tree = createDisconnectedTree();
      const nodes = createDisconnectedNodes();
      const atomicArguments = createDisconnectedArguments();

      setupMockRepositories(tree, nodes, atomicArguments);

      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc1',
        treeId: 'tree1',
        fromNodeId: 'isolated_argument_1',
        toNodeId: 'isolated_argument_2',
      };

      // Act
      const result = await queryService.findPathBetweenNodes(query);

      // Assert
      expect(result.isOk()).toBe(true);
      const path = result.value;

      // Should return empty path for disconnected components
      expect(path).toEqual([]);
    });

    it('should demonstrate graphology performance benefits', async () => {
      // Arrange - Large tree structure to test performance
      const tree = createLargeTree();
      const nodes = createLargeTreeNodes();
      const atomicArguments = createLargeTreeArguments();

      setupMockRepositories(tree, nodes, atomicArguments);

      const query: GetSubtreeQuery = {
        documentId: 'doc1',
        treeId: 'tree1',
        rootNodeId: 'root',
        maxDepth: 5,
      };

      // Act
      const startTime = performance.now();
      const result = await queryService.getSubtree(query);
      const endTime = performance.now();

      // Assert
      expect(result.isOk()).toBe(true);
      const subtree = result.value;

      // Should handle large structures efficiently
      expect(subtree.nodes.length).toBeGreaterThan(10);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast with graphology

      // Verify structural integrity
      expect(subtree.depth).toBeLessThanOrEqual(5);
      expect(subtree.nodes.every((n) => n.nodeId && n.argumentId)).toBe(true);
    });
  });

  // Helper functions to create test data structures

  function createSyllogismTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(TreeId.create('tree1').value);
    tree.getNodeIds.mockReturnValue([
      NodeId.create('major_premise').value,
      NodeId.create('socrates_premise').value,
      NodeId.create('conclusion').value,
    ]);
    return tree;
  }

  function createSyllogismNodes(): Node[] {
    const majorPremise = mock<Node>();
    majorPremise.getArgumentId.mockReturnValue(AtomicArgumentId.create('all_men_mortal').value);
    majorPremise.isRoot.mockReturnValue(true);
    majorPremise.isChild.mockReturnValue(false);

    const socratesPremise = mock<Node>();
    socratesPremise.getArgumentId.mockReturnValue(AtomicArgumentId.create('socrates_is_man').value);
    socratesPremise.isRoot.mockReturnValue(true);
    socratesPremise.isChild.mockReturnValue(false);

    const conclusion = mock<Node>();
    conclusion.getArgumentId.mockReturnValue(AtomicArgumentId.create('socrates_is_mortal').value);
    conclusion.isRoot.mockReturnValue(false);
    conclusion.isChild.mockReturnValue(true);
    conclusion.getParentNodeId.mockReturnValue(NodeId.create('major_premise').value);
    conclusion.getAttachment.mockReturnValue({
      getPremisePosition: () => 0,
      getFromPosition: () => undefined,
    });

    return [majorPremise, socratesPremise, conclusion];
  }

  function createSyllogismArguments(): AtomicArgument[] {
    const allMenMortal = mock<AtomicArgument>();
    allMenMortal.getId.mockReturnValue(AtomicArgumentId.create('all_men_mortal').value);
    allMenMortal.getPremiseSet.mockReturnValue(undefined);
    allMenMortal.getConclusionSet.mockReturnValue(OrderedSetId.create('men_are_mortal').value);
    allMenMortal.isComplete.mockReturnValue(true);

    const socratesIsMan = mock<AtomicArgument>();
    socratesIsMan.getId.mockReturnValue(AtomicArgumentId.create('socrates_is_man').value);
    socratesIsMan.getPremiseSet.mockReturnValue(undefined);
    socratesIsMan.getConclusionSet.mockReturnValue(OrderedSetId.create('socrates_is_man').value);
    socratesIsMan.isComplete.mockReturnValue(true);

    const socratesIsMortal = mock<AtomicArgument>();
    socratesIsMortal.getId.mockReturnValue(AtomicArgumentId.create('socrates_is_mortal').value);
    socratesIsMortal.getPremiseSet.mockReturnValue(OrderedSetId.create('men_are_mortal').value);
    socratesIsMortal.getConclusionSet.mockReturnValue(
      OrderedSetId.create('socrates_is_mortal').value,
    );
    socratesIsMortal.isComplete.mockReturnValue(true);

    return [allMenMortal, socratesIsMan, socratesIsMortal];
  }

  function createComplexTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(TreeId.create('tree1').value);
    tree.getNodeIds.mockReturnValue([
      NodeId.create('theorem_root').value,
      NodeId.create('lemma_1').value,
      NodeId.create('lemma_2').value,
      NodeId.create('proof_step_1').value,
      NodeId.create('proof_step_2').value,
    ]);
    return tree;
  }

  function createComplexNodes(): Node[] {
    // Create a branching structure: theorem_root has two lemmas, each lemma has a proof step
    const nodes = [];

    const theoremRoot = mock<Node>();
    theoremRoot.getArgumentId.mockReturnValue(AtomicArgumentId.create('main_theorem').value);
    theoremRoot.isRoot.mockReturnValue(false);
    theoremRoot.isChild.mockReturnValue(true);
    nodes.push(theoremRoot);

    const lemma1 = mock<Node>();
    lemma1.getArgumentId.mockReturnValue(AtomicArgumentId.create('lemma_1_arg').value);
    lemma1.isRoot.mockReturnValue(false);
    lemma1.isChild.mockReturnValue(true);
    lemma1.getParentNodeId.mockReturnValue(NodeId.create('theorem_root').value);
    lemma1.getAttachment.mockReturnValue({
      getPremisePosition: () => 0,
      getFromPosition: () => undefined,
    });
    nodes.push(lemma1);

    const lemma2 = mock<Node>();
    lemma2.getArgumentId.mockReturnValue(AtomicArgumentId.create('lemma_2_arg').value);
    lemma2.isRoot.mockReturnValue(false);
    lemma2.isChild.mockReturnValue(true);
    lemma2.getParentNodeId.mockReturnValue(NodeId.create('theorem_root').value);
    lemma2.getAttachment.mockReturnValue({
      getPremisePosition: () => 1,
      getFromPosition: () => undefined,
    });
    nodes.push(lemma2);

    const proofStep1 = mock<Node>();
    proofStep1.getArgumentId.mockReturnValue(AtomicArgumentId.create('proof_step_1_arg').value);
    proofStep1.isRoot.mockReturnValue(true);
    proofStep1.isChild.mockReturnValue(false);
    nodes.push(proofStep1);

    const proofStep2 = mock<Node>();
    proofStep2.getArgumentId.mockReturnValue(AtomicArgumentId.create('proof_step_2_arg').value);
    proofStep2.isRoot.mockReturnValue(true);
    proofStep2.isChild.mockReturnValue(false);
    nodes.push(proofStep2);

    return nodes;
  }

  function createComplexArguments(): AtomicArgument[] {
    const args = [];

    const mainTheorem = mock<AtomicArgument>();
    mainTheorem.getId.mockReturnValue(AtomicArgumentId.create('main_theorem').value);
    mainTheorem.getPremiseSet.mockReturnValue(OrderedSetId.create('theorem_premises').value);
    mainTheorem.getConclusionSet.mockReturnValue(OrderedSetId.create('theorem_conclusion').value);
    mainTheorem.isComplete.mockReturnValue(true);
    args.push(mainTheorem);

    // Add other arguments with proper connections
    for (let i = 1; i <= 4; i++) {
      const arg = mock<AtomicArgument>();
      arg.getId.mockReturnValue(AtomicArgumentId.create(`arg_${i}`).value);
      arg.getPremiseSet.mockReturnValue(
        i === 1 || i === 2 ? undefined : OrderedSetId.create(`set_${i}`).value,
      );
      arg.getConclusionSet.mockReturnValue(OrderedSetId.create(`set_${i + 10}`).value);
      arg.isComplete.mockReturnValue(true);
      args.push(arg);
    }

    return args;
  }

  function createDisconnectedTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(TreeId.create('tree1').value);
    tree.getNodeIds.mockReturnValue([
      NodeId.create('isolated_argument_1').value,
      NodeId.create('isolated_argument_2').value,
    ]);
    return tree;
  }

  function createDisconnectedNodes(): Node[] {
    const node1 = mock<Node>();
    node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('isolated_1').value);
    node1.isRoot.mockReturnValue(true);
    node1.isChild.mockReturnValue(false);

    const node2 = mock<Node>();
    node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('isolated_2').value);
    node2.isRoot.mockReturnValue(true);
    node2.isChild.mockReturnValue(false);

    return [node1, node2];
  }

  function createDisconnectedArguments(): AtomicArgument[] {
    const arg1 = mock<AtomicArgument>();
    arg1.getId.mockReturnValue(AtomicArgumentId.create('isolated_1').value);
    arg1.getPremiseSet.mockReturnValue(undefined);
    arg1.getConclusionSet.mockReturnValue(OrderedSetId.create('isolated_conclusion_1').value);
    arg1.isComplete.mockReturnValue(true);

    const arg2 = mock<AtomicArgument>();
    arg2.getId.mockReturnValue(AtomicArgumentId.create('isolated_2').value);
    arg2.getPremiseSet.mockReturnValue(undefined);
    arg2.getConclusionSet.mockReturnValue(OrderedSetId.create('isolated_conclusion_2').value);
    arg2.isComplete.mockReturnValue(true);

    return [arg1, arg2];
  }

  function createLargeTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(TreeId.create('tree1').value);

    // Create node IDs for a tree with 50 nodes
    const nodeIds = Array.from({ length: 50 }, (_, i) => NodeId.create(`node_${i}`).value);
    tree.getNodeIds.mockReturnValue(nodeIds);

    return tree;
  }

  function createLargeTreeNodes(): Node[] {
    const nodes = [];

    // Create 50 nodes with a tree structure
    for (let i = 0; i < 50; i++) {
      const node = mock<Node>();
      node.getArgumentId.mockReturnValue(AtomicArgumentId.create(`arg_${i}`).value);

      if (i === 0) {
        // Root node
        node.isRoot.mockReturnValue(true);
        node.isChild.mockReturnValue(false);
      } else {
        // Child nodes - create a balanced tree structure
        node.isRoot.mockReturnValue(false);
        node.isChild.mockReturnValue(true);
        const parentIndex = Math.floor((i - 1) / 2);
        node.getParentNodeId.mockReturnValue(NodeId.create(`node_${parentIndex}`).value);
        node.getAttachment.mockReturnValue({
          getPremisePosition: () => i % 2,
          getFromPosition: () => undefined,
        });
      }

      nodes.push(node);
    }

    return nodes;
  }

  function createLargeTreeArguments(): AtomicArgument[] {
    const args = [];

    for (let i = 0; i < 50; i++) {
      const arg = mock<AtomicArgument>();
      arg.getId.mockReturnValue(AtomicArgumentId.create(`arg_${i}`).value);
      arg.getPremiseSet.mockReturnValue(
        i === 0 ? undefined : OrderedSetId.create(`premise_set_${i}`).value,
      );
      arg.getConclusionSet.mockReturnValue(OrderedSetId.create(`conclusion_set_${i}`).value);
      arg.isComplete.mockReturnValue(true);
      args.push(arg);
    }

    return args;
  }

  function setupMockRepositories(
    tree: Tree,
    nodes: Node[],
    atomicArguments: AtomicArgument[],
  ): void {
    mockTreeRepository.findById.mockImplementation(async (treeId: TreeId) => {
      return treeId.getValue() === 'tree1' ? tree : null;
    });

    mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
      return (
        nodes.find((n) => {
          const mockNode = n as any;
          return mockNode.getArgumentId().getValue().includes(nodeId.getValue().split('_')[0]);
        }) || null
      );
    });

    mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
      return (
        atomicArguments.find((a) => {
          const mockArg = a as any;
          return mockArg.getId().getValue() === argId.getValue();
        }) || null
      );
    });
  }
});
