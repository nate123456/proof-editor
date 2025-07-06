import type {
  AtomicArgumentId,
  OrderedSetId,
  ProofDocumentId,
  StatementContent,
  StatementId,
} from '../shared/value-objects.js';
import { DomainEvent } from './base-event.js';

export class ProofDocumentCreated extends DomainEvent {
  readonly eventType = 'ProofDocumentCreated';

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
  readonly eventType = 'StatementCreated';

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
  readonly eventType = 'StatementUpdated';

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

export class OrderedSetCreated extends DomainEvent {
  readonly eventType = 'OrderedSetCreated';

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      orderedSetId: OrderedSetId;
      statementIds: StatementId[];
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class AtomicArgumentCreated extends DomainEvent {
  readonly eventType = 'AtomicArgumentCreated';

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseSetId: OrderedSetId | null;
      conclusionSetId: OrderedSetId | null;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class OrderedSetBecameShared extends DomainEvent {
  readonly eventType = 'OrderedSetBecameShared';

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      orderedSetId: OrderedSetId;
      usages: AtomicArgumentId[];
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class AtomicArgumentUpdated extends DomainEvent {
  readonly eventType = 'AtomicArgumentUpdated';

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseSetId: OrderedSetId | null;
      conclusionSetId: OrderedSetId | null;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class StatementDeleted extends DomainEvent {
  readonly eventType = 'StatementDeleted';

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
  readonly eventType = 'AtomicArgumentDeleted';

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      argumentId: AtomicArgumentId;
      premiseSetId: OrderedSetId | null;
      conclusionSetId: OrderedSetId | null;
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}

export class OrderedSetDeleted extends DomainEvent {
  readonly eventType = 'OrderedSetDeleted';

  constructor(
    aggregateId: ProofDocumentId,
    public readonly eventData: {
      orderedSetId: OrderedSetId;
      statementIds: StatementId[];
    },
  ) {
    super(aggregateId.getValue(), 'ProofDocument');
  }
}
