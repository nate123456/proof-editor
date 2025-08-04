/**
 * Test suite for AtomicArgument reconstruction patterns
 *
 * Focuses on:
 * - Reconstruction from stored data
 * - Handling of timestamps during reconstruction
 * - Reconstruction with various combinations of premises/conclusions
 * - Reconstruction with side labels
 * - Property-based reconstruction testing
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { atomicArgumentIdFactory, statementFactory } from '../factories/index.js';
import { FIXED_TIMESTAMP, validSideLabelsArbitrary } from './atomic-argument-test-utils.js';

describe('AtomicArgument Reconstruction', () => {
  describe('valid reconstruction cases', () => {
    it('should reconstruct arguments with all parameters', () => {
      const id = atomicArgumentIdFactory.build();
      const premises = [statementFactory.build(), statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const createdAt = FIXED_TIMESTAMP - 1000;
      const modifiedAt = FIXED_TIMESTAMP;
      const sideLabels = { left: 'Reconstructed', right: 'Test' };

      const result = AtomicArgument.reconstruct(
        id,
        premises,
        conclusions,
        createdAt,
        modifiedAt,
        sideLabels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getId()).toBe(id);
        expect(argument.getPremises()).toEqual(premises);
        expect(argument.getConclusions()).toEqual(conclusions);
        expect(argument.getCreatedAt()).toBe(createdAt);
        expect(argument.getModifiedAt()).toBe(modifiedAt);
        expect(argument.getSideLabels()).toEqual(sideLabels);
      }
    });

    it('should reconstruct with empty premises and conclusions', () => {
      const id = atomicArgumentIdFactory.build();
      const result = AtomicArgument.reconstruct(id, [], [], FIXED_TIMESTAMP, FIXED_TIMESTAMP);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.getSideLabels()).toEqual({});
      }
    });

    it('should reconstruct with premises only', () => {
      const id = atomicArgumentIdFactory.build();
      const premises = [statementFactory.build()];
      const createdAt = FIXED_TIMESTAMP - 2000;
      const modifiedAt = FIXED_TIMESTAMP - 1000;

      const result = AtomicArgument.reconstruct(id, premises, [], createdAt, modifiedAt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual(premises);
        expect(argument.getConclusions()).toEqual([]);
        expect(argument.isComplete()).toBe(false);
        expect(argument.hasPremiseSet()).toBe(true);
        expect(argument.hasConclusionSet()).toBe(false);
      }
    });

    it('should reconstruct with conclusions only', () => {
      const id = atomicArgumentIdFactory.build();
      const conclusions = [statementFactory.build()];
      const timestamp = FIXED_TIMESTAMP;

      const result = AtomicArgument.reconstruct(id, [], conclusions, timestamp, timestamp);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toEqual([]);
        expect(argument.getConclusions()).toEqual(conclusions);
        expect(argument.isComplete()).toBe(false);
        expect(argument.hasPremiseSet()).toBe(false);
        expect(argument.hasConclusionSet()).toBe(true);
      }
    });

    it('should preserve exact timestamps during reconstruction', () => {
      const id = atomicArgumentIdFactory.build();
      const createdAt = 1234567890;
      const modifiedAt = 9876543210;

      const result = AtomicArgument.reconstruct(id, [], [], createdAt, modifiedAt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getCreatedAt()).toBe(createdAt);
        expect(argument.getModifiedAt()).toBe(modifiedAt);
      }
    });

    it('should fail when modified timestamp is before created timestamp', () => {
      const id = atomicArgumentIdFactory.build();
      const createdAt = FIXED_TIMESTAMP;
      const modifiedAt = FIXED_TIMESTAMP - 1000; // Before created

      const result = AtomicArgument.reconstruct(id, [], [], createdAt, modifiedAt);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'modified timestamp cannot be before created timestamp',
        );
      }
    });

    it('should handle property-based reconstruction', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constant(null), { minLength: 0, maxLength: 3 })
            .map((nulls) => nulls.map(() => statementFactory.build())),
          fc
            .array(fc.constant(null), { minLength: 0, maxLength: 3 })
            .map((nulls) => nulls.map(() => statementFactory.build())),
          fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          validSideLabelsArbitrary,
          (premises, conclusions, createdAt, modifiedAt, sideLabels) => {
            // Ensure modifiedAt >= createdAt
            const normalizedCreatedAt = Math.min(createdAt, modifiedAt);
            const normalizedModifiedAt = Math.max(createdAt, modifiedAt);

            const id = atomicArgumentIdFactory.build();
            const result = AtomicArgument.reconstruct(
              id,
              premises,
              conclusions,
              normalizedCreatedAt,
              normalizedModifiedAt,
              sideLabels.toStrings(),
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const argument = result.value;
              expect(argument.getId()).toBe(id);
              expect(argument.getPremises()).toEqual(premises);
              expect(argument.getConclusions()).toEqual(conclusions);
              expect(argument.getCreatedAt()).toBe(normalizedCreatedAt);
              expect(argument.getModifiedAt()).toBe(normalizedModifiedAt);

              // Verify internal state consistency
              if (premises.length === 0 && conclusions.length === 0) {
                expect(argument.isBootstrapArgument()).toBe(true);
              }
              if (premises.length > 0 && conclusions.length > 0) {
                expect(argument.isComplete()).toBe(true);
              }
            }
          },
        ),
      );
    });

    it('should reconstruct with duplicate statements in premises', () => {
      const id = atomicArgumentIdFactory.build();
      const statement = statementFactory.build();
      const premises = [statement, statement]; // Same statement twice
      const conclusions = [statementFactory.build()];

      const result = AtomicArgument.reconstruct(
        id,
        premises,
        conclusions,
        FIXED_TIMESTAMP,
        FIXED_TIMESTAMP,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Duplicate statement');
      }
    });

    it('should reconstruct with duplicate statements in conclusions', () => {
      const id = atomicArgumentIdFactory.build();
      const premises = [statementFactory.build()];
      const statement = statementFactory.build();
      const conclusions = [statement, statement]; // Same statement twice

      const result = AtomicArgument.reconstruct(
        id,
        premises,
        conclusions,
        FIXED_TIMESTAMP,
        FIXED_TIMESTAMP,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Duplicate statement');
      }
    });
  });
});
