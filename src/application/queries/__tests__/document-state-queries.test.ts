/**
 * Document state query tests
 *
 * Tests for retrieving document state with optional statistics.
 * Covers validation status, usage metrics, and structural analysis.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { treeFactory } from '../../../domain/__tests__/factories/index.js';
import { ProofAggregate } from '../../../domain/aggregates/ProofAggregate.js';
import { ProofId } from '../../../domain/shared/value-objects/index.js';
import { documentToDTO } from '../../mappers/DocumentMapper.js';
import type { DocumentDTO, GetDocumentStateQuery } from '../document-queries.js';
import {
  createMockDocumentService,
  createTestDocumentDTO,
  createTestDocumentStats,
} from './shared/document-test-utilities.js';

describe('GetDocumentStateQuery Execution', () => {
  let documentService: ReturnType<typeof createMockDocumentService>;

  beforeEach(() => {
    documentService = createMockDocumentService();
  });

  it('should retrieve document state without stats', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_state',
      includeStats: false,
    };

    const proofIdResult = ProofId.fromString(query.documentId);
    if (proofIdResult.isErr()) throw proofIdResult.error;

    const proofAggregate = ProofAggregate.reconstruct(
      proofIdResult.value,
      new Map(),
      new Map(),
      new Map(),
      1,
    );
    if (proofAggregate.isErr()) throw proofAggregate.error;

    const trees = [treeFactory.build()];
    const documentDto = documentToDTO(proofAggregate.value, trees, false);

    documentService.getDocumentState.mockResolvedValue(documentDto);

    const result = await documentService.getDocumentState(query);

    expect(result.id).toBe(query.documentId);
    expect(result.stats).toBeUndefined();
  });

  it('should retrieve document state with comprehensive stats', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_with_stats',
      includeStats: true,
    };

    const documentWithStats: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      version: 5,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-05T00:00:00.000Z',
      stats: createTestDocumentStats({
        statementCount: 20,
        argumentCount: 10,
        treeCount: 2,
        connectionCount: 15,
        unusedStatements: ['stmt_orphan_1', 'stmt_orphan_2'],
        unconnectedArguments: ['arg_isolated'],
        cyclesDetected: [
          {
            path: ['arg_A', 'arg_B', 'arg_C', 'arg_A'],
            severity: 'medium',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'CIRCULAR_DEPENDENCY',
              message: 'Circular dependency detected in argument chain',
              severity: 'error',
              location: {
                argumentId: 'arg_A',
              },
            },
            {
              code: 'ORPHANED_STATEMENTS',
              message: 'Found 2 unused statements',
              severity: 'warning',
            },
          ],
        },
      }),
    });

    documentService.getDocumentState.mockResolvedValue(documentWithStats);

    const result = await documentService.getDocumentState(query);

    expect(result.stats).toBeDefined();
    expect(result.stats?.statementCount).toBe(20);
    expect(result.stats?.argumentCount).toBe(10);
    expect(result.stats?.treeCount).toBe(2);
    expect(result.stats?.connectionCount).toBe(15);
    expect(result.stats?.unusedStatements).toHaveLength(2);
    expect(result.stats?.unconnectedArguments).toHaveLength(1);
    expect(result.stats?.cyclesDetected).toHaveLength(1);
    expect(result.stats?.validationStatus.isValid).toBe(false);
    expect(result.stats?.validationStatus.errors).toHaveLength(2);
  });

  it('should handle empty document state', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_empty',
      includeStats: true,
    };

    const emptyDocumentWithStats: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      version: 0,
      stats: createTestDocumentStats(),
    });

    documentService.getDocumentState.mockResolvedValue(emptyDocumentWithStats);

    const result = await documentService.getDocumentState(query);

    expect(result.stats?.statementCount).toBe(0);
    expect(result.stats?.argumentCount).toBe(0);
    expect(result.stats?.treeCount).toBe(0);
    expect(result.stats?.connectionCount).toBe(0);
    expect(result.stats?.validationStatus.isValid).toBe(true);
    expect(result.stats?.validationStatus.errors).toHaveLength(0);
  });

  it('should handle concurrent modification tracking', async () => {
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

  it('should correctly report cycle detection in stats', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_cycles',
      includeStats: true,
    };

    const documentWithCycles: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      stats: createTestDocumentStats({
        cyclesDetected: [
          {
            path: ['arg_1', 'arg_2', 'arg_3', 'arg_1'],
            severity: 'high',
          },
          {
            path: ['arg_A', 'arg_B', 'arg_A'],
            severity: 'low',
          },
          {
            path: ['arg_X', 'arg_Y', 'arg_Z', 'arg_X'],
            severity: 'medium',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'MULTIPLE_CYCLES',
              message: '3 circular dependencies detected',
              severity: 'error',
            },
          ],
        },
      }),
    });

    documentService.getDocumentState.mockResolvedValue(documentWithCycles);

    const result = await documentService.getDocumentState(query);

    expect(result.stats?.cyclesDetected).toHaveLength(3);
    expect(result.stats?.cyclesDetected[0]?.severity).toBe('high');
    expect(result.stats?.cyclesDetected[1]?.severity).toBe('low');
    expect(result.stats?.cyclesDetected[2]?.severity).toBe('medium');
    expect(result.stats?.validationStatus.isValid).toBe(false);
  });

  it('should provide detailed usage statistics', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_usage_stats',
      includeStats: true,
    };

    const documentWithUsageStats: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      stats: createTestDocumentStats({
        statementCount: 50,
        argumentCount: 25,
        treeCount: 5,
        connectionCount: 30,
        unusedStatements: Array.from({ length: 10 }, (_, i) => `unused_stmt_${i}`),
        unconnectedArguments: Array.from({ length: 5 }, (_, i) => `unconnected_arg_${i}`),
      }),
    });

    documentService.getDocumentState.mockResolvedValue(documentWithUsageStats);

    const result = await documentService.getDocumentState(query);

    expect(result.stats?.unusedStatements).toHaveLength(10);
    expect(result.stats?.unconnectedArguments).toHaveLength(5);
    expect(result.stats?.connectionCount).toBe(30);
    expect(result.stats?.connectionCount).toBeGreaterThan(result.stats?.argumentCount || 0);
  });
});
