import { err, ok, type Result } from 'neverthrow';

import { type Dependency } from '../entities/Dependency.js';
import { type PackageNotFoundError } from '../types/domain-errors.js';
import { type PackageId } from '../value-objects/package-id.js';

export interface IDependencyRepository {
  findDependenciesForPackage(
    packageId: PackageId
  ): Promise<Result<readonly Dependency[], PackageNotFoundError>>;
  findPackagesThatDependOn(
    packageId: PackageId
  ): Promise<Result<readonly Dependency[], PackageNotFoundError>>;
}
