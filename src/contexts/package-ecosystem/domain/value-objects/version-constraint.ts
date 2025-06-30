import { Result } from '../types/result.js';
import { InvalidPackageVersionError } from '../types/domain-errors.js';

export type VersionConstraintOperator = 'exact' | 'caret' | 'tilde' | 'gte' | 'lte' | 'gt' | 'lt' | 'range';

export interface VersionRange {
  readonly operator: VersionConstraintOperator;
  readonly version: string;
  readonly upperBound?: string;
}

export class VersionConstraint {
  private constructor(
    private readonly constraint: string,
    private readonly ranges: VersionRange[]
  ) {}

  static create(constraint: string): Result<VersionConstraint, InvalidPackageVersionError> {
    const trimmed = constraint.trim();
    
    if (!trimmed) {
      return Result.failure(new InvalidPackageVersionError('Version constraint cannot be empty'));
    }

    const parseResult = this.parseConstraint(trimmed);
    if (!parseResult.success) {
      return Result.failure(parseResult.error);
    }

    return Result.success(new VersionConstraint(trimmed, parseResult.data));
  }

  satisfies(version: string): Result<boolean, InvalidPackageVersionError> {
    const normalizedVersion = version.trim();
    
    if (!this.isValidVersion(normalizedVersion)) {
      return Result.failure(new InvalidPackageVersionError(`Invalid version format: ${normalizedVersion}`));
    }

    for (const range of this.ranges) {
      if (this.versionMatchesRange(normalizedVersion, range)) {
        return Result.success(true);
      }
    }

    return Result.success(false);
  }

  getConstraintString(): string {
    return this.constraint;
  }

  getRanges(): readonly VersionRange[] {
    return this.ranges;
  }

  equals(other: VersionConstraint): boolean {
    return this.constraint === other.constraint;
  }

  private static parseConstraint(constraint: string): Result<VersionRange[], InvalidPackageVersionError> {
    const ranges: VersionRange[] = [];

    if (constraint.includes(' - ')) {
      const [lower, upper] = constraint.split(' - ');
      if (!this.isValidVersion(lower) || !this.isValidVersion(upper)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid range format: ${constraint}`));
      }
      ranges.push({ operator: 'range', version: lower, upperBound: upper });
    } else if (constraint.startsWith('^')) {
      const version = constraint.slice(1);
      if (!this.isValidVersion(version)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid caret constraint: ${constraint}`));
      }
      ranges.push({ operator: 'caret', version });
    } else if (constraint.startsWith('~')) {
      const version = constraint.slice(1);
      if (!this.isValidVersion(version)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid tilde constraint: ${constraint}`));
      }
      ranges.push({ operator: 'tilde', version });
    } else if (constraint.startsWith('>=')) {
      const version = constraint.slice(2).trim();
      if (!this.isValidVersion(version)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid gte constraint: ${constraint}`));
      }
      ranges.push({ operator: 'gte', version });
    } else if (constraint.startsWith('<=')) {
      const version = constraint.slice(2).trim();
      if (!this.isValidVersion(version)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid lte constraint: ${constraint}`));
      }
      ranges.push({ operator: 'lte', version });
    } else if (constraint.startsWith('>')) {
      const version = constraint.slice(1).trim();
      if (!this.isValidVersion(version)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid gt constraint: ${constraint}`));
      }
      ranges.push({ operator: 'gt', version });
    } else if (constraint.startsWith('<')) {
      const version = constraint.slice(1).trim();
      if (!this.isValidVersion(version)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid lt constraint: ${constraint}`));
      }
      ranges.push({ operator: 'lt', version });
    } else {
      if (!this.isValidVersion(constraint)) {
        return Result.failure(new InvalidPackageVersionError(`Invalid version format: ${constraint}`));
      }
      ranges.push({ operator: 'exact', version: constraint });
    }

    return Result.success(ranges);
  }

  private static isValidVersion(version: string): boolean {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  private versionMatchesRange(version: string, range: VersionRange): boolean {
    const versionParts = this.parseVersionParts(version);
    const rangeParts = this.parseVersionParts(range.version);

    switch (range.operator) {
      case 'exact':
        return version === range.version;
      
      case 'caret':
        return this.satisfiesCaretRange(versionParts, rangeParts);
      
      case 'tilde':
        return this.satisfiesTildeRange(versionParts, rangeParts);
      
      case 'gte':
        return this.compareVersions(versionParts, rangeParts) >= 0;
      
      case 'lte':
        return this.compareVersions(versionParts, rangeParts) <= 0;
      
      case 'gt':
        return this.compareVersions(versionParts, rangeParts) > 0;
      
      case 'lt':
        return this.compareVersions(versionParts, rangeParts) < 0;
      
      case 'range':
        if (!range.upperBound) return false;
        const upperParts = this.parseVersionParts(range.upperBound);
        return (
          this.compareVersions(versionParts, rangeParts) >= 0 &&
          this.compareVersions(versionParts, upperParts) <= 0
        );
      
      default:
        return false;
    }
  }

  private parseVersionParts(version: string): { major: number; minor: number; patch: number; prerelease?: string } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4]
    };
  }

  private compareVersions(
    a: { major: number; minor: number; patch: number; prerelease?: string },
    b: { major: number; minor: number; patch: number; prerelease?: string }
  ): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;

    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && b.prerelease) {
      return a.prerelease.localeCompare(b.prerelease);
    }

    return 0;
  }

  private satisfiesCaretRange(
    version: { major: number; minor: number; patch: number },
    range: { major: number; minor: number; patch: number }
  ): boolean {
    if (version.major !== range.major) return false;
    if (version.minor < range.minor) return false;
    if (version.minor === range.minor && version.patch < range.patch) return false;
    return true;
  }

  private satisfiesTildeRange(
    version: { major: number; minor: number; patch: number },
    range: { major: number; minor: number; patch: number }
  ): boolean {
    if (version.major !== range.major) return false;
    if (version.minor !== range.minor) return false;
    return version.patch >= range.patch;
  }

  toJSON(): string {
    return this.constraint;
  }
}