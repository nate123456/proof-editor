# Proof Editor Development Tasks - CLEAN Architecture

This directory contains tasks following strict CLEAN Architecture + Domain-Driven Design principles.

## Architecture Overview

### Dependency Rule: Dependencies point INWARD only
```
Presentation → Application → Domain ← Infrastructure
                              ↑
                    (zero dependencies)
```

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER                          │
│  Controllers, Views, Presenters, View State                │
│  (Handles user interaction, display formatting)            │
├─────────────────────────────────────────────────────────────┤
│                 APPLICATION LAYER                           │
│  Commands, Queries, Handlers, DTOs, Mappers               │
│  (Orchestrates use cases, defines boundaries)             │
├─────────────────────────────────────────────────────────────┤
│                   DOMAIN LAYER                              │
│  Entities, Aggregates, Services, Events, Specs            │
│  (Pure business logic, zero dependencies)                 │
├─────────────────────────────────────────────────────────────┤
│               INFRASTRUCTURE LAYER                          │
│  Repositories, Event Bus, File System, Platform Adapters   │
│  (Implements application ports, handles I/O)               │
└─────────────────────────────────────────────────────────────┘
```

## Task Organization

### **Phase 1: Domain Layer (Pure Business Logic)**
Build the core domain with zero dependencies.

- **D0: Bootstrap Domain Logic** (`D0-bootstrap-domain-logic.md`) 🚨 **CRITICAL**
  - *Effort*: 2-3 hours
  - *Dependencies*: None
  - *Priority*: MUST DO FIRST - blocks all user interaction
  - Bootstrap service for empty documents and arguments
  - Enables users to start from scratch

- **D1: Core Domain Entities** (`D1-core-domain-entities.md`)
  - *Effort*: 4-5 hours
  - *Dependencies*: None
  - Statement, OrderedSet, AtomicArgument with neverthrow Result types
  - Create/reconstruct patterns, timestamps, usage tracking
  - Key insight: OrderedSet identity IS the connection mechanism

- **D2: ProofDocument Aggregate** (`D2-proof-document-aggregate.md`)
  - *Effort*: 5-6 hours
  - *Dependencies*: D1
  - Aggregate root with bootstrap support and spatial management
  - Branch creation from selected text
  - Transaction support, event emission

- **D3: Domain Services** (`D3-domain-services.md`)
  - *Effort*: 3-4 hours
  - *Dependencies*: D1, D2
  - OrderedSetIdentityService, TreeAttachmentService, CycleDetectionService
  - Pure, stateless domain logic

### **Phase 2: Application Layer (Use Cases)**
Orchestrate domain operations through commands and queries.

- **A1: Commands and Queries** (`A1-commands-queries.md`) 📝 **UPDATED**
  - *Effort*: 5-6 hours (increased due to additions)
  - *Dependencies*: None (DTOs only)
  - Command/Query DTOs with all missing operations
  - Includes: Bootstrap, Branch creation, Import/Export, Validation
  - Operation metadata pattern for tracking

- **A2: Domain Mappers** (`A2-domain-mappers.md`)
  - *Effort*: 3-4 hours
  - *Dependencies*: A1, D1
  - Translate between domain entities and DTOs
  - Maintain architectural boundaries

- **A3: Application Service** (`A3-application-service.md`)
  - *Effort*: 3-4 hours
  - *Dependencies*: A1, A2, D2
  - Thin orchestration layer
  - Handles transactions and event publishing

### **Phase 3: Platform Abstraction & Infrastructure**
Define ports first, then implement adapters.

- **I0: Platform Abstraction Interfaces** (`I0-platform-abstraction-interfaces.md`) 🆕 **CRITICAL**
  - *Effort*: 3-4 hours
  - *Dependencies*: None (interfaces only)
  - *Priority*: Define before any infrastructure work
  - File system, dialogs, storage, validation runtime ports
  - Enables VS Code, mobile, web platforms

- **I1: Repository Implementation** (`I1-repository-implementation.md`)
  - *Effort*: 4-5 hours
  - *Dependencies*: D2 interfaces, I0 ports
  - YAML-based persistence using file system port
  - Transaction support with optimistic locking

- **I2: Event Infrastructure** (`I2-event-infrastructure.md`)
  - *Effort*: 3-4 hours
  - *Dependencies*: A3 ports
  - Event bus and domain event dispatcher
  - Enables reactive updates

- **I3: VS Code Platform Adapters** (`I3-vscode-platform-adapters.md`)
  - *Effort*: 5-6 hours
  - *Dependencies*: I0 ports
  - Implements all platform ports for VS Code
  - File system, dialogs, notifications, webview rendering

- **I4: Mobile Platform Adapters** (`I4-mobile-platform-adapters.md`) 🔮 **FUTURE**
  - *Effort*: 6-8 hours
  - *Dependencies*: I0 ports
  - React Native implementations
  - Touch input, offline storage, mobile dialogs

### **Phase 4: Presentation Layer (UI)**
User interaction and display logic only.

- **P1: Controllers** (`P1-controllers.md`)
  - *Effort*: 3-4 hours
  - *Dependencies*: A1, A3
  - Handle user input, call application layer
  - No business logic

- **P2: Views** (`P2-views.md`)
  - *Effort*: 5-6 hours
  - *Dependencies*: P1
  - Webview components for display
  - Statement list, proof tree, argument builder

- **P3: View State** (`P3-view-state.md`)
  - *Effort*: 2-3 hours
  - *Dependencies*: P2
  - Selection, viewport, UI preferences
  - Pure presentation concerns

### **DELETED OLD TASKS**
The previous tasks violated CLEAN architecture:
- ❌ Platform concerns mixed with domain
- ❌ Stateful "services" (disguised entities)
- ❌ DTOs in wrong layer (UI instead of Application)
- ❌ Direct framework coupling
- ❌ Business logic in presentation layer

## Critical Architecture Principles

### **1. Dependency Rule (Most Important)**
- Dependencies point INWARD only
- Domain has ZERO dependencies (not even Result types)
- Outer layers implement interfaces defined by inner layers
- No layer knows about layers above it

### **2. Domain Purity**
- Domain contains only business logic
- No frameworks, no libraries, no I/O
- Domain events are plain objects
- Repository interfaces in domain, implementations in infrastructure

### **3. Application Layer = Orchestration**
- THIN layer - no business logic
- Defines use case boundaries (commands/queries)
- Handles transactions and consistency
- Maps between domain and DTOs

### **4. Infrastructure Implements Ports**
- Repositories implement domain interfaces
- Platform adapters implement application ports
- All I/O happens here
- Framework-specific code isolated here

### **5. Presentation = Display Only**
- Controllers handle user input
- Views display data
- Presenters format for display
- NO business logic whatsoever

## Implementation Order

### **Phase 0: Critical Foundation**
**MUST DO FIRST**:
1. D0: Bootstrap domain logic (blocks everything)
2. I0: Platform abstraction interfaces (enables multi-platform)

### **Phase 1: Domain Foundation**
Core domain with proper patterns:
1. D1: Core domain entities (with neverthrow, create/reconstruct)
2. D2: ProofDocument aggregate (with bootstrap, transactions)
3. D3: Domain services

### **Phase 2: Application Layer**
Defines boundaries and use cases:
1. A1: Commands and queries (expanded with all operations)
2. A2: Domain mappers (needs D1)
3. A3: Application service (needs all above)

### **Phase 3: Infrastructure**
Implements ports from inner layers:
1. I1: Repository implementation (with I0 ports)
2. I2: Event infrastructure
3. I3: VS Code platform adapters
4. I4: Mobile platform adapters (future)

### **Phase 4: Presentation**
User interface (can start after A1):
1. P1: Controllers
2. P2: Views
3. P3: View state

## Key Architecture Insights

### **Core Domain Insights**
1. **Bootstrap First**: Users must be able to start from empty
2. **OrderedSet Identity = Connections**: Shared object references create connections
3. **Tree Structure ≠ Connections**: Trees show WHERE, connections show WHAT
4. **Bottom-up Data Flow**: Children provide inputs to parents
5. **Arguments as Templates**: Reusable, instantiated as nodes
6. **Branch Creation**: Core workflow from selected text

### **Critical Gaps We Fixed**
1. **No bootstrap support** → Added D0 for empty states
2. **Missing platform abstraction** → Added I0 port interfaces
3. **Incomplete commands** → Expanded A1 with all operations
4. **No branch creation** → Added to domain and commands
5. **Wrong Result types** → Using neverthrow everywhere
6. **Missing patterns** → Added create/reconstruct, timestamps
7. **DTOs in wrong layer** → Moved to Application
8. **Stateful services** → Recognized as entities/aggregates

### **Proper Responsibilities**
- **Domain**: WHAT can be done (business rules)
- **Application**: WHEN to do it (use case flow)
- **Infrastructure**: HOW to persist/communicate
- **Presentation**: HOW to display/interact

## Success Metrics

1. **Zero Domain Dependencies**: Can compile domain layer standalone
2. **Layer Independence**: Can swap implementations without changing inner layers
3. **Business Logic Location**: 100% in domain layer
4. **Stateless Services**: No state in application services
5. **Port/Adapter Pattern**: All I/O through interfaces
6. **DTO Boundary**: Domain entities never cross layer boundaries
7. **Event Flow**: Domain → Application → Infrastructure → Presentation

## Layer-Specific Patterns

### **Domain Entity Pattern**
```typescript
// Pure domain - zero dependencies
export class OrderedSet {
  private constructor(
    private readonly id: OrderedSetId,
    private readonly statementIds: ReadonlyArray<StatementId>
  ) {}
  
