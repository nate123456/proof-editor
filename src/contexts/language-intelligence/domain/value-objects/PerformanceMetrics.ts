import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';

export class PerformanceMetrics {
  private constructor(
    private readonly totalTimeMs: number,
    private readonly validationTimeMs: number,
    private readonly analysisTimeMs: number,
    private readonly patternRecognitionTimeMs: number,
    private readonly memoryUsageMb: number,
    private readonly cacheHitRate: number,
    private readonly operationCounts: OperationCounts,
    private readonly errorCounts: ErrorCounts,
    private readonly targets: PerformanceTargets
  ) {}

  static create(
    totalTimeMs: number,
    validationTimeMs: number,
    analysisTimeMs: number,
    patternRecognitionTimeMs: number,
    memoryUsageMb: number = 0,
    cacheHitRate: number = 0,
    operationCounts: OperationCounts = OperationCounts.createEmpty(),
    errorCounts: ErrorCounts = ErrorCounts.createEmpty(),
    targets: PerformanceTargets = PerformanceTargets.createDefault()
  ): Result<PerformanceMetrics, ValidationError> {
    if (totalTimeMs < 0 || validationTimeMs < 0 || analysisTimeMs < 0 || patternRecognitionTimeMs < 0) {
      return {
        success: false,
        error: new ValidationError('Time values cannot be negative')
      };
    }

    if (memoryUsageMb < 0) {
      return {
        success: false,
        error: new ValidationError('Memory usage cannot be negative')
      };
    }

    if (cacheHitRate < 0 || cacheHitRate > 1) {
      return {
        success: false,
        error: new ValidationError('Cache hit rate must be between 0 and 1')
      };
    }

    return {
      success: true,
      data: new PerformanceMetrics(
        totalTimeMs,
        validationTimeMs,
        analysisTimeMs,
        patternRecognitionTimeMs,
        memoryUsageMb,
        cacheHitRate,
        operationCounts,
        errorCounts,
        targets
      )
    };
  }

  static createEmpty(): PerformanceMetrics {
    return new PerformanceMetrics(
      0,
      0,
      0,
      0,
      0,
      0,
      OperationCounts.createEmpty(),
      ErrorCounts.createEmpty(),
      PerformanceTargets.createDefault()
    );
  }

  static createFromTracker(
    totalTimeMs: number,
    memoryUsageMb: number,
    operationCounts: OperationCounts,
    targets: PerformanceTargets = PerformanceTargets.createDefault()
  ): PerformanceMetrics {
    // Estimate breakdown based on typical patterns
    const validationTimeMs = Math.round(totalTimeMs * 0.4);
    const analysisTimeMs = Math.round(totalTimeMs * 0.3);
    const patternRecognitionTimeMs = Math.round(totalTimeMs * 0.3);

    return new PerformanceMetrics(
      totalTimeMs,
      validationTimeMs,
      analysisTimeMs,
      patternRecognitionTimeMs,
      memoryUsageMb,
      0,
      operationCounts,
      ErrorCounts.createEmpty(),
      targets
    );
  }

  getTotalTimeMs(): number {
    return this.totalTimeMs;
  }

  getValidationTimeMs(): number {
    return this.validationTimeMs;
  }

  getAnalysisTimeMs(): number {
    return this.analysisTimeMs;
  }

  getPatternRecognitionTimeMs(): number {
    return this.patternRecognitionTimeMs;
  }

  getMemoryUsageMb(): number {
    return this.memoryUsageMb;
  }

  getCacheHitRate(): number {
    return this.cacheHitRate;
  }

  getOperationCounts(): OperationCounts {
    return this.operationCounts;
  }

  getErrorCounts(): ErrorCounts {
    return this.errorCounts;
  }

  getTargets(): PerformanceTargets {
    return this.targets;
  }

  meetsTargets(): boolean {
    return this.totalTimeMs <= this.targets.maxTotalTimeMs &&
           this.validationTimeMs <= this.targets.maxValidationTimeMs &&
           this.memoryUsageMb <= this.targets.maxMemoryUsageMb;
  }

  meetsValidationTarget(): boolean {
    return this.validationTimeMs <= this.targets.maxValidationTimeMs;
  }

  meetsAnalysisTarget(): boolean {
    return this.analysisTimeMs <= this.targets.maxAnalysisTimeMs;
  }

