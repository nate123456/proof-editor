export abstract class AnalysisDomainError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class ValidationError extends AnalysisDomainError {}

export class PatternMatchError extends AnalysisDomainError {}

export class SourceLocationError extends AnalysisDomainError {}

export class InsightGenerationError extends AnalysisDomainError {}
