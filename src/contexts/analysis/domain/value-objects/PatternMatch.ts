import { err, ok, type Result } from 'neverthrow';

import { ValidationError } from '../errors/AnalysisErrors.js';
import { type SourceLocation } from './SourceLocation.js';

export class PatternMatch {
  private constructor(
    private readonly patternId: string,
    private readonly patternType: PatternType,
    private readonly patternName: string,
    private readonly location: SourceLocation,
    private readonly confidence: number,
    private readonly matchedContent: string,
    private readonly variables: Map<string, string>,
    private readonly context: MatchContext,
    private readonly validationScope?: ValidationScope
  ) {}

  static create(
    patternId: string,
    patternType: PatternType,
    patternName: string,
    location: SourceLocation,
    confidence: number,
    matchedContent: string,
    variables = new Map<string, string>(),
    context: MatchContext = MatchContext.createDefault(),
    validationScope?: ValidationScope
  ): Result<PatternMatch, ValidationError> {
    if (!patternId || patternId.trim().length === 0) {
      return err(new ValidationError('Pattern ID cannot be empty'));
    }

    if (!patternName || patternName.trim().length === 0) {
      return err(new ValidationError('Pattern name cannot be empty'));
    }

    if (confidence < 0 || confidence > 1) {
      return err(new ValidationError('Confidence must be between 0 and 1'));
    }

    if (!matchedContent || matchedContent.trim().length === 0) {
      return err(new ValidationError('Matched content cannot be empty'));
    }

    return ok(
      new PatternMatch(
        patternId.trim(),
        patternType,
        patternName.trim(),
        location,
        confidence,
        matchedContent.trim(),
        variables,
        context,
        validationScope
      )
    );
  }

  static createInferenceMatch(
    patternId: string,
    patternName: string,
    location: SourceLocation,
    confidence: number,
    matchedContent: string,
    variables = new Map<string, string>()
  ): Result<PatternMatch, ValidationError> {
    return PatternMatch.create(
      patternId,
      'inference',
      patternName,
      location,
      confidence,
      matchedContent,
      variables,
      MatchContext.createForInference()
    );
  }

  static createStructuralMatch(
    patternId: string,
    patternName: string,
    location: SourceLocation,
    confidence: number,
    matchedContent: string
  ): Result<PatternMatch, ValidationError> {
    return PatternMatch.create(
      patternId,
      'structural',
      patternName,
      location,
      confidence,
      matchedContent,
      new Map(),
      MatchContext.createForStructural()
    );
  }

  static createValidationPattern(
    patternId: string,
    patternName: string,
    location: SourceLocation,
    confidence: number,
    matchedContent: string,
    validationScope: ValidationScope,
    indicators: PatternIndicator[]
  ): Result<PatternMatch, ValidationError> {
    const variables = new Map<string, string>();
    indicators.forEach((indicator, index) => {
      variables.set(`indicator_${index}`, indicator.description);
    });

    return PatternMatch.create(
      patternId,
      'validation',
      patternName,
      location,
      confidence,
      matchedContent,
      variables,
      MatchContext.createForValidation(),
      validationScope
    );
  }

  static createModalMatch(
    patternId: string,
    patternName: string,
    location: SourceLocation,
    confidence: number,
    matchedContent: string,
    modalOperators: string[]
  ): Result<PatternMatch, ValidationError> {
    const variables = new Map<string, string>();
    modalOperators.forEach((op, index) => {
      variables.set(`modal_op_${index}`, op);
    });

    return PatternMatch.create(
      patternId,
      'modal',
      patternName,
      location,
      confidence,
      matchedContent,
      variables,
      MatchContext.createForModal()
    );
  }

  getPatternId(): string {
    return this.patternId;
  }

  getPatternType(): PatternType {
    return this.patternType;
  }

  getPatternName(): string {
    return this.patternName;
  }

  getLocation(): SourceLocation {
    return this.location;
  }

  getConfidence(): number {
    return this.confidence;
  }

  getMatchedContent(): string {
    return this.matchedContent;
  }

  getVariables(): ReadonlyMap<string, string> {
    return new Map(Array.from(this.variables));
  }

  getContext(): MatchContext {
    return this.context;
  }

