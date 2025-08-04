/**
 * Shared test utilities and setup for AtomicArgument tests
 *
 * This file contains common test helpers, mocks, and generators
 * used across all AtomicArgument test files.
 */

import fc from 'fast-check';
import { expect } from 'vitest';
import { SideLabel, SideLabels } from '../../shared/value-objects/index.js';
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
    let left: SideLabel | undefined;
    let right: SideLabel | undefined;

    if (labels.left !== null) {
      const leftResult = SideLabel.create(labels.left);
      if (leftResult.isOk()) {
        left = leftResult.value;
      }
    }

    if (labels.right !== null) {
      const rightResult = SideLabel.create(labels.right);
      if (rightResult.isOk()) {
        right = rightResult.value;
      }
    }

    return SideLabels.create(left, right);
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
