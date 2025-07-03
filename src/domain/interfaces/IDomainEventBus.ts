import type { Result } from 'neverthrow';
import type { DomainEvent } from '../events/base-event.js';

export interface IDomainEventBus {
  publish<T extends DomainEvent>(event: T): Promise<Result<void, EventBusError>>;
  publishMany(events: DomainEvent[]): Promise<Result<void, EventBusError>>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): Result<SubscriptionId, EventBusError>;
  unsubscribe(subscriptionId: SubscriptionId): Result<void, EventBusError>;
  clear(): Promise<Result<void, EventBusError>>;
  getEventHistory(limit?: number): DomainEvent[];
  getSubscriptionCount(eventType?: string): number;
  isHealthy(): boolean;
}

export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;
export type SubscriptionId = string;

export class EventBusError extends Error {
  constructor(
    message: string,
    public readonly code: EventBusErrorCode,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'EventBusError';
  }
}

export enum EventBusErrorCode {
  PUBLICATION_FAILED = 'PUBLICATION_FAILED',
  SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',
  HANDLER_EXECUTION_FAILED = 'HANDLER_EXECUTION_FAILED',
  INVALID_EVENT_TYPE = 'INVALID_EVENT_TYPE',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  EVENT_BUS_UNAVAILABLE = 'EVENT_BUS_UNAVAILABLE',
}

export interface EventBusConfig {
  maxEventHistory: number;
  handlerTimeout: number;
  retryAttempts: number;
  enableEventPersistence: boolean;
  maxConcurrentHandlers: number;
}

export interface EventSubscription {
  id: SubscriptionId;
  eventType: string;
  handler: EventHandler<DomainEvent>;
  subscribedAt: Date;
}

export interface EventBusMetrics {
  totalEventsPublished: number;
  totalHandlersExecuted: number;
  totalHandlerFailures: number;
  activeSubscriptions: number;
  eventHistorySize: number;
  lastEventPublishedAt?: Date;
}
