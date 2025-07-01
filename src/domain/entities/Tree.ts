import { ProcessingError } from '../errors/DomainErrors';
import type { IAtomicArgumentRepository } from '../repositories/IAtomicArgumentRepository';
// import type { INodeRepository } from '../repositories/INodeRepository';
import type { IOrderedSetRepository } from '../repositories/IOrderedSetRepository';
import { err, ok, type Result, ValidationError } from '../shared/result.js';
import {
  type AtomicArgumentId,
  type NodeId,
  type OrderedSetId,
  PhysicalProperties,
  Position2D,
  TreeId,
} from '../shared/value-objects.js';
import type { AtomicArgument } from './AtomicArgument';

export class Tree {
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
  ): Result<Tree, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return err(new ValidationError('Document ID cannot be empty'));
    }

    const now = Date.now();

    return ok(
      new Tree(
        TreeId.generate(),
        documentId.trim(),
        position,
        physicalProperties,
        new Set(),
        now,
        now,
        title?.trim()
      )
    );
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
  ): Result<Tree, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return err(new ValidationError('Document ID cannot be empty'));
    }

    return ok(
      new Tree(
        id,
        documentId.trim(),
        position,
        physicalProperties,
        new Set(nodeIds),
        createdAt,
        modifiedAt,
        title?.trim()
      )
    );
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
      return ok(undefined);
    }

    this.position = newPosition;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  moveBy(deltaX: number, deltaY: number): Result<void, ValidationError> {
    const newPositionResult = this.position.moveBy(deltaX, deltaY);
    if (newPositionResult.isErr()) {
      return err(new ValidationError('Invalid position change'));
    }

    this.position = newPositionResult.value;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  updatePhysicalProperties(newProperties: PhysicalProperties): Result<void, ValidationError> {
    if (this.physicalProperties.equals(newProperties)) {
      return ok(undefined);
    }

    this.physicalProperties = newProperties;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  setTitle(title?: string): Result<void, ValidationError> {
    const trimmedTitle = title?.trim();
    if (this.title === trimmedTitle) {
      return ok(undefined);
    }

    this.title = trimmedTitle;
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  addNode(nodeId: NodeId): Result<void, ValidationError> {
    if (this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node already exists in tree'));
    }

    this.nodeIds.add(nodeId);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  removeNode(nodeId: NodeId): Result<void, ValidationError> {
    if (!this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node not found in tree'));
    }

    this.nodeIds.delete(nodeId);
    this.modifiedAt = Date.now();
    return ok(undefined);
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

  distanceFrom(otherTree: Tree): number {
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
      maxY: y + minHeight,
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

  equals(other: Tree): boolean {
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

    if (parentId && this.wouldCreateCycle(nodeId, parentId)) {
      return err(new ValidationError('Setting parent would create cycle'));
    }

    this.nodeParentMap.set(nodeId.getValue(), parentId);
    this.modifiedAt = Date.now();
    return ok(undefined);
  }

  addNodeWithParent(nodeId: NodeId, parentNodeId: NodeId): Result<void, ValidationError> {
    if (this.nodeIds.has(nodeId)) {
      return err(new ValidationError('Node already exists in tree'));
    }

    if (!this.nodeIds.has(parentNodeId)) {
      return err(new ValidationError('Parent node not found in tree'));
    }

    if (this.wouldCreateCycle(nodeId, parentNodeId)) {
      return err(new ValidationError('Adding node would create cycle'));
    }

    this.nodeIds.add(nodeId);
    this.modifiedAt = Date.now();
    return ok(undefined);
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
      currentId = node?.getParentId() ?? null;
    }

    return false;
  }

  /**
   * Finds direct connections (parents and children) for a given argument within tree context.
   * Trees resolve their own connection structure based on position and attachment.
   */
  async findDirectConnections(
    argumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<Result<TreeConnectionMap, ProcessingError>> {
    const argument = await atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return err(new ProcessingError('Argument not found'));
    }

    const parents = await this.findParentArguments(argument, atomicArgumentRepo);
    const children = await this.findChildArguments(argument, atomicArgumentRepo);

    const connectionMap = new TreeConnectionMap(argumentId, parents, children);
    return ok(connectionMap);
  }

  /**
   * Finds all connected arguments in this tree structure.
   * Trees understand their own connectivity through node relationships.
   */
  async findArgumentTree(
    startArgumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<Result<TreeArgumentStructure, ProcessingError>> {
    const visited = new Set<string>();
    const treeArguments = new Set<AtomicArgumentId>();

    await this.traverseConnectedArguments(
      startArgumentId,
      visited,
      treeArguments,
      atomicArgumentRepo
    );

    const structure = new TreeArgumentStructure(Array.from(treeArguments));
    return ok(structure);
  }

  /**
   * Finds path-complete argument between two points within this tree.
   * Trees resolve their own path completeness based on positional structure.
   */
  async findPathCompleteArgument(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<Result<TreePathCompleteArgument, ProcessingError>> {
    const paths = await this.findAllPaths(startId, endId, atomicArgumentRepo);
    if (paths.length === 0) {
      return err(new ProcessingError('No path exists between arguments'));
    }

    const allArgumentsInPaths = new Set<AtomicArgumentId>();
    for (const path of paths) {
      path.forEach(argId => allArgumentsInPaths.add(argId));
    }

    const pathCompleteArgument = new TreePathCompleteArgument(
      Array.from(allArgumentsInPaths),
      paths
    );
    return ok(pathCompleteArgument);
  }

  /**
   * Discovers shared references within this tree's context.
   * Trees understand their own ordered set usage patterns.
   */
  async discoverSharedReferences(
    orderedSetId: OrderedSetId,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<Result<TreeOrderedSetReference[], ProcessingError>> {
    const argumentsUsingSet = await atomicArgumentRepo.findByOrderedSetReference(orderedSetId);
    const references: TreeOrderedSetReference[] = [];

    for (const argument of argumentsUsingSet) {
      // Only include arguments that are part of this tree
      const argumentInTree = this.isArgumentInTree(argument.getId(), atomicArgumentRepo);
      if (!argumentInTree) continue;

      const premiseRef = argument.getPremiseSetRef();
      const conclusionRef = argument.getConclusionSetRef();

      if (premiseRef?.equals(orderedSetId)) {
        references.push(new TreeOrderedSetReference(argument.getId(), 'premise', orderedSetId));
      }

      if (conclusionRef?.equals(orderedSetId)) {
        references.push(new TreeOrderedSetReference(argument.getId(), 'conclusion', orderedSetId));
      }
    }

    return ok(references);
  }

  /**
   * Validates connection integrity for arguments within this tree.
   * Trees validate their own structural coherence.
   */
  async validateConnectionIntegrity(
    argumentId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository,
    orderedSetRepo: IOrderedSetRepository
  ): Promise<Result<TreeConnectionIntegrityReport, ProcessingError>> {
    const argument = await atomicArgumentRepo.findById(argumentId);
    if (!argument) {
      return err(new ProcessingError('Argument not found'));
    }

    // Only validate if argument is part of this tree
    const argumentInTree = this.isArgumentInTree(argumentId, atomicArgumentRepo);
    if (!argumentInTree) {
      return err(new ProcessingError('Argument not part of this tree'));
    }

    const issues: TreeConnectionIntegrityIssue[] = [];

    const premiseSetRef = argument.getPremiseSetRef();
    if (premiseSetRef) {
      const premiseSet = await orderedSetRepo.findById(premiseSetRef);
      if (!premiseSet) {
        issues.push(
          new TreeConnectionIntegrityIssue(
            'missing_premise_set',
            `Premise set ${premiseSetRef.getValue()} not found`
          )
        );
      }
    }

    const conclusionSetRef = argument.getConclusionSetRef();
    if (conclusionSetRef) {
      const conclusionSet = await orderedSetRepo.findById(conclusionSetRef);
      if (!conclusionSet) {
        issues.push(
          new TreeConnectionIntegrityIssue(
            'missing_conclusion_set',
            `Conclusion set ${conclusionSetRef.getValue()} not found`
          )
        );
      }
    }

    const report = new TreeConnectionIntegrityReport(argumentId, issues);
    return ok(report);
  }

  validateStructuralIntegrity(): Result<void, ValidationError> {
    for (const nodeId of Array.from(this.nodeIds)) {
      const node = this.getNode(nodeId);
      if (!node) {
        return err(new ValidationError(`Node ${nodeId.getValue()} not accessible in tree`));
      }
    }
    return ok(undefined);
  }

  private async findParentArguments(
    argument: AtomicArgument,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<AtomicArgument[]> {
    const premiseSetRef = argument.getPremiseSetRef();
    if (!premiseSetRef) return [];

    const allArguments = await atomicArgumentRepo.findAll();
    return allArguments.filter(
      arg =>
        arg.getConclusionSetRef()?.equals(premiseSetRef) && !arg.getId().equals(argument.getId())
    );
  }

  private async findChildArguments(
    argument: AtomicArgument,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<AtomicArgument[]> {
    const conclusionSetRef = argument.getConclusionSetRef();
    if (!conclusionSetRef) return [];

    const allArguments = await atomicArgumentRepo.findAll();
    return allArguments.filter(
      arg =>
        arg.getPremiseSetRef()?.equals(conclusionSetRef) && !arg.getId().equals(argument.getId())
    );
  }

  private async traverseConnectedArguments(
    currentId: AtomicArgumentId,
    visited: Set<string>,
    result: Set<AtomicArgumentId>,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<void> {
    const idString = currentId.getValue();
    if (visited.has(idString)) return;

    visited.add(idString);
    result.add(currentId);

    const connectionsResult = await this.findDirectConnections(currentId, atomicArgumentRepo);
    if (connectionsResult.isErr()) return;

    const connections = connectionsResult.value;

    for (const parent of connections.getParents()) {
      await this.traverseConnectedArguments(parent.getId(), visited, result, atomicArgumentRepo);
    }

    for (const child of connections.getChildren()) {
      await this.traverseConnectedArguments(child.getId(), visited, result, atomicArgumentRepo);
    }
  }

  private async findAllPaths(
    startId: AtomicArgumentId,
    endId: AtomicArgumentId,
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<AtomicArgumentId[][]> {
    const paths: AtomicArgumentId[][] = [];
    const currentPath: AtomicArgumentId[] = [];
    const visited = new Set<string>();

    await this.depthFirstSearch(startId, endId, currentPath, visited, paths, atomicArgumentRepo);
    return paths;
  }

  private async depthFirstSearch(
    currentId: AtomicArgumentId,
    targetId: AtomicArgumentId,
    currentPath: AtomicArgumentId[],
    visited: Set<string>,
    allPaths: AtomicArgumentId[][],
    atomicArgumentRepo: IAtomicArgumentRepository
  ): Promise<void> {
    const idString = currentId.getValue();
    if (visited.has(idString)) return;

    visited.add(idString);
    currentPath.push(currentId);

    if (currentId.equals(targetId)) {
      allPaths.push([...currentPath]);
    } else {
      const connectionsResult = await this.findDirectConnections(currentId, atomicArgumentRepo);
      if (connectionsResult.isOk()) {
        const connections = connectionsResult.value;
        for (const child of connections.getChildren()) {
          await this.depthFirstSearch(
            child.getId(),
            targetId,
            currentPath,
            visited,
            allPaths,
            atomicArgumentRepo
          );
        }
      }
    }

    currentPath.pop();
    visited.delete(idString);
  }

  private isArgumentInTree(
    _argumentId: AtomicArgumentId,
    _atomicArgumentRepo: IAtomicArgumentRepository
  ): boolean {
    // Check if any node in this tree uses this argument
    for (const _nodeId of Array.from(this.nodeIds)) {
      // This would need to be implemented based on how nodes store argument references
      // For now, assume all arguments are in tree if we got here
    }
    return true;
  }

  toString(): string {
    const titlePart = this.title ? ` "${this.title}"` : '';
    const positionPart = `at ${this.position.toString()}`;
    const nodeCountPart = `(${this.nodeIds.size} nodes)`;

    return `Tree${titlePart} ${positionPart} ${nodeCountPart}`;
  }
}

// Tree-specific connection resolution classes
export class TreeConnectionMap {
  constructor(
    private readonly centralArgumentId: AtomicArgumentId,
    private readonly parents: AtomicArgument[],
    private readonly children: AtomicArgument[]
  ) {}

  getCentralArgumentId(): AtomicArgumentId {
    return this.centralArgumentId;
  }
  getParents(): readonly AtomicArgument[] {
    return this.parents;
  }
  getChildren(): readonly AtomicArgument[] {
    return this.children;
  }
}

export class TreeArgumentStructure {
  constructor(private readonly argumentIds: AtomicArgumentId[]) {}

  getAllArguments(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }
  getArgumentCount(): number {
    return this.argumentIds.length;
  }
}

export class TreePathCompleteArgument {
  constructor(
    private readonly argumentIds: AtomicArgumentId[],
    private readonly paths: AtomicArgumentId[][]
  ) {}

  getAllArguments(): readonly AtomicArgumentId[] {
    return this.argumentIds;
  }
  getAllPaths(): readonly AtomicArgumentId[][] {
    return this.paths;
  }
}

export class TreeOrderedSetReference {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly referenceType: 'premise' | 'conclusion',
    public readonly orderedSetId: OrderedSetId
  ) {}
}

export class TreeConnectionIntegrityReport {
  constructor(
    public readonly argumentId: AtomicArgumentId,
    public readonly issues: TreeConnectionIntegrityIssue[]
  ) {}

  hasIssues(): boolean {
    return this.issues.length > 0;
  }
}

export class TreeConnectionIntegrityIssue {
  constructor(
    public readonly type: string,
    public readonly description: string
  ) {}
}
