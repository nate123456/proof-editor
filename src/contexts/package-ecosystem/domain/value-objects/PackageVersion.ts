import { err, ok, type Result } from 'neverthrow';

import { PackageValidationError } from '../types/domain-errors.js';

export class PackageVersion {
  private constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number,
    private readonly prerelease?: string,
    private readonly build?: string,
    private readonly original?: string
  ) {}

  static create(versionString: string): Result<PackageVersion, PackageValidationError> {
    const trimmed = versionString.trim();

    if (!trimmed) {
      return err(new PackageValidationError('Version string cannot be empty'));
    }

    const semverPattern =
      /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    const match = trimmed.match(semverPattern);

    if (!match) {
      return err(
        new PackageValidationError(
          `Invalid semantic version format: ${trimmed}. Expected format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`
        )
      );
    }

    const [, majorStr, minorStr, patchStr, prerelease, build] = match;

    if (!majorStr || !minorStr || !patchStr) {
      return err(new PackageValidationError('Invalid version format: missing components'));
    }

    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);
    const patch = parseInt(patchStr, 10);

    if (major < 0 || minor < 0 || patch < 0) {
      return err(new PackageValidationError('Version numbers must be non-negative integers'));
    }

    return ok(new PackageVersion(major, minor, patch, prerelease, build, trimmed));
  }

  static fromGitRef(gitRef: string): Result<PackageVersion, PackageValidationError> {
    const normalizedRef = gitRef.trim();

    if (!normalizedRef) {
      return err(new PackageValidationError('Git ref cannot be empty'));
    }

    if (normalizedRef.startsWith('v')) {
      return PackageVersion.create(normalizedRef.slice(1));
    }

    if (normalizedRef.match(/^\d+\.\d+\.\d+/)) {
      return PackageVersion.create(normalizedRef);
    }

    if (normalizedRef === 'main' || normalizedRef === 'master') {
      return ok(new PackageVersion(0, 0, 0, 'dev', normalizedRef, `0.0.0-dev+${normalizedRef}`));
    }

    if (normalizedRef.match(/^[a-f0-9]{7,40}$/)) {
      const shortHash = normalizedRef.slice(0, 7);
      return ok(new PackageVersion(0, 0, 0, 'dev', shortHash, `0.0.0-dev+${shortHash}`));
    }

    return ok(new PackageVersion(0, 0, 0, 'dev', normalizedRef, `0.0.0-dev+${normalizedRef}`));
  }

  getMajor(): number {
    return this.major;
  }

  getMinor(): number {
    return this.minor;
  }

  getPatch(): number {
    return this.patch;
  }

  getPrerelease(): string | undefined {
    return this.prerelease;
  }

  getBuild(): string | undefined {
    return this.build;
  }

  toString(): string {
    return (
      this.original ??
      `${this.major}.${this.minor}.${this.patch}${this.prerelease ? `-${this.prerelease}` : ''}${this.build ? `+${this.build}` : ''}`
    );
  }

  isPrerelease(): boolean {
    return Boolean(this.prerelease);
  }

  isStable(): boolean {
    return !this.isPrerelease() && this.major > 0;
  }

  isCompatibleWith(other: PackageVersion): boolean {
    if (this.major !== other.major) {
      return false;
    }

    if (this.minor !== other.minor) {
      return this.minor > other.minor;
    }

    return this.patch >= other.patch;
  }

  satisfiesConstraint(constraint: string): boolean {
    const normalizedConstraint = constraint.trim();

    if (normalizedConstraint === '*' || normalizedConstraint === '') {
      return true;
    }

    if (normalizedConstraint.startsWith('^')) {
      const constraintVersionResult = PackageVersion.create(normalizedConstraint.slice(1));
      if (constraintVersionResult.isErr()) {
        return false;
      }
      return this.isCompatibleWith(constraintVersionResult.value);
    }

    if (normalizedConstraint.startsWith('~')) {
      const constraintVersionResult = PackageVersion.create(normalizedConstraint.slice(1));
      if (constraintVersionResult.isErr()) {
        return false;
      }
      const constraintVersion = constraintVersionResult.value;
      return (
        this.major === constraintVersion.major &&
        this.minor === constraintVersion.minor &&
        this.patch >= constraintVersion.patch
      );
    }

    if (normalizedConstraint.startsWith('>=')) {
      const constraintVersionResult = PackageVersion.create(normalizedConstraint.slice(2).trim());
      if (constraintVersionResult.isErr()) {
        return false;
      }
      return this.compareWith(constraintVersionResult.value) >= 0;
    }

    if (normalizedConstraint.startsWith('<=')) {
      const constraintVersionResult = PackageVersion.create(normalizedConstraint.slice(2).trim());
      if (constraintVersionResult.isErr()) {
        return false;
      }
      return this.compareWith(constraintVersionResult.value) <= 0;
    }

    if (normalizedConstraint.startsWith('>')) {
      const constraintVersionResult = PackageVersion.create(normalizedConstraint.slice(1).trim());
      if (constraintVersionResult.isErr()) {
        return false;
      }
      return this.compareWith(constraintVersionResult.value) > 0;
    }

    if (normalizedConstraint.startsWith('<')) {
      const constraintVersionResult = PackageVersion.create(normalizedConstraint.slice(1).trim());
      if (constraintVersionResult.isErr()) {
        return false;
      }
      return this.compareWith(constraintVersionResult.value) < 0;
    }

    const exactVersionResult = PackageVersion.create(normalizedConstraint);
    if (exactVersionResult.isErr()) {
      return false;
    }
    return this.equals(exactVersionResult.value);
  }

  compareWith(other: PackageVersion): number {
    if (this.major !== other.major) {
      return this.major - other.major;
    }

    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }

    if (this.patch !== other.patch) {
      return this.patch - other.patch;
    }

    if (this.prerelease && other.prerelease) {
      return this.prerelease.localeCompare(other.prerelease);
    }

    if (this.prerelease && !other.prerelease) {
      return -1;
    }

    if (!this.prerelease && other.prerelease) {
      return 1;
    }

    return 0;
  }

  equals(other: PackageVersion): boolean {
    return this.compareWith(other) === 0;
  }

  toJSON(): object {
    return {
      major: this.major,
      minor: this.minor,
      patch: this.patch,
      prerelease: this.prerelease,
      build: this.build,
      version: this.original,
    };
  }
}
