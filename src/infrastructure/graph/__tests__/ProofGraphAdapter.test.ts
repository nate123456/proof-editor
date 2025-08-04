import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    const idResult = StatementId.create(id);
    if (idResult.isErr()) throw new Error(`Invalid statement ID: ${id}`);

    return {
      getId: vi.fn().mockReturnValue(idResult.value),
      getContent: vi.fn().mockReturnValue('test content'),
      equals: vi.fn().mockImplementation((other: Statement) => other.getId().getValue() === id),
    } as unknown as Statement;
  }

  function createMockArgument(premises: Statement[], conclusions: Statement[]): AtomicArgument {
    const argId = AtomicArgumentId.create(`arg-${Date.now()}-${Math.random()}`);
    if (argId.isErr()) throw new Error('Failed to create argument ID');

    return {
      getId: vi.fn().mockReturnValue(argId.value),
      getPremises: vi.fn().mockReturnValue(premises),
      getConclusions: vi.fn().mockReturnValue(conclusions),
      getPremiseCount: vi.fn().mockReturnValue(premises.length),
      getConclusionCount: vi.fn().mockReturnValue(conclusions.length),
      getPremiseAt: vi.fn().mockImplementation((index: number) => premises[index]),
      getConclusionAt: vi.fn().mockImplementation((index: number) => conclusions[index]),
      equals: vi.fn().mockReturnValue(false),
      setConclusionAt: vi.fn().mockReturnValue({ isOk: () => true }),
      setPremiseAt: vi.fn().mockReturnValue({ isOk: () => true }),
    } as unknown as AtomicArgument;
  }

  beforeEach(() => {
    mockNodeRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findByTreeId: vi.fn(),
    } as unknown as INodeRepository;

    mockArgumentRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findByIds: vi.fn(),
    } as unknown as IAtomicArgumentRepository;

    adapter = new ProofGraphAdapter(mockNodeRepository, mockArgumentRepository);

    // Setup mock tree
    const treeIdResult = TreeId.create('tree1');
    if (treeIdResult.isErr()) throw new Error('Invalid tree ID');

    const nodeIds = ['node1', 'node2', 'node3'].map((id) => {
      const result = NodeId.create(id);
      if (result.isErr()) throw new Error(`Invalid node ID: ${id}`);
      return result.value;
    });

    mockTree = {
      getId: vi.fn().mockReturnValue(treeIdResult.value),
      getNodeIds: vi.fn().mockReturnValue(nodeIds),
    } as unknown as Tree;
  });

  describe('buildGraphFromTree', () => {
    it('should build graph from tree with nodes and edges', async () => {
      // Arrange
      const node1ArgId = AtomicArgumentId.create('arg1');
      const node2ArgId = AtomicArgumentId.create('arg2');
      const node3ArgId = AtomicArgumentId.create('arg3');
      if (node1ArgId.isErr() || node2ArgId.isErr() || node3ArgId.isErr()) {
        throw new Error('Failed to create argument IDs');
      }

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(node1ArgId.value),
        isRoot: vi.fn().mockReturnValue(true),
        isChild: vi.fn().mockReturnValue(false),
        getParentNodeId: vi.fn().mockReturnValue(undefined),
        getAttachment: vi.fn().mockReturnValue(undefined),
      } as unknown as Node;

      const parentNodeId1 = NodeId.create('node1');
      if (parentNodeId1.isErr()) throw new Error('Invalid parent ID');

      const node2 = {
        getArgumentId: vi.fn().mockReturnValue(node2ArgId.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId1.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const node3 = {
        getArgumentId: vi.fn().mockReturnValue(node3ArgId.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId1.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const mockAttachment = {
        getPremisePosition: vi.fn().mockReturnValue(0),
        getFromPosition: vi.fn().mockReturnValue(undefined),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId1.value),
        hasMultipleConclusionSource: vi.fn().mockReturnValue(false),
        equals: vi.fn().mockReturnValue(false),
      } as unknown as Attachment;

      (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);
      (node3.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

      vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return { isOk: () => true, isErr: () => false, value: node1 } as any;
          case 'node2':
            return { isOk: () => true, isErr: () => false, value: node2 } as any;
          case 'node3':
            return { isOk: () => true, isErr: () => false, value: node3 } as any;
          default:
            return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
        }
      });

      // Create statements and arguments using helper functions
      const statement1 = createMockStatement('stmt1');
      const statement2 = createMockStatement('stmt2');
      const statement3 = createMockStatement('stmt3');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], [statement2]);
      const arg3 = createMockArgument([statement1], [statement3]);

      vi.mocked(mockArgumentRepository.findById).mockImplementation(
        async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return { isOk: () => true, isErr: () => false, value: arg1 } as any;
            case 'arg2':
              return { isOk: () => true, isErr: () => false, value: arg2 } as any;
            case 'arg3':
              return { isOk: () => true, isErr: () => false, value: arg3 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        },
      );

      // Act
      const result = await adapter.buildGraphFromTree(mockTree);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockNodeRepository.findById).toHaveBeenCalledTimes(3);
      expect(mockArgumentRepository.findById).toHaveBeenCalledTimes(3);
    });

    it('should handle missing nodes gracefully', async () => {
      // Arrange
      vi.mocked(mockNodeRepository.findById).mockResolvedValue({
        isOk: () => false,
        isErr: () => true,
        error: new Error('Not found'),
      } as any);

      // Act
      const result = await adapter.buildGraphFromTree(mockTree);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Node node1 not found');
      }
    });

    it('should handle missing arguments gracefully', async () => {
      // Arrange
      const argId = AtomicArgumentId.create('arg1');
      if (argId.isErr()) throw new Error('Invalid ID');

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(argId.value),
        isRoot: vi.fn().mockReturnValue(true),
        isChild: vi.fn().mockReturnValue(false),
        getParentNodeId: vi.fn().mockReturnValue(undefined),
        getAttachment: vi.fn().mockReturnValue(undefined),
      } as unknown as Node;

      vi.mocked(mockNodeRepository.findById).mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
        value: node1,
      } as any);

      vi.mocked(mockArgumentRepository.findById).mockResolvedValue({
        isOk: () => false,
        isErr: () => true,
        error: new Error('Not found'),
      } as any);

      // Act
      const result = await adapter.buildGraphFromTree(mockTree);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Argument arg1 not found');
      }
    });
  });

  describe('findPath', () => {
    beforeEach(async () => {
      // Setup a simple linear graph for path testing
      const arg1Id = AtomicArgumentId.create('arg1');
      const arg2Id = AtomicArgumentId.create('arg2');
      if (arg1Id.isErr() || arg2Id.isErr()) throw new Error('Invalid argument IDs');

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
        isRoot: vi.fn().mockReturnValue(true),
        isChild: vi.fn().mockReturnValue(false),
        getParentNodeId: vi.fn().mockReturnValue(undefined),
        getAttachment: vi.fn().mockReturnValue(undefined),
      } as unknown as Node;

      const parentNodeId = NodeId.create('node1');
      if (parentNodeId.isErr()) throw new Error('Invalid parent ID');

      const node2 = {
        getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const mockAttachment = {
        getPremisePosition: vi.fn().mockReturnValue(0),
        getFromPosition: vi.fn().mockReturnValue(undefined),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        hasMultipleConclusionSource: vi.fn().mockReturnValue(false),
        equals: vi.fn().mockReturnValue(false),
      } as unknown as Attachment;

      (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

      vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return { isOk: () => true, isErr: () => false, value: node1 } as any;
          case 'node2':
            return { isOk: () => true, isErr: () => false, value: node2 } as any;
          default:
            return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
        }
      });

      // Create statements and arguments for path testing
      const statement1 = createMockStatement('stmt1');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], []);

      vi.mocked(mockArgumentRepository.findById).mockImplementation(
        async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return { isOk: () => true, isErr: () => false, value: arg1 } as any;
            case 'arg2':
              return { isOk: () => true, isErr: () => false, value: arg2 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        },
      );

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
      const fromNodeIdResult = NodeId.create('nonexistent1');
      const toNodeIdResult = NodeId.create('nonexistent2');

      expect(fromNodeIdResult.isOk()).toBe(true);
      expect(toNodeIdResult.isOk()).toBe(true);

      if (!fromNodeIdResult.isOk() || !toNodeIdResult.isOk()) {
        throw new Error('Failed to create test node IDs');
      }

      const fromNodeId = fromNodeIdResult.value;
      const toNodeId = toNodeIdResult.value;

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
      const arg1Id = AtomicArgumentId.create('arg1');
      const arg2Id = AtomicArgumentId.create('arg2');
      const arg3Id = AtomicArgumentId.create('arg3');
      if (arg1Id.isErr() || arg2Id.isErr() || arg3Id.isErr()) {
        throw new Error('Failed to create argument IDs');
      }

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
        isRoot: vi.fn().mockReturnValue(true),
        isChild: vi.fn().mockReturnValue(false),
        getParentNodeId: vi.fn().mockReturnValue(undefined),
        getAttachment: vi.fn().mockReturnValue(undefined),
      } as unknown as Node;

      const parentNodeId1 = NodeId.create('node1');
      if (parentNodeId1.isErr()) throw new Error('Invalid parent ID');

      const node2 = {
        getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId1.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const parentNodeId2 = NodeId.create('node2');
      if (parentNodeId2.isErr()) throw new Error('Invalid parent ID');

      const node3 = {
        getArgumentId: vi.fn().mockReturnValue(arg3Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId2.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const mockAttachment = {
        getPremisePosition: vi.fn().mockReturnValue(0),
        getFromPosition: vi.fn().mockReturnValue(undefined),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId1.value),
        hasMultipleConclusionSource: vi.fn().mockReturnValue(false),
        equals: vi.fn().mockReturnValue(false),
      } as unknown as Attachment;

      (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);
      (node3.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

      vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return { isOk: () => true, isErr: () => false, value: node1 } as any;
          case 'node2':
            return { isOk: () => true, isErr: () => false, value: node2 } as any;
          case 'node3':
            return { isOk: () => true, isErr: () => false, value: node3 } as any;
          default:
            return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
        }
      });

      // Create statements and arguments for subtree testing
      const statement1 = createMockStatement('stmt1');
      const statement2 = createMockStatement('stmt2');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], [statement2]);
      const arg3 = createMockArgument([statement2], []);

      vi.mocked(mockArgumentRepository.findById).mockImplementation(
        async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return { isOk: () => true, isErr: () => false, value: arg1 } as any;
            case 'arg2':
              return { isOk: () => true, isErr: () => false, value: arg2 } as any;
            case 'arg3':
              return { isOk: () => true, isErr: () => false, value: arg3 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        },
      );

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

        // Use Array.from to iterate over Map entries
        Array.from(subtree.entries()).forEach(([_nodeId, { depth }]) => {
          expect(depth).toBeLessThanOrEqual(maxDepth);
        });
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
      const arg1Id = AtomicArgumentId.create('arg1');
      const arg2Id = AtomicArgumentId.create('arg2');
      if (arg1Id.isErr() || arg2Id.isErr()) throw new Error('Invalid argument IDs');

      const parentNodeId1 = NodeId.create('node2');
      const parentNodeId2 = NodeId.create('node1');
      if (parentNodeId1.isErr() || parentNodeId2.isErr()) throw new Error('Invalid parent IDs');

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId1.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const node2 = {
        getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId2.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const mockAttachment = {
        getPremisePosition: vi.fn().mockReturnValue(0),
        getFromPosition: vi.fn().mockReturnValue(undefined),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId2.value),
        hasMultipleConclusionSource: vi.fn().mockReturnValue(false),
        equals: vi.fn().mockReturnValue(false),
      } as unknown as Attachment;

      (node1.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);
      (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

      vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return { isOk: () => true, isErr: () => false, value: node1 } as any;
          case 'node2':
            return { isOk: () => true, isErr: () => false, value: node2 } as any;
          default:
            return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
        }
      });

      // Create statements and arguments for cycle testing
      const statement1 = createMockStatement('stmt1');
      const statement2 = createMockStatement('stmt2');

      const arg1 = createMockArgument([statement1], [statement2]);
      const arg2 = createMockArgument([statement2], [statement1]);

      vi.mocked(mockArgumentRepository.findById).mockImplementation(
        async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return { isOk: () => true, isErr: () => false, value: arg1 } as any;
            case 'arg2':
              return { isOk: () => true, isErr: () => false, value: arg2 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        },
      );

      (mockTree.getNodeIds as ReturnType<typeof vi.fn>).mockReturnValue([
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
      const arg1Id = AtomicArgumentId.create('arg1');
      const arg2Id = AtomicArgumentId.create('arg2');
      if (arg1Id.isErr() || arg2Id.isErr()) throw new Error('Invalid argument IDs');

      const parentNodeId = NodeId.create('node1');
      if (parentNodeId.isErr()) throw new Error('Invalid parent ID');

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
        isRoot: vi.fn().mockReturnValue(true),
        isChild: vi.fn().mockReturnValue(false),
        getParentNodeId: vi.fn().mockReturnValue(undefined),
        getAttachment: vi.fn().mockReturnValue(undefined),
      } as unknown as Node;

      const node2 = {
        getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const mockAttachment = {
        getPremisePosition: vi.fn().mockReturnValue(0),
        getFromPosition: vi.fn().mockReturnValue(undefined),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        hasMultipleConclusionSource: vi.fn().mockReturnValue(false),
        equals: vi.fn().mockReturnValue(false),
      } as unknown as Attachment;

      (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

      vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return { isOk: () => true, isErr: () => false, value: node1 } as any;
          case 'node2':
            return { isOk: () => true, isErr: () => false, value: node2 } as any;
          default:
            return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
        }
      });

      // Create statements and arguments for acyclic testing
      const statement1 = createMockStatement('stmt1');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], []);

      vi.mocked(mockArgumentRepository.findById).mockImplementation(
        async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return { isOk: () => true, isErr: () => false, value: arg1 } as any;
            case 'arg2':
              return { isOk: () => true, isErr: () => false, value: arg2 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        },
      );

      (mockTree.getNodeIds as ReturnType<typeof vi.fn>).mockReturnValue([
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
      const arg1Id = AtomicArgumentId.create('arg1');
      const arg2Id = AtomicArgumentId.create('arg2');
      const arg3Id = AtomicArgumentId.create('arg3');
      if (arg1Id.isErr() || arg2Id.isErr() || arg3Id.isErr()) {
        throw new Error('Failed to create argument IDs');
      }

      const parentNodeId = NodeId.create('node1');
      if (parentNodeId.isErr()) throw new Error('Invalid parent ID');

      const node1 = {
        getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
        isRoot: vi.fn().mockReturnValue(true),
        isChild: vi.fn().mockReturnValue(false),
        getParentNodeId: vi.fn().mockReturnValue(undefined),
        getAttachment: vi.fn().mockReturnValue(undefined),
      } as unknown as Node;

      const node2 = {
        getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const node3 = {
        getArgumentId: vi.fn().mockReturnValue(arg3Id.value),
        isRoot: vi.fn().mockReturnValue(false),
        isChild: vi.fn().mockReturnValue(true),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        getAttachment: vi.fn(),
      } as unknown as Node;

      const mockAttachment = {
        getPremisePosition: vi.fn().mockReturnValue(0),
        getFromPosition: vi.fn().mockReturnValue(undefined),
        getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
        hasMultipleConclusionSource: vi.fn().mockReturnValue(false),
        equals: vi.fn().mockReturnValue(false),
      } as unknown as Attachment;

      (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);
      (node3.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

      vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
        switch (nodeId.getValue()) {
          case 'node1':
            return { isOk: () => true, isErr: () => false, value: node1 } as any;
          case 'node2':
            return { isOk: () => true, isErr: () => false, value: node2 } as any;
          case 'node3':
            return { isOk: () => true, isErr: () => false, value: node3 } as any;
          default:
            return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
        }
      });

      // Create statements and arguments for metrics testing
      const statement1 = createMockStatement('stmt1');

      const arg1 = createMockArgument([], [statement1]);
      const arg2 = createMockArgument([statement1], []);
      const arg3 = createMockArgument([statement1], []);

      vi.mocked(mockArgumentRepository.findById).mockImplementation(
        async (argId: AtomicArgumentId) => {
          switch (argId.getValue()) {
            case 'arg1':
              return { isOk: () => true, isErr: () => false, value: arg1 } as any;
            case 'arg2':
              return { isOk: () => true, isErr: () => false, value: arg2 } as any;
            case 'arg3':
              return { isOk: () => true, isErr: () => false, value: arg3 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        },
      );

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
        const arg1Id = AtomicArgumentId.create('arg1');
        const arg2Id = AtomicArgumentId.create('arg2');
        if (arg1Id.isErr() || arg2Id.isErr()) throw new Error('Invalid argument IDs');

        const parentNodeId = NodeId.create('node1');
        if (parentNodeId.isErr()) throw new Error('Invalid parent ID');

        const node1 = {
          getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
          isRoot: vi.fn().mockReturnValue(true),
          isChild: vi.fn().mockReturnValue(false),
          getParentNodeId: vi.fn().mockReturnValue(undefined),
          getAttachment: vi.fn().mockReturnValue(undefined),
        } as unknown as Node;

        const node2 = {
          getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
          isRoot: vi.fn().mockReturnValue(false),
          isChild: vi.fn().mockReturnValue(true),
          getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
          getAttachment: vi.fn(),
        } as unknown as Node;

        const mockAttachment = {
          getPremisePosition: () => 0,
          getFromPosition: () => undefined,
        };
        (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

        vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
          switch (nodeId.getValue()) {
            case 'node1':
              return { isOk: () => true, isErr: () => false, value: node1 } as any;
            case 'node2':
              return { isOk: () => true, isErr: () => false, value: node2 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        });

        const statement1 = createMockStatement('stmt1');
        const arg1 = createMockArgument([], [statement1]);
        const arg2 = createMockArgument([statement1], []);

        vi.mocked(mockArgumentRepository.findById).mockImplementation(
          async (argId: AtomicArgumentId) => {
            switch (argId.getValue()) {
              case 'arg1':
                return { isOk: () => true, isErr: () => false, value: arg1 } as any;
              case 'arg2':
                return { isOk: () => true, isErr: () => false, value: arg2 } as any;
              default:
                return {
                  isOk: () => false,
                  isErr: () => true,
                  error: new Error('Not found'),
                } as any;
            }
          },
        );

        (mockTree.getNodeIds as ReturnType<typeof vi.fn>).mockReturnValue([
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
        const arg1Id = AtomicArgumentId.create('arg1');
        const arg2Id = AtomicArgumentId.create('arg2');
        if (arg1Id.isErr() || arg2Id.isErr()) throw new Error('Invalid argument IDs');

        const parentNodeId = NodeId.create('node1');
        if (parentNodeId.isErr()) throw new Error('Invalid parent ID');

        const node1 = {
          getArgumentId: vi.fn().mockReturnValue(arg1Id.value),
          isRoot: vi.fn().mockReturnValue(true),
          isChild: vi.fn().mockReturnValue(false),
          getParentNodeId: vi.fn().mockReturnValue(undefined),
          getAttachment: vi.fn().mockReturnValue(undefined),
        } as unknown as Node;

        const node2 = {
          getArgumentId: vi.fn().mockReturnValue(arg2Id.value),
          isRoot: vi.fn().mockReturnValue(false),
          isChild: vi.fn().mockReturnValue(true),
          getParentNodeId: vi.fn().mockReturnValue(parentNodeId.value),
          getAttachment: vi.fn(),
        } as unknown as Node;

        const mockAttachment = {
          getPremisePosition: () => 0,
          getFromPosition: () => undefined,
        };
        (node2.getAttachment as ReturnType<typeof vi.fn>).mockReturnValue(mockAttachment);

        vi.mocked(mockNodeRepository.findById).mockImplementation(async (nodeId: NodeId) => {
          switch (nodeId.getValue()) {
            case 'node1':
              return { isOk: () => true, isErr: () => false, value: node1 } as any;
            case 'node2':
              return { isOk: () => true, isErr: () => false, value: node2 } as any;
            default:
              return { isOk: () => false, isErr: () => true, error: new Error('Not found') } as any;
          }
        });

        const statement1 = createMockStatement('stmt1');
        const arg1 = createMockArgument([], [statement1]);
        const arg2 = createMockArgument([statement1], []);

        vi.mocked(mockArgumentRepository.findById).mockImplementation(
          async (argId: AtomicArgumentId) => {
            switch (argId.getValue()) {
              case 'arg1':
                return { isOk: () => true, isErr: () => false, value: arg1 } as any;
              case 'arg2':
                return { isOk: () => true, isErr: () => false, value: arg2 } as any;
              default:
                return {
                  isOk: () => false,
                  isErr: () => true,
                  error: new Error('Not found'),
                } as any;
            }
          },
        );

        (mockTree.getNodeIds as ReturnType<typeof vi.fn>).mockReturnValue([
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
