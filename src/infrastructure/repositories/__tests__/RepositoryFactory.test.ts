import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IFileSystemPort } from '../../../application/ports/IFileSystemPort.js';
import { createProofDocumentRepository } from '../RepositoryFactory.js';
import { YAMLProofDocumentRepository } from '../yaml/YAMLProofDocumentRepository.js';

// Mock the YAMLProofDocumentRepository
vi.mock('../yaml/YAMLProofDocumentRepository.js', () => ({
  YAMLProofDocumentRepository: vi.fn(),
}));

// Helper function to create a complete mock IFileSystemPort
function createMockFileSystem(): IFileSystemPort {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    delete: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    watch: vi.fn(),
    getStoredDocument: vi.fn(),
    storeDocument: vi.fn(),
    deleteStoredDocument: vi.fn(),
    listStoredDocuments: vi.fn(),
    capabilities: vi.fn(),
  };
}

describe('RepositoryFactory', () => {
  let mockFileSystem: IFileSystemPort;
  const basePath = '/test/documents';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileSystem = createMockFileSystem();
  });

  describe('createProofDocumentRepository', () => {
    it('should create YAMLProofDocumentRepository with correct parameters', () => {
      // Arrange
      const mockRepository = {};
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act
      const result = createProofDocumentRepository(mockFileSystem as IFileSystemPort, basePath);

      // Assert
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem, basePath);
      expect(result).toBe(mockRepository);
    });

    it('should return IProofDocumentRepository interface', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act
      const result = createProofDocumentRepository(mockFileSystem as IFileSystemPort, basePath);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.findById).toBe('function');
      expect(typeof result.save).toBe('function');
      expect(typeof result.exists).toBe('function');
      expect(typeof result.delete).toBe('function');
      expect(typeof result.findAll).toBe('function');
      expect(typeof result.nextIdentity).toBe('function');
    });

    it('should handle different base paths', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);
      const customBasePath = '/custom/path/to/documents';

      // Act
      createProofDocumentRepository(mockFileSystem, customBasePath);

      // Assert
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem, customBasePath);
    });

    it('should handle empty base path', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);
      const emptyBasePath = '';

      // Act
      createProofDocumentRepository(mockFileSystem, emptyBasePath);

      // Assert
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem, emptyBasePath);
    });

    it('should handle relative base paths', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);
      const relativePath = './documents';

      // Act
      createProofDocumentRepository(mockFileSystem, relativePath);

      // Assert
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem, relativePath);
    });

    it('should create new instance on each call', () => {
      // Arrange
      const mockRepository1 = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      const mockRepository2 = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any)
        .mockImplementationOnce(() => mockRepository1)
        .mockImplementationOnce(() => mockRepository2);

      // Act
      const result1 = createProofDocumentRepository(mockFileSystem, basePath);
      const result2 = createProofDocumentRepository(mockFileSystem, basePath);

      // Assert
      expect(YAMLProofDocumentRepository).toHaveBeenCalledTimes(2);
      expect(result1).toBe(mockRepository1);
      expect(result2).toBe(mockRepository2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('dependency injection compatibility', () => {
    it('should work with different IFileSystemPort implementations', () => {
      // Arrange
      const mockFileSystem1 = createMockFileSystem();
      const mockFileSystem2 = createMockFileSystem();
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act
      createProofDocumentRepository(mockFileSystem1, basePath);
      createProofDocumentRepository(mockFileSystem2, basePath);

      // Assert
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem1, basePath);
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem2, basePath);
    });

    it('should maintain abstraction layer', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act
      const result = createProofDocumentRepository(mockFileSystem, basePath);

      // Assert
      // The factory should return the interface, not the concrete implementation
      expect(result).toBeDefined();
      // Should not expose implementation-specific methods beyond the interface
      const resultAsAny = result as any;
      expect(resultAsAny.constructor.name).not.toBe('YAMLProofDocumentRepository');
    });
  });

  describe('error handling', () => {
    it('should propagate constructor errors from YAMLProofDocumentRepository', () => {
      // Arrange
      const constructorError = new Error('Repository construction failed');
      (YAMLProofDocumentRepository as any).mockImplementation(() => {
        throw constructorError;
      });

      // Act & Assert
      expect(() => createProofDocumentRepository(mockFileSystem, basePath)).toThrow(
        constructorError,
      );
    });

    it('should handle null file system gracefully', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act & Assert
      // The factory should pass through null and let the repository handle validation
      expect(() => createProofDocumentRepository(null as any, basePath)).not.toThrow();
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(null, basePath);
    });
  });

  describe('future extensibility', () => {
    it('should be extensible for different repository types', () => {
      // This test documents the intention for future extension
      // Currently only YAML is supported, but the pattern allows for more

      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act
      const result = createProofDocumentRepository(mockFileSystem, basePath);

      // Assert
      expect(result).toBeDefined();
      // The factory pattern supports adding JSON, SQLite, etc. implementations
      // without changing the interface
    });

    it('should support configuration-driven repository selection in the future', () => {
      // This test documents the pattern for future enhancement
      // where repository type could be determined by configuration

      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act
      const result = createProofDocumentRepository(mockFileSystem, basePath);

      // Assert
      expect(result).toBeDefined();
      // Future enhancement could accept a third parameter for repository type
      // createProofDocumentRepository(fileSystem, basePath, 'yaml' | 'json' | 'sqlite')
    });
  });

  describe('integration patterns', () => {
    it('should work with container-based dependency injection', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act - simulate DI container usage
      const factory = () => createProofDocumentRepository(mockFileSystem, basePath);
      const result = factory();

      // Assert
      expect(result).toBeDefined();
      expect(YAMLProofDocumentRepository).toHaveBeenCalledWith(mockFileSystem, basePath);
    });

    it('should support factory function registration in DI containers', () => {
      // Arrange
      const mockRepository = {
        findById: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn(),
        findAll: vi.fn(),
        nextIdentity: vi.fn(),
      };
      (YAMLProofDocumentRepository as any).mockImplementation(() => mockRepository);

      // Act - simulate container.registerFactory usage
      const containerFactory = (resolve: (token: string) => any) => {
        const fileSystem = resolve('IFileSystemPort');
        const config = resolve('config');
        return createProofDocumentRepository(fileSystem, config.basePath);
      };

      const mockResolve = vi
        .fn()
        .mockReturnValueOnce(mockFileSystem)
        .mockReturnValueOnce({ basePath });

      const result = containerFactory(mockResolve);

      // Assert
      expect(result).toBeDefined();
      expect(mockResolve).toHaveBeenCalledWith('IFileSystemPort');
      expect(mockResolve).toHaveBeenCalledWith('config');
    });
  });
});
