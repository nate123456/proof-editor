import { Result } from '../types/result.js';
import { PackageNotFoundError, PackageSourceUnavailableError } from '../types/domain-errors.js';
import { PackageVersion } from '../value-objects/PackageVersion.js';
import { VersionConstraint } from '../value-objects/version-constraint.js';
import { GitPackageSource } from '../types/common-types.js';

export interface GitRefResolutionResult {
  readonly resolvedVersion: PackageVersion;
  readonly actualRef: string;
  readonly commitHash: string;
  readonly resolvedAt: Date;
}

export interface VersionResolutionResult {
  readonly bestVersion: PackageVersion;
  readonly availableVersions: readonly PackageVersion[];
  readonly satisfiesConstraint: boolean;
  readonly resolvedAt: Date;
}

export interface IGitRefProvider {
  resolveRefToCommit(gitUrl: string, ref: string): Promise<Result<{ commit: string; actualRef: string }, PackageSourceUnavailableError>>;
  listAvailableTags(gitUrl: string): Promise<Result<readonly string[], PackageSourceUnavailableError>>;
  listAvailableBranches(gitUrl: string): Promise<Result<readonly string[], PackageSourceUnavailableError>>;
  getCommitTimestamp(gitUrl: string, commit: string): Promise<Result<Date, PackageSourceUnavailableError>>;
}

export class VersionResolutionService {
  constructor(
    private readonly gitRefProvider: IGitRefProvider
  ) {}

  async resolveGitRefToVersion(gitSource: GitPackageSource): Promise<Result<GitRefResolutionResult, PackageSourceUnavailableError>> {
    const { url, ref } = gitSource;

    if (!ref.trim()) {
      return Result.failure(new PackageSourceUnavailableError('Git ref cannot be empty'));
    }

    const refResolutionResult = await this.gitRefProvider.resolveRefToCommit(url, ref);
    if (!refResolutionResult.success) {
      return Result.failure(refResolutionResult.error);
    }

    const { commit, actualRef } = refResolutionResult.data;

    const versionResult = await this.determineVersionFromRef(actualRef, url);
    if (!versionResult.success) {
      return Result.failure(new PackageSourceUnavailableError(
        `Failed to determine version from ref ${actualRef}: ${versionResult.error.message}`
      ));
    }

    const result: GitRefResolutionResult = {
      resolvedVersion: versionResult.data,
      actualRef,
      commitHash: commit,
      resolvedAt: new Date()
    };

    return Result.success(result);
  }

  async resolveVersionConstraint(
    gitUrl: string,
    constraint: VersionConstraint
  ): Promise<Result<VersionResolutionResult, PackageSourceUnavailableError | PackageNotFoundError>> {
    const availableVersionsResult = await this.getAvailableVersions(gitUrl);
    if (!availableVersionsResult.success) {
      return Result.failure(availableVersionsResult.error);
    }

    const availableVersions = availableVersionsResult.data;

    if (availableVersions.length === 0) {
      return Result.failure(new PackageNotFoundError(`No versions found for repository: ${gitUrl}`));
    }

    const satisfyingVersions = availableVersions.filter(version => 
      version.satisfiesConstraint(constraint.toString())
    );

    if (satisfyingVersions.length === 0) {
      const result: VersionResolutionResult = {
        bestVersion: availableVersions[0],
        availableVersions,
        satisfiesConstraint: false,
        resolvedAt: new Date()
      };
      return Result.success(result);
    }

    const bestVersion = this.selectBestVersion(satisfyingVersions, constraint);

    const result: VersionResolutionResult = {
      bestVersion,
      availableVersions,
      satisfiesConstraint: true,
      resolvedAt: new Date()
    };

    return Result.success(result);
  }

