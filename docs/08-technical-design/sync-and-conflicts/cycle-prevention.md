# Cycle Prevention in Argument Trees

This document describes how Proof Editor prevents circular reasoning by detecting and preventing cycles in argument structures.

## Why Prevent Cycles?

In formal logic, circular reasoning (where a conclusion is used to prove itself) is invalid. While our implementation uses a Directed Acyclic Graph (DAG) data structure, we must enforce the "acyclic" property to maintain logical validity.

## Detection Strategy

### Real-time Validation
When a user attempts to create a connection (via branching or other mechanisms), the system checks if the connection would create a cycle.

```typescript
interface CycleDetectionResult {
  wouldCreateCycle: boolean;
  cyclePath?: string[]; // Atomic argument IDs forming the cycle
  reason?: string;      // Human-readable explanation
}

function wouldCreateCycle(
  sourceArgumentId: string,
  targetOrderedSetId: string,
  atomicArguments: Map<string, AtomicArgumentEntity>,
  orderedSets: Map<string, OrderedSetEntity>
): CycleDetectionResult {
  // 1. Find all atomic arguments that use targetOrderedSetId as premise
  // 2. For each such argument, traverse downstream connections
  // 3. If any path leads back to sourceArgumentId, a cycle would form
  // 4. Return the path for user feedback
}
```

### Algorithm: Depth-First Search
1. Start from the target atomic argument(s)
2. Follow all downstream connections (via shared ordered sets)
3. Mark visited atomic arguments
4. If we encounter the source argument, a cycle exists
5. Return the path for clear user feedback

## Prevention Mechanisms

### 1. UI Prevention [PLATFORM]
Before allowing a branch operation:
- Check if connection would create cycle
- If yes, disable the action with explanation
- Show visual indicator of what would form the cycle

### 2. File Format Validation [CORE]
When loading `.proof` files:
- Build connection graph from string matching
- Detect any cycles in the loaded data
- Report errors with cycle paths

### 3. API Validation [LSP]
Language servers validate before accepting changes:
- Check cycle constraint on every connection modification
- Return diagnostic errors for cycle attempts
- Suggest alternative connection points

## User Experience

### Error Messages
When a cycle is detected, provide clear feedback:

```
Cannot create connection: This would create circular reasoning.

Cycle path:
1. "All A are B" → "All B are C"
2. "All B are C" → "All C are A"  
3. "All C are A" → "All A are B" (cycle!)

Suggestion: Consider creating a separate argument tree for this conclusion.
```

### Visual Indicators
- Highlight the potential cycle path in red
- Show direction arrows indicating the circular flow
- Animate the path to make it clear

### Recovery Options
Offer users alternatives when they attempt to create a cycle:
1. Create a new, independent argument tree
2. Branch from a different ordered set
3. Restructure their argument to avoid circularity

## Implementation Considerations

### Performance
- Cache connection paths for large argument trees
- Use incremental validation (only check affected paths)
- Implement early termination when cycle detected

### Edge Cases
1. **Self-referential arguments**: An atomic argument cannot have the same ordered set as both premise and conclusion
2. **Multi-premise cycles**: Check all premise paths, not just the first
3. **Disconnected components**: Cycles can only form within connected components

### Platform-Specific Implementation

#### Desktop (VS Code)
- Real-time validation as user types
- Hover warnings on potential cycle points
- Quick fixes to restructure arguments

#### Mobile
- Touch-and-hold to preview connection validity
- Haptic feedback for invalid connections
- Simplified cycle visualization for small screens

## Testing Strategy

### Unit Tests
- Test cycle detection algorithm with various graph structures
- Verify edge case handling
- Performance tests with large graphs

### Integration Tests
- Test UI prevention mechanisms
- Verify file format validation
- Test LSP diagnostic generation

### User Acceptance Tests
- Ensure error messages are clear
- Verify visual indicators are helpful
- Test recovery workflows

## Future Enhancements

1. **Cycle Analysis**: Show why the circular reasoning is problematic
2. **Smart Suggestions**: Pattern-based suggestions for restructuring
3. **Educational Mode**: Explain logical fallacies when cycles are attempted