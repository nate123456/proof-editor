# Branching: Creating Connections Between Atomic Arguments

Branching is the core mechanism for building logical proofs in Proof Editor. It creates connections between atomic arguments by sharing ordered sets.

## What is Branching?

Branching creates a new atomic argument that is connected to an existing one. The connection is formed by having the new atomic argument's premise ordered set reference point to the SAME OrderedSetEntity object as the parent's conclusion ordered set reference.

**Key insight**: Branching creates connections through shared object references, not by copying content. The conclusion OrderedSetEntity of the parent becomes the premise OrderedSetEntity of the child - they share the same object.

## How Branching Works

### 1. Select Source Ordered Set
Users select an ordered set (typically a conclusion) from an existing atomic argument. This can be done by:
- Clicking on the ordered set in visual mode
- Placing cursor on the ordered set in text mode
- Using keyboard navigation to focus the ordered set

### 2. Initiate Branch Command
Users trigger the branch action through:
- **Keyboard**: `Ctrl/Cmd + B` (customizable)
- **Context Menu**: Right-click → "Branch from this conclusion"
- **Command Palette**: "Proof: Branch from selected ordered set"
- **Touch**: Long-press on ordered set → "Branch"

### 3. New Atomic Argument Creation
The system creates a new atomic argument where:
- The premise ordered set reference points to the SAME OrderedSetEntity as the selected conclusion ordered set (shared object reference)
- The conclusion ordered set is initially empty (new OrderedSetEntity)
- The atomic argument is positioned appropriately in the visual layout

**Reference sharing**: The new atomic argument's `premiseSetRef` field contains the same OrderedSetEntity ID as the parent's `conclusionSetRef` field. This shared reference IS the connection.

### 4. Edit New Atomic Argument
Users can then:
- Add statements to the new conclusion ordered set
- Add additional premises if needed
- Adjust the visual position if desired

## Example Workflow

```yaml
# Initial state: One atomic argument
- premises: [All men are mortal, Socrates is a man]
  conclusions: [Socrates is mortal]  # OrderedSetEntity ID: "os-123"

# User selects "Socrates is mortal" ordered set and branches
# System creates new atomic argument sharing that OrderedSetEntity:

- premises: [All men are mortal, Socrates is a man]  # OrderedSetEntity ID: "os-456"
  conclusions: [Socrates is mortal]                   # OrderedSetEntity ID: "os-123"

- premises: [Socrates is mortal]  # OrderedSetEntity ID: "os-123" (SAME as above)
  conclusions: []                 # OrderedSetEntity ID: "os-789" (new, empty)

# User adds conclusion:
- premises: [All men are mortal, Socrates is a man]  # OrderedSetEntity ID: "os-456"
  conclusions: [Socrates is mortal]                   # OrderedSetEntity ID: "os-123"

- premises: [Socrates is mortal]                      # OrderedSetEntity ID: "os-123"
  conclusions: [Socrates will die eventually]        # OrderedSetEntity ID: "os-789"
```

**Connection explanation**: Both atomic arguments reference OrderedSetEntity "os-123" (containing [Socrates is mortal]). This shared reference creates the connection. The statement "Socrates is mortal" could appear in other ordered sets without creating connections.

## Multiple Branches

The same OrderedSetEntity can be referenced by multiple atomic arguments:

```yaml
# One conclusion, multiple branches:
- premises: [A]                    # OrderedSetEntity ID: "os-100"
  conclusions: [B]                 # OrderedSetEntity ID: "os-200"

- premises: [B]                    # OrderedSetEntity ID: "os-200" (SAME as above)
  conclusions: [C]                 # OrderedSetEntity ID: "os-300"

- premises: [B]                    # OrderedSetEntity ID: "os-200" (SAME as above)
  conclusions: [D]                 # OrderedSetEntity ID: "os-400"
```

**Multiple references**: OrderedSetEntity "os-200" is referenced by three atomic arguments - once as a conclusion and twice as premises. All three share the same object, creating the branching structure.

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

The branching mechanism is intentionally simple - it just creates atomic arguments that share OrderedSetEntity references by ID. The visual representation and validation are handled by other parts of the system.

**Key implementation details**:
- Branching creates new AtomicArgumentEntity with shared OrderedSetEntity reference IDs
- No copying of content - references point to the same objects
- Statement reuse is independent - same statement strings can appear in unconnected ordered sets
- Connection = shared reference, not shared content
- Changes to shared OrderedSetEntity affect all referencing atomic arguments