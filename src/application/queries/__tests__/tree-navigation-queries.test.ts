/**
 * Tree navigation query tests - FindPathBetweenNodesQuery and GetSubtreeQuery
 *
 * Tests tree navigation functionality including:
 * - Path finding between nodes
 * - Subtree extraction with depth limits
 * - Complex navigation scenarios
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestSideLabel } from '../../../domain/__tests__/value-object-test-helpers.js';
import type {
  FindPathBetweenNodesQuery,
  GetSubtreeQuery,
  NodeConnectionDTO,
  TreeNodeDTO,
  TreeStructureDTO,
} from '../tree-queries.js';
import {
  createTestAtomicArgumentId,
  createTestStatementIds,
} from './shared/branded-type-helpers.js';

interface MockTreeRepositories {
  proofRepository: any;
  treeRepository: any;
  nodeRepository: any;
  argumentRepository: any;
}

describe('Tree Navigation Queries', () => {
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
      findPathBetweenNodes: vi.fn(),
      getSubtree: vi.fn(),
    };
  });

  describe('FindPathBetweenNodesQuery', () => {
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

    it('should handle complex path through multiple levels', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_complex_path',
        treeId: 'tree_deep',
        fromNodeId: 'node_leaf',
        toNodeId: 'node_root',
      };

      const complexPath: TreeNodeDTO[] = [
        {
          nodeId: 'node_leaf',
          argumentId: 'arg_leaf',
          isRoot: false,
          position: { x: 100, y: 400 },
        },
        {
          nodeId: 'node_level_3',
          argumentId: 'arg_level_3',
          isRoot: false,
          position: { x: 100, y: 300 },
        },
        {
          nodeId: 'node_level_2',
          argumentId: 'arg_level_2',
          isRoot: false,
          position: { x: 100, y: 200 },
        },
        {
          nodeId: 'node_level_1',
          argumentId: 'arg_level_1',
          isRoot: false,
          position: { x: 100, y: 100 },
        },
        {
          nodeId: 'node_root',
          argumentId: 'arg_root',
          isRoot: true,
          position: { x: 100, y: 0 },
        },
      ];

      treeService.findPathBetweenNodes.mockResolvedValue(complexPath);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0]?.nodeId).toBe('node_leaf');
      expect(result[4]?.nodeId).toBe('node_root');
      expect(result[4]?.isRoot).toBe(true);
    });

    it('should handle path with branching alternatives', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_branching',
        treeId: 'tree_branched',
        fromNodeId: 'node_branch_left',
        toNodeId: 'node_convergence',
      };

      const branchingPath: TreeNodeDTO[] = [
        {
          nodeId: 'node_branch_left',
          argumentId: 'arg_branch_left',
          isRoot: false,
        },
        {
          nodeId: 'node_intermediate',
          argumentId: 'arg_intermediate',
          isRoot: false,
        },
        {
          nodeId: 'node_convergence',
          argumentId: 'arg_convergence',
          isRoot: true,
        },
      ];

      treeService.findPathBetweenNodes.mockResolvedValue(branchingPath);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.nodeId).toBe('node_branch_left');
      expect(result[2]?.nodeId).toBe('node_convergence');
    });

    it('should handle reverse path navigation', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_reverse',
        treeId: 'tree_bidirectional',
        fromNodeId: 'node_conclusion',
        toNodeId: 'node_premise',
      };

      const reversePath: TreeNodeDTO[] = [
        {
          nodeId: 'node_conclusion',
          argumentId: 'arg_conclusion',
          isRoot: true,
        },
        {
          nodeId: 'node_intermediate',
          argumentId: 'arg_intermediate',
          isRoot: false,
        },
        {
          nodeId: 'node_premise',
          argumentId: 'arg_premise',
          isRoot: false,
        },
      ];

      treeService.findPathBetweenNodes.mockResolvedValue(reversePath);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.nodeId).toBe('node_conclusion');
      expect(result[2]?.nodeId).toBe('node_premise');
    });

    it('should handle path with arguments included', async () => {
      // Arrange
      const query: FindPathBetweenNodesQuery = {
        documentId: 'doc_path_with_args',
        treeId: 'tree_detailed',
        fromNodeId: 'node_start',
        toNodeId: 'node_end',
      };

      const pathWithArgs: TreeNodeDTO[] = [
        {
          nodeId: 'node_start',
          argumentId: 'arg_start',
          isRoot: false,
          argument: {
            id: createTestAtomicArgumentId('arg_start'),
            premiseIds: createTestStatementIds('set_start_premise'),
            conclusionIds: createTestStatementIds('set_start_conclusion'),
            sideLabels: {
              left: createTestSideLabel('Start Rule'),
              right: createTestSideLabel('Ref Start'),
            },
          },
        },
        {
          nodeId: 'node_end',
          argumentId: 'arg_end',
          isRoot: true,
          argument: {
            id: createTestAtomicArgumentId('arg_end'),
            premiseIds: createTestStatementIds('set_end_premise'),
            conclusionIds: createTestStatementIds('set_end_conclusion'),
            sideLabels: {
              left: createTestSideLabel('End Rule'),
              right: createTestSideLabel('Ref End'),
            },
          },
        },
      ];

      treeService.findPathBetweenNodes.mockResolvedValue(pathWithArgs);

      // Act
      const result = await treeService.findPathBetweenNodes(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.argument?.id).toBe('arg_start');
      expect(result[1]?.argument?.id).toBe('arg_end');
      expect(result[0]?.argument?.sideLabels?.left).toBe('Start Rule');
    });
  });

  describe('GetSubtreeQuery', () => {
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

    it('should handle subtree with single node', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_single_subtree',
        treeId: 'tree_isolated',
        rootNodeId: 'node_isolated',
        maxDepth: 1,
      };

      const singleNodeSubtree: TreeStructureDTO = {
        treeId: 'tree_isolated',
        nodes: [
          {
            nodeId: 'node_isolated',
            argumentId: 'arg_isolated',
            isRoot: true,
            position: { x: 100, y: 100 },
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      };

      treeService.getSubtree.mockResolvedValue(singleNodeSubtree);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.nodes).toHaveLength(1);
      expect(result.connections).toHaveLength(0);
      expect(result.nodes[0]?.isRoot).toBe(true);
    });

    it('should handle subtree with zero max depth', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_zero_depth',
        treeId: 'tree_root_only',
        rootNodeId: 'node_root_only',
        maxDepth: 0,
      };

      const zeroDepthSubtree: TreeStructureDTO = {
        treeId: 'tree_root_only',
        nodes: [],
        connections: [],
        depth: 0,
        breadth: 0,
      };

      treeService.getSubtree.mockResolvedValue(zeroDepthSubtree);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.nodes).toHaveLength(0);
      expect(result.connections).toHaveLength(0);
      expect(result.depth).toBe(0);
    });

    it('should handle large subtree with depth limit', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_large_subtree',
        treeId: 'tree_comprehensive',
        rootNodeId: 'node_section_root',
        maxDepth: 3,
      };

      const largeSubtree: TreeStructureDTO = {
        treeId: 'tree_comprehensive',
        nodes: Array.from({ length: 15 }, (_, i) => ({
          nodeId: `node_${i}`,
          argumentId: `arg_${i}`,
          isRoot: i === 0,
          position: { x: (i % 5) * 100, y: Math.floor(i / 5) * 100 },
        })),
        connections: Array.from({ length: 14 }, (_, i) => ({
          fromNodeId: `node_${i + 1}`,
          toNodeId: `node_${Math.floor((i + 1) / 3)}`,
          premisePosition: (i + 1) % 3,
        })),
        depth: 3,
        breadth: 5,
      };

      treeService.getSubtree.mockResolvedValue(largeSubtree);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.nodes).toHaveLength(15);
      expect(result.connections).toHaveLength(14);
      expect(result.depth).toBe(3);
      expect(result.breadth).toBe(5);
    });

    it('should handle subtree with complex branching', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_branched_subtree',
        treeId: 'tree_branched',
        rootNodeId: 'node_branching_root',
      };

      const branchedSubtree: TreeStructureDTO = {
        treeId: 'tree_branched',
        nodes: [
          {
            nodeId: 'node_branching_root',
            argumentId: 'arg_branching_root',
            isRoot: true,
            position: { x: 200, y: 0 },
          },
          {
            nodeId: 'node_left_branch',
            argumentId: 'arg_left_branch',
            isRoot: false,
            position: { x: 100, y: 100 },
          },
          {
            nodeId: 'node_right_branch',
            argumentId: 'arg_right_branch',
            isRoot: false,
            position: { x: 300, y: 100 },
          },
          {
            nodeId: 'node_left_leaf_1',
            argumentId: 'arg_left_leaf_1',
            isRoot: false,
            position: { x: 50, y: 200 },
          },
          {
            nodeId: 'node_left_leaf_2',
            argumentId: 'arg_left_leaf_2',
            isRoot: false,
            position: { x: 150, y: 200 },
          },
          {
            nodeId: 'node_right_leaf',
            argumentId: 'arg_right_leaf',
            isRoot: false,
            position: { x: 300, y: 200 },
          },
        ],
        connections: [
          {
            fromNodeId: 'node_left_branch',
            toNodeId: 'node_branching_root',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_right_branch',
            toNodeId: 'node_branching_root',
            premisePosition: 1,
          },
          {
            fromNodeId: 'node_left_leaf_1',
            toNodeId: 'node_left_branch',
            premisePosition: 0,
          },
          {
            fromNodeId: 'node_left_leaf_2',
            toNodeId: 'node_left_branch',
            premisePosition: 1,
          },
          {
            fromNodeId: 'node_right_leaf',
            toNodeId: 'node_right_branch',
            premisePosition: 0,
          },
        ],
        depth: 3,
        breadth: 2,
      };

      treeService.getSubtree.mockResolvedValue(branchedSubtree);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.nodes).toHaveLength(6);
      expect(result.connections).toHaveLength(5);
      expect(result.depth).toBe(3);
      expect(result.breadth).toBe(2);

      // Verify branching structure
      const rootConnections = result.connections.filter(
        (conn: NodeConnectionDTO) => conn.toNodeId === 'node_branching_root',
      );
      expect(rootConnections).toHaveLength(2);
    });

    it('should handle subtree with arguments included', async () => {
      // Arrange
      const query: GetSubtreeQuery = {
        documentId: 'doc_subtree_with_args',
        treeId: 'tree_detailed',
        rootNodeId: 'node_detailed_root',
        maxDepth: 2,
      };

      const subtreeWithArgs: TreeStructureDTO = {
        treeId: 'tree_detailed',
        nodes: [
          {
            nodeId: 'node_detailed_root',
            argumentId: 'arg_detailed_root',
            isRoot: true,
            argument: {
              id: createTestAtomicArgumentId('arg_detailed_root'),
              premiseIds: createTestStatementIds('set_detailed_premise'),
              conclusionIds: createTestStatementIds('set_detailed_conclusion'),
              sideLabels: {
                left: createTestSideLabel('Main Theorem'),
                right: createTestSideLabel('Theorem 1'),
              },
            },
          },
          {
            nodeId: 'node_detailed_child',
            argumentId: 'arg_detailed_child',
            isRoot: false,
            argument: {
              id: createTestAtomicArgumentId('arg_detailed_child'),
              premiseIds: createTestStatementIds('set_child_premise'),
              conclusionIds: createTestStatementIds('set_child_conclusion'),
              sideLabels: {
                left: createTestSideLabel('Supporting Lemma'),
                right: createTestSideLabel('Lemma 2'),
              },
            },
          },
        ],
        connections: [
          {
            fromNodeId: 'node_detailed_child',
            toNodeId: 'node_detailed_root',
            premisePosition: 0,
          },
        ],
        depth: 2,
        breadth: 1,
      };

      treeService.getSubtree.mockResolvedValue(subtreeWithArgs);

      // Act
      const result = await treeService.getSubtree(query);

      // Assert
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]?.argument?.id).toBe('arg_detailed_root');
      expect(result.nodes[1]?.argument?.id).toBe('arg_detailed_child');
      expect(result.nodes[0]?.argument?.sideLabels?.left).toBe('Main Theorem');
    });
  });
});
