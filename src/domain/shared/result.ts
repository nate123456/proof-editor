// Re-export neverthrow types and functions for domain layer
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';

// Legacy compatibility exports (deprecated - use neverthrow directly)
export {
  err as createFailure,
  ok as createSuccess,
  err as failure,
  ok as success,
} from 'neverthrow';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
