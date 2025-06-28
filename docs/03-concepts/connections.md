# Connections

See [Key Terms](./key-terms.md#connections) for definitions of direct connection and connected.

## Understanding Connections

Connections represent **shared Statements** between atomic arguments. When a Statement appears as a conclusion in one atomic argument and as a premise in another, a connection exists. This shared Statement creates the logical flow between arguments.

## How Users Create Connections

The primary way users create connections is through the **implication line** (stroke):

1. **Select the stroke** - Click or use keyboard to focus on an atomic argument's implication line
2. **Branch command** - Press 'b' (or use menu) to create a child atomic argument
3. **Connection created** - The system:
   - Creates a new atomic argument
   - References the selected conclusion Statement as its first premise
   - The connection now exists implicitly through the shared Statement

## Visual Example

```
[Atomic Argument A]
P₁, P₂
──────── ← User selects this stroke
C₁, C₂ 
       ↓
   [branches to]
       ↓
[Atomic Argument B]
C₂, P₃   ← C₂ is the same Statement ID from parent
────────
C₃

Connection exists because: Statement ID at A.conclusions[1] is also at B.premises[0]
```

## Key Properties

### Intentional Creation
- Connections are **created by users**, not discovered by the system
- Each connection represents a deliberate decision about logical flow
- No automatic string matching creates connections

### Parent-Child Relationships
- Connections establish clear parent-child relationships
- Parent: The atomic argument whose conclusion flows out
- Child: The atomic argument whose premise receives the flow
- Multiple children can connect to the same parent (branching)
- Multiple parents can connect to the same child (convergence)

### Persistence
- Connections exist through shared Statement entities
- They survive edits to the Statement's text content
- Breaking a connection requires explicitly removing the Statement reference

## Interaction Model

### Keyboard-Driven Workflow
```
1. Navigate to atomic argument (arrow keys)
2. Select its stroke (Enter/Space)
3. Branch (b key) or Connect (c key)
4. System creates connection through Statement sharing
```

### Visual Feedback
- Selected stroke highlights
- Connection lines show parent-child relationships
- Tree structure emerges from connections

## What Connections Are NOT

- **Not string matching** - Same text doesn't automatically create connections
- **Not separate entities** - Connections emerge from shared Statement IDs
- **Not fragile** - Editing Statement text doesn't break connections
- **Not ambiguous** - Each connection links specific Statement references

## Technical Implementation

Connections are **implicit relationships** that exist when atomic arguments share Statement IDs:
- No separate connection table or entities needed
- Connections discovered by analyzing which atomic arguments reference the same Statement IDs
- When a Statement appears as a conclusion in one argument and a premise in another, a connection exists
- The system efficiently finds these relationships through Statement ID lookups

This Statement-based model allows precise tracking of logical flow and supports features like Statement reuse analysis, connection visualization, and collaborative editing.