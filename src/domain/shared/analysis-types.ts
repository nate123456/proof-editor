import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from './result.js';

export class SourceLocation {
  private constructor(
    private readonly startLine: number,
    private readonly startColumn: number,
    private readonly endLine: number,
    private readonly endColumn: number,
    private readonly documentUri?: string,
  ) {}

  static create(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
    documentUri?: string,
  ): Result<SourceLocation, ValidationError> {
    if (startLine < 0) {
      return err(new ValidationError('Start line cannot be negative'));
    }

    if (startColumn < 0) {
      return err(new ValidationError('Start column cannot be negative'));
    }

    if (endLine < startLine) {
      return err(new ValidationError('End line cannot be before start line'));
    }

    if (endLine === startLine && endColumn < startColumn) {
      return err(new ValidationError('End column cannot be before start column on same line'));
    }

    return ok(new SourceLocation(startLine, startColumn, endLine, endColumn, documentUri));
  }

  static createSinglePosition(
    line: number,
    column: number,
    documentUri?: string,
  ): Result<SourceLocation, ValidationError> {
    return SourceLocation.create(line, column, line, column, documentUri);
  }

  static createLineRange(
    startLine: number,
    endLine: number,
    documentUri?: string,
  ): Result<SourceLocation, ValidationError> {
    return SourceLocation.create(startLine, 0, endLine, Number.MAX_SAFE_INTEGER, documentUri);
  }

  static createDefault(): SourceLocation {
    return new SourceLocation(0, 0, 0, 0);
  }

  static createFromRange(
    start: Position,
    end: Position,
    documentUri?: string,
  ): Result<SourceLocation, ValidationError> {
    return SourceLocation.create(start.line, start.column, end.line, end.column, documentUri);
  }

  getStartLine(): number {
    return this.startLine;
  }

  getStartColumn(): number {
    return this.startColumn;
  }

  getEndLine(): number {
    return this.endLine;
  }

  getEndColumn(): number {
    return this.endColumn;
  }

  getDocumentUri(): string | undefined {
    return this.documentUri;
  }

  getStartPosition(): Position {
    return { line: this.startLine, column: this.startColumn };
  }

  getEndPosition(): Position {
    return { line: this.endLine, column: this.endColumn };
  }

  isSingleLine(): boolean {
    return this.startLine === this.endLine;
  }

  isSinglePosition(): boolean {
    return this.isSingleLine() && this.startColumn === this.endColumn;
  }

  getLineCount(): number {
    return this.endLine - this.startLine + 1;
  }

  getColumnCount(): number {
    if (!this.isSingleLine()) return 0;
    return this.endColumn - this.startColumn;
  }

  contains(other: SourceLocation): boolean {
    if (this.documentUri && other.documentUri && this.documentUri !== other.documentUri) {
      return false;
    }

    const startContains =
      this.startLine < other.startLine ||
      (this.startLine === other.startLine && this.startColumn <= other.startColumn);

    const endContains =
      this.endLine > other.endLine ||
      (this.endLine === other.endLine && this.endColumn >= other.endColumn);

    return startContains && endContains;
  }

  overlapsRange(other: SourceLocation): boolean {
    if (this.documentUri && other.documentUri && this.documentUri !== other.documentUri) {
      return false;
    }

    if (this.endLine < other.startLine || other.endLine < this.startLine) {
      return false;
    }

    if (this.endLine === other.startLine) {
      return this.endColumn >= other.startColumn;
    }

    if (other.endLine === this.startLine) {
      return other.endColumn >= this.startColumn;
    }

    return true;
  }

  intersects(other: SourceLocation): boolean {
    return this.overlapsRange(other);
  }

  union(other: SourceLocation): Result<SourceLocation, ValidationError> {
    if (this.documentUri && other.documentUri && this.documentUri !== other.documentUri) {
      return err(new ValidationError('Cannot union locations from different documents'));
    }

    const startLine = Math.min(this.startLine, other.startLine);
    const endLine = Math.max(this.endLine, other.endLine);

    let startColumn: number;
    let endColumn: number;

    if (this.startLine === other.startLine) {
      startColumn = Math.min(this.startColumn, other.startColumn);
    } else {
      startColumn = this.startLine < other.startLine ? this.startColumn : other.startColumn;
    }

    if (this.endLine === other.endLine) {
      endColumn = Math.max(this.endColumn, other.endColumn);
    } else {
      endColumn = this.endLine > other.endLine ? this.endColumn : other.endColumn;
    }

    return SourceLocation.create(
      startLine,
      startColumn,
      endLine,
      endColumn,
      this.documentUri ?? other.documentUri,
    );
  }

  withDocument(documentUri: string): SourceLocation {
    return new SourceLocation(
      this.startLine,
      this.startColumn,
      this.endLine,
      this.endColumn,
      documentUri,
    );
  }

