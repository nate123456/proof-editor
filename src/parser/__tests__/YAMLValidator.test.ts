import { describe, expect, it } from 'vitest';

import { ParseErrorType } from '../ParseError.js';
import { YAMLValidator } from '../YAMLValidator.js';

describe('YAMLValidator', () => {
  const validator = new YAMLValidator();

  describe('Structure validation', () => {
    it('should validate correct YAML structure', () => {
      const validData = {
        statements: {
          s1: 'Statement 1',
          s2: 'Statement 2',
        },
        orderedSets: {
          os1: ['s1'],
          os2: ['s2'],
        },
        atomicArguments: {
          arg1: {
            premises: 'os1',
            conclusions: 'os2',
          },
        },
        trees: {
          tree1: {
            offset: { x: 100, y: 200 },
            nodes: {
              n1: { arg: 'arg1' },
            },
          },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should reject non-object root', () => {
      const invalidData = 'not an object';
      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors).toHaveLength(1);
      expect(errors[0]!.type).toBe(ParseErrorType.INVALID_STRUCTURE);
      expect(errors[0]!.message).toContain('must be an object');
    });

    it('should accept null data as empty document', () => {
      const result = validator.validateStructure(null);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure).toEqual({});
    });

    it('should accept undefined data as empty document', () => {
      const result = validator.validateStructure(undefined);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure).toEqual({});
    });
  });

  describe('Tree nodes validation - uncovered lines coverage', () => {
    it('should reject non-object tree nodes (lines 378-385)', () => {
      const invalidData = {
        trees: {
          tree1: {
            nodes: 'not an object', // This should trigger lines 378-385
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);

      const treeNodeError = errors.find(
        e =>
          e.type === ParseErrorType.INVALID_TREE_STRUCTURE &&
          e.message.includes('Tree nodes must be an object')
      );
      expect(treeNodeError).toBeDefined();
      expect(treeNodeError!.reference).toBe('tree1');
    });

    it('should reject null tree nodes (lines 378-385)', () => {
      const invalidData = {
        trees: {
          tree1: {
            nodes: null, // This should also trigger lines 378-385
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      const treeNodeError = errors.find(
        e =>
          e.type === ParseErrorType.INVALID_TREE_STRUCTURE &&
          e.message.includes('Tree nodes must be an object')
      );
      expect(treeNodeError).toBeDefined();
    });

    it('should reject non-object individual node specs (lines 392-399)', () => {
      const invalidData = {
        trees: {
          tree1: {
            nodes: {
              n1: 'not an object', // This should trigger lines 392-399
              n2: { arg: 'arg1' }, // Valid node for comparison
              n3: 42, // Another invalid node spec
              n4: null, // Yet another invalid node spec
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;

      // Should have errors for n1, n3, and n4 (n2 is valid)
      const nodeSpecErrors = errors.filter(
        e =>
          e.type === ParseErrorType.INVALID_TREE_STRUCTURE &&
          e.message.includes('Node spec must be an object')
      );

      expect(nodeSpecErrors.length).toBe(3); // n1, n3, n4

      // Check specific error messages
      const n1Error = nodeSpecErrors.find(e => e.reference === 'tree1.n1');
      expect(n1Error).toBeDefined();
      expect(n1Error!.message).toContain('got string');

      const n3Error = nodeSpecErrors.find(e => e.reference === 'tree1.n3');
      expect(n3Error).toBeDefined();
      expect(n3Error!.message).toContain('got number');

      const n4Error = nodeSpecErrors.find(e => e.reference === 'tree1.n4');
      expect(n4Error).toBeDefined();
      expect(n4Error!.message).toContain('got object'); // null is typeof 'object'
    });

    it('should handle mixed valid and invalid node specs (lines 392-399)', () => {
      const invalidData = {
        statements: {
          s1: 'Statement 1',
        },
        trees: {
          tree1: {
            nodes: {
              validNode: { arg: 'arg1' },
              invalidString: 'string value',
              invalidNumber: 123,
              invalidBoolean: true,
              invalidArray: ['array', 'value'],
              anotherValidNode: { parent: 'arg2', on: 0 },
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;

      // Should have errors for all invalid node specs
      const nodeSpecErrors = errors.filter(
        e =>
          e.type === ParseErrorType.INVALID_TREE_STRUCTURE &&
          e.message.includes('Node spec must be an object')
      );

      expect(nodeSpecErrors.length).toBe(3); // invalidString, invalidNumber, invalidBoolean (invalidArray might be treated as valid object)

      // Verify specific error types
      const stringError = nodeSpecErrors.find(e => e.reference === 'tree1.invalidString');
      expect(stringError?.message).toContain('got string');

      const numberError = nodeSpecErrors.find(e => e.reference === 'tree1.invalidNumber');
      expect(numberError?.message).toContain('got number');

      const booleanError = nodeSpecErrors.find(e => e.reference === 'tree1.invalidBoolean');
      expect(booleanError?.message).toContain('got boolean');

      const arrayError = nodeSpecErrors.find(e => e.reference === 'tree1.invalidArray');
      if (arrayError) {
        expect(arrayError.message).toContain('got object'); // Arrays are typeof 'object'
      }
    });

    it('should handle empty nodes object', () => {
      const validData = {
        trees: {
          tree1: {
            nodes: {}, // Empty but valid
          },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should validate complex tree structure with multiple trees', () => {
      const complexData = {
        statements: {
          s1: 'Statement 1',
          s2: 'Statement 2',
        },
        trees: {
          tree1: {
            offset: { x: 0, y: 0 },
            nodes: {
              n1: { arg: 'arg1' },
              n2: { n1: 'arg2', on: 0 },
            },
          },
          tree2: {
            nodes: {
              root: { arg: 'arg3' },
              child: { root: 'arg4', on: 1 },
            },
          },
          invalidTree: {
            nodes: 'invalid nodes', // Should trigger error
          },
        },
      };

      const result = validator.validateStructure(complexData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      const invalidTreeError = errors.find(
        e => e.reference === 'invalidTree' && e.message.includes('Tree nodes must be an object')
      );
      expect(invalidTreeError).toBeDefined();
    });
  });

  describe('Tree offset validation - uncovered lines coverage', () => {
    it('should reject invalid y coordinate in offset (lines 356-362)', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: {
              x: 100,
              y: 'invalid', // Should trigger lines 356-362
            },
            nodes: {
              n1: { arg: 'arg1' },
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      const offsetYError = errors.find(
        e =>
          e.type === ParseErrorType.INVALID_TREE_STRUCTURE &&
          e.message.includes('Tree offset.y must be a number')
      );
      expect(offsetYError).toBeDefined();
      expect(offsetYError!.message).toContain('got string');
      expect(offsetYError!.reference).toBe('tree1');
    });

    it('should reject both invalid x and y coordinates (lines 356-362 and 365-366)', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: {
              x: 'invalid-x',
              y: 'invalid-y',
            },
            nodes: {
              n1: { arg: 'arg1' },
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;

      const offsetXError = errors.find(e => e.message.includes('Tree offset.x must be a number'));
      const offsetYError = errors.find(e => e.message.includes('Tree offset.y must be a number'));

      expect(offsetXError).toBeDefined();
      expect(offsetYError).toBeDefined();
      expect(offsetXError!.message).toContain('got string');
      expect(offsetYError!.message).toContain('got string');
    });

    it('should handle various invalid offset types', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: {
              x: null,
              y: undefined,
            },
          },
          tree2: {
            offset: {
              x: true,
              y: [],
            },
          },
          tree3: {
            offset: {
              x: {},
              y: 42, // Valid y, invalid x
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;

      // Should have multiple offset validation errors
      const offsetErrors = errors.filter(
        e => e.message.includes('offset.') && e.message.includes('must be a number')
      );

      expect(offsetErrors.length).toBeGreaterThan(4); // At least 5 invalid coordinates
    });

    it('should allow valid offset coordinates', () => {
      const validData = {
        trees: {
          tree1: {
            offset: {
              x: 0,
              y: 0,
            },
            nodes: {
              n1: { arg: 'arg1' },
            },
          },
          tree2: {
            offset: {
              x: -100.5,
              y: 200.75,
            },
            nodes: {
              n1: { arg: 'arg2' },
            },
          },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Edge cases and error accumulation', () => {
    it('should accumulate multiple validation errors', () => {
      const invalidData = {
        statements: 'not an object',
        arguments: ['array'],
        trees: {
          tree1: {
            nodes: 'invalid',
          },
          tree2: {
            nodes: {
              n1: 'invalid node spec',
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.length).toBeGreaterThan(3); // Multiple errors should be accumulated

      // Check we have errors for different validation failures
      const hasStructureError = errors.some(e => e.type === ParseErrorType.INVALID_STRUCTURE);
      const hasTreeNodeError = errors.some(e => e.message.includes('Tree nodes must be an object'));
      const hasNodeSpecError = errors.some(e => e.message.includes('Node spec must be an object'));

      expect(hasStructureError).toBe(true);
      expect(hasTreeNodeError).toBe(true);
      expect(hasNodeSpecError).toBe(true);
    });
  });

  describe('Concise arguments validation - uncovered lines coverage', () => {
    it('should cover concise argument validation patterns (lines 635-736)', () => {
      // Test the isValidStatementId function and other validation logic
      const invalidData = {
        arguments: [
          // Test invalid premise statement IDs (lines 742-743)
          { invalid_format: ['s1'] }, // Should trigger isValidStatementId returning false
          { format_example: ['s2'] }, // Should trigger invalidPatterns check
          { test_placeholder: ['s3'] }, // Should trigger invalidPatterns check
          { example_statement: ['s4'] }, // Should trigger invalidPatterns check

          // Test valid patterns that should pass initial validation
          { valid_premise: ['s5'] },
          { s1: ['invalid_conclusion'] }, // Valid premise, invalid conclusion
        ],
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;

      // Should have multiple argument validation errors
      const argumentErrors = errors.filter(e => e.type === ParseErrorType.INVALID_ARGUMENT);
      expect(argumentErrors.length).toBeGreaterThan(0);

      // Check for specific invalid statement ID errors
      const invalidIdErrors = argumentErrors.filter(e =>
        e.message.includes('must be a valid statement ID')
      );
      expect(invalidIdErrors.length).toBeGreaterThan(0);

      // Verify specific invalid patterns are caught
      const hasInvalidFormatError = invalidIdErrors.some(e => e.message.includes('invalid_format'));
      const hasFormatExampleError = invalidIdErrors.some(e => e.message.includes('format_example'));
      const hasTestPlaceholderError = invalidIdErrors.some(e =>
        e.message.includes('test_placeholder')
      );
      const hasExampleError = invalidIdErrors.some(e => e.message.includes('example_statement'));

      expect(hasInvalidFormatError).toBe(true);
      expect(hasFormatExampleError).toBe(true);
      expect(hasTestPlaceholderError).toBe(true);
      expect(hasExampleError).toBe(true);
    });

    it('should validate statement ID patterns with edge cases', () => {
      // Test various edge cases for the isValidStatementId function
      const testCases = [
        // Should pass validation
        { validId: ['s1'] },
        { valid_id_123: ['s2'] },
        { a1: ['s3'] },

        // Should fail validation - invalid patterns
        { '123invalid': ['s4'] }, // Starts with number
        { _invalid: ['s5'] }, // Starts with underscore
        { 'invalid-format': ['s6'] }, // Contains hyphen
        { '': ['s7'] }, // Empty string
        { INVALID: ['s8'] }, // Matches /^invalid/i pattern
        { Format_Test: ['s9'] }, // Matches /^format/i pattern
        { Example_ID: ['s10'] }, // Matches /^example/i pattern
        { TEST_ID: ['s11'] }, // Matches /^test/i pattern
        { PLACEHOLDER_ID: ['s12'] }, // Matches /^placeholder/i pattern
      ];

      const invalidData = {
        arguments: testCases,
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      const invalidIdErrors = errors.filter(e =>
        e.message.includes('must be a valid statement ID')
      );

      // Should have errors for all invalid patterns
      expect(invalidIdErrors.length).toBeGreaterThan(7); // At least 8 invalid patterns
    });

    it('should handle empty premise arrays in concise format', () => {
      // Test empty premises (bootstrap case) - this exercises different code paths
      const validData = {
        arguments: [
          { '': ['s1'] }, // Empty premises (bootstrap)
          { validPremise: [] }, // Empty conclusions
        ],
      };

      const result = validator.validateStructure(validData);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure.arguments).toBeDefined();

      // Should have generated auto IDs
      const args = structure.arguments as Record<
        string,
        { premises?: string[]; conclusions?: string[] }
      >;
      expect(args['arg1']).toBeDefined();
      expect(args['arg2']).toBeDefined();

      // Check premises and conclusions
      expect(args['arg1']?.premises).toEqual([]); // Empty premises for bootstrap
      expect(args['arg1']?.conclusions).toEqual(['s1']);
      expect(args['arg2']?.premises).toEqual(['validPremise']);
      expect(args['arg2']?.conclusions).toEqual([]); // Empty conclusions
    });

    it('should validate comma-separated premises in concise format', () => {
      // Test comma-separated premise parsing
      const validData = {
        arguments: [
          { 'premise1,premise2,premise3': ['conclusion1'] }, // Comma-separated premises
          { 'premise1, premise2 , premise3 ': ['conclusion2'] }, // With spaces
          { singlePremise: ['conclusion3'] }, // Single premise
        ],
      };

      const result = validator.validateStructure(validData);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      const args = structure.arguments as Record<
        string,
        { premises?: string[]; conclusions?: string[] }
      >;

      // Check comma-separated parsing
      expect(args['arg1']?.premises).toEqual(['premise1', 'premise2', 'premise3']);
      expect(args['arg2']?.premises).toEqual(['premise1', 'premise2', 'premise3']); // Trimmed spaces
      expect(args['arg3']?.premises).toEqual(['singlePremise']);
    });

    it('should validate all conclusion validation paths', () => {
      // Test conclusion validation with various invalid patterns
      const invalidData = {
        arguments: [
          { validPremise: [123] }, // Non-string conclusion
          { validPremise2: [''] }, // Empty conclusion
          { validPremise3: ['  '] }, // Whitespace-only conclusion
          { validPremise4: ['invalid_format_conclusion'] }, // Invalid conclusion ID
        ],
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      const conclusionErrors = errors.filter(
        e => e.message.includes('Conclusion') && e.message.includes('must be a string')
      );
      const emptyErrors = errors.filter(e => e.message.includes('cannot be empty'));
      const invalidIdErrors = errors.filter(e =>
        e.message.includes('must be a valid statement ID')
      );

      expect(conclusionErrors.length).toBeGreaterThan(0);
      expect(emptyErrors.length).toBeGreaterThan(0);
      expect(invalidIdErrors.length).toBeGreaterThan(0);
    });
  });
});
