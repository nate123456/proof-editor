import type { AtomicArgumentDTO, ValidationErrorDTO } from '../queries/shared-types.js';
import type { StatementDTO } from '../queries/statement-queries.js';
import type { TreeStructureDTO } from '../queries/tree-queries.js';

// Add operation metadata pattern from existing code
export interface OperationMetadata {
  operationId: string;
  timestamp: string;
  userId?: string;
  correlationId?: string;
  source?: 'user' | 'system' | 'import';
}

// Extend commands with metadata
export interface CommandWithMetadata<T> {
  metadata: OperationMetadata;
  payload: T;
}

// Consistent result structure for all operations
export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: ErrorDTO;
  events?: EventDTO[];
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorDTO;
}

export interface ErrorDTO {
  code: string;
  message: string;
  details?: unknown;
}

export interface EventDTO {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// Specific command results
export interface CreateStatementResult {
  statementId: string;
  statement: StatementDTO;
}

export interface CreateArgumentResult {
  argumentId: string;
  argument: AtomicArgumentDTO;
  createdOrderedSets?: string[]; // IDs of any newly created OrderedSets
}

export interface AttachNodeResult {
  nodeId: string;
  treeStructure: TreeStructureDTO; // Updated tree structure
}

export interface BranchCreationResult {
  newStatement: StatementDTO;
  newArgument: AtomicArgumentDTO;
  connectionPoint: {
    sourceArgumentId: string;
    targetArgumentId: string;
    sharedOrderedSetId: string;
  };
  newTreeId?: string; // If created in new tree
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDTO[];
  warnings: ValidationErrorDTO[];
  customScriptResults?: Array<{
    scriptId: string;
    passed: boolean;
    messages: string[];
  }>;
}

export interface ImportResult {
  documentId: string;
  stats: {
    statementsImported: number;
    argumentsImported: number;
    treesImported: number;
    errors: string[];
  };
}

export interface BootstrapResult {
  success: boolean;
  phase: 'empty' | 'first_argument' | 'populating' | 'complete';
  createdEntities?: {
    argumentId?: string;
    treeId?: string;
    statementIds?: string[];
    orderedSetIds?: string[];
  };
  nextSteps: string[];
}
