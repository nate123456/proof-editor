import { Result } from '../types/result.js';
import { PackageInstallationError } from '../types/domain-errors.js';
import { PackageId } from '../value-objects/package-id.js';
import { PackageSource } from '../value-objects/package-source.js';
import { PackageInstallationInfo } from '../types/common-types.js';

export type InstallationStatus = 'installing' | 'installed' | 'failed' | 'updating' | 'uninstalling';

export interface PackageInstallationEntityData {
  readonly packageId: PackageId;
  readonly packageVersion: string;
  readonly status: InstallationStatus;
  readonly installationInfo: PackageInstallationInfo;
  readonly installationPath: string;
  readonly errorMessage?: string;
  readonly progress?: number;
}

export class PackageInstallationEntity {
  private constructor(private readonly data: PackageInstallationEntityData) {}

  static create(data: PackageInstallationEntityData): Result<PackageInstallationEntity, PackageInstallationError> {
    if (!data.packageVersion.trim()) {
      return Result.failure(new PackageInstallationError('Package version cannot be empty'));
    }

    if (!data.installationPath.trim()) {
      return Result.failure(new PackageInstallationError('Installation path cannot be empty'));
    }

    if (data.status === 'failed' && !data.errorMessage) {
      return Result.failure(new PackageInstallationError('Failed installation must have error message'));
    }

    if (data.progress !== undefined && (data.progress < 0 || data.progress > 100)) {
      return Result.failure(new PackageInstallationError('Progress must be between 0 and 100'));
    }

    return Result.success(new PackageInstallationEntity(data));
  }

  static createForInstallation(
    packageId: PackageId,
    packageVersion: string,
    source: PackageSource,
    installationPath: string
  ): Result<PackageInstallationEntity, PackageInstallationError> {
    const installationInfo: PackageInstallationInfo = {
      installedAt: new Date(),
      installedFrom: source.asGitSource() || source.asLocalSource()!,
      isEnabled: true
    };

    const data: PackageInstallationEntityData = {
      packageId,
      packageVersion: packageVersion.trim(),
      status: 'installing',
      installationInfo,
      installationPath: installationPath.trim(),
      progress: 0
    };

    return PackageInstallationEntity.create(data);
  }

  getPackageId(): PackageId {
    return this.data.packageId;
  }

  getPackageVersion(): string {
    return this.data.packageVersion;
  }

  getStatus(): InstallationStatus {
    return this.data.status;
  }

  getInstallationInfo(): PackageInstallationInfo {
    return this.data.installationInfo;
  }

  getInstallationPath(): string {
    return this.data.installationPath;
  }

  getErrorMessage(): string | undefined {
    return this.data.errorMessage;
  }

  getProgress(): number | undefined {
    return this.data.progress;
  }

  isInstalled(): boolean {
    return this.data.status === 'installed';
  }

  isEnabled(): boolean {
    return this.data.installationInfo.isEnabled;
  }

  isFailed(): boolean {
    return this.data.status === 'failed';
  }

  isInProgress(): boolean {
    return ['installing', 'updating', 'uninstalling'].includes(this.data.status);
  }

  getInstalledAt(): Date {
    return this.data.installationInfo.installedAt;
  }

  getConfigurationOverrides(): Record<string, unknown> | undefined {
    return this.data.installationInfo.configurationOverrides;
  }

  withStatus(status: InstallationStatus, errorMessage?: string): Result<PackageInstallationEntity, PackageInstallationError> {
    if (status === 'failed' && !errorMessage) {
      return Result.failure(new PackageInstallationError('Failed status requires error message'));
    }

    const updatedData = {
      ...this.data,
      status,
      errorMessage: status === 'failed' ? errorMessage : undefined,
      progress: status === 'installed' ? 100 : this.data.progress
    };

    return PackageInstallationEntity.create(updatedData);
  }

  withProgress(progress: number): Result<PackageInstallationEntity, PackageInstallationError> {
    if (progress < 0 || progress > 100) {
      return Result.failure(new PackageInstallationError('Progress must be between 0 and 100'));
    }

    const updatedData = {
      ...this.data,
      progress
    };

    return PackageInstallationEntity.create(updatedData);
  }

  withEnabledState(isEnabled: boolean): Result<PackageInstallationEntity, PackageInstallationError> {
    const updatedInstallationInfo = {
      ...this.data.installationInfo,
      isEnabled
    };

    const updatedData = {
      ...this.data,
      installationInfo: updatedInstallationInfo
    };

    return PackageInstallationEntity.create(updatedData);
  }

  withConfigurationOverrides(overrides: Record<string, unknown>): Result<PackageInstallationEntity, PackageInstallationError> {
    const updatedInstallationInfo = {
      ...this.data.installationInfo,
      configurationOverrides: overrides
    };

    const updatedData = {
      ...this.data,
      installationInfo: updatedInstallationInfo
    };

    return PackageInstallationEntity.create(updatedData);
  }

  markAsInstalled(): Result<PackageInstallationEntity, PackageInstallationError> {
    return this.withStatus('installed');
  }

  markAsFailed(errorMessage: string): Result<PackageInstallationEntity, PackageInstallationError> {
    return this.withStatus('failed', errorMessage);
  }

  markAsUpdating(): Result<PackageInstallationEntity, PackageInstallationError> {
    return this.withStatus('updating');
  }

  markAsUninstalling(): Result<PackageInstallationEntity, PackageInstallationError> {
    return this.withStatus('uninstalling');
  }

  equals(other: PackageInstallationEntity): boolean {
    return (
      this.data.packageId.equals(other.data.packageId) &&
      this.data.packageVersion === other.data.packageVersion &&
      this.data.installationPath === other.data.installationPath
    );
  }

  toJSON(): object {
    return {
      packageId: this.data.packageId.toString(),
      packageVersion: this.data.packageVersion,
      status: this.data.status,
      installationInfo: this.data.installationInfo,
      installationPath: this.data.installationPath,
      errorMessage: this.data.errorMessage,
      progress: this.data.progress
    };
  }
}