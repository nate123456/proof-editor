// Commands are simple data structures - no behavior
export interface CreateStatementCommand {
  documentId: string;
  content: string;
}

export interface UpdateStatementCommand {
  documentId: string;
  statementId: string;
  content: string;
}

export interface DeleteStatementCommand {
  documentId: string;
  statementId: string;
}

export interface MoveStatementCommand {
  documentId: string;
  statementId: string;
  sourceOrderedSetId: string;
  targetOrderedSetId: string;
  targetPosition?: number; // If not provided, append to end
}
