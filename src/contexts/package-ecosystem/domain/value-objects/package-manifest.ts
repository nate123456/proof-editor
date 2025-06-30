import { Result } from '../types/result.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { PackageManifestData } from '../types/common-types.js';
import { PackageId } from './package-id.js';
import { VersionConstraint } from './version-constraint.js';

export class PackageManifest {
  private constructor(
    private readonly data: PackageManifestData,
    private readonly packageId: PackageId,
    private readonly dependencies: Map<string, VersionConstraint>
  ) {}

  static create(data: PackageManifestData): Result<PackageManifest, PackageValidationError> {
    const packageIdResult = PackageId.create(data.name);
    if (!packageIdResult.success) {
      return Result.failure(new PackageValidationError(
        `Invalid package name: ${packageIdResult.error.message}`
      ));
    }

    if (!data.version.trim()) {
      return Result.failure(new PackageValidationError('Package version cannot be empty'));
    }

    const versionConstraintResult = VersionConstraint.create(data.version);
    if (!versionConstraintResult.success) {
      return Result.failure(new PackageValidationError(
        `Invalid package version: ${versionConstraintResult.error.message}`
      ));
    }

    if (!data.description.trim()) {
      return Result.failure(new PackageValidationError('Package description cannot be empty'));
    }

    if (!data.author.trim()) {
      return Result.failure(new PackageValidationError('Package author cannot be empty'));
    }

    const dependencies = new Map<string, VersionConstraint>();
    if (data.dependencies) {
      for (const [depName, depVersion] of Object.entries(data.dependencies)) {
        const depConstraintResult = VersionConstraint.create(depVersion);
        if (!depConstraintResult.success) {
          return Result.failure(new PackageValidationError(
            `Invalid dependency version for ${depName}: ${depConstraintResult.error.message}`
          ));
        }
        dependencies.set(depName, depConstraintResult.data);
      }
    }

    const validationResult = this.validateManifestStructure(data);
    if (!validationResult.success) {
      return validationResult;
    }

    return Result.success(new PackageManifest(data, packageId.data, dependencies));
  }

  getName(): string {
    return this.data.name;
  }

  getPackageId(): PackageId {
    return this.packageId;
  }

  getVersion(): string {
    return this.data.version;
  }

  getDescription(): string {
    return this.data.description;
  }

  getAuthor(): string {
    return this.data.author;
  }

  getHomepage(): string | undefined {
    return this.data.homepage;
  }

  getLicense(): string | undefined {
    return this.data.license;
  }

  getDependencies(): ReadonlyMap<string, VersionConstraint> {
    return this.dependencies;
  }

  getRequiredProofEditorVersion(): string | undefined {
    return this.data.requirements?.proofEditor;
  }

  getRequiredNodeVersion(): string | undefined {
    return this.data.requirements?.node;
  }

  hasLSPSupport(): boolean {
    return Boolean(this.data.lsp);
  }

  getLSPDesktopConfiguration(): NonNullable<PackageManifestData['lsp']>['desktop'] | undefined {
    return this.data.lsp?.desktop;
  }

  getLSPMobileConfiguration(): NonNullable<PackageManifestData['lsp']>['mobile'] | undefined {
    return this.data.lsp?.mobile;
  }

  getLSPBinaries(): Record<string, string> | undefined {
    return this.data.lsp?.binaries;
  }

  getProofCapabilities(): readonly string[] {
    return this.data.capabilities?.proofCapabilities || [];
  }

  getValidationCategories(): NonNullable<PackageManifestData['validation']>['categories'] | undefined {
    return this.data.validation?.categories;
  }

  getCustomValidators(): readonly string[] {
    return this.data.validation?.customValidators || [];
  }

  getKeywords(): readonly string[] {
    return this.data.keywords || [];
  }

  getCategory(): string | undefined {
    return this.data.category;
  }

  getTags(): readonly string[] {
    return this.data.tags || [];
  }

  isLanguagePackage(): boolean {
    return this.hasLSPSupport() && this.getProofCapabilities().length > 0;
  }

  private static validateManifestStructure(data: PackageManifestData): Result<void, PackageValidationError> {
    if (data.homepage && !this.isValidUrl(data.homepage)) {
      return Result.failure(new PackageValidationError('Invalid homepage URL'));
    }

    if (data.lsp?.desktop) {
      if (!data.lsp.desktop.command || data.lsp.desktop.command.length === 0) {
        return Result.failure(new PackageValidationError('LSP desktop command cannot be empty'));
      }
      
      if (!['stdio', 'websocket'].includes(data.lsp.desktop.transport)) {
        return Result.failure(new PackageValidationError('LSP desktop transport must be stdio or websocket'));
      }
    }

    if (data.lsp?.mobile) {
      if (!['websocket', 'http'].includes(data.lsp.mobile.transport)) {
        return Result.failure(new PackageValidationError('LSP mobile transport must be websocket or http'));
      }
      
      if (data.lsp.mobile.transport === 'websocket' && !data.lsp.mobile.service) {
        return Result.failure(new PackageValidationError('LSP mobile websocket transport requires service URL'));
      }
      
      if (data.lsp.mobile.transport === 'http' && !data.lsp.mobile.endpoint) {
        return Result.failure(new PackageValidationError('LSP mobile http transport requires endpoint URL'));
      }
    }

    if (data.capabilities?.proofCapabilities) {
      for (const capability of data.capabilities.proofCapabilities) {
        if (!capability.startsWith('proof/')) {
          return Result.failure(new PackageValidationError(
            `Invalid proof capability: ${capability}. Must start with 'proof/'`
          ));
        }
      }
    }

    if (data.validation?.categories) {
      for (const category of data.validation.categories) {
        if (!category.id || !category.name || !category.rules) {
          return Result.failure(new PackageValidationError('Validation category must have id, name, and rules'));
        }
      }
    }

    return Result.success(undefined);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  equals(other: PackageManifest): boolean {
    return (
      this.packageId.equals(other.packageId) &&
      this.data.version === other.data.version
    );
  }

  toJSON(): PackageManifestData {
    return this.data;
  }
}