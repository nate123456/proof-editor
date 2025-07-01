import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class ValidationResultId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<ValidationResultId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Validation result ID cannot be empty'),
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 5) {
      return {
        success: false,
        error: new ValidationError('Validation result ID must be at least 5 characters long'),
      };
    }

    return {
      success: true,
      data: new ValidationResultId(trimmedValue),
    };
  }

  static generate(): ValidationResultId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new ValidationResultId(`vr_${timestamp}_${random}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ValidationResultId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
