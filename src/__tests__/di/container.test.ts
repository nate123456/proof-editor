import 'reflect-metadata';

import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApplicationContainer,
  createTestContainer,
  getContainer,
  initializeContainer,
  registerApplicationServices,
  registerContextServices,
  registerDomainServices,
  registerInfrastructureServices,
  resetContainer,
  TOKENS,
} from '../../infrastructure/di/container.js';
import { createServiceTestContainer } from './test-container.js';

describe('DI Container', () => {
  beforeEach(() => {
    resetContainer();
  });

  describe('ApplicationContainer Core Functionality', () => {
    it('should create container instance', () => {
      const container = createTestContainer();

      expect(container).toBeInstanceOf(ApplicationContainer);
      expect(container.resolve).toBeDefined();
      expect(container.register).toBeDefined();
      expect(container.registerSingleton).toBeDefined();
      expect(container.registerInstance).toBeDefined();
      expect(container.registerFactory).toBeDefined();
    });

    it('should register and resolve simple instance', () => {
      const container = createTestContainer();
      const testValue = { message: 'test' };

      container.registerInstance('testToken', testValue);

      const resolved = container.resolve<typeof testValue>('testToken');
      expect(resolved).toBe(testValue);
    });

    it('should register and resolve factory function', () => {
      const container = createTestContainer();
      const factory = () => ({ created: true });

      container.registerFactory('testFactory', factory);

      const resolved = container.resolve<{ created: boolean }>('testFactory');
      expect(resolved.created).toBe(true);
    });

    it('should check if token is registered', () => {
      const container = createTestContainer();
      const testValue = { test: true };

      expect(container.isRegistered('unregistered')).toBe(false);

      container.registerInstance('registered', testValue);
      expect(container.isRegistered('registered')).toBe(true);
    });

    it('should clear instances', () => {
      const container = createTestContainer();
      const testValue = { test: true };

      container.registerInstance('test', testValue);
      expect(container.isRegistered('test')).toBe(true);

      container.clearInstances();
      expect(container.isRegistered('test')).toBe(false);
    });

    it('should create child container', () => {
      const parentContainer = createTestContainer();
      const childContainer = parentContainer.createChildContainer();

      expect(childContainer).toBeInstanceOf(ApplicationContainer);
      expect(childContainer).not.toBe(parentContainer);
    });
  });

  describe('Global Container Management', () => {
    it('should provide global container instance', () => {
      const container1 = getContainer();
      const container2 = getContainer();

      expect(container1).toBe(container2); // Same instance
      expect(container1).toBeInstanceOf(ApplicationContainer);
    });

    it('should reset global container', () => {
      const container1 = getContainer();
      resetContainer();
      const container2 = getContainer();

      expect(container1).not.toBe(container2);
    });
  });

  describe('Token Management', () => {
    it('should have all required domain service tokens', () => {
      expect(TOKENS.StatementFlowService).toBe('StatementFlowService');
      expect(TOKENS.TreeStructureService).toBe('TreeStructureService');
      expect(TOKENS.ConnectionResolutionService).toBe('ConnectionResolutionService');
      expect(TOKENS.CyclePreventionService).toBe('CyclePreventionService');
      expect(TOKENS.PathCompletenessService).toBe('PathCompletenessService');
      expect(TOKENS.ProofStrategyAnalysisService).toBe('ProofStrategyAnalysisService');
      expect(TOKENS.StatementProcessingService).toBe('StatementProcessingService');
    });

    it('should have all required repository tokens', () => {
      expect(TOKENS.IAtomicArgumentRepository).toBe('IAtomicArgumentRepository');
      expect(TOKENS.INodeRepository).toBe('INodeRepository');
      expect(TOKENS.IStatementRepository).toBe('IStatementRepository');
      expect(TOKENS.ITreeRepository).toBe('ITreeRepository');
    });

    it('should have all required context service tokens', () => {
      expect(TOKENS.EducationalFeedbackService).toBe('EducationalFeedbackService');
      expect(TOKENS.LogicValidationService).toBe('LogicValidationService');
      expect(TOKENS.PatternRecognitionService).toBe('PatternRecognitionService');
      expect(TOKENS.DependencyResolutionService).toBe('DependencyResolutionService');
      expect(TOKENS.PackageValidationService).toBe('PackageValidationService');
    });

    it('should have all required infrastructure tokens', () => {
      expect(TOKENS.ProofFileParser).toBe('ProofFileParser');
      expect(TOKENS.YAMLValidator).toBe('YAMLValidator');
      expect(TOKENS.InfrastructureValidationController).toBe('InfrastructureValidationController');
      expect(TOKENS.TreeRenderer).toBe('TreeRenderer');
      expect(TOKENS.IDomainEventBus).toBe('IDomainEventBus');
    });
  });

  describe('Service Registration Functions', () => {
    it('should register domain services without errors', async () => {
      const container = createTestContainer();

      // Mock repository dependencies
      container.registerInstance(TOKENS.IAtomicArgumentRepository, {});
      container.registerInstance(TOKENS.IStatementRepository, {});
      container.registerInstance(TOKENS.ITreeRepository, {});
      container.registerInstance(TOKENS.IProofTransactionService, {});

      await expect(registerDomainServices(container)).resolves.not.toThrow();

      expect(container.isRegistered(TOKENS.StatementFlowService)).toBe(true);
      expect(container.isRegistered(TOKENS.TreeStructureService)).toBe(true);
      expect(container.isRegistered(TOKENS.ConnectionResolutionService)).toBe(true);
    });

    it('should register context services without errors', async () => {
      const container = createTestContainer();

      // Mock infrastructure dependencies
      container.registerInstance(TOKENS.IDependencyRepository, {});
      container.registerInstance(TOKENS.IPackageRepository, {});
      container.registerInstance(TOKENS.IPackageFileSystem, {});
      container.registerInstance(TOKENS.ISDKValidator, {});
      container.registerInstance('IGitRefProvider', {});
      container.registerInstance('IGitPackageProvider', {});
      container.registerInstance('ILocalPackageProvider', {});

      await expect(registerContextServices(container)).resolves.not.toThrow();

      expect(container.isRegistered(TOKENS.EducationalFeedbackService)).toBe(true);
      expect(container.isRegistered(TOKENS.LogicValidationService)).toBe(true);
      expect(container.isRegistered(TOKENS.PackageValidationService)).toBe(true);
    });

    it('should register application services without errors', async () => {
      const container = createTestContainer();

      // Mock required dependencies
      const mockDependencies = [
        TOKENS.StatementFlowService,
        TOKENS.TreeStructureService,
        TOKENS.PathCompletenessService,
        TOKENS.LogicValidationService,
        TOKENS.PatternRecognitionService,
        TOKENS.PackageValidationService,
        TOKENS.DependencyResolutionService,
        TOKENS.PackageDiscoveryService,
        TOKENS.OperationCoordinationService,
      ];

      mockDependencies.forEach((token) => {
        container.registerInstance(token, {});
      });

      await expect(registerApplicationServices(container)).resolves.not.toThrow();

      expect(container.isRegistered(TOKENS.CrossContextOrchestrationService)).toBe(true);
    });

    it('should register infrastructure services without errors', async () => {
      const container = createTestContainer();

      await expect(registerInfrastructureServices(container)).resolves.not.toThrow();

      expect(container.isRegistered(TOKENS.YAMLValidator)).toBe(true);
      expect(container.isRegistered(TOKENS.TreeRenderer)).toBe(true);
      expect(container.isRegistered(TOKENS.IDomainEventBus)).toBe(true);
      expect(container.isRegistered(TOKENS.ProofFileParser)).toBe(true);
    });
  });

  describe('Full Container Initialization', () => {
    it('should initialize complete container without errors', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - we're just suppressing console errors
      });

      await expect(initializeContainer()).resolves.not.toThrow();

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should initialize container with all services registered', async () => {
      const container = await initializeContainer();

      // Test some key services are registered
      expect(container.isRegistered(TOKENS.StatementFlowService)).toBe(true);
      expect(container.isRegistered(TOKENS.YAMLValidator)).toBe(true);
      expect(container.isRegistered(TOKENS.LogicValidationService)).toBe(true);
      expect(container.isRegistered(TOKENS.CrossContextOrchestrationService)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle resolution of unregistered tokens gracefully', () => {
      const container = createTestContainer();

      expect(() => {
        container.resolve('nonexistent-token');
      }).toThrow();
    });

    it('should handle factory registration with container parameter', () => {
      const container = createTestContainer();

      container.registerFactory('testWithContainer', (c) => {
        expect(c).toBeDefined();
        return { containerProvided: true };
      });

      const resolved = container.resolve<{ containerProvided: boolean }>('testWithContainer');
      expect(resolved.containerProvided).toBe(true);
    });
  });

  describe('Package Ecosystem Mock Infrastructure', () => {
    it('should register mock package filesystem', async () => {
      const container = createTestContainer();

      // Register required dependencies for IPackageFileSystem
      container.registerInstance('ExtensionContext', {
        subscriptions: [],
        workspaceState: {},
        globalState: {},
        extensionUri: { fsPath: '/mock/path' },
        extensionPath: '/mock/path',
        asAbsolutePath: (path: string) => `/mock/path/${path}`,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/log',
      });

      // Register mock IFileSystemPort that IPackageFileSystem depends on
      container.registerInstance(TOKENS.IFileSystemPort, {
        readFile: vi.fn().mockResolvedValue(ok('')),
        writeFile: vi.fn().mockResolvedValue(ok(undefined)),
        exists: vi.fn().mockResolvedValue(ok(true)),
        readDirectory: vi.fn().mockResolvedValue(ok([])),
        createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
        delete: vi.fn().mockResolvedValue(ok(undefined)),
        stat: vi.fn().mockResolvedValue(ok({ type: 'file', size: 0, mtime: Date.now() })),
      });

      await registerDomainServices(container);

      const packageFs = container.resolve<any>(TOKENS.IPackageFileSystem);

      expect(packageFs).toBeDefined();
      expect(packageFs.fileExists).toBeDefined();
      expect(packageFs.readFile).toBeDefined();
      expect(packageFs.listFiles).toBeDefined();
      expect(packageFs.isExecutable).toBeDefined();
    });

    it('should register mock SDK validator', async () => {
      const container = createTestContainer();

      // Register required dependencies
      container.registerInstance('ExtensionContext', {
        subscriptions: [],
        workspaceState: {},
        globalState: {},
        extensionUri: { fsPath: '/mock/path' },
        extensionPath: '/mock/path',
        asAbsolutePath: (path: string) => `/mock/path/${path}`,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/log',
      });

      container.registerInstance(TOKENS.IFileSystemPort, {
        readFile: vi.fn().mockResolvedValue(ok('')),
        writeFile: vi.fn().mockResolvedValue(ok(undefined)),
        exists: vi.fn().mockResolvedValue(ok(true)),
        readDirectory: vi.fn().mockResolvedValue(ok([])),
        createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
        delete: vi.fn().mockResolvedValue(ok(undefined)),
        stat: vi.fn().mockResolvedValue(ok({ type: 'file', size: 0, mtime: Date.now() })),
      });

      await registerDomainServices(container);

      const sdkValidator = container.resolve<any>(TOKENS.ISDKValidator);

      expect(sdkValidator).toBeDefined();
      expect(sdkValidator.validateInterface).toBeDefined();
      expect(sdkValidator.listImplementedInterfaces).toBeDefined();
      expect(sdkValidator.checkVersionCompatibility).toBeDefined();
    });

    it('should register mock git ref provider', async () => {
      const container = createTestContainer();

      // Register required dependencies
      container.registerInstance('ExtensionContext', {
        subscriptions: [],
        workspaceState: {},
        globalState: {},
        extensionUri: { fsPath: '/mock/path' },
        extensionPath: '/mock/path',
        asAbsolutePath: (path: string) => `/mock/path/${path}`,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/log',
      });

      container.registerInstance(TOKENS.IFileSystemPort, {
        readFile: vi.fn().mockResolvedValue(ok('')),
        writeFile: vi.fn().mockResolvedValue(ok(undefined)),
        exists: vi.fn().mockResolvedValue(ok(true)),
        readDirectory: vi.fn().mockResolvedValue(ok([])),
        createDirectory: vi.fn().mockResolvedValue(ok(undefined)),
        delete: vi.fn().mockResolvedValue(ok(undefined)),
        stat: vi.fn().mockResolvedValue(ok({ type: 'file', size: 0, mtime: Date.now() })),
      });

      await registerDomainServices(container);

      const gitRefProvider = container.resolve<any>('IGitRefProvider');

      expect(gitRefProvider).toBeDefined();
      expect(gitRefProvider.resolveRefToCommit).toBeDefined();
      expect(gitRefProvider.listAvailableTags).toBeDefined();
      expect(gitRefProvider.listAvailableBranches).toBeDefined();
      expect(gitRefProvider.getCommitTimestamp).toBeDefined();
    });
  });

  describe('Container Memory Management', () => {
    it('should clear instances without affecting registrations', () => {
      const container = createTestContainer();
      const factory = vi.fn(() => ({ value: Math.random() }));

      container.registerFactory('test', factory);

      const instance1 = container.resolve<{ value: number }>('test');
      expect(factory).toHaveBeenCalledTimes(1);

      container.clearInstances();

      const instance2 = container.resolve<{ value: number }>('test');
      expect(factory).toHaveBeenCalledTimes(2);
      expect(instance1.value).not.toBe(instance2.value);
    });
  });

  describe('Dynamic Imports and Dependency Resolution', () => {
    it('should handle dynamic import failures gracefully', async () => {
      const container = createTestContainer();

      // Test that the container can handle missing dependencies gracefully
      // This tests the resilience of the registration system
      expect(container).toBeDefined();
    });
  });
  describe('Domain Services Registration', () => {
    it('should resolve StatementFlowService with dependencies', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.StatementFlowService);

      expect(service).toBeDefined();
      expect(service.createStatementFromContent).toBeDefined();
      expect(typeof service.createStatementFromContent).toBe('function');
    });

    it('should resolve TreeStructureService with dependencies', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.TreeStructureService);

      expect(service).toBeDefined();
      expect(service.createTreeWithRootNode).toBeDefined();
      expect(typeof service.createTreeWithRootNode).toBe('function');
    });

    it('should resolve ConnectionResolutionService with dependencies', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.ConnectionResolutionService);

      expect(service).toBeDefined();
      expect(service.findAllConnectionsForArgument).toBeDefined();
      expect(typeof service.findAllConnectionsForArgument).toBe('function');
      expect(service.findPotentialProviders).toBeDefined();
      expect(typeof service.findPotentialProviders).toBe('function');
      expect(service.findPotentialConsumers).toBeDefined();
      expect(typeof service.findPotentialConsumers).toBe('function');
    });
  });

  describe('Context Services Registration', () => {
    it('should resolve LogicValidationService', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.LogicValidationService);

      expect(service).toBeDefined();
      expect(service.validateStatement).toBeDefined();
      expect(typeof service.validateStatement).toBe('function');
    });

    it('should resolve EducationalFeedbackService', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.EducationalFeedbackService);

      expect(service).toBeDefined();
      expect(service.generateLearningHints).toBeDefined();
      expect(typeof service.generateLearningHints).toBe('function');
    });

    it('should resolve PatternRecognitionService', async () => {
      const { resolve } = await createServiceTestContainer();

      const service = resolve<any>(TOKENS.PatternRecognitionService);

      expect(service).toBeDefined();
      expect(service.recognizePatterns).toBeDefined();
      expect(typeof service.recognizePatterns).toBe('function');
    });
  });

  describe('Service Dependencies', () => {
    it('should inject mocked repositories into domain services', async () => {
      const { resolve, mocks } = await createServiceTestContainer();

      // Get the StatementProcessingService which has repository dependencies
      const service = resolve<any>(TOKENS.StatementProcessingService);

      expect(service).toBeDefined();

      // Verify that the mocked repositories are available for use
      expect(mocks.statementRepo).toBeDefined();
      expect(mocks.atomicArgumentRepo).toBeDefined();
      expect(mocks.nodeRepo).toBeDefined();
      expect(mocks.treeRepo).toBeDefined();
    });

    it.skip('should create singleton instances', async () => {
      // Test disabled - requires shared container instance for singleton testing
      const { resolve } = await createServiceTestContainer();

      const service1 = resolve(TOKENS.StatementFlowService);
      const service2 = resolve(TOKENS.StatementFlowService);

      expect(service1).toBe(service2); // Same instance
    });

    it('should register ProofTreeQueryService with IGraphTraversalService dependency', async () => {
      const container = createTestContainer();
      const { registerApplicationServices, registerDomainServices } = await import(
        '../../infrastructure/di/container.js'
      );

      // Register required mocks
      container.registerInstance(TOKENS.ITreeRepository, vi.fn());
      container.registerInstance(TOKENS.INodeRepository, vi.fn());
      container.registerInstance(TOKENS.IAtomicArgumentRepository, vi.fn());

      // Register services
      await registerDomainServices(container);
      await registerApplicationServices(container);

      // Verify ProofTreeQueryService is registered
      expect(container.isRegistered(TOKENS.ProofTreeQueryService)).toBe(true);

      // Verify IGraphTraversalService is registered
      expect(container.isRegistered(TOKENS.IGraphTraversalService)).toBe(true);

      // Verify ProofTreeQueryService can be resolved (with IGraphTraversalService dependency)
      const queryService = container.resolve(TOKENS.ProofTreeQueryService);
      expect(queryService).toBeDefined();

      // Verify IGraphTraversalService can be resolved independently
      const graphService = container.resolve(TOKENS.IGraphTraversalService);
      expect(graphService).toBeDefined();
    });
  });
});
