import { describe, expect, it } from 'vitest';

import { AggregateRoot, DomainEvent } from '../base-event.js';

class TestEvent extends DomainEvent {
  readonly eventType = 'test-event';
  readonly eventData = { testProperty: 'test-value' };

  constructor(aggregateId: string, aggregateType: string, eventVersion?: number) {
    super(aggregateId, aggregateType, eventVersion);
  }
}

class TestAggregateRoot extends AggregateRoot {
  private id: string;

  constructor(id: string) {
    super();
    this.id = id;
  }

  addTestEvent(): void {
    this.addDomainEvent(new TestEvent(this.id, 'test-aggregate'));
  }
}

describe('DomainEvent', () => {
  it('should create event with unique ID and timestamp', () => {
    const event = new TestEvent('agg-123', 'test-aggregate');

    expect(event.eventId).toBeDefined();
    expect(event.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(event.aggregateId).toBe('agg-123');
    expect(event.aggregateType).toBe('test-aggregate');
    expect(event.eventVersion).toBe(1);
    expect(event.occurredAt).toBeDefined();
  });

  it('should accept custom event version', () => {
    const event = new TestEvent('agg-123', 'test-aggregate', 5);

    expect(event.eventVersion).toBe(5);
  });

  it('should create unique event IDs for different events', () => {
    const event1 = new TestEvent('agg-123', 'test-aggregate');
    const event2 = new TestEvent('agg-123', 'test-aggregate');

    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('should create event record with all properties', () => {
    const event = new TestEvent('agg-123', 'test-aggregate');
    const record = event.toEventRecord();

    expect(record.eventId).toBe(event.eventId);
    expect(record.eventType).toBe('test-event');
    expect(record.aggregateId).toBe('agg-123');
    expect(record.aggregateType).toBe('test-aggregate');
    expect(record.eventVersion).toBe(1);
    expect(record.eventData).toEqual({ testProperty: 'test-value' });
    expect(record.occurredAt).toBe(event.occurredAt.getValue());
    expect(record.metadata).toEqual({});
  });

  it('should include metadata in event record', () => {
    class TestEventWithMetadata extends TestEvent {
      protected override getMetadata(): Record<string, unknown> {
        return { source: 'test', version: '1.0' };
      }
    }

    const event = new TestEventWithMetadata('agg-123', 'test-aggregate');
    const record = event.toEventRecord();

    expect(record.metadata).toEqual({ source: 'test', version: '1.0' });
  });
});

describe('AggregateRoot', () => {
  it('should start with no uncommitted events', () => {
    const aggregate = new TestAggregateRoot('test-123');

    expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    expect(aggregate.hasUncommittedEvents()).toBe(false);
  });

  it('should track uncommitted events', () => {
    const aggregate = new TestAggregateRoot('test-123');
    aggregate.addTestEvent();

    expect(aggregate.getUncommittedEvents()).toHaveLength(1);
    expect(aggregate.hasUncommittedEvents()).toBe(true);
    expect(aggregate.getUncommittedEvents()[0]).toBeInstanceOf(TestEvent);
  });

  it('should return copy of uncommitted events', () => {
    const aggregate = new TestAggregateRoot('test-123');
    aggregate.addTestEvent();

    const events1 = aggregate.getUncommittedEvents();
    const events2 = aggregate.getUncommittedEvents();

    expect(events1).not.toBe(events2);
    expect(events1).toEqual(events2);
  });

  it('should clear uncommitted events when marked as committed', () => {
    const aggregate = new TestAggregateRoot('test-123');
    aggregate.addTestEvent();
    aggregate.addTestEvent();

    expect(aggregate.hasUncommittedEvents()).toBe(true);
    expect(aggregate.getUncommittedEvents()).toHaveLength(2);

    aggregate.markEventsAsCommitted();

    expect(aggregate.hasUncommittedEvents()).toBe(false);
    expect(aggregate.getUncommittedEvents()).toHaveLength(0);
  });

  it('should accumulate multiple events', () => {
    const aggregate = new TestAggregateRoot('test-123');
    aggregate.addTestEvent();
    aggregate.addTestEvent();
    aggregate.addTestEvent();

    expect(aggregate.getUncommittedEvents()).toHaveLength(3);
    expect(aggregate.hasUncommittedEvents()).toBe(true);
  });
});
