# Language Layer

See [Key Terms](./key-terms.md#language-layer) for the definition.

## [LSP] Language Server Protocol Foundation

Language layers are implemented as Language Server Protocol (LSP) servers that provide intelligent analysis and validation for specific logical systems. Each language layer:
- Parses statement content as it flows through processing units
- Validates statement transformations according to domain rules
- Provides real-time diagnostics and suggestions about statement flow
- Enables code completion and hover information for statements

## [LSP] Protocol Capabilities

Language servers provide these capabilities through standard LSP methods:

| LSP Feature | Proof-Specific Application |
|-------------|---------------------------|
| `textDocument/didChange` | Validates statements as they're entered |
| `textDocument/diagnostic` | Reports invalid statement transformations |
| `textDocument/completion` | Suggests statement content and operators |
| `textDocument/hover` | Explains statement meaning and transformation rules |
| `proof/validateArgument` | Custom validation for processing unit transformations |
| `proof/completeInference` | AI-assisted output statement generation |

## [LSP] Transport Mechanisms

Language servers communicate via transport-agnostic protocols:
- **stdio**: Process-based communication for desktop
- **WebSocket**: Network communication for mobile/web
- **HTTP**: Stateless validation services
- **TCP**: Direct socket connections

## Example Language Implementations

### Mathematical Logic Server
- **Statement Types**: Formulas with ∧, ∨, →, ¬, ∀, ∃
- **Validation**: Well-formed statement checking via LSP diagnostics
- **Completion**: Context-aware statement and operator suggestions
- **Analysis**: Statement structure and quantifier scope validation

### Natural Language Server
- **Statement Types**: Natural language propositions with connectives
- **Validation**: Grammar and coherence checking of statement content
- **Completion**: Statement phrase and connector suggestions
- **Analysis**: Statement flow and argument structure verification

### Programming Logic Server
- **Statement Types**: Code assertions with &&, ||, =>, !
- **Validation**: Statement type checking and consistency
- **Completion**: Variable and predicate suggestions for statements
- **Analysis**: Statement flow and control flow verification

## [LSP] Key Protocol Benefits

- **Statement agnostic**: Platform doesn't understand statement content, LSP servers do
- **Hot-swappable**: Change statement interpretation without closing documents
- **Extensible**: Add new statement validation rules via server updates
- **Performance**: Async statement validation doesn't block editing

Language servers make Proof Editor adaptable to any text-based formal reasoning system while maintaining consistent statement flow protocol communication.