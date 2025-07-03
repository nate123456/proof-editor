/**
 * Tests for PackageDiscoveryService
 *
 * Focuses on:
 * - GitHub package discovery
 * - Local directory package discovery
 * - Package search by ID and keywords
 * - Source validation
 * - Language package discovery
 * - Capability-based package discovery
 * - Error handling for discovery operations
 * - High coverage for core functionality
 */

import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Package } from '../../entities/Package';
import type { IPackageRepository } from '../../repositories/IPackageRepository';
import {
  type IGitPackageProvider,
  type ILocalPackageProvider,
  PackageDiscoveryService,
} from '../../services/package-discovery-service';
import type { GitPackageSource, LocalPackageSource } from '../../types/common-types';
import { PackageNotFoundError, PackageSourceUnavailableError } from '../../types/domain-errors';
import { PackageValidationError } from '../../types/domain-errors.js';
import type { PackageId } from '../../value-objects/package-id';
import { PackageSource } from '../../value-objects/package-source';

// Mock factories
const createMockPackage = (
  id: string,
  isLanguagePackage = false,
  capabilities: string[] = [],
): Package => {
  return {
    getId: vi.fn(() => ({ toString: () => id, equals: vi.fn() })),
    getName: vi.fn(() => id),
    getVersion: vi.fn(() => '1.0.0'),
    isLanguagePackage: vi.fn(() => isLanguagePackage),
    supportsCapability: vi.fn((capability: string) => capabilities.includes(capability)),
    getSource: vi.fn(() => ({
      asGitSource: () => null,
      asLocalSource: () => null,
    })),
  } as unknown as Package;
};

const createMockPackageRepository = (): IPackageRepository => {
  return {
    findBySource: vi.fn(),
    searchByKeywords: vi.fn(),
    findByGitRepository: vi.fn(),
    findById: vi.fn(),
    findByVersion: vi.fn(),
    findByKeyword: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    exists: vi.fn(),
    getAllVersions: vi.fn(),
    getLatestVersion: vi.fn(),
  };
};

const createMockGitPackageProvider = (): IGitPackageProvider => {
  return {
    discoverFromGitHub: vi.fn(),
    validateGitSource: vi.fn(),
    clonePackageToTemporary: vi.fn(),
  };
};

const createMockLocalPackageProvider = (): ILocalPackageProvider => {
  return {
    discoverInDirectory: vi.fn(),
    validateLocalSource: vi.fn(),
  };
};

const createMockGitSource = (url: string, ref = 'main'): GitPackageSource => {
  return {
    url,
    ref,
  };
};

const createMockLocalSource = (path: string): LocalPackageSource => {
  return {
    path,
  };
};

