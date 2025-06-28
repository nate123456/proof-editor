# The Argument Hierarchy

See [Key Terms](./key-terms.md) for definitions. This document illustrates the critical three-level distinction.

## The Three Levels

1. **Atomic Argument**: Single inference step
2. **Argument**: Path-complete connected set 
3. **Argument Tree**: Maximal connected component

## Example Structure

```
    P
   / \
  Q   R
  |   |
  S   T
   \ /
    U
    |
    V
```

### Breaking It Down

**Atomic Arguments** (7 total): P→Q, P→R, Q→S, R→T, S→U, T→U, U→V

**Valid Arguments** (path-complete subsets):
- {P→Q, Q→S, S→U} - Linear path
- {S→U, T→U, U→V} - Convergent paths
- {P→R, R→T, T→U, U→V} - Complete branch

**Invalid Arguments** (not path-complete):
- {P→Q, S→U} - Missing Q→S
- {P→Q, T→U} - No connecting path

**The Argument Tree**: All 7 atomic arguments together

## Why This Matters

- **Extraction**: Pull out valid sub-arguments for reuse
- **Validation**: Check arguments independently or entire trees
- **Discovery**: Trees emerge from connections, not created directly

## Key Insight

Only path-complete sets qualify as arguments. Trees are unique - if they share any member, they're identical.