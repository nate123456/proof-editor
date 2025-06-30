import { Result } from '../types/result.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { GitPackageSource, LocalPackageSource } from '../types/common-types.js';

export type PackageSourceType = 'git' | 'local';

export class PackageSource {
  private constructor(
    private readonly type: PackageSourceType,
    private readonly source: GitPackageSource | LocalPackageSource
  ) {}

  static createFromGit(gitSource: GitPackageSource): Result<PackageSource, PackageValidationError> {
    if (!gitSource.url.trim()) {
      return Result.failure(new PackageValidationError('Git URL cannot be empty'));
    }

    if (!gitSource.ref.trim()) {
      return Result.failure(new PackageValidationError('Git ref cannot be empty'));
    }

    const normalizedUrl = gitSource.url.trim();
    const normalizedRef = gitSource.ref.trim();

    if (!this.isValidGitUrl(normalizedUrl)) {
      return Result.failure(new PackageValidationError('Invalid Git URL format'));
    }

    if (!this.isValidGitRef(normalizedRef)) {
      return Result.failure(new PackageValidationError('Invalid Git ref format'));
    }

    const normalizedSource: GitPackageSource = {
      url: normalizedUrl,
      ref: normalizedRef,
      path: gitSource.path?.trim() || undefined
    };

    return Result.success(new PackageSource('git', normalizedSource));
  }

  static createFromLocal(localSource: LocalPackageSource): Result<PackageSource, PackageValidationError> {
    if (!localSource.path.trim()) {
      return Result.failure(new PackageValidationError('Local path cannot be empty'));
    }

    const normalizedPath = localSource.path.trim();

    if (!this.isValidLocalPath(normalizedPath)) {
      return Result.failure(new PackageValidationError('Invalid local path'));
    }

    const normalizedSource: LocalPackageSource = {
      path: normalizedPath
    };

    return Result.success(new PackageSource('local', normalizedSource));
  }

  getType(): PackageSourceType {
    return this.type;
  }

  asGitSource(): GitPackageSource | null {
    return this.type === 'git' ? this.source as GitPackageSource : null;
  }

  asLocalSource(): LocalPackageSource | null {
    return this.type === 'local' ? this.source as LocalPackageSource : null;
  }

  getIdentifier(): string {
    if (this.type === 'git') {
      const git = this.source as GitPackageSource;
      return `git:${git.url}@${git.ref}${git.path ? `#${git.path}` : ''}`;
    } else {
      const local = this.source as LocalPackageSource;
      return `local:${local.path}`;
    }
  }

  equals(other: PackageSource): boolean {
    return (
      this.type === other.type &&
      this.getIdentifier() === other.getIdentifier()
    );
  }

  private static isValidGitUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'git:', 'ssh:'].includes(parsed.protocol);
    } catch {
      return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(url);
    }
  }

  private static isValidGitRef(ref: string): boolean {
    if (ref.length > 250) return false;
    
    const invalidChars = /[\x00-\x1f\x7f~^:?*[\\ ]/;
    if (invalidChars.test(ref)) return false;
    
    if (ref.startsWith('.') || ref.endsWith('.')) return false;
    if (ref.includes('..')) return false;
    if (ref.endsWith('.lock')) return false;
    
    return true;
  }

  private static isValidLocalPath(path: string): boolean {
    if (path.length > 4096) return false;
    
    const invalidChars = /[\x00-\x1f\x7f]/;
    return !invalidChars.test(path);
  }

  toJSON(): object {
    return {
      type: this.type,
      source: this.source
    };
  }
}