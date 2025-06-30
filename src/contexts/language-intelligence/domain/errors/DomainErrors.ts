export abstract class DomainError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {}

export class AnalysisError extends DomainError {}

export class LanguagePackageError extends DomainError {}

export class PatternRecognitionError extends DomainError {}

export class EducationalFeedbackError extends DomainError {}