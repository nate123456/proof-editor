# Proof Component Examples [CORE]

For all formal definitions, see [Key Terms](./key-terms.md).

## Statement Flow Examples

### Building Blocks in Action

Proofs are built from **statements** that flow between **processing units** (atomic arguments):

**Modus Ponens Processing Unit**
```
Input statements:  ["P → Q", "P"]
                      ↓
              [Processing Unit]
                      ↓  
Output statement:  ["Q"]
```

**Axiom Generator (no inputs needed)**
```
Input statements:  []
                      ↓
              [Processing Unit]
                      ↓  
Output statement:  ["A ∨ ¬A"]
```

**Statement Splitter (multiple outputs)**
```
Input statement:   ["P ∧ Q"]
                      ↓
              [Processing Unit]
                      ↓  
Output statements: ["P", "Q"]
```

## Statement Flow Connection Example

### Physical Flow Model

```
Processing Unit A:
  Input array:   ["P₁", "P₂"]  (premises[0], premises[1])
  Output array:  ["C₁", "C₂"]  (conclusions[0], conclusions[1])
                         ↓ FLOW
Processing Unit B:        ↓ 
  Input array:   ["C₁", "C₂"]  (premises[0], premises[1])
  Output array:  ["C₃"]       (conclusions[0])

Physical Reality: Statement "C₁" flows from A.conclusions[0] 
to B.premises[0] via Statement identity. Statement "C₂" flows 
from A.conclusions[1] to B.premises[1] via Statement identity.
```

## Statement Flow Trees vs Logical Connections

### Critical Insight: Physical Processing Networks

**Processing units are templates** that can be instantiated multiple times in different physical locations:

```yaml
# Define reusable processing unit templates
processing_units:
  - &unit1 ["A", "B"]: ["C"]  # Needs A,B statements → produces C statement
  - &unit2 ["B", "C"]: ["A"]  # Needs B,C statements → produces A statement  
  - &unit3 ["C", "A"]: ["B"]  # Needs C,A statements → produces B statement

# Physical tree with explicit parent-child statement flow
trees:
  - offset: {x: 100, y: 200}
    nodes:
      n1: {unit: *unit1}           # Root processor using unit1
      n2: {n1: *unit2, on: 0}      # Child providing Statement "A" to n1's premises[0]
      n3: {n1: *unit3, on: 1}      # Child providing Statement "B" to n1's premises[1]
      n4: {n3: *unit2, on: 1}      # SAME unit2 template, different physical location!
```

**Physical Understanding**: 
- n2 and n4 are different physical processors but use the SAME processing template (unit2)
- Tree structure is about WHERE processors are placed and HOW statements flow between them
- Children feed their output statements upward to their parents' premise array positions
- Statements physically flow bottom-up through positional connections

## Complete Statement Flow Network Example

### Comprehensive Physical System

Given processing units connected through statement flow:
"P"→"Q", "P"→"R", "Q"→"S", "R"→"T", "S"→"U", "T"→"U", "U"→"V"

**Physical Analysis:**

**Processing Units**: 7 individual statement transformation units (templates)

**Valid Flow Systems** (complete statement flow paths):
- {"P"→"Q" → "Q"→"S" → "S"→"U"} - Complete flow from P to U via Q,S
- {"S"→"U" → "T"→"U" → "U"→"V"} - Complete flow with converging inputs
- {"P"→"R" → "R"→"T" → "T"→"U" → "U"→"V"} - Complete flow from P to V via R,T

**Invalid Flow Systems** (broken statement flow):
- {"P"→"Q", "S"→"U"} - Missing Q→S flow connector
- {"P"→"Q", "T"→"U"} - No physical flow path exists

**The Complete Flow Network**: All 7 processing units form one maximal statement flow network logically, but the physical tree STRUCTURE depends on how processing units are positioned and connected through Statement identity at specific positions