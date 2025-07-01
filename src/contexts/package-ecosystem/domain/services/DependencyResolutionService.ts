import { err, ok, type Result } from 'neverthrow';

import { type Dependency } from '../entities/Dependency.js';
import { type Package } from '../entities/Package.js';
import { type IDependencyRepository } from '../repositories/IDependencyRepository.js';
import {
  PackageNotFoundError,
  type PackageSourceUnavailableError,
  PackageValidationError,
} from '../types/domain-errors.js';
import { PackageId } from '../value-objects/package-id.js';
import { PackageVersion } from '../value-objects/PackageVersion.js';
import { type VersionConstraint } from '../value-objects/version-constraint.js';
import { type PackageDiscoveryService } from './package-discovery-service.js';
import { type VersionResolutionService } from './VersionResolutionService.js';

export interface DependencyResolutionPlan {
  readonly rootPackage: Package;
  readonly resolvedDependencies: readonly ResolvedDependency[];
  readonly installationOrder: readonly PackageId[];
  readonly conflicts: readonly DependencyConflict[];
  readonly totalPackages: number;
  readonly resolutionTime: number;
}

export interface ResolvedDependency {
  readonly dependency: Dependency;
  readonly resolvedPackage: Package;
  readonly resolvedVersion: PackageVersion;
  readonly isDirectDependency: boolean;
  readonly depth: number;
}

export interface DependencyConflict {
  readonly packageId: PackageId;
  readonly conflictingVersions: readonly PackageVersion[];
  readonly requiredBy: readonly PackageId[];
  readonly severity: 'warning' | 'error';
  readonly suggestion?: string;
}

export interface DependencyTree {
  readonly package: Package;
  readonly dependencies: readonly DependencyTree[];
  readonly depth: number;
}

export class DependencyResolutionService {
  constructor(
    private readonly dependencyRepository: IDependencyRepository,
    private readonly packageDiscoveryService: PackageDiscoveryService,
    private readonly versionResolutionService: VersionResolutionService
  ) {}

  async resolveDependenciesForPackage(
    rootPackage: Package,
    options: { includeDevDependencies?: boolean; maxDepth?: number } = {}
  ): Promise<
    Result<
      DependencyResolutionPlan,
      PackageNotFoundError | PackageValidationError | PackageSourceUnavailableError
    >
  > {
    const startTime = Date.now();
    const maxDepth = options.maxDepth || 10;

    const resolvedDependencies: ResolvedDependency[] = [];
    const visited = new Set<string>();
    const conflicts: DependencyConflict[] = [];
    const versionMap = new Map<string, PackageVersion[]>();

    const resolutionResult = await this.resolveRecursively(
      rootPackage,
      0,
      maxDepth,
      resolvedDependencies,
      visited,
      versionMap,
      options.includeDevDependencies || false
    );

    if (resolutionResult.isErr()) {
      return err(resolutionResult.error);
    }

    this.detectConflicts(versionMap, conflicts, resolvedDependencies);

    const installationOrder = this.calculateInstallationOrder(resolvedDependencies);
    const resolutionTime = Date.now() - startTime;

    const plan: DependencyResolutionPlan = {
      rootPackage,
      resolvedDependencies,
      installationOrder,
      conflicts,
      totalPackages: resolvedDependencies.length + 1,
      resolutionTime,
    };

    return ok(plan);
  }

  async buildDependencyTree(
    rootPackage: Package,
    maxDepth = 5
  ): Promise<Result<DependencyTree, PackageNotFoundError | PackageValidationError>> {
    const treeResult = await this.buildTreeRecursively(rootPackage, 0, maxDepth, new Set());
    if (treeResult.isErr()) {
      return err(treeResult.error);
    }

    return ok(treeResult.value);
  }

