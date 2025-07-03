import { err, ok, type Result } from 'neverthrow';

import { InvalidPackageVersionError } from '../types/domain-errors.js';
import type { PackageId } from '../value-objects/package-id.js';
import type { PackageSource } from '../value-objects/package-source.js';
import { VersionConstraint } from '../value-objects/version-constraint.js';

export type VersionStatus = 'available' | 'deprecated' | 'removed' | 'prerelease' | 'stable';

export interface PackageVersionData {
  readonly packageId: PackageId;
  readonly version: string;
  readonly status: VersionStatus;
  readonly source: PackageSource;
  readonly publishedAt: Date;
  readonly deprecationReason?: string;
  readonly compatibilityNotes?: string;
  readonly breakingChanges?: string[];
  readonly migrationGuide?: string;
}

export class PackageVersion {
  private constructor(private readonly data: PackageVersionData) {}

  static create(data: PackageVersionData): Result<PackageVersion, InvalidPackageVersionError> {
    if (!data.version.trim()) {
      return err(new InvalidPackageVersionError('Version cannot be empty'));
    }

    const versionConstraintResult = VersionConstraint.create(data.version);
    if (versionConstraintResult.isErr()) {
      return err(
        new InvalidPackageVersionError(
          `Invalid version format: ${versionConstraintResult.error.message}`,
        ),
      );
    }

    if (data.status === 'deprecated' && !data.deprecationReason) {
      return err(new InvalidPackageVersionError('Deprecated version must have deprecation reason'));
    }

    if (data.publishedAt > new Date()) {
      return err(new InvalidPackageVersionError('Published date cannot be in the future'));
    }

    return ok(new PackageVersion(data));
  }

  static createNew(
    packageId: PackageId,
    version: string,
    source: PackageSource,
    publishedAt?: Date,
  ): Result<PackageVersion, InvalidPackageVersionError> {
    const status = PackageVersion.determineVersionStatus(version);

    const data: PackageVersionData = {
      packageId,
      version: version.trim(),
      status,
      source,
      publishedAt: publishedAt ?? new Date(),
    };

    return PackageVersion.create(data);
  }

  getPackageId(): PackageId {
    return this.data.packageId;
  }

  getVersion(): string {
    return this.data.version;
  }

  getStatus(): VersionStatus {
    return this.data.status;
  }

  getSource(): PackageSource {
    return this.data.source;
  }

  getPublishedAt(): Date {
    return this.data.publishedAt;
  }

  getDeprecationReason(): string | undefined {
    return this.data.deprecationReason;
  }

  getCompatibilityNotes(): string | undefined {
    return this.data.compatibilityNotes;
  }

  getBreakingChanges(): readonly string[] {
    return this.data.breakingChanges ?? [];
  }

  getMigrationGuide(): string | undefined {
    return this.data.migrationGuide;
  }

  isAvailable(): boolean {
    return this.data.status === 'available' || this.data.status === 'stable';
  }

  isDeprecated(): boolean {
    return this.data.status === 'deprecated';
  }

  isRemoved(): boolean {
    return this.data.status === 'removed';
  }

  isPrerelease(): boolean {
    return this.data.status === 'prerelease';
  }

  isStable(): boolean {
    return this.data.status === 'stable';
  }

  hasBreakingChanges(): boolean {
    return this.getBreakingChanges().length > 0;
  }

  canBeUsed(): boolean {
    return this.isAvailable() && !this.isRemoved();
  }

  compareVersion(other: PackageVersion): number {
    return this.compareVersionStrings(this.data.version, other.data.version);
  }

  isNewerThan(other: PackageVersion): boolean {
    return this.compareVersion(other) > 0;
  }

  isOlderThan(other: PackageVersion): boolean {
    return this.compareVersion(other) < 0;
  }

  isSameVersion(other: PackageVersion): boolean {
    return this.compareVersion(other) === 0;
  }

  withStatus(
    status: VersionStatus,
    deprecationReason?: string,
  ): Result<PackageVersion, InvalidPackageVersionError> {
    if (status === 'deprecated' && !deprecationReason) {
      return err(new InvalidPackageVersionError('Deprecated status requires deprecation reason'));
    }

    const updatedData = {
      ...this.data,
      status,
      ...(status === 'deprecated' && deprecationReason ? { deprecationReason } : {}),
    };

    return PackageVersion.create(updatedData);
  }

  withCompatibilityNotes(notes: string): Result<PackageVersion, InvalidPackageVersionError> {
    const trimmedNotes = notes.trim();
    const updatedData = {
      ...this.data,
      ...(trimmedNotes ? { compatibilityNotes: trimmedNotes } : {}),
    };

    return PackageVersion.create(updatedData);
  }

  withBreakingChanges(changes: string[]): Result<PackageVersion, InvalidPackageVersionError> {
    const updatedData = {
      ...this.data,
      breakingChanges: changes.filter((change) => change.trim()),
    };

    return PackageVersion.create(updatedData);
  }

  withMigrationGuide(guide: string): Result<PackageVersion, InvalidPackageVersionError> {
    const trimmedGuide = guide.trim();
    const updatedData = {
      ...this.data,
      ...(trimmedGuide ? { migrationGuide: trimmedGuide } : {}),
    };

    return PackageVersion.create(updatedData);
  }

  markAsDeprecated(reason: string): Result<PackageVersion, InvalidPackageVersionError> {
    return this.withStatus('deprecated', reason);
  }

  markAsRemoved(): Result<PackageVersion, InvalidPackageVersionError> {
    return this.withStatus('removed');
  }

  markAsStable(): Result<PackageVersion, InvalidPackageVersionError> {
    return this.withStatus('stable');
  }

  private static determineVersionStatus(version: string): VersionStatus {
    if (version.includes('-')) {
      return 'prerelease';
    }
    return 'available';
  }

  private compareVersionStrings(a: string, b: string): number {
    const parseVersion = (version: string) => {
      const match = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?/.exec(version);
      if (!match?.[1] || !match[2] || !match[3]) {
        throw new Error(`Invalid version format: ${version}`);
      }
      return {
        major: Number.parseInt(match[1], 10),
        minor: Number.parseInt(match[2], 10),
        patch: Number.parseInt(match[3], 10),
        prerelease: match[4],
      };
    };

    const versionA = parseVersion(a);
    const versionB = parseVersion(b);

    if (versionA.major !== versionB.major) return versionA.major - versionB.major;
    if (versionA.minor !== versionB.minor) return versionA.minor - versionB.minor;
    if (versionA.patch !== versionB.patch) return versionA.patch - versionB.patch;

    if (versionA.prerelease && !versionB.prerelease) return -1;
    if (!versionA.prerelease && versionB.prerelease) return 1;
    if (versionA.prerelease && versionB.prerelease) {
      return versionA.prerelease.localeCompare(versionB.prerelease);
    }

    return 0;
  }

  equals(other: PackageVersion): boolean {
    return (
      this.data.packageId.equals(other.data.packageId) &&
      this.data.version === other.data.version &&
      this.data.source.equals(other.data.source)
    );
  }

  toJSON(): object {
    return {
      packageId: this.data.packageId.toString(),
      version: this.data.version,
      status: this.data.status,
      source: this.data.source.toJSON(),
      publishedAt: this.data.publishedAt.toISOString(),
      deprecationReason: this.data.deprecationReason,
      compatibilityNotes: this.data.compatibilityNotes,
      breakingChanges: this.data.breakingChanges,
      migrationGuide: this.data.migrationGuide,
    };
  }
}
