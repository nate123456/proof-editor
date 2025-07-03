import type { Result } from 'neverthrow';

import type { Package } from '../entities/Package.js';
import type { PackageNotFoundError } from '../types/domain-errors.js';
import type { PackageId } from '../value-objects/package-id.js';
import type { PackageSource } from '../value-objects/package-source.js';

export interface IPackageRepository {
  save(packageEntity: Package): Promise<Result<void, PackageNotFoundError>>;
  findById(id: PackageId): Promise<Package | null>;
  findBySource(source: PackageSource): Promise<Result<Package, PackageNotFoundError>>;
  findByGitRepository(
    gitUrl: string,
    ref?: string,
  ): Promise<Result<readonly Package[], PackageNotFoundError>>;
  searchByKeywords(keywords: string[]): Promise<Result<readonly Package[], PackageNotFoundError>>;
  findAll(): Promise<Package[]>;
  delete(id: PackageId): Promise<Result<void, PackageNotFoundError>>;
}
