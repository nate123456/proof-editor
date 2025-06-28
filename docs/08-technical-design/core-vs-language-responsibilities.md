# Core Platform vs Language Layer Responsibilities

## Overview

This document clearly delineates which features and concepts are handled by the core Proof Editor platform versus what language layers are responsible for implementing.

## Responsibility Table

| Concept | Core Platform | Language Layer | Notes |
|---------|--------------|----------------|-------|
| **Data Storage** |
| YAML file reading/writing | ✓ | | Platform handles persistence |
| Atomic argument data structure | ✓ | | Core data model |
| Connection references | ✓ | | Platform stores parent-child relationships |
| Connection metadata (timestamp, method, creator) | ✓ | | Platform tracks connection providence |
| Tree positions in document | ✓ | | Platform manages spatial organization |
| Individual position overrides | ✓ | | Platform allows manual positioning |
| Validation state per atomic argument | ✓ | | Platform stores validation results |
| Side label text storage | ✓ | | Platform stores as metadata |
| Version history tracking | ✓ | | Platform manages document versions |
| **Visual Rendering** |
| Canvas management (pan/zoom) | ✓ | | Platform provides viewport |
| Mini-map rendering | ✓ | | Platform provides document overview |
| Auto-fit view | ✓ | | Platform fits content to viewport |
| Node selection/highlighting | ✓ | | Platform handles interaction states |
| Stroke/implication line as focusable | ✓ | | Platform makes strokes selectable |
| Drawing atomic arguments | | ✓ | Language defines visual representation |
| Implication line style | | ✓ | Language chooses lines, turnstiles, etc. |
| Premise/conclusion arrangement | | ✓ | Language decides layout algorithm |
| Side label positioning/styling | | ✓ | Language determines where/how |
| Connection line rendering | | ✓ | Language draws connection style |
| Text formatting within nodes | | ✓ | Language handles symbols, wrapping |
| Validation visual indicators | ✓ | | Platform renders colored borders/underlines |
| What to highlight as errors | | ✓ | Language identifies problems |
| **Interaction** |
| Mouse events (click, drag) | ✓ | | Platform captures events |
| Keyboard event capture | ✓ | | Platform handles key input |
| Stroke selection | ✓ | | Platform handles implication line selection |
| Branch operation (select stroke + 'b') | ✓ | | Platform creates child from stroke |
| Connect operation (select stroke + 'c') | ✓ | | Platform initiates connection mode |
| Navigate to parent/child (Ctrl+Up/Down) | ✓ | | Platform handles tree navigation |
| Navigate siblings (Ctrl+Left/Right) | ✓ | | Platform moves between siblings |
| Jump to first/last sibling (Ctrl+Home/End) | ✓ | | Platform provides quick navigation |
| Create siblings (Ctrl+Shift+Left/Right) | ✓ | | Platform creates new nodes |
| Create multiple children (Ctrl+Shift+0-9) | ✓ | | Platform batch creates nodes |
| Move subtree to new proof (Ctrl+M) | ✓ | | Platform extracts subtrees |
| Text editing in premises/conclusions | ✓ | | Platform provides text input |
| Text selection within nodes | ✓ | | Platform handles cursor/selection |
| Creating new nodes | ✓ | | Platform adds to data model |
| Deleting nodes | ✓ | | Platform removes from data model |
| Tree position dragging | ✓ | | Platform moves entire trees |
| What makes valid branch/connection | | ✓ | Language validates operations |
| Node creation shortcuts customization | | ✓ | Language defines key mappings |
| Context menu options | | ✓ | Language provides available actions |
| **Logic & Validation** |
| String storage | ✓ | | Platform stores premise/conclusion text |
| Parse logical notation | | ✓ | Language understands symbols |
| Validate inference rules | | ✓ | Language checks logic |
| Real-time validation infrastructure | ✓ | | Platform provides as-you-type checking |
| Validation rules | | ✓ | Language implements validation logic |
| Suggest completions | | ✓ | Language provides IntelliSense |
| Auto-completion for logical next steps | | ✓ | Language suggests valid conclusions |
| Rule suggestions | | ✓ | Language identifies applicable rules |
| Error messages and explanations | | ✓ | Language generates helpful text |
| Quick fix suggestions | | ✓ | Language provides corrections |
| Symbol palette contents | | ✓ | Language defines available symbols |
| Symbol insertion shortcuts | | ✓ | Language maps shortcuts to symbols |
| LaTeX escape sequences (\\forall → ∀) | ✓ | | Platform provides text replacement |
| Special character palette | | ✓ | Language defines available symbols |
| **Layout** |
| Position calculation framework | ✓ | | Platform provides coordinate system |
| Standard layout algorithms (top-down, radial, etc.) | ✓ | | Platform provides common layouts |
| Default layout selection | | ✓ | Language chooses preferred layout |
| Custom layout algorithm | | ✓ | Language implements unique layouts |
| Manual tree position adjustments | ✓ | | Platform allows drag/drop of trees |
| Spacing constants | | ✓ | Language defines gaps/margins |
| Tree structure navigation | ✓ | | Platform traverses parent-child |
| **Connection Management** |
| Store connections in YAML | ✓ | | Platform persists relationships |
| Connection data model | ✓ | | Platform maintains references |
| Branch from selected string | ✓ | | Platform handles text selection branching |
| Create independent tree | ✓ | | Platform creates new unconnected tree |
| Connection validation | | ✓ | Language checks if connection valid |
| Connection visual style | | ✓ | Language draws the lines |
| Connection hover information | | ✓ | Language provides connection details |
| **File Format** |
| YAML structure | ✓ | | Platform defines schema |
| Serialization/deserialization | ✓ | | Platform handles I/O |
| Custom metadata fields | | ✓ | Language can add fields |
| Version migration | ✓ | | Platform manages versions |
| Export infrastructure | ✓ | | Platform provides export capability |
| Export format details | | ✓ | Language determines PDF/HTML layout |
| **Commands & Operations** |
| Undo/redo infrastructure | ✓ | | Platform provides history |
| Copy/paste infrastructure | ✓ | | Platform handles clipboard |
| Find and replace infrastructure | ✓ | | Platform provides search |
| Split view management | ✓ | | Platform handles multiple views |
| What can be undone | | ✓ | Language defines operations |
| Paste behavior | | ✓ | Language implements paste logic |
| What constitutes a "symbol" for search | | ✓ | Language defines searchable items |
| Refactoring operations | | ✓ | Language implements refactoring logic |
| **UI Components** |
| WebView management | ✓ | | Platform provides canvas |
| Command palette integration | ✓ | | Platform registers commands |
| Status bar | ✓ | | Platform provides UI space |
| Tree view panel | ✓ | | Platform provides component |
| Outline view panel | ✓ | | Platform provides hierarchical view |
| Breadcrumb navigation | ✓ | | Platform shows current location |
| What shows in tree/outline view | | ✓ | Language defines content |
| Status bar content | | ✓ | Language provides status text |
| **Document Management** |
| Document types (working/presentation/template) | ✓ | | Platform manages document modes |
| Presentation mode UI | ✓ | | Platform provides clean interface |
| Template storage | ✓ | | Platform stores templates |
| Template content | | ✓ | Language provides domain templates |
| Step-through navigation | ✓ | | Platform handles presentation flow |
| Spotlight mode | ✓ | | Platform highlights current focus |
| **Performance** |
| Viewport culling | ✓ | | Platform optimizes rendering |
| Konva.js integration | ✓ | | Platform manages renderer |
| Spatial indexing (RTree) | ✓ | | Platform provides spatial queries |
| Render optimization hints | | ✓ | Language suggests batching |
| **Visual Details** |
| Empty cell placeholder display | ✓ | | Platform shows placeholder text |
| Focus visual states (colors) | ✓ | | Platform manages focus appearance |
| Text measurement/sizing | ✓ | | Platform calculates text dimensions |
| Dynamic width adjustment | ✓ | | Platform auto-sizes based on content |
| Three-part cell structure | ✓ | | Platform provides text/stroke/discharge |
| **Settings & Configuration** |
| Font settings (family, size, style) | ✓ | | Platform manages typography |
| Keyboard shortcut customization | ✓ | | Platform allows rebinding |
| Empty cell width setting | ✓ | | Platform configuration |
| Tab management | ✓ | | Platform handles multiple proofs |
| Tab naming (Untitled Proof N) | ✓ | | Platform auto-names documents |
| **Smart Behaviors** |
| Cell removal with focus management | ✓ | | Platform handles deletion flow |
| Child promotion on parent delete | ✓ | | Platform restructures tree |
| Batch property update optimization | ✓ | | Platform batches UI updates |
| Position update threshold | ✓ | | Platform avoids micro-updates |
| **Future Features** |
| Collaboration infrastructure | ✓ | | Platform provides multi-user support |
| Analysis script runtime | ✓ | | Platform executes scripts |
| Analysis script content | | ✓ | Language/users write scripts |
| Custom logic system definitions | | ✓ | Language defines new systems |

