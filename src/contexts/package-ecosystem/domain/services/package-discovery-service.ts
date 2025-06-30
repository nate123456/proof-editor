import { Result } from '../types/result.js';
import { PackageNotFoundError, PackageSourceUnavailableError } from '../types/domain-errors.js';
import { PackageEntity } from '../entities/package-entity.js';
import { PackageId } from '../value-objects/package-id.js';
import { PackageSource } from '../value-objects/package-source.js';
import { GitPackageSource, LocalPackageSource } from '../types/common-types.js';

export interface PackageDiscoveryResult {
  readonly packages: readonly PackageEntity[];
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

export interface IPackageRepository {
  findBySource(source: PackageSource): Promise<Result<PackageEntity, PackageNotFoundError>>;
  findByGitRepository(gitUrl: string, ref?: string): Promise<Result<readonly PackageEntity[], PackageNotFoundError>>;
  searchByKeywords(keywords: string[]): Promise<Result<readonly PackageEntity[], PackageNotFoundError>>;
}

export interface IGitPackageProvider {
  discoverFromGitHub(searchQuery: string, options?: GitPackageDiscoveryOptions): Promise<Result<readonly GitPackageSource[], PackageSourceUnavailableError>>;
  validateGitSource(source: GitPackageSource): Promise<Result<boolean, PackageSourceUnavailableError>>;
  clonePackageToTemporary(source: GitPackageSource): Promise<Result<string, PackageSourceUnavailableError>>;
}

export interface ILocalPackageProvider {
  discoverInDirectory(directoryPath: string, options?: LocalPackageDiscoveryOptions): Promise<Result<readonly LocalPackageSource[], PackageNotFoundError>>;
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
    if (!gitSourcesResult.success) {
      return Result.failure(gitSourcesResult.error);
    }

    const packages: PackageEntity[] = [];
    const maxResults = options?.maxResults || 50;
    
    for (const gitSource of gitSourcesResult.data.slice(0, maxResults)) {
      const packageSourceResult = PackageSource.createFromGit(gitSource);
      if (!packageSourceResult.success) {
        continue;
      }

      const existingPackageResult = await this.packageRepository.findBySource(packageSourceResult.data);
      if (existingPackageResult.success) {
        packages.push(existingPackageResult.data);
      }
    }

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages,
      totalFound: gitSourcesResult.data.length,
      searchQuery,
      searchTime
    };

    return Result.success(result);
  }

  async discoverPackagesInDirectory(
    directoryPath: string,
    options?: LocalPackageDiscoveryOptions
  ): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const startTime = Date.now();
    
    const localSourcesResult = await this.localProvider.discoverInDirectory(directoryPath, options);
    if (!localSourcesResult.success) {
      return Result.failure(localSourcesResult.error);
    }

    const packages: PackageEntity[] = [];
    
    for (const localSource of localSourcesResult.data) {
      const packageSourceResult = PackageSource.createFromLocal(localSource);
      if (!packageSourceResult.success) {
        continue;
      }

      const existingPackageResult = await this.packageRepository.findBySource(packageSourceResult.data);
      if (existingPackageResult.success) {
        packages.push(existingPackageResult.data);
      }
    }

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages,
      totalFound: localSourcesResult.data.length,
      searchTime
    };

    return Result.success(result);
  }

  async findPackageById(packageId: PackageId): Promise<Result<PackageEntity, PackageNotFoundError>> {
    const searchResult = await this.packageRepository.searchByKeywords([packageId.toString()]);
    if (!searchResult.success) {
      return Result.failure(searchResult.error);
    }

    const exactMatch = searchResult.data.find(pkg => pkg.getId().equals(packageId));
    if (!exactMatch) {
      return Result.failure(new PackageNotFoundError(`Package not found: ${packageId.toString()}`));
    }

    return Result.success(exactMatch);
  }

  async findPackagesByKeywords(keywords: string[]): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const startTime = Date.now();
    
    if (keywords.length === 0) {
      return Result.failure(new PackageNotFoundError('Keywords cannot be empty'));
    }

    const searchResult = await this.packageRepository.searchByKeywords(keywords);
    if (!searchResult.success) {
      return Result.failure(searchResult.error);
    }

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages: searchResult.data,
      totalFound: searchResult.data.length,
      searchTime
    };

    return Result.success(result);
  }

  async validatePackageSource(source: PackageSource): Promise<Result<boolean, PackageSourceUnavailableError | PackageNotFoundError>> {
    const gitSource = source.asGitSource();
    if (gitSource) {
      return await this.gitProvider.validateGitSource(gitSource);
    }

    const localSource = source.asLocalSource();
    if (localSource) {
      const localResult = await this.localProvider.validateLocalSource(localSource);
      if (!localResult.success) {
        return Result.failure(new PackageSourceUnavailableError(localResult.error.message));
      }
      return Result.success(localResult.data);
    }

    return Result.failure(new PackageSourceUnavailableError('Unknown package source type'));
  }

  async findPackageVersionsFromGitRepository(gitUrl: string): Promise<Result<readonly PackageEntity[], PackageNotFoundError>> {
    const normalizedUrl = gitUrl.trim();
    if (!normalizedUrl) {
      return Result.failure(new PackageNotFoundError('Git URL cannot be empty'));
    }

    return await this.packageRepository.findByGitRepository(normalizedUrl);
  }

  async findLanguagePackages(): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const keywordsResult = await this.findPackagesByKeywords(['language-server', 'lsp', 'language-package']);
    if (!keywordsResult.success) {
      return Result.failure(keywordsResult.error);
    }

    const languagePackages = keywordsResult.data.packages.filter(pkg => pkg.isLanguagePackage());

    const result: PackageDiscoveryResult = {
      packages: languagePackages,
      totalFound: languagePackages.length,
      searchTime: keywordsResult.data.searchTime
    };

    return Result.success(result);
  }

  async findPackagesWithCapability(capability: string): Promise<Result<PackageDiscoveryResult, PackageNotFoundError>> {
    const startTime = Date.now();
    
    if (!capability.trim()) {
      return Result.failure(new PackageNotFoundError('Capability cannot be empty'));
    }

    const allPackagesResult = await this.packageRepository.searchByKeywords(['*']);
    if (!allPackagesResult.success) {
      return Result.failure(allPackagesResult.error);
    }

    const packagesWithCapability = allPackagesResult.data.filter(pkg => 
      pkg.supportsCapability(capability)
    );

    const searchTime = Date.now() - startTime;

    const result: PackageDiscoveryResult = {
      packages: packagesWithCapability,
      totalFound: packagesWithCapability.length,
      searchTime
    };

    return Result.success(result);
  }
}