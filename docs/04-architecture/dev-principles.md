# Development Principles

Universal software engineering principles for building maintainable, high-quality multi-platform TypeScript applications. These principles guide development across desktop, mobile, and web platforms while maintaining 90%+ code reuse.

## Core Engineering Values

### Domain-Driven Design (DDD)
- **Ubiquitous Language**: Code uses domain terms, not generic technical terms
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
- **DRY (Don't Repeat Yourself)**: Each piece of knowledge should have a single, unambiguous, authoritative representation
- **KISS (Keep It Simple, Stupid)**: Simplest solution that works is usually the best solution
- **YAGNI (You Aren't Gonna Need It)**: Build only what's needed now, not what you think you might need later
- **Rule of Three**: Extract abstraction only after third occurrence of duplication
- **Explicit over Implicit**: Clear intent over clever code
- **Principle of Least Surprise**: Code should behave as users expect

## Modern TypeScript Practices

### Type Safety
- Use strict TypeScript configuration (`strict: true`)
- Prefer union types over enums for better type narrowing
- Use branded types for distinct IDs to prevent mixing
- Leverage `const` assertions for immutable data structures
- Use discriminated unions for state management

### Functional Programming Patterns
```typescript
const pipe = <T>(...fns: Array<(arg: T) => T>) => 
  (value: T) => fns.reduce((acc, fn) => fn(acc), value);

// Function composition for data transformations
const processData = pipe(
  normalizeInput,
  validateData,
  transformToOutput
);
```

### Error Handling
```typescript
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

// Custom error classes for domain-specific errors
class ValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`);
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

### Immutability
- Use `readonly` for data that shouldn't change
- Prefer `const` assertions for configuration objects
- Use libraries like Immer for complex state updates
- Return new objects rather than mutating existing ones

## Architecture Patterns

### Three-Layer Platform Architecture
```
CORE (90%+ shared)
  ↑
LSP (language features)
  ↑
PLATFORM (<10% per platform)
```

**Layer Responsibilities:**

**CORE Layer:**
- Pure TypeScript business logic
- Zero platform dependencies
- Atomic arguments, connections, validation
- Works identically on all platforms

**LSP Layer:**
- Language-specific features via Language Server Protocol
- Transport-agnostic (stdio for desktop, WebSocket for mobile/web)
- Consistent protocol across platforms
- Optional enhancement layer

**PLATFORM Layer:**
- Thin adapters for each platform
- UI rendering (React for web/desktop, native for mobile)
- File I/O (VS Code APIs, mobile file systems, browser storage)
- Platform-specific features (sharing, notifications)

**Key Benefits:**
- 90%+ code reuse across platforms
- Platform features are enhancements, not requirements
- Easy to test core logic in isolation
- New platforms require only thin adapters

### Dependency Rule
- Core logic has zero dependencies
- UI depends on core, not vice versa
- Platform adapters depend on both
- Dependencies point inward
- Use dependency injection for loose coupling

### Repository Pattern
```typescript
// Abstract interface
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
}

// In-memory implementation for testing
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
  
  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values())
      .find(user => user.email === email) || null;
  }
}
```

**Principles:**
- Abstract data access behind interfaces
- Keep domain logic independent of persistence details
- Use dependency injection for testability
- Implement in-memory versions for testing

### Composition over Inheritance
- Favor object composition over class inheritance
- Use interfaces to define contracts
- Build complex behavior by combining simple parts
- Avoid deep inheritance hierarchies

## Testing Standards

### Test Naming
- Use descriptive test names that explain the behavior
- Structure tests with nested `describe` blocks for context
- Follow pattern: "when [condition] it [behavior]"
- Group tests by the component/behavior being tested

### Test Structure
- Arrange: Set up test data
- Act: Execute the behavior
- Assert: Verify the outcome
- One assertion per test
- Test behavior, not implementation

### Test Data Builders
```typescript
// Factory function pattern for test data
const aUser = (overrides?: Partial<User>): User => ({
  id: generateId(),
  name: 'Default User',
  email: 'user@example.com',
  createdAt: new Date(),
  ...overrides
});

// Usage in tests
const user = aUser({ name: 'John Doe', email: 'john@example.com' });
```

**Principles:**
- Create factory functions for test data creation
- Provide sensible defaults with override capabilities
- Use partial object spread for customization
- Name builders with descriptive prefixes (e.g., `aUser`, `anOrder`)

## Ultra-Fast Single-User Performance Guidelines

### Ultra-Fast Performance Optimization
- **Sub-10ms validation**: Target <10ms for most operations, <15ms for complex
- **Cache-first architecture**: ~0ms for cache hits, aggressive pre-warming
- **Single-user optimization**: Generous memory limits (128MB per language)
- **Hot reload performance**: <100ms for language switching
- **Pre-warming strategy**: Start contexts early, cache everything practical
- Use lazy evaluation to defer expensive computations
- Implement memoization for frequently accessed calculations
- Create indices for common query patterns
- Cache results of expensive operations with proper invalidation
- Prefer O(1) lookups over O(n) scans
- Use generous LRU caches (single-user means no memory contention)
- Profile before optimizing, measure after optimizing

### Single-User Performance Architecture
```
Validation Request
       ↓
Cache Check (0ms) → Pattern Match (1-3ms) → JS Rule (2-5ms) → Result
                             ↑
                    Cache Miss Path Only
```

### Platform-Specific Performance
- **Desktop**: Worker threads for parallel processing, generous memory
- **Mobile**: Direct execution for lower latency, smart caching
- **Web**: SharedArrayBuffer when available, service worker caching

### Immutability with Performance
```typescript
import { produce } from 'immer';

const updateEntity = produce((draft: State, id: string, updates: Partial<Entity>) => {
  Object.assign(draft.entities[id], updates);
  draft.entities[id].modifiedAt = Date.now();
});
```

## Platform Abstraction Principles

### Design for the Constraint
- Assume mobile constraints (offline, battery, touch) for all features
- Desktop/web get progressive enhancements
- Every interaction must work with touch
- Network is optional, not required

### Platform Interface Design
```typescript
// Core defines the interface
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(dir: string): Promise<string[]>;
}

// Each platform implements
class VSCodeFileSystem implements FileSystem { /*...*/ }
class MobileFileSystem implements FileSystem { /*...*/ }
class BrowserFileSystem implements FileSystem { /*...*/ }
```

### Feature Parity Strategy
- Core features work identically everywhere
- Platform features enhance but don't gate functionality
- Graceful degradation when platform features unavailable
- User data syncs seamlessly between platforms

### Mobile-First Patterns
- Touch targets minimum 44x44 points
- Gesture support (pinch, swipe, long-press)
- Ultra-fast response times (sub-10ms validation even on mobile)
- Aggressive caching for offline-first experience
- Smart battery optimization that doesn't sacrifice performance
- Pre-warmed contexts for instant startup
- Responsive to orientation changes

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
- [ ] Core logic has zero platform dependencies
- [ ] Platform code behind clean interfaces
- [ ] Works on mobile constraints
- [ ] Meets ultra-fast performance targets (<10ms validation)
- [ ] Implements appropriate caching strategies
- [ ] Optimized for single-user experience
- [ ] Pre-warming strategies implemented where beneficial

## Summary

These principles provide a foundation for building maintainable, testable, and performant TypeScript applications. Apply them within your specific domain context while maintaining focus on:

- **Domain clarity**: Use your domain's language throughout the codebase
- **Test coverage**: Every important behavior should have tests
- **Performance**: Optimize based on actual measurements, not assumptions
- **Maintainability**: Code should be easy to understand and modify
- **Type safety**: Leverage TypeScript's type system to prevent runtime errors

Remember: These are guidelines, not rigid rules. Adapt them to your specific context and requirements.