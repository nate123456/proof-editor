# Product Requirements Document: Proof Editor V1

## Executive Summary

Proof Editor is a visual tool for constructing and analyzing formal logical arguments. Philosophy professors, logicians, and students create custom logical reasoning systems and construct proofs using familiar IDE-like workflows.

### Key Innovation
Proof Editor combines **semantic neutrality** with **user-friendly extensibility**. Users define logical rules through simple configuration, and the system provides ultra-fast validation through a dedicated Language Server Protocol (LSP) architecture that executes user-defined logic.

### Product Philosophy
- **Domain Expert Focus**: Enable logic experts to create and share custom logical systems without programming barriers
- **Proven UX Patterns**: Borrow from mature developer tooling (Docker, VS Code, npm)
- **Local Development First**: File-based workflows with hot reload and version control
- **Ultra-Fast Performance**: <10ms validation responses for responsive editing

### Target Users
- **Philosophy Professors**: Creating and sharing custom logic systems for teaching
- **Students**: Learning formal reasoning with interactive validation
- **Logic Researchers**: Developing and testing new logical frameworks
- **Domain Experts**: Anyone who understands logic but doesn't necessarily code

## Core Concepts

For detailed definitions, see [Key Terms](03-concepts/key-terms.md) and [User Roles](01-introduction/user-roles.md). Key concepts:

### Statements & Ordered Sets
**Statements** are reusable strings (like "All men are mortal"). **Ordered Sets** are collections of statements that maintain order and uniqueness. Connections form when atomic arguments share the same ordered set object.

### Atomic Arguments & Branching
**Atomic Arguments** represent single inference steps. **Branching** creates connections by making one argument's conclusion ordered set become another's premise ordered set (same object reference).

### Language Systems
**Language Systems** define what constitutes valid logic through a 3-tier SDK:
- **Config YAML**: Declarative rules (90% of use cases)
- **JavaScript Rules**: Custom validation logic
- **Full LSP Extensions**: Complete reasoning environments

### Custom Logic Workflows
Users define logical rules through YAML configuration and optional JavaScript, and the LSP server executes user-defined validation in real-time.

## Architecture: LSP-Driven Dual Platform

### Core Architecture Principle
Proof Editor uses a **dedicated LSP (Language Server Protocol) thread** that executes user-defined language logic. This LSP server becomes the runtime environment for custom logical reasoning systems.

### Platform Strategy: VS Code + React Native Only

**Desktop: VS Code Extension**
- LSP server runs as separate Node.js process
- Uses Worker Threads for JavaScript sandboxing
- Leverages VS Code's file management, settings, and developer workflows
- Inherits enterprise features (Git, themes, accessibility)

**Mobile: React Native App** 
- Embedded LSP service in JavaScript context
- Direct execution (no worker overhead for performance)
- Touch-optimized interactions with offline-first design
- Platform-native sharing and file management

### Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│              User's Language Code           │ ← YAML/JavaScript rules
├─────────────────────────────────────────────┤
│         LSP Server (Execution Engine)       │ ← Runs user logic, provides validation
├─────────────────────────────────────────────┤
│     Core Proof Engine (Platform-Agnostic)   │ ← Ordered sets, connections, file format
├─────────────────────────────────────────────┤
│        Platform Layer (VS Code/RN)          │ ← UI, file I/O, platform integration
└─────────────────────────────────────────────┘
```

### Language Loading System (Docker-Inspired)

**Remote Languages:**
```yaml
language: natural-deduction:latest
language: modal-logic:v1.2.3
```

**Local Development:**
```yaml
language: ./my-custom-logic  # File watching + hot reload
```

**Version Management:**
- Automatic update prompts for `:latest` specifications
- Local caching of downloaded language packages
- Git-like versioning with semantic tags

## User Workflows

### Core Workflow: Professor Creating Custom Logic

1. **Local Development Setup**
   ```bash
   mkdir aristotelian-logic
   cd aristotelian-logic
   echo "name: aristotelian-logic\nrules: []" > package.yaml
   ```

2. **Language Definition**
   - Define rules using YAML config format
   - Add JavaScript validation when needed
   - File watching provides instant feedback

3. **Testing & Iteration**
   - Create proof files pointing to `./aristotelian-logic`
   - Edit rules → See validation changes immediately
   - Ultra-fast <10ms feedback loop

4. **Publishing & Sharing**
   - Push to GitHub repository
   - Students use `language: github:prof/aristotelian-logic:latest`
   - Automatic update notifications

### Core Workflow: Student Using Custom Logic

1. **Language Import**
   ```yaml
   language: github:prof-smith/modal-logic:latest
   ```

2. **Interactive Proof Construction**
   - Student constructs proofs using visual interface
   - Real-time validation with custom error messages
   - Clear feedback using professor's custom rules

3. **Visual Proof Construction**
   - Use proven UX patterns from alpha version
   - Keyboard-driven navigation with spatial movement
   - Branching creates connected arguments

## Phase 1: Desktop MVP (VS Code Extension)

### User Stories

#### 1. Local Language Development
**As a** philosophy professor  
**I want to** create custom logical rules for my class  
**So that** students can practice my specific reasoning system

**Acceptance Criteria:**
- Can create local language directory with `package.yaml`
- Can define rules in YAML config format
- Can write custom JavaScript validation rules
- File changes trigger automatic reload and revalidation
- Can test rules immediately in proof documents

**Documentation:**
- YAML configuration examples
- JavaScript rule templates
- Test case patterns

#### 2. Ultra-Fast Proof Construction
**As a** student using a custom logic system  
**I want to** get immediate feedback as I construct proofs  
**So that** I can learn logical reasoning efficiently

**Acceptance Criteria:**
- Validation responses in <10ms for responsive editing
- Real-time error highlighting as user types
- Clear error messages specific to the language system
- Helpful validation feedback

**Performance Requirements:**
For detailed performance targets and requirements, see [Non-Functional Requirements](09-non-functional-requirements.md#performance-requirements).

#### 3. Proven Branching Workflow (From Alpha)
**As a** user constructing complex proofs  
**I want to** use the validated interaction patterns from the alpha version  
**So that** I can efficiently build connected logical arguments

**Acceptance Criteria (Proven in Alpha):**
- Keyboard-first navigation with spatial movement (arrows navigate structure)
- "Focus vs Make" command distinction (navigate vs create+navigate)
- Multi-modal focus (cell text, stroke/line, discharge area)
- Branching creates shared ordered set references between arguments
- Visual tree structure with horizontal lines indicating atomic arguments

**Extensions for Multiple Conclusions:**
- Support ordered sets with multiple statements (not just single conclusions)
- Branching can select specific statement from conclusion set
- Visual representation of statement lists within atomic arguments

#### 4. Language Package Sharing
**As a** professor or researcher  
**I want to** share my custom logic systems with students and colleagues  
**So that** they can use my reasoning frameworks

**Acceptance Criteria:**
- Can publish language packages to GitHub repositories
- Students can import with `language: github:prof/modal-logic:latest`
- Automatic update notifications when new versions available
- Version management with semantic tags (v1.2.3)
- Package inheritance (extend existing logic systems)

**Success Metrics:**
- Zero-friction sharing workflow for professors
- Students can easily import and use custom logic systems
- Version management prevents breaking changes
- Clear lineage when extending existing systems

#### 5. User-Friendly Rule Creation
**As a** domain expert without programming experience  
**I want to** define logical rules using simple configuration  
**So that** I can create custom logic systems

**Acceptance Criteria:**
- Can define rules using YAML config patterns
- Clear documentation with examples and templates
- JavaScript validation functions when needed
- Can iterate on rules with immediate feedback
- Examples and templates for common patterns

**Documentation Support:**
- Rule pattern examples and templates
- Clear error messages and debugging help
- Best practices for rule composition
- Guides for combining existing systems

#### 6. Cross-Platform File Synchronization
**As a** user working across desktop and mobile  
**I want to** seamlessly access my proofs on both platforms  
**So that** I can work flexibly

**Acceptance Criteria:**
- VS Code: Integration with file system, Git, and workspace settings
- React Native: Cloud sync with offline-first architecture
- Consistent .proof file format across platforms
- Language packages work identically on both platforms
- Settings and preferences sync when possible

**Platform-Specific Features:**
- Desktop: Full VS Code developer workflow integration
- Mobile: Touch-optimized interactions with gesture support
- Both: Same LSP validation logic and language capabilities

## Technical Requirements

### LSP Server Architecture

**Language Execution Environment:**
- Dedicated thread/process running user's JavaScript logic
- Sandboxing: Worker Threads (VS Code) / Direct execution (React Native)
- Language loading: Local file watching + remote GitHub packages
- Hot reload: <100ms language recompilation on file changes

**Performance Targets:**
For comprehensive performance targets and benchmarks, see [Non-Functional Requirements](09-non-functional-requirements.md#ultra-fast-validation-performance).

**Security Boundaries:**
- No file system access from user JavaScript
- No network access from validation rules
- Timeout protection (5 seconds max per rule)
- Memory limits (adaptive allocation per language context)
- **Explicit User Consent for Executable Code**: The system must obtain explicit user consent before installing and running any language package that contains executable code (JavaScript rules or LSP servers). For comprehensive details on consent processes, risk disclosure, trust mechanisms, and security enforcement, see [Language Package Security Policy](policies/language-package-security-policy.md)

**Cross-Platform Synchronization & Offline NFRs:**
For detailed synchronization requirements, data consistency guarantees, and mobile performance targets, see [Non-Functional Requirements](09-non-functional-requirements.md#cross-platform-synchronization-requirements).

For technical implementation specifications, see [Data Synchronization and Conflict Resolution](08-technical-design/sync-and-conflicts/data-sync-and-conflict-resolution.md).

### Language System Requirements

**Three-Tier SDK:**
```yaml
# Tier 1: Config YAML (90% of use cases)
rules:
  modus_ponens:
    pattern:
      premises: ["{A} → {B}", "{A}"]
      conclusions: ["{B}"]

