# Technical Implementation Definitions

This document provides implementation-level specifications for how the Proof Editor system realizes domain concepts in code. These are engineering details for developers, not conceptual definitions for users.

**IMPORTANT**: This is an implementation document. For domain concepts and user-facing definitions, see [DDD Glossary](../03-concepts/ddd-glossary.md) and [Key Terms](../03-concepts/key-terms.md).

## Core Data Structures

### AtomicArgumentEntity
**Purpose**: Data structure that stores the information defining an atomic argument relation.
**Domain concept**: Represents an atomic argument (a relation between two ordered n-tuples of strings).
```typescript
interface AtomicArgumentEntity {
  id: string;              // Unique identifier (UUID)
  premises: string[];      // Array storing the premise n-tuple
  conclusions: string[];   // Array storing the conclusion n-tuple
  metadata?: {            // Optional metadata
    ruleName?: string;
    sideLabels?: string[];
    createdAt: number;
    modifiedAt: number;
  };
}
```
**Example**: `{id: "a1b2c3", premises: ["A", "A→B"], conclusions: ["B"], metadata: {ruleName: "MP"}}`
**Implementation notes**: 
- Position and dimensions are stored separately in SpatialPositionEntity
- Validation state is computed on demand, not stored
- The ID enables efficient reference and indexing

### ConnectionEntity
**Purpose**: Data structure that explicitly stores a direct connection between atomic arguments.
**Domain concept**: Represents a direct connection (when a conclusion of one atomic argument IS a premise in another - an intentional logical link created by the user).
```typescript
interface ConnectionEntity {
  id: string;
  source: {
    atomicArgumentId: string;
    conclusionIndex: number;
  };
  target: {
    atomicArgumentId: string;
    premiseIndex: number;
  };
  metadata?: {
    creationMethod: 'manual' | 'assisted' | 'semantic';
    confidence?: number;
    createdAt: number;
  };
}
```
**Why explicit storage**: 
- Connections are user-created logical links, not discovered patterns
- Supports semantic equivalence as determined by users
- Provides O(1) lookup performance
- Allows connection-specific metadata and audit trail

### Argument (Computed Concept)
**Purpose**: Algorithm output representing a path-complete subset of atomic arguments.
**Domain concept**: An argument (a set of atomic arguments with complete paths between all pairs).
**Implementation**: Not stored as an entity. Computed on-demand through graph traversal.

**Computation Properties**:
- Path-complete: Algorithm ensures no missing intermediate steps
- Extractable: Can compute valid sub-arguments from larger structures
- Cacheable: Results may be cached for performance

### Argument Tree (Computed Concept)
**Purpose**: Algorithm output representing the maximal connected component.
**Domain concept**: An argument tree (contains ALL atomic arguments connected to any members).
**Implementation**: Discovered through connected component analysis of the DAG.

```typescript
// Example computation result (not stored entity)
interface ComputedArgumentTree {
  atomicArgumentIds: Set<string>;  // All members of this tree
  metadata: {
    rootIds: string[];    // Computed: nodes with no incoming edges
    leafIds: string[];    // Computed: nodes with no outgoing edges  
    depth: number;        // Computed: longest path length
    size: number;         // Computed: total node count
  };
}
```

**Key Properties**:
- Discovered, not created: Emerges from connection structure
- Unique: Graph theory guarantees uniqueness
- Maximal: Cannot add more without connecting separate trees

### DocumentEntity
**Purpose**: Data structure storing workspace metadata and configuration.
**Domain concept**: Represents a document (workspace for viewing and arranging atomic arguments).
```typescript
interface DocumentEntity {
  id: string;
  title: string;
  metadata: {
    createdAt: number;
    modifiedAt: number;
    author?: string;
    description?: string;
    languageLayerId?: string;
  };
}
```
**Implementation insight**: Documents reference atomic arguments through spatial positions, not direct containment. This enables:
- Same atomic argument appearing in multiple documents
- Independent persistence of logical structure and layout
- Multiple views of the same proof

## System Components

### Language Layer
**Definition**: A pluggable module that defines:
- How to parse strings in atomic arguments
- Display formatting rules
- Validation rules for the specific logic system

**Interface**:
```typescript
interface LanguageLayer {
  parse(content: string[]): ParsedExpression[];
  format(expressions: ParsedExpression[]): DisplayElement;
  validate(argumentEntity: AtomicArgumentEntity): ValidationResult;
  detectEquivalence?(str1: string, str2: string): boolean;
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

### DAG Implementation Choice
**Domain term**: Tree (how users conceptualize proof structures)
**Implementation**: Directed Acyclic Graph (DAG)
**Why DAGs**:
- Prevents circular reasoning (acyclic property)
- Allows convergent paths (multiple premises → same conclusion)
- Enables efficient validation algorithms
- Supports hierarchical visualization
- Natural fit for connected component analysis

### Validation
- Performed by language layers
- Checks syntactic correctness
- Verifies inference rule application
- User-definable per logic system

## Implementation Philosophy

### What This Implementation Does
- **Stores user-created entities**: Atomic arguments, connections, documents, positions
- **Computes derived concepts**: Arguments, trees, validation states
- **Optimizes for performance**: Indices, caches, incremental updates
- **Separates concerns**: Logic, layout, and metadata in different structures

### What This Implementation Doesn't Do
- **Doesn't define logic**: That's the language layer's job
- **Doesn't enforce one visualization**: That's the visualization layer's job
- **Doesn't store computed data**: Only caches for performance
- **Doesn't make philosophical claims**: It's engineering, not philosophy