# Key Terms and Concepts

This is the canonical source for all conceptual definitions in Proof Editor. Other documents reference these definitions rather than redefining them.

## Core Concepts [CORE]

### Statement [CORE]
A string of text that can be reused across multiple ordered sets. Statements are fundamentally just strings, but they function as reusable logical units - like variables in programming that can appear in different contexts.

Examples:
- "All men are mortal"
- "Socrates is a man" 
- "P → Q"

Key properties:
- **Content-based identity**: Two statements with the same text are considered the same statement
- **Reusable**: The same statement string can appear in multiple ordered sets
- **No inherent ID**: Statements are identified by their string content, not by separate IDs
- **Immutable text**: Once created, a statement's text doesn't change
- **Location independent**: A statement can appear in premise ordered sets, conclusion ordered sets, or both

Think of statements like string constants that can be referenced from multiple places in your proof. When you type "All men are mortal" in one ordered set, you can use that same statement in other ordered sets without retyping.

### Ordered Set [CORE]
A collection of statements that maintains both order and uniqueness. Ordered sets are the fundamental connection mechanism in Proof Editor:
- **Order matters**: ["P", "Q"] is different from ["Q", "P"]
- **No duplicates**: Each statement appears at most once
- **Shared references**: Connections exist when atomic arguments share the SAME ordered set object
- **Identity through reference**: Not copies or equality checks - the actual same object in memory
- **Mutable**: Changes to a shared ordered set affect all atomic arguments referencing it
- **Contains statements**: Ordered sets contain statement strings, not statement objects
- **Connection mechanism**: When two atomic arguments reference the same ordered set object, they are connected

Key distinction: Ordered sets are NOT regular arrays. They are special data structures that enforce uniqueness while preserving order, and they create connections through object identity (reference equality), not value equality.

**Critical Understanding - Connection Mechanism**: Ordered sets are the fundamental connection mechanism in Proof Editor. When atomic arguments share the **SAME Ordered Set *object* (by *reference*, not content equality)**, they are connected. Changes to a shared ordered set affect all atomic arguments referencing it.

**Critical understanding**: Ordered sets are the connection points. When you branch from an atomic argument, the conclusion ordered set of the parent becomes the premise ordered set of the child - they share the same object reference.

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
Atomic arguments are directly connected when they share the **SAME ordered set *object*** – specifically, when the conclusion ordered set of one argument **IS (same object reference)** the premise ordered set of another. This is about *object identity*, not value equality.

**Critical distinction**: Connections define logical relationships between atomic arguments, but do NOT determine tree structure. Tree structure requires explicit parent-child-position relationships between node instances.

**Critical distinction**: Two ordered sets with identical contents (e.g., both containing ["P", "Q"]) are NOT connected unless they are literally the same object in memory during runtime. The file format uses string matching and YAML anchors *solely as deserialization mechanisms to reconstruct these shared object references at runtime; they do not define the underlying logical connection model*.

**Connection creation**: When you branch from an atomic argument, the system creates a new atomic argument whose premise ordered set reference points to the same object as the parent's conclusion ordered set reference. This shared reference IS the connection.

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

**Important**: The tree structure is determined by explicit parent-child-position relationships between nodes, NOT by the logical connections between atomic arguments. The same atomic argument can appear as multiple nodes in different positions within the same tree.

### Tree Structure Concepts [CORE]

#### Node [CORE]
A specific instance of an atomic argument within a tree structure. The same atomic argument can appear multiple times as different nodes.

Key properties:
- **Unique instance ID**: Each node has its own identifier
- **Argument reference**: Points to which atomic argument template to use
- **Parent attachment**: Specifies which node it connects to and at which premise position
- **Multiple instances allowed**: The same argument can be instantiated multiple times in a tree

#### Tree Position [CORE]
The spatial location of an argument tree within a document workspace, specified by x,y coordinates.

#### Attachment [CORE]
The specification of how a child node connects to its parent:
- **Parent node**: Which node instance it attaches to
- **Premise position**: Which premise slot it fills (0-indexed)
- **From position** (optional): For arguments with multiple conclusions, which conclusion to use

**Critical insight - Bottom-up data flow**: Children provide their conclusions as inputs to their parents' premise slots. This is backwards from typical tree thinking where data flows top-down. In proof trees, parents have requirements (premises) and children fulfill those requirements (with their conclusions).

### System Components

#### Document [CORE]
A workspace where atomic arguments are created and connected into trees, with each tree positioned on the canvas.

Documents can contain multiple independent argument trees, where each tree is a maximal connected component and trees within a document share no atomic arguments. They provide workspace organization for multiple independent proofs in one container and logical separation with clear boundaries between unrelated arguments.

#### Language Layer [LSP]
Customizable component that interprets strings, provides validation, and defines display formatting.

Language layers are implemented as Language Server Protocol (LSP) servers that provide intelligent analysis for specific logical systems. They parse statement strings, validate logical inferences according to domain rules, and provide real-time diagnostics through standard LSP methods like `textDocument/diagnostic` and custom methods like `proof/validateArgument`.

## Important Distinctions

### Atomic Argument vs Argument [CORE]
- An **atomic argument** is ONE inference step (single implication line)
- An **argument** is MULTIPLE atomic arguments connected in a path-complete set

### Argument vs Argument Tree [CORE]
- An **argument** is any valid, path-complete subset (like a sub-proof)
- An **argument tree** includes everything connected (the complete proof)

### Created vs Discovered [CORE]
- Atomic arguments are **created** by users as templates
- Node instances are **created** when placing arguments in trees
- Connections are **created** when users share ordered set references
- Tree structure is **created** through explicit parent-child attachments
- Arguments and logical paths are **discovered** from the connections

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