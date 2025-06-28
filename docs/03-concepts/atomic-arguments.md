# Atomic Arguments

See [Key Terms](./key-terms.md#atomic-argument) for the definition.

## Structure

An atomic argument consists of:
- **Premises**: Ordered strings (what we start with)
- **Conclusions**: Ordered strings (what follows)
- **Implication line**: Visual separator
- **Metadata**: Optional (rule names, timestamps, etc.)

## Visual Example

```
P₁, P₂, ..., Pₙ
─────────────── [Rule]
C₁, C₂, ..., Cₘ
```

This shows premises above, conclusions below, separated by a line. The exact visual representation depends on your chosen display system.

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
- **Strings**: Maximum flexibility across domains
- **N-tuples**: Support multiple premises/conclusions

For implementation details, see [Technical Definitions](../08-technical-design/technical-definitions.md).