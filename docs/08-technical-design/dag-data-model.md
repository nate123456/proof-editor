# DAG Data Model Specification

## Overview

This document provides an **implementation-focused** specification of the data structures for representing atomic arguments and their connections as directed acyclic graphs (DAGs). It addresses technical requirements for efficient storage, manipulation, and validation of proof structures including arguments and argument trees.

**Note**: For the conceptual model that aligns with the project vision, see [Conceptual Data Model](conceptual-data-model.md). This document includes implementation details like caching, indices, and performance optimizations that go beyond the pure conceptual model.

## Core Data Structures

### AtomicArgument

The complete data structure for an atomic argument:

```typescript
interface AtomicArgument {
  // Unique identifier
  id: string; // UUID v4
  
  // Content
  premises: string[];
  conclusions: string[];
  
  // Metadata
  metadata: {
    ruleName?: string;
    sideLabels?: string[];
    createdAt: number; // Unix timestamp
    modifiedAt: number;
    author?: string;
    validationState?: ValidationState;
  };
  
  // Note: Position and dimensions are stored separately in SPATIAL_POSITION
  // This keeps logical content separate from view-specific properties
}
```

### Connection

Explicit representation of connections between atomic arguments:

```typescript
interface Connection {
  id: string;
  
  // Source atomic argument and specific conclusion index
  source: {
    atomicArgumentId: string;
    conclusionIndex: number;
  };
  
  // Target atomic argument and specific premise index
  target: {
    atomicArgumentId: string;
    premiseIndex: number;
  };
  
  // Connection metadata
  metadata: {
    createdAt: number;
    isAutoDetected: boolean;
    confidence?: number; // For fuzzy matching
  };
}
```

### ArgumentDAG

The complete DAG structure containing all atomic arguments and connections:

```typescript
interface ArgumentDAG {
  // All atomic arguments indexed by ID
  atomicArguments: Map<string, AtomicArgument>;
  
  // All connections indexed by ID
  connections: Map<string, Connection>;
  
  // Efficient lookup structures
  indices: {
    // connections FROM an atomic argument
    outgoingConnections: Map<string, Set<string>>; // atomicArgumentId -> connectionIds
    
    // connections TO an atomic argument
    incomingConnections: Map<string, Set<string>>; // atomicArgumentId -> connectionIds
    
    // String content to atomic argument IDs (for connection detection)
    stringIndex: Map<string, Set<string>>; // string content -> atomicArgumentIds
    
    // Tree membership index
    treeIndex: Map<string, Set<string>>; // treeId -> atomicArgumentIds
  };
  
  // Cached computations
  cache: {
    trees: Map<string, ArgumentTree>;
    validationResults: Map<string, ValidationResult>;
    lastModified: number;
  };
}
```

### ArgumentTree (Computed Concept)

An argument tree is the maximal connected component - all atomic arguments that share any connection path. This is a conceptual entity discovered through graph analysis, not a stored data structure.

In implementation, you might compute trees as:
```typescript
// Example: Find all trees in the DAG
function computeArgumentTrees(dag: ArgumentDAG): Map<string, Set<string>> {
  // Returns a map where each key is a computed tree identifier
  // and the value is the set of atomic argument IDs in that tree
}
```

Note: Trees are discovered, not created. They exist as a logical consequence of the connections between atomic arguments.

### Argument (Computed Subset)

An argument is any path-complete subset of atomic arguments. Not defined as a separate interface because:
- Arguments are computed views, not stored entities
- Any valid subset can be extracted from the DAG on demand
- Operations work directly on sets of atomic argument IDs

```typescript
// Example: Extracting an argument
function extractArgument(
  dag: ArgumentDAG, 
  startId: string, 
  endId: string
): Set<string> {
  // Returns all atomic argument IDs in the path-complete subset
  // connecting startId to endId
}
```

## Operations

### Connection Detection

