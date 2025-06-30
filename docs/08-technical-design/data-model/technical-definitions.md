# Technical Implementation Definitions

This document provides implementation-level specifications for how the Proof Editor system realizes domain concepts in code. These are engineering details for developers, not conceptual definitions for users.

**IMPORTANT**: This is an implementation document. For domain concepts and user-facing definitions, see [DDD Glossary](../03-concepts/ddd-glossary.md) and [Key Terms](../03-concepts/key-terms.md).

## Core Data Structures

### OrderedSetEntity
**Purpose**: Data structure representing an ordered collection of statements with uniqueness constraint. OrderedSetEntity objects serve as the connection mechanism - when multiple atomic arguments reference the same OrderedSetEntity, they are connected.
**Domain concept**: Implements the [Ordered Set](../03-concepts/key-terms.md#ordered-set) concept.
```typescript
interface OrderedSetEntity {
  id: string;              // Unique identifier (UUID)
  items: string[];         // Ordered array of statement strings (reusable across sets)
  metadata: {
    createdAt: number;
    modifiedAt: number;
    authorId?: string;           // ID of the human author who created this ordered set
    sourcePackageId?: string;    // Language package that introduced this content
    references?: string[];       // External references or citations
    referencedBy: {        // Which atomic arguments reference this set
      asPremise: string[];    // Atomic argument IDs using this as premise
      asConclusion: string[]; // Atomic argument IDs using this as conclusion
    };
  };
}
```
**Critical**: When atomic arguments share the SAME OrderedSetEntity (by reference), a connection exists. The `items` array contains statement strings that can be reused across different ordered sets.

### AtomicArgumentEntity
**Purpose**: Data structure that stores the information defining an atomic argument relation.
**Domain concept**: Implements the [Atomic Argument](../03-concepts/key-terms.md#atomic-argument) concept.
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
    authorId?: string;           // ID of the human author who created this atomic argument
    sourcePackageId?: string;    // Language package that introduced this inference rule
    references?: string[];       // External references or citations
  };
}
```
**Key insight**: Atomic arguments reference OrderedSetEntity objects. Connections exist implicitly when atomic arguments share the SAME ordered set reference. The implication line (stroke) is the focusable UI element for creating connections.

**Statement reuse**: The atomic argument stores references to OrderedSetEntity objects, which contain arrays of statement strings. The same statement string can appear in multiple different OrderedSetEntity objects without creating connections.


### Argument (Computed Concept)
**Purpose**: Algorithm output representing a path-complete subset of atomic arguments.
**Domain concept**: Implements the [Argument](../03-concepts/key-terms.md#argument) concept.
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

### NodeEntity
**Purpose**: Data structure representing an instance of an atomic argument within a tree.
**Domain concept**: Implements the [Node](../03-concepts/key-terms.md#node) concept.
```typescript
interface NodeEntity {
  id: string;                    // Unique node instance ID
  argumentId: string;            // Which atomic argument template to use
  parentId: string | null;       // Parent node ID (null for root)
  premisePosition: number;       // Which premise slot to fill (0-indexed)
  fromPosition?: number;         // For multiple conclusions (optional)
  metadata?: {
    left?: string;             // Side text (inherited from argument)
    right?: string;            // Side text (inherited from argument)
    createdAt: number;
    modifiedAt: number;
  };
}
```
**Key insight**: Nodes create tree structure through explicit parent-child relationships, independent of logical connections.

### TreeEntity
**Purpose**: Data structure anchoring a tree of nodes in the document workspace.
**Domain concept**: Tree structure with spatial position.
```typescript
interface TreeEntity {
  id: string;
  documentId: string;
  x: number;                     // Tree position X coordinate
  y: number;                     // Tree position Y coordinate
  metadata?: {
    title?: string;
    createdAt: number;
    modifiedAt: number;
  };
}
```

### Argument Tree (Computed Concept)
**Purpose**: Algorithm output representing the maximal connected component.
**Domain concept**: Implements the [Argument Tree](../03-concepts/key-terms.md#argument-tree) concept.
**Implementation**: Discovered through connected component analysis of logical connections.

```typescript
interface ComputedArgumentTree {
  atomicArgumentIds: Set<string>;
  rootIds: string[];    // Computed: atomic arguments with no parent connections
  leafIds: string[];    // Computed: atomic arguments with no child connections
  depth: number;        // Computed: longest path length
}
```
**Note**: This represents LOGICAL structure, not tree position structure.

### DocumentEntity
**Purpose**: Data structure storing workspace metadata.
**Domain concept**: Implements the [Document](../03-concepts/key-terms.md#document) concept.
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
**Key design**: Documents contain trees, which contain nodes, which reference atomic arguments.

### PositionOverrideEntity
**Purpose**: Optional data structure for manual position adjustments of nodes.
```typescript
interface PositionOverrideEntity {
  id: string;
  nodeId: string;           // Node instance, not atomic argument
  treeId: string;
  xOffset: number;          // Offset from computed position
  yOffset: number;          // Offset from computed position
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
For the conceptual definition of connections, see [Key Terms](../03-concepts/key-terms.md#connections).

**Implementation approach**: Connections exist implicitly through shared ordered set references between atomic arguments.
**Benefits**: 
- Clear object identity (reference equality, not value equality)
- Shared state (modifications affect all referencing arguments)
- No ambiguity (same contents but different objects don't connect)
- Simple detection (just check reference equality)
- Statement reuse (same statement strings can appear in different ordered sets)
- Branching mechanism (conclusion ordered set becomes premise ordered set via shared reference)

### Intentional Construction
**What it means**: Every connection represents an explicit user decision.
**How it works**:
- User selects specific stroke
- User initiates branch/connect action
- System creates new atomic argument sharing the ordered set reference
- Connection exists through this intentional ordered set sharing
- No automatic detection
- Statement reuse is independent of connections (same statement strings can appear in unconnected ordered sets)

### Computed vs Stored
**Stored (Empirical)**:
- Ordered sets (created when users enter statements)
- Atomic arguments (templates that reference ordered set IDs)
- Nodes (instances with parent-child relationships)
- Trees (with document positions)
- Position overrides (user adjusts node positions)
- Documents (user manages)

**Computed (Derived)**:
- Logical connections (from shared ordered set references)
- Arguments (from connection traversal)
- Argument trees (maximal connected components)
- Node positions (from tree structure + layout)
- Which atomic arguments fulfill which premise requirements

## Implementation Philosophy

### What This Implementation Does
- **Enables intentional relationships**: Users create connections by sharing ordered set references
- **Simplifies data model**: No separate connection entities needed
- **Clear identity**: Reference equality makes connections unambiguous
- **Shared state**: Changes to ordered sets propagate to all users
- **Supports statement reuse**: Same statement strings can appear in multiple ordered sets
- **Separates connection from content**: Connection is about shared object references, not matching statement content

### What This Implementation Doesn't Do
- **No string matching**: Same text doesn't create connections
- **No automatic linking**: Users explicitly share ordered set references
- **No complex algorithms**: Connections found through simple ID matching
- **No philosophical claims**: Just engineering
- **No statement objects**: Statements are just reusable strings, not entities with identity
- **No content-based connections**: Connections require shared object references, not matching content

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
function computeNodePosition(
  nodeId: string,
  nodes: Map<string, NodeEntity>,
  trees: Map<string, TreeEntity>,
  overrides: Map<string, PositionOverrideEntity>,
  layoutStyle: LayoutStyle = 'bottom-up'
): { x: number, y: number } {
  const node = nodes.get(nodeId);
  const tree = findTreeContainingNode(nodeId, nodes, trees);
  
  // 1. Find path from root to this node
  const path = findPathFromRoot(nodeId, nodes);
  
  // 2. Start at tree position
  let x = tree.x;
  let y = tree.y;
  
  // 3. Follow parent-child path
  for (let i = 1; i < path.length; i++) {
    const parent = nodes.get(path[i - 1]);
    const current = nodes.get(path[i]);
    const siblings = getChildNodes(parent.id, nodes);
    const siblingIndex = siblings.findIndex(s => s.id === current.id);
    
    // Compute based on layout (children below parents)
    switch (layoutStyle) {
      case 'bottom-up':  // Children provide inputs from below
        y += VERTICAL_SPACING;
        x = computeHorizontalOffset(
          x,
          siblingIndex,
          siblings.length
        );
        break;
      // ... other layout styles
    }
  }
  
  // 4. Apply any override
  const override = overrides.get(nodeId);
  if (override) {
    x += override.xOffset;
    y += override.yOffset;
  }
  
  return { x, y };
}
```

### Creating a Node in Tree
```typescript
function addNodeToTree(
  parentNodeId: string,
  argumentId: string,
  premisePosition: number,
  nodes: Map<string, NodeEntity>,
  atomicArguments: Map<string, AtomicArgumentEntity>
): NodeEntity {
  // 1. Create new node instance
  const newNode: NodeEntity = {
    id: generateId(),
    argumentId: argumentId,         // Which argument template to use
    parentId: parentNodeId,         // Explicit parent relationship
    premisePosition: premisePosition, // Which premise slot to fill
    metadata: { createdAt: Date.now() }
  };
  
  // 2. The argument's conclusion ordered set should match
  //    the parent argument's premise ordered set at that position
  //    (This is validated, not created here)
  
  return newNode;
}
```

### Creating a Branch (Logical Connection)
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