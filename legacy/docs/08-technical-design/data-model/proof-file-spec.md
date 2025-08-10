# Proof File Specification

## Overview

Proof Editor uses YAML files (`.proof` extension) to store logical proofs with **clean, minimalist syntax**. The format uses the most readable possible representation while maintaining full Statement-level positional connections.

**Gold Standard Format**: `[premises]: [conclusions]` - maximally clean and readable
**Serializer Adapts**: The format stays clean, the serializer maps to internal structures
**Position Awareness**: Statement references preserve positional relationships
**Statement Identity**: YAML anchors create true Statement-level connections

## The Clean Format (Gold Standard)

The core format is designed for **maximum readability** with **minimum syntax**:

```yaml
statements:
  s1: "All men are mortal"
  s2: "Socrates is a man"
  s3: "Socrates is mortal"

arguments:
  - &arg1 [s1, s2]: [s3]
  - &arg2 [s3, s4]: [s5]

trees:
  tree1:
    offset: {x: 100, y: 100}
    nodes:
      n1: {arg: *arg1}
      n2: {arg: *arg2, parent: n1}
```

**Why This Format is Perfect**:
1. **Concise**: `[s1, s2]: [s3]` clearly shows premises → conclusions
2. **Position-aware**: s1=premises[0], s2=premises[1], s3=conclusions[0]
3. **Statement references**: Enable Statement-level connections
4. **Serializer-friendly**: Maps cleanly to AtomicArgument.premises[]/conclusions[]
5. **Minimal syntax**: Maximum readability with minimum complexity

## Minimal Valid Proof

```yaml
statements:
  A: "A"
  B: "B"
  C: "C"

arguments:
  - &arg1 [A, B]: [C]  # Position 0=A, Position 1=B → Position 0=C
  - &arg2 [C, A]: [B]  # Position 0=C, Position 1=A → Position 0=B

trees:
  tree1:
    offset: {x: 0, y: 0}
    nodes:
      n1: {arg: *arg1}                    # Root node
      n2: {arg: *arg2, parent: n1}        # Child connects via Statement C
```

**Connection Analysis**:
- **Statement Identity**: Both arguments reference Statement C
- **Position Mapping**: arg1.conclusions[0] (C) connects to arg2.premises[0] (C)
- **Serializer Responsibility**: Maps `[A, B]: [C]` to AtomicArgument with premises=[A,B], conclusions=[C]
- **Tree Structure**: Parent-child relationship with automatic position detection

## Statement Identity and Reuse

**Statement Identity**: Same Statement references create connections:
```yaml
statements:
  mortal: "Socrates is mortal"
  die: "All mortals die"
  men_mortal: "All men are mortal"
  soc_man: "Socrates is a man"
  soc_die: "Socrates will die"

arguments:
  - &arg1 [men_mortal, soc_man]: [mortal]  # Produces: mortal at position 0
  - &arg2 [mortal, die]: [soc_die]         # Consumes: mortal at position 0
```

**Connection Mechanism**: The `mortal` reference ensures arg1.conclusions[0] and arg2.premises[0] are the same Statement object, creating the connection.

**Serializer Mapping**:
- `[men_mortal, soc_man]: [mortal]` → AtomicArgument with premises=[Statement(men_mortal), Statement(soc_man)], conclusions=[Statement(mortal)]
- Statement identity preserved through reference resolution

## Tree Structure Determines Connections

**Key Insight**: Statement identity shows what CAN connect. Tree structure shows what DOES connect and WHERE.

```yaml
trees:
  tree1:
    nodes:
      n1: {arg: *arg1}                    # Root
      n2: {arg: *arg2, parent: n1}        # Child connects via shared Statement
```

**Connection Direction**: Tree connections are bidirectional:
- **Input flow**: Parent conclusion → Child premise (what child needs)
- **Output flow**: Child conclusion → Parent premise (what child provides)

**Position Detection**: The serializer automatically detects which Statement positions connect:
1. Find shared Statements between parent conclusions and child premises
2. Map position indices for connection tracking
3. Validate that connections are logically consistent

## Serializer Responsibility

The **clean format is sacred** - the serializer adapts to it, not the reverse.

**Format to Structure Mapping**:
```yaml
# Clean Format
arguments:
  - &arg1 [premise1, premise2]: [conclusion1]

# Serializer Output
AtomicArgument {
  premises: [Statement(premise1), Statement(premise2)],
  conclusions: [Statement(conclusion1)]
}
```

