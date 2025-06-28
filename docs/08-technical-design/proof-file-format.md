# Proof File Format Specification

## Overview

Proof Editor uses YAML format with `.proof` extension for maximum readability, version control compatibility, and manual editability. The format supports the Statement-based data model where atomic arguments reference shared Statement entities.

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
author: "Plato"
created: 2024-01-15T10:30:00Z
modified: 2024-01-15T14:22:00Z

# Statements are defined once and referenced by ID
statements:
  - id: stmt1
    text: "All men are mortal"
  - id: stmt2  
    text: "Socrates is a man"
  - id: stmt3
    text: "Socrates is mortal"
  - id: stmt4
    text: "Humans are biological entities"
  - id: stmt5
    text: "All biological entities eventually die"
  - id: stmt6
    text: "Socrates is a human"
  - id: stmt7
    text: "All humans are men"

# Document can contain multiple argument trees
trees:
  main:
    # Root atomic argument
    - id: arg1
      premise-ids: [stmt1, stmt2]
      conclusion-ids: [stmt3]
      rule: "Modus Ponens"  # Side label
      
      # Children of this argument
      branches:
        # Child 1: Exploring "All men are mortal"
        - id: arg2
          shared-statement: stmt1  # Shares this Statement with parent
          premise-ids: [stmt4, stmt5]
          conclusion-ids: [stmt1]  # Same Statement as parent's premise
          rule: "Categorical Syllogism"
          
        # Child 2: Exploring "Socrates is a man"  
        - id: arg3
          shared-statement: stmt2  # Shares this Statement with parent
          premise-ids: [stmt6, stmt7]
          conclusion-ids: [stmt2]  # Same Statement as parent's premise
          rule: "Definition"

# Separate tree in same document
  auxiliary:
    - id: arg4
      premise-ids: [stmt8]
      conclusion-ids: [stmt9]
      
# Additional statements for auxiliary tree
statements:
  - id: stmt8
    text: "Mortality implies finite existence"
  - id: stmt9
    text: "Finite existence is bounded"
      
# Positions stored separately for clean diffs
positions:
  main:
    x: 0
    y: 0
    # Individual positions computed from tree structure
    # Only tree position is stored
  auxiliary:
    x: 500
    y: 0

# Optional metadata
metadata:
  logic-system: "classical-propositional"
  tags: ["philosophy", "logic", "example"]
  description: "Classic syllogism demonstrating modus ponens"
```

## Key Design Decisions

### 1. **Tree-Centric Organization**
- Trees are top-level entities
- Arguments nest naturally within trees
- Connections implicit through nesting

### 2. **Clean Premise/Conclusion Structure**
```yaml
# Statements defined separately
statements:
  - id: s1
    text: "First premise"
  - id: s2
    text: "Second premise"
  - id: s3
    text: "The conclusion"

# Atomic argument references Statements
- id: arg1
  premise-ids: [s1, s2]
  conclusion-ids: [s3]
  rule: "Rule name"  # Side label
```

### 3. **Connection Representation**
Connections exist through shared Statements:
- Parent-child via nesting under `branches:`
- Shared Statement indicated by `shared-statement: id`
- Connection is implicit when same Statement ID appears in both arguments

### 4. **Minimal Position Data**
- Only store tree positions
- Compute atomic argument positions from structure
- Keeps diffs clean when editing logic

### 5. **Inline Comments**
```yaml
statements:
  - id: s10
    text: "Complex premise"  # TODO: Needs clarification
  - id: s11
    text: "Simple conclusion"

- id: arg5
  premise-ids: [s10]
  conclusion-ids: [s11]
  # NOTE: This step might be controversial
  rule: "Disputed inference"
```

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
**Rejected**: Less readable, worse diffs

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

## Migration Path

Future versions can add fields while maintaining compatibility:
```yaml
version: "1.1"
statements:
  - id: s1
    text: "P"
    tags: ["axiom"]  # New in v1.1
  - id: s2
    text: "Q"
    
trees:
  main:
    - id: arg1
      premise-ids: [s1]
      conclusion-ids: [s2]
      confidence: 0.95  # New in v1.1
      validated: true   # New in v1.1
```

## File Association

VS Code users will see:
```
"This file type has a recommended extension: Proof Editor"
```

Click to install and get:
- Syntax highlighting
- Visual proof editor
- Validation
- Tree navigation