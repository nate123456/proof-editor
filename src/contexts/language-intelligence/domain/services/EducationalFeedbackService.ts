import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { SourceLocation } from '../../../../domain/shared/index.js';
import type { Diagnostic } from '../entities/Diagnostic';
import type { LanguagePackage } from '../entities/LanguagePackage';
import type { ValidationResult } from '../entities/ValidationResult';
import { ValidationError } from '../errors/DomainErrors';

@injectable()
export class EducationalFeedbackService {
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

      // Break down into logical steps based on complexity
      if (complexity.hasNestedStructure) {
        steps.push(
          this.createStep(
            'Break down nested structures',
            'Start by identifying the main logical structure and work from inside out',
            [`For "${statement}", identify the main connective`],
            ['logical-structure', 'parsing'],
          ),
        );
      }

      if (complexity.hasQuantifiers && languagePackage.supportsFirstOrderLogic()) {
        steps.push(
          this.createStep(
            'Handle quantifiers',
            'Identify the scope and binding of quantifiers',
            ['∀x means "for all x"', '∃x means "there exists an x"'],
            ['quantifiers', 'variable-binding'],
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
          ),
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
          ['verification', 'comprehension'],
        ),
      );

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

  generateProofStrategySuggestions(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
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
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  analyzeValidationResults(
    results: ValidationResult[],
    languagePackage: LanguagePackage,
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
      for (const [concept, errorRate] of Array.from(errorPatterns.entries())) {
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
        languagePackage,
      );

      // Calculate progress indicators
      analysis.progressIndicators = this.calculateProgressIndicators(results);

      return ok(analysis);
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to analyze validation results',
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
    concepts: string[],
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
      steps.reduce((total, step) => total + step.estimatedTime, 0) * multiplier[userLevel],
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
    languagePackage: LanguagePackage,
  ): ProofAnalysis {
    return {
      isDirectProofPossible: true, // Simplified analysis
      isContradictionProofSuitable: conclusions.length === 1,
      isCaseAnalysisNeeded: premises.some((p) => p.includes('∨')),
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
    _languagePackage: LanguagePackage,
  ): string[] {
    const rules: string[] = [];

    // Simplified rule identification
    if (premises.some((p) => p.includes('→')) && conclusions.some((c) => !c.includes('→'))) {
      rules.push('modus-ponens');
    }

    if (premises.some((p) => p.includes('∧'))) {
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

    if (analysis.isDirectProofPossible) {
      insights.push('A direct proof approach should work well for this argument');
    }

    if (analysis.requiredRules.length > 0) {
      insights.push(`This proof may benefit from using: ${analysis.requiredRules.join(', ')}`);
    }

    // Always provide at least one insight
    if (insights.length === 0) {
      insights.push('Consider the logical structure and identify the key reasoning steps');
      insights.push('Look for patterns that match common inference rules');
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
    languagePackage: LanguagePackage,
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
    for (const [tag, count] of Array.from(patterns.entries())) {
      patterns.set(tag, count / results.length);
    }

    return patterns;
  }

  private identifyConceptGaps(
    results: ValidationResult[],
    languagePackage: LanguagePackage,
  ): string[] {
    const gaps: string[] = [];

    // Simplified gap identification
    const hasModalErrors = results.some((r) =>
      r.getDiagnostics().some((d) => d.getMessage().getText().includes('modal')),
    );

    if (hasModalErrors && languagePackage.supportsModalLogic()) {
      gaps.push('modal-logic-understanding');
    }

    return gaps;
  }

  private generateLearningRecommendations(
    improvementAreas: string[],
    _conceptGaps: string[],
    _languagePackage: LanguagePackage,
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
    const successfulResults = results.filter((r) => r.isValid()).length;

    indicators.successRate = totalResults > 0 ? successfulResults / totalResults : 0;
    indicators.averageErrors =
      totalResults > 0 ? results.reduce((sum, r) => sum + r.getErrorCount(), 0) / totalResults : 0;

    return indicators;
  }

  generateInteractiveFeedback(
    validationResult: ValidationResult,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<InteractiveFeedback, ValidationError> {
    try {
      const diagnostics = validationResult.getDiagnostics();
      const feedbackItems: FeedbackItem[] = [];

      // Generate feedback for each diagnostic
      for (const diagnostic of diagnostics) {
        const hintsResult = this.generateLearningHints(diagnostic, languagePackage, userLevel);
        if (hintsResult.isOk()) {
          feedbackItems.push({
            type: diagnostic.getSeverity().isError()
              ? 'error'
              : diagnostic.getSeverity().isWarning()
                ? 'warning'
                : 'info',
            message: diagnostic.getMessage().getText(),
            location: diagnostic.getLocation(),
            hints: hintsResult.value.hints,
            examples: hintsResult.value.examples,
            concepts: hintsResult.value.concepts,
          });
        }
      }

      // Calculate overall score
      const totalIssues = diagnostics.length;
      const errorCount = diagnostics.filter((d) => d.getSeverity().isError()).length;
      const warningCount = diagnostics.filter((d) => d.getSeverity().isWarning()).length;

      const overallScore =
        totalIssues === 0 ? 100 : Math.max(0, 100 - (errorCount * 20 + warningCount * 10));

      // Identify strengths and areas for improvement
      const categoryFrequency = new Map<string, number>();
      for (const diagnostic of diagnostics) {
        for (const tag of diagnostic.getTags()) {
          categoryFrequency.set(tag, (categoryFrequency.get(tag) ?? 0) + 1);
        }
      }

      const strengths: string[] = [];
      const areasForImprovement: string[] = [];

      if (totalIssues === 0) {
        strengths.push('All validation checks passed');
        strengths.push('Proper logical structure maintained');
        strengths.push('Correct use of symbols and syntax');
      } else {
        // Find most problematic areas
        const sortedCategories = Array.from(categoryFrequency.entries()).sort(
          ([, a], [, b]) => b - a,
        );

        for (const [category, count] of sortedCategories) {
          if (count >= 2) {
            areasForImprovement.push(`${category} (${count} issues)`);
          }
        }

        // Add potential strengths for areas with fewer issues
        const allCategories = ['syntax', 'semantic', 'style'];
        for (const category of allCategories) {
          if (!categoryFrequency.has(category)) {
            strengths.push(`Good ${category} usage`);
          }
        }
      }

      // Generate suggested next steps
      const suggestedNextSteps: string[] = [];
      if (errorCount > 0) {
        suggestedNextSteps.push('Focus on fixing logical errors first');
      }
      if (warningCount > 0) {
        suggestedNextSteps.push('Review style and best practices');
      }
      if (totalIssues === 0) {
        suggestedNextSteps.push('Try more complex logical constructs');
        suggestedNextSteps.push('Explore advanced proof techniques');
      }

      return ok({
        feedbackItems,
        overallScore,
        strengths,
        areasForImprovement,
        suggestedNextSteps,
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate interactive feedback',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  analyzeConceptDifficulty(
    concepts: string[],
    languagePackage: LanguagePackage,
  ): Result<ConceptDifficultyAnalysis, ValidationError> {
    try {
      const conceptAnalyses: ConceptAnalysis[] = [];
      let maxDifficulty: LearningLevel = 'beginner';

      // Analyze each concept
      for (const concept of concepts) {
        let difficulty: LearningLevel = 'beginner';
        const prerequisites: string[] = [];

        // Determine difficulty based on concept
        switch (concept) {
          case 'conjunction':
          case 'disjunction':
          case 'negation':
            difficulty = 'beginner';
            break;
          case 'implication':
          case 'equivalence':
            difficulty = 'beginner';
            prerequisites.push('conjunction', 'disjunction');
            break;
          case 'modus-ponens':
          case 'modus-tollens':
            difficulty = 'intermediate';
            prerequisites.push('implication');
            break;
          case 'modal-logic':
          case 'temporal-logic':
          case 'higher-order-logic':
            difficulty = 'advanced';
            prerequisites.push('propositional-logic');
            break;
          case 'quantifiers':
          case 'first-order-logic':
            difficulty = 'intermediate';
            prerequisites.push('propositional-logic');
            break;
        }

        // Check if language package supports the concept
        let isSupported = true;
        if (
          (concept.includes('modal') || concept.includes('necessity')) &&
          !languagePackage.supportsModalLogic()
        ) {
          isSupported = false;
        }
        if (
          (concept.includes('quantifier') || concept.includes('first-order')) &&
          !languagePackage.supportsFirstOrderLogic()
        ) {
          isSupported = false;
        }

        conceptAnalyses.push({
          name: concept,
          difficulty,
          prerequisites,
          isSupported,
          estimatedLearningTimeMinutes:
            difficulty === 'beginner' ? 30 : difficulty === 'intermediate' ? 60 : 120,
        });

        // Update maximum difficulty
        if (
          difficulty === 'advanced' ||
          (difficulty === 'intermediate' && maxDifficulty === 'beginner')
        ) {
          maxDifficulty = difficulty;
        }
      }

      // Generate learning path
      const sortedConcepts = [...concepts].sort((a, b) => {
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        const aDifficulty = conceptAnalyses.find((c) => c.name === a)?.difficulty ?? 'beginner';
        const bDifficulty = conceptAnalyses.find((c) => c.name === b)?.difficulty ?? 'beginner';
        return difficultyOrder[aDifficulty] - difficultyOrder[bDifficulty];
      });

      // Collect all prerequisites
      const allPrerequisites = Array.from(new Set(conceptAnalyses.flatMap((c) => c.prerequisites)));

      return ok({
        concepts: conceptAnalyses,
        overallDifficulty: maxDifficulty,
        prerequisiteConcepts: allPrerequisites,
        suggestedLearningPath: sortedConcepts,
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

      // Limit to maxProblems
      const selectedProblems = problems.slice(0, maxProblems);

      return ok({
        problems: selectedProblems,
        targetConcepts: concepts,
        difficultyLevel: userLevel,
        estimatedTimeMinutes:
          selectedProblems.length *
          (userLevel === 'beginner' ? 5 : userLevel === 'intermediate' ? 8 : 12),
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

  adaptContentToUserLevel(
    content: string,
    userLevel: LearningLevel,
  ): Result<ContentAdaptation, ValidationError> {
    try {
      let adaptedContent = content;
      const simplifications: string[] = [];
      const addedExplanations: string[] = [];
      const technicalTermsAdded: string[] = [];

      switch (userLevel) {
        case 'beginner':
          // Simplify language, add more explanations
          adaptedContent = this.simplifyForBeginner(content);
          simplifications.push('Replaced technical terms with simpler language');
          addedExplanations.push('Added basic explanations for logical concepts');
          break;
        case 'intermediate':
          // Standard explanations with moderate detail
          adaptedContent = this.adaptForIntermediate(content);
          break;
        case 'advanced':
          // More concise, technical language
          adaptedContent = this.adaptForAdvanced(content);
          technicalTermsAdded.push('Used precise technical terminology');
          break;
      }

      return ok({
        originalContent: content,
        adaptedContent,
        targetLevel: userLevel,
        simplifications,
        addedExplanations,
        technicalTermsAdded,
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to adapt content to user level',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  generateContentForConcept(
    concept: string,
    _userLevel: LearningLevel = 'intermediate',
    languagePackage?: LanguagePackage,
  ): Result<ConceptContent, ValidationError> {
    try {
      const conceptMap: Record<string, ConceptContent> = {
        'logical-operators': {
          title: 'Logical Operators',
          description: 'Basic building blocks of logical expressions',
          examples: [
            'P ∧ Q (conjunction)',
            'P ∨ Q (disjunction)',
            'P → Q (implication)',
            '¬P (negation)',
          ],
          keyPoints: [
            'Conjunction (∧) means "and" - both must be true',
            'Disjunction (∨) means "or" - at least one must be true',
            'Implication (→) means "if...then"',
            'Negation (¬) means "not"',
          ],
          prerequisites: [],
          nextSteps: ['truth-tables', 'compound-statements'],
        },
        'inference-rules': {
          title: 'Inference Rules',
          description: 'Valid patterns of logical reasoning',
          examples: [
            'Modus Ponens: P, P → Q ∴ Q',
            'Modus Tollens: ¬Q, P → Q ∴ ¬P',
            'Hypothetical Syllogism: P → Q, Q → R ∴ P → R',
          ],
          keyPoints: [
            'Inference rules preserve truth',
            'If premises are true, conclusion must be true',
            'Each rule has a specific pattern',
          ],
          prerequisites: ['logical-operators'],
          nextSteps: ['proof-strategies', 'formal-proofs'],
        },
        'modal-logic': {
          title: 'Modal Logic',
          description: 'Logic of necessity and possibility',
          examples: [
            '□P means "P is necessarily true"',
            '◇P means "P is possibly true"',
            '□P → ◇P (necessity implies possibility)',
          ],
          keyPoints: [
            'Modal operators express modes of truth',
            'Necessity is stronger than possibility',
            'Different modal systems have different axioms',
          ],
          prerequisites: ['propositional-logic'],
          nextSteps: ['temporal-logic', 'epistemic-logic'],
        },
      };

      const baseContent = conceptMap[concept] ?? {
        title: concept,
        description: `Information about ${concept}`,
        examples: [],
        keyPoints: [],
        prerequisites: [],
        nextSteps: [],
      };

      // Add language package specific information
      if (languagePackage) {
        this.enrichWithLanguagePackageInfo(baseContent, concept, languagePackage);
      }

      return ok(baseContent);
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to generate content for concept',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  suggestRelatedTopics(
    currentTopic: string,
    userLevel: LearningLevel = 'intermediate',
    languagePackage?: LanguagePackage,
  ): Result<RelatedTopics, ValidationError> {
    try {
      const topicRelations: Record<
        string,
        { prerequisites: string[]; related: string[]; advanced: string[] }
      > = {
        'logical-operators': {
          prerequisites: [],
          related: ['truth-tables', 'boolean-algebra'],
          advanced: ['propositional-logic', 'logical-equivalences'],
        },
        'inference-rules': {
          prerequisites: ['logical-operators'],
          related: ['natural-deduction', 'formal-proofs'],
          advanced: ['soundness-completeness', 'proof-theory'],
        },
        'modal-logic': {
          prerequisites: ['propositional-logic', 'inference-rules'],
          related: ['possible-worlds', 'modal-operators'],
          advanced: ['temporal-logic', 'dynamic-logic'],
        },
        quantifiers: {
          prerequisites: ['propositional-logic'],
          related: ['predicate-logic', 'variable-binding'],
          advanced: ['first-order-logic', 'higher-order-logic'],
        },
      };

      const relations = topicRelations[currentTopic] ?? {
        prerequisites: [],
        related: [],
        advanced: [],
      };

      let suggestions: string[] = [];

      // Include suggestions based on user level
      switch (userLevel) {
        case 'beginner':
          suggestions = [...relations.prerequisites, ...relations.related.slice(0, 2)];
          break;
        case 'intermediate':
          suggestions = [...relations.related, ...relations.advanced.slice(0, 2)];
          break;
        case 'advanced':
          suggestions = [...relations.related, ...relations.advanced];
          break;
      }

      // Filter based on language package capabilities
      if (languagePackage) {
        suggestions = this.filterTopicsByLanguagePackage(suggestions, languagePackage);
      }

      return ok({
        prerequisites: relations.prerequisites,
        related: relations.related,
        advanced: relations.advanced,
        suggestions: Array.from(new Set(suggestions)),
        userLevelAppropriate: suggestions,
      });
    } catch (error) {
      return err(
        new ValidationError(
          'Failed to suggest related topics',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  private simplifyForBeginner(content: string): string {
    // Replace technical terms with simpler explanations
    return content
      .replace(/logical operator/g, 'logical word like "and", "or", "not"')
      .replace(/inference rule/g, 'reasoning pattern')
      .replace(/proposition/g, 'statement')
      .replace(/tautology/g, 'statement that is always true')
      .replace(/contradiction/g, 'statement that is always false');
  }

  private adaptForIntermediate(content: string): string {
    // Keep standard technical language with brief clarifications
    return content
      .replace(/\b(modus ponens)\b/g, '$1 (if P and P→Q, then Q)')
      .replace(/\b(modus tollens)\b/g, '$1 (if ¬Q and P→Q, then ¬P)');
  }

  private adaptForAdvanced(content: string): string {
    // Use precise technical language, assume familiarity
    return content
      .replace(/reasoning pattern/g, 'inference rule')
      .replace(/logical word/g, 'logical operator')
      .replace(/statement/g, 'proposition');
  }

  private enrichWithLanguagePackageInfo(
    content: ConceptContent,
    concept: string,
    languagePackage: LanguagePackage,
  ): void {
    if (concept === 'modal-logic' && languagePackage.supportsModalLogic()) {
      if (
        'getSupportedModalOperators' in languagePackage &&
        typeof languagePackage.getSupportedModalOperators === 'function'
      ) {
        const modalOps = (languagePackage.getSupportedModalOperators as () => unknown[])();
        if (Array.isArray(modalOps) && modalOps.length > 0) {
          content.examples.push(
            ...modalOps.map((op) => `${String(op)} - modal operator supported by this package`),
          );
        }
      }
    }

    if (concept === 'quantifiers' && languagePackage.supportsFirstOrderLogic()) {
      if (
        'getSupportedQuantifiers' in languagePackage &&
        typeof languagePackage.getSupportedQuantifiers === 'function'
      ) {
        const quantifiers = (languagePackage.getSupportedQuantifiers as () => unknown[])();
        if (Array.isArray(quantifiers) && quantifiers.length > 0) {
          content.examples.push(
            ...quantifiers.map((q) => `${String(q)} - quantifier supported by this package`),
          );
        }
      }
    }
  }

  private filterTopicsByLanguagePackage(
    topics: string[],
    languagePackage: LanguagePackage,
  ): string[] {
    return topics.filter((topic) => {
      switch (topic) {
        case 'modal-logic':
        case 'temporal-logic':
        case 'dynamic-logic':
          return languagePackage.supportsModalLogic();
        case 'quantifiers':
        case 'predicate-logic':
        case 'first-order-logic':
          return languagePackage.supportsFirstOrderLogic();
        default:
          return true; // Include general topics
      }
    });
  }

  private generateProblemsForConcept(
    concept: string,
    difficultyLevel: LearningLevel,
    languagePackage: LanguagePackage,
  ): PracticeProblem[] {
    const problems: PracticeProblem[] = [];

    switch (concept) {
      case 'conjunction':
        if (difficultyLevel === 'beginner') {
          problems.push({
            statement: 'Show that (P ∧ Q) ∧ R is equivalent to P ∧ (Q ∧ R)',
            solution: 'Use associativity of conjunction',
            hints: ['Consider truth tables', 'Conjunction is associative'],
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
        break;

      case 'disjunction':
        problems.push({
          statement: 'Show that P ∨ ¬P is always true',
          solution: 'This is the law of excluded middle - P is either true or false',
          hints: ['Consider all possible truth values for P', 'This is a tautology'],
          concepts: ['disjunction', 'negation', 'tautology'],
          difficulty: difficultyLevel,
        });
        break;

      case 'modal-logic':
        if (languagePackage.supportsModalLogic()) {
          problems.push({
            statement: 'Prove: □P → ◇P (necessity implies possibility)',
            solution: 'If P is necessarily true, it must be possible',
            hints: ['Necessity is stronger than possibility', 'All necessary truths are possible'],
            concepts: ['modal-logic', 'necessity', 'possibility'],
            difficulty: difficultyLevel,
          });
        }
        break;

      default:
        // Generic problem
        problems.push({
          statement: `Practice problem for ${concept}`,
          solution: `Solution involves understanding ${concept}`,
          hints: [`Review the definition of ${concept}`],
          concepts: [concept],
          difficulty: difficultyLevel,
        });
        break;
    }

    return problems;
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
      quantifiers: 1.3,
    };

    return Math.round(baseTime[difficulty] * (complexityMultiplier[concept] ?? 1.0));
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

export interface ConceptContent {
  title: string;
  description: string;
  examples: string[];
  keyPoints: string[];
  prerequisites: string[];
  nextSteps: string[];
}

export interface RelatedTopics {
  prerequisites: string[];
  related: string[];
  advanced: string[];
  suggestions: string[];
  userLevelAppropriate: string[];
}

export interface InteractiveFeedback {
  feedbackItems: FeedbackItem[];
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  suggestedNextSteps: string[];
}

export interface FeedbackItem {
  type: 'error' | 'warning' | 'info';
  message: string;
  location: SourceLocation;
  hints: string[];
  examples: string[];
  concepts: string[];
}

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

export interface ContentAdaptation {
  adaptedContent: string;
  originalContent: string;
  targetLevel: LearningLevel;
  simplifications: string[];
  addedExplanations: string[];
  technicalTermsAdded: string[];
}

export interface AdaptedContent {
  adaptedContent: string;
  originalContent: string;
  targetLevel: LearningLevel;
  simplifications: string[];
  addedExplanations: string[];
  technicalTermsAdded: string[];
}
