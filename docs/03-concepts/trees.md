# Argument Trees

## Definition

An argument is a set of atomic arguments where every pair of atomic arguments in the set is connected and all atomic arguments in the path that connects that pair are also in the set. An argument tree is an argument which contains all atomic arguments connected to any of its members. It represents a complete, self-contained proof or reasoning structure.

**Implementation Note**: Trees are *discovered* through analysis of connections rather than explicitly created. They may be computed on-demand and cached for performance. See [Technical Design](../08-technical-design/conceptual-data-model.md) for how trees are identified and tracked.

## Key Distinction: Argument vs Argument Tree

Consider this example structure:
```
    A
   / \
  B   C
  |   |
  D   E
   \ /
    F
    |
    G
```

- **Atomic Arguments**: A→B, A→C, B→D, C→E, D→F, E→F, F→G (7 total)
- **Valid Arguments** (examples):
  - {A→B, B→D} (path from A to D)
  - {A→B, B→D, D→F} (path from A to F via B)
  - {D→F, E→F, F→G} (convergent paths to G)
- **Invalid Argument**: {A, F} (missing intermediate steps)
- **Argument Tree**: The entire structure {A→B, A→C, B→D, C→E, D→F, E→F, F→G}

An argument maintains path-completeness but can be a subset. An argument tree is the maximal set containing ALL connected atomic arguments.

## Characteristics

### Completeness
A tree contains all atomic arguments connected to any of its members. If two atomic arguments share any connection path, they belong to the same tree.

### Uniqueness
Argument trees are distinct if they do not share any members. Otherwise, based on the definitions above, they are identical—since if they share any members they share every member.

### Self-Contained
Each tree represents a complete logical structure that can be understood independently.

## Example Structure

*Note: This ASCII diagram shows one possible way to visualize an argument tree. The actual presentation depends on your chosen visualization system.*

```
        [Axiom A]
            |
        [Step 1]
        /      \
    [Step 2]  [Step 3]
       |         |
    [Step 4]  [Step 5]
        \      /
       [Conclusion]
```

This example shows atomic arguments connected through shared statements, forming a complete argument tree.

## Tree Properties

### Initial Atomic Arguments
- Atomic arguments with no premises (axioms)
- Atomic arguments with external premises
- Starting points for reasoning chains

### Terminal Atomic Arguments
- Atomic arguments whose conclusions aren't used elsewhere in the tree
- Often represent the "goal" or final conclusions
- An argument tree may have multiple terminal points

### Internal Structure
- Multiple paths represent parallel reasoning
- Convergent connections represent unified conclusions
- Path length and connection count indicate complexity

## Interaction Patterns

### Navigation
- View entire argument tree
- Show/hide portions of the structure
- Trace connection paths
- Move between related atomic arguments

### Manipulation
- Move entire subtrees
- Extract portions into new trees
- Merge compatible trees
- Reorganize for clarity

## Tree Analysis

### Metrics
- Longest path length
- Maximum parallel paths
- Atomic argument count
- Connection density
- Complexity score

### Validation States
- Complete (all connections satisfied)
- Partial (work in progress)
- Invalid (logical errors)
- Verified (formally checked)

## Special Tree Types

### Linear Argument Structure
Single connection path through the tree
```
A → B → C → D
```
*This notation shows one possible representation of a linear sequence.*

### Divergent-Convergent Structure
Multiple parallel reasoning paths that later converge
```
    A
   / \
  B   C
   \ /
    D
```
*This diagram illustrates the logical structure, not a required visual layout.*

### Multiple Initial Points
Several independent starting atomic arguments
```
A   B   C
 \ | /
   D
   |
   E
```

## Tree Operations

### Composition
- Combine trees sharing common statements
- Link trees through new connections
- Build complex proofs from simple ones

### Decomposition
- Extract subtrees for reuse
- Identify independent components
- Create lemmas from portions

### Transformation
- Reorder for clarity
- Optimize path lengths
- Balance visual layout
- Apply tree algorithms

## Semantic Meaning

### Proof Representation
Each tree tells a complete logical story from assumptions to conclusions.

### Modular Reasoning
Trees can be:
- Saved as reusable components
- Shared as proven theorems
- Combined into larger proofs
- Referenced by other trees

### Visual Understanding
The tree structure makes logical dependencies immediately visible, revealing:
- Critical paths
- Redundant reasoning
- Missing connections
- Proof strategies