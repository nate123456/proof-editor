import { describe, expect, it } from 'vitest';
import type { DocumentId, PackageId } from '../../shared/value-objects.js';
import { Version } from '../../shared/value-objects.js';
import {
  type ActivationContext,
  type CleanupResult,
  type InstallationSource,
  PackageActivated,
  type PackageCapability,
  type PackageConflictDetails,
  PackageConflictDetected,
  PackageDeactivated,
  PackageDependencyResolved,
  PackageInstalled,
  PackageRegistryUpdated,
  PackageSecurityViolationDetected,
  PackageUninstalled,
  PackageUpdated,
  PackageValidated,
  type PackageValidationResult,
  type SecurityViolationDetails,
  type UpdateResult,
  type ValidationContext,
} from '../package-events.js';

const mockPackageId = { getValue: () => 'test-package-id' } as PackageId;
const versionResult = Version.create(1);
if (versionResult.isErr()) throw new Error('Failed to create version');
const mockVersion = versionResult.value;
const mockDocumentId = { getValue: () => 'test-document-id' } as DocumentId;

describe('PackageInstalled', () => {
  const mockInstallationSource: InstallationSource = {
    type: 'github',
    location: 'https://github.com/test/package',
    verified: true,
    checksum: 'abc123',
  };

  const mockCapabilities: PackageCapability[] = [
    {
      type: 'validation',
      name: 'logical-validator',
      version: '1.0.0',
      description: 'Validates logical arguments',
      permissions: ['read', 'validate'],
    },
  ];

  it('should create event with correct properties', () => {
    const event = new PackageInstalled(
      mockPackageId,
      mockVersion,
      mockInstallationSource,
      'test-user',
      mockCapabilities,
    );

    expect(event.eventType).toBe('PackageInstalled');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.version).toBe(mockVersion);
    expect(event.installationSource).toBe(mockInstallationSource);
    expect(event.installedBy).toBe('test-user');
    expect(event.capabilities).toBe(mockCapabilities);
  });

  it('should serialize event data correctly', () => {
    const event = new PackageInstalled(
      mockPackageId,
      mockVersion,
      mockInstallationSource,
      'test-user',
      mockCapabilities,
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      version: 1,
      installationSource: mockInstallationSource,
      installedBy: 'test-user',
      capabilities: mockCapabilities,
    });
  });

  it('should create valid event record', () => {
    const event = new PackageInstalled(
      mockPackageId,
      mockVersion,
      mockInstallationSource,
      'test-user',
      mockCapabilities,
    );

    const record = event.toEventRecord();

    expect(record.eventType).toBe('PackageInstalled');
    expect(record.aggregateId).toBe('test-package-id');
    expect(record.aggregateType).toBe('Package');
    expect(record.eventVersion).toBe(1);
    expect(record.eventData).toEqual(event.eventData);
    expect(record.metadata).toEqual({});
  });
});

describe('PackageUpdated', () => {
  const prevVersionResult = Version.create(0);
  if (prevVersionResult.isErr()) throw new Error('Failed to create previous version');
  const mockPreviousVersion = prevVersionResult.value;
  const mockUpdateResult: UpdateResult = {
    success: true,
    warnings: ['Minor compatibility issue'],
    errors: [],
    backupCreated: true,
    rollbackAvailable: true,
    migrationApplied: false,
    affectedDocuments: [mockDocumentId],
  };

  it('should create event with correct properties', () => {
    const event = new PackageUpdated(
      mockPackageId,
      mockPreviousVersion,
      mockVersion,
      mockUpdateResult,
      'test-user',
    );

    expect(event.eventType).toBe('PackageUpdated');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.previousVersion).toBe(mockPreviousVersion);
    expect(event.newVersion).toBe(mockVersion);
    expect(event.updateResult).toBe(mockUpdateResult);
    expect(event.updatedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageUpdated(
      mockPackageId,
      mockPreviousVersion,
      mockVersion,
      mockUpdateResult,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      previousVersion: 0,
      newVersion: 1,
      updateResult: mockUpdateResult,
      updatedBy: 'test-user',
    });
  });
});

