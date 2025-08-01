import type { DocumentId, PackageId, Version } from '../shared/value-objects/index.js';
import { DomainEvent } from './base-event.js';

export class PackageInstalled extends DomainEvent {
  readonly eventType = 'PackageInstalled';

  constructor(
    public readonly packageId: PackageId,
    public readonly version: Version,
    public readonly installationSource: InstallationSource,
    public readonly installedBy: string,
    public readonly capabilities: PackageCapability[],
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      version: this.version.getValue(),
      installationSource: this.installationSource,
      installedBy: this.installedBy,
      capabilities: this.capabilities,
    };
  }
}

export class PackageUpdated extends DomainEvent {
  readonly eventType = 'PackageUpdated';

  constructor(
    public readonly packageId: PackageId,
    public readonly previousVersion: Version,
    public readonly newVersion: Version,
    public readonly updateResult: UpdateResult,
    public readonly updatedBy: string,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      previousVersion: this.previousVersion.getValue(),
      newVersion: this.newVersion.getValue(),
      updateResult: this.updateResult,
      updatedBy: this.updatedBy,
    };
  }
}

export class PackageUninstalled extends DomainEvent {
  readonly eventType = 'PackageUninstalled';

  constructor(
    public readonly packageId: PackageId,
    public readonly version: Version,
    public readonly uninstallReason: UninstallReason,
    public readonly uninstalledBy: string,
    public readonly cleanupResult: CleanupResult,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      version: this.version.getValue(),
      uninstallReason: this.uninstallReason,
      uninstalledBy: this.uninstalledBy,
      cleanupResult: this.cleanupResult,
    };
  }
}

export class PackageValidated extends DomainEvent {
  readonly eventType = 'PackageValidated';

  constructor(
    public readonly packageId: PackageId,
    public readonly version: Version,
    public readonly validationResult: PackageValidationResult,
    public readonly validatedBy: string,
    public readonly validationContext: ValidationContext,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      version: this.version.getValue(),
      validationResult: this.validationResult,
      validatedBy: this.validatedBy,
      validationContext: this.validationContext,
    };
  }
}

export class PackageDependencyResolved extends DomainEvent {
  readonly eventType = 'PackageDependencyResolved';

  constructor(
    public readonly packageId: PackageId,
    public readonly dependencyId: PackageId,
    public readonly dependencyVersion: Version,
    public readonly resolutionStrategy: DependencyResolutionStrategy,
    public readonly resolvedBy: string,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      dependencyId: this.dependencyId.getValue(),
      dependencyVersion: this.dependencyVersion.getValue(),
      resolutionStrategy: this.resolutionStrategy,
      resolvedBy: this.resolvedBy,
    };
  }
}

export class PackageConflictDetected extends DomainEvent {
  readonly eventType = 'PackageConflictDetected';

  constructor(
    public readonly conflictingPackages: PackageId[],
    public readonly conflictType: PackageConflictType,
    public readonly conflictDetails: PackageConflictDetails,
    public readonly detectedBy: string,
  ) {
    super('package-system', 'PackageSystem');
  }

  get eventData(): Record<string, unknown> {
    return {
      conflictingPackages: this.conflictingPackages.map((id) => id.getValue()),
      conflictType: this.conflictType,
      conflictDetails: this.conflictDetails,
      detectedBy: this.detectedBy,
    };
  }
}

export class PackageActivated extends DomainEvent {
  readonly eventType = 'PackageActivated';

  constructor(
    public readonly packageId: PackageId,
    public readonly documentId: DocumentId,
    public readonly activationContext: ActivationContext,
    public readonly activatedBy: string,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      documentId: this.documentId.getValue(),
      activationContext: this.activationContext,
      activatedBy: this.activatedBy,
    };
  }
}

export class PackageDeactivated extends DomainEvent {
  readonly eventType = 'PackageDeactivated';

  constructor(
    public readonly packageId: PackageId,
    public readonly documentId: DocumentId,
    public readonly deactivationReason: DeactivationReason,
    public readonly deactivatedBy: string,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      documentId: this.documentId.getValue(),
      deactivationReason: this.deactivationReason,
      deactivatedBy: this.deactivatedBy,
    };
  }
}

export class PackageSecurityViolationDetected extends DomainEvent {
  readonly eventType = 'PackageSecurityViolationDetected';

  constructor(
    public readonly packageId: PackageId,
    public readonly violationType: SecurityViolationType,
    public readonly violationDetails: SecurityViolationDetails,
    public readonly detectedBy: string,
    public readonly riskLevel: RiskLevel,
  ) {
    super(packageId.getValue(), 'Package');
  }

