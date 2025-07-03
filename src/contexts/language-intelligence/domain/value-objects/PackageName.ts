import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class PackageName {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<PackageName, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Package name cannot be empty'));
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 2) {
      return err(new ValidationError('Package name must be at least 2 characters long'));
    }

    if (trimmedValue.length > 100) {
      return err(new ValidationError('Package name cannot exceed 100 characters'));
    }

    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmedValue)) {
      return err(
        new ValidationError(
          'Package name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
        ),
      );
    }

    return ok(new PackageName(trimmedValue));
  }

  getValue(): string {
    return this.value;
  }

  getNormalizedValue(): string {
    return this.value.toLowerCase().trim();
  }

  getDisplayName(): string {
    return this.value;
  }

  getSlug(): string {
    return this.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  isReservedName(): boolean {
    const reservedNames = [
      'system',
      'core',
      'builtin',
      'internal',
      'default',
      'base',
      'standard',
      'reserved',
    ];

    return reservedNames.includes(this.getNormalizedValue());
  }

  containsKeyword(keyword: string): boolean {
    return this.getNormalizedValue().includes(keyword.toLowerCase());
  }

  equals(other: PackageName): boolean {
    return this.getNormalizedValue() === other.getNormalizedValue();
  }

  toString(): string {
    return this.value;
  }
}