  meetsMemoryTarget(): boolean {
    return this.memoryUsageMb <= this.targets.maxMemoryUsageMb;
  }

  getPerformanceScore(): number {
    const timeScore = Math.max(0, 1 - (this.totalTimeMs / this.targets.maxTotalTimeMs));
    const memoryScore = Math.max(0, 1 - (this.memoryUsageMb / this.targets.maxMemoryUsageMb));
    const cacheScore = this.cacheHitRate;
    const errorScore = Math.max(0, 1 - (this.errorCounts.getTotalErrors() / 10));

    return (timeScore * 0.4 + memoryScore * 0.3 + cacheScore * 0.2 + errorScore * 0.1);
  }

  getEfficiencyRating(): EfficiencyRating {
    const score = this.getPerformanceScore();
    
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.6) return 'acceptable';
    if (score >= 0.4) return 'poor';
    return 'unacceptable';
  }

  getThroughput(): number {
    const totalOperations = this.operationCounts.getTotalOperations();
    return totalOperations > 0 ? totalOperations / (this.totalTimeMs / 1000) : 0;
  }

  getValidationEfficiency(): number {
    const validations = this.operationCounts.getValidationOperations();
    return validations > 0 ? validations / (this.validationTimeMs / 1000) : 0;
  }

  getAnalysisEfficiency(): number {
    const analyses = this.operationCounts.getAnalysisOperations();
    return analyses > 0 ? analyses / (this.analysisTimeMs / 1000) : 0;
  }

  combineWith(other: PerformanceMetrics): PerformanceMetrics {
    return new PerformanceMetrics(
      this.totalTimeMs + other.totalTimeMs,
      this.validationTimeMs + other.validationTimeMs,
      this.analysisTimeMs + other.analysisTimeMs,
      this.patternRecognitionTimeMs + other.patternRecognitionTimeMs,
      Math.max(this.memoryUsageMb, other.memoryUsageMb),
      (this.cacheHitRate + other.cacheHitRate) / 2,
      this.operationCounts.combineWith(other.operationCounts),
      this.errorCounts.combineWith(other.errorCounts),
      this.targets
    );
  }

  withCacheMetrics(hitRate: number, misses: number): PerformanceMetrics {
    return new PerformanceMetrics(
      this.totalTimeMs,
      this.validationTimeMs,
      this.analysisTimeMs,
      this.patternRecognitionTimeMs,
      this.memoryUsageMb,
      hitRate,
      this.operationCounts.withCacheOperations(misses),
      this.errorCounts,
      this.targets
    );
  }

  toReport(): PerformanceReport {
    return {
      totalTimeMs: this.totalTimeMs,
      validationTimeMs: this.validationTimeMs,
      analysisTimeMs: this.analysisTimeMs,
      patternRecognitionTimeMs: this.patternRecognitionTimeMs,
      memoryUsageMb: this.memoryUsageMb,
      cacheHitRate: Math.round(this.cacheHitRate * 100),
      performanceScore: Math.round(this.getPerformanceScore() * 100),
      efficiencyRating: this.getEfficiencyRating(),
      throughput: Math.round(this.getThroughput() * 100) / 100,
      meetsTargets: this.meetsTargets(),
      operationCounts: this.operationCounts.toSummary(),
      errorCounts: this.errorCounts.toSummary()
    };
  }
}

export class OperationCounts {
  constructor(
    private readonly validationOperations: number,
    private readonly analysisOperations: number,
    private readonly patternRecognitionOperations: number,
    private readonly cacheOperations: number
  ) {}

  static createEmpty(): OperationCounts {
    return new OperationCounts(0, 0, 0, 0);
  }

  static create(
    validationOperations: number,
    analysisOperations: number,
    patternRecognitionOperations: number,
    cacheOperations: number = 0
  ): OperationCounts {
    return new OperationCounts(
      validationOperations,
      analysisOperations,
      patternRecognitionOperations,
      cacheOperations
    );
  }

  getValidationOperations(): number {
    return this.validationOperations;
  }

  getAnalysisOperations(): number {
    return this.analysisOperations;
  }

  getPatternRecognitionOperations(): number {
    return this.patternRecognitionOperations;
  }

  getCacheOperations(): number {
    return this.cacheOperations;
  }

  getTotalOperations(): number {
    return this.validationOperations + this.analysisOperations + this.patternRecognitionOperations;
  }

