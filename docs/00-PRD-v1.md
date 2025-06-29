# Product Requirements Document: Multi-Platform Proof Editor V1

## Executive Summary

Proof Editor is a visual tool for constructing and analyzing formal logical arguments. The product delivers comprehensive proof construction capabilities through a phased approach that prioritizes user validation and iterative refinement.

### Key Innovation
Unlike traditional proof assistants that require specific logical syntax, Proof Editor is semantically neutral - it provides the structure for organizing logical arguments while allowing users (through language layers) to define what constitutes valid logic.

### Product Philosophy
- **User-Centric Design**: Every feature validated through real user workflows
- **Quality First**: Comprehensive validation ensures reliable user experience
- **Iterative Refinement**: Continuous improvement based on user feedback

### Target Users
- Logic students learning formal proof construction
- Researchers documenting logical arguments
- Philosophers developing complex reasoning chains
- Anyone needing to visualize logical relationships

## Core Concepts

### Ordered Set
A collection of statements that maintains both order and uniqueness. For example, the ordered set ["All men are mortal", "Socrates is a man"] is different from ["Socrates is a man", "All men are mortal"]. Ordered sets are the fundamental building blocks - atomic arguments reference shared ordered set objects, not individual statements.

### Atomic Argument
A logical inference consisting of:
- One premise ordered set (may be empty)
- One conclusion ordered set (may be empty)
- Optional metadata (rule name, side labels)

Crucially, atomic arguments reference the SAME ordered set object when connected - not copies.

### Connection
An implicit relationship that exists when atomic arguments share the SAME ordered set object - when the conclusion ordered set of one atomic argument IS (same reference, not copy) the premise ordered set of another. No separate connection entity needed - connections emerge from shared ordered set references.

### Argument Tree
A collection of atomic arguments connected through shared ordered sets, forming a tree-like structure of logical dependencies. While users conceptualize these as trees, the implementation allows ordered sets to be referenced by multiple atomic arguments (graph structure).

## Phase 1: Standalone Web Application

### User Stories with Test Requirements

#### 1. Creating a First Proof
**As a** logic student  
**I want to** create a simple modus ponens proof  
**So that** I can visualize the logical structure

**Acceptance Criteria:**
- Can create new proof document
- Can create atomic argument with two premises and one conclusion
- Can type logical statements using keyboard
- Can save and reload the proof

**Success Metrics:**
- Users can successfully create basic logical proofs within first use session
- Clear visual feedback guides users through proof construction process
- Keyboard shortcuts enable efficient workflow for experienced users
- Document persistence allows users to save and resume work

#### 2. Building Complex Arguments
**As a** researcher  
**I want to** branch from existing atomic arguments to create deeper proofs  
**So that** I can build complex logical chains

**Acceptance Criteria:**
- Can navigate between atomic arguments using Arrow keys without creating new elements
- Can navigate within ordered sets using Tab/Shift+Tab without modifying content
- Navigation keys can be held/repeated rapidly without accidental creation
- Creation requires explicit action: 'n' for new, 'b' for branch, 'i' for insert
- Visual feedback clearly indicates current mode (navigation vs creation)
- Ghost/preview elements shown during creation before confirmation
- Status bar shows current mode and available actions
- All creation actions are visually distinct from navigation
- Deletion always requires confirmation to prevent accidents

**Success Metrics:**
- Users can build complex multi-step logical arguments efficiently
- Clear modal distinctions prevent accidental modifications
- Preview functionality allows users to verify actions before committing
- Rapid navigation enables users to work with large proof structures

#### 3. Navigating Large Proofs
**As a** user working with complex proofs  
**I want to** pan, zoom, and jump between arguments  
**So that** I can understand the overall structure

