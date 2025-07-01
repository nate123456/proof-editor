# Test Directory Structure

This document outlines the co-located test directory structure for the Proof Editor project, organized using Domain-Driven Design (DDD) principles.

## Organization Strategy

### Co-Location Principle
Tests are organized in `__tests__/` directories that mirror the source code structure. This approach provides:
- **Proximity**: Tests are located near the code they test
- **Discoverability**: Easy to find relevant tests
- **Maintainability**: Changes to source code immediately highlight related tests
- **Context**: Test organization reflects domain organization

### Domain-Driven Design Structure
The project follows DDD architecture with bounded contexts, and the test structure reflects this:

```
src/
├── contexts/                    # Bounded Contexts
│   ├── analysis/
│   ├── language-intelligence/
│   ├── package-ecosystem/
│   └── synchronization/
└── domain/                      # Core Domain
```

Each context contains its own domain layer with the standard DDD building blocks.

## Directory Structure

### Core Domain Context (`src/domain/`)
```
src/domain/__tests__/
├── aggregates/          # Aggregate root tests
├── entities/            # Entity tests  
├── errors/              # Domain error tests
├── events/              # Domain event tests
├── factories/           # Test factories and builders
├── repositories/        # Repository interface tests
├── services/            # Domain service tests
├── shared/              # Shared domain logic tests
├── example-integration.test.ts
├── result.test.ts
└── test-setup.ts
```

### Analysis Context (`src/contexts/analysis/`)
```
src/contexts/analysis/domain/__tests__/
├── entities/            # Analysis-specific entities
├── errors/              # Analysis error tests
├── shared/              # Shared analysis logic
└── value-objects/       # Analysis value object tests
```

### Language Intelligence Context (`src/contexts/language-intelligence/`)
```
src/contexts/language-intelligence/domain/__tests__/
├── entities/            # Language package, diagnostic, etc.
├── errors/              # Language intelligence errors
├── repositories/        # Repository interface tests
├── services/            # Language intelligence services
└── value-objects/       # Language intelligence VOs
```

### Package Ecosystem Context (`src/contexts/package-ecosystem/`)
```
src/contexts/package-ecosystem/domain/__tests__/
├── entities/            # Package, dependency entities
├── repositories/        # Package repository tests
├── services/            # Package services (resolution, validation)
├── types/               # Common types and domain errors
└── value-objects/       # Package ecosystem value objects
```

### Synchronization Context (`src/contexts/synchronization/`)
```
src/contexts/synchronization/domain/__tests__/
├── entities/            # Sync state, operations, conflicts
├── repositories/        # Synchronization repositories
├── services/            # CRDT, conflict resolution services
└── value-objects/       # Sync-related value objects
```

## Test Types by Directory

### `/entities/`
- Entity creation and validation
- Business rule enforcement
- Entity state transitions
- Aggregate root behavior

### `/value-objects/`
- Value object immutability
- Validation rules
- Equality semantics
- Factory methods

### `/services/`
- Domain service orchestration
- Business logic coordination
- Integration between entities
- Complex business rules

### `/repositories/`
- Repository interface contracts
- Mock implementations for testing
- Query behavior validation

### `/errors/`
- Domain-specific error conditions
- Error message formatting
- Error propagation behavior

### `/events/`
- Domain event creation
- Event payload validation
- Event handling behavior

### `/aggregates/`
- Aggregate consistency boundaries
- Transaction behavior
- Complex business workflows

### `/shared/`
- Cross-cutting domain concerns
- Shared utilities and helpers
- Common value objects
- Result type behavior

### `/factories/`
- Test data builders
- Entity factories for testing
- Complex object construction helpers

## Testing Conventions

### File Naming
- Test files use `.test.ts` extension
- Mirror source file names: `Entity.ts` → `Entity.test.ts`
- Use descriptive names for integration tests

### Test Organization
- Group related tests by bounded context
- Separate unit tests from integration tests
- Use factories for complex test data setup

### Dependencies
- Each context tests should be independent
- Minimize cross-context dependencies in tests
- Use mocks for external dependencies

## Scalability Considerations

### Growth Pattern
- New bounded contexts get their own `__tests__/` structure
- Application and infrastructure layers can be added later
- Each layer maintains its own test organization

### Maintenance
- Test structure mirrors source structure changes
- Refactoring source code requires updating test organization
- Clear separation enables parallel development

## Benefits of This Structure

1. **Domain Clarity**: Tests reflect business domain organization
2. **Bounded Context Isolation**: Each context can be tested independently
3. **Developer Experience**: Easy to find and run relevant tests
4. **Maintainability**: Changes to domain structure are reflected in tests
5. **Scalability**: Structure supports project growth without reorganization