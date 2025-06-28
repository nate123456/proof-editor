# Technical Implementation Definitions

This document provides implementation-level specifications for how the Proof Editor system realizes domain concepts in code. These are engineering details for developers, not conceptual definitions for users.

**IMPORTANT**: This is an implementation document. For domain concepts and user-facing definitions, see [DDD Glossary](../03-concepts/ddd-glossary.md) and [Key Terms](../03-concepts/key-terms.md).

## Core Data Structures

### AtomicArgumentEntity
**Purpose**: Data structure that stores the information defining an atomic argument relation.
**Domain concept**: Represents an atomic argument (a relation between two ordered n-tuples of statements).
```typescript
interface AtomicArgumentEntity {
  id: string;              // Unique identifier (UUID)
  premise_ids: string[];   // Array of Statement IDs (ordered)
  conclusion_ids: string[]; // Array of Statement IDs (ordered)
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
**Key insight**: Atomic arguments reference Statement entities by ID. Connections exist implicitly when atomic arguments share Statement IDs. The implication line (stroke) is the focusable UI element for creating connections.

### StatementEntity
**Purpose**: Data structure representing a reusable piece of logical content.
**Domain concept**: A Statement that can function as a premise or conclusion in multiple atomic arguments.
```typescript
interface StatementEntity {
  id: string;              // Unique identifier (UUID)
  text: string;            // The actual string content
  metadata: {
    createdAt: number;
    modifiedAt: number;
    usage: {
      as_premise_in: string[];    // Atomic argument IDs
      as_conclusion_in: string[]; // Atomic argument IDs
    };
  };
}
```
**Critical understanding**: 
- Statements are first-class entities with stable IDs
- Connections exist implicitly when atomic arguments share Statement IDs
- A Statement appearing as a conclusion in one argument and a premise in another creates a connection
- Editing Statement text doesn't break connections (ID remains stable)

### Argument (Computed Concept)
**Purpose**: Algorithm output representing a path-complete subset of atomic arguments.
**Domain concept**: An argument (a set of atomic arguments with complete paths between all pairs).
**Implementation**: Computed on-demand by analyzing shared Statement IDs.

```typescript
// Not a stored entity - computed by discovering connections through shared Statements
function computeArgument(
  startId: string,
  endId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  statements: Map<string, StatementEntity>
): Set<string> {
  // Returns all atomic argument IDs in path-complete subset
  // by traversing implicit connections via shared Statement IDs
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
4. System creates child atomic argument referencing this Statement ID as its first premise
5. Connection now exists implicitly through the shared Statement ID

## Key Implementation Concepts

### Statement-Based Connection Model
**What it is**: Connections exist implicitly through shared Statement IDs between atomic arguments.
**Why**: 
- Simpler data model (no separate connection entities)
- Connections emerge naturally from the data
- Survives content edits (Statement IDs are stable)
- Efficient lookups via Statement ID indexing

### Intentional Construction
**What it means**: Every connection represents an explicit user decision.
**How it works**:
- User selects specific stroke
- User initiates branch/connect action
- System creates new atomic argument sharing Statement IDs
- Connection exists through this intentional Statement sharing
- No automatic detection

### Computed vs Stored
**Stored (Empirical)**:
- Statements (created when users enter text)
- Atomic arguments (reference Statement IDs)
- Tree positions (user places trees)
- Position overrides (user adjusts)
- Documents (user manages)

**Computed (Derived)**:
- Connections (from shared Statement IDs)
- Arguments (from connection traversal)
- Trees (from connected components)
- Tree properties (roots, leaves, depth)
- Atomic argument positions (from tree structure + layout)

## Implementation Philosophy

### What This Implementation Does
- **Enables intentional relationships**: Users create connections by sharing Statement IDs
- **Simplifies data model**: No separate connection entities needed
- **Optimizes performance**: Statement ID indexing for fast connection discovery
- **Preserves intent**: Statement IDs remain stable through text edits

### What This Implementation Doesn't Do
- **No string matching**: Same text doesn't create connections
- **No automatic linking**: Users explicitly share Statement IDs
- **No complex algorithms**: Connections found through simple ID matching
- **No philosophical claims**: Just engineering

## Critical Distinctions

### Connection ≠ String Match
A connection is NOT "these strings are the same". It's "the user intentionally used the same Statement ID in both places".

### Tree ≠ Hierarchy
Trees emerge from connections, they're not imposed. Multiple parents are allowed (the system uses a graph structure internally).

### Validation ≠ Connection
Language layers validate correctness. Users create connections. These are independent concerns.

## Implementation Patterns

### Position Computation Algorithm
```typescript
function computeAtomicArgumentPosition(
  atomicArgumentId: string,
  treePosition: TreePositionEntity,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  statements: Map<string, StatementEntity>,
  overrides: Map<string, PositionOverrideEntity>
): { x: number, y: number } {
  // 1. Build connection graph from shared Statement IDs
  const connectionGraph = buildConnectionGraph(atomicArguments);
  
  // 2. Find path from root to this atomic argument
  const path = findPathFromRoot(
    treePosition.rootArgumentId,
    atomicArgumentId,
    connectionGraph
  );
  
  // 3. Start at tree anchor
  let x = treePosition.x;
  let y = treePosition.y;
  
  // 4. Follow path, computing position at each step
  for (let i = 1; i < path.length; i++) {
    const parent = path[i - 1];
    const current = path[i];
    const siblings = connectionGraph.getChildren(parent);
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
  
  // 5. Apply any override
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
  conclusionIndex: number,
  atomicArguments: Map<string, AtomicArgumentEntity>
): AtomicArgumentEntity {
  // 1. Get conclusion Statement ID from parent
  const parent = atomicArguments.get(parentId);
  const conclusionStatementId = parent.conclusion_ids[conclusionIndex];
  
  // 2. Create child with same Statement ID as first premise
  const child = {
    id: generateId(),
    premise_ids: [conclusionStatementId],  // Reuses parent's Statement
    conclusion_ids: [],  // User will add new Statements
    metadata: { createdAt: Date.now() }
  };
  
  // 3. Connection now exists implicitly because both atomic arguments
  //    reference the same Statement ID
  
  return child;
}
```

### Discovering Connections Through Shared Statements
```typescript
function getChildren(
  atomicArgumentId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>
): AtomicArgumentEntity[] {
  const parent = atomicArguments.get(atomicArgumentId);
  const children = [];
  
  // For each conclusion Statement in the parent
  for (const conclusionId of parent.conclusion_ids) {
    // Find atomic arguments that use this Statement as a premise
    for (const [id, arg] of atomicArguments) {
      if (id !== atomicArgumentId && arg.premise_ids.includes(conclusionId)) {
        children.push(arg);
      }
    }
  }
  
  return children;
}

// More efficient with Statement entity tracking:
function getChildrenEfficient(
  atomicArgumentId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  statements: Map<string, StatementEntity>
): AtomicArgumentEntity[] {
  const parent = atomicArguments.get(atomicArgumentId);
  const children = new Set<AtomicArgumentEntity>();
  
  // Use Statement metadata for efficient lookup
  for (const conclusionId of parent.conclusion_ids) {
    const statement = statements.get(conclusionId);
    for (const childId of statement.metadata.usage.as_premise_in) {
      if (childId !== atomicArgumentId) {
        children.add(atomicArguments.get(childId));
      }
    }
  }
  
  return Array.from(children);
}
```

## Summary

The Proof Editor implementation is built on a foundation of shared Statement entities. Users create connections by intentionally reusing Statement IDs across atomic arguments - when a Statement appears as a conclusion in one argument and as a premise in another, a connection exists implicitly. The system discovers these connections by analyzing Statement ID usage, not through string matching. This approach provides a clean, simple data model where connections emerge naturally from the data structure itself.