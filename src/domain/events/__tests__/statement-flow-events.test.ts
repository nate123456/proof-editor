import { describe, expect, it } from 'vitest';

import type {
  AtomicArgumentId,
  OrderedSetId,
  StatementId,
} from '../../shared/value-objects/index.js';
import {
  type FlowValidationResult,
  StatementAddedToFlow,
  StatementFlowBroken,
  StatementFlowEstablished,
  StatementFlowValidated,
  StatementRemovedFromFlow,
  StatementShared,
  StatementUnshared,
  type ValidationIssue,
} from '../statement-flow-events.js';

const mockFromArgumentId = { getValue: () => 'from-arg-123' } as AtomicArgumentId;
const mockToArgumentId = { getValue: () => 'to-arg-456' } as AtomicArgumentId;
const _mockOrderedSetId = { getValue: () => 'set-123' } as OrderedSetId;
const mockStatementId = { getValue: () => 'stmt-123' } as StatementId;

describe('StatementFlowEstablished', () => {
  const _mockStatementIds = [
    { getValue: () => 'stmt-1' } as StatementId,
    { getValue: () => 'stmt-2' } as StatementId,
    { getValue: () => 'stmt-3' } as StatementId,
  ];

  it('should create event with correct properties', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockStatementId,
      'conclusion',
      'premise',
    );

    expect(event.eventType).toBe('StatementFlowEstablished');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.fromArgumentId).toBe(mockFromArgumentId);
    expect(event.toArgumentId).toBe(mockToArgumentId);
    expect(event.sharedStatementId).toBe(mockStatementId);
    expect(event.fromRole).toBe('conclusion');
    expect(event.toRole).toBe('premise');
  });

  it('should serialize event data correctly', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockStatementId,
      'conclusion',
      'premise',
    );

    const data = event.eventData;

    expect(data).toEqual({
      fromArgumentId: 'from-arg-123',
      toArgumentId: 'to-arg-456',
      sharedStatementId: 'stmt-123',
      fromRole: 'conclusion',
      toRole: 'premise',
    });
  });

  it('should create valid event record', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockStatementId,
      'conclusion',
      'premise',
    );

    const record = event.toEventRecord();

    expect(record.eventType).toBe('StatementFlowEstablished');
    expect(record.aggregateId).toBe('flow-aggregate-123');
    expect(record.aggregateType).toBe('StatementFlow');
    expect(record.eventVersion).toBe(1);
    expect(record.eventData).toEqual(event.eventData);
    expect(record.metadata).toEqual({});
  });

  it('should handle event creation with different roles', () => {
    const event = new StatementFlowEstablished(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockStatementId,
      'premise',
      'conclusion',
    );

    expect(event.fromRole).toBe('premise');
    expect(event.toRole).toBe('conclusion');
  });
});

describe('StatementFlowBroken', () => {
  const mockPreviousStatementId = { getValue: () => 'old-stmt-123' } as StatementId;

  it('should create event with correct properties', () => {
    const event = new StatementFlowBroken(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockPreviousStatementId,
      'statement_modified',
    );

    expect(event.eventType).toBe('StatementFlowBroken');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.fromArgumentId).toBe(mockFromArgumentId);
    expect(event.toArgumentId).toBe(mockToArgumentId);
    expect(event.previousStatementId).toBe(mockPreviousStatementId);
    expect(event.reason).toBe('statement_modified');
  });

  it('should serialize event data correctly', () => {
    const event = new StatementFlowBroken(
      'flow-aggregate-123',
      mockFromArgumentId,
      mockToArgumentId,
      mockPreviousStatementId,
      'argument_deleted',
    );

    const data = event.eventData;

    expect(data).toEqual({
      fromArgumentId: 'from-arg-123',
      toArgumentId: 'to-arg-456',
      previousStatementId: 'old-stmt-123',
      reason: 'argument_deleted',
    });
  });

  it('should handle different break reasons', () => {
    const reasons = [
      'statement_modified',
      'argument_deleted',
      'explicit_disconnect',
      'validation_failure',
    ];

    reasons.forEach((reason) => {
      const event = new StatementFlowBroken(
        'flow-aggregate-123',
        mockFromArgumentId,
        mockToArgumentId,
        mockPreviousStatementId,
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
      mockFromArgumentId,
      'premise',
      2,
      mockAffectedArguments,
    );

    expect(event.eventType).toBe('StatementAddedToFlow');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.statementId).toBe(mockStatementId);
    expect(event.argumentId).toBe(mockFromArgumentId);
    expect(event.role).toBe('premise');
    expect(event.position).toBe(2);
    expect(event.affectedArguments).toBe(mockAffectedArguments);
  });

  it('should serialize event data correctly', () => {
    const event = new StatementAddedToFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockFromArgumentId,
      'premise',
      1,
      mockAffectedArguments,
    );

    const data = event.eventData;

    expect(data).toEqual({
      statementId: 'stmt-123',
      argumentId: 'from-arg-123',
      role: 'premise',
      position: 1,
      affectedArguments: ['affected-arg-1', 'affected-arg-2'],
    });
  });

  it('should handle position zero', () => {
    const event = new StatementAddedToFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockFromArgumentId,
      'premise',
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
      mockFromArgumentId,
      'premise',
      3,
      mockAffectedArguments,
    );

    expect(event.eventType).toBe('StatementRemovedFromFlow');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.statementId).toBe(mockStatementId);
    expect(event.argumentId).toBe(mockFromArgumentId);
    expect(event.role).toBe('premise');
    expect(event.previousPosition).toBe(3);
    expect(event.affectedArguments).toBe(mockAffectedArguments);
  });

  it('should serialize event data correctly', () => {
    const event = new StatementRemovedFromFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockFromArgumentId,
      'premise',
      2,
      mockAffectedArguments,
    );

    const data = event.eventData;

    expect(data).toEqual({
      statementId: 'stmt-123',
      argumentId: 'from-arg-123',
      role: 'premise',
      previousPosition: 2,
      affectedArguments: ['affected-arg-1', 'affected-arg-2'],
    });
  });

  it('should handle removal from last position', () => {
    const event = new StatementRemovedFromFlow(
      'flow-aggregate-123',
      mockStatementId,
      mockFromArgumentId,
      'premise',
      10,
      mockAffectedArguments,
    );

    expect(event.previousPosition).toBe(10);
  });
});

