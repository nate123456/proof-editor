import { describe, expect, it } from 'vitest';

import {
  AggregateRoot,
  DomainEvent,
  type DomainEventHandler,
  type EventDispatcher,
  type EventStore,
} from '../base-event.js';

class TestEvent extends DomainEvent {
  readonly eventType = 'test-event';
  readonly eventData = { testProperty: 'test-value' };
}

class TestAggregateRoot extends AggregateRoot {
  private readonly id: string;

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

  it('should handle events added after marking as committed', () => {
    const aggregate = new TestAggregateRoot('test-123');
    aggregate.addTestEvent();
    aggregate.markEventsAsCommitted();

    // Add new events after commit
    aggregate.addTestEvent();
    aggregate.addTestEvent();

    expect(aggregate.hasUncommittedEvents()).toBe(true);
    expect(aggregate.getUncommittedEvents()).toHaveLength(2);
  });

  it('should handle multiple commit cycles', () => {
    const aggregate = new TestAggregateRoot('test-123');

    // First cycle
    aggregate.addTestEvent();
    expect(aggregate.getUncommittedEvents()).toHaveLength(1);
    aggregate.markEventsAsCommitted();
    expect(aggregate.getUncommittedEvents()).toHaveLength(0);

    // Second cycle
    aggregate.addTestEvent();
    aggregate.addTestEvent();
    expect(aggregate.getUncommittedEvents()).toHaveLength(2);
    aggregate.markEventsAsCommitted();
    expect(aggregate.getUncommittedEvents()).toHaveLength(0);
  });

  it('should preserve event order in uncommitted events', () => {
    const aggregate = new TestAggregateRoot('test-123');

    // Add events with different data to verify order
    const _event1Timestamp = Date.now();
    aggregate.addTestEvent();

    const _event2Timestamp = Date.now() + 1;
    aggregate.addTestEvent();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(2);
    expect(events[0]?.occurredAt.getValue()).toBeLessThanOrEqual(
      events[1]?.occurredAt.getValue() || 0,
    );
  });
});

