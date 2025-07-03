/**
 * Tests for PackageVersion entity
 *
 * Focuses on:
 * - Entity creation and validation
 * - Version status management
 * - Version comparison logic
 * - Breaking changes tracking
 * - Migration guide handling
 * - Deprecation management
 * - Error conditions and edge cases
 * - High coverage for all methods
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  PackageVersion,
  type PackageVersionData,
  type VersionStatus,
} from '../../entities/PackageVersion';
import { InvalidPackageVersionError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';
import { PackageSource } from '../../value-objects/package-source';

describe('PackageVersion', () => {
  let packageId: PackageId;
  let packageSource: PackageSource;
  let publishedAt: Date;

  beforeEach(() => {
    const idResult = PackageId.create('test-package');
    expect(idResult.isOk()).toBe(true);
    if (idResult.isOk()) {
      packageId = idResult.value;
    }

    const sourceResult = PackageSource.createFromGit({
      url: 'https://github.com/test/package.git',
      ref: 'v1.0.0',
    });
    expect(sourceResult.isOk()).toBe(true);
    if (sourceResult.isOk()) {
      packageSource = sourceResult.value;
    }

    publishedAt = new Date('2023-01-01T10:00:00Z');
  });

  describe('create', () => {
    it('should create a valid package version with minimal data', () => {
      const data: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result = PackageVersion.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getPackageId()).toBe(packageId);
        expect(packageVersion.getVersion()).toBe('1.0.0');
        expect(packageVersion.getStatus()).toBe('stable');
        expect(packageVersion.getSource()).toBe(packageSource);
        expect(packageVersion.getPublishedAt()).toBe(publishedAt);
        expect(packageVersion.getDeprecationReason()).toBeUndefined();
        expect(packageVersion.getCompatibilityNotes()).toBeUndefined();
        expect(packageVersion.getBreakingChanges()).toEqual([]);
        expect(packageVersion.getMigrationGuide()).toBeUndefined();
      }
    });

    it('should create package version with all optional data', () => {
      const data: PackageVersionData = {
        packageId,
        version: '2.0.0',
        status: 'deprecated',
        source: packageSource,
        publishedAt,
        deprecationReason: 'Security vulnerability found',
        compatibilityNotes: 'Compatible with NodeJS 14+',
        breakingChanges: ['API signature changed', 'Removed legacy methods'],
        migrationGuide: 'See docs/migration.md for upgrade instructions',
      };

      const result = PackageVersion.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getDeprecationReason()).toBe('Security vulnerability found');
        expect(packageVersion.getCompatibilityNotes()).toBe('Compatible with NodeJS 14+');
        expect(packageVersion.getBreakingChanges()).toEqual([
          'API signature changed',
          'Removed legacy methods',
        ]);
        expect(packageVersion.getMigrationGuide()).toBe(
          'See docs/migration.md for upgrade instructions'
        );
      }
    });

    it('should fail with empty version', () => {
      const data: PackageVersionData = {
        packageId,
        version: '',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result = PackageVersion.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toBe('Version cannot be empty');
      }
    });

    it('should fail with whitespace-only version', () => {
      const data: PackageVersionData = {
        packageId,
        version: '   ',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result = PackageVersion.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toBe('Version cannot be empty');
      }
    });

    it('should fail with invalid version format', () => {
      const data: PackageVersionData = {
        packageId,
        version: 'invalid-version',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result = PackageVersion.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toContain('Invalid version format');
      }
    });

    it('should fail when deprecated status has no deprecation reason', () => {
      const data: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'deprecated',
        source: packageSource,
        publishedAt,
        // Missing deprecationReason
      };

      const result = PackageVersion.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toBe('Deprecated version must have deprecation reason');
      }
    });

    it('should fail when published date is in the future', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const data: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt: futureDate,
      };

      const result = PackageVersion.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toBe('Published date cannot be in the future');
      }
    });

    it('should allow published date that is exactly now', () => {
      const now = new Date();

      const data: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt: now,
      };

      const result = PackageVersion.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getPublishedAt()).toBe(now);
      }
    });
  });

  describe('createNew', () => {
    it('should create new stable version', () => {
      const result = PackageVersion.createNew(packageId, '1.0.0', packageSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getPackageId()).toBe(packageId);
        expect(packageVersion.getVersion()).toBe('1.0.0');
        expect(packageVersion.getStatus()).toBe('available');
        expect(packageVersion.getSource()).toBe(packageSource);
        expect(packageVersion.getPublishedAt()).toBeInstanceOf(Date);
      }
    });

    it('should create new prerelease version', () => {
      const result = PackageVersion.createNew(packageId, '1.0.0-alpha.1', packageSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getVersion()).toBe('1.0.0-alpha.1');
        expect(packageVersion.getStatus()).toBe('prerelease');
        expect(packageVersion.isPrerelease()).toBe(true);
      }
    });

    it('should create version with custom published date', () => {
      const customDate = new Date('2022-06-15T08:30:00Z');

      const result = PackageVersion.createNew(packageId, '1.0.0', packageSource, customDate);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getPublishedAt()).toBe(customDate);
      }
    });

    it('should trim whitespace from version', () => {
      const result = PackageVersion.createNew(packageId, '  1.0.0  ', packageSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.getVersion()).toBe('1.0.0');
      }
    });

    it('should fail with empty trimmed version', () => {
      const result = PackageVersion.createNew(packageId, '   ', packageSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toBe('Version cannot be empty');
      }
    });

    it('should fail with invalid version format', () => {
      const result = PackageVersion.createNew(packageId, 'not-a-version', packageSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toContain('Invalid version format');
      }
    });
  });

  describe('status checking methods', () => {
    const statusTypes: VersionStatus[] = [
      'available',
      'deprecated',
      'removed',
      'prerelease',
      'stable',
    ];

    statusTypes.forEach(status => {
      it(`should handle ${status} status correctly`, () => {
        const data: PackageVersionData = {
          packageId,
          version: status === 'prerelease' ? '1.0.0-beta.1' : '1.0.0',
          status,
          source: packageSource,
          publishedAt,
          ...(status === 'deprecated' ? { deprecationReason: 'Test reason' } : {}),
        };

        const result = PackageVersion.create(data);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const packageVersion = result.value;
          expect(packageVersion.getStatus()).toBe(status);

          // Check status-specific methods
          expect(packageVersion.isAvailable()).toBe(['available', 'stable'].includes(status));
          expect(packageVersion.isDeprecated()).toBe(status === 'deprecated');
          expect(packageVersion.isRemoved()).toBe(status === 'removed');
          expect(packageVersion.isPrerelease()).toBe(status === 'prerelease');
          expect(packageVersion.isStable()).toBe(status === 'stable');
          expect(packageVersion.canBeUsed()).toBe(
            status !== 'removed' && ['available', 'stable'].includes(status)
          );
        }
      });
    });
  });

  describe('breaking changes tracking', () => {
    it('should detect presence of breaking changes', () => {
      const data: PackageVersionData = {
        packageId,
        version: '2.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
        breakingChanges: ['API changed', 'Removed feature'],
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.hasBreakingChanges()).toBe(true);
        expect(packageVersion.getBreakingChanges()).toEqual(['API changed', 'Removed feature']);
      }
    });

    it('should detect absence of breaking changes', () => {
      const data: PackageVersionData = {
        packageId,
        version: '1.1.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
        // No breaking changes
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.hasBreakingChanges()).toBe(false);
        expect(packageVersion.getBreakingChanges()).toEqual([]);
      }
    });

    it('should handle empty breaking changes array', () => {
      const data: PackageVersionData = {
        packageId,
        version: '1.1.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
        breakingChanges: [],
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.hasBreakingChanges()).toBe(false);
        expect(packageVersion.getBreakingChanges()).toEqual([]);
      }
    });
  });

  describe('version comparison', () => {
    let version1_0_0: PackageVersion;
    let version1_1_0: PackageVersion;
    let version2_0_0: PackageVersion;
    let version1_0_0_alpha: PackageVersion;

    beforeEach(() => {
      const results = [
        PackageVersion.createNew(packageId, '1.0.0', packageSource),
        PackageVersion.createNew(packageId, '1.1.0', packageSource),
        PackageVersion.createNew(packageId, '2.0.0', packageSource),
        PackageVersion.createNew(packageId, '1.0.0-alpha.1', packageSource),
      ];

      results.forEach(result => expect(result.isOk()).toBe(true));

      if (results.every(result => result.isOk())) {
        [version1_0_0, version1_1_0, version2_0_0, version1_0_0_alpha] = results.map(
          result => (result as any).value
        );
      }
    });

    it('should compare major versions correctly', () => {
      expect(version2_0_0.compareVersion(version1_0_0)).toBeGreaterThan(0);
      expect(version1_0_0.compareVersion(version2_0_0)).toBeLessThan(0);
      expect(version1_0_0.compareVersion(version1_0_0)).toBe(0);
    });

    it('should compare minor versions correctly', () => {
      expect(version1_1_0.compareVersion(version1_0_0)).toBeGreaterThan(0);
      expect(version1_0_0.compareVersion(version1_1_0)).toBeLessThan(0);
    });

    it('should handle prerelease versions correctly', () => {
      expect(version1_0_0_alpha.compareVersion(version1_0_0)).toBeLessThan(0);
      expect(version1_0_0.compareVersion(version1_0_0_alpha)).toBeGreaterThan(0);
    });

    it('should check if version is newer than another', () => {
      expect(version2_0_0.isNewerThan(version1_0_0)).toBe(true);
      expect(version1_1_0.isNewerThan(version1_0_0)).toBe(true);
      expect(version1_0_0.isNewerThan(version2_0_0)).toBe(false);
      expect(version1_0_0_alpha.isNewerThan(version1_0_0)).toBe(false);
    });

    it('should check if version is older than another', () => {
      expect(version1_0_0.isOlderThan(version2_0_0)).toBe(true);
      expect(version1_0_0.isOlderThan(version1_1_0)).toBe(true);
      expect(version2_0_0.isOlderThan(version1_0_0)).toBe(false);
      expect(version1_0_0_alpha.isOlderThan(version1_0_0)).toBe(true);
    });

    it('should check if versions are the same', () => {
      expect(version1_0_0.isSameVersion(version1_0_0)).toBe(true);
      expect(version1_0_0.isSameVersion(version1_1_0)).toBe(false);
      expect(version1_0_0.isSameVersion(version2_0_0)).toBe(false);
    });

    it('should handle complex version comparison', () => {
      const complexVersions = [
        '1.0.0-alpha.1',
        '1.0.0-alpha.2',
        '1.0.0-beta.1',
        '1.0.0',
        '1.0.1',
        '1.1.0',
        '2.0.0',
      ];

      const packageVersions = complexVersions.map(version => {
        const result = PackageVersion.createNew(packageId, version, packageSource);
        expect(result.isOk()).toBe(true);
        return (result as any).value;
      });

      // Test ordering
      for (let i = 0; i < packageVersions.length - 1; i++) {
        expect(packageVersions[i].isOlderThan(packageVersions[i + 1])).toBe(true);
        expect(packageVersions[i + 1].isNewerThan(packageVersions[i])).toBe(true);
      }
    });
  });

  describe('withStatus', () => {
    let packageVersion: PackageVersion;

    beforeEach(() => {
      const result = PackageVersion.createNew(packageId, '1.0.0', packageSource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        packageVersion = result.value;
      }
    });

    it('should update status to deprecated with reason', () => {
      const result = packageVersion.withStatus('deprecated', 'Security vulnerability');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getStatus()).toBe('deprecated');
        expect(updatedVersion.isDeprecated()).toBe(true);
        expect(updatedVersion.getDeprecationReason()).toBe('Security vulnerability');
      }
    });

    it('should update status to stable', () => {
      const result = packageVersion.withStatus('stable');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getStatus()).toBe('stable');
        expect(updatedVersion.isStable()).toBe(true);
      }
    });

    it('should update status to removed', () => {
      const result = packageVersion.withStatus('removed');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getStatus()).toBe('removed');
        expect(updatedVersion.isRemoved()).toBe(true);
        expect(updatedVersion.canBeUsed()).toBe(false);
      }
    });

    it('should fail when setting deprecated status without reason', () => {
      const result = packageVersion.withStatus('deprecated');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidPackageVersionError);
        expect(result.error.message).toBe('Deprecated status requires deprecation reason');
      }
    });

    it('should preserve other data when updating status', () => {
      const result = packageVersion.withStatus('stable');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getPackageId()).toBe(packageVersion.getPackageId());
        expect(updatedVersion.getVersion()).toBe(packageVersion.getVersion());
        expect(updatedVersion.getSource()).toBe(packageVersion.getSource());
        expect(updatedVersion.getPublishedAt()).toBe(packageVersion.getPublishedAt());
      }
    });
  });

  describe('withCompatibilityNotes', () => {
    let packageVersion: PackageVersion;

    beforeEach(() => {
      const result = PackageVersion.createNew(packageId, '1.0.0', packageSource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        packageVersion = result.value;
      }
    });

    it('should set compatibility notes', () => {
      const notes = 'Compatible with Node.js 14+ and npm 6+';
      const result = packageVersion.withCompatibilityNotes(notes);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getCompatibilityNotes()).toBe(notes);
      }
    });

    it('should trim whitespace from compatibility notes', () => {
      const result = packageVersion.withCompatibilityNotes('  trimmed notes  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getCompatibilityNotes()).toBe('trimmed notes');
      }
    });

    it('should handle empty compatibility notes', () => {
      const result = packageVersion.withCompatibilityNotes('');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getCompatibilityNotes()).toBeUndefined();
      }
    });

    it('should handle whitespace-only compatibility notes', () => {
      const result = packageVersion.withCompatibilityNotes('   ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getCompatibilityNotes()).toBeUndefined();
      }
    });
  });

  describe('withBreakingChanges', () => {
    let packageVersion: PackageVersion;

    beforeEach(() => {
      const result = PackageVersion.createNew(packageId, '2.0.0', packageSource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        packageVersion = result.value;
      }
    });

    it('should set breaking changes', () => {
      const changes = [
        'API signature changed',
        'Removed deprecated methods',
        'New required parameters',
      ];
      const result = packageVersion.withBreakingChanges(changes);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getBreakingChanges()).toEqual(changes);
        expect(updatedVersion.hasBreakingChanges()).toBe(true);
      }
    });

    it('should filter out empty breaking changes', () => {
      const changes = ['Valid change', '', '  ', 'Another valid change'];
      const result = packageVersion.withBreakingChanges(changes);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getBreakingChanges()).toEqual([
          'Valid change',
          'Another valid change',
        ]);
      }
    });

    it('should handle empty breaking changes array', () => {
      const result = packageVersion.withBreakingChanges([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getBreakingChanges()).toEqual([]);
        expect(updatedVersion.hasBreakingChanges()).toBe(false);
      }
    });

    it('should handle array with only empty strings', () => {
      const result = packageVersion.withBreakingChanges(['', '  ', '   ']);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getBreakingChanges()).toEqual([]);
        expect(updatedVersion.hasBreakingChanges()).toBe(false);
      }
    });
  });

  describe('withMigrationGuide', () => {
    let packageVersion: PackageVersion;

    beforeEach(() => {
      const result = PackageVersion.createNew(packageId, '2.0.0', packageSource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        packageVersion = result.value;
      }
    });

    it('should set migration guide', () => {
      const guide = 'See https://docs.example.com/migration for detailed upgrade instructions';
      const result = packageVersion.withMigrationGuide(guide);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getMigrationGuide()).toBe(guide);
      }
    });

    it('should trim whitespace from migration guide', () => {
      const result = packageVersion.withMigrationGuide('  migration instructions  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getMigrationGuide()).toBe('migration instructions');
      }
    });

    it('should handle empty migration guide', () => {
      const result = packageVersion.withMigrationGuide('');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getMigrationGuide()).toBeUndefined();
      }
    });

    it('should handle whitespace-only migration guide', () => {
      const result = packageVersion.withMigrationGuide('   ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getMigrationGuide()).toBeUndefined();
      }
    });
  });

  describe('status helper methods', () => {
    let packageVersion: PackageVersion;

    beforeEach(() => {
      const result = PackageVersion.createNew(packageId, '1.0.0', packageSource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        packageVersion = result.value;
      }
    });

    it('should mark as deprecated', () => {
      const reason = 'Contains security vulnerability';
      const result = packageVersion.markAsDeprecated(reason);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getStatus()).toBe('deprecated');
        expect(updatedVersion.isDeprecated()).toBe(true);
        expect(updatedVersion.getDeprecationReason()).toBe(reason);
      }
    });

    it('should mark as removed', () => {
      const result = packageVersion.markAsRemoved();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getStatus()).toBe('removed');
        expect(updatedVersion.isRemoved()).toBe(true);
        expect(updatedVersion.canBeUsed()).toBe(false);
      }
    });

    it('should mark as stable', () => {
      const result = packageVersion.markAsStable();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedVersion = result.value;
        expect(updatedVersion.getStatus()).toBe('stable');
        expect(updatedVersion.isStable()).toBe(true);
        expect(updatedVersion.isAvailable()).toBe(true);
        expect(updatedVersion.canBeUsed()).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should compare package versions by package ID, version, and source', () => {
      const data1: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const data2: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'deprecated', // Different status
        source: packageSource,
        publishedAt: new Date('2024-01-01'), // Different published date
        deprecationReason: 'Test reason',
        compatibilityNotes: 'Test notes',
        breakingChanges: ['Test change'],
        migrationGuide: 'Test guide',
      };

      const result1 = PackageVersion.create(data1);
      const result2 = PackageVersion.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const version1 = result1.value;
        const version2 = result2.value;

        // Should be equal despite different status and metadata
        expect(version1.equals(version2)).toBe(true);
        expect(version2.equals(version1)).toBe(true);
      }
    });

    it('should not be equal with different package IDs', () => {
      const otherIdResult = PackageId.create('other-package');
      expect(otherIdResult.isOk()).toBe(true);

      if (otherIdResult.isOk()) {
        const otherId = otherIdResult.value;

        const data1: PackageVersionData = {
          packageId,
          version: '1.0.0',
          status: 'stable',
          source: packageSource,
          publishedAt,
        };

        const data2: PackageVersionData = {
          packageId: otherId,
          version: '1.0.0',
          status: 'stable',
          source: packageSource,
          publishedAt,
        };

        const result1 = PackageVersion.create(data1);
        const result2 = PackageVersion.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const version1 = result1.value;
          const version2 = result2.value;

          expect(version1.equals(version2)).toBe(false);
        }
      }
    });

    it('should not be equal with different versions', () => {
      const data1: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const data2: PackageVersionData = {
        packageId,
        version: '2.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result1 = PackageVersion.create(data1);
      const result2 = PackageVersion.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const version1 = result1.value;
        const version2 = result2.value;

        expect(version1.equals(version2)).toBe(false);
      }
    });

    it('should not be equal with different sources', () => {
      const otherSourceResult = PackageSource.createFromLocal({
        path: '/local/path',
      });
      expect(otherSourceResult.isOk()).toBe(true);

      if (otherSourceResult.isOk()) {
        const otherSource = otherSourceResult.value;

        const data1: PackageVersionData = {
          packageId,
          version: '1.0.0',
          status: 'stable',
          source: packageSource,
          publishedAt,
        };

        const data2: PackageVersionData = {
          packageId,
          version: '1.0.0',
          status: 'stable',
          source: otherSource,
          publishedAt,
        };

        const result1 = PackageVersion.create(data1);
        const result2 = PackageVersion.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const version1 = result1.value;
          const version2 = result2.value;

          expect(version1.equals(version2)).toBe(false);
        }
      }
    });

    it('should be equal to itself', () => {
      const data: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageVersion = result.value;
        expect(packageVersion.equals(packageVersion)).toBe(true);
      }
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON format', () => {
      const data: PackageVersionData = {
        packageId,
        version: '2.0.0',
        status: 'deprecated',
        source: packageSource,
        publishedAt,
        deprecationReason: 'Security issue',
        compatibilityNotes: 'Node 14+',
        breakingChanges: ['API changed', 'Removed method'],
        migrationGuide: 'See docs',
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageVersion = result.value;
        const json = packageVersion.toJSON();

        expect(json).toEqual({
          packageId: 'test-package',
          version: '2.0.0',
          status: 'deprecated',
          source: expect.anything(), // PackageSource JSON object
          publishedAt: publishedAt.toISOString(),
          deprecationReason: 'Security issue',
          compatibilityNotes: 'Node 14+',
          breakingChanges: ['API changed', 'Removed method'],
          migrationGuide: 'See docs',
        });
      }
    });

    it('should handle minimal package version data in JSON', () => {
      const data: PackageVersionData = {
        packageId,
        version: '1.0.0',
        status: 'stable',
        source: packageSource,
        publishedAt,
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageVersion = result.value;
        const json = packageVersion.toJSON();

        expect(json).toEqual({
          packageId: 'test-package',
          version: '1.0.0',
          status: 'stable',
          source: expect.anything(),
          publishedAt: publishedAt.toISOString(),
          deprecationReason: undefined,
          compatibilityNotes: undefined,
          breakingChanges: undefined,
          migrationGuide: undefined,
        });
      }
    });
  });

  describe('getter methods', () => {
    let packageVersion: PackageVersion;

    beforeEach(() => {
      const data: PackageVersionData = {
        packageId,
        version: '1.5.2',
        status: 'deprecated',
        source: packageSource,
        publishedAt,
        deprecationReason: 'Replaced by newer version',
        compatibilityNotes: 'Works with Node 12+',
        breakingChanges: ['Config format changed'],
        migrationGuide: 'Update config files',
      };

      const result = PackageVersion.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        packageVersion = result.value;
      }
    });

    it('should return all properties correctly', () => {
      expect(packageVersion.getPackageId()).toBe(packageId);
      expect(packageVersion.getVersion()).toBe('1.5.2');
      expect(packageVersion.getStatus()).toBe('deprecated');
      expect(packageVersion.getSource()).toBe(packageSource);
      expect(packageVersion.getPublishedAt()).toBe(publishedAt);
      expect(packageVersion.getDeprecationReason()).toBe('Replaced by newer version');
      expect(packageVersion.getCompatibilityNotes()).toBe('Works with Node 12+');
      expect(packageVersion.getBreakingChanges()).toEqual(['Config format changed']);
      expect(packageVersion.getMigrationGuide()).toBe('Update config files');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid version comparison gracefully', () => {
      const result1 = PackageVersion.createNew(packageId, '1.0.0', packageSource);
      const result2 = PackageVersion.createNew(packageId, '1.0.0', packageSource);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const version1 = result1.value;
        const version2 = result2.value;

        // Same version comparison
        expect(version1.compareVersion(version2)).toBe(0);
        expect(version1.isSameVersion(version2)).toBe(true);
        expect(version1.isNewerThan(version2)).toBe(false);
        expect(version1.isOlderThan(version2)).toBe(false);
      }
    });

    it('should handle version with complex prerelease identifiers', () => {
      const complexVersions = [
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-alpha.beta',
        '1.0.0-beta',
        '1.0.0-beta.2',
        '1.0.0-beta.11',
        '1.0.0-rc.1',
      ];

      const packageVersions = complexVersions.map(version => {
        const result = PackageVersion.createNew(packageId, version, packageSource);
        expect(result.isOk()).toBe(true);
        return (result as any).value;
      });

      // All should be prereleases
      packageVersions.forEach(version => {
        expect(version.isPrerelease()).toBe(true);
        expect(version.getStatus()).toBe('prerelease');
      });

      // Test some ordering (alpha < beta < rc)
      expect(packageVersions[0].isOlderThan(packageVersions[3])).toBe(true); // alpha < beta
      expect(packageVersions[3].isOlderThan(packageVersions[6])).toBe(true); // beta < rc
    });
  });
});
