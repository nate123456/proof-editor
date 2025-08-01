import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../result.js';
import { isFiniteNumber, isInteger, ValueObject } from './common.js';
import { ConnectionInconsistencyType } from './enums.js';

export class PremisePosition extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<PremisePosition, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Premise position must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000) {
      return err(
        new ValidationError('Premise position cannot exceed 1000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new PremisePosition(value));
  }

  static fromNumber(value: number): Result<PremisePosition, ValidationError> {
    return PremisePosition.create(value);
  }

  static zero(): PremisePosition {
    return new PremisePosition(0);
  }

  isFirst(): boolean {
    return this.value === 0;
  }

  next(): PremisePosition {
    return new PremisePosition(this.value + 1);
  }

  previous(): Result<PremisePosition, ValidationError> {
    if (this.value === 0) {
      return err(new ValidationError('Cannot go below position 0'));
    }
    return ok(new PremisePosition(this.value - 1));
  }
}

export class ConclusionPosition extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<ConclusionPosition, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Conclusion position must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000) {
      return err(
        new ValidationError('Conclusion position cannot exceed 1000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new ConclusionPosition(value));
  }

  static fromNumber(value: number): Result<ConclusionPosition, ValidationError> {
    return ConclusionPosition.create(value);
  }

  static zero(): ConclusionPosition {
    return new ConclusionPosition(0);
  }

  isFirst(): boolean {
    return this.value === 0;
  }

  next(): ConclusionPosition {
    return new ConclusionPosition(this.value + 1);
  }

  previous(): Result<ConclusionPosition, ValidationError> {
    if (this.value === 0) {
      return err(new ValidationError('Cannot go below position 0'));
    }
    return ok(new ConclusionPosition(this.value - 1));
  }
}

export class UsageCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<UsageCount, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Usage count must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new UsageCount(value));
  }

  static zero(): UsageCount {
    return new UsageCount(0);
  }

  increment(): UsageCount {
    return new UsageCount(this.value + 1);
  }

  decrement(): Result<UsageCount, ValidationError> {
    if (this.value === 0) {
      return err(new ValidationError('Cannot decrement usage count below zero'));
    }
    return ok(new UsageCount(this.value - 1));
  }

  isInUse(): boolean {
    return this.value > 0;
  }
}

export class PremiseCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<PremiseCount, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Premise count must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000) {
      return err(
        new ValidationError('Premise count cannot exceed 1000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new PremiseCount(value));
  }

  static zero(): PremiseCount {
    return new PremiseCount(0);
  }

  static fromNumber(value: number): Result<PremiseCount, ValidationError> {
    return PremiseCount.create(value);
  }

  isEmpty(): boolean {
    return this.value === 0;
  }

  increment(): Result<PremiseCount, ValidationError> {
    return PremiseCount.create(this.value + 1);
  }

  decrement(): Result<PremiseCount, ValidationError> {
    if (this.value === 0) {
      return err(new ValidationError('Cannot decrement premise count below zero'));
    }
    return PremiseCount.create(this.value - 1);
  }
}

export class SearchDepth extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<SearchDepth, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Search depth must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 100) {
      return err(
        new ValidationError('Search depth cannot exceed 100 (infinite loop protection)', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new SearchDepth(value));
  }

  static unlimited(): SearchDepth {
    return new SearchDepth(100);
  }

  static shallow(): SearchDepth {
    return new SearchDepth(3);
  }

  static deep(): SearchDepth {
    return new SearchDepth(10);
  }

  static fromNumber(value: number): Result<SearchDepth, ValidationError> {
    return SearchDepth.create(value);
  }

  isUnlimited(): boolean {
    return this.value >= 100;
  }

  isShallow(): boolean {
    return this.value <= 3;
  }

  increment(): Result<SearchDepth, ValidationError> {
    return SearchDepth.create(this.value + 1);
  }

  decrement(): Result<SearchDepth, ValidationError> {
    if (this.value === 0) {
      return err(new ValidationError('Cannot decrement search depth below zero'));
    }
    return SearchDepth.create(this.value - 1);
  }
}

