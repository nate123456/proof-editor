# Technical Implementation Definitions

This document provides implementation-level specifications for how the Proof Editor system realizes domain concepts in code with **statement building blocks and physical tree properties**. These are engineering details for developers, not conceptual definitions for users.

**IMPORTANT**: This is an implementation document focusing on statement flow and spatial processing systems. For domain concepts and user-facing definitions, see [DDD Glossary](../03-concepts/ddd-glossary.md) and [Key Terms](../03-concepts/key-terms.md).

## Statement-Centered Architecture

Proof Editor implements **statement-centered building blocks** where:
- **Statements** are reusable text entities with unique IDs (fundamental building blocks)
- **Statement arrays** collect statement references for premise/conclusion groupings
- **Atomic arguments** contain premise and conclusion Statement arrays
- **Connections** exist when AtomicArg1.conclusions[i] equals AtomicArg2.premises[j] via Statement identity
- **Trees** have physical properties affecting spatial layout and visualization

## Core Data Structures with Statement Building Blocks

### StatementEntity (New Building Block)
**Purpose**: Fundamental reusable text entity with unique identity.
**Domain concept**: Implements reusable statement building blocks.
```typescript
interface StatementEntity {
  id: string;              // Unique identifier (UUID)
  content: string;         // The actual text content
  
  metadata: {
    createdAt: number;
    modifiedAt: number;
    authorId?: string;           // ID of the human author who created this statement
    sourcePackageId?: string;    // Language package that introduced this statement
    references?: string[];       // External references or citations
    usageCount: number;          // How many ordered sets reference this statement
    referencedBy: string[];      // Ordered set IDs that reference this statement
  };
}
```
**Key insight**: Statements are the fundamental building blocks that get reused across different ordered sets. Same statement content can appear in multiple ordered sets without creating connections - connections require shared ordered set object references.

### DEPRECATED: OrderedSetEntity (Removed)
**MIGRATION NOTE**: The OrderedSetEntity approach has been removed. AtomicArguments now contain Statement arrays directly.

**OLD MODEL** (Deprecated):
- AtomicArguments referenced OrderedSetEntity objects
- Connections through shared OrderedSetEntity references
- Complex indirection through container objects

**NEW MODEL** (Current):
- AtomicArguments contain Statement arrays directly
- Connections through Statement identity at specific positions  
- Direct positional relationships: AtomicArg1.conclusions[i] = AtomicArg2.premises[j]

**For SDK developers**: Do NOT implement OrderedSetEntity. Use Statement arrays in AtomicArguments.

