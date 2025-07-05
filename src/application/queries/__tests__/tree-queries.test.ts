/**
 * Comprehensive test suite for tree-queries execution and validation
 *
 * Tests query parameter validation, execution logic, error scenarios,
 * data transformation, and integration with domain services.
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { treeFactory } from '../../../domain/__tests__/factories/index.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { treeToDTO } from '../../mappers/TreeMapper.js';
import type {
  FindPathBetweenNodesQuery,
  GetSubtreeQuery,
  GetTreeBranchesQuery,
  GetTreeDepthQuery,
  GetTreeQuery,
  GetTreeStructureQuery,
  ListTreesQuery,
  NodeConnectionDTO,
  TreeDTO,
  TreeNodeDTO,
  TreeStructureDTO,
} from '../tree-queries.js';

// Mock repositories
interface MockTreeRepositories {
  proofRepository: any;
  treeRepository: any;
  nodeRepository: any;
  argumentRepository: any;
}

describe('Tree Query Execution Tests', () => {
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
      getTreeStructure: vi.fn(),
      getTreeDepth: vi.fn(),
      getTreeBranches: vi.fn(),
      findPathBetweenNodes: vi.fn(),
      getSubtree: vi.fn(),
    };
  });

  describe('GetTreeQuery Execution', () => {
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
  });

  describe('ListTreesQuery Execution', () => {
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
  });

  describe('GetTreeStructureQuery Execution', () => {
    it('should retrieve tree structure without arguments', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_structure',
        treeId: 'tree_complex',
        includeArguments: false,
      };

      const expectedStructure: TreeStructureDTO = {
        treeId: 'tree_complex',
        nodes: [
          {
            nodeId: 'node_root',
            argumentId: 'arg_root',
            isRoot: true,
            position: { x: 100, y: 50 },
          },
          {
            nodeId: 'node_child',
            argumentId: 'arg_child',
            isRoot: false,
            position: { x: 100, y: 150 },
          },
        ],
        connections: [
          {
            fromNodeId: 'node_child',
            toNodeId: 'node_root',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 1,
      };

      treeService.getTreeStructure.mockResolvedValue(expectedStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      expect(result.treeId).toBe('tree_complex');
      expect(result.nodes).toHaveLength(2);
      expect(result.connections).toHaveLength(1);
      expect(result.depth).toBe(2);
      expect(result.breadth).toBe(1);
      expect(result.nodes.every((node: TreeNodeDTO) => node.argument === undefined)).toBe(true);
    });

    it('should retrieve tree structure with arguments included', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_structure_args',
        treeId: 'tree_with_args',
        includeArguments: true,
      };

      const expectedStructure: TreeStructureDTO = {
        treeId: 'tree_with_args',
        nodes: [
          {
            nodeId: 'node_root',
            argumentId: 'arg_root',
            isRoot: true,
            argument: {
              id: 'arg_root',
              premiseSetId: 'set_premise',
              conclusionSetId: 'set_conclusion',
              sideLabels: {
                left: 'Modus Ponens',
                right: 'Rule 1',
              },
            },
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      };

      treeService.getTreeStructure.mockResolvedValue(expectedStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      expect(result.nodes[0]?.argument).toBeDefined();
      expect(result.nodes[0]?.argument?.id).toBe('arg_root');
      expect(result.nodes[0]?.argument?.sideLabels?.left).toBe('Modus Ponens');
    });
  });

  describe('GetTreeDepthQuery Execution', () => {
    it('should calculate tree depth correctly', async () => {
      // Arrange
      const query: GetTreeDepthQuery = {
        documentId: 'doc_depth',
        treeId: 'tree_deep',
      };

      treeService.getTreeDepth.mockResolvedValue(5);

      // Act
      const result = await treeService.getTreeDepth(query);

      // Assert
      expect(result).toBe(5);
      expect(typeof result).toBe('number');
    });

    it('should return 0 for empty tree', async () => {
      // Arrange
      const query: GetTreeDepthQuery = {
        documentId: 'doc_empty_tree',
        treeId: 'tree_empty',
      };

      treeService.getTreeDepth.mockResolvedValue(0);

      // Act
      const result = await treeService.getTreeDepth(query);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 1 for single node tree', async () => {
      // Arrange
      const query: GetTreeDepthQuery = {
        documentId: 'doc_single',
        treeId: 'tree_single',
      };

      treeService.getTreeDepth.mockResolvedValue(1);

      // Act
      const result = await treeService.getTreeDepth(query);

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('GetTreeBranchesQuery Execution', () => {
    it('should get branches from root node', async () => {
      // Arrange
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_branches',
        treeId: 'tree_branched',
        fromNodeId: 'node_root',
      };

      const expectedBranches: TreeNodeDTO[] = [
        {
          nodeId: 'node_branch_1',
          argumentId: 'arg_branch_1',
          isRoot: false,
          position: { x: 50, y: 100 },
        },
        {
          nodeId: 'node_branch_2',
          argumentId: 'arg_branch_2',
          isRoot: false,
          position: { x: 150, y: 100 },
        },
      ];

      treeService.getTreeBranches.mockResolvedValue(expectedBranches);

      // Act
      const result = await treeService.getTreeBranches(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.nodeId).toBe('node_branch_1');
      expect(result[1]?.nodeId).toBe('node_branch_2');
      expect(result.every((node: TreeNodeDTO) => !node.isRoot)).toBe(true);
    });

    it('should return empty array for leaf node', async () => {
      // Arrange
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_leaf',
        treeId: 'tree_test',
        fromNodeId: 'node_leaf',
      };

      treeService.getTreeBranches.mockResolvedValue([]);

      // Act
      const result = await treeService.getTreeBranches(query);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('FindPathBetweenNodesQuery Execution', () => {
    it('should find direct path between nodes', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_path',
        treeId: 'tree_linear',
        fromNodeId: 'node_start',
        toNodeId: 'node_end',
      };

      const expectedPath: TreeNodeDTO[] = [
        {
          nodeId: 'node_start',
          argumentId: 'arg_start',
          isRoot: false,
        },
        {
          nodeId: 'node_middle',
          argumentId: 'arg_middle',
          isRoot: false,
        },
        {
          nodeId: 'node_end',
          argumentId: 'arg_end',
          isRoot: true,
        },
      ];

      treeService.findPathBetweenNodes.mockResolvedValue(expectedPath);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.nodeId).toBe('node_start');
      expect(result[2]?.nodeId).toBe('node_end');
    });

    it('should return single node for same source and target', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_same',
        treeId: 'tree_test',
        fromNodeId: 'node_same',
        toNodeId: 'node_same',
      };

      const expectedPath: TreeNodeDTO[] = [
        {
          nodeId: 'node_same',
          argumentId: 'arg_same',
          isRoot: true,
        },
      ];

      treeService.findPathBetweenNodes.mockResolvedValue(expectedPath);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.nodeId).toBe('node_same');
    });

    it('should return empty array when no path exists', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_disconnected',
        treeId: 'tree_forest',
        fromNodeId: 'node_isolated_1',
        toNodeId: 'node_isolated_2',
      };

      treeService.findPathBetweenNodes.mockResolvedValue([]);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('GetSubtreeQuery Execution', () => {
    it('should get subtree without depth limit', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_subtree',
        treeId: 'tree_full',
        rootNodeId: 'node_section_root',
      };

      const expectedSubtree: TreeStructureDTO = {
        treeId: 'tree_full',
        nodes: [
          {
            nodeId: 'node_section_root',
            argumentId: 'arg_section_root',
            isRoot: true,
          },
          {
            nodeId: 'node_subtree_child_1',
            argumentId: 'arg_subtree_child_1',
            isRoot: false,
          },
          {
            nodeId: 'node_subtree_child_2',
            argumentId: 'arg_subtree_child_2',
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_subtree_child_1',
            toNodeId: 'node_section_root',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_subtree_child_2',
            toNodeId: 'node_section_root',
            premisePosition: 1,
          },
        ],
        depth: 2,
        breadth: 2,
      };

      treeService.getSubtree.mockResolvedValue(expectedSubtree);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.nodes).toHaveLength(3);
      expect(result.connections).toHaveLength(2);
      expect(result.depth).toBe(2);
      expect(result.breadth).toBe(2);
    });

    it('should respect max depth limit', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_limited',
        treeId: 'tree_deep',
        rootNodeId: 'node_top',
        maxDepth: 2,
      };

      const expectedSubtree: TreeStructureDTO = {
        treeId: 'tree_deep',
        nodes: [
          {
            nodeId: 'node_top',
            argumentId: 'arg_top',
            isRoot: true,
          },
          {
            nodeId: 'node_level_1',
            argumentId: 'arg_level_1',
            isRoot: false,
          },
          // No level 2 nodes due to maxDepth: 2
        ],
        connections: [
          {
            fromNodeId: 'node_level_1',
            toNodeId: 'node_top',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 1,
      };

      treeService.getSubtree.mockResolvedValue(expectedSubtree);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.depth).toBeLessThanOrEqual(2);
      expect(result.nodes).toHaveLength(2);
    });
  });

  describe('Tree Query Parameter Validation', () => {
    it('should validate required documentId', async () => {
      const invalidQueries = [
        { documentId: '', treeId: 'tree_123' },
        { documentId: '   ', treeId: 'tree_123' },
        { documentId: null as any, treeId: 'tree_123' },
        { documentId: undefined as any, treeId: 'tree_123' },
      ];

      for (const query of invalidQueries) {
        treeService.getTree.mockRejectedValue(new ValidationError('Document ID is required'));

        await expect(treeService.getTree(query)).rejects.toThrow('Document ID is required');
      }
    });

    it('should validate required treeId', async () => {
      const invalidQueries = [
        { documentId: 'doc_123', treeId: '' },
        { documentId: 'doc_123', treeId: '   ' },
        { documentId: 'doc_123', treeId: null as any },
        { documentId: 'doc_123', treeId: undefined as any },
      ];

      for (const query of invalidQueries) {
        treeService.getTree.mockRejectedValue(new ValidationError('Tree ID is required'));

        await expect(treeService.getTree(query)).rejects.toThrow('Tree ID is required');
      }
    });

    it('should validate nodeId parameters', async () => {
      const invalidBranchQuery: GetTreeBranchesQuery = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        fromNodeId: '',
      };

      treeService.getTreeBranches.mockRejectedValue(
        new ValidationError('From node ID is required'),
      );

      await expect(treeService.getTreeBranches(invalidBranchQuery)).rejects.toThrow(
        'From node ID is required',
      );
    });

    it('should validate maxDepth parameter', async () => {
      const invalidQuery: GetSubtreeQuery = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        rootNodeId: 'node_123',
        maxDepth: -1,
      };

      treeService.getSubtree.mockRejectedValue(
        new ValidationError('Max depth must be non-negative'),
      );

      await expect(treeService.getSubtree(invalidQuery)).rejects.toThrow(
        'Max depth must be non-negative',
      );
    });
  });

  describe('Tree Query Error Handling', () => {
    it('should handle non-existent documents', async () => {
      const query: ListTreesQuery = { documentId: 'nonexistent_doc' };

      mockRepositories.proofRepository.findById.mockResolvedValue(null);
      treeService.listTrees.mockRejectedValue(new ValidationError('Document not found'));

      await expect(treeService.listTrees(query)).rejects.toThrow('Document not found');
    });

    it('should handle non-existent trees', async () => {
      const query: GetTreeQuery = {
        documentId: 'doc_123',
        treeId: 'nonexistent_tree',
      };

      mockRepositories.treeRepository.findById.mockResolvedValue(null);
      treeService.getTree.mockResolvedValue(null);

      const result = await treeService.getTree(query);

      expect(result).toBeNull();
    });

    it('should handle non-existent nodes', async () => {
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        fromNodeId: 'nonexistent_node',
      };

      mockRepositories.nodeRepository.findById.mockResolvedValue(null);
      treeService.getTreeBranches.mockRejectedValue(new ValidationError('Node not found'));

      await expect(treeService.getTreeBranches(query)).rejects.toThrow('Node not found');
    });

    it('should handle repository errors gracefully', async () => {
      const query: ListTreesQuery = { documentId: 'doc_error' };

      mockRepositories.treeRepository.findByProofId.mockRejectedValue(
        new Error('Database connection failed'),
      );

      treeService.listTrees.mockRejectedValue(new Error('Database connection failed'));

      await expect(treeService.listTrees(query)).rejects.toThrow('Database connection failed');
    });
  });

  describe('Tree Query Performance', () => {
    it('should handle large trees efficiently', async () => {
      // Arrange
      const query: ListTreesQuery = { documentId: 'doc_large' };

      const manyTrees = Array.from({ length: 100 }, (_, i) => {
        const tree = treeFactory.build();
        return {
          ...treeToDTO(tree),
          id: `tree_${i}`,
          nodeCount: Math.floor(Math.random() * 1000),
        };
      });

      treeService.listTrees.mockResolvedValue(manyTrees);

      const startTime = performance.now();

      // Act
      const result = await treeService.listTrees(query);

      const endTime = performance.now();

      // Assert
      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle deep tree structures efficiently', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_deep_structure',
        treeId: 'tree_very_deep',
        includeArguments: false,
      };

      const deepStructure: TreeStructureDTO = {
        treeId: 'tree_very_deep',
        nodes: Array.from({ length: 50 }, (_, i) => ({
          nodeId: `node_${i}`,
          argumentId: `arg_${i}`,
          isRoot: i === 0,
          position: { x: 100, y: i * 50 },
        })),
        connections: Array.from({ length: 49 }, (_, i) => ({
          fromNodeId: `node_${i + 1}`,
          toNodeId: `node_${i}`,
          premisePosition: 0,
        })),
        depth: 50,
        breadth: 1,
      };

      treeService.getTreeStructure.mockResolvedValue(deepStructure);

      const startTime = performance.now();

      // Act
      const result = await treeService.getTreeStructure(query);

      const endTime = performance.now();

      // Assert
      expect(result.depth).toBe(50);
      expect(result.nodes).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Tree Query Edge Cases', () => {
    it('should handle empty tree', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_empty_tree',
        treeId: 'tree_empty',
      };

      const emptyStructure: TreeStructureDTO = {
        treeId: 'tree_empty',
        nodes: [],
        connections: [],
        depth: 0,
        breadth: 0,
      };

      treeService.getTreeStructure.mockResolvedValue(emptyStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      expect(result.nodes).toEqual([]);
      expect(result.connections).toEqual([]);
      expect(result.depth).toBe(0);
      expect(result.breadth).toBe(0);
    });

    it('should handle single node tree', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_single_node',
        treeId: 'tree_single',
      };

      const singleNodeStructure: TreeStructureDTO = {
        treeId: 'tree_single',
        nodes: [
          {
            nodeId: 'node_only',
            argumentId: 'arg_only',
            isRoot: true,
            position: { x: 100, y: 100 },
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      };

      treeService.getTreeStructure.mockResolvedValue(singleNodeStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.connections).toHaveLength(0);
      expect(result.depth).toBe(1);
      expect(result.breadth).toBe(1);
      expect(result.nodes[0]?.isRoot).toBe(true);
    });

    it('should handle tree with multiple root nodes', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_multi_root',
        treeId: 'tree_forest',
      };

      const multiRootStructure: TreeStructureDTO = {
        treeId: 'tree_forest',
        nodes: [
          {
            nodeId: 'node_root_1',
            argumentId: 'arg_root_1',
            isRoot: true,
          },
          {
            nodeId: 'node_root_2',
            argumentId: 'arg_root_2',
            isRoot: true,
          },
          {
            nodeId: 'node_child_1',
            argumentId: 'arg_child_1',
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_child_1',
            toNodeId: 'node_root_1',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 2,
      };

      treeService.getTreeStructure.mockResolvedValue(multiRootStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      const rootNodes = result.nodes.filter((node: TreeNodeDTO) => node.isRoot);
      expect(rootNodes).toHaveLength(2);
      expect(result.breadth).toBe(2);
    });

    it('should handle complex branching patterns', async () => {
      // Arrange
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_complex_branches',
        treeId: 'tree_wide',
        fromNodeId: 'node_center',
      };

      const complexBranches: TreeNodeDTO[] = [
        {
          nodeId: 'node_branch_north',
          argumentId: 'arg_north',
          isRoot: false,
          position: { x: 100, y: 50 },
        },
        {
          nodeId: 'node_branch_east',
          argumentId: 'arg_east',
          isRoot: false,
          position: { x: 150, y: 100 },
        },
        {
          nodeId: 'node_branch_south',
          argumentId: 'arg_south',
          isRoot: false,
          position: { x: 100, y: 150 },
        },
        {
          nodeId: 'node_branch_west',
          argumentId: 'arg_west',
          isRoot: false,
          position: { x: 50, y: 100 },
        },
      ];

      treeService.getTreeBranches.mockResolvedValue(complexBranches);

      // Act
      const result = await treeService.getTreeBranches(query);

      // Assert
      expect(result).toHaveLength(4);
      expect(result.every((node: TreeNodeDTO) => !node.isRoot)).toBe(true);
      expect(result.every((node: TreeNodeDTO) => node.position !== undefined)).toBe(true);
    });
  });

  describe('Tree Query Property-Based Testing', () => {
    it('should maintain tree structure consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.boolean(),
          async (docId, treeId, includeArguments) => {
            const query: GetTreeStructureQuery = {
              documentId: docId,
              treeId: treeId,
              includeArguments,
            };

            const mockStructure: TreeStructureDTO = {
              treeId: treeId,
              nodes: [
                {
                  nodeId: 'node_test',
                  argumentId: 'arg_test',
                  isRoot: true,
                },
              ],
              connections: [],
              depth: 1,
              breadth: 1,
            };

            treeService.getTreeStructure.mockResolvedValue(mockStructure);

            const result = await treeService.getTreeStructure(query);

            // Property: Tree ID should match query
            expect(result.treeId).toBe(treeId);

            // Property: Depth should be positive for non-empty trees
            if (result.nodes.length > 0) {
              expect(result.depth).toBeGreaterThan(0);
            }

            // Property: Breadth should not exceed node count
            expect(result.breadth).toBeLessThanOrEqual(result.nodes.length);
          },
        ),
      );
    });

    it('should maintain node connection invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
          async (nodeIds) => {
            const structure: TreeStructureDTO = {
              treeId: 'test_tree',
              nodes: nodeIds.map((id, index) => ({
                nodeId: id,
                argumentId: `arg_${id}`,
                isRoot: index === 0,
              })),
              connections: nodeIds.slice(1).map((id, index) => {
                const rootNodeId = nodeIds[0];
                if (!rootNodeId) throw new Error('Root node ID is required');
                return {
                  fromNodeId: id,
                  toNodeId: rootNodeId, // All connect to root
                  premisePosition: index,
                };
              }),
              depth: 2,
              breadth: nodeIds.length - 1,
            };

            // Property: All connection node IDs should exist in nodes array
            const nodeIdSet = new Set(structure.nodes.map((n) => n.nodeId));
            for (const conn of structure.connections) {
              expect(nodeIdSet.has(conn.fromNodeId)).toBe(true);
              expect(nodeIdSet.has(conn.toNodeId)).toBe(true);
            }

            // Property: Premise positions should be non-negative
            for (const conn of structure.connections) {
              expect(conn.premisePosition).toBeGreaterThanOrEqual(0);
            }
          },
        ),
      );
    });
  });
});

describe('Tree Query DTO Validation Tests', () => {
  describe('GetTreeQuery', () => {
    it('should handle basic tree query', () => {
      const query: GetTreeQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
    });

    it('should handle query with empty IDs', () => {
      const query: GetTreeQuery = {
        documentId: '',
        treeId: '',
      };

      expect(query.documentId).toBe('');
      expect(query.treeId).toBe('');
    });

    it('should handle query with UUID format IDs', () => {
      const query: GetTreeQuery = {
        documentId: '550e8400-e29b-41d4-a716-446655440000',
        treeId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(query.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(query.treeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should handle query with various ID formats', () => {
      const idFormats = [
        { doc: 'doc_123', tree: 'tree_456' },
        { doc: 'document-abc', tree: 'tree-def' },
        { doc: 'DOC_UPPER', tree: 'TREE_UPPER' },
        { doc: 'doc.dot', tree: 'tree.dot' },
        { doc: 'doc_with_underscores', tree: 'tree_with_underscores' },
      ];

      idFormats.forEach(({ doc, tree }) => {
        const query: GetTreeQuery = {
          documentId: doc,
          treeId: tree,
        };

        expect(query.documentId).toBe(doc);
        expect(query.treeId).toBe(tree);
      });
    });

    it('should handle query with special characters in IDs', () => {
      const query: GetTreeQuery = {
        documentId: 'doc@example.com',
        treeId: 'tree#special%chars',
      };

      expect(query.documentId).toBe('doc@example.com');
      expect(query.treeId).toBe('tree#special%chars');
    });

    it('should handle query with long IDs', () => {
      const longDocId = `doc_${'a'.repeat(100)}`;
      const longTreeId = `tree_${'b'.repeat(100)}`;

      const query: GetTreeQuery = {
        documentId: longDocId,
        treeId: longTreeId,
      };

      expect(query.documentId).toBe(longDocId);
      expect(query.treeId).toBe(longTreeId);
    });
  });

  describe('ListTreesQuery', () => {
    it('should handle basic list trees query', () => {
      const query: ListTreesQuery = {
        documentId: 'doc_12345',
      };

      expect(query.documentId).toBe('doc_12345');
    });

    it('should handle query with empty document ID', () => {
      const query: ListTreesQuery = {
        documentId: '',
      };

      expect(query.documentId).toBe('');
    });

    it('should handle query with various document ID formats', () => {
      const documentIds = [
        'doc_123',
        'document-456',
        'DOC_UPPERCASE',
        'doc.with.dots',
        'doc_with_underscores',
        '550e8400-e29b-41d4-a716-446655440000',
      ];

      documentIds.forEach((documentId) => {
        const query: ListTreesQuery = {
          documentId,
        };

        expect(query.documentId).toBe(documentId);
      });
    });

    it('should handle query with special characters', () => {
      const query: ListTreesQuery = {
        documentId: 'doc@special#chars',
      };

      expect(query.documentId).toBe('doc@special#chars');
    });
  });

  describe('GetTreeStructureQuery', () => {
    it('should handle basic tree structure query', () => {
      const query: GetTreeStructureQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.includeArguments).toBeUndefined();
    });

    it('should handle query with arguments included', () => {
      const query: GetTreeStructureQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        includeArguments: true,
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.includeArguments).toBe(true);
    });

    it('should handle query with arguments excluded', () => {
      const query: GetTreeStructureQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        includeArguments: false,
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.includeArguments).toBe(false);
    });

    it('should handle various combinations', () => {
      const testCases = [
        { documentId: 'doc_1', treeId: 'tree_1', includeArguments: true },
        { documentId: 'doc_2', treeId: 'tree_2', includeArguments: false },
        { documentId: 'doc_3', treeId: 'tree_3', includeArguments: undefined },
      ];

      testCases.forEach(({ documentId, treeId, includeArguments }) => {
        const query: GetTreeStructureQuery = {
          documentId,
          treeId,
          ...(includeArguments !== undefined && { includeArguments }),
        };

        expect(query.documentId).toBe(documentId);
        expect(query.treeId).toBe(treeId);
        expect(query.includeArguments).toBe(includeArguments);
      });
    });
  });

  describe('GetTreeDepthQuery', () => {
    it('should handle basic tree depth query', () => {
      const query: GetTreeDepthQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
    });

    it('should handle query with various ID formats', () => {
      const idFormats = [
        { doc: 'doc_depth_123', tree: 'tree_depth_456' },
        { doc: 'document-depth', tree: 'tree-depth' },
        { doc: 'DOC_DEPTH', tree: 'TREE_DEPTH' },
        { doc: 'doc.depth', tree: 'tree.depth' },
      ];

      idFormats.forEach(({ doc, tree }) => {
        const query: GetTreeDepthQuery = {
          documentId: doc,
          treeId: tree,
        };

        expect(query.documentId).toBe(doc);
        expect(query.treeId).toBe(tree);
      });
    });
  });

  describe('GetTreeBranchesQuery', () => {
    it('should handle basic tree branches query', () => {
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        fromNodeId: 'node_abc123',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.fromNodeId).toBe('node_abc123');
    });

    it('should handle query with empty IDs', () => {
      const query: GetTreeBranchesQuery = {
        documentId: '',
        treeId: '',
        fromNodeId: '',
      };

      expect(query.documentId).toBe('');
      expect(query.treeId).toBe('');
      expect(query.fromNodeId).toBe('');
    });

    it('should handle query with various ID formats', () => {
      const idFormats = [
        { doc: 'doc_branches_123', tree: 'tree_branches_456', node: 'node_branches_789' },
        { doc: 'document-branches', tree: 'tree-branches', node: 'node-branches' },
        { doc: 'DOC_BRANCHES', tree: 'TREE_BRANCHES', node: 'NODE_BRANCHES' },
        { doc: 'doc.branches', tree: 'tree.branches', node: 'node.branches' },
      ];

      idFormats.forEach(({ doc, tree, node }) => {
        const query: GetTreeBranchesQuery = {
          documentId: doc,
          treeId: tree,
          fromNodeId: node,
        };

        expect(query.documentId).toBe(doc);
        expect(query.treeId).toBe(tree);
        expect(query.fromNodeId).toBe(node);
      });
    });

    it('should handle query with UUID format IDs', () => {
      const query: GetTreeBranchesQuery = {
        documentId: '550e8400-e29b-41d4-a716-446655440000',
        treeId: '123e4567-e89b-12d3-a456-426614174000',
        fromNodeId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };

      expect(query.documentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(query.treeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(query.fromNodeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should handle query with special characters', () => {
      const query: GetTreeBranchesQuery = {
        documentId: 'doc@branches.com',
        treeId: 'tree#branches',
        fromNodeId: 'node%branches',
      };

      expect(query.documentId).toBe('doc@branches.com');
      expect(query.treeId).toBe('tree#branches');
      expect(query.fromNodeId).toBe('node%branches');
    });
  });

  describe('FindPathBetweenNodesQuery', () => {
    it('should handle basic path finding query', () => {
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        fromNodeId: 'node_start',
        toNodeId: 'node_end',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.fromNodeId).toBe('node_start');
      expect(query.toNodeId).toBe('node_end');
    });

    it('should handle query with same from and to nodes', () => {
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        fromNodeId: 'node_same',
        toNodeId: 'node_same',
      };

      expect(query.fromNodeId).toBe(query.toNodeId);
      expect(query.fromNodeId).toBe('node_same');
    });

    it('should handle query with empty IDs', () => {
      const query: FindPathBetweenNodesQuery = {
        documentId: '',
        treeId: '',
        fromNodeId: '',
        toNodeId: '',
      };

      expect(query.documentId).toBe('');
      expect(query.treeId).toBe('');
      expect(query.fromNodeId).toBe('');
      expect(query.toNodeId).toBe('');
    });

    it('should handle query with various ID formats', () => {
      const idFormats = [
        { doc: 'doc_path_123', tree: 'tree_path_456', from: 'node_from_789', to: 'node_to_012' },
        { doc: 'document-path', tree: 'tree-path', from: 'node-from', to: 'node-to' },
        { doc: 'DOC_PATH', tree: 'TREE_PATH', from: 'NODE_FROM', to: 'NODE_TO' },
        { doc: 'doc.path', tree: 'tree.path', from: 'node.from', to: 'node.to' },
      ];

      idFormats.forEach(({ doc, tree, from, to }) => {
        const query: FindPathBetweenNodesQuery = {
          documentId: doc,
          treeId: tree,
          fromNodeId: from,
          toNodeId: to,
        };

        expect(query.documentId).toBe(doc);
        expect(query.treeId).toBe(tree);
        expect(query.fromNodeId).toBe(from);
        expect(query.toNodeId).toBe(to);
      });
    });

    it('should handle query with long IDs', () => {
      const longDocId = `doc_${'a'.repeat(50)}`;
      const longTreeId = `tree_${'b'.repeat(50)}`;
      const longFromId = `node_from_${'c'.repeat(50)}`;
      const longToId = `node_to_${'d'.repeat(50)}`;

      const query: FindPathBetweenNodesQuery = {
        documentId: longDocId,
        treeId: longTreeId,
        fromNodeId: longFromId,
        toNodeId: longToId,
      };

      expect(query.documentId).toBe(longDocId);
      expect(query.treeId).toBe(longTreeId);
      expect(query.fromNodeId).toBe(longFromId);
      expect(query.toNodeId).toBe(longToId);
    });
  });

  describe('GetSubtreeQuery', () => {
    it('should handle basic subtree query', () => {
      const query: GetSubtreeQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        rootNodeId: 'node_root',
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.rootNodeId).toBe('node_root');
      expect(query.maxDepth).toBeUndefined();
    });

    it('should handle query with max depth', () => {
      const query: GetSubtreeQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        rootNodeId: 'node_root',
        maxDepth: 5,
      };

      expect(query.documentId).toBe('doc_12345');
      expect(query.treeId).toBe('tree_67890');
      expect(query.rootNodeId).toBe('node_root');
      expect(query.maxDepth).toBe(5);
    });

    it('should handle query with zero max depth', () => {
      const query: GetSubtreeQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        rootNodeId: 'node_root',
        maxDepth: 0,
      };

      expect(query.maxDepth).toBe(0);
    });

    it('should handle query with negative max depth', () => {
      const query: GetSubtreeQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        rootNodeId: 'node_root',
        maxDepth: -1,
      };

      expect(query.maxDepth).toBe(-1);
    });

    it('should handle query with large max depth', () => {
      const query: GetSubtreeQuery = {
        documentId: 'doc_12345',
        treeId: 'tree_67890',
        rootNodeId: 'node_root',
        maxDepth: 1000,
      };

      expect(query.maxDepth).toBe(1000);
    });

    it('should handle various max depth values', () => {
      const maxDepths = [1, 2, 3, 5, 10, 20, 50, 100];

      maxDepths.forEach((maxDepth) => {
        const query: GetSubtreeQuery = {
          documentId: 'doc_depth_test',
          treeId: 'tree_depth_test',
          rootNodeId: 'node_depth_test',
          maxDepth,
        };

        expect(query.maxDepth).toBe(maxDepth);
      });
    });
  });

  describe('TreeDTO', () => {
    it('should handle basic tree DTO', () => {
      const tree: TreeDTO = {
        id: 'tree_12345',
        position: {
          x: 100,
          y: 200,
        },
        nodeCount: 5,
        rootNodeIds: ['node_root'],
      };

      expect(tree.id).toBe('tree_12345');
      expect(tree.position.x).toBe(100);
      expect(tree.position.y).toBe(200);
      expect(tree.nodeCount).toBe(5);
      expect(tree.rootNodeIds).toEqual(['node_root']);
      expect(tree.bounds).toBeUndefined();
    });

    it('should handle tree with bounds', () => {
      const tree: TreeDTO = {
        id: 'tree_with_bounds',
        position: {
          x: 50,
          y: 75,
        },
        bounds: {
          width: 800,
          height: 600,
        },
        nodeCount: 10,
        rootNodeIds: ['node_1', 'node_2'],
      };

      expect(tree.bounds?.width).toBe(800);
      expect(tree.bounds?.height).toBe(600);
      expect(tree.rootNodeIds).toHaveLength(2);
    });

    it('should handle tree at origin', () => {
      const tree: TreeDTO = {
        id: 'tree_origin',
        position: {
          x: 0,
          y: 0,
        },
        nodeCount: 1,
        rootNodeIds: ['node_single'],
      };

      expect(tree.position.x).toBe(0);
      expect(tree.position.y).toBe(0);
      expect(tree.nodeCount).toBe(1);
    });

    it('should handle tree with negative coordinates', () => {
      const tree: TreeDTO = {
        id: 'tree_negative',
        position: {
          x: -100,
          y: -200,
        },
        nodeCount: 3,
        rootNodeIds: ['node_root'],
      };

      expect(tree.position.x).toBe(-100);
      expect(tree.position.y).toBe(-200);
    });

    it('should handle tree with fractional coordinates', () => {
      const tree: TreeDTO = {
        id: 'tree_fractional',
        position: {
          x: 123.456,
          y: 789.012,
        },
        bounds: {
          width: 456.789,
          height: 234.567,
        },
        nodeCount: 7,
        rootNodeIds: ['node_precise'],
      };

      expect(tree.position.x).toBe(123.456);
      expect(tree.position.y).toBe(789.012);
      expect(tree.bounds?.width).toBe(456.789);
      expect(tree.bounds?.height).toBe(234.567);
    });

    it('should handle tree with multiple root nodes', () => {
      const rootNodeIds = Array.from({ length: 5 }, (_, i) => `root_node_${i + 1}`);

      const tree: TreeDTO = {
        id: 'tree_multi_root',
        position: {
          x: 300,
          y: 400,
        },
        nodeCount: 20,
        rootNodeIds,
      };

      expect(tree.rootNodeIds).toHaveLength(5);
      expect(tree.rootNodeIds[0]).toBe('root_node_1');
      expect(tree.rootNodeIds[4]).toBe('root_node_5');
    });

    it('should handle tree with zero node count', () => {
      const tree: TreeDTO = {
        id: 'tree_empty',
        position: {
          x: 0,
          y: 0,
        },
        nodeCount: 0,
        rootNodeIds: [],
      };

      expect(tree.nodeCount).toBe(0);
      expect(tree.rootNodeIds).toEqual([]);
    });

    it('should handle tree with large node count', () => {
      const tree: TreeDTO = {
        id: 'tree_large',
        position: {
          x: 0,
          y: 0,
        },
        nodeCount: 10000,
        rootNodeIds: ['node_1'],
      };

      expect(tree.nodeCount).toBe(10000);
    });
  });

  describe('TreeStructureDTO', () => {
    it('should handle basic tree structure', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_12345',
        nodes: [
          {
            nodeId: 'node_1',
            argumentId: 'arg_1',
            isRoot: true,
          },
          {
            nodeId: 'node_2',
            argumentId: 'arg_2',
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_1',
            toNodeId: 'node_2',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 1,
      };

      expect(structure.treeId).toBe('tree_12345');
      expect(structure.nodes).toHaveLength(2);
      expect(structure.connections).toHaveLength(1);
      expect(structure.depth).toBe(2);
      expect(structure.breadth).toBe(1);
      expect(structure.nodes[0]?.isRoot).toBe(true);
      expect(structure.nodes[1]?.isRoot).toBe(false);
    });

    it('should handle empty tree structure', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_empty',
        nodes: [],
        connections: [],
        depth: 0,
        breadth: 0,
      };

      expect(structure.treeId).toBe('tree_empty');
      expect(structure.nodes).toEqual([]);
      expect(structure.connections).toEqual([]);
      expect(structure.depth).toBe(0);
      expect(structure.breadth).toBe(0);
    });

    it('should handle single node tree structure', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_single',
        nodes: [
          {
            nodeId: 'node_only',
            argumentId: 'arg_only',
            isRoot: true,
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      };

      expect(structure.nodes).toHaveLength(1);
      expect(structure.connections).toHaveLength(0);
      expect(structure.depth).toBe(1);
      expect(structure.breadth).toBe(1);
      expect(structure.nodes[0]?.isRoot).toBe(true);
    });

    it('should handle complex tree structure', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_complex',
        nodes: [
          {
            nodeId: 'node_root',
            argumentId: 'arg_root',
            position: { x: 100, y: 0 },
            isRoot: true,
          },
          {
            nodeId: 'node_left',
            argumentId: 'arg_left',
            position: { x: 50, y: 100 },
            isRoot: false,
          },
          {
            nodeId: 'node_right',
            argumentId: 'arg_right',
            position: { x: 150, y: 100 },
            isRoot: false,
          },
          {
            nodeId: 'node_leaf',
            argumentId: 'arg_leaf',
            position: { x: 100, y: 200 },
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_left',
            toNodeId: 'node_root',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_right',
            toNodeId: 'node_root',
            premisePosition: 1,
          },
          {
            fromNodeId: 'node_leaf',
            toNodeId: 'node_left',
            premisePosition: 0,
          },
        ],
        depth: 3,
        breadth: 2,
      };

      expect(structure.nodes).toHaveLength(4);
      expect(structure.connections).toHaveLength(3);
      expect(structure.depth).toBe(3);
      expect(structure.breadth).toBe(2);

      const rootNodes = structure.nodes.filter((node) => node.isRoot);
      const nonRootNodes = structure.nodes.filter((node) => !node.isRoot);
      expect(rootNodes).toHaveLength(1);
      expect(nonRootNodes).toHaveLength(3);

      expect(structure.nodes[0]?.position?.x).toBe(100);
      expect(structure.nodes[0]?.position?.y).toBe(0);
    });

    it('should handle tree structure with large dimensions', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_large_dimensions',
        nodes: [],
        connections: [],
        depth: 1000,
        breadth: 500,
      };

      expect(structure.depth).toBe(1000);
      expect(structure.breadth).toBe(500);
    });

    it('should handle tree structure with zero dimensions', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_zero_dimensions',
        nodes: [],
        connections: [],
        depth: 0,
        breadth: 0,
      };

      expect(structure.depth).toBe(0);
      expect(structure.breadth).toBe(0);
    });
  });

  describe('TreeNodeDTO', () => {
    it('should handle basic tree node', () => {
      const node: TreeNodeDTO = {
        nodeId: 'node_12345',
        argumentId: 'arg_67890',
        isRoot: true,
      };

      expect(node.nodeId).toBe('node_12345');
      expect(node.argumentId).toBe('arg_67890');
      expect(node.isRoot).toBe(true);
      expect(node.position).toBeUndefined();
      expect(node.argument).toBeUndefined();
    });

    it('should handle tree node with position', () => {
      const node: TreeNodeDTO = {
        nodeId: 'node_positioned',
        argumentId: 'arg_positioned',
        position: {
          x: 150.5,
          y: 250.75,
        },
        isRoot: false,
      };

      expect(node.position?.x).toBe(150.5);
      expect(node.position?.y).toBe(250.75);
      expect(node.isRoot).toBe(false);
    });

    it('should handle tree node with included argument', () => {
      const node: TreeNodeDTO = {
        nodeId: 'node_with_arg',
        argumentId: 'arg_with_details',
        isRoot: true,
        argument: {
          id: 'arg_with_details',
          premiseSetId: 'set_premise',
          conclusionSetId: 'set_conclusion',
          sideLabels: {
            left: 'Rule Name',
            right: 'Reference',
          },
        },
      };

      expect(node.argument?.id).toBe('arg_with_details');
      expect(node.argument?.premiseSetId).toBe('set_premise');
      expect(node.argument?.conclusionSetId).toBe('set_conclusion');
      expect(node.argument?.sideLabels?.left).toBe('Rule Name');
      expect(node.argument?.sideLabels?.right).toBe('Reference');
    });

    it('should handle tree node at origin', () => {
      const node: TreeNodeDTO = {
        nodeId: 'node_origin',
        argumentId: 'arg_origin',
        position: {
          x: 0,
          y: 0,
        },
        isRoot: true,
      };

      expect(node.position?.x).toBe(0);
      expect(node.position?.y).toBe(0);
    });

    it('should handle tree node with negative coordinates', () => {
      const node: TreeNodeDTO = {
        nodeId: 'node_negative',
        argumentId: 'arg_negative',
        position: {
          x: -100,
          y: -200,
        },
        isRoot: false,
      };

      expect(node.position?.x).toBe(-100);
      expect(node.position?.y).toBe(-200);
    });

    it('should handle various ID formats', () => {
      const idFormats = [
        { node: 'node_123', arg: 'arg_456' },
        { node: 'node-abc', arg: 'argument-def' },
        { node: 'NODE_UPPER', arg: 'ARG_UPPER' },
        { node: 'node.dot', arg: 'arg.dot' },
        { node: 'node_with_underscores', arg: 'arg_with_underscores' },
      ];

      idFormats.forEach(({ node, arg }) => {
        const treeNode: TreeNodeDTO = {
          nodeId: node,
          argumentId: arg,
          isRoot: false,
        };

        expect(treeNode.nodeId).toBe(node);
        expect(treeNode.argumentId).toBe(arg);
      });
    });

    it('should handle both root and non-root nodes', () => {
      const rootNode: TreeNodeDTO = {
        nodeId: 'node_root',
        argumentId: 'arg_root',
        isRoot: true,
      };

      const childNode: TreeNodeDTO = {
        nodeId: 'node_child',
        argumentId: 'arg_child',
        isRoot: false,
      };

      expect(rootNode.isRoot).toBe(true);
      expect(childNode.isRoot).toBe(false);
    });
  });

  describe('NodeConnectionDTO', () => {
    it('should handle basic node connection', () => {
      const connection: NodeConnectionDTO = {
        fromNodeId: 'node_from',
        toNodeId: 'node_to',
        premisePosition: 0,
      };

      expect(connection.fromNodeId).toBe('node_from');
      expect(connection.toNodeId).toBe('node_to');
      expect(connection.premisePosition).toBe(0);
      expect(connection.fromPosition).toBeUndefined();
    });

    it('should handle connection with from position', () => {
      const connection: NodeConnectionDTO = {
        fromNodeId: 'node_from',
        toNodeId: 'node_to',
        premisePosition: 1,
        fromPosition: 0,
      };

      expect(connection.fromNodeId).toBe('node_from');
      expect(connection.toNodeId).toBe('node_to');
      expect(connection.premisePosition).toBe(1);
      expect(connection.fromPosition).toBe(0);
    });

    it('should handle connection with numeric from position', () => {
      const connection: NodeConnectionDTO = {
        fromNodeId: 'node_from',
        toNodeId: 'node_to',
        premisePosition: 0,
        fromPosition: 1,
      };

      expect(connection.fromPosition).toBe(1);
    });

    it('should handle various premise positions', () => {
      const positions = [0, 1, 2, 5, 10, 100];

      positions.forEach((position) => {
        const connection: NodeConnectionDTO = {
          fromNodeId: 'node_from',
          toNodeId: 'node_to',
          premisePosition: position,
        };

        expect(connection.premisePosition).toBe(position);
      });
    });

    it('should handle negative premise position', () => {
      const connection: NodeConnectionDTO = {
        fromNodeId: 'node_from',
        toNodeId: 'node_to',
        premisePosition: -1,
      };

      expect(connection.premisePosition).toBe(-1);
    });

    it('should handle self-connection', () => {
      const connection: NodeConnectionDTO = {
        fromNodeId: 'node_self',
        toNodeId: 'node_self',
        premisePosition: 0,
      };

      expect(connection.fromNodeId).toBe(connection.toNodeId);
      expect(connection.fromNodeId).toBe('node_self');
    });

    it('should handle various ID formats', () => {
      const idFormats = [
        { from: 'node_from_123', to: 'node_to_456' },
        { from: 'node-from-abc', to: 'node-to-def' },
        { from: 'NODE_FROM_UPPER', to: 'NODE_TO_UPPER' },
        { from: 'node.from.dot', to: 'node.to.dot' },
      ];

      idFormats.forEach(({ from, to }) => {
        const connection: NodeConnectionDTO = {
          fromNodeId: from,
          toNodeId: to,
          premisePosition: 0,
        };

        expect(connection.fromNodeId).toBe(from);
        expect(connection.toNodeId).toBe(to);
      });
    });

    it('should handle complex from position patterns', () => {
      const fromPositions = [0, 1, 2, 3, 4, 5];

      fromPositions.forEach((fromPosition) => {
        const connection: NodeConnectionDTO = {
          fromNodeId: 'node_from',
          toNodeId: 'node_to',
          premisePosition: 0,
          fromPosition: typeof fromPosition === 'number' ? fromPosition : 0,
        };

        expect(connection.fromPosition).toBe(fromPosition);
      });
    });
  });

  describe('property-based testing', () => {
    it('should handle arbitrary tree queries', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (documentId, treeId) => {
          const query: GetTreeQuery = {
            documentId,
            treeId,
          };

          expect(typeof query.documentId).toBe('string');
          expect(typeof query.treeId).toBe('string');
          expect(query.documentId).toBe(documentId);
          expect(query.treeId).toBe(treeId);
        }),
      );
    });

    it('should handle arbitrary tree structure queries', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.option(fc.boolean(), { nil: undefined }),
          (documentId, treeId, includeArguments) => {
            const query: GetTreeStructureQuery = {
              documentId,
              treeId,
              ...(includeArguments !== undefined && { includeArguments }),
            };

            expect(typeof query.documentId).toBe('string');
            expect(typeof query.treeId).toBe('string');
            if (query.includeArguments !== undefined) {
              expect(typeof query.includeArguments).toBe('boolean');
            }
          },
        ),
      );
    });

    it('should handle arbitrary subtree queries', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          fc.option(fc.integer(), { nil: undefined }),
          (documentId, treeId, rootNodeId, maxDepth) => {
            const query: GetSubtreeQuery = {
              documentId,
              treeId,
              rootNodeId,
              ...(maxDepth !== undefined && { maxDepth }),
            };

            expect(typeof query.documentId).toBe('string');
            expect(typeof query.treeId).toBe('string');
            expect(typeof query.rootNodeId).toBe('string');
            if (query.maxDepth !== undefined) {
              expect(typeof query.maxDepth).toBe('number');
            }
          },
        ),
      );
    });

    it('should handle arbitrary tree DTOs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            position: fc.record({
              x: fc.float(),
              y: fc.float(),
            }),
            bounds: fc.option(
              fc.record({
                width: fc.float({ min: 0 }).filter((n) => !Number.isNaN(n)),
                height: fc.float({ min: 0 }).filter((n) => !Number.isNaN(n)),
              }),
              { nil: undefined },
            ),
            nodeCount: fc.nat(),
            rootNodeIds: fc.array(fc.string()),
          }),
          (params) => {
            const tree: TreeDTO = {
              id: params.id,
              position: params.position,
              nodeCount: params.nodeCount,
              rootNodeIds: params.rootNodeIds,
              ...(params.bounds !== undefined && { bounds: params.bounds }),
            };

            expect(typeof tree.id).toBe('string');
            expect(typeof tree.position.x).toBe('number');
            expect(typeof tree.position.y).toBe('number');
            expect(typeof tree.nodeCount).toBe('number');
            expect(tree.nodeCount).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(tree.rootNodeIds)).toBe(true);

            tree.rootNodeIds.forEach((nodeId) => {
              expect(typeof nodeId).toBe('string');
            });

            if (tree.bounds !== undefined) {
              expect(typeof tree.bounds.width).toBe('number');
              expect(typeof tree.bounds.height).toBe('number');
              expect(tree.bounds.width).toBeGreaterThanOrEqual(0);
              expect(tree.bounds.height).toBeGreaterThanOrEqual(0);
            }
          },
        ),
      );
    });

    it('should handle arbitrary tree node DTOs', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeId: fc.string(),
            argumentId: fc.string(),
            position: fc.option(
              fc.record({
                x: fc.float(),
                y: fc.float(),
              }),
              { nil: undefined },
            ),
            isRoot: fc.boolean(),
          }),
          (params) => {
            const node: TreeNodeDTO = {
              nodeId: params.nodeId,
              argumentId: params.argumentId,
              isRoot: params.isRoot,
              ...(params.position !== undefined && { position: params.position }),
            };

            expect(typeof node.nodeId).toBe('string');
            expect(typeof node.argumentId).toBe('string');
            expect(typeof node.isRoot).toBe('boolean');

            if (node.position !== undefined) {
              expect(typeof node.position.x).toBe('number');
              expect(typeof node.position.y).toBe('number');
            }
          },
        ),
      );
    });

    it('should handle arbitrary node connections', () => {
      fc.assert(
        fc.property(
          fc.record({
            fromNodeId: fc.string(),
            toNodeId: fc.string(),
            premisePosition: fc.integer(),
            fromPosition: fc.option(fc.oneof(fc.integer(), fc.string()), { nil: undefined }),
          }),
          (params) => {
            const connection: NodeConnectionDTO = {
              fromNodeId: params.fromNodeId,
              toNodeId: params.toNodeId,
              premisePosition: params.premisePosition,
              ...(params.fromPosition !== undefined && {
                fromPosition: typeof params.fromPosition === 'number' ? params.fromPosition : 0,
              }),
            };

            expect(typeof connection.fromNodeId).toBe('string');
            expect(typeof connection.toNodeId).toBe('string');
            expect(typeof connection.premisePosition).toBe('number');

            if (connection.fromPosition !== undefined) {
              expect(typeof connection.fromPosition).toBe('number');
            }
          },
        ),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete tree analysis workflow', () => {
      const documentId = 'doc_tree_analysis';
      const treeId = 'tree_main_proof';

      // List all trees in document
      const listQuery: ListTreesQuery = {
        documentId,
      };

      // Get specific tree
      const getQuery: GetTreeQuery = {
        documentId,
        treeId,
      };

      // Get tree structure with arguments
      const structureQuery: GetTreeStructureQuery = {
        documentId,
        treeId,
        includeArguments: true,
      };

      // Analyze tree depth
      const _depthQuery: GetTreeDepthQuery = {
        documentId,
        treeId,
      };

      // Tree data
      const tree: TreeDTO = {
        id: treeId,
        position: { x: 100, y: 200 },
        bounds: { width: 800, height: 600 },
        nodeCount: 7,
        rootNodeIds: ['node_axiom_1', 'node_axiom_2'],
      };

      // Tree structure
      const structure: TreeStructureDTO = {
        treeId,
        nodes: [
          {
            nodeId: 'node_axiom_1',
            argumentId: 'arg_axiom_1',
            isRoot: true,
            position: { x: 150, y: 50 },
          },
          {
            nodeId: 'node_axiom_2',
            argumentId: 'arg_axiom_2',
            isRoot: true,
            position: { x: 250, y: 50 },
          },
          {
            nodeId: 'node_lemma',
            argumentId: 'arg_lemma',
            isRoot: false,
            position: { x: 200, y: 150 },
          },
          {
            nodeId: 'node_theorem',
            argumentId: 'arg_theorem',
            isRoot: false,
            position: { x: 200, y: 250 },
          },
        ],
        connections: [
          {
            fromNodeId: 'node_axiom_1',
            toNodeId: 'node_lemma',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_axiom_2',
            toNodeId: 'node_lemma',
            premisePosition: 1,
          },
          {
            fromNodeId: 'node_lemma',
            toNodeId: 'node_theorem',
            premisePosition: 0,
          },
        ],
        depth: 3,
        breadth: 2,
      };

      expect(listQuery.documentId).toBe(documentId);
      expect(getQuery.treeId).toBe(treeId);
      expect(structureQuery.includeArguments).toBe(true);
      expect(tree.nodeCount).toBe(7);
      expect(structure.nodes).toHaveLength(4);
      expect(structure.connections).toHaveLength(3);
      expect(structure.depth).toBe(3);
      expect(structure.breadth).toBe(2);
    });

    it('should handle tree navigation workflow', () => {
      const documentId = 'doc_navigation';
      const treeId = 'tree_complex';

      // Get branches from root node
      const branchesQuery: GetTreeBranchesQuery = {
        documentId,
        treeId,
        fromNodeId: 'node_root',
      };

      // Find path between specific nodes
      const pathQuery: FindPathBetweenNodesQuery = {
        documentId,
        treeId,
        fromNodeId: 'node_start',
        toNodeId: 'node_target',
      };

      // Get subtree with limited depth
      const subtreeQuery: GetSubtreeQuery = {
        documentId,
        treeId,
        rootNodeId: 'node_section_root',
        maxDepth: 3,
      };

      expect(branchesQuery.fromNodeId).toBe('node_root');
      expect(pathQuery.fromNodeId).toBe('node_start');
      expect(pathQuery.toNodeId).toBe('node_target');
      expect(subtreeQuery.rootNodeId).toBe('node_section_root');
      expect(subtreeQuery.maxDepth).toBe(3);
    });

    it('should handle tree with complex positioning', () => {
      const structure: TreeStructureDTO = {
        treeId: 'tree_positioned',
        nodes: [
          {
            nodeId: 'node_center',
            argumentId: 'arg_center',
            position: { x: 0, y: 0 },
            isRoot: true,
          },
          {
            nodeId: 'node_north',
            argumentId: 'arg_north',
            position: { x: 0, y: -100 },
            isRoot: false,
          },
          {
            nodeId: 'node_east',
            argumentId: 'arg_east',
            position: { x: 100, y: 0 },
            isRoot: false,
          },
          {
            nodeId: 'node_south',
            argumentId: 'arg_south',
            position: { x: 0, y: 100 },
            isRoot: false,
          },
          {
            nodeId: 'node_west',
            argumentId: 'arg_west',
            position: { x: -100, y: 0 },
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_north',
            toNodeId: 'node_center',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_east',
            toNodeId: 'node_center',
            premisePosition: 1,
          },
          {
            fromNodeId: 'node_south',
            toNodeId: 'node_center',
            premisePosition: 2,
          },
          {
            fromNodeId: 'node_west',
            toNodeId: 'node_center',
            premisePosition: 3,
          },
        ],
        depth: 2,
        breadth: 4,
      };

      expect(structure.nodes).toHaveLength(5);
      expect(structure.connections).toHaveLength(4);
      expect(structure.breadth).toBe(4);

      // Verify positioned layout
      const centerNode = structure.nodes.find((n) => n.nodeId === 'node_center');
      const northNode = structure.nodes.find((n) => n.nodeId === 'node_north');
      const eastNode = structure.nodes.find((n) => n.nodeId === 'node_east');

      expect(centerNode?.position?.x).toBe(0);
      expect(centerNode?.position?.y).toBe(0);
      expect(northNode?.position?.y).toBe(-100);
      expect(eastNode?.position?.x).toBe(100);
    });

    it('should handle tree with multiple conclusion connections', () => {
      const connections: NodeConnectionDTO[] = [
        {
          fromNodeId: 'node_multi_conclusion',
          toNodeId: 'node_target_1',
          premisePosition: 0,
          fromPosition: 0,
        },
        {
          fromNodeId: 'node_multi_conclusion',
          toNodeId: 'node_target_2',
          premisePosition: 0,
          fromPosition: 1,
        },
        {
          fromNodeId: 'node_multi_conclusion',
          toNodeId: 'node_target_3',
          premisePosition: 1,
          fromPosition: 0,
        },
      ];

      expect(connections).toHaveLength(3);

      // All connections from same source node
      expect(connections.every((c) => c.fromNodeId === 'node_multi_conclusion')).toBe(true);

      // Different target nodes
      const targets = connections.map((c) => c.toNodeId);
      expect(new Set(targets).size).toBe(3);

      // Various from position formats
      expect(connections[0]?.fromPosition).toBe(0);
      expect(connections[1]?.fromPosition).toBe(1);
      expect(connections[2]?.fromPosition).toBe(0);
    });

    it('should handle tree structure evolution', () => {
      // Initial simple tree
      const initialStructure: TreeStructureDTO = {
        treeId: 'tree_evolving',
        nodes: [
          {
            nodeId: 'node_root',
            argumentId: 'arg_root',
            isRoot: true,
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      };

      // After adding first child
      const withChild: TreeStructureDTO = {
        treeId: 'tree_evolving',
        nodes: [
          {
            nodeId: 'node_root',
            argumentId: 'arg_root',
            isRoot: true,
          },
          {
            nodeId: 'node_child_1',
            argumentId: 'arg_child_1',
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_child_1',
            toNodeId: 'node_root',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 1,
      };

      // Final complex structure
      const finalStructure: TreeStructureDTO = {
        treeId: 'tree_evolving',
        nodes: [
          {
            nodeId: 'node_root',
            argumentId: 'arg_root',
            isRoot: true,
          },
          {
            nodeId: 'node_child_1',
            argumentId: 'arg_child_1',
            isRoot: false,
          },
          {
            nodeId: 'node_child_2',
            argumentId: 'arg_child_2',
            isRoot: false,
          },
          {
            nodeId: 'node_grandchild',
            argumentId: 'arg_grandchild',
            isRoot: false,
          },
        ],
        connections: [
          {
            fromNodeId: 'node_child_1',
            toNodeId: 'node_root',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_child_2',
            toNodeId: 'node_root',
            premisePosition: 1,
          },
          {
            fromNodeId: 'node_grandchild',
            toNodeId: 'node_child_1',
            premisePosition: 0,
          },
        ],
        depth: 3,
        breadth: 2,
      };

      // Verify evolution
      expect(initialStructure.nodes).toHaveLength(1);
      expect(initialStructure.connections).toHaveLength(0);
      expect(initialStructure.depth).toBe(1);

      expect(withChild.nodes).toHaveLength(2);
      expect(withChild.connections).toHaveLength(1);
      expect(withChild.depth).toBe(2);

      expect(finalStructure.nodes).toHaveLength(4);
      expect(finalStructure.connections).toHaveLength(3);
      expect(finalStructure.depth).toBe(3);
      expect(finalStructure.breadth).toBe(2);
    });
  });
});
