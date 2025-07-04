# Proof Editor - CLEAN Architecture Overview

## Core Principles

### 1. The Dependency Rule
**Dependencies point INWARD only**. No layer knows about layers above it.

```
Presentation → Application → Domain ← Infrastructure
                              ↑
                    (zero dependencies)
```

### 2. Layer Responsibilities

#### Domain Layer (Core Business Logic)
- **Entities**: Statement, OrderedSet, AtomicArgument, ProofNode, ProofTree
- **Aggregate**: ProofDocument (consistency boundary)
- **Services**: OrderedSetIdentityService, TreeAttachmentService, CycleDetectionService
- **Events**: Plain objects representing state changes
- **Zero dependencies**: Pure TypeScript, no frameworks

#### Application Layer (Use Case Orchestration)
- **Commands/Queries**: DTOs defining the API boundary
- **Handlers**: Execute use cases by orchestrating domain
- **Mappers**: Translate between domain entities and DTOs
- **Ports**: Interfaces for infrastructure to implement
- **Thin layer**: No business logic, just orchestration

#### Infrastructure Layer (Technical Adapters)
- **Repositories**: Implement domain repository interfaces
- **Event Bus**: Distribute domain events
- **File System**: YAML persistence
- **Platform Adapters**: VS Code, React Native implementations
- **All I/O**: Database, file system, network, UI frameworks

#### Presentation Layer (User Interface)
- **Controllers**: Handle user input, call application layer
- **Views**: Display components (webview, mobile)
- **Presenters**: Format data for display
- **View State**: UI-specific state (selection, zoom)
- **No business logic**: Display and input only

## Key Domain Insights

### OrderedSet Identity = Connection Mechanism
When two AtomicArguments share the **same OrderedSet object** (not just equal content), they are connected. This is THE core mechanism enabling proof flow.

### Tree Structure vs Logical Connections
- **Connections**: WHAT can connect (via shared OrderedSets)
- **Tree Structure**: WHERE things connect (parent-child positions)
- These are separate concerns, both modeled in the domain

### Bottom-up Data Flow
In proof trees, children provide inputs TO parents (opposite of typical trees). This matches how logical arguments work - conclusions feed into premises.

## Implementation Phases

### Phase 1: Domain Foundation
1. **D1**: Core domain entities (Statement, OrderedSet, AtomicArgument)
2. **D2**: ProofDocument aggregate with OrderedSet registry
3. **D3**: Domain services (stateless business logic)

### Phase 2: Application Layer
1. **A1**: Command/Query DTOs (API contracts)
2. **A2**: Domain-DTO mappers (boundary translation)
3. **A3**: Application service (thin orchestration)

### Phase 3: Infrastructure
1. **I1**: Repository implementations (persistence)
2. **I2**: Event infrastructure (domain event distribution)
3. **I3**: Platform adapters (VS Code, file system)

### Phase 4: Presentation
1. **P1**: Controllers (user input handling)
2. **P2**: Views (display components)
3. **P3**: View state (UI-specific state)

## Critical Architecture Rules

1. **Domain Never Imports**: No Result<T,E>, no frameworks, no external dependencies
2. **DTOs at Boundaries**: Domain entities never cross layer boundaries
3. **Ports in Inner Layers**: Interfaces defined by domain/application, implemented by infrastructure
4. **Stateless Services**: If a service needs state, it should be an entity or aggregate
5. **Events are Values**: Domain events are plain objects with no behavior

## Example Flow: Creating a Statement

```
1. User types in UI
   ↓
2. View → Controller: handleCreateStatement("All men are mortal")
   ↓
3. Controller → Application: CreateStatementCommand { documentId, content }
   ↓
4. Application Handler:
   - Load ProofDocument from repository
   - Call document.createStatement(content) 
   - Save document to repository
   - Publish domain events
   - Map Statement to StatementDTO
   ↓
5. Application → Controller: CommandResult<StatementDTO>
   ↓
6. Controller → View: Update display with new statement
```

## What This Architecture Achieves

1. **True Independence**: Can compile domain layer standalone
2. **Testability**: Each layer can be tested in isolation
3. **Flexibility**: Can swap implementations without changing business logic
4. **Clarity**: Business logic is in one place (domain)
5. **Maintainability**: Changes don't cascade across layers

## Common Pitfalls Avoided

- ❌ Stateful "services" (really entities in disguise)
- ❌ DTOs in the wrong layer (UI instead of Application)
- ❌ Domain depending on infrastructure
- ❌ Business logic in controllers or views
- ❌ Platform coupling throughout codebase

## The Key Insight

**OrderedSet identity IS the connection mechanism**. This pure domain concept requires no database, no infrastructure, just object references. The entire proof construction logic flows from this simple idea.