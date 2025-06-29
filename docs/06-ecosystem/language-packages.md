# Language Package Ecosystem

## Overview

Language packages are the core extensibility mechanism for Proof Editor's logical reasoning capabilities. Each language package provides a complete Language Server Protocol (LSP) implementation that enables validation, analysis, and intelligent assistance for a specific logical system. Languages are distributed as self-contained packages containing LSP servers and validation rules.

## What is a Language Package?

A language package contains:
- **LSP Server**: The core intelligence engine for the logical language
- **Language Specification**: Formal definition of capabilities and configuration
- **Validation Rules**: Logic-specific inference and consistency rules
- **Examples**: Sample proofs demonstrating the language
- **Documentation**: Usage guides and reference materials
- **Platform Binaries**: Pre-built executables for different platforms

## Language Package vs Regular Package

| Feature | Language Package | Regular Package |
|---------|-----------------|-----------------|
| Primary Purpose | Define logical system & validation | Add features, themes, tools |
| LSP Server | Required | Optional |
| Proof File Integration | Via `language:` field | Via `packages:` field |
| Hot-swappable | Yes | No |
| Version Constraints | Semantic versioning enforced | Flexible versioning |
| Security | Sandboxed execution | Script permissions |

## Creating a Language Package

### Basic Structure

```
my-logic-language/
├── language-spec.yaml     # REQUIRED: Language specification
├── README.md             # REQUIRED: Documentation
├── LICENSE               # REQUIRED: License file
├── package.json          # For Node.js-based servers
├── server/
│   ├── server.js         # LSP server implementation
│   ├── server.exe        # Windows binary
│   ├── server-mac        # macOS binary
│   └── server-linux      # Linux binary
├── validation/
│   ├── rules/            # Validation rule definitions
│   └── schemas/          # JSON schemas for configuration
├── examples/
│   ├── basic/            # Beginner examples
│   ├── advanced/         # Complex proofs
│   └── tutorials/        # Step-by-step guides
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test data
└── docs/
    ├── api.md            # LSP API documentation
    ├── configuration.md  # Configuration guide
    └── migration.md      # Version migration guide
```

### Language Specification (language-spec.yaml)

