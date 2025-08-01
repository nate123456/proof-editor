import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { PatternRecognitionError } from '../../errors/DomainErrors';
import type {
  ArgumentComplexity,
  ArgumentFeatures,
  ArgumentStructure,
  ArgumentStructureAnalysis,
  DetailedArgumentStructureAnalysis,
} from '../PatternRecognitionService';

@injectable()
export class ArgumentStructureAnalyzer {
  analyzeArgumentStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
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
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  analyzeDetailedArgumentStructure(
    premises: string[],
    conclusion: string,
    languagePackage: LanguagePackage,
  ): Result<DetailedArgumentStructureAnalysis, PatternRecognitionError> {
    try {
      // Convert single conclusion to array for internal processing
      const conclusions = [conclusion];
      const patterns = this.matchInferenceRules(premises, conclusions, languagePackage);

      // Detect argument type
      const argumentType = this.detectArgumentType(premises, conclusion);
      const logicalForm = this.detectLogicalForms(premises, conclusion);

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
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private analyzeArgumentStructureInternal(
    premises: string[],
    conclusions: string[],
  ): ArgumentStructure {
    const type = this.determineArgumentType(premises, conclusions);
    const strength = this.calculateArgumentStrength(premises, conclusions);
    const isValid = this.checkBasicValidity(premises, conclusions);

    return {
      type,
      premiseCount: premises.length,
      conclusionCount: conclusions.length,
      isValid,
      strength,
    };
  }

  private determineArgumentType(premises: string[], conclusions: string[]): string {
    // Determine based on structure and content
    if (conclusions.length === 1) {
      const firstConclusion = conclusions[0];
      if (firstConclusion && this.isDeductiveStructure(premises, firstConclusion)) {
        return 'deductive';
      }
      if (firstConclusion && this.isInductiveStructure(premises, firstConclusion)) {
        return 'inductive';
      }
      if (firstConclusion && this.isAbductiveStructure(premises, firstConclusion)) {
        return 'abductive';
      }
    }

    return conclusions.length > 1 ? 'complex' : 'simple';
  }

  private detectArgumentType(premises: string[], conclusion: string): string {
    if (this.isDeductiveStructure(premises, conclusion)) {
      return 'deductive';
    }
    if (this.isInductiveStructure(premises, conclusion)) {
      return 'inductive';
    }
    if (this.isAbductiveStructure(premises, conclusion)) {
      return 'abductive';
    }
    return 'unknown';
  }

  private detectLogicalForms(premises: string[], conclusion: string): string[] {
    const forms: string[] = [];
    const allStatements = [...premises, conclusion];

    if (this.looksLikeModusPonens(allStatements)) {
      forms.push('modus ponens');
    }
    if (this.looksLikeModusTollens(allStatements)) {
      forms.push('modus tollens');
    }
    if (this.looksLikeHypotheticalSyllogism(allStatements)) {
      forms.push('hypothetical syllogism');
    }
    if (this.looksLikeDisjunctiveSyllogism(allStatements)) {
      forms.push('disjunctive syllogism');
    }
    if (this.looksLikeConstructiveDilemma(allStatements)) {
      forms.push('constructive dilemma');
    }

    return forms;
  }

  private isDeductiveStructure(premises: string[], conclusion: string): boolean {
    // Check for deductive indicators
    const hasLogicalConnectives = [...premises, conclusion].some(
      (s) => s.includes('→') || s.includes('∧') || s.includes('∨') || s.includes('¬'),
    );
    const hasQuantifiers = [...premises, conclusion].some((s) => /[∀∃]/.test(s));

    return hasLogicalConnectives || hasQuantifiers;
  }

  private isInductiveStructure(premises: string[], conclusion: string): boolean {
    // Check for inductive indicators
    const hasGeneralization = conclusion.includes('all') || conclusion.includes('every');
    const hasProbabilistic = conclusion.includes('probably') || conclusion.includes('likely');
    const hasMultipleExamples = premises.length > 2 && premises.some((p) => p.includes('example'));

    return hasGeneralization || hasProbabilistic || hasMultipleExamples;
  }

  private isAbductiveStructure(_premises: string[], conclusion: string): boolean {
    // Check for abductive indicators
    const hasExplanation = conclusion.includes('because') || conclusion.includes('explains');
    const hasBestExplanation = conclusion.includes('best') && conclusion.includes('explanation');

    return hasExplanation || hasBestExplanation;
  }

  private checkBasicValidity(premises: string[], conclusions: string[]): boolean {
    // Basic validity check - would need more sophisticated logic in reality
    return premises.length > 0 && conclusions.length > 0;
  }

  private calculateArgumentStrength(premises: string[], conclusions: string[]): number {
    // Calculate based on various factors
    const premiseLength = premises.join('').length;
    const conclusionLength = Array.isArray(conclusions)
      ? conclusions.join('').length
      : String(conclusions).length;

    // Consider premise-conclusion ratio
    const lengthRatio = Math.min(1, premiseLength / Math.max(conclusionLength, 1));

    // Consider logical structure
    const hasLogicalStructure = [...premises, ...conclusions].some((s) => /[∧∨→↔¬∀∃]/.test(s));
    const structureBonus = hasLogicalStructure ? 0.2 : 0;

    // Consider premise count
    const premiseCountFactor = Math.min(1, premises.length / 3);

    return Math.min(1, lengthRatio * 0.5 + structureBonus + premiseCountFactor * 0.3);
  }

  private matchInferenceRules(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
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
      iSound: matchingRules.length > 0, // Simplified - would need semantic analysis
    };
  }

  private calculateArgumentComplexity(
    premises: string[],
    conclusions: string[],
  ): ArgumentComplexity {
    const allStatements = [...premises, ...conclusions];
    const totalLength = allStatements.join('').length;
    const logicalSymbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) ?? [];

    const score = Math.round(totalLength * 0.1 + logicalSymbols.length * 2);
    const level = this.categorizeComplexity(totalLength, logicalSymbols.length);

    return {
      score,
      level,
      factors: {
        statementCount: allStatements.length,
        averageLength: totalLength / allStatements.length,
        logicalSymbolCount: logicalSymbols.length,
      },
    };
  }

