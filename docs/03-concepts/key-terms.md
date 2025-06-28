# Key Terms and Concepts

This is the canonical source for all conceptual definitions in Proof Editor. Other documents reference these definitions rather than redefining them.

## Core Concepts

### Atomic Argument
A single step of logical inference - the fundamental building block. Contains:
- **Premises**: Ordered strings above the line (what we start with)
- **Conclusions**: Ordered strings below the line (what follows)
- **Implication line**: Visual separator between premises and conclusions

### Connections

#### Direct Connection
When a conclusion from one atomic argument IS a premise in another through user action. Created by selecting a conclusion and branching off from it.

#### Connected
When there's a path of direct connections between atomic arguments (transitive relationship).

### Arguments

#### Path
A directed sequence of atomic arguments where conclusions flow into premises.

#### Path-Complete
A set where ALL atomic arguments in connecting paths are included. No logical steps missing.

#### Argument
A path-complete set of connected atomic arguments. Can be a subset of a larger proof.

#### Argument Tree
The maximal connected component - contains ALL atomic arguments connected to any members. If two trees share any atomic argument, they are the same tree.

### System Components

#### Document
A workspace where atomic arguments are created, positioned, and connected.

#### Language Layer
Customizable component that interprets strings, provides validation, and defines display formatting.

## Important Distinctions

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