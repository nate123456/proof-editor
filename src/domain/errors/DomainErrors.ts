export abstract class DomainError extends Error {
  public override readonly name: string = 'DomainError';
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ProcessingError extends DomainError {}

export class StructureError extends DomainError {}

export class RepositoryError extends Error {
  public override readonly name = 'RepositoryError';
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    if (cause) {
      this.cause = cause;
    }
  }
}
