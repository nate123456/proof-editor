import { err, ok } from 'neverthrow';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValidationResult as LIValidationResult } from '../../../contexts/language-intelligence/domain/entities/ValidationResult.js';
import type { LogicValidationService } from '../../../contexts/language-intelligence/domain/services/LogicValidationService.js';
import type { PatternRecognitionService } from '../../../contexts/language-intelligence/domain/services/PatternRecognitionService.js';
import { Package } from '../../../contexts/package-ecosystem/domain/entities/Package.js';
import { PackageVersion } from '../../../contexts/package-ecosystem/domain/entities/PackageVersion.js';
import type { DependencyResolutionService } from '../../../contexts/package-ecosystem/domain/services/DependencyResolutionService.js';
import type { PackageValidationService } from '../../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import type { PackageDiscoveryService } from '../../../contexts/package-ecosystem/domain/services/package-discovery-service.js';
import type { ValidationResult as PackageValidationResult } from '../../../contexts/package-ecosystem/domain/types/common-types.js';
import { PackageNotFoundError } from '../../../contexts/package-ecosystem/domain/types/domain-errors.js';
import { PackageId } from '../../../contexts/package-ecosystem/domain/value-objects/package-id.js';
import { PackageManifest } from '../../../contexts/package-ecosystem/domain/value-objects/package-manifest.js';
import { PackageSource } from '../../../contexts/package-ecosystem/domain/value-objects/package-source.js';
import type { OperationCoordinationService } from '../../../contexts/synchronization/domain/services/OperationCoordinationService.js';
import { Statement } from '../../../domain/entities/Statement.js';
import type { PathCompletenessService } from '../../../domain/services/PathCompletenessService.js';
import type { StatementFlowService } from '../../../domain/services/StatementFlowService.js';
import type { TreeStructureService } from '../../../domain/services/TreeStructureService.js';
import { OrchestrationError } from '../../errors/OrchestrationErrors.js';
import type {
  ContextConflict,
  CrossContextSyncRequest,
  PackageInstallationRequest,
  ProofValidationRequest,
} from '../../interfaces/OrchestrationInterfaces.js';
import { CrossContextOrchestrationService } from '../CrossContextOrchestrationService.js';

