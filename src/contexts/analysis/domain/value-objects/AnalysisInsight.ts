import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/AnalysisErrors.js';

export class AnalysisInsight {
  private constructor(
    private readonly category: InsightCategory,
    private readonly title: string,
    private readonly description: string,
    private readonly priority: InsightPriority,
    private readonly confidence: number,
    private readonly evidence: string[],
    private readonly recommendations: string[],
    private readonly relatedPatterns: string[]
  ) {}

  static create(
    category: InsightCategory,
    title: string,
    description: string,
    priority: InsightPriority = 'medium',
    confidence = 1.0,
    evidence: string[] = [],
    recommendations: string[] = [],
    relatedPatterns: string[] = []
  ): Result<AnalysisInsight, ValidationError> {
    if (!title || title.trim().length === 0) {
      return err(new ValidationError('Insight title cannot be empty'));
    }

    if (!description || description.trim().length === 0) {
      return err(new ValidationError('Insight description cannot be empty'));
    }

    if (confidence < 0 || confidence > 1) {
      return err(new ValidationError('Confidence must be between 0 and 1'));
    }

    return ok(
      new AnalysisInsight(
        category,
        title.trim(),
        description.trim(),
        priority,
        confidence,
        evidence,
        recommendations,
        relatedPatterns
      )
    );
  }

  static createSyntaxInsight(
    title: string,
    description: string,
    priority: InsightPriority = 'high',
    recommendations: string[] = []
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create('syntax', title, description, priority, 0.9, [], recommendations);
  }

  static createSemanticInsight(
    title: string,
    description: string,
    evidence: string[] = [],
    recommendations: string[] = []
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create(
      'semantics',
      title,
      description,
      'medium',
      0.8,
      evidence,
      recommendations
    );
  }

  static createPerformanceInsight(
    title: string,
    description: string,
    confidence = 0.95
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create('performance', title, description, 'low', confidence);
  }

  static createEducationalInsight(
    title: string,
    description: string,
    recommendations: string[] = []
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create(
      'educational',
      title,
      description,
      'medium',
      0.7,
      [],
      recommendations
    );
  }

  static createValidationInsight(
    title: string,
    description: string,
    evidence: string[] = [],
    recommendations: string[] = []
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create(
      'validation',
      title,
      description,
      'high',
      0.85,
      evidence,
      recommendations
    );
  }

  getCategory(): InsightCategory {
    return this.category;
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string {
    return this.description;
  }

  getPriority(): InsightPriority {
    return this.priority;
  }

  getConfidence(): number {
    return this.confidence;
  }

  getEvidence(): readonly string[] {
    return [...this.evidence];
  }

  getRecommendations(): readonly string[] {
    return [...this.recommendations];
  }

  getRelatedPatterns(): readonly string[] {
    return [...this.relatedPatterns];
  }

  isHighPriority(): boolean {
    return this.priority === 'high';
  }

  isMediumPriority(): boolean {
    return this.priority === 'medium';
  }

  isLowPriority(): boolean {
    return this.priority === 'low';
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  hasEvidence(): boolean {
    return this.evidence.length > 0;
  }

  hasRecommendations(): boolean {
    return this.recommendations.length > 0;
  }

  isActionable(): boolean {
    return this.hasRecommendations() && (this.isHighPriority() || this.isHighConfidence());
  }

  getPriorityScore(): number {
    const priorityWeight = {
      high: 3,
      medium: 2,
      low: 1,
    };
    return priorityWeight[this.priority] * this.confidence;
  }

  withHigherPriority(): AnalysisInsight {
    const newPriority =
      this.priority === 'low' ? 'medium' : this.priority === 'medium' ? 'high' : 'high';

    return new AnalysisInsight(
      this.category,
      this.title,
      this.description,
      newPriority,
      this.confidence,
      this.evidence,
      this.recommendations,
      this.relatedPatterns
    );
  }

  withAdditionalEvidence(evidence: string[]): AnalysisInsight {
    return new AnalysisInsight(
      this.category,
      this.title,
      this.description,
      this.priority,
      this.confidence,
      [...this.evidence, ...evidence],
      this.recommendations,
      this.relatedPatterns
    );
  }

  withAdditionalRecommendations(recommendations: string[]): AnalysisInsight {
    return new AnalysisInsight(
      this.category,
      this.title,
      this.description,
      this.priority,
      this.confidence,
      this.evidence,
      [...this.recommendations, ...recommendations],
      this.relatedPatterns
    );
  }

  toDisplayFormat(): InsightDisplay {
    return {
      category: this.category,
      title: this.title,
      description: this.description,
      priority: this.priority,
      confidence: Math.round(this.confidence * 100),
      evidenceCount: this.evidence.length,
      recommendationCount: this.recommendations.length,
      isActionable: this.isActionable(),
      priorityScore: this.getPriorityScore(),
    };
  }

  equals(other: AnalysisInsight): boolean {
    return (
      this.category === other.category &&
      this.title === other.title &&
      this.description === other.description
    );
  }
}

export type InsightCategory =
  | 'syntax'
  | 'semantics'
  | 'performance'
  | 'educational'
  | 'style'
  | 'structure'
  | 'patterns'
  | 'validation';

export type InsightPriority = 'low' | 'medium' | 'high';

export interface InsightDisplay {
  category: InsightCategory;
  title: string;
  description: string;
  priority: InsightPriority;
  confidence: number;
  evidenceCount: number;
  recommendationCount: number;
  isActionable: boolean;
  priorityScore: number;
}
