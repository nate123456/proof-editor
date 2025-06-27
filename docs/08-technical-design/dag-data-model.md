# DAG Data Model Specification

## Overview

This document specifies the concrete data structures for representing argument trees as directed acyclic graphs (DAGs). It addresses the technical requirements for efficient storage, manipulation, and validation of proof structures.

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
  
  // Position in document space
  position: {
    x: number;
    y: number;
    z?: number; // For future 3D layouts
  };
  
  // Dimensions for rendering
  dimensions?: {
    width: number;
    height: number;
  };
  
  // Tree membership (computed field)
  treeId?: string;
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

### ArgumentTree

A computed view representing a connected component of the DAG:

```typescript
interface ArgumentTree {
  id: string;
  
  // Member atomic arguments
  atomicArgumentIds: Set<string>;
  
  // Tree-specific metadata
  metadata: {
    computedAt: number;
    rootIds: string[]; // Atomic arguments with no incoming connections
    leafIds: string[]; // Atomic arguments with no outgoing connections
    depth: number; // Longest path from root to leaf
    isValid?: boolean;
  };
  
  // Cached tree analysis
  analysis?: {
    hasCycles: boolean; // Should always be false for valid DAG
    criticalPath: string[]; // IDs forming longest path
    branchingFactor: number;
  };
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
- Multiple valid tree decompositions may exist
- Caching avoids recomputation
- Allows different tree computation strategies

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