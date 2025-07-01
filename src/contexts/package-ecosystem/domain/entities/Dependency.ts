import { err, ok, type Result } from 'neverthrow';

import type { DependencyInfo } from '../types/common-types.js';
import { DependencyResolutionError } from '../types/domain-errors.js';
import { PackageId } from '../value-objects/package-id.js';
import { VersionConstraint } from '../value-objects/version-constraint.js';

export type DependencyType = 'runtime' | 'development' | 'optional' | 'peer';
export type ResolutionStatus = 'unresolved' | 'resolving' | 'resolved' | 'failed' | 'conflict';

export interface DependencyData {
  readonly sourcePackageId: PackageId;
  readonly targetPackageId: PackageId;
  readonly versionConstraint: VersionConstraint;
  readonly dependencyType: DependencyType;
  readonly isRequired: boolean;
  readonly resolutionStatus: ResolutionStatus;
  readonly resolvedVersion?: string;
  readonly conflictReason?: string;
}

export class Dependency {
  private constructor(private readonly data: DependencyData) {}

  static create(data: DependencyData): Result<Dependency, DependencyResolutionError> {
    if (data.sourcePackageId.equals(data.targetPackageId)) {
      return err(new DependencyResolutionError('Package cannot depend on itself'));
    }

    if (data.resolutionStatus === 'resolved' && !data.resolvedVersion) {
      return err(new DependencyResolutionError('Resolved dependency must have resolved version'));
    }

    if (data.resolutionStatus === 'failed' && !data.conflictReason) {
      return err(new DependencyResolutionError('Failed dependency must have conflict reason'));
    }

    if (data.resolutionStatus === 'conflict' && !data.conflictReason) {
      return err(new DependencyResolutionError('Conflicted dependency must have conflict reason'));
    }

    if (data.dependencyType === 'optional' && data.isRequired) {
      return err(new DependencyResolutionError('Optional dependency cannot be required'));
    }

    return ok(new Dependency(data));
  }

  static createFromDependencyInfo(
    sourcePackageId: PackageId,
    dependencyInfo: DependencyInfo,
    dependencyType: DependencyType = 'runtime'
  ): Result<Dependency, DependencyResolutionError> {
    const targetPackageIdResult = PackageId.create(dependencyInfo.targetPackageId);
    if (targetPackageIdResult.isErr()) {
      return err(
        new DependencyResolutionError(
          `Invalid target package ID: ${targetPackageIdResult.error.message}`
        )
      );
    }

    const versionConstraintResult = VersionConstraint.create(dependencyInfo.versionConstraint);
    if (versionConstraintResult.isErr()) {
      return err(
        new DependencyResolutionError(
          `Invalid version constraint: ${versionConstraintResult.error.message}`
        )
      );
    }

    const data: DependencyData = {
      sourcePackageId,
      targetPackageId: targetPackageIdResult.value,
      versionConstraint: versionConstraintResult.value,
      dependencyType,
      isRequired: dependencyInfo.isRequired,
      resolutionStatus: dependencyInfo.resolvedVersion ? 'resolved' : 'unresolved',
      ...(dependencyInfo.resolvedVersion && { resolvedVersion: dependencyInfo.resolvedVersion }),
    };

    return Dependency.create(data);
  }

  getSourcePackageId(): PackageId {
    return this.data.sourcePackageId;
  }

  getTargetPackageId(): PackageId {
    return this.data.targetPackageId;
  }

  getVersionConstraint(): VersionConstraint {
    return this.data.versionConstraint;
  }

  getDependencyType(): DependencyType {
    return this.data.dependencyType;
  }

  isRequired(): boolean {
    return this.data.isRequired;
  }

  isOptional(): boolean {
    return this.data.dependencyType === 'optional' || !this.data.isRequired;
  }

  getResolutionStatus(): ResolutionStatus {
    return this.data.resolutionStatus;
  }

  getResolvedVersion(): string | undefined {
    return this.data.resolvedVersion;
  }

