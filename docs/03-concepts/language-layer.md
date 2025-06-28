# Language Layer

See [Key Terms](./key-terms.md#language-layer) for the definition.

## What Language Layers Do

Language layers interpret and display the Statements referenced by atomic arguments. They define:
- How to parse Statement text content
- Display formatting and symbols
- Validation rules for the domain
- Available operators and notation

## Separation of Concerns

The platform stores Statements and connections. Language layers provide meaning:

| Platform | Language Layer |
|----------|----------------|
| Stores Statement entities | Parses Statement text |
| Tracks connections via shared Statements | Validates logic |
| Computes trees | Formats display |
| Manages documents | Defines symbols |

## Example Language Layers

### Mathematical Logic
- Symbols: ∧, ∨, →, ¬, ∀, ∃
- Validation: Check well-formed formulas
- Display: Traditional horizontal lines

### Natural Language
- Symbols: "therefore", "because", "given"
- Validation: Grammar checking
- Display: Box-and-arrow diagrams

### Programming
- Symbols: &&, ||, =>, !
- Validation: Type checking
- Display: Indented code blocks

## Key Benefits

- **Domain flexibility**: Customize for any formal system
- **Notation freedom**: Use familiar symbols
- **Semantic preservation**: Switch layers without losing meaning
- **Modular validation**: Domain-specific rules

Language layers make Proof Editor adaptable to any text-based formal reasoning system.