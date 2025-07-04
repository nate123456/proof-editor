# Task D2: ProofDocument Aggregate

## Status
- **Phase**: 1 - Domain Layer
- **Priority**: Critical (Foundation)
- **Estimated Effort**: 5-6 hours
- **Dependencies**: D1 (Core domain entities)
- **Blocks**: All application layer tasks

## Goal
Implement the ProofDocument aggregate root that maintains consistency, manages OrderedSet identity registry, and emits domain events for all state changes.

## Context
The ProofDocument is the consistency boundary for all proof operations. It ensures business rules are enforced and tracks OrderedSet sharing (which enables connections between arguments).

## Required Implementation

### 1. ProofDocument Aggregate Root
Create `src/domain/aggregates/ProofDocument.ts`:
```typescript
import { Statement, OrderedSet, AtomicArgument } from '../core/index.js';
import { StatementId, OrderedSetId, ArgumentId } from '../core/value-objects.js';
import { DomainError } from '../core/DomainError.js';
import { DomainEvent } from '../events/DomainEvent.js';

export class ProofDocument {
  private statements: Map<string, Statement> = new Map();
  private orderedSets: Map<string, OrderedSet> = new Map();
  private orderedSetRegistry: Map<string, Set<string>> = new Map(); // Tracks usage
  private atomicArguments: Map<string, AtomicArgument> = new Map();
  private domainEvents: DomainEvent[] = [];
  private version: number = 0;

  private constructor(
    private readonly id: ProofDocumentId,
    private readonly createdAt: Date
  ) {}

  static create(): ProofDocument {
    const doc = new ProofDocument(
      ProofDocumentId.generate(),
      new Date()
    );
    
    doc.addEvent({
      type: 'ProofDocumentCreated',
      aggregateId: doc.id.getValue(),
      payload: { createdAt: doc.createdAt }
    });
    
    return doc;
  }

  // Statement operations
  createStatement(content: string): Statement | DomainError {
    const statement = Statement.create(content);
    if (statement instanceof DomainError) {
      return statement;
    }

    this.statements.set(statement.getId().getValue(), statement);
    this.version++;
    
    this.addEvent({
      type: 'StatementCreated',
      aggregateId: this.id.getValue(),
      payload: {
        statementId: statement.getId().getValue(),
        content: statement.getContent()
      }
    });

    return statement;
  }

  updateStatement(id: StatementId, content: string): Statement | DomainError {
    const existing = this.statements.get(id.getValue());
    if (!existing) {
      return new DomainError('Statement not found');
    }

    // Check if statement is used in any OrderedSet
    if (this.isStatementInUse(id)) {
      return new DomainError('Cannot update statement that is in use');
    }

    const updated = Statement.create(content);
    if (updated instanceof DomainError) {
      return updated;
    }

    // Preserve the ID
    const withSameId = new Statement(id, updated.getContent());
    this.statements.set(id.getValue(), withSameId);
    this.version++;

    this.addEvent({
      type: 'StatementUpdated',
      aggregateId: this.id.getValue(),
      payload: {
        statementId: id.getValue(),
        oldContent: existing.getContent(),
        newContent: content
      }
    });

    return withSameId;
  }

  // OrderedSet operations - Critical for connections!
  createOrderedSet(statementIds: StatementId[]): OrderedSet | DomainError {
    // Validate all statements exist
    for (const stmtId of statementIds) {
      if (!this.statements.has(stmtId.getValue())) {
        return new DomainError(`Statement ${stmtId.getValue()} not found`);
      }
    }

    // Check if identical OrderedSet already exists
    const existing = this.findOrderedSetByContent(statementIds);
    if (existing) {
      return existing; // Return existing to maintain identity
    }

    const orderedSet = OrderedSet.create(statementIds);
    if (orderedSet instanceof DomainError) {
      return orderedSet;
    }

    this.orderedSets.set(orderedSet.getId().getValue(), orderedSet);
    this.orderedSetRegistry.set(orderedSet.getId().getValue(), new Set());
    this.version++;

    this.addEvent({
      type: 'OrderedSetCreated',
      aggregateId: this.id.getValue(),
      payload: {
        orderedSetId: orderedSet.getId().getValue(),
        statementIds: statementIds.map(id => id.getValue())
      }
    });

    return orderedSet;
  }

  // Create atomic argument and track OrderedSet usage
  createAtomicArgument(
    premiseSet: OrderedSet | null,
    conclusionSet: OrderedSet | null
  ): AtomicArgument | DomainError {
    // Validate OrderedSets belong to this document
    if (premiseSet && !this.orderedSets.has(premiseSet.getId().getValue())) {
      return new DomainError('Premise OrderedSet not in document');
    }
    if (conclusionSet && !this.orderedSets.has(conclusionSet.getId().getValue())) {
      return new DomainError('Conclusion OrderedSet not in document');
    }

    const argument = AtomicArgument.create(premiseSet, conclusionSet);
    if (argument instanceof DomainError) {
      return argument;
    }

    this.atomicArguments.set(argument.getId().getValue(), argument);
    
    // Register OrderedSet usage - this tracks connections!
    if (premiseSet) {
      this.registerOrderedSetUsage(premiseSet.getId(), argument.getId(), 'premise');
    }
    if (conclusionSet) {
      this.registerOrderedSetUsage(conclusionSet.getId(), argument.getId(), 'conclusion');
    }
    
    this.version++;

    this.addEvent({
      type: 'AtomicArgumentCreated',
      aggregateId: this.id.getValue(),
      payload: {
        argumentId: argument.getId().getValue(),
        premiseSetId: premiseSet?.getId().getValue() || null,
        conclusionSetId: conclusionSet?.getId().getValue() || null
      }
    });

    return argument;
  }

  // Connection discovery operations
  findConnectionsForArgument(argumentId: ArgumentId): ArgumentConnection[] {
    const connections: ArgumentConnection[] = [];
    const argument = this.atomicArguments.get(argumentId.getValue());
    if (!argument) return connections;

    // Find arguments that can provide premises
    const premiseSet = argument.getPremiseSet();
    if (premiseSet) {
      const providers = this.findArgumentsProvidingOrderedSet(premiseSet.getId());
      for (const provider of providers) {
        if (provider.getId().getValue() !== argumentId.getValue()) {
          connections.push({
            type: 'consumes',
            fromId: provider.getId(),
            toId: argumentId,
            viaOrderedSetId: premiseSet.getId()
          });
        }
      }
    }

    // Find arguments that can consume conclusions
    const conclusionSet = argument.getConclusionSet();
    if (conclusionSet) {
      const consumers = this.findArgumentsConsumingOrderedSet(conclusionSet.getId());
      for (const consumer of consumers) {
        if (consumer.getId().getValue() !== argumentId.getValue()) {
          connections.push({
            type: 'provides',
            fromId: argumentId,
            toId: consumer.getId(),
            viaOrderedSetId: conclusionSet.getId()
          });
        }
      }
    }

    return connections;
  }

  private findArgumentsProvidingOrderedSet(setId: OrderedSetId): AtomicArgument[] {
    const providers: AtomicArgument[] = [];
    for (const arg of this.atomicArguments.values()) {
      if (arg.getConclusionSet()?.getId().getValue() === setId.getValue()) {
        providers.push(arg);
      }
    }
    return providers;
  }

  private findArgumentsConsumingOrderedSet(setId: OrderedSetId): AtomicArgument[] {
    const consumers: AtomicArgument[] = [];
    for (const arg of this.atomicArguments.values()) {
      if (arg.getPremiseSet()?.getId().getValue() === setId.getValue()) {
        consumers.push(arg);
      }
    }
    return consumers;
  }

  // Connection queries
  findSharedOrderedSets(): SharedOrderedSet[] {
    const shared: SharedOrderedSet[] = [];
    
    for (const [setId, usages] of this.orderedSetRegistry.entries()) {
      if (usages.size > 1) {
        const orderedSet = this.orderedSets.get(setId);
        if (orderedSet) {
          shared.push({
            orderedSet,
            usages: Array.from(usages).map(usage => {
              const [argId, role] = usage.split(':');
              return { argumentId: argId, role: role as 'premise' | 'conclusion' };
            })
          });
        }
      }
    }
    
    return shared;
  }

  // Private helper methods
  private registerOrderedSetUsage(
    setId: OrderedSetId,
    argumentId: ArgumentId,
    role: 'premise' | 'conclusion'
  ): void {
    const registry = this.orderedSetRegistry.get(setId.getValue());
    if (!registry) return;
    
    const usage = `${argumentId.getValue()}:${role}`;
    const wasShared = registry.size > 1;
    registry.add(usage);
    const isNowShared = registry.size > 1;
    
    // Emit event when OrderedSet becomes shared
    if (!wasShared && isNowShared) {
      this.addEvent({
        type: 'OrderedSetBecameShared',
        aggregateId: this.id.getValue(),
        payload: {
          orderedSetId: setId.getValue(),
          usages: Array.from(registry)
        }
      });
    }
  }

  private isStatementInUse(statementId: StatementId): boolean {
    for (const orderedSet of this.orderedSets.values()) {
      if (orderedSet.contains(statementId)) {
        return true;
      }
    }
    return false;
  }

  private findOrderedSetByContent(statementIds: StatementId[]): OrderedSet | null {
    for (const orderedSet of this.orderedSets.values()) {
      const candidate = OrderedSet.create(statementIds);
      if (!(candidate instanceof DomainError) && orderedSet.hasSameContent(candidate)) {
        return orderedSet;
      }
    }
    return null;
  }

  // Validation operations
  validateConnections(): ConnectionValidationResult {
    const cycles = this.detectCycles();
    const orphans = this.findOrphanedArguments();
    const inconsistencies = this.findInconsistentConnections();
    
    return {
      isValid: cycles.length === 0 && inconsistencies.length === 0,
      cycles,
      orphans,
      inconsistencies
    };
  }

  private detectCycles(): ArgumentCycle[] {
    // Domain service would implement full cycle detection
    const cycles: ArgumentCycle[] = [];
    // ... cycle detection logic
    return cycles;
  }

  private findOrphanedArguments(): ArgumentId[] {
    const orphans: ArgumentId[] = [];
    for (const arg of this.atomicArguments.values()) {
      const connections = this.findConnectionsForArgument(arg.getId());
      if (connections.length === 0) {
        orphans.push(arg.getId());
      }
    }
    return orphans;
  }

  private findInconsistentConnections(): ConnectionInconsistency[] {
    // Check for invalid connections
    const inconsistencies: ConnectionInconsistency[] = [];
    // ... validation logic
    return inconsistencies;
  }

  // Event handling
  private addEvent(event: DomainEvent): void {
    this.domainEvents.push({
      ...event,
      occurredAt: new Date(),
      version: this.version
    });
  }

  pullEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  // Getters
  getId(): ProofDocumentId { return this.id; }
  getVersion(): number { return this.version; }
  
  // For queries
  getStatement(id: StatementId): Statement | null {
    return this.statements.get(id.getValue()) || null;
  }
  
  getOrderedSet(id: OrderedSetId): OrderedSet | null {
    return this.orderedSets.get(id.getValue()) || null;
  }
  
  getArgument(id: ArgumentId): AtomicArgument | null {
    return this.atomicArguments.get(id.getValue()) || null;
  }
  
  getStats(): DocumentStats {
    return {
      statementCount: this.statements.size,
      orderedSetCount: this.orderedSets.size,
      argumentCount: this.atomicArguments.size,
      sharedOrderedSetCount: this.findSharedOrderedSets().length
    };
  }
}

// Value object for document ID
export class ProofDocumentId {
  private constructor(private readonly value: string) {}
  
  static generate(): ProofDocumentId {
    return new ProofDocumentId(
      `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
  }
  
  getValue(): string { return this.value; }
}

