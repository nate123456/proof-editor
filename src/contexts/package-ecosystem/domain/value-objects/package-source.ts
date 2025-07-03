import { err, ok, type Result } from 'neverthrow';

import type { GitPackageSource, LocalPackageSource } from '../types/common-types.js';
import { PackageValidationError } from '../types/domain-errors.js';

export type PackageSourceType = 'git' | 'local';

export class PackageSource {
  private constructor(
    private readonly type: PackageSourceType,
    private readonly source: GitPackageSource | LocalPackageSource,
  ) {}

  static createFromGit(gitSource: GitPackageSource): Result<PackageSource, PackageValidationError> {
    if (!gitSource.url.trim()) {
      return err(new PackageValidationError('Git URL cannot be empty'));
    }

    if (!gitSource.ref.trim()) {
      return err(new PackageValidationError('Git ref cannot be empty'));
    }

    const normalizedUrl = gitSource.url.trim();
    const normalizedRef = gitSource.ref.trim();

    if (!PackageSource.isValidGitUrl(normalizedUrl)) {
      return err(new PackageValidationError('Invalid Git URL format'));
    }

    if (!PackageSource.isValidGitRef(normalizedRef)) {
      return err(new PackageValidationError('Invalid Git ref format'));
    }

    const trimmedPath = gitSource.path?.trim();
    const normalizedSource: GitPackageSource = {
      url: normalizedUrl,
      ref: normalizedRef,
      ...(trimmedPath ? { path: trimmedPath } : {}),
    };

    return ok(new PackageSource('git', normalizedSource));
  }

  static createFromLocal(
    localSource: LocalPackageSource,
  ): Result<PackageSource, PackageValidationError> {
    if (!localSource.path.trim()) {
      return err(new PackageValidationError('Local path cannot be empty'));
    }

    const normalizedPath = localSource.path.trim();

    if (!PackageSource.isValidLocalPath(normalizedPath)) {
      return err(new PackageValidationError('Invalid local path'));
    }

    const normalizedSource: LocalPackageSource = {
      path: normalizedPath,
    };

    return ok(new PackageSource('local', normalizedSource));
  }

  getType(): PackageSourceType {
    return this.type;
  }

  asGitSource(): GitPackageSource | null {
    return this.type === 'git' ? (this.source as GitPackageSource) : null;
  }

  asLocalSource(): LocalPackageSource | null {
    return this.type === 'local' ? (this.source as LocalPackageSource) : null;
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
    return this.type === other.type && this.getIdentifier() === other.getIdentifier();
  }

  private static isValidGitUrl(url: string): boolean {
    // Standard URL protocols
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'git:', 'ssh:'].includes(parsed.protocol);
    } catch {
      // SSH shorthand format: git@host:user/repo.git
      if (/^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+:[a-zA-Z0-9_./+-]+$/.test(url)) {
        return true;
      }

      // GitHub shorthand: user/repo
      if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(url)) {
        return true;
      }

      // Domain shorthand: domain.com/user/repo
      if (/^[a-zA-Z0-9_.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9_./+-]+$/.test(url)) {
        return true;
      }

      return false;
    }
  }

  private static isValidGitRef(ref: string): boolean {
    if (ref.length > 250) return false;

    // Check for control characters (ASCII 0-31 and 127) and git-invalid characters
    // Using string methods instead of regex to avoid Biome control character warning
    const hasControlChars = ref.split('').some((char) => {
      const code = char.charCodeAt(0);
      return (code >= 0 && code <= 31) || code === 127;
    });
    const hasInvalidChars = /[~^:?*[\\ ]/.test(ref);
    if (hasControlChars || hasInvalidChars) return false;

    if (ref.startsWith('.') || ref.endsWith('.')) return false;
    if (ref.includes('..')) return false;
    if (ref.endsWith('.lock')) return false;

    return true;
  }

  private static isValidLocalPath(path: string): boolean {
    if (path.length > 4096) return false;

    // Check for control characters (ASCII 0-31 and 127)
    // Using string methods instead of regex to avoid Biome control character warning
    const hasControlChars = path.split('').some((char) => {
      const code = char.charCodeAt(0);
      return (code >= 0 && code <= 31) || code === 127;
    });

    return !hasControlChars;
  }

  toJSON(): object {
    return {
      type: this.type,
      source: this.source,
    };
  }
}
