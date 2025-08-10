# Conceptual Data Model [CORE]

For all domain definitions, see [Key Terms](../03-concepts/key-terms.md).

## Statement-Centered Architecture Overview

Proof Editor implements a **statement-centered building block model** where:
- **Statements** are the fundamental building blocks (reusable text with unique IDs)
- **Statement arrays** collect statements for premise/conclusion groupings
- **Atomic arguments** contain premise and conclusion Statement arrays directly
- **Connections** exist when AtomicArg1.conclusions[i] equals AtomicArg2.premises[j] via Statement identity
- **Trees** have physical properties affecting statement flow and spatial positioning

## From File Format to Runtime Model: Reconstructing Connections

The relationship between file storage and runtime connections is fundamental to understanding Proof Editor's architecture:

### File Format: Statement Building Blocks
```yaml
# .proof file - statements as building blocks
statements:
  s1: "All men are mortal"    # Reusable statement building blocks
  s2: "Socrates is a man"
  s3: "Socrates is mortal" 
  s4: "Socrates will die"

proof:
  atomic_arguments:
    - id: arg1
      premises:
        - statements: [s1, s2]     # References to statement building blocks
      conclusions:
        - statements: [s3]         # References to statement building blocks
        
    - id: arg2  
      premises:
        - statements: [s3]         # Same statement reference creates connection
      conclusions:
        - statements: [s4]
```

### Runtime Model: Statement-Based Positional Connections
```typescript
// Runtime - statement building blocks with positional connection model
const statements = new Map([
  ['s1', new StatementEntity('s1', "All men are mortal")],
  ['s2', new StatementEntity('s2', "Socrates is a man")],
  ['s3', new StatementEntity('s3', "Socrates is mortal")],
  ['s4', new StatementEntity('s4', "Socrates will die")]
]);

const arg1 = new AtomicArgumentEntity({
  premises: ['s1', 's2'],     // Statement IDs in premise array
  conclusions: ['s3']         // Statement IDs in conclusion array
});

const arg2 = new AtomicArgumentEntity({
  premises: ['s3'],           // Same Statement ID as arg1.conclusions[0]
  conclusions: ['s4']
});

// Connection exists because arg1.conclusions[0] === arg2.premises[0] (both 's3')
// Statements are reusable building blocks at specific positions
```

### Key Insight: Statements as Building Blocks ≠ Connection Model

The file format uses statement IDs and YAML anchors to **reconstruct** the runtime positional connection model during loading. Statements are reusable building blocks with unique IDs - the true connections exist when the same Statement object appears at specific positions in different atomic arguments.

**Critical Understanding**: The `.proof` file's statement references describe how to rebuild the runtime connections, but the connections themselves are Statement identity relationships at specific array positions, not the statement content itself.

## Core Principle: Statement-Level Positional Connections

Connections exist through Statement identity at specific positions. When AtomicArg1.conclusions[i] equals AtomicArg2.premises[j] via Statement identity, they are connected.

## Data Structure

```mermaid
erDiagram
    STATEMENT {
        string id PK
        string content "reusable text content"
        json metadata
    }
    ATOMIC_ARGUMENT {
        string id PK
        string[] premises "ordered array of Statement IDs"
        string[] conclusions "ordered array of Statement IDs"
        json metadata
    }
    NODE {
        string id PK
        string argument_id FK "which argument template"
        string parent_id FK "parent node (nullable for root)"
        int premise_position "which premise slot to fill"
        int from_position "which conclusion to use (optional)"
        json metadata
    }
    TREE {
        string id PK
        string document_id FK
        float x "tree position x"
        float y "tree position y"
        json metadata
    }
    DOCUMENT {
        string id PK
        string title
        json metadata
    }
    
    STATEMENT ||--o{ ATOMIC_ARGUMENT : "referenced in arrays"
    ATOMIC_ARGUMENT ||--o{ NODE : "instantiated as"
    NODE ||--o{ NODE : "parent-child"
    TREE ||--o{ NODE : "contains"
    DOCUMENT ||--o{ TREE : "contains"
```

No CONNECTION table needed - logical connections emerge from Statement identity at positions.
Tree structure is explicit through NODE parent-child relationships.

## Statement Flow Mechanics

### Runtime Flow Model
The system implements physical statement flow where statements move through atomic arguments as data processing nodes:

```typescript
// Statement flow interfaces for runtime execution
interface StatementFlowEngine {
  // Track statement movement through argument pathways
  traceStatementFlow(fromNodeId: string, toNodeId: string): StatementPath;
  
  // Resolve statement requirements for tree nodes
  resolveNodeInputs(nodeId: string): StatementRequirement[];
  
  // Compute available statement outputs from nodes
  computeNodeOutputs(nodeId: string): StatementOutput[];
  
  // Validate statement flow integrity in trees
  validateFlowIntegrity(treeId: string): FlowValidationResult;
}

interface StatementPath {
  sourceNodeId: string;
  targetNodeId: string;
  flowingStatements: StatementFlow[];
  pathIntegrity: boolean;
}

interface StatementFlow {
  statementId: string;
  sourcePosition: number;     // Which conclusion slot
  targetPosition: number;     // Which premise slot
  flowType: 'direct' | 'derived' | 'conditional';
}

interface StatementRequirement {
  position: number;           // Which premise position needs input
  requiredStatements: string[]; // Statement IDs expected
  satisfiedBy?: string;       // Node ID providing input
  flowStatus: 'pending' | 'satisfied' | 'conflict';
}

interface StatementOutput {
  position: number;           // Which conclusion position produces output
  producedStatements: string[]; // Statement IDs generated
  availableFor: string[];     // Node IDs that can consume this output
  flowCapacity: number;       // How many connections can use this output
}
```

