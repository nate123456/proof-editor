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
      expect(errors[0]?.type).toBe(ParseErrorType.INVALID_STRUCTURE);
      expect(errors[0]?.message).toContain('must be an object');
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

  describe('Statements validation', () => {
    it('should validate valid statements', () => {
      const validData = {
        statements: {
          s1: 'Valid statement',
          s2: 'Another valid statement',
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure.statements).toBeDefined();
      expect(structure.statements?.s1).toBe('Valid statement');
    });

    it('should reject non-object statements section', () => {
      const invalidData = {
        statements: 'not an object',
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Statements section must be an object'))).toBe(
        true,
      );
    });

    it('should reject non-string statement content', () => {
      const invalidData = {
        statements: {
          s1: 123, // Not a string
          s2: null,
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a string'))).toBe(true);
    });

    it('should reject empty statement content', () => {
      const invalidData = {
        statements: {
          s1: '',
          s2: '   ', // Only whitespace
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('cannot be empty'))).toBe(true);
    });

    it('should handle null/undefined statements section', () => {
      const nullData = { statements: null };
      const undefinedData = { statements: undefined };

      const nullResult = validator.validateStructure(nullData);
      expect(nullResult.isOk()).toBe(true);

      const undefinedResult = validator.validateStructure(undefinedData);
      expect(undefinedResult.isOk()).toBe(true);
    });
  });

  describe('OrderedSets validation', () => {
    it('should validate valid ordered sets', () => {
      const validData = {
        orderedSets: {
          os1: ['s1', 's2'],
          os2: ['s3'],
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should reject non-object ordered sets section', () => {
      const invalidData = {
        orderedSets: 'not an object',
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('OrderedSets section must be an object'))).toBe(
        true,
      );
    });

    it('should reject non-array ordered set content', () => {
      const invalidData = {
        orderedSets: {
          os1: 'not an array',
          os2: 123,
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be an array'))).toBe(true);
    });

    it('should reject non-string elements in ordered sets', () => {
      const invalidData = {
        orderedSets: {
          os1: ['s1', 123, null],
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a string'))).toBe(true);
    });

    it('should reject empty statement IDs in ordered sets', () => {
      const invalidData = {
        orderedSets: {
          os1: ['s1', '', '   '],
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('cannot be empty'))).toBe(true);
    });
  });

  describe('AtomicArguments validation', () => {
    it('should validate valid atomic arguments', () => {
      const validData = {
        atomicArguments: {
          arg1: {
            premises: 'os1',
            conclusions: 'os2',
            sideLabel: 'Modus Ponens',
          },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should reject non-object atomic arguments section', () => {
      const invalidData = {
        atomicArguments: 'not an object',
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(
        errors.some((e) => e.message.includes('AtomicArguments section must be an object')),
      ).toBe(true);
    });

    it('should reject non-object argument specs', () => {
      const invalidData = {
        atomicArguments: {
          arg1: 'not an object',
          arg2: 123,
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Atomic argument spec must be an object'))).toBe(
        true,
      );
    });

    it('should reject non-string premises/conclusions', () => {
      const invalidData = {
        atomicArguments: {
          arg1: {
            premises: 123,
            conclusions: ['not', 'string'],
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a string'))).toBe(true);
    });

    it('should reject non-string side labels', () => {
      const invalidData = {
        atomicArguments: {
          arg1: {
            sideLabel: 123,
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Side label must be a string'))).toBe(true);
    });

    it('should handle null argument specs for bootstrap', () => {
      const validData = {
        atomicArguments: {
          bootstrap: null,
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Arguments validation (new format)', () => {
    it('should validate object format arguments', () => {
      const validData = {
        arguments: {
          arg1: {
            premises: ['s1', 's2'],
            conclusions: ['s3'],
            sideLabel: 'Rule',
          },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should validate array format arguments', () => {
      const validData = {
        arguments: [{ 's1,s2': ['s3'] }, { s3: ['s4'] }],
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should reject non-object/array arguments section', () => {
      const invalidData = {
        arguments: 'not valid',
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(
        errors.some((e) => e.message.includes('Arguments section must be an object or array')),
      ).toBe(true);
    });

    it('should reject invalid premise arrays', () => {
      const invalidData = {
        arguments: {
          arg1: {
            premises: 'not an array',
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Premises must be an array'))).toBe(true);
    });

    it('should reject invalid conclusion arrays', () => {
      const invalidData = {
        arguments: {
          arg1: {
            conclusions: 'not an array',
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Conclusions must be an array'))).toBe(true);
    });

    it('should reject non-string premise elements', () => {
      const invalidData = {
        arguments: {
          arg1: {
            premises: ['s1', 123, null],
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a string'))).toBe(true);
    });

    it('should reject empty premise elements', () => {
      const invalidData = {
        arguments: {
          arg1: {
            premises: ['s1', '', '   '],
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('cannot be empty'))).toBe(true);
    });

    it('should handle null argument specs', () => {
      const validData = {
        arguments: {
          bootstrap: null,
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Concise arguments validation', () => {
    it('should validate valid concise arguments', () => {
      const validData = {
        arguments: [{ 's1,s2': ['s3'] }, { s3: ['s4'] }],
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should reject invalid concise argument structure', () => {
      const invalidData = {
        arguments: ['not an object', 123],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be an object'))).toBe(true);
    });

    it('should reject non-array conclusion values', () => {
      const invalidData = {
        arguments: [{ s1: 'not an array' }],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be an array'))).toBe(true);
    });

    it('should reject invalid statement IDs using isValidStatementId', () => {
      const invalidData = {
        arguments: [{ invalid_format: ['s1'] }, { test: ['s2'] }, { example: ['s3'] }],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a valid statement ID'))).toBe(true);
    });

    it('should reject non-string conclusion elements', () => {
      const invalidData = {
        arguments: [{ s1: ['s2', 123, null] }],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a string'))).toBe(true);
    });
  });

  describe('Trees validation', () => {
    it('should validate valid trees', () => {
      const validData = {
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

    it('should reject non-object trees section', () => {
      const invalidData = {
        trees: 'not an object',
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Trees section must be an object'))).toBe(true);
    });

    it('should reject invalid tree specs', () => {
      const invalidData = {
        trees: {
          tree1: 'not an object',
          tree2: null,
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Tree spec must be an object'))).toBe(true);
    });
  });

  describe('Tree offset validation', () => {
    it('should validate valid offsets', () => {
      const validData = {
        trees: {
          tree1: {
            offset: { x: 100, y: 200 },
          },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
    });

    it('should reject invalid offset objects', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: 'not an object',
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Tree offset must be an object'))).toBe(true);
    });

    it('should reject non-number x coordinates', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: { x: 'not a number', y: 200 },
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('offset.x must be a number'))).toBe(true);
    });

    it('should reject non-number y coordinates', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: { x: 100, y: 'not a number' },
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('offset.y must be a number'))).toBe(true);
    });

    it('should reject infinite coordinates', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a finite number'))).toBe(true);
    });

    it('should reject NaN coordinates', () => {
      const invalidData = {
        trees: {
          tree1: {
            offset: { x: Number.NaN, y: Number.NaN },
          },
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a finite number'))).toBe(true);
    });
  });

  describe('Tree nodes validation - uncovered lines coverage', () => {
    it('should reject non-object tree nodes', () => {
      const invalidData = {
        trees: {
          tree1: {
            nodes: 'not an object',
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);

      const treeNodeError = errors.find(
        (e) =>
          e.type === ParseErrorType.INVALID_TREE_STRUCTURE &&
          e.message.includes('Tree nodes must be an object'),
      );
      expect(treeNodeError).toBeDefined();
      expect(treeNodeError?.reference).toBe('tree1');
    });

    it('should reject null tree nodes', () => {
      const invalidData = {
        trees: {
          tree1: {
            nodes: null,
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Tree nodes must be an object'))).toBe(true);
    });

    it('should reject invalid node specs', () => {
      const invalidData = {
        trees: {
          tree1: {
            nodes: {
              n1: 'not an object',
              n2: null,
            },
          },
        },
      };

      const result = validator.validateStructure(invalidData);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Node spec must be an object'))).toBe(true);
    });
  });

  describe('Proof section validation', () => {
    it('should validate valid proof section', () => {
      const validData = {
        proof: {
          n1: { arg: 'arg1' },
          n2: { n1: 'arg2', on: 0 },
        },
      };

      const result = validator.validateStructure(validData);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure.trees).toBeDefined();
      expect(structure.trees?.proof).toBeDefined();
    });

    it('should handle null/undefined proof section', () => {
      const nullData = { proof: null };
      const undefinedData = { proof: undefined };

      const nullResult = validator.validateStructure(nullData);
      expect(nullResult.isOk()).toBe(true);

      const undefinedResult = validator.validateStructure(undefinedData);
      expect(undefinedResult.isOk()).toBe(true);
    });

    it('should reject non-object proof section', () => {
      const invalidData = {
        proof: 'not an object',
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Proof section must be an object'))).toBe(true);
    });

    it('should reject invalid proof node specs', () => {
      const invalidData = {
        proof: {
          n1: 'not an object',
          n2: null,
        },
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('Node spec must be an object'))).toBe(true);
    });
  });

  describe('Statement ID validation', () => {
    it('should validate valid statement IDs', () => {
      const validIds = ['s1', 's2', 'premise1', 'conclusion1', 'arg1', 'validId'];

      // Create a validator instance to access the private method
      const validator = new YAMLValidator();

      validIds.forEach((id) => {
        // We test this indirectly through concise arguments validation
        const validData = {
          arguments: [{ [id]: ['s1'] }],
        };

        const result = validator.validateStructure(validData);
        // Should not have statement ID validation errors
        if (result.isErr()) {
          const errors = result.error;
          const hasStatementIdError = errors.some((e) =>
            e.message.includes('must be a valid statement ID'),
          );
          expect(hasStatementIdError).toBe(false);
        }
      });
    });

    it('should reject empty statement IDs', () => {
      const invalidData = {
        arguments: [{ '': ['s1'] }],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(
        errors.some(
          (e) =>
            e.message.includes('must be a valid statement ID') ||
            e.message.includes('Empty premises'),
        ),
      ).toBe(true);
    });

    it('should reject non-alphanumeric statement IDs', () => {
      const invalidData = {
        arguments: [{ '@invalid': ['s1'] }, { 'invalid-id': ['s2'] }, { '123invalid': ['s3'] }],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a valid statement ID'))).toBe(true);
    });

    it('should reject placeholder-like statement IDs', () => {
      const invalidData = {
        arguments: [
          { invalid: ['s1'] },
          { format: ['s2'] },
          { example: ['s3'] },
          { test: ['s4'] },
          { placeholder: ['s5'] },
        ],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a valid statement ID'))).toBe(true);
    });
  });

  describe('Edge cases for maximum coverage', () => {
    it('should handle null trees section to cover early return (lines 640-641)', () => {
      const dataWithNullTrees = {
        statements: { s1: 'Statement 1' },
        trees: null,
      };

      const result = validator.validateStructure(dataWithNullTrees);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      // Should return empty trees object for null trees section
      const structure = result.value;
      expect(structure.trees).toEqual({});
    });

    it('should handle undefined trees section to cover early return', () => {
      const dataWithUndefinedTrees = {
        statements: { s1: 'Statement 1' },
        trees: undefined,
      };

      const result = validator.validateStructure(dataWithUndefinedTrees);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      // When trees is undefined, it's omitted from the result structure
      expect(structure.trees).toBeUndefined();
    });

    it('should cover empty string check in isValidStatementId (lines 834-835)', () => {
      // Create a scenario that would trigger the length === 0 check
      // This happens in the concise format validation
      const invalidData = {
        arguments: [
          { '': ['s1'] }, // Empty key should trigger the length check
        ],
      };

      const result = validator.validateStructure(invalidData);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      // Should have validation errors about empty statement IDs or bootstrap format
      expect(
        errors.some(
          (e) =>
            e.message.includes('must be a valid statement ID') ||
            e.message.includes('Empty premises') ||
            e.message.includes('bootstrap'),
        ),
      ).toBe(true);
    });

    it('should handle complex statement ID patterns to maximize coverage', () => {
      // Test various edge cases in statement ID validation
      const complexData = {
        statements: {
          a: 'Valid single letter',
          z99: 'Valid alphanumeric',
          premise_1: 'Valid with underscore',
          conclusion_data: 'Valid compound',
          A123_test: 'Valid mixed case',
        },
        arguments: [
          { a: ['z99'] },
          { 'premise_1,conclusion_data': ['A123_test'] },
          { A123_test: ['a'] },
        ],
      };

      const result = validator.validateStructure(complexData);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure.statements).toBeDefined();
      expect(Object.keys(structure.statements || {})).toHaveLength(5);
      expect(structure.arguments).toBeDefined();
      expect(Object.keys(structure.arguments || {})).toHaveLength(3);
    });

    it('should handle malformed "from:to" position formats', () => {
      // Test edge cases in parsing position strings that might not be properly formatted
      const dataWithMalformedPositions = {
        arguments: [
          { 'malformed:': ['s1'] }, // Malformed "from:to" with missing to
          { ':malformed': ['s1'] }, // Malformed "from:to" with missing from
          { 'a:b:c': ['s1'] }, // Too many colons
          { not_colon_separated: ['s1'] }, // No colon, should be treated as single premise
        ],
      };

      const result = validator.validateStructure(dataWithMalformedPositions);
      expect(result.isErr()).toBe(true);
      if (result.isOk()) return;

      const errors = result.error;
      expect(errors.some((e) => e.message.includes('must be a valid statement ID'))).toBe(true);
    });

    it('should handle very large statement counts for performance testing', () => {
      // Test with many statements to ensure validator performance
      const statements: Record<string, string> = {};
      const orderedSets: Record<string, string[]> = {};
      const args: Array<Record<string, string[]>> = [];

      // Generate 200 statements
      for (let i = 1; i <= 200; i++) {
        statements[`s${i}`] = `Statement ${i}`;
      }

      // Generate 100 ordered sets
      for (let i = 1; i <= 100; i++) {
        orderedSets[`os${i}`] = [`s${i}`, `s${i + 100}`];
      }

      // Generate 50 concise arguments
      for (let i = 1; i <= 50; i++) {
        args.push({ [`s${i},s${i + 50}`]: [`s${i + 100}`] });
      }

      const largeData = {
        statements,
        orderedSets,
        arguments: args,
      };

      const result = validator.validateStructure(largeData);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(Object.keys(structure.statements || {})).toHaveLength(200);
      expect(Object.keys(structure.orderedSets || {})).toHaveLength(100);
      expect(Object.keys(structure.arguments || {})).toHaveLength(50);
    });

    it('should handle mixed format validation with edge cases', () => {
      // Test a document that combines all possible formats and edge cases
      const mixedData = {
        statements: {
          s1: 'Basic statement',
          unicode_stmt: 'Unicode: ∀x∃y(P(x) → Q(y)) 🔬',
          long_stmt: 'A'.repeat(1000), // Long but not too long
        },
        orderedSets: {
          os1: ['s1'],
          empty_os: [], // Empty ordered set
          unicode_os: ['unicode_stmt'],
        },
        atomicArguments: {
          basic_arg: {
            premises: 'os1',
            conclusions: 'unicode_os',
          },
          bootstrap_atomic: null, // Bootstrap format
          side_labeled: {
            premises: 'os1',
            sideLabel: 'Custom Rule',
          },
        },
        arguments: {
          new_format: {
            premises: ['s1'],
            conclusions: ['unicode_stmt'],
            sideLabel: 'New Format Rule',
          },
          bootstrap_new: {
            premises: [],
            conclusions: [],
          },
        },
        trees: {
          main_tree: {
            offset: { x: 0, y: 0 },
            nodes: {
              root: { arg: 'basic_arg' },
              child: { root: 'side_labeled', on: 0 },
            },
          },
          minimal_tree: {
            nodes: {
              single: { arg: 'bootstrap_atomic' },
            },
          },
        },
        proof: {
          simple_proof: { arg: 'new_format' },
        },
      };

      const result = validator.validateStructure(mixedData);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure.statements).toBeDefined();
      expect(structure.orderedSets).toBeDefined();
      expect(structure.atomicArguments).toBeDefined();
      expect(structure.arguments).toBeDefined();
      expect(structure.trees).toBeDefined();

      // Verify proof section was converted to trees format
      expect(structure.trees?.proof).toBeDefined();
      expect(structure.trees?.proof?.nodes).toBeDefined();
    });

    it('should handle extreme edge cases and boundary conditions', () => {
      // Test various boundary conditions and extreme cases
      const extremeData = {
        statements: {
          min: 'a', // Minimal valid statement
          max: 'A'.repeat(9999), // Large but valid statement
          symbols: '!@#$%^&*()[]{}|\\:";\'<>?,./', // Special characters
          mixed: 'Normal text with 数字 and עברית and العربية', // Multi-language
        },
        orderedSets: {
          single: ['min'], // Single element
          large: Array.from({ length: 100 }, (_, _i) => 'min'), // Repeated elements
        },
        atomicArguments: {
          minimal: {}, // Completely empty argument spec
          partial: { premises: 'single' }, // Only premises
          full: {
            premises: 'single',
            conclusions: 'large',
            sideLabel: 'Complete Argument',
          },
        },
        arguments: [
          { min: ['max'] }, // Simple concise format
          { 'min,max': ['symbols'] }, // Multiple premises
          { '': [] }, // Empty bootstrap
        ],
        trees: {
          positioned: {
            offset: { x: -999999.99, y: 999999.99 }, // Extreme coordinates
            nodes: {
              extreme: { arg: 'minimal' },
            },
          },
        },
      };

      const result = validator.validateStructure(extremeData);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const structure = result.value;
      expect(structure).toBeDefined();
      expect(Object.keys(structure.statements || {})).toHaveLength(4);
      expect(Object.keys(structure.orderedSets || {})).toHaveLength(2);
      expect(Object.keys(structure.atomicArguments || {})).toHaveLength(3);
      expect(Object.keys(structure.arguments || {})).toHaveLength(3);
      expect(Object.keys(structure.trees || {})).toHaveLength(1);
    });
  });
});
