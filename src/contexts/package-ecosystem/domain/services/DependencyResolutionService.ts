import { Result } from '../types/result.js';
import { PackageNotFoundError, PackageValidationError, PackageSourceUnavailableError } from '../types/domain-errors.js';
import { PackageEntity } from '../entities/package-entity.js';
import { DependencyEntity } from '../entities/dependency-entity.js';
import { PackageId } from '../value-objects/package-id.js';
import { PackageVersion } from '../value-objects/PackageVersion.js';
import { VersionConstraint } from '../value-objects/version-constraint.js';
import { VersionResolutionService } from './VersionResolutionService.js';
import { PackageDiscoveryService } from './package-discovery-service.js';

export interface DependencyResolutionPlan {
  readonly rootPackage: PackageEntity;
  readonly resolvedDependencies: readonly ResolvedDependency[];
  readonly installationOrder: readonly PackageId[];
  readonly conflicts: readonly DependencyConflict[];
  readonly totalPackages: number;
  readonly resolutionTime: number;
}

export interface ResolvedDependency {
  readonly dependency: DependencyEntity;
  readonly resolvedPackage: PackageEntity;
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
  readonly package: PackageEntity;
  readonly dependencies: readonly DependencyTree[];
  readonly depth: number;
}

export interface IDependencyRepository {
  findDependenciesForPackage(packageId: PackageId): Promise<Result<readonly DependencyEntity[], PackageNotFoundError>>;
  findPackagesThatDependOn(packageId: PackageId): Promise<Result<readonly DependencyEntity[], PackageNotFoundError>>;
}

export class DependencyResolutionService {
  constructor(
    private readonly dependencyRepository: IDependencyRepository,
    private readonly packageDiscoveryService: PackageDiscoveryService,
    private readonly versionResolutionService: VersionResolutionService
  ) {}

  async resolveDependenciesForPackage(
    rootPackage: PackageEntity,
    options: { includeDevDependencies?: boolean; maxDepth?: number } = {}
  ): Promise<Result<DependencyResolutionPlan, PackageNotFoundError | PackageValidationError | PackageSourceUnavailableError>> {
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

    if (!resolutionResult.success) {
      return Result.failure(resolutionResult.error);
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
      resolutionTime
    };

    return Result.success(plan);
  }

  async buildDependencyTree(
    rootPackage: PackageEntity,
    maxDepth = 5
  ): Promise<Result<DependencyTree, PackageNotFoundError | PackageValidationError>> {
    const treeResult = await this.buildTreeRecursively(rootPackage, 0, maxDepth, new Set());
    if (!treeResult.success) {
      return Result.failure(treeResult.error);
    }

    return Result.success(treeResult.data);
  }

  async findCircularDependencies(
    rootPackage: PackageEntity
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

    if (!result.success) {
      return Result.failure(result.error);
    }

    return Result.success(cycles);
  }

  async validateDependencyCompatibility(
    packageA: PackageEntity,
    packageB: PackageEntity
  ): Promise<Result<boolean, PackageValidationError>> {
    const aRequiresProofEditor = packageA.getManifest().getRequiredProofEditorVersion();
    const aRequiresNode = packageA.getManifest().getRequiredNodeVersion();
    
    const bRequiresProofEditor = packageB.getManifest().getRequiredProofEditorVersion();
    const bRequiresNode = packageB.getManifest().getRequiredNodeVersion();

    if (aRequiresProofEditor && bRequiresProofEditor) {
      const compatibilityResult = this.checkVersionCompatibility(aRequiresProofEditor, bRequiresProofEditor);
      if (!compatibilityResult.success) {
        return Result.failure(new PackageValidationError(
          `Incompatible Proof Editor version requirements: ${packageA.getId().toString()} requires ${aRequiresProofEditor}, ${packageB.getId().toString()} requires ${bRequiresProofEditor}`
        ));
      }
    }

    if (aRequiresNode && bRequiresNode) {
      const compatibilityResult = this.checkVersionCompatibility(aRequiresNode, bRequiresNode);
      if (!compatibilityResult.success) {
        return Result.failure(new PackageValidationError(
          `Incompatible Node.js version requirements: ${packageA.getId().toString()} requires ${aRequiresNode}, ${packageB.getId().toString()} requires ${bRequiresNode}`
        ));
      }
    }

    return Result.success(true);
  }

