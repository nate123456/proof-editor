import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

import type { AtomicArgument } from '../../entities/AtomicArgument';
import { Tree } from '../../entities/Tree';
import { ProcessingError } from '../../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository';
import { type AtomicArgumentId, NodeId, Position2D } from '../../shared/value-objects';
import { atomicArgumentIdFactory, nodeIdFactory, orderedSetIdFactory } from '../factories';

describe('Tree Performance and Edge Cases', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  let mockAtomicArgumentRepository: MockProxy<IAtomicArgumentRepository>;
  let mockOrderedSetRepository: MockProxy<IOrderedSetRepository>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });

    mockAtomicArgumentRepository = mock<IAtomicArgumentRepository>();
    mockOrderedSetRepository = mock<IOrderedSetRepository>();
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
          const setParentResult = tree.setNodeParent(nodeIds[i], nodeIds[i - 1], 0);
          expect(setParentResult.isOk()).toBe(true);
        }

        const startTime = performance.now();
        const isValid = tree.validateStructuralIntegrity();
        const endTime = performance.now();

        expect(isValid).toBe(true);
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
        const setParent1Result = tree.setNodeParent(nodeIds[1], nodeIds[0], 0);
        const setParent2Result = tree.setNodeParent(nodeIds[2], nodeIds[0], 1);
        const setParent3Result = tree.setNodeParent(nodeIds[3], nodeIds[0], 2);
        const setParent4Result = tree.setNodeParent(nodeIds[4], nodeIds[1], 0);
        const setParent5Result = tree.setNodeParent(nodeIds[5], nodeIds[1], 1);
        const setParent6Result = tree.setNodeParent(nodeIds[6], nodeIds[2], 0);
        const setParent7Result = tree.setNodeParent(nodeIds[7], nodeIds[3], 0);
        const setParent8Result = tree.setNodeParent(nodeIds[8], nodeIds[4], 0);
        const setParent9Result = tree.setNodeParent(nodeIds[9], nodeIds[5], 0);

        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);
        expect(setParent3Result.isOk()).toBe(true);
        expect(setParent4Result.isOk()).toBe(true);
        expect(setParent5Result.isOk()).toBe(true);
        expect(setParent6Result.isOk()).toBe(true);
        expect(setParent7Result.isOk()).toBe(true);
        expect(setParent8Result.isOk()).toBe(true);
        expect(setParent9Result.isOk()).toBe(true);

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

          const setParentResult = tree.setNodeParent(childId, parentId, index);
          expect(setParentResult.isOk()).toBe(true);
        });

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });
    });

    describe('uncovered line coverage for complex async methods', () => {
      it('should handle findDirectConnections with missing arguments', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        // Mock repository to return null for missing arguments
        mockAtomicArgumentRepository.findById.mockResolvedValue(null);

        const result = await tree.findDirectConnections(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap).toBeDefined();
        }
      });

      it('should handle findArgumentTree with partial argument data', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        const mockArgument = mock<AtomicArgument>();
        mockArgument.getId.mockReturnValue(argumentId1);
        mockArgument.getPremiseSet.mockReturnValue(null);
        mockArgument.getConclusionSet.mockReturnValue(null);

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          if (id === argumentId1) return mockArgument;
          return null;
        });

        const result = await tree.findArgumentTree(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argumentStructure = result.value;
          expect(argumentStructure).toBeDefined();
        }
      });

      it('should handle findPathCompleteArgument with disconnected nodes', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        // Mock arguments with no connections
        const mockArgument1 = mock<AtomicArgument>();
        const mockArgument2 = mock<AtomicArgument>();
        mockArgument1.getId.mockReturnValue(argumentId1);
        mockArgument1.getPremiseSet.mockReturnValue(null);
        mockArgument1.getConclusionSet.mockReturnValue(null);
        mockArgument2.getId.mockReturnValue(argumentId2);
        mockArgument2.getPremiseSet.mockReturnValue(null);
        mockArgument2.getConclusionSet.mockReturnValue(null);

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          if (id === argumentId1) return mockArgument1;
          if (id === argumentId2) return mockArgument2;
          return null;
        });

        const result = await tree.findPathCompleteArgument(
          nodeId1,
          nodeId2,
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pathCompleteArgument = result.value;
          expect(pathCompleteArgument).toBeDefined();
        }
      });

      it('should handle discoverSharedReferences with complex argument structures', async () => {
        const nodeIds = Array.from({ length: 10 }, () => nodeIdFactory.build());
        const argumentIds = Array.from({ length: 10 }, () => atomicArgumentIdFactory.build());
        const orderedSetIds = Array.from({ length: 5 }, () => orderedSetIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Mock arguments with various shared ordered sets
        const mockArguments = argumentIds.map((id, index) => {
          const mockArg = mock<AtomicArgument>();
          mockArg.getId.mockReturnValue(id);
          // Create overlapping ordered set references
          const sharedOrderedSet = orderedSetIds[index % orderedSetIds.length];
          mockArg.getPremiseSet.mockReturnValue(sharedOrderedSet);
          mockArg.getConclusionSet.mockReturnValue(sharedOrderedSet);
          return mockArg;
        });

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          const found = mockArguments.find((arg) => arg.getId() === id);
          return found || null;
        });

        const result = await tree.discoverSharedReferences(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const sharedReferences = result.value;
          expect(sharedReferences).toBeDefined();
          expect(Array.isArray(sharedReferences)).toBe(true);
        }
      });

      it('should handle validateConnectionIntegrity with large trees', async () => {
        const nodeIds = Array.from({ length: 50 }, () => nodeIdFactory.build());
        const argumentIds = Array.from({ length: 50 }, () => atomicArgumentIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Mock arguments
        const mockArguments = argumentIds.map((id) => {
          const mockArg = mock<AtomicArgument>();
          mockArg.getId.mockReturnValue(id);
          mockArg.getPremiseSet.mockReturnValue(null);
          mockArg.getConclusionSet.mockReturnValue(null);
          return mockArg;
        });

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          const found = mockArguments.find((arg) => arg.getId() === id);
          return found || null;
        });

        const startTime = performance.now();
        const result = await tree.validateConnectionIntegrity(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );
        const endTime = performance.now();

        expect(result.isOk()).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      });
    });

    describe('Repository error handling', () => {
      it('should handle repository timeout errors', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Timeout'));

        const result = await tree.findDirectConnections(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Timeout');
        }
      });

      it('should handle repository connection errors', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        mockOrderedSetRepository.findById.mockRejectedValue(new Error('Connection failed'));

        const result = await tree.discoverSharedReferences(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Connection failed');
        }
      });

      it('should handle repository authentication errors', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Authentication failed'));

        const result = await tree.findPathCompleteArgument(
          nodeId1,
          nodeId2,
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Authentication failed');
        }
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
                const nodesToRemove = validIndices.map((i) => nodeIds[i]);
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
                  const positionResult = Position2D.create(x, y);
                  expect(positionResult.isOk()).toBe(true);

                  if (positionResult.isOk()) {
                    const moveResult = tree.moveTo(positionResult.value);
                    expect(moveResult.isOk()).toBe(true);
                    expect(tree.getPosition()).toEqual(positionResult.value);
                    expect(
                      tree.isAtPosition(positionResult.value.getX(), positionResult.value.getY()),
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

                    if (!tree.wouldCreateCycle(childId, parentId)) {
                      const setParentResult = tree.setNodeParent(childId, parentId, position);
                      expect(setParentResult.isOk()).toBe(true);

                      const childNode = tree.getNode(childId);
                      expect(childNode?.parentId).toBe(parentId);
                      expect(childNode?.parentPosition).toBe(position);
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
          expect(tree.containsNode(nodeId)).toBe(true);
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
          return Position2D.create(x, y);
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
            const clearResult = tree.setTitle('');
            expect(clearResult.isOk()).toBe(true);
          }
        }
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      }
    });
  });
});