**Tree Node Processing**:
```yaml
# Clean Format
trees:
  tree1:
    nodes:
      n1: {arg: *arg1}
      n2: {arg: *arg2, parent: n1}

# Serializer Processing
1. Resolve argument references (*arg1, *arg2)
2. Detect shared Statements between parent conclusions and child premises
3. Create position mappings automatically
4. Build TreeNode structures with connection data
```

**Connection Detection Algorithm**:
1. **Identify Shared Statements**: Find Statement IDs that appear in both parent.conclusions and child.premises
2. **Position Mapping**: Map array indices - parent.conclusions[i] → child.premises[j]
3. **Validation**: Ensure all connections are logically valid
4. **Attachment Creation**: Generate TreeNode with parent reference and position data

## Advanced Connection Patterns

**Multiple Connections**: When arguments share multiple Statements:
```yaml
statements:
  A: "A"
  B: "B"
  C: "C"
  D: "D"

arguments:
  - &multi_out [A]: [B, C]         # Produces B and C
  - &multi_in [B, C]: [D]          # Consumes B and C

trees:
  tree1:
    nodes:
      n1: {arg: *multi_out}        # Root produces B, C
      n2: {arg: *multi_in, parent: n1}  # Child consumes B, C
```

**Connection Analysis**:
- **Automatic Detection**: Serializer finds B and C are shared
- **Position Mapping**: multi_out.conclusions[0] (B) → multi_in.premises[0] (B)
- **Position Mapping**: multi_out.conclusions[1] (C) → multi_in.premises[1] (C)
- **No Manual Specification**: Clean format handles this automatically

## Complete File Structure

All fields are optional except arguments:

```yaml
# Metadata
version: "1.0"
title: "My Proof"
description: "Optional description"
tags: [logic, example]

# Language specification
language: first-order-logic  # or: first-order-logic@^2.0.0

# Imports (local files or packages)
imports:
  - basic-logic@^1.0.0  # Package from registry
  - logic-tools/modal-logic@^2.0  # GitHub package (owner/repo)
  - ./lemmas/number-theory.proof  # Local file
  - ../shared/definitions.proof  # Relative path

# Global statements
statements:
  premise: "Shared premise"
  conclusion: "Shared conclusion"
  p_implies_q: "P implies Q"
  q: "Q"
  all_x_p: "All X have property P"
  p_premise: "P(premise)"

# Argument templates (clean format)
arguments:
  - &basic_modus_ponens [premise, p_implies_q]: [q]
  - &universal_instantiation [all_x_p, premise]: [p_premise]

# Tree structures
trees:
  main_proof:
    offset: {x: 0, y: 0}
    nodes:
      root: {arg: *basic_modus_ponens}
      child1: {arg: *universal_instantiation, parent: root}
```

**Side Labels**: Add labels to arguments for presentation:
```yaml
arguments:
  - &basic_modus_ponens 
    premises: [premise, p_implies_q]
    conclusions: [q]
    right: "MP"
    left: "(1)"
```

## Tree Structure Patterns

Trees demonstrate different organizational patterns using the clean format.

### Linear Chain Pattern

```yaml
statements:
  base: "Base fact"
  derived1: "First derivation"
  derived2: "Second derivation"
  final: "Final conclusion"
  rule1: "External rule 1"
  rule2: "External rule 2"
  rule3: "External rule 3"

arguments:
  - &step1 [base, rule1]: [derived1]
  - &step2 [derived1, rule2]: [derived2]
  - &step3 [derived2, rule3]: [final]

trees:
  linear_chain:
    offset: {x: 0, y: 0}
    nodes:
      n1: {arg: *step3}                    # Root: produces final
      n2: {arg: *step2, parent: n1}        # Provides derived2
      n3: {arg: *step1, parent: n2}        # Provides derived1
```

**Flow Analysis**:
- **External inputs**: base, rule1, rule2, rule3
- **Statement flow**: base → derived1 → derived2 → final
- **Clean connections**: Each step connects automatically via shared Statements

### Parallel Structure Pattern

```yaml
statements:
  shared: "Shared premise"
  specific1: "Specific premise 1"
  specific2: "Specific premise 2"
  result1: "Result 1"
  result2: "Result 2"
  combined: "Combined result"

arguments:
  - &branch1 [shared, specific1]: [result1]
  - &branch2 [shared, specific2]: [result2]
  - &combine [result1, result2]: [combined]

trees:
  parallel_structure:
    offset: {x: 0, y: 0}
    nodes:
      root: {arg: *combine}                # Needs result1 and result2
      left: {arg: *branch1, parent: root}   # Provides result1
      right: {arg: *branch2, parent: root}  # Provides result2
```

