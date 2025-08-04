import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree';
import { ValidationError } from '../../shared/result';
import { nodeIdFactory } from '../factories/index.js';

describe('Tree Content Management', () => {
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

  describe('Title Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-title');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should set title', () => {
      const title = 'My Tree Title';
      const result = tree.setTitle(title);
      expect(result.isOk()).toBe(true);
      expect(tree.getTitle()).toBe(title);
      expect(tree.hasTitle()).toBe(true);
    });

    it('should update title', () => {
      const initialTitle = 'Initial Title';
      const updatedTitle = 'Updated Title';

      const setResult = tree.setTitle(initialTitle);
      expect(setResult.isOk()).toBe(true);
      expect(tree.getTitle()).toBe(initialTitle);

      const updateResult = tree.setTitle(updatedTitle);
      expect(updateResult.isOk()).toBe(true);
      expect(tree.getTitle()).toBe(updatedTitle);
    });

    it('should clear title', () => {
      const title = 'Title to Clear';
      const setResult = tree.setTitle(title);
      expect(setResult.isOk()).toBe(true);
      expect(tree.hasTitle()).toBe(true);

      const clearResult = tree.setTitle(undefined);
      expect(clearResult.isOk()).toBe(true);
      expect(tree.getTitle()).toBeUndefined();
      expect(tree.hasTitle()).toBe(false);
    });

    it('should update modified time when setting title', () => {
      const originalModifiedAt = tree.getModifiedAt();
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

      const result = tree.setTitle('New Title');
      expect(result.isOk()).toBe(true);
      expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      expect(tree.getModifiedAt()).not.toBe(originalModifiedAt);
    });

    it('should update modified time when clearing title', () => {
      const setResult = tree.setTitle('Title to Clear');
      expect(setResult.isOk()).toBe(true);

      const originalModifiedAt = tree.getModifiedAt();
      mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);

      const clearResult = tree.setTitle(undefined);
      expect(clearResult.isOk()).toBe(true);
      expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);
      expect(tree.getModifiedAt()).not.toBe(originalModifiedAt);
    });

    it('should reject empty string as invalid title', () => {
      const setResult = tree.setTitle('Some Title');
      expect(setResult.isOk()).toBe(true);
      expect(tree.hasTitle()).toBe(true);

      const clearResult = tree.setTitle('');
      expect(clearResult.isErr()).toBe(true);
      if (clearResult.isErr()) {
        expect(clearResult.error).toBeInstanceOf(ValidationError);
        expect(clearResult.error.message).toContain('Title cannot be empty');
      }
      // Title should remain unchanged
      expect(tree.getTitle()).toBe('Some Title');
      expect(tree.hasTitle()).toBe(true);
    });

    it('should reject whitespace-only string as invalid title', () => {
      const setResult = tree.setTitle('Some Title');
      expect(setResult.isOk()).toBe(true);
      expect(tree.hasTitle()).toBe(true);

      const clearResult = tree.setTitle('   ');
      expect(clearResult.isErr()).toBe(true);
      if (clearResult.isErr()) {
        expect(clearResult.error).toBeInstanceOf(ValidationError);
        expect(clearResult.error.message).toContain('Title cannot be empty');
      }
      // Title should remain unchanged
      expect(tree.getTitle()).toBe('Some Title');
      expect(tree.hasTitle()).toBe(true);
    });
  });

  describe('Node Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-nodes');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('addNode', () => {
      it('should add node to empty tree', () => {
        const nodeId = nodeIdFactory.build();
        const result = tree.addNode(nodeId);

        expect(result.isOk()).toBe(true);
        expect(tree.getNodeIds()).toContain(nodeId);
        expect(tree.getNodeCount()).toBe(1);
        expect(tree.isEmpty()).toBe(false);
      });

      it('should add multiple nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const result1 = tree.addNode(nodeId1);
        const result2 = tree.addNode(nodeId2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);
        expect(tree.getNodeIds()).toContain(nodeId1);
        expect(tree.getNodeIds()).toContain(nodeId2);
        expect(tree.getNodeCount()).toBe(2);
      });

      it('should fail to add duplicate node', () => {
        const nodeId = nodeIdFactory.build();
        const result1 = tree.addNode(nodeId);
        const result2 = tree.addNode(nodeId);

        expect(result1.isOk()).toBe(true);
        expect(result2.isErr()).toBe(true);
        if (result2.isErr()) {
          expect(result2.error).toBeInstanceOf(ValidationError);
          expect(result2.error.message).toBe('Node already exists in tree');
        }
        expect(tree.getNodeCount()).toBe(1);
      });

      it('should update modified time when adding node', () => {
        const nodeId = nodeIdFactory.build();
        const originalModifiedAt = tree.getModifiedAt();
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

        const result = tree.addNode(nodeId);
        expect(result.isOk()).toBe(true);
        expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        expect(tree.getModifiedAt()).not.toBe(originalModifiedAt);
      });
    });

    describe('removeNode', () => {
      it('should remove existing node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const removeResult = tree.removeNode(nodeId);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.getNodeIds()).not.toContain(nodeId);
        expect(tree.getNodeCount()).toBe(0);
        expect(tree.isEmpty()).toBe(true);
      });

      it('should fail to remove non-existent node', () => {
        const nodeId = nodeIdFactory.build();
        const result = tree.removeNode(nodeId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Node not found in tree');
        }
      });

      it('should remove one of multiple nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const removeResult = tree.removeNode(nodeId2);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.getNodeIds()).toContain(nodeId1);
        expect(tree.getNodeIds()).not.toContain(nodeId2);
        expect(tree.getNodeIds()).toContain(nodeId3);
        expect(tree.getNodeCount()).toBe(2);
      });

      it('should update modified time when removing node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const originalModifiedAt = tree.getModifiedAt();
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);

        const removeResult = tree.removeNode(nodeId);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);
        expect(tree.getModifiedAt()).not.toBe(originalModifiedAt);
      });
    });

    describe('hasNode', () => {
      it('should return true for existing node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        expect(tree.hasNode(nodeId)).toBe(true);
      });

      it('should return false for non-existent node', () => {
        const nodeId = nodeIdFactory.build();
        expect(tree.hasNode(nodeId)).toBe(false);
      });

      it('should return false after node removal', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);
        expect(tree.hasNode(nodeId)).toBe(true);

        const removeResult = tree.removeNode(nodeId);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.hasNode(nodeId)).toBe(false);
      });
    });

    describe('getNodeIds', () => {
      it('should return empty array for empty tree', () => {
        expect(tree.getNodeIds()).toEqual([]);
      });

      it('should return all node IDs', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const nodeIds = tree.getNodeIds();
        expect(nodeIds).toContain(nodeId1);
        expect(nodeIds).toContain(nodeId2);
        expect(nodeIds).toContain(nodeId3);
        expect(nodeIds).toHaveLength(3);
      });

      it('should return a new array instance each time', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const nodeIds1 = tree.getNodeIds();
        const nodeIds2 = tree.getNodeIds();

        // Each call should return a new array instance
        expect(nodeIds1).not.toBe(nodeIds2);
        expect(nodeIds1).toEqual(nodeIds2);

        // Modifying the returned array should not affect the tree
        const originalLength = nodeIds1.length;
        (nodeIds1 as any).push(nodeIdFactory.build());

        // Tree should be unchanged
        expect(tree.getNodeIds()).toHaveLength(originalLength);
      });
    });

    describe('getNodeCount', () => {
      it('should return 0 for empty tree', () => {
        expect(tree.getNodeCount()).toBe(0);
      });

      it('should return correct count after adding nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        expect(tree.getNodeCount()).toBe(0);

        const addResult1 = tree.addNode(nodeId1);
        expect(addResult1.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(1);

        const addResult2 = tree.addNode(nodeId2);
        expect(addResult2.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(2);
      });

      it('should return correct count after removing nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(2);

        const removeResult = tree.removeNode(nodeId1);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(1);
      });
    });

    describe('isEmpty', () => {
      it('should return true for empty tree', () => {
        expect(tree.isEmpty()).toBe(true);
      });

      it('should return false after adding node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);
        expect(tree.isEmpty()).toBe(false);
      });

      it('should return true after removing all nodes', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);
        expect(tree.isEmpty()).toBe(false);

        const removeResult = tree.removeNode(nodeId);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.isEmpty()).toBe(true);
      });
    });
  });

  describe('Node consistency invariants', () => {
    it('should maintain consistent node count after multiple operations', () => {
      const result = Tree.create('doc-node-invariant');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        // Add nodes
        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(3);

        // Remove one node
        const removeResult = tree.removeNode(nodeId2);
        expect(removeResult.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(2);

        // Add another node
        const nodeId4 = nodeIdFactory.build();
        const addResult4 = tree.addNode(nodeId4);
        expect(addResult4.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(3);

        // Verify final state
        expect(tree.hasNode(nodeId1)).toBe(true);
        expect(tree.hasNode(nodeId2)).toBe(false);
        expect(tree.hasNode(nodeId3)).toBe(true);
        expect(tree.hasNode(nodeId4)).toBe(true);
        expect(tree.getNodeIds()).toHaveLength(3);
      }
    });

    it('should maintain node uniqueness across operations', () => {
      const result = Tree.create('doc-node-uniqueness');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeId = nodeIdFactory.build();

        // Add node
        const addResult1 = tree.addNode(nodeId);
        expect(addResult1.isOk()).toBe(true);

        // Try to add same node again
        const addResult2 = tree.addNode(nodeId);
        expect(addResult2.isErr()).toBe(true);

        // Remove node
        const removeResult = tree.removeNode(nodeId);
        expect(removeResult.isOk()).toBe(true);

        // Add same node again (should work now)
        const addResult3 = tree.addNode(nodeId);
        expect(addResult3.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(1);
      }
    });
  });
});
