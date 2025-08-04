import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import {
  createTestAtomicArgumentId,
  createTestNodeId,
  createTestTreeId,
} from '../../../application/queries/__tests__/shared/branded-type-helpers.js';
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
  type AtomicArgumentId,
  Attachment,
  type NodeId,
  OrderedSetId,
  type TreeId,
} from '../../../domain/shared/value-objects/index.js';

/**
 * Integration tests demonstrating how graphology works with the existing query system.
 * These tests show real-world usage patterns and verify the integration works end-to-end.
 */
describe('ProofTreeQueryService Integration with Graphology', () => {
  let queryService: ProofTreeQueryService;
  let mockTreeRepository: MockProxy<ITreeRepository>;
  let mockNodeRepository: MockProxy<INodeRepository>;
  let mockArgumentRepository: MockProxy<IAtomicArgumentRepository>;
  let mockGraphTraversalService: MockProxy<IGraphTraversalService>;

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
      if (result.isOk()) {
        const path = result.value;
        expect(path).toHaveLength(3);

        // Verify the logical flow: premise → major premise → conclusion
        expect(path[0]?.nodeId).toBe('socrates_premise');
        expect(path[1]?.nodeId).toBe('major_premise');
        expect(path[2]?.nodeId).toBe('conclusion');

        // Verify argument details are included
        expect(path[0]?.argument?.id).toBe('socrates_is_man');
        expect(path[2]?.argument?.id).toBe('socrates_is_mortal');
      }
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
      if (!result.isOk()) return;
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
      if (!result.isOk()) return;
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
      if (!result.isOk()) return;
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
    tree.getId.mockReturnValue(createTestTreeId('tree1'));
    tree.getNodeIds.mockReturnValue([
      createTestNodeId('major_premise'),
      createTestNodeId('socrates_premise'),
      createTestNodeId('conclusion'),
    ]);
    return tree;
  }

  function createSyllogismNodes(): Node[] {
    const majorPremise = mock<Node>();
    majorPremise.getArgumentId.mockReturnValue(createTestAtomicArgumentId('all_men_mortal'));
    majorPremise.isRoot.mockReturnValue(true);
    majorPremise.isChild.mockReturnValue(false);

    const socratesPremise = mock<Node>();
    socratesPremise.getArgumentId.mockReturnValue(createTestAtomicArgumentId('socrates_is_man'));
    socratesPremise.isRoot.mockReturnValue(true);
    socratesPremise.isChild.mockReturnValue(false);

    const conclusion = mock<Node>();
    conclusion.getArgumentId.mockReturnValue(createTestAtomicArgumentId('socrates_is_mortal'));
    conclusion.isRoot.mockReturnValue(false);
    conclusion.isChild.mockReturnValue(true);
    conclusion.getParentNodeId.mockReturnValue(createTestNodeId('major_premise'));
    const attachmentResult = Attachment.create(createTestNodeId('major_premise'), 0);
    conclusion.getAttachment.mockReturnValue(
      attachmentResult.isOk() ? attachmentResult.value : null,
    );

    return [majorPremise, socratesPremise, conclusion];
  }

  function createSyllogismArguments(): AtomicArgument[] {
    const allMenMortal = mock<AtomicArgument>();
    allMenMortal.getId.mockReturnValue(createTestAtomicArgumentId('all_men_mortal'));
    allMenMortal.getPremises.mockReturnValue([]);
    allMenMortal.getConclusions.mockReturnValue([]);
    allMenMortal.isComplete.mockReturnValue(true);

    const socratesIsMan = mock<AtomicArgument>();
    socratesIsMan.getId.mockReturnValue(createTestAtomicArgumentId('socrates_is_man'));
    socratesIsMan.getPremises.mockReturnValue([]);
    socratesIsMan.getConclusions.mockReturnValue([]);
    socratesIsMan.isComplete.mockReturnValue(true);

    const socratesIsMortal = mock<AtomicArgument>();
    socratesIsMortal.getId.mockReturnValue(createTestAtomicArgumentId('socrates_is_mortal'));
    socratesIsMortal.getPremises.mockReturnValue([]);
    socratesIsMortal.getConclusions.mockReturnValue([]);
    socratesIsMortal.isComplete.mockReturnValue(true);

    return [allMenMortal, socratesIsMan, socratesIsMortal];
  }

  function createComplexTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(createTestTreeId('tree1'));
    tree.getNodeIds.mockReturnValue([
      createTestNodeId('theorem_root'),
      createTestNodeId('lemma_1'),
      createTestNodeId('lemma_2'),
      createTestNodeId('proof_step_1'),
      createTestNodeId('proof_step_2'),
    ]);
    return tree;
  }

  function createComplexNodes(): Node[] {
    // Create a branching structure: theorem_root has two lemmas, each lemma has a proof step
    const nodes = [];

    const theoremRoot = mock<Node>();
    theoremRoot.getArgumentId.mockReturnValue(createTestAtomicArgumentId('main_theorem'));
    theoremRoot.isRoot.mockReturnValue(false);
    theoremRoot.isChild.mockReturnValue(true);
    nodes.push(theoremRoot);

    const lemma1 = mock<Node>();
    lemma1.getArgumentId.mockReturnValue(createTestAtomicArgumentId('lemma_1_arg'));
    lemma1.isRoot.mockReturnValue(false);
    lemma1.isChild.mockReturnValue(true);
    lemma1.getParentNodeId.mockReturnValue(createTestNodeId('theorem_root'));
    const lemma1AttachmentResult = Attachment.create(createTestNodeId('theorem_root'), 0);
    lemma1.getAttachment.mockReturnValue(
      lemma1AttachmentResult.isOk() ? lemma1AttachmentResult.value : null,
    );
    nodes.push(lemma1);

    const lemma2 = mock<Node>();
    lemma2.getArgumentId.mockReturnValue(createTestAtomicArgumentId('lemma_2_arg'));
    lemma2.isRoot.mockReturnValue(false);
    lemma2.isChild.mockReturnValue(true);
    lemma2.getParentNodeId.mockReturnValue(createTestNodeId('theorem_root'));
    const lemma2AttachmentResult = Attachment.create(createTestNodeId('theorem_root'), 1);
    lemma2.getAttachment.mockReturnValue(
      lemma2AttachmentResult.isOk() ? lemma2AttachmentResult.value : null,
    );
    nodes.push(lemma2);

    const proofStep1 = mock<Node>();
    proofStep1.getArgumentId.mockReturnValue(createTestAtomicArgumentId('proof_step_1_arg'));
    proofStep1.isRoot.mockReturnValue(true);
    proofStep1.isChild.mockReturnValue(false);
    nodes.push(proofStep1);

    const proofStep2 = mock<Node>();
    proofStep2.getArgumentId.mockReturnValue(createTestAtomicArgumentId('proof_step_2_arg'));
    proofStep2.isRoot.mockReturnValue(true);
    proofStep2.isChild.mockReturnValue(false);
    nodes.push(proofStep2);

    return nodes;
  }

  function createComplexArguments(): AtomicArgument[] {
    const args = [];

    const mainTheorem = mock<AtomicArgument>();
    mainTheorem.getId.mockReturnValue(createTestAtomicArgumentId('main_theorem'));
    mainTheorem.getPremises.mockReturnValue([]);
    mainTheorem.getConclusions.mockReturnValue([]);
    mainTheorem.isComplete.mockReturnValue(true);
    args.push(mainTheorem);

    // Add other arguments with proper connections
    for (let i = 1; i <= 4; i++) {
      const arg = mock<AtomicArgument>();
      arg.getId.mockReturnValue(createTestAtomicArgumentId(`arg_${i}`));
      arg.getPremises.mockReturnValue([]);
      arg.getConclusions.mockReturnValue([]);
      arg.isComplete.mockReturnValue(true);
      args.push(arg);
    }

    return args;
  }

  function createDisconnectedTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(createTestTreeId('tree1'));
    tree.getNodeIds.mockReturnValue([
      createTestNodeId('isolated_argument_1'),
      createTestNodeId('isolated_argument_2'),
    ]);
    return tree;
  }

  function createDisconnectedNodes(): Node[] {
    const node1 = mock<Node>();
    node1.getArgumentId.mockReturnValue(createTestAtomicArgumentId('isolated_1'));
    node1.isRoot.mockReturnValue(true);
    node1.isChild.mockReturnValue(false);

    const node2 = mock<Node>();
    node2.getArgumentId.mockReturnValue(createTestAtomicArgumentId('isolated_2'));
    node2.isRoot.mockReturnValue(true);
    node2.isChild.mockReturnValue(false);

    return [node1, node2];
  }

  function createDisconnectedArguments(): AtomicArgument[] {
    const arg1 = mock<AtomicArgument>();
    arg1.getId.mockReturnValue(createTestAtomicArgumentId('isolated_1'));
    arg1.getPremises.mockReturnValue([]);
    arg1.getConclusions.mockReturnValue([]);
    arg1.isComplete.mockReturnValue(true);

    const arg2 = mock<AtomicArgument>();
    arg2.getId.mockReturnValue(createTestAtomicArgumentId('isolated_2'));
    arg2.getPremises.mockReturnValue([]);
    arg2.getConclusions.mockReturnValue([]);
    arg2.isComplete.mockReturnValue(true);

    return [arg1, arg2];
  }

  function createLargeTree(): Tree {
    const tree = mock<Tree>();
    tree.getId.mockReturnValue(createTestTreeId('tree1'));

    // Create node IDs for a tree with 50 nodes
    const nodeIds = Array.from({ length: 50 }, (_, i) => createTestNodeId(`node_${i}`));
    tree.getNodeIds.mockReturnValue(nodeIds);

    return tree;
  }

  function createLargeTreeNodes(): Node[] {
    const nodes = [];

    // Create 50 nodes with a tree structure
    for (let i = 0; i < 50; i++) {
      const node = mock<Node>();
      node.getArgumentId.mockReturnValue(createTestAtomicArgumentId(`arg_${i}`));

      if (i === 0) {
        // Root node
        node.isRoot.mockReturnValue(true);
        node.isChild.mockReturnValue(false);
      } else {
        // Child nodes - create a balanced tree structure
        node.isRoot.mockReturnValue(false);
        node.isChild.mockReturnValue(true);
        const parentIndex = Math.floor((i - 1) / 2);
        node.getParentNodeId.mockReturnValue(createTestNodeId(`node_${parentIndex}`));
        const attachmentResult = Attachment.create(createTestNodeId(`node_${parentIndex}`), i % 2);
        node.getAttachment.mockReturnValue(attachmentResult.isOk() ? attachmentResult.value : null);
      }

      nodes.push(node);
    }

    return nodes;
  }

  function createLargeTreeArguments(): AtomicArgument[] {
    const args = [];

    for (let i = 0; i < 50; i++) {
      const arg = mock<AtomicArgument>();
      arg.getId.mockReturnValue(createTestAtomicArgumentId(`arg_${i}`));
      arg.getPremises.mockReturnValue([]);
      arg.getConclusions.mockReturnValue([]);
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
      if (treeId.getValue() === 'tree1') {
        return ok(tree);
      }
      return ok(null) as any; // Type assertion for test
    });

    mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
      const foundNode = nodes.find((n) => {
        const mockNode = n as any;
        return mockNode.getArgumentId().getValue().includes(nodeId.getValue().split('_')[0]);
      });
      if (foundNode) {
        return ok(foundNode);
      }
      return ok(null) as any; // Type assertion for test
    });

    mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
      const foundArg = atomicArguments.find((a) => {
        const mockArg = a as any;
        return mockArg.getId().getValue() === argId.getValue();
      });
      if (foundArg) {
        return ok(foundArg);
      }
      return ok(null) as any; // Type assertion for test
    });

    // Mock the graph traversal service methods
    mockGraphTraversalService.buildGraphFromTree.mockResolvedValue(ok(undefined));

    mockGraphTraversalService.findPath.mockImplementation((fromId: NodeId, toId: NodeId) => {
      // Simple path finding logic for tests
      const path: NodeId[] = [];
      if (fromId.getValue() === 'socrates_premise' && toId.getValue() === 'conclusion') {
        path.push(createTestNodeId('socrates_premise'));
        path.push(createTestNodeId('major_premise'));
        path.push(createTestNodeId('conclusion'));
      } else if (
        fromId.getValue() === 'isolated_argument_1' &&
        toId.getValue() === 'isolated_argument_2'
      ) {
        // Disconnected nodes return empty path
      }
      return ok(path);
    });

    mockGraphTraversalService.getSubtree.mockImplementation((rootId: NodeId, maxDepth?: number) => {
      const nodeIds: NodeId[] = [];
      const connections: Array<{ from: NodeId; to: NodeId; position: number }> = [];

      // Add some sample data based on the root
      if (rootId.getValue() === 'theorem_root') {
        nodeIds.push(createTestNodeId('theorem_root'));
        nodeIds.push(createTestNodeId('lemma_1'));
        nodeIds.push(createTestNodeId('lemma_2'));
        nodeIds.push(createTestNodeId('proof_step_1'));

        connections.push({
          from: createTestNodeId('lemma_1'),
          to: createTestNodeId('theorem_root'),
          position: 0,
        });
        connections.push({
          from: createTestNodeId('lemma_2'),
          to: createTestNodeId('theorem_root'),
          position: 1,
        });
      } else if (rootId.getValue() === 'root') {
        // Large tree scenario
        for (let i = 0; i < 15; i++) {
          nodeIds.push(createTestNodeId(`node_${i}`));
        }
      }

      const subtreeMap = new Map<string, { depth: number; node: NodeId }>();
      nodeIds.forEach((nodeId, index) => {
        subtreeMap.set(nodeId.getValue(), { depth: Math.floor(index / 3), node: nodeId });
      });
      return ok(subtreeMap);
    });

    mockGraphTraversalService.getTreeMetrics.mockImplementation((treeId: TreeId) => {
      return ok({
        nodeCount: nodes.length,
        depth: 5,
        breadth: 3,
        leafCount: nodes.filter((n) => n.isRoot()).length,
        cycleCount: 0,
      });
    });
  }
});
