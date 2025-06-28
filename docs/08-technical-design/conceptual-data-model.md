# Conceptual Data Model

## Overview

This document bridges domain concepts and their technical implementation. It shows how the pure logical concepts (atomic arguments as relations, connections as parent-child relationships, trees as maximal connected components) map to concrete data structures.

**Note**: This is a technical design document. For pure domain concepts, see [DDD Glossary](../03-concepts/ddd-glossary.md).

## Core Principle: Statement-Based Construction

The data model reflects a fundamental insight: **connections exist through shared Statements**. When a user creates a connection, they are establishing that a Statement appearing as a conclusion in one atomic argument also functions as a premise in another. Statements are first-class entities that maintain logical relationships.

## Entity Relationship Model

**Terminology Note**: The philosopher describes premises and conclusions as "ordered n-tuples of strings." In our implementation, `string[]` (string array) is the exact representation of an ordered n-tuple - it maintains order and allows variable length where n can be 0, 1, 2, or any number of elements.

```mermaid
erDiagram
    STATEMENT {
        string id PK
        string text "the actual string content"
        json metadata "creation info, usage tracking"
    }
    ATOMIC_ARGUMENT {
        string id PK
        string[] premise_ids "ordered Statement IDs"
        string[] conclusion_ids "ordered Statement IDs"
        json metadata "side_labels, references, timestamps"
    }
    
    CONNECTION {
        string id PK
        string statement_id FK "the shared Statement"
        string parent_argument_id FK
        number parent_conclusion_index
        string child_argument_id FK
        number child_premise_index
        timestamp created_at
        string created_by "user action that created this"
    }
    
    DOCUMENT {
        string id PK
        string title
        json metadata
        timestamp created_at
        timestamp modified_at
    }
    
    TREE_POSITION {
        string id PK
        string document_id FK
        string root_argument_id FK "which atomic argument is the tree root"
        number x "anchor point for tree"
        number y "anchor point for tree"
        string layout_style "top-down, bottom-up, left-right, etc."
        json layout_params "spacing, alignment preferences"
    }
    
    POSITION_OVERRIDE {
        string id PK
        string atomic_argument_id FK
        string document_id FK
        number x_offset "offset from computed position"
        number y_offset "offset from computed position"
    }
    
    STATEMENT ||--o{ ATOMIC_ARGUMENT : "referenced by"
    STATEMENT ||--o{ CONNECTION : "shared in"
    ATOMIC_ARGUMENT ||--o{ CONNECTION : "parent"
    ATOMIC_ARGUMENT ||--o{ CONNECTION : "child"
    ATOMIC_ARGUMENT ||--o| TREE_POSITION : "root of tree at"
    ATOMIC_ARGUMENT ||--o{ POSITION_OVERRIDE : "may have override"
    DOCUMENT ||--o{ TREE_POSITION : "contains trees"
    DOCUMENT ||--o{ POSITION_OVERRIDE : "contains overrides"
```

## Conceptual Entities

### Statement (Content Layer)
The fundamental unit of logical content:
- **Text**: The actual string content
- **Identity**: Unique ID that survives text edits
- **Relationships**: Tracks which atomic arguments reference it
- **Reusability**: Can appear in multiple atomic arguments

### Atomic Argument (Logical Layer)
A relation between two ordered n-tuples of Statements:
- **Premises**: Ordered references to Statement entities (may be empty)
- **Conclusions**: Ordered references to Statement entities (may be empty)
- **Side labels**: Optional text annotations
- **Implication line (stroke)**: The visual element that users interact with to create connections

The implication line is crucial - it's the **focusable element** that users select when creating connections. Atomic arguments don't contain text directly - they reference Statement entities.

