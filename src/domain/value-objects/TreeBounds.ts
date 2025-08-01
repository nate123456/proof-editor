import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';

export class TreeBounds {
  private constructor(
    private readonly minX: number,
    private readonly minY: number,
    private readonly maxX: number,
    private readonly maxY: number,
  ) {}

  static create(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Result<TreeBounds, ValidationError> {
    if (minX > maxX) {
      return err(new ValidationError('minX cannot be greater than maxX'));
    }
    if (minY > maxY) {
      return err(new ValidationError('minY cannot be greater than maxY'));
    }
    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return err(new ValidationError('All bound coordinates must be finite numbers'));
    }

    return ok(new TreeBounds(minX, minY, maxX, maxY));
  }

  static fromPositionAndSize(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Result<TreeBounds, ValidationError> {
    if (width < 0) {
      return err(new ValidationError('Width cannot be negative'));
    }
    if (height < 0) {
      return err(new ValidationError('Height cannot be negative'));
    }

    return TreeBounds.create(x, y, x + width, y + height);
  }

  getMinX(): number {
    return this.minX;
  }

  getMinY(): number {
    return this.minY;
  }

  getMaxX(): number {
    return this.maxX;
  }

  getMaxY(): number {
    return this.maxY;
  }

  getWidth(): number {
    return this.maxX - this.minX;
  }

  getHeight(): number {
    return this.maxY - this.minY;
  }

  overlapsWith(other: TreeBounds): boolean {
    return !(
      this.maxX <= other.minX ||
      this.minX >= other.maxX ||
      this.maxY <= other.minY ||
      this.minY >= other.maxY
    );
  }

  contains(x: number, y: number): boolean {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
  }

  containsBounds(other: TreeBounds): boolean {
    return (
      this.minX <= other.minX &&
      this.minY <= other.minY &&
      this.maxX >= other.maxX &&
      this.maxY >= other.maxY
    );
  }

  expandToInclude(x: number, y: number): Result<TreeBounds, ValidationError> {
    const newMinX = Math.min(this.minX, x);
    const newMinY = Math.min(this.minY, y);
    const newMaxX = Math.max(this.maxX, x);
    const newMaxY = Math.max(this.maxY, y);

    return TreeBounds.create(newMinX, newMinY, newMaxX, newMaxY);
  }

  expandToIncludeBounds(other: TreeBounds): Result<TreeBounds, ValidationError> {
    const newMinX = Math.min(this.minX, other.minX);
    const newMinY = Math.min(this.minY, other.minY);
    const newMaxX = Math.max(this.maxX, other.maxX);
    const newMaxY = Math.max(this.maxY, other.maxY);

    return TreeBounds.create(newMinX, newMinY, newMaxX, newMaxY);
  }

  equals(other: TreeBounds): boolean {
    return (
      this.minX === other.minX &&
      this.minY === other.minY &&
      this.maxX === other.maxX &&
      this.maxY === other.maxY
    );
  }

  toString(): string {
    return `TreeBounds(${this.minX}, ${this.minY}, ${this.maxX}, ${this.maxY})`;
  }
}
