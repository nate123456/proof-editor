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
import { ValidationResult as LanguageValidationResult } from '../../contexts/language-intelligence/domain/entities/ValidationResult.js';
import { LanguageCapabilities } from '../../contexts/language-intelligence/domain/value-objects/LanguageCapabilities.js';
import { LanguagePackageId } from '../../contexts/language-intelligence/domain/value-objects/LanguagePackageId.js';
import { PackageName } from '../../contexts/language-intelligence/domain/value-objects/PackageName.js';
import { RuleDescription } from '../../contexts/language-intelligence/domain/value-objects/RuleDescription.js';
import { RuleName } from '../../contexts/language-intelligence/domain/value-objects/RuleName.js';
import { RulePattern } from '../../contexts/language-intelligence/domain/value-objects/RulePattern.js';
import { ValidationLevel } from '../../contexts/language-intelligence/domain/value-objects/ValidationLevel.js';
import { ValidationMetrics } from '../../contexts/language-intelligence/domain/value-objects/ValidationMetrics.js';
// Package Ecosystem Context
import { Package } from '../../contexts/package-ecosystem/domain/entities/Package.js';
import type { ValidationResult } from '../../contexts/package-ecosystem/domain/types/common-types.js';
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
import {
  OperationType,
  type OperationTypeValue,
} from '../../contexts/synchronization/domain/value-objects/OperationType.js';
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
 * Factory functions for creating realistic core domain entities
 */

// Module-level counters for unique IDs
let statementCounter = 0;
let _argumentCounter = 0;

/**
 * Creates a statement with realistic content
 */
