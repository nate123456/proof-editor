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

# Statements defined as simple key-value pairs
statements:
  s1: "All men are mortal"
  s2: "Socrates is a man"
  s3: "Socrates is mortal"
  s4: "Humans are biological entities"
  s5: "All biological entities eventually die"
  s6: "Socrates is a human"
  s7: "All humans are men"

# Atomic arguments reference Statement IDs
arguments:
  arg1:
    premises: [s1, s2]
    conclusions: [s3]
    rule: "Modus Ponens"
  arg2:
    premises: [s4, s5]
    conclusions: [s1]  # Reuses Statement s1
    rule: "Categorical Syllogism"
  arg3:
    premises: [s6, s7]
    conclusions: [s2]  # Reuses Statement s2
    rule: "Definition"

# Trees define spatial organization
# When position defaults to [0, 0], use simplified format:
trees:
  main: arg1  # Simplified format for default position
  exploration:
    root: arg2
    position: [300, 200]  # Explicit format when non-default position

# Optional metadata
tags: ["philosophy", "logic", "modus-ponens"]
description: "Classic syllogism with supporting arguments"
```

## Key Design Decisions

### 1. **Tree-Centric Organization**
- Trees are top-level entities
- Arguments nest naturally within trees
- Connections implicit through nesting

### 2. **Simple Statement Structure**
```yaml
# Statements as direct key-value pairs
statements:
  s1: "First premise"
  s2: "Second premise"
  s3: "The conclusion"

# Atomic arguments reference Statement IDs
arguments:
  arg1:
    premises: [s1, s2]
    conclusions: [s3]
    rule: "Rule name"  # Side label
```

### 3. **Implicit Connections**
Connections emerge from shared Statement references:
- When Statement appears as conclusion in one argument and premise in another
- No explicit connection objects needed
- System discovers connections by analyzing Statement usage

### 4. **Simplified Tree Format**
Trees can use a compact format when using default position [0, 0]:
```yaml
# Compact format (when position is default)
trees:
  main: arg1
  
# Explicit format (when position is non-default)
trees:
  secondary:
    root: arg2
    position: [300, 200]
```

### 5. **Minimal Position Data**
- Only store tree positions
- Compute atomic argument positions from structure
- Keeps diffs clean when editing logic

### 6. **Comment Support**
```yaml
statements:
  s10: "Complex premise"  # TODO: Needs clarification
  s11: "Simple conclusion"

arguments:
  arg5:
    premises: [s10]
    conclusions: [s11]
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
**Rejected**: Less readable, worse diffs, and connections emerge naturally from shared Statement references

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

statements:
  s1: "P"
  s2: "Q"

arguments:
  arg1:
    premises: [s1]
    conclusions: [s2]
    confidence: 0.95  # New field in v1.1
    validated: true   # New field in v1.1

trees:
  main: arg1  # Simplified format when position is default [0, 0]
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