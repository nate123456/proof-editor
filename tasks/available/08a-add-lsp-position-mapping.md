# Add LSP Position Mapping for Graph Operations

## Context
LSP integration requires mapping between graph node positions and text document positions. Current implementation lacks this critical bridge for real-time LSP operations.

## Problem
- Graph operations work with node IDs and logical structures
- LSP needs text positions (line, column, offset) for operations
- No mapping layer between graph coordinates and document positions
- Missing document synchronization hooks for position updates

## Task
Create position mapping infrastructure to translate between graph nodes and LSP text positions.

## Files to Create
- `src/infrastructure/lsp/PositionMapper.ts`
- `src/infrastructure/lsp/DocumentSyncHooks.ts`

## Files to Modify
- `src/infrastructure/graph/ProofGraphAdapter.ts` (add position metadata)

## Acceptance Criteria
1. Map graph node IDs to text positions (line, column, offset)
2. Support bidirectional mapping (position ↔ node)
3. Handle document changes and position updates
4. Integrate with LSP document synchronization
5. Performance <10ms for position lookups
6. Result pattern used consistently

## Implementation Steps
1. Create `PositionMapper` with node-to-position mapping
2. Add position metadata to graph nodes
3. Implement document sync hooks for position updates
4. Add bidirectional lookup methods
5. Integrate with ProofGraphAdapter
6. Add position validation and error handling

## Expected Changes
- New LSP infrastructure for position mapping
- Graph nodes include position metadata
- Document synchronization hooks
- Bidirectional position lookup capabilities

## Position Mapping Strategy
- Store text positions (line, column, offset) as node attributes
- Use document change events to update positions
- Cache position mappings for performance
- Validate position consistency on document changes

## LSP Integration Points
- Document change notifications
- Go-to-definition operations
- Hover information positioning
- Diagnostic position reporting
- Symbol location mapping

## Validation Commands
```bash
# Verify position mapping files created
ls src/infrastructure/lsp/PositionMapper.ts && echo "✅ Position mapper created"
ls src/infrastructure/lsp/DocumentSyncHooks.ts && echo "✅ Document sync hooks created"

# Run type checking
npm run typecheck

# Test position mapping functionality
npm test -- --grep "PositionMapper"
```

## Notes
- Critical for LSP real-time operations
- Must handle document changes gracefully
- Keep position metadata lightweight
- Design for future LSP feature extensions