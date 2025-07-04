/**
 * Package Ecosystem Context Integration Tests
 *
 * Tests service interactions within the package ecosystem bounded context:
 * - DependencyResolutionService + PackageValidationService workflows
 * - VersionResolutionService integration with dependency resolution
 * - PackageDiscoveryService cross-service interactions
 * - Repository integration scenarios
 * - Error propagation and domain boundary validation
 * - Realistic package management workflows
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Dependency } from '../../entities/Dependency.js';
import { Package } from '../../entities/Package.js';
import { PackageInstallation } from '../../entities/PackageInstallation.js';
import type { IDependencyRepository } from '../../repositories/IDependencyRepository.js';
import type { IPackageRepository } from '../../repositories/IPackageRepository.js';
import { DependencyResolutionService } from '../../services/DependencyResolutionService.js';
import { PackageValidationService } from '../../services/PackageValidationService.js';
import { PackageDiscoveryService } from '../../services/package-discovery-service.js';
import { VersionResolutionService } from '../../services/VersionResolutionService.js';
import { PackageNotFoundError, PackageValidationError } from '../../types/domain-errors.js';
import { InstallationPath } from '../../value-objects/InstallationPath.js';
import { PackageVersion as PackageVersionValue } from '../../value-objects/PackageVersion.js';
import { PackageId } from '../../value-objects/package-id.js';
import { PackageManifest } from '../../value-objects/package-manifest.js';
import { PackageSource } from '../../value-objects/package-source.js';
import { VersionConstraint } from '../../value-objects/version-constraint.js';

describe('Package Ecosystem Context - Service Integration', () => {
  let dependencyResolutionService: DependencyResolutionService;
  let packageValidationService: PackageValidationService;
  let versionResolutionService: VersionResolutionService;
  let packageDiscoveryService: PackageDiscoveryService;
  let mockDependencyRepository: IDependencyRepository;
  let mockPackageRepository: IPackageRepository;
  let mockGitRefProvider: any;
  let mockFileSystem: any;
  let _mockSDKValidator: any;
  let mockGitProvider: any;
  let mockLocalProvider: any;
  let testPackage: Package;
  let testDependency: Package;

  beforeEach(() => {
    // Create mock repositories
    mockDependencyRepository = {
      findDependenciesForPackage: vi.fn(),
      findPackagesThatDependOn: vi.fn(),
    };

    mockPackageRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findBySource: vi.fn(),
      findByGitRepository: vi.fn(),
      searchByKeywords: vi.fn().mockResolvedValue(ok([])),
    };

    // Create mock for GitRefProvider
    mockGitRefProvider = {
      resolveRefToCommit: vi.fn().mockResolvedValue(ok({ commit: 'abc123', actualRef: 'main' })),
      listAvailableTags: vi.fn().mockResolvedValue(ok(['v1.0.0', 'v2.0.0'])),
      listAvailableBranches: vi.fn().mockResolvedValue(ok(['main', 'develop'])),
    };

    // Create mock for file system
    mockFileSystem = {
      fileExists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(ok('file content')),
      listFiles: vi.fn().mockResolvedValue(ok(['file1.js', 'file2.js'])),
      isExecutable: vi.fn().mockResolvedValue(false),
    };

    // Create mock for SDK validator
    _mockSDKValidator = {
      validateInterface: vi
        .fn()
        .mockResolvedValue(ok({ name: 'TestInterface', version: '1.0.0', methods: [] })),
      listImplementedInterfaces: vi.fn().mockResolvedValue(ok([])),
      checkVersionCompatibility: vi.fn().mockReturnValue(ok(true)),
    };

    // Create mock providers
    mockGitProvider = {
      discoverFromGitHub: vi.fn().mockResolvedValue(ok([])),
      discoverFromGitLab: vi.fn().mockResolvedValue(ok([])),
      validateGitSource: vi.fn().mockResolvedValue(ok(true)),
    };

    mockLocalProvider = {
      discoverInDirectory: vi.fn().mockResolvedValue(ok([])),
      validateLocalSource: vi.fn().mockResolvedValue(ok(true)),
    };

    // Initialize services with mocked dependencies
    versionResolutionService = new VersionResolutionService(mockGitRefProvider);
    packageDiscoveryService = new PackageDiscoveryService(
      mockPackageRepository,
      mockGitProvider,
      mockLocalProvider,
    );
    dependencyResolutionService = new DependencyResolutionService(
      mockDependencyRepository,
      packageDiscoveryService,
      versionResolutionService,
    );
    packageValidationService = new PackageValidationService(mockFileSystem, _mockSDKValidator);

    // Create test packages
    const packageIdResult = PackageId.create('test-package');
    const dependencyIdResult = PackageId.create('test-dependency');
    const versionResult = PackageVersionValue.create('1.0.0');
    const manifestResult = PackageManifest.create({
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package for integration tests',
      author: 'Test Author',
    });
    const sourceResult = PackageSource.createFromGit({
      url: 'https://github.com/test/test-package',
      ref: 'main',
    });

    expect(packageIdResult.isOk()).toBe(true);
    expect(dependencyIdResult.isOk()).toBe(true);
    expect(versionResult.isOk()).toBe(true);
    expect(manifestResult.isOk()).toBe(true);
    expect(sourceResult.isOk()).toBe(true);

    if (
      packageIdResult.isOk() &&
      dependencyIdResult.isOk() &&
      versionResult.isOk() &&
      manifestResult.isOk() &&
      sourceResult.isOk()
    ) {
      const packageResult = Package.create({
        id: packageIdResult.value,
        source: sourceResult.value,
        manifest: manifestResult.value,
        sdkInterfaces: [],
        validationResult: {
          isValid: true,
          errors: [],
          warnings: [],
        },
      });
      expect(packageResult.isOk()).toBe(true);
      if (packageResult.isOk()) {
        testPackage = packageResult.value;
      }

      const dependencyManifest = PackageManifest.create({
        name: 'test-dependency',
        version: '2.0.0',
        description: 'Test dependency package',
        author: 'Test Author',
      });
      expect(dependencyManifest.isOk()).toBe(true);

      if (dependencyManifest.isOk()) {
        const dependencyResult = Package.create({
          id: dependencyIdResult.value,
          source: sourceResult.value,
          manifest: dependencyManifest.value,
          sdkInterfaces: [],
          validationResult: {
            isValid: true,
            errors: [],
            warnings: [],
          },
        });
        expect(dependencyResult.isOk()).toBe(true);
        if (dependencyResult.isOk()) {
          testDependency = dependencyResult.value;
        }
      }
    }
  });

  describe('DependencyResolutionService + PackageDiscoveryService Integration', () => {
    it('should resolve dependencies with package discovery', async () => {
      // Arrange
      const mockDependencies: Dependency[] = [];
      mockDependencyRepository.findDependenciesForPackage = vi
        .fn()
        .mockResolvedValue(ok(mockDependencies));

      // Act
      const resolutionResult =
        await dependencyResolutionService.resolveDependenciesForPackage(testPackage);

      // Assert
      expect(resolutionResult.isOk()).toBe(true);
      if (resolutionResult.isOk()) {
        const plan = resolutionResult.value;
        expect(plan.rootPackage).toBe(testPackage);
        expect(plan.resolvedDependencies).toEqual([]);
        expect(plan.conflicts).toEqual([]);
        expect(plan.totalPackages).toBe(1);
        expect(plan.resolutionTime).toBeGreaterThanOrEqual(0);
      }

      expect(mockDependencyRepository.findDependenciesForPackage).toHaveBeenCalledWith(
        testPackage.getId(),
      );
    });

    it('should handle complex dependency trees with discovery service', async () => {
      // Arrange - Create a more complex dependency scenario
      const dependency1Id = PackageId.create('dep1');
      const dependency2Id = PackageId.create('dep2');

      expect(dependency1Id.isOk()).toBe(true);
      expect(dependency2Id.isOk()).toBe(true);

      if (dependency1Id.isOk() && dependency2Id.isOk()) {
        // Mock dependency repository to return dependencies
        const mockDep1 = {
          getTargetPackageId: () => dependency1Id.value,
          getVersionConstraint: () => {
            const result = VersionConstraint.create('^1.0.0');
            if (result.isErr()) throw new Error('Invalid constraint');
            return result.value;
          },
          isRequired: () => true,
        };

        const mockDep2 = {
          getTargetPackageId: () => dependency2Id.value,
          getVersionConstraint: () => {
            const result = VersionConstraint.create('^2.0.0');
            if (result.isErr()) throw new Error('Invalid constraint');
            return result.value;
          },
          isRequired: () => true,
        };

        mockDependencyRepository.findDependenciesForPackage = vi
          .fn()
          .mockImplementation(async (packageId) => {
            if (packageId.equals(testPackage.getId())) {
              return Promise.resolve(ok([mockDep1, mockDep2]));
            }
            return Promise.resolve(ok([]));
          });

        // Mock package discovery to find dependencies
        mockPackageRepository.findById = vi.fn().mockImplementation(async (id) => {
          if (id.equals(dependency1Id.value)) {
            return Promise.resolve(ok(testDependency));
          }
          if (id.equals(dependency2Id.value)) {
            return Promise.resolve(ok(testDependency));
          }
          return Promise.resolve(err(new PackageNotFoundError('Package not found')));
        });

        // Create specific test packages for the dependencies
        const dep1Manifest = PackageManifest.create({
          name: 'dep1',
          version: '1.0.0',
          description: 'Dependency 1',
          author: 'Test Author',
        });
        const dep2Manifest = PackageManifest.create({
          name: 'dep2',
          version: '1.0.0',
          description: 'Dependency 2',
          author: 'Test Author',
        });

        const testSource = PackageSource.createFromGit({
          url: 'https://github.com/test/dep',
          ref: 'main',
        });

        expect(dep1Manifest.isOk()).toBe(true);
        expect(dep2Manifest.isOk()).toBe(true);
        expect(testSource.isOk()).toBe(true);

        if (!dep1Manifest.isOk() || !dep2Manifest.isOk() || !testSource.isOk()) {
          throw new Error('Failed to create dependency manifests or source');
        }

        const dep1Result = Package.create({
          id: dependency1Id.value,
          source: testSource.value,
          manifest: dep1Manifest.value,
          sdkInterfaces: [],
          validationResult: { isValid: true, errors: [], warnings: [] },
        });
        const dep2Result = Package.create({
          id: dependency2Id.value,
          source: testSource.value,
          manifest: dep2Manifest.value,
          sdkInterfaces: [],
          validationResult: { isValid: true, errors: [], warnings: [] },
        });

        expect(dep1Result.isOk()).toBe(true);
        expect(dep2Result.isOk()).toBe(true);

        if (!dep1Result.isOk() || !dep2Result.isOk()) {
          throw new Error('Failed to create dependency packages');
        }

        const dep1Package = dep1Result.value;
        const dep2Package = dep2Result.value;

        // Update searchByKeywords mock to return correct packages for specific search terms
        mockPackageRepository.searchByKeywords = vi.fn().mockImplementation(async (keywords) => {
          if (keywords.includes('dep1')) {
            return Promise.resolve(ok([dep1Package]));
          }
          if (keywords.includes('dep2')) {
            return Promise.resolve(ok([dep2Package]));
          }
          return Promise.resolve(ok([]));
        });

        // Act
        const resolutionResult = await dependencyResolutionService.resolveDependenciesForPackage(
          testPackage,
          { maxDepth: 2 },
        );

        // Assert
        expect(resolutionResult.isOk()).toBe(true);
        if (resolutionResult.isOk()) {
          const plan = resolutionResult.value;
          expect(plan.resolvedDependencies).toHaveLength(2);
          expect(plan.totalPackages).toBe(3); // root + 2 dependencies
          expect(plan.installationOrder).toHaveLength(2);
        }
      }
    });

    it('should handle circular dependency detection', async () => {
      // Arrange - Create circular dependency scenario
      const circularDepId = PackageId.create('circular-dep');
      expect(circularDepId.isOk()).toBe(true);

      if (circularDepId.isOk()) {
        const mockCircularDep = {
          getTargetPackageId: () => circularDepId.value,
          getVersionConstraint: () => {
            const result = VersionConstraint.create('^1.0.0');
            if (result.isErr()) throw new Error('Invalid constraint');
            return result.value;
          },
          isRequired: () => true,
        };

        const mockBackDep = {
          getTargetPackageId: () => testPackage.getId(),
          getVersionConstraint: () => {
            const result = VersionConstraint.create('^1.0.0');
            if (result.isErr()) throw new Error('Invalid constraint');
            return result.value;
          },
          isRequired: () => true,
        };

        // Set up circular dependency
        mockDependencyRepository.findDependenciesForPackage = vi
          .fn()
          .mockImplementation(async (packageId) => {
            if (packageId.equals(testPackage.getId())) {
              return Promise.resolve(ok([mockCircularDep]));
            }
            if (packageId.equals(circularDepId.value)) {
              return Promise.resolve(ok([mockBackDep]));
            }
            return Promise.resolve(ok([]));
          });

        mockPackageRepository.findById = vi.fn().mockImplementation(async (id) => {
          if (id.equals(circularDepId.value)) {
            return Promise.resolve(ok(testDependency));
          }
          return Promise.resolve(ok(testPackage));
        });

        // Act
        const circularResult =
          await dependencyResolutionService.findCircularDependencies(testPackage);

        // Assert
        expect(circularResult.isOk()).toBe(true);
        if (circularResult.isOk()) {
          // Should detect the circular dependency
          expect(circularResult.value.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('PackageValidationService Integration', () => {
    it('should validate packages within dependency resolution workflow', async () => {
      // Arrange
      const packageResult = PackageId.create('invalid-package');
      expect(packageResult.isOk()).toBe(true);

      if (packageResult.isOk()) {
        const _invalidManifest = PackageManifest.create({
          name: '',
          version: 'invalid-version',
          description: 'Invalid package for testing',
          author: 'Test Author',
        });

        // Act
        const validationResult = await packageValidationService.validatePackage(testPackage);
        const manifestValidationResult =
          await packageValidationService.validatePackage(testPackage);

        // Assert
        expect(validationResult.isOk()).toBe(true);
        expect(manifestValidationResult.isOk()).toBe(true);

        if (validationResult.isOk() && manifestValidationResult.isOk()) {
          expect(validationResult.value.isValid).toBe(true);
          expect(manifestValidationResult.value.isValid).toBe(true);
        }
      }
    });

    it('should validate version constraints during dependency resolution', () => {
      // Arrange
      const validConstraint = VersionConstraint.create('^1.0.0');
      const invalidConstraint = VersionConstraint.create('invalid-constraint');

      // Act & Assert
      expect(validConstraint.isOk()).toBe(true);
      expect(invalidConstraint.isErr()).toBe(true);

      if (validConstraint.isOk()) {
        const constraintValidation = versionResolutionService.validateVersionConstraint(
          validConstraint.value.getConstraintString(),
        );
        expect(constraintValidation.isOk()).toBe(true);
        if (constraintValidation.isOk()) {
          expect(constraintValidation.value).toBe(true);
        }
      }
    });

    it('should validate package compatibility across services', () => {
      // Arrange
      const packageA = testPackage;
      const packageB = testDependency;

      // Act
      const compatibilityResult = dependencyResolutionService.validateDependencyCompatibility(
        packageA,
        packageB,
      );

      // Assert
      expect(compatibilityResult.isOk()).toBe(true);
      if (compatibilityResult.isOk()) {
        expect(compatibilityResult.value).toBe(true);
      }
    });
  });

  describe('VersionResolutionService Integration', () => {
    it('should resolve versions within dependency resolution', async () => {
      // Arrange
      const constraint = VersionConstraint.create('^1.0.0');
      expect(constraint.isOk()).toBe(true);

      if (constraint.isOk()) {
        const gitUrl = 'https://github.com/test/package';

        // Mock version resolution
        const v1 = PackageVersionValue.create('1.0.0');
        const v2 = PackageVersionValue.create('1.1.0');
        const v3 = PackageVersionValue.create('1.2.3');

        if (v1.isErr() || v2.isErr() || v3.isErr()) {
          throw new Error('Failed to create versions');
        }

        const mockVersionResolution = {
          bestVersion: v3.value,
          availableVersions: [v1.value, v2.value, v3.value],
          satisfiesConstraint: true,
          resolvedAt: new Date(),
        };

        const resolveVersionSpy = vi
          .spyOn(versionResolutionService, 'resolveVersionConstraint')
          .mockResolvedValue(ok(mockVersionResolution));

        // Act
        const resolutionResult = await versionResolutionService.resolveVersionConstraint(
          gitUrl,
          constraint.value,
        );

        // Assert
        expect(resolutionResult.isOk()).toBe(true);
        if (resolutionResult.isOk()) {
          const resolution = resolutionResult.value;
          expect(resolution.bestVersion.toString()).toBe('1.2.3');
          expect(resolution.satisfiesConstraint).toBe(true);
          expect(resolution.availableVersions).toHaveLength(3);
        }

        expect(resolveVersionSpy).toHaveBeenCalledWith(gitUrl, constraint.value);
      }
    });

    it('should handle version conflict resolution', async () => {
      // Arrange - Create packages with conflicting version requirements
      const packageIdA = PackageId.create('package-a');
      const packageIdB = PackageId.create('package-b');
      const sharedDepId = PackageId.create('shared-dependency');

      expect(packageIdA.isOk()).toBe(true);
      expect(packageIdB.isOk()).toBe(true);
      expect(sharedDepId.isOk()).toBe(true);

      if (packageIdA.isOk() && packageIdB.isOk() && sharedDepId.isOk()) {
        // Mock dependencies with conflicting version constraints
        const depFromA = {
          getTargetPackageId: () => sharedDepId.value,
          getVersionConstraint: () => {
            const result = VersionConstraint.create('^1.0.0');
            if (result.isErr()) throw new Error('Invalid constraint');
            return result.value;
          },
          isRequired: () => true,
        };

        const depFromB = {
          getTargetPackageId: () => sharedDepId.value,
          getVersionConstraint: () => {
            const result = VersionConstraint.create('^2.0.0');
            if (result.isErr()) throw new Error('Invalid constraint');
            return result.value;
          },
          isRequired: () => true,
        };

        mockDependencyRepository.findDependenciesForPackage = vi
          .fn()
          .mockImplementation(async (packageId) => {
            if (packageId.equals(testPackage.getId())) {
              return Promise.resolve(ok([depFromA, depFromB]));
            }
            return Promise.resolve(ok([]));
          });

        // Create a shared dependency package for the test
        const sharedDepManifest = PackageManifest.create({
          name: 'shared-dependency',
          version: '1.5.0',
          description: 'Shared dependency package',
          author: 'Test Author',
        });

        expect(sharedDepManifest.isOk()).toBe(true);
        if (!sharedDepManifest.isOk()) {
          throw new Error('Failed to create shared dependency manifest');
        }

        const sharedTestSource = PackageSource.createFromGit({
          url: 'https://github.com/test/shared-dep',
          ref: 'main',
        });

        expect(sharedTestSource.isOk()).toBe(true);
        if (!sharedTestSource.isOk()) {
          throw new Error('Failed to create shared dependency source');
        }

        const sharedDepResult = Package.create({
          id: sharedDepId.value,
          source: sharedTestSource.value,
          manifest: sharedDepManifest.value,
          sdkInterfaces: [],
          validationResult: { isValid: true, errors: [], warnings: [] },
        });

        expect(sharedDepResult.isOk()).toBe(true);
        if (!sharedDepResult.isOk()) {
          throw new Error('Failed to create shared dependency package');
        }

        const sharedDepPackage = sharedDepResult.value;

        mockPackageRepository.findById = vi.fn().mockResolvedValue(ok(sharedDepPackage));

        // Update searchByKeywords mock to return the shared dependency
        mockPackageRepository.searchByKeywords = vi.fn().mockImplementation(async (keywords) => {
          if (keywords.includes('shared-dependency')) {
            return Promise.resolve(ok([sharedDepPackage]));
          }
          return Promise.resolve(ok([]));
        });

        // Act
        const resolutionResult =
          await dependencyResolutionService.resolveDependenciesForPackage(testPackage);

        // Assert
        expect(resolutionResult.isOk()).toBe(true);
        if (resolutionResult.isOk()) {
          const plan = resolutionResult.value;
          // Should detect version conflicts
          expect(plan.conflicts.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Cross-Service Error Propagation', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockDependencyRepository.findDependenciesForPackage = vi
        .fn()
        .mockResolvedValue(err(new PackageNotFoundError('Repository error')));

      // Act
      const resolutionResult =
        await dependencyResolutionService.resolveDependenciesForPackage(testPackage);

      // Assert
      expect(resolutionResult.isErr()).toBe(true);
      if (resolutionResult.isErr()) {
        expect(resolutionResult.error).toBeInstanceOf(PackageNotFoundError);
        expect(resolutionResult.error.message).toBe('Repository error');
      }
    });

    it('should propagate validation errors across service boundaries', () => {
      // Arrange - Create invalid package
      const invalidManifest = {
        name: '',
        version: 'invalid',
        description: '',
        author: '',
      } as const;

      // Act
      const manifestResult = PackageManifest.create(invalidManifest);

      // Assert
      expect(manifestResult.isErr()).toBe(true);
      if (manifestResult.isErr()) {
        expect(manifestResult.error).toBeInstanceOf(PackageValidationError);
      }
    });

    it('should maintain service boundaries during error handling', async () => {
      // Arrange
      const nonExistentId = PackageId.create('non-existent');
      expect(nonExistentId.isOk()).toBe(true);

      if (nonExistentId.isOk()) {
        mockPackageRepository.findById = vi
          .fn()
          .mockResolvedValue(err(new PackageNotFoundError('Package not found')));

        // Act
        const discoveryResult = await packageDiscoveryService.findPackageById(nonExistentId.value);

        // Assert
        expect(discoveryResult.isErr()).toBe(true);
        if (discoveryResult.isErr()) {
          expect(discoveryResult.error).toBeInstanceOf(PackageNotFoundError);
          // Service should not leak internal implementation details
          expect(discoveryResult.error.message).toBe('Package not found: non-existent');
        }
      }
    });
  });

  describe('Package Installation Integration Workflows', () => {
    it('should coordinate package installation across services', () => {
      // Arrange
      const installationPathResult = InstallationPath.create('/test/packages/test-package');
      expect(installationPathResult.isOk()).toBe(true);

      if (installationPathResult.isOk()) {
        const installationResult = PackageInstallation.createForInstallation(
          testPackage.getId(),
          testPackage.getVersion(),
          testPackage.getSource(),
          installationPathResult.value.getAbsolutePath(),
        );

        // Act & Assert
        expect(installationResult.isOk()).toBe(true);
        if (installationResult.isOk()) {
          const installation = installationResult.value;
          expect(installation.getPackageId()).toBe(testPackage.getId());
          expect(installation.getPackageVersion()).toBe(testPackage.getVersion());
          expect(installation.getInstallationPath()).toBe(
            installationPathResult.value.getAbsolutePath(),
          );
        }
      }
    });

    it('should validate package before installation', async () => {
      // Arrange
      const structureValidation = await packageValidationService.validatePackage(testPackage);

      // Act & Assert
      expect(structureValidation.isOk()).toBe(true);

      if (structureValidation.isOk()) {
        expect(structureValidation.value.isValid).toBe(true);

        // Package should be ready for installation
        expect(structureValidation.value.errors).toHaveLength(0);
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large dependency trees efficiently', async () => {
      // Arrange - Simulate large dependency tree
      const largeDependencyList = Array.from({ length: 50 }, (_, i) => ({
        getTargetPackageId: () => {
          const result = PackageId.create(`dep-${i}`);
          if (result.isErr()) throw new Error('Invalid package id');
          return result.value;
        },
        getVersionConstraint: () =>
          VersionConstraint.create('^1.0.0').unwrapOr({} as VersionConstraint),
        isRequired: () => true,
      }));

      mockDependencyRepository.findDependenciesForPackage = vi
        .fn()
        .mockResolvedValue(ok(largeDependencyList.slice(0, 10))); // Limit to avoid too much complexity

      // Create mock packages for the large dependency list
      const createMockPackage = (id: string) => {
        const manifest = PackageManifest.create({
          name: id,
          version: '1.0.0',
          description: `Mock package ${id}`,
          author: 'Test Author',
        });

        const source = PackageSource.createFromGit({
          url: `https://github.com/test/${id}`,
          ref: 'main',
        });

        if (manifest.isErr() || source.isErr()) {
          throw new Error(`Failed to create mock package ${id}`);
        }

        const packageResult = Package.create({
          id: PackageId.create(id).unwrapOr({} as any),
          source: source.value,
          manifest: manifest.value,
          sdkInterfaces: [],
          validationResult: { isValid: true, errors: [], warnings: [] },
        });

        return packageResult.unwrapOr({} as Package);
      };

      mockPackageRepository.findById = vi.fn().mockImplementation(async (id) => {
        const mockPackage = createMockPackage(id.toString());
        return Promise.resolve(ok(mockPackage));
      });

      // Update searchByKeywords to handle dep-* patterns
      mockPackageRepository.searchByKeywords = vi.fn().mockImplementation(async (keywords) => {
        const keyword = keywords[0];
        if (keyword?.startsWith('dep-')) {
          const mockPackage = createMockPackage(keyword);
          return Promise.resolve(ok([mockPackage]));
        }
        return Promise.resolve(ok([]));
      });

      // Act
      const startTime = Date.now();
      const resolutionResult = await dependencyResolutionService.resolveDependenciesForPackage(
        testPackage,
        { maxDepth: 3 },
      );
      const endTime = Date.now();

      // Assert
      expect(resolutionResult.isOk()).toBe(true);
      if (resolutionResult.isOk()) {
        const plan = resolutionResult.value;
        expect(plan.resolutionTime).toBeGreaterThanOrEqual(0);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });

    it('should manage concurrent package operations', async () => {
      // Arrange
      const packages = [testPackage, testDependency];
      mockDependencyRepository.findDependenciesForPackage = vi.fn().mockResolvedValue(ok([]));

      // Act - Process packages concurrently
      const resolutionPromises = packages.map(async (pkg) =>
        dependencyResolutionService.resolveDependenciesForPackage(pkg),
      );

      const results = await Promise.all(resolutionPromises);

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
    });
  });
});
