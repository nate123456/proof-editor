import { err, ok, type Result } from 'neverthrow';
import type {
  ComplexityAssessment,
  LogicalStructureAnalysis,
  ProofStrategyRecommendation,
  ProofStrategyRecommendations,
  ProofViabilityAnalysis,
} from '../shared/analysis-types.js';
import { ValidationError } from '../shared/result.js';

export class ProofStrategyAnalysisService {
  analyzeProofStrategies(
    premises: string[],
    conclusion: string,
  ): Result<ProofStrategyRecommendations, ValidationError> {
    if (premises.length === 0) {
      return err(new ValidationError('Cannot analyze strategies for empty premises'));
    }

    if (!conclusion || conclusion.trim().length === 0) {
      return err(new ValidationError('Cannot analyze strategies for empty conclusion'));
    }

    const strategies: ProofStrategyRecommendation[] = [];

    const structure = this.analyzeLogicalStructure(premises, conclusion);

    const directProof = this.analyzeDirectProofViability(premises, conclusion);
    if (directProof.viable) {
      strategies.push({
        name: 'Direct Proof',
        description: 'Proceed directly from premises to conclusion',
        confidence: directProof.confidence,
        difficulty: directProof.difficulty,
        steps: directProof.steps,
        applicableRules: directProof.rules,
      });
    }

    const contradictionProof = this.analyzeContradictionProofViability(premises, conclusion);
    if (contradictionProof.viable) {
      strategies.push({
        name: 'Proof by Contradiction',
        description: 'Assume negation of conclusion and derive contradiction',
        confidence: contradictionProof.confidence,
        difficulty: contradictionProof.difficulty,
        steps: contradictionProof.steps,
        applicableRules: contradictionProof.rules,
      });
    }

    const casesProof = this.analyzeCasesProofViability(premises, conclusion);
    if (casesProof.viable) {
      strategies.push({
        name: 'Proof by Cases',
        description: 'Break into exhaustive cases and prove each',
        confidence: casesProof.confidence,
        difficulty: casesProof.difficulty,
        steps: casesProof.steps,
        applicableRules: casesProof.rules,
      });
    }

    if (this.isInductionApplicable(premises, conclusion)) {
      const inductionProof = this.analyzeInductionProofViability(premises, conclusion);
      if (inductionProof.viable) {
        strategies.push({
          name: 'Mathematical Induction',
          description: 'Prove base case and inductive step',
          confidence: inductionProof.confidence,
          difficulty: inductionProof.difficulty,
          steps: inductionProof.steps,
          applicableRules: inductionProof.rules,
        });
      }
    }

    strategies.sort((a, b) => b.confidence - a.confidence);

    return ok({
      recommendedStrategies: strategies,
      structuralAnalysis: structure,
      complexityAssessment: this.assessProofComplexity(premises, conclusion),
      alternativeApproaches: this.suggestAlternativeApproaches(strategies),
      prerequisiteChecks: this.identifyPrerequisites(strategies),
    });
  }

  analyzeLogicalStructure(premises: string[], conclusion: string): LogicalStructureAnalysis {
    return {
      hasConditionals: [...premises, conclusion].some((s) => s.includes('→')),
      hasNegations: [...premises, conclusion].some((s) => s.includes('¬')),
      hasQuantifiers: [...premises, conclusion].some((s) => /[∀∃]/.test(s)),
      hasModalOperators: [...premises, conclusion].some((s) => /[□◇]/.test(s)),
      logicalComplexity: this.calculateLogicalComplexity(premises, conclusion),
      structureType: this.determineStructureType(premises, conclusion),
    };
  }

  analyzeDirectProofViability(_premises: string[], _conclusion: string): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.8,
      difficulty: 'medium',
      steps: [
        'Start with given premises',
        'Apply logical rules step by step',
        'Derive the conclusion',
      ],
      rules: ['modus-ponens', 'conjunction-elimination'],
    };
  }

  private calculateLogicalComplexity(premises: string[], conclusion: string): number {
    const allStatements = [...premises, conclusion];
    const totalLength = allStatements.join('').length;
    const symbols = allStatements.join('').match(/[∀∃∧∨→↔¬□◇]/g) ?? [];
    return Math.round(totalLength * 0.1 + symbols.length * 2);
  }

  private determineStructureType(premises: string[], conclusion: string): string {
    if (premises.some((p) => p.includes('∨'))) return 'disjunctive';
    if (premises.some((p) => p.includes('→'))) return 'conditional';
    if (conclusion.includes('∀') || conclusion.includes('∃')) return 'quantificational';
    return 'basic';
  }

  private analyzeContradictionProofViability(
    _premises: string[],
    _conclusion: string,
  ): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.7,
      difficulty: 'medium',
      steps: [
        'Assume the negation of the conclusion',
        'Combine with the given premises',
        'Derive a contradiction',
        'Conclude the original statement',
      ],
      rules: ['contradiction-introduction', 'negation-elimination'],
    };
  }

  private analyzeCasesProofViability(
    premises: string[],
    _conclusion: string,
  ): ProofViabilityAnalysis {
    const hasDisjunction = premises.some((p) => p.includes('∨'));

    return {
      viable: hasDisjunction,
      confidence: hasDisjunction ? 0.85 : 0.2,
      difficulty: 'medium',
      steps: [
        'Identify the relevant cases from disjunctive premises',
        'Prove the conclusion for each case separately',
        'Combine the results using disjunction elimination',
      ],
      rules: ['disjunction-elimination', 'case-analysis'],
    };
  }

  private isInductionApplicable(_premises: string[], conclusion: string): boolean {
    return conclusion.includes('∀n') || conclusion.includes('all n');
  }

  private analyzeInductionProofViability(
    _premises: string[],
    _conclusion: string,
  ): ProofViabilityAnalysis {
    return {
      viable: true,
      confidence: 0.9,
      difficulty: 'hard',
      steps: [
        'Prove the base case (typically n = 0 or n = 1)',
        'Assume the statement holds for some arbitrary k',
        'Prove it holds for k + 1',
        'Conclude by mathematical induction',
      ],
      rules: ['mathematical-induction', 'universal-generalization'],
    };
  }

  private assessProofComplexity(premises: string[], conclusion: string): ComplexityAssessment {
    const complexity = this.calculateLogicalComplexity(premises, conclusion);

    return {
      score: complexity,
      level: complexity < 10 ? 'low' : complexity < 30 ? 'medium' : 'high',
      factors: ['Number of logical operators', 'Statement length', 'Nesting depth'],
      recommendations: complexity > 30 ? ['Consider breaking into smaller steps'] : [],
    };
  }

  private suggestAlternativeApproaches(strategies: ProofStrategyRecommendation[]): string[] {
    const alternatives: string[] = [];

    if (strategies.length > 1) {
      alternatives.push(
        'Multiple proof strategies are viable - choose based on your comfort level',
      );
    }

    if (strategies.some((s) => s.name === 'Direct Proof')) {
      alternatives.push('If direct proof seems difficult, consider proof by contradiction');
    }

    return alternatives;
  }

  private identifyPrerequisites(strategies: ProofStrategyRecommendation[]): string[] {
    const prerequisites: string[] = [];

    for (const strategy of strategies) {
      if (strategy.name === 'Mathematical Induction') {
        prerequisites.push('Understanding of natural number properties');
      }

      if (strategy.applicableRules.some((rule) => rule.includes('modal'))) {
        prerequisites.push('Modal logic fundamentals');
      }
    }

    return Array.from(new Set(prerequisites));
  }
}
