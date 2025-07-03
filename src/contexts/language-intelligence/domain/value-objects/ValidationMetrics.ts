import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class ValidationMetrics {
  private constructor(
    private readonly validationTimeMs: number,
    private readonly issueCount: number,
    private readonly inputSize: number,
    private readonly ruleCount: number
  ) {}

  static create(
    validationTimeMs: number,
    issueCount: number,
    inputSize: number,
    ruleCount: number
  ): Result<ValidationMetrics, ValidationError> {
    if (validationTimeMs < 0) {
      return err(new ValidationError('Validation time cannot be negative'));
    }

    if (issueCount < 0) {
      return err(new ValidationError('Issue count cannot be negative'));
    }

    if (inputSize < 0) {
      return err(new ValidationError('Input size cannot be negative'));
    }

    if (ruleCount < 0) {
      return err(new ValidationError('Rule count cannot be negative'));
    }

    return ok(new ValidationMetrics(validationTimeMs, issueCount, inputSize, ruleCount));
  }

  static empty(): ValidationMetrics {
    return new ValidationMetrics(0, 0, 0, 0);
  }

  getValidationTimeMs(): number {
    return this.validationTimeMs;
  }

  getIssueCount(): number {
    return this.issueCount;
  }

  getInputSize(): number {
    return this.inputSize;
  }

  getRuleCount(): number {
    return this.ruleCount;
  }

  getValidationSpeed(): number {
    if (this.validationTimeMs === 0) {
      return this.inputSize === 0 ? 0 : Infinity;
    }
    return this.inputSize / this.validationTimeMs;
  }

  getTimePerRule(): number {
    if (this.ruleCount === 0) {
      return this.validationTimeMs === 0 ? 0 : Infinity;
    }
    return this.validationTimeMs / this.ruleCount;
  }

  getIssueDensity(): number {
    if (this.inputSize === 0) {
      return this.issueCount === 0 ? 0 : Infinity;
    }
    return this.issueCount / this.inputSize;
  }

  getRuleEfficiency(): number {
    if (this.ruleCount === 0) {
      return this.issueCount === 0 ? 0 : Infinity;
    }
    return this.issueCount / this.ruleCount;
  }

  combineWith(other: ValidationMetrics): ValidationMetrics {
    return new ValidationMetrics(
      this.validationTimeMs + other.validationTimeMs,
      this.issueCount + other.issueCount,
      this.inputSize + other.inputSize,
      this.ruleCount + other.ruleCount
    );
  }

  averageWith(other: ValidationMetrics): ValidationMetrics {
    return new ValidationMetrics(
      (this.validationTimeMs + other.validationTimeMs) / 2,
      (this.issueCount + other.issueCount) / 2,
      (this.inputSize + other.inputSize) / 2,
      (this.ruleCount + other.ruleCount) / 2
    );
  }

  isFast(): boolean {
    return this.validationTimeMs <= 100; // Fast if under 100ms
  }

  isSlow(): boolean {
    return this.validationTimeMs >= 500; // Slow if over 500ms
  }

  isAccurate(): boolean {
    return this.getIssueDensity() <= 0.1; // Accurate if low issue density
  }

  hasEfficientRuleUsage(): boolean {
    return this.getRuleEfficiency() >= 1.0; // Efficient if at least 1 issue per rule
  }

  isFasterThan(other: ValidationMetrics): boolean {
    return this.validationTimeMs < other.validationTimeMs;
  }

  isMoreAccurateThan(other: ValidationMetrics): boolean {
    return this.getIssueDensity() < other.getIssueDensity();
  }

  isBetterThan(other: ValidationMetrics): boolean {
    // A simple scoring: faster is better, fewer issues is better
    const thisScore = this.getQualityScore() + 1000 / Math.max(this.validationTimeMs, 1);
    const otherScore = other.getQualityScore() + 1000 / Math.max(other.validationTimeMs, 1);
    return thisScore > otherScore;
  }

  isAcceptablePerformance(): boolean {
    return this.isFast() && this.isAccurate();
  }

  combine(other: ValidationMetrics): ValidationMetrics {
    return this.combineWith(other);
  }

  average(other: ValidationMetrics): ValidationMetrics {
    return this.averageWith(other);
  }

  getQualityScore(): number {
    // Score from 0-100, higher is better
    // Perfect score (100) for zero issues, lower scores for more issues
    if (this.issueCount === 0 && this.validationTimeMs === 0) {
      return 100;
    }

    // Base score starts at 100 and decreases with issues and time
    let score = 100;

    // Penalize based on issue density (more issues = lower score)
    const issueDensity = this.getIssueDensity();
    score = score * Math.max(0, 1 - issueDensity * 50); // Scale penalty

    // Penalize based on validation time (slower = lower score)
    score = score * Math.max(0.1, 1 - this.validationTimeMs / 1000); // Min 10% of base score

    return Math.max(0, Math.min(100, score));
  }

  getEfficiencyScore(): number {
    // Performance efficiency: faster and more accurate = higher score
    const speedScore = Math.max(0, 1 - this.validationTimeMs / 1000);
    const qualityScore = this.getQualityScore();
    return (speedScore + qualityScore) / 2;
  }

  meetsPerformanceThreshold(thresholdMs: number): boolean {
    return this.validationTimeMs <= thresholdMs;
  }

  meetsQualityThreshold(maxIssueDensity: number): boolean {
    return this.getIssueDensity() <= maxIssueDensity;
  }

  toString(): string {
    return `ValidationMetrics(time: ${this.validationTimeMs}ms, ${this.issueCount} issues, size: ${this.inputSize}, ${this.ruleCount} rules)`;
  }

  toJSON(): Record<string, unknown> {
    return {
      validationTimeMs: this.validationTimeMs,
      issueCount: this.issueCount,
      inputSize: this.inputSize,
      ruleCount: this.ruleCount,
    };
  }

  equals(other: ValidationMetrics): boolean {
    return (
      this.validationTimeMs === other.validationTimeMs &&
      this.issueCount === other.issueCount &&
      this.inputSize === other.inputSize &&
      this.ruleCount === other.ruleCount
    );
  }
}
