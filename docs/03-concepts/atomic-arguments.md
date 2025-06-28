# Atomic Arguments

See [Key Terms](./key-terms.md#atomic-argument) for the definition.

## Structure

An atomic argument is a relation between two ordered n-tuples of Statements:
- **Premises**: The first n-tuple of Statement references (may be empty)
- **Conclusions**: The second n-tuple of Statement references (may be empty)
- **Implication line**: The horizontal line that uniquely identifies the atomic argument
- **Side labels**: Optional text extending left/right from the implication line
- **Metadata**: Additional information (timestamps, validation state, etc.)

Note: Atomic arguments reference Statements by ID. When a Statement appears in multiple atomic arguments, they all reference the same Statement entity.

## Visual Example

```
P₁, P₂, ..., Pₙ
─────────────── [Rule]
C₁, C₂, ..., Cₘ
```

Visual notes:
- Premises appear above the line, conclusions below
- The implication line extends as far as needed to accommodate text
- A minimum line length is maintained even for empty or short premises/conclusions
- Side labels (like [Rule]) extend directly left or right from the line

## Common Patterns

### Modus Ponens
```
P → Q, P
────────── MP
    Q
```

### Axiom (no premises)
```

────────── Axiom
A ∨ ¬A
```

### Multiple Conclusions
```
P ∧ Q
────────── ∧-Elim
P, Q
```

## Detailed Example: Creating Modus Ponens

Let's walk through creating a modus ponens argument step-by-step:

### Step 1: Create New Atomic Argument
Click "New Atomic Argument" button or press Ctrl+N.

### Step 2: Enter Premises
Type your premises, one per line:
```
If it rains, the grass gets wet
It is raining
```

### Step 3: Add Implication Line
The system adds the line automatically. You can optionally label it:
```
If it rains, the grass gets wet
It is raining
────────────────────────────── [Modus Ponens]
```

### Step 4: Enter Conclusion
Type the conclusion below the line:
```
If it rains, the grass gets wet
It is raining
────────────────────────────── [Modus Ponens]
The grass gets wet
```

### Component Breakdown
- **Premises** (2): The conditionals we start with
- **Implication line**: Shows logical inference
- **Rule label**: Optional identifier for the inference type
- **Conclusion** (1): What follows from the premises

## Design Rationale

- **Atomic**: Indivisible unit of reasoning
- **Statements**: Reusable text entities that enable connection tracking
- **N-tuples**: Support multiple premises/conclusions

For implementation details, see [Technical Definitions](../08-technical-design/technical-definitions.md).