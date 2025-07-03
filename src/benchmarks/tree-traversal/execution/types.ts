/**
 * Core types and interfaces for the benchmark execution system
 */

import type { Result } from 'neverthrow';

// Core benchmark execution types
export interface BenchmarkResult {
  readonly scenarioName: string;
  readonly implementationName: string;
  readonly dataSetSize: number;
  readonly measurements: PerformanceMeasurement[];
  readonly memoryUsage: MemorySnapshot;
  readonly errors: BenchmarkError[];
  readonly metadata: BenchmarkMetadata;
}

export interface PerformanceMeasurement {
  readonly operationName: string;
  readonly duration: Duration;
  readonly iterations: number;
  readonly throughput: number; // operations per second
  readonly success: boolean;
  readonly timestamp: number;
}

export interface Duration {
  readonly nanoseconds: number;
  readonly microseconds: number;
  readonly milliseconds: number;
  readonly seconds: number;
}

export interface MemorySnapshot {
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly rss: number;
  readonly timestamp: number;
}

export interface BenchmarkError {
  readonly message: string;
  readonly stack?: string;
  readonly operationName: string;
  readonly timestamp: number;
}

export interface BenchmarkMetadata {
  readonly startTime: number;
  readonly endTime: number;
  readonly nodeVersion: string;
  readonly platform: string;
  readonly cpuCount: number;
  readonly memoryLimit: number;
  readonly warmupIterations: number;
  readonly measurementIterations: number;
}

// Test data types
export interface TestNode {
  readonly id: string;
  readonly parentId?: string;
  readonly argumentId: string;
  readonly position?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface TestDataSet {
  readonly name: string;
  readonly size: number;
  readonly nodes: TestNode[];
  readonly description: string;
  readonly complexity: DataSetComplexity;
}

export enum DataSetComplexity {
  Simple = 'simple',
  Medium = 'medium',
  Complex = 'complex',
  Extreme = 'extreme',
}

// Tree representation interfaces
export interface TreeRepresentation {
  readonly name: string;
  readonly version: string;

  // Tree operations
  loadNodes(nodes: TestNode[]): Promise<void>;
  findParent(nodeId: string): Promise<string | null>;
  findRoot(nodeId: string): Promise<string>;
  findChildren(nodeId: string): Promise<string[]>;
  findAncestors(nodeId: string): Promise<string[]>;
  findDescendants(nodeId: string): Promise<string[]>;

  // Tree manipulation
  addNode(node: TestNode): Promise<void>;
  removeNode(nodeId: string): Promise<void>;
  updateParent(nodeId: string, newParentId: string): Promise<void>;

  // Analysis operations
  analyzeStatementFlow(nodeId: string): Promise<FlowAnalysisResult>;
  validatePathCompleteness(nodeId: string): Promise<boolean>;

  // Cleanup and state management
  clear(): Promise<void>;
  getMemoryUsage(): Promise<MemorySnapshot>;
}

export interface FlowAnalysisResult {
  readonly nodeId: string;
  readonly connectedNodes: string[];
  readonly statementConnections: StatementConnection[];
  readonly analysisTime: Duration;
}

export interface StatementConnection {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly sharedStatements: string[];
}

// Benchmark scenario types
export interface BenchmarkScenario {
  readonly name: string;
  readonly description: string;
  readonly category: ScenarioCategory;

