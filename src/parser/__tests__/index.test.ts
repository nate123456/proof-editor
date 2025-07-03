import { describe, expect, it } from 'vitest';

import * as parserIndex from '../index.js';
import { ParseFailureError } from '../ParseError.js';
import { ProofFileParser } from '../ProofFileParser.js';
import { YAMLValidator } from '../YAMLValidator.js';

describe('Parser Index Exports', () => {
  it('should export ParseError type and related classes', () => {
    expect(parserIndex.ParseErrorType).toBeDefined();
    expect(parserIndex.ParseFailureError).toBeDefined();

    // Verify ParseErrorType enum values are accessible
    expect(parserIndex.ParseErrorType.YAML_SYNTAX).toBe('yaml-syntax');
    expect(parserIndex.ParseErrorType.INVALID_STRUCTURE).toBe('invalid-structure');
    expect(parserIndex.ParseErrorType.MISSING_REFERENCE).toBe('missing-reference');
    expect(parserIndex.ParseErrorType.INVALID_STATEMENT).toBe('invalid-statement');
    expect(parserIndex.ParseErrorType.INVALID_ORDERED_SET).toBe('invalid-ordered-set');
    expect(parserIndex.ParseErrorType.INVALID_ATOMIC_ARGUMENT).toBe('invalid-atomic-argument');
    expect(parserIndex.ParseErrorType.INVALID_TREE_STRUCTURE).toBe('invalid-tree-structure');
  });

  it('should export ProofFileParser class', () => {
    expect(parserIndex.ProofFileParser).toBeDefined();
    expect(parserIndex.ProofFileParser).toBe(ProofFileParser);

    // Verify it can be instantiated with required dependency
    const validator = new YAMLValidator();
    const parser = new parserIndex.ProofFileParser(validator);
    expect(parser).toBeInstanceOf(ProofFileParser);
    expect(typeof parser.parseProofFile).toBe('function');
  });

  it('should export ParseFailureError class with proper functionality', () => {
    expect(parserIndex.ParseFailureError).toBeDefined();
    expect(parserIndex.ParseFailureError).toBe(ParseFailureError);

    // Verify it can be instantiated and used
    const error = new parserIndex.ParseFailureError([
      {
        type: parserIndex.ParseErrorType.YAML_SYNTAX,
        message: 'Test error message',
      },
    ]);

    expect(error).toBeInstanceOf(ParseFailureError);
    expect(error.message).toContain('Test error message');
    expect(error.hasErrorType(parserIndex.ParseErrorType.YAML_SYNTAX)).toBe(true);
  });

  it('should provide type exports that are accessible', () => {
    // This test verifies that type exports are properly exported
    // TypeScript will catch if types aren't properly exported

    // We can't directly test types at runtime, but we can ensure
    // the module structure supports the type exports
    const moduleKeys = Object.keys(parserIndex);
    expect(moduleKeys).toContain('ParseErrorType');
    expect(moduleKeys).toContain('ParseFailureError');
    expect(moduleKeys).toContain('ProofFileParser');
  });

  it('should export all expected members', () => {
    // Comprehensive check that all exports are present
    expect(parserIndex).toHaveProperty('ParseErrorType');
    expect(parserIndex).toHaveProperty('ParseFailureError');
    expect(parserIndex).toHaveProperty('ProofFileParser');

    // Ensure no unexpected exports
    const expectedExports = ['ParseErrorType', 'ParseFailureError', 'ProofFileParser'];
    const actualExports = Object.keys(parserIndex);

    // All expected exports should be present
    expectedExports.forEach((exportName) => {
      expect(actualExports).toContain(exportName);
    });

    // No extra exports should be present (keeps API clean)
    expect(actualExports).toHaveLength(expectedExports.length);
  });

  it('should re-export functionality works correctly', () => {
    // Test that re-exported functionality works as expected
    const parser = new parserIndex.ProofFileParser(new YAMLValidator());

    // Test with invalid YAML to trigger ParseFailureError
    const invalidYaml = 'invalid: yaml: content: [';
    const result = parser.parseProofFile(invalidYaml);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;

    expect(result.error).toBeInstanceOf(parserIndex.ParseFailureError);
    expect(result.error.hasErrorType(parserIndex.ParseErrorType.YAML_SYNTAX)).toBe(true);
  });
});
