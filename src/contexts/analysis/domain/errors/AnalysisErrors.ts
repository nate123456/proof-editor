export abstract class AnalysisDomainError extends Error {
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AnalysisDomainError {}

export class PatternMatchError extends AnalysisDomainError {}

export class SourceLocationError extends AnalysisDomainError {}

export class InsightGenerationError extends AnalysisDomainError {}
