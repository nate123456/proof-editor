# Add Graph Performance Monitoring

## Context
With the new graph caching and optimization work, we need monitoring to track performance improvements and identify bottlenecks in LSP operations.

## Problem
- No visibility into graph operation performance
- Can't measure cache hit rates or query response times
- Difficult to identify performance regressions
- No metrics for LSP response time targets

## Task
Add performance monitoring for graph operations with metrics collection and reporting.

## Files to Create
- `src/infrastructure/monitoring/GraphPerformanceMonitor.ts`
- `src/infrastructure/monitoring/PerformanceMetrics.ts`

## Files to Modify
- `src/infrastructure/graph/ProofGraphAdapter.ts`
- `src/infrastructure/graph/GraphCacheManager.ts` (if created)

## Acceptance Criteria
1. Track graph operation timings
2. Monitor cache hit/miss rates
3. Measure LSP response times
4. Performance metrics available for analysis
5. Configurable monitoring levels
6. Minimal performance overhead

## Implementation Steps
1. Create `GraphPerformanceMonitor` with timing utilities
2. Add performance metrics collection points
3. Implement cache performance tracking
4. Add LSP-specific performance metrics
5. Create performance reporting/logging

## Metrics to Track
- **Graph Operations**: Build time, query time, update time
- **Cache Performance**: Hit rate, miss rate, eviction rate
- **LSP Responses**: Query response times, operation counts
- **Memory Usage**: Graph memory consumption, cache size

## Expected Changes
- Performance monitoring infrastructure
- Metrics collection in graph operations
- Performance data available for analysis
- Configurable monitoring levels

## Performance Targets to Monitor
- Graph cache hit rate >80%
- LSP query response time <50ms
- Graph build time <100ms for typical trees
- Memory usage <100MB for normal workloads

## Integration Points
- Hook into graph operation entry/exit points
- Integrate with existing logging infrastructure
- Consider metrics export for external monitoring

## Notes
- Keep monitoring overhead minimal
- Make metrics collection optional/configurable
- Focus on actionable performance data
- Don't instrument every single operation initially