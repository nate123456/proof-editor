import 'reflect-metadata';

import { ok } from 'neverthrow';
import { container, type DependencyContainer } from 'tsyringe';
import { NodeSDKValidator } from '../adapters/NodeSDKValidator.js';
import { PackageFileSystemAdapter } from '../adapters/PackageFileSystemAdapter.js';
import { VSCodeFileSystemAdapter } from '../vscode/VSCodeFileSystemAdapter.js';
import { TOKENS, type TokenType } from './tokens.js';

// Export TOKENS for easy access
export { TOKENS, type TokenType };

export class ApplicationContainer {
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
export async function registerRepositoryImplementations(
  container: ApplicationContainer,
): Promise<void> {
  // Use dynamic imports for repository implementations
  const { YAMLProofDocumentRepository } = await import(
    '../repositories/yaml/YAMLProofDocumentRepository.js'
  );

  // Register ProofDocumentRepository with proper dependencies
  container.registerFactory(
    TOKENS.IProofDocumentRepository,
    (c) =>
      new YAMLProofDocumentRepository(
        c.resolve(TOKENS.IFileSystemPort),
        './proof-documents', // Default base path - would come from config
      ),
  );

  // Register mock implementations for other repositories that aren't implemented yet
  // These will be replaced with real implementations as they are created

  // Core domain repositories
  container.registerFactory(TOKENS.IAtomicArgumentRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `arg-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.IStatementRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `stmt-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.ITreeRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `tree-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.INodeRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `node-${Date.now()}` }),
  }));

  // Package ecosystem repositories
  container.registerFactory(TOKENS.IPackageRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `pkg-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.IDependencyRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `dep-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.IPackageInstallationRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `install-${Date.now()}` }),
  }));

  // Synchronization repositories
  container.registerFactory(TOKENS.IOperationRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `op-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.ISyncStateRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `sync-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.IVectorClockRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `clock-${Date.now()}` }),
  }));

  container.registerFactory(TOKENS.IConflictRepository, () => ({
    findById: async () => null,
    save: async () => ok(undefined),
    exists: async () => false,
    delete: async () => ok(undefined),
    findAll: async () => [],
    nextIdentity: () => ({ getValue: () => `conflict-${Date.now()}` }),
  }));
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

  // Import IdentityService separately
  const { IdentityService } = await import('../services/IdentityService.js');

  // Register domain services as singletons using factory functions for type safety
  container.registerFactory(
    TOKENS.ConnectionResolutionService,
    (c) =>
      new ConnectionResolutionService(
        c.resolve(TOKENS.IAtomicArgumentRepository),
        c.resolve(TOKENS.IStatementRepository),
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
        c.resolve(TOKENS.IAtomicArgumentRepository),
      ),
  );

  container.registerFactory(TOKENS.TreeStructureService, () => new TreeStructureService());

  // Register graph traversal service
  const { ProofGraphAdapter } = await import('../graph/ProofGraphAdapter.js');
  container.registerFactory(
    TOKENS.IGraphTraversalService,
    (c) =>
      new ProofGraphAdapter(
        c.resolve(TOKENS.INodeRepository),
        c.resolve(TOKENS.IAtomicArgumentRepository),
      ),
  );

  // Register transaction services with default config
  container.registerFactory(TOKENS.ProofTransactionService, () => new ProofTransactionService());

  container.registerFactory(TOKENS.IProofTransactionService, () => new ProofTransactionService());

  // Register IdentityService as singleton
  container.registerSingleton(TOKENS.IIdentityService, IdentityService);

  // Register package ecosystem infrastructure interfaces
  container.registerFactory(TOKENS.IFileSystemPort, () => new VSCodeFileSystemAdapter());
  container.registerFactory(
    TOKENS.IPackageFileSystem,
    (c) => new PackageFileSystemAdapter(c.resolve(TOKENS.IFileSystemPort)),
  );
  container.registerSingleton(TOKENS.ISDKValidator, NodeSDKValidator);

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
    { YAMLSerializer },
    { ValidationController },
    { ProofDiagnosticProvider },
    { ErrorMapper },
    { TreeRenderer },
    { DomainEventBus, createDefaultEventBusConfig },
    { createEventBus },
  ] = await Promise.all([
    import('../../parser/ProofFileParser.js'),
    import('../../parser/YAMLValidator.js'),
    import('../repositories/yaml/YAMLSerializer.js'),
    import('../../validation/ValidationController.js'),
    import('../../validation/DiagnosticProvider.js'),
    import('../../validation/ErrorMapper.js'),
    import('../../webview/TreeRenderer.js'),
    import('../events/DomainEventBus.js'),
    import('../events/EventBus.js'),
  ]);

  // Register infrastructure services with proper factory functions
  // Register YAMLValidator first as it has no dependencies
  container.registerSingleton(TOKENS.YAMLValidator, YAMLValidator);

  // Register YAMLSerializer as it has no dependencies
  container.registerSingleton(TOKENS.YAMLSerializer, YAMLSerializer);

  // Register TreeRenderer as it has no dependencies
  container.registerSingleton(TOKENS.TreeRenderer, TreeRenderer);

  // Register ErrorMapper as instance (it's a const object, not a class)
  container.registerInstance(TOKENS.ErrorMapper, ErrorMapper);

  // Register EventBus as singleton with production configuration
  container.registerFactory(TOKENS.EventBus, () =>
    createEventBus({
      maxEventHistory: 1000,
      handlerTimeout: 5000,
      enableReplay: false,
      enableMetrics: true,
      enableLogging: true,
      testMode: false,
    }),
  );

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

  // Register Infrastructure ValidationController with IDiagnosticPort dependency
  container.registerFactory(
    TOKENS.InfrastructureValidationController,
    (c) => new ValidationController(c.resolve(TOKENS.IDiagnosticPort)),
  );

  // Register DocumentOrchestrationService with proper dependencies
  const { DocumentOrchestrationServiceImpl } = await import(
    '../../application/services/DocumentOrchestrationService.js'
  );
  container.registerFactory(
    TOKENS.DocumentOrchestrationService,
    (c) =>
      new DocumentOrchestrationServiceImpl(
        c.resolve(TOKENS.ProofFileParser),
        c.resolve(TOKENS.EventBus),
        c.resolve(TOKENS.DocumentQueryService),
        c.resolve(TOKENS.ProofApplicationService),
        c.resolve(TOKENS.CrossContextOrchestrationService),
      ),
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
    { ProofPatternAnalyzer },
    { ArgumentStructureAnalyzer },
    { MistakeDetector },
    { PatternMatcher },
    { LogicalStructureHelper },
    { PatternSuggestionHelper },
  ] = await Promise.all([
    import('../../contexts/language-intelligence/domain/services/EducationalFeedbackService.js'),
    import('../../contexts/language-intelligence/domain/services/LogicValidationService.js'),
    import('../../contexts/language-intelligence/domain/services/PatternRecognitionService.js'),
    import(
      '../../contexts/language-intelligence/domain/services/analyzers/ProofPatternAnalyzer.js'
    ),
    import(
      '../../contexts/language-intelligence/domain/services/analyzers/ArgumentStructureAnalyzer.js'
    ),
    import('../../contexts/language-intelligence/domain/services/detectors/MistakeDetector.js'),
    import('../../contexts/language-intelligence/domain/services/matchers/PatternMatcher.js'),
    import(
      '../../contexts/language-intelligence/domain/services/helpers/LogicalStructureHelper.js'
    ),
    import(
      '../../contexts/language-intelligence/domain/services/helpers/PatternSuggestionHelper.js'
    ),
  ]);

  // Register language intelligence services as singletons
  container.registerSingleton(TOKENS.EducationalFeedbackService, EducationalFeedbackService);
  container.registerSingleton(TOKENS.LogicValidationService, LogicValidationService);

  // Register specialized pattern recognition services
  container.registerSingleton('ProofPatternAnalyzer', ProofPatternAnalyzer);
  container.registerSingleton('ArgumentStructureAnalyzer', ArgumentStructureAnalyzer);
  container.registerSingleton('MistakeDetector', MistakeDetector);
  container.registerSingleton('PatternMatcher', PatternMatcher);
  container.registerSingleton('LogicalStructureHelper', LogicalStructureHelper);
  container.registerSingleton('PatternSuggestionHelper', PatternSuggestionHelper);

  // Register PatternRecognitionService with its dependencies
  container.registerFactory(
    TOKENS.PatternRecognitionService,
    (c) =>
      new PatternRecognitionService(
        c.resolve('ProofPatternAnalyzer'),
        c.resolve('ArgumentStructureAnalyzer'),
        c.resolve('MistakeDetector'),
        c.resolve('PatternMatcher'),
        c.resolve('LogicalStructureHelper'),
        c.resolve('PatternSuggestionHelper'),
      ),
  );

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
    { OperationTransformationService },
    { ConflictDetectionService },
    { OperationCompositionService },
    { OperationComplexityAnalyzer },
    { OperationFactory },
  ] = await Promise.all([
    import('../../contexts/synchronization/domain/services/ConflictResolutionService.js'),
    import('../../contexts/synchronization/domain/services/CRDTTransformationService.js'),
    import('../../contexts/synchronization/domain/services/OperationCoordinationService.js'),
    import('../../contexts/synchronization/domain/services/OperationTransformationService.js'),
    import('../../contexts/synchronization/domain/services/ConflictDetectionService.js'),
    import('../../contexts/synchronization/domain/services/OperationCompositionService.js'),
    import('../../contexts/synchronization/domain/services/OperationComplexityAnalyzer.js'),
    import('../../contexts/synchronization/domain/factories/OperationFactory.js'),
  ]);

  // Register synchronization services as singletons
  container.registerSingleton(TOKENS.ConflictResolutionService, ConflictResolutionService);
  container.registerSingleton(TOKENS.CRDTTransformationService, CRDTTransformationService);
  container.registerSingleton(TOKENS.OperationCoordinationService, OperationCoordinationService);
  container.registerSingleton(
    TOKENS.OperationTransformationService,
    OperationTransformationService,
  );
  container.registerSingleton(TOKENS.ConflictDetectionService, ConflictDetectionService);
  container.registerSingleton(TOKENS.OperationCompositionService, OperationCompositionService);
  container.registerSingleton(TOKENS.OperationComplexityAnalyzer, OperationComplexityAnalyzer);
  container.registerSingleton(TOKENS.OperationFactory, OperationFactory);
}

// Helper function to register application services
export async function registerApplicationServices(container: ApplicationContainer): Promise<void> {
  // Use dynamic imports for application services
  const [
    { CrossContextOrchestrationService },
    { ProofApplicationService },
    { TreeLayoutService },
    { ProofVisualizationService },
    { DocumentQueryService },
    { ExportService },
    { ViewStateManager },
    { ViewStateObserver },
    { ConnectionTracker },
    { StatementUsageTracker, StatementUsageEventHandler },
    { DocumentIdService },
    { ProofTreeQueryService },
  ] = await Promise.all([
    import('../../application/services/CrossContextOrchestrationService.js'),
    import('../../application/services/ProofApplicationService.js'),
    import('../../application/services/TreeLayoutService.js'),
    import('../../application/services/ProofVisualizationService.js'),
    import('../../application/services/DocumentQueryService.js'),
    import('../../application/services/ExportService.js'),
    import('../../application/services/ViewStateManager.js'),
    import('../../application/services/ViewStateObserver.js'),
    import('../../application/event-handlers/ConnectionTracker.js'),
    import('../../application/event-handlers/StatementUsageTracker.js'),
    import('../../application/services/DocumentIdService.js'),
    import('../../application/queries/ProofTreeQueryService.js'),
  ]);

  // Register core application service with event integration
  container.registerFactory(
    TOKENS.ProofApplicationService,
    (c) =>
      new ProofApplicationService(
        c.resolve(TOKENS.IProofDocumentRepository),
        c.resolve(TOKENS.EventBus),
      ),
  );

  // Register view layer services
  container.registerSingleton(TOKENS.TreeLayoutService, TreeLayoutService);

  container.registerFactory(
    TOKENS.ProofVisualizationService,
    (c) => new ProofVisualizationService(c.resolve(TOKENS.TreeLayoutService)),
  );

  container.registerFactory(
    TOKENS.DocumentQueryService,
    (c) =>
      new DocumentQueryService(
        c.resolve(TOKENS.IProofDocumentRepository),
        c.resolve(TOKENS.ProofFileParser),
      ),
  );

  container.registerFactory(
    TOKENS.ProofTreeQueryService,
    (c) =>
      new ProofTreeQueryService(
        c.resolve(TOKENS.ITreeRepository),
        c.resolve(TOKENS.INodeRepository),
        c.resolve(TOKENS.IAtomicArgumentRepository),
        c.resolve(TOKENS.IGraphTraversalService),
      ),
  );

  // Register ExportService with all dependencies
  container.registerFactory(
    TOKENS.ExportService,
    (c) =>
      new ExportService(
        c.resolve(TOKENS.DocumentQueryService),
        c.resolve(TOKENS.ProofVisualizationService),
        c.resolve(TOKENS.YAMLSerializer),
        c.resolve(TOKENS.TreeRenderer),
        c.resolve(TOKENS.IUIPort),
      ),
  );

  // Register IExportService interface to ExportService implementation
  container.registerFactory(TOKENS.IExportService, (c) => c.resolve(TOKENS.ExportService));

  // Register DocumentIdService as singleton
  container.registerSingleton(TOKENS.DocumentIdService, DocumentIdService);
  container.registerFactory(TOKENS.IDocumentIdService, (c) => c.resolve(TOKENS.DocumentIdService));

  // Register view state management services
  container.registerFactory(
    TOKENS.ViewStateManager,
    (c) => new ViewStateManager(c.resolve(TOKENS.IViewStatePort)),
  );

  container.registerFactory(
    TOKENS.ViewStateObserver,
    (c) => new ViewStateObserver(c.resolve(TOKENS.ViewStateManager)),
  );

  // Register event handlers as singletons
  container.registerSingleton(TOKENS.ConnectionTracker, ConnectionTracker);
  container.registerSingleton(TOKENS.StatementUsageTracker, StatementUsageTracker);

  // Register combined event handler
  container.registerFactory(
    TOKENS.StatementUsageEventHandler,
    (c) => new StatementUsageEventHandler(c.resolve(TOKENS.StatementUsageTracker)),
  );

  // Register application services as singletons using factory function for type safety
  container.registerFactory(
    TOKENS.CrossContextOrchestrationService,
    (c) =>
      new CrossContextOrchestrationService(
        c.resolve(TOKENS.StatementFlowService),
        c.resolve(TOKENS.TreeStructureService),
        c.resolve(TOKENS.PathCompletenessService),
        c.resolve(TOKENS.LogicValidationService),
        c.resolve(TOKENS.PatternRecognitionService),
        c.resolve(TOKENS.PackageValidationService),
        c.resolve(TOKENS.DependencyResolutionService),
        c.resolve(TOKENS.PackageDiscoveryService),
        c.resolve(TOKENS.OperationCoordinationService),
      ),
  );
}

// Manual initialization function - removed automatic initialization
export async function initializeContainer(): Promise<ApplicationContainer> {
  const appContainer = getContainer();

  // Register all implementations
  await registerRepositoryImplementations(appContainer);
  await registerDomainServices(appContainer);
  await registerContextServices(appContainer);
  await registerApplicationServices(appContainer);
  await registerInfrastructureServices(appContainer);
  await registerPresentationControllers(appContainer);

  return appContainer;
}

// Helper function to register presentation controllers
export async function registerPresentationControllers(
  container: ApplicationContainer,
): Promise<void> {
  // Use dynamic imports for P1 presentation controllers
  const [
    { ProofDocumentController },
    { StatementController },
    { ArgumentController },
    { TreeController },
    { ValidationController },
    { BootstrapController },
    { ProofTreeController },
  ] = await Promise.all([
    import('../../presentation/controllers/ProofDocumentController.js'),
    import('../../presentation/controllers/StatementController.js'),
    import('../../presentation/controllers/ArgumentController.js'),
    import('../../presentation/controllers/TreeController.js'),
    import('../../presentation/controllers/ValidationController.js'),
    import('../../presentation/controllers/BootstrapController.js'),
    import('../../presentation/controllers/ProofTreeController.js'),
  ]);

  // Register P1 controllers as singletons with dependencies
  container.registerFactory(
    TOKENS.ProofDocumentController,
    (c) =>
      new ProofDocumentController(
        c.resolve(TOKENS.CrossContextOrchestrationService),
        c.resolve(TOKENS.DocumentOrchestrationService),
        c.resolve(TOKENS.DocumentQueryService),
        c.resolve(TOKENS.IFileSystemPort),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IUIPort),
        c.resolve(TOKENS.YAMLSerializer),
        c.resolve(TOKENS.ProofVisualizationService),
      ),
  );

  container.registerFactory(
    TOKENS.StatementController,
    (c) =>
      new StatementController(
        c.resolve(TOKENS.CrossContextOrchestrationService),
        c.resolve(TOKENS.ProofApplicationService),
        c.resolve(TOKENS.DocumentQueryService),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IUIPort),
      ),
  );

  container.registerFactory(
    TOKENS.ArgumentController,
    (c) =>
      new ArgumentController(
        c.resolve(TOKENS.CrossContextOrchestrationService),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IUIPort),
      ),
  );

  container.registerFactory(
    TOKENS.TreeController,
    (c) =>
      new TreeController(
        c.resolve(TOKENS.CrossContextOrchestrationService),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IUIPort),
      ),
  );

  container.registerFactory(
    TOKENS.PresentationValidationController,
    (c) =>
      new ValidationController(
        c.resolve(TOKENS.CrossContextOrchestrationService),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IUIPort),
      ),
  );

  container.registerFactory(
    TOKENS.BootstrapController,
    (c) =>
      new BootstrapController(
        c.resolve(TOKENS.DocumentOrchestrationService),
        c.resolve(TOKENS.ProofApplicationService),
        c.resolve(TOKENS.IProofDocumentRepository),
        c.resolve(TOKENS.IPlatformPort),
        c.resolve(TOKENS.IUIPort),
      ),
  );

  // Register legacy controller for backward compatibility
  container.registerFactory(
    TOKENS.ProofTreeController,
    (c) => new ProofTreeController(c.resolve(TOKENS.IUIPort), c.resolve(TOKENS.EventBus)),
  );
}

// Helper function for platform adapter registration
export async function registerPlatformAdapters(
  container: ApplicationContainer,
  context: unknown,
): Promise<void> {
  // Type assertion - extension.ts guarantees this will be vscode.ExtensionContext
  // Using any to avoid circular dependency with vscode types
  // biome-ignore lint/suspicious/noExplicitAny: ExtensionContext type would create circular dependency
  const vscodeContext = context as any;

  // Import platform adapters - using dynamic imports for ES modules
  const [
    { VSCodeFileSystemAdapter },
    { VSCodeUIAdapter },
    { VSCodePlatformAdapter },
    { VSCodeViewStateAdapter },
    { VSCodeDiagnosticAdapter },
  ] = await Promise.all([
    import('../vscode/VSCodeFileSystemAdapter.js'),
    import('../vscode/VSCodeUIAdapter.js'),
    import('../vscode/VSCodePlatformAdapter.js'),
    import('../vscode/VSCodeViewStateAdapter.js'),
    import('../vscode/VSCodeDiagnosticAdapter.js'),
  ]);

  // Register platform adapters as instances with proper type handling
  container.registerInstance(TOKENS.IFileSystemPort, new VSCodeFileSystemAdapter(vscodeContext));
  container.registerInstance(TOKENS.IUIPort, new VSCodeUIAdapter(vscodeContext));
  container.registerInstance(TOKENS.IPlatformPort, new VSCodePlatformAdapter(vscodeContext));
  container.registerInstance(TOKENS.IViewStatePort, new VSCodeViewStateAdapter(vscodeContext));
  container.registerFactory(
    TOKENS.IDiagnosticPort,
    (c) => new VSCodeDiagnosticAdapter(c.resolve(TOKENS.ProofFileParser)),
  );
}
