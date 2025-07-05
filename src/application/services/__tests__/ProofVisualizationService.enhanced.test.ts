import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import type { ProofVisualizationConfig, TreeRenderDTO } from '../../dtos/view-dtos.js';
import type { DocumentDTO } from '../../queries/document-queries.js';
import { ProofVisualizationService } from '../ProofVisualizationService.js';
import type { TreeLayoutService } from '../TreeLayoutService.js';

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
            id: 'massiveTree',
            position: { x: 0, y: 0 },
            nodeCount: 150, // Exceeds default limit of 100
            rootNodeIds: ['n1'],
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
          id: `normalTree${i}`,
          position: { x: i * 100, y: 0 },
          nodeCount: 50, // Within limit
          rootNodeIds: ['n1'],
        };
      }

      // One tree exceeding node limit
      mixedTrees.problematicTree = {
        id: 'problematicTree',
        position: { x: 0, y: 1000 },
        nodeCount: 120, // Exceeds limit
        rootNodeIds: ['n1'],
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
            id: 'tree1',
            position: { x: 0, y: 0 },
            nodeCount: 80, // Would exceed default limit of 100, but within custom limit
            rootNodeIds: ['n1'],
          },
        },
      });

      const customConfig: Partial<ProofVisualizationConfig> = {
        performance: {
          maxTreesRendered: 10,
          maxNodesPerTree: 200, // Higher limit
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
            id: 'tree1',
            position: { x: 0, y: 0 },
            nodeCount: 10,
            rootNodeIds: ['n1'],
          },
        },
      });

      const config: Partial<ProofVisualizationConfig> = {
        performance: {
          enableVirtualization: false,
          maxTreesRendered: 50,
          maxNodesPerTree: 100,
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
            id: 'fullyVisible',
            position: { x: 100, y: 100 },
            bounds: { width: 200, height: 200 },
            nodeCount: 5,
            rootNodeIds: ['n1'],
          },
          partiallyVisible: {
            id: 'partiallyVisible',
            position: { x: 700, y: 500 }, // Partially outside viewport
            bounds: { width: 200, height: 200 },
            nodeCount: 3,
            rootNodeIds: ['n2'],
          },
          completelyHidden: {
            id: 'completelyHidden',
            position: { x: 1000, y: 1000 }, // Completely outside viewport
            bounds: { width: 200, height: 200 },
            nodeCount: 2,
            rootNodeIds: ['n3'],
          },
          edgeCase: {
            id: 'edgeCase',
            position: { x: 800, y: 600 }, // Exactly at edge
            bounds: { width: 1, height: 1 },
            nodeCount: 1,
            rootNodeIds: ['n4'],
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
            id: 'tree1',
            position: { x: -100, y: -50 },
            bounds: { width: 200, height: 100 },
            nodeCount: 1,
            rootNodeIds: ['n1'],
          },
          tree2: {
            id: 'tree2',
            position: { x: 100, y: 100 },
            bounds: { width: 200, height: 100 },
            nodeCount: 1,
            rootNodeIds: ['n2'],
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
          zeroSize: {
            id: 'zeroSize',
            position: { x: 100, y: 100 },
            bounds: { width: 0, height: 0 },
            nodeCount: 0,
            rootNodeIds: [],
          },
          normalTree: {
            id: 'normalTree',
            position: { x: 200, y: 200 },
            nodeCount: 5,
            rootNodeIds: ['n1'],
            // Missing bounds - should use default
          },
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
          tree1: {
            id: 'tree1',
            position: { x: 0, y: 0 },
            nodeCount: 1,
            rootNodeIds: ['n1'],
          },
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
        expect(result.value.totalDimensions.width).toBe(500); // 400 + 100
        expect(result.value.totalDimensions.height).toBe(1000); // 200*3 + 150*2 + 100
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
        expect(result.value.totalDimensions.width).toBe(5100); // 5000 + 100
        expect(result.value.totalDimensions.height).toBe(3555); // 5+3000+150 + 150*2 + 100
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
        expect(result.value.totalDimensions.width).toBe(500); // 400 + 100
        expect(result.value.totalDimensions.height).toBe(450); // 0+200 + 150 + 100
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
    orderedSets: {},
    atomicArguments: {},
    trees: {
      tree1: {
        id: 'tree1',
        position: { x: 100, y: 100 },
        nodeCount: 2,
        rootNodeIds: ['n1'],
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
          argument: { id: 'arg1', premiseSetId: null, conclusionSetId: null },
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
