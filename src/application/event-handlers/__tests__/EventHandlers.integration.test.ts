import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent, DomainEventHandler } from '../../../domain/events/base-event.js';
import {
  OrderedSetBecameShared,
  OrderedSetCreated,
  OrderedSetDeleted,
  StatementCreated,
  StatementDeleted,
} from '../../../domain/events/proof-document-events.js';
import { ConnectionTracker } from '../ConnectionTracker.js';
import { StatementUsageEventHandler, StatementUsageTracker } from '../StatementUsageTracker.js';

/**
 * Simple event dispatcher for testing event handler integration
 */
class TestEventDispatcher {
  private handlers: DomainEventHandler<any>[] = [];

  registerHandler<T extends DomainEvent>(handler: DomainEventHandler<T>): void {
    this.handlers.push(handler);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.canHandle(event)) {
        await handler.handle(event);
      }
    }
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }
}

describe('Event Handlers Integration', () => {
  let connectionTracker: ConnectionTracker;
  let statementTracker: StatementUsageTracker;
  let statementHandler: StatementUsageEventHandler;
  let eventDispatcher: TestEventDispatcher;

  beforeEach(() => {
    connectionTracker = new ConnectionTracker();
    statementTracker = new StatementUsageTracker();
    statementHandler = new StatementUsageEventHandler(statementTracker);
    eventDispatcher = new TestEventDispatcher();

    eventDispatcher.registerHandler(connectionTracker);
    eventDispatcher.registerHandler(statementHandler);
  });

  describe('complete proof document lifecycle', () => {
    it('should track statement usage and connections throughout document lifecycle', async () => {
      // Create statements
      const events = [
        new StatementCreated('doc-1', {
          statementId: 'stmt-1',
          content: 'All men are mortal',
        }),
        new StatementCreated('doc-1', {
          statementId: 'stmt-2',
          content: 'Socrates is a man',
        }),
        new StatementCreated('doc-1', {
          statementId: 'stmt-3',
          content: 'Socrates is mortal',
        }),
      ];

      await eventDispatcher.dispatchAll(events);

      // Verify initial state
      expect(statementTracker.getUsageCount('stmt-1')).toBe(0);
      expect(statementTracker.getUsageCount('stmt-2')).toBe(0);
      expect(statementTracker.getUsageCount('stmt-3')).toBe(0);
      expect(connectionTracker.getAllSharedOrderedSets()).toHaveLength(0);

      // Create OrderedSets to represent argument structure
      const setEvents = [
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'premise-set-1',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'conclusion-set-1',
          statementIds: ['stmt-3'],
        }),
      ];

      await eventDispatcher.dispatchAll(setEvents);

      // Verify usage tracking
      expect(statementTracker.getUsageCount('stmt-1')).toBe(1);
      expect(statementTracker.getUsageCount('stmt-2')).toBe(1);
      expect(statementTracker.getUsageCount('stmt-3')).toBe(1);

      // Create shared connections
      const connectionEvents = [
        new OrderedSetBecameShared('doc-1', {
          orderedSetId: 'premise-set-1',
          usages: ['arg1:premise', 'arg2:premise'],
        }),
        new OrderedSetBecameShared('doc-1', {
          orderedSetId: 'conclusion-set-1',
          usages: ['arg1:conclusion', 'arg3:premise'],
        }),
      ];

      await eventDispatcher.dispatchAll(connectionEvents);

      // Verify connection tracking
      expect(connectionTracker.isOrderedSetShared('premise-set-1')).toBe(true);
      expect(connectionTracker.isOrderedSetShared('conclusion-set-1')).toBe(true);
      expect(connectionTracker.getSharedConnections('premise-set-1')).toEqual(['arg1', 'arg2']);
      expect(connectionTracker.getSharedConnections('conclusion-set-1')).toEqual(['arg1', 'arg3']);

      // Find connected arguments
      const connectedToArg1 = connectionTracker.findConnectedArguments('arg1');
      expect(connectedToArg1).toEqual([
        { argumentId: 'arg2', viaOrderedSetId: 'premise-set-1' },
        { argumentId: 'arg3', viaOrderedSetId: 'conclusion-set-1' },
      ]);

      // Delete some elements
      const deleteEvents = [
        new OrderedSetDeleted('doc-1', {
          orderedSetId: 'premise-set-1',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
        new StatementDeleted('doc-1', {
          statementId: 'stmt-1',
          content: 'All men are mortal',
        }),
      ];

      await eventDispatcher.dispatchAll(deleteEvents);

      // Verify cleanup
      expect(statementTracker.getUsageCount('stmt-1')).toBe(0);
      expect(statementTracker.getUsageCount('stmt-2')).toBe(0);
      expect(statementTracker.getUsageCount('stmt-3')).toBe(1);
      expect(statementTracker.getStatementContent('stmt-1')).toBeUndefined();
      expect(statementTracker.getStatementContent('stmt-2')).toBe('Socrates is a man');
      expect(statementTracker.getStatementContent('stmt-3')).toBe('Socrates is mortal');

      // Connection tracking persists (as it's based on shared set events, not deletion events)
      expect(connectionTracker.isOrderedSetShared('premise-set-1')).toBe(true);
      expect(connectionTracker.isOrderedSetShared('conclusion-set-1')).toBe(true);
    });

    it('should handle complex argument reuse scenarios', async () => {
      // Create statements for a complex logical structure
      const statements = [
        new StatementCreated('doc-1', { statementId: 'stmt-1', content: 'P → Q' }),
        new StatementCreated('doc-1', { statementId: 'stmt-2', content: 'P' }),
        new StatementCreated('doc-1', { statementId: 'stmt-3', content: 'Q' }),
        new StatementCreated('doc-1', { statementId: 'stmt-4', content: 'Q → R' }),
        new StatementCreated('doc-1', { statementId: 'stmt-5', content: 'R' }),
      ];

      await eventDispatcher.dispatchAll(statements);

      // Create ordered sets for modus ponens chain: (P→Q, P) ⊢ Q, (Q→R, Q) ⊢ R
      const sets = [
        // First modus ponens
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'mp1-premise',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'mp1-conclusion',
          statementIds: ['stmt-3'],
        }),
        // Second modus ponens
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'mp2-premise',
          statementIds: ['stmt-4', 'stmt-3'], // stmt-3 reused
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'mp2-conclusion',
          statementIds: ['stmt-5'],
        }),
      ];

      await eventDispatcher.dispatchAll(sets);

      // Verify statement reuse tracking
      expect(statementTracker.getUsageCount('stmt-1')).toBe(1);
      expect(statementTracker.getUsageCount('stmt-2')).toBe(1);
      expect(statementTracker.getUsageCount('stmt-3')).toBe(2); // Used in both conclusions and premises
      expect(statementTracker.getUsageCount('stmt-4')).toBe(1);
      expect(statementTracker.getUsageCount('stmt-5')).toBe(1);

      const stats = statementTracker.getUsageStats();
      expect(stats.totalStatements).toBe(5);
      expect(stats.usedStatements).toBe(5);
      expect(stats.unusedStatements).toBe(0);
      expect(stats.maxUsage).toBe(2);
      expect(stats.totalUsages).toBe(6);

      // Create connections for the logical flow
      const connections = [
        new OrderedSetBecameShared('doc-1', {
          orderedSetId: 'mp1-conclusion',
          usages: ['arg1:conclusion', 'arg2:premise'],
        }),
      ];

      await eventDispatcher.dispatchAll(connections);

      // Verify connection tracking shows the logical flow
      expect(connectionTracker.isOrderedSetShared('mp1-conclusion')).toBe(true);
      expect(connectionTracker.findConnectedArguments('arg1')).toEqual([
        { argumentId: 'arg2', viaOrderedSetId: 'mp1-conclusion' },
      ]);
    });

    it('should handle rapid event sequences without data corruption', async () => {
      const events: DomainEvent[] = [];

      // Create many statements rapidly
      for (let i = 0; i < 50; i++) {
        events.push(
          new StatementCreated('doc-1', {
            statementId: `stmt-${i}`,
            content: `Statement ${i}`,
          }),
        );
      }

      // Create ordered sets that use random statements
      for (let i = 0; i < 20; i++) {
        const statementIds = Array.from(
          { length: Math.floor(Math.random() * 5) + 1 },
          (_, j) => `stmt-${(i + j) % 50}`,
        );
        events.push(
          new OrderedSetCreated('doc-1', {
            orderedSetId: `set-${i}`,
            statementIds,
          }),
        );
      }

      // Create connections
      for (let i = 0; i < 10; i++) {
        const usages = Array.from(
          { length: Math.floor(Math.random() * 4) + 2 },
          (_, j) => `arg${i * 2 + j}:${j % 2 === 0 ? 'premise' : 'conclusion'}`,
        );
        events.push(
          new OrderedSetBecameShared('doc-1', {
            orderedSetId: `set-${i}`,
            usages,
          }),
        );
      }

      // Process all events
      await eventDispatcher.dispatchAll(events);

      // Verify data integrity
      const stats = statementTracker.getUsageStats();
      expect(stats.totalStatements).toBe(50);
      expect(stats.totalUsages).toBeGreaterThan(0);

      const connectionStats = connectionTracker.getConnectionStats();
      expect(connectionStats.totalSharedSets).toBe(10);
      expect(connectionStats.totalConnectedArguments).toBeGreaterThan(0);

      // Verify no data corruption by checking a few specific items
      expect(statementTracker.getStatementContent('stmt-0')).toBe('Statement 0');
      expect(statementTracker.getStatementContent('stmt-49')).toBe('Statement 49');
      expect(statementTracker.getUsageCount('stmt-0')).toBeGreaterThanOrEqual(0);
    });

    it('should handle event processing errors gracefully', async () => {
      // Start with valid events
      const validEvents = [
        new StatementCreated('doc-1', {
          statementId: 'stmt-1',
          content: 'Valid statement',
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1'],
        }),
      ];

      await eventDispatcher.dispatchAll(validEvents);

      // Verify initial state
      expect(statementTracker.getUsageCount('stmt-1')).toBe(1);
      expect(statementTracker.getStatementContent('stmt-1')).toBe('Valid statement');

      // Process a problematic event (should not crash the handlers)
      const problematicEvent = {
        eventType: 'UnknownEventType',
        eventData: { invalid: 'data' },
        aggregateId: 'doc-1',
        aggregateType: 'ProofDocument',
        eventVersion: 1,
        eventId: 'event-1',
        occurredAt: Date.now(),
        metadata: {},
      } as unknown as DomainEvent;

      // Should not throw
      await expect(eventDispatcher.dispatch(problematicEvent)).resolves.toBeUndefined();

      // Previous state should remain intact
      expect(statementTracker.getUsageCount('stmt-1')).toBe(1);
      expect(statementTracker.getStatementContent('stmt-1')).toBe('Valid statement');

      // Continue with more valid events
      const moreValidEvents = [
        new StatementCreated('doc-1', {
          statementId: 'stmt-2',
          content: 'Another valid statement',
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-2',
          statementIds: ['stmt-1', 'stmt-2'],
        }),
      ];

      await eventDispatcher.dispatchAll(moreValidEvents);

      // Verify continued proper operation
      expect(statementTracker.getUsageCount('stmt-1')).toBe(2);
      expect(statementTracker.getUsageCount('stmt-2')).toBe(1);
      expect(statementTracker.getStatementContent('stmt-2')).toBe('Another valid statement');
    });
  });

  describe('event handler coordination', () => {
    it('should allow both handlers to process the same event types when applicable', async () => {
      // Only StatementUsageEventHandler should handle statement events
      const statementEvent = new StatementCreated('doc-1', {
        statementId: 'stmt-1',
        content: 'Test statement',
      });

      await eventDispatcher.dispatch(statementEvent);

      expect(statementTracker.getStatementContent('stmt-1')).toBe('Test statement');
      expect(connectionTracker.getAllSharedOrderedSets()).toHaveLength(0);

      // Only ConnectionTracker should handle connection events
      const connectionEvent = new OrderedSetBecameShared('doc-1', {
        orderedSetId: 'set-1',
        usages: ['arg1:premise', 'arg2:conclusion'],
      });

      await eventDispatcher.dispatch(connectionEvent);

      expect(connectionTracker.isOrderedSetShared('set-1')).toBe(true);
      expect(connectionTracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg2']);

      // StatementUsageEventHandler should handle ordered set events
      const orderedSetEvent = new OrderedSetCreated('doc-1', {
        orderedSetId: 'set-2',
        statementIds: ['stmt-1'],
      });

      await eventDispatcher.dispatch(orderedSetEvent);

      expect(statementTracker.getUsageCount('stmt-1')).toBe(1);
    });

    it('should maintain independent state between handlers', async () => {
      const events = [
        new StatementCreated('doc-1', {
          statementId: 'stmt-1',
          content: 'Shared statement',
        }),
        new OrderedSetCreated('doc-1', {
          orderedSetId: 'set-1',
          statementIds: ['stmt-1'],
        }),
        new OrderedSetBecameShared('doc-1', {
          orderedSetId: 'set-1',
          usages: ['arg1:premise', 'arg2:conclusion'],
        }),
      ];

      await eventDispatcher.dispatchAll(events);

      // Clear one handler's state
      statementTracker.clear();

      // Verify independence
      expect(statementTracker.getUsageCount('stmt-1')).toBe(0);
      expect(statementTracker.getStatementContent('stmt-1')).toBeUndefined();
      expect(connectionTracker.isOrderedSetShared('set-1')).toBe(true);
      expect(connectionTracker.getSharedConnections('set-1')).toEqual(['arg1', 'arg2']);

      // Clear the other handler's state
      connectionTracker.clear();

      // Verify complete independence
      expect(statementTracker.getUsageCount('stmt-1')).toBe(0);
      expect(connectionTracker.getAllSharedOrderedSets()).toHaveLength(0);
    });
  });

  describe('performance characteristics', () => {
    it('should handle large-scale event processing efficiently', async () => {
      const startTime = performance.now();

      const events: DomainEvent[] = [];

      // Create 1000 statements
      for (let i = 0; i < 1000; i++) {
        events.push(
          new StatementCreated('doc-1', {
            statementId: `stmt-${i}`,
            content: `Statement ${i}`,
          }),
        );
      }

      // Create 100 ordered sets with varying sizes
      for (let i = 0; i < 100; i++) {
        const statementIds = Array.from(
          { length: (i % 10) + 1 },
          (_, j) => `stmt-${(i * 10 + j) % 1000}`,
        );
        events.push(
          new OrderedSetCreated('doc-1', {
            orderedSetId: `set-${i}`,
            statementIds,
          }),
        );
      }

      // Create 50 shared connections
      for (let i = 0; i < 50; i++) {
        const usages = Array.from(
          { length: (i % 5) + 2 },
          (_, j) => `arg${i * 5 + j}:${j % 2 === 0 ? 'premise' : 'conclusion'}`,
        );
        events.push(
          new OrderedSetBecameShared('doc-1', {
            orderedSetId: `set-${i}`,
            usages,
          }),
        );
      }

      await eventDispatcher.dispatchAll(events);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Verify results
      const stats = statementTracker.getUsageStats();
      expect(stats.totalStatements).toBe(1000);

      const connectionStats = connectionTracker.getConnectionStats();
      expect(connectionStats.totalSharedSets).toBe(50);

      // Performance assertion (should process 1000+ events quickly)
      expect(processingTime).toBeLessThan(1000); // Less than 1 second
      expect(events.length).toBeGreaterThan(1000);
    });
  });
});
