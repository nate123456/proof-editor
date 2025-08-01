import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { PatternInstance, StructuralFeatures } from '../../entities/AnalysisReport';
import type { LogicalFeatures } from '../../entities/InferenceRule';
import type { LanguagePackage } from '../../entities/LanguagePackage';
import { PatternRecognitionError } from '../../errors/DomainErrors';
import { PerformanceMetrics } from '../../value-objects/PerformanceMetrics';
import { PerformanceTracker } from '../../value-objects/PerformanceTracker';
import type {
  PatternInsight,
  ProofPatternAnalysis,
  RecognizedPattern,
} from '../PatternRecognitionService';

@injectable()
export class ProofPatternAnalyzer {
  private readonly confidenceThreshold = 0.7;

  analyzeProofPatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage,
  ): Result<ProofPatternAnalysis, PatternRecognitionError> {
    const tracker = PerformanceTracker.start();

    try {
      const patterns: RecognizedPattern[] = [];

      // Analyze structural patterns
      const structuralPatterns = this.recognizeStructuralPatterns(statements, connections);
      patterns.push(...structuralPatterns);

      // Analyze logical patterns
      const logicalPatterns = this.recognizeLogicalPatterns(statements, languagePackage);
      patterns.push(...logicalPatterns);

      // Analyze inference patterns
      const inferencePatterns = this.recognizeInferencePatterns(
        statements,
        connections,
        languagePackage,
      );
      patterns.push(...inferencePatterns);

      // Filter by confidence threshold
      const highConfidencePatterns = patterns.filter(
        (p) => p.confidence >= this.confidenceThreshold,
      );

      // Generate insights
      const insights = this.generatePatternInsights(highConfidencePatterns, languagePackage);

      // Calculate structural features
      const structuralFeatures = this.calculateStructuralFeatures(statements, connections);

      // Calculate logical features
      const logicalFeatures = this.calculateLogicalFeatures(statements);

      tracker.stop();

      return ok({
        recognizedPatterns: highConfidencePatterns,
        structuralFeatures,
        logicalFeatures,
        patternInsights: insights,
        confidence: this.calculateOverallConfidence(highConfidencePatterns),
        performance: this.createPerformanceMetrics(tracker),
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to recognize proof patterns',
          error instanceof Error ? error : undefined,
        ),
      );
    } finally {
      tracker.stop();
    }
  }

  private recognizeStructuralPatterns(
    statements: string[],
    connections: { from: number; to: number }[],
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Linear proof pattern
    if (this.isLinearProof(connections, statements.length)) {
      patterns.push({
        type: 'structural-pattern',
        name: 'linear-proof',
        description: 'Linear proof structure detected',
        confidence: 0.95,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { structure: 'linear' },
      });
    }

    // Tree-like pattern
    if (this.isTreeStructure(connections)) {
      patterns.push({
        type: 'structural-pattern',
        name: 'tree-proof',
        description: 'Tree-like proof structure detected',
        confidence: 0.9,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { structure: 'tree' },
      });
    }

    // Convergent reasoning pattern
    if (this.hasConvergentStructure(connections)) {
      patterns.push({
        type: 'structural-pattern',
        name: 'convergent-reasoning',
        description: 'Multiple lines of reasoning converge to conclusion',
        confidence: 0.85,
        instances: this.findConvergentInstances(connections),
        properties: { structure: 'convergent' },
      });
    }

    return patterns;
  }

  private recognizeLogicalPatterns(
    statements: string[],
    _languagePackage: LanguagePackage,
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];

    // Check for modus ponens pattern
    if (this.looksLikeModusPonens(statements)) {
      patterns.push({
        type: 'logical-pattern',
        name: 'modus-ponens',
        description: 'Modus ponens inference pattern detected',
        confidence: 0.9,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { rule: 'modus-ponens' },
      });
    }

    // Check for hypothetical syllogism
    if (this.looksLikeHypotheticalSyllogism(statements)) {
      patterns.push({
        type: 'logical-pattern',
        name: 'hypothetical-syllogism',
        description: 'Hypothetical syllogism pattern detected',
        confidence: 0.85,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { rule: 'hypothetical-syllogism' },
      });
    }

    // Check for conjunction patterns
    if (statements.some((s) => s.includes('∧'))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'conjunction',
        description: 'Conjunction pattern detected',
        confidence: 0.8,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { operator: '∧' },
      });
    }

    // Check for disjunction patterns
    if (statements.some((s) => s.includes('∨'))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'disjunction',
        description: 'Disjunction pattern detected',
        confidence: 0.8,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { operator: '∨' },
      });
    }

    return patterns;
  }

  private recognizeInferencePatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage,
  ): RecognizedPattern[] {
    const patterns: RecognizedPattern[] = [];
    const rules = languagePackage.getInferenceRules();

    for (const connection of connections) {
      const fromStatement = statements[connection.from];
      const toStatement = statements[connection.to];

      if (!fromStatement || !toStatement) continue;

      // Check against known inference rules
      for (const rule of rules) {
        if (rule.isRuleActive() && rule.matchesPattern([fromStatement], [toStatement])) {
          patterns.push({
            type: 'inference-rule',
            name: rule.getName()?.getValue() ?? 'unknown-rule',
            description: `Application of ${rule.getName()?.getValue() ?? 'unknown-rule'}`,
            confidence: rule.getPatternConfidence?.([fromStatement], [toStatement]) ?? 0.5,
            instances: [{ startIndex: connection.from, endIndex: connection.to }],
            properties: { rule: rule.getName()?.getValue() ?? 'unknown-rule' },
          });
        }
      }
    }

    return patterns;
  }

  private generatePatternInsights(
    patterns: RecognizedPattern[],
    _languagePackage: LanguagePackage,
  ): PatternInsight[] {
    const insights: PatternInsight[] = [];

    const patternTypes = new Set(patterns.map((p) => p.type));

    if (patternTypes.has('modus-ponens')) {
      insights.push({
        type: 'inference-style',
        description: 'This proof uses modus ponens, a fundamental inference rule',
        confidence: 0.9,
        implications: ['Strong logical foundation', 'Clear reasoning steps'],
      });
    }

    if (patternTypes.has('linear-proof')) {
      insights.push({
        type: 'structure-style',
        description: 'Linear proof structure suggests straightforward reasoning',
        confidence: 0.85,
        implications: ['Easy to follow', 'Minimal complexity'],
      });
    }

    if (patternTypes.has('convergent-reasoning')) {
      insights.push({
        type: 'reasoning-style',
        description: 'Multiple lines of reasoning converge, showing thorough analysis',
        confidence: 0.8,
        implications: ['Comprehensive approach', 'Higher confidence in conclusion'],
      });
    }

    return insights;
  }

  private calculateStructuralFeatures(
    statements: string[],
    connections: { from: number; to: number }[],
  ): StructuralFeatures {
    const maxDepth = this.calculateMaxDepth(connections, statements.length);
    const branchingFactor = this.calculateBranchingFactor(connections);

    return {
      statementCount: statements.length,
      connectionCount: connections.length,
      maxDepth,
      branchingFactor,
      isLinear: this.isLinearProof(connections, statements.length),
      isTree: this.isTreeStructure(connections),
      hasCycles: this.hasCycles(connections),
    };
  }

  private calculateLogicalFeatures(statements: string[]): LogicalFeatures {
    const allText = statements.join(' ');

    return {
      hasQuantifiers: /[∀∃]/.test(allText),
      hasModalOperators: /[□◇]/.test(allText),
      hasNegations: allText.includes('¬'),
      hasImplications: allText.includes('→'),
      hasConjunctions: allText.includes('∧'),
      hasDisjunctions: allText.includes('∨'),
      logicalComplexity: this.calculateLogicalComplexity(statements),
    };
  }

  private calculateOverallConfidence(patterns: RecognizedPattern[]): number {
    if (patterns.length === 0) return 0;

    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / patterns.length;
  }

  private createPerformanceMetrics(tracker: PerformanceTracker): PerformanceMetrics {
    const perfResult = PerformanceMetrics.create(
      tracker.getElapsedMs(),
      tracker.getElapsedMs(), // Use same value for CPU time since we don't track separately
      tracker.getMemoryUsageMb() * 1024 * 1024, // Convert MB to bytes
      tracker.getMemoryUsageMb() * 1024 * 1024, // Use same value for peak memory
    );

    if (perfResult.isOk()) {
      return perfResult.value;
    }

    // Fallback performance metrics
    const fallback = PerformanceMetrics.create(0, 0, 0, 0);
    if (fallback.isOk()) {
      return fallback.value;
    }

    // This should never happen in practice
    throw new Error('Failed to create performance metrics');
  }

  // Helper methods
  private isLinearProof(
    connections: { from: number; to: number }[],
    statementCount: number,
  ): boolean {
    if (connections.length !== statementCount - 1) return false;

    // Check if connections form a linear chain
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      if (!conn || conn.from !== i || conn.to !== i + 1) return false;
    }

    return true;
  }

  private isTreeStructure(connections: { from: number; to: number }[]): boolean {
    // A tree has no cycles and each node (except root) has exactly one parent
    const childrenCount = new Map<number, number>();
    const parentCount = new Map<number, number>();

    for (const conn of connections) {
      parentCount.set(conn.to, (parentCount.get(conn.to) ?? 0) + 1);
      childrenCount.set(conn.from, (childrenCount.get(conn.from) ?? 0) + 1);
    }

    // Each node should have at most one parent
    for (const count of parentCount.values()) {
      if (count > 1) return false;
    }

    return !this.hasCycles(connections);
  }

  private hasConvergentStructure(connections: { from: number; to: number }[]): boolean {
    const incomingEdges = new Map<number, number>();

    for (const conn of connections) {
      incomingEdges.set(conn.to, (incomingEdges.get(conn.to) ?? 0) + 1);
    }

    // Check if any node has multiple incoming edges
    return Array.from(incomingEdges.values()).some((count) => count > 1);
  }

  private findConvergentInstances(connections: { from: number; to: number }[]): PatternInstance[] {
    const instances: PatternInstance[] = [];
    const incomingEdges = new Map<number, number[]>();

    for (const conn of connections) {
      if (!incomingEdges.has(conn.to)) {
        incomingEdges.set(conn.to, []);
      }
      incomingEdges.get(conn.to)?.push(conn.from);
    }

    for (const [target, sources] of incomingEdges) {
      if (sources.length > 1) {
        instances.push({
          startIndex: Math.min(...sources),
          endIndex: target,
        });
      }
    }

    return instances;
  }

  private calculateMaxDepth(
    connections: { from: number; to: number }[],
    nodeCount: number,
  ): number {
    if (connections.length === 0) return 0;

    // Build adjacency list
    const adj = new Map<number, number[]>();
    for (const conn of connections) {
      if (!adj.has(conn.from)) {
        adj.set(conn.from, []);
      }
      adj.get(conn.from)?.push(conn.to);
    }

    // Find root nodes (nodes with no incoming edges)
    const hasIncoming = new Set(connections.map((c) => c.to));
    const roots: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      if (!hasIncoming.has(i)) {
        roots.push(i);
      }
    }

    // BFS to find max depth
    let maxDepth = 0;
    for (const root of roots) {
      const queue: [number, number][] = [[root, 0]];
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) continue;
        const [node, depth] = entry;
        maxDepth = Math.max(maxDepth, depth);

        const neighbors = adj.get(node) ?? [];
        for (const neighbor of neighbors) {
          queue.push([neighbor, depth + 1]);
        }
      }
    }

    return maxDepth;
  }

  private calculateBranchingFactor(connections: { from: number; to: number }[]): number {
    const outgoingEdges = new Map<number, number>();

    for (const conn of connections) {
      outgoingEdges.set(conn.from, (outgoingEdges.get(conn.from) ?? 0) + 1);
    }

    if (outgoingEdges.size === 0) return 0;

    const totalBranches = Array.from(outgoingEdges.values()).reduce((sum, count) => sum + count, 0);
    return totalBranches / outgoingEdges.size;
  }

  private hasCycles(connections: { from: number; to: number }[]): boolean {
    const adj = new Map<number, number[]>();
    const nodes = new Set<number>();

    for (const conn of connections) {
      if (!adj.has(conn.from)) {
        adj.set(conn.from, []);
      }
      adj.get(conn.from)?.push(conn.to);
      nodes.add(conn.from);
      nodes.add(conn.to);
    }

    const visited = new Set<number>();
    const recStack = new Set<number>();

    const hasCycleDFS = (node: number): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) return true;
      }
    }

    return false;
  }

  private calculateLogicalComplexity(statements: string[]): number {
    let complexity = 0;

    for (const statement of statements) {
      // Count logical operators
      complexity += (statement.match(/[∧∨→↔¬]/g) ?? []).length;
      // Count quantifiers
      complexity += (statement.match(/[∀∃]/g) ?? []).length * 2;
      // Count modal operators
      complexity += (statement.match(/[□◇]/g) ?? []).length * 1.5;
      // Count parentheses depth
      complexity += this.calculateParenthesesDepth(statement) * 0.5;
    }

    return Math.round(complexity);
  }

  private calculateParenthesesDepth(statement: string): number {
    let depth = 0;
    let maxDepth = 0;

    for (const char of statement) {
      if (char === '(') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === ')') {
        depth--;
      }
    }

    return maxDepth;
  }

  private looksLikeModusPonens(statements: string[]): boolean {
    // Check if we have P and P→Q pattern
    for (const stmt1 of statements) {
      for (const stmt2 of statements) {
        if (stmt2.includes('→') && stmt2.startsWith(stmt1.trim())) {
          return true;
        }
      }
    }
    return false;
  }

  private looksLikeHypotheticalSyllogism(statements: string[]): boolean {
    // Check for P→Q and Q→R pattern
    const implications = statements.filter((s) => s.includes('→'));
    if (implications.length >= 2) {
      for (const impl1 of implications) {
        for (const impl2 of implications) {
          if (impl1 !== impl2) {
            const consequent1 = impl1.split('→')[1]?.trim();
            const antecedent2 = impl2.split('→')[0]?.trim();
            if (consequent1 === antecedent2) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
