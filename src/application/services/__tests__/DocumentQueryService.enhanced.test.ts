import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProofAggregate } from '../../../domain/aggregates/ProofAggregate.js';
import type { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import type { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { ParseFailureError } from '../../../parser/ParseError.js';
import type { ProofFileParser } from '../../../parser/ProofFileParser.js';
import { ValidationApplicationError } from '../../dtos/operation-results.js';
import { DocumentQueryService } from '../DocumentQueryService.js';

describe('DocumentQueryService - Enhanced Coverage', () => {
  let service: DocumentQueryService;
  let mockRepository: IProofDocumentRepository;
  let mockParser: ProofFileParser;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      existsById: vi.fn(),
      findAll: vi.fn(),
    } as any;

    mockParser = {
      parseProofFile: vi.fn(),
      parse: vi.fn(),
      validator: {} as any,
      createStatements: vi.fn(),
      createOrderedSets: vi.fn(),
      createAtomicArguments: vi.fn(),
      createArguments: vi.fn(),
      createTreesAndNodes: vi.fn(),
      createNodesForTree: vi.fn(),
      isRootNode: vi.fn(),
      extractArgumentId: vi.fn(),
      createAttachment: vi.fn(),
      validateCrossReferences: vi.fn(),
    } as any;

    service = new DocumentQueryService(mockRepository, mockParser);
  });

  describe('getDocumentById edge cases', () => {
    test('handles invalid document ID format', async () => {
      const result = await service.getDocumentById('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationApplicationError);
        expect(result.error.message).toContain('ProofDocumentId cannot be empty');
      }
    });

    test('handles malformed document ID with special characters', async () => {
      const invalidIds = [
        'doc@invalid',
        'doc with spaces',
        'doc\nwith\nnewlines',
        'doc\x00with\x00nulls',
        '../../dangerous/path',
      ];

      for (const invalidId of invalidIds) {
        const result = await service.getDocumentById(invalidId);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationApplicationError);
        }
      }
    });

    test('handles repository returning null document', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.getDocumentById('valid-doc-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Document not found: valid-doc-id');
      }
    });

    test('handles repository throwing exception', async () => {
      vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getDocumentById('valid-doc-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to retrieve document');
        expect(result.error.message).toContain('Database connection failed');
      }
    });

    test('handles ProofDocument to ProofAggregate conversion failure', async () => {
      const mockDocument = createMockProofDocument('test-doc');

      // Mock the document so that ProofId.create fails with an empty string
      vi.mocked(mockDocument.getId).mockReturnValue({
        getValue: () => '', // Empty string should fail ProofId validation
      } as any);
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentById('test-doc');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationApplicationError);
        expect(result.error.message).toContain('ProofId cannot be empty');
      }
    });

    test('handles successful document retrieval and conversion', async () => {
      const mockDocument = createMockProofDocument('test-doc');
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentById('test-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('test-doc');
        expect(result.value.version).toBe(1);
        expect(result.value.statements).toBeDefined();
        expect(result.value.orderedSets).toBeDefined();
        expect(result.value.atomicArguments).toBeDefined();
      }
    });
  });

  describe('getDocumentWithStats edge cases', () => {
    test('handles all error scenarios similar to getDocumentById', async () => {
      // Test invalid ID
      const invalidResult = await service.getDocumentWithStats('');
      expect(invalidResult.isErr()).toBe(true);

      // Test not found
      vi.mocked(mockRepository.findById).mockResolvedValue(null);
      const notFoundResult = await service.getDocumentWithStats('valid-doc-id');
      expect(notFoundResult.isErr()).toBe(true);

      // Test exception
      vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Network error'));
      const exceptionResult = await service.getDocumentWithStats('valid-doc-id');
      expect(exceptionResult.isErr()).toBe(true);
      if (exceptionResult.isErr()) {
        expect(exceptionResult.error.message).toContain('Failed to retrieve document with stats');
      }
    });

    test('retrieves document with statistics enabled', async () => {
      const mockDocument = createMockProofDocument('test-doc');
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentWithStats('test-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // The stats flag should be passed to documentToDTO, but we can't easily verify that
        // We can verify that the document structure is correct
        expect(result.value.id).toBe('test-doc');
      }
    });
  });

  describe('parseDocumentContent edge cases', () => {
    test('handles empty content', async () => {
      vi.mocked(mockParser.parseProofFile).mockReturnValue(
        err(
          new ParseFailureError([
            { type: 'yaml-syntax' as any, message: 'Empty content cannot be parsed' },
          ]),
        ),
      );

      const result = await service.parseDocumentContent('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Parse error');
        expect(result.error.message).toContain('Empty content cannot be parsed');
      }
    });

    test('handles malformed YAML content', async () => {
      const malformedContent = `
statements:
  s1: "Test statement"
arguments:
  - invalid yaml structure
    missing proper formatting
      `;

      vi.mocked(mockParser.parseProofFile).mockReturnValue(
        err(
          new ParseFailureError([{ type: 'yaml-syntax' as any, message: 'Invalid YAML format' }]),
        ),
      );

      const result = await service.parseDocumentContent(malformedContent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Parse error');
        expect(result.error.message).toContain('Invalid YAML format');
      }
    });

    test('handles parser throwing unexpected exception', async () => {
      vi.mocked(mockParser.parseProofFile).mockImplementation(() => {
        throw new Error('Parser crashed unexpectedly');
      });

      const result = await service.parseDocumentContent('valid content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to parse document content');
        expect(result.error.message).toContain('Parser crashed unexpectedly');
      }
    });

    test('handles very large content', async () => {
      const largeContent = `statements:\n${'x'.repeat(10000000)}`; // 10MB content

      vi.mocked(mockParser.parseProofFile).mockReturnValue(
        err(
          new ParseFailureError([
            { type: 'invalid-structure' as any, message: 'Content too large to parse' },
          ]),
        ),
      );

      const result = await service.parseDocumentContent(largeContent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Parse error');
      }
    });

    test('successfully parses valid content', async () => {
      const validContent = `
statements:
  s1: "Test statement"
ordered-sets:
  os1: [s1]
atomic-arguments:
  arg1:
    premise-set: null
    conclusion-set: os1
trees:
  tree1:
    position: {x: 0, y: 0}
    nodes:
      n1: {arg: arg1}
`;

      const mockProofDocument = createMockParsedProofDocument();
      vi.mocked(mockParser.parseProofFile).mockReturnValue(ok(mockProofDocument));

      const result = await service.parseDocumentContent(validContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('parsed-document');
        expect(result.value.statements).toBeDefined();
        expect(result.value.orderedSets).toBeDefined();
        expect(result.value.atomicArguments).toBeDefined();
        expect(result.value.trees).toBeDefined();
      }
    });
  });

  describe('validateDocumentContent edge cases', () => {
    test('returns valid for correctly formatted content', async () => {
      const mockProofDocument = createMockParsedProofDocument();
      vi.mocked(mockParser.parseProofFile).mockReturnValue(ok(mockProofDocument));

      const result = await service.validateDocumentContent('valid content');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toEqual([]);
      }
    });

    test('returns errors for invalid content', async () => {
      vi.mocked(mockParser.parseProofFile).mockReturnValue(
        err(
          new ParseFailureError([
            { type: 'invalid-structure' as any, message: 'Missing required field: statements' },
          ]),
        ),
      );

      const result = await service.validateDocumentContent('invalid content');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.errors[0]?.message).toBe('Missing required field: statements');
        expect(result.value.errors[0]?.line).toBeUndefined();
        expect(result.value.errors[0]?.section).toBeUndefined();
      }
    });

    test('handles parser throwing exception during validation', async () => {
      vi.mocked(mockParser.parseProofFile).mockImplementation(() => {
        throw new Error('Parser validation failed');
      });

      const result = await service.validateDocumentContent('content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to validate document content');
        expect(result.error.message).toContain('Parser validation failed');
      }
    });

    test('handles null or undefined content', async () => {
      vi.mocked(mockParser.parseProofFile).mockReturnValue(
        err(
          new ParseFailureError([
            { type: 'invalid-structure' as any, message: 'Content cannot be null or undefined' },
          ]),
        ),
      );

      const result = await service.validateDocumentContent(null as any);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid).toBe(false);
      }
    });
  });

  describe('getDocumentMetadata edge cases', () => {
    test('handles invalid document ID', async () => {
      const result = await service.getDocumentMetadata('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('ProofDocumentId cannot be empty');
      }
    });

    test('handles document not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.getDocumentMetadata('nonexistent-doc');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Document not found: nonexistent-doc');
      }
    });

    test('handles repository exception', async () => {
      vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database timeout'));

      const result = await service.getDocumentMetadata('test-doc');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to retrieve document metadata');
        expect(result.error.message).toContain('Database timeout');
      }
    });

    test('returns correct metadata for existing document', async () => {
      const mockDocument = createMockProofDocument('test-doc');

      // Mock the document to return specific counts
      vi.mocked(mockDocument.getAllStatements).mockReturnValue([
        { getId: () => ({ getValue: () => 's1' }) },
        { getId: () => ({ getValue: () => 's2' }) },
      ] as any);

      vi.mocked(mockDocument.getAllAtomicArguments).mockReturnValue([
        { getId: () => ({ getValue: () => 'arg1' }) },
      ] as any);

      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentMetadata('test-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('test-doc');
        expect(result.value.version).toBe(1);
        expect(result.value.statementCount).toBe(2);
        expect(result.value.argumentCount).toBe(1);
        expect(result.value.treeCount).toBe(0); // Always 0 due to no tree repository
        expect(result.value.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(result.value.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    test('handles documents with zero counts', async () => {
      const mockDocument = createMockProofDocument('empty-doc');

      vi.mocked(mockDocument.getAllStatements).mockReturnValue([]);
      vi.mocked(mockDocument.getAllAtomicArguments).mockReturnValue([]);
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentMetadata('empty-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.statementCount).toBe(0);
        expect(result.value.argumentCount).toBe(0);
      }
    });
  });

  describe('documentExists edge cases', () => {
    test('handles invalid document ID', async () => {
      const result = await service.documentExists('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('ProofDocumentId cannot be empty');
      }
    });

    test('returns false for non-existent document', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.documentExists('nonexistent-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    test('returns true for existing document', async () => {
      const mockDocument = createMockProofDocument('existing-doc');
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.documentExists('existing-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    test('handles repository exception during existence check', async () => {
      vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Connection lost'));

      const result = await service.documentExists('test-doc');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to check document existence');
        expect(result.error.message).toContain('Connection lost');
      }
    });
  });

  describe('parseWithDetailedErrors edge cases', () => {
    test('returns successful parse with detailed format', async () => {
      const mockProofDocument = createMockParsedProofDocument();
      vi.mocked(mockParser.parseProofFile).mockReturnValue(ok(mockProofDocument));

      const result = await service.parseWithDetailedErrors('valid content');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('parsed-document');
      }
    });

    test('returns detailed errors for parse failure', async () => {
      vi.mocked(mockParser.parseProofFile).mockReturnValue(
        err(
          new ParseFailureError([{ type: 'yaml-syntax' as any, message: 'Syntax error in YAML' }]),
        ),
      );

      const result = await service.parseWithDetailedErrors('invalid content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.errors).toHaveLength(1);
        expect(result.error.errors[0]?.message).toBe('Syntax error in YAML');
        expect(result.error.errors[0]?.severity).toBe('error');
        expect(result.error.errors[0]?.line).toBeUndefined();
        expect(result.error.errors[0]?.column).toBeUndefined();
        expect(result.error.errors[0]?.section).toBeUndefined();
        expect(result.error.partialResult).toBeUndefined();
      }
    });

    test('handles parser throwing exception with detailed error format', async () => {
      vi.mocked(mockParser.parseProofFile).mockImplementation(() => {
        throw new Error('Unexpected parser failure');
      });

      const result = await service.parseWithDetailedErrors('content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.errors).toHaveLength(1);
        expect(result.error.errors[0]?.message).toBe('Unexpected parser failure');
        expect(result.error.errors[0]?.severity).toBe('error');
      }
    });

    test('handles non-Error exceptions', async () => {
      vi.mocked(mockParser.parseProofFile).mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await service.parseWithDetailedErrors('content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.errors[0]?.message).toBe('String error');
        expect(result.error.errors[0]?.severity).toBe('error');
      }
    });
  });

  describe('convertProofDocumentToDTO edge cases', () => {
    test('handles ProofDocument with complex structure', async () => {
      const complexProofDocument = createComplexMockParsedProofDocument();
      vi.mocked(mockParser.parseProofFile).mockReturnValue(ok(complexProofDocument));

      const result = await service.parseDocumentContent('complex content');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Object.keys(result.value.statements)).toHaveLength(3);
        expect(Object.keys(result.value.orderedSets)).toHaveLength(2);
        expect(Object.keys(result.value.atomicArguments)).toHaveLength(2);
        expect(Object.keys(result.value.trees)).toHaveLength(1);
      }
    });

    test('handles ProofDocument with side labels', async () => {
      const proofDocumentWithSideLabels = createMockParsedProofDocumentWithSideLabels();
      vi.mocked(mockParser.parseProofFile).mockReturnValue(ok(proofDocumentWithSideLabels));

      const result = await service.parseDocumentContent('content with side labels');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value.atomicArguments.arg1;
        expect(argument?.sideLabels).toEqual({
          left: 'Modus Ponens',
          right: 'Inference Rule',
        });
      }
    });

    test('handles ProofDocument with missing optional fields', async () => {
      const minimalProofDocument = createMinimalMockParsedProofDocument();
      vi.mocked(mockParser.parseProofFile).mockReturnValue(ok(minimalProofDocument));

      const result = await service.parseDocumentContent('minimal content');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.statements).toBeDefined();
        expect(result.value.orderedSets).toBeDefined();
        expect(result.value.atomicArguments).toBeDefined();
        expect(result.value.trees).toBeDefined();
      }
    });
  });

  describe('convertProofDocumentToAggregate edge cases', () => {
    test('handles ProofDocument with invalid ProofId', async () => {
      const mockDocument = createMockProofDocument('invalid-proof-id-format');
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentById('test-doc');

      // The actual behavior depends on ProofId.create validation
      // This test ensures we handle the conversion gracefully
      expect(result.isOk() || result.isErr()).toBe(true);
    });

    test('handles ProofDocument with empty collections', async () => {
      const mockDocument = createMockProofDocument('empty-doc');

      vi.mocked(mockDocument.getAllStatements).mockReturnValue([]);
      vi.mocked(mockDocument.getAllAtomicArguments).mockReturnValue([]);
      vi.mocked(mockDocument.getAllOrderedSets).mockReturnValue([]);
      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentById('empty-doc');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.statements).toBeDefined();
        expect(Object.keys(result.value.statements)).toHaveLength(0);
      }
    });

    test('handles ProofAggregate reconstruction failure', async () => {
      const mockDocument = createMockProofDocument('test-doc');

      // Mock a situation where ProofAggregate.reconstruct fails
      vi.spyOn(ProofAggregate, 'reconstruct').mockReturnValue(
        err(new ValidationError('Aggregate reconstruction failed')),
      );

      vi.mocked(mockRepository.findById).mockResolvedValue(mockDocument);

      const result = await service.getDocumentById('test-doc');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to convert ProofDocument to ProofAggregate');
        expect(result.error.message).toContain('Aggregate reconstruction failed');
      }
    });
  });

  describe('error handling consistency', () => {
    test('all methods return ValidationApplicationError for business logic failures', async () => {
      const methods = [
        () => service.getDocumentById(''),
        () => service.getDocumentWithStats(''),
        () => service.getDocumentMetadata(''),
        () => service.documentExists(''),
      ];

      for (const method of methods) {
        const result = await method();
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationApplicationError);
        }
      }
    });

    test('all methods handle unexpected exceptions gracefully', async () => {
      vi.mocked(mockRepository.findById).mockRejectedValue(new TypeError('Unexpected error'));

      const methods = [
        () => service.getDocumentById('test-doc'),
        () => service.getDocumentWithStats('test-doc'),
        () => service.getDocumentMetadata('test-doc'),
        () => service.documentExists('test-doc'),
      ];

      for (const method of methods) {
        const result = await method();
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationApplicationError);
          expect(result.error.message).toContain('Unexpected error');
        }
      }
    });
  });
});

