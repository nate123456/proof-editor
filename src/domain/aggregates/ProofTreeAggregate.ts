import { err, ok, type Result } from 'neverthrow';
import { Node } from '../entities/Node.js';
import type { DomainEvent } from '../events/base-event.js';
import {
  NodeAdded,
  NodeMoved,
  NodeRemoved,
  NodesConnected,
  ProofTreeCreated,
} from '../events/ProofTreeEvents.js';
import { ProofTreeAggregateQueryService } from '../queries/ProofTreeAggregateQueryService.js';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  Attachment,
  type NodeId,
  Position2D,
  ProofTreeId,
} from '../shared/value-objects/index.js';

export interface NodeCreationData {
  argumentId: AtomicArgumentId;
  attachment?: Attachment;
}

export interface SpatialLayout {
  offset: Position2D;
  scale: number;
}

export interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: NodeId[][];
}

export class ProofTreeAggregate {
  private readonly uncommittedEvents: DomainEvent[] = [];

  private readonly parentToChildrenMap: Map<string, Set<NodeId>> = new Map();
  private readonly childToParentMap: Map<NodeId, NodeId> = new Map();

  private constructor(
    private readonly id: ProofTreeId,
    private readonly nodes: Map<NodeId, Node>,
    private spatialLayout: SpatialLayout,
    private version: number = 1,
  ) {
    // Initialize parent-child caches
    this.rebuildParentChildCache();
  }

  static createNew(
    initialLayout: SpatialLayout = { offset: Position2D.origin(), scale: 1.0 },
  ): Result<ProofTreeAggregate, ValidationError> {
    const nodes = new Map<NodeId, Node>();
    const treeId = ProofTreeId.generate();

    const tree = new ProofTreeAggregate(treeId, nodes, initialLayout);

    tree.uncommittedEvents.push(
      new ProofTreeCreated(treeId.getValue(), {
        treeId,
        initialLayout: {
          offset: { x: initialLayout.offset.getX(), y: initialLayout.offset.getY() },
          scale: initialLayout.scale,
        },
      }),
    );

    return ok(tree);
  }

  static reconstruct(
    id: ProofTreeId,
    nodes: Map<NodeId, Node>,
    spatialLayout: SpatialLayout,
    argumentIds: ReadonlySet<AtomicArgumentId>,
    version: number = 1,
  ): Result<ProofTreeAggregate, ValidationError> {
    const tree = new ProofTreeAggregate(id, nodes, spatialLayout, version);

    const validationResult = tree.validateTreeStructure(argumentIds);
    if (validationResult.isErr()) {
      return err(new ValidationError(`Invalid tree structure: ${validationResult.error.message}`));
    }

    return ok(tree);
  }

  // Query service factory method
  createQueryService(): ProofTreeAggregateQueryService {
    return new ProofTreeAggregateQueryService(
      this.id,
      this.version,
      new Map(this.nodes),
      { ...this.spatialLayout },
      new Map(this.parentToChildrenMap),
      new Map(this.childToParentMap),
    );
  }

  addNode(
    nodeData: NodeCreationData,
    argumentIds: ReadonlySet<AtomicArgumentId>,
  ): Result<NodeId, ValidationError> {
    const argumentExists = argumentIds.has(nodeData.argumentId);
    if (!argumentExists) {
      return err(new ValidationError('Cannot add node: argument does not exist in proof'));
    }

    let nodeResult: Result<Node, ValidationError>;

    if (nodeData.attachment) {
      const parentExists = this.nodes.has(nodeData.attachment.getParentNodeId());
      if (!parentExists) {
        return err(new ValidationError('Parent node does not exist'));
      }

      nodeResult = Node.createChild(nodeData.argumentId, nodeData.attachment);
    } else {
      nodeResult = Node.createRoot(nodeData.argumentId);
    }

    if (nodeResult.isErr()) {
      return err(nodeResult.error);
    }

    const node = nodeResult.value;
    this.nodes.set(node.getId(), node);

    this.updateCachesForNewNode(node);
    this.incrementVersion();

    this.uncommittedEvents.push(
      new NodeAdded(this.id.getValue(), {
        nodeId: node.getId(),
        argumentId: nodeData.argumentId,
        ...(nodeData.attachment && {
          parentNodeId: nodeData.attachment.getParentNodeId(),
          position: nodeData.attachment.getPremisePosition(),
          ...(nodeData.attachment.getFromPosition() !== undefined && {
            fromPosition: nodeData.attachment.getFromPosition() as number,
          }),
        }),
      }),
    );

    return ok(node.getId());
  }

