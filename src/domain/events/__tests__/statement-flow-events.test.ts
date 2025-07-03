import { describe, expect, it } from 'vitest';

import type { AtomicArgumentId, OrderedSetId, StatementId } from '../../shared/value-objects.js';
import {
  type FlowValidationResult,
  OrderedSetShared,
  OrderedSetUnshared,
  StatementAddedToFlow,
  StatementFlowBroken,
  StatementFlowEstablished,
  StatementFlowValidated,
  StatementRemovedFromFlow,
  type ValidationIssue,
} from '../statement-flow-events.js';

const mockFromArgumentId = { getValue: () => 'from-arg-123' } as AtomicArgumentId;
const mockToArgumentId = { getValue: () => 'to-arg-456' } as AtomicArgumentId;
const mockOrderedSetId = { getValue: () => 'set-123' } as OrderedSetId;
const mockStatementId = { getValue: () => 'stmt-123' } as StatementId;

describe('StatementFlowEstablished', () => {
  const mockStatementIds = [
    { getValue: () => 'stmt-1' } as StatementId,
    { getValue: () => 'stmt-2' } as StatementId,
    { getValue: () => 'stmt-3' } as StatementId,
  ];

  it('should create event with correct properties', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockOrderedSetId,
      mockStatementIds,
    );

    expect(event.eventType).toBe('StatementFlowEstablished');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.fromArgumentId).toBe(mockFromArgumentId);
    expect(event.toArgumentId).toBe(mockToArgumentId);
    expect(event.sharedOrderedSetId).toBe(mockOrderedSetId);
    expect(event.statementIds).toBe(mockStatementIds);
  });

  it('should serialize event data correctly', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockOrderedSetId,
      mockStatementIds,
    );

    const data = event.eventData;

    expect(data).toEqual({
      fromArgumentId: 'from-arg-123',
      toArgumentId: 'to-arg-456',
      sharedOrderedSetId: 'set-123',
      statementIds: ['stmt-1', 'stmt-2', 'stmt-3'],
    });
  });

  it('should create valid event record', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockOrderedSetId,
      mockStatementIds,
    );

    const record = event.toEventRecord();

    expect(record.eventType).toBe('StatementFlowEstablished');
    expect(record.aggregateId).toBe('flow-aggregate-123');
    expect(record.aggregateType).toBe('StatementFlow');
    expect(record.eventVersion).toBe(1);
    expect(record.eventData).toEqual(event.eventData);
    expect(record.metadata).toEqual({});
  });

  it('should handle empty statement list', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockOrderedSetId,
      [],
    );

    expect(event.statementIds).toEqual([]);
    expect(event.eventData.statementIds).toEqual([]);
  });
});

describe('StatementFlowBroken', () => {
  const mockPreviousOrderedSetId = { getValue: () => 'old-set-123' } as OrderedSetId;

  it('should create event with correct properties', () => {
    const event = new StatementFlowBroken(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockPreviousOrderedSetId,
      'ordered_set_modified',
    );

    expect(event.eventType).toBe('StatementFlowBroken');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.fromArgumentId).toBe(mockFromArgumentId);
    expect(event.toArgumentId).toBe(mockToArgumentId);
    expect(event.previousOrderedSetId).toBe(mockPreviousOrderedSetId);
    expect(event.reason).toBe('ordered_set_modified');
  });

  it('should serialize event data correctly', () => {
    const event = new StatementFlowBroken(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockPreviousOrderedSetId,
      'argument_deleted',
    );

    const data = event.eventData;

    expect(data).toEqual({
      fromArgumentId: 'from-arg-123',
      toArgumentId: 'to-arg-456',
      previousOrderedSetId: 'old-set-123',
      reason: 'argument_deleted',
    });
  });

  it('should handle different break reasons', () => {
    const reasons = [
      'ordered_set_modified',
      'argument_deleted',
      'explicit_disconnect',
      'validation_failure',
    ];

    reasons.forEach((reason) => {
      const event = new StatementFlowBroken(
        'flow-aggregate-123',
        mockFromArgumentId,
        mockToArgumentId,
        mockPreviousOrderedSetId,
        reason as any,
      );

      expect(event.reason).toBe(reason);
      expect(event.eventData.reason).toBe(reason);
    });
  });
});

