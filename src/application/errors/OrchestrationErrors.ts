export type ContextType =
  | 'language-intelligence'
  | 'package-ecosystem'
  | 'synchronization'
  | 'core';

export class OrchestrationError extends Error {
  constructor(
    message: string,
    public readonly context: ContextType,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

export class ContextUnavailableError extends OrchestrationError {
  constructor(context: ContextType, originalError?: Error) {
    super(`Context '${context}' is currently unavailable`, context, originalError);
    this.name = 'ContextUnavailableError';
  }
}

export class OrchestrationTimeoutError extends OrchestrationError {
  constructor(
    context: ContextType,
    public readonly timeoutMs: number,
    originalError?: Error,
  ) {
    super(`Context '${context}' operation timed out after ${timeoutMs}ms`, context, originalError);
    this.name = 'OrchestrationTimeoutError';
  }
}

export class CrossContextConflictError extends OrchestrationError {
  constructor(
    public readonly conflictingContexts: ContextType[],
    message: string,
    originalError?: Error,
  ) {
    super(message, 'core', originalError);
    this.name = 'CrossContextConflictError';
  }
}
