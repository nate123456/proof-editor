/**
 * Comprehensive test suite for INodeRepository interface
 *
 * Tests mock implementations of the Node repository to ensure:
 * - All interface methods are properly implemented
 * - Error scenarios are properly handled
 * - Edge cases are covered
 * - Repository operations maintain domain invariants
 */

import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument';
import { Node } from '../../entities/Node';
import { OrderedSet } from '../../entities/OrderedSet';
import { Statement } from '../../entities/Statement';
import { RepositoryError } from '../../errors/DomainErrors';
import type { INodeRepository } from '../../repositories/INodeRepository';
import { Attachment, NodeId, type TreeId } from '../../shared/value-objects';
import { nodeIdFactory, statementContentFactory, treeIdFactory } from '../factories';

// Mock implementation of INodeRepository for testing
class MockNodeRepository implements INodeRepository {
  private readonly nodes = new Map<string, Node>();
  private readonly treeIndex = new Map<string, Set<Node>>();
  private readonly nodeTreeMap = new Map<string, TreeId>();

  async save(node: Node): Promise<Result<void, RepositoryError>> {
    try {
      // Simulate validation
      if (!node?.getId()) {
        return Promise.resolve(err(new RepositoryError('Invalid node provided')));
      }

      const id = node.getId().getValue();
      const treeId = this.getTreeIdForNode(node);

      if (!treeId) {
        return Promise.resolve(err(new RepositoryError('Node must belong to a tree')));
      }

      // Check for circular references (simplified)
      if (this.wouldCreateCycle(node)) {
        return Promise.resolve(err(new RepositoryError('Node would create circular reference')));
      }

      this.nodes.set(id, node);

      // Update tree index
      this.updateTreeIndex(treeId, node);

      return Promise.resolve(ok(undefined));
    } catch (error) {
      return Promise.resolve(err(new RepositoryError('Failed to save node', error as Error)));
    }
  }

  async findById(id: NodeId): Promise<Node | null> {
    const node = this.nodes.get(id.getValue());
    return Promise.resolve(node ?? null);
  }

  async findByTree(treeId: TreeId): Promise<Node[]> {
    const nodesSet = this.treeIndex.get(treeId.getValue());
    return Promise.resolve(nodesSet ? Array.from(nodesSet) : []);
  }

  async delete(id: NodeId): Promise<Result<void, RepositoryError>> {
    try {
      const node = this.nodes.get(id.getValue());
      if (!node) {
        return Promise.resolve(err(new RepositoryError('Node not found')));
      }

      // Check if node has children
      if (this.hasChildren(node)) {
        return Promise.resolve(err(new RepositoryError('Cannot delete node with children')));
      }

      // Remove from indexes
      const treeId = this.getTreeIdForNode(node);
      if (treeId) {
        this.removeFromTreeIndex(treeId, node);
      }
      this.nodeTreeMap.delete(id.getValue());

      this.nodes.delete(id.getValue());

      return Promise.resolve(ok(undefined));
    } catch (error) {
      return Promise.resolve(err(new RepositoryError('Failed to delete node', error as Error)));
    }
  }

  // Test helper methods
  clear(): void {
    this.nodes.clear();
    this.treeIndex.clear();
  }

  size(): number {
    return this.nodes.size;
  }

  private updateTreeIndex(treeId: TreeId, node: Node): void {
    const key = treeId.getValue();
    if (!this.treeIndex.has(key)) {
      this.treeIndex.set(key, new Set());
    }
    this.treeIndex.get(key)?.add(node);
  }

  private removeFromTreeIndex(treeId: TreeId, node: Node): void {
    const key = treeId.getValue();
    const nodesSet = this.treeIndex.get(key);
    if (nodesSet) {
      nodesSet.delete(node);
      if (nodesSet.size === 0) {
        this.treeIndex.delete(key);
      }
    }
  }

  private wouldCreateCycle(node: Node): boolean {
    // Simplified cycle detection - in real implementation would check parent chain
    return node.getId().getValue().includes('cycle');
  }

  private hasChildren(node: Node): boolean {
    // Check if any other nodes have this node as parent
    for (const otherNode of Array.from(this.nodes.values())) {
      if (otherNode.getParentNodeId()?.equals(node.getId())) {
        return true;
      }
    }
    return false;
  }

