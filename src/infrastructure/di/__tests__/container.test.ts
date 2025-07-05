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
  registerPlatformAdapters,
  registerPresentationControllers,
  registerRepositoryImplementations,
  resetContainer,
} from '../container.js';
import { TOKENS } from '../tokens.js';

// Mock all the dynamic imports
vi.mock('tsyringe', () => ({
  container: {
    createChildContainer: vi.fn(),
  },
}));

// Mock all dynamic imports that container.ts uses
vi.mock('../../repositories/yaml/YAMLProofDocumentRepository.js', () => ({
  YAMLProofDocumentRepository: vi.fn(),
}));

vi.mock('../../../domain/services/ConnectionResolutionService.js', () => ({
  ConnectionResolutionService: vi.fn(),
}));

vi.mock('../../../domain/services/CyclePreventionService.js', () => ({
  CyclePreventionService: vi.fn(),
}));

vi.mock('../../../parser/ProofFileParser.js', () => ({
  ProofFileParser: vi.fn(),
}));

vi.mock('../../../parser/YAMLValidator.js', () => ({
  YAMLValidator: vi.fn(),
}));

vi.mock('../../../validation/ValidationController.js', () => ({
  ValidationController: vi.fn(),
}));

vi.mock('../../vscode/VSCodeFileSystemAdapter.js', () => ({
  VSCodeFileSystemAdapter: vi.fn(),
}));

vi.mock('../../vscode/VSCodeUIAdapter.js', () => ({
  VSCodeUIAdapter: vi.fn(),
}));

vi.mock('../../vscode/VSCodePlatformAdapter.js', () => ({
  VSCodePlatformAdapter: vi.fn(),
}));

vi.mock('../../vscode/VSCodeViewStateAdapter.js', () => ({
  VSCodeViewStateAdapter: vi.fn(),
}));

vi.mock('../../vscode/VSCodeDiagnosticAdapter.js', () => ({
  VSCodeDiagnosticAdapter: vi.fn(),
}));

describe('ApplicationContainer', () => {
  let container: ApplicationContainer;

  beforeEach(() => {
    vi.clearAllMocks();
    container = new ApplicationContainer();
  });

  afterEach(() => {
    resetContainer();
  });

  describe('constructor', () => {
    it('should create child container from global tsyringe container', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      // Act
      const appContainer = new ApplicationContainer();

      // Assert
      expect(tsyringeContainer.createChildContainer).toHaveBeenCalled();
      expect(appContainer).toBeInstanceOf(ApplicationContainer);
    });
  });

  describe('resolve', () => {
    it('should resolve dependencies from underlying container', () => {
      // Arrange
      const mockService = { test: 'service' };
      const mockChildContainer = {
        resolve: vi.fn().mockReturnValue(mockService),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();

      // Act
      const result = appContainer.resolve('test-token');

      // Assert
      expect(mockChildContainer.resolve).toHaveBeenCalledWith('test-token');
      expect(result).toBe(mockService);
    });
  });

  describe('register', () => {
    it('should register class with container', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();
      class TestService {}

      // Act
      appContainer.register('test-token', TestService);

      // Assert
      expect(mockChildContainer.register).toHaveBeenCalledWith('test-token', {
        useClass: TestService,
      });
    });
  });

  describe('registerSingleton', () => {
    it('should register singleton with container', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();
      class TestService {}

      // Act
      appContainer.registerSingleton('test-token', TestService);

      // Assert
      expect(mockChildContainer.registerSingleton).toHaveBeenCalledWith('test-token', TestService);
    });
  });

  describe('registerInstance', () => {
    it('should register instance with container', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();
      const testInstance = { test: 'instance' };

      // Act
      appContainer.registerInstance('test-token', testInstance);

      // Assert
      expect(mockChildContainer.registerInstance).toHaveBeenCalledWith('test-token', testInstance);
    });
  });

  describe('registerFactory', () => {
    it('should register factory with container', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();
      const testFactory = () => ({ test: 'factory' });

      // Act
      appContainer.registerFactory('test-token', testFactory);

      // Assert
      expect(mockChildContainer.register).toHaveBeenCalledWith('test-token', {
        useFactory: testFactory,
      });
    });
  });

  describe('isRegistered', () => {
    it('should check if token is registered', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn().mockReturnValue(true),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();

      // Act
      const result = appContainer.isRegistered('test-token');

      // Assert
      expect(mockChildContainer.isRegistered).toHaveBeenCalledWith('test-token');
      expect(result).toBe(true);
    });
  });

  describe('clearInstances', () => {
    it('should clear instances from container', () => {
      // Arrange
      const mockChildContainer = {
        resolve: vi.fn(),
        register: vi.fn(),
        registerSingleton: vi.fn(),
        registerInstance: vi.fn(),
        isRegistered: vi.fn(),
        clearInstances: vi.fn(),
      };

      const { container: tsyringeContainer } = require('tsyringe');
      tsyringeContainer.createChildContainer.mockReturnValue(mockChildContainer);

      const appContainer = new ApplicationContainer();

      // Act
      appContainer.clearInstances();

      // Assert
      expect(mockChildContainer.clearInstances).toHaveBeenCalled();
    });
  });

  describe('createChildContainer', () => {
    it('should create child container', () => {
      // Act
      const childContainer = container.createChildContainer();

      // Assert
      expect(childContainer).toBeInstanceOf(ApplicationContainer);
      expect(childContainer).not.toBe(container);
    });
  });
});