## Key Clarifications from Documentation

### Branch vs Connect Operations
Based on philosopher's notes and documentation:
- **Branch from selected string**: User selects text in a premise/conclusion and creates a new atomic argument that uses that string
- **Create independent**: User can also create completely independent argument trees
- **Key insight**: "Branching" is about string reuse, not parent-child relationships

**Important Note**: The alpha implementation only supported single conclusions and didn't have true branching from strings. Our design must support both string-based branching and independent tree creation.

### Position Management
- **Trees** have stored positions in documents
- **Individual atomic arguments** have computed positions based on tree structure
- Platform allows manual override of both

### Validation Architecture
- Platform provides real-time validation infrastructure (as-you-type)
- Platform renders validation indicators (colors, underlines)
- Language determines what is valid/invalid
- Language provides error messages and fixes

### Export/Import
- Platform provides export mechanism
- Language determines how logical notation renders in exports
- Language can provide custom export formats

## Design Principles

1. **Platform is dumb about logic** - It stores and displays but doesn't understand
2. **Languages are smart about logic** - They validate, suggest, and guide
3. **Platform owns persistence** - Files, undo, basic operations
4. **Languages own semantics** - What things mean and how they relate
5. **Platform provides tools** - Canvas, text editing, selection
6. **Languages use tools** - To implement their specific logic system
7. **Platform handles mechanics** - How to create connections
8. **Languages handle meaning** - Whether connections are valid

## Alpha Implementation Insights

### Features Worth Preserving
- Three-part cell structure (text, stroke/implication line, discharge)
- Keyboard-centric navigation with Shift modifier for "create and navigate"
- Smart deletion with focus management
- Tab-based proof management
- LaTeX-style escape sequences for symbols
- Dynamic text sizing and empty cell placeholders

### Critical Differences from Alpha
- **Multi-conclusion support**: Alpha only supported single conclusions, affecting navigation and data model
- **Connection creation**: Alpha used parent-child tree structure, we need proper DAG connections
- **Branch operation meaning**: Alpha didn't have true branching, just parent-child creation
- **Discharge purpose**: Still unclear from alpha - might be for assumption tracking