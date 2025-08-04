import type { AtomicArgumentDTO } from './shared-types.js';

export interface GetTreeQuery {
  documentId: string;
  treeId: string;
}

export interface ListTreesQuery {
  documentId: string;
}

export interface GetTreeStructureQuery {
  documentId: string;
  treeId: string;
  includeArguments?: boolean; // Include argument details
}

export interface TreeDTO {
  id: string;
  position: {
    x: number;
    y: number;
  };
  bounds?: {
    width: number;
    height: number;
  };
  nodeCount: number;
  rootNodeIds: string[];
}

export interface TreeStructureDTO {
  treeId: string;
  nodes: TreeNodeDTO[];
  connections: NodeConnectionDTO[];
  depth: number;
  breadth: number;
}

// Tree analysis queries
export interface GetTreeDepthQuery {
  documentId: string;
  treeId: string;
}

export interface GetTreeBranchesQuery {
  documentId: string;
  treeId: string;
  fromNodeId: string;
}

export interface FindPathBetweenNodesQuery {
  documentId: string;
  treeId: string;
  fromNodeId: string;
  toNodeId: string;
  includeArguments?: boolean;
}

export interface GetSubtreeQuery {
  documentId: string;
  treeId: string;
  rootNodeId: string;
  maxDepth?: number;
  includeArguments?: boolean;
}

export interface TreeNodeDTO {
  nodeId: string;
  argumentId: string;
  position?: {
    // Computed position for rendering
    x: number;
    y: number;
  };
  isRoot: boolean;
  argument?: AtomicArgumentDTO; // If includeArguments=true
}

export interface NodeConnectionDTO {
  fromNodeId: string;
  toNodeId: string;
  premisePosition: number;
  fromPosition?: number;
}
