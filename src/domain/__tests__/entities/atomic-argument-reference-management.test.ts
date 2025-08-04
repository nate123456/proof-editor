/**
 * Test suite for AtomicArgument Statement management
 *
 * Focuses on:
 * - Premise management
 * - Conclusion management
 * - State transitions (bootstrap → partial → complete)
 * - Modification timestamp tracking
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { Statement } from '../../entities/Statement.js';
import { statementFactory } from '../factories/index.js';
import { FIXED_TIMESTAMP } from './atomic-argument-test-utils.js';

describe('Statement Management', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('premise manipulation', () => {
    it('should add premises', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const statement = statementFactory.build();
        const originalModified = argument.getModifiedAt();

        // Mock time advancement for modification tracking
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

        const addResult = argument.addPremise(statement);
        expect(addResult.isOk()).toBe(true);

        expect(argument.getPremises()).toHaveLength(1);
        expect(argument.getPremises()[0]).toBe(statement);
        expect(argument.hasPremiseSet()).toBe(true);
        expect(argument.getPremiseCount()).toBe(1);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
      }
    });

    it('should get premise at specific index', () => {
      const statements = [statementFactory.build(), statementFactory.build()];
      const result = AtomicArgument.create(statements);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        expect(argument.getPremiseAt(0)).toBe(statements[0]);
        expect(argument.getPremiseAt(1)).toBe(statements[1]);
        expect(argument.getPremiseAt(2)).toBeUndefined();
      }
    });

    it('should set premise at specific position', () => {
      const statements = [statementFactory.build(), statementFactory.build()];
      const result = AtomicArgument.create(statements);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const newStatement = statementFactory.build();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const setResult = argument.setPremiseAt(1, newStatement);

        expect(setResult.isOk()).toBe(true);
        expect(argument.getPremiseAt(1)).toBe(newStatement);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should remove premise at specific position', () => {
      const statements = [statementFactory.build(), statementFactory.build()];
      const result = AtomicArgument.create(statements);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const removeResult = argument.removePremiseAt(0);

        expect(removeResult.isOk()).toBe(true);
        if (removeResult.isOk()) {
          expect(removeResult.value).toBe(statements[0]);
        }
        expect(argument.getPremiseCount()).toBe(1);
        expect(argument.getPremiseAt(0)).toBe(statements[1]);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });
  });

  describe('conclusion manipulation', () => {
    it('should add conclusions', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const statement = statementFactory.build();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const addResult = argument.addConclusion(statement);

        expect(addResult.isOk()).toBe(true);
        expect(argument.getConclusions()).toHaveLength(1);
        expect(argument.getConclusions()[0]).toBe(statement);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.getConclusionCount()).toBe(1);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should get conclusion at specific index', () => {
      const statements = [statementFactory.build(), statementFactory.build()];
      const result = AtomicArgument.create([], statements);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        expect(argument.getConclusionAt(0)).toBe(statements[0]);
        expect(argument.getConclusionAt(1)).toBe(statements[1]);
        expect(argument.getConclusionAt(2)).toBeUndefined();
      }
    });

    it('should set conclusion at specific position', () => {
      const statements = [statementFactory.build(), statementFactory.build()];
      const result = AtomicArgument.create([], statements);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        const newStatement = statementFactory.build();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const setResult = argument.setConclusionAt(1, newStatement);

        expect(setResult.isOk()).toBe(true);
        expect(argument.getConclusionAt(1)).toBe(newStatement);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });

    it('should remove conclusion at specific position', () => {
      const statements = [statementFactory.build(), statementFactory.build()];
      const result = AtomicArgument.create([], statements);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
        const removeResult = argument.removeConclusionAt(0);

        expect(removeResult.isOk()).toBe(true);
        if (removeResult.isOk()) {
          expect(removeResult.value).toBe(statements[0]);
        }
        expect(argument.getConclusionCount()).toBe(1);
        expect(argument.getConclusionAt(0)).toBe(statements[1]);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
      }
    });
  });

  describe('state transitions', () => {
    it('should handle bootstrap → partial → complete transitions', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Bootstrap state
        expect(argument.isBootstrapArgument()).toBe(true);
        expect(argument.isEmpty()).toBe(true);
        expect(argument.isComplete()).toBe(false);

        // Add premise → partial state
        const premise = statementFactory.build();
        argument.addPremise(premise);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);

        // Add conclusion → complete state
        const conclusion = statementFactory.build();
        argument.addConclusion(conclusion);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(true);
      }
    });

    it('should handle complete → partial → bootstrap transitions', () => {
      const premises = [statementFactory.build()];
      const conclusions = [statementFactory.build()];
      const result = AtomicArgument.create(premises, conclusions);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Complete state
        expect(argument.isComplete()).toBe(true);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isBootstrapArgument()).toBe(false);

        // Remove premise → partial state
        argument.removePremiseAt(0);
        expect(argument.isComplete()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isBootstrapArgument()).toBe(false);

        // Remove conclusion → bootstrap state
        argument.removeConclusionAt(0);
        expect(argument.isComplete()).toBe(false);
        expect(argument.isEmpty()).toBe(true);
        expect(argument.isBootstrapArgument()).toBe(true);
      }
    });

    it('should handle alternate path: conclusion first then premise', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;

        // Add conclusion first
        const conclusion = statementFactory.build();
        argument.addConclusion(conclusion);
        expect(argument.isBootstrapArgument()).toBe(false);
        expect(argument.isEmpty()).toBe(false);
        expect(argument.isComplete()).toBe(false);
        expect(argument.hasConclusionSet()).toBe(true);
        expect(argument.hasPremiseSet()).toBe(false);

        // Add premise to complete
        const premise = statementFactory.build();
        argument.addPremise(premise);
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
        argument.addPremise(statementFactory.build());
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        expect(argument.getModifiedAt()).toBeGreaterThan(initialTimestamp);

        // Second modification
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
        argument.addConclusion(statementFactory.build());
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);

        // Third modification (removing)
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 3000);
        argument.removePremiseAt(0);
        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 3000);
      }
    });
  });

  describe('legacy compatibility', () => {
    it('should support hasPremiseSet method', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.hasPremiseSet()).toBe(false);

        argument.addPremise(statementFactory.build());
        expect(argument.hasPremiseSet()).toBe(true);
      }
    });

    it('should support hasConclusionSet method', () => {
      const result = AtomicArgument.create();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const argument = result.value;
        expect(argument.hasConclusionSet()).toBe(false);

        argument.addConclusion(statementFactory.build());
        expect(argument.hasConclusionSet()).toBe(true);
      }
    });
  });
});
