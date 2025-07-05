import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent } from '../../../domain/events/base-event.js';
import { OrderedSetBecameShared } from '../../../domain/events/proof-document-events.js';
import { Timestamp } from '../../../domain/shared/value-objects.js';
import { ConnectionTracker } from '../ConnectionTracker.js';

describe('ConnectionTracker', () => {
  let tracker: ConnectionTracker;

  beforeEach(() => {
    tracker = new ConnectionTracker();
  });

  describe('event handling', () => {
    it('should handle OrderedSetBecameShared events', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg2']);
    });

    it('should handle events with malformed usage strings', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'invalid-usage', 'arg2:conclusion'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1', 'invalid-usage', 'arg2']);
    });

    it('should handle events with empty usage strings', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['', 'arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg2']);
    });

    it('should handle events with duplicate argument IDs', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg1:conclusion', 'arg2:premise'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg2']);
    });

    it('should update existing connections when receiving new events', () => {
      const event1 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg3:conclusion'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg3']);
    });
  });

  describe('canHandle', () => {
    it('should return true for OrderedSetBecameShared events', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise'],
      });

      expect(tracker.canHandle(event)).toBe(true);
    });

    it('should return false for other event types', () => {
      const mockEvent = {
        eventId: 'event-1',
        eventType: 'StatementCreated',
        aggregateId: 'doc-1',
        aggregateType: 'ProofDocument',
        eventVersion: 1,
        eventData: {},
        occurredAt: Timestamp.now(),
        metadata: {},
        toEventRecord: () => ({
          eventId: 'event-1',
          eventType: 'StatementCreated',
          aggregateId: 'doc-1',
          aggregateType: 'ProofDocument',
          eventVersion: 1,
          eventData: {},
          occurredAt: Timestamp.now().getValue(),
          metadata: {},
        }),
        getMetadata: () => ({}),
      } as unknown as DomainEvent;

      expect(tracker.canHandle(mockEvent)).toBe(false);
    });
  });

  describe('getSharedConnections', () => {
    it('should return empty array for non-existent OrderedSet', () => {
      expect(tracker.getSharedConnections('non-existent')).toEqual([]);
    });

    it('should return connections for existing OrderedSet', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg2']);
    });
  });

  describe('getAllSharedOrderedSets', () => {
    it('should return empty array when no shared sets exist', () => {
      expect(tracker.getAllSharedOrderedSets()).toEqual([]);
    });

    it('should return all shared OrderedSet IDs', () => {
      const event1 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-2',
        usages: ['arg3:premise', 'arg4:conclusion'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      expect(tracker.getAllSharedOrderedSets()).toEqual(['set-1', 'set-2']);
    });
  });

  describe('isOrderedSetShared', () => {
    it('should return false for non-existent OrderedSet', () => {
      expect(tracker.isOrderedSetShared('non-existent')).toBe(false);
    });

    it('should return false for OrderedSet with single connection', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise'],
      });

      tracker.handle(event);

      expect(tracker.isOrderedSetShared('set-1')).toBe(false);
    });

    it('should return true for OrderedSet with multiple connections', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);

      expect(tracker.isOrderedSetShared('set-1')).toBe(true);
    });
  });

  describe('getConnectionGraph', () => {
    it('should return empty array when no connections exist', () => {
      expect(tracker.getConnectionGraph()).toEqual([]);
    });

    it('should return connection graph data', () => {
      const event1 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-2',
        usages: ['arg3:premise', 'arg4:conclusion', 'arg5:conclusion'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const graph = tracker.getConnectionGraph();

      expect(graph).toHaveLength(2);
      expect(graph[0]).toEqual({
        orderedSetId: 'set-1',
        connectedArguments: ['arg1', 'arg2'],
        connectionCount: 2,
      });
      expect(graph[1]).toEqual({
        orderedSetId: 'set-2',
        connectedArguments: ['arg3', 'arg4', 'arg5'],
        connectionCount: 3,
      });
    });
  });

  describe('findConnectedArguments', () => {
    it('should return empty array for non-connected argument', () => {
      expect(tracker.findConnectedArguments('arg1')).toEqual([]);
    });

    it('should return connected arguments', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion', 'arg3:premise'],
      });

      tracker.handle(event);

      const connected = tracker.findConnectedArguments('arg1');

      expect(connected).toEqual([
        { argumentId: 'arg2', viaOrderedSetId: 'set-1' },
        { argumentId: 'arg3', viaOrderedSetId: 'set-1' },
      ]);
    });

    it('should return connections via multiple OrderedSets', () => {
      const event1 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-2',
        usages: ['arg1:conclusion', 'arg3:premise'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const connected = tracker.findConnectedArguments('arg1');

      expect(connected).toEqual([
        { argumentId: 'arg2', viaOrderedSetId: 'set-1' },
        { argumentId: 'arg3', viaOrderedSetId: 'set-2' },
      ]);
    });

    it('should not return the argument itself', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg1:conclusion'],
      });

      tracker.handle(event);

      const connected = tracker.findConnectedArguments('arg1');

      expect(connected).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all tracked connections', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      tracker.handle(event);
      expect(tracker.getAllSharedOrderedSets()).toHaveLength(1);

      tracker.clear();
      expect(tracker.getAllSharedOrderedSets()).toHaveLength(0);
    });
  });

  describe('getConnectionStats', () => {
    it('should return zero stats when no connections exist', () => {
      const stats = tracker.getConnectionStats();

      expect(stats).toEqual({
        totalSharedSets: 0,
        totalConnectedArguments: 0,
        averageConnectionsPerSet: 0,
        maxConnectionsInSingleSet: 0,
      });
    });

    it('should return correct statistics', () => {
      const event1 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-2',
        usages: ['arg3:premise', 'arg4:conclusion', 'arg5:conclusion'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const stats = tracker.getConnectionStats();

      expect(stats).toEqual({
        totalSharedSets: 2,
        totalConnectedArguments: 5,
        averageConnectionsPerSet: 2.5,
        maxConnectionsInSingleSet: 3,
      });
    });

    it('should handle duplicate arguments across sets correctly', () => {
      const event1 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      const event2 = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-2',
        usages: ['arg1:conclusion', 'arg3:premise'],
      });

      tracker.handle(event1);
      tracker.handle(event2);

      const stats = tracker.getConnectionStats();

      expect(stats).toEqual({
        totalSharedSets: 2,
        totalConnectedArguments: 3, // arg1, arg2, arg3 (unique count)
        averageConnectionsPerSet: 2,
        maxConnectionsInSingleSet: 2,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle events with empty usages array', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: [],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual([]);
      expect(tracker.isOrderedSetShared('set-1')).toBe(false);
    });

    it('should handle events with null/undefined argument IDs', () => {
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: [':premise', 'arg1:conclusion'],
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toEqual(['arg1']);
    });

    it('should handle very large connection sets', () => {
      const usages = Array.from({ length: 1000 }, (_, i) => `arg${i}:premise`);
      const event = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages,
      });

      tracker.handle(event);

      expect(tracker.getSharedConnections('set-1')).toHaveLength(1000);
      expect(tracker.getConnectionStats().maxConnectionsInSingleSet).toBe(1000);
    });
  });
});