describe('DomainEvent edge cases and advanced scenarios', () => {
  it('should handle events with complex event data', () => {
    class ComplexEvent extends DomainEvent {
      readonly eventType = 'complex-event';
      readonly eventData = {
        stringField: 'test-string',
        numberField: 42,
        booleanField: true,
        arrayField: [1, 2, 3],
        objectField: { nested: 'value' },
        nullField: null,
        undefinedField: undefined,
      };
    }

    const event = new ComplexEvent('agg-123', 'test-aggregate');
    const record = event.toEventRecord();

    expect(record.eventData.stringField).toBe('test-string');
    expect(record.eventData.numberField).toBe(42);
    expect(record.eventData.booleanField).toBe(true);
    expect(record.eventData.arrayField).toEqual([1, 2, 3]);
    expect(record.eventData.objectField).toEqual({ nested: 'value' });
    expect(record.eventData.nullField).toBe(null);
    expect(record.eventData.undefinedField).toBeUndefined();
  });

  it('should handle events with different aggregate types', () => {
    const proofEvent = new TestEvent('proof-1', 'proof-aggregate');
    const statementEvent = new TestEvent('stmt-1', 'statement-aggregate');
    const treeEvent = new TestEvent('tree-1', 'tree-aggregate');

    expect(proofEvent.aggregateType).toBe('proof-aggregate');
    expect(statementEvent.aggregateType).toBe('statement-aggregate');
    expect(treeEvent.aggregateType).toBe('tree-aggregate');

    // Verify each has unique event ID
    expect(proofEvent.eventId).not.toBe(statementEvent.eventId);
    expect(statementEvent.eventId).not.toBe(treeEvent.eventId);
    expect(proofEvent.eventId).not.toBe(treeEvent.eventId);
  });

  it('should handle events with high version numbers', () => {
    const highVersionEvent = new TestEvent('agg-1', 'test-aggregate', 999999);

    expect(highVersionEvent.eventVersion).toBe(999999);

    const record = highVersionEvent.toEventRecord();
    expect(record.eventVersion).toBe(999999);
  });

  it('should handle events with zero version', () => {
    const zeroVersionEvent = new TestEvent('agg-1', 'test-aggregate', 0);

    expect(zeroVersionEvent.eventVersion).toBe(0);

    const record = zeroVersionEvent.toEventRecord();
    expect(record.eventVersion).toBe(0);
  });

  it('should handle events with negative version numbers', () => {
    const negativeVersionEvent = new TestEvent('agg-1', 'test-aggregate', -1);

    expect(negativeVersionEvent.eventVersion).toBe(-1);

    const record = negativeVersionEvent.toEventRecord();
    expect(record.eventVersion).toBe(-1);
  });

  it('should handle event record conversion with special characters', () => {
    class SpecialCharEvent extends DomainEvent {
      readonly eventType = 'special-char-event';
      readonly eventData = {
        specialChars: 'Test with "quotes", \'apostrophes\', \nnewlines\t and unicode: 🚨',
        emptyString: '',
        whitespace: '   ',
      };
    }

    const event = new SpecialCharEvent('agg-with-special-chars-123', 'test-aggregate');
    const record = event.toEventRecord();

    expect(record.eventData.specialChars).toBe(
      'Test with "quotes", \'apostrophes\', \nnewlines\t and unicode: 🚨',
    );
    expect(record.eventData.emptyString).toBe('');
    expect(record.eventData.whitespace).toBe('   ');
    expect(record.aggregateId).toBe('agg-with-special-chars-123');
  });

  it('should handle events with circular reference protection', () => {
    class CircularRefEvent extends DomainEvent {
      readonly eventType = 'circular-ref-event';
      readonly eventData: Record<string, unknown>;

      constructor(aggregateId: string, aggregateType: string) {
        super(aggregateId, aggregateType);

        // Create an object that references itself (JSON.stringify handles this gracefully)
        const selfRef: any = { type: 'self-reference' };
        selfRef.self = selfRef;

        this.eventData = {
          circularRef: selfRef,
          normalData: 'normal-value',
        };
      }
    }

    const event = new CircularRefEvent('agg-123', 'test-aggregate');

    // The event should be created successfully
    expect(event).toBeInstanceOf(CircularRefEvent);
    expect(event.eventData.normalData).toBe('normal-value');

    // Converting to event record should work (circular refs are handled by JSON.stringify)
    const record = event.toEventRecord();
    expect(record.eventData.normalData).toBe('normal-value');
  });

  it('should handle timestamp edge cases', () => {
    const startTime = Date.now();
    const event = new TestEvent('agg-123', 'test-aggregate');
    const endTime = Date.now();

    // Event timestamp should be within the creation window
    expect(event.occurredAt.getValue()).toBeGreaterThanOrEqual(startTime);
    expect(event.occurredAt.getValue()).toBeLessThanOrEqual(endTime);

    const record = event.toEventRecord();
    expect(record.occurredAt).toBe(event.occurredAt.getValue());
  });

  it('should handle events with empty string aggregate IDs', () => {
    const event = new TestEvent('', 'test-aggregate');

    expect(event.aggregateId).toBe('');
    expect(event.aggregateType).toBe('test-aggregate');

    const record = event.toEventRecord();
    expect(record.aggregateId).toBe('');
  });

  it('should handle events with empty string aggregate types', () => {
    const event = new TestEvent('agg-123', '');

    expect(event.aggregateId).toBe('agg-123');
    expect(event.aggregateType).toBe('');

    const record = event.toEventRecord();
    expect(record.aggregateType).toBe('');
  });
});

describe('EventRecord interface compliance', () => {
  it('should create event records with all required fields', () => {
    const event = new TestEvent('agg-123', 'test-aggregate', 5);
    const record = event.toEventRecord();

    // Verify all EventRecord interface fields are present
    expect(typeof record.eventId).toBe('string');
    expect(typeof record.eventType).toBe('string');
    expect(typeof record.aggregateId).toBe('string');
    expect(typeof record.aggregateType).toBe('string');
    expect(typeof record.eventVersion).toBe('number');
    expect(typeof record.eventData).toBe('object');
    expect(typeof record.occurredAt).toBe('number');
    expect(typeof record.metadata).toBe('object');

    // Verify field values
    expect(record.eventId).toBe(event.eventId);
    expect(record.eventType).toBe('test-event');
    expect(record.aggregateId).toBe('agg-123');
    expect(record.aggregateType).toBe('test-aggregate');
    expect(record.eventVersion).toBe(5);
    expect(record.eventData).toEqual({ testProperty: 'test-value' });
    expect(record.occurredAt).toBe(event.occurredAt.getValue());
    expect(record.metadata).toEqual({});
  });

  it('should handle metadata with various data types', () => {
    class MetadataEvent extends TestEvent {
      protected override getMetadata(): Record<string, unknown> {
        return {
          string: 'metadata-value',
          number: 123,
          boolean: true,
          array: ['a', 'b', 'c'],
          object: { nested: 'metadata' },
          null: null,
          undefined: undefined,
        };
      }
    }

    const event = new MetadataEvent('agg-123', 'test-aggregate');
    const record = event.toEventRecord();

    expect(record.metadata.string).toBe('metadata-value');
    expect(record.metadata.number).toBe(123);
    expect(record.metadata.boolean).toBe(true);
    expect(record.metadata.array).toEqual(['a', 'b', 'c']);
    expect(record.metadata.object).toEqual({ nested: 'metadata' });
    expect(record.metadata.null).toBe(null);
    expect(record.metadata.undefined).toBeUndefined();
  });
});

