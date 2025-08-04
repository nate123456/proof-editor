import { err } from 'neverthrow';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ConnectionTracker } from '../../../application/event-handlers/ConnectionTracker.js';
import {
  StatementUsageEventHandler,
  StatementUsageTracker,
} from '../../../application/event-handlers/StatementUsageTracker.js';
import type { IUIPort } from '../../../application/ports/IUIPort.js';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import type { DomainEvent } from '../../../domain/events/base-event.js';
import type { StatementCreated } from '../../../domain/events/proof-document-events.js';
import { ValidationError } from '../../../domain/shared/result.js';
import { StatementContent } from '../../../domain/shared/value-objects/index.js';
import {
  MockTreeViewRenderer,
  ProofTreeController,
} from '../../../presentation/controllers/ProofTreeController.js';
import { createTestEventBus } from '../EventBus.js';

/**
 * Integration tests for complete event flow from domain through application to presentation
 */
describe('EventBus Integration - Complete Event Flow', () => {
  let eventBus: ReturnType<typeof createTestEventBus>;
  let connectionTracker: ConnectionTracker;
  let usageTracker: StatementUsageTracker;
  let usageEventHandler: StatementUsageEventHandler;
  let treeController: ProofTreeController;
  let mockRenderer: MockTreeViewRenderer;
  let mockUIPort: IUIPort;

  beforeEach(() => {
    eventBus = createTestEventBus();

    // Create event handlers
    connectionTracker = new ConnectionTracker();
    usageTracker = new StatementUsageTracker();
    usageEventHandler = new StatementUsageEventHandler(usageTracker);

    // Create mock UI port
    mockUIPort = {
      showInformation: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      createWebviewPanel: vi.fn().mockReturnValue({
        webview: { html: '' },
        dispose: vi.fn(),
      }),
    } as unknown as IUIPort;

    // Create presentation layer
    mockRenderer = new MockTreeViewRenderer();
    treeController = new ProofTreeController(mockUIPort, eventBus, mockRenderer);

    // Wire up event handlers
    // TODO: OrderedSetBecameShared and OrderedSetCreated events need to be defined
    // eventBus.subscribe('OrderedSetBecameShared', (event) => {
    //   connectionTracker.handle(event as OrderedSetBecameShared);
    //   return Promise.resolve();
    // });

    eventBus.subscribe('StatementCreated', (event) => {
      usageEventHandler.handle(event as StatementCreated);
      return Promise.resolve();
    });

    // eventBus.subscribe('OrderedSetCreated', (event) => {
    //   usageEventHandler.handle(event as OrderedSetCreated);
    //   return Promise.resolve();
    // });
  });

  test('complete aggregate event flow - domain to presentation', async () => {
    // Create aggregate and generate events
    const document = ProofDocument.create();
    const content1 = StatementContent.create('Statement 1');
    const content2 = StatementContent.create('Statement 2');
    if (content1.isOk()) document.createStatement(content1.value);
    if (content2.isOk()) document.createStatement(content2.value);

    // Publish events and verify complete flow
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify events were captured in test mode
    const capturedEvents = eventBus.getCapturedEvents();
    expect(capturedEvents).toHaveLength(3); // ProofDocumentCreated + 2 StatementCreated
    expect(capturedEvents[0]?.eventType).toBe('ProofDocumentCreated');
    expect(capturedEvents[1]?.eventType).toBe('StatementCreated');
    expect(capturedEvents[2]?.eventType).toBe('StatementCreated');

    // Verify usage tracker was updated
    const statement1Id = (capturedEvents[1] as StatementCreated).eventData.statementId;
    const statement2Id = (capturedEvents[2] as StatementCreated).eventData.statementId;

    expect(usageTracker.getUsageCount(statement1Id.getValue())).toBe(0);
    expect(usageTracker.getUsageCount(statement2Id.getValue())).toBe(0);
    expect(usageTracker.getStatementContent(statement1Id.getValue())).toBe('Statement 1');
    expect(usageTracker.getStatementContent(statement2Id.getValue())).toBe('Statement 2');

    // Verify presentation layer received events
    const addStatementOps = mockRenderer.getOperations('addStatement');
    expect(addStatementOps).toHaveLength(2);
    expect(addStatementOps[0]?.data.content).toBe('Statement 1');
    expect(addStatementOps[1]?.data.content).toBe('Statement 2');
  });

  test('connection tracking via shared OrderedSets', async () => {
    // Create a document with statements and arguments that share OrderedSets
    const document = ProofDocument.create();
    const content1 = StatementContent.create('All men are mortal');
    const content2 = StatementContent.create('Socrates is a man');
    const content3 = StatementContent.create('Socrates is mortal');
    const stmt1Result = content1.isOk()
      ? document.createStatement(content1.value)
      : err(new ValidationError('Invalid content'));
    const stmt2Result = content2.isOk()
      ? document.createStatement(content2.value)
      : err(new ValidationError('Invalid content'));
    const stmt3Result = content3.isOk()
      ? document.createStatement(content3.value)
      : err(new ValidationError('Invalid content'));

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    expect(stmt3Result.isOk()).toBe(true);
    if (!stmt1Result.isOk() || !stmt2Result.isOk() || !stmt3Result.isOk()) {
      throw new Error('Test setup failed');
    }

    // Create atomic arguments that share statements
    const arg1Result = document.createAtomicArgument(
      [stmt1Result.value, stmt2Result.value], // premises
      [stmt3Result.value], // conclusions
    );
    expect(arg1Result.isOk()).toBe(true);
    if (!arg1Result.isOk()) throw new Error('Test setup failed');

    const arg2Result = document.createAtomicArgument(
      [stmt3Result.value], // This statement is shared as premise
      [], // No conclusions
    );
    expect(arg2Result.isOk()).toBe(true);
    if (!arg2Result.isOk()) throw new Error('Test setup failed');

    // Publish all events
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify atomic argument created events were generated
    const capturedEvents = eventBus.getCapturedEvents();
    const argEvents = capturedEvents.filter((e) => e.eventType === 'AtomicArgumentCreated');

    expect(argEvents).toHaveLength(2);

    // Verify connection tracker recorded the connections via shared statements
    const connectedArgs1 = connectionTracker.findConnectedArguments(
      arg1Result.value.getId().getValue(),
    );
    expect(connectedArgs1).toHaveLength(1);
    expect(connectedArgs1[0]?.argumentId).toBe(arg2Result.value.getId().getValue());
    expect(connectedArgs1[0]?.sharedStatements).toContain(stmt3Result.value.getId().getValue());

    // Verify arguments using the shared statement
    const argsUsingStmt3 = connectionTracker.getArgumentsUsingStatement(
      stmt3Result.value.getId().getValue(),
    );
    expect(argsUsingStmt3).toHaveLength(2);
    expect(argsUsingStmt3.map((a) => a.argumentId)).toContain(arg1Result.value.getId().getValue());
    expect(argsUsingStmt3.map((a) => a.argumentId)).toContain(arg2Result.value.getId().getValue());
  });

  test('usage tracking through OrderedSet creation', async () => {
    const document = ProofDocument.create();
    const content1 = StatementContent.create('Premise statement');
    const content2 = StatementContent.create('Conclusion statement');
    const stmt1Result = content1.isOk()
      ? document.createStatement(content1.value)
      : err(new ValidationError('Invalid content'));
    const stmt2Result = content2.isOk()
      ? document.createStatement(content2.value)
      : err(new ValidationError('Invalid content'));

    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    if (!stmt1Result.isOk() || !stmt2Result.isOk()) {
      throw new Error('Test setup failed');
    }

    // Create atomic argument using the statements
    const argResult = document.createAtomicArgument(
      [stmt1Result.value], // premise
      [stmt2Result.value], // conclusion
    );
    expect(argResult.isOk()).toBe(true);

    // Publish events
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify usage counts were updated
    const stmt1Id = stmt1Result.value.getId().getValue();
    const stmt2Id = stmt2Result.value.getId().getValue();

    expect(usageTracker.getUsageCount(stmt1Id)).toBe(1);
    expect(usageTracker.getUsageCount(stmt2Id)).toBe(1);

    // Verify no unused statements
    const unusedStatements = usageTracker.getUnusedStatements();
    expect(unusedStatements).toHaveLength(0);

    // Verify usage statistics
    const stats = usageTracker.getUsageStats();
    expect(stats.totalStatements).toBe(2);
    expect(stats.usedStatements).toBe(2);
    expect(stats.unusedStatements).toBe(0);
    expect(stats.totalUsages).toBe(2);
  });

  test('event metrics tracking throughout flow', async () => {
    const document = ProofDocument.create();
    const content = StatementContent.create('Test statement');
    if (content.isOk()) document.createStatement(content.value);

    // Verify initial metrics
    let metrics = eventBus.getMetrics();
    expect(metrics.totalEventsPublished).toBe(0);
    expect(metrics.totalHandlersExecuted).toBe(0);

    // Publish events
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify metrics were updated
    metrics = eventBus.getMetrics();
    expect(metrics.totalEventsPublished).toBe(2); // ProofDocumentCreated + StatementCreated
    expect(metrics.totalHandlersExecuted).toBeGreaterThan(0);
    expect(metrics.lastEventPublishedAt).toBeInstanceOf(Date);
    expect(metrics.averageHandlerExecutionTime).toBeGreaterThanOrEqual(0);
  });

  test('error isolation in event handlers', async () => {
    // Add a failing handler
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
    eventBus.subscribe('StatementCreated', failingHandler);

    const document = ProofDocument.create();
    const content = StatementContent.create('Test statement');
    if (content.isOk()) document.createStatement(content.value);

    // Publish events - should not throw despite failing handler
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify failing handler was called
    expect(failingHandler).toHaveBeenCalled();

    // Verify other handlers still worked
    const addStatementOps = mockRenderer.getOperations('addStatement');
    expect(addStatementOps).toHaveLength(1);

    // Verify metrics show the failure
    const metrics = eventBus.getMetrics();
    expect(metrics.totalHandlerFailures).toBeGreaterThan(0);
  });

  test('event ordering preservation across handlers', async () => {
    const receivedEvents: DomainEvent[] = [];

    // Add a global handler to track event order
    eventBus.subscribeAll((event) => {
      receivedEvents.push(event);
      return Promise.resolve();
    });

    const document = ProofDocument.create();
    const content1 = StatementContent.create('Statement 1');
    const content2 = StatementContent.create('Statement 2');
    const content3 = StatementContent.create('Statement 3');
    if (content1.isOk()) document.createStatement(content1.value);
    if (content2.isOk()) document.createStatement(content2.value);
    if (content3.isOk()) document.createStatement(content3.value);

    // Publish events
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify events were received in correct order
    expect(receivedEvents).toHaveLength(4); // ProofDocumentCreated + 3 StatementCreated
    expect(receivedEvents[0]?.eventType).toBe('ProofDocumentCreated');
    expect(receivedEvents[1]?.eventType).toBe('StatementCreated');
    expect(receivedEvents[2]?.eventType).toBe('StatementCreated');
    expect(receivedEvents[3]?.eventType).toBe('StatementCreated');

    // Verify statement content order
    const statementEvents = receivedEvents.filter(
      (e) => e.eventType === 'StatementCreated',
    ) as StatementCreated[];

    expect(statementEvents[0]?.eventData.content).toBe('Statement 1');
    expect(statementEvents[1]?.eventData.content).toBe('Statement 2');
    expect(statementEvents[2]?.eventData.content).toBe('Statement 3');
  });

  test('subscription cleanup prevents memory leaks', async () => {
    const initialMetrics = eventBus.getMetrics();
    const initialSubscriptions = initialMetrics.activeSubscriptions;

    // Create additional temporary subscriptions
    const tempHandler = vi.fn().mockResolvedValue(undefined);
    const disposable1 = eventBus.subscribe('TestEvent', tempHandler);
    const disposable2 = eventBus.subscribeAll(tempHandler);

    // Verify subscriptions increased
    let metrics = eventBus.getMetrics();
    expect(metrics.activeSubscriptions).toBe(initialSubscriptions + 2);

    // Dispose subscriptions
    disposable1.dispose();
    disposable2.dispose();

    // Verify subscriptions returned to initial count
    metrics = eventBus.getMetrics();
    expect(metrics.activeSubscriptions).toBe(initialSubscriptions);

    // Dispose tree controller (which has its own subscriptions)
    treeController.dispose();

    // Verify all subscriptions are cleaned up
    metrics = eventBus.getMetrics();
    expect(metrics.activeSubscriptions).toBeLessThan(initialSubscriptions);
  });

  test('complete CQRS flow - write operations trigger read model updates', async () => {
    // Start with empty read models
    expect(usageTracker.getUsageStats().totalStatements).toBe(0);
    expect(connectionTracker.getConnectionStats().totalConnectedArguments).toBe(0);

    // Execute write operations (domain commands)
    const document = ProofDocument.create();
    const content1 = StatementContent.create('Write model statement 1');
    const content2 = StatementContent.create('Write model statement 2');
    const stmt1Result = content1.isOk()
      ? document.createStatement(content1.value)
      : err(new ValidationError('Invalid content'));
    const stmt2Result = content2.isOk()
      ? document.createStatement(content2.value)
      : err(new ValidationError('Invalid content'));
    expect(stmt1Result.isOk()).toBe(true);
    expect(stmt2Result.isOk()).toBe(true);
    if (!stmt1Result.isOk() || !stmt2Result.isOk()) {
      throw new Error('Test setup failed');
    }

    const arg1Result = document.createAtomicArgument(
      [stmt1Result.value], // premises
      [], // no conclusions
    );
    expect(arg1Result.isOk()).toBe(true);

    const arg2Result = document.createAtomicArgument(
      [stmt1Result.value], // same premise - creates connection
      [], // no conclusions
    );
    expect(arg2Result.isOk()).toBe(true);

    // Publish events to update read models
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify read model updates
    const usageStats = usageTracker.getUsageStats();
    expect(usageStats.totalStatements).toBe(2);
    expect(usageStats.usedStatements).toBe(1); // Only stmt1 is used
    expect(usageStats.unusedStatements).toBe(1); // stmt2 is unused

    // Verify connection tracker shows both arguments using the same statement
    if (stmt1Result.isOk() && arg1Result.isOk() && arg2Result.isOk()) {
      const argsUsingStmt1 = connectionTracker.getArgumentsUsingStatement(
        stmt1Result.value.getId().getValue(),
      );
      expect(argsUsingStmt1).toHaveLength(2); // Both arguments use stmt1
      expect(argsUsingStmt1.map((a) => a.argumentId)).toContain(
        arg1Result.value.getId().getValue(),
      );
      expect(argsUsingStmt1.map((a) => a.argumentId)).toContain(
        arg2Result.value.getId().getValue(),
      );
    }
  });
});