describe('StatementFlowValidated', () => {
  const mockFlowPath = [
    { getValue: () => 'arg-1' } as AtomicArgumentId,
    { getValue: () => 'arg-2' } as AtomicArgumentId,
    { getValue: () => 'arg-3' } as AtomicArgumentId,
  ];

  const mockValidationIssues: ValidationIssue[] = [
    {
      type: 'logical_gap',
      message: 'Missing intermediate step between premises',
      location: { getValue: () => 'arg-2' } as AtomicArgumentId,
      severity: 'warning',
    },
    {
      type: 'invalid_inference',
      message: 'Conclusion does not follow from premises',
      location: { getValue: () => 'arg-3' } as AtomicArgumentId,
      severity: 'error',
    },
  ];

  const mockValidationResult: FlowValidationResult = {
    isValid: false,
    pathComplete: true,
    missingSteps: [],
    logicalErrors: mockValidationIssues,
    suggestions: ['Add intermediate reasoning step', 'Review logical connection'],
  };

  it('should create event with correct properties', () => {
    const event = new StatementFlowValidated(
      'flow-aggregate-123',
      mockFlowPath,
      mockValidationResult,
      'flow-validator',
    );

    expect(event.eventType).toBe('StatementFlowValidated');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.flowPath).toBe(mockFlowPath);
    expect(event.validationResult).toBe(mockValidationResult);
    expect(event.validatedBy).toBe('flow-validator');
  });

  it('should serialize event data correctly', () => {
    const event = new StatementFlowValidated(
      'flow-aggregate-123',
      mockFlowPath,
      mockValidationResult,
      'flow-validator',
    );

    const data = event.eventData;

    expect(data).toEqual({
      flowPath: ['arg-1', 'arg-2', 'arg-3'],
      validationResult: mockValidationResult,
      validatedBy: 'flow-validator',
    });
  });

  it('should handle valid flow results', () => {
    const validResult: FlowValidationResult = {
      isValid: true,
      pathComplete: true,
      missingSteps: [],
      logicalErrors: [],
      suggestions: [],
    };

    const event = new StatementFlowValidated(
      'flow-aggregate-123',
      mockFlowPath,
      validResult,
      'flow-validator',
    );

    expect(event.validationResult.isValid).toBe(true);
    expect(event.validationResult.logicalErrors).toEqual([]);
  });
});

describe('StatementAddedToFlow', () => {
  const mockAffectedArguments = [
    { getValue: () => 'affected-arg-1' } as AtomicArgumentId,
    { getValue: () => 'affected-arg-2' } as AtomicArgumentId,
  ];

  it('should create event with correct properties', () => {
    const event = new StatementAddedToFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockOrderedSetId,
      2,
      mockAffectedArguments,
    );

    expect(event.eventType).toBe('StatementAddedToFlow');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.statementId).toBe(mockStatementId);
    expect(event.orderedSetId).toBe(mockOrderedSetId);
    expect(event.position).toBe(2);
    expect(event.affectedArguments).toBe(mockAffectedArguments);
  });

  it('should serialize event data correctly', () => {
    const event = new StatementAddedToFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockOrderedSetId,
      1,
      mockAffectedArguments,
    );

    const data = event.eventData;

    expect(data).toEqual({
      statementId: 'stmt-123',
      orderedSetId: 'set-123',
      position: 1,
      affectedArguments: ['affected-arg-1', 'affected-arg-2'],
    });
  });

  it('should handle position zero', () => {
    const event = new StatementAddedToFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockOrderedSetId,
      0,
      [],
    );

    expect(event.position).toBe(0);
    expect(event.affectedArguments).toEqual([]);
  });
});

describe('StatementRemovedFromFlow', () => {
  const mockAffectedArguments = [
    { getValue: () => 'affected-arg-1' } as AtomicArgumentId,
    { getValue: () => 'affected-arg-2' } as AtomicArgumentId,
  ];

  it('should create event with correct properties', () => {
    const event = new StatementRemovedFromFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockOrderedSetId,
      3,
      mockAffectedArguments,
    );

    expect(event.eventType).toBe('StatementRemovedFromFlow');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.statementId).toBe(mockStatementId);
    expect(event.orderedSetId).toBe(mockOrderedSetId);
    expect(event.previousPosition).toBe(3);
    expect(event.affectedArguments).toBe(mockAffectedArguments);
  });

  it('should serialize event data correctly', () => {
    const event = new StatementRemovedFromFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockOrderedSetId,
      2,
      mockAffectedArguments,
    );

    const data = event.eventData;

    expect(data).toEqual({
      statementId: 'stmt-123',
      orderedSetId: 'set-123',
      previousPosition: 2,
      affectedArguments: ['affected-arg-1', 'affected-arg-2'],
    });
  });

  it('should handle removal from last position', () => {
    const event = new StatementRemovedFromFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockOrderedSetId,
      10,
      mockAffectedArguments,
    );

    expect(event.previousPosition).toBe(10);
  });
});

