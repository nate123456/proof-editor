/**
 * Integration Test Factories and Utilities
 *
 * Comprehensive factories for creating realistic domain scenarios across all bounded contexts:
 * - Core Domain entity factories with realistic relationships
 * - Language Intelligence test scenarios and mock data
 * - Package Ecosystem realistic package structures
 * - Synchronization multi-device scenarios
 * - Cross-context integration test scenarios
 * - Performance testing utilities
 */

import { ok } from 'neverthrow';

// Language Intelligence Context
import { InferenceRule } from '../../contexts/language-intelligence/domain/entities/InferenceRule.js';
import { LanguagePackage } from '../../contexts/language-intelligence/domain/entities/LanguagePackage.js';
import { ValidationResult } from '../../contexts/language-intelligence/domain/entities/ValidationResult.js';
import { LanguagePackageId } from '../../contexts/language-intelligence/domain/value-objects/LanguagePackageId.js';
import { PackageName } from '../../contexts/language-intelligence/domain/value-objects/PackageName.js';
import { RuleDescription } from '../../contexts/language-intelligence/domain/value-objects/RuleDescription.js';
import { RuleName } from '../../contexts/language-intelligence/domain/value-objects/RuleName.js';
import { RulePattern } from '../../contexts/language-intelligence/domain/value-objects/RulePattern.js';
import { ValidationLevel } from '../../contexts/language-intelligence/domain/value-objects/ValidationLevel.js';
import { ValidationMetrics } from '../../contexts/language-intelligence/domain/value-objects/ValidationMetrics.js';
// Package Ecosystem Context
import { Package } from '../../contexts/package-ecosystem/domain/entities/Package.js';
import { PackageVersion } from '../../contexts/package-ecosystem/domain/entities/PackageVersion.js';
import { PackageId } from '../../contexts/package-ecosystem/domain/value-objects/package-id.js';
import { PackageManifest } from '../../contexts/package-ecosystem/domain/value-objects/package-manifest.js';
import { PackageSource } from '../../contexts/package-ecosystem/domain/value-objects/package-source.js';
// Synchronization Context
import { Operation } from '../../contexts/synchronization/domain/entities/Operation.js';
import { SyncState } from '../../contexts/synchronization/domain/entities/SyncState.js';
import { VectorClock } from '../../contexts/synchronization/domain/entities/VectorClock.js';
import { DeviceId } from '../../contexts/synchronization/domain/value-objects/DeviceId.js';
import { LogicalTimestamp } from '../../contexts/synchronization/domain/value-objects/LogicalTimestamp.js';
import { OperationId } from '../../contexts/synchronization/domain/value-objects/OperationId.js';
import { OperationPayload } from '../../contexts/synchronization/domain/value-objects/OperationPayload.js';
import { OperationType } from '../../contexts/synchronization/domain/value-objects/OperationType.js';
// Core Domain
import { AtomicArgument } from '../../domain/entities/AtomicArgument.js';
import { OrderedSet } from '../../domain/entities/OrderedSet.js';
import { Statement } from '../../domain/entities/Statement.js';

/**
 * Test scenario definitions for common proof patterns and domain scenarios
 */
export const TestScenarios = {
  // Simple logical proof scenarios
  modusPonens: {
    name: 'Modus Ponens',
    statements: [
      'If it is raining, then the streets are wet',
      'It is raining',
      'Therefore, the streets are wet',
    ],
    expectedValid: true,
    complexity: 'simple',
  },

  modusTollens: {
    name: 'Modus Tollens',
    statements: [
      'If it is raining, then the streets are wet',
      'The streets are not wet',
      'Therefore, it is not raining',
    ],
    expectedValid: true,
    complexity: 'simple',
  },

  hypotheticalSyllogism: {
    name: 'Hypothetical Syllogism',
    statements: ['If P then Q', 'If Q then R', 'Therefore, if P then R'],
    expectedValid: true,
    complexity: 'medium',
  },

  // Complex mathematical proof scenarios
  mathematicalInduction: {
    name: 'Mathematical Induction',
    statements: [
      'Base case: P(1) is true',
      'Inductive step: For all k, if P(k) then P(k+1)',
      'Therefore, P(n) is true for all natural numbers n',
    ],
    expectedValid: true,
    complexity: 'complex',
  },

  // Invalid logical scenarios
  affirmingConsequent: {
    name: 'Affirming the Consequent (Fallacy)',
    statements: [
      'If it is raining, then the streets are wet',
      'The streets are wet',
      'Therefore, it is raining',
    ],
    expectedValid: false,
    complexity: 'simple',
    fallacyType: 'affirming-consequent',
  },

  // Multi-step proof scenarios
  complexProofChain: {
    name: 'Complex Proof Chain',
    statements: [
      'All humans are mortal',
      'All mortals have finite lifespans',
      'Socrates is human',
      'Therefore, Socrates is mortal',
      'Therefore, Socrates has a finite lifespan',
    ],
    expectedValid: true,
    complexity: 'complex',
    steps: 2,
  },
} as const;

