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
  type Attachment,
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
    const idResult = StatementId.create(id);
    if (idResult.isErr()) throw new Error(`Invalid statement ID: ${id}`);
    statement.getId.mockReturnValue(idResult.value);
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
          const otherPremise = other.getPremises()[j];
          if (otherPremise && conclusions[i] === otherPremise) {
            connections.push({
              statement: conclusions[i],
              fromConclusionPosition: i,
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
    const treeIdResult = TreeId.create('tree1');
    if (treeIdResult.isErr()) throw new Error('Invalid tree ID');
    mockTree.getId.mockReturnValue(treeIdResult.value);

    const nodeIds = ['node1', 'node2', 'node3'].map((id) => {
      const result = NodeId.create(id);
      if (result.isErr()) throw new Error(`Invalid node ID: ${id}`);
      return result.value;
    });
    mockTree.getNodeIds.mockReturnValue(nodeIds);
  });

  describe('buildGraphFromTree', () => {
    it('should build graph from tree with nodes and edges', async () => {
      // Arrange
      const node1 = mock<Node>();
      const node2 = mock<Node>();
      const node3 = mock<Node>();

      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      node3.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg3');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node3.isRoot.mockReturnValue(false);
      node3.isChild.mockReturnValue(true);
      node3.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      const mockAttachment = mock<Attachment>();
      mockAttachment.getPremisePosition.mockReturnValue(0);
      mockAttachment.getFromPosition.mockReturnValue(undefined);
      mockAttachment.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      mockAttachment.hasMultipleConclusionSource.mockReturnValue(false);
      mockAttachment.equals.mockReturnValue(false);
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
      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
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

      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      const mockAttachment = mock<Attachment>();
      mockAttachment.getPremisePosition.mockReturnValue(0);
      mockAttachment.getFromPosition.mockReturnValue(undefined);
      mockAttachment.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      mockAttachment.hasMultipleConclusionSource.mockReturnValue(false);
      mockAttachment.equals.mockReturnValue(false);
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
      const fromNodeId = (() => {
        const r = NodeId.create('node2');
        if (r.isErr()) throw new Error('Invalid ID');
        return r.value;
      })();
      const toNodeId = (() => {
        const r = NodeId.create('node1');
        if (r.isErr()) throw new Error('Invalid ID');
        return r.value;
      })();

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
      const nodeId = (() => {
        const r = NodeId.create('node1');
        if (r.isErr()) throw new Error('Invalid ID');
        return r.value;
      })();

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

      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      node3.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg3');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node3.isRoot.mockReturnValue(false);
      node3.isChild.mockReturnValue(true);
      node3.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      const mockAttachment = mock<Attachment>();
      mockAttachment.getPremisePosition.mockReturnValue(0);
      mockAttachment.getFromPosition.mockReturnValue(undefined);
      mockAttachment.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      mockAttachment.hasMultipleConclusionSource.mockReturnValue(false);
      mockAttachment.equals.mockReturnValue(false);
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
      const rootNodeId = (() => {
        const r = NodeId.create('node1');
        if (r.isErr()) throw new Error('Invalid ID');
        return r.value;
      })();

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
      const rootNodeId = (() => {
        const r = NodeId.create('node1');
        if (r.isErr()) throw new Error('Invalid ID');
        return r.value;
      })();
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
      const rootNodeId = (() => {
        const r = NodeId.create('node1');
        if (r.isErr()) throw new Error('Invalid ID');
        return r.value;
      })();
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

      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node1.isRoot.mockReturnValue(false);
      node1.isChild.mockReturnValue(true);
      node1.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      node2.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      const mockAttachment = mock<Attachment>();
      mockAttachment.getPremisePosition.mockReturnValue(0);
      mockAttachment.getFromPosition.mockReturnValue(undefined);
      mockAttachment.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      mockAttachment.hasMultipleConclusionSource.mockReturnValue(false);
      mockAttachment.equals.mockReturnValue(false);
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
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
        (() => {
          const r = NodeId.create('node2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      ]);

      await adapter.buildGraphFromTree(mockTree);

      // Act
      const cycleResult = adapter.detectCycles(
        (() => {
          const r = TreeId.create('tree1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

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

      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      const mockAttachment = mock<Attachment>();
      mockAttachment.getPremisePosition.mockReturnValue(0);
      mockAttachment.getFromPosition.mockReturnValue(undefined);
      mockAttachment.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      mockAttachment.hasMultipleConclusionSource.mockReturnValue(false);
      mockAttachment.equals.mockReturnValue(false);
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
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
        (() => {
          const r = NodeId.create('node2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      ]);

      await adapter.buildGraphFromTree(mockTree);

      // Act
      const cycleResult = adapter.detectCycles(
        (() => {
          const r = TreeId.create('tree1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

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

      node1.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node1.isRoot.mockReturnValue(true);
      node1.isChild.mockReturnValue(false);

      node2.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg2');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node2.isRoot.mockReturnValue(false);
      node2.isChild.mockReturnValue(true);
      node2.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      node3.getArgumentId.mockReturnValue(
        (() => {
          const r = AtomicArgumentId.create('arg3');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      node3.isRoot.mockReturnValue(false);
      node3.isChild.mockReturnValue(true);
      node3.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

      const mockAttachment = mock<Attachment>();
      mockAttachment.getPremisePosition.mockReturnValue(0);
      mockAttachment.getFromPosition.mockReturnValue(undefined);
      mockAttachment.getParentNodeId.mockReturnValue(
        (() => {
          const r = NodeId.create('node1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );
      mockAttachment.hasMultipleConclusionSource.mockReturnValue(false);
      mockAttachment.equals.mockReturnValue(false);
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
      const metricsResult = adapter.getTreeMetrics(
        (() => {
          const r = TreeId.create('tree1');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

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
      const metricsResult = adapter.getTreeMetrics(
        (() => {
          const r = TreeId.create('nonexistent');
          if (r.isErr()) throw new Error('Invalid ID');
          return r.value;
        })(),
      );

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

        node1.getArgumentId.mockReturnValue(
          (() => {
            const r = AtomicArgumentId.create('arg1');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        );
        node1.isRoot.mockReturnValue(true);
        node1.isChild.mockReturnValue(false);

        node2.getArgumentId.mockReturnValue(
          (() => {
            const r = AtomicArgumentId.create('arg2');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        );
        node2.isRoot.mockReturnValue(false);
        node2.isChild.mockReturnValue(true);
        node2.getParentNodeId.mockReturnValue(
          (() => {
            const r = NodeId.create('node1');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        );

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
          (() => {
            const r = NodeId.create('node1');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
          (() => {
            const r = NodeId.create('node2');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        ]);

        await adapter.buildGraphFromTree(mockTree);

        const nodePairs = [
          {
            from: (() => {
              const r = NodeId.create('node1');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
            to: (() => {
              const r = NodeId.create('node2');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
          },
          {
            from: (() => {
              const r = NodeId.create('node2');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
            to: (() => {
              const r = NodeId.create('node1');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
          },
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

        node1.getArgumentId.mockReturnValue(
          (() => {
            const r = AtomicArgumentId.create('arg1');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        );
        node1.isRoot.mockReturnValue(true);
        node1.isChild.mockReturnValue(false);

        node2.getArgumentId.mockReturnValue(
          (() => {
            const r = AtomicArgumentId.create('arg2');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        );
        node2.isRoot.mockReturnValue(false);
        node2.isChild.mockReturnValue(true);
        node2.getParentNodeId.mockReturnValue(
          (() => {
            const r = NodeId.create('node1');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        );

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
          (() => {
            const r = NodeId.create('node1');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
          (() => {
            const r = NodeId.create('node2');
            if (r.isErr()) throw new Error('Invalid ID');
            return r.value;
          })(),
        ]);

        await adapter.buildGraphFromTree(mockTree);

        const nodePairs = [
          {
            nodeId1: (() => {
              const r = NodeId.create('node1');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
            nodeId2: (() => {
              const r = NodeId.create('node2');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
          },
          {
            nodeId1: (() => {
              const r = NodeId.create('node2');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
            nodeId2: (() => {
              const r = NodeId.create('node1');
              if (r.isErr()) throw new Error('Invalid ID');
              return r.value;
            })(),
          },
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
