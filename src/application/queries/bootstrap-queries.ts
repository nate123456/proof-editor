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

// Type guards and validation utilities for runtime type checking
export function isGetBootstrapStatusQuery(obj: unknown): obj is GetBootstrapStatusQuery {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'documentId' in obj &&
    typeof (obj as Record<string, unknown>).documentId === 'string' &&
    ((obj as Record<string, unknown>).documentId as string).length > 0
  );
}

export function isGetBootstrapInstructionsQuery(
  obj: unknown,
): obj is GetBootstrapInstructionsQuery {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const query = obj as Record<string, unknown>;
  const hasValidDocumentId =
    'documentId' in query && typeof query.documentId === 'string' && query.documentId.length > 0;

  if (!hasValidDocumentId) {
    return false;
  }

  if ('context' in query) {
    const validContexts = ['empty_document', 'empty_argument', 'first_connection'];
    return validContexts.includes(query.context as string);
  }

  return true;
}

export function isValidBootstrapPhase(
  phase: unknown,
): phase is 'empty' | 'first_argument' | 'populating' | 'complete' {
  const validPhases = ['empty', 'first_argument', 'populating', 'complete'];
  return typeof phase === 'string' && validPhases.includes(phase);
}

export function isBootstrapStatusDTO(obj: unknown): obj is BootstrapStatusDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  return (
    typeof dto.isInBootstrapState === 'boolean' &&
    typeof dto.hasEmptyArguments === 'boolean' &&
    typeof dto.hasStatements === 'boolean' &&
    typeof dto.hasConnections === 'boolean' &&
    Array.isArray(dto.nextSteps) &&
    dto.nextSteps.every((step: unknown) => typeof step === 'string') &&
    isValidBootstrapPhase(dto.currentPhase)
  );
}

export function isBootstrapInstructionsDTO(obj: unknown): obj is BootstrapInstructionsDTO {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dto = obj as Record<string, unknown>;
  const hasValidInstructions =
    Array.isArray(dto.instructions) &&
    dto.instructions.every((instruction: unknown) => typeof instruction === 'string');

  const hasValidActions =
    Array.isArray(dto.availableActions) &&
    dto.availableActions.every((action: unknown) => typeof action === 'string');

  if (!hasValidInstructions || !hasValidActions) {
    return false;
  }

  if ('exampleCommands' in dto) {
    return (
      Array.isArray(dto.exampleCommands) &&
      dto.exampleCommands.every(
        (cmd: unknown) =>
          typeof cmd === 'object' &&
          cmd !== null &&
          'description' in cmd &&
          'command' in cmd &&
          typeof (cmd as Record<string, unknown>).description === 'string' &&
          typeof (cmd as Record<string, unknown>).command === 'string',
      )
    );
  }

  return true;
}

// Factory functions for creating valid query objects
export function createBootstrapStatusQuery(documentId: string): GetBootstrapStatusQuery {
  if (!documentId || documentId.trim().length === 0) {
    throw new Error('Document ID cannot be empty');
  }
  return { documentId: documentId.trim() };
}

export function createBootstrapInstructionsQuery(
  documentId: string,
  context?: 'empty_document' | 'empty_argument' | 'first_connection',
): GetBootstrapInstructionsQuery {
  if (!documentId || documentId.trim().length === 0) {
    throw new Error('Document ID cannot be empty');
  }

  const query: GetBootstrapInstructionsQuery = { documentId: documentId.trim() };
  if (context) {
    query.context = context;
  }

  return query;
}

// Validation helpers for DTOs
export function validateBootstrapStatusDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isBootstrapStatusDTO(dto)) {
    errors.push('Invalid BootstrapStatusDTO structure');
    return errors;
  }

  if (dto.nextSteps.length === 0 && dto.currentPhase !== 'complete') {
    errors.push('Non-complete bootstrap phases should have next steps');
  }

  if (dto.currentPhase === 'complete' && dto.isInBootstrapState) {
    errors.push('Complete phase should not be in bootstrap state');
  }

  return errors;
}

export function validateBootstrapInstructionsDTO(dto: unknown): string[] {
  const errors: string[] = [];

  if (!isBootstrapInstructionsDTO(dto)) {
    errors.push('Invalid BootstrapInstructionsDTO structure');
    return errors;
  }

  if (dto.instructions.length === 0) {
    errors.push('Instructions cannot be empty');
  }

  if (dto.availableActions.length === 0) {
    errors.push('Available actions cannot be empty');
  }

  return errors;
}
