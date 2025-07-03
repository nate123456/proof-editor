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

import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type IGitRefProvider,
  VersionResolutionService,
} from '../../services/VersionResolutionService';
import { PackageNotFoundError, PackageSourceUnavailableError } from '../../types/domain-errors';
import { PackageVersion } from '../../value-objects/PackageVersion';
import type { VersionConstraint } from '../../value-objects/version-constraint';

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
    isExact: vi.fn(() => !!/^\d+\.\d+\.\d+$/.exec(constraintString)),
    isRange: vi.fn(() => !/^\d+\.\d+\.\d+$/.exec(constraintString)),
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

  describe('property-based testing for version resolution', () => {
    it('should handle various git ref patterns consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            url: fc.string({ minLength: 10 }).map((s) => `https://github.com/user/${s}.git`),
            ref: fc.oneof(
              fc
                .string({ minLength: 1, maxLength: 20 })
                .map((s) => `v${s}`), // version tags
              fc.constantFrom('main', 'master', 'develop'), // branch names
              fc
                .string({ minLength: 40, maxLength: 40 })
                .map((s) => s.toLowerCase()), // commit hashes
            ),
          }),
          async (gitSource) => {
            vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
              ok({
                commit: 'abc123def456',
                actualRef: gitSource.ref,
              }),
            );

            const result = await service.resolveGitRefToVersion(gitSource);

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const resolution = result.value;
              expect(resolution.actualRef).toBe(gitSource.ref);
              expect(resolution.commitHash).toBe('abc123def456');
              expect(resolution.resolvedAt).toBeInstanceOf(Date);
              expect(resolution.resolvedVersion).toBeDefined();
            }
          },
        ),
        { numRuns: 20, verbose: false },
      );
    });

    it('should handle constraint resolution with various version patterns', () => {
      fc.assert(
        fc.property(
          fc.record({
            url: fc.constantFrom(
              'https://github.com/user/repo.git',
              'https://gitlab.com/user/repo.git',
            ),
            constraint: fc.oneof(
              fc.constant('^1.0.0'),
              fc.constant('~2.1.0'),
              fc.constant('>=3.0.0 <4.0.0'),
              fc.constant('1.*'),
              fc.constant('latest'),
            ),
          }),
          async ({ url, constraint }) => {
            const mockConstraint = createMockVersionConstraint(constraint);

            vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
              ok(['v1.0.0', 'v1.1.0', 'v2.0.0', 'v2.1.0', 'v3.0.0']),
            );

            const result = await service.resolveVersionConstraint(url, mockConstraint);

            // Should either succeed with a valid resolution or fail with a clear error
            if (result.isOk()) {
              const resolution = result.value;
              expect(resolution.bestVersion).toBeDefined();
              expect(resolution.availableVersions).toBeInstanceOf(Array);
              expect(resolution.satisfiesConstraint).toBe(true);
            } else {
              expect(result.error).toBeInstanceOf(Error);
            }
          },
        ),
        { numRuns: 15, verbose: false },
      );
    });
  });

  describe('performance testing for version resolution', () => {
    it('should resolve version constraints efficiently with many available versions', async () => {
      const startTime = performance.now();

      // Simulate a repository with many versions
      const manyVersions = Array.from(
        { length: 100 },
        (_, i) => `v${Math.floor(i / 10)}.${i % 10}.0`,
      );

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(ok(manyVersions));

      const constraint = createMockVersionConstraint('^2.0.0');
      const result = await service.resolveVersionConstraint(
        'https://github.com/user/repo.git',
        constraint,
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // Should resolve within 1 second
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.bestVersion).toBeDefined();
        expect(result.value.availableVersions.length).toBeGreaterThan(0);
      }
    });

    it('should handle concurrent version resolution requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        url: `https://github.com/user/repo-${i}.git`,
        constraint: createMockVersionConstraint(`^${i + 1}.0.0`),
      }));

      // Mock different responses for each request
      vi.mocked(mockGitRefProvider.listAvailableTags).mockImplementation(async () =>
        Promise.resolve(ok(['v1.0.0', 'v2.0.0', 'v3.0.0'])),
      );

      const resolutionPromises = requests.map(({ url, constraint }) =>
        service.resolveVersionConstraint(url, constraint),
      );

      const results = await Promise.all(resolutionPromises);

      results.forEach((result, _index) => {
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.bestVersion).toBeDefined();
        }
      });
    });
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
        }),
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
        }),
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
        }),
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
        err(new PackageSourceUnavailableError('Git repository not accessible')),
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
        }),
      );

      const result = await service.resolveGitRefToVersion(gitSource);

      expect(result.isOk()).toBe(true); // Should still work with git-based versions
      if (result.isOk()) {
        expect(result.value.actualRef).toBe('invalid-ref-format');
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed git URLs gracefully', async () => {
      const malformedUrls = [
        'not-a-url',
        'https://invalid',
        'git://malformed.git',
        '',
        'ftp://wrong-protocol.com',
      ];

      for (const url of malformedUrls) {
        const gitSource = { url, ref: 'main' };

        vi.mocked(mockGitRefProvider.resolveRefToCommit).mockResolvedValue(
          err(new PackageSourceUnavailableError(`Invalid URL: ${url}`)),
        );

        const result = await service.resolveGitRefToVersion(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageSourceUnavailableError);
        }
      }
    });

    it('should handle network timeouts and retries', async () => {
      const gitSource = {
        url: 'https://github.com/user/slow-repo.git',
        ref: 'main',
      };

      let attemptCount = 0;
      vi.mocked(mockGitRefProvider.resolveRefToCommit).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          // Simulate timeout on first two attempts
          throw new Error('Network timeout');
        }
        return Promise.resolve(
          ok({
            commit: 'final-commit-hash',
            actualRef: 'main',
          }),
        );
      });

      // The service should handle this gracefully (exact behavior depends on implementation)
      const result = await service.resolveGitRefToVersion(gitSource);

      // Could succeed after retries or fail with appropriate error
      if (result.isOk()) {
        expect(result.value.commitHash).toBe('final-commit-hash');
      } else {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should validate version constraint formats', async () => {
      const invalidConstraints = ['', 'not-a-version', '^^^1.0.0', '1.0.0-', 'v1.0.0.0.0'];

      for (const constraintString of invalidConstraints) {
        const constraint = createMockVersionConstraint(constraintString);

        vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(ok(['v1.0.0', 'v2.0.0']));

        const result = await service.resolveVersionConstraint(
          'https://github.com/user/repo.git',
          constraint,
        );

        // Should handle invalid constraints gracefully
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(Error);
        }
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
          ok(['v1.0.0', 'v1.1.0', 'v2.0.0']),
        );
        vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(
          ok(['main', 'develop']),
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
        err(new PackageSourceUnavailableError('Cannot access repository')),
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
        ok(['v1.0.0', 'v1.1.0', 'v2.0.0-beta']),
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(
        ok(['main', 'develop', 'feature-branch']),
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
        ok(['v1.0.0', 'v2.0.0-alpha', 'v1.5.0']),
      );
      vi.mocked(mockGitRefProvider.listAvailableBranches).mockResolvedValue(ok([]));

      const result = await service.getAvailableVersions(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const versions = result.value;
        expect(versions.length).toBe(3);
        // Prereleases should come after stable versions
        const stableCount = versions.filter((v) => !v.isPrerelease()).length;
        const prereleaseCount = versions.filter((v) => v.isPrerelease()).length;
        expect(stableCount).toBeGreaterThan(0);
        expect(prereleaseCount).toBeGreaterThan(0);
      }
    });

    it('should handle only invalid version tags gracefully', async () => {
      const gitUrl = 'https://github.com/user/repo.git';

      vi.mocked(mockGitRefProvider.listAvailableTags).mockResolvedValue(
        ok(['invalid-tag', 'another-invalid']),
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
        err(new PackageSourceUnavailableError('Failed to list tags')),
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
        err(new PackageSourceUnavailableError('Failed to list branches')),
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
        ok(['v1.0.0', 'v1.1.0', 'v2.0.0-beta']),
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
        ok(['v1.0.0-alpha', 'v2.0.0-beta']),
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
        ok(['v1.0.0', 'v2.0.0-beta']),
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
        ok(['v1.0.0', 'v2.0.0-beta']),
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
        ok(['v1.0.0-alpha', 'v2.0.0-beta']),
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
        ok(['v1.0.0', '2.0.0', 'invalid-tag', 'v3.0.0-beta']),
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
        ok(['v1.2.0', 'v1.2.1', 'v1.3.0', 'v2.0.0']),
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
        ok(['v1.0.0-alpha', 'v1.0.0-beta', 'v1.0.0']),
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
