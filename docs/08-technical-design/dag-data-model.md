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

### Statement

The fundamental unit of logical content:

```typescript
interface Statement {
  id: string;              // UUID v4
  text: string;            // The actual string content
  
  // Tracking relationships
  parentArguments: Set<string>;  // Atomic arguments where this is a conclusion
  childArguments: Set<string>;   // Atomic arguments where this is a premise
  
  metadata: {
    createdAt: number;
    modifiedAt: number;
    createdBy?: string;
  };
}
```

### AtomicArgument

The complete data structure for an atomic argument:

```typescript
interface AtomicArgument {
  // Unique identifier
  id: string; // UUID v4
  
  // References to Statements
  premiseIds: string[];    // Ordered array of Statement IDs
  conclusionIds: string[]; // Ordered array of Statement IDs
  
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

Representation of shared Statement relationships:

```typescript
interface Connection {
  id: string;
  
  // The shared Statement
  statementId: string;
  
  // Parent atomic argument where Statement is a conclusion
  parentArgumentId: string;
  parentConclusionIndex: number;
  
  // Child atomic argument where Statement is a premise  
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
  // All statements indexed by ID
  statements: Map<string, Statement>;
  
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
    
    // Connections BY statement
    connectionsByStatement: Map<string, Set<string>>;
    
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

### 1. Statement-Based Connections
Connections exist when atomic arguments share Statement entities:
- Created explicitly by user actions
- Maintained through Statement IDs
- Survive text edits (Statement ID remains constant)
- Enable tracking of logical flow through shared Statements

### 2. Statement Reference Model
Each connection stores:
- Which Statement is shared
- Which atomic argument has it as a conclusion (parent)
- At which index in the parent's conclusions
- Which atomic argument has it as a premise (child)
- At which index in the child's premises

**Why track indices when we have Statement IDs?** The index information is crucial for:
1. **Rendering**: Know exactly which visual position to draw connection lines from/to
2. **User Intent**: Preserve the specific position where user placed the Statement
3. **Reordering**: If user reorders premises/conclusions, connections update appropriately

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
  // Create child atomic argument sharing parent's conclusion Statement
  branchFromConclusion(
    dag: ArgumentDAG,
    parentId: string,
    conclusionIndex: number,
    additionalPremiseTexts?: string[],  // New Statements to create
    newConclusionTexts?: string[]       // New Statements to create
  ): {
    childArgument: AtomicArgument;
    connection: Connection;
    newStatements: Statement[];  // Any newly created Statements
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
    
    // Update connectionsByStatement
    const statementSet = dag.indices.connectionsByStatement.get(connection.statementId) || new Set();
    statementSet.add(connection.id);
    dag.indices.connectionsByStatement.set(connection.statementId, statementSet);
    
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

## Position Management

### TreePosition

Tree positions anchor entire trees in documents:

```typescript
interface TreePosition {
  id: string;
  documentId: string;
  rootArgumentId: string;  // Which atomic argument is the tree root
  x: number;               // Anchor point X
  y: number;               // Anchor point Y
  layoutStyle: 'top-down' | 'bottom-up' | 'left-right' | 'right-left' | 'radial';
  layoutParams: {
    nodeWidth: number;
    nodeHeight: number;
    horizontalSpacing: number;
    verticalSpacing: number;
    alignChildren: 'center' | 'left' | 'right';
  };
}
```

### PositionOverride

Optional manual adjustments to computed positions:

```typescript
interface PositionOverride {
  id: string;
  atomicArgumentId: string;
  documentId: string;
  xOffset: number;  // Offset from computed position
  yOffset: number;  // Offset from computed position
}
```

### Position Computation

```typescript
interface PositionComputer {
  // Compute all positions for a tree in a document
  computeTreePositions(
    dag: ArgumentDAG,
    treePosition: TreePosition
  ): Map<string, { x: number, y: number }>;
  
  // Get computed position for single atomic argument
  getComputedPosition(
    atomicArgumentId: string,
    treePosition: TreePosition,
    overrides: Map<string, PositionOverride>
  ): { x: number, y: number };
  
  // Update positions after structural change
  recomputePositions(
    dag: ArgumentDAG,
    treeId: string,
    documentId: string
  ): void;
}
```

### Layout Algorithms

Different layout styles for different needs:

```typescript
abstract class LayoutAlgorithm {
  abstract compute(
    tree: ComputedTree,
    dag: ArgumentDAG,
    params: LayoutParams
  ): Map<string, { x: number, y: number }>;
}

class TopDownLayout extends LayoutAlgorithm {
  compute(tree, dag, params) {
    // Start at root, flow downward
    // Children centered under parents
    // Siblings spaced horizontally
  }
}

class RadialLayout extends LayoutAlgorithm {
  compute(tree, dag, params) {
    // Root at center
    // Children in concentric circles
    // Angle based on subtree size
  }
}
```

## Serialization Format

For persistence and interchange:

```typescript
interface SerializedDAG {
  version: '3.0.0';  // Updated version for Statement-based model
  
  statements: Array<{
    id: string;
    text: string;
    metadata: Record<string, any>;
  }>;
  
  atomicArguments: Array<{
    id: string;
    premiseIds: string[];
    conclusionIds: string[];
    metadata: Record<string, any>;
  }>;
  
  connections: Array<{
    id: string;
    statementId: string;
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
              // Create Statement if not exists
              const statementId = getOrCreateStatement(premise);
              
              // Create explicit connection
              connections.push({
                id: generateId(),
                statementId: statementId,
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

### Why Statement-Based Model?
1. **Logical Clarity**: Connections exist because Statements are shared
2. **Edit Resilience**: Statement IDs survive text content changes
3. **Reusability**: Track how Statements flow through arguments
4. **Performance**: Direct traversal through Statement references

### Why Separate Connection Entities?
1. **N-tuple Support**: Track specific index mappings
2. **Metadata**: Store creation context
3. **Flexibility**: Support future connection types
4. **Auditability**: Track who created what when

### Why Cache Tree Membership?
1. **Performance**: Avoid recomputing on every query
2. **Consistency**: Ensure atomic arguments know their tree
3. **Navigation**: Quick tree-based operations

### Why Compute Positions Instead of Storing?
1. **Consistency**: Visual layout always reflects logical structure
2. **Flexibility**: Change layout algorithms without data migration
3. **Efficiency**: Store only tree anchors, not every node position
4. **Correctness**: Impossible for positions to contradict connections
5. **Simplicity**: One source of truth (connections), not two

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

This implementation specification reflects the true nature of connections as shared Statement relationships. Statements are first-class entities that atomic arguments reference. When atomic arguments share a Statement (one has it as a conclusion, another as a premise), a connection exists. The DAG structure efficiently represents these relationships while preventing cycles and enabling fast traversal.