/**
 * Factory for creating realistic core domain entities
 */
export class CoreDomainFactory {
  private static statementCounter = 0;
  private static argumentCounter = 0;

  /**
   * Creates a statement with realistic content
   */
  static createStatement(content?: string): Statement {
    this.statementCounter++;
    const defaultContent = content ?? `Test statement ${this.statementCounter}`;
    const result = Statement.create(defaultContent);
    if (result.isErr()) {
      throw new Error(`Failed to create statement: ${result.error.message}`);
    }
    return result.value;
  }

  /**
   * Creates an ordered set from statements or statement contents
   */
  static createOrderedSet(items: (Statement | string)[]): OrderedSet {
    const statements = items.map(item =>
      typeof item === 'string' ? this.createStatement(item) : item
    );
    const statementIds = statements.map(stmt => stmt.getId());
    const result = OrderedSet.create(statementIds);
    if (result.isErr()) {
      throw new Error(`Failed to create ordered set: ${result.error.message}`);
    }
    return result.value;
  }

  /**
   * Creates an atomic argument with premise and conclusion sets
   */
  static createAtomicArgument(
    premises: (Statement | string)[],
    conclusions: (Statement | string)[]
  ): AtomicArgument {
    this.argumentCounter++;
    const premiseSet = this.createOrderedSet(premises);
    const conclusionSet = this.createOrderedSet(conclusions);

    const result = AtomicArgument.create(premiseSet.getId(), conclusionSet.getId());
    if (result.isErr()) {
      throw new Error(`Failed to create atomic argument: ${result.error.message}`);
    }

    const argument = result.value;
    premiseSet.addAtomicArgumentReference(argument.getId(), 'premise');
    conclusionSet.addAtomicArgumentReference(argument.getId(), 'conclusion');

    return argument;
  }

  /**
   * Creates a complete proof scenario based on test scenario
   */
  static createProofScenario(scenario: (typeof TestScenarios)[keyof typeof TestScenarios]): {
    statements: Statement[];
    arguments: AtomicArgument[];
    isValid: boolean;
  } {
    const statements = scenario.statements.map(content => this.createStatement(content));
    const argumentsList: AtomicArgument[] = [];

    // Create arguments based on scenario structure
    if (scenario.statements.length >= 3) {
      // Create simple two-premise argument
      const premises = statements.slice(0, -1);
      const conclusion = statements[statements.length - 1]!;
      argumentsList.push(this.createAtomicArgument(premises, [conclusion]));
    }

    return {
      statements,
      arguments: argumentsList,
      isValid: scenario.expectedValid,
    };
  }
}

/**
 * Factory for creating language intelligence test data
 */
export class LanguageIntelligenceFactory {
  private static packageCounter = 0;
  private static ruleCounter = 0;

  /**
   * Creates a realistic language package with inference rules
   */
  static createLanguagePackage(
    name?: string,
    rules?: { name: string; premises: string[]; conclusions: string[] }[]
  ): LanguagePackage {
    this.packageCounter++;
    const defaultName = name ?? `Test Language Package ${this.packageCounter}`;

    const packageId = LanguagePackageId.create(`test-package-${this.packageCounter}`);
    const packageName = PackageName.create(defaultName);

    if (packageId.isErr() || packageName.isErr()) {
      throw new Error('Failed to create language package identifiers');
    }

    const packageResult = LanguagePackage.create(
      packageId.value,
      packageName.value,
      `Test package for ${defaultName}`
    );

    if (packageResult.isErr()) {
      throw new Error(`Failed to create language package: ${packageResult.error.message}`);
    }

    const languagePackage = packageResult.value;

    // Add default rules if none provided
    const defaultRules = rules ?? [
      { name: 'modus-ponens', premises: ['P', 'P → Q'], conclusions: ['Q'] },
      { name: 'modus-tollens', premises: ['P → Q', '¬Q'], conclusions: ['¬P'] },
      { name: 'hypothetical-syllogism', premises: ['P → Q', 'Q → R'], conclusions: ['P → R'] },
    ];

    for (const rule of defaultRules) {
      const inferenceRule = this.createInferenceRule(rule.name, rule.premises, rule.conclusions);
      languagePackage.addInferenceRule(inferenceRule);
    }

    return languagePackage;
  }

