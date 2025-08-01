import { err, ok, type Result } from 'neverthrow';
import { ValidationError } from '../shared/result.js';
import type { StrategyConfidence } from './StrategyConfidence.js';
import type { StrategyDifficulty } from './StrategyDifficulty.js';

export type StrategyType = 'direct' | 'contradiction' | 'cases' | 'induction' | 'construction';

export class ProofStrategy {
  private constructor(
    private readonly type: StrategyType,
    private readonly name: string,
    private readonly description: string,
    private readonly confidence: StrategyConfidence,
    private readonly difficulty: StrategyDifficulty,
    private readonly steps: readonly string[],
    private readonly applicableRules: readonly string[],
  ) {}

  static create(
    type: StrategyType,
    name: string,
    description: string,
    confidence: StrategyConfidence,
    difficulty: StrategyDifficulty,
    steps: string[],
    applicableRules: string[],
  ): Result<ProofStrategy, ValidationError> {
    if (!name || name.trim().length === 0) {
      return err(new ValidationError('Strategy name cannot be empty'));
    }

    if (!description || description.trim().length === 0) {
      return err(new ValidationError('Strategy description cannot be empty'));
    }

    if (steps.length === 0) {
      return err(new ValidationError('Strategy must have at least one step'));
    }

    if (applicableRules.length === 0) {
      return err(new ValidationError('Strategy must have at least one applicable rule'));
    }

    return ok(
      new ProofStrategy(
        type,
        name.trim(),
        description.trim(),
        confidence,
        difficulty,
        [...steps],
        [...applicableRules],
      ),
    );
  }

  static createDirectProof(
    confidence: StrategyConfidence,
    difficulty: StrategyDifficulty,
    steps: string[],
    applicableRules: string[],
  ): Result<ProofStrategy, ValidationError> {
    return ProofStrategy.create(
      'direct',
      'Direct Proof',
      'Proceed directly from premises to conclusion',
      confidence,
      difficulty,
      steps,
      applicableRules,
    );
  }

  static createContradictionProof(
    confidence: StrategyConfidence,
    difficulty: StrategyDifficulty,
    steps: string[],
    applicableRules: string[],
  ): Result<ProofStrategy, ValidationError> {
    return ProofStrategy.create(
      'contradiction',
      'Proof by Contradiction',
      'Assume negation of conclusion and derive contradiction',
      confidence,
      difficulty,
      steps,
      applicableRules,
    );
  }

  static createCasesProof(
    confidence: StrategyConfidence,
    difficulty: StrategyDifficulty,
    steps: string[],
    applicableRules: string[],
  ): Result<ProofStrategy, ValidationError> {
    return ProofStrategy.create(
      'cases',
      'Proof by Cases',
      'Break into exhaustive cases and prove each',
      confidence,
      difficulty,
      steps,
      applicableRules,
    );
  }

  static createInductionProof(
    confidence: StrategyConfidence,
    difficulty: StrategyDifficulty,
    steps: string[],
    applicableRules: string[],
  ): Result<ProofStrategy, ValidationError> {
    return ProofStrategy.create(
      'induction',
      'Mathematical Induction',
      'Prove base case and inductive step',
      confidence,
      difficulty,
      steps,
      applicableRules,
    );
  }

  getType(): StrategyType {
    return this.type;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getConfidence(): StrategyConfidence {
    return this.confidence;
  }

  getDifficulty(): StrategyDifficulty {
    return this.difficulty;
  }

  getSteps(): readonly string[] {
    return [...this.steps];
  }

  getApplicableRules(): readonly string[] {
    return [...this.applicableRules];
  }

  isViable(): boolean {
    return !this.confidence.isLow();
  }

  equals(other: ProofStrategy): boolean {
    return (
      this.type === other.type &&
      this.name === other.name &&
      this.confidence.equals(other.confidence) &&
      this.difficulty.equals(other.difficulty)
    );
  }
}
