import 'reflect-metadata';

import { ok } from 'neverthrow';
import { container, type DependencyContainer } from 'tsyringe';

import { TOKENS, type TokenType } from './tokens.js';

// Export TOKENS for easy access
export { TOKENS, type TokenType };

class ApplicationContainer {
  private readonly _container: DependencyContainer;

  constructor() {
    this._container = container.createChildContainer();
    this.registerDependencies();
  }

  resolve<T>(token: string): T {
    return this._container.resolve<T>(token);
  }

  register<T>(token: string, implementation: new (...args: unknown[]) => T): void {
    this._container.register<T>(token, { useClass: implementation });
  }

  registerSingleton<T>(token: string, implementation: new (...args: unknown[]) => T): void {
    this._container.registerSingleton<T>(token, implementation);
  }

  registerInstance<T>(token: string, instance: T): void {
    this._container.registerInstance<T>(token, instance);
  }

  registerFactory<T>(token: string, factory: (container: DependencyContainer) => T): void {
    this._container.register<T>(token, { useFactory: factory });
  }

  private registerDependencies(): void {
    // Repository registrations will be added when implementations are created
    // For now, this sets up the container structure
    // Note: Actual implementations will be registered when they are created
    // with proper @injectable decorators
  }

  createChildContainer(): ApplicationContainer {
    const childContainer = new ApplicationContainer();
    // Note: TSyringe child containers automatically inherit from parent
    return childContainer;
  }

  isRegistered(token: string): boolean {
    return this._container.isRegistered(token);
  }

  clearInstances(): void {
    this._container.clearInstances();
  }
}

// Global container instance
let globalContainer: ApplicationContainer | null = null;

export function getContainer(): ApplicationContainer {
  globalContainer ??= new ApplicationContainer();
  return globalContainer;
}

export function resetContainer(): void {
  globalContainer = null;
}

export function createTestContainer(): ApplicationContainer {
  return new ApplicationContainer();
}

// Helper function to register repository implementations
export function registerRepositoryImplementations(_container: ApplicationContainer): void {
  // This will be populated when file-based repositories are created
  // For now, it's a placeholder for the registration pattern
}

// Helper function to register domain services
export async function registerDomainServices(container: ApplicationContainer): Promise<void> {
  // Use dynamic imports to avoid circular dependencies
  const [
    { ConnectionResolutionService },
    { CyclePreventionService },
    { PathCompletenessService },
    { ProofStrategyAnalysisService },
    { StatementFlowService },
    { StatementProcessingService },
    { TreeStructureService },
    { ProofTransactionService },
  ] = await Promise.all([
    import('../../domain/services/ConnectionResolutionService.js'),
    import('../../domain/services/CyclePreventionService.js'),
    import('../../domain/services/PathCompletenessService.js'),
    import('../../domain/services/ProofStrategyAnalysisService.js'),
    import('../../domain/services/StatementFlowService.js'),
    import('../../domain/services/StatementProcessingService.js'),
    import('../../domain/services/TreeStructureService.js'),
    import('../../domain/services/ProofTransactionService.js'),
  ]);

  // Register domain services as singletons using factory functions for type safety
  container.registerFactory(
    TOKENS.ConnectionResolutionService,
    (c) =>
      new ConnectionResolutionService(
        c.resolve(TOKENS.IAtomicArgumentRepository),
        c.resolve(TOKENS.IOrderedSetRepository),
      ),
  );

  container.registerFactory(
    TOKENS.CyclePreventionService,
    (c) =>
      new CyclePreventionService(
        c.resolve(TOKENS.IAtomicArgumentRepository),
        c.resolve(TOKENS.ITreeRepository),
        c.resolve(TOKENS.ConnectionResolutionService),
      ),
  );

  container.registerFactory(
    TOKENS.PathCompletenessService,
    (c) =>
      new PathCompletenessService(
        c.resolve(TOKENS.IAtomicArgumentRepository),
        c.resolve(TOKENS.ConnectionResolutionService),
      ),
  );

  container.registerFactory(
    TOKENS.ProofStrategyAnalysisService,
    () => new ProofStrategyAnalysisService(),
  );

  container.registerFactory(
    TOKENS.StatementFlowService,
    (c) => new StatementFlowService(c.resolve(TOKENS.IProofTransactionService)),
  );

  container.registerFactory(
    TOKENS.StatementProcessingService,
    (c) =>
      new StatementProcessingService(
        c.resolve(TOKENS.IStatementRepository),
        c.resolve(TOKENS.IOrderedSetRepository),
        c.resolve(TOKENS.IAtomicArgumentRepository),
      ),
  );

  container.registerFactory(TOKENS.TreeStructureService, () => new TreeStructureService());

  // Register transaction services with default config
  container.registerFactory(TOKENS.ProofTransactionService, () => new ProofTransactionService());

  container.registerFactory(TOKENS.IProofTransactionService, () => new ProofTransactionService());

  // Register package ecosystem infrastructure interfaces
  // TODO: Replace with actual implementations
  container.registerFactory(TOKENS.IPackageFileSystem, () => ({
    fileExists: async () => true,
    readFile: async () => ok(''),
    listFiles: async () => ok([]),
    isExecutable: async () => false,
  }));

  container.registerFactory(TOKENS.ISDKValidator, () => ({
    validateInterface: async () => ok({ name: 'mock', version: '1.0.0', methods: [] }),
    listImplementedInterfaces: async () => ok([]),
    checkVersionCompatibility: () => ok(true),
  }));

  container.registerFactory('IGitRefProvider', () => ({
    resolveRefToCommit: async () => ok({ commit: 'mock-commit', actualRef: 'mock-ref' }),
    listAvailableTags: async () => ok([]),
    listAvailableBranches: async () => ok(['main']),
    getCommitTimestamp: async () => ok(new Date()),
  }));
}

