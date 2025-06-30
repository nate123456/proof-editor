import type { Result } from "../shared/result.js";
import { NodeEntity } from "../entities/NodeEntity.js";
import { TreeEntity } from "../entities/TreeEntity.js";
import { AtomicArgumentEntity } from "../entities/AtomicArgumentEntity.js";
import { NodeId, TreeId, AtomicArgumentId, Attachment, PhysicalProperties } from "../shared/value-objects.js";
import { ValidationError } from "../shared/result.js";
import { Position2D } from "../shared/value-objects.js";

export class TreeStructureService {

  createTreeWithRootNode(
    documentId: string,
    rootArgument: AtomicArgumentEntity,
    position: Position2D = Position2D.origin(),
    physicalProperties: PhysicalProperties = PhysicalProperties.default(),
    title?: string
  ): Result<{ tree: TreeEntity; rootNode: NodeEntity }, ValidationError> {
    const treeResult = TreeEntity.create(documentId, position, physicalProperties, title);
    if (!treeResult.success) {
      return { success: false, error: treeResult.error };
    }

    const rootNodeResult = NodeEntity.createRoot(rootArgument.getId());
    if (!rootNodeResult.success) {
      return { success: false, error: rootNodeResult.error };
    }

    const tree = treeResult.data;
    const rootNode = rootNodeResult.data;

    const addNodeResult = tree.addNode(rootNode.getId());
    if (!addNodeResult.success) {
      return { success: false, error: addNodeResult.error };
    }

    return { success: true, data: { tree, rootNode } };
  }

  addChildNodeToTree(
    tree: TreeEntity,
    parentNode: NodeEntity,
    childArgument: AtomicArgumentEntity,
    premisePosition: number,
    fromPosition?: number
  ): Result<NodeEntity, ValidationError> {
    if (!tree.containsNode(parentNode.getId())) {
      return { success: false, error: new ValidationError("Parent node must exist in tree") };
    }

    const attachmentResult = Attachment.create(parentNode.getId(), premisePosition, fromPosition);
    if (!attachmentResult.success) {
      return { success: false, error: attachmentResult.error };
    }

    const childNodeResult = NodeEntity.createChild(childArgument.getId(), attachmentResult.data);
    if (!childNodeResult.success) {
      return { success: false, error: childNodeResult.error };
    }

    const childNode = childNodeResult.data;
    const addNodeResult = tree.addNode(childNode.getId());
    if (!addNodeResult.success) {
      return { success: false, error: addNodeResult.error };
    }

    return { success: true, data: childNode };
  }

  removeNodeFromTree(
    tree: TreeEntity,
    nodeToRemove: NodeEntity,
    allNodes: Map<NodeId, NodeEntity>
  ): Result<NodeId[], ValidationError> {
    if (!tree.containsNode(nodeToRemove.getId())) {
      return { success: false, error: new ValidationError("Node not found in tree") };
    }

    const childNodes = this.findDirectChildNodes(nodeToRemove.getId(), allNodes);
    const removedNodeIds: NodeId[] = [];

    for (const childNode of childNodes) {
      const childRemovalResult = this.removeNodeFromTree(tree, childNode, allNodes);
      if (!childRemovalResult.success) {
        return childRemovalResult;
      }
      removedNodeIds.push(...childRemovalResult.data);
    }

    const removeResult = tree.removeNode(nodeToRemove.getId());
    if (!removeResult.success) {
      return { success: false, error: removeResult.error };
    }

    removedNodeIds.push(nodeToRemove.getId());
    return { success: true, data: removedNodeIds };
  }

  moveNodeToNewParent(
    tree: TreeEntity,
    nodeToMove: NodeEntity,
    newParentNode: NodeEntity,
    newPremisePosition: number,
    newFromPosition?: number
  ): Result<void, ValidationError> {
    if (!tree.containsNode(nodeToMove.getId()) || !tree.containsNode(newParentNode.getId())) {
      return { success: false, error: new ValidationError("Both nodes must exist in tree") };
    }

    if (nodeToMove.isRoot()) {
      return { success: false, error: new ValidationError("Cannot move root node") };
    }

    const newAttachmentResult = Attachment.create(newParentNode.getId(), newPremisePosition, newFromPosition);
    if (!newAttachmentResult.success) {
      return { success: false, error: newAttachmentResult.error };
    }

    return nodeToMove.changeAttachment(newAttachmentResult.data);
  }

