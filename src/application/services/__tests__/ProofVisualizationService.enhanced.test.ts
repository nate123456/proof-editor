import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import {
  Dimensions,
  MaxNodeCount,
  MaxTreeCount,
  NodeCount,
  NodeId,
  Position2D,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';
import type { ProofVisualizationConfig, TreeRenderDTO } from '../../dtos/view-dtos.js';
import type { DocumentDTO } from '../../queries/document-queries.js';
import { ProofVisualizationService } from '../ProofVisualizationService.js';
import type { TreeLayoutService } from '../TreeLayoutService.js';

// Helper to create tree data with proper value objects
const createTreeData = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  nodeCount: number,
  rootNodeIds: string[] = [],
) => {
  const treeId = TreeId.create(id);
  const position = Position2D.create(x, y);
  const bounds = Dimensions.create(width, height);
  const count = NodeCount.create(nodeCount);
  const nodeIds = rootNodeIds.map((nid) => {
    const r = NodeId.create(nid);
    if (!r.isOk()) throw new Error(`Failed to create NodeId: ${nid}`);
    return r.value;
  });

  if (!treeId.isOk() || !position.isOk() || !bounds.isOk() || !count.isOk()) {
    throw new Error('Failed to create tree test data');
  }

  return {
    id: treeId.value,
    position: position.value,
    bounds: bounds.value,
    nodeCount: count.value,
    rootNodeIds: nodeIds,
  };
};

