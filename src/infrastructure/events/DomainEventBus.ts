import { err, ok, type Result } from 'neverthrow';
import type { DomainEvent } from '../../domain/events/base-event.js';
import {
  type EventBusConfig,
  EventBusError,
  EventBusErrorCode,
  type EventBusMetrics,
  type EventHandler,
  type EventSubscription,
  type IDomainEventBus,
  type SubscriptionId,
} from '../../domain/interfaces/IDomainEventBus.js';

export class DomainEventBus implements IDomainEventBus {
  private readonly subscriptions = new Map<string, Set<EventSubscription>>();
  private readonly eventHistory: DomainEvent[] = [];
  private readonly metrics: EventBusMetrics = {
    totalEventsPublished: 0,
    totalHandlersExecuted: 0,
    totalHandlerFailures: 0,
    activeSubscriptions: 0,
    eventHistorySize: 0,
  };

  constructor(private readonly config: EventBusConfig) {}

  async publish<T extends DomainEvent>(event: T): Promise<Result<void, EventBusError>> {
    if (!this.isValidEvent(event)) {
      return err(
        new EventBusError(
          `Invalid event: ${event.eventType}`,
          EventBusErrorCode.INVALID_EVENT_TYPE,
        ),
      );
    }

    try {
      this.addToEventHistory(event);
      await this.executeHandlersForEvent(event);
      this.metrics.totalEventsPublished++;
      this.metrics.lastEventPublishedAt = new Date();
      return ok(undefined);
    } catch (error) {
      return err(
        new EventBusError(
          `Failed to publish event: ${event.eventType}`,
          EventBusErrorCode.PUBLICATION_FAILED,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  async publishMany(events: DomainEvent[]): Promise<Result<void, EventBusError>> {
    const results = await Promise.all(events.map((event) => this.publish(event)));

    const failures = results.filter((result) => result.isErr());
    if (failures.length > 0) {
      return err(
        new EventBusError(
          `Failed to publish ${failures.length} out of ${events.length} events`,
          EventBusErrorCode.PUBLICATION_FAILED,
        ),
      );
    }

    return ok(undefined);
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): Result<SubscriptionId, EventBusError> {
    if (!eventType || typeof handler !== 'function') {
      return err(
        new EventBusError('Invalid subscription parameters', EventBusErrorCode.SUBSCRIPTION_FAILED),
      );
    }

    const subscriptionId = this.generateSubscriptionId();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler<DomainEvent>,
      subscribedAt: new Date(),
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    this.subscriptions.get(eventType)?.add(subscription);
    this.metrics.activeSubscriptions++;

    return ok(subscriptionId);
  }

  unsubscribe(subscriptionId: SubscriptionId): Result<void, EventBusError> {
    for (const [eventType, subscriptions] of Array.from(this.subscriptions.entries())) {
      for (const subscription of Array.from(subscriptions)) {
        if (subscription.id === subscriptionId) {
          subscriptions.delete(subscription);
          this.metrics.activeSubscriptions--;

          if (subscriptions.size === 0) {
            this.subscriptions.delete(eventType);
          }

          return ok(undefined);
        }
      }
    }

    return err(
      new EventBusError(
        `Subscription not found: ${subscriptionId}`,
        EventBusErrorCode.SUBSCRIPTION_NOT_FOUND,
      ),
    );
  }

  async clear(): Promise<Result<void, EventBusError>> {
    try {
      this.subscriptions.clear();
      this.eventHistory.length = 0;
      this.resetMetrics();
      return ok(undefined);
    } catch (error) {
      return err(
        new EventBusError(
          'Failed to clear event bus',
          EventBusErrorCode.EVENT_BUS_UNAVAILABLE,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  }

  getEventHistory(limit?: number): DomainEvent[] {
    if (limit && limit > 0) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return this.subscriptions.get(eventType)?.size ?? 0;
    }
    return this.metrics.activeSubscriptions;
  }

  isHealthy(): boolean {
    return true;
  }

  getMetrics(): EventBusMetrics {
    return {
      ...this.metrics,
      eventHistorySize: this.eventHistory.length,
    };
  }

  private isValidEvent(event: DomainEvent): boolean {
    return Boolean(
      event?.eventType &&
        event.eventId &&
        event.aggregateId &&
        event.aggregateType &&
        event.occurredAt,
    );
  }

  private addToEventHistory(event: DomainEvent): void {
    this.eventHistory.push(event);

    while (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory.shift();
    }
  }

  private async executeHandlersForEvent(event: DomainEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.eventType);
    if (!subscriptions || subscriptions.size === 0) {
      return;
    }

    const handlerPromises = Array.from(subscriptions).map((subscription) =>
      this.executeHandlerWithTimeout(subscription.handler, event),
    );

    const results = await Promise.allSettled(handlerPromises);
    const failedResults = results.filter((result) => result.status === 'rejected');

    this.metrics.totalHandlersExecuted += results.length;
    this.metrics.totalHandlerFailures += failedResults.length;

    if (failedResults.length > 0) {
      // TODO: Implement error handling for failed event handlers
      // Could log errors, retry, or emit failure events
    }
  }

  private async executeHandlerWithTimeout(
    handler: EventHandler<DomainEvent>,
    event: DomainEvent,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Handler timeout after ${this.config.handlerTimeout}ms`));
      }, this.config.handlerTimeout);

      const executeHandler = async () => {
        try {
          await handler(event);
          clearTimeout(timeout);
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      executeHandler();
    });
  }

  private generateSubscriptionId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private resetMetrics(): void {
    this.metrics.totalEventsPublished = 0;
    this.metrics.totalHandlersExecuted = 0;
    this.metrics.totalHandlerFailures = 0;
    this.metrics.activeSubscriptions = 0;
    this.metrics.eventHistorySize = 0;
    delete this.metrics.lastEventPublishedAt;
  }
}

export const createDefaultEventBusConfig = (): EventBusConfig => ({
  maxEventHistory: 1000,
  handlerTimeout: 5000,
  retryAttempts: 3,
  enableEventPersistence: false,
  maxConcurrentHandlers: 10,
});