  private async resolveRecursively(
    currentPackage: PackageEntity,
    depth: number,
    maxDepth: number,
    resolvedDependencies: ResolvedDependency[],
    visited: Set<string>,
    versionMap: Map<string, PackageVersion[]>,
    includeDevDependencies: boolean
  ): Promise<Result<void, PackageNotFoundError | PackageValidationError | PackageSourceUnavailableError>> {
    if (depth > maxDepth) {
      return Result.failure(new PackageValidationError(
        `Maximum dependency depth ${maxDepth} exceeded`
      ));
    }

    const packageKey = currentPackage.getId().toString();
    if (visited.has(packageKey)) {
      return Result.success(undefined);
    }

    visited.add(packageKey);

    const dependenciesResult = await this.dependencyRepository.findDependenciesForPackage(currentPackage.getId());
    if (!dependenciesResult.success) {
      return Result.failure(dependenciesResult.error);
    }

    for (const dependency of dependenciesResult.data) {
      if (!includeDevDependencies && !dependency.isRequired()) {
        continue;
      }

      const packageResult = await this.packageDiscoveryService.findPackageById(dependency.getTargetPackageId());
      if (!packageResult.success) {
        return Result.failure(packageResult.error);
      }

      const resolvedPackage = packageResult.data;
      
      const versionResolutionResult = await this.resolveVersionFromConstraint(
        resolvedPackage,
        dependency.getVersionConstraint()
      );
      
      if (!versionResolutionResult.success) {
        return Result.failure(versionResolutionResult.error);
      }

      const resolvedVersion = versionResolutionResult.data;

      const resolvedDependency: ResolvedDependency = {
        dependency,
        resolvedPackage,
        resolvedVersion,
        isDirectDependency: depth === 0,
        depth
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

      if (!recursionResult.success) {
        return Result.failure(recursionResult.error);
      }
    }

    return Result.success(undefined);
  }

  private async buildTreeRecursively(
    currentPackage: PackageEntity,
    depth: number,
    maxDepth: number,
    visited: Set<string>
  ): Promise<Result<DependencyTree, PackageNotFoundError | PackageValidationError>> {
    if (depth > maxDepth) {
      return Result.success({
        package: currentPackage,
        dependencies: [],
        depth
      });
    }

    const packageKey = currentPackage.getId().toString();
    if (visited.has(packageKey)) {
      return Result.success({
        package: currentPackage,
        dependencies: [],
        depth
      });
    }

    visited.add(packageKey);

    const dependenciesResult = await this.dependencyRepository.findDependenciesForPackage(currentPackage.getId());
    if (!dependenciesResult.success) {
      return Result.failure(dependenciesResult.error);
    }

    const childTrees: DependencyTree[] = [];

    for (const dependency of dependenciesResult.data) {
      const packageResult = await this.packageDiscoveryService.findPackageById(dependency.getTargetPackageId());
      if (!packageResult.success) {
        continue;
      }

      const childTreeResult = await this.buildTreeRecursively(
        packageResult.data,
        depth + 1,
        maxDepth,
        new Set(visited)
      );

      if (childTreeResult.success) {
        childTrees.push(childTreeResult.data);
      }
    }

    return Result.success({
      package: currentPackage,
      dependencies: childTrees,
      depth
    });
  }

  private async findCyclesRecursively(
    currentPackage: PackageEntity,
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
      return Result.success(undefined);
    }

    if (visited.has(packageKey)) {
      return Result.success(undefined);
    }

    visited.add(packageKey);
    recursionStack.add(packageKey);
    currentPath.push(currentPackage.getId());

    const dependenciesResult = await this.dependencyRepository.findDependenciesForPackage(currentPackage.getId());
    if (dependenciesResult.success) {
      for (const dependency of dependenciesResult.data) {
        const packageResult = await this.packageDiscoveryService.findPackageById(dependency.getTargetPackageId());
        if (packageResult.success) {
          const recursionResult = await this.findCyclesRecursively(
            packageResult.data,
            visited,
            recursionStack,
            currentPath,
            cycles
          );
          
          if (!recursionResult.success) {
            return Result.failure(recursionResult.error);
          }
        }
      }
    }

    recursionStack.delete(packageKey);
    currentPath.pop();

    return Result.success(undefined);
  }

  private async resolveVersionFromConstraint(
    packageEntity: PackageEntity,
    constraint: VersionConstraint
  ): Promise<Result<PackageVersion, PackageSourceUnavailableError | PackageNotFoundError>> {
    const gitSource = packageEntity.getSource().asGitSource();
    if (!gitSource) {
      return PackageVersion.create(packageEntity.getVersion());
    }

    const resolutionResult = await this.versionResolutionService.resolveVersionConstraint(
      gitSource.url,
      constraint
    );

    if (!resolutionResult.success) {
      return Result.failure(resolutionResult.error);
    }

    return Result.success(resolutionResult.data.bestVersion);
  }

  private detectConflicts(
    versionMap: Map<string, PackageVersion[]>,
    conflicts: DependencyConflict[],
    resolvedDependencies: readonly ResolvedDependency[]
  ): void {
    for (const [packageId, versions] of versionMap.entries()) {
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
          packageId: PackageId.create(packageId).success ? PackageId.create(packageId).data : new PackageId(packageId),
          conflictingVersions: uniqueVersions,
          requiredBy,
          severity: hasIncompatibleVersions ? 'error' : 'warning',
          suggestion: hasIncompatibleVersions
            ? `Consider updating dependencies to use compatible versions`
            : `Multiple versions detected, consider using a single version`
        };

        conflicts.push(conflict);
      }
    }
  }

  private calculateInstallationOrder(resolvedDependencies: readonly ResolvedDependency[]): readonly PackageId[] {
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
      for (const dep of dependencies) {
        visit(dep);
      }
      
      visiting.delete(packageId);
      visited.add(packageId);
      ordered.push(packageId);
    };

    for (const packageId of allPackages) {
      visit(packageId);
    }

    return ordered.map(id => PackageId.create(id).success ? PackageId.create(id).data : new PackageId(id));
  }

  private checkVersionCompatibility(versionA: string, versionB: string): Result<boolean, PackageValidationError> {
    const versionAResult = PackageVersion.create(versionA);
    const versionBResult = PackageVersion.create(versionB);

    if (!versionAResult.success || !versionBResult.success) {
      return Result.failure(new PackageValidationError('Invalid version format'));
    }

    const compatible = versionAResult.data.isCompatibleWith(versionBResult.data) || 
                      versionBResult.data.isCompatibleWith(versionAResult.data);

    return Result.success(compatible);
  }
}