### AtomicArgumentEntity
**Purpose**: Data structure that stores the information defining an atomic argument with premise and conclusion Statement arrays.
**Domain concept**: Implements the [Atomic Argument](../03-concepts/key-terms.md#atomic-argument) concept.
```typescript
interface AtomicArgumentEntity {
  id: string;                    // Unique identifier (UUID)
  premises: string[];            // Array of Statement IDs (ordered, no duplicates)
  conclusions: string[];         // Array of Statement IDs (ordered, no duplicates)
  
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
**Key insight**: Atomic arguments contain Statement arrays directly. Connections exist when AtomicArg1.conclusions[i] equals AtomicArg2.premises[j] via Statement identity. The implication line (stroke) is the focusable UI element for creating connections.

**Statement reuse**: The atomic argument stores arrays of Statement IDs directly. The same Statement can appear in multiple different atomic arguments without creating connections - connections require Statement identity at specific positions, not just shared Statement content.


### Argument (Computed Concept)
**Purpose**: Algorithm output representing a path-complete subset of atomic arguments.
**Domain concept**: Implements the [Argument](../03-concepts/key-terms.md#argument) concept.
**Implementation**: Computed on-demand by analyzing Statement identity at positions.

```typescript
// Not a stored entity - computed by discovering connections through shared ordered sets
function computeArgument(
  startId: string,
  endId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  statements: Map<string, StatementEntity>
): Set<string> {
  // Returns all atomic argument IDs in path-complete subset
  // by traversing connections via Statement identity at positions
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

### TreeEntity with Physical Properties
**Purpose**: Data structure anchoring a tree of nodes in the document workspace with physical properties.
**Domain concept**: Tree structure with spatial position and physical characteristics.
```typescript
interface TreeEntity {
  id: string;
  documentId: string;
  x: number;                     // Tree position X coordinate
  y: number;                     // Tree position Y coordinate
  
  // Physical properties affecting tree behavior
  physicalProperties: {
    layoutStyle: LayoutStyle;      // How nodes are arranged
    spacingX: number;             // Horizontal spacing between siblings
    spacingY: number;             // Vertical spacing between levels
    minWidth: number;             // Minimum tree width
    minHeight: number;            // Minimum tree height
    expansionDirection: ExpansionDirection; // How tree grows
    alignmentMode: AlignmentMode; // How nodes align within levels
  };
  
  metadata?: {
    title?: string;
    createdAt: number;
    modifiedAt: number;
  };
}

type LayoutStyle = 'bottom-up' | 'top-down' | 'left-right' | 'right-left';
type ExpansionDirection = 'horizontal' | 'vertical' | 'radial';
type AlignmentMode = 'left' | 'center' | 'right' | 'justify';
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

### Statement-Level Positional Connection Model
For the conceptual definition of connections, see [Key Terms](../03-concepts/key-terms.md#connections).

**Implementation approach**: Connections exist when AtomicArg1.conclusions[i] equals AtomicArg2.premises[j] via Statement identity.
**Benefits**: 
- Clear positional semantics (premises[0], conclusions[1], etc.)
- Direct relationships (no container indirection)
- Statement identity (same Statement object, not content matching)
- Simple detection (check Statement identity at positions)
- Statement reuse (same Statement can appear in multiple arguments)
- Branching mechanism (Statement from parent.conclusions[i] flows to child.premises[j])

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
- Statements (reusable text building blocks with unique IDs)
- Atomic arguments (templates with Statement arrays)
- Nodes (instances with parent-child relationships)
- Trees (with document positions and physical properties)
- Position overrides (user adjusts node positions)
- Documents (user manages)

**Computed (Derived)**:
- Logical connections (from Statement identity at positions)
- Arguments (from connection traversal)
- Argument trees (maximal connected components)
- Node positions (from tree structure + layout + physical properties)
- Statement content display (from statement ID lookups)
- Tree visual layout (from physical properties and node relationships)

**Position Storage Distinction**: Tree coordinates are stored in offset fields, but individual node coordinates are computed from tree structure and layout properties. This enables trees to move as cohesive units while node positioning emerges from logical relationships.

## Implementation Philosophy

### What This Implementation Does
- **Enables intentional relationships**: Users create connections through Statement identity at positions
- **Simplifies data model**: No separate connection entities needed
- **Clear identity**: Statement identity makes connections unambiguous
- **Direct relationships**: No container indirection, direct Statement arrays
- **Supports statement reuse**: Same Statements can appear in multiple atomic arguments
- **Separates connection from content**: Connection is about Statement identity at positions, not matching content
- **Statement building blocks**: Statements are reusable entities that can appear in multiple argument arrays

### What This Implementation Doesn't Do
- **No string matching**: Same text doesn't create connections
- **No automatic linking**: Users explicitly establish Statement identity at positions
- **No complex algorithms**: Connections found through Statement identity checks
- **No philosophical claims**: Just engineering
- **No content-based connections**: Connections require Statement identity at positions, not matching content
- **No statement identity confusion**: Statements are building blocks that can be reused, connections require identity at specific positions

## Critical Distinctions

### Connection ≠ Value Equality
A connection is NOT "these Statement arrays have the same contents". It's "AtomicArg1.conclusions[i] and AtomicArg2.premises[j] reference the SAME Statement object".

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
  conclusionIndex: number,
  atomicArguments: Map<string, AtomicArgumentEntity>
): AtomicArgumentEntity {
  // 1. Get specific Statement from parent's conclusion array
  const parent = atomicArguments.get(parentId);
  const sharedStatement = parent.conclusions[conclusionIndex];
  
  // 2. Create child with shared Statement as premise
  const child = {
    id: generateId(),
    premises: [sharedStatement],  // SAME STATEMENT IDENTITY!
    conclusions: [],  // User will add conclusions
    metadata: { createdAt: Date.now() }
  };
  
  // 3. Connection exists because:
  //    parent.conclusions[conclusionIndex] === child.premises[0]
  
  return child;
}
```

### Discovering Connections Through Statement Identity
```typescript
function getChildren(
  atomicArgumentId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>
): {child: AtomicArgumentEntity, fromPos: number, toPos: number}[] {
  const parent = atomicArguments.get(atomicArgumentId);
  const connections = [];
  
  // Check Statement identity at positions
  for (const [id, arg] of atomicArguments) {
    if (id !== atomicArgumentId) {
      // Check each parent conclusion against each child premise
      for (let i = 0; i < parent.conclusions.length; i++) {
        for (let j = 0; j < arg.premises.length; j++) {
          if (parent.conclusions[i] === arg.premises[j]) {
            connections.push({
              child: arg,
              fromPos: i,  // parent.conclusions[i]
              toPos: j     // child.premises[j]
            });
          }
        }
      }
    }
  }
  
  return connections;
}

// More efficient with Statement indexing:
function getChildrenEfficient(
  atomicArgumentId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  statementIndex: Map<string, {conclusionOf: {argId: string, pos: number}[], premiseOf: {argId: string, pos: number}[]}>
): {child: AtomicArgumentEntity, fromPos: number, toPos: number}[] {
  const parent = atomicArguments.get(atomicArgumentId);
  const connections = [];
  
  // Use Statement index for efficient lookup
  for (let i = 0; i < parent.conclusions.length; i++) {
    const statementId = parent.conclusions[i];
    const index = statementIndex.get(statementId);
    
    // Find all arguments that use this Statement as premise
    for (const {argId, pos} of index.premiseOf) {
      if (argId !== atomicArgumentId) {
        connections.push({
          child: atomicArguments.get(argId),
          fromPos: i,
          toPos: pos
        });
      }
    }
  }
  
  return connections;
}
```

## Storage Implementation

### WatermelonDB + SQLite Architecture

**Storage Foundation**: Proof Editor uses WatermelonDB + SQLite for robust multi-platform persistence:

```typescript
// WatermelonDB Model Definitions
class StatementModel extends Model {
  static table = 'statements';
  @field('content') content!: string;
  @field('created_at') createdAt!: number;
  @field('modified_at') modifiedAt!: number;
}

class OrderedSetModel extends Model {
  static table = 'ordered_sets';
  @json('statement_ids', sanitizeArray) statementIds!: string[];
  @field('created_at') createdAt!: number;
}

class AtomicArgumentModel extends Model {
  static table = 'atomic_arguments';
  @field('premise_set_ref') premiseSetRef!: string;
  @field('conclusion_set_ref') conclusionSetRef!: string;
  @json('metadata', sanitizeMetadata) metadata!: AtomicArgumentMetadata;
}
```

**Repository Pattern Implementation**:
```typescript
class StatementRepository {
  constructor(private db: Database) {}
  
  async create(content: string): Promise<StatementEntity> {
    return await this.db.write(async () => {
      return await this.db.collections
        .get<StatementModel>('statements')
        .create(statement => {
          statement.content = content;
          statement.createdAt = Date.now();
          statement.modifiedAt = Date.now();
        });
    });
  }
  
  async findById(id: string): Promise<StatementEntity | null> {
    try {
      return await this.db.collections
        .get<StatementModel>('statements')
        .find(id);
    } catch {
      return null;
    }
  }
}
```

**Platform-Specific Adapters**:
- **Desktop**: Uses `node-sqlite3` binding via WatermelonDB's NodeJS adapter
- **Mobile**: Uses React Native's built-in SQLite via WatermelonDB's RN adapter  
- **Cross-Platform**: Same WatermelonDB API across all platforms

**Benefits**:
- **ACID Compliance**: SQLite guarantees data consistency
- **Performance**: Optimized queries and indexing through WatermelonDB
- **Reactive**: Automatic UI updates when data changes
- **Offline-First**: Full functionality without network dependency

## Summary

The Proof Editor implementation is built on a foundation of statement building blocks and shared ordered set objects, persisted through WatermelonDB + SQLite for robust multi-platform storage. Statements are reusable text entities with unique IDs that serve as the fundamental building blocks. Users create connections by intentionally sharing ordered set references across atomic arguments - when the conclusion ordered set of one argument IS (same reference) the premise ordered set of another, a connection exists implicitly. The system discovers these connections through simple reference equality checks, not through value matching. This approach provides:

- **Statement reusability**: Statements are building blocks that can be used in multiple contexts
- **Clear identity**: Connections exist only when ordered set objects are the SAME (===)
- **Shared state**: Modifications to an ordered set affect all referencing arguments
- **No ambiguity**: Same statement content but different ordered set objects don't create connections
- **Simple implementation**: Just check reference equality for ordered sets, lookup statements by ID
- **Robust persistence**: ACID-compliant storage with automatic crash recovery via SQLite + WatermelonDB