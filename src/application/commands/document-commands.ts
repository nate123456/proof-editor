export interface CreateDocumentCommand {
  initialStatement?: string;
}

export interface LoadDocumentCommand {
  path: string;
}

export interface SaveDocumentCommand {
  documentId: string;
  path?: string; // Optional for save-as
}

export interface ImportDocumentCommand {
  yamlContent: string;
  path?: string;
}

export interface ExportDocumentCommand {
  documentId: string;
  format: 'yaml' | 'json' | 'svg';
}

export interface ValidateDocumentCommand {
  documentId: string;
  includeCustomScripts?: boolean;
}
