import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

import type { AtomicArgument } from '../../entities/AtomicArgument';
import type { Statement } from '../../entities/Statement';
import type { Tree } from '../../entities/Tree';
import { RepositoryError } from '../../errors/DomainErrors.js';
import { createTree } from '../../factories/TreeFactory.js';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository';
import { ValidationError } from '../../shared/result';
import type { AtomicArgumentId, NodeId } from '../../shared/value-objects';
import { atomicArgumentIdFactory, nodeIdFactory, statementFactory } from '../factories/index.js';

describe('Tree Argument Analysis', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  let mockAtomicArgumentRepository: MockProxy<IAtomicArgumentRepository>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });

    mockAtomicArgumentRepository = mock<IAtomicArgumentRepository>();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Tree Basic Operations', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = createTree('doc-async-methods');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should add and remove nodes', () => {
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();

      // Add nodes
      const addResult1 = tree.addNode(nodeId1);
      const addResult2 = tree.addNode(nodeId2);
      expect(addResult1.isOk()).toBe(true);
      expect(addResult2.isOk()).toBe(true);
      expect(tree.hasNode(nodeId1)).toBe(true);
      expect(tree.hasNode(nodeId2)).toBe(true);
      expect(tree.getNodeCount()).toBe(2);

      // Remove node
      const removeResult = tree.removeNode(nodeId1);
      expect(removeResult.isOk()).toBe(true);
      expect(tree.hasNode(nodeId1)).toBe(false);
      expect(tree.getNodeCount()).toBe(1);
    });

    it('should set parent-child relationships', () => {
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();

      const addResult1 = tree.addNode(nodeId1);
      const addResult2 = tree.addNode(nodeId2);
      expect(addResult1.isOk()).toBe(true);
      expect(addResult2.isOk()).toBe(true);

      // Set parent
      const setParentResult = tree.setNodeParent(nodeId2, nodeId1);
      expect(setParentResult.isOk()).toBe(true);

      const node2 = tree.getNode(nodeId2);
      expect(node2).toBeDefined();
      expect(node2?.getParentId()).toEqual(nodeId1);
    });

    it('should detect cycles', () => {
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();
      const nodeId3 = nodeIdFactory.build();

      // Add nodes
      tree.addNode(nodeId1);
      tree.addNode(nodeId2);
      tree.addNode(nodeId3);

      // Create chain: 1 -> 2 -> 3
      tree.setNodeParent(nodeId2, nodeId1);
      tree.setNodeParent(nodeId3, nodeId2);

      // Try to create cycle: 1 -> 3 (would make 3 -> 2 -> 1 -> 3)
      const cycleResult = tree.setNodeParent(nodeId1, nodeId3);
      expect(cycleResult.isErr()).toBe(true);
      if (cycleResult.isErr()) {
        expect(cycleResult.error.message).toContain('cycle');
      }
    });
  });

  describe('Mock AtomicArgument interactions', () => {
    it('should work with mocked atomic arguments', async () => {
      // Create mock atomic arguments
      const mockArgument1 = mock<AtomicArgument>();
      const mockArgument2 = mock<AtomicArgument>();
      const argumentId1 = atomicArgumentIdFactory.build();
      const argumentId2 = atomicArgumentIdFactory.build();
      const statement1 = statementFactory.build();
      const statement2 = statementFactory.build();
      const statements: Statement[] = [statement1, statement2];

      // Setup mock returns
      mockArgument1.getId.mockReturnValue(argumentId1);
      mockArgument1.getPremises.mockReturnValue(statements);
      mockArgument1.getConclusions.mockReturnValue([statement1]);

      mockArgument2.getId.mockReturnValue(argumentId2);
      mockArgument2.getPremises.mockReturnValue([statement1]);
      mockArgument2.getConclusions.mockReturnValue([statement2]);

      // Mock repository
      mockAtomicArgumentRepository.findById.mockImplementation(
        async (id: AtomicArgumentId): Promise<Result<AtomicArgument, RepositoryError>> => {
          if (id === argumentId1) return ok(mockArgument1);
          if (id === argumentId2) return ok(mockArgument2);
          return err(new RepositoryError('Atomic argument not found'));
        },
      );

      // Test repository interactions
      const result1 = await mockAtomicArgumentRepository.findById(argumentId1);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe(mockArgument1);
        expect(result1.value.getPremises()).toEqual(statements);
        expect(result1.value.getConclusions()).toEqual([statements[0]]);
      }

      const result2 = await mockAtomicArgumentRepository.findById(argumentId2);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value).toBe(mockArgument2);
        expect(result2.value.getPremises()).toEqual([statements[0]]);
        expect(result2.value.getConclusions()).toEqual([statements[1]]);
      }
    });
  });

  describe('Complex tree structures', () => {
    it('should handle multi-branch tree structures', () => {
      const result = createTree('doc-multi-branch');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeIds = Array.from({ length: 5 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create branching structure: node0 -> node1, node0 -> node2, node1 -> node3, node2 -> node4
        const [node0Id, node1Id, node2Id, node3Id, node4Id] = nodeIds;
        expect(node0Id).toBeDefined();
        expect(node1Id).toBeDefined();
        expect(node2Id).toBeDefined();
        expect(node3Id).toBeDefined();
        expect(node4Id).toBeDefined();

        if (!node0Id || !node1Id || !node2Id || !node3Id || !node4Id) {
          throw new Error('Node IDs should be defined');
        }

        const setParent1Result = tree.setNodeParent(node1Id, node0Id);
        const setParent2Result = tree.setNodeParent(node2Id, node0Id);
        const setParent3Result = tree.setNodeParent(node3Id, node1Id);
        const setParent4Result = tree.setNodeParent(node4Id, node2Id);

        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);
        expect(setParent3Result.isOk()).toBe(true);
        expect(setParent4Result.isOk()).toBe(true);

        // Verify structure
        expect(tree.getNodeCount()).toBe(5);
        const node1 = tree.getNode(node1Id);
        const node2 = tree.getNode(node2Id);
        const node3 = tree.getNode(node3Id);
        const node4 = tree.getNode(node4Id);

        expect(node1).toBeDefined();
        expect(node2).toBeDefined();
        expect(node3).toBeDefined();
        expect(node4).toBeDefined();

        if (node1 && node2 && node3 && node4) {
          expect(node1.getParentId()).toEqual(node0Id);
          expect(node2.getParentId()).toEqual(node0Id);
          expect(node3.getParentId()).toEqual(node1Id);
          expect(node4.getParentId()).toEqual(node2Id);
        }
      }
    });
  });
});
