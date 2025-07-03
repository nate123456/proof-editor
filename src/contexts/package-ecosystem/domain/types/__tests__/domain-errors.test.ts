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
} from '../domain-errors.js';

describe('Package Ecosystem Domain Errors', () => {
  describe('DomainError base class', () => {
    class TestDomainError extends DomainError {
      readonly code = 'TEST_ERROR';
    }

    it('should create error with message', () => {
      const error = new TestDomainError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('TestDomainError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toBeUndefined();
    });

    it('should create error with message and context', () => {
      const context = { packageName: 'test-package', version: '1.0.0' };
      const error = new TestDomainError('Test error message', context);

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('TestDomainError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual(context);
    });

    it('should be instance of Error', () => {
      const error = new TestDomainError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have correct prototype chain', () => {
      const error = new TestDomainError('Test error');

      expect(Object.getPrototypeOf(error)).toBe(TestDomainError.prototype);
      expect(Object.getPrototypeOf(TestDomainError.prototype)).toBe(DomainError.prototype);
      expect(Object.getPrototypeOf(DomainError.prototype)).toBe(Error.prototype);
    });

    it('should preserve context information', () => {
      const complexContext = {
        packageId: 'test-package-123',
        version: '2.1.0',
        dependencies: ['dep1', 'dep2'],
        metadata: { author: 'test-author' },
      };
      const error = new TestDomainError('Complex error', complexContext);

      expect(error.context).toEqual(complexContext);
      expect(error.context?.packageId).toBe('test-package-123');
      expect(error.context?.dependencies).toEqual(['dep1', 'dep2']);
    });
  });

  describe('PackageValidationError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new PackageValidationError('Package validation failed');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(PackageValidationError);
      expect(error.name).toBe('PackageValidationError');
      expect(error.code).toBe('PACKAGE_VALIDATION_ERROR');
      expect(error.message).toBe('Package validation failed');
    });

    it('should create error with context', () => {
      const context = {
        packageName: 'invalid-package',
        validationErrors: ['missing version', 'invalid dependency'],
        field: 'manifest',
      };
      const error = new PackageValidationError('Validation failed', context);

      expect(error.context).toEqual(context);
      expect(error.code).toBe('PACKAGE_VALIDATION_ERROR');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new PackageValidationError('Test validation error');
      }).toThrow(PackageValidationError);

      expect(() => {
        throw new PackageValidationError('Test validation error');
      }).toThrow('Test validation error');
    });
  });

  describe('PackageNotFoundError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new PackageNotFoundError('Package not found');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(PackageNotFoundError);
      expect(error.name).toBe('PackageNotFoundError');
      expect(error.code).toBe('PACKAGE_NOT_FOUND');
      expect(error.message).toBe('Package not found');
    });

    it('should create error with package context', () => {
      const context = {
        packageName: 'missing-package',
        version: '1.0.0',
        searchedRepositories: ['repo1', 'repo2'],
        requestedBy: 'user-123',
      };
      const error = new PackageNotFoundError('Package not found in any repository', context);

      expect(error.context).toEqual(context);
      expect(error.code).toBe('PACKAGE_NOT_FOUND');
    });

    it('should handle different package identifier formats', () => {
      const contexts = [
        { packageId: 'pkg-123', name: 'test-package' },
        { packageUrl: 'https://github.com/user/repo', format: 'git' },
        { localPath: '/path/to/package', type: 'local' },
      ];

      contexts.forEach(context => {
        const error = new PackageNotFoundError('Package not found', context);
        expect(error.context).toEqual(context);
        expect(error.code).toBe('PACKAGE_NOT_FOUND');
      });
    });
  });

  describe('PackageInstallationError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new PackageInstallationError('Installation failed');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(PackageInstallationError);
      expect(error.name).toBe('PackageInstallationError');
      expect(error.code).toBe('PACKAGE_INSTALLATION_ERROR');
      expect(error.message).toBe('Installation failed');
    });

    it('should create error with installation context', () => {
      const context = {
        packageName: 'failed-package',
        targetPath: '/install/path',
        stage: 'dependency-resolution',
        partiallyInstalled: true,
        rollbackRequired: true,
      };
      const error = new PackageInstallationError(
        'Installation failed during dependency resolution',
        context
      );

      expect(error.context).toEqual(context);
      expect(error.code).toBe('PACKAGE_INSTALLATION_ERROR');
    });

    it('should handle different installation failure scenarios', () => {
      const scenarios = [
        { stage: 'download', error: 'network-timeout', retryable: true },
        { stage: 'extraction', error: 'corrupted-archive', retryable: false },
        { stage: 'permissions', error: 'access-denied', fixable: true },
        { stage: 'validation', error: 'checksum-mismatch', retryable: true },
      ];

      scenarios.forEach(context => {
        const error = new PackageInstallationError('Installation failed', context);
        expect(error.context).toEqual(context);
        expect(error.code).toBe('PACKAGE_INSTALLATION_ERROR');
      });
    });
  });

  describe('DependencyResolutionError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new DependencyResolutionError('Dependency resolution failed');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(DependencyResolutionError);
      expect(error.name).toBe('DependencyResolutionError');
      expect(error.code).toBe('DEPENDENCY_RESOLUTION_ERROR');
      expect(error.message).toBe('Dependency resolution failed');
    });

    it('should create error with dependency context', () => {
      const context = {
        packageName: 'complex-package',
        conflictingDependencies: [
          { name: 'dep1', requestedVersions: ['1.0.0', '2.0.0'] },
          { name: 'dep2', requestedVersions: ['0.5.0', '1.0.0'] },
        ],
        resolutionStrategy: 'strict',
        cycleDetected: false,
      };
      const error = new DependencyResolutionError('Cannot resolve version conflicts', context);

      expect(error.context).toEqual(context);
      expect(error.code).toBe('DEPENDENCY_RESOLUTION_ERROR');
    });

    it('should handle circular dependency scenarios', () => {
      const context = {
        packageName: 'circular-package',
        dependencyChain: ['pkg-a', 'pkg-b', 'pkg-c', 'pkg-a'],
        cycleDetected: true,
        cycleLength: 3,
      };
      const error = new DependencyResolutionError('Circular dependency detected', context);

      expect(error.context).toEqual(context);
      expect(error.context?.cycleDetected).toBe(true);
    });
  });

  describe('PackageConflictError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new PackageConflictError('Package conflict detected');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(PackageConflictError);
      expect(error.name).toBe('PackageConflictError');
      expect(error.code).toBe('PACKAGE_CONFLICT_ERROR');
      expect(error.message).toBe('Package conflict detected');
    });

    it('should create error with conflict details', () => {
      const context = {
        conflictType: 'version-mismatch',
        existingPackage: { name: 'test-package', version: '1.0.0' },
        requestedPackage: { name: 'test-package', version: '2.0.0' },
        resolution: 'manual-intervention-required',
        affectedDependents: ['dependent1', 'dependent2'],
      };
      const error = new PackageConflictError('Version conflict between packages', context);

      expect(error.context).toEqual(context);
      expect(error.code).toBe('PACKAGE_CONFLICT_ERROR');
    });

    it('should handle different conflict types', () => {
      const conflictTypes = [
        { type: 'name-collision', description: 'Two packages with same name' },
        { type: 'resource-conflict', description: 'Competing for same resources' },
        { type: 'api-incompatibility', description: 'Incompatible API versions' },
        { type: 'license-conflict', description: 'Conflicting license terms' },
      ];

      conflictTypes.forEach(({ type, description }) => {
        const context = { conflictType: type, description };
        const error = new PackageConflictError('Package conflict', context);
        expect(error.context).toEqual(context);
      });
    });
  });

  describe('InvalidPackageVersionError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new InvalidPackageVersionError('Invalid package version');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(InvalidPackageVersionError);
      expect(error.name).toBe('InvalidPackageVersionError');
      expect(error.code).toBe('INVALID_PACKAGE_VERSION');
      expect(error.message).toBe('Invalid package version');
    });

    it('should create error with version context', () => {
      const context = {
        packageName: 'test-package',
        requestedVersion: 'invalid-version-string',
        validVersionPattern: 'semantic-version',
        examples: ['1.0.0', '2.1.3', '1.0.0-alpha.1'],
      };
      const error = new InvalidPackageVersionError(
        'Version does not follow semantic versioning',
        context
      );

      expect(error.context).toEqual(context);
      expect(error.code).toBe('INVALID_PACKAGE_VERSION');
    });

    it('should handle different version validation scenarios', () => {
      const scenarios = [
        { version: '', issue: 'empty-version' },
        { version: 'latest', issue: 'non-specific-version' },
        { version: '1.0', issue: 'incomplete-semver' },
        { version: 'v1.0.0', issue: 'invalid-prefix' },
        { version: '1.0.0.0', issue: 'too-many-parts' },
      ];

      scenarios.forEach(({ version, issue }) => {
        const context = { requestedVersion: version, validationIssue: issue };
        const error = new InvalidPackageVersionError('Invalid version format', context);
        expect(error.context).toEqual(context);
      });
    });
  });

  describe('PackageSourceUnavailableError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new PackageSourceUnavailableError('Package source unavailable');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(PackageSourceUnavailableError);
      expect(error.name).toBe('PackageSourceUnavailableError');
      expect(error.code).toBe('PACKAGE_SOURCE_UNAVAILABLE');
      expect(error.message).toBe('Package source unavailable');
    });

    it('should create error with source context', () => {
      const context = {
        sourceType: 'remote-repository',
        sourceUrl: 'https://registry.example.com',
        lastAttempt: new Date().toISOString(),
        retryCount: 3,
        timeout: 30000,
        networkError: 'connection-timeout',
      };
      const error = new PackageSourceUnavailableError(
        'Remote repository is not responding',
        context
      );

      expect(error.context).toEqual(context);
      expect(error.code).toBe('PACKAGE_SOURCE_UNAVAILABLE');
    });

    it('should handle different source types', () => {
      const sourceTypes = [
        { type: 'local-filesystem', path: '/local/packages', error: 'path-not-found' },
        {
          type: 'git-repository',
          url: 'https://github.com/user/repo',
          error: 'authentication-failed',
        },
        { type: 'npm-registry', url: 'https://npmjs.org', error: 'service-down' },
        { type: 'private-registry', url: 'https://private.example.com', error: 'unauthorized' },
      ];

      sourceTypes.forEach(({ type, ...context }) => {
        const error = new PackageSourceUnavailableError('Source unavailable', {
          sourceType: type,
          ...context,
        });
        expect(error.context?.sourceType).toBe(type);
      });
    });
  });

  describe('SDKComplianceError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new SDKComplianceError('SDK compliance violation');

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(SDKComplianceError);
      expect(error.name).toBe('SDKComplianceError');
      expect(error.code).toBe('SDK_COMPLIANCE_ERROR');
      expect(error.message).toBe('SDK compliance violation');
    });

    it('should create error with compliance context', () => {
      const context = {
        packageName: 'non-compliant-package',
        sdkVersion: '1.2.0',
        requiredInterfaces: ['IAnalysisProvider', 'IValidationRule'],
        missingInterfaces: ['IValidationRule'],
        complianceLevel: 'strict',
        violationType: 'missing-required-interface',
      };
      const error = new SDKComplianceError(
        'Package does not implement required interfaces',
        context
      );

      expect(error.context).toEqual(context);
      expect(error.code).toBe('SDK_COMPLIANCE_ERROR');
    });

    it('should handle different compliance violations', () => {
      const violations = [
        { type: 'missing-interface', severity: 'error' },
        { type: 'deprecated-api-usage', severity: 'warning' },
        { type: 'invalid-metadata', severity: 'error' },
        { type: 'unsupported-sdk-version', severity: 'error' },
        { type: 'security-policy-violation', severity: 'critical' },
      ];

      violations.forEach(({ type, severity }) => {
        const context = { violationType: type, severity };
        const error = new SDKComplianceError('Compliance violation', context);
        expect(error.context).toEqual(context);
      });
    });
  });

  describe('error hierarchy and inheritance', () => {
    it('should allow instanceof checks at any level', () => {
      const validationError = new PackageValidationError('Validation failed');
      const notFoundError = new PackageNotFoundError('Package not found');
      const installError = new PackageInstallationError('Installation failed');
      const dependencyError = new DependencyResolutionError('Dependency resolution failed');
      const conflictError = new PackageConflictError('Package conflict');
      const versionError = new InvalidPackageVersionError('Invalid version');
      const sourceError = new PackageSourceUnavailableError('Source unavailable');
      const complianceError = new SDKComplianceError('Compliance violation');

      // All should be instances of Error and DomainError
      const errors = [
        validationError,
        notFoundError,
        installError,
        dependencyError,
        conflictError,
        versionError,
        sourceError,
        complianceError,
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(DomainError);
        expect(error.code).toBeTruthy();
        expect(error.message).toBeTruthy();
      });
    });

    it('should distinguish between different error types', () => {
      const validationError = new PackageValidationError('Validation failed');
      const notFoundError = new PackageNotFoundError('Package not found');

      expect(validationError).not.toBeInstanceOf(PackageNotFoundError);
      expect(notFoundError).not.toBeInstanceOf(PackageValidationError);
      expect(validationError).not.toBeInstanceOf(PackageInstallationError);
    });

    it('should allow error handling by base type', () => {
      const errors: DomainError[] = [
        new PackageValidationError('Validation failed'),
        new PackageNotFoundError('Package not found'),
        new PackageInstallationError('Installation failed'),
        new DependencyResolutionError('Dependency resolution failed'),
        new PackageConflictError('Package conflict'),
        new InvalidPackageVersionError('Invalid version'),
        new PackageSourceUnavailableError('Source unavailable'),
        new SDKComplianceError('Compliance violation'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBeTruthy();
        expect(error.message).toBeTruthy();
      });
    });

    it('should preserve context in error chains', () => {
      const sourceContext = { url: 'https://registry.example.com', timeout: 30000 };
      const sourceError = new PackageSourceUnavailableError('Source down', sourceContext);

      const installContext = {
        packageName: 'test-package',
        underlyingError: sourceError.message,
        stage: 'download',
      };
      const installError = new PackageInstallationError(
        'Install failed due to source',
        installContext
      );

      expect(sourceError.context).toEqual(sourceContext);
      expect(installError.context).toEqual(installContext);
      expect(installError.context?.underlyingError).toBe(sourceError.message);
    });
  });

  describe('error codes and identification', () => {
    it('should have unique error codes for each error type', () => {
      const errors = [
        new PackageValidationError('test'),
        new PackageNotFoundError('test'),
        new PackageInstallationError('test'),
        new DependencyResolutionError('test'),
        new PackageConflictError('test'),
        new InvalidPackageVersionError('test'),
        new PackageSourceUnavailableError('test'),
        new SDKComplianceError('test'),
      ];

      const codes = errors.map(error => error.code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have descriptive error codes', () => {
      const errorInstances = [
        { error: new PackageValidationError('test'), expected: 'PACKAGE_VALIDATION_ERROR' },
        { error: new PackageNotFoundError('test'), expected: 'PACKAGE_NOT_FOUND' },
        { error: new PackageInstallationError('test'), expected: 'PACKAGE_INSTALLATION_ERROR' },
        { error: new DependencyResolutionError('test'), expected: 'DEPENDENCY_RESOLUTION_ERROR' },
        { error: new PackageConflictError('test'), expected: 'PACKAGE_CONFLICT_ERROR' },
        { error: new InvalidPackageVersionError('test'), expected: 'INVALID_PACKAGE_VERSION' },
        {
          error: new PackageSourceUnavailableError('test'),
          expected: 'PACKAGE_SOURCE_UNAVAILABLE',
        },
        { error: new SDKComplianceError('test'), expected: 'SDK_COMPLIANCE_ERROR' },
      ];

      errorInstances.forEach(({ error, expected }) => {
        expect(error.code).toBe(expected);
      });
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle empty error messages', () => {
      const error = new PackageValidationError('');

      expect(error.message).toBe('');
      expect(error.name).toBe('PackageValidationError');
      expect(error.code).toBe('PACKAGE_VALIDATION_ERROR');
    });

    it('should handle null and undefined context', () => {
      const errorWithNull = new PackageNotFoundError('Test', null as any);
      const errorWithUndefined = new PackageNotFoundError('Test', undefined);

      expect(errorWithNull.context).toBe(null);
      expect(errorWithUndefined.context).toBe(undefined);
    });

    it('should handle complex nested context objects', () => {
      const complexContext = {
        package: {
          name: 'complex-package',
          version: '1.0.0',
          metadata: {
            author: 'test-author',
            dependencies: {
              runtime: ['dep1', 'dep2'],
              development: ['dev-dep1'],
            },
          },
        },
        error: {
          type: 'validation',
          details: {
            missing: ['required-field'],
            invalid: ['version-format'],
          },
        },
      };

      const error = new PackageValidationError('Complex validation error', complexContext);

      expect(error.context).toEqual(complexContext);
      expect(error.context?.package?.metadata?.dependencies?.runtime).toEqual(['dep1', 'dep2']);
    });

    it('should maintain stack trace information', () => {
      const error = new DependencyResolutionError('Stack test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DependencyResolutionError');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new PackageConflictError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it('should handle special characters in context values', () => {
      const context = {
        packageName: 'special-chars-åäö-🎉',
        path: '/path/with spaces/and-special-chars',
        description: 'Contains "quotes" and \'apostrophes\' and\nnewlines\tand\ttabs',
      };

      const error = new PackageInstallationError('Special character test', context);

      expect(error.context).toEqual(context);
      expect(error.context?.packageName).toContain('🎉');
    });
  });
});
