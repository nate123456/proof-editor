/**
 * Error Propagation and Domain Boundary Integration Tests
 *
 * Tests error handling and boundary enforcement across bounded contexts:
 * - Error propagation between service layers
 * - Domain boundary validation and enforcement
 * - Anti-corruption layer testing
 * - Graceful degradation scenarios
 * - Error recovery and compensation patterns
 * - Context isolation under failure conditions
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../contexts/language-intelligence/domain/errors/DomainErrors.js';
// Language Intelligence Context
import { LogicValidationService } from '../../contexts/language-intelligence/domain/services/LogicValidationService.js';
import { PatternRecognitionService } from '../../contexts/language-intelligence/domain/services/PatternRecognitionService.js';
import { ValidationLevel } from '../../contexts/language-intelligence/domain/value-objects/ValidationLevel.js';
// Package Ecosystem Context
import { DependencyResolutionService } from '../../contexts/package-ecosystem/domain/services/DependencyResolutionService.js';
import { PackageDiscoveryService } from '../../contexts/package-ecosystem/domain/services/package-discovery-service.js';
import { PackageValidationService } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import { VersionResolutionService } from '../../contexts/package-ecosystem/domain/services/VersionResolutionService.js';
import {
  PackageNotFoundError,
  PackageSourceUnavailableError,
  PackageValidationError,
} from '../../contexts/package-ecosystem/domain/types/domain-errors.js';
// Synchronization Context
import { ConflictResolutionService } from '../../contexts/synchronization/domain/services/ConflictResolutionService.js';
import { OperationCoordinationService } from '../../contexts/synchronization/domain/services/OperationCoordinationService.js';
// Core Domain Services
import { StatementFlowService } from '../../domain/services/StatementFlowService.js';
import { TreeStructureService } from '../../domain/services/TreeStructureService.js';
// Shared
import { SourceLocation } from '../../domain/shared/index.js';
// Test utilities
import {
  CoreDomainFactory,
  ErrorScenarioFactory,
  LanguageIntelligenceFactory,
  MockDataFactory,
  PackageEcosystemFactory,
  SynchronizationFactory,
} from '../utils/integration-test-factories.js';

/**
 * Anti-corruption layer simulator for testing boundary enforcement
 */
class AntiCorruptionLayer {
  /**
   * Translates external errors to domain-specific errors
   */
  static translateError(externalError: unknown, context: string): Error {
    if (externalError instanceof Error) {
      switch (context) {
        case 'language-intelligence':
          return new ValidationError(`Language Intelligence: ${externalError.message}`);
        case 'package-ecosystem':
          return new PackageValidationError(`Package Ecosystem: ${externalError.message}`);
        case 'synchronization':
          return new Error(`Synchronization: ${externalError.message}`);
        default:
          return new Error(`Unknown context: ${externalError.message}`);
      }
    }
    return new Error(`Unknown error in ${context}`);
  }

  /**
   * Validates cross-context data transfer
   */
  static validateDataTransfer(data: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'validation-result':
        return typeof data === 'object' && data !== null && 'isSuccessful' in data;
      case 'package':
        return typeof data === 'object' && data !== null && 'getId' in data && 'getVersion' in data;
      case 'operation':
        return typeof data === 'object' && data !== null && 'getDeviceId' in data;
      default:
        return false;
    }
  }

  /**
   * Enforces rate limiting and resource constraints
   */
  static enforceResourceLimits(operationType: string, currentLoad: number): boolean {
    const limits = {
      validation: 100,
      'package-resolution': 50,
      'conflict-resolution': 25,
    };

    const limit = limits[operationType as keyof typeof limits] ?? 10;
    return currentLoad <= limit;
  }
}

