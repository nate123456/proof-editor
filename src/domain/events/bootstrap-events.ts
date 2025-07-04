import type { AtomicArgumentId, TreeId } from '../shared/value-objects.js';
import { DomainEvent } from './base-event.js';

/**
 * Domain event emitted when a bootstrap argument is created.
 * This represents the creation of the first empty atomic argument in a proof.
 */
export class BootstrapArgumentCreated extends DomainEvent {
  readonly eventType = 'BootstrapArgumentCreated';

  constructor(
    aggregateId: string,
    private readonly argumentId: AtomicArgumentId,
    private readonly treeId?: TreeId,
  ) {
    super(aggregateId, 'ProofAggregate', 1);
  }

  get eventData(): Record<string, unknown> {
    return {
      argumentId: this.argumentId.getValue(),
      treeId: this.treeId?.getValue(),
      timestamp: this.occurredAt.getValue(),
    };
  }
}

/**
 * Domain event emitted when a bootstrap argument is populated with content.
 * This represents the transformation from an empty argument to one with premises/conclusions.
 */
export class BootstrapArgumentPopulated extends DomainEvent {
  readonly eventType = 'BootstrapArgumentPopulated';

  constructor(
    aggregateId: string,
    private readonly oldArgumentId: AtomicArgumentId,
    private readonly newArgumentId: AtomicArgumentId,
    private readonly premiseCount: number,
    private readonly conclusionCount: number,
  ) {
    super(aggregateId, 'ProofAggregate', 1);
  }

  get eventData(): Record<string, unknown> {
    return {
      oldArgumentId: this.oldArgumentId.getValue(),
      newArgumentId: this.newArgumentId.getValue(),
      premiseCount: this.premiseCount,
      conclusionCount: this.conclusionCount,
    };
  }
}
