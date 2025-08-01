import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { AtomicArgument } from '../../../domain/entities/AtomicArgument.js';
import type { Node } from '../../../domain/entities/Node.js';
import type { Statement } from '../../../domain/entities/Statement.js';
import type { Tree } from '../../../domain/entities/Tree.js';
import type { IAtomicArgumentRepository } from '../../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../../domain/repositories/INodeRepository.js';
import {
  AtomicArgumentId,
  NodeId,
  StatementId,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';
import { ProofGraphAdapter } from '../ProofGraphAdapter.js';

describe('ProofGraphAdapter', () => {
  let adapter: ProofGraphAdapter;
  let mockNodeRepository: INodeRepository;
  let mockArgumentRepository: IAtomicArgumentRepository;
  let mockTree: Tree;

  function createMockStatement(id: string): Statement {
    const statement = mock<Statement>();
    statement.getId.mockReturnValue(StatementId.create(id).value);
    return statement;
  }

  function createMockArgument(premises: Statement[], conclusions: Statement[]): AtomicArgument {
    const arg = mock<AtomicArgument>();
    arg.getPremises.mockReturnValue(premises);
    arg.getConclusions.mockReturnValue(conclusions);

    // Setup findConnectionsTo method
    arg.findConnectionsTo.mockImplementation((other) => {
      const connections = [];
      for (let i = 0; i < conclusions.length; i++) {
        for (let j = 0; j < other.getPremises().length; j++) {
          if (conclusions[i] === other.getPremises()[j]) {
            connections.push({
              statement: conclusions[i],
              fromConclusionPosition: i,
              toPremisePosition: j,
            });
          }
        }
      }
      return connections;
    });

    return arg;
  }

  beforeEach(() => {
    mockNodeRepository = mock<INodeRepository>();
    mockArgumentRepository = mock<IAtomicArgumentRepository>();
    adapter = new ProofGraphAdapter(mockNodeRepository, mockArgumentRepository);

    // Setup mock tree
    mockTree = mock<Tree>();
    mockTree.getId.mockReturnValue(TreeId.create('tree1').value);
    mockTree.getNodeIds.mockReturnValue([
      NodeId.create('node1').value,
      NodeId.create('node2').value,
      NodeId.create('node3').value,
    ]);
  });

  describe('buildGraphFromTree', () => {
    it('should build graph from tree with nodes and edges', async () => {
      // Arrange
      const node1 = mock<Node>();
      const node2 = mock<Node>();
      const node3 = mock<Node>();

      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      node3.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg3').value);
      node3.isRoot.mockReturnValue(false);
      node3.isChild.mockReturnValue(true);
      node3.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      const mockAttachment = {
        getPremisePosition: () => 0,
        getFromPosition: () => undefined,
      };
      node2.getAttachment.mockReturnValue(mockAttachment);
      node3.getAttachment.mockReturnValue(mockAttachment);

      mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return node1;
          case 'node2':
            return node2;
          case 'node3':
            return node3;
          default:
            return null;
        }
      });

      // Create statements and arguments using helper functions
      const statement1 = createMockStatement('stmt1');
      const statement2 = createMockStatement('stmt2');
      const statement3 = createMockStatement('stmt3');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], [statement2]);
      const arg3 = createMockArgument([statement1], [statement3]);

      mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
        switch (argId.getValue()) {
          case 'arg1':
            return arg1;
          case 'arg2':
            return arg2;
          case 'arg3':
            return arg3;
          default:
            return null;
        }
      });

      // Act
      const result = await adapter.buildGraphFromTree(mockTree);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockNodeRepository.findById).toHaveBeenCalledTimes(3);
      expect(mockArgumentRepository.findById).toHaveBeenCalledTimes(3);
    });

    it('should handle missing nodes gracefully', async () => {
      // Arrange
      mockNodeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adapter.buildGraphFromTree(mockTree);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Node node1 not found');
    });

    it('should handle missing arguments gracefully', async () => {
      // Arrange
      const node1 = mock<Node>();
      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      mockNodeRepository.findById.mockResolvedValue(node1);
      mockArgumentRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adapter.buildGraphFromTree(mockTree);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Argument arg1 not found');
    });
  });

  describe('findPath', () => {
    beforeEach(async () => {
      // Setup a simple linear graph for path testing
      const node1 = mock<Node>();
      const node2 = mock<Node>();

      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);
      node1.getPosition.mockReturnValue(null);

      node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);
      node2.getPosition.mockReturnValue(null);

      const mockAttachment = {
        getPremisePosition: () => 0,
        getFromPosition: () => undefined,
      };
      node2.getAttachment.mockReturnValue(mockAttachment);

      mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return node1;
          case 'node2':
            return node2;
          default:
            return null;
        }
      });

      // Create statements and arguments for path testing
      const statement1 = createMockStatement('stmt1');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], []);

      mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
        switch (argId.getValue()) {
          case 'arg1':
            return arg1;
          case 'arg2':
            return arg2;
          default:
            return null;
        }
      });

      await adapter.buildGraphFromTree(mockTree);
    });

    it('should find path between connected nodes', () => {
      // Arrange
      const fromNodeId = NodeId.create('node2').value;
      const toNodeId = NodeId.create('node1').value;

      // Act
      const pathResult = adapter.findPath(fromNodeId, toNodeId);

      // Assert
      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        const path = pathResult.value;
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]?.getValue()).toBe('node2');
        expect(path[path.length - 1]?.getValue()).toBe('node1');
      }
    });

    it('should return empty array for disconnected nodes', () => {
      // Arrange
      const fromNodeId = NodeId.create('nonexistent1').value;
      const toNodeId = NodeId.create('nonexistent2').value;

      // Act
      const pathResult = adapter.findPath(fromNodeId, toNodeId);

      // Assert
      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        expect(pathResult.value).toEqual([]);
      }
    });

    it('should handle same source and target', () => {
      // Arrange
      const nodeId = NodeId.create('node1').value;

      // Act
      const pathResult = adapter.findPath(nodeId, nodeId);

      // Assert
      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        expect(pathResult.value).toEqual([nodeId]);
      }
    });
  });

  describe('getSubtree', () => {
    beforeEach(async () => {
      // Setup a tree structure for subtree testing
      const node1 = mock<Node>();
      const node2 = mock<Node>();
      const node3 = mock<Node>();

      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      node3.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg3').value);
      node3.isRoot.mockReturnValue(false);
      node3.isChild.mockReturnValue(true);
      node3.getParentNodeId.mockReturnValue(NodeId.create('node2').value);

      const mockAttachment = {
        getPremisePosition: () => 0,
        getFromPosition: () => undefined,
      };
      node2.getAttachment.mockReturnValue(mockAttachment);
      node3.getAttachment.mockReturnValue(mockAttachment);

      mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return node1;
          case 'node2':
            return node2;
          case 'node3':
            return node3;
          default:
            return null;
        }
      });

      // Create statements and arguments for subtree testing
      const statement1 = createMockStatement('stmt1');
      const statement2 = createMockStatement('stmt2');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], [statement2]);
      const arg3 = createMockArgument([statement2], []);

      mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
        switch (argId.getValue()) {
          case 'arg1':
            return arg1;
          case 'arg2':
            return arg2;
          case 'arg3':
            return arg3;
          default:
            return null;
        }
      });

      await adapter.buildGraphFromTree(mockTree);
    });

    it('should get complete subtree from root', () => {
      // Arrange
      const rootNodeId = NodeId.create('node1').value;

      // Act
      const subtreeResult = adapter.getSubtree(rootNodeId);

      // Assert
      expect(subtreeResult.isOk()).toBe(true);
      if (subtreeResult.isOk()) {
        const subtree = subtreeResult.value;
        expect(subtree.size).toBe(3);
        expect(subtree.has('node1')).toBe(true);
        expect(subtree.has('node2')).toBe(true);
        expect(subtree.has('node3')).toBe(true);
      }
    });

    it('should respect max depth limit', () => {
      // Arrange
      const rootNodeId = NodeId.create('node1').value;
      const maxDepth = 1;

      // Act
      const subtreeResult = adapter.getSubtree(rootNodeId, maxDepth);

      // Assert
      expect(subtreeResult.isOk()).toBe(true);
      if (subtreeResult.isOk()) {
        const subtree = subtreeResult.value;
        expect(subtree.size).toBeLessThanOrEqual(2);
        expect(subtree.has('node1')).toBe(true);

        for (const [_nodeId, { depth }] of subtree) {
          expect(depth).toBeLessThanOrEqual(maxDepth);
        }
      }
    });

    it('should return single node for max depth 0', () => {
      // Arrange
      const rootNodeId = NodeId.create('node1').value;
      const maxDepth = 0;

      // Act
      const subtreeResult = adapter.getSubtree(rootNodeId, maxDepth);

      // Assert
      expect(subtreeResult.isOk()).toBe(true);
      if (subtreeResult.isOk()) {
        const subtree = subtreeResult.value;
        expect(subtree.size).toBe(1);
        expect(subtree.has('node1')).toBe(true);
        expect(subtree.get('node1')?.depth).toBe(0);
      }
    });
  });

  describe('hasCycles', () => {
    it('should detect cycles in parent-child relationships', async () => {
      // Arrange - create a cyclic structure
      const node1 = mock<Node>();
      const node2 = mock<Node>();

      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(false);
      node1.isChild.mockReturnValue(true);
      node1.getParentNodeId.mockReturnValue(NodeId.create('node2').value);

      node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      const mockAttachment = {
        getPremisePosition: () => 0,
        getFromPosition: () => undefined,
      };
      node1.getAttachment.mockReturnValue(mockAttachment);
      node2.getAttachment.mockReturnValue(mockAttachment);

      mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return node1;
          case 'node2':
            return node2;
          default:
            return null;
        }
      });

      // Create statements and arguments for cycle testing
      const statement1 = createMockStatement('stmt1');
      const statement2 = createMockStatement('stmt2');

      const arg1 = createMockArgument([statement1], [statement2]);
      const arg2 = createMockArgument([statement2], [statement1]);

      mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
        switch (argId.getValue()) {
          case 'arg1':
            return arg1;
          case 'arg2':
            return arg2;
          default:
            return null;
        }
      });

      mockTree.getNodeIds.mockReturnValue([
        NodeId.create('node1').value,
        NodeId.create('node2').value,
      ]);

      await adapter.buildGraphFromTree(mockTree);

      // Act
      const cycleResult = adapter.detectCycles(TreeId.create('tree1').value);

      // Assert
      expect(cycleResult.isOk()).toBe(true);
      if (cycleResult.isOk()) {
        expect(cycleResult.value).toBe(true);
      }
    });

    it('should not detect cycles in acyclic structures', async () => {
      // Arrange - use the default linear structure
      const node1 = mock<Node>();
      const node2 = mock<Node>();

      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      const mockAttachment = {
        getPremisePosition: () => 0,
        getFromPosition: () => undefined,
      };
      node2.getAttachment.mockReturnValue(mockAttachment);

      mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return node1;
          case 'node2':
            return node2;
          default:
            return null;
        }
      });

      // Create statements and arguments for acyclic testing
      const statement1 = createMockStatement('stmt1');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], []);

      mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
        switch (argId.getValue()) {
          case 'arg1':
            return arg1;
          case 'arg2':
            return arg2;
          default:
            return null;
        }
      });

      mockTree.getNodeIds.mockReturnValue([
        NodeId.create('node1').value,
        NodeId.create('node2').value,
      ]);

      await adapter.buildGraphFromTree(mockTree);

      // Act
      const cycleResult = adapter.detectCycles(TreeId.create('tree1').value);

      // Assert
      expect(cycleResult.isOk()).toBe(true);
      if (cycleResult.isOk()) {
        expect(cycleResult.value).toBe(false);
      }
    });
  });

  describe('getTreeMetrics', () => {
    beforeEach(async () => {
      // Setup a tree structure for metrics testing
      const node1 = mock<Node>();
      const node2 = mock<Node>();
      const node3 = mock<Node>();

      node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      node3.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg3').value);
      node3.isRoot.mockReturnValue(false);
      node3.isChild.mockReturnValue(true);
      node3.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

      const mockAttachment = {
        getPremisePosition: () => 0,
        getFromPosition: () => undefined,
      };
      node2.getAttachment.mockReturnValue(mockAttachment);
      node3.getAttachment.mockReturnValue(mockAttachment);

      mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return node1;
          case 'node2':
            return node2;
          case 'node3':
            return node3;
          default:
            return null;
        }
      });

      // Create statements and arguments for metrics testing
      const statement1 = createMockStatement('stmt1');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], []);
      const arg3 = createMockArgument([statement1], []);

      mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
        switch (argId.getValue()) {
          case 'arg1':
            return arg1;
          case 'arg2':
            return arg2;
          case 'arg3':
            return arg3;
          default:
            return null;
        }
      });

      await adapter.buildGraphFromTree(mockTree);
    });

    it('should compute correct tree metrics', () => {
      // Act
      const metricsResult = adapter.getTreeMetrics(TreeId.create('tree1').value);

      // Assert
      expect(metricsResult.isOk()).toBe(true);
      if (metricsResult.isOk()) {
        const metrics = metricsResult.value;
        expect(metrics.nodeCount).toBe(3);
        expect(metrics.depth).toBeGreaterThan(0);
        expect(metrics.breadth).toBeGreaterThan(0);
        expect(metrics.leafCount).toBeGreaterThan(0);
      }
    });

    it('should return zero metrics for empty tree', () => {
      // Act
      const metricsResult = adapter.getTreeMetrics(TreeId.create('nonexistent').value);

      // Assert
      expect(metricsResult.isOk()).toBe(true);
      if (metricsResult.isOk()) {
        const metrics = metricsResult.value;
        expect(metrics.nodeCount).toBe(0);
        expect(metrics.depth).toBe(0);
        expect(metrics.breadth).toBe(0);
        expect(metrics.leafCount).toBe(0);
      }
    });
  });

  describe('new interface methods', () => {
    describe('findPaths', () => {
      it('should find paths for multiple node pairs', async () => {
        const node1 = mock<Node>();
        const node2 = mock<Node>();

        node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
        node1.isRoot.mockReturnValue(true);
        node1.isChild.mockReturnValue(false);

        node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
        node2.isRoot.mockReturnValue(false);
        node2.isChild.mockReturnValue(true);
        node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

        const mockAttachment = {
          getPremisePosition: () => 0,
          getFromPosition: () => undefined,
        };
        node2.getAttachment.mockReturnValue(mockAttachment);

        mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
          switch (nodeId.getValue()) {
            case 'node1':
              return node1;
            case 'node2':
              return node2;
            default:
              return null;
          }
        });

        const statement1 = createMockStatement('stmt1');
        const arg1 = createMockArgument([], [statement1]);
        const arg2 = createMockArgument([statement1], []);

        mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return arg1;
            case 'arg2':
              return arg2;
            default:
              return null;
          }
        });

        mockTree.getNodeIds.mockReturnValue([
          NodeId.create('node1').value,
          NodeId.create('node2').value,
        ]);

        await adapter.buildGraphFromTree(mockTree);

        const nodePairs = [
          { from: NodeId.create('node1').value, to: NodeId.create('node2').value },
          { from: NodeId.create('node2').value, to: NodeId.create('node1').value },
        ];

        const result = adapter.findPaths(nodePairs);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const paths = result.value;
          expect(paths.size).toBe(2);
        }
      });
    });

    describe('areNodesConnectedBatch', () => {
      it('should check connectivity for multiple node pairs', async () => {
        const node1 = mock<Node>();
        const node2 = mock<Node>();

        node1.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg1').value);
        node1.isRoot.mockReturnValue(true);
        node1.isChild.mockReturnValue(false);

        node2.getArgumentId.mockReturnValue(AtomicArgumentId.create('arg2').value);
        node2.isRoot.mockReturnValue(false);
        node2.isChild.mockReturnValue(true);
        node2.getParentNodeId.mockReturnValue(NodeId.create('node1').value);

        const mockAttachment = {
          getPremisePosition: () => 0,
          getFromPosition: () => undefined,
        };
        node2.getAttachment.mockReturnValue(mockAttachment);

        mockNodeRepository.findById.mockImplementation(async (nodeId: NodeId) => {
          switch (nodeId.getValue()) {
            case 'node1':
              return node1;
            case 'node2':
              return node2;
            default:
              return null;
          }
        });

        const statement1 = createMockStatement('stmt1');
        const arg1 = createMockArgument([], [statement1]);
        const arg2 = createMockArgument([statement1], []);

        mockArgumentRepository.findById.mockImplementation(async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return arg1;
            case 'arg2':
              return arg2;
            default:
              return null;
          }
        });

        mockTree.getNodeIds.mockReturnValue([
          NodeId.create('node1').value,
          NodeId.create('node2').value,
        ]);

        await adapter.buildGraphFromTree(mockTree);

        const nodePairs = [
          { nodeId1: NodeId.create('node1').value, nodeId2: NodeId.create('node2').value },
          { nodeId1: NodeId.create('node2').value, nodeId2: NodeId.create('node1').value },
        ];

        const result = adapter.areNodesConnectedBatch(nodePairs);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectivity = result.value;
          expect(connectivity.size).toBe(2);
        }
      });
    });

    describe('getPerformanceMetrics', () => {
      it('should return performance metrics', async () => {
        const result = adapter.getPerformanceMetrics();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const metrics = result.value;
          expect(metrics).toHaveProperty('buildTime');
          expect(metrics).toHaveProperty('nodeCount');
          expect(metrics).toHaveProperty('edgeCount');
          expect(metrics).toHaveProperty('lastBuildTimestamp');
          expect(metrics).toHaveProperty('memoryUsage');
          expect(metrics).toHaveProperty('operationCounts');
          expect(metrics.operationCounts).toHaveProperty('pathFinds');
          expect(metrics.operationCounts).toHaveProperty('cycleDetections');
          expect(metrics.operationCounts).toHaveProperty('subtreeQueries');
          expect(metrics.operationCounts).toHaveProperty('connectivityChecks');
        }
      });
    });
  });
});
