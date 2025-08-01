import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { PatternRecognitionError } from '../../errors/DomainErrors';
import type {
  ComplexityDistribution,
  ExtractedPatternFeatures,
  PatternCompletionSuggestion,
  StructuralMetrics,
} from '../PatternRecognitionService';

@injectable()
export class PatternSuggestionHelper {
  suggestPatternCompletion(
    partialStatements: string[],
    languagePackage: LanguagePackage,
  ): Result<PatternCompletionSuggestion[], PatternRecognitionError> {
    try {
      const suggestions: PatternCompletionSuggestion[] = [];

      // Analyze current pattern state
      // Analyze current pattern state
      this.analyzePartialPattern(partialStatements);

      // Generate completion suggestions based on common inference patterns
      if (this.looksLikeModusPonens(partialStatements)) {
        suggestions.push(this.generateModusPonensSuggestion(partialStatements));
      }

      if (this.looksLikeModusTollens(partialStatements)) {
        suggestions.push(this.generateModusTollensSuggestion(partialStatements));
      }

      if (this.looksLikeHypotheticalSyllogism(partialStatements)) {
        suggestions.push(this.generateHypotheticalSyllogismSuggestion(partialStatements));
      }

      if (this.looksLikeDisjunctiveSyllogism(partialStatements)) {
        suggestions.push(this.generateDisjunctiveSyllogismSuggestion(partialStatements));
      }

      // Add conjunction/disjunction completion suggestions
      if (this.looksLikeConjunction(partialStatements)) {
        suggestions.push(this.generateConjunctionSuggestion(partialStatements));
      }

      if (this.looksLikeDisjunction(partialStatements)) {
        suggestions.push(this.generateDisjunctionSuggestion(partialStatements));
      }

      // Language-specific patterns
      const customSuggestions = this.generateCustomPatternSuggestions(
        partialStatements,
        languagePackage,
      );
      suggestions.push(...customSuggestions);

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);

      return ok(suggestions);
    } catch (error) {
      return err(
        new PatternRecognitionError(
          'Failed to suggest pattern completion',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  extractPatternFeatures(
    statements: string[],
    languagePackage: LanguagePackage,
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
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private analyzePartialPattern(statements: string[]): {
    hasImplication: boolean;
    hasNegation: boolean;
    hasConjunction: boolean;
    hasDisjunction: boolean;
    hasQuantifiers: boolean;
    hasModalOperators: boolean;
  } {
    const allText = statements.join(' ');

    return {
      hasImplication: allText.includes('→'),
      hasNegation: allText.includes('¬'),
      hasConjunction: allText.includes('∧'),
      hasDisjunction: allText.includes('∨'),
      hasQuantifiers: /[∀∃]/.test(allText),
      hasModalOperators: /[□◇]/.test(allText),
    };
  }

  // Pattern detection methods
  private looksLikeModusPonens(statements: string[]): boolean {
    if (statements.length < 2) return false;

    // Check for P and P→Q pattern
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt?.includes('→')) {
        const antecedent = stmt.split('→')[0]?.trim();
        if (antecedent && statements.some((s) => s.trim() === antecedent)) {
          return true;
        }
      }
    }

    return false;
  }

  private looksLikeModusTollens(statements: string[]): boolean {
    if (statements.length < 2) return false;

    // Check for P→Q and ¬Q pattern
    for (const stmt of statements) {
      if (stmt.includes('→')) {
        const consequent = stmt.split('→')[1]?.trim();
        if (consequent && statements.some((s) => s.trim() === `¬${consequent}`)) {
          return true;
        }
      }
    }

    return false;
  }

  private looksLikeHypotheticalSyllogism(statements: string[]): boolean {
    // Check for P→Q and Q→R pattern
    const implications = statements.filter((s) => s.includes('→'));
    if (implications.length < 2) return false;

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

    return false;
  }

  private looksLikeDisjunctiveSyllogism(statements: string[]): boolean {
    // Check for P∨Q pattern with negation
    for (const stmt of statements) {
      if (stmt.includes('∨')) {
        const parts = stmt.split('∨').map((p) => p.trim());
        if (parts.length === 2) {
          const hasNegatedPart = statements.some(
            (s) => s === `¬${parts[0]}` || s === `¬${parts[1]}`,
          );
          if (hasNegatedPart) return true;
        }
      }
    }

    return false;
  }

  private looksLikeConjunction(statements: string[]): boolean {
    // Only suggest conjunction for exactly 2 simple statements without operators
    if (statements.length !== 2) return false;

    const hasLogicalOperators = statements.some(
      (s) =>
        s.includes('∧') || s.includes('→') || s.includes('∨') || s.includes('¬') || s.includes('↔'),
    );

    const hasComplexStructure = statements.some(
      (s) => s.includes('(') || s.includes(')') || s.length > 20,
    );

    return !hasLogicalOperators && !hasComplexStructure;
  }

  private looksLikeDisjunction(statements: string[]): boolean {
    // Check if we have alternative possibilities that could form a disjunction
    if (statements.length < 2 || statements.length > 3) return false;

    // Don't suggest disjunction if already have logical operators
    const hasLogicalOperators = statements.some(
      (s) => s.includes('∧') || s.includes('→') || s.includes('∨') || s.includes('¬'),
    );

    return !hasLogicalOperators && statements.every((s) => s.length < 30);
  }

  // Suggestion generation methods
  private generateModusPonensSuggestion(statements: string[]): PatternCompletionSuggestion {
    // Find the implication and extract consequent
    const implication = statements.find((s) => s.includes('→'));
    if (implication) {
      const parts = implication.split('→');
      if (parts.length === 2) {
        const consequent = parts[1]?.trim() ?? 'Q';
        return {
          suggestedStatement: consequent,
          patternType: 'modus-ponens',
          confidence: 0.9,
          explanation: 'Complete modus ponens inference: if you have P and P→Q, then Q follows',
        };
      }
    }

    return {
      suggestedStatement: 'Q',
      patternType: 'modus-ponens',
      confidence: 0.7,
      explanation: 'Add the consequent to complete modus ponens',
    };
  }

  private generateModusTollensSuggestion(statements: string[]): PatternCompletionSuggestion {
    const implication = statements.find((s) => s.includes('→'));
    if (implication) {
      const parts = implication.split('→');
      if (parts.length === 2) {
        const antecedent = parts[0]?.trim() ?? 'P';
        return {
          suggestedStatement: `¬${antecedent}`,
          patternType: 'modus-tollens',
          confidence: 0.9,
          explanation: 'Complete modus tollens: if you have P→Q and ¬Q, then ¬P follows',
        };
      }
    }

    return {
      suggestedStatement: '¬P',
      patternType: 'modus-tollens',
      confidence: 0.7,
      explanation: 'Add the negated antecedent to complete modus tollens',
    };
  }

  private generateHypotheticalSyllogismSuggestion(
    statements: string[],
  ): PatternCompletionSuggestion {
    const implications = statements.filter((s) => s.includes('→'));

    for (const impl1 of implications) {
      for (const impl2 of implications) {
        if (impl1 !== impl2) {
          const parts1 = impl1.split('→');
          const parts2 = impl2.split('→');

          if (parts1.length === 2 && parts2.length === 2) {
            const antecedent1 = parts1[0]?.trim();
            const consequent1 = parts1[1]?.trim();
            const antecedent2 = parts2[0]?.trim();
            const consequent2 = parts2[1]?.trim();

            if (consequent1 === antecedent2 && antecedent1 && consequent2) {
              return {
                suggestedStatement: `${antecedent1} → ${consequent2}`,
                patternType: 'hypothetical-syllogism',
                confidence: 0.85,
                explanation: 'Complete hypothetical syllogism: if P→Q and Q→R, then P→R follows',
              };
            }
          }
        }
      }
    }

    return {
      suggestedStatement: 'P → R',
      patternType: 'hypothetical-syllogism',
      confidence: 0.6,
      explanation: 'Add the transitive implication to complete hypothetical syllogism',
    };
  }

  private generateDisjunctiveSyllogismSuggestion(
    statements: string[],
  ): PatternCompletionSuggestion {
    for (const stmt of statements) {
      if (stmt.includes('∨')) {
        const parts = stmt.split('∨').map((p) => p.trim());
        if (parts.length === 2) {
          const negatedFirst = statements.find((s) => s === `¬${parts[0]}`);
          const negatedSecond = statements.find((s) => s === `¬${parts[1]}`);

          if (negatedFirst) {
            return {
              suggestedStatement: parts[1] ?? 'Q',
              patternType: 'disjunctive-syllogism',
              confidence: 0.9,
              explanation: 'Complete disjunctive syllogism: if P∨Q and ¬P, then Q follows',
            };
          }

          if (negatedSecond) {
            return {
              suggestedStatement: parts[0] ?? 'P',
              patternType: 'disjunctive-syllogism',
              confidence: 0.9,
              explanation: 'Complete disjunctive syllogism: if P∨Q and ¬Q, then P follows',
            };
          }
        }
      }
    }

    return {
      suggestedStatement: 'Q',
      patternType: 'disjunctive-syllogism',
      confidence: 0.6,
      explanation: 'Add the remaining disjunct to complete disjunctive syllogism',
    };
  }

  private generateConjunctionSuggestion(statements: string[]): PatternCompletionSuggestion {
    if (statements.length >= 2) {
      return {
        suggestedStatement: statements.slice(0, 2).join(' ∧ '),
        patternType: 'conjunction',
        confidence: 0.8,
        explanation: 'Combine the statements with conjunction',
      };
    }

    return {
      suggestedStatement: 'P ∧ Q',
      patternType: 'conjunction',
      confidence: 0.5,
      explanation: 'Form a conjunction of the statements',
    };
  }

  private generateDisjunctionSuggestion(statements: string[]): PatternCompletionSuggestion {
    if (statements.length >= 2) {
      return {
        suggestedStatement: statements.slice(0, 2).join(' ∨ '),
        patternType: 'disjunction',
        confidence: 0.75,
        explanation: 'Form a disjunction to express alternatives',
      };
    }

    return {
      suggestedStatement: 'P ∨ Q',
      patternType: 'disjunction',
      confidence: 0.5,
      explanation: 'Form a disjunction of alternatives',
    };
  }

  private generateCustomPatternSuggestions(
    _statements: string[],
    _languagePackage: LanguagePackage,
  ): PatternCompletionSuggestion[] {
    const suggestions: PatternCompletionSuggestion[] = [];

    // Check for language-specific patterns
    // This would be extended with actual language package completion support

    return suggestions;
  }

  // Feature extraction methods
  private identifyInferencePatterns(
    statements: string[],
    _languagePackage: LanguagePackage,
  ): string[] {
    const patterns: string[] = [];

    if (this.looksLikeModusPonens(statements)) {
      patterns.push('modus-ponens');
    }
    if (this.looksLikeModusTollens(statements)) {
      patterns.push('modus-tollens');
    }
    if (this.looksLikeHypotheticalSyllogism(statements)) {
      patterns.push('hypothetical-syllogism');
    }
    if (this.looksLikeDisjunctiveSyllogism(statements)) {
      patterns.push('disjunctive-syllogism');
    }
    if (statements.some((s) => s.includes('∧'))) {
      patterns.push('conjunction');
    }
    if (statements.some((s) => s.includes('∨'))) {
      patterns.push('disjunction');
    }

    return patterns;
  }

  private calculatePatternDistribution(
    statements: string[],
    languagePackage: LanguagePackage,
  ): Record<string, number> {
    const patterns = this.identifyInferencePatterns(statements, languagePackage);
    const distribution: Record<string, number> = {};

    for (const pattern of patterns) {
      distribution[pattern] = (distribution[pattern] ?? 0) + 1;
    }

    // Normalize
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    if (total > 0) {
      for (const pattern in distribution) {
        const currentValue = distribution[pattern];
        if (currentValue !== undefined) {
          distribution[pattern] = currentValue / total;
        }
      }
    }

    return distribution;
  }

  private findDominantPattern(patternDistribution: Record<string, number>): string | null {
    if (Object.keys(patternDistribution).length === 0) {
      return null;
    }

    let maxFrequency = 0;
    let dominantPattern = null;

    for (const [pattern, frequency] of Object.entries(patternDistribution)) {
      if (frequency > maxFrequency) {
        maxFrequency = frequency;
        dominantPattern = pattern;
      }
    }

    return dominantPattern;
  }

  private calculateOverallComplexity(statements: string[]): number {
    const complexities = statements.map((s) => this.calculateStatementComplexity(s));
    return complexities.reduce((sum, c) => sum + c, 0);
  }

  private calculateStatementComplexity(statement: string): number {
    let complexity = 0;
    complexity += (statement.match(/[∧∨→↔¬]/g) ?? []).length;
    complexity += (statement.match(/[∀∃]/g) ?? []).length * 2;
    complexity += (statement.match(/[□◇]/g) ?? []).length * 1.5;
    complexity += (statement.match(/\(/g) ?? []).length * 0.5;
    return Math.round(complexity);
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

  private calculateStructuralMetrics(statements: string[]): StructuralMetrics {
    return {
      averageLength: statements.reduce((sum, s) => sum + s.length, 0) / statements.length,
      maxDepth: Math.max(...statements.map((s) => this.calculateParenthesesDepth(s))),
      totalConnectives: statements.reduce((sum, s) => sum + (s.match(/[∧∨→↔¬]/g) ?? []).length, 0),
      statementCount: statements.length,
    };
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

  private analyzeComplexityDistribution(statements: string[]): ComplexityDistribution {
    const complexities = statements.map((s) => this.calculateStatementComplexity(s));
    const total = complexities.length;

    if (total === 0) {
      return { low: 0, medium: 0, high: 0, average: 0 };
    }

    return {
      low: complexities.filter((c) => c <= 2).length / total,
      medium: complexities.filter((c) => c > 2 && c <= 5).length / total,
      high: complexities.filter((c) => c > 5).length / total,
      average: complexities.reduce((sum, c) => sum + c, 0) / total,
    };
  }
}
