import { Result } from '../types/result.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { PackageId } from '../value-objects/package-id.js';
import { PackageSource } from '../value-objects/package-source.js';
import { PackageManifest } from '../value-objects/package-manifest.js';
import { SDKInterface, ValidationResult } from '../types/common-types.js';

export interface PackageEntityData {
  readonly id: PackageId;
  readonly source: PackageSource;
  readonly manifest: PackageManifest;
  readonly sdkInterfaces: readonly SDKInterface[];
  readonly validationResult: ValidationResult;
  readonly lastUpdated: Date;
  readonly cacheLocation?: string;
}

export class PackageEntity {
  private constructor(private readonly data: PackageEntityData) {}

  static create(data: Omit<PackageEntityData, 'lastUpdated'> & { lastUpdated?: Date }): Result<PackageEntity, PackageValidationError> {
    if (!data.manifest.getPackageId().equals(data.id)) {
      return Result.failure(new PackageValidationError(
        'Package ID must match manifest name'
      ));
    }

    if (!data.validationResult.isValid && data.validationResult.errors.length === 0) {
      return Result.failure(new PackageValidationError(
        'Invalid validation result: must have errors if not valid'
      ));
    }

    if (data.sdkInterfaces.length > 0 && !data.manifest.hasLSPSupport()) {
      return Result.failure(new PackageValidationError(
        'Package with SDK interfaces must have LSP support'
      ));
    }

    const entityData: PackageEntityData = {
      ...data,
      lastUpdated: data.lastUpdated || new Date()
    };

    return Result.success(new PackageEntity(entityData));
  }

  getId(): PackageId {
    return this.data.id;
  }

  getSource(): PackageSource {
    return this.data.source;
  }

  getManifest(): PackageManifest {
    return this.data.manifest;
  }

  getName(): string {
    return this.data.manifest.getName();
  }

  getVersion(): string {
    return this.data.manifest.getVersion();
  }

  getDescription(): string {
    return this.data.manifest.getDescription();
  }

  getAuthor(): string {
    return this.data.manifest.getAuthor();
  }

  getSDKInterfaces(): readonly SDKInterface[] {
    return this.data.sdkInterfaces;
  }

  getValidationResult(): ValidationResult {
    return this.data.validationResult;
  }

  isValid(): boolean {
    return this.data.validationResult.isValid;
  }

  hasWarnings(): boolean {
    return this.data.validationResult.warnings.length > 0;
  }

  getLastUpdated(): Date {
    return this.data.lastUpdated;
  }

  getCacheLocation(): string | undefined {
    return this.data.cacheLocation;
  }

  isLanguagePackage(): boolean {
    return this.data.manifest.isLanguagePackage();
  }

  implementsSDKInterface(interfaceName: string): boolean {
    return this.data.sdkInterfaces.some(iface => iface.name === interfaceName);
  }

  hasLSPSupport(): boolean {
    return this.data.manifest.hasLSPSupport();
  }

  getProofCapabilities(): readonly string[] {
    return this.data.manifest.getProofCapabilities();
  }

  supportsCapability(capability: string): boolean {
    return this.getProofCapabilities().includes(capability);
  }

  withUpdatedValidation(validationResult: ValidationResult): Result<PackageEntity, PackageValidationError> {
    const updatedData = {
      ...this.data,
      validationResult,
      lastUpdated: new Date()
    };

    return PackageEntity.create(updatedData);
  }

  withCacheLocation(cacheLocation: string): Result<PackageEntity, PackageValidationError> {
    if (!cacheLocation.trim()) {
      return Result.failure(new PackageValidationError('Cache location cannot be empty'));
    }

    const updatedData = {
      ...this.data,
      cacheLocation: cacheLocation.trim(),
      lastUpdated: new Date()
    };

    return PackageEntity.create(updatedData);
  }

  equals(other: PackageEntity): boolean {
    return (
      this.data.id.equals(other.data.id) &&
      this.data.source.equals(other.data.source) &&
      this.data.manifest.equals(other.data.manifest)
    );
  }

  toJSON(): object {
    return {
      id: this.data.id.toString(),
      source: this.data.source.toJSON(),
      manifest: this.data.manifest.toJSON(),
      sdkInterfaces: this.data.sdkInterfaces,
      validationResult: this.data.validationResult,
      lastUpdated: this.data.lastUpdated.toISOString(),
      cacheLocation: this.data.cacheLocation
    };
  }
}