# Branching: Creating Physical Statement Flow Paths

Branching is the core mechanism for building logical proofs in Proof Editor. It creates physical pathways for **statements** - the fundamental building blocks - to flow between atomic arguments, establishing concrete statement flow channels in the proof tree where statements move from conclusions to premises.

## What is Branching?

Branching creates **physical statement flow paths** that allow statement building blocks produced as conclusions in one atomic argument to physically travel and become premises for another:

1. **Statement Movement**: Establishes pathways where the same statement building block physically travels from one location to another
2. **Tree Construction**: Creates concrete node relationships that define where and how statement building blocks flow
3. **Positional Attachment**: Specifies exactly which premise position receives the flowing statement building block

**Key Insight**: When you branch, you're creating a physical pathway for a statement building block to move from its conclusion position to a premise position elsewhere in the tree.

**How statement flow works**: 
- **Physically**: A statement building block produced as a conclusion in one atomic argument travels along the branch to become a premise in another
- **Structurally**: The tree records where this physical flow occurs and which specific premise position receives the statement building block

## How Statement Flow Branching Works

### 1. Select Statement Source [PLATFORM]
Users select where statement building blocks will flow FROM - typically a conclusion that will feed into a premise elsewhere:
- **Visual mode** [PLATFORM]: Clicking on the conclusion containing the statement
- **Text mode** [PLATFORM]: Placing cursor on the statement text
- **Keyboard navigation** [PLATFORM]: Using keyboard to focus the statement source

### 2. Initiate Flow Creation [PLATFORM]
Users create the physical flow pathway:
- **Keyboard** [PLATFORM]: `Ctrl/Cmd + B` (customizable)
- **Context Menu** [PLATFORM]: Right-click → "Create flow from this statement"
- **Command Palette** [PLATFORM]: "Proof: Create statement flow path"
- **Touch** [PLATFORM]: Long-press on statement → "Create flow"

### 3. Choose Statement Destination [PLATFORM]
Users specify WHERE the statement building block will flow TO - which premise position needs this statement:
- **Visual selection** [PLATFORM]: Click on the specific premise slot that needs the statement
- **Keyboard selection** [PLATFORM]: Use number keys (1-9) to select destination position
- **Touch selection** [PLATFORM]: Tap the premise position that will receive the statement
- **Multi-premise handling** [PLATFORM]: For arguments with multiple premises, clearly indicate which position receives the flowing statement

### 4. Establish Physical Flow Path [CORE + PLATFORM]
The system creates the physical statement building block movement infrastructure:

**A. New Tree Node** [CORE]:
- Node ID assigned (e.g., "n2", "n3")
- Physical connection to parent node established
- Premise position recorded (which slot receives the statement)
- Argument template reference stored

**B. Statement Flow Channel** [CORE]:
- Physical pathway created for statement building blocks to travel from child's conclusion to parent's premise
- Statement building blocks flow bottom-up: children physically deliver statement building blocks to their parents
- Same statement building block can flow to multiple destinations via different pathways

**Example Structure**:
```yaml
nodes:
  n1: {arg: *needs_AB_produces_C}      # Parent node
  n2: {n1: *produces_A, on: 0}         # Child filling position 0 (A)
  n3: {n1: *produces_B, on: 1}         # Child filling position 1 (B)
```

### 5. Position Flow Infrastructure [PLATFORM]
The new flow pathway is positioned in the visual workspace:
- **Automatic layout** [PLATFORM]: Tree layout algorithm positions the flow path
- **Manual adjustment** [PLATFORM]: User can drag to reposition the flow visualization
- **Layout styles** [PLATFORM]: Different tree layouts available (top-down, left-right, radial)
- **Spatial independence** [PLATFORM]: Visual position doesn't affect the underlying statement flow

### 6. Configure Statement Production [CORE + PLATFORM]
Users can then configure what statement building blocks the new node will produce:
- **Statement editing** [CORE]: Define what statement building blocks this node will produce as conclusions
- **Flow validation** [CORE]: Ensure the produced statement building blocks match what the parent premise expects
- **Visual refinement** [PLATFORM]: Adjust flow visualization as needed
- **Extend flows** [CORE]: Create additional flow paths to supply other premise positions

## Example Workflow: Building Statement Flow Networks

```yaml
# Step 1: Define argument templates (statement transformation rules)
arguments:
  - &syllogism 
    [All men are mortal, Socrates is a man]: [Socrates is mortal]
  - &mortality_implies_death
    [Socrates is mortal]: [Socrates will die]
  - &death_timing
    [Socrates will die]: [Socrates will die eventually]

# Step 2: Create initial flow network with root node
trees:
  - offset: {x: 100, y: 100}
    nodes:
      n1: {arg: *mortality_implies_death}  # Root expects "Socrates is mortal" to flow in

# Step 3: User creates flow path to supply the needed statement
# Creates physical pathway for "Socrates is mortal" to flow into n1:
nodes:
  n1: {arg: *mortality_implies_death}      # Still the root
  n2: {n1: *syllogism, on: 0}             # Child produces "Socrates is mortal" which flows to n1

# Step 4: Continue building - create flow from n1's output
nodes:
  n1: {arg: *mortality_implies_death}      
  n2: {n1: *syllogism, on: 0}             
  n3: {n1: *death_timing, on: 0}          # n1's "Socrates will die" flows to n3

# Final statement flow network:
#          n2 (produces: "Socrates is mortal")
#               ↓ (statement flows down)
#          n1 (receives: "Socrates is mortal" → produces: "Socrates will die")  
#               ↓ (statement flows down)
#          n3 (receives: "Socrates will die" → produces: "Socrates will die eventually")
```

