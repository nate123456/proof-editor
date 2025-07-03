import { describe, expect, it } from 'vitest';

import { type ParseError, ParseErrorType, ParseFailureError } from '../ParseError.js';

describe('ParseError', () => {
  describe('ParseFailureError', () => {
    it('should create error with multiple parse errors', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'YAML syntax error',
          line: 5,
          column: 10,
        },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Missing reference s1',
          section: 'orderedSets',
          reference: 'os1',
        },
      ];

      const parseError = new ParseFailureError(errors);

      expect(parseError.name).toBe('ParseFailureError');
      expect(parseError.getAllErrors()).toHaveLength(2);
      expect(parseError.hasErrorType(ParseErrorType.YAML_SYNTAX)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.MISSING_REFERENCE)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.INVALID_STATEMENT)).toBe(false);
    });

    it('should get errors by type', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Syntax error 1',
        },
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Syntax error 2',
        },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Missing ref',
        },
      ];

      const parseError = new ParseFailureError(errors);

      const syntaxErrors = parseError.getErrorsByType(ParseErrorType.YAML_SYNTAX);
      expect(syntaxErrors).toHaveLength(2);
      expect(syntaxErrors[0]!.message).toBe('Syntax error 1');
      expect(syntaxErrors[1]!.message).toBe('Syntax error 2');

      const refErrors = parseError.getErrorsByType(ParseErrorType.MISSING_REFERENCE);
      expect(refErrors).toHaveLength(1);
      expect(refErrors[0]!.message).toBe('Missing ref');
    });

    it('should format errors as readable string', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Invalid YAML syntax',
          line: 5,
          column: 12,
        },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Statement s1 not found',
          section: 'orderedSets',
          reference: 'os1',
        },
        {
          type: ParseErrorType.INVALID_STATEMENT,
          message: 'Empty statement content',
          section: 'statements',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toContain('yaml-syntax: Invalid YAML syntax (line 5, col 12)');
      expect(formatted).toContain('missing-reference: Statement s1 not found in orderedSets');
      expect(formatted).toContain('invalid-statement: Empty statement content in statements');
    });

    it('should handle errors without line/column information', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.INVALID_STRUCTURE,
          message: 'Invalid structure',
          section: 'root',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('invalid-structure: Invalid structure in root');
    });

    it('should create error message from first error', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'First error',
        },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Second error',
        },
      ];

      const parseError = new ParseFailureError(errors);

      expect(parseError.message).toBe('Parse failed with 2 error(s): First error');
    });

    it('should handle empty errors array', () => {
      const parseError = new ParseFailureError([]);

      expect(parseError.getAllErrors()).toHaveLength(0);
      expect(parseError.message).toBe('Parse failed with 0 error(s): undefined');
      expect(parseError.toFormattedString()).toBe('');
      expect(parseError.hasErrorType(ParseErrorType.YAML_SYNTAX)).toBe(false);
      expect(parseError.getErrorsByType(ParseErrorType.YAML_SYNTAX)).toHaveLength(0);
    });

    it('should handle error with only line number', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Syntax error',
          line: 10,
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('yaml-syntax: Syntax error (line 10)');
    });

    it('should handle error with line and column', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Syntax error',
          line: 10,
          column: 5,
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('yaml-syntax: Syntax error (line 10, col 5)');
    });

    it('should handle error with section but no line info', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.INVALID_STATEMENT,
          message: 'Invalid statement',
          section: 'statements',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('invalid-statement: Invalid statement in statements');
    });

    it('should handle error with reference but no section', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Missing reference',
          reference: 'ref1',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('missing-reference: Missing reference');
    });

    it('should handle all error types correctly', () => {
      const allTypes = [
        ParseErrorType.YAML_SYNTAX,
        ParseErrorType.MISSING_REFERENCE,
        ParseErrorType.INVALID_STATEMENT,
        ParseErrorType.INVALID_STRUCTURE,
        ParseErrorType.CIRCULAR_DEPENDENCY,
        ParseErrorType.INVALID_ARGUMENT,
        ParseErrorType.INVALID_ORDERED_SET,
        ParseErrorType.INVALID_ATOMIC_ARGUMENT,
        ParseErrorType.INVALID_TREE_STRUCTURE,
        ParseErrorType.DUPLICATE_ID,
      ];

      const errors: ParseError[] = allTypes.map((type, index) => ({
        type,
        message: `Error message ${index}`,
      }));

      const parseError = new ParseFailureError(errors);

      allTypes.forEach(type => {
        expect(parseError.hasErrorType(type)).toBe(true);
        expect(parseError.getErrorsByType(type)).toHaveLength(1);
      });

      expect(parseError.getAllErrors()).toHaveLength(allTypes.length);
    });

    it('should be instance of Error', () => {
      const parseError = new ParseFailureError([]);

      expect(parseError).toBeInstanceOf(Error);
      expect(parseError.name).toBe('ParseFailureError');
    });

    it('should maintain immutability of errors array', () => {
      const originalErrors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Original error',
        },
      ];

      const parseError = new ParseFailureError(originalErrors);
      const retrievedErrors = parseError.getAllErrors();

      // Modify original array
      originalErrors.push({
        type: ParseErrorType.MISSING_REFERENCE,
        message: 'New error',
      });

      // Retrieved errors should not be affected
      expect(retrievedErrors).toHaveLength(1);
      expect(parseError.getAllErrors()).toHaveLength(1);
    });

    it('should handle large number of errors efficiently', () => {
      const errors: ParseError[] = [];
      for (let i = 0; i < 1000; i++) {
        errors.push({
          type: ParseErrorType.INVALID_STATEMENT,
          message: `Error ${i}`,
          line: i,
          section: 'statements',
        });
      }

      const parseError = new ParseFailureError(errors);

      expect(parseError.getAllErrors()).toHaveLength(1000);
      expect(parseError.getErrorsByType(ParseErrorType.INVALID_STATEMENT)).toHaveLength(1000);
      expect(parseError.hasErrorType(ParseErrorType.INVALID_STATEMENT)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.YAML_SYNTAX)).toBe(false);
    });

    it('should handle special characters in error messages', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.INVALID_STATEMENT,
          message: 'Error with "quotes" and \'apostrophes\'',
        },
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Error with\nnewlines\tand\ttabs',
        },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Error with unicode: 🚀 ✨ 🎯',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toContain('Error with "quotes" and \'apostrophes\'');
      expect(formatted).toContain('Error with\nnewlines\tand\ttabs');
      expect(formatted).toContain('Error with unicode: 🚀 ✨ 🎯');
    });

    it('should handle complex error combinations', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'YAML parsing failed',
          line: 1,
          column: 1,
        },
        {
          type: ParseErrorType.INVALID_STRUCTURE,
          message: 'Document structure is invalid',
          section: 'root',
        },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          message: 'Referenced statement not found',
          section: 'orderedSets',
          reference: 'os1',
        },
        {
          type: ParseErrorType.CIRCULAR_DEPENDENCY,
          message: 'Circular dependency detected',
          line: 15,
          section: 'arguments',
        },
        {
          type: ParseErrorType.DUPLICATE_ID,
          message: 'Duplicate statement ID found',
          line: 20,
          column: 5,
          section: 'statements',
          reference: 's1',
        },
      ];

      const parseError = new ParseFailureError(errors);

      expect(parseError.getAllErrors()).toHaveLength(5);
      expect(parseError.hasErrorType(ParseErrorType.YAML_SYNTAX)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.INVALID_STRUCTURE)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.MISSING_REFERENCE)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.CIRCULAR_DEPENDENCY)).toBe(true);
      expect(parseError.hasErrorType(ParseErrorType.DUPLICATE_ID)).toBe(true);

      const formatted = parseError.toFormattedString();
      expect(formatted.split('\n')).toHaveLength(5);
      expect(formatted).toContain('yaml-syntax: YAML parsing failed (line 1, col 1)');
      expect(formatted).toContain('invalid-structure: Document structure is invalid in root');
      expect(formatted).toContain(
        'missing-reference: Referenced statement not found in orderedSets'
      );
      expect(formatted).toContain(
        'circular-dependency: Circular dependency detected (line 15) in arguments'
      );
      expect(formatted).toContain(
        'duplicate-id: Duplicate statement ID found (line 20, col 5) in statements'
      );
    });

    it('should access errors through the getter property (line 38-39)', () => {
      // This test covers the uncovered lines 38-39 in ParseError.ts
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Test error',
        },
      ];

      const parseError = new ParseFailureError(errors);

      // Access through getter property (not getAllErrors method)
      const errorList = parseError.errors;
      expect(errorList).toHaveLength(1);
      expect(errorList[0]?.message).toBe('Test error');
      expect(errorList).toBe(parseError.getAllErrors()); // Should be the same reference
    });
  });

  describe('ParseErrorType enum', () => {
    it('should have all expected error types', () => {
      const expectedTypes = [
        'yaml-syntax',
        'missing-reference',
        'invalid-statement',
        'invalid-structure',
        'circular-dependency',
        'invalid-argument',
        'invalid-ordered-set',
        'invalid-atomic-argument',
        'invalid-tree-structure',
        'duplicate-id',
      ];

      const actualTypes = Object.values(ParseErrorType);
      expect(actualTypes).toEqual(expectedTypes);
    });

    it('should have unique values', () => {
      const values = Object.values(ParseErrorType);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('ParseError interface', () => {
    it('should support minimal required fields', () => {
      const minimalError: ParseError = {
        type: ParseErrorType.YAML_SYNTAX,
        message: 'Minimal error',
      };

      expect(minimalError.type).toBe(ParseErrorType.YAML_SYNTAX);
      expect(minimalError.message).toBe('Minimal error');
      expect(minimalError.line).toBeUndefined();
      expect(minimalError.column).toBeUndefined();
      expect(minimalError.section).toBeUndefined();
      expect(minimalError.reference).toBeUndefined();
    });

    it('should support all optional fields', () => {
      const fullError: ParseError = {
        type: ParseErrorType.MISSING_REFERENCE,
        message: 'Complete error',
        line: 10,
        column: 5,
        section: 'statements',
        reference: 's1',
      };

      expect(fullError.type).toBe(ParseErrorType.MISSING_REFERENCE);
      expect(fullError.message).toBe('Complete error');
      expect(fullError.line).toBe(10);
      expect(fullError.column).toBe(5);
      expect(fullError.section).toBe('statements');
      expect(fullError.reference).toBe('s1');
    });
  });
});

describe('ParseError Edge Cases', () => {
  describe('error message construction', () => {
    it('should handle undefined first error in message', () => {
      // This tests the edge case where errors array is empty
      const parseError = new ParseFailureError([]);
      expect(parseError.message).toContain('undefined');
    });

    it('should create proper error message with single error', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Single error message',
        },
      ];

      const parseError = new ParseFailureError(errors);
      expect(parseError.message).toBe('Parse failed with 1 error(s): Single error message');
    });
  });

  describe('error filtering edge cases', () => {
    it('should return empty array when no errors match type', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'YAML error',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const missingRefErrors = parseError.getErrorsByType(ParseErrorType.MISSING_REFERENCE);

      expect(missingRefErrors).toHaveLength(0);
      expect(Array.isArray(missingRefErrors)).toBe(true);
    });

    it('should handle mixed error types correctly', () => {
      const errors: ParseError[] = [
        { type: ParseErrorType.YAML_SYNTAX, message: 'Error 1' },
        { type: ParseErrorType.MISSING_REFERENCE, message: 'Error 2' },
        { type: ParseErrorType.YAML_SYNTAX, message: 'Error 3' },
        { type: ParseErrorType.INVALID_STATEMENT, message: 'Error 4' },
        { type: ParseErrorType.YAML_SYNTAX, message: 'Error 5' },
      ];

      const parseError = new ParseFailureError(errors);

      expect(parseError.getErrorsByType(ParseErrorType.YAML_SYNTAX)).toHaveLength(3);
      expect(parseError.getErrorsByType(ParseErrorType.MISSING_REFERENCE)).toHaveLength(1);
      expect(parseError.getErrorsByType(ParseErrorType.INVALID_STATEMENT)).toHaveLength(1);
      expect(parseError.getErrorsByType(ParseErrorType.CIRCULAR_DEPENDENCY)).toHaveLength(0);
    });
  });

  describe('formatting edge cases', () => {
    it('should handle zero line and column numbers', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.YAML_SYNTAX,
          message: 'Error at start',
          line: 0,
          column: 0,
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('yaml-syntax: Error at start (line 0, col 0)');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const errors: ParseError[] = [
        {
          type: ParseErrorType.INVALID_STATEMENT,
          message: longMessage,
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toContain(longMessage);
      expect(formatted.length).toBeGreaterThan(1000);
    });

    it('should handle empty string messages', () => {
      const errors: ParseError[] = [
        {
          type: ParseErrorType.INVALID_STATEMENT,
          message: '',
        },
      ];

      const parseError = new ParseFailureError(errors);
      const formatted = parseError.toFormattedString();

      expect(formatted).toBe('invalid-statement: ');
    });
  });
});
