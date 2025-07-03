/**
 * Tests for IPackageInstallationRepository interface contracts
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

import type { PackageInstallation } from '../../entities/PackageInstallation';
import type { IPackageInstallationRepository } from '../../repositories/IPackageInstallationRepository';
import { PackageNotFoundError } from '../../types/domain-errors';
import { InstallationPath } from '../../value-objects/InstallationPath';
import { PackageId } from '../../value-objects/package-id';

describe('IPackageInstallationRepository', () => {
  let installationRepository: IPackageInstallationRepository;
  let packageId: PackageId;
  let installationPath: InstallationPath;
  let mockInstallation: PackageInstallation;

  beforeEach(() => {
    installationRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByPackageId: vi.fn(),
      findByInstallationPath: vi.fn(),
      findActiveInstallations: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn(),
    };

    const packageIdResult = PackageId.create('test-package');
    expect(packageIdResult.isOk()).toBe(true);
    if (packageIdResult.isOk()) {
      packageId = packageIdResult.value;
    }

    const pathResult = InstallationPath.create('/test/path');
    expect(pathResult.isOk()).toBe(true);
    if (pathResult.isOk()) {
      installationPath = pathResult.value;
    }

    mockInstallation = {
      getId: vi.fn().mockReturnValue('installation-1'),
      getPackageId: vi.fn().mockReturnValue(packageId),
      getInstallationPath: vi.fn().mockReturnValue(installationPath),
      isActive: vi.fn().mockReturnValue(true),
    } as unknown as PackageInstallation;
  });

  describe('interface contract verification', () => {
    it('should have all required methods', () => {
      expect(typeof installationRepository.save).toBe('function');
      expect(typeof installationRepository.findById).toBe('function');
      expect(typeof installationRepository.findByPackageId).toBe('function');
      expect(typeof installationRepository.findByInstallationPath).toBe('function');
      expect(typeof installationRepository.findActiveInstallations).toBe('function');
      expect(typeof installationRepository.findAll).toBe('function');
      expect(typeof installationRepository.delete).toBe('function');
    });

    it('should have correct method signatures for save', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.save.mockResolvedValue(ok(undefined));

      // Act
      const result = await installationRepository.save(mockInstallation);

      // Assert
      expect(mockRepo.save).toHaveBeenCalledWith(mockInstallation);
      expect(result.isOk()).toBe(true);
    });

    it('should have correct method signatures for findById', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findById.mockResolvedValue(mockInstallation);

      // Act
      const result = await installationRepository.findById('installation-1');

      // Assert
      expect(mockRepo.findById).toHaveBeenCalledWith('installation-1');
      expect(result).toBe(mockInstallation);
    });

    it('should have correct method signatures for findByPackageId', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findByPackageId.mockResolvedValue([mockInstallation]);

      // Act
      const result = await installationRepository.findByPackageId(packageId);

      // Assert
      expect(mockRepo.findByPackageId).toHaveBeenCalledWith(packageId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(mockInstallation);
    });

    it('should have correct method signatures for findByInstallationPath', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findByInstallationPath.mockResolvedValue([mockInstallation]);

      // Act
      const result = await installationRepository.findByInstallationPath(installationPath);

      // Assert
      expect(mockRepo.findByInstallationPath).toHaveBeenCalledWith(installationPath);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(mockInstallation);
    });

    it('should have correct method signatures for findActiveInstallations', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findActiveInstallations.mockResolvedValue([mockInstallation]);

      // Act
      const result = await installationRepository.findActiveInstallations();

      // Assert
      expect(mockRepo.findActiveInstallations).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(mockInstallation);
    });

    it('should have correct method signatures for findAll', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findAll.mockResolvedValue([mockInstallation]);

      // Act
      const result = await installationRepository.findAll();

      // Assert
      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(mockInstallation);
    });

    it('should have correct method signatures for delete', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.delete.mockResolvedValue(ok(undefined));

      // Act
      const result = await installationRepository.delete('installation-1');

      // Assert
      expect(mockRepo.delete).toHaveBeenCalledWith('installation-1');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('error handling contracts', () => {
    it('should handle save errors properly', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      const notFoundError = new PackageNotFoundError('Package not found');
      mockRepo.save.mockResolvedValue(err(notFoundError));

      // Act
      const result = await installationRepository.save(mockInstallation);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toBe('Package not found');
      }
    });

    it('should handle findById not found properly', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      mockRepo.findById.mockResolvedValue(null);

      // Act
      const result = await installationRepository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle delete errors properly', async () => {
      // Arrange
      const mockRepo = installationRepository as {
        [K in keyof IPackageInstallationRepository]: ReturnType<typeof vi.fn>;
      };
      const notFoundError = new PackageNotFoundError('Installation not found');
      mockRepo.delete.mockResolvedValue(err(notFoundError));

      // Act
      const result = await installationRepository.delete('non-existent');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toBe('Installation not found');
      }
    });
  });
});
