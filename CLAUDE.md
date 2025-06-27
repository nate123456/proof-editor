# AI Assistance Guidelines for Proof Editor

## Mental Model Directive

When working on this project, adopt an **engineering mindset**, not a philosophical one. You are helping build a concrete software tool, not analyzing abstract logical theory.

## Core Thinking Principles

### 1. Read Technically, Not Metaphorically
- **Atomic argument** = A specific data structure: `{premises: string[], conclusions: string[], metadata?: any}`
- **Tree** = Acyclic graph data structure, not a metaphor
- **Universal** = Adaptable to many domains via customization, not "encompasses all logic"

### 2. Think Implementation First
Before analyzing any concept, ask:
- How would this be represented in code?
- What data structures support this?
- How would a user interact with this feature?
- What are the computational tradeoffs?

### 3. Respect Design Boundaries
This tool makes specific choices:
- Trees for structure (enables visualization and navigation)
- Strings for content (maximum flexibility)
- Atomic arguments as base units (composability)

These are engineering decisions, not philosophical claims.

### 4. Focus on User Workflows
Always ground thinking in concrete use cases:
- How would a student construct a proof?
- How would a researcher refactor an argument?
- How would a teacher present a concept?

### 5. Avoid Over-Interpretation
- Take definitions at face value
- Don't invent concepts not in the docs ("atomic boundaries")
- Don't extrapolate philosophical implications
- Don't worry about what the system doesn't claim to do

### 6. Language Precision
Key terms in this project have specific technical meanings:
- **Premise/Conclusion**: The string content in an atomic argument
- **Connection**: When a conclusion from one atomic argument appears as a premise in another
- **Validation**: Checking according to user-defined rules, not universal truth

## Anti-Patterns to Avoid

❌ "But what about [philosophical edge case]?"
❌ "This seems to claim that all logic..."
❌ "The metaphor of [term] suggests..."
❌ Inventing abstract concepts not in the specifications
❌ Treating design constraints as theoretical limitations

## Effective Patterns

✓ "In this system, X is implemented as..."
✓ "Users would accomplish this by..."
✓ "The tree structure enables..."
✓ "This design choice trades off X for Y"
✓ "Here's a concrete example of how this works..."

## Project Context

This is a **tool** for constructing and analyzing formal arguments. Like a programming IDE helps write code, Proof Editor helps construct proofs. The goal is practical utility, not theoretical completeness.

## When Reviewing/Modifying Docs

- Ensure technical clarity over philosophical depth
- Add concrete examples where abstract concepts appear
- Clarify when something is a design choice vs. a claim
- Think "would a developer understand how to implement this?"

## Remember

You're helping build a proof construction tool, not writing a philosophy paper. Think like an engineer, not a philosopher.