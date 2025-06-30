import { DomainEvent } from './base-event.js';
import { StatementId, OrderedSetId, AtomicArgumentId } from '../shared/value-objects.js';

export class StatementFlowEstablished extends DomainEvent {
  readonly eventType = 'StatementFlowEstablished';

  constructor(
    aggregateId: string,
    public readonly fromArgumentId: AtomicArgumentId,
    public readonly toArgumentId: AtomicArgumentId,
    public readonly sharedOrderedSetId: OrderedSetId,
    public readonly statementIds: StatementId[]
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      fromArgumentId: this.fromArgumentId.getValue(),
      toArgumentId: this.toArgumentId.getValue(),
      sharedOrderedSetId: this.sharedOrderedSetId.getValue(),
      statementIds: this.statementIds.map(id => id.getValue())
    };
  }
}

export class StatementFlowBroken extends DomainEvent {
  readonly eventType = 'StatementFlowBroken';

  constructor(
    aggregateId: string,
    public readonly fromArgumentId: AtomicArgumentId,
    public readonly toArgumentId: AtomicArgumentId,
    public readonly previousOrderedSetId: OrderedSetId,
    public readonly reason: FlowBreakReason
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      fromArgumentId: this.fromArgumentId.getValue(),
      toArgumentId: this.toArgumentId.getValue(),
      previousOrderedSetId: this.previousOrderedSetId.getValue(),
      reason: this.reason
    };
  }
}

export class StatementFlowValidated extends DomainEvent {
  readonly eventType = 'StatementFlowValidated';

  constructor(
    aggregateId: string,
    public readonly flowPath: AtomicArgumentId[],
    public readonly validationResult: FlowValidationResult,
    public readonly validatedBy: string
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      flowPath: this.flowPath.map(id => id.getValue()),
      validationResult: this.validationResult,
      validatedBy: this.validatedBy
    };
  }
}

export class StatementAddedToFlow extends DomainEvent {
  readonly eventType = 'StatementAddedToFlow';

  constructor(
    aggregateId: string,
    public readonly statementId: StatementId,
    public readonly orderedSetId: OrderedSetId,
    public readonly position: number,
    public readonly affectedArguments: AtomicArgumentId[]
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      statementId: this.statementId.getValue(),
      orderedSetId: this.orderedSetId.getValue(),
      position: this.position,
      affectedArguments: this.affectedArguments.map(id => id.getValue())
    };
  }
}

export class StatementRemovedFromFlow extends DomainEvent {
  readonly eventType = 'StatementRemovedFromFlow';

  constructor(
    aggregateId: string,
    public readonly statementId: StatementId,
    public readonly orderedSetId: OrderedSetId,
    public readonly previousPosition: number,
    public readonly affectedArguments: AtomicArgumentId[]
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      statementId: this.statementId.getValue(),
      orderedSetId: this.orderedSetId.getValue(),
      previousPosition: this.previousPosition,
      affectedArguments: this.affectedArguments.map(id => id.getValue())
    };
  }
}

export class OrderedSetShared extends DomainEvent {
  readonly eventType = 'OrderedSetShared';

  constructor(
    aggregateId: string,
    public readonly orderedSetId: OrderedSetId,
    public readonly sharedBetween: AtomicArgumentId[],
    public readonly shareType: 'premise' | 'conclusion'
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      orderedSetId: this.orderedSetId.getValue(),
      sharedBetween: this.sharedBetween.map(id => id.getValue()),
      shareType: this.shareType
    };
  }
}

export class OrderedSetUnshared extends DomainEvent {
  readonly eventType = 'OrderedSetUnshared';

  constructor(
    aggregateId: string,
    public readonly orderedSetId: OrderedSetId,
    public readonly previouslySharedBetween: AtomicArgumentId[],
    public readonly newOrderedSetIds: OrderedSetId[]
  ) {
    super(aggregateId, 'StatementFlow');
  }

  get eventData(): Record<string, unknown> {
    return {
      orderedSetId: this.orderedSetId.getValue(),
      previouslySharedBetween: this.previouslySharedBetween.map(id => id.getValue()),
      newOrderedSetIds: this.newOrderedSetIds.map(id => id.getValue())
    };
  }
}

export type FlowBreakReason = 
  | 'ordered_set_modified'
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