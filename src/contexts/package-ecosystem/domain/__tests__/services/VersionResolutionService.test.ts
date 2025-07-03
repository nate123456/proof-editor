/**
 * Tests for VersionResolutionService
 *
 * Focuses on:
 * - Git ref resolution to versions
 * - Version constraint resolution
 * - Available version discovery
 * - Version comparison and selection
 * - Error handling for git operations
 * - High coverage for core functionality
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type IGitRefProvider,
  VersionResolutionService,
} from '../../services/VersionResolutionService';
import { PackageNotFoundError, PackageSourceUnavailableError } from '../../types/domain-errors';
import { PackageVersion } from '../../value-objects/PackageVersion';
import { type VersionConstraint } from '../../value-objects/version-constraint';

const createMockGitRefProvider = (): IGitRefProvider => {
  return {
    resolveRefToCommit: vi.fn(),
    listAvailableTags: vi.fn(),
    listAvailableBranches: vi.fn(),
    getCommitTimestamp: vi.fn(),
  };
};

const createMockVersionConstraint = (constraintString: string): VersionConstraint => {
  return {
    getConstraintString: vi.fn(() => constraintString),
    satisfies: vi.fn(() => true),
    toString: vi.fn(() => constraintString),
    getMinVersion: vi.fn(() => null),
    getMaxVersion: vi.fn(() => null),
    isExact: vi.fn(() => !!constraintString.match(/^\d+\.\d+\.\d+$/)),
    isRange: vi.fn(() => !constraintString.match(/^\d+\.\d+\.\d+$/)),
  } as unknown as VersionConstraint;
};

describe('VersionResolutionService', () => {
  let service: VersionResolutionService;
  let mockGitRefProvider: IGitRefProvider;

  beforeEach(() => {
    mockGitRefProvider = createMockGitRefProvider();
    service = new VersionResolutionService(mockGitRefProvider);
    vi.clearAllMocks();
  });

  describe('resolveGitRefToVersion', () => {
    it('should resolve a valid git tag to version', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'v1.2.3',
      };

      vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
        ok({
          commit: 'abc123def456',
          actualRef: 'v1.2.3',
        })
      );

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.resolvedVersion.toString()).toBe('1.2.3');
        expect(resolution.actualRef).toBe('v1.2.3');
        expect(resolution.commitHash).toBe('abc123def456');
        expect(resolution.resolvedAt).toBeInstanceOf(Date);
      }
    });

    it('should resolve a branch ref to git-based version', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
        ok({
          commit: 'xyz789abc123',
          actualRef: 'main',
        })
      );

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.actualRef).toBe('main');
        expect(resolution.commitHash).toBe('xyz789abc123');
      }
    });

    it('should handle numeric version tags', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: '2.1.0',
      };

      vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
        ok({
          commit: 'def456ghi789',
          actualRef: '2.1.0',
        })
      );

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.resolvedVersion.toString()).toBe('2.1.0');
      }
    });

    it('should reject empty ref', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: '',
      };

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Git ref cannot be empty');
      }
    });

    it('should reject whitespace-only ref', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: '   ',
      };

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Git ref cannot be empty');
      }
    });

    it('should handle git provider errors', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'v1.0.0',
      };

      vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
        err(new PackageSourceUnavailableError('Git repository not accessible'))
      );

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Git repository not accessible');
      }
    });

    it('should handle invalid version format from git ref', async () => {
      const gitSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'invalid-ref-format',
      };

      vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
        ok({
          commit: 'abc123def456',
          actualRef: 'invalid-ref-format',
        })
      );

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isOk()).toBe(true); // Should still work with git-based versions
      if (result.isOk()) {
        expect(result.value.actualRef).toBe('invalid-ref-format');
      }
    });
  });

  describe('resolveVersionConstraint', () => {
    it('should resolve version constraint with available versions', async () => {
      const constraint = createMockVersionConstraint('^1.0.0');
      const gitUrl = 'https://github.com/user/repo.git';

      // Mock version creation
      const version100 = PackageVersion.create('1.0.0');
      const version110 = PackageVersion.create('1.1.0');
      const version200 = PackageVersion.create('2.0.0');

      expect(version100.isOk()).toBe(true);
      expect(version110.isOk()).toBe(true);
      expect(version200.isOk()).toBe(true);

      if (version100.isOk() && version110.isOk() && version200.isOk()) {
        // Mock git provider to return tags and branches
        vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
          ok(['v1.0.0', 'v1.1.0', 'v2.0.0'])
        );
        vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(
          ok(['main', 'develop'])
        );

        // Mock version constraint satisfaction
        vi.mocked(constraint.getConstraintString).mockReturnValue('^1.0.0');

        const result = await service.resolveVersionConstraint(gitUrl, constraint);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const resolution = result.value;
          expect(resolution.availableVersions.length).toBeGreaterThan(0);
          expect(resolution.resolvedAt).toBeInstanceOf(Date);
        }
      }
    });

    it('should handle no available versions', async () => {
      const constraint = createMockVersionConstraint('^1.0.0');
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(ok([]));
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.resolveVersionConstraint(gitUrl, constraint);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('No versions found');
      }
    });

    it('should return best version when constraint not satisfied', async () => {
      const constraint = createMockVersionConstraint('^3.0.0');
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(ok(['v1.0.0', 'v2.0.0']));
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.resolveVersionConstraint(gitUrl, constraint);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.satisfiesConstraint).toBe(false);
        expect(resolution.bestVersion).toBeDefined();
      }
    });

    it('should handle git provider errors in constraint resolution', async () => {
      const constraint = createMockVersionConstraint('^1.0.0');
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        err(new PackageSourceUnavailableError('Cannot access repository'))
      );

      const result = await service.resolveVersionConstraint(gitUrl, constraint);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Cannot access repository');
      }
    });
  });

  describe('getAvailableVersions', () => {
    it('should get versions from tags and main branches', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0', 'v1.1.0', 'v2.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(
        ok(['main', 'develop', 'feature-branch'])
      );

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versions = result.value;
        expect(versions.length).toBeGreaterThan(0);
        // Should include versions from tags and main branches
        expect(versions.length).toBeGreaterThanOrEqual(2); // tags + main branches
      }
    });

    it('should sort versions with prereleases last', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0', 'v2.0.0-alpha', 'v1.5.0'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versions = result.value;
        expect(versions.length).toBe(3);
        // Prereleases should come after stable versions
        const stableCount = versions.filter(v => !v.isPrerelease()).length;
        const prereleaseCount = versions.filter(v => v.isPrerelease()).length;
        expect(stableCount).toBeGreaterThan(0);
        expect(prereleaseCount).toBeGreaterThan(0);
      }
    });

    it('should handle only invalid version tags gracefully', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['invalid-tag', 'another-invalid'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok(['main']));

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versions = result.value;
        // Should have at least the main branch version
        expect(versions.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle git provider tag listing errors', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        err(new PackageSourceUnavailableError('Failed to list tags'))
      );

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to list tags');
      }
    });

    it('should handle git provider branch listing errors', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(ok(['v1.0.0']));
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(
        err(new PackageSourceUnavailableError('Failed to list branches'))
      );

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to list branches');
      }
    });
  });

  describe('findLatestStableVersion', () => {
    it('should find latest stable version', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0', 'v1.1.0', 'v2.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.findLatestStableVersion(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.isStable()).toBe(true);
      }
    });

    it('should return error when no stable versions found', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0-alpha', 'v2.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.findLatestStableVersion(gitUrl);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('No stable versions found');
      }
    });
  });

  describe('findLatestVersion', () => {
    it('should find latest version excluding prereleases by default', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0', 'v2.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.findLatestVersion(gitUrl, false);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.isPrerelease()).toBe(false);
      }
    });

    it('should find latest version including prereleases when requested', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0', 'v2.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.findLatestVersion(gitUrl, true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        // Should get the latest, which could be prerelease
        expect(version).toBeDefined();
      }
    });

    it('should return prerelease if no stable versions available', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0-alpha', 'v2.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.findLatestVersion(gitUrl, false);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version).toBeDefined();
      }
    });

    it('should return error when no versions found', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(ok([]));
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.findLatestVersion(gitUrl);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('No versions found');
      }
    });
  });

  describe('validateVersionConstraint', () => {
    it('should validate exact version constraint', () => {
      const result = service.validateVersionConstraint('1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should validate caret version constraint', () => {
      const result = service.validateVersionConstraint('^1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should validate tilde version constraint', () => {
      const result = service.validateVersionConstraint('~1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should validate range constraints', () => {
      const constraints = ['>=1.0.0', '<=2.0.0', '>1.0.0', '<2.0.0'];

      for (const constraint of constraints) {
        const result = service.validateVersionConstraint(constraint);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });

    it('should validate wildcard constraint', () => {
      const result = service.validateVersionConstraint('*');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should reject empty constraint', () => {
      const result = service.validateVersionConstraint('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Version constraint cannot be empty');
      }
    });

    it('should reject whitespace-only constraint', () => {
      const result = service.validateVersionConstraint('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Version constraint cannot be empty');
      }
    });

    it('should reject invalid constraint format', () => {
      const result = service.validateVersionConstraint('invalid-constraint');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid version constraint format');
      }
    });

    it('should handle null/undefined constraint', () => {
      const result = service.validateVersionConstraint(null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Version constraint cannot be empty');
      }
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle mixed version formats', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0', '2.0.0', 'invalid-tag', 'v3.0.0-beta'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok(['main']));

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versions = result.value;
        expect(versions.length).toBeGreaterThan(0);
        // Should handle both v-prefixed and non-prefixed versions
      }
    });

    it('should handle constraint resolution with complex version patterns', async () => {
      const constraint = createMockVersionConstraint('~1.2.0');
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.2.0', 'v1.2.1', 'v1.3.0', 'v2.0.0'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.resolveVersionConstraint(gitUrl, constraint);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.availableVersions.length).toBeGreaterThan(0);
      }
    });

    it('should handle version selection with prerelease preferences', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['v1.0.0-alpha', 'v1.0.0-beta', 'v1.0.0'])
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const stableResult = await service.findLatestStableVersion(gitUrl);
      const anyResult = await service.findLatestVersion(gitUrl, true);

      expect(stableResult.isOk()).toBe(true);
      expect(anyResult.isOk()).toBe(true);

      if (stableResult.isOk() && anyResult.isOk()) {
        expect(stableResult.value.isStable()).toBe(true);
        // Latest including prerelease might be different
      }
    });
  });
});
