# DAG Implementation Specification

## Overview

This document specifies the concrete implementation of domain concepts using directed acyclic graphs (DAGs). It details data structures, algorithms, and optimizations for efficiently storing and manipulating proof structures based on intentional parent-child relationships.

**CRITICAL**: This is a pure implementation document for developers. Users think in terms of "trees" - we implement these as DAGs. For domain concepts, see [DDD Glossary](../03-concepts/ddd-glossary.md).

## Implementation Context

In the domain language:
- Users work with **argument trees** (complete connected proofs)
- Trees **emerge** from connections between atomic arguments
- Connections are **created intentionally** by users

In the implementation:
- We use **DAGs** to represent these trees
- Connections are **stored parent-child references**
- No automatic detection or string matching

## Core Data Structures

### AtomicArgument

The complete data structure for an atomic argument:

```typescript
interface AtomicArgument {
  // Unique identifier
  id: string; // UUID v4
  
  // Content
  premises: string[];     // Ordered n-tuple
  conclusions: string[];  // Ordered n-tuple
  
  // Metadata
  metadata: {
    sideLabels?: {
      left?: string;
      right?: string;
    };
    createdAt: number;  // Unix timestamp
    modifiedAt: number;
    author?: string;
    references?: string[];
  };
  
  // Cached references for performance (derived from Connections)
  parentConnections?: string[];  // Connection IDs where this is child
  childConnections?: string[];   // Connection IDs where this is parent
}
```

### Connection

Explicit representation of intentional parent-child relationships:

```typescript
interface Connection {
  id: string;
  
  // Parent atomic argument and specific conclusion
  parentArgumentId: string;
  parentConclusionIndex: number;
  
  // Child atomic argument and specific premise  
  childArgumentId: string;
  childPremiseIndex: number;
  
  // Metadata about the intentional act of connection
  metadata: {
    createdAt: number;
    createdBy: 'branch' | 'connect' | 'import';  // How user created it
    creatorId?: string;  // User who created connection
  };
}
```

### ArgumentDAG

The complete DAG structure containing atomic arguments and their connections:

```typescript
interface ArgumentDAG {
  // All atomic arguments indexed by ID
  atomicArguments: Map<string, AtomicArgument>;
  
  // All connections indexed by ID
  connections: Map<string, Connection>;
  
  // Efficient lookup structures
  indices: {
    // Connections BY parent argument
    connectionsByParent: Map<string, Set<string>>;
    
    // Connections BY child argument  
    connectionsByChild: Map<string, Set<string>>;
    
    // Tree membership (computed and cached)
    treeIndex: Map<string, string>; // atomicArgumentId -> treeId
  };
  
  // Cached computations
  cache: {
    trees: Map<string, ComputedTree>;
    lastModified: number;
  };
}

interface ComputedTree {
  id: string;  // Deterministic from member IDs
  atomicArgumentIds: Set<string>;
  rootIds: string[];  // No incoming connections
  leafIds: string[];  // No outgoing connections
  depth: number;      // Longest path
}
```

## Key Implementation Insights

### 1. No String Matching
Unlike what previous documentation suggested, connections are NOT discovered through string matching. They are:
- Created explicitly by user actions
- Stored as references between atomic arguments
- Maintained even if string content changes

### 2. Parent-Child Reference Model
Each connection stores:
- Which atomic argument is the parent
- Which specific conclusion (by index) flows to the child
- Which atomic argument is the child
- Which specific premise (by index) receives the connection

### 3. The Stroke/Implication Line
In the UI layer:
- The implication line is the focusable element
- Users select it to initiate connection operations
- It represents the atomic argument for interaction purposes

## Operations

### Connection Creation

```typescript
interface ConnectionCreator {
  // Create a new connection between atomic arguments
  createConnection(
    dag: ArgumentDAG,
    parentId: string,
    parentConclusionIndex: number,
    childId: string,
    childPremiseIndex: number,
    createdBy: 'branch' | 'connect' | 'import'
  ): Connection;
  
  // Validate connection won't create cycle
  validateConnection(
    dag: ArgumentDAG,
    parentId: string,
    childId: string
  ): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  reason?: 'would-create-cycle' | 'self-reference' | 'invalid-indices';
}
```

### Branch Operation

When user selects a stroke and branches:

```typescript
interface BranchOperation {
  // Create child atomic argument with conclusion as premise
  branchFromConclusion(
    dag: ArgumentDAG,
    parentId: string,
    conclusionIndex: number,
    additionalPremises?: string[],
    newConclusions?: string[]
  ): {
    childArgument: AtomicArgument;
    connection: Connection;
  };
}
```

### Tree Computation

```typescript
interface TreeComputer {
  // Compute all trees in the DAG (maximal connected components)
  computeTrees(dag: ArgumentDAG): Map<string, ComputedTree>;
  
  // Find tree containing specific atomic argument
  findTree(
    dag: ArgumentDAG,
    atomicArgumentId: string
  ): ComputedTree | null;
  
  // Update tree index after connection change
  updateTreeIndex(
    dag: ArgumentDAG,
    affectedConnections: Set<string>
  ): void;
}
```

## Performance Optimizations

### Index Maintenance

