import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class AnalysisReportId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<AnalysisReportId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Analysis report ID cannot be empty'));
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 5) {
      return err(new ValidationError('Analysis report ID must be at least 5 characters long'));
    }

    return ok(new AnalysisReportId(trimmedValue));
  }

  static generate(): AnalysisReportId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new AnalysisReportId(`ar_${timestamp}_${random}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: AnalysisReportId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
