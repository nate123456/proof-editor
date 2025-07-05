// Application layer event DTOs - abstracted from domain events
// These DTOs are used by presentation layer controllers to handle domain events
// without directly depending on domain layer types

export interface StatementEventData {
  statementId: string;
  content: string;
}

export interface StatementUpdatedEventData {
  statementId: string;
  oldContent: string;
  newContent: string;
}

export interface AtomicArgumentEventData {
  argumentId: string;
  premiseSetId: string | null;
  conclusionSetId: string | null;
}

export interface OrderedSetSharedEventData {
  orderedSetId: string;
  usages: string[];
}

// Application layer event types that presentation layer can safely use
export interface ApplicationEvent<T = unknown> {
  eventType: string;
  aggregateId: string;
  eventData: T;
  timestamp: number;
}

export type StatementCreatedEvent = ApplicationEvent<StatementEventData>;
export type StatementUpdatedEvent = ApplicationEvent<StatementUpdatedEventData>;
export type StatementDeletedEvent = ApplicationEvent<StatementEventData>;
export type AtomicArgumentCreatedEvent = ApplicationEvent<AtomicArgumentEventData>;
export type OrderedSetBecameSharedEvent = ApplicationEvent<OrderedSetSharedEventData>;

// Event mapping utilities for converting domain events to application events
export function mapToApplicationEvent<T>(domainEvent: {
  eventType: string;
  aggregateId: string;
  eventData: T;
  timestamp?: number;
}): ApplicationEvent<T> {
  return {
    eventType: domainEvent.eventType,
    aggregateId: domainEvent.aggregateId,
    eventData: domainEvent.eventData,
    timestamp: domainEvent.timestamp || Date.now(),
  };
}