  combineWith(other: OperationCounts): OperationCounts {
    return new OperationCounts(
      this.validationOperations + other.validationOperations,
      this.analysisOperations + other.analysisOperations,
      this.patternRecognitionOperations + other.patternRecognitionOperations,
      this.cacheOperations + other.cacheOperations
    );
  }

  withCacheOperations(cacheOperations: number): OperationCounts {
    return new OperationCounts(
      this.validationOperations,
      this.analysisOperations,
      this.patternRecognitionOperations,
      cacheOperations
    );
  }

  toSummary(): OperationSummary {
    return {
      validation: this.validationOperations,
      analysis: this.analysisOperations,
      patternRecognition: this.patternRecognitionOperations,
      cache: this.cacheOperations,
      total: this.getTotalOperations()
    };
  }
}

export class ErrorCounts {
  constructor(
    private readonly validationErrors: number,
    private readonly analysisErrors: number,
    private readonly patternRecognitionErrors: number,
    private readonly systemErrors: number
  ) {}

  static createEmpty(): ErrorCounts {
    return new ErrorCounts(0, 0, 0, 0);
  }

  static create(
    validationErrors: number,
    analysisErrors: number,
    patternRecognitionErrors: number,
    systemErrors: number = 0
  ): ErrorCounts {
    return new ErrorCounts(
      validationErrors,
      analysisErrors,
      patternRecognitionErrors,
      systemErrors
    );
  }

  getValidationErrors(): number {
    return this.validationErrors;
  }

  getAnalysisErrors(): number {
    return this.analysisErrors;
  }

  getPatternRecognitionErrors(): number {
    return this.patternRecognitionErrors;
  }

  getSystemErrors(): number {
    return this.systemErrors;
  }

  getTotalErrors(): number {
    return this.validationErrors + this.analysisErrors + this.patternRecognitionErrors + this.systemErrors;
  }

  combineWith(other: ErrorCounts): ErrorCounts {
    return new ErrorCounts(
      this.validationErrors + other.validationErrors,
      this.analysisErrors + other.analysisErrors,
      this.patternRecognitionErrors + other.patternRecognitionErrors,
      this.systemErrors + other.systemErrors
    );
  }

  toSummary(): ErrorSummary {
    return {
      validation: this.validationErrors,
      analysis: this.analysisErrors,
      patternRecognition: this.patternRecognitionErrors,
      system: this.systemErrors,
      total: this.getTotalErrors()
    };
  }
}

export class PerformanceTargets {
  constructor(
    private readonly maxTotalTimeMs: number,
    private readonly maxValidationTimeMs: number,
    private readonly maxAnalysisTimeMs: number,
    private readonly maxMemoryUsageMb: number,
    private readonly minCacheHitRate: number
  ) {}

  static createDefault(): PerformanceTargets {
    return new PerformanceTargets(100, 10, 50, 50, 0.8);
  }

  static createStrict(): PerformanceTargets {
    return new PerformanceTargets(50, 5, 25, 25, 0.9);
  }

  static createRelaxed(): PerformanceTargets {
    return new PerformanceTargets(500, 50, 250, 100, 0.5);
  }

  getMaxTotalTimeMs(): number {
    return this.maxTotalTimeMs;
  }

  getMaxValidationTimeMs(): number {
    return this.maxValidationTimeMs;
  }

  getMaxAnalysisTimeMs(): number {
    return this.maxAnalysisTimeMs;
  }

  getMaxMemoryUsageMb(): number {
    return this.maxMemoryUsageMb;
  }

  getMinCacheHitRate(): number {
    return this.minCacheHitRate;
  }
}

export type EfficiencyRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';

export interface PerformanceReport {
  totalTimeMs: number;
  validationTimeMs: number;
  analysisTimeMs: number;
  patternRecognitionTimeMs: number;
  memoryUsageMb: number;
  cacheHitRate: number;
  performanceScore: number;
  efficiencyRating: EfficiencyRating;
  throughput: number;
  meetsTargets: boolean;
  operationCounts: OperationSummary;
  errorCounts: ErrorSummary;
}

export interface OperationSummary {
  validation: number;
  analysis: number;
  patternRecognition: number;
  cache: number;
  total: number;
}

export interface ErrorSummary {
  validation: number;
  analysis: number;
  patternRecognition: number;
  system: number;
  total: number;
}