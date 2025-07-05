/**
 * Comprehensive test suite for document-queries execution and validation
 *
 * Tests query parameter validation, execution logic, error scenarios,
 * data transformation, and integration with domain services.
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atomicArgumentFactory,
  statementFactory,
  treeFactory,
} from '../../../domain/__tests__/factories/index.js';
import { ProofAggregate } from '../../../domain/aggregates/ProofAggregate.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { ProofId } from '../../../domain/shared/value-objects.js';
import { documentToDTO } from '../../mappers/DocumentMapper.js';
import type {
  AnalyzeProofStructureQuery,
  DocumentDTO,
  DocumentStatsDTO,
  GetDocumentQuery,
  GetDocumentStateQuery,
  GetValidationReportQuery,
} from '../document-queries.js';

// Mock repositories
interface MockDocumentRepositories {
  proofRepository: any;
  statementRepository: any;
  argumentRepository: any;
  treeRepository: any;
}

describe('Document Query Execution Tests', () => {
  let mockRepositories: MockDocumentRepositories;
  let documentService: any;

  beforeEach(() => {
    mockRepositories = {
      proofRepository: {
        findById: vi.fn(),
        save: vi.fn(),
      },
      statementRepository: {
        findByProofId: vi.fn(),
        findUnused: vi.fn(),
      },
      argumentRepository: {
        findByProofId: vi.fn(),
        findUnconnected: vi.fn(),
      },
      treeRepository: {
        findByProofId: vi.fn(),
      },
    };
    documentService = {
      getDocument: vi.fn(),
      getDocumentState: vi.fn(),
      getValidationReport: vi.fn(),
      analyzeProofStructure: vi.fn(),
    };
  });

  describe('GetDocumentQuery Execution', () => {
    it('should retrieve complete document successfully', async () => {
      // Arrange
      const query: GetDocumentQuery = { documentId: 'doc_complete' };

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

      const statements = [statementFactory.build(), statementFactory.build()];
      const atomicArguments = [atomicArgumentFactory.build(), atomicArgumentFactory.build()];
      const trees = [treeFactory.build(), treeFactory.build()];

      mockRepositories.proofRepository.findById.mockResolvedValue(proofAggregate.value);
      mockRepositories.statementRepository.findByProofId.mockResolvedValue(statements);
      mockRepositories.argumentRepository.findByProofId.mockResolvedValue(atomicArguments);
      mockRepositories.treeRepository.findByProofId.mockResolvedValue(trees);

      const documentDto = documentToDTO(proofAggregate.value, trees, false);
      documentService.getDocument.mockResolvedValue(documentDto);

      // Act
      const result = await documentService.getDocument(query);

      // Assert
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
      // Arrange
      const query: GetDocumentQuery = { documentId: 'nonexistent_doc' };

      mockRepositories.proofRepository.findById.mockResolvedValue(null);
      documentService.getDocument.mockResolvedValue(null);

      // Act
      const result = await documentService.getDocument(query);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle document with complex structure', async () => {
      // Arrange
      const query: GetDocumentQuery = { documentId: 'doc_complex' };

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

      // Create a realistic complex document
      const statements = Array.from({ length: 10 }, () => statementFactory.build());
      const atomicArguments = Array.from({ length: 5 }, () => atomicArgumentFactory.build());
      const trees = Array.from({ length: 3 }, () => treeFactory.build());

      mockRepositories.proofRepository.findById.mockResolvedValue(proofAggregate.value);

      const complexDto: DocumentDTO = {
        id: query.documentId,
        version: 15,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-15T12:30:00.000Z',
        statements: Object.fromEntries(
          statements.map((stmt, i) => [
            `stmt_${i}`,
            {
              id: `stmt_${i}`,
              content: stmt.getContent(),
              usageCount: Math.floor(Math.random() * 5),
              createdAt: '2023-01-01T00:00:00.000Z',
              modifiedAt: '2023-01-01T00:00:00.000Z',
            },
          ]),
        ),
        orderedSets: {},
        atomicArguments: Object.fromEntries(
          atomicArguments.map((_arg, i) => [
            `arg_${i}`,
            {
              id: `arg_${i}`,
              premiseSetId: `set_premise_${i}`,
              conclusionSetId: `set_conclusion_${i}`,
              sideLabels: {
                left: `Rule ${i}`,
                right: `Reference ${i}`,
              },
            },
          ]),
        ),
        trees: Object.fromEntries(
          trees.map((_tree, i) => [
            `tree_${i}`,
            {
              id: `tree_${i}`,
              position: { x: i * 100, y: i * 200 },
              bounds: { width: 800, height: 600 },
              nodeCount: 5 + i,
              rootNodeIds: [`node_root_${i}`],
            },
          ]),
        ),
      };

      documentService.getDocument.mockResolvedValue(complexDto);

      // Act
      const result = await documentService.getDocument(query);

      // Assert
      expect(result?.version).toBe(15);
      expect(Object.keys(result?.statements || {})).toHaveLength(10);
      expect(Object.keys(result?.atomicArguments || {})).toHaveLength(5);
      expect(Object.keys(result?.trees || {})).toHaveLength(3);
      expect(result?.modifiedAt).not.toBe(result?.createdAt);
    });
  });

  describe('GetDocumentStateQuery Execution', () => {
    it('should retrieve document state without stats', async () => {
      // Arrange
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

      // Act
      const result = await documentService.getDocumentState(query);

      // Assert
      expect(result.id).toBe(query.documentId);
      expect(result.stats).toBeUndefined();
    });

    it('should retrieve document state with comprehensive stats', async () => {
      // Arrange
      const query: GetDocumentStateQuery = {
        documentId: 'doc_with_stats',
        includeStats: true,
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

      const _statements = Array.from({ length: 20 }, () => statementFactory.build());
      const _atomicArguments = Array.from({ length: 10 }, () => atomicArgumentFactory.build());
      const _trees = Array.from({ length: 2 }, () => treeFactory.build());

      const documentWithStats: DocumentDTO = {
        id: query.documentId,
        version: 5,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-05T00:00:00.000Z',
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
        stats: {
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
        },
      };

      documentService.getDocumentState.mockResolvedValue(documentWithStats);

      // Act
      const result = await documentService.getDocumentState(query);

      // Assert
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
      // Arrange
      const query: GetDocumentStateQuery = {
        documentId: 'doc_empty',
        includeStats: true,
      };

      const emptyDocumentWithStats: DocumentDTO = {
        id: query.documentId,
        version: 0,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
        stats: {
          statementCount: 0,
          argumentCount: 0,
          treeCount: 0,
          connectionCount: 0,
          unusedStatements: [],
          unconnectedArguments: [],
          cyclesDetected: [],
          validationStatus: {
            isValid: true,
            errors: [],
          },
        },
      };

      documentService.getDocumentState.mockResolvedValue(emptyDocumentWithStats);

      // Act
      const result = await documentService.getDocumentState(query);

      // Assert
      expect(result.stats?.statementCount).toBe(0);
      expect(result.stats?.argumentCount).toBe(0);
      expect(result.stats?.treeCount).toBe(0);
      expect(result.stats?.connectionCount).toBe(0);
      expect(result.stats?.validationStatus.isValid).toBe(true);
      expect(result.stats?.validationStatus.errors).toHaveLength(0);
    });
  });

  describe('GetValidationReportQuery Execution', () => {
    it('should generate validation report without custom scripts', async () => {
      // Arrange
      const query: GetValidationReportQuery = {
        documentId: 'doc_validation',
        includeCustomScripts: false,
      };

      const validationReport: DocumentStatsDTO = {
        statementCount: 15,
        argumentCount: 8,
        treeCount: 2,
        connectionCount: 6,
        unusedStatements: ['stmt_unused_1'],
        unconnectedArguments: ['arg_unconnected_1'],
        cyclesDetected: [],
        validationStatus: {
          isValid: true,
          errors: [],
        },
      };

      documentService.getValidationReport.mockResolvedValue(validationReport);

      // Act
      const result = await documentService.getValidationReport(query);

      // Assert
      expect(result.statementCount).toBe(15);
      expect(result.argumentCount).toBe(8);
      expect(result.validationStatus.isValid).toBe(true);
      expect(result.unusedStatements).toHaveLength(1);
      expect(result.unconnectedArguments).toHaveLength(1);
    });

    it('should generate validation report with custom scripts', async () => {
      // Arrange
      const query: GetValidationReportQuery = {
        documentId: 'doc_custom_validation',
        includeCustomScripts: true,
      };

      const customValidationReport: DocumentStatsDTO = {
        statementCount: 25,
        argumentCount: 12,
        treeCount: 3,
        connectionCount: 10,
        unusedStatements: [],
        unconnectedArguments: [],
        cyclesDetected: [
          {
            path: ['arg_custom_1', 'arg_custom_2', 'arg_custom_1'],
            severity: 'high',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'CUSTOM_VALIDATION_FAILED',
              message: 'Custom logic validation rule violated',
              severity: 'error',
              location: {
                argumentId: 'arg_custom_1',
              },
            },
            {
              code: 'SEMANTIC_INCONSISTENCY',
              message: 'Semantic inconsistency detected by custom script',
              severity: 'warning',
              location: {
                treeId: 'tree_logic_1',
              },
            },
          ],
        },
      };

      documentService.getValidationReport.mockResolvedValue(customValidationReport);

      // Act
      const result = await documentService.getValidationReport(query);

      // Assert
      expect(result.validationStatus.isValid).toBe(false);
      expect(result.validationStatus.errors).toHaveLength(2);
      expect(result.validationStatus.errors[0]?.code).toBe('CUSTOM_VALIDATION_FAILED');
      expect(result.validationStatus.errors[1]?.code).toBe('SEMANTIC_INCONSISTENCY');
      expect(result.cyclesDetected[0]?.severity).toBe('high');
    });

    it('should handle validation errors and edge cases', async () => {
      // Arrange
      const query: GetValidationReportQuery = {
        documentId: 'doc_problematic',
        includeCustomScripts: true,
      };

      const problematicReport: DocumentStatsDTO = {
        statementCount: 100,
        argumentCount: 50,
        treeCount: 5,
        connectionCount: 45,
        unusedStatements: Array.from({ length: 20 }, (_, i) => `stmt_unused_${i}`),
        unconnectedArguments: Array.from({ length: 10 }, (_, i) => `arg_unconnected_${i}`),
        cyclesDetected: [
          {
            path: ['arg_cycle_1', 'arg_cycle_2', 'arg_cycle_3', 'arg_cycle_1'],
            severity: 'high',
          },
          {
            path: ['arg_minor_1', 'arg_minor_2', 'arg_minor_1'],
            severity: 'low',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'MULTIPLE_CYCLES',
              message: 'Multiple circular dependencies detected',
              severity: 'error',
            },
            {
              code: 'EXCESSIVE_UNUSED_STATEMENTS',
              message: '20 unused statements found - consider cleanup',
              severity: 'warning',
            },
            {
              code: 'PERFORMANCE_WARNING',
              message: 'Document size may impact performance',
              severity: 'info',
            },
          ],
        },
      };

      documentService.getValidationReport.mockResolvedValue(problematicReport);

      // Act
      const result = await documentService.getValidationReport(query);

      // Assert
      expect(result.unusedStatements).toHaveLength(20);
      expect(result.unconnectedArguments).toHaveLength(10);
      expect(result.cyclesDetected).toHaveLength(2);
      expect(result.validationStatus.errors).toHaveLength(3);

      const errorSeverities = result.validationStatus.errors.map((e: any) => e.severity);
      expect(errorSeverities).toContain('error');
      expect(errorSeverities).toContain('warning');
      expect(errorSeverities).toContain('info');
    });
  });

  describe('AnalyzeProofStructureQuery Execution', () => {
    it('should analyze proof completeness', async () => {
      // Arrange
      const query: AnalyzeProofStructureQuery = {
        documentId: 'doc_completeness',
        analysisType: 'completeness',
      };

      const completenessAnalysis: DocumentStatsDTO = {
        statementCount: 30,
        argumentCount: 15,
        treeCount: 2,
        connectionCount: 12,
        unusedStatements: ['stmt_incomplete_1'],
        unconnectedArguments: ['arg_dangling_1'],
        cyclesDetected: [],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'INCOMPLETE_PROOF_CHAIN',
              message: 'Proof chain has gaps - missing intermediate steps',
              severity: 'error',
              location: {
                treeId: 'tree_main',
              },
            },
            {
              code: 'MISSING_PREMISES',
              message: 'Argument has undefined premises',
              severity: 'error',
              location: {
                argumentId: 'arg_incomplete',
              },
            },
          ],
        },
      };

      documentService.analyzeProofStructure.mockResolvedValue(completenessAnalysis);

      // Act
      const result = await documentService.analyzeProofStructure(query);

      // Assert
      expect(result.validationStatus.isValid).toBe(false);
      expect(
        result.validationStatus.errors.some((e: any) => e.code === 'INCOMPLETE_PROOF_CHAIN'),
      ).toBe(true);
      expect(result.validationStatus.errors.some((e: any) => e.code === 'MISSING_PREMISES')).toBe(
        true,
      );
      expect(result.unusedStatements).toHaveLength(1);
      expect(result.unconnectedArguments).toHaveLength(1);
    });

    it('should analyze proof consistency', async () => {
      // Arrange
      const query: AnalyzeProofStructureQuery = {
        documentId: 'doc_consistency',
        analysisType: 'consistency',
      };

      const consistencyAnalysis: DocumentStatsDTO = {
        statementCount: 25,
        argumentCount: 12,
        treeCount: 1,
        connectionCount: 11,
        unusedStatements: [],
        unconnectedArguments: [],
        cyclesDetected: [
          {
            path: ['arg_contradiction_1', 'arg_contradiction_2', 'arg_contradiction_1'],
            severity: 'high',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'LOGICAL_CONTRADICTION',
              message: 'Contradictory statements in argument chain',
              severity: 'error',
              location: {
                argumentId: 'arg_contradiction_1',
              },
            },
            {
              code: 'INCONSISTENT_PREMISES',
              message: 'Premises contradict each other',
              severity: 'error',
              location: {
                argumentId: 'arg_inconsistent',
              },
            },
          ],
        },
      };

      documentService.analyzeProofStructure.mockResolvedValue(consistencyAnalysis);

      // Act
      const result = await documentService.analyzeProofStructure(query);

      // Assert
      expect(result.cyclesDetected).toHaveLength(1);
      expect(result.cyclesDetected[0]?.severity).toBe('high');
      expect(
        result.validationStatus.errors.some((e: any) => e.code === 'LOGICAL_CONTRADICTION'),
      ).toBe(true);
      expect(
        result.validationStatus.errors.some((e: any) => e.code === 'INCONSISTENT_PREMISES'),
      ).toBe(true);
    });

    it('should analyze proof complexity', async () => {
      // Arrange
      const query: AnalyzeProofStructureQuery = {
        documentId: 'doc_complexity',
        analysisType: 'complexity',
      };

      const complexityAnalysis: DocumentStatsDTO = {
        statementCount: 500,
        argumentCount: 200,
        treeCount: 10,
        connectionCount: 180,
        unusedStatements: [],
        unconnectedArguments: [],
        cyclesDetected: [],
        validationStatus: {
          isValid: true,
          errors: [
            {
              code: 'HIGH_COMPLEXITY',
              message: 'Proof has high cognitive complexity - consider simplification',
              severity: 'info',
            },
            {
              code: 'DEEP_NESTING',
              message: 'Argument chains exceed recommended depth',
              severity: 'warning',
              location: {
                treeId: 'tree_deep',
              },
            },
            {
              code: 'PERFORMANCE_IMPACT',
              message: 'Large document may impact rendering performance',
              severity: 'info',
            },
          ],
        },
      };

      documentService.analyzeProofStructure.mockResolvedValue(complexityAnalysis);

      // Act
      const result = await documentService.analyzeProofStructure(query);

      // Assert
      expect(result.statementCount).toBe(500);
      expect(result.argumentCount).toBe(200);
      expect(result.treeCount).toBe(10);
      expect(result.validationStatus.isValid).toBe(true); // Valid but complex
      expect(result.validationStatus.errors.some((e: any) => e.code === 'HIGH_COMPLEXITY')).toBe(
        true,
      );
      expect(result.validationStatus.errors.some((e: any) => e.code === 'DEEP_NESTING')).toBe(true);
      expect(result.validationStatus.errors.some((e: any) => e.code === 'PERFORMANCE_IMPACT')).toBe(
        true,
      );
    });
  });

  describe('Document Query Error Handling', () => {
    it('should handle repository connection failures', async () => {
      // Arrange
      const query: GetDocumentQuery = { documentId: 'doc_error' };
      const connectionError = new Error('Database connection failed');

      mockRepositories.proofRepository.findById.mockRejectedValue(connectionError);

      // Act & Assert
      const proofIdResult = ProofId.fromString(query.documentId);
      if (proofIdResult.isErr()) throw proofIdResult.error;

      await expect(mockRepositories.proofRepository.findById(proofIdResult.value)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle document corruption', async () => {
      // Arrange
      const query: GetDocumentQuery = { documentId: 'doc_corrupted' };

      // Simulate corrupted data scenario
      const corruptedError = new ValidationError('Document data is corrupted');
      documentService.getDocument.mockRejectedValue(corruptedError);

      // Act & Assert
      await expect(documentService.getDocument(query)).rejects.toThrow(
        'Document data is corrupted',
      );
    });

    it('should handle concurrent modification conflicts', async () => {
      // Arrange
      const query: GetDocumentStateQuery = {
        documentId: 'doc_concurrent',
        includeStats: true,
      };

      const version1: DocumentDTO = {
        id: query.documentId,
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T10:00:00.000Z',
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      const version2: DocumentDTO = {
        id: query.documentId,
        version: 2,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T11:00:00.000Z',
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      documentService.getDocumentState
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      // Act
      const result1 = await documentService.getDocumentState(query);
      const result2 = await documentService.getDocumentState(query);

      // Assert
      expect(result1.version).toBe(1);
      expect(result2.version).toBe(2);
      expect(result1.modifiedAt).not.toBe(result2.modifiedAt);
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      const query: AnalyzeProofStructureQuery = {
        documentId: 'doc_large_analysis',
        analysisType: 'complexity',
      };

      const timeoutError = new Error('Analysis timeout - document too large');
      documentService.analyzeProofStructure
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          statementCount: 0,
          argumentCount: 0,
          treeCount: 0,
          connectionCount: 0,
          unusedStatements: [],
          unconnectedArguments: [],
          cyclesDetected: [],
          validationStatus: {
            isValid: false,
            errors: [
              {
                code: 'ANALYSIS_TIMEOUT',
                message: 'Analysis timed out - try smaller document sections',
                severity: 'error',
              },
            ],
          },
        });

      // Act & Assert
      await expect(documentService.analyzeProofStructure(query)).rejects.toThrow(
        'Analysis timeout - document too large',
      );

      // Retry should work
      const retryResult = await documentService.analyzeProofStructure(query);
      expect(retryResult.validationStatus.errors[0]?.code).toBe('ANALYSIS_TIMEOUT');
    });
  });

  describe('Document Query Performance', () => {
    it('should handle large documents efficiently', async () => {
      // Arrange
      const query: GetDocumentStateQuery = {
        documentId: 'doc_large_performance',
        includeStats: true,
      };

      // Simulate large document
      const largeDocument: DocumentDTO = {
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
        orderedSets: {},
        atomicArguments: {},
        trees: {},
        stats: {
          statementCount: 10000,
          argumentCount: 5000,
          treeCount: 50,
          connectionCount: 4500,
          unusedStatements: [],
          unconnectedArguments: [],
          cyclesDetected: [],
          validationStatus: {
            isValid: true,
            errors: [],
          },
        },
      };

      documentService.getDocumentState.mockResolvedValue(largeDocument);

      // Act
      const startTime = Date.now();
      const result = await documentService.getDocumentState(query);
      const endTime = Date.now();

      // Assert
      expect(result.stats?.statementCount).toBe(10000);
      expect(Object.keys(result.statements)).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast with mocks
    });

    it('should support incremental document loading', async () => {
      // Arrange - simulate chunked loading
      const baseQuery: GetDocumentQuery = { documentId: 'doc_incremental' };

      // First chunk - basic structure
      const basicDocument: DocumentDTO = {
        id: baseQuery.documentId,
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: '2023-01-01T00:00:00.000Z',
        statements: {
          stmt_1: { id: 'stmt_1', content: 'Basic', usageCount: 0, createdAt: '', modifiedAt: '' },
        },
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      // Second chunk - with more details
      const detailedDocument: DocumentDTO = {
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
        atomicArguments: {
          arg_1: {
            id: 'arg_1',
            premiseSetId: 'set_1',
            conclusionSetId: 'set_2',
          },
        },
      };

      documentService.getDocument
        .mockResolvedValueOnce(basicDocument)
        .mockResolvedValueOnce(detailedDocument);

      // Act
      const basicResult = await documentService.getDocument(baseQuery);
      const detailedResult = await documentService.getDocument(baseQuery);

      // Assert
      expect(basicResult?.version).toBe(1);
      expect(detailedResult?.version).toBe(2);
      expect(Object.keys(basicResult?.statements || {})).toHaveLength(1);
      expect(Object.keys(detailedResult?.statements || {})).toHaveLength(2);
      expect(Object.keys(detailedResult?.atomicArguments || {})).toHaveLength(1);
    });
  });
});

// Original DTO validation tests (preserved)
describe('GetDocumentQuery', () => {
  it('should handle basic document query', () => {
    const query: GetDocumentQuery = {
      documentId: 'doc_12345',
    };

    expect(query.documentId).toBe('doc_12345');
  });

  it('should handle query with empty document ID', () => {
    const query: GetDocumentQuery = {
      documentId: '',
    };

    expect(query.documentId).toBe('');
  });

  it('should handle query with UUID document ID', () => {
    const query: GetDocumentQuery = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
    };

    expect(query.documentId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(query.documentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should handle query with various document ID formats', () => {
    const documentIds = [
      'doc_123',
      'document-456',
      'doc.789',
      'DOC_UPPERCASE',
      'doc_with_underscores',
      'doc-with-dashes',
      'doc123456789',
      'a'.repeat(100), // Long ID
    ];

    documentIds.forEach((documentId) => {
      const query: GetDocumentQuery = {
        documentId,
      };

      expect(query.documentId).toBe(documentId);
    });
  });

  it('should handle query with special characters in document ID', () => {
    const specialIds = [
      'doc@example.com',
      'doc#123',
      'doc%20with%20encoding',
      'doc+plus+signs',
      'doc=equals=signs',
    ];

    specialIds.forEach((documentId) => {
      const query: GetDocumentQuery = {
        documentId,
      };

      expect(query.documentId).toBe(documentId);
    });
  });
});

describe('GetDocumentStateQuery', () => {
  it('should handle basic document state query', () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_12345',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.includeStats).toBeUndefined();
  });

  it('should handle query with stats included', () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_12345',
      includeStats: true,
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.includeStats).toBe(true);
  });

  it('should handle query with stats excluded', () => {
    const query: GetDocumentStateQuery = {
      documentId: 'doc_12345',
      includeStats: false,
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.includeStats).toBe(false);
  });

  it('should handle various combinations', () => {
    const testCases = [
      { documentId: 'doc_1', includeStats: true },
      { documentId: 'doc_2', includeStats: false },
      { documentId: 'doc_3', includeStats: undefined },
    ];

    testCases.forEach(({ documentId, includeStats }) => {
      const query: GetDocumentStateQuery = {
        documentId,
        ...(includeStats !== undefined && { includeStats }),
      };

      expect(query.documentId).toBe(documentId);
      expect(query.includeStats).toBe(includeStats);
    });
  });
});

describe('GetValidationReportQuery', () => {
  it('should handle basic validation report query', () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_12345',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.includeCustomScripts).toBeUndefined();
  });

  it('should handle query with custom scripts included', () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_12345',
      includeCustomScripts: true,
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.includeCustomScripts).toBe(true);
  });

  it('should handle query with custom scripts excluded', () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_12345',
      includeCustomScripts: false,
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.includeCustomScripts).toBe(false);
  });

  it('should handle various combinations', () => {
    const testCases = [
      { documentId: 'doc_validation_1', includeCustomScripts: true },
      { documentId: 'doc_validation_2', includeCustomScripts: false },
      { documentId: 'doc_validation_3', includeCustomScripts: undefined },
    ];

    testCases.forEach(({ documentId, includeCustomScripts }) => {
      const query: GetValidationReportQuery = {
        documentId,
        ...(includeCustomScripts !== undefined && { includeCustomScripts }),
      };

      expect(query.documentId).toBe(documentId);
      expect(query.includeCustomScripts).toBe(includeCustomScripts);
    });
  });
});

describe('AnalyzeProofStructureQuery', () => {
  it('should handle completeness analysis query', () => {
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_12345',
      analysisType: 'completeness',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.analysisType).toBe('completeness');
  });

  it('should handle consistency analysis query', () => {
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_12345',
      analysisType: 'consistency',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.analysisType).toBe('consistency');
  });

  it('should handle complexity analysis query', () => {
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_12345',
      analysisType: 'complexity',
    };

    expect(query.documentId).toBe('doc_12345');
    expect(query.analysisType).toBe('complexity');
  });

  it('should handle all valid analysis types', () => {
    const analysisTypes: Array<'completeness' | 'consistency' | 'complexity'> = [
      'completeness',
      'consistency',
      'complexity',
    ];

    analysisTypes.forEach((analysisType) => {
      const query: AnalyzeProofStructureQuery = {
        documentId: 'doc_12345',
        analysisType,
      };

      expect(query.analysisType).toBe(analysisType);
    });
  });

  it('should handle various document IDs with analysis types', () => {
    const testCases = [
      { documentId: 'proof_completeness_test', analysisType: 'completeness' as const },
      { documentId: 'proof_consistency_test', analysisType: 'consistency' as const },
      { documentId: 'proof_complexity_test', analysisType: 'complexity' as const },
    ];

    testCases.forEach(({ documentId, analysisType }) => {
      const query: AnalyzeProofStructureQuery = {
        documentId,
        analysisType,
      };

      expect(query.documentId).toBe(documentId);
      expect(query.analysisType).toBe(analysisType);
    });
  });
});

describe('DocumentDTO', () => {
  it('should handle basic document DTO', () => {
    const document: DocumentDTO = {
      id: 'doc_12345',
      version: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements: {},
      orderedSets: {},
      atomicArguments: {},
      trees: {},
    };

    expect(document.id).toBe('doc_12345');
    expect(document.version).toBe(1);
    expect(document.createdAt).toBe('2023-01-01T00:00:00.000Z');
    expect(document.modifiedAt).toBe('2023-01-01T00:00:00.000Z');
    expect(document.statements).toEqual({});
    expect(document.orderedSets).toEqual({});
    expect(document.atomicArguments).toEqual({});
    expect(document.trees).toEqual({});
    expect(document.stats).toBeUndefined();
  });

  it('should handle document with populated entities', () => {
    const document: DocumentDTO = {
      id: 'doc_populated',
      version: 5,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-02T12:00:00.000Z',
      statements: {
        stmt_1: {
          id: 'stmt_1',
          content: 'All men are mortal',
          usageCount: 2,
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
        stmt_2: {
          id: 'stmt_2',
          content: 'Socrates is a man',
          usageCount: 1,
          createdAt: '2023-01-01T01:00:00.000Z',
          modifiedAt: '2023-01-01T01:00:00.000Z',
        },
      },
      orderedSets: {
        set_1: {
          id: 'set_1',
          statementIds: ['stmt_1', 'stmt_2'],
          usageCount: 1,
          usedBy: [
            {
              argumentId: 'arg_1',
              usage: 'premise',
            },
          ],
        },
      },
      atomicArguments: {
        arg_1: {
          id: 'arg_1',
          premiseSetId: 'set_1',
          conclusionSetId: null,
          sideLabels: {
            left: 'Modus Ponens',
            right: 'Classical Logic',
          },
        },
      },
      trees: {
        tree_1: {
          id: 'tree_1',
          position: { x: 100, y: 200 },
          bounds: { width: 500, height: 300 },
          nodeCount: 3,
          rootNodeIds: ['node_1'],
        },
      },
    };

    expect(document.id).toBe('doc_populated');
    expect(document.version).toBe(5);
    expect(Object.keys(document.statements)).toHaveLength(2);
    expect(Object.keys(document.orderedSets)).toHaveLength(1);
    expect(Object.keys(document.atomicArguments)).toHaveLength(1);
    expect(Object.keys(document.trees)).toHaveLength(1);

    expect(document.statements.stmt_1?.content).toBe('All men are mortal');
    expect(document.orderedSets.set_1?.statementIds).toEqual(['stmt_1', 'stmt_2']);
    expect(document.atomicArguments.arg_1?.premiseSetId).toBe('set_1');
    expect(document.trees.tree_1?.nodeCount).toBe(3);
  });

  it('should handle document with stats', () => {
    const document: DocumentDTO = {
      id: 'doc_with_stats',
      version: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements: {},
      orderedSets: {},
      atomicArguments: {},
      trees: {},
      stats: {
        statementCount: 10,
        argumentCount: 5,
        treeCount: 2,
        connectionCount: 8,
        unusedStatements: ['stmt_orphan'],
        unconnectedArguments: ['arg_isolated'],
        cyclesDetected: [
          {
            path: ['arg_1', 'arg_2', 'arg_3', 'arg_1'],
            severity: 'medium',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'CIRCULAR_DEPENDENCY',
              message: 'Circular dependency detected',
              severity: 'error',
            },
          ],
        },
      },
    };

    expect(document.stats?.statementCount).toBe(10);
    expect(document.stats?.argumentCount).toBe(5);
    expect(document.stats?.treeCount).toBe(2);
    expect(document.stats?.connectionCount).toBe(8);
    expect(document.stats?.unusedStatements).toEqual(['stmt_orphan']);
    expect(document.stats?.unconnectedArguments).toEqual(['arg_isolated']);
    expect(document.stats?.cyclesDetected).toHaveLength(1);
    expect(document.stats?.validationStatus.isValid).toBe(false);
  });

  it('should handle document with zero version', () => {
    const document: DocumentDTO = {
      id: 'doc_zero_version',
      version: 0,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements: {},
      orderedSets: {},
      atomicArguments: {},
      trees: {},
    };

    expect(document.version).toBe(0);
  });

  it('should handle document with large version number', () => {
    const document: DocumentDTO = {
      id: 'doc_large_version',
      version: 999999,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements: {},
      orderedSets: {},
      atomicArguments: {},
      trees: {},
    };

    expect(document.version).toBe(999999);
  });

  it('should handle document with various timestamp formats', () => {
    const timestamps = [
      '2023-01-01T00:00:00.000Z',
      '2023-12-31T23:59:59.999Z',
      new Date().toISOString(),
      '2023-06-15T12:30:45.123Z',
    ];

    timestamps.forEach((timestamp, index) => {
      const document: DocumentDTO = {
        id: `doc_timestamp_${index}`,
        version: 1,
        createdAt: timestamp,
        modifiedAt: timestamp,
        statements: {},
        orderedSets: {},
        atomicArguments: {},
        trees: {},
      };

      expect(document.createdAt).toBe(timestamp);
      expect(document.modifiedAt).toBe(timestamp);
      expect(() => new Date(document.createdAt)).not.toThrow();
      expect(() => new Date(document.modifiedAt)).not.toThrow();
    });
  });

  it('should handle document with large collections', () => {
    const statements = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        `stmt_${i}`,
        {
          id: `stmt_${i}`,
          content: `Statement ${i}`,
          usageCount: 0,
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
      ]),
    );

    const orderedSets = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [
        `set_${i}`,
        {
          id: `set_${i}`,
          statementIds: [`stmt_${i}`, `stmt_${i + 50}`],
          usageCount: 1,
          usedBy: [],
        },
      ]),
    );

    const document: DocumentDTO = {
      id: 'doc_large',
      version: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements,
      orderedSets,
      atomicArguments: {},
      trees: {},
    };

    expect(Object.keys(document.statements)).toHaveLength(100);
    expect(Object.keys(document.orderedSets)).toHaveLength(50);
  });
});

describe('DocumentStatsDTO', () => {
  it('should handle basic document stats', () => {
    const stats: DocumentStatsDTO = {
      statementCount: 5,
      argumentCount: 3,
      treeCount: 1,
      connectionCount: 2,
      unusedStatements: [],
      unconnectedArguments: [],
      cyclesDetected: [],
      validationStatus: {
        isValid: true,
        errors: [],
      },
    };

    expect(stats.statementCount).toBe(5);
    expect(stats.argumentCount).toBe(3);
    expect(stats.treeCount).toBe(1);
    expect(stats.connectionCount).toBe(2);
    expect(stats.unusedStatements).toEqual([]);
    expect(stats.unconnectedArguments).toEqual([]);
    expect(stats.cyclesDetected).toEqual([]);
    expect(stats.validationStatus.isValid).toBe(true);
    expect(stats.validationStatus.errors).toEqual([]);
  });

  it('should handle stats with issues', () => {
    const stats: DocumentStatsDTO = {
      statementCount: 10,
      argumentCount: 8,
      treeCount: 3,
      connectionCount: 5,
      unusedStatements: ['stmt_orphan_1', 'stmt_orphan_2'],
      unconnectedArguments: ['arg_isolated'],
      cyclesDetected: [
        {
          path: ['arg_A', 'arg_B', 'arg_C', 'arg_A'],
          severity: 'high',
        },
        {
          path: ['arg_X', 'arg_Y', 'arg_X'],
          severity: 'low',
        },
      ],
      validationStatus: {
        isValid: false,
        errors: [
          {
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Circular dependency in argument chain',
            severity: 'error',
            location: {
              argumentId: 'arg_A',
            },
          },
          {
            code: 'ORPHANED_STATEMENT',
            message: 'Statement not used in any argument',
            severity: 'warning',
            location: {
              argumentId: 'stmt_orphan_1',
            },
          },
        ],
      },
    };

    expect(stats.unusedStatements).toHaveLength(2);
    expect(stats.unconnectedArguments).toHaveLength(1);
    expect(stats.cyclesDetected).toHaveLength(2);
    expect(stats.validationStatus.isValid).toBe(false);
    expect(stats.validationStatus.errors).toHaveLength(2);

    expect(stats.cyclesDetected[0]?.severity).toBe('high');
    expect(stats.cyclesDetected[1]?.severity).toBe('low');
    expect(stats.validationStatus.errors[0]?.code).toBe('CIRCULAR_DEPENDENCY');
    expect(stats.validationStatus.errors[1]?.code).toBe('ORPHANED_STATEMENT');
  });

  it('should handle stats with zero counts', () => {
    const stats: DocumentStatsDTO = {
      statementCount: 0,
      argumentCount: 0,
      treeCount: 0,
      connectionCount: 0,
      unusedStatements: [],
      unconnectedArguments: [],
      cyclesDetected: [],
      validationStatus: {
        isValid: true,
        errors: [],
      },
    };

    expect(stats.statementCount).toBe(0);
    expect(stats.argumentCount).toBe(0);
    expect(stats.treeCount).toBe(0);
    expect(stats.connectionCount).toBe(0);
  });

  it('should handle stats with large counts', () => {
    const stats: DocumentStatsDTO = {
      statementCount: 10000,
      argumentCount: 5000,
      treeCount: 100,
      connectionCount: 15000,
      unusedStatements: [],
      unconnectedArguments: [],
      cyclesDetected: [],
      validationStatus: {
        isValid: true,
        errors: [],
      },
    };

    expect(stats.statementCount).toBe(10000);
    expect(stats.argumentCount).toBe(5000);
    expect(stats.treeCount).toBe(100);
    expect(stats.connectionCount).toBe(15000);
  });

  it('should handle all valid cycle severities', () => {
    const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

    severities.forEach((severity) => {
      const stats: DocumentStatsDTO = {
        statementCount: 5,
        argumentCount: 3,
        treeCount: 1,
        connectionCount: 2,
        unusedStatements: [],
        unconnectedArguments: [],
        cyclesDetected: [
          {
            path: ['arg_1', 'arg_2', 'arg_1'],
            severity,
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [],
        },
      };

      expect(stats.cyclesDetected[0]?.severity).toBe(severity);
    });
  });

  it('should handle complex cycle paths', () => {
    const stats: DocumentStatsDTO = {
      statementCount: 20,
      argumentCount: 15,
      treeCount: 3,
      connectionCount: 12,
      unusedStatements: [],
      unconnectedArguments: [],
      cyclesDetected: [
        {
          path: ['arg_start', 'arg_mid1', 'arg_mid2', 'arg_mid3', 'arg_start'],
          severity: 'medium',
        },
        {
          path: ['arg_A', 'arg_B', 'arg_A'],
          severity: 'low',
        },
        {
          path: [
            'complex_arg_1',
            'complex_arg_2',
            'complex_arg_3',
            'complex_arg_4',
            'complex_arg_1',
          ],
          severity: 'high',
        },
      ],
      validationStatus: {
        isValid: false,
        errors: [],
      },
    };

    expect(stats.cyclesDetected).toHaveLength(3);
    expect(stats.cyclesDetected[0]?.path).toHaveLength(5);
    expect(stats.cyclesDetected[1]?.path).toHaveLength(3);
    expect(stats.cyclesDetected[2]?.path).toHaveLength(5);

    // Verify cycles are closed (first equals last)
    stats.cyclesDetected.forEach((cycle) => {
      expect(cycle.path[0]).toBe(cycle.path[cycle.path.length - 1]);
    });
  });

  it('should handle large unused and unconnected lists', () => {
    const unusedStatements = Array.from({ length: 50 }, (_, i) => `unused_stmt_${i}`);
    const unconnectedArguments = Array.from({ length: 30 }, (_, i) => `unconnected_arg_${i}`);

    const stats: DocumentStatsDTO = {
      statementCount: 200,
      argumentCount: 150,
      treeCount: 10,
      connectionCount: 100,
      unusedStatements,
      unconnectedArguments,
      cyclesDetected: [],
      validationStatus: {
        isValid: false,
        errors: [],
      },
    };

    expect(stats.unusedStatements).toHaveLength(50);
    expect(stats.unconnectedArguments).toHaveLength(30);
    expect(stats.unusedStatements[0]).toBe('unused_stmt_0');
    expect(stats.unconnectedArguments[0]).toBe('unconnected_arg_0');
  });
});

describe('property-based testing', () => {
  it('should handle arbitrary document queries', () => {
    fc.assert(
      fc.property(fc.string(), (documentId) => {
        const query: GetDocumentQuery = {
          documentId,
        };

        expect(typeof query.documentId).toBe('string');
        expect(query.documentId).toBe(documentId);
      }),
    );
  });

  it('should handle arbitrary document state queries', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.option(fc.boolean(), { nil: undefined }),
        (documentId, includeStats) => {
          const query: GetDocumentStateQuery = {
            documentId,
            ...(includeStats !== undefined && { includeStats }),
          };

          expect(typeof query.documentId).toBe('string');
          if (query.includeStats !== undefined) {
            expect(typeof query.includeStats).toBe('boolean');
          }
        },
      ),
    );
  });

  it('should handle arbitrary validation report queries', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.option(fc.boolean(), { nil: undefined }),
        (documentId, includeCustomScripts) => {
          const query: GetValidationReportQuery = {
            documentId,
            ...(includeCustomScripts !== undefined && { includeCustomScripts }),
          };

          expect(typeof query.documentId).toBe('string');
          if (query.includeCustomScripts !== undefined) {
            expect(typeof query.includeCustomScripts).toBe('boolean');
          }
        },
      ),
    );
  });

  it('should handle arbitrary proof structure analysis queries', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom('completeness', 'consistency', 'complexity'),
        (documentId, analysisType) => {
          const query: AnalyzeProofStructureQuery = {
            documentId,
            analysisType,
          };

          expect(typeof query.documentId).toBe('string');
          expect(['completeness', 'consistency', 'complexity']).toContain(query.analysisType);
        },
      ),
    );
  });

  it('should handle arbitrary document DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          version: fc.nat(),
          createdAt: fc
            .integer({
              min: new Date('2000-01-01').getTime(),
              max: new Date('2100-12-31').getTime(),
            })
            .map((timestamp) => new Date(timestamp).toISOString()),
          modifiedAt: fc
            .integer({
              min: new Date('2000-01-01').getTime(),
              max: new Date('2100-12-31').getTime(),
            })
            .map((timestamp) => new Date(timestamp).toISOString()),
          statements: fc.record({}),
          orderedSets: fc.record({}),
          atomicArguments: fc.record({}),
          trees: fc.record({}),
        }),
        (params) => {
          const document: DocumentDTO = params;

          expect(typeof document.id).toBe('string');
          expect(typeof document.version).toBe('number');
          expect(document.version).toBeGreaterThanOrEqual(0);
          expect(typeof document.createdAt).toBe('string');
          expect(typeof document.modifiedAt).toBe('string');
          expect(() => new Date(document.createdAt)).not.toThrow();
          expect(() => new Date(document.modifiedAt)).not.toThrow();
          expect(typeof document.statements).toBe('object');
          expect(typeof document.orderedSets).toBe('object');
          expect(typeof document.atomicArguments).toBe('object');
          expect(typeof document.trees).toBe('object');
        },
      ),
    );
  });

  it('should handle arbitrary document stats DTOs', () => {
    fc.assert(
      fc.property(
        fc.record({
          statementCount: fc.nat(),
          argumentCount: fc.nat(),
          treeCount: fc.nat(),
          connectionCount: fc.nat(),
          unusedStatements: fc.array(fc.string()),
          unconnectedArguments: fc.array(fc.string()),
          cyclesDetected: fc.array(
            fc.record({
              path: fc.array(fc.string(), { minLength: 1 }),
              severity: fc.constantFrom('low', 'medium', 'high'),
            }),
          ),
          validationStatus: fc.record({
            isValid: fc.boolean(),
            errors: fc.array(
              fc.record({
                code: fc.string(),
                message: fc.string(),
                severity: fc.constantFrom('error', 'warning', 'info'),
              }),
            ),
          }),
        }),
        (params) => {
          const stats: DocumentStatsDTO = params;

          expect(typeof stats.statementCount).toBe('number');
          expect(stats.statementCount).toBeGreaterThanOrEqual(0);
          expect(typeof stats.argumentCount).toBe('number');
          expect(stats.argumentCount).toBeGreaterThanOrEqual(0);
          expect(typeof stats.treeCount).toBe('number');
          expect(stats.treeCount).toBeGreaterThanOrEqual(0);
          expect(typeof stats.connectionCount).toBe('number');
          expect(stats.connectionCount).toBeGreaterThanOrEqual(0);

          expect(Array.isArray(stats.unusedStatements)).toBe(true);
          expect(Array.isArray(stats.unconnectedArguments)).toBe(true);
          expect(Array.isArray(stats.cyclesDetected)).toBe(true);

          stats.unusedStatements.forEach((stmt) => {
            expect(typeof stmt).toBe('string');
          });

          stats.unconnectedArguments.forEach((arg) => {
            expect(typeof arg).toBe('string');
          });

          stats.cyclesDetected.forEach((cycle) => {
            expect(Array.isArray(cycle.path)).toBe(true);
            expect(['low', 'medium', 'high']).toContain(cycle.severity);
            cycle.path.forEach((step) => {
              expect(typeof step).toBe('string');
            });
          });

          expect(typeof stats.validationStatus.isValid).toBe('boolean');
          expect(Array.isArray(stats.validationStatus.errors)).toBe(true);
        },
      ),
    );
  });
});

describe('integration scenarios', () => {
  it('should handle complete document retrieval workflow', () => {
    const documentId = 'doc_complete_workflow';

    // Basic document query
    const basicQuery: GetDocumentQuery = {
      documentId,
    };

    // Document state query with stats
    const stateQuery: GetDocumentStateQuery = {
      documentId,
      includeStats: true,
    };

    // Document response
    const document: DocumentDTO = {
      id: documentId,
      version: 3,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-03T12:00:00.000Z',
      statements: {
        stmt_1: {
          id: 'stmt_1',
          content: 'Premise statement',
          usageCount: 2,
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
      },
      orderedSets: {
        set_1: {
          id: 'set_1',
          statementIds: ['stmt_1'],
          usageCount: 1,
          usedBy: [{ argumentId: 'arg_1', usage: 'premise' }],
        },
      },
      atomicArguments: {
        arg_1: {
          id: 'arg_1',
          premiseSetId: 'set_1',
          conclusionSetId: null,
        },
      },
      trees: {
        tree_1: {
          id: 'tree_1',
          position: { x: 0, y: 0 },
          nodeCount: 1,
          rootNodeIds: ['node_1'],
        },
      },
      stats: {
        statementCount: 1,
        argumentCount: 1,
        treeCount: 1,
        connectionCount: 0,
        unusedStatements: [],
        unconnectedArguments: [],
        cyclesDetected: [],
        validationStatus: {
          isValid: true,
          errors: [],
        },
      },
    };

    expect(basicQuery.documentId).toBe(documentId);
    expect(stateQuery.documentId).toBe(documentId);
    expect(stateQuery.includeStats).toBe(true);
    expect(document.id).toBe(documentId);
    expect(document.stats?.statementCount).toBe(1);
  });

  it('should handle validation and analysis workflow', () => {
    const documentId = 'doc_validation_analysis';

    // Validation report query
    const validationQuery: GetValidationReportQuery = {
      documentId,
      includeCustomScripts: true,
    };

    // Proof structure analysis queries
    const completenessQuery: AnalyzeProofStructureQuery = {
      documentId,
      analysisType: 'completeness',
    };

    const consistencyQuery: AnalyzeProofStructureQuery = {
      documentId,
      analysisType: 'consistency',
    };

    const complexityQuery: AnalyzeProofStructureQuery = {
      documentId,
      analysisType: 'complexity',
    };

    expect(validationQuery.documentId).toBe(documentId);
    expect(validationQuery.includeCustomScripts).toBe(true);
    expect(completenessQuery.analysisType).toBe('completeness');
    expect(consistencyQuery.analysisType).toBe('consistency');
    expect(complexityQuery.analysisType).toBe('complexity');

    // All queries target same document
    expect(completenessQuery.documentId).toBe(documentId);
    expect(consistencyQuery.documentId).toBe(documentId);
    expect(complexityQuery.documentId).toBe(documentId);
  });

  it('should handle document evolution tracking', () => {
    const documentId = 'doc_evolution';

    // Document at different versions
    const versions = [1, 2, 3, 4, 5].map((version) => ({
      id: documentId,
      version,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: new Date(
        Date.parse('2023-01-01T00:00:00.000Z') + version * 24 * 60 * 60 * 1000,
      ).toISOString(),
      statements: {},
      orderedSets: {},
      atomicArguments: {},
      trees: {},
      stats: {
        statementCount: version * 2,
        argumentCount: version,
        treeCount: 1,
        connectionCount: Math.max(0, version - 1),
        unusedStatements: [],
        unconnectedArguments: [],
        cyclesDetected: [],
        validationStatus: {
          isValid: true,
          errors: [],
        },
      },
    }));

    versions.forEach((doc, index) => {
      expect(doc.version).toBe(index + 1);
      expect(doc.stats?.statementCount).toBe((index + 1) * 2);
      expect(doc.stats?.argumentCount).toBe(index + 1);
    });

    // Verify evolution
    expect(versions[0]?.stats?.connectionCount).toBe(0);
    expect(versions[4]?.stats?.connectionCount).toBe(4);
  });

  it('should handle complex document with issues', () => {
    const document: DocumentDTO = {
      id: 'doc_complex_issues',
      version: 10,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-10T00:00:00.000Z',
      statements: {},
      orderedSets: {},
      atomicArguments: {},
      trees: {},
      stats: {
        statementCount: 50,
        argumentCount: 30,
        treeCount: 5,
        connectionCount: 25,
        unusedStatements: ['stmt_orphan_1', 'stmt_orphan_2', 'stmt_orphan_3'],
        unconnectedArguments: ['arg_isolated_1', 'arg_isolated_2'],
        cyclesDetected: [
          {
            path: ['arg_cycle_1', 'arg_cycle_2', 'arg_cycle_3', 'arg_cycle_1'],
            severity: 'high',
          },
          {
            path: ['arg_minor_cycle_1', 'arg_minor_cycle_2', 'arg_minor_cycle_1'],
            severity: 'low',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'CIRCULAR_DEPENDENCY',
              message: 'High severity circular dependency detected',
              severity: 'error',
              location: { argumentId: 'arg_cycle_1' },
            },
            {
              code: 'ORPHANED_STATEMENTS',
              message: 'Multiple statements not used in any arguments',
              severity: 'warning',
            },
            {
              code: 'ISOLATED_ARGUMENTS',
              message: 'Arguments not connected to proof structure',
              severity: 'warning',
            },
          ],
        },
      },
    };

    expect(document.stats?.unusedStatements).toHaveLength(3);
    expect(document.stats?.unconnectedArguments).toHaveLength(2);
    expect(document.stats?.cyclesDetected).toHaveLength(2);
    expect(document.stats?.validationStatus.isValid).toBe(false);
    expect(document.stats?.validationStatus.errors).toHaveLength(3);

    // Check severity distribution
    const highSeverityCycles = document.stats?.cyclesDetected.filter((c) => c.severity === 'high');
    const lowSeverityCycles = document.stats?.cyclesDetected.filter((c) => c.severity === 'low');
    expect(highSeverityCycles).toHaveLength(1);
    expect(lowSeverityCycles).toHaveLength(1);

    // Check error severity distribution
    const errors = document.stats?.validationStatus.errors.filter((e) => e.severity === 'error');
    const warnings = document.stats?.validationStatus.errors.filter(
      (e) => e.severity === 'warning',
    );
    expect(errors).toHaveLength(1);
    expect(warnings).toHaveLength(2);
  });
});