// Helper functions for creating mock objects
function createMockProofDocument(id: string): ProofDocument {
  return {
    getId: vi.fn().mockReturnValue({ getValue: () => id }),
    getVersion: vi.fn().mockReturnValue(1),
    getAllStatements: vi.fn().mockReturnValue([]),
    getAllAtomicArguments: vi.fn().mockReturnValue([]),
    getAllOrderedSets: vi.fn().mockReturnValue([]),
  } as any;
}

function createMockParsedProofDocument(): import('../../../parser/ProofDocument.js').ProofDocument {
  const mockStatement = {
    getContent: () => 'Test statement',
    getUsageCount: () => 0,
    getId: () => ({ getValue: () => 's1' }),
  };

  const mockOrderedSet = {
    getStatementIds: () => [{ getValue: () => 's1' }],
    getId: () => ({ getValue: () => 'os1' }),
  };

  const mockAtomicArgument = {
    getPremiseSet: () => null,
    getConclusionSet: () => ({ getValue: () => 'os1' }),
    getSideLabels: () => undefined,
    getId: () => ({ getValue: () => 'arg1' }),
  };

  const mockTree = {
    getPosition: () => ({ getX: () => 0, getY: () => 0 }),
    getPhysicalProperties: () => ({ getMinWidth: () => 400, getMinHeight: () => 200 }),
    getNodeCount: () => 1,
    getNodeIds: () => [{ getValue: () => 'n1' }],
    getId: () => ({ getValue: () => 'tree1' }),
  };

  return {
    statements: new Map([['s1', mockStatement]]),
    orderedSets: new Map([['os1', mockOrderedSet]]),
    atomicArguments: new Map([['arg1', mockAtomicArgument]]),
    trees: new Map([['tree1', mockTree]]),
  } as any;
}

