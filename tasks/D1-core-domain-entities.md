# Task D1: Core Domain Entities

## Status
- **Phase**: 1 - Domain Layer
- **Priority**: Critical (Foundation)
- **Estimated Effort**: 4-5 hours
- **Dependencies**: None (domain has zero dependencies)
- **Blocks**: All other domain tasks

## Goal
Implement the core domain entities with pure business logic and zero framework dependencies. These entities represent the fundamental concepts of proof construction.

## Domain Understanding

### Key Concepts
1. **Statement**: Immutable text content that forms premises and conclusions
2. **OrderedSet**: Collection of statements with identity through object references
3. **AtomicArgument**: Connects premise OrderedSet to conclusion OrderedSet
4. **ProofNode**: Instance of an argument within a tree structure
5. **ProofTree**: Spatial organization of nodes

### Critical Insight
**OrderedSet identity IS the connection mechanism**. When two atomic arguments share the same OrderedSet object reference (not just equal content), they are connected. This enables the proof flow.

## Required Implementation

### 1. Statement (Value Object)
Create `src/domain/core/Statement.ts`:
```typescript
// Pure domain - zero dependencies
export class Statement {
  private constructor(
    private readonly id: StatementId,
    private readonly content: StatementContent
  ) {}

  static create(content: string): Statement | DomainError {
    const contentResult = StatementContent.create(content);
    if (contentResult instanceof DomainError) {
      return contentResult;
    }
    
    const id = StatementId.generate();
    return new Statement(id, contentResult);
  }

  getId(): StatementId { return this.id; }
  getContent(): string { return this.content.getValue(); }
  
  equals(other: Statement): boolean {
    return this.id.equals(other.id);
  }
}
```

### 2. OrderedSet (Entity with Identity)
Create `src/domain/core/OrderedSet.ts`:
```typescript
export class OrderedSet {
  private usageCount: number = 0;
  
  private constructor(
    private readonly id: OrderedSetId,
    private readonly statementIds: ReadonlyArray<StatementId>,
    private readonly timestamps: Timestamps
  ) {}

  static create(statementIds: StatementId[]): Result<OrderedSet, ValidationError> {
    // CRITICAL: Allow empty for bootstrap!
    if (statementIds.length === 0) {
      return ok(new OrderedSet(
        OrderedSetId.generate(),
        [],
        Timestamps.create()
      ));
    }
    
    // Check for duplicates while preserving order
    const seen = new Set<string>();
    for (const id of statementIds) {
      if (seen.has(id.getValue())) {
        return new DomainError('OrderedSet cannot contain duplicates');
      }
      seen.add(id.getValue());
    }
    
    return new OrderedSet(OrderedSetId.generate(), [...statementIds]);
  }

  // Identity comparison - same object reference
  isSameAs(other: OrderedSet): boolean {
    return this === other; // Object identity, not content!
  }
  
  // Content comparison
  hasSameContent(other: OrderedSet): boolean {
    if (this.statementIds.length !== other.statementIds.length) {
      return false;
    }
    return this.statementIds.every((id, i) => 
      id.equals(other.statementIds[i])
    );
  }
  
  contains(statementId: StatementId): boolean {
    return this.statementIds.some(id => id.equals(statementId));
  }
  
  getStatementIds(): ReadonlyArray<StatementId> {
    return this.statementIds;
  }
  
  getId(): OrderedSetId { return this.id; }
}
```

