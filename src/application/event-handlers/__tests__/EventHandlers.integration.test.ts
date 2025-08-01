import { beforeEach, describe, expect, it } from 'vitest';
import type { DomainEvent, DomainEventHandler } from '../../../domain/events/base-event.js';
import { AtomicArgumentCreated } from '../../../domain/events/proof-construction-events.js';
import {
  StatementCreated,
  StatementDeleted,
} from '../../../domain/events/proof-document-events.js';
import {
  AtomicArgumentId,
  ProofDocumentId,
  StatementContent,
  StatementId,
} from '../../../domain/shared/value-objects/index.js';
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
      const stmt1 = StatementId.fromString('stmt-1');
      const stmt2 = StatementId.fromString('stmt-2');
      const stmt3 = StatementId.fromString('stmt-3');

      const docId = ProofDocumentId.fromString('doc-1');
      const content1 = StatementContent.create('All men are mortal').value;
      const content2 = StatementContent.create('Socrates is a man').value;
      const content3 = StatementContent.create('Socrates is mortal').value;

      const events = [
        new StatementCreated(docId, {
          statementId: stmt1,
          content: content1,
        }),
        new StatementCreated(docId, {
          statementId: stmt2,
          content: content2,
        }),
        new StatementCreated(docId, {
          statementId: stmt3,
          content: content3,
        }),
      ];

      await eventDispatcher.dispatchAll(events);

      // Verify initial state
      expect(statementTracker.getUsageCount('stmt-1')).toBe(0);
      expect(statementTracker.getUsageCount('stmt-2')).toBe(0);
      expect(statementTracker.getUsageCount('stmt-3')).toBe(0);
      expect(connectionTracker.getConnectionStats().totalArguments).toBe(0);

      // Create atomic arguments to represent argument structure
      const arg1Id = AtomicArgumentId.fromString('arg1');
      const arg2Id = AtomicArgumentId.fromString('arg2');
      const arg3Id = AtomicArgumentId.fromString('arg3');

      const argumentEvents = [
        // arg1: [stmt1, stmt2] → [stmt3] (modus ponens)
        new AtomicArgumentCreated(
          arg1Id,
          [stmt1, stmt2], // premises
          [stmt3], // conclusions
          null,
          'test-user',
        ),
        // arg2: [stmt1, stmt2] → [stmt4] (shares premises with arg1)
        new AtomicArgumentCreated(
          arg2Id,
          [stmt1, stmt2], // shared premises
          [StatementId.fromString('stmt-4')], // different conclusion
          null,
          'test-user',
        ),
        // arg3: [stmt3] → [stmt5] (uses conclusion of arg1 as premise)
        new AtomicArgumentCreated(
          arg3Id,
          [stmt3], // premise (shared with arg1's conclusion)
          [StatementId.fromString('stmt-5')], // conclusion
          null,
          'test-user',
        ),
      ];

      await eventDispatcher.dispatchAll(argumentEvents);

      // Verify connection tracking
      expect(connectionTracker.getConnectionStats().totalArguments).toBe(3);
      expect(connectionTracker.isStatementShared(stmt1.getValue())).toBe(true);
      expect(connectionTracker.isStatementShared(stmt2.getValue())).toBe(true);
      expect(connectionTracker.isStatementShared(stmt3.getValue())).toBe(true);

      // Find connected arguments
      const connectedToArg1 = connectionTracker.findConnectedArguments('arg1');
      expect(connectedToArg1).toHaveLength(2);

      const arg2Connection = connectedToArg1.find((c) => c.argumentId === 'arg2');
      expect(arg2Connection).toBeDefined();
      expect(arg2Connection?.sharedStatements).toEqual(['stmt-1', 'stmt-2']);
      expect(arg2Connection?.connectionType).toBe('bidirectional');

      const arg3Connection = connectedToArg1.find((c) => c.argumentId === 'arg3');
      expect(arg3Connection).toBeDefined();
      expect(arg3Connection?.sharedStatements).toEqual(['stmt-3']);
      expect(arg3Connection?.connectionType).toBe('premise-to-conclusion');

      // Check statement usage
      const stmt1Users = connectionTracker.getArgumentsUsingStatement('stmt-1');
      expect(stmt1Users).toHaveLength(2);
      expect(stmt1Users.map((u) => u.argumentId)).toContain('arg1');
      expect(stmt1Users.map((u) => u.argumentId)).toContain('arg2');

      const stmt3Users = connectionTracker.getArgumentsUsingStatement('stmt-3');
      expect(stmt3Users).toHaveLength(2);
      expect(stmt3Users.some((u) => u.argumentId === 'arg1' && u.usage === 'conclusion')).toBe(
        true,
      );
      expect(stmt3Users.some((u) => u.argumentId === 'arg3' && u.usage === 'premise')).toBe(true);

      // Delete statement
      const deleteEvents = [
        new StatementDeleted('doc-1', {
          statementId: stmt1,
          content: 'All men are mortal',
        }),
      ];

      await eventDispatcher.dispatchAll(deleteEvents);

      // Verify statement deletion tracking
      expect(statementTracker.getStatementContent('stmt-1')).toBeUndefined();
      expect(statementTracker.getStatementContent('stmt-2')).toBe('Socrates is a man');
      expect(statementTracker.getStatementContent('stmt-3')).toBe('Socrates is mortal');

      // Connection tracking persists (ConnectionTracker only responds to AtomicArgumentCreated events)
      expect(connectionTracker.isStatementShared('stmt-1')).toBe(true);
      expect(connectionTracker.isStatementShared('stmt-3')).toBe(true);
    });

    it('should handle complex argument reuse scenarios', async () => {
      // Create statements for a complex logical structure
      const stmt1 = StatementId.fromString('stmt-1');
      const stmt2 = StatementId.fromString('stmt-2');
      const stmt3 = StatementId.fromString('stmt-3');
      const stmt4 = StatementId.fromString('stmt-4');
      const stmt5 = StatementId.fromString('stmt-5');

      const statements = [
        new StatementCreated('doc-1', { statementId: stmt1, content: 'P → Q' }),
        new StatementCreated('doc-1', { statementId: stmt2, content: 'P' }),
        new StatementCreated('doc-1', { statementId: stmt3, content: 'Q' }),
        new StatementCreated('doc-1', { statementId: stmt4, content: 'Q → R' }),
        new StatementCreated('doc-1', { statementId: stmt5, content: 'R' }),
      ];

      await eventDispatcher.dispatchAll(statements);

      // Create atomic arguments for modus ponens chain: (P→Q, P) ⊢ Q, (Q→R, Q) ⊢ R
      const arg1Id = AtomicArgumentId.fromString('arg1');
      const arg2Id = AtomicArgumentId.fromString('arg2');

      const argumentEvents = [
        // First modus ponens: arg1 = [stmt1, stmt2] → [stmt3]
        new AtomicArgumentCreated(
          arg1Id,
          [stmt1, stmt2], // premises: P → Q, P
          [stmt3], // conclusion: Q
          null,
          'test-user',
        ),
        // Second modus ponens: arg2 = [stmt4, stmt3] → [stmt5] (stmt3 reused from arg1's conclusion)
        new AtomicArgumentCreated(
          arg2Id,
          [stmt4, stmt3], // premises: Q → R, Q (stmt3 shared with arg1)
          [stmt5], // conclusion: R
          null,
          'test-user',
        ),
      ];

      await eventDispatcher.dispatchAll(argumentEvents);

      // Verify connection tracking shows the logical flow
      expect(connectionTracker.isStatementShared(stmt3.getValue())).toBe(true);

      // arg1 should be connected to arg2 through shared statement stmt3
      const connectedToArg1 = connectionTracker.findConnectedArguments('arg1');
      expect(connectedToArg1).toHaveLength(1);
      expect(connectedToArg1[0].argumentId).toBe('arg2');
      expect(connectedToArg1[0].sharedStatements).toEqual(['stmt-3']);
      expect(connectedToArg1[0].connectionType).toBe('premise-to-conclusion');

      // Check statement usage for the shared statement
      const stmt3Users = connectionTracker.getArgumentsUsingStatement('stmt-3');
      expect(stmt3Users).toHaveLength(2);
      expect(stmt3Users.some((u) => u.argumentId === 'arg1' && u.usage === 'conclusion')).toBe(
        true,
      );
      expect(stmt3Users.some((u) => u.argumentId === 'arg2' && u.usage === 'premise')).toBe(true);

      // Verify overall connection stats
      const stats = connectionTracker.getConnectionStats();
      expect(stats.totalArguments).toBe(2);
      expect(stats.totalConnectedArguments).toBe(2);
      expect(stats.totalSharedStatements).toBe(1);
    });

    // TODO: Add more comprehensive tests for Statement-level paradigm
  });
});
