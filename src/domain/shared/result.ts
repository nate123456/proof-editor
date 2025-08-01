export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
