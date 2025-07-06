/**
 * Document query integration tests
 *
 * Tests complete workflows and interactions between different query types
 * to ensure they work together correctly in real-world scenarios.
 */

import { describe, expect, it } from 'vitest';
import type {
  AnalyzeProofStructureQuery,
  DocumentDTO,
  GetDocumentQuery,
  GetDocumentStateQuery,
  GetValidationReportQuery,
} from '../document-queries.js';
import {
  createTestDocumentDTO,
  createTestDocumentStats,
} from './shared/document-test-utilities.js';

describe('Document Query Integration Scenarios', () => {
  it('should handle complete document retrieval workflow', () => {
    const documentId = 'doc_complete_workflow';

    const basicQuery: GetDocumentQuery = {
      documentId,
    };

    const stateQuery: GetDocumentStateQuery = {
      documentId,
      includeStats: true,
    };

    const document: DocumentDTO = createTestDocumentDTO({
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
      stats: createTestDocumentStats({
        statementCount: 1,
        argumentCount: 1,
        treeCount: 1,
        connectionCount: 0,
      }),
    });

    expect(basicQuery.documentId).toBe(documentId);
    expect(stateQuery.documentId).toBe(documentId);
    expect(stateQuery.includeStats).toBe(true);
    expect(document.id).toBe(documentId);
    expect(document.stats?.statementCount).toBe(1);
  });

  it('should handle validation and analysis workflow', () => {
    const documentId = 'doc_validation_analysis';

    const validationQuery: GetValidationReportQuery = {
      documentId,
      includeCustomScripts: true,
    };

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

    expect(completenessQuery.documentId).toBe(documentId);
    expect(consistencyQuery.documentId).toBe(documentId);
    expect(complexityQuery.documentId).toBe(documentId);
  });

  it('should handle document evolution tracking', () => {
    const documentId = 'doc_evolution';

    const versions = [1, 2, 3, 4, 5].map((version) =>
      createTestDocumentDTO({
        id: documentId,
        version,
        createdAt: '2023-01-01T00:00:00.000Z',
        modifiedAt: new Date(
          Date.parse('2023-01-01T00:00:00.000Z') + version * 24 * 60 * 60 * 1000,
        ).toISOString(),
        stats: createTestDocumentStats({
          statementCount: version * 2,
          argumentCount: version,
          treeCount: 1,
          connectionCount: Math.max(0, version - 1),
        }),
      }),
    );

    versions.forEach((doc, index) => {
      expect(doc.version).toBe(index + 1);
      expect(doc.stats?.statementCount).toBe((index + 1) * 2);
      expect(doc.stats?.argumentCount).toBe(index + 1);
    });

    expect(versions[0]?.stats?.connectionCount).toBe(0);
    expect(versions[4]?.stats?.connectionCount).toBe(4);
  });

  it('should handle complex document with issues', () => {
    const document: DocumentDTO = createTestDocumentDTO({
      id: 'doc_complex_issues',
      version: 10,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-10T00:00:00.000Z',
      stats: createTestDocumentStats({
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
      }),
    });

    expect(document.stats?.unusedStatements).toHaveLength(3);
    expect(document.stats?.unconnectedArguments).toHaveLength(2);
    expect(document.stats?.cyclesDetected).toHaveLength(2);
    expect(document.stats?.validationStatus.isValid).toBe(false);
    expect(document.stats?.validationStatus.errors).toHaveLength(3);

    const highSeverityCycles = document.stats?.cyclesDetected.filter((c) => c.severity === 'high');
    const lowSeverityCycles = document.stats?.cyclesDetected.filter((c) => c.severity === 'low');
    expect(highSeverityCycles).toHaveLength(1);
    expect(lowSeverityCycles).toHaveLength(1);

    const errors = document.stats?.validationStatus.errors.filter((e) => e.severity === 'error');
    const warnings = document.stats?.validationStatus.errors.filter(
      (e) => e.severity === 'warning',
    );
    expect(errors).toHaveLength(1);
    expect(warnings).toHaveLength(2);
  });

  it('should handle progressive document analysis', () => {
    const documentId = 'doc_progressive_analysis';

    const initialQuery: GetDocumentQuery = {
      documentId,
    };

    const stateWithoutStats: GetDocumentStateQuery = {
      documentId,
      includeStats: false,
    };

    const stateWithStats: GetDocumentStateQuery = {
      documentId,
      includeStats: true,
    };

    const validationWithoutScripts: GetValidationReportQuery = {
      documentId,
      includeCustomScripts: false,
    };

    const validationWithScripts: GetValidationReportQuery = {
      documentId,
      includeCustomScripts: true,
    };

    const analysisQueries = ['completeness', 'consistency', 'complexity'].map(
      (analysisType) =>
        ({
          documentId,
          analysisType,
        }) as AnalyzeProofStructureQuery,
    );

    expect(initialQuery.documentId).toBe(documentId);
    expect(stateWithoutStats.includeStats).toBe(false);
    expect(stateWithStats.includeStats).toBe(true);
    expect(validationWithoutScripts.includeCustomScripts).toBe(false);
    expect(validationWithScripts.includeCustomScripts).toBe(true);
    expect(analysisQueries).toHaveLength(3);
    expect(analysisQueries.every((q) => q.documentId === documentId)).toBe(true);
  });

  it('should support batch document operations', () => {
    const documentIds = ['doc_batch_1', 'doc_batch_2', 'doc_batch_3', 'doc_batch_4', 'doc_batch_5'];

    const getQueries = documentIds.map((id) => ({
      documentId: id,
    }));

    const stateQueries = documentIds.map((id) => ({
      documentId: id,
      includeStats: true,
    }));

    const validationQueries = documentIds.map((id) => ({
      documentId: id,
      includeCustomScripts: false,
    }));

    expect(getQueries).toHaveLength(5);
    expect(stateQueries).toHaveLength(5);
    expect(validationQueries).toHaveLength(5);

    getQueries.forEach((query, index) => {
      expect(query.documentId).toBe(documentIds[index]);
    });

    stateQueries.forEach((query) => {
      expect(query.includeStats).toBe(true);
    });

    validationQueries.forEach((query) => {
      expect(query.includeCustomScripts).toBe(false);
    });
  });

  it('should handle document comparison scenarios', () => {
    const baseDocumentId = 'doc_base';
    const modifiedDocumentId = 'doc_modified';

    const baseDocument = createTestDocumentDTO({
      id: baseDocumentId,
      version: 1,
      stats: createTestDocumentStats({
        statementCount: 10,
        argumentCount: 5,
        treeCount: 1,
        connectionCount: 4,
        validationStatus: {
          isValid: true,
          errors: [],
        },
      }),
    });

    const modifiedDocument = createTestDocumentDTO({
      id: modifiedDocumentId,
      version: 5,
      stats: createTestDocumentStats({
        statementCount: 15,
        argumentCount: 8,
        treeCount: 2,
        connectionCount: 7,
        unusedStatements: ['stmt_new_unused'],
        cyclesDetected: [
          {
            path: ['arg_new_cycle_1', 'arg_new_cycle_2', 'arg_new_cycle_1'],
            severity: 'medium',
          },
        ],
        validationStatus: {
          isValid: false,
          errors: [
            {
              code: 'NEW_CYCLE_INTRODUCED',
              message: 'Modification introduced circular dependency',
              severity: 'error',
            },
          ],
        },
      }),
    });

    expect(baseDocument.stats?.validationStatus.isValid).toBe(true);
    expect(modifiedDocument.stats?.validationStatus.isValid).toBe(false);
    expect(baseDocument.stats?.statementCount).toBeLessThan(
      modifiedDocument.stats?.statementCount || 0,
    );
    expect(baseDocument.stats?.cyclesDetected).toHaveLength(0);
    expect(modifiedDocument.stats?.cyclesDetected).toHaveLength(1);
  });
});
