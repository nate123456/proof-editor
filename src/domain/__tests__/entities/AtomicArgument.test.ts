/**
 * Comprehensive test suite for AtomicArgument entity - critical reasoning component
 *
 * Priority: CRITICAL (Core entity for logical argument construction)
 * Demonstrates:
 * - AtomicArgument creation and validation patterns
 * - OrderedSet reference management and connection logic
 * - Immutability verification and state transitions
 * - Property-based testing for complex scenarios
 * - Connection safety and cycle detection
 * - Bootstrap argument handling
 * - Strategy analysis functionality
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument, type SideLabels } from '../../entities/AtomicArgument.js';
import { ValidationError } from '../../shared/result.js';
import { OrderedSetId } from '../../shared/value-objects.js';
import { atomicArgumentIdFactory, orderedSetIdFactory, testScenarios } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';

// Property-based test generators for AtomicArgument domain
const validSideLabelsArbitrary = fc.record({
  left: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  right: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
});

// Fast-check arbitraries for factory replacements
const orderedSetIdArbitrary = fc.constant(null).map(() => orderedSetIdFactory.build());
const _atomicArgumentIdArbitrary = fc.constant(null).map(() => atomicArgumentIdFactory.build());

describe('AtomicArgument Entity', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
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
          expect(argument.getPremiseSetRef()).toBeNull();
          expect(argument.getConclusionSetRef()).toBeNull();
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
          expect(argument.getPremiseSetRef()).toBe(premiseSetRef);
          expect(argument.getConclusionSetRef()).toBeNull();
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
          expect(argument.getPremiseSetRef()).toBeNull();
          expect(argument.getConclusionSetRef()).toBe(conclusionSetRef);
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
          expect(argument.getPremiseSetRef()).toBe(premiseSetRef);
          expect(argument.getConclusionSetRef()).toBe(conclusionSetRef);
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

        expect(argument.getPremiseSetRef()).toBe(premiseSetRef);
        expect(argument.getConclusionSetRef()).toBe(conclusionSetRef);
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
              const result = AtomicArgument.create(premiseRef, conclusionRef, sideLabels);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const argument = result.value;
                customExpect(argument).toBeValidAtomicArgument();
                expect(argument.getPremiseSetRef()).toBe(premiseRef ?? null);
                expect(argument.getConclusionSetRef()).toBe(conclusionRef ?? null);
                expect(argument.isBootstrapArgument()).toBe(!premiseRef && !conclusionRef);
                expect(argument.isComplete()).toBe(!!premiseRef && !!conclusionRef);
                expect(argument.getSideLabels()).toEqual(sideLabels);
              }
            }
          )
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
          sideLabels
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getId()).toBe(id);
          expect(argument.getPremiseSetRef()).toBe(premiseSetRef);
          expect(argument.getConclusionSetRef()).toBe(conclusionSetRef);
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
            (premiseRef, conclusionRef, createdAt, modifiedAt, sideLabels) => {
              const id = atomicArgumentIdFactory.build();
              const result = AtomicArgument.reconstruct(
                id,
                premiseRef ?? null,
                conclusionRef ?? null,
                createdAt,
                modifiedAt,
                sideLabels
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const argument = result.value;
                expect(argument.getId()).toBe(id);
                expect(argument.getPremiseSetRef()).toBe(premiseRef ?? null);
                expect(argument.getConclusionSetRef()).toBe(conclusionRef ?? null);
                expect(argument.getCreatedAt()).toBe(createdAt);
                expect(argument.getModifiedAt()).toBe(modifiedAt);
              }
            }
          )
        );
      });
    });
  });

  describe('OrderedSet Reference Management', () => {
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

          expect(argument.getPremiseSetRef()).toBe(premiseSetRef);
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

          expect(argument.getPremiseSetRef()).toBeNull();
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

          expect(argument.getConclusionSetRef()).toBe(conclusionSetRef);
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

          expect(argument.getConclusionSetRef()).toBeNull();
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
    });
  });

  describe('Side Labels Management', () => {
    describe('side label updates', () => {
      it('should update complete side labels', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const newLabels: SideLabels = { left: 'New Left', right: 'New Right' };

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const updateResult = argument.updateSideLabels(newLabels);

          expect(updateResult.isOk()).toBe(true);
          expect(argument.getSideLabels()).toEqual(newLabels);
          expect(argument.hasSideLabels()).toBe(true);
          expect(argument.hasLeftSideLabel()).toBe(true);
          expect(argument.hasRightSideLabel()).toBe(true);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        }
      });

      it('should update partial side labels', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const partialLabels: SideLabels = { left: 'Only Left' };

          const updateResult = argument.updateSideLabels(partialLabels);

          expect(updateResult.isOk()).toBe(true);
          expect(argument.getSideLabels()).toEqual(partialLabels);
          expect(argument.hasLeftSideLabel()).toBe(true);
          expect(argument.hasRightSideLabel()).toBe(false);
          expect(argument.hasSideLabels()).toBe(true);
        }
      });

      it('should clear side labels', () => {
        const sideLabels: SideLabels = { left: 'Clear Me', right: 'Me Too' };
        const result = AtomicArgument.create(undefined, undefined, sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          const updateResult = argument.updateSideLabels({});
          expect(updateResult.isOk()).toBe(true);
          expect(argument.getSideLabels()).toEqual({});
          expect(argument.hasSideLabels()).toBe(false);
        }
      });
    });

    describe('individual side label updates', () => {
      it('should set left side label', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);
          const setResult = argument.setLeftSideLabel('Left Label');

          expect(setResult.isOk()).toBe(true);
          expect(argument.getSideLabels().left).toBe('Left Label');
          expect(argument.hasLeftSideLabel()).toBe(true);
          expect(argument.hasRightSideLabel()).toBe(false);
          expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
        }
      });

      it('should clear left side label', () => {
        const sideLabels: SideLabels = { left: 'Remove Me' };
        const result = AtomicArgument.create(undefined, undefined, sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          const clearResult = argument.setLeftSideLabel(undefined);
          expect(clearResult.isOk()).toBe(true);
          expect(argument.getSideLabels().left).toBeUndefined();
          expect(argument.hasLeftSideLabel()).toBe(false);
        }
      });

      it('should set right side label', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          const setResult = argument.setRightSideLabel('Right Label');
          expect(setResult.isOk()).toBe(true);
          expect(argument.getSideLabels().right).toBe('Right Label');
          expect(argument.hasRightSideLabel()).toBe(true);
          expect(argument.hasLeftSideLabel()).toBe(false);
        }
      });

      it('should clear right side label', () => {
        const sideLabels: SideLabels = { right: 'Remove Me' };
        const result = AtomicArgument.create(undefined, undefined, sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          const clearResult = argument.setRightSideLabel(undefined);
          expect(clearResult.isOk()).toBe(true);
          expect(argument.getSideLabels().right).toBeUndefined();
          expect(argument.hasRightSideLabel()).toBe(false);
        }
      });
    });

    describe('side label edge cases', () => {
      it('should handle empty string labels correctly', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;

          const setResult = argument.setLeftSideLabel('   ');
          expect(setResult.isOk()).toBe(true);
          expect(argument.getSideLabels().left).toBe('   ');
          expect(argument.hasLeftSideLabel()).toBe(false); // Whitespace-only is false
        }
      });

      it('should handle whitespace-only labels in detection', () => {
        const sideLabels: SideLabels = { left: '', right: '   ' };
        const result = AtomicArgument.create(undefined, undefined, sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.hasLeftSideLabel()).toBe(false);
          expect(argument.hasRightSideLabel()).toBe(false);
          expect(argument.hasSideLabels()).toBe(false);
        }
      });
    });
  });

  describe('Connection Capabilities', () => {
    describe('direct connection testing', () => {
      it('should detect when this conclusion connects to other premise', () => {
        const sharedSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();
        const premiseSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(premiseSetRef, sharedSetRef);
        const argument2 = AtomicArgument.createComplete(sharedSetRef, conclusionSetRef);

        expect(argument1.canConnectToPremiseOf(argument2)).toBe(true);
        expect(argument2.canConnectToPremiseOf(argument1)).toBe(false);
      });

      it('should detect when this premise connects to other conclusion', () => {
        const sharedSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();
        const premiseSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(sharedSetRef, conclusionSetRef);
        const argument2 = AtomicArgument.createComplete(premiseSetRef, sharedSetRef);

        expect(argument1.canConnectToConclusionOf(argument2)).toBe(true);
        expect(argument2.canConnectToConclusionOf(argument1)).toBe(false);
      });

      it('should detect bidirectional connections', () => {
        const sharedSetRef = orderedSetIdFactory.build();
        const otherSetRef1 = orderedSetIdFactory.build();
        const otherSetRef2 = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(otherSetRef1, sharedSetRef);
        const argument2 = AtomicArgument.createComplete(sharedSetRef, otherSetRef2);

        expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
        expect(argument2.isDirectlyConnectedTo(argument1)).toBe(true);
      });

      it('should handle arguments with no connections', () => {
        const argument1 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );
        const argument2 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        expect(argument1.canConnectToPremiseOf(argument2)).toBe(false);
        expect(argument1.canConnectToConclusionOf(argument2)).toBe(false);
        expect(argument1.isDirectlyConnectedTo(argument2)).toBe(false);
      });

      it('should handle incomplete arguments in connection testing', () => {
        const sharedSetRef = orderedSetIdFactory.build();
        const completeArgument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          sharedSetRef
        );
        const incompleteArgumentResult = AtomicArgument.create(sharedSetRef);

        expect(incompleteArgumentResult.isOk()).toBe(true);
        if (incompleteArgumentResult.isOk()) {
          expect(completeArgument.canConnectToPremiseOf(incompleteArgumentResult.value)).toBe(true);
          expect(incompleteArgumentResult.value.canConnectToConclusionOf(completeArgument)).toBe(
            true
          );
        }
      });
    });

    describe('ordered set sharing', () => {
      it('should detect shared premise sets', () => {
        const sharedPremiseRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.create(sharedPremiseRef, orderedSetIdFactory.build());
        const argument2 = AtomicArgument.create(sharedPremiseRef, orderedSetIdFactory.build());

        expect(argument1.isOk()).toBe(true);
        expect(argument2.isOk()).toBe(true);

        if (argument1.isOk() && argument2.isOk()) {
          expect(argument1.value.sharesOrderedSetWith(argument2.value)).toBe(true);
          expect(argument1.value.sharesSetWith(argument2.value)).toBe(true);
        }
      });

      it('should detect shared conclusion sets', () => {
        const sharedConclusionRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.create(orderedSetIdFactory.build(), sharedConclusionRef);
        const argument2 = AtomicArgument.create(orderedSetIdFactory.build(), sharedConclusionRef);

        expect(argument1.isOk()).toBe(true);
        expect(argument2.isOk()).toBe(true);

        if (argument1.isOk() && argument2.isOk()) {
          expect(argument1.value.sharesOrderedSetWith(argument2.value)).toBe(true);
        }
      });

      it('should detect connection sharing', () => {
        const sharedSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.create(orderedSetIdFactory.build(), sharedSetRef);
        const argument2 = AtomicArgument.create(sharedSetRef, orderedSetIdFactory.build());

        expect(argument1.isOk()).toBe(true);
        expect(argument2.isOk()).toBe(true);

        if (argument1.isOk() && argument2.isOk()) {
          expect(argument1.value.sharesOrderedSetWith(argument2.value)).toBe(true);
          expect(argument1.value.isDirectlyConnectedTo(argument2.value)).toBe(true);
        }
      });

      it('should handle arguments with no shared sets', () => {
        const argument1 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );
        const argument2 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        expect(argument1.sharesOrderedSetWith(argument2)).toBe(false);
        expect(argument1.sharesSetWith(argument2)).toBe(false);
      });
    });

    describe('connection method compatibility', () => {
      it('should provide canConnectTo method for simple connection testing', () => {
        const sharedSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
        const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

        expect(argument1.canConnectTo(argument2)).toBe(true);
        expect(argument2.canConnectTo(argument1)).toBe(false);
      });

      it('should require both conclusion and premise for canConnectTo', () => {
        const incompleteArgument1 = AtomicArgument.create(orderedSetIdFactory.build()); // No conclusion
        const incompleteArgument2 = AtomicArgument.create(undefined, orderedSetIdFactory.build()); // No premise

        expect(incompleteArgument1.isOk()).toBe(true);
        expect(incompleteArgument2.isOk()).toBe(true);

        if (incompleteArgument1.isOk() && incompleteArgument2.isOk()) {
          expect(incompleteArgument1.value.canConnectTo(incompleteArgument2.value)).toBe(false);
        }
      });
    });
  });

  describe('Branching Operations', () => {
    describe('branching from conclusion', () => {
      it('should create branch from conclusion successfully', () => {
        const conclusionSetRef = orderedSetIdFactory.build();
        const parentArgument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          conclusionSetRef
        );

        const branchResult = parentArgument.createBranchFromConclusion();
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branchArgument = branchResult.value;
          expect(branchArgument.getPremiseSetRef()).toBe(conclusionSetRef);
          expect(branchArgument.getConclusionSetRef()).toBeNull();
          expect(parentArgument.canConnectToPremiseOf(branchArgument)).toBe(true);
        }
      });

      it('should fail to branch from argument without conclusion', () => {
        const argumentWithoutConclusion = AtomicArgument.create(orderedSetIdFactory.build());
        expect(argumentWithoutConclusion.isOk()).toBe(true);

        if (argumentWithoutConclusion.isOk()) {
          const branchResult = argumentWithoutConclusion.value.createBranchFromConclusion();
          expect(branchResult.isErr()).toBe(true);

          if (branchResult.isErr()) {
            customExpect(branchResult.error).toBeValidationError(
              'Cannot branch from argument without conclusion set'
            );
          }
        }
      });

      it('should create child argument from conclusion', () => {
        const conclusionSetRef = orderedSetIdFactory.build();
        const parentArgument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          conclusionSetRef
        );

        const childArgument = parentArgument.createChildArgument();
        expect(childArgument.getPremiseSetRef()).toBe(conclusionSetRef);
        expect(childArgument.getConclusionSetRef()).toBeNull();
        expect(parentArgument.canConnectToPremiseOf(childArgument)).toBe(true);
      });

      it('should throw when creating child from argument without conclusion', () => {
        const argumentWithoutConclusion = AtomicArgument.create(orderedSetIdFactory.build());
        expect(argumentWithoutConclusion.isOk()).toBe(true);

        if (argumentWithoutConclusion.isOk()) {
          expect(() => argumentWithoutConclusion.value.createChildArgument()).toThrow(
            ValidationError
          );
          expect(() => argumentWithoutConclusion.value.createChildArgument()).toThrow(
            'Cannot create child argument without conclusion set'
          );
        }
      });
    });

    describe('branching to premise', () => {
      it('should create branch to premise successfully', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const childArgument = AtomicArgument.createComplete(
          premiseSetRef,
          orderedSetIdFactory.build()
        );

        const branchResult = childArgument.createBranchToPremise();
        expect(branchResult.isOk()).toBe(true);

        if (branchResult.isOk()) {
          const branchArgument = branchResult.value;
          expect(branchArgument.getPremiseSetRef()).toBeNull();
          expect(branchArgument.getConclusionSetRef()).toBe(premiseSetRef);
          expect(branchArgument.canConnectToPremiseOf(childArgument)).toBe(true);
        }
      });

      it('should fail to branch to argument without premise', () => {
        const argumentWithoutPremise = AtomicArgument.create(
          undefined,
          orderedSetIdFactory.build()
        );
        expect(argumentWithoutPremise.isOk()).toBe(true);

        if (argumentWithoutPremise.isOk()) {
          const branchResult = argumentWithoutPremise.value.createBranchToPremise();
          expect(branchResult.isErr()).toBe(true);

          if (branchResult.isErr()) {
            customExpect(branchResult.error).toBeValidationError(
              'Cannot branch to argument without premise set'
            );
          }
        }
      });
    });

    describe('branching scenarios from test data', () => {
      it('should handle simple logical chain branching', () => {
        // Use test data for context but create our own chain
        // Simulate creating chain: premises[0] → conclusions[0] → conclusions[1]
        const premiseRef1 = orderedSetIdFactory.build();
        const conclusionRef1 = orderedSetIdFactory.build();
        const conclusionRef2 = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(premiseRef1, conclusionRef1);
        const branchResult = argument1.createBranchFromConclusion();

        expect(branchResult.isOk()).toBe(true);
        if (branchResult.isOk()) {
          const argument2 = branchResult.value;
          argument2.setConclusionSetRef(conclusionRef2);

          expect(argument1.canConnectToPremiseOf(argument2)).toBe(true);
          expect(argument2.isComplete()).toBe(true);
          customExpect([argument1, argument2]).toHaveValidConnections();
        }
      });
    });
  });

  describe('Connection Safety and Validation', () => {
    describe('cycle detection', () => {
      it('should detect direct cycles', () => {
        const setRef1 = orderedSetIdFactory.build();
        const setRef2 = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(setRef1, setRef2);
        const argument2 = AtomicArgument.createComplete(setRef2, setRef1);

        expect(argument1.wouldCreateDirectCycle(argument2)).toBe(true);
        expect(argument2.wouldCreateDirectCycle(argument1)).toBe(true);
      });

      it('should not detect cycles in non-connecting arguments', () => {
        const argument1 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );
        const argument2 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        expect(argument1.wouldCreateDirectCycle(argument2)).toBe(false);
        expect(argument2.wouldCreateDirectCycle(argument1)).toBe(false);
      });

      it('should not detect cycles in one-way connections', () => {
        const sharedSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
        const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

        expect(argument1.wouldCreateDirectCycle(argument2)).toBe(false);
        expect(argument2.wouldCreateDirectCycle(argument1)).toBe(false);
      });
    });

    describe('connection safety validation', () => {
      it('should validate safe connections', () => {
        const sharedSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(orderedSetIdFactory.build(), sharedSetRef);
        const argument2 = AtomicArgument.createComplete(sharedSetRef, orderedSetIdFactory.build());

        const validationResult = argument1.validateConnectionSafety(argument2);
        expect(validationResult.isOk()).toBe(true);

        if (validationResult.isOk()) {
          expect(validationResult.value).toBe(true);
        }
      });

      it('should reject self-connection', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const validationResult = argument.validateConnectionSafety(argument);
        expect(validationResult.isErr()).toBe(true);

        if (validationResult.isErr()) {
          customExpect(validationResult.error).toBeValidationError(
            'Cannot connect argument to itself'
          );
        }
      });

      it('should reject connection from argument without conclusion', () => {
        const argumentWithoutConclusion = AtomicArgument.create(orderedSetIdFactory.build());
        const targetArgument = AtomicArgument.create(orderedSetIdFactory.build());

        expect(argumentWithoutConclusion.isOk()).toBe(true);
        expect(targetArgument.isOk()).toBe(true);

        if (argumentWithoutConclusion.isOk() && targetArgument.isOk()) {
          const validationResult = argumentWithoutConclusion.value.validateConnectionSafety(
            targetArgument.value
          );
          expect(validationResult.isErr()).toBe(true);

          if (validationResult.isErr()) {
            customExpect(validationResult.error).toBeValidationError(
              'Source argument has no conclusion set'
            );
          }
        }
      });

      it('should reject connection to argument without premise', () => {
        const sourceArgument = AtomicArgument.create(undefined, orderedSetIdFactory.build());
        const targetWithoutPremise = AtomicArgument.create(undefined, orderedSetIdFactory.build());

        expect(sourceArgument.isOk()).toBe(true);
        expect(targetWithoutPremise.isOk()).toBe(true);

        if (sourceArgument.isOk() && targetWithoutPremise.isOk()) {
          const validationResult = sourceArgument.value.validateConnectionSafety(
            targetWithoutPremise.value
          );
          expect(validationResult.isErr()).toBe(true);

          if (validationResult.isErr()) {
            customExpect(validationResult.error).toBeValidationError(
              'Target argument has no premise set'
            );
          }
        }
      });

      it('should reject connections that would create direct cycles', () => {
        const setRef1 = orderedSetIdFactory.build();
        const setRef2 = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(setRef1, setRef2);
        const argument2 = AtomicArgument.createComplete(setRef2, setRef1);

        const validationResult = argument1.validateConnectionSafety(argument2);
        expect(validationResult.isErr()).toBe(true);

        if (validationResult.isErr()) {
          customExpect(validationResult.error).toBeValidationError(
            'Connection would create direct cycle'
          );
        }
      });
    });
  });

  describe('Immutability Verification', () => {
    describe('core immutable properties', () => {
      it('should maintain immutability of ID and timestamps', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const originalId = argument.getId();
        const originalCreatedAt = argument.getCreatedAt();

        // Attempt to modify (should have no effect on core immutable properties)
        argument.setPremiseSetRef(orderedSetIdFactory.build());

        expect(argument.getId()).toBe(originalId);
        expect(argument.getCreatedAt()).toBe(originalCreatedAt);
      });

      it('should update modification timestamp on changes', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const originalModified = argument.getModifiedAt();

        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);
        argument.setPremiseSetRef(orderedSetIdFactory.build());

        expect(argument.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);
        expect(argument.getModifiedAt()).toBeGreaterThan(originalModified);
      });

      it('should provide defensive copies of side labels', () => {
        const sideLabels: SideLabels = { left: 'Original Left', right: 'Original Right' };
        const result = AtomicArgument.create(undefined, undefined, sideLabels);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const retrievedLabels = argument.getSideLabels();

          // Modify the retrieved object
          retrievedLabels.left = 'Modified';
          retrievedLabels.right = 'Also Modified';

          // Original should be unchanged
          const freshLabels = argument.getSideLabels();
          expect(freshLabels.left).toBe('Original Left');
          expect(freshLabels.right).toBe('Original Right');
        }
      });
    });

    describe('reference immutability', () => {
      it('should maintain consistent reference identity', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();

        const argument = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);

        const retrievedPremise1 = argument.getPremiseSetRef();
        const retrievedPremise2 = argument.getPremiseSetRef();
        const retrievedConclusion1 = argument.getConclusionSetRef();
        const retrievedConclusion2 = argument.getConclusionSetRef();

        expect(retrievedPremise1).toBe(retrievedPremise2);
        expect(retrievedConclusion1).toBe(retrievedConclusion2);
        expect(retrievedPremise1).toBe(premiseSetRef);
        expect(retrievedConclusion1).toBe(conclusionSetRef);
      });
    });
  });

  describe('Equality and Comparison', () => {
    describe('identity-based equality', () => {
      it('should implement identity-based equality', () => {
        const premiseSetRef = orderedSetIdFactory.build();
        const conclusionSetRef = orderedSetIdFactory.build();

        const argument1 = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);
        const argument2 = AtomicArgument.createComplete(premiseSetRef, conclusionSetRef);

        // Same properties but different identities
        expect(argument1.equals(argument2)).toBe(false);
        expect(argument1.equals(argument1)).toBe(true);
        expect(argument2.equals(argument2)).toBe(true);
      });

      it('should maintain equality after modifications', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const originalEquals = argument.equals(argument);

        // Modify the argument
        argument.setPremiseSetRef(orderedSetIdFactory.build());
        argument.updateSideLabels({ left: 'Modified' });

        // Should still equal itself
        expect(argument.equals(argument)).toBe(originalEquals);
        expect(argument.equals(argument)).toBe(true);
      });
    });

    describe('equality properties', () => {
      it('should satisfy reflexivity', () => {
        fc.assert(
          fc.property(
            fc.option(orderedSetIdArbitrary),
            fc.option(orderedSetIdArbitrary),
            (premiseRef, conclusionRef) => {
              const result = AtomicArgument.create(premiseRef, conclusionRef);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const argument = result.value;
                expect(argument.equals(argument)).toBe(true);
              }
            }
          )
        );
      });

      it('should satisfy symmetry for inequality', () => {
        const argument1 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );
        const argument2 = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        expect(argument1.equals(argument2)).toBe(argument2.equals(argument1));
        expect(argument1.equals(argument2)).toBe(false);
      });
    });
  });

  describe('String Representation', () => {
    describe('toString method', () => {
      it('should represent complete arguments', () => {
        const premiseRef = OrderedSetId.fromString('premise-set-1');
        const conclusionRef = OrderedSetId.fromString('conclusion-set-1');

        const argument = AtomicArgument.createComplete(premiseRef, conclusionRef);
        const stringRep = argument.toString();

        expect(stringRep).toContain('premise-set-1');
        expect(stringRep).toContain('conclusion-set-1');
        expect(stringRep).toContain('→');
      });

      it('should represent empty arguments', () => {
        const result = AtomicArgument.create();
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const stringRep = argument.toString();

          expect(stringRep).toContain('empty');
          expect(stringRep).toContain('→');
        }
      });

      it('should represent partial arguments', () => {
        const premiseRef = OrderedSetId.fromString('premise-only');
        const result = AtomicArgument.create(premiseRef);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          const stringRep = argument.toString();

          expect(stringRep).toContain('premise-only');
          expect(stringRep).toContain('empty');
          expect(stringRep).toContain('→');
        }
      });
    });
  });

  describe('Strategy Analysis Methods', () => {
    describe('proof strategy identification', () => {
      it('should identify strategies for simple premises and conclusion', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const { premises, conclusions } = testScenarios.simpleChain;
        const strategies = argument.identifyProofStrategies(premises, conclusions[0]);

        expect(strategies.recommendedStrategies).toBeDefined();
        expect(strategies.recommendedStrategies.length).toBeGreaterThan(0);
        expect(strategies.structuralAnalysis).toBeDefined();
        expect(strategies.complexityAssessment).toBeDefined();
        expect(strategies.alternativeApproaches).toBeDefined();
        expect(strategies.prerequisiteChecks).toBeDefined();

        // Should include direct proof strategy
        const directProof = strategies.recommendedStrategies.find(s => s.name === 'Direct Proof');
        expect(directProof).toBeDefined();
        expect(directProof?.confidence).toBeGreaterThan(0);
        expect(directProof?.steps).toBeDefined();
        expect(directProof?.steps.length).toBeGreaterThan(0);
      });

      it('should identify contradiction strategy for complex premises', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const { premises } = testScenarios.complexBranching;
        const strategies = argument.identifyProofStrategies(
          premises,
          'All mentioned entities exist'
        );

        const contradictionProof = strategies.recommendedStrategies.find(
          s => s.name === 'Proof by Contradiction'
        );
        expect(contradictionProof).toBeDefined();
        expect(contradictionProof?.steps).toContain('Assume the negation of the conclusion');
      });

      it('should identify cases strategy for disjunctive premises', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const premises = ['A ∨ B', 'A → C', 'B → C'];
        const conclusion = 'C';
        const strategies = argument.identifyProofStrategies(premises, conclusion);

        const casesProof = strategies.recommendedStrategies.find(s => s.name === 'Proof by Cases');
        expect(casesProof).toBeDefined();
        expect(casesProof?.confidence).toBeGreaterThan(0.8); // Should be high for disjunctive premises
      });

      it('should identify induction strategy for universal quantification', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const { premises } = testScenarios.mathematical;
        const universalConclusion = '∀n > 2, if n is prime then n is odd';
        const strategies = argument.identifyProofStrategies(premises, universalConclusion);

        const inductionProof = strategies.recommendedStrategies.find(
          s => s.name === 'Mathematical Induction'
        );
        expect(inductionProof).toBeDefined();
        expect(inductionProof?.difficulty).toBe('hard');
        expect(inductionProof?.steps).toContain('Prove the base case (typically n = 0 or n = 1)');
      });
    });

    describe('logical structure analysis', () => {
      it('should analyze logical structure correctly', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const premises = ['A → B', '¬C', '∀x P(x)'];
        const conclusion = 'B ∧ ¬C';
        const analysis = argument.identifyProofStrategies(premises, conclusion);

        expect(analysis.structuralAnalysis.hasConditionals).toBe(true);
        expect(analysis.structuralAnalysis.hasNegations).toBe(true);
        expect(analysis.structuralAnalysis.hasQuantifiers).toBe(true);
        expect(analysis.structuralAnalysis.logicalComplexity).toBeGreaterThan(0);
      });

      it('should assess proof complexity appropriately', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const simplePremises = ['A', 'B'];
        const simpleConclusion = 'A and B';
        const simpleAnalysis = argument.identifyProofStrategies(simplePremises, simpleConclusion);

        const complexPremises = [
          '∀x(P(x) → ∃y(Q(y) ∧ R(x,y)))',
          '¬∃z(S(z) ∧ ∀w(T(w) → U(z,w)))',
          '□(A → ◇B)',
        ];
        const complexConclusion = '∀x∃y(P(x) → Q(y))';
        const complexAnalysis = argument.identifyProofStrategies(
          complexPremises,
          complexConclusion
        );

        expect(simpleAnalysis.complexityAssessment.level).toBe('low');
        expect(complexAnalysis.complexityAssessment.level).toBe('high');
        expect(complexAnalysis.complexityAssessment.score).toBeGreaterThan(
          simpleAnalysis.complexityAssessment.score
        );
      });
    });

    describe('strategy recommendations', () => {
      it('should provide alternative approaches', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const premises = ['A → B', 'A'];
        const conclusion = 'B';
        const strategies = argument.identifyProofStrategies(premises, conclusion);

        expect(strategies.alternativeApproaches).toBeDefined();
        expect(strategies.alternativeApproaches.length).toBeGreaterThan(0);
      });

      it('should identify prerequisites for complex strategies', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const premises = ['Base case holds'];
        const inductiveConclusion = '∀n P(n)';
        const strategies = argument.identifyProofStrategies(premises, inductiveConclusion);

        expect(strategies.prerequisiteChecks).toContain(
          'Understanding of natural number properties'
        );
      });

      it('should sort strategies by confidence', () => {
        const argument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );

        const premises = ['A ∨ B', 'A → C', 'B → C'];
        const conclusion = 'C';
        const strategies = argument.identifyProofStrategies(premises, conclusion);

        // Should be sorted by confidence descending
        for (let i = 0; i < strategies.recommendedStrategies.length - 1; i++) {
          expect(strategies.recommendedStrategies[i].confidence).toBeGreaterThanOrEqual(
            strategies.recommendedStrategies[i + 1].confidence
          );
        }
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    describe('boundary conditions', () => {
      it('should handle null ordered set references correctly', () => {
        const result = AtomicArgument.create(null, null);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getPremiseSetRef()).toBeNull();
          expect(argument.getConclusionSetRef()).toBeNull();
          expect(argument.isBootstrapArgument()).toBe(true);
        }
      });

      it('should handle empty side labels correctly', () => {
        const result = AtomicArgument.create(undefined, undefined, {});
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getSideLabels()).toEqual({});
          expect(argument.hasSideLabels()).toBe(false);
        }
      });

      it('should handle undefined ordered set references in connections', () => {
        const completeArgument = AtomicArgument.createComplete(
          orderedSetIdFactory.build(),
          orderedSetIdFactory.build()
        );
        const incompleteArgument = AtomicArgument.create();

        expect(incompleteArgument.isOk()).toBe(true);
        if (incompleteArgument.isOk()) {
          expect(completeArgument.canConnectToPremiseOf(incompleteArgument.value)).toBe(false);
          expect(incompleteArgument.value.canConnectToConclusionOf(completeArgument)).toBe(false);
        }
      });
    });

    describe('timestamp edge cases', () => {
      it('should handle reconstruction with same created and modified timestamps', () => {
        const id = atomicArgumentIdFactory.build();
        const timestamp = FIXED_TIMESTAMP;

        const result = AtomicArgument.reconstruct(id, null, null, timestamp, timestamp);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getCreatedAt()).toBe(timestamp);
          expect(argument.getModifiedAt()).toBe(timestamp);
        }
      });

      it('should handle reconstruction with modified before created', () => {
        const id = atomicArgumentIdFactory.build();
        const createdAt = FIXED_TIMESTAMP;
        const modifiedAt = FIXED_TIMESTAMP - 1000;

        const result = AtomicArgument.reconstruct(id, null, null, createdAt, modifiedAt);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const argument = result.value;
          expect(argument.getCreatedAt()).toBe(createdAt);
          expect(argument.getModifiedAt()).toBe(modifiedAt);
        }
      });
    });
  });

  describe('Property-Based Testing', () => {
    describe('invariant maintenance', () => {
      it('should maintain invariants across state transitions', () => {
        fc.assert(
          fc.property(
            fc.option(orderedSetIdArbitrary),
            fc.option(orderedSetIdArbitrary),
            fc.array(
              fc.oneof(
                fc.constant('setPremise'),
                fc.constant('setConclusion'),
                fc.constant('updateLabels'),
                fc.constant('clearPremise'),
                fc.constant('clearConclusion')
              ),
              { maxLength: 10 }
            ),
            (initialPremise, initialConclusion, operations) => {
              const result = AtomicArgument.create(initialPremise, initialConclusion);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                const argument = result.value;
                const originalId = argument.getId();
                const originalCreatedAt = argument.getCreatedAt();

                for (const operation of operations) {
                  switch (operation) {
                    case 'setPremise':
                      argument.setPremiseSetRef(orderedSetIdFactory.build());
                      break;
                    case 'setConclusion':
                      argument.setConclusionSetRef(orderedSetIdFactory.build());
                      break;
                    case 'updateLabels':
                      argument.updateSideLabels({ left: 'Test', right: 'Updated' });
                      break;
                    case 'clearPremise':
                      argument.setPremiseSetRef(null as any);
                      break;
                    case 'clearConclusion':
                      argument.setConclusionSetRef(null as any);
                      break;
                  }
                }

                // Verify invariants
                expect(argument.getId()).toBe(originalId);
                expect(argument.getCreatedAt()).toBe(originalCreatedAt);
                customExpect(argument).toBeValidAtomicArgument();

                // Bootstrap state consistency
                const isBootstrap = argument.isBootstrapArgument();
                const isEmpty = argument.isEmpty();
                const hasNoPremise = !argument.hasPremiseSet();
                const hasNoConclusion = !argument.hasConclusionSet();

                expect(isBootstrap).toBe(hasNoPremise && hasNoConclusion);
                expect(isEmpty).toBe(isBootstrap);

                // Completeness consistency
                const isComplete = argument.isComplete();
                const hasBothSets = argument.hasPremiseSet() && argument.hasConclusionSet();
                expect(isComplete).toBe(hasBothSets);
              }
            }
          )
        );
      });

      it('should maintain connection consistency properties', () => {
        fc.assert(
          fc.property(
            orderedSetIdArbitrary,
            orderedSetIdArbitrary,
            orderedSetIdArbitrary,
            (sharedSet, otherSet1, otherSet2) => {
              const argument1 = AtomicArgument.createComplete(otherSet1, sharedSet);
              const argument2 = AtomicArgument.createComplete(sharedSet, otherSet2);

              // Connection properties
              expect(argument1.canConnectToPremiseOf(argument2)).toBe(true);
              expect(argument2.canConnectToConclusionOf(argument1)).toBe(true);
              expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
              expect(argument2.isDirectlyConnectedTo(argument1)).toBe(true);
              expect(argument1.sharesOrderedSetWith(argument2)).toBe(true);

              // Safety validation
              const validationResult = argument1.validateConnectionSafety(argument2);
              expect(validationResult.isOk()).toBe(true);
            }
          )
        );
      });
    });

    describe('side label consistency', () => {
      it('should maintain side label detection consistency', () => {
        fc.assert(
          fc.property(validSideLabelsArbitrary, sideLabels => {
            const result = AtomicArgument.create(undefined, undefined, sideLabels);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;
              const retrievedLabels = argument.getSideLabels();

              // Should equal provided labels
              expect(retrievedLabels).toEqual(sideLabels);

              // Detection consistency
              const hasLeft = argument.hasLeftSideLabel();
              const hasRight = argument.hasRightSideLabel();
              const hasSide = argument.hasSideLabels();

              const expectedHasLeft =
                retrievedLabels.left !== undefined &&
                retrievedLabels.left !== null &&
                retrievedLabels.left.trim().length > 0;
              const expectedHasRight =
                retrievedLabels.right !== undefined &&
                retrievedLabels.right !== null &&
                retrievedLabels.right.trim().length > 0;
              const expectedHasSide = expectedHasLeft || expectedHasRight;

              expect(hasLeft).toBe(expectedHasLeft);
              expect(hasRight).toBe(expectedHasRight);
              expect(hasSide).toBe(expectedHasSide);
            }
          })
        );
      });
    });
  });
});
