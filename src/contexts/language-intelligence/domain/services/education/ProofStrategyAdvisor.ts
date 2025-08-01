import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationError } from '../../errors/DomainErrors';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ProofStrategySuggestions {
  strategies: ProofStrategy[];
  insights: string[];
  commonMistakes: string[];
  practiceProblems: string[];
}

export interface ProofStrategy {
  name: string;
  description: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  applicability: number;
}

interface ProofAnalysis {
  isDirectProofPossible: boolean;
  isContradictionProofSuitable: boolean;
  isCaseAnalysisNeeded: boolean;
  isInductionApplicable: boolean;
  complexity: number;
  requiredRules: string[];
  structuralPatterns: string[];
}

@injectable()
export class ProofStrategyAdvisor {
  generateProofStrategySuggestions(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<ProofStrategySuggestions, ValidationError> {
    try {
      const strategies: ProofStrategy[] = [];

      // Analyze proof structure
      const analysis = this.analyzeProofStructure(premises, conclusions, languagePackage);

      // Suggest appropriate proof techniques based on analysis
      if (analysis.isDirectProofPossible) {
        strategies.push({
          name: 'Direct Proof',
          description: 'Proceed directly from premises to conclusion using logical rules',
          steps: [
            'Start with the given premises',
            'Apply logical rules step by step',
            'Use inference rules like modus ponens, universal instantiation',
            'Arrive at the conclusion',
          ],
          difficulty: 'easy',
          applicability: this.calculateDirectProofApplicability(analysis),
        });
      }

      if (analysis.isContradictionProofSuitable) {
        strategies.push({
          name: 'Proof by Contradiction',
          description: 'Assume the negation of the conclusion and derive a contradiction',
          steps: [
            'Assume the negation of what you want to prove',
            'Combine with the given premises',
            'Apply logical rules to derive consequences',
            'Derive a contradiction (P ∧ ¬P)',
            'Conclude the original statement must be true',
          ],
          difficulty: userLevel === 'beginner' ? 'medium' : 'easy',
          applicability: this.calculateContradictionApplicability(analysis),
        });
      }

      if (analysis.isCaseAnalysisNeeded) {
        strategies.push({
          name: 'Case Analysis',
          description: 'Break the proof into exhaustive cases',
          steps: [
            'Identify the relevant cases (usually from disjunctions)',
            'Prove the conclusion for each case separately',
            'Ensure all cases are exhaustive and mutually exclusive',
            'Combine the results using disjunction elimination',
          ],
          difficulty: 'medium',
          applicability: this.calculateCaseAnalysisApplicability(analysis),
        });
      }

      if (analysis.isInductionApplicable) {
        strategies.push({
          name: 'Mathematical Induction',
          description: 'Use induction for statements about natural numbers',
          steps: [
            'Prove the base case (usually n = 0 or n = 1)',
            'Assume the induction hypothesis for n = k',
            'Prove the statement for n = k + 1',
            'Conclude by the principle of mathematical induction',
          ],
          difficulty: 'medium',
          applicability: this.calculateInductionApplicability(analysis, languagePackage),
        });
      }

      // Add language-specific strategies
      if (languagePackage.supportsModalLogic()) {
        strategies.push(...this.getModalLogicStrategies(analysis, userLevel));
      }

      if (languagePackage.supportsFirstOrderLogic()) {
        strategies.push(...this.getFirstOrderStrategies(analysis, userLevel));
      }

      // Add educational insights
      const insights = this.generateProofInsights(analysis, userLevel);

      return ok({
        strategies: strategies.sort((a, b) => b.applicability - a.applicability),
        insights,
        commonMistakes: this.identifyCommonMistakes(analysis, userLevel),
        practiceProblems: this.suggestSimilarProblems(analysis, languagePackage),
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate proof strategy suggestions',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private analyzeProofStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
  ): ProofAnalysis {
    const structuralPatterns = this.identifyStructuralPatterns(premises, conclusions);

    return {
      isDirectProofPossible: this.assessDirectProofViability(premises, conclusions),
      isContradictionProofSuitable: this.assessContradictionSuitability(premises, conclusions),
      isCaseAnalysisNeeded: this.assessCaseAnalysisNeed(premises, conclusions),
      isInductionApplicable: this.assessInductionApplicability(
        premises,
        conclusions,
        languagePackage,
      ),
      complexity: this.calculateProofComplexity(premises, conclusions),
      requiredRules: this.identifyRequiredRules(premises, conclusions, languagePackage),
      structuralPatterns,
    };
  }

  private identifyStructuralPatterns(premises: string[], conclusions: string[]): string[] {
    const patterns: string[] = [];
    const allStatements = [...premises, ...conclusions];

    // Check for quantifier patterns
    if (allStatements.some((s) => /∀.*→/.test(s))) {
      patterns.push('universal-conditional');
    }
    if (allStatements.some((s) => /∃.*∧/.test(s))) {
      patterns.push('existential-conjunction');
    }

    // Check for modal patterns
    if (allStatements.some((s) => /□.*→/.test(s))) {
      patterns.push('necessity-implication');
    }
    if (allStatements.some((s) => /◇.*∨/.test(s))) {
      patterns.push('possibility-disjunction');
    }

    // Check for biconditional patterns
    if (allStatements.some((s) => s.includes('↔'))) {
      patterns.push('biconditional');
    }

    // Check for negation patterns
    if (allStatements.some((s) => s.includes('¬'))) {
      patterns.push('negation-involved');
    }

    return patterns;
  }

  private assessDirectProofViability(_premises: string[], conclusions: string[]): boolean {
    // Direct proof is generally viable unless the conclusion is a negation
    // or the premises don't seem to lead directly to the conclusion
    return conclusions.length === 1 && !conclusions[0].startsWith('¬');
  }

  private assessContradictionSuitability(_premises: string[], conclusions: string[]): boolean {
    // Contradiction is suitable for negations, impossibility statements,
    // or when direct proof seems difficult
    return (
      conclusions.some((c) => c.includes('¬')) ||
      conclusions.some((c) => c.includes('impossible')) ||
      conclusions.length === 1
    );
  }

  private assessCaseAnalysisNeed(premises: string[], conclusions: string[]): boolean {
    // Case analysis is needed when premises contain disjunctions
    return premises.some((p) => p.includes('∨')) || conclusions.some((c) => c.includes('∨'));
  }

  private assessInductionApplicability(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
  ): boolean {
    // Induction is applicable for statements about natural numbers
    // This is a simplified check - in practice, would need more sophisticated analysis
    return (
      languagePackage.supportsFirstOrderLogic() &&
      [...premises, ...conclusions].some(
        (s) => s.includes('n') || s.includes('N') || s.includes('∀n'),
      )
    );
  }

  private calculateProofComplexity(premises: string[], conclusions: string[]): number {
    const totalLength = [...premises, ...conclusions].join('').length;
    const logicalSymbols = [...premises, ...conclusions].join('').match(/[∀∃∧∨→↔¬□◇]/g) ?? [];
    const quantifierDepth = this.calculateQuantifierDepth([...premises, ...conclusions]);

    return Math.round(totalLength * 0.1 + logicalSymbols.length * 2 + quantifierDepth * 3);
  }

  private calculateQuantifierDepth(statements: string[]): number {
    let maxDepth = 0;
    for (const statement of statements) {
      const depth = (statement.match(/[∀∃]/g) ?? []).length;
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  private identifyRequiredRules(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
  ): string[] {
    const rules: string[] = [];

    // Check for modus ponens pattern
    if (premises.some((p) => p.includes('→')) && conclusions.some((c) => !c.includes('→'))) {
      rules.push('modus-ponens');
    }

    // Check for universal instantiation
    if (premises.some((p) => p.includes('∀')) && languagePackage.supportsFirstOrderLogic()) {
      rules.push('universal-instantiation');
    }

    // Check for existential generalization
    if (conclusions.some((c) => c.includes('∃')) && languagePackage.supportsFirstOrderLogic()) {
      rules.push('existential-generalization');
    }

    // Check for conjunction elimination
    if (premises.some((p) => p.includes('∧'))) {
      rules.push('conjunction-elimination');
    }

    // Check for disjunction introduction
    if (conclusions.some((c) => c.includes('∨'))) {
      rules.push('disjunction-introduction');
    }

    // Check for modal rules
    if (languagePackage.supportsModalLogic()) {
      if (premises.some((p) => p.includes('□')) || conclusions.some((c) => c.includes('□'))) {
        rules.push('necessity-rules');
      }
      if (premises.some((p) => p.includes('◇')) || conclusions.some((c) => c.includes('◇'))) {
        rules.push('possibility-rules');
      }
    }

    return rules;
  }

  private calculateDirectProofApplicability(analysis: ProofAnalysis): number {
    let score = 0.8; // Base score for direct proof

    if (analysis.complexity > 20) score -= 0.2;
    if (analysis.structuralPatterns.includes('negation-involved')) score -= 0.1;
    if (analysis.requiredRules.length <= 3) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private calculateContradictionApplicability(analysis: ProofAnalysis): number {
    let score = 0.6; // Base score for contradiction

    if (analysis.structuralPatterns.includes('negation-involved')) score += 0.2;
    if (analysis.complexity > 15) score += 0.1;
    if (analysis.isDirectProofPossible) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private calculateCaseAnalysisApplicability(analysis: ProofAnalysis): number {
    let score = analysis.isCaseAnalysisNeeded ? 0.8 : 0.3;

    if (analysis.structuralPatterns.includes('universal-conditional')) score += 0.1;
    if (analysis.complexity > 25) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private calculateInductionApplicability(
    analysis: ProofAnalysis,
    languagePackage: LanguagePackage,
  ): number {
    if (!languagePackage.supportsFirstOrderLogic()) return 0;

    let score = analysis.isInductionApplicable ? 0.7 : 0.1;

    if (analysis.structuralPatterns.includes('universal-conditional')) score += 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private getModalLogicStrategies(
    analysis: ProofAnalysis,
    userLevel: LearningLevel,
  ): ProofStrategy[] {
    const strategies: ProofStrategy[] = [];

    if (analysis.structuralPatterns.includes('necessity-implication')) {
      strategies.push({
        name: 'Modal Necessity Rules',
        description: 'Apply rules for necessity operator (□)',
        steps: [
          'Identify necessity statements □P',
          'Apply necessitation rule if needed',
          'Use □P → ◇P (necessity implies possibility)',
          'Apply distribution rules for □ over →',
        ],
        difficulty: userLevel === 'beginner' ? 'hard' : 'medium',
        applicability: 0.6,
      });
    }

    if (analysis.structuralPatterns.includes('possibility-disjunction')) {
      strategies.push({
        name: 'Modal Possibility Rules',
        description: 'Apply rules for possibility operator (◇)',
        steps: [
          'Identify possibility statements ◇P',
          'Use ◇(P ∨ Q) ↔ (◇P ∨ ◇Q) equivalence',
          'Apply possibility introduction rules',
          'Consider different possible worlds',
        ],
        difficulty: userLevel === 'beginner' ? 'hard' : 'medium',
        applicability: 0.5,
      });
    }

    return strategies;
  }

  private getFirstOrderStrategies(
    analysis: ProofAnalysis,
    userLevel: LearningLevel,
  ): ProofStrategy[] {
    const strategies: ProofStrategy[] = [];

    if (analysis.structuralPatterns.includes('universal-conditional')) {
      strategies.push({
        name: 'Universal Instantiation Strategy',
        description: 'Use universal instantiation to work with specific instances',
        steps: [
          'Identify universal statements ∀x P(x)',
          'Choose appropriate terms for instantiation',
          'Apply universal instantiation rule',
          'Work with specific instances',
          'Generalize if needed',
        ],
        difficulty: userLevel === 'beginner' ? 'medium' : 'easy',
        applicability: 0.7,
      });
    }

    if (analysis.structuralPatterns.includes('existential-conjunction')) {
      strategies.push({
        name: 'Existential Instantiation Strategy',
        description: 'Handle existential statements with proper instantiation',
        steps: [
          'Identify existential statements ∃x P(x)',
          'Introduce new constant for existential instantiation',
          'Apply existential instantiation rule',
          'Work with the instantiated form',
          'Ensure proper scope of the new constant',
        ],
        difficulty: 'medium',
        applicability: 0.6,
      });
    }

    return strategies;
  }

  private generateProofInsights(analysis: ProofAnalysis, userLevel: LearningLevel): string[] {
    const insights: string[] = [];

    if (analysis.complexity > 20 && userLevel === 'beginner') {
      insights.push('This proof is quite complex - consider breaking it into smaller lemmas');
    }

    if (analysis.isCaseAnalysisNeeded) {
      insights.push('This proof involves disjunctions - case analysis might be helpful');
    }

    if (analysis.isDirectProofPossible) {
      insights.push('A direct proof approach should work well for this argument');
    }

    if (analysis.requiredRules.length > 4) {
      insights.push('This proof requires multiple inference rules - plan your strategy carefully');
    }

    if (analysis.structuralPatterns.includes('biconditional')) {
      insights.push(
        'Biconditionals require proving both directions - consider splitting the proof',
      );
    }

    if (analysis.structuralPatterns.includes('negation-involved')) {
      insights.push('Negations are present - consider proof by contradiction');
    }

    if (analysis.requiredRules.length > 0) {
      insights.push(`This proof may benefit from using: ${analysis.requiredRules.join(', ')}`);
    }

    // Always provide at least one insight
    if (insights.length === 0) {
      insights.push('Consider the logical structure and identify the key reasoning steps');
      insights.push('Look for patterns that match common inference rules');
    }

    return insights;
  }

  private identifyCommonMistakes(analysis: ProofAnalysis, userLevel: LearningLevel): string[] {
    const mistakes: string[] = [];

    if (analysis.isContradictionProofSuitable) {
      mistakes.push('Remember to assume the negation of what you want to prove');
      mistakes.push('Ensure the contradiction is actually derived, not just stated');
    }

    if (analysis.isCaseAnalysisNeeded) {
      mistakes.push('Make sure all cases are exhaustive and mutually exclusive');
      mistakes.push('Prove the conclusion for each case separately');
    }

    if (analysis.structuralPatterns.includes('universal-conditional')) {
      mistakes.push('Be careful with universal instantiation - choose appropriate terms');
      mistakes.push('Ensure proper variable binding in quantified statements');
    }

    if (userLevel === 'beginner') {
      mistakes.push('Make sure each step follows logically from the previous ones');
      mistakes.push('Clearly state which inference rule you are using');
    }

    if (analysis.complexity > 15) {
      mistakes.push('Avoid skipping steps in complex proofs');
      mistakes.push('Double-check logical connections between statements');
    }

    return mistakes;
  }

  private suggestSimilarProblems(
    analysis: ProofAnalysis,
    languagePackage: LanguagePackage,
  ): string[] {
    const problems: string[] = [];

    if (analysis.requiredRules.includes('modus-ponens')) {
      problems.push('Practice more modus ponens exercises');
      problems.push('Try chain reasoning problems');
    }

    if (analysis.requiredRules.includes('universal-instantiation')) {
      problems.push('Work on quantifier manipulation exercises');
      problems.push('Practice with nested quantifier problems');
    }

    if (analysis.isContradictionProofSuitable) {
      problems.push('Try more proof by contradiction exercises');
      problems.push('Practice identifying when indirect proof is appropriate');
    }

    if (languagePackage.supportsModalLogic()) {
      problems.push('Explore modal logic proof exercises');
      problems.push('Practice with necessity and possibility statements');
    }

    if (analysis.structuralPatterns.includes('biconditional')) {
      problems.push('Practice proving biconditional statements');
      problems.push('Work on equivalence proof exercises');
    }

    // Add general suggestions if none were specific
    if (problems.length === 0) {
      problems.push('Practice similar logical structure problems');
      problems.push('Try problems with comparable complexity');
    }

    return problems;
  }
}
