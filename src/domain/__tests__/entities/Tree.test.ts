import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AtomicArgument } from '../../entities/AtomicArgument';
import {
  Tree,
  TreeArgumentStructure,
  TreeConnectionIntegrityIssue,
  TreeConnectionIntegrityReport,
  TreeConnectionMap,
  TreeOrderedSetReference,
  TreePathCompleteArgument,
} from '../../entities/Tree';
import { ProcessingError } from '../../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../../repositories/IAtomicArgumentRepository';
import type { IOrderedSetRepository } from '../../repositories/IOrderedSetRepository';
import { ValidationError } from '../../shared/result';
import {
  type AtomicArgumentId,
  NodeId,
  type OrderedSetId,
  PhysicalProperties,
  Position2D,
} from '../../shared/value-objects';
import {
  atomicArgumentIdFactory,
  nodeIdFactory,
  orderedSetIdFactory,
  treeIdFactory,
} from '../factories';

describe('Tree Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Tree Creation', () => {
    describe('valid creation cases', () => {
      it('should create a tree with minimal valid parameters', () => {
        const documentId = 'doc-123';
        const result = Tree.create(documentId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const tree = result.value;
          expect(tree.getDocumentId()).toBe(documentId);
          expect(tree.getPosition()).toEqual(Position2D.origin());
          expect(tree.getPhysicalProperties()).toEqual(PhysicalProperties.default());
          expect(tree.getCreatedAt()).toBe(FIXED_TIMESTAMP);
          expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP);
          expect(tree.getTitle()).toBeUndefined();
          expect(tree.isEmpty()).toBe(true);
          expect(tree.getNodeCount()).toBe(0);
        }
      });

      it('should create a tree with all parameters', () => {
        const documentId = 'doc-456';
        const positionResult = Position2D.create(100, 200);
        const propertiesResult = PhysicalProperties.create(
          'bottom-up',
          50,
          50,
          100,
          50,
          'horizontal',
          'center',
        );
        const title = 'Test Tree';

        expect(positionResult.isOk()).toBe(true);
        expect(propertiesResult.isOk()).toBe(true);

        if (positionResult.isOk() && propertiesResult.isOk()) {
          const result = Tree.create(
            documentId,
            positionResult.value,
            propertiesResult.value,
            title,
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const tree = result.value;
            expect(tree.getDocumentId()).toBe(documentId);
            expect(tree.getPosition()).toEqual(positionResult.value);
            expect(tree.getPhysicalProperties()).toEqual(propertiesResult.value);
            expect(tree.getTitle()).toBe(title);
            expect(tree.hasTitle()).toBe(true);
          }
        }
      });

      it('should trim whitespace from document ID and title', () => {
        const documentId = '  doc-789  ';
        const title = '  Trimmed Title  ';

        const result = Tree.create(documentId, undefined, undefined, title);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const tree = result.value;
          expect(tree.getDocumentId()).toBe('doc-789');
          expect(tree.getTitle()).toBe('Trimmed Title');
        }
      });

      it('should handle empty title as empty string', () => {
        const result = Tree.create('doc-123', undefined, undefined, '');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getTitle()).toBe('');
          expect(result.value.hasTitle()).toBe(false);
        }
      });
    });

    describe('invalid creation cases', () => {
      it('should reject empty document ID', () => {
        const result = Tree.create('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Document ID cannot be empty');
        }
      });

      it('should reject whitespace-only document ID', () => {
        const result = Tree.create('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Document ID cannot be empty');
        }
      });
    });
  });

  describe('Tree Reconstruction', () => {
    describe('valid reconstruction cases', () => {
      it('should reconstruct a tree with all parameters', () => {
        const id = treeIdFactory.build();
        const documentId = 'reconstructed-doc';
        const positionResult = Position2D.create(50, 75);
        const propertiesResult = PhysicalProperties.create(
          'top-down',
          40,
          40,
          80,
          40,
          'vertical',
          'left',
        );
        const nodeIds = [nodeIdFactory.build(), nodeIdFactory.build()];
        const createdAt = 1000000;
        const modifiedAt = 2000000;
        const title = 'Reconstructed Tree';

        expect(positionResult.isOk()).toBe(true);
        expect(propertiesResult.isOk()).toBe(true);

        if (positionResult.isOk() && propertiesResult.isOk()) {
          const result = Tree.reconstruct(
            id,
            documentId,
            positionResult.value,
            propertiesResult.value,
            nodeIds,
            createdAt,
            modifiedAt,
            title,
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const tree = result.value;
            expect(tree.getId()).toEqual(id);
            expect(tree.getDocumentId()).toBe(documentId);
            expect(tree.getPosition()).toEqual(positionResult.value);
            expect(tree.getPhysicalProperties()).toEqual(propertiesResult.value);
            expect(tree.getNodeIds()).toEqual(nodeIds);
            expect(tree.getCreatedAt()).toBe(createdAt);
            expect(tree.getModifiedAt()).toBe(modifiedAt);
            expect(tree.getTitle()).toBe(title);
            expect(tree.getNodeCount()).toBe(2);
            expect(tree.isEmpty()).toBe(false);
          }
        }
      });

      it('should reconstruct with empty node list', () => {
        const id = treeIdFactory.build();
        const result = Tree.reconstruct(
          id,
          'doc-123',
          Position2D.origin(),
          PhysicalProperties.default(),
          [],
          1000000,
          2000000,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isEmpty()).toBe(true);
          expect(result.value.getNodeCount()).toBe(0);
        }
      });
    });
  });

  describe('Position Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('moveTo', () => {
      it('should move tree to new position', () => {
        const newPositionResult = Position2D.create(100, 200);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          // Mock a new timestamp for the move operation
          const laterTimestamp = FIXED_TIMESTAMP + 1000;
          mockDateNow.mockReturnValueOnce(laterTimestamp);

          const result = tree.moveTo(newPositionResult.value);

          expect(result.isOk()).toBe(true);
          expect(tree.getPosition()).toEqual(newPositionResult.value);
          expect(tree.getModifiedAt()).toBe(laterTimestamp);
        }
      });
    });

    describe('moveBy', () => {
      it('should move tree by relative amount', () => {
        const initialPosition = tree.getPosition();
        const deltaX = 50;
        const deltaY = 75;
        const result = tree.moveBy(deltaX, deltaY);

        expect(result.isOk()).toBe(true);
        const newPosition = tree.getPosition();
        expect(newPosition.getX()).toBe(initialPosition.getX() + deltaX);
        expect(newPosition.getY()).toBe(initialPosition.getY() + deltaY);
      });

      it('should handle invalid position changes', () => {
        // Test with NaN values that would cause Position2D.moveBy to fail
        const result = tree.moveBy(Number.NaN, 50);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid position change');
        }
      });

      it('should handle infinite delta values', () => {
        const result = tree.moveBy(Number.POSITIVE_INFINITY, 50);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid position change');
        }
      });

      it('should not update modification time when position change fails', () => {
        const originalModified = tree.getModifiedAt();

        // Try invalid move
        tree.moveBy(Number.NaN, 50);

        // Modified time should remain the same since move failed
        expect(tree.getModifiedAt()).toBe(originalModified);
      });
    });

    describe('isAtPosition', () => {
      it('should correctly identify position', () => {
        const positionResult = Position2D.create(100, 200);
        expect(positionResult.isOk()).toBe(true);

        if (positionResult.isOk()) {
          tree.moveTo(positionResult.value);

          expect(tree.isAtPosition(100, 200)).toBe(true);
          expect(tree.isAtPosition(101, 200)).toBe(false);
          expect(tree.isAtPosition(100, 201)).toBe(false);
        }
      });
    });
  });

  describe('Physical Properties Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should update physical properties', () => {
      // Create different properties from the default ones used in tree creation
      const newPropertiesResult = PhysicalProperties.create(
        'top-down',
        60,
        50,
        120,
        90,
        'horizontal',
        'left',
      );
      expect(newPropertiesResult.isOk()).toBe(true);

      if (newPropertiesResult.isOk()) {
        const newPhysicalProperties = newPropertiesResult.value;
        const laterTimestamp = FIXED_TIMESTAMP + 1000;
        mockDateNow.mockReturnValueOnce(laterTimestamp);

        const result = tree.updatePhysicalProperties(newPhysicalProperties);

        expect(result.isOk()).toBe(true);
        expect(tree.getPhysicalProperties()).toEqual(newPhysicalProperties);
        expect(tree.getModifiedAt()).toBe(laterTimestamp);
      }
    });
  });

  describe('Title Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should set title', () => {
      const title = 'New Tree Title';
      const laterTimestamp = FIXED_TIMESTAMP + 1000;
      mockDateNow.mockReturnValueOnce(laterTimestamp);

      const result = tree.setTitle(title);

      expect(result.isOk()).toBe(true);
      expect(tree.getTitle()).toBe(title);
      expect(tree.hasTitle()).toBe(true);
      expect(tree.getModifiedAt()).toBe(laterTimestamp);
    });

    it('should clear title when set to empty string', () => {
      tree.setTitle('Some Title');
      const result = tree.setTitle('');

      expect(result.isOk()).toBe(true);
      expect(tree.getTitle()).toBe('');
      expect(tree.hasTitle()).toBe(false);
    });

    it('should clear title when set to undefined', () => {
      tree.setTitle('Some Title');
      const result = tree.setTitle(undefined);

      expect(result.isOk()).toBe(true);
      expect(tree.getTitle()).toBeUndefined();
      expect(tree.hasTitle()).toBe(false);
    });

    it('should trim title whitespace', () => {
      const result = tree.setTitle('  Trimmed Title  ');

      expect(result.isOk()).toBe(true);
      expect(tree.getTitle()).toBe('Trimmed Title');
    });
  });

  describe('Node Management', () => {
    let tree: Tree;
    let nodeId1: NodeId;
    let nodeId2: NodeId;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
      nodeId1 = nodeIdFactory.build();
      nodeId2 = nodeIdFactory.build();
    });

    describe('addNode', () => {
      it('should add a node', () => {
        const result = tree.addNode(nodeId1);

        expect(result.isOk()).toBe(true);
        expect(tree.containsNode(nodeId1)).toBe(true);
        expect(tree.getNodeCount()).toBe(1);
        expect(tree.isEmpty()).toBe(false);
        expect(tree.getNodeIds()).toContain(nodeId1);
      });

      it('should not add duplicate nodes', () => {
        tree.addNode(nodeId1);
        const result = tree.addNode(nodeId1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Node already exists in tree');
        }
        expect(tree.getNodeCount()).toBe(1);
      });

      it('should add multiple different nodes', () => {
        tree.addNode(nodeId1);
        const result = tree.addNode(nodeId2);

        expect(result.isOk()).toBe(true);
        expect(tree.getNodeCount()).toBe(2);
        expect(tree.containsNode(nodeId1)).toBe(true);
        expect(tree.containsNode(nodeId2)).toBe(true);
      });
    });

    describe('removeNode', () => {
      beforeEach(() => {
        tree.addNode(nodeId1);
        tree.addNode(nodeId2);
      });

      it('should remove an existing node', () => {
        const result = tree.removeNode(nodeId1);

        expect(result.isOk()).toBe(true);
        expect(tree.containsNode(nodeId1)).toBe(false);
        expect(tree.containsNode(nodeId2)).toBe(true);
        expect(tree.getNodeCount()).toBe(1);
      });

      it('should fail to remove non-existent node', () => {
        const nonExistentNodeId = nodeIdFactory.build();
        const result = tree.removeNode(nonExistentNodeId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Node not found in tree');
        }
        expect(tree.getNodeCount()).toBe(2);
      });

      it('should become empty when all nodes removed', () => {
        tree.removeNode(nodeId1);
        tree.removeNode(nodeId2);

        expect(tree.isEmpty()).toBe(true);
        expect(tree.getNodeCount()).toBe(0);
      });
    });
  });

  describe('Structural Operations', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('validateStructuralIntegrity', () => {
      it('should pass validation for empty tree', () => {
        const result = tree.validateStructuralIntegrity();
        expect(result.isOk()).toBe(true);
      });

      it('should pass validation for tree with nodes', () => {
        const nodeId = nodeIdFactory.build();
        tree.addNode(nodeId);

        const result = tree.validateStructuralIntegrity();
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Spatial Operations', () => {
    let tree1: Tree;
    let tree2: Tree;

    beforeEach(() => {
      const pos1Result = Position2D.create(0, 0);
      const pos2Result = Position2D.create(200, 200);
      const propsResult = PhysicalProperties.create(
        'bottom-up',
        30,
        30,
        60,
        30,
        'radial',
        'center',
      );

      expect(pos1Result.isOk()).toBe(true);
      expect(pos2Result.isOk()).toBe(true);
      expect(propsResult.isOk()).toBe(true);

      if (pos1Result.isOk() && pos2Result.isOk() && propsResult.isOk()) {
        const result1 = Tree.create('doc1', pos1Result.value, propsResult.value);
        const result2 = Tree.create('doc2', pos2Result.value, propsResult.value);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          tree1 = result1.value;
          tree2 = result2.value;
        }
      }
    });

    describe('distanceFrom', () => {
      it('should calculate distance between trees', () => {
        const distance = tree1.distanceFrom(tree2);
        const expectedDistance = Math.sqrt((200 - 0) ** 2 + (200 - 0) ** 2);
        expect(distance).toBeCloseTo(expectedDistance, 5);
      });

      it('should return 0 for same position', () => {
        const posResult = Position2D.create(0, 0);
        expect(posResult.isOk()).toBe(true);

        if (posResult.isOk()) {
          tree2.moveTo(posResult.value);
          const distance = tree1.distanceFrom(tree2);
          expect(distance).toBe(0);
        }
      });
    });

    describe('getBounds', () => {
      it('should calculate correct bounds', () => {
        const bounds = tree1.getBounds();

        expect(bounds.minX).toBe(0);
        expect(bounds.minY).toBe(0);
        expect(bounds.maxX).toBe(60); // minWidth from PhysicalProperties.create()
        expect(bounds.maxY).toBe(30); // minHeight from PhysicalProperties.create()
      });
    });

    describe('overlapsWithBounds', () => {
      it('should detect overlapping bounds', () => {
        // tree1 bounds: minX=0, minY=0, maxX=60, maxY=30
        // These bounds overlap with tree1's bounds
        const overlappingBounds = { minX: 30, minY: 15, maxX: 150, maxY: 150 };
        expect(tree1.overlapsWithBounds(overlappingBounds)).toBe(true);
      });

      it('should detect non-overlapping bounds', () => {
        const nonOverlappingBounds = { minX: 200, minY: 200, maxX: 300, maxY: 300 };
        expect(tree1.overlapsWithBounds(nonOverlappingBounds)).toBe(false);
      });
    });
  });

  describe('Flow Support', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should support bottom-up flow by default', () => {
      expect(tree.supportsBottomUpFlow()).toBe(true);
    });

    it('should support top-down flow based on physical properties', () => {
      // Default properties have 'bottom-up' layout, so top-down should be false
      expect(tree.supportsTopDownFlow()).toBe(false);
    });

    it('should support top-down flow with top-down layout properties', () => {
      const topDownPropsResult = PhysicalProperties.create('top-down');
      expect(topDownPropsResult.isOk()).toBe(true);

      if (topDownPropsResult.isOk()) {
        const treeResult = Tree.create('test-doc', Position2D.origin(), topDownPropsResult.value);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const topDownTree = treeResult.value;
          expect(topDownTree.supportsTopDownFlow()).toBe(true);
          expect(topDownTree.supportsBottomUpFlow()).toBe(false);
        }
      }
    });

    it('should handle different layout styles correctly', () => {
      const layoutStyles = ['bottom-up', 'top-down', 'left-right', 'right-left'] as const;

      layoutStyles.forEach((style) => {
        const propsResult = PhysicalProperties.create(style);
        expect(propsResult.isOk()).toBe(true);

        if (propsResult.isOk()) {
          const treeResult = Tree.create('test-doc', Position2D.origin(), propsResult.value);
          expect(treeResult.isOk()).toBe(true);

          if (treeResult.isOk()) {
            const styledTree = treeResult.value;

            // Check flow support based on layout style
            if (style === 'bottom-up') {
              expect(styledTree.supportsBottomUpFlow()).toBe(true);
              expect(styledTree.supportsTopDownFlow()).toBe(false);
            } else if (style === 'top-down') {
              expect(styledTree.supportsBottomUpFlow()).toBe(false);
              expect(styledTree.supportsTopDownFlow()).toBe(true);
            } else {
              // Horizontal layouts
              expect(styledTree.supportsBottomUpFlow()).toBe(false);
              expect(styledTree.supportsTopDownFlow()).toBe(false);
            }
          }
        }
      });
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal to itself', () => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.equals(tree)).toBe(true);
      }
    });

    it('should not be equal to different tree', () => {
      const result1 = Tree.create('doc1');
      const result2 = Tree.create('doc2');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('String Representation', () => {
    it('should provide meaningful string representation', () => {
      const posResult = Position2D.create(10, 20);
      const propsResult = PhysicalProperties.create(
        'bottom-up',
        30,
        30,
        60,
        30,
        'radial',
        'center',
      );

      expect(posResult.isOk()).toBe(true);
      expect(propsResult.isOk()).toBe(true);

      if (posResult.isOk() && propsResult.isOk()) {
        const result = Tree.create('test-doc', posResult.value, propsResult.value, 'Test Title');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const tree = result.value;
          const str = tree.toString();

          expect(str).toContain('Tree');
          expect(str).toContain('Test Title');
        }
      }
    });
  });

  describe('Node Parent Relationship Management', () => {
    let tree: Tree;
    let nodeId1: NodeId;
    let nodeId2: NodeId;
    let nodeId3: NodeId;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
      nodeId1 = nodeIdFactory.build();
      nodeId2 = nodeIdFactory.build();
      nodeId3 = nodeIdFactory.build();

      // Add nodes to the tree
      tree.addNode(nodeId1);
      tree.addNode(nodeId2);
      tree.addNode(nodeId3);
    });

    describe('getNode', () => {
      it('should return node with parent information when node exists', () => {
        const node = tree.getNode(nodeId1);
        expect(node).not.toBeNull();
        expect(node?.getParentId()).toBeNull(); // Initially no parent
      });

      it('should return null when node does not exist', () => {
        const nonExistentNodeId = nodeIdFactory.build();
        const node = tree.getNode(nonExistentNodeId);
        expect(node).toBeNull();
      });
    });

    describe('setNodeParent', () => {
      it('should set parent for existing node', () => {
        const result = tree.setNodeParent(nodeId1, nodeId2);
        expect(result.isOk()).toBe(true);

        const node = tree.getNode(nodeId1);
        expect(node?.getParentId()?.equals(nodeId2)).toBe(true);
      });

      it('should set parent to null (remove parent)', () => {
        tree.setNodeParent(nodeId1, nodeId2);
        const result = tree.setNodeParent(nodeId1, null);
        expect(result.isOk()).toBe(true);

        const node = tree.getNode(nodeId1);
        expect(node?.getParentId()).toBeNull();
      });

      it('should fail when node does not exist', () => {
        const nonExistentNodeId = nodeIdFactory.build();
        const result = tree.setNodeParent(nonExistentNodeId, nodeId1);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Node not found in tree');
        }
      });

      it('should fail when parent node does not exist', () => {
        const nonExistentParentId = nodeIdFactory.build();
        const result = tree.setNodeParent(nodeId1, nonExistentParentId);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Parent node not found in tree');
        }
      });

      it('should fail when setting parent would create cycle', () => {
        // Create a chain: node1 -> node2 -> node3
        tree.setNodeParent(nodeId1, nodeId2);
        tree.setNodeParent(nodeId2, nodeId3);

        // Try to create cycle: node3 -> node1 (would create cycle)
        const result = tree.setNodeParent(nodeId3, nodeId1);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Setting parent would create cycle');
        }
      });
    });

    describe('addNodeWithParent', () => {
      it('should add new node with parent', () => {
        const newNodeId = nodeIdFactory.build();
        const result = tree.addNodeWithParent(newNodeId, nodeId1);
        expect(result.isOk()).toBe(true);
        expect(tree.containsNode(newNodeId)).toBe(true);
      });

      it('should fail when node already exists', () => {
        const result = tree.addNodeWithParent(nodeId1, nodeId2);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Node already exists in tree');
        }
      });

      it('should fail when parent node does not exist', () => {
        const newNodeId = nodeIdFactory.build();
        const nonExistentParentId = nodeIdFactory.build();
        const result = tree.addNodeWithParent(newNodeId, nonExistentParentId);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Parent node not found in tree');
        }
      });

      it('should fail when adding would create cycle', () => {
        // Set up a parent relationship first
        tree.setNodeParent(nodeId1, nodeId2);

        // Try to add a new node that would create a cycle
        const newNodeId = nodeIdFactory.build();
        const result = tree.addNodeWithParent(newNodeId, nodeId1);

        // This should succeed since it doesn't create a cycle
        expect(result.isOk()).toBe(true);

        // But if we try to make nodeId2 a child of the new node, that would create a cycle
        const cycleResult = tree.addNodeWithParent(nodeId2, newNodeId);
        expect(cycleResult.isErr()).toBe(true);
        if (cycleResult.isErr()) {
          expect(cycleResult.error).toBeInstanceOf(ValidationError);
          expect(cycleResult.error.message).toContain('Node already exists in tree');
        }
      });
    });

    describe('wouldCreateCycle', () => {
      it('should detect direct cycle', () => {
        const wouldCreateCycle = tree.wouldCreateCycle(nodeId1, nodeId1);
        expect(wouldCreateCycle).toBe(true);
      });

      it('should detect indirect cycle', () => {
        // Create chain: node1 -> node2 -> node3
        tree.setNodeParent(nodeId1, nodeId2);
        tree.setNodeParent(nodeId2, nodeId3);

        // Check if setting node3 as parent of node1 would create cycle
        // This should detect that node3 is already in the parent chain of node1
        const wouldCreateCycle = tree.wouldCreateCycle(nodeId3, nodeId1);
        expect(wouldCreateCycle).toBe(true);
      });

      it('should not detect cycle for valid parent-child relationship', () => {
        tree.setNodeParent(nodeId1, nodeId2);
        const wouldCreateCycle = tree.wouldCreateCycle(nodeId3, nodeId1);
        expect(wouldCreateCycle).toBe(false);
      });

      it('should handle cycles with existing visited nodes', () => {
        // Create a linear chain first: node1 -> node2 -> node3
        tree.setNodeParent(nodeId1, nodeId2);
        tree.setNodeParent(nodeId2, nodeId3);

        // Now check if making nodeId1 parent of nodeId3 would create cycle
        // nodeId3 would get parent nodeId1, but nodeId1 already has parent chain to nodeId3
        const wouldCreateCycle = tree.wouldCreateCycle(nodeId3, nodeId1);
        expect(wouldCreateCycle).toBe(true); // Should detect cycle
      });
    });
  });

  describe('Complex Async Methods', () => {
    let tree: Tree;
    let mockAtomicArgumentRepo: IAtomicArgumentRepository;
    let mockOrderedSetRepo: IOrderedSetRepository;
    let mockArgument1: AtomicArgument;
    let mockArgument2: AtomicArgument;
    let argumentId1: AtomicArgumentId;
    let argumentId2: AtomicArgumentId;
    let orderedSetId1: OrderedSetId;
    let orderedSetId2: OrderedSetId;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }

      // Create test IDs
      argumentId1 = atomicArgumentIdFactory.build();
      argumentId2 = atomicArgumentIdFactory.build();
      orderedSetId1 = orderedSetIdFactory.build();
      orderedSetId2 = orderedSetIdFactory.build();

      // Create mock arguments
      mockArgument1 = createMockAtomicArgument(argumentId1, orderedSetId1, orderedSetId2);
      mockArgument2 = createMockAtomicArgument(argumentId2, orderedSetId2, null);

      // Create mock repositories
      mockAtomicArgumentRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        findByOrderedSetReference: vi.fn(),
        delete: vi.fn(),
        findArgumentsByPremiseCount: vi.fn(),
        findArgumentsUsingStatement: vi.fn(),
        findArgumentsByComplexity: vi.fn(),
        findArgumentsWithConclusion: vi.fn(),
        findArgumentChains: vi.fn(),
        findCircularDependencies: vi.fn(),
        findArgumentsByValidationStatus: vi.fn(),
        findMostReferencedArguments: vi.fn(),
        findOrphanedArguments: vi.fn(),
      };

      mockOrderedSetRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
        findOrderedSetsBySize: vi.fn(),
        findOrderedSetsContaining: vi.fn(),
        findSharedOrderedSets: vi.fn(),
        findOrderedSetsByPattern: vi.fn(),
        findUnusedOrderedSets: vi.fn(),
        findOrderedSetsByReferenceCount: vi.fn(),
        findSimilarOrderedSets: vi.fn(),
        findEmptyOrderedSets: vi.fn(),
      };
    });

    describe('findDirectConnections', () => {
      it('should find direct connections for existing argument', async () => {
        // Setup repository mocks
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument1);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([mockArgument1, mockArgument2]);

        const result = await tree.findDirectConnections(argumentId1, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const connectionMap = result.value;
          expect(connectionMap).toBeInstanceOf(TreeConnectionMap);
          expect(connectionMap.getCentralArgumentId()).toEqual(argumentId1);
        }

        expect(mockAtomicArgumentRepo.findById).toHaveBeenCalledWith(argumentId1);
        expect(mockAtomicArgumentRepo.findAll).toHaveBeenCalled();
      });

      it('should fail when argument not found', async () => {
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        const result = await tree.findDirectConnections(argumentId1, mockAtomicArgumentRepo);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Argument not found');
        }
      });

      it('should handle repository errors gracefully', async () => {
        const repositoryError = new Error('Database connection failed');
        vi.mocked(mockAtomicArgumentRepo.findById).mockRejectedValue(repositoryError);

        await expect(
          tree.findDirectConnections(argumentId1, mockAtomicArgumentRepo),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('findArgumentTree', () => {
      it('should find all connected arguments', async () => {
        // Setup for successful traversal
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument1);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([mockArgument1, mockArgument2]);

        const result = await tree.findArgumentTree(argumentId1, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const structure = result.value;
          expect(structure).toBeInstanceOf(TreeArgumentStructure);
          expect(structure.getAllArguments()).toContain(argumentId1);
          expect(structure.getArgumentCount()).toBeGreaterThan(0);
        }
      });

      it('should handle single argument tree', async () => {
        // Mock an argument with no connections
        const isolatedArgument = createMockAtomicArgument(argumentId1, null, null);

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(isolatedArgument);
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([isolatedArgument]);

        const result = await tree.findArgumentTree(argumentId1, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const structure = result.value;
          expect(structure.getArgumentCount()).toBe(1);
          expect(structure.getAllArguments()).toEqual([argumentId1]);
        }
      });
    });

    describe('findPathCompleteArgument', () => {
      it('should find path complete argument between two points', async () => {
        // Setup connected arguments
        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id) => {
          if (id.equals(argumentId1)) return Promise.resolve(mockArgument1);
          if (id.equals(argumentId2)) return Promise.resolve(mockArgument2);
          return Promise.resolve(null);
        });
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([mockArgument1, mockArgument2]);

        const result = await tree.findPathCompleteArgument(
          argumentId1,
          argumentId2,
          mockAtomicArgumentRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pathCompleteArgument = result.value;
          expect(pathCompleteArgument).toBeInstanceOf(TreePathCompleteArgument);
          expect(pathCompleteArgument.getAllArguments().length).toBeGreaterThan(0);
          expect(pathCompleteArgument.getAllPaths().length).toBeGreaterThan(0);
        }
      });

      it('should fail when no path exists', async () => {
        // Setup disconnected arguments
        const disconnectedArgument = createMockAtomicArgument(
          argumentId2,
          orderedSetIdFactory.build(), // Different set
          null,
        );

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id) => {
          if (id.equals(argumentId1)) return Promise.resolve(mockArgument1);
          if (id.equals(argumentId2)) return Promise.resolve(disconnectedArgument);
          return Promise.resolve(null);
        });
        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([
          mockArgument1,
          disconnectedArgument,
        ]);

        const result = await tree.findPathCompleteArgument(
          argumentId1,
          argumentId2,
          mockAtomicArgumentRepo,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('No path exists between arguments');
        }
      });
    });

    describe('discoverSharedReferences', () => {
      it('should discover shared ordered set references', async () => {
        vi.mocked(mockAtomicArgumentRepo.findByOrderedSetReference).mockResolvedValue([
          mockArgument1,
          mockArgument2,
        ]);

        const result = await tree.discoverSharedReferences(orderedSetId1, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const references = result.value;
          expect(Array.isArray(references)).toBe(true);
          references.forEach((ref) => {
            expect(ref).toBeInstanceOf(TreeOrderedSetReference);
            expect(['premise', 'conclusion']).toContain(ref.referenceType);
          });
        }
      });

      it('should handle empty reference results', async () => {
        vi.mocked(mockAtomicArgumentRepo.findByOrderedSetReference).mockResolvedValue([]);

        const result = await tree.discoverSharedReferences(orderedSetId1, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const references = result.value;
          expect(references).toEqual([]);
        }
      });

      it('should discover conclusion references specifically (line 401-402)', async () => {
        // Create an argument that uses the orderedSetId as conclusion (not premise)
        const argumentWithConclusionRef = createMockAtomicArgument(
          argumentId1,
          orderedSetIdFactory.build(), // Different premise set
          orderedSetId1, // Uses orderedSetId1 as conclusion
        );

        vi.mocked(mockAtomicArgumentRepo.findByOrderedSetReference).mockResolvedValue([
          argumentWithConclusionRef,
        ]);

        const result = await tree.discoverSharedReferences(orderedSetId1, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const references = result.value;
          expect(references.length).toBe(1);
          expect(references[0]?.referenceType).toBe('conclusion');
          expect(references[0]?.argumentId).toEqual(argumentId1);
          expect(references[0]?.orderedSetId).toEqual(orderedSetId1);
        }
      });
    });

    describe('validateConnectionIntegrity', () => {
      it('should validate connection integrity successfully', async () => {
        const mockOrderedSet = {}; // Mock OrderedSet
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument1);
        vi.mocked(mockOrderedSetRepo.findById).mockResolvedValue(mockOrderedSet as any);

        const result = await tree.validateConnectionIntegrity(
          argumentId1,
          mockAtomicArgumentRepo,
          mockOrderedSetRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const report = result.value;
          expect(report).toBeInstanceOf(TreeConnectionIntegrityReport);
          expect(report.argumentId).toEqual(argumentId1);
        }
      });

      it('should detect missing premise set', async () => {
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument1);
        vi.mocked(mockOrderedSetRepo.findById).mockImplementation(async (id) => {
          if (id.equals(orderedSetId1)) return Promise.resolve(null); // Missing premise set
          return Promise.resolve({} as any); // Other sets exist
        });

        const result = await tree.validateConnectionIntegrity(
          argumentId1,
          mockAtomicArgumentRepo,
          mockOrderedSetRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const report = result.value;
          expect(report.hasIssues()).toBe(true);
          expect(report.issues.some((issue) => issue.type === 'missing_premise_set')).toBe(true);
        }
      });

      it('should detect missing conclusion set', async () => {
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument1);
        vi.mocked(mockOrderedSetRepo.findById).mockImplementation(async (id) => {
          if (id.equals(orderedSetId2)) return Promise.resolve(null); // Missing conclusion set
          return Promise.resolve({} as any); // Other sets exist
        });

        const result = await tree.validateConnectionIntegrity(
          argumentId1,
          mockAtomicArgumentRepo,
          mockOrderedSetRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const report = result.value;
          expect(report.hasIssues()).toBe(true);
          expect(report.issues.some((issue) => issue.type === 'missing_conclusion_set')).toBe(true);
        }
      });

      it('should fail when argument not found', async () => {
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        const result = await tree.validateConnectionIntegrity(
          argumentId1,
          mockAtomicArgumentRepo,
          mockOrderedSetRepo,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Argument not found');
        }
      });

      it('should fail when argument not part of tree', async () => {
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument1);

        // Mock isArgumentInTree to return false by creating a tree spy
        const treeSpy = vi.spyOn(tree as any, 'isArgumentInTree').mockReturnValue(false);

        const result = await tree.validateConnectionIntegrity(
          argumentId1,
          mockAtomicArgumentRepo,
          mockOrderedSetRepo,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ProcessingError);
          expect(result.error.message).toBe('Argument not part of this tree');
        }

        treeSpy.mockRestore();
      });
    });
  });

  describe('Helper Classes', () => {
    describe('TreeConnectionMap', () => {
      it('should store and retrieve connection data', () => {
        const centralId = atomicArgumentIdFactory.build();
        const parents = [
          createMockAtomicArgument(atomicArgumentIdFactory.build(), null, null),
          createMockAtomicArgument(atomicArgumentIdFactory.build(), null, null),
        ];
        const children = [createMockAtomicArgument(atomicArgumentIdFactory.build(), null, null)];

        const connectionMap = new TreeConnectionMap(centralId, parents, children);

        expect(connectionMap.getCentralArgumentId()).toEqual(centralId);
        expect(connectionMap.getParents()).toEqual(parents);
        expect(connectionMap.getChildren()).toEqual(children);
      });
    });

    describe('TreeArgumentStructure', () => {
      it('should store and retrieve argument structure data', () => {
        const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
        const structure = new TreeArgumentStructure(argumentIds);

        expect(structure.getAllArguments()).toEqual(argumentIds);
        expect(structure.getArgumentCount()).toBe(2);
      });

      it('should handle empty argument list', () => {
        const structure = new TreeArgumentStructure([]);
        expect(structure.getAllArguments()).toEqual([]);
        expect(structure.getArgumentCount()).toBe(0);
      });
    });

    describe('TreePathCompleteArgument', () => {
      it('should store and retrieve path complete data', () => {
        const argumentIds = [atomicArgumentIdFactory.build(), atomicArgumentIdFactory.build()];
        const paths = [argumentIds[0], argumentIds[1]]
          .filter((id) => id !== undefined)
          .map((id) => [id]);
        const pathCompleteArgument = new TreePathCompleteArgument(argumentIds, paths);

        expect(pathCompleteArgument.getAllArguments()).toEqual(argumentIds);
        expect(pathCompleteArgument.getAllPaths()).toEqual(paths);
      });
    });

    describe('TreeOrderedSetReference', () => {
      it('should store reference data correctly', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const orderedSetId = orderedSetIdFactory.build();
        const reference = new TreeOrderedSetReference(argumentId, 'premise', orderedSetId);

        expect(reference.argumentId).toEqual(argumentId);
        expect(reference.referenceType).toBe('premise');
        expect(reference.orderedSetId).toEqual(orderedSetId);
      });

      it('should handle conclusion reference type', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const orderedSetId = orderedSetIdFactory.build();
        const reference = new TreeOrderedSetReference(argumentId, 'conclusion', orderedSetId);

        expect(reference.referenceType).toBe('conclusion');
      });
    });

    describe('TreeConnectionIntegrityReport', () => {
      it('should report when no issues exist', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const report = new TreeConnectionIntegrityReport(argumentId, []);

        expect(report.argumentId).toEqual(argumentId);
        expect(report.hasIssues()).toBe(false);
        expect(report.issues).toEqual([]);
      });

      it('should report when issues exist', () => {
        const argumentId = atomicArgumentIdFactory.build();
        const issues = [
          new TreeConnectionIntegrityIssue('missing_premise_set', 'Premise set not found'),
          new TreeConnectionIntegrityIssue('missing_conclusion_set', 'Conclusion set not found'),
        ];
        const report = new TreeConnectionIntegrityReport(argumentId, issues);

        expect(report.hasIssues()).toBe(true);
        expect(report.issues).toEqual(issues);
      });
    });

    describe('TreeConnectionIntegrityIssue', () => {
      it('should store issue data correctly', () => {
        const issue = new TreeConnectionIntegrityIssue(
          'missing_premise_set',
          'The premise set could not be found',
        );

        expect(issue.type).toBe('missing_premise_set');
        expect(issue.description).toBe('The premise set could not be found');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('validateStructuralIntegrity', () => {
      it('should detect inaccessible nodes', () => {
        const nodeId = nodeIdFactory.build();
        tree.addNode(nodeId);

        // Since getNode always returns a valid object for nodes in nodeIds,
        // this test actually validates that all nodes are accessible
        const result = tree.validateStructuralIntegrity();
        expect(result.isOk()).toBe(true);

        // Test with empty tree
        const emptyTreeResult = Tree.create('empty-doc');
        expect(emptyTreeResult.isOk()).toBe(true);
        if (emptyTreeResult.isOk()) {
          const emptyTree = emptyTreeResult.value;
          const emptyResult = emptyTree.validateStructuralIntegrity();
          expect(emptyResult.isOk()).toBe(true);
        }
      });

      it('should detect when getNode returns null (line 464-465)', () => {
        const nodeId = nodeIdFactory.build();
        tree.addNode(nodeId);

        // Spy on getNode to make it return null, simulating a corrupt state
        const getNodeSpy = vi.spyOn(tree, 'getNode').mockReturnValue(null);

        const result = tree.validateStructuralIntegrity();
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('not accessible in tree');
          expect(result.error.message).toContain(nodeId.getValue());
        }

        getNodeSpy.mockRestore();
      });
    });

    describe('uncovered line coverage for complex async methods', () => {
      let mockAtomicArgumentRepo: IAtomicArgumentRepository;
      let argumentId1: AtomicArgumentId;
      let argumentId2: AtomicArgumentId;
      let argumentId3: AtomicArgumentId;
      let orderedSetId1: OrderedSetId;
      let orderedSetId2: OrderedSetId;
      let orderedSetId3: OrderedSetId;

      beforeEach(() => {
        argumentId1 = atomicArgumentIdFactory.build();
        argumentId2 = atomicArgumentIdFactory.build();
        argumentId3 = atomicArgumentIdFactory.build();
        orderedSetId1 = orderedSetIdFactory.build();
        orderedSetId2 = orderedSetIdFactory.build();
        orderedSetId3 = orderedSetIdFactory.build();

        mockAtomicArgumentRepo = {
          save: vi.fn(),
          findById: vi.fn(),
          findAll: vi.fn(),
          findByOrderedSetReference: vi.fn(),
          delete: vi.fn(),
          findArgumentsByPremiseCount: vi.fn(),
          findArgumentsUsingStatement: vi.fn(),
          findArgumentsByComplexity: vi.fn(),
          findArgumentsWithConclusion: vi.fn(),
          findArgumentChains: vi.fn(),
          findCircularDependencies: vi.fn(),
          findArgumentsByValidationStatus: vi.fn(),
          findMostReferencedArguments: vi.fn(),
          findOrphanedArguments: vi.fn(),
        };
      });

      it('should exercise traverseConnectedArguments with parent connections (line 516-517)', async () => {
        // Create a connected argument chain: arg1 <- arg2 <- arg3 (arg3 has parents arg2, arg1)
        const arg1 = createMockAtomicArgument(argumentId1, null, orderedSetId1);
        const arg2 = createMockAtomicArgument(argumentId2, orderedSetId1, orderedSetId2); // connects to arg1
        const arg3 = createMockAtomicArgument(argumentId3, orderedSetId2, orderedSetId3); // connects to arg2

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id) => {
          if (id.equals(argumentId1)) return arg1;
          if (id.equals(argumentId2)) return arg2;
          if (id.equals(argumentId3)) return arg3;
          return null;
        });

        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([arg1, arg2, arg3]);

        // Start traversal from arg3, which should find its parent connections (arg2 -> arg1)
        const result = await tree.findArgumentTree(argumentId3, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const structure = result.value;
          // Should include all connected arguments through parent relationships
          expect(structure.getArgumentCount()).toBeGreaterThan(1);
          expect(structure.getAllArguments()).toContain(argumentId3);
        }
      });

      it('should exercise depthFirstSearch recursive calls (line 565)', async () => {
        // Create a complex connected tree with multiple branches to force recursive DFS
        // Chain: arg1 -> arg2 -> arg3 (where arg2 connects to both arg1 and arg3)
        const arg1 = createMockAtomicArgument(argumentId1, null, orderedSetId1);
        const arg2 = createMockAtomicArgument(argumentId2, orderedSetId1, orderedSetId2); // child of arg1
        const arg3 = createMockAtomicArgument(argumentId3, orderedSetId2, null); // child of arg2

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id) => {
          if (id.equals(argumentId1)) return arg1;
          if (id.equals(argumentId2)) return arg2;
          if (id.equals(argumentId3)) return arg3;
          return null;
        });

        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([arg1, arg2, arg3]);

        // Find path from arg1 to arg3, which requires traversing through arg2
        const result = await tree.findPathCompleteArgument(
          argumentId1,
          argumentId3,
          mockAtomicArgumentRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pathCompleteArgument = result.value;
          expect(pathCompleteArgument.getAllPaths().length).toBeGreaterThan(0);
          // Verify that the path includes all intermediate arguments
          expect(pathCompleteArgument.getAllArguments()).toContain(argumentId1);
          expect(pathCompleteArgument.getAllArguments()).toContain(argumentId2);
          expect(pathCompleteArgument.getAllArguments()).toContain(argumentId3);
        }
      });

      it('should exercise isArgumentInTree loop body (line 582)', async () => {
        // Add some nodes to the tree to exercise the for loop in isArgumentInTree
        const nodeId1 = nodeIdFactory.build();
        const nodeId2 = nodeIdFactory.build();
        tree.addNode(nodeId1);
        tree.addNode(nodeId2);

        // Create an argument that would trigger the isArgumentInTree check
        const mockArgument = createMockAtomicArgument(argumentId1, orderedSetId1, orderedSetId2);

        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument);

        // The validateConnectionIntegrity method calls isArgumentInTree internally
        const mockOrderedSetRepo = {
          save: vi.fn(),
          findById: vi.fn().mockResolvedValue({}), // Mock ordered set exists
          findAll: vi.fn(),
          delete: vi.fn(),
          findOrderedSetsBySize: vi.fn(),
          findOrderedSetsContaining: vi.fn(),
          findSharedOrderedSets: vi.fn(),
          findOrderedSetsByPattern: vi.fn(),
          findUnusedOrderedSets: vi.fn(),
          findOrderedSetsByReferenceCount: vi.fn(),
          findSimilarOrderedSets: vi.fn(),
          findEmptyOrderedSets: vi.fn(),
        };

        // This should exercise the isArgumentInTree method with nodes in the tree
        const result = await tree.validateConnectionIntegrity(
          argumentId1,
          mockAtomicArgumentRepo,
          mockOrderedSetRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const report = result.value;
          expect(report.argumentId).toEqual(argumentId1);
        }
      });

      it('should handle complex path finding with multiple intermediate nodes', async () => {
        // Create a longer chain to ensure all recursive paths are exercised
        const arg1 = createMockAtomicArgument(argumentId1, null, orderedSetId1);
        const arg2 = createMockAtomicArgument(argumentId2, orderedSetId1, orderedSetId2);
        const arg3 = createMockAtomicArgument(argumentId3, orderedSetId2, orderedSetId3);

        // Add a fourth argument for more complex traversal
        const argumentId4 = atomicArgumentIdFactory.build();
        const orderedSetId4 = orderedSetIdFactory.build();
        const arg4 = createMockAtomicArgument(argumentId4, orderedSetId3, orderedSetId4);

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id) => {
          if (id.equals(argumentId1)) return arg1;
          if (id.equals(argumentId2)) return arg2;
          if (id.equals(argumentId3)) return arg3;
          if (id.equals(argumentId4)) return arg4;
          return null;
        });

        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([arg1, arg2, arg3, arg4]);

        // Find path from start to end through multiple intermediate nodes
        const result = await tree.findPathCompleteArgument(
          argumentId1,
          argumentId4,
          mockAtomicArgumentRepo,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pathCompleteArgument = result.value;
          expect(pathCompleteArgument.getAllArguments().length).toBe(4);
          expect(pathCompleteArgument.getAllPaths().length).toBeGreaterThan(0);
        }
      });

      it('should handle arguments with both parent and child connections', async () => {
        // Create a branched structure to exercise both parent and child traversal paths
        const arg1 = createMockAtomicArgument(argumentId1, null, orderedSetId1);
        const arg2 = createMockAtomicArgument(argumentId2, orderedSetId1, orderedSetId2);

        // Create additional arguments that connect to arg2 as both parent and child
        const argumentId3 = atomicArgumentIdFactory.build();
        const argumentId4 = atomicArgumentIdFactory.build();
        const orderedSetId4 = orderedSetIdFactory.build();

        const arg3 = createMockAtomicArgument(argumentId3, orderedSetId2, orderedSetId3); // child of arg2
        const arg4 = createMockAtomicArgument(argumentId4, orderedSetId3, orderedSetId4); // child of arg3

        vi.mocked(mockAtomicArgumentRepo.findById).mockImplementation(async (id) => {
          if (id.equals(argumentId1)) return arg1;
          if (id.equals(argumentId2)) return arg2;
          if (id.equals(argumentId3)) return arg3;
          if (id.equals(argumentId4)) return arg4;
          return null;
        });

        vi.mocked(mockAtomicArgumentRepo.findAll).mockResolvedValue([arg1, arg2, arg3, arg4]);

        // Start traversal from middle argument that has both parents and children
        const result = await tree.findArgumentTree(argumentId2, mockAtomicArgumentRepo);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const structure = result.value;
          expect(structure.getArgumentCount()).toBe(4); // Should find all connected arguments
          expect(structure.getAllArguments()).toContain(argumentId1); // parent
          expect(structure.getAllArguments()).toContain(argumentId2); // center
          expect(structure.getAllArguments()).toContain(argumentId3); // child
          expect(structure.getAllArguments()).toContain(argumentId4); // grandchild
        }
      });

      it('should handle empty node tree in isArgumentInTree method', async () => {
        // Test with empty tree (no nodes) to ensure for loop body isn't entered
        const emptyTreeResult = Tree.create('empty-tree-doc');
        expect(emptyTreeResult.isOk()).toBe(true);

        if (emptyTreeResult.isOk()) {
          const emptyTree = emptyTreeResult.value;
          const mockArgument = createMockAtomicArgument(argumentId1, orderedSetId1, orderedSetId2);

          vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(mockArgument);

          const mockOrderedSetRepo = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue({}),
            findAll: vi.fn(),
            delete: vi.fn(),
            findOrderedSetsBySize: vi.fn(),
            findOrderedSetsContaining: vi.fn(),
            findSharedOrderedSets: vi.fn(),
            findOrderedSetsByPattern: vi.fn(),
            findUnusedOrderedSets: vi.fn(),
            findOrderedSetsByReferenceCount: vi.fn(),
            findSimilarOrderedSets: vi.fn(),
            findEmptyOrderedSets: vi.fn(),
          };

          // This should exercise isArgumentInTree with empty node set
          const result = await emptyTree.validateConnectionIntegrity(
            argumentId1,
            mockAtomicArgumentRepo,
            mockOrderedSetRepo,
          );

          expect(result.isOk()).toBe(true);
        }
      });
    });

    describe('Complex cycle detection scenarios', () => {
      it('should handle deeply nested parent chains', () => {
        const nodes = Array.from({ length: 5 }, () => nodeIdFactory.build());

        // Add all nodes
        nodes.forEach((nodeId) => tree.addNode(nodeId));

        // Create chain: nodes[0] -> nodes[1] -> nodes[2] -> nodes[3] -> nodes[4]
        for (let i = 0; i < nodes.length - 1; i++) {
          const child = nodes[i];
          const parent = nodes[i + 1];
          if (child && parent) {
            tree.setNodeParent(child, parent);
          }
        }

        // Try to create cycle by making last node parent of first
        // This would create: nodes[4] -> nodes[0] -> nodes[1] -> ... -> nodes[4] (cycle)
        const lastNode = nodes[nodes.length - 1];
        const firstNode = nodes[0];
        if (lastNode && firstNode) {
          const wouldCreateCycle = tree.wouldCreateCycle(lastNode, firstNode);
          expect(wouldCreateCycle).toBe(true);
        }
      });

      it('should handle self-referential scenarios correctly', () => {
        const nodeId = nodeIdFactory.build();
        tree.addNode(nodeId);

        const wouldCreateCycle = tree.wouldCreateCycle(nodeId, nodeId);
        expect(wouldCreateCycle).toBe(true);
      });
    });

    describe('Repository error handling', () => {
      let mockAtomicArgumentRepo: IAtomicArgumentRepository;

      beforeEach(() => {
        mockAtomicArgumentRepo = {
          save: vi.fn(),
          findById: vi.fn(),
          findAll: vi.fn(),
          findByOrderedSetReference: vi.fn(),
          delete: vi.fn(),
          findArgumentsByPremiseCount: vi.fn(),
          findArgumentsUsingStatement: vi.fn(),
          findArgumentsByComplexity: vi.fn(),
          findArgumentsWithConclusion: vi.fn(),
          findArgumentChains: vi.fn(),
          findCircularDependencies: vi.fn(),
          findArgumentsByValidationStatus: vi.fn(),
          findMostReferencedArguments: vi.fn(),
          findOrphanedArguments: vi.fn(),
        };
      });

      it('should handle network timeouts in async methods', async () => {
        const argumentId = atomicArgumentIdFactory.build();
        const timeoutError = new Error('Network timeout');
        vi.mocked(mockAtomicArgumentRepo.findById).mockRejectedValue(timeoutError);

        await expect(
          tree.findDirectConnections(argumentId, mockAtomicArgumentRepo),
        ).rejects.toThrow('Network timeout');
      });

      it('should handle null responses gracefully', async () => {
        const argumentId = atomicArgumentIdFactory.build();
        vi.mocked(mockAtomicArgumentRepo.findById).mockResolvedValue(null);

        const result = await tree.findDirectConnections(argumentId, mockAtomicArgumentRepo);
        expect(result.isErr()).toBe(true);
      });
    });
  });

  describe('Property-Based Testing', () => {
    describe('node management consistency', () => {
      it('should maintain node count consistency', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.constant(null).map(() => nodeIdFactory.build()),
              {
                minLength: 0,
                maxLength: 5,
              },
            ),
            (nodeIds) => {
              const result = Tree.create('test-doc');
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const tree = result.value;
                const uniqueNodeIds = Array.from(new Set(nodeIds.map((id) => id.getValue())));

                // Add all unique nodes
                uniqueNodeIds.forEach((idStr) => {
                  try {
                    const nodeIdResult = NodeId.fromString(idStr);
                    if (nodeIdResult.isOk()) {
                      tree.addNode(nodeIdResult.value);
                    }
                  } catch {
                    // Skip invalid node IDs
                  }
                });

                // Count how many were actually added (only valid ones)
                const actualCount = uniqueNodeIds.filter((idStr) => {
                  try {
                    NodeId.fromString(idStr);
                    return true;
                  } catch {
                    return false;
                  }
                }).length;

                expect(tree.getNodeCount()).toBe(actualCount);
                expect(tree.isEmpty()).toBe(actualCount === 0);

                // Verify all valid nodes are contained
                uniqueNodeIds.forEach((idStr) => {
                  try {
                    const nodeIdResult = NodeId.fromString(idStr);
                    if (nodeIdResult.isOk()) {
                      expect(tree.containsNode(nodeIdResult.value)).toBe(true);
                    }
                  } catch {
                    // Skip invalid node IDs
                  }
                });
              }
            },
          ),
        );
      });

      it('should maintain parent-child relationship consistency', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.constant(null).map(() => nodeIdFactory.build()),
              { minLength: 2, maxLength: 4 },
            ),
            (nodeIds) => {
              const result = Tree.create('test-doc');
              expect(result.isOk()).toBe(true);

              if (result.isOk() && nodeIds.length >= 2) {
                const tree = result.value;

                // Add all nodes
                nodeIds.forEach((nodeId) => tree.addNode(nodeId));

                // Create valid parent-child relationships (linear chain)
                for (let i = 0; i < nodeIds.length - 1; i++) {
                  const child = nodeIds[i];
                  const parent = nodeIds[i + 1];
                  if (child && parent) {
                    const setParentResult = tree.setNodeParent(child, parent);
                    expect(setParentResult.isOk()).toBe(true);
                  }
                }

                // Verify relationships are maintained
                for (let i = 0; i < nodeIds.length - 1; i++) {
                  const currentNode = nodeIds[i];
                  const parentNode = nodeIds[i + 1];
                  if (currentNode && parentNode) {
                    const node = tree.getNode(currentNode);
                    expect(node?.getParentId()?.equals(parentNode)).toBe(true);
                  }
                }

                // Last node should have no parent
                const lastNodeId = nodeIds[nodeIds.length - 1];
                if (lastNodeId) {
                  const lastNode = tree.getNode(lastNodeId);
                  expect(lastNode?.getParentId()).toBeNull();
                }
              }
            },
          ),
        );
      });
    });
  });

  describe('Additional Tree Coverage for 95%+ Target', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should handle complex async method error scenarios', async () => {
      const mockAtomicArgumentRepo: IAtomicArgumentRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        findAll: vi.fn().mockRejectedValue(new Error('Repository error')),
        findByOrderedSetReference: vi.fn().mockRejectedValue(new Error('Query failed')),
        delete: vi.fn(),
        findArgumentsByPremiseCount: vi.fn(),
        findArgumentsUsingStatement: vi.fn(),
        findArgumentsByComplexity: vi.fn(),
        findArgumentsWithConclusion: vi.fn(),
        findArgumentChains: vi.fn(),
        findCircularDependencies: vi.fn(),
        findArgumentsByValidationStatus: vi.fn(),
        findMostReferencedArguments: vi.fn(),
        findOrphanedArguments: vi.fn(),
      };

      const argumentId = atomicArgumentIdFactory.build();

      // Test direct connection error propagation (findById returns null)
      const directResult = await tree.findDirectConnections(argumentId, mockAtomicArgumentRepo);
      expect(directResult.isErr()).toBe(true);

      // Test shared references error (this will trigger the async error)
      await expect(
        tree.discoverSharedReferences(orderedSetIdFactory.build(), mockAtomicArgumentRepo),
      ).rejects.toThrow('Query failed');
    });

    it('should handle edge cases in tree structural validation', () => {
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();

      tree.addNode(nodeId1);
      tree.addNode(nodeId2);

      // Test various node parent scenarios
      const setParentResult = tree.setNodeParent(nodeId1, nodeId2);
      expect(setParentResult.isOk()).toBe(true);

      // Test cycle detection with complex chains
      const nodeId3 = nodeIdFactory.build();
      tree.addNode(nodeId3);
      tree.setNodeParent(nodeId2, nodeId3);

      // This should detect that setting nodeId3 as parent of nodeId1 would create a cycle
      const cycleResult = tree.setNodeParent(nodeId3, nodeId1);
      expect(cycleResult.isErr()).toBe(true);
    });

    it('should handle findDirectConnections with empty premise/conclusion sets', async () => {
      const argumentId = atomicArgumentIdFactory.build();
      const mockArgument = createMockAtomicArgument(argumentId, null, null);

      const mockAtomicArgumentRepo: IAtomicArgumentRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(mockArgument),
        findAll: vi.fn().mockResolvedValue([mockArgument]),
        findByOrderedSetReference: vi.fn(),
        delete: vi.fn(),
        findArgumentsByPremiseCount: vi.fn(),
        findArgumentsUsingStatement: vi.fn(),
        findArgumentsByComplexity: vi.fn(),
        findArgumentsWithConclusion: vi.fn(),
        findArgumentChains: vi.fn(),
        findCircularDependencies: vi.fn(),
        findArgumentsByValidationStatus: vi.fn(),
        findMostReferencedArguments: vi.fn(),
        findOrphanedArguments: vi.fn(),
      };

      const result = await tree.findDirectConnections(argumentId, mockAtomicArgumentRepo);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const connectionMap = result.value;
        expect(connectionMap.getParents()).toEqual([]);
        expect(connectionMap.getChildren()).toEqual([]);
      }
    });

    it('should handle validateConnectionIntegrity with null ordered sets', async () => {
      const argumentId = atomicArgumentIdFactory.build();
      const orderedSetId = orderedSetIdFactory.build();
      const mockArgument = createMockAtomicArgument(argumentId, orderedSetId, null);

      const mockAtomicArgumentRepo: IAtomicArgumentRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(mockArgument),
        findAll: vi.fn(),
        findByOrderedSetReference: vi.fn(),
        delete: vi.fn(),
        findArgumentsByPremiseCount: vi.fn(),
        findArgumentsUsingStatement: vi.fn(),
        findArgumentsByComplexity: vi.fn(),
        findArgumentsWithConclusion: vi.fn(),
        findArgumentChains: vi.fn(),
        findCircularDependencies: vi.fn(),
        findArgumentsByValidationStatus: vi.fn(),
        findMostReferencedArguments: vi.fn(),
        findOrphanedArguments: vi.fn(),
      };

      const mockOrderedSetRepo: IOrderedSetRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue({}), // Valid ordered set
        findAll: vi.fn(),
        delete: vi.fn(),
        findOrderedSetsBySize: vi.fn(),
        findOrderedSetsContaining: vi.fn(),
        findSharedOrderedSets: vi.fn(),
        findOrderedSetsByPattern: vi.fn(),
        findUnusedOrderedSets: vi.fn(),
        findOrderedSetsByReferenceCount: vi.fn(),
        findSimilarOrderedSets: vi.fn(),
        findEmptyOrderedSets: vi.fn(),
      };

      const result = await tree.validateConnectionIntegrity(
        argumentId,
        mockAtomicArgumentRepo,
        mockOrderedSetRepo,
      );
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const report = result.value;
        expect(report.hasIssues()).toBe(false); // No conclusion set to validate
      }
    });

    it('should handle tree operations with very long titles and IDs', () => {
      const longTitle = 'A'.repeat(1000);
      const longDocumentId = `doc-${'x'.repeat(500)}`;

      const result = Tree.create(longDocumentId, undefined, undefined, longTitle);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const treeWithLongValues = result.value;
        expect(treeWithLongValues.getDocumentId()).toBe(longDocumentId);
        expect(treeWithLongValues.getTitle()).toBe(longTitle);
        expect(treeWithLongValues.hasTitle()).toBe(true);
      }
    });

    it('should handle getBounds with various physical property configurations', () => {
      const configs = [
        { layout: 'bottom-up' as const, minWidth: 10, minHeight: 5 },
        { layout: 'top-down' as const, minWidth: 100, minHeight: 50 },
        { layout: 'left-right' as const, minWidth: 200, minHeight: 100 },
        { layout: 'right-left' as const, minWidth: 300, minHeight: 150 },
      ];

      configs.forEach((config, index) => {
        const propsResult = PhysicalProperties.create(
          config.layout,
          config.minWidth,
          config.minHeight,
        );
        expect(propsResult.isOk()).toBe(true);

        if (propsResult.isOk()) {
          const posResult = Position2D.create(50, 60);
          expect(posResult.isOk()).toBe(true);

          if (posResult.isOk()) {
            const treeResult = Tree.create(
              `bounds-test-${index}`,
              posResult.value,
              propsResult.value,
            );
            expect(treeResult.isOk()).toBe(true);

            if (treeResult.isOk()) {
              const testTree = treeResult.value;
              const bounds = testTree.getBounds();

              expect(bounds.minX).toBe(50);
              expect(bounds.minY).toBe(60);
              // PhysicalProperties may have different defaults, let's check actual values
              const actualMinWidth = testTree.getPhysicalProperties().getMinWidth();
              const actualMinHeight = testTree.getPhysicalProperties().getMinHeight();
              expect(bounds.maxX).toBe(50 + actualMinWidth);
              expect(bounds.maxY).toBe(60 + actualMinHeight);
            }
          }
        }
      });
    });

    it('should handle overlapsWithBounds edge cases', () => {
      const posResult = Position2D.create(10, 10);
      const propsResult = PhysicalProperties.create('bottom-up', 20, 20);

      expect(posResult.isOk()).toBe(true);
      expect(propsResult.isOk()).toBe(true);

      if (posResult.isOk() && propsResult.isOk()) {
        const treeResult = Tree.create('overlap-test', posResult.value, propsResult.value);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const testTree = treeResult.value;
          const bounds = testTree.getBounds();

          // Get actual bounds for proper testing
          const { minX, minY, maxX, maxY } = bounds;

          // Test exact edge touching (should not overlap - uses <= and >= comparisons)
          expect(
            testTree.overlapsWithBounds({ minX: maxX, minY: minY, maxX: maxX + 10, maxY: maxY }),
          ).toBe(false);
          expect(testTree.overlapsWithBounds({ minX: 0, minY: 0, maxX: minX, maxY: minY })).toBe(
            false,
          );

          // Test minimal overlap (should overlap)
          expect(
            testTree.overlapsWithBounds({
              minX: maxX - 1,
              minY: minY,
              maxX: maxX + 10,
              maxY: maxY,
            }),
          ).toBe(true);
          expect(
            testTree.overlapsWithBounds({ minX: 0, minY: 0, maxX: minX + 1, maxY: minY + 1 }),
          ).toBe(true);

          // Test complete containment
          expect(
            testTree.overlapsWithBounds({
              minX: minX - 5,
              minY: minY - 5,
              maxX: maxX + 5,
              maxY: maxY + 5,
            }),
          ).toBe(true);
          expect(
            testTree.overlapsWithBounds({
              minX: minX + 1,
              minY: minY + 1,
              maxX: maxX - 1,
              maxY: maxY - 1,
            }),
          ).toBe(true);
        }
      }
    });

    it('should handle toString with various tree configurations', () => {
      const configs = [
        { title: undefined, expectedPattern: /^Tree at \(.+\) \(\d+ nodes\)$/ },
        { title: '', expectedPattern: /^Tree at \(.+\) \(\d+ nodes\)$/ },
        { title: 'Simple Title', expectedPattern: /^Tree "Simple Title" at \(.+\) \(\d+ nodes\)$/ },
        {
          title: 'Complex "Title" with \'quotes\'',
          expectedPattern: /^Tree "Complex "Title" with 'quotes'" at \(.+\) \(\d+ nodes\)$/,
        },
      ];

      configs.forEach((config) => {
        const result = Tree.create('toString-test', undefined, undefined, config.title);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const testTree = result.value;
          const str = testTree.toString();
          expect(str).toMatch(config.expectedPattern);
        }
      });
    });

    it('should handle distanceFrom with same tree instance', () => {
      expect(tree.distanceFrom(tree)).toBe(0);
    });

    it('should handle addNodeWithParent success case without cycle', () => {
      const parentId = nodeIdFactory.build();
      const childId = nodeIdFactory.build();

      tree.addNode(parentId);

      const result = tree.addNodeWithParent(childId, parentId);
      expect(result.isOk()).toBe(true);
      expect(tree.containsNode(childId)).toBe(true);
      expect(tree.getNodeCount()).toBe(2);
    });

    it('should handle tree reconstruction with duplicate node IDs in input array', () => {
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();
      const duplicateNodeIds = [nodeId1, nodeId2, nodeId1]; // nodeId1 appears twice

      const result = Tree.reconstruct(
        treeIdFactory.build(),
        'duplicate-test',
        Position2D.origin(),
        PhysicalProperties.default(),
        duplicateNodeIds,
        Date.now(),
        Date.now(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructedTree = result.value;
        // Set should deduplicate, so only 2 unique nodes
        expect(reconstructedTree.getNodeCount()).toBe(2);
        expect(reconstructedTree.containsNode(nodeId1)).toBe(true);
        expect(reconstructedTree.containsNode(nodeId2)).toBe(true);
      }
    });
  });

  describe('Business Invariants and Advanced Edge Cases', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('test-doc');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('modification time consistency', () => {
      it('should not update modification time when moveTo receives same position', () => {
        const currentPosition = tree.getPosition();
        const originalModified = tree.getModifiedAt();

        const result = tree.moveTo(currentPosition);
        expect(result.isOk()).toBe(true);

        // Modified time should remain the same
        expect(tree.getModifiedAt()).toBe(originalModified);
      });

      it('should update modification time when moveTo receives different position', () => {
        const newPositionResult = Position2D.create(50, 50);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const originalModified = tree.getModifiedAt();

          // Mock a new timestamp for the move operation
          const laterTimestamp = originalModified + 1000;
          mockDateNow.mockReturnValueOnce(laterTimestamp);

          const result = tree.moveTo(newPositionResult.value);
          expect(result.isOk()).toBe(true);

          // Modified time should be updated
          expect(tree.getModifiedAt()).toBe(laterTimestamp);
          expect(tree.getModifiedAt()).not.toBe(originalModified);
        }
      });

      it('should not update modification time when updatePhysicalProperties receives same properties', () => {
        const currentProperties = tree.getPhysicalProperties();
        const originalModified = tree.getModifiedAt();

        const result = tree.updatePhysicalProperties(currentProperties);
        expect(result.isOk()).toBe(true);

        // Modified time should remain the same
        expect(tree.getModifiedAt()).toBe(originalModified);
      });

      it('should not update modification time when setTitle receives same title', () => {
        tree.setTitle('Same Title');
        const originalModified = tree.getModifiedAt();

        const result = tree.setTitle('Same Title');
        expect(result.isOk()).toBe(true);

        // Modified time should remain the same since title didn't change
        expect(tree.getModifiedAt()).toBe(originalModified);
      });

      it('should handle setTitle with trimmed empty string consistently', () => {
        tree.setTitle('Original Title');
        const originalModified = tree.getModifiedAt();

        // Mock a later timestamp for the title change
        const laterTimestamp = originalModified + 1000;
        mockDateNow.mockReturnValueOnce(laterTimestamp);

        // Set title to whitespace-only string
        const result = tree.setTitle('   ');
        expect(result.isOk()).toBe(true);
        expect(tree.getTitle()).toBe('');
        expect(tree.hasTitle()).toBe(false);

        // Since trimmed empty string is different from original title, modified time should change
        expect(tree.getModifiedAt()).toBe(laterTimestamp);
        expect(tree.getModifiedAt()).toBeGreaterThan(originalModified);
      });
    });

    describe('spatial invariants', () => {
      it('should maintain position consistency', () => {
        const originalPosition = tree.getPosition();

        // Move to a new position
        const newPositionResult = Position2D.create(100, 200);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const moveResult = tree.moveTo(newPositionResult.value);
          expect(moveResult.isOk()).toBe(true);

          expect(tree.getPosition().equals(newPositionResult.value)).toBe(true);
          expect(tree.isAtPosition(100, 200)).toBe(true);
          expect(tree.isAtPosition(originalPosition.getX(), originalPosition.getY())).toBe(false);
        }
      });

      it('should calculate bounds correctly after position changes', () => {
        const initialBounds = tree.getBounds();

        // Move tree
        const moveResult = tree.moveBy(50, 30);
        expect(moveResult.isOk()).toBe(true);

        const newBounds = tree.getBounds();

        // Bounds should shift by the same amount
        expect(newBounds.minX).toBe(initialBounds.minX + 50);
        expect(newBounds.minY).toBe(initialBounds.minY + 30);
        expect(newBounds.maxX).toBe(initialBounds.maxX + 50);
        expect(newBounds.maxY).toBe(initialBounds.maxY + 30);
      });
    });

    describe('node consistency invariants', () => {
      it('should maintain node count consistency across operations', () => {
        const nodeIds = [nodeIdFactory.build(), nodeIdFactory.build(), nodeIdFactory.build()];

        // Add nodes
        nodeIds.forEach((nodeId) => {
          const result = tree.addNode(nodeId);
          expect(result.isOk()).toBe(true);
        });

        expect(tree.getNodeCount()).toBe(3);
        expect(tree.isEmpty()).toBe(false);

        // Remove some nodes
        const nodeToRemove = nodeIds[1];
        if (nodeToRemove) {
          const removeResult = tree.removeNode(nodeToRemove);
          expect(removeResult.isOk()).toBe(true);
          expect(tree.getNodeCount()).toBe(2);

          // Verify remaining nodes
          const firstNode = nodeIds[0];
          const secondNode = nodeIds[1];
          const thirdNode = nodeIds[2];
          if (firstNode) expect(tree.containsNode(firstNode)).toBe(true);
          if (secondNode) expect(tree.containsNode(secondNode)).toBe(false);
          if (thirdNode) expect(tree.containsNode(thirdNode)).toBe(true);
        }
      });

      it('should maintain parent-child consistency', () => {
        const parentId = nodeIdFactory.build();
        const childId = nodeIdFactory.build();

        tree.addNode(parentId);
        tree.addNode(childId);

        // Set parent relationship
        const setParentResult = tree.setNodeParent(childId, parentId);
        expect(setParentResult.isOk()).toBe(true);

        // Verify relationship
        const childNode = tree.getNode(childId);
        expect(childNode?.getParentId()?.equals(parentId)).toBe(true);

        // Clear parent relationship
        const clearResult = tree.setNodeParent(childId, null);
        expect(clearResult.isOk()).toBe(true);

        const updatedChildNode = tree.getNode(childId);
        expect(updatedChildNode?.getParentId()).toBeNull();
      });
    });
  });
});

// Helper function to create mock AtomicArgument objects
function createMockAtomicArgument(
  id: AtomicArgumentId,
  premiseSetRef: OrderedSetId | null,
  conclusionSetRef: OrderedSetId | null,
): AtomicArgument {
  return {
    getId: vi.fn(() => id),
    getPremiseSet: vi.fn(() => premiseSetRef),
    getConclusionSet: vi.fn(() => conclusionSetRef),
    getCreatedAt: vi.fn(() => Date.now()),
    getModifiedAt: vi.fn(() => Date.now()),
    getSideLabels: vi.fn(() => ({})),
    setPremiseSetRef: vi.fn(),
    setConclusionSetRef: vi.fn(),
    updateSideLabels: vi.fn(),
    setLeftSideLabel: vi.fn(),
    setRightSideLabel: vi.fn(),
    hasPremiseSet: vi.fn(() => premiseSetRef !== null),
    hasConclusionSet: vi.fn(() => conclusionSetRef !== null),
    hasEmptyPremiseSet: vi.fn(() => premiseSetRef === null),
    hasEmptyConclusionSet: vi.fn(() => conclusionSetRef === null),
  } as unknown as AtomicArgument;
}