```typescript
class IndexMaintainer {
  // After adding connection
  onConnectionAdded(dag: ArgumentDAG, connection: Connection): void {
    // Update connectionsByParent
    const parentSet = dag.indices.connectionsByParent.get(connection.parentArgumentId) || new Set();
    parentSet.add(connection.id);
    dag.indices.connectionsByParent.set(connection.parentArgumentId, parentSet);
    
    // Update connectionsByChild
    const childSet = dag.indices.connectionsByChild.get(connection.childArgumentId) || new Set();
    childSet.add(connection.id);
    dag.indices.connectionsByChild.set(connection.childArgumentId, childSet);
    
    // Invalidate tree cache for affected arguments
    this.invalidateTreeCache(dag, connection);
  }
  
  // After removing connection
  onConnectionRemoved(dag: ArgumentDAG, connectionId: string): void {
    const connection = dag.connections.get(connectionId);
    if (!connection) return;
    
    // Update indices
    dag.indices.connectionsByParent.get(connection.parentArgumentId)?.delete(connectionId);
    dag.indices.connectionsByChild.get(connection.childArgumentId)?.delete(connectionId);
    
    // Invalidate tree cache
    this.invalidateTreeCache(dag, connection);
  }
}
```

### Traversal Algorithms

```typescript
class DAGTraversal {
  // Find all descendants of an atomic argument
  findDescendants(
    dag: ArgumentDAG,
    atomicArgumentId: string,
    visited = new Set<string>()
  ): Set<string> {
    if (visited.has(atomicArgumentId)) return visited;
    visited.add(atomicArgumentId);
    
    const connections = dag.indices.connectionsByParent.get(atomicArgumentId) || new Set();
    for (const connId of connections) {
      const conn = dag.connections.get(connId);
      if (conn) {
        this.findDescendants(dag, conn.childArgumentId, visited);
      }
    }
    
    return visited;
  }
  
  // Find all ancestors of an atomic argument
  findAncestors(
    dag: ArgumentDAG,
    atomicArgumentId: string,
    visited = new Set<string>()
  ): Set<string> {
    if (visited.has(atomicArgumentId)) return visited;
    visited.add(atomicArgumentId);
    
    const connections = dag.indices.connectionsByChild.get(atomicArgumentId) || new Set();
    for (const connId of connections) {
      const conn = dag.connections.get(connId);
      if (conn) {
        this.findAncestors(dag, conn.parentArgumentId, visited);
      }
    }
    
    return visited;
  }
  
  // Check if adding connection would create cycle
  wouldCreateCycle(
    dag: ArgumentDAG,
    parentId: string,
    childId: string
  ): boolean {
    // If child is ancestor of parent, would create cycle
    const ancestors = this.findAncestors(dag, parentId);
    return ancestors.has(childId);
  }
}
```

## Serialization Format

For persistence and interchange:

```typescript
interface SerializedDAG {
  version: '2.0.0';  // Updated version for new model
  
  atomicArguments: Array<{
    id: string;
    premises: string[];
    conclusions: string[];
    metadata: Record<string, any>;
  }>;
  
  connections: Array<{
    id: string;
    parentArgumentId: string;
    parentConclusionIndex: number;
    childArgumentId: string;
    childPremiseIndex: number;
    metadata: {
      createdAt: number;
      createdBy: string;
    };
  }>;
  
  // Document metadata
  metadata: {
    createdAt: number;
    modifiedAt: number;
    title?: string;
    description?: string;
  };
}
```

## Migration from String-Matching Model

If migrating from a system that used string matching:

```typescript
interface MigrationStrategy {
  // Convert implicit connections to explicit
  migrateImplicitConnections(
    atomicArguments: AtomicArgument[]
  ): Connection[] {
    const connections: Connection[] = [];
    
    // For each atomic argument
    for (const child of atomicArguments) {
      // For each premise
      for (let pIndex = 0; pIndex < child.premises.length; pIndex++) {
        const premise = child.premises[pIndex];
        
        // Find potential parents (this is the OLD way)
        for (const parent of atomicArguments) {
          for (let cIndex = 0; cIndex < parent.conclusions.length; cIndex++) {
            if (parent.conclusions[cIndex] === premise) {
              // Create explicit connection
              connections.push({
                id: generateId(),
                parentArgumentId: parent.id,
                parentConclusionIndex: cIndex,
                childArgumentId: child.id,
                childPremiseIndex: pIndex,
                metadata: {
                  createdAt: Date.now(),
                  createdBy: 'migration'
                }
              });
            }
          }
        }
      }
    }
    
    return connections;
  }
}
```

## Design Rationale

### Why Parent-Child References?
1. **User Intent**: Connections represent explicit decisions
2. **Persistence**: Connections survive content edits
3. **Performance**: Direct traversal without string comparison
4. **Clarity**: No ambiguity about what connects to what

### Why Separate Connection Entities?
1. **N-tuple Support**: Track specific index mappings
2. **Metadata**: Store creation context
3. **Flexibility**: Support future connection types
4. **Auditability**: Track who created what when

### Why Cache Tree Membership?
1. **Performance**: Avoid recomputing on every query
2. **Consistency**: Ensure atomic arguments know their tree
3. **Navigation**: Quick tree-based operations

## Implementation Checklist

- [ ] Connection CRUD operations
- [ ] Cycle detection before connection creation
- [ ] Tree computation algorithm
- [ ] Index maintenance on mutations
- [ ] Cache invalidation strategy
- [ ] Serialization/deserialization
- [ ] Migration utilities (if needed)
- [ ] Performance benchmarks for large DAGs

## Summary

This implementation specification reflects the true nature of connections as intentional parent-child relationships. The DAG structure efficiently represents these relationships while preventing cycles and enabling fast traversal. All connections are explicitly stored, never inferred from string matching.