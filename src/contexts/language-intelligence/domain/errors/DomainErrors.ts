export abstract class DomainError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ValidationError extends DomainError {}

export class AnalysisError extends DomainError {}

export class LanguagePackageError extends DomainError {}

export class PatternRecognitionError extends DomainError {}

export class EducationalFeedbackError extends DomainError {}

export class RepositoryError extends DomainError {}
