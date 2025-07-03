import { describe, expect, it } from 'vitest';

import { type DocumentId, type NodeId, type TreeId, Version } from '../../shared/value-objects.js';
import {
  type CausalityViolation,
  CausalityViolationDetected,
  type ConcurrentModification,
  ConcurrentModificationDetected,
  type ConflictDetails,
  MergeCompleted,
  type MergeResult,
  OperationApplied,
  OperationRejected,
  type ResolutionDetails,
  SyncConflictDetected,
  SyncConflictResolved,
  type SyncOperation,
  SyncStateChanged,
  type VectorClock,
  VectorClockUpdated,
} from '../sync-events.js';

const mockDocumentId = { getValue: () => 'doc-123' } as DocumentId;
const mockTreeId = { getValue: () => 'tree-123' } as TreeId;
const mockNodeId = { getValue: () => 'node-123' } as NodeId;
const mockLocalVersion = Version.create(120).match(
  value => value,
  () => {
    throw new Error('Failed to create version');
  }
);
const mockRemoteVersion = Version.create(130).match(
  value => value,
  () => {
    throw new Error('Failed to create version');
  }
);

describe('SyncConflictDetected', () => {
  const mockConflictDetails: ConflictDetails = {
    conflictId: 'conflict-456',
    involvedOperations: ['op-1', 'op-2'],
    description: 'Concurrent modifications to the same node',
    impact: {
      severity: 'medium',
      affectedTrees: [mockTreeId],
      affectedNodes: [mockNodeId],
      dataLossRisk: false,
      userInterventionRequired: true,
    },
    autoResolvable: false,
  };

  it('should create event with correct properties', () => {
    const event = new SyncConflictDetected(
      mockDocumentId,
      'concurrent_modification',
      mockConflictDetails,
      mockLocalVersion,
      mockRemoteVersion,
      'sync-service'
    );

    expect(event.eventType).toBe('SyncConflictDetected');
    expect(event.aggregateId).toBe('doc-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.conflictType).toBe('concurrent_modification');
    expect(event.conflictDetails).toBe(mockConflictDetails);
    expect(event.localVersion).toBe(mockLocalVersion);
    expect(event.remoteVersion).toBe(mockRemoteVersion);
    expect(event.detectedBy).toBe('sync-service');
  });

  it('should serialize event data correctly', () => {
    const event = new SyncConflictDetected(
      mockDocumentId,
      'structural_conflict',
      mockConflictDetails,
      mockLocalVersion,
      mockRemoteVersion,
      'conflict-detector'
    );

    const data = event.eventData;

    expect(data).toEqual({
      documentId: 'doc-123',
      conflictType: 'structural_conflict',
      conflictDetails: mockConflictDetails,
      localVersion: 120,
      remoteVersion: 130,
      detectedBy: 'conflict-detector',
    });
  });

  it('should handle different conflict types', () => {
    const conflictTypes = [
      'concurrent_modification',
      'delete_modify_conflict',
      'move_move_conflict',
      'semantic_conflict',
      'structural_conflict',
      'ordering_conflict',
    ];

    conflictTypes.forEach(conflictType => {
      const event = new SyncConflictDetected(
        mockDocumentId,
        conflictType as any,
        mockConflictDetails,
        mockLocalVersion,
        mockRemoteVersion,
        'sync-service'
      );

      expect(event.conflictType).toBe(conflictType);
    });
  });
});

describe('SyncConflictResolved', () => {
  const mockResolutionDetails: ResolutionDetails = {
    chosenOperation: 'op-2',
    mergedResult: { nodeId: 'node-123', newValue: 'merged content' },
    discardedOperations: ['op-1'],
    userInput: { choice: 'keep_remote', confirmed: true },
  };

  it('should create event with correct properties', () => {
    const event = new SyncConflictResolved(
      mockDocumentId,
      'conflict-456',
      'manual_merge',
      mockResolutionDetails,
      'user-123'
    );

    expect(event.eventType).toBe('SyncConflictResolved');
    expect(event.aggregateId).toBe('doc-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.conflictId).toBe('conflict-456');
    expect(event.resolutionStrategy).toBe('manual_merge');
    expect(event.resolutionDetails).toBe(mockResolutionDetails);
    expect(event.resolvedBy).toBe('user-123');
  });

  it('should serialize event data correctly', () => {
    const event = new SyncConflictResolved(
      mockDocumentId,
      'conflict-789',
      'automatic_merge',
      mockResolutionDetails,
      'auto-resolver'
    );

    const data = event.eventData;

    expect(data).toEqual({
      documentId: 'doc-123',
      conflictId: 'conflict-789',
      resolutionStrategy: 'automatic_merge',
      resolutionDetails: mockResolutionDetails,
      resolvedBy: 'auto-resolver',
    });
  });

  it('should handle different resolution strategies', () => {
    const strategies = [
      'local_wins',
      'remote_wins',
      'manual_merge',
      'automatic_merge',
      'discard_both',
      'create_alternatives',
    ];

    strategies.forEach(strategy => {
      const event = new SyncConflictResolved(
        mockDocumentId,
        'conflict-123',
        strategy as any,
        mockResolutionDetails,
        'resolver'
      );

      expect(event.resolutionStrategy).toBe(strategy);
    });
  });
});

describe('OperationApplied', () => {
  const mockOperation: SyncOperation = {
    id: 'op-123',
    type: 'update',
    targetId: 'node-456',
    targetType: 'Node',
    payload: { content: 'updated content' },
    timestamp: Date.now(),
    deviceId: 'device-789',
    userId: 'user-123',
    vectorClock: { 'device-1': 5, 'device-2': 3 },
    dependencies: ['op-100', 'op-101'],
  };

  it('should create event with correct properties', () => {
    const event = new OperationApplied(
      'agg-123',
      'Node',
      mockOperation,
      'device-789',
      'sync-coordinator',
      false
    );

    expect(event.eventType).toBe('OperationApplied');
    expect(event.aggregateId).toBe('agg-123');
    expect(event.aggregateType).toBe('Node');
    expect(event.operation).toBe(mockOperation);
    expect(event.sourceDevice).toBe('device-789');
    expect(event.appliedBy).toBe('sync-coordinator');
    expect(event.causedConflicts).toBe(false);
  });

  it('should serialize event data correctly', () => {
    const event = new OperationApplied(
      'agg-456',
      'Tree',
      mockOperation,
      'device-abc',
      'operation-applier',
      true
    );

    const data = event.eventData;

    expect(data).toEqual({
      operation: mockOperation,
      sourceDevice: 'device-abc',
      appliedBy: 'operation-applier',
      causedConflicts: true,
    });
  });

  it('should handle different operation types', () => {
    const operationTypes = [
      'create',
      'update',
      'delete',
      'move',
      'connect',
      'disconnect',
      'reorder',
    ];

    operationTypes.forEach(type => {
      const operation = { ...mockOperation, type: type as any };
      const event = new OperationApplied(
        'agg-123',
        'Node',
        operation,
        'device-123',
        'applier',
        false
      );

      expect(event.operation.type).toBe(type);
    });
  });
});

describe('OperationRejected', () => {
  const mockOperation: SyncOperation = {
    id: 'op-rejected-123',
    type: 'delete',
    targetId: 'node-456',
    targetType: 'Node',
    payload: {},
    timestamp: Date.now(),
    deviceId: 'device-789',
    userId: 'user-123',
    vectorClock: { 'device-1': 2, 'device-2': 1 },
    dependencies: [],
  };

  it('should create event with correct properties', () => {
    const event = new OperationRejected(
      'agg-123',
      'Node',
      mockOperation,
      'stale_version',
      'validation-service'
    );

    expect(event.eventType).toBe('OperationRejected');
    expect(event.aggregateId).toBe('agg-123');
    expect(event.aggregateType).toBe('Node');
    expect(event.operation).toBe(mockOperation);
    expect(event.rejectionReason).toBe('stale_version');
    expect(event.rejectedBy).toBe('validation-service');
  });

  it('should serialize event data correctly', () => {
    const event = new OperationRejected(
      'agg-456',
      'Tree',
      mockOperation,
      'causality_violation',
      'causal-validator'
    );

    const data = event.eventData;

    expect(data).toEqual({
      operation: mockOperation,
      rejectionReason: 'causality_violation',
      rejectedBy: 'causal-validator',
    });
  });

  it('should handle different rejection reasons', () => {
    const reasons = [
      'stale_version',
      'causality_violation',
      'validation_failure',
      'conflict_unresolvable',
      'permission_denied',
      'resource_locked',
    ];

    reasons.forEach(reason => {
      const event = new OperationRejected(
        'agg-123',
        'Node',
        mockOperation,
        reason as any,
        'validator'
      );

      expect(event.rejectionReason).toBe(reason);
    });
  });
});

describe('SyncStateChanged', () => {
  it('should create event with correct properties', () => {
    const event = new SyncStateChanged(
      mockDocumentId,
      'synced',
      'conflicted',
      'Conflict detected during merge',
      'sync-manager'
    );

    expect(event.eventType).toBe('SyncStateChanged');
    expect(event.aggregateId).toBe('doc-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.previousState).toBe('synced');
    expect(event.newState).toBe('conflicted');
    expect(event.reason).toBe('Conflict detected during merge');
    expect(event.changedBy).toBe('sync-manager');
  });

  it('should serialize event data correctly', () => {
    const event = new SyncStateChanged(
      mockDocumentId,
      'local_changes',
      'merging',
      'Starting merge process',
      'merge-coordinator'
    );

    const data = event.eventData;

    expect(data).toEqual({
      documentId: 'doc-123',
      previousState: 'local_changes',
      newState: 'merging',
      reason: 'Starting merge process',
      changedBy: 'merge-coordinator',
    });
  });

  it('should handle all sync states', () => {
    const states = ['synced', 'local_changes', 'remote_changes', 'conflicted', 'merging', 'error'];

    states.forEach(state => {
      const event = new SyncStateChanged(
        mockDocumentId,
        'synced',
        state as any,
        `Transition to ${state}`,
        'state-manager'
      );

      expect(event.newState).toBe(state);
    });
  });
});

describe('MergeCompleted', () => {
  const mockMergeResult: MergeResult = {
    success: true,
    mergedOperations: ['op-1', 'op-2', 'op-3'],
    conflictsRemaining: 0,
    warnings: ['Some metadata was lost'],
    changes: [
      {
        type: 'modified',
        targetId: 'node-123',
        targetType: 'Node',
        description: 'Node content updated',
        confidence: 0.95,
      },
      {
        type: 'added',
        targetId: 'node-456',
        targetType: 'Node',
        description: 'New node created',
        confidence: 1.0,
      },
    ],
  };

  it('should create event with correct properties', () => {
    const event = new MergeCompleted(mockDocumentId, 'three_way', mockMergeResult, 'merge-service');

    expect(event.eventType).toBe('MergeCompleted');
    expect(event.aggregateId).toBe('doc-123');
    expect(event.aggregateType).toBe('Document');
    expect(event.documentId).toBe(mockDocumentId);
    expect(event.mergeStrategy).toBe('three_way');
    expect(event.mergeResult).toBe(mockMergeResult);
    expect(event.mergedBy).toBe('merge-service');
  });

  it('should serialize event data correctly', () => {
    const event = new MergeCompleted(
      mockDocumentId,
      'operational_transform',
      mockMergeResult,
      'ot-merger'
    );

    const data = event.eventData;

    expect(data).toEqual({
      documentId: 'doc-123',
      mergeStrategy: 'operational_transform',
      mergeResult: mockMergeResult,
      mergedBy: 'ot-merger',
    });
  });

  it('should handle different merge strategies', () => {
    const strategies = [
      'three_way',
      'operational_transform',
      'conflict_free_replicated_data_type',
      'manual_resolution',
      'timestamp_based',
      'vector_clock_based',
    ];

    strategies.forEach(strategy => {
      const event = new MergeCompleted(mockDocumentId, strategy as any, mockMergeResult, 'merger');

      expect(event.mergeStrategy).toBe(strategy);
    });
  });
});

describe('ConcurrentModificationDetected', () => {
  const mockConcurrentModification: ConcurrentModification = {
    resourceId: 'node-456',
    resourceType: 'Node',
    conflictingOperations: [
      {
        id: 'op-1',
        type: 'update',
        targetId: 'node-456',
        targetType: 'Node',
        payload: { content: 'version A' },
        timestamp: Date.now() - 1000,
        deviceId: 'device-1',
        userId: 'user-1',
        vectorClock: { 'device-1': 3 },
        dependencies: [],
      },
      {
        id: 'op-2',
        type: 'update',
        targetId: 'node-456',
        targetType: 'Node',
        payload: { content: 'version B' },
        timestamp: Date.now(),
        deviceId: 'device-2',
        userId: 'user-2',
        vectorClock: { 'device-2': 2 },
        dependencies: [],
      },
    ],
    conflictType: 'concurrent_modification',
    impactAssessment: {
      severity: 'medium',
      affectedTrees: [mockTreeId],
      affectedNodes: [mockNodeId],
      dataLossRisk: false,
      userInterventionRequired: true,
    },
  };

  it('should create event with correct properties', () => {
    const event = new ConcurrentModificationDetected(
      'resource-123',
      'Node',
      mockConcurrentModification,
      ['user-1', 'user-2'],
      'concurrent-detector'
    );

    expect(event.eventType).toBe('ConcurrentModificationDetected');
    expect(event.aggregateId).toBe('resource-123');
    expect(event.aggregateType).toBe('Node');
    expect(event.modificationDetails).toBe(mockConcurrentModification);
    expect(event.participants).toEqual(['user-1', 'user-2']);
    expect(event.detectedBy).toBe('concurrent-detector');
  });

  it('should serialize event data correctly', () => {
    const event = new ConcurrentModificationDetected(
      'resource-456',
      'Tree',
      mockConcurrentModification,
      ['device-1', 'device-2'],
      'modification-detector'
    );

    const data = event.eventData;

    expect(data).toEqual({
      modificationDetails: mockConcurrentModification,
      participants: ['device-1', 'device-2'],
      detectedBy: 'modification-detector',
    });
  });
});

describe('VectorClockUpdated', () => {
  const mockPreviousClock: VectorClock = { 'device-1': 3, 'device-2': 1 };
  const mockNewClock: VectorClock = { 'device-1': 4, 'device-2': 1, 'device-3': 1 };

  it('should create event with correct properties', () => {
    const event = new VectorClockUpdated(
      'clock-agg-123',
      'VectorClock',
      mockPreviousClock,
      mockNewClock,
      'clock-manager'
    );

    expect(event.eventType).toBe('VectorClockUpdated');
    expect(event.aggregateId).toBe('clock-agg-123');
    expect(event.aggregateType).toBe('VectorClock');
    expect(event.previousClock).toBe(mockPreviousClock);
    expect(event.newClock).toBe(mockNewClock);
    expect(event.updatedBy).toBe('clock-manager');
  });

  it('should serialize event data correctly', () => {
    const event = new VectorClockUpdated(
      'clock-agg-456',
      'Document',
      mockPreviousClock,
      mockNewClock,
      'sync-service'
    );

    const data = event.eventData;

    expect(data).toEqual({
      previousClock: mockPreviousClock,
      newClock: mockNewClock,
      updatedBy: 'sync-service',
    });
  });
});

describe('CausalityViolationDetected', () => {
  const mockViolation: CausalityViolation = {
    type: 'out_of_order',
    description: 'Operation received before its dependencies',
    violatingOperation: 'op-456',
    expectedPredecessors: ['op-123', 'op-234'],
    actualPredecessors: ['op-123'],
  };

  it('should create event with correct properties', () => {
    const event = new CausalityViolationDetected(
      'causality-agg-123',
      'OperationSequence',
      mockViolation,
      ['op-456', 'op-234'],
      'causality-checker'
    );

    expect(event.eventType).toBe('CausalityViolationDetected');
    expect(event.aggregateId).toBe('causality-agg-123');
    expect(event.aggregateType).toBe('OperationSequence');
    expect(event.violationDetails).toBe(mockViolation);
    expect(event.affectedOperations).toEqual(['op-456', 'op-234']);
    expect(event.detectedBy).toBe('causality-checker');
  });

  it('should serialize event data correctly', () => {
    const event = new CausalityViolationDetected(
      'causality-agg-456',
      'Document',
      mockViolation,
      ['op-789'],
      'causal-validator'
    );

    const data = event.eventData;

    expect(data).toEqual({
      violationDetails: mockViolation,
      affectedOperations: ['op-789'],
      detectedBy: 'causal-validator',
    });
  });

  it('should handle different violation types', () => {
    const violationTypes = ['out_of_order', 'missing_dependency', 'circular_dependency'];

    violationTypes.forEach(type => {
      const violation = { ...mockViolation, type: type as any };
      const event = new CausalityViolationDetected(
        'causality-agg-123',
        'OperationSequence',
        violation,
        ['op-123'],
        'detector'
      );

      expect(event.violationDetails.type).toBe(type);
    });
  });
});
