# Add LSP Incremental Graph Updates

## Context
LSP requires real-time responsiveness (<50ms) but current implementation rebuilds entire graph for each operation. Need incremental update support for document changes.

## Problem
- Full graph reconstruction on every LSP query
- No support for partial tree invalidation
- Missing document synchronization hooks
- Performance degrades with large proof documents

## Task
Implement incremental graph updates that respond to document changes efficiently.

## Files to Modify
- `src/infrastructure/graph/ProofGraphAdapter.ts`
- Create new file: `src/infrastructure/graph/IncrementalGraphUpdater.ts`

## Dependencies
- Task 04: Graph caching infrastructure (for cache invalidation hooks)
- Task 08a: LSP position mapping (for position-aware updates)

## Acceptance Criteria
1. Graph updates apply only to changed portions of proof trees
2. Support for node addition, removal, and modification
3. Maintain graph consistency during incremental updates
4. Performance <50ms for typical LSP operations
5. Hooks for document change notifications
6. Result pattern used consistently

## Implementation Steps
1. Create `IncrementalGraphUpdater` with change detection
2. Implement delta update methods (addNode, removeNode, updateNode)
3. Add graph consistency validation after updates
4. Create change notification system
5. Update `ProofGraphAdapter` to use incremental updates

## Update Operations
- **Node Addition**: Add node and update parent/child relationships
- **Node Removal**: Remove node and reconnect graph appropriately
- **Node Modification**: Update node attributes and edge relationships
- **Statement Changes**: Update statement flow edges

## Expected Changes
- New incremental update infrastructure
- Hooks for document change events
- Significantly improved LSP response times
- Consistent graph state during updates

## Performance Targets
- <10ms for single node operations
- <50ms for complex multi-node changes
- Maintain graph consistency throughout

## LSP Integration Points
- Document change notifications
- Position mapping for text changes
- Partial validation triggers
- Progressive result delivery

## Coordination Points
- **Task 04**: Uses cache invalidation hooks for efficient updates
- **Task 08a**: Integrates with position mapping for LSP operations
- **Task 09**: Performance monitoring tracks incremental update metrics

## Validation Commands
```bash
# Verify incremental updater created
ls src/infrastructure/graph/IncrementalGraphUpdater.ts && echo "✅ Incremental updater created"

# Verify integration in adapter
grep -r "IncrementalGraphUpdater" src/infrastructure/graph/ProofGraphAdapter.ts && echo "✅ Integration found"

# Run performance tests
npm test -- --grep "incremental.*performance"

# Test LSP integration
npm test -- --grep "lsp.*incremental"
```

## Notes
- Focus on common LSP edit patterns
- Maintain backward compatibility
- Don't optimize for massive batch changes initially
- Keep graph validation logic separate
- Coordinate with cache invalidation for optimal performance