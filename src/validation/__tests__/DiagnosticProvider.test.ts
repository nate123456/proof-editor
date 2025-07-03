import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { ParseErrorType } from '../../parser/ParseError.js';
import { ProofFileParser } from '../../parser/ProofFileParser.js';
import { YAMLValidator } from '../../parser/YAMLValidator.js';
import { ProofDiagnosticProvider } from '../DiagnosticProvider.js';

describe('ProofDiagnosticProvider', () => {
  let provider: ProofDiagnosticProvider;
  let mockDocument: vscode.TextDocument;
  let mockDiagnosticCollection: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the mock diagnostic collection that will be returned
    mockDiagnosticCollection = {
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    };

    // Make createDiagnosticCollection return our mock
    vi.mocked(vscode.languages.createDiagnosticCollection).mockReturnValue(
      mockDiagnosticCollection,
    );

    mockDocument = {
      languageId: 'proof',
      uri: { toString: () => 'file:///test.proof' } as any,
      getText: () => `statements:
  s1: "All men are mortal"
  s2: "Socrates is a man"

orderedSets:
  os1: [s1, s2]
  os2: [s3]  # Invalid reference

atomicArguments:
  arg1:
    premises: os1
    conclusions: os2`,
      lineCount: 10,
      lineAt: (lineOrPosition: number | { line: number }) => {
        const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
        return {
          text: line === 6 ? '  os2: [s3]  # Invalid reference' : 'test line',
          lineNumber: line,
          range: new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, line === 6 ? 32 : 9),
          ),
          rangeIncludingLineBreak: new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line + 1, 0),
          ),
          firstNonWhitespaceCharacterIndex: line === 6 ? 2 : 0,
          isEmptyOrWhitespace: false,
        };
      },
    } as any;

    const parser = new ProofFileParser(new YAMLValidator());
    provider = new ProofDiagnosticProvider(parser);
  });

  describe('constructor', () => {
    it('should create diagnostic collection with correct name', () => {
      expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('proof');
    });

    it('should initialize parser', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('validateDocument', () => {
    it('should skip validation for non-proof documents', () => {
      const nonProofDocument = { ...mockDocument, languageId: 'typescript' };

      provider.validateDocument(nonProofDocument);

      expect(mockDiagnosticCollection.delete).not.toHaveBeenCalled();
      expect(mockDiagnosticCollection.set).not.toHaveBeenCalled();
    });

    it('should clear existing diagnostics before validation', () => {
      provider.validateDocument(mockDocument);

      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockDocument.uri);
    });

    it('should set diagnostics when parse errors occur', () => {
      // Document with YAML syntax error
      const invalidYamlDocument = {
        ...mockDocument,
        getText: () => 'invalid: yaml: content: [',
      };

      provider.validateDocument(invalidYamlDocument);

      expect(mockDiagnosticCollection.set).toHaveBeenCalledWith(
        invalidYamlDocument.uri,
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('syntax'),
            severity: vscode.DiagnosticSeverity.Error,
          }),
        ]),
      );
    });

    it('should not set diagnostics when parsing succeeds', () => {
      const validDocument = {
        ...mockDocument,
        getText: () => `statements:
  s1: "All men are mortal"
  s2: "Socrates is a man"

orderedSets:
  os1: [s1, s2]

atomicArguments:
  arg1:
    premises: os1`,
      };

      provider.validateDocument(validDocument);

      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(validDocument.uri);
      expect(mockDiagnosticCollection.set).not.toHaveBeenCalled();
    });

    it('should handle multiple parse errors correctly', () => {
      // Document with multiple validation errors
      const multiErrorDocument = {
        ...mockDocument,
        getText: () => `statements:
  s1: "Valid statement"

orderedSets:
  os1: [s999]  # Missing reference
  os2: [s888]  # Another missing reference

atomicArguments:
  arg1:
    premises: os1
    conclusions: os777  # Missing reference`,
      };

      provider.validateDocument(multiErrorDocument);

      expect(mockDiagnosticCollection.set).toHaveBeenCalledWith(
        multiErrorDocument.uri,
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('referenced'),
          }),
        ]),
      );
    });
  });

  describe('clearDiagnostics', () => {
    it('should clear diagnostics for specific document', () => {
      provider.clearDiagnostics(mockDocument);

      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockDocument.uri);
    });
  });

  describe('clearAllDiagnostics', () => {
    it('should clear all diagnostics', () => {
      provider.clearAllDiagnostics();

      expect(mockDiagnosticCollection.clear).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose diagnostic collection', () => {
      provider.dispose();

      expect(mockDiagnosticCollection.dispose).toHaveBeenCalled();
    });
  });

  describe('error conversion', () => {
    it('should convert different error types to appropriate diagnostic properties', () => {
      const documentWithMissingRef = {
        ...mockDocument,
        getText: () => `statements:
  s1: "Test"

orderedSets:
  os1: [s999]  # Missing reference`,
      };

      provider.validateDocument(documentWithMissingRef);

      expect(mockDiagnosticCollection.set).toHaveBeenCalledWith(
        documentWithMissingRef.uri,
        expect.arrayContaining([
          expect.objectContaining({
            source: 'proof-editor',
            code: ParseErrorType.MISSING_REFERENCE,
            severity: vscode.DiagnosticSeverity.Error,
          }),
        ]),
      );
    });
  });

  describe('error positioning', () => {
    it('should create diagnostics with proper range information', () => {
      const documentWithError = {
        ...mockDocument,
        getText: () => 'invalid: yaml: [',
        lineAt: (lineOrPosition: number | { line: number }) => {
          const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
          return {
            text: line === 0 ? 'invalid: yaml: [' : '',
            lineNumber: line,
            range: new vscode.Range(
              new vscode.Position(line, 0),
              new vscode.Position(line, line === 0 ? 16 : 0),
            ),
            rangeIncludingLineBreak: new vscode.Range(
              new vscode.Position(line, 0),
              new vscode.Position(line + 1, 0),
            ),
            firstNonWhitespaceCharacterIndex: 0,
            isEmptyOrWhitespace: line !== 0,
          };
        },
      };

      provider.validateDocument(documentWithError);

      const setCall = mockDiagnosticCollection.set.mock.calls[0];
      if (setCall) {
        const diagnostics = setCall[1] as any[];
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toHaveProperty('range');
      }
    });
  });
});
