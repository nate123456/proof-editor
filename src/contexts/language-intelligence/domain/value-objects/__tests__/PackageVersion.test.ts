import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import { PackageVersion } from '../PackageVersion';

describe('PackageVersion', () => {
  describe('create', () => {
    it('should create a valid PackageVersion from semantic version string', () => {
      const result = PackageVersion.create('1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBeNull();
        expect(result.value.getBuild()).toBeNull();
      }
    });

    it('should create a valid PackageVersion with prerelease', () => {
      const result = PackageVersion.create('1.2.3-alpha.1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBe('alpha.1');
        expect(result.value.getBuild()).toBeNull();
      }
    });

    it('should create a valid PackageVersion with prerelease and build', () => {
      const result = PackageVersion.create('1.2.3-alpha.1+build.123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBe('alpha.1');
        expect(result.value.getBuild()).toBe('build.123');
      }
    });

    it('should create a valid PackageVersion with build only', () => {
      const result = PackageVersion.create('1.2.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBeNull();
        expect(result.value.getBuild()).toBe('build.456');
      }
    });

    it('should trim whitespace from version string', () => {
      const result = PackageVersion.create('  1.2.3  ');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
      }
    });

    it('should return error for empty string', () => {
      const result = PackageVersion.create('');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Version string cannot be empty');
      }
    });

    it('should return error for whitespace only string', () => {
      const result = PackageVersion.create('   ');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Version string cannot be empty');
      }
    });

    it('should return error for invalid format', () => {
      const result = PackageVersion.create('1.2');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe(
          'Version must follow semantic versioning format (major.minor.patch)',
        );
      }
    });

    it('should return error for non-numeric version parts', () => {
      const result = PackageVersion.create('a.b.c');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe(
          'Version must follow semantic versioning format (major.minor.patch)',
        );
      }
    });

    it('should return error for negative version numbers', () => {
      const result = PackageVersion.create('-1.2.3');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe(
          'Version must follow semantic versioning format (major.minor.patch)',
        );
      }
    });

    it('should handle zero versions', () => {
      const result = PackageVersion.create('0.0.0');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(0);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
      }
    });

    it('should handle large version numbers', () => {
      const result = PackageVersion.create('999.999.999');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(999);
        expect(result.value.getMinor()).toBe(999);
        expect(result.value.getPatch()).toBe(999);
      }
    });

    it('should handle complex prerelease identifiers', () => {
      const result = PackageVersion.create('1.0.0-alpha.1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrerelease()).toBe('alpha.1.2.3');
      }
    });

    it('should handle complex build identifiers', () => {
      const result = PackageVersion.create('1.0.0+build.123.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getBuild()).toBe('build.123.456');
      }
    });
  });

  describe('createFromNumbers', () => {
    it('should create a valid PackageVersion from numbers', () => {
      const result = PackageVersion.createFromNumbers(1, 2, 3);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBeNull();
        expect(result.value.getBuild()).toBeNull();
      }
    });

    it('should create a valid PackageVersion with prerelease', () => {
      const result = PackageVersion.createFromNumbers(1, 2, 3, 'alpha');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBe('alpha');
        expect(result.value.getBuild()).toBeNull();
      }
    });

    it('should create a valid PackageVersion with prerelease and build', () => {
      const result = PackageVersion.createFromNumbers(1, 2, 3, 'alpha', 'build123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(1);
        expect(result.value.getMinor()).toBe(2);
        expect(result.value.getPatch()).toBe(3);
        expect(result.value.getPrerelease()).toBe('alpha');
        expect(result.value.getBuild()).toBe('build123');
      }
    });

    it('should return error for negative major version', () => {
      const result = PackageVersion.createFromNumbers(-1, 2, 3);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Version numbers cannot be negative');
      }
    });

    it('should return error for negative minor version', () => {
      const result = PackageVersion.createFromNumbers(1, -2, 3);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Version numbers cannot be negative');
      }
    });

    it('should return error for negative patch version', () => {
      const result = PackageVersion.createFromNumbers(1, 2, -3);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Version numbers cannot be negative');
      }
    });

    it('should handle zero values', () => {
      const result = PackageVersion.createFromNumbers(0, 0, 0);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(0);
        expect(result.value.getMinor()).toBe(0);
        expect(result.value.getPatch()).toBe(0);
      }
    });

    it('should handle undefined prerelease and build', () => {
      const result = PackageVersion.createFromNumbers(1, 2, 3, undefined, undefined);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrerelease()).toBeNull();
        expect(result.value.getBuild()).toBeNull();
      }
    });

    it('should handle empty string prerelease and build', () => {
      const result = PackageVersion.createFromNumbers(1, 2, 3, '', '');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrerelease()).toBe('');
        expect(result.value.getBuild()).toBe('');
      }
    });
  });

  describe('toString', () => {
    it('should return basic version string', () => {
      const result = PackageVersion.create('1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.2.3');
      }
    });

    it('should return version string with prerelease', () => {
      const result = PackageVersion.create('1.2.3-alpha.1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.2.3-alpha.1');
      }
    });

    it('should return version string with build', () => {
      const result = PackageVersion.create('1.2.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.2.3+build.456');
      }
    });

    it('should return version string with prerelease and build', () => {
      const result = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('1.2.3-alpha.1+build.456');
      }
    });
  });

  describe('getStableVersion', () => {
    it('should return stable version for basic version', () => {
      const result = PackageVersion.create('1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStableVersion()).toBe('1.2.3');
      }
    });

    it('should return stable version for prerelease', () => {
      const result = PackageVersion.create('1.2.3-alpha.1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStableVersion()).toBe('1.2.3');
      }
    });

    it('should return stable version for version with build', () => {
      const result = PackageVersion.create('1.2.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStableVersion()).toBe('1.2.3');
      }
    });

    it('should return stable version for prerelease with build', () => {
      const result = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStableVersion()).toBe('1.2.3');
      }
    });
  });

  describe('isPrerelease', () => {
    it('should return false for stable version', () => {
      const result = PackageVersion.create('1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPrerelease()).toBe(false);
      }
    });

    it('should return true for prerelease version', () => {
      const result = PackageVersion.create('1.2.3-alpha.1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPrerelease()).toBe(true);
      }
    });

    it('should return false for version with build only', () => {
      const result = PackageVersion.create('1.2.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPrerelease()).toBe(false);
      }
    });

    it('should return true for prerelease with build', () => {
      const result = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isPrerelease()).toBe(true);
      }
    });
  });

  describe('isStable', () => {
    it('should return true for stable version', () => {
      const result = PackageVersion.create('1.2.3');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isStable()).toBe(true);
      }
    });

    it('should return false for prerelease version', () => {
      const result = PackageVersion.create('1.2.3-alpha.1');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isStable()).toBe(false);
      }
    });

    it('should return true for version with build only', () => {
      const result = PackageVersion.create('1.2.3+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isStable()).toBe(true);
      }
    });

    it('should return false for prerelease with build', () => {
      const result = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isStable()).toBe(false);
      }
    });
  });

  describe('compareTo', () => {
    it('should compare major versions', () => {
      const v1 = PackageVersion.create('2.0.0');
      const v2 = PackageVersion.create('1.0.0');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
        expect(v2.value.compareTo(v1.value)).toBeLessThan(0);
      }
    });

    it('should compare minor versions when major is same', () => {
      const v1 = PackageVersion.create('1.2.0');
      const v2 = PackageVersion.create('1.1.0');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
        expect(v2.value.compareTo(v1.value)).toBeLessThan(0);
      }
    });

    it('should compare patch versions when major and minor are same', () => {
      const v1 = PackageVersion.create('1.1.2');
      const v2 = PackageVersion.create('1.1.1');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
        expect(v2.value.compareTo(v1.value)).toBeLessThan(0);
      }
    });

    it('should return 0 for equal versions', () => {
      const v1 = PackageVersion.create('1.2.3');
      const v2 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.compareTo(v2.value)).toBe(0);
      }
    });

    it('should handle prerelease versions', () => {
      const stable = PackageVersion.create('1.2.3');
      const prerelease = PackageVersion.create('1.2.3-alpha.1');
      expect(stable.isOk()).toBe(true);
      expect(prerelease.isOk()).toBe(true);
      if (stable.isOk() && prerelease.isOk()) {
        expect(stable.value.compareTo(prerelease.value)).toBeGreaterThan(0);
        expect(prerelease.value.compareTo(stable.value)).toBeLessThan(0);
      }
    });

    it('should compare prerelease versions lexicographically', () => {
      const alpha = PackageVersion.create('1.2.3-alpha.1');
      const beta = PackageVersion.create('1.2.3-beta.1');
      expect(alpha.isOk()).toBe(true);
      expect(beta.isOk()).toBe(true);
      if (alpha.isOk() && beta.isOk()) {
        expect(alpha.value.compareTo(beta.value)).toBeLessThan(0);
        expect(beta.value.compareTo(alpha.value)).toBeGreaterThan(0);
      }
    });

    it('should return 0 for equal prerelease versions', () => {
      const v1 = PackageVersion.create('1.2.3-alpha.1');
      const v2 = PackageVersion.create('1.2.3-alpha.1');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.compareTo(v2.value)).toBe(0);
      }
    });
  });

  describe('comparison methods', () => {
    it('should correctly implement isGreaterThan', () => {
      const v1 = PackageVersion.create('1.2.3');
      const v2 = PackageVersion.create('1.2.2');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.isGreaterThan(v2.value)).toBe(true);
        expect(v2.value.isGreaterThan(v1.value)).toBe(false);
      }
    });

    it('should correctly implement isLessThan', () => {
      const v1 = PackageVersion.create('1.2.2');
      const v2 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.isLessThan(v2.value)).toBe(true);
        expect(v2.value.isLessThan(v1.value)).toBe(false);
      }
    });

    it('should correctly implement isEqualTo', () => {
      const v1 = PackageVersion.create('1.2.3');
      const v2 = PackageVersion.create('1.2.3');
      const v3 = PackageVersion.create('1.2.2');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      expect(v3.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk() && v3.isOk()) {
        expect(v1.value.isEqualTo(v2.value)).toBe(true);
        expect(v1.value.isEqualTo(v3.value)).toBe(false);
      }
    });

    it('should correctly implement equals', () => {
      const v1 = PackageVersion.create('1.2.3');
      const v2 = PackageVersion.create('1.2.3');
      const v3 = PackageVersion.create('1.2.2');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      expect(v3.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk() && v3.isOk()) {
        expect(v1.value.equals(v2.value)).toBe(true);
        expect(v1.value.equals(v3.value)).toBe(false);
      }
    });
  });

  describe('isCompatibleWith', () => {
    it('should return true for compatible versions', () => {
      const v1 = PackageVersion.create('1.2.3');
      const v2 = PackageVersion.create('1.2.0');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(true);
      }
    });

    it('should return false for incompatible major versions', () => {
      const v1 = PackageVersion.create('2.0.0');
      const v2 = PackageVersion.create('1.0.0');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(false);
      }
    });

    it('should return false for lower version', () => {
      const v1 = PackageVersion.create('1.2.0');
      const v2 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(false);
      }
    });

    it('should return true for equal versions', () => {
      const v1 = PackageVersion.create('1.2.3');
      const v2 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      expect(v2.isOk()).toBe(true);
      if (v1.isOk() && v2.isOk()) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(true);
      }
    });
  });

  describe('version incrementing', () => {
    it('should increment major version', () => {
      const v1 = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const next = v1.value.nextMajor();
        expect(next.getMajor()).toBe(2);
        expect(next.getMinor()).toBe(0);
        expect(next.getPatch()).toBe(0);
        expect(next.getPrerelease()).toBeNull();
        expect(next.getBuild()).toBeNull();
      }
    });

    it('should increment minor version', () => {
      const v1 = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const next = v1.value.nextMinor();
        expect(next.getMajor()).toBe(1);
        expect(next.getMinor()).toBe(3);
        expect(next.getPatch()).toBe(0);
        expect(next.getPrerelease()).toBeNull();
        expect(next.getBuild()).toBeNull();
      }
    });

    it('should increment patch version', () => {
      const v1 = PackageVersion.create('1.2.3-alpha.1+build.456');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const next = v1.value.nextPatch();
        expect(next.getMajor()).toBe(1);
        expect(next.getMinor()).toBe(2);
        expect(next.getPatch()).toBe(4);
        expect(next.getPrerelease()).toBeNull();
        expect(next.getBuild()).toBeNull();
      }
    });
  });

  describe('withPrerelease', () => {
    it('should add prerelease to version', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withPrerelease('alpha.1');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPrerelease()).toBe('alpha.1');
          expect(result.value.getBuild()).toBeNull();
        }
      }
    });

    it('should replace existing prerelease', () => {
      const v1 = PackageVersion.create('1.2.3-alpha.1');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withPrerelease('beta.2');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPrerelease()).toBe('beta.2');
        }
      }
    });

    it('should preserve existing build', () => {
      const v1 = PackageVersion.create('1.2.3+build.456');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withPrerelease('alpha.1');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPrerelease()).toBe('alpha.1');
          expect(result.value.getBuild()).toBe('build.456');
        }
      }
    });

    it('should return error for empty prerelease', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withPrerelease('');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid prerelease format');
        }
      }
    });

    it('should return error for invalid prerelease format', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withPrerelease('invalid@format');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid prerelease format');
        }
      }
    });

    it('should accept valid prerelease formats', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const validFormats = ['alpha', 'alpha.1', 'alpha-1', 'alpha.1.2', 'alpha1', 'alpha-beta.1'];
        for (const format of validFormats) {
          const result = v1.value.withPrerelease(format);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getPrerelease()).toBe(format);
          }
        }
      }
    });
  });

  describe('withBuild', () => {
    it('should add build to version', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withBuild('build.456');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getBuild()).toBe('build.456');
          expect(result.value.getPrerelease()).toBeNull();
        }
      }
    });

    it('should replace existing build', () => {
      const v1 = PackageVersion.create('1.2.3+build.456');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withBuild('build.789');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getBuild()).toBe('build.789');
        }
      }
    });

    it('should preserve existing prerelease', () => {
      const v1 = PackageVersion.create('1.2.3-alpha.1');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withBuild('build.456');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPrerelease()).toBe('alpha.1');
          expect(result.value.getBuild()).toBe('build.456');
        }
      }
    });

    it('should return error for empty build', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withBuild('');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid build format');
        }
      }
    });

    it('should return error for invalid build format', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const result = v1.value.withBuild('invalid@format');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Invalid build format');
        }
      }
    });

    it('should accept valid build formats', () => {
      const v1 = PackageVersion.create('1.2.3');
      expect(v1.isOk()).toBe(true);
      if (v1.isOk()) {
        const validFormats = [
          'build',
          'build.1',
          'build-1',
          'build.1.2',
          'build1',
          'build-alpha.1',
        ];
        for (const format of validFormats) {
          const result = v1.value.withBuild(format);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getBuild()).toBe(format);
          }
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should handle maximum safe integer values', () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      const result = PackageVersion.createFromNumbers(maxSafe, maxSafe, maxSafe);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getMajor()).toBe(maxSafe);
        expect(result.value.getMinor()).toBe(maxSafe);
        expect(result.value.getPatch()).toBe(maxSafe);
      }
    });

    it('should handle long prerelease strings', () => {
      const longPrerelease = 'a'.repeat(1000);
      const result = PackageVersion.create(`1.2.3-${longPrerelease}`);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrerelease()).toBe(longPrerelease);
      }
    });

    it('should handle long build strings', () => {
      const longBuild = 'b'.repeat(1000);
      const result = PackageVersion.create(`1.2.3+${longBuild}`);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getBuild()).toBe(longBuild);
      }
    });

    it('should handle numeric prerelease identifiers', () => {
      const result = PackageVersion.create('1.2.3-123');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getPrerelease()).toBe('123');
      }
    });

    it('should handle numeric build identifiers', () => {
      const result = PackageVersion.create('1.2.3+456');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getBuild()).toBe('456');
      }
    });

    it('should handle complex version comparisons', () => {
      const versionPairs = [
        ['1.0.0-alpha', '1.0.0-alpha.1'],
        ['1.0.0-alpha.1', '1.0.0-beta'],
        ['1.0.0-beta', '1.0.0-rc.1'],
        ['1.0.0-rc.1', '1.0.0'],
        ['1.0.0', '2.0.0-alpha'],
        ['2.0.0-alpha', '2.0.0'],
      ];

      for (const [lower, higher] of versionPairs) {
        if (!lower || !higher) {
          throw new Error('Version pair contains undefined values');
        }
        const lowerVersion = PackageVersion.create(lower);
        const higherVersion = PackageVersion.create(higher);

        expect(lowerVersion.isOk()).toBe(true);
        expect(higherVersion.isOk()).toBe(true);

        if (lowerVersion.isOk() && higherVersion.isOk()) {
          expect(lowerVersion.value.isLessThan(higherVersion.value)).toBe(true);
          expect(higherVersion.value.isGreaterThan(lowerVersion.value)).toBe(true);
        }
      }
    });
  });
});
