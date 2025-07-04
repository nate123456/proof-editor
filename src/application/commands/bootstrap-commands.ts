// Bootstrap commands for initial document state
export interface InitializeEmptyDocumentCommand {
  documentId: string;
}

export interface CreateBootstrapArgumentCommand {
  documentId: string;
  treeId: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface PopulateEmptyArgumentCommand {
  documentId: string;
  argumentId: string;
  premiseContents: string[];
  conclusionContents: string[];
  sideLabels?: {
    left?: string;
    right?: string;
  };
}
