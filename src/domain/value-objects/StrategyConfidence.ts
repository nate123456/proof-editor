import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';

export class StrategyConfidence {
  private constructor(private readonly value: number) {}

  static create(value: number): Result<StrategyConfidence, ValidationError> {
    if (value < 0 || value > 1) {
      return err(new ValidationError('Confidence must be between 0 and 1'));
    }

    return ok(new StrategyConfidence(value));
  }

  static createHigh(): StrategyConfidence {
    return new StrategyConfidence(0.9);
  }

  static createMedium(): StrategyConfidence {
    return new StrategyConfidence(0.7);
  }

  static createLow(): StrategyConfidence {
    return new StrategyConfidence(0.3);
  }

  getValue(): number {
    return this.value;
  }

  isHigh(): boolean {
    return this.value >= 0.8;
  }

  isMedium(): boolean {
    return this.value >= 0.5 && this.value < 0.8;
  }

  isLow(): boolean {
    return this.value < 0.5;
  }

  equals(other: StrategyConfidence): boolean {
    return this.value === other.value;
  }
}
