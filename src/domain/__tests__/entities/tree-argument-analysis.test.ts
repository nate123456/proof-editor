import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

import type { AtomicArgument } from '../../entities/AtomicArgument';
import { Tree, TreeArgumentStructure, TreePathCompleteArgument } from '../../entities/Tree';
import { ProcessingError } from '../../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository';
import { ValidationError } from '../../shared/result';
import type { AtomicArgumentId } from '../../shared/value-objects';
import { atomicArgumentIdFactory, nodeIdFactory, orderedSetIdFactory } from './factories';

describe('Tree Argument Analysis', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  let mockAtomicArgumentRepository: MockProxy<IAtomicArgumentRepository>;
  let mockOrderedSetRepository: MockProxy<IOrderedSetRepository>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });

    mockAtomicArgumentRepository = mock<IAtomicArgumentRepository>();
    mockOrderedSetRepository = mock<IOrderedSetRepository>();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Complex Async Methods', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-async-methods');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('findDirectConnections', () => {
      it('should find direct connections between nodes', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();
        const orderedSetId = orderedSetIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        // Mock arguments with shared ordered set
        const mockArgument1 = mock<AtomicArgument>();
        const mockArgument2 = mock<AtomicArgument>();
        mockArgument1.getId.mockReturnValue(argumentId1);
        mockArgument1.getConclusionSet.mockReturnValue(orderedSetId);
        mockArgument2.getId.mockReturnValue(argumentId2);
        mockArgument2.getPremiseSet.mockReturnValue(orderedSetId);

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          if (id === argumentId1) return mockArgument1;
          if (id === argumentId2) return mockArgument2;
          return null;
        });

        const result = await tree.findDirectConnections(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap).toBeDefined();
        }
      });

      it('should handle empty tree', async () => {
        const result = await tree.findDirectConnections(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap).toBeDefined();
        }
      });

      it('should handle repository errors', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Repository error'));

        const result = await tree.findDirectConnections(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Repository error');
        }
      });
    });

    describe('findArgumentTree', () => {
      it('should find argument tree for valid tree', async () => {
        const nodeId = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();

        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const mockArgument = mock<AtomicArgument>();
        mockArgument.getId.mockReturnValue(argumentId);
        mockArgument.getPremiseSet.mockReturnValue(null);
        mockArgument.getConclusionSet.mockReturnValue(null);

        mockAtomicArgumentRepository.findById.mockResolvedValue(mockArgument);

        const result = await tree.findArgumentTree(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argumentStructure = result.value;
          expect(argumentStructure).toBeDefined();
        }
      });

      it('should handle empty tree', async () => {
        const result = await tree.findArgumentTree(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argumentStructure = result.value;
          expect(argumentStructure).toBeDefined();
        }
      });

      it('should handle repository errors', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Repository error'));

        const result = await tree.findArgumentTree(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Repository error');
        }
      });
    });

    describe('findPathCompleteArgument', () => {
      it('should find path complete argument for connected nodes', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();
        const orderedSetId = orderedSetIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        // Set up parent relationship
        const setParentResult = tree.setNodeParent(nodeId2, nodeId1, 0);
        expect(setParentResult.isOk()).toBe(true);

        // Mock arguments with connection
        const mockArgument1 = mock<AtomicArgument>();
        const mockArgument2 = mock<AtomicArgument>();
        mockArgument1.getId.mockReturnValue(argumentId1);
        mockArgument1.getConclusionSet.mockReturnValue(orderedSetId);
        mockArgument2.getId.mockReturnValue(argumentId2);
        mockArgument2.getPremiseSet.mockReturnValue(orderedSetId);

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          if (id === argumentId1) return mockArgument1;
          if (id === argumentId2) return mockArgument2;
          return null;
        });

        const result = await tree.findPathCompleteArgument(
          nodeId1,
          nodeId2,
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pathCompleteArgument = result.value;
          expect(pathCompleteArgument).toBeDefined();
        }
      });

      it('should handle non-existent source node', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const addResult = tree.addNode(nodeId2);
        expect(addResult.isOk()).toBe(true);

        const result = await tree.findPathCompleteArgument(
          nodeId1,
          nodeId2,
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Source node does not exist');
        }
      });

      it('should handle non-existent target node', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const addResult = tree.addNode(nodeId1);
        expect(addResult.isOk()).toBe(true);

        const result = await tree.findPathCompleteArgument(
          nodeId1,
          nodeId2,
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Target node does not exist');
        }
      });

      it('should handle repository errors', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Repository error'));

        const result = await tree.findPathCompleteArgument(
          nodeId1,
          nodeId2,
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Repository error');
        }
      });
    });

    describe('discoverSharedReferences', () => {
      it('should discover shared references between nodes', async () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();
        const orderedSetId = orderedSetIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        // Mock arguments with shared ordered set
        const mockArgument1 = mock<AtomicArgument>();
        const mockArgument2 = mock<AtomicArgument>();
        mockArgument1.getId.mockReturnValue(argumentId1);
        mockArgument1.getPremiseSet.mockReturnValue(orderedSetId);
        mockArgument2.getId.mockReturnValue(argumentId2);
        mockArgument2.getPremiseSet.mockReturnValue(orderedSetId);

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          if (id === argumentId1) return mockArgument1;
          if (id === argumentId2) return mockArgument2;
          return null;
        });

        const result = await tree.discoverSharedReferences(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const sharedReferences = result.value;
          expect(sharedReferences).toBeDefined();
          expect(Array.isArray(sharedReferences)).toBe(true);
        }
      });

      it('should handle empty tree', async () => {
        const result = await tree.discoverSharedReferences(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const sharedReferences = result.value;
          expect(sharedReferences).toBeDefined();
          expect(Array.isArray(sharedReferences)).toBe(true);
          expect(sharedReferences).toHaveLength(0);
        }
      });

      it('should handle repository errors', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Repository error'));

        const result = await tree.discoverSharedReferences(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Repository error');
        }
      });
    });
  });

  describe('Argument Structure Analysis', () => {
    describe('TreeArgumentStructure', () => {
      it('should create with valid parameters', () => {
        const nodeId = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const atomicArguments = new Map([[nodeId, argumentId]]);
        const connections = new Map([[nodeId, []]]);

        const result = TreeArgumentStructure.create(atomicArguments, connections);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const structure = result.value;
          expect(structure.atomicArguments).toBeDefined();
          expect(structure.connections).toBeDefined();
        }
      });

      it('should get argument for node', () => {
        const nodeId = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const atomicArguments = new Map([[nodeId, argumentId]]);
        const connections = new Map([[nodeId, []]]);

        const result = TreeArgumentStructure.create(atomicArguments, connections);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const structure = result.value;
          const foundArgumentId = structure.getArgumentForNode(nodeId);
          expect(foundArgumentId).toBe(argumentId);
        }
      });

      it('should return undefined for non-existent node', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const atomicArguments = new Map([[nodeId1, argumentId]]);
        const connections = new Map([[nodeId1, []]]);

        const result = TreeArgumentStructure.create(atomicArguments, connections);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const structure = result.value;
          const foundArgumentId = structure.getArgumentForNode(nodeId2);
          expect(foundArgumentId).toBeUndefined();
        }
      });

      it('should get connections for node', () => {
        const nodeId = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const connections = [orderedSetIdFactory.build()];
        const atomicArguments = new Map([[nodeId, argumentId]]);
        const connectionMap = new Map([[nodeId, connections]]);

        const result = TreeArgumentStructure.create(atomicArguments, connectionMap);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const structure = result.value;
          const foundConnections = structure.getConnectionsForNode(nodeId);
          expect(foundConnections).toEqual(connections);
        }
      });

      it('should return empty array for node with no connections', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const connections = [orderedSetIdFactory.build()];
        const atomicArguments = new Map([[nodeId1, argumentId]]);
        const connectionMap = new Map([[nodeId1, connections]]);

        const result = TreeArgumentStructure.create(atomicArguments, connectionMap);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const structure = result.value;
          const foundConnections = structure.getConnectionsForNode(nodeId2);
          expect(foundConnections).toEqual([]);
        }
      });
    });

    describe('TreePathCompleteArgument', () => {
      it('should create with valid parameters', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();
        const path = [nodeId1, nodeId2];
        const atomicArguments = [argumentId1, argumentId2];

        const result = TreePathCompleteArgument.create(path, atomicArguments);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const pathComplete = result.value;
          expect(pathComplete.path).toEqual(path);
          expect(pathComplete.atomicArguments).toEqual(atomicArguments);
        }
      });

      it('should fail with empty path', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const result = TreePathCompleteArgument.create([], [argumentId]);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Path cannot be empty');
        }
      });

      it('should fail with empty atomic arguments', () => {
        const nodeId = nodeIdFactory.build();
        const result = TreePathCompleteArgument.create([nodeId], []);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Atomic arguments cannot be empty');
        }
      });

      it('should fail with mismatched path and arguments length', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId = atomicArgumentIdFactory.build();
        const path = [nodeId1, nodeId2];
        const atomicArguments = [argumentId];

        const result = TreePathCompleteArgument.create(path, atomicArguments);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Path and atomic arguments must have same length');
        }
      });

      it('should get length', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();
        const path = [nodeId1, nodeId2];
        const atomicArguments = [argumentId1, argumentId2];

        const result = TreePathCompleteArgument.create(path, atomicArguments);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const pathComplete = result.value;
          expect(pathComplete.getLength()).toBe(2);
        }
      });

      it('should check if path is complete', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const argumentId1 = atomicArgumentIdFactory.build();
        const argumentId2 = atomicArgumentIdFactory.build();
        const path = [nodeId1, nodeId2];
        const atomicArguments = [argumentId1, argumentId2];

        const result = TreePathCompleteArgument.create(path, atomicArguments);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const pathComplete = result.value;
          expect(pathComplete.isComplete()).toBe(true);
        }
      });
    });
  });

  describe('Complex reasoning patterns', () => {
    it('should handle multi-branch argument structures', async () => {
      const result = Tree.create('doc-multi-branch');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeIds = Array.from({ length: 5 }, () => nodeIdFactory.build());
        const argumentIds = Array.from({ length: 5 }, () => atomicArgumentIdFactory.build());
        const orderedSetIds = Array.from({ length: 6 }, () => orderedSetIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create branching structure: node0 -> node1, node0 -> node2, node1 -> node3, node2 -> node4
        const setParent1Result = tree.setNodeParent(nodeIds[1], nodeIds[0], 0);
        const setParent2Result = tree.setNodeParent(nodeIds[2], nodeIds[0], 1);
        const setParent3Result = tree.setNodeParent(nodeIds[3], nodeIds[1], 0);
        const setParent4Result = tree.setNodeParent(nodeIds[4], nodeIds[2], 0);
        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);
        expect(setParent3Result.isOk()).toBe(true);
        expect(setParent4Result.isOk()).toBe(true);

        // Mock arguments with appropriate connections
        const mockArguments = argumentIds.map((id, index) => {
          const mockArg = mock<AtomicArgument>();
          mockArg.getId.mockReturnValue(id);
          // Set up premise and conclusion ordered sets based on tree structure
          if (index === 0) {
            mockArg.getPremiseSet.mockReturnValue(orderedSetIds[0]);
            mockArg.getConclusionSet.mockReturnValue(orderedSetIds[1]);
          } else if (index === 1) {
            mockArg.getPremiseSet.mockReturnValue(orderedSetIds[1]);
            mockArg.getConclusionSet.mockReturnValue(orderedSetIds[2]);
          } else if (index === 2) {
            mockArg.getPremiseSet.mockReturnValue(orderedSetIds[2]);
            mockArg.getConclusionSet.mockReturnValue(orderedSetIds[3]);
          } else if (index === 3) {
            mockArg.getPremiseSet.mockReturnValue(orderedSetIds[3]);
            mockArg.getConclusionSet.mockReturnValue(orderedSetIds[4]);
          } else {
            mockArg.getPremiseSet.mockReturnValue(orderedSetIds[4]);
            mockArg.getConclusionSet.mockReturnValue(orderedSetIds[5]);
          }
          return mockArg;
        });

        mockAtomicArgumentRepository.findById.mockImplementation(async (id: AtomicArgumentId) => {
          const found = mockArguments.find((arg) => arg.getId() === id);
          return found || null;
        });

        const connectionResult = await tree.findDirectConnections(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );
        expect(connectionResult.isOk()).toBe(true);

        const structureResult = await tree.findArgumentTree(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );
        expect(structureResult.isOk()).toBe(true);

        const sharedReferencesResult = await tree.discoverSharedReferences(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );
        expect(sharedReferencesResult.isOk()).toBe(true);
      }
    });
  });
});
