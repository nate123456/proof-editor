## [2025-07-03 16:31] - Agent Working: infrastructure/di/container.ts

**Discovery**: TypeScript decorator-based dependency injection constructor incompatible with `registerSingleton` method signature
**Context**: Fix for CrossContextOrchestrationService constructor type mismatch on line 350
**Evidence**: 
- Line 350: `container.registerSingleton(TOKENS.CrossContextOrchestrationService, CrossContextOrchestrationService)`
- Error: `Type 'typeof CrossContextOrchestrationService' is not assignable to parameter of type 'new (...args: unknown[]) => CrossContextOrchestrationService'`
- Constructor uses `@inject()` decorators for type-safe dependency injection
**Type**: Design Pattern Issue/DI Container Architecture
**Principle Impact**: DI container registration pattern needs alignment with decorator-based injection
**Priority**: High - Affects service instantiation and runtime dependency resolution

**Resolution Applied**: 
- Replaced `registerSingleton` with `registerFactory` pattern
- Factory function explicitly resolves all 9 dependencies in correct order
- Maintains type safety while enabling proper service instantiation

**Strategic Insight**: 
When using decorator-based DI (@inject), the container registration must use factory functions rather than direct class registration to maintain TypeScript type compatibility. The decorator approach provides better type safety and explicit dependency documentation but requires factory-based registration patterns.

---

## [2025-07-03 16:42] - Agent Working: RuleMetadata.test.ts, PackageId.test.ts
**Discovery**: Test reliability patterns for array access and destructuring
**Context**: Fixing noNonNullAssertion violations in test files
**Evidence**: 
- RuleMetadata.test.ts lines 491-493: `scores[0]!`, `scores[1]!`, etc. - array access with non-null assertion
- PackageId.test.ts lines 412-413: `PackageId.create(id1!)`, `PackageId.create(id2!)` - destructured array elements with non-null assertion
**Type**: Test Pattern/Type Safety
**Principle Impact**: Tests should validate assumptions explicitly rather than using non-null assertions
**Priority**: Medium - Improves test reliability and type safety

**Resolution Applied**:
- RuleMetadata: Added explicit length validation `expect(scores.length).toBeGreaterThanOrEqual(4)` before array access
- PackageId: Added explicit `expect(id1).toBeDefined()` and `expect(id2).toBeDefined()` before usage
- Removed all non-null assertion operators (`!`) in favor of explicit type guards

**Strategic Insight**:
Test files should model proper type safety patterns. Using non-null assertions in tests signals to developers that this pattern is acceptable, when explicit validation is more robust. The explicit validation approach makes test intent clearer and provides better failure messages when assumptions are violated.

---

## [2025-07-03 17:10] - Agent Working: Playwright e2e test configuration files
**Discovery**: TypeScript framework conflicts between Vitest globals and Playwright explicit imports
**Context**: Fixing "Playwright Test did not expect test.describe() to be called here" configuration errors
**Evidence**: 
- Main `tsconfig.json` line 11: `"types": ["vitest/globals"]` - injects global `test` and `describe` functions
- Playwright tests import `test` and `expect` explicitly from `'@playwright/test'` via test-env.ts
- Both frameworks trying to provide `test.describe()` causing runtime conflicts
**Type**: Test Framework Architecture/Configuration Pattern
**Principle Impact**: Framework isolation critical for multi-test-framework projects
**Priority**: High - Prevents e2e test execution and framework confusion

**Resolution Applied**:
- Created `tsconfig.e2e.json` with separate TypeScript configuration for Playwright tests
- Excluded Vitest globals: `"types": ["node", "@playwright/test"]` instead of `["vitest/globals"]`
- Updated main `tsconfig.json` to exclude e2e tests: `"exclude": ["node_modules", "dist", "tests/e2e/**/*"]`
- Fixed TypeScript strict mode violations in test files (null checks, error type assertions)

**Strategic Insight**:
Multi-framework testing environments require careful TypeScript configuration separation. Global test function injection (like Vitest's `globals: true`) conflicts with explicit framework imports (like Playwright's `import { test } from '@playwright/test'`). The solution is TypeScript configuration inheritance with framework-specific type exclusions, not attempting to merge incompatible testing paradigms.

**Pattern for Future**: 
- Unit tests (Vitest): Use globals for rapid development 
- E2E tests (Playwright): Use explicit imports for framework control
- Separate TypeScript configs prevent cross-contamination

---