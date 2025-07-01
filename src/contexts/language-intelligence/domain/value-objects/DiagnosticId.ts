import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class DiagnosticId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<DiagnosticId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Diagnostic ID cannot be empty'));
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 3) {
      return err(new ValidationError('Diagnostic ID must be at least 3 characters long'));
    }

    return ok(new DiagnosticId(trimmedValue));
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