**Acceptance Criteria:**
- Can pan canvas with mouse drag or Space+drag
- Can zoom in/out with mouse wheel or Ctrl+Plus/Minus
- Can navigate between atomic arguments with Arrow keys
- Can navigate within ordered sets with Tab/Shift+Tab
- Can jump to connected parent/child arguments with Ctrl+Up/Down
- **Can navigate to proof root from any argument with single operation**
- **Can navigate to specific ancestor levels ("grandparent", "great-grandparent")**
- **Can find all arguments that use a conclusion as premise**
- **Can trace logical dependency chains visually**
- Visual feedback shows current selection and navigation mode
- Navigation keys (Arrow, Tab) never create new elements
- Can hold/repeat navigation keys without side effects
- Status bar shows current mode and available actions
- Clear distinction between navigation (blue) and creation (green) feedback

**Success Metrics:**
- Users can efficiently navigate large proof structures without losing context
- Clear visual indicators show current location and available navigation options
- Navigation between related arguments maintains logical flow understanding
- Pan and zoom capabilities support proofs of varying complexity

#### 4. Editing and Refining
**As a** user developing a proof  
**I want to** edit Statements and rearrange arguments  
**So that** I can refine my logical reasoning

**Acceptance Criteria:**
- Can edit Statement text inline by pressing Enter or F2 on selected item
- Edit mode is visually distinct with yellow highlight and text cursor
- Can reorder items within ordered set using Alt+Up/Down
- Delete key always shows confirmation dialog before removing
- Creation actions show preview/ghost elements before committing
- Navigation actions have consistent blue visual feedback
- Mode indicator in status bar shows current action context
- Changes reflected immediately after confirmation
- Smart focus management after deletion
- Escape key consistently exits any mode

#### 5. Document Overview and Tree Management
**As a** user working with multiple argument trees  
**I want to** see an overview of all trees in my document with summaries  
**So that** I can navigate and understand my document structure

**Acceptance Criteria:**
- Can view document overview showing all argument trees
- Each tree displays name, size (number of atomic arguments), and custom fields
- Can select a tree to center view and see additional details:
  - Open premises (ordered sets not connected as premises elsewhere)
  - Open conclusions (ordered sets not connected as conclusions elsewhere)
  - Custom analysis fields
- Trees can have user-defined names
- Overview is distinct from mini-map (shows summaries, not just spatial layout)

**Success Metrics:**
- Users can quickly understand document structure through tree summaries
- Logical gaps and assumptions are clearly identified through open premise/conclusion analysis
- Efficient navigation between multiple argument trees within a document
- Overview provides meaningful analysis of proof completeness

#### 6. Enhanced Presentation Mode
**As a** presenter showing my logical reasoning  
**I want to** annotate and highlight parts of my proof during presentation  
**So that** I can guide my audience through complex arguments

**Acceptance Criteria:**
- Can enter presentation mode that hides editing tools
- Can use annotation tools to:
  - Highlight sections of the proof with color
  - Draw lines, arrows, and squiggles
  - Add temporary annotations that don't modify the proof
- Annotations are overlays that don't persist after leaving presentation mode
- Mini-map remains visible for navigation
- Clear distinction between edit mode and presentation mode (like PowerPoint)

**Success Metrics:**
- Clean presentation interface suitable for teaching and demonstration
- Annotation capabilities enhance explanation of complex logical relationships
- Temporary overlay system maintains proof integrity during presentation
- Easy transition between editing and presentation modes


### Phase 1 Functional Requirements

#### Keyboard Shortcuts

##### Navigation Actions (Read-Only - Never Creates or Modifies)
**Between Atomic Arguments:**
- **Arrow Keys**: Move selection between atomic arguments
- **Ctrl+Up/Down**: Jump to connected parent/child arguments
- **Home/End**: Jump to first/last argument in current tree
- **Ctrl+Shift+R**: Navigate to proof root (ultimate source)
- **Ctrl+Shift+1/2/3**: Navigate to specific ancestor level (parent/grandparent/great-grandparent)
- **Ctrl+Shift+P**: Find all arguments that use this conclusion as premise
- **Ctrl+Shift+C**: Find all conclusions that use this premise

**Within Ordered Sets:**
- **Tab/Shift+Tab**: Move forward/backward between items in ordered set
- **Up/Down** (when in ordered set): Move between premise and conclusion sets
- **Ctrl+Home/End** (in ordered set): Jump to first/last item