### Connection (Shared Statement)
Represents a **shared Statement** between atomic arguments:
- Records which Statement is shared
- Identifies the parent (where Statement is a conclusion) and child (where it's a premise)
- Tracks the specific indices for precise rendering
- Created through user interaction (keyboard commands on selected stroke)

**Why a separate CONNECTION entity?** Connections record more than just "these arguments share a Statement":
1. **Indices**: Where exactly the Statement appears (for rendering connection lines)
2. **Direction**: Which argument is parent vs child (logical flow)
3. **Metadata**: When/how the connection was created
4. **Intent**: The user's specific decision to reuse this Statement

### Document (Workspace)
The canvas containing positioned argument trees:
- Provides spatial context for editing
- Maintains document-level metadata
- References argument trees through tree positions
- Individual atomic arguments have computed positions based on tree structure

### Argument (Computed View)
A path-complete set of atomic arguments connected through parent-child relationships. Computed by traversing the connection graph.

### Argument Tree (Computed View)
The maximal connected component containing all atomic arguments reachable through connections. Discovered through graph analysis.

## Interaction Model

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Editor
    participant DataModel
    
    User->>UI: Select implication line (stroke)
    UI->>UI: Highlight selected atomic argument
    User->>UI: Press connection key (e.g., 'b' for branch)
    UI->>Editor: Create child atomic argument
    Editor->>DataModel: Create new atomic argument
    Editor->>DataModel: Create connection (parent→child)
    DataModel->>UI: Update view with new connection
```

## Key Design Principles

### 1. Connections are Shared Statements
Connections exist when atomic arguments share Statement entities:
- Statements are created once and referenced multiple times
- Editing a Statement's text doesn't break connections (ID remains)
- Each connection represents intentional Statement reuse

### 2. The Stroke as First-Class UI Element
The implication line (stroke) is:
- The focusable element for connection operations
- The visual representation of the atomic argument
- The interaction point for creating branches

### 3. Keyboard-Driven Connection Creation
Users create connections through:
- Selecting a stroke (implication line)
- Using keyboard commands to branch
- Explicitly choosing where to connect

## What We Store vs What We Compute

### We Store (User-Created):
- **Statements**: The actual text content as reusable entities
- **Atomic Arguments**: Relations that reference Statements
- **Connections**: Records of shared Statements between arguments
- **Documents**: Workspace metadata
- **Tree Positions**: Where each tree is anchored in documents
- **Position Overrides**: Optional manual adjustments to computed positions

### We Compute (Emergent):
- **Arguments**: Path-complete subsets
- **Argument Trees**: Maximal connected components
- **Tree Properties**: Roots, leaves, depth
- **Atomic Argument Positions**: Computed from tree structure and layout algorithm

## Example: Building a Proof

```
Step 1: User creates first atomic argument
┌─────────────────────┐
│ A                   │
│ A→B                 │
│ ─────── [MP]        │  ← User can select this stroke
│ B                   │
└─────────────────────┘

Step 2: User selects stroke and presses 'b' to branch
┌─────────────────────┐
│ A                   │
│ A→B                 │
│ ─────── [MP]        │
│ B                   │  ← Statement "B" (id: stmt-001)
└─────────────────────┘
          ↓
    [Connection created]
          ↓
┌─────────────────────┐
│ B                   │  ← Same Statement "B" (id: stmt-001)
│ B→C                 │
│ ─────── [MP]        │
│ C                   │
└─────────────────────┘

Stored Connection:
{
  statement_id: "stmt-001",     // The shared Statement "B"
  parent_argument_id: "aa-001",
  parent_conclusion_index: 0,   // Position in parent
  child_argument_id: "aa-002",
  child_premise_index: 0,       // Position in child
  created_at: 1703001000,
  created_by: "branch_command"
}
```

## Position Computation Model

### How Positions Are Computed

Atomic argument positions are computed algorithmically from tree structure:

```
1. Start with tree anchor position (x, y) from TREE_POSITION
2. Identify root atomic argument(s) - those with no incoming connections
3. Position root at anchor point
4. For each child atomic argument:
   - Calculate position based on:
     - Parent position
     - Number of siblings
     - Layout direction (top-down, left-right, etc.)
     - Spacing parameters
   - Apply position
5. Apply any POSITION_OVERRIDE offsets if they exist
```

### Example Layout Algorithm (Top-Down)

```
function computePositions(treePosition, rootId, connections) {
  const positions = new Map();
  const visited = new Set();
  
  // Start at tree anchor
  positions.set(rootId, {
    x: treePosition.x,
    y: treePosition.y
  });
  
  // Breadth-first traversal
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift();
    const parentPos = positions.get(parentId);
    
    // Find children
    const children = getChildren(parentId, connections);
    const childWidth = treePosition.layoutParams.nodeWidth;
    const spacing = treePosition.layoutParams.horizontalSpacing;
    const totalWidth = children.length * childWidth + 
                      (children.length - 1) * spacing;
    
    // Position children
    let xOffset = -totalWidth / 2;
    for (const child of children) {
      positions.set(child.id, {
        x: parentPos.x + xOffset + childWidth / 2,
        y: parentPos.y + treePosition.layoutParams.verticalSpacing
      });
      xOffset += childWidth + spacing;
      queue.push(child.id);
    }
  }
  
  // Apply any overrides
  for (const [argId, pos] of positions) {
    const override = getOverride(argId, treePosition.documentId);
    if (override) {
      pos.x += override.x_offset;
      pos.y += override.y_offset;
    }
  }
  
  return positions;
}
```

### Benefits of Computed Positions

1. **Consistency**: Tree structure automatically maintains visual coherence
2. **Flexibility**: Change layout algorithm without migrating data
3. **Performance**: Store less data, compute on demand
4. **Correctness**: Visual layout always reflects logical structure

## Design Rationale

### Why Use Statement Entities?
1. **Logical Clarity**: Connections exist because Statements are shared
2. **Edit Resilience**: Change text without breaking relationships
3. **Reuse Tracking**: See how Statements flow through arguments
4. **Performance**: Direct references without string comparison

### Why Not Inline Strings?
1. **Identity**: Statements need stable IDs across edits
2. **Relationships**: Track which arguments use which Statements
3. **Efficiency**: Reuse Statements without duplication
4. **Semantics**: Shared Statements create connections

### Why Separate Tree Position from Logic?
1. **Reusability**: Same proof in multiple documents with different tree positions
2. **Clean Architecture**: Logic independent of presentation
3. **Multiple Views**: Different spatial arrangements of same proof
4. **Computed Layout**: Individual atomic argument positions flow from tree structure
5. **Flexibility**: Change layout algorithm without changing stored data

## Summary

This data model reflects the true nature of the Proof Editor: a tool for **constructing logical arguments through shared Statements**. Statements are first-class entities that atomic arguments reference. When users create connections, they're establishing that a Statement functions in multiple roles - as a conclusion in one argument and a premise in another. The system stores these Statement relationships and computes the emergent tree structures that result.