```yaml
# Required metadata
name: "temporal-logic"
version: "1.0.0"
description: "Linear Temporal Logic (LTL) for formal verification"
author: "Formal Methods Lab"
homepage: "https://github.com/formal-methods/temporal-logic-lsp"
license: "MIT"

# LSP server configuration
lsp:
  # Desktop configuration
  desktop:
    command: ["node", "server/server.js"]
    args: ["--stdio"]
    transport: "stdio"
    
  # Mobile/web configuration  
  mobile:
    transport: "websocket"
    service: "wss://api.formal-methods.com/temporal-logic"
    fallback:
      transport: "http"
      endpoint: "https://api.formal-methods.com/temporal-logic/validate"
      
  # Platform binaries (optional, for better performance)
  binaries:
    darwin-arm64: "server/server-mac-arm64"
    darwin-x64: "server/server-mac-x64"
    linux-x64: "server/server-linux"
    win32-x64: "server/server.exe"

# Language capabilities
capabilities:
  # Standard LSP capabilities
  textDocument:
    completion: true
    hover: true
    definition: true
    references: true
    documentSymbol: true
    codeAction: true
    diagnostic: true
    
  # Proof-specific capabilities
  proofCapabilities:
    - "proof/validateTemporal"
    - "proof/checkLiveness"
    - "proof/checkSafety"
    - "proof/generateCounterexample"
    - "proof/ltlToAutomaton"

# Dependencies
dependencies:
  # Base languages this extends
  languages:
    propositional-logic: "^2.0.0"
    
  # Runtime requirements
  runtime:
    node: ">=16.0.0"
    
  # Optional tool dependencies
  tools:
    z3-solver: "^4.8.0"  # For counterexample generation

# Configuration schema
configuration:
  properties:
    temporalLogic.semantics:
      type: "string"
      enum: ["finite-trace", "infinite-trace"]
      default: "infinite-trace"
      description: "Trace semantics for temporal operators"
      
    temporalLogic.operators:
      type: "object"
      properties:
        next:
          type: "string"
          default: "X"
        until:
          type: "string"
          default: "U"
        globally:
          type: "string"
          default: "G"
        finally:
          type: "string"
          default: "F"
          
    temporalLogic.strictMode:
      type: "boolean"
      default: true
      description: "Enforce strict temporal logic syntax"

# Validation rules
validation:
  # Built-in rule categories
  categories:
    - id: "temporal-operators"
      name: "Temporal Operator Rules"
      rules:
        - "next-definition"
        - "until-expansion"
        - "globally-finally-duality"
        
    - id: "fairness"
      name: "Fairness Constraints"
      rules:
        - "weak-fairness"
        - "strong-fairness"
        
  # Custom validation scripts
  customValidators:
    - "validation/rules/custom-temporal.js"
    - "validation/rules/fairness-checker.js"

# Example documents
examples:
  categories:
    - name: "Basic Temporal Logic"
      description: "Introduction to temporal operators"
      examples:
        - file: "examples/basic/always-eventually.proof"
          title: "Always Eventually Pattern"
        - file: "examples/basic/response-pattern.proof"
          title: "Request-Response Pattern"
          
    - name: "Verification Examples"
      description: "Real-world verification scenarios"
      examples:
        - file: "examples/advanced/mutex-verification.proof"
          title: "Mutual Exclusion Verification"
        - file: "examples/advanced/liveness-proof.proof"
          title: "Liveness Property Proof"

# Metadata for discovery
keywords: ["temporal", "ltl", "verification", "model-checking"]
category: "temporal-logics"
tags: ["formal-methods", "verification", "safety", "liveness"]
```

## Developing an LSP Server

### Basic LSP Server Structure (Node.js)

```javascript
// server/server.js
const { 
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

// Create connection
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Initialize
connection.onInitialize((params) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['\\', '□', '◇']
      },
      hoverProvider: true,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false
      },
      // Custom proof capabilities
      experimental: {
        proofCapabilities: [
          'proof/validateArgument',
          'proof/completeInference',
          'proof/analyzeStructure'
        ]
      }
    }
  };
});

// Custom proof validation request
connection.onRequest('proof/validateArgument', async (params) => {
  const { argumentId, premises, conclusions, rule, context } = params;
  
  // Perform validation logic
  const validation = await validateModalArgument(premises, conclusions, rule);
  
  return {
    valid: validation.isValid,
    diagnostics: validation.errors.map(err => ({
      range: err.range,
      severity: DiagnosticSeverity.Error,
      message: err.message,
      source: 'modal-logic'
    })),
    suggestedRules: validation.suggestions
  };
});

// Start server
documents.listen(connection);
connection.listen();
```

### [LSP] Transport Implementation

```javascript
// Transport-agnostic server initialization
const transport = process.argv.includes('--websocket') ? 'websocket' : 'stdio';
const connection = createConnection(transport);

// Server logic remains the same regardless of transport
connection.onInitialize((params) => {
  return {
    capabilities: {
      // Standard LSP capabilities
      textDocumentSync: TextDocumentSyncKind.Incremental,
      diagnosticProvider: true,
      completionProvider: true,
      // Proof-specific extensions
      experimental: {
        proofCapabilities: ['proof/validateArgument']
      }
    }
  };
});
```

## Language Inheritance and Composition

### Extending Existing Languages

```yaml
# Extended Modal Logic based on standard modal logic
name: "epistemic-modal-logic"
version: "1.0.0"
extends: "modal-logic@^1.2.0"  # Inherit from base language

# Override specific features
configuration:
  # Inherit all modal-logic config, override these:
  epistemicModal.agents:
    type: "array"
    items:
      type: "string"
    default: ["a", "b", "c"]
    description: "Agent identifiers for knowledge operators"
    
  epistemicModal.operators:
    knowledge: "K"      # Ka φ means "agent a knows φ"
    belief: "B"         # Ba φ means "agent a believes φ"
    common: "C"         # C φ means "common knowledge of φ"

# Add new validation rules
validation:
  inheritRules: true  # Include all parent rules
  additionalRules:
    - "positive-introspection"  # Ka φ → Ka Ka φ
    - "negative-introspection"  # ¬Ka φ → Ka ¬Ka φ
```

