import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { type ParseError, ParseErrorType } from '../../parser/ParseError.js';
import { convertParseErrorToDiagnostic } from '../ErrorMapper.js';

// Mock VS Code API
const mockVscode = {
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  } as const,
  Position: class MockPosition {
    constructor(
      public line: number,
      public character: number,
    ) {}
  },
  Range: class MockRange {
    constructor(
      public start: any,
      public end: any,
    ) {}
  },
  Diagnostic: class MockDiagnostic {
    public source?: string;
    public code?: string;

    constructor(
      public range: any,
      public message: string,
      public severity?: number,
    ) {}
  },
} as any;

vi.doMock('vscode', () => mockVscode);

describe('ErrorMapper', () => {
  const mockDocument: vscode.TextDocument = {
    lineCount: 10,
    lineAt: (lineOrPosition: number | { line: number }) => {
      const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
      return {
        text: line === 5 ? '  os2: [s3]  # Invalid reference' : 'test line content',
        lineNumber: line,
        range: new mockVscode.Range(
          new mockVscode.Position(line, 0),
          new mockVscode.Position(line, line === 5 ? 33 : 17),
        ),
        rangeIncludingLineBreak: new mockVscode.Range(
          new mockVscode.Position(line, 0),
          new mockVscode.Position(line + 1, 0),
        ),
        firstNonWhitespaceCharacterIndex: line === 5 ? 2 : 0,
        isEmptyOrWhitespace: false,
      };
    },
  } as any;

  describe('convertParseErrorToDiagnostic', () => {
    it('should convert YAML syntax error correctly', () => {
      const error: ParseError = {
        type: ParseErrorType.YAML_SYNTAX,
        message: 'YAML syntax error: unexpected end of stream',
        line: 3,
        column: 10,
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.message).toBe(
        'Invalid document syntax: unexpected end of stream Check for missing colons, incorrect indentation, or unmatched quotes.',
      );
      expect(diagnostic.severity).toBe(mockVscode.DiagnosticSeverity.Error);
      expect(diagnostic.source).toBe('proof-editor');
      expect(diagnostic.code).toBe(ParseErrorType.YAML_SYNTAX);
    });

    it('should convert missing reference error correctly', () => {
      const error: ParseError = {
        type: ParseErrorType.MISSING_REFERENCE,
        message:
          "Statement 's3' referenced in ordered set 'os2' but not defined in statements section",
        line: 6,
        column: 8,
        reference: 's3',
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.message).toContain('referenced in statement list');
      expect(diagnostic.message).toContain('but statement not found');
      expect(diagnostic.message).toContain('Ensure all referenced items are defined');
      expect(diagnostic.severity).toBe(mockVscode.DiagnosticSeverity.Error);
    });

    it('should convert invalid statement error correctly', () => {
      const error: ParseError = {
        type: ParseErrorType.INVALID_STATEMENT,
        message: 'Failed to create statement: Statement content cannot be empty',
        line: 2,
        column: 0,
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.message).toContain('Statements cannot be empty and must contain text');
      expect(diagnostic.severity).toBe(mockVscode.DiagnosticSeverity.Warning);
    });

    it('should handle error without line/column information', () => {
      const error: ParseError = {
        type: ParseErrorType.CIRCULAR_DEPENDENCY,
        message: 'Circular dependency detected',
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.range.start.line).toBe(0);
      expect(diagnostic.range.start.character).toBe(0);
      expect(diagnostic.message).toContain('Remove circular references');
    });

    it('should handle line beyond document bounds', () => {
      const error: ParseError = {
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Invalid structure',
        line: 50, // Beyond document lineCount
        column: 5,
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.range.start.line).toBe(9); // lineCount - 1
    });

    it('should create appropriate error ranges based on reference', () => {
      const error: ParseError = {
        type: ParseErrorType.MISSING_REFERENCE,
        message: 'Reference not found',
        line: 6,
        column: 8,
        reference: 's3',
      };

      const mockDocumentWithRef = {
        ...mockDocument,
        lineAt: (lineOrPosition: number | { line: number }) => {
          const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
          return {
            text: line === 5 ? '  os2: [s3]  # s3 reference here' : 'test line',
            lineNumber: line,
            range: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line, line === 5 ? 36 : 9),
            ),
            rangeIncludingLineBreak: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line + 1, 0),
            ),
            firstNonWhitespaceCharacterIndex: line === 5 ? 2 : 0,
            isEmptyOrWhitespace: false,
          };
        },
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocumentWithRef);

      // Should find and highlight the reference
      expect(diagnostic.range).toBeDefined();
    });

    it('should apply all error type severity mappings correctly', () => {
      const errorTypes = [
        { type: ParseErrorType.YAML_SYNTAX, expectedSeverity: mockVscode.DiagnosticSeverity.Error },
        {
          type: ParseErrorType.MISSING_REFERENCE,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
        {
          type: ParseErrorType.INVALID_STATEMENT,
          expectedSeverity: mockVscode.DiagnosticSeverity.Warning,
        },
        {
          type: ParseErrorType.INVALID_STRUCTURE,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
        {
          type: ParseErrorType.CIRCULAR_DEPENDENCY,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
        {
          type: ParseErrorType.INVALID_ORDERED_SET,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
        {
          type: ParseErrorType.INVALID_ATOMIC_ARGUMENT,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
        {
          type: ParseErrorType.INVALID_TREE_STRUCTURE,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
        {
          type: ParseErrorType.DUPLICATE_ID,
          expectedSeverity: mockVscode.DiagnosticSeverity.Error,
        },
      ];

      errorTypes.forEach(({ type, expectedSeverity }) => {
        const error: ParseError = {
          type,
          message: 'Test error',
        };

        const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);
        expect(diagnostic.severity).toBe(expectedSeverity);
      });
    });

    it('should provide appropriate contextual help for each error type', () => {
      const errorTypeHelp = [
        { type: ParseErrorType.YAML_SYNTAX, expectedHelp: 'Check for missing colons' },
        { type: ParseErrorType.MISSING_REFERENCE, expectedHelp: 'Ensure all referenced items' },
        { type: ParseErrorType.INVALID_STATEMENT, expectedHelp: 'Statements cannot be empty' },
        { type: ParseErrorType.INVALID_ORDERED_SET, expectedHelp: 'Statement lists must contain' },
        { type: ParseErrorType.INVALID_ATOMIC_ARGUMENT, expectedHelp: 'Arguments must reference' },
        { type: ParseErrorType.INVALID_TREE_STRUCTURE, expectedHelp: 'Check node hierarchy' },
        { type: ParseErrorType.CIRCULAR_DEPENDENCY, expectedHelp: 'Remove circular references' },
        { type: ParseErrorType.DUPLICATE_ID, expectedHelp: 'Each identifier must be unique' },
      ];

      errorTypeHelp.forEach(({ type, expectedHelp }) => {
        const error: ParseError = {
          type,
          message: 'Test error',
        };

        const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);
        expect(diagnostic.message).toContain(expectedHelp);
      });
    });

    it('should transform technical terms to academic language', () => {
      const technicalMessages = [
        {
          input: 'referenced in ordered set but not defined in statements section',
          expectedOutput: 'referenced in statement list but statement not found',
        },
        {
          input: 'referenced as premises but not defined in orderedSets section',
          expectedOutput: 'used as premises but statement list not found',
        },
        {
          input: 'referenced as conclusions but not defined in atomicArguments section',
          expectedOutput: 'used as conclusions but argument not found',
        },
      ];

      technicalMessages.forEach(({ input, expectedOutput }) => {
        const error: ParseError = {
          type: ParseErrorType.MISSING_REFERENCE,
          message: input,
        };

        const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);
        expect(diagnostic.message).toContain(expectedOutput);
      });
    });

    it('should handle edge cases in range calculation', () => {
      const error: ParseError = {
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Test error',
        line: 1,
        column: 0,
      };

      const shortLineDocument = {
        lineCount: 5,
        lineAt: (lineOrPosition: number | { line: number }) => {
          const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
          return {
            text: line === 0 ? 'x' : 'longer line content',
            lineNumber: line,
            range: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line, line === 0 ? 1 : 19),
            ),
            rangeIncludingLineBreak: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line + 1, 0),
            ),
            firstNonWhitespaceCharacterIndex: 0,
            isEmptyOrWhitespace: false,
          };
        },
      } as any;

      const diagnostic = convertParseErrorToDiagnostic(error, shortLineDocument);

      expect(diagnostic.range.start.line).toBe(0);
      expect(diagnostic.range.end.character).toBeGreaterThan(diagnostic.range.start.character);
    });

    it('should handle unknown error types with default severity', () => {
      // Create an error with an unknown type to test the default case
      const error: ParseError = {
        type: 'unknown-error-type' as ParseErrorType,
        message: 'Unknown error type',
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.severity).toBe(mockVscode.DiagnosticSeverity.Error);
      expect(diagnostic.message).toContain('Unknown error type');
    });

    it('should handle errors with exact column positioning', () => {
      const error: ParseError = {
        type: ParseErrorType.INVALID_STATEMENT,
        message: 'Statement error',
        line: 5,
        column: 10,
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.range.start.line).toBe(4); // 0-indexed
      expect(diagnostic.range.start.character).toBe(10); // Column passed as-is
    });

    it('should handle errors without column information', () => {
      const error: ParseError = {
        type: ParseErrorType.INVALID_STATEMENT,
        message: 'Statement error',
        line: 3,
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.range.start.line).toBe(2); // 0-indexed
      expect(diagnostic.range.start.character).toBe(0);
      expect(diagnostic.range.end.character).toBeGreaterThan(0);
    });

    it('should find and highlight specific references in line text', () => {
      const error: ParseError = {
        type: ParseErrorType.MISSING_REFERENCE,
        message: 'Reference not found',
        line: 6,
        reference: 's3',
      };

      const mockDocumentWithS3 = {
        ...mockDocument,
        lineAt: (lineOrPosition: number | { line: number }) => {
          const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
          return {
            text: line === 5 ? '  orderedSets:\n    os1: [s1, s3, s2]' : 'other content',
            lineNumber: line,
            range: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line, line === 5 ? 28 : 13),
            ),
            rangeIncludingLineBreak: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line + 1, 0),
            ),
            firstNonWhitespaceCharacterIndex: line === 5 ? 2 : 0,
            isEmptyOrWhitespace: false,
          };
        },
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocumentWithS3);

      // Should find s3 in the line and create appropriate range
      expect(diagnostic.range).toBeDefined();
    });

    it('should handle references not found in line text', () => {
      const error: ParseError = {
        type: ParseErrorType.MISSING_REFERENCE,
        message: 'Reference not found',
        line: 6,
        reference: 'notInLine',
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      // Should use full line range when reference not found
      expect(diagnostic.range).toBeDefined();
      expect(diagnostic.range.start.line).toBe(5); // 0-indexed
    });

    it('should handle all INVALID_ARGUMENT error variants', () => {
      const errorTypes = [ParseErrorType.INVALID_ARGUMENT];

      errorTypes.forEach((type) => {
        const error: ParseError = {
          type,
          message: 'Argument validation failed',
        };

        const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);
        expect(diagnostic.severity).toBe(mockVscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).toContain('Arguments must reference');
      });
    });

    it('should handle section-specific error context', () => {
      const error: ParseError = {
        type: ParseErrorType.MISSING_REFERENCE,
        message: 'Referenced item not found',
        section: 'atomicArguments',
        reference: 'missing_item',
      };

      const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);

      expect(diagnostic.message).toContain('Referenced item not found');
      expect(diagnostic.message).toContain('Ensure all referenced items are defined');
    });

    it('should handle empty line content', () => {
      const emptyLineDocument = {
        lineCount: 5,
        lineAt: (lineOrPosition: number | { line: number }) => {
          const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
          return {
            text: '',
            lineNumber: line,
            range: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line, 0),
            ),
            rangeIncludingLineBreak: new mockVscode.Range(
              new mockVscode.Position(line, 0),
              new mockVscode.Position(line + 1, 0),
            ),
            firstNonWhitespaceCharacterIndex: 0,
            isEmptyOrWhitespace: true,
          };
        },
      } as any;

      const error: ParseError = {
        type: ParseErrorType.INVALID_STRUCTURE,
        message: 'Structure error',
        line: 1,
      };

      const diagnostic = convertParseErrorToDiagnostic(error, emptyLineDocument);

      expect(diagnostic.range).toBeDefined();
      expect(diagnostic.range.start.character).toBe(0);
      expect(diagnostic.range.end.character).toBe(0); // Empty line constrains end to line length
    });

    it('should handle all transformation patterns for academic language', () => {
      const transformations = [
        {
          input: 'referenced in ordered set but not defined in statements section',
          expectedOutput: 'referenced in statement list but statement not found',
        },
        {
          input: 'referenced as premises but not defined in orderedSets section',
          expectedOutput: 'used as premises but statement list not found',
        },
        {
          input: 'referenced as conclusions but not defined in atomicArguments section',
          expectedOutput: 'used as conclusions but argument not found',
        },
        {
          input: 'orderedSets section',
          expectedOutput: 'orderedSets section', // No transformation happens for this standalone phrase
        },
        {
          input: 'atomicArguments section',
          expectedOutput: 'atomicArguments section', // No transformation happens for this standalone phrase
        },
      ];

      transformations.forEach(({ input, expectedOutput }) => {
        const error: ParseError = {
          type: ParseErrorType.MISSING_REFERENCE,
          message: input,
        };

        const diagnostic = convertParseErrorToDiagnostic(error, mockDocument);
        expect(diagnostic.message).toContain(expectedOutput);
      });
    });
  });
});
