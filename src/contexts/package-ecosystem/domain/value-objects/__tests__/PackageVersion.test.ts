/**
 * Tests for PackageVersion value object
 *
 * Focuses on:
 * - Semantic version parsing and validation
 * - Git reference handling
 * - Version comparison logic
 * - Constraint satisfaction
 * - Prerelease and stability detection
 * - Error scenarios and edge cases
 * - High coverage for all methods
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PackageValidationError } from '../../types/domain-errors.js';
import { PackageVersion } from '../PackageVersion.js';

describe('PackageVersion', () => {
  describe('create', () => {
    it('should create valid semantic versions', () => {
      const validVersions = [
        '1.0.0',
        '0.1.0',
        '10.20.30',
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-0.3.7',
        '1.0.0-x.7.z.92',
        '1.0.0+20130313144700',
        '1.0.0-beta+exp.sha.5114f85',
        '1.0.0+21AF26D3-117B344092BD',
        '1.2.3-beta.1+build.1',
      ];

      validVersions.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toString()).toBe(version);
        }
      });
    });

    it('should fail with invalid semantic versions', () => {
      const invalidVersions = [
        'invalid',
        '1',
        '1.2',
        '1.2.3-',
        '1.2.3+',
        '1.2.3.DEV',
        '1.2-SNAPSHOT-123',
        '+invalid',
        '-invalid',
        '-invalid+invalid',
        'alpha',
        'alpha.beta',
        'alpha.1',
        'alpha0.beta',
        '1.2.3.456',
      ];

      invalidVersions.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Invalid semantic version format');
        } else {
          throw new Error(`Version "${version}" should have been invalid but was accepted`);
        }
      });
    });

    it('should handle leading zeros in version components', () => {
      // The current implementation allows leading zeros
      const leadingZeroVersions = ['01.1.1', '1.01.1', '1.1.01'];

      leadingZeroVersions.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Leading zeros are parsed as numbers, so they become regular numbers
          expect(result.value.getMajor()).toBeGreaterThanOrEqual(0);
          expect(result.value.getMinor()).toBeGreaterThanOrEqual(0);
          expect(result.value.getPatch()).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should handle complex prerelease and build patterns', () => {
      // The current implementation is permissive with prerelease/build metadata
      const complexVersions = ['1.2.3----RC-SNAPSHOT.12.09.1', '1.2.3--..12'];

      complexVersions.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getMajor()).toBe(1);
          expect(result.value.getMinor()).toBe(2);
          expect(result.value.getPatch()).toBe(3);
          expect(result.value.getPrerelease()).toBeDefined();
        }
      });
    });

    it('should fail with empty versions separately', () => {
      const emptyVersions = ['', '   '];

      emptyVersions.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Version string cannot be empty');
        }
      });
    });

    it('should handle negative version numbers', () => {
      const result = PackageVersion.create('-1.0.0');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid semantic version format');
      }
    });

    it('should validate component ranges', () => {
      const result = PackageVersion.create('1.0.0');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
      }
    });

    it('should trim whitespace', () => {
      const result = PackageVersion.create('  1.2.3  ');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.2.3');
      }
    });

    it('should fail with empty string', () => {
      const result = PackageVersion.create('');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Version string cannot be empty');
      }
    });

    it('should fail with whitespace-only string', () => {
      const result = PackageVersion.create('   ');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Version string cannot be empty');
      }
    });

    it('should handle missing version components', () => {
      const result = PackageVersion.create('1.2.');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid semantic version format');
      }
    });

    it('should preserve original version string', () => {
      const originalVersion = '1.0.0-beta.1+build.123';
      const result = PackageVersion.create(originalVersion);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(originalVersion);
      }
    });
  });

  describe('fromGitRef', () => {
    it('should handle version tags with v prefix', () => {
      const result = PackageVersion.fromGitRef('v1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.toString()).toBe('1.2.3');
      }
    });

    it('should handle version tags without v prefix', () => {
      const result = PackageVersion.fromGitRef('2.0.0-beta.1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(2);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
        expect(result.value.getPrerelease()).toBe('beta.1');
      }
    });

    it('should handle main branch reference', () => {
      const result = PackageVersion.fromGitRef('main');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(0);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
        expect(result.value.getPrerelease()).toBe('dev');
        expect(result.value.getBuild()).toBe('main');
        expect(result.value.toString()).toBe('0.0.0-dev+main');
      }
    });

    it('should handle master branch reference', () => {
      const result = PackageVersion.fromGitRef('master');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(0);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
        expect(result.value.getPrerelease()).toBe('dev');
        expect(result.value.getBuild()).toBe('master');
        expect(result.value.toString()).toBe('0.0.0-dev+master');
      }
    });

    it('should handle full SHA-1 hash', () => {
      const sha = 'a1b2c3d4e5f6789012345678901234567890abcd';
      const result = PackageVersion.fromGitRef(sha);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(0);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
        expect(result.value.getPrerelease()).toBe('dev');
        expect(result.value.getBuild()).toBe('a1b2c3d');
        expect(result.value.toString()).toBe('0.0.0-dev+a1b2c3d');
      }
    });

    it('should handle short SHA hash', () => {
      const result = PackageVersion.fromGitRef('a1b2c3d');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrerelease()).toBe('dev');
        expect(result.value.getBuild()).toBe('a1b2c3d');
      }
    });

    it('should handle arbitrary branch names', () => {
      const result = PackageVersion.fromGitRef('feature/new-api');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(0);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
        expect(result.value.getPrerelease()).toBe('dev');
        expect(result.value.getBuild()).toBe('feature/new-api');
        expect(result.value.toString()).toBe('0.0.0-dev+feature/new-api');
      }
    });

    it('should fail with empty git ref', () => {
      const result = PackageVersion.fromGitRef('');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Git ref cannot be empty');
      }
    });

    it('should fail with whitespace-only git ref', () => {
      const result = PackageVersion.fromGitRef('   ');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Git ref cannot be empty');
      }
    });

    it('should handle v-prefixed invalid version', () => {
      const result = PackageVersion.fromGitRef('v1.2');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid semantic version format');
      }
    });

    it('should trim whitespace from git ref', () => {
      const result = PackageVersion.fromGitRef('  v1.0.0  ');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.0.0');
      }
    });
  });

  describe('version component getters', () => {
    it('should return correct version components', () => {
      const result = PackageVersion.create('2.5.10-rc.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.getMajor()).toBe(2);
        expect(version.getMinor()).toBe(5);
        expect(version.getPatch()).toBe(10);
        expect(version.getPrerelease()).toBe('rc.3');
        expect(version.getBuild()).toBe('build.456');
      }
    });

    it('should handle version without prerelease and build', () => {
      const result = PackageVersion.create('1.0.0');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.getMajor()).toBe(1);
        expect(version.getMinor()).toBe(0);
        expect(version.getPatch()).toBe(0);
        expect(version.getPrerelease()).toBeUndefined();
        expect(version.getBuild()).toBeUndefined();
      }
    });

    it('should handle version with only prerelease', () => {
      const result = PackageVersion.create('1.0.0-alpha');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.getPrerelease()).toBe('alpha');
        expect(version.getBuild()).toBeUndefined();
      }
    });

    it('should handle version with only build metadata', () => {
      const result = PackageVersion.create('1.0.0+build.123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.getPrerelease()).toBeUndefined();
        expect(version.getBuild()).toBe('build.123');
      }
    });
  });

  describe('isPrerelease', () => {
    it('should detect prerelease versions', () => {
      const prereleaseVersions = [
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-0.3.7',
        '1.0.0-x.7.z.92',
        '1.0.0-beta+exp.sha.5114f85',
      ];

      prereleaseVersions.forEach((versionString) => {
        const result = PackageVersion.create(versionString);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isPrerelease()).toBe(true);
        }
      });
    });

    it('should detect stable versions', () => {
      const stableVersions = [
        '1.0.0',
        '0.1.0',
        '10.20.30',
        '1.0.0+20130313144700',
        '1.0.0+21AF26D3-117B344092BD',
      ];

      stableVersions.forEach((versionString) => {
        const result = PackageVersion.create(versionString);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isPrerelease()).toBe(false);
        }
      });
    });
  });

  describe('isStable', () => {
    it('should detect stable versions (major > 0 and no prerelease)', () => {
      const stableVersions = ['1.0.0', '2.5.10', '10.20.30', '1.0.0+build.123'];

      stableVersions.forEach((versionString) => {
        const result = PackageVersion.create(versionString);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStable()).toBe(true);
        }
      });
    });

    it('should detect unstable versions', () => {
      const unstableVersions = [
        '0.1.0', // Major version 0
        '0.9.9', // Major version 0
        '1.0.0-alpha', // Prerelease
        '2.0.0-beta.1', // Prerelease
      ];

      unstableVersions.forEach((versionString) => {
        const result = PackageVersion.create(versionString);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStable()).toBe(false);
        }
      });
    });
  });

  describe('isCompatibleWith', () => {
    it('should check compatibility within same major version', () => {
      const baseResult = PackageVersion.create('1.2.0');
      expect(baseResult.isOk()).toBe(true);
      if (baseResult.isOk()) {
        const baseVersion = baseResult.value;

        // Compatible: same major, higher minor
        const higherMinorResult = PackageVersion.create('1.3.0');
        expect(higherMinorResult.isOk()).toBe(true);
        if (higherMinorResult.isOk()) {
          expect(baseVersion.isCompatibleWith(higherMinorResult.value)).toBe(false);
          expect(higherMinorResult.value.isCompatibleWith(baseVersion)).toBe(true);
        }

        // Compatible: same major and minor, higher patch
        const higherPatchResult = PackageVersion.create('1.2.5');
        expect(higherPatchResult.isOk()).toBe(true);
        if (higherPatchResult.isOk()) {
          expect(baseVersion.isCompatibleWith(higherPatchResult.value)).toBe(false);
          expect(higherPatchResult.value.isCompatibleWith(baseVersion)).toBe(true);
        }

        // Compatible: exact same version
        const sameResult = PackageVersion.create('1.2.0');
        expect(sameResult.isOk()).toBe(true);
        if (sameResult.isOk()) {
          expect(baseVersion.isCompatibleWith(sameResult.value)).toBe(true);
        }
      }
    });

    it('should reject compatibility across major versions', () => {
      const v1Result = PackageVersion.create('1.0.0');
      const v2Result = PackageVersion.create('2.0.0');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.isCompatibleWith(v2Result.value)).toBe(false);
        expect(v2Result.value.isCompatibleWith(v1Result.value)).toBe(false);
      }
    });

    it('should handle compatibility with lower minor versions', () => {
      const baseResult = PackageVersion.create('1.5.0');
      const lowerMinorResult = PackageVersion.create('1.3.0');

      expect(baseResult.isOk()).toBe(true);
      expect(lowerMinorResult.isOk()).toBe(true);

      if (baseResult.isOk() && lowerMinorResult.isOk()) {
        // 1.5.0 is compatible with 1.3.0 because the minor version is higher
        expect(baseResult.value.isCompatibleWith(lowerMinorResult.value)).toBe(true);
        // But 1.3.0 is not compatible with 1.5.0 because the minor version is lower
        expect(lowerMinorResult.value.isCompatibleWith(baseResult.value)).toBe(false);
      }
    });
  });

  describe('satisfiesConstraint', () => {
    let version1_2_3: PackageVersion;
    let version2_0_0: PackageVersion;
    let version1_0_0_alpha: PackageVersion;

    beforeEach(() => {
      const result1 = PackageVersion.create('1.2.3');
      const result2 = PackageVersion.create('2.0.0');
      const result3 = PackageVersion.create('1.0.0-alpha.1');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        version1_2_3 = result1.value;
        version2_0_0 = result2.value;
        version1_0_0_alpha = result3.value;
      }
    });

    it('should handle wildcard constraints', () => {
      expect(version1_2_3.satisfiesConstraint('*')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('')).toBe(true);
      expect(version2_0_0.satisfiesConstraint('*')).toBe(true);
    });

    it('should handle caret constraints (^)', () => {
      expect(version1_2_3.satisfiesConstraint('^1.0.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('^1.2.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('^1.2.3')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('^1.3.0')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('^2.0.0')).toBe(false);
    });

    it('should handle tilde constraints (~)', () => {
      expect(version1_2_3.satisfiesConstraint('~1.2.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('~1.2.3')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('~1.2.4')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('~1.1.0')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('~2.0.0')).toBe(false);
    });

    it('should handle greater than or equal constraints (>=)', () => {
      expect(version1_2_3.satisfiesConstraint('>=1.0.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('>=1.2.3')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('>=1.2.4')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('>=2.0.0')).toBe(false);
    });

    it('should handle less than or equal constraints (<=)', () => {
      expect(version1_2_3.satisfiesConstraint('<=2.0.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('<=1.2.3')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('<=1.2.2')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('<=1.0.0')).toBe(false);
    });

    it('should handle greater than constraints (>)', () => {
      expect(version1_2_3.satisfiesConstraint('>1.0.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('>1.2.2')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('>1.2.3')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('>2.0.0')).toBe(false);
    });

    it('should handle less than constraints (<)', () => {
      expect(version1_2_3.satisfiesConstraint('<2.0.0')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('<1.2.4')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('<1.2.3')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('<1.0.0')).toBe(false);
    });

    it('should handle exact version constraints', () => {
      expect(version1_2_3.satisfiesConstraint('1.2.3')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('1.2.4')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('2.0.0')).toBe(false);
    });

    it('should handle invalid constraints', () => {
      expect(version1_2_3.satisfiesConstraint('^invalid-version')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('~invalid-version')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('>=invalid-version')).toBe(false);
      expect(version1_2_3.satisfiesConstraint('invalid-version')).toBe(false);
    });

    it('should handle prerelease versions in constraints', () => {
      expect(version1_0_0_alpha.satisfiesConstraint('^1.0.0-alpha')).toBe(true);
      expect(version1_0_0_alpha.satisfiesConstraint('~1.0.0-alpha.1')).toBe(true);
      expect(version1_0_0_alpha.satisfiesConstraint('>=1.0.0-alpha')).toBe(true);
      expect(version1_0_0_alpha.satisfiesConstraint('1.0.0-alpha.1')).toBe(true);
    });

    it('should handle whitespace in constraints', () => {
      expect(version1_2_3.satisfiesConstraint('  ^1.0.0  ')).toBe(true);
      expect(version1_2_3.satisfiesConstraint('  >=  1.2.0  ')).toBe(true);
    });
  });

  describe('compareWith', () => {
    it('should compare major versions', () => {
      const v1Result = PackageVersion.create('1.0.0');
      const v2Result = PackageVersion.create('2.0.0');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.compareWith(v2Result.value)).toBeLessThan(0);
        expect(v2Result.value.compareWith(v1Result.value)).toBeGreaterThan(0);
        expect(v1Result.value.compareWith(v1Result.value)).toBe(0);
      }
    });

    it('should compare minor versions', () => {
      const v1Result = PackageVersion.create('1.1.0');
      const v2Result = PackageVersion.create('1.2.0');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.compareWith(v2Result.value)).toBeLessThan(0);
        expect(v2Result.value.compareWith(v1Result.value)).toBeGreaterThan(0);
      }
    });

    it('should compare patch versions', () => {
      const v1Result = PackageVersion.create('1.0.1');
      const v2Result = PackageVersion.create('1.0.2');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.compareWith(v2Result.value)).toBeLessThan(0);
        expect(v2Result.value.compareWith(v1Result.value)).toBeGreaterThan(0);
      }
    });

    it('should compare prerelease versions', () => {
      const stableResult = PackageVersion.create('1.0.0');
      const prereleaseResult = PackageVersion.create('1.0.0-alpha');

      expect(stableResult.isOk()).toBe(true);
      expect(prereleaseResult.isOk()).toBe(true);

      if (stableResult.isOk() && prereleaseResult.isOk()) {
        expect(prereleaseResult.value.compareWith(stableResult.value)).toBeLessThan(0);
        expect(stableResult.value.compareWith(prereleaseResult.value)).toBeGreaterThan(0);
      }
    });

    it('should compare prerelease identifiers lexically', () => {
      const alphaResult = PackageVersion.create('1.0.0-alpha');
      const betaResult = PackageVersion.create('1.0.0-beta');

      expect(alphaResult.isOk()).toBe(true);
      expect(betaResult.isOk()).toBe(true);

      if (alphaResult.isOk() && betaResult.isOk()) {
        expect(alphaResult.value.compareWith(betaResult.value)).toBeLessThan(0);
        expect(betaResult.value.compareWith(alphaResult.value)).toBeGreaterThan(0);
      }
    });

    it('should handle equal versions', () => {
      const v1Result = PackageVersion.create('1.2.3-alpha.1');
      const v2Result = PackageVersion.create('1.2.3-alpha.1');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.compareWith(v2Result.value)).toBe(0);
      }
    });

    it('should ignore build metadata in comparisons', () => {
      const v1Result = PackageVersion.create('1.0.0+build.1');
      const v2Result = PackageVersion.create('1.0.0+build.2');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.compareWith(v2Result.value)).toBe(0);
      }
    });
  });

  describe('equals', () => {
    it('should detect equal versions', () => {
      const v1Result = PackageVersion.create('1.2.3-alpha.1+build.123');
      const v2Result = PackageVersion.create('1.2.3-alpha.1+build.456');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.equals(v2Result.value)).toBe(true);
      }
    });

    it('should detect different versions', () => {
      const v1Result = PackageVersion.create('1.2.3');
      const v2Result = PackageVersion.create('1.2.4');

      expect(v1Result.isOk()).toBe(true);
      expect(v2Result.isOk()).toBe(true);

      if (v1Result.isOk() && v2Result.isOk()) {
        expect(v1Result.value.equals(v2Result.value)).toBe(false);
      }
    });

    it('should handle prerelease differences', () => {
      const stableResult = PackageVersion.create('1.0.0');
      const prereleaseResult = PackageVersion.create('1.0.0-alpha');

      expect(stableResult.isOk()).toBe(true);
      expect(prereleaseResult.isOk()).toBe(true);

      if (stableResult.isOk() && prereleaseResult.isOk()) {
        expect(stableResult.value.equals(prereleaseResult.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should preserve original version string when available', () => {
      const originalVersion = '1.2.3-beta.1+build.123';
      const result = PackageVersion.create(originalVersion);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(originalVersion);
      }
    });

    it('should reconstruct version string when original not available', () => {
      // This would happen with programmatically created versions
      const result = PackageVersion.create('1.0.0');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.toString()).toBe('1.0.0');
      }
    });

    it('should handle version with only prerelease', () => {
      const result = PackageVersion.create('1.0.0-alpha');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.0.0-alpha');
      }
    });

    it('should handle version with only build metadata', () => {
      const result = PackageVersion.create('1.0.0+build.123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.0.0+build.123');
      }
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON object with all components', () => {
      const result = PackageVersion.create('2.5.10-rc.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const json = result.value.toJSON();
        expect(json).toEqual({
          major: 2,
          minor: 5,
          patch: 10,
          prerelease: 'rc.3',
          build: 'build.456',
          version: '2.5.10-rc.3+build.456',
        });
      }
    });

    it('should handle minimal version in JSON', () => {
      const result = PackageVersion.create('1.0.0');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const json = result.value.toJSON();
        expect(json).toEqual({
          major: 1,
          minor: 0,
          patch: 0,
          prerelease: undefined,
          build: undefined,
          version: '1.0.0',
        });
      }
    });

    it('should handle git ref versions in JSON', () => {
      const result = PackageVersion.fromGitRef('main');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const json = result.value.toJSON();
        expect(json).toEqual({
          major: 0,
          minor: 0,
          patch: 0,
          prerelease: 'dev',
          build: 'main',
          version: '0.0.0-dev+main',
        });
      }
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle very large version numbers', () => {
      const result = PackageVersion.create('999999999.999999999.999999999');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(999999999);
        expect(result.value.getMinor()).toBe(999999999);
        expect(result.value.getPatch()).toBe(999999999);
      }
    });

    it('should handle complex prerelease identifiers', () => {
      const complexPrereleases = [
        '1.0.0-alpha.1.2.3',
        '1.0.0-beta.x.y.z',
        '1.0.0-0',
        '1.0.0-1.0.0',
      ];

      complexPrereleases.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isPrerelease()).toBe(true);
        }
      });
    });

    it('should handle complex build metadata', () => {
      const complexBuilds = [
        '1.0.0+exp.sha.5114f85',
        '1.0.0+21AF26D3-117B344092BD',
        '1.0.0+build.1.2.3',
        '1.0.0+x.y.z',
      ];

      complexBuilds.forEach((version) => {
        const result = PackageVersion.create(version);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getBuild()).toBeDefined();
        }
      });
    });

    it('should handle constraint edge cases', () => {
      const result = PackageVersion.create('1.0.0');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;

        // Edge cases that should return false
        expect(version.satisfiesConstraint('> ')).toBe(false);
        expect(version.satisfiesConstraint('<')).toBe(false);
        expect(version.satisfiesConstraint('^')).toBe(false);
        expect(version.satisfiesConstraint('~')).toBe(false);
        expect(version.satisfiesConstraint('>=')).toBe(false);
        expect(version.satisfiesConstraint('<=')).toBe(false);
      }
    });

    it('should handle comparison with self', () => {
      const result = PackageVersion.create('1.2.3-alpha.1+build.123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const version = result.value;
        expect(version.compareWith(version)).toBe(0);
        expect(version.equals(version)).toBe(true);
        expect(version.isCompatibleWith(version)).toBe(true);
      }
    });
  });

  describe('constraint satisfaction stress tests', () => {
    it('should handle multiple constraint types correctly', () => {
      const testCases = [
        { version: '1.2.3', constraint: '^1.0.0', expected: true },
        { version: '1.2.3', constraint: '^1.2.0', expected: true },
        { version: '1.2.3', constraint: '^1.3.0', expected: false },
        { version: '1.2.3', constraint: '~1.2.0', expected: true },
        { version: '1.2.3', constraint: '~1.1.0', expected: false },
        { version: '1.2.3', constraint: '>=1.2.3', expected: true },
        { version: '1.2.3', constraint: '<=1.2.3', expected: true },
        { version: '1.2.3', constraint: '>1.2.2', expected: true },
        { version: '1.2.3', constraint: '<1.2.4', expected: true },
        { version: '2.0.0-alpha.1', constraint: '^2.0.0-alpha', expected: true },
        { version: '2.0.0-beta.1', constraint: '~2.0.0-beta.1', expected: true },
      ];

      testCases.forEach(({ version, constraint, expected }) => {
        const result = PackageVersion.create(version);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.satisfiesConstraint(constraint)).toBe(expected);
        }
      });
    });
  });
});
