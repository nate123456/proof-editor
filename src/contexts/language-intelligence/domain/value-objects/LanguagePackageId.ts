import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class LanguagePackageId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<LanguagePackageId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Language package ID cannot be empty'));
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < 3) {
      return err(new ValidationError('Language package ID must be at least 3 characters long'));
    }

    if (trimmedValue.length > 100) {
      return err(new ValidationError('Language package ID cannot exceed 100 characters'));
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedValue)) {
      return err(
        new ValidationError(
          'Language package ID can only contain letters, numbers, dots, hyphens, and underscores'
        )
      );
    }

    return ok(new LanguagePackageId(trimmedValue));
  }

  static generate(): LanguagePackageId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new LanguagePackageId(`pkg_${timestamp}_${random}`);
  }

  static fromNameAndVersion(
    name: string,
    version: string
  ): Result<LanguagePackageId, ValidationError> {
    if (!name || name.trim().length === 0) {
      return err(new ValidationError('Package name cannot be empty'));
    }

    if (!version || version.trim().length === 0) {
      return err(new ValidationError('Package version cannot be empty'));
    }

    // Sanitize name: replace non-alphanumeric with hyphens, remove consecutive hyphens, trim hyphens
    const sanitizedName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Sanitize version: keep only alphanumeric, dots, and hyphens, stop at build metadata (+)
    const sanitizedVersion =
      version
        .trim()
        .split('+')[0]
        ?.replace(/[^a-zA-Z0-9.-]/g, '') ?? '';
    const packageId = `${sanitizedName}-${sanitizedVersion}`;

    return LanguagePackageId.create(packageId);
  }

  getValue(): string {
    return this.value;
  }

  getDisplayName(): string {
    return this.value.replace(/_/g, ' ').replace(/-/g, ' ');
  }

  isGenerated(): boolean {
    return this.value.startsWith('pkg_');
  }

  isUserDefined(): boolean {
    return !this.isGenerated();
  }

  extractVersion(): string | null {
    const versionMatch = this.value.match(/-([0-9]+\.[0-9]+\.[0-9]+.*?)$/);
    return versionMatch ? (versionMatch[1] ?? null) : null;
  }

  extractBaseName(): string {
    const versionMatch = this.value.match(/^(.+?)-[0-9]+\.[0-9]+\.[0-9]+/);
    return versionMatch ? (versionMatch[1] ?? this.value) : this.value;
  }

  withVersion(version: string): Result<LanguagePackageId, ValidationError> {
    const baseName = this.extractBaseName();
    return LanguagePackageId.fromNameAndVersion(baseName, version);
  }

  equals(other: LanguagePackageId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
