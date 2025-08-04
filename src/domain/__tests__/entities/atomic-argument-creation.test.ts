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

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { SideLabels } from '../../shared/value-objects/index.js';
import { statementFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';
import { FIXED_TIMESTAMP, validSideLabelsArbitrary } from './atomic-argument-test-utils.js';

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
        expect(argument.getPremises()).toHaveLength(0);
        expect(argument.getConclusions()).toHaveLength(0);
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
      const premise = statementFactory.build();
      const result = AtomicArgument.create([premise]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toHaveLength(1);
        expect(argument.getPremises()[0]).toBe(premise);
        expect(argument.getConclusions()).toHaveLength(0);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
      }
    });

    it('should create argument with conclusion set only', () => {
      const conclusion = statementFactory.build();
      const result = AtomicArgument.create([], [conclusion]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toHaveLength(0);
        expect(argument.getConclusions()).toHaveLength(1);
        expect(argument.getConclusions()[0]).toBe(conclusion);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
      }
    });

    it('should create complete argument with both sets', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();
      const result = AtomicArgument.create([premise], [conclusion]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const argument = result.value;
        expect(argument.getPremises()).toHaveLength(1);
        expect(argument.getPremises()[0]).toBe(premise);
        expect(argument.getConclusions()).toHaveLength(1);
        expect(argument.getConclusions()[0]).toBe(conclusion);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(true);
      }
    });

    it('should create arguments with side labels', () => {
      const sideLabels = SideLabels.fromStrings({ left: 'Modus Ponens', right: 'Rule 1' });
      expect(sideLabels.isOk()).toBe(true);

      if (sideLabels.isOk()) {
        const result = AtomicArgument.create([], [], sideLabels.value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.hasSideLabels()).toBe(true);
          const labels = argument.getSideLabels();
          expect(labels.left).toBe('Modus Ponens');
          expect(labels.right).toBe('Rule 1');
        }
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

  describe('createBootstrap factory method', () => {
    it('should create bootstrap arguments directly', () => {
      const argument = AtomicArgument.createBootstrap();

      expect(argument.getPremises()).toHaveLength(0);
      expect(argument.getConclusions()).toHaveLength(0);
      expect(argument.isComplete()).toBe(false);
      expect(argument.isBootstrap()).toBe(true);
      expect(argument.getSideLabels()).toEqual({});
      expect(argument.getCreatedAt()).toBe(FIXED_TIMESTAMP);
      expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP);
    });

    it('should create complete arguments with both premise and conclusion', () => {
      const premise = statementFactory.build();
      const conclusion = statementFactory.build();
      const sideLabelsResult = SideLabels.fromStrings({ left: 'Direct', right: 'Complete' });

      expect(sideLabelsResult.isOk()).toBe(true);
      if (sideLabelsResult.isOk()) {
        const result = AtomicArgument.create([premise], [conclusion], sideLabelsResult.value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.isComplete()).toBe(true);
          expect(argument.hasSideLabels()).toBe(true);
        }
      }
    });
  });

  describe('property-based creation testing', () => {
    it('should handle various statement combinations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constant(statementFactory.build), { minLength: 0, maxLength: 5 }),
          fc.array(fc.constant(statementFactory.build), { minLength: 0, maxLength: 5 }),
          validSideLabelsArbitrary,
          (premiseGenerators, conclusionGenerators, sideLabels) => {
            const premises = premiseGenerators.map((gen) => gen());
            const conclusions = conclusionGenerators.map((gen) => gen());

            const result = AtomicArgument.create(premises, conclusions, sideLabels);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;
              customExpect(argument).toBeValidAtomicArgument();
              expect(argument.getPremises()).toHaveLength(premises.length);
              expect(argument.getConclusions()).toHaveLength(conclusions.length);
              expect(argument.isBootstrapArgument()).toBe(
                premises.length === 0 && conclusions.length === 0,
              );
              expect(argument.isComplete()).toBe(premises.length > 0 && conclusions.length > 0);
            }
          },
        ),
      );
    });
  });
});