  /**
   * Creates an inference rule with realistic patterns
   */
  static createInferenceRule(
    name: string,
    premises: string[],
    conclusions: string[]
  ): InferenceRule {
    this.ruleCounter++;

    const ruleName = RuleName.create(name);
    const ruleDescription = RuleDescription.create(`Test rule: ${name}`);
    const rulePattern = RulePattern.create(premises, conclusions);

    if (ruleName.isErr() || ruleDescription.isErr() || rulePattern.isErr()) {
      throw new Error('Failed to create inference rule components');
    }

    const result = InferenceRule.create(ruleName.value, ruleDescription.value, rulePattern.value);

    if (result.isErr()) {
      throw new Error(`Failed to create inference rule: ${result.error.message}`);
    }

    return result.value;
  }

  /**
   * Creates a realistic validation result
   */
  static createValidationResult(
    isSuccessful: boolean,
    level: 'syntax' | 'semantic' | 'style' = 'semantic'
  ): ValidationResult {
    const validationLevel = ValidationLevel.create(level);
    if (validationLevel.isErr()) {
      throw new Error('Failed to create validation level');
    }

    const metrics = ValidationMetrics.empty();
    const documentId = `test-doc-${Date.now()}`;
    const packageId = 'test-package';

    const result = isSuccessful
      ? ValidationResult.createSuccessfulValidation(
          validationLevel.value,
          documentId,
          packageId,
          metrics
        )
      : ValidationResult.createFailedValidation(
          validationLevel.value,
          [],
          documentId,
          packageId,
          metrics
        );

    if (result.isErr()) {
      throw new Error(`Failed to create validation result: ${result.error.message}`);
    }

    return result.value;
  }
}

/**
 * Factory for creating package ecosystem test data
 */
export class PackageEcosystemFactory {
  private static packageCounter = 0;

  /**
   * Creates a realistic package with proper manifest and source
   */
  static createPackage(name?: string, version?: string, dependencies?: string[]): Package {
    this.packageCounter++;
    const defaultName = name ?? `Test Package ${this.packageCounter}`;
    const defaultVersion = version ?? '1.0.0';

    const packageId = PackageId.create(`test-package-${this.packageCounter}`);
    const packageVersion = PackageVersion.create(defaultVersion);
    const packageManifest = PackageManifest.create({
      name: defaultName,
      version: defaultVersion,
      description: `Test package: ${defaultName}`,
      dependencies: dependencies ?? [],
    });
    const packageSource = PackageSource.createFromGit({
      url: `https://github.com/test/${defaultName.toLowerCase().replace(/\s+/g, '-')}`,
      ref: 'main',
    });

    if (
      packageId.isErr() ||
      packageVersion.isErr() ||
      packageManifest.isErr() ||
      packageSource.isErr()
    ) {
      throw new Error('Failed to create package components');
    }

    const result = Package.create(
      packageId.value,
      packageVersion.value.getValue(),
      packageManifest.value,
      packageSource.value
    );

    if (result.isErr()) {
      throw new Error(`Failed to create package: ${result.error.message}`);
    }

    return result.value;
  }

  /**
   * Creates a package ecosystem with interdependent packages
   */
  static createPackageEcosystem(packageCount = 5): {
    packages: Package[];
    dependencies: { from: string; to: string }[];
  } {
    const packages: Package[] = [];
    const dependencies: { from: string; to: string }[] = [];

    // Create base packages
    for (let i = 0; i < packageCount; i++) {
      const pkg = this.createPackage(`Ecosystem Package ${i + 1}`, `1.${i}.0`);
      packages.push(pkg);
    }

    // Create realistic dependency relationships
    for (let i = 1; i < packages.length; i++) {
      const dependentPackage = packages[i]!;
      const dependencyPackage = packages[i - 1]!;

      dependencies.push({
        from: dependentPackage.getId().toString(),
        to: dependencyPackage.getId().toString(),
      });
    }

    return { packages, dependencies };
  }
}

/**
 * Factory for creating synchronization test scenarios
 */
export class SynchronizationFactory {
  private static deviceCounter = 0;
  private static operationCounter = 0;

  /**
   * Creates a realistic device ID
   */
  static createDevice(name?: string): DeviceId {
    this.deviceCounter++;
    const deviceName = name ?? `test-device-${this.deviceCounter}`;
    const result = DeviceId.create(deviceName);
    if (result.isErr()) {
      throw new Error(`Failed to create device: ${result.error.message}`);
    }
    return result.value;
  }

