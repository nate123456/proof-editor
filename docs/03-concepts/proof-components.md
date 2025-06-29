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

## Complete Hierarchy Example

### Comprehensive Example

Given atomic arguments connected through shared ordered sets:
P→Q, P→R, Q→S, R→T, S→U, T→U, U→V

**Analysis:**

**Atomic Arguments**: 7 individual inference steps

**Valid Arguments** (path-complete):
- {P→Q, Q→S, S→U}
- {S→U, T→U, U→V}
- {P→R, R→T, T→U, U→V}

**Invalid Arguments** (not path-complete):
- {P→Q, S→U} - Missing intermediate Q→S
- {P→Q, T→U} - No connecting path exists

**The Argument Tree**: All 7 atomic arguments form one maximal component