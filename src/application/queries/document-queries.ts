export interface GetDocumentQuery {
  documentId: string;
}

export interface GetDocumentStateQuery {
  documentId: string;
  includeStats?: boolean;
}

export interface DocumentDTO {
  id: string;
  version: number;
  createdAt: string;
  modifiedAt: string;
  statements: Record<string, StatementDTO>;
  orderedSets: Record<string, OrderedSetDTO>;
  atomicArguments: Record<string, AtomicArgumentDTO>;
  trees: Record<string, TreeDTO>;
  stats?: DocumentStatsDTO;
}

export interface DocumentStatsDTO {
  statementCount: number;
  argumentCount: number;
  treeCount: number;
  connectionCount: number;
  unusedStatements: string[];
  unconnectedArguments: string[];
  cyclesDetected: Array<{
    path: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
  validationStatus: {
    isValid: boolean;
    errors: ValidationErrorDTO[];
  };
}

import type {
  AtomicArgumentDTO,
  OrderedSetDTO,
  TreeDTO,
  ValidationErrorDTO,
} from './shared-types.js';
import type { StatementDTO } from './statement-queries.js';

// Validation queries
export interface GetValidationReportQuery {
  documentId: string;
  includeCustomScripts?: boolean;
}

export interface AnalyzeProofStructureQuery {
  documentId: string;
  analysisType: 'completeness' | 'consistency' | 'complexity';
}
