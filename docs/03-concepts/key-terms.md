# Key Terms and Concepts

This is the canonical source for all conceptual definitions in Proof Editor. Other documents reference these definitions rather than redefining them.

## Core Concepts [CORE]

### Statement [CORE]
**The fundamental building block of all proof construction.** Statements are strings of text that flow between atomic arguments to create logical connections. Every other concept in Proof Editor is built from statements.

Examples:
- "All men are mortal"
- "Socrates is a man" 
- "P → Q"

Key properties:
- **Building block primacy**: Statements are the most fundamental units - atomic arguments, connections, and trees are all built from statements
- **Flow mechanism**: Statements move from conclusions of one atomic argument to premises of another, creating connections
- **Content-based identity**: Two statements with identical text are the same statement
- **Reusable**: The same statement can appear in multiple ordered sets across different atomic arguments
- **Connection creator**: When the same statement appears in different atomic arguments' ordered sets, it can create connections
- **Physical reality**: Statements have concrete presence in the system - they flow through tree structures like data through a program

Think of statements as the raw material from which all proofs are constructed. Just as programs are built from data that flows between functions, proofs are built from statements that flow between atomic arguments.

### Ordered Set [CORE]
A container that holds statements in a specific order without duplicates. Ordered sets serve as the **connection mechanism** that allows statements to flow between atomic arguments:

- **Order matters**: ["P", "Q"] is different from ["Q", "P"]
- **No duplicates**: Each statement appears at most once
- **Statement containers**: Hold the actual statement strings that flow through the system
- **Connection enablers**: When atomic arguments share the SAME ordered set object, statements can flow between them
- **Identity through reference**: Connections exist when ordered sets are literally the same object in memory, not just matching content
- **Flow channels**: Act as pipes through which statements move from conclusions to premises

**Physical Reality**: Ordered sets are like containers that can be shared between atomic arguments. When shared, they allow statements to physically flow from one argument's conclusion container to another argument's premise container. This shared container IS the connection.

**Critical Understanding**: Ordered sets enable statement flow. When you connect two atomic arguments, you're establishing that statements can flow from one argument's conclusion ordered set to another argument's premise ordered set by making them the same physical container.

### Atomic Argument [CORE]
A processing unit that transforms input statements (premises) into output statements (conclusions). Built from statements organized into two ordered sets.

Physical representation:
- **Premise ordered set**: Input container above the implication line - statements needed for the transformation
- **Conclusion ordered set**: Output container below the implication line - statements produced by the transformation  
- **Implication line**: The processing boundary that uniquely identifies this transformation unit
- **Side labels** (optional): Annotation text extending from the implication line

**Physical Reality**: Atomic arguments are like processing units in a system. They take statements from their premise containers, apply a logical transformation, and produce statements in their conclusion containers. When you connect atomic arguments, you're creating a pipeline where statements flow from one unit's output to another unit's input.

**Critical Understanding**: Atomic arguments are built from statements but are NOT the fundamental building blocks themselves. Statements are the building blocks; atomic arguments are the processing units built from those blocks.

### Connections [CORE]

#### Direct Connection [CORE]
Atomic arguments are directly connected when **statements flow between them** - specifically, when the same statements that appear in one argument's conclusion ordered set also appear in another argument's premise ordered set via a shared container.

**Physical Reality**: Direct connections exist when atomic arguments share the SAME ordered set container, allowing statements to flow from one argument's conclusions to another's premises. This is about physical container sharing, not content matching.

**Statement Flow**: When arguments are connected, statements literally flow from the conclusion container of one argument to the premise container of another. The shared container IS the flow channel.

**Critical distinction**: Connections enable statement flow between atomic arguments, but do NOT determine tree structure. Tree structure requires explicit parent-child-position relationships between node instances.

**Connection creation**: When you branch from an atomic argument, you create a flow channel where statements from the parent's conclusion container become available as premises for the child argument. This shared container enables statement flow.

#### Connected [CORE]
Atomic arguments are connected when statements can flow between them through a series of directly connected arguments - a flow path exists.

### Arguments [CORE]

#### Path [CORE]
A directed sequence of atomic arguments where statements flow from conclusions to premises through shared containers.

#### Path-Complete [CORE]
A set where ALL atomic arguments in connecting paths are included. No logical steps missing.

#### Argument [CORE]
A complete flow system where statements can flow between any two atomic arguments through intermediate processing units, with no gaps in the flow path.

