import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import type { ProofStrategy } from './ProofStrategy.js';

export interface StructuralAnalysis {
  readonly hasConditionals: boolean;
  readonly hasNegations: boolean;
  readonly hasQuantifiers: boolean;
  readonly hasModalOperators: boolean;
  readonly logicalComplexity: number;
  readonly structureType: string;
}

export interface ComplexityAssessment {
  readonly score: number;
  readonly level: 'low' | 'medium' | 'high';
  readonly factors: readonly string[];
  readonly recommendations: readonly string[];
}

export class StrategyAnalysisResult {
  private constructor(
    private readonly strategies: readonly ProofStrategy[],
    private readonly structuralAnalysis: StructuralAnalysis,
    private readonly complexityAssessment: ComplexityAssessment,
    private readonly alternativeApproaches: readonly string[],
    private readonly prerequisiteChecks: readonly string[],
  ) {}

  static create(
    strategies: ProofStrategy[],
    structuralAnalysis: StructuralAnalysis,
    complexityAssessment: ComplexityAssessment,
    alternativeApproaches: string[],
    prerequisiteChecks: string[],
  ): Result<StrategyAnalysisResult, ValidationError> {
    if (strategies.length === 0) {
      return err(new ValidationError('Strategy analysis must contain at least one strategy'));
    }

    if (complexityAssessment.score < 0) {
      return err(new ValidationError('Complexity score must be non-negative'));
    }

    return ok(
      new StrategyAnalysisResult(
        [...strategies],
        structuralAnalysis,
        complexityAssessment,
        [...alternativeApproaches],
        [...prerequisiteChecks],
      ),
    );
  }

  getStrategies(): readonly ProofStrategy[] {
    return [...this.strategies];
  }

  getViableStrategies(): readonly ProofStrategy[] {
    return this.strategies.filter((strategy) => strategy.isViable());
  }

  getBestStrategy(): ProofStrategy | undefined {
    const viable = this.getViableStrategies();
    if (viable.length === 0) return undefined;

    return viable.reduce((best, current) =>
      current.getConfidence().getValue() > best.getConfidence().getValue() ? current : best,
    );
  }

  getStructuralAnalysis(): StructuralAnalysis {
    return { ...this.structuralAnalysis };
  }

  getComplexityAssessment(): ComplexityAssessment {
    return {
      ...this.complexityAssessment,
      factors: [...this.complexityAssessment.factors],
      recommendations: [...this.complexityAssessment.recommendations],
    };
  }

  getAlternativeApproaches(): readonly string[] {
    return [...this.alternativeApproaches];
  }

  getPrerequisiteChecks(): readonly string[] {
    return [...this.prerequisiteChecks];
  }

  hasViableStrategies(): boolean {
    return this.getViableStrategies().length > 0;
  }

  isHighComplexity(): boolean {
    return this.complexityAssessment.level === 'high';
  }

  getStrategyCount(): number {
    return this.strategies.length;
  }

  getViableStrategyCount(): number {
    return this.getViableStrategies().length;
  }

  hasMultipleViableStrategies(): boolean {
    return this.getViableStrategyCount() > 1;
  }
}
