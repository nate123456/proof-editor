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

**Quick Example**:
```yaml
# In .proof file
customCharacters:
  - symbol: "⊢"
    name: "turnstile"
    keybinding: "\\vdash"
```

**Impact on Ordered Sets**:
- Characters are part of string identity
- "P ⊢ Q" and "P ├ Q" are different ordered sets
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
packages:
  required:
    - "modal-logic-starter@^1.0.0"
  recommended:
    - "advanced-modal@^2.0.0"
```

## Security and Offline Considerations

### Security
- Sandboxed script execution
- Limited API access
- User permission prompts
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
1. Create `proof-package.json`
2. Add configurations and resources
3. Test locally
4. Push to GitHub
5. Share URL with others

## Development Phases

- **Phase 1**: Basic custom character support in standalone app
- **Phase 2**: Full package system with VS Code integration

This ensures core functionality is available early while the complete ecosystem develops in Phase 2.