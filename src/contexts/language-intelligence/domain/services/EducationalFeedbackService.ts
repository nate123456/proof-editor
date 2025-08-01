import { err, ok, type Result } from 'neverthrow';
import { injectable } from 'tsyringe';

import type { SourceLocation } from '../../../../domain/shared/index.js';
import type { Diagnostic } from '../entities/Diagnostic';
import type { LanguagePackage } from '../entities/LanguagePackage';
import type { ValidationResult } from '../entities/ValidationResult';
import { ValidationError } from '../errors/DomainErrors';
import type { ConceptAnalyzer, ConceptDifficultyAnalysis } from './education/ConceptAnalyzer';
import type {
  ConceptContent,
  ContentAdaptation,
  ContentAdaptationService,
  RelatedTopics,
} from './education/ContentAdaptationService';
import type { LearningHintGenerator, LearningHints } from './education/LearningHintGenerator';
import type {
  PracticeProblemGenerator,
  PracticeProblems,
} from './education/PracticeProblemGenerator';
import type {
  ProofStrategyAdvisor,
  ProofStrategySuggestions,
} from './education/ProofStrategyAdvisor';
import type {
  StepByStepGuidance,
  StepByStepGuidanceProvider,
} from './education/StepByStepGuidanceProvider';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningAnalysis {
  strengthAreas: string[];
  improvementAreas: string[];
  conceptGaps: string[];
  progressIndicators: Record<string, number>;
  recommendations: string[];
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

@injectable()
export class EducationalFeedbackService {
  constructor(
    private readonly hintGenerator: LearningHintGenerator,
    private readonly guidanceProvider: StepByStepGuidanceProvider,
    private readonly strategyAdvisor: ProofStrategyAdvisor,
    private readonly contentAdapter: ContentAdaptationService,
    private readonly problemGenerator: PracticeProblemGenerator,
    private readonly conceptAnalyzer: ConceptAnalyzer,
  ) {}

  generateLearningHints(
    diagnostic: Diagnostic,
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<LearningHints, ValidationError> {
    return this.hintGenerator.generateLearningHints(diagnostic, languagePackage, userLevel);
  }

  generateStepByStepGuidance(
    statement: string,
    targetConcepts: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<StepByStepGuidance, ValidationError> {
    return this.guidanceProvider.generateStepByStepGuidance(
      statement,
      targetConcepts,
      languagePackage,
      userLevel,
    );
  }

  generateProofStrategySuggestions(
    premises: string[],
    conclusions: string[],
    languagePackage: LanguagePackage,
    userLevel: LearningLevel = 'intermediate',
  ): Result<ProofStrategySuggestions, ValidationError> {
    return this.strategyAdvisor.generateProofStrategySuggestions(
      premises,
      conclusions,
      languagePackage,
      userLevel,
    );
  }

  analyzeConceptDifficulty(
    concepts: string[],
    languagePackage: LanguagePackage,
  ): Result<ConceptDifficultyAnalysis, ValidationError> {
    return this.conceptAnalyzer.analyzeConceptDifficulty(concepts, languagePackage);
  }

  suggestPracticeProblems(
    concepts: string[],
    userLevel: LearningLevel,
    languagePackage: LanguagePackage,
    maxProblems = 10,
  ): Result<PracticeProblems, ValidationError> {
    return this.problemGenerator.suggestPracticeProblems(
      concepts,
      userLevel,
      languagePackage,
      maxProblems,
    );
  }

  adaptContentToUserLevel(
    content: string,
    userLevel: LearningLevel,
  ): Result<ContentAdaptation, ValidationError> {
    return this.contentAdapter.adaptContentToUserLevel(content, userLevel);
  }

  generateContentForConcept(
    concept: string,
    userLevel: LearningLevel = 'intermediate',
    languagePackage?: LanguagePackage,
  ): Result<ConceptContent, ValidationError> {
    return this.contentAdapter.generateContentForConcept(concept, userLevel, languagePackage);
  }

  suggestRelatedTopics(
    currentTopic: string,
    userLevel: LearningLevel = 'intermediate',
    languagePackage?: LanguagePackage,
  ): Result<RelatedTopics, ValidationError> {
    return this.contentAdapter.suggestRelatedTopics(currentTopic, userLevel, languagePackage);
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
        const hintsResult = this.hintGenerator.generateLearningHints(
          diagnostic,
          languagePackage,
          userLevel,
        );
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

    const hasQuantifierErrors = results.some((r) =>
      r.getDiagnostics().some((d) => d.getMessage().getText().includes('quantifier')),
    );

    if (hasQuantifierErrors && languagePackage.supportsFirstOrderLogic()) {
      gaps.push('quantifier-understanding');
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
        case 'style':
          recommendations.push('Focus on clear and consistent notation');
          break;
        default:
          recommendations.push(`Study ${area} concepts more thoroughly`);
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
}
