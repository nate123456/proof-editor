import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { PackageValidationError } from '../../types/domain-errors.js';
import { PackageId } from '../package-id.js';

describe('PackageId', () => {
  describe('creation and validation', () => {
    it('should create valid PackageId from valid strings', () => {
      const validIds = [
        'simple-package',
        'package123',
        'a',
        'my-awesome-package',
        'package-with-multiple-hyphens',
        'x'.repeat(100), // Maximum length
      ];

      validIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });

    it('should trim whitespace from input', () => {
      const inputs = [
        '  simple-package  ',
        '\tpackage123\t',
        '\n my-package \n',
        '  \t package-name \t  ',
      ];

      inputs.forEach((input) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(input.trim());
        }
      });
    });

    it('should reject empty or whitespace-only strings', () => {
      const invalidIds = ['', '   ', '\t', '\n', '\r', '  \t  \n  '];

      invalidIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Package ID cannot be empty');
        }
      });
    });

    it('should reject strings exceeding 100 characters', () => {
      const longId = 'a'.repeat(101);
      const result = PackageId.create(longId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toContain('Package ID cannot exceed 100 characters');
      }
    });

    it('should accept exactly 100 characters', () => {
      const maxLengthId = 'a'.repeat(100);
      const result = PackageId.create(maxLengthId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(maxLengthId);
      }
    });

    it('should reject invalid characters', () => {
      const invalidIds = [
        'Package-Name', // uppercase letters
        'package_name', // underscores
        'package.name', // dots
        'package name', // spaces
        'package@name', // special characters
        'package#name',
        'package$name',
        'package%name',
        'package/name',
        'package\\name',
        'package+name',
        'package=name',
        'package[name]',
        'package{name}',
        'package(name)',
        'package:name',
        'package;name',
        'package"name"',
        "package'name'",
        'package<name>',
        'package?name',
        'package*name',
        'package&name',
        'package^name',
        'package!name',
        'package~name',
        'package`name',
        'package|name',
      ];

      invalidIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain(
            'Package ID must contain only lowercase letters, numbers, and hyphens',
          );
        }
      });
    });

    it('should reject IDs starting or ending with hyphen', () => {
      const invalidIds = ['-package', 'package-', '-package-', '-', '--package', 'package--'];

      invalidIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Package ID cannot start or end with hyphen');
        }
      });
    });

    it('should reject IDs with consecutive hyphens', () => {
      const invalidIds = [
        'package--name',
        'pack--age',
        'p--a--c--k--a--g--e',
        'package---name',
        'a--b',
      ];

      invalidIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
          expect(result.error.message).toContain('Package ID cannot contain consecutive hyphens');
        }
      });
    });
  });

  describe('string representation', () => {
    it('should return underlying value with toString', () => {
      const packageIds = ['simple', 'my-package', 'package123', 'a1b2c3'];

      packageIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
          expect(String(result.value)).toBe(id);
        }
      });
    });
  });

  describe('equality', () => {
    it('should implement equality correctly', () => {
      const id1Result = PackageId.create('test-package');
      const id2Result = PackageId.create('test-package');
      const id3Result = PackageId.create('different-package');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);
      expect(id3Result.isOk()).toBe(true);

      if (id1Result.isOk() && id2Result.isOk() && id3Result.isOk()) {
        expect(id1Result.value.equals(id2Result.value)).toBe(true);
        expect(id1Result.value.equals(id3Result.value)).toBe(false);
        expect(id2Result.value.equals(id3Result.value)).toBe(false);
      }
    });

    it('should satisfy equality properties', () => {
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;

        // Reflexivity
        expect(packageId.equals(packageId)).toBe(true);

        // Create another instance with same value for symmetry test
        const sameResult = PackageId.create('test-package');
        expect(sameResult.isOk()).toBe(true);

        if (sameResult.isOk()) {
          const samePackageId = sameResult.value;

          // Symmetry
          expect(packageId.equals(samePackageId)).toBe(samePackageId.equals(packageId));
        }
      }
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON correctly', () => {
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;
        expect(packageId.toJSON()).toBe('test-package');

        // Test JSON.stringify integration
        const serialized = JSON.stringify({ packageId });
        expect(serialized).toBe('{"packageId":"test-package"}');
      }
    });

    it('should handle serialization in complex objects', () => {
      const packageIdResult = PackageId.create('my-package');
      expect(packageIdResult.isOk()).toBe(true);

      if (packageIdResult.isOk()) {
        const data = {
          metadata: {
            id: packageIdResult.value,
            version: '1.0.0',
          },
          dependencies: [packageIdResult.value],
        };

        const serialized = JSON.stringify(data);
        const parsed = JSON.parse(serialized);

        expect(parsed.metadata.id).toBe('my-package');
        expect(parsed.dependencies[0]).toBe('my-package');
      }
    });
  });

  describe('domain-specific validation patterns', () => {
    it('should handle package naming conventions', () => {
      const namingPatterns = [
        { id: 'core-package', type: 'core', valid: true },
        { id: 'plugin-auth', type: 'plugin', valid: true },
        { id: 'theme-dark', type: 'theme', valid: true },
        { id: 'extension-vscode', type: 'extension', valid: true },
        { id: 'lib-utils', type: 'library', valid: true },
        { id: 'framework-react', type: 'framework', valid: true },
      ];

      namingPatterns.forEach(({ id, valid }) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(valid);

        if (valid && result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });

    it('should handle versioned package patterns', () => {
      const versionedPatterns = [
        'package-v1',
        'package-v2-0',
        'package-2023',
        'legacy-v1',
        'next-gen-v3',
      ];

      versionedPatterns.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });

    it('should handle scoped package naming (without @)', () => {
      // Note: This implementation doesn't support @ scopes, but tests naming patterns
      const scopedPatterns = ['org-package', 'company-utils', 'team-toolkit', 'namespace-core'];

      scopedPatterns.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });
  });

  describe('property-based testing', () => {
    const validCharArbitrary = fc.oneof(
      fc.constantFrom(
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
      ),
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
      fc.constant('-'),
    );

    const validPackageIdArbitrary = fc
      .array(validCharArbitrary, { minLength: 1, maxLength: 100 })
      .map((chars) => chars.join(''))
      .filter((id) => {
        // Additional filters to ensure validity
        return (
          id.length > 0 &&
          !id.startsWith('-') &&
          !id.endsWith('-') &&
          !id.includes('--') &&
          /^[a-z0-9-]+$/.test(id)
        );
      });

    it('should accept all valid package ID patterns', () => {
      fc.assert(
        fc.property(validPackageIdArbitrary, (id) => {
          const result = PackageId.create(id);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.toString()).toBe(id);
          }
        }),
      );
    });

    it('should maintain equality consistency', () => {
      fc.assert(
        fc.property(validPackageIdArbitrary, (id) => {
          const result1 = PackageId.create(id);
          const result2 = PackageId.create(id);

          expect(result1.isOk()).toBe(true);
          expect(result2.isOk()).toBe(true);

          if (result1.isOk() && result2.isOk()) {
            expect(result1.value.equals(result2.value)).toBe(true);
            expect(result1.value.toString()).toBe(result2.value.toString());
          }
        }),
      );
    });

    it('should reject strings with invalid characters', () => {
      const invalidCharArbitrary = fc.constantFrom(
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '_',
        '.',
        ' ',
        '@',
        '#',
        '$',
        '%',
        '/',
        '\\',
        '+',
        '=',
        '[',
        ']',
        '{',
        '}',
        '(',
        ')',
        ':',
        ';',
        '"',
        "'",
        '<',
        '>',
        '?',
        '*',
        '&',
        '^',
        '!',
        '~',
        '`',
        '|',
      );

      const invalidStringArbitrary = fc
        .tuple(
          fc.string({ minLength: 0, maxLength: 50 }),
          invalidCharArbitrary,
          fc.string({ minLength: 0, maxLength: 50 }),
        )
        .map(([prefix, invalidChar, suffix]) => prefix + invalidChar + suffix);

      fc.assert(
        fc.property(invalidStringArbitrary, (invalidId) => {
          const trimmed = invalidId.trim();
          // Skip empty strings (tested separately)
          fc.pre(trimmed.length > 0);
          // Skip strings where the invalid character was trimmed away (making it valid)
          fc.pre(trimmed !== invalidId.replace(/[^a-z0-9-]/g, ''));

          const result = PackageId.create(invalidId);
          expect(result.isErr()).toBe(true);
        }),
      );
    });

    it('should handle edge cases in length validation', () => {
      fc.assert(
        fc.property(fc.integer({ min: 101, max: 200 }), (length) => {
          const longId = 'a'.repeat(length);
          const result = PackageId.create(longId);
          expect(result.isErr()).toBe(true);

          if (result.isErr()) {
            expect(result.error.message).toContain('cannot exceed 100 characters');
          }
        }),
      );
    });

    it('should maintain immutability properties', () => {
      fc.assert(
        fc.property(validPackageIdArbitrary, (id) => {
          const result = PackageId.create(id);

          if (result.isOk()) {
            const packageId = result.value;
            const originalValue = packageId.toString();

            // Multiple calls should return the same value
            expect(packageId.toString()).toBe(originalValue);
            expect(packageId.toJSON()).toBe(originalValue);

            // Values should be consistent across different access methods
            expect(packageId.toString()).toBe(packageId.toJSON());
          }
        }),
      );
    });
  });

  describe('real-world package ID examples', () => {
    it('should accept common package naming patterns', () => {
      const realWorldIds = [
        'lodash',
        'react',
        'vue',
        'angular',
        'express',
        'axios',
        'webpack',
        'babel',
        'eslint',
        'typescript',
        'react-dom',
        'vue-router',
        'express-session',
        'babel-core',
        'webpack-dev-server',
        'eslint-config-airbnb',
        'typescript-eslint',
        'my-awesome-package',
        'super-long-package-name-that-describes-functionality',
        'a',
        'x',
        'package123',
        'test-package-1',
        'npm-package-example',
        'api-client',
        'ui-components',
        'data-validator',
        'file-processor',
        'image-resizer',
        'pdf-generator',
        'email-sender',
        'crypto-utils',
        'string-formatter',
        'date-helper',
        'math-operations',
        'network-client',
        'cache-manager',
        'logger-service',
        'config-parser',
        'template-engine',
        'markdown-parser',
        'json-transformer',
        'xml-processor',
        'csv-reader',
        'zip-archiver',
      ];

      realWorldIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });

    it('should reject common invalid patterns', () => {
      const invalidPatterns = [
        'React', // uppercase
        'react_dom', // underscore
        'react.dom', // dot
        'react dom', // space
        '@react/dom', // scoped package format (not supported in this context)
        'react/dom', // slash
        'react\\dom', // backslash
        '-react', // leading hyphen
        'react-', // trailing hyphen
        'react--dom', // consecutive hyphens
        '', // empty
        ' ', // whitespace only
        'package!', // exclamation
        'package?', // question mark
        'package*', // asterisk
        'package+', // plus
        'package=', // equals
        'package[1]', // brackets
        'package{1}', // braces
        'package(1)', // parentheses
        'package:1', // colon
        'package;1', // semicolon
        'package"1"', // quotes
        "package'1'", // single quotes
        'package<1>', // angle brackets
        'package&1', // ampersand
        'package%1', // percent
        'package$1', // dollar
        'package#1', // hash
        'package@1', // at symbol
        'package^1', // caret
        'package~1', // tilde
        'package`1', // backtick
        'package|1', // pipe
      ];

      invalidPatterns.forEach((pattern) => {
        const result = PackageId.create(pattern);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
        }
      });
    });
  });

  describe('cross-context integration scenarios', () => {
    it('should handle package ID in dependency resolution context', () => {
      const packageIds = [
        'main-package',
        'dependency-1',
        'dependency-2',
        'dev-dependency',
        'peer-dependency',
      ];

      const dependencyMap = new Map();

      packageIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          dependencyMap.set(id, result.value);
        }
      });

      expect(dependencyMap.size).toBe(5);

      // Test dependency relationships
      const mainPackage = dependencyMap.get('main-package');
      const dep1 = dependencyMap.get('dependency-1');

      expect(mainPackage?.toString()).toBe('main-package');
      expect(dep1?.toString()).toBe('dependency-1');
      expect(mainPackage?.equals(dep1 ?? dep1)).toBe(false);
    });

    it('should handle package ID in registry lookup scenarios', () => {
      const registryIds = [
        'official-package',
        'community-extension',
        'experimental-feature',
        'legacy-support',
        'beta-release',
      ];

      const registryLookup = (packageId: PackageId): { found: boolean; version?: string } => {
        const id = packageId.toString();

        // Simulate registry lookup
        const registry = {
          'official-package': '1.0.0',
          'community-extension': '2.1.0',
          'experimental-feature': '0.9.0-beta',
          'legacy-support': '0.5.0',
        };

        return {
          found: id in registry,
          version: registry[id as keyof typeof registry],
        };
      };

      registryIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const lookup = registryLookup(result.value);

          if (id === 'beta-release') {
            expect(lookup.found).toBe(false);
          } else {
            expect(lookup.found).toBe(true);
            expect(lookup.version).toBeTruthy();
          }
        }
      });
    });

    it('should handle package ID in installation context', () => {
      const installationQueue = [
        { id: 'base-framework', priority: 1 },
        { id: 'core-plugins', priority: 2 },
        { id: 'ui-components', priority: 3 },
        { id: 'dev-tools', priority: 4 },
      ];

      const validatedQueue = installationQueue
        .map(({ id, priority }) => {
          const result = PackageId.create(id);
          return result.isOk() ? { packageId: result.value, priority } : null;
        })
        .filter(Boolean);

      expect(validatedQueue).toHaveLength(4);

      // Sort by priority
      validatedQueue.sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0));

      expect(validatedQueue[0]?.packageId.toString()).toBe('base-framework');
      expect(validatedQueue[3]?.packageId.toString()).toBe('dev-tools');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle boundary length values', () => {
      // Test exactly at boundaries
      const length1 = 'a';
      const length100 = 'a'.repeat(100);
      const length101 = 'a'.repeat(101);

      expect(PackageId.create(length1).isOk()).toBe(true);
      expect(PackageId.create(length100).isOk()).toBe(true);
      expect(PackageId.create(length101).isErr()).toBe(true);
    });

    it('should handle numeric-only IDs', () => {
      const numericIds = ['1', '123', '999999', '1-2-3', '123-456-789'];

      numericIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(id);
        }
      });
    });

    it('should handle single character IDs', () => {
      const singleChars = ['a', 'b', 'z', '1', '9', '0'];

      singleChars.forEach((char) => {
        const result = PackageId.create(char);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(char);
        }
      });
    });

    it('should handle hyphen placement correctly', () => {
      const validHyphenIds = [
        'a-b',
        'pack-age',
        'a-b-c-d-e-f',
        'prefix-1-2-3-suffix',
        '1-package-2',
      ];

      const invalidHyphenIds = ['-package', 'package-', 'pack--age', '-pack-age-', 'a--b'];

      validHyphenIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isOk()).toBe(true);
      });

      invalidHyphenIds.forEach((id) => {
        const result = PackageId.create(id);
        expect(result.isErr()).toBe(true);
      });
    });

    it('should handle whitespace trimming edge cases', () => {
      const whitespaceTests = [
        { input: '  package  ', expected: 'package' },
        { input: '\tpackage\t', expected: 'package' },
        { input: '\npackage\n', expected: 'package' },
        { input: '\r\npackage\r\n', expected: 'package' },
        { input: '  \t  package  \n  \r  ', expected: 'package' },
      ];

      whitespaceTests.forEach(({ input, expected }) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(expected);
        }
      });
    });

    it('should handle Unicode whitespace trimming', () => {
      const unicodeWhitespaceTests = [
        { input: '\u00A0package\u00A0', expected: 'package' }, // Non-breaking space
        { input: '\u2000package\u2000', expected: 'package' }, // En quad
        { input: '\u2001package\u2001', expected: 'package' }, // Em quad
        { input: '\u3000package\u3000', expected: 'package' }, // Ideographic space
      ];

      unicodeWhitespaceTests.forEach(({ input, expected }) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(expected);
        }
      });
    });
  });

  describe('error message quality and context', () => {
    it('should provide clear error messages for different validation failures', () => {
      const errorCases = [
        {
          input: '',
          expectedMessage: 'Package ID cannot be empty',
        },
        {
          input: 'a'.repeat(101),
          expectedMessage: 'Package ID cannot exceed 100 characters',
        },
        {
          input: 'Package-Name',
          expectedMessage: 'Package ID must contain only lowercase letters, numbers, and hyphens',
        },
        {
          input: '-package',
          expectedMessage: 'Package ID cannot start or end with hyphen',
        },
        {
          input: 'package-',
          expectedMessage: 'Package ID cannot start or end with hyphen',
        },
        {
          input: 'pack--age',
          expectedMessage: 'Package ID cannot contain consecutive hyphens',
        },
      ];

      errorCases.forEach(({ input, expectedMessage }) => {
        const result = PackageId.create(input);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error.message).toContain(expectedMessage);
          expect(result.error.code).toBe('PACKAGE_VALIDATION_ERROR');
        }
      });
    });

    it('should provide helpful context in error messages', () => {
      const result = PackageId.create('Invalid-Package-Name');
      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(PackageValidationError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.message.length).toBeGreaterThan(10); // Should be descriptive
      }
    });
  });

  describe('performance and memory efficiency', () => {
    it('should handle many PackageId creations efficiently', () => {
      const startTime = performance.now();
      const packageIds: PackageId[] = [];

      for (let i = 0; i < 1000; i++) {
        const result = PackageId.create(`package-${i}`);
        if (result.isOk()) {
          packageIds.push(result.value);
        }
      }

      const endTime = performance.now();

      expect(packageIds).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle equality checks efficiently', () => {
      const packageId1Result = PackageId.create('test-package');
      const packageId2Result = PackageId.create('test-package');

      expect(packageId1Result.isOk()).toBe(true);
      expect(packageId2Result.isOk()).toBe(true);

      if (packageId1Result.isOk() && packageId2Result.isOk()) {
        const startTime = performance.now();

        for (let i = 0; i < 10000; i++) {
          packageId1Result.value.equals(packageId2Result.value);
        }

        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100); // Should be fast
      }
    });

    it('should handle large-scale package ID operations', () => {
      const packageCount = 5000;
      const startTime = performance.now();

      const packages = Array.from({ length: packageCount }, (_, i) => {
        const result = PackageId.create(`package-${i % 100}-${Math.floor(i / 100)}`);
        return result.isOk() ? result.value : null;
      }).filter(Boolean);

      // Perform operations on the packages
      const uniquePackages = new Set(packages.map((p) => p?.toString()));
      const sortedPackages = packages.sort((a, b) => {
        if (!a || !b) return 0;
        return a.toString().localeCompare(b.toString());
      });

      const endTime = performance.now();

      expect(packages).toHaveLength(packageCount);
      expect(uniquePackages.size).toBeGreaterThan(0);
      expect(sortedPackages).toHaveLength(packageCount);
      expect(endTime - startTime).toBeLessThan(500); // Should complete reasonably quickly
    });
  });

  describe('additional value object characteristics', () => {
    it('should maintain constructor accessibility and immutability patterns', () => {
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;
        const originalValue = packageId.toString();

        // Constructor should not be accessible directly
        expect(() => (packageId as any).constructor('direct-call')).toThrow();

        // Test functional immutability - methods should return consistent values
        expect(packageId.toString()).toBe(originalValue);
        expect(packageId.toJSON()).toBe(originalValue);

        // Multiple calls should be consistent
        expect(packageId.toString()).toBe(packageId.toString());
        expect(packageId.toJSON()).toBe(packageId.toJSON());

        // Different access methods should return the same value
        expect(packageId.toString()).toBe(packageId.toJSON());
      }
    });

    it('should handle string coercion and implicit conversions', () => {
      const result = PackageId.create('test-package-123');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;
        const expected = 'test-package-123';

        // Explicit string conversion
        expect(packageId.toString()).toBe(expected);
        expect(packageId.toJSON()).toBe(expected);

        // Implicit string conversion
        expect(String(packageId)).toBe(expected);
        expect(`${packageId}`).toBe(expected);

        // String concatenation
        expect(`prefix-${packageId}`).toBe(`prefix-${expected}`);
        expect(`${packageId}-suffix`).toBe(`${expected}-suffix`);

        // Template literal
        expect(`Package: ${packageId}`).toBe(`Package: ${expected}`);
      }
    });

    it('should handle equals method with comprehensive equality testing', () => {
      const package1Result = PackageId.create('test-package');
      const package2Result = PackageId.create('test-package');
      const package3Result = PackageId.create('different-package');

      expect(package1Result.isOk()).toBe(true);
      expect(package2Result.isOk()).toBe(true);
      expect(package3Result.isOk()).toBe(true);

      if (package1Result.isOk() && package2Result.isOk() && package3Result.isOk()) {
        const p1 = package1Result.value;
        const p2 = package2Result.value;
        const p3 = package3Result.value;

        // Reflexivity: x.equals(x) should be true
        expect(p1.equals(p1)).toBe(true);
        expect(p2.equals(p2)).toBe(true);
        expect(p3.equals(p3)).toBe(true);

        // Symmetry: x.equals(y) === y.equals(x)
        expect(p1.equals(p2)).toBe(p2.equals(p1));
        expect(p1.equals(p3)).toBe(p3.equals(p1));
        expect(p2.equals(p3)).toBe(p3.equals(p2));

        // Transitivity test
        const package1DupResult = PackageId.create('test-package');
        expect(package1DupResult.isOk()).toBe(true);

        if (package1DupResult.isOk()) {
          const p1Dup = package1DupResult.value;
          expect(p1.equals(p2)).toBe(true);
          expect(p2.equals(p1Dup)).toBe(true);
          expect(p1.equals(p1Dup)).toBe(true); // Transitivity
        }

        // Inequality
        expect(p1.equals(p3)).toBe(false);
        expect(p2.equals(p3)).toBe(false);
      }
    });
  });
});
