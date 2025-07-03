import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/DomainErrors';

/**
 * PerformanceMetrics value object for tracking performance data
 * Tracks CPU time, memory usage, and provides performance analysis
 */
export class PerformanceMetrics {
  private constructor(
    private readonly totalTimeMs: number,
    private readonly cpuTimeMs: number,
    private readonly memoryUsedBytes: number,
    private readonly peakMemoryBytes: number
  ) {}

  /**
   * Creates PerformanceMetrics with validation
   */
  static create(
    totalTimeMs: number,
    cpuTimeMs: number,
    memoryUsedBytes: number,
    peakMemoryBytes: number
  ): Result<PerformanceMetrics, ValidationError> {
    // Validate that times are not negative
    if (totalTimeMs < 0) {
      return err(new ValidationError('Total time cannot be negative'));
    }

    if (cpuTimeMs < 0) {
      return err(new ValidationError('CPU time cannot be negative'));
    }

    // Validate that memory values are not negative
    if (memoryUsedBytes < 0) {
      return err(new ValidationError('Memory used cannot be negative'));
    }

    if (peakMemoryBytes < 0) {
      return err(new ValidationError('Peak memory cannot be negative'));
    }

    // Validate logical constraints
    if (cpuTimeMs > totalTimeMs) {
      return err(new ValidationError('CPU time cannot exceed total time'));
    }

    if (peakMemoryBytes < memoryUsedBytes) {
      return err(new ValidationError('Peak memory cannot be less than memory used'));
    }

    return ok(new PerformanceMetrics(totalTimeMs, cpuTimeMs, memoryUsedBytes, peakMemoryBytes));
  }

  /**
   * Creates empty performance metrics
   */
  static empty(): PerformanceMetrics {
    return new PerformanceMetrics(0, 0, 0, 0);
  }

  // Basic getters
  getTotalTimeMs(): number {
    return this.totalTimeMs;
  }

  getCpuTimeMs(): number {
    return this.cpuTimeMs;
  }

  getMemoryUsedBytes(): number {
    return this.memoryUsedBytes;
  }

  getPeakMemoryBytes(): number {
    return this.peakMemoryBytes;
  }

  // Derived calculations
  getWaitTimeMs(): number {
    return this.totalTimeMs - this.cpuTimeMs;
  }

  getCpuUtilizationPercent(): number {
    if (this.totalTimeMs === 0) {
      return 0;
    }
    return (this.cpuTimeMs / this.totalTimeMs) * 100;
  }

  getMemoryOverheadBytes(): number {
    return this.peakMemoryBytes - this.memoryUsedBytes;
  }

  getMemoryEfficiencyPercent(): number {
    if (this.peakMemoryBytes === 0) {
      return 100; // Perfect efficiency for no memory usage
    }
    return (this.memoryUsedBytes / this.peakMemoryBytes) * 100;
  }

  // Performance classification
  isFast(): boolean {
    return this.totalTimeMs <= 100; // Threshold for fast performance
  }

  isSlow(): boolean {
    return this.totalTimeMs >= 1000; // Threshold for slow performance
  }

  isMemoryEfficient(): boolean {
    return this.getMemoryEfficiencyPercent() >= 80; // 80% efficiency or better
  }

  hasHighCpuUtilization(): boolean {
    return this.getCpuUtilizationPercent() >= 90; // 90% CPU utilization or higher
  }

  // Comparison operations
  isFasterThan(other: PerformanceMetrics): boolean {
    return this.totalTimeMs < other.totalTimeMs;
  }

  usesLessMemoryThan(other: PerformanceMetrics): boolean {
    return this.peakMemoryBytes < other.peakMemoryBytes;
  }

  isBetterThan(other: PerformanceMetrics): boolean {
    // Simple heuristic: better if both faster and uses less memory
    return this.isFasterThan(other) && this.usesLessMemoryThan(other);
  }

  // Aggregation operations
  combine(other: PerformanceMetrics): PerformanceMetrics {
    return new PerformanceMetrics(
      this.totalTimeMs + other.totalTimeMs,
      this.cpuTimeMs + other.cpuTimeMs,
      this.memoryUsedBytes + other.memoryUsedBytes,
      Math.max(this.peakMemoryBytes, other.peakMemoryBytes) // Use higher peak
    );
  }

  average(other: PerformanceMetrics): PerformanceMetrics {
    return new PerformanceMetrics(
      (this.totalTimeMs + other.totalTimeMs) / 2,
      (this.cpuTimeMs + other.cpuTimeMs) / 2,
      (this.memoryUsedBytes + other.memoryUsedBytes) / 2,
      (this.peakMemoryBytes + other.peakMemoryBytes) / 2
    );
  }

  // Performance scoring
  getPerformanceScore(): number {
    if (this.totalTimeMs === 0 && this.memoryUsedBytes === 0) {
      return 100; // Perfect score for no resource usage
    }

    // Simple scoring algorithm based on speed and memory efficiency
    const timeScore = Math.max(0, 100 - this.totalTimeMs / 10); // Penalty for longer time
    const memoryScore = this.getMemoryEfficiencyPercent();
    const cpuScore = Math.min(100, this.getCpuUtilizationPercent()); // Reward CPU utilization up to 100%

    return timeScore * 0.4 + memoryScore * 0.4 + cpuScore * 0.2;
  }

  // String representation and serialization
  toString(): string {
    return `PerformanceMetrics[${this.totalTimeMs}ms total, ${this.cpuTimeMs}ms CPU, ${this.memoryUsedBytes} bytes used, ${this.peakMemoryBytes} bytes peak]`;
  }

  toJSON(): PerformanceMetricsJSON {
    return {
      totalTimeMs: this.totalTimeMs,
      cpuTimeMs: this.cpuTimeMs,
      memoryUsedBytes: this.memoryUsedBytes,
      peakMemoryBytes: this.peakMemoryBytes,
    };
  }
}

export interface PerformanceMetricsJSON {
  totalTimeMs: number;
  cpuTimeMs: number;
  memoryUsedBytes: number;
  peakMemoryBytes: number;
}
