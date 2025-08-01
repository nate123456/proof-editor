import type { Result } from 'neverthrow';
import type { Tree } from '../entities/Tree';
import type { ProcessingError } from '../errors/DomainErrors';
import type { NodeId, TreeId } from '../shared/value-objects';

/**
 * Domain interface for graph-based tree traversal operations.
 * Abstracts graph library details from domain logic.
 * Designed for LSP real-time requirements with performance optimization support.
 */
export interface IGraphTraversalService {
  /**
   * Build internal graph representation from tree entity.
   * Essential for LSP operations and document synchronization.
   */
  buildGraphFromTree(tree: Tree): Promise<Result<void, ProcessingError>>;

  /**
   * Find shortest path between two nodes in a tree.
   */
  findPath(fromNodeId: NodeId, toNodeId: NodeId): Result<NodeId[], ProcessingError>;

  /**
   * Detect cycles in tree structure.
   */
  detectCycles(treeId: TreeId): Result<boolean, ProcessingError>;

  /**
   * Get subtree starting from a specific node.
   */
  getSubtree(
    rootNodeId: NodeId,
    maxDepth?: number,
  ): Result<Map<string, { depth: number; node: NodeId }>, ProcessingError>;

  /**
   * Compute tree metrics for analysis.
   */
  getTreeMetrics(treeId: TreeId): Result<TreeMetrics, ProcessingError>;

  /**
   * Check if two nodes are connected via any path.
   */
  areNodesConnected(nodeId1: NodeId, nodeId2: NodeId): Result<boolean, ProcessingError>;

  /**
   * Find all leaf nodes in a tree.
   */
  findLeafNodes(treeId: TreeId): Result<NodeId[], ProcessingError>;

  /**
   * Get the depth of a specific node in the tree.
   */
  getNodeDepth(nodeId: NodeId): Result<number, ProcessingError>;

  /**
   * Find logical components (connected argument groups).
   * Useful for LSP analysis and navigation features.
   */
  findLogicalComponents(): NodeId[][];

  /**
   * Batch path finding for multiple node pairs.
   * Optimized for LSP real-time requirements.
   */
  findPaths(
    nodePairs: Array<{ from: NodeId; to: NodeId }>,
  ): Result<Map<string, NodeId[]>, ProcessingError>;

  /**
   * Check connectivity for multiple node pairs efficiently.
   * Batch operation for performance optimization.
   */
  areNodesConnectedBatch(
    nodePairs: Array<{ nodeId1: NodeId; nodeId2: NodeId }>,
  ): Result<Map<string, boolean>, ProcessingError>;

  /**
   * Get performance metrics for monitoring and optimization.
   * Supports future caching and incremental update strategies.
   */
  getPerformanceMetrics(): Result<GraphPerformanceMetrics, ProcessingError>;

  /**
   * Update graph representation incrementally when a single node changes.
   * Optimized for LSP real-time requirements where only parts of the tree change.
   */
  updateNode(nodeId: NodeId, tree: Tree): Promise<Result<void, ProcessingError>>;

  /**
   * Remove a node from the graph representation.
   * Useful for incremental updates in LSP scenarios.
   */
  removeNode(nodeId: NodeId): Result<void, ProcessingError>;

  /**
   * Invalidate cached data for specific tree or entire graph.
   * Supports cache management strategies for performance optimization.
   */
  invalidateCache(treeId?: TreeId): Result<void, ProcessingError>;

  /**
   * Check if the graph contains a specific node.
   * Fast operation for LSP real-time validation.
   */
  hasNode(nodeId: NodeId): boolean;

  /**
   * Get immediate neighbors of a node (direct connections only).
   * Optimized for LSP hover and navigation features.
   */
  getDirectNeighbors(nodeId: NodeId): Result<NodeId[], ProcessingError>;

  /**
   * Find nodes within a specific depth range from a starting node.
   * Useful for LSP context and scope analysis.
   */
  findNodesInDepthRange(
    startNodeId: NodeId,
    minDepth: number,
    maxDepth: number,
  ): Result<NodeId[], ProcessingError>;
}

export interface TreeMetrics {
  nodeCount: number;
  depth: number;
  breadth: number;
  leafCount: number;
  cycleCount: number;
}

export interface GraphPerformanceMetrics {
  buildTime: number;
  nodeCount: number;
  edgeCount: number;
  lastBuildTimestamp: number;
  memoryUsage: number;
  operationCounts: {
    pathFinds: number;
    cycleDetections: number;
    subtreeQueries: number;
    connectivityChecks: number;
  };
}
