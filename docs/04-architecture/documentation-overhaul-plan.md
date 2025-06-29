# Documentation Overhaul Plan

## Overview
This plan breaks down all documentation into chunks for systematic cleanup and layer alignment.

## Chunks for Task Agents

### Chunk 1: Core Glossary and Definitions
**Files:**
- docs/03-concepts/ddd-glossary.md
- docs/03-concepts/key-terms.md
- docs/08-technical-design/technical-definitions.md

**Tasks:**
1. Add CORE, LSP, PLATFORM definitions
2. Align all terms with appropriate layer
3. Remove platform-specific assumptions
4. Ensure DDD principles are maintained

### Chunk 2: Core Concepts (CORE Layer)
**Files:**
- docs/03-concepts/proof-components.md
- docs/03-concepts/documents.md

**Tasks:**
1. Remove all VS Code references
2. Focus on pure data model
3. Clarify ordered set connections
4. Keep platform-agnostic

### Chunk 3: Language Features (LSP Layer)
**Files:**
- docs/03-concepts/language-layer.md
- docs/06-ecosystem/language-packages.md
- docs/08-technical-design/language-management.md
- docs/08-technical-design/language/lsp-integration.md
- docs/08-technical-design/language/lsp-tree-querying.md
- docs/06-ecosystem/custom-logic.md

**Tasks:**
1. Clearly separate LSP features from platform features
2. Focus on language capabilities, not UI
3. Remove platform-specific implementation details
4. Emphasize protocol and capabilities

### Chunk 4: Platform Abstraction (PLATFORM Layer)
**Files:**
- docs/08-technical-design/platform-abstraction.md
- docs/08-technical-design/platform/vs-code-integration-strategy.md
- docs/05-capabilities/ide-features.md

**Tasks:**
1. Clearly mark as PLATFORM layer
2. Show how platform features map to CORE/LSP
3. Add mobile platform considerations
4. Create adapter patterns

### Chunk 5: Capabilities and Features
**Files:**
- docs/05-capabilities/validation.md
- docs/05-capabilities/analysis.md
- docs/05-capabilities/visual-proof.md
- docs/05-capabilities/presentation.md
- docs/05-capabilities/custom-characters.md
- docs/05-capabilities/accessibility.md

**Tasks:**
1. Categorize each capability as CORE, LSP, or PLATFORM
2. Rewrite with generic descriptions first
3. Add platform-specific sections clearly marked
4. Remove VS Code assumptions

### Chunk 6: Package Ecosystem
**Files:**
- docs/06-ecosystem/packages.md
- docs/06-ecosystem/collaboration.md
- docs/06-ecosystem/customization-overview.md
- docs/06-ecosystem/domain-specific-systems.md

**Tasks:**
1. Make package system platform-agnostic
2. Separate CORE package features from PLATFORM distribution
3. Add mobile package considerations
4. Remove GitHub-only assumptions

### Chunk 7: Project Meta Documentation
**Files:**
- docs/00-PRD-v1.md
- docs/00-index.md
- docs/CLAUDE.md (in root)
- docs/04-architecture/dev-principles.md

**Tasks:**
1. Update PRD to reflect platform-agnostic architecture
2. Add layer distinctions throughout
3. Update CLAUDE.md with new principles
4. Ensure dev principles are generic

### Chunk 8: Technical Architecture
**Files:**
- docs/08-technical-design/conceptual-data-model.md
- docs/08-technical-design/proof-file-format.md
- docs/08-technical-design/core-vs-language-responsibilities.md

**Tasks:**
1. Ensure CORE layer purity
2. Remove UI/platform references
3. Focus on data structures and algorithms
4. Clarify responsibilities

### Chunk 9: Problem Space and Vision
**Files:**
- docs/01-problem-space/*.md
- docs/02-vision/*.md

**Tasks:**
1. Make vision platform-agnostic
2. Focus on logical problems, not tool limitations
3. Remove VS Code-specific benefits
4. Add multi-platform vision

### Chunk 10: Future Considerations
**Files:**
- docs/07-future/*.md

**Tasks:**
1. Make future plans platform-agnostic
2. Consider mobile-first futures
3. Remove desktop assumptions
4. Add cross-platform possibilities

## Common Cleanup Tasks for All Chunks

1. **Language Alignment:**
   - Replace "VS Code extension" with "Proof Editor"
   - Replace "extension" with "application" or "tool"
   - Replace "WebView" with "proof visualization"
   - Replace "command palette" with "command system"

2. **Layer Tagging:**
   - Add clear [CORE], [LSP], or [PLATFORM] tags to sections
   - Separate concerns clearly
   - Create platform-specific subsections where needed

3. **Repetition Removal:**
   - Consolidate duplicate definitions
   - Reference glossary for terms
   - Remove redundant explanations

4. **Conciseness:**
   - Remove verbose explanations
   - Focus on what, not how
   - Use bullet points over paragraphs
   - Remove historical context

5. **Platform Abstraction:**
   - Describe features generically first
   - Add platform examples in clearly marked sections
   - Use interface/adapter patterns
   - Consider mobile throughout