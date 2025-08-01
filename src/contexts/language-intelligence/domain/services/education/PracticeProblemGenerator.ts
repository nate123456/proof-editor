import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationError } from '../../errors/DomainErrors';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PracticeProblems {
  problems: PracticeProblem[];
  targetConcepts: string[];
  difficultyLevel: LearningLevel;
  estimatedTimeMinutes: number;
}

export interface PracticeProblem {
  statement: string;
  solution: string;
  hints: string[];
  concepts: string[];
  difficulty: LearningLevel;
}

@injectable()
export class PracticeProblemGenerator {
  suggestPracticeProblems(
    concepts: string[],
    userLevel: LearningLevel,
    languagePackage: LanguagePackage,
    maxProblems = 10,
  ): Result<PracticeProblems, ValidationError> {
    try {
      const problems: PracticeProblem[] = [];

      // Generate problems based on concepts and difficulty
      for (const concept of concepts) {
        const conceptProblems = this.generateProblemsForConcept(
          concept,
          userLevel,
          languagePackage,
        );
        problems.push(...conceptProblems);
      }

      // Add mixed-concept problems for intermediate and advanced users
      if (userLevel !== 'beginner' && concepts.length > 1) {
        const mixedProblems = this.generateMixedConceptProblems(
          concepts,
          userLevel,
          languagePackage,
        );
        problems.push(...mixedProblems);
      }

      // Limit to maxProblems and sort by relevance
      const selectedProblems = this.selectBestProblems(problems, maxProblems, userLevel);

      return ok({
        problems: selectedProblems,
        targetConcepts: concepts,
        difficultyLevel: userLevel,
        estimatedTimeMinutes: this.estimateTotalTime(selectedProblems, userLevel),
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to suggest practice problems',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private generateProblemsForConcept(
    concept: string,
    difficultyLevel: LearningLevel,
    languagePackage: LanguagePackage,
  ): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    switch (concept) {
      case 'conjunction':
        problems.push(...this.generateConjunctionProblems(difficultyLevel));
        break;
      case 'disjunction':
        problems.push(...this.generateDisjunctionProblems(difficultyLevel));
        break;
      case 'implication':
        problems.push(...this.generateImplicationProblems(difficultyLevel));
        break;
      case 'negation':
        problems.push(...this.generateNegationProblems(difficultyLevel));
        break;
      case 'modal-logic':
        if (languagePackage.supportsModalLogic()) {
          problems.push(...this.generateModalLogicProblems(difficultyLevel));
        }
        break;
      case 'quantifiers':
      case 'first-order-logic':
        if (languagePackage.supportsFirstOrderLogic()) {
          problems.push(...this.generateQuantifierProblems(difficultyLevel));
        }
        break;
      case 'modus-ponens':
        problems.push(...this.generateModusPonensProblems(difficultyLevel));
        break;
      case 'modus-tollens':
        problems.push(...this.generateModusTollensProblems(difficultyLevel));
        break;
      case 'proof-by-contradiction':
        problems.push(...this.generateContradictionProblems(difficultyLevel));
        break;
      default:
        // Generic problem for unknown concepts
        problems.push(this.generateGenericProblem(concept, difficultyLevel));
        break;
    }

    return problems;
  }

  private generateConjunctionProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    if (difficultyLevel === 'beginner') {
      problems.push({
        statement: 'Show that (P ∧ Q) ∧ R is equivalent to P ∧ (Q ∧ R)',
        solution: 'Use truth tables or the associativity property of conjunction',
        hints: ['Consider truth tables for both expressions', 'Conjunction is associative'],
        concepts: ['conjunction', 'associativity'],
        difficulty: difficultyLevel,
      });
    } else {
      problems.push({
        statement: 'Prove: (P ∧ Q) → (P ∨ Q)',
        solution: 'If both P and Q are true, then at least one is true',
        hints: ['Consider what conjunction means', 'Disjunction requires only one to be true'],
        concepts: ['conjunction', 'disjunction', 'implication'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateDisjunctionProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    problems.push({
      statement: 'Show that P ∨ ¬P is always true',
      solution: 'This is the law of excluded middle - P is either true or false',
      hints: ['Consider all possible truth values for P', 'This is a tautology'],
      concepts: ['disjunction', 'negation', 'tautology'],
      difficulty: difficultyLevel,
    });

    if (difficultyLevel !== 'beginner') {
      problems.push({
        statement: 'Prove: (P ∨ Q) ∧ (¬P ∨ R) → (Q ∨ R)',
        solution: 'Use case analysis on P being true or false',
        hints: ['Consider two cases: P is true, P is false', 'Apply disjunction elimination'],
        concepts: ['disjunction', 'case-analysis', 'logical-inference'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateImplicationProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    if (difficultyLevel === 'beginner') {
      problems.push({
        statement: 'Show that P → Q is equivalent to ¬P ∨ Q',
        solution: 'Use truth tables to verify both expressions have identical truth values',
        hints: ['Make truth tables for both expressions', 'Compare row by row'],
        concepts: ['implication', 'disjunction', 'negation', 'equivalence'],
        difficulty: difficultyLevel,
      });
    } else {
      problems.push({
        statement: 'Prove: ((P → Q) ∧ (Q → R)) → (P → R)',
        solution: 'This is hypothetical syllogism - chain the implications',
        hints: ['Assume P → Q and Q → R', 'Show P → R follows', 'Use transitivity'],
        concepts: ['implication', 'hypothetical-syllogism', 'transitivity'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateNegationProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    problems.push({
      statement: 'Show that ¬¬P is equivalent to P',
      solution: 'Double negation elimination - negating twice returns to original',
      hints: ['Consider what happens when you negate P twice', 'Use truth tables if needed'],
      concepts: ['negation', 'double-negation', 'equivalence'],
      difficulty: difficultyLevel,
    });

    if (difficultyLevel !== 'beginner') {
      problems.push({
        statement: "Prove De Morgan's law: ¬(P ∧ Q) ↔ (¬P ∨ ¬Q)",
        solution: 'Show both directions using truth tables or logical equivalences',
        hints: ['Prove both → and ← directions', 'Use truth tables for verification'],
        concepts: ['negation', 'de-morgans-laws', 'biconditional'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateModalLogicProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    problems.push({
      statement: 'Prove: □P → ◇P (necessity implies possibility)',
      solution: 'If P is necessarily true, it must be possible',
      hints: ['Necessity is stronger than possibility', 'All necessary truths are possible'],
      concepts: ['modal-logic', 'necessity', 'possibility'],
      difficulty: difficultyLevel,
    });

    if (difficultyLevel === 'advanced') {
      problems.push({
        statement: 'Show that □(P → Q) → (□P → □Q) (K axiom)',
        solution: 'This is the distribution axiom for necessity over implication',
        hints: [
          'Consider what happens in all possible worlds',
          'If P→Q is necessary and P is necessary, then Q must be necessary',
        ],
        concepts: ['modal-logic', 'necessity', 'k-axiom', 'distribution'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateQuantifierProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    if (difficultyLevel === 'beginner') {
      problems.push({
        statement: 'Translate: "All birds can fly" into logical notation',
        solution: '∀x (Bird(x) → CanFly(x))',
        hints: [
          'Use universal quantifier for "all"',
          'Structure as implication: if bird, then can fly',
        ],
        concepts: ['quantifiers', 'universal-quantification', 'translation'],
        difficulty: difficultyLevel,
      });
    } else {
      problems.push({
        statement: 'Prove: ∀x P(x) → ∃x P(x) (assuming domain is non-empty)',
        solution: 'If P holds for all x, then there exists an x for which P holds',
        hints: [
          'Use universal instantiation',
          'Apply existential generalization',
          'Requires non-empty domain',
        ],
        concepts: ['quantifiers', 'universal-instantiation', 'existential-generalization'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateModusPonensProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    problems.push({
      statement: 'Given: "If it rains, the ground gets wet" and "It is raining". What follows?',
      solution: 'The ground gets wet (by modus ponens)',
      hints: ['This is the pattern: P, P → Q, therefore Q', 'Apply modus ponens rule'],
      concepts: ['modus-ponens', 'inference-rules'],
      difficulty: difficultyLevel,
    });

    if (difficultyLevel !== 'beginner') {
      problems.push({
        statement: 'Use modus ponens to prove Q from: P, P → (R → Q), R',
        solution: 'From P and P → (R → Q), get R → Q. From R and R → Q, get Q.',
        hints: ['Apply modus ponens twice', 'First get R → Q, then get Q', 'Chain the inferences'],
        concepts: ['modus-ponens', 'chained-inference', 'nested-implications'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateModusTollensProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    problems.push({
      statement:
        'Given: "If it rains, the ground gets wet" and "The ground is not wet". What follows?',
      solution: 'It is not raining (by modus tollens)',
      hints: ['This is the pattern: ¬Q, P → Q, therefore ¬P', 'Apply modus tollens rule'],
      concepts: ['modus-tollens', 'inference-rules'],
      difficulty: difficultyLevel,
    });

    return problems;
  }

  private generateContradictionProblems(difficultyLevel: LearningLevel): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    if (difficultyLevel === 'beginner') {
      problems.push({
        statement: 'Prove that √2 is irrational using proof by contradiction',
        solution: 'Assume √2 is rational, derive that both p and q are even (contradiction)',
        hints: [
          'Assume √2 = p/q in lowest terms',
          'Square both sides and manipulate',
          'Show both p and q must be even',
        ],
        concepts: ['proof-by-contradiction', 'irrationality'],
        difficulty: difficultyLevel,
      });
    } else {
      problems.push({
        statement: 'Use contradiction to prove: If n² is even, then n is even',
        solution: 'Assume n is odd, show n² is odd, contradicting that n² is even',
        hints: [
          'Assume n is odd: n = 2k + 1',
          "Calculate n² and show it's odd",
          'This contradicts n² being even',
        ],
        concepts: ['proof-by-contradiction', 'parity', 'number-theory'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateMixedConceptProblems(
    concepts: string[],
    difficultyLevel: LearningLevel,
    languagePackage: LanguagePackage,
  ): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    // Generate problems that combine multiple concepts
    if (concepts.includes('conjunction') && concepts.includes('disjunction')) {
      problems.push({
        statement: 'Prove: (P ∧ Q) ∨ (P ∧ R) ↔ P ∧ (Q ∨ R)',
        solution: 'Factor out P using distributivity of ∧ over ∨',
        hints: [
          'Use distributive laws',
          'Show both directions of the biconditional',
          'Factor P from the left side',
        ],
        concepts: ['conjunction', 'disjunction', 'distributivity'],
        difficulty: difficultyLevel,
      });
    }

    if (concepts.includes('implication') && concepts.includes('negation')) {
      problems.push({
        statement: 'Prove: (P → Q) ↔ (¬Q → ¬P)',
        solution: 'This is the contrapositive equivalence',
        hints: [
          'Show both directions',
          'Use the definition of implication as ¬P ∨ Q',
          'Apply logical equivalences',
        ],
        concepts: ['implication', 'negation', 'contrapositive'],
        difficulty: difficultyLevel,
      });
    }

    if (
      concepts.includes('quantifiers') &&
      concepts.includes('modal-logic') &&
      languagePackage.supportsModalLogic() &&
      languagePackage.supportsFirstOrderLogic()
    ) {
      problems.push({
        statement: 'Compare: ∀x □P(x) vs □∀x P(x)',
        solution:
          "The first is stronger: for each x, P(x) is necessary vs it's necessary that P holds for all x",
        hints: [
          'Consider the scope of quantifier vs modal operator',
          'Think about different possible worlds',
          'The first implies the second, but not vice versa',
        ],
        concepts: ['quantifiers', 'modal-logic', 'scope', 'barcan-formula'],
        difficulty: difficultyLevel,
      });
    }

    return problems;
  }

  private generateGenericProblem(concept: string, difficultyLevel: LearningLevel): PracticeProblem {
    return {
      statement: `Practice problem for ${concept}`,
      solution: `Solution involves understanding ${concept}`,
      hints: [`Review the definition of ${concept}`, `Apply the principles of ${concept}`],
      concepts: [concept],
      difficulty: difficultyLevel,
    };
  }

  private selectBestProblems(
    problems: PracticeProblem[],
    maxProblems: number,
    userLevel: LearningLevel,
  ): PracticeProblem[] {
    // Sort by difficulty match and concept diversity
    const sorted = problems.sort((a, b) => {
      // Prefer problems matching user level
      const aDifficultyMatch = a.difficulty === userLevel ? 1 : 0;
      const bDifficultyMatch = b.difficulty === userLevel ? 1 : 0;

      if (aDifficultyMatch !== bDifficultyMatch) {
        return bDifficultyMatch - aDifficultyMatch;
      }

      // Prefer problems with more concepts (more comprehensive)
      return b.concepts.length - a.concepts.length;
    });

    return sorted.slice(0, maxProblems);
  }

  private estimateTotalTime(problems: PracticeProblem[], userLevel: LearningLevel): number {
    const baseTimePerProblem = {
      beginner: 8,
      intermediate: 12,
      advanced: 15,
    };

    const totalMinutes = problems.length * baseTimePerProblem[userLevel];

    // Add time for mixed-concept problems
    const mixedConceptProblems = problems.filter((p) => p.concepts.length > 2);
    const additionalTime = mixedConceptProblems.length * 5;

    return totalMinutes + additionalTime;
  }
}
