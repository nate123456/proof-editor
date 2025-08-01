# Add Graph Caching Infrastructure

## Context
The current graphology integration rebuilds the entire graph for each query operation, which is inefficient for LSP real-time requirements (<50ms response times).

## Problem
- `ProofGraphAdapter` creates new `DirectedGraph` instance for each operation
- No caching mechanism for frequently accessed graph structures
- LSP queries suffer from repeated graph construction overhead

## Task
Create a caching layer for graph instances to improve query performance.

## Files to Modify
- `src/infrastructure/graph/ProofGraphAdapter.ts`
- Create new file: `src/infrastructure/graph/GraphCacheManager.ts`

## Acceptance Criteria
1. Graph instances are cached and reused across operations
2. Cache invalidation when tree structure changes
3. Memory-efficient cache with configurable limits
4. Thread-safe cache operations
5. Maintains existing API compatibility
6. Result pattern used consistently

## Implementation Steps
1. Create `GraphCacheManager` class with cache key strategy
2. Implement cache invalidation logic based on tree changes
3. Update `ProofGraphAdapter` to use cached graphs
4. Add cache hit/miss metrics for monitoring
5. Configure cache size limits and eviction policy

## Expected Changes
- New `GraphCacheManager` infrastructure service
- `ProofGraphAdapter` uses cached graph instances
- Significant performance improvement for repeated queries
- Cache invalidation on tree modifications

## Cache Key Strategy
- Use tree ID + version/timestamp for cache keys
- Invalidate on any tree structure changes
- Consider statement changes that affect connections

## Performance Targets
- 80%+ cache hit rate for typical LSP workflows
- <10ms graph access time for cached instances
- Memory usage under 100MB for typical use cases

## Coordination Points
- **Task 07**: Incremental updates will use cache invalidation hooks
- **Task 08a**: LSP position mapping may need cached position data
- **Task 09**: Performance monitoring will track cache metrics

## Validation Commands
```bash
# Verify cache manager created
ls src/infrastructure/graph/GraphCacheManager.ts && echo "✅ Cache manager created"

# Verify cache integration in adapter
grep -r "GraphCacheManager" src/infrastructure/graph/ProofGraphAdapter.ts && echo "✅ Cache integration found"

# Run performance tests
npm test -- --grep "cache.*performance"

# Check memory usage
npm run test:memory || echo "⚠️  Memory tests not available"
```

## Notes
- Focus on read-heavy LSP query patterns
- Don't optimize for write-heavy scenarios initially
- Keep cache logic separate from graph algorithms
- Design cache invalidation hooks for incremental updates