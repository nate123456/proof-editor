import { err, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import type { StatementContent } from '../shared/value-objects/index.js';
import { DefaultStrategyConfiguration } from '../value-objects/DefaultStrategyConfiguration.js';
import { ProofStrategy } from '../value-objects/ProofStrategy.js';
import {
  type ComplexityAssessment,
  StrategyAnalysisResult,
  type StructuralAnalysis,
} from '../value-objects/StrategyAnalysisResult.js';
import type { StrategyConfiguration } from '../value-objects/StrategyConfiguration.js';

export class ProofStrategyAnalysisService {
  private readonly configuration: StrategyConfiguration;

  constructor(configuration?: StrategyConfiguration) {
    this.configuration = configuration ?? DefaultStrategyConfiguration.create();
  }

  analyzeProofStrategies(
    premises: StatementContent[],
    conclusion: StatementContent,
  ): Result<StrategyAnalysisResult, ValidationError> {
    if (premises.length === 0) {
      return err(new ValidationError('Cannot analyze strategies for empty premises'));
    }

    const premiseTexts = premises.map((p) => p.getValue());
    const conclusionText = conclusion.getValue();

    const strategies: ProofStrategy[] = [];
    const configRules = this.configuration.getRules();

    for (const rule of configRules) {
      const isApplicable = rule.conditions.every((condition) =>
        this.configuration.evaluateCondition(condition, premiseTexts, conclusionText),
      );

      if (isApplicable) {
        const strategyResult = ProofStrategy.create(
          this.getStrategyType(rule.name),
          rule.name,
          rule.description,
          rule.confidence,
          rule.difficulty,
          rule.steps,
          rule.applicableRules,
        );

        if (strategyResult.isOk()) {
          strategies.push(strategyResult.value);
        }
      }
    }

    const sortedStrategies = strategies.sort(
      (a, b) => b.getConfidence().getValue() - a.getConfidence().getValue(),
    );

    const structuralAnalysis = this.analyzeLogicalStructure(premiseTexts, conclusionText);
    const complexityAssessment = this.assessProofComplexity(premiseTexts, conclusionText);
    const alternativeApproaches = this.suggestAlternativeApproaches(sortedStrategies);
    const prerequisiteChecks = this.identifyPrerequisites(sortedStrategies);

    return StrategyAnalysisResult.create(
      sortedStrategies,
      structuralAnalysis,
      complexityAssessment,
      alternativeApproaches,
      prerequisiteChecks,
    );
  }

  private getStrategyType(
    strategyName: string,
  ): 'direct' | 'contradiction' | 'cases' | 'induction' | 'construction' {
    switch (strategyName) {
      case 'Direct Proof':
        return 'direct';
      case 'Proof by Contradiction':
        return 'contradiction';
      case 'Proof by Cases':
        return 'cases';
      case 'Mathematical Induction':
        return 'induction';
      default:
        return 'construction';
    }
  }

  private analyzeLogicalStructure(premises: string[], conclusion: string): StructuralAnalysis {
    const allStatements = [...premises, conclusion];

    return {
      hasConditionals: allStatements.some((s) => s.includes('→')),
      hasNegations: allStatements.some((s) => s.includes('¬')),
      hasQuantifiers: allStatements.some((s) => /[∀∃]/.test(s)),
      hasModalOperators: allStatements.some((s) => /[□◇]/.test(s)),
      logicalComplexity: this.configuration.calculateComplexity(premises, conclusion),
      structureType: this.determineStructureType(premises, conclusion),
    };
  }

  private determineStructureType(premises: string[], conclusion: string): string {
    if (premises.some((p) => p.includes('∨'))) return 'disjunctive';
    if (premises.some((p) => p.includes('→'))) return 'conditional';
    if (conclusion.includes('∀') || conclusion.includes('∃')) return 'quantificational';
    return 'basic';
  }

  private assessProofComplexity(premises: string[], conclusion: string): ComplexityAssessment {
    const complexity = this.configuration.calculateComplexity(premises, conclusion);
    const level = this.configuration.getComplexityLevel(complexity);
    const thresholds = this.configuration.getComplexityThresholds();

    return {
      score: complexity,
      level,
      factors: ['Number of logical operators', 'Statement length', 'Nesting depth'],
      recommendations:
        complexity > thresholds.mediumThreshold ? ['Consider breaking into smaller steps'] : [],
    };
  }

  private suggestAlternativeApproaches(strategies: ProofStrategy[]): string[] {
    const alternatives: string[] = [];

    if (strategies.length > 1) {
      alternatives.push(
        'Multiple proof strategies are viable - choose based on your comfort level',
      );
    }

    if (strategies.some((s) => s.getName() === 'Direct Proof')) {
      alternatives.push('If direct proof seems difficult, consider proof by contradiction');
    }

    return alternatives;
  }

  private identifyPrerequisites(strategies: ProofStrategy[]): string[] {
    const prerequisites: string[] = [];

    for (const strategy of strategies) {
      if (strategy.getName() === 'Mathematical Induction') {
        prerequisites.push('Understanding of natural number properties');
      }

      if (strategy.getApplicableRules().some((rule) => rule.includes('modal'))) {
        prerequisites.push('Modal logic fundamentals');
      }
    }

    return Array.from(new Set(prerequisites));
  }
}
