# Domain-Driven Design Glossary

This glossary maps between **Domain Language** (what users say) and **Implementation Language** (how it's built). 

**IMPORTANT**: This document does NOT define concepts - it only shows how domain concepts map to implementation. For all conceptual definitions, see [Key Terms](./key-terms.md).

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
| Node | NodeEntity | [CORE] | Instance of atomic argument in tree structure |
| Tree position | TreeEntity with x,y coordinates | [CORE] | Spatial location in document workspace |
| Attachment | Parent-child relationship with position | [CORE] | How nodes connect in tree structure |
| Ordered set | OrderedSetEntity | [CORE] | Store ordered collections with uniqueness, serve as connection mechanism |
| Atomic argument | AtomicArgumentEntity | [CORE] | Store relation between ordered sets via references |
| Direct connection | **Shared ordered set *object references*** | [CORE] | Implicit through object identity, not content matching |
| Statement | String content | [CORE] | Reusable text that can appear in multiple ordered sets |
| Argument tree (logical) | Graph structure (DAG) | [CORE] | Maximal connected component |
| Tree structure (positional) | Parent-child node relationships | [CORE] | Explicit tree positions |
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
| "Add to tree" | Create NodeEntity with parent and position | [CORE] |
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
**Right thinking**: There are TWO different concepts:
1. **Argument trees** (logical): The maximal connected component of atomic arguments. Implemented as DAGs because premises can have multiple parents.
2. **Tree structure** (positional): The explicit parent-child relationships between node instances. This IS a proper tree where each node has exactly one parent.

### "Connections are just string matching"
**Wrong thinking**: If strings match, they're automatically connected.  
**Right thinking**: Connections exist when atomic arguments share the SAME ordered set object (by reference). When users create connections, they're establishing that one argument's conclusion set IS another's premise set.

### "Statement reuse creates connections"
**Wrong thinking**: If the same statement appears in multiple ordered sets, they're connected.
**Right thinking**: Statement reuse is independent of connections. The same statement string can appear in many different OrderedSetEntity *objects* without creating any connections. Connections require shared *object references*, not shared content.

### "Text matching creates connections"
**Wrong thinking**: If the same statement appears in multiple ordered sets, they're connected.
**Right thinking**: Statement reuse is independent of connections. The same statement string can appear in many different OrderedSetEntity *objects* without creating any connections. Connections require shared *object references*, not shared content. The file format uses string matching and YAML anchors *solely as deserialization mechanisms to reconstruct these shared object references at runtime; they do not define the underlying logical connection model*.

### "Everything should be technically accurate"
**Wrong thinking**: User docs should mention graphs, entities, indices.  
**Right thinking**: User docs use user language exclusively. Technical accuracy belongs in technical docs.

## Key Implementation Notes

- **Argument trees are graphs** [CORE]: Logical connections form DAGs (multiple parents possible)
- **Tree structure is explicit** [CORE]: Node parent-child relationships form proper trees
- **Arguments are templates** [CORE]: Can be instantiated multiple times as different nodes
- **Position determines structure** [CORE]: Tree structure comes from node attachments, not logical connections
- **Connections are implicit** [CORE]: Exist through shared ordered set references, not separate entities
- **Reference equality matters** [CORE]: Same object (===), not value equality
- **Arguments are computed** [CORE]: Not stored as entities
- **Statement reuse** [CORE]: Same statement strings can appear in multiple ordered sets without connections
- **Connection vs content separation** [CORE]: Connections are about shared references, not matching content
- **Semantic neutrality** [LSP]: Platform manipulates strings; language layers provide meaning
- **Platform abstraction** [PLATFORM]: Core logic works identically across all platforms