# Technical Definitions

This document provides precise technical definitions for key terms used throughout the Proof Editor documentation. These are engineering specifications, not philosophical concepts.

## Core Data Structures

### Atomic Argument
**Definition**: A data structure representing a single inference step.
```
{
  premises: string[],      // Array of premise statements
  conclusions: string[],   // Array of conclusion statements
  metadata?: {            // Optional metadata
    ruleName?: string,
    sideLabels?: string[]
  }
}
```
**Example**: `{premises: ["A", "A→B"], conclusions: ["B"], metadata: {ruleName: "MP"}}`

### Connection
**Definition**: A link between two atomic arguments where a string in one argument's conclusions array matches a string in another argument's premises array.

### Argument Tree
**Definition**: A directed acyclic graph (DAG) of atomic arguments linked by connections. Stored as a set of atomic arguments with their connection relationships.

### Document
**Definition**: A container holding multiple argument trees with layout information.
```
{
  trees: ArgumentTree[],
  layout: LayoutData,
  metadata: DocumentMetadata
}
```

## System Components

### Language Layer
**Definition**: A pluggable module that defines:
- How to parse strings in atomic arguments
- Display formatting rules
- Validation rules for the specific logic system

**Interface**:
```
interface LanguageLayer {
  parse(content: string[]): ParsedExpression[]
  format(expressions: ParsedExpression[]): DisplayElement
  validate(argument: AtomicArgument): ValidationResult
}
```

### Logic System Package
**Definition**: A distributable package containing:
- Language layer implementation
- Standard inference rules
- Example proofs
- Documentation

## Key Design Terms

### Adaptable (not "Universal")
The platform can be customized for different domains through language layers and logic system packages. This is extensibility, not universality.

### Visual Representation
The spatial arrangement and graphical display of atomic arguments and their connections. This shows logical relationships, while strings contain the logical content.

### Direct Manipulation
User interaction through dragging, connecting, and arranging visual elements that map to operations on the underlying data structures.

## Implementation Details

### String Content
- Atomic arguments contain arrays of strings
- Strings are opaque to the core system
- Language layers interpret string content
- No built-in logical semantics

### Tree Structure Choice
- Enables efficient validation algorithms
- Supports clear visualization layouts
- Allows hierarchical navigation
- Not a claim about the nature of logic

### Validation
- Performed by language layers
- Checks syntactic correctness
- Verifies inference rule application
- User-definable per logic system

## What This System Is NOT

- **Not a theory of logic**: It's a tool for constructing proofs
- **Not philosophically complete**: It handles tree-structured proofs by design
- **Not making universal claims**: It's adaptable to many use cases, not all possible ones
- **Not defining logic**: Users define their logic through language layers