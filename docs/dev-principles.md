# Development Principles

This document outlines the core engineering values, coding standards, and architectural patterns that guide the development of Proof Editor. These principles ensure code quality, maintainability, and a consistent development experience.

## Core Engineering Values

### Domain-Driven Design (DDD)
- **Ubiquitous Language**: Code uses domain terms (Statement, AtomicArgument, not Node, Edge)
- **Bounded Contexts**: Clear separation between core logic, UI, and platform integration
- **Domain Model First**: Business logic independent of UI or persistence
- **Anti-Corruption Layer**: Platform adapters translate between domain and external systems

### Test-Driven Development (TDD)
- **Red-Green-Refactor**: Write failing test, make it pass, improve the code
- **Test First**: No production code without a failing test
- **Fast Feedback**: Unit tests run in milliseconds
- **Living Documentation**: Tests document intended behavior

### SOLID Principles
- **Single Responsibility**: Each class/function has one reason to change
- **Open/Closed**: Extend behavior through composition, not modification
- **Liskov Substitution**: Subtypes must be substitutable for base types
- **Interface Segregation**: Many specific interfaces over one general interface
- **Dependency Inversion**: Depend on abstractions, not concretions

### Simplicity Principles
- **KISS**: Simplest solution that works
- **YAGNI**: Build only what's needed now
- **Rule of Three**: Extract abstraction only after third occurrence
- **Explicit over Implicit**: Clear intent over clever code

## Modern TypeScript Practices

### Type Safety
```typescript
type SelectionState = 
  | { type: 'none' }
  | { type: 'argument'; id: string }
  | { type: 'statement'; argumentId: string; index: number };

const KEYBOARD_SHORTCUTS = {
  NEW_ARGUMENT: 'n',
  BRANCH: 'b',
  DELETE: 'Delete'
} as const;

type StatementId = string & { readonly brand: unique symbol };
type ArgumentId = string & { readonly brand: unique symbol };
```

### Functional Patterns
```typescript
const addStatement = (doc: Document, text: string): Document => ({
  ...doc,
  statements: {
    ...doc.statements,
    [generateId()]: { text, createdAt: Date.now() }
  }
});

const pipe = <T>(...fns: Array<(arg: T) => T>) => 
  (value: T) => fns.reduce((acc, fn) => fn(acc), value);

// Connections are empirical facts based on shared Statement IDs
// No complex computation needed - just find where the same Statement ID
// appears as both a conclusion (in one argument) and premise (in another)
const findConnections = (
  arguments: Record<ArgumentId, AtomicArgument>
): Connection[] => {
  const connections: Connection[] = [];
  
  // For each argument's conclusions
  Object.entries(arguments).forEach(([argId, arg]) => {
    arg.conclusions.forEach((conclusionId, conclusionIndex) => {
      // Find where this Statement ID is used as a premise
      Object.entries(arguments).forEach(([otherArgId, otherArg]) => {
        if (argId === otherArgId) return; // Skip self
        
        otherArg.premises.forEach((premiseId, premiseIndex) => {
          if (conclusionId === premiseId) {
            // Same Statement ID = connection exists
            connections.push({
              from: { argumentId: argId, conclusionIndex },
              to: { argumentId: otherArgId, premiseIndex }
            });
          }
        });
      });
    });
  });
  
  return connections;
};
```

### Error Handling
```typescript
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

class InvalidArgumentError extends Error {
  constructor(public readonly argumentId: string) {
    super(`Invalid argument: ${argumentId}`);
  }
}
```

## Code Quality Standards

### Self-Documenting Code

❌ **Avoid unclear names:**
```typescript
const calc = (a: number, b: number) => a * 0.1 + b * 0.9;
```

✅ **Use descriptive names:**
```typescript
const calculateWeightedAverage = (
  currentValue: number, 
  targetValue: number
) => currentValue * 0.1 + targetValue * 0.9;
```

### No Comments Policy
- Code explains WHAT and HOW
- Tests explain WHY
- Types provide constraints
- Function names describe behavior
- Exception: Complex algorithms may have paper citations

### Clean Git History
- No commented-out code
- No TODO comments in commits
- No historical explanations in code
- Each commit is deployable
- Squash work-in-progress commits

## Architecture Patterns

### Hexagonal Architecture
```
Domain (core)
  ↑
Ports (interfaces)
  ↑
Adapters (implementations)
```

### Dependency Rule
- Core logic has zero dependencies
- UI depends on core, not vice versa
- Platform adapters depend on both
- Dependencies point inward

### Repository Pattern
```typescript
interface StatementRepository {
  save(statement: Statement): Promise<void>;
  findById(id: StatementId): Promise<Statement | null>;
  findByIds(ids: StatementId[]): Promise<Statement[]>;
}

class InMemoryStatementRepository implements StatementRepository {
  private statements = new Map<StatementId, Statement>();
  
  async save(statement: Statement): Promise<void> {
    this.statements.set(statement.id, statement);
  }
  
  async findById(id: StatementId): Promise<Statement | null> {
    return this.statements.get(id) || null;
  }
  
  async findByIds(ids: StatementId[]): Promise<Statement[]> {
    return ids.map(id => this.statements.get(id)).filter(Boolean) as Statement[];
  }
}
```

## Testing Standards

### Test Naming
```typescript
describe('Statement', () => {
  describe('when creating from text', () => {
    it('generates unique ID', () => {});
    it('preserves original text', () => {});
    it('sets creation timestamp', () => {});
  });
});
```

### Test Structure
- Arrange: Set up test data
- Act: Execute the behavior
- Assert: Verify the outcome
- One assertion per test
- Test behavior, not implementation

### Test Data Builders
```typescript
const aStatement = (overrides?: Partial<Statement>): Statement => ({
  id: generateId(),
  text: 'Default statement text',
  createdAt: Date.now(),
  ...overrides
});

const statement = aStatement({ text: 'All men are mortal' });
```

## Performance Guidelines

### Lazy Evaluation
- Compute connections only when needed
- Use memoization for expensive calculations
- Virtual scrolling for large canvases

### Immutability with Performance
```typescript
import { produce } from 'immer';

const updateStatement = produce((draft: Document, id: StatementId, text: string) => {
  draft.statements[id].text = text;
  draft.statements[id].modifiedAt = Date.now();
});
```

## Code Review Checklist

Before submitting PR:
- [ ] All tests pass
- [ ] No comments (except algorithm citations)
- [ ] No console.log statements
- [ ] Types are explicit (no `any`)
- [ ] Functions are pure where possible
- [ ] No magic numbers/strings
- [ ] Follows naming conventions
- [ ] Single responsibility per function/class