describe('Global Container Management', () => {
  beforeEach(() => {
    resetContainer();
  });

  afterEach(() => {
    resetContainer();
  });

  describe('getContainer', () => {
    it('should return singleton container instance', () => {
      // Act
      const container1 = getContainer();
      const container2 = getContainer();

      // Assert
      expect(container1).toBe(container2);
      expect(container1).toBeInstanceOf(ApplicationContainer);
    });

    it('should create new container if none exists', () => {
      // Act
      const container = getContainer();

      // Assert
      expect(container).toBeInstanceOf(ApplicationContainer);
    });
  });

  describe('resetContainer', () => {
    it('should reset global container to null', () => {
      // Arrange
      const container1 = getContainer();

      // Act
      resetContainer();
      const container2 = getContainer();

      // Assert
      expect(container1).not.toBe(container2);
    });
  });

  describe('createTestContainer', () => {
    it('should create independent test container', () => {
      // Arrange
      const globalContainer = getContainer();

      // Act
      const testContainer = createTestContainer();

      // Assert
      expect(testContainer).toBeInstanceOf(ApplicationContainer);
      expect(testContainer).not.toBe(globalContainer);
    });
  });
});

describe('Repository Registration', () => {
  let container: ApplicationContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  describe('registerRepositoryImplementations', () => {
    it('should register YAMLProofDocumentRepository with factory', async () => {
      // Arrange
      container.registerFactory = vi.fn();
      container.resolve = vi.fn();

      // Act
      await registerRepositoryImplementations(container);

      // Assert
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.IProofDocumentRepository,
        expect.any(Function),
      );
    });

    it('should register mock implementations for all repositories', async () => {
      // Arrange
      container.registerFactory = vi.fn();

      // Act
      await registerRepositoryImplementations(container);

      // Assert
      // Check that all required repository tokens are registered
      const expectedTokens = [
        TOKENS.IProofDocumentRepository,
        TOKENS.IAtomicArgumentRepository,
        TOKENS.IStatementRepository,
        TOKENS.IOrderedSetRepository,
        TOKENS.ITreeRepository,
        TOKENS.INodeRepository,
        TOKENS.IPackageRepository,
        TOKENS.IDependencyRepository,
        TOKENS.IPackageInstallationRepository,
        TOKENS.IOperationRepository,
        TOKENS.ISyncStateRepository,
        TOKENS.IVectorClockRepository,
        TOKENS.IConflictRepository,
      ];

      expectedTokens.forEach((token) => {
        expect(container.registerFactory).toHaveBeenCalledWith(token, expect.any(Function));
      });
    });

    it('should create factory function that resolves dependencies', async () => {
      // Arrange
      const mockFileSystemPort = { readFile: vi.fn() };
      container.resolve = vi.fn().mockReturnValue(mockFileSystemPort);
      container.registerFactory = vi.fn();

      // Act
      await registerRepositoryImplementations(container);

      // Get the factory function for IProofDocumentRepository
      const factoryCall = (container.registerFactory as any).mock.calls.find(
        (call: any) => call[0] === TOKENS.IProofDocumentRepository,
      );
      expect(factoryCall).toBeDefined();

      const factory = factoryCall[1];

      // Act - call the factory
      const result = factory(container);

      // Assert
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.IFileSystemPort);
      expect(result).toBeDefined();
    });
  });
});

