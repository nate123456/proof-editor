// Domain Enums - Strong typing for business logic primitives

export enum ArgumentRole {
  PREMISE = 'premise',
  CONCLUSION = 'conclusion',
}

export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  PENDING = 'pending',
  NOT_VALIDATED = 'not_validated',
}

export enum ConnectionInconsistencyType {
  MISSING_PREMISE = 'missing_premise',
  DANGLING_CONCLUSION = 'dangling_conclusion',
  TYPE_MISMATCH = 'type_mismatch',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
}

export enum CycleSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ConnectionType {
  PROVIDES = 'provides',
  CONSUMES = 'consumes',
}

export enum AggregateType {
  PROOF_DOCUMENT = 'ProofDocument',
  PROOF_AGGREGATE = 'ProofAggregate',
  PROOF_TREE_AGGREGATE = 'ProofTreeAggregate',
}

export enum EventType {
  PROOF_DOCUMENT_CREATED = 'ProofDocumentCreated',
  STATEMENT_CREATED = 'StatementCreated',
  STATEMENT_UPDATED = 'StatementUpdated',
  STATEMENT_DELETED = 'StatementDeleted',
  ATOMIC_ARGUMENT_CREATED = 'AtomicArgumentCreated',
  ATOMIC_ARGUMENT_UPDATED = 'AtomicArgumentUpdated',
  ATOMIC_ARGUMENT_DELETED = 'AtomicArgumentDeleted',
  PROOF_AGGREGATE_CREATED = 'ProofAggregateCreated',
  PROOF_STATEMENT_ADDED = 'ProofStatementAdded',
  PROOF_STATEMENT_REMOVED = 'ProofStatementRemoved',
  PROOF_ATOMIC_ARGUMENT_CREATED = 'ProofAtomicArgumentCreated',
  PROOF_ARGUMENTS_CONNECTED = 'ProofArgumentsConnected',
  PROOF_VERSION_INCREMENTED = 'ProofVersionIncremented',
  PROOF_CONSISTENCY_VALIDATED = 'ProofConsistencyValidated',
}

export enum ReferenceType {
  PREMISE = 'premise',
  CONCLUSION = 'conclusion',
}

export enum MessageType {
  UPDATE_TREE = 'updateTree',
  SHOW_ERROR = 'showError',
  ARGUMENT_CREATED = 'argumentCreated',
  BRANCH_CREATED = 'branchCreated',
  STATEMENT_ADDED = 'statementAdded',
  EXPORT_COMPLETED = 'exportCompleted',
  RESTORE_VIEWPORT_STATE = 'restoreViewportState',
  RESTORE_PANEL_STATE = 'restorePanelState',
  RESTORE_SELECTION_STATE = 'restoreSelectionState',
  RESTORE_THEME_STATE = 'restoreThemeState',
  VIEWPORT_CHANGED = 'viewportChanged',
  PANEL_STATE_CHANGED = 'panelStateChanged',
  SELECTION_CHANGED = 'selectionChanged',
  CREATE_ARGUMENT = 'createArgument',
  ADD_STATEMENT = 'addStatement',
  MOVE_NODE = 'moveNode',
}

export enum OperationType {
  CREATE_ARGUMENT = 'createArgument',
  UPDATE_STATEMENT = 'updateStatement',
  MOVE_NODE = 'moveNode',
  CREATE_BRANCH = 'createBranch',
  EXPORT_DOCUMENT = 'exportDocument',
  SAVE_DOCUMENT = 'saveDocument',
  VIEWPORT_CHANGE = 'viewportChange',
  PANEL_STATE_CHANGE = 'panelStateChange',
}

export enum ErrorSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// Layout-related value objects are now exported from ui.ts
export { AlignmentMode, ExpansionDirection, LayoutStyle } from './ui.js';
