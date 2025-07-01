export abstract class DomainError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'DomainError';
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ProcessingError extends DomainError {}

export class StructureError extends DomainError {}

export class RepositoryError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'RepositoryError';
    if (cause) {
      this.cause = cause;
    }
  }
}
