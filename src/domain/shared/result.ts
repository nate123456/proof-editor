import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';

export { err, errAsync, ok, okAsync, Result, ResultAsync };

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Legacy compatibility exports (deprecated)
export const createSuccess = ok;
export const createFailure = err;
export const success = ok;
export const failure = err;
