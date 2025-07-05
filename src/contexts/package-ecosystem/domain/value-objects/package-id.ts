import { err, ok, type Result } from 'neverthrow';

import { PackageValidationError } from '../types/domain-errors.js';

export class PackageId {
  private constructor(private readonly value: string) {
    // Make the object truly immutable at runtime
    Object.freeze(this);
  }

  static create(value: string): Result<PackageId, PackageValidationError> {
    const trimmed = value.trim();

    if (!trimmed) {
      return err(new PackageValidationError('Package ID cannot be empty'));
    }

    if (trimmed.length > 100) {
      return err(new PackageValidationError('Package ID cannot exceed 100 characters'));
    }

    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      return err(
        new PackageValidationError(
          'Package ID must contain only lowercase letters, numbers, and hyphens',
        ),
      );
    }

    // Check for spaces that are not purely leading/trailing
    // If the original string has spaces, but the trimmed string is different,
    // then spaces were only leading/trailing and should be allowed
    // If the original string has spaces and trimming doesn't change it,
    // then spaces are internal and should be rejected
    if (value.includes(' ') && value.trim() === value) {
      return err(
        new PackageValidationError(
          'Package ID must contain only lowercase letters, numbers, and hyphens',
        ),
      );
    }

    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      return err(new PackageValidationError('Package ID cannot start or end with hyphen'));
    }

    if (trimmed.includes('--')) {
      return err(new PackageValidationError('Package ID cannot contain consecutive hyphens'));
    }

    return ok(new PackageId(trimmed));
  }

  toString(): string {
    return this.value;
  }

  equals(other: PackageId): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
