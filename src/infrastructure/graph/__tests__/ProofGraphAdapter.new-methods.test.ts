import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessingError } from '../../../domain/errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../../domain/repositories/INodeRepository.js';
import { NodeId, TreeId } from '../../../domain/shared/value-objects/index.js';
import { ProofGraphAdapter } from '../ProofGraphAdapter.js';

describe('ProofGraphAdapter - New Interface Methods', () => {
  let adapter: ProofGraphAdapter;
  let mockNodeRepository: INodeRepository;
  let mockArgumentRepository: IAtomicArgumentRepository;

  beforeEach(() => {
    mockNodeRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      findByTree: vi.fn(),
      delete: vi.fn(),
    } as INodeRepository;

    mockArgumentRepository = {
      // Base repository methods
      findById: vi.fn(),
      save: vi.fn(),
      findAll: vi.fn(),
      findByIds: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      count: vi.fn(),
      transaction: vi.fn(),

      // Query repository methods
      findByStatementReference: vi.fn(),
      findArgumentsByPremiseCount: vi.fn(),
      findArgumentsUsingStatement: vi.fn(),
      findArgumentsByComplexity: vi.fn(),
      findArgumentsWithConclusion: vi.fn(),
      findArgumentsByValidationStatus: vi.fn(),
      findArgumentChains: vi.fn(),
      findCircularDependencies: vi.fn(),
      findMostReferencedArguments: vi.fn(),
      findOrphanedArguments: vi.fn(),

      // Advanced query methods
      findByPredicate: vi.fn(),
      findOneByPredicate: vi.fn(),
      existsByPredicate: vi.fn(),
      countByPredicate: vi.fn(),

      // Specification methods
      findBySatisfying: vi.fn(),
      findOneSatisfying: vi.fn(),

      // Command repository methods
      bulkSave: vi.fn(),
      bulkDelete: vi.fn(),
      deleteWhere: vi.fn(),
      updateWhere: vi.fn(),
    } as unknown as IAtomicArgumentRepository;

    adapter = new ProofGraphAdapter(mockNodeRepository, mockArgumentRepository);
  });

  describe('hasNode', () => {
    it('should return false for non-existent node', () => {
      const nodeIdResult = NodeId.create('node1');
      expect(nodeIdResult.isOk()).toBe(true);

      if (nodeIdResult.isOk()) {
        const result = adapter.hasNode(nodeIdResult.value);
        expect(result).toBe(false);
      }
    });
  });

  describe('removeNode', () => {
    it('should return success for non-existent node', () => {
      const nodeIdResult = NodeId.create('node1');
      expect(nodeIdResult.isOk()).toBe(true);

      if (nodeIdResult.isOk()) {
        const result = adapter.removeNode(nodeIdResult.value);
        expect(result.isOk()).toBe(true);
      }
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate entire cache when no treeId provided', () => {
      const result = adapter.invalidateCache();
      expect(result.isOk()).toBe(true);
    });

    it('should invalidate specific tree cache when treeId provided', () => {
      const treeIdResult = TreeId.create('tree1');
      expect(treeIdResult.isOk()).toBe(true);

      if (treeIdResult.isOk()) {
        const result = adapter.invalidateCache(treeIdResult.value);
        expect(result.isOk()).toBe(true);
      }
    });
  });

  describe('getDirectNeighbors', () => {
    it('should return empty array for non-existent node', () => {
      const nodeIdResult = NodeId.create('node1');
      expect(nodeIdResult.isOk()).toBe(true);

      if (nodeIdResult.isOk()) {
        const result = adapter.getDirectNeighbors(nodeIdResult.value);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual([]);
        }
      }
    });
  });

  describe('findNodesInDepthRange', () => {
    it('should return empty array for non-existent start node', () => {
      const nodeIdResult = NodeId.create('node1');
      expect(nodeIdResult.isOk()).toBe(true);

      if (nodeIdResult.isOk()) {
        const result = adapter.findNodesInDepthRange(nodeIdResult.value, 0, 2);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual([]);
        }
      }
    });

    it('should return error for invalid depth range', () => {
      const nodeIdResult = NodeId.create('node1');
      expect(nodeIdResult.isOk()).toBe(true);

      if (nodeIdResult.isOk()) {
        const result = adapter.findNodesInDepthRange(nodeIdResult.value, 2, 1);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
        }
      }
    });

    it('should return error for negative depth values', () => {
      const nodeIdResult = NodeId.create('node1');
      expect(nodeIdResult.isOk()).toBe(true);

      if (nodeIdResult.isOk()) {
        const result = adapter.findNodesInDepthRange(nodeIdResult.value, -1, 2);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
        }
      }
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', () => {
      const result = adapter.getPerformanceMetrics();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('buildTime');
        expect(result.value).toHaveProperty('nodeCount');
        expect(result.value).toHaveProperty('edgeCount');
        expect(result.value).toHaveProperty('memoryUsage');
        expect(result.value).toHaveProperty('operationCounts');
      }
    });
  });
});
