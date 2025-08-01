import {
  type AtomicArgumentId,
  EventType,
  type ProofId,
  type StatementContent,
  type StatementId,
} from '../shared/value-objects/index.js';
import { DomainEvent } from './base-event.js';

export class ProofAggregateCreated extends DomainEvent {
  readonly eventType = EventType.PROOF_AGGREGATE_CREATED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      initialStatement?: string;
      createdAt: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}

export class ProofStatementAdded extends DomainEvent {
  readonly eventType = EventType.PROOF_STATEMENT_ADDED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      statementId: StatementId;
      content: StatementContent;
      version: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}

export class ProofStatementRemoved extends DomainEvent {
  readonly eventType = EventType.PROOF_STATEMENT_REMOVED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      statementId: StatementId;
      content: StatementContent;
      version: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}

export class ProofAtomicArgumentCreated extends DomainEvent {
  readonly eventType = EventType.PROOF_ATOMIC_ARGUMENT_CREATED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseIds: StatementId[];
      conclusionIds: StatementId[];
      version: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}

export class ProofArgumentsConnected extends DomainEvent {
  readonly eventType = EventType.PROOF_ARGUMENTS_CONNECTED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      sourceArgumentId: AtomicArgumentId;
      targetArgumentId: AtomicArgumentId;
      connectionCount: number;
      version: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}

export class ProofVersionIncremented extends DomainEvent {
  readonly eventType = EventType.PROOF_VERSION_INCREMENTED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      previousVersion: number;
      newVersion: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}

export class ProofConsistencyValidated extends DomainEvent {
  readonly eventType = EventType.PROOF_CONSISTENCY_VALIDATED;

  constructor(
    aggregateId: ProofId,
    public readonly eventData: {
      isValid: boolean;
      validationErrors?: string[];
      version: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofAggregate');
  }
}
