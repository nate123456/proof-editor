/**
 * Enhanced test data factories for dependency resolution testing
 *
 * Provides comprehensive test data generation using Fishery and Faker
 * for creating realistic dependency scenarios and edge cases.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { err, ok } from 'neverthrow';

import type { Dependency } from '../../domain/entities/Dependency.js';
import type { Package } from '../../domain/entities/Package.js';
import type { IDependencyRepository } from '../../domain/repositories/IDependencyRepository.js';
import type { PackageDiscoveryService } from '../../domain/services/package-discovery-service.js';
import type { VersionResolutionService } from '../../domain/services/VersionResolutionService.js';
import { PackageNotFoundError } from '../../domain/types/domain-errors.js';
import { PackageVersion } from '../../domain/value-objects/PackageVersion.js';
import { PackageId } from '../../domain/value-objects/package-id.js';

// Realistic package name patterns
const packageNamePatterns = {
  scoped: () =>
    `@${faker.company
      .name()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}/${faker.word.noun()}`,
  utility: () =>
    `${faker.helpers.arrayElement(['utils', 'helpers', 'tools', 'common'])}-${faker.word.noun()}`,
  framework: () =>
    faker.word.noun() + faker.helpers.arrayElement(['-js', '-framework', '-lib', '']),
  plugin: () =>
    `${faker.helpers.arrayElement(['plugin', 'addon', 'extension'])}-${faker.word.adjective()}`,
  component: () =>
    `${faker.word.adjective()}-${faker.helpers.arrayElement(['component', 'widget', 'ui'])}`,
};

// Realistic version patterns
const versionPatterns = {
  stable: () =>
    `${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 20 })}.${faker.number.int({ min: 0, max: 10 })}`,
  prerelease: () =>
    `${faker.number.int({ min: 1, max: 3 })}.${faker.number.int({ min: 0, max: 10 })}.${faker.number.int({ min: 0, max: 5 })}-${faker.helpers.arrayElement(['alpha', 'beta', 'rc'])}.${faker.number.int({ min: 1, max: 5 })}`,
  patch: () =>
    `${faker.number.int({ min: 1, max: 3 })}.${faker.number.int({ min: 0, max: 10 })}.${faker.number.int({ min: 0, max: 20 })}`,
};

// Version constraint patterns
const constraintPatterns = {
  caret: (version: string) => `^${version}`,
  tilde: (version: string) => `~${version}`,
  exact: (version: string) => version,
  range: (version: string) => {
    const [major, minor] = version.split('.');
    if (!minor) {
      return `>=${version}`;
    }
    const upperMinor = Number.parseInt(minor) + faker.number.int({ min: 1, max: 3 });
    return `>=${version} <${major}.${upperMinor}.0`;
  },
  wildcard: (version: string) => {
    const [major] = version.split('.');
    return `${major}.*`;
  },
};

// Test scenario configurations
export interface DependencyGraphConfig {
  packageCount: number;
  maxDepth: number;
  branchingFactor: number;
  circularProbability: number;
  conflictProbability: number;
  optionalDependencyProbability: number;
  devDependencyProbability: number;
}

export interface MockRepositoryBehavior {
  packages: Map<string, Package>;
  dependencies: Map<string, Dependency[]>;
  errors: Map<string, Error>;
}

// Factory for generating package names
export const packageNameFactory = Factory.define<string>(() => {
  const pattern = faker.helpers.objectValue(packageNamePatterns);
  return pattern();
});

// Factory for generating semantic versions
export const semanticVersionFactory = Factory.define<string>(() => {
  const pattern = faker.helpers.weightedArrayElement([
    { weight: 0.7, value: versionPatterns.stable },
    { weight: 0.2, value: versionPatterns.patch },
    { weight: 0.1, value: versionPatterns.prerelease },
  ]);
  return pattern();
});

// Factory for generating version constraints
export const versionConstraintFactory = Factory.define<string>(({ params }) => {
  const { targetVersion } = params as { targetVersion?: string };
  const version = targetVersion || semanticVersionFactory.build();

  const constraintType = faker.helpers.weightedArrayElement([
    { weight: 0.4, value: 'caret' },
    { weight: 0.3, value: 'tilde' },
    { weight: 0.2, value: 'exact' },
    { weight: 0.1, value: 'range' },
  ]);

  return constraintPatterns[constraintType](version);
});

// Factory for creating realistic dependency graphs
export const dependencyGraphFactory = Factory.define<{
  root: any;
  packages: any[];
  dependencies: any[];
}>(({ params }) => {
  const config = {
    packageCount: 10,
    maxDepth: 3,
    branchingFactor: 2,
    circularProbability: 0,
    conflictProbability: 0,
    optionalDependencyProbability: 0.1,
    devDependencyProbability: 0.2,
    ...((params as { config?: Partial<DependencyGraphConfig> })?.config || {}),
  };

  return generateDependencyGraph(config);
});

// Factory for creating circular dependency scenarios
export const circularDependencyGraphFactory = Factory.define<{
  root: any;
  packages: any[];
  cycles: string[][];
}>(({ params }) => {
  const { cycleLength = 3 } = params as { cycleLength?: number };
  return generateCircularDependencyGraph(cycleLength);
});

// Factory for creating version conflict scenarios
export const versionConflictGraphFactory = Factory.define<{
  root: any;
  conflicts: Array<{ packageId: string; versions: string[] }>;
}>(({ params }) => {
  const { conflictCount = 2 } = params as { conflictCount?: number };
  return generateVersionConflictGraph(conflictCount);
});

// Factory for creating large-scale dependency graphs
export const largeDependencyGraphFactory = Factory.define<{
  root: any;
  packages: any[];
  stats: { totalDeps: number; maxDepth: number };
}>(({ params }) => {
  const { packageCount = 100, strategy = 'tree' } = params as {
    packageCount?: number;
    strategy?: 'tree' | 'flat' | 'diamond';
  };
  return generateLargeDependencyGraph(packageCount, strategy);
});

// Factory for real-world package scenarios
export const realWorldScenarioFactory = Factory.define<{
  root: any;
  packages: any[];
  scenario: string;
}>(({ params }) => {
  const { scenario = 'web-app' } = params as {
    scenario?: 'web-app' | 'library' | 'monorepo' | 'microservice';
  };
  return generateRealWorldScenario(scenario);
});

// Mock package creation with realistic data
export function createRealisticMockPackage(
  name?: string,
  version?: string,
  options: {
    hasLSP?: boolean;
    isLanguagePackage?: boolean;
    requiredProofEditorVersion?: string;
    requiredNodeVersion?: string;
    dependencies?: Dependency[];
  } = {},
) {
  const packageName = name || packageNameFactory.build();
  const packageVersion = version || semanticVersionFactory.build();
  const packageId = PackageId.create(packageName);
  const versionObj = PackageVersion.create(packageVersion);

  if (packageId.isErr() || versionObj.isErr()) {
    throw new Error('Failed to create realistic mock package');
  }

  const mockManifest = {
    getName: () => packageName,
    getVersion: () => packageVersion,
    getDescription: () => faker.lorem.sentence(),
    getAuthor: () => faker.person.fullName(),
    getPackageId: () => packageId.value,
    hasLSPSupport: () => options.hasLSP || false,
    getRequiredProofEditorVersion: () => options.requiredProofEditorVersion || null,
    getRequiredNodeVersion: () => options.requiredNodeVersion || null,
    isLanguagePackage: () => options.isLanguagePackage || false,
    getDependencies: () => options.dependencies || [],
    getDevDependencies: () => [],
    getPeerDependencies: () => [],
  };

  const mockSource = {
    isGitSource: () => faker.datatype.boolean(),
    isLocalSource: () => false,
    asGitSource: () =>
      faker.datatype.boolean()
        ? {
            url: `https://github.com/${faker.internet.userName()}/${packageName}.git`,
            ref: `v${packageVersion}`,
          }
        : null,
    asLocalSource: () => null,
    toString: () => `git+https://github.com/${faker.internet.userName()}/${packageName}.git`,
  };

  return {
    getId: () => packageId.value,
    getName: () => packageName,
    getVersion: () => packageVersion,
    getDescription: () => faker.lorem.sentence(),
    getAuthor: () => faker.person.fullName(),
    getManifest: () => mockManifest,
    getSDKInterfaces: () => [],
    getValidationResult: () => ({ isValid: true, errors: [], warnings: [] }),
    isValid: () => true,
    hasWarnings: () => false,
    getLastUpdated: () => faker.date.recent(),
    getCacheLocation: () => undefined,
    isLanguagePackage: () => options.isLanguagePackage || false,
    getSource: () => mockSource,
  };
}

// Generate realistic dependency graphs
function generateDependencyGraph(config: DependencyGraphConfig) {
  const packages: any[] = [];
  const dependencies: any[] = [];
  const packageNames = new Set<string>();

  // Generate unique package names
  while (packageNames.size < config.packageCount) {
    packageNames.add(packageNameFactory.build());
  }
  const names = Array.from(packageNames);

  // Create root package
  const rootPackage = createRealisticMockPackage(names[0], '1.0.0');
  packages.push(rootPackage);

  // Create dependency packages
  for (let i = 1; i < config.packageCount; i++) {
    const pkg = createRealisticMockPackage(names[i], semanticVersionFactory.build());
    packages.push(pkg);
  }

  // Generate dependencies based on configuration
  for (let i = 0; i < config.packageCount; i++) {
    const currentDepth = Math.floor(i / config.branchingFactor);
    if (currentDepth >= config.maxDepth) continue;

    const depCount = faker.number.int({ min: 0, max: config.branchingFactor });
    const availableTargets = packages.slice(Math.max(0, i - 5), i); // Can depend on previous packages

    for (let j = 0; j < depCount && j < availableTargets.length; j++) {
      const target = faker.helpers.arrayElement(availableTargets);
      const isOptional = Math.random() < config.optionalDependencyProbability;
      const constraint = versionConstraintFactory.build(target.getVersion());

      const dep = createRealisticMockDependency(target.getName(), constraint, isOptional);
      dependencies.push({ from: i, to: packages.indexOf(target), dep });
    }
  }

  return { root: rootPackage, packages, dependencies };
}

function generateCircularDependencyGraph(cycleLength: number) {
  const packages: any[] = [];
  const names: string[] = [];

  // Generate unique names for the cycle
  while (names.length < cycleLength) {
    const name = packageNameFactory.build();
    if (!names.includes(name)) {
      names.push(name);
    }
  }

  // Create packages in a cycle
  for (let i = 0; i < cycleLength; i++) {
    const pkg = createRealisticMockPackage(names[i], '1.0.0');
    packages.push(pkg);
  }

  const cycles: string[][] = [];
  const cycle = names.slice();
  const firstCycleName = cycle[0];
  if (firstCycleName) {
    cycles.push([...cycle, firstCycleName]); // Close the cycle
  }

  const root = packages[0];
  if (!root) {
    throw new Error('No packages generated');
  }

  return { root, packages, cycles };
}

function generateVersionConflictGraph(conflictCount: number) {
  const rootPackage = createRealisticMockPackage('conflict-root', '1.0.0');
  const conflicts: Array<{ packageId: string; versions: string[] }> = [];

  for (let i = 0; i < conflictCount; i++) {
    const packageName = packageNameFactory.build();
    const versions = [versionPatterns.stable(), versionPatterns.stable()];
    conflicts.push({ packageId: packageName, versions });
  }

  return { root: rootPackage, conflicts };
}

function generateLargeDependencyGraph(packageCount: number, strategy: 'tree' | 'flat' | 'diamond') {
  const packages: any[] = [];
  const dependencies: any[] = [];

  // Create root
  const rootPackage = createRealisticMockPackage('large-root', '1.0.0');
  packages.push(rootPackage);

  for (let i = 1; i < packageCount; i++) {
    const pkg = createRealisticMockPackage(`large-package-${i}`, semanticVersionFactory.build());
    packages.push(pkg);
  }

  // Generate dependencies based on strategy
  switch (strategy) {
    case 'tree':
      // Tree structure: each package depends on 1-3 previous packages
      for (let i = 1; i < packageCount; i++) {
        const depCount = Math.min(3, Math.max(1, faker.number.int({ min: 1, max: 3 })));
        for (let j = 0; j < depCount && i - j - 1 >= 0; j++) {
          const targetIndex = Math.max(0, i - j - 1);
          const dep = createRealisticMockDependency(packages[targetIndex].getName(), '^1.0.0');
          dependencies.push({ from: i, to: targetIndex, dep });
        }
      }
      break;

    case 'flat': {
      // Flat structure: all packages depend on a few core packages
      const coreCount = Math.min(5, Math.floor(packageCount * 0.1));
      for (let i = coreCount + 1; i < packageCount; i++) {
        const coreIndex = faker.number.int({ min: 1, max: coreCount });
        const dep = createRealisticMockDependency(packages[coreIndex].getName(), '^1.0.0');
        dependencies.push({ from: i, to: coreIndex, dep });
      }
      break;
    }

    case 'diamond': {
      // Diamond structure: convergent dependencies
      const midPoint = Math.floor(packageCount / 2);
      for (let i = 1; i < midPoint; i++) {
        const dep = createRealisticMockDependency(packages[0].getName(), '^1.0.0');
        dependencies.push({ from: i, to: 0, dep });
      }
      for (let i = midPoint; i < packageCount; i++) {
        const targetIndex = faker.number.int({ min: 1, max: midPoint - 1 });
        const dep = createRealisticMockDependency(packages[targetIndex].getName(), '^1.0.0');
        dependencies.push({ from: i, to: targetIndex, dep });
      }
      break;
    }
  }

  const maxDepth = Math.max(...packages.map((_, i) => calculateDepth(i, dependencies)));
  const stats = { totalDeps: dependencies.length, maxDepth };

  return { root: rootPackage, packages, stats };
}

function generateRealWorldScenario(scenario: string) {
  switch (scenario) {
    case 'web-app':
      return generateWebAppScenario();
    case 'library':
      return generateLibraryScenario();
    case 'monorepo':
      return generateMonorepoScenario();
    case 'microservice':
      return generateMicroserviceScenario();
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

function generateWebAppScenario() {
  const packages = [
    createRealisticMockPackage('@myapp/frontend', '1.0.0'),
    createRealisticMockPackage('react', '18.2.0'),
    createRealisticMockPackage('react-dom', '18.2.0'),
    createRealisticMockPackage('typescript', '5.0.0'),
    createRealisticMockPackage('webpack', '5.88.0'),
    createRealisticMockPackage('babel-core', '7.22.0'),
  ];

  return { root: packages[0], packages, scenario: 'web-app' };
}

function generateLibraryScenario() {
  const packages = [
    createRealisticMockPackage('@myorg/ui-components', '2.1.0'),
    createRealisticMockPackage('react', '17.0.0'),
    createRealisticMockPackage('styled-components', '5.3.0'),
    createRealisticMockPackage('typescript', '4.9.0'),
  ];

  return { root: packages[0], packages, scenario: 'library' };
}

function generateMonorepoScenario() {
  const packages = [
    createRealisticMockPackage('@myorg/core', '1.0.0'),
    createRealisticMockPackage('@myorg/utils', '1.0.0'),
    createRealisticMockPackage('@myorg/api', '1.0.0'),
    createRealisticMockPackage('@myorg/frontend', '1.0.0'),
    createRealisticMockPackage('@myorg/backend', '1.0.0'),
  ];

  return { root: packages[0], packages, scenario: 'monorepo' };
}

function generateMicroserviceScenario() {
  const packages = [
    createRealisticMockPackage('@services/user-service', '1.2.0'),
    createRealisticMockPackage('express', '4.18.0'),
    createRealisticMockPackage('mongoose', '7.4.0'),
    createRealisticMockPackage('jsonwebtoken', '9.0.0'),
    createRealisticMockPackage('helmet', '7.0.0'),
  ];

  return { root: packages[0], packages, scenario: 'microservice' };
}

function createRealisticMockDependency(
  packageId: string,
  versionConstraint: string,
  isOptional = false,
) {
  const pkgId = PackageId.create(packageId);
  if (pkgId.isErr()) {
    throw new Error('Failed to create mock dependency');
  }

  return {
    getId: () => ({ getValue: () => `dep-${packageId}` }),
    getTargetPackageId: () => pkgId.value,
    getVersionConstraint: () => ({
      satisfies: () => true,
      toString: () => versionConstraint,
      getMinVersion: () => null,
      getMaxVersion: () => null,
      isExact: () => !versionConstraint.includes('^') && !versionConstraint.includes('~'),
      isRange: () => versionConstraint.includes('^') || versionConstraint.includes('~'),
      getConstraintString: () => versionConstraint,
    }),
    getDependencyType: () => (isOptional ? 'optional' : 'runtime'),
    isRequired: () => !isOptional,
    isOptional: () => isOptional,
    getResolutionStatus: () => 'unresolved',
    getResolvedVersion: () => undefined,
    getConflictReason: () => undefined,
    isResolved: () => false,
    equals: () => false,
  };
}

function calculateDepth(packageIndex: number, dependencies: any[]): number {
  const visited = new Set<number>();
  const visiting = new Set<number>();

  function dfs(index: number): number {
    if (visiting.has(index)) return 0; // Cycle detected
    if (visited.has(index)) return 0;

    visiting.add(index);

    const deps = dependencies.filter((d) => d.from === index);
    const maxDepth = deps.length === 0 ? 0 : Math.max(...deps.map((d) => dfs(d.to)));

    visiting.delete(index);
    visited.add(index);

    return maxDepth + 1;
  }

  return dfs(packageIndex);
}

// Mock repository setup helper
export function setupRealisticMockRepository(
  packages: any[],
  dependencies: any[],
  mockDependencyRepository: IDependencyRepository,
  mockPackageDiscoveryService: PackageDiscoveryService,
  mockVersionResolutionService: VersionResolutionService,
) {
  // Setup dependency repository
  const dependencyMap = new Map<string, any[]>();
  dependencies.forEach(({ from, dep }) => {
    const packageName = packages[from]?.getName() || `package-${from}`;
    if (!dependencyMap.has(packageName)) {
      dependencyMap.set(packageName, []);
    }
    dependencyMap.get(packageName)?.push(dep);
  });

  (mockDependencyRepository.findDependenciesForPackage as any).mockImplementation(
    async (packageId: any) => {
      const deps = dependencyMap.get(packageId.toString()) || [];
      return Promise.resolve(ok(deps));
    },
  );

  // Setup package discovery service
  (mockPackageDiscoveryService.findPackageById as any).mockImplementation(
    async (packageId: any) => {
      const pkg = packages.find((p) => p.getId().toString() === packageId.toString());
      return pkg
        ? Promise.resolve(ok(pkg))
        : Promise.resolve(err(new PackageNotFoundError(`Package ${packageId} not found`)));
    },
  );

  // Setup version resolution service
  const versionResult = PackageVersion.create('1.0.0');
  if (versionResult.isOk()) {
    (mockVersionResolutionService.resolveVersionConstraint as any).mockResolvedValue(
      ok({
        bestVersion: versionResult.value,
        availableVersions: [versionResult.value],
        satisfiesConstraint: true,
        resolvedAt: new Date(),
      }),
    );
  }
}
