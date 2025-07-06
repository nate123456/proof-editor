/**
 * Test suite for AtomicArgument creation patterns
 *
 * Focuses on:
 * - Bootstrap argument creation (empty)
 * - Partial argument creation (premise or conclusion only)
 * - Complete argument creation (both premise and conclusion)
 * - Factory method patterns
 * - Side label initialization
 * - Property-based creation testing
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';
import {
  FIXED_TIMESTAMP,
  orderedSetIdArbitrary,
  validSideLabelsArbitrary,
} from './atomic-argument-test-utils.js';

describe('AtomicArgument Creation', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('basic creation patterns', () => {
    it('should create empty argument (bootstrap case)', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        customExpect(argument).toBeValidAtomicArgument();
        expect(argument.getPremiseSet()).toBeNull();
        expect(argument.getConclusionSet()).toBeNull();
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.isEmpty()).toBe(true);
        expect(argument.isComplete()).toBe(false);
        expect(argument.getCreatedAt()).toBe(FIXED_TIMESTAMP);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP);
        expect(argument.getSideLabels()).toEqual({});
        expect(argument.hasSideLabels()).toBe(false);
      }
    });

    it('should create argument with premise set only', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(premiseSetRef);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremiseSet()).toBe(premiseSetRef);
        expect(argument.getConclusionSet()).toBeNull();
        expect(argument.hasPremiseSet()).toBe(true);
        expect(argument.hasConclusionSet()).toBe(false);
        expect(argument.hasEmptyPremiseSet()).toBe(false);
        expect(argument.hasEmptyConclusionSet()).toBe(true);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
      }
    });

    it('should create argument with conclusion set only', () => {
      const conclusionSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(undefined, conclusionSetRef);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremiseSet()).toBeNull();
        expect(argument.getConclusionSet()).toBe(conclusionSetRef);
        expect(argument.hasPremiseSet()).toBe(false);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.hasEmptyPremiseSet()).toBe(true);
        expect(argument.hasEmptyConclusionSet()).toBe(false);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
      }
    });

    it('should create complete argument with both sets', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const result = AtomicArgument.create(premiseSetRef, conclusionSetRef);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremiseSet()).toBe(premiseSetRef);
        expect(argument.getConclusionSet()).toBe(conclusionSetRef);
        expect(argument.hasPremiseSet()).toBe(true);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(true);
      }
    });

    it('should create arguments with side labels', () => {
      const sideLabels: SideLabels = { left: 'Modus Ponens', right: 'Rule 1' };
      const result = AtomicArgument.create(undefined, undefined, sideLabels);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getSideLabels()).toEqual(sideLabels);
        expect(argument.hasSideLabels()).toBe(true);
        expect(argument.hasLeftSideLabel()).toBe(true);
        expect(argument.hasRightSideLabel()).toBe(true);
      }
    });

    it('should generate unique IDs for each argument', () => {
      const result1 = AtomicArgument.create();
      const result2 = AtomicArgument.create();

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.getId().equals(result2.value.getId())).toBe(false);
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('createComplete factory method', () => {
    it('should create complete arguments directly', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();
      const sideLabels: SideLabels = { left: 'Direct', right: 'Complete' };

      const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef, sideLabels);

      expect(argument.getPremiseSet()).toBe(premiseSetRef);
      expect(argument.getConclusionSet()).toBe(conclusionSetRef);
      expect(argument.isComplete()).toBe(true);
      expect(argument.getSideLabels()).toEqual(sideLabels);
      expect(argument.getCreatedAt()).toBe(FIXED_TIMESTAMP);
      expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP);
    });

    it('should create complete arguments without side labels', () => {
      const premiseSetRef = orderedSetIdFactory.build();
      const conclusionSetRef = orderedSetIdFactory.build();

      const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);

      expect(argument.isComplete()).toBe(true);
      expect(argument.getSideLabels()).toEqual({});
      expect(argument.hasSideLabels()).toBe(false);
    });
  });

  describe('property-based creation testing', () => {
    it('should handle various ordered set combinations', () => {
      fc.assert(
        fc.property(
          fc.option(orderedSetIdArbitrary),
          fc.option(orderedSetIdArbitrary),
          validSideLabelsArbitrary,
          (premiseRef, conclusionRef, sideLabels) => {
            const result = AtomicArgument.create(
              premiseRef === null ? undefined : premiseRef,
              conclusionRef === null ? undefined : conclusionRef,
              sideLabels,
            );
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;
              customExpect(argument).toBeValidAtomicArgument();
              expect(argument.getPremiseSet()).toBe(premiseRef ?? null);
              expect(argument.getConclusionSet()).toBe(conclusionRef ?? null);
              expect(argument.isBootstrapArgument()).toBe(!premiseRef && !conclusionRef);
              expect(argument.isComplete()).toBe(!!premiseRef && !!conclusionRef);
              expect(argument.getSideLabels()).toEqual(sideLabels);
            }
          },
        ),
      );
    });
  });
});
