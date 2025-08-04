import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree';
import { nodeIdFactory } from '../factories/index.js';

/**
 * Tree Entity Integration Tests
 *
 * This file contains integration tests that verify the Tree entity's overall behavior
 * and cross-cutting concerns. More focused tests are organized in separate files:
 *
 * - tree-lifecycle.test.ts: Creation, reconstruction, basic validation
 * - tree-spatial-behavior.test.ts: Position management, bounds, spatial operations
 * - tree-content-management.test.ts: Title management, node management
 * - tree-structural-integrity.test.ts: Structural validation, connection analysis
 * - tree-argument-analysis.test.ts: Argument structure analysis, complex reasoning
 * - tree-performance.test.ts: Performance testing and edge cases
 */
describe('Tree Entity - Integration Tests', () => {
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

  describe('Flow Support', () => {
    it('should support fluent API pattern for common operations', () => {
      const result = Tree.create('doc-fluent');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;

        // Test fluent operations
        const titleResult = tree.setTitle('Fluent Tree');
        expect(titleResult.isOk()).toBe(true);

        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        // Verify final state
        expect(tree.getTitle()).toBe('Fluent Tree');
        expect(tree.hasNode(nodeId)).toBe(true);
        expect(tree.getNodeCount()).toBe(1);
        expect(tree.isEmpty()).toBe(false);
      }
    });

    it('should maintain consistent state across mixed operations', () => {
      const result = Tree.create('doc-mixed-ops');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const initialModifiedAt = tree.getModifiedAt();

        // Mixed operations
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const titleResult = tree.setTitle('Mixed Operations Tree');
        expect(titleResult.isOk()).toBe(true);

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
        const nodeId1 = nodeIdFactory.build();
        const addResult1 = tree.addNode(nodeId1);
        expect(addResult1.isOk()).toBe(true);

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
        const nodeId2 = nodeIdFactory.build();
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult2.isOk()).toBe(true);

        // Verify state consistency
        expect(tree.getModifiedAt()).toBeGreaterThan(initialModifiedAt);
        expect(tree.getNodeCount()).toBe(2);
        expect(tree.hasNode(nodeId1)).toBe(true);
        expect(tree.hasNode(nodeId2)).toBe(true);
        expect(tree.getTitle()).toBe('Mixed Operations Tree');
        const validationResult = tree.validateStructuralIntegrity();
        expect(validationResult.isOk()).toBe(true);
      }
    });

    it('should handle complex operation sequences gracefully', () => {
      const result = Tree.create('doc-complex-sequence');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;

        // Complex sequence: add nodes, set relationships, modify title, remove node
        const nodeIds = Array.from({ length: 5 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Set some parent relationships
        const node0 = nodeIds[0];
        const node1 = nodeIds[1];
        const node2 = nodeIds[2];
        const node3 = nodeIds[3];
        if (!node0 || !node1 || !node2 || !node3) {
          throw new Error('Test setup failed: not enough nodes');
        }
        const setParent1Result = tree.setNodeParent(node1, node0);
        const setParent2Result = tree.setNodeParent(node2, node0);
        const setParent3Result = tree.setNodeParent(node3, node1);
        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);
        expect(setParent3Result.isOk()).toBe(true);

        // Modify title
        const titleResult = tree.setTitle('Complex Tree Structure');
        expect(titleResult.isOk()).toBe(true);

        // Remove a leaf node
        const node4 = nodeIds[4];
        if (!node4) {
          throw new Error('Test setup failed: node4 not found');
        }
        const removeResult = tree.removeNode(node4);
        expect(removeResult.isOk()).toBe(true);

        // Verify final consistent state
        expect(tree.getNodeCount()).toBe(4);
        expect(tree.hasNode(node4)).toBe(false);
        expect(tree.getTitle()).toBe('Complex Tree Structure');
        const validationResult = tree.validateStructuralIntegrity();
        expect(validationResult.isOk()).toBe(true);

        // Verify parent relationships are intact
        const child1 = tree.getNode(node1);
        const child2 = tree.getNode(node2);
        const child3 = tree.getNode(node3);
        expect(child1?.getParentId()).toBe(nodeIds[0]);
        expect(child2?.getParentId()).toBe(nodeIds[0]);
        expect(child3?.getParentId()).toBe(nodeIds[1]);
      }
    });
  });

  describe('Equality and Comparison', () => {
    it('should implement equality based on ID', () => {
      const result1 = Tree.create('doc-equality-1');
      const result2 = Tree.create('doc-equality-2');
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const tree1 = result1.value;
        const tree2 = result2.value;

        expect(tree1.isEqualTo(tree1)).toBe(true);
        expect(tree1.isEqualTo(tree2)).toBe(false);
        expect(tree2.isEqualTo(tree1)).toBe(false);
      }
    });

    it('should compare by ID for different trees with same content', () => {
      const result1 = Tree.create('same-doc');
      const result2 = Tree.create('same-doc');
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const tree1 = result1.value;
        const tree2 = result2.value;

        // Same content but different IDs
        const titleResult1 = tree1.setTitle('Same Title');
        const titleResult2 = tree2.setTitle('Same Title');
        expect(titleResult1.isOk()).toBe(true);
        expect(titleResult2.isOk()).toBe(true);

        expect(tree1.isEqualTo(tree2)).toBe(false);
        expect(tree1.getId()).not.toBe(tree2.getId());
        expect(tree1.getDocumentId()).toBe(tree2.getDocumentId());
        expect(tree1.getTitle()).toBe(tree2.getTitle());
      }
    });
  });

  describe('String Representation', () => {
    it('should provide meaningful toString representation', () => {
      const result = Tree.create('doc-string-repr');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const titleResult = tree.setTitle('String Representation Tree');
        expect(titleResult.isOk()).toBe(true);

        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const stringRepr = tree.toString();
        expect(stringRepr).toContain('Tree');
        expect(stringRepr).toContain('String Representation Tree');
        expect(stringRepr).toContain('1 node');
      }
    });

    it('should handle toString for empty tree', () => {
      const result = Tree.create('doc-empty-string');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const stringRepr = tree.toString();
        expect(stringRepr).toContain('Tree');
        expect(stringRepr).toContain('0 nodes');
      }
    });

    it('should handle toString with multiple nodes', () => {
      const result = Tree.create('doc-multi-string');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeIds = Array.from({ length: 3 }, () => nodeIdFactory.build());

        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        const stringRepr = tree.toString();
        expect(stringRepr).toContain('Tree');
        expect(stringRepr).toContain('3 nodes');
      }
    });
  });

  describe('Business Invariants and Advanced Edge Cases', () => {
    describe('modification time consistency', () => {
      it('should update modification time for all mutating operations', () => {
        const result = Tree.create('doc-mod-time');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const tree = result.value;
          const initialModifiedAt = tree.getModifiedAt();

          // Test each mutating operation updates modification time
          const operations = [
            () => {
              mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
              return tree.setTitle('New Title');
            },
            () => {
              mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
              return tree.addNode(nodeIdFactory.build());
            },
            () => {
              mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
              return tree.setTitle(undefined);
            },
          ];

          let lastModifiedAt = initialModifiedAt;
          operations.forEach((operation) => {
            const result = operation();
            expect(result.isOk()).toBe(true);
            expect(tree.getModifiedAt()).toBeGreaterThan(lastModifiedAt);
            lastModifiedAt = tree.getModifiedAt();
          });
        }
      });

      it('should not update modification time for read operations', () => {
        const result = Tree.create('doc-read-ops');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const tree = result.value;
          const nodeId = nodeIdFactory.build();
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);

          const modifiedAt = tree.getModifiedAt();

          // Read operations should not change modification time
          tree.getTitle();
          tree.hasTitle();
          tree.getNodeIds();
          tree.getNodeCount();
          tree.hasNode(nodeId);
          tree.isEmpty();
          const validationResult = tree.validateStructuralIntegrity();
          expect(validationResult.isOk()).toBe(true);
          tree.getPosition();
          tree.getPhysicalProperties();
          tree.getBounds();
          tree.toString();

          expect(tree.getModifiedAt()).toBe(modifiedAt);
        }
      });

      it('should maintain creation time immutability', () => {
        const result = Tree.create('doc-creation-time');
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const tree = result.value;
          const createdAt = tree.getCreatedAt();

          // Perform various operations
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 5000);
          const titleResult = tree.setTitle('Changed Title');
          const nodeResult = tree.addNode(nodeIdFactory.build());
          expect(titleResult.isOk()).toBe(true);
          expect(nodeResult.isOk()).toBe(true);

          // Creation time should remain unchanged
          expect(tree.getCreatedAt()).toBe(createdAt);
          expect(tree.getModifiedAt()).toBeGreaterThan(createdAt);
        }
      });
    });
  });
});
