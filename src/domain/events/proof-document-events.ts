import { DomainEvent } from './base-event.js';

export class ProofDocumentCreated extends DomainEvent {
  readonly eventType = 'ProofDocumentCreated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      createdAt: number;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class StatementCreated extends DomainEvent {
  readonly eventType = 'StatementCreated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      statementId: string;
      content: string;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class StatementUpdated extends DomainEvent {
  readonly eventType = 'StatementUpdated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      statementId: string;
      oldContent: string;
      newContent: string;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class OrderedSetCreated extends DomainEvent {
  readonly eventType = 'OrderedSetCreated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      orderedSetId: string;
      statementIds: string[];
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class AtomicArgumentCreated extends DomainEvent {
  readonly eventType = 'AtomicArgumentCreated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      argumentId: string;
      premiseSetId: string | null;
      conclusionSetId: string | null;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class OrderedSetBecameShared extends DomainEvent {
  readonly eventType = 'OrderedSetBecameShared';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      orderedSetId: string;
      usages: string[];
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class AtomicArgumentUpdated extends DomainEvent {
  readonly eventType = 'AtomicArgumentUpdated';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      argumentId: string;
      premiseSetId: string | null;
      conclusionSetId: string | null;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class StatementDeleted extends DomainEvent {
  readonly eventType = 'StatementDeleted';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      statementId: string;
      content: string;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class AtomicArgumentDeleted extends DomainEvent {
  readonly eventType = 'AtomicArgumentDeleted';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      argumentId: string;
      premiseSetId: string | null;
      conclusionSetId: string | null;
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}

export class OrderedSetDeleted extends DomainEvent {
  readonly eventType = 'OrderedSetDeleted';

  constructor(
    aggregateId: string,
    public readonly eventData: {
      orderedSetId: string;
      statementIds: string[];
    },
  ) {
    super(aggregateId, 'ProofDocument');
  }
}
