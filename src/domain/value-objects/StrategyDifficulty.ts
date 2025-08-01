import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export class StrategyDifficulty {
  private constructor(private readonly level: DifficultyLevel) {}

  static create(level: DifficultyLevel): Result<StrategyDifficulty, ValidationError> {
    const validLevels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];
    if (!validLevels.includes(level)) {
      return err(new ValidationError(`Invalid difficulty level: ${level}`));
    }

    return ok(new StrategyDifficulty(level));
  }

  static createEasy(): StrategyDifficulty {
    return new StrategyDifficulty('easy');
  }

  static createMedium(): StrategyDifficulty {
    return new StrategyDifficulty('medium');
  }

  static createHard(): StrategyDifficulty {
    return new StrategyDifficulty('hard');
  }

  static createExpert(): StrategyDifficulty {
    return new StrategyDifficulty('expert');
  }

  getValue(): DifficultyLevel {
    return this.level;
  }

  isEasy(): boolean {
    return this.level === 'easy';
  }

  isMedium(): boolean {
    return this.level === 'medium';
  }

  isHard(): boolean {
    return this.level === 'hard';
  }

  isExpert(): boolean {
    return this.level === 'expert';
  }

  getNumericValue(): number {
    switch (this.level) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      case 'expert':
        return 4;
    }
  }

  equals(other: StrategyDifficulty): boolean {
    return this.level === other.level;
  }
}
