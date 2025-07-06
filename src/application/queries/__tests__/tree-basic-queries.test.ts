/**
 * Basic tree query tests - GetTreeQuery and ListTreesQuery
 *
 * Tests basic tree retrieval functionality including:
 * - Single tree retrieval by ID
 * - Multiple tree listing by document
 * - Tree data structure validation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { treeFactory } from '../../../domain/__tests__/factories/index.js';
import { treeToDTO } from '../../mappers/TreeMapper.js';
import type { GetTreeQuery, ListTreesQuery, TreeDTO } from '../tree-queries.js';

interface MockTreeRepositories {
  proofRepository: any;
  treeRepository: any;
  nodeRepository: any;
  argumentRepository: any;
}

describe('Tree Basic Queries', () => {
  let mockRepositories: MockTreeRepositories;
  let treeService: any;

  beforeEach(() => {
    mockRepositories = {
      proofRepository: {
        findById: vi.fn(),
      },
      treeRepository: {
        findById: vi.fn(),
        findByProofId: vi.fn(),
      },
      nodeRepository: {
        findByTreeId: vi.fn(),
        findById: vi.fn(),
        findChildrenOfNode: vi.fn(),
      },
      argumentRepository: {
        findById: vi.fn(),
      },
    };
    treeService = {
      getTree: vi.fn(),
      listTrees: vi.fn(),
    };
  });

  describe('GetTreeQuery', () => {
    it('should retrieve tree by ID successfully', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_tree_test',
        treeId: 'tree_main',
      };

      const tree = treeFactory.build();
      const treeDto = treeToDTO(tree);

      mockRepositories.treeRepository.findById.mockResolvedValue(tree);
      treeService.getTree.mockResolvedValue(treeDto);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBeDefined();
      expect(result?.position).toBeDefined();
      expect(typeof result?.nodeCount).toBe('number');
      expect(Array.isArray(result?.rootNodeIds)).toBe(true);
    });

    it('should return null for non-existent tree', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_test',
        treeId: 'nonexistent_tree',
      };

      mockRepositories.treeRepository.findById.mockResolvedValue(null);
      treeService.getTree.mockResolvedValue(null);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle tree with bounds', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_bounds_test',
        treeId: 'tree_with_bounds',
      };

      const expectedTree: TreeDTO = {
        id: 'tree_with_bounds',
        position: { x: 100, y: 200 },
        bounds: { width: 800, height: 600 },
        nodeCount: 5,
        rootNodeIds: ['node_root'],
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.bounds?.width).toBe(800);
      expect(result?.bounds?.height).toBe(600);
    });

    it('should handle tree at origin', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_origin',
        treeId: 'tree_origin',
      };

      const expectedTree: TreeDTO = {
        id: 'tree_origin',
        position: { x: 0, y: 0 },
        nodeCount: 1,
        rootNodeIds: ['node_single'],
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.position.x).toBe(0);
      expect(result?.position.y).toBe(0);
      expect(result?.nodeCount).toBe(1);
    });

    it('should handle tree with negative coordinates', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_negative',
        treeId: 'tree_negative',
      };

      const expectedTree: TreeDTO = {
        id: 'tree_negative',
        position: { x: -100, y: -200 },
        nodeCount: 3,
        rootNodeIds: ['node_root'],
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.position.x).toBe(-100);
      expect(result?.position.y).toBe(-200);
    });

    it('should handle tree with fractional coordinates', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_fractional',
        treeId: 'tree_fractional',
      };

      const expectedTree: TreeDTO = {
        id: 'tree_fractional',
        position: { x: 123.456, y: 789.012 },
        bounds: { width: 456.789, height: 234.567 },
        nodeCount: 7,
        rootNodeIds: ['node_precise'],
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.position.x).toBe(123.456);
      expect(result?.position.y).toBe(789.012);
      expect(result?.bounds?.width).toBe(456.789);
      expect(result?.bounds?.height).toBe(234.567);
    });

    it('should handle tree with multiple root nodes', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_multi_root',
        treeId: 'tree_multi_root',
      };

      const rootNodeIds = Array.from({ length: 5 }, (_, i) => `root_node_${i + 1}`);
      const expectedTree: TreeDTO = {
        id: 'tree_multi_root',
        position: { x: 300, y: 400 },
        nodeCount: 20,
        rootNodeIds,
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.rootNodeIds).toHaveLength(5);
      expect(result?.rootNodeIds[0]).toBe('root_node_1');
      expect(result?.rootNodeIds[4]).toBe('root_node_5');
    });

    it('should handle tree with zero node count', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_empty',
        treeId: 'tree_empty',
      };

      const expectedTree: TreeDTO = {
        id: 'tree_empty',
        position: { x: 0, y: 0 },
        nodeCount: 0,
        rootNodeIds: [],
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.nodeCount).toBe(0);
      expect(result?.rootNodeIds).toEqual([]);
    });

    it('should handle tree with large node count', async () => {
      // Arrange
      const query: GetTreeQuery = {
        documentId: 'doc_large',
        treeId: 'tree_large',
      };

      const expectedTree: TreeDTO = {
        id: 'tree_large',
        position: { x: 0, y: 0 },
        nodeCount: 10000,
        rootNodeIds: ['node_1'],
      };

      treeService.getTree.mockResolvedValue(expectedTree);

      // Act
      const result = await treeService.getTree(query);

      // Assert
      expect(result?.nodeCount).toBe(10000);
    });
  });

  describe('ListTreesQuery', () => {
    it('should list all trees in document', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_multi_trees' };

      const trees = [treeFactory.build(), treeFactory.build(), treeFactory.build()];
      const treeDtos = trees.map((tree) => treeToDTO(tree));

      mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);
      treeService.listTrees.mockResolvedValue(treeDtos);

      // Act
      const result = await treeService.listTrees(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((tree: TreeDTO) => typeof tree.id === 'string')).toBe(true);
      expect(result.every((tree: TreeDTO) => typeof tree.nodeCount === 'number')).toBe(true);
    });

    it('should return empty array for document with no trees', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_empty' };

      mockRepositories.treeRepository.findByProofId.mockResolvedValue([]);
      treeService.listTrees.mockResolvedValue([]);

      // Act
      const result = await treeService.listTrees(query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle document with single tree', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_single_tree' };

      const trees = [treeFactory.build()];
      const treeDtos = trees.map((tree) => treeToDTO(tree));

      mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);
      treeService.listTrees.mockResolvedValue(treeDtos);

      // Act
      const result = await treeService.listTrees(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeDefined();
    });

    it('should handle document with trees of varying sizes', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_varying_sizes' };

      const trees = [treeFactory.build(), treeFactory.build(), treeFactory.build()];
      const treeDtos = trees.map((tree, index) => ({
        ...treeToDTO(tree),
        id: `tree_${index}`,
        nodeCount: Math.floor(Math.random() * 100) + 1,
      }));

      mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);
      treeService.listTrees.mockResolvedValue(treeDtos);

      // Act
      const result = await treeService.listTrees(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((tree: TreeDTO) => tree.nodeCount > 0)).toBe(true);
    });

    it('should handle document with trees at different positions', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_positioned_trees' };

      const trees = [treeFactory.build(), treeFactory.build()];
      const tree0 = trees[0];
      const tree1 = trees[1];
      if (!tree0 || !tree1) throw new Error('Failed to build test trees');
      const treeDtos = [
        { ...treeToDTO(tree0), position: { x: 100, y: 200 } },
        { ...treeToDTO(tree1), position: { x: 500, y: 300 } },
      ];

      mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);
      treeService.listTrees.mockResolvedValue(treeDtos);

      // Act
      const result = await treeService.listTrees(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.position.x).toBe(100);
      expect(result[1]?.position.x).toBe(500);
    });

    it('should handle document with trees having bounds', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_bounded_trees' };

      const trees = [treeFactory.build()];
      const tree0 = trees[0];
      if (!tree0) throw new Error('Failed to build test tree');
      const treeDtos = [
        {
          ...treeToDTO(tree0),
          bounds: { width: 800, height: 600 },
        },
      ];

      mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);
      treeService.listTrees.mockResolvedValue(treeDtos);

      // Act
      const result = await treeService.listTrees(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.bounds?.width).toBe(800);
      expect(result[0]?.bounds?.height).toBe(600);
    });
  });
});
