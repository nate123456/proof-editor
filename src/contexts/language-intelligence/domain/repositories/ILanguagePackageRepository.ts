import type { Result } from 'neverthrow';

import type { LanguagePackage } from '../entities/LanguagePackage';
import type { RepositoryError } from '../errors/DomainErrors';
import type { LanguagePackageId } from '../value-objects/LanguagePackageId';
import type { PackageName } from '../value-objects/PackageName';
import type { PackageVersion } from '../value-objects/PackageVersion';

export interface ILanguagePackageRepository {
  save(languagePackage: LanguagePackage): Promise<Result<void, RepositoryError>>;
  findById(id: LanguagePackageId): Promise<LanguagePackage | null>;
  findByName(name: PackageName): Promise<LanguagePackage | null>;
  findByNameAndVersion(name: PackageName, version: PackageVersion): Promise<LanguagePackage | null>;
  findActivePackages(): Promise<LanguagePackage[]>;
  findByCapability(capability: string): Promise<LanguagePackage[]>;
  findAll(): Promise<LanguagePackage[]>;
  delete(id: LanguagePackageId): Promise<Result<void, RepositoryError>>;
}
