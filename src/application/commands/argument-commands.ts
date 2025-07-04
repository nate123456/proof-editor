export interface CreateAtomicArgumentCommand {
  documentId: string;
  premiseStatementIds: string[]; // Will create/find OrderedSet
  conclusionStatementIds: string[]; // Will create/find OrderedSet
  sideLabel?: {
    left?: string;
    right?: string;
  };
}

export interface UpdateArgumentSideLabelsCommand {
  documentId: string;
  argumentId: string;
  sideLabels: {
    left?: string;
    right?: string;
  };
}
