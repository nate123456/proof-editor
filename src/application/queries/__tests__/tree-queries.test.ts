/**
 * Tree query DTO validation tests and integration scenarios
 *
 * This file contains DTO validation tests and integration scenarios that were
 * not moved to the focused test files. The main query execution tests have been
 * split into focused files:
 * - tree-basic-queries.test.ts
 * - tree-structure-queries.test.ts
 * - tree-navigation-queries.test.ts
 * - tree-query-validation.test.ts
 * - tree-query-error-handling.test.ts
 * - tree-query-performance.test.ts
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
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
          premiseIds: ['stmt_1', 'stmt_2'],
          conclusionIds: ['stmt_3'],
          sideLabels: {
            left: 'Rule Name',
            right: 'Reference',
          },
        },
      };

      expect(node.argument?.id).toBe('arg_with_details');
      expect(node.argument?.premiseIds).toEqual(['stmt_1', 'stmt_2']);
      expect(node.argument?.conclusionIds).toEqual(['stmt_3']);
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
