import type { AtomicArgumentDTO, ValidationErrorDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';
import type { TreeStructureDTO } from '../queries/tree-queries.js';

// Add operation metadata pattern from existing code
export interface OperationMetadata {
  operationId: string;
  timestamp: string;
  userId?: string;
  correlationId?: string;
  source?: 'user' | 'system' | 'import';
}

// Extend commands with metadata
export interface CommandWithMetadata<T> {
  metadata: OperationMetadata;
  payload: T;
}

// Consistent result structure for all operations
export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: ErrorDTO;
  events?: EventDTO[];
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorDTO;
}

export interface ErrorDTO {
  code: string;
  message: string;
  details?: unknown;
}

// Application layer error types to avoid direct domain imports
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'APPLICATION_ERROR',
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ValidationApplicationError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationApplicationError';
  }
}

export class BusinessRuleError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_ERROR', context);
    this.name = 'BusinessRuleError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string, context?: Record<string, unknown>) {
    super(`${resource} with ID '${id}' not found`, 'NOT_FOUND', { resource, id, ...context });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT', context);
    this.name = 'ConflictError';
  }
}

// Helper functions to convert between domain errors and application errors
export function createErrorDTOFromError(error: Error): ErrorDTO {
  if (error instanceof ApplicationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.context,
    };
  }

  // For other errors, provide a generic application error
  return {
    code: 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: { originalError: error.name },
  };
}

export interface EventDTO {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// Specific command results
export interface CreateStatementResult {
  statementId: string;
  statement: StatementDTO;
}

export interface CreateArgumentResult {
  argumentId: string;
  argument: AtomicArgumentDTO;
}

export interface AttachNodeResult {
  nodeId: string;
  treeStructure: TreeStructureDTO; // Updated tree structure
}

export interface BranchCreationResult {
  newStatement: StatementDTO;
  newArgument: AtomicArgumentDTO;
  connectionPoint: {
    sourceArgumentId: string;
    targetArgumentId: string;
    sharedStatementId: string;
    connectionType: 'conclusion-to-premise';
  };
  newTreeId?: string; // If created in new tree
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDTO[];
  warnings: ValidationErrorDTO[];
  customScriptResults?: Array<{
    scriptId: string;
    passed: boolean;
    messages: string[];
  }>;
}

export interface ImportResult {
  documentId: string;
  stats: {
    statementsImported: number;
    argumentsImported: number;
    treesImported: number;
    errors: string[];
  };
}

export interface BootstrapResult {
  success: boolean;
  phase: 'empty' | 'first_argument' | 'populating' | 'complete';
  createdEntities?: {
    argumentId?: string;
    treeId?: string;
    statementIds?: string[];
  };
  nextSteps: string[];
}

// Type guards for runtime validation
export function isOperationMetadata(obj: unknown): obj is OperationMetadata {
  if (typeof obj !== 'object' || obj === null) return false;
  const metadata = obj as Record<string, unknown>;

  if (typeof metadata.operationId !== 'string' || metadata.operationId.length === 0) {
    return false;
  }
  if (typeof metadata.timestamp !== 'string') {
    return false;
  }
  if (metadata.userId !== undefined && typeof metadata.userId !== 'string') {
    return false;
  }
  if (metadata.correlationId !== undefined && typeof metadata.correlationId !== 'string') {
    return false;
  }
  if (
    metadata.source !== undefined &&
    !['user', 'system', 'import'].includes(metadata.source as string)
  ) {
    return false;
  }

  // Validate timestamp format
  try {
    const date = new Date(metadata.timestamp as string);
    if (Number.isNaN(date.getTime())) return false;
  } catch {
    return false;
  }

  return true;
}

export function isCommandResult<T>(obj: unknown): obj is CommandResult<T> {
  if (typeof obj !== 'object' || obj === null) return false;
  const result = obj as Record<string, unknown>;

  if (typeof result.success !== 'boolean') return false;

  if (result.error !== undefined && !isErrorDTO(result.error)) return false;

  if (result.events !== undefined) {
    if (!Array.isArray(result.events)) return false;
    if (!result.events.every((event) => isEventDTO(event))) return false;
  }

  return true;
}

export function isQueryResult<T>(obj: unknown): obj is QueryResult<T> {
  if (typeof obj !== 'object' || obj === null) return false;
  const result = obj as Record<string, unknown>;

  if (typeof result.success !== 'boolean') return false;
  if (result.error !== undefined && !isErrorDTO(result.error)) return false;

  return true;
}

export function isErrorDTO(obj: unknown): obj is ErrorDTO {
  if (typeof obj !== 'object' || obj === null) return false;
  const error = obj as Record<string, unknown>;

  return (
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    error.code.length > 0 &&
    error.message.length > 0
  );
}

export function isEventDTO(obj: unknown): obj is EventDTO {
  if (typeof obj !== 'object' || obj === null) return false;
  const event = obj as Record<string, unknown>;

  if (typeof event.type !== 'string' || event.type.length === 0) return false;
  if (typeof event.payload !== 'object' || event.payload === null) return false;
  if (typeof event.timestamp !== 'string') return false;

  // Validate timestamp format
  try {
    const date = new Date(event.timestamp as string);
    if (Number.isNaN(date.getTime())) return false;
  } catch {
    return false;
  }

  return true;
}

export function isValidationResult(obj: unknown): obj is ValidationResult {
  if (typeof obj !== 'object' || obj === null) return false;
  const result = obj as Record<string, unknown>;

  if (typeof result.isValid !== 'boolean') return false;
  if (!Array.isArray(result.errors) || !Array.isArray(result.warnings)) return false;

  if (result.customScriptResults !== undefined) {
    if (!Array.isArray(result.customScriptResults)) return false;
    for (const scriptResult of result.customScriptResults) {
      if (typeof scriptResult !== 'object' || scriptResult === null) return false;
      const sr = scriptResult as Record<string, unknown>;
      if (
        typeof sr.scriptId !== 'string' ||
        typeof sr.passed !== 'boolean' ||
        !Array.isArray(sr.messages) ||
        !sr.messages.every((msg) => typeof msg === 'string')
      ) {
        return false;
      }
    }
  }

  return true;
}

export function isBootstrapResult(obj: unknown): obj is BootstrapResult {
  if (typeof obj !== 'object' || obj === null) return false;
  const result = obj as Record<string, unknown>;

  if (typeof result.success !== 'boolean') return false;
  if (!['empty', 'first_argument', 'populating', 'complete'].includes(result.phase as string)) {
    return false;
  }
  if (
    !Array.isArray(result.nextSteps) ||
    !result.nextSteps.every((step) => typeof step === 'string')
  ) {
    return false;
  }

  if (result.createdEntities !== undefined) {
    if (typeof result.createdEntities !== 'object' || result.createdEntities === null) {
      return false;
    }
    const entities = result.createdEntities as Record<string, unknown>;
    if (entities.argumentId !== undefined && typeof entities.argumentId !== 'string') return false;
    if (entities.treeId !== undefined && typeof entities.treeId !== 'string') return false;
    if (
      entities.statementIds !== undefined &&
      (!Array.isArray(entities.statementIds) ||
        !entities.statementIds.every((id) => typeof id === 'string'))
    ) {
      return false;
    }
  }

  return true;
}

// Utility functions for creating and working with operation results
export function createOperationMetadata(
  operationId: string,
  options: {
    userId?: string;
    correlationId?: string;
    source?: 'user' | 'system' | 'import';
  } = {},
): OperationMetadata {
  if (!operationId || operationId.trim().length === 0) {
    throw new Error('Operation ID is required');
  }

  return {
    operationId: operationId.trim(),
    timestamp: new Date().toISOString(),
    ...options,
  };
}

export function createSuccessResult<T>(data?: T, events?: EventDTO[]): CommandResult<T> {
  const result: CommandResult<T> = { success: true };
  if (data !== undefined) result.data = data;
  if (events && events.length > 0) result.events = events;
  return result;
}

export function createErrorResult<T>(
  code: string,
  message: string,
  details?: unknown,
): CommandResult<T> {
  if (!code || !message) {
    throw new Error('Error code and message are required');
  }

  return {
    success: false,
    error: { code, message, details },
  };
}

export function createEvent(type: string, payload: Record<string, unknown>): EventDTO {
  if (!type || type.trim().length === 0) {
    throw new Error('Event type is required');
  }

  return {
    type: type.trim(),
    payload,
    timestamp: new Date().toISOString(),
  };
}

export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  if (results.length === 0) {
    return { isValid: true, errors: [], warnings: [] };
  }

