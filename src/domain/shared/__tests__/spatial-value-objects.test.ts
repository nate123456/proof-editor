/**
 * Test suite for spatial value objects
 * Tests spatial and layout-related value objects
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  AlignmentMode,
  Attachment,
  ExpansionDirection,
  LayoutStyle,
  NodeId,
  PhysicalProperties,
  Position2D,
} from '../value-objects/index.js';

// Property-based test generators
const validPositionArbitrary = fc.tuple(
  fc.float({ min: -1000, max: 1000, noNaN: true }),
  fc.float({ min: -1000, max: 1000, noNaN: true }),
);
const invalidPositionArbitrary = fc.oneof(
  fc.tuple(fc.constant(Number.NaN), fc.float({ noNaN: true })),
  fc.tuple(fc.float({ noNaN: true }), fc.constant(Number.NaN)),
  fc.tuple(fc.constant(Number.POSITIVE_INFINITY), fc.float({ noNaN: true })),
  fc.tuple(fc.float({ noNaN: true }), fc.constant(Number.NEGATIVE_INFINITY)),
);

describe('Spatial Value Objects', () => {
  describe('Position2D', () => {
    describe('creation and validation', () => {
      it('should create valid Position2D from finite numbers', () => {
        fc.assert(
          fc.property(validPositionArbitrary, ([x, y]) => {
            const result = Position2D.create(x, y);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getX()).toBe(x);
              expect(result.value.getY()).toBe(y);
            }
          }),
        );
      });

      it('should reject infinite or NaN coordinates', () => {
        fc.assert(
          fc.property(invalidPositionArbitrary, ([x, y]) => {
            const result = Position2D.create(x, y);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toMatch(/coordinate must be a finite number/);
            }
          }),
        );
      });

      it('should create origin position', () => {
        const origin = Position2D.origin();
        expect(origin.getX()).toBe(0);
        expect(origin.getY()).toBe(0);
      });
    });

    describe('position operations', () => {
      it('should move by delta correctly', () => {
        fc.assert(
          fc.property(
            validPositionArbitrary,
            validPositionArbitrary,
            ([x, y], [deltaX, deltaY]) => {
              const posResult = Position2D.create(x, y);
              expect(posResult.isOk()).toBe(true);

              if (posResult.isOk()) {
                const position = posResult.value;
                const moveResult = position.moveBy(deltaX, deltaY);

                if (moveResult.isOk()) {
                  expect(moveResult.value.getX()).toBeCloseTo(x + deltaX, 10);
                  expect(moveResult.value.getY()).toBeCloseTo(y + deltaY, 10);
                }
              }
            },
          ),
        );
      });

      it('should calculate distance correctly', () => {
        const pos1Result = Position2D.create(0, 0);
        const pos2Result = Position2D.create(3, 4);

        expect(pos1Result.isOk()).toBe(true);
        expect(pos2Result.isOk()).toBe(true);

        if (pos1Result.isOk() && pos2Result.isOk()) {
          const distance = pos1Result.value.distanceTo(pos2Result.value);
          expect(distance).toBeCloseTo(5, 10); // 3-4-5 triangle
        }
      });

      it('should handle equality correctly', () => {
        const pos1Result = Position2D.create(1.5, 2.5);
        const pos2Result = Position2D.create(1.5, 2.5);
        const pos3Result = Position2D.create(1.5, 3.0);

        expect(pos1Result.isOk()).toBe(true);
        expect(pos2Result.isOk()).toBe(true);
        expect(pos3Result.isOk()).toBe(true);

        if (pos1Result.isOk() && pos2Result.isOk() && pos3Result.isOk()) {
          expect(pos1Result.value.equals(pos2Result.value)).toBe(true);
          expect(pos1Result.value.equals(pos3Result.value)).toBe(false);
        }
      });

      it('should provide meaningful string representation', () => {
        const posResult = Position2D.create(10.5, -20.3);
        expect(posResult.isOk()).toBe(true);

        if (posResult.isOk()) {
          expect(posResult.value.toString()).toBe('(10.5, -20.3)');
        }
      });
    });

    describe('edge cases', () => {
      it('should handle very large coordinates', () => {
        const largeResult = Position2D.create(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
        expect(largeResult.isOk()).toBe(true);
      });

      it('should handle zero coordinates', () => {
        const zeroResult = Position2D.create(0, 0);
        expect(zeroResult.isOk()).toBe(true);

        if (zeroResult.isOk()) {
          expect(zeroResult.value.distanceTo(zeroResult.value)).toBe(0);
        }
      });
    });
  });

  describe('Attachment', () => {
    describe('creation and validation', () => {
      it('should create valid attachment with valid parameters', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getParentNodeId()).toBe(nodeId);
          expect(result.value.getPremisePosition()).toBe(0);
          expect(result.value.getFromPosition()).toBeUndefined();
        }
      });

      it('should create attachment with from position', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 1, 2);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPremisePosition()).toBe(1);
          expect(result.value.getFromPosition()).toBe(2);
        }
      });

      it('should reject negative premise positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Premise position must be a non-negative integer');
        }
      });

      it('should reject non-integer premise positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 1.5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Premise position must be a non-negative integer');
        }
      });

      it('should reject negative from positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0, -1);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('From position must be a non-negative integer');
        }
      });

      it('should reject non-integer from positions', () => {
        const nodeId = NodeId.generate();
        const result = Attachment.create(nodeId, 0, 2.5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('From position must be a non-negative integer');
        }
      });
    });

    describe('attachment operations', () => {
      it('should implement equality correctly', () => {
        const nodeId1 = NodeId.generate();
        const nodeId2 = NodeId.generate();

        const att1Result = Attachment.create(nodeId1, 0, 1);
        const att2Result = Attachment.create(nodeId1, 0, 1);
        const att3Result = Attachment.create(nodeId2, 0, 1);
        const att4Result = Attachment.create(nodeId1, 1, 1);
        const att5Result = Attachment.create(nodeId1, 0, 2);

        expect(att1Result.isOk()).toBe(true);
        expect(att2Result.isOk()).toBe(true);
        expect(att3Result.isOk()).toBe(true);
        expect(att4Result.isOk()).toBe(true);
        expect(att5Result.isOk()).toBe(true);

        if (
          att1Result.isOk() &&
          att2Result.isOk() &&
          att3Result.isOk() &&
          att4Result.isOk() &&
          att5Result.isOk()
        ) {
          expect(att1Result.value.equals(att2Result.value)).toBe(true);
          expect(att1Result.value.equals(att3Result.value)).toBe(false);
          expect(att1Result.value.equals(att4Result.value)).toBe(false);
          expect(att1Result.value.equals(att5Result.value)).toBe(false);
        }
      });

      it('should provide meaningful string representation', () => {
        const nodeIdResult = NodeId.create('test-node-id');
        expect(nodeIdResult.isOk()).toBe(true);

        if (nodeIdResult.isOk()) {
          const nodeId = nodeIdResult.value;

          const simpleResult = Attachment.create(nodeId, 2);
          expect(simpleResult.isOk()).toBe(true);
          if (simpleResult.isOk()) {
            const str = simpleResult.value.toString();
            expect(str).toContain('parent=test-node-id');
            expect(str).toContain('position=2');
            expect(str).not.toContain('from=');
          }

          const complexResult = Attachment.create(nodeId, 1, 3);
          expect(complexResult.isOk()).toBe(true);
          if (complexResult.isOk()) {
            const str = complexResult.value.toString();
            expect(str).toContain('parent=test-node-id');
            expect(str).toContain('position=1');
            expect(str).toContain('from=3');
          }
        }
      });

      it('should handle multiple conclusion source detection', () => {
        const nodeId = NodeId.generate();

        const singleSource = Attachment.create(nodeId, 0);
        expect(singleSource.isOk()).toBe(true);
        if (singleSource.isOk()) {
          expect(singleSource.value.hasMultipleConclusionSource()).toBe(false);
          expect(singleSource.value.getFromPosition()).toBeUndefined();
        }

        const multipleSource = Attachment.create(nodeId, 0, 1);
        expect(multipleSource.isOk()).toBe(true);
        if (multipleSource.isOk()) {
          expect(multipleSource.value.hasMultipleConclusionSource()).toBe(true);
          expect(multipleSource.value.getFromPosition()).toBe(1);
        }
      });

      it('should handle property-based testing correctly', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 100 }),
            fc.option(fc.nat({ max: 100 }), { nil: undefined }),
            (premisePos, fromPos) => {
              const nodeId = NodeId.generate();
              const result = Attachment.create(nodeId, premisePos, fromPos);

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                expect(result.value.getPremisePosition()).toBe(premisePos);
                expect(result.value.getFromPosition()).toBe(fromPos);
              }
            },
          ),
        );
      });
    });
  });

  describe('PhysicalProperties', () => {
    describe('creation and validation', () => {
      it('should create with default values', () => {
        const defaultProps = PhysicalProperties.default();

        expect(defaultProps.getLayoutStyle().getValue()).toBe('bottom-up');
        expect(defaultProps.getSpacingX()).toBe(50);
        expect(defaultProps.getSpacingY()).toBe(40);
        expect(defaultProps.getMinWidth()).toBe(100);
        expect(defaultProps.getMinHeight()).toBe(80);
        expect(defaultProps.getExpansionDirection().getValue()).toBe('vertical');
        expect(defaultProps.getAlignmentMode().getValue()).toBe('center');
      });

      it('should create with custom values', () => {
        const layoutResult = LayoutStyle.create('top-down');
        const expansionResult = ExpansionDirection.create('horizontal');
        const alignmentResult = AlignmentMode.create('left');

        expect(layoutResult.isOk()).toBe(true);
        expect(expansionResult.isOk()).toBe(true);
        expect(alignmentResult.isOk()).toBe(true);

        if (layoutResult.isOk() && expansionResult.isOk() && alignmentResult.isOk()) {
          const result = PhysicalProperties.create(
            layoutResult.value,
            60,
            45,
            120,
            90,
            expansionResult.value,
            alignmentResult.value,
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const props = result.value;
            expect(props.getLayoutStyle().getValue()).toBe('top-down');
            expect(props.getSpacingX()).toBe(60);
            expect(props.getSpacingY()).toBe(45);
            expect(props.getMinWidth()).toBe(120);
            expect(props.getMinHeight()).toBe(90);
            expect(props.getExpansionDirection().getValue()).toBe('horizontal');
            expect(props.getAlignmentMode().getValue()).toBe('left');
          }
        }
      });

      it('should reject negative spacing values', () => {
        const layoutResult = LayoutStyle.create('bottom-up');
        expect(layoutResult.isOk()).toBe(true);

        if (layoutResult.isOk()) {
          const negativeXResult = PhysicalProperties.create(layoutResult.value, -1, 40);
          expect(negativeXResult.isErr()).toBe(true);
          if (negativeXResult.isErr()) {
            expect(negativeXResult.error.message).toContain(
              'Horizontal spacing must be non-negative',
            );
          }

          const negativeYResult = PhysicalProperties.create(layoutResult.value, 50, -1);
          expect(negativeYResult.isErr()).toBe(true);
          if (negativeYResult.isErr()) {
            expect(negativeYResult.error.message).toContain(
              'Vertical spacing must be non-negative',
            );
          }
        }
      });

      it('should reject non-positive dimensions', () => {
        const layoutResult = LayoutStyle.create('bottom-up');
        expect(layoutResult.isOk()).toBe(true);

        if (layoutResult.isOk()) {
          const zeroWidthResult = PhysicalProperties.create(layoutResult.value, 50, 40, 0);
          expect(zeroWidthResult.isErr()).toBe(true);
          if (zeroWidthResult.isErr()) {
            expect(zeroWidthResult.error.message).toContain('Minimum width must be positive');
          }

          const zeroHeightResult = PhysicalProperties.create(layoutResult.value, 50, 40, 100, 0);
          expect(zeroHeightResult.isErr()).toBe(true);
          if (zeroHeightResult.isErr()) {
            expect(zeroHeightResult.error.message).toContain('Minimum height must be positive');
          }
        }
      });

      it('should reject infinite values', () => {
        const layoutResult = LayoutStyle.create('bottom-up');
        expect(layoutResult.isOk()).toBe(true);

        if (layoutResult.isOk()) {
          const infiniteSpacingResult = PhysicalProperties.create(
            layoutResult.value,
            Number.POSITIVE_INFINITY,
            40,
          );
          expect(infiniteSpacingResult.isErr()).toBe(true);

          const infiniteDimensionResult = PhysicalProperties.create(
            layoutResult.value,
            50,
            40,
            Number.POSITIVE_INFINITY,
          );
          expect(infiniteDimensionResult.isErr()).toBe(true);
        }
      });
    });

    describe('property modification', () => {
      it('should modify layout style', () => {
        const originalResult = PhysicalProperties.create();
        const newLayoutResult = LayoutStyle.create('top-down');

        expect(originalResult.isOk()).toBe(true);
        expect(newLayoutResult.isOk()).toBe(true);

        if (originalResult.isOk() && newLayoutResult.isOk()) {
          const modifiedResult = originalResult.value.withLayoutStyle(newLayoutResult.value);
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getLayoutStyle().getValue()).toBe('top-down');
          }
        }
      });

      it('should modify spacing', () => {
        const originalResult = PhysicalProperties.create();
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withSpacing(75, 65);
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getSpacingX()).toBe(75);
            expect(modifiedResult.value.getSpacingY()).toBe(65);
          }
        }
      });

      it('should modify dimensions', () => {
        const originalResult = PhysicalProperties.create();
        expect(originalResult.isOk()).toBe(true);

        if (originalResult.isOk()) {
          const modifiedResult = originalResult.value.withMinDimensions(150, 120);
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getMinWidth()).toBe(150);
            expect(modifiedResult.value.getMinHeight()).toBe(120);
          }
        }
      });

      it('should modify expansion direction', () => {
        const originalResult = PhysicalProperties.create();
        const newExpansionResult = ExpansionDirection.create('radial');

        expect(originalResult.isOk()).toBe(true);
        expect(newExpansionResult.isOk()).toBe(true);

        if (originalResult.isOk() && newExpansionResult.isOk()) {
          const modifiedResult = originalResult.value.withExpansionDirection(
            newExpansionResult.value,
          );
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getExpansionDirection().getValue()).toBe('radial');
          }
        }
      });

      it('should modify alignment mode', () => {
        const originalResult = PhysicalProperties.create();
        const newAlignmentResult = AlignmentMode.create('justify');

        expect(originalResult.isOk()).toBe(true);
        expect(newAlignmentResult.isOk()).toBe(true);

        if (originalResult.isOk() && newAlignmentResult.isOk()) {
          const modifiedResult = originalResult.value.withAlignmentMode(newAlignmentResult.value);
          expect(modifiedResult.isOk()).toBe(true);

          if (modifiedResult.isOk()) {
            expect(modifiedResult.value.getAlignmentMode().getValue()).toBe('justify');
          }
        }
      });
    });

    describe('flow direction helpers', () => {
      it('should correctly identify flow directions', () => {
        const testCases = [
          {
            style: 'bottom-up',
            isBottomUp: true,
            isTopDown: false,
            isHorizontal: false,
            isVertical: true,
          },
          {
            style: 'top-down',
            isBottomUp: false,
            isTopDown: true,
            isHorizontal: false,
            isVertical: true,
          },
          {
            style: 'left-right',
            isBottomUp: false,
            isTopDown: false,
            isHorizontal: true,
            isVertical: false,
          },
          {
            style: 'right-left',
            isBottomUp: false,
            isTopDown: false,
            isHorizontal: true,
            isVertical: false,
          },
        ];

        testCases.forEach(({ style, isBottomUp, isTopDown, isHorizontal, isVertical }) => {
          const layoutResult = LayoutStyle.create(style);
          expect(layoutResult.isOk()).toBe(true);

          if (layoutResult.isOk()) {
            const result = PhysicalProperties.create(layoutResult.value);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              expect(result.value.isBottomUpFlow()).toBe(isBottomUp);
              expect(result.value.isTopDownFlow()).toBe(isTopDown);
              expect(result.value.isHorizontalFlow()).toBe(isHorizontal);
              expect(result.value.isVerticalFlow()).toBe(isVertical);
            }
          }
        });
      });
    });

    describe('equality and string representation', () => {
      it('should implement equality correctly', () => {
        const layout1Result = LayoutStyle.create('bottom-up');
        const layout2Result = LayoutStyle.create('top-down');

        expect(layout1Result.isOk()).toBe(true);
        expect(layout2Result.isOk()).toBe(true);

        if (layout1Result.isOk() && layout2Result.isOk()) {
          const props1Result = PhysicalProperties.create(layout1Result.value, 50, 40, 100, 80);
          const props2Result = PhysicalProperties.create(layout1Result.value, 50, 40, 100, 80);
          const props3Result = PhysicalProperties.create(layout2Result.value, 50, 40, 100, 80);

          expect(props1Result.isOk()).toBe(true);
          expect(props2Result.isOk()).toBe(true);
          expect(props3Result.isOk()).toBe(true);

          if (props1Result.isOk() && props2Result.isOk() && props3Result.isOk()) {
            expect(props1Result.value.equals(props2Result.value)).toBe(true);
            expect(props1Result.value.equals(props3Result.value)).toBe(false);
          }
        }
      });

      it('should provide meaningful string representation', () => {
        const propsResult = PhysicalProperties.create();
        expect(propsResult.isOk()).toBe(true);

        if (propsResult.isOk()) {
          const str = propsResult.value.toString();
          expect(str).toBeDefined();
          expect(str.length).toBeGreaterThan(0);
        }
      });

      it('should handle property-based testing for all parameters', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('bottom-up', 'top-down', 'left-right', 'right-left'),
            fc.float({ min: 0, max: 1000, noNaN: true }),
            fc.float({ min: 0, max: 1000, noNaN: true }),
            fc.float({ min: 1, max: 1000, noNaN: true }),
            fc.float({ min: 1, max: 1000, noNaN: true }),
            fc.constantFrom('horizontal', 'vertical', 'radial'),
            fc.constantFrom('left', 'center', 'right', 'justify'),
            (layout, spacingX, spacingY, minWidth, minHeight, expansion, alignment) => {
              const layoutResult = LayoutStyle.create(layout);
              const expansionResult = ExpansionDirection.create(expansion);
              const alignmentResult = AlignmentMode.create(alignment);

              expect(layoutResult.isOk()).toBe(true);
              expect(expansionResult.isOk()).toBe(true);
              expect(alignmentResult.isOk()).toBe(true);

              if (layoutResult.isOk() && expansionResult.isOk() && alignmentResult.isOk()) {
                const result = PhysicalProperties.create(
                  layoutResult.value,
                  spacingX,
                  spacingY,
                  minWidth,
                  minHeight,
                  expansionResult.value,
                  alignmentResult.value,
                );

                expect(result.isOk()).toBe(true);
                if (result.isOk()) {
                  const props = result.value;
                  expect(props.getLayoutStyle().getValue()).toBe(layout);
                  expect(props.getSpacingX()).toBe(spacingX);
                  expect(props.getSpacingY()).toBe(spacingY);
                  expect(props.getMinWidth()).toBe(minWidth);
                  expect(props.getMinHeight()).toBe(minHeight);
                  expect(props.getExpansionDirection().getValue()).toBe(expansion);
                  expect(props.getAlignmentMode().getValue()).toBe(alignment);
                }
              }
            },
          ),
        );
      });
    });
  });
});
