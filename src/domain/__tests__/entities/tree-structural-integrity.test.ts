import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree.js';
import { ValidationError } from '../../shared/result.js';
import { nodeIdFactory } from '../factories/index.js';

describe('Tree Structural Integrity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Structural Operations', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-structural');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('validateStructuralIntegrity', () => {
      it('should validate empty tree', () => {
        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });

      it('should validate tree with single node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });

      it('should validate tree with multiple nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });
    });
  });

  describe('Node Parent Relationship Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-parent-relations');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('getNode', () => {
      it('should return node data for existing node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const node = tree.getNode(nodeId);
        expect(node).toBeDefined();
        expect(node?.getParentId()).toBeNull();
      });

      it('should return null for non-existent node', () => {
        const nodeId = nodeIdFactory.build();
        const node = tree.getNode(nodeId);
        expect(node).toBeNull();
      });
    });

    describe('setNodeParent', () => {
      it('should set parent for existing node', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        const addParentResult = tree.addNode(parentId);
        expect(addChildResult.isOk()).toBe(true);
        expect(addParentResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId);
        expect(setParentResult.isOk()).toBe(true);

        const childNode = tree.getNode(childId);
        expect(childNode?.getParentId()).toEqual(parentId);
      });

      it('should update parent for node with existing parent', () => {
        const childId = nodeIdFactory.build();
        const parentId1 = nodeIdFactory.build();
        const parentId2 = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        const addParent1Result = tree.addNode(parentId1);
        const addParent2Result = tree.addNode(parentId2);
        expect(addChildResult.isOk()).toBe(true);
        expect(addParent1Result.isOk()).toBe(true);
        expect(addParent2Result.isOk()).toBe(true);

        const setParent1Result = tree.setNodeParent(childId, parentId1);
        expect(setParent1Result.isOk()).toBe(true);

        const setParent2Result = tree.setNodeParent(childId, parentId2);
        expect(setParent2Result.isOk()).toBe(true);

        const childNode = tree.getNode(childId);
        expect(childNode?.getParentId()).toEqual(parentId2);
      });

      it('should fail to set parent for non-existent child', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addParentResult = tree.addNode(parentId);
        expect(addParentResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Node not found in tree');
        }
      });

      it('should fail to set non-existent parent', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        expect(addChildResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Parent node not found in tree');
        }
      });

      it('should fail to set node as its own parent', () => {
        const nodeId = nodeIdFactory.build();

        const addNodeResult = tree.addNode(nodeId);
        expect(addNodeResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(nodeId, nodeId);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Setting parent would create cycle');
        }
      });

      it('should allow setting parent to null', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        const addParentResult = tree.addNode(parentId);
        expect(addChildResult.isOk()).toBe(true);
        expect(addParentResult.isOk()).toBe(true);

        // Set parent
        const setParentResult = tree.setNodeParent(childId, parentId);
        expect(setParentResult.isOk()).toBe(true);

        // Unset parent
        const unsetParentResult = tree.setNodeParent(childId, null);
        expect(unsetParentResult.isOk()).toBe(true);

        const childNode = tree.getNode(childId);
        expect(childNode?.getParentId()).toBeNull();
      });
    });

    describe('addNodeWithParent', () => {
      it('should add node with parent in one operation', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        const addParentResult = tree.addNode(parentId);
        expect(addParentResult.isOk()).toBe(true);

        const addChildResult = tree.addNodeWithParent(childId, parentId);
        expect(addChildResult.isOk()).toBe(true);

        expect(tree.hasNode(childId)).toBe(true);
        const childNode = tree.getNode(childId);
        expect(childNode?.getParentId()).toEqual(parentId);
      });

      it('should fail to add node with non-existent parent', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        const addChildResult = tree.addNodeWithParent(childId, parentId);
        expect(addChildResult.isErr()).toBe(true);
        if (addChildResult.isErr()) {
          expect(addChildResult.error).toBeInstanceOf(ValidationError);
          expect(addChildResult.error.message).toBe('Parent node not found in tree');
        }
      });

      it('should fail to add duplicate node', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        const addParentResult = tree.addNode(parentId);
        const addChildResult1 = tree.addNode(childId);
        expect(addParentResult.isOk()).toBe(true);
        expect(addChildResult1.isOk()).toBe(true);

        const addChildResult2 = tree.addNodeWithParent(childId, parentId);
        expect(addChildResult2.isErr()).toBe(true);
        if (addChildResult2.isErr()) {
          expect(addChildResult2.error).toBeInstanceOf(ValidationError);
          expect(addChildResult2.error.message).toBe('Node already exists in tree');
        }
      });
    });

    describe('canCreateCycle', () => {
      it('should detect direct cycle', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(nodeId2, nodeId1);
        expect(setParentResult.isOk()).toBe(true);

        expect(tree.canCreateCycle(nodeId1, nodeId2)).toBe(true);
      });

      it('should detect indirect cycle', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const setParent1Result = tree.setNodeParent(nodeId2, nodeId1);
        const setParent2Result = tree.setNodeParent(nodeId3, nodeId2);
        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);

        expect(tree.canCreateCycle(nodeId1, nodeId3)).toBe(true);
      });

      it('should not detect cycle for valid parent-child relationship', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(nodeId2, nodeId1);
        expect(setParentResult.isOk()).toBe(true);

        expect(tree.canCreateCycle(nodeId3, nodeId1)).toBe(false);
      });

      it('should return false for non-existent nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        expect(tree.canCreateCycle(nodeId1, nodeId2)).toBe(false);
      });
    });
  });

  describe('Complex cycle detection scenarios', () => {
    it('should detect complex multi-level cycles', () => {
      const result = Tree.create('doc-complex-cycle');
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const tree = result.value;
      const nodeIds = Array.from({ length: 5 }, () => nodeIdFactory.build());

      // Add all nodes
      nodeIds.forEach((nodeId) => {
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);
      });

      // Create a chain: node0 -> node1 -> node2 -> node3 -> node4
      if (nodeIds.length < 5) {
        throw new Error('Test setup failed: not enough nodes');
      }
      const [node0, node1, node2, node3, node4] = nodeIds;
      if (!node0 || !node1 || !node2 || !node3 || !node4) {
        throw new Error('Test setup failed: array destructuring returned undefined');
      }
      const setParent1Result = tree.setNodeParent(node1, node0);
      const setParent2Result = tree.setNodeParent(node2, node1);
      const setParent3Result = tree.setNodeParent(node3, node2);
      const setParent4Result = tree.setNodeParent(node4, node3);
      expect(setParent1Result.isOk()).toBe(true);
      expect(setParent2Result.isOk()).toBe(true);
      expect(setParent3Result.isOk()).toBe(true);
      expect(setParent4Result.isOk()).toBe(true);

      // Now check if creating node0 -> node4 would create a cycle (it should)
      expect(tree.canCreateCycle(node0, node4)).toBe(true);

      // Check if creating node0 -> node2 would create a cycle (it should)
      expect(tree.canCreateCycle(node0, node2)).toBe(true);

      // Check if creating node2 -> node0 would create a cycle (it should)
      expect(tree.canCreateCycle(node2, node0)).toBe(true);

      // Check a valid relationship that wouldn't create a cycle
      const newNodeId = nodeIdFactory.build();
      const addNewResult = tree.addNode(newNodeId);
      expect(addNewResult.isOk()).toBe(true);
      expect(tree.canCreateCycle(newNodeId, node0)).toBe(false);
    });

    it('should handle diamond-shaped dependency graphs', () => {
      const result = Tree.create('doc-diamond-cycle');
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const tree = result.value;
      const nodeIds = Array.from({ length: 4 }, () => nodeIdFactory.build());

      // Add all nodes
      nodeIds.forEach((nodeId) => {
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);
      });

      // Create diamond: node0 -> node1, node0 -> node2, node1 -> node3, node2 -> node3
      if (nodeIds.length < 4) {
        throw new Error('Test setup failed: not enough nodes for diamond');
      }
      const [diamond0, diamond1, diamond2, diamond3] = nodeIds;
      if (!diamond0 || !diamond1 || !diamond2 || !diamond3) {
        throw new Error('Test setup failed: array destructuring returned undefined');
      }
      const setParent1Result = tree.setNodeParent(diamond1, diamond0);
      const setParent2Result = tree.setNodeParent(diamond2, diamond0);
      const setParent3Result = tree.setNodeParent(diamond3, diamond1);
      // Can't set multiple parents in current implementation - node can only have one parent
      // So we'll update the parent instead
      const setParent4Result = tree.setNodeParent(diamond3, diamond2);
      expect(setParent1Result.isOk()).toBe(true);
      expect(setParent2Result.isOk()).toBe(true);
      expect(setParent3Result.isOk()).toBe(true);
      expect(setParent4Result.isOk()).toBe(true);

      // Check cycle detection
      expect(tree.canCreateCycle(diamond0, diamond3)).toBe(true);
      expect(tree.canCreateCycle(diamond1, diamond0)).toBe(true);
      expect(tree.canCreateCycle(diamond2, diamond0)).toBe(true);
      expect(tree.canCreateCycle(diamond3, diamond1)).toBe(true);
      expect(tree.canCreateCycle(diamond3, diamond2)).toBe(true);
    });
  });

  describe('wouldCreateCycle', () => {
    it('should be an alias for canCreateCycle', () => {
      const result = Tree.create('doc-would-create-cycle');
      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const tree = result.value;
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();

      const addResult1 = tree.addNode(nodeId1);
      const addResult2 = tree.addNode(nodeId2);
      expect(addResult1.isOk()).toBe(true);
      expect(addResult2.isOk()).toBe(true);

      const setParentResult = tree.setNodeParent(nodeId2, nodeId1);
      expect(setParentResult.isOk()).toBe(true);

      // Both methods should return the same result
      expect(tree.wouldCreateCycle(nodeId1, nodeId2)).toBe(true);
      expect(tree.canCreateCycle(nodeId1, nodeId2)).toBe(true);
    });
  });
});