// Helper function to register infrastructure services
export async function registerInfrastructureServices(
  container: ApplicationContainer,
): Promise<void> {
  // Use dynamic imports to avoid circular dependencies
  const [
    { ProofFileParser },
    { YAMLValidator },
    { ValidationController },
    { ProofDiagnosticProvider },
    { ErrorMapper },
    { TreeRenderer },
    { DomainEventBus, createDefaultEventBusConfig },
  ] = await Promise.all([
    import('../../parser/ProofFileParser.js'),
    import('../../parser/YAMLValidator.js'),
    import('../../validation/ValidationController.js'),
    import('../../validation/DiagnosticProvider.js'),
    import('../../validation/ErrorMapper.js'),
    import('../../webview/TreeRenderer.js'),
    import('../events/DomainEventBus.js'),
  ]);

  // Register infrastructure services with proper factory functions
  // Register YAMLValidator first as it has no dependencies
  container.registerSingleton(TOKENS.YAMLValidator, YAMLValidator);

  // Register TreeRenderer as it has no dependencies
  container.registerSingleton(TOKENS.TreeRenderer, TreeRenderer);

  // Register ErrorMapper as instance (it's a const object, not a class)
  container.registerInstance(TOKENS.ErrorMapper, ErrorMapper);

  // Register Domain Event Bus with default configuration
  container.registerFactory(
    TOKENS.IDomainEventBus,
    () => new DomainEventBus(createDefaultEventBusConfig()),
  );

  // Register ProofFileParser with YAMLValidator dependency
  container.registerFactory(
    TOKENS.ProofFileParser,
    (c) => new ProofFileParser(c.resolve(TOKENS.YAMLValidator)),
  );

  // Register ProofDiagnosticProvider with ProofFileParser dependency
  container.registerFactory(
    TOKENS.DiagnosticProvider,
    (c) => new ProofDiagnosticProvider(c.resolve(TOKENS.ProofFileParser)),
  );

  // Register ValidationController with ProofDiagnosticProvider dependency
  container.registerFactory(
    TOKENS.ValidationController,
    (c) => new ValidationController(c.resolve(TOKENS.DiagnosticProvider)),
  );

  // Note: ProofTreePanel is not registered as it uses private constructor and manual DI resolution
}

