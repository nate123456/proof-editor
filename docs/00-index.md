# Proof Editor Documentation

## Overview

This documentation presents the conceptual design for Proof Editor - a multi-platform tool for constructing and analyzing formal logical arguments. The architecture emphasizes 90%+ code reuse across desktop (VS Code), mobile (iOS/Android), and web platforms through a clean three-layer design.

## Key References

**[Key Terms](03-concepts/key-terms.md)** - Canonical definitions of all core concepts.
**[Technical Implementation](08-technical-design/technical-definitions.md)** - Developer-focused implementation details.

## Document Organization

### Sequential Reading

1. **[Problem Space](01-problem-space/README.md)** - Analysis of current formal logic tools
2. **[Vision](02-vision/README.md)** - Project purpose and design principles
3. **[Core Concepts](03-concepts/README.md)** - Fundamental system components
4. **[User Research](04-users/README.md)** - User characteristics and requirements
5. **[Capabilities](05-capabilities/README.md)** - Platform functionality
6. **[Ecosystem](06-ecosystem/README.md)** - Distribution and collaboration mechanisms
7. **[Future Considerations](07-future/README.md)** - Research directions
8. **[Technical Design](08-technical-design/README.md)** - Implementation specifications

### Topical Access

**Problem Analysis:**
- [Current State](01-problem-space/current-state.md)
- [Current Limitations](01-problem-space/current-limitations.md)
- [Technical Feasibility](01-problem-space/technical-feasibility.md)

**Core Components:**
- [Atomic Arguments](03-concepts/atomic-arguments.md)
- [Argument Trees](03-concepts/trees.md)
- [Visual Construction](05-capabilities/visual-proof.md)
- [Platform Capabilities](05-capabilities/platform-capabilities.md)
- [Custom Logic Systems](06-ecosystem/custom-logic.md)

**User Categories:**
- [Student Users](04-users/student-users.md)
- [Researcher Users](04-users/researcher.md)
- [Professional Users](04-users/professional.md)
- [Educator Users](04-users/educator.md)

## Project Phase

The project is in the conceptual design phase, establishing:
- Problem definition and constraints
- Multi-platform architecture (CORE/LSP/PLATFORM layers)
- User needs and workflows across devices
- Platform-agnostic system requirements
- Technical feasibility for 90%+ code reuse

## Documentation Scope

This documentation addresses conceptual design only. Technical implementation details will be documented in [technical-planning/](../technical-planning/README.md) when the project enters development phase.