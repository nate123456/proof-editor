// Re-export neverthrow types and functions for domain layer
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';

// Legacy compatibility exports (aliases for migration from custom Result implementation)
export { ok as createSuccess, ok as success } from 'neverthrow';
export { err as createFailure, err as failure } from 'neverthrow';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
