import type { Result } from 'neverthrow';
import type { ProcessingError } from '../errors/DomainErrors';
import type { NodeId, TreeId } from '../shared/value-objects';

/**
 * Domain interface for graph-based tree traversal operations.
 * Abstracts graph library details from domain logic.
 */
export interface IGraphTraversalService {
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
}

export interface TreeMetrics {
  nodeCount: number;
  depth: number;
  breadth: number;
  leafCount: number;
  cycleCount: number;
}
