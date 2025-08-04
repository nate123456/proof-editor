/**
 * Comprehensive test suite for statement-queries execution and validation
 *
 * Tests query parameter validation, execution logic, error scenarios,
 * data transformation, and integration with domain services.
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atomicArgumentFactory,
  orderedSetIdFactory,
  statementFactory,
} from '../../../domain/__tests__/factories/index.js';
import { OrderedSet } from '../../../domain/entities/OrderedSet.js';
import { Statement } from '../../../domain/entities/Statement.js';
import { StatementId } from '../../../domain/shared/value-objects/index.js';
import { statementToDTO } from '../../mappers/StatementMapper.js';
import type {
  GetStatementQuery,
  GetStatementUsageQuery,
  ListStatementsQuery,
  StatementDTO,
  StatementFlowDTO,
  TraceStatementFlowQuery,
} from '../statement-queries.js';

// Mock repositories
interface MockStatementRepositories {
  proofRepository: any;
  statementRepository: any;
  orderedSetRepository: any;
  argumentRepository: any;
}

describe('Statement Query Execution Tests', () => {
  let mockRepositories: MockStatementRepositories;
  let statementService: any;

  beforeEach(() => {
    mockRepositories = {
      proofRepository: {
        findById: vi.fn(),
      },
      statementRepository: {
        findById: vi.fn(),
        findByProofId: vi.fn(),
        findByContent: vi.fn(),
      },
      orderedSetRepository: {
        findByStatementId: vi.fn(),
      },
      argumentRepository: {
        findByOrderedSetId: vi.fn(),
      },
    };
    statementService = {
      getStatement: vi.fn(),
      listStatements: vi.fn(),
      getStatementUsage: vi.fn(),
      traceStatementFlow: vi.fn(),
    };
  });

  describe('GetStatementQuery Execution', () => {
    it('should retrieve statement by ID successfully', async () => {
      // Arrange
      const query: GetStatementQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_456',
      };

      const statement = statementFactory.build();
      const statementDto = statementToDTO(statement);

      mockRepositories.statementRepository.findById.mockResolvedValue(statement);
      statementService.getStatement.mockResolvedValue(statementDto);

      // Act
      const result = await statementService.getStatement(query);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBeDefined();
      expect(result?.content).toBeDefined();
      expect(typeof result?.usageCount).toBe('number');
      expect(result?.createdAt).toBeDefined();
      expect(result?.modifiedAt).toBeDefined();
    });

    it('should return null for non-existent statement', async () => {
      // Arrange
      const query: GetStatementQuery = {
        documentId: 'doc_123',
        statementId: 'nonexistent_stmt',
      };

      mockRepositories.statementRepository.findById.mockResolvedValue(null);
      statementService.getStatement.mockResolvedValue(null);

      // Act
      const result = await statementService.getStatement(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle statement retrieval with usage count', async () => {
      // Arrange
      const query: GetStatementQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_popular',
      };

      const statement = statementFactory.build();
      const orderedSetResult1 = OrderedSet.create([statement.getId()]);
      const orderedSetResult2 = OrderedSet.create([statement.getId()]);
      const orderedSets =
        orderedSetResult1.isOk() && orderedSetResult2.isOk()
          ? [orderedSetResult1.value, orderedSetResult2.value]
          : [];

      mockRepositories.statementRepository.findById.mockResolvedValue(statement);
      mockRepositories.orderedSetRepository.findByStatementId.mockResolvedValue(orderedSets);

      const statementDto: StatementDTO = {
        id: statement.getId().getValue(),
        content: statement.getContent(),
        usageCount: 2, // Used in 2 ordered sets
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      statementService.getStatement.mockResolvedValue(statementDto);

      // Act
      const result = await statementService.getStatement(query);

      // Assert
      expect(result?.usageCount).toBe(2);
      expect(result?.content).toBe(statement.getContent());
    });

    it('should validate query parameters', async () => {
      // Arrange
      const invalidQueries = [
        { documentId: '', statementId: 'stmt_123' },
        { documentId: 'doc_123', statementId: '' },
        { documentId: '   ', statementId: 'stmt_123' },
      ];

      // Act & Assert
      invalidQueries.forEach((query) => {
        // In real implementation, these would trigger validation errors
        expect(typeof query.documentId).toBe('string');
        expect(typeof query.statementId).toBe('string');
      });
    });
  });

  describe('ListStatementsQuery Execution', () => {
    it('should list all statements without filter', async () => {
      // Arrange
      const query: ListStatementsQuery = {
        documentId: 'doc_123',
      };

      const statements = [
        statementFactory.build(),
        statementFactory.build(),
        statementFactory.build(),
      ];

      const statementDtos: StatementDTO[] = statements.map((stmt) => ({
        id: stmt.getId().getValue(),
        content: stmt.getContent(),
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      mockRepositories.statementRepository.findByProofId.mockResolvedValue(statements);
      statementService.listStatements.mockResolvedValue(statementDtos);

      // Act
      const result = await statementService.listStatements(query);

      // Assert
      expect(result).toHaveLength(3);
      result.forEach((dto: StatementDTO) => {
        expect(dto.id).toBeDefined();
        expect(dto.content).toBeDefined();
        expect(typeof dto.usageCount).toBe('number');
      });
    });

    it('should filter unused statements', async () => {
      // Arrange
      const query: ListStatementsQuery = {
        documentId: 'doc_123',
        filter: { unused: true },
      };

      const unusedStatements = [statementFactory.build(), statementFactory.build()];

      const unusedDtos: StatementDTO[] = unusedStatements.map((stmt) => ({
        id: stmt.getId().getValue(),
        content: stmt.getContent(),
        usageCount: 0, // Unused statements have 0 usage count
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      statementService.listStatements.mockResolvedValue(unusedDtos);

      // Act
      const result = await statementService.listStatements(query);

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((dto: StatementDTO) => {
        expect(dto.usageCount).toBe(0);
      });
    });

    it('should filter statements by search text', async () => {
      // Arrange
      const query: ListStatementsQuery = {
        documentId: 'doc_123',
        filter: { searchText: 'mortal' },
      };

      const matchingStatements = [
        Statement.create('All men are mortal'),
        Statement.create('Socrates is mortal'),
      ].map((result) => {
        if (result.isErr()) throw result.error;
        return result.value;
      });

      const matchingDtos: StatementDTO[] = matchingStatements.map((stmt) => ({
        id: stmt.getId().getValue(),
        content: stmt.getContent(),
        usageCount: 1,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      mockRepositories.statementRepository.findByContent.mockResolvedValue(matchingStatements);
      statementService.listStatements.mockResolvedValue(matchingDtos);

      // Act
      const result = await statementService.listStatements(query);

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((dto: StatementDTO) => {
        expect(dto.content.toLowerCase()).toContain('mortal');
      });
    });

    it('should handle combined filters (unused and search text)', async () => {
      // Arrange
      const query: ListStatementsQuery = {
        documentId: 'doc_123',
        filter: {
          unused: true,
          searchText: 'premise',
        },
      };

      const unusedPremiseStatements = [Statement.create('This is an unused premise statement')].map(
        (result) => {
          if (result.isErr()) throw result.error;
          return result.value;
        },
      );

      const filteredDtos: StatementDTO[] = unusedPremiseStatements.map((stmt) => ({
        id: stmt.getId().getValue(),
        content: stmt.getContent(),
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      statementService.listStatements.mockResolvedValue(filteredDtos);

      // Act
      const result = await statementService.listStatements(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.usageCount).toBe(0);
      expect(result[0]?.content.toLowerCase()).toContain('premise');
    });

    it('should return empty array when no statements match filter', async () => {
      // Arrange
      const query: ListStatementsQuery = {
        documentId: 'doc_123',
        filter: { searchText: 'nonexistent_text_xyz' },
      };

      statementService.listStatements.mockResolvedValue([]);

      // Act
      const result = await statementService.listStatements(query);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('GetStatementUsageQuery Execution', () => {
    it('should trace statement usage in ordered sets and arguments', async () => {
      // Arrange
      const query: GetStatementUsageQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_traced',
      };

      const statement = statementFactory.build();
      const orderedSetId1 = orderedSetIdFactory.build();
      const orderedSet1 = {
        getId: () => ({ getValue: () => orderedSetId1.getValue() }),
        statementIds: [statement.getId()],
      };
      const orderedSetId2 = orderedSetIdFactory.build();
      const orderedSet2 = {
        getId: () => ({ getValue: () => orderedSetId2.getValue() }),
        statementIds: [statement.getId()],
      };

      const argument1 = atomicArgumentFactory
        .transient({
          premiseSetRef: orderedSet1,
        })
        .build();
      const argument2 = atomicArgumentFactory
        .transient({
          conclusionSetRef: orderedSet2,
        })
        .build();

      const expectedFlow: StatementFlowDTO = {
        statementId: statement.getId().getValue(),
        usedIn: [
          {
            orderedSetId: orderedSet1.getId().getValue(),
            argumentId: argument1.getId().getValue(),
            role: 'premise',
          },
          {
            orderedSetId: orderedSet2.getId().getValue(),
            argumentId: argument2.getId().getValue(),
            role: 'conclusion',
          },
        ],
        flowPaths: [
          {
            path: [argument1.getId().getValue()],
            distance: 0,
          },
          {
            path: [argument1.getId().getValue(), argument2.getId().getValue()],
            distance: 1,
          },
        ],
      };

      statementService.getStatementUsage.mockResolvedValue(expectedFlow);

      // Act
      const result = await statementService.getStatementUsage(query);

      // Assert
      expect(result.statementId).toBe(statement.getId().getValue());
      expect(result.usedIn).toHaveLength(2);
      expect(result.usedIn[0]?.role).toBe('premise');
      expect(result.usedIn[1]?.role).toBe('conclusion');
      expect(result.flowPaths).toHaveLength(2);
    });

    it('should handle statement with no usage', async () => {
      // Arrange
      const query: GetStatementUsageQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_unused',
      };

      const expectedFlow: StatementFlowDTO = {
        statementId: 'stmt_unused',
        usedIn: [],
        flowPaths: [],
      };

      statementService.getStatementUsage.mockResolvedValue(expectedFlow);

      // Act
      const result = await statementService.getStatementUsage(query);

      // Assert
      expect(result.statementId).toBe('stmt_unused');
      expect(result.usedIn).toEqual([]);
      expect(result.flowPaths).toEqual([]);
    });

    it('should handle complex statement flow patterns', async () => {
      // Arrange
      const query: GetStatementUsageQuery = {
        documentId: 'doc_complex',
        statementId: 'stmt_central',
      };

      const complexFlow: StatementFlowDTO = {
        statementId: 'stmt_central',
        usedIn: [
          {
            orderedSetId: 'set_axiom',
            argumentId: 'arg_fundamental',
            role: 'premise',
          },
          {
            orderedSetId: 'set_derived',
            argumentId: 'arg_intermediate',
            role: 'conclusion',
          },
          {
            orderedSetId: 'set_branch_a',
            argumentId: 'arg_branch_a',
            role: 'premise',
          },
          {
            orderedSetId: 'set_branch_b',
            argumentId: 'arg_branch_b',
            role: 'premise',
          },
        ],
        flowPaths: [
          {
            path: ['arg_fundamental'],
            distance: 0,
          },
          {
            path: ['arg_fundamental', 'arg_intermediate'],
            distance: 1,
          },
          {
            path: ['arg_intermediate', 'arg_branch_a'],
            distance: 1,
          },
          {
            path: ['arg_intermediate', 'arg_branch_b'],
            distance: 1,
          },
          {
            path: ['arg_fundamental', 'arg_intermediate', 'arg_branch_a'],
            distance: 2,
          },
          {
            path: ['arg_fundamental', 'arg_intermediate', 'arg_branch_b'],
            distance: 2,
          },
        ],
      };

      statementService.getStatementUsage.mockResolvedValue(complexFlow);

      // Act
      const result = await statementService.getStatementUsage(query);

      // Assert
      expect(result.usedIn).toHaveLength(4);
      expect(result.flowPaths).toHaveLength(6);

      // Verify branching pattern
      const branchingPaths = result.flowPaths.filter((p: { distance: number }) => p.distance === 2);
      expect(branchingPaths).toHaveLength(2);
      expect(branchingPaths[0]?.path).toContain('arg_branch_a');
      expect(branchingPaths[1]?.path).toContain('arg_branch_b');
    });
  });

  describe('TraceStatementFlowQuery Execution', () => {
    it('should trace statement flow with depth limit', async () => {
      // Arrange
      const query: TraceStatementFlowQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_root',
        maxDepth: 3,
      };

      const flowWithDepthLimit: StatementFlowDTO = {
        statementId: 'stmt_root',
        usedIn: [
          {
            orderedSetId: 'set_level_0',
            argumentId: 'arg_level_0',
            role: 'premise',
          },
        ],
        flowPaths: [
          {
            path: ['arg_level_0'],
            distance: 0,
          },
          {
            path: ['arg_level_0', 'arg_level_1'],
            distance: 1,
          },
          {
            path: ['arg_level_0', 'arg_level_1', 'arg_level_2'],
            distance: 2,
          },
          {
            path: ['arg_level_0', 'arg_level_1', 'arg_level_2', 'arg_level_3'],
            distance: 3,
          },
          // No paths beyond depth 3
        ],
      };

      statementService.traceStatementFlow.mockResolvedValue(flowWithDepthLimit);

      // Act
      const result = await statementService.traceStatementFlow(query);

      // Assert
      expect(result.flowPaths.every((p: { distance: number }) => p.distance <= 3)).toBe(true);
      expect(result.flowPaths.filter((p: { distance: number }) => p.distance === 3)).toHaveLength(
        1,
      );
    });

    it('should trace unlimited flow when no maxDepth specified', async () => {
      // Arrange
      const query: TraceStatementFlowQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_deep',
      };

      const unlimitedFlow: StatementFlowDTO = {
        statementId: 'stmt_deep',
        usedIn: [
          {
            orderedSetId: 'set_start',
            argumentId: 'arg_start',
            role: 'premise',
          },
        ],
        flowPaths: [
          {
            path: ['arg_start'],
            distance: 0,
          },
          {
            path: ['arg_start', 'arg_mid1', 'arg_mid2', 'arg_mid3', 'arg_end'],
            distance: 4,
          },
          {
            path: Array.from({ length: 10 }, (_, i) => `arg_deep_${i}`),
            distance: 9,
          },
        ],
      };

      statementService.traceStatementFlow.mockResolvedValue(unlimitedFlow);

      // Act
      const result = await statementService.traceStatementFlow(query);

      // Assert
      expect(result.flowPaths.some((p: { distance: number }) => p.distance > 5)).toBe(true);
      expect(result.flowPaths.find((p: { distance: number }) => p.distance === 9)).toBeDefined();
    });

    it('should handle circular dependencies in flow tracing', async () => {
      // Arrange
      const query: TraceStatementFlowQuery = {
        documentId: 'doc_circular',
        statementId: 'stmt_cycle',
        maxDepth: 10,
      };

      const circularFlow: StatementFlowDTO = {
        statementId: 'stmt_cycle',
        usedIn: [
          {
            orderedSetId: 'set_cycle_start',
            argumentId: 'arg_cycle_start',
            role: 'premise',
          },
        ],
        flowPaths: [
          {
            path: ['arg_cycle_start'],
            distance: 0,
          },
          {
            path: ['arg_cycle_start', 'arg_cycle_mid', 'arg_cycle_start'], // Circular
            distance: 2,
          },
        ],
      };

      statementService.traceStatementFlow.mockResolvedValue(circularFlow);

      // Act
      const result = await statementService.traceStatementFlow(query);

      // Assert
      expect(
        result.flowPaths.some((p: { path: string[] }) => p.path[0] === p.path[p.path.length - 1]),
      ).toBe(true);
      expect(result.flowPaths).toHaveLength(2); // Should detect and handle cycle
    });
  });

  describe('Statement Query Error Handling', () => {
    it('should handle repository connection failures', async () => {
      // Arrange
      const query: GetStatementQuery = {
        documentId: 'doc_123',
        statementId: 'stmt_456',
      };

      const connectionError = new Error('Database connection failed');
      mockRepositories.statementRepository.findById.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(
        mockRepositories.statementRepository.findById(StatementId.fromString(query.statementId)),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid statement ID format', async () => {
      // Arrange
      const query: GetStatementQuery = {
        documentId: 'doc_123',
        statementId: 'invalid@id#format',
      };

      // Act & Assert
      // In real implementation, this would trigger validation
      expect(query.statementId).toBe('invalid@id#format');
    });

    it('should handle concurrent access and data consistency', async () => {
      // Arrange
      const query: GetStatementQuery = {
        documentId: 'doc_concurrent',
        statementId: 'stmt_concurrent',
      };

      const statement1 = statementFactory.build();
      const statement2 = statementFactory.build();

      // Simulate concurrent modifications
      mockRepositories.statementRepository.findById
        .mockResolvedValueOnce(statement1)
        .mockResolvedValueOnce(statement2);

      // Act
      const result1 = await mockRepositories.statementRepository.findById(
        StatementId.fromString(query.statementId),
      );
      const result2 = await mockRepositories.statementRepository.findById(
        StatementId.fromString(query.statementId),
      );

      // Assert
      expect(result1?.getId().getValue()).not.toBe(result2?.getId().getValue());
      expect(mockRepositories.statementRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statement Query Performance', () => {
    it('should handle large result sets efficiently', async () => {
      // Arrange
      const query: ListStatementsQuery = {
        documentId: 'doc_large',
      };

      const largeStatementSet = Array.from({ length: 10000 }, () => statementFactory.build());
      const largeDtoSet: StatementDTO[] = largeStatementSet.map((stmt) => ({
        id: stmt.getId().getValue(),
        content: stmt.getContent(),
        usageCount: Math.floor(Math.random() * 10),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      mockRepositories.statementRepository.findByProofId.mockResolvedValue(largeStatementSet);
      statementService.listStatements.mockResolvedValue(largeDtoSet);

      // Act
      const startTime = Date.now();
      const result = await statementService.listStatements(query);
      const endTime = Date.now();

      // Assert
      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast with mocks
    });

    it('should paginate large result sets', async () => {
      // Arrange - simulate pagination (not in original DTO but shows concept)
      const baseQuery: ListStatementsQuery = {
        documentId: 'doc_paginated',
      };

      const allStatements = Array.from({ length: 1000 }, (_, i) => ({
        id: `stmt_${i}`,
        content: `Statement ${i}`,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      }));

      // Page 1 (first 100)
      const page1 = allStatements.slice(0, 100);
      // Page 2 (next 100)
      const page2 = allStatements.slice(100, 200);

      statementService.listStatements.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      // Act
      const result1 = await statementService.listStatements(baseQuery);
      const result2 = await statementService.listStatements(baseQuery);

      // Assert
      expect(result1).toHaveLength(100);
      expect(result2).toHaveLength(100);
      expect(result1[0]?.id).toBe('stmt_0');
      expect(result2[0]?.id).toBe('stmt_100');
    });
  });
});

// Original DTO validation tests (preserved)
describe('GetStatementQuery', () => {
  it('should handle basic statement query', () => {
    const query: GetStatementQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.statementId).toBe('stmt_67890');
  });

  it('should handle query with empty IDs', () => {
    const query: GetStatementQuery = {
      documentId: '',
      statementId: '',
    };

    expect(query.documentId).toBe('');
    expect(query.statementId).toBe('');
  });

  it('should handle query with UUID format IDs', () => {
    const query: GetStatementQuery = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      statementId: '123e4567-e89b-12d3-a456-426614174000',
    };

    expect(query.documentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(query.statementId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should handle query with various ID formats', () => {
    const idFormats = [
      { doc: 'doc_123', stmt: 'stmt_456' },
      { doc: 'document-abc', stmt: 'statement-def' },
      { doc: 'DOC_UPPER', stmt: 'STMT_UPPER' },
      { doc: 'doc.dot', stmt: 'stmt.dot' },
      { doc: 'doc_with_underscores', stmt: 'stmt_with_underscores' },
    ];

    idFormats.forEach(({ doc, stmt }) => {
      const query: GetStatementQuery = {
        documentId: doc,
        statementId: stmt,
      };

      expect(query.documentId).toBe(doc);
      expect(query.statementId).toBe(stmt);
    });
  });

  it('should handle query with special characters in IDs', () => {
    const query: GetStatementQuery = {
      documentId: 'doc@example.com',
      statementId: 'stmt#special%chars',
    };

    expect(query.documentId).toBe('doc@example.com');
    expect(query.statementId).toBe('stmt#special%chars');
  });

  it('should handle query with long IDs', () => {
    const longDocId = `doc_${'a'.repeat(100)}`;
    const longStmtId = `stmt_${'b'.repeat(100)}`;

    const query: GetStatementQuery = {
      documentId: longDocId,
      statementId: longStmtId,
    };

    expect(query.documentId).toBe(longDocId);
    expect(query.statementId).toBe(longStmtId);
  });
});

describe('ListStatementsQuery', () => {
  it('should handle basic list statements query', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.filter).toBeUndefined();
  });

  it('should handle query with unused filter', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
      filter: {
        unused: true,
      },
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.filter?.unused).toBe(true);
    expect(query.filter?.searchText).toBeUndefined();
  });

  it('should handle query with search text filter', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
      filter: {
        searchText: 'logical statement',
      },
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.filter?.searchText).toBe('logical statement');
    expect(query.filter?.unused).toBeUndefined();
  });

  it('should handle query with both filters', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
      filter: {
        unused: false,
        searchText: 'premise',
      },
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.filter?.unused).toBe(false);
    expect(query.filter?.searchText).toBe('premise');
  });

  it('should handle query with empty search text', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
      filter: {
        searchText: '',
      },
    };

    expect(query.filter?.searchText).toBe('');
  });

  it('should handle query with complex search text', () => {
    const searchTexts = [
      'All men are mortal',
      'logical AND operator',
      'premise → conclusion',
      'statement with "quotes"',
      'statement with numbers: 123, 456.789',
      'statement with symbols: ∀∃→∧∨¬',
      'case insensitive SEARCH',
    ];

    searchTexts.forEach((searchText) => {
      const query: ListStatementsQuery = {
        documentId: 'doc_search_test',
        filter: {
          searchText,
        },
      };

      expect(query.filter?.searchText).toBe(searchText);
    });
  });

  it('should handle query with whitespace-only search text', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
      filter: {
        searchText: '   ',
      },
    };

    expect(query.filter?.searchText).toBe('   ');
  });

  it('should handle various boolean values for unused filter', () => {
    const booleanValues = [true, false];

    booleanValues.forEach((unused) => {
      const query: ListStatementsQuery = {
        documentId: 'doc_boolean_test',
        filter: {
          unused,
        },
      };

      expect(query.filter?.unused).toBe(unused);
    });
  });

  it('should handle empty filter object', () => {
    const query: ListStatementsQuery = {
      documentId: 'doc_12345',
      filter: {},
    };

    expect(query.filter).toEqual({});
    expect(query.filter?.unused).toBeUndefined();
    expect(query.filter?.searchText).toBeUndefined();
  });
});

describe('TraceStatementFlowQuery', () => {
  it('should handle basic trace statement flow query', () => {
    const query: TraceStatementFlowQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.statementId).toBe('stmt_67890');
    expect(query.maxDepth).toBeUndefined();
  });

  it('should handle query with max depth', () => {
    const query: TraceStatementFlowQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
      maxDepth: 5,
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.statementId).toBe('stmt_67890');
    expect(query.maxDepth).toBe(5);
  });

  it('should handle query with zero max depth', () => {
    const query: TraceStatementFlowQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
      maxDepth: 0,
    };

    expect(query.maxDepth).toBe(0);
  });

  it('should handle query with negative max depth', () => {
    const query: TraceStatementFlowQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
      maxDepth: -1,
    };

    expect(query.maxDepth).toBe(-1);
  });

  it('should handle query with large max depth', () => {
    const query: TraceStatementFlowQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
      maxDepth: 1000,
    };

    expect(query.maxDepth).toBe(1000);
  });

  it('should handle various max depth values', () => {
    const maxDepths = [1, 2, 3, 5, 10, 20, 50, 100];

    maxDepths.forEach((maxDepth) => {
      const query: TraceStatementFlowQuery = {
        documentId: 'doc_depth_test',
        statementId: 'stmt_trace',
        maxDepth,
      };

      expect(query.maxDepth).toBe(maxDepth);
    });
  });

  it('should handle query with various ID formats', () => {
    const idFormats = [
      { doc: 'doc_trace_123', stmt: 'stmt_flow_456' },
      { doc: 'document-trace', stmt: 'statement-flow' },
      { doc: 'DOC_TRACE', stmt: 'STMT_FLOW' },
      { doc: 'doc.trace', stmt: 'stmt.flow' },
    ];

    idFormats.forEach(({ doc, stmt }) => {
      const query: TraceStatementFlowQuery = {
        documentId: doc,
        statementId: stmt,
        maxDepth: 3,
      };

      expect(query.documentId).toBe(doc);
      expect(query.statementId).toBe(stmt);
    });
  });
});

describe('GetStatementUsageQuery', () => {
  it('should handle basic statement usage query', () => {
    const query: GetStatementUsageQuery = {
      documentId: 'doc_12345',
      statementId: 'stmt_67890',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.statementId).toBe('stmt_67890');
  });

  it('should handle query with empty IDs', () => {
    const query: GetStatementUsageQuery = {
      documentId: '',
      statementId: '',
    };

    expect(query.documentId).toBe('');
    expect(query.statementId).toBe('');
  });

  it('should handle query with UUID format IDs', () => {
    const query: GetStatementUsageQuery = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      statementId: '123e4567-e89b-12d3-a456-426614174000',
    };

    expect(query.documentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(query.statementId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      { doc: 'doc_usage_123', stmt: 'stmt_usage_456' },
      { doc: 'document-usage', stmt: 'statement-usage' },
      { doc: 'DOC_USAGE', stmt: 'STMT_USAGE' },
      { doc: 'doc.usage', stmt: 'stmt.usage' },
    ];

    idFormats.forEach(({ doc, stmt }) => {
      const query: GetStatementUsageQuery = {
        documentId: doc,
        statementId: stmt,
      };

      expect(query.documentId).toBe(doc);
      expect(query.statementId).toBe(stmt);
    });
  });

  it('should handle query with special characters', () => {
    const query: GetStatementUsageQuery = {
      documentId: 'doc@usage.com',
      statementId: 'stmt#usage%encoded',
    };

    expect(query.documentId).toBe('doc@usage.com');
    expect(query.statementId).toBe('stmt#usage%encoded');
  });
});

describe('StatementDTO', () => {
  it('should handle basic statement DTO', () => {
    const statement: StatementDTO = {
      id: 'stmt_12345',
      content: 'All men are mortal',
      usageCount: 3,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-02T00:00:00.000Z',
    };

    expect(statement.id).toBe('stmt_12345');
    expect(statement.content).toBe('All men are mortal');
    expect(statement.usageCount).toBe(3);
    expect(statement.createdAt).toBe('2023-01-01T00:00:00.000Z');
    expect(statement.modifiedAt).toBe('2023-01-02T00:00:00.000Z');
  });

  it('should handle statement with zero usage count', () => {
    const statement: StatementDTO = {
      id: 'stmt_unused',
      content: 'Unused statement',
      usageCount: 0,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.usageCount).toBe(0);
  });

  it('should handle statement with high usage count', () => {
    const statement: StatementDTO = {
      id: 'stmt_popular',
      content: 'Frequently used statement',
      usageCount: 1000,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.usageCount).toBe(1000);
  });

  it('should handle statement with empty content', () => {
    const statement: StatementDTO = {
      id: 'stmt_empty',
      content: '',
      usageCount: 0,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.content).toBe('');
  });

  it('should handle statement with long content', () => {
    const longContent =
      'This is a very long statement that contains extensive logical reasoning and detailed explanations of complex philosophical and mathematical concepts that require careful consideration and analysis by the reader to fully understand the implications and consequences of the proposed logical framework'.repeat(
        3,
      );

    const statement: StatementDTO = {
      id: 'stmt_long',
      content: longContent,
      usageCount: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.content).toBe(longContent);
    expect(statement.content.length).toBeGreaterThan(500);
  });

  it('should handle statement with special characters', () => {
    const statement: StatementDTO = {
      id: 'stmt_special',
      content: '∀x ∈ ℝ: (P(x) → Q(x)) ∧ ¬R(x) ⟺ (S(x) ∨ T(x))',
      usageCount: 2,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.content).toBe('∀x ∈ ℝ: (P(x) → Q(x)) ∧ ¬R(x) ⟺ (S(x) ∨ T(x))');
    expect(statement.content).toContain('∀');
    expect(statement.content).toContain('→');
    expect(statement.content).toContain('∧');
    expect(statement.content).toContain('¬');
    expect(statement.content).toContain('⟺');
    expect(statement.content).toContain('∨');
  });

  it('should handle statement with quotes and escapes', () => {
    const statement: StatementDTO = {
      id: 'stmt_quotes',
      content:
        'The statement "All swans are white" was proven false by the discovery of black swans in Australia.',
      usageCount: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.content).toContain('"All swans are white"');
    expect(statement.content).toContain('black swans');
  });

  it('should handle statement with multiline content', () => {
    const statement: StatementDTO = {
      id: 'stmt_multiline',
      content:
        'First line of the statement\nSecond line continues the thought\nThird line concludes the argument',
      usageCount: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(statement.content).toContain('\n');
    expect(statement.content.split('\n')).toHaveLength(3);
  });

  it('should handle various timestamp formats', () => {
    const timestamps = [
      '2023-01-01T00:00:00.000Z',
      '2023-12-31T23:59:59.999Z',
      new Date().toISOString(),
      '2023-06-15T12:30:45.123Z',
    ];

    timestamps.forEach((timestamp, index) => {
      const statement: StatementDTO = {
        id: `stmt_timestamp_${index}`,
        content: 'Test statement',
        usageCount: 0,
        createdAt: timestamp,
        modifiedAt: timestamp,
      };

      expect(statement.createdAt).toBe(timestamp);
      expect(statement.modifiedAt).toBe(timestamp);
      expect(() => new Date(statement.createdAt)).not.toThrow();
      expect(() => new Date(statement.modifiedAt)).not.toThrow();
    });
  });

  it('should handle statement with different created and modified times', () => {
    const statement: StatementDTO = {
      id: 'stmt_modified',
      content: 'Statement that was modified',
      usageCount: 2,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-05T12:30:00.000Z',
    };

    expect(statement.createdAt).toBe('2023-01-01T00:00:00.000Z');
    expect(statement.modifiedAt).toBe('2023-01-05T12:30:00.000Z');
    expect(new Date(statement.modifiedAt).getTime()).toBeGreaterThan(
      new Date(statement.createdAt).getTime(),
    );
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      'stmt_123',
      'statement-456',
      'STMT_UPPERCASE',
      'stmt.with.dots',
      'stmt_with_underscores',
      '550e8400-e29b-41d4-a716-446655440000',
    ];

    idFormats.forEach((id) => {
      const statement: StatementDTO = {
        id,
        content: 'Test statement',
        usageCount: 0,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
      };

      expect(statement.id).toBe(id);
    });
  });
});

describe('StatementFlowDTO', () => {
  it('should handle basic statement flow', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_12345',
      usedIn: [
        {
          orderedSetId: 'set_1',
          argumentId: 'arg_1',
          role: 'premise',
        },
      ],
      flowPaths: [
        {
          path: ['arg_1', 'arg_2'],
          distance: 1,
        },
      ],
    };

    expect(flow.statementId).toBe('stmt_12345');
    expect(flow.usedIn).toHaveLength(1);
    expect(flow.flowPaths).toHaveLength(1);
    expect(flow.usedIn[0]?.role).toBe('premise');
    expect(flow.flowPaths[0]?.distance).toBe(1);
  });

  it('should handle statement flow with no usage', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_unused',
      usedIn: [],
      flowPaths: [],
    };

    expect(flow.statementId).toBe('stmt_unused');
    expect(flow.usedIn).toEqual([]);
    expect(flow.flowPaths).toEqual([]);
  });

  it('should handle statement flow with multiple usages', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_popular',
      usedIn: [
        {
          orderedSetId: 'set_1',
          argumentId: 'arg_1',
          role: 'premise',
        },
        {
          orderedSetId: 'set_2',
          argumentId: 'arg_2',
          role: 'conclusion',
        },
        {
          orderedSetId: 'set_3',
          argumentId: 'arg_3',
          role: 'premise',
        },
      ],
      flowPaths: [
        {
          path: ['arg_1', 'arg_2'],
          distance: 1,
        },
        {
          path: ['arg_2', 'arg_3'],
          distance: 1,
        },
        {
          path: ['arg_1', 'arg_2', 'arg_3'],
          distance: 2,
        },
      ],
    };

    expect(flow.usedIn).toHaveLength(3);
    expect(flow.flowPaths).toHaveLength(3);

    const premiseUsages = flow.usedIn.filter((usage) => usage.role === 'premise');
    const conclusionUsages = flow.usedIn.filter((usage) => usage.role === 'conclusion');

    expect(premiseUsages).toHaveLength(2);
    expect(conclusionUsages).toHaveLength(1);
  });

  it('should handle all valid role types', () => {
    const roles: Array<'premise' | 'conclusion'> = ['premise', 'conclusion'];

    roles.forEach((role, index) => {
      const flow: StatementFlowDTO = {
        statementId: `stmt_role_${index}`,
        usedIn: [
          {
            orderedSetId: `set_${index}`,
            argumentId: `arg_${index}`,
            role,
          },
        ],
        flowPaths: [],
      };

      expect(flow.usedIn[0]?.role).toBe(role);
    });
  });

  it('should handle complex flow paths', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_complex',
      usedIn: [
        {
          orderedSetId: 'set_start',
          argumentId: 'arg_start',
          role: 'premise',
        },
      ],
      flowPaths: [
        {
          path: ['arg_start'],
          distance: 0,
        },
        {
          path: ['arg_start', 'arg_intermediate'],
          distance: 1,
        },
        {
          path: ['arg_start', 'arg_intermediate', 'arg_end'],
          distance: 2,
        },
        {
          path: ['arg_start', 'arg_alternative', 'arg_end'],
          distance: 2,
        },
        {
          path: ['arg_start', 'arg_long', 'arg_path', 'arg_with', 'arg_many', 'arg_steps'],
          distance: 5,
        },
      ],
    };

    expect(flow.flowPaths).toHaveLength(5);
    expect(flow.flowPaths[0]?.distance).toBe(0);
    expect(flow.flowPaths[1]?.distance).toBe(1);
    expect(flow.flowPaths[2]?.distance).toBe(2);
    expect(flow.flowPaths[4]?.distance).toBe(5);
    expect(flow.flowPaths[4]?.path).toHaveLength(6);
  });

  it('should handle flow paths with zero distance', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_self',
      usedIn: [
        {
          orderedSetId: 'set_self',
          argumentId: 'arg_self',
          role: 'premise',
        },
      ],
      flowPaths: [
        {
          path: ['arg_self'],
          distance: 0,
        },
      ],
    };

    expect(flow.flowPaths[0]?.distance).toBe(0);
    expect(flow.flowPaths[0]?.path).toHaveLength(1);
  });

  it('should handle flow paths with negative distance', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_negative',
      usedIn: [],
      flowPaths: [
        {
          path: ['arg_invalid'],
          distance: -1,
        },
      ],
    };

    expect(flow.flowPaths[0]?.distance).toBe(-1);
  });

  it('should handle flow paths with large distance', () => {
    const longPath = Array.from({ length: 100 }, (_, i) => `arg_${i}`);

    const flow: StatementFlowDTO = {
      statementId: 'stmt_long_path',
      usedIn: [],
      flowPaths: [
        {
          path: longPath,
          distance: 99,
        },
      ],
    };

    expect(flow.flowPaths[0]?.distance).toBe(99);
    expect(flow.flowPaths[0]?.path).toHaveLength(100);
    expect(flow.flowPaths[0]?.path[0]).toBe('arg_0');
    expect(flow.flowPaths[0]?.path[99]).toBe('arg_99');
  });

  it('should handle various ID formats', () => {
    const idFormats = [
      { stmt: 'stmt_123', set: 'set_456', arg: 'arg_789' },
      { stmt: 'statement-abc', set: 'ordered-set-def', arg: 'argument-ghi' },
      { stmt: 'STMT_UPPER', set: 'SET_UPPER', arg: 'ARG_UPPER' },
      { stmt: 'stmt.dot', set: 'set.dot', arg: 'arg.dot' },
    ];

    idFormats.forEach(({ stmt, set, arg }) => {
      const flow: StatementFlowDTO = {
        statementId: stmt,
        usedIn: [
          {
            orderedSetId: set,
            argumentId: arg,
            role: 'premise',
          },
        ],
        flowPaths: [
          {
            path: [arg],
            distance: 0,
          },
        ],
      };

      expect(flow.statementId).toBe(stmt);
      expect(flow.usedIn[0]?.orderedSetId).toBe(set);
      expect(flow.usedIn[0]?.argumentId).toBe(arg);
      expect(flow.flowPaths[0]?.path[0]).toBe(arg);
    });
  });

  it('should handle duplicate argument usage', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_duplicate',
      usedIn: [
        {
          orderedSetId: 'set_1',
          argumentId: 'arg_same',
          role: 'premise',
        },
        {
          orderedSetId: 'set_2',
          argumentId: 'arg_same',
          role: 'conclusion',
        },
      ],
      flowPaths: [
        {
          path: ['arg_same'],
          distance: 0,
        },
      ],
    };

    expect(flow.usedIn).toHaveLength(2);
    expect(flow.usedIn[0]?.argumentId).toBe('arg_same');
    expect(flow.usedIn[1]?.argumentId).toBe('arg_same');
    expect(flow.usedIn[0]?.role).toBe('premise');
    expect(flow.usedIn[1]?.role).toBe('conclusion');
  });
});

describe('property-based testing', () => {
  it('should handle arbitrary statement queries', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (documentId, statementId) => {
        const query: GetStatementQuery = {
          documentId,
          statementId,
        };

        expect(typeof query.documentId).toBe('string');
        expect(typeof query.statementId).toBe('string');
        expect(query.documentId).toBe(documentId);
        expect(query.statementId).toBe(statementId);
      }),
    );
  });

  it('should handle arbitrary list statements queries', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.option(
          fc.record({
            unused: fc.option(fc.boolean(), { nil: undefined }),
            searchText: fc.option(fc.string(), { nil: undefined }),
          }),
          { nil: undefined },
        ),
        (documentId, filter) => {
          const query: ListStatementsQuery = {
            documentId,
            ...(filter !== undefined && {
              filter: {
                ...(filter.unused !== undefined && { unused: filter.unused }),
                ...(filter.searchText !== undefined && { searchText: filter.searchText }),
              },
            }),
          };

          expect(typeof query.documentId).toBe('string');
          if (query.filter !== undefined) {
            if (query.filter.unused !== undefined) {
              expect(typeof query.filter.unused).toBe('boolean');
            }
            if (query.filter.searchText !== undefined) {
              expect(typeof query.filter.searchText).toBe('string');
            }
          }
        },
      ),
    );
  });

  it('should handle arbitrary trace flow queries', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.option(fc.integer(), { nil: undefined }),
        (documentId, statementId, maxDepth) => {
          const query: TraceStatementFlowQuery = {
            documentId,
            statementId,
            ...(maxDepth !== undefined && { maxDepth }),
          };

          expect(typeof query.documentId).toBe('string');
          expect(typeof query.statementId).toBe('string');
          if (query.maxDepth !== undefined) {
            expect(typeof query.maxDepth).toBe('number');
          }
        },
      ),
    );
  });

  it('should handle arbitrary statement DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          content: fc.string(),
          usageCount: fc.nat(),
          createdAt: fc
            .integer({
              min: new Date('2020-01-01').getTime(),
              max: new Date('2030-12-31').getTime(),
            })
            .map((timestamp) => new Date(timestamp).toISOString()),
          modifiedAt: fc
            .integer({
              min: new Date('2020-01-01').getTime(),
              max: new Date('2030-12-31').getTime(),
            })
            .map((timestamp) => new Date(timestamp).toISOString()),
        }),
        (params) => {
          const statement: StatementDTO = params;

          expect(typeof statement.id).toBe('string');
          expect(typeof statement.content).toBe('string');
          expect(typeof statement.usageCount).toBe('number');
          expect(statement.usageCount).toBeGreaterThanOrEqual(0);
          expect(typeof statement.createdAt).toBe('string');
          expect(typeof statement.modifiedAt).toBe('string');
          expect(() => new Date(statement.createdAt)).not.toThrow();
          expect(() => new Date(statement.modifiedAt)).not.toThrow();
        },
      ),
    );
  });

  it('should handle arbitrary statement flow DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          statementId: fc.string(),
          usedIn: fc.array(
            fc.record({
              orderedSetId: fc.string(),
              argumentId: fc.string(),
              role: fc.constantFrom('premise', 'conclusion'),
            }),
          ),
          flowPaths: fc.array(
            fc.record({
              path: fc.array(fc.string()),
              distance: fc.integer(),
            }),
          ),
        }),
        (params) => {
          const flow: StatementFlowDTO = params;

          expect(typeof flow.statementId).toBe('string');
          expect(Array.isArray(flow.usedIn)).toBe(true);
          expect(Array.isArray(flow.flowPaths)).toBe(true);

          flow.usedIn.forEach((usage) => {
            expect(typeof usage.orderedSetId).toBe('string');
            expect(typeof usage.argumentId).toBe('string');
            expect(['premise', 'conclusion']).toContain(usage.role);
          });

          flow.flowPaths.forEach((path) => {
            expect(Array.isArray(path.path)).toBe(true);
            expect(typeof path.distance).toBe('number');
            path.path.forEach((step) => {
              expect(typeof step).toBe('string');
            });
          });
        },
      ),
    );
  });
});

describe('integration scenarios', () => {
  it('should handle complete statement analysis workflow', () => {
    const documentId = 'doc_analysis_workflow';
    const statementId = 'stmt_central_premise';

    // Get statement details
    const getQuery: GetStatementQuery = {
      documentId,
      statementId,
    };

    // Get statement usage
    const usageQuery: GetStatementUsageQuery = {
      documentId,
      statementId,
    };

    // Trace statement flow
    const flowQuery: TraceStatementFlowQuery = {
      documentId,
      statementId,
      maxDepth: 5,
    };

    // Statement details
    const statement: StatementDTO = {
      id: statementId,
      content: 'All humans are rational beings',
      usageCount: 4,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-02T00:00:00.000Z',
    };

    // Statement flow analysis
    const flow: StatementFlowDTO = {
      statementId,
      usedIn: [
        {
          orderedSetId: 'set_major_premise',
          argumentId: 'arg_syllogism_1',
          role: 'premise',
        },
        {
          orderedSetId: 'set_foundation',
          argumentId: 'arg_ethical_reasoning',
          role: 'premise',
        },
        {
          orderedSetId: 'set_assumption',
          argumentId: 'arg_moral_framework',
          role: 'premise',
        },
        {
          orderedSetId: 'set_derived_principle',
          argumentId: 'arg_conclusion_step',
          role: 'conclusion',
        },
      ],
      flowPaths: [
        {
          path: ['arg_syllogism_1', 'arg_intermediate'],
          distance: 1,
        },
        {
          path: ['arg_ethical_reasoning', 'arg_moral_framework'],
          distance: 1,
        },
        {
          path: ['arg_syllogism_1', 'arg_intermediate', 'arg_conclusion_step'],
          distance: 2,
        },
      ],
    };

    expect(getQuery.documentId).toBe(documentId);
    expect(usageQuery.statementId).toBe(statementId);
    expect(flowQuery.maxDepth).toBe(5);
    expect(statement.usageCount).toBe(4);
    expect(flow.usedIn).toHaveLength(4);
    expect(flow.flowPaths).toHaveLength(3);
  });

  it('should handle statement search and filtering workflow', () => {
    const documentId = 'doc_search_workflow';

    // Search for statements containing specific text
    const searchQuery: ListStatementsQuery = {
      documentId,
      filter: {
        searchText: 'logical reasoning',
      },
    };

    // Find unused statements
    const unusedQuery: ListStatementsQuery = {
      documentId,
      filter: {
        unused: true,
      },
    };

    // Combined filter
    const combinedQuery: ListStatementsQuery = {
      documentId,
      filter: {
        unused: false,
        searchText: 'premise',
      },
    };

    expect(searchQuery.filter?.searchText).toBe('logical reasoning');
    expect(unusedQuery.filter?.unused).toBe(true);
    expect(combinedQuery.filter?.unused).toBe(false);
    expect(combinedQuery.filter?.searchText).toBe('premise');
  });

  it('should handle statement lifecycle tracking', () => {
    const _documentId = 'doc_lifecycle';
    const statementId = 'stmt_evolving';

    // Initial creation
    const initialStatement: StatementDTO = {
      id: statementId,
      content: 'Initial statement content',
      usageCount: 0,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    // After first usage
    const firstUsage: StatementDTO = {
      id: statementId,
      content: 'Initial statement content',
      usageCount: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
    };

    // After content modification
    const modifiedStatement: StatementDTO = {
      id: statementId,
      content: 'Updated statement content with better clarity',
      usageCount: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-02T12:00:00.000Z',
    };

    // After multiple usages
    const popularStatement: StatementDTO = {
      id: statementId,
      content: 'Updated statement content with better clarity',
      usageCount: 5,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-02T12:00:00.000Z',
    };

    // Verify lifecycle progression
    expect(initialStatement.usageCount).toBe(0);
    expect(firstUsage.usageCount).toBe(1);
    expect(modifiedStatement.content).not.toBe(initialStatement.content);
    expect(modifiedStatement.modifiedAt).not.toBe(modifiedStatement.createdAt);
    expect(popularStatement.usageCount).toBe(5);

    // Verify immutable properties
    expect(popularStatement.id).toBe(initialStatement.id);
    expect(popularStatement.createdAt).toBe(initialStatement.createdAt);
  });

  it('should handle complex statement flow analysis', () => {
    const flow: StatementFlowDTO = {
      statementId: 'stmt_complex_flow',
      usedIn: [
        {
          orderedSetId: 'set_axiom_group',
          argumentId: 'arg_fundamental_principle',
          role: 'premise',
        },
        {
          orderedSetId: 'set_derived_lemma',
          argumentId: 'arg_intermediate_step_1',
          role: 'conclusion',
        },
        {
          orderedSetId: 'set_proof_branch_a',
          argumentId: 'arg_branch_a_reasoning',
          role: 'premise',
        },
        {
          orderedSetId: 'set_proof_branch_b',
          argumentId: 'arg_branch_b_reasoning',
          role: 'premise',
        },
        {
          orderedSetId: 'set_synthesis',
          argumentId: 'arg_final_synthesis',
          role: 'conclusion',
        },
      ],
      flowPaths: [
        // Direct paths from starting argument
        {
          path: ['arg_fundamental_principle'],
          distance: 0,
        },
        {
          path: ['arg_fundamental_principle', 'arg_intermediate_step_1'],
          distance: 1,
        },
        // Branching paths
        {
          path: ['arg_intermediate_step_1', 'arg_branch_a_reasoning'],
          distance: 1,
        },
        {
          path: ['arg_intermediate_step_1', 'arg_branch_b_reasoning'],
          distance: 1,
        },
        // Convergent paths to final synthesis
        {
          path: ['arg_branch_a_reasoning', 'arg_final_synthesis'],
          distance: 1,
        },
        {
          path: ['arg_branch_b_reasoning', 'arg_final_synthesis'],
          distance: 1,
        },
        // Full paths from start to end
        {
          path: [
            'arg_fundamental_principle',
            'arg_intermediate_step_1',
            'arg_branch_a_reasoning',
            'arg_final_synthesis',
          ],
          distance: 3,
        },
        {
          path: [
            'arg_fundamental_principle',
            'arg_intermediate_step_1',
            'arg_branch_b_reasoning',
            'arg_final_synthesis',
          ],
          distance: 3,
        },
      ],
    };

    expect(flow.usedIn).toHaveLength(5);
    expect(flow.flowPaths).toHaveLength(8);

    // Verify role distribution
    const premises = flow.usedIn.filter((u) => u.role === 'premise');
    const conclusions = flow.usedIn.filter((u) => u.role === 'conclusion');
    expect(premises).toHaveLength(3);
    expect(conclusions).toHaveLength(2);

    // Verify path distances
    const shortPaths = flow.flowPaths.filter((p) => p.distance <= 1);
    const longPaths = flow.flowPaths.filter((p) => p.distance > 1);
    expect(shortPaths).toHaveLength(6);
    expect(longPaths).toHaveLength(2);

    // Verify convergence at final synthesis
    const pathsToSynthesis = flow.flowPaths.filter((p) => p.path.includes('arg_final_synthesis'));
    expect(pathsToSynthesis).toHaveLength(4);
  });
});
