# Connections

See [Key Terms](./key-terms.md#connections) for definitions of direct connection and connected.

## Understanding Connections

Connections represent **intentional logical flow** between atomic arguments. When a user creates a connection, they are explicitly stating that a specific conclusion from one atomic argument functions as a specific premise in another.

## How Users Create Connections

The primary way users create connections is through the **implication line** (stroke):

1. **Select the stroke** - Click or use keyboard to focus on an atomic argument's implication line
2. **Branch command** - Press 'b' (or use menu) to create a child atomic argument
3. **Connection created** - The system:
   - Creates a new atomic argument
   - Copies the selected conclusion as its first premise
   - Establishes a parent-child connection between them

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
C₂, P₃   ← C₂ copied from parent
────────
C₃

Connection stored: A.conclusions[1] → B.premises[0]
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
- Connections are stored as references, not string matches
- They survive edits to the string content
- Breaking a connection requires explicit user action

## Interaction Model

### Keyboard-Driven Workflow
```
1. Navigate to atomic argument (arrow keys)
2. Select its stroke (Enter/Space)
3. Branch (b key) or Connect (c key)
4. System creates connection
```

### Visual Feedback
- Selected stroke highlights
- Connection lines show parent-child relationships
- Tree structure emerges from connections

## What Connections Are NOT

- **Not string matching** - Same strings don't automatically connect
- **Not discovered** - System doesn't find connections for you
- **Not fragile** - Editing strings doesn't break connections
- **Not ambiguous** - Each connection links specific indices

## Technical Implementation

Connections are stored as first-class entities with:
- Parent argument ID and conclusion index
- Child argument ID and premise index
- Creation metadata (when, how, by whom)

This allows precise tracking of logical flow and supports features like connection history, permissions, and collaborative editing.