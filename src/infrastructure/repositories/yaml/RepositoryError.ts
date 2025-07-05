export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

// Note: This error class is for infrastructure-level errors.
// Domain operations should return Result<T, ValidationError> instead of throwing.