  // Helper to associate nodes with trees in this mock
  private getTreeIdForNode(node: Node): TreeId | null {
    return this.nodeTreeMap.get(node.getId().getValue()) ?? null;
  }

  setNodeTree(node: Node, treeId: TreeId): void {
    this.nodeTreeMap.set(node.getId().getValue(), treeId);
  }
}

describe('INodeRepository', () => {
  let repository: MockNodeRepository;

  beforeEach(() => {
    repository = new MockNodeRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create test atomic argument
  const createTestArgument = () => {
    const premiseStatements = Array.from({ length: 2 }, () => {
      const result = Statement.create(statementContentFactory.build());
      if (!result.isOk()) throw new Error('Statement creation failed');
      return result.value;
    });
    const conclusionStatements = Array.from({ length: 1 }, () => {
      const result = Statement.create(statementContentFactory.build());
      if (!result.isOk()) throw new Error('Statement creation failed');
      return result.value;
    });

    const premiseSetResult = OrderedSet.create(premiseStatements.map((s) => s.getId()));
    if (!premiseSetResult.isOk()) throw new Error('OrderedSet creation failed');
    const premiseSet = premiseSetResult.value;

    const conclusionSetResult = OrderedSet.create(conclusionStatements.map((s) => s.getId()));
    if (!conclusionSetResult.isOk()) throw new Error('OrderedSet creation failed');
    const conclusionSet = conclusionSetResult.value;

    const atomicArgResult = AtomicArgument.create(premiseSet.getId(), conclusionSet.getId());
    if (!atomicArgResult.isOk()) throw new Error('AtomicArgument creation failed');
    return atomicArgResult.value;
  };

  // Helper function to create test node
  const createTestNode = (treeId: TreeId, parentId?: NodeId, position = 0) => {
    const argument = createTestArgument();

    let node: Node;
    if (parentId) {
      const attachmentResult = Attachment.create(parentId, position);
      if (!attachmentResult.isOk()) throw new Error('Attachment creation failed');
      const attachment = attachmentResult.value;
      const nodeResult = Node.createChild(argument.getId(), attachment);
      if (!nodeResult.isOk()) throw new Error('Node creation failed');
      node = nodeResult.value;
    } else {
      const nodeResult = Node.createRoot(argument.getId());
      if (!nodeResult.isOk()) throw new Error('Node creation failed');
      node = nodeResult.value;
    }

    // Associate node with tree in the mock repository
    if (repository && (repository as any).setNodeTree) {
      (repository as any).setNodeTree(node, treeId);
    }

    return node;
  };

  describe('save', () => {
    it('should save a valid root node successfully', async () => {
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);

      const result = await repository.save(node);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(1);
    });

    it('should save a child node with parent reference', async () => {
      const treeId = treeIdFactory.build();
      const rootNode = createTestNode(treeId);
      await repository.save(rootNode);

      const childNode = createTestNode(treeId, rootNode.getId(), 0);
      const result = await repository.save(childNode);

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(2);
      expect(childNode.getParentNodeId()?.equals(rootNode.getId())).toBe(true);
    });

    it('should index nodes by tree', async () => {
      const treeId = treeIdFactory.build();
      const nodes = Array.from({ length: 3 }, () => createTestNode(treeId));

      for (const node of nodes) {
        await repository.save(node);
      }

      const byTree = await repository.findByTree(treeId);
      expect(byTree).toHaveLength(3);
    });

    it('should reject nodes that would create cycles', async () => {
      const treeId = treeIdFactory.build();
      const argument = createTestArgument();

      // Create a node with "cycle" in its ID to trigger cycle detection
      const nodeIdResult = NodeId.fromString('cycle-node-123');
      if (!nodeIdResult.isOk()) throw new Error('NodeId creation failed');
      const nodeId = nodeIdResult.value;
      const nodeResult = Node.reconstruct(nodeId, argument.getId(), null, Date.now(), Date.now());

      if (nodeResult.isOk()) {
        // Associate the node with a tree so it passes the tree check
        (repository as any).setNodeTree(nodeResult.value, treeId);

        const result = await repository.save(nodeResult.value);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('circular reference');
        }
      }
    });

    it('should handle null node gracefully', async () => {
      const result = await repository.save(null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Invalid node');
      }
    });

    it('should reject node without tree ID', async () => {
      const argument = createTestArgument();
      // Create a node without proper tree ID setup
      const nodeWithoutTree = Object.create(Node.prototype);
      nodeWithoutTree.getId = () => nodeIdFactory.build();
      // Mock node without tree association
      nodeWithoutTree.getArgumentRef = () => argument;

      const result = await repository.save(nodeWithoutTree);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must belong to a tree');
      }
    });

    it('should handle save failures with proper error', async () => {
      const failingRepo = new MockNodeRepository();
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);

      // Associate the node with the tree in the failing repo
      (failingRepo as any).setNodeTree(node, treeId);

      vi.spyOn(failingRepo as any, 'nodes', 'get').mockImplementation(() => {
        throw new Error('Storage failure');
      });

      const result = await failingRepo.save(node);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.message).toContain('Failed to save');
        expect(result.error.cause?.message).toContain('Storage failure');
      }
    });

    it('should save nodes at different positions', async () => {
      const treeId = treeIdFactory.build();
      const rootNode = createTestNode(treeId);
      await repository.save(rootNode);

      // Create multiple children at different positions
      const children = await Promise.all(
        Array.from({ length: 3 }, (_, i) => createTestNode(treeId, rootNode.getId(), i)),
      );

      for (const child of children) {
        const result = await repository.save(child);
        expect(result.isOk()).toBe(true);
      }

      expect(repository.size()).toBe(4); // 1 root + 3 children
    });
  });

  describe('findById', () => {
    it('should find existing node by ID', async () => {
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);
      await repository.save(node);

      const found = await repository.findById(node.getId());

      expect(found).not.toBeNull();
      expect(found?.getId().equals(node.getId())).toBe(true);
      // Note: Node entity doesn't have getTreeId method
    });

    it('should return null for non-existent ID', async () => {
      const randomId = nodeIdFactory.build();
      const found = await repository.findById(randomId);

      expect(found).toBeNull();
    });

    it('should handle multiple nodes correctly', async () => {
      const treeId = treeIdFactory.build();
      const nodes = Array.from({ length: 5 }, () => createTestNode(treeId));

      for (const node of nodes) {
        await repository.save(node);
      }

      for (const node of nodes) {
        const found = await repository.findById(node.getId());
        expect(found).not.toBeNull();
        expect(found?.getId().equals(node.getId())).toBe(true);
      }
    });

    it('should preserve parent-child relationships', async () => {
      const treeId = treeIdFactory.build();
      const parentNode = createTestNode(treeId);
      await repository.save(parentNode);

      const childNode = createTestNode(treeId, parentNode.getId(), 0);
      await repository.save(childNode);

      const foundChild = await repository.findById(childNode.getId());
      expect(foundChild).not.toBeNull();
      expect(foundChild?.getParentNodeId()?.equals(parentNode.getId())).toBe(true);
      expect(foundChild?.getPremisePosition()).toBe(0);
    });
  });

  describe('findByTree', () => {
    it('should return empty array for tree with no nodes', async () => {
      const treeId = treeIdFactory.build();
      const nodes = await repository.findByTree(treeId);

      expect(nodes).toEqual([]);
      expect(nodes.length).toBe(0);
    });

    it('should find all nodes in a tree', async () => {
      const treeId = treeIdFactory.build();
      const count = 5;
      const nodes = Array.from({ length: count }, () => createTestNode(treeId));

      for (const node of nodes) {
        await repository.save(node);
      }

      const found = await repository.findByTree(treeId);

      expect(found.length).toBe(count);

      const foundIds = found.map((n) => n.getId().getValue()).sort();
      const expectedIds = nodes.map((n) => n.getId().getValue()).sort();
      expect(foundIds).toEqual(expectedIds);
    });

    it('should separate nodes by tree', async () => {
      const tree1 = treeIdFactory.build();
      const tree2 = treeIdFactory.build();

      const tree1Nodes = Array.from({ length: 3 }, () => createTestNode(tree1));

      const tree2Nodes = Array.from({ length: 2 }, () => createTestNode(tree2));

      for (const node of [...tree1Nodes, ...tree2Nodes]) {
        await repository.save(node);
      }

      const foundTree1 = await repository.findByTree(tree1);
      const foundTree2 = await repository.findByTree(tree2);

      expect(foundTree1.length).toBe(3);
      expect(foundTree2.length).toBe(2);

      // Ensure no cross-contamination
      const tree1Ids = foundTree1.map((n) => n.getId().getValue());
      const tree2Ids = foundTree2.map((n) => n.getId().getValue());
      expect(tree1Ids.some((id) => tree2Ids.includes(id))).toBe(false);
    });

    it('should include all nodes in tree hierarchy', async () => {
      const treeId = treeIdFactory.build();

      // Create a tree structure:
      //     root
      //    /    \
      //  child1  child2
      //    |
      //  grandchild

      const root = createTestNode(treeId);
      await repository.save(root);

      const child1 = createTestNode(treeId, root.getId(), 0);
      const child2 = createTestNode(treeId, root.getId(), 1);
      await repository.save(child1);
      await repository.save(child2);

      const grandchild = createTestNode(treeId, child1.getId(), 0);
      await repository.save(grandchild);

      const allNodes = await repository.findByTree(treeId);
      expect(allNodes.length).toBe(4);

      // Verify all nodes are present
      const nodeIds = [root, child1, child2, grandchild].map((n) => n.getId().getValue());
      const foundIds = allNodes.map((n) => n.getId().getValue());

      for (const id of nodeIds) {
        expect(foundIds).toContain(id);
      }
    });
  });

  describe('delete', () => {
    it('should delete leaf node successfully', async () => {
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);
      await repository.save(node);

      const result = await repository.delete(node.getId());

      expect(result.isOk()).toBe(true);
      expect(repository.size()).toBe(0);

      const found = await repository.findById(node.getId());
      expect(found).toBeNull();
    });

    it('should reject deleting node with children', async () => {
      const treeId = treeIdFactory.build();
      const parentNode = createTestNode(treeId);
      const childNode = createTestNode(treeId, parentNode.getId(), 0);

      await repository.save(parentNode);
      await repository.save(childNode);

      const result = await repository.delete(parentNode.getId());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('children');
      }
      expect(repository.size()).toBe(2);
    });

    it('should remove from tree index', async () => {
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);
      await repository.save(node);

      await repository.delete(node.getId());

      const byTree = await repository.findByTree(treeId);
      expect(byTree).toHaveLength(0);
    });

    it('should return error for non-existent node', async () => {
      const randomId = nodeIdFactory.build();
      const result = await repository.delete(randomId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should handle delete failures with proper error', async () => {
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);
      await repository.save(node);

      const failingRepo = new MockNodeRepository();
      await failingRepo.save(node);

      vi.spyOn(failingRepo as any, 'nodes', 'get').mockImplementation(() => {
        throw new Error('Delete operation failed');
      });

      const result = await failingRepo.delete(node.getId());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause?.message).toContain('Delete operation failed');
      }
    });

    it('should allow deleting nodes in bottom-up order', async () => {
      const treeId = treeIdFactory.build();

      // Create parent-child relationship
      const parent = createTestNode(treeId);
      await repository.save(parent);

      const child = createTestNode(treeId, parent.getId(), 0);
      await repository.save(child);

      // Delete child first (should succeed)
      const childDeleteResult = await repository.delete(child.getId());
      expect(childDeleteResult.isOk()).toBe(true);

      // Now delete parent (should succeed)
      const parentDeleteResult = await repository.delete(parent.getId());
      expect(parentDeleteResult.isOk()).toBe(true);

      expect(repository.size()).toBe(0);
    });
  });

  describe('Mock with vitest', () => {
    let mockRepository: INodeRepository;

    beforeEach(() => {
      mockRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByTree: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should allow mocking specific scenarios', async () => {
      const treeId = treeIdFactory.build();
      const node = createTestNode(treeId);

      vi.mocked(mockRepository.save).mockImplementation(async (n) => {
        if (n === node) return Promise.resolve(ok(undefined));
        return Promise.resolve(err(new RepositoryError('Unknown node')));
      });
      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        if (id.equals(node.getId())) return Promise.resolve(node);
        return Promise.resolve(null);
      });
      vi.mocked(mockRepository.findByTree).mockImplementation(async (id) => {
        if (id.equals(treeId)) return Promise.resolve([node]);
        return Promise.resolve([]);
      });
      vi.mocked(mockRepository.delete).mockImplementation(async (id) => {
        if (id.equals(node.getId()))
          return Promise.resolve(err(new RepositoryError('Has children')));
        return Promise.resolve(ok(undefined));
      });

      const saveResult = await mockRepository.save(node);
      expect(saveResult.isOk()).toBe(true);

      const found = await mockRepository.findById(node.getId());
      expect(found).toBe(node);

      const byTree = await mockRepository.findByTree(treeId);
      expect(byTree).toEqual([node]);

      const deleteResult = await mockRepository.delete(node.getId());
      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error.message).toBe('Has children');
      }
    });

    it('should mock complex tree scenarios', async () => {
      const treeId = treeIdFactory.build();
      const nodes = Array.from({ length: 5 }, () => createTestNode(treeId));

      vi.mocked(mockRepository.findByTree).mockImplementation(async (id) => {
        if (id.equals(treeId)) return Promise.resolve(nodes);
        return Promise.resolve([]);
      });

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        return Promise.resolve(nodes.find((node) => node.getId().equals(id)) ?? null);
      });

      const byTree = await mockRepository.findByTree(treeId);
      expect(byTree.length).toBe(5);

      for (const node of nodes) {
        const found = await mockRepository.findById(node.getId());
        expect(found).toBe(node);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle nodes with maximum depth', async () => {
      const treeId = treeIdFactory.build();
      const maxDepth = 10;

      let currentParent: Node | null = null;
      const nodes: Node[] = [];

      // Create a deep chain
      for (let i = 0; i < maxDepth; i++) {
        const node: Node = currentParent
          ? createTestNode(treeId, currentParent.getId(), 0)
          : createTestNode(treeId);

        await repository.save(node);
        nodes.push(node);
        currentParent = node;
      }

      const allNodes = await repository.findByTree(treeId);
      expect(allNodes.length).toBe(maxDepth);
    });

    it('should handle nodes with many siblings', async () => {
      const treeId = treeIdFactory.build();
      const root = createTestNode(treeId);
      await repository.save(root);

      const siblingCount = 20;
      const siblings = Array.from({ length: siblingCount }, (_, i) =>
        createTestNode(treeId, root.getId(), i),
      );

      for (const sibling of siblings) {
        const result = await repository.save(sibling);
        expect(result.isOk()).toBe(true);
      }

      const allNodes = await repository.findByTree(treeId);
      expect(allNodes.length).toBe(siblingCount + 1); // siblings + root
    });

    it('should maintain consistency under concurrent-like operations', async () => {
      const treeId = treeIdFactory.build();
      const nodes = Array.from({ length: 20 }, () => createTestNode(treeId));

      // Simulate interleaved saves and deletes
      for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i];
        if (!currentNode) continue;
        await repository.save(currentNode);

        if (i > 0 && i % 3 === 0) {
          // Delete some previous nodes (only if they have no children)
          const toDelete = nodes[i - 1];
          if (!toDelete) continue;
          const hasChildren = (await repository.findByTree(treeId)).some((n) =>
            n.getParentNodeId()?.equals(toDelete.getId()),
          );

          if (!hasChildren) {
            await repository.delete(toDelete.getId());
          }
        }
      }

      const remaining = await repository.findByTree(treeId);
      expect(remaining.length).toBeGreaterThan(0);
      expect(remaining.length).toBeLessThan(nodes.length);
    });

    it('should handle multiple trees with shared atomic arguments', async () => {
      const tree1 = treeIdFactory.build();
      const tree2 = treeIdFactory.build();

      // Create shared atomic argument
      const sharedArgument = createTestArgument();

      // Create nodes in different trees using same argument
      const node1Result = Node.createRoot(sharedArgument.getId());
      const node2Result = Node.createRoot(sharedArgument.getId());

      if (node1Result.isOk() && node2Result.isOk()) {
        // Associate nodes with their respective trees
        (repository as any).setNodeTree(node1Result.value, tree1);
        (repository as any).setNodeTree(node2Result.value, tree2);

        await repository.save(node1Result.value);
        await repository.save(node2Result.value);

        const tree1Nodes = await repository.findByTree(tree1);
        const tree2Nodes = await repository.findByTree(tree2);

        expect(tree1Nodes.length).toBe(1);
        expect(tree2Nodes.length).toBe(1);

        // Same argument ID but different nodes
        const tree1Node = tree1Nodes[0];
        const tree2Node = tree2Nodes[0];
        if (tree1Node && tree2Node) {
          expect(tree1Node.getArgumentId().equals(tree2Node.getArgumentId())).toBe(true);
          expect(tree1Node.getId().equals(tree2Node.getId())).toBe(false);
        }
      }
    });
  });
});