  private categorizeComplexity(
    totalLength: number,
    symbolCount: number,
  ): 'low' | 'medium' | 'high' {
    const complexityScore = totalLength * 0.1 + symbolCount * 2;
    if (complexityScore < 10) return 'low';
    if (complexityScore < 30) return 'medium';
    return 'high';
  }

  private extractArgumentFeatures(premises: string[], conclusions: string[]): ArgumentFeatures {
    const allStatements = [...premises, ...conclusions];

    return {
      hasConditionals: allStatements.some((s) => s.includes('→')),
      hasNegations: allStatements.some((s) => s.includes('¬')),
      hasQuantifiers: allStatements.some((s) => /[∀∃]/.test(s)),
      hasModalOperators: allStatements.some((s) => /[□◇]/.test(s)),
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
    patterns: { matchingRules: string[]; isValid: boolean; iSound: boolean },
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

    if (structure.premiseCount === 0) {
      suggestions.push('Add premises to support your conclusion');
    }

    if (patterns.matchingRules.length === 0) {
      suggestions.push('Consider using established inference rules to strengthen the argument');
    }

    return suggestions;
  }

  private analyzeDependencies(premises: string[], conclusion: string): string[] {
    const dependencies: string[] = [];

    // Simple dependency analysis - look for shared terms
    const conclusionTerms = this.extractAtomicPropositions(conclusion);

    for (const premise of premises) {
      const premiseTerms = this.extractAtomicPropositions(premise);
      if (premiseTerms.some((term) => conclusionTerms.includes(term))) {
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

      // Check if premise depends on conclusion
      if (conclusion.includes(premise) && premise.includes(conclusion)) return true;
    }

    return false;
  }

  private extractAssumptions(premises: string[]): string[] {
    // Extract implicit assumptions - statements that are atomic and not derived
    return premises.filter(
      (p) => !p.includes('→') && !p.includes('∧') && !p.includes('∨') && !p.includes('↔'),
    );
  }

  private extractAtomicPropositions(statement: string): string[] {
    // Extract single capital letters that represent atomic propositions
    const matches = statement.match(/[A-Z]/g) ?? [];
    return Array.from(new Set(matches));
  }

  // Pattern detection methods
  private looksLikeModusPonens(statements: string[]): boolean {
    // Check if we have P, P→Q, Q pattern
    if (statements.length < 3) return false;

    for (let i = 0; i < statements.length - 2; i++) {
      const stmt1 = statements[i];
      const stmt2 = statements[i + 1];
      const stmt3 = statements[i + 2];

      if (stmt1 && stmt2 && stmt3 && stmt2.includes('→')) {
        const parts = stmt2.split('→').map((p) => p.trim());
        if (parts.length === 2 && parts[0] === stmt1 && parts[1] === stmt3) {
          return true;
        }
      }
    }

    return false;
  }

  private looksLikeModusTollens(statements: string[]): boolean {
    // Check for P→Q, ¬Q, ¬P pattern
    if (statements.length < 3) return false;

    for (const stmt of statements) {
      if (stmt.includes('→')) {
        const parts = stmt.split('→').map((p) => p.trim());
        if (parts.length === 2) {
          const negatedConsequent = `¬${parts[1]}`;
          const negatedAntecedent = `¬${parts[0]}`;

          if (statements.includes(negatedConsequent) && statements.includes(negatedAntecedent)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private looksLikeHypotheticalSyllogism(statements: string[]): boolean {
    // Check for P→Q, Q→R, P→R pattern
    const implications = statements.filter((s) => s.includes('→'));
    if (implications.length < 2) return false;

    for (const impl1 of implications) {
      for (const impl2 of implications) {
        if (impl1 !== impl2) {
          const parts1 = impl1.split('→').map((p) => p.trim());
          const parts2 = impl2.split('→').map((p) => p.trim());

          if (parts1.length === 2 && parts2.length === 2 && parts1[1] === parts2[0]) {
            const expectedConclusion = `${parts1[0]} → ${parts2[1]}`;
            if (statements.some((s) => s.trim() === expectedConclusion)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private looksLikeDisjunctiveSyllogism(statements: string[]): boolean {
    // Check for P∨Q, ¬P, Q pattern
    for (const stmt of statements) {
      if (stmt.includes('∨')) {
        const parts = stmt.split('∨').map((p) => p.trim());
        if (parts.length === 2) {
          const negatedFirst = `¬${parts[0]}`;
          const negatedSecond = `¬${parts[1]}`;

          if (statements.includes(negatedFirst) && parts[1] && statements.includes(parts[1])) {
            return true;
          }
          if (statements.includes(negatedSecond) && parts[0] && statements.includes(parts[0])) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private looksLikeConstructiveDilemma(statements: string[]): boolean {
    // Check for (P→Q)∧(R→S), P∨R, Q∨S pattern
    const hasConjunctionOfImplications = statements.some((s) => s.includes('∧') && s.includes('→'));
    const hasDisjunction = statements.filter((s) => s.includes('∨')).length >= 2;

    return hasConjunctionOfImplications && hasDisjunction;
  }
}
