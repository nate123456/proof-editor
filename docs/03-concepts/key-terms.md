# Key Terms and Concepts

This is the canonical source for all conceptual definitions in Proof Editor. Other documents reference these definitions rather than redefining them.

## Core Concepts

### Atomic Argument
A relation between two ordered n-tuples of strings. Either n-tuple may be empty.

Visual representation:
- **Premises**: The ordered n-tuple of strings above the implication line
- **Conclusions**: The ordered n-tuple of strings below the implication line  
- **Implication line**: The horizontal line that uniquely identifies the atomic argument along with its premises and conclusions
- **Side labels** (optional): Strings of text extending directly left or right from the implication line

Note: There is only one implication line per atomic argument. The line extends as far as needed to accommodate the text.

### Connections

#### Direct Connection
Atomic arguments are directly connected when a conclusion of one argument functions as a premise in the other.

#### Connected
Atomic arguments are connected when there is a path of directly connected arguments between them.

### Arguments

#### Path
A directed sequence of atomic arguments where conclusions flow into premises.

#### Path-Complete
A set where ALL atomic arguments in connecting paths are included. No logical steps missing.

#### Argument
A set of atomic arguments where every pair of atomic arguments in the set is connected and all atomic arguments in the path that connects that pair are also in the set.

This ensures path-completeness - you cannot skip logical steps. If atomic arguments A and D are in the argument, and they're connected only through B and C, then B and C must also be in the argument.

#### Argument Tree
An argument which contains all atomic arguments connected to any of its members.

**Critical uniqueness property**: Argument trees are distinct if they do not share any members, otherwise they are identical - if they share any members they share every member.

### System Components

#### Document
A workspace where atomic arguments are created, positioned, and connected.

#### Language Layer
Customizable component that interprets strings, provides validation, and defines display formatting.

## Important Distinctions

### Atomic Argument vs Argument
- An **atomic argument** is ONE inference step (single implication line)
- An **argument** is MULTIPLE atomic arguments connected in a path-complete set

### Argument vs Argument Tree
- An **argument** is any valid, path-complete subset (like a sub-proof)
- An **argument tree** includes everything connected (the complete proof)

### Created vs Discovered
- Atomic arguments and connections are **created** by users
- Arguments and argument trees are **discovered** from the connections

### Logical vs Visual
- The logical structure exists in the relationships between atomic arguments
- The visual representation shows this structure spatially

## Design Philosophy

These concepts emerge from how people naturally work with logical reasoning:
- Building proofs step by step (atomic arguments)
- Connecting ideas that follow from each other (connections)
- Working with sub-proofs and complete proofs (arguments and trees)
- Organizing work visually (documents)
- Using familiar notation (language layers)