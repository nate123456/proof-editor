# Architecture Layers

## CORE Layer
Platform-agnostic business logic that represents the pure functionality of Proof Editor. This includes:
- **Statement Flow Management**: Physical flow of statements between atomic arguments
- **Ordered Set Management**: Unique ordered collections that enable connections
- **Atomic Argument Structures**: Templates for logical inference steps
- **Connection Logic**: Implicit relationships via shared ordered set references
- **Physical Tree Structure**: Spatial positioning and layout of proof trees
- **Node Instance Management**: Specific placements of argument templates in trees
- **Tree Structure Logic**: Explicit parent-child relationships and positioning
- **Argument Tree Discovery**: Maximal connected components
- **Spatial Navigation**: 2D positioning and tree traversal algorithms
- **Layout Calculations**: Physical positioning of nodes in document space
- **Proof Document Model**: Document structure and tree organization
- **Pure Validation Logic**: Rule checking without LSP dependency

## LSP Layer (Language Server Protocol)
**JavaScript Execution Environment for Custom Logic Systems**

The LSP layer serves as a dedicated execution runtime where user-defined language code runs. This is not just validation - it's a complete custom logic execution environment:

### Core Execution Model
- **JavaScript Runtime**: Dedicated V8 Isolate per language server (sandboxed execution)
- **User Code Execution**: Runs user-defined JavaScript for logical reasoning
- **Single Language Per Proof**: One active language with inheritance support
- **Performance Target**: <10ms validation response time with hot reload capability

### Runtime Responsibilities
- Language server process lifecycle management
- JavaScript code execution and sandboxing
- Custom logic rule implementation (user-defined)
- Real-time validation and inference completion
- Language-specific syntax and symbol handling
- Hot-swapping between different logical systems
- Package loading and dependency resolution

## PLATFORM Layer (Implementation Details)
Platform adapters that handle implementation differences, not architectural concerns:
- **Statement Flow APIs**: Platform interfaces for statement flow visualization
- **Spatial Interaction APIs**: Touch/mouse interfaces for tree manipulation  
- **File System Operations**: Platform-specific file access and storage
- **Settings Management**: Platform configuration and persistence
- **UI/UX Implementations**: Platform-native rendering and interaction
- **Command Integration**: Platform command systems and shortcuts
- **Theme Handling**: Platform appearance and visual styling
- **Input Abstractions**: Mouse, keyboard, touch, and gesture handling
- **Native Platform Features**: Notifications, sharing, system integration

**Key Point**: Both VS Code and React Native provide sufficient capabilities for all requirements. Platform differences affect implementation approach ("how") rather than architectural design ("what").

## Documentation Principles
1. **CORE docs**: Never mention specific platforms or UI implementations
2. **LSP docs**: Focus on language capabilities, not how they're exposed in UI
3. **PLATFORM docs**: Platform-specific guides that reference CORE/LSP features
4. **Generic first**: Describe features generically, then show platform implementations
5. **Clean separation**: No bleeding of concerns between layers