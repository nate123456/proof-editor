import type { Result } from "../../../../domain/shared/result.js"
import { ValidationError } from "../../../../domain/shared/result.js"

export class AnalysisMetrics {
  private constructor(
    private readonly complexityScore: number,
    private readonly qualityScore: number,
    private readonly statementCount: number,
    private readonly connectionCount: number,
    private readonly treeDepth: number,
    private readonly branchingFactor: number,
    private readonly cycleCount: number,
    private readonly orphanStatements: number,
    private readonly redundantConnections: number,
    private readonly validationErrors: number,
    private readonly validationWarnings: number,
    private readonly performanceScore: number
  ) {}

  static createEmpty(): AnalysisMetrics {
    return new AnalysisMetrics(
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100
    );
  }

  static create(
    statementCount: number,
    connectionCount: number,
    treeDepth: number,
    branchingFactor: number,
    cycleCount: number = 0,
    orphanStatements: number = 0,
    redundantConnections: number = 0,
    validationErrors: number = 0,
    validationWarnings: number = 0
  ): Result<AnalysisMetrics, ValidationError> {
    if (statementCount < 0) {
      return {
        success: false,
        error: new ValidationError('Statement count cannot be negative')
      };
    }

    if (connectionCount < 0) {
      return {
        success: false,
        error: new ValidationError('Connection count cannot be negative')
      };
    }

    if (treeDepth < 0) {
      return {
        success: false,
        error: new ValidationError('Tree depth cannot be negative')
      };
    }

    const complexityScore = AnalysisMetrics.calculateComplexityScore(
      statementCount,
      connectionCount,
      treeDepth,
      branchingFactor,
      cycleCount
    );

    const qualityScore = AnalysisMetrics.calculateQualityScore(
      orphanStatements,
      redundantConnections,
      validationErrors,
      validationWarnings,
      statementCount
    );

    const performanceScore = AnalysisMetrics.calculatePerformanceScore(
      complexityScore,
      qualityScore
    );

    return {
      success: true,
      data: new AnalysisMetrics(
        complexityScore,
        qualityScore,
        statementCount,
        connectionCount,
        treeDepth,
        branchingFactor,
        cycleCount,
        orphanStatements,
        redundantConnections,
        validationErrors,
        validationWarnings,
        performanceScore
      )
    };
  }

  private static calculateComplexityScore(
    statementCount: number,
    connectionCount: number,
    treeDepth: number,
    branchingFactor: number,
    cycleCount: number
  ): number {
    // Normalize factors to 0-100 scale
    const statementFactor = Math.min(statementCount / 100, 1) * 30; // Max 30 points
    const connectionFactor = Math.min(connectionCount / 150, 1) * 25; // Max 25 points
    const depthFactor = Math.min(treeDepth / 20, 1) * 20; // Max 20 points
    const branchingFactor_normalized = Math.min(branchingFactor / 10, 1) * 15; // Max 15 points
    const cycleFactor = Math.min(cycleCount / 5, 1) * 10; // Max 10 points for cycles

    return Math.round(
      statementFactor + 
      connectionFactor + 
      depthFactor + 
      branchingFactor_normalized + 
      cycleFactor
    );
  }

  private static calculateQualityScore(
    orphanStatements: number,
    redundantConnections: number,
    validationErrors: number,
    validationWarnings: number,
    totalStatements: number
  ): number {
    let baseScore = 100;

    // Deduct points for issues
    const orphanPenalty = totalStatements > 0 ? (orphanStatements / totalStatements) * 20 : 0;
    const redundancyPenalty = redundantConnections * 2;
    const errorPenalty = validationErrors * 10;
    const warningPenalty = validationWarnings * 3;

    const finalScore = baseScore - orphanPenalty - redundancyPenalty - errorPenalty - warningPenalty;
    return Math.max(0, Math.round(finalScore));
  }

  private static calculatePerformanceScore(
    complexityScore: number,
    qualityScore: number
  ): number {
    // Balance complexity and quality for overall performance
    const complexityWeight = 0.3;
    const qualityWeight = 0.7;

    return Math.round(
      (complexityScore * complexityWeight) + (qualityScore * qualityWeight)
    );
  }

  getComplexityScore(): number {
    return this.complexityScore;
  }

  getQualityScore(): number {
    return this.qualityScore;
  }

