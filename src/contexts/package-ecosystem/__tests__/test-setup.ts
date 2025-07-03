/**
 * Test setup for package ecosystem domain testing
 *
 * Configures custom matchers, test utilities, and common test data
 * for comprehensive dependency resolution testing.
 */

import { afterEach, beforeEach } from 'vitest';

// Import custom matchers to extend Vitest expectations
import './matchers/dependency-matchers.js';

// Global test configuration
beforeEach(() => {
  // Reset any global state before each test
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  // Clean up after each test
  if (global.gc) {
    global.gc();
  }
});

// Test performance configuration
export const TEST_PERFORMANCE_LIMITS = {
  DEPENDENCY_RESOLUTION_MAX_TIME: 5000, // 5 seconds
  VERSION_RESOLUTION_MAX_TIME: 1000, // 1 second
  LARGE_GRAPH_RESOLUTION_TIME: 10000, // 10 seconds for stress tests
  MEMORY_GROWTH_LIMIT: 50 * 1024 * 1024, // 50MB
} as const;

// Property-based testing configuration
export const PROPERTY_TEST_CONFIG = {
  numRuns: 50,
  verbose: false,
  timeout: 30000,
} as const;

// Test scenarios for comprehensive coverage
export const TEST_SCENARIOS = {
  SMALL_GRAPH: { packageCount: 5, maxDepth: 2, branchingFactor: 2 },
  MEDIUM_GRAPH: { packageCount: 20, maxDepth: 4, branchingFactor: 3 },
  LARGE_GRAPH: { packageCount: 100, maxDepth: 6, branchingFactor: 4 },
  STRESS_GRAPH: { packageCount: 500, maxDepth: 8, branchingFactor: 5 },
} as const;

// Real-world package patterns for integration testing
export const REAL_WORLD_PATTERNS = {
  WEB_APP: {
    name: 'modern-web-app',
    dependencies: ['react', 'react-dom', 'typescript', 'webpack'],
    devDependencies: ['vitest', '@biomejs/biome', '@types/react'],
  },
  LIBRARY: {
    name: 'utility-library',
    dependencies: ['lodash', 'ramda'],
    devDependencies: ['rollup', 'typescript', 'vitest'],
  },
  MONOREPO: {
    packages: [
      { name: '@org/core', dependencies: [] },
      { name: '@org/utils', dependencies: ['@org/core'] },
      { name: '@org/api', dependencies: ['@org/core', '@org/utils'] },
      { name: '@org/ui', dependencies: ['@org/core', '@org/utils'] },
    ],
  },
  MICROSERVICE: {
    name: 'api-service',
    dependencies: ['express', 'mongoose', 'jsonwebtoken', 'helmet'],
    devDependencies: ['nodemon', 'supertest', 'vitest'],
  },
} as const;

// Test data patterns for edge cases
export const EDGE_CASE_PATTERNS = {
  CIRCULAR_DEPENDENCIES: [
    { cycleLength: 2, description: 'Simple A->B->A cycle' },
    { cycleLength: 3, description: 'Triangle A->B->C->A cycle' },
    { cycleLength: 5, description: 'Complex 5-node cycle' },
  ],
  VERSION_CONFLICTS: [
    {
      packages: [
        { name: 'shared-lib', requiredBy: ['app-a'], version: '^1.0.0' },
        { name: 'shared-lib', requiredBy: ['app-b'], version: '^2.0.0' },
      ],
      description: 'Major version conflict',
    },
    {
      packages: [
        { name: 'common', requiredBy: ['dep-a'], version: '~1.2.0' },
        { name: 'common', requiredBy: ['dep-b'], version: '~1.3.0' },
      ],
      description: 'Minor version conflict',
    },
  ],
  DEEP_DEPENDENCIES: [
    { depth: 10, description: 'Very deep dependency chain' },
    { depth: 20, description: 'Extremely deep dependency chain' },
  ],
} as const;

// Helper utilities for test assertions
export const testUtils = {
  /**
   * Measure execution time of an async operation
   */
  async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await operation();
    const time = performance.now() - start;
    return { result, time };
  },

  /**
   * Generate deterministic test data based on seed
   */
  generateDeterministicData(seed: number) {
    // Use seed to generate consistent test data
    return {
      packageName: `test-package-${seed}`,
      version: `${Math.floor(seed / 100)}.${Math.floor(seed / 10) % 10}.${seed % 10}`,
      dependencies: Array.from({ length: seed % 5 }, (_, i) => `dep-${seed}-${i}`),
    };
  },

  /**
   * Create a mock with realistic behavior patterns
   */
  createRealisticMock<T>(baseImplementation: Partial<T>): T {
    return new Proxy(baseImplementation as T, {
      get(target, prop) {
        if (prop in target) {
          return target[prop as keyof T];
        }

        // Return a default implementation for missing methods
        return () => {
          throw new Error(`Method ${String(prop)} not implemented in mock`);
        };
      },
    });
  },

  /**
   * Validate test data integrity
   */
  validateTestData(data: any): boolean {
    // Basic validation to ensure test data is well-formed
    if (!data || typeof data !== 'object') return false;

    // Add specific validation rules based on data type
    return true;
  },
} as const;

// Memory tracking utilities for performance tests
export class MemoryTracker {
  private initialMemory: number;
  private checkpoints: Array<{ label: string; memory: number; time: number }> = [];

  constructor() {
    this.initialMemory = process.memoryUsage().heapUsed;
  }

  checkpoint(label: string): void {
    const memory = process.memoryUsage().heapUsed;
    const time = Date.now();
    this.checkpoints.push({ label, memory, time });
  }

  getMemoryGrowth(): number {
    const currentMemory = process.memoryUsage().heapUsed;
    return currentMemory - this.initialMemory;
  }

  getReport(): string {
    const growth = this.getMemoryGrowth();
    const checkpointReport = this.checkpoints
      .map((cp) => `${cp.label}: ${Math.round(cp.memory / 1024 / 1024)}MB`)
      .join(', ');

    return `Memory growth: ${Math.round(growth / 1024 / 1024)}MB | Checkpoints: ${checkpointReport}`;
  }

  reset(): void {
    this.initialMemory = process.memoryUsage().heapUsed;
    this.checkpoints = [];
  }
}

// Performance benchmark utilities
export class PerformanceBenchmark {
  private measurements: Array<{ operation: string; time: number; details?: any }> = [];

  async measure<T>(operation: string, fn: () => Promise<T>, details?: any): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const time = performance.now() - start;

    this.measurements.push({ operation, time, details });
    return result;
  }

  getAverageTime(operation: string): number {
    const times = this.measurements.filter((m) => m.operation === operation).map((m) => m.time);

    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getReport(): string {
    const grouped = this.measurements.reduce(
      (acc, m) => {
        if (!acc[m.operation]) acc[m.operation] = [];
        acc[m.operation].push(m.time);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.entries(grouped)
      .map(([op, times]) => {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        return `${op}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms (${times.length} runs)`;
      })
      .join('\n');
  }

  reset(): void {
    this.measurements = [];
  }
}

// Export everything for easy importing in tests
export * from './matchers/dependency-matchers.js';
export * from './test-factories/dependency-test-factories.js';