```typescript
interface ConnectionDetector {
  // Find potential connections based on string matching
  detectConnections(dag: ArgumentDAG, options: {
    exactMatch: boolean;
    caseSensitive: boolean;
    languageLayer?: LanguageLayer;
  }): Connection[];
  
  // Check if a connection would create a cycle
  wouldCreateCycle(
    dag: ArgumentDAG, 
    source: ConnectionEndpoint, 
    target: ConnectionEndpoint
  ): boolean;
}
```

### Tree Computation

```typescript
interface TreeComputer {
  // Compute all trees in the DAG
  computeTrees(dag: ArgumentDAG): Map<string, ArgumentTree>;
  
  // Update tree membership after changes
  updateTreeMembership(
    dag: ArgumentDAG,
    affectedArgumentIds: Set<string>
  ): TreeUpdate[];
  
  // Extract subtree starting from given node
  extractSubtree(
    dag: ArgumentDAG,
    rootId: string
  ): ArgumentTree;
}
```

## Performance Considerations

### Index Maintenance

```typescript
interface IndexMaintainer {
  // Update indices after adding atomic argument
  onAtomicArgumentAdded(dag: ArgumentDAG, argument: AtomicArgument): void;
  
  // Update indices after removing atomic argument
  onAtomicArgumentRemoved(dag: ArgumentDAG, argumentId: string): void;
  
  // Update indices after connection change
  onConnectionChanged(dag: ArgumentDAG, connection: Connection): void;
  
  // Rebuild all indices from scratch
  rebuildIndices(dag: ArgumentDAG): void;
}
```

### Incremental Updates

To avoid recomputing the entire DAG on every change:

```typescript
interface IncrementalUpdate {
  type: 'add' | 'remove' | 'modify';
  targetType: 'atomic-argument' | 'connection';
  targetId: string;
  
  // Affected tree IDs that need recomputation
  affectedTrees: Set<string>;
  
  // Invalidated cache entries
  invalidatedCache: {
    validationResults: Set<string>;
    treeAnalysis: Set<string>;
  };
}
```

## Validation State

```typescript
interface ValidationState {
  status: 'pending' | 'valid' | 'invalid' | 'error';
  lastChecked: number;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  
  // Language-layer specific validation data
  languageLayerData?: unknown;
}

interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  
  // Location in the atomic argument
  location?: {
    premiseIndex?: number;
    conclusionIndex?: number;
  };
}
```

## Serialization Format

For persistence and interchange:

```typescript
interface SerializedDAG {
  version: '1.0.0';
  
  atomicArguments: {
    id: string;
    premises: string[];
    conclusions: string[];
    metadata: Record<string, unknown>;
    position: Position;
  }[];
  
  connections: {
    id: string;
    source: ConnectionEndpoint;
    target: ConnectionEndpoint;
    metadata?: Record<string, unknown>;
  }[];
  
  // Document-level metadata
  metadata: {
    createdAt: number;
    modifiedAt: number;
    languageLayerId?: string;
    title?: string;
    description?: string;
  };
}
```

## Design Rationale

### Why Explicit Connections?

Rather than computing connections on-the-fly from string matching:
- Supports manual connection override
- Enables fuzzy/semantic matching
- Allows connection metadata
- Improves performance via caching
- Handles equivalence rules from language layers

### Why Separate Trees from DAG?

Trees are computed views because:
- Tree membership changes as connections change
- Trees are discovered from the connection structure, not created
- Caching avoids recomputation
- Trees are unique - if atomic arguments are connected, they belong to the same tree

### Why Extensive Indices?

The index structures enable:
- O(1) connection lookups
- Efficient tree computation
- Fast string search
- Quick validation checks
- Incremental updates

### Why Position in AtomicArgument?

Storing position directly:
- Avoids separate layout structure
- Simplifies persistence
- Enables spatial queries
- Supports multiple views of same DAG

## Open Questions

1. **Connection Equivalence**: How do language layers specify when strings are equivalent?
2. **Large DAG Handling**: Should we support lazy loading of DAG sections?
3. **Collaborative Editing**: How do we handle concurrent modifications?
4. **Versioning**: Should we store history within the DAG or externally?
5. **External References**: How do we handle references to external proofs/theorems?