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
  metadata?: {
    sideLabels?: {
      left?: string;      // Text extending left from implication line
      right?: string;     // Text extending right from implication line  
    };
    createdAt: number;
    modifiedAt: number;
    references?: string[];
  };
}
```
**Key insight**: Positions are computed from tree structure. The implication line (stroke) is the focusable UI element for creating connections.

### ConnectionEntity
**Purpose**: Data structure that explicitly stores an intentional parent-child relationship between atomic arguments.
**Domain concept**: Represents a direct connection - when a user explicitly decides that a conclusion from one atomic argument functions as a premise in another.
```typescript
interface ConnectionEntity {
  id: string;
  parentArgumentId: string;
  parentConclusionIndex: number;
  childArgumentId: string;  
  childPremiseIndex: number;
  metadata: {
    createdAt: number;
    createdBy: 'branch' | 'connect' | 'import';
    creatorId?: string;
  };
}
```
**Critical understanding**: 
- Connections are NOT discovered through string matching
- They represent intentional user decisions
- Created through explicit UI actions (selecting stroke, pressing branch key)
- Persist even if string content changes

### Argument (Computed Concept)
**Purpose**: Algorithm output representing a path-complete subset of atomic arguments.
**Domain concept**: An argument (a set of atomic arguments with complete paths between all pairs).
**Implementation**: Computed on-demand by traversing parent-child connections.

```typescript
// Not a stored entity - computed by traversing connections
function computeArgument(
  startId: string,
  endId: string,
  connections: Map<string, ConnectionEntity>
): Set<string> {
  // Returns all atomic argument IDs in path-complete subset
}
```

### Argument Tree (Computed Concept)
**Purpose**: Algorithm output representing the maximal connected component.
**Domain concept**: An argument tree (contains ALL atomic arguments connected through parent-child relationships).
**Implementation**: Discovered through connected component analysis.

```typescript
interface ComputedArgumentTree {
  atomicArgumentIds: Set<string>;
  rootIds: string[];    // Computed: nodes with no parent connections
  leafIds: string[];    // Computed: nodes with no child connections
  depth: number;        // Computed: longest path length
}
```

### DocumentEntity
**Purpose**: Data structure storing workspace metadata.
**Domain concept**: A document (workspace for viewing and editing atomic arguments).
```typescript
interface DocumentEntity {
  id: string;
  title: string;
  metadata: {
    createdAt: number;
    modifiedAt: number;
    author?: string;
    description?: string;
  };
}
```
**Key design**: Documents don't contain atomic arguments directly - they reference argument trees through tree positions.

### TreePositionEntity
**Purpose**: Data structure anchoring argument trees in documents.
```typescript
interface TreePositionEntity {
  id: string;
  documentId: string;
  rootArgumentId: string;  // Which atomic argument is the tree root
  x: number;               // Tree anchor X coordinate
  y: number;               // Tree anchor Y coordinate
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
**Key principle**: Individual atomic arguments get their positions computed from the tree structure and layout algorithm.

### PositionOverrideEntity
**Purpose**: Optional data structure for manual position adjustments.
```typescript
interface PositionOverrideEntity {
  id: string;
  atomicArgumentId: string;
  documentId: string;
  xOffset: number;  // Offset from computed position
  yOffset: number;  // Offset from computed position
}
```
**Enables**: Fine-tuning of automatic layout when needed.

## System Components

### Language Layer
**Definition**: A pluggable module that interprets string content within atomic arguments.
**Capabilities**:
- Parse strings for display formatting
- Validate logical correctness
- Apply domain-specific rules

**Interface**:
```typescript
interface LanguageLayer {
  parse(content: string[]): ParsedExpression[];
  format(expressions: ParsedExpression[]): DisplayElement;
  validate(argument: AtomicArgumentEntity): ValidationResult;
}
```
**Note**: Language layers do NOT create connections - users do.

### UI Interaction Layer
**Key Components**:
- **Stroke/Implication Line**: Focusable element representing atomic argument
- **Selection System**: Tracks which stroke is selected
- **Command Handler**: Maps keyboard inputs to connection operations

**Connection Creation Flow**:
1. User selects stroke (implication line)
2. User presses branch key (e.g., 'b')
3. System identifies the selected conclusion Statement
4. System creates child atomic argument referencing this Statement as its first premise
5. System creates connection recording the shared Statement relationship

## Key Implementation Concepts

### Parent-Child Reference Model
**What it is**: Connections store direct references between atomic arguments, not string matches.
**Why**: 
- Preserves user intent
- Survives content edits
- Enables O(1) traversal
- No ambiguity

### Intentional Construction
**What it means**: Every connection represents an explicit user decision.
**How it works**:
- User selects specific stroke
- User initiates branch/connect action
- System creates connection with full context
- No automatic detection

### Computed vs Stored
**Stored (Empirical)**:
- Atomic arguments (user creates)
- Connections (user creates)
- Tree positions (user places trees)
- Position overrides (user adjusts)
- Documents (user manages)

**Computed (Derived)**:
- Arguments (from connection traversal)
- Trees (from connected components)
- Tree properties (roots, leaves, depth)
- Atomic argument positions (from tree structure + layout)

## Implementation Philosophy

### What This Implementation Does
- **Stores intentional relationships**: Every connection is a user decision
- **Separates concerns**: Logic, layout, and metadata in different structures
- **Optimizes performance**: Indices for fast traversal
- **Preserves intent**: Connections persist through edits

### What This Implementation Doesn't Do
- **No string matching**: Connections aren't discovered
- **No automatic linking**: Users create all connections
- **No magic**: Everything is explicit and traceable
- **No philosophical claims**: Just engineering

## Critical Distinctions

### Connection ≠ String Match
A connection is NOT "these strings are the same". It's "the user decided this conclusion flows into this premise".

### Tree ≠ Hierarchy
Trees emerge from connections, they're not imposed. Multiple parents are allowed (DAG property).

### Validation ≠ Connection
Language layers validate correctness. Users create connections. These are independent concerns.

## Implementation Patterns

### Position Computation Algorithm
```typescript
function computeAtomicArgumentPosition(
  atomicArgumentId: string,
  treePosition: TreePositionEntity,
  connections: Map<string, ConnectionEntity>,
  overrides: Map<string, PositionOverrideEntity>
): { x: number, y: number } {
  // 1. Find path from root to this atomic argument
  const path = findPathFromRoot(
    treePosition.rootArgumentId,
    atomicArgumentId,
    connections
  );
  
  // 2. Start at tree anchor
  let x = treePosition.x;
  let y = treePosition.y;
  
  // 3. Follow path, computing position at each step
  for (let i = 1; i < path.length; i++) {
    const parent = path[i - 1];
    const current = path[i];
    const siblings = getChildren(parent, connections);
    const siblingIndex = siblings.indexOf(current);
    
    // Compute based on layout style
    switch (treePosition.layoutStyle) {
      case 'top-down':
        y += treePosition.layoutParams.verticalSpacing;
        x = computeHorizontalOffset(
          x,
          siblingIndex,
          siblings.length,
          treePosition.layoutParams
        );
        break;
      case 'left-right':
        x += treePosition.layoutParams.horizontalSpacing;
        y = computeVerticalOffset(
          y,
          siblingIndex,
          siblings.length,
          treePosition.layoutParams
        );
        break;
      // ... other layout styles
    }
  }
  
  // 4. Apply any override
  const override = overrides.get(atomicArgumentId);
  if (override) {
    x += override.xOffset;
    y += override.yOffset;
  }
  
  return { x, y };
}
```

### Creating a Branch
```typescript
function branchFromConclusion(
  parentId: string,
  conclusionIndex: number
): { child: AtomicArgumentEntity, connection: ConnectionEntity } {
  // 1. Get conclusion string from parent
  const parent = getAtomicArgument(parentId);
  const conclusionString = parent.conclusions[conclusionIndex];
  
  // 2. Create child with conclusion as first premise
  const child = {
    id: generateId(),
    premises: [conclusionString],  // User can add more
    conclusions: [],  // User will fill in
    metadata: { createdAt: Date.now() }
  };
  
  // 3. Create connection
  const connection = {
    id: generateId(),
    parentArgumentId: parentId,
    parentConclusionIndex: conclusionIndex,
    childArgumentId: child.id,
    childPremiseIndex: 0,
    metadata: {
      createdAt: Date.now(),
      createdBy: 'branch'
    }
  };
  
  return { child, connection };
}
```

### Traversing Connections
```typescript
function getChildren(
  atomicArgumentId: string,
  connections: Map<string, ConnectionEntity>
): AtomicArgumentEntity[] {
  const children = [];
  
  for (const conn of connections.values()) {
    if (conn.parentArgumentId === atomicArgumentId) {
      const child = getAtomicArgument(conn.childArgumentId);
      children.push(child);
    }
  }
  
  return children;
}
```

## Summary

The Proof Editor implementation is built on a foundation of intentional parent-child relationships. Users explicitly create connections through UI interactions, and these connections are stored as first-class entities. The system never infers connections from string content - every link represents a deliberate user decision about logical flow.