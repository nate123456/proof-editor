import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { Diagnostic } from '../../entities/Diagnostic';
import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationError } from '../../errors/DomainErrors';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningHints {
  hints: string[];
  examples: string[];
  concepts: string[];
  resources: string[];
  difficultyLevel: LearningLevel;
  estimatedLearningTime: number;
}

interface HintGeneration {
  hints: string[];
  examples: string[];
  concepts: string[];
}

@injectable()
export class LearningHintGenerator {
  private readonly maxHintsPerDiagnostic = 3;
  private readonly maxExamplesPerConcept = 2;

  generateLearningHints(
    diagnostic: Diagnostic,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<LearningHints, ValidationError> {
    try {
      const hints: string[] = [];
      const examples: string[] = [];
      const concepts: string[] = [];
      const resources: string[] = [];

      // Generate hints based on diagnostic type
      if (diagnostic.isSyntaxRelated()) {
        const syntaxHints = this.generateSyntaxHints(diagnostic, languagePackage, userLevel);
        hints.push(...syntaxHints.hints);
        examples.push(...syntaxHints.examples);
        concepts.push(...syntaxHints.concepts);
      }

      if (diagnostic.isSemanticRelated()) {
        const semanticHints = this.generateSemanticHints(diagnostic, languagePackage, userLevel);
        hints.push(...semanticHints.hints);
        examples.push(...semanticHints.examples);
        concepts.push(...semanticHints.concepts);
      }

      if (diagnostic.isStyleRelated()) {
        const styleHints = this.generateStyleHints(diagnostic, languagePackage, userLevel);
        hints.push(...styleHints.hints);
        examples.push(...styleHints.examples);
      }

      // Add general learning resources
      resources.push(...this.getRelevantResources(concepts, languagePackage));

      return ok({
        hints: hints.slice(0, this.maxHintsPerDiagnostic),
        examples: examples.slice(0, this.maxExamplesPerConcept),
        concepts,
        resources,
        difficultyLevel: userLevel,
        estimatedLearningTime: this.estimateLearningTime(concepts, userLevel),
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate learning hints',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private generateSyntaxHints(
    diagnostic: Diagnostic,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel,
  ): HintGeneration {
    const hints: string[] = [];
    const examples: string[] = [];
    const concepts: string[] = [];

    let message = '';
    try {
      message = diagnostic.getMessage().getText().toLowerCase();
    } catch {
      // Handle cases where diagnostic doesn't have proper message structure
      message = '';
    }

    if (message.includes('parentheses')) {
      hints.push('Check that every opening parenthesis "(" has a matching closing parenthesis ")"');
      concepts.push('parentheses-balancing');

      if (userLevel === 'beginner') {
        hints.push('Count the opening and closing parentheses - they should be equal');
        examples.push('Correct: (P ∧ Q) → R', 'Incorrect: (P ∧ Q → R');
      }
    }

    if (message.includes('symbol')) {
      hints.push('Make sure you are using the correct logical symbols for this language package');
      concepts.push('logical-symbols');

      const symbols = Array.from(languagePackage.getSymbols().entries());
      if (symbols.length > 0) {
        examples.push(
          `Available symbols: ${symbols.map(([name, symbol]) => `${symbol} (${name})`).join(', ')}`,
        );
      }
    }

    if (message.includes('bracket')) {
      hints.push('Check bracket matching and proper nesting');
      concepts.push('bracket-matching');

      if (userLevel === 'beginner') {
        hints.push('Each opening bracket [ needs a closing bracket ]');
        examples.push('Correct: [P ∧ Q] → R', 'Incorrect: [P ∧ Q → R');
      }
    }

    if (message.includes('token') || message.includes('unexpected')) {
      hints.push('Check for unexpected characters or missing operators');
      concepts.push('token-recognition');

      if (userLevel === 'beginner') {
        hints.push('Look for typos in logical symbols or missing connectives');
        examples.push('Correct: P ∧ Q', 'Incorrect: P  Q (missing operator)');
      }
    }

    // Add default syntax hints if no specific patterns found
    if (hints.length === 0) {
      hints.push('Check your syntax for proper logical structure');
      concepts.push('syntax-basics');
      examples.push('Basic format: Premise 1, Premise 2, therefore Conclusion');
    }

    return { hints, examples, concepts };
  }

  private generateSemanticHints(
    diagnostic: Diagnostic,
    _languagePackage: LanguagePackage,
    userLevel: LearningLevel,
  ): HintGeneration {
    const hints: string[] = [];
    const examples: string[] = [];
    const concepts: string[] = [];

    let message = '';
    try {
      message = diagnostic.getMessage().getText().toLowerCase();
    } catch {
      // Handle cases where diagnostic doesn't have proper message structure
      message = '';
    }

    if (message.includes('inference')) {
      hints.push('Check that your conclusion logically follows from the premises');
      concepts.push('logical-inference');

      if (userLevel !== 'advanced') {
        hints.push('Try to identify which inference rule applies to your argument');
        examples.push('Modus Ponens: P, P → Q, therefore Q');
      }
    }

    if (message.includes('tautology')) {
      hints.push('This statement is always true - consider if this is what you intended');
      concepts.push('tautology');
      examples.push('Example tautology: P ∨ ¬P (always true regardless of P)');
    }

    if (message.includes('contradiction')) {
      hints.push('This statement is always false - check for logical errors');
      concepts.push('contradiction');
      examples.push('Example contradiction: P ∧ ¬P (always false)');
    }

    if (message.includes('circular')) {
      hints.push('Avoid circular reasoning - the conclusion cannot be used to prove itself');
      concepts.push('circular-reasoning');
      examples.push('Invalid: P is true because P is true');
    }

    if (message.includes('scope')) {
      hints.push('Check variable scope and quantifier binding');
      concepts.push('variable-scope');
      examples.push('∀x(P(x) → Q(x)) - x is bound by the universal quantifier');
    }

    // Add default semantic hints if no specific patterns found
    if (hints.length === 0) {
      hints.push('Review the logical structure of your argument');
      hints.push('Ensure premises logically support the conclusion');
      concepts.push('logical-reasoning');
      examples.push('Valid argument: All A are B, X is A, therefore X is B');
    }

    return { hints, examples, concepts };
  }

  private generateStyleHints(
    diagnostic: Diagnostic,
    _languagePackage: LanguagePackage,
    _userLevel: LearningLevel,
  ): HintGeneration {
    const hints: string[] = [];
    const examples: string[] = [];
    const concepts: string[] = ['style', 'readability'];

    let message = '';
    try {
      message = diagnostic.getMessage().getText().toLowerCase();
    } catch {
      // Handle cases where diagnostic doesn't have proper message structure
      message = '';
    }

    if (message.includes('length')) {
      hints.push('Consider breaking long statements into smaller, more manageable parts');
      examples.push(
        'Instead of: (P ∧ Q ∧ R) → (S ∨ T ∨ U), try: Let A = (P ∧ Q ∧ R) and B = (S ∨ T ∨ U), then A → B',
      );
    }

    if (message.includes('inconsistent')) {
      hints.push('Use the same symbols consistently throughout your proof');
      examples.push('Use either → or ⊃ for implication, but not both in the same proof');
    }

    if (message.includes('naming')) {
      hints.push('Use clear, descriptive names for variables and predicates');
      examples.push('Good: Human(x), Bad: H(x) without context');
    }

    if (message.includes('whitespace')) {
      hints.push('Use consistent spacing to improve readability');
      examples.push('Good: P ∧ Q, Less clear: P∧Q');
    }

    // Add default style hints if no specific patterns found
    if (hints.length === 0) {
      hints.push('Consider improving the clarity and readability of your argument');
      examples.push('Use consistent notation and clear logical structure');
    }

    return { hints, examples, concepts };
  }

  private getRelevantResources(concepts: string[], languagePackage: LanguagePackage): string[] {
    const resources: string[] = [];

    for (const concept of concepts) {
      switch (concept) {
        case 'logical-symbols':
          resources.push('Reference: Logical Symbol Guide');
          resources.push('Interactive: Symbol Practice Tool');
          break;
        case 'modal-logic':
          if (languagePackage.supportsModalLogic()) {
            resources.push('Tutorial: Introduction to Modal Logic');
            resources.push('Reference: Modal Logic Operators');
          }
          break;
        case 'quantifiers':
          if (languagePackage.supportsFirstOrderLogic()) {
            resources.push('Guide: Understanding Quantifiers');
            resources.push('Practice: Quantifier Scope Exercises');
          }
          break;
        case 'logical-inference':
          resources.push('Reference: Common Inference Rules');
          resources.push('Interactive: Proof Construction Tool');
          break;
        case 'parentheses-balancing':
          resources.push('Tool: Parentheses Checker');
          resources.push('Guide: Balanced Expression Rules');
          break;
        case 'syntax-basics':
          resources.push('Tutorial: Logical Syntax Fundamentals');
          resources.push('Reference: Grammar Rules');
          break;
      }
    }

    return resources;
  }

  private estimateLearningTime(concepts: string[], userLevel: LearningLevel): number {
    const baseTimePerConcept = {
      beginner: 15,
      intermediate: 10,
      advanced: 5,
    };

    const complexityMultipliers: Record<string, number> = {
      'modal-logic': 1.5,
      quantifiers: 1.3,
      'logical-inference': 1.2,
      'variable-scope': 1.4,
      'circular-reasoning': 1.1,
    };

    let totalTime = 0;
    for (const concept of concepts) {
      const baseTime = baseTimePerConcept[userLevel];
      const multiplier = complexityMultipliers[concept] ?? 1.0;
      totalTime += baseTime * multiplier;
    }

    return Math.round(totalTime);
  }
}
