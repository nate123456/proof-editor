/**
 * Tests for PackageSource value object
 *
 * Focuses on:
 * - Git source creation and validation
 * - Local source creation and validation
 * - URL validation for Git sources
 * - Git ref validation (branch/tag/commit rules)
 * - Path validation for local sources
 * - Source type detection and casting
 * - Identifier generation
 * - Error conditions and edge cases
 * - High coverage for all validation rules
 */

import { describe, expect, it } from 'vitest';

import type { GitPackageSource, LocalPackageSource } from '../../types/common-types';
import { PackageValidationError } from '../../types/domain-errors';
import { PackageSource } from '../../value-objects/package-source';

describe('PackageSource', () => {
  describe('createFromGit', () => {
    it('should create valid Git source with HTTPS URL', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.getType()).toBe('git');
        expect(source.asGitSource()?.url).toBe('https://github.com/user/repo.git');
        expect(source.asGitSource()?.ref).toBe('main');
        expect(source.asGitSource()?.path).toBeUndefined();
        expect(source.asLocalSource()).toBeNull();
      }
    });

    it('should create valid Git source with HTTP URL', () => {
      const gitSource: GitPackageSource = {
        url: 'http://github.com/user/repo.git',
        ref: 'develop',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.getType()).toBe('git');
        expect(source.asGitSource()?.url).toBe('http://github.com/user/repo.git');
        expect(source.asGitSource()?.ref).toBe('develop');
      }
    });

    it('should create valid Git source with SSH URL', () => {
      const gitSource: GitPackageSource = {
        url: 'git@github.com:user/repo.git',
        ref: 'feature-branch',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asGitSource()?.url).toBe('git@github.com:user/repo.git');
        expect(source.asGitSource()?.ref).toBe('feature-branch');
      }
    });

    it('should create valid Git source with git:// URL', () => {
      const gitSource: GitPackageSource = {
        url: 'git://github.com/user/repo.git',
        ref: 'v1.0.0',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asGitSource()?.url).toBe('git://github.com/user/repo.git');
        expect(source.asGitSource()?.ref).toBe('v1.0.0');
      }
    });

    it('should create valid Git source with commit hash', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'abc123def456789012345678901234567890abcd',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asGitSource()?.ref).toBe('abc123def456789012345678901234567890abcd');
      }
    });

    it('should create valid Git source with subpath', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/monorepo.git',
        ref: 'main',
        path: 'packages/my-package',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asGitSource()?.url).toBe('https://github.com/user/monorepo.git');
        expect(source.asGitSource()?.ref).toBe('main');
        expect(source.asGitSource()?.path).toBe('packages/my-package');
      }
    });

    it('should trim whitespace from all fields', () => {
      const gitSource: GitPackageSource = {
        url: '  https://github.com/user/repo.git  ',
        ref: '  main  ',
        path: '  packages/sub  ',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asGitSource()?.url).toBe('https://github.com/user/repo.git');
        expect(source.asGitSource()?.ref).toBe('main');
        expect(source.asGitSource()?.path).toBe('packages/sub');
      }
    });

    it('should omit path if empty after trimming', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
        path: '   ',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asGitSource()?.path).toBeUndefined();
      }
    });

    describe('validation failures', () => {
      it('should fail with empty URL', () => {
        const gitSource: GitPackageSource = {
          url: '',
          ref: 'main',
        };

        const result = PackageSource.createFromGit(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Git URL cannot be empty');
        }
      });

      it('should fail with whitespace-only URL', () => {
        const gitSource: GitPackageSource = {
          url: '   ',
          ref: 'main',
        };

        const result = PackageSource.createFromGit(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Git URL cannot be empty');
        }
      });

      it('should fail with empty ref', () => {
        const gitSource: GitPackageSource = {
          url: 'https://github.com/user/repo.git',
          ref: '',
        };

        const result = PackageSource.createFromGit(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Git ref cannot be empty');
        }
      });

      it('should fail with whitespace-only ref', () => {
        const gitSource: GitPackageSource = {
          url: 'https://github.com/user/repo.git',
          ref: '   ',
        };

        const result = PackageSource.createFromGit(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Git ref cannot be empty');
        }
      });

      it('should fail with invalid URL format', () => {
        const gitSource: GitPackageSource = {
          url: 'not-a-valid-url',
          ref: 'main',
        };

        const result = PackageSource.createFromGit(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Invalid Git URL format');
        }
      });

      it('should fail with unsupported URL protocol', () => {
        const gitSource: GitPackageSource = {
          url: 'ftp://example.com/repo.git',
          ref: 'main',
        };

        const result = PackageSource.createFromGit(gitSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Invalid Git URL format');
        }
      });

      describe('Git ref validation', () => {
        it('should fail with ref that is too long', () => {
          const longRef = 'a'.repeat(251);
          const gitSource: GitPackageSource = {
            url: 'https://github.com/user/repo.git',
            ref: longRef,
          };

          const result = PackageSource.createFromGit(gitSource);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(PackageValidationError);
            expect(result.error.message).toBe('Invalid Git ref format');
          }
        });

        it('should fail with ref containing invalid characters', () => {
          const invalidChars = ['\x00', '\x1f', '\x7f', '~', '^', ':', '?', '*', '[', '\\', ' '];

          for (const char of invalidChars) {
            const gitSource: GitPackageSource = {
              url: 'https://github.com/user/repo.git',
              ref: `branch${char}name`,
            };

            const result = PackageSource.createFromGit(gitSource);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
              expect(result.error.message).toBe('Invalid Git ref format');
            }
          }
        });

        it('should fail with ref starting with dot', () => {
          const gitSource: GitPackageSource = {
            url: 'https://github.com/user/repo.git',
            ref: '.branch-name',
          };

          const result = PackageSource.createFromGit(gitSource);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(PackageValidationError);
            expect(result.error.message).toBe('Invalid Git ref format');
          }
        });

        it('should fail with ref ending with dot', () => {
          const gitSource: GitPackageSource = {
            url: 'https://github.com/user/repo.git',
            ref: 'branch-name.',
          };

          const result = PackageSource.createFromGit(gitSource);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(PackageValidationError);
            expect(result.error.message).toBe('Invalid Git ref format');
          }
        });

        it('should fail with ref containing consecutive dots', () => {
          const gitSource: GitPackageSource = {
            url: 'https://github.com/user/repo.git',
            ref: 'branch..name',
          };

          const result = PackageSource.createFromGit(gitSource);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(PackageValidationError);
            expect(result.error.message).toBe('Invalid Git ref format');
          }
        });

        it('should fail with ref ending with .lock', () => {
          const gitSource: GitPackageSource = {
            url: 'https://github.com/user/repo.git',
            ref: 'branch-name.lock',
          };

          const result = PackageSource.createFromGit(gitSource);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(PackageValidationError);
            expect(result.error.message).toBe('Invalid Git ref format');
          }
        });
      });
    });

    describe('valid Git URL formats', () => {
      const validUrls = [
        'https://github.com/user/repo.git',
        'http://gitlab.com/user/repo.git',
        'git://example.com/repo.git',
        'ssh://git@github.com/user/repo.git',
        'git@github.com:user/repo.git', // SSH shorthand
        'user/repo', // GitHub shorthand
        'github.com/user/repo', // Domain shorthand
      ];

      it.each(validUrls)('should accept valid Git URL: %s', url => {
        const gitSource: GitPackageSource = {
          url,
          ref: 'main',
        };

        const result = PackageSource.createFromGit(gitSource);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('valid Git ref formats', () => {
      const validRefs = [
        'main',
        'develop',
        'feature/new-feature',
        'hotfix/critical-fix',
        'release-1.0',
        'v1.0.0',
        '1.0.0-beta.1',
        'abc123',
        'abc123def456789012345678901234567890abcd',
        'feature_branch',
        'RELEASE_1_0',
        'test-branch-123',
        `a${'b'.repeat(248)}`, // Max length (250 chars)
      ];

      it.each(validRefs)('should accept valid Git ref: %s', ref => {
        const gitSource: GitPackageSource = {
          url: 'https://github.com/user/repo.git',
          ref,
        };

        const result = PackageSource.createFromGit(gitSource);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('createFromLocal', () => {
    it('should create valid local source with Unix path', () => {
      const localSource: LocalPackageSource = {
        path: '/home/user/my-package',
      };

      const result = PackageSource.createFromLocal(localSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.getType()).toBe('local');
        expect(source.asLocalSource()?.path).toBe('/home/user/my-package');
        expect(source.asGitSource()).toBeNull();
      }
    });

    it('should create valid local source with Windows path', () => {
      const localSource: LocalPackageSource = {
        path: 'C:\\Users\\User\\MyPackage',
      };

      const result = PackageSource.createFromLocal(localSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asLocalSource()?.path).toBe('C:\\Users\\User\\MyPackage');
      }
    });

    it('should create valid local source with relative path', () => {
      const localSource: LocalPackageSource = {
        path: './packages/my-package',
      };

      const result = PackageSource.createFromLocal(localSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asLocalSource()?.path).toBe('./packages/my-package');
      }
    });

    it('should trim whitespace from path', () => {
      const localSource: LocalPackageSource = {
        path: '  /home/user/my-package  ',
      };

      const result = PackageSource.createFromLocal(localSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.asLocalSource()?.path).toBe('/home/user/my-package');
      }
    });

    describe('validation failures', () => {
      it('should fail with empty path', () => {
        const localSource: LocalPackageSource = {
          path: '',
        };

        const result = PackageSource.createFromLocal(localSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Local path cannot be empty');
        }
      });

      it('should fail with whitespace-only path', () => {
        const localSource: LocalPackageSource = {
          path: '   ',
        };

        const result = PackageSource.createFromLocal(localSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Local path cannot be empty');
        }
      });

      it('should fail with path that is too long', () => {
        const longPath = `/home/${'a'.repeat(4090)}/package`;
        const localSource: LocalPackageSource = {
          path: longPath,
        };

        const result = PackageSource.createFromLocal(localSource);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Invalid local path');
        }
      });

      it('should fail with path containing invalid control characters', () => {
        const invalidChars = ['\x00', '\x01', '\x1f', '\x7f'];

        for (const char of invalidChars) {
          const localSource: LocalPackageSource = {
            path: `/home/user${char}/package`,
          };

          const result = PackageSource.createFromLocal(localSource);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.message).toBe('Invalid local path');
          }
        }
      });
    });

    describe('valid local path formats', () => {
      const validPaths = [
        '/home/user/package',
        '/usr/local/packages/my-package',
        'C:\\Users\\User\\Package',
        'D:\\Projects\\MyPackage',
        './packages/local-package',
        '../sibling-package',
        '~/packages/my-package',
        'packages/relative-package',
        '/tmp/temporary-package',
        '/var/packages/system-package',
        'package-in-current-dir',
        `a${'b'.repeat(4094)}`, // Max length (4096 chars)
      ];

      it.each(validPaths)('should accept valid local path: %s', path => {
        const localSource: LocalPackageSource = {
          path,
        };

        const result = PackageSource.createFromLocal(localSource);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('getIdentifier', () => {
    it('should generate identifier for Git source without path', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.getIdentifier()).toBe('git:https://github.com/user/repo.git@main');
      }
    });

    it('should generate identifier for Git source with path', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/monorepo.git',
        ref: 'main',
        path: 'packages/sub-package',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.getIdentifier()).toBe(
          'git:https://github.com/user/monorepo.git@main#packages/sub-package'
        );
      }
    });

    it('should generate identifier for local source', () => {
      const localSource: LocalPackageSource = {
        path: '/home/user/my-package',
      };

      const result = PackageSource.createFromLocal(localSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.getIdentifier()).toBe('local:/home/user/my-package');
      }
    });
  });

  describe('equals', () => {
    it('should be equal to itself', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        expect(source.equals(source)).toBe(true);
      }
    });

    it('should be equal to another Git source with same data', () => {
      const gitSource1: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };
      const gitSource2: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      const result1 = PackageSource.createFromGit(gitSource1);
      const result2 = PackageSource.createFromGit(gitSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
        expect(result2.value.equals(result1.value)).toBe(true);
      }
    });

    it('should be equal to another local source with same path', () => {
      const localSource1: LocalPackageSource = {
        path: '/home/user/package',
      };
      const localSource2: LocalPackageSource = {
        path: '/home/user/package',
      };

      const result1 = PackageSource.createFromLocal(localSource1);
      const result2 = PackageSource.createFromLocal(localSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should not be equal with different types', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };
      const localSource: LocalPackageSource = {
        path: '/home/user/package',
      };

      const gitResult = PackageSource.createFromGit(gitSource);
      const localResult = PackageSource.createFromLocal(localSource);

      expect(gitResult.isOk()).toBe(true);
      expect(localResult.isOk()).toBe(true);

      if (gitResult.isOk() && localResult.isOk()) {
        expect(gitResult.value.equals(localResult.value)).toBe(false);
      }
    });

    it('should not be equal with different Git URLs', () => {
      const gitSource1: GitPackageSource = {
        url: 'https://github.com/user/repo1.git',
        ref: 'main',
      };
      const gitSource2: GitPackageSource = {
        url: 'https://github.com/user/repo2.git',
        ref: 'main',
      };

      const result1 = PackageSource.createFromGit(gitSource1);
      const result2 = PackageSource.createFromGit(gitSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should not be equal with different Git refs', () => {
      const gitSource1: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };
      const gitSource2: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'develop',
      };

      const result1 = PackageSource.createFromGit(gitSource1);
      const result2 = PackageSource.createFromGit(gitSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should not be equal with different Git paths', () => {
      const gitSource1: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
        path: 'packages/a',
      };
      const gitSource2: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
        path: 'packages/b',
      };

      const result1 = PackageSource.createFromGit(gitSource1);
      const result2 = PackageSource.createFromGit(gitSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should not be equal with different local paths', () => {
      const localSource1: LocalPackageSource = {
        path: '/home/user/package1',
      };
      const localSource2: LocalPackageSource = {
        path: '/home/user/package2',
      };

      const result1 = PackageSource.createFromLocal(localSource1);
      const result2 = PackageSource.createFromLocal(localSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('toJSON', () => {
    it('should serialize Git source correctly', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
        path: 'packages/sub',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        const json = source.toJSON();

        expect(json).toEqual({
          type: 'git',
          source: {
            url: 'https://github.com/user/repo.git',
            ref: 'main',
            path: 'packages/sub',
          },
        });
      }
    });

    it('should serialize local source correctly', () => {
      const localSource: LocalPackageSource = {
        path: '/home/user/package',
      };

      const result = PackageSource.createFromLocal(localSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        const json = source.toJSON();

        expect(json).toEqual({
          type: 'local',
          source: {
            path: '/home/user/package',
          },
        });
      }
    });

    it('should be serializable with JSON.stringify', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      const result = PackageSource.createFromGit(gitSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const source = result.value;
        const jsonString = JSON.stringify({ source });
        const parsed = JSON.parse(jsonString);

        expect(parsed.source.type).toBe('git');
        expect(parsed.source.source.url).toBe('https://github.com/user/repo.git');
        expect(parsed.source.source.ref).toBe('main');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should work with collections and identifier-based lookup', () => {
      const sources = [
        PackageSource.createFromGit({
          url: 'https://github.com/user/repo-a.git',
          ref: 'main',
        }),
        PackageSource.createFromGit({
          url: 'https://github.com/user/repo-b.git',
          ref: 'develop',
        }),
        PackageSource.createFromLocal({
          path: '/local/package',
        }),
      ];

      expect(sources.every(result => result.isOk())).toBe(true);

      if (sources.every(result => result.isOk())) {
        const validSources = sources
          .map(result => (result.isOk() ? result.value : undefined))
          .filter(Boolean) as PackageSource[];

        // Test with Map using identifiers
        const sourceMap = new Map(validSources.map(source => [source.getIdentifier(), source]));
        expect(sourceMap.size).toBe(3);

        expect(sourceMap.has('git:https://github.com/user/repo-a.git@main')).toBe(true);
        expect(sourceMap.has('git:https://github.com/user/repo-b.git@develop')).toBe(true);
        expect(sourceMap.has('local:/local/package')).toBe(true);
      }
    });

    it('should maintain equality after trimming and normalization', () => {
      const gitSource1: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
        path: 'packages/sub',
      };
      const gitSource2: GitPackageSource = {
        url: '  https://github.com/user/repo.git  ',
        ref: '  main  ',
        path: '  packages/sub  ',
      };

      const result1 = PackageSource.createFromGit(gitSource1);
      const result2 = PackageSource.createFromGit(gitSource2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
        expect(result1.value.getIdentifier()).toBe(result2.value.getIdentifier());
      }
    });
  });
});
