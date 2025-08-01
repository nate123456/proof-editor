import type { DomainEvent } from '../../domain/events/base-event.js';

// Event handler type as requested
export type EventHandler = (event: DomainEvent) => Promise<void>;

// Disposable pattern for cleanup
export interface Disposable {
  dispose(): void;
}

// Event bus interface as requested
export interface IEventBus {
  publish(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): Disposable;
  subscribeAll(handler: EventHandler): Disposable;
}

// Enhanced event bus configuration
export interface EventBusConfig {
  maxEventHistory: number;
  handlerTimeout: number;
  enableReplay: boolean;
  enableMetrics: boolean;
  enableLogging: boolean;
  testMode: boolean;
}

// Metrics interface
export interface EventBusMetrics {
  totalEventsPublished: number;
  totalHandlersExecuted: number;
  totalHandlerFailures: number;
  activeSubscriptions: number;
  eventHistorySize: number;
  averageHandlerExecutionTime: number;
  lastEventPublishedAt?: Date;
}

// Event bus error types
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
  HANDLER_EXECUTION_FAILED = 'HANDLER_EXECUTION_FAILED',
  HANDLER_TIMEOUT = 'HANDLER_TIMEOUT',
  EVENT_VALIDATION_FAILED = 'EVENT_VALIDATION_FAILED',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
}

// Main event bus implementation
export class EventBus implements IEventBus {
  private readonly subscriptions = new Map<string, Set<EventHandler>>();
  private readonly globalSubscriptions = new Set<EventHandler>();
  private readonly eventHistory: DomainEvent[] = [];
  private readonly metrics: EventBusMetrics = {
    totalEventsPublished: 0,
    totalHandlersExecuted: 0,
    totalHandlerFailures: 0,
    activeSubscriptions: 0,
    eventHistorySize: 0,
    averageHandlerExecutionTime: 0,
  };

  // For test mode - capture events for assertions
  private readonly capturedEvents: DomainEvent[] = [];

  // Thread safety - prevent concurrent modifications
  private publishQueue: Promise<void> = Promise.resolve();

  // Handler execution times for metrics
  private handlerExecutionTimes: number[] = [];

  // Simple logging capability
  private logEnabled = false;

  constructor(private readonly config: EventBusConfig) {
    if (config.enableLogging) {
      this.logEnabled = true;
    }
  }

  private log(message: string): void {
    if (this.logEnabled && !this.config.testMode) {
      // biome-ignore lint/suspicious/noConsole: Event bus logging infrastructure
      console.log(`[EventBus] ${message}`);
    }
  }

  async publish(events: DomainEvent[]): Promise<void> {
    // Ensure FIFO ordering by chaining publishes
    this.publishQueue = this.publishQueue.then(async () => {
      await this.publishInternal(events);
    });

    await this.publishQueue;
  }

  private async publishInternal(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      if (this.config.enableLogging) {
        this.log(`Publishing event: ${event.eventType}`);
      }

      // Add to history
      this.addToEventHistory(event);

      // Capture for test mode
      if (this.config.testMode) {
        this.capturedEvents.push(event);
      }

      // Update metrics for published event (regardless of handlers)
      this.metrics.totalEventsPublished++;
      this.metrics.lastEventPublishedAt = new Date();

      // Get all handlers for this event type
      const typeHandlers = this.subscriptions.get(event.eventType) || new Set();
      const allHandlers = [...Array.from(typeHandlers), ...Array.from(this.globalSubscriptions)];

      if (allHandlers.length === 0) {
        if (this.config.enableLogging) {
          this.log(`No handlers registered for event type: ${event.eventType}`);
        }
        continue;
      }

      // Execute handlers with error isolation
      const handlerPromises = allHandlers.map((handler) =>
        this.executeHandlerSafely(handler, event),
      );

      const results = await Promise.allSettled(handlerPromises);

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0 && this.config.enableLogging) {
        failures.forEach((f) => {
          if (f.status === 'rejected') {
            this.log(`Handler failed for event ${event.eventType}: ${f.reason}`);
          }
        });
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): Disposable {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    const handlers = this.subscriptions.get(eventType) as Set<EventHandler>;
    handlers.add(handler);
    this.metrics.activeSubscriptions++;

    if (this.config.enableLogging) {
      this.log(`Registered handler for event type: ${eventType}`);
    }

    // Replay events if enabled
    if (this.config.enableReplay) {
      this.replayEventsForHandler(eventType, handler);
    }

    // Return disposable
    return {
      dispose: () => {
        const wasRemoved = handlers.delete(handler);
        if (wasRemoved) {
          this.metrics.activeSubscriptions--;
        }
        if (handlers.size === 0) {
          this.subscriptions.delete(eventType);
        }
        if (this.config.enableLogging) {
          this.log(`Unregistered handler for event type: ${eventType}`);
        }
      },
    };
  }

