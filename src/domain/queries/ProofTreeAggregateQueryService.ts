import { err, ok, type Result } from 'neverthrow';
import type { Node } from '../entities/Node.js';
import { ValidationError } from '../shared/result.js';
import type { AtomicArgumentId, NodeId, ProofTreeId } from '../shared/value-objects/index.js';

export interface SpatialLayout {
  offset: { x: number; y: number };
  scale: number;
}

export interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: NodeId[][];
}

export class ProofTreeAggregateQueryService {
  constructor(
    private readonly id: ProofTreeId,
    private readonly version: number,
    private readonly nodes: ReadonlyMap<NodeId, Node>,
    private readonly spatialLayout: SpatialLayout,
    private readonly parentToChildrenMap: ReadonlyMap<string, ReadonlySet<NodeId>>,
    private readonly childToParentMap: ReadonlyMap<NodeId, NodeId>,
  ) {}

  getId(): ProofTreeId {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  getNodes(): ReadonlyMap<NodeId, Node> {
    return this.nodes;
  }

  getSpatialLayout(): Readonly<SpatialLayout> {
    return { ...this.spatialLayout };
  }

  getNode(id: NodeId): Node | null {
    return this.nodes.get(id) || null;
  }

  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getRootNodes(): Node[] {
    return Array.from(this.nodes.values()).filter((node) => node.isRoot());
  }

  getChildNodes(parentId: NodeId): Node[] {
    const childIds = this.parentToChildrenMap.get(parentId.getValue()) || new Set();
    return Array.from(childIds)
      .map((id) => this.nodes.get(id))
      .filter((node): node is Node => node !== undefined);
  }

  getParentNode(childId: NodeId): Node | null {
    const parentId = this.childToParentMap.get(childId);
    if (!parentId) return null;
    return this.nodes.get(parentId) || null;
  }

  getChildAtPosition(parentId: NodeId, position: number): Node | null {
    return (
      Array.from(this.nodes.values()).find(
        (node) => node.isChildOf(parentId) && node.feedsInputToParentAt(position),
      ) || null
    );
  }

  getNodesUsingArgument(argumentId: AtomicArgumentId): Node[] {
    return Array.from(this.nodes.values()).filter((node) =>
      node.getArgumentId().equals(argumentId),
    );
  }

  getTreeDepth(): number {
    let maxDepth = 0;

    const calculateDepth = (nodeId: NodeId, currentDepth: number): void => {
      maxDepth = Math.max(maxDepth, currentDepth);

      const childIds = this.parentToChildrenMap.get(nodeId.getValue()) || new Set();
      for (const childId of childIds) {
        calculateDepth(childId, currentDepth + 1);
      }
    };

    for (const node of this.nodes.values()) {
      if (node.isRoot()) {
        calculateDepth(node.getId(), 1);
      }
    }

    return maxDepth;
  }

  getTreeBreadth(): number {
    const breadthAtLevel = new Map<number, number>();

    const calculateBreadth = (nodeId: NodeId, level: number): void => {
      breadthAtLevel.set(level, (breadthAtLevel.get(level) || 0) + 1);

      const childIds = this.parentToChildrenMap.get(nodeId.getValue()) || new Set();
      for (const childId of childIds) {
        calculateBreadth(childId, level + 1);
      }
    };

    for (const node of this.nodes.values()) {
      if (node.isRoot()) {
        calculateBreadth(node.getId(), 0);
      }
    }

    return Math.max(...Array.from(breadthAtLevel.values()), 0);
  }

  getNodesByLevel(level: number): Node[] {
    const nodesAtLevel: Node[] = [];

    const traverseLevel = (nodeId: NodeId, currentLevel: number): void => {
      if (currentLevel === level) {
        const node = this.nodes.get(nodeId);
        if (node) {
          nodesAtLevel.push(node);
        }
        return;
      }

      const childIds = this.parentToChildrenMap.get(nodeId.getValue()) || new Set();
      for (const childId of childIds) {
        traverseLevel(childId, currentLevel + 1);
      }
    };

    for (const node of this.nodes.values()) {
      if (node.isRoot()) {
        traverseLevel(node.getId(), 0);
      }
    }

    return nodesAtLevel;
  }

  getSubtreeNodes(rootId: NodeId): Node[] {
    const subtreeNodes: Node[] = [];

    const traverse = (nodeId: NodeId): void => {
      const node = this.nodes.get(nodeId);
      if (node) {
        subtreeNodes.push(node);
      }

      const childIds = this.parentToChildrenMap.get(nodeId.getValue()) || new Set();
      for (const childId of childIds) {
        traverse(childId);
      }
    };

    traverse(rootId);
    return subtreeNodes;
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

      const childIds = this.parentToChildrenMap.get(nodeKey) || new Set();
      for (const childId of childIds) {
        detectCycleFromNode(childId, [...path, childId]);
      }

      recursionStack.delete(nodeKey);
    };

    for (const nodeId of this.nodes.keys()) {
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

  validateNodeReferences(
    argumentIds: ReadonlySet<AtomicArgumentId>,
  ): Result<void, ValidationError> {
    for (const node of this.nodes.values()) {
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

  validateAttachments(): Result<void, ValidationError> {
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

  validateTreeStructure(
    argumentIds?: ReadonlySet<AtomicArgumentId>,
  ): Result<void, ValidationError> {
    if (argumentIds) {
      const nodeValidation = this.validateNodeReferences(argumentIds);
      if (nodeValidation.isErr()) {
        return err(nodeValidation.error);
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
      return err(attachmentValidation.error);
    }

    return ok(undefined);
  }
}
