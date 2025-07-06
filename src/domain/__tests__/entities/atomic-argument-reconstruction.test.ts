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

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { atomicArgumentIdFactory, orderedSetIdFactory } from '../factories/index.js';
import {
  FIXED_TIMESTAMP,
  orderedSetIdArbitrary,
  validSideLabelsArbitrary,
} from './atomic-argument-test-utils.js';

describe('AtomicArgument Reconstruction', () => {
  describe('valid reconstruction cases', () => {
    it('should reconstruct arguments with all parameters', () => {
      const id = atomicArgumentIdFactory.build();
      const premiseSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const createdAt = FIXED_TIMESTAMP - 1000;
      const modifiedAt = FIXED_TIMESTAMP;
      const sideLabels: SideLabels = { left: 'Reconstructed', right: 'Test' };

      const result = AtomicArgument.reconstruct(
        id,
        premiseSetRef,
        conclusionSetRef,
        createdAt,
        modifiedAt,
        sideLabels,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getId()).toBe(id);
        expect(argument.getPremiseSet()).toBe(premiseSetRef);
        expect(argument.getConclusionSet()).toBe(conclusionSetRef);
        expect(argument.getCreatedAt()).toBe(createdAt);
        expect(argument.getModifiedAt()).toBe(modifiedAt);
        expect(argument.getSideLabels()).toEqual(sideLabels);
      }
    });

    it('should reconstruct with null references', () => {
      const id = atomicArgumentIdFactory.build();
      const result = AtomicArgument.reconstruct(id, null, null, FIXED_TIMESTAMP, FIXED_TIMESTAMP);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.getSideLabels()).toEqual({});
      }
    });

    it('should reconstruct with premise set only', () => {
      const id = atomicArgumentIdFactory.build();
      const premiseSetRef = orderedSetIdFactory.build();
      const createdAt = FIXED_TIMESTAMP - 2000;
      const modifiedAt = FIXED_TIMESTAMP - 1000;

      const result = AtomicArgument.reconstruct(id, premiseSetRef, null, createdAt, modifiedAt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremiseSet()).toBe(premiseSetRef);
        expect(argument.getConclusionSet()).toBeNull();
        expect(argument.isComplete()).toBe(false);
        expect(argument.hasPremiseSet()).toBe(true);
        expect(argument.hasConclusionSet()).toBe(false);
      }
    });

    it('should reconstruct with conclusion set only', () => {
      const id = atomicArgumentIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const timestamp = FIXED_TIMESTAMP;

      const result = AtomicArgument.reconstruct(id, null, conclusionSetRef, timestamp, timestamp);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremiseSet()).toBeNull();
        expect(argument.getConclusionSet()).toBe(conclusionSetRef);
        expect(argument.isComplete()).toBe(false);
        expect(argument.hasPremiseSet()).toBe(false);
        expect(argument.hasConclusionSet()).toBe(true);
      }
    });

    it('should preserve exact timestamps during reconstruction', () => {
      const id = atomicArgumentIdFactory.build();
      const createdAt = 1234567890;
      const modifiedAt = 9876543210;

      const result = AtomicArgument.reconstruct(id, null, null, createdAt, modifiedAt);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getCreatedAt()).toBe(createdAt);
        expect(argument.getModifiedAt()).toBe(modifiedAt);
      }
    });

    it('should handle property-based reconstruction', () => {
      fc.assert(
        fc.property(
          fc.option(orderedSetIdArbitrary),
          fc.option(orderedSetIdArbitrary),
          fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          validSideLabelsArbitrary,
          (premiseRef, conclusionRef, createdAt, modifiedAt, sideLabels) => {
            // Ensure modifiedAt >= createdAt
            const normalizedCreatedAt = Math.min(createdAt, modifiedAt);
            const normalizedModifiedAt = Math.max(createdAt, modifiedAt);

            const id = atomicArgumentIdFactory.build();
            const result = AtomicArgument.reconstruct(
              id,
              premiseRef === null ? null : premiseRef,
              conclusionRef === null ? null : conclusionRef,
              normalizedCreatedAt,
              normalizedModifiedAt,
              sideLabels,
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const argument = result.value;
              expect(argument.getId()).toBe(id);
              expect(argument.getPremiseSet()).toBe(premiseRef ?? null);
              expect(argument.getConclusionSet()).toBe(conclusionRef ?? null);
              expect(argument.getCreatedAt()).toBe(normalizedCreatedAt);
              expect(argument.getModifiedAt()).toBe(normalizedModifiedAt);
            }
          },
        ),
      );
    });
  });
});
