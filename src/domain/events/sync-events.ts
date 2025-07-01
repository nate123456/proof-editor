import {
  // AtomicArgumentId,
  type DocumentId,
  type NodeId,
  type TreeId,
  type Version,
} from '../shared/value-objects.js';
import { DomainEvent } from './base-event.js';

export class SyncConflictDetected extends DomainEvent {
  readonly eventType = 'SyncConflictDetected';

  constructor(
    public readonly documentId: DocumentId,
    public readonly conflictType: ConflictType,
    public readonly conflictDetails: ConflictDetails,
    public readonly localVersion: Version,
    public readonly remoteVersion: Version,
    public readonly detectedBy: string
  ) {
    super(documentId.getValue(), 'Document');
  }

  get eventData(): Record<string, unknown> {
    return {
      documentId: this.documentId.getValue(),
      conflictType: this.conflictType,
      conflictDetails: this.conflictDetails,
      localVersion: this.localVersion.getValue(),
      remoteVersion: this.remoteVersion.getValue(),
      detectedBy: this.detectedBy,
    };
  }
}

export class SyncConflictResolved extends DomainEvent {
  readonly eventType = 'SyncConflictResolved';

  constructor(
    public readonly documentId: DocumentId,
    public readonly conflictId: string,
    public readonly resolutionStrategy: ResolutionStrategy,
    public readonly resolutionDetails: ResolutionDetails,
    public readonly resolvedBy: string
  ) {
    super(documentId.getValue(), 'Document');
  }

  get eventData(): Record<string, unknown> {
    return {
      documentId: this.documentId.getValue(),
      conflictId: this.conflictId,
      resolutionStrategy: this.resolutionStrategy,
      resolutionDetails: this.resolutionDetails,
      resolvedBy: this.resolvedBy,
    };
  }
}

export class OperationApplied extends DomainEvent {
  readonly eventType = 'OperationApplied';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly operation: SyncOperation,
    public readonly sourceDevice: string,
    public readonly appliedBy: string,
    public readonly causedConflicts = false
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      operation: this.operation,
      sourceDevice: this.sourceDevice,
      appliedBy: this.appliedBy,
      causedConflicts: this.causedConflicts,
    };
  }
}

export class OperationRejected extends DomainEvent {
  readonly eventType = 'OperationRejected';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly operation: SyncOperation,
    public readonly rejectionReason: RejectionReason,
    public readonly rejectedBy: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      operation: this.operation,
      rejectionReason: this.rejectionReason,
      rejectedBy: this.rejectedBy,
    };
  }
}

export class SyncStateChanged extends DomainEvent {
  readonly eventType = 'SyncStateChanged';

  constructor(
    public readonly documentId: DocumentId,
    public readonly previousState: SyncState,
    public readonly newState: SyncState,
    public readonly reason: string,
    public readonly changedBy: string
  ) {
    super(documentId.getValue(), 'Document');
  }

  get eventData(): Record<string, unknown> {
    return {
      documentId: this.documentId.getValue(),
      previousState: this.previousState,
      newState: this.newState,
      reason: this.reason,
      changedBy: this.changedBy,
    };
  }
}

export class MergeCompleted extends DomainEvent {
  readonly eventType = 'MergeCompleted';

  constructor(
    public readonly documentId: DocumentId,
    public readonly mergeStrategy: MergeStrategy,
    public readonly mergeResult: MergeResult,
    public readonly mergedBy: string
  ) {
    super(documentId.getValue(), 'Document');
  }

  get eventData(): Record<string, unknown> {
    return {
      documentId: this.documentId.getValue(),
      mergeStrategy: this.mergeStrategy,
      mergeResult: this.mergeResult,
      mergedBy: this.mergedBy,
    };
  }
}

export class ConcurrentModificationDetected extends DomainEvent {
  readonly eventType = 'ConcurrentModificationDetected';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly modificationDetails: ConcurrentModification,
    public readonly participants: string[],
    public readonly detectedBy: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      modificationDetails: this.modificationDetails,
      participants: this.participants,
      detectedBy: this.detectedBy,
    };
  }
}

export class VectorClockUpdated extends DomainEvent {
  readonly eventType = 'VectorClockUpdated';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly previousClock: VectorClock,
    public readonly newClock: VectorClock,
    public readonly updatedBy: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      previousClock: this.previousClock,
      newClock: this.newClock,
      updatedBy: this.updatedBy,
    };
  }
}

export class CausalityViolationDetected extends DomainEvent {
  readonly eventType = 'CausalityViolationDetected';

  constructor(
    aggregateId: string,
    aggregateType: string,
    public readonly violationDetails: CausalityViolation,
    public readonly affectedOperations: string[],
    public readonly detectedBy: string
  ) {
    super(aggregateId, aggregateType);
  }

  get eventData(): Record<string, unknown> {
    return {
      violationDetails: this.violationDetails,
      affectedOperations: this.affectedOperations,
      detectedBy: this.detectedBy,
    };
  }
}

export interface SyncOperation {
  id: string;
  type: OperationType;
  targetId: string;
  targetType: string;
  payload: Record<string, unknown>;
  timestamp: number;
  deviceId: string;
  userId: string;
  vectorClock: VectorClock;
  dependencies: string[];
}

export interface ConflictDetails {
  conflictId: string;
  involvedOperations: string[];
  description: string;
  impact: ConflictImpact;
  autoResolvable: boolean;
}

export interface ResolutionDetails {
  chosenOperation: string | null;
  mergedResult: Record<string, unknown> | null;
  discardedOperations: string[];
  userInput: Record<string, unknown>;
}

export interface ConcurrentModification {
  resourceId: string;
  resourceType: string;
  conflictingOperations: SyncOperation[];
  conflictType: ConflictType;
  impactAssessment: ConflictImpact;
}

export interface MergeResult {
  success: boolean;
  mergedOperations: string[];
  conflictsRemaining: number;
  warnings: string[];
  changes: MergeChange[];
}

export interface MergeChange {
  type: 'added' | 'modified' | 'removed' | 'merged';
  targetId: string;
  targetType: string;
  description: string;
  confidence: number;
}

export type VectorClock = Record<string, number>;

export interface CausalityViolation {
  type: 'out_of_order' | 'missing_dependency' | 'circular_dependency';
  description: string;
  violatingOperation: string;
  expectedPredecessors: string[];
  actualPredecessors: string[];
}

export interface ConflictImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedTrees: TreeId[];
  affectedNodes: NodeId[];
  dataLossRisk: boolean;
  userInterventionRequired: boolean;
}

export type ConflictType =
  | 'concurrent_modification'
  | 'delete_modify_conflict'
  | 'move_move_conflict'
  | 'semantic_conflict'
  | 'structural_conflict'
  | 'ordering_conflict';

export type ResolutionStrategy =
  | 'local_wins'
  | 'remote_wins'
  | 'manual_merge'
  | 'automatic_merge'
  | 'discard_both'
  | 'create_alternatives';

export type SyncState =
  | 'synced'
  | 'local_changes'
  | 'remote_changes'
  | 'conflicted'
  | 'merging'
  | 'error';

export type MergeStrategy =
  | 'three_way'
  | 'operational_transform'
  | 'conflict_free_replicated_data_type'
  | 'manual_resolution'
  | 'timestamp_based'
  | 'vector_clock_based';

export type OperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'connect'
  | 'disconnect'
  | 'reorder'
  | 'metadata_change';

export type RejectionReason =
  | 'stale_version'
  | 'causality_violation'
  | 'validation_failure'
  | 'conflict_unresolvable'
  | 'permission_denied'
  | 'resource_locked';
