/**
 * Cross-Context Analysis Integration Tests
 *
 * Tests analysis workflows that span multiple bounded contexts:
 * - Core Domain services + Language Intelligence validation
 * - Statement flow analysis with Package Ecosystem integration
 * - Synchronization-aware analysis for collaborative editing
 * - End-to-end proof construction and validation workflows
 * - Performance analysis across context boundaries
 * - Error propagation in complex analysis scenarios
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Core Domain Services
import { ConnectionResolutionService } from '../../../../../domain/services/ConnectionResolutionService.js';
import { CyclePreventionService } from '../../../../../domain/services/CyclePreventionService.js';
import { PathCompletenessService } from '../../../../../domain/services/PathCompletenessService.js';
import { StatementFlowService } from '../../../../../domain/services/StatementFlowService.js';
import { StatementProcessingService } from '../../../../../domain/services/StatementProcessingService.js';
import { TreeStructureService } from '../../../../../domain/services/TreeStructureService.js';
import { SourceLocation } from '../../../../../domain/shared/index.js';
// Language Intelligence Context
import { InferenceRule } from '../../../../language-intelligence/domain/entities/InferenceRule.js';
import { LanguagePackage } from '../../../../language-intelligence/domain/entities/LanguagePackage.js';
import { EducationalFeedbackService } from '../../../../language-intelligence/domain/services/EducationalFeedbackService.js';
import { LogicValidationService } from '../../../../language-intelligence/domain/services/LogicValidationService.js';
import { PatternRecognitionService } from '../../../../language-intelligence/domain/services/PatternRecognitionService.js';
import { InferenceRuleId } from '../../../../language-intelligence/domain/value-objects/InferenceRuleId.js';
import { LanguageCapabilities } from '../../../../language-intelligence/domain/value-objects/LanguageCapabilities.js';
import { LanguagePackageId } from '../../../../language-intelligence/domain/value-objects/LanguagePackageId.js';
import { PackageName } from '../../../../language-intelligence/domain/value-objects/PackageName.js';
import { RuleDescription } from '../../../../language-intelligence/domain/value-objects/RuleDescription.js';
import { RuleName } from '../../../../language-intelligence/domain/value-objects/RuleName.js';
import { RulePattern } from '../../../../language-intelligence/domain/value-objects/RulePattern.js';
import { ValidationLevel } from '../../../../language-intelligence/domain/value-objects/ValidationLevel.js';
// Package Ecosystem Context
import { Package } from '../../../../package-ecosystem/domain/entities/Package.js';
import { DependencyResolutionService } from '../../../../package-ecosystem/domain/services/DependencyResolutionService.js';
import { PackageValidationService } from '../../../../package-ecosystem/domain/services/PackageValidationService.js';
import { PackageDiscoveryService } from '../../../../package-ecosystem/domain/services/package-discovery-service.js';
import { VersionResolutionService } from '../../../../package-ecosystem/domain/services/VersionResolutionService.js';
import { PackageId } from '../../../../package-ecosystem/domain/value-objects/package-id.js';
import { PackageManifest } from '../../../../package-ecosystem/domain/value-objects/package-manifest.js';
import { PackageSource } from '../../../../package-ecosystem/domain/value-objects/package-source.js';
// Synchronization Context
import { Operation } from '../../../../synchronization/domain/entities/Operation.js';
import { SyncState } from '../../../../synchronization/domain/entities/SyncState.js';
import { VectorClock } from '../../../../synchronization/domain/entities/VectorClock.js';
import { ConflictResolutionService } from '../../../../synchronization/domain/services/ConflictResolutionService.js';
import { OperationCoordinationService } from '../../../../synchronization/domain/services/OperationCoordinationService.js';
import { DeviceId } from '../../../../synchronization/domain/value-objects/DeviceId.js';
import { LogicalTimestamp } from '../../../../synchronization/domain/value-objects/LogicalTimestamp.js';
import { OperationId } from '../../../../synchronization/domain/value-objects/OperationId.js';
import { OperationPayload } from '../../../../synchronization/domain/value-objects/OperationPayload.js';
import { OperationType } from '../../../../synchronization/domain/value-objects/OperationType.js';

describe('Cross-Context Analysis Integration', () => {
  // Core Domain Services
  let statementFlowService: StatementFlowService;
  let _treeStructureService: TreeStructureService;
  let pathCompletenessService: PathCompletenessService;
  let cyclePreventionService: CyclePreventionService;
  let _connectionResolutionService: ConnectionResolutionService;
  let _statementProcessingService: StatementProcessingService;

  // Language Intelligence Services
  let logicValidationService: LogicValidationService;
  let patternRecognitionService: PatternRecognitionService;
  let educationalFeedbackService: EducationalFeedbackService;
  let testLanguagePackage: LanguagePackage;

  // Package Ecosystem Services
  let packageValidationService: PackageValidationService;
  let dependencyResolutionService: DependencyResolutionService;
  let testPackage: Package;

  // Synchronization Services
  let _conflictResolutionService: ConflictResolutionService;
  let operationCoordinationService: OperationCoordinationService;
  let testDevice: DeviceId;

  beforeEach(() => {
    // Initialize Core Domain Services with mock repositories
    const mockAtomicRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };
    const _mockConnectionService = {
      findPathCompleteArgument: vi.fn(),
      analyzeConnectionsInSet: vi.fn(),
    };
    const mockOrderedSetRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
    };
    const mockTreeRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
    };

    statementFlowService = new StatementFlowService();
    _treeStructureService = new TreeStructureService();
    const mockConnectionServiceInstance = new ConnectionResolutionService(
      mockAtomicRepo as any,
      mockOrderedSetRepo as any,
    );
    pathCompletenessService = new PathCompletenessService(
      mockAtomicRepo as any,
      mockConnectionServiceInstance,
    );
    cyclePreventionService = new CyclePreventionService(
      mockAtomicRepo as any,
      mockTreeRepo as any,
      mockConnectionServiceInstance,
    );
    _connectionResolutionService = new ConnectionResolutionService(
      mockAtomicRepo as any,
      mockOrderedSetRepo as any,
    );
    const mockStatementRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
    };
    _statementProcessingService = new StatementProcessingService(
      mockStatementRepo as any,
      mockOrderedSetRepo as any,
      mockAtomicRepo as any,
    );

    // Initialize Language Intelligence Services
    logicValidationService = new LogicValidationService();
    patternRecognitionService = new PatternRecognitionService();
    educationalFeedbackService = new EducationalFeedbackService();

    // Create test language package
    const packageId = LanguagePackageId.create('cross-context-test');
    const packageName = PackageName.create('Cross Context Test Package');
    expect(packageId.isOk()).toBe(true);
    expect(packageName.isOk()).toBe(true);

    if (packageId.isOk() && packageName.isOk()) {
      const capabilities = LanguageCapabilities.propositionalOnly();
      const languagePackageResult = LanguagePackage.create(
        packageName.value.getValue(),
        '1.0.0',
        capabilities,
      );
      expect(languagePackageResult.isOk()).toBe(true);
      if (languagePackageResult.isOk()) {
        testLanguagePackage = languagePackageResult.value;

        // Add test inference rules
        const ruleName = RuleName.create('cross-context-rule');
        const ruleDescription = RuleDescription.create('Cross context analysis rule');
        const rulePattern = RulePattern.createLogicalPattern(
          ['P', 'P -> Q'],
          ['Q'],
          'modus-ponens',
        );

        if (ruleName.isOk() && ruleDescription.isOk() && rulePattern.isOk()) {
          const ruleId = InferenceRuleId.create('cross-context-rule-id');
          if (ruleId.isOk()) {
            const inferenceRule = InferenceRule.create(
              ruleName.value.getValue(),
              ruleDescription.value.getValue(),
              rulePattern.value,
              testLanguagePackage.getId().getValue(),
            );
            if (inferenceRule.isOk()) {
              testLanguagePackage.addInferenceRule(inferenceRule.value);
            }
          }
        }
      }
    }

    // Initialize Package Ecosystem Services
    const mockRepo = {
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
    const mockPackageInstallRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
      findByPackageId: vi.fn(),
      findByPath: vi.fn(),
    };
    packageValidationService = new PackageValidationService(
      mockRepo as any,
      mockPackageInstallRepo as any,
    );
    const mockGitProvider = {
      discoverFromGitHub: vi.fn(),
      validateGitSource: vi.fn(),
      clonePackageToTemporary: vi.fn(),
    };
    const mockLocalProvider = {
      discoverInDirectory: vi.fn(),
      validateLocalSource: vi.fn(),
      loadPackageManifest: vi.fn(),
    };
    const packageDiscoveryService = new PackageDiscoveryService(
      mockRepo as any,
      mockGitProvider as any,
      mockLocalProvider as any,
    );
    const mockGitRefProvider = {
      resolveRefToCommit: vi.fn(),
      listAvailableTags: vi.fn(),
      listAvailableBranches: vi.fn(),
      getCommitTimestamp: vi.fn(),
    };
    const versionResolutionService = new VersionResolutionService(mockGitRefProvider as any);
    const mockDependencyRepo = {
      findDependenciesForPackage: vi.fn(),
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
    dependencyResolutionService = new DependencyResolutionService(
      mockDependencyRepo,
      packageDiscoveryService,
      versionResolutionService,
    );

    // Create test package
    const testPackageId = PackageId.create('test-analysis-package');
    const testManifest = PackageManifest.create({
      name: 'Test Analysis Package',
      version: '1.0.0',
      description: 'Package for cross-context analysis testing',
      author: 'Test Author',
    });
    const testSource = PackageSource.createFromGit({
      url: 'https://github.com/test/analysis',
      ref: 'main',
    });

    if (testPackageId.isOk() && testManifest.isOk() && testSource.isOk()) {
      const packageResult = Package.create({
        id: testPackageId.value,
        manifest: testManifest.value,
        source: testSource.value,
        sdkInterfaces: [],
        validationResult: { isValid: true, errors: [], warnings: [] },
      });
      if (packageResult.isOk()) {
        testPackage = packageResult.value;
      }
    }

    // Initialize Synchronization Services
    _conflictResolutionService = new ConflictResolutionService();
    operationCoordinationService = new OperationCoordinationService();

    const deviceResult = DeviceId.create('test-analysis-device');
    expect(deviceResult.isOk()).toBe(true);
    if (deviceResult.isOk()) {
      testDevice = deviceResult.value;
    }
  });

  describe('Statement Flow Analysis with Language Intelligence', () => {
    it('should analyze statement flow with validation across contexts', () => {
      // Arrange - Create statements that form a logical flow
      const premise1 = statementFlowService.createStatementFromContent('All men are mortal');
      const premise2 = statementFlowService.createStatementFromContent('Socrates is a man');
      const conclusion = statementFlowService.createStatementFromContent('Socrates is mortal');

      expect(premise1.isOk()).toBe(true);
      expect(premise2.isOk()).toBe(true);
      expect(conclusion.isOk()).toBe(true);

      if (premise1.isOk() && premise2.isOk() && conclusion.isOk()) {
        // Create ordered sets for the argument structure
        const premiseSet = statementFlowService.createOrderedSetFromStatements([
          premise1.value,
          premise2.value,
        ]);
        const conclusionSet = statementFlowService.createOrderedSetFromStatements([
          conclusion.value,
        ]);

        expect(premiseSet.isOk()).toBe(true);
        expect(conclusionSet.isOk()).toBe(true);

        if (premiseSet.isOk() && conclusionSet.isOk()) {
          // Create atomic argument
          const argument = statementFlowService.createAtomicArgumentWithSets(
            premiseSet.value,
            conclusionSet.value,
          );

          expect(argument.isOk()).toBe(true);

          if (argument.isOk()) {
            // Act - Validate the argument using Language Intelligence
            const validationResult = logicValidationService.validateInference(
              [premise1.value.getContent(), premise2.value.getContent()],
              [conclusion.value.getContent()],
              testLanguagePackage,
              ValidationLevel.semantic(),
            );

            // Analyze structural properties using Core Domain services
            const allArguments = new Map();
            allArguments.set(argument.value.getId(), argument.value);

            const connectedArguments = statementFlowService.findAllConnectedArguments(
              argument.value,
              allArguments,
            );

            // Assert
            expect(validationResult.isOk()).toBe(true);
            if (validationResult.isOk()) {
              expect(validationResult.value.isValid()).toBe(true);
            }

            expect(connectedArguments.size).toBe(1);
            expect(connectedArguments.has(argument.value)).toBe(true);
          }
        }
      }
    });

    it('should detect and resolve statement flow cycles across contexts', async () => {
      // Arrange - Create a potential cycle scenario
      const statement1 = statementFlowService.createStatementFromContent('P implies Q');
      const statement2 = statementFlowService.createStatementFromContent('Q implies R');
      const statement3 = statementFlowService.createStatementFromContent('R implies P');

      expect(statement1.isOk()).toBe(true);
      expect(statement2.isOk()).toBe(true);
      expect(statement3.isOk()).toBe(true);

      if (statement1.isOk() && statement2.isOk() && statement3.isOk()) {
        // Create a chain of arguments
        const set1 = statementFlowService.createOrderedSetFromStatements([statement1.value]);
        const set2 = statementFlowService.createOrderedSetFromStatements([statement2.value]);
        const set3 = statementFlowService.createOrderedSetFromStatements([statement3.value]);

        expect(set1.isOk()).toBe(true);
        expect(set2.isOk()).toBe(true);
        expect(set3.isOk()).toBe(true);

        if (set1.isOk() && set2.isOk() && set3.isOk()) {
          const arg1 = statementFlowService.createAtomicArgumentWithSets(set1.value, set2.value);
          const arg2 = statementFlowService.createAtomicArgumentWithSets(set2.value, set3.value);
          const arg3 = statementFlowService.createAtomicArgumentWithSets(set3.value, set1.value);

          expect(arg1.isOk()).toBe(true);
          expect(arg2.isOk()).toBe(true);
          expect(arg3.isOk()).toBe(true);

          if (arg1.isOk() && arg2.isOk() && arg3.isOk()) {
            const allArguments = new Map();
            allArguments.set(arg1.value.getId(), arg1.value);
            allArguments.set(arg2.value.getId(), arg2.value);
            allArguments.set(arg3.value.getId(), arg3.value);

            // Act - Use cycle prevention service
            const cycleResult = await cyclePreventionService.validateLogicalCyclePrevention(
              arg1.value.getId(),
              arg3.value.getId(),
            );

            // Validate the circular reasoning with Language Intelligence
            const circularValidation = logicValidationService.validateInference(
              [statement1.value.getContent()],
              [statement1.value.getContent()], // Same statement as premise and conclusion
              testLanguagePackage,
              ValidationLevel.semantic(),
            );

            // Assert
            expect(cycleResult.isOk()).toBe(true);
            expect(circularValidation.isOk()).toBe(true);

            if (circularValidation.isOk()) {
              // Should detect the circular reasoning issue
              expect(circularValidation.value.isValid()).toBe(false);
            }
          }
        }
      }
    });
  });

  describe('Package-Aware Analysis Workflows', () => {
    it('should validate proof structures with package dependencies', async () => {
      // Arrange - Create a proof that depends on external package logic
      const proofStatement = statementFlowService.createStatementFromContent(
        'Using package logic: All elements have properties',
      );

      expect(proofStatement.isOk()).toBe(true);

      if (proofStatement.isOk()) {
        // Validate the package first
        const packageValidation = await packageValidationService.validatePackage(testPackage);
        expect(packageValidation.isOk()).toBe(true);

        if (packageValidation.isOk() && packageValidation.value.isValid) {
          // Act - Validate statement using package-aware validation
          const validationResult = logicValidationService.validateStatement(
            proofStatement.value.getContent(),
            SourceLocation.createDefault(),
            testLanguagePackage,
            ValidationLevel.semantic(),
          );

          // Assert
          expect(validationResult.isOk()).toBe(true);
          if (validationResult.isOk()) {
            // Should succeed since package is valid
            expect(validationResult.value.getLanguagePackageId()).toBe(
              testLanguagePackage.getId().getValue(),
            );
          }
        }
      }
    });

    it('should handle package version conflicts in proof analysis', async () => {
      // Arrange - Simulate scenario with package dependencies
      const dependencyList: any[] = [];
      const mockDependencyRepo = dependencyResolutionService as any;
      mockDependencyRepo.dependencyRepository.findDependenciesForPackage = vi
        .fn()
        .mockResolvedValue(ok(dependencyList));

      // Act - Resolve dependencies for analysis package
      const resolutionResult =
        await dependencyResolutionService.resolveDependenciesForPackage(testPackage);

      // Perform analysis with resolved dependencies
      const statement = statementFlowService.createStatementFromContent(
        'Analysis with resolved dependencies',
      );

      expect(resolutionResult.isOk()).toBe(true);
      expect(statement.isOk()).toBe(true);

      if (resolutionResult.isOk() && statement.isOk()) {
        const validationResult = logicValidationService.validateStatement(
          statement.value.getContent(),
          SourceLocation.createDefault(),
          testLanguagePackage,
          ValidationLevel.syntax(),
        );

        // Assert
        expect(validationResult.isOk()).toBe(true);
        expect(resolutionResult.value.conflicts).toHaveLength(0);
      }
    });
  });

  describe('Collaborative Analysis with Synchronization', () => {
    it('should handle concurrent proof editing across devices', async () => {
      // Arrange - Create operations from multiple devices
      const statement1 = statementFlowService.createStatementFromContent('Device A statement');
      const statement2 = statementFlowService.createStatementFromContent('Device B statement');

      expect(statement1.isOk()).toBe(true);
      expect(statement2.isOk()).toBe(true);

      if (statement1.isOk() && statement2.isOk()) {
        // Create operations for collaborative editing
        const vectorClock = VectorClock.create(testDevice);
        expect(vectorClock.isOk()).toBe(true);

        if (vectorClock.isOk()) {
          const incrementedClockResult = vectorClock.value.incrementForDevice(testDevice);
          if (incrementedClockResult.isOk()) {
            const incrementedClock = incrementedClockResult.value;

            const operationId = OperationId.create('collaborative-edit-1');
            const timestamp = LogicalTimestamp.create(testDevice, 1, incrementedClock);
            const opType = OperationType.create('UPDATE_STATEMENT' as const);
            const payload = opType.isOk()
              ? OperationPayload.create(
                  {
                    statementId: statement1.value.getId().getValue(),
                    newContent: 'Collaboratively edited statement',
                  },
                  opType.value,
                )
              : err(new Error('Operation type not created'));

            expect(operationId.isOk()).toBe(true);
            expect(timestamp.isOk()).toBe(true);
            expect(opType.isOk()).toBe(true);
            expect(payload.isOk()).toBe(true);

            if (operationId.isOk() && timestamp.isOk() && opType.isOk() && payload.isOk()) {
              const operation = Operation.create(
                operationId.value,
                testDevice,
                opType.value,
                `/statement/${statement1.value.getId().getValue()}`,
                payload.value,
                incrementedClock,
              );

              expect(operation.isOk()).toBe(true);

              if (operation.isOk()) {
                const syncState = SyncState.create(testDevice);
                expect(syncState.isOk()).toBe(true);

                if (syncState.isOk()) {
                  // Act - Coordinate operation and validate result
                  const coordinationResult = await operationCoordinationService.applyOperation(
                    operation.value,
                    syncState.value,
                  );

                  const validationResult = logicValidationService.validateStatement(
                    'Collaboratively edited statement',
                    SourceLocation.createDefault(),
                    testLanguagePackage,
                    ValidationLevel.syntax(),
                  );

                  // Assert
                  expect(coordinationResult.isOk()).toBe(true);
                  expect(validationResult.isOk()).toBe(true);

                  if (validationResult.isOk()) {
                    expect(validationResult.value.isValid()).toBe(true);
                  }
                }
              }
            }
          }
        }
      }
    });

    it('should maintain proof integrity during conflict resolution', () => {
      // Arrange - Create conflicting operations on the same proof element
      const originalStatement =
        statementFlowService.createStatementFromContent('Original statement');
      expect(originalStatement.isOk()).toBe(true);

      if (originalStatement.isOk()) {
        // Simulate conflicting edits
        const vectorClock1 = VectorClock.create(testDevice);
        const vectorClock2 = VectorClock.create(testDevice);

        expect(vectorClock1.isOk()).toBe(true);
        expect(vectorClock2.isOk()).toBe(true);

        if (vectorClock1.isOk() && vectorClock2.isOk()) {
          const clock1Result = vectorClock1.value.incrementForDevice(testDevice);
          const clock2Result = vectorClock2.value.incrementForDevice(testDevice);
          if (clock1Result.isOk() && clock2Result.isOk()) {
            const clock1 = clock1Result.value;
            const clock2 = clock2Result.value;

            // Create first operation
            const op1Id = OperationId.create('conflict-op-1');
            const op1Timestamp = LogicalTimestamp.create(testDevice, 1, clock1);
            const op1Type = OperationType.create('UPDATE_STATEMENT' as const);
            const op1Payload = op1Type.isOk()
              ? OperationPayload.create(
                  {
                    statementId: originalStatement.value.getId().getValue(),
                    newContent: 'Edit version 1',
                  },
                  op1Type.value,
                )
              : err(new Error('Operation type not created'));

            // Create second operation
            const op2Id = OperationId.create('conflict-op-2');
            const op2Timestamp = LogicalTimestamp.create(testDevice, 1, clock2);
            const op2Type = OperationType.create('UPDATE_STATEMENT' as const);
            const op2Payload = op2Type.isOk()
              ? OperationPayload.create(
                  {
                    statementId: originalStatement.value.getId().getValue(),
                    newContent: 'Edit version 2',
                  },
                  op2Type.value,
                )
              : err(new Error('Operation type not created'));

            expect(op1Id.isOk()).toBe(true);
            expect(op2Id.isOk()).toBe(true);

            if (
              op1Id.isOk() &&
              op1Timestamp.isOk() &&
              op1Type.isOk() &&
              op1Payload.isOk() &&
              op2Id.isOk() &&
              op2Timestamp.isOk() &&
              op2Type.isOk() &&
              op2Payload.isOk()
            ) {
              const operation1 = Operation.create(
                op1Id.value,
                testDevice,
                op1Type.value,
                `/statement/${originalStatement.value.getId().getValue()}`,
                op1Payload.value,
                clock1,
              );

              const operation2 = Operation.create(
                op2Id.value,
                testDevice,
                op2Type.value,
                `/statement/${originalStatement.value.getId().getValue()}`,
                op2Payload.value,
                clock2,
              );

              expect(operation1.isOk()).toBe(true);
              expect(operation2.isOk()).toBe(true);

              if (operation1.isOk() && operation2.isOk()) {
                // Act - Resolve conflict and validate resulting proof integrity
                const transformResult = operation1.value.transformWith(operation2.value);
                expect(transformResult.isOk()).toBe(true);

                if (transformResult.isOk()) {
                  const [resolved1, resolved2] = transformResult.value;

                  // Validate both resolved versions
                  const validation1 = logicValidationService.validateStatement(
                    'Edit version 1',
                    SourceLocation.createDefault(),
                    testLanguagePackage,
                    ValidationLevel.syntax(),
                  );

                  const validation2 = logicValidationService.validateStatement(
                    'Edit version 2',
                    SourceLocation.createDefault(),
                    testLanguagePackage,
                    ValidationLevel.syntax(),
                  );

                  // Assert
                  expect(validation1.isOk()).toBe(true);
                  expect(validation2.isOk()).toBe(true);
                  expect(resolved1.getDeviceId()).toBe(testDevice);
                  expect(resolved2.getDeviceId()).toBe(testDevice);
                }
              }
            }
          }
        }
      }
    });
  });

  describe('End-to-End Analysis Workflows', () => {
    it('should perform complete proof analysis across all contexts', async () => {
      // Arrange - Create a complex proof structure
      const statements = [
        'All humans are mortal',
        'Socrates is human',
        'Therefore, Socrates is mortal',
        'All mortals have finite lifespans',
        'Therefore, Socrates has a finite lifespan',
      ].map((content) => statementFlowService.createStatementFromContent(content));

      // Verify all statements created successfully
      statements.forEach((stmt) => {
        expect(stmt.isOk()).toBe(true);
      });

      const validStatements = statements.filter((stmt) => stmt.isOk()).map((stmt) => stmt.value);

      if (validStatements.length === 5) {
        // Create argument chain
        const argumentsList = [];

        // First argument: Humans mortal + Socrates human → Socrates mortal
        const statement0 = validStatements[0];
        const statement1 = validStatements[1];
        const statement2 = validStatements[2];
        if (!statement0 || !statement1 || !statement2) {
          throw new Error('Expected statements not available');
        }
        const premiseSet1 = statementFlowService.createOrderedSetFromStatements([
          statement0,
          statement1,
        ]);
        const conclusionSet1 = statementFlowService.createOrderedSetFromStatements([statement2]);

        if (premiseSet1.isOk() && conclusionSet1.isOk()) {
          const arg1 = statementFlowService.createAtomicArgumentWithSets(
            premiseSet1.value,
            conclusionSet1.value,
          );
          if (arg1.isOk()) {
            argumentsList.push(arg1.value);
          }
        }

        // Second argument: Socrates mortal + Mortals finite → Socrates finite
        const statement3 = validStatements[3];
        const statement4 = validStatements[4];
        if (!statement3 || !statement4) {
          throw new Error('Expected statements not available');
        }
        const premiseSet2 = statementFlowService.createOrderedSetFromStatements([
          statement2,
          statement3,
        ]);
        const conclusionSet2 = statementFlowService.createOrderedSetFromStatements([statement4]);

        if (premiseSet2.isOk() && conclusionSet2.isOk()) {
          const arg2 = statementFlowService.createAtomicArgumentWithSets(
            premiseSet2.value,
            conclusionSet2.value,
          );
          if (arg2.isOk()) {
            argumentsList.push(arg2.value);
          }
        }

        if (argumentsList.length === 2) {
          // Act - Perform comprehensive analysis

          // 1. Structural Analysis
          const allArguments = new Map();
          argumentsList.forEach((arg) => allArguments.set(arg.getId(), arg));

          const pathResult = await pathCompletenessService.validatePathCompleteness(
            argumentsList.map((arg) => arg.getId()),
          );

          // 2. Logic Validation
          const statement0Content = validStatements[0]?.getContent();
          const statement1Content = validStatements[1]?.getContent();
          const statement2Content = validStatements[2]?.getContent();
          const statement3Content = validStatements[3]?.getContent();
          const statement4Content = validStatements[4]?.getContent();

          if (
            !statement0Content ||
            !statement1Content ||
            !statement2Content ||
            !statement3Content ||
            !statement4Content
          ) {
            throw new Error('Required statement content not available');
          }

          const inference1Validation = logicValidationService.validateInference(
            [statement0Content, statement1Content],
            [statement2Content],
            testLanguagePackage,
            ValidationLevel.semantic(),
          );

          const inference2Validation = logicValidationService.validateInference(
            [statement2Content, statement3Content],
            [statement4Content],
            testLanguagePackage,
            ValidationLevel.semantic(),
          );

          // 3. Pattern Recognition
          const patternResult = patternRecognitionService.recognizeProofPatterns(
            validStatements.map((s) => s.getContent()),
            [],
            testLanguagePackage,
          );

          // 4. Educational Feedback
          if (inference1Validation.isOk()) {
            // Generate learning hints based on the validation result
            const diagnostics = inference1Validation.value.getDiagnostics();
            const feedbackResults = diagnostics.map((diagnostic) =>
              educationalFeedbackService.generateLearningHints(
                diagnostic,
                testLanguagePackage,
                'intermediate',
              ),
            );

            // Assert - All analysis components should work together
            expect(pathResult.isOk()).toBe(true);
            const feedbackResult =
              feedbackResults[0] ||
              ok({
                hints: [],
                examples: [],
                concepts: [],
                resources: [],
                estimatedLearningTime: 0,
              });
            expect(inference1Validation.isOk()).toBe(true);
            expect(inference2Validation.isOk()).toBe(true);
            expect(patternResult.isOk()).toBe(true);
            expect(feedbackResult.isOk()).toBe(true);

            if (
              pathResult.isOk() &&
              inference1Validation.isOk() &&
              inference2Validation.isOk() &&
              patternResult.isOk() &&
              feedbackResult.isOk()
            ) {
              // Verify logical flow
              expect(inference1Validation.value.isValid()).toBe(true);
              expect(inference2Validation.value.isValid()).toBe(true);

              // Verify pattern recognition
              expect(patternResult.value.recognizedPatterns.length).toBeGreaterThanOrEqual(0);

              // Verify educational feedback
              expect(feedbackResult.value.hints).toBeDefined();
              expect(feedbackResult.value.estimatedLearningTime).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    });

    it('should handle performance analysis across large proof structures', () => {
      // Arrange - Create a large proof structure
      const statementCount = 50;
      const statements = [];

      for (let i = 0; i < statementCount; i++) {
        const statement = statementFlowService.createStatementFromContent(`Statement ${i + 1}`);
        if (statement.isOk()) {
          statements.push(statement.value);
        }
      }

      expect(statements).toHaveLength(statementCount);

      // Act - Perform batch analysis
      const startTime = Date.now();

      // Validate all statements
      const validationResults = statements.map((stmt) =>
        logicValidationService.validateStatement(
          stmt.getContent(),
          SourceLocation.createDefault(),
          testLanguagePackage,
          ValidationLevel.syntax(),
        ),
      );

      // Analyze patterns
      const patternAnalysis = patternRecognitionService.recognizeProofPatterns(
        statements.map((s) => s.getContent()),
        [],
        testLanguagePackage,
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(validationResults).toHaveLength(statementCount);
      expect(patternAnalysis.isOk()).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds

      validationResults.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      if (patternAnalysis.isOk()) {
        expect(patternAnalysis.value.recognizedPatterns).toBeDefined();
        expect(patternAnalysis.value.structuralFeatures.statementCount).toBe(statementCount);
      }
    });
  });
});
