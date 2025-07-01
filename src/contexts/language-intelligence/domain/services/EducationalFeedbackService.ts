import { err, ok, type Result } from 'neverthrow';

import { type Diagnostic } from '../entities/Diagnostic';
import { type LanguagePackage } from '../entities/LanguagePackage';
import { type ValidationResult } from '../entities/ValidationResult';
import { ValidationError } from '../errors/DomainErrors';

export class EducationalFeedbackService {
  private readonly maxHintsPerDiagnostic = 3;
  private readonly maxExamplesPerConcept = 2;

  generateLearningHints(
    diagnostic: Diagnostic,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate'
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
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  generateStepByStepGuidance(
    statement: string,
    targetConcepts: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate'
  ): Result<StepByStepGuidance, ValidationError> {
    try {
      const steps: GuidanceStep[] = [];

      // Analyze the statement complexity
      const complexity = this.analyzeStatementComplexity(statement, languagePackage);

      // Break down into logical steps based on complexity
      if (complexity.hasNestedStructure) {
        steps.push(
          this.createStep(
            'Break down nested structures',
            'Start by identifying the main logical structure and work from inside out',
            [`For "${statement}", identify the main connective`],
            ['logical-structure', 'parsing']
          )
        );
      }

      if (complexity.hasQuantifiers && languagePackage.supportsFirstOrderLogic()) {
        steps.push(
          this.createStep(
            'Handle quantifiers',
            'Identify the scope and binding of quantifiers',
            ['∀x means "for all x"', '∃x means "there exists an x"'],
            ['quantifiers', 'variable-binding']
          )
        );
      }

      if (complexity.hasModalOperators && languagePackage.supportsModalLogic()) {
        steps.push(
          this.createStep(
            'Interpret modal operators',
            'Understand necessity (□) and possibility (◇) operators',
            ['□P means "P is necessarily true"', '◇P means "P is possibly true"'],
            ['modal-logic', 'necessity', 'possibility']
          )
        );
      }

      // Add verification step
      steps.push(
        this.createStep(
          'Verify your understanding',
          'Check that your interpretation matches the intended meaning',
          [
            'Read the statement aloud in natural language',
            'Verify all symbols are interpreted correctly',
          ],
          ['verification', 'comprehension']
        )
      );

      return ok({
        steps,
        estimatedTime: this.estimateGuidanceTime(steps, userLevel),
        prerequisites: this.identifyPrerequisites(targetConcepts, languagePackage),
        nextSteps: this.suggestNextSteps(targetConcepts, userLevel),
        practiceExercises: this.generatePracticeExercises(targetConcepts, userLevel),
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate step-by-step guidance',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  generateProofStrategySuggestions(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate'
  ): Result<ProofStrategySuggestions, ValidationError> {
    try {
      const strategies: ProofStrategy[] = [];

      // Analyze proof structure
      const analysis = this.analyzeProofStructure(premises, conclusions, languagePackage);

      // Suggest appropriate proof techniques
      if (analysis.isDirectProofPossible) {
        strategies.push({
          name: 'Direct Proof',
          description: 'Proceed directly from premises to conclusion using logical rules',
          steps: [
            'Start with the given premises',
            'Apply logical rules step by step',
            'Arrive at the conclusion',
          ],
          difficulty: 'easy',
          applicability: 0.9,
        });
      }

      if (analysis.isContradictionProofSuitable) {
        strategies.push({
          name: 'Proof by Contradiction',
          description: 'Assume the negation of the conclusion and derive a contradiction',
          steps: [
            'Assume the negation of what you want to prove',
            'Combine with the given premises',
            'Derive a contradiction',
            'Conclude the original statement',
          ],
          difficulty: 'medium',
          applicability: 0.7,
        });
      }

      if (analysis.isCaseAnalysisNeeded) {
        strategies.push({
          name: 'Case Analysis',
          description: 'Break the proof into exhaustive cases',
          steps: [
            'Identify the relevant cases',
            'Prove the conclusion for each case',
            'Combine the results',
          ],
          difficulty: 'medium',
          applicability: 0.6,
        });
      }

      // Add educational insights
      const insights = this.generateProofInsights(analysis, userLevel);

      return ok({
        strategies: strategies.sort((a, b) => b.applicability - a.applicability),
        insights,
        commonMistakes: this.identifyCommonMistakes(analysis, userLevel),
        practiceProblems: this.suggestSimilarProblems(analysis, languagePackage),
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate proof strategy suggestions',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  analyzeValidationResults(
    results: ValidationResult[],
    languagePackage: LanguagePackage
  ): Result<LearningAnalysis, ValidationError> {
    try {
      const analysis: LearningAnalysis = {
        strengthAreas: [],
        improvementAreas: [],
        conceptGaps: [],
        progressIndicators: {},
        recommendations: [],
      };

      // Analyze error patterns
      const errorPatterns = this.identifyErrorPatterns(results);

      // Identify strength areas (consistently passing validations)
      for (const [concept, errorRate] of errorPatterns.entries()) {
        if (errorRate < 0.2) {
          analysis.strengthAreas.push(concept);
        } else if (errorRate > 0.6) {
          analysis.improvementAreas.push(concept);
        }
      }

      // Identify concept gaps
      analysis.conceptGaps = this.identifyConceptGaps(results, languagePackage);

      // Generate recommendations
      analysis.recommendations = this.generateLearningRecommendations(
        analysis.improvementAreas,
        analysis.conceptGaps,
        languagePackage
      );

      // Calculate progress indicators
      analysis.progressIndicators = this.calculateProgressIndicators(results);

      return ok(analysis);
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to analyze validation results',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  private generateSyntaxHints(
    diagnostic: Diagnostic,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel
  ): HintGeneration {
    const hints: string[] = [];
    const examples: string[] = [];
    const concepts: string[] = [];

    const message = diagnostic.getMessage().getText().toLowerCase();

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
          `Available symbols: ${symbols.map(([name, symbol]) => `${symbol} (${name})`).join(', ')}`
        );
      }
    }

    return { hints, examples, concepts };
  }

  private generateSemanticHints(
    diagnostic: Diagnostic,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel
  ): HintGeneration {
    const hints: string[] = [];
    const examples: string[] = [];
    const concepts: string[] = [];

    const message = diagnostic.getMessage().getText().toLowerCase();

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

    return { hints, examples, concepts };
  }

  private generateStyleHints(
    diagnostic: Diagnostic,
    _languagePackage: LanguagePackage,
    _userLevel: LearningLevel
  ): HintGeneration {
    const hints: string[] = [];
    const examples: string[] = [];
    const concepts: string[] = ['style', 'readability'];

    const message = diagnostic.getMessage().getText().toLowerCase();

    if (message.includes('length')) {
      hints.push('Consider breaking long statements into smaller, more manageable parts');
      examples.push(
        'Instead of: (P ∧ Q ∧ R) → (S ∨ T ∨ U), try: Let A = (P ∧ Q ∧ R) and B = (S ∨ T ∨ U), then A → B'
      );
    }

    if (message.includes('inconsistent')) {
      hints.push('Use the same symbols consistently throughout your proof');
      examples.push('Use either → or ⊃ for implication, but not both in the same proof');
    }

    return { hints, examples, concepts };
  }

  private getRelevantResources(concepts: string[], languagePackage: LanguagePackage): string[] {
    const resources: string[] = [];

    for (const concept of concepts) {
      switch (concept) {
        case 'logical-symbols':
          resources.push('Reference: Logical Symbol Guide');
          break;
        case 'modal-logic':
          if (languagePackage.supportsModalLogic()) {
            resources.push('Tutorial: Introduction to Modal Logic');
          }
          break;
        case 'quantifiers':
          if (languagePackage.supportsFirstOrderLogic()) {
            resources.push('Guide: Understanding Quantifiers');
          }
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

    return concepts.length * baseTimePerConcept[userLevel];
  }

  private analyzeStatementComplexity(
    statement: string,
    languagePackage: LanguagePackage
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

  private createStep(
    title: string,
    description: string,
    examples: string[],
    concepts: string[]
  ): GuidanceStep {
    return {
      title,
      description,
      examples,
      concepts,
      estimatedTime: 5,
    };
  }

  private estimateGuidanceTime(steps: GuidanceStep[], userLevel: LearningLevel): number {
    const multiplier = { beginner: 1.5, intermediate: 1.0, advanced: 0.7 };
    return Math.round(
      steps.reduce((total, step) => total + step.estimatedTime, 0) * multiplier[userLevel]
    );
  }

  private identifyPrerequisites(concepts: string[], _languagePackage: LanguagePackage): string[] {
    const prerequisites: string[] = [];

    for (const concept of concepts) {
      switch (concept) {
        case 'modal-logic':
          prerequisites.push('propositional-logic');
          break;
        case 'quantifiers':
          prerequisites.push('predicate-logic', 'variable-binding');
          break;
      }
    }

    return Array.from(new Set(prerequisites));
  }

  private suggestNextSteps(concepts: string[], userLevel: LearningLevel): string[] {
    const nextSteps: string[] = [];

    if (concepts.includes('propositional-logic') && userLevel !== 'beginner') {
      nextSteps.push('Explore modal logic extensions');
    }

    if (concepts.includes('modal-logic') && userLevel === 'advanced') {
      nextSteps.push('Study temporal logic');
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
          } else {
            exercises.push('Construct complex inference chains');
          }
          break;
        case 'modal-logic':
          exercises.push('Translate modal statements between □ and ◇');
          break;
      }
    }

    return exercises;
  }

  private analyzeProofStructure(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage
  ): ProofAnalysis {
    return {
      isDirectProofPossible: true, // Simplified analysis
      isContradictionProofSuitable: conclusions.length === 1,
      isCaseAnalysisNeeded: premises.some(p => p.includes('∨')),
      complexity: this.calculateProofComplexity(premises, conclusions),
      requiredRules: this.identifyRequiredRules(premises, conclusions, languagePackage),
    };
  }

  private calculateProofComplexity(premises: string[], conclusions: string[]): number {
    const totalLength = [...premises, ...conclusions].join('').length;
    const logicalSymbols = [...premises, ...conclusions].join('').match(/[∀∃∧∨→↔¬□◇]/g) ?? [];
    return Math.round(totalLength * 0.1 + logicalSymbols.length * 2);
  }

  private identifyRequiredRules(
    premises: string[],
    conclusions: string[],
    _languagePackage: LanguagePackage
  ): string[] {
    const rules: string[] = [];

    // Simplified rule identification
    if (premises.some(p => p.includes('→')) && conclusions.some(c => !c.includes('→'))) {
      rules.push('modus-ponens');
    }

    if (premises.some(p => p.includes('∧'))) {
      rules.push('conjunction-elimination');
    }

    return rules;
  }

  private generateProofInsights(analysis: ProofAnalysis, userLevel: LearningLevel): string[] {
    const insights: string[] = [];

    if (analysis.complexity > 10 && userLevel === 'beginner') {
      insights.push('This proof is quite complex - consider breaking it into smaller steps');
    }

    if (analysis.isCaseAnalysisNeeded) {
      insights.push('This proof involves disjunctions - case analysis might be helpful');
    }

    return insights;
  }

  private identifyCommonMistakes(analysis: ProofAnalysis, userLevel: LearningLevel): string[] {
    const mistakes: string[] = [];

    if (analysis.isContradictionProofSuitable) {
      mistakes.push('Remember to assume the negation of what you want to prove');
    }

    if (userLevel === 'beginner') {
      mistakes.push('Make sure each step follows logically from the previous ones');
    }

    return mistakes;
  }

  private suggestSimilarProblems(
    analysis: ProofAnalysis,
    languagePackage: LanguagePackage
  ): string[] {
    const problems: string[] = [];

    if (analysis.requiredRules.includes('modus-ponens')) {
      problems.push('Practice more modus ponens exercises');
    }

    if (languagePackage.supportsModalLogic()) {
      problems.push('Try similar modal logic problems');
    }

    return problems;
  }

  private identifyErrorPatterns(results: ValidationResult[]): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const result of results) {
      for (const diagnostic of result.getDiagnostics()) {
        for (const tag of diagnostic.getTags()) {
          const currentRate = patterns.get(tag) ?? 0;
          patterns.set(tag, currentRate + (diagnostic.getSeverity().isError() ? 1 : 0.5));
        }
      }
    }

    // Normalize by number of results
    for (const [tag, count] of patterns.entries()) {
      patterns.set(tag, count / results.length);
    }

    return patterns;
  }

  private identifyConceptGaps(
    results: ValidationResult[],
    languagePackage: LanguagePackage
  ): string[] {
    const gaps: string[] = [];

    // Simplified gap identification
    const hasModalErrors = results.some(r =>
      r.getDiagnostics().some(d => d.getMessage().getText().includes('modal'))
    );

    if (hasModalErrors && languagePackage.supportsModalLogic()) {
      gaps.push('modal-logic-understanding');
    }

    return gaps;
  }

  private generateLearningRecommendations(
    improvementAreas: string[],
    _conceptGaps: string[],
    _languagePackage: LanguagePackage
  ): string[] {
    const recommendations: string[] = [];

    for (const area of improvementAreas) {
      switch (area) {
        case 'syntax':
          recommendations.push('Review basic logical syntax and symbol usage');
          break;
        case 'semantic':
          recommendations.push('Practice identifying valid logical inferences');
          break;
      }
    }

    return recommendations;
  }

  private calculateProgressIndicators(results: ValidationResult[]): Record<string, number> {
    const indicators: Record<string, number> = {};

    const totalResults = results.length;
    const successfulResults = results.filter(r => r.isValidationSuccessful()).length;

    indicators['successRate'] = totalResults > 0 ? successfulResults / totalResults : 0;
    indicators['averageErrors'] =
      totalResults > 0 ? results.reduce((sum, r) => sum + r.getErrorCount(), 0) / totalResults : 0;

    return indicators;
  }
}

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningHints {
  hints: string[];
  examples: string[];
  concepts: string[];
  resources: string[];
  difficultyLevel: LearningLevel;
  estimatedLearningTime: number;
}

export interface StepByStepGuidance {
  steps: GuidanceStep[];
  estimatedTime: number;
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

export interface ProofStrategySuggestions {
  strategies: ProofStrategy[];
  insights: string[];
  commonMistakes: string[];
  practiceProblems: string[];
}

export interface ProofStrategy {
  name: string;
  description: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  applicability: number;
}

export interface LearningAnalysis {
  strengthAreas: string[];
  improvementAreas: string[];
  conceptGaps: string[];
  progressIndicators: Record<string, number>;
  recommendations: string[];
}

interface HintGeneration {
  hints: string[];
  examples: string[];
  concepts: string[];
}

interface StatementComplexity {
  hasNestedStructure: boolean;
  hasQuantifiers: boolean;
  hasModalOperators: boolean;
  complexityScore: number;
  mainConnectives: string[];
}

interface ProofAnalysis {
  isDirectProofPossible: boolean;
  isContradictionProofSuitable: boolean;
  isCaseAnalysisNeeded: boolean;
  complexity: number;
  requiredRules: string[];
}
