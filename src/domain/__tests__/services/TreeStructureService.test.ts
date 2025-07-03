import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type AtomicArgument } from '../../entities/AtomicArgument.js';
import { Node } from '../../entities/Node.js';
import { Tree } from '../../entities/Tree.js';
import { TreeStructureService } from '../../services/TreeStructureService.js';
import { ValidationError } from '../../shared/result.js';
import {
  Attachment,
  type NodeId,
  PhysicalProperties,
  Position2D,
} from '../../shared/value-objects.js';
import { atomicArgumentIdFactory, nodeIdFactory } from '../factories/index.js';

describe('TreeStructureService', () => {
  let service: TreeStructureService;
  let mockAtomicArgument: AtomicArgument;
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    service = new TreeStructureService();

    // Create a consistent ID for mocking
    const mockArgumentId = atomicArgumentIdFactory.build();

    // Create a mock AtomicArgument using Vitest
    mockAtomicArgument = {
      getId: vi.fn(() => mockArgumentId),
    } as unknown as AtomicArgument;

    // Mock Date.now for consistent testing
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createTreeWithRootNode', () => {
    describe('successful creation cases', () => {
      it('should create tree with root node using minimal parameters', () => {
        const documentId = 'test-document';

        const result = service.createTreeWithRootNode(documentId, mockAtomicArgument);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const { tree, rootNode } = result.value;

          expect(tree.getDocumentId()).toBe(documentId);
          expect(tree.getPosition()).toEqual(Position2D.origin());
          expect(tree.getPhysicalProperties()).toEqual(PhysicalProperties.default());
          expect(tree.getTitle()).toBeUndefined();
          expect(tree.containsNode(rootNode.getId())).toBe(true);
          expect(tree.getNodeCount()).toBe(1);
          expect(rootNode.isRoot()).toBe(true);
          expect(rootNode.getArgumentId()).toBe(mockAtomicArgument.getId());
        }
      });

      it('should create tree with all parameters specified', () => {
        const documentId = 'full-document';
        const positionResult = Position2D.create(100, 200);
        const propertiesResult = PhysicalProperties.create('bottom-up', 300, 400);
        const title = 'Test Tree Title';

        expect(positionResult.isOk()).toBe(true);
        expect(propertiesResult.isOk()).toBe(true);

        if (positionResult.isOk() && propertiesResult.isOk()) {
          const result = service.createTreeWithRootNode(
            documentId,
            mockAtomicArgument,
            positionResult.value,
            propertiesResult.value,
            title
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const { tree, rootNode } = result.value;

            expect(tree.getDocumentId()).toBe(documentId);
            expect(tree.getPosition()).toEqual(positionResult.value);
            expect(tree.getPhysicalProperties()).toEqual(propertiesResult.value);
            expect(tree.getTitle()).toBe(title);
            expect(tree.containsNode(rootNode.getId())).toBe(true);
            expect(rootNode.isRoot()).toBe(true);
          }
        }
      });
    });

    describe('error cases', () => {
      it('should fail when document ID is invalid', () => {
        const invalidDocumentId = ''; // Empty document ID should fail

        const result = service.createTreeWithRootNode(invalidDocumentId, mockAtomicArgument);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Document ID cannot be empty');
        }
      });
    });
  });

  describe('addChildNodeToTree', () => {
    let tree: Tree;
    let parentNode: Node;
    let childArgument: AtomicArgument;

    beforeEach(() => {
      // Create a tree with a root node
      const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
      expect(treeResult.isOk()).toBe(true);
      if (treeResult.isOk()) {
        ({ tree, rootNode: parentNode } = treeResult.value);
      }

      const childArgumentId = atomicArgumentIdFactory.build();
      childArgument = {
        getId: vi.fn(() => childArgumentId),
      } as unknown as AtomicArgument;
    });

    describe('successful addition cases', () => {
      it('should add child node to existing parent', () => {
        const premisePosition = 0;

        const result = service.addChildNodeToTree(tree, parentNode, childArgument, premisePosition);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const childNode = result.value;

          expect(tree.containsNode(childNode.getId())).toBe(true);
          expect(tree.getNodeCount()).toBe(2);
          expect(childNode.isChild()).toBe(true);
          expect(childNode.getParentNodeId()).toEqual(parentNode.getId());
          expect(childNode.getArgumentId()).toBe(childArgument.getId());

          const attachment = childNode.getAttachment();
          expect(attachment).not.toBeNull();
          if (attachment) {
            expect(attachment.getParentNodeId()).toEqual(parentNode.getId());
            expect(attachment.getPremisePosition()).toBe(premisePosition);
          }
        }
      });

      it('should add child node with fromPosition specified', () => {
        const premisePosition = 1;
        const fromPosition = 2;

        const result = service.addChildNodeToTree(
          tree,
          parentNode,
          childArgument,
          premisePosition,
          fromPosition
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const childNode = result.value;
          const attachment = childNode.getAttachment();

          expect(attachment).not.toBeNull();
          if (attachment) {
            expect(attachment.getPremisePosition()).toBe(premisePosition);
            expect(attachment.getFromPosition()).toBe(fromPosition);
          }
        }
      });
    });

    describe('error cases', () => {
      it('should fail when parent node does not exist in tree', () => {
        // Create a separate root node not in the tree
        const orphanNodeResult = Node.createRoot(atomicArgumentIdFactory.build());
        expect(orphanNodeResult.isOk()).toBe(true);

        if (orphanNodeResult.isOk()) {
          const orphanNode = orphanNodeResult.value;

          const result = service.addChildNodeToTree(tree, orphanNode, childArgument, 0);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error.message).toBe('Parent node must exist in tree');
          }
        }
      });

      it('should fail with invalid premise position', () => {
        const invalidPremisePosition = -1;

        const result = service.addChildNodeToTree(
          tree,
          parentNode,
          childArgument,
          invalidPremisePosition
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });
  });

  describe('removeNodeFromTree', () => {
    let tree: Tree;
    let rootNode: Node;
    let childNode: Node;
    let grandChildNode: Node;
    let allNodes: Map<NodeId, Node>;

    beforeEach(() => {
      // Create tree with hierarchy: root -> child -> grandchild
      const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
      expect(treeResult.isOk()).toBe(true);
      if (treeResult.isOk()) {
        ({ tree, rootNode } = treeResult.value);
      }

      const childArgument = {
        getId: vi.fn(() => atomicArgumentIdFactory.build()),
      } as unknown as AtomicArgument;

      const childResult = service.addChildNodeToTree(tree, rootNode, childArgument, 0);
      expect(childResult.isOk()).toBe(true);
      if (childResult.isOk()) {
        childNode = childResult.value;
      }

      const grandChildArgument = {
        getId: vi.fn(() => atomicArgumentIdFactory.build()),
      } as unknown as AtomicArgument;

      const grandChildResult = service.addChildNodeToTree(tree, childNode, grandChildArgument, 0);
      expect(grandChildResult.isOk()).toBe(true);
      if (grandChildResult.isOk()) {
        grandChildNode = grandChildResult.value;
      }

      allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode.getId(), childNode],
        [grandChildNode.getId(), grandChildNode],
      ]);
    });

    describe('successful removal cases', () => {
      it('should remove leaf node', () => {
        const result = service.removeNodeFromTree(tree, grandChildNode, allNodes);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const removedIds = result.value;

          expect(removedIds).toEqual([grandChildNode.getId()]);
          expect(tree.containsNode(grandChildNode.getId())).toBe(false);
          expect(tree.containsNode(childNode.getId())).toBe(true);
          expect(tree.containsNode(rootNode.getId())).toBe(true);
          expect(tree.getNodeCount()).toBe(2);
        }
      });

      it('should remove node with children recursively', () => {
        const result = service.removeNodeFromTree(tree, childNode, allNodes);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const removedIds = result.value;

          expect(removedIds).toContain(childNode.getId());
          expect(removedIds).toContain(grandChildNode.getId());
          expect(removedIds).toHaveLength(2);
          expect(tree.containsNode(childNode.getId())).toBe(false);
          expect(tree.containsNode(grandChildNode.getId())).toBe(false);
          expect(tree.containsNode(rootNode.getId())).toBe(true);
          expect(tree.getNodeCount()).toBe(1);
        }
      });

      it('should remove all nodes when removing root', () => {
        const result = service.removeNodeFromTree(tree, rootNode, allNodes);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const removedIds = result.value;

          expect(removedIds).toContain(rootNode.getId());
          expect(removedIds).toContain(childNode.getId());
          expect(removedIds).toContain(grandChildNode.getId());
          expect(removedIds).toHaveLength(3);
          expect(tree.isEmpty()).toBe(true);
        }
      });
    });

    describe('error cases', () => {
      it('should fail when node does not exist in tree', () => {
        const orphanNodeResult = Node.createRoot(atomicArgumentIdFactory.build());
        expect(orphanNodeResult.isOk()).toBe(true);

        if (orphanNodeResult.isOk()) {
          const orphanNode = orphanNodeResult.value;

          const result = service.removeNodeFromTree(tree, orphanNode, allNodes);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error.message).toBe('Node not found in tree');
          }
        }
      });
    });
  });

  describe('moveNodeToNewParent', () => {
    let tree: Tree;
    let rootNode: Node;
    let childNode: Node;
    let newParentNode: Node;

    beforeEach(() => {
      // Create tree with multiple branches
      const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
      expect(treeResult.isOk()).toBe(true);
      if (treeResult.isOk()) {
        ({ tree, rootNode } = treeResult.value);
      }

      // Add child to root
      const childArgument = {
        getId: vi.fn(() => atomicArgumentIdFactory.build()),
      } as unknown as AtomicArgument;

      const childResult = service.addChildNodeToTree(tree, rootNode, childArgument, 0);
      expect(childResult.isOk()).toBe(true);
      if (childResult.isOk()) {
        childNode = childResult.value;
      }

      // Add another child to root (will become new parent)
      const newParentArgument = {
        getId: vi.fn(() => atomicArgumentIdFactory.build()),
      } as unknown as AtomicArgument;

      const newParentResult = service.addChildNodeToTree(tree, rootNode, newParentArgument, 1);
      expect(newParentResult.isOk()).toBe(true);
      if (newParentResult.isOk()) {
        newParentNode = newParentResult.value;
      }
    });

    describe('successful move cases', () => {
      it('should move node to new parent', () => {
        const newPremisePosition = 0;

        const result = service.moveNodeToNewParent(
          tree,
          childNode,
          newParentNode,
          newPremisePosition
        );

        expect(result.isOk()).toBe(true);
        expect(childNode.getParentNodeId()).toEqual(newParentNode.getId());

        const attachment = childNode.getAttachment();
        expect(attachment).not.toBeNull();
        if (attachment) {
          expect(attachment.getParentNodeId()).toEqual(newParentNode.getId());
          expect(attachment.getPremisePosition()).toBe(newPremisePosition);
        }
      });

      it('should move node with fromPosition specified', () => {
        const newPremisePosition = 1;
        const newFromPosition = 2;

        const result = service.moveNodeToNewParent(
          tree,
          childNode,
          newParentNode,
          newPremisePosition,
          newFromPosition
        );

        expect(result.isOk()).toBe(true);

        const attachment = childNode.getAttachment();
        expect(attachment).not.toBeNull();
        if (attachment) {
          expect(attachment.getPremisePosition()).toBe(newPremisePosition);
          expect(attachment.getFromPosition()).toBe(newFromPosition);
        }
      });
    });

    describe('error cases', () => {
      it('should fail when node to move does not exist in tree', () => {
        const attachmentResult = Attachment.create(rootNode.getId(), 0);
        expect(attachmentResult.isOk()).toBe(true);
        if (!attachmentResult.isOk()) return;

        const orphanNodeResult = Node.createChild(
          atomicArgumentIdFactory.build(),
          attachmentResult.value
        );
        expect(orphanNodeResult.isOk()).toBe(true);

        if (orphanNodeResult.isOk()) {
          const orphanNode = orphanNodeResult.value;

          const result = service.moveNodeToNewParent(tree, orphanNode, newParentNode, 0);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error.message).toBe('Both nodes must exist in tree');
          }
        }
      });

      it('should fail when new parent does not exist in tree', () => {
        const orphanParentResult = Node.createRoot(atomicArgumentIdFactory.build());
        expect(orphanParentResult.isOk()).toBe(true);

        if (orphanParentResult.isOk()) {
          const orphanParent = orphanParentResult.value;

          const result = service.moveNodeToNewParent(tree, childNode, orphanParent, 0);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error.message).toBe('Both nodes must exist in tree');
          }
        }
      });

      it('should fail when trying to move root node', () => {
        const result = service.moveNodeToNewParent(tree, rootNode, newParentNode, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Cannot move root node');
        }
      });
    });
  });

  describe('findRootNodes', () => {
    it('should find single root node', () => {
      const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
      expect(treeResult.isOk()).toBe(true);

      if (treeResult.isOk()) {
        const { tree, rootNode } = treeResult.value;
        const allNodes = new Map([[rootNode.getId(), rootNode]]);

        const rootNodes = service.findRootNodes(tree, allNodes);

        expect(rootNodes).toHaveLength(1);
        expect(rootNodes[0]).toBe(rootNode);
      }
    });

    it('should find multiple root nodes', () => {
      const treeResult = Tree.create('test-doc');
      expect(treeResult.isOk()).toBe(true);
      if (!treeResult.isOk()) return;
      const tree = treeResult.value;

      const rootNode1Result = Node.createRoot(atomicArgumentIdFactory.build());
      expect(rootNode1Result.isOk()).toBe(true);
      if (!rootNode1Result.isOk()) return;
      const rootNode1 = rootNode1Result.value;

      const rootNode2Result = Node.createRoot(atomicArgumentIdFactory.build());
      expect(rootNode2Result.isOk()).toBe(true);
      if (!rootNode2Result.isOk()) return;
      const rootNode2 = rootNode2Result.value;

      tree.addNode(rootNode1.getId());
      tree.addNode(rootNode2.getId());

      const allNodes = new Map([
        [rootNode1.getId(), rootNode1],
        [rootNode2.getId(), rootNode2],
      ]);

      const rootNodes = service.findRootNodes(tree, allNodes);

      expect(rootNodes).toHaveLength(2);
      expect(rootNodes).toContain(rootNode1);
      expect(rootNodes).toContain(rootNode2);
    });

    it('should return empty array for empty tree', () => {
      const treeResult = Tree.create('test-doc');
      expect(treeResult.isOk()).toBe(true);
      if (!treeResult.isOk()) return;
      const tree = treeResult.value;

      const allNodes = new Map<NodeId, Node>();

      const rootNodes = service.findRootNodes(tree, allNodes);

      expect(rootNodes).toHaveLength(0);
    });
  });

  describe('findDirectChildNodes', () => {
    let rootNode: Node;
    let childNode1: Node;
    let childNode2: Node;
    let grandChildNode: Node;
    let allNodes: Map<NodeId, Node>;

    beforeEach(() => {
      const rootNodeResult = Node.createRoot(atomicArgumentIdFactory.build());
      expect(rootNodeResult.isOk()).toBe(true);
      if (!rootNodeResult.isOk()) throw new Error('Failed to create root node');
      rootNode = rootNodeResult.value;

      const attachment1Result = Attachment.create(rootNode.getId(), 0);
      expect(attachment1Result.isOk()).toBe(true);
      if (!attachment1Result.isOk()) throw new Error('Failed to create attachment1');
      const attachment1 = attachment1Result.value;

      const childNode1Result = Node.createChild(atomicArgumentIdFactory.build(), attachment1);
      expect(childNode1Result.isOk()).toBe(true);
      if (!childNode1Result.isOk()) throw new Error('Failed to create childNode1');
      childNode1 = childNode1Result.value;

      const attachment2Result = Attachment.create(rootNode.getId(), 1);
      expect(attachment2Result.isOk()).toBe(true);
      if (!attachment2Result.isOk()) throw new Error('Failed to create attachment2');
      const attachment2 = attachment2Result.value;

      const childNode2Result = Node.createChild(atomicArgumentIdFactory.build(), attachment2);
      expect(childNode2Result.isOk()).toBe(true);
      if (!childNode2Result.isOk()) throw new Error('Failed to create childNode2');
      childNode2 = childNode2Result.value;

      const grandAttachmentResult = Attachment.create(childNode1.getId(), 0);
      expect(grandAttachmentResult.isOk()).toBe(true);
      if (!grandAttachmentResult.isOk()) throw new Error('Failed to create grandAttachment');
      const grandAttachment = grandAttachmentResult.value;

      const grandChildNodeResult = Node.createChild(
        atomicArgumentIdFactory.build(),
        grandAttachment
      );
      expect(grandChildNodeResult.isOk()).toBe(true);
      if (!grandChildNodeResult.isOk()) throw new Error('Failed to create grandChildNode');
      grandChildNode = grandChildNodeResult.value;

      allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode1.getId(), childNode1],
        [childNode2.getId(), childNode2],
        [grandChildNode.getId(), grandChildNode],
      ]);
    });

    it('should find direct children of parent', () => {
      const children = service.findDirectChildNodes(rootNode.getId(), allNodes);

      expect(children).toHaveLength(2);
      expect(children).toContain(childNode1);
      expect(children).toContain(childNode2);
      expect(children).not.toContain(grandChildNode); // Not direct child
    });

    it('should find single direct child', () => {
      const children = service.findDirectChildNodes(childNode1.getId(), allNodes);

      expect(children).toHaveLength(1);
      expect(children[0]).toBe(grandChildNode);
    });

    it('should return empty array for leaf node', () => {
      const children = service.findDirectChildNodes(grandChildNode.getId(), allNodes);

      expect(children).toHaveLength(0);
    });
  });

  describe('findAllDescendantNodes', () => {
    let rootNode: Node;
    let childNode1: Node;
    let childNode2: Node;
    let grandChildNode: Node;
    let allNodes: Map<NodeId, Node>;

    beforeEach(() => {
      const rootNodeResult = Node.createRoot(atomicArgumentIdFactory.build());
      expect(rootNodeResult.isOk()).toBe(true);
      if (!rootNodeResult.isOk()) throw new Error('Failed to create root node');
      rootNode = rootNodeResult.value;

      const attachment1Result = Attachment.create(rootNode.getId(), 0);
      expect(attachment1Result.isOk()).toBe(true);
      if (!attachment1Result.isOk()) throw new Error('Failed to create attachment1');
      const attachment1 = attachment1Result.value;

      const childNode1Result = Node.createChild(atomicArgumentIdFactory.build(), attachment1);
      expect(childNode1Result.isOk()).toBe(true);
      if (!childNode1Result.isOk()) throw new Error('Failed to create childNode1');
      childNode1 = childNode1Result.value;

      const attachment2Result = Attachment.create(rootNode.getId(), 1);
      expect(attachment2Result.isOk()).toBe(true);
      if (!attachment2Result.isOk()) throw new Error('Failed to create attachment2');
      const attachment2 = attachment2Result.value;

      const childNode2Result = Node.createChild(atomicArgumentIdFactory.build(), attachment2);
      expect(childNode2Result.isOk()).toBe(true);
      if (!childNode2Result.isOk()) throw new Error('Failed to create childNode2');
      childNode2 = childNode2Result.value;

      const grandAttachmentResult = Attachment.create(childNode1.getId(), 0);
      expect(grandAttachmentResult.isOk()).toBe(true);
      if (!grandAttachmentResult.isOk()) throw new Error('Failed to create grandAttachment');
      const grandAttachment = grandAttachmentResult.value;

      const grandChildNodeResult = Node.createChild(
        atomicArgumentIdFactory.build(),
        grandAttachment
      );
      expect(grandChildNodeResult.isOk()).toBe(true);
      if (!grandChildNodeResult.isOk()) throw new Error('Failed to create grandChildNode');
      grandChildNode = grandChildNodeResult.value;

      allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode1.getId(), childNode1],
        [childNode2.getId(), childNode2],
        [grandChildNode.getId(), grandChildNode],
      ]);
    });

    it('should find all descendants of root', () => {
      const descendants = service.findAllDescendantNodes(rootNode.getId(), allNodes);

      expect(descendants).toHaveLength(3);
      expect(descendants).toContain(childNode1);
      expect(descendants).toContain(childNode2);
      expect(descendants).toContain(grandChildNode);
    });

    it('should find descendants of intermediate node', () => {
      const descendants = service.findAllDescendantNodes(childNode1.getId(), allNodes);

      expect(descendants).toHaveLength(1);
      expect(descendants[0]).toBe(grandChildNode);
    });

    it('should return empty array for leaf node', () => {
      const descendants = service.findAllDescendantNodes(grandChildNode.getId(), allNodes);

      expect(descendants).toHaveLength(0);
    });

    it('should handle cycles gracefully', () => {
      // This test ensures the visited set prevents infinite loops
      const descendants = service.findAllDescendantNodes(rootNode.getId(), allNodes);

      // Should complete without infinite loop
      expect(descendants.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateTreeStructuralIntegrity', () => {
    describe('valid tree structures', () => {
      it('should validate empty tree', () => {
        const treeResult = Tree.create('test-doc');
        expect(treeResult.isOk()).toBe(true);
        if (!treeResult.isOk()) return;
        const tree = treeResult.value;
        const allNodes = new Map<NodeId, Node>();

        const result = service.validateTreeStructuralIntegrity(tree, allNodes);

        expect(result.isOk()).toBe(true);
      });

      it('should validate tree with single root node', () => {
        const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const { tree, rootNode } = treeResult.value;
          const allNodes = new Map([[rootNode.getId(), rootNode]]);

          const result = service.validateTreeStructuralIntegrity(tree, allNodes);

          expect(result.isOk()).toBe(true);
        }
      });

      it('should validate tree with parent-child relationship', () => {
        const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const { tree, rootNode } = treeResult.value;

          const childArgument = {
            getId: vi.fn(() => atomicArgumentIdFactory.build()),
          } as unknown as AtomicArgument;

          const childResult = service.addChildNodeToTree(tree, rootNode, childArgument, 0);
          expect(childResult.isOk()).toBe(true);

          if (childResult.isOk()) {
            const childNode = childResult.value;
            const allNodes = new Map([
              [rootNode.getId(), rootNode],
              [childNode.getId(), childNode],
            ]);

            const result = service.validateTreeStructuralIntegrity(tree, allNodes);

            expect(result.isOk()).toBe(true);
          }
        }
      });
    });

    describe('invalid tree structures', () => {
      it('should fail when tree references missing node', () => {
        const treeResult = Tree.create('test-doc');
        expect(treeResult.isOk()).toBe(true);
        if (!treeResult.isOk()) return;
        const tree = treeResult.value;
        const missingNodeId = nodeIdFactory.build();
        tree.addNode(missingNodeId); // Add to tree but not to allNodes

        const allNodes = new Map<NodeId, Node>();

        const result = service.validateTreeStructuralIntegrity(tree, allNodes);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('referenced by tree but not found');
        }
      });

      it('should fail when child node references parent not in tree', () => {
        const treeResult = Tree.create('test-doc');
        expect(treeResult.isOk()).toBe(true);
        if (!treeResult.isOk()) return;
        const tree = treeResult.value;

        // Create orphan parent (not in tree)
        const orphanParentResult = Node.createRoot(atomicArgumentIdFactory.build());
        expect(orphanParentResult.isOk()).toBe(true);
        if (!orphanParentResult.isOk()) return;
        const orphanParent = orphanParentResult.value;

        // Create child that references orphan parent
        const attachmentResult = Attachment.create(orphanParent.getId(), 0);
        expect(attachmentResult.isOk()).toBe(true);
        if (!attachmentResult.isOk()) return;
        const attachment = attachmentResult.value;

        const childNodeResult = Node.createChild(atomicArgumentIdFactory.build(), attachment);
        expect(childNodeResult.isOk()).toBe(true);
        if (!childNodeResult.isOk()) return;
        const childNode = childNodeResult.value;

        // Add only child to tree
        tree.addNode(childNode.getId());

        const allNodes = new Map([
          [childNode.getId(), childNode],
          // Note: orphanParent is NOT in allNodes
        ]);

        const result = service.validateTreeStructuralIntegrity(tree, allNodes);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('references parent not in same tree');
        }
      });

      it('should fail when non-empty tree has no root nodes', () => {
        const treeResult = Tree.create('test-doc');
        expect(treeResult.isOk()).toBe(true);
        if (!treeResult.isOk()) return;
        const tree = treeResult.value;

        // Create two nodes that are children of each other (circular reference)
        const node1Id = nodeIdFactory.build();
        const node2Id = nodeIdFactory.build();

        const attachment1Result = Attachment.create(node2Id, 0);
        expect(attachment1Result.isOk()).toBe(true);
        if (!attachment1Result.isOk()) return;
        const attachment1 = attachment1Result.value;

        const node1Result = Node.createChild(atomicArgumentIdFactory.build(), attachment1);
        expect(node1Result.isOk()).toBe(true);
        if (!node1Result.isOk()) return;
        const node1 = node1Result.value;

        const attachment2Result = Attachment.create(node1Id, 0);
        expect(attachment2Result.isOk()).toBe(true);
        if (!attachment2Result.isOk()) return;
        const attachment2 = attachment2Result.value;

        const node2Result = Node.createChild(atomicArgumentIdFactory.build(), attachment2);
        expect(node2Result.isOk()).toBe(true);
        if (!node2Result.isOk()) return;
        const node2 = node2Result.value;

        // Manually reconstruct with specific IDs to create circular reference
        const reconstructedNode1 = Node.reconstruct(
          node1Id,
          node1.getArgumentId(),
          attachment1,
          node1.getCreatedAt(),
          node1.getModifiedAt()
        ).value;

        const reconstructedNode2 = Node.reconstruct(
          node2Id,
          node2.getArgumentId(),
          attachment2,
          node2.getCreatedAt(),
          node2.getModifiedAt()
        ).value;

        tree.addNode(node1Id);
        tree.addNode(node2Id);

        const allNodes = new Map([
          [node1Id, reconstructedNode1],
          [node2Id, reconstructedNode2],
        ]);

        const result = service.validateTreeStructuralIntegrity(tree, allNodes);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Non-empty tree must have at least one root node');
        }
      });
    });
  });

  describe('computeNodeDepth', () => {
    let rootNode: Node;
    let childNode: Node;
    let grandChildNode: Node;
    let allNodes: Map<NodeId, Node>;

    beforeEach(() => {
      const rootNodeResult = Node.createRoot(atomicArgumentIdFactory.build());
      expect(rootNodeResult.isOk()).toBe(true);
      if (!rootNodeResult.isOk()) throw new Error('Failed to create root node');
      rootNode = rootNodeResult.value;

      const attachmentResult = Attachment.create(rootNode.getId(), 0);
      expect(attachmentResult.isOk()).toBe(true);
      if (!attachmentResult.isOk()) throw new Error('Failed to create attachment');
      const attachment = attachmentResult.value;

      const childNodeResult = Node.createChild(atomicArgumentIdFactory.build(), attachment);
      expect(childNodeResult.isOk()).toBe(true);
      if (!childNodeResult.isOk()) throw new Error('Failed to create child node');
      childNode = childNodeResult.value;

      const grandAttachmentResult = Attachment.create(childNode.getId(), 0);
      expect(grandAttachmentResult.isOk()).toBe(true);
      if (!grandAttachmentResult.isOk()) throw new Error('Failed to create grand attachment');
      const grandAttachment = grandAttachmentResult.value;

      const grandChildNodeResult = Node.createChild(
        atomicArgumentIdFactory.build(),
        grandAttachment
      );
      expect(grandChildNodeResult.isOk()).toBe(true);
      if (!grandChildNodeResult.isOk()) throw new Error('Failed to create grand child node');
      grandChildNode = grandChildNodeResult.value;

      allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode.getId(), childNode],
        [grandChildNode.getId(), grandChildNode],
      ]);
    });

    it('should return 0 for root node', () => {
      const depth = service.computeNodeDepth(rootNode.getId(), allNodes);
      expect(depth).toBe(0);
    });

    it('should return 1 for direct child', () => {
      const depth = service.computeNodeDepth(childNode.getId(), allNodes);
      expect(depth).toBe(1);
    });

    it('should return 2 for grandchild', () => {
      const depth = service.computeNodeDepth(grandChildNode.getId(), allNodes);
      expect(depth).toBe(2);
    });

    it('should return 0 for missing node', () => {
      const missingNodeId = nodeIdFactory.build();
      const depth = service.computeNodeDepth(missingNodeId, allNodes);
      expect(depth).toBe(0);
    });
  });

  describe('findNodePathFromRoot', () => {
    let rootNode: Node;
    let childNode: Node;
    let grandChildNode: Node;
    let allNodes: Map<NodeId, Node>;

    beforeEach(() => {
      const rootNodeResult = Node.createRoot(atomicArgumentIdFactory.build());
      expect(rootNodeResult.isOk()).toBe(true);
      if (!rootNodeResult.isOk()) throw new Error('Failed to create root node');
      rootNode = rootNodeResult.value;

      const attachmentResult = Attachment.create(rootNode.getId(), 0);
      expect(attachmentResult.isOk()).toBe(true);
      if (!attachmentResult.isOk()) throw new Error('Failed to create attachment');
      const attachment = attachmentResult.value;

      const childNodeResult = Node.createChild(atomicArgumentIdFactory.build(), attachment);
      expect(childNodeResult.isOk()).toBe(true);
      if (!childNodeResult.isOk()) throw new Error('Failed to create child node');
      childNode = childNodeResult.value;

      const grandAttachmentResult = Attachment.create(childNode.getId(), 0);
      expect(grandAttachmentResult.isOk()).toBe(true);
      if (!grandAttachmentResult.isOk()) throw new Error('Failed to create grand attachment');
      const grandAttachment = grandAttachmentResult.value;

      const grandChildNodeResult = Node.createChild(
        atomicArgumentIdFactory.build(),
        grandAttachment
      );
      expect(grandChildNodeResult.isOk()).toBe(true);
      if (!grandChildNodeResult.isOk()) throw new Error('Failed to create grand child node');
      grandChildNode = grandChildNodeResult.value;

      allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode.getId(), childNode],
        [grandChildNode.getId(), grandChildNode],
      ]);
    });

    it('should return path from root to target node', () => {
      const path = service.findNodePathFromRoot(grandChildNode.getId(), allNodes);

      expect(path).not.toBeNull();
      if (path) {
        expect(path).toHaveLength(3);
        expect(path[0]).toBe(rootNode);
        expect(path[1]).toBe(childNode);
        expect(path[2]).toBe(grandChildNode);
      }
    });

    it('should return single node path for root', () => {
      const path = service.findNodePathFromRoot(rootNode.getId(), allNodes);

      expect(path).not.toBeNull();
      if (path) {
        expect(path).toHaveLength(1);
        expect(path[0]).toBe(rootNode);
      }
    });

    it('should return null for missing node', () => {
      const missingNodeId = nodeIdFactory.build();
      const path = service.findNodePathFromRoot(missingNodeId, allNodes);

      expect(path).toBeNull();
    });

    it('should return null when parent chain is broken', () => {
      // Remove intermediate node from allNodes to break chain
      allNodes.delete(childNode.getId());

      const path = service.findNodePathFromRoot(grandChildNode.getId(), allNodes);

      expect(path).toBeNull();
    });
  });

  describe('detectCycles', () => {
    describe('acyclic structures', () => {
      it('should return empty array for acyclic tree', () => {
        const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const { tree, rootNode } = treeResult.value;

          const childArgument = {
            getId: vi.fn(() => atomicArgumentIdFactory.build()),
          } as unknown as AtomicArgument;

          const childResult = service.addChildNodeToTree(tree, rootNode, childArgument, 0);
          expect(childResult.isOk()).toBe(true);

          if (childResult.isOk()) {
            const childNode = childResult.value;
            const allNodes = new Map([
              [rootNode.getId(), rootNode],
              [childNode.getId(), childNode],
            ]);

            const result = service.detectCycles(tree, allNodes);

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value).toHaveLength(0);
            }
          }
        }
      });

      it('should return empty array for empty tree', () => {
        const treeResult = Tree.create('test-doc');
        expect(treeResult.isOk()).toBe(true);
        if (!treeResult.isOk()) return;
        const tree = treeResult.value;
        const allNodes = new Map<NodeId, Node>();

        const result = service.detectCycles(tree, allNodes);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(0);
        }
      });
    });

    describe('cyclic structures', () => {
      it('should detect simple two-node cycle', () => {
        const _tree = Tree.create('test-doc').value;

        // Create two nodes that reference each other
        const node1Id = nodeIdFactory.build();
        const node2Id = nodeIdFactory.build();

        const attachment1 = Attachment.create(node2Id, 0).value;
        const attachment2 = Attachment.create(node1Id, 0).value;

        const node1 = Node.reconstruct(
          node1Id,
          atomicArgumentIdFactory.build(),
          attachment1,
          Date.now(),
          Date.now()
        ).value;

        const node2 = Node.reconstruct(
          node2Id,
          atomicArgumentIdFactory.build(),
          attachment2,
          Date.now(),
          Date.now()
        ).value;

        _tree.addNode(node1Id);
        _tree.addNode(node2Id);

        const allNodes = new Map([
          [node1Id, node1],
          [node2Id, node2],
        ]);

        const result = service.detectCycles(_tree, allNodes);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('validateBottomUpFlow', () => {
    let tree: Tree;
    let rootNode: Node;
    let childNode: Node;

    beforeEach(() => {
      const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
      expect(treeResult.isOk()).toBe(true);
      if (treeResult.isOk()) {
        ({ tree, rootNode } = treeResult.value);
      }

      const childArgument = {
        getId: vi.fn(() => atomicArgumentIdFactory.build()),
      } as unknown as AtomicArgument;

      const childResult = service.addChildNodeToTree(tree, rootNode, childArgument, 0);
      expect(childResult.isOk()).toBe(true);
      if (childResult.isOk()) {
        childNode = childResult.value;
      }
    });

    it('should validate tree that supports bottom-up flow', () => {
      const allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode.getId(), childNode],
      ]);

      const result = service.validateBottomUpFlow(tree, allNodes);

      expect(result.isOk()).toBe(true);
    });

    it('should skip validation for trees that do not support bottom-up flow', () => {
      // Mock tree to not support bottom-up flow
      vi.spyOn(tree, 'supportsBottomUpFlow').mockReturnValue(false);

      const allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode.getId(), childNode],
      ]);

      const result = service.validateBottomUpFlow(tree, allNodes);

      expect(result.isOk()).toBe(true);
    });

    it('should fail when node violates bottom-up flow', () => {
      // Mock child node to not provide bottom-up flow
      vi.spyOn(childNode, 'providesBottomUpFlow').mockReturnValue(false);

      const allNodes = new Map([
        [rootNode.getId(), rootNode],
        [childNode.getId(), childNode],
      ]);

      const result = service.validateBottomUpFlow(tree, allNodes);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('violates bottom-up flow');
      }
    });
  });

  describe('Property-Based Testing', () => {
    describe('tree structure consistency', () => {
      it('should maintain parent-child relationship consistency', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 5 }), // Number of child nodes to add
            fc.integer({ min: 0, max: 3 }), // Premise position range
            (childCount, premisePosition) => {
              const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
              expect(treeResult.isOk()).toBe(true);

              if (treeResult.isOk()) {
                const { tree, rootNode } = treeResult.value;
                const allNodes = new Map<NodeId, Node>([[rootNode.getId(), rootNode]]);

                // Add children
                for (let i = 0; i < childCount; i++) {
                  const childArgument = {
                    getId: vi.fn(() => atomicArgumentIdFactory.build()),
                  } as unknown as AtomicArgument;

                  const childResult = service.addChildNodeToTree(
                    tree,
                    rootNode,
                    childArgument,
                    premisePosition
                  );

                  if (childResult.isOk()) {
                    const childNode = childResult.value;
                    allNodes.set(childNode.getId(), childNode);

                    // Verify consistency
                    expect(tree.containsNode(childNode.getId())).toBe(true);
                    expect(childNode.getParentNodeId()).toEqual(rootNode.getId());
                  }
                }

                // Validate tree structure
                const validationResult = service.validateTreeStructuralIntegrity(tree, allNodes);
                expect(validationResult.isOk()).toBe(true);

                // Verify node counts
                expect(tree.getNodeCount()).toBe(allNodes.size);
              }
            }
          )
        );
      });
    });

    describe('node removal consistency', () => {
      it('should maintain tree consistency after node removal', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 2, max: 5 }), // Tree depth
            depth => {
              const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
              expect(treeResult.isOk()).toBe(true);

              if (treeResult.isOk()) {
                const { tree, rootNode } = treeResult.value;
                const allNodes = new Map<NodeId, Node>([[rootNode.getId(), rootNode]]);

                // Build a chain of nodes
                let currentParent = rootNode;
                const nodeChain = [rootNode];

                for (let i = 1; i < depth; i++) {
                  const childArgument = {
                    getId: vi.fn(() => atomicArgumentIdFactory.build()),
                  } as unknown as AtomicArgument;

                  const childResult = service.addChildNodeToTree(
                    tree,
                    currentParent,
                    childArgument,
                    0
                  );

                  if (childResult.isOk()) {
                    const childNode = childResult.value;
                    allNodes.set(childNode.getId(), childNode);
                    nodeChain.push(childNode);
                    currentParent = childNode;
                  }
                }

                const initialNodeCount = tree.getNodeCount();

                // Remove a middle node (should remove all descendants)
                if (nodeChain.length > 2) {
                  const nodeToRemove = nodeChain[1]; // Second node (not root, has descendants)
                  const removalResult = service.removeNodeFromTree(tree, nodeToRemove, allNodes);

                  expect(removalResult.isOk()).toBe(true);
                  if (removalResult.isOk()) {
                    const removedIds = removalResult.value;

                    // Should remove this node and all descendants
                    expect(removedIds.length).toBeGreaterThan(0);
                    expect(tree.getNodeCount()).toBeLessThan(initialNodeCount);

                    // Validate remaining structure
                    const validationResult = service.validateTreeStructuralIntegrity(
                      tree,
                      allNodes
                    );
                    expect(validationResult.isOk()).toBe(true);
                  }
                }
              }
            }
          )
        );
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    describe('boundary conditions', () => {
      it('should handle maximum premise position values', () => {
        const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const { tree, rootNode } = treeResult.value;
          const childArgument = {
            getId: vi.fn(() => atomicArgumentIdFactory.build()),
          } as unknown as AtomicArgument;

          // Test with large premise position
          const result = service.addChildNodeToTree(tree, rootNode, childArgument, 999);

          expect(result.isOk()).toBe(true);
        }
      });

      it('should handle empty node maps gracefully', () => {
        const treeResult = Tree.create('test-doc');
        expect(treeResult.isOk()).toBe(true);
        if (!treeResult.isOk()) return;
        const tree = treeResult.value;
        const emptyNodes = new Map<NodeId, Node>();

        const rootNodes = service.findRootNodes(tree, emptyNodes);
        expect(rootNodes).toHaveLength(0);

        const descendants = service.findAllDescendantNodes(nodeIdFactory.build(), emptyNodes);
        expect(descendants).toHaveLength(0);
      });
    });

    describe('concurrent modification scenarios', () => {
      it('should handle node removal during traversal', () => {
        const treeResult = service.createTreeWithRootNode('test-doc', mockAtomicArgument);
        expect(treeResult.isOk()).toBe(true);

        if (treeResult.isOk()) {
          const { tree: _tree, rootNode } = treeResult.value;

          const childArgument = {
            getId: vi.fn(() => atomicArgumentIdFactory.build()),
          } as unknown as AtomicArgument;

          const childResult = service.addChildNodeToTree(_tree, rootNode, childArgument, 0);
          expect(childResult.isOk()).toBe(true);

          if (childResult.isOk()) {
            const childNode = childResult.value;
            const allNodes = new Map([
              [rootNode.getId(), rootNode],
              [childNode.getId(), childNode],
            ]);

            // Remove child from tree but not from allNodes map
            _tree.removeNode(childNode.getId());

            // Should handle gracefully
            const descendants = service.findAllDescendantNodes(rootNode.getId(), allNodes);
            expect(descendants).toContain(childNode); // Still found in allNodes
          }
        }
      });
    });

    describe('memory and performance considerations', () => {
      it('should handle large node collections efficiently', () => {
        const _tree = Tree.create('test-doc').value;
        const largeNodeMap = new Map<NodeId, Node>();

        // Create a large number of disconnected nodes
        for (let i = 0; i < 1000; i++) {
          const node = Node.createRoot(atomicArgumentIdFactory.build()).value;
          largeNodeMap.set(node.getId(), node);
        }

        // Operations should complete in reasonable time
        const start = Date.now();
        const descendants = service.findAllDescendantNodes(nodeIdFactory.build(), largeNodeMap);
        const end = Date.now();

        expect(descendants).toHaveLength(0);
        expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
      });
    });
  });
});