  // Business logic only
  contains(statementId: StatementId): boolean {
    return this.statementIds.includes(statementId);
  }
}
```

### **Application Command Pattern**
```typescript
// Command DTO
export interface CreateStatementCommand {
  documentId: string;
  content: string;
}

// Handler orchestrates
export class CreateStatementHandler {
  async handle(command: CreateStatementCommand): Promise<StatementDTO> {
    const doc = await this.repo.findById(command.documentId);
    const statement = doc.createStatement(command.content);
    await this.repo.save(doc);
    await this.eventBus.publish(doc.pullEvents());
    return this.mapper.toDTO(statement);
  }
}
```

### **Infrastructure Adapter Pattern**
```typescript
// Implements port defined by application
export class VSCodeDialogAdapter implements IDialogPort {
  async prompt(message: string): Promise<string | null> {
    return vscode.window.showInputBox({ prompt: message });
  }
}
```

### **Presentation Controller Pattern**
```typescript
// Handles user input only
export class StatementController {
  constructor(private appService: ProofApplicationService) {}
  
  async createStatement(content: string): Promise<void> {
    const command = { documentId: this.docId, content };
    const result = await this.appService.createStatement(command);
    this.view.addStatement(result); // DTO only
  }
}
```

## Task Assignment Guidelines

### **For Implementation:**
1. **Start with domain**: Complete domain layer before moving outward
2. **Respect dependencies**: Inner layers cannot depend on outer layers
3. **No framework coupling**: Domain must be pure TypeScript
4. **DTOs at boundaries**: Never pass domain entities across layers
5. **Ports before adapters**: Define interfaces before implementations

### **Code Review Checklist:**
- [ ] Domain has zero imports from other layers
- [ ] Application only orchestrates, no business logic
- [ ] Infrastructure implements ports, doesn't define them
- [ ] Presentation has no business logic
- [ ] All I/O isolated in infrastructure
- [ ] Domain events are plain objects
- [ ] Stateless services (no private state)

## Current State vs Target Architecture

### **What Exists (Needs Refactoring)**
- Domain entities mixed with infrastructure concerns
- Services with state (should be entities)
- Platform code throughout layers
- DTOs in wrong layer
- Direct framework coupling
- No bootstrap support
- Missing branch creation workflow
- Custom Result type instead of neverthrow

### **What We're Building**
- Pure domain layer with neverthrow Results
- Bootstrap-first design (start from empty)
- Branch creation as core workflow
- Platform abstraction for multi-platform
- Thin application layer (orchestration only)
- Isolated infrastructure (all I/O)
- Clean presentation (display only)
- Proper dependency flow (inward only)

### **Migration Strategy**
1. Extract pure domain entities first
2. Move DTOs to application layer
3. Convert stateful services to aggregates
4. Isolate infrastructure behind ports
5. Refactor presentation to use controllers

## The Key Insight

**OrderedSet identity IS the connection mechanism**. When two atomic arguments share the same OrderedSet object reference, they are connected. This is pure domain logic that requires no infrastructure.

The tree structure shows WHERE arguments appear spatially. The OrderedSet connections show HOW arguments connect logically. These are separate concerns in the domain model.

## ⚠️ Critical Implementation Notes

1. **START WITH D0**: Bootstrap MUST work or users can't use the system
2. **USE NEVERTHROW**: All Result types must use neverthrow library
3. **PLATFORM FIRST**: Define I0 ports before any infrastructure work
4. **BRANCH CREATION**: Core workflow must be in domain and commands
5. **TEST EVERYTHING**: Especially bootstrap scenarios