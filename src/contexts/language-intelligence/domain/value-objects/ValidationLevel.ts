import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';

export class ValidationLevel {
  private static readonly SYNTAX_TARGET_MS = 5;
  private static readonly FLOW_TARGET_MS = 8;
  private static readonly SEMANTIC_TARGET_MS = 10;
  private static readonly STYLE_TARGET_MS = 15;

  private constructor(
    private readonly level: ValidationLevelType,
    private readonly priority: number,
    private readonly performanceTargetMs: number
  ) {}

  static syntax(): ValidationLevel {
    return new ValidationLevel('syntax', 1, ValidationLevel.SYNTAX_TARGET_MS);
  }

  static flow(): ValidationLevel {
    return new ValidationLevel('flow', 2, ValidationLevel.FLOW_TARGET_MS);
  }

  static semantic(): ValidationLevel {
    return new ValidationLevel('semantic', 3, ValidationLevel.SEMANTIC_TARGET_MS);
  }

  static style(): ValidationLevel {
    return new ValidationLevel('style', 4, ValidationLevel.STYLE_TARGET_MS);
  }

  static fromString(level: string): Result<ValidationLevel, ValidationError> {
    switch (level.toLowerCase()) {
      case 'syntax':
        return { success: true, data: ValidationLevel.syntax() };
      case 'flow':
        return { success: true, data: ValidationLevel.flow() };
      case 'semantic':
        return { success: true, data: ValidationLevel.semantic() };
      case 'style':
        return { success: true, data: ValidationLevel.style() };
      default:
        return {
          success: false,
          error: new ValidationError(`Invalid validation level: ${level}`)
        };
    }
  }

  getLevel(): ValidationLevelType {
    return this.level;
  }

  getPriority(): number {
    return this.priority;
  }

  getPerformanceTargetMs(): number {
    return this.performanceTargetMs;
  }

  isSyntax(): boolean {
    return this.level === 'syntax';
  }

  isFlow(): boolean {
    return this.level === 'flow';
  }

  isSemantic(): boolean {
    return this.level === 'semantic';
  }

  isStyle(): boolean {
    return this.level === 'style';
  }

  isMoreCriticalThan(other: ValidationLevel): boolean {
    return this.priority < other.priority;
  }

  isLessCriticalThan(other: ValidationLevel): boolean {
    return this.priority > other.priority;
  }

  canCombineWith(other: ValidationLevel): boolean {
    // Can always combine validation levels
    return true;
  }

  combineWith(other: ValidationLevel): ValidationLevel {
    // Combined level uses the more critical (lower priority number) level
    if (this.isMoreCriticalThan(other)) {
      return this;
    } else if (other.isMoreCriticalThan(this)) {
      return other;
    } else {
      return this; // Same level
    }
  }

  getDescription(): string {
    switch (this.level) {
      case 'syntax':
        return 'Basic syntax and structure validation';
      case 'flow':
        return 'Statement flow and connection validation';
      case 'semantic':
        return 'Logical meaning and inference validation';
      case 'style':
        return 'Style and convention validation';
      default:
        return 'Unknown validation level';
    }
  }

  includesLevel(level: ValidationLevel): boolean {
    // Higher priority levels include lower priority validations
    return this.priority >= level.priority;
  }

  getIncludedLevels(): ValidationLevel[] {
    const levels: ValidationLevel[] = [];
    
    if (this.priority >= 1) levels.push(ValidationLevel.syntax());
    if (this.priority >= 2) levels.push(ValidationLevel.flow());
    if (this.priority >= 3) levels.push(ValidationLevel.semantic());
    if (this.priority >= 4) levels.push(ValidationLevel.style());

    return levels;
  }

  toString(): string {
    return this.level;
  }

  equals(other: ValidationLevel): boolean {
    return this.level === other.level;
  }
}

export type ValidationLevelType = 'syntax' | 'flow' | 'semantic' | 'style';