  subscribeAll(handler: EventHandler): Disposable {
    this.globalSubscriptions.add(handler);
    this.metrics.activeSubscriptions++;

    if (this.config.enableLogging) {
      this.log('Registered global event handler');
    }

    // Replay all events if enabled
    if (this.config.enableReplay) {
      this.replayAllEventsForHandler(handler);
    }

    return {
      dispose: () => {
        const wasRemoved = this.globalSubscriptions.delete(handler);
        if (wasRemoved) {
          this.metrics.activeSubscriptions--;
        }
        if (this.config.enableLogging) {
          this.log('Unregistered global event handler');
        }
      },
    };
  }

  // Additional functionality

  filterByAggregateId(aggregateId: string): DomainEvent[] {
    return this.eventHistory.filter((e) => e.aggregateId === aggregateId);
  }

  getMetrics(): EventBusMetrics {
    return {
      ...this.metrics,
      eventHistorySize: this.eventHistory.length,
      averageHandlerExecutionTime: this.calculateAverageExecutionTime(),
    };
  }

  getCapturedEvents(): DomainEvent[] {
    if (!this.config.testMode) {
      throw new Error('Event capture is only available in test mode');
    }
    return [...this.capturedEvents];
  }

  clearCapturedEvents(): void {
    if (!this.config.testMode) {
      throw new Error('Event capture is only available in test mode');
    }
    this.capturedEvents.length = 0;
  }

  clearHistory(): void {
    this.eventHistory.length = 0;
    this.metrics.eventHistorySize = 0;
  }

  // Private methods

  private async executeHandlerSafely(handler: EventHandler, event: DomainEvent): Promise<void> {
    const startTime = Date.now();

    try {
      await Promise.race([handler(event), this.createTimeoutPromise()]);

      const executionTime = Date.now() - startTime;
      this.recordHandlerExecutionTime(executionTime);
      this.metrics.totalHandlersExecuted++;
    } catch (_error) {
      this.metrics.totalHandlerFailures++;

      if (this.config.enableLogging) {
        this.log(`Handler execution failed for event: ${event.eventType}`);
      }

      // Don't throw - error isolation
    }
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new EventBusError(
            `Handler execution timeout after ${this.config.handlerTimeout}ms`,
            EventBusErrorCode.HANDLER_TIMEOUT,
          ),
        );
      }, this.config.handlerTimeout);
    });
  }

  private addToEventHistory(event: DomainEvent): void {
    this.eventHistory.push(event);

    // Maintain max history size
    while (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory.shift();
    }
  }

  private async replayEventsForHandler(eventType: string, handler: EventHandler): Promise<void> {
    const eventsToReplay = this.eventHistory.filter((e) => e.eventType === eventType);

    if (this.config.enableLogging && eventsToReplay.length > 0) {
      this.log(`Replaying ${eventsToReplay.length} events for event type: ${eventType}`);
    }

    for (const event of eventsToReplay) {
      await this.executeHandlerSafely(handler, event);
    }
  }

  private async replayAllEventsForHandler(handler: EventHandler): Promise<void> {
    if (this.config.enableLogging && this.eventHistory.length > 0) {
      this.log(`Replaying ${this.eventHistory.length} events for global handler`);
    }

    for (const event of this.eventHistory) {
      await this.executeHandlerSafely(handler, event);
    }
  }

  private recordHandlerExecutionTime(time: number): void {
    this.handlerExecutionTimes.push(time);

    // Keep only last 1000 execution times for metrics
    if (this.handlerExecutionTimes.length > 1000) {
      this.handlerExecutionTimes.shift();
    }
  }

  private calculateAverageExecutionTime(): number {
    if (this.handlerExecutionTimes.length === 0) {
      return 0;
    }

    const sum = this.handlerExecutionTimes.reduce((a, b) => a + b, 0);
    return sum / this.handlerExecutionTimes.length;
  }
}

// Factory function for creating event bus with default config
export function createEventBus(config?: Partial<EventBusConfig>): EventBus {
  const defaultConfig: EventBusConfig = {
    maxEventHistory: 1000,
    handlerTimeout: 5000,
    enableReplay: false,
    enableMetrics: true,
    enableLogging: false,
    testMode: false,
  };

  return new EventBus({ ...defaultConfig, ...config });
}

// Test utilities
export function createTestEventBus(): EventBus {
  return createEventBus({
    testMode: true,
    enableLogging: false,
    enableReplay: false,
    handlerTimeout: 1000,
    maxEventHistory: 100,
  });
}
