/**
 * Document retrieval query tests
 *
 * Tests for fetching complete documents including statements, arguments,
 * trees, and metadata. Covers success cases, error handling, and edge cases.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  atomicArgumentFactory,
  statementFactory,
  treeFactory,
} from '../../../domain/__tests__/factories/index.js';
import { ProofAggregate } from '../../../domain/aggregates/ProofAggregate.js';
import { ProofId } from '../../../domain/shared/value-objects/index.js';
import { documentToDTO } from '../../mappers/DocumentMapper.js';
import type { GetDocumentQuery } from '../document-queries.js';
import {
  createComplexDocumentDTO,
  createMockDocumentService,
  createMockRepositories,
  createTestDocumentDTO,
  type MockDocumentRepositories,
} from './shared/document-test-utilities.js';

describe('GetDocumentQuery Execution', () => {
  let mockRepositories: MockDocumentRepositories;
  let documentService: ReturnType<typeof createMockDocumentService>;

  beforeEach(() => {
    mockRepositories = createMockRepositories();
    documentService = createMockDocumentService();
  });

  it('should retrieve complete document successfully', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_complete' };

    const proofIdResult = ProofId.fromString(query.documentId);
    if (proofIdResult.isErr()) throw proofIdResult.error;

    const proofAggregate = ProofAggregate.reconstruct(proofIdResult.value, new Map(), new Map(), 1);
    if (proofAggregate.isErr()) throw proofAggregate.error;

    const statements = [statementFactory.build(), statementFactory.build()];
    const atomicArguments = [atomicArgumentFactory.build(), atomicArgumentFactory.build()];
    const trees = [treeFactory.build(), treeFactory.build()];

    mockRepositories.proofRepository.findById.mockResolvedValue(proofAggregate.value);
    mockRepositories.statementRepository.findByProofId.mockResolvedValue(statements);
    mockRepositories.argumentRepository.findByProofId.mockResolvedValue(atomicArguments);
    mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);

    const documentDto = documentToDTO(proofAggregate.value, trees, false);
    documentService.getDocument.mockResolvedValue(documentDto);

    const result = await documentService.getDocument(query);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(query.documentId);
    expect(result?.statements).toBeDefined();
    expect(result?.orderedSets).toBeDefined();
    expect(result?.atomicArguments).toBeDefined();
    expect(result?.trees).toBeDefined();
    expect(result?.version).toBeGreaterThanOrEqual(0);
    expect(result?.createdAt).toBeDefined();
    expect(result?.modifiedAt).toBeDefined();
  });

  it('should return null for non-existent document', async () => {
    const query: GetDocumentQuery = { documentId: 'nonexistent_doc' };

    mockRepositories.proofRepository.findById.mockResolvedValue(null);
    documentService.getDocument.mockResolvedValue(null);

    const result = await documentService.getDocument(query);

    expect(result).toBeNull();
  });

  it('should handle document with complex structure', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_complex' };
    const complexDto = createComplexDocumentDTO(query.documentId);

    documentService.getDocument.mockResolvedValue(complexDto);

    const result = await documentService.getDocument(query);

    expect(result?.version).toBe(15);
    expect(Object.keys(result?.statements || {})).toHaveLength(10);
    expect(Object.keys(result?.atomicArguments || {})).toHaveLength(5);
    expect(Object.keys(result?.trees || {})).toHaveLength(3);
    expect(result?.modifiedAt).not.toBe(result?.createdAt);
  });

  it('should handle empty document', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_empty' };
    const emptyDocument = createTestDocumentDTO({ id: query.documentId });

    documentService.getDocument.mockResolvedValue(emptyDocument);

    const result = await documentService.getDocument(query);

    expect(result?.id).toBe(query.documentId);
    expect(Object.keys(result?.statements || {})).toHaveLength(0);
    expect(Object.keys(result?.orderedSets || {})).toHaveLength(0);
    expect(Object.keys(result?.atomicArguments || {})).toHaveLength(0);
    expect(Object.keys(result?.trees || {})).toHaveLength(0);
  });

  it('should preserve document metadata during retrieval', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_metadata' };
    const documentWithMetadata = createTestDocumentDTO({
      id: query.documentId,
      version: 42,
      createdAt: '2023-01-01T10:00:00.000Z',
      modifiedAt: '2023-06-15T15:30:00.000Z',
    });

    documentService.getDocument.mockResolvedValue(documentWithMetadata);

    const result = await documentService.getDocument(query);

    expect(result?.version).toBe(42);
    expect(result?.createdAt).toBe('2023-01-01T10:00:00.000Z');
    expect(result?.modifiedAt).toBe('2023-06-15T15:30:00.000Z');
  });

  it('should handle incremental document loading', async () => {
    const baseQuery: GetDocumentQuery = { documentId: 'doc_incremental' };

    const basicDocument = createTestDocumentDTO({
      id: baseQuery.documentId,
      version: 1,
      statements: {
        stmt_1: { id: 'stmt_1', content: 'Basic', usageCount: 0, createdAt: '', modifiedAt: '' },
      },
    });

    const detailedDocument = createTestDocumentDTO({
      ...basicDocument,
      version: 2,
      statements: {
        ...basicDocument.statements,
        stmt_2: {
          id: 'stmt_2',
          content: 'Detailed',
          usageCount: 1,
          createdAt: '',
          modifiedAt: '',
        },
      },
      atomicArguments: {},
    });

    documentService.getDocument
      .mockResolvedValueOnce(basicDocument)
      .mockResolvedValueOnce(detailedDocument);

    const basicResult = await documentService.getDocument(baseQuery);
    const detailedResult = await documentService.getDocument(baseQuery);

    expect(basicResult?.version).toBe(1);
    expect(detailedResult?.version).toBe(2);
    expect(Object.keys(basicResult?.statements || {})).toHaveLength(1);
    expect(Object.keys(detailedResult?.statements || {})).toHaveLength(2);
    expect(Object.keys(detailedResult?.atomicArguments || {})).toHaveLength(1);
  });
});