### Composing Multiple Languages

```yaml
# Hybrid language combining features
name: "hybrid-logic"
version: "1.0.0"
composes:
  - "modal-logic@^1.2.0"
  - "temporal-logic@^2.0.0"
  - "first-order-logic@^3.0.0"

# Define composition rules
composition:
  # How to handle conflicts
  conflictResolution: "explicit"  # or "first-wins", "last-wins"
  
  # Explicit operator mappings
  operators:
    necessity: 
      from: "modal-logic"
      symbol: "□"
    eventually:
      from: "temporal-logic"
      symbol: "◇"
    forall:
      from: "first-order-logic"
      symbol: "∀"
```

## Distribution and Discovery

### Publishing to GitHub

1. **Repository Setup**
```bash
# Tag your repository
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Add topic for discovery
# Go to Settings → Topics → Add "proof-editor-language"
```

2. **Release Creation**
```yaml
# .github/workflows/release.yml
name: Release Language Package
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build binaries
        run: npm run build:all-platforms
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          files: |
            dist/language-package.tar.gz
            dist/server-*
```

### Language Registry Entry

```json
// In proof-editor/language-registry repo
{
  "languages": [
    {
      "name": "temporal-logic",
      "description": "Linear Temporal Logic for verification",
      "source": "github:formal-methods/temporal-logic-lsp",
      "author": "Formal Methods Lab",
      "version": "1.0.0",
      "verified": true,
      "categories": ["temporal", "verification"],
      "downloads": 1523,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Best Practices

### Version Management

1. **Semantic Versioning**
   - MAJOR: Breaking changes to validation rules or API
   - MINOR: New features, backward compatible
   - PATCH: Bug fixes, performance improvements

2. **Migration Support**
   ```yaml
   # migration/1.0.0-to-2.0.0.yaml
   migrations:
     - type: "rule-rename"
       old: "modal-ponens"  # Typo fix
       new: "modus-ponens"
     - type: "config-change"
       path: "modalLogic.strict"
       transform: "value ? 'strict' : 'permissive'"
   ```

### Performance Optimization

1. **Lazy Loading**
   ```javascript
   // Only load heavy dependencies when needed
   let z3Solver;
   function getZ3Solver() {
     if (!z3Solver) {
       z3Solver = require('z3-solver');
     }
     return z3Solver;
   }
   ```

2. **Caching**
   ```javascript
   const validationCache = new Map();
   function validateArgument(premises, conclusions, rule) {
     const key = JSON.stringify({ premises, conclusions, rule });
     if (validationCache.has(key)) {
       return validationCache.get(key);
     }
     const result = performValidation(premises, conclusions, rule);
     validationCache.set(key, result);
     return result;
   }
   ```

### Security Guidelines

1. **Sandboxing**
   ```javascript
   // Run validation in isolated context
   const vm = require('vm');
   const sandbox = {
     premises: premises,
     conclusions: conclusions,
     validate: sandboxedValidate
   };
   const script = new vm.Script(userValidationCode);
   const context = vm.createContext(sandbox);
   script.runInContext(context, { timeout: 5000 });
   ```

2. **Input Validation**
   ```javascript
   function validateInput(input) {
     // Sanitize user input
     if (input.length > MAX_INPUT_LENGTH) {
       throw new Error('Input too large');
     }
     if (!isValidLogicalFormula(input)) {
       throw new Error('Invalid formula syntax');
     }
     return sanitize(input);
   }
   ```

## Mobile-Specific Language Packages

### Lightweight Mobile Variants

```yaml
# Modal Logic Mobile variant
name: "modal-logic-mobile"
version: "1.0.0"
variant-of: "modal-logic"