  async findCircularDependencies(
    rootPackage: Package
  ): Promise<Result<readonly PackageId[][], PackageNotFoundError | PackageValidationError>> {
    const cycles: PackageId[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: PackageId[] = [];

    const result = await this.findCyclesRecursively(
      rootPackage,
      visited,
      recursionStack,
      currentPath,
      cycles
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(cycles);
  }

  async validateDependencyCompatibility(
    packageA: Package,
    packageB: Package
  ): Promise<Result<boolean, PackageValidationError>> {
    const aRequiresProofEditor = packageA.getManifest().getRequiredProofEditorVersion();
    const aRequiresNode = packageA.getManifest().getRequiredNodeVersion();

    const bRequiresProofEditor = packageB.getManifest().getRequiredProofEditorVersion();
    const bRequiresNode = packageB.getManifest().getRequiredNodeVersion();

    if (aRequiresProofEditor && bRequiresProofEditor) {
      const compatibilityResult = this.checkVersionCompatibility(
        aRequiresProofEditor,
        bRequiresProofEditor
      );
      if (compatibilityResult.isErr()) {
        return err(
          new PackageValidationError(
            `Incompatible Proof Editor version requirements: ${packageA.getId().toString()} requires ${aRequiresProofEditor}, ${packageB.getId().toString()} requires ${bRequiresProofEditor}`
          )
        );
      }
    }

    if (aRequiresNode && bRequiresNode) {
      const compatibilityResult = this.checkVersionCompatibility(aRequiresNode, bRequiresNode);
      if (compatibilityResult.isErr()) {
        return err(
          new PackageValidationError(
            `Incompatible Node.js version requirements: ${packageA.getId().toString()} requires ${aRequiresNode}, ${packageB.getId().toString()} requires ${bRequiresNode}`
          )
        );
      }
    }

    return ok(true);
  }

  private async resolveRecursively(
    currentPackage: Package,
    depth: number,
    maxDepth: number,
    resolvedDependencies: ResolvedDependency[],
    visited: Set<string>,
    versionMap: Map<string, PackageVersion[]>,
    includeDevDependencies: boolean
  ): Promise<
    Result<void, PackageNotFoundError | PackageValidationError | PackageSourceUnavailableError>
  > {
    if (depth > maxDepth) {
      return err(new PackageValidationError(`Maximum dependency depth ${maxDepth} exceeded`));
    }

    const packageKey = currentPackage.getId().toString();
    if (visited.has(packageKey)) {
      return ok(undefined);
    }

    visited.add(packageKey);

    const dependenciesResult = await this.dependencyRepository.findDependenciesForPackage(
      currentPackage.getId()
    );
    if (dependenciesResult.isErr()) {
      return err(dependenciesResult.error);
    }

    for (const dependency of dependenciesResult.value) {
      if (!includeDevDependencies && !dependency.isRequired()) {
        continue;
      }

      const packageResult = await this.packageDiscoveryService.findPackageById(
        dependency.getTargetPackageId()
      );
      if (packageResult.isErr()) {
        return err(packageResult.error);
      }

      const resolvedPackage = packageResult.value;

      const versionResolutionResult = await this.resolveVersionFromConstraint(
        resolvedPackage,
        dependency.getVersionConstraint()
      );

      if (versionResolutionResult.isErr()) {
        return err(versionResolutionResult.error);
      }

      const resolvedVersion = versionResolutionResult.value;

      const resolvedDependency: ResolvedDependency = {
        dependency,
        resolvedPackage,
        resolvedVersion,
        isDirectDependency: depth === 0,
        depth,
      };

      resolvedDependencies.push(resolvedDependency);

      const packageId = resolvedPackage.getId().toString();
      if (!versionMap.has(packageId)) {
        versionMap.set(packageId, []);
      }
      versionMap.get(packageId)!.push(resolvedVersion);

      const recursionResult = await this.resolveRecursively(
        resolvedPackage,
        depth + 1,
        maxDepth,
        resolvedDependencies,
        visited,
        versionMap,
        includeDevDependencies
      );

      if (recursionResult.isErr()) {
        return err(recursionResult.error);
      }
    }

    return ok(undefined);
  }

  private async buildTreeRecursively(
    currentPackage: Package,
    depth: number,
    maxDepth: number,
    visited: Set<string>
  ): Promise<Result<DependencyTree, PackageNotFoundError | PackageValidationError>> {
    if (depth > maxDepth) {
      return ok({
        package: currentPackage,
        dependencies: [],
        depth,
      });
    }

    const packageKey = currentPackage.getId().toString();
    if (visited.has(packageKey)) {
      return ok({
        package: currentPackage,
        dependencies: [],
        depth,
      });
    }

    visited.add(packageKey);

    const dependenciesResult = await this.dependencyRepository.findDependenciesForPackage(
      currentPackage.getId()
    );
    if (dependenciesResult.isErr()) {
      return err(dependenciesResult.error);
    }

    const childTrees: DependencyTree[] = [];

    for (const dependency of dependenciesResult.value) {
      const packageResult = await this.packageDiscoveryService.findPackageById(
        dependency.getTargetPackageId()
      );
      if (packageResult.isErr()) {
        continue;
      }

      const childTreeResult = await this.buildTreeRecursively(
        packageResult.value,
        depth + 1,
        maxDepth,
        new Set(visited)
      );

      if (childTreeResult.isOk()) {
        childTrees.push(childTreeResult.value);
      }
    }

    return ok({
      package: currentPackage,
      dependencies: childTrees,
      depth,
    });
  }

  private async findCyclesRecursively(
    currentPackage: Package,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: PackageId[],
    cycles: PackageId[][]
  ): Promise<Result<void, PackageNotFoundError | PackageValidationError>> {
    const packageKey = currentPackage.getId().toString();

    if (recursionStack.has(packageKey)) {
      const cycleStart = currentPath.findIndex(id => id.toString() === packageKey);
      if (cycleStart !== -1) {
        cycles.push([...currentPath.slice(cycleStart), currentPackage.getId()]);
      }
      return ok(undefined);
    }

    if (visited.has(packageKey)) {
      return ok(undefined);
    }

    visited.add(packageKey);
    recursionStack.add(packageKey);
    currentPath.push(currentPackage.getId());

    const dependenciesResult = await this.dependencyRepository.findDependenciesForPackage(
      currentPackage.getId()
    );
    if (dependenciesResult.isOk()) {
      for (const dependency of dependenciesResult.value) {
        const packageResult = await this.packageDiscoveryService.findPackageById(
          dependency.getTargetPackageId()
        );
        if (packageResult.isOk()) {
          const recursionResult = await this.findCyclesRecursively(
            packageResult.value,
            visited,
            recursionStack,
            currentPath,
            cycles
          );

          if (recursionResult.isErr()) {
            return err(recursionResult.error);
          }
        }
      }
    }

    recursionStack.delete(packageKey);
    currentPath.pop();

    return ok(undefined);
  }

  private async resolveVersionFromConstraint(
    packageEntity: Package,
    constraint: VersionConstraint
  ): Promise<Result<PackageVersion, PackageSourceUnavailableError | PackageNotFoundError>> {
    const gitSource = packageEntity.getSource().asGitSource();
    if (!gitSource) {
      const versionResult = PackageVersion.create(packageEntity.getVersion());
      if (versionResult.isErr()) {
        return err(
          new PackageNotFoundError(`Invalid version format: ${versionResult.error.message}`)
        );
      }
      return ok(versionResult.value);
    }

    const resolutionResult = await this.versionResolutionService.resolveVersionConstraint(
      gitSource.url,
      constraint
    );

    if (resolutionResult.isErr()) {
      return err(resolutionResult.error);
    }

    return ok(resolutionResult.value.bestVersion);
  }

  private detectConflicts(
    versionMap: Map<string, PackageVersion[]>,
    conflicts: DependencyConflict[],
    resolvedDependencies: readonly ResolvedDependency[]
  ): void {
    for (const [packageId, versions] of Array.from(versionMap.entries())) {
      if (versions.length <= 1) {
        continue;
      }

      const uniqueVersions = Array.from(new Set(versions.map(v => v.toString())))
        .map(vStr => versions.find(v => v.toString() === vStr)!)
        .sort((a, b) => b.compareWith(a));

      if (uniqueVersions.length > 1) {
        const requiredBy = resolvedDependencies
          .filter(rd => rd.resolvedPackage.getId().toString() === packageId)
          .map(rd => rd.dependency.getTargetPackageId());

        const hasIncompatibleVersions = uniqueVersions.some((v1, i) =>
          uniqueVersions.slice(i + 1).some(v2 => !v1.isCompatibleWith(v2))
        );

        const conflict: DependencyConflict = {
          packageId: (() => {
            const idResult = PackageId.create(packageId);
            if (idResult.isErr()) {
              throw new Error(`Invalid package ID: ${packageId}`);
            }
            return idResult.value;
          })(),
          conflictingVersions: uniqueVersions,
          requiredBy,
          severity: hasIncompatibleVersions ? 'error' : 'warning',
          suggestion: hasIncompatibleVersions
            ? `Consider updating dependencies to use compatible versions`
            : `Multiple versions detected, consider using a single version`,
        };

        conflicts.push(conflict);
      }
    }
  }

  private calculateInstallationOrder(
    resolvedDependencies: readonly ResolvedDependency[]
  ): readonly PackageId[] {
    const dependencyMap = new Map<string, Set<string>>();
    const allPackages = new Set<string>();

    for (const resolved of resolvedDependencies) {
      const packageId = resolved.resolvedPackage.getId().toString();
      allPackages.add(packageId);

      if (!dependencyMap.has(packageId)) {
        dependencyMap.set(packageId, new Set());
      }
    }

    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (packageId: string): void => {
      if (visited.has(packageId)) {
        return;
      }

      if (visiting.has(packageId)) {
        return;
      }

      visiting.add(packageId);

      const dependencies = dependencyMap.get(packageId) || new Set();
      for (const dep of Array.from(dependencies)) {
        visit(dep);
      }

      visiting.delete(packageId);
      visited.add(packageId);
      ordered.push(packageId);
    };

    for (const packageId of Array.from(allPackages)) {
      visit(packageId);
    }

    return ordered.map(id => {
      const idResult = PackageId.create(id);
      if (idResult.isErr()) {
        throw new Error(`Invalid package ID: ${id}`);
      }
      return idResult.value;
    });
  }

  private checkVersionCompatibility(
    versionA: string,
    versionB: string
  ): Result<boolean, PackageValidationError> {
    const versionAResult = PackageVersion.create(versionA);
    const versionBResult = PackageVersion.create(versionB);

    if (versionAResult.isErr() || versionBResult.isErr()) {
      return err(new PackageValidationError('Invalid version format'));
    }

    const compatible =
      versionAResult.value.isCompatibleWith(versionBResult.value) ||
      versionBResult.value.isCompatibleWith(versionAResult.value);

    return ok(compatible);
  }
}
