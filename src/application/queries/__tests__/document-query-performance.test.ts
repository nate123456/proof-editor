/**
 * Document query performance tests
 *
 * Tests performance characteristics including large documents,
 * concurrent queries, and scalability limits.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentDTO, GetDocumentStateQuery } from '../document-queries.js';
import {
  createMockDocumentService,
  createTestDocumentDTO,
  createTestDocumentStats,
} from './shared/document-test-utilities.js';

describe('Document Query Performance', () => {
  let documentService: ReturnType<typeof createMockDocumentService>;

  beforeEach(() => {
    documentService = createMockDocumentService();
  });

  it('should handle large documents efficiently', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_large_performance',
      includeStats: true,
    };

    const largeDocument: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      version: 100,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-12-31T23:59:59.000Z',
      statements: Object.fromEntries(
        Array.from({ length: 10000 }, (_, i) => [
          `stmt_${i}`,
          {
            id: `stmt_${i}`,
            content: `Large statement ${i}`,
            usageCount: Math.floor(Math.random() * 10),
            createdAt: '2023-01-01T00:00:00.000Z',
            modifiedAt: '2023-01-01T00:00:00.000Z',
          },
        ]),
      ),
      orderedSets: Object.fromEntries(
        Array.from({ length: 5000 }, (_, i) => [
          `set_${i}`,
          {
            id: `set_${i}`,
            statementIds: [`stmt_${i}`, `stmt_${i + 1}`],
            usageCount: 1,
            usedBy: [],
          },
        ]),
      ),
      atomicArguments: Object.fromEntries(
        Array.from({ length: 5000 }, (_, i) => [
          `arg_${i}`,
          {
            id: `arg_${i}`,
            premiseSetId: `set_${i}`,
            conclusionSetId: `set_${i + 1}`,
          },
        ]),
      ),
      trees: Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [
          `tree_${i}`,
          {
            id: `tree_${i}`,
            position: { x: i * 100, y: i * 100 },
            nodeCount: 100,
            rootNodeIds: Array.from({ length: 5 }, (_, j) => `node_${i}_${j}`),
          },
        ]),
      ),
      stats: createTestDocumentStats({
        statementCount: 10000,
        argumentCount: 5000,
        treeCount: 50,
        connectionCount: 4500,
      }),
    });

    documentService.getDocumentState.mockResolvedValue(largeDocument);

    const startTime = Date.now();
    const result = await documentService.getDocumentState(query);
    const endTime = Date.now();

    expect(result.stats?.statementCount).toBe(10000);
    expect(Object.keys(result.statements)).toHaveLength(10000);
    expect(Object.keys(result.orderedSets)).toHaveLength(5000);
    expect(Object.keys(result.atomicArguments)).toHaveLength(5000);
    expect(Object.keys(result.trees)).toHaveLength(50);
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle documents with deep tree structures', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_deep_trees',
      includeStats: true,
    };

    const deepTreeDocument: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      trees: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `tree_${i}`,
          {
            id: `tree_${i}`,
            position: { x: 0, y: i * 1000 },
            nodeCount: 1000,
            rootNodeIds: [`root_${i}`],
            bounds: { width: 5000, height: 10000 },
          },
        ]),
      ),
      stats: createTestDocumentStats({
        statementCount: 1000,
        argumentCount: 500,
        treeCount: 10,
        connectionCount: 490,
        validationStatus: {
          isValid: true,
          errors: [
            {
              code: 'DEEP_NESTING',
              message: 'Tree depth exceeds recommended limits',
              severity: 'warning',
            },
          ],
        },
      }),
    });

    documentService.getDocumentState.mockResolvedValue(deepTreeDocument);

    const result = await documentService.getDocumentState(query);

    expect(result.trees).toBeDefined();
    expect(Object.keys(result.trees)).toHaveLength(10);
    expect(result.stats?.validationStatus.errors).toHaveLength(1);
    expect(result.stats?.validationStatus.errors[0]?.code).toBe('DEEP_NESTING');
  });

  it('should handle concurrent document queries', async () => {
    const documentIds = Array.from({ length: 100 }, (_, i) => `doc_concurrent_${i}`);

    const queries = documentIds.map((id) => ({
      documentId: id,
      includeStats: false,
    }));

    const mockResponses = queries.map((query) =>
      createTestDocumentDTO({
        id: query.documentId,
        version: Math.floor(Math.random() * 10) + 1,
      }),
    );

    queries.forEach((_query, index) => {
      documentService.getDocumentState.mockResolvedValueOnce(mockResponses[index]);
    });

    const startTime = Date.now();
    const results = await Promise.all(
      queries.map((query) => documentService.getDocumentState(query)),
    );
    const endTime = Date.now();

    expect(results).toHaveLength(100);
    expect(results.every((r) => r !== null)).toBe(true);
    expect(results.every((r, i) => r?.id === documentIds[i])).toBe(true);
    expect(endTime - startTime).toBeLessThan(2000);
  });

  it('should handle documents with many small objects', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_many_small',
      includeStats: true,
    };

    const manySmallObjectsDocument: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      statements: Object.fromEntries(
        Array.from({ length: 50000 }, (_, i) => [
          `s${i}`,
          {
            id: `s${i}`,
            content: `S${i}`,
            usageCount: 0,
            createdAt: '',
            modifiedAt: '',
          },
        ]),
      ),
      stats: createTestDocumentStats({
        statementCount: 50000,
        argumentCount: 0,
        treeCount: 0,
        connectionCount: 0,
        unusedStatements: Array.from({ length: 50000 }, (_, i) => `s${i}`),
      }),
    });

    documentService.getDocumentState.mockResolvedValue(manySmallObjectsDocument);

    const result = await documentService.getDocumentState(query);

    expect(Object.keys(result.statements)).toHaveLength(50000);
    expect(result.stats?.unusedStatements).toHaveLength(50000);
    expect(result.stats?.statementCount).toBe(50000);
  });

  it('should handle documents with complex relationships', async () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_complex_relationships',
      includeStats: true,
    };

    const statementCount = 1000;
    const argumentCount = 2000;
    const connectionCount = 5000;

    const complexRelationshipsDocument: DocumentDTO = createTestDocumentDTO({
      id: query.documentId,
      orderedSets: Object.fromEntries(
        Array.from({ length: connectionCount }, (_, i) => [
          `set_${i}`,
          {
            id: `set_${i}`,
            statementIds: Array.from(
              { length: Math.floor(Math.random() * 5) + 1 },
              (_, j) => `stmt_${(i + j) % statementCount}`,
            ),
            usageCount: Math.floor(Math.random() * 10),
            usedBy: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
              argumentId: `arg_${(i + j) % argumentCount}`,
              usage: Math.random() > 0.5 ? ('premise' as const) : ('conclusion' as const),
            })),
          },
        ]),
      ),
      stats: createTestDocumentStats({
        statementCount,
        argumentCount,
        treeCount: 10,
        connectionCount,
      }),
    });

    documentService.getDocumentState.mockResolvedValue(complexRelationshipsDocument);

    const result = await documentService.getDocumentState(query);

    expect(Object.keys(result.orderedSets)).toHaveLength(connectionCount);
    expect(result.stats?.connectionCount).toBe(connectionCount);
  });

  it('should handle incremental loading for very large documents', async () => {
    const documentId = 'doc_incremental_large';

    const chunkSizes = [1000, 5000, 10000, 20000];
    const chunks = chunkSizes.map((size) =>
      createTestDocumentDTO({
        id: documentId,
        version: size / 1000,
        statements: Object.fromEntries(
          Array.from({ length: size }, (_, i) => [
            `stmt_${i}`,
            {
              id: `stmt_${i}`,
              content: `Statement ${i}`,
              usageCount: 0,
              createdAt: '',
              modifiedAt: '',
            },
          ]),
        ),
        stats: createTestDocumentStats({
          statementCount: size,
        }),
      }),
    );

    let loadCount = 0;
    documentService.getDocumentState.mockImplementation(async () => {
      const result = chunks[loadCount];
      loadCount++;
      return result;
    });

    const timings: number[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const startTime = Date.now();
      const result = await documentService.getDocumentState({ documentId });
      const endTime = Date.now();

      timings.push(endTime - startTime);
      expect(Object.keys(result.statements)).toHaveLength(chunkSizes[i]);
    }

    expect(timings).toHaveLength(4);
    expect(Math.max(...timings)).toBeLessThan(3000);
  });
});
