/**
 * Test suite for AtomicArgument OrderedSet reference management
 *
 * Focuses on:
 * - Premise set reference manipulation
 * - Conclusion set reference manipulation
 * - Reference state transitions (bootstrap → partial → complete)
 * - Modification timestamp tracking
 * - Reference immutability and identity
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { FIXED_TIMESTAMP } from './atomic-argument-test-utils.js';

describe('OrderedSet Reference Management', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('premise set manipulation', () => {
    it('should set premise set reference', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const premiseSetRef = orderedSetIdFactory.build();
        const originalModified = argument.getModifiedAt();

        // Mock time advancement for modification tracking
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

        argument.setPremiseSetRef(premiseSetRef);

        expect(argument.getPremiseSet()).toBe(premiseSetRef);
        expect(argument.hasPremiseSet()).toBe(true);
        expect(argument.hasEmptyPremiseSet()).toBe(false);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
      }
    });

    it('should clear premise set reference', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(premiseSetRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

        argument.setPremiseSetRef(null);

        expect(argument.getPremiseSet()).toBeNull();
        expect(argument.hasPremiseSet()).toBe(false);
        expect(argument.hasEmptyPremiseSet()).toBe(true);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should not update modification time for same reference', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(premiseSetRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const originalModified = argument.getModifiedAt();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setPremiseSetRef(premiseSetRef); // Same reference

        expect(argument.getModifiedAt()).toBe(originalModified); // Should not change
      }
    });

    it('should replace existing premise set reference', () => {
      const firstRef = orderedSetIdFactory.build();
      const secondRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(firstRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setPremiseSetRef(secondRef);

        expect(argument.getPremiseSet()).toBe(secondRef);
        expect(argument.getPremiseSet()).not.toBe(firstRef);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });
  });

  describe('conclusion set manipulation', () => {
    it('should set conclusion set reference', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const conclusionSetRef = orderedSetIdFactory.build();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setConclusionSetRef(conclusionSetRef);

        expect(argument.getConclusionSet()).toBe(conclusionSetRef);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.hasEmptyConclusionSet()).toBe(false);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should clear conclusion set reference', () => {
      const conclusionSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(undefined, conclusionSetRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setConclusionSetRef(null);

        expect(argument.getConclusionSet()).toBeNull();
        expect(argument.hasConclusionSet()).toBe(false);
        expect(argument.hasEmptyConclusionSet()).toBe(true);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should not update modification time for same reference', () => {
      const conclusionSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(undefined, conclusionSetRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const originalModified = argument.getModifiedAt();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setConclusionSetRef(conclusionSetRef); // Same reference

        expect(argument.getModifiedAt()).toBe(originalModified); // Should not change
      }
    });

    it('should replace existing conclusion set reference', () => {
      const firstRef = orderedSetIdFactory.build();
      const secondRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(undefined, firstRef);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setConclusionSetRef(secondRef);

        expect(argument.getConclusionSet()).toBe(secondRef);
        expect(argument.getConclusionSet()).not.toBe(firstRef);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });
  });

  describe('reference state transitions', () => {
    it('should handle bootstrap → partial → complete transitions', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Bootstrap state
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.isEmpty()).toBe(true);
        expect(argument.isComplete()).toBe(false);

        // Add premise set → partial state
        const premiseSetRef = orderedSetIdFactory.build();
        argument.setPremiseSetRef(premiseSetRef);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);

        // Add conclusion set → complete state
        const conclusionSetRef = orderedSetIdFactory.build();
        argument.setConclusionSetRef(conclusionSetRef);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(true);
      }
    });

    it('should handle complete → partial → bootstrap transitions', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);

      // Complete state
      expect(argument.isComplete()).toBe(true);
      expect(argument.isEmpty()).toBe(false);
      expect(argument.isBootstrapArgument()).toBe(false);

      // Remove premise set → partial state
      argument.setPremiseSetRef(null);
      expect(argument.isComplete()).toBe(false);
      expect(argument.isEmpty()).toBe(false);
      expect(argument.isBootstrapArgument()).toBe(false);

      // Remove conclusion set → bootstrap state
      argument.setConclusionSetRef(null);
      expect(argument.isComplete()).toBe(false);
      expect(argument.isEmpty()).toBe(true);
      expect(argument.isBootstrapArgument()).toBe(true);
    });

    it('should handle alternate path: conclusion first then premise', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Add conclusion first
        const conclusionSetRef = orderedSetIdFactory.build();
        argument.setConclusionSetRef(conclusionSetRef);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.hasPremiseSet()).toBe(false);

        // Add premise to complete
        const premiseSetRef = orderedSetIdFactory.build();
        argument.setPremiseSetRef(premiseSetRef);
        expect(argument.isComplete()).toBe(true);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.hasPremiseSet()).toBe(true);
      }
    });

    it('should track modification timestamps through transitions', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const initialTimestamp = argument.getModifiedAt();

        // First modification
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        argument.setPremiseSetRef(orderedSetIdFactory.build());
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        expect(argument.getModifiedAt()).toBeGreaterThan(initialTimestamp);

        // Second modification
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
        argument.setConclusionSetRef(orderedSetIdFactory.build());
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);

        // Third modification (clearing)
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
        argument.setPremiseSetRef(null);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 3000);
      }
    });
  });
});