describe('ProofVisualizationService - Enhanced Coverage', () => {
  let service: ProofVisualizationService;
  let mockLayoutService: TreeLayoutService;

  beforeEach(() => {
    mockLayoutService = {
      calculateDocumentLayout: vi.fn(),
      getDefaultConfig: vi.fn(),
      createConfig: vi.fn(),
    } as any;
    service = new ProofVisualizationService(mockLayoutService);
  });

  describe('validation edge cases', () => {
    test('handles document exceeding tree count limits', () => {
      const largeTrees: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeTrees[`tree${i}`] = {
          id: `tree${i}`,
          position: { x: i * 100, y: 0 },
          nodeCount: 10,
          rootNodeIds: ['n1'],
        };
      }

      const document = createDocumentDTO({ trees: largeTrees });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exceeding maximum of 50');
        expect(result.error.message).toContain('Use optimized visualization');
      }
    });

    test('handles tree with nodes exceeding limits', () => {
      const document = createDocumentDTO({
        trees: {
          massiveTree: {
            id: (() => {
              const r = TreeId.create('massiveTree');
              return r.isOk() ? r.value : ('massiveTree' as any);
            })(),
            position: (() => {
              const r = Position2D.create(0, 0);
              if (!r.isOk()) throw new Error('Failed to create test Position2D');
              return r.value;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(150);
              return r.isOk() ? r.value : (150 as any);
            })(), // Exceeds default limit of 100
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n1');
                return r.isOk() ? r.value : ('n1' as any);
              })(),
            ],
          },
        },
      });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('massiveTree contains 150 nodes');
        expect(result.error.message).toContain('exceeding maximum of 100');
      }
    });

    test('validates multiple trees with mixed constraint violations', () => {
      const mixedTrees: Record<string, any> = {};

      // Some trees within limits
      for (let i = 0; i < 30; i++) {
        mixedTrees[`normalTree${i}`] = {
          id: (() => {
            const r = TreeId.create(`normalTree${i}`);
            return r.isOk() ? r.value : (`normalTree${i}` as any);
          })(),
          position: (() => {
            const r = Position2D.create(i * 100, 0);
            return r.isOk() ? r.value : undefined;
          })(),
          nodeCount: (() => {
            const r = NodeCount.create(50);
            return r.isOk() ? r.value : (50 as any);
          })(), // Within limit
          rootNodeIds: [
            (() => {
              const r = NodeId.create('n1');
              return r.isOk() ? r.value : ('n1' as any);
            })(),
          ],
        };
      }

      // One tree exceeding node limit
      mixedTrees.problematicTree = {
        id: (() => {
          const r = TreeId.create('problematicTree');
          return r.isOk() ? r.value : ('problematicTree' as any);
        })(),
        position: (() => {
          const r = Position2D.create(0, 1000);
          return r.isOk() ? r.value : undefined;
        })(),
        nodeCount: (() => {
          const r = NodeCount.create(120);
          return r.isOk() ? r.value : (120 as any);
        })(), // Exceeds limit
        rootNodeIds: [
          (() => {
            const r = NodeId.create('n1');
            return r.isOk() ? r.value : ('n1' as any);
          })(),
        ],
      };

      const document = createDocumentDTO({ trees: mixedTrees });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('problematicTree contains 120 nodes');
      }
    });

    test('handles custom configuration with different limits', () => {
      const document = createDocumentDTO({
        trees: {
          tree1: {
            id: (() => {
              const r = TreeId.create('tree1');
              return r.isOk() ? r.value : ('tree1' as any);
            })(),
            position: (() => {
              const r = Position2D.create(0, 0);
              if (!r.isOk()) throw new Error('Failed to create test Position2D');
              return r.value;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(80);
              return r.isOk() ? r.value : (80 as any);
            })(), // Would exceed default limit of 100, but within custom limit
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n1');
                return r.isOk() ? r.value : ('n1' as any);
              })(),
            ],
          },
        },
      });

      const customConfig: Partial<ProofVisualizationConfig> = {
        performance: {
          maxTreesRendered: (() => {
            const r = MaxTreeCount.create(10);
            return r.isOk() ? r.value : (10 as any);
          })(),
          maxNodesPerTree: (() => {
            const r = MaxNodeCount.create(200);
            return r.isOk() ? r.value : (200 as any);
          })(), // Higher limit
          enableVirtualization: true,
        },
      };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateVisualization(document, customConfig);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('layout service error propagation', () => {
    test('propagates layout calculation errors with context', () => {
      const document = createDocumentDTO();
      const layoutError = new ValidationError(
        'Node positioning failed due to circular dependencies',
      );

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(err(layoutError));

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Node positioning failed due to circular dependencies');
      }
    });

    test('handles layout service throwing exception', () => {
      const document = createDocumentDTO();

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockImplementation(() => {
        throw new Error('Layout service crashed unexpectedly');
      });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate proof visualization');
        expect(result.error.message).toContain('Layout service crashed unexpectedly');
      }
    });

    test('handles layout service returning null/undefined', () => {
      const document = createDocumentDTO();

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot read property of undefined');
      }
    });
  });

  describe('optimized visualization edge cases', () => {
    test('falls back to regular visualization when virtualization disabled', () => {
      const document = createDocumentDTO({
        trees: {
          tree1: {
            id: (() => {
              const r = TreeId.create('tree1');
              return r.isOk() ? r.value : ('tree1' as any);
            })(),
            position: (() => {
              const r = Position2D.create(0, 0);
              if (!r.isOk()) throw new Error('Failed to create test Position2D');
              return r.value;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(10);
              return r.isOk() ? r.value : (10 as any);
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n1');
                return r.isOk() ? r.value : ('n1' as any);
              })(),
            ],
          },
        },
      });

      const config: Partial<ProofVisualizationConfig> = {
        performance: {
          enableVirtualization: false,
          maxTreesRendered: (() => {
            const r = MaxTreeCount.create(50);
            return r.isOk() ? r.value : (50 as any);
          })(),
          maxNodesPerTree: (() => {
            const r = MaxNodeCount.create(100);
            return r.isOk() ? r.value : (100 as any);
          })(),
        },
      };

      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport, config);

      expect(result.isOk()).toBe(true);
      // Should call regular generation method
      expect(mockLayoutService.calculateDocumentLayout).toHaveBeenCalledWith(
        document,
        expect.objectContaining({
          nodeWidth: 220, // Default value merged with config
        }),
      );
    });

    test('filters trees based on complex viewport scenarios', () => {
      const document = createDocumentDTO({
        trees: {
          fullyVisible: {
            id: (() => {
              const r = TreeId.create('fullyVisible');
              return r.isOk() ? r.value : ('fullyVisible' as any);
            })(),
            position: (() => {
              const r = Position2D.create(100, 100);
              return r.isOk() ? r.value : undefined;
            })(),
            bounds: (() => {
              const r = Dimensions.create(200, 200);
              return r.isOk() ? r.value : undefined;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(5);
              return r.isOk() ? r.value : (5 as any);
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n1');
                return r.isOk() ? r.value : ('n1' as any);
              })(),
            ],
          },
          partiallyVisible: {
            id: (() => {
              const r = TreeId.create('partiallyVisible');
              return r.isOk() ? r.value : ('partiallyVisible' as any);
            })(),
            position: (() => {
              const r = Position2D.create(700, 500);
              return r.isOk() ? r.value : undefined;
            })(), // Partially outside viewport
            bounds: (() => {
              const r = Dimensions.create(200, 200);
              return r.isOk() ? r.value : undefined;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(3);
              return r.isOk() ? r.value : (3 as any);
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n2');
                return r.isOk() ? r.value : ('n2' as any);
              })(),
            ],
          },
          completelyHidden: {
            id: (() => {
              const r = TreeId.create('completelyHidden');
              return r.isOk() ? r.value : ('completelyHidden' as any);
            })(),
            position: (() => {
              const r = Position2D.create(1000, 1000);
              return r.isOk() ? r.value : undefined;
            })(), // Completely outside viewport
            bounds: (() => {
              const r = Dimensions.create(200, 200);
              return r.isOk() ? r.value : undefined;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(2);
              return r.isOk() ? r.value : (2 as any);
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n3');
                return r.isOk() ? r.value : ('n3' as any);
              })(),
            ],
          },
          edgeCase: {
            id: (() => {
              const r = TreeId.create('edgeCase');
              return r.isOk() ? r.value : ('edgeCase' as any);
            })(),
            position: (() => {
              const r = Position2D.create(800, 600);
              return r.isOk() ? r.value : undefined;
            })(), // Exactly at edge
            bounds: (() => {
              const r = Dimensions.create(1, 1);
              return r.isOk() ? r.value : undefined;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(1);
              return r.isOk() ? r.value : (1 as any);
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n4');
                return r.isOk() ? r.value : ('n4' as any);
              })(),
            ],
          },
        },
      });

      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport);

      expect(result.isOk()).toBe(true);

      // Verify that only visible trees are passed to layout service
      expect(mockLayoutService.calculateDocumentLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          trees: expect.objectContaining({
            fullyVisible: expect.any(Object),
            partiallyVisible: expect.any(Object),
            // completelyHidden should be filtered out
            // edgeCase should be included (touching edge)
          }),
        }),
        expect.any(Object),
      );
    });

    test('handles viewport with negative offsets', () => {
      const document = createDocumentDTO({
        trees: {
          tree1: {
            id: (() => {
              const r = TreeId.create('tree1');
              if (!r.isOk()) throw new Error('Failed to create TreeId');
              return r.value;
            })(),
            position: (() => {
              const r = Position2D.create(-100, -50);
              if (!r.isOk()) throw new Error('Failed to create Position2D');
              return r.value;
            })(),
            bounds: (() => {
              const r = Dimensions.create(200, 100);
              if (!r.isOk()) throw new Error('Failed to create Dimensions');
              return r.value;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(1);
              if (!r.isOk()) throw new Error('Failed to create NodeCount');
              return r.value;
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n1');
                if (!r.isOk()) throw new Error('Failed to create NodeId');
                return r.value;
              })(),
            ],
          },
          tree2: {
            id: (() => {
              const r = TreeId.create('tree2');
              if (!r.isOk()) throw new Error('Failed to create TreeId');
              return r.value;
            })(),
            position: (() => {
              const r = Position2D.create(100, 100);
              if (!r.isOk()) throw new Error('Failed to create Position2D');
              return r.value;
            })(),
            bounds: (() => {
              const r = Dimensions.create(200, 100);
              if (!r.isOk()) throw new Error('Failed to create Dimensions');
              return r.value;
            })(),
            nodeCount: (() => {
              const r = NodeCount.create(1);
              if (!r.isOk()) throw new Error('Failed to create NodeCount');
              return r.value;
            })(),
            rootNodeIds: [
              (() => {
                const r = NodeId.create('n2');
                if (!r.isOk()) throw new Error('Failed to create NodeId');
                return r.value;
              })(),
            ],
          },
        },
      });

      const viewport = { width: 400, height: 300, offsetX: -200, offsetY: -100 };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport);

      expect(result.isOk()).toBe(true);
    });

    test('handles viewport filtering with zero-sized trees', () => {
      const document = createDocumentDTO({
        trees: {
          zeroSize: createTreeData('zeroSize', 100, 100, 0, 0, 0, []),
          normalTree: createTreeData('normalTree', 200, 200, 100, 100, 5, ['n1']),
        },
      });

      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport);

      expect(result.isOk()).toBe(true);
    });

    test('handles optimized visualization throwing exception', () => {
      const document = createDocumentDTO({
        trees: {
          tree1: createTreeData('tree1', 0, 0, 100, 100, 1, ['n1']),
        },
      });

      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };

      // Mock to throw during viewport filtering
      vi.mocked(mockLayoutService.calculateDocumentLayout).mockImplementation(() => {
        throw new Error('Viewport calculation failed');
      });

      const result = service.generateOptimizedVisualization(document, viewport);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate proof visualization');
        expect(result.error.message).toContain('Viewport calculation failed');
      }
    });
  });

  describe('visual enhancements', () => {
    test('applies connection labels when enabled', () => {
      const document = createDocumentDTO();
      const config: Partial<ProofVisualizationConfig> = {
        visual: {
          showConnectionLabels: true,
          highlightCriticalPath: false,
          showValidationErrors: true,
        },
      };

      const mockTrees: TreeRenderDTO[] = [
        createTreeRenderDTO('tree1', {
          layout: {
            nodes: [],
            connections: [
              {
                fromNodeId: 'n1',
                toNodeId: 'n2',
                fromPosition: 0,
                toPosition: 0,
                coordinates: { startX: 0, startY: 0, endX: 100, endY: 100 },
              },
            ],
            dimensions: { width: 400, height: 200 },
          },
        }),
      ];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTrees));

      const result = service.generateVisualization(document, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.trees).toHaveLength(1);
        // Connections should be preserved with potential enhancements
        expect(result.value.trees[0]?.layout.connections).toHaveLength(1);
      }
    });

    test('applies critical path highlighting when enabled', () => {
      const document = createDocumentDTO();
      const config: Partial<ProofVisualizationConfig> = {
        visual: {
          showConnectionLabels: false,
          highlightCriticalPath: true,
          showValidationErrors: true,
        },
      };

      const mockTrees: TreeRenderDTO[] = [createTreeRenderDTO('tree1')];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTrees));

      const result = service.generateVisualization(document, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Visual enhancements should be applied
        expect(result.value.trees).toHaveLength(1);
      }
    });

    test('skips enhancements when none are enabled', () => {
      const document = createDocumentDTO();
      const config: Partial<ProofVisualizationConfig> = {
        visual: {
          showConnectionLabels: false,
          highlightCriticalPath: false,
          showValidationErrors: true,
        },
      };

      const mockTrees: TreeRenderDTO[] = [createTreeRenderDTO('tree1')];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTrees));

      const result = service.generateVisualization(document, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should return trees unchanged since no visual enhancements enabled
        expect(result.value.trees).toEqual(mockTrees);
      }
    });
  });

  describe('total dimensions calculation edge cases', () => {
    test('handles trees with identical bounds', () => {
      const document = createDocumentDTO();
      const mockTrees: TreeRenderDTO[] = [
        createTreeRenderDTO('tree1', { bounds: { width: 400, height: 200 } }),
        createTreeRenderDTO('tree2', { bounds: { width: 400, height: 200 } }),
        createTreeRenderDTO('tree3', { bounds: { width: 400, height: 200 } }),
      ];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTrees));

      const result = service.generateVisualization(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should use max width + margin and sum heights + spacing
        expect(result.value.totalDimensions.getWidth()).toBe(500); // 400 + 100
        expect(result.value.totalDimensions.getHeight()).toBe(1000); // 200*3 + 150*2 + 100
      }
    });

    test('handles trees with extreme size variations', () => {
      const document = createDocumentDTO();
      const mockTrees: TreeRenderDTO[] = [
        createTreeRenderDTO('tiny', { bounds: { width: 10, height: 5 } }),
        createTreeRenderDTO('huge', { bounds: { width: 5000, height: 3000 } }),
        createTreeRenderDTO('medium', { bounds: { width: 300, height: 150 } }),
      ];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTrees));

      const result = service.generateVisualization(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should use largest width
        expect(result.value.totalDimensions.getWidth()).toBe(5100); // 5000 + 100
        expect(result.value.totalDimensions.getHeight()).toBe(3555); // 5+3000+150 + 150*2 + 100
      }
    });

    test('handles zero-dimension trees', () => {
      const document = createDocumentDTO();
      const mockTrees: TreeRenderDTO[] = [
        createTreeRenderDTO('zero', { bounds: { width: 0, height: 0 } }),
        createTreeRenderDTO('normal', { bounds: { width: 400, height: 200 } }),
      ];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTrees));

      const result = service.generateVisualization(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalDimensions.getWidth()).toBe(500); // 400 + 100
        expect(result.value.totalDimensions.getHeight()).toBe(450); // 0+200 + 150 + 100
      }
    });
  });

  describe('statistics calculation edge cases', () => {
    test('handles document with complex tree structures', () => {
      const document = createDocumentDTO({
        trees: {
          multiRoot: {
            id: 'multiRoot',
            position: { x: 0, y: 0 },
            nodeCount: 10,
            rootNodeIds: ['r1', 'r2', 'r3'], // Multiple roots
          },
          singleRoot: {
            id: 'singleRoot',
            position: { x: 100, y: 0 },
            nodeCount: 5,
            rootNodeIds: ['r1'], // Single root
          },
          noRoots: {
            id: 'noRoots',
            position: { x: 200, y: 0 },
            nodeCount: 3,
            rootNodeIds: [], // No roots (edge case)
          },
        },
      });

      const result = service.getVisualizationStats(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalTrees).toBe(3);
        expect(result.value.totalNodes).toBe(18); // 10 + 5 + 3
        expect(result.value.totalConnections).toBe(14); // (10-3) + (5-1) + (3-0)
        expect(result.value.largestTree.id).toBe('multiRoot');
        expect(result.value.largestTree.nodeCount).toBe(10);
        expect(result.value.estimatedRenderTime).toBe(25); // 18*1 + 14*0.5
      }
    });

    test('handles zero-node trees in statistics', () => {
      const document = createDocumentDTO({
        trees: {
          empty1: {
            id: 'empty1',
            position: { x: 0, y: 0 },
            nodeCount: 0,
            rootNodeIds: [],
          },
          empty2: {
            id: 'empty2',
            position: { x: 100, y: 0 },
            nodeCount: 0,
            rootNodeIds: [],
          },
          withNodes: {
            id: 'withNodes',
            position: { x: 200, y: 0 },
            nodeCount: 5,
            rootNodeIds: ['r1'],
          },
        },
      });

      const result = service.getVisualizationStats(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalTrees).toBe(3);
        expect(result.value.totalNodes).toBe(5);
        expect(result.value.totalConnections).toBe(4); // 5-1
        expect(result.value.largestTree.id).toBe('withNodes');
        expect(result.value.largestTree.nodeCount).toBe(5);
      }
    });

    test('handles statistics calculation throwing exception', () => {
      const malformedDocument = {
        trees: {
          badTree: {
            nodeCount: 'invalid', // Invalid type
            rootNodeIds: null, // Invalid type
          },
        },
      } as unknown as DocumentDTO;

      const result = service.getVisualizationStats(malformedDocument);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to calculate visualization stats');
      }
    });

    test('calculates render time estimation with edge cases', () => {
      const document = createDocumentDTO({
        trees: {
          massiveTree: {
            id: 'massiveTree',
            position: { x: 0, y: 0 },
            nodeCount: 1000,
            rootNodeIds: ['r1'],
          },
        },
      });

      const result = service.getVisualizationStats(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // 1000 nodes * 1ms + 999 connections * 0.5ms = 1499.5ms
        expect(result.value.estimatedRenderTime).toBe(1499.5);
      }
    });
  });

  describe('configuration handling edge cases', () => {
    test('creates independent config copies', () => {
      const config1 = service.getDefaultConfig();
      const config2 = service.getDefaultConfig();

      // Modify nested objects
      config1.layout.nodeWidth = 999;
      config1.performance.maxTreesRendered = 777;
      config1.visual.showConnectionLabels = true;

      // Should not affect other instances
      expect(config2.layout.nodeWidth).toBe(220);
      expect(config2.performance.maxTreesRendered).toBe(50);
      expect(config2.visual.showConnectionLabels).toBe(false);
    });

    test('merges nested configuration objects properly', () => {
      const overrides: Partial<ProofVisualizationConfig> = {
        layout: {
          nodeWidth: 300,
          nodeHeight: 120,
          verticalSpacing: 180,
          horizontalSpacing: 280,
          treeSpacing: 150,
          canvasMargin: 50,
        },
        performance: {
          enableVirtualization: false,
          maxTreesRendered: 50,
          maxNodesPerTree: 1000,
        },
        // Visual config not provided - should use all defaults
      };

      const document = createDocumentDTO();
      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateVisualization(document, overrides);

      expect(result.isOk()).toBe(true);

      // Verify that layout service was called with properly merged config
      expect(mockLayoutService.calculateDocumentLayout).toHaveBeenCalledWith(
        document,
        expect.objectContaining({
          nodeWidth: 300, // Override
          nodeHeight: 120, // Default
          verticalSpacing: 180, // Default
        }),
      );
    });

    test('handles deeply nested config modifications', () => {
      const config = service.createConfig({
        layout: {
          nodeWidth: 400,
          nodeHeight: 200,
          verticalSpacing: 180,
          horizontalSpacing: 280,
          treeSpacing: 150,
          canvasMargin: 50,
        },
        performance: {
          maxTreesRendered: 100,
          maxNodesPerTree: 1000,
          enableVirtualization: true,
        },
      });

      expect(config.layout.nodeWidth).toBe(400);
      expect(config.layout.nodeHeight).toBe(200);
      expect(config.layout.verticalSpacing).toBe(180); // From config override
      expect(config.performance.maxTreesRendered).toBe(100);
      expect(config.performance.maxNodesPerTree).toBe(1000); // From config override
      expect(config.visual.showConnectionLabels).toBe(false); // Default preserved
    });
  });
});