**Flow Analysis**:
- **External inputs**: shared (used by both children), specific1, specific2
- **Parallel flow**: Both children use shared but need different specific premises
- **Convergence**: Both results combine at the root automatically

### Template Reuse Pattern

```yaml
statements:
  all_human_mortal: "All humans are mortal"
  socrates_human: "Socrates is human"
  plato_human: "Plato is human"
  socrates_mortal: "Socrates is mortal"
  plato_mortal: "Plato is mortal"
  both_mortal: "Both are mortal"

arguments:
  - &syllogism_soc [all_human_mortal, socrates_human]: [socrates_mortal]
  - &syllogism_plato [all_human_mortal, plato_human]: [plato_mortal]
  - &conjunction [socrates_mortal, plato_mortal]: [both_mortal]

trees:
  template_reuse:
    offset: {x: 0, y: 0}
    nodes:
      root: {arg: *conjunction}
      soc_proof: {arg: *syllogism_soc, parent: root}
      plato_proof: {arg: *syllogism_plato, parent: root}
```

**Template Reuse Analysis**:
- **Same logical pattern**: Both syllogism arguments use the same inference structure
- **Different instances**: Each operates on different concrete Statements
- **Clean connections**: Arguments connect automatically via shared Statements

## External Input Handling

Trees can require external statements that aren't produced by other nodes:

```yaml
statements:
  P: "P is true"
  Q: "Q is true"
  R: "R follows"
  S: "S is established"
  p_implies_q: "P implies Q"
  all_things_r: "All things have property R"

arguments:
  - &modus_ponens [P, p_implies_q]: [Q]
  - &universal_inst [all_things_r, P]: [R]
  - &composition [Q, R]: [S]

trees:
  external_inputs:
    offset: {x: 0, y: 0}
    nodes:
      root: {arg: *composition}         # Needs Q and R
      left: {arg: *modus_ponens, parent: root}   # Provides Q
      right: {arg: *universal_inst, parent: root} # Provides R
```

**Statement Sources**:
- **Internal**: Q and R produced by child nodes
- **External**: P, p_implies_q, all_things_r must come from outside this tree
- **Reused External**: P is needed by both left and right children

## Multiple Trees per Document

```yaml
statements:
  all_men_mortal: "All men are mortal"
  socrates_man: "Socrates is a man"
  plato_man: "Plato is a man"
  socrates_mortal: "Socrates is mortal"
  plato_mortal: "Plato is mortal"
  socrates_dies: "Socrates will die"
  plato_dies: "Plato will die"

arguments:
  - &soc_syllogism [all_men_mortal, socrates_man]: [socrates_mortal]
  - &plato_syllogism [all_men_mortal, plato_man]: [plato_mortal]
  - &soc_elimination [socrates_mortal]: [socrates_dies]
  - &plato_elimination [plato_mortal]: [plato_dies]

trees:
  # First proof tree
  socrates_proof:
    offset: {x: 0, y: 0}
    nodes:
      s1: {arg: *soc_syllogism}              # Root
      s2: {arg: *soc_elimination, parent: s1}
      
  # Second independent proof tree
  plato_proof:
    offset: {x: 500, y: 0}
    nodes:
      p1: {arg: *plato_syllogism}             # Different root instance
      p2: {arg: *plato_elimination, parent: p1}
```

**Key Points**:
- **Independent trees**: Each tree is a separate logical structure
- **Same patterns**: Similar logical structures can appear in multiple trees
- **Clean separation**: Each tree has its own argument instances and connections

## Side Labels and Metadata

```yaml
statements:
  P: "P"
  P_implies_Q: "P → Q"
  Q: "Q"

arguments:
  - &modus_ponens
    premises: [P, P_implies_Q]
    conclusions: [Q]
    left: "(1)"      # Text before implication line
    right: "MP"      # Text after implication line
    hover: "Modus Ponens: If P implies Q and P is true, then Q must be true"
    confidence: 0.95
```

**Metadata Fields**:
- **left/right**: Display labels for the implication line
- **hover**: Tooltip text for user assistance
- **confidence**: Optional confidence level (0.0-1.0)
- **tags**: Optional categorization tags

## Import System

### Statement Identity Across Files

Imported statements maintain identity through YAML anchors:

```yaml
# File: lemmas.proof
statements:
  shared_conclusion: "Important conclusion"
  A: "A"
  B: "B"

arguments:
  - &lemma1 [A, B]: [shared_conclusion]

# File: main.proof  
imports:
  - ./lemmas.proof

statements:
  D: "D"
  E: "E"

arguments:
  - &theorem [shared_conclusion, D]: [E]  # References same Statement object

trees:
  main_tree:
    nodes:
      root: {arg: *theorem}
      child: {arg: *lemma1, parent: root}
```