  /**
   * Creates a multi-device collaboration scenario
   */
  static createMultiDeviceScenario(deviceCount = 3): {
    devices: DeviceId[];
    operations: Operation[];
    syncStates: SyncState[];
  } {
    const devices: DeviceId[] = [];
    const operations: Operation[] = [];
    const syncStates: SyncState[] = [];

    // Create devices
    for (let i = 0; i < deviceCount; i++) {
      const device = this.createDevice(`collaborative-device-${i + 1}`);
      devices.push(device);

      // Create sync state for device
      const syncState = SyncState.create(device);
      if (syncState.isOk()) {
        syncStates.push(syncState.value);
      }
    }

    // Create operations from each device
    devices.forEach((device, index) => {
      const operation = this.createOperation(device, devices, `edit-from-device-${index + 1}`, {
        text: `Edit from device ${index + 1}`,
        position: index * 10,
      });
      operations.push(operation);
    });

    return { devices, operations, syncStates };
  }

  /**
   * Creates a realistic operation
   */
  static createOperation(
    device: DeviceId,
    allDevices: DeviceId[],
    operationType = 'EDIT',
    payload: Record<string, unknown> = {}
  ): Operation {
    this.operationCounter++;

    const operationId = OperationId.create(`test-operation-${this.operationCounter}`);
    const timestamp = LogicalTimestamp.create(Date.now() + this.operationCounter);
    const opType = OperationType.create(operationType);
    const opPayload = OperationPayload.create(payload);
    const vectorClock = VectorClock.create(allDevices);

    if (
      operationId.isErr() ||
      timestamp.isErr() ||
      opType.isErr() ||
      opPayload.isErr() ||
      vectorClock.isErr()
    ) {
      throw new Error('Failed to create operation components');
    }

    vectorClock.value.increment(device);

    const result = Operation.create(
      operationId.value,
      opType.value,
      opPayload.value,
      device,
      timestamp.value,
      vectorClock.value
    );

    if (result.isErr()) {
      throw new Error(`Failed to create operation: ${result.error.message}`);
    }

    return result.value;
  }

