/**
 * Shared test utilities for document query tests
 *
 * Provides mock factories, test data generators, and common test setup
 * for document query testing across multiple test files.
 */

import { vi } from 'vitest';
import type { DocumentDTO, DocumentStatsDTO } from '../../document-queries.js';

// Mock repository interfaces
export interface MockDocumentRepositories {
  proofRepository: any;
  statementRepository: any;
  argumentRepository: any;
  treeRepository: any;
}

// Create mock repositories with common setup
export function createMockRepositories(): MockDocumentRepositories {
  return {
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
}

// Create mock document service
export function createMockDocumentService() {
  return {
    getDocument: vi.fn(),
    getDocumentState: vi.fn(),
    getValidationReport: vi.fn(),
    analyzeProofStructure: vi.fn(),
  };
}

// Test data factory for DocumentDTO
export function createTestDocumentDTO(overrides?: Partial<DocumentDTO>): DocumentDTO {
  return {
    id: 'test_doc_id',
    version: 1,
    createdAt: '2023-01-01T00:00:00.000Z',
    modifiedAt: '2023-01-01T00:00:00.000Z',
    statements: {},
    orderedSets: {},
    atomicArguments: {},
    trees: {},
    ...overrides,
  };
}

// Test data factory for DocumentStatsDTO
export function createTestDocumentStats(overrides?: Partial<DocumentStatsDTO>): DocumentStatsDTO {
  return {
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
    ...overrides,
  };
}

// Create a complex document DTO for testing
export function createComplexDocumentDTO(documentId: string): DocumentDTO {
  return {
    id: documentId,
    version: 15,
    createdAt: '2023-01-01T00:00:00.000Z',
    modifiedAt: '2023-01-15T12:30:00.000Z',
    statements: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `stmt_${i}`,
        {
          id: `stmt_${i}`,
          content: `Statement ${i}`,
          usageCount: Math.floor(Math.random() * 5),
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
        },
      ]),
    ),
    orderedSets: Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [
        `set_${i}`,
        {
          id: `set_${i}`,
          statementIds: [`stmt_${i}`, `stmt_${i + 1}`],
          usageCount: 1,
          usedBy: [
            {
              argumentId: `arg_${i}`,
              usage: 'premise' as const,
            },
          ],
        },
      ]),
    ),
    atomicArguments: Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [
        `arg_${i}`,
        {
          id: `arg_${i}`,
          premiseIds: `set_premise_${i}`,
          conclusionIds: `set_conclusion_${i}`,
          sideLabels: {
            left: `Rule ${i}`,
            right: `Reference ${i}`,
          },
        },
      ]),
    ),
    trees: Object.fromEntries(
      Array.from({ length: 3 }, (_, i) => [
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
}

// Create document stats with validation issues
export function createProblematicDocumentStats(): DocumentStatsDTO {
  return {
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
}
