import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import type { StrategyConfidence } from './StrategyConfidence.js';
import type { StrategyDifficulty } from './StrategyDifficulty.js';

export interface StrategyRule {
  readonly name: string;
  readonly description: string;
  readonly confidence: StrategyConfidence;
  readonly difficulty: StrategyDifficulty;
  readonly steps: readonly string[];
  readonly applicableRules: readonly string[];
  readonly conditions: readonly StrategyCondition[];
}

export interface StrategyCondition {
  readonly type:
    | 'has_disjunction'
    | 'has_quantifiers'
    | 'has_conditionals'
    | 'has_negations'
    | 'always'
    | 'never';
  readonly scope: 'premises' | 'conclusion' | 'both';
  readonly pattern?: string;
}

export interface ComplexityThresholds {
  readonly lowThreshold: number;
  readonly mediumThreshold: number;
  readonly highThreshold: number;
}

export interface StrategyWeights {
  readonly lengthWeight: number;
  readonly symbolWeight: number;
  readonly nestingWeight: number;
}

export class StrategyConfiguration {
  private constructor(
    private readonly rules: readonly StrategyRule[],
    private readonly complexityThresholds: ComplexityThresholds,
    private readonly strategyWeights: StrategyWeights,
    private readonly logicalSymbols: readonly string[],
  ) {}

  static create(
    rules: StrategyRule[],
    complexityThresholds: ComplexityThresholds,
    strategyWeights: StrategyWeights,
    logicalSymbols: string[],
  ): Result<StrategyConfiguration, ValidationError> {
    if (rules.length === 0) {
      return err(new ValidationError('Strategy configuration must have at least one rule'));
    }

    if (complexityThresholds.lowThreshold >= complexityThresholds.mediumThreshold) {
      return err(new ValidationError('Low threshold must be less than medium threshold'));
    }

    if (complexityThresholds.mediumThreshold >= complexityThresholds.highThreshold) {
      return err(new ValidationError('Medium threshold must be less than high threshold'));
    }

    if (
      strategyWeights.lengthWeight < 0 ||
      strategyWeights.symbolWeight < 0 ||
      strategyWeights.nestingWeight < 0
    ) {
      return err(new ValidationError('Strategy weights must be non-negative'));
    }

    return ok(
      new StrategyConfiguration([...rules], complexityThresholds, strategyWeights, [
        ...logicalSymbols,
      ]),
    );
  }

  static createDefault(): StrategyConfiguration {
    return new StrategyConfiguration(
      [],
      {
        lowThreshold: 10,
        mediumThreshold: 30,
        highThreshold: 50,
      },
      {
        lengthWeight: 0.1,
        symbolWeight: 2,
        nestingWeight: 3,
      },
      ['∀', '∃', '∧', '∨', '→', '↔', '¬', '□', '◇'],
    );
  }

  getRules(): readonly StrategyRule[] {
    return [...this.rules];
  }

  getComplexityThresholds(): ComplexityThresholds {
    return { ...this.complexityThresholds };
  }

  getStrategyWeights(): StrategyWeights {
    return { ...this.strategyWeights };
  }

  getLogicalSymbols(): readonly string[] {
    return [...this.logicalSymbols];
  }

  evaluateCondition(condition: StrategyCondition, premises: string[], conclusion: string): boolean {
    const targets = this.getTargetTexts(condition.scope, premises, conclusion);

    switch (condition.type) {
      case 'has_disjunction':
        return targets.some((text) => text.includes('∨'));
      case 'has_quantifiers':
        return targets.some((text) => /[∀∃]/.test(text));
      case 'has_conditionals':
        return targets.some((text) => text.includes('→'));
      case 'has_negations':
        return targets.some((text) => text.includes('¬'));
      case 'always':
        return true;
      case 'never':
        return false;
      default:
        return false;
    }
  }

  private getTargetTexts(
    scope: 'premises' | 'conclusion' | 'both',
    premises: string[],
    conclusion: string,
  ): string[] {
    switch (scope) {
      case 'premises':
        return premises;
      case 'conclusion':
        return [conclusion];
      case 'both':
        return [...premises, conclusion];
    }
  }

  calculateComplexity(premises: string[], conclusion: string): number {
    const allTexts = [...premises, conclusion];
    const totalLength = allTexts.join('').length;
    const symbolCount =
      allTexts.join('').match(new RegExp(`[${this.logicalSymbols.join('')}]`, 'g'))?.length ?? 0;

    return Math.round(
      totalLength * this.strategyWeights.lengthWeight +
        symbolCount * this.strategyWeights.symbolWeight,
    );
  }

  getComplexityLevel(complexity: number): 'low' | 'medium' | 'high' {
    if (complexity < this.complexityThresholds.lowThreshold) return 'low';
    if (complexity < this.complexityThresholds.mediumThreshold) return 'medium';
    return 'high';
  }
}
