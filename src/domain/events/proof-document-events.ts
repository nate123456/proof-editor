import {
  type AtomicArgumentId,
  EventType,
  type ProofDocumentId,
  type StatementContent,
  type StatementId,
} from '../shared/value-objects/index.js';
import { DomainEvent } from './base-event.js';

export class ProofDocumentCreated extends DomainEvent {
  readonly eventType = EventType.PROOF_DOCUMENT_CREATED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      createdAt: number;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class StatementCreated extends DomainEvent {
  readonly eventType = EventType.STATEMENT_CREATED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      statementId: StatementId;
      content: StatementContent;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class StatementUpdated extends DomainEvent {
  readonly eventType = EventType.STATEMENT_UPDATED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      statementId: StatementId;
      oldContent: StatementContent;
      newContent: StatementContent;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class AtomicArgumentCreated extends DomainEvent {
  readonly eventType = EventType.ATOMIC_ARGUMENT_CREATED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseIds: StatementId[];
      conclusionIds: StatementId[];
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class AtomicArgumentUpdated extends DomainEvent {
  readonly eventType = EventType.ATOMIC_ARGUMENT_UPDATED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseIds: StatementId[];
      conclusionIds: StatementId[];
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class StatementDeleted extends DomainEvent {
  readonly eventType = EventType.STATEMENT_DELETED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      statementId: StatementId;
      content: StatementContent;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class AtomicArgumentDeleted extends DomainEvent {
  readonly eventType = EventType.ATOMIC_ARGUMENT_DELETED;

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseIds: StatementId[];
      conclusionIds: StatementId[];
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}
