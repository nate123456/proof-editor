export interface RunCustomValidationScriptCommand {
  documentId: string;
  scriptContent: string;
  scriptId?: string;
}

export interface ValidateProofPathCommand {
  documentId: string;
  fromNodeId: string;
  toNodeId: string;
}
