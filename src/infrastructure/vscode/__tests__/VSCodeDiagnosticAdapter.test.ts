import { err, ok } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { ProofFileParser } from '../../../parser/ProofFileParser.js';
import { VSCodeDiagnosticAdapter } from '../VSCodeDiagnosticAdapter.js';

// Mock vscode module
vi.mock('vscode', () => ({
  languages: {
    createDiagnosticCollection: vi.fn(),
  },
  Uri: {
    parse: vi.fn(),
  },
  Range: vi.fn(),
  Position: vi.fn(),
  Diagnostic: vi.fn(),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
}));

// Mock error mapper
vi.mock('../../../validation/ErrorMapper.js', () => ({
  convertParseErrorToDiagnostic: vi.fn(),
}));

describe('VSCodeDiagnosticAdapter', () => {
  let adapter: VSCodeDiagnosticAdapter;
  let mockParser: Partial<ProofFileParser>;
  let mockDiagnosticCollection: any;
  let mockUri: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock diagnostic collection
    mockDiagnosticCollection = {
      delete: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    };
    (vscode.languages.createDiagnosticCollection as any).mockReturnValue(mockDiagnosticCollection);

    // Setup mock URI
    mockUri = {};
    (vscode.Uri.parse as any).mockReturnValue(mockUri);

    // Setup mock parser
    mockParser = {
      parseProofFile: vi.fn(),
    };

    // Create adapter instance
    adapter = new VSCodeDiagnosticAdapter(mockParser as ProofFileParser);
  });

  afterEach(() => {
    adapter.dispose();
  });

  describe('constructor', () => {
    it('should create diagnostic collection with correct name', () => {
      expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('proof');
    });

    it('should inject parser dependency', () => {
      expect(adapter).toBeDefined();
      expect(mockParser).toBeDefined();
    });
  });

  describe('validateDocument', () => {
    const testDocumentUri = 'file:///test.proof';
    const testContent = 'test content';

    it('should return success when document parsing succeeds', async () => {
      // Arrange
      (mockParser.parseProofFile as any).mockReturnValue(ok({} as any));

      // Act
      const result = await adapter.validateDocument(testDocumentUri, testContent);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockParser.parseProofFile).toHaveBeenCalledWith(testContent);
      expect(vscode.Uri.parse).toHaveBeenCalledWith(testDocumentUri);
      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockUri);
    });

    it('should set diagnostics when parsing fails', async () => {
      // Arrange
      const mockParseError = {
        getAllErrors: vi.fn().mockReturnValue([{ message: 'Test error', line: 1, column: 1 }]),
      };

      (mockParser.parseProofFile as any).mockReturnValue(err(mockParseError));

      const mockVSCodeDiagnostic = {};
      const { convertParseErrorToDiagnostic } = await import('../../../validation/ErrorMapper.js');
      (convertParseErrorToDiagnostic as any).mockReturnValue(mockVSCodeDiagnostic);

      // Act
      const result = await adapter.validateDocument(testDocumentUri, testContent);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockUri);
      expect(mockDiagnosticCollection.set).toHaveBeenCalledWith(mockUri, [mockVSCodeDiagnostic]);
    });

    it('should handle parser throwing exceptions', async () => {
      // Arrange
      const errorMessage = 'Parser crashed';
      (mockParser.parseProofFile as any).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const result = await adapter.validateDocument(testDocumentUri, testContent);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
        expect(result.error.message).toContain(errorMessage);
      }
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const errorValue = 'String error';
      (mockParser.parseProofFile as any).mockImplementation(() => {
        throw errorValue;
      });

      // Act
      const result = await adapter.validateDocument(testDocumentUri, testContent);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
        expect(result.error.message).toContain(errorValue);
      }
    });
  });

  describe('clearDiagnostics', () => {
    it('should clear diagnostics for specific document', () => {
      // Arrange
      const documentUri = 'file:///test.proof';

      // Act
      adapter.clearDiagnostics(documentUri);

      // Assert
      expect(vscode.Uri.parse).toHaveBeenCalledWith(documentUri);
      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockUri);
    });
  });

  describe('clearAllDiagnostics', () => {
    it('should clear all diagnostics', () => {
      // Act
      adapter.clearAllDiagnostics();

      // Assert
      expect(mockDiagnosticCollection.clear).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose diagnostic collection', () => {
      // Act
      adapter.dispose();

      // Assert
      expect(mockDiagnosticCollection.dispose).toHaveBeenCalled();
    });
  });

  describe('convertSeverity', () => {
    it('should convert severity 1 to Error', () => {
      // Act
      const result = (adapter as any).convertSeverity(1);

      // Assert
      expect(result).toBe(vscode.DiagnosticSeverity.Error);
    });

    it('should convert severity 2 to Warning', () => {
      // Act
      const result = (adapter as any).convertSeverity(2);

      // Assert
      expect(result).toBe(vscode.DiagnosticSeverity.Warning);
    });

    it('should convert severity 3 to Information', () => {
      // Act
      const result = (adapter as any).convertSeverity(3);

      // Assert
      expect(result).toBe(vscode.DiagnosticSeverity.Information);
    });

    it('should convert severity 4 to Hint', () => {
      // Act
      const result = (adapter as any).convertSeverity(4);

      // Assert
      expect(result).toBe(vscode.DiagnosticSeverity.Hint);
    });

    it('should default to Error for unknown severity', () => {
      // Act
      const result = (adapter as any).convertSeverity(99);

      // Assert
      expect(result).toBe(vscode.DiagnosticSeverity.Error);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty content', async () => {
      // Arrange
      (mockParser.parseProofFile as any).mockReturnValue(ok({} as any));

      // Act
      const result = await adapter.validateDocument('file:///test.proof', '');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should handle malformed document URIs', async () => {
      // Arrange
      const malformedUri = 'not-a-valid-uri';
      (vscode.Uri.parse as any).mockImplementation(() => {
        throw new Error('Invalid URI');
      });

      // Act
      const result = await adapter.validateDocument(malformedUri, 'content');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('PLATFORM_ERROR');
        expect(result.error.message).toContain('Invalid URI');
      }
    });

    it('should handle parse errors with no errors array', async () => {
      // Arrange
      const mockParseError = {
        getAllErrors: vi.fn().mockReturnValue([]),
      };
      (mockParser.parseProofFile as any).mockReturnValue(err(mockParseError));

      // Act
      const result = await adapter.validateDocument('file:///test.proof', 'content');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockDiagnosticCollection.set).toHaveBeenCalledWith(mockUri, []);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple validation calls for same document', async () => {
      // Arrange
      const documentUri = 'file:///test.proof';
      (mockParser.parseProofFile as any).mockReturnValue(ok({} as any));

      // Act
      await adapter.validateDocument(documentUri, 'content 1');
      await adapter.validateDocument(documentUri, 'content 2');

      // Assert
      expect(mockDiagnosticCollection.delete).toHaveBeenCalledTimes(2);
      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockUri);
    });

    it('should handle validation followed by explicit clear', async () => {
      // Arrange
      const documentUri = 'file:///test.proof';
      (mockParser.parseProofFile as any).mockReturnValue(ok({} as any));

      // Act
      await adapter.validateDocument(documentUri, 'content');
      adapter.clearDiagnostics(documentUri);

      // Assert
      expect(mockDiagnosticCollection.delete).toHaveBeenCalledTimes(2);
    });
  });
});
