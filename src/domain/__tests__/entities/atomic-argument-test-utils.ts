/**
 * Shared test utilities and setup for AtomicArgument tests
 *
 * This file contains common test helpers, mocks, and generators
 * used across all AtomicArgument test files.
 */

import fc from 'fast-check';
import type { SideLabels } from '../../entities/AtomicArgument.js';
import { atomicArgumentIdFactory, statementFactory } from '../factories/index.js';

// Common test constants
export const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

// Property-based test generators for AtomicArgument domain
export const validSideLabelsArbitrary = fc
  .record({
    left: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    right: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  })
  .map((labels) => {
    const result: SideLabels = {};
    if (labels.left !== null) result.left = labels.left;
    if (labels.right !== null) result.right = labels.right;
    return result;
  });

// Fast-check arbitraries for factory replacements
export const statementArbitrary = fc.constant(null).map(() => statementFactory.build());
export const atomicArgumentIdArbitrary = fc
  .constant(null)
  .map(() => atomicArgumentIdFactory.build());

// Common validation helpers
export function expectValidTimestamps(
  createdAt: number,
  modifiedAt: number,
  expectedTime: number,
): void {
  expect(createdAt).toBe(expectedTime);
  expect(modifiedAt).toBe(expectedTime);
}