describe('OrderedSetShared', () => {
  const mockSharedBetween = [
    { getValue: () => 'arg-1' } as AtomicArgumentId,
    { getValue: () => 'arg-2' } as AtomicArgumentId,
    { getValue: () => 'arg-3' } as AtomicArgumentId,
  ];

  it('should create event for premise sharing', () => {
    const event = new OrderedSetShared(
      'flow-aggregate-123',
      mockOrderedSetId,
      mockSharedBetween,
      'premise',
    );

    expect(event.eventType).toBe('OrderedSetShared');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.orderedSetId).toBe(mockOrderedSetId);
    expect(event.sharedBetween).toBe(mockSharedBetween);
    expect(event.shareType).toBe('premise');
  });

  it('should create event for conclusion sharing', () => {
    const event = new OrderedSetShared(
      'flow-aggregate-123',
      mockOrderedSetId,
      mockSharedBetween,
      'conclusion',
    );

    expect(event.shareType).toBe('conclusion');
  });

  it('should serialize event data correctly', () => {
    const event = new OrderedSetShared(
      'flow-aggregate-123',
      mockOrderedSetId,
      mockSharedBetween,
      'premise',
    );

    const data = event.eventData;

    expect(data).toEqual({
      orderedSetId: 'set-123',
      sharedBetween: ['arg-1', 'arg-2', 'arg-3'],
      shareType: 'premise',
    });
  });

  it('should handle sharing between two arguments', () => {
    const twoArguments = [mockFromArgumentId, mockToArgumentId];
    const event = new OrderedSetShared(
      'flow-aggregate-123',
      mockOrderedSetId,
      twoArguments,
      'conclusion',
    );

    expect(event.sharedBetween).toBe(twoArguments);
    expect(event.eventData.sharedBetween).toEqual(['from-arg-123', 'to-arg-456']);
  });
});

describe('OrderedSetUnshared', () => {
  const mockPreviouslySharedBetween = [
    { getValue: () => 'arg-1' } as AtomicArgumentId,
    { getValue: () => 'arg-2' } as AtomicArgumentId,
  ];

  const mockNewOrderedSetIds = [
    { getValue: () => 'new-set-1' } as OrderedSetId,
    { getValue: () => 'new-set-2' } as OrderedSetId,
  ];

  it('should create event with correct properties', () => {
    const event = new OrderedSetUnshared(
      'flow-aggregate-123',
      mockOrderedSetId,
      mockPreviouslySharedBetween,
      mockNewOrderedSetIds,
    );

    expect(event.eventType).toBe('OrderedSetUnshared');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.orderedSetId).toBe(mockOrderedSetId);
    expect(event.previouslySharedBetween).toBe(mockPreviouslySharedBetween);
    expect(event.newOrderedSetIds).toBe(mockNewOrderedSetIds);
  });

  it('should serialize event data correctly', () => {
    const event = new OrderedSetUnshared(
      'flow-aggregate-123',
      mockOrderedSetId,
      mockPreviouslySharedBetween,
      mockNewOrderedSetIds,
    );

    const data = event.eventData;

    expect(data).toEqual({
      orderedSetId: 'set-123',
      previouslySharedBetween: ['arg-1', 'arg-2'],
      newOrderedSetIds: ['new-set-1', 'new-set-2'],
    });
  });

  it('should handle single argument unsharing', () => {
    const singleArgument = [mockFromArgumentId];
    const singleNewSet = [{ getValue: () => 'single-set' } as OrderedSetId];

    const event = new OrderedSetUnshared(
      'flow-aggregate-123',
      mockOrderedSetId,
      singleArgument,
      singleNewSet,
    );

    expect(event.previouslySharedBetween).toBe(singleArgument);
    expect(event.newOrderedSetIds).toBe(singleNewSet);
    expect(event.eventData.previouslySharedBetween).toEqual(['from-arg-123']);
    expect(event.eventData.newOrderedSetIds).toEqual(['single-set']);
  });

  it('should handle empty new sets list', () => {
    const event = new OrderedSetUnshared(
      'flow-aggregate-123',
      mockOrderedSetId,
      mockPreviouslySharedBetween,
      [],
    );

    expect(event.newOrderedSetIds).toEqual([]);
    expect(event.eventData.newOrderedSetIds).toEqual([]);
  });
});
