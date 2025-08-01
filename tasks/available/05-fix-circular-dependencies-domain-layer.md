# Fix Circular Dependencies in Domain Layer

## Context
The dependency analysis revealed 7 circular dependencies in the codebase, with some affecting the domain layer value objects and language intelligence context services.

## Problem
Circular dependencies can cause:
- Module loading issues
- Build system problems
- Difficulty in testing and mocking
- Architectural complexity

## Task
Identify and fix circular dependencies in the domain layer, particularly around value objects and shared types.

## Files to Investigate
- `src/domain/shared/value-objects.ts`
- Any files with circular imports in domain layer
- Language intelligence context services (6 circular dependencies found)

## Acceptance Criteria
1. Zero circular dependencies in domain layer
2. Clean import structure with clear dependency direction
3. Maintain existing functionality
4. No breaking changes to public APIs
5. Proper separation of concerns

## Implementation Steps
1. Run `npm run deps:circular` to identify current circular dependencies
2. Analyze import chains causing circular references
3. Refactor imports to break cycles (extract interfaces, move types, etc.)
4. Verify no new circular dependencies introduced
5. Run tests to ensure functionality maintained

## Common Solutions
- Extract shared interfaces to separate files
- Use dependency injection instead of direct imports
- Move shared types to common/shared modules
- Apply interface segregation principle

## Expected Changes
- Cleaner import structure in domain layer
- Possible new shared interface files
- Reduced coupling between domain modules

## Validation
- `npm run deps:circular` shows no circular dependencies
- All tests pass
- Build completes without module resolution errors

## Notes
- Focus on domain layer first, then application layer
- Don't break existing APIs
- Consider creating shared type files if needed
- Use proper TypeScript module patterns