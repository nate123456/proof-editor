/**
 * Test setup and configuration for domain layer testing
 *
 * This file provides:
 * - Custom domain-specific test matchers
 * - Test utilities and helpers
 * - Shared test configuration
 */

import 'reflect-metadata';

import { expect } from 'vitest';

import type { AtomicArgument } from '../entities/AtomicArgument.js';
import type { OrderedSet } from '../entities/OrderedSet.js';
import type { Statement } from '../entities/Statement.js';
import type { ValidationError } from '../shared/result.js';

// Custom domain-specific matchers
interface CustomMatchers<R = unknown> {
  toBeValidStatement(): R;
  toBeValidAtomicArgument(): R;
  toHaveValidConnections(): R;
  toBeValidOrderedSet(): R;
  toBeValidationError(message?: string): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

// Custom matcher implementations
expect.extend({
  toBeValidStatement(received: Statement) {
    const pass =
      received != null &&
      typeof received.getId === 'function' &&
      typeof received.getContent === 'function' &&
      received.getContent().length > 0;

    return {
      pass,
      message: () =>
        `Expected ${String(received)} to be a valid Statement with id and non-empty content`,
    };
  },

  toBeValidAtomicArgument(received: AtomicArgument) {
    const pass =
      received != null &&
      typeof received.getId === 'function' &&
      typeof received.getPremiseSet === 'function' &&
      typeof received.getConclusionSet === 'function';

    return {
      pass,
      message: () =>
        `Expected ${String(received)} to be a valid AtomicArgument with proper references`,
    };
  },

  toHaveValidConnections(received: AtomicArgument[]) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `Expected array of AtomicArguments, got ${typeof received}`,
      };
    }

    // Check if arguments form valid connection chain
    let validConnections = true;
    for (let i = 0; i < received.length - 1; i++) {
      const current = received[i];
      const next = received[i + 1];

      const currentConclusion = current?.getConclusionSet();
      const nextPremise = next?.getPremiseSet();

      if (
        !current ||
        !next ||
        !currentConclusion ||
        !nextPremise ||
        !currentConclusion.equals(nextPremise)
      ) {
        validConnections = false;
        break;
      }
    }

    return {
      pass: validConnections,
      message: () =>
        validConnections
          ? `Expected arguments to NOT have valid connections`
          : `Expected arguments to have valid connections (conclusion → premise)`,
    };
  },

  toBeValidOrderedSet(received: OrderedSet) {
    const pass =
      received != null &&
      typeof received.getId === 'function' &&
      typeof received.getStatementIds === 'function' &&
      typeof received.size === 'function';

    return {
      pass,
      message: () => `Expected received value to be a valid OrderedSet with proper methods`,
    };
  },

  toBeValidationError(received: ValidationError, expectedMessage?: string) {
    if (!(received instanceof Error)) {
      return {
        pass: false,
        message: () => `Expected ValidationError, got ${typeof received}`,
      };
    }

    if (received.constructor.name !== 'ValidationError') {
      return {
        pass: false,
        message: () => `Expected ValidationError, got ${received.constructor.name}`,
      };
    }

    if (expectedMessage && !received.message.includes(expectedMessage)) {
      return {
        pass: false,
        message: () =>
          `Expected error message to contain "${expectedMessage}", got "${received.message}"`,
      };
    }

    return {
      pass: true,
      message: () => `Expected NOT to be ValidationError with message "${received.message}"`,
    };
  },
});

export { expect };
