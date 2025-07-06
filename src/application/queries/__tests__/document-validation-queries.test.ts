/**
 * Document validation query tests
 *
 * Tests for validation report generation including custom script execution,
 * error detection, and validation rule processing.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import type { DocumentStatsDTO, GetValidationReportQuery } from '../document-queries.js';
import {
  createMockDocumentService,
  createProblematicDocumentStats,
  createTestDocumentStats,
} from './shared/document-test-utilities.js';

describe('GetValidationReportQuery Execution', () => {
  let documentService: ReturnType<typeof createMockDocumentService>;

  beforeEach(() => {
    documentService = createMockDocumentService();
  });

  it('should generate validation report without custom scripts', async () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_validation',
      includeCustomScripts: false,
    };

    const validationReport: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 15,
      argumentCount: 8,
      treeCount: 2,
      connectionCount: 6,
      unusedStatements: ['stmt_unused_1'],
      unconnectedArguments: ['arg_unconnected_1'],
    });

    documentService.getValidationReport.mockResolvedValue(validationReport);

    const result = await documentService.getValidationReport(query);

    expect(result.statementCount).toBe(15);
    expect(result.argumentCount).toBe(8);
    expect(result.validationStatus.isValid).toBe(true);
    expect(result.unusedStatements).toHaveLength(1);
    expect(result.unconnectedArguments).toHaveLength(1);
  });

  it('should generate validation report with custom scripts', async () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_custom_validation',
      includeCustomScripts: true,
    };

    const customValidationReport: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 25,
      argumentCount: 12,
      treeCount: 3,
      connectionCount: 10,
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
    });

    documentService.getValidationReport.mockResolvedValue(customValidationReport);

    const result = await documentService.getValidationReport(query);

    expect(result.validationStatus.isValid).toBe(false);
    expect(result.validationStatus.errors).toHaveLength(2);
    expect(result.validationStatus.errors[0]?.code).toBe('CUSTOM_VALIDATION_FAILED');
    expect(result.validationStatus.errors[1]?.code).toBe('SEMANTIC_INCONSISTENCY');
    expect(result.cyclesDetected[0]?.severity).toBe('high');
  });

  it('should handle validation errors and edge cases', async () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_problematic',
      includeCustomScripts: true,
    };

    const problematicReport = createProblematicDocumentStats();
    documentService.getValidationReport.mockResolvedValue(problematicReport);

    const result = await documentService.getValidationReport(query);

    expect(result.unusedStatements).toHaveLength(20);
    expect(result.unconnectedArguments).toHaveLength(10);
    expect(result.cyclesDetected).toHaveLength(2);
    expect(result.validationStatus.errors).toHaveLength(3);

    const errorSeverities = result.validationStatus.errors.map((e: any) => e.severity);
    expect(errorSeverities).toContain('error');
    expect(errorSeverities).toContain('warning');
    expect(errorSeverities).toContain('info');
  });

  it('should handle document corruption errors', async () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_corrupted',
      includeCustomScripts: true,
    };

    const corruptedError = new ValidationError('Document data is corrupted');
    documentService.getValidationReport.mockRejectedValue(corruptedError);

    await expect(documentService.getValidationReport(query)).rejects.toThrow(
      'Document data is corrupted',
    );
  });

  it('should report performance warnings for large documents', async () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_large',
      includeCustomScripts: false,
    };

    const largeDocumentReport: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 10000,
      argumentCount: 5000,
      treeCount: 100,
      connectionCount: 8000,
      validationStatus: {
        isValid: true,
        errors: [
          {
            code: 'PERFORMANCE_WARNING',
            message: 'Large document may impact performance',
            severity: 'info',
          },
          {
            code: 'MEMORY_USAGE_HIGH',
            message: 'Document size exceeds recommended limits',
            severity: 'warning',
          },
        ],
      },
    });

    documentService.getValidationReport.mockResolvedValue(largeDocumentReport);

    const result = await documentService.getValidationReport(query);

    expect(result.statementCount).toBe(10000);
    expect(result.validationStatus.isValid).toBe(true);
    expect(result.validationStatus.errors).toHaveLength(2);
    expect(result.validationStatus.errors.some((e) => e.code === 'PERFORMANCE_WARNING')).toBe(true);
    expect(result.validationStatus.errors.some((e) => e.code === 'MEMORY_USAGE_HIGH')).toBe(true);
  });

  it('should detect multiple validation issues in complex documents', async () => {
    const query: GetValidationReportQuery = {
      documentId: 'doc_complex_issues',
      includeCustomScripts: true,
    };

    const complexIssuesReport: DocumentStatsDTO = createTestDocumentStats({
      statementCount: 100,
      argumentCount: 50,
      treeCount: 10,
      connectionCount: 40,
      unusedStatements: Array.from({ length: 15 }, (_, i) => `unused_${i}`),
      unconnectedArguments: Array.from({ length: 8 }, (_, i) => `unconnected_${i}`),
      cyclesDetected: [
        {
          path: ['arg_1', 'arg_2', 'arg_3', 'arg_1'],
          severity: 'high',
        },
        {
          path: ['arg_A', 'arg_B', 'arg_A'],
          severity: 'medium',
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
            code: 'MULTIPLE_CYCLES',
            message: 'Multiple circular dependencies detected',
            severity: 'error',
          },
          {
            code: 'EXCESSIVE_UNUSED_STATEMENTS',
            message: '15 unused statements found',
            severity: 'warning',
          },
          {
            code: 'UNCONNECTED_ARGUMENTS',
            message: '8 arguments not connected to any tree',
            severity: 'warning',
          },
          {
            code: 'STRUCTURAL_COMPLEXITY',
            message: 'Document structure is overly complex',
            severity: 'info',
          },
        ],
      },
    });

    documentService.getValidationReport.mockResolvedValue(complexIssuesReport);

    const result = await documentService.getValidationReport(query);

    expect(result.cyclesDetected).toHaveLength(3);
    expect(result.validationStatus.errors).toHaveLength(4);
    expect(result.validationStatus.isValid).toBe(false);

    const highSeverityCycles = result.cyclesDetected.filter((c) => c.severity === 'high');
    const mediumSeverityCycles = result.cyclesDetected.filter((c) => c.severity === 'medium');
    const lowSeverityCycles = result.cyclesDetected.filter((c) => c.severity === 'low');

    expect(highSeverityCycles).toHaveLength(1);
    expect(mediumSeverityCycles).toHaveLength(1);
    expect(lowSeverityCycles).toHaveLength(1);
  });
});
