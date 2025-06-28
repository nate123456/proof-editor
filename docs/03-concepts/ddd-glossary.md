# Domain-Driven Design Glossary

This glossary maps between **Domain Language** (what users say) and **Implementation Language** (how it's built). For concept definitions, see [Key Terms](./key-terms.md).

## Core Principle

Domain concepts exist independently of implementation. An atomic argument IS a relation - HOW we store it is a separate concern.

## Domain → Implementation Mappings

| Domain Concept | Implementation | Purpose |
|----------------|----------------|---------|
| Statement | StatementEntity | Store reusable text content |
| Atomic argument | AtomicArgumentEntity | Store relation data |
| Direct connection | ConnectionEntity | Explicit link storage |
| Argument tree | DAG structure | Graph representation |
| Document | Spatial positions + metadata | Separate logic from layout |
| Path-complete | Graph algorithm | Computed property |
| Language layer | Plugin interface | Modular interpretation |

## What Users Say → What System Does

| User Says | System Does |
|-----------|-------------|
| "Create an atomic argument" | Instantiate AtomicArgumentEntity, reference or create StatementEntities |
| "Connect these arguments" | Create ConnectionEntity |
| "Show the complete tree" | Traverse DAG for maximal component |
| "Save my document" | Persist entities and positions |

## Bounded Contexts

Domain-Driven Design requires strict separation between different contexts:

### User Domain (What users see and say)
✅ Use: argument, tree, connection, premise, conclusion  
❌ Never: node, edge, DAG, entity, index, data structure

**Example**: "Connect these two arguments by using this conclusion as a premise"

### Technical Domain (How developers build it)  
✅ Use: Implementation terms when describing HOW  
✅ Also use: Domain terms when explaining WHAT  
⚠️ Always clarify: "Trees (implemented as DAGs)"

**Example**: "The ConnectionEntity stores the link between AtomicArgumentEntity instances"

### Translation Layer (UI/API)
- Accepts user domain language
- Internally uses technical implementation
- Returns results in user domain language

## Common Misunderstandings

### "Trees aren't really trees, they're DAGs"
**Wrong thinking**: The implementation invalidates the domain concept.  
**Right thinking**: Users conceptualize tree-like structures. That we implement them as DAGs is irrelevant to the domain model.

### "Connections are just string matching"
**Wrong thinking**: If strings match, they're automatically connected.  
**Right thinking**: Connections exist when atomic arguments share the same Statement entity. When users create connections, they're establishing that a specific Statement functions in both arguments.

### "Everything should be technically accurate"
**Wrong thinking**: User docs should mention DAGs, entities, indices.  
**Right thinking**: User docs use user language exclusively. Technical accuracy belongs in technical docs.

## Key Implementation Notes

- **Trees are DAGs**: Users think "trees", code uses Directed Acyclic Graphs
- **Connections are stored**: Not just computed from string matching
- **Arguments are computed**: Not stored as entities
- **Semantic neutrality**: Platform manipulates strings; language layers provide meaning