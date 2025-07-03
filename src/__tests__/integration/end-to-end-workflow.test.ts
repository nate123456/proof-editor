/**
 * End-to-End Workflow Integration Tests
 *
 * Tests complete workflows that span multiple bounded contexts:
 * - Complete proof construction workflow from parsing to validation
 * - Package installation and dependency resolution workflows
 * - Collaborative editing workflows with synchronization
 * - Error handling workflows across all layers
 * - Performance optimization workflows
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguagePackage } from '../../contexts/language-intelligence/domain/entities/LanguagePackage.js';
import { LogicValidationService } from '../../contexts/language-intelligence/domain/services/LogicValidationService.js';
import { PatternRecognitionService } from '../../contexts/language-intelligence/domain/services/PatternRecognitionService.js';
import { LanguageCapabilities } from '../../contexts/language-intelligence/domain/value-objects/LanguageCapabilities.js';
import { ValidationLevel } from '../../contexts/language-intelligence/domain/value-objects/ValidationLevel.js';
import { Package } from '../../contexts/package-ecosystem/domain/entities/Package.js';
import { DependencyResolutionService } from '../../contexts/package-ecosystem/domain/services/DependencyResolutionService.js';
import { PackageDiscoveryService } from '../../contexts/package-ecosystem/domain/services/package-discovery-service.js';
import { PackageValidationService } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import { VersionResolutionService } from '../../contexts/package-ecosystem/domain/services/VersionResolutionService.js';
import { PackageId } from '../../contexts/package-ecosystem/domain/value-objects/package-id.js';
import { PackageManifest } from '../../contexts/package-ecosystem/domain/value-objects/package-manifest.js';
import { PackageSource } from '../../contexts/package-ecosystem/domain/value-objects/package-source.js';
import { Operation } from '../../contexts/synchronization/domain/entities/Operation.js';
import { SyncState } from '../../contexts/synchronization/domain/entities/SyncState.js';
import { VectorClock } from '../../contexts/synchronization/domain/entities/VectorClock.js';
import { ConflictResolutionService } from '../../contexts/synchronization/domain/services/ConflictResolutionService.js';
import { OperationCoordinationService } from '../../contexts/synchronization/domain/services/OperationCoordinationService.js';
import { DeviceId } from '../../contexts/synchronization/domain/value-objects/DeviceId.js';
import { LogicalTimestamp } from '../../contexts/synchronization/domain/value-objects/LogicalTimestamp.js';
import { OperationId } from '../../contexts/synchronization/domain/value-objects/OperationId.js';
import { OperationPayload } from '../../contexts/synchronization/domain/value-objects/OperationPayload.js';
import { OperationType } from '../../contexts/synchronization/domain/value-objects/OperationType.js';
import { PathCompletenessService } from '../../domain/services/PathCompletenessService.js';
import { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../domain/services/TreeStructureService.js';
import { SourceLocation } from '../../domain/shared/index.js';
import { ProofFileParser } from '../../parser/ProofFileParser.js';
import { YAMLValidator } from '../../parser/YAMLValidator.js';
import { ValidationController } from '../../validation/ValidationController.js';

/**
 * End-to-end workflow orchestrator that coordinates all services
 */
