import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tree } from '../../entities/Tree';
import { ValidationError } from '../../shared/result';
import { PhysicalProperties, Position2D } from '../../shared/value-objects';

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
        const newPositionResult = Position2D.create(100, 200);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const result = tree.moveTo(newPositionResult.value);
          expect(result.isOk()).toBe(true);
          expect(tree.getPosition()).toEqual(newPositionResult.value);
        }
      });

      it('should update modified time when moving', () => {
        const newPositionResult = Position2D.create(50, 75);
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
        const initialPositionResult = Position2D.create(100, 200);
        expect(initialPositionResult.isOk()).toBe(true);

        if (initialPositionResult.isOk()) {
          const moveToResult = tree.moveTo(initialPositionResult.value);
          expect(moveToResult.isOk()).toBe(true);

          const offsetResult = Position2D.create(50, -25);
          expect(offsetResult.isOk()).toBe(true);

          if (offsetResult.isOk()) {
            const result = tree.moveBy(offsetResult.value);
            expect(result.isOk()).toBe(true);

            const expectedPositionResult = Position2D.create(150, 175);
            expect(expectedPositionResult.isOk()).toBe(true);

            if (expectedPositionResult.isOk()) {
              expect(tree.getPosition()).toEqual(expectedPositionResult.value);
            }
          }
        }
      });

      it('should handle negative offsets', () => {
        const initialPositionResult = Position2D.create(100, 200);
        expect(initialPositionResult.isOk()).toBe(true);

        if (initialPositionResult.isOk()) {
          const moveToResult = tree.moveTo(initialPositionResult.value);
          expect(moveToResult.isOk()).toBe(true);

          const offsetResult = Position2D.create(-50, -100);
          expect(offsetResult.isOk()).toBe(true);

          if (offsetResult.isOk()) {
            const result = tree.moveBy(offsetResult.value);
            expect(result.isOk()).toBe(true);

            const expectedPositionResult = Position2D.create(50, 100);
            expect(expectedPositionResult.isOk()).toBe(true);

            if (expectedPositionResult.isOk()) {
              expect(tree.getPosition()).toEqual(expectedPositionResult.value);
            }
          }
        }
      });

      it('should fail with invalid offset resulting in invalid position', () => {
        const offsetResult = Position2D.create(-1, 0);
        expect(offsetResult.isOk()).toBe(true);

        if (offsetResult.isOk()) {
          const result = tree.moveBy(offsetResult.value);
          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ValidationError);
          }
        }
      });
    });

    describe('isAtPosition', () => {
      it('should return true for current position', () => {
        const currentPosition = tree.getPosition();
        expect(tree.isAtPosition(currentPosition)).toBe(true);
      });

      it('should return false for different position', () => {
        const differentPositionResult = Position2D.create(100, 200);
        expect(differentPositionResult.isOk()).toBe(true);

        if (differentPositionResult.isOk()) {
          expect(tree.isAtPosition(differentPositionResult.value)).toBe(false);
        }
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
        'bottom-up',
        100,
        100,
        200,
        100,
        'horizontal',
        'center',
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
        'top-down',
        75,
        75,
        150,
        75,
        'vertical',
        'start',
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
        const position1Result = Position2D.create(0, 0);
        expect(position1Result.isOk()).toBe(true);
        if (position1Result.isOk()) {
          const moveResult = tree1.moveTo(position1Result.value);
          expect(moveResult.isOk()).toBe(true);
        }

        // Position tree2 at (100, 100)
        const position2Result = Position2D.create(100, 100);
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
        const bounds = tree1.getBounds();
        expect(bounds.x).toBe(0);
        expect(bounds.y).toBe(0);
        expect(bounds.width).toBe(PhysicalProperties.default().width);
        expect(bounds.height).toBe(PhysicalProperties.default().height);
      });

      it('should return updated bounds after moving', () => {
        const newPositionResult = Position2D.create(50, 75);
        expect(newPositionResult.isOk()).toBe(true);

        if (newPositionResult.isOk()) {
          const moveResult = tree1.moveTo(newPositionResult.value);
          expect(moveResult.isOk()).toBe(true);

          const bounds = tree1.getBounds();
          expect(bounds.x).toBe(50);
          expect(bounds.y).toBe(75);
        }
      });
    });

    describe('overlapsWithBounds', () => {
      it('should detect overlap with intersecting bounds', () => {
        const overlappingBounds = { x: 50, y: 50, width: 100, height: 100 };
        const overlaps = tree2.overlapsWithBounds(overlappingBounds);
        expect(overlaps).toBe(true);
      });

      it('should detect no overlap with non-intersecting bounds', () => {
        const nonOverlappingBounds = { x: 500, y: 500, width: 100, height: 100 };
        const overlaps = tree1.overlapsWithBounds(nonOverlappingBounds);
        expect(overlaps).toBe(false);
      });

      it('should detect overlap with touching bounds', () => {
        const touchingBounds = { x: 100, y: 100, width: 100, height: 100 };
        const overlaps = tree1.overlapsWithBounds(touchingBounds);
        expect(overlaps).toBe(true);
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
        const newPositionResult = Position2D.create(100, 200);
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
        const initialBounds = tree.getBounds();

        // Update properties
        const newPropertiesResult = PhysicalProperties.create(
          'bottom-up',
          200,
          200,
          400,
          200,
          'horizontal',
          'center',
        );
        expect(newPropertiesResult.isOk()).toBe(true);

        if (newPropertiesResult.isOk()) {
          const updateResult = tree.updatePhysicalProperties(newPropertiesResult.value);
          expect(updateResult.isOk()).toBe(true);

          const newBounds = tree.getBounds();
          expect(newBounds.x).toBe(initialBounds.x); // Position unchanged
          expect(newBounds.y).toBe(initialBounds.y); // Position unchanged
          expect(newBounds.width).toBe(400); // Width updated
          expect(newBounds.height).toBe(200); // Height updated
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
        const newPositionResult = Position2D.create(300, 400);
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
