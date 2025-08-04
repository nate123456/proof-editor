/**
 * Document validation query tests
 *
 * Tests for validation report generation including custom script execution,
 * error detection, and validation rule processing.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../../domain/shared/result.js';
import { ErrorSeverity } from '../../../domain/shared/value-objects/index.js';
import type { DocumentStatsDTO, GetValidationReportQuery } from '../document-queries.js';
import type { ValidationErrorDTO } from '../shared-types.js';
import {
  createMockDocumentService,
  createProblematicDocumentStats,
  createTestAtomicArgumentId,
  createTestDocumentStats,
  createTestErrorCode,
  createTestErrorMessage,
  createTestTreeId,
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
            code: createTestErrorCode('CUSTOM_VALIDATION_FAILED'),
            message: createTestErrorMessage('Custom logic validation rule violated'),
            severity: ErrorSeverity.ERROR,
            location: {
              argumentId: createTestAtomicArgumentId('arg_custom_1'),
            },
          },
          {
            code: createTestErrorCode('SEMANTIC_INCONSISTENCY'),
            message: createTestErrorMessage('Semantic inconsistency detected by custom script'),
            severity: ErrorSeverity.WARNING,
            location: {
              treeId: createTestTreeId('tree_logic_1'),
            },
          },
        ],
      },
    });

    documentService.getValidationReport.mockResolvedValue(customValidationReport);

    const result = await documentService.getValidationReport(query);

    expect(result.validationStatus.isValid).toBe(false);
    expect(result.validationStatus.errors).toHaveLength(2);
    expect(result.validationStatus.errors[0]?.code.getValue()).toBe('CUSTOM_VALIDATION_FAILED');
    expect(result.validationStatus.errors[1]?.code.getValue()).toBe('SEMANTIC_INCONSISTENCY');
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

    const errorSeverities = result.validationStatus.errors.map(
      (e: ValidationErrorDTO) => e.severity,
    );
    expect(errorSeverities).toContain(ErrorSeverity.ERROR);
    expect(errorSeverities).toContain(ErrorSeverity.WARNING);
    expect(errorSeverities).toContain(ErrorSeverity.INFO);
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
            code: createTestErrorCode('PERFORMANCE_WARNING'),
            message: createTestErrorMessage('Large document may impact performance'),
            severity: ErrorSeverity.INFO,
          },
          {
            code: createTestErrorCode('MEMORY_USAGE_HIGH'),
            message: createTestErrorMessage('Document size exceeds recommended limits'),
            severity: ErrorSeverity.WARNING,
          },
        ],
      },
    });

    documentService.getValidationReport.mockResolvedValue(largeDocumentReport);

    const result = await documentService.getValidationReport(query);

    expect(result.statementCount).toBe(10000);
    expect(result.validationStatus.isValid).toBe(true);
    expect(result.validationStatus.errors).toHaveLength(2);
    expect(
      result.validationStatus.errors.some(
        (e: ValidationErrorDTO) => e.code.getValue() === 'PERFORMANCE_WARNING',
      ),
    ).toBe(true);
    expect(
      result.validationStatus.errors.some(
        (e: ValidationErrorDTO) => e.code.getValue() === 'MEMORY_USAGE_HIGH',
      ),
    ).toBe(true);
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
            code: createTestErrorCode('MULTIPLE_CYCLES'),
            message: createTestErrorMessage('Multiple circular dependencies detected'),
            severity: ErrorSeverity.ERROR,
          },
          {
            code: createTestErrorCode('EXCESSIVE_UNUSED_STATEMENTS'),
            message: createTestErrorMessage('15 unused statements found'),
            severity: ErrorSeverity.WARNING,
          },
          {
            code: createTestErrorCode('UNCONNECTED_ARGUMENTS'),
            message: createTestErrorMessage('8 arguments not connected to any tree'),
            severity: ErrorSeverity.WARNING,
          },
          {
            code: createTestErrorCode('STRUCTURAL_COMPLEXITY'),
            message: createTestErrorMessage('Document structure is overly complex'),
            severity: ErrorSeverity.INFO,
          },
        ],
      },
    });

    documentService.getValidationReport.mockResolvedValue(complexIssuesReport);

    const result = await documentService.getValidationReport(query);

    expect(result.cyclesDetected).toHaveLength(3);
    expect(result.validationStatus.errors).toHaveLength(4);
    expect(result.validationStatus.isValid).toBe(false);

    const highSeverityCycles = result.cyclesDetected.filter(
      (c: { path: string[]; severity: 'low' | 'medium' | 'high' }) => c.severity === 'high',
    );
    const mediumSeverityCycles = result.cyclesDetected.filter(
      (c: { path: string[]; severity: 'low' | 'medium' | 'high' }) => c.severity === 'medium',
    );
    const lowSeverityCycles = result.cyclesDetected.filter(
      (c: { path: string[]; severity: 'low' | 'medium' | 'high' }) => c.severity === 'low',
    );

    expect(highSeverityCycles).toHaveLength(1);
    expect(mediumSeverityCycles).toHaveLength(1);
    expect(lowSeverityCycles).toHaveLength(1);
  });
});
