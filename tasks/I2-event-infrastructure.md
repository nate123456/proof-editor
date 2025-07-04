# Task I2: Event Infrastructure

## Status
- **Phase**: 3 - Infrastructure Layer
- **Priority**: High
- **Estimated Effort**: 3-4 hours
- **Dependencies**: Domain event base classes and interfaces
- **Blocks**: Reactive UI updates and event-driven features

## Goal
Complete and enhance the existing event infrastructure to enable domain events to flow from aggregates through the application layer to the presentation layer, while maintaining clean architectural boundaries.

## Context
The event infrastructure already exists with:
- `EventBus` implementation in infrastructure layer
- `DomainEvent` base class with proper structure
- `AggregateRoot` pattern for event management
- Existing domain events for ProofDocument

The task is to:
1. Ensure the infrastructure properly integrates with application services
2. Create missing application layer integration patterns
3. Document proper usage patterns
4. Add any missing test coverage

### Key Design Decisions
1. **Use Existing EventBus**: Already has sophisticated features (metrics, replay, test mode)
2. **Follow AggregateRoot Pattern**: Use `getUncommittedEvents()` and `markEventsAsCommitted()`
3. **Disposable Pattern**: For subscription cleanup
4. **Clean Architecture**: Domain defines interfaces, infrastructure implements them
5. **CQRS**: Events enable read model updates without coupling to write model

## Required Implementation

### 1. Application Service Event Integration
Create `src/application/services/ProofApplicationService.ts` to properly integrate events:
```typescript
import { err, ok, type Result } from 'neverthrow';
import { IProofDocumentRepository } from '../../domain/repositories/IProofDocumentRepository.js';
import { EventBus } from '../../infrastructure/events/EventBus.js';
import { ValidationError } from '../../domain/shared/result.js';
import { CreateStatementCommand } from '../commands/statement-commands.js';
import { StatementDTO } from '../queries/statement-queries.js';
import { statementToDTO } from '../mappers/StatementMapper.js';
import { ProofDocumentId } from '../../domain/shared/value-objects.js';

export class ProofApplicationService {
  constructor(
    private readonly repository: IProofDocumentRepository,
    private readonly eventBus: EventBus
  ) {}

  async createStatement(command: CreateStatementCommand): Promise<Result<StatementDTO, ValidationError>> {
    // Load aggregate
    const documentId = ProofDocumentId.create(command.documentId);
    const document = await this.repository.findById(documentId);
    if (!document) {
      return err(new ValidationError('Document not found'));
    }

    // Execute domain operation
    const result = document.createStatement(command.content);
    if (result.isErr()) {
      return err(result.error);
    }

    // Save aggregate
    const saveResult = await this.repository.save(document);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publish domain events using existing pattern
    const events = document.getUncommittedEvents();
    await this.eventBus.publish(events);
    document.markEventsAsCommitted();

    // Return DTO
    return ok(statementToDTO(result.value));
  }

  // Similar pattern for other commands...
}
```

### 2. Query Side Event Handlers
Create event handlers for updating read models in `src/application/event-handlers/`:

```typescript
// src/application/event-handlers/ConnectionTracker.ts
import { DomainEventHandler, DomainEvent } from '../../domain/events/base-event.js';
import { OrderedSetBecameShared } from '../../domain/events/proof-document-events.js';

export class ConnectionTracker implements DomainEventHandler<OrderedSetBecameShared> {
  private sharedSets = new Map<string, Set<string>>();

  handle(event: OrderedSetBecameShared): void {
    const connections = new Set<string>();
    for (const usage of event.eventData.usages) {
      const [argumentId] = usage.split(':');
      connections.add(argumentId);
    }
    this.sharedSets.set(event.eventData.orderedSetId, connections);
  }

  canHandle(event: DomainEvent): event is OrderedSetBecameShared {
    return event.eventType === 'OrderedSetBecameShared';
  }

  getSharedConnections(orderedSetId: string): string[] {
    return Array.from(this.sharedSets.get(orderedSetId) || []);
  }
}

// src/application/event-handlers/StatementUsageTracker.ts
import { DomainEventHandler, DomainEvent } from '../../domain/events/base-event.js';
import { StatementCreated, StatementDeleted, OrderedSetCreated } from '../../domain/events/proof-document-events.js';

export class StatementUsageTracker {
  private usageCounts = new Map<string, number>();

  handleStatementCreated(event: StatementCreated): void {
    this.usageCounts.set(event.eventData.statementId, 0);
  }

  handleStatementDeleted(event: StatementDeleted): void {
    this.usageCounts.delete(event.eventData.statementId);
  }

  handleOrderedSetCreated(event: OrderedSetCreated): void {
    for (const statementId of event.eventData.statementIds) {
      const current = this.usageCounts.get(statementId) || 0;
      this.usageCounts.set(statementId, current + 1);
    }
  }

  getUsageCount(statementId: string): number {
    return this.usageCounts.get(statementId) || 0;
  }
}
```