describe('PackageUninstalled', () => {
  const mockCleanupResult: CleanupResult = {
    success: true,
    filesRemoved: ['/path/to/package'],
    configurationsCleaned: ['validation-rules'],
    dependenciesRemoved: [mockPackageId],
    warnings: ['Some user data preserved'],
    orphanedData: [],
  };

  it('should create event with correct properties', () => {
    const event = new PackageUninstalled(
      mockPackageId,
      mockVersion,
      'user_request',
      'test-user',
      mockCleanupResult,
    );

    expect(event.eventType).toBe('PackageUninstalled');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.version).toBe(mockVersion);
    expect(event.uninstallReason).toBe('user_request');
    expect(event.uninstalledBy).toBe('test-user');
    expect(event.cleanupResult).toBe(mockCleanupResult);
  });

  it('should serialize event data correctly', () => {
    const event = new PackageUninstalled(
      mockPackageId,
      mockVersion,
      'security_violation',
      'system',
      mockCleanupResult,
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      version: 1,
      uninstallReason: 'security_violation',
      uninstalledBy: 'system',
      cleanupResult: mockCleanupResult,
    });
  });
});

describe('PackageValidated', () => {
  const mockValidationResult: PackageValidationResult = {
    isValid: true,
    securityScore: 85,
    compatibilityScore: 90,
    performanceScore: 80,
    issues: [],
    recommendations: ['Consider updating dependencies'],
    trustedSource: true,
  };

  const mockValidationContext: ValidationContext = {
    validationLevel: 'strict',
    includeSecurityCheck: true,
    includePerformanceCheck: true,
    includeCompatibilityCheck: true,
    customRules: ['no-eval', 'secure-dependencies'],
  };

  it('should create event with correct properties', () => {
    const event = new PackageValidated(
      mockPackageId,
      mockVersion,
      mockValidationResult,
      'validator-service',
      mockValidationContext,
    );

    expect(event.eventType).toBe('PackageValidated');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.version).toBe(mockVersion);
    expect(event.validationResult).toBe(mockValidationResult);
    expect(event.validatedBy).toBe('validator-service');
    expect(event.validationContext).toBe(mockValidationContext);
  });

  it('should serialize event data correctly', () => {
    const event = new PackageValidated(
      mockPackageId,
      mockVersion,
      mockValidationResult,
      'validator-service',
      mockValidationContext,
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      version: 1,
      validationResult: mockValidationResult,
      validatedBy: 'validator-service',
      validationContext: mockValidationContext,
    });
  });
});

describe('PackageDependencyResolved', () => {
  const mockDependencyId = { getValue: () => 'dependency-package-id' } as PackageId;
  const depVersionResult = Version.create(2);
  if (depVersionResult.isErr()) throw new Error('Failed to create dependency version');
  const mockDependencyVersion = depVersionResult.value;

  it('should create event with correct properties', () => {
    const event = new PackageDependencyResolved(
      mockPackageId,
      mockDependencyId,
      mockDependencyVersion,
      'compatible_version',
      'dependency-resolver',
    );

    expect(event.eventType).toBe('PackageDependencyResolved');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.dependencyId).toBe(mockDependencyId);
    expect(event.dependencyVersion).toBe(mockDependencyVersion);
    expect(event.resolutionStrategy).toBe('compatible_version');
    expect(event.resolvedBy).toBe('dependency-resolver');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageDependencyResolved(
      mockPackageId,
      mockDependencyId,
      mockDependencyVersion,
      'latest_compatible',
      'dependency-resolver',
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      dependencyId: 'dependency-package-id',
      dependencyVersion: 2,
      resolutionStrategy: 'latest_compatible',
      resolvedBy: 'dependency-resolver',
    });
  });
});

describe('PackageConflictDetected', () => {
  const mockConflictingPackages = [mockPackageId, { getValue: () => 'other-package' } as PackageId];
  const mockConflictDetails: PackageConflictDetails = {
    description: 'Both packages provide conflicting validation rules',
    affectedCapabilities: ['validation'],
    resolutionOptions: [
      {
        strategy: 'version_override',
        description: 'Use newer version',
        impact: 'May break existing validations',
        recommended: true,
      },
    ],
    impactAssessment: {
      severity: 'medium',
      affectedDocuments: [mockDocumentId],
      featureLoss: [],
      dataIntegrity: true,
    },
    automaticResolution: false,
  };

  it('should create event with correct properties', () => {
    const event = new PackageConflictDetected(
      mockConflictingPackages,
      'capability_conflict',
      mockConflictDetails,
      'conflict-detector',
    );

    expect(event.eventType).toBe('PackageConflictDetected');
    expect(event.aggregateId).toBe('package-system');
    expect(event.aggregateType).toBe('PackageSystem');
    expect(event.conflictingPackages).toBe(mockConflictingPackages);
    expect(event.conflictType).toBe('capability_conflict');
    expect(event.conflictDetails).toBe(mockConflictDetails);
    expect(event.detectedBy).toBe('conflict-detector');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageConflictDetected(
      mockConflictingPackages,
      'version_conflict',
      mockConflictDetails,
      'conflict-detector',
    );

    const data = event.eventData;

    expect(data).toEqual({
      conflictingPackages: ['test-package-id', 'other-package'],
      conflictType: 'version_conflict',
      conflictDetails: mockConflictDetails,
      detectedBy: 'conflict-detector',
    });
  });
});

