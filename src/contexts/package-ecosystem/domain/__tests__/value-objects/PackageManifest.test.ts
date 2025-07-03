/**
 * Tests for PackageManifest value object
 *
 * Focuses on:
 * - Manifest creation and validation
 * - Package metadata handling (name, version, description, author)
 * - LSP configuration validation (desktop/mobile)
 * - Capabilities and validation categories
 * - Dependency parsing and validation
 * - URL validation and structure validation
 * - Error conditions and edge cases
 * - Language package detection
 * - High coverage for all validation rules
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { PackageManifestData } from '../../types/common-types';
import { PackageValidationError } from '../../types/domain-errors';
import { PackageManifest } from '../../value-objects/package-manifest';

describe('PackageManifest', () => {
  let baseManifestData: PackageManifestData;

  beforeEach(() => {
    baseManifestData = {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package for proof editor',
      author: 'Test Author',
    };
  });

  describe('create', () => {
    it('should create manifest with minimal required data', () => {
      const result = PackageManifest.create(baseManifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        expect(manifest.getName()).toBe('test-package');
        expect(manifest.getVersion()).toBe('1.0.0');
        expect(manifest.getDescription()).toBe('A test package for proof editor');
        expect(manifest.getAuthor()).toBe('Test Author');
        expect(manifest.hasLSPSupport()).toBe(false);
        expect(manifest.isLanguagePackage()).toBe(false);
        expect(manifest.getDependencies().size).toBe(0);
      }
    });

    it('should create manifest with all optional fields', () => {
      const fullManifestData: PackageManifestData = {
        ...baseManifestData,
        homepage: 'https://example.com',
        license: 'MIT',
        dependencies: {
          'dependency-a': '^1.0.0',
          'dependency-b': '~2.0.0',
        },
        requirements: {
          proofEditor: '>=1.0.0',
          node: '>=18.0.0',
        },
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            args: ['--stdio'],
            transport: 'stdio',
          },
          mobile: {
            transport: 'websocket',
            service: 'wss://api.example.com/lsp',
          },
          binaries: {
            linux: 'bin/server-linux',
            darwin: 'bin/server-macos',
            win32: 'bin/server-win.exe',
          },
        },
        capabilities: {
          textDocument: {
            completion: true,
            hover: true,
            signatureHelp: true,
          },
          proofCapabilities: ['proof/syntax-validation', 'proof/semantic-analysis'],
        },
        validation: {
          categories: [
            {
              id: 'syntax',
              name: 'Syntax Validation',
              rules: ['no-syntax-errors', 'valid-identifiers'],
            },
          ],
          customValidators: ['custom-rule-1', 'custom-rule-2'],
        },
        keywords: ['proof', 'logic', 'validation'],
        category: 'language',
        tags: ['formal-methods', 'verification'],
      };

      const result = PackageManifest.create(fullManifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        expect(manifest.getHomepage()).toBe('https://example.com');
        expect(manifest.getLicense()).toBe('MIT');
        expect(manifest.hasLSPSupport()).toBe(true);
        expect(manifest.isLanguagePackage()).toBe(true);
        expect(manifest.getRequiredProofEditorVersion()).toBe('>=1.0.0');
        expect(manifest.getRequiredNodeVersion()).toBe('>=18.0.0');
        expect(manifest.getKeywords()).toEqual(['proof', 'logic', 'validation']);
        expect(manifest.getCategory()).toBe('language');
        expect(manifest.getTags()).toEqual(['formal-methods', 'verification']);
      }
    });

    it('should parse dependencies correctly', () => {
      const manifestData: PackageManifestData = {
        ...baseManifestData,
        dependencies: {
          'package-a': '^1.0.0',
          'package-b': '~2.0.0',
          'package-c': '>=3.0.0',
        },
      };

      const result = PackageManifest.create(manifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        const dependencies = manifest.getDependencies();

        expect(dependencies.size).toBe(3);
        expect(dependencies.has('package-a')).toBe(true);
        expect(dependencies.has('package-b')).toBe(true);
        expect(dependencies.has('package-c')).toBe(true);

        expect(dependencies.get('package-a')?.getConstraintString()).toBe('^1.0.0');
        expect(dependencies.get('package-b')?.getConstraintString()).toBe('~2.0.0');
        expect(dependencies.get('package-c')?.getConstraintString()).toBe('>=3.0.0');
      }
    });

    it('should trim whitespace from required fields', () => {
      const manifestData: PackageManifestData = {
        name: '  test-package  ',
        version: '  1.0.0  ',
        description: '  A test package  ',
        author: '  Test Author  ',
      };

      const result = PackageManifest.create(manifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        expect(manifest.getName()).toBe('test-package');
        expect(manifest.getVersion()).toBe('1.0.0');
        expect(manifest.getDescription()).toBe('A test package');
        expect(manifest.getAuthor()).toBe('Test Author');
      }
    });

    describe('validation failures', () => {
      it('should fail with invalid package name', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          name: 'Invalid-Package-Name',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Invalid package name');
        }
      });

      it('should fail with empty version', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          version: '',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package version cannot be empty');
        }
      });

      it('should fail with whitespace-only version', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          version: '   ',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package version cannot be empty');
        }
      });

      it('should fail with invalid version format', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          version: 'invalid-version',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Invalid package version');
        }
      });

      it('should fail with empty description', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          description: '',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package description cannot be empty');
        }
      });

      it('should fail with whitespace-only description', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          description: '   ',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package description cannot be empty');
        }
      });

      it('should fail with empty author', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          author: '',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package author cannot be empty');
        }
      });

      it('should fail with whitespace-only author', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          author: '   ',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Package author cannot be empty');
        }
      });

      it('should fail with invalid dependency version', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          dependencies: {
            'valid-package': '^1.0.0',
            'invalid-dep': 'not-a-version',
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Invalid dependency version for invalid-dep');
        }
      });
    });

    describe('URL validation', () => {
      it('should accept valid homepage URL', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          homepage: 'https://example.com',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          expect(manifest.getHomepage()).toBe('https://example.com');
        }
      });

      it('should fail with invalid homepage URL', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          homepage: 'not-a-valid-url',
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Invalid homepage URL');
        }
      });

      it('should accept http and https URLs', () => {
        const validUrls = [
          'http://example.com',
          'https://example.com',
          'https://example.com/path',
          'https://subdomain.example.com',
          'https://example.com:8080',
        ];

        for (const url of validUrls) {
          const manifestData: PackageManifestData = {
            ...baseManifestData,
            homepage: url,
          };

          const result = PackageManifest.create(manifestData);
          expect(result.isOk()).toBe(true);
        }
      });
    });

    describe('LSP configuration validation', () => {
      it('should validate desktop LSP configuration', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            desktop: {
              command: ['node', 'server.js'],
              transport: 'stdio',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          expect(manifest.hasLSPSupport()).toBe(true);
          const desktopConfig = manifest.getLSPDesktopConfiguration();
          expect(desktopConfig?.command).toEqual(['node', 'server.js']);
          expect(desktopConfig?.transport).toBe('stdio');
        }
      });

      it('should fail with empty desktop command', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            desktop: {
              command: [],
              transport: 'stdio',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('LSP desktop command cannot be empty');
        }
      });

      it('should fail with invalid desktop transport', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            desktop: {
              command: ['node', 'server.js'],
              transport: 'invalid' as any,
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('LSP desktop transport must be stdio or websocket');
        }
      });

      it('should validate mobile LSP websocket configuration', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            mobile: {
              transport: 'websocket',
              service: 'wss://api.example.com/lsp',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          expect(manifest.hasLSPSupport()).toBe(true);
          const mobileConfig = manifest.getLSPMobileConfiguration();
          expect(mobileConfig?.transport).toBe('websocket');
          expect(mobileConfig?.service).toBe('wss://api.example.com/lsp');
        }
      });

      it('should validate mobile LSP http configuration', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            mobile: {
              transport: 'http',
              endpoint: 'https://api.example.com/lsp',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          const mobileConfig = manifest.getLSPMobileConfiguration();
          expect(mobileConfig?.transport).toBe('http');
          expect(mobileConfig?.endpoint).toBe('https://api.example.com/lsp');
        }
      });

      it('should fail with invalid mobile transport', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            mobile: {
              transport: 'invalid' as any,
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('LSP mobile transport must be websocket or http');
        }
      });

      it('should fail mobile websocket without service URL', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            mobile: {
              transport: 'websocket',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('LSP mobile websocket transport requires service URL');
        }
      });

      it('should fail mobile http without endpoint URL', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            mobile: {
              transport: 'http',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('LSP mobile http transport requires endpoint URL');
        }
      });

      it('should handle LSP binaries configuration', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          lsp: {
            binaries: {
              linux: 'bin/server-linux',
              darwin: 'bin/server-macos',
              win32: 'bin/server-win.exe',
            },
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          const binaries = manifest.getLSPBinaries();
          expect(binaries).toEqual({
            linux: 'bin/server-linux',
            darwin: 'bin/server-macos',
            win32: 'bin/server-win.exe',
          });
        }
      });
    });

    describe('capabilities validation', () => {
      it('should handle proof capabilities', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          capabilities: {
            proofCapabilities: ['proof/syntax-validation', 'proof/semantic-analysis'],
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          expect(manifest.getProofCapabilities()).toEqual([
            'proof/syntax-validation',
            'proof/semantic-analysis',
          ]);
        }
      });

      it('should fail with invalid proof capability format', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          capabilities: {
            proofCapabilities: ['syntax-validation', 'proof/semantic-analysis'],
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain(
            "Invalid proof capability: syntax-validation. Must start with 'proof/'"
          );
        }
      });
    });

    describe('validation categories', () => {
      it('should handle validation categories', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          validation: {
            categories: [
              {
                id: 'syntax',
                name: 'Syntax Validation',
                rules: ['no-syntax-errors', 'valid-identifiers'],
              },
              {
                id: 'semantic',
                name: 'Semantic Validation',
                rules: ['type-checking', 'scope-validation'],
              },
            ],
            customValidators: ['custom-rule-1'],
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const manifest = result.value;
          const categories = manifest.getValidationCategories();
          expect(categories).toHaveLength(2);
          expect(categories?.[0].id).toBe('syntax');
          expect(categories?.[0].name).toBe('Syntax Validation');
          expect(categories?.[0].rules).toEqual(['no-syntax-errors', 'valid-identifiers']);

          expect(manifest.getCustomValidators()).toEqual(['custom-rule-1']);
        }
      });

      it('should fail with incomplete validation category', () => {
        const manifestData: PackageManifestData = {
          ...baseManifestData,
          validation: {
            categories: [
              {
                id: 'syntax',
                name: 'Syntax Validation',
                rules: [],
              } as any,
            ],
          },
        };

        const result = PackageManifest.create(manifestData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toBe('Validation category must have id, name, and rules');
        }
      });
    });
  });

  describe('language package detection', () => {
    it('should detect language package with LSP and proof capabilities', () => {
      const manifestData: PackageManifestData = {
        ...baseManifestData,
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            transport: 'stdio',
          },
        },
        capabilities: {
          proofCapabilities: ['proof/syntax-validation'],
        },
      };

      const result = PackageManifest.create(manifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        expect(manifest.isLanguagePackage()).toBe(true);
        expect(manifest.hasLSPSupport()).toBe(true);
        expect(manifest.getProofCapabilities()).toEqual(['proof/syntax-validation']);
      }
    });

    it('should not detect language package without LSP support', () => {
      const manifestData: PackageManifestData = {
        ...baseManifestData,
        capabilities: {
          proofCapabilities: ['proof/syntax-validation'],
        },
      };

      const result = PackageManifest.create(manifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        expect(manifest.isLanguagePackage()).toBe(false);
        expect(manifest.hasLSPSupport()).toBe(false);
      }
    });

    it('should not detect language package without proof capabilities', () => {
      const manifestData: PackageManifestData = {
        ...baseManifestData,
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            transport: 'stdio',
          },
        },
      };

      const result = PackageManifest.create(manifestData);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const manifest = result.value;
        expect(manifest.isLanguagePackage()).toBe(false);
        expect(manifest.hasLSPSupport()).toBe(true);
        expect(manifest.getProofCapabilities()).toEqual([]);
      }
    });
  });

  describe('equals', () => {
    it('should be equal with same package ID and version', () => {
      const manifest1Result = PackageManifest.create(baseManifestData);
      const manifest2Result = PackageManifest.create(baseManifestData);

      expect(manifest1Result.isOk()).toBe(true);
      expect(manifest2Result.isOk()).toBe(true);

      if (manifest1Result.isOk() && manifest2Result.isOk()) {
        expect(manifest1Result.value.equals(manifest2Result.value)).toBe(true);
      }
    });

    it('should not be equal with different versions', () => {
      const manifest1Data = { ...baseManifestData, version: '1.0.0' };
      const manifest2Data = { ...baseManifestData, version: '2.0.0' };

      const manifest1Result = PackageManifest.create(manifest1Data);
      const manifest2Result = PackageManifest.create(manifest2Data);

      expect(manifest1Result.isOk()).toBe(true);
      expect(manifest2Result.isOk()).toBe(true);

      if (manifest1Result.isOk() && manifest2Result.isOk()) {
        expect(manifest1Result.value.equals(manifest2Result.value)).toBe(false);
      }
    });

    it('should not be equal with different package names', () => {
      const manifest1Data = { ...baseManifestData, name: 'package-a' };
      const manifest2Data = { ...baseManifestData, name: 'package-b' };

      const manifest1Result = PackageManifest.create(manifest1Data);
      const manifest2Result = PackageManifest.create(manifest2Data);

      expect(manifest1Result.isOk()).toBe(true);
      expect(manifest2Result.isOk()).toBe(true);

      if (manifest1Result.isOk() && manifest2Result.isOk()) {
        expect(manifest1Result.value.equals(manifest2Result.value)).toBe(false);
      }
    });

    it('should be equal to itself', () => {
      const manifestResult = PackageManifest.create(baseManifestData);

      expect(manifestResult.isOk()).toBe(true);
      if (manifestResult.isOk()) {
        const manifest = manifestResult.value;
        expect(manifest.equals(manifest)).toBe(true);
      }
    });
  });

  describe('toJSON', () => {
    it('should serialize to original data format', () => {
      const manifestResult = PackageManifest.create(baseManifestData);

      expect(manifestResult.isOk()).toBe(true);
      if (manifestResult.isOk()) {
        const manifest = manifestResult.value;
        const json = manifest.toJSON();

        expect(json).toEqual(baseManifestData);
      }
    });

    it('should serialize complex manifest correctly', () => {
      const complexManifestData: PackageManifestData = {
        ...baseManifestData,
        homepage: 'https://example.com',
        license: 'MIT',
        dependencies: {
          'dep-a': '^1.0.0',
        },
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            transport: 'stdio',
          },
        },
        capabilities: {
          proofCapabilities: ['proof/validation'],
        },
        keywords: ['proof', 'logic'],
      };

      const manifestResult = PackageManifest.create(complexManifestData);

      expect(manifestResult.isOk()).toBe(true);
      if (manifestResult.isOk()) {
        const manifest = manifestResult.value;
        const json = manifest.toJSON();

        expect(json).toEqual(complexManifestData);
      }
    });
  });

  describe('getter methods comprehensive coverage', () => {
    let manifest: PackageManifest;

    beforeEach(() => {
      const fullManifestData: PackageManifestData = {
        ...baseManifestData,
        homepage: 'https://example.com',
        license: 'MIT',
        dependencies: {
          'test-dep': '^1.0.0',
        },
        requirements: {
          proofEditor: '>=1.0.0',
          node: '>=18.0.0',
        },
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            transport: 'stdio',
          },
          mobile: {
            transport: 'websocket',
            service: 'wss://example.com',
          },
          binaries: {
            linux: 'bin/linux',
          },
        },
        capabilities: {
          proofCapabilities: ['proof/test'],
        },
        validation: {
          categories: [
            {
              id: 'test',
              name: 'Test Category',
              rules: ['rule1'],
            },
          ],
          customValidators: ['validator1'],
        },
        keywords: ['test'],
        category: 'utility',
        tags: ['testing'],
      };

      const result = PackageManifest.create(fullManifestData);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        manifest = result.value;
      }
    });

    it('should return all values through getters', () => {
      expect(manifest.getName()).toBe('test-package');
      expect(manifest.getPackageId().toString()).toBe('test-package');
      expect(manifest.getVersion()).toBe('1.0.0');
      expect(manifest.getDescription()).toBe('A test package for proof editor');
      expect(manifest.getAuthor()).toBe('Test Author');
      expect(manifest.getHomepage()).toBe('https://example.com');
      expect(manifest.getLicense()).toBe('MIT');
      expect(manifest.getRequiredProofEditorVersion()).toBe('>=1.0.0');
      expect(manifest.getRequiredNodeVersion()).toBe('>=18.0.0');
      expect(manifest.hasLSPSupport()).toBe(true);
      expect(manifest.getLSPDesktopConfiguration()?.command).toEqual(['node', 'server.js']);
      expect(manifest.getLSPMobileConfiguration()?.transport).toBe('websocket');
      expect(manifest.getLSPBinaries()?.linux).toBe('bin/linux');
      expect(manifest.getProofCapabilities()).toEqual(['proof/test']);
      expect(manifest.getValidationCategories()?.[0].id).toBe('test');
      expect(manifest.getCustomValidators()).toEqual(['validator1']);
      expect(manifest.getKeywords()).toEqual(['test']);
      expect(manifest.getCategory()).toBe('utility');
      expect(manifest.getTags()).toEqual(['testing']);
      expect(manifest.isLanguagePackage()).toBe(true);
    });

    it('should handle undefined optional fields', () => {
      const minimalResult = PackageManifest.create(baseManifestData);
      expect(minimalResult.isOk()).toBe(true);

      if (minimalResult.isOk()) {
        const minimalManifest = minimalResult.value;
        expect(minimalManifest.getHomepage()).toBeUndefined();
        expect(minimalManifest.getLicense()).toBeUndefined();
        expect(minimalManifest.getRequiredProofEditorVersion()).toBeUndefined();
        expect(minimalManifest.getRequiredNodeVersion()).toBeUndefined();
        expect(minimalManifest.getLSPDesktopConfiguration()).toBeUndefined();
        expect(minimalManifest.getLSPMobileConfiguration()).toBeUndefined();
        expect(minimalManifest.getLSPBinaries()).toBeUndefined();
        expect(minimalManifest.getValidationCategories()).toBeUndefined();
        expect(minimalManifest.getCategory()).toBeUndefined();
        expect(minimalManifest.getProofCapabilities()).toEqual([]);
        expect(minimalManifest.getCustomValidators()).toEqual([]);
        expect(minimalManifest.getKeywords()).toEqual([]);
        expect(minimalManifest.getTags()).toEqual([]);
      }
    });
  });
});
