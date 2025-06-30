# Architecture Layers

## CORE Layer
Platform-agnostic business logic that represents the pure functionality of Proof Editor. This includes:
- Ordered set management
- Atomic argument structures (templates)
- Connection logic (shared ordered set references)
- Node instances (atomic arguments positioned in trees)
- Tree structure (explicit parent-child relationships)
- Argument tree discovery (maximal connected components)
- Proof document model
- Navigation algorithms
- Layout calculations
- Pure validation logic (no LSP)

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

## PLATFORM Layer
Platform-specific integrations and UI implementations:
- VS Code extension features
- React Native mobile app features
- File system operations
- Settings management
- UI/UX implementations
- Command palette integrations
- Theme handling
- Platform-specific keybindings
- Native platform features (notifications, sharing, etc.)

## Documentation Principles
1. **CORE docs**: Never mention specific platforms or UI implementations
2. **LSP docs**: Focus on language capabilities, not how they're exposed in UI
3. **PLATFORM docs**: Platform-specific guides that reference CORE/LSP features
4. **Generic first**: Describe features generically, then show platform implementations
5. **Clean separation**: No bleeding of concerns between layers