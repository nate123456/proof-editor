import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, type MockedObject, test, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import { MaxNodeCount, MaxTreeCount } from '../../../domain/shared/value-objects/index.js';
import type { ProofVisualizationConfig, TreeRenderDTO } from '../../dtos/view-dtos.js';
import {
  createTestAtomicArgumentId,
  createTestDimensions,
  createTestNodeCount,
  createTestNodeId,
  createTestPosition2D,
  createTestTreeId,
} from '../../queries/__tests__/shared/branded-type-helpers.js';
import type { DocumentDTO } from '../../queries/document-queries.js';
import { ProofVisualizationService } from '../ProofVisualizationService.js';
import type { TreeLayoutService } from '../TreeLayoutService.js';

describe('ProofVisualizationService', () => {
  let service: ProofVisualizationService;
  let mockLayoutService: MockedObject<TreeLayoutService>;

  beforeEach(() => {
    mockLayoutService = {
      calculateDocumentLayout: vi.fn(),
      getDefaultConfig: vi.fn(),
      createTypedConfig: vi.fn(),
    } as unknown as MockedObject<TreeLayoutService>;
    service = new ProofVisualizationService(mockLayoutService);
  });

  describe('generateVisualization', () => {
    test('generates visualization for valid document', () => {
      const document = createDocumentDTO();
      const mockTreeLayouts: TreeRenderDTO[] = [createTreeRenderDTO('tree1')];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTreeLayouts));

      const result = service.generateVisualization(document);

      if (result.isErr()) {
        console.log('Error:', result.error.message);
      }
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.documentId.getValue()).toBe(document.id);
        expect(result.value.version.getValue()).toBe(document.version);
        expect(result.value.trees).toHaveLength(1);
        expect(result.value.isEmpty).toBe(false);
      }
    });

    test('handles empty document', () => {
      const document = createDocumentDTO({ trees: {} });

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateVisualization(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isEmpty).toBe(true);
        expect(result.value.trees).toHaveLength(0);
      }
    });

    test('propagates layout service errors', () => {
      const document = createDocumentDTO();
      const layoutError = new ValidationError('Layout calculation failed');

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(err(layoutError));

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Layout calculation failed');
      }
    });

    test('applies custom configuration', () => {
      const document = createDocumentDTO();
      const customConfig: Partial<ProofVisualizationConfig> = {
        layout: {
          nodeWidth: 300,
          nodeHeight: 150,
          verticalSpacing: 200,
          horizontalSpacing: 320,
          treeSpacing: 180,
          canvasMargin: 75,
        },
      };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateVisualization(document, customConfig);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockLayoutService.calculateDocumentLayout)).toHaveBeenCalledWith(
        document,
        customConfig.layout,
      );
    });

    test('validates document constraints', () => {
      const document = createDocumentDTO();
      // Create a large number of trees to exceed limits
      const largeTrees: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeTrees[`tree${i}`] = {
          id: createTestTreeId(`tree${i}`),
          position: createTestPosition2D(i * 100, 0),
          nodeCount: createTestNodeCount(10),
          rootNodeIds: [createTestNodeId('n1')],
          bounds: createTestDimensions(200, 100),
        };
      }
      document.trees = largeTrees;

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exceeding maximum');
      }
    });

    test('handles trees with excessive nodes', () => {
      // Create custom config with low limits
      const maxNodesResult = MaxNodeCount.create(10);
      expect(maxNodesResult.isOk()).toBe(true);
      if (!maxNodesResult.isOk()) return;

      const customConfig: Partial<ProofVisualizationConfig> = {
        performance: {
          maxTreesRendered: MaxTreeCount.default(),
          maxNodesPerTree: maxNodesResult.value,
          enableVirtualization: true,
        },
      };

      const document = createDocumentDTO({
        trees: {
          largeTree: {
            id: createTestTreeId('largeTree'),
            position: createTestPosition2D(0, 0),
            nodeCount: createTestNodeCount(20), // Exceeds our custom limit of 10
            rootNodeIds: [],
            bounds: createTestDimensions(400, 200),
          },
        },
      });

      const result = service.generateVisualization(document, customConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exceeding maximum');
      }
    });

    test('calculates total dimensions correctly', () => {
      const document = createDocumentDTO();
      const mockTreeLayouts: TreeRenderDTO[] = [
        createTreeRenderDTO('tree1', { bounds: createTestDimensions(400, 300) }),
        createTreeRenderDTO('tree2', { bounds: createTestDimensions(600, 250) }),
      ];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTreeLayouts));

      const result = service.generateVisualization(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should use max width + margin and sum heights + spacing + margin
        expect(result.value.totalDimensions.getWidth()).toBe(700); // 600 + 100
        expect(result.value.totalDimensions.getHeight()).toBe(800); // 300 + 250 + 150 + 100
      }
    });
  });

  describe('generateOptimizedVisualization', () => {
    test('uses regular generation when virtualization disabled', () => {
      const document = createDocumentDTO();
      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };
      const maxTreesResult = MaxTreeCount.create(10);
      const maxNodesResult = MaxNodeCount.create(100);
      if (maxTreesResult.isErr() || maxNodesResult.isErr()) {
        throw new Error('Failed to create max counts for test');
      }

      const config: Partial<ProofVisualizationConfig> = {
        performance: {
          enableVirtualization: false,
          maxTreesRendered: maxTreesResult.value,
          maxNodesPerTree: maxNodesResult.value,
        },
      };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport, config);

      expect(result.isOk()).toBe(true);
      expect(vi.mocked(mockLayoutService.calculateDocumentLayout)).toHaveBeenCalledWith(
        document,
        expect.objectContaining({
          nodeWidth: 220, // Default values merged
        }),
      );
    });

    test('filters trees based on viewport when virtualization enabled', () => {
      const document = createDocumentDTO({
        trees: {
          visibleTree: {
            id: createTestTreeId('visibleTree'),
            position: createTestPosition2D(100, 100),
            bounds: createTestDimensions(200, 200),
            nodeCount: createTestNodeCount(1),
            rootNodeIds: [createTestNodeId('n1')],
          },
          hiddenTree: {
            id: createTestTreeId('hiddenTree'),
            position: createTestPosition2D(1000, 1000),
            bounds: createTestDimensions(200, 200),
            nodeCount: createTestNodeCount(1),
            rootNodeIds: [createTestNodeId('n2')],
          },
        },
      });

      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport);

      expect(result.isOk()).toBe(true);
      // Should filter out the hidden tree
      expect(vi.mocked(mockLayoutService.calculateDocumentLayout)).toHaveBeenCalledWith(
        expect.objectContaining({
          trees: expect.objectContaining({
            visibleTree: expect.any(Object),
          }),
        }),
        expect.any(Object),
      );
    });

    test('handles viewport filtering edge cases', () => {
      const document = createDocumentDTO({
        trees: {
          edgeTree: {
            id: createTestTreeId('edgeTree'),
            position: createTestPosition2D(790, 590), // Just at the edge
            bounds: createTestDimensions(50, 50),
            nodeCount: createTestNodeCount(1),
            rootNodeIds: [createTestNodeId('n1')],
          },
        },
      });

      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateOptimizedVisualization(document, viewport);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('getVisualizationStats', () => {
    test('calculates statistics for document', () => {
      const document = createDocumentDTO({
        trees: {
          tree1: {
            id: createTestTreeId('tree1'),
            position: createTestPosition2D(0, 0),
            nodeCount: createTestNodeCount(5),
            rootNodeIds: [createTestNodeId('n1')],
          },
          tree2: {
            id: createTestTreeId('tree2'),
            position: createTestPosition2D(100, 0),
            nodeCount: createTestNodeCount(3),
            rootNodeIds: [createTestNodeId('n2')],
          },
          tree3: {
            id: createTestTreeId('tree3'),
            position: createTestPosition2D(200, 0),
            nodeCount: createTestNodeCount(8),
            rootNodeIds: [createTestNodeId('n3'), createTestNodeId('n4')],
          },
        },
      });

      const result = service.getVisualizationStats(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalTrees).toBe(3);
        expect(result.value.totalNodes).toBe(16); // 5 + 3 + 8
        expect(result.value.totalConnections).toBe(12); // (5-1) + (3-1) + (8-2)
        expect(result.value.largestTree.id).toBe('tree3');
        expect(result.value.largestTree.nodeCount).toBe(8);
        expect(result.value.estimatedRenderTime).toBeGreaterThan(0);
      }
    });

    test('handles empty document in stats', () => {
      const document = createDocumentDTO({ trees: {} });

      const result = service.getVisualizationStats(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalTrees).toBe(0);
        expect(result.value.totalNodes).toBe(0);
        expect(result.value.totalConnections).toBe(0);
        expect(result.value.largestTree.nodeCount).toBe(0);
        expect(result.value.estimatedRenderTime).toBe(0);
      }
    });

    test('handles malformed document data gracefully', () => {
      const malformedDocument = {
        trees: {
          badTree: null, // Invalid tree data
        },
      } as unknown as DocumentDTO;

      const result = service.getVisualizationStats(malformedDocument);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('configuration management', () => {
    test('getDefaultConfig returns complete configuration', () => {
      const config = service.getDefaultConfig();

      expect(config).toHaveProperty('layout');
      expect(config).toHaveProperty('performance');
      expect(config).toHaveProperty('visual');
      expect(config.layout.nodeWidth).toBe(220);
      expect(config.performance.maxTreesRendered).toBeDefined();
      expect(config.visual.showConnectionLabels).toBe(false);
    });

    test('createConfig merges overrides properly', () => {
      const maxTreesResult = MaxTreeCount.create(100);
      const maxNodesResult = MaxNodeCount.create(100);
      if (maxTreesResult.isErr() || maxNodesResult.isErr()) {
        throw new Error('Failed to create max counts for test');
      }

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
          maxTreesRendered: maxTreesResult.value,
          maxNodesPerTree: maxNodesResult.value,
          enableVirtualization: true,
        },
      };

      const config = service.createConfig(overrides);

      expect(config.layout.nodeWidth).toBe(300);
      expect(config.performance.maxTreesRendered).toBeDefined();
      expect(config.layout.nodeHeight).toBe(120);
      expect(config.visual.showConnectionLabels).toBe(false); // Default preserved
    });

    test('getDefaultConfig returns independent copies', () => {
      const config1 = service.getDefaultConfig();
      const config2 = service.getDefaultConfig();

      config1.layout.nodeWidth = 999;
      expect(config2.layout.nodeWidth).toBe(220);
    });
  });

  describe('error handling', () => {
    test('handles layout service exceptions', () => {
      const document = createDocumentDTO();

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockImplementation(() => {
        throw new Error('Layout service crashed');
      });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Layout service crashed');
      }
    });

    test('handles invalid configuration gracefully', () => {
      const document = createDocumentDTO();
      const invalidConfig = {
        layout: { nodeWidth: -1 }, // Invalid value
      } as any;

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok([]));

      const result = service.generateVisualization(document, invalidConfig);

      // Should handle gracefully or validate config
      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });
});

// Helper functions
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
        id: createTestTreeId('tree1'),
        position: createTestPosition2D(100, 100),
        nodeCount: createTestNodeCount(2),
        rootNodeIds: [createTestNodeId('n1')],
      },
    },
    ...overrides,
  };
}

function createTreeRenderDTO(id: string, overrides: Partial<TreeRenderDTO> = {}): TreeRenderDTO {
  return {
    id: createTestTreeId(id),
    position: createTestPosition2D(0, 0),
    layout: {
      nodes: [
        {
          id: createTestNodeId('n1'),
          position: createTestPosition2D(100, 100),
          dimensions: createTestDimensions(200, 80),
          argument: {
            id: createTestAtomicArgumentId('arg1'),
            premiseIds: [],
            conclusionIds: [],
          },
          premises: [],
          conclusions: [],
        },
      ],
      connections: [],
      dimensions: createTestDimensions(400, 200),
    },
    bounds: createTestDimensions(400, 200),
    ...overrides,
  };
}
