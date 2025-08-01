# Create Application Service Interfaces

## Context
The application layer services like `ProofTreeQueryService` lack proper interfaces, making them difficult to test and reducing architectural flexibility.

## Problem
- No interfaces for application layer services
- Direct concrete dependencies make testing harder
- Reduced flexibility for service substitution
- Architectural boundaries less clear

## Task
Create interfaces for key application layer services to improve testability and architectural clarity.

## Files to Create
- `src/application/ports/IProofTreeQueryService.ts`
- `src/application/ports/IDocumentQueryService.ts` (if needed)

## Files to Modify
- `src/application/queries/ProofTreeQueryService.ts`
- Any files that depend on these services

## Acceptance Criteria
1. Clean interfaces for application layer services
2. Services implement their respective interfaces
3. Improved testability through interface mocking
4. Clear architectural boundaries
5. No breaking changes to existing functionality

## Implementation Steps
1. Extract interface from `ProofTreeQueryService` public methods
2. Create `IProofTreeQueryService` interface
3. Update `ProofTreeQueryService` to implement interface
4. Review other application services for interface extraction
5. Update any consumers to use interfaces

## Interface Design Principles
- Focus on public methods used by consumers
- Use Result pattern for all operations
- Keep interfaces cohesive and focused
- Abstract implementation details

## Expected Changes
- New interface files in application/ports
- Services implement their interfaces
- Cleaner dependency injection patterns
- Improved testability

## Interface Scope
Focus on services that:
- Are used by multiple consumers
- Have complex dependencies
- Are candidates for mocking in tests
- Provide core application functionality

## Notes
- Follow existing port interface patterns
- Don't create interfaces for simple services
- Consider service substitution scenarios
- Keep interfaces stable and focused