describe('CrossContextOrchestrationService', () => {
  let orchestrationService: CrossContextOrchestrationService;
  let mockStatementFlow: StatementFlowService;
  let mockTreeStructure: TreeStructureService;
  let mockPathCompleteness: PathCompletenessService;
  let mockLogicValidation: LogicValidationService;
  let mockPatternRecognition: PatternRecognitionService;
  let mockPackageValidation: PackageValidationService;
  let mockDependencyResolution: DependencyResolutionService;
  let mockPackageDiscovery: PackageDiscoveryService;
  let mockOperationCoordination: OperationCoordinationService;

  beforeEach(() => {
    // Create mock services
    mockStatementFlow = {
      createStatementFromContent: vi.fn() as MockedFunction<
        StatementFlowService['createStatementFromContent']
      >,
    } as unknown as StatementFlowService;

    mockTreeStructure = {} as unknown as TreeStructureService;
    mockPathCompleteness = {} as unknown as PathCompletenessService;

    mockLogicValidation = {
      validateInference: vi.fn() as MockedFunction<LogicValidationService['validateInference']>,
    } as unknown as LogicValidationService;

    mockPatternRecognition = {} as unknown as PatternRecognitionService;

    mockPackageValidation = {
      validatePackage: vi.fn() as MockedFunction<PackageValidationService['validatePackage']>,
    } as unknown as PackageValidationService;

    mockDependencyResolution = {} as unknown as DependencyResolutionService;

    mockPackageDiscovery = {
      findPackageById: vi.fn() as MockedFunction<PackageDiscoveryService['findPackageById']>,
    } as unknown as PackageDiscoveryService;

    mockOperationCoordination = {
      applyOperation: vi.fn() as MockedFunction<OperationCoordinationService['applyOperation']>,
    } as unknown as OperationCoordinationService;

    orchestrationService = new CrossContextOrchestrationService(
      mockStatementFlow,
      mockTreeStructure,
      mockPathCompleteness,
      mockLogicValidation,
      mockPatternRecognition,
      mockPackageValidation,
      mockDependencyResolution,
      mockPackageDiscovery,
      mockOperationCoordination,
    );
  });

  describe('orchestrateProofValidation', () => {
    it('should successfully orchestrate proof validation across all contexts', async () => {
      // Arrange
      const request: ProofValidationRequest = {
        requestId: 'test-validation-001',
        contexts: ['core', 'language-intelligence', 'package-ecosystem', 'synchronization'],
        priority: 'high',
        statements: ['All humans are mortal', 'Socrates is human', 'Therefore, Socrates is mortal'],
        packageDependencies: [],
      };

      // Mock successful statement creation
      const stmt1Result = Statement.create('All humans are mortal');
      const stmt2Result = Statement.create('Socrates is human');
      const stmt3Result = Statement.create('Therefore, Socrates is mortal');

      if (stmt1Result.isErr() || stmt2Result.isErr() || stmt3Result.isErr()) {
        throw new Error('Failed to create test statements');
      }

      const mockStatement1 = stmt1Result.value;
      const mockStatement2 = stmt2Result.value;
      const mockStatement3 = stmt3Result.value;

      vi.mocked(mockStatementFlow.createStatementFromContent).mockImplementation(
        (content: string) => {
          if (content === 'All humans are mortal') return ok(mockStatement1);
          if (content === 'Socrates is human') return ok(mockStatement2);
          if (content === 'Therefore, Socrates is mortal') return ok(mockStatement3);
          return err(new Error('Unknown content'));
        },
      );

      // Mock successful logic validation
      const mockValidationResult = {
        isValid: vi.fn().mockReturnValue(true),
        getDiagnostics: vi.fn().mockReturnValue([]),
      } as unknown as LIValidationResult;
      vi.mocked(mockLogicValidation.validateInference).mockReturnValue(ok(mockValidationResult));

      // Mock successful operation coordination
      vi.mocked(mockOperationCoordination.applyOperation).mockResolvedValue(ok(undefined));

      // Act
      const result = await orchestrationService.orchestrateProofValidation(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.requestId).toBe('test-validation-001');
        expect(validationResult.success).toBe(true);
        expect(validationResult.structuralValid).toBe(true);
        expect(validationResult.logicalValid).toBe(true);
        expect(validationResult.dependenciesResolved).toBe(true);
        expect(validationResult.syncCoordinated).toBe(true);
        expect(validationResult.errors).toHaveLength(0);
        expect(validationResult.contextResults.size).toBe(4);
      }
    });

    it('should handle statement creation failures', async () => {
      // Arrange
      const request: ProofValidationRequest = {
        requestId: 'test-validation-002',
        contexts: ['core'],
        priority: 'medium',
        statements: ['Invalid statement'],
        packageDependencies: [],
      };

      // Mock failed statement creation
      vi.mocked(mockStatementFlow.createStatementFromContent).mockReturnValue(
        err(new Error('Invalid statement content')),
      );

      // Act
      const result = await orchestrationService.orchestrateProofValidation(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.structuralValid).toBe(false);
        expect(validationResult.errors).toContain('Failed to create all statement entities');
      }
    });

    it('should handle package validation failures', async () => {
      // Arrange
      const packageId = PackageId.create('test-package');
      const source = PackageSource.createFromGit({
        url: 'https://github.com/test/package',
        ref: 'main',
      });
      const manifest = PackageManifest.create({
        name: 'Test Package',
        version: '1.0.0',
        description: 'Test package',
        author: 'Test Author',
      });

      expect(packageId.isOk()).toBe(true);
      expect(source.isOk()).toBe(true);
      expect(manifest.isOk()).toBe(true);

      if (packageId.isOk() && source.isOk() && manifest.isOk()) {
        const version = PackageVersion.createNew(packageId.value, '1.0.0', source.value);
        expect(version.isOk()).toBe(true);

        if (version.isOk()) {
          const validationResult: PackageValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
          };

          const pkg = Package.create({
            id: packageId.value,
            source: source.value,
            manifest: manifest.value,
            sdkInterfaces: [],
            validationResult,
          });
          expect(pkg.isOk()).toBe(true);

          if (pkg.isOk()) {
            const request: ProofValidationRequest = {
              requestId: 'test-validation-003',
              contexts: ['package-ecosystem'],
              priority: 'medium',
              statements: ['Some statement'],
              packageDependencies: [pkg.value],
            };

            // Mock failed package validation
            const failedValidation: PackageValidationResult = {
              isValid: false,
              errors: ['Invalid package'],
              warnings: [],
            };
            vi.mocked(mockPackageValidation.validatePackage).mockResolvedValue(
              ok(failedValidation),
            );

            // Mock successful statement creation to isolate package validation failure
            const stmtResult = Statement.create('Some statement');
            if (stmtResult.isErr()) {
              throw new Error('Failed to create test statement');
            }
            const mockStatement = stmtResult.value;
            vi.mocked(mockStatementFlow.createStatementFromContent).mockReturnValue(
              ok(mockStatement),
            );

            // Act
            const result = await orchestrationService.orchestrateProofValidation(request);

            // Assert
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const validationResult = result.value;
              expect(validationResult.dependenciesResolved).toBe(false);
              expect(validationResult.errors).toContain(
                `Package validation failed: ${pkg.value.getId().toString()}`,
              );
            }
          }
        }
      }
    });
  });

  describe('coordinatePackageInstallation', () => {
    it('should successfully coordinate package installation', async () => {
      // Arrange
      const request: PackageInstallationRequest = {
        requestId: 'test-install-001',
        contexts: ['package-ecosystem'],
        priority: 'medium',
        packageId: 'test-package',
        version: '1.0.0',
        source: 'https://github.com/test/package',
      };

      // Mock successful package discovery
      const mockPackage = {} as Package;
      vi.mocked(mockPackageDiscovery.findPackageById).mockResolvedValue(ok(mockPackage));

      // Act
      const result = await orchestrationService.coordinatePackageInstallation(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installResult = result.value;
        expect(installResult.requestId).toBe('test-install-001');
        expect(installResult.installed).toBe(true);
        expect(installResult.installedVersion).toBe('1.0.0');
      }
    });

    it('should handle package installation failures', async () => {
      // Arrange
      const request: PackageInstallationRequest = {
        requestId: 'test-install-002',
        contexts: ['package-ecosystem'],
        priority: 'medium',
        packageId: 'nonexistent-package',
        version: '1.0.0',
        source: 'https://github.com/test/nonexistent',
      };

      // Mock failed package discovery
      vi.mocked(mockPackageDiscovery.findPackageById).mockResolvedValue(
        err(new PackageNotFoundError('Package not found')),
      );

      // Act
      const result = await orchestrationService.coordinatePackageInstallation(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const installResult = result.value;
        expect(installResult.installed).toBe(false);
      }
    });
  });

  describe('synchronizeAcrossContexts', () => {
    it('should successfully synchronize across contexts', async () => {
      // Arrange
      const request: CrossContextSyncRequest = {
        requestId: 'test-sync-001',
        contexts: ['synchronization'],
        priority: 'high',
        syncType: 'incremental',
        deviceId: 'test-device-001',
        changes: [{ type: 'statement_added', data: 'New statement' }],
      };

      // Act
      const result = await orchestrationService.synchronizeAcrossContexts(request);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const syncResult = result.value;
        expect(syncResult.requestId).toBe('test-sync-001');
        expect(syncResult.synced).toBe(true);
        expect(syncResult.syncedChanges).toBe(1);
        expect(syncResult.conflictsResolved).toBe(0);
      }
    });

    it('should handle invalid device ID', async () => {
      // Arrange
      const request: CrossContextSyncRequest = {
        requestId: 'test-sync-002',
        contexts: ['synchronization'],
        priority: 'medium',
        syncType: 'full',
        deviceId: '', // Invalid empty device ID
        changes: [],
      };

      // Act
      const result = await orchestrationService.synchronizeAcrossContexts(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(OrchestrationError);
        expect(result.error.message).toContain('Invalid device ID');
      }
    });
  });

  describe('handleCrossContextConflict', () => {
    it('should successfully resolve conflicts', async () => {
      // Arrange
      const conflict: ContextConflict = {
        conflictId: 'conflict-001',
        contexts: ['language-intelligence', 'package-ecosystem'],
        description: 'Conflicting validation results',
        severity: 'medium',
        conflictData: { result1: true, result2: false },
      };

      // Act
      const result = await orchestrationService.handleCrossContextConflict(conflict);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resolution = result.value;
        expect(resolution.conflictId).toBe('conflict-001');
        expect(resolution.resolution).toBe('automatic');
        expect(resolution.strategy).toBe('last-write-wins');
      }
    });
  });

  describe('error handling', () => {
    it('should handle service exceptions gracefully', async () => {
      // Arrange
      const request: ProofValidationRequest = {
        requestId: 'test-error-001',
        contexts: ['core'],
        priority: 'low',
        statements: ['Test statement'],
        packageDependencies: [],
      };

      // Mock service to throw exception
      vi.mocked(mockStatementFlow.createStatementFromContent).mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      // Act
      const result = await orchestrationService.orchestrateProofValidation(request);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(OrchestrationError);
        expect(result.error.message).toContain('Proof validation orchestration failed');
      }
    });
  });
});