describe('Domain Event Handler and Event Dispatcher interfaces', () => {
  it('should define proper DomainEventHandler interface structure', () => {
    // Test that the interface has the expected shape
    const mockHandler: DomainEventHandler<TestEvent> = {
      handle: async (event: TestEvent) => {
        expect(event).toBeInstanceOf(TestEvent);
      },
      canHandle: (event: DomainEvent): event is TestEvent => {
        return event instanceof TestEvent;
      },
    };

    expect(typeof mockHandler.handle).toBe('function');
    expect(typeof mockHandler.canHandle).toBe('function');
  });

  it('should define proper EventDispatcher interface structure', () => {
    // Test that the interface has the expected shape
    const mockDispatcher: EventDispatcher = {
      dispatch: async (_events: DomainEvent | DomainEvent[]) => {
        // Mock implementation
      },
      registerHandler: <T extends DomainEvent>(_handler: DomainEventHandler<T>) => {
        // Mock implementation
      },
      unregisterHandler: <T extends DomainEvent>(_handler: DomainEventHandler<T>) => {
        // Mock implementation
      },
    };

    expect(typeof mockDispatcher.dispatch).toBe('function');
    expect(typeof mockDispatcher.registerHandler).toBe('function');
    expect(typeof mockDispatcher.unregisterHandler).toBe('function');
  });

  it('should define proper EventStore interface structure', () => {
    // Test that the interface has the expected shape
    const mockEventStore: EventStore = {
      saveEvents: async (_events: DomainEvent[]) => {
        // Mock implementation
      },
      getEventsForAggregate: async (_aggregateId: string, _fromVersion?: number) => {
        return [];
      },
      getAllEvents: async (_fromTimestamp?: any) => {
        return [];
      },
    };

    expect(typeof mockEventStore.saveEvents).toBe('function');
    expect(typeof mockEventStore.getEventsForAggregate).toBe('function');
    expect(typeof mockEventStore.getAllEvents).toBe('function');
  });
});

describe('Advanced AggregateRoot scenarios', () => {
  it('should handle aggregate with custom domain event types', () => {
    class CustomEvent extends DomainEvent {
      readonly eventType = 'custom-event';
      readonly eventData = { customField: 'custom-value' };
    }

    class AdvancedAggregate extends AggregateRoot {
      private readonly id: string;

      constructor(id: string) {
        super();
        this.id = id;
      }

      addCustomEvent(): void {
        this.addDomainEvent(new CustomEvent(this.id, 'advanced-aggregate'));
      }

      addMultipleEvents(): void {
        this.addDomainEvent(new CustomEvent(this.id, 'advanced-aggregate'));
        this.addDomainEvent(new TestEvent(this.id, 'advanced-aggregate'));
        this.addDomainEvent(new CustomEvent(this.id, 'advanced-aggregate'));
      }
    }

    const aggregate = new AdvancedAggregate('advanced-123');
    aggregate.addMultipleEvents();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(3);
    expect(events[0]).toBeInstanceOf(CustomEvent);
    expect(events[1]).toBeInstanceOf(TestEvent);
    expect(events[2]).toBeInstanceOf(CustomEvent);
  });

  it('should handle large numbers of events efficiently', () => {
    const aggregate = new TestAggregateRoot('stress-test');
    const eventCount = 1000;

    // Add many events
    for (let i = 0; i < eventCount; i++) {
      aggregate.addTestEvent();
    }

    expect(aggregate.getUncommittedEvents()).toHaveLength(eventCount);
    expect(aggregate.hasUncommittedEvents()).toBe(true);

    // Clear all events
    aggregate.markEventsAsCommitted();

    expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    expect(aggregate.hasUncommittedEvents()).toBe(false);
  });

  it('should return array copies that dont affect internal state', () => {
    const aggregate = new TestAggregateRoot('immutable-test');
    aggregate.addTestEvent();
    aggregate.addTestEvent();

    const events1 = aggregate.getUncommittedEvents();
    const events2 = aggregate.getUncommittedEvents();

    // Arrays should be different instances (copies)
    expect(events1).not.toBe(events2);
    expect(events1).toEqual(events2);

    // Modifying returned array should not affect internal state
    events1.pop(); // Remove one event from the copy
    expect(events1).toHaveLength(1);

    // Internal state should be unchanged
    const eventsAfter = aggregate.getUncommittedEvents();
    expect(eventsAfter).toHaveLength(2);
    expect(aggregate.hasUncommittedEvents()).toBe(true);
  });
});
