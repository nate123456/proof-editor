# The Argument Hierarchy

## Overview

Understanding the three-level hierarchy of atomic arguments, arguments, and argument trees is fundamental to the Proof Editor design. This document clarifies these distinctions with precise definitions and examples.

## Definitions

### 1. Direct Connection
Two atomic arguments are **directly connected** when a conclusion of one atomic argument functions as a premise in the other.

### 2. Connected
Two atomic arguments are **connected** when there is a path of directly connected atomic arguments between them.

### 3. Atomic Argument
A single inference step - the fundamental building block. Contains premises, conclusions, and the logical relation between them.

### 4. Argument
A set of atomic arguments where:
- Every pair of atomic arguments in the set is connected
- ALL atomic arguments in the paths connecting those pairs are included in the set

Key insight: An argument must be **path-complete** - no missing intermediate steps.

### 5. Argument Tree
An argument which contains ALL atomic arguments connected to any of its members. This is the **maximal** connected component.

Key insight: Argument trees are unique - if two trees share any member, they are identical.

## Visual Example

Consider this proof structure:

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

### Atomic Arguments (7 total):
1. P → Q
2. P → R  
3. Q → S
4. R → T
5. S → U
6. T → U
7. U → V

### Valid Arguments (examples):

**Linear path**: {P→Q, Q→S, S→U}
- Path-complete from P to U via Q

**Convergent path**: {S→U, T→U, U→V}
- Includes both paths converging at U, then continuing to V

**Complete branch**: {P→R, R→T, T→U, U→V}
- One complete branch from P to V

### Invalid Arguments:

**Missing intermediate**: {P→Q, S→U}
- Invalid: Missing Q→S

**Disconnected**: {P→Q, T→U}
- Invalid: No path connects these

### The Argument Tree:
The complete structure containing all 7 atomic arguments. This is the only valid argument tree for this connected component.

## Why This Distinction Matters

### 1. Extraction and Reuse
Users can extract valid arguments (sub-proofs) from larger trees for reuse, as long as they maintain path-completeness.

### 2. Validation
- Arguments can be validated independently
- Tree validation ensures global consistency

### 3. Computational Efficiency
- Arguments can be processed as smaller units
- Trees represent complete computational boundaries

### 4. User Interface
- Users work with arguments during construction
- System identifies and manages complete trees

## Common Misconceptions

### ❌ "Arguments are just small trees"
Arguments are path-complete subsets. Trees are maximal - they include everything connected.

### ❌ "You create trees by connecting arguments"
Trees emerge from connections. You discover them, not create them.

### ❌ "Any subset of atomic arguments is an argument"
Only path-complete subsets qualify as arguments.

## Implementation Implications

1. **Storage**: Atomic arguments and connections are stored; arguments and trees are computed
2. **Validation**: Performed at the argument level, with tree-level consistency checks
3. **Operations**: 
   - Extract argument from tree
   - Merge arguments (if they connect)
   - Identify tree boundaries

## Summary

- **Atomic Argument**: Single logical step
- **Argument**: Path-complete connected set
- **Argument Tree**: Maximal connected component

This hierarchy enables both fine-grained manipulation (arguments) and system-level management (trees) while maintaining logical integrity at all levels.