# Key Terms and Concepts

This is the canonical source for all conceptual definitions in Proof Editor. Other documents reference these definitions rather than redefining them.

## Core Concepts [CORE]

### Ordered Set [CORE]
A collection of statements that maintains both order and uniqueness. Ordered sets are the fundamental connection mechanism in Proof Editor:
- **Order matters**: ["P", "Q"] is different from ["Q", "P"]
- **No duplicates**: Each statement appears at most once
- **Shared references**: Connections exist when atomic arguments share the SAME ordered set object
- **Identity through reference**: Not copies or equality checks - the actual same object
- **Mutable**: Changes to a shared ordered set affect all atomic arguments referencing it

### Atomic Argument [CORE]
A relation between two ordered sets. Either ordered set may be empty.

Visual representation:
- **Premise ordered set**: The ordered set displayed above the implication line
- **Conclusion ordered set**: The ordered set displayed below the implication line  
- **Implication line**: The horizontal line that uniquely identifies the atomic argument
- **Side labels** (optional): Strings of text extending directly left or right from the implication line

Note: There is only one implication line per atomic argument. The line extends as far as needed to accommodate the text. Atomic arguments reference ordered set objects directly - when connected, they share the SAME ordered set object, not copies.

### Connections [CORE]

#### Direct Connection [CORE]
Atomic arguments are directly connected when they share the SAME ordered set object - specifically, when the conclusion ordered set of one argument IS (same reference) the premise ordered set of another. This is not about matching values or equality - it's about object identity.

#### Connected [CORE]
Atomic arguments are connected when there is a path of directly connected arguments between them.

### Arguments [CORE]

#### Path [CORE]
A directed sequence of atomic arguments where conclusion ordered sets become premise ordered sets.

#### Path-Complete [CORE]
A set where ALL atomic arguments in connecting paths are included. No logical steps missing.

#### Argument [CORE]
A set of atomic arguments where every pair of atomic arguments in the set is connected and all atomic arguments in the path that connects that pair are also in the set.

This ensures path-completeness - you cannot skip logical steps. If atomic arguments A and D are in the argument, and they're connected only through B and C (via shared ordered sets), then B and C must also be in the argument.

#### Argument Tree [CORE]
An argument which contains all atomic arguments connected to any of its members.

**Critical uniqueness property**: Argument trees are distinct if they do not share any members, otherwise they are identical - if they share any members they share every member.

### System Components

#### Document [CORE]
A workspace where atomic arguments are created and connected into trees, with each tree positioned on the canvas.

#### Language Layer [LSP]
Customizable component that interprets strings, provides validation, and defines display formatting.

## Important Distinctions

### Atomic Argument vs Argument [CORE]
- An **atomic argument** is ONE inference step (single implication line)
- An **argument** is MULTIPLE atomic arguments connected in a path-complete set

### Argument vs Argument Tree [CORE]
- An **argument** is any valid, path-complete subset (like a sub-proof)
- An **argument tree** includes everything connected (the complete proof)

### Created vs Discovered [CORE]
- Atomic arguments are **created** by users
- Connections are **created** when users share ordered set references
- Arguments and argument trees are **discovered** from the connections

### Logical vs Visual [CORE/PLATFORM]
- The logical structure exists in the relationships between atomic arguments [CORE]
- The visual representation shows this structure spatially [PLATFORM]

## Design Philosophy

These concepts emerge from how people naturally work with logical reasoning:
- Building proofs step by step (atomic arguments) [CORE]
- Connecting ideas that follow from each other (connections) [CORE]
- Working with sub-proofs and complete proofs (arguments and trees) [CORE]
- Organizing work visually (documents) [CORE/PLATFORM]
- Using familiar notation (language layers) [LSP]