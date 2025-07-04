/**
 * Shared types for query DTOs to avoid circular dependencies
 */

export interface OrderedSetDTO {
  id: string;
  statementIds: string[];
  usageCount: number;
  usedBy: Array<{
    argumentId: string;
    usage: 'premise' | 'conclusion';
  }>;
}

export interface AtomicArgumentDTO {
  id: string;
  premiseSetId: string | null;
  conclusionSetId: string | null;
  sideLabels?: {
    left?: string;
    right?: string;
  };
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

export interface ValidationErrorDTO {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    treeId?: string;
    nodeId?: string;
    argumentId?: string;
  };
}