**Canvas Navigation:**
- **Space+Drag**: Pan canvas
- **Mouse Wheel**: Zoom in/out
- **Ctrl+Plus/Minus**: Zoom in/out (keyboard)
- **Ctrl+0**: Reset zoom to 100%
- **Ctrl+Shift+F**: Open ProofPath query builder
- **Ctrl+Shift+T**: Show dependency trail for selected argument
- **Ctrl+Shift+O**: Find proof origins across document

##### Creation Actions (Require Deliberate Intent)
**Creating Atomic Arguments:**
- **n**: Create new independent atomic argument
- **b**: Branch from selected atomic argument (creates connected child)
- **Shift+b**: Create parent for selected atomic argument

**Adding to Ordered Sets:**
- **i**: Insert mode - add new item at cursor position
- **a**: Append mode - add new item after current item
- **Shift+Enter**: Add new item below (in ordered set)
- **Ctrl+Shift+Enter**: Add new item above (in ordered set)

**Visual Creation Indicators:**
- Creation actions show green preview/ghost element
- Confirmation required for destructive actions
- Clear visual distinction from navigation

##### Editing Actions
**Modifying Content:**
- **Enter**: Edit selected item text inline
- **F2**: Alternative edit command (VS Code standard)
- **Alt+Up/Down**: Reorder items within ordered set
- **Ctrl+D**: Duplicate selected atomic argument

**Deletion (Always Requires Confirmation):**
- **Delete**: Delete selected item/argument (shows confirmation)
- **Backspace**: Alternative delete (shows confirmation)
- **Ctrl+Shift+K**: Delete entire ordered set (shows confirmation)

**General:**
- **Escape**: Cancel current operation/exit any mode
- **Ctrl+Z/Y**: Undo/Redo
- **Ctrl+S**: Save document

##### Visual Feedback System
**Mode Indicators:**
- **Navigation Mode**: Blue outline, cursor icon
- **Insert Mode**: Green outline, plus icon, ghost preview
- **Edit Mode**: Yellow outline, text cursor
- **Selection**: Solid blue background
- **Hover**: Light blue highlight
- **Delete Pending**: Red outline with confirmation dialog

**Status Bar:**
- Shows current mode (Navigation/Insert/Edit)
- Shows current selection context
- Shows available actions for current selection

#### Core Capabilities

**Proof Construction**
- Create and manage logical argument structures
- Build complex multi-step reasoning chains
- Maintain logical connections between related arguments
- Support for various proof methodologies and logical systems

**Visual Proof Editing**
- Interactive canvas for constructing and viewing proofs
- Visual representation of logical relationships
- Intuitive navigation through complex argument structures
- Layout management for readable proof presentation

**Document Management**
- Persistent storage of proof documents
- Support for multiple argument trees per document
- Import and export capabilities for sharing work
- Auto-save functionality to prevent data loss

**Presentation and Analysis**
- Clean presentation mode for teaching and demonstration
- Annotation capabilities for highlighting key elements
- Document overview for understanding proof structure
- Analysis tools for identifying logical gaps and assumptions

**Customization and Extensibility**
- Support for specialized logical notation and symbols
- Configurable character input methods
- User-defined validation rules and analysis scripts
- Package system for sharing configurations and templates

## Architecture: Core Platform vs Language Features

The Proof Editor architecture follows a three-layer design that enables 90%+ code reuse across platforms:

### Layer 1: Core Business Logic [CORE]

Platform-agnostic TypeScript that works identically everywhere:

#### Structure & Data Management
- **Ordered Set Management**: Creation, editing, and reference tracking of ordered sets
- **Atomic Argument Structure**: Storage and manipulation of premise/conclusion relationships
- **Connection Model**: Implicit connections through shared ordered set references
- **Document Organization**: Multiple argument trees per document with spatial positioning
- **File Format**: YAML-based persistence of proof structures