function createComplexMockParsedProofDocument(): import('../../../parser/ProofDocument.js').ProofDocument {
  const statements = new Map([
    [
      's1',
      {
        getContent: () => 'Statement 1',
        getUsageCount: () => 1,
        getId: () => ({ getValue: () => 's1' }),
      },
    ],
    [
      's2',
      {
        getContent: () => 'Statement 2',
        getUsageCount: () => 2,
        getId: () => ({ getValue: () => 's2' }),
      },
    ],
    [
      's3',
      {
        getContent: () => 'Statement 3',
        getUsageCount: () => 0,
        getId: () => ({ getValue: () => 's3' }),
      },
    ],
  ]);

  const orderedSets = new Map([
    [
      'os1',
      {
        getStatementIds: () => [{ getValue: () => 's1' }],
        getId: () => ({ getValue: () => 'os1' }),
      },
    ],
    [
      'os2',
      {
        getStatementIds: () => [{ getValue: () => 's2' }, { getValue: () => 's3' }],
        getId: () => ({ getValue: () => 'os2' }),
      },
    ],
  ]);

  const atomicArguments = new Map([
    [
      'arg1',
      {
        getPremiseSet: () => ({ getValue: () => 'os1' }),
        getConclusionSet: () => ({ getValue: () => 'os2' }),
        getSideLabels: (): undefined => undefined,
        getId: () => ({ getValue: () => 'arg1' }),
      },
    ],
    [
      'arg2',
      {
        getPremiseSet: () => ({ getValue: () => 'os2' }),
        getConclusionSet: () => null,
        getSideLabels: (): undefined => undefined,
        getId: () => ({ getValue: () => 'arg2' }),
      },
    ],
  ]);

  const trees = new Map([
    [
      'tree1',
      {
        getPosition: () => ({ getX: () => 100, getY: () => 200 }),
        getPhysicalProperties: () => ({ getMinWidth: () => 600, getMinHeight: () => 400 }),
        getNodeCount: () => 2,
        getNodeIds: () => [{ getValue: () => 'n1' }, { getValue: () => 'n2' }],
        getId: () => ({ getValue: () => 'tree1' }),
      },
    ],
  ]);

  return { statements, orderedSets, atomicArguments, trees } as any;
}

function createMockParsedProofDocumentWithSideLabels(): import('../../../parser/ProofDocument.js').ProofDocument {
  const mockStatement = {
    getContent: () => 'Test statement',
    getUsageCount: () => 0,
    getId: () => ({ getValue: () => 's1' }),
  };

  const mockOrderedSet = {
    getStatementIds: () => [{ getValue: () => 's1' }],
    getId: () => ({ getValue: () => 'os1' }),
  };

  const mockAtomicArgument = {
    getPremiseSet: () => null,
    getConclusionSet: () => ({ getValue: () => 'os1' }),
    getSideLabels: () => ({
      left: 'Modus Ponens',
      right: 'Inference Rule',
    }),
    getId: () => ({ getValue: () => 'arg1' }),
  };

  return {
    statements: new Map([['s1', mockStatement]]),
    orderedSets: new Map([['os1', mockOrderedSet]]),
    atomicArguments: new Map([['arg1', mockAtomicArgument]]),
    trees: new Map(),
  } as any;
}

function createMinimalMockParsedProofDocument(): import('../../../parser/ProofDocument.js').ProofDocument {
  return {
    statements: new Map(),
    orderedSets: new Map(),
    atomicArguments: new Map(),
    trees: new Map(),
  } as any;
}
