/**
 * Tests for Package entity
 *
 * Focuses on:
 * - Entity creation and validation
 * - Package manifest integration
 * - SDK interface management
 * - Validation result handling
 * - Cache location management
 * - Capability checking methods
 * - Error conditions and edge cases
 * - High coverage for all methods
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { Package, type PackageData } from '../../entities/Package';
import type { SDKInterface, ValidationResult } from '../../types/common-types';
import { PackageValidationError } from '../../types/domain-errors';
import { PackageId } from '../../value-objects/package-id';
import { PackageManifest } from '../../value-objects/package-manifest';
import { PackageSource } from '../../value-objects/package-source';

describe('Package', () => {
  let packageId: PackageId;
  let packageSource: PackageSource;
  let packageManifest: PackageManifest;
  let validationResult: ValidationResult;
  let sdkInterfaces: SDKInterface[];
  let lastUpdated: Date;

  beforeEach(() => {
    const idResult = PackageId.create('test-package');
    expect(idResult.isOk()).toBe(true);
    if (idResult.isOk()) {
      packageId = idResult.value;
    }

    const sourceResult = PackageSource.createFromGit({
      url: 'https://github.com/test/package.git',
      ref: 'main',
    });
    expect(sourceResult.isOk()).toBe(true);
    if (sourceResult.isOk()) {
      packageSource = sourceResult.value;
    }

    const manifestResult = PackageManifest.create({
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package',
      author: 'Test Author',
      lsp: {
        desktop: {
          command: ['node', 'server.js'],
          transport: 'stdio',
        },
      },
      capabilities: {
        proofCapabilities: ['proof/syntax-validation', 'proof/semantic-analysis'],
      },
    });
    expect(manifestResult.isOk()).toBe(true);
    if (manifestResult.isOk()) {
      packageManifest = manifestResult.value;
    }

    validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    sdkInterfaces = [
      {
        name: 'ProofEditor',
        version: '1.0.0',
        methods: ['validate', 'analyze'],
      },
    ];

    lastUpdated = new Date();
  });

  describe('create', () => {
    it('should create a valid package with minimal data', () => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.getId()).toBe(packageId);
        expect(package_.getSource()).toBe(packageSource);
        expect(package_.getManifest()).toBe(packageManifest);
        expect(package_.getSDKInterfaces()).toEqual([]);
        expect(package_.getValidationResult()).toBe(validationResult);
        expect(package_.isValid()).toBe(true);
        expect(package_.getLastUpdated()).toBeInstanceOf(Date);
      }
    });

    it('should create package with all optional data', () => {
      const data: Omit<PackageData, 'lastUpdated'> & { lastUpdated?: Date } = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces,
        validationResult,
        lastUpdated,
        cacheLocation: '/tmp/cache/test-package',
      };

      const result = Package.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.getSDKInterfaces()).toEqual(sdkInterfaces);
        expect(package_.getLastUpdated()).toBe(lastUpdated);
        expect(package_.getCacheLocation()).toBe('/tmp/cache/test-package');
      }
    });

    it('should use current date if lastUpdated not provided', () => {
      const beforeCreation = new Date();

      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const package_ = result.value;
        const afterCreation = new Date();

        expect(package_.getLastUpdated().getTime()).toBeGreaterThanOrEqual(
          beforeCreation.getTime()
        );
        expect(package_.getLastUpdated().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      }
    });

    it('should fail when package ID does not match manifest name', () => {
      const differentIdResult = PackageId.create('different-package');
      expect(differentIdResult.isOk()).toBe(true);

      if (differentIdResult.isOk()) {
        const differentId = differentIdResult.value;

        const data: Omit<PackageData, 'lastUpdated'> = {
          id: differentId,
          source: packageSource,
          manifest: packageManifest, // manifest has name 'test-package'
          sdkInterfaces: [],
          validationResult,
        };

        const result = Package.create(data);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package ID must match manifest name');
        }
      }
    });

    it('should fail when validation result is invalid but has no errors', () => {
      const invalidValidationResult: ValidationResult = {
        isValid: false,
        errors: [], // Empty errors array
        warnings: ['Some warning'],
      };

      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult: invalidValidationResult,
      };

      const result = Package.create(data);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe(
          'Invalid validation result: must have errors if not valid'
        );
      }
    });

    it('should fail when package has SDK interfaces but no LSP support', () => {
      // Create manifest without LSP support
      const manifestWithoutLSPResult = PackageManifest.create({
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package',
        author: 'Test Author',
        // No LSP configuration
      });
      expect(manifestWithoutLSPResult.isOk()).toBe(true);

      if (manifestWithoutLSPResult.isOk()) {
        const manifestWithoutLSP = manifestWithoutLSPResult.value;

        const data: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: packageSource,
          manifest: manifestWithoutLSP,
          sdkInterfaces, // Has SDK interfaces
          validationResult,
        };

        const result = Package.create(data);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package with SDK interfaces must have LSP support');
        }
      }
    });

    it('should allow SDK interfaces when package has LSP support', () => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest, // Has LSP support
        sdkInterfaces,
        validationResult,
      };

      const result = Package.create(data);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.getSDKInterfaces()).toEqual(sdkInterfaces);
        expect(package_.hasLSPSupport()).toBe(true);
      }
    });
  });

  describe('getter methods', () => {
    let package_: Package;

    beforeEach(() => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces,
        validationResult,
        cacheLocation: '/tmp/cache/test-package',
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        package_ = result.value;
      }
    });

    it('should return basic package information', () => {
      expect(package_.getId()).toBe(packageId);
      expect(package_.getSource()).toBe(packageSource);
      expect(package_.getManifest()).toBe(packageManifest);
      expect(package_.getSDKInterfaces()).toBe(sdkInterfaces);
      expect(package_.getValidationResult()).toBe(validationResult);
      expect(package_.getCacheLocation()).toBe('/tmp/cache/test-package');
    });

    it('should return manifest-derived information', () => {
      expect(package_.getName()).toBe('test-package');
      expect(package_.getVersion()).toBe('1.0.0');
      expect(package_.getDescription()).toBe('A test package');
      expect(package_.getAuthor()).toBe('Test Author');
    });

    it('should return validation state information', () => {
      expect(package_.isValid()).toBe(true);
      expect(package_.hasWarnings()).toBe(false);
    });

    it('should return capability information', () => {
      expect(package_.hasLSPSupport()).toBe(true);
      expect(package_.getProofCapabilities()).toEqual([
        'proof/syntax-validation',
        'proof/semantic-analysis',
      ]);
      expect(package_.isLanguagePackage()).toBe(true); // Has both LSP support and proof capabilities
    });
  });

  describe('validation state checking', () => {
    it('should detect invalid package with errors', () => {
      const invalidValidationResult: ValidationResult = {
        isValid: false,
        errors: ['Syntax error', 'Missing dependency'],
        warnings: ['Style warning'],
      };

      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult: invalidValidationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.isValid()).toBe(false);
        expect(package_.hasWarnings()).toBe(true);
      }
    });

    it('should detect package with warnings only', () => {
      const validationWithWarnings: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Performance warning', 'Style issue'],
      };

      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult: validationWithWarnings,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.isValid()).toBe(true);
        expect(package_.hasWarnings()).toBe(true);
      }
    });

    it('should detect package with no warnings', () => {
      const cleanValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult: cleanValidationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.isValid()).toBe(true);
        expect(package_.hasWarnings()).toBe(false);
      }
    });
  });

  describe('SDK interface management', () => {
    let package_: Package;

    beforeEach(() => {
      const multipleInterfaces: SDKInterface[] = [
        {
          name: 'ProofEditor',
          version: '1.0.0',
          methods: ['validate', 'analyze'],
        },
        {
          name: 'LanguageServer',
          version: '2.0.0',
          methods: ['textDocument/completion', 'textDocument/hover'],
        },
      ];

      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: multipleInterfaces,
        validationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        package_ = result.value;
      }
    });

    it('should check if package implements specific SDK interface', () => {
      expect(package_.implementsSDKInterface('ProofEditor')).toBe(true);
      expect(package_.implementsSDKInterface('LanguageServer')).toBe(true);
      expect(package_.implementsSDKInterface('NonExistent')).toBe(false);
    });

    it('should return all SDK interfaces', () => {
      const interfaces = package_.getSDKInterfaces();
      expect(interfaces).toHaveLength(2);
      expect(interfaces[0]!.name).toBe('ProofEditor');
      expect(interfaces[1]!.name).toBe('LanguageServer');
    });
  });

  describe('capability checking', () => {
    it('should check if package supports specific capability', () => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.supportsCapability('proof/syntax-validation')).toBe(true);
        expect(package_.supportsCapability('proof/semantic-analysis')).toBe(true);
        expect(package_.supportsCapability('proof/code-generation')).toBe(false);
      }
    });

    it('should detect language packages', () => {
      // Create manifest for language package (with LSP and proof capabilities)
      const languageManifestResult = PackageManifest.create({
        name: 'test-package',
        version: '1.0.0',
        description: 'A language package',
        author: 'Test Author',
        category: 'language',
        lsp: {
          desktop: {
            command: ['node', 'lang-server.js'],
            transport: 'stdio',
          },
        },
        capabilities: {
          proofCapabilities: ['proof/syntax-check', 'proof/semantic-check'],
        },
      });
      expect(languageManifestResult.isOk()).toBe(true);

      if (languageManifestResult.isOk()) {
        const languageManifest = languageManifestResult.value;

        const data: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: packageSource,
          manifest: languageManifest,
          sdkInterfaces: [],
          validationResult,
        };

        const result = Package.create(data);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const package_ = result.value;
          expect(package_.isLanguagePackage()).toBe(true);
        }
      }
    });

    it('should detect non-language packages', () => {
      // Create manifest without proof capabilities (but with LSP support)
      const nonLanguageManifestResult = PackageManifest.create({
        name: 'test-package',
        version: '1.0.0',
        description: 'A non-language package',
        author: 'Test Author',
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            transport: 'stdio',
          },
        },
        // No proof capabilities
      });
      expect(nonLanguageManifestResult.isOk()).toBe(true);

      if (nonLanguageManifestResult.isOk()) {
        const nonLanguageManifest = nonLanguageManifestResult.value;

        const data: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: packageSource,
          manifest: nonLanguageManifest,
          sdkInterfaces: [],
          validationResult,
        };

        const result = Package.create(data);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const package_ = result.value;
          expect(package_.isLanguagePackage()).toBe(false);
        }
      }
    });
  });

  describe('withUpdatedValidation', () => {
    let package_: Package;

    beforeEach(() => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        package_ = result.value;
      }
    });

    it('should update validation result and timestamp', () => {
      const oldLastUpdated = package_.getLastUpdated();

      // Wait a small amount to ensure timestamp difference
      setTimeout(() => {
        const newValidationResult: ValidationResult = {
          isValid: false,
          errors: ['New error'],
          warnings: ['New warning'],
        };

        const result = package_.withUpdatedValidation(newValidationResult);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const updatedPackage = result.value;
          expect(updatedPackage.getValidationResult()).toBe(newValidationResult);
          expect(updatedPackage.isValid()).toBe(false);
          expect(updatedPackage.hasWarnings()).toBe(true);
          expect(updatedPackage.getLastUpdated().getTime()).toBeGreaterThan(
            oldLastUpdated.getTime()
          );
        }
      }, 1);
    });

    it('should preserve other package data when updating validation', () => {
      const newValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const result = package_.withUpdatedValidation(newValidationResult);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedPackage = result.value;
        expect(updatedPackage.getId()).toBe(package_.getId());
        expect(updatedPackage.getSource()).toBe(package_.getSource());
        expect(updatedPackage.getManifest()).toBe(package_.getManifest());
        expect(updatedPackage.getSDKInterfaces()).toBe(package_.getSDKInterfaces());
      }
    });
  });

  describe('withCacheLocation', () => {
    let package_: Package;

    beforeEach(() => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        package_ = result.value;
      }
    });

    it('should set cache location and update timestamp', () => {
      const oldLastUpdated = package_.getLastUpdated();

      // Wait a small amount to ensure timestamp difference
      setTimeout(() => {
        const result = package_.withCacheLocation('/new/cache/location');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const updatedPackage = result.value;
          expect(updatedPackage.getCacheLocation()).toBe('/new/cache/location');
          expect(updatedPackage.getLastUpdated().getTime()).toBeGreaterThan(
            oldLastUpdated.getTime()
          );
        }
      }, 1);
    });

    it('should trim whitespace from cache location', () => {
      const result = package_.withCacheLocation('  /cache/with/spaces  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedPackage = result.value;
        expect(updatedPackage.getCacheLocation()).toBe('/cache/with/spaces');
      }
    });

    it('should fail with empty cache location', () => {
      const result = package_.withCacheLocation('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Cache location cannot be empty');
      }
    });

    it('should fail with whitespace-only cache location', () => {
      const result = package_.withCacheLocation('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBe('Cache location cannot be empty');
      }
    });

    it('should preserve other package data when updating cache location', () => {
      const result = package_.withCacheLocation('/new/cache/location');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const updatedPackage = result.value;
        expect(updatedPackage.getId()).toBe(package_.getId());
        expect(updatedPackage.getSource()).toBe(package_.getSource());
        expect(updatedPackage.getManifest()).toBe(package_.getManifest());
        expect(updatedPackage.getSDKInterfaces()).toBe(package_.getSDKInterfaces());
        expect(updatedPackage.getValidationResult()).toBe(package_.getValidationResult());
      }
    });
  });

  describe('equals', () => {
    it('should compare packages by ID, source, and manifest', () => {
      const data1: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const data2: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces, // Different SDK interfaces
        validationResult: {
          // Different validation result
          isValid: false,
          errors: ['Error'],
          warnings: [],
        },
        cacheLocation: '/different/cache', // Different cache location
      };

      const result1 = Package.create(data1);
      const result2 = Package.create(data2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const package1 = result1.value;
        const package2 = result2.value;

        // Should be equal despite different SDK interfaces, validation, and cache location
        expect(package1.equals(package2)).toBe(true);
        expect(package2.equals(package1)).toBe(true);
      }
    });

    it('should not be equal with different package IDs', () => {
      const otherIdResult = PackageId.create('other-package');
      expect(otherIdResult.isOk()).toBe(true);

      if (otherIdResult.isOk()) {
        const otherId = otherIdResult.value;

        // Create manifest with different name to match the different ID
        const otherManifestResult = PackageManifest.create({
          name: 'other-package',
          version: '1.0.0',
          description: 'Another package',
          author: 'Test Author',
        });
        expect(otherManifestResult.isOk()).toBe(true);

        if (otherManifestResult.isOk()) {
          const otherManifest = otherManifestResult.value;

          const data1: Omit<PackageData, 'lastUpdated'> = {
            id: packageId,
            source: packageSource,
            manifest: packageManifest,
            sdkInterfaces: [],
            validationResult,
          };

          const data2: Omit<PackageData, 'lastUpdated'> = {
            id: otherId,
            source: packageSource,
            manifest: otherManifest,
            sdkInterfaces: [],
            validationResult,
          };

          const result1 = Package.create(data1);
          const result2 = Package.create(data2);

          expect(result1.isOk()).toBe(true);
          expect(result2.isOk()).toBe(true);

          if (result1.isOk() && result2.isOk()) {
            const package1 = result1.value;
            const package2 = result2.value;

            expect(package1.equals(package2)).toBe(false);
          }
        }
      }
    });

    it('should not be equal with different sources', () => {
      const otherSourceResult = PackageSource.createFromLocal({
        path: '/local/path',
      });
      expect(otherSourceResult.isOk()).toBe(true);

      if (otherSourceResult.isOk()) {
        const otherSource = otherSourceResult.value;

        const data1: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: packageSource,
          manifest: packageManifest,
          sdkInterfaces: [],
          validationResult,
        };

        const data2: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: otherSource,
          manifest: packageManifest,
          sdkInterfaces: [],
          validationResult,
        };

        const result1 = Package.create(data1);
        const result2 = Package.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const package1 = result1.value;
          const package2 = result2.value;

          expect(package1.equals(package2)).toBe(false);
        }
      }
    });

    it('should not be equal with different manifests', () => {
      const otherManifestResult = PackageManifest.create({
        name: 'test-package',
        version: '2.0.0', // Different version
        description: 'A test package',
        author: 'Test Author',
      });
      expect(otherManifestResult.isOk()).toBe(true);

      if (otherManifestResult.isOk()) {
        const otherManifest = otherManifestResult.value;

        const data1: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: packageSource,
          manifest: packageManifest,
          sdkInterfaces: [],
          validationResult,
        };

        const data2: Omit<PackageData, 'lastUpdated'> = {
          id: packageId,
          source: packageSource,
          manifest: otherManifest,
          sdkInterfaces: [],
          validationResult,
        };

        const result1 = Package.create(data1);
        const result2 = Package.create(data2);

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          const package1 = result1.value;
          const package2 = result2.value;

          expect(package1.equals(package2)).toBe(false);
        }
      }
    });

    it('should be equal to itself', () => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        expect(package_.equals(package_)).toBe(true);
      }
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON format', () => {
      const data: Omit<PackageData, 'lastUpdated'> & { lastUpdated?: Date } = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces,
        validationResult,
        lastUpdated,
        cacheLocation: '/tmp/cache/test-package',
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        const json = package_.toJSON();

        expect(json).toEqual({
          id: 'test-package',
          source: expect.anything(), // PackageSource JSON object
          manifest: expect.anything(), // PackageManifest JSON object
          sdkInterfaces,
          validationResult,
          lastUpdated: lastUpdated.toISOString(),
          cacheLocation: '/tmp/cache/test-package',
        });
      }
    });

    it('should handle minimal package data in JSON', () => {
      const data: Omit<PackageData, 'lastUpdated'> = {
        id: packageId,
        source: packageSource,
        manifest: packageManifest,
        sdkInterfaces: [],
        validationResult,
      };

      const result = Package.create(data);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const package_ = result.value;
        const json = package_.toJSON();

        expect(json).toEqual({
          id: 'test-package',
          source: expect.anything(),
          manifest: expect.anything(),
          sdkInterfaces: [],
          validationResult,
          lastUpdated: expect.any(String), // ISO string
          cacheLocation: undefined,
        });
      }
    });
  });
});
