# Argument Trees [CORE]

See [Key Terms](./key-terms.md#argument-tree) for definitions of argument and argument tree.

## Key Distinction: Argument vs Argument Tree

Consider atomic arguments connected through shared ordered sets:
- **Atomic Arguments**: Individual inference steps (A→B, B→C, etc.)
- **Arguments**: Any path-complete subset of connected atomic arguments
- **Argument Tree**: The maximal connected component containing ALL connected atomic arguments

## Example Structure

Given connections: A→B, A→C, B→D, C→E, D→F, E→F

- **Atomic Arguments**: 6 individual steps
- **Valid Arguments**: {A→B, B→D}, {D→F, E→F}, etc. (path-complete)
- **Invalid Arguments**: {A→B, D→F} (missing B→D)
- **The Argument Tree**: All 6 atomic arguments together

## Properties

### Maximality
An argument tree contains ALL atomic arguments connected to any of its members. No atomic argument connected to the tree exists outside it.

### Uniqueness
If two trees share any atomic argument, they are identical. Trees are either completely separate or exactly the same.

### Emergence
Trees are discovered from connections, not created directly. You create atomic arguments and connections; trees emerge from the structure.

## Common Patterns

- **Linear**: Sequential reasoning (A→B→C→D)
- **Branching**: Multiple consequences from one premise
- **Convergent**: Multiple paths to the same conclusion
- **Mixed**: Combinations of the above patterns

Trees represent complete, self-contained logical structures.