This ensures path-completeness - you cannot skip processing steps. If atomic arguments A and D are in the argument, and statements flow from A to D only through processing units B and C, then B and C must also be in the argument to maintain the complete flow path.

#### Argument Tree [CORE]
A complete flow network where statements can flow between any atomic arguments through direct or indirect paths. Contains all atomic arguments that can exchange statements with each other.

**Physical Reality**: Argument trees are like complete plumbing systems where statements flow through interconnected processing units. Every unit in the tree can potentially receive statements from or send statements to every other unit through the flow network.

**Critical uniqueness property**: Argument trees are distinct flow networks if they share no processing units, otherwise they merge into one network - if they share any units they share every unit.

**Important**: The tree structure is determined by explicit parent-child-position relationships between nodes, NOT by the logical flow connections between atomic arguments. The same processing unit can appear as multiple nodes in different positions within the same tree.

### Tree Structure Concepts [CORE]

#### Node [CORE]
A positioned instance of an atomic argument processing unit within a physical tree structure. The same processing unit can appear multiple times as different nodes in different locations.

**Physical Reality**: Nodes are like individual processors in a circuit board - each has a specific location and role, even if multiple nodes use the same processing template.

Key properties:
- **Unique position ID**: Each node has its own spatial identifier
- **Processing template**: Points to which atomic argument processing unit to instantiate
- **Parent attachment**: Specifies which node it feeds statements to and at which premise position
- **Multiple instances allowed**: The same processing unit can be instantiated multiple times in different tree positions

#### Tree Position [CORE]
The physical location of a statement flow network within a document workspace, specified by x,y coordinates. Trees exist as physical systems in space.

#### Attachment [CORE]
The specification of how a child node feeds statements to its parent in the physical tree structure:
- **Parent node**: Which processing unit receives the statements
- **Premise position**: Which input slot on the parent the statements flow into (0-indexed)
- **From position** (optional): For processing units with multiple outputs, which output provides the statements

**Critical insight - Bottom-up statement flow**: Children provide statements upward to their parents' input slots. This is the physical reality of proof trees - parent processing units have input requirements (premises) and child processing units fulfill those requirements by feeding statements upward through the tree structure.

### System Components

#### Document [CORE]
A physical workspace where statement processing units are created and organized into flow networks, with each network positioned on the canvas.

**Physical Reality**: Documents are like circuit board layouts containing multiple independent statement processing networks. Each network is a complete flow system where statements can move between any processing units.

Documents can contain multiple independent argument trees, where each tree is a complete statement flow network and trees within a document share no processing units. They provide workspace organization for multiple independent proof systems in one container.

#### Language Layer [LSP]
Customizable component that interprets strings, provides validation, and defines display formatting.

Language layers are implemented as Language Server Protocol (LSP) servers that provide intelligent analysis for specific logical systems. They parse statement strings, validate logical inferences according to domain rules, and provide real-time diagnostics through standard LSP methods like `textDocument/diagnostic` and custom methods like `proof/validateArgument`.

## Important Distinctions

### Statement vs Atomic Argument [CORE]
- **Statements** are the fundamental building blocks (the raw material)
- **Atomic arguments** are processing units built from statements (the processors)

### Atomic Argument vs Argument [CORE]
- An **atomic argument** is ONE statement processing step (single transformation unit)
- An **argument** is MULTIPLE processing units connected in a complete flow system

### Argument vs Argument Tree [CORE]
- An **argument** is any valid, complete flow subsystem (like a sub-circuit)
- An **argument tree** includes every connected processing unit (the complete circuit)

### Created vs Discovered [CORE]
- Statements are **created** by users as building blocks
- Atomic arguments are **created** by users as processing templates
- Node instances are **created** when placing processing units in trees
- Flow connections are **created** when users share statement containers
- Tree structure is **created** through explicit parent-child attachments
- Arguments and flow paths are **discovered** from the connections

### Physical vs Visual [CORE/PLATFORM]
- The physical structure exists in the statement flow relationships between processing units [CORE]
- The visual representation shows this physical structure spatially [PLATFORM]

## Design Philosophy

These concepts emerge from how people naturally work with logical reasoning:
- Building proofs step by step (atomic arguments) [CORE]
- Connecting ideas that follow from each other (connections) [CORE]
- Working with sub-proofs and complete proofs (arguments and trees) [CORE]
- Organizing work visually (documents) [CORE/PLATFORM]
- Using familiar notation (language layers) [LSP]