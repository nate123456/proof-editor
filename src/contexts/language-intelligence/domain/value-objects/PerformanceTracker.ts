export class PerformanceTracker {
  private startTime: number;
  private endTime: number | null = null;
  private memoryUsageStart: number;
  private memoryUsageEnd: number | null = null;

  private constructor(startTime: number, memoryUsageStart: number) {
    this.startTime = startTime;
    this.memoryUsageStart = memoryUsageStart;
  }

  static start(): PerformanceTracker {
    const startTime = performance.now();
    const memoryUsage = PerformanceTracker.getCurrentMemoryUsage();
    return new PerformanceTracker(startTime, memoryUsage);
  }

  stop(): void {
    if (this.endTime === null) {
      this.endTime = performance.now();
      this.memoryUsageEnd = PerformanceTracker.getCurrentMemoryUsage();
    }
  }

  getElapsedMs(): number {
    const endTime = this.endTime || performance.now();
    return Math.max(0, endTime - this.startTime);
  }

  getMemoryUsageMb(): number {
    const endMemory = this.memoryUsageEnd || PerformanceTracker.getCurrentMemoryUsage();
    return Math.max(0, endMemory - this.memoryUsageStart);
  }

  isRunning(): boolean {
    return this.endTime === null;
  }

  hasExceededTimeout(timeoutMs: number): boolean {
    return this.getElapsedMs() > timeoutMs;
  }

  private static getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && (process as any)?.memoryUsage) {
      // Node.js environment
      return (process as any).memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
    }

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      // Browser environment with performance.memory
      const { memory } = performance as any;
      return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }

    // Fallback - no memory tracking available
    return 0;
  }

  getPerformanceReport(): PerformanceReport {
    return {
      elapsedMs: this.getElapsedMs(),
      memoryUsageMb: this.getMemoryUsageMb(),
      isRunning: this.isRunning(),
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  reset(): PerformanceTracker {
    return PerformanceTracker.start();
  }
}

export interface PerformanceReport {
  elapsedMs: number;
  memoryUsageMb: number;
  isRunning: boolean;
  startTime: number;
  endTime: number | null;
}