#### User Interaction
- **Navigation System**: Movement between atomic arguments and within ordered sets
- **Selection Management**: Tracking focus on arguments, sets, and individual items
- **Creation vs Navigation**: Clear modal distinction with visual feedback
- **Keyboard Shortcuts**: Structural navigation and editing commands
- **Mouse Interactions**: Pan, zoom, click, and drag operations

#### Visualization
- **Visual Proof Display**: Clear representation of atomic arguments and logical connections
- **Intelligent Layout**: Automatic positioning with user override capabilities
- **Navigation Aids**: Overview tools for understanding document structure
- **Presentation Mode**: Clean view optimized for teaching and demonstration
- **Interactive Feedback**: Clear indicators for user actions and system state

#### Platform Features
- **Extension System**: Support for specialized proof languages and notation systems
- **Character Input**: Efficient methods for entering specialized logical symbols
- **IDE Integration**: Seamless integration with development environments
- **Version Control**: Comprehensive undo/redo for all user operations
- **Performance**: Responsive user experience across proof complexity ranges

### Layer 2: Language Server Protocol [LSP]

Language-specific features provided through LSP (works on all platforms):

#### Validation & Logic
- **Syntax Validation**: What constitutes valid logical notation?
- **Semantic Validation**: Are the inferences logically valid?
- **Inference Rule Checking**: Which rules of inference are allowed?
- **Completeness Checking**: Are all required steps present?
- **Consistency Verification**: Do statements contradict?

#### Intelligence Features
- **Auto-completion**: Suggestions for logical expressions based on context
- **Hover Information**: Explanations of rules, symbols, and theorems
- **Go-to-Definition**: Navigation to referenced theorems or definitions
- **Find-All-References**: Locate all uses of a statement or theorem
- **Quick Fixes**: Automated corrections for common errors

#### Language Definitions
- **Symbol Interpretations**: What do custom characters mean in this logic?
- **Valid Constructs**: Which logical forms are permitted?
- **Proof Strategies**: Language-specific tactics and approaches
- **Analysis Scripts**: Custom validation and transformation rules
- **Export Formats**: Language-specific output generation

#### Visual Customization
- **Implication Line Styles**: How to render atomic arguments (lines, turnstiles, etc.)
- **Layout Preferences**: Default arrangement of premises and conclusions
- **Connection Visualization**: How to show relationships between arguments
- **Error Highlighting**: Which elements to mark as problematic
- **Side Label Formatting**: How to display rule names and metadata

### Layer 3: Platform Integration [PLATFORM]

Thin platform-specific adapters for each environment:

#### Desktop (VS Code Extension)
- Leverages VS Code's file management, settings, and UI
- Uses stdio transport for LSP communication
- Inherits enterprise features (source control, themes, etc.)
- Command palette and keyboard shortcut integration

#### Mobile (Native Apps)
- Touch-optimized UI with gesture support
- WebSocket transport for LSP communication
- Offline-first architecture with local storage
- Platform-specific features (share sheets, biometric auth)

#### Web (Browser-Based)
- Progressive Web App with offline support
- WebSocket transport for cloud-based LSP
- Browser storage APIs for persistence
- Responsive design for various screen sizes

### Integration Architecture

The three-layer architecture ensures maximum code reuse:

1. **Core Logic (90%+)**: Structure, storage, navigation, and editing logic
2. **LSP Layer**: Validation, intelligence, and language features (platform-agnostic)
3. **Platform Layer (<10%)**: UI rendering, file I/O, and platform-specific features
4. **Unified Experience**: Same logical capabilities across all platforms

This separation ensures that:
- New proof languages can be added without modifying the core platform
- Language features can evolve independently
- Users get consistent structural features across all languages
- Language authors have full control over logic-specific behavior

#### Quality Assurance
- Comprehensive automated testing coverage
- User workflow validation
- Visual consistency verification
- Performance benchmarking
- High reliability standards

### Development Approach

The product development follows a structured approach that prioritizes user validation and quality:

