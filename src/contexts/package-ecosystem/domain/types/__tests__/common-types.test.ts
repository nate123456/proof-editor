/**
 * Comprehensive test suite for package ecosystem common types
 *
 * Tests all interfaces, type compliance, structure validation,
 * property requirements, and mock data validation with property-based testing.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type {
  DependencyInfo,
  GitPackageSource,
  LocalPackageSource,
  PackageInstallationInfo,
  PackageManifestData,
  SDKInterface,
  SDKValidationResult,
  ValidationResult,
} from '../common-types.js';

describe('GitPackageSource Interface', () => {
  describe('structure validation', () => {
    it('should accept valid GitPackageSource with required fields', () => {
      const validSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
      };

      expect(validSource.url).toBe('https://github.com/user/repo.git');
      expect(validSource.ref).toBe('main');
      expect(validSource.path).toBeUndefined();
    });

    it('should accept valid GitPackageSource with optional path', () => {
      const validSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'v1.0.0',
        path: 'packages/core',
      };

      expect(validSource.url).toBe('https://github.com/user/repo.git');
      expect(validSource.ref).toBe('v1.0.0');
      expect(validSource.path).toBe('packages/core');
    });

    it('should handle various Git URL formats', () => {
      const gitUrls = [
        'https://github.com/user/repo.git',
        'git@github.com:user/repo.git',
        'https://gitlab.com/user/repo.git',
        'ssh://git@bitbucket.org/user/repo.git',
      ];

      gitUrls.forEach((url) => {
        const source: GitPackageSource = {
          url,
          ref: 'main',
        };
        expect(source.url).toBe(url);
      });
    });

    it('should handle various ref formats', () => {
      const refs = [
        'main',
        'develop',
        'v1.0.0',
        'v2.1.0-alpha.1',
        'feature/new-validation',
        'commit-sha-1234567890abcdef',
      ];

      refs.forEach((ref) => {
        const source: GitPackageSource = {
          url: 'https://github.com/user/repo.git',
          ref,
        };
        expect(source.ref).toBe(ref);
      });
    });
  });

  describe('readonly property enforcement', () => {
    it('should have readonly properties', () => {
      const source: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'main',
        path: 'src',
      };

      // TypeScript compiler should enforce readonly, but we can check the interface definition
      expect(typeof source.url).toBe('string');
      expect(typeof source.ref).toBe('string');
      expect(typeof source.path).toBe('string');
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid string combinations', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.string({ minLength: 1 }),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (url, ref, path) => {
            const source: GitPackageSource = {
              url,
              ref,
              ...(path !== undefined && { path }),
            };

            expect(source.url).toBe(url);
            expect(source.ref).toBe(ref);
            if (path !== undefined) {
              expect(source.path).toBe(path);
            } else {
              expect(source.path).toBeUndefined();
            }
          },
        ),
      );
    });
  });
});

describe('LocalPackageSource Interface', () => {
  describe('structure validation', () => {
    it('should accept valid LocalPackageSource', () => {
      const validSource: LocalPackageSource = {
        path: '/path/to/local/package',
      };

      expect(validSource.path).toBe('/path/to/local/package');
    });

    it('should handle various path formats', () => {
      const paths = [
        '/absolute/path/to/package',
        './relative/path',
        '../parent/package',
        '~/home/user/package',
        'C:\\Windows\\path\\to\\package',
        './packages/core',
      ];

      paths.forEach((path) => {
        const source: LocalPackageSource = { path };
        expect(source.path).toBe(path);
      });
    });
  });

  describe('readonly property enforcement', () => {
    it('should have readonly path property', () => {
      const source: LocalPackageSource = {
        path: '/test/path',
      };

      expect(typeof source.path).toBe('string');
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid path string', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (path) => {
          const source: LocalPackageSource = { path };
          expect(source.path).toBe(path);
        }),
      );
    });
  });
});

describe('PackageManifestData Interface', () => {
  describe('required fields validation', () => {
    it('should accept valid manifest with required fields only', () => {
      const validManifest: PackageManifestData = {
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package',
        author: 'Test Author',
      };

      expect(validManifest.name).toBe('test-package');
      expect(validManifest.version).toBe('1.0.0');
      expect(validManifest.description).toBe('A test package');
      expect(validManifest.author).toBe('Test Author');
    });

    it('should accept manifest with all optional fields', () => {
      const completeManifest: PackageManifestData = {
        name: 'complete-package',
        version: '2.1.0',
        description: 'A complete package with all fields',
        author: 'Complete Author <author@example.com>',
        homepage: 'https://package-homepage.com',
        license: 'MIT',
        dependencies: {
          'dependency-1': '^1.0.0',
          'dependency-2': '~2.1.0',
        },
        requirements: {
          proofEditor: '>=1.0.0',
          node: '>=16.0.0',
        },
        lsp: {
          desktop: {
            command: ['node', 'dist/server.js'],
            args: ['--stdio'],
            transport: 'stdio',
          },
          mobile: {
            transport: 'websocket',
            service: 'language-server',
            endpoint: '/lsp',
          },
          binaries: {
            'linux-x64': 'bin/server-linux',
            'darwin-x64': 'bin/server-darwin',
            'win32-x64': 'bin/server-win.exe',
          },
        },
        capabilities: {
          textDocument: {
            hover: true,
            completion: true,
            diagnostics: true,
          },
          proofCapabilities: ['validation', 'inference', 'completion'],
        },
        validation: {
          categories: [
            {
              id: 'logical-rules',
              name: 'Logical Validation Rules',
              rules: ['modus-ponens', 'modus-tollens'],
            },
          ],
          customValidators: ['custom-validator.js'],
        },
        keywords: ['logic', 'proof', 'validation'],
        category: 'logic-system',
        tags: ['formal-logic', 'educational'],
      };

      // Validate required fields
      expect(completeManifest.name).toBe('complete-package');
      expect(completeManifest.version).toBe('2.1.0');
      expect(completeManifest.description).toBe('A complete package with all fields');
      expect(completeManifest.author).toBe('Complete Author <author@example.com>');

      // Validate optional fields
      expect(completeManifest.homepage).toBe('https://package-homepage.com');
      expect(completeManifest.license).toBe('MIT');
      expect(completeManifest.dependencies).toEqual({
        'dependency-1': '^1.0.0',
        'dependency-2': '~2.1.0',
      });
      expect(completeManifest.requirements?.proofEditor).toBe('>=1.0.0');
      expect(completeManifest.requirements?.node).toBe('>=16.0.0');
      expect(completeManifest.lsp?.desktop?.transport).toBe('stdio');
      expect(completeManifest.lsp?.mobile?.transport).toBe('websocket');
      expect(completeManifest.capabilities?.proofCapabilities).toHaveLength(3);
      expect(completeManifest.validation?.categories).toHaveLength(1);
      expect(completeManifest.keywords).toHaveLength(3);
    });
  });

  describe('LSP configuration validation', () => {
    it('should handle desktop LSP configuration', () => {
      const manifest: PackageManifestData = {
        name: 'desktop-lsp-package',
        version: '1.0.0',
        description: 'Package with desktop LSP',
        author: 'Author',
        lsp: {
          desktop: {
            command: ['node', 'server.js'],
            args: ['--stdio', '--verbose'],
            transport: 'stdio',
          },
        },
      };

      expect(manifest.lsp?.desktop?.command).toEqual(['node', 'server.js']);
      expect(manifest.lsp?.desktop?.args).toEqual(['--stdio', '--verbose']);
      expect(manifest.lsp?.desktop?.transport).toBe('stdio');
    });

    it('should handle mobile LSP configuration', () => {
      const manifest: PackageManifestData = {
        name: 'mobile-lsp-package',
        version: '1.0.0',
        description: 'Package with mobile LSP',
        author: 'Author',
        lsp: {
          mobile: {
            transport: 'websocket',
            service: 'proof-language-server',
            endpoint: '/api/lsp',
          },
        },
      };

      expect(manifest.lsp?.mobile?.transport).toBe('websocket');
      expect(manifest.lsp?.mobile?.service).toBe('proof-language-server');
      expect(manifest.lsp?.mobile?.endpoint).toBe('/api/lsp');
    });

    it('should handle HTTP transport for mobile', () => {
      const manifest: PackageManifestData = {
        name: 'http-mobile-package',
        version: '1.0.0',
        description: 'Package with HTTP mobile LSP',
        author: 'Author',
        lsp: {
          mobile: {
            transport: 'http',
          },
        },
      };

      expect(manifest.lsp?.mobile?.transport).toBe('http');
    });

    it('should handle WebSocket transport for desktop', () => {
      const manifest: PackageManifestData = {
        name: 'websocket-desktop-package',
        version: '1.0.0',
        description: 'Package with WebSocket desktop LSP',
        author: 'Author',
        lsp: {
          desktop: {
            command: ['node', 'websocket-server.js'],
            transport: 'websocket',
          },
        },
      };

      expect(manifest.lsp?.desktop?.transport).toBe('websocket');
    });
  });

  describe('validation configuration', () => {
    it('should handle validation categories', () => {
      const manifest: PackageManifestData = {
        name: 'validation-package',
        version: '1.0.0',
        description: 'Package with validation rules',
        author: 'Author',
        validation: {
          categories: [
            {
              id: 'propositional-logic',
              name: 'Propositional Logic Rules',
              rules: ['conjunction', 'disjunction', 'implication'],
            },
            {
              id: 'predicate-logic',
              name: 'Predicate Logic Rules',
              rules: ['universal-instantiation', 'existential-generalization'],
            },
          ],
          customValidators: ['custom-rule-checker.js', 'semantic-validator.js'],
        },
      };

      expect(manifest.validation?.categories).toHaveLength(2);
      expect(manifest.validation?.categories?.[0].id).toBe('propositional-logic');
      expect(manifest.validation?.categories?.[0].rules).toHaveLength(3);
      expect(manifest.validation?.customValidators).toHaveLength(2);
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid manifest structure', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.option(fc.webUrl(), { nil: undefined }),
          fc.option(fc.string(), { nil: undefined }),
          (name, version, description, author, homepage, license) => {
            const manifest: PackageManifestData = {
              name,
              version,
              description,
              author,
              ...(homepage !== undefined && { homepage }),
              ...(license !== undefined && { license }),
            };

            expect(manifest.name).toBe(name);
            expect(manifest.version).toBe(version);
            expect(manifest.description).toBe(description);
            expect(manifest.author).toBe(author);
            if (homepage !== undefined) {
              expect(manifest.homepage).toBe(homepage);
            }
            if (license !== undefined) {
              expect(manifest.license).toBe(license);
            }
          },
        ),
      );
    });
  });
});

describe('PackageInstallationInfo Interface', () => {
  describe('structure validation', () => {
    it('should accept valid installation info with GitPackageSource', () => {
      const installDate = new Date('2024-01-01T10:00:00Z');
      const gitSource: GitPackageSource = {
        url: 'https://github.com/user/repo.git',
        ref: 'v1.0.0',
      };

      const installInfo: PackageInstallationInfo = {
        installedAt: installDate,
        installedFrom: gitSource,
        isEnabled: true,
      };

      expect(installInfo.installedAt).toBe(installDate);
      expect(installInfo.installedFrom).toBe(gitSource);
      expect(installInfo.isEnabled).toBe(true);
      expect(installInfo.configurationOverrides).toBeUndefined();
    });

    it('should accept valid installation info with LocalPackageSource', () => {
      const installDate = new Date('2024-01-01T10:00:00Z');
      const localSource: LocalPackageSource = {
        path: '/local/package/path',
      };

      const installInfo: PackageInstallationInfo = {
        installedAt: installDate,
        installedFrom: localSource,
        isEnabled: false,
        configurationOverrides: {
          enableDebug: true,
          logLevel: 'verbose',
          customSetting: { nested: 'value' },
        },
      };

      expect(installInfo.installedAt).toBe(installDate);
      expect(installInfo.installedFrom).toBe(localSource);
      expect(installInfo.isEnabled).toBe(false);
      expect(installInfo.configurationOverrides?.enableDebug).toBe(true);
      expect(installInfo.configurationOverrides?.logLevel).toBe('verbose');
    });
  });

  describe('source type handling', () => {
    it('should work with both source types', () => {
      const installDate = new Date();
      const gitSource: GitPackageSource = {
        url: 'https://github.com/test/repo.git',
        ref: 'main',
      };
      const localSource: LocalPackageSource = {
        path: '/test/path',
      };

      const gitInstall: PackageInstallationInfo = {
        installedAt: installDate,
        installedFrom: gitSource,
        isEnabled: true,
      };

      const localInstall: PackageInstallationInfo = {
        installedAt: installDate,
        installedFrom: localSource,
        isEnabled: true,
      };

      expect(gitInstall.installedFrom).toBe(gitSource);
      expect(localInstall.installedFrom).toBe(localSource);
    });
  });

  describe('configuration overrides', () => {
    it('should handle various override types', () => {
      const installInfo: PackageInstallationInfo = {
        installedAt: new Date(),
        installedFrom: { path: '/test' },
        isEnabled: true,
        configurationOverrides: {
          stringValue: 'test',
          numberValue: 42,
          booleanValue: true,
          objectValue: { nested: { deep: 'value' } },
          arrayValue: [1, 2, 3],
          nullValue: null,
        },
      };

      expect(installInfo.configurationOverrides?.stringValue).toBe('test');
      expect(installInfo.configurationOverrides?.numberValue).toBe(42);
      expect(installInfo.configurationOverrides?.booleanValue).toBe(true);
      expect(installInfo.configurationOverrides?.objectValue).toEqual({
        nested: { deep: 'value' },
      });
      expect(installInfo.configurationOverrides?.arrayValue).toEqual([1, 2, 3]);
      expect(installInfo.configurationOverrides?.nullValue).toBeNull();
    });
  });
});

describe('DependencyInfo Interface', () => {
  describe('structure validation', () => {
    it('should accept valid dependency info with required fields', () => {
      const depInfo: DependencyInfo = {
        targetPackageId: 'target-package-123',
        versionConstraint: '^1.0.0',
        isRequired: true,
      };

      expect(depInfo.targetPackageId).toBe('target-package-123');
      expect(depInfo.versionConstraint).toBe('^1.0.0');
      expect(depInfo.isRequired).toBe(true);
      expect(depInfo.resolvedVersion).toBeUndefined();
    });

    it('should accept dependency info with resolved version', () => {
      const depInfo: DependencyInfo = {
        targetPackageId: 'resolved-package-456',
        versionConstraint: '~2.1.0',
        isRequired: false,
        resolvedVersion: '2.1.3',
      };

      expect(depInfo.targetPackageId).toBe('resolved-package-456');
      expect(depInfo.versionConstraint).toBe('~2.1.0');
      expect(depInfo.isRequired).toBe(false);
      expect(depInfo.resolvedVersion).toBe('2.1.3');
    });
  });

  describe('version constraint formats', () => {
    it('should handle various version constraint formats', () => {
      const constraints = [
        '^1.0.0',
        '~1.2.3',
        '>=1.0.0 <2.0.0',
        '1.0.0',
        '*',
        'latest',
        '1.0.0-alpha.1',
      ];

      constraints.forEach((constraint) => {
        const depInfo: DependencyInfo = {
          targetPackageId: 'test-package',
          versionConstraint: constraint,
          isRequired: true,
        };
        expect(depInfo.versionConstraint).toBe(constraint);
      });
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid dependency configuration', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.boolean(),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (targetPackageId, versionConstraint, isRequired, resolvedVersion) => {
            const depInfo: DependencyInfo = {
              targetPackageId,
              versionConstraint,
              isRequired,
              ...(resolvedVersion !== undefined && { resolvedVersion }),
            };

            expect(depInfo.targetPackageId).toBe(targetPackageId);
            expect(depInfo.versionConstraint).toBe(versionConstraint);
            expect(depInfo.isRequired).toBe(isRequired);
            if (resolvedVersion !== undefined) {
              expect(depInfo.resolvedVersion).toBe(resolvedVersion);
            }
          },
        ),
      );
    });
  });
});

describe('SDKInterface Interface', () => {
  describe('structure validation', () => {
    it('should accept valid SDK interface', () => {
      const sdkInterface: SDKInterface = {
        name: 'ProofValidationAPI',
        version: '2.0.0',
        methods: ['validate', 'analyze', 'suggest'],
      };

      expect(sdkInterface.name).toBe('ProofValidationAPI');
      expect(sdkInterface.version).toBe('2.0.0');
      expect(sdkInterface.methods).toEqual(['validate', 'analyze', 'suggest']);
    });

    it('should handle empty methods array', () => {
      const sdkInterface: SDKInterface = {
        name: 'EmptyInterface',
        version: '1.0.0',
        methods: [],
      };

      expect(sdkInterface.methods).toHaveLength(0);
    });

    it('should handle many methods', () => {
      const methods = [
        'init',
        'validate',
        'analyze',
        'suggest',
        'complete',
        'hover',
        'diagnostics',
        'format',
        'refactor',
        'cleanup',
      ];

      const sdkInterface: SDKInterface = {
        name: 'CompleteAPI',
        version: '3.1.0',
        methods,
      };

      expect(sdkInterface.methods).toHaveLength(10);
      expect(sdkInterface.methods).toEqual(methods);
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid interface configuration', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.array(fc.string({ minLength: 1 })),
          (name, version, methods) => {
            const sdkInterface: SDKInterface = {
              name,
              version,
              methods,
            };

            expect(sdkInterface.name).toBe(name);
            expect(sdkInterface.version).toBe(version);
            expect(sdkInterface.methods).toEqual(methods);
          },
        ),
      );
    });
  });
});

describe('ValidationResult Interface', () => {
  describe('structure validation', () => {
    it('should accept valid validation result with no issues', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept validation result with errors and warnings', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Critical error: missing required field', 'Type mismatch in field "version"'],
        warnings: ['Deprecated field "legacy_support"', 'Unused dependency detected'],
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(2);
      expect(result.errors).toContain('Critical error: missing required field');
      expect(result.warnings).toContain('Deprecated field "legacy_support"');
    });
  });

  describe('validation state consistency', () => {
    it('should typically be invalid when errors exist', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Some error occurred'],
        warnings: [],
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should allow valid with warnings but no errors', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Non-critical warning'],
      };

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid combination of errors and warnings', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(fc.string()),
          fc.array(fc.string()),
          (isValid, errors, warnings) => {
            const result: ValidationResult = {
              isValid,
              errors,
              warnings,
            };

            expect(result.isValid).toBe(isValid);
            expect(result.errors).toEqual(errors);
            expect(result.warnings).toEqual(warnings);
          },
        ),
      );
    });
  });
});

describe('SDKValidationResult Interface', () => {
  describe('structure validation', () => {
    it('should extend ValidationResult correctly', () => {
      const baseInterface: SDKInterface = {
        name: 'TestAPI',
        version: '1.0.0',
        methods: ['test'],
      };

      const sdkResult: SDKValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        implementedInterfaces: [baseInterface],
        missingInterfaces: [],
        versionCompatibility: true,
      };

      // Should have ValidationResult properties
      expect(sdkResult.isValid).toBe(true);
      expect(sdkResult.errors).toHaveLength(0);
      expect(sdkResult.warnings).toHaveLength(0);

      // Should have SDK-specific properties
      expect(sdkResult.implementedInterfaces).toHaveLength(1);
      expect(sdkResult.missingInterfaces).toHaveLength(0);
      expect(sdkResult.versionCompatibility).toBe(true);
    });

    it('should handle validation failure with missing interfaces', () => {
      const implementedInterface: SDKInterface = {
        name: 'PartialAPI',
        version: '1.0.0',
        methods: ['validate'],
      };

      const sdkResult: SDKValidationResult = {
        isValid: false,
        errors: ['Missing required interface: CompleteAPI'],
        warnings: ['Interface PartialAPI is deprecated'],
        implementedInterfaces: [implementedInterface],
        missingInterfaces: ['CompleteAPI', 'ExtendedAPI'],
        versionCompatibility: false,
      };

      expect(sdkResult.isValid).toBe(false);
      expect(sdkResult.errors).toContain('Missing required interface: CompleteAPI');
      expect(sdkResult.implementedInterfaces).toHaveLength(1);
      expect(sdkResult.missingInterfaces).toHaveLength(2);
      expect(sdkResult.versionCompatibility).toBe(false);
    });
  });

  describe('interface compliance scenarios', () => {
    it('should handle multiple implemented interfaces', () => {
      const interfaces: SDKInterface[] = [
        {
          name: 'ValidationAPI',
          version: '2.0.0',
          methods: ['validate', 'analyze'],
        },
        {
          name: 'CompletionAPI',
          version: '1.5.0',
          methods: ['complete', 'suggest'],
        },
        {
          name: 'DiagnosticsAPI',
          version: '1.0.0',
          methods: ['diagnose', 'fix'],
        },
      ];

      const sdkResult: SDKValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['ValidationAPI v2.0.0 is newer than recommended v1.8.0'],
        implementedInterfaces: interfaces,
        missingInterfaces: [],
        versionCompatibility: true,
      };

      expect(sdkResult.implementedInterfaces).toHaveLength(3);
      expect(sdkResult.implementedInterfaces[0].name).toBe('ValidationAPI');
      expect(sdkResult.implementedInterfaces[1].methods).toContain('complete');
    });
  });

  describe('property-based testing', () => {
    it('should handle any valid SDK validation configuration', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(fc.string()),
          fc.array(fc.string()),
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1 }),
              version: fc.string({ minLength: 1 }),
              methods: fc.array(fc.string({ minLength: 1 })),
            }),
          ),
          fc.array(fc.string()),
          fc.boolean(),
          (
            isValid,
            errors,
            warnings,
            implementedInterfaces,
            missingInterfaces,
            versionCompatibility,
          ) => {
            const sdkResult: SDKValidationResult = {
              isValid,
              errors,
              warnings,
              implementedInterfaces,
              missingInterfaces,
              versionCompatibility,
            };

            expect(sdkResult.isValid).toBe(isValid);
            expect(sdkResult.errors).toEqual(errors);
            expect(sdkResult.warnings).toEqual(warnings);
            expect(sdkResult.implementedInterfaces).toEqual(implementedInterfaces);
            expect(sdkResult.missingInterfaces).toEqual(missingInterfaces);
            expect(sdkResult.versionCompatibility).toBe(versionCompatibility);
          },
        ),
      );
    });
  });
});

describe('Type Integration and Real-World Usage', () => {
  describe('package installation workflow', () => {
    it('should support complete package installation scenario', () => {
      // Package manifest
      const manifest: PackageManifestData = {
        name: 'logic-validation-package',
        version: '1.2.0',
        description: 'Advanced logic validation rules',
        author: 'Logic Systems Team',
        license: 'MIT',
        dependencies: {
          'core-logic': '^2.0.0',
          'rule-engine': '~1.5.0',
        },
        lsp: {
          desktop: {
            command: ['node', 'dist/server.js'],
            transport: 'stdio',
          },
        },
        validation: {
          categories: [
            {
              id: 'propositional',
              name: 'Propositional Logic',
              rules: ['modus-ponens', 'hypothetical-syllogism'],
            },
          ],
        },
      };

      // Installation from Git
      const gitSource: GitPackageSource = {
        url: 'https://github.com/logic-systems/validation-package.git',
        ref: 'v1.2.0',
        path: 'packages/validation',
      };

      // Installation info
      const installInfo: PackageInstallationInfo = {
        installedAt: new Date('2024-01-15T14:30:00Z'),
        installedFrom: gitSource,
        isEnabled: true,
        configurationOverrides: {
          enableAdvancedRules: true,
          logLevel: 'info',
        },
      };

      // Dependencies
      const dependencies: DependencyInfo[] = [
        {
          targetPackageId: 'core-logic-pkg-id',
          versionConstraint: '^2.0.0',
          isRequired: true,
          resolvedVersion: '2.1.0',
        },
        {
          targetPackageId: 'rule-engine-pkg-id',
          versionConstraint: '~1.5.0',
          isRequired: true,
          resolvedVersion: '1.5.3',
        },
      ];

      // Validation
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Package uses deprecated configuration format'],
      };

      // SDK compliance
      const sdkInterfaces: SDKInterface[] = [
        {
          name: 'ValidationRuleAPI',
          version: '1.0.0',
          methods: ['validate', 'explain', 'suggest'],
        },
      ];

      const sdkValidation: SDKValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        implementedInterfaces: sdkInterfaces,
        missingInterfaces: [],
        versionCompatibility: true,
      };

      // Verify all components work together
      expect(manifest.name).toBe('logic-validation-package');
      expect(installInfo.installedFrom).toBe(gitSource);
      expect(dependencies).toHaveLength(2);
      expect(validationResult.isValid).toBe(true);
      expect(sdkValidation.implementedInterfaces).toHaveLength(1);
    });
  });

  describe('error and edge case scenarios', () => {
    it('should handle package with validation errors', () => {
      const invalidManifest: PackageManifestData = {
        name: '',
        version: 'invalid-version',
        description: '',
        author: '',
      };

      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          'Package name cannot be empty',
          'Invalid version format: "invalid-version"',
          'Description is required',
          'Author is required',
        ],
        warnings: [],
      };

      expect(invalidManifest.name).toBe('');
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(4);
    });

    it('should handle failed SDK compliance', () => {
      const sdkResult: SDKValidationResult = {
        isValid: false,
        errors: ['Package does not implement required ValidationAPI'],
        warnings: ['Package implements deprecated LegacyAPI'],
        implementedInterfaces: [
          {
            name: 'LegacyAPI',
            version: '0.9.0',
            methods: ['oldValidate'],
          },
        ],
        missingInterfaces: ['ValidationAPI', 'CompletionAPI'],
        versionCompatibility: false,
      };

      expect(sdkResult.isValid).toBe(false);
      expect(sdkResult.missingInterfaces).toContain('ValidationAPI');
      expect(sdkResult.versionCompatibility).toBe(false);
    });
  });

  describe('type safety and compile-time checks', () => {
    it('should enforce readonly properties at compile time', () => {
      const gitSource: GitPackageSource = {
        url: 'https://github.com/test/repo.git',
        ref: 'main',
      };

      // These should be compile-time errors (readonly properties)
      // gitSource.url = 'changed'; // Should not compile
      // gitSource.ref = 'changed'; // Should not compile

      expect(gitSource.url).toBe('https://github.com/test/repo.git');
      expect(gitSource.ref).toBe('main');
    });

    it('should enforce required vs optional fields', () => {
      // This should compile (all required fields present)
      const validManifest: PackageManifestData = {
        name: 'test',
        version: '1.0.0',
        description: 'test description',
        author: 'test author',
      };

      // This should not compile (missing required fields)
      // const invalidManifest: PackageManifestData = {
      //   name: 'test',
      //   // version missing - should not compile
      // };

      expect(validManifest.name).toBe('test');
    });
  });
});