### 3. Presentation Layer Integration
Show how presentation layer subscribes to events:

```typescript
// src/presentation/controllers/ProofTreeController.ts
import { EventBus, Disposable } from '../../infrastructure/events/EventBus.js';
import { StatementCreated, OrderedSetBecameShared, AtomicArgumentCreated } from '../../domain/events/proof-document-events.js';

export class ProofTreeController {
  private subscriptions: Disposable[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly viewRenderer: ITreeViewRenderer
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // React to statement changes
    this.subscriptions.push(
      this.eventBus.subscribe('StatementCreated', (event: StatementCreated) => {
        this.handleStatementCreated(event);
      })
    );

    // React to new connections
    this.subscriptions.push(
      this.eventBus.subscribe('OrderedSetBecameShared', (event: OrderedSetBecameShared) => {
        this.handleNewConnection(event);
      })
    );

    // React to argument changes
    this.subscriptions.push(
      this.eventBus.subscribe('AtomicArgumentCreated', (event: AtomicArgumentCreated) => {
        this.handleArgumentCreated(event);
      })
    );
  }

  private async handleStatementCreated(event: StatementCreated): Promise<void> {
    // Update view with new statement
    await this.viewRenderer.addStatement(event.eventData.statementId, event.eventData.content);
  }

  private async handleNewConnection(event: OrderedSetBecameShared): Promise<void> {
    // Highlight shared connections
    const connections = event.eventData.usages.map(usage => {
      const [argumentId, role] = usage.split(':');
      return { argumentId, role };
    });
    await this.viewRenderer.highlightConnections(connections);
  }

  private async handleArgumentCreated(event: AtomicArgumentCreated): Promise<void> {
    // Update tree structure
    await this.viewRenderer.refreshTree();
  }

  dispose(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.dispose());
    this.subscriptions = [];
  }
}
```

### 4. Configuration and Initialization
Show how to wire up the event infrastructure:

```typescript
// src/main.ts or startup configuration
import { createEventBus } from './infrastructure/events/EventBus.js';
import { YAMLProofDocumentRepository } from './infrastructure/repositories/yaml/YAMLProofDocumentRepository.js';
import { ProofApplicationService } from './application/services/ProofApplicationService.js';
import { ProofTreeController } from './presentation/controllers/ProofTreeController.js';

// Create infrastructure
const eventBus = createEventBus({
  maxEventHistory: 1000,
  handlerTimeout: 5000,
  enableReplay: false,
  enableMetrics: true,
  enableLogging: true,
  testMode: false
});

const repository = new YAMLProofDocumentRepository(fileSystem, '/data/proofs');

// Create application services
const applicationService = new ProofApplicationService(repository, eventBus);

// Create presentation controllers
const treeController = new ProofTreeController(eventBus, viewRenderer);

// Wire up event handlers
const connectionTracker = new ConnectionTracker();
eventBus.subscribe('OrderedSetBecameShared', event => connectionTracker.handle(event));

const usageTracker = new StatementUsageTracker();
eventBus.subscribe('StatementCreated', event => usageTracker.handleStatementCreated(event));
eventBus.subscribe('StatementDeleted', event => usageTracker.handleStatementDeleted(event));
eventBus.subscribe('OrderedSetCreated', event => usageTracker.handleOrderedSetCreated(event));
```

## Testing Requirements

