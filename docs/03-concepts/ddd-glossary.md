# Domain-Driven Design Glossary

This glossary maps between **Domain Language** (what users say) and **Implementation Language** (how it's built). For concept definitions, see [Key Terms](./key-terms.md).

## Architectural Layers

### CORE [CORE]
Platform-agnostic business logic that forms the heart of Proof Editor. Includes all logical structures, relationships, and operations that work identically across all platforms (desktop, mobile, web).

### LSP [LSP]
Language Server Protocol features providing intelligent assistance. Includes validation, analysis, diagnostics, and language-specific intelligence. Works across platforms via transport abstraction (stdio for desktop, WebSocket for mobile).

### PLATFORM [PLATFORM]
Platform-specific integrations and UI. Includes file system access, native UI components, keyboard/touch handling, and platform services. Each platform (VS Code, React Native) implements these differently while exposing consistent interfaces to CORE.

## Core Principle

Domain concepts exist independently of implementation. An atomic argument IS a relation - HOW we store it is a separate concern.

## Domain → Implementation Mappings

| Domain Concept | Implementation | Layer | Purpose |
|----------------|----------------|-------|---------|
| Ordered set | OrderedSetEntity | [CORE] | Store ordered collections with uniqueness |
| Atomic argument | AtomicArgumentEntity | [CORE] | Store relation between ordered sets |
| Direct connection | Shared ordered set references | [CORE] | Implicit through object identity |
| Argument tree | Graph structure (DAG) | [CORE] | Efficient representation |
| Document | Spatial positions + metadata | [CORE] | Separate logic from layout |
| Path-complete | Graph algorithm | [CORE] | Computed property |
| Language layer | Plugin interface | [LSP] | Modular interpretation |
| Validation | Language server analysis | [LSP] | User-defined correctness |
| File operations | Platform file system | [PLATFORM] | Load/save documents |
| Command system | Platform command palette | [PLATFORM] | User interactions |
| UI rendering | Platform view layer | [PLATFORM] | Display proof visualization |

## What Users Say → What System Does

| User Says | System Does | Layer |
|-----------|-------------|-------|
| "Create an atomic argument" | Instantiate AtomicArgumentEntity, reference OrderedSetEntities | [CORE] |
| "Connect these arguments" | Share the same OrderedSetEntity reference between arguments | [CORE] |
| "Show the complete tree" | Traverse graph for maximal component | [CORE] |
| "Save my document" | Persist entities via platform file system | [PLATFORM] |
| "Validate my proof" | Run language server analysis | [LSP] |
| "Open command menu" | Show platform command interface | [PLATFORM] |

## Bounded Contexts

Domain-Driven Design requires strict separation between different contexts:

### User Domain (What users see and say)
✅ Use: argument, tree, connection, premise, conclusion  
❌ Never: node, edge, graph, entity, index, data structure

**Example**: "Connect these two arguments by using this conclusion as a premise"

### Technical Domain (How developers build it)  
✅ Use: Implementation terms when describing HOW  
✅ Also use: Domain terms when explaining WHAT  
⚠️ Always clarify: "Trees (internally represented as graphs)"

**Example**: "Connections exist implicitly when AtomicArgumentEntity instances share ordered set references"

### Translation Layer (UI/API)
- Accepts user domain language
- Internally uses technical implementation
- Returns results in user domain language
- Abstracts platform differences

## Common Misunderstandings

### "Trees aren't really trees, they're graphs"
**Wrong thinking**: The implementation invalidates the domain concept.  
**Right thinking**: Users conceptualize tree-like structures. That we implement them using graph data structures is irrelevant to the domain model.

### "Connections are just string matching"
**Wrong thinking**: If strings match, they're automatically connected.  
**Right thinking**: Connections exist when atomic arguments share the SAME ordered set object (by reference). When users create connections, they're establishing that one argument's conclusion set IS another's premise set.

### "Everything should be technically accurate"
**Wrong thinking**: User docs should mention graphs, entities, indices.  
**Right thinking**: User docs use user language exclusively. Technical accuracy belongs in technical docs.

## Key Implementation Notes

- **Trees are graphs** [CORE]: Users think "trees", code uses graph structures (specifically DAGs)
- **Connections are implicit** [CORE]: Exist through shared ordered set references, not separate entities
- **Reference equality matters** [CORE]: Same object (===), not value equality
- **Arguments are computed** [CORE]: Not stored as entities
- **Semantic neutrality** [LSP]: Platform manipulates strings; language layers provide meaning
- **Platform abstraction** [PLATFORM]: Core logic works identically across all platforms