# Tier 2: JavaScript Rules (custom logic)
- type: js
  file: "./custom-rules.js"

# Tier 3: Full LSP Extensions (complete environments)
lsp:
  completions: "./completions.js"
  hover: "./hover.js"
  commands: "./commands.js"
```

**Language Inheritance:**
- Single inheritance chain per proof
- Child languages can override parent rules
- Conflict resolution through explicit precedence

**Package Format (Docker-Inspired):**
```yaml
name: modal-natural-deduction
version: 1.0.0
extends: natural-deduction:v2.1.0

rules:
  - type: config
    # ... rule definitions

dev:
  hot_reload: true
  debug_mode: true
```


### File Format & Serialization

**Basic Provenance Tracking**: The `.proof` file format and runtime model will support basic tracking of authorship and source language package for individual atomic arguments and ordered sets, enabling collaboration attribution.

**Proof Document Structure:**
```yaml
# my-proof.proof
language: modal-logic:v1.2.3

proof:
  atomic_arguments:
    - id: arg1
      premises:
        - statements: ["All men are mortal", "Socrates is a man"]
      conclusions:
        - statements: ["Socrates is mortal"]
      metadata:
        rule: "Universal Instantiation"
        
    - id: arg2  
      premises:
        - statements: ["Socrates is mortal"]  # Same ordered set reference
      conclusions:
        - statements: ["Socrates will die"]
      metadata:
        rule: "Modus Ponens"

  # Visual layout (optional)
  layout:
    arg1: {x: 100, y: 100}
    arg2: {x: 100, y: 200}
