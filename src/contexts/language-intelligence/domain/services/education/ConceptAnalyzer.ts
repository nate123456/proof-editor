import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationError } from '../../errors/DomainErrors';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ConceptDifficultyAnalysis {
  concepts: ConceptAnalysis[];
  overallDifficulty: LearningLevel;
  prerequisiteConcepts: string[];
  suggestedLearningPath: string[];
}

export interface ConceptAnalysis {
  name: string;
  difficulty: LearningLevel;
  prerequisites: string[];
  isSupported: boolean;
  estimatedLearningTimeMinutes: number;
}

@injectable()
export class ConceptAnalyzer {
  analyzeConceptDifficulty(
    concepts: string[],
    languagePackage: LanguagePackage,
  ): Result<ConceptDifficultyAnalysis, ValidationError> {
    try {
      const conceptAnalyses: ConceptAnalysis[] = [];
      let maxDifficulty: LearningLevel = 'beginner';

      // Analyze each concept
      for (const concept of concepts) {
        const analysis = this.analyzeIndividualConcept(concept, languagePackage);
        conceptAnalyses.push(analysis);

        // Update maximum difficulty
        if (
          analysis.difficulty === 'advanced' ||
          (analysis.difficulty === 'intermediate' && maxDifficulty === 'beginner')
        ) {
          maxDifficulty = analysis.difficulty;
        }
      }

      // Generate learning path
      const suggestedPath = this.generateLearningPath(conceptAnalyses);

      // Collect all prerequisites
      const allPrerequisites = Array.from(new Set(conceptAnalyses.flatMap((c) => c.prerequisites)));

      return ok({
        concepts: conceptAnalyses,
        overallDifficulty: maxDifficulty,
        prerequisiteConcepts: allPrerequisites,
        suggestedLearningPath: suggestedPath,
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to analyze concept difficulty',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private analyzeIndividualConcept(
    concept: string,
    languagePackage: LanguagePackage,
  ): ConceptAnalysis {
    let difficulty: LearningLevel = 'beginner';
    const prerequisites: string[] = [];
    let isSupported = true;

    // Determine difficulty and prerequisites based on concept
    switch (concept) {
      case 'conjunction':
      case 'disjunction':
      case 'negation':
        difficulty = 'beginner';
        break;

      case 'implication':
      case 'equivalence':
      case 'biconditional':
        difficulty = 'beginner';
        prerequisites.push('conjunction', 'disjunction');
        break;

      case 'truth-tables':
      case 'logical-equivalences':
        difficulty = 'beginner';
        prerequisites.push('logical-operators');
        break;

      case 'modus-ponens':
      case 'modus-tollens':
      case 'hypothetical-syllogism':
        difficulty = 'intermediate';
        prerequisites.push('implication');
        break;

      case 'disjunctive-syllogism':
      case 'constructive-dilemma':
        difficulty = 'intermediate';
        prerequisites.push('disjunction', 'implication');
        break;

      case 'proof-by-contradiction':
      case 'proof-by-contrapositive':
        difficulty = 'intermediate';
        prerequisites.push('negation', 'logical-inference');
        break;

      case 'natural-deduction':
      case 'formal-proofs':
        difficulty = 'intermediate';
        prerequisites.push('inference-rules');
        break;

      case 'modal-logic':
      case 'necessity':
      case 'possibility':
        difficulty = 'advanced';
        prerequisites.push('propositional-logic');
        isSupported = languagePackage.supportsModalLogic();
        break;

      case 'temporal-logic':
      case 'epistemic-logic':
      case 'deontic-logic':
        difficulty = 'advanced';
        prerequisites.push('modal-logic');
        isSupported = languagePackage.supportsModalLogic();
        break;

      case 'quantifiers':
      case 'universal-quantification':
      case 'existential-quantification':
        difficulty = 'intermediate';
        prerequisites.push('propositional-logic');
        isSupported = languagePackage.supportsFirstOrderLogic();
        break;

      case 'predicate-logic':
      case 'first-order-logic':
        difficulty = 'intermediate';
        prerequisites.push('quantifiers');
        isSupported = languagePackage.supportsFirstOrderLogic();
        break;

      case 'universal-instantiation':
      case 'existential-generalization':
      case 'universal-generalization':
      case 'existential-instantiation':
        difficulty = 'intermediate';
        prerequisites.push('quantifiers', 'predicate-logic');
        isSupported = languagePackage.supportsFirstOrderLogic();
        break;

      case 'nested-quantifiers':
      case 'variable-binding':
      case 'scope-resolution':
        difficulty = 'advanced';
        prerequisites.push('first-order-logic');
        isSupported = languagePackage.supportsFirstOrderLogic();
        break;

      case 'higher-order-logic':
      case 'lambda-calculus':
        difficulty = 'advanced';
        prerequisites.push('first-order-logic', 'function-types');
        isSupported = languagePackage.supportsFirstOrderLogic();
        break;

      case 'set-theory':
      case 'boolean-algebra':
        difficulty = 'intermediate';
        prerequisites.push('logical-operators');
        break;

      case 'proof-theory':
      case 'model-theory':
      case 'soundness-completeness':
        difficulty = 'advanced';
        prerequisites.push('formal-logic', 'mathematical-foundations');
        break;

      case 'recursive-definitions':
      case 'mathematical-induction':
        difficulty = 'intermediate';
        prerequisites.push('natural-numbers', 'logical-inference');
        break;

      case 'structural-induction':
      case 'well-founded-induction':
        difficulty = 'advanced';
        prerequisites.push('mathematical-induction', 'recursive-structures');
        break;

      default:
        // Unknown concept - make reasonable assumptions
        if (concept.includes('modal') || concept.includes('necessity')) {
          difficulty = 'advanced';
          prerequisites.push('propositional-logic');
          isSupported = languagePackage.supportsModalLogic();
        } else if (concept.includes('quantifier') || concept.includes('first-order')) {
          difficulty = 'intermediate';
          prerequisites.push('propositional-logic');
          isSupported = languagePackage.supportsFirstOrderLogic();
        } else {
          difficulty = 'intermediate';
          prerequisites.push('logical-basics');
        }
        break;
    }

    return {
      name: concept,
      difficulty,
      prerequisites,
      isSupported,
      estimatedLearningTimeMinutes: this.estimateConceptLearningTime(concept, difficulty),
    };
  }

  private estimateConceptLearningTime(concept: string, difficulty: LearningLevel): number {
    const baseTime = {
      beginner: 30,
      intermediate: 45,
      advanced: 60,
    };

    const complexityMultiplier: Record<string, number> = {
      'modal-logic': 1.5,
      'temporal-logic': 2.0,
      'higher-order-logic': 2.5,
      'nested-quantifiers': 1.8,
      'proof-theory': 2.2,
      'model-theory': 2.0,
      'structural-induction': 1.7,
      'variable-binding': 1.3,
      'scope-resolution': 1.4,
      'soundness-completeness': 2.5,
      'lambda-calculus': 2.3,
      'well-founded-induction': 1.9,
    };

    const multiplier = complexityMultiplier[concept] ?? 1.0;
    return Math.round(baseTime[difficulty] * multiplier);
  }

  private generateLearningPath(conceptAnalyses: ConceptAnalysis[]): string[] {
    // Create a dependency graph and perform topological sort
    const dependencyMap = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize maps
    for (const concept of conceptAnalyses) {
      dependencyMap.set(concept.name, concept.prerequisites);
      inDegree.set(concept.name, 0);
    }

    // Calculate in-degrees
    for (const concept of conceptAnalyses) {
      for (const prereq of concept.prerequisites) {
        if (inDegree.has(prereq)) {
          inDegree.set(prereq, (inDegree.get(prereq) ?? 0) + 1);
        }
      }
    }

    // Topological sort with difficulty ordering
    const result: string[] = [];
    const queue: string[] = [];

    // Start with concepts that have no prerequisites
    for (const [concept, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(concept);
      }
    }

    // Sort queue by difficulty (easier concepts first)
    queue.sort((a, b) => {
      const aDifficulty = conceptAnalyses.find((c) => c.name === a)?.difficulty ?? 'beginner';
      const bDifficulty = conceptAnalyses.find((c) => c.name === b)?.difficulty ?? 'beginner';
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      return difficultyOrder[aDifficulty] - difficultyOrder[bDifficulty];
    });

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      result.push(current);

      // Update dependencies
      for (const concept of conceptAnalyses) {
        if (concept.prerequisites.includes(current)) {
          const newDegree = (inDegree.get(concept.name) ?? 0) - 1;
          inDegree.set(concept.name, newDegree);

          if (newDegree === 0) {
            // Insert in correct position based on difficulty
            const conceptDifficulty = concept.difficulty;
            const insertIndex = this.findInsertionIndex(queue, conceptDifficulty, conceptAnalyses);
            queue.splice(insertIndex, 0, concept.name);
          }
        }
      }
    }

    // Handle any remaining concepts (cycles or missing dependencies)
    for (const concept of conceptAnalyses) {
      if (!result.includes(concept.name)) {
        result.push(concept.name);
      }
    }

    return result;
  }

  private findInsertionIndex(
    queue: string[],
    targetDifficulty: LearningLevel,
    conceptAnalyses: ConceptAnalysis[],
  ): number {
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    const targetOrder = difficultyOrder[targetDifficulty];

    for (let i = 0; i < queue.length; i++) {
      const queueItemDifficulty =
        conceptAnalyses.find((c) => c.name === queue[i])?.difficulty ?? 'beginner';
      const queueItemOrder = difficultyOrder[queueItemDifficulty];

      if (targetOrder <= queueItemOrder) {
        return i;
      }
    }

    return queue.length;
  }
}
