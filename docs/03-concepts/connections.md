# Connections [CORE]

See [Key Terms](./key-terms.md#connections) for definitions of direct connection and connected.

## Understanding Connections

Connections represent **shared ordered sets** between atomic arguments. When the conclusion ordered set of one atomic argument IS (same reference, not a copy) the premise ordered set of another, a connection exists.

**Critical**: This is about object identity, not value equality. Two ordered sets with the same items in the same order are NOT connected unless they are the SAME object.

## Connection Model

```
Atomic Argument A:
  Premises: [P₁, P₂]
  Conclusions: [C₁, C₂] ← Let's call this object 'setX'

Atomic Argument B:
  Premises: [C₁, C₂] ← This IS setX - the SAME object
  Conclusions: [C₃]

Connection: A.conclusions === B.premises (reference equality)
```

## Key Properties

### Shared Reference Model
- Connections exist through shared ordered set objects
- The conclusion ordered set of one argument IS the premise ordered set of another
- Not copies, not equality checks - the actual same object in memory
- Changes to the shared ordered set affect all referencing atomic arguments

### Parent-Child Relationships
- **Parent**: The atomic argument whose conclusion ordered set flows out
- **Child**: The atomic argument whose premise ordered set receives the flow
- Multiple children can share a parent's conclusion ordered set (branching)
- Multiple parents can share a child's premise ordered set (convergence)

### Connection Types
- **Direct connection**: Immediate sharing of ordered set object
- **Connected**: Reachable through a path of direct connections
- **Path-complete**: All intermediate connections included

## What Connections Are NOT

- **Not value matching**: Same contents ≠ connection
- **Not separate entities**: Implicit relationships from shared references
- **Not partial**: Entire ordered set must be shared
- **Not discovered**: Created intentionally through shared references

## Implementation Notes

Connections are implicit relationships:
- No separate connection entities needed
- Found by checking reference equality
- Enable efficient traversal through shared objects

This ordered set-based model ensures:
- **Unambiguous connections**: Object identity is definitive
- **Shared state**: Modifications propagate automatically
- **Simple detection**: Reference comparison only
- **No false positives**: Different objects never connect