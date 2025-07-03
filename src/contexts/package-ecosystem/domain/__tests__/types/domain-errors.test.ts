/**
 * Comprehensive test suite for package ecosystem domain errors
 *
 * Tests all error classes, inheritance, message formatting, error codes,
 * and package-specific error scenarios with property-based testing.
 */

import { faker } from '@faker-js/faker';
import fc from 'fast-check';
import { err, ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import {
  DependencyResolutionError,
  DomainError,
  InvalidPackageVersionError,
  PackageConflictError,
  PackageInstallationError,
  PackageNotFoundError,
  PackageSourceUnavailableError,
  PackageValidationError,
  SDKComplianceError,
} from '../../types/domain-errors.js';

describe('DomainError (Abstract Base Class)', () => {
  // Create concrete implementation for testing abstract base
  class TestDomainError extends DomainError {
    readonly code = 'TEST_ERROR';
  }

  describe('constructor', () => {
    it('should set message from constructor parameter', () => {
      const message = 'Test error message';
      const error = new TestDomainError(message);

      expect(error.message).toBe(message);
    });

    it('should set name to constructor name', () => {
      const error = new TestDomainError('Test message');

      expect(error.name).toBe('TestDomainError');
    });

    it('should set context when provided', () => {
      const context = { packageName: 'test-package', version: '1.0.0' };
      const error = new TestDomainError('Test message', context);

      expect(error.context).toEqual(context);
    });

    it('should have undefined context when not provided', () => {
      const error = new TestDomainError('Test message');

      expect(error.context).toBeUndefined();
    });

    it('should be instance of Error', () => {
      const error = new TestDomainError('Test message');

      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of DomainError', () => {
      const error = new TestDomainError('Test message');

      expect(error).toBeInstanceOf(DomainError);
    });
  });

  describe('inheritance behavior', () => {
    it('should properly set prototype chain', () => {
      const error = new TestDomainError('Test message');

      expect(Object.getPrototypeOf(error)).toBe(TestDomainError.prototype);
      expect(Object.getPrototypeOf(TestDomainError.prototype)).toBe(DomainError.prototype);
      expect(Object.getPrototypeOf(DomainError.prototype)).toBe(Error.prototype);
    });

    it('should work with instanceof checks', () => {
      const error = new TestDomainError('Test message');

      expect(error instanceof TestDomainError).toBe(true);
      expect(error instanceof DomainError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('property-based tests', () => {
    it('should handle any valid string message', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new TestDomainError(message);

          expect(error.message).toBe(message);
          expect(error.name).toBe('TestDomainError');
          expect(error.code).toBe('TEST_ERROR');
        }),
      );
    });

    it('should handle any valid context object', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({
            packageName: fc.string(),
            version: fc.string(),
            path: fc.string(),
            metadata: fc.object(),
          }),
          (message, context) => {
            const error = new TestDomainError(message, context);

            expect(error.message).toBe(message);
            expect(error.context).toEqual(context);
          },
        ),
      );
    });
  });
});

