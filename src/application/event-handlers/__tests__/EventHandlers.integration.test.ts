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
      const stmt1Result = StatementId.fromString('stmt-1');
      const stmt2Result = StatementId.fromString('stmt-2');
      const stmt3Result = StatementId.fromString('stmt-3');
      const docIdResult = ProofDocumentId.fromString('doc-1');

      if (
        stmt1Result.isErr() ||
        stmt2Result.isErr() ||
        stmt3Result.isErr() ||
        docIdResult.isErr()
      ) {
        throw new Error('Failed to create test IDs');
      }

      const stmt1 = stmt1Result.value;
      const stmt2 = stmt2Result.value;
      const stmt3 = stmt3Result.value;
      const docId = docIdResult.value;

      const content1Result = StatementContent.create('All men are mortal');
      const content2Result = StatementContent.create('Socrates is a man');
      const content3Result = StatementContent.create('Socrates is mortal');

      if (content1Result.isErr() || content2Result.isErr() || content3Result.isErr()) {
        throw new Error('Failed to create test content');
      }

      const content1 = content1Result.value;
      const content2 = content2Result.value;
      const content3 = content3Result.value;

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
      const arg1IdResult = AtomicArgumentId.fromString('arg1');
      const arg2IdResult = AtomicArgumentId.fromString('arg2');
      const arg3IdResult = AtomicArgumentId.fromString('arg3');

      if (arg1IdResult.isErr() || arg2IdResult.isErr() || arg3IdResult.isErr()) {
        throw new Error('Failed to create argument IDs');
      }

      const arg1Id = arg1IdResult.value;
      const arg2Id = arg2IdResult.value;
      const arg3Id = arg3IdResult.value;

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
          (() => {
            const result = StatementId.fromString('stmt-4');
            if (result.isErr()) throw new Error('Failed to create stmt-4');
            return [result.value];
          })(), // different conclusion
          null,
          'test-user',
        ),
        // arg3: [stmt3] → [stmt5] (uses conclusion of arg1 as premise)
        new AtomicArgumentCreated(
          arg3Id,
          [stmt3], // premise (shared with arg1's conclusion)
          (() => {
            const result = StatementId.fromString('stmt-5');
            if (result.isErr()) throw new Error('Failed to create stmt-5');
            return [result.value];
          })(), // conclusion
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
        new StatementDeleted(docId, {
          statementId: stmt1,
          content: content1,
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
      const stmt1Result = StatementId.fromString('stmt-1');
      const stmt2Result = StatementId.fromString('stmt-2');
      const stmt3Result = StatementId.fromString('stmt-3');
      const stmt4Result = StatementId.fromString('stmt-4');
      const stmt5Result = StatementId.fromString('stmt-5');
      const docIdResult = ProofDocumentId.fromString('doc-1');

      if (
        stmt1Result.isErr() ||
        stmt2Result.isErr() ||
        stmt3Result.isErr() ||
        stmt4Result.isErr() ||
        stmt5Result.isErr() ||
        docIdResult.isErr()
      ) {
        throw new Error('Failed to create test IDs');
      }

      const stmt1 = stmt1Result.value;
      const stmt2 = stmt2Result.value;
      const stmt3 = stmt3Result.value;
      const stmt4 = stmt4Result.value;
      const stmt5 = stmt5Result.value;
      const docId = docIdResult.value;

      // Create content for statements
      const content1Result = StatementContent.create('P → Q');
      const content2Result = StatementContent.create('P');
      const content3Result = StatementContent.create('Q');
      const content4Result = StatementContent.create('Q → R');
      const content5Result = StatementContent.create('R');

      if (
        content1Result.isErr() ||
        content2Result.isErr() ||
        content3Result.isErr() ||
        content4Result.isErr() ||
        content5Result.isErr()
      ) {
        throw new Error('Failed to create content');
      }

      const statements = [
        new StatementCreated(docId, { statementId: stmt1, content: content1Result.value }),
        new StatementCreated(docId, { statementId: stmt2, content: content2Result.value }),
        new StatementCreated(docId, { statementId: stmt3, content: content3Result.value }),
        new StatementCreated(docId, { statementId: stmt4, content: content4Result.value }),
        new StatementCreated(docId, { statementId: stmt5, content: content5Result.value }),
      ];

      await eventDispatcher.dispatchAll(statements);

      // Create atomic arguments for modus ponens chain: (P→Q, P) ⊢ Q, (Q→R, Q) ⊢ R
      const arg1IdResult = AtomicArgumentId.fromString('arg1');
      const arg2IdResult = AtomicArgumentId.fromString('arg2');

      if (arg1IdResult.isErr() || arg2IdResult.isErr()) {
        throw new Error('Failed to create argument IDs');
      }

      const arg1Id = arg1IdResult.value;
      const arg2Id = arg2IdResult.value;

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

      const connection = connectedToArg1[0];
      expect(connection).toBeDefined();
      expect(connection?.argumentId).toBe('arg2');
      expect(connection?.sharedStatements).toEqual(['stmt-3']);
      expect(connection?.connectionType).toBe('premise-to-conclusion');

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