  findRootNodes(
    tree: TreeEntity,
    allNodes: Map<NodeId, NodeEntity>
  ): NodeEntity[] {
    const rootNodes: NodeEntity[] = [];
    
    for (const nodeId of tree.getNodeIds()) {
      const node = allNodes.get(nodeId);
      if (node && node.isRoot()) {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  findDirectChildNodes(
    parentNodeId: NodeId,
    allNodes: Map<NodeId, NodeEntity>
  ): NodeEntity[] {
    const children: NodeEntity[] = [];

    for (const node of allNodes.values()) {
      if (node.isChildOf(parentNodeId)) {
        children.push(node);
      }
    }

    return children;
  }

  findAllDescendantNodes(
    parentNodeId: NodeId,
    allNodes: Map<NodeId, NodeEntity>
  ): NodeEntity[] {
    const descendants: NodeEntity[] = [];
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
    tree: TreeEntity,
    allNodes: Map<NodeId, NodeEntity>
  ): Result<void, ValidationError> {
    const nodeIds = tree.getNodeIds();
    
    for (const nodeId of nodeIds) {
      const node = allNodes.get(nodeId);
      if (!node) {
        return { success: false, error: new ValidationError(`Node ${nodeId.getValue()} referenced by tree but not found`) };
      }

      if (node.isChild()) {
        const parentId = node.getParentNodeId()!;
        if (!nodeIds.some(id => id.equals(parentId))) {
          return { success: false, error: new ValidationError(`Node ${nodeId.getValue()} references parent not in same tree`) };
        }
      }
    }

    const rootNodes = this.findRootNodes(tree, allNodes);
    if (rootNodes.length === 0 && !tree.isEmpty()) {
      return { success: false, error: new ValidationError("Non-empty tree must have at least one root node") };
    }

    return { success: true, data: undefined };
  }

  computeNodeDepth(
    nodeId: NodeId,
    allNodes: Map<NodeId, NodeEntity>
  ): number {
    const node = allNodes.get(nodeId);
    if (!node || node.isRoot()) {
      return 0;
    }

    const parentId = node.getParentNodeId()!;
    return 1 + this.computeNodeDepth(parentId, allNodes);
  }

  findNodePathFromRoot(
    targetNodeId: NodeId,
    allNodes: Map<NodeId, NodeEntity>
  ): NodeEntity[] | null {
    const target = allNodes.get(targetNodeId);
    if (!target) {
      return null;
    }

    const path: NodeEntity[] = [];
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

  detectCycles(
    tree: TreeEntity,
    allNodes: Map<NodeId, NodeEntity>
  ): Result<NodeEntity[], ValidationError> {
    const visiting = new Set<NodeId>();
    const visited = new Set<NodeId>();
    const cycles: NodeEntity[] = [];

    for (const nodeId of tree.getNodeIds()) {
      if (!visited.has(nodeId)) {
        const cycleDetected = this.detectCyclesFromNode(nodeId, allNodes, visiting, visited, cycles);
        if (cycleDetected.length > 0) {
          return { success: true, data: cycleDetected };
        }
      }
    }

    return { success: true, data: [] };
  }

  private detectCyclesFromNode(
    nodeId: NodeId,
    allNodes: Map<NodeId, NodeEntity>,
    visiting: Set<NodeId>,
    visited: Set<NodeId>,
    cycles: NodeEntity[]
  ): NodeEntity[] {
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
      const childCycles = this.detectCyclesFromNode(child.getId(), allNodes, visiting, visited, cycles);
      if (childCycles.length > 0) {
        return childCycles;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return [];
  }

  validateBottomUpFlow(
    tree: TreeEntity,
    allNodes: Map<NodeId, NodeEntity>
  ): Result<void, ValidationError> {
    if (!tree.supportsBottomUpFlow()) {
      return { success: true, data: undefined };
    }

    for (const nodeId of tree.getNodeIds()) {
      const node = allNodes.get(nodeId);
      if (!node || node.isRoot()) {
        continue;
      }

      if (!node.providesBottomUpFlow()) {
        return { success: false, error: new ValidationError(`Node ${nodeId.getValue()} violates bottom-up flow`) };
      }
    }

    return { success: true, data: undefined };
  }
}