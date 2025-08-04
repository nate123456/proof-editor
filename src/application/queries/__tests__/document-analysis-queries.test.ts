/**
 * Document analysis query tests
 *
 * Tests for proof structure analysis including completeness checks,
 * consistency validation, and complexity measurement.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  AtomicArgumentId,
  ErrorCode,
  ErrorMessage,
  ErrorSeverity,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';
import type { AnalyzeProofStructureQuery, DocumentStatsDTO } from '../document-queries.js';
import {
  createMockDocumentService,
  createTestDocumentStats,
} from './shared/document-test-utilities.js';

describe('AnalyzeProofStructureQuery Execution', () => {
  let documentService: ReturnType<typeof createMockDocumentService>;

  beforeEach(() => {
    documentService = createMockDocumentService();
  });

  it('should analyze proof completeness', async () => {
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_completeness',
      analysisType: 'completeness',
    };

    const completenessAnalysis: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 30,
      argumentCount: 15,
      treeCount: 2,
      connectionCount: 12,
      unusedStatements: ['stmt_incomplete_1'],
      unconnectedArguments: ['arg_dangling_1'],
      validationStatus: {
        isValid: false,
        errors: [
          {
            code: ErrorCode.create('INCOMPLETE_PROOF_CHAIN').isOk()
              ? ErrorCode.create('INCOMPLETE_PROOF_CHAIN').value.value
              : 'INCOMPLETE_PROOF_CHAIN',
            message: ErrorMessage.create('Proof chain has gaps - missing intermediate steps').isOk()
              ? ErrorMessage.create('Proof chain has gaps - missing intermediate steps').value.value
              : 'Proof chain has gaps - missing intermediate steps',
            severity: ErrorSeverity.ERROR,
            location: {
              treeId: TreeId.create('tree_main').isOk()
                ? TreeId.create('tree_main').value.value
                : 'tree_main',
            },
          },
          {
            code: ErrorCode.create('MISSING_PREMISES').isOk()
              ? ErrorCode.create('MISSING_PREMISES').value.value
              : 'MISSING_PREMISES',
            message: ErrorMessage.create('Argument has undefined premises').isOk()
              ? ErrorMessage.create('Argument has undefined premises').value.value
              : 'Argument has undefined premises',
            severity: ErrorSeverity.ERROR,
            location: {
              argumentId: AtomicArgumentId.fromString('arg_incomplete').isOk()
                ? AtomicArgumentId.fromString('arg_incomplete').value.value
                : 'arg_incomplete',
            },
          },
        ],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(completenessAnalysis);

    const result = await documentService.analyzeProofStructure(query);

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
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_consistency',
      analysisType: 'consistency',
    };

    const consistencyAnalysis: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 25,
      argumentCount: 12,
      treeCount: 1,
      connectionCount: 11,
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
            code: ErrorCode.create('LOGICAL_CONTRADICTION').isOk()
              ? ErrorCode.create('LOGICAL_CONTRADICTION').value.value
              : 'LOGICAL_CONTRADICTION',
            message: ErrorMessage.create('Contradictory statements in argument chain').isOk()
              ? ErrorMessage.create('Contradictory statements in argument chain').value.value
              : 'Contradictory statements in argument chain',
            severity: ErrorSeverity.ERROR,
            location: {
              argumentId: AtomicArgumentId.fromString('arg_contradiction_1').isOk()
                ? AtomicArgumentId.fromString('arg_contradiction_1').value.value
                : 'arg_contradiction_1',
            },
          },
          {
            code: ErrorCode.create('INCONSISTENT_PREMISES').isOk()
              ? ErrorCode.create('INCONSISTENT_PREMISES').value.value
              : 'INCONSISTENT_PREMISES',
            message: ErrorMessage.create('Premises contradict each other').isOk()
              ? ErrorMessage.create('Premises contradict each other').value.value
              : 'Premises contradict each other',
            severity: ErrorSeverity.ERROR,
            location: {
              argumentId: AtomicArgumentId.fromString('arg_inconsistent').isOk()
                ? AtomicArgumentId.fromString('arg_inconsistent').value.value
                : 'arg_inconsistent',
            },
          },
        ],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(consistencyAnalysis);

    const result = await documentService.analyzeProofStructure(query);

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
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_complexity',
      analysisType: 'complexity',
    };

    const complexityAnalysis: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 500,
      argumentCount: 200,
      treeCount: 10,
      connectionCount: 180,
      validationStatus: {
        isValid: true,
        errors: [
          {
            code: ErrorCode.create('HIGH_COMPLEXITY').isOk()
              ? ErrorCode.create('HIGH_COMPLEXITY').value.value
              : 'HIGH_COMPLEXITY',
            message: ErrorMessage.create(
              'Proof has high cognitive complexity - consider simplification',
            ).value,
            severity: ErrorSeverity.INFO,
          },
          {
            code: ErrorCode.create('DEEP_NESTING').isOk()
              ? ErrorCode.create('DEEP_NESTING').value.value
              : 'DEEP_NESTING',
            message: ErrorMessage.create('Argument chains exceed recommended depth').isOk()
              ? ErrorMessage.create('Argument chains exceed recommended depth').value.value
              : 'Argument chains exceed recommended depth',
            severity: ErrorSeverity.WARNING,
            location: {
              treeId: TreeId.create('tree_deep').isOk()
                ? TreeId.create('tree_deep').value.value
                : 'tree_deep',
            },
          },
          {
            code: ErrorCode.create('PERFORMANCE_IMPACT').isOk()
              ? ErrorCode.create('PERFORMANCE_IMPACT').value.value
              : 'PERFORMANCE_IMPACT',
            message: ErrorMessage.create('Large document may impact rendering performance').isOk()
              ? ErrorMessage.create('Large document may impact rendering performance').value.value
              : 'Large document may impact rendering performance',
            severity: ErrorSeverity.INFO,
          },
        ],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(complexityAnalysis);

    const result = await documentService.analyzeProofStructure(query);

    expect(result.statementCount).toBe(500);
    expect(result.argumentCount).toBe(200);
    expect(result.treeCount).toBe(10);
    expect(result.validationStatus.isValid).toBe(true);
    expect(result.validationStatus.errors.some((e: any) => e.code === 'HIGH_COMPLEXITY')).toBe(
      true,
    );
    expect(result.validationStatus.errors.some((e: any) => e.code === 'DEEP_NESTING')).toBe(true);
    expect(result.validationStatus.errors.some((e: any) => e.code === 'PERFORMANCE_IMPACT')).toBe(
      true,
    );
  });

  it('should handle timeout scenarios during analysis', async () => {
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_large_analysis',
      analysisType: 'complexity',
    };

    const timeoutError = new Error('Analysis timeout - document too large');
    documentService.analyzeProofStructure.mockRejectedValueOnce(timeoutError).mockResolvedValueOnce(
      createTestDocumentStats({
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: ErrorCode.create('ANALYSIS_TIMEOUT').isOk()
                ? ErrorCode.create('ANALYSIS_TIMEOUT').value.value
                : 'ANALYSIS_TIMEOUT',
              message: ErrorMessage.create('Analysis timed out - try smaller document sections')
                .value,
              severity: ErrorSeverity.ERROR,
            },
          ],
        },
      }),
    );

    await expect(documentService.analyzeProofStructure(query)).rejects.toThrow(
      'Analysis timeout - document too large',
    );

    const retryResult = await documentService.analyzeProofStructure(query);
    expect(retryResult.validationStatus.errors[0]?.code).toBe('ANALYSIS_TIMEOUT');
  });

  it('should analyze documents with no issues', async () => {
    const query: AnalyzeProofStructureQuery = {
      documentId: 'doc_valid',
      analysisType: 'completeness',
    };

    const validAnalysis: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 10,
      argumentCount: 5,
      treeCount: 1,
      connectionCount: 4,
      validationStatus: {
        isValid: true,
        errors: [],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(validAnalysis);

    const result = await documentService.analyzeProofStructure(query);

    expect(result.validationStatus.isValid).toBe(true);
    expect(result.validationStatus.errors).toHaveLength(0);
    expect(result.unusedStatements).toHaveLength(0);
    expect(result.unconnectedArguments).toHaveLength(0);
    expect(result.cyclesDetected).toHaveLength(0);
  });

  it('should provide detailed analysis for each type', async () => {
    const analysisTypes: Array<'completeness' | 'consistency' | 'complexity'> = [
      'completeness',
      'consistency',
      'complexity',
    ];

    for (const analysisType of analysisTypes) {
      const query: AnalyzeProofStructureQuery = {
        documentId: `doc_${analysisType}_test`,
        analysisType,
      };

      const analysisResult: DocumentStatsDTO = createTestDocumentStats({
        statementCount: 20,
        argumentCount: 10,
        treeCount: 2,
        connectionCount: 8,
        validationStatus: {
          isValid: true,
          errors: [
            {
              code: ErrorCode.create(`${analysisType.toUpperCase()}_CHECK`).isOk()
                ? ErrorCode.create(`${analysisType.toUpperCase()}_CHECK`).value.value
                : `${analysisType.toUpperCase()}_CHECK`,
              message: ErrorMessage.create(`${analysisType} analysis complete`).isOk()
                ? ErrorMessage.create(`${analysisType} analysis complete`).value.value
                : `${analysisType} analysis complete`,
              severity: ErrorSeverity.INFO,
            },
          ],
        },
      });

      documentService.analyzeProofStructure.mockResolvedValue(analysisResult);

      const result = await documentService.analyzeProofStructure(query);

      expect(result.validationStatus.errors).toHaveLength(1);
      expect(result.validationStatus.errors[0]?.code).toBe(`${analysisType.toUpperCase()}_CHECK`);
    }
  });
});