// Domain types for connections and validation
interface SharedOrderedSet {
  orderedSet: OrderedSet;
  usages: Array<{
    argumentId: string;
    role: 'premise' | 'conclusion';
  }>;
}

interface ArgumentConnection {
  type: 'provides' | 'consumes';
  fromId: ArgumentId;
  toId: ArgumentId;
  viaOrderedSetId: OrderedSetId;
}

interface ConnectionValidationResult {
  isValid: boolean;
  cycles: ArgumentCycle[];
  orphans: ArgumentId[];
  inconsistencies: ConnectionInconsistency[];
}

interface ArgumentCycle {
  path: ArgumentId[];
  severity: 'low' | 'medium' | 'high';
}

interface ConnectionInconsistency {
  type: 'missing_premise' | 'dangling_conclusion' | 'type_mismatch';
  argumentId: ArgumentId;
  details: string;
}

interface DocumentStats {
  statementCount: number;
  orderedSetCount: number;
  argumentCount: number;
  sharedOrderedSetCount: number;
}
```

### 2. Domain Events
Create `src/domain/events/DomainEvent.ts`:
```typescript
// Domain events are plain objects - no behavior
export interface DomainEvent {
  type: string;
  aggregateId: string;
  payload: Record<string, any>;
  occurredAt?: Date;
  version?: number;
}
```

### 3. Repository Interface (Domain defines, Infrastructure implements)
Create `src/domain/repositories/IProofDocumentRepository.ts`:
```typescript
import { ProofDocument, ProofDocumentId } from '../aggregates/ProofDocument.js';

