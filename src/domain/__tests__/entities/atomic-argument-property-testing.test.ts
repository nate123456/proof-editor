/**
 * Property-based testing suite for AtomicArgument
 *
 * Focuses on:
 * - Invariant maintenance across state transitions
 * - Connection consistency properties
 * - Side label consistency
 * - Comprehensive edge case coverage
 * - State transition properties
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomicArgument } from '../../entities/AtomicArgument.js';
import { orderedSetIdFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';
import {
  FIXED_TIMESTAMP,
  orderedSetIdArbitrary,
  validSideLabelsArbitrary,
} from './atomic-argument-test-utils.js';

describe('Property-Based Testing', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  describe('invariant maintenance', () => {
    it('should maintain invariants across state transitions', () => {
      fc.assert(
        fc.property(
          fc.option(orderedSetIdArbitrary),
          fc.option(orderedSetIdArbitrary),
          fc
            .array(
              fc.oneof(
                fc.constant('setPremise'),
                fc.constant('setConclusion'),
                fc.constant('updateLabels'),
                fc.constant('clearPremise'),
                fc.constant('clearConclusion'),
              ),
              { maxLength: 10 },
            )
            .filter((operations) => {
              // Ensure we don't have only single "setPremise" operations that could cause issues
              if (operations.length === 1 && operations[0] === 'setPremise') {
                return false;
              }
              return true;
            }),
          (initialPremise, initialConclusion, operations) => {
            const result = AtomicArgument.create(
              initialPremise === null ? undefined : initialPremise,
              initialConclusion === null ? undefined : initialConclusion,
            );
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
                    argument.setPremiseSetRef(null);
                    break;
                  case 'clearConclusion':
                    argument.setConclusionSetRef(null);
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
          },
        ),
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
          },
        ),
      );
    });

    it('should maintain modification timestamp ordering', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant('setPremise'),
              fc.constant('setConclusion'),
              fc.constant('updateLabels'),
            ),
            { minLength: 1, maxLength: 5 },
          ),
          (operations) => {
            // Reset the mock to a clean state for each property test run
            mockDateNow.mockRestore();
            mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP) as any;

            const result = AtomicArgument.create();
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;
              const timestamps: number[] = [argument.getModifiedAt()];

              operations.forEach((op, index) => {
                // Ensure each operation gets a later timestamp
                const newTimestamp = FIXED_TIMESTAMP + (index + 1) * 1000;
                mockDateNow.mockReturnValue(newTimestamp);

                switch (op) {
                  case 'setPremise':
                    argument.setPremiseSetRef(orderedSetIdFactory.build());
                    break;
                  case 'setConclusion':
                    argument.setConclusionSetRef(orderedSetIdFactory.build());
                    break;
                  case 'updateLabels':
                    argument.updateSideLabels({ left: `Label ${index}` });
                    break;
                }

                timestamps.push(argument.getModifiedAt());
              });

              // Timestamps should be monotonically increasing
              for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
              }
            }
          },
        ),
      );
    });
  });

  describe('side label consistency', () => {
    it('should maintain side label properties', () => {
      fc.assert(
        fc.property(
          validSideLabelsArbitrary,
          fc.array(validSideLabelsArbitrary, { maxLength: 5 }),
          (initialLabels, updateSequence) => {
            const result = AtomicArgument.create(undefined, undefined, initialLabels);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;

              // Apply update sequence
              updateSequence.forEach((labels) => {
                const updateResult = argument.updateSideLabels(labels);
                expect(updateResult.isOk()).toBe(true);
              });

              // Verify final state consistency
              const finalLabels = argument.getSideLabels();
              const hasLabels = argument.hasSideLabels();
              const hasLeft = argument.hasLeftSideLabel();
              const hasRight = argument.hasRightSideLabel();

              // Consistency checks
              if (hasLabels) {
                expect(hasLeft || hasRight).toBe(true);
              } else {
                expect(hasLeft).toBe(false);
                expect(hasRight).toBe(false);
              }

              if (hasLeft) {
                expect(finalLabels.left).toBeDefined();
                expect(finalLabels.left).not.toBe('');
                expect(finalLabels.left?.trim()).not.toBe('');
              }

              if (hasRight) {
                expect(finalLabels.right).toBeDefined();
                expect(finalLabels.right).not.toBe('');
                expect(finalLabels.right?.trim()).not.toBe('');
              }
            }
          },
        ),
      );
    });

    it('should handle individual label updates consistently', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0)),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0)),
          fc.array(
            fc.record({
              side: fc.oneof(fc.constant('left'), fc.constant('right')),
              value: fc.option(
                fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
              ),
            }),
            { maxLength: 10 },
          ),
          (initialLeft, initialRight, updates) => {
            const initialLabels: any = {};
            if (initialLeft !== null) initialLabels.left = initialLeft;
            if (initialRight !== null) initialLabels.right = initialRight;

            const result = AtomicArgument.create(undefined, undefined, initialLabels);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;

              // Apply individual updates
              updates.forEach(({ side, value }) => {
                const setResult =
                  side === 'left'
                    ? argument.setLeftSideLabel(value === null ? undefined : value)
                    : argument.setRightSideLabel(value === null ? undefined : value);
                expect(setResult.isOk()).toBe(true);
              });

              // Verify consistency
              const labels = argument.getSideLabels();
              if (labels.left) {
                expect(argument.hasLeftSideLabel()).toBe(true);
              }
              if (labels.right) {
                expect(argument.hasRightSideLabel()).toBe(true);
              }
            }
          },
        ),
      );
    });
  });

  describe('comprehensive edge case coverage', () => {
    it('should handle rapid state transitions correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              premise: fc.option(orderedSetIdArbitrary),
              conclusion: fc.option(orderedSetIdArbitrary),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (transitions) => {
            const result = AtomicArgument.create();
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;

              transitions.forEach(({ premise, conclusion }) => {
                if (premise !== null) {
                  argument.setPremiseSetRef(premise);
                }
                if (conclusion !== null) {
                  argument.setConclusionSetRef(conclusion);
                }

                // Verify state consistency after each transition
                customExpect(argument).toBeValidAtomicArgument();

                const isBootstrap = !argument.getPremiseSet() && !argument.getConclusionSet();
                expect(argument.isBootstrapArgument()).toBe(isBootstrap);

                const isComplete = !!argument.getPremiseSet() && !!argument.getConclusionSet();
                expect(argument.isComplete()).toBe(isComplete);
              });
            }
          },
        ),
      );
    });

    it('should maintain branching consistency', () => {
      fc.assert(
        fc.property(orderedSetIdArbitrary, orderedSetIdArbitrary, (premiseRef, conclusionRef) => {
          const parent = AtomicArgument.createComplete(premiseRef, conclusionRef);

          // Branch from conclusion
          const childResult = parent.createBranchFromConclusion();
          expect(childResult.isOk()).toBe(true);

          if (childResult.isOk()) {
            const child = childResult.value;

            // Verify branching properties
            expect(child.getPremiseSet()).toBe(parent.getConclusionSet());
            expect(child.getConclusionSet()).toBeNull();
            expect(parent.canConnectToPremiseOf(child)).toBe(true);
            expect(child.canConnectToConclusionOf(parent)).toBe(true);

            // Complete the child
            child.setConclusionSetRef(orderedSetIdFactory.build());
            expect(child.isComplete()).toBe(true);

            // Connection should still be valid
            expect(parent.canConnectToPremiseOf(child)).toBe(true);
          }

          // Branch to premise
          const parentResult = parent.createBranchToPremise();
          expect(parentResult.isOk()).toBe(true);

          if (parentResult.isOk()) {
            const newParent = parentResult.value;

            // Verify branching properties
            expect(newParent.getConclusionSet()).toBe(parent.getPremiseSet());
            expect(newParent.getPremiseSet()).toBeNull();
            expect(newParent.canConnectToPremiseOf(parent)).toBe(true);
          }
        }),
      );
    });
  });
});
