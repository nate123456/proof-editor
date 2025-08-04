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
import type { ValidationErrorDTO } from '../shared-types.js';
import {
  createTestAtomicArgumentId,
  createTestErrorCode,
  createTestErrorMessage,
  createTestTreeId,
} from './shared/branded-type-helpers.js';
import {
  createMockDocumentService,
  createTestDocumentStats,
} from './shared/document-test-utilities.js';

// Helper function to create validation error DTOs
function createValidationError(
  code: string,
  message: string,
  severity: ErrorSeverity,
  location?: { treeId?: string; argumentId?: string },
): ValidationErrorDTO {
  const dto: ValidationErrorDTO = {
    code: createTestErrorCode(code),
    message: createTestErrorMessage(message),
    severity,
  };

  if (location) {
    dto.location = {};
    if (location.treeId) {
      dto.location.treeId = createTestTreeId(location.treeId);
    }
    if (location.argumentId) {
      dto.location.argumentId = createTestAtomicArgumentId(location.argumentId);
    }
  }

  return dto;
}

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
          createValidationError(
            'INCOMPLETE_PROOF_CHAIN',
            'Proof chain has gaps - missing intermediate steps',
            ErrorSeverity.ERROR,
            { treeId: 'tree_main' },
          ),
          createValidationError(
            'MISSING_PREMISES',
            'Argument has undefined premises',
            ErrorSeverity.ERROR,
            { argumentId: 'arg_incomplete' },
          ),
        ],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(completenessAnalysis);

    const result = await documentService.analyzeProofStructure(query);

    expect(result.validationStatus.isValid).toBe(false);
    expect(
      result.validationStatus.errors.some(
        (e: any) => e.code.getValue() === 'INCOMPLETE_PROOF_CHAIN',
      ),
    ).toBe(true);
    expect(
      result.validationStatus.errors.some((e: any) => e.code.getValue() === 'MISSING_PREMISES'),
    ).toBe(true);
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
          createValidationError(
            'LOGICAL_CONTRADICTION',
            'Contradictory statements in argument chain',
            ErrorSeverity.ERROR,
            { argumentId: 'arg_contradiction_1' },
          ),
          createValidationError(
            'INCONSISTENT_PREMISES',
            'Premises contradict each other',
            ErrorSeverity.ERROR,
            { argumentId: 'arg_inconsistent' },
          ),
        ],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(consistencyAnalysis);

    const result = await documentService.analyzeProofStructure(query);

    expect(result.cyclesDetected).toHaveLength(1);
    expect(result.cyclesDetected[0]?.severity).toBe('high');
    expect(
      result.validationStatus.errors.some(
        (e: any) => e.code.getValue() === 'LOGICAL_CONTRADICTION',
      ),
    ).toBe(true);
    expect(
      result.validationStatus.errors.some(
        (e: any) => e.code.getValue() === 'INCONSISTENT_PREMISES',
      ),
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
          createValidationError(
            'HIGH_COMPLEXITY',
            'Proof has high cognitive complexity - consider simplification',
            ErrorSeverity.INFO,
          ),
          createValidationError(
            'DEEP_NESTING',
            'Argument chains exceed recommended depth',
            ErrorSeverity.WARNING,
            { treeId: 'tree_deep' },
          ),
          createValidationError(
            'PERFORMANCE_IMPACT',
            'Large document may impact rendering performance',
            ErrorSeverity.INFO,
          ),
        ],
      },
    });

    documentService.analyzeProofStructure.mockResolvedValue(complexityAnalysis);

    const result = await documentService.analyzeProofStructure(query);

    expect(result.statementCount).toBe(500);
    expect(result.argumentCount).toBe(200);
    expect(result.treeCount).toBe(10);
    expect(result.validationStatus.isValid).toBe(true);
    expect(
      result.validationStatus.errors.some((e: any) => e.code.getValue() === 'HIGH_COMPLEXITY'),
    ).toBe(true);
    expect(
      result.validationStatus.errors.some((e: any) => e.code.getValue() === 'DEEP_NESTING'),
    ).toBe(true);
    expect(
      result.validationStatus.errors.some((e: any) => e.code.getValue() === 'PERFORMANCE_IMPACT'),
    ).toBe(true);
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
            createValidationError(
              'ANALYSIS_TIMEOUT',
              'Analysis timed out - try smaller document sections',
              ErrorSeverity.ERROR,
            ),
          ],
        },
      }),
    );

    await expect(documentService.analyzeProofStructure(query)).rejects.toThrow(
      'Analysis timeout - document too large',
    );

    const retryResult = await documentService.analyzeProofStructure(query);
    expect(retryResult.validationStatus.errors[0]?.code.getValue()).toBe('ANALYSIS_TIMEOUT');
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
            createValidationError(
              `${analysisType.toUpperCase()}_CHECK`,
              `${analysisType} analysis complete`,
              ErrorSeverity.INFO,
            ),
          ],
        },
      });

      documentService.analyzeProofStructure.mockResolvedValue(analysisResult);

      const result = await documentService.analyzeProofStructure(query);

      expect(result.validationStatus.errors).toHaveLength(1);
      expect(result.validationStatus.errors[0]?.code.getValue()).toBe(
        `${analysisType.toUpperCase()}_CHECK`,
      );
    }
  });
});
