/**
 * Tests for InstallationPath value object
 *
 * Focuses on:
 * - Creation methods for different installation types
 * - Path validation and normalization
 * - Installation type detection
 * - Path manipulation methods
 * - Error conditions and edge cases
 * - Equality comparison and serialization
 * - High coverage for all public methods
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { PackageValidationError } from '../../types/domain-errors';
import { InstallationPath } from '../../value-objects/InstallationPath';
import { PackageVersion } from '../../value-objects/PackageVersion';
import { PackageId } from '../../value-objects/package-id';

describe('InstallationPath', () => {
  let packageId: PackageId;
  let packageVersion: PackageVersion;

  beforeEach(() => {
    const idResult = PackageId.create('test-package');
    expect(idResult.isOk()).toBe(true);
    if (idResult.isOk()) {
      packageId = idResult.value;
    }

    const versionResult = PackageVersion.create('1.0.0');
    expect(versionResult.isOk()).toBe(true);
    if (versionResult.isOk()) {
      packageVersion = versionResult.value;
    }
  });

  describe('createForUserInstall', () => {
    it('should create user installation path with valid inputs', () => {
      const result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/home/user/.proof-editor/packages/test-package/1.0.0');
        expect(path.getPackageId()).toBe(packageId);
        expect(path.getVersion()).toBe(packageVersion);
        expect(path.getInstallationType()).toBe('user');
        expect(path.isUserInstall()).toBe(true);
        expect(path.isGlobalInstall()).toBe(false);
        expect(path.isLocalInstall()).toBe(false);
      }
    });

    it('should normalize Windows paths to Unix format', () => {
      const result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        'C:\\Users\\User\\AppData\\.proof-editor',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe(
          'C:/Users/User/AppData/.proof-editor/packages/test-package/1.0.0',
        );
      }
    });

    it('should trim whitespace from base path', () => {
      const result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '  /home/user/.proof-editor  ',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/home/user/.proof-editor/packages/test-package/1.0.0');
      }
    });

    it('should fail with empty base path', () => {
      const result = InstallationPath.createForUserInstall(packageId, packageVersion, '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Base user path cannot be empty');
      }
    });

    it('should fail with whitespace-only base path', () => {
      const result = InstallationPath.createForUserInstall(packageId, packageVersion, '   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Base user path cannot be empty');
      }
    });

    it('should fail with null base path', () => {
      const result = InstallationPath.createForUserInstall(packageId, packageVersion, null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Base user path cannot be empty');
      }
    });
  });

  describe('createForGlobalInstall', () => {
    it('should create global installation path with valid inputs', () => {
      const result = InstallationPath.createForGlobalInstall(
        packageId,
        packageVersion,
        '/usr/local/proof-editor',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/usr/local/proof-editor/packages/test-package/1.0.0');
        expect(path.getPackageId()).toBe(packageId);
        expect(path.getVersion()).toBe(packageVersion);
        expect(path.getInstallationType()).toBe('global');
        expect(path.isUserInstall()).toBe(false);
        expect(path.isGlobalInstall()).toBe(true);
        expect(path.isLocalInstall()).toBe(false);
      }
    });

    it('should normalize Windows paths for global install', () => {
      const result = InstallationPath.createForGlobalInstall(
        packageId,
        packageVersion,
        'C:\\Program Files\\ProofEditor',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe(
          'C:/Program Files/ProofEditor/packages/test-package/1.0.0',
        );
      }
    });

    it('should trim whitespace from global base path', () => {
      const result = InstallationPath.createForGlobalInstall(
        packageId,
        packageVersion,
        '  /usr/local/proof-editor  ',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/usr/local/proof-editor/packages/test-package/1.0.0');
      }
    });

    it('should fail with empty global base path', () => {
      const result = InstallationPath.createForGlobalInstall(packageId, packageVersion, '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Base global path cannot be empty');
      }
    });

    it('should fail with whitespace-only global base path', () => {
      const result = InstallationPath.createForGlobalInstall(packageId, packageVersion, '   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Base global path cannot be empty');
      }
    });
  });

  describe('createForLocalInstall', () => {
    it('should create local installation path with valid inputs', () => {
      const result = InstallationPath.createForLocalInstall(
        packageId,
        packageVersion,
        '/home/user/project',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe(
          '/home/user/project/.proof-editor/packages/test-package/1.0.0',
        );
        expect(path.getPackageId()).toBe(packageId);
        expect(path.getVersion()).toBe(packageVersion);
        expect(path.getInstallationType()).toBe('local');
        expect(path.isUserInstall()).toBe(false);
        expect(path.isGlobalInstall()).toBe(false);
        expect(path.isLocalInstall()).toBe(true);
      }
    });

    it('should normalize Windows paths for local install', () => {
      const result = InstallationPath.createForLocalInstall(
        packageId,
        packageVersion,
        'C:\\Users\\User\\MyProject',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe(
          'C:/Users/User/MyProject/.proof-editor/packages/test-package/1.0.0',
        );
      }
    });

    it('should trim whitespace from project path', () => {
      const result = InstallationPath.createForLocalInstall(
        packageId,
        packageVersion,
        '  /home/user/project  ',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe(
          '/home/user/project/.proof-editor/packages/test-package/1.0.0',
        );
      }
    });

    it('should fail with empty project path', () => {
      const result = InstallationPath.createForLocalInstall(packageId, packageVersion, '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Project path cannot be empty');
      }
    });

    it('should fail with whitespace-only project path', () => {
      const result = InstallationPath.createForLocalInstall(packageId, packageVersion, '   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Project path cannot be empty');
      }
    });
  });

  describe('create', () => {
    it('should create from absolute Unix path', () => {
      const result = InstallationPath.create('/home/user/.proof-editor/packages/test/1.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/home/user/.proof-editor/packages/test/1.0.0');
        expect(path.getPackageId()).toBeNull();
        expect(path.getVersion()).toBeNull();
        expect(path.getInstallationType()).toBe('user'); // Default detection
      }
    });

    it('should create from absolute Windows path', () => {
      const result = InstallationPath.create('C:\\Users\\User\\AppData\\.proof-editor\\packages');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('C:/Users/User/AppData/.proof-editor/packages');
      }
    });

    it('should detect local installation type', () => {
      const result = InstallationPath.create('/project/.proof-editor/packages/test');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getInstallationType()).toBe('local');
        expect(path.isLocalInstall()).toBe(true);
      }
    });

    it('should detect global installation type', () => {
      const result = InstallationPath.create('/usr/local/proof-editor/packages/test');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getInstallationType()).toBe('global');
        expect(path.isGlobalInstall()).toBe(true);
      }
    });

    it('should detect global installation type from /opt path', () => {
      const result = InstallationPath.create('/opt/proof-editor/packages/test');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getInstallationType()).toBe('global');
        expect(path.isGlobalInstall()).toBe(true);
      }
    });

    it('should trim whitespace from absolute path', () => {
      const result = InstallationPath.create('  /home/user/packages  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/home/user/packages');
      }
    });

    it('should fail with empty path', () => {
      const result = InstallationPath.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Absolute path cannot be empty');
      }
    });

    it('should fail with whitespace-only path', () => {
      const result = InstallationPath.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Absolute path cannot be empty');
      }
    });

    it('should fail with relative path', () => {
      const result = InstallationPath.create('relative/path');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Path must be absolute');
      }
    });

    it('should fail with relative path starting with dot', () => {
      const result = InstallationPath.create('./relative/path');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Path must be absolute');
      }
    });
  });

  describe('fromAbsolutePath', () => {
    it('should create with absolute path and package info', () => {
      const result = InstallationPath.fromAbsolutePath(
        '/custom/install/location',
        packageId,
        packageVersion,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('/custom/install/location');
        expect(path.getPackageId()).toBe(packageId);
        expect(path.getVersion()).toBe(packageVersion);
        expect(path.getInstallationType()).toBe('user'); // Default for non-matching paths
      }
    });

    it('should detect correct installation type with package info', () => {
      const result = InstallationPath.fromAbsolutePath(
        '/usr/global/packages/test',
        packageId,
        packageVersion,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getInstallationType()).toBe('global');
        expect(path.getPackageId()).toBe(packageId);
        expect(path.getVersion()).toBe(packageVersion);
      }
    });

    it('should normalize Windows path with package info', () => {
      const result = InstallationPath.fromAbsolutePath(
        'C:\\Custom\\Install\\Location',
        packageId,
        packageVersion,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const path = result.value;
        expect(path.getAbsolutePath()).toBe('C:/Custom/Install/Location');
      }
    });

    it('should fail with empty absolute path', () => {
      const result = InstallationPath.fromAbsolutePath('', packageId, packageVersion);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Absolute path cannot be empty');
      }
    });

    it('should fail with relative path', () => {
      const result = InstallationPath.fromAbsolutePath('relative/path', packageId, packageVersion);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Path must be absolute');
      }
    });
  });

  describe('path utility methods', () => {
    let installationPath: InstallationPath;

    beforeEach(() => {
      const result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installationPath = result.value;
      }
    });

    it('should return correct package directory', () => {
      expect(installationPath.getPackageDirectory()).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0',
      );
    });

    it('should return correct binary path', () => {
      expect(installationPath.getBinaryPath('my-binary')).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0/bin/my-binary',
      );
    });

    it('should return correct manifest path', () => {
      expect(installationPath.getManifestPath()).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0/package.json',
      );
    });

    it('should return correct source path', () => {
      expect(installationPath.getSourcePath()).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0/src',
      );
    });

    it('should return correct config path', () => {
      expect(installationPath.getConfigPath()).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0/config',
      );
    });

    it('should return correct log path', () => {
      expect(installationPath.getLogPath()).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0/logs',
      );
    });

    it('should return correct cache path', () => {
      expect(installationPath.getCachePath()).toBe(
        '/home/user/.proof-editor/packages/test-package/1.0.0/cache',
      );
    });
  });

  describe('withSubdirectory', () => {
    let installationPath: InstallationPath;

    beforeEach(() => {
      const result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        installationPath = result.value;
      }
    });

    it('should create valid subdirectory path', () => {
      const result = installationPath.withSubdirectory('custom/subdir');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(
          '/home/user/.proof-editor/packages/test-package/1.0.0/custom/subdir',
        );
      }
    });

    it('should normalize Windows subdirectory separators', () => {
      const result = installationPath.withSubdirectory('custom\\subdir');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(
          '/home/user/.proof-editor/packages/test-package/1.0.0/custom/subdir',
        );
      }
    });

    it('should trim whitespace from subdirectory', () => {
      const result = installationPath.withSubdirectory('  custom/subdir  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(
          '/home/user/.proof-editor/packages/test-package/1.0.0/custom/subdir',
        );
      }
    });

    it('should fail with empty subdirectory', () => {
      const result = installationPath.withSubdirectory('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Subdirectory cannot be empty');
      }
    });

    it('should fail with whitespace-only subdirectory', () => {
      const result = installationPath.withSubdirectory('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Subdirectory cannot be empty');
      }
    });

    it('should fail with absolute subdirectory path', () => {
      const result = installationPath.withSubdirectory('/absolute/path');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Subdirectory must be relative and cannot escape package directory',
        );
      }
    });

    it('should fail with parent directory traversal', () => {
      const result = installationPath.withSubdirectory('../escape');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Subdirectory must be relative and cannot escape package directory',
        );
      }
    });

    it('should fail with complex parent directory traversal', () => {
      const result = installationPath.withSubdirectory('safe/../../../escape');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Subdirectory must be relative and cannot escape package directory',
        );
      }
    });
  });

  describe('equals', () => {
    it('should be equal with same path, package ID, version, and type', () => {
      const path1Result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );
      const path2Result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );

      expect(path1Result.isOk()).toBe(true);
      expect(path2Result.isOk()).toBe(true);

      if (path1Result.isOk() && path2Result.isOk()) {
        expect(path1Result.value.equals(path2Result.value)).toBe(true);
      }
    });

    it('should be equal with both package IDs null', () => {
      const path1Result = InstallationPath.create('/home/user/packages');
      const path2Result = InstallationPath.create('/home/user/packages');

      expect(path1Result.isOk()).toBe(true);
      expect(path2Result.isOk()).toBe(true);

      if (path1Result.isOk() && path2Result.isOk()) {
        expect(path1Result.value.equals(path2Result.value)).toBe(true);
      }
    });

    it('should be equal with both versions null', () => {
      const path1Result = InstallationPath.create('/home/user/packages');
      const path2Result = InstallationPath.create('/home/user/packages');

      expect(path1Result.isOk()).toBe(true);
      expect(path2Result.isOk()).toBe(true);

      if (path1Result.isOk() && path2Result.isOk()) {
        expect(path1Result.value.equals(path2Result.value)).toBe(true);
      }
    });

    it('should not be equal with different absolute paths', () => {
      const path1Result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );
      const path2Result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/different/.proof-editor',
      );

      expect(path1Result.isOk()).toBe(true);
      expect(path2Result.isOk()).toBe(true);

      if (path1Result.isOk() && path2Result.isOk()) {
        expect(path1Result.value.equals(path2Result.value)).toBe(false);
      }
    });

    it('should not be equal with different package IDs', () => {
      const otherIdResult = PackageId.create('other-package');
      expect(otherIdResult.isOk()).toBe(true);

      if (otherIdResult.isOk()) {
        const path1Result = InstallationPath.createForUserInstall(
          packageId,
          packageVersion,
          '/home/user/.proof-editor',
        );
        const path2Result = InstallationPath.createForUserInstall(
          otherIdResult.value,
          packageVersion,
          '/home/user/.proof-editor',
        );

        expect(path1Result.isOk()).toBe(true);
        expect(path2Result.isOk()).toBe(true);

        if (path1Result.isOk() && path2Result.isOk()) {
          expect(path1Result.value.equals(path2Result.value)).toBe(false);
        }
      }
    });

    it('should not be equal with different versions', () => {
      const otherVersionResult = PackageVersion.create('2.0.0');
      expect(otherVersionResult.isOk()).toBe(true);

      if (otherVersionResult.isOk()) {
        const path1Result = InstallationPath.createForUserInstall(
          packageId,
          packageVersion,
          '/home/user/.proof-editor',
        );
        const path2Result = InstallationPath.createForUserInstall(
          packageId,
          otherVersionResult.value,
          '/home/user/.proof-editor',
        );

        expect(path1Result.isOk()).toBe(true);
        expect(path2Result.isOk()).toBe(true);

        if (path1Result.isOk() && path2Result.isOk()) {
          expect(path1Result.value.equals(path2Result.value)).toBe(false);
        }
      }
    });

    it('should not be equal with different installation types', () => {
      const path1Result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );
      const path2Result = InstallationPath.createForLocalInstall(
        packageId,
        packageVersion,
        '/home/user/project',
      );

      expect(path1Result.isOk()).toBe(true);
      expect(path2Result.isOk()).toBe(true);

      if (path1Result.isOk() && path2Result.isOk()) {
        expect(path1Result.value.equals(path2Result.value)).toBe(false);
      }
    });

    it('should not be equal when one has null package ID and other does not', () => {
      const path1Result = InstallationPath.create('/home/user/packages');
      const path2Result = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );

      expect(path1Result.isOk()).toBe(true);
      expect(path2Result.isOk()).toBe(true);

      if (path1Result.isOk() && path2Result.isOk()) {
        expect(path1Result.value.equals(path2Result.value)).toBe(false);
      }
    });

    it('should be equal to itself', () => {
      const pathResult = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );

      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        const path = pathResult.value;
        expect(path.equals(path)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return absolute path string', () => {
      const pathResult = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );

      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        const path = pathResult.value;
        expect(path.toString()).toBe('/home/user/.proof-editor/packages/test-package/1.0.0');
      }
    });
  });

  describe('toJSON', () => {
    it('should serialize with package info', () => {
      const pathResult = InstallationPath.createForUserInstall(
        packageId,
        packageVersion,
        '/home/user/.proof-editor',
      );

      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        const path = pathResult.value;
        const json = path.toJSON();

        expect(json).toEqual({
          absolutePath: '/home/user/.proof-editor/packages/test-package/1.0.0',
          packageId: 'test-package',
          version: '1.0.0',
          installationType: 'user',
        });
      }
    });

    it('should serialize with null package info', () => {
      const pathResult = InstallationPath.create('/home/user/packages');

      expect(pathResult.isOk()).toBe(true);
      if (pathResult.isOk()) {
        const path = pathResult.value;
        const json = path.toJSON();

        expect(json).toEqual({
          absolutePath: '/home/user/packages',
          packageId: null,
          version: null,
          installationType: 'user',
        });
      }
    });
  });
});
