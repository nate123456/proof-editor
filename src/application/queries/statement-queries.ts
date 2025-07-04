export interface GetStatementQuery {
  documentId: string;
  statementId: string;
}

export interface ListStatementsQuery {
  documentId: string;
  filter?: {
    unused?: boolean; // Only unused statements
    searchText?: string; // Content contains text
  };
}

export interface StatementDTO {
  id: string;
  content: string;
  usageCount: number;
  createdAt: string;
  modifiedAt: string;
}

// Statement flow analysis
export interface TraceStatementFlowQuery {
  documentId: string;
  statementId: string;
  maxDepth?: number;
}

export interface GetStatementUsageQuery {
  documentId: string;
  statementId: string;
}

export interface StatementFlowDTO {
  statementId: string;
  usedIn: Array<{
    orderedSetId: string;
    argumentId: string;
    role: 'premise' | 'conclusion';
  }>;
  flowPaths: Array<{
    path: string[];
    distance: number;
  }>;
}
