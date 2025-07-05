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
          fc.pre(invalidId.trim().length > 0); // Skip empty strings (tested separately)

          // Skip cases where trimming would make the string valid
          // (e.g., " a" becomes "a" which is valid)
          const trimmed = invalidId.trim();
          fc.pre(
            !/^[a-z0-9-]+$/.test(trimmed) ||
              trimmed.startsWith('-') ||
              trimmed.endsWith('-') ||
              trimmed.includes('--'),
          );

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
  });

  describe('error message quality', () => {
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

  describe('performance and memory', () => {
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
  });

  describe('additional edge case coverage', () => {
    it('should handle constructor accessibility', () => {
      // Verify constructor is private - this should fail at compile time but tests runtime behavior
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;
        // Constructor should not be accessible
        expect(() => (packageId as any).constructor('direct-call')).toThrow();
      }
    });

    it('should handle value property immutability', () => {
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;
        const originalValue = packageId.toString();

        // Note: TypeScript readonly is a compile-time feature, not runtime
        // At runtime, the property can still be modified, but this tests
        // that the class design intends immutability
        expect(packageId.toString()).toBe(originalValue);
        expect(packageId.toJSON()).toBe(originalValue);

        // Test that multiple calls return the same value (functional immutability)
        expect(packageId.toString()).toBe(packageId.toString());
        expect(packageId.toJSON()).toBe(packageId.toJSON());

        // Value should be consistent across all access methods
        expect(packageId.toString()).toBe(packageId.toJSON());
      }
    });

    it('should handle regex edge cases in validation', () => {
      const regexEdgeCases = [
        'a-', // Ends with hyphen
        '-a', // Starts with hyphen
        'a--b', // Consecutive hyphens
        'A', // Uppercase (should fail)
        '0', // Single number (should pass)
        'a-0-b', // Valid pattern
        'package-123-test', // Valid complex pattern
      ];

      const expectedResults = [false, false, false, false, true, true, true];

      regexEdgeCases.forEach((testCase, index) => {
        const result = PackageId.create(testCase);
        expect(result.isOk()).toBe(expectedResults[index]);
      });
    });

    it('should handle trim edge cases comprehensively', () => {
      const trimCases = [
        { input: 'package', expected: 'package' },
        { input: ' package ', expected: 'package' },
        { input: '\tpackage\t', expected: 'package' },
        { input: '\npackage\n', expected: 'package' },
        { input: '\r\npackage\r\n', expected: 'package' },
        { input: '  \t\n  package  \n\t  ', expected: 'package' },
        { input: '\u00A0package\u00A0', expected: 'package' }, // Non-breaking space
        { input: '\u2000package\u2000', expected: 'package' }, // En quad
        { input: '\u3000package\u3000', expected: 'package' }, // Ideographic space
      ];

      trimCases.forEach(({ input, expected }) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value.toString()).toBe(expected);
        }
      });
    });

    it('should handle JSON serialization edge cases', () => {
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;

        // Test toJSON method directly
        expect(packageId.toJSON()).toBe('test-package');

        // Test JSON.stringify with replacer function
        const customStringify = JSON.stringify(packageId, (key, value) => {
          if (key === '') return value; // Root object
          return value;
        });
        expect(customStringify).toBe('"test-package"');

        // Test in array context
        const arrayStringify = JSON.stringify([packageId, packageId]);
        expect(arrayStringify).toBe('["test-package","test-package"]');

        // Test with undefined and null mixing
        const mixedStringify = JSON.stringify({
          valid: packageId,
          invalid: null,
          missing: undefined,
        });
        expect(mixedStringify).toBe('{"valid":"test-package","invalid":null}');
      }
    });

    it('should handle string representation consistency', () => {
      const testValues = ['a', 'test-package', 'x'.repeat(100)];

      testValues.forEach((value) => {
        const result = PackageId.create(value);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const packageId = result.value;

          // All string methods should return the same value
          expect(packageId.toString()).toBe(value);
          expect(packageId.toJSON()).toBe(value);
          expect(String(packageId)).toBe(value);
          expect(`${packageId}`).toBe(value);

          // Multiple calls should be consistent
          expect(packageId.toString()).toBe(packageId.toString());
          expect(packageId.toJSON()).toBe(packageId.toJSON());
        }
      });
    });

    it('should handle equals method with various input types', () => {
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

        // Test equals method thoroughly
        expect(p1.equals(p1)).toBe(true); // Reflexive
        expect(p1.equals(p2)).toBe(true); // Symmetric - same value
        expect(p2.equals(p1)).toBe(true); // Symmetric - same value
        expect(p1.equals(p3)).toBe(false); // Different values
        expect(p3.equals(p1)).toBe(false); // Different values

        // Test transitivity
        const package1DuplicateResult = PackageId.create('test-package');
        expect(package1DuplicateResult.isOk()).toBe(true);

        if (package1DuplicateResult.isOk()) {
          const p1Dup = package1DuplicateResult.value;
          expect(p1.equals(p2)).toBe(true);
          expect(p2.equals(p1Dup)).toBe(true);
          expect(p1.equals(p1Dup)).toBe(true); // Transitive
        }
      }
    });

    it('should handle validation error types and inheritance', () => {
      const invalidInputs = [
        '',
        'Package-Name',
        'a'.repeat(101),
        '-package',
        'package-',
        'pack--age',
      ];

      invalidInputs.forEach((input) => {
        const result = PackageId.create(input);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          const error = result.error;
          expect(error).toBeInstanceOf(PackageValidationError);
          expect(error).toBeInstanceOf(Error);
          expect(error.name).toBe('PackageValidationError');
          expect(error.code).toBe('PACKAGE_VALIDATION_ERROR');
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);
          expect(error.stack).toBeDefined();
        }
      });
    });

    it('should handle create method with comprehensive input validation', () => {
      // Test the complete validation pipeline
      const testCases = [
        { input: 'valid-package', shouldPass: true, reason: 'valid input' },
        { input: '  valid-package  ', shouldPass: true, reason: 'trimmed input' },
        { input: '', shouldPass: false, reason: 'empty string' },
        { input: '   ', shouldPass: false, reason: 'whitespace only' },
        { input: 'a'.repeat(100), shouldPass: true, reason: 'exactly 100 chars' },
        { input: 'a'.repeat(101), shouldPass: false, reason: 'over 100 chars' },
        { input: 'valid123', shouldPass: true, reason: 'alphanumeric' },
        { input: 'valid-123', shouldPass: true, reason: 'with hyphens' },
        { input: 'Valid', shouldPass: false, reason: 'uppercase letters' },
        { input: 'valid_123', shouldPass: false, reason: 'underscores' },
        { input: 'valid.123', shouldPass: false, reason: 'periods' },
        { input: 'valid 123', shouldPass: false, reason: 'spaces' },
        { input: '-valid', shouldPass: false, reason: 'starts with hyphen' },
        { input: 'valid-', shouldPass: false, reason: 'ends with hyphen' },
        { input: 'val--id', shouldPass: false, reason: 'consecutive hyphens' },
      ];

      testCases.forEach(({ input, shouldPass, reason: _ }) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(shouldPass);

        if (shouldPass && result.isOk()) {
          expect(result.value.toString()).toBe(input.trim());
        } else if (!shouldPass && result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
        }
      });
    });
  });

  describe('integration and compatibility tests', () => {
    it('should handle package ID normalization scenarios', () => {
      const normalizationCases = [
        { input: '  Package-Name  ', normalized: null, valid: false }, // Should fail due to uppercase
        { input: '  package-name  ', normalized: 'package-name', valid: true },
        { input: '\tmy-package\n', normalized: 'my-package', valid: true },
        { input: '   a   ', normalized: 'a', valid: true },
        { input: ' x '.repeat(50).trim(), normalized: 'x '.repeat(50).trim(), valid: false }, // Contains spaces
      ];

      normalizationCases.forEach(({ input, normalized, valid }) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(valid);

        if (valid && result.isOk() && normalized) {
          expect(result.value.toString()).toBe(normalized);
        }
      });
    });

    it('should work correctly with Map and Set data structures', () => {
      const id1Result = PackageId.create('package-1');
      const id2Result = PackageId.create('package-1'); // Same value
      const id3Result = PackageId.create('package-2');

      expect(id1Result.isOk()).toBe(true);
      expect(id2Result.isOk()).toBe(true);
      expect(id3Result.isOk()).toBe(true);

      if (id1Result.isOk() && id2Result.isOk() && id3Result.isOk()) {
        const id1 = id1Result.value;
        const id2 = id2Result.value;
        const id3 = id3Result.value;

        // Test with Map using PackageId as key
        const packageMap = new Map<string, PackageId>();
        packageMap.set(id1.toString(), id1);
        packageMap.set(id2.toString(), id2); // Should overwrite since same key
        packageMap.set(id3.toString(), id3);

        expect(packageMap.size).toBe(2);
        expect(packageMap.get('package-1')).toBeDefined();
        expect(packageMap.get('package-2')).toBeDefined();

        // Test with Set using string representation
        const packageSet = new Set<string>();
        packageSet.add(id1.toString());
        packageSet.add(id2.toString()); // Should not add duplicate
        packageSet.add(id3.toString());

        expect(packageSet.size).toBe(2);
        expect(packageSet.has('package-1')).toBe(true);
        expect(packageSet.has('package-2')).toBe(true);
      }
    });

    it('should handle concurrent package ID creation', async () => {
      const packageNames = Array.from({ length: 100 }, (_, i) => `package-${i}`);

      const promises = packageNames.map(async (name) => {
        // Simulate async environment
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        return PackageId.create(name);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.toString()).toBe(`package-${index}`);
        }
      });
    });

    it('should maintain immutability guarantees', () => {
      const result = PackageId.create('test-package');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;
        const originalString = packageId.toString();
        const originalJson = packageId.toJSON();

        // Attempt to modify internal state (should not be possible)
        try {
          (packageId as any).value = 'modified-value';
        } catch {
          // Expected if property is truly immutable
        }

        // Values should remain unchanged
        expect(packageId.toString()).toBe(originalString);
        expect(packageId.toJSON()).toBe(originalJson);

        // Multiple calls should return identical results
        expect(packageId.toString()).toBe(packageId.toString());
        expect(packageId.toJSON()).toBe(packageId.toJSON());
      }
    });

    it('should handle memory-efficient equality comparisons', () => {
      const packageId1Result = PackageId.create('memory-test-package');
      const packageId2Result = PackageId.create('memory-test-package');

      expect(packageId1Result.isOk()).toBe(true);
      expect(packageId2Result.isOk()).toBe(true);

      if (packageId1Result.isOk() && packageId2Result.isOk()) {
        const packageId1 = packageId1Result.value;
        const packageId2 = packageId2Result.value;

        // Test equality multiple times to ensure no memory leaks
        const iterations = 10000;
        let equalityResults = 0;

        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          if (packageId1.equals(packageId2)) {
            equalityResults++;
          }
        }

        const endTime = performance.now();

        expect(equalityResults).toBe(iterations);
        expect(endTime - startTime).toBeLessThan(1000); // Should be very fast
      }
    });

    it('should handle package ID comparison in sorted contexts', () => {
      const packageNames = [
        'zebra-package',
        'alpha-package',
        'beta-package',
        'gamma-package',
        'delta-package',
        'omega-package',
      ];

      const packageIds = packageNames
        .map((name) => PackageId.create(name))
        .filter((result) => result.isOk())
        .map((result) => result.value);

      expect(packageIds).toHaveLength(6);

      // Sort by string representation
      const sortedIds = packageIds.sort((a, b) => a.toString().localeCompare(b.toString()));

      const sortedNames = sortedIds.map((id) => id.toString());
      const expectedOrder = [...packageNames].sort();

      expect(sortedNames).toEqual(expectedOrder);
    });

    it('should work correctly with serialization roundtrips', () => {
      const originalIds = ['simple', 'complex-package-name', 'a', 'z'.repeat(100)];

      originalIds.forEach((idStr) => {
        const createResult = PackageId.create(idStr);
        expect(createResult.isOk()).toBe(true);

        if (createResult.isOk()) {
          const packageId = createResult.value;

          // Serialize to JSON
          const serialized = JSON.stringify({ id: packageId });
          const parsed = JSON.parse(serialized);

          // Create new PackageId from parsed data
          const recreatedResult = PackageId.create(parsed.id);
          expect(recreatedResult.isOk()).toBe(true);

          if (recreatedResult.isOk()) {
            const recreatedId = recreatedResult.value;

            // Should be equal
            expect(packageId.equals(recreatedId)).toBe(true);
            expect(packageId.toString()).toBe(recreatedId.toString());
            expect(packageId.toJSON()).toBe(recreatedId.toJSON());
          }
        }
      });
    });

    it('should handle edge cases in string conversion contexts', () => {
      const result = PackageId.create('conversion-test');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;

        // Test various string conversion contexts
        expect(`Package: ${packageId}`).toBe('Package: conversion-test');
        expect(String(packageId)).toBe('conversion-test');
        expect(`${packageId}`).toBe('conversion-test');

        // Test in template literals
        const template = `ID: ${packageId}, Type: PackageId`;
        expect(template).toBe('ID: conversion-test, Type: PackageId');

        // Test with array join
        const array = [packageId, 'other', packageId];
        expect(array.join('-')).toBe('conversion-test-other-conversion-test');
      }
    });

    it('should maintain type safety boundaries', () => {
      const result = PackageId.create('type-safety-test');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const packageId = result.value;

        // Verify instanceof checks
        expect(packageId instanceof PackageId).toBe(true);
        expect(packageId instanceof Object).toBe(true);
        expect(packageId instanceof String).toBe(false);

        // Verify property access
        expect(typeof packageId.toString).toBe('function');
        expect(typeof packageId.toJSON).toBe('function');
        expect(typeof packageId.equals).toBe('function');

        // Verify prototype chain
        expect(Object.prototype.isPrototypeOf.call(PackageId.prototype, packageId)).toBe(true);
      }
    });

    it('should handle error propagation in complex scenarios', () => {
      const invalidInputs = [
        { input: '', expectedError: 'empty' },
        { input: 'Invalid-Case', expectedError: 'lowercase' },
        { input: '-invalid', expectedError: 'hyphen' },
        { input: 'invalid-', expectedError: 'hyphen' },
        { input: 'inv--alid', expectedError: 'consecutive' },
        { input: 'a'.repeat(101), expectedError: '100 characters' },
      ];

      invalidInputs.forEach(({ input, expectedError }) => {
        const result = PackageId.create(input);
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          const error = result.error;
          expect(error).toBeInstanceOf(PackageValidationError);
          expect(error.message.toLowerCase()).toContain(expectedError.toLowerCase());

          // Error should have proper stack trace
          expect(error.stack).toBeDefined();
          expect(typeof error.stack).toBe('string');
          expect(error.stack?.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle boundary conditions comprehensively', () => {
      const boundaryTests = [
        // Length boundaries
        { input: '', valid: false, description: 'empty string' },
        { input: 'a', valid: true, description: 'minimum valid length' },
        { input: 'a'.repeat(100), valid: true, description: 'maximum valid length' },
        { input: 'a'.repeat(101), valid: false, description: 'exceeds maximum length' },

        // Character boundaries
        { input: '0', valid: true, description: 'minimum valid number' },
        { input: '9', valid: true, description: 'maximum valid number' },
        { input: 'a', valid: true, description: 'minimum valid letter' },
        { input: 'z', valid: true, description: 'maximum valid letter' },

        // Hyphen boundaries
        { input: 'a-z', valid: true, description: 'valid hyphen usage' },
        { input: '-az', valid: false, description: 'hyphen at start' },
        { input: 'az-', valid: false, description: 'hyphen at end' },
        { input: 'a--z', valid: false, description: 'consecutive hyphens' },

        // Mixed boundaries
        { input: 'a0-z9', valid: true, description: 'valid mixed characters' },
        { input: 'package-123-test', valid: true, description: 'complex valid pattern' },
      ];

      boundaryTests.forEach(({ input, valid }) => {
        const result = PackageId.create(input);
        expect(result.isOk()).toBe(valid);

        if (valid && result.isOk()) {
          expect(result.value.toString()).toBe(input);
        } else if (!valid && result.isErr()) {
          expect(result.error).toBeInstanceOf(PackageValidationError);
        }
      });
    });
  });
});
