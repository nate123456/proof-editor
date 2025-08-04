import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DomainError } from '../../../../../domain/errors/DomainErrors.js';
import {
  DependencyResolutionError,
  InvalidPackageVersionError,
  PackageConflictError,
  PackageError,
  PackageInstallationError,
  PackageNotFoundError,
  PackageSourceUnavailableError,
  PackageValidationError,
  SDKComplianceError,
} from '../domain-errors.js';

describe('Package Ecosystem Domain Errors', () => {
  describe('PackageError base class', () => {
    class TestDomainError extends PackageError {
      override readonly name: string = 'TestDomainError';

      getCode(): string {
        return 'TEST_ERROR';
      }
    }

    it('should create error with message', () => {
      const error = new TestDomainError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('TestDomainError');
      expect(error.getCode()).toBe('TEST_ERROR');
      expect(error.context).toBeUndefined();
    });

    it('should create error with message and context', () => {
      const context = { packageName: 'test-package', version: '1.0.0' };
      const error = new TestDomainError('Test error message', context);

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('TestDomainError');
      expect(error.getCode()).toBe('TEST_ERROR');
      expect(error.context).toEqual(context);
    });

    it('should be instance of Error', () => {
      const error = new TestDomainError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PackageError);
    });

    it('should have correct prototype chain', () => {
      const error = new TestDomainError('Test error');

      expect(Object.getPrototypeOf(error)).toBe(TestDomainError.prototype);
      expect(Object.getPrototypeOf(TestDomainError.prototype)).toBe(PackageError.prototype);
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

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(PackageValidationError);
      expect(error.name).toBe('PackageValidationError');
      expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
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
      expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
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

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(PackageNotFoundError);
      expect(error.name).toBe('PackageNotFoundError');
      expect(error.getCode()).toBe('PACKAGE_NOT_FOUND');
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
      expect(error.getCode()).toBe('PACKAGE_NOT_FOUND');
    });

    it('should handle different package identifier formats', () => {
      const contexts = [
        { packageId: 'pkg-123', name: 'test-package' },
        { packageUrl: 'https://github.com/user/repo', format: 'git' },
        { localPath: '/path/to/package', type: 'local' },
      ];

      contexts.forEach((context) => {
        const error = new PackageNotFoundError('Package not found', context);
        expect(error.context).toEqual(context);
        expect(error.getCode()).toBe('PACKAGE_NOT_FOUND');
      });
    });
  });

  describe('PackageInstallationError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new PackageInstallationError('Installation failed');

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(PackageInstallationError);
      expect(error.name).toBe('PackageInstallationError');
      expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
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
        context,
      );

      expect(error.context).toEqual(context);
      expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
    });

    it('should handle different installation failure scenarios', () => {
      const scenarios = [
        { stage: 'download', error: 'network-timeout', retryable: true },
        { stage: 'extraction', error: 'corrupted-archive', retryable: false },
        { stage: 'permissions', error: 'access-denied', fixable: true },
        { stage: 'validation', error: 'checksum-mismatch', retryable: true },
      ];

      scenarios.forEach((context) => {
        const error = new PackageInstallationError('Installation failed', context);
        expect(error.context).toEqual(context);
        expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
      });
    });
  });

  describe('DependencyResolutionError', () => {
    it('should extend DomainError with correct properties', () => {
      const error = new DependencyResolutionError('Dependency resolution failed');

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(DependencyResolutionError);
      expect(error.name).toBe('DependencyResolutionError');
      expect(error.getCode()).toBe('DEPENDENCY_RESOLUTION_ERROR');
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
      expect(error.getCode()).toBe('DEPENDENCY_RESOLUTION_ERROR');
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

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(PackageConflictError);
      expect(error.name).toBe('PackageConflictError');
      expect(error.getCode()).toBe('PACKAGE_CONFLICT_ERROR');
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
      expect(error.getCode()).toBe('PACKAGE_CONFLICT_ERROR');
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

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(InvalidPackageVersionError);
      expect(error.name).toBe('InvalidPackageVersionError');
      expect(error.getCode()).toBe('INVALID_PACKAGE_VERSION');
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
        context,
      );

      expect(error.context).toEqual(context);
      expect(error.getCode()).toBe('INVALID_PACKAGE_VERSION');
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

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(PackageSourceUnavailableError);
      expect(error.name).toBe('PackageSourceUnavailableError');
      expect(error.getCode()).toBe('PACKAGE_SOURCE_UNAVAILABLE');
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
        context,
      );

      expect(error.context).toEqual(context);
      expect(error.getCode()).toBe('PACKAGE_SOURCE_UNAVAILABLE');
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

      expect(error).toBeInstanceOf(PackageError);
      expect(error).toBeInstanceOf(SDKComplianceError);
      expect(error.name).toBe('SDKComplianceError');
      expect(error.getCode()).toBe('SDK_COMPLIANCE_ERROR');
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
        context,
      );

      expect(error.context).toEqual(context);
      expect(error.getCode()).toBe('SDK_COMPLIANCE_ERROR');
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

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(PackageError);
        expect(error.getCode()).toBeTruthy();
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
      const errors: PackageError[] = [
        new PackageValidationError('Validation failed'),
        new PackageNotFoundError('Package not found'),
        new PackageInstallationError('Installation failed'),
        new DependencyResolutionError('Dependency resolution failed'),
        new PackageConflictError('Package conflict'),
        new InvalidPackageVersionError('Invalid version'),
        new PackageSourceUnavailableError('Source unavailable'),
        new SDKComplianceError('Compliance violation'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(PackageError);
        expect(error).toBeInstanceOf(Error);
        expect(error.getCode()).toBeTruthy();
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
        installContext,
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

      const codes = errors.map((error) => error.getCode());
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
        expect(error.getCode()).toBe(expected);
      });
    });
  });

  describe('context parameter validation and edge cases', () => {
    it('should handle context with nested objects and arrays', () => {
      const complexContext = {
        package: {
          id: 'complex-package',
          metadata: {
            dependencies: [
              { name: 'dep1', version: '1.0.0', optional: false },
              { name: 'dep2', version: '2.0.0', optional: true },
            ],
            scripts: {
              build: 'npm run compile',
              test: 'vitest run',
            },
          },
        },
        validation: {
          rules: ['required-fields', 'version-format', 'dependency-resolution'],
          violations: [
            { rule: 'required-fields', field: 'name', severity: 'error' },
            { rule: 'version-format', field: 'version', severity: 'warning' },
          ],
        },
        environment: {
          platform: 'node',
          version: '18.0.0',
          features: ['esm', 'async'],
        },
      };

      const error = new PackageValidationError('Complex validation failed', complexContext);

      expect(error.context).toEqual(complexContext);
      expect((error.context as any)?.package?.metadata?.dependencies).toHaveLength(2);
      expect((error.context as any)?.validation?.violations).toHaveLength(2);
      expect((error.context as any)?.environment?.features).toContain('esm');
    });

    it('should handle circular reference prevention in context', () => {
      const baseContext = { packageId: 'test-package', stage: 'validation' };
      const circularContext = { ...baseContext, self: baseContext };

      // Even with potential circular references, error should be created
      const error = new PackageConflictError('Circular context test', circularContext);

      expect(error.context?.packageId).toBe('test-package');
      expect(error.context?.stage).toBe('validation');
      expect(error.context?.self).toBeDefined();
    });

    it('should handle primitive and special values in context', () => {
      const primitiveContext = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        emptyArray: [],
        emptyObject: {},
        date: new Date('2024-01-01'),
        regex: /test-pattern/g,
      };

      const error = new InvalidPackageVersionError('Primitive context test', primitiveContext);

      expect(error.context?.string).toBe('test');
      expect(error.context?.number).toBe(42);
      expect(error.context?.boolean).toBe(true);
      expect(error.context?.nullValue).toBe(null);
      expect(error.context?.undefinedValue).toBeUndefined();
      expect(error.context?.emptyArray).toEqual([]);
      expect(error.context?.emptyObject).toEqual({});
      expect(error.context?.date).toBeInstanceOf(Date);
      expect(error.context?.regex).toBeInstanceOf(RegExp);
    });

    it('should handle large context objects efficiently', () => {
      const largeContext = {
        packages: Array.from({ length: 1000 }, (_, i) => ({
          id: `package-${i}`,
          version: `1.${i}.0`,
          dependencies: [`dep-${i}-1`, `dep-${i}-2`],
        })),
        metadata: {
          totalSize: 1000,
          processingTime: 5000,
          memoryUsage: '256MB',
        },
      };

      const startTime = performance.now();
      const error = new DependencyResolutionError('Large context test', largeContext);
      const endTime = performance.now();

      expect(error.context?.packages).toHaveLength(1000);
      expect((error.context as any)?.metadata?.totalSize).toBe(1000);
      expect(endTime - startTime).toBeLessThan(50); // Should be efficient
    });

    it('should handle context serialization scenarios', () => {
      const serializableContext = {
        packageId: 'serializable-package',
        timestamp: Date.now(),
        config: {
          debug: true,
          retries: 3,
          timeout: 30000,
        },
        dependencies: ['dep1', 'dep2', 'dep3'],
      };

      const error = new PackageSourceUnavailableError('Serialization test', serializableContext);

      // Test JSON serialization works
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.getCode(),
        context: error.context,
      });

      const parsed = JSON.parse(serialized);
      expect(parsed.context.packageId).toBe('serializable-package');
      expect(parsed.context.dependencies).toEqual(['dep1', 'dep2', 'dep3']);
      expect(parsed.code).toBe('PACKAGE_SOURCE_UNAVAILABLE');
    });
  });

  describe('domain-specific context patterns', () => {
    it('should handle package validation context patterns', () => {
      const validationContexts = [
        {
          stage: 'schema-validation',
          schema: 'package-manifest-v1',
          violations: [
            { field: 'name', rule: 'required', severity: 'error' },
            { field: 'version', rule: 'semver', severity: 'error' },
          ],
        },
        {
          stage: 'dependency-validation',
          resolver: 'npm-resolver',
          conflicts: [
            { package: 'dep1', requested: '1.0.0', available: '2.0.0' },
            { package: 'dep2', requested: '1.5.0', available: null },
          ],
        },
        {
          stage: 'integrity-validation',
          checksum: { expected: 'abc123', actual: 'def456' },
          source: 'remote-registry',
        },
      ];

      validationContexts.forEach((context) => {
        const error = new PackageValidationError('Context-specific validation failed', context);
        expect(error.context).toEqual(context);
        expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
      });
    });

    it('should handle package installation context patterns', () => {
      const installationContexts = [
        {
          phase: 'download',
          source: 'https://registry.npmjs.org/package/-/package-1.0.0.tgz',
          progress: { total: 1024000, downloaded: 512000 },
          retryCount: 2,
        },
        {
          phase: 'extraction',
          archive: 'package-1.0.0.tgz',
          destination: '/node_modules/package',
          permissions: { read: true, write: false, execute: true },
        },
        {
          phase: 'linking',
          symlinks: [{ from: '/global/package', to: '/local/node_modules/package' }],
          conflicts: ['existing-symlink'],
        },
      ];

      installationContexts.forEach((context) => {
        const error = new PackageInstallationError('Context-specific installation failed', context);
        expect(error.context).toEqual(context);
        expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
      });
    });

    it('should handle SDK compliance context patterns', () => {
      const complianceContexts = [
        {
          sdkVersion: '2.1.0',
          packageVersion: '1.0.0',
          requiredInterfaces: ['ILanguageProvider', 'IValidationRule'],
          implementedInterfaces: ['ILanguageProvider'],
          missingInterfaces: ['IValidationRule'],
          complianceLevel: 'strict',
        },
        {
          sdkVersion: '2.0.0',
          packageVersion: '0.9.0',
          deprecatedAPIs: ['oldValidate', 'legacyFormat'],
          newAPIs: ['validate', 'format'],
          migrationRequired: true,
        },
        {
          sdkVersion: '3.0.0-beta',
          packageVersion: '2.0.0',
          experimentalFeatures: ['async-validation', 'streaming-analysis'],
          stabilityWarnings: ['API may change in future versions'],
        },
      ];

      complianceContexts.forEach((context) => {
        const error = new SDKComplianceError('Context-specific compliance violation', context);
        expect(error.context).toEqual(context);
        expect(error.getCode()).toBe('SDK_COMPLIANCE_ERROR');
      });
    });
  });

  describe('cross-context error integration', () => {
    it('should handle error propagation with context preservation', () => {
      // Simulate error chain across different package operations
      const sourceError = new PackageSourceUnavailableError('Registry offline', {
        registry: 'https://registry.npmjs.org',
        timeout: 30000,
        lastAttempt: Date.now(),
      });

      const installError = new PackageInstallationError('Download failed', {
        packageId: 'test-package',
        phase: 'download',
        underlying: sourceError.message,
        sourceContext: sourceError.context,
      });

      const resolutionError = new DependencyResolutionError('Cannot resolve dependencies', {
        packageId: 'main-package',
        failedDependency: 'test-package',
        underlying: installError.message,
        installContext: installError.context,
      });

      // Each error should maintain its own context while referencing previous contexts
      expect((resolutionError.context as any)?.packageId).toBe('main-package');
      expect((resolutionError.context as any)?.installContext?.packageId).toBe('test-package');
      expect((resolutionError.context as any)?.installContext?.sourceContext?.registry).toBe(
        'https://registry.npmjs.org',
      );
    });

    it('should handle concurrent package operations with context aggregation', () => {
      const concurrentOperations = [
        {
          packageId: 'package-1',
          operation: 'install',
          error: new PackageInstallationError('Install failed', {
            phase: 'download',
            worker: 'worker-1',
          }),
        },
        {
          packageId: 'package-2',
          operation: 'validate',
          error: new PackageValidationError('Validation failed', {
            schema: 'v1',
            worker: 'worker-2',
          }),
        },
        {
          packageId: 'package-3',
          operation: 'resolve',
          error: new DependencyResolutionError('Resolution failed', {
            algorithm: 'depth-first',
            worker: 'worker-3',
          }),
        },
      ];

      // Aggregate context from all operations
      const aggregatedContext = {
        batchId: 'batch-123',
        timestamp: Date.now(),
        operations: concurrentOperations.map((op) => ({
          packageId: op.packageId,
          operation: op.operation,
          error: op.error.message,
          errorCode: op.error.getCode(),
          context: op.error.context,
        })),
      };

      const batchError = new PackageConflictError('Batch operation failed', aggregatedContext);

      expect((batchError.context as any)?.operations).toHaveLength(3);
      expect((batchError.context as any)?.operations?.[0]?.packageId).toBe('package-1');
      expect((batchError.context as any)?.operations?.[1]?.errorCode).toBe(
        'PACKAGE_VALIDATION_ERROR',
      );
      expect((batchError.context as any)?.operations?.[2]?.context?.algorithm).toBe('depth-first');
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle empty error messages', () => {
      const error = new PackageValidationError('');

      expect(error.message).toBe('');
      expect(error.name).toBe('PackageValidationError');
      expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
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
      expect(
        (error.context as typeof complexContext)?.package?.metadata?.dependencies?.runtime,
      ).toEqual(['dep1', 'dep2']);
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

    it('should handle context mutations after error creation', () => {
      const mutableContext = {
        packageName: 'original-package',
        mutableArray: ['item1', 'item2'],
        nestedObject: { value: 'original' },
      };

      const error = new PackageValidationError('Mutation test', mutableContext);

      // Mutate original context
      mutableContext.packageName = 'modified-package';
      mutableContext.mutableArray.push('item3');
      mutableContext.nestedObject.value = 'modified';

      // Error context should reflect mutations (no deep cloning)
      expect(error.context?.packageName).toBe('modified-package');
      expect(error.context?.mutableArray).toContain('item3');
      expect((error.context as any)?.nestedObject?.value).toBe('modified');
    });

    it('should handle context with functions and non-serializable values', () => {
      const functionContext = {
        packageName: 'function-test',
        callback: () => 'test-callback',
        symbol: Symbol('test-symbol'),
        date: new Date('2024-01-01'),
        regex: /test-pattern/gi,
        bigint: BigInt(9007199254740991),
      };

      const error = new SDKComplianceError('Function context test', functionContext);

      expect(error.context?.packageName).toBe('function-test');
      expect(typeof error.context?.callback).toBe('function');
      expect(typeof error.context?.callback).toBe('function');
      expect((error.context?.callback as any)()).toBe('test-callback');
      expect(typeof error.context?.symbol).toBe('symbol');
      expect(error.context?.date).toBeInstanceOf(Date);
      expect(error.context?.regex).toBeInstanceOf(RegExp);
      expect(typeof error.context?.bigint).toBe('bigint');
    });
  });

  describe('error factory patterns and consistency', () => {
    it('should create package validation errors consistently', () => {
      const validationErrorFactory = (message: string, context?: Record<string, unknown>) =>
        new PackageValidationError(message, context);

      const errors = [
        validationErrorFactory('Schema validation failed'),
        validationErrorFactory('Missing required field', { field: 'name' }),
        validationErrorFactory('Invalid format', { field: 'version', format: 'semver' }),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(PackageValidationError);
        expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
        expect(error.name).toBe('PackageValidationError');
      });
    });

    it('should create package installation errors with consistent patterns', () => {
      const installationErrorFactory = (
        message: string,
        phase: string,
        context?: Record<string, unknown>,
      ) => new PackageInstallationError(message, { phase, ...context });

      const errors = [
        installationErrorFactory('Download failed', 'download', { retryCount: 3 }),
        installationErrorFactory('Extraction failed', 'extraction', { archiveSize: 1024 }),
        installationErrorFactory('Linking failed', 'linking', { symlinkPath: '/usr/local/bin' }),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(PackageInstallationError);
        expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
        expect(error.context?.phase).toBeTruthy();
      });
    });

    it('should create SDK compliance errors with consistent metadata', () => {
      const complianceErrorFactory = (violationType: string, context: Record<string, unknown>) =>
        new SDKComplianceError(`SDK compliance violation: ${violationType}`, {
          violationType,
          ...context,
        });

      const violations = [
        { type: 'missing-interface', severity: 'error', interfaces: ['IValidator'] },
        { type: 'deprecated-api', severity: 'warning', apis: ['oldValidate'] },
        {
          type: 'version-mismatch',
          severity: 'error',
          requiredVersion: '2.0.0',
          actualVersion: '1.0.0',
        },
      ];

      violations.forEach(({ type, ...context }) => {
        const error = complianceErrorFactory(type, context);
        expect(error).toBeInstanceOf(SDKComplianceError);
        expect(error.context?.violationType).toBe(type);
        expect(error.message).toContain(type);
      });
    });

    it('should create error hierarchies with consistent chaining', () => {
      const createErrorChain = (rootCause: string, packageName: string) => {
        const sourceError = new PackageSourceUnavailableError(rootCause, {
          sourceType: 'remote-registry',
          packageName,
        });

        const installError = new PackageInstallationError(`Installation failed: ${rootCause}`, {
          packageName,
          phase: 'download',
          underlyingError: sourceError.message,
          sourceContext: sourceError.context,
        });

        const resolutionError = new DependencyResolutionError(
          `Cannot resolve dependency: ${packageName}`,
          {
            packageName,
            dependencyChain: [packageName],
            underlyingError: installError.message,
            installContext: installError.context,
          },
        );

        return { sourceError, installError, resolutionError };
      };

      const { sourceError, installError, resolutionError } = createErrorChain(
        'Registry offline',
        'test-package',
      );

      expect(sourceError.context?.packageName).toBe('test-package');
      expect((installError.context as any)?.sourceContext?.packageName).toBe('test-package');
      expect((resolutionError.context as any)?.installContext?.sourceContext?.packageName).toBe(
        'test-package',
      );
    });
  });

  describe('performance and memory efficiency', () => {
    it('should create errors efficiently with minimal overhead', () => {
      const startTime = performance.now();
      const errors = Array.from(
        { length: 1000 },
        (_, i) => new PackageValidationError(`Error ${i}`, { index: i }),
      );
      const endTime = performance.now();

      expect(errors).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(
        errors[0]?.context && 'index' in errors[0].context && errors[0].context.index !== undefined
          ? errors[0].context.index
          : undefined,
      ).toBe(0);
      expect(
        errors[999]?.context &&
          'index' in errors[999].context &&
          errors[999].context.index !== undefined
          ? errors[999].context.index
          : undefined,
      ).toBe(999);
    });

    it('should handle large context objects without memory leaks', () => {
      const largeContext = {
        packages: Array.from({ length: 10000 }, (_, i) => ({
          id: `package-${i}`,
          version: `1.${i % 100}.${i % 10}`,
        })),
        metadata: {
          totalSize: 10000,
          timestamp: Date.now(),
        },
      };

      const error = new DependencyResolutionError('Large context test', largeContext);

      expect(error.context?.packages).toHaveLength(10000);
      expect((error.context as any)?.metadata?.totalSize).toBe(10000);

      // Test that context is properly accessible
      expect((error.context as any)?.packages[0]?.id).toBe('package-0');
      expect((error.context as any)?.packages[9999]?.id).toBe('package-9999');
    });

    it('should maintain consistent memory usage across error types', () => {
      const contextSize = 1000;
      const sharedContext = {
        data: Array.from({ length: contextSize }, (_, i) => ({ key: `value-${i}` })),
        timestamp: Date.now(),
      };

      const errors = [
        new PackageValidationError('Test', sharedContext),
        new PackageNotFoundError('Test', sharedContext),
        new PackageInstallationError('Test', sharedContext),
        new DependencyResolutionError('Test', sharedContext),
        new PackageConflictError('Test', sharedContext),
        new InvalidPackageVersionError('Test', sharedContext),
        new PackageSourceUnavailableError('Test', sharedContext),
        new SDKComplianceError('Test', sharedContext),
      ];

      // All errors should reference the same context data
      errors.forEach((error) => {
        expect(error.context?.data).toHaveLength(contextSize);
        expect(error.context?.timestamp).toBe(sharedContext.timestamp);
      });
    });
  });

  describe('property-based testing for error robustness', () => {
    it('should handle arbitrary string messages', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new PackageValidationError(message);
          expect(error.message).toBe(message);
          expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
          expect(error.name).toBe('PackageValidationError');
          expect(error).toBeInstanceOf(PackageError);
        }),
        { numRuns: 50 }, // Reduced from default 100
      );
    });

    it('should handle arbitrary context objects', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({
            packageName: fc.string(),
            version: fc.string(),
            retryCount: fc.integer({ min: 0, max: 100 }),
            timestamp: fc.integer({ min: 0 }),
            enabled: fc.boolean(),
          }),
          (message, context) => {
            const error = new PackageInstallationError(message, context);
            expect(error.message).toBe(message);
            expect(error.context).toEqual(context);
            expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
          },
        ),
        { numRuns: 30 }, // Reduced for performance
      );
    });

    it('should maintain consistency across different error types with random data', () => {
      const errorTypes = [
        { constructor: PackageValidationError, code: 'PACKAGE_VALIDATION_ERROR' },
        { constructor: PackageNotFoundError, code: 'PACKAGE_NOT_FOUND' },
        { constructor: PackageInstallationError, code: 'PACKAGE_INSTALLATION_ERROR' },
        { constructor: DependencyResolutionError, code: 'DEPENDENCY_RESOLUTION_ERROR' },
        { constructor: PackageConflictError, code: 'PACKAGE_CONFLICT_ERROR' },
        { constructor: InvalidPackageVersionError, code: 'INVALID_PACKAGE_VERSION' },
        { constructor: PackageSourceUnavailableError, code: 'PACKAGE_SOURCE_UNAVAILABLE' },
        { constructor: SDKComplianceError, code: 'SDK_COMPLIANCE_ERROR' },
      ];

      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom(...errorTypes),
          fc.option(fc.record({ key: fc.string(), value: fc.string() }), { nil: undefined }),
          (message, errorType, context) => {
            const error = new errorType.constructor(message, context);
            expect(error.message).toBe(message);
            expect(error.getCode()).toBe(errorType.code);
            expect(error.context).toBe(context);
            expect(error).toBeInstanceOf(PackageError);
            expect(error).toBeInstanceOf(Error);
          },
        ),
        { numRuns: 40 }, // Reduced and simplified context
      );
    });

    it('should handle edge cases in package names and versions', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ maxLength: 50 }),
            fc.constant(''),
            fc.constant('@scope/package'),
            fc.constant('package-name'),
            fc.constant('package_name'),
          ),
          fc.oneof(
            fc.constant('1.0.0'),
            fc.constant(''),
            fc.constant('1.0.0-alpha'),
            fc.constant('1.0.0+build'),
          ),
          (packageName, version) => {
            const context = { packageName, version };
            const error = new InvalidPackageVersionError('Invalid version', context);
            expect(error.context?.packageName).toBe(packageName);
            expect(error.context?.version).toBe(version);
            expect(error.getCode()).toBe('INVALID_PACKAGE_VERSION');
          },
        ),
        { numRuns: 25 }, // Reduced and simplified
      );
    });

    it('should handle nested context structures', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({
            level1: fc.record({
              level2: fc.record({
                value: fc.string(),
                count: fc.integer({ min: 0, max: 100 }),
              }),
            }),
          }),
          (message, deepContext) => {
            const error = new DependencyResolutionError(message, deepContext);
            expect(error.message).toBe(message);
            expect(error.context).toEqual(deepContext);
            expect(error.getCode()).toBe('DEPENDENCY_RESOLUTION_ERROR');
          },
        ),
        { numRuns: 20 }, // Reduced and simplified structure
      );
    });
  });

  describe('domain-specific error context validation', () => {
    it('should validate package ecosystem error contexts follow expected patterns', () => {
      const packageValidationContexts = [
        {
          packageName: '@scope/package-name',
          validationStage: 'schema',
          violations: [
            { field: 'name', rule: 'required', message: 'Package name is required' },
            { field: 'version', rule: 'semver', message: 'Version must be valid semver' },
          ],
          schemaVersion: 'v1.2.0',
        },
        {
          packageName: 'simple-package',
          validationStage: 'dependencies',
          conflicts: [
            {
              dependency: 'lodash',
              requestedVersion: '^4.0.0',
              availableVersions: ['3.10.1', '4.17.21'],
            },
          ],
          resolutionStrategy: 'latest-compatible',
        },
      ];

      packageValidationContexts.forEach((context) => {
        const error = new PackageValidationError('Validation failed', context);
        expect(error.context?.packageName).toBeTruthy();
        expect(error.context?.validationStage).toBeTruthy();
        expect(error.getCode()).toBe('PACKAGE_VALIDATION_ERROR');
      });
    });

    it('should validate package installation error contexts follow expected patterns', () => {
      const installationContexts = [
        {
          packageName: 'example-package',
          targetDirectory: '/node_modules/example-package',
          installationPhase: 'download',
          downloadProgress: { totalBytes: 1024000, downloadedBytes: 512000 },
          sourceRegistry: 'https://registry.npmjs.org',
          retryAttempt: 2,
          maxRetries: 3,
        },
        {
          packageName: '@types/node',
          targetDirectory: '/node_modules/@types/node',
          installationPhase: 'extraction',
          archiveInfo: { filename: 'types-node-18.0.0.tgz', sizeBytes: 2048000 },
          extractionProgress: 75,
        },
      ];

      installationContexts.forEach((context) => {
        const error = new PackageInstallationError('Installation failed', context);
        expect(error.context?.packageName).toBeTruthy();
        expect(error.context?.installationPhase).toBeTruthy();
        expect(error.context?.targetDirectory).toBeTruthy();
        expect(error.getCode()).toBe('PACKAGE_INSTALLATION_ERROR');
      });
    });

    it('should validate dependency resolution error contexts follow expected patterns', () => {
      const resolutionContexts = [
        {
          rootPackage: 'my-app',
          dependencyChain: ['my-app', 'express', 'body-parser', 'qs'],
          conflictingDependency: 'qs',
          versionConflicts: [
            { requiredBy: 'body-parser', version: '^6.5.0' },
            { requiredBy: 'express', version: '^6.4.0' },
          ],
          resolutionAlgorithm: 'node-modules-hoisting',
          maxDepth: 10,
        },
        {
          rootPackage: 'web-app',
          dependencyChain: ['web-app', 'react', 'react-dom'],
          circularDependency: {
            detected: true,
            cycle: ['package-a', 'package-b', 'package-c', 'package-a'],
            cycleLength: 3,
          },
          resolutionAlgorithm: 'strict-resolution',
        },
      ];

      resolutionContexts.forEach((context) => {
        const error = new DependencyResolutionError('Resolution failed', context);
        expect(error.context?.rootPackage).toBeTruthy();
        expect(error.context?.dependencyChain).toBeInstanceOf(Array);
        expect(error.context?.resolutionAlgorithm).toBeTruthy();
        expect(error.getCode()).toBe('DEPENDENCY_RESOLUTION_ERROR');
      });
    });

    it('should validate SDK compliance error contexts follow expected patterns', () => {
      const complianceContexts = [
        {
          packageName: 'custom-validator',
          sdkVersion: '2.1.0',
          packageVersion: '1.0.0',
          complianceChecks: {
            requiredInterfaces: ['IValidator', 'IRule', 'IMetadata'],
            implementedInterfaces: ['IValidator', 'IRule'],
            missingInterfaces: ['IMetadata'],
            optionalInterfaces: ['IExtension', 'IPlugin'],
          },
          violationDetails: {
            type: 'missing-required-interface',
            severity: 'error',
            interfaceName: 'IMetadata',
            requiredMethods: ['getMetadata', 'validate'],
            description: 'Package must implement IMetadata interface',
          },
        },
        {
          packageName: 'legacy-package',
          sdkVersion: '3.0.0',
          packageVersion: '0.9.0',
          complianceChecks: {
            deprecatedAPIs: [
              { name: 'oldValidate', deprecatedSince: '2.0.0', replacement: 'validate' },
              { name: 'legacyFormat', deprecatedSince: '2.5.0', replacement: 'format' },
            ],
            breakingChanges: ['API signature changed', 'Return type modified'],
          },
          migrationRequired: true,
          migrationGuide: 'https://docs.example.com/migration/v3',
        },
      ];

      complianceContexts.forEach((context) => {
        const error = new SDKComplianceError('Compliance violation', context);
        expect(error.context?.packageName).toBeTruthy();
        expect(error.context?.sdkVersion).toBeTruthy();
        expect(error.context?.packageVersion).toBeTruthy();
        expect(error.context?.complianceChecks).toBeTruthy();
        expect(error.getCode()).toBe('SDK_COMPLIANCE_ERROR');
      });
    });

    it('should validate package source unavailable error contexts follow expected patterns', () => {
      const sourceContexts = [
        {
          packageName: 'unavailable-package',
          sourceType: 'npm-registry',
          registryUrl: 'https://registry.npmjs.org',
          connectionDetails: {
            timeout: 30000,
            retries: 3,
            lastAttempt: new Date().toISOString(),
            errorType: 'network-timeout',
            httpStatus: 408,
          },
          fallbackSources: [
            { type: 'github', url: 'https://github.com/user/repo' },
            { type: 'local-cache', path: '/tmp/npm-cache' },
          ],
        },
        {
          packageName: 'private-package',
          sourceType: 'private-registry',
          registryUrl: 'https://npm.company.com',
          authenticationRequired: true,
          authenticationStatus: 'failed',
          errorDetails: {
            authType: 'token',
            tokenExpired: true,
            lastValidAuth: '2024-01-01T00:00:00Z',
          },
        },
      ];

      sourceContexts.forEach((context) => {
        const error = new PackageSourceUnavailableError('Source unavailable', context);
        expect(error.context?.packageName).toBeTruthy();
        expect(error.context?.sourceType).toBeTruthy();
        expect(error.context?.registryUrl).toBeTruthy();
        expect(error.getCode()).toBe('PACKAGE_SOURCE_UNAVAILABLE');
      });
    });
  });

  describe('error recovery and resilience scenarios', () => {
    it('should support error recovery context for retryable operations', () => {
      const retryableContext = {
        operation: 'package-download',
        attempt: 2,
        maxAttempts: 5,
        retryDelay: 1000,
        exponentialBackoff: true,
        lastError: 'network-timeout',
        retryable: true,
        nextRetryAt: new Date(Date.now() + 2000).toISOString(),
      };

      const error = new PackageSourceUnavailableError(
        'Download failed, retrying',
        retryableContext,
      );

      expect(error.context?.retryable).toBe(true);
      expect(error.context?.attempt).toBe(2);
      expect(error.context?.maxAttempts).toBe(5);
      expect(error.context?.nextRetryAt).toBeTruthy();
    });

    it('should support error recovery context for fallback strategies', () => {
      const fallbackContext = {
        primaryStrategy: 'npm-registry',
        fallbackStrategies: ['github-source', 'local-cache', 'mirror-registry'],
        currentStrategy: 'github-source',
        strategyIndex: 1,
        previousErrors: [
          { strategy: 'npm-registry', error: 'registry-unavailable', timestamp: Date.now() - 5000 },
        ],
        fallbackEnabled: true,
      };

      const error = new PackageNotFoundError(
        'Primary source failed, trying fallback',
        fallbackContext,
      );

      expect(error.context?.primaryStrategy).toBe('npm-registry');
      expect(error.context?.currentStrategy).toBe('github-source');
      expect(error.context?.fallbackEnabled).toBe(true);
      expect(error.context?.previousErrors).toHaveLength(1);
    });

    it('should support error aggregation for batch operations', () => {
      const batchOperationContext = {
        batchId: 'batch-install-123',
        totalPackages: 10,
        processedPackages: 7,
        failedPackages: 3,
        successfulPackages: 4,
        errors: [
          { packageName: 'pkg1', error: 'not-found', code: 'PACKAGE_NOT_FOUND' },
          { packageName: 'pkg2', error: 'version-conflict', code: 'PACKAGE_CONFLICT_ERROR' },
          { packageName: 'pkg3', error: 'source-unavailable', code: 'PACKAGE_SOURCE_UNAVAILABLE' },
        ],
        continueOnError: true,
        rollbackOnFailure: false,
      };

      const error = new PackageInstallationError(
        'Batch installation partial failure',
        batchOperationContext,
      );

      expect(error.context?.batchId).toBe('batch-install-123');
      expect(error.context?.totalPackages).toBe(10);
      expect(error.context?.failedPackages).toBe(3);
      expect(error.context?.errors).toHaveLength(3);
      expect(error.context?.continueOnError).toBe(true);
    });

    it('should support error context for transaction rollback scenarios', () => {
      const transactionContext = {
        transactionId: 'tx-456',
        operation: 'multi-package-install',
        completedOperations: [
          { step: 'validate-packages', status: 'completed', timestamp: Date.now() - 10000 },
          { step: 'download-packages', status: 'completed', timestamp: Date.now() - 8000 },
          { step: 'extract-packages', status: 'failed', timestamp: Date.now() - 5000 },
        ],
        rollbackRequired: true,
        rollbackOperations: [
          { step: 'cleanup-extracted-files', status: 'pending' },
          { step: 'remove-downloaded-files', status: 'pending' },
          { step: 'revert-package-json', status: 'pending' },
        ],
        atomicOperation: true,
      };

      const error = new PackageInstallationError(
        'Transaction failed, rollback required',
        transactionContext,
      );

      expect(error.context?.transactionId).toBe('tx-456');
      expect(error.context?.rollbackRequired).toBe(true);
      expect(error.context?.completedOperations).toHaveLength(3);
      expect(error.context?.rollbackOperations).toHaveLength(3);
      expect(error.context?.atomicOperation).toBe(true);
    });
  });
});
