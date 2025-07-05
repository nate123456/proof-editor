import { beforeEach, describe, expect, test } from 'vitest';
import type { DomainEvent } from '../../../domain/events/base-event.js';
import { OrderedSetBecameShared } from '../../../domain/events/proof-document-events.js';
import { Timestamp } from '../../../domain/shared/value-objects.js';
import { ConnectionTracker } from '../ConnectionTracker.js';

describe('ConnectionTracker - Enhanced Coverage', () => {
  let tracker: ConnectionTracker;

  beforeEach(() => {
    tracker = new ConnectionTracker();
  });

  describe('handle method edge cases', () => {
    test('handles event with empty usages array', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: [],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('os1')).toEqual([]);
      expect(tracker.isOrderedSetShared('os1')).toBe(false);
    });

    test('handles event with single usage (not technically shared)', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('os1')).toEqual(['arg1']);
      expect(tracker.isOrderedSetShared('os1')).toBe(false); // Only 1 connection, not shared
    });

    test('handles usages with malformed format (missing colon)', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1', 'arg2:premise', 'arg3'],
      });

      tracker.handle(event);

      // Should extract argument IDs properly even from malformed entries
      const connections = tracker.getSharedConnections('os1');
      expect(connections).toContain('arg1'); // No colon - takes whole string
      expect(connections).toContain('arg2'); // With colon - takes part before colon
      expect(connections).toContain('arg3'); // No colon - takes whole string
      expect(tracker.isOrderedSetShared('os1')).toBe(true);
    });

    test('handles usages with empty argument IDs', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: [':premise', 'arg1:conclusion', ':conclusion'],
      });

      tracker.handle(event);

      const connections = tracker.getSharedConnections('os1');
      expect(connections).toEqual(['arg1']); // Empty strings filtered out
      expect(tracker.isOrderedSetShared('os1')).toBe(false); // Only one valid connection
    });

    test('handles duplicate argument IDs in usages', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg1:conclusion', 'arg2:premise'],
      });

      tracker.handle(event);

      const connections = tracker.getSharedConnections('os1');
      expect(connections).toHaveLength(2); // Set deduplicates
      expect(connections).toContain('arg1');
      expect(connections).toContain('arg2');
      expect(tracker.isOrderedSetShared('os1')).toBe(true);
    });

    test('handles multiple events for same OrderedSet (overwrite behavior)', () => {
      const event1 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg3:premise', 'arg4:conclusion'],
      });

      tracker.handle(event1);
      expect(tracker.getSharedConnections('os1')).toEqual(['arg1', 'arg2']);

      tracker.handle(event2);
      expect(tracker.getSharedConnections('os1')).toEqual(['arg3', 'arg4']); // Overwritten
    });

    test('handles events with special characters in IDs', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os-1_special@chars',
        usages: ['arg-1@test:premise', 'arg_2#special:conclusion'],
      });

      tracker.handle(event);

      const connections = tracker.getSharedConnections('os-1_special@chars');
      expect(connections).toContain('arg-1@test');
      expect(connections).toContain('arg_2#special');
    });
  });

  describe('canHandle method edge cases', () => {
    test('throws for null event', () => {
      expect(() => tracker.canHandle(null as any)).toThrow();
    });

    test('throws for undefined event', () => {
      expect(() => tracker.canHandle(undefined as any)).toThrow();
    });

    test('returns false for event without eventType', () => {
      const event = {} as DomainEvent;
      const result = tracker.canHandle(event);
      expect(result).toBe(false);
    });

    test('returns false for different event types', () => {
      class MockEvent extends DomainEvent {
        readonly eventType = 'SomeOtherEvent';
        readonly eventData = {};

        constructor() {
          super('test', 'TestAggregate', 1);
        }
      }

      const mockEvent = new MockEvent();

      const result = tracker.canHandle(mockEvent);
      expect(result).toBe(false);
    });

    test('returns true for OrderedSetBecameShared event', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise'],
      });

      const result = tracker.canHandle(event);
      expect(result).toBe(true);
    });

    test('returns true even for malformed OrderedSetBecameShared event', () => {
      const event = {
        eventType: 'OrderedSetBecameShared',
        aggregateId: 'test',
        context: 'test',
        occurredAt: Date.now(),
        eventData: null, // Malformed data
      } as any;

      const result = tracker.canHandle(event);
      expect(result).toBe(true); // Type guard only checks eventType
    });
  });

  describe('getSharedConnections edge cases', () => {
    test('returns empty array for non-existent OrderedSet', () => {
      const result = tracker.getSharedConnections('nonexistent');
      expect(result).toEqual([]);
    });

    test('returns empty array after clear', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);
      expect(tracker.getSharedConnections('os1')).toHaveLength(2);

      tracker.clear();
      expect(tracker.getSharedConnections('os1')).toEqual([]);
    });

    test('handles rapid successive calls consistently', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      // Call multiple times rapidly
      const results = Array.from({ length: 100 }, () => tracker.getSharedConnections('os1'));

      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual(['arg1', 'arg2']);
      });
    });
  });

  describe('findConnectedArguments edge cases', () => {
    test('returns empty array for non-existent argument', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      const result = tracker.findConnectedArguments('nonexistent');
      expect(result).toEqual([]);
    });

    test('returns empty array for argument with no connections', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['lonelyArg:premise'],
      });

      tracker.handle(event);

      const result = tracker.findConnectedArguments('lonelyArg');
      expect(result).toEqual([]);
    });

    test('finds connections across multiple OrderedSets', () => {
      const event1 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os2',
        usages: ['arg1:conclusion', 'arg3:premise'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const result = tracker.findConnectedArguments('arg1');
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ argumentId: 'arg2', viaOrderedSetId: 'os1' });
      expect(result).toContainEqual({ argumentId: 'arg3', viaOrderedSetId: 'os2' });
    });

    test('handles complex connection graphs', () => {
      // Create a complex graph: arg1 connects to arg2,arg3 via os1, and to arg4,arg5 via os2
      const event1 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion', 'arg3:premise'],
      });

      const event2 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os2',
        usages: ['arg1:conclusion', 'arg4:premise', 'arg5:conclusion'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const result = tracker.findConnectedArguments('arg1');
      expect(result).toHaveLength(4);
      expect(result).toContainEqual({ argumentId: 'arg2', viaOrderedSetId: 'os1' });
      expect(result).toContainEqual({ argumentId: 'arg3', viaOrderedSetId: 'os1' });
      expect(result).toContainEqual({ argumentId: 'arg4', viaOrderedSetId: 'os2' });
      expect(result).toContainEqual({ argumentId: 'arg5', viaOrderedSetId: 'os2' });
    });

    test('excludes self from connections', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg1:conclusion', 'arg2:premise'], // arg1 appears twice
      });

      tracker.handle(event);

      const result = tracker.findConnectedArguments('arg1');
      expect(result).toHaveLength(1);
      expect(result[0]?.argumentId).toBe('arg2');
      expect(result.every((conn) => conn.argumentId !== 'arg1')).toBe(true);
    });
  });

  describe('getConnectionGraph edge cases', () => {
    test('returns empty array when no connections exist', () => {
      const result = tracker.getConnectionGraph();
      expect(result).toEqual([]);
    });

    test('handles single argument per OrderedSet', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['loneArg:premise'],
      });

      tracker.handle(event);

      const result = tracker.getConnectionGraph();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        orderedSetId: 'os1',
        connectedArguments: ['loneArg'],
        connectionCount: 1,
      });
    });

    test('maintains order of OrderedSets as they were processed', () => {
      const events = [
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os1',
          usages: ['arg1:premise', 'arg2:conclusion'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os2',
          usages: ['arg3:premise', 'arg4:conclusion'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os3',
          usages: ['arg5:premise', 'arg6:conclusion'],
        }),
      ];

      events.forEach((event) => tracker.handle(event));

      const result = tracker.getConnectionGraph();
      expect(result).toHaveLength(3);
      expect(result.map((item) => item.orderedSetId)).toEqual(['os1', 'os2', 'os3']);
    });

    test('includes correct connection counts', () => {
      const events = [
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'small',
          usages: ['arg1:premise', 'arg2:conclusion'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'large',
          usages: [
            'arg1:premise',
            'arg2:conclusion',
            'arg3:premise',
            'arg4:conclusion',
            'arg5:premise',
          ],
        }),
      ];

      events.forEach((event) => tracker.handle(event));

      const result = tracker.getConnectionGraph();
      const smallSet = result.find((item) => item.orderedSetId === 'small');
      const largeSet = result.find((item) => item.orderedSetId === 'large');

      expect(smallSet?.connectionCount).toBe(2);
      expect(largeSet?.connectionCount).toBe(5);
    });
  });

  describe('getConnectionStats edge cases', () => {
    test('returns zero stats for empty tracker', () => {
      const stats = tracker.getConnectionStats();
      expect(stats).toEqual({
        totalSharedSets: 0,
        totalConnectedArguments: 0,
        averageConnectionsPerSet: 0,
        maxConnectionsInSingleSet: 0,
      });
    });

    test('calculates stats correctly with overlapping arguments', () => {
      const events = [
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os1',
          usages: ['arg1:premise', 'arg2:conclusion'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os2',
          usages: ['arg1:conclusion', 'arg3:premise'], // arg1 appears in both
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os3',
          usages: ['arg4:premise', 'arg5:conclusion', 'arg6:premise'], // Largest set
        }),
      ];

      events.forEach((event) => tracker.handle(event));

      const stats = tracker.getConnectionStats();
      expect(stats.totalSharedSets).toBe(3);
      expect(stats.totalConnectedArguments).toBe(6); // Unique arguments: arg1, arg2, arg3, arg4, arg5, arg6 = 6 total
      expect(stats.averageConnectionsPerSet).toBeCloseTo(2.33, 1); // (2+2+3)/3
      expect(stats.maxConnectionsInSingleSet).toBe(3);
    });

    test('handles tracker with only single-argument sets', () => {
      const events = [
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os1',
          usages: ['arg1:premise'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'os2',
          usages: ['arg2:premise'],
        }),
      ];

      events.forEach((event) => tracker.handle(event));

      const stats = tracker.getConnectionStats();
      expect(stats.totalSharedSets).toBe(2);
      expect(stats.totalConnectedArguments).toBe(2);
      expect(stats.averageConnectionsPerSet).toBe(1);
      expect(stats.maxConnectionsInSingleSet).toBe(1);
    });

    test('updates stats correctly after clear', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);
      expect(tracker.getConnectionStats().totalSharedSets).toBe(1);

      tracker.clear();
      const stats = tracker.getConnectionStats();
      expect(stats).toEqual({
        totalSharedSets: 0,
        totalConnectedArguments: 0,
        averageConnectionsPerSet: 0,
        maxConnectionsInSingleSet: 0,
      });
    });
  });

  describe('getAllSharedOrderedSets edge cases', () => {
    test('returns empty array for empty tracker', () => {
      const result = tracker.getAllSharedOrderedSets();
      expect(result).toEqual([]);
    });

    test('returns all OrderedSet IDs in insertion order', () => {
      const events = [
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'third',
          usages: ['arg1:premise'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'first',
          usages: ['arg2:premise'],
        }),
        new OrderedSetBecameShared('testDoc', {
          orderedSetId: 'second',
          usages: ['arg3:premise'],
        }),
      ];

      events.forEach((event) => tracker.handle(event));

      const result = tracker.getAllSharedOrderedSets();
      expect(result).toEqual(['third', 'first', 'second']); // Insertion order preserved
    });

    test('returns unique OrderedSet IDs after overwriting', () => {
      const event1 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise'],
      });

      const event2 = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1', // Same ID
        usages: ['arg2:premise'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const result = tracker.getAllSharedOrderedSets();
      expect(result).toEqual(['os1']); // Only one instance
    });
  });

  describe('isOrderedSetShared edge cases', () => {
    test('returns false for non-existent OrderedSet', () => {
      const result = tracker.isOrderedSetShared('nonexistent');
      expect(result).toBe(false);
    });

    test('returns false for OrderedSet with single connection', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise'],
      });

      tracker.handle(event);

      const result = tracker.isOrderedSetShared('os1');
      expect(result).toBe(false); // Only 1 connection, not shared
    });

    test('returns true for OrderedSet with multiple connections', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      const result = tracker.isOrderedSetShared('os1');
      expect(result).toBe(true); // 2+ connections = shared
    });

    test('returns false after clear', () => {
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'os1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);
      expect(tracker.isOrderedSetShared('os1')).toBe(true);

      tracker.clear();
      expect(tracker.isOrderedSetShared('os1')).toBe(false);
    });
  });

  describe('performance and stress testing', () => {
    test('handles large number of connections efficiently', () => {
      const largeUsages = Array.from({ length: 1000 }, (_, i) => `arg${i}:premise`);
      const event = new OrderedSetBecameShared('testDoc', {
        orderedSetId: 'massive',
        usages: largeUsages,
      });

      const startTime = performance.now();
      tracker.handle(event);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(tracker.getSharedConnections('massive')).toHaveLength(1000);
      expect(tracker.isOrderedSetShared('massive')).toBe(true);
    });

    test('handles many OrderedSets efficiently', () => {
      const events = Array.from(
        { length: 100 },
        (_, i) =>
          new OrderedSetBecameShared('testDoc', {
            orderedSetId: `os${i}`,
            usages: [`arg${i}1:premise`, `arg${i}2:conclusion`],
          }),
      );

      const startTime = performance.now();
      events.forEach((event) => tracker.handle(event));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(tracker.getAllSharedOrderedSets()).toHaveLength(100);
      expect(tracker.getConnectionStats().totalSharedSets).toBe(100);
    });

    test('maintains performance with complex connection queries', () => {
      // Create complex interconnected graph
      const events = Array.from(
        { length: 50 },
        (_, i) =>
          new OrderedSetBecameShared('testDoc', {
            orderedSetId: `os${i}`,
            usages: [
              `centralArg:premise`, // All connect to central argument
              `arg${i}:conclusion`,
            ],
          }),
      );

      events.forEach((event) => tracker.handle(event));

      const startTime = performance.now();
      const connections = tracker.findConnectedArguments('centralArg');
      const graph = tracker.getConnectionGraph();
      const stats = tracker.getConnectionStats();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      expect(connections).toHaveLength(50); // Connected to all other args
      expect(graph).toHaveLength(50);
      expect(stats.totalSharedSets).toBe(50);
    });
  });

  describe('memory management', () => {
    test('clear method properly releases memory', () => {
      // Add many connections
      const events = Array.from(
        { length: 100 },
        (_, i) =>
          new OrderedSetBecameShared('testDoc', {
            orderedSetId: `os${i}`,
            usages: Array.from({ length: 10 }, (_, j) => `arg${i}_${j}:premise`),
          }),
      );

      events.forEach((event) => tracker.handle(event));
      expect(tracker.getAllSharedOrderedSets()).toHaveLength(100);

      tracker.clear();

      // Verify everything is cleared
      expect(tracker.getAllSharedOrderedSets()).toEqual([]);
      expect(tracker.getConnectionGraph()).toEqual([]);
      expect(tracker.getConnectionStats().totalSharedSets).toBe(0);
      expect(tracker.getSharedConnections('os1')).toEqual([]);
      expect(tracker.findConnectedArguments('arg1_1')).toEqual([]);
    });
  });
});
