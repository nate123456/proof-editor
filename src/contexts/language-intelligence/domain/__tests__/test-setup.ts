/**
 * Test setup and configuration for language-intelligence domain testing
 *
 * This file provides:
 * - Custom domain-specific test matchers
 * - Test utilities and helpers
 * - Shared test configuration
 */

import 'reflect-metadata';

import { expect } from 'vitest';

import type { ValidationLevel } from '../value-objects/ValidationLevel.js';

// Custom domain-specific matchers
interface CustomMatchers<R = unknown> {
  toContainValidationLevel(level: ValidationLevel): R;
  toContainValidationLevels(levels: ValidationLevel[]): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

// Custom matcher implementations
expect.extend({
  toContainValidationLevel(received: ValidationLevel[], expectedLevel: ValidationLevel) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `Expected array of ValidationLevel, got ${typeof received}`,
      };
    }

    const pass = received.some((level) => level.equals(expectedLevel));

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received.map((l) => l.toString()).join(', ')} to NOT contain ValidationLevel ${expectedLevel.toString()}`
          : `Expected ${received.map((l) => l.toString()).join(', ')} to contain ValidationLevel ${expectedLevel.toString()}`,
    };
  },

  toContainValidationLevels(received: ValidationLevel[], expectedLevels: ValidationLevel[]) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `Expected array of ValidationLevel, got ${typeof received}`,
      };
    }

    const missingLevels = expectedLevels.filter(
      (expectedLevel) => !received.some((level) => level.equals(expectedLevel)),
    );

    const pass = missingLevels.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received.map((l) => l.toString()).join(', ')} to NOT contain all ValidationLevels ${expectedLevels.map((l) => l.toString()).join(', ')}`
          : `Expected ${received.map((l) => l.toString()).join(', ')} to contain all ValidationLevels ${expectedLevels.map((l) => l.toString()).join(', ')}. Missing: ${missingLevels.map((l) => l.toString()).join(', ')}`,
    };
  },
});

export { expect };
