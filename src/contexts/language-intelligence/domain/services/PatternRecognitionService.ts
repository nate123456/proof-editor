import { err, ok, type Result } from 'neverthrow';

import { type PatternInstance, type StructuralFeatures } from '../entities/AnalysisReport';
import { type LogicalFeatures } from '../entities/InferenceRule';
import { type LanguagePackage } from '../entities/LanguagePackage';
import { type CommonMistake, type ValidationResult } from '../entities/ValidationResult';
import { PatternRecognitionError } from '../errors/DomainErrors';
import { PerformanceMetrics } from '../value-objects/PerformanceMetrics';
import { PerformanceTracker } from '../value-objects/PerformanceTracker';

export class PatternRecognitionService {
  private readonly patternCache = new Map<string, RecognizedPattern[]>();
  private readonly maxCacheSize = 1000;
  private readonly confidenceThreshold = 0.7;

  recognizeProofPatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage
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
        performance: (() => {
          const perfResult = PerformanceMetrics.create(
            tracker.getElapsedMs(),
            tracker.getElapsedMs(), // Use same value for CPU time since we don't track separately
            tracker.getMemoryUsageMb() * 1024 * 1024, // Convert MB to bytes
            tracker.getMemoryUsageMb() * 1024 * 1024 // Use same value for peak memory
          );
          if (perfResult.isOk()) {
            return perfResult.value;
          }
          // Fallback performance metrics
          const fallback = PerformanceMetrics.create(0, 0, 0, 0);
          if (fallback.isOk()) {
            return fallback.value;
          }
          // Final fallback - should never happen in practice
          throw new Error('Failed to create fallback performance metrics');
        })(),
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

  recognizeArgumentStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage
  ): Result<ArgumentStructureAnalysis, PatternRecognitionError> {
    try {
      const structure = this.analyzeArgumentStructureInternal(premises, conclusions);
      const patterns = this.matchInferenceRules(premises, conclusions, languagePackage);
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

  analyzeArgumentStructure(
    premises: string[],
    conclusion: string,
    languagePackage: LanguagePackage
  ): Result<DetailedArgumentStructureAnalysis, PatternRecognitionError> {
    try {
      // Convert single conclusion to array for internal processing
      const conclusions = [conclusion];
      const patterns = this.matchInferenceRules(premises, conclusions, languagePackage);

      // Detect argument type
      const argumentType = 'deductive';
      const logicalForm: string[] = [];

      if (this.looksLikeModusPonens([...premises, conclusion])) {
        logicalForm.push('modus ponens');
      }
      if (this.looksLikeHypotheticalSyllogism([...premises, conclusion])) {
        logicalForm.push('hypothetical syllogism');
      }

      // Analyze dependencies
      const dependencies = this.analyzeDependencies(premises, conclusion);

      // Check for circular dependencies
      const hasCircularDependencies = this.hasCircularDependencies(premises, conclusion);

      // Calculate strength
      const strength =
        premises.length === 0 ? 0 : this.calculateArgumentStrength(premises, conclusions);

      return ok({
        argumentType,
        isValid: patterns.isValid,
        logicalForm,
        dependencies,
        assumptions: this.extractAssumptions(premises),
        strength,
        hasCircularDependencies,
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to analyze argument structure',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  detectCommonMistakes(
    validationResults: ValidationResult[],
    languagePackage: LanguagePackage
  ): Result<MistakeAnalysis, PatternRecognitionError> {
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

  private recognizeStructuralPatterns(
    _statements: string[],
    _connections: { from: number; to: number }[]
  ): RecognizedPattern[] {
    // Delegate to AnalysisReport
    // This method is now handled by entities that own the analysis data
    return [];
  }

  private recognizeLogicalPatterns(
    statements: string[],
    _languagePackage: LanguagePackage
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
    if (statements.some(s => s.includes('∧'))) {
      patterns.push({
        type: 'logical-pattern',
        name: 'conjunction',
        description: 'Conjunction pattern detected',
        confidence: 0.8,
        instances: [{ startIndex: 0, endIndex: statements.length - 1 }],
        properties: { operator: '∧' },
      });
    }

    return patterns;
  }

  private recognizeInferencePatterns(
    statements: string[],
    connections: { from: number; to: number }[],
    languagePackage: LanguagePackage
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

  // Structural analysis methods moved to AnalysisReport

  // Logical pattern detection methods moved to InferenceRule

  // Feature extraction methods moved to appropriate entities

  // Graph analysis methods moved to AnalysisReport

  private generatePatternInsights(
    patterns: RecognizedPattern[],
    _languagePackage: LanguagePackage
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

  private analyzeArgumentStructureInternal(
    premises: string[],
    conclusions: string[]
  ): ArgumentStructure {
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
    const conclusionLength = Array.isArray(conclusions)
      ? conclusions.join('').length
      : String(conclusions).length;
    return Math.min(1, premiseLength / Math.max(conclusionLength, 1));
  }

  private matchInferenceRules(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage
  ): { matchingRules: string[]; isValid: boolean; iSound: boolean } {
    const matchingRules: string[] = [];

    // Check if languagePackage has getInferenceRules method
    if (
      'getInferenceRules' in languagePackage &&
      typeof languagePackage.getInferenceRules === 'function'
    ) {
      const rules = languagePackage.getInferenceRules() as unknown as {
        isRuleActive?: () => boolean;
        matchesPattern?: (p: string[], c: string[]) => boolean;
        getName?: () => { getValue?: () => string } | string;
      }[];

      for (const rule of rules) {
        if (rule.isRuleActive?.() && rule.matchesPattern?.(premises, conclusions)) {
          const name = rule.getName?.();
          const ruleName =
            typeof name === 'object' &&
            name &&
            'getValue' in name &&
            typeof name.getValue === 'function'
              ? name.getValue()
              : typeof name === 'string'
                ? name
                : 'unknown';
          matchingRules.push(ruleName);
        }
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
    const logicalSymbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) ?? [];

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
        patterns.set(code, (patterns.get(code) ?? 0) + 1);
      }
    }

    return patterns;
  }

  private detectCircularReasoning(_validationResults: ValidationResult[]): {
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
    _languagePackage: LanguagePackage
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

  recognizePatterns(
    statements: string[],
    languagePackage: LanguagePackage
  ): Result<RecognizedPatternResult, PatternRecognitionError> {
    try {
      // Recognize logical patterns in statements
      const logicalPatterns = this.recognizeLogicalPatterns(statements, languagePackage);

      // Recognize structural patterns
      const connections = this.inferConnectionsFromStatements(statements);
      const structuralPatterns = this.recognizeStructuralPatterns(statements, connections);

      // Custom patterns (placeholder for now)
      const customPatterns: RecognizedPattern[] = [];

      // Calculate overall complexity
      const overallComplexity = this.calculateOverallComplexity(statements);

      return ok({
        logicalPatterns,
        structuralPatterns,
        customPatterns,
        overallComplexity,
      });
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to recognize patterns',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  detectLogicalStructure(
    statement: string,
    languagePackage: LanguagePackage
  ): Result<DetailedLogicalStructureAnalysis, PatternRecognitionError> {
    try {
      const mainOperator = this.identifyMainConnective(statement);
      const subformulas = this.extractSubformulas(statement);
      const atomicPropositions = this.extractAtomicPropositions(statement);
      const operators = this.extractLogicalOperators(statement, languagePackage);

      // Determine if atomic or compound
      const isAtomic = mainOperator === null;
      const isCompound = !isAtomic;

      // For atomic formulas, subformulas should be empty
      const finalSubformulas = isAtomic ? [] : subformulas;

      // Check for nesting - consider a formula nested if it has parentheses or multiple operators
      const parenthesesDepth = this.calculateParenthesesDepth(statement);
      const hasMultipleOperators = operators.length > 1;
      const hasParentheses = statement.includes('(') && statement.includes(')');
      const isNested = parenthesesDepth > 0 || hasParentheses || hasMultipleOperators;

      // Calculate logical depth: count levels of logical structure
      // For "(P ∧ Q) → (R ∨ S)", we have: main level (→) + sub-level (∧, ∨) = depth 2
      const logicalDepth =
        hasParentheses && hasMultipleOperators ? parenthesesDepth + 1 : parenthesesDepth;

      // Extract quantifiers and variables
      const quantifiers = this.extractQuantifiers(statement);
      const variables = this.extractVariables(statement);
      const hasQuantifiers = quantifiers.length > 0;

      // Extract modal operators
      const modalOperators = this.extractModalOperators(statement);
      const hasModalOperators = modalOperators.length > 0;

      const structure: DetailedLogicalStructureAnalysis = {
        mainOperator,
        subformulas: finalSubformulas,
        complexity: this.calculateStatementComplexity(statement),
        operators,
        isWellFormed: this.checkWellFormedness(statement, languagePackage),
        parenthesesDepth,
        atomicPropositions,
        isAtomic,
        isCompound,
        isNested,
        depth: logicalDepth,
        hasQuantifiers,
        quantifiers,
        variables,
        hasModalOperators,
        modalOperators,
      };

      return ok(structure);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to detect logical structure',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  suggestPatternCompletion(
    partialStatements: string[],
    _languagePackage: LanguagePackage
  ): Result<PatternCompletionSuggestion[], PatternRecognitionError> {
    try {
      const suggestions: PatternCompletionSuggestion[] = [];

      // Generate completion suggestions based on common inference patterns
      if (this.looksLikeModusPonens(partialStatements)) {
        suggestions.push({
          suggestedStatement: this.generateModusPonensSuggestion(partialStatements),
          patternType: 'modus-ponens',
          confidence: 0.9,
          explanation: 'Complete modus ponens inference: if you have P and P→Q, then Q follows',
        });
      }

      if (this.looksLikeHypotheticalSyllogism(partialStatements)) {
        suggestions.push({
          suggestedStatement: this.generateHypotheticalSyllogismSuggestion(partialStatements),
          patternType: 'hypothetical-syllogism',
          confidence: 0.85,
          explanation: 'Complete hypothetical syllogism: if you have P→Q and Q→R, then P→R follows',
        });
      }

      // Add conjunction/disjunction completion suggestions
      if (this.looksLikeConjunction(partialStatements)) {
        suggestions.push({
          suggestedStatement: this.generateConjunctionSuggestion(partialStatements),
          patternType: 'conjunction',
          confidence: 0.8,
          explanation: 'Complete conjunction pattern',
        });
      }

      return ok(suggestions);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to suggest pattern completion',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  extractPatternFeatures(
    statements: string[],
    languagePackage: LanguagePackage
  ): Result<ExtractedPatternFeatures, PatternRecognitionError> {
    try {
      const patterns = this.identifyInferencePatterns(statements, languagePackage);
      const patternDistribution = this.calculatePatternDistribution(statements, languagePackage);
      const uniquePatterns = Object.keys(patternDistribution).length;
      const totalStatements = statements.length;

      const features: ExtractedPatternFeatures = {
        totalStatements,
        uniquePatterns,
        patternDensity: totalStatements > 0 ? uniquePatterns / totalStatements : 0,
        dominantPatternType: this.findDominantPattern(patternDistribution),
        complexityScore: this.calculateOverallComplexity(statements),
        patternDistribution,
        logicalOperatorFrequency: this.calculateOperatorFrequency(statements),
        inferencePatterns: patterns,
        structuralMetrics: this.calculateStructuralMetrics(statements),
        complexityDistribution: this.analyzeComplexityDistribution(statements),
      };

      return ok(features);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to extract pattern features',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  // Helper methods for pattern recognition
  private inferConnectionsFromStatements(statements: string[]): { from: number; to: number }[] {
    const connections: { from: number; to: number }[] = [];

    // Simple heuristic: if statement i+1 contains elements from statement i, assume connection
    for (let i = 0; i < statements.length - 1; i++) {
      const currentStmt = statements[i];
      const nextStmt = statements[i + 1];
      if (currentStmt && nextStmt && this.hasLogicalConnection(currentStmt, nextStmt)) {
        connections.push({ from: i, to: i + 1 });
      }
    }

    return connections;
  }

  private hasLogicalConnection(statement1: string, statement2: string): boolean {
    // Simple check for shared atomic propositions
    const props1 = this.extractAtomicPropositions(statement1);
    const props2 = this.extractAtomicPropositions(statement2);

    return props1.some(prop => props2.includes(prop));
  }

  private identifyMainConnective(statement: string): string | null {
    // Find the main connective (the one with lowest precedence at the top level)
    const connectives = ['↔', '→', '∨', '∧'];
    let depth = 0;
    let mainConnective = null;
    let minDepth = Infinity;

    for (const [, char] of Array.from(statement).entries()) {
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (connectives.includes(char) && depth < minDepth) {
        minDepth = depth;
        mainConnective = char;
      }
    }

    return mainConnective;
  }

  private extractSubformulas(statement: string): string[] {
    const subformulas: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of statement) {
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
        if (depth === 0 && current.length > 1) {
          subformulas.push(current.trim());
          current = '';
        }
      } else if (depth === 0 && /[∧∨→↔]/.test(char)) {
        if (current.trim()) {
          subformulas.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      subformulas.push(current.trim());
    }

    return subformulas;
  }

  private calculateStatementComplexity(statement: string): number {
    let complexity = 0;
    complexity += (statement.match(/[∧∨→↔¬]/g) ?? []).length;
    complexity += (statement.match(/[∀∃]/g) ?? []).length * 2;
    complexity += (statement.match(/[□◇]/g) ?? []).length * 1.5;
    complexity += (statement.match(/\(/g) ?? []).length * 0.5;

    return Math.round(complexity);
  }

  private extractLogicalOperators(statement: string, languagePackage: LanguagePackage): string[] {
    const operators: string[] = [];

    if (
      'getSupportedConnectives' in languagePackage &&
      typeof languagePackage.getSupportedConnectives === 'function'
    ) {
      const supportedOps = (languagePackage.getSupportedConnectives as () => unknown[])();
      if (Array.isArray(supportedOps)) {
        for (const op of supportedOps) {
          if (statement.includes(String(op))) {
            operators.push(String(op));
          }
        }
      }
    } else {
      // Fallback to default operators
      const defaultOps = ['∧', '∨', '→', '↔', '¬'];
      for (const op of defaultOps) {
        if (statement.includes(op)) {
          operators.push(op);
        }
      }
    }

    return operators;
  }

  private checkWellFormedness(statement: string, _languagePackage: LanguagePackage): boolean {
    // Basic well-formedness check
    const openParens = (statement.match(/\(/g) ?? []).length;
    const closeParens = (statement.match(/\)/g) ?? []).length;

    return openParens === closeParens;
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

  private extractAtomicPropositions(statement: string): string[] {
    // Extract single capital letters that represent atomic propositions
    const matches = statement.match(/[A-Z]/g) ?? [];
    return Array.from(new Set(matches));
  }

  private analyzeExistingPatterns(
    statements: string[],
    _languagePackage: LanguagePackage
  ): string[] {
    const patterns: string[] = [];

    // Check for common logical patterns
    if (statements.some(s => s.includes('→'))) {
      patterns.push('implication');
    }
    if (statements.some(s => s.includes('∧'))) {
      patterns.push('conjunction');
    }
    if (statements.some(s => s.includes('∨'))) {
      patterns.push('disjunction');
    }

    return patterns;
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

  private generateModusPonensSuggestion(statements: string[]): string {
    // Find the implication and try to complete modus ponens
    const implication = statements.find(s => s.includes('→'));
    if (implication) {
      const parts = implication.split('→');
      if (parts.length === 2) {
        return parts[1]?.trim() ?? '';
      }
    }
    return 'Q';
  }

  private looksLikeHypotheticalSyllogism(statements: string[]): boolean {
    // Check for P→Q and Q→R pattern
    const implications = statements.filter(s => s.includes('→'));
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

  private generateHypotheticalSyllogismSuggestion(statements: string[]): string {
    const implications = statements.filter(s => s.includes('→'));
    for (const impl1 of implications) {
      for (const impl2 of implications) {
        if (impl1 !== impl2) {
          const antecedent1 = impl1.split('→')[0]?.trim();
          const consequent2 = impl2.split('→')[1]?.trim();
          if (antecedent1 && consequent2) {
            return `${antecedent1} → ${consequent2}`;
          }
        }
      }
    }
    return 'P → R';
  }

  private looksLikeConjunction(statements: string[]): boolean {
    // Only suggest conjunction if we have exactly 2 simple statements and no logical operators
    if (statements.length !== 2) return false;

    const hasLogicalOperators = statements.some(
      s =>
        s.includes('∧') || s.includes('→') || s.includes('∨') || s.includes('¬') || s.includes('↔')
    );

    // Don't suggest conjunction for statements that look like they contain complex logical structure
    const hasComplexStructure = statements.some(
      s => s.includes('(') || s.includes(')') || s.length > 20
    );

    return !hasLogicalOperators && !hasComplexStructure;
  }

  private generateConjunctionSuggestion(statements: string[]): string {
    if (statements.length >= 2) {
      return statements.slice(0, 2).join(' ∧ ');
    }
    return 'P ∧ Q';
  }

  private calculateOperatorFrequency(statements: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    const allText = statements.join(' ');

    const operators = ['∧', '∨', '→', '↔', '¬', '∀', '∃', '□', '◇'];
    for (const op of operators) {
      const count = (
        allText.match(new RegExp(op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []
      ).length;
      if (count > 0) {
        frequency[op] = count;
      }
    }

    return frequency;
  }

  private identifyInferencePatterns(
    statements: string[],
    _languagePackage: LanguagePackage
  ): string[] {
    const patterns: string[] = [];

    if (this.looksLikeModusPonens(statements)) {
      patterns.push('modus-ponens');
    }
    if (this.looksLikeHypotheticalSyllogism(statements)) {
      patterns.push('hypothetical-syllogism');
    }
    if (statements.some(s => s.includes('∧'))) {
      patterns.push('conjunction');
    }
    if (statements.some(s => s.includes('∨'))) {
      patterns.push('disjunction');
    }

    return patterns;
  }

  private calculateStructuralMetrics(statements: string[]): StructuralMetrics {
    return {
      averageLength: statements.reduce((sum, s) => sum + s.length, 0) / statements.length,
      maxDepth: Math.max(...statements.map(s => this.calculateParenthesesDepth(s))),
      totalConnectives: statements.reduce((sum, s) => sum + (s.match(/[∧∨→↔¬]/g) ?? []).length, 0),
      statementCount: statements.length,
    };
  }

  private analyzeComplexityDistribution(statements: string[]): ComplexityDistribution {
    const complexities = statements.map(s => this.calculateStatementComplexity(s));
    const total = complexities.length;

    return {
      low: complexities.filter(c => c <= 2).length / total,
      medium: complexities.filter(c => c > 2 && c <= 5).length / total,
      high: complexities.filter(c => c > 5).length / total,
      average: complexities.reduce((sum, c) => sum + c, 0) / total,
    };
  }

  private calculatePatternDistribution(
    statements: string[],
    languagePackage: LanguagePackage
  ): Record<string, number> {
    const patterns = this.identifyInferencePatterns(statements, languagePackage);
    const distribution: Record<string, number> = {};

    for (const pattern of patterns) {
      distribution[pattern] = (distribution[pattern] ?? 0) + 1;
    }

    return distribution;
  }

  private findDominantPattern(patternDistribution: Record<string, number>): string | null {
    if (Object.keys(patternDistribution).length === 0) {
      return null;
    }

    let maxCount = 0;
    let dominantPattern = null;

    for (const [pattern, count] of Object.entries(patternDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominantPattern = pattern;
      }
    }

    return dominantPattern;
  }

  private calculateOverallComplexity(statements: string[]): number {
    const complexities = statements.map(s => this.calculateStatementComplexity(s));
    return complexities.reduce((sum, c) => sum + c, 0);
  }

  // Missing methods that need to be implemented

  findSimilarPatterns(
    targetPattern: { type: string; premises: string[]; conclusions: string[]; confidence: number },
    statements: string[],
    _languagePackage: LanguagePackage
  ): Result<SimilarPattern[], PatternRecognitionError> {
    try {
      const similarPatterns: SimilarPattern[] = [];

      // Simple similarity matching based on pattern structure
      for (let i = 0; i < statements.length - targetPattern.premises.length; i++) {
        const candidatePremises = statements.slice(i, i + targetPattern.premises.length);
        const candidateConclusions = statements.slice(
          i + targetPattern.premises.length,
          i + targetPattern.premises.length + targetPattern.conclusions.length
        );

        if (candidateConclusions.length === targetPattern.conclusions.length) {
          const similarity = this.calculatePatternSimilarity(
            { premises: targetPattern.premises, conclusions: targetPattern.conclusions },
            { premises: candidatePremises, conclusions: candidateConclusions }
          );

          if (similarity > 0.5) {
            similarPatterns.push({
              pattern: {
                type: targetPattern.type,
                premises: candidatePremises,
                conclusions: candidateConclusions,
                confidence: similarity,
              },
              similarity,
              location: {
                startIndex: i,
                endIndex: i + targetPattern.premises.length + targetPattern.conclusions.length,
              },
            });
          }
        }
      }

      // Special handling for specific pattern types
      if (targetPattern.type === 'modus-ponens') {
        // Look for "A is true", "A is true → B is true", "B is true" pattern
        for (let i = 0; i < statements.length - 2; i++) {
          const stmt1 = statements[i];
          const stmt2 = statements[i + 1];
          const stmt3 = statements[i + 2];

          // Check if all statements exist and stmt2 matches modus ponens structure
          if (stmt1 && stmt2 && stmt3 && stmt2.includes('→')) {
            const parts = stmt2.split('→');
            if (parts.length === 2) {
              const antecedent = parts[0]?.trim() ?? '';
              const consequent = parts[1]?.trim() ?? '';

              // Check if stmt1 matches antecedent and stmt3 matches consequent
              const similarity1 = this.calculateStringSimilarity(stmt1, antecedent);
              const similarity2 = this.calculateStringSimilarity(stmt3, consequent);
              const overallSimilarity = (similarity1 + similarity2) / 2;

              if (overallSimilarity > 0.5) {
                similarPatterns.push({
                  pattern: {
                    type: 'modus-ponens',
                    premises: [stmt1, stmt2],
                    conclusions: [stmt3],
                    confidence: overallSimilarity,
                  },
                  similarity: overallSimilarity,
                  location: { startIndex: i, endIndex: i + 3 },
                });
              }
            }
          }
        }
      } else if (targetPattern.type === 'conjunction') {
        // Look for conjunction patterns: ['A', 'B'] → ['A ∧ B']
        for (let i = 0; i < statements.length - 2; i++) {
          const stmt1 = statements[i];
          const stmt2 = statements[i + 1];
          const stmt3 = statements[i + 2];

          // Check if all statements exist
          if (stmt1 && stmt2 && stmt3) {
            // Check if stmt3 is a conjunction of stmt1 and stmt2
            const expectedConjunction = `${stmt1} ∧ ${stmt2}`;
            const similarity = this.calculateStringSimilarity(stmt3, expectedConjunction);

            if (similarity > 0.8) {
              similarPatterns.push({
                pattern: {
                  type: 'conjunction',
                  premises: [stmt1, stmt2],
                  conclusions: [stmt3],
                  confidence: similarity,
                },
                similarity,
                location: { startIndex: i, endIndex: i + 3 },
              });
            }
          }
        }
      }

      // Sort by similarity score descending
      similarPatterns.sort((a, b) => b.similarity - a.similarity);

      return ok(similarPatterns);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to find similar patterns',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  private calculatePatternSimilarity(
    pattern1: { premises: string[]; conclusions: string[] },
    pattern2: { premises: string[]; conclusions: string[] }
  ): number {
    if (
      pattern1.premises.length !== pattern2.premises.length ||
      pattern1.conclusions.length !== pattern2.conclusions.length
    ) {
      return 0;
    }

    let totalSimilarity = 0;
    let totalComparisons = 0;

    // Compare premises
    for (let i = 0; i < pattern1.premises.length; i++) {
      const premise1 = pattern1.premises[i];
      const premise2 = pattern2.premises[i];
      if (premise1 && premise2) {
        const sim = this.calculateStringSimilarity(premise1, premise2);
        totalSimilarity += sim;
        totalComparisons++;
      }
    }

    // Compare conclusions
    for (let i = 0; i < pattern1.conclusions.length; i++) {
      const conclusion1 = pattern1.conclusions[i];
      const conclusion2 = pattern2.conclusions[i];
      if (conclusion1 && conclusion2) {
        const sim = this.calculateStringSimilarity(conclusion1, conclusion2);
        totalSimilarity += sim;
        totalComparisons++;
      }
    }

    return totalComparisons > 0 ? totalSimilarity / totalComparisons : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array.from({ length: str2.length + 1 }, () =>
      Array.from({ length: str1.length + 1 }, () => 0)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const current = matrix[j]!;
        const above = matrix[j - 1]!;
        current[i] = Math.min(current[i - 1]! + 1, above[i]! + 1, above[i - 1]! + cost);
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  private analyzeDependencies(premises: string[], conclusion: string): string[] {
    const dependencies: string[] = [];

    // Simple dependency analysis - look for shared terms
    const conclusionTerms = this.extractAtomicPropositions(conclusion);

    for (const premise of premises) {
      const premiseTerms = this.extractAtomicPropositions(premise);
      if (premiseTerms.some(term => conclusionTerms.includes(term))) {
        dependencies.push(premise);
      }
    }

    return dependencies;
  }

  private hasCircularDependencies(premises: string[], conclusion: string): boolean {
    // Simple circular dependency check
    for (const premise of premises) {
      if (premise === conclusion) return true;

      // Check if conclusion appears as a premise
      if (premise.includes(conclusion)) return true;
    }

    return false;
  }

  private extractAssumptions(premises: string[]): string[] {
    // Extract implicit assumptions (simplified)
    return premises.filter(p => !p.includes('→') && !p.includes('∧') && !p.includes('∨'));
  }

  private extractQuantifiers(statement: string): string[] {
    const quantifierMatches = statement.match(/[∀∃]/g);
    return quantifierMatches ? Array.from(new Set(quantifierMatches)) : [];
  }

  private extractVariables(statement: string): string[] {
    // Extract variables from quantified statements
    const variableMatches = statement.match(/[∀∃]([a-z])/g);
    return variableMatches ? variableMatches.map(match => match.charAt(1)) : [];
  }

  private extractModalOperators(statement: string): string[] {
    const modalMatches = statement.match(/[□◇]/g);
    return modalMatches ? Array.from(new Set(modalMatches)) : [];
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
  performance: PerformanceMetrics;
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

export interface RecognizedPatternResult {
  logicalPatterns: RecognizedPattern[];
  structuralPatterns: RecognizedPattern[];
  customPatterns: RecognizedPattern[];
  overallComplexity: number;
}

export interface LogicalStructureAnalysis {
  mainConnective: string | null;
  subformulas: string[];
  complexity: number;
  operators: string[];
  isWellFormed: boolean;
  parenthesesDepth: number;
  atomicPropositions: string[];
}

export interface PatternCompletionSuggestion {
  suggestedStatement: string;
  patternType: string;
  confidence: number;
  explanation: string;
}

export interface ExtractedPatternFeatures {
  totalStatements: number;
  uniquePatterns: number;
  patternDensity: number;
  dominantPatternType: string | null;
  complexityScore: number;
  patternDistribution: Record<string, number>;
  logicalOperatorFrequency: Record<string, number>;
  inferencePatterns: string[];
  structuralMetrics: StructuralMetrics;
  complexityDistribution: ComplexityDistribution;
}

export interface StructuralMetrics {
  averageLength: number;
  maxDepth: number;
  totalConnectives: number;
  statementCount: number;
}

export interface ComplexityDistribution {
  low: number;
  medium: number;
  high: number;
  average: number;
}

// Additional interfaces for the detailed analysis
export interface DetailedLogicalStructureAnalysis {
  mainOperator: string | null;
  subformulas: string[];
  complexity: number;
  operators: string[];
  isWellFormed: boolean;
  parenthesesDepth: number;
  atomicPropositions: string[];
  isAtomic: boolean;
  isCompound: boolean;
  isNested: boolean;
  depth: number;
  hasQuantifiers: boolean;
  quantifiers: string[];
  variables: string[];
  hasModalOperators: boolean;
  modalOperators: string[];
}

export interface DetailedArgumentStructureAnalysis {
  argumentType: string;
  isValid: boolean;
  logicalForm: string[];
  dependencies: string[];
  assumptions: string[];
  strength: number;
  hasCircularDependencies: boolean;
}

export interface SimilarPattern {
  pattern: {
    type: string;
    premises: string[];
    conclusions: string[];
    confidence: number;
  };
  similarity: number;
  location: {
    startIndex: number;
    endIndex: number;
  };
}

// PatternInstance interface moved to AnalysisReport.ts to avoid duplicate exports

// Strategy analysis types moved to AtomicArgumentEntity