  getStatementCount(): number {
    return this.statementCount;
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  getTreeDepth(): number {
    return this.treeDepth;
  }

  getBranchingFactor(): number {
    return this.branchingFactor;
  }

  getCycleCount(): number {
    return this.cycleCount;
  }

  getOrphanStatements(): number {
    return this.orphanStatements;
  }

  getRedundantConnections(): number {
    return this.redundantConnections;
  }

  getValidationErrors(): number {
    return this.validationErrors;
  }

  getValidationWarnings(): number {
    return this.validationWarnings;
  }

  getPerformanceScore(): number {
    return this.performanceScore;
  }

  isHighComplexity(): boolean {
    return this.complexityScore > 70;
  }

  isMediumComplexity(): boolean {
    return this.complexityScore >= 30 && this.complexityScore <= 70;
  }

  isLowComplexity(): boolean {
    return this.complexityScore < 30;
  }

  isHighQuality(): boolean {
    return this.qualityScore > 80;
  }

  isMediumQuality(): boolean {
    return this.qualityScore >= 50 && this.qualityScore <= 80;
  }

  isLowQuality(): boolean {
    return this.qualityScore < 50;
  }

  hasIssues(): boolean {
    return this.validationErrors > 0 || 
           this.orphanStatements > 0 || 
           this.redundantConnections > 0;
  }

  hasErrors(): boolean {
    return this.validationErrors > 0;
  }

  hasWarnings(): boolean {
    return this.validationWarnings > 0;
  }

  getConnectionDensity(): number {
    if (this.statementCount <= 1) return 0;
    const maxConnections = this.statementCount * (this.statementCount - 1) / 2;
    return maxConnections > 0 ? this.connectionCount / maxConnections : 0;
  }

  getOrphanRate(): number {
    return this.statementCount > 0 ? this.orphanStatements / this.statementCount : 0;
  }

  getRedundancyRate(): number {
    return this.connectionCount > 0 ? this.redundantConnections / this.connectionCount : 0;
  }

  combineWith(other: AnalysisMetrics): AnalysisMetrics {
    const combinedStatementCount = this.statementCount + other.statementCount;
    const combinedConnectionCount = this.connectionCount + other.connectionCount;
    const combinedTreeDepth = Math.max(this.treeDepth, other.treeDepth);
    const combinedBranchingFactor = Math.max(this.branchingFactor, other.branchingFactor);
    const combinedCycleCount = this.cycleCount + other.cycleCount;
    const combinedOrphanStatements = this.orphanStatements + other.orphanStatements;
    const combinedRedundantConnections = this.redundantConnections + other.redundantConnections;
    const combinedValidationErrors = this.validationErrors + other.validationErrors;
    const combinedValidationWarnings = this.validationWarnings + other.validationWarnings;

    const result = AnalysisMetrics.create(
      combinedStatementCount,
      combinedConnectionCount,
      combinedTreeDepth,
      combinedBranchingFactor,
      combinedCycleCount,
      combinedOrphanStatements,
      combinedRedundantConnections,
      combinedValidationErrors,
      combinedValidationWarnings
    );

    return result.success ? result.data : AnalysisMetrics.createEmpty();
  }

  generateSummary(): MetricsSummary {
    return {
      complexityLevel: this.getComplexityLevel(),
      qualityLevel: this.getQualityLevel(),
      performanceScore: this.performanceScore,
      statementCount: this.statementCount,
      connectionCount: this.connectionCount,
      hasIssues: this.hasIssues(),
      hasErrors: this.hasErrors(),
      connectionDensity: this.getConnectionDensity(),
      orphanRate: this.getOrphanRate(),
      redundancyRate: this.getRedundancyRate()
    };
  }

  private getComplexityLevel(): 'low' | 'medium' | 'high' {
    if (this.isLowComplexity()) return 'low';
    if (this.isMediumComplexity()) return 'medium';
    return 'high';
  }

  private getQualityLevel(): 'low' | 'medium' | 'high' {
    if (this.isLowQuality()) return 'low';
    if (this.isMediumQuality()) return 'medium';
    return 'high';
  }

  equals(other: AnalysisMetrics): boolean {
    return this.complexityScore === other.complexityScore &&
           this.qualityScore === other.qualityScore &&
           this.statementCount === other.statementCount &&
           this.connectionCount === other.connectionCount;
  }
}

export interface MetricsSummary {
  complexityLevel: 'low' | 'medium' | 'high';
  qualityLevel: 'low' | 'medium' | 'high';
  performanceScore: number;
  statementCount: number;
  connectionCount: number;
  hasIssues: boolean;
  hasErrors: boolean;
  connectionDensity: number;
  orphanRate: number;
  redundancyRate: number;
}