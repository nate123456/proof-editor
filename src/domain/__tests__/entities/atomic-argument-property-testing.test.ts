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
import { SideLabel, SideLabels } from '../../shared/value-objects/index.js';
import { statementFactory } from '../factories/index.js';
import { expect as customExpect } from '../test-setup.js';
import { FIXED_TIMESTAMP, validSideLabelsArbitrary } from './atomic-argument-test-utils.js';

// Create arbitrary for statements
const _statementArbitrary = fc.oneof(fc.constant(null), fc.constant(statementFactory.build()));

const statementsArrayArbitrary = fc
  .array(fc.constant(null), {
    minLength: 0,
    maxLength: 3,
  })
  .map((nulls) => nulls.map(() => statementFactory.build()));

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
          statementsArrayArbitrary,
          statementsArrayArbitrary,
          fc.array(
            fc.oneof(
              fc.constant('addPremise'),
              fc.constant('addConclusion'),
              fc.constant('updateLabels'),
              fc.constant('removePremise'),
              fc.constant('removeConclusion'),
            ),
            { maxLength: 10 },
          ),
          (initialPremises, initialConclusions, operations) => {
            const result = AtomicArgument.create(initialPremises, initialConclusions);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;
              const originalId = argument.getId();
              const originalCreatedAt = argument.getCreatedAt();

              for (const operation of operations) {
                switch (operation) {
                  case 'addPremise':
                    argument.addPremise(statementFactory.build());
                    break;
                  case 'addConclusion':
                    argument.addConclusion(statementFactory.build());
                    break;
                  case 'updateLabels':
                    argument.updateSideLabels({ left: 'Test', right: 'Updated' });
                    break;
                  case 'removePremise':
                    if (argument.getPremiseCount() > 0) {
                      argument.removePremiseAt(0);
                    }
                    break;
                  case 'removeConclusion':
                    if (argument.getConclusionCount() > 0) {
                      argument.removeConclusionAt(0);
                    }
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
          fc.constant(statementFactory.build()),
          fc.constant(statementFactory.build()),
          fc.constant(statementFactory.build()),
          (sharedStatement, otherStatement1, otherStatement2) => {
            const argument1Result = AtomicArgument.create([otherStatement1], [sharedStatement]);
            const argument2Result = AtomicArgument.create([sharedStatement], [otherStatement2]);

            expect(argument1Result.isOk()).toBe(true);
            expect(argument2Result.isOk()).toBe(true);

            if (argument1Result.isOk() && argument2Result.isOk()) {
              const argument1 = argument1Result.value;
              const argument2 = argument2Result.value;

              // Connection properties
              expect(argument1.isDirectlyConnectedTo(argument2)).toBe(true);
              expect(argument2.isDirectlyConnectedTo(argument1)).toBe(true);
              expect(argument1.sharesStatementWith(argument2)).toBe(true);

              // Safety validation
              const validationResult = argument1.validateConnectionSafety(argument2);
              expect(validationResult.isOk()).toBe(true);
            }
          },
        ),
      );
    });

    it('should maintain modification timestamp ordering', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant('addPremise'),
              fc.constant('addConclusion'),
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
                  case 'addPremise':
                    argument.addPremise(statementFactory.build());
                    break;
                  case 'addConclusion':
                    argument.addConclusion(statementFactory.build());
                    break;
                  case 'updateLabels':
                    argument.updateSideLabels({ left: `Label ${index}` });
                    break;
                }

                timestamps.push(argument.getModifiedAt());
              });

              // Timestamps should be monotonically increasing
              for (let i = 1; i < timestamps.length; i++) {
                const current = timestamps[i];
                const previous = timestamps[i - 1];
                if (current !== undefined && previous !== undefined) {
                  expect(current).toBeGreaterThanOrEqual(previous);
                }
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
            const result = AtomicArgument.create([], [], initialLabels);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;

              // Apply update sequence
              updateSequence.forEach((labels) => {
                const updateResult = argument.updateSideLabels(labels.toStrings());
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
            let leftLabel: SideLabel | undefined;
            let rightLabel: SideLabel | undefined;

            if (initialLeft !== null) {
              const leftResult = SideLabel.create(initialLeft);
              if (leftResult.isOk()) {
                leftLabel = leftResult.value;
              }
            }

            if (initialRight !== null) {
              const rightResult = SideLabel.create(initialRight);
              if (rightResult.isOk()) {
                rightLabel = rightResult.value;
              }
            }

            const sideLabels = SideLabels.create(leftLabel, rightLabel);
            const result = AtomicArgument.create([], [], sideLabels);
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
              addPremises: fc.nat({ max: 3 }),
              addConclusions: fc.nat({ max: 3 }),
              removePremises: fc.nat({ max: 2 }),
              removeConclusions: fc.nat({ max: 2 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (transitions) => {
            const result = AtomicArgument.create();
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              const argument = result.value;

              transitions.forEach(
                ({ addPremises, addConclusions, removePremises, removeConclusions }) => {
                  // Add premises
                  for (let i = 0; i < addPremises; i++) {
                    argument.addPremise(statementFactory.build());
                  }

                  // Add conclusions
                  for (let i = 0; i < addConclusions; i++) {
                    argument.addConclusion(statementFactory.build());
                  }

                  // Remove premises (if any exist)
                  for (let i = 0; i < removePremises && argument.getPremiseCount() > 0; i++) {
                    argument.removePremiseAt(0);
                  }

                  // Remove conclusions (if any exist)
                  for (let i = 0; i < removeConclusions && argument.getConclusionCount() > 0; i++) {
                    argument.removeConclusionAt(0);
                  }

                  // Verify state consistency after each transition
                  customExpect(argument).toBeValidAtomicArgument();

                  const isBootstrap =
                    argument.getPremiseCount() === 0 && argument.getConclusionCount() === 0;
                  expect(argument.isBootstrapArgument()).toBe(isBootstrap);

                  const isComplete =
                    argument.getPremiseCount() > 0 && argument.getConclusionCount() > 0;
                  expect(argument.isComplete()).toBe(isComplete);
                },
              );
            }
          },
        ),
      );
    });

    it('should maintain branching consistency', () => {
      fc.assert(
        fc.property(
          statementsArrayArbitrary.filter((arr) => arr.length > 0),
          statementsArrayArbitrary.filter((arr) => arr.length > 0),
          (premises, conclusions) => {
            const parentResult = AtomicArgument.create(premises, conclusions);
            expect(parentResult.isOk()).toBe(true);

            if (parentResult.isOk()) {
              const parent = parentResult.value;

              // Branch from conclusion
              const childResult = parent.createBranchFromConclusion(0);
              expect(childResult.isOk()).toBe(true);

              if (childResult.isOk()) {
                const child = childResult.value;

                // Verify branching properties
                expect(child.getPremises()).toHaveLength(1);
                expect(child.getPremises()[0]).toBe(parent.getConclusions()[0]);
                expect(child.getConclusions()).toHaveLength(0);
                expect(parent.isDirectlyConnectedTo(child)).toBe(true);
                expect(child.isDirectlyConnectedTo(parent)).toBe(true);

                // Complete the child
                child.addConclusion(statementFactory.build());
                expect(child.isComplete()).toBe(true);

                // Connection should still be valid
                expect(parent.isDirectlyConnectedTo(child)).toBe(true);
              }

              // Branch to premise
              const parentOfParentResult = parent.createBranchToPremise(0);
              expect(parentOfParentResult.isOk()).toBe(true);

              if (parentOfParentResult.isOk()) {
                const newParent = parentOfParentResult.value;

                // Verify branching properties
                expect(newParent.getConclusions()).toHaveLength(1);
                expect(newParent.getConclusions()[0]).toBe(parent.getPremises()[0]);
                expect(newParent.getPremises()).toHaveLength(0);
                expect(newParent.isDirectlyConnectedTo(parent)).toBe(true);
              }
            }
          },
        ),
      );
    });
  });
});
