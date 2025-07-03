/**
 * Cross-Context Communication Integration Tests
 *
 * Tests communication and coordination between all bounded contexts:
 * - Language Intelligence ↔ Core Domain communication
 * - Package Ecosystem ↔ Language Intelligence integration
 * - Synchronization ↔ All contexts for collaborative features
 * - Event-driven communication patterns
 * - Domain boundary enforcement and translation
 * - End-to-end workflows spanning multiple contexts
 */

import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Language Intelligence Context
import { LanguagePackage } from '../../contexts/language-intelligence/domain/entities/LanguagePackage.js';
import { LogicValidationService } from '../../contexts/language-intelligence/domain/services/LogicValidationService.js';
import { PatternRecognitionService } from '../../contexts/language-intelligence/domain/services/PatternRecognitionService.js';
import { LanguageCapabilities } from '../../contexts/language-intelligence/domain/value-objects/LanguageCapabilities.js';
import { ValidationLevel } from '../../contexts/language-intelligence/domain/value-objects/ValidationLevel.js';
// Package Ecosystem Context
import { Package } from '../../contexts/package-ecosystem/domain/entities/Package.js';
import { PackageVersion } from '../../contexts/package-ecosystem/domain/entities/PackageVersion.js';
import { DependencyResolutionService } from '../../contexts/package-ecosystem/domain/services/DependencyResolutionService.js';
import { PackageDiscoveryService } from '../../contexts/package-ecosystem/domain/services/package-discovery-service.js';
import { PackageValidationService } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import { VersionResolutionService } from '../../contexts/package-ecosystem/domain/services/VersionResolutionService.js';
import { PackageId } from '../../contexts/package-ecosystem/domain/value-objects/package-id.js';
import { PackageManifest } from '../../contexts/package-ecosystem/domain/value-objects/package-manifest.js';
import { PackageSource } from '../../contexts/package-ecosystem/domain/value-objects/package-source.js';
// Synchronization Context
import { Operation } from '../../contexts/synchronization/domain/entities/Operation.js';
import { SyncState } from '../../contexts/synchronization/domain/entities/SyncState.js';
import { VectorClock } from '../../contexts/synchronization/domain/entities/VectorClock.js';
import { OperationCoordinationService } from '../../contexts/synchronization/domain/services/OperationCoordinationService.js';
import { DeviceId } from '../../contexts/synchronization/domain/value-objects/DeviceId.js';
import { LogicalTimestamp } from '../../contexts/synchronization/domain/value-objects/LogicalTimestamp.js';
import { OperationId } from '../../contexts/synchronization/domain/value-objects/OperationId.js';
import { OperationPayload } from '../../contexts/synchronization/domain/value-objects/OperationPayload.js';
import { OperationType } from '../../contexts/synchronization/domain/value-objects/OperationType.js';
import { PathCompletenessService } from '../../domain/services/PathCompletenessService.js';
// Core Domain
import { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../domain/services/TreeStructureService.js';
// Shared (used in comments and future implementation)
// import { SourceLocation } from '../../domain/shared/index.js';

/**
 * Integration orchestrator that coordinates actions across bounded contexts
 * This simulates the application layer that would coordinate these services
 */
class CrossContextOrchestrator {
  constructor(
    private coreServices: {
      statementFlow: StatementFlowService;
      treeStructure: TreeStructureService;
      pathCompleteness: PathCompletenessService;
    },
    private languageIntelligence: {
      validation: LogicValidationService;
      patternRecognition: PatternRecognitionService;
      defaultPackage: LanguagePackage;
    },
    private packageEcosystem: {
      packageValidation: PackageValidationService;
      dependencyResolution: DependencyResolutionService;
      packageDiscovery: PackageDiscoveryService;
    },
    private synchronization: {
      operationCoordination: OperationCoordinationService;
      deviceId: DeviceId;
    }
  ) {}

  /**
   * Validates a proof structure with package dependencies and sync coordination
   */
  async validateProofWithDependencies(
    statements: string[],
    packageDependencies: Package[]
  ): Promise<{
    structuralValid: boolean;
    logicalValid: boolean;
    dependenciesResolved: boolean;
    syncCoordinated: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 1. Core Domain: Create statement structure
    const statementEntities = statements.map(content =>
      this.coreServices.statementFlow.createStatementFromContent(content)
    );

    const validStatements = statementEntities.filter(stmt => stmt.isOk()).map(stmt => stmt.value);

    if (validStatements.length !== statements.length) {
      errors.push('Failed to create all statement entities');
    }

    // 2. Package Ecosystem: Validate dependencies
    let dependenciesResolved = true;
    for (const pkg of packageDependencies) {
      const validation = this.packageEcosystem.packageValidation.validatePackageStructure(pkg);
      if (validation.isErr() || !validation.value.isValid) {
        dependenciesResolved = false;
        errors.push(`Package validation failed: ${pkg.getId().toString()}`);
      }
    }

    // 3. Language Intelligence: Validate logic
    let logicalValid = true;
    if (statements.length >= 2) {
      const premises = statements.slice(0, -1);
      const conclusions = [statements[statements.length - 1]!];

      const validationResult = this.languageIntelligence.validation.validateInference(
        premises,
        conclusions,
        this.languageIntelligence.defaultPackage,
        ValidationLevel.semantic()
      );

      if (validationResult.isErr() || !validationResult.value.isValid) {
        logicalValid = false;
        errors.push('Logical validation failed');
      }
    }

    // 4. Synchronization: Coordinate validation operation
    const vectorClock = VectorClock.create(this.synchronization.deviceId);
    let syncCoordinated = false;

    if (vectorClock.isOk()) {
      const incrementResult = vectorClock.value.incrementForDevice(this.synchronization.deviceId);

      if (incrementResult.isOk()) {
        const operationId = OperationId.create('proof-validation');
        const timestamp = LogicalTimestamp.create(
          this.synchronization.deviceId,
          Date.now(),
          incrementResult.value
        );
        const opType = OperationType.create('PROOF_VALIDATION');

        if (opType.isOk()) {
          const payload = OperationPayload.create(
            {
              statements,
              validationResult: { logicalValid, dependenciesResolved },
            },
            opType.value
          );

          if (operationId.isOk() && timestamp.isOk() && opType.isOk() && payload.isOk()) {
            const operation = Operation.create(
              operationId.value,
              opType.value,
              payload.value,
              this.synchronization.deviceId,
              timestamp.value,
              incrementResult.value
            );

            if (operation.isOk()) {
              const syncState = SyncState.create(this.synchronization.deviceId);
              if (syncState.isOk()) {
                const coordinationResult =
                  await this.synchronization.operationCoordination.applyOperation(
                    operation.value,
                    syncState.value
                  );
                syncCoordinated = coordinationResult.isOk();
              }
            }
          }
        }
      }
    }

    if (!syncCoordinated) {
      errors.push('Synchronization coordination failed');
    }

    // 5. Core Domain: Final structural validation
    const structuralValid = validStatements.length === statements.length && errors.length === 0;

    return {
      structuralValid,
      logicalValid,
      dependenciesResolved,
      syncCoordinated,
      errors,
    };
  }

  /**
   * Discovers and validates language packages for proof construction
   */
  async discoverLanguagePackagesForProof(proofPatterns: string[]): Promise<{
    discoveredPackages: Package[];
    validatedPackages: LanguagePackage[];
    recommendations: string[];
  }> {
    // Simulate async package discovery
    await Promise.resolve();

    const discoveredPackages: Package[] = [];
    const validatedPackages: LanguagePackage[] = [];
    const recommendations: string[] = [];

    // Mock package discovery based on patterns
    if (proofPatterns.includes('logic')) {
      const logicPackageId = PackageId.create('logic-package');
      const logicSource = PackageSource.createFromGit({
        url: 'https://github.com/logic/package',
        ref: 'main',
      });
      const logicManifest = PackageManifest.create({
        name: 'Logic Package',
        version: '2.0.0',
        description: 'Logic validation package',
        author: 'Test Author',
      });

      if (logicPackageId.isOk() && logicManifest.isOk() && logicSource.isOk()) {
        const logicVersion = PackageVersion.createNew(
          logicPackageId.value,
          '2.0.0',
          logicSource.value
        );

        if (logicVersion.isOk()) {
          const logicPackage = Package.create(
            logicPackageId.value,
            logicVersion.value.getVersion(),
            logicManifest.value,
            logicSource.value
          );

          if (logicPackage.isOk()) {
            discoveredPackages.push(logicPackage.value);
            recommendations.push('Logic package recommended for formal reasoning');
          }
        }
      }
    }

    if (proofPatterns.includes('mathematics')) {
      recommendations.push('Consider adding mathematics package for numerical reasoning');
    }

    return {
      discoveredPackages,
      validatedPackages,
      recommendations,
    };
  }
}

describe('Cross-Context Communication Integration', () => {
  let orchestrator: CrossContextOrchestrator;
  let testDevice: DeviceId;
  let testLanguagePackage: LanguagePackage;

  beforeEach(() => {
    // Initialize all services
    const coreServices = {
      statementFlow: new StatementFlowService(),
      treeStructure: new TreeStructureService(),
      pathCompleteness: new PathCompletenessService(),
    };

    // Create test language package
    const capabilities = LanguageCapabilities.propositionalOnly();
    const languagePackageResult = LanguagePackage.create(
      'Test Integration Package',
      '1.0.0',
      capabilities
    );
    expect(languagePackageResult.isOk()).toBe(true);
    if (languagePackageResult.isOk()) {
      testLanguagePackage = languagePackageResult.value;
    }

    const languageIntelligence = {
      validation: new LogicValidationService(),
      patternRecognition: new PatternRecognitionService(),
      defaultPackage: testLanguagePackage,
    };

    // Mock repositories for package ecosystem
    const mockPackageRepo = {
      findById: vi.fn(),
      findByName: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      exists: vi.fn(),
      findBySource: vi.fn(),
      findByVersion: vi.fn(),
      findInstalled: vi.fn(),
    };

    const mockDependencyRepo = {
      findDependenciesForPackage: vi.fn().mockResolvedValue(ok([])),
      findPackagesThatDependOn: vi.fn(),
      save: vi.fn(),
      findByPackageId: vi.fn(),
      findDependentsOf: vi.fn(),
      findTransitiveDependencies: vi.fn(),
      delete: vi.fn(),
      deleteByPackageId: vi.fn(),
      exists: vi.fn(),
      hasCycle: vi.fn(),
    };

    const packageEcosystem = {
      packageValidation: new PackageValidationService(),
      packageDiscovery: new PackageDiscoveryService(mockPackageRepo),
      dependencyResolution: new DependencyResolutionService(
        mockDependencyRepo,
        new PackageDiscoveryService(mockPackageRepo),
        new VersionResolutionService()
      ),
    };

    const deviceResult = DeviceId.create('integration-test-device');
    expect(deviceResult.isOk()).toBe(true);
    if (deviceResult.isOk()) {
      testDevice = deviceResult.value;
    }

    const synchronization = {
      operationCoordination: new OperationCoordinationService(),
      deviceId: testDevice,
    };

    orchestrator = new CrossContextOrchestrator(
      coreServices,
      languageIntelligence,
      packageEcosystem,
      synchronization
    );
  });

  describe('End-to-End Proof Validation Workflow', () => {
    it('should coordinate proof validation across all contexts', async () => {
      // Arrange - Create a logical proof structure
      const statements = [
        'All humans are mortal',
        'Socrates is human',
        'Therefore, Socrates is mortal',
      ];

      // Create a test package dependency
      const packageId = PackageId.create('proof-dependency');
      const source = PackageSource.createFromGit({
        url: 'https://github.com/test/proof-dep',
        ref: 'main',
      });
      const manifest = PackageManifest.create({
        name: 'Proof Dependency',
        version: '1.0.0',
        description: 'Dependency for proof validation',
        author: 'Test Author',
      });

      expect(packageId.isOk()).toBe(true);
      expect(manifest.isOk()).toBe(true);
      expect(source.isOk()).toBe(true);

      if (packageId.isOk() && manifest.isOk() && source.isOk()) {
        const version = PackageVersion.createNew(packageId.value, '1.0.0', source.value);

        expect(version.isOk()).toBe(true);

        if (version.isOk()) {
          const packageResult = Package.create(
            packageId.value,
            version.value.getVersion(),
            manifest.value,
            source.value
          );

          expect(packageResult.isOk()).toBe(true);

          if (packageResult.isOk()) {
            const dependencies = [packageResult.value];

            // Act - Validate proof with dependencies
            const result = await orchestrator.validateProofWithDependencies(
              statements,
              dependencies
            );

            // Assert - All contexts should coordinate successfully
            expect(result.structuralValid).toBe(true);
            expect(result.logicalValid).toBe(true);
            expect(result.dependenciesResolved).toBe(true);
            expect(result.syncCoordinated).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        }
      }
    });

    it('should handle validation failures with proper error propagation', async () => {
      // Arrange - Create an invalid proof structure
      const invalidStatements = ['Invalid premise', 'Unrelated conclusion'];

      // Create an invalid package dependency
      const packageId = PackageId.create('invalid-package');
      const invalidManifest = PackageManifest.create({
        name: '',
        version: '0.0.1',
        description: '',
        author: '',
      });

      expect(packageId.isOk()).toBe(true);
      // Invalid manifest should fail
      expect(invalidManifest.isErr()).toBe(true);

      if (packageId.isOk() && invalidManifest.isErr()) {
        // Use empty dependencies to simulate package resolution failure
        const dependencies: Package[] = [];

        // Act - Validate invalid proof
        const result = await orchestrator.validateProofWithDependencies(
          invalidStatements,
          dependencies
        );

        // Assert - Should detect various validation failures
        expect(result.structuralValid).toBe(true); // Structure creation should succeed
        expect(result.logicalValid).toBe(false); // Logic validation should fail
        expect(result.dependenciesResolved).toBe(true); // No dependencies to resolve
        expect(result.syncCoordinated).toBe(true); // Sync should still work
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('Logical validation failed'))).toBe(true);
      }
    });
  });

  describe('Package Discovery and Integration Workflow', () => {
    it('should discover and integrate packages based on proof patterns', async () => {
      // Arrange - Define proof patterns that require specific packages
      const proofPatterns = ['logic', 'mathematics', 'formal-reasoning'];

      // Act - Discover packages for these patterns
      const discoveryResult = await orchestrator.discoverLanguagePackagesForProof(proofPatterns);

      // Assert - Should discover relevant packages and provide recommendations
      expect(discoveryResult.discoveredPackages.length).toBeGreaterThanOrEqual(1);
      expect(discoveryResult.recommendations.length).toBeGreaterThanOrEqual(2);
      expect(
        discoveryResult.recommendations.some(rec => rec.includes('Logic package recommended'))
      ).toBe(true);
      expect(discoveryResult.recommendations.some(rec => rec.includes('mathematics package'))).toBe(
        true
      );

      // Verify discovered packages are valid
      discoveryResult.discoveredPackages.forEach(pkg => {
        expect(pkg.getId()).toBeDefined();
        expect(pkg.getVersion()).toBeDefined();
        expect(pkg.getManifest()).toBeDefined();
      });
    });

    it('should handle package version conflicts across contexts', async () => {
      // Arrange - Create packages with potential version conflicts
      const pattern1Packages = await orchestrator.discoverLanguagePackagesForProof(['logic']);
      const pattern2Packages = await orchestrator.discoverLanguagePackagesForProof(['logic']);

      // Act - Use same package discovery for different patterns
      const allPackages = [
        ...pattern1Packages.discoveredPackages,
        ...pattern2Packages.discoveredPackages,
      ];

      // Simulate validation with potentially conflicting packages
      const statements = ['Logical statement requiring package resolution'];
      const result = await orchestrator.validateProofWithDependencies(statements, allPackages);

      // Assert - Should handle duplicate packages gracefully
      expect(result.dependenciesResolved).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Collaborative Editing Coordination', () => {
    it('should coordinate proof edits across multiple devices', async () => {
      // Arrange - Simulate multiple devices editing same proof
      const device2Result = DeviceId.create('device-2');
      const device3Result = DeviceId.create('device-3');

      expect(device2Result.isOk()).toBe(true);
      expect(device3Result.isOk()).toBe(true);

      if (device2Result.isOk() && device3Result.isOk()) {
        const devices = [testDevice, device2Result.value, device3Result.value];
        const operations = [];

        // Create operations from each device
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i]!;
          const vectorClock = VectorClock.create(device);
          expect(vectorClock.isOk()).toBe(true);

          if (vectorClock.isOk()) {
            const incrementResult = vectorClock.value.incrementForDevice(device);

            if (incrementResult.isOk()) {
              const operationId = OperationId.create(`collab-edit-${i}`);
              const timestamp = LogicalTimestamp.create(device, i + 1, incrementResult.value);
              const opType = OperationType.create('STATEMENT_EDIT');

              if (opType.isOk()) {
                const payload = OperationPayload.create(
                  {
                    statement: `Statement from device ${i + 1}`,
                    position: i * 10,
                  },
                  opType.value
                );

                expect(operationId.isOk()).toBe(true);
                expect(timestamp.isOk()).toBe(true);
                expect(opType.isOk()).toBe(true);
                expect(payload.isOk()).toBe(true);

                if (operationId.isOk() && timestamp.isOk() && opType.isOk() && payload.isOk()) {
                  const operation = Operation.create(
                    operationId.value,
                    opType.value,
                    payload.value,
                    device,
                    timestamp.value,
                    vectorClock.value
                  );

                  expect(operation.isOk()).toBe(true);
                  if (operation.isOk()) {
                    operations.push(operation.value);
                  }
                }
              }
            }
          }
        }

        // Act - Coordinate all operations
        const coordinationResults = [];
        for (const operation of operations) {
          const syncState = SyncState.create(operation.getDeviceId());
          expect(syncState.isOk()).toBe(true);

          if (syncState.isOk()) {
            const result = await orchestrator[
              'synchronization'
            ].operationCoordination.applyOperation(operation, syncState.value);
            coordinationResults.push(result);
          }
        }

        // Assert - All operations should be coordinated successfully
        expect(coordinationResults).toHaveLength(3);
        coordinationResults.forEach(result => {
          expect(result.isOk()).toBe(true);
        });
      }
    });

    it('should maintain context boundaries during collaborative validation', async () => {
      // Arrange - Create a collaborative validation scenario
      const proofStatement = 'Collaboratively validated proof statement';
      const statements = [proofStatement];

      // Mock a collaborative editing operation
      const vectorClock = VectorClock.create(testDevice);
      expect(vectorClock.isOk()).toBe(true);

      if (vectorClock.isOk()) {
        const incrementResult = vectorClock.value.incrementForDevice(testDevice);

        if (incrementResult.isOk()) {
          const operationId = OperationId.create('collaborative-validation');
          const timestamp = LogicalTimestamp.create(testDevice, 1, incrementResult.value);
          const opType = OperationType.create('PROOF_VALIDATION');

          if (opType.isOk()) {
            const payload = OperationPayload.create(
              {
                proofId: 'test-proof-1',
                validationType: 'collaborative',
              },
              opType.value
            );

            expect(operationId.isOk()).toBe(true);
            expect(timestamp.isOk()).toBe(true);
            expect(opType.isOk()).toBe(true);
            expect(payload.isOk()).toBe(true);

            if (operationId.isOk() && timestamp.isOk() && opType.isOk() && payload.isOk()) {
              const operation = Operation.create(
                operationId.value,
                opType.value,
                payload.value,
                testDevice,
                timestamp.value,
                incrementResult.value
              );

              expect(operation.isOk()).toBe(true);

              if (operation.isOk()) {
                // Act - Perform validation while maintaining context boundaries
                const validationResult = await orchestrator.validateProofWithDependencies(
                  statements,
                  []
                );

                // Coordinate the validation operation
                const syncState = SyncState.create(testDevice);
                expect(syncState.isOk()).toBe(true);

                if (syncState.isOk()) {
                  const coordinationResult = await orchestrator[
                    'synchronization'
                  ].operationCoordination.applyOperation(operation.value, syncState.value);

                  // Assert - Validation and coordination should succeed independently
                  expect(validationResult.structuralValid).toBe(true);
                  expect(validationResult.syncCoordinated).toBe(true);
                  expect(coordinationResult.isOk()).toBe(true);

                  // Verify context boundaries are maintained
                  expect(operation.value.getDeviceId()).toBe(testDevice);
                  expect(operation.value.getOperationType().getValue()).toBe('PROOF_VALIDATION');
                }
              }
            }
          }
        }
      }
    });
  });

  describe('Performance and Scalability Across Contexts', () => {
    it('should handle large-scale cross-context operations efficiently', async () => {
      // Arrange - Create a large number of statements requiring cross-context validation
      const statementCount = 25;
      const statements = Array.from(
        { length: statementCount },
        (_, i) => `Large scale statement ${i + 1}`
      );

      // Create multiple package dependencies
      const packages = [];
      for (let i = 0; i < 5; i++) {
        const packageId = PackageId.create(`scale-package-${i}`);
        const version = PackageVersion.create('1.0.0');
        const manifest = PackageManifest.create({
          name: `Scale Package ${i}`,
          version: '1.0.0',
          description: `Scalability test package ${i}`,
        });
        const source = PackageSource.createFromGit({
          url: `https://github.com/scale/package-${i}`,
          ref: 'main',
        });

        if (packageId.isOk() && version.isOk() && manifest.isOk() && source.isOk()) {
          const packageResult = Package.create(
            packageId.value,
            version.value.getValue(),
            manifest.value,
            source.value
          );

          if (packageResult.isOk()) {
            packages.push(packageResult.value);
          }
        }
      }

      // Act - Perform large-scale validation
      const startTime = Date.now();
      const result = await orchestrator.validateProofWithDependencies(statements, packages);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert - Should handle large scale efficiently
      expect(result.structuralValid).toBe(true);
      expect(result.dependenciesResolved).toBe(true);
      expect(result.syncCoordinated).toBe(true);
      expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
      expect(packages).toHaveLength(5);
    });
  });
});
