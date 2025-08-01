import { DirectedGraph } from 'graphology';
import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';
import type { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import type { Node } from '../../domain/entities/Node.js';
import type { Tree } from '../../domain/entities/Tree.js';
import { ProcessingError } from '../../domain/errors/DomainErrors.js';
import type { IAtomicArgumentRepository } from '../../domain/repositories/IAtomicArgumentRepository.js';
import type { INodeRepository } from '../../domain/repositories/INodeRepository.js';
import { AtomicArgumentConnectionService } from '../../domain/services/AtomicArgumentConnectionService.js';
import type {
  GraphPerformanceMetrics,
  IGraphTraversalService,
  TreeMetrics,
} from '../../domain/services/IGraphTraversalService.js';
import { NodeId, type TreeId } from '../../domain/shared/value-objects/index.js';

@injectable()
export class ProofGraphAdapter implements IGraphTraversalService {
  private readonly graph: DirectedGraph;
  private readonly performanceMetrics: GraphPerformanceMetrics;

  constructor(
    private readonly nodeRepository: INodeRepository,
    private readonly argumentRepository: IAtomicArgumentRepository,
  ) {
    this.graph = new DirectedGraph();
    this.performanceMetrics = {
      buildTime: 0,
      nodeCount: 0,
      edgeCount: 0,
      lastBuildTimestamp: 0,
      memoryUsage: 0,
      operationCounts: {
        pathFinds: 0,
        cycleDetections: 0,
        subtreeQueries: 0,
        connectivityChecks: 0,
      },
    };
  }

  async buildGraphFromTree(tree: Tree): Promise<Result<void, ProcessingError>> {
    const startTime = performance.now();
    this.graph.clear();

    const nodeLoadingResult = await this.loadNodesAndArguments(tree);
    if (nodeLoadingResult.isErr()) {
      return err(nodeLoadingResult.error);
    }

    const { nodeMap, argumentMap } = nodeLoadingResult.value;

    this.addNodesToGraph(nodeMap, argumentMap, tree.getId().getValue());
    this.addParentChildEdges(nodeMap);
    this.addStatementFlowEdges(nodeMap, argumentMap);

    const endTime = performance.now();
    this.performanceMetrics.buildTime = endTime - startTime;
    this.performanceMetrics.nodeCount = this.graph.order;
    this.performanceMetrics.edgeCount = this.graph.size;
    this.performanceMetrics.lastBuildTimestamp = Date.now();

    return ok(undefined);
  }

  findPath(fromNodeId: NodeId, toNodeId: NodeId): Result<NodeId[], ProcessingError> {
    this.performanceMetrics.operationCounts.pathFinds++;

    if (!this.graph.hasNode(fromNodeId.getValue()) || !this.graph.hasNode(toNodeId.getValue())) {
      return ok([]);
    }

    if (fromNodeId.getValue() === toNodeId.getValue()) {
      return ok([fromNodeId]);
    }

    try {
      const path = this.findShortestPath(fromNodeId.getValue(), toNodeId.getValue());
      const nodeIds = this.convertPathToNodeIds(path);
      return ok(nodeIds);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to find path: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  getSubtree(
    rootNodeId: NodeId,
    maxDepth?: number,
  ): Result<Map<string, { depth: number; node: NodeId }>, ProcessingError> {
    this.performanceMetrics.operationCounts.subtreeQueries++;

    if (!this.graph.hasNode(rootNodeId.getValue())) {
      return ok(new Map());
    }

    const subtree = new Map<string, { depth: number; node: NodeId }>();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: rootNodeId.getValue(), depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.nodeId)) continue;

      if (maxDepth !== undefined && current.depth > maxDepth) continue;

      visited.add(current.nodeId);
      const nodeIdResult = NodeId.create(current.nodeId);
      if (nodeIdResult.isOk()) {
        subtree.set(current.nodeId, { depth: current.depth, node: nodeIdResult.value });
      }

      this.addChildrenToQueue(current.nodeId, current.depth, queue, visited);
    }

    return ok(subtree);
  }

  detectCycles(_treeId: TreeId): Result<boolean, ProcessingError> {
    this.performanceMetrics.operationCounts.cycleDetections++;

    try {
      return ok(this.hasCycles());
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to detect cycles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private hasCycles(): boolean {
    const parentChildGraph = this.createParentChildGraph();
    return this.hasCyclesInGraph(parentChildGraph);
  }

  private createParentChildGraph(): DirectedGraph {
    const parentChildGraph = new DirectedGraph();

    this.copyNodesToGraph(parentChildGraph);
    this.copyParentChildEdgesToGraph(parentChildGraph);

    return parentChildGraph;
  }

  private copyNodesToGraph(targetGraph: DirectedGraph): void {
    for (const node of this.graph.nodes()) {
      targetGraph.addNode(node);
    }
  }

  private copyParentChildEdgesToGraph(targetGraph: DirectedGraph): void {
    for (const edge of this.graph.edges()) {
      const attrs = this.graph.getEdgeAttributes(edge);
      if (attrs.type === 'parent-child') {
        targetGraph.addDirectedEdgeWithKey(edge, this.graph.source(edge), this.graph.target(edge));
      }
    }
  }

  findLogicalComponents(): NodeId[][] {
    const components: NodeId[][] = [];
    const visited = new Set<string>();

    for (const node of this.graph.nodes()) {
      if (!visited.has(node)) {
        const component = this.exploreLogicalComponent(node, visited);
        if (component.length > 0) {
          components.push(component);
        }
      }
    }

    return components;
  }

  getTreeMetrics(treeId: TreeId): Result<TreeMetrics, ProcessingError> {
    try {
      const metrics = this.computeTreeMetrics(treeId.getValue());
      return ok({
        ...metrics,
        cycleCount: this.hasCycles() ? 1 : 0,
      });
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to compute tree metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private computeTreeMetrics(treeId: string): TreeMetrics {
    const treeNodes = this.getTreeNodes(treeId);
    if (treeNodes.length === 0) {
      return this.createEmptyMetrics();
    }

    const roots = this.findRootNodes(treeNodes);
    const structureAnalysis = this.analyzeTreeStructure(roots);

    return {
      depth: structureAnalysis.maxDepth,
      breadth: structureAnalysis.maxBreadth,
      nodeCount: treeNodes.length,
      leafCount: structureAnalysis.leafCount,
      cycleCount: 0,
    };
  }

  private getTreeNodes(treeId: string): string[] {
    return this.graph.filterNodes((_, attrs) => attrs.treeId === treeId);
  }

  private createEmptyMetrics(): TreeMetrics {
    return { depth: 0, breadth: 0, nodeCount: 0, leafCount: 0, cycleCount: 0 };
  }

  areNodesConnected(nodeId1: NodeId, nodeId2: NodeId): Result<boolean, ProcessingError> {
    this.performanceMetrics.operationCounts.connectivityChecks++;

    const pathResult = this.findPath(nodeId1, nodeId2);
    return pathResult.map((path) => path.length > 0);
  }

  findLeafNodes(treeId: TreeId): Result<NodeId[], ProcessingError> {
    try {
      const treeNodes = this.graph.filterNodes((_, attrs) => attrs.treeId === treeId.getValue());
      const leafNodes: NodeId[] = [];

      for (const nodeId of treeNodes) {
        const hasChildren = this.graph.inEdges(nodeId).some((edge) => {
          const attrs = this.graph.getEdgeAttributes(edge);
          return attrs.type === 'parent-child';
        });

        if (!hasChildren) {
          const nodeIdResult = NodeId.create(nodeId);
          if (nodeIdResult.isOk()) {
            leafNodes.push(nodeIdResult.value);
          }
        }
      }

      return ok(leafNodes);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to find leaf nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  getNodeDepth(nodeId: NodeId): Result<number, ProcessingError> {
    try {
      if (!this.graph.hasNode(nodeId.getValue())) {
        return err(new ProcessingError(`Node ${nodeId.getValue()} not found in graph`));
      }

      const nodeAttrs = this.graph.getNodeAttributes(nodeId.getValue());
      if (nodeAttrs.isRoot) {
        return ok(0);
      }

      return this.calculateDepthToRoot(nodeId.getValue());
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to get node depth: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private calculateDepthToRoot(nodeId: string): Result<number, ProcessingError> {
    let depth = 0;
    let currentNodeId = nodeId;
    const maxIterations = 1000;

    while (!this.graph.getNodeAttributes(currentNodeId).isRoot) {
      const parentEdge = this.findParentEdge(currentNodeId);
      if (!parentEdge) {
        break;
      }

      currentNodeId = this.graph.target(parentEdge);
      depth++;

      if (depth > maxIterations) {
        return err(new ProcessingError('Depth calculation exceeded maximum iterations'));
      }
    }

    return ok(depth);
  }

  findPaths(
    nodePairs: Array<{ from: NodeId; to: NodeId }>,
  ): Result<Map<string, NodeId[]>, ProcessingError> {
    try {
      const results = new Map<string, NodeId[]>();

      for (const pair of nodePairs) {
        const pathResult = this.findPath(pair.from, pair.to);
        if (pathResult.isErr()) {
          return err(pathResult.error);
        }

        const pairKey = `${pair.from.getValue()}-${pair.to.getValue()}`;
        results.set(pairKey, pathResult.value);
      }

      return ok(results);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to find paths: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  areNodesConnectedBatch(
    nodePairs: Array<{ nodeId1: NodeId; nodeId2: NodeId }>,
  ): Result<Map<string, boolean>, ProcessingError> {
    try {
      const results = new Map<string, boolean>();

      for (const pair of nodePairs) {
        const connectivityResult = this.areNodesConnected(pair.nodeId1, pair.nodeId2);
        if (connectivityResult.isErr()) {
          return err(connectivityResult.error);
        }

        const pairKey = `${pair.nodeId1.getValue()}-${pair.nodeId2.getValue()}`;
        results.set(pairKey, connectivityResult.value);
      }

      return ok(results);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to check connectivity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  getPerformanceMetrics(): Result<GraphPerformanceMetrics, ProcessingError> {
    try {
      const currentMemory = process.memoryUsage?.().heapUsed || 0;

      return ok({
        ...this.performanceMetrics,
        memoryUsage: currentMemory,
      });
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to get performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async updateNode(nodeId: NodeId, tree: Tree): Promise<Result<void, ProcessingError>> {
    try {
      const nodeIdValue = nodeId.getValue();

      if (!this.graph.hasNode(nodeIdValue)) {
        return err(new ProcessingError(`Node ${nodeIdValue} not found in graph`));
      }

      const nodeResult = await this.nodeRepository.findById(nodeId);
      if (nodeResult.isErr()) {
        return err(
          new ProcessingError(`Failed to load node ${nodeIdValue}: ${nodeResult.error.message}`),
        );
      }

      const node = nodeResult.value;
      const argumentResult = await this.argumentRepository.findById(node.getArgumentId());
      if (argumentResult.isErr()) {
        return err(
          new ProcessingError(
            `Failed to load argument for node ${nodeIdValue}: ${argumentResult.error.message}`,
          ),
        );
      }

      const argument = argumentResult.value;

      this.graph.mergeNodeAttributes(nodeIdValue, {
        nodeId: nodeIdValue,
        argumentId: node.getArgumentId().getValue(),
        isRoot: node.isRoot(),
        premises: argument.getPremises().map((s) => s.getId().getValue()),
        conclusions: argument.getConclusions().map((s) => s.getId().getValue()),
        treeId: tree.getId().getValue(),
        position: undefined,
      });

      this.updateNodeEdges(nodeIdValue, node, argument);

      return ok(undefined);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to update node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  removeNode(nodeId: NodeId): Result<void, ProcessingError> {
    try {
      const nodeIdValue = nodeId.getValue();

      if (!this.graph.hasNode(nodeIdValue)) {
        return ok(undefined);
      }

      this.graph.dropNode(nodeIdValue);
      return ok(undefined);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to remove node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  invalidateCache(treeId?: TreeId): Result<void, ProcessingError> {
    try {
      if (treeId) {
        const treeNodes = this.graph.filterNodes((_, attrs) => attrs.treeId === treeId.getValue());
        for (const nodeId of treeNodes) {
          this.graph.dropNode(nodeId);
        }
      } else {
        this.graph.clear();
      }

      this.performanceMetrics.lastBuildTimestamp = 0;
      this.performanceMetrics.nodeCount = this.graph.order;
      this.performanceMetrics.edgeCount = this.graph.size;

      return ok(undefined);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to invalidate cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  hasNode(nodeId: NodeId): boolean {
    return this.graph.hasNode(nodeId.getValue());
  }

  getDirectNeighbors(nodeId: NodeId): Result<NodeId[], ProcessingError> {
    try {
      const nodeIdValue = nodeId.getValue();

      if (!this.graph.hasNode(nodeIdValue)) {
        return ok([]);
      }

      const neighbors = new Set<string>();

      for (const edge of this.graph.outEdges(nodeIdValue)) {
        neighbors.add(this.graph.target(edge));
      }

      for (const edge of this.graph.inEdges(nodeIdValue)) {
        neighbors.add(this.graph.source(edge));
      }

      const neighborIds = Array.from(neighbors).map((neighbor) => {
        const neighborIdResult = NodeId.create(neighbor);
        if (neighborIdResult.isErr()) {
          throw new Error(`Invalid neighbor node ID: ${neighbor}`);
        }
        return neighborIdResult.value;
      });

      return ok(neighborIds);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to get direct neighbors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  findNodesInDepthRange(
    startNodeId: NodeId,
    minDepth: number,
    maxDepth: number,
  ): Result<NodeId[], ProcessingError> {
    try {
      if (minDepth < 0 || maxDepth < 0 || minDepth > maxDepth) {
        return err(
          new ProcessingError(
            'Invalid depth range: minDepth and maxDepth must be non-negative and minDepth <= maxDepth',
          ),
        );
      }

      const startNodeValue = startNodeId.getValue();

      if (!this.graph.hasNode(startNodeValue)) {
        return ok([]);
      }

      const nodesInRange: NodeId[] = [];
      const visited = new Set<string>();
      const queue: Array<{ nodeId: string; depth: number }> = [
        { nodeId: startNodeValue, depth: 0 },
      ];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current.nodeId)) continue;

        if (current.depth > maxDepth) continue;

        visited.add(current.nodeId);

        if (current.depth >= minDepth && current.depth <= maxDepth) {
          const nodeIdResult = NodeId.create(current.nodeId);
          if (nodeIdResult.isOk()) {
            nodesInRange.push(nodeIdResult.value);
          }
        }

        if (current.depth < maxDepth) {
          this.addChildrenToQueue(current.nodeId, current.depth, queue, visited);
        }
      }

      return ok(nodesInRange);
    } catch (error) {
      return err(
        new ProcessingError(
          `Failed to find nodes in depth range: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private findParentEdge(nodeId: string): string | null {
    const parentEdges = this.graph.outEdges(nodeId).filter((edge) => {
      const attrs = this.graph.getEdgeAttributes(edge);
      return attrs.type === 'parent-child';
    });

    return parentEdges.length > 0 ? (parentEdges[0] as string) : null;
  }

  private addStatementFlowEdges(
    nodeMap: Map<string, Node>,
    argumentMap: Map<string, AtomicArgument>,
  ): void {
    const nodeList = Array.from(nodeMap.entries());

    for (let i = 0; i < nodeList.length; i++) {
      for (let j = 0; j < nodeList.length; j++) {
        if (i === j) continue;

        const [nodeId1, node1] = nodeList[i];
        const [nodeId2, node2] = nodeList[j];

        const arg1 = argumentMap.get(node1.getArgumentId().getValue());
        const arg2 = argumentMap.get(node2.getArgumentId().getValue());

        if (!arg1 || !arg2) continue;

        this.addStatementFlowEdgesBetweenArguments(nodeId1, nodeId2, arg1, arg2);
      }
    }
  }

  private addStatementFlowEdgesBetweenArguments(
    nodeId1: string,
    nodeId2: string,
    arg1: AtomicArgument,
    arg2: AtomicArgument,
  ): void {
    const connections = AtomicArgumentConnectionService.findConnectionsTo(arg1, arg2);

    for (const connection of connections) {
      const edgeKey = `${nodeId1}-${nodeId2}-${connection.statement.getId().getValue()}-${connection.fromConclusionPosition}-${connection.toPremisePosition.getValue()}`;

      if (!this.graph.hasEdge(edgeKey) && !this.graph.hasEdge(nodeId1, nodeId2)) {
        this.graph.addDirectedEdgeWithKey(edgeKey, nodeId1, nodeId2, {
          type: 'statement-flow',
          statementId: connection.statement.getId().getValue(),
          fromConclusionPosition: connection.fromConclusionPosition,
          toPremisePosition: connection.toPremisePosition.getValue(),
        });
      }
    }
  }

  private findShortestPath(from: string, to: string): string[] {
    const queue: string[][] = [[from]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) continue;

      const current = path[path.length - 1];
      if (!current) continue;

      if (current === to) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.getStatementFlowNeighbors(current);
      this.addUnvisitedNeighborsToQueue(neighbors, visited, path, queue);
    }

    return [];
  }

  private getStatementFlowNeighbors(node: string): Set<string> {
    const neighbors = new Set<string>();

    for (const edge of this.graph.outEdges(node)) {
      const attrs = this.graph.getEdgeAttributes(edge);
      if (attrs.type === 'statement-flow') {
        neighbors.add(this.graph.target(edge));
      }
    }

    for (const edge of this.graph.inEdges(node)) {
      const attrs = this.graph.getEdgeAttributes(edge);
      if (attrs.type === 'statement-flow') {
        neighbors.add(this.graph.source(edge));
      }
    }

    return neighbors;
  }

  private addUnvisitedNeighborsToQueue(
    neighbors: Set<string>,
    visited: Set<string>,
    currentPath: string[],
    queue: string[][],
  ): void {
    for (const neighbor of Array.from(neighbors)) {
      if (!visited.has(neighbor)) {
        queue.push([...currentPath, neighbor]);
      }
    }
  }

  private hasCyclesInGraph(graph: DirectedGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      for (const edge of graph.outEdges(node)) {
        const neighbor = graph.target(edge);

        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.nodes()) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) {
          return true;
        }
      }
    }

    return false;
  }

  private exploreLogicalComponent(startNode: string, visited: Set<string>): NodeId[] {
    const component: NodeId[] = [];
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;

      this.processCurrentNode(current, visited, component);
      this.addSharedOrderedSetNeighborsToQueue(current, visited, queue);
    }

    return component;
  }

  private processCurrentNode(current: string, visited: Set<string>, component: NodeId[]): void {
    visited.add(current);
    const nodeIdResult = NodeId.create(current);
    if (nodeIdResult.isOk()) {
      component.push(nodeIdResult.value);
    }
  }

  private addSharedOrderedSetNeighborsToQueue(
    current: string,
    visited: Set<string>,
    queue: string[],
  ): void {
    for (const edge of this.graph.edges(current)) {
      const attrs = this.graph.getEdgeAttributes(edge);
      if (attrs.type === 'statement-flow') {
        const neighbor = this.graph.opposite(current, edge);
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  private async loadNodesAndArguments(
    tree: Tree,
  ): Promise<
    Result<
      { nodeMap: Map<string, Node>; argumentMap: Map<string, AtomicArgument> },
      ProcessingError
    >
  > {
    const nodeIds = tree.getNodeIds();
    const nodeMap = new Map<string, Node>();
    const argumentMap = new Map<string, AtomicArgument>();

    for (const nodeId of nodeIds) {
      const nodeResult = await this.nodeRepository.findById(nodeId);
      if (nodeResult.isErr()) {
        return err(
          new ProcessingError(`Node ${nodeId.getValue()} not found: ${nodeResult.error.message}`),
        );
      }
      const node = nodeResult.value;
      nodeMap.set(nodeId.getValue(), node);

      const argumentResult = await this.argumentRepository.findById(node.getArgumentId());
      if (argumentResult.isErr()) {
        return err(
          new ProcessingError(
            `Argument ${node.getArgumentId().getValue()} not found: ${argumentResult.error.message}`,
          ),
        );
      }
      const argument = argumentResult.value;
      argumentMap.set(node.getArgumentId().getValue(), argument);
    }

    return ok({ nodeMap, argumentMap });
  }

  private addNodesToGraph(
    nodeMap: Map<string, Node>,
    argumentMap: Map<string, AtomicArgument>,
    treeId: string,
  ): void {
    for (const [nodeIdStr, node] of Array.from(nodeMap)) {
      const argument = argumentMap.get(node.getArgumentId().getValue());
      if (!argument) continue;

      this.graph.addNode(nodeIdStr, {
        nodeId: nodeIdStr,
        argumentId: node.getArgumentId().getValue(),
        isRoot: node.isRoot(),
        premises: argument.getPremises().map((s) => s.getId().getValue()),
        conclusions: argument.getConclusions().map((s) => s.getId().getValue()),
        treeId,
        position: undefined,
      });
    }
  }

  private addParentChildEdges(nodeMap: Map<string, Node>): void {
    for (const [nodeIdStr, node] of Array.from(nodeMap)) {
      if (!node.isChild()) continue;

      const parentId = node.getParentNodeId();
      if (!parentId || !nodeMap.has(parentId.getValue())) continue;

      const attachment = node.getAttachment();
      if (!attachment) continue;

      this.graph.addDirectedEdge(nodeIdStr, parentId.getValue(), {
        type: 'parent-child',
        premisePosition: attachment.getPremisePosition(),
        fromPosition: attachment.getFromPosition(),
      });
    }
  }

  private convertPathToNodeIds(path: string[]): NodeId[] {
    return path.map((nodeIdStr) => {
      const nodeIdResult = NodeId.create(nodeIdStr);
      if (nodeIdResult.isErr()) {
        throw new Error(`Invalid node ID: ${nodeIdStr}`);
      }
      return nodeIdResult.value;
    });
  }

  private updateNodeEdges(nodeId: string, node: Node, _argument: AtomicArgument): void {
    const existingEdges = this.graph.edges(nodeId);
    for (const edge of existingEdges) {
      this.graph.dropEdge(edge);
    }

    if (node.isChild()) {
      const parentId = node.getParentNodeId();
      if (parentId && this.graph.hasNode(parentId.getValue())) {
        const attachment = node.getAttachment();
        if (attachment) {
          this.graph.addDirectedEdge(nodeId, parentId.getValue(), {
            type: 'parent-child',
            premisePosition: attachment.getPremisePosition(),
            fromPosition: attachment.getFromPosition(),
          });
        }
      }
    }
  }

  private addChildrenToQueue(
    nodeId: string,
    currentDepth: number,
    queue: Array<{ nodeId: string; depth: number }>,
    visited: Set<string>,
  ): void {
    const incomingEdges = this.graph.inEdges(nodeId);
    for (const edge of incomingEdges) {
      const edgeAttrs = this.graph.getEdgeAttributes(edge);
      if (edgeAttrs.type === 'parent-child') {
        const childId = this.graph.source(edge);
        if (!visited.has(childId)) {
          queue.push({ nodeId: childId, depth: currentDepth + 1 });
        }
      }
    }
  }

  private findRootNodes(treeNodes: string[]): string[] {
    return treeNodes.filter((nodeId) => {
      const attrs = this.graph.getNodeAttributes(nodeId);
      return attrs.isRoot;
    });
  }

  private analyzeTreeStructure(roots: string[]): {
    maxDepth: number;
    maxBreadth: number;
    leafCount: number;
  } {
    let maxDepth = 0;
    let maxBreadth = 0;
    let leafCount = 0;

    for (const root of roots) {
      const analysis = this.analyzeSubtreeFromRoot(root);
      maxDepth = Math.max(maxDepth, analysis.depth);
      maxBreadth = Math.max(maxBreadth, analysis.breadth);
      leafCount += analysis.leafCount;
    }

    return { maxDepth, maxBreadth, leafCount };
  }

  private analyzeSubtreeFromRoot(root: string): {
    depth: number;
    breadth: number;
    leafCount: number;
  } {
    const depths = new Map<string, number>();
    this.calculateDepths(root, 0, depths);

    const depth = Math.max(...Array.from(depths.values()));
    const breadth = this.calculateBreadthFromDepths(depths);
    const leafCount = this.countLeavesInDepthMap(depths);

    return { depth, breadth, leafCount };
  }

  private calculateBreadthFromDepths(depths: Map<string, number>): number {
    const levelCounts = new Map<number, number>();
    for (const [_, depth] of Array.from(depths)) {
      levelCounts.set(depth, (levelCounts.get(depth) || 0) + 1);
    }
    return Math.max(...Array.from(levelCounts.values()));
  }

  private countLeavesInDepthMap(depths: Map<string, number>): number {
    let leafCount = 0;
    for (const node of Array.from(depths.keys())) {
      if (this.isLeafNode(node)) {
        leafCount++;
      }
    }
    return leafCount;
  }

  private isLeafNode(node: string): boolean {
    return (
      this.graph.inDegree(node) === 0 ||
      !this.graph
        .inEdges(node)
        .some((edge) => this.graph.getEdgeAttributes(edge).type === 'parent-child')
    );
  }

  private calculateDepths(node: string, currentDepth: number, depths: Map<string, number>): void {
    depths.set(node, currentDepth);

    for (const edge of this.graph.inEdges(node)) {
      const attrs = this.graph.getEdgeAttributes(edge);
      if (attrs.type === 'parent-child') {
        const child = this.graph.source(edge);
        const childDepth = depths.get(child);
        if (!depths.has(child) || (childDepth !== undefined && childDepth < currentDepth + 1)) {
          this.calculateDepths(child, currentDepth + 1, depths);
        }
      }
    }
  }
}

export interface GraphNodeAttributes {
  nodeId: string;
  argumentId: string;
  isRoot: boolean;
  premises: string[];
  conclusions: string[];
  treeId: string;
  position?: { x: number; y: number };
}

export interface GraphEdgeAttributes {
  type: 'parent-child' | 'statement-flow';
  premisePosition?: number;
  fromPosition?: number;
  conclusionPosition?: number;
  statementId?: string;
  fromConclusionPosition?: number;
  toPremisePosition?: number;
}