// Helper function to register context services
export async function registerContextServices(container: ApplicationContainer): Promise<void> {
  // Use dynamic imports for language intelligence services
  const [
    { EducationalFeedbackService },
    { LogicValidationService },
    { PatternRecognitionService },
  ] = await Promise.all([
    import('../../contexts/language-intelligence/domain/services/EducationalFeedbackService.js'),
    import('../../contexts/language-intelligence/domain/services/LogicValidationService.js'),
    import('../../contexts/language-intelligence/domain/services/PatternRecognitionService.js'),
  ]);

  // Register language intelligence services as singletons
  container.registerSingleton(TOKENS.EducationalFeedbackService, EducationalFeedbackService);
  container.registerSingleton(TOKENS.LogicValidationService, LogicValidationService);
  container.registerSingleton(TOKENS.PatternRecognitionService, PatternRecognitionService);

  // Use dynamic imports for package ecosystem services
  const [
    { DependencyResolutionService },
    { PackageValidationService },
    { VersionResolutionService },
    { PackageDiscoveryService },
  ] = await Promise.all([
    import('../../contexts/package-ecosystem/domain/services/DependencyResolutionService.js'),
    import('../../contexts/package-ecosystem/domain/services/PackageValidationService.js'),
    import('../../contexts/package-ecosystem/domain/services/VersionResolutionService.js'),
    import('../../contexts/package-ecosystem/domain/services/package-discovery-service.js'),
  ]);

  // Register package ecosystem services as singletons using factory functions
  container.registerFactory(
    TOKENS.DependencyResolutionService,
    (c) =>
      new DependencyResolutionService(
        c.resolve(TOKENS.IDependencyRepository),
        c.resolve(TOKENS.PackageDiscoveryService),
        c.resolve(TOKENS.VersionResolutionService),
      ),
  );

  container.registerFactory(
    TOKENS.PackageValidationService,
    (c) =>
      new PackageValidationService(
        c.resolve(TOKENS.IPackageFileSystem),
        c.resolve(TOKENS.ISDKValidator),
      ),
  );

  container.registerFactory(
    TOKENS.VersionResolutionService,
    (c) => new VersionResolutionService(c.resolve('IGitRefProvider')),
  );

  // Register Git and Local package providers
  container.registerFactory('IGitPackageProvider', () => ({
    discoverFromGitHub: async () => ok([]),
    validateGitSource: async () => ok(true),
    clonePackageToTemporary: async () => ok('/tmp/mock'),
  }));

  container.registerFactory('ILocalPackageProvider', () => ({
    discoverInDirectory: async () => ok([]),
    validateLocalSource: async () => ok(true),
  }));

  container.registerFactory(
    TOKENS.PackageDiscoveryService,
    (c) =>
      new PackageDiscoveryService(
        c.resolve(TOKENS.IPackageRepository),
        c.resolve('IGitPackageProvider'),
        c.resolve('ILocalPackageProvider'),
      ),
  );

  // Use dynamic imports for synchronization services
  const [
    { ConflictResolutionService },
    { CRDTTransformationService },
    { OperationCoordinationService },
  ] = await Promise.all([
    import('../../contexts/synchronization/domain/services/ConflictResolutionService.js'),
    import('../../contexts/synchronization/domain/services/CRDTTransformationService.js'),
    import('../../contexts/synchronization/domain/services/OperationCoordinationService.js'),
  ]);

  // Register synchronization services as singletons
  container.registerSingleton(TOKENS.ConflictResolutionService, ConflictResolutionService);
  container.registerSingleton(TOKENS.CRDTTransformationService, CRDTTransformationService);
  container.registerSingleton(TOKENS.OperationCoordinationService, OperationCoordinationService);
}

// Helper function to register application services
export async function registerApplicationServices(container: ApplicationContainer): Promise<void> {
  // Use dynamic imports for application services
  const [{ CrossContextOrchestrationService }] = await Promise.all([
    import('../../application/services/CrossContextOrchestrationService.js'),
  ]);

  // Register application services as singletons
  container.registerSingleton(
    TOKENS.CrossContextOrchestrationService,
    CrossContextOrchestrationService,
  );
}

// Manual initialization function - removed automatic initialization
export async function initializeContainer(): Promise<ApplicationContainer> {
  const appContainer = getContainer();

  // Register all implementations
  registerRepositoryImplementations(appContainer);
  await registerDomainServices(appContainer);
  await registerContextServices(appContainer);
  await registerApplicationServices(appContainer);
  await registerInfrastructureServices(appContainer);

  return appContainer;
}
