export interface GetBootstrapStatusQuery {
  documentId: string;
}

export interface GetBootstrapInstructionsQuery {
  documentId: string;
  context?: 'empty_document' | 'empty_argument' | 'first_connection';
}

export interface BootstrapStatusDTO {
  isInBootstrapState: boolean;
  hasEmptyArguments: boolean;
  hasStatements: boolean;
  hasConnections: boolean;
  nextSteps: string[];
  currentPhase: 'empty' | 'first_argument' | 'populating' | 'complete';
}

export interface BootstrapInstructionsDTO {
  instructions: string[];
  availableActions: string[];
  exampleCommands?: Array<{
    description: string;
    command: string;
  }>;
}
