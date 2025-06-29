# Proof Components [CORE]

This document describes the fundamental components that make up proofs in Proof Editor. These components work together to create complete logical structures: atomic arguments form the basic building blocks, connections link them through shared ordered sets, and these connections create larger structures called arguments and argument trees.

## The Component Hierarchy

Proofs are built from three hierarchical levels:
1. **Atomic Arguments**: Single inference steps (smallest unit)
2. **Arguments**: Path-complete connected sets of atomic arguments
3. **Argument Trees**: Maximal connected components (largest unit)

Each level builds upon the previous, creating a complete system for representing logical reasoning.

## Atomic Arguments

See [Key Terms](./key-terms.md#atomic-argument) for the formal definition.

### Structure

An atomic argument is a relation between two ordered sets:
- **Premise ordered set**: The first ordered set (may be empty)
- **Conclusion ordered set**: The second ordered set (may be empty)
- **Side labels**: Optional metadata text
- **Metadata**: Additional information (timestamps, validation state, etc.)

Atomic arguments reference ordered set objects directly. When atomic arguments are connected, they share the SAME ordered set object - not copies or equal sets, but the same reference.

### Ordered Set Properties

- **Order matters**: [P₁, P₂] ≠ [P₂, P₁]
- **Uniqueness**: No duplicate statement IDs within a set
- **Reference identity**: Connections through shared object references
- **Mutability**: Changes propagate to all referencing atomic arguments

### Common Patterns

**Modus Ponens**
```
Premises: [P → Q, P]
Conclusion: [Q]
```

**Axiom (empty premises)**
```
Premises: []
Conclusion: [A ∨ ¬A]
```

**Multiple Conclusions**
```
Premises: [P ∧ Q]
Conclusions: [P, Q]
```

### Design Rationale

- **Atomic**: Indivisible unit of logical reasoning
- **Ordered Sets**: Enable precise connections through shared references
- **Reference Sharing**: Connections exist when atomic arguments share the SAME ordered set object

## Connections

See [Key Terms](./key-terms.md#connections) for definitions of direct connection and connected.

### Understanding Connections

Connections represent **shared ordered sets** between atomic arguments. When the conclusion ordered set of one atomic argument IS (same reference, not a copy) the premise ordered set of another, a connection exists.

**Critical**: This is about object identity, not value equality. Two ordered sets with the same items in the same order are NOT connected unless they are the SAME object.

### Connection Model

```
Atomic Argument A:
  Premises: [P₁, P₂]
  Conclusions: [C₁, C₂] ← Let's call this object 'setX'

Atomic Argument B:
  Premises: [C₁, C₂] ← This IS setX - the SAME object
  Conclusions: [C₃]

Connection: A.conclusions === B.premises (reference equality)
```

### Key Properties

**Shared Reference Model**
- Connections exist through shared ordered set objects
- The conclusion ordered set of one argument IS the premise ordered set of another
- Not copies, not equality checks - the actual same object in memory
- Changes to the shared ordered set affect all referencing atomic arguments

**Parent-Child Relationships**
- **Parent**: The atomic argument whose conclusion ordered set flows out
- **Child**: The atomic argument whose premise ordered set receives the flow
- Multiple children can share a parent's conclusion ordered set (branching)
- Multiple parents can share a child's premise ordered set (convergence)

**Connection Types**
- **Direct connection**: Immediate sharing of ordered set object
- **Connected**: Reachable through a path of direct connections
- **Path-complete**: All intermediate connections included

### What Connections Are NOT

- **Not value matching**: Same contents ≠ connection
- **Not separate entities**: Implicit relationships from shared references
- **Not partial**: Entire ordered set must be shared
- **Not discovered**: Created intentionally through shared references

### Implementation Notes

Connections are implicit relationships:
- No separate connection entities needed
- Found by checking reference equality
- Enable efficient traversal through shared objects

This ordered set-based model ensures:
- **Unambiguous connections**: Object identity is definitive
- **Shared state**: Modifications propagate automatically
- **Simple detection**: Reference comparison only
- **No false positives**: Different objects never connect

## Arguments and Trees

See [Key Terms](./key-terms.md#argument-tree) for definitions of argument and argument tree.

### Key Distinction: Argument vs Argument Tree

Consider atomic arguments connected through shared ordered sets:
- **Atomic Arguments**: Individual inference steps (A→B, B→C, etc.)
- **Arguments**: Any path-complete subset of connected atomic arguments
- **Argument Tree**: The maximal connected component containing ALL connected atomic arguments

### Path-Completeness

An argument must include ALL atomic arguments in the connecting paths between its members. No logical steps can be omitted. This ensures logical integrity - you cannot claim a conclusion follows from premises without showing all intermediate steps.

### Tree Properties

**Maximality**: An argument tree contains ALL atomic arguments connected to any of its members. No atomic argument connected to the tree exists outside it.

**Uniqueness**: If two trees share any atomic argument, they are identical. Trees are either completely separate or exactly the same. This creates a clean partition of the logical space.

**Emergence**: Trees are discovered from connections, not created directly. You create atomic arguments and connections; trees emerge from the structure.

### Common Tree Patterns

- **Linear**: Sequential reasoning (A→B→C→D)
- **Branching**: Multiple consequences from one premise
- **Convergent**: Multiple paths to the same conclusion
- **Mixed**: Combinations of the above patterns

Trees represent complete, self-contained logical structures.

## The Complete Hierarchy

### Three-Level Structure

1. **Atomic Argument**: Single inference step (one relation)
2. **Argument**: Path-complete connected set of atomic arguments
3. **Argument Tree**: Maximal connected component (all connected atomic arguments)

### Comprehensive Example

Given atomic arguments connected through shared ordered sets:
P→Q, P→R, Q→S, R→T, S→U, T→U, U→V

**Analysis:**

**Atomic Arguments**: 7 individual inference steps

**Valid Arguments** (path-complete):
- {P→Q, Q→S, S→U}
- {S→U, T→U, U→V}
- {P→R, R→T, T→U, U→V}

**Invalid Arguments** (not path-complete):
- {P→Q, S→U} - Missing intermediate Q→S
- {P→Q, T→U} - No connecting path exists

**The Argument Tree**: All 7 atomic arguments form one maximal component

### Hierarchical Relationships

- Every atomic argument is itself a trivial argument
- Every argument is a subset of some argument tree
- Every argument tree is the union of all its valid arguments
- Argument trees partition the space of atomic arguments (each atomic argument belongs to exactly one tree)

## Summary

These components create a complete system for constructing proofs:
1. **Atomic arguments** provide the basic inference steps
2. **Connections** through shared ordered sets link atomic arguments
3. **Arguments** ensure path-completeness for logical integrity
4. **Argument trees** represent maximal connected structures

This hierarchical design enables both fine-grained control (working with individual atomic arguments) and high-level organization (viewing complete argument trees), while maintaining logical consistency throughout.

For implementation details, see [Technical Definitions](../08-technical-design/technical-definitions.md).