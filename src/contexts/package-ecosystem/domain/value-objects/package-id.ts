import { Result } from '../types/result.js';
import { PackageValidationError } from '../types/domain-errors.js';

export class PackageId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<PackageId, PackageValidationError> {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return Result.failure(new PackageValidationError('Package ID cannot be empty'));
    }

    if (trimmed.length > 100) {
      return Result.failure(new PackageValidationError('Package ID cannot exceed 100 characters'));
    }

    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      return Result.failure(new PackageValidationError('Package ID must contain only lowercase letters, numbers, and hyphens'));
    }

    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      return Result.failure(new PackageValidationError('Package ID cannot start or end with hyphen'));
    }

    if (trimmed.includes('--')) {
      return Result.failure(new PackageValidationError('Package ID cannot contain consecutive hyphens'));
    }

    return Result.success(new PackageId(trimmed));
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