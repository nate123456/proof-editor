import { err, ok, type Result } from 'neverthrow';

import {
  type AnalysisReport,
  type PatternInstance,
  type StructuralFeatures,
} from '../entities/AnalysisReport';
import { InferenceRule, type LogicalFeatures } from '../entities/InferenceRule';
import { type LanguagePackage } from '../entities/LanguagePackage';
import { type CommonMistake, type ValidationResult } from '../entities/ValidationResult';
import { PatternRecognitionError } from '../errors/DomainErrors';
import { PerformanceTracker } from '../value-objects/PerformanceTracker';

export class PatternRecognitionService {
  private readonly patternCache = new Map<string, RecognizedPattern[]>();
  private readonly maxCacheSize = 1000;
  private readonly confidenceThreshold = 0.7;

  async recognizeProofPatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage
  ): Promise<Result<ProofPatternAnalysis, PatternRecognitionError>> {
    const tracker = PerformanceTracker.start();

    try {
      const patterns: RecognizedPattern[] = [];

      // Analyze structural patterns
      const structuralPatterns = await this.recognizeStructuralPatterns(statements, connections);
      patterns.push(...structuralPatterns);

      // Analyze logical patterns
      const logicalPatterns = await this.recognizeLogicalPatterns(statements, languagePackage);
      patterns.push(...logicalPatterns);

      // Analyze inference patterns
      const inferencePatterns = await this.recognizeInferencePatterns(
        statements,
        connections,
        languagePackage
      );
      patterns.push(...inferencePatterns);

      // Filter by confidence threshold
      const highConfidencePatterns = patterns.filter(p => p.confidence >= this.confidenceThreshold);

      // Generate insights
      const insights = this.generatePatternInsights(highConfidencePatterns, languagePackage);

      tracker.stop();

      return ok({
        recognizedPatterns: highConfidencePatterns,
        structuralFeatures: {
          statementCount: statements.length,
          connectionCount: connections.length,
          maxDepth: 0,
          branchingFactor: 0,
          isLinear: false,
          isTree: false,
          hasCycles: false,
        },
        logicalFeatures: {
          hasQuantifiers: false,
          hasModalOperators: false,
          hasNegations: false,
          hasImplications: false,
          hasConjunctions: false,
          hasDisjunctions: false,
          logicalComplexity: 0,
        },
        patternInsights: insights,
        confidence: this.calculateOverallConfidence(highConfidencePatterns),
        performance: tracker.getPerformanceReport(),
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to recognize proof patterns',
          error instanceof Error ? error : undefined
        )
      );
    } finally {
      tracker.stop();
    }
  }

  async recognizeArgumentStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage
  ): Promise<Result<ArgumentStructureAnalysis, PatternRecognitionError>> {
    try {
      const structure = this.analyzeArgumentStructure(premises, conclusions);
      const patterns = await this.matchInferenceRules(premises, conclusions, languagePackage);
      const complexity = this.calculateArgumentComplexity(premises, conclusions);

      return ok({
        argumentType: structure.type,
        inferenceRules: patterns.matchingRules,
        complexity,
        validity: patterns.isValid,
        soundness: patterns.iSound,
        logicalFeatures: this.extractArgumentFeatures(premises, conclusions),
        suggestions: this.generateStructureImprovement(structure, patterns),
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to recognize argument structure',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  async detectCommonMistakes(
    validationResults: ValidationResult[],
    languagePackage: LanguagePackage
  ): Promise<Result<MistakeAnalysis, PatternRecognitionError>> {
    try {
      const mistakes: CommonMistake[] = [];
      const patterns = this.analyzeErrorPatterns(validationResults);

      // Detect circular reasoning
      const circularReasoning = this.detectCircularReasoning(validationResults);
      if (circularReasoning.detected) {
        mistakes.push({
          type: 'circular-reasoning',
          description: 'Circular reasoning detected in proof structure',
          confidence: circularReasoning.confidence,
          instances: circularReasoning.instances,
          suggestion: 'Ensure conclusions do not depend on themselves',
        });
      }

      // Detect invalid inferences
      const invalidInferences = this.detectInvalidInferences(validationResults, languagePackage);
      mistakes.push(...invalidInferences);

      // Detect missing premises
      const missingPremises = this.detectMissingPremises(validationResults);
      mistakes.push(...missingPremises);

      // Detect modal logic errors
      if (languagePackage.supportsModalLogic()) {
        const modalErrors = this.detectModalLogicErrors(validationResults);
        mistakes.push(...modalErrors);
      }

      return ok({
        commonMistakes: mistakes,
        errorFrequency: this.calculateErrorFrequency(patterns),
        severityDistribution: this.analyzeSeverityDistribution(validationResults),
        improvementAreas: this.identifyImprovementAreas(mistakes),
        learningRecommendations: this.generateLearningRecommendations(mistakes),
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to detect common mistakes',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  // Strategy analysis methods moved to AtomicArgumentEntity - entities own strategic decisions

  private async recognizeStructuralPatterns(
    statements: string[],
    connections: { from: number; to: number }[]
  ): Promise<RecognizedPattern[]> {
    // Delegate to AnalysisReport
    // This method is now handled by entities that own the analysis data
    return [];
  }

  private async recognizeLogicalPatterns(
    statements: string[],
    languagePackage: LanguagePackage
  ): Promise<RecognizedPattern[]> {
    // Delegate to InferenceRule
    // This method is now handled by entities that own the logical inference patterns
    return [];
  }

  private async recognizeInferencePatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage
  ): Promise<RecognizedPattern[]> {
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

  // Structural analysis methods moved to AnalysisReport

  // Logical pattern detection methods moved to InferenceRule

  // Feature extraction methods moved to appropriate entities

  // Graph analysis methods moved to AnalysisReport

  private generatePatternInsights(
    patterns: RecognizedPattern[],
    languagePackage: LanguagePackage
  ): PatternInsight[] {
    const insights: PatternInsight[] = [];

    const patternTypes = new Set(patterns.map(p => p.type));

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

  private calculateOverallConfidence(patterns: RecognizedPattern[]): number {
    if (patterns.length === 0) return 0;

    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / patterns.length;
  }

  private analyzeArgumentStructure(premises: string[], conclusions: string[]): ArgumentStructure {
    // Simplified analysis
    return {
      type: conclusions.length === 1 ? 'deductive' : 'complex',
      premiseCount: premises.length,
      conclusionCount: conclusions.length,
      isValid: true, // Would need proper logical analysis
      strength: this.calculateArgumentStrength(premises, conclusions),
    };
  }

  private calculateArgumentStrength(premises: string[], conclusions: string[]): number {
    // Simplified strength calculation based on premise-conclusion ratio
    const premiseLength = premises.join('').length;
    const conclusionLength = conclusions.join('').length;
    return Math.min(1, premiseLength / Math.max(conclusionLength, 1));
  }

  private async matchInferenceRules(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage
  ): Promise<{ matchingRules: string[]; isValid: boolean; iSound: boolean }> {
    const matchingRules: string[] = [];
    const rules = languagePackage.getInferenceRules();

    for (const rule of rules) {
      if (rule.isRuleActive() && rule.matchesPattern(premises, conclusions)) {
        matchingRules.push(rule.getName().getValue());
      }
    }

    return {
      matchingRules,
      isValid: matchingRules.length > 0,
      iSound: matchingRules.length > 0, // Simplified
    };
  }

  private calculateArgumentComplexity(
    premises: string[],
    conclusions: string[]
  ): ArgumentComplexity {
    const allStatements = [...premises, ...conclusions];
    const totalLength = allStatements.join('').length;
    const logicalSymbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) || [];

    return {
      score: Math.round(totalLength * 0.1 + logicalSymbols.length * 2),
      level: this.categorizeComplexity(totalLength, logicalSymbols.length),
      factors: {
        statementCount: allStatements.length,
        averageLength: totalLength / allStatements.length,
        logicalSymbolCount: logicalSymbols.length,
      },
    };
  }

  private categorizeComplexity(
    totalLength: number,
    symbolCount: number
  ): 'low' | 'medium' | 'high' {
    const complexityScore = totalLength * 0.1 + symbolCount * 2;
    if (complexityScore < 10) return 'low';
    if (complexityScore < 30) return 'medium';
    return 'high';
  }

  private extractArgumentFeatures(premises: string[], conclusions: string[]): ArgumentFeatures {
    const allStatements = [...premises, ...conclusions];

    return {
      hasConditionals: allStatements.some(s => s.includes('→')),
      hasNegations: allStatements.some(s => s.includes('¬')),
      hasQuantifiers: allStatements.some(s => /[∀∃]/.test(s)),
      hasModalOperators: allStatements.some(s => /[□◇]/.test(s)),
      averageStatementLength:
        allStatements.reduce((sum, s) => sum + s.length, 0) / allStatements.length,
      logicalDepth: this.calculateLogicalDepth(allStatements),
    };
  }

  private calculateLogicalDepth(statements: string[]): number {
    // Count maximum nesting level of parentheses
    let maxDepth = 0;

    for (const statement of statements) {
      let currentDepth = 0;
      let statementMaxDepth = 0;

      for (const char of statement) {
        if (char === '(') {
          currentDepth++;
          statementMaxDepth = Math.max(statementMaxDepth, currentDepth);
        } else if (char === ')') {
          currentDepth--;
        }
      }

      maxDepth = Math.max(maxDepth, statementMaxDepth);
    }

    return maxDepth;
  }

  private generateStructureImprovement(
    structure: ArgumentStructure,
    patterns: { matchingRules: string[]; isValid: boolean; iSound: boolean }
  ): string[] {
    const suggestions: string[] = [];

    if (!patterns.isValid) {
      suggestions.push('Consider adding intermediate steps to strengthen the logical connection');
    }

    if (structure.strength < 0.5) {
      suggestions.push('The argument could benefit from additional supporting premises');
    }

    if (structure.premiseCount > 5) {
      suggestions.push('Consider grouping related premises to improve clarity');
    }

    return suggestions;
  }

  private analyzeErrorPatterns(validationResults: ValidationResult[]): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const code = diagnostic.getCode().getCode();
        patterns.set(code, (patterns.get(code) || 0) + 1);
      }
    }

    return patterns;
  }

  private detectCircularReasoning(validationResults: ValidationResult[]): {
    detected: boolean;
    confidence: number;
    instances: string[];
  } {
    // Simplified circular reasoning detection
    // In practice, this would involve more sophisticated dependency analysis

    return {
      detected: false,
      confidence: 0,
      instances: [],
    };
  }

  private detectInvalidInferences(
    validationResults: ValidationResult[],
    languagePackage: LanguagePackage
  ): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        if (diagnostic.getCode().getCode().includes('inference')) {
          mistakes.push({
            type: 'invalid-inference',
            description: diagnostic.getMessage().getText(),
            confidence: 0.8,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Review the inference rule being applied',
          });
        }
      }
    }

    return mistakes;
  }

  private detectMissingPremises(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    // Simplified detection - look for semantic errors that might indicate missing premises
    for (const result of validationResults) {
      const semanticErrors = result.getDiagnostics().filter(d => d.isSemanticRelated());

      if (semanticErrors.length > 0) {
        mistakes.push({
          type: 'missing-premise',
          description: 'Possible missing premise detected',
          confidence: 0.6,
          instances: semanticErrors.map(d => d.getLocation().toString()),
          suggestion: 'Consider if additional premises are needed to support the conclusion',
        });
      }
    }

    return mistakes;
  }

  private detectModalLogicErrors(validationResults: ValidationResult[]): CommonMistake[] {
    const mistakes: CommonMistake[] = [];

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const message = diagnostic.getMessage().getText().toLowerCase();

        if (
          message.includes('modal') ||
          message.includes('necessity') ||
          message.includes('possibility')
        ) {
          mistakes.push({
            type: 'modal-logic-error',
            description: diagnostic.getMessage().getText(),
            confidence: 0.85,
            instances: [diagnostic.getLocation().toString()],
            suggestion: 'Review modal logic principles and operator usage',
          });
        }
      }
    }

    return mistakes;
  }

  private calculateErrorFrequency(patterns: Map<string, number>): Record<string, number> {
    const frequency: Record<string, number> = {};
    const total = Array.from(patterns.values()).reduce((sum, count) => sum + count, 0);

    for (const [pattern, count] of patterns.entries()) {
      frequency[pattern] = total > 0 ? count / total : 0;
    }

    return frequency;
  }

  private analyzeSeverityDistribution(
    validationResults: ValidationResult[]
  ): Record<string, number> {
    const distribution = { error: 0, warning: 0, info: 0 };

    for (const result of validationResults) {
      for (const diagnostic of result.getDiagnostics()) {
        const severity = diagnostic.getSeverity().getSeverity();
        distribution[severity]++;
      }
    }

    return distribution;
  }

  private identifyImprovementAreas(mistakes: CommonMistake[]): string[] {
    const areas = new Set<string>();

    for (const mistake of mistakes) {
      switch (mistake.type) {
        case 'invalid-inference':
          areas.add('logical-reasoning');
          break;
        case 'missing-premise':
          areas.add('argument-structure');
          break;
        case 'modal-logic-error':
          areas.add('modal-logic');
          break;
        case 'circular-reasoning':
          areas.add('logical-dependencies');
          break;
      }
    }

    return Array.from(areas);
  }

  private generateLearningRecommendations(mistakes: CommonMistake[]): string[] {
    const recommendations: string[] = [];
    const mistakeTypes = new Set(mistakes.map(m => m.type));

    if (mistakeTypes.has('invalid-inference')) {
      recommendations.push('Study basic inference rules (modus ponens, modus tollens, etc.)');
    }

    if (mistakeTypes.has('modal-logic-error')) {
      recommendations.push('Review modal logic concepts and operator semantics');
    }

    if (mistakeTypes.has('circular-reasoning')) {
      recommendations.push(
        'Practice identifying logical dependencies and avoiding circular arguments'
      );
    }

    return recommendations;
  }

  // Strategy analysis helper methods moved to AtomicArgumentEntity
}

