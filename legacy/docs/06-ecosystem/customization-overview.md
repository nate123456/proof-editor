# Customization and Extensibility Overview

## Quick Reference

This document provides a consolidated overview of Proof Editor's customization features based on stakeholder requirements.

## Custom Characters and Fonts

### Key Requirements (Story 4)
- **Typical Usage**: 5-10 special characters per logic system
- **Input Methods**: Keybindings and escape sequences
- **Configuration Levels**: Per-user and per-document
- **Font Support**: Custom fonts for specialized notation

### Implementation
See [Custom Characters Documentation](../05-capabilities/custom-characters.md) for full details.

Characters are defined in language packages and imported via the `imports:` field. They cannot be defined directly in proof files.

**Impact on Statement Matching**:
- Characters are part of string identity
- "P ⊢ Q" and "P ├ Q" are different statements
- Connections require exact string matches

## Package Sharing System

### Key Requirements (Story 5)
- **Distribution**: GitHub-based, no central server
- **Dependencies**: Support like Factorio mods
- **Document Integration**: Required/recommended packages
- **Profiles**: Bundle packages for use cases
- **Overrides**: User customization of package settings

### Implementation
See [Package System Documentation](./packages.md) for full details.

**Quick Example**:
```yaml
# In .proof file
imports:
  - modal-logic-starter@^1.0.0     # Required import
  - advanced-modal@^2.0.0?         # Optional import (note the ?)
```

## Security and Offline Considerations

### Security
- Sandboxed script execution with strict resource limits
- Limited API access (no file system or network access)
- Process isolation for custom language servers

**User Consent for Executable Code**:
When installing packages containing JavaScript validation rules or LSP servers, users encounter a clear consent dialog that:
- Identifies all executable components in the package
- Explains security constraints and sandboxing measures  
- Shows source verification and trust level information
- Requires explicit "Install and Trust" action to proceed
- Provides option to review package code before installation

For detailed consent processes and security enforcement, see [Language Package Security Policy](../policies/language-package-security-policy.md)
- Content Security Policy
- No network access from scripts

### Offline Support
- Full local package cache
- Automatic offline detection
- Background sync when online
- Export/import for air-gapped systems

## VS Code Integration

### Settings Storage
- User: `~/.config/Code/User/globalStorage/proof-editor/`
- Workspace: `.vscode/proof-editor-packages.json`
- Leverages VS Code's settings sync

### Package Management
- Respects VS Code proxy settings
- Integrates with extension system
- File watcher for changes
- Workspace-level configuration

## Common Use Cases

### Academic Course
1. Professor creates course package:
   - Standard notation (5-10 symbols)
   - Exercise templates
   - Validation scripts
   - UI preferences

2. Students install: `proof-editor: install github:university/logic101-fall2023`

3. Everyone has identical environment

### Research Team
1. Define domain-specific characters
2. Share validation rules
3. Maintain consistent notation
4. Allow personal preferences

### Personal Workflow
1. Configure preferred characters
2. Export as personal package
3. Sync across devices
4. Maintain in GitHub

### Personal Validation Rules
Users can define simple document-specific validation or linting rules without creating full language packages:

**Document-Level Configuration (Simple Cases)**:
```yaml
# In .proof file header
validation:
  rules:
    - name: "require_premise_justification"
      type: "warning"
      check: "premises_must_have_source_citations"
    - name: "consistent_notation" 
      type: "error"
      check: "use_standard_modal_operators"
```

**When Full Packages Are Required**:
- Custom inference rules or logical systems
- Complex JavaScript validation logic
- Shared/distributed logic systems
- LSP server functionality

This allows users to add lightweight, personal validation preferences without the overhead of formal package creation while requiring packages for substantial logical systems.

## Best Practices

### Character Design
- Use standard Unicode when available
- Follow LaTeX conventions for escape sequences
- Keep sets small and focused (5-10 characters)
- Document character meanings

### Package Development
- Use semantic versioning
- Include comprehensive examples
- Test on clean installation
- Document breaking changes
- Minimize dependencies

### Security
- Review scripts before installation
- Use trusted package sources
- Limit script permissions
- Monitor package updates
- Maintain local backups

## Quick Start Guides

### Adding Custom Characters
1. Open VS Code settings
2. Navigate to Proof Editor → Characters
3. Add character definition
4. Test with escape sequence

### Installing a Package
1. Open a .proof file with package requirements
2. Click "Install Required" when prompted
3. Or manually: `proof-editor: install <package-url>`
4. Verify installation in package manager

### Creating a Package
1. Create `package.yaml`
2. Add configurations and resources
3. Test locally
4. Push to GitHub
5. Share URL with others

## Development Phases

- **Phase 1**: Basic custom character support in standalone app
- **Phase 2**: Full package system with VS Code integration

This ensures core functionality is available early while the complete ecosystem develops in Phase 2.