describe('Error Propagation and Domain Boundary Tests', () => {
  let coreServices: {
    statementFlow: StatementFlowService;
    treeStructure: TreeStructureService;
  };

  let languageIntelligenceServices: {
    validation: LogicValidationService;
    patternRecognition: PatternRecognitionService;
    testPackage: any;
  };

  let packageEcosystemServices: {
    packageValidation: PackageValidationService;
    dependencyResolution: DependencyResolutionService;
    packageDiscovery: PackageDiscoveryService;
    versionResolution: VersionResolutionService;
  };

  let synchronizationServices: {
    conflictResolution: ConflictResolutionService;
    operationCoordination: OperationCoordinationService;
  };

  beforeEach(() => {
    // Initialize core services
    coreServices = {
      statementFlow: new StatementFlowService(),
      treeStructure: new TreeStructureService(),
    };

    // Initialize language intelligence services
    const testPackage = LanguageIntelligenceFactory.createLanguagePackage();
    languageIntelligenceServices = {
      validation: new LogicValidationService(),
      patternRecognition: new PatternRecognitionService(),
      testPackage,
    };

    // Initialize package ecosystem services with mocked repositories
    const mockRepositories = MockDataFactory.createMockRepositoryResponses();

    // Create mock providers for PackageDiscoveryService
    const mockGitProvider = {
      searchPackages: () => Promise.resolve(ok({ packages: [], totalFound: 0, searchTime: 0 })),
      getPackageDetails: () => Promise.resolve(err(new Error('Mock not found'))),
    };

    const mockLocalProvider = {
      scanDirectory: () => Promise.resolve(ok({ packages: [], totalFound: 0, searchTime: 0 })),
      validateLocalPackage: () => Promise.resolve(ok(true)),
    };

    // Create mock GitRefProvider for VersionResolutionService
    const mockGitRefProvider = {
      resolveGitRef: () => Promise.resolve(ok({ version: '1.0.0', sha: 'abc123', tag: 'v1.0.0' })),
      listAvailableRefs: () => Promise.resolve(ok(['main', 'v1.0.0'])),
    };

    const packageDiscovery = new PackageDiscoveryService(
      mockRepositories.packageRepository,
      mockGitProvider,
      mockLocalProvider
    );
    const versionResolution = new VersionResolutionService(mockGitRefProvider);

    // Create mock file system and SDK validator for PackageValidationService
    const mockFileSystem = {
      fileExists: () => true,
      readFile: () => ok('mock content'),
      listFiles: () => ok(['file1.ts', 'file2.ts']),
      isExecutable: () => false,
    };

    const mockSDKValidator = {
      validateInterface: () => ok({ name: 'test', version: '1.0.0' }),
      listImplementedInterfaces: () => ok([]),
      checkVersionCompatibility: () => ok({ compatible: true }),
    };

    packageEcosystemServices = {
      packageValidation: new PackageValidationService(mockFileSystem, mockSDKValidator),
      packageDiscovery,
      dependencyResolution: new DependencyResolutionService(
        mockRepositories.dependencyRepository,
        packageDiscovery,
        versionResolution
      ),
      versionResolution,
    };

    // Initialize synchronization services
    synchronizationServices = {
      conflictResolution: new ConflictResolutionService(),
      operationCoordination: new OperationCoordinationService(),
    };
  });

  describe('Cross-Context Error Propagation', () => {
    it('should propagate validation errors from Language Intelligence to Core Domain', () => {
      // Arrange - Create invalid statement scenario
      const invalidContent = '';

      // Act - Try to create statement in core domain (should succeed)
      const statementResult =
        coreServices.statementFlow.createStatementFromContent('valid content');
      expect(statementResult.isOk()).toBe(true);

      if (statementResult.isOk()) {
        // Try to validate with Language Intelligence (should fail)
        const validationResult = languageIntelligenceServices.validation.validateStatement(
          invalidContent,
          SourceLocation.createDefault(),
          languageIntelligenceServices.testPackage,
          ValidationLevel.syntax()
        );

        // Assert - Error should be properly contained and typed
        expect(validationResult.isOk()).toBe(true); // Service call succeeds
        if (validationResult.isOk()) {
          expect(validationResult.value.isSuccessful()).toBe(false); // But validation fails
          expect(validationResult.value.getDiagnostics().length).toBeGreaterThan(0);
        }

        // Anti-corruption layer should translate the error
        const translatedError = AntiCorruptionLayer.translateError(
          new Error('Validation failed'),
          'language-intelligence'
        );
        expect(translatedError).toBeInstanceOf(ValidationError);
        expect(translatedError.message).toContain('Language Intelligence:');
      }
    });

    it('should handle package ecosystem errors gracefully in validation workflows', async () => {
      // Arrange - Create scenario with package dependency issues
      const testPackage = PackageEcosystemFactory.createPackage('failing-package');

      // Mock package repository to simulate failure
      const mockRepo = packageEcosystemServices.packageDiscovery as any;
      mockRepo.packageRepository.findById = vi
        .fn()
        .mockResolvedValue(err(new PackageNotFoundError('Package not found')));

      // Act - Try to resolve dependencies
      const resolutionResult =
        await packageEcosystemServices.dependencyResolution.resolveDependenciesForPackage(
          testPackage
        );

      // Assert - Error should be properly typed and contained
      expect(resolutionResult.isErr()).toBe(true);
      if (resolutionResult.isErr()) {
        expect(resolutionResult.error).toBeInstanceOf(PackageNotFoundError);

        // Anti-corruption layer should handle the error
        const translatedError = AntiCorruptionLayer.translateError(
          resolutionResult.error,
          'package-ecosystem'
        );
        expect(translatedError).toBeInstanceOf(PackageValidationError);
        expect(translatedError.message).toContain('Package Ecosystem:');
      }
    });

    it('should isolate synchronization errors from other contexts', async () => {
      // Arrange - Create synchronization scenario that will fail
      const _device = SynchronizationFactory.createDevice('error-test-device');
      const _conflictScenario = SynchronizationFactory.createConflictScenario();

      // Mock conflict resolution to fail
      const mockConflictResolution = vi
        .spyOn(synchronizationServices.conflictResolution, 'resolveConflictAutomatically')
        .mockResolvedValue(err(new Error('Conflict resolution failed')));

      // Act - Try to resolve conflict
      const dummyConflict = {} as any; // Simplified for error testing
      const resolutionResult =
        await synchronizationServices.conflictResolution.resolveConflictAutomatically(
          dummyConflict
        );

      // Assert - Error should be contained within synchronization context
      expect(resolutionResult.isErr()).toBe(true);
      if (resolutionResult.isErr()) {
        expect(resolutionResult.error.message).toBe('Conflict resolution failed');

        // Other contexts should remain unaffected
        const coreStatementResult = coreServices.statementFlow.createStatementFromContent(
          'Unaffected by sync error'
        );
        expect(coreStatementResult.isOk()).toBe(true);

        const validationResult = languageIntelligenceServices.validation.validateStatement(
          'Unaffected statement',
          SourceLocation.createDefault(),
          languageIntelligenceServices.testPackage,
          ValidationLevel.syntax()
        );
        expect(validationResult.isOk()).toBe(true);
      }

      mockConflictResolution.mockRestore();
    });
  });

  describe('Domain Boundary Enforcement', () => {
    it('should enforce data type boundaries between contexts', () => {
      // Arrange - Create data from different contexts
      const statement = CoreDomainFactory.createStatement('Test statement');
      const validationResult = LanguageIntelligenceFactory.createValidationResult(true);
      const package_ = PackageEcosystemFactory.createPackage();
      const operation = SynchronizationFactory.createOperation(
        SynchronizationFactory.createDevice(),
        [SynchronizationFactory.createDevice()]
      );

      // Act & Assert - Validate cross-context data transfer
      expect(AntiCorruptionLayer.validateDataTransfer(validationResult, 'validation-result')).toBe(
        true
      );
      expect(AntiCorruptionLayer.validateDataTransfer(package_, 'package')).toBe(true);
      expect(AntiCorruptionLayer.validateDataTransfer(operation, 'operation')).toBe(true);

      // Invalid transfers should be rejected
      expect(AntiCorruptionLayer.validateDataTransfer(statement, 'package')).toBe(false);
      expect(AntiCorruptionLayer.validateDataTransfer(validationResult, 'operation')).toBe(false);
      expect(AntiCorruptionLayer.validateDataTransfer(package_, 'validation-result')).toBe(false);
    });

    it('should maintain context isolation during cascading failures', () => {
      // Arrange - Create error scenarios in multiple contexts
      const errorScenarios = ErrorScenarioFactory.createErrorScenarios();

      // Act - Trigger errors in each context
      const invalidStatement = errorScenarios.invalidStatement();
      const invalidManifest = errorScenarios.invalidPackageManifest();
      const conflictingOps = errorScenarios.conflictingOperations();

      // Assert - Each context should handle its own errors
      expect(invalidStatement.isErr()).toBe(true);
      expect(invalidManifest.isErr()).toBe(true);
      expect(conflictingOps).toHaveLength(2);

      // Core domain should still function
      const validStatement =
        coreServices.statementFlow.createStatementFromContent('Valid statement');
      expect(validStatement.isOk()).toBe(true);

      // Language intelligence should still validate valid content
      if (validStatement.isOk()) {
        const validation = languageIntelligenceServices.validation.validateStatement(
          validStatement.value.getContent(),
          SourceLocation.createDefault(),
          languageIntelligenceServices.testPackage,
          ValidationLevel.syntax()
        );
        expect(validation.isOk()).toBe(true);
      }
    });

    it('should enforce resource limits across contexts', () => {
      // Arrange - Test different operation types
      const operationTypes = ['validation', 'package-resolution', 'conflict-resolution'];

      // Act & Assert - Test resource limits
      operationTypes.forEach(opType => {
        // Within limits should pass
        expect(AntiCorruptionLayer.enforceResourceLimits(opType, 10)).toBe(true);

        // At limits should pass
        const limits = { validation: 100, 'package-resolution': 50, 'conflict-resolution': 25 };
        const limit = limits[opType as keyof typeof limits] ?? 10;
        expect(AntiCorruptionLayer.enforceResourceLimits(opType, limit)).toBe(true);

        // Over limits should fail
        expect(AntiCorruptionLayer.enforceResourceLimits(opType, limit + 1)).toBe(false);
      });

      // Unknown operation type should have default limit
      expect(AntiCorruptionLayer.enforceResourceLimits('unknown-op', 5)).toBe(true);
      expect(AntiCorruptionLayer.enforceResourceLimits('unknown-op', 15)).toBe(false);
    });
  });

  describe('Graceful Degradation Scenarios', () => {
    it('should gracefully degrade when Language Intelligence is unavailable', () => {
      // Arrange - Mock validation service to always fail
      const mockValidation = vi
        .spyOn(languageIntelligenceServices.validation, 'validateStatement')
        .mockImplementation(() => {
          throw new Error('Language Intelligence unavailable');
        });

      // Act - Core domain should still function
      const statement = coreServices.statementFlow.createStatementFromContent(
        'Statement without validation'
      );

      // Assert - Core functionality preserved
      expect(statement.isOk()).toBe(true);

      if (statement.isOk()) {
        const orderedSet = coreServices.statementFlow.createOrderedSetFromStatements([
          statement.value,
        ]);
        expect(orderedSet.isOk()).toBe(true);

        // Validation failure should be gracefully handled
        try {
          languageIntelligenceServices.validation.validateStatement(
            statement.value.getContent(),
            SourceLocation.createDefault(),
            languageIntelligenceServices.testPackage,
            ValidationLevel.syntax()
          );
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Language Intelligence unavailable');
        }
      }

      mockValidation.mockRestore();
    });

    it('should handle package ecosystem outages gracefully', async () => {
      // Arrange - Mock all package services to fail
      const mockPackageDiscovery = vi
        .spyOn(packageEcosystemServices.packageDiscovery, 'findPackageById')
        .mockResolvedValue(err(new PackageSourceUnavailableError('Package service unavailable')));

      // Act - Other contexts should continue functioning
      const statement =
        coreServices.statementFlow.createStatementFromContent('Independent statement');
      expect(statement.isOk()).toBe(true);

      if (statement.isOk()) {
        const validation = languageIntelligenceServices.validation.validateStatement(
          statement.value.getContent(),
          SourceLocation.createDefault(),
          languageIntelligenceServices.testPackage,
          ValidationLevel.syntax()
        );
        expect(validation.isOk()).toBe(true);
      }

      // Package operations should fail gracefully
      const testPackage = PackageEcosystemFactory.createPackage();
      const packageId = testPackage.getId();

      const discoveryResult =
        await packageEcosystemServices.packageDiscovery.findPackageById(packageId);
      expect(discoveryResult.isErr()).toBe(true);
      if (discoveryResult.isErr()) {
        expect(discoveryResult.error).toBeInstanceOf(PackageSourceUnavailableError);
      }

      mockPackageDiscovery.mockRestore();
    });

    it('should maintain system stability during synchronization failures', async () => {
      // Arrange - Mock operation coordination to fail
      const mockCoordination = vi
        .spyOn(synchronizationServices.operationCoordination, 'coordinateOperation')
        .mockResolvedValue(err(new Error('Coordination service down')));

      // Act - Other services should remain operational
      const statement = coreServices.statementFlow.createStatementFromContent('Stable statement');
      expect(statement.isOk()).toBe(true);

      if (statement.isOk()) {
        // Language intelligence should work
        const validation = languageIntelligenceServices.validation.validateStatement(
          statement.value.getContent(),
          SourceLocation.createDefault(),
          languageIntelligenceServices.testPackage,
          ValidationLevel.syntax()
        );
        expect(validation.isOk()).toBe(true);

        // Package validation should work
        const testPackage = PackageEcosystemFactory.createPackage();
        const packageValidation =
          packageEcosystemServices.packageValidation.validatePackageStructure(testPackage);
        expect(packageValidation.isOk()).toBe(true);
      }

      // Synchronization should fail gracefully
      const device = SynchronizationFactory.createDevice();
      const operation = SynchronizationFactory.createOperation(device, [device]);
      const syncState = { value: {} } as any; // Simplified for testing

      const coordinationResult =
        await synchronizationServices.operationCoordination.coordinateOperation(
          operation,
          syncState.value
        );
      expect(coordinationResult.isErr()).toBe(true);

      mockCoordination.mockRestore();
    });
  });

  describe('Error Recovery and Compensation', () => {
    it('should recover from transient validation failures', () => {
      // Arrange - Create a scenario with intermittent failures
      let failureCount = 0;
      const mockValidation = vi
        .spyOn(languageIntelligenceServices.validation, 'validateStatement')
        .mockImplementation((statement, location, pkg, level) => {
          failureCount++;
          if (failureCount <= 2) {
            // Fail first two attempts
            throw new Error('Transient validation failure');
          }
          // Succeed on third attempt
          return new LogicValidationService().validateStatement(statement, location, pkg, level);
        });

      const statement =
        coreServices.statementFlow.createStatementFromContent('Retry test statement');
      expect(statement.isOk()).toBe(true);

      if (statement.isOk()) {
        // Simulate retry logic
        let validationResult;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            attempts++;
            validationResult = languageIntelligenceServices.validation.validateStatement(
              statement.value.getContent(),
              SourceLocation.createDefault(),
              languageIntelligenceServices.testPackage,
              ValidationLevel.syntax()
            );
            break; // Success
          } catch (error) {
            if (attempts >= maxAttempts) {
              throw error; // Re-throw if max attempts reached
            }
            // Continue retrying
          }
        }

        // Assert - Should eventually succeed
        expect(validationResult).toBeDefined();
        expect(validationResult.isOk()).toBe(true);
        expect(attempts).toBe(3);
      }

      mockValidation.mockRestore();
    });

    it('should compensate for package resolution failures', async () => {
      // Arrange - Mock package discovery to fail initially
      let failureCount = 0;
      const fallbackPackage = PackageEcosystemFactory.createPackage('fallback-package');

      const mockDiscovery = vi
        .spyOn(packageEcosystemServices.packageDiscovery, 'findPackageById')
        .mockImplementation(() => {
          failureCount++;
          if (failureCount <= 1) {
            return Promise.resolve(err(new PackageNotFoundError('Primary package not found')));
          }
          // Return fallback package
          return Promise.resolve(ok(fallbackPackage));
        });

      // Act - Implement compensation logic
      const primaryPackage = PackageEcosystemFactory.createPackage('primary-package');
      let discoveryResult = await packageEcosystemServices.packageDiscovery.findPackageById(
        primaryPackage.getId()
      );

      if (discoveryResult.isErr()) {
        // Compensation: try fallback package
        discoveryResult = await packageEcosystemServices.packageDiscovery.findPackageById(
          fallbackPackage.getId()
        );
      }

      // Assert - Should succeed with fallback
      expect(discoveryResult.isOk()).toBe(true);
      if (discoveryResult.isOk()) {
        expect(discoveryResult.value.getId().toString()).toBe(fallbackPackage.getId().toString());
      }

      mockDiscovery.mockRestore();
    });

    it('should handle partial system recovery scenarios', async () => {
      // Arrange - Create a scenario where only some services recover
      const mockServices = {
        validation: vi.spyOn(languageIntelligenceServices.validation, 'validateStatement'),
        packageDiscovery: vi.spyOn(packageEcosystemServices.packageDiscovery, 'findPackageById'),
        conflictResolution: vi.spyOn(
          synchronizationServices.conflictResolution,
          'resolveConflictAutomatically'
        ),
      };

      // Initially all services fail
      mockServices.validation.mockImplementation(() => {
        throw new Error('Validation service down');
      });
      mockServices.packageDiscovery.mockResolvedValue(
        err(new PackageSourceUnavailableError('Package service down'))
      );
      mockServices.conflictResolution.mockResolvedValue(err(new Error('Conflict service down')));

      // Act - Simulate partial recovery (only validation recovers)
      setTimeout(() => {
        mockServices.validation.mockRestore();
      }, 10);

      // Test system state during partial recovery
      const statement =
        coreServices.statementFlow.createStatementFromContent('Partial recovery test');
      expect(statement.isOk()).toBe(true);

      // After recovery delay
      await new Promise(resolve => setTimeout(resolve, 20));

      if (statement.isOk()) {
        // Validation should work after recovery
        const validation = languageIntelligenceServices.validation.validateStatement(
          statement.value.getContent(),
          SourceLocation.createDefault(),
          languageIntelligenceServices.testPackage,
          ValidationLevel.syntax()
        );
        expect(validation.isOk()).toBe(true);

        // Package service should still be down
        const testPackage = PackageEcosystemFactory.createPackage();
        const packageResult = await packageEcosystemServices.packageDiscovery.findPackageById(
          testPackage.getId()
        );
        expect(packageResult.isErr()).toBe(true);

        // Conflict resolution should still be down
        const dummyConflict = {} as any;
        const conflictResult =
          await synchronizationServices.conflictResolution.resolveConflictAutomatically(
            dummyConflict
          );
        expect(conflictResult.isErr()).toBe(true);
      }

      // Cleanup
      Object.values(mockServices).forEach(mock => mock.mockRestore());
    });
  });

  describe('Context Isolation Under Failure', () => {
    it('should maintain core domain integrity during external service failures', () => {
      // Arrange - Mock all external services to fail
      const mockValidation = vi
        .spyOn(languageIntelligenceServices.validation, 'validateStatement')
        .mockImplementation(() => {
          throw new Error('All external services down');
        });

      const mockPackageDiscovery = vi
        .spyOn(packageEcosystemServices.packageDiscovery, 'findPackageById')
        .mockResolvedValue(err(new Error('All external services down')));

      const mockConflictResolution = vi
        .spyOn(synchronizationServices.conflictResolution, 'resolveConflictAutomatically')
        .mockResolvedValue(err(new Error('All external services down')));

      // Act - Core domain operations should continue to work
      const statement1 = coreServices.statementFlow.createStatementFromContent('Core statement 1');
      const statement2 = coreServices.statementFlow.createStatementFromContent('Core statement 2');

      expect(statement1.isOk()).toBe(true);
      expect(statement2.isOk()).toBe(true);

      if (statement1.isOk() && statement2.isOk()) {
        const orderedSet = coreServices.statementFlow.createOrderedSetFromStatements([
          statement1.value,
          statement2.value,
        ]);
        expect(orderedSet.isOk()).toBe(true);

        if (orderedSet.isOk()) {
          const conclusionSet = coreServices.statementFlow.createOrderedSetFromStatements([
            statement2.value,
          ]);
          expect(conclusionSet.isOk()).toBe(true);

          if (conclusionSet.isOk()) {
            const atomicArgument = coreServices.statementFlow.createAtomicArgumentWithSets(
              orderedSet.value,
              conclusionSet.value
            );
            expect(atomicArgument.isOk()).toBe(true);
          }
        }
      }

      // Cleanup
      mockValidation.mockRestore();
      mockPackageDiscovery.mockRestore();
      mockConflictResolution.mockRestore();
    });

    it('should isolate context-specific data during failures', () => {
      // Arrange - Create data in each context
      const coreStatement = CoreDomainFactory.createStatement('Core context data');
      const languagePackage = LanguageIntelligenceFactory.createLanguagePackage('Test Package');
      const ecosystemPackage = PackageEcosystemFactory.createPackage('Ecosystem Package');
      const syncDevice = SynchronizationFactory.createDevice('Sync Device');

      // Simulate failure in one context
      const mockValidation = vi
        .spyOn(languageIntelligenceServices.validation, 'validateStatement')
        .mockImplementation(() => {
          throw new Error('Language Intelligence context failure');
        });

      // Act - Other contexts should remain isolated
      expect(coreStatement.getContent()).toBe('Core context data');
      expect(languagePackage.getName().getValue()).toBe('Test Package');
      expect(ecosystemPackage.getId().toString()).toContain('test-package');
      expect(syncDevice.getShortId()).toContain('sync-device');

      // Language Intelligence failure should not affect other contexts
      try {
        languageIntelligenceServices.validation.validateStatement(
          'test',
          SourceLocation.createDefault(),
          languagePackage,
          ValidationLevel.syntax()
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Other contexts should still be accessible
      const newStatement = coreServices.statementFlow.createStatementFromContent('New statement');
      expect(newStatement.isOk()).toBe(true);

      const packageValidation =
        packageEcosystemServices.packageValidation.validatePackageStructure(ecosystemPackage);
      expect(packageValidation.isOk()).toBe(true);

      mockValidation.mockRestore();
    });
  });
});
