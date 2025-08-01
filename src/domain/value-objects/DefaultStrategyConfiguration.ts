import { err, ok, type Result } from 'neverthrow';
import type { ValidationError } from '../shared/result.js';
import { StrategyConfidence } from './StrategyConfidence.js';
import { StrategyConfiguration, type StrategyRule } from './StrategyConfiguration.js';
import { StrategyDifficulty } from './StrategyDifficulty.js';

export const createDefaultStrategyConfiguration = (): Result<
  StrategyConfiguration,
  ValidationError
> => {
  const rules: StrategyRule[] = [
    {
      name: 'Direct Proof',
      description: 'Proceed directly from premises to conclusion',
      confidence: StrategyConfidence.createHigh(),
      difficulty: StrategyDifficulty.createMedium(),
      steps: [
        'Start with given premises',
        'Apply logical rules step by step',
        'Derive the conclusion',
      ],
      applicableRules: ['modus-ponens', 'conjunction-elimination'],
      conditions: [{ type: 'always', scope: 'both' }],
    },
    {
      name: 'Proof by Contradiction',
      description: 'Assume negation of conclusion and derive contradiction',
      confidence: StrategyConfidence.createMedium(),
      difficulty: StrategyDifficulty.createMedium(),
      steps: [
        'Assume the negation of the conclusion',
        'Combine with the given premises',
        'Derive a contradiction',
        'Conclude the original statement',
      ],
      applicableRules: ['contradiction-introduction', 'negation-elimination'],
      conditions: [{ type: 'always', scope: 'both' }],
    },
    {
      name: 'Proof by Cases',
      description: 'Break into exhaustive cases and prove each',
      confidence: StrategyConfidence.createHigh(),
      difficulty: StrategyDifficulty.createMedium(),
      steps: [
        'Identify the relevant cases from disjunctive premises',
        'Prove the conclusion for each case separately',
        'Combine the results using disjunction elimination',
      ],
      applicableRules: ['disjunction-elimination', 'case-analysis'],
      conditions: [{ type: 'has_disjunction', scope: 'premises' }],
    },
    {
      name: 'Mathematical Induction',
      description: 'Prove base case and inductive step',
      confidence: StrategyConfidence.createHigh(),
      difficulty: StrategyDifficulty.createHard(),
      steps: [
        'Prove the base case (typically n = 0 or n = 1)',
        'Assume the statement holds for some arbitrary k',
        'Prove it holds for k + 1',
        'Conclude by mathematical induction',
      ],
      applicableRules: ['mathematical-induction', 'universal-generalization'],
      conditions: [{ type: 'has_quantifiers', scope: 'conclusion' }],
    },
  ];

  const result = StrategyConfiguration.create(
    rules,
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

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value);
};
