import { Result } from '../types/result.js';
import { DependencyResolutionError } from '../types/domain-errors.js';
import { PackageId } from '../value-objects/package-id.js';
import { VersionConstraint } from '../value-objects/version-constraint.js';
import { DependencyInfo } from '../types/common-types.js';

export type DependencyType = 'runtime' | 'development' | 'optional' | 'peer';
export type ResolutionStatus = 'unresolved' | 'resolving' | 'resolved' | 'failed' | 'conflict';

export interface DependencyEntityData {
  readonly sourcePackageId: PackageId;
  readonly targetPackageId: PackageId;
  readonly versionConstraint: VersionConstraint;
  readonly dependencyType: DependencyType;
  readonly isRequired: boolean;
  readonly resolutionStatus: ResolutionStatus;
  readonly resolvedVersion?: string;
  readonly conflictReason?: string;
}

export class DependencyEntity {
  private constructor(private readonly data: DependencyEntityData) {}

  static create(data: DependencyEntityData): Result<DependencyEntity, DependencyResolutionError> {
    if (data.sourcePackageId.equals(data.targetPackageId)) {
      return Result.failure(new DependencyResolutionError(
        'Package cannot depend on itself'
      ));
    }

    if (data.resolutionStatus === 'resolved' && !data.resolvedVersion) {
      return Result.failure(new DependencyResolutionError(
        'Resolved dependency must have resolved version'
      ));
    }

    if (data.resolutionStatus === 'failed' && !data.conflictReason) {
      return Result.failure(new DependencyResolutionError(
        'Failed dependency must have conflict reason'
      ));
    }

    if (data.resolutionStatus === 'conflict' && !data.conflictReason) {
      return Result.failure(new DependencyResolutionError(
        'Conflicted dependency must have conflict reason'
      ));
    }

    if (data.dependencyType === 'optional' && data.isRequired) {
      return Result.failure(new DependencyResolutionError(
        'Optional dependency cannot be required'
      ));
    }

    return Result.success(new DependencyEntity(data));
  }

  static createFromDependencyInfo(
    sourcePackageId: PackageId,
    dependencyInfo: DependencyInfo,
    dependencyType: DependencyType = 'runtime'
  ): Result<DependencyEntity, DependencyResolutionError> {
    const targetPackageIdResult = PackageId.create(dependencyInfo.targetPackageId);
    if (!targetPackageIdResult.success) {
      return Result.failure(new DependencyResolutionError(
        `Invalid target package ID: ${targetPackageIdResult.error.message}`
      ));
    }

    const versionConstraintResult = VersionConstraint.create(dependencyInfo.versionConstraint);
    if (!versionConstraintResult.success) {
      return Result.failure(new DependencyResolutionError(
        `Invalid version constraint: ${versionConstraintResult.error.message}`
      ));
    }

    const data: DependencyEntityData = {
      sourcePackageId,
      targetPackageId: targetPackageIdResult.data,
      versionConstraint: versionConstraintResult.data,
      dependencyType,
      isRequired: dependencyInfo.isRequired,
      resolutionStatus: dependencyInfo.resolvedVersion ? 'resolved' : 'unresolved',
      resolvedVersion: dependencyInfo.resolvedVersion
    };

    return DependencyEntity.create(data);
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
    if (!satisfiesResult.success) {
      return Result.failure(new DependencyResolutionError(
        `Cannot check version satisfaction: ${satisfiesResult.error.message}`
      ));
    }

    return Result.success(satisfiesResult.data);
  }

  withResolvedVersion(version: string): Result<DependencyEntity, DependencyResolutionError> {
    const canSatisfyResult = this.canSatisfyVersion(version);
    if (!canSatisfyResult.success) {
      return Result.failure(canSatisfyResult.error);
    }

    if (!canSatisfyResult.data) {
      return Result.failure(new DependencyResolutionError(
        `Version ${version} does not satisfy constraint ${this.data.versionConstraint.getConstraintString()}`
      ));
    }

    const updatedData = {
      ...this.data,
      resolutionStatus: 'resolved' as const,
      resolvedVersion: version,
      conflictReason: undefined
    };

    return DependencyEntity.create(updatedData);
  }

  withResolutionStatus(status: ResolutionStatus, conflictReason?: string): Result<DependencyEntity, DependencyResolutionError> {
    if ((status === 'failed' || status === 'conflict') && !conflictReason) {
      return Result.failure(new DependencyResolutionError(
        'Failed or conflicted status requires conflict reason'
      ));
    }

    const updatedData = {
      ...this.data,
      resolutionStatus: status,
      conflictReason: (status === 'failed' || status === 'conflict') ? conflictReason : undefined,
      resolvedVersion: status === 'resolved' ? this.data.resolvedVersion : undefined
    };

    return DependencyEntity.create(updatedData);
  }

  markAsResolving(): Result<DependencyEntity, DependencyResolutionError> {
    return this.withResolutionStatus('resolving');
  }

  markAsFailed(reason: string): Result<DependencyEntity, DependencyResolutionError> {
    return this.withResolutionStatus('failed', reason);
  }

  markAsConflicted(reason: string): Result<DependencyEntity, DependencyResolutionError> {
    return this.withResolutionStatus('conflict', reason);
  }

  toDependencyInfo(): DependencyInfo {
    return {
      targetPackageId: this.data.targetPackageId.toString(),
      versionConstraint: this.data.versionConstraint.getConstraintString(),
      isRequired: this.data.isRequired,
      resolvedVersion: this.data.resolvedVersion
    };
  }

  equals(other: DependencyEntity): boolean {
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
      conflictReason: this.data.conflictReason
    };
  }
}