  toRange(): Range {
    return {
      start: this.getStartPosition(),
      end: this.getEndPosition(),
    };
  }

  toString(): string {
    if (this.isSinglePosition()) {
      return `${this.startLine}:${this.startColumn}`;
    }

    if (this.isSingleLine()) {
      return `${this.startLine}:${this.startColumn}-${this.endColumn}`;
    }

    return `${this.startLine}:${this.startColumn}-${this.endLine}:${this.endColumn}`;
  }

  equals(other: SourceLocation): boolean {
    return (
      this.startLine === other.startLine &&
      this.startColumn === other.startColumn &&
      this.endLine === other.endLine &&
      this.endColumn === other.endColumn &&
      this.documentUri === other.documentUri
    );
  }
}

export class AnalysisInsight {
  private constructor(
    private readonly category: InsightCategory,
    private readonly title: string,
    private readonly description: string,
    private readonly priority: InsightPriority,
    private readonly confidence: number,
    private readonly evidence: string[],
    private readonly recommendations: string[],
    private readonly relatedPatterns: string[],
  ) {}

  static create(
    category: InsightCategory,
    title: string,
    description: string,
    priority: InsightPriority = 'medium',
    confidence = 1.0,
    evidence: string[] = [],
    recommendations: string[] = [],
    relatedPatterns: string[] = [],
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
        [...evidence],
        [...recommendations],
        [...relatedPatterns],
      ),
    );
  }

  static createSyntaxInsight(
    title: string,
    description: string,
    priority: InsightPriority = 'high',
    recommendations: string[] = [],
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create('syntax', title, description, priority, 0.9, [], recommendations);
  }

  static createSemanticInsight(
    title: string,
    description: string,
    evidence: string[] = [],
    recommendations: string[] = [],
  ): Result<AnalysisInsight, ValidationError> {
    return AnalysisInsight.create(
      'semantics',
      title,
      description,
      'medium',
      0.8,
      evidence,
      recommendations,
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

  equals(other: AnalysisInsight): boolean {
    return (
      this.category === other.category &&
      this.title === other.title &&
      this.description === other.description
    );
  }
}

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
    private readonly validationScope?: ValidationScope,
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
    validationScope?: ValidationScope,
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
        new Map(variables),
        context,
        validationScope,
      ),
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
    return new Map(this.variables);
  }

  getContext(): MatchContext {
    return this.context;
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  hasVariables(): boolean {
    return this.variables.size > 0;
  }

  getVariable(name: string): string | undefined {
    return this.variables.get(name);
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  equals(other: PatternMatch): boolean {
    return (
      this.patternId === other.patternId &&
      this.location.equals(other.location) &&
      this.matchedContent === other.matchedContent
    );
  }
}

export class MatchContext {
  private constructor(
    private readonly analysisDepth: AnalysisDepth,
    private readonly surroundingContext: string,
    private readonly relatedMatches: string[],
    private readonly relevanceScore: number,
    private readonly additionalMetadata: Record<string, unknown>,
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

  getAnalysisDepth(): AnalysisDepth {
    return this.analysisDepth;
  }

  getSurroundingContext(): string {
    return this.surroundingContext;
  }

  getRelevanceScore(): number {
    return this.relevanceScore;
  }

  getAdditionalMetadata(): Record<string, unknown> {
    return { ...this.additionalMetadata };
  }
}

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
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

export type PatternType =
  | 'inference'
  | 'structural'
  | 'modal'
  | 'syntax'
  | 'semantic'
  | 'educational'
  | 'validation';

export type AnalysisDepth = 'basic' | 'moderate' | 'deep';

export interface ValidationScope {
  type: 'statement' | 'atomic_argument' | 'tree' | 'document' | 'flow_path';
  targetId: string;
  includeConnected?: boolean;
  depth?: number;
}

export interface ProofStrategyRecommendation {
  name: string;
  description: string;
  confidence: number;
  difficulty: string;
  steps: string[];
  applicableRules: string[];
}

export interface LogicalStructureAnalysis {
  hasConditionals: boolean;
  hasNegations: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  logicalComplexity: number;
  structureType: string;
}

export interface ComplexityAssessment {
  score: number;
  level: string;
  factors: string[];
  recommendations: string[];
}

export interface ProofStrategyRecommendations {
  recommendedStrategies: ProofStrategyRecommendation[];
  structuralAnalysis: LogicalStructureAnalysis;
  complexityAssessment: ComplexityAssessment;
  alternativeApproaches: string[];
  prerequisiteChecks: string[];
}

export interface ProofViabilityAnalysis {
  viable: boolean;
  confidence: number;
  difficulty: string;
  steps: string[];
  rules: string[];
}
