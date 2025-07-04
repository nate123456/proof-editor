export interface CreateTreeCommand {
  documentId: string;
  position: {
    x: number;
    y: number;
  };
}

export interface MoveTreeCommand {
  documentId: string;
  treeId: string;
  position: {
    x: number;
    y: number;
  };
}

export interface CreateRootNodeCommand {
  documentId: string;
  treeId: string;
  argumentId: string;
}

export interface AttachNodeCommand {
  documentId: string;
  treeId: string;
  argumentId: string;
  parentNodeId: string;
  premisePosition: number;
  fromPosition?: number; // For multi-conclusion arguments
}

export interface DetachNodeCommand {
  documentId: string;
  treeId: string;
  nodeId: string;
}

// Branch creation - core workflow!
export interface CreateBranchFromSelectionCommand {
  documentId: string;
  sourceArgumentId: string;
  selectedText: string;
  position: 'premise' | 'conclusion';
  newTreeId?: string; // Optional: create in new tree
}

// Batch operations
export interface BatchCreateStatementsCommand {
  documentId: string;
  statements: Array<{
    content: string;
    externalId?: string; // For import tracking
  }>;
}

export interface BatchAttachNodesCommand {
  documentId: string;
  treeId: string;
  attachments: Array<{
    argumentId: string;
    parentNodeId: string;
    premisePosition: number;
  }>;
}
