# Improve Graph Error Handling

## Context
Current graph operations use generic error types, making it difficult to handle specific failure scenarios and provide meaningful error messages for LSP clients.

## Problem
- Generic `ProcessingError` doesn't distinguish graph-specific failures
- Poor error context for debugging graph issues
- LSP clients need specific error information
- Error handling not optimized for graph operation failures

## Task
Create specific error types for graph operations and improve error handling throughout the graph infrastructure.

## Files to Create
- `src/domain/errors/GraphErrors.ts`

## Files to Modify
- `src/infrastructure/graph/ProofGraphAdapter.ts`
- `src/infrastructure/graph/GraphCacheManager.ts` (if exists)
- `src/domain/services/ProofStrategyAnalysisService.ts` (if it uses graph operations)

## Dependencies
- Task 01: neverthrow migration (ensures consistent Result pattern for error handling)

## Acceptance Criteria
1. Specific error types for different graph failure scenarios
2. Rich error context with relevant details
3. Proper error propagation through Result pattern
4. LSP-friendly error messages
5. Maintain Result pattern consistency

## Implementation Steps
1. Create graph-specific error types
2. Update graph operations to use specific errors
3. Add error context and debugging information
4. Improve error messages for LSP scenarios
5. Update error handling in consuming services

## Error Types to Create
- `GraphConstructionError`: Issues building graph from domain data
- `GraphTraversalError`: Problems during path finding or navigation
- `GraphCacheError`: Cache-related failures
- `GraphCycleError`: Cycle detection specific errors
- `GraphValidationError`: Graph consistency validation failures

## Expected Changes
- New domain error types for graph operations
- Improved error messages with context
- Better debugging information for graph failures
- More specific error handling in services

## Error Information to Include
- Operation being performed
- Graph state information
- Node/edge details where relevant
- Performance context (timing, cache status)

## LSP Integration
- Error codes that map to LSP diagnostics
- User-friendly error messages
- Actionable error information

## Validation Commands
```bash
# Verify graph error types created
ls src/domain/errors/GraphErrors.ts && echo "✅ Graph error types created"

# Verify specific error usage in adapter
grep -r "GraphConstructionError\|GraphTraversalError" src/infrastructure/graph/ProofGraphAdapter.ts && echo "✅ Specific errors used"

# Verify neverthrow Result pattern
grep -r "import.*neverthrow" src/infrastructure/graph/ProofGraphAdapter.ts && echo "✅ neverthrow pattern used"

# Run type checking
npm run typecheck

# Run error handling tests
npm test -- --grep "error.*handling"
```

## Notes
- Follow existing domain error patterns
- Keep error types in domain layer
- Don't expose infrastructure details in errors
- Focus on actionable error information
- Leverage neverthrow for consistent error handling