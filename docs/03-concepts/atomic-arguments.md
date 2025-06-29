# Atomic Arguments [CORE]

See [Key Terms](./key-terms.md#atomic-argument) for the definition.

## Structure

An atomic argument is a relation between two ordered sets:
- **Premise ordered set**: The first ordered set (may be empty)
- **Conclusion ordered set**: The second ordered set (may be empty)
- **Side labels**: Optional metadata text
- **Metadata**: Additional information (timestamps, validation state, etc.)

Atomic arguments reference ordered set objects directly. When atomic arguments are connected, they share the SAME ordered set object - not copies or equal sets, but the same reference.

## Ordered Set Properties

- **Order matters**: [P₁, P₂] ≠ [P₂, P₁]
- **Uniqueness**: No duplicate statement IDs within a set
- **Reference identity**: Connections through shared object references
- **Mutability**: Changes propagate to all referencing atomic arguments

## Common Patterns

### Modus Ponens
```
Premises: [P → Q, P]
Conclusion: [Q]
```

### Axiom (empty premises)
```
Premises: []
Conclusion: [A ∨ ¬A]
```

### Multiple Conclusions
```
Premises: [P ∧ Q]
Conclusions: [P, Q]
```

## Design Rationale

- **Atomic**: Indivisible unit of logical reasoning
- **Ordered Sets**: Enable precise connections through shared references
- **Reference Sharing**: Connections exist when atomic arguments share the SAME ordered set object

For implementation details, see [Technical Definitions](../08-technical-design/technical-definitions.md).