describe('Platform Adapter Registration', () => {
  let container: ApplicationContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  describe('registerPlatformAdapters', () => {
    it('should register all VS Code adapters', async () => {
      // Arrange
      const mockVSCodeContext = { subscriptions: [] };
      container.registerInstance = vi.fn();
      container.registerFactory = vi.fn();
      container.resolve = vi.fn();

      // Act
      await registerPlatformAdapters(container, mockVSCodeContext);

      // Assert
      expect(container.registerInstance).toHaveBeenCalledWith(
        TOKENS.IFileSystemPort,
        expect.any(Object),
      );
      expect(container.registerInstance).toHaveBeenCalledWith(TOKENS.IUIPort, expect.any(Object));
      expect(container.registerInstance).toHaveBeenCalledWith(
        TOKENS.IPlatformPort,
        expect.any(Object),
      );
      expect(container.registerInstance).toHaveBeenCalledWith(
        TOKENS.IViewStatePort,
        expect.any(Object),
      );
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.IDiagnosticPort,
        expect.any(Function),
      );
    });

    it('should pass VS Code context to adapter constructors', async () => {
      // Arrange
      const mockVSCodeContext = { subscriptions: [], globalState: {} };
      container.registerInstance = vi.fn();
      container.registerFactory = vi.fn();
      container.resolve = vi.fn();

      const { VSCodeFileSystemAdapter } = require('../../vscode/VSCodeFileSystemAdapter.js');

      // Act
      await registerPlatformAdapters(container, mockVSCodeContext);

      // Assert
      expect(VSCodeFileSystemAdapter).toHaveBeenCalledWith(mockVSCodeContext);
    });
  });
});

describe('Full Container Initialization', () => {
  describe('initializeContainer', () => {
    it('should initialize container with all registrations', async () => {
      // Arrange
      const mockContainer = createTestContainer();
      mockContainer.registerFactory = vi.fn();
      mockContainer.registerSingleton = vi.fn();
      mockContainer.registerInstance = vi.fn();

      // Mock getContainer to return our test container
      vi.mocked(getContainer as any).mockReturnValue(mockContainer);

      // Act
      const result = await initializeContainer();

      // Assert
      expect(result).toBe(mockContainer);
      // Verify that registrations were called (we can't test exact calls due to dynamic imports)
      expect(mockContainer.registerFactory).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      const mockContainer = createTestContainer();
      mockContainer.registerFactory = vi.fn().mockImplementation(() => {
        throw new Error('Registration failed');
      });

      vi.mocked(getContainer as any).mockReturnValue(mockContainer);

      // Act & Assert
      await expect(initializeContainer()).rejects.toThrow('Registration failed');
    });
  });
});

