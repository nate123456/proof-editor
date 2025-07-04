import { err, ok, type Result } from 'neverthrow';
import { Node } from '../entities/Node.js';
import type { DomainEvent } from '../events/base-event.js';
import { ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  Attachment,
  type NodeId,
  Position2D,
  ProofTreeId,
} from '../shared/value-objects.js';
import type { ProofAggregate } from './ProofAggregate.js';

export interface NodeCreationData {
  argumentId: AtomicArgumentId;
  attachment?: Attachment;
}

export interface SpatialLayout {
  offset: Position2D;
  scale: number;
}

export class TreeConsistencyError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'TreeConsistencyError';
    this.cause = cause;
  }
}

export interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: NodeId[][];
}

export class ProofTreeAggregate {
  private readonly uncommittedEvents: DomainEvent[] = [];

  // Performance optimization: Cache for parent-child relationships
  private readonly parentToChildrenMap: Map<string, Set<NodeId>> = new Map();
  private readonly childToParentMap: Map<NodeId, NodeId> = new Map();

  private constructor(
    private readonly id: ProofTreeId,
    private readonly nodes: Map<NodeId, Node>,
    private spatialLayout: SpatialLayout,
    private readonly proofAggregate: ProofAggregate,
    private version: number = 1,
  ) {
    // Initialize parent-child caches
    this.rebuildParentChildCache();
  }

  static createNew(
    proofAggregate: ProofAggregate,
    initialLayout: SpatialLayout = { offset: Position2D.origin(), scale: 1.0 },
  ): Result<ProofTreeAggregate, ValidationError> {
    const nodes = new Map<NodeId, Node>();

    const tree = new ProofTreeAggregate(
      ProofTreeId.generate(),
      nodes,
      initialLayout,
      proofAggregate,
    );

    return ok(tree);
  }

  static reconstruct(
    id: ProofTreeId,
    nodes: Map<NodeId, Node>,
    spatialLayout: SpatialLayout,
    proofAggregate: ProofAggregate,
    version: number = 1,
  ): Result<ProofTreeAggregate, ValidationError> {
    const tree = new ProofTreeAggregate(id, nodes, spatialLayout, proofAggregate, version);

    const validationResult = tree.validateTreeStructure();
    if (validationResult.isErr()) {
      return err(new ValidationError(`Invalid tree structure: ${validationResult.error.message}`));
    }

    return ok(tree);
  }

  getId(): ProofTreeId {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  getNodes(): ReadonlyMap<NodeId, Node> {
    return new Map(this.nodes);
  }

  getSpatialLayout(): Readonly<SpatialLayout> {
    return { ...this.spatialLayout };
  }

  getProofAggregate(): ProofAggregate {
    return this.proofAggregate;
  }

  addNode(nodeData: NodeCreationData): Result<NodeId, ValidationError> {
    const argumentExists = this.proofAggregate.getArguments().has(nodeData.argumentId);
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

    // Update performance caches
    this.updateCachesForNewNode(node);
    this.incrementVersion();

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

    // Update performance caches
    this.updateCachesForRemovedNode(node);
    this.incrementVersion();

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

    const parentArgument = this.proofAggregate.getArguments().get(parentNode.getArgumentId());
    if (!parentArgument) {
      return err(new ValidationError('Parent argument not found in proof'));
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

    // Update caches after successful connection
    this.addToParentChildCache(parentId, childId);
    this.incrementVersion();

    return ok(undefined);
  }

  moveNode(nodeId: NodeId, newPosition: Position2D): Result<void, ValidationError> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return err(new ValidationError('Node not found'));
    }

    this.spatialLayout.offset = newPosition;
    this.incrementVersion();

    return ok(undefined);
  }

  validateTreeStructure(): Result<void, TreeConsistencyError> {
    try {
      const nodeValidation = this.validateNodeReferences();
      if (nodeValidation.isErr()) {
        return err(new TreeConsistencyError(nodeValidation.error.message));
      }

      const cycleDetection = this.detectCycles();
      if (cycleDetection.hasCycles) {
        return err(
          new TreeConsistencyError(
            `Tree contains cycles: ${cycleDetection.cycles.map((cycle) => cycle.map((id) => id.getValue()).join(' -> ')).join(', ')}`,
          ),
        );
      }

      const attachmentValidation = this.validateAttachments();
      if (attachmentValidation.isErr()) {
        return err(new TreeConsistencyError(attachmentValidation.error.message));
      }

      return ok(undefined);
    } catch (error) {
      return err(new TreeConsistencyError('Tree validation failed', error as Error));
    }
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

      // Use cached children lookup for better performance
      const childIds = this.parentToChildrenMap.get(nodeKey) ?? new Set();
      for (const childId of childIds) {
        detectCycleFromNode(childId, [...path, childId]);
      }

      recursionStack.delete(nodeKey);
    };

    for (const [nodeId] of this.nodes) {
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
    // Use cache for O(1) lookup instead of O(n) filtering
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

  private validateNodeReferences(): Result<void, ValidationError> {
    for (const node of this.nodes.values()) {
      const argumentExists = this.proofAggregate.getArguments().has(node.getArgumentId());
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
    for (const node of this.nodes.values()) {
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

  // Performance optimization methods
  private rebuildParentChildCache(): void {
    this.parentToChildrenMap.clear();
    this.childToParentMap.clear();

    for (const node of this.nodes.values()) {
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