  run(
    implementation: TreeRepresentation,
    dataSet: TestDataSet,
  ): Promise<Result<ScenarioResult, BenchmarkError>>;
}

export enum ScenarioCategory {
  Navigation = 'navigation',
  Update = 'update',
  Analysis = 'analysis',
  Memory = 'memory',
  Concurrency = 'concurrency',
}

export interface ScenarioResult {
  readonly scenarioName: string;
  readonly measurements: PerformanceMeasurement[];
  readonly memorySnapshots: MemorySnapshot[];
  readonly additionalMetrics: Record<string, number>;
  readonly success: boolean;
}

// Analysis and reporting types
export interface ComparativeReport {
  readonly implementations: string[];
  readonly scenarios: string[];
  readonly dataSets: string[];
  readonly results: BenchmarkResult[];
  readonly summary: ComparisonSummary;
  readonly recommendations: Recommendation[];
  readonly generatedAt: number;
}

export interface ComparisonSummary {
  readonly winner: string;
  readonly winnerReasons: string[];
  readonly performanceGaps: PerformanceGap[];
  readonly overallMetrics: OverallMetrics;
}

export interface PerformanceGap {
  readonly metric: string;
  readonly leader: string;
  readonly leaderValue: number;
  readonly followers: Array<{
    name: string;
    value: number;
    gapPercentage: number;
  }>;
}

export interface OverallMetrics {
  readonly averageLatency: Record<string, number>;
  readonly p95Latency: Record<string, number>;
  readonly p99Latency: Record<string, number>;
  readonly throughput: Record<string, number>;
  readonly memoryEfficiency: Record<string, number>;
}

export interface Recommendation {
  readonly category: RecommendationCategory;
  readonly priority: RecommendationPriority;
  readonly description: string;
  readonly implementationTarget: string;
  readonly estimatedImpact: string;
  readonly evidence: string[];
}

export enum RecommendationCategory {
  Performance = 'performance',
  Memory = 'memory',
  Scalability = 'scalability',
  Reliability = 'reliability',
  Architecture = 'architecture',
}

export enum RecommendationPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

// Regression testing types
export interface RegressionReport {
  readonly baselineVersion: string;
  readonly currentVersion: string;
  readonly regressions: PerformanceRegression[];
  readonly improvements: PerformanceImprovement[];
  readonly summary: RegressionSummary;
  readonly generatedAt: number;
}

export interface PerformanceRegression {
  readonly scenario: string;
  readonly implementation: string;
  readonly metric: string;
  readonly baselineValue: number;
  readonly currentValue: number;
  readonly degradationPercentage: number;
  readonly severity: RegressionSeverity;
}

export interface PerformanceImprovement {
  readonly scenario: string;
  readonly implementation: string;
  readonly metric: string;
  readonly baselineValue: number;
  readonly currentValue: number;
  readonly improvementPercentage: number;
}

export interface RegressionSummary {
  readonly totalRegressions: number;
  readonly criticalRegressions: number;
  readonly totalImprovements: number;
  readonly overallTrend: 'improving' | 'degrading' | 'stable';
  readonly recommendation: 'deploy' | 'investigate' | 'reject';
}

export enum RegressionSeverity {
  Critical = 'critical', // >50% degradation
  High = 'high', // 25-50% degradation
  Medium = 'medium', // 10-25% degradation
  Low = 'low', // <10% degradation
}

// Statistical analysis types
export interface Statistics {
  readonly mean: number;
  readonly median: number;
  readonly standardDeviation: number;
  readonly variance: number;
  readonly min: number;
  readonly max: number;
  readonly p25: number;
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly sampleSize: number;
  readonly outliers: number[];
}

export interface ConfidenceInterval {
  readonly level: number; // e.g., 0.95 for 95%
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly marginOfError: number;
}

export interface OutlierReport {
  readonly method: OutlierDetectionMethod;
  readonly outliers: OutlierMeasurement[];
  readonly cleanDataSize: number;
  readonly outlierPercentage: number;
}

export enum OutlierDetectionMethod {
  IQR = 'iqr',
  ZScore = 'zscore',
  ModifiedZScore = 'modified_zscore',
}

export interface OutlierMeasurement {
  readonly value: number;
  readonly index: number;
  readonly deviationScore: number;
  readonly reason: string;
}

export interface ComparisonResult {
  readonly testName: string;
  readonly pValue: number;
  readonly isSignificant: boolean;
  readonly effect: EffectSize;
  readonly confidence: ConfidenceInterval;
}

export interface EffectSize {
  readonly cohensD: number;
  readonly interpretation: 'negligible' | 'small' | 'medium' | 'large';
}

// Configuration types
export interface BenchmarkConfig {
  readonly warmupIterations: number;
  readonly measurementIterations: number;
  readonly timeoutMs: number;
  readonly memoryLimitMB: number;
  readonly gcBetweenTests: boolean;
  readonly statisticalSignificanceLevel: number;
  readonly outlierDetectionMethod: OutlierDetectionMethod;
  readonly reportFormat: ReportFormat[];
}

export enum ReportFormat {
  JSON = 'json',
  Markdown = 'markdown',
  HTML = 'html',
  CSV = 'csv',
}

// Timing and monitoring types
export interface TimingSession {
  readonly id: string;
  readonly startTime: bigint;
  readonly operation: string;
}

export interface LeakReport {
  readonly suspectedLeaks: MemoryLeak[];
  readonly totalLeakage: number;
  readonly confidence: number;
}

export interface MemoryLeak {
  readonly source: string;
  readonly leakagePerOperation: number;
  readonly evidence: string[];
}

export interface CacheOverheadReport {
  readonly implementation: string;
  readonly baseMemory: number;
  readonly cacheMemory: number;
  readonly overheadPercentage: number;
  readonly cacheHitRate: number;
  readonly cacheEfficiency: number;
}

// Error types
export class BenchmarkExecutionError extends Error {
  public readonly scenario: string;
  public readonly implementation: string;
  public override readonly cause?: Error;

  constructor(message: string, scenario: string, implementation: string, cause?: Error) {
    super(message);
    this.scenario = scenario;
    this.implementation = implementation;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  override get name(): string {
    return 'BenchmarkExecutionError';
  }
}

export class BenchmarkTimeoutError extends BenchmarkExecutionError {
  constructor(scenario: string, implementation: string, timeoutMs: number) {
    super(`Benchmark timed out after ${timeoutMs}ms`, scenario, implementation);
  }

  override get name(): string {
    return 'BenchmarkTimeoutError';
  }
}

export class BenchmarkMemoryError extends BenchmarkExecutionError {
  constructor(scenario: string, implementation: string, memoryUsage: number, limit: number) {
    super(
      `Benchmark exceeded memory limit: ${memoryUsage}MB > ${limit}MB`,
      scenario,
      implementation,
    );
  }

  override get name(): string {
    return 'BenchmarkMemoryError';
  }
}
