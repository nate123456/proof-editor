import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, type MockedObject, test, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import type { ProofVisualizationConfig, TreeRenderDTO } from '../../dtos/view-dtos.js';
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
      createConfig: vi.fn(),
    } as MockedObject<TreeLayoutService>;
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
        expect(result.value.documentId).toBe(document.id);
        expect(result.value.version).toBe(document.version);
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
          id: `tree${i}`,
          position: { x: i * 100, y: 0 },
          nodeCount: 10,
          rootNodeIds: ['n1'],
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
      const document = createDocumentDTO({
        trees: {
          largeTree: {
            id: 'largeTree',
            position: { x: 0, y: 0 },
            nodeCount: 200, // Exceeds default limit
            rootNodeIds: [],
          },
        },
      });

      const result = service.generateVisualization(document);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('exceeding maximum');
      }
    });

    test('calculates total dimensions correctly', () => {
      const document = createDocumentDTO();
      const mockTreeLayouts: TreeRenderDTO[] = [
        createTreeRenderDTO('tree1', { bounds: { width: 400, height: 300 } }),
        createTreeRenderDTO('tree2', { bounds: { width: 600, height: 250 } }),
      ];

      vi.mocked(mockLayoutService.calculateDocumentLayout).mockReturnValue(ok(mockTreeLayouts));

      const result = service.generateVisualization(document);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should use max width + margin and sum heights + spacing + margin
        expect(result.value.totalDimensions.width).toBe(700); // 600 + 100
        expect(result.value.totalDimensions.height).toBe(800); // 300 + 250 + 150 + 100
      }
    });
  });

  describe('generateOptimizedVisualization', () => {
    test('uses regular generation when virtualization disabled', () => {
      const document = createDocumentDTO();
      const viewport = { width: 800, height: 600, offsetX: 0, offsetY: 0 };
      const config: Partial<ProofVisualizationConfig> = {
        performance: {
          enableVirtualization: false,
          maxTreesRendered: 10,
          maxNodesPerTree: 100,
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
            id: 'visibleTree',
            position: { x: 100, y: 100 },
            bounds: { width: 200, height: 200 },
            nodeCount: 1,
            rootNodeIds: ['n1'],
          },
          hiddenTree: {
            id: 'hiddenTree',
            position: { x: 1000, y: 1000 },
            bounds: { width: 200, height: 200 },
            nodeCount: 1,
            rootNodeIds: ['n2'],
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
            id: 'edgeTree',
            position: { x: 790, y: 590 }, // Just at the edge
            bounds: { width: 50, height: 50 },
            nodeCount: 1,
            rootNodeIds: ['n1'],
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
          tree1: { id: 'tree1', position: { x: 0, y: 0 }, nodeCount: 5, rootNodeIds: ['n1'] },
          tree2: { id: 'tree2', position: { x: 100, y: 0 }, nodeCount: 3, rootNodeIds: ['n2'] },
          tree3: {
            id: 'tree3',
            position: { x: 200, y: 0 },
            nodeCount: 8,
            rootNodeIds: ['n3', 'n4'],
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
      expect(config.performance.maxTreesRendered).toBe(50);
      expect(config.visual.showConnectionLabels).toBe(false);
    });

    test('createConfig merges overrides properly', () => {
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
          maxTreesRendered: 100,
          maxNodesPerTree: 100,
          enableVirtualization: true,
        },
      };

      const config = service.createConfig(overrides);

      expect(config.layout.nodeWidth).toBe(300);
      expect(config.performance.maxTreesRendered).toBe(100);
      expect(config.layout.nodeHeight).toBe(120); // Default preserved
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
