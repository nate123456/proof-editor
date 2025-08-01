import { err, ok, type Result } from 'neverthrow';
import type { ValidationError } from '../shared/result.js';
import type { PhysicalProperties, Position2D } from '../shared/value-objects/index.js';
import { TreeBounds } from '../value-objects/TreeBounds.js';
import { TreePosition } from '../value-objects/TreePosition.js';

export class TreeBoundsCalculationService {
  calculateBounds(
    position: Position2D,
    physicalProperties: PhysicalProperties,
  ): Result<TreeBounds, ValidationError> {
    const x = position.getX();
    const y = position.getY();
    const minWidth = physicalProperties.getMinWidth();
    const minHeight = physicalProperties.getMinHeight();

    return TreeBounds.fromPositionAndSize(x, y, minWidth, minHeight);
  }

  calculateBoundsFromTreePosition(
    position: TreePosition,
    physicalProperties: PhysicalProperties,
  ): Result<TreeBounds, ValidationError> {
    const x = position.getX();
    const y = position.getY();
    const minWidth = physicalProperties.getMinWidth();
    const minHeight = physicalProperties.getMinHeight();

    return TreeBounds.fromPositionAndSize(x, y, minWidth, minHeight);
  }

  checkBoundsOverlap(bounds1: TreeBounds, bounds2: TreeBounds): boolean {
    return bounds1.overlapsWith(bounds2);
  }

  checkPointInBounds(bounds: TreeBounds, x: number, y: number): boolean {
    return bounds.contains(x, y);
  }

  expandBoundsToIncludePoint(
    bounds: TreeBounds,
    x: number,
    y: number,
  ): Result<TreeBounds, ValidationError> {
    return bounds.expandToInclude(x, y);
  }

  expandBoundsToIncludeBounds(
    bounds1: TreeBounds,
    bounds2: TreeBounds,
  ): Result<TreeBounds, ValidationError> {
    return bounds1.expandToIncludeBounds(bounds2);
  }

  checkBoundsContainment(outerBounds: TreeBounds, innerBounds: TreeBounds): boolean {
    return outerBounds.containsBounds(innerBounds);
  }

  calculateBoundsArea(bounds: TreeBounds): number {
    return bounds.getWidth() * bounds.getHeight();
  }

  calculateBoundsPerimeter(bounds: TreeBounds): number {
    return 2 * (bounds.getWidth() + bounds.getHeight());
  }

  calculateBoundsCenter(bounds: TreeBounds): Result<TreePosition, ValidationError> {
    const centerX = bounds.getMinX() + bounds.getWidth() / 2;
    const centerY = bounds.getMinY() + bounds.getHeight() / 2;
    return TreePosition.create(centerX, centerY);
  }

  calculateBoundsDistance(
    bounds1: TreeBounds,
    bounds2: TreeBounds,
  ): Result<number, ValidationError> {
    const center1Result = this.calculateBoundsCenter(bounds1);
    if (center1Result.isErr()) {
      return err(center1Result.error);
    }

    const center2Result = this.calculateBoundsCenter(bounds2);
    if (center2Result.isErr()) {
      return err(center2Result.error);
    }

    const distance = center1Result.value.distanceTo(center2Result.value);
    return ok(distance);
  }
}