export interface IProofDocumentRepository {
  findById(id: ProofDocumentId): Promise<ProofDocument | null>;
  save(document: ProofDocument): Promise<void>;
  nextIdentity(): ProofDocumentId;
}
```

## Testing Requirements

### Aggregate Tests
```typescript
describe('ProofDocument', () => {
  test('tracks OrderedSet sharing for connections', () => {
    const doc = ProofDocument.create();
    
    // Create statements
    const s1 = doc.createStatement('All men are mortal');
    const s2 = doc.createStatement('Socrates is a man');
    const s3 = doc.createStatement('Socrates is mortal');
    
    // Create OrderedSet for premise
    const premiseSet = doc.createOrderedSet([s1.getId(), s2.getId()]);
    
    // Create OrderedSet for conclusion
    const conclusionSet = doc.createOrderedSet([s3.getId()]);
    
    // Create two arguments sharing the conclusion set
    const arg1 = doc.createAtomicArgument(premiseSet, conclusionSet);
    const arg2 = doc.createAtomicArgument(conclusionSet, null); // Uses as premise!
    
    // Check shared OrderedSets
    const shared = doc.findSharedOrderedSets();
    expect(shared).toHaveLength(1);
    expect(shared[0].orderedSet).toBe(conclusionSet); // Same reference
    expect(shared[0].usages).toHaveLength(2);
  });

  test('emits OrderedSetBecameShared event', () => {
    const doc = ProofDocument.create();
    // ... create scenario where OrderedSet becomes shared
    
    const events = doc.pullEvents();
    const sharedEvent = events.find(e => e.type === 'OrderedSetBecameShared');
    expect(sharedEvent).toBeDefined();
  });

  test('enforces consistency rules', () => {
    const doc = ProofDocument.create();
    const stmt = doc.createStatement('Test');
    const set = doc.createOrderedSet([stmt.getId()]);
    
    // Cannot update statement in use
    const updateResult = doc.updateStatement(stmt.getId(), 'Changed');
    expect(updateResult).toBeInstanceOf(DomainError);
  });

  test('finds connections through shared OrderedSets', () => {
    const doc = ProofDocument.create();
    
    // Create statements
    const s1 = doc.createStatement('A');
    const s2 = doc.createStatement('B');
    const s3 = doc.createStatement('C');
    
    // Create OrderedSets
    const set1 = doc.createOrderedSet([s1.getId()]);
    const set2 = doc.createOrderedSet([s2.getId()]);
    const set3 = doc.createOrderedSet([s3.getId()]);
    
    // Create connected arguments: arg1 produces set2, arg2 consumes set2
    const arg1 = doc.createAtomicArgument(set1, set2);
    const arg2 = doc.createAtomicArgument(set2, set3); // Shares set2!
    
    // Find connections
    const connections1 = doc.findConnectionsForArgument(arg1.getId());
    expect(connections1).toHaveLength(1);
    expect(connections1[0].type).toBe('provides');
    expect(connections1[0].toId).toBe(arg2.getId());
    
    const connections2 = doc.findConnectionsForArgument(arg2.getId());
    expect(connections2).toHaveLength(1);
    expect(connections2[0].type).toBe('consumes');
    expect(connections2[0].fromId).toBe(arg1.getId());
  });

  test('validates connections and detects orphans', () => {
    const doc = ProofDocument.create();
    
    // Create orphaned argument
    const s1 = doc.createStatement('Orphan');
    const set1 = doc.createOrderedSet([s1.getId()]);
    const orphan = doc.createAtomicArgument(set1, null);
    
    // Validate
    const validation = doc.validateConnections();
    expect(validation.orphans).toContain(orphan.getId());
  });
});
```

## Success Criteria
- [ ] Aggregate maintains all consistency rules
- [ ] OrderedSet registry tracks sharing (connections)
- [ ] All state changes emit domain events
- [ ] Repository interface defined (not implemented)
- [ ] No infrastructure dependencies
- [ ] Version tracking for optimistic locking
- [ ] Event sourcing ready (pullEvents pattern)
- [ ] Connection discovery through shared OrderedSets
- [ ] Validation logic for cycles and orphans
- [ ] NO spatial/visual concepts (trees, nodes, positions)
- [ ] Pure domain logic only

## Notes
- ProofDocument is the transaction boundary
- OrderedSet sharing detection is core to connection discovery
- Events are plain objects (no behavior)
- Repository interface in domain, implementation in infrastructure
- Consider event sourcing for audit trail
- Trees and visualization are PRESENTATION concerns, handled in UI layer
- Domain focuses on logical connections only