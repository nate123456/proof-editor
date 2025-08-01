/**
 * Document query error handling tests
 *
 * Tests for error scenarios including repository failures, data corruption,
 * timeouts, and concurrent modification conflicts.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import { ProofId } from '../../../domain/shared/value-objects/index.js';
import type { DocumentDTO, GetDocumentQuery, GetDocumentStateQuery } from '../document-queries.js';
import {
  createMockDocumentService,
  createMockRepositories,
  createTestDocumentDTO,
  type MockDocumentRepositories,
} from './shared/document-test-utilities.js';

describe('Document Query Error Handling', () => {
  let mockRepositories: MockDocumentRepositories;
  let documentService: ReturnType<typeof createMockDocumentService>;

  beforeEach(() => {
    mockRepositories = createMockRepositories();
    documentService = createMockDocumentService();
  });

  it('should handle repository connection failures', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_error' };
    const connectionError = new Error('Database connection failed');

    mockRepositories.proofRepository.findById.mockRejectedValue(connectionError);

    const proofIdResult = ProofId.fromString(query.documentId);
    if (proofIdResult.isErr()) throw proofIdResult.error;

    await expect(mockRepositories.proofRepository.findById(proofIdResult.value)).rejects.toThrow(
      'Database connection failed',
    );
  });

  it('should handle document corruption', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_corrupted' };

    const corruptedError = new ValidationError('Document data is corrupted');
    documentService.getDocument.mockRejectedValue(corruptedError);

    await expect(documentService.getDocument(query)).rejects.toThrow('Document data is corrupted');
  });

  it('should handle concurrent modification conflicts', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_concurrent',
      includeStats: true,
    };

    const version1: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      version: 1,
      modifiedAt: '2023-01-01T10:00:00.000Z',
    });

    const version2: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      version: 2,
      modifiedAt: '2023-01-01T11:00:00.000Z',
    });

    documentService.getDocumentState
      .mockResolvedValueOnce(version1)
      .mockResolvedValueOnce(version2);

    const result1 = await documentService.getDocumentState(query);
    const result2 = await documentService.getDocumentState(query);

    expect(result1.version).toBe(1);
    expect(result2.version).toBe(2);
    expect(result1.modifiedAt).not.toBe(result2.modifiedAt);
  });

  it('should handle invalid document ID format', async () => {
    const query: GetDocumentQuery = { documentId: '' };

    const proofIdResult = ProofId.fromString(query.documentId);
    expect(proofIdResult.isErr()).toBe(true);
    if (proofIdResult.isErr()) {
      expect(proofIdResult.error).toBeInstanceOf(ValidationError);
    }
  });

  it('should handle missing required data', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_missing_data' };

    const incompleteDocument = createTestDocumentDTO({
      id: query.documentId,
      statements: null as any,
      orderedSets: null as any,
    });

    documentService.getDocument.mockResolvedValue(incompleteDocument);

    const result = await documentService.getDocument(query);

    expect(result?.statements).toBeNull();
    expect(result?.orderedSets).toBeNull();
  });

  it('should handle network timeout errors', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_timeout' };

    const timeoutError = new Error('Request timeout');
    documentService.getDocument.mockRejectedValueOnce(timeoutError).mockResolvedValueOnce(null);

    await expect(documentService.getDocument(query)).rejects.toThrow('Request timeout');

    const retryResult = await documentService.getDocument(query);
    expect(retryResult).toBeNull();
  });

  it('should handle permission denied errors', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_private' };

    const permissionError = new Error('Permission denied: insufficient privileges');
    documentService.getDocument.mockRejectedValue(permissionError);

    await expect(documentService.getDocument(query)).rejects.toThrow(
      'Permission denied: insufficient privileges',
    );
  });

  it('should handle malformed response data', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_malformed' };

    const malformedDocument = {
      id: query.documentId,
      version: 'invalid_version' as any,
      createdAt: 'invalid_date',
      statements: 'should_be_object' as any,
    } as DocumentDTO;

    documentService.getDocument.mockResolvedValue(malformedDocument);

    const result = await documentService.getDocument(query);

    expect(result?.id).toBe(query.documentId);
    expect(typeof result?.version).toBe('string');
    expect(typeof result?.statements).toBe('string');
  });

  it('should handle partial data retrieval failures', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_partial_failure' };
    const proofIdResult = ProofId.fromString(query.documentId);
    if (proofIdResult.isErr()) throw proofIdResult.error;

    mockRepositories.proofRepository.findById.mockResolvedValue({});
    mockRepositories.statementRepository.findByProofId.mockResolvedValue([]);
    mockRepositories.argumentRepository.findByProofId.mockRejectedValue(
      new Error('Argument repository unavailable'),
    );
    mockRepositories.treeRepository.findByProofId.mockResolvedValue([]);

    await expect(
      mockRepositories.argumentRepository.findByProofId(proofIdResult.value),
    ).rejects.toThrow('Argument repository unavailable');
  });

  it('should handle circular reference errors', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_circular' };

    const circularError = new Error('Circular reference detected in document structure');
    documentService.getDocument.mockRejectedValue(circularError);

    await expect(documentService.getDocument(query)).rejects.toThrow(
      'Circular reference detected in document structure',
    );
  });

  it('should handle resource exhaustion errors', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_large' };

    const memoryError = new Error('Insufficient memory to process document');
    documentService.getDocument.mockRejectedValueOnce(memoryError).mockResolvedValueOnce(
      createTestDocumentDTO({
        id: query.documentId,
        version: 1,
      }),
    );

    await expect(documentService.getDocument(query)).rejects.toThrow(
      'Insufficient memory to process document',
    );

    const retryResult = await documentService.getDocument(query);
    expect(retryResult?.id).toBe(query.documentId);
  });

  it('should handle rate limiting errors', async () => {
    const query: GetDocumentQuery = { documentId: 'doc_rate_limited' };

    const rateLimitError = new Error('Rate limit exceeded. Please try again later.');
    let callCount = 0;

    documentService.getDocument.mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw rateLimitError;
      }
      return createTestDocumentDTO({ id: query.documentId });
    });

    await expect(documentService.getDocument(query)).rejects.toThrow(
      'Rate limit exceeded. Please try again later.',
    );
    await expect(documentService.getDocument(query)).rejects.toThrow(
      'Rate limit exceeded. Please try again later.',
    );

    const successResult = await documentService.getDocument(query);
    expect(successResult?.id).toBe(query.documentId);
    expect(callCount).toBe(3);
  });
});