# Mobile optimizations
mobile:
  # Use remote validation service
  validation:
    mode: "remote"
    endpoint: "https://api.logictools.com/modal/validate"
    cacheStrategy: "aggressive"
    
  # Reduced feature set for performance
  features:
    completion: "basic"      # Simple completions only
    hover: true             # Keep hover for learning
    diagnostics: "on-save"  # Only validate on save
    analysis: false         # Disable heavy analysis
    
  # Offline support
  offline:
    bundledRules: true      # Include basic rules
    cachedExamples: true    # Cache example validations
    degradedMode: true      # Allow basic editing
```

### Progressive Enhancement

```yaml
# Language with progressive features
capabilities:
  core:
    # Always available (even offline)
    - "basic-validation"
    - "syntax-highlighting"
    - "simple-completion"
    
  enhanced:
    # Available with connection
    - "proof/validateArgument"
    - "proof/completeInference"
    - "advanced-diagnostics"
    
  premium:
    # Requires subscription/API key
    - "proof/generateCounterexample"
    - "proof/automatedProver"
    - "proof/verifyLarge"
```

## Testing Language Packages

### Test Suite Structure

```
tests/
├── unit/
│   ├── parser.test.js         # Parser tests
│   ├── validator.test.js      # Validation logic tests
│   └── rules.test.js          # Individual rule tests
├── integration/
│   ├── lsp-protocol.test.js   # LSP communication tests
│   ├── validation.test.js     # End-to-end validation
│   └── performance.test.js    # Performance benchmarks
└── fixtures/
    ├── valid-proofs/          # Valid proof examples
    ├── invalid-proofs/        # Invalid proof examples
    └── edge-cases/            # Edge case scenarios
```

### Compliance Testing

```javascript
// Test LSP compliance
describe('LSP Compliance', () => {
  test('responds to initialize request', async () => {
    const response = await client.sendRequest('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {}
    });
    expect(response.capabilities).toBeDefined();
    expect(response.capabilities.textDocumentSync).toBeDefined();
  });
  
  test('handles proof validation request', async () => {
    const response = await client.sendRequest('proof/validateArgument', {
      premises: ['□P', 'P → Q'],
      conclusions: ['□Q'],
      rule: 'modal-modus-ponens'
    });
    expect(response.valid).toBe(false); // Invalid inference
    expect(response.diagnostics).toHaveLength(1);
  });
});
```

## Language Package Marketplace (Future)

### Discovery Features
- Search by capability (e.g., "temporal reasoning")
- Filter by verification status
- Sort by downloads/ratings
- Category browsing

### Quality Indicators
- Verification badge (reviewed by community)
- Test coverage percentage
- Performance benchmarks
- User ratings and reviews
- Active maintenance status

### Installation Analytics
- Download counts
- Version adoption rates
- Platform distribution
- Error reporting (opt-in)

## Troubleshooting

### Common Issues

1. **Server Won't Start**
   ```bash
   # Check binary permissions
   chmod +x server/server-linux
   
   # Test standalone
   ./server/server-linux --version
   ```

2. **Validation Timeout**
   ```yaml
   # Increase timeout in language spec
   lsp:
     desktop:
       timeout: 30000  # 30 seconds
   ```

3. **Version Conflicts**
   ```bash
   # Clear language cache
   proof-editor --clear-language-cache
   
   # Force reinstall
   proof-editor --reinstall-language modal-logic
   ```

### Debug Mode

```javascript
// Enable debug logging
if (process.env.PROOF_EDITOR_DEBUG) {
  connection.console.log('Debug: Validating argument', params);
}

// Performance profiling
const start = process.hrtime();
const result = validate(params);
const [seconds, nanoseconds] = process.hrtime(start);
connection.telemetry.logEvent({
  name: 'validation-performance',
  duration: seconds * 1000 + nanoseconds / 1000000
});
```