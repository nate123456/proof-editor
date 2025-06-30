import { Result } from '../shared/types/Result';
import { ValidationError } from '../errors/DomainErrors';
import { AnalysisReportId } from '../value-objects/AnalysisReportId';
import { AnalysisMetrics } from '../value-objects/AnalysisMetrics';
import { Timestamp } from '../value-objects/Timestamp';
import { AnalysisInsight } from '../value-objects/AnalysisInsight';
import { PatternMatch } from '../value-objects/PatternMatch';
import { PerformanceMetrics } from '../value-objects/PerformanceMetrics';

export class AnalysisReportEntity {
  private constructor(
    private readonly id: AnalysisReportId,
    private readonly documentId: string,
    private readonly languagePackageId: string,
    private readonly metrics: AnalysisMetrics,
    private readonly insights: AnalysisInsight[],
    private readonly patternMatches: PatternMatch[],
    private readonly performanceMetrics: PerformanceMetrics,
    private readonly timestamp: Timestamp,
    private readonly analysisScope: AnalysisScope,
    private recommendations: string[]
  ) {}

  static create(
    documentId: string,
    languagePackageId: string,
    analysisScope: AnalysisScope
  ): Result<AnalysisReportEntity, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Document ID is required')
      };
    }

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Language package ID is required')
      };
    }

    return {
      success: true,
      data: new AnalysisReportEntity(
        AnalysisReportId.generate(),
        documentId,
        languagePackageId,
        AnalysisMetrics.createEmpty(),
        [],
        [],
        PerformanceMetrics.createEmpty(),
        Timestamp.now(),
        analysisScope,
        []
      )
    };
  }

  static createCompleted(
    documentId: string,
    languagePackageId: string,
    analysisScope: AnalysisScope,
    metrics: AnalysisMetrics,
    insights: AnalysisInsight[],
    patternMatches: PatternMatch[],
    performanceMetrics: PerformanceMetrics,
    recommendations: string[] = []
  ): Result<AnalysisReportEntity, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Document ID is required')
      };
    }

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Language package ID is required')
      };
    }

    return {
      success: true,
      data: new AnalysisReportEntity(
        AnalysisReportId.generate(),
        documentId,
        languagePackageId,
        metrics,
        insights,
        patternMatches,
        performanceMetrics,
        Timestamp.now(),
        analysisScope,
        recommendations
      )
    };
  }

  getId(): AnalysisReportId {
    return this.id;
  }

  getDocumentId(): string {
    return this.documentId;
  }

  getLanguagePackageId(): string {
    return this.languagePackageId;
  }

  getMetrics(): AnalysisMetrics {
    return this.metrics;
  }

  getInsights(): readonly AnalysisInsight[] {
    return [...this.insights];
  }

  getPatternMatches(): readonly PatternMatch[] {
    return [...this.patternMatches];
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMetrics;
  }

  getTimestamp(): Timestamp {
    return this.timestamp;
  }

  getAnalysisScope(): AnalysisScope {
    return this.analysisScope;
  }

  getRecommendations(): readonly string[] {
    return [...this.recommendations];
  }

  addInsight(insight: AnalysisInsight): void {
    this.insights.push(insight);
  }

  addPatternMatch(pattern: PatternMatch): void {
    this.patternMatches.push(pattern);
  }

  addRecommendation(recommendation: string): Result<void, ValidationError> {
    if (!recommendation || recommendation.trim().length === 0) {
      return {
        success: false,
        error: new ValidationError('Recommendation cannot be empty')
      };
    }

    if (this.recommendations.includes(recommendation.trim())) {
      return {
        success: false,
        error: new ValidationError('Recommendation already exists')
      };
    }

    this.recommendations.push(recommendation.trim());
    return { success: true, data: undefined };
  }

  removeRecommendation(recommendation: string): Result<void, ValidationError> {
    const index = this.recommendations.indexOf(recommendation);
    if (index === -1) {
      return {
        success: false,
        error: new ValidationError('Recommendation not found')
      };
    }

    this.recommendations.splice(index, 1);
    return { success: true, data: undefined };
  }

  getInsightsByCategory(category: string): AnalysisInsight[] {
    return this.insights.filter(insight => insight.getCategory() === category);
  }

  getPatternMatchesByType(patternType: string): PatternMatch[] {
    return this.patternMatches.filter(match => match.getPatternType() === patternType);
  }

  hasHighPriorityInsights(): boolean {
    return this.insights.some(insight => insight.isHighPriority());
  }

  getComplexityScore(): number {
    return this.metrics.getComplexityScore();
  }

  getQualityScore(): number {
    return this.metrics.getQualityScore();
  }

  meetsPerformanceTargets(): boolean {
    return this.performanceMetrics.meetsTargets();
  }

  isAnalysisComplete(): boolean {
    return this.performanceMetrics.getTotalTimeMs() > 0 &&
           this.insights.length > 0;
  }

  generateSummary(): AnalysisSummary {
    return {
      documentId: this.documentId,
      languagePackageId: this.languagePackageId,
      analysisTime: this.performanceMetrics.getTotalTimeMs(),
      insightCount: this.insights.length,
      patternMatchCount: this.patternMatches.length,
      complexityScore: this.getComplexityScore(),
      qualityScore: this.getQualityScore(),
      hasHighPriorityIssues: this.hasHighPriorityInsights(),
      meetsPerformanceTargets: this.meetsPerformanceTargets(),
      recommendationCount: this.recommendations.length,
      analysisScope: this.analysisScope,
      timestamp: this.timestamp.getValue()
    };
  }

  equals(other: AnalysisReportEntity): boolean {
    return this.id.equals(other.id);
  }
}

export enum AnalysisScope {
  Syntax = 'syntax',
  Semantics = 'semantics',
  Flow = 'flow',
  Style = 'style',
  Performance = 'performance',
  Educational = 'educational',
  Full = 'full'
}

export interface AnalysisSummary {
  documentId: string;
  languagePackageId: string;
  analysisTime: number;
  insightCount: number;
  patternMatchCount: number;
  complexityScore: number;
  qualityScore: number;
  hasHighPriorityIssues: boolean;
  meetsPerformanceTargets: boolean;
  recommendationCount: number;
  analysisScope: AnalysisScope;
  timestamp: number;
}