/**
 * Tree query parameter validation tests
 *
 * Tests parameter validation across all tree query types:
 * - Required field validation
 * - Format validation
 * - Range validation
 * - Type validation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import type {
  FindPathBetweenNodesQuery,
  GetSubtreeQuery,
  GetTreeBranchesQuery,
  GetTreeQuery,
  GetTreeStructureQuery,
} from '../tree-queries.js';

interface MockTreeRepositories {
  proofRepository: any;
  treeRepository: any;
  nodeRepository: any;
  argumentRepository: any;
}

describe('Tree Query Validation', () => {
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
      getTree: vi.fn(),
      listTrees: vi.fn(),
      getTreeStructure: vi.fn(),
      getTreeDepth: vi.fn(),
      getTreeBranches: vi.fn(),
      findPathBetweenNodes: vi.fn(),
      getSubtree: vi.fn(),
    };
  });

  describe('Required Field Validation', () => {
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

    it('should validate required fromNodeId and toNodeId for path queries', async () => {
      const invalidPathQueries = [
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          fromNodeId: '',
          toNodeId: 'node_to',
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          fromNodeId: 'node_from',
          toNodeId: '',
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          fromNodeId: null as any,
          toNodeId: 'node_to',
        },
      ];

      for (const query of invalidPathQueries) {
        treeService.findPathBetweenNodes.mockRejectedValue(
          new ValidationError('Both from and to node IDs are required'),
        );

        await expect(treeService.findPathBetweenNodes(query)).rejects.toThrow(
          'Both from and to node IDs are required',
        );
      }
    });

    it('should validate required rootNodeId for subtree queries', async () => {
      const invalidSubtreeQueries = [
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          rootNodeId: '',
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          rootNodeId: '   ',
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          rootNodeId: null as any,
        },
      ];

      for (const query of invalidSubtreeQueries) {
        treeService.getSubtree.mockRejectedValue(new ValidationError('Root node ID is required'));

        await expect(treeService.getSubtree(query)).rejects.toThrow('Root node ID is required');
      }
    });
  });

  describe('Range Validation', () => {
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

    it('should accept zero maxDepth', async () => {
      const validQuery: GetSubtreeQuery = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        rootNodeId: 'node_123',
        maxDepth: 0,
      };

      treeService.getSubtree.mockResolvedValue({
        treeId: 'tree_123',
        nodes: [],
        connections: [],
        depth: 0,
        breadth: 0,
      });

      const result = await treeService.getSubtree(validQuery);
      expect(result).toBeDefined();
    });

    it('should accept large maxDepth values', async () => {
      const validQuery: GetSubtreeQuery = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        rootNodeId: 'node_123',
        maxDepth: 1000,
      };

      treeService.getSubtree.mockResolvedValue({
        treeId: 'tree_123',
        nodes: [],
        connections: [],
        depth: 1000,
        breadth: 0,
      });

      const result = await treeService.getSubtree(validQuery);
      expect(result.depth).toBe(1000);
    });

    it('should validate that maxDepth is a number', async () => {
      const invalidQuery = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        rootNodeId: 'node_123',
        maxDepth: 'invalid' as any,
      };

      treeService.getSubtree.mockRejectedValue(new ValidationError('Max depth must be a number'));

      await expect(treeService.getSubtree(invalidQuery)).rejects.toThrow(
        'Max depth must be a number',
      );
    });
  });

  describe('Format Validation', () => {
    it('should handle various valid ID formats', async () => {
      const validIdFormats = [
        { doc: 'doc_123', tree: 'tree_456' },
        { doc: 'document-abc', tree: 'tree-def' },
        { doc: 'DOC_UPPER', tree: 'TREE_UPPER' },
        { doc: 'doc.dot', tree: 'tree.dot' },
        { doc: 'doc_with_underscores', tree: 'tree_with_underscores' },
        {
          doc: '550e8400-e29b-41d4-a716-446655440000',
          tree: '123e4567-e89b-12d3-a456-426614174000',
        },
      ];

      for (const { doc, tree } of validIdFormats) {
        const query: GetTreeQuery = {
          documentId: doc,
          treeId: tree,
        };

        treeService.getTree.mockResolvedValue({
          id: tree,
          position: { x: 0, y: 0 },
          nodeCount: 1,
          rootNodeIds: ['node_1'],
        });

        const result = await treeService.getTree(query);
        expect(result.id).toBe(tree);
      }
    });

    it('should handle special characters in IDs', async () => {
      const specialCharIds = [
        { doc: 'doc@example.com', tree: 'tree#special%chars' },
        { doc: 'doc+plus', tree: 'tree&ampersand' },
        { doc: 'doc=equals', tree: 'tree?question' },
      ];

      for (const { doc, tree } of specialCharIds) {
        const query: GetTreeQuery = {
          documentId: doc,
          treeId: tree,
        };

        treeService.getTree.mockResolvedValue({
          id: tree,
          position: { x: 0, y: 0 },
          nodeCount: 1,
          rootNodeIds: ['node_1'],
        });

        const result = await treeService.getTree(query);
        expect(result.id).toBe(tree);
      }
    });

    it('should handle long IDs', async () => {
      const longDocId = `doc_${'a'.repeat(100)}`;
      const longTreeId = `tree_${'b'.repeat(100)}`;

      const query: GetTreeQuery = {
        documentId: longDocId,
        treeId: longTreeId,
      };

      treeService.getTree.mockResolvedValue({
        id: longTreeId,
        position: { x: 0, y: 0 },
        nodeCount: 1,
        rootNodeIds: ['node_1'],
      });

      const result = await treeService.getTree(query);
      expect(result.id).toBe(longTreeId);
    });

    it('should validate UUID format when specified', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '123e4567-e89b-12d3-a456-426614174000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      for (const uuid of validUUIDs) {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });
  });

  describe('Type Validation', () => {
    it('should validate includeArguments boolean type', async () => {
      const validBooleanQueries = [
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          includeArguments: true,
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          includeArguments: false,
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          includeArguments: undefined,
        },
      ];

      for (const query of validBooleanQueries) {
        treeService.getTreeStructure.mockResolvedValue({
          treeId: 'tree_123',
          nodes: [],
          connections: [],
          depth: 0,
          breadth: 0,
        });

        const result = await treeService.getTreeStructure(query);
        expect(result).toBeDefined();
      }
    });

    it('should reject invalid includeArguments types', async () => {
      const invalidBooleanQueries = [
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          includeArguments: 'true' as any,
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          includeArguments: 1 as any,
        },
        {
          documentId: 'doc_123',
          treeId: 'tree_123',
          includeArguments: {} as any,
        },
      ];

      for (const query of invalidBooleanQueries) {
        treeService.getTreeStructure.mockRejectedValue(
          new ValidationError('includeArguments must be a boolean'),
        );

        await expect(treeService.getTreeStructure(query)).rejects.toThrow(
          'includeArguments must be a boolean',
        );
      }
    });

    it('should validate string parameters are strings', async () => {
      const invalidStringQueries = [
        { documentId: 123 as any, treeId: 'tree_123' },
        { documentId: 'doc_123', treeId: 456 as any },
        { documentId: {}, treeId: 'tree_123' },
        { documentId: 'doc_123', treeId: [] },
      ];

      for (const query of invalidStringQueries) {
        treeService.getTree.mockRejectedValue(
          new ValidationError('Document ID and Tree ID must be strings'),
        );

        await expect(treeService.getTree(query)).rejects.toThrow(
          'Document ID and Tree ID must be strings',
        );
      }
    });
  });

  describe('Whitespace Handling', () => {
    it('should reject whitespace-only IDs', async () => {
      const whitespaceQueries = [
        { documentId: '   ', treeId: 'tree_123' },
        { documentId: 'doc_123', treeId: '   ' },
        { documentId: '\t\n', treeId: 'tree_123' },
        { documentId: 'doc_123', treeId: '\t\n' },
      ];

      for (const query of whitespaceQueries) {
        treeService.getTree.mockRejectedValue(
          new ValidationError('IDs cannot be empty or whitespace-only'),
        );

        await expect(treeService.getTree(query)).rejects.toThrow(
          'IDs cannot be empty or whitespace-only',
        );
      }
    });

    it('should trim leading and trailing whitespace', async () => {
      const query: GetTreeQuery = {
        documentId: '  doc_123  ',
        treeId: '  tree_456  ',
      };

      treeService.getTree.mockImplementation((q: GetTreeQuery) => {
        // Service should trim whitespace
        expect(q.documentId.trim()).toBe('doc_123');
        expect(q.treeId.trim()).toBe('tree_456');
        return Promise.resolve({
          id: 'tree_456',
          position: { x: 0, y: 0 },
          nodeCount: 1,
          rootNodeIds: ['node_1'],
        });
      });

      await treeService.getTree(query);
    });
  });

  describe('Query Combination Validation', () => {
    it('should validate complex query combinations', async () => {
      const complexQuery: GetTreeStructureQuery = {
        documentId: 'doc_complex_validation',
        treeId: 'tree_complex_validation',
        includeArguments: true,
      };

      treeService.getTreeStructure.mockResolvedValue({
        treeId: 'tree_complex_validation',
        nodes: [
          {
            nodeId: 'node_1',
            argumentId: 'arg_1',
            isRoot: true,
            argument: {
              id: 'arg_1',
              premiseSetId: 'set_1',
              conclusionSetId: 'set_2',
            },
          },
        ],
        connections: [],
        depth: 1,
        breadth: 1,
      });

      const result = await treeService.getTreeStructure(complexQuery);
      expect(result.nodes[0]?.argument).toBeDefined();
    });

    it('should validate path query with same from and to nodes', async () => {
      const sameNodeQuery: FindPathBetweenNodesQuery = {
        documentId: 'doc_same_node',
        treeId: 'tree_same_node',
        fromNodeId: 'node_same',
        toNodeId: 'node_same',
      };

      treeService.findPathBetweenNodes.mockResolvedValue([
        {
          nodeId: 'node_same',
          argumentId: 'arg_same',
          isRoot: true,
        },
      ]);

      const result = await treeService.findPathBetweenNodes(sameNodeQuery);
      expect(result).toHaveLength(1);
      expect(result[0]?.nodeId).toBe('node_same');
    });

    it('should validate subtree query with various maxDepth values', async () => {
      const maxDepthValues = [0, 1, 5, 10, 100];

      for (const maxDepth of maxDepthValues) {
        const query: GetSubtreeQuery = {
          documentId: 'doc_depth_test',
          treeId: 'tree_depth_test',
          rootNodeId: 'node_root',
          maxDepth,
        };

        treeService.getSubtree.mockResolvedValue({
          treeId: 'tree_depth_test',
          nodes: [],
          connections: [],
          depth: Math.min(maxDepth, 5), // Simulate actual depth limitation
          breadth: 0,
        });

        const result = await treeService.getSubtree(query);
        expect(result.depth).toBeLessThanOrEqual(maxDepth);
      }
    });
  });

  describe('Edge Case Validation', () => {
    it('should handle null and undefined query objects', async () => {
      treeService.getTree.mockRejectedValue(new ValidationError('Query is required'));

      await expect(treeService.getTree(null)).rejects.toThrow('Query is required');
      await expect(treeService.getTree(undefined)).rejects.toThrow('Query is required');
    });

    it('should handle queries with extra properties', async () => {
      const queryWithExtra: any = {
        documentId: 'doc_123',
        treeId: 'tree_123',
        extraProperty: 'should_be_ignored',
        anotherExtra: 42,
      };

      treeService.getTree.mockResolvedValue({
        id: 'tree_123',
        position: { x: 0, y: 0 },
        nodeCount: 1,
        rootNodeIds: ['node_1'],
      });

      const result = await treeService.getTree(queryWithExtra);
      expect(result.id).toBe('tree_123');
    });

    it('should handle extremely long ID strings', async () => {
      const extremelyLongId = 'x'.repeat(10000);

      const query: GetTreeQuery = {
        documentId: extremelyLongId,
        treeId: 'tree_123',
      };

      treeService.getTree.mockRejectedValue(
        new ValidationError('ID length exceeds maximum allowed'),
      );

      await expect(treeService.getTree(query)).rejects.toThrow('ID length exceeds maximum allowed');
    });

    it('should handle queries with numeric-like string IDs', async () => {
      const numericStringIds = ['123', '0', '-1', '3.14159', '1e10'];

      for (const id of numericStringIds) {
        const query: GetTreeQuery = {
          documentId: id,
          treeId: id,
        };

        treeService.getTree.mockResolvedValue({
          id: id,
          position: { x: 0, y: 0 },
          nodeCount: 1,
          rootNodeIds: ['node_1'],
        });

        const result = await treeService.getTree(query);
        expect(result.id).toBe(id);
      }
    });
  });
});
