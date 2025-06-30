# Branching: Building Proof Trees Through Node Creation

Branching is the core mechanism for building logical proofs in Proof Editor. It creates both logical connections (through shared ordered sets) AND tree structure (through parent-child node relationships).

## What is Branching?

Branching has two complementary aspects:

1. **Logical Connection**: Creates connections between atomic arguments through the ordered set-based connection mechanism (see [Key Terms](../03-concepts/key-terms.md#connections))
2. **Tree Building**: Creates a new NODE in the proof tree that instantiates an argument template at a specific position

**Key Insight**: When you branch, you're not just connecting logic - you're building a tree structure where child nodes provide inputs to their parent nodes' premise positions.

**How branching works**: 
- **Logically**: The child's conclusion ordered set provides the content for the parent's premise ordered set at the selected position
- **Structurally**: A new node is created as a child of the selected parent node, attached to a specific premise position

## How Branching Works

### 1. Select Source Ordered Set [PLATFORM]
Users select an ordered set (typically a conclusion) from an existing atomic argument. This can be done by:
- **Visual mode** [PLATFORM]: Clicking on the ordered set
- **Text mode** [PLATFORM]: Placing cursor on the ordered set  
- **Keyboard navigation** [PLATFORM]: Using keyboard to focus the ordered set

### 2. Initiate Branch Command [PLATFORM]
Users trigger the branch action through:
- **Keyboard** [PLATFORM]: `Ctrl/Cmd + B` (customizable)
- **Context Menu** [PLATFORM]: Right-click → "Branch from this conclusion"
- **Command Palette** [PLATFORM]: "Proof: Branch from selected ordered set"
- **Touch** [PLATFORM]: Long-press on ordered set → "Branch"

### 3. Choose Parent Premise Position [PLATFORM]
When branching from a parent node, users must specify which premise position to fulfill:
- **Visual selection** [PLATFORM]: Click on the specific premise slot
- **Keyboard selection** [PLATFORM]: Use number keys (1-9) to select position
- **Touch selection** [PLATFORM]: Tap the premise position indicator
- **Multi-premise handling** [PLATFORM]: For nodes with multiple premises, clearly indicate which position is being filled

### 4. Create New Tree Node [CORE + PLATFORM]
The system creates both:

**A. New Node in Tree** [CORE]:
- Node ID assigned (e.g., "n2", "n3")
- Parent node reference stored
- Premise position recorded (which slot this fills)
- Argument template reference stored

**B. Logical Connection** [CORE]:
- The child node's conclusion provides input to the parent's selected premise position
- Data flows bottom-up: children fulfill their parents' requirements
- Same argument template can be used multiple times in different positions

**Example Structure**:
```yaml
nodes:
  n1: {arg: *needs_AB_produces_C}      # Parent node
  n2: {n1: *produces_A, on: 0}         # Child filling position 0 (A)
  n3: {n1: *produces_B, on: 1}         # Child filling position 1 (B)
```

### 5. Position in Visual Space [PLATFORM]
The new node is positioned visually:
- **Automatic layout** [PLATFORM]: Tree layout algorithm positions the node
- **Manual adjustment** [PLATFORM]: User can drag to reposition if needed
- **Layout styles** [PLATFORM]: Different tree layouts available (top-down, left-right, radial)
- **Spatial independence** [PLATFORM]: Visual position doesn't affect logical structure

### 6. Edit New Node's Content [CORE + PLATFORM]
Users can then:
- **Content editing** [CORE]: Add statements to the new node's conclusion ordered set
- **Structure editing** [CORE]: The argument template defines the structure
- **Visual refinement** [PLATFORM]: Adjust tree layout or node position as needed
- **Continue branching** [CORE]: Add more children to fulfill other premise positions

## Example Workflow: Building a Tree

```yaml
# Step 1: Define argument templates
arguments:
  - &syllogism 
    [All men are mortal, Socrates is a man]: [Socrates is mortal]
  - &mortality_implies_death
    [Socrates is mortal]: [Socrates will die]
  - &death_timing
    [Socrates will die]: [Socrates will die eventually]

# Step 2: Create initial tree with root node
trees:
  - offset: {x: 100, y: 100}
    nodes:
      n1: {arg: *mortality_implies_death}  # Root needs "Socrates is mortal"

# Step 3: User branches to provide the needed premise
# Selects n1's premise position 0 and creates child:
nodes:
  n1: {arg: *mortality_implies_death}      # Still the root
  n2: {n1: *syllogism, on: 0}             # Child provides "Socrates is mortal"

# Step 4: Continue building - branch from n1's conclusion
nodes:
  n1: {arg: *mortality_implies_death}      
  n2: {n1: *syllogism, on: 0}             
  n3: {n1: *death_timing, on: 0}          # Uses n1's conclusion as input

# Final tree structure:
#          n2 (syllogism)
#               ↓
#          n1 (mortality→death)  
#               ↓
#          n3 (death timing)
```

**Key points**:
- **Tree Structure**: Nodes form parent-child relationships with explicit positions
- **Data Flow**: Bottom-up - n2 provides input to n1, n1's output feeds n3
- **Reusability**: Same argument templates can be used in multiple nodes
- **Visual Layout**: Tree can be repositioned without affecting logical structure

## Multiple Branches: Same Position, Different Children

A parent node can have multiple children providing input to the same premise position:

```yaml
arguments:
  - &needs_B [B]: [X]           # Needs B to produce X
  - &A_produces_B [A]: [B]      # A produces B
  - &C_produces_B [C]: [B]      # C also produces B
  - &D_produces_B [D]: [B]      # D also produces B

trees:
  - nodes:
      n1: {arg: *needs_B}                  # Root needs B
      n2: {n1: *A_produces_B, on: 0}       # One way to get B
      n3: {n1: *C_produces_B, on: 0}       # Alternative way to get B
      n4: {n1: *D_produces_B, on: 0}       # Another alternative

# Tree visualization:
#     n2 (A→B) ──┐
#                 ├──→ n1 (B→X)
#     n3 (C→B) ──┤
#                 │
#     n4 (D→B) ──┘
```

**Key insight**: Multiple nodes can fulfill the same premise position, representing alternative ways to satisfy a logical requirement. This is different from having multiple premises in one argument.

## Multiple Premise Positions

When a parent node has multiple premises, each position must be filled separately:

```yaml
arguments:
  - &needs_ABC [A, B, C]: [X]    # Needs all three inputs
  - &produces_A []: [A]          # Produces A
  - &produces_B []: [B]          # Produces B  
  - &produces_C []: [C]          # Produces C

trees:
  - nodes:
      n1: {arg: *needs_ABC}              # Root with 3 premise positions
      n2: {n1: *produces_A, on: 0}       # Fills position 0 (A)
      n3: {n1: *produces_B, on: 1}       # Fills position 1 (B)
      n4: {n1: *produces_C, on: 2}       # Fills position 2 (C)

# Tree structure:
#     n2 (→A) ──→ position 0 ┐
#                            │
#     n3 (→B) ──→ position 1 ├──→ n1 (ABC→X)
#                            │
#     n4 (→C) ──→ position 2 ┘
```

**Important**: Each child specifies which premise position it fills using the `on:` field. This allows precise control over how arguments connect.

## Reverse Branching

Users can also branch "backwards" - selecting a premise ordered set to create a new atomic argument whose conclusion OrderedSetEntity becomes that premise OrderedSetEntity:

```yaml
# User selects premise [B] and reverse-branches:
- premises: [B]                    # OrderedSetEntity ID: "os-500"
  conclusions: [C]                 # OrderedSetEntity ID: "os-600"

# Creates:
- premises: [A]                    # OrderedSetEntity ID: "os-700" (new)
  conclusions: [B]                 # OrderedSetEntity ID: "os-500" (SAME as above)
```

**Reverse connection**: The new atomic argument's conclusion OrderedSetEntity reference points to the same object ("os-500") as the existing atomic argument's premise reference.

## Platform-Specific Interactions

### Desktop (VS Code)
- Hover effects highlight branchable ordered sets
- Keyboard shortcuts for quick branching
- Multi-select for branching from multiple ordered sets simultaneously

### Mobile/Tablet
- Touch targets sized appropriately (minimum 44x44 points)
- Long-press gesture for branch menu
- Drag-and-drop for visual positioning after branch

### Accessibility
- Screen reader announces "Branchable ordered set" on focus
- Keyboard navigation between ordered sets
- Clear audio feedback when branch connection is created

## Implementation Notes

The branching mechanism creates both logical connections AND tree structure:

**Logical Connections**:
- Branching creates new AtomicArgumentEntity with shared OrderedSetEntity reference IDs
- No copying of content - references point to the same objects
- Statement reuse is independent - same statement strings can appear in unconnected ordered sets
- Connection = shared reference, not shared content
- Changes to shared OrderedSetEntity affect all referencing atomic arguments

**Tree Structure**:
- Each branch creates a new Node with parent reference and position
- Nodes instantiate argument templates at specific tree positions
- Same argument can be used multiple times in different nodes
- Tree structure is explicit through parent-child relationships
- Visual layout is computed from tree structure

## Understanding the Dual Nature

**Connections vs Tree Structure**:
- **Connections**: Show what CAN connect logically (which arguments share ordered sets)
- **Tree Structure**: Shows what DOES connect WHERE positionally (actual parent-child nodes)

**Example Distinction**:
```yaml
# These arguments CAN connect (shared ordered sets):
arguments:
  - &arg1 [A]: [B]    # Can connect to arg2
  - &arg2 [B]: [C]    # Can connect to arg1 or arg3
  - &arg3 [B]: [D]    # Can connect to arg2

# This tree shows what DOES connect:
trees:
  - nodes:
      n1: {arg: *arg2}          # Root using arg2
      n2: {n1: *arg1, on: 0}    # arg1 feeds n1's position 0
      # arg3 is not used in this tree, despite being connectable
```

**Key Insight**: Branching is how users BUILD proof trees by selecting which potential connections to actualize and where to position them in the tree structure.