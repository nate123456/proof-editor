import { err, ok, type Result } from 'neverthrow';

import { type PackageInstallation } from '../entities/PackageInstallation.js';
import { type PackageNotFoundError } from '../types/domain-errors.js';
import { type InstallationPath } from '../value-objects/InstallationPath.js';
import { type PackageId } from '../value-objects/package-id.js';

export interface IPackageInstallationRepository {
  save(installation: PackageInstallation): Promise<Result<void, PackageNotFoundError>>;
  findById(id: string): Promise<PackageInstallation | null>;
  findByPackageId(packageId: PackageId): Promise<PackageInstallation[]>;
  findByInstallationPath(path: InstallationPath): Promise<PackageInstallation[]>;
  findActiveInstallations(): Promise<PackageInstallation[]>;
  findAll(): Promise<PackageInstallation[]>;
  delete(id: string): Promise<Result<void, PackageNotFoundError>>;
}
