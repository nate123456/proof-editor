# Proof Component Examples [CORE]

For all formal definitions, see [Key Terms](./key-terms.md).

## Atomic Argument Examples

### Common Patterns

**Modus Ponens**
```
Premises: [P → Q, P]
Conclusion: [Q]
```

**Axiom (empty premises)**
```
Premises: []
Conclusion: [A ∨ ¬A]
```

**Multiple Conclusions**
```
Premises: [P ∧ Q]
Conclusions: [P, Q]
```

## Connection Example

### Connection Model

```
Atomic Argument A:
  Premises: [P₁, P₂]
  Conclusions: [C₁, C₂] ← Let's call this object 'setX'

Atomic Argument B:
  Premises: [C₁, C₂] ← This IS setX - the SAME object
  Conclusions: [C₃]

Connection: A.conclusions === B.premises (reference equality)
```

## Tree Structure vs Connections

### Critical Insight: Position-Based Trees

**Arguments are templates** that can be instantiated multiple times:

```yaml
# Define reusable argument templates
arguments:
  - &arg1 [A, B]: [C]  # Needs A,B produces C
  - &arg2 [B, C]: [A]  # Needs B,C produces A
  - &arg3 [C, A]: [B]  # Needs C,A produces B

# Tree with explicit parent-child positions
trees:
  - offset: {x: 100, y: 200}
    nodes:
      n1: {arg: *arg1}           # Root node using arg1
      n2: {n1: *arg2, on: 0}     # Child providing A to n1's first premise
      n3: {n1: *arg3, on: 1}     # Child providing B to n1's second premise
      n4: {n3: *arg2, on: 1}     # SAME arg2 template, different node!
```

**Key Understanding**: 
- n2 and n4 are different nodes but use the SAME argument template (arg2)
- Tree structure is about WHERE nodes attach, not WHAT connections exist
- Children provide inputs to their parents' premise positions

## Complete Hierarchy Example

### Comprehensive Example

Given atomic arguments connected through shared ordered sets:
P→Q, P→R, Q→S, R→T, S→U, T→U, U→V

**Analysis:**

**Atomic Arguments**: 7 individual inference steps (templates)

**Valid Arguments** (path-complete logical connections):
- {P→Q, Q→S, S→U}
- {S→U, T→U, U→V}
- {P→R, R→T, T→U, U→V}

**Invalid Arguments** (not path-complete):
- {P→Q, S→U} - Missing intermediate Q→S
- {P→Q, T→U} - No connecting path exists

**The Argument Tree**: All 7 atomic arguments form one maximal component logically, but the tree STRUCTURE depends on how nodes are positioned