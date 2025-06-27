# Technical Definitions

This document provides precise technical definitions for key terms used throughout the Proof Editor documentation. These are engineering specifications, not philosophical concepts.

## Core Data Structures

### Atomic Argument
**Definition**: A data structure representing a single inference step with unique identification and spatial position.
```
{
  id: string,              // Unique identifier (UUID)
  premises: string[],      // Array of premise statements
  conclusions: string[],   // Array of conclusion statements
  metadata?: {            // Optional metadata
    ruleName?: string,
    sideLabels?: string[],
    validationState?: ValidationState
  },
  position: {x: number, y: number}  // Spatial position in document
}
```
**Example**: `{id: "a1b2c3", premises: ["A", "A→B"], conclusions: ["B"], metadata: {ruleName: "MP"}, position: {x: 100, y: 200}}`
**See**: [DAG Data Model](08-technical-design/dag-data-model.md) for complete specification

### Connection
**Definition**: An explicit link between two atomic arguments connecting a specific conclusion in one argument to a specific premise in another.
```
{
  id: string,
  source: {
    atomicArgumentId: string,
    conclusionIndex: number
  },
  target: {
    atomicArgumentId: string,
    premiseIndex: number
  }
}
```
**Note**: Connections are stored explicitly rather than computed from string matching to support manual overrides and semantic equivalence.

### Argument Tree
**Definition**: A computed view representing a connected component within the DAG. All atomic arguments that share any connection path belong to the same tree.
```
{
  id: string,
  atomicArgumentIds: Set<string>,
  metadata: {
    rootIds: string[],    // Arguments with no incoming connections
    leafIds: string[],    // Arguments with no outgoing connections
    depth: number         // Longest path from root to leaf
  }
}
```

### Document
**Definition**: The complete DAG structure containing all atomic arguments and their connections, along with spatial layout and metadata.
```
{
  atomicArguments: Map<string, AtomicArgument>,
  connections: Map<string, Connection>,
  indices: {
    outgoingConnections: Map<string, Set<string>>,
    incomingConnections: Map<string, Set<string>>,
    stringIndex: Map<string, Set<string>>,
    treeIndex: Map<string, Set<string>>
  },
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