export class ValidationScore extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<ValidationScore, ValidationError> {
    if (!isFiniteNumber(value) || value < 0 || value > 100) {
      return err(
        new ValidationError('Validation score must be between 0 and 100', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new ValidationScore(value));
  }

  static fromNumber(value: number): Result<ValidationScore, ValidationError> {
    return ValidationScore.create(value);
  }

  static perfect(): ValidationScore {
    return new ValidationScore(100);
  }

  static zero(): ValidationScore {
    return new ValidationScore(0);
  }

  isPerfect(): boolean {
    return this.value === 100;
  }

  isFailing(): boolean {
    return this.value < 60;
  }
}

export class CheckCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<CheckCount, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Check count must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000000) {
      return err(
        new ValidationError('Check count cannot exceed 1,000,000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new CheckCount(value));
  }

  static fromNumber(value: number): Result<CheckCount, ValidationError> {
    return CheckCount.create(value);
  }

  static zero(): CheckCount {
    return new CheckCount(0);
  }

  increment(): Result<CheckCount, ValidationError> {
    return CheckCount.create(this.value + 1);
  }

  isEmpty(): boolean {
    return this.value === 0;
  }
}

export class WarningCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<WarningCount, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Warning count must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 100000) {
      return err(
        new ValidationError('Warning count cannot exceed 100,000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new WarningCount(value));
  }

  static fromNumber(value: number): Result<WarningCount, ValidationError> {
    return WarningCount.create(value);
  }

  static zero(): WarningCount {
    return new WarningCount(0);
  }

  increment(): Result<WarningCount, ValidationError> {
    return WarningCount.create(this.value + 1);
  }

  isEmpty(): boolean {
    return this.value === 0;
  }

  isHigh(): boolean {
    return this.value > 10;
  }
}

export class NodeCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<NodeCount, ValidationError> {
    if (!isInteger(value) || value < 0) {
      return err(
        new ValidationError('Node count must be a non-negative integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 10000) {
      return err(
        new ValidationError('Node count cannot exceed 10,000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new NodeCount(value));
  }

  static fromNumber(value: number): Result<NodeCount, ValidationError> {
    return NodeCount.create(value);
  }

  static zero(): NodeCount {
    return new NodeCount(0);
  }

  isEmpty(): boolean {
    return this.value === 0;
  }

  increment(): Result<NodeCount, ValidationError> {
    return NodeCount.create(this.value + 1);
  }

  isLarge(): boolean {
    return this.value > 1000;
  }
}

export class MaxTreeCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<MaxTreeCount, ValidationError> {
    if (!isInteger(value) || value < 1) {
      return err(
        new ValidationError('Max tree count must be a positive integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000) {
      return err(
        new ValidationError('Max tree count cannot exceed 1,000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new MaxTreeCount(value));
  }

  static fromNumber(value: number): Result<MaxTreeCount, ValidationError> {
    return MaxTreeCount.create(value);
  }

  static default(): MaxTreeCount {
    return new MaxTreeCount(50);
  }

  static unlimited(): MaxTreeCount {
    return new MaxTreeCount(1000);
  }
}

export class MaxNodeCount extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<MaxNodeCount, ValidationError> {
    if (!isInteger(value) || value < 1) {
      return err(
        new ValidationError('Max node count must be a positive integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 10000) {
      return err(
        new ValidationError('Max node count cannot exceed 10,000', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new MaxNodeCount(value));
  }

  static fromNumber(value: number): Result<MaxNodeCount, ValidationError> {
    return MaxNodeCount.create(value);
  }

  static default(): MaxNodeCount {
    return new MaxNodeCount(500);
  }

  static unlimited(): MaxNodeCount {
    return new MaxNodeCount(10000);
  }
}

// Structured Error Details
export class ConnectionInconsistencyDetails {
  private constructor(
    private readonly inconsistencyType: ConnectionInconsistencyType,
    private readonly description: string,
    private readonly context?: Record<string, unknown>,
  ) {}

  static create(
    type: ConnectionInconsistencyType,
    description: string,
    context?: Record<string, unknown>,
  ): ConnectionInconsistencyDetails {
    return new ConnectionInconsistencyDetails(type, description, context);
  }

  static missingPremise(): ConnectionInconsistencyDetails {
    return new ConnectionInconsistencyDetails(
      ConnectionInconsistencyType.MISSING_PREMISE,
      'Non-bootstrap argument has no premises',
    );
  }

  static danglingConclusion(): ConnectionInconsistencyDetails {
    return new ConnectionInconsistencyDetails(
      ConnectionInconsistencyType.DANGLING_CONCLUSION,
      'Conclusions are not consumed by any other argument',
    );
  }

  static typeMismatch(expected: string, actual: string): ConnectionInconsistencyDetails {
    return new ConnectionInconsistencyDetails(
      ConnectionInconsistencyType.TYPE_MISMATCH,
      'Statement type mismatch in connection',
      { expected, actual },
    );
  }

  static circularDependency(cyclePath: string[]): ConnectionInconsistencyDetails {
    return new ConnectionInconsistencyDetails(
      ConnectionInconsistencyType.CIRCULAR_DEPENDENCY,
      'Circular dependency detected in argument chain',
      { cyclePath },
    );
  }

  getType(): ConnectionInconsistencyType {
    return this.inconsistencyType;
  }

  getDescription(): string {
    return this.description;
  }

  getContext(): Record<string, unknown> | undefined {
    return this.context;
  }

  toString(): string {
    if (this.context) {
      return `${this.description} (${JSON.stringify(this.context)})`;
    }
    return this.description;
  }

  equals(other: ConnectionInconsistencyDetails): boolean {
    return (
      this.inconsistencyType === other.inconsistencyType &&
      this.description === other.description &&
      JSON.stringify(this.context) === JSON.stringify(other.context)
    );
  }
}

export class ValidationRule extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ValidationRule, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Validation rule cannot be empty', { field: 'value', value }));
    }

    const trimmed = value.trim();

    if (trimmed.length > 50000) {
      return err(
        new ValidationError('Validation rule cannot exceed 50000 characters', {
          field: 'value',
          value: trimmed.length,
        }),
      );
    }

    // Basic syntax validation for common scripting patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /__proto__/,
      /constructor\s*\[/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return err(
          new ValidationError('Validation rule contains potentially dangerous code', {
            field: 'pattern',
            value: pattern.toString(),
          }),
        );
      }
    }

    return ok(new ValidationRule(trimmed));
  }

  static fromString(value: string): Result<ValidationRule, ValidationError> {
    return ValidationRule.create(value);
  }

  containsPattern(pattern: string): boolean {
    return this.value.includes(pattern);
  }

  getComplexity(): number {
    // Simple heuristic for rule complexity based on length and nesting
    const lines = this.value.split('\n').length;
    const brackets = (this.value.match(/[{}[\]()]/g) || []).length;
    return lines + brackets / 10;
  }

  isSimple(): boolean {
    return this.getComplexity() < 10;
  }

  isComplex(): boolean {
    return this.getComplexity() > 50;
  }
}

export class MaxDepth extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<MaxDepth, ValidationError> {
    if (!isInteger(value) || value < 1) {
      return err(
        new ValidationError('Max depth must be a positive integer', {
          field: 'value',
          value,
        }),
      );
    }

    if (value > 1000) {
      return err(
        new ValidationError('Max depth cannot exceed 1000 (infinite loop protection)', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new MaxDepth(value));
  }

  static fromNumber(value: number): Result<MaxDepth, ValidationError> {
    return MaxDepth.create(value);
  }

  static default(): MaxDepth {
    return new MaxDepth(100);
  }

  static shallow(): MaxDepth {
    return new MaxDepth(10);
  }

  static deep(): MaxDepth {
    return new MaxDepth(500);
  }

  isExceeded(currentDepth: number): boolean {
    return currentDepth > this.value;
  }

  remaining(currentDepth: number): number {
    return Math.max(0, this.value - currentDepth);
  }

  isShallow(): boolean {
    return this.value <= 10;
  }

  isDeep(): boolean {
    return this.value >= 500;
  }
}

export class ConnectionStrength extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  static create(value: number): Result<ConnectionStrength, ValidationError> {
    if (!isFiniteNumber(value) || value < 0 || value > 1) {
      return err(
        new ValidationError('Connection strength must be between 0 and 1', {
          field: 'value',
          value,
        }),
      );
    }

    return ok(new ConnectionStrength(value));
  }

  static fromNumber(value: number): Result<ConnectionStrength, ValidationError> {
    return ConnectionStrength.create(value);
  }

  static none(): ConnectionStrength {
    return new ConnectionStrength(0);
  }

  static weak(): ConnectionStrength {
    return new ConnectionStrength(0.25);
  }

  static moderate(): ConnectionStrength {
    return new ConnectionStrength(0.5);
  }

  static strong(): ConnectionStrength {
    return new ConnectionStrength(0.75);
  }

  static absolute(): ConnectionStrength {
    return new ConnectionStrength(1);
  }

  isNone(): boolean {
    return this.value === 0;
  }

  isWeak(): boolean {
    return this.value > 0 && this.value <= 0.3;
  }

  isModerate(): boolean {
    return this.value > 0.3 && this.value <= 0.7;
  }

  isStrong(): boolean {
    return this.value > 0.7 && this.value < 1;
  }

  isAbsolute(): boolean {
    return this.value === 1;
  }

  combine(other: ConnectionStrength): ConnectionStrength {
    // Combine strengths using geometric mean
    return new ConnectionStrength(Math.sqrt(this.value * other.value));
  }

  weaken(factor: number): Result<ConnectionStrength, ValidationError> {
    if (factor < 0 || factor > 1) {
      return err(
        new ValidationError('Weakening factor must be between 0 and 1', {
          field: 'factor',
          value: factor,
        }),
      );
    }
    return ConnectionStrength.create(this.value * factor);
  }

  strengthen(factor: number): Result<ConnectionStrength, ValidationError> {
    if (factor < 1) {
      return err(
        new ValidationError('Strengthening factor must be at least 1', {
          field: 'factor',
          value: factor,
        }),
      );
    }
    return ConnectionStrength.create(Math.min(1, this.value * factor));
  }
}
