# Add Graph Integration Tests

## Context
After implementing the architectural fixes for graphology integration, we need comprehensive integration tests to validate the dependency injection, caching, and performance improvements work correctly.

## Problem
- No integration tests validating DI fixes
- Missing tests for graph caching behavior
- No validation of LSP performance improvements
- Architectural changes need end-to-end validation

## Task
Create integration tests that validate the complete graph operation flow with proper dependency injection and caching.

## Files to Create
- `src/__tests__/integration/graph-integration.test.ts`
- `src/__tests__/integration/graph-performance.test.ts`

## Files to Modify
- Add any necessary test utilities to existing test infrastructure

## Acceptance Criteria
1. Test complete graph operation flow with DI
2. Validate caching behavior and performance
3. Test LSP query scenarios end-to-end
4. Verify architectural constraints (no DIP violations)
5. Performance regression tests

## Test Scenarios
1. **DI Integration**: 
   - ProofTreeQueryService gets IGraphTraversalService via DI
   - Can substitute mock implementations
   - Container resolves full dependency graph

2. **Cache Behavior**:
   - Cache hit/miss scenarios
   - Cache invalidation on changes
   - Memory usage stays within bounds

3. **LSP Performance**:
   - Query response times under targets
   - Incremental updates work correctly
   - Large proof tree handling

4. **Error Handling**:
   - Proper error propagation
   - Specific error types returned
   - Graceful failure scenarios

## Implementation Steps
1. Create test fixtures for various proof tree sizes
2. Write DI integration tests
3. Add cache behavior validation tests
4. Create LSP performance scenario tests
5. Add error handling integration tests

## Expected Changes
- Comprehensive integration test suite
- Validation of architectural improvements
- Performance regression protection
- End-to-end confidence in graph operations

## Performance Test Targets
- <50ms for typical LSP queries
- <100ms for complex graph operations
- Cache hit rate >80% in realistic scenarios
- Memory usage <100MB for normal workloads

## Test Data
- Small proof trees (10-50 nodes)
- Medium trees (100-500 nodes)
- Large trees (1000+ nodes)
- Various connection patterns

## Notes
- Use existing test infrastructure patterns
- Focus on realistic usage scenarios
- Don't duplicate unit test coverage
- Include both happy path and failure scenarios
- Test with various proof tree structures