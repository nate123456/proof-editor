import { err, ok, type Result } from 'neverthrow';

import type { SDKInterface, ValidationResult } from '../types/common-types.js';
import { PackageValidationError } from '../types/domain-errors.js';
import { type PackageId } from '../value-objects/package-id.js';
import { type PackageManifest } from '../value-objects/package-manifest.js';
import { type PackageSource } from '../value-objects/package-source.js';

export interface PackageData {
  readonly id: PackageId;
  readonly source: PackageSource;
  readonly manifest: PackageManifest;
  readonly sdkInterfaces: readonly SDKInterface[];
  readonly validationResult: ValidationResult;
  readonly lastUpdated: Date;
  readonly cacheLocation?: string;
}

export class Package {
  private constructor(private readonly data: PackageData) {}

  static create(
    data: Omit<PackageData, 'lastUpdated'> & { lastUpdated?: Date }
  ): Result<Package, PackageValidationError> {
    if (!data.manifest.getPackageId().equals(data.id)) {
      return err(new PackageValidationError('Package ID must match manifest name'));
    }

    if (!data.validationResult.isValid && data.validationResult.errors.length === 0) {
      return err(
        new PackageValidationError('Invalid validation result: must have errors if not valid')
      );
    }

    if (data.sdkInterfaces.length > 0 && !data.manifest.hasLSPSupport()) {
      return err(new PackageValidationError('Package with SDK interfaces must have LSP support'));
    }

    const entityData: PackageData = {
      ...data,
      lastUpdated: data.lastUpdated || new Date(),
    };

    return ok(new Package(entityData));
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

  withUpdatedValidation(
    validationResult: ValidationResult
  ): Result<Package, PackageValidationError> {
    const updatedData = {
      ...this.data,
      validationResult,
      lastUpdated: new Date(),
    };

    return Package.create(updatedData);
  }

  withCacheLocation(cacheLocation: string): Result<Package, PackageValidationError> {
    if (!cacheLocation.trim()) {
      return err(new PackageValidationError('Cache location cannot be empty'));
    }

    const updatedData = {
      ...this.data,
      cacheLocation: cacheLocation.trim(),
      lastUpdated: new Date(),
    };

    return Package.create(updatedData);
  }

  equals(other: Package): boolean {
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
      cacheLocation: this.data.cacheLocation,
    };
  }
}
