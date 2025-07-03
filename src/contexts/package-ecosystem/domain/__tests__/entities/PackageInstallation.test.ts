/**
 * Tests for PackageInstallation entity
 *
 * Focuses on:
 * - Entity creation and validation
 * - Installation status management
 * - Progress tracking
 * - Configuration override handling
 * - Installation state transitions
 * - Error conditions and edge cases
 * - High coverage for all methods
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  type InstallationStatus,
  PackageInstallation,
  type PackageInstallationData,
} from '../../entities/PackageInstallation';
import type { PackageInstallationInfo } from '../../types/common-types';
import { PackageInstallationError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';
import { PackageSource } from '../../value-objects/package-source';

describe('PackageInstallation', () => {
  let packageId: PackageId;
  let packageSource: PackageSource;
  let installationInfo: PackageInstallationInfo;

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

    installationInfo = {
      installedAt: new Date('2023-01-01T10:00:00Z'),
      installedFrom: {
        url: 'https://github.com/test/package.git',
        ref: 'v1.0.0',
      },
      isEnabled: true,
    };
  });

  describe('create', () => {
    it('should create a valid package installation with minimal data', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getPackageId()).toBe(packageId);
        expect(installation.getPackageVersion()).toBe('1.0.0');
        expect(installation.getStatus()).toBe('installed');
        expect(installation.getInstallationInfo()).toBe(installationInfo);
        expect(installation.getInstallationPath()).toBe('/packages/test-package');
        expect(installation.getErrorMessage()).toBeUndefined();
        expect(installation.getProgress()).toBeUndefined();
      }
    });

    it('should create installation with progress tracking', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 50,
      };

      const result = PackageInstallation.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getStatus()).toBe('installing');
        expect(installation.getProgress()).toBe(50);
        expect(installation.isInProgress()).toBe(true);
      }
    });

    it('should create failed installation with error message', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'failed',
        installationInfo,
        installationPath: '/packages/test-package',
        errorMessage: 'Network connection failed',
      };

      const result = PackageInstallation.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getStatus()).toBe('failed');
        expect(installation.getErrorMessage()).toBe('Network connection failed');
        expect(installation.isFailed()).toBe(true);
      }
    });

    it('should fail with empty package version', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Package version cannot be empty');
      }
    });

    it('should fail with whitespace-only package version', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '   ',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Package version cannot be empty');
      }
    });

    it('should fail with empty installation path', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '',
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Installation path cannot be empty');
      }
    });

    it('should fail with whitespace-only installation path', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '   ',
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Installation path cannot be empty');
      }
    });

    it('should fail when failed status has no error message', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'failed',
        installationInfo,
        installationPath: '/packages/test-package',
        // Missing errorMessage
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Failed installation must have error message');
      }
    });

    it('should fail with progress less than 0', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: -10,
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Progress must be between 0 and 100');
      }
    });

    it('should fail with progress greater than 100', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 150,
      };

      const result = PackageInstallation.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Progress must be between 0 and 100');
      }
    });

    it('should allow valid progress values at boundaries', () => {
      const data0: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 0,
      };

      const data100: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 100,
      };

      const result0 = PackageInstallation.create(data0);
      const result100 = PackageInstallation.create(data100);

      expect(result0.isOk()).toBe(true);
      expect(result100.isOk()).toBe(true);

      if (result0.isOk() && result100.isOk()) {
        expect(result0.value.getProgress()).toBe(0);
        expect(result100.value.getProgress()).toBe(100);
      }
    });
  });

  describe('createForInstallation', () => {
    it('should create installation with git source', () => {
      const result = PackageInstallation.createForInstallation(
        packageId,
        '1.0.0',
        packageSource,
        '/packages/test-package'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getPackageId()).toBe(packageId);
        expect(installation.getPackageVersion()).toBe('1.0.0');
        expect(installation.getStatus()).toBe('installing');
        expect(installation.getInstallationPath()).toBe('/packages/test-package');
        expect(installation.getProgress()).toBe(0);

        const info = installation.getInstallationInfo();
        expect(info.isEnabled).toBe(true);
        expect(info.installedAt).toBeInstanceOf(Date);
        expect(info.installedFrom).toEqual({
          url: 'https://github.com/test/package.git',
          ref: 'v1.0.0',
        });
      }
    });

    it('should create installation with local source', () => {
      const localSourceResult = PackageSource.createFromLocal({
        path: '/local/package/path',
      });
      expect(localSourceResult.isOk()).toBe(true);

      if (localSourceResult.isOk()) {
        const localSource = localSourceResult.value;

        const result = PackageInstallation.createForInstallation(
          packageId,
          '1.0.0',
          localSource,
          '/packages/test-package'
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const installation = result.value;
          const info = installation.getInstallationInfo();
          expect(info.installedFrom).toEqual({
            path: '/local/package/path',
          });
        }
      }
    });

    it('should trim package version and installation path', () => {
      const result = PackageInstallation.createForInstallation(
        packageId,
        '  1.0.0  ',
        packageSource,
        '  /packages/test-package  '
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getPackageVersion()).toBe('1.0.0');
        expect(installation.getInstallationPath()).toBe('/packages/test-package');
      }
    });

    it('should fail with empty trimmed package version', () => {
      const result = PackageInstallation.createForInstallation(
        packageId,
        '   ',
        packageSource,
        '/packages/test-package'
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Package version cannot be empty');
      }
    });

    it('should fail with empty trimmed installation path', () => {
      const result = PackageInstallation.createForInstallation(
        packageId,
        '1.0.0',
        packageSource,
        '   '
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Installation path cannot be empty');
      }
    });
  });

  describe('status checking methods', () => {
    const statusTypes: InstallationStatus[] = [
      'installing',
      'installed',
      'failed',
      'updating',
      'uninstalling',
    ];

    statusTypes.forEach(status => {
      it(`should handle ${status} status correctly`, () => {
        const data: PackageInstallationData = {
          packageId,
          packageVersion: '1.0.0',
          status,
          installationInfo,
          installationPath: '/packages/test-package',
          ...(status === 'failed' ? { errorMessage: 'Test error' } : {}),
        };

        const result = PackageInstallation.create(data);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const installation = result.value;
          expect(installation.getStatus()).toBe(status);

          // Check status-specific methods
          expect(installation.isInstalled()).toBe(status === 'installed');
          expect(installation.isFailed()).toBe(status === 'failed');
          expect(installation.isInProgress()).toBe(
            ['installing', 'updating', 'uninstalling'].includes(status)
          );
        }
      });
    });
  });

  describe('enabled state checking', () => {
    it('should check if installation is enabled', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo: {
          ...installationInfo,
          isEnabled: true,
        },
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        expect(installation.isEnabled()).toBe(true);
      }
    });

    it('should check if installation is disabled', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo: {
          ...installationInfo,
          isEnabled: false,
        },
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        expect(installation.isEnabled()).toBe(false);
      }
    });
  });

  describe('configuration overrides', () => {
    it('should get configuration overrides', () => {
      const overrides = {
        timeout: 5000,
        retries: 3,
        enableDebug: true,
      };

      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo: {
          ...installationInfo,
          configurationOverrides: overrides,
        },
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getConfigurationOverrides()).toEqual(overrides);
      }
    });

    it('should return undefined when no configuration overrides', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        expect(installation.getConfigurationOverrides()).toBeUndefined();
      }
    });
  });

  describe('withStatus', () => {
    let installation: PackageInstallation;

    beforeEach(() => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 50,
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installation = result.value;
      }
    });

    it('should update status to installed', () => {
      const result = installation.withStatus('installed');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('installed');
        expect(updatedInstallation.isInstalled()).toBe(true);
        expect(updatedInstallation.getProgress()).toBe(100); // Should set to 100 when installed
      }
    });

    it('should update status to failed with error message', () => {
      const result = installation.withStatus('failed', 'Installation error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('failed');
        expect(updatedInstallation.isFailed()).toBe(true);
        expect(updatedInstallation.getErrorMessage()).toBe('Installation error');
      }
    });

    it('should update status to updating', () => {
      const result = installation.withStatus('updating');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('updating');
        expect(updatedInstallation.isInProgress()).toBe(true);
        expect(updatedInstallation.getProgress()).toBe(50); // Should preserve existing progress
      }
    });

    it('should fail when setting failed status without error message', () => {
      const result = installation.withStatus('failed');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Failed status requires error message');
      }
    });

    it('should preserve other data when updating status', () => {
      const result = installation.withStatus('installed');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getPackageId()).toBe(installation.getPackageId());
        expect(updatedInstallation.getPackageVersion()).toBe(installation.getPackageVersion());
        expect(updatedInstallation.getInstallationInfo()).toBe(installation.getInstallationInfo());
        expect(updatedInstallation.getInstallationPath()).toBe(installation.getInstallationPath());
      }
    });
  });

  describe('withProgress', () => {
    let installation: PackageInstallation;

    beforeEach(() => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 25,
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installation = result.value;
      }
    });

    it('should update progress to valid value', () => {
      const result = installation.withProgress(75);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getProgress()).toBe(75);
      }
    });

    it('should allow progress at boundary values', () => {
      const result0 = installation.withProgress(0);
      const result100 = installation.withProgress(100);

      expect(result0.isOk()).toBe(true);
      expect(result100.isOk()).toBe(true);

      if (result0.isOk() && result100.isOk()) {
        expect(result0.value.getProgress()).toBe(0);
        expect(result100.value.getProgress()).toBe(100);
      }
    });

    it('should fail with progress less than 0', () => {
      const result = installation.withProgress(-1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Progress must be between 0 and 100');
      }
    });

    it('should fail with progress greater than 100', () => {
      const result = installation.withProgress(101);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageInstallationError);
        expect(result.error.message).toBe('Progress must be between 0 and 100');
      }
    });

    it('should preserve other data when updating progress', () => {
      const result = installation.withProgress(75);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getPackageId()).toBe(installation.getPackageId());
        expect(updatedInstallation.getStatus()).toBe(installation.getStatus());
        expect(updatedInstallation.getInstallationInfo()).toBe(installation.getInstallationInfo());
      }
    });
  });

  describe('withEnabledState', () => {
    let installation: PackageInstallation;

    beforeEach(() => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installation = result.value;
      }
    });

    it('should enable installation', () => {
      const result = installation.withEnabledState(true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.isEnabled()).toBe(true);
      }
    });

    it('should disable installation', () => {
      const result = installation.withEnabledState(false);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.isEnabled()).toBe(false);
      }
    });

    it('should preserve other installation info when updating enabled state', () => {
      const result = installation.withEnabledState(false);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        const updatedInfo = updatedInstallation.getInstallationInfo();
        const originalInfo = installation.getInstallationInfo();

        expect(updatedInfo.installedAt).toBe(originalInfo.installedAt);
        expect(updatedInfo.installedFrom).toBe(originalInfo.installedFrom);
        expect(updatedInfo.configurationOverrides).toBe(originalInfo.configurationOverrides);
      }
    });
  });

  describe('withConfigurationOverrides', () => {
    let installation: PackageInstallation;

    beforeEach(() => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installation = result.value;
      }
    });

    it('should set configuration overrides', () => {
      const overrides = {
        timeout: 10000,
        retries: 5,
        enableDebug: false,
        customOption: 'value',
      };

      const result = installation.withConfigurationOverrides(overrides);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getConfigurationOverrides()).toEqual(overrides);
      }
    });

    it('should handle empty configuration overrides', () => {
      const overrides = {};

      const result = installation.withConfigurationOverrides(overrides);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getConfigurationOverrides()).toEqual({});
      }
    });

    it('should preserve other installation info when updating configuration', () => {
      const overrides = { test: 'value' };
      const result = installation.withConfigurationOverrides(overrides);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        const updatedInfo = updatedInstallation.getInstallationInfo();
        const originalInfo = installation.getInstallationInfo();

        expect(updatedInfo.installedAt).toBe(originalInfo.installedAt);
        expect(updatedInfo.installedFrom).toBe(originalInfo.installedFrom);
        expect(updatedInfo.isEnabled).toBe(originalInfo.isEnabled);
      }
    });
  });

  describe('status helper methods', () => {
    let installation: PackageInstallation;

    beforeEach(() => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installing',
        installationInfo,
        installationPath: '/packages/test-package',
        progress: 25,
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installation = result.value;
      }
    });

    it('should mark as installed', () => {
      const result = installation.markAsInstalled();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('installed');
        expect(updatedInstallation.isInstalled()).toBe(true);
      }
    });

    it('should mark as failed', () => {
      const result = installation.markAsFailed('Installation failed');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('failed');
        expect(updatedInstallation.isFailed()).toBe(true);
        expect(updatedInstallation.getErrorMessage()).toBe('Installation failed');
      }
    });

    it('should mark as updating', () => {
      const result = installation.markAsUpdating();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('updating');
        expect(updatedInstallation.isInProgress()).toBe(true);
      }
    });

    it('should mark as uninstalling', () => {
      const result = installation.markAsUninstalling();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedInstallation = result.value;
        expect(updatedInstallation.getStatus()).toBe('uninstalling');
        expect(updatedInstallation.isInProgress()).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should compare installations by package ID, version, and path', () => {
      const data1: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const data2: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'failed', // Different status
        installationInfo: {
          // Different installation info
          ...installationInfo,
          isEnabled: false,
        },
        installationPath: '/packages/test-package',
        errorMessage: 'Some error', // Different error message
        progress: 75, // Different progress
      };

      const result1 = PackageInstallation.create(data1);
      const result2 = PackageInstallation.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const installation1 = result1.value;
        const installation2 = result2.value;

        // Should be equal despite different status, info, error, and progress
        expect(installation1.equals(installation2)).toBe(true);
        expect(installation2.equals(installation1)).toBe(true);
      }
    });

    it('should not be equal with different package IDs', () => {
      const otherIdResult = PackageId.create('other-package');
      expect(otherIdResult.isOk()).toBe(true);

      if (otherIdResult.isOk()) {
        const otherId = otherIdResult.value;

        const data1: PackageInstallationData = {
          packageId,
          packageVersion: '1.0.0',
          status: 'installed',
          installationInfo,
          installationPath: '/packages/test-package',
        };

        const data2: PackageInstallationData = {
          packageId: otherId,
          packageVersion: '1.0.0',
          status: 'installed',
          installationInfo,
          installationPath: '/packages/test-package',
        };

        const result1 = PackageInstallation.create(data1);
        const result2 = PackageInstallation.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const installation1 = result1.value;
          const installation2 = result2.value;

          expect(installation1.equals(installation2)).toBe(false);
        }
      }
    });

    it('should not be equal with different package versions', () => {
      const data1: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const data2: PackageInstallationData = {
        packageId,
        packageVersion: '2.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result1 = PackageInstallation.create(data1);
      const result2 = PackageInstallation.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const installation1 = result1.value;
        const installation2 = result2.value;

        expect(installation1.equals(installation2)).toBe(false);
      }
    });

    it('should not be equal with different installation paths', () => {
      const data1: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const data2: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/different/path',
      };

      const result1 = PackageInstallation.create(data1);
      const result2 = PackageInstallation.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const installation1 = result1.value;
        const installation2 = result2.value;

        expect(installation1.equals(installation2)).toBe(false);
      }
    });

    it('should be equal to itself', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        expect(installation.equals(installation)).toBe(true);
      }
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON format', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'failed',
        installationInfo: {
          ...installationInfo,
          configurationOverrides: { timeout: 5000 },
        },
        installationPath: '/packages/test-package',
        errorMessage: 'Test error',
        progress: 75,
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        const json = installation.toJSON();

        expect(json).toEqual({
          packageId: 'test-package',
          packageVersion: '1.0.0',
          status: 'failed',
          installationInfo: {
            ...installationInfo,
            configurationOverrides: { timeout: 5000 },
          },
          installationPath: '/packages/test-package',
          errorMessage: 'Test error',
          progress: 75,
        });
      }
    });

    it('should handle minimal installation data in JSON', () => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '1.0.0',
        status: 'installed',
        installationInfo,
        installationPath: '/packages/test-package',
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const installation = result.value;
        const json = installation.toJSON();

        expect(json).toEqual({
          packageId: 'test-package',
          packageVersion: '1.0.0',
          status: 'installed',
          installationInfo,
          installationPath: '/packages/test-package',
          errorMessage: undefined,
          progress: undefined,
        });
      }
    });
  });

  describe('getter methods', () => {
    let installation: PackageInstallation;

    beforeEach(() => {
      const data: PackageInstallationData = {
        packageId,
        packageVersion: '2.1.0',
        status: 'updating',
        installationInfo: {
          ...installationInfo,
          isEnabled: false,
          configurationOverrides: { debug: true },
        },
        installationPath: '/custom/path',
        progress: 80,
      };

      const result = PackageInstallation.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installation = result.value;
      }
    });

    it('should return all properties correctly', () => {
      expect(installation.getPackageId()).toBe(packageId);
      expect(installation.getPackageVersion()).toBe('2.1.0');
      expect(installation.getStatus()).toBe('updating');
      expect(installation.getInstallationPath()).toBe('/custom/path');
      expect(installation.getProgress()).toBe(80);
      expect(installation.getErrorMessage()).toBeUndefined();

      const info = installation.getInstallationInfo();
      expect(info.isEnabled).toBe(false);
      expect(info.configurationOverrides).toEqual({ debug: true });
      expect(info.installedAt).toBe(installationInfo.installedAt);
      expect(info.installedFrom).toBe(installationInfo.installedFrom);

      expect(installation.getInstalledAt()).toBe(installationInfo.installedAt);
      expect(installation.getConfigurationOverrides()).toEqual({ debug: true });
    });
  });
});
