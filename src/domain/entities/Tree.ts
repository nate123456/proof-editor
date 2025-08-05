import { err, ok, type Result } from 'neverthrow';
import { TreeBoundsCalculationService } from '../services/TreeBoundsCalculationService.js';
import { ValidationError } from '../shared/result.js';
import {
  DocumentId,
  type NodeId,
  PhysicalProperties,
  Timestamp,
  Title,
  TreeId,
} from '../shared/value-objects/index.js';
import type { TreeBounds } from '../value-objects/TreeBounds.js';
import { TreePosition } from '../value-objects/TreePosition.js';

export class Tree {
  private readonly nodeParentMap = new Map<string, NodeId | null>();

  private constructor(
    private readonly id: TreeId,
    private readonly documentId: DocumentId,
    private position: TreePosition,
    private physicalProperties: PhysicalProperties,
    private readonly nodeIds: Set<NodeId>,
    private readonly createdAt: Timestamp,
    private modifiedAt: Timestamp,
    private title?: Title,
    private readonly boundsCalculationService = new TreeBoundsCalculationService(),
  ) {}

  /**
   * @deprecated Use TreeFactory.create() instead
   */
  static create(
    documentId: string,
    position: TreePosition = TreePosition.origin(),
    physicalProperties: PhysicalProperties = PhysicalProperties.default(),
    title?: string,
  ): Result<Tree, ValidationError> {
    const documentIdResult = DocumentId.create(documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    let titleResult: Title | undefined;
    if (title !== undefined) {
      const titleCreateResult = Title.create(title);
      if (titleCreateResult.isErr()) {
        return err(titleCreateResult.error);
      }
      titleResult = titleCreateResult.value;
    }

    const now = Timestamp.now();

    return ok(
      new Tree(
        TreeId.generate(),
        documentIdResult.value,
        position,
        physicalProperties,
        new Set(),
        now,
        now,
        titleResult,
      ),
    );
  }

  static reconstruct(
    id: TreeId,
    documentId: string,
    position: TreePosition,
    physicalProperties: PhysicalProperties,
    nodeIds: NodeId[],
    createdAt: number,
    modifiedAt: number,
    title?: string,
  ): Result<Tree, ValidationError> {
    const documentIdResult = DocumentId.create(documentId);
    if (documentIdResult.isErr()) {
      return err(documentIdResult.error);
    }

    const timestampCreatedResult = Timestamp.create(createdAt);
    if (timestampCreatedResult.isErr()) {
      return err(timestampCreatedResult.error);
    }

    const timestampModifiedResult = Timestamp.create(modifiedAt);
    if (timestampModifiedResult.isErr()) {
      return err(timestampModifiedResult.error);
    }

    let titleResult: Title | undefined;
    if (title !== undefined) {
      const titleCreateResult = Title.create(title);
      if (titleCreateResult.isErr()) {
        return err(titleCreateResult.error);
      }
      titleResult = titleCreateResult.value;
    }

    return ok(
      new Tree(
        id,
        documentIdResult.value,
        position,
        physicalProperties,
        new Set(nodeIds),
        timestampCreatedResult.value,
        timestampModifiedResult.value,
        titleResult,
      ),
    );
  }

  getId(): TreeId {
    return this.id;
  }

  getDocumentId(): string {
    return this.documentId.getValue();
  }

  getPosition(): TreePosition {
    return this.position;
  }

  getPhysicalProperties(): PhysicalProperties {
    return this.physicalProperties;
  }

  getNodeIds(): readonly NodeId[] {
    return Array.from(this.nodeIds);
  }

  getCreatedAt(): number {
    return this.createdAt.getValue();
  }

  getModifiedAt(): number {
    return this.modifiedAt.getValue();
  }

  getTitle(): string | undefined {
    return this.title?.getValue();
  }

  moveTo(newPosition: TreePosition): Result<void, ValidationError> {
    if (this.position.equals(newPosition)) {
      return ok(undefined);
    }

    this.position = newPosition;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  moveBy(deltaX: number, deltaY: number): Result<void, ValidationError> {
    const newPositionResult = this.position.moveBy(deltaX, deltaY);
    if (newPositionResult.isErr()) {
      return err(newPositionResult.error);
    }

    this.position = newPositionResult.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  updatePhysicalProperties(newProperties: PhysicalProperties): Result<void, ValidationError> {
    if (this.physicalProperties.equals(newProperties)) {
      return ok(undefined);
    }

    this.physicalProperties = newProperties;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  setTitle(title?: string): Result<void, ValidationError> {
    if (title === undefined) {
      if (this.title === undefined) {
        return ok(undefined);
      }
      this.title = undefined;
      this.modifiedAt = Timestamp.now();
      return ok(undefined);
    }

    const titleResult = Title.create(title);
    if (titleResult.isErr()) {
      return err(titleResult.error);
    }

    if (this.title?.equals(titleResult.value)) {
      return ok(undefined);
    }

    this.title = titleResult.value;
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  addNode(nodeId: NodeId): Result<void, ValidationError> {
    if (this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node already exists in tree'));
    }

    this.nodeIds.add(nodeId);
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  removeNode(nodeId: NodeId): Result<void, ValidationError> {
    if (!this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node not found in tree'));
    }

    this.nodeIds.delete(nodeId);
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  hasNode(nodeId: NodeId): boolean {
    return this.nodeIds.has(nodeId);
  }

  isEmpty(): boolean {
    return this.nodeIds.size === 0;
  }

  getNodeCount(): number {
    return this.nodeIds.size;
  }

  hasTitle(): boolean {
    return this.title !== undefined;
  }

  isAtPosition(x: number, y: number): boolean {
    return this.position.isAtLocation(x, y);
  }

  distanceFrom(otherTree: Tree): number {
    return this.position.distanceTo(otherTree.position);
  }

  getBounds(): Result<TreeBounds, ValidationError> {
    return this.boundsCalculationService.calculateBoundsFromTreePosition(
      this.position,
      this.physicalProperties,
    );
  }

  hasOverlapWithBounds(bounds: TreeBounds): Result<boolean, ValidationError> {
    const treeBoundsResult = this.getBounds();
    if (treeBoundsResult.isErr()) {
      return err(treeBoundsResult.error);
    }

    const overlaps = this.boundsCalculationService.checkBoundsOverlap(
      treeBoundsResult.value,
      bounds,
    );
    return ok(overlaps);
  }

  canSupportBottomUpFlow(): boolean {
    return this.physicalProperties.isBottomUpFlow();
  }

  canSupportTopDownFlow(): boolean {
    return this.physicalProperties.isTopDownFlow();
  }

  isEqualTo(other: Tree): boolean {
    return this.id.equals(other.id);
  }

  getNode(nodeId: NodeId): { getParentId(): NodeId | null } | null {
    if (!this.nodeIds.has(nodeId)) {
      return null;
    }

    const parentId = this.nodeParentMap.get(nodeId.getValue()) ?? null;
    return {
      getParentId: () => parentId,
    };
  }

  setNodeParent(nodeId: NodeId, parentId: NodeId | null): Result<void, ValidationError> {
    if (!this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node not found in tree'));
    }

    if (parentId && !this.nodeIds.has(parentId)) {
      return err(new ValidationError('Parent node not found in tree'));
    }

    if (parentId && this.canCreateCycle(nodeId, parentId)) {
      return err(new ValidationError('Setting parent would create cycle'));
    }

    this.nodeParentMap.set(nodeId.getValue(), parentId);
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  addNodeWithParent(nodeId: NodeId, parentNodeId: NodeId): Result<void, ValidationError> {
    if (this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node already exists in tree'));
    }

    if (!this.nodeIds.has(parentNodeId)) {
      return err(new ValidationError('Parent node not found in tree'));
    }

    if (this.canCreateCycle(nodeId, parentNodeId)) {
      return err(new ValidationError('Adding node would create cycle'));
    }

    this.nodeIds.add(nodeId);
    this.nodeParentMap.set(nodeId.getValue(), parentNodeId);
    this.modifiedAt = Timestamp.now();
    return ok(undefined);
  }

  canCreateCycle(childNodeId: NodeId, parentNodeId: NodeId): boolean {
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
      currentId = node?.getParentId() ?? null;
    }

    return false;
  }

  validateStructuralIntegrity(): Result<void, ValidationError> {
    return this.validateBasicStructure();
  }

  private validateBasicStructure(): Result<void, ValidationError> {
    for (const nodeId of Array.from(this.nodeIds)) {
      const node = this.getNode(nodeId);
      if (!node) {
        return err(new ValidationError(`Node ${nodeId.getValue()} not accessible in tree`));
      }
    }
    return ok(undefined);
  }

  toString(): string {
    const titlePart = this.title ? ` "${this.title.getValue()}"` : '';
    const positionPart = `at ${this.position.toString()}`;
    const nodeCountPart = `(${this.nodeIds.size} nodes)`;

    return `Tree${titlePart} ${positionPart} ${nodeCountPart}`;
  }

  static fromFactory(
    id: TreeId,
    documentId: DocumentId,
    position: TreePosition,
    physicalProperties: PhysicalProperties,
    nodeIds: Set<NodeId>,
    createdAt: Timestamp,
    modifiedAt: Timestamp,
    title?: Title,
    boundsCalculationService = new TreeBoundsCalculationService(),
  ): Tree {
    return new Tree(
      id,
      documentId,
      position,
      physicalProperties,
      nodeIds,
      createdAt,
      modifiedAt,
      title,
      boundsCalculationService,
    );
  }

  wouldCreateCycle(childNodeId: NodeId, parentNodeId: NodeId): boolean {
    return this.canCreateCycle(childNodeId, parentNodeId);
  }
}
