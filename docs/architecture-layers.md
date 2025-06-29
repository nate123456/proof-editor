# Architecture Layers

## CORE Layer
Platform-agnostic business logic that represents the pure functionality of Proof Editor. This includes:
- Ordered set management
- Atomic argument structures
- Connection logic (shared ordered set references)
- Tree/DAG data structures
- Proof document model
- Navigation algorithms
- Layout calculations
- Pure validation logic (no LSP)

## LSP Layer (Language Server Protocol)
Language-specific validation, analysis, and intelligence features:
- Language server lifecycle management
- Validation rule execution
- Inference completion
- Syntax checking
- Custom language capabilities
- Proof-specific LSP extensions
- Language hot-swapping
- Language package management

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