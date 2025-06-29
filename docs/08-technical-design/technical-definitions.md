# Technical Implementation Definitions

This document provides implementation-level specifications for how the Proof Editor system realizes domain concepts in code. These are engineering details for developers, not conceptual definitions for users.

**IMPORTANT**: This is an implementation document. For domain concepts and user-facing definitions, see [DDD Glossary](../03-concepts/ddd-glossary.md) and [Key Terms](../03-concepts/key-terms.md).

## Core Data Structures

### OrderedSetEntity
**Purpose**: Data structure representing an ordered collection of statements with uniqueness constraint.
**Domain concept**: An ordered set that can be shared between atomic arguments to create connections.
```typescript
interface OrderedSetEntity {
  id: string;              // Unique identifier (UUID)
  items: string[];         // Ordered array of statement strings
  metadata: {
    createdAt: number;
    modifiedAt: number;
    referencedBy: {        // Which atomic arguments reference this set
      asPremise: string[];    // Atomic argument IDs using this as premise
      asConclusion: string[]; // Atomic argument IDs using this as conclusion
    };
  };
}
```
**Critical**: When atomic arguments share the SAME OrderedSetEntity (by reference), a connection exists.

### AtomicArgumentEntity
**Purpose**: Data structure that stores the information defining an atomic argument relation.
**Domain concept**: Represents an atomic argument (a relation between two ordered sets).
```typescript
interface AtomicArgumentEntity {
  id: string;                    // Unique identifier (UUID)
  premiseSetRef: string | null;  // Reference to OrderedSetEntity (may be null for empty set)
  conclusionSetRef: string | null; // Reference to OrderedSetEntity (may be null for empty set)
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
**Key insight**: Atomic arguments reference OrderedSetEntity objects. Connections exist implicitly when atomic arguments share the SAME ordered set reference. The implication line (stroke) is the focusable UI element for creating connections.


### Argument (Computed Concept)
**Purpose**: Algorithm output representing a path-complete subset of atomic arguments.
**Domain concept**: An argument (a set of atomic arguments with complete paths between all pairs).
**Implementation**: Computed on-demand by analyzing shared ordered set references.

```typescript
// Not a stored entity - computed by discovering connections through shared ordered sets
function computeArgument(
  startId: string,
  endId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  orderedSets: Map<string, OrderedSetEntity>
): Set<string> {
  // Returns all atomic argument IDs in path-complete subset
  // by traversing implicit connections via shared ordered set references
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
3. System identifies the parent's conclusion ordered set
4. System creates child atomic argument using the SAME ordered set reference as its premise set
5. Connection now exists implicitly through the shared ordered set object

## Key Implementation Concepts

### Ordered Set-Based Connection Model
**What it is**: Connections exist implicitly through shared ordered set references between atomic arguments.
**Why**: 
- Clear object identity (reference equality, not value equality)
- Shared state (modifications affect all referencing arguments)
- No ambiguity (same contents but different objects don't connect)
- Simple detection (just check reference equality)

### Intentional Construction
**What it means**: Every connection represents an explicit user decision.
**How it works**:
- User selects specific stroke
- User initiates branch/connect action
- System creates new atomic argument sharing the ordered set reference
- Connection exists through this intentional ordered set sharing
- No automatic detection

### Computed vs Stored
**Stored (Empirical)**:
- Ordered sets (created when users enter statements)
- Atomic arguments (reference ordered set IDs)
- Tree positions (user places trees)
- Position overrides (user adjusts)
- Documents (user manages)

**Computed (Derived)**:
- Connections (from shared ordered set references)
- Arguments (from connection traversal)
- Trees (from connected components)
- Tree properties (roots, leaves, depth)
- Atomic argument positions (from tree structure + layout)

## Implementation Philosophy

### What This Implementation Does
- **Enables intentional relationships**: Users create connections by sharing ordered set references
- **Simplifies data model**: No separate connection entities needed
- **Clear identity**: Reference equality makes connections unambiguous
- **Shared state**: Changes to ordered sets propagate to all users

### What This Implementation Doesn't Do
- **No string matching**: Same text doesn't create connections
- **No automatic linking**: Users explicitly share ordered set references
- **No complex algorithms**: Connections found through simple ID matching
- **No philosophical claims**: Just engineering

## Critical Distinctions

### Connection ≠ Value Equality
A connection is NOT "these ordered sets have the same contents". It's "these atomic arguments share the SAME ordered set object".

### Tree ≠ Hierarchy
Trees emerge from connections, they're not imposed. Multiple atomic arguments can reference the same ordered set (the system uses a graph structure internally).

### Validation ≠ Connection
Language layers validate correctness. Users create connections. These are independent concerns.

## Implementation Patterns

### Position Computation Algorithm
```typescript
function computeAtomicArgumentPosition(
  atomicArgumentId: string,
  treePosition: TreePositionEntity,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  orderedSets: Map<string, OrderedSetEntity>,
  overrides: Map<string, PositionOverrideEntity>
): { x: number, y: number } {
  // 1. Build connection graph from shared ordered set references
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
  atomicArguments: Map<string, AtomicArgumentEntity>
): AtomicArgumentEntity {
  // 1. Get conclusion ordered set reference from parent
  const parent = atomicArguments.get(parentId);
  const conclusionSetRef = parent.conclusionSetRef;
  
  // 2. Create child using the SAME ordered set reference as premise
  const child = {
    id: generateId(),
    premiseSetRef: conclusionSetRef,  // SAME OBJECT REFERENCE!
    conclusionSetRef: null,  // User will create new ordered set
    metadata: { createdAt: Date.now() }
  };
  
  // 3. Connection now exists implicitly because both atomic arguments
  //    reference the SAME ordered set object
  
  return child;
}
```

### Discovering Connections Through Shared Ordered Sets
```typescript
function getChildren(
  atomicArgumentId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>
): AtomicArgumentEntity[] {
  const parent = atomicArguments.get(atomicArgumentId);
  const children = [];
  
  // Simple reference equality check
  for (const [id, arg] of atomicArguments) {
    if (id !== atomicArgumentId && 
        arg.premiseSetRef === parent.conclusionSetRef && 
        parent.conclusionSetRef !== null) {
      children.push(arg);
    }
  }
  
  return children;
}

// More efficient with OrderedSet entity tracking:
function getChildrenEfficient(
  atomicArgumentId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  orderedSets: Map<string, OrderedSetEntity>
): AtomicArgumentEntity[] {
  const parent = atomicArguments.get(atomicArgumentId);
  if (!parent.conclusionSetRef) return [];
  
  const conclusionSet = orderedSets.get(parent.conclusionSetRef);
  const children = [];
  
  // Use OrderedSet metadata for efficient lookup
  for (const childId of conclusionSet.metadata.referencedBy.asPremise) {
    if (childId !== atomicArgumentId) {
      children.push(atomicArguments.get(childId));
    }
  }
  
  return children;
}
```

## Summary

The Proof Editor implementation is built on a foundation of shared ordered set objects. Users create connections by intentionally sharing ordered set references across atomic arguments - when the conclusion ordered set of one argument IS (same reference) the premise ordered set of another, a connection exists implicitly. The system discovers these connections through simple reference equality checks, not through value matching. This approach provides:

- **Clear identity**: Connections exist only when objects are the SAME (===)
- **Shared state**: Modifications to an ordered set affect all referencing arguments
- **No ambiguity**: Same values but different objects don't create connections
- **Simple implementation**: Just check reference equality