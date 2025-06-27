# Key Terms and Concepts

## Overview

This document provides conceptual definitions for the fundamental terms used throughout the Proof Editor documentation. For technical implementation details, see [Technical Definitions](../08-technical-design/technical-definitions.md).

## Core Concepts

### Atomic Argument
A single step of logical inference - the fundamental building block of all proofs. Contains premises (what we start with), conclusions (what we derive), and the logical relationship between them.

### Direct Connection
When a conclusion from one atomic argument serves as a premise in another atomic argument, they are directly connected.

### Connected
When there is a path of direct connections between two atomic arguments, they are connected.

### Argument
A set of atomic arguments that is **path-complete** - meaning every pair in the set is connected, and all atomic arguments in the paths between them are included. An argument can be a subset of a larger proof structure.

### Argument Tree
A special type of argument that contains ALL atomic arguments connected to any of its members. This is the maximal connected component - if two argument trees share any atomic argument, they are the same tree.

### Document
A workspace or canvas where atomic arguments are created, positioned, and connected. Documents provide the visual and organizational context for logical work.

### Language Layer
The customizable component that interprets and displays the logical content. It defines how strings in atomic arguments are understood, validated, and presented to users.

## Important Distinctions

### Argument vs Argument Tree
- An **argument** is any valid, path-complete subset (like a sub-proof)
- An **argument tree** includes everything connected (the complete proof)

### Created vs Discovered
- Atomic arguments and connections are **created** by users
- Arguments and argument trees are **discovered** from the connections

### Logical vs Visual
- The logical structure exists in the relationships between atomic arguments
- The visual representation shows this structure spatially

## Design Philosophy

These concepts emerge from how people naturally work with logical reasoning:
- Building proofs step by step (atomic arguments)
- Connecting ideas that follow from each other (connections)
- Working with sub-proofs and complete proofs (arguments and trees)
- Organizing work visually (documents)
- Using familiar notation (language layers)