  removeNode(nodeId: NodeId): Result<void, ValidationError> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return err(new ValidationError('Node not found'));
    }

    const childNodes = this.getChildNodes(nodeId);
    if (childNodes.length > 0) {
      return err(
        new ValidationError(
          'Cannot remove node with children. Remove children first or use cascade operation.',
        ),
      );
    }

    this.nodes.delete(nodeId);

    this.updateCachesForRemovedNode(node);
    this.incrementVersion();

    this.uncommittedEvents.push(
      new NodeRemoved(this.id.getValue(), {
        nodeId: node.getId(),
        argumentId: node.getArgumentId(),
      }),
    );

    return ok(undefined);
  }

  connectNodes(
    parentId: NodeId,
    childId: NodeId,
    position: number,
    fromPosition?: number,
  ): Result<void, ValidationError> {
    const parentNode = this.nodes.get(parentId);
    const childNode = this.nodes.get(childId);

    if (!parentNode) {
      return err(new ValidationError('Parent node not found'));
    }
    if (!childNode) {
      return err(new ValidationError('Child node not found'));
    }

    if (!childNode.isRoot()) {
      return err(new ValidationError('Child node is already attached to another parent'));
    }

    if (position < 0) {
      return err(new ValidationError('Position must be non-negative'));
    }

    const childAtPosition = this.getChildAtPosition(parentId, position);
    if (childAtPosition) {
      return err(new ValidationError(`Position ${position} is already occupied`));
    }

    const attachmentResult = this.createAttachment(parentId, position, fromPosition);
    if (attachmentResult.isErr()) {
      return err(attachmentResult.error);
    }

    const attachResult = childNode.attachToParent(attachmentResult.value);
    if (attachResult.isErr()) {
      return err(attachResult.error);
    }

    const structureValidation = this.validateTreeStructure();
    if (structureValidation.isErr()) {
      childNode.detachFromParent();
      return err(structureValidation.error);
    }

    this.addToParentChildCache(parentId, childId);
    this.incrementVersion();

    this.uncommittedEvents.push(
      new NodesConnected(this.id.getValue(), {
        parentNodeId: parentId,
        childNodeId: childId,
        position,
        ...(fromPosition !== undefined && { fromPosition }),
      }),
    );

    return ok(undefined);
  }

  moveNode(nodeId: NodeId, newPosition: Position2D): Result<void, ValidationError> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return err(new ValidationError('Node not found'));
    }

    const previousPosition = {
      x: this.spatialLayout.offset.getX(),
      y: this.spatialLayout.offset.getY(),
    };
    this.spatialLayout.offset = newPosition;
    this.incrementVersion();

    this.uncommittedEvents.push(
      new NodeMoved(this.id.getValue(), {
        nodeId,
        newPosition: { x: newPosition.getX(), y: newPosition.getY() },
        previousPosition,
      }),
    );

    return ok(undefined);
  }

  validateTreeStructure(
    argumentIds?: ReadonlySet<AtomicArgumentId>,
  ): Result<void, ValidationError> {
    if (argumentIds) {
      const nodeValidation = this.validateNodeReferences(argumentIds);
      if (nodeValidation.isErr()) {
        return err(new ValidationError(nodeValidation.error.message));
      }
    }

    const cycleDetection = this.detectCycles();
    if (cycleDetection.hasCycles) {
      return err(
        new ValidationError(
          `Tree contains cycles: ${cycleDetection.cycles.map((cycle) => cycle.map((id) => id.getValue()).join(' -> ')).join(', ')}`,
        ),
      );
    }

    const attachmentValidation = this.validateAttachments();
    if (attachmentValidation.isErr()) {
      return err(new ValidationError(attachmentValidation.error.message));
    }

    return ok(undefined);
  }

  detectCycles(): CycleDetectionResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: NodeId[][] = [];

    const detectCycleFromNode = (nodeId: NodeId, path: NodeId[]): void => {
      const nodeKey = nodeId.getValue();

      if (recursionStack.has(nodeKey)) {
        const cycleStartIndex = path.findIndex((id) => id.equals(nodeId));
        if (cycleStartIndex !== -1) {
          cycles.push(path.slice(cycleStartIndex));
        }
        return;
      }

      if (visited.has(nodeKey)) {
        return;
      }

      visited.add(nodeKey);
      recursionStack.add(nodeKey);

      const childIds = this.parentToChildrenMap.get(nodeKey) ?? new Set();
      for (const childId of childIds) {
        detectCycleFromNode(childId, [...path, childId]);
      }

      recursionStack.delete(nodeKey);
    };

    for (const [nodeId] of Array.from(this.nodes.entries())) {
      const nodeKey = nodeId.getValue();
      if (!visited.has(nodeKey)) {
        detectCycleFromNode(nodeId, [nodeId]);
      }
    }

    return {
      hasCycles: cycles.length > 0,
      cycles,
    };
  }

  getUncommittedEvents(): readonly DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents.length = 0;
  }

  private getChildNodes(parentId: NodeId): Node[] {
    const childIds = this.parentToChildrenMap.get(parentId.getValue()) ?? new Set();
    return Array.from(childIds)
      .map((id) => this.nodes.get(id))
      .filter((node): node is Node => node !== undefined);
  }

  private getChildAtPosition(parentId: NodeId, position: number): Node | null {
    return (
      Array.from(this.nodes.values()).find(
        (node) => node.isChildOf(parentId) && node.feedsInputToParentAt(position),
      ) ?? null
    );
  }

  private createAttachment(
    parentId: NodeId,
    position: number,
    fromPosition?: number,
  ): Result<Attachment, ValidationError> {
    try {
      const attachmentResult = Attachment.create(parentId, position, fromPosition);
      if (attachmentResult.isErr()) {
        return err(
          new ValidationError(`Failed to create attachment: ${attachmentResult.error.message}`),
        );
      }
      return ok(attachmentResult.value);
    } catch (error) {
      return err(new ValidationError(`Failed to create attachment: ${(error as Error).message}`));
    }
  }

  private validateNodeReferences(
    argumentIds: ReadonlySet<AtomicArgumentId>,
  ): Result<void, ValidationError> {
    for (const node of Array.from(this.nodes.values())) {
      const argumentExists = argumentIds.has(node.getArgumentId());
      if (!argumentExists) {
        return err(
          new ValidationError(
            `Node ${node.getId().getValue()} references non-existent argument ${node.getArgumentId().getValue()}`,
          ),
        );
      }

      if (node.isChild()) {
        const parentId = node.getParentNodeId();
        if (parentId && !this.nodes.has(parentId)) {
          return err(
            new ValidationError(
              `Node ${node.getId().getValue()} references non-existent parent ${parentId.getValue()}`,
            ),
          );
        }
      }
    }

    return ok(undefined);
  }

  private validateAttachments(): Result<void, ValidationError> {
    for (const node of Array.from(this.nodes.values())) {
      if (node.isChild()) {
        const position = node.getPremisePosition();
        if (position !== null && position < 0) {
          return err(
            new ValidationError(`Node ${node.getId().getValue()} has invalid position ${position}`),
          );
        }

        const fromPosition = node.getFromPosition();
        if (fromPosition !== null && fromPosition < 0) {
          return err(
            new ValidationError(
              `Node ${node.getId().getValue()} has invalid from position ${fromPosition}`,
            ),
          );
        }
      }
    }

    return ok(undefined);
  }

  private incrementVersion(): void {
    this.version++;
  }

  private rebuildParentChildCache(): void {
    this.parentToChildrenMap.clear();
    this.childToParentMap.clear();

    for (const node of Array.from(this.nodes.values())) {
      if (node.isChild()) {
        const parentId = node.getParentNodeId();
        if (parentId) {
          this.addToParentChildCache(parentId, node.getId());
        }
      }
    }
  }

  private updateCachesForNewNode(node: Node): void {
    if (node.isChild()) {
      const parentId = node.getParentNodeId();
      if (parentId) {
        this.addToParentChildCache(parentId, node.getId());
      }
    }
  }

  private updateCachesForRemovedNode(node: Node): void {
    if (node.isChild()) {
      const parentId = node.getParentNodeId();
      if (parentId) {
        this.removeFromParentChildCache(parentId, node.getId());
      }
    }

    // Also remove any children this node had
    const parentKey = node.getId().getValue();
    this.parentToChildrenMap.delete(parentKey);

    // Remove from child-to-parent mapping
    this.childToParentMap.delete(node.getId());
  }

  private addToParentChildCache(parentId: NodeId, childId: NodeId): void {
    const parentKey = parentId.getValue();
    const children = this.parentToChildrenMap.get(parentKey) ?? new Set();
    children.add(childId);
    this.parentToChildrenMap.set(parentKey, children);
    this.childToParentMap.set(childId, parentId);
  }

  private removeFromParentChildCache(parentId: NodeId, childId: NodeId): void {
    const parentKey = parentId.getValue();
    const children = this.parentToChildrenMap.get(parentKey);
    if (children) {
      children.delete(childId);
      if (children.size === 0) {
        this.parentToChildrenMap.delete(parentKey);
      }
    }
    this.childToParentMap.delete(childId);
  }
}
