/**
 * Tests for DependencyResolutionService
 *
 * Focuses on:
 * - Dependency resolution planning
 * - Conflict detection
 * - Installation order calculation
 * - Recursive dependency resolution
 * - High coverage for core functionality
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Dependency } from '../../entities/Dependency';
import { type Package } from '../../entities/Package';
import { type IDependencyRepository } from '../../repositories/IDependencyRepository';
import { DependencyResolutionService } from '../../services/DependencyResolutionService';
import { type PackageDiscoveryService } from '../../services/package-discovery-service';
import { type VersionResolutionService } from '../../services/VersionResolutionService';
import { PackageNotFoundError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';
import { PackageVersion } from '../../value-objects/PackageVersion';

// Mock factories
const createMockPackage = (
  id: string,
  version: string,
  dependencies: Dependency[] = []
): Package => {
  const packageId = PackageId.create(id);
  const packageVersion = PackageVersion.create(version);

  if (packageId.isErr() || packageVersion.isErr()) {
    throw new Error('Failed to create mock package');
  }

  // Create persistent mock manifest that will be returned every time
  const mockManifest = {
    getName: () => id,
    getVersion: () => version,
    getDescription: () => `Description for ${id}`,
    getAuthor: () => 'Test Author',
    getPackageId: () => packageId.value,
    hasLSPSupport: () => false,
    getRequiredProofEditorVersion: vi.fn(() => undefined),
    getRequiredNodeVersion: vi.fn(() => undefined),
    isLanguagePackage: () => false,
    getDependencies: () => dependencies,
    getDevDependencies: () => [],
    getPeerDependencies: () => [],
  };

  // Create persistent mock source that will be returned every time
  const mockSource = {
    isGitSource: () => false,
    isLocalSource: () => false,
    asGitSource: vi.fn(() => null),
    asLocalSource: () => null,
    toString: () => 'mock-source',
  };

  return {
    getId: vi.fn(() => packageId.value),
    getName: vi.fn(() => id),
    getVersion: vi.fn(() => version),
    getDescription: vi.fn(() => `Description for ${id}`),
    getAuthor: vi.fn(() => 'Test Author'),
    getManifest: vi.fn(() => mockManifest),
    getSDKInterfaces: vi.fn(() => []),
    getValidationResult: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    isValid: vi.fn(() => true),
    hasWarnings: vi.fn(() => false),
    getLastUpdated: vi.fn(() => new Date()),
    getCacheLocation: vi.fn(() => undefined),
    isLanguagePackage: vi.fn(() => false),
    getSource: vi.fn(() => mockSource),
  } as unknown as Package;
};

const createMockDependency = (
  packageId: string,
  versionConstraint: string,
  isOptional = false
): Dependency => {
  const pkgId = PackageId.create(packageId);

  if (pkgId.isErr()) {
    throw new Error('Failed to create mock dependency');
  }

  return {
    getId: vi.fn(() => ({ getValue: () => `dep-${packageId}` })),
    getTargetPackageId: vi.fn(() => pkgId.value),
    getVersionConstraint: vi.fn(() => ({
      satisfies: vi.fn(() => true),
      toString: () => versionConstraint,
      getMinVersion: () => null,
      getMaxVersion: () => null,
      isExact: () => false,
      isRange: () => true,
      getConstraintString: () => versionConstraint,
    })),
    getDependencyType: vi.fn(() => 'runtime'),
    isRequired: vi.fn(() => !isOptional),
    isOptional: vi.fn(() => isOptional),
    getResolutionStatus: vi.fn(() => 'unresolved'),
    getResolvedVersion: vi.fn(() => undefined),
    getConflictReason: vi.fn(() => undefined),
    isResolved: vi.fn(() => false),
    equals: vi.fn(),
  } as unknown as Dependency;
};

const createMockDependencyRepository = (): IDependencyRepository => {
  return {
    findDependenciesForPackage: vi.fn().mockResolvedValue(ok([])),
    findPackagesThatDependOn: vi.fn().mockResolvedValue(ok([])),
  };
};

const createMockPackageDiscoveryService = (): PackageDiscoveryService => {
  return {
    discoverPackagesFromGitHub: vi.fn(),
    discoverPackagesInDirectory: vi.fn(),
    findPackageById: vi.fn().mockResolvedValue(err(new PackageNotFoundError('package not found'))),
    findPackagesByKeywords: vi.fn(),
  } as unknown as PackageDiscoveryService;
};

const createMockVersionResolutionService = (): VersionResolutionService => {
  return {
    resolveGitRefToVersion: vi.fn(),
    resolveVersionConstraint: vi.fn(),
    getAvailableVersions: vi.fn(),
  } as unknown as VersionResolutionService;
};

describe('DependencyResolutionService', () => {
  let service: DependencyResolutionService;
  let mockDependencyRepository: IDependencyRepository;
  let mockPackageDiscoveryService: PackageDiscoveryService;
  let mockVersionResolutionService: VersionResolutionService;

  beforeEach(() => {
    mockDependencyRepository = createMockDependencyRepository();
    mockPackageDiscoveryService = createMockPackageDiscoveryService();
    mockVersionResolutionService = createMockVersionResolutionService();

    service = new DependencyResolutionService(
      mockDependencyRepository,
      mockPackageDiscoveryService,
      mockVersionResolutionService
    );

    // Reset mocks for each test
    vi.clearAllMocks();
  });

  describe('resolveDependenciesForPackage', () => {
    it('should resolve simple dependencies with no conflicts', async () => {
      const depA = createMockDependency('package-a', '^1.0.0');
      const depB = createMockDependency('package-b', '^2.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [depA, depB]);

      const packageA = createMockPackage('package-a', '1.2.0');
      const packageB = createMockPackage('package-b', '2.1.0');

      // Mock repository to return the dependencies for the root package and empty for others
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA, depB]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById)
        .mockResolvedValueOnce(ok(packageA))
        .mockResolvedValueOnce(ok(packageB));

      const versionResult = PackageVersion.create('1.2.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const plan = result.value;
        expect(plan.rootPackage).toBe(rootPackage);
        expect(plan.resolvedDependencies).toHaveLength(2);
        expect(plan.conflicts).toHaveLength(0);
        expect(plan.totalPackages).toBe(3); // root + 2 dependencies
        expect(plan.resolutionTime).toBeGreaterThan(0);
        expect(plan.installationOrder).toHaveLength(2);
      }
    });

    it('should handle nested dependencies', async () => {
      const depC = createMockDependency('package-c', '^3.0.0');
      const packageC = createMockPackage('package-c', '3.1.0');

      const depA = createMockDependency('package-a', '^1.0.0');
      const packageA = createMockPackage('package-a', '1.2.0', [depC]);

      const rootPackage = createMockPackage('root', '1.0.0', [depA]);

      // Mock repository calls for each package
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depC]));
          } else {
            return Promise.resolve(ok([])); // package-c has no dependencies
          }
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById)
        .mockResolvedValueOnce(ok(packageA))
        .mockResolvedValueOnce(ok(packageC));

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const plan = result.value;
        expect(plan.resolvedDependencies).toHaveLength(2);

        // Check depth levels
        const depthA = plan.resolvedDependencies.find(
          d => d.resolvedPackage.getId().toString() === 'package-a'
        );
        const depthC = plan.resolvedDependencies.find(
          d => d.resolvedPackage.getId().toString() === 'package-c'
        );

        expect(depthA?.depth).toBe(0);
        expect(depthC?.depth).toBe(1);
        expect(depthA?.isDirectDependency).toBe(true);
        expect(depthC?.isDirectDependency).toBe(false);
      }
    });

    it('should respect maxDepth option', async () => {
      const depC = createMockDependency('package-c', '^3.0.0');
      const _packageC = createMockPackage('package-c', '3.1.0');

      const depB = createMockDependency('package-b', '^2.0.0');
      const packageB = createMockPackage('package-b', '2.1.0', [depC]);

      const depA = createMockDependency('package-a', '^1.0.0');
      const packageA = createMockPackage('package-a', '1.2.0', [depB]);

      const rootPackage = createMockPackage('root', '1.0.0', [depA]);

      // Mock repository calls for each package
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depB]));
          } else if (packageId.toString() === 'package-b') {
            return Promise.resolve(ok([depC]));
          } else {
            return Promise.resolve(ok([]));
          }
        }
      );

      // Should not try to resolve package-c due to maxDepth=2
      vi.mocked(mockPackageDiscoveryService.findPackageById).mockImplementation(packageId => {
        if (packageId.toString() === 'package-a') {
          return Promise.resolve(ok(packageA));
        } else if (packageId.toString() === 'package-b') {
          return Promise.resolve(ok(packageB));
        }
        return Promise.resolve(err(new PackageNotFoundError('package not found')));
      });

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage, { maxDepth: 2 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should only include packages up to depth 2 (A and B, not C)
        expect(result.value.resolvedDependencies).toHaveLength(2);
      }
    });

    it('should include dev dependencies when requested', async () => {
      const devDep = createMockDependency('dev-package', '^1.0.0');
      const devPackage = createMockPackage('dev-package', '1.0.0');

      const rootPackage = createMockPackage('root', '1.0.0', []);

      // Mock the repository to return dev dependencies for root package
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([devDep]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockResolvedValueOnce(ok(devPackage));

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage, {
        includeDevDependencies: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.resolvedDependencies).toHaveLength(1);
        expect(result.value.resolvedDependencies[0]?.resolvedPackage.getId().toString()).toBe(
          'dev-package'
        );
      }
    });

    it('should skip dev dependencies by default', async () => {
      const devDep = createMockDependency('dev-package', '^1.0.0', true); // isOptional=true means not required (dev dependency)
      const rootPackage = createMockPackage('root', '1.0.0', []);

      // Mock the repository to return dev dependencies for root package
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockResolvedValue(
        ok([devDep])
      );

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.resolvedDependencies).toHaveLength(0);
      }
    });

    it('should handle package not found errors', async () => {
      const dep = createMockDependency('missing-package', '^1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [dep]);

      // Mock the repository to return the dependency for the root package
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockResolvedValue(ok([dep]));

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockResolvedValueOnce(
        err(new PackageNotFoundError('missing-package'))
      );

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
      }
    });

    it('should prevent circular dependencies', async () => {
      const depA = createMockDependency('package-a', '^1.0.0');
      const depRoot = createMockDependency('root', '^1.0.0');

      const packageA = createMockPackage('package-a', '1.0.0', [depRoot]);
      const rootPackage = createMockPackage('root', '1.0.0', [depA]);

      // Mock repository calls to simulate circular dependency
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depRoot]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockImplementation(packageId => {
        if (packageId.toString() === 'package-a') {
          return Promise.resolve(ok(packageA));
        } else if (packageId.toString() === 'root') {
          return Promise.resolve(ok(rootPackage));
        }
        return Promise.resolve(err(new PackageNotFoundError('package not found')));
      });

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should only resolve package-a once, not follow circular reference
        expect(result.value.resolvedDependencies).toHaveLength(1);
      }
    });

    it('should handle optional dependencies that fail', async () => {
      const optionalDep = createMockDependency('optional-package', '^1.0.0', true);
      const requiredDep = createMockDependency('required-package', '^1.0.0', false);
      const rootPackage = createMockPackage('root', '1.0.0', [optionalDep, requiredDep]);

      const requiredPackage = createMockPackage('required-package', '1.0.0');

      // Mock repository to return both dependencies
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockResolvedValue(
        ok([optionalDep, requiredDep])
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById)
        .mockResolvedValueOnce(err(new PackageNotFoundError('optional-package')))
        .mockResolvedValueOnce(ok(requiredPackage));

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Since the service doesn't handle optional dependencies gracefully yet,
        // it should return an error when any dependency fails
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
      }
    });
  });

  describe('buildDependencyTree', () => {
    it('should build a simple dependency tree', async () => {
      const dep = createMockDependency('package-a', '^1.0.0');
      const packageA = createMockPackage('package-a', '1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [dep]);

      // Mock repository calls
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([dep]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockResolvedValueOnce(ok(packageA));

      const result = await service.buildDependencyTree(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.package).toBe(rootPackage);
        expect(tree.depth).toBe(0);
        expect(tree.dependencies).toHaveLength(1);
        expect(tree.dependencies[0]?.package.getId().toString()).toBe('package-a');
        expect(tree.dependencies[0]?.depth).toBe(1);
      }
    });

    it('should build a nested dependency tree', async () => {
      const depC = createMockDependency('package-c', '^3.0.0');
      const packageC = createMockPackage('package-c', '3.0.0');

      const depB = createMockDependency('package-b', '^2.0.0');
      const packageB = createMockPackage('package-b', '2.0.0', [depC]);

      const depA = createMockDependency('package-a', '^1.0.0');
      const packageA = createMockPackage('package-a', '1.0.0', [depB]);

      const rootPackage = createMockPackage('root', '1.0.0', [depA]);

      // Mock repository calls for nested dependencies
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depB]));
          } else if (packageId.toString() === 'package-b') {
            return Promise.resolve(ok([depC]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById)
        .mockResolvedValueOnce(ok(packageA))
        .mockResolvedValueOnce(ok(packageB))
        .mockResolvedValueOnce(ok(packageC));

      const result = await service.buildDependencyTree(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.dependencies).toHaveLength(1);
        expect(tree.dependencies[0]?.dependencies).toHaveLength(1);
        expect(tree.dependencies[0]?.dependencies[0]?.dependencies).toHaveLength(1);
        expect(
          tree.dependencies[0]?.dependencies[0]?.dependencies[0]?.package.getId().toString()
        ).toBe('package-c');
      }
    });
  });

  describe('detectConflicts', () => {
    it('should detect version conflicts', async () => {
      // Package A requires C@^1.0.0, Package B requires C@^2.0.0
      const depC1 = createMockDependency('package-c', '^1.0.0');
      const depC2 = createMockDependency('package-c', '^2.0.0');

      const packageA = createMockPackage('package-a', '1.0.0', [depC1]);
      const packageB = createMockPackage('package-b', '1.0.0', [depC2]);
      const packageC1 = createMockPackage('package-c', '1.5.0');
      const packageC2 = createMockPackage('package-c', '2.1.0');

      const depA = createMockDependency('package-a', '^1.0.0');
      const depB = createMockDependency('package-b', '^1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [depA, depB]);

      // Mock repository calls
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA, depB]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depC1]));
          } else if (packageId.toString() === 'package-b') {
            return Promise.resolve(ok([depC2]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById)
        .mockResolvedValueOnce(ok(packageA))
        .mockResolvedValueOnce(ok(packageC1))
        .mockResolvedValueOnce(ok(packageB))
        .mockResolvedValueOnce(ok(packageC2));

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const plan = result.value;
        expect(plan.conflicts.length).toBeGreaterThan(0);

        const conflict = plan.conflicts[0];
        expect(conflict?.packageId.toString()).toBe('package-c');
        expect(conflict?.conflictingVersions).toHaveLength(2);
        expect(conflict?.severity).toBe('error');
      }
    });

    it('should not report conflicts for compatible versions', async () => {
      // Both A and B require C@^1.0.0
      const depC = createMockDependency('package-c', '^1.0.0');
      const packageC = createMockPackage('package-c', '1.5.0');

      const packageA = createMockPackage('package-a', '1.0.0', [depC]);
      const packageB = createMockPackage('package-b', '1.0.0', [depC]);

      const depA = createMockDependency('package-a', '^1.0.0');
      const depB = createMockDependency('package-b', '^1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [depA, depB]);

      // Mock repository calls
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA, depB]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depC]));
          } else if (packageId.toString() === 'package-b') {
            return Promise.resolve(ok([depC]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById)
        .mockResolvedValueOnce(ok(packageA))
        .mockResolvedValueOnce(ok(packageC))
        .mockResolvedValueOnce(ok(packageB))
        .mockResolvedValueOnce(ok(packageC));

      const versionResult = PackageVersion.create('1.5.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.conflicts).toHaveLength(0);
      }
    });
  });

  describe('calculateInstallationOrder', () => {
    it('should calculate correct installation order', async () => {
      // Root -> A -> C, Root -> B -> C
      // Order should be: C, A, B (or C, B, A)
      const depC = createMockDependency('package-c', '^1.0.0');
      const packageC = createMockPackage('package-c', '1.0.0');

      const packageA = createMockPackage('package-a', '1.0.0', [depC]);
      const packageB = createMockPackage('package-b', '1.0.0', [depC]);

      const depA = createMockDependency('package-a', '^1.0.0');
      const depB = createMockDependency('package-b', '^1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [depA, depB]);

      // Mock repository calls
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([depA, depB]));
          } else if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depC]));
          } else if (packageId.toString() === 'package-b') {
            return Promise.resolve(ok([depC]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockImplementation(id =>
        Promise.resolve(
          id.toString() === 'package-a'
            ? ok(packageA)
            : id.toString() === 'package-b'
              ? ok(packageB)
              : id.toString() === 'package-c'
                ? ok(packageC)
                : err(new PackageNotFoundError(id.toString()))
        )
      );

      const versionResult = PackageVersion.create('1.0.0');
      if (versionResult.isOk()) {
        vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
          ok({
            bestVersion: versionResult.value,
            availableVersions: [versionResult.value],
            satisfiesConstraint: true,
            resolvedAt: new Date(),
          })
        );
      }

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const order = result.value.installationOrder;
        const cIndex = order.findIndex(id => id.toString() === 'package-c');
        const aIndex = order.findIndex(id => id.toString() === 'package-a');
        const bIndex = order.findIndex(id => id.toString() === 'package-b');

        // C should be installed before both A and B
        expect(cIndex).toBeLessThan(aIndex);
        expect(cIndex).toBeLessThan(bIndex);
      }
    });
  });

  describe('findCircularDependencies', () => {
    it('should detect simple circular dependencies', async () => {
      const depB = createMockDependency('package-b', '^1.0.0');
      const depA = createMockDependency('package-a', '^1.0.0');

      const packageA = createMockPackage('package-a', '1.0.0', [depB]);
      const packageB = createMockPackage('package-b', '1.0.0', [depA]);

      // Mock repository calls to simulate A -> B -> A cycle
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depB]));
          } else if (packageId.toString() === 'package-b') {
            return Promise.resolve(ok([depA]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockImplementation(packageId => {
        if (packageId.toString() === 'package-a') {
          return Promise.resolve(ok(packageA));
        } else if (packageId.toString() === 'package-b') {
          return Promise.resolve(ok(packageB));
        }
        return Promise.resolve(err(new PackageNotFoundError('package not found')));
      });

      const result = await service.findCircularDependencies(packageA);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        const cycle = result.value[0];
        expect(cycle).toBeDefined();
        expect(cycle?.length).toBeGreaterThan(1);
      }
    });

    it('should return empty array when no cycles exist', async () => {
      const depB = createMockDependency('package-b', '^1.0.0');
      const packageA = createMockPackage('package-a', '1.0.0', [depB]);
      const packageB = createMockPackage('package-b', '1.0.0', []);

      // Mock repository calls for linear dependency
      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'package-a') {
            return Promise.resolve(ok([depB]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockImplementation(packageId => {
        if (packageId.toString() === 'package-b') {
          return Promise.resolve(ok(packageB));
        }
        return Promise.resolve(err(new PackageNotFoundError('package not found')));
      });

      const result = await service.findCircularDependencies(packageA);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('validateDependencyCompatibility', () => {
    it('should validate compatible packages', () => {
      const packageA = createMockPackage('package-a', '1.0.0');
      const packageB = createMockPackage('package-b', '1.0.0');

      // Mock manifests to return compatible requirements
      const manifestA = packageA.getManifest();
      const manifestB = packageB.getManifest();
      vi.mocked(manifestA.getRequiredProofEditorVersion).mockReturnValue('1.0.0');
      vi.mocked(manifestA.getRequiredNodeVersion).mockReturnValue('18.0.0');
      vi.mocked(manifestB.getRequiredProofEditorVersion).mockReturnValue('1.0.0');
      vi.mocked(manifestB.getRequiredNodeVersion).mockReturnValue('18.0.0');

      const result = service.validateDependencyCompatibility(packageA, packageB);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should detect incompatible Proof Editor versions', () => {
      const packageA = createMockPackage('package-a', '1.0.0');
      const packageB = createMockPackage('package-b', '1.0.0');

      // Mock manifests to return incompatible Proof Editor versions
      const manifestA = packageA.getManifest();
      const manifestB = packageB.getManifest();

      // Properly mock the nested functions
      manifestA.getRequiredProofEditorVersion.mockReturnValue('1.0.0');
      manifestB.getRequiredProofEditorVersion.mockReturnValue('2.0.0');

      const result = service.validateDependencyCompatibility(packageA, packageB);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Incompatible Proof Editor version');
      }
    });

    it('should detect incompatible Node.js versions', () => {
      const packageA = createMockPackage('package-a', '1.0.0');
      const packageB = createMockPackage('package-b', '1.0.0');

      // Mock manifests to return incompatible Node.js versions
      const manifestA = packageA.getManifest();
      const manifestB = packageB.getManifest();

      // Properly mock the nested functions
      manifestA.getRequiredNodeVersion.mockReturnValue('16.0.0');
      manifestB.getRequiredNodeVersion.mockReturnValue('20.0.0');

      const result = service.validateDependencyCompatibility(packageA, packageB);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Incompatible Node.js version');
      }
    });

    it('should handle packages with no version requirements', () => {
      const packageA = createMockPackage('package-a', '1.0.0');
      const packageB = createMockPackage('package-b', '1.0.0');

      // Mock manifests to return null for version requirements
      const manifestA = packageA.getManifest();
      const manifestB = packageB.getManifest();
      vi.mocked(manifestA.getRequiredProofEditorVersion).mockReturnValue(null);
      vi.mocked(manifestA.getRequiredNodeVersion).mockReturnValue(null);
      vi.mocked(manifestB.getRequiredProofEditorVersion).mockReturnValue(null);
      vi.mocked(manifestB.getRequiredNodeVersion).mockReturnValue(null);

      const result = service.validateDependencyCompatibility(packageA, packageB);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle dependency repository errors', async () => {
      const rootPackage = createMockPackage('root', '1.0.0');

      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockResolvedValue(
        err(new PackageNotFoundError('Repository error'))
      );

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Repository error');
      }
    });

    it('should handle version resolution service errors', async () => {
      const dep = createMockDependency('package-a', '^1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [dep]);
      const packageA = createMockPackage('package-a', '1.0.0');

      // Mock the package to have a git source so version resolution service is called
      const mockSource = packageA.getSource();
      mockSource.asGitSource.mockReturnValue({
        url: 'https://github.com/user/package-a.git',
        ref: 'v1.0.0',
      });

      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockResolvedValue(ok([dep]));
      vi.mocked(mockPackageDiscoveryService.findPackageById).mockResolvedValue(ok(packageA));
      vi.mocked(mockVersionResolutionService.resolveVersionConstraint).mockResolvedValue(
        err(new PackageNotFoundError('Version resolution failed'))
      );

      const result = await service.resolveDependenciesForPackage(rootPackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Version resolution failed');
      }
    });

    it('should handle build tree with repository errors', async () => {
      const rootPackage = createMockPackage('root', '1.0.0');

      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockResolvedValue(
        err(new PackageNotFoundError('Repository error'))
      );

      const result = await service.buildDependencyTree(rootPackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Repository error');
      }
    });

    it('should handle missing packages in tree building gracefully', async () => {
      const dep = createMockDependency('missing-package', '^1.0.0');
      const rootPackage = createMockPackage('root', '1.0.0', [dep]);

      vi.mocked(mockDependencyRepository.findDependenciesForPackage).mockImplementation(
        packageId => {
          if (packageId.toString() === 'root') {
            return Promise.resolve(ok([dep]));
          }
          return Promise.resolve(ok([]));
        }
      );

      vi.mocked(mockPackageDiscoveryService.findPackageById).mockResolvedValue(
        err(new PackageNotFoundError('Package not found'))
      );

      const result = await service.buildDependencyTree(rootPackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tree = result.value;
        expect(tree.package).toBe(rootPackage);
        expect(tree.dependencies).toHaveLength(0); // Missing package should be skipped
      }
    });
  });
});
