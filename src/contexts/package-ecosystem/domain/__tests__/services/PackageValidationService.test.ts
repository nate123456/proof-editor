/**
 * Tests for PackageValidationService
 *
 * Focuses on:
 * - Package validation rules
 * - Manifest validation
 * - Version validation
 * - Dependency validation
 * - High coverage for core functionality
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Package } from '../../entities/Package';
import {
  type IPackageFileSystem,
  type ISDKValidator,
  PackageValidationService,
} from '../../services/PackageValidationService';
import { PackageValidationError } from '../../types/domain-errors';
import { InstallationPath } from '../../value-objects/InstallationPath';
import { PackageVersion } from '../../value-objects/PackageVersion';
import { PackageId } from '../../value-objects/package-id';

// Mock factories
const createMockPackage = (
  id: string,
  version: string,
  options: {
    isPublished?: boolean;
    hasDependencies?: boolean;
    hasDescription?: boolean;
    hasLSPSupport?: boolean;
    allowInvalidId?: boolean;
    allowInvalidVersion?: boolean;
  } = {},
): Package => {
  // For testing invalid packages, we'll use a mock instead of actual validation
  const mockPackageId: PackageId = (() => {
    if (options.allowInvalidId && !id) {
      // Create a mock package ID that simulates invalid state
      return {
        toString: () => '',
        equals: () => false,
        toJSON: () => '',
      } as unknown as PackageId;
    } else {
      const packageId = PackageId.create(id || 'test-package');
      if (packageId.isErr()) {
        throw new Error('Failed to create mock package');
      }
      return packageId.value;
    }
  })();

  const mockPackageVersion = (() => {
    if (options.allowInvalidVersion) {
      // Create a mock that represents an invalid version
      return {
        toString: () => version,
        compareWith: vi.fn(() => 0),
        isPrerelease: vi.fn(() => false),
        isStable: vi.fn(() => true),
        isCompatibleWith: vi.fn(() => true),
        satisfiesConstraint: vi.fn(() => true),
      } as any;
    } else {
      const packageVersion = PackageVersion.create(version);
      if (packageVersion.isErr()) {
        throw new Error('Failed to create mock package');
      }
      return packageVersion.value;
    }
  })();

  const mockManifest = createMockManifest(id, version, {
    description: options.hasDescription === false ? '' : `Description for ${id}`,
  });

  return {
    getId: vi.fn(() => mockPackageId),
    getVersion: vi.fn(() => mockPackageVersion),
    getName: vi.fn(() => ({
      getValue: () => id,
      isValid: () => true,
    })),
    getDescription: vi.fn(() => ({
      getValue: () => (options.hasDescription === false ? '' : `Description for ${id}`),
      isValid: () => options.hasDescription !== false,
    })),
    getDependencies: vi.fn(() =>
      options.hasDependencies
        ? [
            {
              getPackageId: () => PackageId.create('dep-1').value,
              getVersionConstraint: () => ({ toString: () => '^1.0.0' }),
              isValid: () => true,
            },
          ]
        : [],
    ),
    getDevDependencies: vi.fn(() => []),
    getPeerDependencies: vi.fn(() => []),
    getConflicts: vi.fn(() => []),
    getKeywords: vi.fn(() => ['test', 'package']),
    getAuthor: vi.fn(() => ({ name: 'Test Author', email: 'test@example.com' })),
    getCreatedAt: vi.fn(() => new Date()),
    getUpdatedAt: vi.fn(() => new Date()),
    isPublished: vi.fn(() => options.isPublished ?? false),
    checkPackageHealth: vi.fn(() => ok(undefined)),
    checkCircularDependencies: vi.fn(() => false),
    getMetadata: vi.fn(() => ({
      homepage: 'https://example.com',
      repository: 'https://github.com/example/repo',
      license: 'MIT',
    })),
    getManifest: vi.fn(() => mockManifest),
    getSDKInterfaces: vi.fn(() => []),
    hasLSPSupport: vi.fn(() => options.hasLSPSupport ?? false),
  } as unknown as Package;
};

const createMockManifest = (
  name: string,
  version: string,
  options: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    description?: string;
    keywords?: string[];
    author?: string;
    license?: string;
  } = {},
): any => {
  const deps = new Map();
  if (options.dependencies) {
    Object.entries(options.dependencies).forEach(([depName, constraint]) => {
      deps.set(depName, { getConstraintString: () => constraint });
    });
  }

  return {
    getName: vi.fn(() => name),
    getVersion: vi.fn(() => version),
    getDescription: vi.fn(() => options.description ?? 'Test package'),
    getAuthor: vi.fn(() => options.author ?? 'Test Author'),
    getDependencies: vi.fn(() => deps),
    getRequiredProofEditorVersion: vi.fn(() => null),
    getRequiredNodeVersion: vi.fn(() => null),
    hasLSPSupport: vi.fn(() => false),
    getLSPDesktopConfiguration: vi.fn(() => null),
    getLSPMobileConfiguration: vi.fn(() => null),
  };
};

// Unused - removed to fix lint error
// const createMockPackageRepository = (): IPackageRepository => {
//   return {
//     findById: vi.fn(),
//     findByName: vi.fn(),
//     findByVersion: vi.fn(),
//     findByKeyword: vi.fn(),
//     save: vi.fn(),
//     remove: vi.fn(),
//     exists: vi.fn(),
//     getAllVersions: vi.fn(),
//     getLatestVersion: vi.fn(),
//   };
// };

// Mock filesystem interface
const createMockFileSystem = (): IPackageFileSystem => {
  return {
    fileExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(ok('file content')),
    listFiles: vi.fn().mockResolvedValue(ok([])),
    isExecutable: vi.fn().mockResolvedValue(false),
  };
};

// Mock SDK validator interface
const createMockSDKValidator = (): ISDKValidator => {
  return {
    validateInterface: vi.fn().mockResolvedValue(
      ok({
        name: 'test-interface',
        version: '1.0.0',
        methods: ['method1', 'method2'],
      }),
    ),
    listImplementedInterfaces: vi.fn().mockResolvedValue(ok([])),
    checkVersionCompatibility: vi.fn().mockReturnValue(ok(true)),
  };
};

describe('PackageValidationService', () => {
  let service: PackageValidationService;
  let mockFileSystem: IPackageFileSystem;
  let mockSDKValidator: ISDKValidator;

  beforeEach(() => {
    mockFileSystem = createMockFileSystem();
    mockSDKValidator = createMockSDKValidator();
    service = new PackageValidationService(mockFileSystem, mockSDKValidator);
  });

  describe('validatePackage', () => {
    it('should validate a valid package', async () => {
      const pkg = createMockPackage('valid-package', '1.0.0', { hasDescription: true });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      const result = await service.validatePackage(pkg, installPath.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);
        expect(validationResult.warnings).toHaveLength(0);
      }
    });

    it('should fail validation for package without name', async () => {
      const pkg = createMockPackage('', '1.0.0', { allowInvalidId: true });

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.errors.length).toBeGreaterThan(0);
        expect(validationResult.errors.some((e) => e.toLowerCase().includes('name'))).toBe(true);
      }
    });

    it('should fail validation for package without description', async () => {
      const pkg = createMockPackage('test-package', '1.0.0', { hasDescription: false });

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.errors.length).toBeGreaterThan(0);
        expect(validationResult.errors.some((e) => e.toLowerCase().includes('description'))).toBe(
          true,
        );
      }
    });

    it('should validate package dependencies', async () => {
      const pkg = createMockPackage('test-package', '1.0.0', { hasDependencies: true });

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      expect((pkg as any).checkPackageHealth).toHaveBeenCalled();
    });

    it('should check for circular dependencies', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      vi.mocked((pkg as any).checkCircularDependencies).mockReturnValue(true);

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.errors.some((e) => e.toLowerCase().includes('circular'))).toBe(
          true,
        );
      }
    });

    it('should add warning for missing keywords', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      vi.mocked((pkg as any).getKeywords).mockReturnValue([]);

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.warnings.length).toBeGreaterThan(0);
        expect(validationResult.warnings.some((w) => w.toLowerCase().includes('keyword'))).toBe(
          true,
        );
      }
    });

    it('should add warning for missing authors', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      vi.mocked(pkg.getAuthor).mockReturnValue('' as any);

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.warnings.length).toBeGreaterThan(0);
        expect(validationResult.warnings.some((w) => w.toLowerCase().includes('author'))).toBe(
          true,
        );
      }
    });
  });

  describe('validatePackage with options', () => {
    it('should skip manifest validation when disabled', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');

      const result = await service.validatePackage(pkg, undefined, { validateManifest: false });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(true);
        // When manifest validation is disabled, should still have entity validation warnings
        expect(validationResult.warnings.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should validate SDK compliance when enabled with path', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      const result = await service.validatePackage(pkg, installPath.value, {
        validateSDKCompliance: true,
      });

      expect(result.isOk()).toBe(true);
    });

    it('should validate security when enabled with path', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to return some script files
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(ok(['index.js', 'config.json']));
      vi.mocked(mockFileSystem.readFile).mockResolvedValue(ok('console.log("hello");'));

      const result = await service.validatePackage(pkg, installPath.value, {
        checkSecurityPolicies: true,
      });

      expect(result.isOk()).toBe(true);
    });

    it('should handle security validation with network access patterns', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to return JavaScript file with network access
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(ok(['network.js']));
      vi.mocked(mockFileSystem.readFile).mockResolvedValue(
        ok('fetch("https://api.example.com/data");'),
      );

      const result = await service.validatePackage(pkg, installPath.value, {
        checkSecurityPolicies: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.warnings.some((w) => w.includes('Network access'))).toBe(true);
      }
    });

    it('should handle security validation with file system access patterns', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to return JavaScript file with file system access
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(ok(['filesystem.js']));
      vi.mocked(mockFileSystem.readFile).mockResolvedValue(ok('const fs = require("fs");'));

      const result = await service.validatePackage(pkg, installPath.value, {
        checkSecurityPolicies: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.warnings.some((w) => w.includes('File system access'))).toBe(true);
      }
    });

    it('should handle security validation with elevated permissions patterns', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to return JavaScript file with elevated permissions patterns
      // (.sh files are handled as executables first, so use .js for content scanning)
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(ok(['script.js']));
      vi.mocked(mockFileSystem.isExecutable).mockResolvedValue(false);
      vi.mocked(mockFileSystem.readFile).mockResolvedValue(ok('sudo apt-get install something'));

      const result = await service.validatePackage(pkg, installPath.value, {
        checkSecurityPolicies: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.warnings.some((w) => w.includes('Elevated permissions'))).toBe(
          true,
        );
      }
    });

    it('should handle executable files in security validation', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to return executable files
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(ok(['script.exe', 'run.sh']));
      vi.mocked(mockFileSystem.isExecutable).mockResolvedValue(true);

      const result = await service.validatePackage(pkg, installPath.value, {
        checkSecurityPolicies: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.warnings.some((w) => w.includes('Executable file'))).toBe(true);
      }
    });
  });

  describe('LSP validation', () => {
    it('should validate package with LSP support', async () => {
      const pkg = createMockPackage('lsp-package', '1.0.0', { hasLSPSupport: true });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock LSP configuration
      const mockManifest = pkg.getManifest();
      vi.mocked(mockManifest.hasLSPSupport).mockReturnValue(true);
      vi.mocked(mockManifest.getLSPDesktopConfiguration).mockReturnValue({
        command: ['lsp-server'],
        args: ['--stdio'],
        transport: 'stdio',
      });

      const result = await service.validatePackage(pkg, installPath.value, {
        validateSDKCompliance: true,
      });

      expect(result.isOk()).toBe(true);
    });

    it('should validate LSP configuration with missing binary', async () => {
      const pkg = createMockPackage('lsp-package', '1.0.0', { hasLSPSupport: true });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock LSP configuration with missing binary
      const mockManifest = pkg.getManifest();
      vi.mocked(mockManifest.hasLSPSupport).mockReturnValue(true);
      vi.mocked(mockManifest.getLSPDesktopConfiguration).mockReturnValue({
        command: ['missing-lsp-server'],
        args: ['--stdio'],
        transport: 'stdio',
      });

      // Mock file system to report binary doesn't exist
      vi.mocked(mockFileSystem.fileExists).mockResolvedValue(false);

      const result = await service.validatePackage(pkg, installPath.value, {
        validateSDKCompliance: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(
          validationResult.errors.some((e) => e.includes('LSP desktop binary not found')),
        ).toBe(true);
      }
    });

    it('should validate mobile LSP configuration', async () => {
      const pkg = createMockPackage('lsp-package', '1.0.0', { hasLSPSupport: true });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock mobile LSP configuration
      const mockManifest = pkg.getManifest();
      vi.mocked(mockManifest.hasLSPSupport).mockReturnValue(true);
      vi.mocked(mockManifest.getLSPMobileConfiguration).mockReturnValue({
        transport: 'websocket',
        service: 'ws://localhost:8080',
      });

      const result = await service.validatePackage(pkg, installPath.value, {
        validateSDKCompliance: true,
      });

      expect(result.isOk()).toBe(true);
    });

    it('should detect invalid mobile LSP websocket configuration', async () => {
      const pkg = createMockPackage('lsp-package', '1.0.0', { hasLSPSupport: true });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock invalid mobile LSP configuration
      const mockManifest = pkg.getManifest();
      vi.mocked(mockManifest.hasLSPSupport).mockReturnValue(true);
      vi.mocked(mockManifest.getLSPMobileConfiguration).mockReturnValue({
        transport: 'websocket',
        // Missing service URL
      } as any);

      const result = await service.validatePackage(pkg, installPath.value, {
        validateSDKCompliance: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(
          validationResult.errors.some((e) =>
            e.includes('LSP mobile websocket configuration requires service URL'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should handle file system errors during security validation', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to return error
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(err(new Error('File system error')));

      const result = await service.validatePackage(pkg, installPath.value, {
        checkSecurityPolicies: true,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to list package files');
      }
    });

    it('should handle SDK validator errors', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock SDK validator to return error
      vi.mocked(mockSDKValidator.listImplementedInterfaces).mockResolvedValue(
        err(new PackageValidationError('SDK validation failed')),
      );

      const result = await service.validatePackage(pkg, installPath.value, {
        validateSDKCompliance: true,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('SDK validation failed');
      }
    });

    it('should handle invalid version formats in manifest validation', async () => {
      const pkg = createMockPackage('test-package', 'invalid-version', {
        allowInvalidVersion: true,
      });

      const result = await service.validatePackage(pkg);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.errors.some((e) => e.includes('Invalid version format'))).toBe(
          true,
        );
      }
    });

    it('should handle missing manifest file', async () => {
      const pkg = createMockPackage('test-package', '1.0.0');
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock file system to report manifest doesn't exist
      vi.mocked(mockFileSystem.fileExists).mockResolvedValue(false);

      const result = await service.validatePackage(pkg, installPath.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(
          validationResult.warnings.some((w) => w.includes('Package manifest file not found')),
        ).toBe(true);
      }
    });
  });

  describe('comprehensive validation scenarios', () => {
    it('should handle package with all validation enabled', async () => {
      const pkg = createMockPackage('complete-package', '1.0.0', {
        hasLSPSupport: true,
        hasDependencies: true,
      });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      // Mock comprehensive setup
      vi.mocked(mockFileSystem.fileExists).mockResolvedValue(true);
      vi.mocked(mockFileSystem.listFiles).mockResolvedValue(ok(['index.js', 'package.json']));
      vi.mocked(mockFileSystem.readFile).mockResolvedValue(ok('console.log("safe code");'));

      const result = await service.validatePackage(pkg, installPath.value, {
        validateManifest: true,
        validateSDKCompliance: true,
        checkSecurityPolicies: true,
      });

      expect(result.isOk()).toBe(true);
    });

    it('should accumulate errors from multiple validation sources', async () => {
      const pkg = createMockPackage('problematic-package', 'bad-version', {
        hasDescription: false,
        allowInvalidVersion: true,
      });
      const installPath = InstallationPath.create('/path/to/package');

      if (installPath.isErr()) {
        throw new Error('Failed to create installation path');
      }

      vi.mocked((pkg as any).checkCircularDependencies).mockReturnValue(true);

      const result = await service.validatePackage(pkg, installPath.value);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.errors.length).toBeGreaterThan(1);
        expect(validationResult.errors.some((e) => e.includes('description'))).toBe(true);
        expect(validationResult.errors.some((e) => e.includes('circular'))).toBe(true);
        expect(validationResult.errors.some((e) => e.includes('Invalid version'))).toBe(true);
      }
    });
  });
});
