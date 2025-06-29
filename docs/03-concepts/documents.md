# Documents [CORE]

See [Key Terms](./key-terms.md#document) for the definition.

## Core Concept

A document is a container for argument trees. Documents can contain:
- Multiple independent argument trees
- Each tree is a maximal connected component
- Trees within a document share no atomic arguments

## Key Properties

### Container Model
- Documents store collections of argument trees
- Each tree maintains its own connection structure
- No connections exist between separate trees

### Tree Independence
- Argument trees in a document are completely separate
- If atomic arguments connect, they belong to the same tree
- Multiple trees enable working on separate proofs simultaneously

### Persistence
Documents persist:
- The atomic arguments within each tree
- The ordered set references that create connections
- Tree membership (which atomic arguments belong to which tree)
- Metadata (creation time, modification history, etc.)

## Design Rationale

Documents provide:
- **Workspace organization**: Multiple independent proofs in one container
- **Logical separation**: Clear boundaries between unrelated arguments
- **Atomic persistence**: Save and restore complete proof structures