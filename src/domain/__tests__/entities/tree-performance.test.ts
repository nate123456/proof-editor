import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree';
import { NodeId } from '../../shared/value-objects';
import { TreePosition } from '../../value-objects/TreePosition';
import { nodeIdFactory } from '../factories/index.js';

describe('Tree Performance and Edge Cases', () => {
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

  describe('Edge Cases and Error Handling', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-edge-cases');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('validateStructuralIntegrity', () => {
      it('should handle very large trees efficiently', () => {
        const nodeIds = Array.from({ length: 1000 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create a chain structure
        for (let i = 1; i < nodeIds.length; i++) {
          const childId = nodeIds[i];
          const parentId = nodeIds[i - 1];
          if (childId && parentId) {
            const setParentResult = tree.setNodeParent(childId, parentId);
            expect(setParentResult.isOk()).toBe(true);
          }
        }

        const startTime = performance.now();
        const isValid = tree.validateStructuralIntegrity();
        const endTime = performance.now();

        expect(isValid.isOk()).toBe(true);
        expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      });

      it('should handle complex parent-child relationships', () => {
        const nodeIds = Array.from({ length: 10 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create complex structure with multiple children per parent
        const node0 = nodeIds[0];
        const node1 = nodeIds[1];
        const node2 = nodeIds[2];
        const node3 = nodeIds[3];
        const node4 = nodeIds[4];
        const node5 = nodeIds[5];
        const node6 = nodeIds[6];
        const node7 = nodeIds[7];
        const node8 = nodeIds[8];
        const node9 = nodeIds[9];

        if (
          node0 &&
          node1 &&
          node2 &&
          node3 &&
          node4 &&
          node5 &&
          node6 &&
          node7 &&
          node8 &&
          node9
        ) {
          const setParent1Result = tree.setNodeParent(node1, node0);
          const setParent2Result = tree.setNodeParent(node2, node0);
          const setParent3Result = tree.setNodeParent(node3, node0);
          const setParent4Result = tree.setNodeParent(node4, node1);
          const setParent5Result = tree.setNodeParent(node5, node1);
          const setParent6Result = tree.setNodeParent(node6, node2);
          const setParent7Result = tree.setNodeParent(node7, node3);
          const setParent8Result = tree.setNodeParent(node8, node4);
          const setParent9Result = tree.setNodeParent(node9, node5);

          expect(setParent1Result.isOk()).toBe(true);
          expect(setParent2Result.isOk()).toBe(true);
          expect(setParent3Result.isOk()).toBe(true);
          expect(setParent4Result.isOk()).toBe(true);
          expect(setParent5Result.isOk()).toBe(true);
          expect(setParent6Result.isOk()).toBe(true);
          expect(setParent7Result.isOk()).toBe(true);
          expect(setParent8Result.isOk()).toBe(true);
          expect(setParent9Result.isOk()).toBe(true);
        }

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });

      it('should handle nodes with same parent at different positions', () => {
        const parentId = nodeIdFactory.build();
        const childIds = Array.from({ length: 5 }, () => nodeIdFactory.build());

        const addParentResult = tree.addNode(parentId);
        expect(addParentResult.isOk()).toBe(true);

        // Add children at different positions
        childIds.forEach((childId, index) => {
          const addChildResult = tree.addNode(childId);
          expect(addChildResult.isOk()).toBe(true);

          const setParentResult = tree.setNodeParent(childId, parentId);
          expect(setParentResult.isOk()).toBe(true);
        });

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });
    });

    describe('node and parent management', () => {
      it('should handle node operations efficiently', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        // Verify node was added
        expect(tree.hasNode(nodeId)).toBe(true);
        expect(tree.getNodeCount()).toBe(1);

        // Add more nodes to test performance
        const nodeIds = Array.from({ length: 100 }, () => nodeIdFactory.build());
        nodeIds.forEach((id) => {
          const result = tree.addNode(id);
          expect(result.isOk()).toBe(true);
        });

        expect(tree.getNodeCount()).toBe(101);
      });

      it('should handle multiple nodes with parent relationships', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        // Set up parent relationships
        const setParentResult1 = tree.setNodeParent(nodeId2, nodeId1);
        const setParentResult2 = tree.setNodeParent(nodeId3, nodeId2);
        expect(setParentResult1.isOk()).toBe(true);
        expect(setParentResult2.isOk()).toBe(true);

        // Verify relationships
        expect(tree.getNode(nodeId2)?.getParentId()).toEqual(nodeId1);
        expect(tree.getNode(nodeId3)?.getParentId()).toEqual(nodeId2);
      });

      it('should prevent cycle creation', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        tree.addNode(nodeId1);
        tree.addNode(nodeId2);
        tree.addNode(nodeId3);

        // Create chain: 1 -> 2 -> 3
        tree.setNodeParent(nodeId2, nodeId1);
        tree.setNodeParent(nodeId3, nodeId2);

        // Try to create cycle: 1 -> 3 (would make cycle)
        const cycleResult = tree.setNodeParent(nodeId1, nodeId3);
        expect(cycleResult.isErr()).toBe(true);
        if (cycleResult.isErr()) {
          expect(cycleResult.error.message).toContain('cycle');
        }
      });

      it('should handle large tree structures', () => {
        const nodeIds = Array.from({ length: 10 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create a tree structure
        for (let i = 1; i < nodeIds.length; i++) {
          const parentIndex = Math.floor((i - 1) / 2);
          const childId = nodeIds[i];
          const parentId = nodeIds[parentIndex];
          if (childId && parentId) {
            const setParentResult = tree.setNodeParent(childId, parentId);
            expect(setParentResult.isOk()).toBe(true);
          }
        }

        expect(tree.getNodeCount()).toBe(10);
        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });
    });
  });

  describe('Property-Based Testing', () => {
    describe('node management consistency', () => {
      it('should maintain consistent node count across operations', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.string().filter((s) => s.length > 0),
              { minLength: 1, maxLength: 20 },
            ),
            fc.array(fc.nat(), { maxLength: 10 }),
            (nodeIdStrings, removalIndices) => {
              const result = Tree.create('doc-property-test');
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const tree = result.value;
                const nodeIds = nodeIdStrings
                  .map((s) => NodeId.create(s))
                  .filter((r) => r.isOk())
                  .map((r) => r.value);

                // Add all nodes
                nodeIds.forEach((nodeId) => {
                  const addResult = tree.addNode(nodeId);
                  expect(addResult.isOk()).toBe(true);
                });

                const initialCount = tree.getNodeCount();
                expect(initialCount).toBe(nodeIds.length);

                // Remove some nodes
                const validIndices = removalIndices.filter((i) => i < nodeIds.length);
                const nodesToRemove = validIndices
                  .map((i) => nodeIds[i])
                  .filter((id): id is NodeId => id !== undefined);
                const uniqueNodesToRemove = [...new Set(nodesToRemove)];

                uniqueNodesToRemove.forEach((nodeId) => {
                  const removeResult = tree.removeNode(nodeId);
                  expect(removeResult.isOk()).toBe(true);
                });

                const finalCount = tree.getNodeCount();
                expect(finalCount).toBe(initialCount - uniqueNodesToRemove.length);

                // Verify isEmpty consistency
                if (finalCount === 0) {
                  expect(tree.isEmpty()).toBe(true);
                } else {
                  expect(tree.isEmpty()).toBe(false);
                }
              }
            },
          ),
        );
      });

      it('should maintain position consistency across moves', () => {
        fc.assert(
          fc.property(
            fc.array(fc.tuple(fc.nat(1000), fc.nat(1000)), { minLength: 1, maxLength: 10 }),
            (positions) => {
              const result = Tree.create('doc-position-test');
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const tree = result.value;

                for (const [x, y] of positions) {
                  const treePositionResult = TreePosition.create(x, y);
                  expect(treePositionResult.isOk()).toBe(true);

                  if (treePositionResult.isOk()) {
                    const moveResult = tree.moveTo(treePositionResult.value);
                    expect(moveResult.isOk()).toBe(true);
                    expect(tree.getPosition()).toEqual(treePositionResult.value);
                    expect(
                      tree.isAtPosition(
                        treePositionResult.value.getX(),
                        treePositionResult.value.getY(),
                      ),
                    ).toBe(true);
                  }
                }
              }
            },
          ),
        );
      });

      it('should maintain title consistency across operations', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
              {
                minLength: 1,
                maxLength: 10,
              },
            ),
            (titles) => {
              const result = Tree.create('doc-title-test');
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const tree = result.value;

                for (const title of titles) {
                  const setResult = tree.setTitle(title);
                  expect(setResult.isOk()).toBe(true);

                  // Tree.setTitle trims whitespace, so we check the trimmed result
                  const expectedTitle = title.trim();
                  expect(tree.getTitle()).toBe(expectedTitle);

                  // hasTitle() should return true only if there's actual content after trimming
                  if (expectedTitle.length > 0) {
                    expect(tree.hasTitle()).toBe(true);
                  } else {
                    expect(tree.hasTitle()).toBe(false);
                  }
                }
              }
            },
          ),
        );
      });

      it('should handle parent-child relationships consistently', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc
                .string({ minLength: 1, maxLength: 20 })
                .filter((s) => s.length > 0 && /^[a-zA-Z0-9_-]+$/.test(s)),
              { minLength: 2, maxLength: 6 },
            ),
            fc.array(fc.tuple(fc.nat(), fc.nat(), fc.nat()), { maxLength: 3 }),
            (nodeIdStrings, parentChildRelations) => {
              const result = Tree.create('doc-parent-child-test');
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const tree = result.value;
                const nodeIds = nodeIdStrings
                  .map((s) => NodeId.create(s))
                  .filter((r) => r.isOk())
                  .map((r) => r.value);

                // Skip if we don't have enough valid node IDs
                if (nodeIds.length < 2) return;

                // Add all nodes
                nodeIds.forEach((nodeId) => {
                  const addResult = tree.addNode(nodeId);
                  expect(addResult.isOk()).toBe(true);
                });

                // Set parent-child relationships with proper bounds checking
                for (const [childIndex, parentIndex, position] of parentChildRelations) {
                  if (
                    childIndex < nodeIds.length &&
                    parentIndex < nodeIds.length &&
                    childIndex !== parentIndex
                  ) {
                    const childId = nodeIds[childIndex];
                    const parentId = nodeIds[parentIndex];
                    if (childId && parentId) {
                      if (!tree.wouldCreateCycle(childId, parentId)) {
                        const setParentResult = tree.setNodeParent(childId, parentId);
                        expect(setParentResult.isOk()).toBe(true);

                        const childNode = tree.getNode(childId);
                        expect(childNode?.getParentId()).toBe(parentId);
                      }
                    }
                  }
                }

                const validateResult = tree.validateStructuralIntegrity();
                expect(validateResult.isOk()).toBe(true);
              }
            },
          ),
        );
      });
    });
  });

  describe('Performance benchmarks', () => {
    it('should handle large scale operations efficiently', () => {
      const result = Tree.create('doc-performance');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeCount = 10000;
        const nodeIds = Array.from({ length: nodeCount }, () => nodeIdFactory.build());

        // Benchmark node addition
        const addStartTime = performance.now();
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });
        const addEndTime = performance.now();

        expect(addEndTime - addStartTime).toBeLessThan(1000); // Should complete in under 1 second
        expect(tree.getNodeCount()).toBe(nodeCount);

        // Benchmark node lookup
        const lookupStartTime = performance.now();
        nodeIds.forEach((nodeId) => {
          expect(tree.hasNode(nodeId)).toBe(true);
        });
        const lookupEndTime = performance.now();

        expect(lookupEndTime - lookupStartTime).toBeLessThan(100); // Should complete in under 100ms

        // Benchmark structural integrity validation
        const validateStartTime = performance.now();
        const validateResult = tree.validateStructuralIntegrity();
        const validateEndTime = performance.now();

        expect(validateResult.isOk()).toBe(true);
        expect(validateEndTime - validateStartTime).toBeLessThan(50); // Should complete in under 50ms
      }
    });

    it('should handle complex spatial operations efficiently', () => {
      const result = Tree.create('doc-spatial-performance');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const operationCount = 1000;
        const positions = Array.from({ length: operationCount }, () => {
          const x = Math.floor(Math.random() * 10000);
          const y = Math.floor(Math.random() * 10000);
          return TreePosition.create(x, y);
        })
          .filter((r) => r.isOk())
          .map((r) => r.value);

        // Benchmark position changes
        const moveStartTime = performance.now();
        positions.forEach((position) => {
          const moveResult = tree.moveTo(position);
          expect(moveResult.isOk()).toBe(true);
        });
        const moveEndTime = performance.now();

        expect(moveEndTime - moveStartTime).toBeLessThan(100); // Should complete in under 100ms

        // Benchmark bounds calculation
        const boundsStartTime = performance.now();
        for (let i = 0; i < operationCount; i++) {
          const bounds = tree.getBounds();
          expect(bounds).toBeDefined();
        }
        const boundsEndTime = performance.now();

        expect(boundsEndTime - boundsStartTime).toBeLessThan(50); // Should complete in under 50ms
      }
    });
  });

  describe('Memory efficiency', () => {
    it('should not leak memory during node operations', () => {
      const result = Tree.create('doc-memory-test');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const iterations = 1000;

        for (let i = 0; i < iterations; i++) {
          const nodeId = nodeIdFactory.build();

          // Add and remove node
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);

          const removeResult = tree.removeNode(nodeId);
          expect(removeResult.isOk()).toBe(true);
        }

        expect(tree.getNodeCount()).toBe(0);
        expect(tree.isEmpty()).toBe(true);
      }
    });

    it('should handle repeated title operations efficiently', () => {
      const result = Tree.create('doc-title-memory-test');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const iterations = 1000;

        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
          const title = `Title ${i}`;
          const setResult = tree.setTitle(title);
          expect(setResult.isOk()).toBe(true);

          if (i % 2 === 0) {
            const clearResult = tree.setTitle(undefined);
            expect(clearResult.isOk()).toBe(true);
          }
        }
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      }
    });
  });
});
