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

  // Infrastructure services
  ProofFileParser: 'ProofFileParser',
  YAMLValidator: 'YAMLValidator',
  ValidationController: 'ValidationController',
  DiagnosticProvider: 'DiagnosticProvider',
  ErrorMapper: 'ErrorMapper',
  ProofTreePanel: 'ProofTreePanel',
  TreeRenderer: 'TreeRenderer',

  // Event infrastructure
  IDomainEventBus: 'IDomainEventBus',
} as const;

export type TokenType = (typeof TOKENS)[keyof typeof TOKENS];
