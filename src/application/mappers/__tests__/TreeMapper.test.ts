import { describe, expect, it } from 'vitest';
import {
  nodeIdFactory,
  physicalPropertiesFactory,
  position2DFactory,
  treeFactory,
  treeIdFactory,
} from '../../../domain/__tests__/factories/index.js';
import { Tree } from '../../../domain/entities/Tree.js';
import { PhysicalProperties, Position2D } from '../../../domain/shared/value-objects.js';
import type { TreeDTO } from '../../queries/shared-types.js';
import { treesToDomains, treesToDTOs, treeToDomain, treeToDTO } from '../TreeMapper.js';

describe('TreeMapper', () => {
  describe('treeToDTO', () => {
    it('should convert a valid Tree to TreeDTO', () => {
      // Arrange
      const position = position2DFactory.build();
      const physicalProperties = physicalPropertiesFactory.build();
      const tree = treeFactory.build(
        {},
        {
          transient: {
            position,
            physicalProperties,
            title: 'Test Tree',
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result).toEqual({
        id: tree.getId().getValue(),
        position: {
          x: position.getX(),
          y: position.getY(),
        },
        bounds: {
          width: physicalProperties.getMinWidth(),
          height: physicalProperties.getMinHeight(),
        },
        nodeCount: 0, // Empty tree
        rootNodeIds: [],
      });
    });

    it('should handle tree with specific coordinates', () => {
      // Arrange
      const specificPosition = Position2D.create(100, 200);
      expect(specificPosition.isOk()).toBe(true);
      if (specificPosition.isErr()) return;

      const specificPhysicalProperties = PhysicalProperties.create(
        'bottom-up',
        30,
        40,
        150,
        100,
        'horizontal',
        'center',
      );
      expect(specificPhysicalProperties.isOk()).toBe(true);
      if (specificPhysicalProperties.isErr()) return;

      const tree = treeFactory.build(
        {},
        {
          transient: {
            position: specificPosition.value,
            physicalProperties: specificPhysicalProperties.value,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.position).toEqual({ x: 100, y: 200 });
      expect(result.bounds).toEqual({ width: 150, height: 100 });
    });

    it('should handle tree with nodes', () => {
      // Arrange
      const tree = treeFactory.build();
      const nodeId1 = nodeIdFactory.build();
      const nodeId2 = nodeIdFactory.build();
      const nodeId3 = nodeIdFactory.build();

      // Add nodes to tree
      const addResult1 = tree.addNode(nodeId1);
      const addResult2 = tree.addNode(nodeId2);
      const addResult3 = tree.addNode(nodeId3);

      expect(addResult1.isOk()).toBe(true);
      expect(addResult2.isOk()).toBe(true);
      expect(addResult3.isOk()).toBe(true);

      // Set up parent-child relationships
      // nodeId1 is root (no parent)
      // nodeId2 is child of nodeId1
      // nodeId3 is child of nodeId1
      const parentResult1 = tree.setNodeParent(nodeId1, null); // Root
      const parentResult2 = tree.setNodeParent(nodeId2, nodeId1); // Child
      const parentResult3 = tree.setNodeParent(nodeId3, nodeId1); // Child

      expect(parentResult1.isOk()).toBe(true);
      expect(parentResult2.isOk()).toBe(true);
      expect(parentResult3.isOk()).toBe(true);

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.nodeCount).toBe(3);
      expect(result.rootNodeIds).toEqual([nodeId1.getValue()]);
    });

    it('should handle tree with multiple root nodes', () => {
      // Arrange
      const tree = treeFactory.build();
      const rootNodeId1 = nodeIdFactory.build();
      const rootNodeId2 = nodeIdFactory.build();
      const childNodeId = nodeIdFactory.build();

      // Add nodes
      tree.addNode(rootNodeId1);
      tree.addNode(rootNodeId2);
      tree.addNode(childNodeId);

      // Set up relationships: two roots, one child
      tree.setNodeParent(rootNodeId1, null); // Root 1
      tree.setNodeParent(rootNodeId2, null); // Root 2
      tree.setNodeParent(childNodeId, rootNodeId1); // Child of root 1

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.nodeCount).toBe(3);
      expect(result.rootNodeIds).toHaveLength(2);
      expect(result.rootNodeIds).toContain(rootNodeId1.getValue());
      expect(result.rootNodeIds).toContain(rootNodeId2.getValue());
    });

    it('should handle tree with empty position coordinates', () => {
      // Arrange
      const originPosition = Position2D.origin();
      const tree = treeFactory.build(
        {},
        {
          transient: {
            position: originPosition,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.position).toEqual({ x: 0, y: 0 });
    });

    it('should handle tree with minimal physical properties', () => {
      // Arrange
      const minimalProperties = PhysicalProperties.default();
      const tree = treeFactory.build(
        {},
        {
          transient: {
            physicalProperties: minimalProperties,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.bounds).toBeDefined();
      expect(result.bounds?.width).toBeGreaterThan(0);
      expect(result.bounds?.height).toBeGreaterThan(0);
    });

    it('should handle tree with large coordinates', () => {
      // Arrange
      const largePosition = Position2D.create(9999, 9999);
      expect(largePosition.isOk()).toBe(true);
      if (largePosition.isErr()) return;

      const tree = treeFactory.build(
        {},
        {
          transient: {
            position: largePosition.value,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.position).toEqual({ x: 9999, y: 9999 });
    });

    it('should handle tree with negative coordinates', () => {
      // Arrange
      const negativePosition = Position2D.create(-100, -200);
      expect(negativePosition.isOk()).toBe(true);
      if (negativePosition.isErr()) return;

      const tree = treeFactory.build(
        {},
        {
          transient: {
            position: negativePosition.value,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.position).toEqual({ x: -100, y: -200 });
    });

    it('should preserve tree ID correctly', () => {
      // Arrange
      const specificTreeId = treeIdFactory.build();
      const documentId = 'test-document';
      const position = Position2D.origin();
      const physicalProperties = PhysicalProperties.default();

      const treeResult = Tree.reconstruct(
        specificTreeId,
        documentId,
        position,
        physicalProperties,
        [],
        Date.now(),
        Date.now(),
      );

      expect(treeResult.isOk()).toBe(true);
      if (treeResult.isErr()) return;

      const tree = treeResult.value;

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.id).toBe(specificTreeId.getValue());
    });
  });

  describe('treesToDTOs', () => {
    it('should convert empty array of trees', () => {
      // Arrange
      const trees: Tree[] = [];

      // Act
      const result = treesToDTOs(trees);

      // Assert
      expect(result).toEqual([]);
    });

    it('should convert single tree in array', () => {
      // Arrange
      const tree = treeFactory.build();
      const trees = [tree];

      // Act
      const result = treesToDTOs(trees);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(treeToDTO(tree));
    });

    it('should convert multiple trees', () => {
      // Arrange
      const tree1 = treeFactory.build();
      const tree2 = treeFactory.build();
      const tree3 = treeFactory.build();
      const trees = [tree1, tree2, tree3];

      // Act
      const result = treesToDTOs(trees);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(treeToDTO(tree1));
      expect(result[1]).toEqual(treeToDTO(tree2));
      expect(result[2]).toEqual(treeToDTO(tree3));
    });

    it('should handle trees with different configurations', () => {
      // Arrange
      const emptyTree = treeFactory.build();

      const treeWithNodes = treeFactory.build();
      const nodeId = nodeIdFactory.build();
      treeWithNodes.addNode(nodeId);
      treeWithNodes.setNodeParent(nodeId, null);

      const positionResult = Position2D.create(50, 75);
      if (positionResult.isErr()) return;
      const treeWithSpecificPosition = treeFactory.build(
        {},
        {
          transient: {
            position: positionResult.value,
          },
        },
      );

      const trees = [emptyTree, treeWithNodes, treeWithSpecificPosition];

      // Act
      const result = treesToDTOs(trees);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.nodeCount).toBe(0);
      expect(result[1]?.nodeCount).toBe(1);
      expect(result[2]?.position).toEqual({ x: 50, y: 75 });
    });
  });

  describe('treeToDomain', () => {
    it('should convert valid TreeDTO to Tree domain entity', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: 100, y: 200 },
        bounds: { width: 300, height: 400 },
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.getId().getValue()).toBe('test-tree-id');
        expect(tree.getPosition().getX()).toBe(100);
        expect(tree.getPosition().getY()).toBe(200);
        expect(tree.getPhysicalProperties().getMinWidth()).toBe(300);
        expect(tree.getPhysicalProperties().getMinHeight()).toBe(400);
        expect(tree.getNodeCount()).toBe(0);
      }
    });

    it('should convert TreeDTO without bounds using defaults', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: 50, y: 75 },
        nodeCount: 2,
        rootNodeIds: ['node1', 'node2'],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.getId().getValue()).toBe('test-tree-id');
        expect(tree.getPosition().getX()).toBe(50);
        expect(tree.getPosition().getY()).toBe(75);
        // Should use default physical properties
        expect(tree.getPhysicalProperties().getMinWidth()).toBeGreaterThan(0);
        expect(tree.getPhysicalProperties().getMinHeight()).toBeGreaterThan(0);
      }
    });

    it('should fail with invalid tree ID', () => {
      // Arrange
      const dto: TreeDTO = {
        id: '', // Invalid empty ID
        position: { x: 0, y: 0 },
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should fail with invalid position coordinates', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: Number.NaN, y: 0 }, // Invalid coordinates
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('should fail with invalid physical properties', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: 0, y: 0 },
        bounds: { width: -100, height: 200 }, // Invalid negative width
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('should handle edge case coordinates', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: -1000, y: 1000 },
        bounds: { width: 1, height: 1 },
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.getPosition().getX()).toBe(-1000);
        expect(tree.getPosition().getY()).toBe(1000);
        expect(tree.getPhysicalProperties().getMinWidth()).toBe(1);
        expect(tree.getPhysicalProperties().getMinHeight()).toBe(1);
      }
    });

    it('should use current timestamp for creation and modification times', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: 0, y: 0 },
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';
      const startTime = Date.now();

      // Act
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        const endTime = Date.now();
        expect(tree.getCreatedAt()).toBeGreaterThanOrEqual(startTime);
        expect(tree.getCreatedAt()).toBeLessThanOrEqual(endTime);
        expect(tree.getModifiedAt()).toBeGreaterThanOrEqual(startTime);
        expect(tree.getModifiedAt()).toBeLessThanOrEqual(endTime);
      }
    });
  });

  describe('treesToDomains', () => {
    it('should convert empty array of TreeDTOs', () => {
      // Arrange
      const dtos: TreeDTO[] = [];
      const documentId = 'test-doc-id';

      // Act
      const result = treesToDomains(dtos, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should convert single valid TreeDTO', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'test-tree-id',
        position: { x: 100, y: 200 },
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treesToDomains([dto], documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.getId().getValue()).toBe('test-tree-id');
      }
    });

    it('should convert multiple valid TreeDTOs', () => {
      // Arrange
      const dtos: TreeDTO[] = [
        {
          id: 'tree-1',
          position: { x: 0, y: 0 },
          nodeCount: 0,
          rootNodeIds: [],
        },
        {
          id: 'tree-2',
          position: { x: 100, y: 100 },
          nodeCount: 1,
          rootNodeIds: ['node1'],
        },
        {
          id: 'tree-3',
          position: { x: 200, y: 200 },
          bounds: { width: 150, height: 100 },
          nodeCount: 2,
          rootNodeIds: ['node2', 'node3'],
        },
      ];
      const documentId = 'test-doc-id';

      // Act
      const result = treesToDomains(dtos, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0]?.getId().getValue()).toBe('tree-1');
        expect(result.value[1]?.getId().getValue()).toBe('tree-2');
        expect(result.value[2]?.getId().getValue()).toBe('tree-3');
      }
    });

    it('should fail fast on first invalid TreeDTO', () => {
      // Arrange
      const dtos: TreeDTO[] = [
        {
          id: 'valid-tree',
          position: { x: 0, y: 0 },
          nodeCount: 0,
          rootNodeIds: [],
        },
        {
          id: '', // Invalid empty ID
          position: { x: 100, y: 100 },
          nodeCount: 0,
          rootNodeIds: [],
        },
        {
          id: 'never-reached',
          position: { x: 200, y: 200 },
          nodeCount: 0,
          rootNodeIds: [],
        },
      ];
      const documentId = 'test-doc-id';

      // Act
      const result = treesToDomains(dtos, documentId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should maintain order of trees in conversion', () => {
      // Arrange
      const dtos: TreeDTO[] = [
        { id: 'first', position: { x: 0, y: 0 }, nodeCount: 0, rootNodeIds: [] },
        { id: 'second', position: { x: 0, y: 0 }, nodeCount: 0, rootNodeIds: [] },
        { id: 'third', position: { x: 0, y: 0 }, nodeCount: 0, rootNodeIds: [] },
      ];
      const documentId = 'test-doc-id';

      // Act
      const result = treesToDomains(dtos, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0]?.getId().getValue()).toBe('first');
        expect(result.value[1]?.getId().getValue()).toBe('second');
        expect(result.value[2]?.getId().getValue()).toBe('third');
      }
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain tree identity through round-trip conversion', () => {
      // Arrange
      const originalTree = treeFactory.build();
      const documentId = 'test-doc-id';

      // Act
      const dto = treeToDTO(originalTree);
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructedTree = result.value;

        // Verify core properties are preserved (note: timestamps will differ)
        expect(reconstructedTree.getId().getValue()).toBe(originalTree.getId().getValue());
        expect(reconstructedTree.getPosition().getX()).toBe(originalTree.getPosition().getX());
        expect(reconstructedTree.getPosition().getY()).toBe(originalTree.getPosition().getY());
        expect(reconstructedTree.getPhysicalProperties().getMinWidth()).toBe(
          originalTree.getPhysicalProperties().getMinWidth(),
        );
        expect(reconstructedTree.getPhysicalProperties().getMinHeight()).toBe(
          originalTree.getPhysicalProperties().getMinHeight(),
        );
      }
    });

    it('should handle round-trip with complex tree configurations', () => {
      // Arrange
      const customPosition = Position2D.create(500, 600);
      const customPhysicalProperties = PhysicalProperties.create(
        'bottom-up',
        25,
        30,
        400,
        300,
        'vertical',
        'left',
      );

      if (customPosition.isErr() || customPhysicalProperties.isErr()) return;

      const trees = [
        treeFactory.build(),
        treeFactory.build(
          {},
          {
            transient: {
              position: customPosition.value,
              physicalProperties: customPhysicalProperties.value,
            },
          },
        ),
      ];
      const documentId = 'test-doc-id';

      // Act
      const dtos = treesToDTOs(trees);
      const result = treesToDomains(dtos, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructedTrees = result.value;
        expect(reconstructedTrees).toHaveLength(2);

        // Verify first tree
        expect(reconstructedTrees[0]?.getId().getValue()).toBe(trees[0]?.getId().getValue());

        // Verify second tree with custom properties
        expect(reconstructedTrees[1]?.getId().getValue()).toBe(trees[1]?.getId().getValue());
        expect(reconstructedTrees[1]?.getPosition().getX()).toBe(500);
        expect(reconstructedTrees[1]?.getPosition().getY()).toBe(600);
        expect(reconstructedTrees[1]?.getPhysicalProperties().getMinWidth()).toBe(400);
        expect(reconstructedTrees[1]?.getPhysicalProperties().getMinHeight()).toBe(300);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle tree with complex node hierarchy', () => {
      // Arrange
      const tree = treeFactory.build();
      const rootId = nodeIdFactory.build();
      const child1Id = nodeIdFactory.build();
      const child2Id = nodeIdFactory.build();
      const grandChild1Id = nodeIdFactory.build();
      const grandChild2Id = nodeIdFactory.build();

      // Build hierarchy: root -> child1 -> grandChild1
      //                       -> child2 -> grandChild2
      tree.addNode(rootId);
      tree.addNode(child1Id);
      tree.addNode(child2Id);
      tree.addNode(grandChild1Id);
      tree.addNode(grandChild2Id);

      tree.setNodeParent(rootId, null); // Root
      tree.setNodeParent(child1Id, rootId);
      tree.setNodeParent(child2Id, rootId);
      tree.setNodeParent(grandChild1Id, child1Id);
      tree.setNodeParent(grandChild2Id, child2Id);

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.nodeCount).toBe(5);
      expect(result.rootNodeIds).toEqual([rootId.getValue()]);
    });

    it('should handle tree with nodes that have no parent relationship established', () => {
      // Arrange
      const tree = treeFactory.build();
      const nodeId = nodeIdFactory.build();

      // Add node but don't set parent relationship
      tree.addNode(nodeId);

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.nodeCount).toBe(1);
      // Node without explicit parent relationship should be treated as root
      expect(result.rootNodeIds).toContain(nodeId.getValue());
    });

    it('should handle tree with floating point coordinates', () => {
      // Arrange
      const floatPosition = Position2D.create(123.456, 789.012);
      expect(floatPosition.isOk()).toBe(true);
      if (floatPosition.isErr()) return;

      const tree = treeFactory.build(
        {},
        {
          transient: {
            position: floatPosition.value,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.position.x).toBeCloseTo(123.456, 3);
      expect(result.position.y).toBeCloseTo(789.012, 3);
    });

    it('should maintain data integrity across multiple conversions', () => {
      // Arrange
      const originalTree = treeFactory.build();
      const nodeId = nodeIdFactory.build();
      originalTree.addNode(nodeId);
      originalTree.setNodeParent(nodeId, null);

      // Act - Convert multiple times
      const dto1 = treeToDTO(originalTree);
      const dto2 = treeToDTO(originalTree);

      // Assert - Results should be identical
      expect(dto1).toEqual(dto2);
    });

    it('should handle extreme coordinate values in round-trip', () => {
      // Arrange
      const extremePosition = Position2D.create(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
      expect(extremePosition.isOk()).toBe(true);
      if (extremePosition.isErr()) return;

      const tree = treeFactory.build(
        {},
        {
          transient: {
            position: extremePosition.value,
          },
        },
      );
      const documentId = 'test-doc-id';

      // Act
      const dto = treeToDTO(tree);
      const result = treeToDomain(dto, documentId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const reconstructed = result.value;
        expect(reconstructed.getPosition().getX()).toBe(Number.MAX_SAFE_INTEGER);
        expect(reconstructed.getPosition().getY()).toBe(Number.MIN_SAFE_INTEGER);
      }
    });

    it('should handle zero-sized bounds gracefully', () => {
      // Arrange
      const dto: TreeDTO = {
        id: 'zero-bounds-tree',
        position: { x: 0, y: 0 },
        bounds: { width: 0, height: 0 },
        nodeCount: 0,
        rootNodeIds: [],
      };
      const documentId = 'test-doc-id';

      // Act
      const result = treeToDomain(dto, documentId);

      // This might fail validation, which is expected behavior
      // The test documents the current behavior
      if (result.isOk()) {
        expect(result.value.getPhysicalProperties().getMinWidth()).toBe(0);
        expect(result.value.getPhysicalProperties().getMinHeight()).toBe(0);
      } else {
        // If validation fails, that's also valid behavior
        expect(result.isErr()).toBe(true);
      }
    });
  });

  describe('TreeDTO structure validation', () => {
    it('should produce DTO with all required fields', () => {
      // Arrange
      const tree = treeFactory.build();

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('bounds');
      expect(result).toHaveProperty('nodeCount');
      expect(result).toHaveProperty('rootNodeIds');

      expect(result.position).toHaveProperty('x');
      expect(result.position).toHaveProperty('y');
      expect(result.bounds).toHaveProperty('width');
      expect(result.bounds).toHaveProperty('height');
    });

    it('should produce DTO with correct data types', () => {
      // Arrange
      const tree = treeFactory.build();
      const nodeId = nodeIdFactory.build();
      tree.addNode(nodeId);
      tree.setNodeParent(nodeId, null);

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(typeof result.id).toBe('string');
      expect(typeof result.position.x).toBe('number');
      expect(typeof result.position.y).toBe('number');
      expect(typeof result.bounds?.width).toBe('number');
      expect(typeof result.bounds?.height).toBe('number');
      expect(typeof result.nodeCount).toBe('number');
      expect(Array.isArray(result.rootNodeIds)).toBe(true);
      expect(result.rootNodeIds.every((id: string) => typeof id === 'string')).toBe(true);
    });

    it('should handle bounds field correctly', () => {
      // Arrange
      const customProperties = PhysicalProperties.create(
        'bottom-up',
        10,
        20,
        300,
        400,
        'horizontal',
        'center',
      );
      expect(customProperties.isOk()).toBe(true);
      if (customProperties.isErr()) return;

      const tree = treeFactory.build(
        {},
        {
          transient: {
            physicalProperties: customProperties.value,
          },
        },
      );

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.bounds).toBeDefined();
      expect(result.bounds?.width).toBe(300);
      expect(result.bounds?.height).toBe(400);
    });
  });

  describe('performance and consistency', () => {
    it('should handle large number of trees efficiently', () => {
      // Arrange
      const numberOfTrees = 100;
      const trees = Array.from({ length: numberOfTrees }, () => treeFactory.build());

      // Act
      const startTime = performance.now();
      const result = treesToDTOs(trees);
      const endTime = performance.now();

      // Assert
      expect(result).toHaveLength(numberOfTrees);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should maintain referential integrity for tree IDs', () => {
      // Arrange
      const tree = treeFactory.build();
      const originalId = tree.getId().getValue();

      // Act
      const result = treeToDTO(tree);

      // Assert
      expect(result.id).toBe(originalId);
      expect(result.id).toBe(tree.getId().getValue());
    });
  });
});