  /**
   * Creates a conflict scenario with concurrent operations
   */
  static createConflictScenario(): {
    device1: DeviceId;
    device2: DeviceId;
    conflictingOperations: [Operation, Operation];
  } {
    const device1 = this.createDevice('conflict-device-1');
    const device2 = this.createDevice('conflict-device-2');
    const devices = [device1, device2];

    const operation1 = this.createOperation(device1, devices, 'CONCURRENT_EDIT', {
      text: 'Edit from device 1',
      position: 5,
    });

    const operation2 = this.createOperation(device2, devices, 'CONCURRENT_EDIT', {
      text: 'Edit from device 2',
      position: 7,
    });

    return {
      device1,
      device2,
      conflictingOperations: [operation1, operation2],
    };
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Creates a large-scale test scenario for performance testing
   */
  static createLargeScaleScenario(config: {
    statementCount: number;
    argumentCount: number;
    packageCount: number;
    deviceCount: number;
  }): {
    statements: Statement[];
    arguments: AtomicArgument[];
    packages: Package[];
    devices: DeviceId[];
    operations: Operation[];
  } {
    const statements: Statement[] = [];
    const argumentsList: AtomicArgument[] = [];
    const packages: Package[] = [];
    const devices: DeviceId[] = [];
    const operations: Operation[] = [];

    // Create statements
    for (let i = 0; i < config.statementCount; i++) {
      statements.push(CoreDomainFactory.createStatement(`Performance test statement ${i + 1}`));
    }

    // Create arguments
    for (let i = 0; i < config.argumentCount; i++) {
      const premiseCount = Math.min(3, statements.length - 1);
      const premises = statements.slice(i, i + premiseCount);
      const conclusion = statements[(i + premiseCount) % statements.length]!;
      argumentsList.push(CoreDomainFactory.createAtomicArgument(premises, [conclusion]));
    }

    // Create packages
    for (let i = 0; i < config.packageCount; i++) {
      packages.push(PackageEcosystemFactory.createPackage(`Perf Package ${i + 1}`));
    }

    // Create devices and operations
    for (let i = 0; i < config.deviceCount; i++) {
      const device = SynchronizationFactory.createDevice(`perf-device-${i + 1}`);
      devices.push(device);
    }

    devices.forEach((device, index) => {
      const operation = SynchronizationFactory.createOperation(
        device,
        devices,
        'PERFORMANCE_TEST',
        { deviceIndex: index, testData: `performance-test-${index}` }
      );
      operations.push(operation);
    });

    return {
      statements,
      arguments: argumentsList,
      packages,
      devices,
      operations,
    };
  }

  /**
   * Measures execution time of a function
   */
  static async measureExecutionTime<T>(
    operation: () => Promise<T> | T,
    iterations = 1
  ): Promise<{ result: T; averageTime: number; totalTime: number }> {
    const times: number[] = [];
    let result: T;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      result = await operation();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;

    return {
      result: result!,
      averageTime,
      totalTime,
    };
  }

  /**
   * Creates a benchmark suite for cross-context operations
   */
  static createBenchmarkSuite() {
    return {
      smallScale: () =>
        this.createLargeScaleScenario({
          statementCount: 10,
          argumentCount: 5,
          packageCount: 3,
          deviceCount: 2,
        }),
      mediumScale: () =>
        this.createLargeScaleScenario({
          statementCount: 50,
          argumentCount: 25,
          packageCount: 10,
          deviceCount: 5,
        }),
      largeScale: () =>
        this.createLargeScaleScenario({
          statementCount: 200,
          argumentCount: 100,
          packageCount: 20,
          deviceCount: 10,
        }),
    };
  }
}

/**
 * Utility for creating realistic error scenarios
 */
export class ErrorScenarioFactory {
  /**
   * Creates scenarios that should trigger specific error conditions
   */
  static createErrorScenarios() {
    return {
      invalidStatement: () => {
        // Attempt to create statement with invalid content
        return Statement.create('');
      },

      circularDependency: () => {
        // Create statements that would form a circular dependency
        const stmt1 = CoreDomainFactory.createStatement('P implies Q');
        const stmt2 = CoreDomainFactory.createStatement('Q implies R');
        const stmt3 = CoreDomainFactory.createStatement('R implies P');
        return { stmt1, stmt2, stmt3 };
      },

      invalidPackageManifest: () => {
        // Create package with invalid manifest
        return PackageManifest.create({
          name: '', // Invalid empty name
          version: 'not-a-version', // Invalid version format
          description: '',
        });
      },

      conflictingOperations: () => {
        // Create operations that would conflict
        const scenario = SynchronizationFactory.createConflictScenario();
        return scenario.conflictingOperations;
      },
    };
  }
}

/**
 * Mock data generators for external dependencies
 */
export class MockDataFactory {
  /**
   * Creates mock repository responses
   */
  static createMockRepositoryResponses() {
    return {
      packageRepository: {
        findById: () => ok(PackageEcosystemFactory.createPackage()),
        findByName: () => ok([PackageEcosystemFactory.createPackage()]),
        save: () => ok(undefined),
        delete: () => ok(undefined),
        findAll: () =>
          ok([
            PackageEcosystemFactory.createPackage('Mock Package 1'),
            PackageEcosystemFactory.createPackage('Mock Package 2'),
          ]),
        exists: () => ok(true),
        findBySource: () => ok([PackageEcosystemFactory.createPackage()]),
        findByVersion: () => ok([PackageEcosystemFactory.createPackage()]),
        findInstalled: () => ok([PackageEcosystemFactory.createPackage()]),
      },

      dependencyRepository: {
        findDependenciesForPackage: () => ok([]),
        findPackagesThatDependOn: () => ok([]),
        save: () => ok(undefined),
        findByPackageId: () => ok([]),
        findDependentsOf: () => ok([]),
        findTransitiveDependencies: () => ok([]),
        delete: () => ok(undefined),
        deleteByPackageId: () => ok(undefined),
        exists: () => ok(false),
        hasCycle: () => ok(false),
      },
    };
  }

  /**
   * Creates mock service responses
   */
  static createMockServiceResponses() {
    return {
      validationService: {
        validateStatement: () => LanguageIntelligenceFactory.createValidationResult(true),
        validateInference: () => LanguageIntelligenceFactory.createValidationResult(true),
        validateProofStructure: () => LanguageIntelligenceFactory.createValidationResult(true),
      },

      patternRecognitionService: {
        recognizeLogicalPatterns: () => ok([]),
        analyzeInferencePatterns: () => ok([]),
        recognizeProofPatterns: () =>
          ok({
            recognizedPatterns: [],
            structuralFeatures: {
              statementCount: 1,
              connectionCount: 0,
              maxDepth: 1,
              branchingFactor: 0,
              isLinear: true,
              isTree: true,
              hasCycles: false,
            },
            logicalFeatures: {
              hasQuantifiers: false,
              hasModalOperators: false,
              hasNegations: false,
              hasImplications: false,
              hasConjunctions: false,
              hasDisjunctions: false,
              logicalComplexity: 0.1,
            },
            patternInsights: [],
            confidence: 0.5,
            performance: {},
          }),
      },
    };
  }
}
