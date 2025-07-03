/**
 * Tests for IPackageRepository interface contracts
 *
 * Focuses on:
 * - Repository interface method contracts
 * - Expected method signatures and return types
 * - Error handling contracts
 * - Mock implementation verification
 * - Interface completeness testing
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Package } from '../../entities/Package';
import type { IPackageRepository } from '../../repositories/IPackageRepository';
import { PackageNotFoundError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';
import { PackageSource } from '../../value-objects/package-source';

describe('IPackageRepository', () => {
  let packageRepository: IPackageRepository;
  let packageId: PackageId;
  let mockPackage: Package;
  let mockSource: PackageSource;

  beforeEach(() => {
    packageRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findBySource: vi.fn(),
      findByGitRepository: vi.fn(),
      searchByKeywords: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn(),
    };

    const idResult = PackageId.create('test-package');
    expect(idResult.isOk()).toBe(true);
    if (idResult.isOk()) {
      packageId = idResult.value;
    }

    const sourceResult = PackageSource.createFromGit({
      url: 'https://github.com/test/repo',
      ref: 'main',
    });
    expect(sourceResult.isOk()).toBe(true);
    if (sourceResult.isOk()) {
      mockSource = sourceResult.value;
    }

    mockPackage = {
      getId: vi.fn().mockReturnValue(packageId),
      getName: vi.fn().mockReturnValue('test-package'),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
    } as unknown as Package;
  });

  describe('interface contract verification', () => {
    it('should have all required methods', () => {
      expect(typeof packageRepository.save).toBe('function');
      expect(typeof packageRepository.findById).toBe('function');
      expect(typeof packageRepository.findBySource).toBe('function');
      expect(typeof packageRepository.findByGitRepository).toBe('function');
      expect(typeof packageRepository.searchByKeywords).toBe('function');
      expect(typeof packageRepository.findAll).toBe('function');
      expect(typeof packageRepository.delete).toBe('function');
    });

    it('should have correct method signatures for save', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.save.mockResolvedValue(ok(undefined));

      // Act
      const result = await packageRepository.save(mockPackage);

      // Assert
      expect(mockRepo.save).toHaveBeenCalledWith(mockPackage);
      expect(result.isOk()).toBe(true);
    });

    it('should have correct method signatures for findById', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findById.mockResolvedValue(mockPackage);

      // Act
      const result = await packageRepository.findById(packageId);

      // Assert
      expect(mockRepo.findById).toHaveBeenCalledWith(packageId);
      expect(result).toBe(mockPackage);
    });

    it('should have correct method signatures for findBySource', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findBySource.mockResolvedValue(ok(mockPackage));

      // Act
      const result = await packageRepository.findBySource(mockSource);

      // Assert
      expect(mockRepo.findBySource).toHaveBeenCalledWith(mockSource);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockPackage);
      }
    });

    it('should have correct method signatures for findByGitRepository', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      const gitUrl = 'https://github.com/test/repo';
      const ref = 'main';
      mockRepo.findByGitRepository.mockResolvedValue(ok([mockPackage]));

      // Act
      const result = await packageRepository.findByGitRepository(gitUrl, ref);

      // Assert
      expect(mockRepo.findByGitRepository).toHaveBeenCalledWith(gitUrl, ref);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value).toContain(mockPackage);
      }
    });

    it('should have correct method signatures for searchByKeywords', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      const keywords = ['test', 'package'];
      mockRepo.searchByKeywords.mockResolvedValue(ok([mockPackage]));

      // Act
      const result = await packageRepository.searchByKeywords(keywords);

      // Assert
      expect(mockRepo.searchByKeywords).toHaveBeenCalledWith(keywords);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value).toContain(mockPackage);
      }
    });

    it('should have correct method signatures for findAll', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findAll.mockResolvedValue([mockPackage]);

      // Act
      const result = await packageRepository.findAll();

      // Assert
      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(mockPackage);
    });

    it('should have correct method signatures for delete', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.delete.mockResolvedValue(ok(undefined));

      // Act
      const result = await packageRepository.delete(packageId);

      // Assert
      expect(mockRepo.delete).toHaveBeenCalledWith(packageId);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('error handling contracts', () => {
    it('should handle save errors properly', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      const notFoundError = new PackageNotFoundError('Package not found');
      mockRepo.save.mockResolvedValue(err(notFoundError));

      // Act
      const result = await packageRepository.save(mockPackage);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toBe('Package not found');
      }
    });

    it('should handle findById not found properly', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findById.mockResolvedValue(null);

      // Act
      const result = await packageRepository.findById(packageId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle findBySource errors properly', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      const notFoundError = new PackageNotFoundError('Source not found');
      mockRepo.findBySource.mockResolvedValue(err(notFoundError));

      // Act
      const result = await packageRepository.findBySource(mockSource);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toBe('Source not found');
      }
    });

    it('should handle delete errors properly', async () => {
      // Arrange
      const mockRepo = packageRepository as {
        [K in keyof IPackageRepository]: ReturnType<typeof vi.fn>;
      };
      const notFoundError = new PackageNotFoundError('Package not found');
      mockRepo.delete.mockResolvedValue(err(notFoundError));

      // Act
      const result = await packageRepository.delete(packageId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toBe('Package not found');
      }
    });
  });
});
