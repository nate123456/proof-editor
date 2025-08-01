# Optimize Statement Flow Analysis Performance

## Context
The statement flow edge creation in `ProofGraphAdapter` uses O(n²) nested loops to find connections between atomic arguments, which won't scale for large proof trees.

## Problem
```typescript
// Lines ~289-303 in ProofGraphAdapter.ts - O(n²) complexity
for (const arg1 of atomicArguments) {
  for (const arg2 of atomicArguments) {
    // Check for statement connections
  }
}
```

This creates performance bottlenecks for large proof documents with many atomic arguments.

## Task
Optimize statement flow analysis to use indexed lookups instead of nested loops.

## Files to Modify
- `src/infrastructure/graph/ProofGraphAdapter.ts`

## Acceptance Criteria
1. Reduce time complexity from O(n²) to O(n) or O(n log n)
2. Maintain identical functionality for statement flow detection
3. Use indexed data structures for efficient lookups
4. Preserve all existing graph edge relationships
5. No breaking changes to public API

## Implementation Steps
1. Create statement-to-argument index maps
2. Replace nested loops with indexed lookups
3. Build premise/conclusion indexes for efficient matching
4. Verify all statement flow edges are still created correctly
5. Add performance benchmarks to validate improvement

## Optimization Strategy
- Create `Map<StatementId, ArgumentId[]>` for conclusions
- Create `Map<StatementId, ArgumentId[]>` for premises
- Use set intersection for finding connections
- Index once, query many times

## Expected Changes
- Significant performance improvement for large proof trees
- More efficient memory usage patterns
- Scalable statement flow analysis
- Same graph structure output

## Performance Targets
- <100ms for 1000+ atomic arguments
- Linear time complexity relative to argument count
- Memory usage proportional to unique statements

## Notes
- Focus on the statement flow edge creation specifically
- Don't modify other graph building logic
- Keep the same graph structure and edge types
- Test with various proof tree sizes