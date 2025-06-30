import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';

export class PackageVersion {
  private constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number,
    private readonly prerelease: string | null,
    private readonly build: string | null
  ) {}

  static create(versionString: string): Result<PackageVersion, ValidationError> {
    if (!versionString || versionString.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Version string cannot be empty')
      };
    }

    const trimmed = versionString.trim();
    
    // Basic semver pattern: major.minor.patch[-prerelease][+build]
    const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-.]+))?(?:\+([a-zA-Z0-9\-.]+))?$/;
    const match = trimmed.match(semverPattern);

    if (!match) {
      return {
        success: false,
        error: new ValidationError('Version must follow semantic versioning format (major.minor.patch)')
      };
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const prerelease = match[4] || null;
    const build = match[5] || null;

    if (major < 0 || minor < 0 || patch < 0) {
      return {
        success: false,
        error: new ValidationError('Version numbers cannot be negative')
      };
    }

    return {
      success: true,
      data: new PackageVersion(major, minor, patch, prerelease, build)
    };
  }

  static createFromNumbers(
    major: number,
    minor: number,
    patch: number,
    prerelease?: string,
    build?: string
  ): Result<PackageVersion, ValidationError> {
    if (major < 0 || minor < 0 || patch < 0) {
      return {
        success: false,
        error: new ValidationError('Version numbers cannot be negative')
      };
    }

    return {
      success: true,
      data: new PackageVersion(major, minor, patch, prerelease || null, build || null)
    };
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

  getPrerelease(): string | null {
    return this.prerelease;
  }

  getBuild(): string | null {
    return this.build;
  }

  toString(): string {
    let version = `${this.major}.${this.minor}.${this.patch}`;
    
    if (this.prerelease) {
      version += `-${this.prerelease}`;
    }
    
    if (this.build) {
      version += `+${this.build}`;
    }
    
    return version;
  }

  getStableVersion(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  isPrerelease(): boolean {
    return this.prerelease !== null;
  }

  isStable(): boolean {
    return !this.isPrerelease();
  }

  compareTo(other: PackageVersion): number {
    // Compare major
    if (this.major !== other.major) {
      return this.major - other.major;
    }

    // Compare minor
    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }

    // Compare patch
    if (this.patch !== other.patch) {
      return this.patch - other.patch;
    }

    // Compare prerelease
    if (this.prerelease === null && other.prerelease === null) {
      return 0;
    }
    
    if (this.prerelease === null) {
      return 1; // Stable is greater than prerelease
    }
    
    if (other.prerelease === null) {
      return -1; // Prerelease is less than stable
    }

    // Both have prerelease, compare lexicographically
    return this.prerelease.localeCompare(other.prerelease);
  }

  isGreaterThan(other: PackageVersion): boolean {
    return this.compareTo(other) > 0;
  }

  isLessThan(other: PackageVersion): boolean {
    return this.compareTo(other) < 0;
  }

  isEqualTo(other: PackageVersion): boolean {
    return this.compareTo(other) === 0;
  }

  isCompatibleWith(other: PackageVersion): boolean {
    // Compatible if major version is the same and this version is >= other
    return this.major === other.major && this.compareTo(other) >= 0;
  }

  nextMajor(): PackageVersion {
    return new PackageVersion(this.major + 1, 0, 0, null, null);
  }

  nextMinor(): PackageVersion {
    return new PackageVersion(this.major, this.minor + 1, 0, null, null);
  }

  nextPatch(): PackageVersion {
    return new PackageVersion(this.major, this.minor, this.patch + 1, null, null);
  }

  withPrerelease(prerelease: string): Result<PackageVersion, ValidationError> {
    if (!prerelease || !/^[a-zA-Z0-9\-.]+$/.test(prerelease)) {
      return {
        success: false,
        error: new ValidationError('Invalid prerelease format')
      };
    }

    return {
      success: true,
      data: new PackageVersion(this.major, this.minor, this.patch, prerelease, this.build)
    };
  }

  withBuild(build: string): Result<PackageVersion, ValidationError> {
    if (!build || !/^[a-zA-Z0-9\-.]+$/.test(build)) {
      return {
        success: false,
        error: new ValidationError('Invalid build format')
      };
    }

    return {
      success: true,
      data: new PackageVersion(this.major, this.minor, this.patch, this.prerelease, build)
    };
  }

  equals(other: PackageVersion): boolean {
    return this.isEqualTo(other);
  }
}