describe('PackageValidationError', () => {
  it('should have correct error code', () => {
    const error = new PackageValidationError('Validation failed');

    expect(error.code).toBe('PACKAGE_VALIDATION_ERROR');
  });

  it('should extend DomainError', () => {
    const error = new PackageValidationError('Validation failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(PackageValidationError);
  });

  it('should have correct name', () => {
    const error = new PackageValidationError('Validation failed');

    expect(error.name).toBe('PackageValidationError');
  });

  describe('package validation scenarios', () => {
    it('should handle invalid package manifest', () => {
      const context = {
        manifestPath: '/path/to/package.json',
        validationErrors: ['missing name field', 'invalid version format'],
      };
      const error = new PackageValidationError('Package manifest validation failed', context);

      expect(error.message).toBe('Package manifest validation failed');
      expect(error.context?.manifestPath).toBe('/path/to/package.json');
      expect(error.context?.validationErrors).toHaveLength(2);
    });

    it('should handle schema validation failures', () => {
      const context = {
        schema: 'package-schema-v1',
        fieldErrors: {
          name: 'must be string',
          version: 'must match semantic version pattern',
        },
      };
      const error = new PackageValidationError('Package schema validation failed', context);

      expect(error.context?.schema).toBe('package-schema-v1');
      expect(error.context?.fieldErrors).toEqual({
        name: 'must be string',
        version: 'must match semantic version pattern',
      });
    });
  });
});

describe('PackageNotFoundError', () => {
  it('should have correct error code', () => {
    const error = new PackageNotFoundError('Package not found');

    expect(error.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('should extend DomainError', () => {
    const error = new PackageNotFoundError('Package not found');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(PackageNotFoundError);
  });

  describe('package lookup scenarios', () => {
    it('should handle missing package by name', () => {
      const context = {
        packageName: 'non-existent-package',
        searchedSources: ['npm', 'github', 'local'],
      };
      const error = new PackageNotFoundError(
        'Package "non-existent-package" not found in any source',
        context,
      );

      expect(error.context?.packageName).toBe('non-existent-package');
      expect(error.context?.searchedSources).toEqual(['npm', 'github', 'local']);
    });

    it('should handle specific version not found', () => {
      const context = {
        packageName: 'existing-package',
        requestedVersion: '2.0.0',
        availableVersions: ['1.0.0', '1.1.0', '1.2.0'],
      };
      const error = new PackageNotFoundError(
        'Version 2.0.0 of existing-package not found',
        context,
      );

      expect(error.context?.requestedVersion).toBe('2.0.0');
      expect(error.context?.availableVersions).toHaveLength(3);
    });
  });
});

describe('PackageInstallationError', () => {
  it('should have correct error code', () => {
    const error = new PackageInstallationError('Installation failed');

    expect(error.code).toBe('PACKAGE_INSTALLATION_ERROR');
  });

  it('should extend DomainError', () => {
    const error = new PackageInstallationError('Installation failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(PackageInstallationError);
  });

  describe('installation failure scenarios', () => {
    it('should handle permission errors', () => {
      const context = {
        packageName: 'some-package',
        targetPath: '/usr/local/lib/packages',
        reason: 'insufficient permissions',
        exitCode: 1,
      };
      const error = new PackageInstallationError(
        'Failed to install some-package due to insufficient permissions',
        context,
      );

      expect(error.context?.reason).toBe('insufficient permissions');
      expect(error.context?.exitCode).toBe(1);
    });

    it('should handle network failures', () => {
      const context = {
        packageName: 'remote-package',
        source: 'https://registry.npmjs.org',
        networkError: 'ENOTFOUND',
        retryCount: 3,
      };
      const error = new PackageInstallationError(
        'Failed to download remote-package from registry',
        context,
      );

      expect(error.context?.networkError).toBe('ENOTFOUND');
      expect(error.context?.retryCount).toBe(3);
    });
  });
});

describe('DependencyResolutionError', () => {
  it('should have correct error code', () => {
    const error = new DependencyResolutionError('Dependency resolution failed');

    expect(error.code).toBe('DEPENDENCY_RESOLUTION_ERROR');
  });

  it('should extend DomainError', () => {
    const error = new DependencyResolutionError('Dependency resolution failed');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(DependencyResolutionError);
  });

  describe('dependency resolution scenarios', () => {
    it('should handle circular dependencies', () => {
      const context = {
        cyclePath: ['package-a', 'package-b', 'package-c', 'package-a'],
        resolutionStrategy: 'fail-fast',
      };
      const error = new DependencyResolutionError('Circular dependency detected', context);

      expect(error.context?.cyclePath).toHaveLength(4);
      const cyclePath = error.context?.cyclePath as string[];
      expect(cyclePath[0]).toBe('package-a');
      expect(cyclePath[3]).toBe('package-a');
    });

    it('should handle version constraint conflicts', () => {
      const context = {
        packageName: 'shared-dependency',
        conflictingConstraints: [
          { requiredBy: 'package-a', constraint: '^1.0.0' },
          { requiredBy: 'package-b', constraint: '^2.0.0' },
        ],
      };
      const error = new DependencyResolutionError(
        'Cannot resolve version constraints for shared-dependency',
        context,
      );

      expect(error.context?.conflictingConstraints).toHaveLength(2);
    });
  });
});

describe('PackageConflictError', () => {
  it('should have correct error code', () => {
    const error = new PackageConflictError('Package conflict detected');

    expect(error.code).toBe('PACKAGE_CONFLICT_ERROR');
  });

  it('should extend DomainError', () => {
    const error = new PackageConflictError('Package conflict detected');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(PackageConflictError);
  });

  describe('package conflict scenarios', () => {
    it('should handle name conflicts', () => {
      const context = {
        conflictType: 'name',
        packageName: 'duplicate-package',
        existingSource: 'npm',
        newSource: 'github',
      };
      const error = new PackageConflictError(
        'Package name conflict: duplicate-package already exists',
        context,
      );

      expect(error.context?.conflictType).toBe('name');
      expect(error.context?.existingSource).toBe('npm');
      expect(error.context?.newSource).toBe('github');
    });

    it('should handle file system conflicts', () => {
      const context = {
        conflictType: 'filesystem',
        conflictingFiles: ['/path/to/file1.js', '/path/to/file2.js'],
        packages: ['package-x', 'package-y'],
      };
      const error = new PackageConflictError(
        'File system conflict detected between packages',
        context,
      );

      expect(error.context?.conflictingFiles).toHaveLength(2);
      expect(error.context?.packages).toEqual(['package-x', 'package-y']);
    });
  });
});

describe('InvalidPackageVersionError', () => {
  it('should have correct error code', () => {
    const error = new InvalidPackageVersionError('Invalid version');

    expect(error.code).toBe('INVALID_PACKAGE_VERSION');
  });

  it('should extend DomainError', () => {
    const error = new InvalidPackageVersionError('Invalid version');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(InvalidPackageVersionError);
  });

  describe('version validation scenarios', () => {
    it('should handle malformed semantic versions', () => {
      const context = {
        providedVersion: '1.0.0.0.0',
        expectedFormat: 'semver (major.minor.patch)',
        validExamples: ['1.0.0', '2.1.3-alpha.1'],
      };
      const error = new InvalidPackageVersionError(
        'Version "1.0.0.0.0" does not follow semantic versioning',
        context,
      );

      expect(error.context?.providedVersion).toBe('1.0.0.0.0');
      expect(error.context?.expectedFormat).toBe('semver (major.minor.patch)');
    });

    it('should handle version range syntax errors', () => {
      const context = {
        providedRange: '^1.0.0 && >2.0.0',
        parseError: 'Conflicting range constraints',
        validSyntax: ['^1.0.0', '~1.0.0', '>=1.0.0 <2.0.0'],
      };
      const error = new InvalidPackageVersionError('Invalid version range syntax', context);

      expect(error.context?.parseError).toBe('Conflicting range constraints');
      expect(error.context?.validSyntax).toHaveLength(3);
    });
  });

  describe('property-based version validation', () => {
    it('should handle any invalid version string', () => {
      fc.assert(
        fc.property(
          fc
            .string()
            .filter((s) => !/^\d+\.\d+\.\d+/.test(s)), // Invalid semver pattern
          (invalidVersion) => {
            const error = new InvalidPackageVersionError(`Invalid version: ${invalidVersion}`, {
              providedVersion: invalidVersion,
            });

            expect(error.context?.providedVersion).toBe(invalidVersion);
            expect(error.code).toBe('INVALID_PACKAGE_VERSION');
          },
        ),
      );
    });
  });
});

describe('PackageSourceUnavailableError', () => {
  it('should have correct error code', () => {
    const error = new PackageSourceUnavailableError('Source unavailable');

    expect(error.code).toBe('PACKAGE_SOURCE_UNAVAILABLE');
  });

  it('should extend DomainError', () => {
    const error = new PackageSourceUnavailableError('Source unavailable');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(PackageSourceUnavailableError);
  });

  describe('source unavailability scenarios', () => {
    it('should handle registry downtime', () => {
      const context = {
        sourceType: 'registry',
        sourceUrl: 'https://registry.npmjs.org',
        lastSuccessfulConnection: '2024-01-01T10:00:00Z',
        httpStatus: 503,
      };
      const error = new PackageSourceUnavailableError(
        'NPM registry is currently unavailable',
        context,
      );

      expect(error.context?.httpStatus).toBe(503);
      expect(error.context?.sourceType).toBe('registry');
    });

    it('should handle authentication failures', () => {
      const context = {
        sourceType: 'private-registry',
        sourceUrl: 'https://private-npm.company.com',
        authenticationMethod: 'token',
        errorDetails: 'Invalid or expired token',
      };
      const error = new PackageSourceUnavailableError(
        'Authentication failed for private registry',
        context,
      );

      expect(error.context?.authenticationMethod).toBe('token');
      expect(error.context?.errorDetails).toBe('Invalid or expired token');
    });
  });
});

describe('SDKComplianceError', () => {
  it('should have correct error code', () => {
    const error = new SDKComplianceError('SDK compliance violation');

    expect(error.code).toBe('SDK_COMPLIANCE_ERROR');
  });

  it('should extend DomainError', () => {
    const error = new SDKComplianceError('SDK compliance violation');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(SDKComplianceError);
  });

  describe('SDK compliance scenarios', () => {
    it('should handle API version mismatches', () => {
      const context = {
        requiredSDKVersion: '2.0.0',
        packageSDKVersion: '1.5.0',
        incompatibleFeatures: ['async-validation', 'type-inference'],
        migrationGuide: 'https://docs.company.com/migration-v2',
      };
      const error = new SDKComplianceError(
        'Package requires SDK v2.0.0 but v1.5.0 is installed',
        context,
      );

      expect(error.context?.requiredSDKVersion).toBe('2.0.0');
      expect(error.context?.incompatibleFeatures).toHaveLength(2);
    });

    it('should handle compliance rule violations', () => {
      const context = {
        violatedRules: ['security-policy-001', 'naming-convention-042'],
        complianceLevel: 'enterprise',
        packageName: 'non-compliant-package',
      };
      const error = new SDKComplianceError('Package violates enterprise compliance rules', context);

      expect(error.context?.violatedRules).toHaveLength(2);
      expect(error.context?.complianceLevel).toBe('enterprise');
    });
  });
});

describe('Error Class Integration Tests', () => {
  const errorClasses = [
    {
      constructor: PackageValidationError,
      code: 'PACKAGE_VALIDATION_ERROR',
      name: 'PackageValidationError',
    },
    {
      constructor: PackageNotFoundError,
      code: 'PACKAGE_NOT_FOUND',
      name: 'PackageNotFoundError',
    },
    {
      constructor: PackageInstallationError,
      code: 'PACKAGE_INSTALLATION_ERROR',
      name: 'PackageInstallationError',
    },
    {
      constructor: DependencyResolutionError,
      code: 'DEPENDENCY_RESOLUTION_ERROR',
      name: 'DependencyResolutionError',
    },
    {
      constructor: PackageConflictError,
      code: 'PACKAGE_CONFLICT_ERROR',
      name: 'PackageConflictError',
    },
    {
      constructor: InvalidPackageVersionError,
      code: 'INVALID_PACKAGE_VERSION',
      name: 'InvalidPackageVersionError',
    },
    {
      constructor: PackageSourceUnavailableError,
      code: 'PACKAGE_SOURCE_UNAVAILABLE',
      name: 'PackageSourceUnavailableError',
    },
    {
      constructor: SDKComplianceError,
      code: 'SDK_COMPLIANCE_ERROR',
      name: 'SDKComplianceError',
    },
  ];

  describe('consistency across all error classes', () => {
    it.each(errorClasses)(
      '$name should have consistent behavior',
      ({ constructor: ErrorClass, code, name }) => {
        const message = faker.lorem.sentence();
        const context = { test: faker.word.noun() };

        const error = new ErrorClass(message, context);

        expect(error.code).toBe(code);
        expect(error.name).toBe(name);
        expect(error.message).toBe(message);
        expect(error.context).toEqual(context);
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
      },
    );

    it.each(errorClasses)(
      '$name should work without context',
      ({ constructor: ErrorClass, code, name }) => {
        const message = faker.lorem.sentence();

        const error = new ErrorClass(message);

        expect(error.code).toBe(code);
        expect(error.name).toBe(name);
        expect(error.message).toBe(message);
        expect(error.context).toBeUndefined();
      },
    );
  });

  describe('error serialization and debugging', () => {
    it('should provide useful error information for debugging', () => {
      const error = new PackageNotFoundError('Package "test-package" not found', {
        packageName: 'test-package',
        version: '1.0.0',
      });

      expect(error.name).toBe('PackageNotFoundError');
      expect(error.message).toBe('Package "test-package" not found');
      expect(error.context?.packageName).toBe('test-package');
      expect(error.context?.version).toBe('1.0.0');
    });

    it('should maintain stack trace', () => {
      const error = new DependencyResolutionError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DependencyResolutionError');
    });
  });

  describe('property-based testing for all error classes', () => {
    it('should handle any message and context combination', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...errorClasses),
          fc.string(),
          fc.option(fc.object(), { nil: undefined }),
          (errorClass, message, context) => {
            const error = new errorClass.constructor(message, context);

            expect(error.message).toBe(message);
            expect(error.code).toBe(errorClass.code);
            expect(error.name).toBe(errorClass.name);
            expect(error.context).toBe(context);
            expect(error).toBeInstanceOf(DomainError);
          },
        ),
      );
    });
  });

  describe('neverthrow Result integration', () => {
    it('should work correctly with neverthrow err() function', () => {
      const validationError = new PackageValidationError('Package validation failed', {
        packageName: 'test-package',
        errors: ['missing name field'],
      });

      const result = err(validationError);

      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
      if (result.isErr()) {
        expect(result.error).toBe(validationError);
        expect(result.error.code).toBe('PACKAGE_VALIDATION_ERROR');
        expect(result.error.context?.packageName).toBe('test-package');
      }
    });

    it('should work in Result chaining scenarios', () => {
      const notFoundError = new PackageNotFoundError('Package not found', {
        packageName: 'missing-package',
        searchedSources: ['npm', 'github'],
      });

      const errorResult = err(notFoundError);
      const transformedResult = errorResult.mapErr(
        (error) =>
          new PackageInstallationError(`Installation failed: ${error.message}`, {
            originalError: error.code,
            packageName: error.context?.packageName,
          }),
      );

      expect(transformedResult.isErr()).toBe(true);
      if (transformedResult.isErr()) {
        expect(transformedResult.error).toBeInstanceOf(PackageInstallationError);
        expect(transformedResult.error.code).toBe('PACKAGE_INSTALLATION_ERROR');
        expect(transformedResult.error.message).toBe('Installation failed: Package not found');
        expect(transformedResult.error.context?.originalError).toBe('PACKAGE_NOT_FOUND');
      }
    });

    it('should preserve error context through Result operations', () => {
      const dependencyError = new DependencyResolutionError('Circular dependency detected', {
        cyclePath: ['package-a', 'package-b', 'package-a'],
        resolutionStrategy: 'fail-fast',
      });

      const result = err(dependencyError)
        .andThen(() => ok('should not reach here'))
        .mapErr((error) => {
          expect(error.context?.cyclePath).toEqual(['package-a', 'package-b', 'package-a']);
          expect(error.context?.resolutionStrategy).toBe('fail-fast');
          return error;
        });

      expect(result.isErr()).toBe(true);
    });

    it('should work with all error types in Result contexts', () => {
      const errorResults = errorClasses.map(({ constructor: ErrorClass }) => {
        const error = new ErrorClass('Test message', { testContext: 'value' });
        return err(error);
      });

      errorResults.forEach((result, index) => {
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe(errorClasses[index]?.code);
          expect(result.error.context?.testContext).toBe('value');
        }
      });
    });
  });
});