**Key points**:
- **Flow Networks**: Nodes form networks where statement building blocks physically travel between them
- **Statement Movement**: Bottom-up - n2 produces statement building blocks that flow to n1, n1's products flow to n3
- **Physical Pathways**: Each connection represents a concrete channel for statement building block movement
- **Spatial Layout**: Visual positioning shows flow direction but doesn't affect the actual statement building block movement

## Multiple Flow Paths: Alternative Statement Sources

A single premise position can receive the same statement building block from multiple alternative sources:

```yaml
arguments:
  - &needs_B [B]: [X]           # Needs statement B to flow in, produces X
  - &A_produces_B [A]: [B]      # Transforms A into B
  - &C_produces_B [C]: [B]      # Also transforms C into B  
  - &D_produces_B [D]: [B]      # Also transforms D into B

trees:
  - nodes:
      n1: {arg: *needs_B}                  # Root expects B statement to flow in
      n2: {n1: *A_produces_B, on: 0}       # One pathway producing B statement
      n3: {n1: *C_produces_B, on: 0}       # Alternative pathway producing B statement
      n4: {n1: *D_produces_B, on: 0}       # Another alternative pathway producing B statement

# Statement flow visualization:
#     n2 (A→B) ──┐
#                 ├──→ n1 (B→X)  [all paths deliver statement B]
#     n3 (C→B) ──┤
#                 │
#     n4 (D→B) ──┘
```

**Key insight**: Multiple flow paths can deliver the same statement building block to the same destination, representing alternative ways to produce the required statement building block. Each path is a separate physical channel for statement building block delivery.

## Multiple Statement Destinations

When an argument needs multiple different statement building blocks, each must flow in through separate channels:

```yaml
arguments:
  - &needs_ABC [A, B, C]: [X]    # Needs statements A, B, and C to flow in
  - &produces_A []: [A]          # Produces statement A
  - &produces_B []: [B]          # Produces statement B  
  - &produces_C []: [C]          # Produces statement C

trees:
  - nodes:
      n1: {arg: *needs_ABC}              # Root with 3 statement input channels
      n2: {n1: *produces_A, on: 0}       # Statement A flows to channel 0
      n3: {n1: *produces_B, on: 1}       # Statement B flows to channel 1
      n4: {n1: *produces_C, on: 2}       # Statement C flows to channel 2

# Statement flow structure:
#     n2 (→A) ──→ channel 0 ┐
#                           │
#     n3 (→B) ──→ channel 1 ├──→ n1 (A,B,C→X)
#                           │
#     n4 (→C) ──→ channel 2 ┘
```

**Important**: Each flow path specifies which input channel it supplies using the `on:` field. This allows precise control over which statement building block flows where.

## Reverse Flow Creation

Users can create "upstream" flows - selecting a premise that needs a statement building block and creating a new source to produce that statement building block:

```yaml
# User selects premise position expecting statement B:
- premises: [B]                    # Needs statement B to flow in
  conclusions: [C]                 # Will produce statement C

# Creates upstream source:
- premises: [A]                    # New source takes statement A
  conclusions: [B]                 # Produces statement B (flows to the premise above)
```

**Physical flow**: The new argument produces statement building block B, which physically flows to the premise position that was expecting it, creating a complete flow pathway.

## Platform-Specific Interactions

### Desktop (VS Code)
- Hover effects highlight branchable statements
- Keyboard shortcuts for quick branching
- Multi-select for branching from multiple statements simultaneously

### Mobile/Tablet
- Touch targets sized appropriately (minimum 44x44 points)
- Long-press gesture for branch menu
- Drag-and-drop for visual positioning after branch

### Accessibility
- Screen reader announces "Branchable statement" on focus
- Keyboard navigation between statements
- Clear audio feedback when branch connection is created

## Implementation Notes

The branching mechanism creates both logical connections AND tree structure:

**Logical Connections**:
- Branching creates new AtomicArgumentEntity with Statement arrays containing the same Statement IDs
- No copying of content - references point to the same Statement objects
- Statement reuse is independent - same statements can appear in unconnected arguments
- Connection = shared Statement identity at positions, not shared content
- Changes to Statements affect all referencing atomic arguments

**Tree Structure**:
- Each branch creates a new Node with parent reference and position
- Nodes instantiate argument templates at specific tree positions
- Same argument can be used multiple times in different nodes
- Tree structure is explicit through parent-child relationships
- Visual layout is computed from tree structure

## Understanding Statement Flow vs. Potential Flow

**Potential Flow vs. Actual Flow**:
- **Potential Flow**: Shows what statement building blocks CAN flow between arguments (compatible input/output statement building blocks)
- **Actual Flow**: Shows what statement building blocks DO flow WHERE in the constructed tree (active flow pathways)

**Example Distinction**:
```yaml
# These arguments have potential flow compatibility:
arguments:
  - &arg1 [A]: [B]    # Produces B (could flow to arg2 or arg3)
  - &arg2 [B]: [C]    # Needs B, produces C (could receive from arg1)
  - &arg3 [B]: [D]    # Needs B, produces D (could receive from arg1)

# This tree shows actual statement flows:
trees:
  - nodes:
      n1: {arg: *arg2}          # Root expecting B to flow in
      n2: {n1: *arg1, on: 0}    # B statement flows from n2 to n1
      # arg3 is not connected, so no actual flow occurs despite potential
```

**Key Insight**: Branching is how users BUILD statement flow networks by selecting which potential flows to actualize and creating the physical pathways for statement building blocks to travel.