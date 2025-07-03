import { err, ok, type Result } from 'neverthrow';

import { InvalidPackageVersionError } from '../types/domain-errors.js';

export type VersionConstraintOperator =
  | 'exact'
  | 'caret'
  | 'tilde'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'range';

export interface VersionRange {
  readonly operator: VersionConstraintOperator;
  readonly version: string;
  readonly upperBound?: string;
}

export class VersionConstraint {
  private constructor(
    private readonly constraint: string,
    private readonly ranges: VersionRange[],
  ) {}

  static create(constraint: string): Result<VersionConstraint, InvalidPackageVersionError> {
    const trimmed = constraint.trim();

    if (!trimmed) {
      return err(new InvalidPackageVersionError('Version constraint cannot be empty'));
    }

    const parseResult = VersionConstraint.parseConstraint(constraint); // Pass original, not trimmed
    if (parseResult.isErr()) {
      return err(parseResult.error);
    }

    return ok(new VersionConstraint(trimmed, parseResult.value));
  }

  satisfies(version: string): Result<boolean, InvalidPackageVersionError> {
    const normalizedVersion = version.trim();

    if (!VersionConstraint.isValidVersion(normalizedVersion)) {
      return err(new InvalidPackageVersionError(`Invalid version format: ${normalizedVersion}`));
    }

    for (const range of this.ranges) {
      if (this.versionMatchesRange(normalizedVersion, range)) {
        return ok(true);
      }
    }

    return ok(false);
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

  private static parseConstraint(
    constraint: string,
  ): Result<VersionRange[], InvalidPackageVersionError> {
    const ranges: VersionRange[] = [];

    if (constraint.includes(' - ')) {
      const [lower, upper] = constraint.split(' - ');
      if (!lower?.trim() || !upper?.trim()) {
        return err(new InvalidPackageVersionError(`Invalid range format: ${constraint}`));
      }
      if (
        !VersionConstraint.isValidVersion(lower.trim()) ||
        !VersionConstraint.isValidVersion(upper.trim())
      ) {
        return err(new InvalidPackageVersionError(`Invalid range format: ${constraint}`));
      }
      ranges.push({ operator: 'range', version: lower.trim(), upperBound: upper.trim() });
    } else {
      // Trim for all other constraint types
      const trimmed = constraint.trim();
      if (trimmed.startsWith('^')) {
        const version = trimmed.slice(1);
        if (!VersionConstraint.isValidVersion(version)) {
          return err(new InvalidPackageVersionError(`Invalid caret constraint: ${constraint}`));
        }
        ranges.push({ operator: 'caret', version });
      } else if (trimmed.startsWith('~')) {
        const version = trimmed.slice(1);
        if (!VersionConstraint.isValidVersion(version)) {
          return err(new InvalidPackageVersionError(`Invalid tilde constraint: ${constraint}`));
        }
        ranges.push({ operator: 'tilde', version });
      } else if (trimmed.startsWith('>=')) {
        const version = trimmed.slice(2).trim();
        if (!VersionConstraint.isValidVersion(version)) {
          return err(new InvalidPackageVersionError(`Invalid gte constraint: ${constraint}`));
        }
        ranges.push({ operator: 'gte', version });
      } else if (trimmed.startsWith('<=')) {
        const version = trimmed.slice(2).trim();
        if (!VersionConstraint.isValidVersion(version)) {
          return err(new InvalidPackageVersionError(`Invalid lte constraint: ${constraint}`));
        }
        ranges.push({ operator: 'lte', version });
      } else if (trimmed.startsWith('>')) {
        const version = trimmed.slice(1).trim();
        if (!VersionConstraint.isValidVersion(version)) {
          return err(new InvalidPackageVersionError(`Invalid gt constraint: ${constraint}`));
        }
        ranges.push({ operator: 'gt', version });
      } else if (trimmed.startsWith('<')) {
        const version = trimmed.slice(1).trim();
        if (!VersionConstraint.isValidVersion(version)) {
          return err(new InvalidPackageVersionError(`Invalid lt constraint: ${constraint}`));
        }
        ranges.push({ operator: 'lt', version });
      } else {
        if (!VersionConstraint.isValidVersion(trimmed)) {
          return err(new InvalidPackageVersionError(`Invalid version format: ${constraint}`));
        }
        ranges.push({ operator: 'exact', version: trimmed });
      }
    }

    return ok(ranges);
  }

  private static isValidVersion(version: string): boolean {
    const semverRegex =
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9a-zA-Z.-]+))?(?:\+([0-9a-zA-Z.-]+))?$/;
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

      case 'range': {
        if (!range.upperBound) return false;
        const upperParts = this.parseVersionParts(range.upperBound);
        return (
          this.compareVersions(versionParts, rangeParts) >= 0 &&
          this.compareVersions(versionParts, upperParts) <= 0
        );
      }

      default:
        return false;
    }
  }

  private parseVersionParts(version: string): {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
  } {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?/.exec(version);
    if (!match?.[1] || !match[2] || !match[3]) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: Number.parseInt(match[1], 10),
      minor: Number.parseInt(match[2], 10),
      patch: Number.parseInt(match[3], 10),
      ...(match[4] ? { prerelease: match[4] } : {}),
    };
  }

  private compareVersions(
    a: { major: number; minor: number; patch: number; prerelease?: string },
    b: { major: number; minor: number; patch: number; prerelease?: string },
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
    range: { major: number; minor: number; patch: number },
  ): boolean {
    // Major version must always match
    if (version.major !== range.major) return false;

    // Special handling for 0.x.x versions - caret only allows patch changes when major = 0
    if (range.major === 0) {
      // For 0.0.x - only patch changes allowed
      if (range.minor === 0) {
        if (version.minor !== range.minor) return false;
        return version.patch >= range.patch;
      }
      // For 0.x.y where x > 0 - only patch changes allowed within same minor
      if (version.minor !== range.minor) return false;
      return version.patch >= range.patch;
    }

    // For major > 0 - minor and patch can change
    if (version.minor < range.minor) return false;
    if (version.minor === range.minor && version.patch < range.patch) return false;
    return true;
  }

  private satisfiesTildeRange(
    version: { major: number; minor: number; patch: number },
    range: { major: number; minor: number; patch: number },
  ): boolean {
    if (version.major !== range.major) return false;
    if (version.minor !== range.minor) return false;
    return version.patch >= range.patch;
  }

  toJSON(): string {
    return this.constraint;
  }
}
