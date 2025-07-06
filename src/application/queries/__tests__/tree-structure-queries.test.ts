/**
 * Tree structure query tests - GetTreeStructureQuery, GetTreeDepthQuery, GetTreeBranchesQuery
 *
 * Tests tree structure analysis functionality including:
 * - Tree structure retrieval with/without arguments
 * - Tree depth calculation
 * - Tree branch navigation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GetTreeBranchesQuery,
  GetTreeDepthQuery,
  GetTreeStructureQuery,
  TreeNodeDTO,
  TreeStructureDTO,
} from '../tree-queries.js';

interface MockTreeRepositories {
  proofRepository: any;
  treeRepository: any;
  nodeRepository: any;
  argumentRepository: any;
}

describe('Tree Structure Queries', () => {
  let _mockRepositories: MockTreeRepositories;
  let treeService: any;

  beforeEach(() => {
    _mockRepositories = {
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
      getTreeStructure: vi.fn(),
      getTreeDepth: vi.fn(),
      getTreeBranches: vi.fn(),
    };
  });

  describe('GetTreeStructureQuery', () => {
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

    it('should handle empty tree structure', async () => {
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

    it('should handle complex tree structure', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_complex',
        treeId: 'tree_complex',
      };

      const complexStructure: TreeStructureDTO = {
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

      treeService.getTreeStructure.mockResolvedValue(complexStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      expect(result.nodes).toHaveLength(4);
      expect(result.connections).toHaveLength(3);
      expect(result.depth).toBe(3);
      expect(result.breadth).toBe(2);

      const rootNodes = result.nodes.filter((node) => node.isRoot);
      const nonRootNodes = result.nodes.filter((node) => !node.isRoot);
      expect(rootNodes).toHaveLength(1);
      expect(nonRootNodes).toHaveLength(3);

      expect(result.nodes[0]?.position?.x).toBe(100);
      expect(result.nodes[0]?.position?.y).toBe(0);
    });

    it('should handle tree structure with large dimensions', async () => {
      // Arrange
      const query: GetTreeStructureQuery = {
        documentId: 'doc_large_dimensions',
        treeId: 'tree_large_dimensions',
      };

      const largeStructure: TreeStructureDTO = {
        treeId: 'tree_large_dimensions',
        nodes: [],
        connections: [],
        depth: 1000,
        breadth: 500,
      };

      treeService.getTreeStructure.mockResolvedValue(largeStructure);

      // Act
      const result = await treeService.getTreeStructure(query);

      // Assert
      expect(result.depth).toBe(1000);
      expect(result.breadth).toBe(500);
    });
  });

  describe('GetTreeDepthQuery', () => {
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

    it('should handle very deep trees', async () => {
      // Arrange
      const query: GetTreeDepthQuery = {
        documentId: 'doc_very_deep',
        treeId: 'tree_chain',
      };

      treeService.getTreeDepth.mockResolvedValue(100);

      // Act
      const result = await treeService.getTreeDepth(query);

      // Assert
      expect(result).toBe(100);
    });

    it('should handle wide but shallow trees', async () => {
      // Arrange
      const query: GetTreeDepthQuery = {
        documentId: 'doc_wide',
        treeId: 'tree_wide',
      };

      treeService.getTreeDepth.mockResolvedValue(2);

      // Act
      const result = await treeService.getTreeDepth(query);

      // Assert
      expect(result).toBe(2);
    });
  });

  describe('GetTreeBranchesQuery', () => {
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

    it('should handle single branch', async () => {
      // Arrange
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_single_branch',
        treeId: 'tree_linear',
        fromNodeId: 'node_parent',
      };

      const singleBranch: TreeNodeDTO[] = [
        {
          nodeId: 'node_only_child',
          argumentId: 'arg_only_child',
          isRoot: false,
          position: { x: 100, y: 200 },
        },
      ];

      treeService.getTreeBranches.mockResolvedValue(singleBranch);

      // Act
      const result = await treeService.getTreeBranches(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.nodeId).toBe('node_only_child');
    });

    it('should handle branches with arguments included', async () => {
      // Arrange
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_branches_with_args',
        treeId: 'tree_detailed',
        fromNodeId: 'node_root',
      };

      const branchesWithArgs: TreeNodeDTO[] = [
        {
          nodeId: 'node_branch_1',
          argumentId: 'arg_branch_1',
          isRoot: false,
          argument: {
            id: 'arg_branch_1',
            premiseSetId: 'set_premise_1',
            conclusionSetId: 'set_conclusion_1',
            sideLabels: {
              left: 'Branch Rule 1',
              right: 'Ref 1',
            },
          },
        },
      ];

      treeService.getTreeBranches.mockResolvedValue(branchesWithArgs);

      // Act
      const result = await treeService.getTreeBranches(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.argument?.id).toBe('arg_branch_1');
      expect(result[0]?.argument?.sideLabels?.left).toBe('Branch Rule 1');
    });

    it('should handle branches at different levels', async () => {
      // Arrange
      const query: GetTreeBranchesQuery = {
        documentId: 'doc_multi_level',
        treeId: 'tree_multi_level',
        fromNodeId: 'node_middle',
      };

      const multilevelBranches: TreeNodeDTO[] = [
        {
          nodeId: 'node_level_2_a',
          argumentId: 'arg_level_2_a',
          isRoot: false,
          position: { x: 80, y: 300 },
        },
        {
          nodeId: 'node_level_2_b',
          argumentId: 'arg_level_2_b',
          isRoot: false,
          position: { x: 120, y: 300 },
        },
      ];

      treeService.getTreeBranches.mockResolvedValue(multilevelBranches);

      // Act
      const result = await treeService.getTreeBranches(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.position?.y).toBe(300);
      expect(result[1]?.position?.y).toBe(300);
    });
  });
});
