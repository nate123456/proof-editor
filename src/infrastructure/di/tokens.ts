// Dependency injection tokens - no dependencies to avoid circular imports
export const TOKENS = {
  // Core repository interfaces
  IAtomicArgumentRepository: 'IAtomicArgumentRepository',
  INodeRepository: 'INodeRepository',
  IOrderedSetRepository: 'IOrderedSetRepository',
  IStatementRepository: 'IStatementRepository',
  ITreeRepository: 'ITreeRepository',

  // Package ecosystem repository interfaces
  IDependencyRepository: 'IDependencyRepository',
  IPackageInstallationRepository: 'IPackageInstallationRepository',
  IPackageRepository: 'IPackageRepository',

  // Synchronization repository interfaces
  IConflictRepository: 'IConflictRepository',
  IOperationRepository: 'IOperationRepository',
  ISyncStateRepository: 'ISyncStateRepository',
  IVectorClockRepository: 'IVectorClockRepository',

  // Domain services
  ConnectionResolutionService: 'ConnectionResolutionService',
  CyclePreventionService: 'CyclePreventionService',
  PathCompletenessService: 'PathCompletenessService',
  ProofStrategyAnalysisService: 'ProofStrategyAnalysisService',
  StatementFlowService: 'StatementFlowService',
  StatementProcessingService: 'StatementProcessingService',
  TreeStructureService: 'TreeStructureService',

  // Transaction services
  IProofTransactionService: 'IProofTransactionService',
  ProofTransactionService: 'ProofTransactionService',

  // Language intelligence context services
  EducationalFeedbackService: 'EducationalFeedbackService',
  LogicValidationService: 'LogicValidationService',
  PatternRecognitionService: 'PatternRecognitionService',

  // Package ecosystem context services
  DependencyResolutionService: 'DependencyResolutionService',
  PackageValidationService: 'PackageValidationService',
  VersionResolutionService: 'VersionResolutionService',
  PackageDiscoveryService: 'PackageDiscoveryService',

  // Package ecosystem infrastructure interfaces
  IPackageFileSystem: 'IPackageFileSystem',
  ISDKValidator: 'ISDKValidator',
  IGitRefProvider: 'IGitRefProvider',

  // Synchronization context services
  CRDTTransformationService: 'CRDTTransformationService',
  ConflictResolutionService: 'ConflictResolutionService',
  OperationCoordinationService: 'OperationCoordinationService',

  // Application services
  CrossContextOrchestrationService: 'CrossContextOrchestrationService',
  ProofApplicationService: 'ProofApplicationService',
  ExportService: 'ExportService',
  IExportService: 'IExportService',
  DocumentIdService: 'DocumentIdService',
  IDocumentIdService: 'IDocumentIdService',

  // View layer services
  TreeLayoutService: 'TreeLayoutService',
  ProofVisualizationService: 'ProofVisualizationService',
  DocumentQueryService: 'DocumentQueryService',

  // Event handlers
  ConnectionTracker: 'ConnectionTracker',
  StatementUsageTracker: 'StatementUsageTracker',
  StatementUsageEventHandler: 'StatementUsageEventHandler',

  // Repository interfaces
  IProofDocumentRepository: 'IProofDocumentRepository',

  // Infrastructure services
  ProofFileParser: 'ProofFileParser',
  YAMLValidator: 'YAMLValidator',
  YAMLSerializer: 'YAMLSerializer',
  ValidationController: 'ValidationController',
  InfrastructureValidationController: 'InfrastructureValidationController',
  DiagnosticProvider: 'DiagnosticProvider',
  ErrorMapper: 'ErrorMapper',
  ProofTreePanel: 'ProofTreePanel',
  TreeRenderer: 'TreeRenderer',

  // Event infrastructure
  IDomainEventBus: 'IDomainEventBus',
  EventBus: 'EventBus',

  // Platform adapter interfaces
  IFileSystemPort: 'IFileSystemPort',
  IUIPort: 'IUIPort',
  IPlatformPort: 'IPlatformPort',
  IDiagnosticPort: 'IDiagnosticPort',

  // Presentation layer controllers (P1 Controllers)
  ProofDocumentController: 'ProofDocumentController',
  StatementController: 'StatementController',
  ArgumentController: 'ArgumentController',
  TreeController: 'TreeController',
  PresentationValidationController: 'PresentationValidationController',
  BootstrapController: 'BootstrapController',

  // Legacy presentation controllers
  DocumentController: 'DocumentController',
  ProofTreeController: 'ProofTreeController',

  // Application orchestration services
  DocumentOrchestrationService: 'DocumentOrchestrationService',

  // View state management services (P3)
  ViewStateManager: 'ViewStateManager',
  ViewStateObserver: 'ViewStateObserver',
  IViewStatePort: 'IViewStatePort',
} as const;

export type TokenType = (typeof TOKENS)[keyof typeof TOKENS];