  async getAvailableVersions(gitUrl: string): Promise<Result<readonly PackageVersion[], PackageSourceUnavailableError>> {
    const tagsResult = await this.gitRefProvider.listAvailableTags(gitUrl);
    if (!tagsResult.success) {
      return Result.failure(tagsResult.error);
    }

    const branchesResult = await this.gitRefProvider.listAvailableBranches(gitUrl);
    if (!branchesResult.success) {
      return Result.failure(branchesResult.error);
    }

    const versions: PackageVersion[] = [];

    for (const tag of tagsResult.data) {
      const versionResult = await this.determineVersionFromRef(tag, gitUrl);
      if (versionResult.success) {
        versions.push(versionResult.data);
      }
    }

    for (const branch of branchesResult.data) {
      if (branch === 'main' || branch === 'master' || branch === 'develop') {
        const versionResult = await this.determineVersionFromRef(branch, gitUrl);
        if (versionResult.success) {
          versions.push(versionResult.data);
        }
      }
    }

    const sortedVersions = versions.sort((a, b) => {
      if (a.isPrerelease() && !b.isPrerelease()) {
        return 1;
      }
      if (!a.isPrerelease() && b.isPrerelease()) {
        return -1;
      }
      return b.compareWith(a);
    });

    return Result.success(sortedVersions);
  }

  async findLatestStableVersion(gitUrl: string): Promise<Result<PackageVersion, PackageNotFoundError | PackageSourceUnavailableError>> {
    const availableVersionsResult = await this.getAvailableVersions(gitUrl);
    if (!availableVersionsResult.success) {
      return Result.failure(availableVersionsResult.error);
    }

    const stableVersions = availableVersionsResult.data.filter(version => version.isStable());

    if (stableVersions.length === 0) {
      return Result.failure(new PackageNotFoundError(`No stable versions found for repository: ${gitUrl}`));
    }

    return Result.success(stableVersions[0]);
  }

  async findLatestVersion(gitUrl: string, includePrerelease = false): Promise<Result<PackageVersion, PackageNotFoundError | PackageSourceUnavailableError>> {
    const availableVersionsResult = await this.getAvailableVersions(gitUrl);
    if (!availableVersionsResult.success) {
      return Result.failure(availableVersionsResult.error);
    }

    const availableVersions = availableVersionsResult.data;

    if (availableVersions.length === 0) {
      return Result.failure(new PackageNotFoundError(`No versions found for repository: ${gitUrl}`));
    }

    if (!includePrerelease) {
      const stableVersions = availableVersions.filter(version => !version.isPrerelease());
      if (stableVersions.length > 0) {
        return Result.success(stableVersions[0]);
      }
    }

    return Result.success(availableVersions[0]);
  }

  private async determineVersionFromRef(ref: string, gitUrl: string): Promise<Result<PackageVersion, PackageSourceUnavailableError>> {
    if (ref.startsWith('v') && ref.match(/^v\d+\.\d+\.\d+/)) {
      return PackageVersion.create(ref.slice(1));
    }

    if (ref.match(/^\d+\.\d+\.\d+/)) {
      return PackageVersion.create(ref);
    }

    return PackageVersion.fromGitRef(ref);
  }

  private selectBestVersion(versions: readonly PackageVersion[], constraint: VersionConstraint): PackageVersion {
    const constraintStr = constraint.toString();

    if (constraintStr.startsWith('^') || constraintStr.startsWith('~')) {
      const stableVersions = versions.filter(v => !v.isPrerelease());
      if (stableVersions.length > 0) {
        return stableVersions.reduce((best, current) => 
          current.compareWith(best) > 0 ? current : best
        );
      }
    }

    return versions.reduce((best, current) => 
      current.compareWith(best) > 0 ? current : best
    );
  }

  validateVersionConstraint(constraint: string): Result<boolean, PackageSourceUnavailableError> {
    if (!constraint || !constraint.trim()) {
      return Result.failure(new PackageSourceUnavailableError('Version constraint cannot be empty'));
    }

    const normalizedConstraint = constraint.trim();
    
    const validPatterns = [
      /^\*$/,
      /^\d+\.\d+\.\d+$/,
      /^\^\d+\.\d+\.\d+/,
      /^~\d+\.\d+\.\d+/,
      /^>=?\d+\.\d+\.\d+/,
      /^<=?\d+\.\d+\.\d+/,
      /^>\d+\.\d+\.\d+/,
      /^<\d+\.\d+\.\d+/
    ];

    const isValid = validPatterns.some(pattern => pattern.test(normalizedConstraint));
    
    if (!isValid) {
      return Result.failure(new PackageSourceUnavailableError(
        `Invalid version constraint format: ${normalizedConstraint}`
      ));
    }

    return Result.success(true);
  }
}