describe('Service Registration Functions', () => {
  let container: ApplicationContainer;

  beforeEach(() => {
    container = createTestContainer();
    container.registerFactory = vi.fn();
    container.registerSingleton = vi.fn();
    container.registerInstance = vi.fn();
  });

  describe('registerDomainServices', () => {
    it('should register all domain services', async () => {
      // Act
      await registerDomainServices(container);

      // Assert
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.ConnectionResolutionService,
        expect.any(Function),
      );
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.StatementFlowService,
        expect.any(Function),
      );
      // Add more assertions for other domain services as needed
    });
  });

  describe('registerInfrastructureServices', () => {
    it('should register infrastructure services', async () => {
      // Act
      await registerInfrastructureServices(container);

      // Assert
      expect(container.registerSingleton).toHaveBeenCalledWith(
        TOKENS.YAMLValidator,
        expect.any(Function),
      );
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.ProofFileParser,
        expect.any(Function),
      );
    });
  });

  describe('registerApplicationServices', () => {
    it('should register application services', async () => {
      // Act
      await registerApplicationServices(container);

      // Assert
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.ProofApplicationService,
        expect.any(Function),
      );
      expect(container.registerSingleton).toHaveBeenCalledWith(
        TOKENS.TreeLayoutService,
        expect.any(Function),
      );
    });
  });

  describe('registerContextServices', () => {
    it('should register context services', async () => {
      // Act
      await registerContextServices(container);

      // Assert
      expect(container.registerSingleton).toHaveBeenCalledWith(
        TOKENS.LogicValidationService,
        expect.any(Function),
      );
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.DependencyResolutionService,
        expect.any(Function),
      );
    });
  });

  describe('registerPresentationControllers', () => {
    it('should register presentation controllers', async () => {
      // Act
      await registerPresentationControllers(container);

      // Assert
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.ProofDocumentController,
        expect.any(Function),
      );
      expect(container.registerFactory).toHaveBeenCalledWith(
        TOKENS.StatementController,
        expect.any(Function),
      );
    });
  });
});

describe('Error Handling', () => {
  let container: ApplicationContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  describe('dynamic import failures', () => {
    it('should handle failed dynamic imports in registerDomainServices', async () => {
      // Arrange
      vi.mocked(
        import('../../../domain/services/ConnectionResolutionService.js'),
      ).mockRejectedValue(new Error('Import failed'));

      // Act & Assert
      await expect(registerDomainServices(container)).rejects.toThrow();
    });

    it('should handle failed dynamic imports in registerInfrastructureServices', async () => {
      // Arrange
      vi.mocked(import('../../../parser/ProofFileParser.js')).mockRejectedValue(
        new Error('Import failed'),
      );

      // Act & Assert
      await expect(registerInfrastructureServices(container)).rejects.toThrow();
    });
  });

  describe('container operation failures', () => {
    it('should handle container registration failures', async () => {
      // Arrange
      container.registerFactory = vi.fn().mockImplementation(() => {
        throw new Error('Container registration failed');
      });

      // Act & Assert
      await expect(registerRepositoryImplementations(container)).rejects.toThrow(
        'Container registration failed',
      );
    });
  });
});

describe('Integration Scenarios', () => {
  describe('full initialization workflow', () => {
    it('should complete full initialization without errors', async () => {
      // This test ensures the entire initialization chain works
      // It's more of an integration test for the registration process

      // Arrange
      const testContainer = createTestContainer();
      testContainer.registerFactory = vi.fn();
      testContainer.registerSingleton = vi.fn();
      testContainer.registerInstance = vi.fn();

      // Act & Assert - should not throw
      await expect(registerRepositoryImplementations(testContainer)).resolves.not.toThrow();
      await expect(registerDomainServices(testContainer)).resolves.not.toThrow();
      await expect(registerInfrastructureServices(testContainer)).resolves.not.toThrow();
      await expect(registerApplicationServices(testContainer)).resolves.not.toThrow();
      await expect(registerContextServices(testContainer)).resolves.not.toThrow();
      await expect(registerPresentationControllers(testContainer)).resolves.not.toThrow();
    });
  });

  describe('dependency resolution chains', () => {
    it('should set up proper dependency resolution chains', async () => {
      // Arrange
      const testContainer = createTestContainer();
      const mockResolve = vi.fn();
      testContainer.resolve = mockResolve;
      testContainer.registerFactory = vi.fn();

      // Act
      await registerRepositoryImplementations(testContainer);

      // Get a factory function and test dependency resolution
      const factoryCall = (testContainer.registerFactory as any).mock.calls.find(
        (call: any) => call[0] === TOKENS.IProofDocumentRepository,
      );

      if (factoryCall) {
        const factory = factoryCall[1];
        factory(testContainer);

        // Assert
        expect(mockResolve).toHaveBeenCalledWith(TOKENS.IFileSystemPort);
      }
    });
  });
});
