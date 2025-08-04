import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

import {
  Tree,
  TreeConnectionIntegrityIssue,
  TreeConnectionIntegrityReport,
  TreeConnectionMap,
  TreeOrderedSetReference,
} from '../../entities/Tree';
import { ProcessingError } from '../../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository';
import { ValidationError } from '../../shared/result';
import { nodeIdFactory, orderedSetIdFactory } from './factories';

describe('Tree Structural Integrity', () => {
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

  describe('Structural Operations', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-structural');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('validateStructuralIntegrity', () => {
      it('should validate empty tree', () => {
        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });

      it('should validate tree with single node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });

      it('should validate tree with multiple nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const validateResult = tree.validateStructuralIntegrity();
        expect(validateResult.isOk()).toBe(true);
      });
    });
  });

  describe('Node Parent Relationship Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-parent-relations');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('getNode', () => {
      it('should return node data for existing node', () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        const node = tree.getNode(nodeId);
        expect(node).toBeDefined();
        expect(node?.id).toBe(nodeId);
        expect(node?.parentId).toBeUndefined();
        expect(node?.parentPosition).toBeUndefined();
      });

      it('should return undefined for non-existent node', () => {
        const nodeId = nodeIdFactory.build();
        const node = tree.getNode(nodeId);
        expect(node).toBeUndefined();
      });
    });

    describe('setNodeParent', () => {
      it('should set parent for existing node', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        const addParentResult = tree.addNode(parentId);
        expect(addChildResult.isOk()).toBe(true);
        expect(addParentResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId, 0);
        expect(setParentResult.isOk()).toBe(true);

        const childNode = tree.getNode(childId);
        expect(childNode?.parentId).toBe(parentId);
        expect(childNode?.parentPosition).toBe(0);
      });

      it('should update parent for node with existing parent', () => {
        const childId = nodeIdFactory.build();
        const parentId1 = nodeIdFactory.build();
        const parentId2 = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        const addParent1Result = tree.addNode(parentId1);
        const addParent2Result = tree.addNode(parentId2);
        expect(addChildResult.isOk()).toBe(true);
        expect(addParent1Result.isOk()).toBe(true);
        expect(addParent2Result.isOk()).toBe(true);

        const setParent1Result = tree.setNodeParent(childId, parentId1, 0);
        expect(setParent1Result.isOk()).toBe(true);

        const setParent2Result = tree.setNodeParent(childId, parentId2, 1);
        expect(setParent2Result.isOk()).toBe(true);

        const childNode = tree.getNode(childId);
        expect(childNode?.parentId).toBe(parentId2);
        expect(childNode?.parentPosition).toBe(1);
      });

      it('should fail to set parent for non-existent child', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addParentResult = tree.addNode(parentId);
        expect(addParentResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId, 0);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Child node does not exist in tree');
        }
      });

      it('should fail to set non-existent parent', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        expect(addChildResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId, 0);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Parent node does not exist in tree');
        }
      });

      it('should fail to set node as its own parent', () => {
        const nodeId = nodeIdFactory.build();

        const addNodeResult = tree.addNode(nodeId);
        expect(addNodeResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(nodeId, nodeId, 0);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Node cannot be its own parent');
        }
      });

      it('should fail with negative parent position', () => {
        const childId = nodeIdFactory.build();
        const parentId = nodeIdFactory.build();

        const addChildResult = tree.addNode(childId);
        const addParentResult = tree.addNode(parentId);
        expect(addChildResult.isOk()).toBe(true);
        expect(addParentResult.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(childId, parentId, -1);
        expect(setParentResult.isErr()).toBe(true);
        if (setParentResult.isErr()) {
          expect(setParentResult.error).toBeInstanceOf(ValidationError);
          expect(setParentResult.error.message).toBe('Parent position cannot be negative');
        }
      });
    });

    describe('addNodeWithParent', () => {
      it('should add node with parent in one operation', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        const addParentResult = tree.addNode(parentId);
        expect(addParentResult.isOk()).toBe(true);

        const addChildResult = tree.addNodeWithParent(childId, parentId, 0);
        expect(addChildResult.isOk()).toBe(true);

        expect(tree.containsNode(childId)).toBe(true);
        const childNode = tree.getNode(childId);
        expect(childNode?.parentId).toBe(parentId);
        expect(childNode?.parentPosition).toBe(0);
      });

      it('should fail to add node with non-existent parent', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        const addChildResult = tree.addNodeWithParent(childId, parentId, 0);
        expect(addChildResult.isErr()).toBe(true);
        if (addChildResult.isErr()) {
          expect(addChildResult.error).toBeInstanceOf(ValidationError);
          expect(addChildResult.error.message).toBe('Parent node does not exist in tree');
        }
      });

      it('should fail to add duplicate node', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        const addParentResult = tree.addNode(parentId);
        const addChildResult1 = tree.addNode(childId);
        expect(addParentResult.isOk()).toBe(true);
        expect(addChildResult1.isOk()).toBe(true);

        const addChildResult2 = tree.addNodeWithParent(childId, parentId, 0);
        expect(addChildResult2.isErr()).toBe(true);
        if (addChildResult2.isErr()) {
          expect(addChildResult2.error).toBeInstanceOf(ValidationError);
          expect(addChildResult2.error.message).toBe('Node ID already exists in tree');
        }
      });
    });

    describe('wouldCreateCycle', () => {
      it('should detect direct cycle', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(nodeId2, nodeId1, 0);
        expect(setParentResult.isOk()).toBe(true);

        expect(tree.wouldCreateCycle(nodeId1, nodeId2)).toBe(true);
      });

      it('should detect indirect cycle', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const setParent1Result = tree.setNodeParent(nodeId2, nodeId1, 0);
        const setParent2Result = tree.setNodeParent(nodeId3, nodeId2, 0);
        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);

        expect(tree.wouldCreateCycle(nodeId1, nodeId3)).toBe(true);
      });

      it('should not detect cycle for valid parent-child relationship', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        const nodeId3 = nodeIdFactory.build();

        const addResult1 = tree.addNode(nodeId1);
        const addResult2 = tree.addNode(nodeId2);
        const addResult3 = tree.addNode(nodeId3);
        expect(addResult1.isOk()).toBe(true);
        expect(addResult2.isOk()).toBe(true);
        expect(addResult3.isOk()).toBe(true);

        const setParentResult = tree.setNodeParent(nodeId2, nodeId1, 0);
        expect(setParentResult.isOk()).toBe(true);

        expect(tree.wouldCreateCycle(nodeId3, nodeId1)).toBe(false);
      });

      it('should return false for non-existent nodes', () => {
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();

        expect(tree.wouldCreateCycle(nodeId1, nodeId2)).toBe(false);
      });
    });
  });

  describe('Connection Integrity Analysis', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-connection-integrity');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('validateConnectionIntegrity', () => {
      it('should validate empty tree', async () => {
        const result = await tree.validateConnectionIntegrity(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const report = result.value;
          expect(report.isValid).toBe(true);
          expect(report.issues).toHaveLength(0);
        }
      });

      it('should handle repository errors gracefully', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        mockAtomicArgumentRepository.findById.mockRejectedValue(new Error('Repository error'));

        const result = await tree.validateConnectionIntegrity(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toContain('Repository error');
        }
      });

      it('should return validation errors for invalid connections', async () => {
        const nodeId = nodeIdFactory.build();
        const addResult = tree.addNode(nodeId);
        expect(addResult.isOk()).toBe(true);

        // Mock repository to return null (missing argument)
        mockAtomicArgumentRepository.findById.mockResolvedValue(null);

        const result = await tree.validateConnectionIntegrity(
          mockAtomicArgumentRepository,
          mockOrderedSetRepository,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const report = result.value;
          expect(report.isValid).toBe(false);
          expect(report.issues.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Helper Classes', () => {
    describe('TreeConnectionMap', () => {
      it('should create with valid connections', () => {
        const connections = new Map();
        connections.set(nodeIdFactory.build(), []);

        const result = TreeConnectionMap.create(connections);
        expect(result.isOk()).toBe(true);
      });

      it('should get connections for node', () => {
        const nodeId = nodeIdFactory.build();
        const connections = new Map();
        connections.set(nodeId, []);

        const result = TreeConnectionMap.create(connections);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const map = result.value;
          const nodeConnections = map.getConnectionsForNode(nodeId);
          expect(nodeConnections).toEqual([]);
        }
      });
    });

    describe('TreeOrderedSetReference', () => {
      it('should create with valid parameters', () => {
        const orderedSetId = orderedSetIdFactory.build();
        const nodeId = nodeIdFactory.build();

        const result = TreeOrderedSetReference.create(orderedSetId, nodeId, 'premise', 0);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const reference = result.value;
          expect(reference.orderedSetId).toBe(orderedSetId);
          expect(reference.nodeId).toBe(nodeId);
          expect(reference.role).toBe('premise');
          expect(reference.position).toBe(0);
        }
      });

      it('should fail with invalid role', () => {
        const orderedSetId = orderedSetIdFactory.build();
        const nodeId = nodeIdFactory.build();

        const result = TreeOrderedSetReference.create(orderedSetId, nodeId, 'invalid' as any, 0);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should fail with negative position', () => {
        const orderedSetId = orderedSetIdFactory.build();
        const nodeId = nodeIdFactory.build();

        const result = TreeOrderedSetReference.create(orderedSetId, nodeId, 'premise', -1);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });

    describe('TreeConnectionIntegrityReport', () => {
      it('should create valid report', () => {
        const issues: TreeConnectionIntegrityIssue[] = [];
        const result = TreeConnectionIntegrityReport.create(issues);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const report = result.value;
          expect(report.isValid).toBe(true);
          expect(report.issues).toEqual([]);
        }
      });

      it('should create invalid report with issues', () => {
        const issue = TreeConnectionIntegrityIssue.create(
          'missing-argument',
          'Test issue',
          nodeIdFactory.build(),
        );
        expect(issue.isOk()).toBe(true);

        if (issue.isOk()) {
          const result = TreeConnectionIntegrityReport.create([issue.value]);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            const report = result.value;
            expect(report.isValid).toBe(false);
            expect(report.issues).toHaveLength(1);
          }
        }
      });
    });

    describe('TreeConnectionIntegrityIssue', () => {
      it('should create with valid parameters', () => {
        const nodeId = nodeIdFactory.build();
        const result = TreeConnectionIntegrityIssue.create(
          'missing-argument',
          'Argument not found',
          nodeId,
        );
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const issue = result.value;
          expect(issue.type).toBe('missing-argument');
          expect(issue.message).toBe('Argument not found');
          expect(issue.nodeId).toBe(nodeId);
        }
      });

      it('should fail with invalid type', () => {
        const nodeId = nodeIdFactory.build();
        const result = TreeConnectionIntegrityIssue.create(
          'invalid-type' as any,
          'Test message',
          nodeId,
        );
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it('should fail with empty message', () => {
        const nodeId = nodeIdFactory.build();
        const result = TreeConnectionIntegrityIssue.create('missing-argument', '', nodeId);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });
  });

  describe('Complex cycle detection scenarios', () => {
    it('should detect complex multi-level cycles', () => {
      const result = Tree.create('doc-complex-cycle');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeIds = Array.from({ length: 5 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create a chain: node0 -> node1 -> node2 -> node3 -> node4
        const setParent1Result = tree.setNodeParent(nodeIds[1], nodeIds[0], 0);
        const setParent2Result = tree.setNodeParent(nodeIds[2], nodeIds[1], 0);
        const setParent3Result = tree.setNodeParent(nodeIds[3], nodeIds[2], 0);
        const setParent4Result = tree.setNodeParent(nodeIds[4], nodeIds[3], 0);
        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);
        expect(setParent3Result.isOk()).toBe(true);
        expect(setParent4Result.isOk()).toBe(true);

        // Now check if creating node0 -> node4 would create a cycle (it should)
        expect(tree.wouldCreateCycle(nodeIds[0], nodeIds[4])).toBe(true);

        // Check if creating node0 -> node2 would create a cycle (it should)
        expect(tree.wouldCreateCycle(nodeIds[0], nodeIds[2])).toBe(true);

        // Check if creating node2 -> node0 would create a cycle (it should)
        expect(tree.wouldCreateCycle(nodeIds[2], nodeIds[0])).toBe(true);

        // Check a valid relationship that wouldn't create a cycle
        const newNodeId = nodeIdFactory.build();
        const addNewResult = tree.addNode(newNodeId);
        expect(addNewResult.isOk()).toBe(true);
        expect(tree.wouldCreateCycle(newNodeId, nodeIds[0])).toBe(false);
      }
    });

    it('should handle diamond-shaped dependency graphs', () => {
      const result = Tree.create('doc-diamond-cycle');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const nodeIds = Array.from({ length: 4 }, () => nodeIdFactory.build());

        // Add all nodes
        nodeIds.forEach((nodeId) => {
          const addResult = tree.addNode(nodeId);
          expect(addResult.isOk()).toBe(true);
        });

        // Create diamond: node0 -> node1, node0 -> node2, node1 -> node3, node2 -> node3
        const setParent1Result = tree.setNodeParent(nodeIds[1], nodeIds[0], 0);
        const setParent2Result = tree.setNodeParent(nodeIds[2], nodeIds[0], 1);
        const setParent3Result = tree.setNodeParent(nodeIds[3], nodeIds[1], 0);
        const setParent4Result = tree.setNodeParent(nodeIds[3], nodeIds[2], 0);
        expect(setParent1Result.isOk()).toBe(true);
        expect(setParent2Result.isOk()).toBe(true);
        expect(setParent3Result.isOk()).toBe(true);
        expect(setParent4Result.isOk()).toBe(true);

        // Check cycle detection
        expect(tree.wouldCreateCycle(nodeIds[0], nodeIds[3])).toBe(true);
        expect(tree.wouldCreateCycle(nodeIds[1], nodeIds[0])).toBe(true);
        expect(tree.wouldCreateCycle(nodeIds[2], nodeIds[0])).toBe(true);
        expect(tree.wouldCreateCycle(nodeIds[3], nodeIds[1])).toBe(true);
        expect(tree.wouldCreateCycle(nodeIds[3], nodeIds[2])).toBe(true);
      }
    });
  });
});
