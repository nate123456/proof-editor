# Connections

See [Key Terms](./key-terms.md#connections) for definitions of direct connection and connected.

## How Connections Work

Users create connections by:
1. Selecting a conclusion string from an atomic argument
2. Choosing to "branch off" from it
3. Creating a new atomic argument where that string becomes a premise

The system tracks these as explicit logical links, not automatic string matching.

## Visual Example

```
[Atomic Argument A]
P₁, P₂
────────
C₁, C₂ ─────┐
            │
            ↓
      [Atomic Argument B]
      C₂, P₃
      ────────
      C₃

Direct connection: C₂ from A becomes premise in B
```

## Establishing Connections

### Manual Connection
1. Click a conclusion in the source atomic argument
2. Select "Use as premise" from context menu
3. Position and create the new atomic argument
4. The conclusion automatically appears as a premise

### Assisted Connection
1. Select multiple atomic arguments
2. Choose "Auto-connect" tool
3. System suggests valid connections based on matching strings
4. Confirm or modify suggested connections

## Key Properties

- **Directional**: Conclusions flow INTO premises
- **Intentional**: Created by user action, not discovered
- **Acyclic**: No circular reasoning (enforced by DAG structure)

Multiple atomic arguments can use the same conclusion as their premise, creating convergent reasoning paths.