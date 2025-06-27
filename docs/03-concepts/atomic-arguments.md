# Atomic Arguments

## Definition

An atomic argument is a relation between two ordered n-tuples of strings, where either n-tuple may be empty. It represents a single step of logical reasoning - the fundamental building block from which all complex proofs are constructed.

## Abstract Structure

An atomic argument consists of:
- A premise tuple: an ordered n-tuple of strings (may be empty)
- A conclusion tuple: an ordered n-tuple of strings (may be empty)
- An implication relation between these tuples
- Optional metadata (such as rule names or references)

## Example Visualization

*Note: This is one possible way to display an atomic argument. The actual presentation is determined by the user's chosen language layer and visualization preferences.*

```
    P₁, P₂, ..., Pₙ
    ─────────────── [Rule]
    C₁, C₂, ..., Cₘ
```

### Components

#### The Implication Relation
- Represents the logical relationship between premises and conclusions
- Uniquely identifies the atomic argument along with its premise and conclusion tuples
- In visual representations, may be shown as a line, arrow, box, color, or other indicator
- The core concept is the relation itself, not any particular visual representation

#### Premises
- The first n-tuple in the atomic argument relation
- Ordered collection of strings (may be empty)
- Represent assumptions, givens, or previously proven statements
- Function as the "if" part of logical reasoning
- How they are displayed (order, separators, layout) is determined by the language layer

#### Conclusions
- The second n-tuple in the atomic argument relation
- Often contains only one string, though multiple conclusions are supported
- Ordered collection of strings (may be empty)
- Represent what follows from the premises
- Function as the "then" part of logical reasoning

#### Metadata (Optional)
- Additional information associated with the atomic argument
- May include rule names or identifiers
- May include references, line numbers, or other annotations
- How and where this metadata is displayed depends on the visualization layer

## Examples

*Note: These examples use common mathematical logic notation and horizontal layout. Your domain may use entirely different symbols, notation, and visual arrangements.*

### Example: Modus Ponens
Using one possible notation:
```
    P → Q, P
    ────────── MP
        Q
```
This represents an atomic argument with:
- Premise tuple: ("P → Q", "P")
- Conclusion tuple: ("Q")
- Metadata: rule name "MP"

### Example: Axiom
```
    
    ────────── Axiom
    A ∨ ¬A
```
This represents:
- Premise tuple: (empty)
- Conclusion tuple: ("A ∨ ¬A")
- Metadata: rule name "Axiom"

### Example: Multiple Conclusions
```
    P ∧ Q
    ────────── ∧-Elim
    P, Q
```
This represents:
- Premise tuple: ("P ∧ Q")
- Conclusion tuple: ("P", "Q")
- Metadata: rule name "∧-Elim"

## Design Rationale

### Why "Atomic"?
Like atoms in chemistry, these atomic arguments are:
- Indivisible units of reasoning
- Combined to form complex structures
- Each one represents exactly one inference

### Why Strings?
- Maximum flexibility for different domains
- No built-in logical syntax assumptions
- Users/domains can interpret as needed
- Natural for both formal and informal logic

### Why N-Tuples?
- Some rules have multiple premises
- Some rules produce multiple conclusions
- Empty tuples allow for axioms and contradictions
- Ordered for precise reference

## Interaction Properties

### Direct Manipulation
- Select and modify premise and conclusion strings
- Adjust relationships between atomic arguments
- Edit metadata and annotations

### Language Layer Integration
- The language layer defines how tuples are parsed and displayed
- Custom syntax rules for different domains
- Flexible notation systems

### Extensibility
- Custom language layers for specialized domains
- Plugin points for validation
- Flexible metadata system