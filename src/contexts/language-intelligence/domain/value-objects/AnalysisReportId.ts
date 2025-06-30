import { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"

export class AnalysisReportId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<AnalysisReportId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Analysis report ID cannot be empty')
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 5) {
      return {
        success: false,
        error: new ValidationError('Analysis report ID must be at least 5 characters long')
      };
    }

    return {
      success: true,
      data: new AnalysisReportId(trimmedValue)
    };
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