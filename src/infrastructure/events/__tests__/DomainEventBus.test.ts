import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEvent } from '../../../domain/events/base-event.js';
import {
  EventBusErrorCode,
  type EventHandler,
} from '../../../domain/interfaces/IDomainEventBus.js';
import { createDefaultEventBusConfig, DomainEventBus } from '../DomainEventBus.js';

class TestEvent extends DomainEvent {
  public readonly eventType = 'test-event';
  public readonly eventData: Record<string, unknown>;

  constructor(aggregateId: string, data: Record<string, unknown> = {}) {
    super(aggregateId, 'test-aggregate');
    this.eventData = data;
  }
}

class AnotherTestEvent extends DomainEvent {
  public readonly eventType = 'another-test-event';
  public readonly eventData: Record<string, unknown>;

  constructor(aggregateId: string, data: Record<string, unknown> = {}) {
    super(aggregateId, 'test-aggregate');
    this.eventData = data;
  }
}

describe('DomainEventBus', () => {
  let eventBus: DomainEventBus;

  beforeEach(() => {
    eventBus = new DomainEventBus(createDefaultEventBusConfig());
  });

  describe('publish', () => {
    it('should successfully publish a valid event', async () => {
      const event = new TestEvent('test-id');
      const result = await eventBus.publish(event);

      expect(result.isOk()).toBe(true);
      expect(eventBus.getEventHistory()).toHaveLength(1);
      expect(eventBus.getEventHistory()[0]).toBe(event);
    });

    it('should reject invalid events', async () => {
      const invalidEvent = {
        eventType: '',
        eventId: '',
        aggregateId: '',
        aggregateType: '',
        occurredAt: null,
      } as unknown as DomainEvent;

      const result = await eventBus.publish(invalidEvent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(EventBusErrorCode.INVALID_EVENT_TYPE);
      }
    });

    it('should execute handlers for published events', async () => {
      const handler = vi.fn();
      const event = new TestEvent('test-id');

      const subscribeResult = eventBus.subscribe('test-event', handler);
      expect(subscribeResult.isOk()).toBe(true);

      const publishResult = await eventBus.publish(event);
      expect(publishResult.isOk()).toBe(true);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle handler execution failures gracefully', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const successHandler = vi.fn();
      const event = new TestEvent('test-id');

      eventBus.subscribe('test-event', failingHandler);
      eventBus.subscribe('test-event', successHandler);

      const result = await eventBus.publish(event);

      expect(result.isOk()).toBe(true);
      expect(failingHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalHandlerFailures).toBe(1);
      expect(metrics.totalHandlersExecuted).toBe(2);
    });

    it('should timeout handlers that take too long', async () => {
      const config = createDefaultEventBusConfig();
      config.handlerTimeout = 100;
      const eventBusWithTimeout = new DomainEventBus(config);

      const slowHandler = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));
      const event = new TestEvent('test-id');

      eventBusWithTimeout.subscribe('test-event', slowHandler);

      const result = await eventBusWithTimeout.publish(event);

      expect(result.isOk()).toBe(true);
      expect(slowHandler).toHaveBeenCalledTimes(1);

      const metrics = eventBusWithTimeout.getMetrics();
      expect(metrics.totalHandlerFailures).toBe(1);
    });
  });

  describe('publishMany', () => {
    it('should publish multiple events successfully', async () => {
      const events = [
        new TestEvent('test-id-1'),
        new TestEvent('test-id-2'),
        new AnotherTestEvent('test-id-3'),
      ];

      const result = await eventBus.publishMany(events);

      expect(result.isOk()).toBe(true);
      expect(eventBus.getEventHistory()).toHaveLength(3);
    });

    it('should handle partial failures', async () => {
      const validEvent = new TestEvent('test-id');
      const invalidEvent = {
        eventType: '',
        eventId: '',
        aggregateId: '',
        aggregateType: '',
        occurredAt: null,
      } as unknown as DomainEvent;

      const result = await eventBus.publishMany([validEvent, invalidEvent]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(EventBusErrorCode.PUBLICATION_FAILED);
      }
    });
  });

  describe('subscribe', () => {
    it('should successfully subscribe to event type', () => {
      const handler: EventHandler<TestEvent> = vi.fn();
      const result = eventBus.subscribe('test-event', handler);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeDefined();
      }
      expect(eventBus.getSubscriptionCount('test-event')).toBe(1);
    });

    it('should reject invalid subscription parameters', () => {
      const result1 = eventBus.subscribe('', vi.fn());
      const result2 = eventBus.subscribe('test-event', null as any);

      expect(result1.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.error.code).toBe(EventBusErrorCode.SUBSCRIPTION_FAILED);
      }
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe(EventBusErrorCode.SUBSCRIPTION_FAILED);
      }
    });

    it('should allow multiple handlers for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const result1 = eventBus.subscribe('test-event', handler1);
      const result2 = eventBus.subscribe('test-event', handler2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(eventBus.getSubscriptionCount('test-event')).toBe(2);
      expect(eventBus.getSubscriptionCount()).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should successfully unsubscribe from event type', () => {
      const handler = vi.fn();
      const subscribeResult = eventBus.subscribe('test-event', handler);
      expect(subscribeResult.isOk()).toBe(true);

      const subscriptionId = subscribeResult.isOk() ? subscribeResult.value : '';
      const unsubscribeResult = eventBus.unsubscribe(subscriptionId);

      expect(unsubscribeResult.isOk()).toBe(true);
      expect(eventBus.getSubscriptionCount('test-event')).toBe(0);
      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should return error for non-existent subscription', () => {
      const result = eventBus.unsubscribe('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(EventBusErrorCode.SUBSCRIPTION_NOT_FOUND);
      }
    });

    it('should not execute unsubscribed handlers', async () => {
      const handler = vi.fn();
      const event = new TestEvent('test-id');

      const subscribeResult = eventBus.subscribe('test-event', handler);
      expect(subscribeResult.isOk()).toBe(true);

      const unsubscribeResult = eventBus.unsubscribe(
        subscribeResult.isOk() ? subscribeResult.value : '',
      );
      expect(unsubscribeResult.isOk()).toBe(true);

      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all subscriptions and event history', async () => {
      const handler = vi.fn();
      const event = new TestEvent('test-id');

      eventBus.subscribe('test-event', handler);
      await eventBus.publish(event);

      expect(eventBus.getSubscriptionCount()).toBe(1);
      expect(eventBus.getEventHistory()).toHaveLength(1);

      const result = await eventBus.clear();

      expect(result.isOk()).toBe(true);
      expect(eventBus.getSubscriptionCount()).toBe(0);
      expect(eventBus.getEventHistory()).toHaveLength(0);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(0);
      expect(metrics.totalHandlersExecuted).toBe(0);
      expect(metrics.activeSubscriptions).toBe(0);
    });
  });

  describe('getEventHistory', () => {
    it('should return all events when no limit specified', async () => {
      const events = [
        new TestEvent('test-id-1'),
        new TestEvent('test-id-2'),
        new TestEvent('test-id-3'),
      ];

      for (const event of events) {
        await eventBus.publish(event);
      }

      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(3);
      expect(history).toEqual(events);
    });

    it('should return limited events when limit specified', async () => {
      const events = [
        new TestEvent('test-id-1'),
        new TestEvent('test-id-2'),
        new TestEvent('test-id-3'),
      ];

      for (const event of events) {
        await eventBus.publish(event);
      }

      const history = eventBus.getEventHistory(2);
      expect(history).toHaveLength(2);
      expect(history[0]).toBe(events[1]);
      expect(history[1]).toBe(events[2]);
    });

    it('should respect maximum event history configuration', async () => {
      const config = createDefaultEventBusConfig();
      config.maxEventHistory = 2;
      const limitedEventBus = new DomainEventBus(config);

      const events = [
        new TestEvent('test-id-1'),
        new TestEvent('test-id-2'),
        new TestEvent('test-id-3'),
      ];

      for (const event of events) {
        await limitedEventBus.publish(event);
      }

      const history = limitedEventBus.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toBe(events[1]);
      expect(history[1]).toBe(events[2]);
    });
  });

  describe('isHealthy', () => {
    it('should return true for a healthy event bus', () => {
      expect(eventBus.isHealthy()).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should track metrics correctly', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn().mockRejectedValue(new Error('Failed'));
      const event = new TestEvent('test-id');

      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);

      await eventBus.publish(event);
      await eventBus.publish(event);

      const metrics = eventBus.getMetrics();
      expect(metrics.totalEventsPublished).toBe(2);
      expect(metrics.totalHandlersExecuted).toBe(4);
      expect(metrics.totalHandlerFailures).toBe(2);
      expect(metrics.activeSubscriptions).toBe(2);
      expect(metrics.eventHistorySize).toBe(2);
      expect(metrics.lastEventPublishedAt).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive publications', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test-event', handler);

      const events = Array.from({ length: 100 }, (_, i) => new TestEvent(`test-id-${i}`));
      const publishPromises = events.map((event) => eventBus.publish(event));

      const results = await Promise.all(publishPromises);

      expect(results.every((result) => result.isOk())).toBe(true);
      expect(handler).toHaveBeenCalledTimes(100);
      expect(eventBus.getEventHistory()).toHaveLength(100);
    });

    it('should handle handlers that return void vs Promise<void>', async () => {
      const syncHandler = vi.fn();
      const asyncHandler = vi.fn().mockResolvedValue(undefined);
      const event = new TestEvent('test-id');

      eventBus.subscribe('test-event', syncHandler);
      eventBus.subscribe('test-event', asyncHandler);

      const result = await eventBus.publish(event);

      expect(result.isOk()).toBe(true);
      expect(syncHandler).toHaveBeenCalledTimes(1);
      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });
  });
});