```

**Cross-Platform Compatibility:**
- Human-readable YAML format
- Git-friendly (line-based changes)
- Preserves logical structure and connections
- Optional visual layout metadata
- Works identically on VS Code and React Native

### Platform Integration

**VS Code Extension:**
- File type association (.proof files)
- Syntax highlighting for proof documents
- Integration with command palette
- LSP client communicating via stdio
- Settings integration (keybindings, themes)

**React Native App:**
- Touch-optimized proof construction
- Embedded LSP service (no separate process)
- Offline-first with cloud sync capability
- Platform-native file sharing
- Gesture-based navigation (pinch, pan, long-press)

## Development Phases

### Phase 1: Desktop MVP (VS Code Extension)

**Core Goals:**
1. Validate LSP architecture with real user feedback
2. Prove local development workflow
3. Demonstrate template-based language creation through documentation
4. Establish performance benchmarks

**Deliverables:**
- VS Code extension with LSP server
- Local language development workflow
- Basic language package format
- Proven UX patterns from alpha (keyboard navigation, branching)
- Template-based rule generation through comprehensive documentation

**Success Criteria:**
- Professor can create custom logic in <30 minutes
- Students can import and use professor's logic
- <10ms validation performance achieved
- File watching + hot reload working

### Phase 2: Mobile Platform (React Native)

**Core Goals:**
1. Extend proven desktop experience to mobile
2. Touch-optimized interaction patterns
3. Offline-first architecture
4. Cross-platform file compatibility

**Deliverables:**
- React Native app with embedded LSP
- Touch-friendly proof construction
- Cloud sync with offline support
- Identical language compatibility

**Success Criteria:**
- Same language packages work on both platforms
- Touch interactions feel natural
- Offline editing with sync capability
- 90%+ code reuse from desktop implementation

## Performance Requirements

### Ultra-Fast Single-User Experience

For comprehensive performance requirements, validation targets, development workflow timing, and resource limits, see [Non-Functional Requirements](09-non-functional-requirements.md#performance-requirements).

### Optimization Strategy

**Pre-warming:**
- LSP server starts before user opens proof
- Language packages cached locally
- Validation contexts pre-created
- Common patterns pre-compiled

**Incremental Processing:**
- Only revalidate changed atomic arguments
- Diff-based language reloading
- Partial cache invalidation
- Background pre-computation

**Platform-Specific:**
- VS Code: Worker Thread sandboxing with process isolation
- React Native: Direct JavaScript execution for minimal overhead
- Both: Aggressive result caching and pattern memoization

## Success Criteria

### Phase 1 MVP Success

**Technical Validation:**
- LSP server executes user JavaScript safely
- <10ms validation performance achieved
- Local file watching + hot reload working
- VS Code extension functional

**User Workflow Validation:**
- Professor can create custom logic system in <30 minutes using templates
- Documentation enables working rule implementations
- Students can import professor's language package
- Proven alpha UX patterns work with new architecture

**Performance Benchmarks:**
For detailed success metrics and measurement criteria, see [Non-Functional Requirements](09-non-functional-requirements.md#success-criteria--measurements).

### Phase 2 Mobile Success

**Cross-Platform Validation:**
- Same language packages work on both platforms
- File format compatibility 100%
- 90%+ code reuse achieved
- Touch interactions feel natural

**Mobile-Specific:**
- Offline proof editing capability
- Cloud sync with conflict resolution
- Platform-native sharing
- Battery-efficient operation

## Product Principles

### Domain Expert Focus
Leverage users' deep logical knowledge while removing technical barriers through clear documentation and examples. Domain experts focus on logical reasoning while simple configuration handles implementation.

### Proven UX Pattern Reuse
Borrow extensively from mature developer tooling (Docker, VS Code, npm, webpack) rather than inventing new interaction patterns. Users get familiar workflows applied to logical reasoning.

### Local Development First
Prioritize file-based, version-controlled workflows that integrate with existing academic practices. Enable rapid iteration without requiring infrastructure setup.

### Ultra-Fast Performance
Single-user experience optimized for <10ms feedback loops. For detailed performance targets and optimization strategies, see [Non-Functional Requirements](09-non-functional-requirements.md#performance-requirements).

### Platform Independence
Core logical capabilities work identically on desktop and mobile. Platform-specific optimizations enhance rather than limit the experience.

## Key Design Decisions

### Why LSP Architecture?
Enables user-defined logic systems to run as first-class language servers with full IDE integration. Provides sandboxing, performance, and extensibility.

### Why Two Platforms Only?
VS Code + React Native covers the full spectrum (professional desktop + accessible mobile) while maintaining focus and code reuse.

### Why Local Development First?
Academic workflows prioritize iteration and experimentation. File-based development with Git integration matches existing practices.

### Why Simple Configuration?
Domain experts understand logic but may not code. YAML configuration and clear examples bridge this gap while preserving expert knowledge and intent.