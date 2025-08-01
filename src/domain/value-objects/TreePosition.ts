import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';

export class TreePosition {
  private constructor(
    private readonly x: number,
    private readonly y: number,
  ) {}

  static create(x: number, y: number): Result<TreePosition, ValidationError> {
    if (!Number.isFinite(x)) {
      return err(new ValidationError('X coordinate must be a finite number'));
    }
    if (!Number.isFinite(y)) {
      return err(new ValidationError('Y coordinate must be a finite number'));
    }

    return ok(new TreePosition(x, y));
  }

  static origin(): TreePosition {
    return new TreePosition(0, 0);
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  moveBy(deltaX: number, deltaY: number): Result<TreePosition, ValidationError> {
    if (!Number.isFinite(deltaX)) {
      return err(new ValidationError('Delta X must be a finite number'));
    }
    if (!Number.isFinite(deltaY)) {
      return err(new ValidationError('Delta Y must be a finite number'));
    }

    return TreePosition.create(this.x + deltaX, this.y + deltaY);
  }

  moveTo(newX: number, newY: number): Result<TreePosition, ValidationError> {
    return TreePosition.create(newX, newY);
  }

  distanceTo(other: TreePosition): number {
    const deltaX = other.x - this.x;
    const deltaY = other.y - this.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  manhattanDistanceTo(other: TreePosition): number {
    return Math.abs(other.x - this.x) + Math.abs(other.y - this.y);
  }

  isAtSameLocationAs(other: TreePosition): boolean {
    return this.x === other.x && this.y === other.y;
  }

  isAtLocation(x: number, y: number): boolean {
    return this.x === x && this.y === y;
  }

  equals(other: TreePosition): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `TreePosition(${this.x}, ${this.y})`;
  }
}
