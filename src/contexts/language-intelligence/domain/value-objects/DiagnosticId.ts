import { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"

export class DiagnosticId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<DiagnosticId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Diagnostic ID cannot be empty')
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 3) {
      return {
        success: false,
        error: new ValidationError('Diagnostic ID must be at least 3 characters long')
      };
    }

    return {
      success: true,
      data: new DiagnosticId(trimmedValue)
    };
  }

  static generate(): DiagnosticId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new DiagnosticId(`diag_${timestamp}_${random}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DiagnosticId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}