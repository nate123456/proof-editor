import type { Result } from "../shared/result.js";
import { success, failure, ValidationError } from "../shared/result.js";
import { TreeId, NodeId, Position2D, PhysicalProperties } from "../shared/value-objects.js";

export class TreeEntity {
  private nodeParentMap = new Map<string, NodeId | null>();

  private constructor(
    private readonly id: TreeId,
    private readonly documentId: string,
    private position: Position2D,
    private physicalProperties: PhysicalProperties,
    private readonly nodeIds: Set<NodeId>,
    private readonly createdAt: number,
    private modifiedAt: number,
    private title?: string
  ) {}

  static create(
    documentId: string,
    position: Position2D = Position2D.origin(),
    physicalProperties: PhysicalProperties = PhysicalProperties.default(),
    title?: string
  ): Result<TreeEntity, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return failure(new ValidationError("Document ID cannot be empty"));
    }

    const now = Date.now();

    return success(new TreeEntity(
      TreeId.generate(),
      documentId.trim(),
      position,
      physicalProperties,
      new Set(),
      now,
      now,
      title?.trim()
    ));
  }

  static reconstruct(
    id: TreeId,
    documentId: string,
    position: Position2D,
    physicalProperties: PhysicalProperties,
    nodeIds: NodeId[],
    createdAt: number,
    modifiedAt: number,
    title?: string
  ): Result<TreeEntity, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return failure(new ValidationError("Document ID cannot be empty"));
    }

    return success(new TreeEntity(
      id,
      documentId.trim(),
      position,
      physicalProperties,
      new Set(nodeIds),
      createdAt,
      modifiedAt,
      title?.trim()
    ));
  }

  getId(): TreeId {
    return this.id;
  }

  getDocumentId(): string {
    return this.documentId;
  }

  getPosition(): Position2D {
    return this.position;
  }

  getPhysicalProperties(): PhysicalProperties {
    return this.physicalProperties;
  }

  getNodeIds(): readonly NodeId[] {
    return Array.from(this.nodeIds);
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getModifiedAt(): number {
    return this.modifiedAt;
  }

  getTitle(): string | undefined {
    return this.title;
  }

  moveTo(newPosition: Position2D): Result<void, ValidationError> {
    if (this.position.equals(newPosition)) {
      return success(undefined);
    }

    this.position = newPosition;
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  moveBy(deltaX: number, deltaY: number): Result<void, ValidationError> {
    const newPositionResult = this.position.moveBy(deltaX, deltaY);
    if (!newPositionResult.success) {
      return failure(newPositionResult.error);
    }

    this.position = newPositionResult.data;
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  updatePhysicalProperties(newProperties: PhysicalProperties): Result<void, ValidationError> {
    if (this.physicalProperties.equals(newProperties)) {
      return success(undefined);
    }

    this.physicalProperties = newProperties;
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  setTitle(title?: string): Result<void, ValidationError> {
    const trimmedTitle = title?.trim();
    if (this.title === trimmedTitle) {
      return success(undefined);
    }

    this.title = trimmedTitle;
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  addNode(nodeId: NodeId): Result<void, ValidationError> {
    if (this.nodeIds.has(nodeId)) {
      return failure(new ValidationError("Node already exists in tree"));
    }

    this.nodeIds.add(nodeId);
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  removeNode(nodeId: NodeId): Result<void, ValidationError> {
    if (!this.nodeIds.has(nodeId)) {
      return failure(new ValidationError("Node not found in tree"));
    }

    this.nodeIds.delete(nodeId);
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  containsNode(nodeId: NodeId): boolean {
    return this.nodeIds.has(nodeId);
  }

  isEmpty(): boolean {
    return this.nodeIds.size === 0;
  }

  getNodeCount(): number {
    return this.nodeIds.size;
  }

  hasTitle(): boolean {
    return this.title !== undefined && this.title.length > 0;
  }

  isAtPosition(x: number, y: number): boolean {
    return this.position.getX() === x && this.position.getY() === y;
  }

  distanceFrom(otherTree: TreeEntity): number {
    return this.position.distanceTo(otherTree.position);
  }

  getBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const x = this.position.getX();
    const y = this.position.getY();
    const minWidth = this.physicalProperties.getMinWidth();
    const minHeight = this.physicalProperties.getMinHeight();

    return {
      minX: x,
      minY: y,
      maxX: x + minWidth,
      maxY: y + minHeight
    };
  }

  overlapsWithBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
    const treeBounds = this.getBounds();
    
    return !(
      treeBounds.maxX <= bounds.minX ||
      treeBounds.minX >= bounds.maxX ||
      treeBounds.maxY <= bounds.minY ||
      treeBounds.minY >= bounds.maxY
    );
  }

  supportsBottomUpFlow(): boolean {
    return this.physicalProperties.isBottomUpFlow();
  }

  supportsTopDownFlow(): boolean {
    return this.physicalProperties.isTopDownFlow();
  }

  equals(other: TreeEntity): boolean {
    return this.id.equals(other.id);
  }

  getNode(nodeId: NodeId): { getParentId(): NodeId | null } | null {
    if (!this.nodeIds.has(nodeId)) {
      return null;
    }
    
    const parentId = this.nodeParentMap.get(nodeId.getValue()) || null;
    return {
      getParentId: () => parentId
    };
  }

  setNodeParent(nodeId: NodeId, parentId: NodeId | null): Result<void, ValidationError> {
    if (!this.nodeIds.has(nodeId)) {
      return failure(new ValidationError("Node not found in tree"));
    }

    if (parentId && !this.nodeIds.has(parentId)) {
      return failure(new ValidationError("Parent node not found in tree"));
    }

    if (parentId && this.wouldCreateCycle(nodeId, parentId)) {
      return failure(new ValidationError("Setting parent would create cycle"));
    }

    this.nodeParentMap.set(nodeId.getValue(), parentId);
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  addNodeWithParent(nodeId: NodeId, parentNodeId: NodeId): Result<void, ValidationError> {
    if (this.nodeIds.has(nodeId)) {
      return failure(new ValidationError("Node already exists in tree"));
    }

    if (!this.nodeIds.has(parentNodeId)) {
      return failure(new ValidationError("Parent node not found in tree"));
    }

    if (this.wouldCreateCycle(nodeId, parentNodeId)) {
      return failure(new ValidationError("Adding node would create cycle"));
    }

    this.nodeIds.add(nodeId);
    this.modifiedAt = Date.now();
    return success(undefined);
  }

  wouldCreateCycle(childNodeId: NodeId, parentNodeId: NodeId): boolean {
    let currentId: NodeId | null = parentNodeId;
    const visited = new Set<string>();

    while (currentId !== null) {
      const currentIdString = currentId.getValue();
      
      if (visited.has(currentIdString)) {
        return true;
      }
      
      if (currentId.equals(childNodeId)) {
        return true;
      }

      visited.add(currentIdString);
      const node = this.getNode(currentId);
      currentId = node?.getParentId() || null;
    }

    return false;
  }

  validateStructuralIntegrity(): Result<void, ValidationError> {
    for (const nodeId of this.nodeIds) {
      const node = this.getNode(nodeId);
      if (!node) {
        return failure(new ValidationError(`Node ${nodeId.getValue()} not accessible in tree`));
      }
    }
    return success(undefined);
  }

  toString(): string {
    const titlePart = this.title ? ` "${this.title}"` : '';
    const positionPart = `at ${this.position.toString()}`;
    const nodeCountPart = `(${this.nodeIds.size} nodes)`;
    
    return `Tree${titlePart} ${positionPart} ${nodeCountPart}`;
  }
}