- **Modular Design**: Clear separation between core functionality and user interface
- **Progressive Enhancement**: Initial standalone capabilities extended with IDE integration
- **User-Centric Testing**: Comprehensive validation of user workflows and experiences

This approach ensures reliable functionality and supports multiple deployment scenarios.

### Quality Validation Strategy

#### User-Centric Validation
- End-to-end validation of complete user workflows
- Comprehensive testing of user interactions and edge cases
- Visual consistency verification across different scenarios
- Performance validation under realistic usage conditions

#### Multi-Layer Validation
- Core functionality validation independent of user interface
- Integration testing of component interactions
- Complete user journey testing from start to finish

This comprehensive approach ensures reliable user experiences and maintains product quality across all features.

## Phase 2: Multi-Platform Expansion

### Additional User Stories

#### 5. Cross-Platform File Management
**As a** user on any platform  
**I want to** manage .proof files with platform-native tools  
**So that** I can use familiar workflows

**Acceptance Criteria:**
- Desktop: VS Code integration with explorer, tabs, and source control
- Mobile: Native file picker, recent documents, and cloud sync
- Web: Browser file API with local storage fallback
- All platforms support import/export of .proof files

#### 6. Platform-Optimized Command Access
**As a** power user on any platform  
**I want to** quickly access proof commands  
**So that** I can work efficiently

**Acceptance Criteria:**
- Desktop: VS Code command palette with keyboard shortcuts
- Mobile: Touch-friendly command menu with gesture shortcuts
- Web: Keyboard shortcuts with on-screen command palette
- Consistent command names across all platforms

#### 7. Custom Characters and Fonts
**As a** logic professional  
**I want to** add custom characters and fonts for my specific logic system  
**So that** I can use specialized notation efficiently

**Acceptance Criteria:**
- Can define custom characters with keybindings or escape sequences
- Support for 5-10 special characters per configuration
- Configure per-user or per-document
- Custom fonts loaded and rendered correctly
- Quick character palette for insertion

**Success Metrics:**
- Users can efficiently input specialized logical notation
- Customizable character systems support diverse logical frameworks
- Per-document and per-user configuration flexibility
- Quick access to frequently used symbols and notation

#### 8. Cross-Platform Package System
**As a** user on any platform  
**I want to** share and use packages seamlessly  
**So that** I can collaborate regardless of platform

**Acceptance Criteria:**
- GitHub-based package distribution (no central registry)
- QR code sharing for mobile classroom scenarios
- Platform-appropriate installation methods:
  - Desktop: VS Code extension marketplace integration
  - Mobile: Direct GitHub links or QR codes
  - Web: URL-based package loading
- Consistent package format across all platforms
- Offline package caching on all platforms

**Success Metrics:**
- Seamless sharing of configurations and document templates
- Decentralized package distribution without infrastructure dependencies
- Automatic package dependency resolution for shared documents
- User control over package installation and customization

### Multi-Platform Development Approach

Each platform leverages its native capabilities while sharing core logic:

**Desktop (VS Code)**
- Full IDE integration with existing developer workflows
- Leverage VS Code's mature extension ecosystem
- Native file management and source control
- No need to rebuild what VS Code provides

**Mobile (iOS/Android)**
- Touch-first interface design
- Offline-first architecture
- Platform-specific sharing and collaboration
- Responsive to device constraints (battery, memory)

**Web (Browser)**
- Progressive Web App capabilities
- Works on any device with a modern browser
- Cloud storage integration options
- No installation required

### Phase 2 Functional Requirements

#### Platform Abstraction Layer
- Clean interfaces between core logic and platform code
- Platform-specific implementations behind common APIs
- Consistent behavior across all platforms
- Performance optimization per platform

#### Desktop Features (VS Code)
- Native file type support and syntax highlighting
- Full integration with VS Code workflows
- Command palette and keyboard shortcuts
- Extension marketplace integration

#### Mobile Features
- Touch-optimized interactions (pinch, swipe, long-press)
- Offline-first with background sync
- Platform sharing (iOS Share Sheet, Android Intents)
- Responsive to device orientation

