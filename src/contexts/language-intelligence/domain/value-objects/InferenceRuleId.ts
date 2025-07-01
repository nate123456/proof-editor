import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class InferenceRuleId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<InferenceRuleId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Inference rule ID cannot be empty'));
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 3) {
      return err(new ValidationError('Inference rule ID must be at least 3 characters long'));
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedValue)) {
      return err(
        new ValidationError(
          'Inference rule ID can only contain letters, numbers, hyphens, and underscores'
        )
      );
    }

    return ok(new InferenceRuleId(trimmedValue));
  }

  static generate(): InferenceRuleId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new InferenceRuleId(`rule_${timestamp}_${random}`);
  }

  static fromName(name: string): Result<InferenceRuleId, ValidationError> {
    if (!name || name.trim().length === 0) {
      return err(new ValidationError('Rule name cannot be empty'));
    }

    const sanitizedName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (sanitizedName.length < 3) {
      return err(new ValidationError('Sanitized rule name too short'));
    }

    return InferenceRuleId.create(sanitizedName);
  }

  getValue(): string {
    return this.value;
  }

  isGenerated(): boolean {
    return this.value.startsWith('rule_');
  }

  isUserDefined(): boolean {
    return !this.isGenerated();
  }

  equals(other: InferenceRuleId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
