# Domain-Driven Design Glossary

This glossary maps between **Domain Language** (what users say) and **Implementation Language** (how it's built). 

**IMPORTANT**: This document does NOT define concepts - it only shows how domain concepts map to implementation. For all conceptual definitions, see [Key Terms](./key-terms.md).

## Architectural Layers

### CORE [CORE]
Platform-agnostic business logic that forms the heart of Proof Editor. Includes all logical structures, relationships, and operations that work identically across all platforms (desktop, mobile, web).

### LSP [LSP]
Language Server Protocol features providing intelligent assistance. Includes validation, analysis, diagnostics, and language-specific intelligence. Works across platforms via transport abstraction (stdio for desktop, local threads with JSI for mobile).

### PLATFORM [PLATFORM]
Platform-specific integrations and UI. Includes file system access, native UI components, keyboard/touch handling, and platform services. Each platform (VS Code, React Native) implements these differently while exposing consistent interfaces to CORE.

## Core Principle

Domain concepts exist independently of implementation. A statement IS a building block that flows through processing units - HOW we store and track this flow is a separate concern.

## Domain → Implementation Mappings

| Domain Concept | Implementation | Layer | Purpose |
|----------------|----------------|-------|---------|
| Statement | String content with unique ID | [CORE] | Fundamental building blocks that flow through system |
| Processing unit | AtomicArgumentEntity with Statement arrays | [CORE] | Transform input statements to output statements |
| Statement flow | **Statement identity at specific positions** | [CORE] | Statements moving from outputs to inputs |
| Connection | AtomicArg1.conclusions[i] = AtomicArg2.premises[j] | [CORE] | Same Statement object at specific positions |
| Node | NodeEntity | [CORE] | Physical instance of processing unit in tree |
| Tree position | TreeEntity with x,y coordinates | [CORE] | Spatial location of flow network |
| Attachment | Parent-child relationship with position | [CORE] | How statements flow between nodes |
| Flow network (logical) | Graph structure (DAG) | [CORE] | Complete statement flow system |
| Tree structure (physical) | Parent-child node relationships | [CORE] | Physical positioning of processing units |
| Document | Physical workspace layout | [CORE] | Multiple flow networks in space |
| Path-complete | Flow path algorithm | [CORE] | Complete statement flow paths |
| Language layer | Plugin interface | [LSP] | Interpret statement content |
| Validation | Language server analysis | [LSP] | Check statement transformations |
| File operations | Platform file system | [PLATFORM] | Load/save flow networks |
| Command system | Platform command palette | [PLATFORM] | User interactions |
| UI rendering | Platform view layer | [PLATFORM] | Display physical flow systems |

## What Users Say → What System Does

| User Says | System Does | Layer |
|-----------|-------------|-------|
| "Create a processing unit" | Instantiate AtomicArgumentEntity with Statement arrays | [CORE] |
| "Add to tree" | Create NodeEntity at specific position in physical tree | [CORE] |
| "Connect these units" | Enable statement flow by sharing Statement objects at positions | [CORE] |
| "Show the complete flow network" | Traverse graph for maximal statement flow system | [CORE] |
| "Save my document" | Persist flow networks via platform file system | [PLATFORM] |
| "Validate my proof" | Run language server analysis on statement flows | [LSP] |
| "Open command menu" | Show platform command interface | [PLATFORM] |

## Bounded Contexts

Domain-Driven Design requires strict separation between different contexts:

### User Domain (What users see and say)
✅ Use: statement, processing unit, flow, tree, input, output, connection  
❌ Never: node, edge, graph, entity, index, data structure

**Example**: "Connect these two processing units so statements flow from one's output to the other's input"

### Technical Domain (How developers build it)  
✅ Use: Implementation terms when describing HOW  
✅ Also use: Domain terms when explaining WHAT  
⚠️ Always clarify: "Flow networks (internally represented as graphs)"

**Example**: "Statement flow exists when AtomicArgumentEntity instances share OrderedSetEntity container references"

### Translation Layer (UI/API)
- Accepts user domain language
- Internally uses technical implementation
- Returns results in user domain language
- Abstracts platform differences

## Common Misunderstandings

### "Trees aren't really trees, they're graphs"
**Wrong thinking**: The implementation invalidates the domain concept.  
**Right thinking**: There are TWO different concepts:
1. **Flow networks** (logical): The maximal connected statement flow system. Implemented as DAGs because processing units can receive statements from multiple sources.
2. **Tree structure** (physical): The explicit parent-child relationships between node instances. This IS a proper tree where each node has exactly one parent position.

### "Connections are just string matching"
**Wrong thinking**: If statement text matches, flow is automatically created.  
**Right thinking**: Statement flow exists when AtomicArgument1.conclusions[i] equals AtomicArgument2.premises[j] via Statement identity. When users create flow, they're establishing that the same Statement object appears at specific positions in different atomic arguments.

### "Statement reuse creates flow"
**Wrong thinking**: If the same statement appears in multiple arrays, they're automatically connected.
**Right thinking**: Statement reuse is independent of flow. The same statement can appear in many different AtomicArgument arrays without creating any flow paths. Flow requires the same Statement object at specific positions, not just shared statement content.

### "Text matching creates flow"
**Wrong thinking**: If the same statement appears in multiple arrays, flow is automatically created.
**Right thinking**: Statement reuse is independent of flow. The same statement can appear in many different AtomicArgument arrays without creating any flow paths. Flow requires Statement identity at specific positions. The file format uses string matching and YAML anchors *solely as deserialization mechanisms to reconstruct these Statement identity relationships at runtime; they do not define the underlying physical flow model*.

### "Everything should be technically accurate"
**Wrong thinking**: User docs should mention graphs, entities, indices.  
**Right thinking**: User docs use user language exclusively. Technical accuracy belongs in technical docs.

## Key Implementation Notes

- **Flow networks are graphs** [CORE]: Statement flow paths form DAGs (multiple inputs possible)
- **Tree structure is explicit** [CORE]: Node parent-child relationships form proper trees
- **Processing units are templates** [CORE]: Can be instantiated multiple times as different nodes
- **Position determines structure** [CORE]: Tree structure comes from node attachments, not flow connections
- **Statement flow is positional** [CORE]: Exists through Statement identity at specific array positions
- **Statement identity matters** [CORE]: Same Statement object (===), not value equality
- **Flow systems are computed** [CORE]: Not stored as entities
- **Statement reuse** [CORE]: Same statement strings can appear in multiple arrays without flow
- **Flow vs content separation** [CORE]: Flow is about Statement identity at positions, not matching content
- **Semantic neutrality** [LSP]: Platform manipulates strings; language layers provide meaning
- **Platform abstraction** [PLATFORM]: Core logic works identically across all platforms