// Types and interfaces
export interface RecognizedPattern {
  type: string;
  name: string;
  description: string;
  confidence: number;
  instances: PatternInstance[];
  properties: Record<string, unknown>;
}

export interface ProofPatternAnalysis {
  recognizedPatterns: RecognizedPattern[];
  structuralFeatures: StructuralFeatures;
  logicalFeatures: LogicalFeatures;
  patternInsights: PatternInsight[];
  confidence: number;
  performance: any;
}

export interface PatternInsight {
  type: string;
  description: string;
  confidence: number;
  implications: string[];
}

export interface ArgumentStructureAnalysis {
  argumentType: string;
  inferenceRules: string[];
  complexity: ArgumentComplexity;
  validity: boolean;
  soundness: boolean;
  logicalFeatures: ArgumentFeatures;
  suggestions: string[];
}

export interface ArgumentStructure {
  type: string;
  premiseCount: number;
  conclusionCount: number;
  isValid: boolean;
  strength: number;
}

export interface ArgumentComplexity {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: {
    statementCount: number;
    averageLength: number;
    logicalSymbolCount: number;
  };
}

export interface ArgumentFeatures {
  hasConditionals: boolean;
  hasNegations: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  averageStatementLength: number;
  logicalDepth: number;
}

export interface MistakeAnalysis {
  commonMistakes: CommonMistake[];
  errorFrequency: Record<string, number>;
  severityDistribution: Record<string, number>;
  improvementAreas: string[];
  learningRecommendations: string[];
}

// Strategy analysis types moved to AtomicArgumentEntity