### Unit Tests
Create tests for the event integration in `src/application/services/__tests__/ProofApplicationService.test.ts`:
```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ProofApplicationService } from '../ProofApplicationService.js';
import { IProofDocumentRepository } from '../../../domain/repositories/IProofDocumentRepository.js';
import { createTestEventBus } from '../../../infrastructure/events/EventBus.js';
import { proofDocumentFactory } from '../../../domain/__tests__/factories/index.js';

describe('ProofApplicationService Event Integration', () => {
  let service: ProofApplicationService;
  let mockRepository: IProofDocumentRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    mockRepository = mock<IProofDocumentRepository>();
    eventBus = createTestEventBus();
    service = new ProofApplicationService(mockRepository, eventBus);
  });

  test('publishes events after successful command', async () => {
    const document = proofDocumentFactory.build();
    mockRepository.findById.mockResolvedValue(document);
    mockRepository.save.mockResolvedValue(ok(undefined));

    // Capture published events
    const capturedEvents: DomainEvent[] = [];
    eventBus.subscribeAll(event => capturedEvents.push(event));

    // Execute command
    const result = await service.createStatement({
      documentId: document.getId().getValue(),
      content: 'New statement'
    });

    expect(result.isOk()).toBe(true);
    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].eventType).toBe('StatementCreated');
    expect(capturedEvents[0].eventData.content).toBe('New statement');
  });

  test('does not publish events if save fails', async () => {
    const document = proofDocumentFactory.build();
    mockRepository.findById.mockResolvedValue(document);
    mockRepository.save.mockResolvedValue(err(new ValidationError('Save failed')));

    const capturedEvents: DomainEvent[] = [];
    eventBus.subscribeAll(event => capturedEvents.push(event));

    const result = await service.createStatement({
      documentId: document.getId().getValue(),
      content: 'New statement'
    });

    expect(result.isErr()).toBe(true);
    expect(capturedEvents).toHaveLength(0);
  });
});
```

### Integration Tests
Create `src/infrastructure/events/__tests__/EventBus.integration.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { createEventBus, createTestEventBus } from '../EventBus.js';
import { ProofDocument } from '../../../domain/aggregates/ProofDocument.js';
import { StatementCreated } from '../../../domain/events/proof-document-events.js';

describe('EventBus Integration', () => {
  test('handles aggregate event flow', async () => {
    const eventBus = createTestEventBus();
    
    // Create handlers
    const events: DomainEvent[] = [];
    eventBus.subscribeAll(event => events.push(event));

    // Create aggregate and generate events
    const document = ProofDocument.create();
    document.createStatement('Statement 1');
    document.createStatement('Statement 2');

    // Publish events
    const uncommittedEvents = document.getUncommittedEvents();
    await eventBus.publish(uncommittedEvents);
    document.markEventsAsCommitted();

    // Verify
    expect(events).toHaveLength(3); // ProofDocumentCreated + 2 StatementCreated
    expect(events[0].eventType).toBe('ProofDocumentCreated');
    expect(events[1].eventType).toBe('StatementCreated');
    expect(events[2].eventType).toBe('StatementCreated');
  });

  test('test mode captures events', async () => {
    const eventBus = createTestEventBus();
    
    const document = ProofDocument.create();
    document.createStatement('Test');
    
    await eventBus.publish(document.getUncommittedEvents());
    
    const captured = eventBus.getCapturedEvents();
    expect(captured).toHaveLength(2);
    expect(captured[1].eventType).toBe('StatementCreated');
  });

  test('metrics tracking works', async () => {
    const eventBus = createEventBus({ enableMetrics: true });
    
    let handlerCalled = false;
    eventBus.subscribe('StatementCreated', () => {
      handlerCalled = true;
    });

    const document = ProofDocument.create();
    document.createStatement('Test');
    await eventBus.publish(document.getUncommittedEvents());

    const metrics = eventBus.getMetrics();
    expect(metrics.totalEventsPublished).toBe(2);
    expect(metrics.totalHandlersExecuted).toBeGreaterThan(0);
    expect(handlerCalled).toBe(true);
  });
});
```

## Success Criteria
- [ ] Event bus implements IEventBus interface exactly
- [ ] Type-safe event publishing and subscription
- [ ] Events flow from domain through application to presentation
- [ ] Error handling doesn't break event flow
- [ ] 95%+ test coverage
- [ ] No domain logic in infrastructure
- [ ] Clean separation of concerns
- [ ] Support for both specific and wildcard subscriptions

## Implementation Considerations

### Performance
- In-memory bus is synchronous for simplicity
- Consider async processing for heavy handlers
- Event ordering is preserved within a publish call
- No event persistence (not event sourcing)

### Error Handling
- Handlers should not throw exceptions
- Log errors but continue processing
- Consider dead letter queue for failed events
- Timeout handling for slow handlers (future)

### Testing
- Always clear subscriptions between tests
- Use test events rather than domain events
- Mock event bus in unit tests
- Test error scenarios thoroughly

### Future Enhancements
- Async event processing with queues
- Event replay for debugging
- Event filtering predicates
- Priority-based event handling
- Distributed event bus for microservices
- Event persistence for audit trail
- Event versioning for compatibility

## Notes
- Event bus is a singleton to ensure consistent routing
- Events are immutable once created
- Handler execution order is not guaranteed between subscribers
- Consider using event aggregation for high-frequency events
- Event bus doesn't know about domain concepts
- Keep events focused and granular
- Avoid putting business logic in event handlers