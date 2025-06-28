# DDD Refactoring Summary

## Overview

This document summarizes the Domain-Driven Design (DDD) refactoring performed on the Proof Editor documentation to resolve contradictions and establish clear boundaries between domain concepts and implementation details.

## Key Changes Made

### 1. Created DDD Glossary
- **Location**: `/docs/03-concepts/ddd-glossary.md`
- **Purpose**: Establishes clear distinction between domain language and implementation language
- **Key insight**: Domain concepts exist independently of their implementation

### 2. Fixed Atomic Argument Definition Contradiction
- **Issue**: Some docs defined it as a data structure, others as a relation
- **Resolution**: 
  - Domain: Atomic argument IS a relation between two ordered n-tuples of strings
  - Implementation: AtomicArgumentEntity is a data structure that stores this information
- **Files updated**: 
  - `technical-definitions.md` - renamed to AtomicArgumentEntity
  - `atomic-arguments.md` - removed implementation notes

### 3. Removed "May Be Stored" Hedging
- **Issue**: Wishy-washy language about whether connections are stored
- **Resolution**: Connections ARE stored explicitly for good reasons (performance, override, metadata)
- **Files updated**:
  - `connections.md` - removed hedging, explained intentional logical flow
  - `conceptual-data-model.md` - clarified why we store connections

### 4. Fixed Created/Discovered/Emerged Inconsistency
- **Issue**: Inconsistent language about how trees come to exist
- **Resolution**: 
  - Atomic arguments and connections are CREATED by users
  - Argument trees are DISCOVERED from the connection structure
  - Trees EMERGE from connections
- **Consistency**: All documents now use this consistent language

### 5. Added Missing Definitions
- **Added to `key-terms.md`**:
  - Path: A sequence of directly connected atomic arguments
  - Path-Complete: Property ensuring no missing logical steps
  - Maximal: Property of argument trees containing all connected arguments

### 6. Resolved Semantic Neutrality Paradox
- **Issue**: How can the system be "semantically neutral" yet validate logic?
- **Resolution**: Added section to DDD Glossary explaining:
  - Platform level: Semantically neutral (just strings and structure)
  - Language layer level: Semantic interpretation and validation
  - Analogy: Like text editor (neutral) vs compiler (interprets)

### 7. Reorganized Technical Documents
- **Updated headers and framing**:
  - Technical documents now clearly marked as implementation-focused
  - Added references to domain documents for context
  - Clarified audience (developers vs users)

### 8. Applied Philosopher's Empirical Definitions
- **Source of truth**: The empirical definitions provided in the prompt
- **Consistency**: All documents now align with these definitions
- **No contradictions**: Removed all conflicting definitions

### 9. Tree vs DAG Clarification
- **Domain language**: Users work with "trees"
- **Implementation**: We implement using DAGs
- **Documents updated**: DAG model clearly states this is implementation of domain trees

### 10. Fixed Overpromised Features
- **Issue**: Analysis capability promised full scripting runtime without design
- **Resolution**: Marked as "Future Capability - Requires Design"
- **Added**: List of technical challenges that need addressing

## Documents Modified

### Core Concept Documents
1. `ddd-glossary.md` - Created new
2. `key-terms.md` - Added missing definitions
3. `atomic-arguments.md` - Removed implementation notes
4. `connections.md` - Removed hedging language
5. `trees.md` - Removed implementation note
6. `argument-hierarchy.md` - Already well-aligned

### Technical Documents
1. `technical-definitions.md` - Reframed as implementation doc
2. `conceptual-data-model.md` - Clarified as bridge document
3. `dag-data-model.md` - Reframed as pure implementation

### Other Documents
1. `analysis.md` - Marked scripting as future capability
2. `technical-definitions.md` (in main docs) - Created as quick reference
3. `03-concepts/README.md` - Added DDD glossary link

## Principles Applied

1. **Clear Boundaries**: Domain concepts never leak into implementation details
2. **Consistent Language**: Same terms used same way across all docs
3. **Appropriate Audience**: Each doc speaks to its intended readers
4. **No Hedging**: Definitive statements about what the system does
5. **Empirical Truth**: Philosopher's definitions as source of truth

## Remaining Considerations

### Documentation Structure
Consider creating:
- `/docs/09-implementation/` - Move all technical docs here
- `/docs/domain/` vs `/docs/technical/` - Even clearer separation

### Language Discipline Enforcement
- Consider automated checks for domain terms in technical docs
- Style guide for contributors
- Review checklist for new documentation

### Further Clarifications Needed
1. How language layers specify semantic equivalence
2. Collaborative editing conflict resolution
3. External proof references
4. Performance constraints for large proofs

## Conclusion

The documentation now maintains clear DDD boundaries. Users can understand the system through domain concepts without implementation details. Developers can see how domain concepts map to concrete implementations. The semantic neutrality paradox is resolved, and all definitions align with the empirical source of truth.