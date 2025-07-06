/**
 * AtomicArgument Lifecycle Test Suite
 *
 * Tests focused on creation, reconstruction, and basic validation patterns.
 * Covers the fundamental lifecycle operations of AtomicArgument entities.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { ValidationError } from '../../shared/result.js';
import { atomicArgumentIdFactory, orderedSetIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

// Property-based test generators for AtomicArgument domain
const validSideLabelsArbitrary = fc
  .record({
    left: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    right: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  })
  .map((labels) => {
    const result: SideLabels = {};
    if (labels.left !== null) result.left = labels.left;
    if (labels.right !== null) result.right = labels.right;
    return result;
  });

const orderedSetIdArbitrary = fc.constant(null).map(() => orderedSetIdFactory.build());

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
        }
      });
    });

    describe('createComplete factory method', () => {
      it('should create complete argument with both sets', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();
        const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);

        expect(argument.getPremiseSet()).toBe(premiseSetRef);
        expect(argument.getConclusionSet()).toBe(conclusionSetRef);
        expect(argument.isComplete()).toBe(true);
        expect(argument.isBootstrapArgument()).toBe(false);
      });

      it('should create complete argument with side labels', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();
        const sideLabels: SideLabels = { left: 'Complete', right: 'Arg' };
        const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef, sideLabels);

        expect(argument.getSideLabels()).toEqual(sideLabels);
        expect(argument.isComplete()).toBe(true);
      });
    });

    describe('property-based creation testing', () => {
      it('should handle all valid creation parameter combinations', () => {
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

      it('should handle property-based reconstruction', () => {
        fc.assert(
          fc.property(
            fc.option(orderedSetIdArbitrary),
            fc.option(orderedSetIdArbitrary),
            fc.nat(),
            fc.nat(),
            validSideLabelsArbitrary,
            (premiseRef, conclusionRef, createdAtBase, modifiedAtOffset, sideLabels) => {
              // Ensure modifiedAt >= createdAt by using createdAt as base and adding offset
              const createdAt = createdAtBase;
              const modifiedAt = createdAt + modifiedAtOffset;

              const id = atomicArgumentIdFactory.build();
              const result = AtomicArgument.reconstruct(
                id,
                premiseRef === null ? null : premiseRef,
                conclusionRef === null ? null : conclusionRef,
                createdAt,
                modifiedAt,
                sideLabels,
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const argument = result.value;
                expect(argument.getId()).toBe(id);
                expect(argument.getPremiseSet()).toBe(premiseRef ?? null);
                expect(argument.getConclusionSet()).toBe(conclusionRef ?? null);
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

        const result = AtomicArgument.reconstruct(id, null, null, futureTime, pastTime);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('modified');
        }
      });

      it('should fail reconstruction with negative timestamps', () => {
        const id = atomicArgumentIdFactory.build();
        const result = AtomicArgument.reconstruct(id, null, null, -1, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain('timestamp');
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
          expect(argument.canPopulate()).toBe(true);
          expect(argument.isEmpty()).toBe(true);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should validate partial arguments', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const result = AtomicArgument.create(premiseSetRef);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.isBootstrapArgument()).toBe(false);
          expect(argument.isEmpty()).toBe(false);
          expect(argument.isComplete()).toBe(false);
        }
      });

      it('should validate complete arguments', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();
        const result = AtomicArgument.create(premiseSetRef, conclusionSetRef);

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
        const premiseSetRef = orderedSetIdFactory.build();
        const result = AtomicArgument.create(premiseSetRef);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('AtomicArgument');
          expect(str).toContain('premise');
          expect(str).toContain(premiseSetRef.toString());
        }
      });

      it('should provide meaningful string representation for complete arguments', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();
        const result = AtomicArgument.create(premiseSetRef, conclusionSetRef);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          const str = argument.toString();
          expect(str).toContain('AtomicArgument');
          expect(str).toContain('premise');
          expect(str).toContain('conclusion');
          expect(str).toContain(premiseSetRef.toString());
          expect(str).toContain(conclusionSetRef.toString());
        }
      });

      it('should include side labels in string representation', () => {
        const sideLabels: SideLabels = { left: 'MP', right: 'Rule1' };
        const result = AtomicArgument.create(undefined, undefined, sideLabels);

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
