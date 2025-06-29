# Custom Characters and Fonts

## Overview

Proof Editor supports custom characters and fonts to accommodate diverse logical notation systems. Users can define keybindings and escape sequences for quick character input, supporting the specialized symbols required by different logic systems.

## Core Features

### Character Definition
Define custom characters with:
- Unicode symbol
- Descriptive name
- Keybinding or escape sequence
- Category for organization
- Optional font specification

### Input Methods
1. **Escape Sequences**: Type `\vdash` → automatically converts to `⊢`
2. **Keyboard Shortcuts**: Press configured key combination
3. **Character Palette**: Visual picker for all defined characters
4. **Direct Unicode**: Paste or input Unicode directly

## Configuration Levels

### User-Level Configuration
Personal character preferences in `~/.proof-editor/characters.json`:

```json
{
  "characters": [
    {
      "symbol": "∀",
      "name": "forall",
      "keybinding": "\\forall",
      "shortcut": "Alt+A",
      "category": "quantifiers"
    },
    {
      "symbol": "∃",
      "name": "exists",
      "keybinding": "\\exists",
      "shortcut": "Alt+E",
      "category": "quantifiers"
    }
  ],
  "autoReplace": true,
  "showSuggestions": true
}
```

### Package-Level Configuration
Character definitions are distributed through language packages and imports. Languages define their own character sets, and proof files can import these definitions:

```yaml
# In a .proof file
imports:
  - modal-logic@^1.0.0  # Brings in modal logic characters
```

Package character configuration (in package manifest):
```json
{
  "characters": [
    {
      "symbol": "◇",
      "name": "possibly",
      "keybinding": "\\diamond",
      "font": "ModalLogicSymbols",
      "category": "modal"
    }
  ]
}
```

## Character Categories

Standard categories for organization:
- **logical**: Basic logical operators (∧, ∨, ¬, →, ↔)
- **quantifiers**: Universal and existential (∀, ∃)
- **modal**: Modal operators (□, ◇)
- **temporal**: Temporal logic (○, ◊, □, U)
- **proof**: Proof notation (⊢, ⊨, ⊥)
- **set**: Set theory (∈, ⊆, ∪, ∩)
- **custom**: User-defined categories

## Font Management

### Loading Custom Fonts

```json
{
  "fonts": [
    {
      "name": "LogicSymbols",
      "url": "./fonts/logic-symbols.woff2",
      "fallback": "system-ui"
    }
  ]
}
```

### Font Application
- Per-character font specification
- Fallback chains for compatibility
- Automatic font loading on demand
- Cache management for performance

## Input Experience

### Escape Sequence Recognition
As users type, the system recognizes escape sequences:

```
User types: "P \vdash Q"
           ↓ (real-time conversion)
Display:   "P ⊢ Q"
```

### Autocomplete Suggestions
When typing `\`:
```
\v
├── \vdash    ⊢  (turnstile)
├── \vDash    ⊨  (models)
└── \vec      →  (vector arrow)
```

### Character Palette
Quick access panel showing:
- Recently used characters
- Categorized character grid
- Search by name or symbol
- Click to insert

## Implementation Details

### Character Input Pipeline
1. **Keystroke Detection**: Monitor for escape sequences
2. **Pattern Matching**: Identify complete sequences
3. **Replacement**: Substitute with Unicode symbol
4. **Undo Support**: Allow reverting to escape sequence

### Performance Considerations
- Lazy load character definitions
- Cache compiled patterns
- Debounce autocomplete
- Limit suggestion count (default: 10)

### Storage Format
Characters are stored as Unicode strings within statements:
```yaml
# Characters appear naturally in proof content
- ["∀x (P(x) → Q(x))", "P(a)"]: ["Q(a)"]
```

### Integration with Statement Matching
Custom characters are integral to the connection model:
- **Uniqueness preserved**: "P ⊢ Q" and "P ├ Q" are different strings
- **Exact matching**: Connections require identical strings including characters
- **Visual consistency**: Characters display identically across all occurrences

Example showing character impact on connections:
```yaml
# These connect (implicit matching)
- ["P ⊢ Q", "Q ⊢ R"]: ["P ⊢ R"]
- ["P ⊢ R", "R ⊢ S"]: ["P ⊢ S"]  # "P ⊢ R" matches exactly

# These don't connect (different symbols)
- ["P ├ Q", "Q ├ R"]: ["P ├ R"]
- ["P ⊢ R", "R ⊢ S"]: ["P ⊢ S"]  # "P ├ R" ≠ "P ⊢ R"
```

## Common Character Sets [LSP]

### Propositional Logic [LSP]
```json
[
  { "symbol": "¬", "keybinding": "\\neg", "name": "negation" },
  { "symbol": "∧", "keybinding": "\\land", "name": "conjunction" },
  { "symbol": "∨", "keybinding": "\\lor", "name": "disjunction" },
  { "symbol": "→", "keybinding": "\\to", "name": "implication" },
  { "symbol": "↔", "keybinding": "\\iff", "name": "biconditional" }
]
```

### Predicate Logic [LSP]
```json
[
  { "symbol": "∀", "keybinding": "\\forall", "name": "universal" },
  { "symbol": "∃", "keybinding": "\\exists", "name": "existential" },
  { "symbol": "λ", "keybinding": "\\lambda", "name": "lambda" }
]
```

### Modal Logic [LSP]
```json
[
  { "symbol": "□", "keybinding": "\\box", "name": "necessarily" },
  { "symbol": "◇", "keybinding": "\\diamond", "name": "possibly" },
  { "symbol": "○", "keybinding": "\\circ", "name": "next" }
]
```

## Platform Considerations

### Cross-Platform Compatibility
- Use standard Unicode symbols
- Provide font fallbacks
- Test on multiple operating systems
- Document platform-specific shortcuts

### Accessibility
- Screen reader friendly names
- High contrast mode support
- Keyboard-only navigation
- Character descriptions for clarity

## Configuration UI

### Character Manager Interface
- Add/edit/remove characters
- Import/export character sets
- Test input methods
- Preview with different fonts

### Settings Organization
```
Proof Editor Settings
├── Editor
│   ├── Characters
│   │   ├── Enabled Sets
│   │   ├── Auto-Replace
│   │   └── Custom Definitions
│   └── Fonts
│       ├── Custom Fonts
│       └── Fallback Chain
```

## Best Practices

### Character Selection
- Use standard Unicode when possible
- Provide intuitive keybindings
- Follow LaTeX conventions where applicable
- Keep sets focused (5-10 characters)

### Keybinding Design
- Escape sequences: match LaTeX/common usage
- Shortcuts: avoid conflicts with system/editor
- Mnemonics: easy to remember
- Consistency: similar patterns for related symbols

### Documentation
- Include character reference card
- Provide input method examples
- Document font requirements
- Show rendered examples

## Troubleshooting

### Common Issues
1. **Character not displaying**: Check font support
2. **Keybinding conflict**: Review shortcut assignments
3. **Escape sequence not working**: Verify configuration loaded
4. **Performance lag**: Reduce autocomplete delay

### Debug Mode
Enable character input debugging:
```json
{
  "debug": {
    "characterInput": true,
    "showKeyCodes": true
  }
}
```

## Future Enhancements

### Planned Features
- Composite character support (e.g., ⊢ with subscripts)
- Character macros for complex notation
- Touch bar support on macOS
- Voice input for accessibility
- AI-powered symbol suggestions

### Community Contributions
- Shared character set repository
- Voting on standard sets
- User-submitted fonts
- Notation style guides