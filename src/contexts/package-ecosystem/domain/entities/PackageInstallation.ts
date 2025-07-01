import { err, ok, type Result } from 'neverthrow';

import type { PackageInstallationInfo } from '../types/common-types.js';
import { PackageInstallationError } from '../types/domain-errors.js';
import { type PackageId } from '../value-objects/package-id.js';
import { type PackageSource } from '../value-objects/package-source.js';

export type InstallationStatus =
  | 'installing'
  | 'installed'
  | 'failed'
  | 'updating'
  | 'uninstalling';

export interface PackageInstallationData {
  readonly packageId: PackageId;
  readonly packageVersion: string;
  readonly status: InstallationStatus;
  readonly installationInfo: PackageInstallationInfo;
  readonly installationPath: string;
  readonly errorMessage?: string;
  readonly progress?: number;
}

export class PackageInstallation {
  private constructor(private readonly data: PackageInstallationData) {}

  static create(
    data: PackageInstallationData
  ): Result<PackageInstallation, PackageInstallationError> {
    if (!data.packageVersion.trim()) {
      return err(new PackageInstallationError('Package version cannot be empty'));
    }

    if (!data.installationPath.trim()) {
      return err(new PackageInstallationError('Installation path cannot be empty'));
    }

    if (data.status === 'failed' && !data.errorMessage) {
      return err(new PackageInstallationError('Failed installation must have error message'));
    }

    if (data.progress !== undefined && (data.progress < 0 || data.progress > 100)) {
      return err(new PackageInstallationError('Progress must be between 0 and 100'));
    }

    return ok(new PackageInstallation(data));
  }

  static createForInstallation(
    packageId: PackageId,
    packageVersion: string,
    source: PackageSource,
    installationPath: string
  ): Result<PackageInstallation, PackageInstallationError> {
    const installationInfo: PackageInstallationInfo = {
      installedAt: new Date(),
      installedFrom: source.asGitSource() || source.asLocalSource()!,
      isEnabled: true,
    };

    const data: PackageInstallationData = {
      packageId,
      packageVersion: packageVersion.trim(),
      status: 'installing',
      installationInfo,
      installationPath: installationPath.trim(),
      progress: 0,
    };

    return PackageInstallation.create(data);
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

  withStatus(
    status: InstallationStatus,
    errorMessage?: string
  ): Result<PackageInstallation, PackageInstallationError> {
    if (status === 'failed' && !errorMessage) {
      return err(new PackageInstallationError('Failed status requires error message'));
    }

    const updatedData: PackageInstallationData = {
      packageId: this.data.packageId,
      packageVersion: this.data.packageVersion,
      installationInfo: this.data.installationInfo,
      installationPath: this.data.installationPath,
      status,
      ...(status === 'failed' && errorMessage ? { errorMessage } : {}),
      ...(this.data.progress !== undefined
        ? { progress: status === 'installed' ? 100 : this.data.progress }
        : {}),
    };

    return PackageInstallation.create(updatedData);
  }

  withProgress(progress: number): Result<PackageInstallation, PackageInstallationError> {
    if (progress < 0 || progress > 100) {
      return err(new PackageInstallationError('Progress must be between 0 and 100'));
    }

    const updatedData = {
      ...this.data,
      progress,
    };

    return PackageInstallation.create(updatedData);
  }

  withEnabledState(isEnabled: boolean): Result<PackageInstallation, PackageInstallationError> {
    const updatedInstallationInfo = {
      ...this.data.installationInfo,
      isEnabled,
    };

    const updatedData = {
      ...this.data,
      installationInfo: updatedInstallationInfo,
    };

    return PackageInstallation.create(updatedData);
  }

  withConfigurationOverrides(
    overrides: Record<string, unknown>
  ): Result<PackageInstallation, PackageInstallationError> {
    const updatedInstallationInfo = {
      ...this.data.installationInfo,
      configurationOverrides: overrides,
    };

    const updatedData = {
      ...this.data,
      installationInfo: updatedInstallationInfo,
    };

    return PackageInstallation.create(updatedData);
  }

  markAsInstalled(): Result<PackageInstallation, PackageInstallationError> {
    return this.withStatus('installed');
  }

  markAsFailed(errorMessage: string): Result<PackageInstallation, PackageInstallationError> {
    return this.withStatus('failed', errorMessage);
  }

  markAsUpdating(): Result<PackageInstallation, PackageInstallationError> {
    return this.withStatus('updating');
  }

  markAsUninstalling(): Result<PackageInstallation, PackageInstallationError> {
    return this.withStatus('uninstalling');
  }

  equals(other: PackageInstallation): boolean {
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
      progress: this.data.progress,
    };
  }
}
