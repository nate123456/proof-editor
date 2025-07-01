import { type AtomicArgument } from '../entities/AtomicArgument.js';
import { Node } from '../entities/Node.js';
import { Tree } from '../entities/Tree.js';
import { err, ok, type Result, ValidationError } from '../shared/result.js';
import {
  Attachment,
  type NodeId,
  PhysicalProperties,
  Position2D,
} from '../shared/value-objects.js';

export class TreeStructureService {
  createTreeWithRootNode(
    documentId: string,
    rootArgument: AtomicArgument,
    position: Position2D = Position2D.origin(),
    physicalProperties: PhysicalProperties = PhysicalProperties.default(),
    title?: string
  ): Result<{ tree: Tree; rootNode: Node }, ValidationError> {
    const treeResult = Tree.create(documentId, position, physicalProperties, title);
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }

    const rootNodeResult = Node.createRoot(rootArgument.getId());
    if (rootNodeResult.isErr()) {
      return err(rootNodeResult.error);
    }

    const tree = treeResult.value;
    const rootNode = rootNodeResult.value;

    const addNodeResult = tree.addNode(rootNode.getId());
    if (addNodeResult.isErr()) {
      return err(addNodeResult.error);
    }

    return ok({ tree, rootNode });
  }

  addChildNodeToTree(
    tree: Tree,
    parentNode: Node,
    childArgument: AtomicArgument,
    premisePosition: number,
    fromPosition?: number
  ): Result<Node, ValidationError> {
    if (!tree.containsNode(parentNode.getId())) {
      return err(new ValidationError('Parent node must exist in tree'));
    }

    const attachmentResult = Attachment.create(parentNode.getId(), premisePosition, fromPosition);
    if (attachmentResult.isErr()) {
      return err(attachmentResult.error);
    }

    const childNodeResult = Node.createChild(childArgument.getId(), attachmentResult.value);
    if (childNodeResult.isErr()) {
      return err(childNodeResult.error);
    }

    const childNode = childNodeResult.value;
    const addNodeResult = tree.addNode(childNode.getId());
    if (addNodeResult.isErr()) {
      return err(addNodeResult.error);
    }

    return ok(childNode);
  }

  removeNodeFromTree(
    tree: Tree,
    nodeToRemove: Node,
    allNodes: Map<NodeId, Node>
  ): Result<NodeId[], ValidationError> {
    if (!tree.containsNode(nodeToRemove.getId())) {
      return err(new ValidationError('Node not found in tree'));
    }

    const childNodes = this.findDirectChildNodes(nodeToRemove.getId(), allNodes);
    const removedNodeIds: NodeId[] = [];

    for (const childNode of childNodes) {
      const childRemovalResult = this.removeNodeFromTree(tree, childNode, allNodes);
      if (childRemovalResult.isErr()) {
        return childRemovalResult;
      }
      removedNodeIds.push(...childRemovalResult.value);
    }

    const removeResult = tree.removeNode(nodeToRemove.getId());
    if (removeResult.isErr()) {
      return err(removeResult.error);
    }

    removedNodeIds.push(nodeToRemove.getId());
    return ok(removedNodeIds);
  }

  moveNodeToNewParent(
    tree: Tree,
    nodeToMove: Node,
    newParentNode: Node,
    newPremisePosition: number,
    newFromPosition?: number
  ): Result<void, ValidationError> {
    if (!tree.containsNode(nodeToMove.getId()) || !tree.containsNode(newParentNode.getId())) {
      return err(new ValidationError('Both nodes must exist in tree'));
    }

    if (nodeToMove.isRoot()) {
      return err(new ValidationError('Cannot move root node'));
    }

    const newAttachmentResult = Attachment.create(
      newParentNode.getId(),
      newPremisePosition,
      newFromPosition
    );
    if (newAttachmentResult.isErr()) {
      return err(newAttachmentResult.error);
    }

    return nodeToMove.changeAttachment(newAttachmentResult.value);
  }

  findRootNodes(tree: Tree, allNodes: Map<NodeId, Node>): Node[] {
    const rootNodes: Node[] = [];

    for (const nodeId of tree.getNodeIds()) {
      const node = allNodes.get(nodeId);
      if (node?.isRoot()) {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  findDirectChildNodes(parentNodeId: NodeId, allNodes: Map<NodeId, Node>): Node[] {
    const children: Node[] = [];

    for (const node of allNodes.values()) {
      if (node.isChildOf(parentNodeId)) {
        children.push(node);
      }
    }

    return children;
  }

  findAllDescendantNodes(parentNodeId: NodeId, allNodes: Map<NodeId, Node>): Node[] {
    const descendants: Node[] = [];
    const toVisit = [parentNodeId];
    const visited = new Set<NodeId>();

    while (toVisit.length > 0) {
      const currentId = toVisit.pop()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const children = this.findDirectChildNodes(currentId, allNodes);
      for (const child of children) {
        descendants.push(child);
        toVisit.push(child.getId());
      }
    }

    return descendants;
  }

  validateTreeStructuralIntegrity(
    tree: Tree,
    allNodes: Map<NodeId, Node>
  ): Result<void, ValidationError> {
    const nodeIds = tree.getNodeIds();

    for (const nodeId of nodeIds) {
      const node = allNodes.get(nodeId);
      if (!node) {
        return err(
          new ValidationError(`Node ${nodeId.getValue()} referenced by tree but not found`)
        );
      }

      if (node.isChild()) {
        const parentId = node.getParentNodeId()!;
        if (!nodeIds.some(id => id.equals(parentId))) {
          return err(
            new ValidationError(`Node ${nodeId.getValue()} references parent not in same tree`)
          );
        }
      }
    }

    const rootNodes = this.findRootNodes(tree, allNodes);
    if (rootNodes.length === 0 && !tree.isEmpty()) {
      return err(new ValidationError('Non-empty tree must have at least one root node'));
    }

    return ok(undefined);
  }

  computeNodeDepth(nodeId: NodeId, allNodes: Map<NodeId, Node>): number {
    const node = allNodes.get(nodeId);
    if (!node || node.isRoot()) {
      return 0;
    }

    const parentId = node.getParentNodeId()!;
    return 1 + this.computeNodeDepth(parentId, allNodes);
  }

  findNodePathFromRoot(targetNodeId: NodeId, allNodes: Map<NodeId, Node>): Node[] | null {
    const target = allNodes.get(targetNodeId);
    if (!target) {
      return null;
    }

    const path: Node[] = [];
    let current = target;

    while (current) {
      path.unshift(current);

      if (current.isRoot()) {
        break;
      }

      const parentId = current.getParentNodeId()!;
      const parent = allNodes.get(parentId);
      if (!parent) {
        return null;
      }

      current = parent;
    }

    return path;
  }

  detectCycles(tree: Tree, allNodes: Map<NodeId, Node>): Result<Node[], ValidationError> {
    const visiting = new Set<NodeId>();
    const visited = new Set<NodeId>();
    const cycles: Node[] = [];

    for (const nodeId of tree.getNodeIds()) {
      if (!visited.has(nodeId)) {
        const cycleDetected = this.detectCyclesFromNode(
          nodeId,
          allNodes,
          visiting,
          visited,
          cycles
        );
        if (cycleDetected.length > 0) {
          return ok(cycleDetected);
        }
      }
    }

    return ok([]);
  }

  private detectCyclesFromNode(
    nodeId: NodeId,
    allNodes: Map<NodeId, Node>,
    visiting: Set<NodeId>,
    visited: Set<NodeId>,
    cycles: Node[]
  ): Node[] {
    if (visiting.has(nodeId)) {
      const node = allNodes.get(nodeId);
      if (node) {
        cycles.push(node);
      }
      return cycles;
    }

    if (visited.has(nodeId)) {
      return [];
    }

    visiting.add(nodeId);

    const children = this.findDirectChildNodes(nodeId, allNodes);
    for (const child of children) {
      const childCycles = this.detectCyclesFromNode(
        child.getId(),
        allNodes,
        visiting,
        visited,
        cycles
      );
      if (childCycles.length > 0) {
        return childCycles;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return [];
  }

  validateBottomUpFlow(tree: Tree, allNodes: Map<NodeId, Node>): Result<void, ValidationError> {
    if (!tree.supportsBottomUpFlow()) {
      return ok(undefined);
    }

    for (const nodeId of tree.getNodeIds()) {
      const node = allNodes.get(nodeId);
      if (!node || node.isRoot()) {
        continue;
      }

      if (!node.providesBottomUpFlow()) {
        return err(new ValidationError(`Node ${nodeId.getValue()} violates bottom-up flow`));
      }
    }

    return ok(undefined);
  }
}