### Physical Tree Flow Model
Trees represent physical statement processing networks where nodes have spatial relationships affecting statement flow:

```typescript
interface PhysicalTreeFlow {
  // Compute statement flow based on spatial tree structure
  computeTreeFlow(treeId: string): TreeFlowModel;
  
  // Handle statement routing between spatially positioned nodes
  routeStatements(fromNode: string, toNode: string): RoutingResult;
  
  // Manage flow conflicts in spatial positioning
  resolveFlowConflicts(treeId: string): ConflictResolution[];
}

interface TreeFlowModel {
  treeId: string;
  flowDirections: Map<string, FlowDirection>; // Node to flow direction
  statementPipelines: StatementPipeline[];   // Active flow paths
  bottlenecks: FlowBottleneck[];             // Flow constraints
  flowEfficiency: number;                    // Overall tree performance
}

interface StatementPipeline {
  pipelineId: string;
  sourceNodeId: string;
  sinkNodeId: string;
  intermediateNodes: string[];               // Nodes along the flow path
  statementCapacity: number;                 // Max statements per flow
  currentLoad: number;                       // Current statement volume
}

interface FlowBottleneck {
  nodeId: string;
  bottleneckType: 'input_capacity' | 'output_capacity' | 'processing_limit';
  severity: 'low' | 'medium' | 'high';
  affectedPipelines: string[];               // Pipeline IDs impacted
  suggestedResolutions: BottleneckResolution[];
}
```

## Implementation Notes

- **Statement Arrays**: Ordered collections directly in AtomicArgument entities
- **Atomic Arguments**: Contain Statement arrays directly - serve as templates AND statement processors
- **Nodes**: Instances of atomic arguments positioned in trees with parent-child relationships AND statement flow capabilities
- **Trees**: Explicit structures with positions in document workspace AND statement processing networks
- **Connections**: No separate entities - discovered through Statement identity at positions AND statement flow pathways
- **Arguments**: Computed by traversing logical connections (not tree structure) AND statement flow analysis
- **Statement Flow**: Physical mechanism where statements move through processing nodes in spatial tree networks

## Storage Architecture

**Persistence Layer**: WatermelonDB + SQLite provides robust multi-platform storage:
- **SQLite Database**: ACID transactions, WAL mode, built-in crash recovery
- **WatermelonDB**: Reactive ORM abstracting SQLite access across platforms
- **Repository Pattern**: Clean abstraction over WatermelonDB for data access
- **Platform Adapters**: Native SQLite engines (node-sqlite3 on desktop, built-in on mobile)

## Key Operations

**Creating Connections**: New atomic argument's premises[j] = parent's conclusions[i] (same Statement ID) AND establish statement flow pipeline

**Creating Tree Structure**: 
1. Create node instance with argument reference
2. Set parent node and premise position
3. Optionally specify which conclusion to use (from position)
4. Initialize statement flow interfaces for the node
5. Establish spatial positioning for statement routing

**Discovering Connections**: Check Statement identity at positions between atomic arguments AND trace statement flow pathways

**Building Trees**: Follow parent-child relationships between nodes AND construct statement processing networks

**Managing Statement Flow**:
1. Route statements from child outputs to parent inputs
2. Validate flow capacity and routing conflicts
3. Optimize statement pipeline efficiency
4. Handle spatial positioning effects on flow

**Spatial Tree Operations**:
1. Position nodes to optimize statement flow
2. Detect and resolve spatial flow conflicts
3. Maintain tree integrity during position changes
4. Update flow routing when trees are moved

## What We Store vs Compute

**Stored**: 
- Statements (reusable text building blocks with unique IDs)
- Atomic arguments (templates with premise/conclusion Statement arrays)
- Nodes (instances with parent-child relationships)
- Trees (with document positions and physical properties)
- Documents
- Physical positioning data (spatial coordinates affecting tree layout)
- Tree physical properties (affecting statement flow and spatial behavior)

**Computed**: 
- Logical connections (from Statement identity at positions)
- Arguments (path-complete sets)
- Node positions (from tree structure and layout algorithm)
- Statement content display (from statement ID lookups)
- Tree physical layout (from node relationships and tree properties)
- Statement flow visualization (based on tree physical properties)

## Example: Building a Proof with Statement Flow

```
Step 1: First atomic argument created with statement building blocks
Stored data:
- Statements: {
    s1: {id: "s1", content: "A"},
    s2: {id: "s2", content: "A→B"},
    s3: {id: "s3", content: "B"}
  }
- AtomicArgument aa1: {
    premises: ["s1", "s2"],
    conclusions: ["s3"]
  }

Step 2: Branch operation creates new atomic argument with statement building blocks
New data added:
- Statements: {
    s4: {id: "s4", content: "C"}     // New statement building block
  }
- AtomicArgument aa2: {
    premises: ["s3"],        ← SAME Statement ID as aa1's conclusions[0]!
    conclusions: ["s4"]
  }

The connection is implicit through shared statement building blocks: 
- aa1.conclusions[0] === aa2.premises[0] (both are "s3")
- They share the SAME Statement object at specific positions
- Statement s3 ("B") creates the logical connection at positions
- Therefore aa1 → aa2 connection exists through shared Statement identity.

Step 3: Physical tree properties affect layout and visualization
Tree data added:
- Tree t1: {
    nodes: {"n1": aa1, "n2": aa2},
    physicalProperties: {
      x: 100, y: 100,              // Tree position in document
      layoutStyle: "bottom-up",     // Children provide inputs from below
      spacingX: 150,               // Horizontal spacing between siblings
      spacingY: 100                // Vertical spacing between levels
    },
    nodePositions: {               // Computed from tree structure
      n1: {x: 100, y: 100},        // Root node
      n2: {x: 100, y: 200}         // Child positioned below parent
    }
  }
```

