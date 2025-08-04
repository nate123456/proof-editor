import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { RepositoryError } from '../../../domain/errors/DomainErrors.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { ProofDocumentId } from '../../../domain/shared/value-objects/index.js';
import { ParseFailureError } from '../../../parser/ParseError.js';
import type { ProofDocument as ParserProofDocument } from '../../../parser/ProofDocument.js';
import type { ProofFileParser } from '../../../parser/ProofFileParser.js';
import { ValidationApplicationError } from '../../dtos/operation-results.js';
import { DocumentQueryService } from '../DocumentQueryService.js';

describe('DocumentQueryService', () => {
  let service: DocumentQueryService;
  let mockRepository: ReturnType<typeof vi.mocked<IProofDocumentRepository>>;
  let mockParser: ReturnType<typeof vi.mocked<ProofFileParser>>;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findAll: vi.fn(),
      findByDateRange: vi.fn(),
      count: vi.fn(),
      createBootstrapDocument: vi.fn(),
      createBootstrapDocumentWithId: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<IProofDocumentRepository>>;

    mockParser = {
      parseProofFile: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<ProofFileParser>>;

    service = new DocumentQueryService(mockRepository, mockParser);
  });

  describe('getDocumentById', () => {
    test('returns document DTO for valid ID', async () => {
      const documentId = 'test-doc-id';
      const docIdResult = ProofDocumentId.create(documentId);
      expect(docIdResult.isOk()).toBe(true);
      if (!docIdResult.isOk()) return;

      const mockDocument = createMockProofDocument(documentId);
      mockRepository.findById.mockResolvedValue(ok(mockDocument));

      const result = await service.getDocumentById(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(documentId);
        expect(result.value.version).toBe(1);
      }
    });

    test('returns error for invalid document ID', async () => {
      const invalidId = '';

      const result = await service.getDocumentById(invalidId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationApplicationError);
      }
    });

    test('returns error when document not found', async () => {
      const documentId = 'nonexistent-doc';
      mockRepository.findById.mockResolvedValue(err(new RepositoryError('Document not found')));

      const result = await service.getDocumentById(documentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Document not found');
      }
    });

    test('handles repository errors', async () => {
      const documentId = 'test-doc-id';
      mockRepository.findById.mockRejectedValue(new Error('Database error'));

      const result = await service.getDocumentById(documentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to retrieve document');
      }
    });
  });

  describe('getDocumentWithStats', () => {
    test('returns document DTO with statistics', async () => {
      const documentId = 'test-doc-id';
      const mockDocument = createMockProofDocument(documentId);
      mockRepository.findById.mockResolvedValue(ok(mockDocument));

      const result = await service.getDocumentWithStats(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(documentId);
        expect(result.value.stats).toBeDefined();
        expect(result.value.stats?.statementCount).toBeGreaterThanOrEqual(0);
        expect(result.value.stats?.argumentCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('handles errors same as getDocumentById', async () => {
      const documentId = 'nonexistent-doc';
      mockRepository.findById.mockResolvedValue(err(new RepositoryError('Document not found')));

      const result = await service.getDocumentWithStats(documentId);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('parseDocumentContent', () => {
    test('parses valid content successfully', async () => {
      const content = 'statements:\n  s1: "Test statement"';
      const mockProofDocument = createMockParserProofDocument();

      mockParser.parseProofFile.mockReturnValue(ok(mockProofDocument));

      const result = await service.parseDocumentContent(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('parsed-document');
        expect(result.value.version).toBe(1);
        expect(result.value.statements).toBeDefined();
      }
    });

    test('returns error for invalid content', async () => {
      const invalidContent = 'invalid: yaml: [unclosed';
      const parseError = new ParseFailureError([
        { type: 'YAML_SYNTAX' as any, message: 'Parse error' },
      ]);

      mockParser.parseProofFile.mockReturnValue(err(parseError));

      const result = await service.parseDocumentContent(invalidContent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Parse error');
      }
    });

    test('handles parser exceptions', async () => {
      const content = 'some content';

      mockParser.parseProofFile.mockImplementation(() => {
        throw new Error('Parser crashed');
      });

      const result = await service.parseDocumentContent(content);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to parse document content');
      }
    });
  });

  describe('validateDocumentContent', () => {
    test('returns valid for correct content', async () => {
      const content = 'statements:\n  s1: "Valid statement"';
      const mockProofDocument = createMockParserProofDocument();

      mockParser.parseProofFile.mockReturnValue(ok(mockProofDocument));

      const result = await service.validateDocumentContent(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      }
    });

    test('returns errors for invalid content', async () => {
      const invalidContent = 'invalid content';
      const parseError = new ParseFailureError([
        { type: 'VALIDATION' as any, message: 'Validation failed' },
      ]);

      mockParser.parseProofFile.mockReturnValue(err(parseError));

      const result = await service.validateDocumentContent(invalidContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.errors[0]?.message).toBe('Validation failed');
      }
    });

    test('handles validation exceptions', async () => {
      const content = 'some content';

      mockParser.parseProofFile.mockImplementation(() => {
        throw new Error('Validation crashed');
      });

      const result = await service.validateDocumentContent(content);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to validate document content');
      }
    });
  });

  describe('getDocumentMetadata', () => {
    test('returns metadata for existing document', async () => {
      const documentId = 'test-doc-id';
      const mockDocument = createMockProofDocument(documentId);
      mockRepository.findById.mockResolvedValue(ok(mockDocument));

      const result = await service.getDocumentMetadata(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(documentId);
        expect(result.value.version).toBe(1);
        expect(result.value.statementCount).toBeGreaterThanOrEqual(0);
        expect(result.value.argumentCount).toBeGreaterThanOrEqual(0);
        expect(result.value.treeCount).toBe(0); // No tree integration yet
      }
    });

    test('returns error for nonexistent document', async () => {
      const documentId = 'nonexistent-doc';
      mockRepository.findById.mockResolvedValue(err(new RepositoryError('Document not found')));

      const result = await service.getDocumentMetadata(documentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Document not found');
      }
    });
  });

  describe('documentExists', () => {
    test('returns true for existing document', async () => {
      const documentId = 'test-doc-id';
      const mockDocument = createMockProofDocument(documentId);
      mockRepository.findById.mockResolvedValue(ok(mockDocument));

      const result = await service.documentExists(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('returns false for nonexistent document', async () => {
      const documentId = 'nonexistent-doc';
      mockRepository.findById.mockResolvedValue(err(new RepositoryError('Document not found')));

      const result = await service.documentExists(documentId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    test('returns error for invalid document ID', async () => {
      const invalidId = '';

      const result = await service.documentExists(invalidId);

      expect(result.isErr()).toBe(true);
    });

    test('handles repository errors', async () => {
      const documentId = 'test-doc-id';
      mockRepository.findById.mockRejectedValue(new Error('Database error'));

      const result = await service.documentExists(documentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to check document existence');
      }
    });
  });

  describe('parseWithDetailedErrors', () => {
    test('returns document for successful parsing', async () => {
      const content = 'statements:\n  s1: "Test"';
      const mockProofDocument = createMockParserProofDocument();

      mockParser.parseProofFile.mockReturnValue(ok(mockProofDocument));

      const result = await service.parseWithDetailedErrors(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('parsed-document');
      }
    });

    test('returns detailed errors for parsing failures', async () => {
      const invalidContent = 'invalid content';
      const parseError = new ParseFailureError([
        { type: 'VALIDATION' as any, message: 'Detailed parse error' },
      ]);

      mockParser.parseProofFile.mockReturnValue(err(parseError));

      const result = await service.parseWithDetailedErrors(invalidContent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.errors).toHaveLength(1);
        expect(result.error.errors[0]?.message).toBe('Detailed parse error');
        expect(result.error.errors[0]?.severity).toBe('error');
      }
    });

    test('handles parsing exceptions with detailed error format', async () => {
      const content = 'some content';

      mockParser.parseProofFile.mockImplementation(() => {
        throw new Error('Parser exception');
      });

      const result = await service.parseWithDetailedErrors(content);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.errors).toHaveLength(1);
        expect(result.error.errors[0]?.message).toBe('Parser exception');
        expect(result.error.errors[0]?.severity).toBe('error');
      }
    });
  });

  describe('ProofDocument conversion', () => {
    test('converts complex proof document correctly', async () => {
      const content = 'complex proof content';
      const mockProofDocument = createComplexMockParserProofDocument();

      mockParser.parseProofFile.mockReturnValue(ok(mockProofDocument));

      const result = await service.parseDocumentContent(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.statements).toBeDefined();
        // OrderedSets are not exposed in DocumentDTO
        expect(result.value.atomicArguments).toBeDefined();
        expect(result.value.trees).toBeDefined();

        // Should have converted entities from mock document
        expect(Object.keys(result.value.statements)).toHaveLength(1);
        // OrderedSets are not exposed in DocumentDTO
        expect(Object.keys(result.value.atomicArguments)).toHaveLength(1);
        expect(Object.keys(result.value.trees)).toHaveLength(1);
      }
    });

    test('handles empty proof document', async () => {
      const content = 'empty content';
      const emptyProofDocument = createEmptyMockParserProofDocument();

      mockParser.parseProofFile.mockReturnValue(ok(emptyProofDocument));

      const result = await service.parseDocumentContent(content);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Object.keys(result.value.statements)).toHaveLength(0);
        // OrderedSets are not exposed in DocumentDTO
        expect(Object.keys(result.value.atomicArguments)).toHaveLength(0);
        expect(Object.keys(result.value.trees)).toHaveLength(0);
      }
    });
  });
});

// Helper functions
function createMockProofDocument(id: string): ProofDocument {
  const docIdResult = ProofDocumentId.create(id);
  if (docIdResult.isErr()) {
    throw new Error('Invalid document ID in test');
  }

  const documentResult = ProofDocument.createBootstrap(docIdResult.value);
  if (documentResult.isErr()) {
    throw new Error('Failed to create mock document');
  }

  return documentResult.value;
}

function createMockParserProofDocument(): ParserProofDocument {
  return {
    statements: new Map(),
    orderedSets: new Map(),
    atomicArguments: new Map(),
    trees: new Map(),
    nodes: new Map(),
  };
}

function createComplexMockParserProofDocument(): ParserProofDocument {
  const mockStatement = {
    getContent: () => 'Test statement',
    getUsageCount: () => 1,
    getId: () => ({ getValue: () => 's1' }),
  };

  const _mockOrderedSet = {
    getStatementIds: () => [{ getValue: () => 's1' }],
    getId: () => ({ getValue: () => 'os1' }),
  };

  const mockArgument = {
    getPremises: () => [], // Returns Statement[]
    getConclusions: () => [], // Returns Statement[]
    getSideLabels: () => ({ left: 'Test Rule' }),
    getId: () => ({ getValue: () => 'arg1' }),
  };

  const mockTree = {
    getPosition: () => ({ getX: () => 100, getY: () => 100 }),
    getPhysicalProperties: () => ({ getMinWidth: () => 400, getMinHeight: () => 200 }),
    getNodeCount: () => 1,
    getNodeIds: () => [{ getValue: () => 'n1' }],
    getId: () => ({ getValue: () => 'tree1' }),
  };

  return {
    statements: new Map([['s1', mockStatement as any]]),
    orderedSets: new Map(),
    atomicArguments: new Map([['arg1', mockArgument as any]]),
    trees: new Map([['tree1', mockTree as any]]),
    nodes: new Map(),
  };
}

function createEmptyMockParserProofDocument(): ParserProofDocument {
  return {
    statements: new Map(),
    orderedSets: new Map(),
    atomicArguments: new Map(),
    trees: new Map(),
    nodes: new Map(),
  };
}
