import { err, ok, type Result } from 'neverthrow';

import { type AnalysisInsight, type PatternMatch } from '../../../../domain/shared/index.js';
import { ValidationError } from '../errors/DomainErrors';
import { AnalysisMetrics } from '../value-objects/AnalysisMetrics';
import { AnalysisReportId } from '../value-objects/AnalysisReportId';
import { PerformanceMetrics } from '../value-objects/PerformanceMetrics';
import { Timestamp } from '../value-objects/Timestamp';

export class AnalysisReport {
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
  ): Result<AnalysisReport, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return err(new ValidationError('Document ID is required'));
    }

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return err(new ValidationError('Language package ID is required'));
    }

    return ok(
      new AnalysisReport(
        AnalysisReportId.generate(),
        documentId,
        languagePackageId,
        AnalysisMetrics.empty(),
        [],
        [],
        PerformanceMetrics.empty(),
        Timestamp.now(),
        analysisScope,
        []
      )
    );
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
  ): Result<AnalysisReport, ValidationError> {
    if (!documentId || documentId.trim().length === 0) {
      return err(new ValidationError('Document ID is required'));
    }

    if (!languagePackageId || languagePackageId.trim().length === 0) {
      return err(new ValidationError('Language package ID is required'));
    }

    return ok(
      new AnalysisReport(
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
    );
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
      return err(new ValidationError('Recommendation cannot be empty'));
    }

    if (this.recommendations.includes(recommendation.trim())) {
      return err(new ValidationError('Recommendation already exists'));
    }

    this.recommendations.push(recommendation.trim());
    return ok(undefined);
  }

  removeRecommendation(recommendation: string): Result<void, ValidationError> {
    const index = this.recommendations.indexOf(recommendation);
    if (index === -1) {
      return err(new ValidationError('Recommendation not found'));
    }

    this.recommendations.splice(index, 1);
    return ok(undefined);
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
    // Simple performance check - could be made more sophisticated
    return (
      this.performanceMetrics.getTotalTimeMs() < 1000 &&
      this.performanceMetrics.getMemoryUsedBytes() < 1000000
    );
  }

  isAnalysisComplete(): boolean {
    return this.performanceMetrics.getTotalTimeMs() > 0 && this.insights.length > 0;
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
      timestamp: this.timestamp.getMilliseconds(),
    };
  }

  analyzeStructuralPatterns(
    statements: string[],
    connections: { from: number; to: number }[]
  ): StructuralPattern[] {
    const patterns: StructuralPattern[] = [];

    // Linear proof pattern
    if (this.isLinearProof(connections)) {
      patterns.push({
        type: 'linear-proof',
        name: 'Linear Proof Structure',
        description: 'Statements form a linear chain of reasoning',
        confidence: 0.9,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { length: statements.length },
      });
    }

    // Tree proof pattern
    if (this.isTreeProof(connections)) {
      patterns.push({
        type: 'tree-proof',
        name: 'Tree Proof Structure',
        description: 'Statements form a tree-like branching structure',
        confidence: 0.85,
        instances: this.findTreeBranches(connections),
        properties: { branches: this.countBranches(connections) },
      });
    }

    // Diamond pattern (convergent reasoning)
    const diamondPatterns = this.findDiamondPatterns(connections);
    patterns.push(...diamondPatterns);

    return patterns;
  }

  extractStructuralFeatures(
    statements: string[],
    connections: { from: number; to: number }[]
  ): StructuralFeatures {
    return {
      statementCount: statements.length,
      connectionCount: connections.length,
      maxDepth: this.calculateMaxDepth(connections),
      branchingFactor: this.calculateBranchingFactor(connections),
      isLinear: this.isLinearProof(connections),
      isTree: this.isTreeProof(connections),
      hasCycles: this.hasCycles(connections),
    };
  }

  private isLinearProof(connections: { from: number; to: number }[]): boolean {
    if (connections.length === 0) return true;

    const sorted = connections.sort((a, b) => a.from - b.from);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i]?.to !== sorted[i + 1]?.from) {
        return false;
      }
    }
    return true;
  }

  private isTreeProof(connections: { from: number; to: number }[]): boolean {
    if (connections.length === 0) return true;

    const inDegree = new Map<number, number>();
    const outDegree = new Map<number, number>();
    const allNodes = new Set<number>();

    for (const { from, to } of connections) {
      outDegree.set(from, (outDegree.get(from) ?? 0) + 1);
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
      allNodes.add(from);
      allNodes.add(to);
    }

    // Initialize all nodes in inDegree to ensure we count nodes with 0 in-degree
    for (const node of allNodes) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }
    }

    const roots = Array.from(inDegree.entries()).filter(([_, degree]) => degree === 0);
    const nonRoots = Array.from(inDegree.entries()).filter(([_, degree]) => degree > 0);

    // Tree must have exactly one root and all non-root nodes have exactly one incoming edge
    return roots.length === 1 && nonRoots.every(([_, degree]) => degree === 1);
  }

  private findTreeBranches(connections: { from: number; to: number }[]): PatternInstance[] {
    const branches: PatternInstance[] = [];
    const outDegree = new Map<number, number>();

    for (const { from } of connections) {
      outDegree.set(from, (outDegree.get(from) ?? 0) + 1);
    }

    for (const [node, degree] of outDegree.entries()) {
      if (degree > 1) {
        branches.push({ startIndex: node, endIndex: node });
      }
    }

    return branches;
  }

  private countBranches(connections: { from: number; to: number }[]): number {
    return this.findTreeBranches(connections).length;
  }

  private findDiamondPatterns(connections: { from: number; to: number }[]): StructuralPattern[] {
    const patterns: StructuralPattern[] = [];
    const inDegree = new Map<number, number>();

    for (const { to } of connections) {
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    }

    for (const [node, degree] of inDegree.entries()) {
      if (degree > 1) {
        patterns.push({
          type: 'convergent-reasoning',
          name: 'Convergent Reasoning',
          description: 'Multiple lines of reasoning converge to same conclusion',
          confidence: 0.8,
          instances: [{ startIndex: node, endIndex: node }],
          properties: { convergencePoint: node, inputCount: degree },
        });
      }
    }

    return patterns;
  }

  private calculateMaxDepth(connections: { from: number; to: number }[]): number {
    if (connections.length === 0) return 0;

    const graph = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    const allNodes = new Set<number>();

    for (const { from, to } of connections) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
      allNodes.add(from);
      allNodes.add(to);
    }

    // Initialize all nodes in inDegree to ensure we find all roots
    for (const node of allNodes) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }
    }

    const roots = Array.from(inDegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([node, _]) => node);

    let maxDepth = 0;
    for (const root of roots) {
      maxDepth = Math.max(maxDepth, this.dfsDepth(root, graph, new Set()));
    }

    return maxDepth;
  }

  private dfsDepth(node: number, graph: Map<number, number[]>, visited: Set<number>): number {
    if (visited.has(node)) return 0;
    visited.add(node);

    const children = graph.get(node) ?? [];
    let maxChildDepth = 0;

    for (const child of children) {
      maxChildDepth = Math.max(maxChildDepth, this.dfsDepth(child, graph, visited));
    }

    visited.delete(node);
    return 1 + maxChildDepth;
  }

  private calculateBranchingFactor(connections: { from: number; to: number }[]): number {
    const outDegree = new Map<number, number>();

    for (const { from } of connections) {
      outDegree.set(from, (outDegree.get(from) ?? 0) + 1);
    }

    if (outDegree.size === 0) return 0;

    const totalOutDegree = Array.from(outDegree.values()).reduce((sum, degree) => sum + degree, 0);
    return totalOutDegree / outDegree.size;
  }

  private hasCycles(connections: { from: number; to: number }[]): boolean {
    const graph = new Map<number, number[]>();

    for (const { from, to } of connections) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);
    }

    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycleDFS = (node: number): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const [node] of graph) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) return true;
      }
    }

    return false;
  }

  equals(other: AnalysisReport): boolean {
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
  Full = 'full',
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

export interface StructuralPattern {
  type: string;
  name: string;
  description: string;
  confidence: number;
  instances: PatternInstance[];
  properties: Record<string, unknown>;
}

export interface PatternInstance {
  startIndex: number;
  endIndex: number;
}

export interface StructuralFeatures {
  statementCount: number;
  connectionCount: number;
  maxDepth: number;
  branchingFactor: number;
  isLinear: boolean;
  isTree: boolean;
  hasCycles: boolean;
}
