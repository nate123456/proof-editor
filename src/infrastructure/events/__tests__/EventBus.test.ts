/**
 * Comprehensive tests for EventBus infrastructure
 *
 * Tests cover:
 * - Event publishing with FIFO ordering
 * - Subscription management (typed and global subscriptions)
 * - Error isolation and handler timeout handling
 * - Event history and replay functionality
 * - Metrics collection and performance tracking
 * - Test mode with event capture
 * - Configuration validation and edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEvent } from '../../../domain/events/base-event.js';
import {
  createEventBus,
  createTestEventBus,
  type Disposable,
  EventBus,
  type EventBusConfig,
  EventBusError,
  EventBusErrorCode,
  type EventHandler,
} from '../EventBus.js';

// Mock domain event for testing
class TestEvent extends DomainEvent {
  public readonly eventType = 'TestEvent';
  public readonly eventData = { test: true };

  constructor(aggregateId: string, aggregateType: string = 'TestAggregate') {
    super(aggregateId, aggregateType);
  }
}

class SlowEvent extends DomainEvent {
  public readonly eventType = 'SlowEvent';
  public readonly eventData = { test: true, slow: true };

  constructor(aggregateId: string, aggregateType: string = 'TestAggregate') {
    super(aggregateId, aggregateType);
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;
  let config: EventBusConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      maxEventHistory: 100,
      handlerTimeout: 1000,
      enableReplay: false,
      enableMetrics: true,
      enableLogging: false,
      testMode: false,
    };
    eventBus = new EventBus(config);
  });

  describe('constructor and configuration', () => {
    it('should initialize with provided configuration', () => {
      const customConfig: EventBusConfig = {
        maxEventHistory: 50,
        handlerTimeout: 2000,
        enableReplay: true,
        enableMetrics: false,
        enableLogging: true,
        testMode: true,
      };

      const customEventBus = new EventBus(customConfig);
      const metrics = customEventBus.getMetrics();

      expect(metrics.totalEventsPublished).toBe(0);
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it('should initialize metrics correctly', () => {
      const metrics = eventBus.getMetrics();

      expect(metrics.totalEventsPublished).toBe(0);
      expect(metrics.totalHandlersExecuted).toBe(0);
      expect(metrics.totalHandlerFailures).toBe(0);
      expect(metrics.activeSubscriptions).toBe(0);
      expect(metrics.eventHistorySize).toBe(0);
      expect(metrics.averageHandlerExecutionTime).toBe(0);
      expect(metrics.lastEventPublishedAt).toBeUndefined();
    });
  });

  describe('event publishing', () => {
    it('should publish single event successfully', async () => {
      const event = new TestEvent('agg-1');
      const handler = vi.fn().mockResolvedValue(undefined);

      eventBus.subscribe('TestEvent', handler);
      await eventBus.publish([event]);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should publish multiple events in order', async () => {
      const events = [new TestEvent('agg-1'), new TestEvent('agg-2'), new TestEvent('agg-3')];
      const handler = vi.fn().mockResolvedValue(undefined);
      const calls: string[] = [];

      eventBus.subscribe('TestEvent', (event) => {
        calls.push(event.aggregateId);
        return handler(event);
      });

      await eventBus.publish(events);

      expect(calls).toEqual(['agg-1', 'agg-2', 'agg-3']);
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should maintain FIFO ordering with concurrent publishes', async () => {
      const events1 = [new TestEvent('batch-1-1'), new TestEvent('batch-1-2')];
      const events2 = [new TestEvent('batch-2-1'), new TestEvent('batch-2-2')];
      const handler = vi.fn().mockResolvedValue(undefined);
      const calls: string[] = [];

      eventBus.subscribe('TestEvent', (event) => {
        calls.push(event.aggregateId);
        return handler(event);
      });

      // Start both publishes concurrently
      const promise1 = eventBus.publish(events1);
      const promise2 = eventBus.publish(events2);

      await Promise.all([promise1, promise2]);

      // Should maintain order within each batch and between batches
      expect(calls).toHaveLength(4);
      expect(calls.slice(0, 2)).toEqual(['batch-1-1', 'batch-1-2']);
      expect(calls.slice(2, 4)).toEqual(['batch-2-1', 'batch-2-2']);
    });

    it('should update metrics after publishing', async () => {
      const event = new TestEvent('agg-1');
      const handler = vi.fn().mockResolvedValue(undefined);

      eventBus.subscribe('TestEvent', handler);
      await eventBus.publish([event]);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(1);
      expect(metrics.totalHandlersExecuted).toBe(1);
      expect(metrics.lastEventPublishedAt).toBeInstanceOf(Date);
    });

    it('should add events to history', async () => {
      const event = new TestEvent('agg-1');

      await eventBus.publish([event]);

      const metrics = eventBus.getMetrics();
      expect(metrics.eventHistorySize).toBe(1);
    });

    it('should handle empty event array', async () => {
      const handler = vi.fn();
      eventBus.subscribe('TestEvent', handler);

      await eventBus.publish([]);

      expect(handler).not.toHaveBeenCalled();
      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(0);
    });
  });

  describe('subscription management', () => {
    it('should subscribe to specific event types', () => {
      const handler = vi.fn();
      const disposable = eventBus.subscribe('TestEvent', handler);

      expect(disposable).toHaveProperty('dispose');
      expect(typeof disposable.dispose).toBe('function');

      const metrics = eventBus.getMetrics();
      expect(metrics.activeSubscriptions).toBe(1);
    });

    it('should support multiple handlers for same event type', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);
      const event = new TestEvent('agg-1');

      eventBus.subscribe('TestEvent', handler1);
      eventBus.subscribe('TestEvent', handler2);

      await eventBus.publish([event]);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should dispose subscriptions correctly', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const disposable = eventBus.subscribe('TestEvent', handler);
      const event = new TestEvent('agg-1');

      // Verify subscription works
      await eventBus.publish([event]);
      expect(handler).toHaveBeenCalledTimes(1);

      // Dispose and verify subscription is removed
      disposable.dispose();
      await eventBus.publish([event]);
      expect(handler).toHaveBeenCalledTimes(1); // Not called again

      const metrics = eventBus.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it('should handle global subscriptions', async () => {
      const globalHandler = vi.fn().mockResolvedValue(undefined);
      const disposable = eventBus.subscribeAll(globalHandler);

      const testEvent = new TestEvent('agg-1');
      const slowEvent = new SlowEvent('agg-2');

      await eventBus.publish([testEvent, slowEvent]);

      expect(globalHandler).toHaveBeenCalledWith(testEvent);
      expect(globalHandler).toHaveBeenCalledWith(slowEvent);
      expect(globalHandler).toHaveBeenCalledTimes(2);

      disposable.dispose();
      const metrics = eventBus.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it('should call both specific and global handlers', async () => {
      const specificHandler = vi.fn().mockResolvedValue(undefined);
      const globalHandler = vi.fn().mockResolvedValue(undefined);
      const event = new TestEvent('agg-1');

      eventBus.subscribe('TestEvent', specificHandler);
      eventBus.subscribeAll(globalHandler);

      await eventBus.publish([event]);

      expect(specificHandler).toHaveBeenCalledWith(event);
      expect(globalHandler).toHaveBeenCalledWith(event);
    });

    it('should not call handlers for non-matching event types', async () => {
      const testHandler = vi.fn().mockResolvedValue(undefined);
      const slowHandler = vi.fn().mockResolvedValue(undefined);

      eventBus.subscribe('TestEvent', testHandler);
      eventBus.subscribe('SlowEvent', slowHandler);

      const testEvent = new TestEvent('agg-1');
      await eventBus.publish([testEvent]);

      expect(testHandler).toHaveBeenCalledWith(testEvent);
      expect(slowHandler).not.toHaveBeenCalled();
    });
  });

  describe('error handling and isolation', () => {
    it('should isolate handler errors and continue processing', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = vi.fn().mockResolvedValue(undefined);
      const event = new TestEvent('agg-1');

      eventBus.subscribe('TestEvent', errorHandler);
      eventBus.subscribe('TestEvent', successHandler);

      await eventBus.publish([event]);

      expect(errorHandler).toHaveBeenCalledWith(event);
      expect(successHandler).toHaveBeenCalledWith(event);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalHandlerFailures).toBe(1);
      expect(metrics.totalHandlersExecuted).toBe(1); // Only successful handler
    });

    it('should handle handler timeouts', async () => {
      const timeoutConfig: EventBusConfig = {
        ...config,
        handlerTimeout: 50, // Very short timeout
      };
      const timeoutEventBus = new EventBus(timeoutConfig);

      const slowHandler = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));
      const event = new TestEvent('agg-1');

      timeoutEventBus.subscribe('TestEvent', slowHandler);
      await timeoutEventBus.publish([event]);

      const metrics = timeoutEventBus.getMetrics();
      expect(metrics.totalHandlerFailures).toBe(1);
      expect(metrics.totalHandlersExecuted).toBe(0);
    });

    it('should continue processing events after handler errors', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = vi.fn().mockResolvedValue(undefined);

      eventBus.subscribe('TestEvent', errorHandler);
      eventBus.subscribe('TestEvent', successHandler);

      const events = [new TestEvent('agg-1'), new TestEvent('agg-2')];
      await eventBus.publish(events);

      expect(errorHandler).toHaveBeenCalledTimes(2);
      expect(successHandler).toHaveBeenCalledTimes(2);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(2);
      expect(metrics.totalHandlerFailures).toBe(2);
      expect(metrics.totalHandlersExecuted).toBe(2);
    });
  });

  describe('event history and filtering', () => {
    it('should maintain event history up to max size', async () => {
      const smallHistoryConfig: EventBusConfig = {
        ...config,
        maxEventHistory: 2,
      };
      const smallEventBus = new EventBus(smallHistoryConfig);

      const events = [new TestEvent('agg-1'), new TestEvent('agg-2'), new TestEvent('agg-3')];

      await smallEventBus.publish(events);

      const metrics = smallEventBus.getMetrics();
      expect(metrics.eventHistorySize).toBe(2); // Only last 2 events kept
    });

    it('should filter events by aggregate ID', async () => {
      const events = [new TestEvent('agg-1'), new TestEvent('agg-2'), new TestEvent('agg-1')];

      await eventBus.publish(events);

      const agg1Events = eventBus.filterByAggregateId('agg-1');
      expect(agg1Events).toHaveLength(2);
      expect(agg1Events.every((e) => e.aggregateId === 'agg-1')).toBe(true);

      const agg2Events = eventBus.filterByAggregateId('agg-2');
      expect(agg2Events).toHaveLength(1);
      expect(agg2Events[0]?.aggregateId).toBe('agg-2');
    });

    it('should clear history when requested', async () => {
      const events = [new TestEvent('agg-1'), new TestEvent('agg-2')];
      await eventBus.publish(events);

      let metrics = eventBus.getMetrics();
      expect(metrics.eventHistorySize).toBe(2);

      eventBus.clearHistory();

      metrics = eventBus.getMetrics();
      expect(metrics.eventHistorySize).toBe(0);
    });
  });

  describe('event replay functionality', () => {
    it('should replay events for new subscriptions when enabled', async () => {
      const replayConfig: EventBusConfig = {
        ...config,
        enableReplay: true,
      };
      const replayEventBus = new EventBus(replayConfig);

      // Publish events before subscription
      const events = [new TestEvent('agg-1'), new TestEvent('agg-2')];
      await replayEventBus.publish(events);

      // Subscribe after events were published
      const handler = vi.fn().mockResolvedValue(undefined);
      replayEventBus.subscribe('TestEvent', handler);

      // Give replay time to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should replay all events for global subscriptions when enabled', async () => {
      const replayConfig: EventBusConfig = {
        ...config,
        enableReplay: true,
      };
      const replayEventBus = new EventBus(replayConfig);

      // Publish different event types
      const testEvent = new TestEvent('agg-1');
      const slowEvent = new SlowEvent('agg-2');
      await replayEventBus.publish([testEvent, slowEvent]);

      // Subscribe globally after events were published
      const globalHandler = vi.fn().mockResolvedValue(undefined);
      replayEventBus.subscribeAll(globalHandler);

      // Give replay time to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(globalHandler).toHaveBeenCalledWith(testEvent);
      expect(globalHandler).toHaveBeenCalledWith(slowEvent);
      expect(globalHandler).toHaveBeenCalledTimes(2);
    });

    it('should not replay events when replay is disabled', async () => {
      // Publish events before subscription (replay disabled by default)
      const events = [new TestEvent('agg-1'), new TestEvent('agg-2')];
      await eventBus.publish(events);

      // Subscribe after events were published
      const handler = vi.fn().mockResolvedValue(undefined);
      eventBus.subscribe('TestEvent', handler);

      // Give potential replay time to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('metrics and performance tracking', () => {
    it('should track execution times', async () => {
      const handler = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10)));
      const event = new TestEvent('agg-1');

      eventBus.subscribe('TestEvent', handler);
      await eventBus.publish([event]);

      const metrics = eventBus.getMetrics();
      expect(metrics.averageHandlerExecutionTime).toBeGreaterThan(0);
      expect(metrics.totalHandlersExecuted).toBe(1);
    });

    it('should calculate average execution time correctly', async () => {
      const fastHandler = vi.fn().mockResolvedValue(undefined);
      const slowHandler = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 20)));

      eventBus.subscribe('TestEvent', fastHandler);
      eventBus.subscribe('TestEvent', slowHandler);

      const event = new TestEvent('agg-1');
      await eventBus.publish([event]);

      const metrics = eventBus.getMetrics();
      expect(metrics.averageHandlerExecutionTime).toBeGreaterThan(0);
      expect(metrics.totalHandlersExecuted).toBe(2);
    });

    it('should maintain execution time history limit', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      eventBus.subscribe('TestEvent', handler);

      // Publish many events to test history limit
      const events = Array.from({ length: 50 }, (_, i) => new TestEvent(`agg-${i}`));
      await eventBus.publish(events);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalHandlersExecuted).toBe(50);
      expect(metrics.averageHandlerExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('test mode functionality', () => {
    it('should capture events in test mode', async () => {
      const testModeEventBus = createTestEventBus();
      const events = [new TestEvent('agg-1'), new TestEvent('agg-2')];

      await testModeEventBus.publish(events);

      const capturedEvents = testModeEventBus.getCapturedEvents();
      expect(capturedEvents).toHaveLength(2);
      expect(capturedEvents[0]?.aggregateId).toBe('agg-1');
      expect(capturedEvents[1]?.aggregateId).toBe('agg-2');
    });

    it('should clear captured events in test mode', async () => {
      const testModeEventBus = createTestEventBus();
      const event = new TestEvent('agg-1');

      await testModeEventBus.publish([event]);
      expect(testModeEventBus.getCapturedEvents()).toHaveLength(1);

      testModeEventBus.clearCapturedEvents();
      expect(testModeEventBus.getCapturedEvents()).toHaveLength(0);
    });

    it('should throw error when accessing captured events outside test mode', () => {
      expect(() => {
        eventBus.getCapturedEvents();
      }).toThrow('Event capture is only available in test mode');
    });

    it('should throw error when clearing captured events outside test mode', () => {
      expect(() => {
        eventBus.clearCapturedEvents();
      }).toThrow('Event capture is only available in test mode');
    });
  });

  describe('factory functions', () => {
    it('should create event bus with default configuration', () => {
      const defaultEventBus = createEventBus();
      const metrics = defaultEventBus.getMetrics();

      expect(metrics.totalEventsPublished).toBe(0);
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it('should create event bus with custom configuration', () => {
      const customEventBus = createEventBus({
        maxEventHistory: 200,
        handlerTimeout: 3000,
        testMode: true,
      });

      // Test that custom config is applied
      expect(() => {
        customEventBus.getCapturedEvents();
      }).not.toThrow();
    });

    it('should create test event bus with appropriate settings', () => {
      const testEventBus = createTestEventBus();

      // Should not throw in test mode
      expect(() => {
        testEventBus.getCapturedEvents();
      }).not.toThrow();

      expect(testEventBus.getCapturedEvents()).toEqual([]);
    });
  });

  describe('EventBusError', () => {
    it('should create EventBusError with correct properties', () => {
      const originalError = new Error('Original error');
      const eventBusError = new EventBusError(
        'Test error',
        EventBusErrorCode.HANDLER_EXECUTION_FAILED,
        originalError,
      );

      expect(eventBusError.name).toBe('EventBusError');
      expect(eventBusError.message).toBe('Test error');
      expect(eventBusError.code).toBe(EventBusErrorCode.HANDLER_EXECUTION_FAILED);
      expect(eventBusError.originalError).toBe(originalError);
    });

    it('should create EventBusError without original error', () => {
      const eventBusError = new EventBusError('Test error', EventBusErrorCode.HANDLER_TIMEOUT);

      expect(eventBusError.name).toBe('EventBusError');
      expect(eventBusError.message).toBe('Test error');
      expect(eventBusError.code).toBe(EventBusErrorCode.HANDLER_TIMEOUT);
      expect(eventBusError.originalError).toBeUndefined();
    });
  });

  describe('advanced edge cases and error conditions', () => {
    it('should handle events without handlers gracefully', async () => {
      const event = new TestEvent('agg-1');

      // No handlers subscribed
      await eventBus.publish([event]);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(1);
      expect(metrics.totalHandlersExecuted).toBe(0);
    });

    it('should handle handler returning non-promise values', async () => {
      const syncHandler = vi.fn().mockReturnValue('sync result');
      const event = new TestEvent('agg-1');

      eventBus.subscribe('TestEvent', syncHandler as any);
      await eventBus.publish([event]);

      expect(syncHandler).toHaveBeenCalledWith(event);
      const metrics = eventBus.getMetrics();
      expect(metrics.totalHandlersExecuted).toBe(1);
    });

    it('should handle multiple disposes of same subscription', () => {
      const handler = vi.fn();
      const disposable = eventBus.subscribe('TestEvent', handler);

      disposable.dispose();
      disposable.dispose(); // Should not throw

      const metrics = eventBus.getMetrics();
      expect(metrics.activeSubscriptions).toBe(0);
    });

    it('should handle memory constraints with very large event history', async () => {
      const largeHistoryConfig: EventBusConfig = {
        ...config,
        maxEventHistory: 10000,
      };
      const largeEventBus = new EventBus(largeHistoryConfig);

      // Publish many events
      const events = Array.from({ length: 100 }, (_, i) => new TestEvent(`agg-${i}`));
      await largeEventBus.publish(events);

      const metrics = largeEventBus.getMetrics();
      expect(metrics.eventHistorySize).toBe(100);
    });

    it('should handle concurrent handler registration and disposal', async () => {
      const events = [new TestEvent('test-1'), new TestEvent('test-2')];
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      // Start publishing events
      const publishPromise = eventBus.publish(events);

      // Simultaneously register and dispose handlers
      const disposable1 = eventBus.subscribe('TestEvent', handler1);
      const disposable2 = eventBus.subscribe('TestEvent', handler2);

      disposable1.dispose();

      await publishPromise;

      // Only handler2 should have been called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(2);

      disposable2.dispose();
    });

    it('should handle invalid event types gracefully', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      // Register handler for specific type
      eventBus.subscribe('TestEvent', handler);

      // Publish event with null eventType
      const invalidEvent = {
        aggregateId: 'test',
        aggregateType: 'Test',
        eventType: null as any,
        eventData: {},
        occurredAt: new Date(),
        version: 1,
      };

      await eventBus.publish([invalidEvent as any]);

      // Handler should not be called for invalid event type
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle handlers that throw synchronous errors', async () => {
      const syncErrorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const successHandler = vi.fn().mockResolvedValue(undefined);
      const event = new TestEvent('test');

      eventBus.subscribe('TestEvent', syncErrorHandler);
      eventBus.subscribe('TestEvent', successHandler);

      await eventBus.publish([event]);

      expect(syncErrorHandler).toHaveBeenCalledWith(event);
      expect(successHandler).toHaveBeenCalledWith(event);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalHandlerFailures).toBe(1);
      expect(metrics.totalHandlersExecuted).toBe(1);
    });

    it('should handle rapid subscription and unsubscription', () => {
      const handlers: EventHandler[] = [];
      const disposables: Disposable[] = [];

      // Create many handlers rapidly
      for (let i = 0; i < 100; i++) {
        const handler = vi.fn().mockResolvedValue(undefined);
        handlers.push(handler);
        const disposable = eventBus.subscribe('TestEvent', handler);
        disposables.push(disposable);
      }

      // Dispose half of them
      for (let i = 0; i < 50; i++) {
        disposables[i]?.dispose();
      }

      const metrics = eventBus.getMetrics();
      expect(metrics.activeSubscriptions).toBe(50);

      // Dispose remaining
      for (let i = 50; i < 100; i++) {
        disposables[i]?.dispose();
      }

      expect(eventBus.getMetrics().activeSubscriptions).toBe(0);
    });

    it('should maintain event ordering under high concurrency', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const receivedEvents: string[] = [];

      eventBus.subscribe('TestEvent', (event) => {
        receivedEvents.push(event.aggregateId);
        return handler(event);
      });

      // Start multiple concurrent batches
      const batch1 = [new TestEvent('batch1-1'), new TestEvent('batch1-2')];
      const batch2 = [new TestEvent('batch2-1'), new TestEvent('batch2-2')];
      const batch3 = [new TestEvent('batch3-1'), new TestEvent('batch3-2')];

      const promises = [
        eventBus.publish(batch1),
        eventBus.publish(batch2),
        eventBus.publish(batch3),
      ];

      await Promise.all(promises);

      // Events within each batch should maintain order
      expect(receivedEvents).toHaveLength(6);

      // Find batch positions
      const batch1Start = receivedEvents.indexOf('batch1-1');
      const batch1End = receivedEvents.indexOf('batch1-2');
      const batch2Start = receivedEvents.indexOf('batch2-1');
      const batch2End = receivedEvents.indexOf('batch2-2');
      const batch3Start = receivedEvents.indexOf('batch3-1');
      const batch3End = receivedEvents.indexOf('batch3-2');

      // Within each batch, order should be preserved
      expect(batch1End).toBeGreaterThan(batch1Start);
      expect(batch2End).toBeGreaterThan(batch2Start);
      expect(batch3End).toBeGreaterThan(batch3Start);
    });

    it('should handle zero-length handler execution times', async () => {
      const instantHandler = vi.fn().mockResolvedValue(undefined);
      const event = new TestEvent('instant');

      eventBus.subscribe('TestEvent', instantHandler);
      await eventBus.publish([event]);

      const metrics = eventBus.getMetrics();
      expect(metrics.averageHandlerExecutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.totalHandlersExecuted).toBe(1);
      expect(metrics.totalEventsPublished).toBe(1);
    });
  });
});
