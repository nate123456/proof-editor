# Argument Trees

See [Key Terms](./key-terms.md#argument-tree) for definitions of argument and argument tree.

## Key Distinction: Argument vs Argument Tree

Consider this structure:
```
    A
   / \
  B   C
  |   |
  D   E
   \ /
    F
```

- **Atomic Arguments**: A→B, A→C, B→D, C→E, D→F, E→F (6 total)
- **Valid Arguments**: Any path-complete subset (e.g., {A→B, B→D})
- **Argument Tree**: The entire maximal component (all 6 atomic arguments)

## Properties

### Discovery, Not Creation
You create atomic arguments and connections. Trees emerge from the connection structure.

### Uniqueness
If two trees share any atomic argument, they are the same tree (by definition of maximal).

### Structure Types

**Linear**: A → B → C → D

**Branching**: 
```
    A
   / \
  B   C
```

**Convergent**:
```
  A   B
   \ /
    C
```

## Navigation and Analysis

- View complete tree structure
- Extract valid sub-arguments
- Count atomic arguments and paths
- Find longest reasoning chains

Trees represent complete, self-contained proofs that can be saved, shared, and reused.