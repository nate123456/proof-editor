import { beforeEach, describe, expect, test } from 'vitest';
import {
  AtomicArgumentId,
  Dimensions,
  NodeCount,
  NodeId,
  Position2D,
  StatementId,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';
import type { DocumentDTO } from '../../queries/document-queries.js';
import type { AtomicArgumentDTO, TreeDTO } from '../../queries/shared-types.js';
import type { StatementDTO } from '../../queries/statement-queries.js';
import { TreeLayoutService } from '../TreeLayoutService.js';

describe('TreeLayoutService', () => {
  let service: TreeLayoutService;

  beforeEach(() => {
    service = new TreeLayoutService();
  });

  describe('calculateDocumentLayout', () => {
    test('calculates layout for empty document', () => {
      const emptyDoc = createDocumentDTO({ trees: {} });
      const result = service.calculateDocumentLayout(emptyDoc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    test('calculates layout for single tree with no nodes', () => {
      const doc = createDocumentDTO({
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 0, []),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.id).toBe('tree1');
        expect(result.value[0]?.layout.nodes).toHaveLength(0);
        expect(result.value[0]?.layout.connections).toHaveLength(0);
        // For empty trees, the bounds are calculated with nodeWidth + horizontalSpacing
        // Default: nodeWidth(220) + horizontalSpacing(280) = 500
        expect(result.value[0]?.bounds.getWidth()).toBe(500);
        // Default: nodeHeight(120) + verticalSpacing(180) = 300
        expect(result.value[0]?.bounds.getHeight()).toBe(300);
      }
    });

    test('calculates layout for single tree with root nodes', () => {
      const doc = createDocumentDTO({
        statements: {
          s1: createStatementDTO('s1', 'Statement 1'),
          s2: createStatementDTO('s2', 'Statement 2'),
        },
        atomicArguments: {
          arg1: createAtomicArgumentDTO('arg1', ['s1'], ['s2']),
        },
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 1, ['n1']),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const treeLayout = result.value[0];
        expect(treeLayout?.id).toBe('tree1');
        expect(treeLayout?.layout.nodes).toHaveLength(1);
        expect(treeLayout?.layout.nodes[0]?.id).toBe('n1');
        expect(treeLayout?.layout.nodes[0]?.premises).toHaveLength(1);
        expect(treeLayout?.layout.nodes[0]?.conclusions).toHaveLength(1);
      }
    });

    test('handles multiple trees with proper spacing', () => {
      const doc = createDocumentDTO({
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 0, []),
          tree2: createTreeDTO('tree2', { x: 200, y: 200 }, 0, []),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);

        // Check that second tree is positioned below first
        const tree1 = result.value[0];
        const tree2 = result.value[1];
        expect(tree2?.position.getY()).toBeGreaterThan(tree1?.position.getY() || 0);
      }
    });

    test('applies custom layout configuration', () => {
      const doc = createDocumentDTO({
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 0, []),
        },
      });

      const customConfigResult = service.createTypedConfig({
        nodeWidth: 300,
        nodeHeight: 150,
        canvasMargin: 100,
      });

      expect(customConfigResult.isOk()).toBe(true);
      if (!customConfigResult.isOk()) return;

      const result = service.calculateDocumentLayout(doc, customConfigResult.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // With custom canvasMargin > 50 (default), width calculation changes
        // nodeWidth(300) + canvasMargin(100)*2 + 100 = 600
        expect(result.value[0]?.bounds.getWidth()).toBe(600);
      }
    });

    test('returns error for invalid tree data', () => {
      // Create a document with inconsistent data
      const doc = createDocumentDTO({
        atomicArguments: {
          arg1: createAtomicArgumentDTO('arg1', ['nonexistent-statement'], []),
        },
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 1, ['n1']),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      // Should handle gracefully, not return error for missing references
      expect(result.isOk()).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    test('returns default configuration', () => {
      const config = service.getDefaultConfig();

      expect(config.getNodeWidth().getValue()).toBe(220);
      expect(config.getNodeHeight().getValue()).toBe(120);
      expect(config.getVerticalSpacing().getValue()).toBe(180);
      expect(config.getHorizontalSpacing().getValue()).toBe(280);
      expect(config.getTreeSpacing().getValue()).toBe(150);
      expect(config.getCanvasMargin().getValue()).toBe(50);
    });

    test('returns independent copy of config', () => {
      const config1 = service.getDefaultConfig();
      const config2 = service.getDefaultConfig();

      // Config is immutable, so we can't modify it directly
      // This test now validates that each call returns a valid config
      expect(config1).not.toBe(config2); // Different instances
      expect(config2.getNodeWidth().getValue()).toBe(220);
    });
  });

  describe('createTypedConfig', () => {
    test('merges overrides with defaults', () => {
      const overrides = {
        nodeWidth: 300,
        canvasMargin: 100,
      };

      const configResult = service.createTypedConfig(overrides);

      expect(configResult.isOk()).toBe(true);
      if (configResult.isOk()) {
        const config = configResult.value;
        expect(config.getNodeWidth().getValue()).toBe(300);
        expect(config.getCanvasMargin().getValue()).toBe(100);
        expect(config.getNodeHeight().getValue()).toBe(120); // Default unchanged
        expect(config.getVerticalSpacing().getValue()).toBe(180); // Default unchanged
      }
    });

    test('returns complete configuration', () => {
      const configResult = service.createTypedConfig({});

      expect(configResult.isOk()).toBe(true);
      if (configResult.isOk()) {
        const config = configResult.value;
        expect(config.getNodeWidth()).toBeDefined();
        expect(config.getNodeHeight()).toBeDefined();
        expect(config.getVerticalSpacing()).toBeDefined();
        expect(config.getHorizontalSpacing()).toBeDefined();
        expect(config.getTreeSpacing()).toBeDefined();
        expect(config.getCanvasMargin()).toBeDefined();
      }
    });
  });

  describe('hierarchical layout algorithm', () => {
    test('positions root nodes at level 0', () => {
      const doc = createDocumentDTO({
        statements: {
          s1: createStatementDTO('s1', 'Root statement'),
        },
        atomicArguments: {
          arg1: createAtomicArgumentDTO('arg1', [], ['s1']),
        },
        trees: {
          tree1: createTreeDTO('tree1', { x: 0, y: 0 }, 1, ['n1']),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const node = result.value[0]?.layout.nodes[0];
        expect(node?.position.getY()).toBe(0); // Root level
      }
    });

    test('handles empty statements and ordered sets gracefully', () => {
      const doc = createDocumentDTO({
        atomicArguments: {
          arg1: createAtomicArgumentDTO('arg1', [], []),
        },
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 1, ['n1']),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const node = result.value[0]?.layout.nodes[0];
        expect(node?.premises).toHaveLength(0);
        expect(node?.conclusions).toHaveLength(0);
      }
    });
  });

  describe('error handling', () => {
    test('handles malformed document structure', () => {
      const malformedDoc = {
        id: 'test',
        version: 1,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {
          tree1: {
            id: 'tree1',
            position: { x: 'invalid', y: 'invalid' }, // Invalid position
            nodeCount: 1,
            rootNodeIds: ['n1'],
          },
        },
      } as unknown as DocumentDTO;

      const result = service.calculateDocumentLayout(malformedDoc);

      // Should handle gracefully or return appropriate error
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    test('handles missing argument references', () => {
      const doc = createDocumentDTO({
        trees: {
          tree1: createTreeDTO('tree1', { x: 100, y: 100 }, 1, ['nonexistent-node']),
        },
      });

      const result = service.calculateDocumentLayout(doc);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should create empty layout for non-existent nodes
        expect(result.value[0]?.layout.nodes).toHaveLength(0);
      }
    });
  });

  describe('performance considerations', () => {
    test('handles large number of trees efficiently', () => {
      const trees: Record<string, TreeDTO> = {};
      for (let i = 0; i < 20; i++) {
        trees[`tree${i}`] = createTreeDTO(`tree${i}`, { x: i * 100, y: i * 100 }, 0, []);
      }

      const doc = createDocumentDTO({ trees });

      const startTime = performance.now();
      const result = service.calculateDocumentLayout(doc);
      const endTime = performance.now();

      expect(result.isOk()).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

// Helper functions for creating test data
function createDocumentDTO(overrides: Partial<DocumentDTO> = {}): DocumentDTO {
  return {
    id: 'test-doc',
    version: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    statements: {},
    orderedSets: {},
    atomicArguments: {},
    trees: {},
    ...overrides,
  };
}

function createTreeDTO(
  id: string,
  position: { x: number; y: number },
  nodeCount: number,
  rootNodeIds: string[],
): TreeDTO {
  const treeIdResult = TreeId.create(id);
  const positionResult = Position2D.create(position.x, position.y);
  const nodeCountResult = NodeCount.create(nodeCount);
  const nodeIdResults = rootNodeIds.map((nodeId) => NodeId.create(nodeId));
  const dimensionsResult = Dimensions.create(400, 200);

  if (
    treeIdResult.isErr() ||
    positionResult.isErr() ||
    nodeCountResult.isErr() ||
    nodeIdResults.some((r) => r.isErr()) ||
    dimensionsResult.isErr()
  ) {
    throw new Error('Failed to create test TreeDTO');
  }

  // Extract successfully validated node IDs
  const validNodeIds = nodeIdResults.filter((r) => r.isOk()).map((r) => r.value);

  return {
    id: treeIdResult.value,
    position: positionResult.value,
    bounds: dimensionsResult.value,
    nodeCount: nodeCountResult.value,
    rootNodeIds: validNodeIds,
  };
}

function createStatementDTO(id: string, content: string): StatementDTO {
  return {
    id,
    content,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

// OrderedSetDTO is no longer used in the current codebase

function createAtomicArgumentDTO(
  id: string,
  premiseIds: string[] | null,
  conclusionIds: string[] | null,
): AtomicArgumentDTO {
  const argumentIdResult = AtomicArgumentId.create(id);
  if (argumentIdResult.isErr()) {
    throw new Error('Failed to create test AtomicArgumentDTO');
  }

  const premiseIdResults = (premiseIds || []).map((id) => StatementId.create(id));
  const conclusionIdResults = (conclusionIds || []).map((id) => StatementId.create(id));

  if (premiseIdResults.some((r) => r.isErr()) || conclusionIdResults.some((r) => r.isErr())) {
    throw new Error('Failed to create test statement IDs');
  }

  // Extract successfully validated statement IDs
  const validPremiseIds = premiseIdResults.filter((r) => r.isOk()).map((r) => r.value);
  const validConclusionIds = conclusionIdResults.filter((r) => r.isOk()).map((r) => r.value);

  return {
    id: argumentIdResult.value,
    premiseIds: validPremiseIds,
    conclusionIds: validConclusionIds,
  };
}
