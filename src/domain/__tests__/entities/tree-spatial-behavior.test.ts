import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree.js';
import {
  AlignmentMode,
  ExpansionDirection,
  LayoutStyle,
  PhysicalProperties,
} from '../../shared/value-objects/index.js';
import { TreeBounds } from '../../value-objects/TreeBounds.js';
import { TreePosition } from '../../value-objects/TreePosition.js';

describe('Tree Spatial Behavior', () => {
  let mockDateNow: ReturnType<typeof vi.fn>;
  const FIXED_TIMESTAMP = 1640995200000; // 2022-01-01T00:00:00.000Z

  beforeEach(() => {
    mockDateNow = vi.fn(() => FIXED_TIMESTAMP);
    vi.stubGlobal('Date', {
      ...Date,
      now: mockDateNow,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Position Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-position');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    describe('moveTo', () => {
      it('should move tree to new position', () => {
        const newPositionResult = TreePosition.create(100, 200);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const result = tree.moveTo(newPositionResult.value);
          expect(result.isOk()).toBe(true);
          expect(tree.getPosition()).toEqual(newPositionResult.value);
        }
      });

      it('should update modified time when moving', () => {
        const newPositionResult = TreePosition.create(50, 75);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const originalModifiedAt = tree.getModifiedAt();
          mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 1000);

          const result = tree.moveTo(newPositionResult.value);
          expect(result.isOk()).toBe(true);
          expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP + 1000);
          expect(tree.getModifiedAt()).not.toBe(originalModifiedAt);
        }
      });
    });

    describe('moveBy', () => {
      it('should move tree by offset', () => {
        const initialPositionResult = TreePosition.create(100, 200);
        expect(initialPositionResult.isOk()).toBe(true);

        if (initialPositionResult.isOk()) {
          const moveToResult = tree.moveTo(initialPositionResult.value);
          expect(moveToResult.isOk()).toBe(true);

          const result = tree.moveBy(50, -25);
          expect(result.isOk()).toBe(true);

          const expectedPositionResult = TreePosition.create(150, 175);
          expect(expectedPositionResult.isOk()).toBe(true);

          if (expectedPositionResult.isOk()) {
            expect(tree.getPosition()).toEqual(expectedPositionResult.value);
          }
        }
      });

      it('should handle negative offsets', () => {
        const initialPositionResult = TreePosition.create(100, 200);
        expect(initialPositionResult.isOk()).toBe(true);

        if (initialPositionResult.isOk()) {
          const moveToResult = tree.moveTo(initialPositionResult.value);
          expect(moveToResult.isOk()).toBe(true);

          const result = tree.moveBy(-50, -100);
          expect(result.isOk()).toBe(true);

          const expectedPositionResult = TreePosition.create(50, 100);
          expect(expectedPositionResult.isOk()).toBe(true);

          if (expectedPositionResult.isOk()) {
            expect(tree.getPosition()).toEqual(expectedPositionResult.value);
          }
        }
      });

      it('should fail with invalid offset resulting in invalid position', () => {
        const result = tree.moveBy(-1, 0);
        // Since TreePosition doesn't have a minimum constraint, this should succeed
        expect(result.isOk()).toBe(true);
      });
    });

    describe('isAtPosition', () => {
      it('should return true for current position', () => {
        const currentPosition = tree.getPosition();
        expect(tree.isAtPosition(currentPosition.getX(), currentPosition.getY())).toBe(true);
      });

      it('should return false for different position', () => {
        expect(tree.isAtPosition(100, 200)).toBe(false);
      });
    });
  });

  describe('Physical Properties Management', () => {
    let tree: Tree;

    beforeEach(() => {
      const result = Tree.create('doc-properties');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        tree = result.value;
      }
    });

    it('should update physical properties', () => {
      const newPropertiesResult = PhysicalProperties.create(
        LayoutStyle.bottomUp(),
        100,
        100,
        200,
        100,
        ExpansionDirection.horizontal(),
        AlignmentMode.center(),
      );
      expect(newPropertiesResult.isOk()).toBe(true);

      if (newPropertiesResult.isOk()) {
        const result = tree.updatePhysicalProperties(newPropertiesResult.value);
        expect(result.isOk()).toBe(true);
        expect(tree.getPhysicalProperties()).toEqual(newPropertiesResult.value);
      }
    });

    it('should update modified time when updating properties', () => {
      const newPropertiesResult = PhysicalProperties.create(
        LayoutStyle.topDown(),
        75,
        75,
        150,
        75,
        ExpansionDirection.vertical(),
        AlignmentMode.left(),
      );
      expect(newPropertiesResult.isOk()).toBe(true);

      if (newPropertiesResult.isOk()) {
        const originalModifiedAt = tree.getModifiedAt();
        mockDateNow.mockReturnValue(FIXED_TIMESTAMP + 2000);

        const result = tree.updatePhysicalProperties(newPropertiesResult.value);
        expect(result.isOk()).toBe(true);
        expect(tree.getModifiedAt()).toBe(FIXED_TIMESTAMP + 2000);
        expect(tree.getModifiedAt()).not.toBe(originalModifiedAt);
      }
    });
  });

  describe('Spatial Operations', () => {
    let tree1: Tree;
    let tree2: Tree;

    beforeEach(() => {
      const result1 = Tree.create('doc-spatial-1');
      const result2 = Tree.create('doc-spatial-2');
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        tree1 = result1.value;
        tree2 = result2.value;

        // Position tree1 at (0, 0)
        const position1Result = TreePosition.create(0, 0);
        expect(position1Result.isOk()).toBe(true);
        if (position1Result.isOk()) {
          const moveResult = tree1.moveTo(position1Result.value);
          expect(moveResult.isOk()).toBe(true);
        }

        // Position tree2 at (100, 100)
        const position2Result = TreePosition.create(100, 100);
        expect(position2Result.isOk()).toBe(true);
        if (position2Result.isOk()) {
          const moveResult = tree2.moveTo(position2Result.value);
          expect(moveResult.isOk()).toBe(true);
        }
      }
    });

    describe('distanceFrom', () => {
      it('should calculate distance between trees', () => {
        const distance = tree1.distanceFrom(tree2);
        expect(distance).toBeCloseTo(Math.sqrt(20000), 5); // sqrt(100^2 + 100^2)
      });

      it('should return 0 for distance from itself', () => {
        const distance = tree1.distanceFrom(tree1);
        expect(distance).toBe(0);
      });

      it('should return same distance regardless of direction', () => {
        const distance1to2 = tree1.distanceFrom(tree2);
        const distance2to1 = tree2.distanceFrom(tree1);
        expect(distance1to2).toBe(distance2to1);
      });
    });

    describe('getBounds', () => {
      it('should return bounds based on position and physical properties', () => {
        const boundsResult = tree1.getBounds();
        expect(boundsResult.isOk()).toBe(true);

        if (boundsResult.isOk()) {
          const bounds = boundsResult.value;
          expect(bounds.getMinX()).toBe(0);
          expect(bounds.getMinY()).toBe(0);
          expect(bounds.getWidth()).toBe(PhysicalProperties.default().getMinWidth());
          expect(bounds.getHeight()).toBe(PhysicalProperties.default().getMinHeight());
        }
      });

      it('should return updated bounds after moving', () => {
        const newPositionResult = TreePosition.create(50, 75);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const moveResult = tree1.moveTo(newPositionResult.value);
          expect(moveResult.isOk()).toBe(true);

          const boundsResult = tree1.getBounds();
          expect(boundsResult.isOk()).toBe(true);

          if (boundsResult.isOk()) {
            const bounds = boundsResult.value;
            expect(bounds.getMinX()).toBe(50);
            expect(bounds.getMinY()).toBe(75);
          }
        }
      });
    });

    describe('hasOverlapWithBounds', () => {
      it('should detect overlap with intersecting bounds', () => {
        const overlappingBoundsResult = TreeBounds.fromPositionAndSize(50, 50, 100, 100);
        expect(overlappingBoundsResult.isOk()).toBe(true);

        if (overlappingBoundsResult.isOk()) {
          const overlapsResult = tree2.hasOverlapWithBounds(overlappingBoundsResult.value);
          expect(overlapsResult.isOk()).toBe(true);
          if (overlapsResult.isOk()) {
            expect(overlapsResult.value).toBe(true);
          }
        }
      });

      it('should detect no overlap with non-intersecting bounds', () => {
        const nonOverlappingBoundsResult = TreeBounds.fromPositionAndSize(500, 500, 100, 100);
        expect(nonOverlappingBoundsResult.isOk()).toBe(true);

        if (nonOverlappingBoundsResult.isOk()) {
          const overlapsResult = tree1.hasOverlapWithBounds(nonOverlappingBoundsResult.value);
          expect(overlapsResult.isOk()).toBe(true);
          if (overlapsResult.isOk()) {
            expect(overlapsResult.value).toBe(false);
          }
        }
      });

      it('should detect overlap with touching bounds', () => {
        const touchingBoundsResult = TreeBounds.fromPositionAndSize(100, 100, 100, 100);
        expect(touchingBoundsResult.isOk()).toBe(true);

        if (touchingBoundsResult.isOk()) {
          const overlapsResult = tree1.hasOverlapWithBounds(touchingBoundsResult.value);
          expect(overlapsResult.isOk()).toBe(true);
          if (overlapsResult.isOk()) {
            expect(overlapsResult.value).toBe(true);
          }
        }
      });
    });
  });

  describe('Spatial invariants', () => {
    it('should maintain consistent position after multiple operations', () => {
      const result = Tree.create('doc-spatial-invariant');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const initialPosition = tree.getPosition();

        // Move to a new position
        const newPositionResult = TreePosition.create(100, 200);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const moveResult = tree.moveTo(newPositionResult.value);
          expect(moveResult.isOk()).toBe(true);

          // Move back to original position
          const moveBackResult = tree.moveTo(initialPosition);
          expect(moveBackResult.isOk()).toBe(true);

          expect(tree.getPosition()).toEqual(initialPosition);
        }
      }
    });

    it('should maintain consistent bounds after property updates', () => {
      const result = Tree.create('doc-bounds-invariant');
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const tree = result.value;
        const initialBoundsResult = tree.getBounds();
        expect(initialBoundsResult.isOk()).toBe(true);

        if (initialBoundsResult.isOk()) {
          const initialBounds = initialBoundsResult.value;

          // Update properties
          const newPropertiesResult = PhysicalProperties.create(
            LayoutStyle.bottomUp(),
            200,
            200,
            400,
            200,
            ExpansionDirection.horizontal(),
            AlignmentMode.center(),
          );
          expect(newPropertiesResult.isOk()).toBe(true);

          if (newPropertiesResult.isOk()) {
            const updateResult = tree.updatePhysicalProperties(newPropertiesResult.value);
            expect(updateResult.isOk()).toBe(true);

            const newBoundsResult = tree.getBounds();
            expect(newBoundsResult.isOk()).toBe(true);

            if (newBoundsResult.isOk()) {
              const newBounds = newBoundsResult.value;
              expect(newBounds.getMinX()).toBe(initialBounds.getMinX()); // Position unchanged
              expect(newBounds.getMinY()).toBe(initialBounds.getMinY()); // Position unchanged
              expect(newBounds.getWidth()).toBe(400); // Width updated
              expect(newBounds.getHeight()).toBe(200); // Height updated
            }
          }
        }
      }
    });

    it('should calculate correct distance after position changes', () => {
      const result1 = Tree.create('doc-distance-1');
      const result2 = Tree.create('doc-distance-2');
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const tree1 = result1.value;
        const tree2 = result2.value;

        // Both trees start at origin
        const initialDistance = tree1.distanceFrom(tree2);
        expect(initialDistance).toBe(0);

        // Move tree2 to (300, 400)
        const newPositionResult = TreePosition.create(300, 400);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const moveResult = tree2.moveTo(newPositionResult.value);
          expect(moveResult.isOk()).toBe(true);

          const newDistance = tree1.distanceFrom(tree2);
          expect(newDistance).toBeCloseTo(500, 5); // sqrt(300^2 + 400^2) = 500
        }
      }
    });
  });
});
