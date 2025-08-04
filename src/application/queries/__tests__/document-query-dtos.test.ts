/**
 * Document query DTO tests
 *
 * Tests for query data transfer objects including validation,
 * structure verification, and edge case handling.
 */

import { describe, expect, it } from 'vitest';
import {
  AtomicArgumentId,
  Dimensions,
  NodeCount,
  NodeId,
  Position2D,
  SideLabel,
  StatementId,
  TreeId,
} from '../../../domain/shared/value-objects/index.js';
import type {
  AnalyzeProofStructureQuery,
  DocumentDTO,
  DocumentStatsDTO,
  GetDocumentQuery,
  GetDocumentStateQuery,
  GetValidationReportQuery,
} from '../document-queries.js';

describe('GetDocumentQuery DTO', () => {
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
      'a'.repeat(100),
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

describe('GetDocumentStateQuery DTO', () => {
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

describe('GetValidationReportQuery DTO', () => {
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

describe('AnalyzeProofStructureQuery DTO', () => {
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

describe('DocumentDTO Structure', () => {
  it('should handle basic document DTO', () => {
    const document: DocumentDTO = {
      id: 'doc_12345',
      version: 1,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements: {},
      atomicArguments: {},
      trees: {},
    };

    expect(document.id).toBe('doc_12345');
    expect(document.version).toBe(1);
    expect(document.createdAt).toBe('2023-01-01T00:00:00.000Z');
    expect(document.modifiedAt).toBe('2023-01-01T00:00:00.000Z');
    expect(document.statements).toEqual({});
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
      atomicArguments: {
        arg_1: {
          id: AtomicArgumentId.fromString('arg_1').value,
          premiseIds: [
            StatementId.fromString('stmt_1').value,
            StatementId.fromString('stmt_2').value,
          ],
          conclusionIds: [],
          sideLabels: {
            left: SideLabel.create('Modus Ponens').value,
            right: SideLabel.create('Classical Logic').value,
          },
        },
      },
      trees: {
        tree_1: {
          id: TreeId.create('tree_1').value,
          position: Position2D.create(100, 200).value,
          bounds: Dimensions.create(500, 300).value,
          nodeCount: NodeCount.create(3).value,
          rootNodeIds: [NodeId.create('node_1').value],
        },
      },
    };

    expect(document.id).toBe('doc_populated');
    expect(document.version).toBe(5);
    expect(Object.keys(document.statements)).toHaveLength(2);
    expect(Object.keys(document.atomicArguments)).toHaveLength(1);
    expect(Object.keys(document.trees)).toHaveLength(1);

    expect(document.statements.stmt_1?.content).toBe('All men are mortal');
    expect(document.atomicArguments.arg_1?.premiseIds).toEqual(['stmt_1', 'stmt_2']);
    expect(document.trees.tree_1?.nodeCount).toBe(3);
  });

  it('should handle document with zero version', () => {
    const document: DocumentDTO = {
      id: 'doc_zero_version',
      version: 0,
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      statements: {},
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
        atomicArguments: {},
        trees: {},
      };

      expect(document.createdAt).toBe(timestamp);
      expect(document.modifiedAt).toBe(timestamp);
      expect(() => new Date(document.createdAt)).not.toThrow();
      expect(() => new Date(document.modifiedAt)).not.toThrow();
    });
  });
});

describe('DocumentStatsDTO Structure', () => {
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

    stats.cyclesDetected.forEach((cycle) => {
      expect(cycle.path[0]).toBe(cycle.path[cycle.path.length - 1]);
    });
  });
});