describe('PackageActivated', () => {
  const mockActivationContext: ActivationContext = {
    scope: 'document',
    triggeredBy: 'user_action',
    parameters: { validateOnLoad: true },
    permissions: ['read', 'validate'],
  };

  it('should create event with correct properties', () => {
    const event = new PackageActivated(
      mockPackageId,
      mockDocumentId,
      mockActivationContext,
      'test-user',
    );

    expect(event.eventType).toBe('PackageActivated');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.activationContext).toBe(mockActivationContext);
    expect(event.activatedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageActivated(
      mockPackageId,
      mockDocumentId,
      mockActivationContext,
      'test-user',
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      documentId: 'test-document-id',
      activationContext: mockActivationContext,
      activatedBy: 'test-user',
    });
  });
});

describe('PackageDeactivated', () => {
  it('should create event with correct properties', () => {
    const event = new PackageDeactivated(
      mockPackageId,
      mockDocumentId,
      'document_close',
      'test-user',
    );

    expect(event.eventType).toBe('PackageDeactivated');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.deactivationReason).toBe('document_close');
    expect(event.deactivatedBy).toBe('test-user');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageDeactivated(
      mockPackageId,
      mockDocumentId,
      'security_policy',
      'system',
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      documentId: 'test-document-id',
      deactivationReason: 'security_policy',
      deactivatedBy: 'system',
    });
  });
});

describe('PackageSecurityViolationDetected', () => {
  const mockViolationDetails: SecurityViolationDetails = {
    description: 'Package attempted to access system files',
    evidence: ['file-access-log.txt', 'security-audit.log'],
    potentialImpact: 'Unauthorized file system access',
    recommendedAction: 'Immediately uninstall package',
    affectedResources: ['/etc/passwd', '/var/log'],
  };

  it('should create event with correct properties', () => {
    const event = new PackageSecurityViolationDetected(
      mockPackageId,
      'unauthorized_access',
      mockViolationDetails,
      'security-monitor',
      'critical',
    );

    expect(event.eventType).toBe('PackageSecurityViolationDetected');
    expect(event.aggregateId).toBe('test-package-id');
    expect(event.aggregateType).toBe('Package');
    expect(event.packageId).toBe(mockPackageId);
    expect(event.violationType).toBe('unauthorized_access');
    expect(event.violationDetails).toBe(mockViolationDetails);
    expect(event.detectedBy).toBe('security-monitor');
    expect(event.riskLevel).toBe('critical');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageSecurityViolationDetected(
      mockPackageId,
      'malicious_code',
      mockViolationDetails,
      'security-monitor',
      'high',
    );

    const data = event.eventData;

    expect(data).toEqual({
      packageId: 'test-package-id',
      violationType: 'malicious_code',
      violationDetails: mockViolationDetails,
      detectedBy: 'security-monitor',
      riskLevel: 'high',
    });
  });
});

describe('PackageRegistryUpdated', () => {
  const mockAffectedPackages = [mockPackageId, { getValue: () => 'updated-package' } as PackageId];

  it('should create event with correct properties', () => {
    const event = new PackageRegistryUpdated(
      'https://registry.example.com',
      'package_updated',
      mockAffectedPackages,
      'registry-sync',
    );

    expect(event.eventType).toBe('PackageRegistryUpdated');
    expect(event.aggregateId).toBe('package-registry');
    expect(event.aggregateType).toBe('PackageRegistry');
    expect(event.registrySource).toBe('https://registry.example.com');
    expect(event.updateType).toBe('package_updated');
    expect(event.affectedPackages).toBe(mockAffectedPackages);
    expect(event.updatedBy).toBe('registry-sync');
  });

  it('should serialize event data correctly', () => {
    const event = new PackageRegistryUpdated(
      'https://github.com/packages',
      'security_advisory',
      mockAffectedPackages,
      'security-team',
    );

    const data = event.eventData;

    expect(data).toEqual({
      registrySource: 'https://github.com/packages',
      updateType: 'security_advisory',
      affectedPackages: ['test-package-id', 'updated-package'],
      updatedBy: 'security-team',
    });
  });
});