### 3. AtomicArgument (Entity)
Create `src/domain/core/AtomicArgument.ts`:
```typescript
export class AtomicArgument {
  private sideLabels: { left?: string; right?: string } = {};
  
  private constructor(
    private readonly id: ArgumentId,
    private readonly premiseSet: OrderedSet | null,
    private readonly conclusionSet: OrderedSet | null,
    private readonly timestamps: Timestamps
  ) {}

  static create(
    premiseSet: OrderedSet | null,
    conclusionSet: OrderedSet | null
  ): Result<AtomicArgument, ValidationError> {
    // CRITICAL: Allow empty for bootstrap!
    // Both can be null for initial empty argument
    return ok(new AtomicArgument(
      ArgumentId.generate(),
      premiseSet,
      conclusionSet,
      Timestamps.create()
    ));
  }
  
  static createEmpty(): AtomicArgument {
    // Bootstrap helper
    return new AtomicArgument(
      ArgumentId.generate(),
      null,
      null,
      Timestamps.create()
    );
  }
    
    return new AtomicArgument(
      ArgumentId.generate(),
      premiseSet,
      conclusionSet
    );
  }
  
  // Check if this argument connects to another via shared OrderedSet
  connectsTo(other: AtomicArgument): boolean {
    if (!this.conclusionSet || !other.premiseSet) {
      return false;
    }
    // Object identity check - same reference means connection!
    return this.conclusionSet === other.premiseSet;
  }
  
  updateSideLabels(labels: { left?: string; right?: string }): void {
    if (labels.left !== undefined) this.sideLabels.left = labels.left;
    if (labels.right !== undefined) this.sideLabels.right = labels.right;
  }
  
  getId(): ArgumentId { return this.id; }
  getPremiseSet(): OrderedSet | null { return this.premiseSet; }
  getConclusionSet(): OrderedSet | null { return this.conclusionSet; }
  getSideLabels(): Readonly<typeof this.sideLabels> { return this.sideLabels; }
}
```

### 4. Connection Tracking (Domain Logic)
Create `src/domain/core/ConnectionRegistry.ts`:
```typescript
// This tracks HOW arguments connect through shared OrderedSets
// NOT about visual trees or positioning
export class ConnectionRegistry {
  private connections: Map<string, Connection[]> = new Map();
  
  registerConnection(
    fromArgumentId: ArgumentId,
    toArgumentId: ArgumentId,
    viaOrderedSetId: OrderedSetId,
    connectionType: 'provides' | 'consumes'
  ): void {
    const key = fromArgumentId.getValue();
    if (!this.connections.has(key)) {
      this.connections.set(key, []);
    }
    
    this.connections.get(key)!.push({
      from: fromArgumentId,
      to: toArgumentId,
      via: viaOrderedSetId,
      type: connectionType
    });
  }
  
  findConnectionsFrom(argumentId: ArgumentId): Connection[] {
    return this.connections.get(argumentId.getValue()) || [];
  }
  
  findConnectionPaths(
    fromId: ArgumentId,
    toId: ArgumentId
  ): ConnectionPath[] {
    // Domain logic for finding logical paths
    // NOT about visual paths in trees
    const paths: ConnectionPath[] = [];
    // ... path finding logic
    return paths;
  }
}

interface Connection {
  from: ArgumentId;
  to: ArgumentId;
  via: OrderedSetId;
  type: 'provides' | 'consumes';
}

interface ConnectionPath {
  steps: ArgumentId[];
  sharedSets: OrderedSetId[];
}
```

### 5. Value Objects (Domain Only)
Create `src/domain/core/value-objects.ts`:
```typescript
import { Result, ok, err } from 'neverthrow';
import { ValidationError } from '../shared/errors.js';

// Timestamps for all entities
export class Timestamps {
  private constructor(
    private readonly createdAt: Date,
    private modifiedAt: Date
  ) {}
  
  static create(): Timestamps {
    const now = new Date();
    return new Timestamps(now, now);
  }
  
  static reconstruct(createdAt: Date, modifiedAt: Date): Timestamps {
    return new Timestamps(createdAt, modifiedAt);
  }
  
  markModified(): Timestamps {
    return new Timestamps(this.createdAt, new Date());
  }
  
  getCreatedAt(): Date { return this.createdAt; }
  getModifiedAt(): Date { return this.modifiedAt; }
}

// Continue with domain-only value objects...
```typescript
// All value objects are immutable with factory methods
export class StatementId {
  private constructor(private readonly value: string) {}
  
  static create(value: string): StatementId | DomainError {
    if (!value || value.trim().length === 0) {
      return new DomainError('StatementId cannot be empty');
    }
    return new StatementId(value);
  }
  