export function createStatement(content?: string): Statement {
  statementCounter++;
  const defaultContent = content ?? `Test statement ${statementCounter}`;
  const result = Statement.create(defaultContent);
  if (result.isErr()) {
    throw new Error(`Failed to create statement: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an ordered set from statements or statement contents
 */
export function createOrderedSet(items: (Statement | string)[]): OrderedSet {
  const statements = items.map((item) => (typeof item === 'string' ? createStatement(item) : item));
  const statementIds = statements.map((stmt) => stmt.getId());
  const result = OrderedSet.create(statementIds);
  if (result.isErr()) {
    throw new Error(`Failed to create ordered set: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates an atomic argument with premise and conclusion sets
 */
export function createAtomicArgument(
  premises: (Statement | string)[],
  conclusions: (Statement | string)[],
): AtomicArgument {
  _argumentCounter++;
  const premiseSet = createOrderedSet(premises);
  const conclusionSet = createOrderedSet(conclusions);

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
export function createProofScenario(scenario: (typeof TestScenarios)[keyof typeof TestScenarios]): {
  statements: Statement[];
  arguments: AtomicArgument[];
  isValid: boolean;
} {
  const statements = scenario.statements.map((content) => createStatement(content));
  const argumentsList: AtomicArgument[] = [];

  // Create arguments based on scenario structure
  if (scenario.statements.length >= 3) {
    // Create simple two-premise argument
    const premises = statements.slice(0, -1);
    const lastStatement = statements[statements.length - 1];
    if (lastStatement) {
      argumentsList.push(createAtomicArgument(premises, [lastStatement]));
    }
  }

  return {
    statements,
    arguments: argumentsList,
    isValid: scenario.expectedValid,
  };
}

/**
 * Factory functions for creating language intelligence test data
 */

// Module-level counters for unique IDs
let languagePackageCounter = 0;
let _languageRuleCounter = 0;

/**
 * Creates a realistic language package with inference rules
 */
export function createLanguagePackage(
  name?: string,
  rules?: { name: string; premises: string[]; conclusions: string[] }[],
): LanguagePackage {
  languagePackageCounter++;
  const defaultName = name ?? `Test Language Package ${languagePackageCounter}`;

  const packageId = LanguagePackageId.create(`test-package-${languagePackageCounter}`);
  const packageName = PackageName.create(defaultName);

  if (packageId.isErr() || packageName.isErr()) {
    throw new Error('Failed to create language package identifiers');
  }

  const capabilities = LanguageCapabilities.propositionalOnly();

  const packageResult = LanguagePackage.create(packageName.value.getValue(), '1.0.0', capabilities);

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
    const inferenceRule = createInferenceRule(rule.name, rule.premises, rule.conclusions);
    languagePackage.addInferenceRule(inferenceRule);
  }

  return languagePackage;
}

/**
 * Creates an inference rule with realistic patterns
 */
export function createInferenceRule(
  name: string,
  premises: string[],
  conclusions: string[],
): InferenceRule {
  _languageRuleCounter++;

  const ruleName = RuleName.create(name);
  const ruleDescription = RuleDescription.create(`Test rule: ${name}`);
  const rulePattern = RulePattern.createLogicalPattern(
    premises,
    conclusions,
    `pattern-${_languageRuleCounter}`,
    1.0,
  );

  if (ruleName.isErr() || ruleDescription.isErr() || rulePattern.isErr()) {
    throw new Error('Failed to create inference rule components');
  }

  const result = InferenceRule.create(
    ruleName.value.getValue(),
    ruleDescription.value.getValue(),
    rulePattern.value,
    `test-package-${languagePackageCounter}`, // languagePackageId
  );

  if (result.isErr()) {
    throw new Error(`Failed to create inference rule: ${result.error.message}`);
  }

  return result.value;
}

/**
 * Creates a realistic validation result
 */
export function createValidationResult(
  isSuccessful: boolean,
  level: 'syntax' | 'semantic' | 'style' = 'semantic',
): LanguageValidationResult {
  const validationLevel = ValidationLevel.fromString(level);
  if (validationLevel.isErr()) {
    throw new Error('Failed to create validation level');
  }

  const metrics = ValidationMetrics.empty();
  const documentId = `test-doc-${Date.now()}`;
  const packageId = 'test-package';

  const result = isSuccessful
    ? LanguageValidationResult.createSuccessfulValidation(
        validationLevel.value,
        documentId,
        packageId,
        metrics,
      )
    : LanguageValidationResult.createFailedValidation(
        validationLevel.value,
        [],
        documentId,
        packageId,
        metrics,
      );

  if (result.isErr()) {
    throw new Error(`Failed to create validation result: ${result.error.message}`);
  }

  return result.value;
}

/**
 * Factory for creating package ecosystem test data
 */
let packageEcosystemCounter = 0;

/**
 * Creates a realistic package with proper manifest and source
 */
export function createPackage(name?: string, version?: string, dependencies?: string[]): Package {
  packageEcosystemCounter++;
  const inputName = name ?? `test-package-${packageEcosystemCounter}`;
  const defaultVersion = version ?? '1.0.0';

  // Normalize the name to be valid for PackageId (lowercase, hyphens only)
  const normalizedName = inputName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  // Create manifest first to get the correct PackageId
  const packageManifest = PackageManifest.create({
    name: normalizedName,
    version: defaultVersion,
    description: `Test package: ${inputName}`,
    author: 'Test Author',
    dependencies: dependencies ? Object.fromEntries(dependencies.map((dep) => [dep, '*'])) : {},
    license: 'MIT',
    homepage: `https://github.com/test/${normalizedName}`,
    requirements: {
      node: '>=14.0.0',
    },
    lsp: {
      desktop: {
        command: ['proof-lsp'],
        transport: 'stdio' as const,
      },
    },
  });

  if (packageManifest.isErr()) {
    throw new Error(`Failed to create package manifest: ${packageManifest.error.message}`);
  }

  // Use the same PackageId as the manifest
  const packageId = packageManifest.value.getPackageId();

  const packageSource = PackageSource.createFromGit({
    url: `https://github.com/test/${normalizedName}`,
    ref: 'main',
  });

  if (packageSource.isErr()) {
    throw new Error(`Failed to create package source: ${packageSource.error.message}`);
  }

  const validationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const result = Package.create({
    id: packageId,
    source: packageSource.value,
    manifest: packageManifest.value,
    sdkInterfaces: [],
    validationResult,
  });

  if (result.isErr()) {
    throw new Error(`Failed to create package: ${result.error.message}`);
  }

  return result.value;
}

/**
 * Creates a package ecosystem with interdependent packages
 */
export function createPackageEcosystem(packageCount = 5): {
  packages: Package[];
  dependencies: { from: string; to: string }[];
} {
  const packages: Package[] = [];
  const dependencies: { from: string; to: string }[] = [];

  // Create base packages
  for (let i = 0; i < packageCount; i++) {
    const pkg = createPackage(`Ecosystem Package ${i + 1}`, `1.${i}.0`);
    packages.push(pkg);
  }

  // Create realistic dependency relationships
  for (let i = 1; i < packages.length; i++) {
    const dependentPackage = packages[i];
    if (!dependentPackage) continue;
    const dependencyPackage = packages[i - 1];
    if (!dependencyPackage) continue;

    dependencies.push({
      from: dependentPackage.getId().toString(),
      to: dependencyPackage.getId().toString(),
    });
  }

  return { packages, dependencies };
}

/**
 * Factory for creating synchronization test scenarios
 */
let deviceCounter = 0;
let operationCounter = 0;

/**
 * Creates a realistic device ID
 */
export function createDevice(name?: string): DeviceId {
  deviceCounter++;
  const inputName = name ?? `test-device-${deviceCounter}`;

  // Normalize the device name to be valid (alphanumeric, hyphens, underscores only)
  const normalizedName = inputName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/^[-_]+|[-_]+$/g, '')
    .replace(/[-_]+/g, '-');

  const result = DeviceId.create(normalizedName);
  if (result.isErr()) {
    throw new Error(`Failed to create device: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Creates a multi-device collaboration scenario
 */
export function createMultiDeviceScenario(deviceCount = 3): {
  devices: DeviceId[];
  operations: Operation[];
  syncStates: SyncState[];
} {
  const devices: DeviceId[] = [];
  const operations: Operation[] = [];
  const syncStates: SyncState[] = [];

  // Create devices
  for (let i = 0; i < deviceCount; i++) {
    const device = createDevice(`collaborative-device-${i + 1}`);
    devices.push(device);

    // Create sync state for device
    const syncState = SyncState.create(device);
    if (syncState.isOk()) {
      syncStates.push(syncState.value);
    }
  }

  // Create operations from each device
  devices.forEach((device, index) => {
    const operation = createOperation(device, devices, 'UPDATE_STATEMENT', {
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
export function createOperation(
  device: DeviceId,
  _allDevices: DeviceId[],
  operationType: OperationTypeValue = 'UPDATE_STATEMENT',
  payload: Record<string, unknown> = {},
): Operation {
  operationCounter++;

  const operationId = OperationId.create(`test-operation-${operationCounter}`);
  if (operationId.isErr()) {
    throw new Error(`Failed to create operation ID: ${operationId.error.message}`);
  }

  const vectorClock = VectorClock.create(device);
  if (vectorClock.isErr()) {
    throw new Error(`Failed to create vector clock: ${vectorClock.error.message}`);
  }

  const incrementedClock = vectorClock.value.incrementForDevice(device);
  if (incrementedClock.isErr()) {
    throw new Error(`Failed to increment vector clock: ${incrementedClock.error.message}`);
  }

  const timestamp = LogicalTimestamp.create(
    device,
    Date.now() + operationCounter,
    incrementedClock.value,
  );
  if (timestamp.isErr()) {
    throw new Error(`Failed to create timestamp: ${timestamp.error.message}`);
  }

  const opType = OperationType.create(operationType);
  if (opType.isErr()) {
    throw new Error(`Failed to create operation type: ${opType.error.message}`);
  }

  // Create appropriate payload based on operation type
  let finalPayload = payload;
  if (operationType === 'UPDATE_STATEMENT' || operationType === 'CREATE_STATEMENT') {
    finalPayload = {
      id: `statement-${operationCounter}`,
      content: `Test statement content ${operationCounter}`,
      ...payload,
    };
  } else if (operationType === 'UPDATE_ARGUMENT' || operationType === 'CREATE_ARGUMENT') {
    finalPayload = {
      id: `argument-${operationCounter}`,
      premises: [`premise-${operationCounter}`],
      conclusions: [`conclusion-${operationCounter}`],
      ...payload,
    };
  } else if (operationType === 'CREATE_TREE') {
    finalPayload = {
      id: `tree-${operationCounter}`,
      rootNodeId: `node-${operationCounter}`,
      position: { x: 0, y: 0 },
      ...payload,
    };
  } else if (operationType === 'UPDATE_TREE_POSITION') {
    finalPayload = {
      x: 10,
      y: 20,
      ...payload,
    };
  } else if (operationType === 'CREATE_CONNECTION') {
    finalPayload = {
      sourceId: `source-${operationCounter}`,
      targetId: `target-${operationCounter}`,
      connectionType: 'logical',
      ...payload,
    };
  } else if (operationType === 'UPDATE_METADATA') {
    finalPayload = {
      key: `test-key-${operationCounter}`,
      value: `test-value-${operationCounter}`,
      ...payload,
    };
  }

  const opPayload = OperationPayload.create(finalPayload, opType.value);
  if (opPayload.isErr()) {
    throw new Error(`Failed to create operation payload: ${opPayload.error.message}`);
  }

  const result = Operation.create(
    operationId.value,
    device,
    opType.value,
    `/${operationType}/test-target`,
    opPayload.value,
    incrementedClock.value,
  );

  if (result.isErr()) {
    throw new Error(`Failed to create operation: ${result.error.message}`);
  }

  return result.value;
}

/**
 * Creates a conflict scenario with concurrent operations
 */
export function createConflictScenario(): {
  device1: DeviceId;
  device2: DeviceId;
  conflictingOperations: [Operation, Operation];
} {
  const device1 = createDevice('conflict-device-1');
  const device2 = createDevice('conflict-device-2');
  const devices = [device1, device2];

  const operation1 = createOperation(device1, devices, 'UPDATE_STATEMENT', {
    text: 'Edit from device 1',
    position: 5,
  });

  const operation2 = createOperation(device2, devices, 'UPDATE_STATEMENT', {
    text: 'Edit from device 2',
    position: 7,
  });

  return {
    device1,
    device2,
    conflictingOperations: [operation1, operation2],
  };
}

/**
 * Performance testing utilities
 */
export function createLargeScaleScenario(config: {
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
    statements.push(createStatement(`Performance test statement ${i + 1}`));
  }

  // Create arguments
  for (let i = 0; i < config.argumentCount; i++) {
    const premiseCount = Math.min(3, statements.length - 1);
    const premises = statements.slice(i, i + premiseCount);
    const conclusion = statements[(i + premiseCount) % statements.length];
    if (!conclusion) continue;
    argumentsList.push(createAtomicArgument(premises, [conclusion]));
  }

  // Create packages
  for (let i = 0; i < config.packageCount; i++) {
    packages.push(createPackage(`Perf Package ${i + 1}`));
  }

  // Create devices and operations
  for (let i = 0; i < config.deviceCount; i++) {
    const device = createDevice(`perf-device-${i + 1}`);
    devices.push(device);
  }

  devices.forEach((device, index) => {
    const operation = createOperation(device, devices, 'UPDATE_METADATA', {
      deviceIndex: index,
      testData: `performance-test-${index}`,
    });
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
export async function measureExecutionTime<T>(
  operation: () => Promise<T> | T,
  iterations = 1,
): Promise<{ result: T; averageTime: number; totalTime: number }> {
  const times: number[] = [];
  let result: T | undefined;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await operation();
    const end = performance.now();
    times.push(end - start);
  }

  if (result === undefined) {
    throw new Error('No iterations were performed');
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;

  return {
    result: result as T,
    averageTime,
    totalTime,
  };
}

/**
 * Creates a benchmark suite for cross-context operations
 */
export function createBenchmarkSuite() {
  return {
    smallScale: () =>
      createLargeScaleScenario({
        statementCount: 10,
        argumentCount: 5,
        packageCount: 3,
        deviceCount: 2,
      }),
    mediumScale: () =>
      createLargeScaleScenario({
        statementCount: 50,
        argumentCount: 25,
        packageCount: 10,
        deviceCount: 5,
      }),
    largeScale: () =>
      createLargeScaleScenario({
        statementCount: 200,
        argumentCount: 100,
        packageCount: 20,
        deviceCount: 10,
      }),
  };
}

/**
 * Utility for creating realistic error scenarios
 */
export function createErrorScenarios() {
  return {
    invalidStatement: () => {
      // Attempt to create statement with invalid content
      return Statement.create('');
    },

    circularDependency: () => {
      // Create statements that would form a circular dependency
      const stmt1 = createStatement('P implies Q');
      const stmt2 = createStatement('Q implies R');
      const stmt3 = createStatement('R implies P');
      return { stmt1, stmt2, stmt3 };
    },

    invalidPackageManifest: () => {
      // Create package with invalid manifest
      return PackageManifest.create({
        name: '', // Invalid empty name
        version: 'not-a-version', // Invalid version format
        description: '',
        author: '', // Also invalid empty author
      });
    },

    conflictingOperations: () => {
      // Create operations that would conflict
      const scenario = createConflictScenario();
      return scenario.conflictingOperations;
    },
  };
}

/**
 * Mock data generators for external dependencies
 */
export function createMockRepositoryResponses() {
  return {
    packageRepository: {
      findById: async () => createPackage(),
      findBySource: async () => ok(createPackage()),
      findByGitRepository: async () => ok([createPackage()]),
      searchByKeywords: async () => ok([createPackage()]),
      findAll: async () => [createPackage('Mock Package 1'), createPackage('Mock Package 2')],
      save: async () => ok(undefined),
      delete: async () => ok(undefined),
    },

    dependencyRepository: {
      findDependenciesForPackage: async () => ok([]),
      findPackagesThatDependOn: async () => ok([]),
    },
  };
}

export function createMockServiceResponses() {
  return {
    validationService: {
      validateStatement: () => createValidationResult(true),
      validateInference: () => createValidationResult(true),
      validateProofStructure: () => createValidationResult(true),
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

// Export factory objects to maintain backward compatibility
export const CoreDomainFactory = {
  createStatement,
  createOrderedSet,
  createAtomicArgument,
  createProofScenario,
};

export const LanguageIntelligenceFactory = {
  createLanguagePackage,
  createInferenceRule,
  createValidationResult,
};

export const PackageEcosystemFactory = {
  createPackage,
  createPackageEcosystem,
};

export const SynchronizationFactory = {
  createDevice,
  createMultiDeviceScenario,
  createOperation,
  createConflictScenario,
};

export const PerformanceTestUtils = {
  createLargeScaleScenario,
  measureExecutionTime,
  createBenchmarkSuite,
};

export const ErrorScenarioFactory = {
  createErrorScenarios,
};

export const MockDataFactory = {
  createMockRepositoryResponses,
  createMockServiceResponses,
};
