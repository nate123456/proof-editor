import type { Result } from 'neverthrow';

/**
 * Interface for different tree representation implementations to benchmark
 * Defines the contract that all tree representation approaches must implement
 */
export interface TreeRepresentation {
  /** Unique identifier for this representation approach */
  readonly name: string;

  /** Setup method to initialize the tree structure with test data */
  setup(nodes: TestNode[]): Promise<Result<void, BenchmarkError>>;

  /** Find immediate parent of a node */
  findParent(nodeId: string): Promise<Result<string | null, BenchmarkError>>;

  /** Find root node from any node in the tree */
  findRoot(nodeId: string): Promise<Result<string, BenchmarkError>>;

  /** Traverse statement flow following ordered set connections */
  traverseFlow(startId: string): Promise<Result<string[], BenchmarkError>>;

  /** Get all children of a node */
  getChildren(nodeId: string): Promise<Result<string[], BenchmarkError>>;

  /** Find path between two nodes */
  findPath(startId: string, endId: string): Promise<Result<string[], BenchmarkError>>;

  /** Add a new node with specified parent */
  addNode(nodeId: string, parentId: string | null): Promise<Result<void, BenchmarkError>>;

  /** Remove a node and update connections */
  removeNode(nodeId: string): Promise<Result<void, BenchmarkError>>;

  /** Get performance statistics about current state */
  getStats(): TreeRepresentationStats;

  /** Clean up resources */
  cleanup(): Promise<void>;
}

/**
 * Test node structure for benchmark scenarios
 */
export interface TestNode {
  id: string;
  parentId: string | null;
  argumentId: string;
  children: string[];
  position: number; // Position in parent's children (for ordering)
  orderedSetRefs: {
    premise?: string;
    conclusion?: string;
  };
  depth: number; // Depth in tree (0 = root)
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Performance statistics for a tree representation
 */
export interface TreeRepresentationStats {
  nodeCount: number;
  maxDepth: number;
  averageChildCount: number;
  memoryUsageBytes: number;
  indexSizeBytes?: number;
  cacheHitRate?: number;
}

/**
 * Benchmark-specific error type
 */
export class BenchmarkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BenchmarkError';
  }

  static operationFailed(operation: string, reason: string): BenchmarkError {
    return new BenchmarkError(`Operation '${operation}' failed: ${reason}`, 'OPERATION_FAILED', {
      operation,
      reason,
    });
  }

  static nodeNotFound(nodeId: string): BenchmarkError {
    return new BenchmarkError(`Node not found: ${nodeId}`, 'NODE_NOT_FOUND', { nodeId });
  }

  static invalidSetup(reason: string): BenchmarkError {
    return new BenchmarkError(`Invalid setup: ${reason}`, 'INVALID_SETUP', { reason });
  }

  static timeout(operation: string, timeoutMs: number): BenchmarkError {
    return new BenchmarkError(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      { operation, timeoutMs },
    );
  }
}

/**
 * Factory for creating tree representations
 */
export interface TreeRepresentationFactory {
  createRepresentation(config?: TreeRepresentationConfig): TreeRepresentation;
  getSupportedTypes(): string[];
}

/**
 * Configuration for tree representation
 */
export interface TreeRepresentationConfig {
  enableCaching?: boolean;
  maxCacheSize?: number;
  useIndexes?: boolean;
  optimizeFor?: 'memory' | 'speed' | 'balanced';
  debugMode?: boolean;
}
