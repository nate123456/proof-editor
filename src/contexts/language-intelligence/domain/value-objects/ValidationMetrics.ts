import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

export class ValidationMetrics {
  private constructor(
    private readonly validationTimeMs: number,
    private readonly diagnosticCount: number,
    private readonly textLength: number,
    private readonly statementCount: number,
    private readonly memoryUsageMb: number,
    private readonly cacheHitRate: number
  ) {}

  static create(
    validationTimeMs: number,
    diagnosticCount: number,
    textLength: number,
    statementCount: number,
    memoryUsageMb = 0,
    cacheHitRate = 0
  ): Result<ValidationMetrics, ValidationError> {
    if (validationTimeMs < 0) {
      return err(new ValidationError('Validation time cannot be negative'));
    }

    if (diagnosticCount < 0) {
      return err(new ValidationError('Diagnostic count cannot be negative'));
    }

    if (textLength < 0) {
      return err(new ValidationError('Text length cannot be negative'));
    }

    if (statementCount < 0) {
      return err(new ValidationError('Statement count cannot be negative'));
    }

    if (cacheHitRate < 0 || cacheHitRate > 1) {
      return err(new ValidationError('Cache hit rate must be between 0 and 1'));
    }

    return ok(
      new ValidationMetrics(
        validationTimeMs,
        diagnosticCount,
        textLength,
        statementCount,
        memoryUsageMb,
        cacheHitRate
      )
    );
  }

  static empty(): ValidationMetrics {
    return new ValidationMetrics(0, 0, 0, 0, 0, 0);
  }

  getValidationTimeMs(): number {
    return this.validationTimeMs;
  }

  getDiagnosticCount(): number {
    return this.diagnosticCount;
  }

  getTextLength(): number {
    return this.textLength;
  }

  getStatementCount(): number {
    return this.statementCount;
  }

  getMemoryUsageMb(): number {
    return this.memoryUsageMb;
  }

  getCacheHitRate(): number {
    return this.cacheHitRate;
  }

  getValidationSpeed(): number {
    return this.textLength > 0 ? this.textLength / Math.max(this.validationTimeMs, 1) : 0;
  }

  getDiagnosticDensity(): number {
    return this.textLength > 0 ? this.diagnosticCount / this.textLength : 0;
  }

  getEfficiencyScore(): number {
    const timeScore = Math.max(0, 1 - this.validationTimeMs / 1000);
    const memoryScore = Math.max(0, 1 - this.memoryUsageMb / 100);
    const cacheScore = this.cacheHitRate;

    return (timeScore + memoryScore + cacheScore) / 3;
  }

  exceedsPerformanceTarget(targetMs: number): boolean {
    return this.validationTimeMs > targetMs;
  }

  meetsPerformanceTarget(targetMs: number): boolean {
    return this.validationTimeMs <= targetMs;
  }

  combineWith(other: ValidationMetrics): ValidationMetrics {
    return new ValidationMetrics(
      this.validationTimeMs + other.validationTimeMs,
      this.diagnosticCount + other.diagnosticCount,
      this.textLength + other.textLength,
      this.statementCount + other.statementCount,
      Math.max(this.memoryUsageMb, other.memoryUsageMb),
      (this.cacheHitRate + other.cacheHitRate) / 2
    );
  }

  withValidationTime(newTimeMs: number): Result<ValidationMetrics, ValidationError> {
    if (newTimeMs < 0) {
      return err(new ValidationError('Validation time cannot be negative'));
    }

    return ok(
      new ValidationMetrics(
        newTimeMs,
        this.diagnosticCount,
        this.textLength,
        this.statementCount,
        this.memoryUsageMb,
        this.cacheHitRate
      )
    );
  }

  toPerformanceReport(): PerformanceReport {
    return {
      validationTimeMs: this.validationTimeMs,
      memoryUsageMb: this.memoryUsageMb,
      cacheHitRate: this.cacheHitRate,
      validationSpeed: this.getValidationSpeed(),
      diagnosticDensity: this.getDiagnosticDensity(),
      efficiencyScore: this.getEfficiencyScore(),
      textLength: this.textLength,
      diagnosticCount: this.diagnosticCount,
      statementCount: this.statementCount,
    };
  }

  equals(other: ValidationMetrics): boolean {
    return (
      this.validationTimeMs === other.validationTimeMs &&
      this.diagnosticCount === other.diagnosticCount &&
      this.textLength === other.textLength &&
      this.statementCount === other.statementCount
    );
  }
}

export interface PerformanceReport {
  validationTimeMs: number;
  memoryUsageMb: number;
  cacheHitRate: number;
  validationSpeed: number;
  diagnosticDensity: number;
  efficiencyScore: number;
  textLength: number;
  diagnosticCount: number;
  statementCount: number;
}
