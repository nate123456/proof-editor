import type { AtomicArgumentId, StatementId } from '../shared/value-objects/index.js';
import { DomainEvent } from './base-event.js';

export class StatementFlowEstablished extends DomainEvent {
  readonly eventType = 'StatementFlowEstablished';

  constructor(
    aggregateId: string,
    public readonly fromArgumentId: AtomicArgumentId,
    public readonly toArgumentId: AtomicArgumentId,
    public readonly sharedStatementId: StatementId,
    public readonly fromRole: 'premise' | 'conclusion',
    public readonly toRole: 'premise' | 'conclusion',
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      fromArgumentId: this.fromArgumentId.getValue(),
      toArgumentId: this.toArgumentId.getValue(),
      sharedStatementId: this.sharedStatementId.getValue(),
      fromRole: this.fromRole,
      toRole: this.toRole,
    };
  }
}

export class StatementFlowBroken extends DomainEvent {
  readonly eventType = 'StatementFlowBroken';

  constructor(
    aggregateId: string,
    public readonly fromArgumentId: AtomicArgumentId,
    public readonly toArgumentId: AtomicArgumentId,
    public readonly previousStatementId: StatementId,
    public readonly reason: FlowBreakReason,
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      fromArgumentId: this.fromArgumentId.getValue(),
      toArgumentId: this.toArgumentId.getValue(),
      previousStatementId: this.previousStatementId.getValue(),
      reason: this.reason,
    };
  }
}

export class StatementFlowValidated extends DomainEvent {
  readonly eventType = 'StatementFlowValidated';

  constructor(
    aggregateId: string,
    public readonly flowPath: AtomicArgumentId[],
    public readonly validationResult: FlowValidationResult,
    public readonly validatedBy: string,
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      flowPath: this.flowPath.map((id) => id.getValue()),
      validationResult: this.validationResult,
      validatedBy: this.validatedBy,
    };
  }
}

export class StatementAddedToFlow extends DomainEvent {
  readonly eventType = 'StatementAddedToFlow';

  constructor(
    aggregateId: string,
    public readonly statementId: StatementId,
    public readonly argumentId: AtomicArgumentId,
    public readonly role: 'premise' | 'conclusion',
    public readonly position: number,
    public readonly affectedArguments: AtomicArgumentId[],
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      statementId: this.statementId.getValue(),
      argumentId: this.argumentId.getValue(),
      role: this.role,
      position: this.position,
      affectedArguments: this.affectedArguments.map((id) => id.getValue()),
    };
  }
}

export class StatementRemovedFromFlow extends DomainEvent {
  readonly eventType = 'StatementRemovedFromFlow';

  constructor(
    aggregateId: string,
    public readonly statementId: StatementId,
    public readonly argumentId: AtomicArgumentId,
    public readonly role: 'premise' | 'conclusion',
    public readonly previousPosition: number,
    public readonly affectedArguments: AtomicArgumentId[],
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      statementId: this.statementId.getValue(),
      argumentId: this.argumentId.getValue(),
      role: this.role,
      previousPosition: this.previousPosition,
      affectedArguments: this.affectedArguments.map((id) => id.getValue()),
    };
  }
}

export class StatementShared extends DomainEvent {
  readonly eventType = 'StatementShared';

  constructor(
    aggregateId: string,
    public readonly statementId: StatementId,
    public readonly sharedBetween: AtomicArgumentId[],
    public readonly shareType: 'premise' | 'conclusion',
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      statementId: this.statementId.getValue(),
      sharedBetween: this.sharedBetween.map((id) => id.getValue()),
      shareType: this.shareType,
    };
  }
}

export class StatementUnshared extends DomainEvent {
  readonly eventType = 'StatementUnshared';

  constructor(
    aggregateId: string,
    public readonly statementId: StatementId,
    public readonly previouslySharedBetween: AtomicArgumentId[],
    public readonly reason: 'explicit_disconnect' | 'argument_modified' | 'argument_deleted',
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      statementId: this.statementId.getValue(),
      previouslySharedBetween: this.previouslySharedBetween.map((id) => id.getValue()),
      reason: this.reason,
    };
  }
}

export type FlowBreakReason =
  | 'statement_modified'
  | 'argument_deleted'
  | 'explicit_disconnect'
  | 'validation_failure';

export interface FlowValidationResult {
  isValid: boolean;
  pathComplete: boolean;
  missingSteps: AtomicArgumentId[];
  logicalErrors: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'logical_gap' | 'invalid_inference' | 'circular_reference' | 'missing_premise';
  message: string;
  location: AtomicArgumentId;
  severity: 'error' | 'warning' | 'info';
}