  getValidationScope(): ValidationScope | undefined {
    return this.validationScope;
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  isMediumConfidence(): boolean {
    return this.confidence >= 0.5 && this.confidence < 0.8;
  }

  isLowConfidence(): boolean {
    return this.confidence < 0.5;
  }

  hasVariables(): boolean {
    return this.variables.size > 0;
  }

  getVariableCount(): number {
    return this.variables.size;
  }

  getVariable(name: string): string | undefined {
    return this.variables.get(name);
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  isInferencePattern(): boolean {
    return this.patternType === 'inference';
  }

  isStructuralPattern(): boolean {
    return this.patternType === 'structural';
  }

  isModalPattern(): boolean {
    return this.patternType === 'modal';
  }

  isSyntaxPattern(): boolean {
    return this.patternType === 'syntax';
  }

  isValidationPattern(): boolean {
    return this.patternType === 'validation';
  }

  getMatchQuality(): MatchQuality {
    const quality: MatchQuality = {
      confidence: this.confidence,
      completeness: this.calculateCompleteness(),
      precision: this.calculatePrecision(),
      contextRelevance: this.context.getRelevanceScore(),
    };

    quality.overallScore =
      quality.confidence * 0.4 +
      quality.completeness * 0.3 +
      quality.precision * 0.2 +
      quality.contextRelevance * 0.1;

    return quality;
  }

  private calculateCompleteness(): number {
    if (this.variables.size === 0) return 1.0;

    const unboundVariables = Array.from(this.variables.values()).filter(
      value => !value || value.trim().length === 0
    ).length;

    return (this.variables.size - unboundVariables) / this.variables.size;
  }

  private calculatePrecision(): number {
    const contentLength = this.matchedContent.length;
    const variableComplexity = this.variables.size * 10;
    const baseComplexity = 20;

    const expectedLength = baseComplexity + variableComplexity;
    const lengthRatio = Math.min(contentLength / expectedLength, 1.0);

    return 0.5 + lengthRatio * 0.5;
  }

  withHigherConfidence(increase: number): PatternMatch {
    const newConfidence = Math.min(1.0, this.confidence + increase);

    return new PatternMatch(
      this.patternId,
      this.patternType,
      this.patternName,
      this.location,
      newConfidence,
      this.matchedContent,
      this.variables,
      this.context,
      this.validationScope
    );
  }

  withAdditionalVariables(newVariables: Map<string, string>): PatternMatch {
    const combinedVariables = new Map([...Array.from(this.variables), ...Array.from(newVariables)]);

    return new PatternMatch(
      this.patternId,
      this.patternType,
      this.patternName,
      this.location,
      this.confidence,
      this.matchedContent,
      combinedVariables,
      this.context,
      this.validationScope
    );
  }

  toDisplayFormat(): PatternMatchDisplay {
    const quality = this.getMatchQuality();

    return {
      patternId: this.patternId,
      patternType: this.patternType,
      patternName: this.patternName,
      location: this.location.toString(),
      confidence: Math.round(this.confidence * 100),
      matchedContentPreview: this.getContentPreview(),
      variableCount: this.variables.size,
      qualityScore: Math.round((quality.overallScore ?? 0) * 100),
      contextInfo: this.context.getDisplayInfo(),
    };
  }

  private getContentPreview(maxLength = 50): string {
    if (this.matchedContent.length <= maxLength) {
      return this.matchedContent;
    }

    return `${this.matchedContent.substring(0, maxLength - 3)}...`;
  }

  equals(other: PatternMatch): boolean {
    return (
      this.patternId === other.patternId &&
      this.location.equals(other.location) &&
      this.matchedContent === other.matchedContent
    );
  }
}

export type PatternType =
  | 'inference'
  | 'structural'
  | 'modal'
  | 'syntax'
  | 'semantic'
  | 'educational'
  | 'validation';

export interface MatchQuality {
  confidence: number;
  completeness: number;
  precision: number;
  contextRelevance: number;
  overallScore?: number;
}

export interface PatternMatchDisplay {
  patternId: string;
  patternType: PatternType;
  patternName: string;
  location: string;
  confidence: number;
  matchedContentPreview: string;
  variableCount: number;
  qualityScore: number;
  contextInfo: string;
}

export interface ValidationScope {
  type: 'statement' | 'atomic_argument' | 'tree' | 'document' | 'flow_path';
  targetId: string;
  includeConnected?: boolean;
  depth?: number;
}

export interface PatternIndicator {
  type: 'structural' | 'semantic' | 'statistical';
  description: string;
  strength: number;
}

export class MatchContext {
  private constructor(
    private readonly analysisDepth: AnalysisDepth,
    private readonly surroundingContext: string,
    private readonly relatedMatches: string[],
    private readonly relevanceScore: number,
    private readonly additionalMetadata: Record<string, unknown>
  ) {}

  static createDefault(): MatchContext {
    return new MatchContext('basic', '', [], 0.5, {});
  }

  static createForInference(): MatchContext {
    return new MatchContext('deep', 'inference-rule', [], 0.9, { type: 'logical-inference' });
  }

  static createForStructural(): MatchContext {
    return new MatchContext('moderate', 'structural-pattern', [], 0.7, { type: 'proof-structure' });
  }

  static createForModal(): MatchContext {
    return new MatchContext('deep', 'modal-logic', [], 0.8, { type: 'modal-reasoning' });
  }

  static createForValidation(): MatchContext {
    return new MatchContext('deep', 'validation-pattern', [], 0.85, {
      type: 'validation-analysis',
    });
  }

  getAnalysisDepth(): AnalysisDepth {
    return this.analysisDepth;
  }

  getSurroundingContext(): string {
    return this.surroundingContext;
  }

  getRelatedMatches(): readonly string[] {
    return [...this.relatedMatches];
  }

  getRelevanceScore(): number {
    return this.relevanceScore;
  }

  getAdditionalMetadata(): Record<string, unknown> {
    return { ...this.additionalMetadata };
  }

  getDisplayInfo(): string {
    const depth = this.analysisDepth;
    const context = this.surroundingContext || 'general';
    const relevance = Math.round(this.relevanceScore * 100);

    return `${depth} analysis in ${context} context (${relevance}% relevant)`;
  }
}

export type AnalysisDepth = 'basic' | 'moderate' | 'deep';
