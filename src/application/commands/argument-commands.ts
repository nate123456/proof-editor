export interface CreateAtomicArgumentCommand {
  documentId: string;
  premiseStatementIds: string[];
  conclusionStatementIds: string[];
  sideLabel?: {
    left?: string;
    right?: string;
  };
}

export interface UpdateAtomicArgumentCommand {
  documentId: string;
  argumentId: string;
  premiseStatementIds?: string[];
  conclusionStatementIds?: string[];
}

export interface UpdateArgumentSideLabelsCommand {
  documentId: string;
  argumentId: string;
  sideLabels: {
    left?: string;
    right?: string;
  };
}

export interface DeleteAtomicArgumentCommand {
  documentId: string;
  argumentId: string;
}
