// Re-export neverthrow types and functions for domain layer
// Legacy compatibility exports (aliases for migration from custom Result implementation)
export {
  err,
  err as createFailure,
  err as failure,
  errAsync,
  ok,
  ok as createSuccess,
  ok as success,
  okAsync,
  Result,
  ResultAsync,
} from 'neverthrow';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
