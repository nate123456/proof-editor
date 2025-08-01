import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationError } from '../../errors/DomainErrors';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface StepByStepGuidance {
  steps: GuidanceStep[];
  targetConcepts: string[];
  difficultyLevel: LearningLevel;
  estimatedTimeMinutes: number;
  prerequisites: string[];
  nextSteps: string[];
  practiceExercises: string[];
}

export interface GuidanceStep {
  title: string;
  description: string;
  examples: string[];
  concepts: string[];
  estimatedTime: number;
}

interface StatementComplexity {
  hasNestedStructure: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  complexityScore: number;
  mainConnectives: string[];
}

@injectable()
export class StepByStepGuidanceProvider {
  generateStepByStepGuidance(
    statement: string,
    targetConcepts: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<StepByStepGuidance, ValidationError> {
    try {
      const steps: GuidanceStep[] = [];

      // Analyze the statement complexity
      const complexity = this.analyzeStatementComplexity(statement, languagePackage);

      // Add initial understanding step
      steps.push(
        this.createStep(
          'Understand the statement',
          'Start by reading the statement carefully and identifying its main components',
          [`Statement: "${statement}"`, 'Identify the main logical structure'],
          ['comprehension', 'analysis'],
          3,
        ),
      );

      // Break down into logical steps based on complexity
      if (complexity.hasNestedStructure) {
        steps.push(
          this.createStep(
            'Break down nested structures',
            'Start by identifying the main logical structure and work from inside out',
            [
              `For "${statement}", identify the main connective`,
              'Work from innermost parentheses outward',
            ],
            ['logical-structure', 'parsing'],
            5,
          ),
        );
      }

      if (complexity.hasQuantifiers && languagePackage.supportsFirstOrderLogic()) {
        steps.push(
          this.createStep(
            'Handle quantifiers',
            'Identify the scope and binding of quantifiers',
            ['∀x means "for all x"', '∃x means "there exists an x"', 'Determine variable scope'],
            ['quantifiers', 'variable-binding'],
            7,
          ),
        );
      }

      if (complexity.hasModalOperators && languagePackage.supportsModalLogic()) {
        steps.push(
          this.createStep(
            'Interpret modal operators',
            'Understand necessity (□) and possibility (◇) operators',
            ['□P means "P is necessarily true"', '◇P means "P is possibly true"'],
            ['modal-logic', 'necessity', 'possibility'],
            6,
          ),
        );
      }

      // Add steps for main connectives
      if (complexity.mainConnectives.length > 0) {
        steps.push(
          this.createStep(
            'Analyze main connectives',
            'Understand how the main logical connectives structure the statement',
            complexity.mainConnectives.map((conn) => this.getConnectiveExample(conn)),
            ['connectives', 'logical-structure'],
            4,
          ),
        );
      }

      // Add concept-specific steps
      for (const concept of targetConcepts) {
        const conceptStep = this.createConceptStep(concept, userLevel, languagePackage);
        if (conceptStep) {
          steps.push(conceptStep);
        }
      }

      // Add verification step
      steps.push(
        this.createStep(
          'Verify your understanding',
          'Check that your interpretation matches the intended meaning',
          [
            'Read the statement aloud in natural language',
            'Verify all symbols are interpreted correctly',
            'Check that the logical structure makes sense',
          ],
          ['verification', 'comprehension'],
          4,
        ),
      );

      // Add practice step if appropriate
      if (userLevel === 'beginner' || complexity.complexityScore > 15) {
        steps.push(
          this.createStep(
            'Practice similar examples',
            'Apply your understanding to related problems',
            [
              'Try simpler versions of the same pattern',
              'Practice with similar logical structures',
              'Build confidence with repetition',
            ],
            ['practice', 'reinforcement'],
            10,
          ),
        );
      }

      return ok({
        steps,
        targetConcepts,
        difficultyLevel: userLevel,
        estimatedTimeMinutes: this.estimateGuidanceTime(steps, userLevel),
        prerequisites: this.identifyPrerequisites(targetConcepts, languagePackage),
        nextSteps: this.suggestNextSteps(targetConcepts, userLevel),
        practiceExercises: this.generatePracticeExercises(targetConcepts, userLevel),
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate step-by-step guidance',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private analyzeStatementComplexity(
    statement: string,
    languagePackage: LanguagePackage,
  ): StatementComplexity {
    return {
      hasNestedStructure: (statement.match(/\(/g) ?? []).length > 1,
      hasQuantifiers: /[∀∃]/.test(statement) && languagePackage.supportsFirstOrderLogic(),
      hasModalOperators: /[□◇]/.test(statement) && languagePackage.supportsModalLogic(),
      complexityScore: this.calculateComplexityScore(statement),
      mainConnectives: this.identifyMainConnectives(statement),
    };
  }

  private calculateComplexityScore(statement: string): number {
    let score = statement.length * 0.1;
    score += (statement.match(/[∀∃∧∨→↔¬□◇]/g) ?? []).length * 2;
    score += (statement.match(/\(/g) ?? []).length * 1.5;
    score += (statement.match(/[A-Z][a-z]*/g) ?? []).length * 0.5; // Predicates
    return Math.round(score);
  }

  private identifyMainConnectives(statement: string): string[] {
    const connectives: string[] = [];
    const matches = statement.match(/[∧∨→↔]/g);
    if (matches) {
      connectives.push(...matches);
    }
    return Array.from(new Set(connectives));
  }

  private getConnectiveExample(connective: string): string {
    switch (connective) {
      case '∧':
        return 'P ∧ Q means "P and Q" (both must be true)';
      case '∨':
        return 'P ∨ Q means "P or Q" (at least one must be true)';
      case '→':
        return 'P → Q means "if P then Q" (implication)';
      case '↔':
        return 'P ↔ Q means "P if and only if Q" (biconditional)';
      default:
        return `${connective} is a logical connective`;
    }
  }

  private createStep(
    title: string,
    description: string,
    examples: string[],
    concepts: string[],
    estimatedTime: number,
  ): GuidanceStep {
    return {
      title,
      description,
      examples,
      concepts,
      estimatedTime,
    };
  }

  private createConceptStep(
    concept: string,
    userLevel: LearningLevel,
    languagePackage: LanguagePackage,
  ): GuidanceStep | null {
    switch (concept) {
      case 'modus-ponens':
        return this.createStep(
          'Apply modus ponens',
          'Use the modus ponens inference rule: from P and P→Q, conclude Q',
          [
            'Identify premises of the form P and P→Q',
            'Conclude Q follows logically',
            'Example: "It rains" and "If it rains, then the ground is wet" → "The ground is wet"',
          ],
          ['modus-ponens', 'inference-rules'],
          userLevel === 'beginner' ? 8 : 5,
        );

      case 'modus-tollens':
        return this.createStep(
          'Apply modus tollens',
          'Use modus tollens: from ¬Q and P→Q, conclude ¬P',
          [
            'Identify premises of the form ¬Q and P→Q',
            'Conclude ¬P follows logically',
            'Example: "The ground is not wet" and "If it rains, then the ground is wet" → "It does not rain"',
          ],
          ['modus-tollens', 'inference-rules'],
          userLevel === 'beginner' ? 10 : 6,
        );

      case 'proof-by-contradiction':
        return this.createStep(
          'Set up proof by contradiction',
          'Assume the negation of what you want to prove and derive a contradiction',
          [
            'Assume ¬(conclusion)',
            'Combine with given premises',
            'Derive a contradiction (P ∧ ¬P)',
            'Conclude the original statement must be true',
          ],
          ['proof-by-contradiction', 'indirect-proof'],
          userLevel === 'beginner' ? 15 : 10,
        );

      case 'universal-instantiation':
        if (languagePackage.supportsFirstOrderLogic()) {
          return this.createStep(
            'Apply universal instantiation',
            'From ∀x P(x), conclude P(a) for any specific individual a',
            [
              'Start with universal statement ∀x P(x)',
              'Choose specific individual a',
              'Conclude P(a)',
              'Example: ∀x Human(x) → Mortal(x), Human(Socrates) → Mortal(Socrates)',
            ],
            ['universal-instantiation', 'quantifiers'],
            userLevel === 'beginner' ? 12 : 8,
          );
        }
        break;

      case 'existential-generalization':
        if (languagePackage.supportsFirstOrderLogic()) {
          return this.createStep(
            'Apply existential generalization',
            'From P(a) for some individual a, conclude ∃x P(x)',
            [
              'Start with statement about specific individual P(a)',
              'Generalize to existential statement ∃x P(x)',
              'Example: Happy(John) → ∃x Happy(x)',
            ],
            ['existential-generalization', 'quantifiers'],
            userLevel === 'beginner' ? 10 : 7,
          );
        }
        break;

      case 'modal-reasoning':
        if (languagePackage.supportsModalLogic()) {
          return this.createStep(
            'Apply modal reasoning',
            'Work with necessity and possibility operators',
            [
              '□P means P is necessarily true',
              '◇P means P is possibly true',
              '□P → ◇P (necessity implies possibility)',
              'Consider different possible worlds',
            ],
            ['modal-logic', 'necessity', 'possibility'],
            userLevel === 'beginner' ? 15 : 12,
          );
        }
        break;
    }

    return null;
  }

  private estimateGuidanceTime(steps: GuidanceStep[], userLevel: LearningLevel): number {
    const multiplier = { beginner: 1.5, intermediate: 1.0, advanced: 0.7 };
    return Math.round(
      steps.reduce((total, step) => total + step.estimatedTime, 0) * multiplier[userLevel],
    );
  }

  private identifyPrerequisites(concepts: string[], languagePackage: LanguagePackage): string[] {
    const prerequisites: string[] = [];

    for (const concept of concepts) {
      switch (concept) {
        case 'modal-logic':
          prerequisites.push('propositional-logic');
          break;
        case 'quantifiers':
          prerequisites.push('predicate-logic', 'variable-binding');
          break;
        case 'modus-ponens':
        case 'modus-tollens':
          prerequisites.push('implication', 'logical-operators');
          break;
        case 'proof-by-contradiction':
          prerequisites.push('negation', 'logical-inference');
          break;
        case 'universal-instantiation':
        case 'existential-generalization':
          if (languagePackage.supportsFirstOrderLogic()) {
            prerequisites.push('quantifiers', 'predicate-logic');
          }
          break;
      }
    }

    return Array.from(new Set(prerequisites));
  }

  private suggestNextSteps(concepts: string[], userLevel: LearningLevel): string[] {
    const nextSteps: string[] = [];

    if (concepts.includes('propositional-logic') && userLevel !== 'beginner') {
      nextSteps.push('Explore modal logic extensions');
      nextSteps.push('Study more complex inference rules');
    }

    if (concepts.includes('modal-logic') && userLevel === 'advanced') {
      nextSteps.push('Study temporal logic');
      nextSteps.push('Explore epistemic logic');
    }

    if (concepts.includes('modus-ponens') && userLevel !== 'advanced') {
      nextSteps.push('Learn modus tollens');
      nextSteps.push('Practice chain reasoning');
    }

    if (concepts.includes('quantifiers') && userLevel !== 'beginner') {
      nextSteps.push('Study nested quantifiers');
      nextSteps.push('Explore higher-order logic');
    }

    // Add general progression suggestions
    if (nextSteps.length === 0) {
      nextSteps.push('Practice with more complex examples');
      nextSteps.push('Explore related logical concepts');
    }

    return nextSteps;
  }

  private generatePracticeExercises(concepts: string[], userLevel: LearningLevel): string[] {
    const exercises: string[] = [];

    for (const concept of concepts) {
      switch (concept) {
        case 'logical-inference':
          if (userLevel === 'beginner') {
            exercises.push('Practice identifying modus ponens patterns');
            exercises.push('Work through simple syllogisms');
          } else {
            exercises.push('Construct complex inference chains');
            exercises.push('Identify fallacious reasoning patterns');
          }
          break;
        case 'modal-logic':
          exercises.push('Translate modal statements between □ and ◇');
          exercises.push('Analyze necessity and possibility relationships');
          break;
        case 'quantifiers':
          exercises.push('Practice scope determination for nested quantifiers');
          exercises.push('Convert between natural language and logical notation');
          break;
        case 'proof-by-contradiction':
          exercises.push('Identify suitable candidates for indirect proof');
          exercises.push('Practice deriving contradictions');
          break;
      }
    }

    // Add general exercises if none were specific
    if (exercises.length === 0) {
      exercises.push('Work through structured practice problems');
      exercises.push('Apply concepts to new scenarios');
    }

    return exercises;
  }
}
