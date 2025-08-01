import { Timestamp } from '../shared/value-objects/index.js';
// Testing script-based hook

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Timestamp;
  public readonly eventVersion: number;

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    eventVersion = 1,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = Timestamp.now();
    this.eventVersion = eventVersion;
  }

  abstract readonly eventType: string;
  abstract readonly eventData: Record<string, unknown>;

  toEventRecord(): EventRecord {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      eventVersion: this.eventVersion,
      eventData: this.eventData,
      occurredAt: this.occurredAt.getValue(),
      metadata: this.getMetadata(),
    };
  }

  protected getMetadata(): Record<string, unknown> {
    return {};
  }
}

export interface EventRecord {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  eventData: Record<string, unknown>;
  occurredAt: number;
  metadata: Record<string, unknown>;
}

export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void;
  canHandle(event: DomainEvent): event is T;
}

export interface EventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>;
  dispatch(event: DomainEvent): Promise<void>;
  registerHandler<T extends DomainEvent>(handler: DomainEventHandler<T>): void;
  unregisterHandler<T extends DomainEvent>(handler: DomainEventHandler<T>): void;
}

export interface EventStore {
  saveEvents(events: DomainEvent[]): Promise<void>;
  getEventsForAggregate(aggregateId: string, fromVersion?: number): Promise<EventRecord[]>;
  getAllEvents(fromTimestamp?: Timestamp): Promise<EventRecord[]>;
}

export abstract class AggregateRoot {
  private uncommittedEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  hasUncommittedEvents(): boolean {
    return this.uncommittedEvents.length > 0;
  }
}