  getConflictReason(): string | undefined {
    return this.data.conflictReason;
  }

  isResolved(): boolean {
    return this.data.resolutionStatus === 'resolved';
  }

  isFailed(): boolean {
    return this.data.resolutionStatus === 'failed';
  }

  hasConflict(): boolean {
    return this.data.resolutionStatus === 'conflict';
  }

  isResolutionInProgress(): boolean {
    return this.data.resolutionStatus === 'resolving';
  }

  canSatisfyVersion(version: string): Result<boolean, DependencyResolutionError> {
    const satisfiesResult = this.data.versionConstraint.satisfies(version);
    if (satisfiesResult.isErr()) {
      return err(
        new DependencyResolutionError(
          `Cannot check version satisfaction: ${satisfiesResult.error.message}`
        )
      );
    }

    return ok(satisfiesResult.value);
  }

  withResolvedVersion(version: string): Result<Dependency, DependencyResolutionError> {
    const canSatisfyResult = this.canSatisfyVersion(version);
    if (canSatisfyResult.isErr()) {
      return err(canSatisfyResult.error);
    }

    if (!canSatisfyResult.value) {
      return err(
        new DependencyResolutionError(
          `Version ${version} does not satisfy constraint ${this.data.versionConstraint.getConstraintString()}`
        )
      );
    }

    const updatedData = {
      ...this.data,
      resolutionStatus: 'resolved' as const,
      resolvedVersion: version,
    };

    delete (updatedData as Record<string, unknown>).conflictReason;

    return Dependency.create(updatedData);
  }

  withResolutionStatus(
    status: ResolutionStatus,
    conflictReason?: string
  ): Result<Dependency, DependencyResolutionError> {
    if ((status === 'failed' || status === 'conflict') && !conflictReason) {
      return err(
        new DependencyResolutionError('Failed or conflicted status requires conflict reason')
      );
    }

    const updatedData: DependencyData = {
      sourcePackageId: this.data.sourcePackageId,
      targetPackageId: this.data.targetPackageId,
      versionConstraint: this.data.versionConstraint,
      dependencyType: this.data.dependencyType,
      isRequired: this.data.isRequired,
      resolutionStatus: status,
      ...((status === 'failed' || status === 'conflict') && conflictReason
        ? { conflictReason }
        : {}),
      ...(status === 'resolved' && this.data.resolvedVersion
        ? { resolvedVersion: this.data.resolvedVersion }
        : {}),
    };

    return Dependency.create(updatedData);
  }

  markAsResolving(): Result<Dependency, DependencyResolutionError> {
    return this.withResolutionStatus('resolving');
  }

  markAsFailed(reason: string): Result<Dependency, DependencyResolutionError> {
    return this.withResolutionStatus('failed', reason);
  }

  markAsConflicted(reason: string): Result<Dependency, DependencyResolutionError> {
    return this.withResolutionStatus('conflict', reason);
  }

  toDependencyInfo(): DependencyInfo {
    return {
      targetPackageId: this.data.targetPackageId.toString(),
      versionConstraint: this.data.versionConstraint.getConstraintString(),
      isRequired: this.data.isRequired,
      ...(this.data.resolvedVersion && { resolvedVersion: this.data.resolvedVersion }),
    };
  }

  equals(other: Dependency): boolean {
    return (
      this.data.sourcePackageId.equals(other.data.sourcePackageId) &&
      this.data.targetPackageId.equals(other.data.targetPackageId) &&
      this.data.versionConstraint.equals(other.data.versionConstraint)
    );
  }

  toJSON(): object {
    return {
      sourcePackageId: this.data.sourcePackageId.toString(),
      targetPackageId: this.data.targetPackageId.toString(),
      versionConstraint: this.data.versionConstraint.toJSON(),
      dependencyType: this.data.dependencyType,
      isRequired: this.data.isRequired,
      resolutionStatus: this.data.resolutionStatus,
      resolvedVersion: this.data.resolvedVersion,
      conflictReason: this.data.conflictReason,
    };
  }
}
