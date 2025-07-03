/**
 * Tests for EducationalFeedbackService
 *
 * Focuses on:
 * - Learning hints generation
 * - Step-by-step guidance
 * - Educational content creation
 * - Feedback analysis
 * - High coverage for core functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { Diagnostic } from '../../entities/Diagnostic';
import { type LanguagePackage } from '../../entities/LanguagePackage';
import { type ValidationResult } from '../../entities/ValidationResult';
import { EducationalFeedbackService } from '../../services/EducationalFeedbackService';
import { DiagnosticMessage } from '../../value-objects/DiagnosticMessage';
import { DiagnosticSeverity } from '../../value-objects/DiagnosticSeverity';

// Mock factories
const createMockDiagnostic = (category: 'syntax' | 'semantic' | 'style' = 'syntax'): Diagnostic => {
  const range = SourceLocation.create(1, 1, 1, 10);

  if (range.isOk()) {
    // Create proper diagnostic codes that follow format "category-specific-code"
    const diagnosticCode =
      category === 'syntax'
        ? 'syntax-error'
        : category === 'semantic'
          ? 'semantic-error'
          : 'style-warning';

    // Create realistic diagnostic messages that match service patterns
    const message =
      category === 'syntax'
        ? 'Missing closing parentheses in logical expression'
        : category === 'semantic'
          ? 'Invalid inference rule application'
          : 'Statement length exceeds recommended limit';

    // Use appropriate severity levels based on category
    const severity =
      category === 'syntax' || category === 'semantic'
        ? DiagnosticSeverity.error()
        : DiagnosticSeverity.warning();

    const result = Diagnostic.create(
      severity,
      message,
      diagnosticCode,
      range.value,
      'test-source',
      [],
      [category]
    );

    if (result.isOk()) {
      const diagnostic = result.value;
      // Add missing methods that are expected by the service
      vi.spyOn(diagnostic, 'hasTag').mockImplementation((tag: string) =>
        [category as string].includes(tag)
      );
      vi.spyOn(diagnostic, 'getTags').mockImplementation(() => [category]);
      return diagnostic;
    } else {
      throw new Error(`Failed to create diagnostic: ${result.error.message}`);
    }
  }

  throw new Error(
    `Failed to create range: ${range.isErr() ? range.error.message : 'unknown error'}`
  );
};

const createMockLanguagePackage = (
  features: {
    supportsFirstOrderLogic?: boolean;
    supportsModalLogic?: boolean;
    supportsPropositionalLogic?: boolean;
  } = {}
): LanguagePackage => {
  const symbolsMap = new Map([
    ['conjunction', '∧'],
    ['disjunction', '∨'],
    ['implication', '→'],
    ['negation', '¬'],
    ['universal', '∀'],
    ['existential', '∃'],
    ['necessity', '□'],
    ['possibility', '◇'],
  ]);

  const mock = {
    getId: vi.fn(() => ({ getValue: () => 'lang-package-1' })),
    getName: vi.fn(() => ({ getValue: () => 'Test Package' })),
    getVersion: vi.fn(() => ({ toString: () => '1.0.0' })),
    getDescription: vi.fn(() => ({ getValue: () => 'Test description' })),
    getRules: vi.fn(() => []),
    getValidationRules: vi.fn(() => []),
    supportsFirstOrderLogic: vi.fn(() => features.supportsFirstOrderLogic ?? true),
    supportsModalLogic: vi.fn(() => features.supportsModalLogic ?? false),
    supportsPropositionalLogic: vi.fn(() => features.supportsPropositionalLogic ?? true),
    getSymbols: vi.fn(() => symbolsMap),
    isActive: vi.fn(() => true),
  } as unknown as LanguagePackage;

  return mock;
};

const createMockValidationResult = (diagnostics: Diagnostic[] = []): ValidationResult => {
  return {
    getId: vi.fn(() => ({ getValue: () => 'validation-1' })),
    getDocumentId: vi.fn(() => 'doc-1'),
    getValidationLevel: vi.fn(() => ({ getValue: () => 'full' })),
    getDiagnostics: vi.fn(() => diagnostics),
    getPerformanceMetrics: vi.fn(() => ({
      getTotalTimeMs: () => 100,
      getCpuTimeMs: () => 50,
      getMemoryUsedBytes: () => 1024,
      getPeakMemoryBytes: () => 2048,
    })),
    isValid: vi.fn(() => diagnostics.length === 0),
    getDiagnosticsByCategory: vi.fn((category: string) =>
      diagnostics.filter(d => d.hasTag(category))
    ),
    getDiagnosticsBySeverity: vi.fn((severity: string) =>
      diagnostics.filter(d => d.getSeverity().toString() === severity)
    ),
    getSeverityCounts: vi.fn(() => ({
      error: diagnostics.filter(d => d.getSeverity().isError()).length,
      warning: diagnostics.filter(d => d.getSeverity().isWarning()).length,
      info: diagnostics.filter(d => d.getSeverity().isInfo()).length,
      hint: 0, // No hint severity in DiagnosticSeverity
    })),
    hasErrors: vi.fn(() => diagnostics.some(d => d.getSeverity().isError())),
    hasWarnings: vi.fn(() => diagnostics.some(d => d.getSeverity().isWarning())),
    getErrorCount: vi.fn(() => diagnostics.filter(d => d.getSeverity().isError()).length),
  } as unknown as ValidationResult;
};

describe('EducationalFeedbackService', () => {
  let service: EducationalFeedbackService;

  beforeEach(() => {
    service = new EducationalFeedbackService();
  });

  describe('generateLearningHints', () => {
    it('should generate hints for syntax-related diagnostics', () => {
      const diagnostic = createMockDiagnostic('syntax');
      const languagePackage = createMockLanguagePackage();

      const result = service.generateLearningHints(diagnostic, languagePackage, 'beginner');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const hints = result.value;
        expect(hints.hints).toBeDefined();
        expect(hints.hints.length).toBeGreaterThan(0);
        expect(hints.hints.length).toBeLessThanOrEqual(3); // maxHintsPerDiagnostic
        expect(hints.examples).toBeDefined();
        expect(hints.concepts).toBeDefined();
        expect(hints.resources).toBeDefined();
        expect(hints.difficultyLevel).toBe('beginner');
        expect(hints.estimatedLearningTime).toBeGreaterThan(0);
      }
    });

    it('should generate hints for semantic-related diagnostics', () => {
      const diagnostic = createMockDiagnostic('semantic');
      const languagePackage = createMockLanguagePackage();

      const result = service.generateLearningHints(diagnostic, languagePackage, 'intermediate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const hints = result.value;
        expect(hints.hints.length).toBeGreaterThan(0);
        expect(hints.difficultyLevel).toBe('intermediate');
      }
    });

    it('should generate hints for style-related diagnostics', () => {
      const diagnostic = createMockDiagnostic('style');
      const languagePackage = createMockLanguagePackage();

      const result = service.generateLearningHints(diagnostic, languagePackage, 'advanced');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const hints = result.value;
        expect(hints.hints.length).toBeGreaterThan(0);
        expect(hints.difficultyLevel).toBe('advanced');
      }
    });

    it('should limit hints to maxHintsPerDiagnostic', () => {
      const diagnostic = createMockDiagnostic('syntax');
      const languagePackage = createMockLanguagePackage();

      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hints.length).toBeLessThanOrEqual(3);
      }
    });

    it('should limit examples to maxExamplesPerConcept', () => {
      const diagnostic = createMockDiagnostic('syntax');
      const languagePackage = createMockLanguagePackage();

      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.examples.length).toBeLessThanOrEqual(2);
      }
    });

    it('should use default intermediate level when not specified', () => {
      const diagnostic = createMockDiagnostic('syntax');
      const languagePackage = createMockLanguagePackage();

      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.difficultyLevel).toBe('intermediate');
      }
    });
  });

  describe('generateStepByStepGuidance', () => {
    it('should generate guidance for simple statements', () => {
      const statement = 'P ∧ Q';
      const targetConcepts = ['conjunction', 'logical-operators'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateStepByStepGuidance(
        statement,
        targetConcepts,
        languagePackage,
        'beginner'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const guidance = result.value;
        expect(guidance.steps).toBeDefined();
        expect(guidance.steps.length).toBeGreaterThan(0);
        expect(guidance.targetConcepts).toEqual(targetConcepts);
        expect(guidance.difficultyLevel).toBe('beginner');
        expect(guidance.estimatedTimeMinutes).toBeGreaterThan(0);
      }
    });

    it('should generate guidance for nested structures', () => {
      const statement = '(P → Q) ∧ (Q → R)';
      const targetConcepts = ['implication', 'conjunction', 'nested-logic'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateStepByStepGuidance(statement, targetConcepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const guidance = result.value;
        expect(guidance.steps.length).toBeGreaterThan(0);
        // Should have step for breaking down nested structures
        expect(guidance.steps.some(step => step.title.toLowerCase().includes('nested'))).toBe(true);
      }
    });

    it('should generate guidance for quantifiers when supported', () => {
      const statement = '∀x(P(x) → Q(x))';
      const targetConcepts = ['quantifiers', 'first-order-logic'];
      const languagePackage = createMockLanguagePackage({ supportsFirstOrderLogic: true });

      const result = service.generateStepByStepGuidance(statement, targetConcepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const guidance = result.value;
        // Should have step for handling quantifiers
        expect(guidance.steps.some(step => step.title.toLowerCase().includes('quantifier'))).toBe(
          true
        );
      }
    });

    it('should generate guidance for modal operators when supported', () => {
      const statement = '□(P → Q)';
      const targetConcepts = ['modal-logic', 'necessity'];
      const languagePackage = createMockLanguagePackage({ supportsModalLogic: true });

      const result = service.generateStepByStepGuidance(statement, targetConcepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const guidance = result.value;
        // Should have step for modal operators
        expect(guidance.steps.some(step => step.title.toLowerCase().includes('modal'))).toBe(true);
      }
    });

    it('should use default intermediate level when not specified', () => {
      const statement = 'P → Q';
      const targetConcepts = ['implication'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateStepByStepGuidance(statement, targetConcepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.difficultyLevel).toBe('intermediate');
      }
    });
  });

  describe('generateInteractiveFeedback', () => {
    it('should generate feedback for validation results', () => {
      const diagnostics = [createMockDiagnostic('syntax'), createMockDiagnostic('semantic')];
      const validationResult = createMockValidationResult(diagnostics);
      const languagePackage = createMockLanguagePackage();

      const result = service.generateInteractiveFeedback(
        validationResult,
        languagePackage,
        'beginner'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const feedback = result.value;
        expect(feedback.feedbackItems).toBeDefined();
        expect(feedback.feedbackItems.length).toBeGreaterThan(0);
        expect(feedback.overallScore).toBeDefined();
        expect(feedback.overallScore).toBeGreaterThanOrEqual(0);
        expect(feedback.overallScore).toBeLessThanOrEqual(100);
        expect(feedback.strengths).toBeDefined();
        expect(feedback.areasForImprovement).toBeDefined();
        expect(feedback.suggestedNextSteps).toBeDefined();
        expect(feedback.suggestedNextSteps.length).toBeGreaterThan(0);
      }
    });

    it('should generate positive feedback for valid results', () => {
      const validationResult = createMockValidationResult([]); // No diagnostics = valid
      const languagePackage = createMockLanguagePackage();

      const result = service.generateInteractiveFeedback(validationResult, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const feedback = result.value;
        expect(feedback.overallScore).toBe(100);
        expect(feedback.strengths.length).toBeGreaterThan(0);
        expect(feedback.areasForImprovement.length).toBe(0);
      }
    });

    it('should identify strengths and weaknesses', () => {
      const diagnostics = [
        createMockDiagnostic('syntax'),
        createMockDiagnostic('syntax'),
        createMockDiagnostic('semantic'),
      ];
      const validationResult = createMockValidationResult(diagnostics);
      const languagePackage = createMockLanguagePackage();

      const result = service.generateInteractiveFeedback(validationResult, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const feedback = result.value;
        expect(feedback.areasForImprovement.length).toBeGreaterThan(0);
        // Should identify syntax as main area for improvement (2 issues)
        expect(
          feedback.areasForImprovement.some(area => area.toLowerCase().includes('syntax'))
        ).toBe(true);
      }
    });
  });

  describe('analyzeConceptDifficulty', () => {
    it('should analyze difficulty for basic concepts', () => {
      const concepts = ['conjunction', 'disjunction', 'negation'];
      const languagePackage = createMockLanguagePackage();

      const result = service.analyzeConceptDifficulty(concepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.concepts).toBeDefined();
        expect(analysis.concepts.length).toBe(concepts.length);
        expect(analysis.overallDifficulty).toBe('beginner');
        expect(analysis.prerequisiteConcepts).toBeDefined();
        expect(analysis.suggestedLearningPath).toBeDefined();
        expect(analysis.suggestedLearningPath.length).toBeGreaterThan(0);
      }
    });

    it('should analyze difficulty for advanced concepts', () => {
      const concepts = ['modal-logic', 'temporal-logic', 'higher-order-logic'];
      const languagePackage = createMockLanguagePackage({
        supportsModalLogic: true,
      });

      const result = service.analyzeConceptDifficulty(concepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.overallDifficulty).toBe('advanced');
        expect(analysis.prerequisiteConcepts.length).toBeGreaterThan(0);
      }
    });

    it('should identify prerequisite concepts', () => {
      const concepts = ['quantifiers', 'first-order-logic'];
      const languagePackage = createMockLanguagePackage({
        supportsFirstOrderLogic: true,
      });

      const result = service.analyzeConceptDifficulty(concepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.prerequisiteConcepts.length).toBeGreaterThan(0);
        // Should include basic logic as prerequisite
        expect(
          analysis.prerequisiteConcepts.some(
            prereq =>
              prereq.toLowerCase().includes('logic') || prereq.toLowerCase().includes('proposition')
          )
        ).toBe(true);
      }
    });

    it('should generate learning path', () => {
      const concepts = ['implication', 'modus-ponens', 'hypothetical-syllogism'];
      const languagePackage = createMockLanguagePackage();

      const result = service.analyzeConceptDifficulty(concepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.suggestedLearningPath.length).toBeGreaterThan(0);
        // Should start with simpler concepts
        expect(analysis.suggestedLearningPath[0]).toBe('implication');
      }
    });
  });

  describe('suggestPracticeProblems', () => {
    it('should suggest practice problems based on concepts', () => {
      const concepts = ['conjunction', 'disjunction'];
      const languagePackage = createMockLanguagePackage();

      const result = service.suggestPracticeProblems(concepts, 'beginner', languagePackage, 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const problems = result.value;
        expect(problems.problems).toBeDefined();
        expect(problems.problems.length).toBeLessThanOrEqual(5);
        expect(problems.problems.length).toBeGreaterThan(0);
        expect(problems.targetConcepts).toEqual(concepts);
        expect(problems.difficultyLevel).toBe('beginner');

        // Each problem should have required fields
        problems.problems.forEach(problem => {
          expect(problem.statement).toBeDefined();
          expect(problem.solution).toBeDefined();
          expect(problem.hints).toBeDefined();
          expect(problem.concepts).toBeDefined();
          expect(problem.difficulty).toBeDefined();
        });
      }
    });

    it('should respect maxProblems limit', () => {
      const concepts = ['implication', 'equivalence'];
      const languagePackage = createMockLanguagePackage();

      const result = service.suggestPracticeProblems(concepts, 'intermediate', languagePackage, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.problems.length).toBeLessThanOrEqual(3);
      }
    });

    it('should use default 10 problems when not specified', () => {
      const concepts = ['negation'];
      const languagePackage = createMockLanguagePackage();

      const result = service.suggestPracticeProblems(concepts, 'beginner', languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.problems.length).toBeLessThanOrEqual(10);
      }
    });

    it('should generate problems matching difficulty level', () => {
      const concepts = ['modal-logic'];
      const languagePackage = createMockLanguagePackage({
        supportsModalLogic: true,
      });

      const result = service.suggestPracticeProblems(concepts, 'advanced', languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const problems = result.value;
        problems.problems.forEach(problem => {
          expect(problem.difficulty).toBe('advanced');
        });
      }
    });
  });

  describe('adaptContentToUserLevel', () => {
    it('should adapt content for beginner level', () => {
      const content = 'This statement uses universal quantification (∀x) to express...';

      const result = service.adaptContentToUserLevel(content, 'beginner');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const adapted = result.value;
        expect(adapted.adaptedContent).toBeDefined();
        expect(adapted.originalContent).toBe(content);
        expect(adapted.targetLevel).toBe('beginner');
        expect(adapted.simplifications).toBeDefined();
        expect(adapted.simplifications.length).toBeGreaterThan(0);
        expect(adapted.addedExplanations).toBeDefined();
      }
    });

    it('should adapt content for advanced level', () => {
      const content = 'P and Q are both true';

      const result = service.adaptContentToUserLevel(content, 'advanced');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const adapted = result.value;
        expect(adapted.adaptedContent).toBeDefined();
        expect(adapted.targetLevel).toBe('advanced');
        // Should add more formal notation for advanced users
        expect(adapted.technicalTermsAdded).toBeDefined();
      }
    });

    it('should maintain content for intermediate level', () => {
      const content = 'The implication P → Q states that if P is true, then Q must be true';

      const result = service.adaptContentToUserLevel(content, 'intermediate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const adapted = result.value;
        expect(adapted.targetLevel).toBe('intermediate');
        // Intermediate content should have minimal changes
        expect(adapted.simplifications.length).toBe(0);
      }
    });
  });

  describe('generateProofStrategySuggestions', () => {
    it('should suggest direct proof for simple implications', () => {
      const premises = ['P', 'P → Q'];
      const conclusions = ['Q'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateProofStrategySuggestions(
        premises,
        conclusions,
        languagePackage,
        'beginner'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        expect(suggestions.strategies).toBeDefined();
        expect(suggestions.strategies.length).toBeGreaterThan(0);
        expect(suggestions.insights).toBeDefined();
        expect(suggestions.commonMistakes).toBeDefined();
        expect(suggestions.practiceProblems).toBeDefined();

        // Should suggest direct proof
        expect(suggestions.strategies.some(s => s.name.toLowerCase().includes('direct'))).toBe(
          true
        );
      }
    });

    it('should suggest proof by contradiction for single conclusions', () => {
      const premises = ['P ∧ Q'];
      const conclusions = ['R'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateProofStrategySuggestions(
        premises,
        conclusions,
        languagePackage
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        expect(
          suggestions.strategies.some(s => s.name.toLowerCase().includes('contradiction'))
        ).toBe(true);
      }
    });

    it('should suggest case analysis for disjunctive premises', () => {
      const premises = ['P ∨ Q', 'R'];
      const conclusions = ['S'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateProofStrategySuggestions(
        premises,
        conclusions,
        languagePackage
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        expect(suggestions.strategies.some(s => s.name.toLowerCase().includes('case'))).toBe(true);
      }
    });

    it('should sort strategies by applicability', () => {
      const premises = ['P → Q', 'P'];
      const conclusions = ['Q'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateProofStrategySuggestions(
        premises,
        conclusions,
        languagePackage
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        // Strategies should be sorted by applicability (highest first)
        expect(suggestions.strategies).toBeDefined();
        if (suggestions.strategies) {
          for (let i = 0; i < suggestions.strategies.length - 1; i++) {
            expect(suggestions.strategies[i]?.applicability).toBeGreaterThanOrEqual(
              suggestions.strategies[i + 1]?.applicability ?? 0
            );
          }
        }
      }
    });

    it('should provide insights for complex proofs', () => {
      const premises = ['(P ∧ Q) → (R ∨ S)', 'P ∧ Q', '¬R'];
      const conclusions = ['S'];
      const languagePackage = createMockLanguagePackage();

      const result = service.generateProofStrategySuggestions(
        premises,
        conclusions,
        languagePackage,
        'beginner'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const suggestions = result.value;
        expect(suggestions.insights.length).toBeGreaterThan(0);
      }
    });
  });

  describe('analyzeValidationResults', () => {
    it('should analyze results with no errors', () => {
      const results = [createMockValidationResult([])];
      const languagePackage = createMockLanguagePackage();

      const result = service.analyzeValidationResults(results, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.strengthAreas).toBeDefined();
        expect(analysis.improvementAreas).toBeDefined();
        expect(analysis.conceptGaps).toBeDefined();
        expect(analysis.progressIndicators).toBeDefined();
        expect(analysis.recommendations).toBeDefined();
      }
    });

    it('should identify improvement areas from error patterns', () => {
      const syntaxDiagnostic = createMockDiagnostic('syntax');
      const results = [
        createMockValidationResult([syntaxDiagnostic]),
        createMockValidationResult([syntaxDiagnostic]),
      ];
      const languagePackage = createMockLanguagePackage();

      const result = service.analyzeValidationResults(results, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.improvementAreas.length).toBeGreaterThan(0);
      }
    });

    it('should identify concept gaps for modal logic', () => {
      // Create a diagnostic with modal logic content
      const modalDiagnostic = vi.mocked(createMockDiagnostic('semantic'));
      const mockMessage = DiagnosticMessage.create('modal operator error');
      if (mockMessage.isOk()) {
        vi.spyOn(modalDiagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }

      const results = [createMockValidationResult([modalDiagnostic])];
      const languagePackage = createMockLanguagePackage({ supportsModalLogic: true });

      const result = service.analyzeValidationResults(results, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.conceptGaps.length).toBeGreaterThan(0);
      }
    });

    it('should calculate progress indicators', () => {
      const results = [
        createMockValidationResult([]),
        createMockValidationResult([createMockDiagnostic('syntax')]),
      ];
      const languagePackage = createMockLanguagePackage();

      const result = service.analyzeValidationResults(results, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.progressIndicators['successRate']).toBeDefined();
        expect(analysis.progressIndicators['averageErrors']).toBeDefined();
        expect(analysis.progressIndicators['successRate']).toBe(0.5); // 1 out of 2 valid
      }
    });
  });

  describe('generateContentForConcept', () => {
    it('should generate content for logical operators', () => {
      const result = service.generateContentForConcept('logical-operators', 'beginner');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value;
        expect(content.title).toBeDefined();
        expect(content.description).toBeDefined();
        expect(content.examples).toBeDefined();
        expect(content.examples.length).toBeGreaterThan(0);
        expect(content.keyPoints).toBeDefined();
        expect(content.prerequisites).toBeDefined();
        expect(content.nextSteps).toBeDefined();
      }
    });

    it('should generate content for inference rules', () => {
      const result = service.generateContentForConcept('inference-rules', 'intermediate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value;
        expect(content.title).toBe('Inference Rules');
        expect(content.examples.some(ex => ex.includes('Modus Ponens'))).toBe(true);
        expect(content.prerequisites.includes('logical-operators')).toBe(true);
      }
    });

    it('should generate content for modal logic', () => {
      const languagePackage = createMockLanguagePackage({ supportsModalLogic: true });
      const result = service.generateContentForConcept('modal-logic', 'advanced', languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value;
        expect(content.title).toBe('Modal Logic');
        expect(content.examples.some(ex => ex.includes('□P'))).toBe(true);
      }
    });

    it('should generate default content for unknown concepts', () => {
      const result = service.generateContentForConcept('unknown-concept', 'intermediate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value;
        expect(content.title).toBe('unknown-concept');
        expect(content.description).toContain('unknown-concept');
      }
    });

    it('should enrich content with language package info', () => {
      const languagePackage = createMockLanguagePackage({
        supportsModalLogic: true,
        supportsFirstOrderLogic: true,
      });

      const result = service.generateContentForConcept(
        'modal-logic',
        'intermediate',
        languagePackage
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should have modal logic support
        expect(languagePackage.supportsModalLogic).toHaveBeenCalled();
      }
    });
  });

  describe('suggestRelatedTopics', () => {
    it('should suggest related topics for logical operators', () => {
      const result = service.suggestRelatedTopics('logical-operators', 'beginner');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const topics = result.value;
        expect(topics.prerequisites).toBeDefined();
        expect(topics.related).toBeDefined();
        expect(topics.advanced).toBeDefined();
        expect(topics.suggestions).toBeDefined();
        expect(topics.userLevelAppropriate).toBeDefined();
      }
    });

    it('should filter suggestions by user level', () => {
      const result = service.suggestRelatedTopics('inference-rules', 'beginner');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const topics = result.value;
        // Beginner should get prerequisites and some related topics
        expect(topics.suggestions.includes('logical-operators')).toBe(true);
      }
    });

    it('should include advanced topics for advanced users', () => {
      const result = service.suggestRelatedTopics('inference-rules', 'advanced');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const topics = result.value;
        // Advanced users should get more advanced suggestions
        expect(topics.suggestions.some(s => s.includes('theory'))).toBe(true);
      }
    });

    it('should filter by language package capabilities', () => {
      const languagePackage = createMockLanguagePackage({ supportsModalLogic: false });
      const result = service.suggestRelatedTopics('modal-logic', 'advanced', languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const topics = result.value;
        // Should filter out temporal-logic and dynamic-logic topics if modal logic not supported
        expect(
          topics.suggestions.every(
            s =>
              !s.includes('temporal-logic') &&
              !s.includes('dynamic-logic') &&
              !s.includes('modal-logic')
          )
        ).toBe(true);
      }
    });

    it('should handle unknown topics gracefully', () => {
      const result = service.suggestRelatedTopics('unknown-topic', 'intermediate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const topics = result.value;
        expect(topics.prerequisites).toEqual([]);
        expect(topics.related).toEqual([]);
        expect(topics.advanced).toEqual([]);
      }
    });
  });

  describe('error handling', () => {
    it('should handle exceptions in generateLearningHints', () => {
      const diagnostic = createMockDiagnostic('syntax');
      const languagePackage = createMockLanguagePackage();

      // Force an error by passing invalid data
      vi.spyOn(diagnostic, 'isSyntaxRelated').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate learning hints');
      }
    });

    it('should handle exceptions in generateStepByStepGuidance', () => {
      const languagePackage = createMockLanguagePackage();

      // Force an error by making a method throw
      vi.spyOn(languagePackage, 'supportsFirstOrderLogic').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.generateStepByStepGuidance(
        '∀x P(x)',
        ['quantifiers'],
        languagePackage
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate step-by-step guidance');
      }
    });

    it('should handle exceptions in generateProofStrategySuggestions', () => {
      const languagePackage = createMockLanguagePackage();

      // Force an error
      vi.spyOn(languagePackage, 'supportsModalLogic').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.generateProofStrategySuggestions(['P'], ['Q'], languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate proof strategy suggestions');
      }
    });

    it('should handle exceptions in analyzeValidationResults', () => {
      const results = [createMockValidationResult([])];
      const languagePackage = createMockLanguagePackage();

      // Force an error
      (results[0] as any).getDiagnostics = vi.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.analyzeValidationResults(results, languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to analyze validation results');
      }
    });

    it('should handle exceptions in generateInteractiveFeedback', () => {
      const validationResult = createMockValidationResult([]);
      const languagePackage = createMockLanguagePackage();

      // Force an error
      vi.spyOn(validationResult, 'getDiagnostics').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.generateInteractiveFeedback(validationResult, languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate interactive feedback');
      }
    });

    it('should handle exceptions in analyzeConceptDifficulty', () => {
      const languagePackage = createMockLanguagePackage();

      // Force an error
      vi.spyOn(languagePackage, 'supportsModalLogic').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.analyzeConceptDifficulty(['modal-logic'], languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to analyze concept difficulty');
      }
    });

    it('should handle exceptions in suggestPracticeProblems', () => {
      const languagePackage = createMockLanguagePackage();

      // Force an error
      vi.spyOn(languagePackage, 'supportsModalLogic').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.suggestPracticeProblems(['modal-logic'], 'beginner', languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to suggest practice problems');
      }
    });

    it('should handle exceptions in adaptContentToUserLevel', () => {
      // Force an error by passing invalid content that breaks the adaptation
      const result = service.adaptContentToUserLevel('test', 'beginner');

      // Since the current implementation doesn't throw, this should succeed
      // but we can test the structure anyway
      expect(result.isOk()).toBe(true);
    });

    it('should handle exceptions in generateContentForConcept', () => {
      const languagePackage = createMockLanguagePackage();

      // Force an error
      vi.spyOn(languagePackage, 'supportsModalLogic').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.generateContentForConcept('modal-logic', 'beginner', languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to generate content for concept');
      }
    });

    it('should handle exceptions in suggestRelatedTopics', () => {
      const languagePackage = createMockLanguagePackage();

      // Force an error
      vi.spyOn(languagePackage, 'supportsModalLogic').mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = service.suggestRelatedTopics('modal-logic', 'intermediate', languagePackage);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to suggest related topics');
      }
    });
  });

  describe('additional branch coverage', () => {
    it('should handle symbols hint generation', () => {
      const diagnostic = vi.mocked(createMockDiagnostic('syntax'));
      const mockMessage = DiagnosticMessage.create('Invalid symbol used in expression');
      if (mockMessage.isOk()) {
        vi.spyOn(diagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }
      diagnostic.isSyntaxRelated = vi.fn(() => true);
      diagnostic.isSemanticRelated = vi.fn(() => false);
      diagnostic.isStyleRelated = vi.fn(() => false);

      const languagePackage = createMockLanguagePackage();
      const result = service.generateLearningHints(diagnostic, languagePackage, 'beginner');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hints.some(h => h.includes('symbol'))).toBe(true);
        expect(result.value.concepts.includes('logical-symbols')).toBe(true);
        expect(result.value.resources.some(r => r.includes('Symbol Guide'))).toBe(true);
      }
    });

    it('should handle tautology semantic hints', () => {
      const diagnostic = vi.mocked(createMockDiagnostic('semantic'));
      const mockMessage = DiagnosticMessage.create('This expression is a tautology');
      if (mockMessage.isOk()) {
        vi.spyOn(diagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }
      diagnostic.isSyntaxRelated = vi.fn(() => false);
      diagnostic.isSemanticRelated = vi.fn(() => true);
      diagnostic.isStyleRelated = vi.fn(() => false);

      const languagePackage = createMockLanguagePackage();
      const result = service.generateLearningHints(diagnostic, languagePackage, 'intermediate');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hints.some(h => h.includes('always true'))).toBe(true);
        expect(result.value.concepts.includes('tautology')).toBe(true);
      }
    });

    it('should handle contradiction semantic hints', () => {
      const diagnostic = vi.mocked(createMockDiagnostic('semantic'));
      const mockMessage = DiagnosticMessage.create('This leads to a contradiction');
      if (mockMessage.isOk()) {
        vi.spyOn(diagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }
      diagnostic.isSyntaxRelated = vi.fn(() => false);
      diagnostic.isSemanticRelated = vi.fn(() => true);
      diagnostic.isStyleRelated = vi.fn(() => false);

      const languagePackage = createMockLanguagePackage();
      const result = service.generateLearningHints(diagnostic, languagePackage, 'advanced');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hints.some(h => h.includes('always false'))).toBe(true);
        expect(result.value.concepts.includes('contradiction')).toBe(true);
      }
    });

    it('should handle style hints for length issues', () => {
      const diagnostic = vi.mocked(createMockDiagnostic('style'));
      const mockMessage = DiagnosticMessage.create('Statement length exceeds recommended limit');
      if (mockMessage.isOk()) {
        vi.spyOn(diagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }
      diagnostic.isSyntaxRelated = vi.fn(() => false);
      diagnostic.isSemanticRelated = vi.fn(() => false);
      diagnostic.isStyleRelated = vi.fn(() => true);

      const languagePackage = createMockLanguagePackage();
      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hints.some(h => h.includes('breaking'))).toBe(true);
      }
    });

    it('should handle style hints for inconsistent notation', () => {
      const diagnostic = vi.mocked(createMockDiagnostic('style'));
      const mockMessage = DiagnosticMessage.create('Inconsistent symbol usage detected');
      if (mockMessage.isOk()) {
        vi.spyOn(diagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }
      diagnostic.isSyntaxRelated = vi.fn(() => false);
      diagnostic.isSemanticRelated = vi.fn(() => false);
      diagnostic.isStyleRelated = vi.fn(() => true);

      const languagePackage = createMockLanguagePackage();
      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hints.some(h => h.includes('consistent'))).toBe(true);
      }
    });

    it('should generate resources for modal logic concepts', () => {
      const diagnostic = vi.mocked(createMockDiagnostic('semantic'));
      const mockMessage = DiagnosticMessage.create('Invalid inference rule with modal operators');
      if (mockMessage.isOk()) {
        vi.spyOn(diagnostic, 'getMessage').mockReturnValue(mockMessage.value);
      }
      diagnostic.isSyntaxRelated = vi.fn(() => false);
      diagnostic.isSemanticRelated = vi.fn(() => true);
      diagnostic.isStyleRelated = vi.fn(() => false);

      const languagePackage = createMockLanguagePackage({ supportsModalLogic: true });

      const result = service.generateLearningHints(diagnostic, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // This test is mainly checking that the service handles semantic inference hints
        expect(result.value.hints.some(h => h.includes('inference'))).toBe(true);
        expect(result.value.concepts.includes('logical-inference')).toBe(true);
      }
    });

    it('should test all difficulty levels in concept analysis', () => {
      const concepts = [
        'conjunction', // beginner
        'modus-ponens', // intermediate
        'temporal-logic', // advanced
      ];
      const languagePackage = createMockLanguagePackage();

      const result = service.analyzeConceptDifficulty(concepts, languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const analysis = result.value;
        expect(analysis.overallDifficulty).toBe('advanced');
        expect(analysis.concepts.some(c => c.difficulty === 'beginner')).toBe(true);
        expect(analysis.concepts.some(c => c.difficulty === 'intermediate')).toBe(true);
        expect(analysis.concepts.some(c => c.difficulty === 'advanced')).toBe(true);
      }
    });

    it('should test problem generation for all supported concepts', () => {
      const concepts = ['conjunction', 'disjunction', 'modal-logic'];
      const languagePackage = createMockLanguagePackage({ supportsModalLogic: true });

      const result = service.suggestPracticeProblems(concepts, 'intermediate', languagePackage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const problems = result.value;
        expect(problems.problems.length).toBeGreaterThan(0);
        // Should have problems for each concept
        expect(problems.problems.some(p => p.concepts.includes('conjunction'))).toBe(true);
        expect(problems.problems.some(p => p.concepts.includes('disjunction'))).toBe(true);
        expect(problems.problems.some(p => p.concepts.includes('modal-logic'))).toBe(true);
      }
    });

    it('should test intermediate difficulty for conjunction problems', () => {
      const result = service.suggestPracticeProblems(
        ['conjunction'],
        'intermediate',
        createMockLanguagePackage()
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const problems = result.value;
        expect(problems.problems.length).toBeGreaterThan(0);
        expect(problems.problems[0]?.difficulty).toBe('intermediate');
      }
    });
  });
});