describe('StatementShared', () => {
  const mockSharedBetween = [
    { getValue: () => 'arg-1' } as AtomicArgumentId,
    { getValue: () => 'arg-2' } as AtomicArgumentId,
    { getValue: () => 'arg-3' } as AtomicArgumentId,
  ];

  it('should create event for premise sharing', () => {
    const event = new StatementShared(
      'flow-aggregate-123',
      mockStatementId,
      mockSharedBetween,
      'premise',
    );

    expect(event.eventType).toBe('StatementShared');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.statementId).toBe(mockStatementId);
    expect(event.sharedBetween).toBe(mockSharedBetween);
    expect(event.shareType).toBe('premise');
  });

  it('should create event for conclusion sharing', () => {
    const event = new StatementShared(
      'flow-aggregate-123',
      mockStatementId,
      mockSharedBetween,
      'conclusion',
    );

    expect(event.shareType).toBe('conclusion');
  });

  it('should serialize event data correctly', () => {
    const event = new StatementShared(
      'flow-aggregate-123',
      mockStatementId,
      mockSharedBetween,
      'premise',
    );

    const data = event.eventData;

    expect(data).toEqual({
      statementId: 'stmt-123',
      sharedBetween: ['arg-1', 'arg-2', 'arg-3'],
      shareType: 'premise',
    });
  });

  it('should handle sharing between two arguments', () => {
    const twoArguments = [mockFromArgumentId, mockToArgumentId];
    const event = new StatementShared(
      'flow-aggregate-123',
      mockStatementId,
      twoArguments,
      'conclusion',
    );

    expect(event.sharedBetween).toBe(twoArguments);
    expect(event.eventData.sharedBetween).toEqual(['from-arg-123', 'to-arg-456']);
  });
});

describe('StatementUnshared', () => {
  const mockPreviouslySharedBetween = [
    { getValue: () => 'arg-1' } as AtomicArgumentId,
    { getValue: () => 'arg-2' } as AtomicArgumentId,
  ];

  it('should create event with correct properties', () => {
    const event = new StatementUnshared(
      'flow-aggregate-123',
      mockStatementId,
      mockPreviouslySharedBetween,
      'explicit_disconnect',
    );

    expect(event.eventType).toBe('StatementUnshared');
    expect(event.aggregateId).toBe('flow-aggregate-123');
    expect(event.aggregateType).toBe('StatementFlow');
    expect(event.statementId).toBe(mockStatementId);
    expect(event.previouslySharedBetween).toBe(mockPreviouslySharedBetween);
    expect(event.reason).toBe('explicit_disconnect');
  });

  it('should serialize event data correctly', () => {
    const event = new StatementUnshared(
      'flow-aggregate-123',
      mockStatementId,
      mockPreviouslySharedBetween,
      'argument_modified',
    );

    const data = event.eventData;

    expect(data).toEqual({
      statementId: 'stmt-123',
      previouslySharedBetween: ['arg-1', 'arg-2'],
      reason: 'argument_modified',
    });
  });

  it('should handle single argument unsharing', () => {
    const singleArgument = [mockFromArgumentId];

    const event = new StatementUnshared(
      'flow-aggregate-123',
      mockStatementId,
      singleArgument,
      'argument_deleted',
    );

    expect(event.previouslySharedBetween).toBe(singleArgument);
    expect(event.reason).toBe('argument_deleted');
    expect(event.eventData.previouslySharedBetween).toEqual(['from-arg-123']);
    expect(event.eventData.reason).toBe('argument_deleted');
  });

  it('should handle different unshare reasons', () => {
    const reasons: Array<'explicit_disconnect' | 'argument_modified' | 'argument_deleted'> = [
      'explicit_disconnect',
      'argument_modified',
      'argument_deleted',
    ];

    reasons.forEach((reason) => {
      const event = new StatementUnshared(
        'flow-aggregate-123',
        mockStatementId,
        mockPreviouslySharedBetween,
        reason,
      );

      expect(event.reason).toBe(reason);
      expect(event.eventData.reason).toBe(reason);
    });
  });
});