  static generate(): StatementId {
    return new StatementId(`stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }
  
  getValue(): string { return this.value; }
  equals(other: StatementId): boolean { return this.value === other.value; }
}

export class StatementContent {
  private constructor(private readonly value: string) {}
  
  static create(value: string): StatementContent | DomainError {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return new DomainError('Statement content cannot be empty');
    }
    if (trimmed.length > 1000) {
      return new DomainError('Statement content too long');
    }
    return new StatementContent(trimmed);
  }
  
  getValue(): string { return this.value; }
}

// Similar implementations for OrderedSetId, ArgumentId...
```

### 7. Domain Result Types
Create `src/domain/core/Result.ts`:
```typescript
// Using neverthrow as per DEV_PRINCIPLES.md
import { Result, ok, err } from 'neverthrow';
import { ValidationError } from '../shared/errors.js';

export { Result, ok, err } from 'neverthrow';
export type DomainResult<T> = Result<T, ValidationError>;
```

### 8. Entity Patterns (Existing Code)
All entities follow create/reconstruct pattern:
```typescript
export class Statement {
  private constructor(
    private readonly id: StatementId,
    private readonly content: StatementContent,
    private readonly timestamps: Timestamps
  ) {}

  // For new instances
  static create(content: string): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }
    
    const id = StatementId.generate();
    const timestamps = Timestamps.create();
    return ok(new Statement(id, contentResult.value, timestamps));
  }
  
  // For loading from persistence
  static reconstruct(
    id: StatementId,
    content: string,
    createdAt: Date,
    modifiedAt: Date
  ): Result<Statement, ValidationError> {
    const contentResult = StatementContent.create(content);
    if (contentResult.isErr()) {
      return err(contentResult.error);
    }
    
    const timestamps = Timestamps.reconstruct(createdAt, modifiedAt);
    return ok(new Statement(id, contentResult.value, timestamps));
  }

  // Bootstrap support
  static createEmpty(): Statement {
    // For bootstrap - bypass validation
    return new Statement(
      StatementId.generate(),
      new StatementContent(''),
      Timestamps.create()
    );
  }
}
```

### 6. Additional Domain Logic
The domain focuses purely on logical relationships:
- Statement content and identity
- OrderedSet composition and sharing
- AtomicArgument connections via shared OrderedSets
- Path completeness validation
- Cycle detection in logical connections

NOT in domain:
- Trees, nodes, positioning, bounds
- Visual layout or spatial concerns
- UI interactions or instructions

## Testing Requirements

### Unit Tests
- Value object creation and validation
- Entity business rules
- OrderedSet identity vs content comparison
- AtomicArgument connection detection
- Node attachment rules
- Tree node management

### Property-Based Tests
```typescript
// Example using fast-check
test('OrderedSet preserves order', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string(), { minLength: 1 }),
      (contents) => {
        const ids = contents.map(c => StatementId.generate());
        const set = OrderedSet.create(ids);
        if (!(set instanceof DomainError)) {
          const retrieved = set.getStatementIds();
          return ids.every((id, i) => id.equals(retrieved[i]));
        }
        return true;
      }
    )
  );
});
```

## Success Criteria
- [ ] Pure TypeScript with neverthrow for Result types
- [ ] All operations return Result<T, ValidationError>
- [ ] Create AND reconstruct patterns for all entities
- [ ] Bootstrap support (empty states allowed)
- [ ] Usage tracking for statements and ordered sets
- [ ] Timestamps on all entities
- [ ] NO spatial/visual concepts in domain
- [ ] Immutable value objects with factory methods
- [ ] Entity identity properly implemented
- [ ] OrderedSet identity enables connections
- [ ] Business rules enforced in domain
- [ ] 100% test coverage of domain logic

## Notes
- This is the foundation - must be perfect
- Using neverthrow Result types per DEV_PRINCIPLES
- Bootstrap scenarios are critical - empty states allowed
- Create/reconstruct pattern from existing codebase
- Usage tracking enables safe deletion
- NO trees, nodes, or positioning in domain - those are presentation
- Focus on business logic only: statements, ordered sets, arguments
- OrderedSet object identity is THE key to connections