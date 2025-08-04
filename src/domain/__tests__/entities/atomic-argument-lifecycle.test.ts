/**
 * AtomicArgument Lifecycle Test Suite
 *
 * Tests focused on creation, reconstruction, and basic validation patterns.
 * Covers the fundamental lifecycle operations of AtomicArgument entities.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, SideLabels } from '../../entities/AtomicArgument.js';
import { ValidationError } from '../../shared/result.js';
import { SideLabel } from '../../shared/value-objects/index.js';
import {
  atomicArgumentIdFactory,
  orderedSetIdFactory,
  statementFactory,
} from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

// Property-based test generators for AtomicArgument domain
const validSideLabelsArbitrary = fc
  .record({
    left: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    right: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  })
  .map((labels) => {
    const leftLabel = labels.left !== null ? SideLabel.create(labels.left) : null;
    const rightLabel = labels.right !== null ? SideLabel.create(labels.right) : null;

    const left = leftLabel?.isOk() ? leftLabel.value : undefined;
    const right = rightLabel?.isOk() ? rightLabel.value : undefined;

    return SideLabels.create(left, right);
  });

const statementArbitrary = fc.constant(null).map(() => statementFactory.build());

const statementArrayArbitrary = fc.array(statementArbitrary, { minLength: 0, maxLength: 5 });

describe('AtomicArgument Lifecycle', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('AtomicArgument Creation', () => {
    describe('basic creation patterns', () => {
      it('should create empty argument (bootstrap case)', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          customExpect(argument).toBeValidAtomicArgument();
          expect(argument.getPremises()).toEqual([]);
          expect(argument.getConclusions()).toEqual([]);
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
        const premises = [statementFactory.build()];
        const result = AtomicArgument.create(premises, []);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremises()).toEqual(premises);
          expect(argument.getConclusions()).toEqual([]);
          expect(argument.hasPremiseSet()).toBe(true);
          expect(argument.hasConclusionSet()).toBe(false);
          expect(argument.getPremises().length === 0).toBe(false);
          expect(argument.getConclusions().length === 0).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should create argument with conclusion set only', () => {
        const conclusions = [statementFactory.build()];
        const result = AtomicArgument.create([], conclusions);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremises()).toEqual([]);
          expect(argument.getConclusions()).toEqual(conclusions);
          expect(argument.hasPremiseSet()).toBe(false);
          expect(argument.hasConclusionSet()).toBe(true);
          expect(argument.getPremises().length === 0).toBe(true);
          expect(argument.getConclusions().length === 0).toBe(false);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should create complete argument with both sets', () => {
        const premises = [statementFactory.build()];
        const conclusions = [statementFactory.build()];
        const result = AtomicArgument.create(premises, conclusions);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremises()).toEqual(premises);
          expect(argument.getConclusions()).toEqual(conclusions);
          expect(argument.hasPremiseSet()).toBe(true);
          expect(argument.hasConclusionSet()).toBe(true);
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(true);
        }
      });

      it('should create arguments with side labels', () => {
        const leftLabel = SideLabel.create('Modus Ponens');
        const rightLabel = SideLabel.create('Rule 1');

        expect(leftLabel.isOk()).toBe(true);
        expect(rightLabel.isOk()).toBe(true);
        if (!leftLabel.isOk() || !rightLabel.isOk()) return;

        const sideLabels = SideLabels.create(leftLabel.value, rightLabel.value);
        const result = AtomicArgument.create([], [], sideLabels);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getSideLabels()).toEqual({ left: 'Modus Ponens', right: 'Rule 1' });
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
        }
      });
    });

    describe('create factory method for complete arguments', () => {
      it('should create complete argument with both sets', () => {
        const premises = [statementFactory.build()];
        const conclusions = [statementFactory.build()];
        const result = AtomicArgument.create(premises, conclusions);

        expect(result.isOk()).toBe(true);
        if (!result.isOk()) return;

        const argument = result.value;
        expect(argument.getPremises()).toEqual(premises);
        expect(argument.getConclusions()).toEqual(conclusions);
        expect(argument.isComplete()).toBe(true);
        expect(argument.isBootstrapArgument()).toBe(false);
      });

      it('should create complete argument with side labels', () => {
        const premises = [statementFactory.build()];
        const conclusions = [statementFactory.build()];

        const leftLabel = SideLabel.create('Complete');
        const rightLabel = SideLabel.create('Arg');

        expect(leftLabel.isOk()).toBe(true);
        expect(rightLabel.isOk()).toBe(true);
        if (!leftLabel.isOk() || !rightLabel.isOk()) return;

        const sideLabels = SideLabels.create(leftLabel.value, rightLabel.value);
        const result = AtomicArgument.create(premises, conclusions, sideLabels);

        expect(result.isOk()).toBe(true);
        if (!result.isOk()) return;

        const argument = result.value;
        expect(argument.getSideLabels()).toEqual({ left: 'Complete', right: 'Arg' });
        expect(argument.isComplete()).toBe(true);
      });
    });

    describe('property-based creation testing', () => {
      it('should handle all valid creation parameter combinations', () => {
        fc.assert(
          fc.property(
            statementArrayArbitrary,
            statementArrayArbitrary,
            validSideLabelsArbitrary,
            (premises, conclusions, sideLabels) => {
              const result = AtomicArgument.create(premises, conclusions, sideLabels);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const argument = result.value;
                customExpect(argument).toBeValidAtomicArgument();
                expect(argument.getPremises()).toEqual(premises);
                expect(argument.getConclusions()).toEqual(conclusions);
                expect(argument.isBootstrapArgument()).toBe(
                  premises.length === 0 && conclusions.length === 0,
                );
                expect(argument.isComplete()).toBe(premises.length > 0 && conclusions.length > 0);
                // Check side labels
                const retrievedLabels = argument.getSideLabels();
                const expectedLeft = sideLabels.getLeft()?.getValue();
                const expectedRight = sideLabels.getRight()?.getValue();

                expect(retrievedLabels.left).toBe(expectedLeft);
                expect(retrievedLabels.right).toBe(expectedRight);
              }
            },
          ),
        );
      });
    });
  });

  describe('AtomicArgument Reconstruction', () => {
    describe('valid reconstruction cases', () => {
      it('should reconstruct arguments with all parameters', () => {
        const id = atomicArgumentIdFactory.build();
        const premises = [statementFactory.build()];
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
          expect(argument.getId().equals(id)).toBe(true);
          expect(argument.getPremises()).toEqual(premises);
          expect(argument.getConclusions()).toEqual(conclusions);
          expect(argument.getCreatedAt()).toBe(createdAt);
          expect(argument.getModifiedAt()).toBe(modifiedAt);
          expect(argument.getSideLabels()).toEqual(sideLabels);
        }
      });

      it('should reconstruct with empty arrays', () => {
        const id = atomicArgumentIdFactory.build();
        const result = AtomicArgument.reconstruct(id, [], [], FIXED_TIMESTAMP, FIXED_TIMESTAMP);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.isBootstrapArgument()).toBe(true);
          expect(argument.getSideLabels()).toEqual({});
        }
      });

      it('should handle property-based reconstruction', () => {
        fc.assert(
          fc.property(
            fc.array(statementArbitrary, { maxLength: 3 }),
            fc.array(statementArbitrary, { maxLength: 3 }),
            fc.nat(),
            fc.nat(),
            validSideLabelsArbitrary,
            (premises, conclusions, createdAtBase, modifiedAtOffset, sideLabels) => {
              // Ensure modifiedAt >= createdAt by using createdAt as base and adding offset
              const createdAt = createdAtBase;
              const modifiedAt = createdAt + modifiedAtOffset;

              const id = atomicArgumentIdFactory.build();
              const sideLabelsValue: { left?: string; right?: string } = {};
              const leftValue = sideLabels.getLeft()?.getValue();
              const rightValue = sideLabels.getRight()?.getValue();

              if (leftValue !== undefined) {
                sideLabelsValue.left = leftValue;
              }
              if (rightValue !== undefined) {
                sideLabelsValue.right = rightValue;
              }

              const result = AtomicArgument.reconstruct(
                id,
                premises,
                conclusions,
                createdAt,
                modifiedAt,
                sideLabelsValue,
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const argument = result.value;
                expect(argument.getId().equals(id)).toBe(true);
                expect(argument.getPremises()).toEqual(premises);
                expect(argument.getConclusions()).toEqual(conclusions);
                expect(argument.getCreatedAt()).toBe(createdAt);
                expect(argument.getModifiedAt()).toBe(modifiedAt);
              }
            },
          ),
        );
      });
    });

    describe('reconstruction validation', () => {
      it('should fail reconstruction with invalid timestamps', () => {
        const id = atomicArgumentIdFactory.build();
        const futureTime = FIXED_TIMESTAMP + 1000;
        const pastTime = FIXED_TIMESTAMP - 1000;

        const result = AtomicArgument.reconstruct(id, [], [], futureTime, pastTime);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('modified');
        }
      });

      it('should fail reconstruction with negative timestamps', () => {
        const id = atomicArgumentIdFactory.build();
        const result = AtomicArgument.reconstruct(id, [], [], -1, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('Timestamp');
        }
      });
    });
  });

  describe('Basic Validation', () => {
    describe('argument state validation', () => {
      it('should validate bootstrap arguments', () => {
        const result = AtomicArgument.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.isBootstrapArgument()).toBe(true);
          expect(argument.isEmpty()).toBe(true);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should validate partial arguments', () => {
        const premises = [statementFactory.build()];
        const result = AtomicArgument.create(premises, []);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should validate complete arguments', () => {
        const premises = [statementFactory.build()];
        const conclusions = [statementFactory.build()];
        const result = AtomicArgument.create(premises, conclusions);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(true);
        }
      });
    });

    describe('immutability verification', () => {
      it('should preserve core immutable properties', () => {
        const result = AtomicArgument.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const originalId = argument.getId();
          const originalCreatedAt = argument.getCreatedAt();

          // Verify these properties cannot be modified externally
          expect(argument.getId()).toBe(originalId);
          expect(argument.getCreatedAt()).toBe(originalCreatedAt);
        }
      });
    });
  });

  describe('Equality and Comparison', () => {
    describe('identity-based equality', () => {
      it('should implement identity-based equality', () => {
        const result1 = AtomicArgument.create();
        const result2 = AtomicArgument.create();

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          expect(result1.value.equals(result1.value)).toBe(true); // Same instance
          expect(result1.value.equals(result2.value)).toBe(false); // Different instances
        }
      });

      it('should handle null comparisons', () => {
        const result = AtomicArgument.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.equals(null as any)).toBe(false);
          expect(argument.equals(undefined as any)).toBe(false);
        }
      });
    });

    describe('equality properties', () => {
      it('should satisfy reflexivity', () => {
        const result = AtomicArgument.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.equals(argument)).toBe(true);
        }
      });

      it('should satisfy symmetry', () => {
        const result1 = AtomicArgument.create();
        const result2 = AtomicArgument.create();

        expect(result1.isOk()).toBe(true);
        expect(result2.isOk()).toBe(true);

        if (result1.isOk() && result2.isOk()) {
          expect(result1.value.equals(result2.value)).toBe(result2.value.equals(result1.value));
        }
      });

      it('should satisfy transitivity', () => {
        const result = AtomicArgument.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const sameArgument = argument;
          const alsoSameArgument = argument;

          expect(argument.equals(sameArgument) && sameArgument.equals(alsoSameArgument)).toBe(true);
          expect(argument.equals(alsoSameArgument)).toBe(true);
        }
      });
    });
  });

  describe('String Representation', () => {
    describe('toString method', () => {
      it('should provide meaningful string representation for bootstrap arguments', () => {
        const result = AtomicArgument.create();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('AtomicArgument');
          expect(str).toContain('bootstrap');
          expect(str).toContain(argument.getId().toString());
        }
      });

      it('should provide meaningful string representation for partial arguments', () => {
        const premises = [statementFactory.build()];
        const result = AtomicArgument.create(premises, []);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('AtomicArgument');
          expect(str).toContain('premise');
        }
      });

      it('should provide meaningful string representation for complete arguments', () => {
        const premises = [statementFactory.build()];
        const conclusions = [statementFactory.build()];
        const result = AtomicArgument.create(premises, conclusions);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('AtomicArgument');
          expect(str).toContain('premise');
          expect(str).toContain('conclusion');
        }
      });

      it('should include side labels in string representation', () => {
        const leftLabel = SideLabel.create('MP');
        const rightLabel = SideLabel.create('Rule1');

        expect(leftLabel.isOk()).toBe(true);
        expect(rightLabel.isOk()).toBe(true);
        if (!leftLabel.isOk() || !rightLabel.isOk()) return;

        const sideLabels = SideLabels.create(leftLabel.value, rightLabel.value);
        const result = AtomicArgument.create([], [], sideLabels);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('MP');
          expect(str).toContain('Rule1');
        }
      });
    });
  });
});