#### Web Features
- Progressive enhancement for varying browser capabilities
- Local storage with cloud sync options
- Responsive design for desktop to phone
- Zero-installation usage

#### Package Management Capabilities
- Decentralized package sharing and distribution
- Automatic dependency resolution for shared documents
- Flexible configuration at user and workspace levels
- Version management and update notifications

#### Package Ecosystem
- Sharable configurations and templates
- Document collections and sample proofs
- Specialized notation and symbol definitions
- Custom validation and analysis capabilities
- Visual themes and display preferences
- Language-specific proof system support

#### Settings and Preferences
- Integration with IDE configuration management
- Synchronized settings across devices and workspaces
- Flexible configuration hierarchy from global to document-specific
- User control over automatic package loading and updates

#### IDE Integration Considerations

**Document Overview Integration**
- Native integration with IDE outline and navigation systems
- Sidebar views for proof structure browsing
- Quick access to proof elements through IDE interfaces
- Status indicators for proof validation and structure
- Command palette integration for efficient navigation

**Presentation Mode Integration**
- Full-screen presentation capabilities within the IDE
- Annotation tools for educational and demonstration purposes
- Multi-monitor support for teaching scenarios
- Session-based annotation management
- Seamless transition between editing and presentation modes

### File Format Requirements

Proof documents must support:
- Human-readable format for version control and collaboration
- Complete preservation of logical structure and relationships
- Metadata storage for visualization preferences and annotations
- Extensibility for specialized logical notation and custom fields
- Industry-standard format compatibility for interoperability

## Non-Functional Requirements

### Performance
- Responsive user experience across proof complexity ranges
- Smooth interaction with moderately complex proofs (hundreds of logical steps)
- Efficient rendering and navigation regardless of proof size
- Reasonable resource usage for typical proof construction workflows

### Quality
- High reliability with comprehensive automated validation
- Zero tolerance for data loss or logical corruption
- Consistent user experience across all supported features
- Visual consistency and accessibility compliance

### User Experience
- Intuitive learning curve for new users
- Efficient workflows for experienced users
- Clear error messages and recovery guidance
- Consistent behavior across all supported platforms

## Success Criteria

### Phase 1 Completion
- All user stories implemented with passing tests
- Cypress E2E suite covers all workflows
- Performance benchmarks met
- Standalone app deployable to web

### Phase 2 Completion
- VS Code extension published to marketplace
- Mobile apps available on iOS and Android
- Web app deployed with offline support
- 90%+ code shared between platforms
- No regressions from Phase 1
- Platform-specific documentation complete

## Development Phases

### Phase 1: Standalone Application
Deliver core proof construction capabilities through a standalone application that provides:
- Complete proof editing and visualization functionality
- All essential user workflows for individual proof construction
- Foundation for subsequent IDE integration
- Comprehensive user validation and feedback incorporation

### Phase 2: IDE Integration
Extend capabilities with professional development environment integration:
- Native file type support and IDE workflow integration
- Enhanced collaboration features through source control integration
- Command palette and keyboard shortcut integration
- Package management and sharing capabilities

## Product Principles

This product is guided by core principles that ensure user success:

- **User-Centric Design**: Every feature validated through real user workflows and feedback
- **Quality First**: Comprehensive validation ensures reliable and consistent user experiences
- **Iterative Improvement**: Continuous refinement based on user needs and usage patterns
- **Accessibility**: Inclusive design that serves users with diverse needs and technical backgrounds
- **Extensibility**: Architecture that supports growth and customization for specialized use cases

## Appendix: Key Design Decisions

### Why Phased Development?
- Enables comprehensive user validation of core functionality
- Allows for iterative improvement based on user feedback
- Reduces risk by validating user workflows before complex integration
- Provides fallback deployment option if IDE integration faces obstacles

### Why Quality-First Approach?
- Ensures reliable user experience from initial release
- Builds user confidence in the tool for critical logical reasoning work
- Enables confident feature expansion and enhancement
- Provides clear success criteria and user outcome validation