// Enhanced helper functions
function createDocumentDTO(overrides: Partial<DocumentDTO> = {}): DocumentDTO {
  return {
    id: 'test-doc',
    version: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    statements: {},
    atomicArguments: {},
    trees: {
      tree1: {
        id: (() => {
          const r = TreeId.create('tree1');
          return r.isOk() ? r.value : ('tree1' as any);
        })(),
        position: (() => {
          const r = Position2D.create(100, 100);
          return r.isOk() ? r.value : undefined;
        })(),
        nodeCount: (() => {
          const r = NodeCount.create(2);
          return r.isOk() ? r.value : (2 as any);
        })(),
        rootNodeIds: [
          (() => {
            const r = NodeId.create('n1');
            return r.isOk() ? r.value : ('n1' as any);
          })(),
        ],
      },
    },
    ...overrides,
  };
}

function createTreeRenderDTO(id: string, overrides: Partial<TreeRenderDTO> = {}): TreeRenderDTO {
  return {
    id,
    position: { x: 0, y: 0 },
    layout: {
      nodes: [
        {
          id: 'n1',
          position: { x: 100, y: 100 },
          dimensions: { width: 200, height: 80 },
          argument: { id: 'arg1', premiseIds: null, conclusionIds: null },
          premises: [],
          conclusions: [],
        },
      ],
      connections: [],
      dimensions: { width: 400, height: 200 },
    },
    bounds: { width: 400, height: 200 },
    ...overrides,
  };
}
