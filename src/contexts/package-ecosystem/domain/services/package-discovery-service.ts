import { err, ok, type Result } from 'neverthrow';

import { type Package } from '../entities/Package.js';
import { type IPackageRepository } from '../repositories/IPackageRepository.js';
import type { GitPackageSource, LocalPackageSource } from '../types/common-types.js';
import { PackageNotFoundError, PackageSourceUnavailableError } from '../types/domain-errors.js';
import { type PackageId } from '../value-objects/package-id.js';
import { PackageSource } from '../value-objects/package-source.js';

export interface PackageDiscoveryResult {
  readonly packages: readonly Package[];
  readonly totalFound: number;
  readonly searchQuery?: string;
  readonly searchTime: number;
}

export interface GitPackageDiscoveryOptions {
  readonly includePrerelease?: boolean;
  readonly onlyVerified?: boolean;
  readonly maxResults?: number;
  readonly timeoutMs?: number;
}

export interface LocalPackageDiscoveryOptions {
  readonly recursive?: boolean;
  readonly includeHidden?: boolean;
  readonly maxDepth?: number;
}

export interface IGitPackageProvider {
  discoverFromGitHub(
    searchQuery: string,
    options?: GitPackageDiscoveryOptions
  ): Promise<Result<readonly GitPackageSource[], PackageSourceUnavailableError>>;
  validateGitSource(
    source: GitPackageSource
  ): Promise<Result<boolean, PackageSourceUnavailableError>>;
  clonePackageToTemporary(
    source: GitPackageSource
  ): Promise<Result<string, PackageSourceUnavailableError>>;
}

export interface ILocalPackageProvider {
  discoverInDirectory(
    directoryPath: string,
    options?: LocalPackageDiscoveryOptions
  ): Promise<Result<readonly LocalPackageSource[], PackageNotFoundError>>;
  validateLocalSource(source: LocalPackageSource): Promise<Result<boolean, PackageNotFoundError>>;
}

export class PackageDiscoveryService {
  constructor(
    private readonly packageRepository: IPackageRepository,
    private readonly gitProvider: IGitPackageProvider,
    private readonly localProvider: ILocalPackageProvider
  ) {}

  async discoverPackagesFromGitHub(
    searchQuery: string,
    options?: GitPackageDiscoveryOptions
  ): Promise<Result<PackageDiscoveryResult, PackageSourceUnavailableError>> {
    const startTime = Date.now();

    const gitSourcesResult = await this.gitProvider.discoverFromGitHub(searchQuery, options);
    if (gitSourcesResult.isErr()) {
      return err(gitSourcesResult.error);
    }

    const packages: Package[] = [];
    const maxResults = options?.maxResults || 50;

    for (const gitSource of gitSourcesResult.value.slice(0, maxResults)) {
      const packageSourceResult = PackageSource.createFromGit(gitSource);
      if (packageSourceResult.isErr()) {
        continue;
      }

      const existingPackageResult = await this.packageRepository.findBySource(
        packageSourceResult.value
      );
      if (existingPackageResult.isOk()) {
        packages.push(existingPackageResult.value);
      }
    }

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages,
      totalFound: gitSourcesResult.value.length,
      searchQuery,
      searchTime,
    };

    return ok(result);
  }

  async discoverPackagesInDirectory(
    directoryPath: string,
    options?: LocalPackageDiscoveryOptions
  ): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const startTime = Date.now();

    const localSourcesResult = await this.localProvider.discoverInDirectory(directoryPath, options);
    if (localSourcesResult.isErr()) {
      return err(localSourcesResult.error);
    }

    const packages: Package[] = [];

    for (const localSource of localSourcesResult.value) {
      const packageSourceResult = PackageSource.createFromLocal(localSource);
      if (packageSourceResult.isErr()) {
        continue;
      }

      const existingPackageResult = await this.packageRepository.findBySource(
        packageSourceResult.value
      );
      if (existingPackageResult.isOk()) {
        packages.push(existingPackageResult.value);
      }
    }

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages,
      totalFound: localSourcesResult.value.length,
      searchTime,
    };

    return ok(result);
  }

  async findPackageById(packageId: PackageId): Promise<Result<Package, PackageNotFoundError>> {
    const searchResult = await this.packageRepository.searchByKeywords([packageId.toString()]);
    if (searchResult.isErr()) {
      return err(searchResult.error);
    }

    const exactMatch = searchResult.value.find(pkg => pkg.getId().equals(packageId));
    if (!exactMatch) {
      return err(new PackageNotFoundError(`Package not found: ${packageId.toString()}`));
    }

    return ok(exactMatch);
  }

  async findPackagesByKeywords(
    keywords: string[]
  ): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const startTime = Date.now();

    if (keywords.length === 0) {
      return err(new PackageNotFoundError('Keywords cannot be empty'));
    }

    const searchResult = await this.packageRepository.searchByKeywords(keywords);
    if (searchResult.isErr()) {
      return err(searchResult.error);
    }

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages: searchResult.value,
      totalFound: searchResult.value.length,
      searchTime,
    };

    return ok(result);
  }

  async validatePackageSource(
    source: PackageSource
  ): Promise<Result<boolean, PackageSourceUnavailableError | PackageNotFoundError>> {
    const gitSource = source.asGitSource();
    if (gitSource) {
      return await this.gitProvider.validateGitSource(gitSource);
    }

    const localSource = source.asLocalSource();
    if (localSource) {
      const localResult = await this.localProvider.validateLocalSource(localSource);
      if (localResult.isErr()) {
        return err(new PackageSourceUnavailableError(localResult.error.message));
      }
      return ok(localResult.value);
    }

    return err(new PackageSourceUnavailableError('Unknown package source type'));
  }

  async findPackageVersionsFromGitRepository(
    gitUrl: string
  ): Promise<Result<readonly Package[], PackageNotFoundError>> {
    const normalizedUrl = gitUrl.trim();
    if (!normalizedUrl) {
      return err(new PackageNotFoundError('Git URL cannot be empty'));
    }

    return await this.packageRepository.findByGitRepository(normalizedUrl);
  }

  async findLanguagePackages(): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const keywordsResult = await this.findPackagesByKeywords([
      'language-server',
      'lsp',
      'language-package',
    ]);
    if (keywordsResult.isErr()) {
      return err(keywordsResult.error);
    }

    const languagePackages = keywordsResult.value.packages.filter((pkg: Package) =>
      pkg.isLanguagePackage()
    );

    const result: PackageDiscoveryResult = {
      packages: languagePackages,
      totalFound: languagePackages.length,
      searchTime: keywordsResult.value.searchTime,
    };

    return ok(result);
  }

  async findPackagesWithCapability(
    capability: string
  ): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const startTime = Date.now();

    if (!capability.trim()) {
      return err(new PackageNotFoundError('Capability cannot be empty'));
    }

    const allPackagesResult = await this.packageRepository.searchByKeywords(['*']);
    if (allPackagesResult.isErr()) {
      return err(allPackagesResult.error);
    }

    const packagesWithCapability = allPackagesResult.value.filter(pkg =>
      pkg.supportsCapability(capability)
    );

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages: packagesWithCapability,
      totalFound: packagesWithCapability.length,
      searchTime,
    };

    return ok(result);
  }
}