  get eventData(): Record<string, unknown> {
    return {
      packageId: this.packageId.getValue(),
      violationType: this.violationType,
      violationDetails: this.violationDetails,
      detectedBy: this.detectedBy,
      riskLevel: this.riskLevel,
    };
  }
}

export class PackageRegistryUpdated extends DomainEvent {
  readonly eventType = 'PackageRegistryUpdated';

  constructor(
    public readonly registrySource: string,
    public readonly updateType: RegistryUpdateType,
    public readonly affectedPackages: PackageId[],
    public readonly updatedBy: string,
  ) {
    super('package-registry', 'PackageRegistry');
  }

  get eventData(): Record<string, unknown> {
    return {
      registrySource: this.registrySource,
      updateType: this.updateType,
      affectedPackages: this.affectedPackages.map((id) => id.getValue()),
      updatedBy: this.updatedBy,
    };
  }
}

export interface InstallationSource {
  type: 'github' | 'local' | 'registry' | 'url';
  location: string;
  verified: boolean;
  checksum?: string;
}

export interface PackageCapability {
  type: 'validation' | 'syntax_highlighting' | 'analysis' | 'transformation' | 'export';
  name: string;
  version: string;
  description: string;
  permissions: string[];
}

export interface UpdateResult {
  success: boolean;
  warnings: string[];
  errors: string[];
  backupCreated: boolean;
  rollbackAvailable: boolean;
  migrationApplied: boolean;
  affectedDocuments: DocumentId[];
}

export interface CleanupResult {
  success: boolean;
  filesRemoved: string[];
  configurationsCleaned: string[];
  dependenciesRemoved: PackageId[];
  warnings: string[];
  orphanedData: string[];
}

export interface PackageValidationResult {
  isValid: boolean;
  securityScore: number;
  compatibilityScore: number;
  performanceScore: number;
  issues: ValidationIssue[];
  recommendations: string[];
  trustedSource: boolean;
}

export interface ValidationContext {
  validationLevel: 'basic' | 'standard' | 'strict' | 'paranoid';
  includeSecurityCheck: boolean;
  includePerformanceCheck: boolean;
  includeCompatibilityCheck: boolean;
  customRules: string[];
}

export interface ValidationIssue {
  type: 'security' | 'compatibility' | 'performance' | 'quality' | 'compliance';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  location?: string;
  recommendation?: string;
}

export interface PackageConflictDetails {
  description: string;
  affectedCapabilities: string[];
  resolutionOptions: ResolutionOption[];
  impactAssessment: ConflictImpact;
  automaticResolution: boolean;
}

export interface ResolutionOption {
  strategy: 'version_override' | 'feature_disable' | 'alternative_package' | 'manual_configuration';
  description: string;
  impact: string;
  recommended: boolean;
}

export interface ConflictImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDocuments: DocumentId[];
  featureLoss: string[];
  dataIntegrity: boolean;
}

export interface ActivationContext {
  scope: 'document' | 'tree' | 'statement' | 'global';
  triggeredBy: 'user_action' | 'document_open' | 'validation_request' | 'automatic';
  parameters: Record<string, unknown>;
  permissions: string[];
}

export interface SecurityViolationDetails {
  description: string;
  evidence: string[];
  potentialImpact: string;
  recommendedAction: string;
  affectedResources: string[];
}

export type UninstallReason =
  | 'user_request'
  | 'security_violation'
  | 'conflict_resolution'
  | 'dependency_cleanup'
  | 'system_maintenance'
  | 'package_obsolete';

export type DependencyResolutionStrategy =
  | 'exact_match'
  | 'compatible_version'
  | 'latest_compatible'
  | 'user_choice'
  | 'automatic_update'
  | 'conflict_resolution';

export type PackageConflictType =
  | 'version_conflict'
  | 'capability_conflict'
  | 'dependency_conflict'
  | 'resource_conflict'
  | 'permission_conflict'
  | 'api_conflict';

export type DeactivationReason =
  | 'user_request'
  | 'document_close'
  | 'security_policy'
  | 'performance_issue'
  | 'error_condition'
  | 'resource_cleanup';

export type SecurityViolationType =
  | 'unauthorized_access'
  | 'malicious_code'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'sandbox_escape'
  | 'resource_abuse';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

export type RegistryUpdateType =
  | 'package_added'
  | 'package_updated'
  | 'package_removed'
  | 'metadata_updated'
  | 'security_advisory'
  | 'deprecation_notice';