  const mergedErrors: ValidationErrorDTO[] = [];
  const mergedWarnings: ValidationErrorDTO[] = [];
  const mergedScriptResults: Array<{
    scriptId: string;
    passed: boolean;
    messages: string[];
  }> = [];

  let isValid = true;

  for (const result of results) {
    if (!result.isValid) isValid = false;
    mergedErrors.push(...result.errors);
    mergedWarnings.push(...result.warnings);
    if (result.customScriptResults) {
      mergedScriptResults.push(...result.customScriptResults);
    }
  }

  const merged: ValidationResult = {
    isValid,
    errors: mergedErrors,
    warnings: mergedWarnings,
  };

  if (mergedScriptResults.length > 0) {
    merged.customScriptResults = mergedScriptResults;
  }

  return merged;
}

export function hasValidationErrors(result: ValidationResult): boolean {
  return (
    result.errors.length > 0 ||
    (result.customScriptResults?.some((script) => !script.passed) ?? false)
  );
}

export function getBootstrapNextSteps(phase: BootstrapResult['phase']): string[] {
  switch (phase) {
    case 'empty':
      return ['Create your first atomic argument', 'Add premises and conclusion statements'];
    case 'first_argument':
      return [
        'Add statements to populate your argument',
        'Create premise and conclusion statements',
      ];
    case 'populating':
      return ['Connect arguments to build reasoning chains', 'Add validation rules'];
    case 'complete':
      return [
        'Continue building your proof tree',
        'Add custom validation scripts',
        'Export your work',
      ];
    default:
      return ['Unknown phase - check system state'];
  }
}