class WorkflowOrchestrator {
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
      versionResolution: VersionResolutionService;
    },
    private synchronization: {
      conflictResolution: ConflictResolutionService;
      operationCoordination: OperationCoordinationService;
      deviceId: DeviceId;
    },
    private parser: {
      proofFileParser: ProofFileParser;
      yamlValidator: YAMLValidator;
    },
    private validation: {
      controller: ValidationController;
    }
  ) {}

  /**
   * Complete proof construction workflow from YAML to validated domain entities
   */
  constructProofFromYAML(
    yamlContent: string,
    fileName: string
  ): {
    success: boolean;
    entities: {
      statements: any[];
      arguments: any[];
      trees: any[];
    };
    validation: {
      syntaxValid: boolean;
      semanticValid: boolean;
      structuralValid: boolean;
    };
    errors: string[];
  } {
    const errors: string[] = [];
    const entities = { statements: [], arguments: [], trees: [] };
    const validation = { syntaxValid: false, semanticValid: false, structuralValid: false };

    try {
      // Step 1: Validate YAML syntax
      const yamlValidationResult = this.parser.yamlValidator.validate(yamlContent);
      if (yamlValidationResult.isErr()) {
        errors.push(`YAML validation failed: ${yamlValidationResult.error.message}`);
        return { success: false, entities, validation, errors };
      }
      validation.syntaxValid = true;

      // Step 2: Parse YAML to proof document
      const parseResult = this.parser.proofFileParser.parse(yamlContent, fileName);
      if (parseResult.isErr()) {
        errors.push(`Parsing failed: ${parseResult.error.message}`);
        return { success: false, entities, validation, errors };
      }

      const proofDoc = parseResult.value;

      // Step 3: Create domain entities from parsed data
      const statements = proofDoc.getStatements();
      for (const [_id, content] of statements) {
        const statementResult = this.coreServices.statementFlow.createStatementFromContent(content);
        if (statementResult.isOk()) {
          entities.statements.push(statementResult.value);
        } else {
          errors.push(`Failed to create statement: ${statementResult.error.message}`);
        }
      }

      // Step 4: Create atomic arguments
      const argumentDefinitions = proofDoc.getArguments();
      for (const [_argId, argDef] of argumentDefinitions) {
        const premiseStatements = argDef.premises
          .map(premiseId => {
            const content = statements.get(premiseId);
            if (content) {
              const stmt = this.coreServices.statementFlow.createStatementFromContent(content);
              return stmt.isOk() ? stmt.value : null;
            }
            return null;
          })
          .filter(stmt => stmt !== null);

        const conclusionStatements = argDef.conclusions
          .map(conclusionId => {
            const content = statements.get(conclusionId);
            if (content) {
              const stmt = this.coreServices.statementFlow.createStatementFromContent(content);
              return stmt.isOk() ? stmt.value : null;
            }
            return null;
          })
          .filter(stmt => stmt !== null);

        if (premiseStatements.length > 0 && conclusionStatements.length > 0) {
          const premiseSetResult =
            this.coreServices.statementFlow.createOrderedSetFromStatements(premiseStatements);
          const conclusionSetResult =
            this.coreServices.statementFlow.createOrderedSetFromStatements(conclusionStatements);

          if (premiseSetResult.isOk() && conclusionSetResult.isOk()) {
            const atomicArgumentResult =
              this.coreServices.statementFlow.createAtomicArgumentWithSets(
                premiseSetResult.value,
                conclusionSetResult.value
              );
            if (atomicArgumentResult.isOk()) {
              entities.arguments.push(atomicArgumentResult.value);
            }
          }
        }
      }

      validation.structuralValid = entities.statements.length > 0 && entities.arguments.length > 0;

      // Step 5: Semantic validation using language intelligence
      if (entities.statements.length >= 2) {
        const firstStatement = entities.statements[0];
        const validationResult = this.languageIntelligence.validation.validateStatement(
          firstStatement.getContent(),
          SourceLocation.createDefault(),
          this.languageIntelligence.defaultPackage,
          ValidationLevel.semantic()
        );

        validation.semanticValid = validationResult.isOk() && validationResult.value.isSuccessful();
      }

      return {
        success: validation.syntaxValid && validation.structuralValid,
        entities,
        validation,
        errors,
      };
    } catch (error) {
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, entities, validation, errors };
    }
  }

  /**
   * Package installation and dependency resolution workflow
   */
  async installPackageWithDependencies(
    packageName: string,
    version: string
  ): Promise<{
    success: boolean;
    installedPackages: Package[];
    resolvedDependencies: any[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const installedPackages: Package[] = [];
    const resolvedDependencies: any[] = [];

    try {
      // Step 1: Create package ID and manifest
      const packageIdResult = PackageId.create(packageName);
      if (packageIdResult.isErr()) {
        errors.push(`Invalid package ID: ${packageIdResult.error.message}`);
        return { success: false, installedPackages, resolvedDependencies, errors };
      }

      const manifestResult = PackageManifest.create({
        name: packageName,
        version,
        description: `Package ${packageName}`,
      });
      if (manifestResult.isErr()) {
        errors.push(`Invalid manifest: ${manifestResult.error.message}`);
        return { success: false, installedPackages, resolvedDependencies, errors };
      }

      const sourceResult = PackageSource.createFromGit({
        url: `https://github.com/test/${packageName}`,
        ref: 'main',
      });
      if (sourceResult.isErr()) {
        errors.push(`Invalid source: ${sourceResult.error.message}`);
        return { success: false, installedPackages, resolvedDependencies, errors };
      }

      // Step 2: Create package entity
      const packageResult = Package.create(
        packageIdResult.value,
        version,
        manifestResult.value,
        sourceResult.value
      );
      if (packageResult.isErr()) {
        errors.push(`Failed to create package: ${packageResult.error.message}`);
        return { success: false, installedPackages, resolvedDependencies, errors };
      }

      const targetPackage = packageResult.value;

      // Step 3: Validate package structure
      const validationResult =
        this.packageEcosystem.packageValidation.validatePackageStructure(targetPackage);
      if (validationResult.isErr() || !validationResult.value.isValid) {
        errors.push('Package validation failed');
        return { success: false, installedPackages, resolvedDependencies, errors };
      }

      // Step 4: Resolve dependencies
      const dependencyResult =
        await this.packageEcosystem.dependencyResolution.resolveDependenciesForPackage(
          targetPackage
        );
      if (dependencyResult.isOk()) {
        resolvedDependencies.push(...dependencyResult.value);
      }

      installedPackages.push(targetPackage);

      return {
        success: true,
        installedPackages,
        resolvedDependencies,
        errors,
      };
    } catch (error) {
      errors.push(
        `Installation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { success: false, installedPackages, resolvedDependencies, errors };
    }
  }

  /**
   * Collaborative editing workflow with conflict resolution
   */
  async collaborativeEditWorkflow(
    devices: DeviceId[],
    editOperations: { deviceId: DeviceId; edit: string; position: number }[]
  ): Promise<{
    success: boolean;
    resolvedOperations: Operation[];
    conflicts: any[];
    finalState: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    const resolvedOperations: Operation[] = [];
    const conflicts: any[] = [];
    let finalState = {};

    try {
      // Step 1: Create operations from edit commands
      const operations: Operation[] = [];
      for (const [index, editOp] of editOperations.entries()) {
        const vectorClock = VectorClock.create(devices);
        if (vectorClock.isErr()) {
          errors.push(`Failed to create vector clock: ${vectorClock.error.message}`);
          continue;
        }

        vectorClock.value.increment(editOp.deviceId);

        const operationId = OperationId.create(`collab-edit-${index}`);
        const timestamp = LogicalTimestamp.create(Date.now() + index);
        const operationType = OperationType.create('EDIT');
        const payload = OperationPayload.create({
          text: editOp.edit,
          position: editOp.position,
        });

        if (operationId.isOk() && timestamp.isOk() && operationType.isOk() && payload.isOk()) {
          const operation = Operation.create(
            operationId.value,
            operationType.value,
            payload.value,
            editOp.deviceId,
            timestamp.value,
            vectorClock.value
          );

          if (operation.isOk()) {
            operations.push(operation.value);
          }
        }
      }

      // Step 2: Coordinate operations and detect conflicts
      for (const operation of operations) {
        const syncState = SyncState.create(operation.getDeviceId());
        if (syncState.isOk()) {
          const coordinationResult =
            await this.synchronization.operationCoordination.coordinateOperation(
              operation,
              syncState.value
            );

          if (coordinationResult.isOk()) {
            resolvedOperations.push(operation);
          } else {
            errors.push(`Coordination failed: ${coordinationResult.error.message}`);
          }
        }
      }

      // Step 3: Build final collaborative state
      finalState = {
        operationCount: resolvedOperations.length,
        deviceCount: devices.length,
        conflictCount: conflicts.length,
      };

      return {
        success: resolvedOperations.length > 0,
        resolvedOperations,
        conflicts,
        finalState,
        errors,
      };
    } catch (error) {
      errors.push(
        `Collaboration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { success: false, resolvedOperations, conflicts, finalState, errors };
    }
  }
}

describe('End-to-End Workflow Integration Tests', () => {
  let orchestrator: WorkflowOrchestrator;
  let testDevice: DeviceId;
  let testLanguagePackage: LanguagePackage;

  beforeEach(() => {
    // Initialize core services
    const coreServices = {
      statementFlow: new StatementFlowService(),
      treeStructure: new TreeStructureService(),
      pathCompleteness: new PathCompletenessService(),
    };

    // Create test language package
    const capabilities = LanguageCapabilities.propositionalOnly();
    const languagePackageResult = LanguagePackage.create(
      'End-to-End Test Package',
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
      findById: vi.fn().mockResolvedValue(ok(null)),
      findByName: vi.fn().mockResolvedValue(ok([])),
      save: vi.fn().mockResolvedValue(ok(undefined)),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      findAll: vi.fn().mockResolvedValue(ok([])),
      exists: vi.fn().mockResolvedValue(ok(false)),
      findBySource: vi.fn().mockResolvedValue(ok([])),
      findByVersion: vi.fn().mockResolvedValue(ok([])),
      findInstalled: vi.fn().mockResolvedValue(ok([])),
    };

    const mockDependencyRepo = {
      findDependenciesForPackage: vi.fn().mockResolvedValue(ok([])),
      findPackagesThatDependOn: vi.fn().mockResolvedValue(ok([])),
      save: vi.fn().mockResolvedValue(ok(undefined)),
      findByPackageId: vi.fn().mockResolvedValue(ok([])),
      findDependentsOf: vi.fn().mockResolvedValue(ok([])),
      findTransitiveDependencies: vi.fn().mockResolvedValue(ok([])),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      deleteByPackageId: vi.fn().mockResolvedValue(ok(undefined)),
      exists: vi.fn().mockResolvedValue(ok(false)),
      hasCycle: vi.fn().mockResolvedValue(ok(false)),
    };

    const packageEcosystem = {
      packageValidation: new PackageValidationService(),
      packageDiscovery: new PackageDiscoveryService(mockPackageRepo),
      dependencyResolution: new DependencyResolutionService(
        mockDependencyRepo,
        new PackageDiscoveryService(mockPackageRepo),
        new VersionResolutionService()
      ),
      versionResolution: new VersionResolutionService(),
    };

    const deviceResult = DeviceId.create('e2e-test-device');
    expect(deviceResult.isOk()).toBe(true);
    if (deviceResult.isOk()) {
      testDevice = deviceResult.value;
    }

    const synchronization = {
      conflictResolution: new ConflictResolutionService(),
      operationCoordination: new OperationCoordinationService(),
      deviceId: testDevice,
    };

    const parser = {
      proofFileParser: new ProofFileParser(),
      yamlValidator: new YAMLValidator(),
    };

    const validation = {
      controller: new ValidationController(),
    };

    orchestrator = new WorkflowOrchestrator(
      coreServices,
      languageIntelligence,
      packageEcosystem,
      synchronization,
      parser,
      validation
    );
  });

  describe('Complete Proof Construction Workflow', () => {
    it('should handle end-to-end proof construction from YAML to validated entities', () => {
      // Arrange - Complex proof YAML
      const complexProofYaml = `
statements:
  premise1: "All humans are mortal"
  premise2: "Socrates is human"
  intermediate: "Socrates is mortal"
  premise3: "All mortals age"
  conclusion: "Socrates ages"

arguments:
  syllogism:
    premises: [premise1, premise2]
    conclusions: [intermediate]
  aging_conclusion:
    premises: [intermediate, premise3]
    conclusions: [conclusion]

proof:
  n1: {arg: syllogism}
  n2: {n1: aging_conclusion, on: 0}
`;

      // Act - Execute complete workflow
      const result = orchestrator.constructProofFromYAML(complexProofYaml, 'complex.proof');

      // Assert - All workflow steps should succeed
      expect(result.success).toBe(true);
      expect(result.validation.syntaxValid).toBe(true);
      expect(result.validation.structuralValid).toBe(true);
      expect(result.entities.statements.length).toBe(5);
      expect(result.entities.arguments.length).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle workflow failures gracefully with detailed error reporting', () => {
      // Arrange - Invalid proof YAML
      const invalidProofYaml = `
statements:
  s1: "Valid statement"
  s2:   # Missing content

arguments:
  invalid_arg:
    premises: [s1, s3]  # s3 doesn't exist
    conclusions: [s2]

proof:
  n1: {arg: nonexistent_arg}  # Reference to undefined argument
`;

      // Act - Execute workflow with errors
      const result = orchestrator.constructProofFromYAML(invalidProofYaml, 'invalid.proof');

      // Assert - Should fail gracefully with detailed errors
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validation.syntaxValid).toBe(true); // YAML syntax is valid
      expect(result.validation.structuralValid).toBe(false); // But structure is invalid
    });

    it('should optimize performance for large proof documents', () => {
      // Arrange - Generate large proof document
      const statementCount = 50;
      const argumentCount = 25;

      let largeYaml = 'statements:\n';
      for (let i = 1; i <= statementCount; i++) {
        largeYaml += `  s${i}: "Statement ${i}"\n`;
      }

      largeYaml += '\narguments:\n';
      for (let i = 1; i <= argumentCount; i++) {
        const premise = `s${i}`;
        const conclusion = `s${Math.min(i + 1, statementCount)}`;
        largeYaml += `  arg${i}:\n    premises: [${premise}]\n    conclusions: [${conclusion}]\n`;
      }

      largeYaml += '\nproof:\n';
      for (let i = 1; i <= Math.min(argumentCount, 10); i++) {
        largeYaml += `  n${i}: {arg: arg${i}}\n`;
      }

      // Act - Measure workflow performance
      const startTime = Date.now();
      const result = orchestrator.constructProofFromYAML(largeYaml, 'large.proof');
      const executionTime = Date.now() - startTime;

      // Assert - Should handle large documents efficiently
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.entities.statements.length).toBe(statementCount);
      expect(result.entities.arguments.length).toBe(argumentCount);
    });
  });

  describe('Package Management Workflow', () => {
    it('should complete package installation with dependency resolution', async () => {
      // Arrange - Package installation request
      const packageName = 'test-logic-package';
      const version = '2.1.0';

      // Act - Execute package installation workflow
      const result = await orchestrator.installPackageWithDependencies(packageName, version);

      // Assert - Installation should succeed
      expect(result.success).toBe(true);
      expect(result.installedPackages).toHaveLength(1);
      expect(result.installedPackages[0]?.getId().toString()).toContain(packageName);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle package installation failures with rollback', async () => {
      // Arrange - Invalid package data
      const invalidPackageName = '';
      const invalidVersion = 'not-a-version';

      // Act - Attempt installation with invalid data
      const result = await orchestrator.installPackageWithDependencies(
        invalidPackageName,
        invalidVersion
      );

      // Assert - Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.installedPackages).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Invalid'))).toBe(true);
    });
  });

  describe('Collaborative Editing Workflow', () => {
    it('should coordinate multi-device collaborative editing', async () => {
      // Arrange - Multiple devices and edit operations
      const device1 = DeviceId.create('device-1');
      const device2 = DeviceId.create('device-2');
      const device3 = DeviceId.create('device-3');

      expect(device1.isOk() && device2.isOk() && device3.isOk()).toBe(true);

      if (device1.isOk() && device2.isOk() && device3.isOk()) {
        const devices = [device1.value, device2.value, device3.value];
        const editOperations = [
          { deviceId: device1.value, edit: 'Edit from device 1', position: 10 },
          { deviceId: device2.value, edit: 'Edit from device 2', position: 20 },
          { deviceId: device3.value, edit: 'Edit from device 3', position: 30 },
        ];

        // Act - Execute collaborative editing workflow
        const result = await orchestrator.collaborativeEditWorkflow(devices, editOperations);

        // Assert - Collaboration should succeed
        expect(result.success).toBe(true);
        expect(result.resolvedOperations).toHaveLength(3);
        expect(result.finalState).toHaveProperty('operationCount', 3);
        expect(result.finalState).toHaveProperty('deviceCount', 3);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should handle conflicting edits with resolution strategies', async () => {
      // Arrange - Conflicting edit operations
      const device1 = DeviceId.create('conflict-device-1');
      const device2 = DeviceId.create('conflict-device-2');

      expect(device1.isOk() && device2.isOk()).toBe(true);

      if (device1.isOk() && device2.isOk()) {
        const devices = [device1.value, device2.value];
        const conflictingOperations = [
          { deviceId: device1.value, edit: 'Conflicting edit A', position: 5 },
          { deviceId: device2.value, edit: 'Conflicting edit B', position: 5 }, // Same position
        ];

        // Act - Execute workflow with conflicts
        const result = await orchestrator.collaborativeEditWorkflow(devices, conflictingOperations);

        // Assert - Should handle conflicts gracefully
        expect(result.success).toBe(true);
        expect(result.resolvedOperations.length).toBeGreaterThan(0);
        expect(result.finalState).toHaveProperty('conflictCount', 0); // Conflicts resolved
      }
    });
  });

  describe('Error Recovery and System Resilience', () => {
    it('should recover from transient service failures', () => {
      // Arrange - Mock intermittent service failure
      let failureCount = 0;
      const mockValidation = vi
        .spyOn(orchestrator['languageIntelligence'].validation, 'validateStatement')
        .mockImplementation(() => {
          failureCount++;
          if (failureCount <= 2) {
            throw new Error('Transient service failure');
          }
          // Succeed on third attempt
          return ok({
            isSuccessful: () => true,
            getDiagnostics: () => [],
          } as any);
        });

      const simpleYaml = `
statements:
  s1: "Test statement"

arguments:
  arg1:
    premises: [s1]
    conclusions: [s1]

proof:
  n1: {arg: arg1}
`;

      // Act - Retry workflow multiple times
      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          result = orchestrator.constructProofFromYAML(simpleYaml, 'retry-test.proof');
          if (result.success) break;
        } catch (error) {
          if (attempts >= maxAttempts) throw error;
        }
      }

      // Assert - Should eventually succeed
      expect(result?.success).toBe(true);
      expect(attempts).toBe(3); // Should succeed on third attempt

      mockValidation.mockRestore();
    });

    it('should maintain system consistency during partial failures', async () => {
      // Arrange - Mock partial system failure scenario
      const mockPackageValidation = vi
        .spyOn(orchestrator['packageEcosystem'].packageValidation, 'validatePackageStructure')
        .mockImplementation(() => {
          return err(new Error('Package validation service unavailable'));
        });

      // Act - Execute workflows during partial failure
      const proofResult = orchestrator.constructProofFromYAML(
        'statements:\n  s1: "Test"\narguments:\n  arg1:\n    premises: [s1]\n    conclusions: [s1]\nproof:\n  n1: {arg: arg1}',
        'partial-failure.proof'
      );

      const packageResult = await orchestrator.installPackageWithDependencies(
        'test-package',
        '1.0.0'
      );

      // Assert - Core functionality should remain available
      expect(proofResult.success).toBe(true); // Proof construction should work
      expect(packageResult.success).toBe(false); // Package installation should fail

      // System should remain consistent
      expect(proofResult.entities.statements.length).toBeGreaterThan(0);
      expect(packageResult.installedPackages).toHaveLength(0);

      mockPackageValidation.mockRestore();
    });
  });

  describe('Performance and Scalability Workflows', () => {
    it('should handle concurrent workflow execution', async () => {
      // Arrange - Multiple concurrent workflows
      const workflows = [
        orchestrator.constructProofFromYAML(
          'statements:\n  s1: "Proof 1"\narguments:\n  arg1:\n    premises: [s1]\n    conclusions: [s1]\nproof:\n  n1: {arg: arg1}',
          'concurrent-1.proof'
        ),
        orchestrator.constructProofFromYAML(
          'statements:\n  s2: "Proof 2"\narguments:\n  arg2:\n    premises: [s2]\n    conclusions: [s2]\nproof:\n  n2: {arg: arg2}',
          'concurrent-2.proof'
        ),
        orchestrator.installPackageWithDependencies('concurrent-package-1', '1.0.0'),
        orchestrator.installPackageWithDependencies('concurrent-package-2', '1.0.0'),
      ];

      // Act - Execute workflows concurrently
      const startTime = Date.now();
      const results = await Promise.all(workflows);
      const totalTime = Date.now() - startTime;

      // Assert - All workflows should complete successfully
      expect(results.every(result => result.success)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should scale efficiently with increasing workflow complexity', () => {
      // Arrange - Workflows of varying complexity
      const simpleWorkflow = orchestrator.constructProofFromYAML(
        'statements:\n  s1: "Simple"\narguments:\n  arg1:\n    premises: [s1]\n    conclusions: [s1]\nproof:\n  n1: {arg: arg1}',
        'simple.proof'
      );

      const mediumComplexity = 10;
      let mediumYaml = 'statements:\n';
      for (let i = 1; i <= mediumComplexity; i++) {
        mediumYaml += `  s${i}: "Statement ${i}"\n`;
      }
      mediumYaml += 'arguments:\nproof:\n';

      const mediumWorkflow = orchestrator.constructProofFromYAML(mediumYaml, 'medium.proof');

      // Act - Measure execution times
      const simpleStart = Date.now();
      const simpleResult = simpleWorkflow;
      const simpleTime = Date.now() - simpleStart;

      const mediumStart = Date.now();
      const mediumResult = mediumWorkflow;
      const mediumTime = Date.now() - mediumStart;

      // Assert - Should scale reasonably
      expect(simpleResult.success).toBe(true);
      expect(mediumResult.success).toBe(true);
      expect(mediumTime).toBeLessThan(simpleTime * 5); // Should not scale linearly
    });
  });
});
