import { err, ok, type Result } from 'neverthrow';
import type { AtomicArgument } from '../entities/AtomicArgument.js';
import { Node } from '../entities/Node.js';
import { Tree } from '../entities/Tree.js';
import { ValidationError } from '../shared/result.js';
import {
  Attachment,
  MaxDepth,
  type NodeId,
  PhysicalProperties,
  Position2D,
} from '../shared/value-objects/index.js';

export class TreeStructureService {
  createTreeWithRootNode(
    documentId: string,
    rootArgument: AtomicArgument,
    position: Position2D = Position2D.origin(),
    physicalProperties: PhysicalProperties = PhysicalProperties.default(),
    title?: string,
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
    fromPosition?: number,
  ): Result<Node, ValidationError> {
    if (!tree.hasNode(parentNode.getId())) {
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
    allNodes: Map<NodeId, Node>,
  ): Result<NodeId[], ValidationError> {
    if (!tree.hasNode(nodeToRemove.getId())) {
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
    newFromPosition?: number,
  ): Result<void, ValidationError> {
    if (!tree.hasNode(nodeToMove.getId()) || !tree.hasNode(newParentNode.getId())) {
      return err(new ValidationError('Both nodes must exist in tree'));
    }

    if (nodeToMove.isRoot()) {
      return err(new ValidationError('Cannot move root node'));
    }

    const newAttachmentResult = Attachment.create(
      newParentNode.getId(),
      newPremisePosition,
      newFromPosition,
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

    for (const node of Array.from(allNodes.values())) {
      if (node.isChildOf(parentNodeId)) {
        children.push(node);
      }
    }

    return children;
  }

  findAllDescendantNodes(
    parentNodeId: NodeId,
    allNodes: Map<NodeId, Node>,
    maxDepth: MaxDepth = MaxDepth.default(),
  ): Result<Node[], ValidationError> {
    const descendants: Node[] = [];
    const toVisit: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: parentNodeId, depth: 0 }];
    const visited = new Set<NodeId>();

    while (toVisit.length > 0) {
      const current = toVisit.pop();
      if (!current) continue;

      if (maxDepth.isExceeded(current.depth)) {
        return err(
          new ValidationError(
            `Max depth exceeded (${maxDepth.getValue()}) while finding descendants`,
          ),
        );
      }

      if (visited.has(current.nodeId)) {
        continue;
      }

      visited.add(current.nodeId);

      const children = this.findDirectChildNodes(current.nodeId, allNodes);
      for (const child of children) {
        descendants.push(child);
        toVisit.push({ nodeId: child.getId(), depth: current.depth + 1 });
      }
    }

    return ok(descendants);
  }

  validateTreeStructuralIntegrity(
    tree: Tree,
    allNodes: Map<NodeId, Node>,
  ): Result<void, ValidationError> {
    const nodeIds = tree.getNodeIds();

    for (const nodeId of nodeIds) {
      const node = allNodes.get(nodeId);
      if (!node) {
        return err(
          new ValidationError(`Node ${nodeId.getValue()} referenced by tree but not found`),
        );
      }

      if (node.isChild()) {
        const parentId = node.getParentNodeId();
        if (!parentId) {
          return err(new ValidationError(`Child node ${nodeId.getValue()} has no parent ID`));
        }
        if (!nodeIds.some((id) => id.equals(parentId))) {
          return err(
            new ValidationError(`Node ${nodeId.getValue()} references parent not in same tree`),
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

  computeNodeDepth(
    nodeId: NodeId,
    allNodes: Map<NodeId, Node>,
    maxDepth: MaxDepth = MaxDepth.default(),
  ): Result<number, ValidationError> {
    return this.computeNodeDepthRecursive(nodeId, allNodes, maxDepth, 0, new Set());
  }

  private computeNodeDepthRecursive(
    nodeId: NodeId,
    allNodes: Map<NodeId, Node>,
    maxDepth: MaxDepth,
    currentDepth: number,
    visited: Set<NodeId>,
  ): Result<number, ValidationError> {
    if (maxDepth.isExceeded(currentDepth)) {
      return err(
        new ValidationError(
          `Max depth exceeded (${maxDepth.getValue()}) while computing node depth`,
        ),
      );
    }

    if (visited.has(nodeId)) {
      return err(new ValidationError('Cycle detected in node hierarchy'));
    }

    visited.add(nodeId);

    const node = allNodes.get(nodeId);
    if (!node || node.isRoot()) {
      return ok(currentDepth);
    }

    const parentId = node.getParentNodeId();
    if (!parentId) {
      return ok(currentDepth); // If somehow no parent ID, treat as root
    }

    return this.computeNodeDepthRecursive(parentId, allNodes, maxDepth, currentDepth + 1, visited);
  }

  findNodePathFromRoot(
    targetNodeId: NodeId,
    allNodes: Map<NodeId, Node>,
    maxDepth: MaxDepth = MaxDepth.default(),
  ): Result<Node[], ValidationError> {
    const target = allNodes.get(targetNodeId);
    if (!target) {
      return err(new ValidationError(`Target node ${targetNodeId.getValue()} not found`));
    }

    const path: Node[] = [];
    let current = target;
    const visited = new Set<NodeId>();
    let depth = 0;

    while (current) {
      if (maxDepth.isExceeded(depth)) {
        return err(
          new ValidationError(
            `Max depth exceeded (${maxDepth.getValue()}) while finding path from root`,
          ),
        );
      }

      if (visited.has(current.getId())) {
        return err(new ValidationError('Cycle detected in node hierarchy'));
      }

      visited.add(current.getId());
      path.unshift(current);

      if (current.isRoot()) {
        break;
      }

      const parentId = current.getParentNodeId();
      if (!parentId) {
        return err(new ValidationError('Invalid path: non-root node has no parent'));
      }
      const parent = allNodes.get(parentId);
      if (!parent) {
        return err(new ValidationError(`Parent node ${parentId.getValue()} not found`));
      }

      current = parent;
      depth++;
    }

    return ok(path);
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
          cycles,
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
    cycles: Node[],
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
        cycles,
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
    if (!tree.canSupportBottomUpFlow()) {
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