**Connection Across Files**: The `shared_conclusion` reference maintains Statement identity across file boundaries, enabling connections between imported and local arguments.

## Bootstrap Arguments

For starting new proofs without premises:

```yaml
arguments:
  - &bootstrap []: []  # Empty premises and conclusions for user input

trees:
  new_proof:
    nodes:
      start: {arg: *bootstrap}
```

**Bootstrap Properties**:
- **Empty arrays**: Allow user to input any premises/conclusions
- **No validation**: Empty arguments require no connection validation
- **User-driven**: Content filled during proof construction

## Validation Rules

### Tree Structure Validation

- **No circular references**: A node cannot be its own ancestor
- **Valid parent references**: All parent node IDs must exist in the tree
- **Statement identity**: Connected arguments must share actual Statement objects

### Statement Position Validation

- **Array bounds**: All Statement references must be valid indices
- **Connection consistency**: Shared Statements must appear in both parent conclusions and child premises
- **Unique connections**: Each connection must be unambiguous

## Migration from Legacy Format

### Old Format (Deprecated)
```yaml
# OLD - Complex verbose syntax
atomic_arguments:
  arg1:
    premises: [*P, *Q]
    conclusions: [*R]
```

### New Format (Current)
```yaml
# NEW - Clean minimalist syntax
statements:
  P: "P"
  Q: "Q"
  R: "R"

arguments:
  - &arg1 [P, Q]: [R]
```

**Migration Benefits**:
- **50% less syntax**: Cleaner, more readable
- **Same functionality**: All features preserved
- **Better serialization**: Easier to parse and generate

## Key Principles

1. **Clean Format First**: `[premises]: [conclusions]` syntax is sacred - serializer adapts to it
2. **Statement Identity**: YAML references create true Statement-level connections
3. **Position Awareness**: Array indices preserve positional relationships automatically
4. **Serializer Responsibility**: Maps clean format to internal AtomicArgument structures
5. **Automatic Connection**: Shared Statements detected and connected automatically
6. **Template Reuse**: Same argument patterns can appear in multiple trees/positions
7. **External Input Support**: Statements can come from outside the tree structure
8. **Import Statement Identity**: Statement identity preserved across file boundaries

## Philosophy

The format prioritizes **readability over verbosity**. The clean format achieves:
- **Maximum readability**: `[P, Q]: [R]` is instantly comprehensible
- **Minimum syntax**: No unnecessary complexity or boilerplate
- **Full functionality**: All Statement-level positional connections supported
- **Serializer adaptation**: Complex internal structures hidden from users

**Core Insight**: The format should be so clean and obvious that users immediately understand the logical structure without needing to parse complex syntax.

## Complete Example: Complex Proof Tree

```yaml
# Complex proof demonstrating all features
statements:
  # Premises
  all_men_mortal: "All men are mortal"
  socrates_man: "Socrates is a man"
  all_mortal_finite: "All mortal things are finite"
  all_finite_created: "All finite things are created"
  
  # Intermediate conclusions
  socrates_mortal: "Socrates is mortal"
  socrates_finite: "Socrates is finite"
  
  # Final conclusion
  socrates_created: "Socrates is created"

arguments:
  # Inference rules
  - &syllogism1 [all_men_mortal, socrates_man]: [socrates_mortal]
  - &syllogism2 [all_mortal_finite, socrates_mortal]: [socrates_finite]
  - &syllogism3 [all_finite_created, socrates_finite]: [socrates_created]

trees:
  socrates_proof:
    offset: {x: 100, y: 100}
    nodes:
      # Build tree bottom-up (children provide inputs to parents)
      conclusion: {arg: *syllogism3}                    # Root: needs socrates_finite
      mortality: {arg: *syllogism2, parent: conclusion} # Provides socrates_finite
      humanity: {arg: *syllogism1, parent: mortality}   # Provides socrates_mortal
```

**Analysis**:
- **Clean syntax**: Each argument is `[premises]: [conclusions]` - instantly readable
- **Automatic connections**: socrates_mortal flows from humanity → mortality
- **Position detection**: socrates_finite flows from mortality → conclusion  
- **External inputs**: all_men_mortal, all_mortal_finite, all_finite_created come from outside
- **Tree structure**: Parent-child relationships determine actual connections
- **Serializer handles**: All position mapping and connection validation automatic

This demonstrates how the clean format supports complex logical structures while remaining maximally readable.