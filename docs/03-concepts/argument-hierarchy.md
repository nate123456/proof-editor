# The Argument Hierarchy [CORE]

See [Key Terms](./key-terms.md) for definitions. This document clarifies the three-level distinction.

## The Three Levels

1. **Atomic Argument**: Single inference step (one relation)
2. **Argument**: Path-complete connected set of atomic arguments
3. **Argument Tree**: Maximal connected component (all connected atomic arguments)

## Example

Given atomic arguments connected through shared ordered sets:
P→Q, P→R, Q→S, R→T, S→U, T→U, U→V

### Analysis

**Atomic Arguments**: 7 individual inference steps

**Valid Arguments** (path-complete):
- {P→Q, Q→S, S→U}
- {S→U, T→U, U→V}
- {P→R, R→T, T→U, U→V}

**Invalid Arguments** (not path-complete):
- {P→Q, S→U} - Missing intermediate Q→S
- {P→Q, T→U} - No connecting path exists

**The Argument Tree**: All 7 atomic arguments form one maximal component

## Key Properties

### Path-Completeness
An argument must include ALL atomic arguments in the connecting paths between its members. No logical steps can be omitted.

### Tree Uniqueness
Argument trees partition the space of atomic arguments. Each atomic argument belongs to exactly one tree.

### Hierarchical Relationship
- Every atomic argument is itself a trivial argument
- Every argument is a subset of some argument tree
- Every argument tree is the union of all its valid arguments