# [CORE] Proof File Format Specification

## Overview

The CORE layer defines a YAML-based proof file format for maximum readability, version control compatibility, and data portability. The format supports the ordered set-based data model where atomic arguments reference shared ordered set objects.

**Layer**: [CORE] - Platform-agnostic data format

## Design Principles

1. **Human-First**: Readable without tooling
2. **Diff-Friendly**: Minimal changes for local edits  
3. **Intuitive Structure**: Mirrors logical flow
4. **Hand-Editable**: Users can edit directly if needed
5. **Comment Support**: Document reasoning inline

## Basic Structure

```yaml
# Example: Socrates Mortality Proof
version: "1.0"
title: "Socrates Mortality Argument"

# Language specification for this proof
language:
  name: "first-order-logic"
  version: "^2.0.0"
  source: "github:logic-systems/first-order-lsp"
  # Alternative sources:
  # source: "file:./local-languages/first-order-logic"
  # source: "registry:first-order-logic"
  config:
    quantifierScope: "strict"
    allowFreeVariables: false

# Package dependencies for this document
packages:
  required:
    - "basic-logic-symbols@^1.0.0"    # Essential for viewing
  recommended:
    - "philosophy-examples@^2.0.0"    # Enhanced experience

# Ordered sets defined with unique IDs
orderedSets:
  os1: ["All men are mortal", "Socrates is a man"]
  os2: ["Socrates is mortal"]
  os3: ["Humans are biological entities", "All biological entities eventually die"]
  os4: ["All men are mortal"]  # Same content as in os1[0], but different object
  os5: ["Socrates is a human", "All humans are men"]
  os6: ["Socrates is a man"]  # Same content as in os1[1], but different object

# Atomic arguments reference ordered set IDs
arguments:
  arg1:
    premises: os1
    conclusions: os2
    rule: "Modus Ponens"
  arg2:
    premises: os3
    conclusions: os4
    rule: "Categorical Syllogism"
  arg3:
    premises: os5
    conclusions: os6
    rule: "Definition"
  # Connection example: arg4 uses os2 (from arg1's conclusion) as its premise
  arg4:
    premises: os2  # SAME ordered set reference creates connection!
    conclusions: os7
    rule: "Further inference"

# Trees define logical groupings
trees:
  main: arg1  # Root atomic argument ID
  exploration:
    root: arg2  # Root atomic argument ID

# Optional metadata
tags: ["philosophy", "logic", "modus-ponens"]
description: "Classic syllogism with supporting arguments"
```

## Key Design Decisions

### 1. **Tree-Centric Organization**
- Trees are top-level entities
- Arguments nest naturally within trees
- Connections implicit through nesting

### 2. **Simple Ordered Set Structure**
```yaml
# Ordered sets as arrays with unique IDs
orderedSets:
  os1: ["First premise", "Second premise"]
  os2: ["The conclusion"]

# Atomic arguments reference ordered set IDs
arguments:
  arg1:
    premises: os1     # Reference to ordered set
    conclusions: os2  # Reference to ordered set
    rule: "Rule name"  # Side label
```

### 3. **Implicit Connections**
Connections emerge from shared ordered set references:
- When the conclusion ordered set of one argument IS the premise ordered set of another
- No explicit connection objects needed
- System discovers connections by checking reference equality
- Same ordered set ID = connection exists

### 4. **Tree Format**
Trees reference their root atomic argument:
```yaml
trees:
  main: arg1        # Simple format
  secondary:
    root: arg2      # Explicit format
```

### 5. **Minimal Data Storage**
- Only store logical relationships
- Connections discovered from ordered set references
- Keeps diffs clean when editing logic

### 6. **Comment Support**
```yaml
orderedSets:
  os10: ["Complex premise"]  # TODO: Needs clarification
  os11: ["Simple conclusion"]

arguments:
  arg5:
    premises: os10
    conclusions: os11
    # NOTE: This step might be controversial
    rule: "Disputed inference"
```

### 7. **Language Specification**
Documents declare their logical language for proper validation and analysis:

```yaml
language:
  name: "modal-logic"
  version: "^1.2.0"
  source: "github:logictools/modal-logic-lsp"
  config:                          # Optional language-specific configuration
    axiomSystem: "S5"
    strictMode: true
```

Language specification:
- **Name**: Identifies the logical language 
- **Version**: Semantic versioning constraint
- **Source**: Where to find the language definition
- **Config**: Language-specific parameters

### 8. **Package References**
Documents can specify package dependencies to ensure consistent viewing experience:

```yaml
packages:
  required:
    - "modal-logic-symbols@^1.0.0"     # Must be installed to view properly
    - "formal-methods-core@^2.1.0"     # Contains essential validation rules
  recommended:
    - "modal-logic-examples@^1.0.0"    # Additional examples and templates
    - "dark-theme-academic@^3.0.0"     # Preferred visual theme
```

Package specifications:
- **Required**: Essential for proper interpretation
- **Recommended**: Enhanced functionality
- **Version constraints**: Semantic versioning

## Alternative Structures Considered

### Option A: Flat with Explicit Connections
```yaml
arguments:
  - id: arg1
    premises: ["P", "Q"]
    conclusion: "R"
    
connections:
  - from: arg1.conclusion
    to: arg2.premise[0]
```
**Rejected**: Less readable, worse diffs, and connections emerge naturally from shared ordered set references

### Option B: Graph-Like
```yaml
nodes:
  arg1:
    type: argument
    content:
      premises: ["P"]
      conclusion: "Q"
edges:
  - [arg1, arg2]
```
**Rejected**: Too abstract, not intuitive

## Benefits of Chosen Format

1. **Git Diffs**: Adding a branch only shows the new nested block
2. **Readability**: Follows logical flow top-to-bottom
3. **Editability**: Add new arguments by copying a block
4. **Validation**: YAML schema can enforce structure
5. **Extensibility**: Easy to add new fields without breaking

## Forward Compatibility

Future versions can add fields while maintaining compatibility:
```yaml
version: "1.1"

# Language specification (added in v1.1)
language:
  name: "modal-logic"
  version: "^1.2.0"
  source: "github:logictools/modal-logic-lsp"
  config:
    axiomSystem: "S5"
    strictMode: true

# Package dependencies (added in v1.0)
packages:
  required: ["basic-logic@^1.0.0"]
  recommended: ["advanced-features@^2.0.0"]

# Custom characters (added in v1.0)
customCharacters:
  - symbol: "⊢"
    name: "turnstile"
    keybinding: "\\vdash"

orderedSets:
  os1: ["P ⊢ Q"]  # Using custom character
  os2: ["Q"]

arguments:
  arg1:
    premises: os1
    conclusions: os2
    confidence: 0.95  # New field in v1.1
    validated: true   # New field in v1.1

trees:
  main: arg1  # Root reference
```

## Package Lock Files

For reproducible package environments, Proof Editor supports lock files:

```yaml
# .proof.lock file (auto-generated)
lockfileVersion: 1
packages:
  modal-logic-starter:
    version: "1.2.3"
    resolved: "github:logic-systems/modal-logic-starter#abc123"
    integrity: "sha256-..."
    dependencies:
      basic-logic-symbols: "2.1.0"
  basic-logic-symbols:
    version: "2.1.0"
    resolved: "github:logic-systems/basic-logic-symbols#def456"
    integrity: "sha256-..."
```

Lock files ensure:
- Exact version reproduction
- Dependency version pinning
- Integrity verification
- Consistent team environments

## File Extension

Proof files use the `.proof` extension for:
- Clear identification
- Format association  
- Version control recognition