describe('PackageDiscoveryService', () => {
  let service: PackageDiscoveryService;
  let mockPackageRepository: IPackageRepository;
  let mockGitProvider: IGitPackageProvider;
  let mockLocalProvider: ILocalPackageProvider;

  beforeEach(() => {
    mockPackageRepository = createMockPackageRepository();
    mockGitProvider = createMockGitPackageProvider();
    mockLocalProvider = createMockLocalPackageProvider();

    service = new PackageDiscoveryService(
      mockPackageRepository,
      mockGitProvider,
      mockLocalProvider,
    );

    vi.clearAllMocks();

    // Mock Date.now to control timing
    let mockTime = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      mockTime += 10; // Each call advances 10ms
      return mockTime;
    });
  });

  describe('discoverPackagesFromGitHub', () => {
    it('should discover packages from GitHub successfully', async () => {
      const searchQuery = 'proof editor package';
      const gitSources = [
        createMockGitSource('https://github.com/user/package1.git'),
        createMockGitSource('https://github.com/user/package2.git'),
      ];

      const package1 = createMockPackage('package1');
      const package2 = createMockPackage('package2');

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(ok(gitSources));

      // Mock PackageSource.createFromGit to succeed
      vi.spyOn(PackageSource, 'createFromGit')
        .mockReturnValueOnce(ok({} as any))
        .mockReturnValueOnce(ok({} as any));

      // Mock repository to return packages
      vi.mocked(mockPackageRepository.findBySource)
        .mockResolvedValueOnce(ok(package1))
        .mockResolvedValueOnce(ok(package2));

      const result = await service.discoverPackagesFromGitHub(searchQuery);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(2);
        expect(discoveryResult.totalFound).toBe(2);
        expect(discoveryResult.searchQuery).toBe(searchQuery);
        expect(discoveryResult.searchTime).toBeGreaterThan(0);
      }
    });

    it('should handle GitHub discovery with options', async () => {
      const searchQuery = 'test package';
      const options = {
        includePrerelease: true,
        onlyVerified: false,
        maxResults: 10,
        timeoutMs: 5000,
      };

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(ok([]));

      const result = await service.discoverPackagesFromGitHub(searchQuery, options);

      expect(result.isOk()).toBe(true);
      expect(mockGitProvider.discoverFromGitHub).toHaveBeenCalledWith(searchQuery, options);
    });

    it('should limit results based on maxResults option', async () => {
      const searchQuery = 'popular package';
      const manyGitSources = Array.from({ length: 100 }, (_, i) =>
        createMockGitSource(`https://github.com/user/package${i}.git`),
      );

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(ok(manyGitSources));

      // Mock PackageSource.createFromGit to succeed for all calls
      vi.spyOn(PackageSource, 'createFromGit').mockReturnValue(ok({} as any));

      // Mock repository to return packages for first 5 calls
      vi.mocked(mockPackageRepository.findBySource).mockResolvedValue(
        ok(createMockPackage('test-package')),
      );

      const result = await service.discoverPackagesFromGitHub(searchQuery, { maxResults: 5 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages.length).toBeLessThanOrEqual(5);
        expect(discoveryResult.totalFound).toBe(100); // Total found should be all discovered
      }
    });

    it('should handle GitHub provider errors', async () => {
      const searchQuery = 'failing search';

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(
        err(new PackageSourceUnavailableError('GitHub API unavailable')),
      );

      const result = await service.discoverPackagesFromGitHub(searchQuery);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('GitHub API unavailable');
      }
    });

    it('should skip packages with invalid sources', async () => {
      const searchQuery = 'mixed packages';
      const gitSources = [
        createMockGitSource('https://github.com/user/valid.git'),
        createMockGitSource('invalid-url'),
      ];

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(ok(gitSources));

      // Mock PackageSource creation - first succeeds, second fails
      vi.spyOn(PackageSource, 'createFromGit')
        .mockReturnValueOnce(ok({} as any))
        .mockReturnValueOnce(err(new PackageValidationError('Invalid source')));

      vi.mocked(mockPackageRepository.findBySource).mockResolvedValue(
        ok(createMockPackage('valid-package')),
      );

      const result = await service.discoverPackagesFromGitHub(searchQuery);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(1); // Only valid package
        expect(discoveryResult.totalFound).toBe(2); // Total found includes invalid
      }
    });

    it('should handle packages not found in repository', async () => {
      const searchQuery = 'unknown packages';
      const gitSources = [createMockGitSource('https://github.com/user/unknown.git')];

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(ok(gitSources));
      vi.spyOn(PackageSource, 'createFromGit').mockReturnValue(ok({} as any));
      vi.mocked(mockPackageRepository.findBySource).mockResolvedValue(
        err(new PackageNotFoundError('Package not in repository')),
      );

      const result = await service.discoverPackagesFromGitHub(searchQuery);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(0);
        expect(discoveryResult.totalFound).toBe(1);
      }
    });
  });

  describe('discoverPackagesInDirectory', () => {
    it('should discover packages in local directory', async () => {
      const directoryPath = '/path/to/packages';
      const localSources = [
        createMockLocalSource('/path/to/packages/package1'),
        createMockLocalSource('/path/to/packages/package2'),
      ];

      const package1 = createMockPackage('local-package1');
      const package2 = createMockPackage('local-package2');

      vi.mocked(mockLocalProvider.discoverInDirectory).mockResolvedValue(ok(localSources));

      vi.spyOn(PackageSource, 'createFromLocal')
        .mockReturnValueOnce(ok({} as any))
        .mockReturnValueOnce(ok({} as any));

      vi.mocked(mockPackageRepository.findBySource)
        .mockResolvedValueOnce(ok(package1))
        .mockResolvedValueOnce(ok(package2));

      const result = await service.discoverPackagesInDirectory(directoryPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(2);
        expect(discoveryResult.totalFound).toBe(2);
        expect(discoveryResult.searchTime).toBeGreaterThan(0);
      }
    });

    it('should discover packages with local options', async () => {
      const directoryPath = '/path/to/packages';
      const options = {
        recursive: true,
        includeHidden: false,
        maxDepth: 3,
      };

      vi.mocked(mockLocalProvider.discoverInDirectory).mockResolvedValue(ok([]));

      const result = await service.discoverPackagesInDirectory(directoryPath, options);

      expect(result.isOk()).toBe(true);
      expect(mockLocalProvider.discoverInDirectory).toHaveBeenCalledWith(directoryPath, options);
    });

    it('should handle local provider errors', async () => {
      const directoryPath = '/invalid/path';

      vi.mocked(mockLocalProvider.discoverInDirectory).mockResolvedValue(
        err(new PackageNotFoundError('Directory not found')),
      );

      const result = await service.discoverPackagesInDirectory(directoryPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Directory not found');
      }
    });

    it('should skip invalid local sources', async () => {
      const directoryPath = '/path/to/packages';
      const localSources = [
        createMockLocalSource('/path/to/packages/valid'),
        createMockLocalSource('/path/to/packages/invalid'),
      ];

      vi.mocked(mockLocalProvider.discoverInDirectory).mockResolvedValue(ok(localSources));

      vi.spyOn(PackageSource, 'createFromLocal')
        .mockReturnValueOnce(ok({} as any))
        .mockReturnValueOnce(err(new PackageValidationError('Invalid local source')));

      vi.mocked(mockPackageRepository.findBySource).mockResolvedValue(
        ok(createMockPackage('valid-local')),
      );

      const result = await service.discoverPackagesInDirectory(directoryPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(1);
        expect(discoveryResult.totalFound).toBe(2);
      }
    });
  });

  describe('findPackageById', () => {
    it('should find package by ID successfully', async () => {
      const packageId = {
        toString: () => 'test-package',
        equals: vi.fn(() => true),
      } as unknown as PackageId;
      const matchingPackage = createMockPackage('test-package');

      // Ensure the mock package returns the expected ID
      vi.mocked(matchingPackage.getId).mockReturnValue(packageId);

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok([matchingPackage]));

      const result = await service.findPackageById(packageId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(matchingPackage);
      }
    });

    it('should return error when package not found', async () => {
      const packageId = {
        toString: () => 'nonexistent-package',
        equals: vi.fn(),
      } as unknown as PackageId;
      const otherPackage = createMockPackage('other-package');

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok([otherPackage]));
      vi.mocked(otherPackage.getId().equals).mockReturnValue(false);

      const result = await service.findPackageById(packageId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('Package not found');
      }
    });

    it('should handle repository search errors', async () => {
      const packageId = { toString: () => 'test-package', equals: vi.fn() } as unknown as PackageId;

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(
        err(new PackageNotFoundError('Search failed')),
      );

      const result = await service.findPackageById(packageId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Search failed');
      }
    });
  });

  describe('findPackagesByKeywords', () => {
    it('should find packages by keywords successfully', async () => {
      const keywords = ['logic', 'proof', 'verification'];
      const packages = [createMockPackage('logic-package'), createMockPackage('proof-package')];

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok(packages));

      const result = await service.findPackagesByKeywords(keywords);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(2);
        expect(discoveryResult.totalFound).toBe(2);
        expect(discoveryResult.searchTime).toBeGreaterThan(0);
      }
    });

    it('should reject empty keywords array', async () => {
      const result = await service.findPackagesByKeywords([]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('Keywords cannot be empty');
      }
    });

    it('should handle repository search errors', async () => {
      const keywords = ['failing-search'];

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(
        err(new PackageNotFoundError('Repository error')),
      );

      const result = await service.findPackagesByKeywords(keywords);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Repository error');
      }
    });
  });

  describe('validatePackageSource', () => {
    it('should validate git source successfully', async () => {
      const gitSource = createMockGitSource('https://github.com/user/repo.git');
      const packageSource = {
        asGitSource: vi.fn(() => gitSource),
        asLocalSource: vi.fn(() => null),
      } as any;

      vi.mocked(mockGitProvider.validateGitSource).mockResolvedValue(ok(true));

      const result = await service.validatePackageSource(packageSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should validate local source successfully', async () => {
      const localSource = createMockLocalSource('/path/to/package');
      const packageSource = {
        asGitSource: vi.fn(() => null),
        asLocalSource: vi.fn(() => localSource),
      } as any;

      vi.mocked(mockLocalProvider.validateLocalSource).mockResolvedValue(ok(true));

      const result = await service.validatePackageSource(packageSource);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should handle git source validation errors', async () => {
      const gitSource = createMockGitSource('https://github.com/invalid/repo.git');
      const packageSource = {
        asGitSource: vi.fn(() => gitSource),
        asLocalSource: vi.fn(() => null),
      } as any;

      vi.mocked(mockGitProvider.validateGitSource).mockResolvedValue(
        err(new PackageSourceUnavailableError('Git repository not accessible')),
      );

      const result = await service.validatePackageSource(packageSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Git repository not accessible');
      }
    });

    it('should handle local source validation errors', async () => {
      const localSource = createMockLocalSource('/invalid/path');
      const packageSource = {
        asGitSource: vi.fn(() => null),
        asLocalSource: vi.fn(() => localSource),
      } as any;

      vi.mocked(mockLocalProvider.validateLocalSource).mockResolvedValue(
        err(new PackageNotFoundError('Local path not found')),
      );

      const result = await service.validatePackageSource(packageSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageSourceUnavailableError);
        expect(result.error.message).toContain('Local path not found');
      }
    });

    it('should reject unknown source types', async () => {
      const packageSource = {
        asGitSource: vi.fn(() => null),
        asLocalSource: vi.fn(() => null),
      } as any;

      const result = await service.validatePackageSource(packageSource);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageSourceUnavailableError);
        expect(result.error.message).toContain('Unknown package source type');
      }
    });
  });

  describe('findPackageVersionsFromGitRepository', () => {
    it('should find package versions from git repository', async () => {
      const gitUrl = 'https://github.com/user/repo.git';
      const packages = [createMockPackage('package-v1'), createMockPackage('package-v2')];

      vi.mocked(mockPackageRepository.findByGitRepository).mockResolvedValue(ok(packages));

      const result = await service.findPackageVersionsFromGitRepository(gitUrl);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should reject empty git URL', async () => {
      const result = await service.findPackageVersionsFromGitRepository('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('Git URL cannot be empty');
      }
    });

    it('should handle whitespace-only git URL', async () => {
      const result = await service.findPackageVersionsFromGitRepository('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('Git URL cannot be empty');
      }
    });

    it('should handle repository errors', async () => {
      const gitUrl = 'https://github.com/user/failing-repo.git';

      vi.mocked(mockPackageRepository.findByGitRepository).mockResolvedValue(
        err(new PackageNotFoundError('Repository access failed')),
      );

      const result = await service.findPackageVersionsFromGitRepository(gitUrl);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Repository access failed');
      }
    });
  });

  describe('findLanguagePackages', () => {
    it('should find language packages successfully', async () => {
      const languagePackage1 = createMockPackage('coq-language', true);
      const languagePackage2 = createMockPackage('lean-language', true);
      const regularPackage = createMockPackage('regular-package', false);

      const allPackages = [languagePackage1, languagePackage2, regularPackage];

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok(allPackages));

      const result = await service.findLanguagePackages();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(2); // Only language packages
        expect(discoveryResult.totalFound).toBe(2);
        expect(discoveryResult.searchTime).toBeGreaterThan(0);
      }
    });

    it('should handle search errors for language packages', async () => {
      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(
        err(new PackageNotFoundError('Language package search failed')),
      );

      const result = await service.findLanguagePackages();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Language package search failed');
      }
    });

    it('should return empty result when no language packages found', async () => {
      const regularPackages = [
        createMockPackage('regular1', false),
        createMockPackage('regular2', false),
      ];

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok(regularPackages));

      const result = await service.findLanguagePackages();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(0);
        expect(discoveryResult.totalFound).toBe(0);
      }
    });
  });

  describe('findPackagesWithCapability', () => {
    it('should find packages with specific capability', async () => {
      const capability = 'syntax-highlighting';
      const capablePackage1 = createMockPackage('syntax-package1', false, ['syntax-highlighting']);
      const capablePackage2 = createMockPackage('syntax-package2', false, [
        'syntax-highlighting',
        'linting',
      ]);
      const incapablePackage = createMockPackage('basic-package', false, ['basic-feature']);

      const allPackages = [capablePackage1, capablePackage2, incapablePackage];

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok(allPackages));

      const result = await service.findPackagesWithCapability(capability);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(2);
        expect(discoveryResult.totalFound).toBe(2);
        expect(discoveryResult.searchTime).toBeGreaterThan(0);
      }
    });

    it('should reject empty capability', async () => {
      const result = await service.findPackagesWithCapability('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('Capability cannot be empty');
      }
    });

    it('should reject whitespace-only capability', async () => {
      const result = await service.findPackagesWithCapability('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageNotFoundError);
        expect(result.error.message).toContain('Capability cannot be empty');
      }
    });

    it('should handle repository errors in capability search', async () => {
      const capability = 'failing-capability';

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(
        err(new PackageNotFoundError('Capability search failed')),
      );

      const result = await service.findPackagesWithCapability(capability);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Capability search failed');
      }
    });

    it('should return empty result when no packages have capability', async () => {
      const capability = 'rare-capability';
      const packages = [
        createMockPackage('package1', false, ['common-capability']),
        createMockPackage('package2', false, ['another-capability']),
      ];

      vi.mocked(mockPackageRepository.searchByKeywords).mockResolvedValue(ok(packages));

      const result = await service.findPackagesWithCapability(capability);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages).toHaveLength(0);
        expect(discoveryResult.totalFound).toBe(0);
      }
    });
  });

  describe('edge cases and performance', () => {
    it('should handle large result sets efficiently', async () => {
      const searchQuery = 'popular package';
      const largeGitSources = Array.from({ length: 1000 }, (_, i) =>
        createMockGitSource(`https://github.com/user/package${i}.git`),
      );

      vi.mocked(mockGitProvider.discoverFromGitHub).mockResolvedValue(ok(largeGitSources));

      // Mock PackageSource.createFromGit to succeed for all calls
      vi.spyOn(PackageSource, 'createFromGit').mockReturnValue(ok({} as any));

      // Mock repository to return packages
      vi.mocked(mockPackageRepository.findBySource).mockResolvedValue(
        ok(createMockPackage('test-package')),
      );

      const result = await service.discoverPackagesFromGitHub(searchQuery, { maxResults: 50 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.packages.length).toBeLessThanOrEqual(50);
        expect(discoveryResult.totalFound).toBe(1000);
        expect(discoveryResult.searchTime).toBeGreaterThan(0);
      }
    });

    it('should handle mixed source validation scenarios', async () => {
      const sources = [
        {
          asGitSource: () => createMockGitSource('https://github.com/valid/repo.git'),
          asLocalSource: () => null,
        },
        { asGitSource: () => null, asLocalSource: () => createMockLocalSource('/valid/path') },
        { asGitSource: () => null, asLocalSource: () => null }, // Invalid
      ];

      vi.mocked(mockGitProvider.validateGitSource).mockResolvedValue(ok(true));
      vi.mocked(mockLocalProvider.validateLocalSource).mockResolvedValue(ok(true));

      const results = await Promise.all(
        sources.map(async (source) => service.validatePackageSource(source as any)),
      );

      expect(results[0]?.isOk()).toBe(true);
      expect(results[1]?.isOk()).toBe(true);
      expect(results[2]?.isErr()).toBe(true);
    });

    it('should maintain search timing accuracy', async () => {
      const keywords = ['test'];
      const packages = [createMockPackage('test-package')];

      vi.mocked(mockPackageRepository.searchByKeywords).mockImplementation(async () => {
        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ok(packages);
      });

      const result = await service.findPackagesByKeywords(keywords);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const discoveryResult = result.value;
        expect(discoveryResult.searchTime).toBeGreaterThan(5);
        expect(discoveryResult.searchTime).toBeLessThan(100);
      }
    });
  });
});
