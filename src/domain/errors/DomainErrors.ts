export abstract class DomainError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ProcessingError extends DomainError {}

export class StructureError extends DomainError {}

export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'RepositoryError';
  }
}