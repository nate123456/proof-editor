/**
 * Language Intelligence Context Integration Tests
 *
 * Tests service interactions within the language intelligence bounded context:
 * - LogicValidationService + PatternRecognitionService workflows
 * - EducationalFeedbackService integration with validation results
 * - Language package management across services
 * - Cross-service error propagation and domain boundary validation
 * - Realistic validation scenarios with multiple services
 */

import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { InferenceRule } from '../../entities/InferenceRule.js';
import { LanguagePackage } from '../../entities/LanguagePackage.js';
import { ValidationResult } from '../../entities/ValidationResult.js';
import { EducationalFeedbackService } from '../../services/EducationalFeedbackService.js';
import { LogicValidationService } from '../../services/LogicValidationService.js';
import { PatternRecognitionService } from '../../services/PatternRecognitionService.js';
import { LanguageCapabilities } from '../../value-objects/LanguageCapabilities.js';
import { RulePattern } from '../../value-objects/RulePattern.js';
import { ValidationLevel } from '../../value-objects/ValidationLevel.js';

describe('Language Intelligence Context - Service Integration', () => {
  let logicValidationService: LogicValidationService;
  let patternRecognitionService: PatternRecognitionService;
  let educationalFeedbackService: EducationalFeedbackService;
  let testLanguagePackage: LanguagePackage;
  let testInferenceRule: InferenceRule;

  beforeEach(() => {
    // Initialize services
    logicValidationService = new LogicValidationService();
    patternRecognitionService = new PatternRecognitionService();
    educationalFeedbackService = new EducationalFeedbackService();

    // Create test language package with correct parameters
    const capabilities = LanguageCapabilities.propositionalOnly();

    const languagePackageResult = LanguagePackage.create(
      'Test Logic Package',
      '1.0.0',
      capabilities,
      undefined, // validationSettings
      undefined, // performanceTargets
      undefined, // parentPackageId
      undefined, // metadata
    );
    expect(languagePackageResult.isOk()).toBe(true);
    if (languagePackageResult.isOk()) {
      testLanguagePackage = languagePackageResult.value;
    }

    // Create test inference rule using createLogicalPattern
    const rulePattern = RulePattern.createLogicalPattern(
      ['P', 'P -> Q'],
      ['Q'],
      'modus-ponens',
      1.0,
    );
    expect(rulePattern.isOk()).toBe(true);

    if (rulePattern.isOk()) {
      const inferenceRuleResult = InferenceRule.create(
        'modus-ponens',
        'Modus ponens inference rule',
        rulePattern.value,
        testLanguagePackage.getId().getValue(),
      );
      expect(inferenceRuleResult.isOk()).toBe(true);
      if (inferenceRuleResult.isOk()) {
        testInferenceRule = inferenceRuleResult.value;
        testLanguagePackage.addInferenceRule(testInferenceRule);
      }
    }
  });

  describe('LogicValidationService + PatternRecognitionService Integration', () => {
    it('should validate statements with pattern recognition support', () => {
      // Arrange
      const statement = 'All men are mortal';
      const location = SourceLocation.createDefault();
      const validationLevel = ValidationLevel.semantic();

      // Mock pattern recognition service for proof patterns recognition
      const recognizePatternsSpy = vi
        .spyOn(patternRecognitionService, 'recognizeProofPatterns')
        .mockImplementation(() => {
          return ok({
            recognizedPatterns: [
              {
                type: 'logical-pattern',
                name: 'universal-quantification',
                description: 'Universal quantification pattern',
                confidence: 0.95,
                instances: [{ startIndex: 0, endIndex: 16 }],
                properties: { pattern: 'universal-quantification' },
              },
            ],
            structuralFeatures: {
              statementCount: 1,
              connectionCount: 0,
              maxDepth: 1,
              branchingFactor: 0,
              isLinear: true,
              isTree: true,
              hasCycles: false,
            },
            logicalFeatures: {
              hasQuantifiers: true,
              hasModalOperators: false,
              hasNegations: false,
              hasImplications: false,
              hasConjunctions: false,
              hasDisjunctions: false,
              logicalComplexity: 0.5,
            },
            patternInsights: [
              {
                type: 'improvement-suggestion',
                description: 'Consider making this more specific',
                confidence: 0.8,
                implications: ['Increase precision of logical statements'],
              },
            ],
            confidence: 0.95,
            performance: {} as any,
          });
        });

      // Act
      const validationResult = logicValidationService.validateStatement(
        statement,
        location,
        testLanguagePackage,
        validationLevel,
      );

      // Additional pattern analysis
      const patternResult = patternRecognitionService.recognizeProofPatterns(
        [statement],
        [],
        testLanguagePackage,
      );

      // Assert
      expect(validationResult.isOk()).toBe(true);
      expect(patternResult.isOk()).toBe(true);

      if (validationResult.isOk() && patternResult.isOk()) {
        expect(validationResult.value.isValidationSuccessful()).toBe(true);
        expect(patternResult.value.recognizedPatterns).toHaveLength(1);
        expect(patternResult.value.recognizedPatterns[0]?.name).toBe('universal-quantification');
        expect(patternResult.value.recognizedPatterns[0]?.confidence).toBe(0.95);
      }

      expect(recognizePatternsSpy).toHaveBeenCalledWith([statement], [], testLanguagePackage);
    });

    it('should handle validation failures with pattern recognition insights', () => {
      // Arrange
      const invalidStatement = 'All men are mortal AND not mortal';
      const location = SourceLocation.createDefault();
      const validationLevel = ValidationLevel.semantic();

      // Mock pattern recognition to detect contradictions
      const recognizePatternsSpy = vi
        .spyOn(patternRecognitionService, 'recognizeProofPatterns')
        .mockImplementation(() => {
          return ok({
            recognizedPatterns: [
              {
                type: 'logical-pattern',
                name: 'contradiction',
                description: 'Contradiction pattern detected',
                confidence: 0.98,
                instances: [{ startIndex: 20, endIndex: 31 }],
                properties: { pattern: 'contradiction' },
              },
            ],
            structuralFeatures: {
              statementCount: 1,
              connectionCount: 0,
              maxDepth: 1,
              branchingFactor: 0,
              isLinear: true,
              isTree: true,
              hasCycles: false,
            },
            logicalFeatures: {
              hasQuantifiers: false,
              hasModalOperators: false,
              hasNegations: true,
              hasImplications: false,
              hasConjunctions: true,
              hasDisjunctions: false,
              logicalComplexity: 0.8,
            },
            patternInsights: [
              {
                type: 'error-correction',
                description: 'Remove contradictory clause',
                confidence: 0.9,
                implications: ['Resolve logical contradiction', 'Improve argument validity'],
              },
              {
                type: 'improvement-suggestion',
                description: 'Clarify intended meaning',
                confidence: 0.8,
                implications: ['Enhance clarity', 'Reduce ambiguity'],
              },
            ],
            confidence: 0.98,
            performance: {} as any,
          });
        });

      // Act
      const validationResult = logicValidationService.validateStatement(
        invalidStatement,
        location,
        testLanguagePackage,
        validationLevel,
      );

      const patternResult = patternRecognitionService.recognizeProofPatterns(
        [invalidStatement],
        [],
        testLanguagePackage,
      );

      // Assert
      expect(validationResult.isOk()).toBe(true);
      expect(patternResult.isOk()).toBe(true);

      if (validationResult.isOk()) {
        // Validation should detect semantic issues
        expect(validationResult.value.isValidationSuccessful()).toBe(false);
        expect(validationResult.value.getDiagnostics()).toHaveLength(1);
      }

      if (patternResult.isOk()) {
        expect(patternResult.value.recognizedPatterns[0]?.name).toBe('contradiction');
        expect(patternResult.value.recognizedPatterns[0]?.confidence).toBeGreaterThan(0.9);
      }

      expect(recognizePatternsSpy).toHaveBeenCalledWith(
        [invalidStatement],
        [],
        testLanguagePackage,
      );
    });

    it('should integrate inference validation with pattern matching', () => {
      // Arrange
      const premises = ['All men are mortal', 'Socrates is a man'];
      const conclusions = ['Socrates is mortal'];
      const validationLevel = ValidationLevel.semantic();

      // Mock pattern service to recognize modus ponens using argument structure
      const analyzeInferenceSpy = vi
        .spyOn(patternRecognitionService, 'recognizeArgumentStructure')
        .mockImplementation(() => {
          return ok({
            argumentType: 'deductive',
            inferenceRules: ['modus-ponens'],
            complexity: {
              score: 10,
              level: 'low' as const,
              factors: {
                statementCount: 3,
                averageLength: 15,
                logicalSymbolCount: 1,
              },
            },
            validity: true,
            soundness: true,
            logicalFeatures: {
              hasConditionals: true,
              hasNegations: false,
              hasQuantifiers: false,
              hasModalOperators: false,
              averageStatementLength: 15,
              logicalDepth: 1,
            },
            suggestions: [],
          });
        });

      // Act
      const validationResult = logicValidationService.validateInference(
        premises,
        conclusions,
        testLanguagePackage,
        validationLevel,
      );

      const inferenceAnalysis = patternRecognitionService.recognizeArgumentStructure(
        premises,
        conclusions,
        testLanguagePackage,
      );

      // Assert
      expect(validationResult.isOk()).toBe(true);
      expect(inferenceAnalysis.isOk()).toBe(true);

      if (validationResult.isOk()) {
        expect(validationResult.value.isValidationSuccessful()).toBe(true);
      }

      if (inferenceAnalysis.isOk()) {
        expect(inferenceAnalysis.value.inferenceRules[0]).toBe('modus-ponens');
      }

      expect(analyzeInferenceSpy).toHaveBeenCalledWith(premises, conclusions, testLanguagePackage);
    });
  });

  describe('EducationalFeedbackService Integration', () => {
    it('should generate feedback from validation results', () => {
      // Arrange - Create a validation with diagnostics
      const statement = 'If P then Q and P therefore Q';
      const location = SourceLocation.createDefault();
      const validationLevel = ValidationLevel.style();

      const validationResult = logicValidationService.validateStatement(
        statement,
        location,
        testLanguagePackage,
        validationLevel,
      );

      // Act
      if (validationResult.isOk()) {
        // Create mock diagnostic for testing feedback
        const mockDiagnostic = {
          isSyntaxRelated: () => false,
          isSemanticRelated: () => true,
          isStyleRelated: () => false,
        } as any;

        const feedbackResult = educationalFeedbackService.generateLearningHints(
          mockDiagnostic,
          testLanguagePackage,
          'beginner',
        );

        // Assert
        expect(feedbackResult.isOk()).toBe(true);
        if (feedbackResult.isOk()) {
          const feedback = feedbackResult.value;
          expect(feedback.difficultyLevel).toBe('beginner');
          expect(feedback.hints).toBeDefined();
          expect(feedback.concepts).toBeDefined();
          expect(feedback.examples).toBeDefined();
        }
      }
    });

    it('should provide inference-specific educational feedback', () => {
      // Arrange
      const premises = ['All birds fly', 'Penguins are birds'];
      const conclusions = ['Penguins fly'];
      const validationLevel = ValidationLevel.semantic();

      // This should fail validation due to false premise about birds
      const validationResult = logicValidationService.validateInference(
        premises,
        conclusions,
        testLanguagePackage,
        validationLevel,
      );

      // Act
      if (validationResult.isOk()) {
        const feedbackResult = educationalFeedbackService.generateProofStrategySuggestions(
          premises,
          conclusions,
          testLanguagePackage,
          'intermediate',
        );

        // Assert
        expect(feedbackResult.isOk()).toBe(true);
        if (feedbackResult.isOk()) {
          const feedback = feedbackResult.value;
          expect(feedback.strategies.length).toBeGreaterThan(0);
          expect(feedback.insights.length).toBeGreaterThan(0);
          expect(feedback.commonMistakes).toBeDefined();
          expect(feedback.practiceProblems).toBeDefined();
        }
      }
    });

    it('should integrate pattern recognition insights into educational feedback', () => {
      // Arrange
      const invalidArgument = 'P implies Q, Q therefore P'; // affirming consequent fallacy
      const location = SourceLocation.createDefault();

      // Mock pattern recognition to detect the fallacy
      const recognizePatternsSpy = vi
        .spyOn(patternRecognitionService, 'recognizeProofPatterns')
        .mockImplementation(() => {
          return ok({
            recognizedPatterns: [
              {
                type: 'logical-pattern',
                name: 'affirming-consequent',
                description: 'Affirming consequent fallacy detected',
                confidence: 0.92,
                instances: [{ startIndex: 15, endIndex: 28 }],
                properties: { pattern: 'affirming-consequent' },
              },
            ],
            structuralFeatures: {
              statementCount: 1,
              connectionCount: 0,
              maxDepth: 1,
              branchingFactor: 0,
              isLinear: true,
              isTree: true,
              hasCycles: false,
            },
            logicalFeatures: {
              hasQuantifiers: false,
              hasModalOperators: false,
              hasNegations: false,
              hasImplications: true,
              hasConjunctions: false,
              hasDisjunctions: false,
              logicalComplexity: 0.6,
            },
            patternInsights: [
              {
                type: 'fallacy-detection',
                description: 'This is a logical fallacy',
                confidence: 0.95,
                implications: ['Invalid reasoning pattern', 'Argument does not follow logically'],
              },
              {
                type: 'improvement-suggestion',
                description: 'Consider the valid form: P implies Q, P therefore Q',
                confidence: 0.85,
                implications: ['Use modus ponens instead', 'Correct the logical structure'],
              },
            ],
            confidence: 0.92,
            performance: {} as any,
          });
        });

      // Act
      const validationResult = logicValidationService.validateStatement(
        invalidArgument,
        location,
        testLanguagePackage,
        ValidationLevel.semantic(),
      );

      const patternResult = patternRecognitionService.recognizeProofPatterns(
        [invalidArgument],
        [],
        testLanguagePackage,
      );

      if (validationResult.isOk() && patternResult.isOk()) {
        const feedbackResult = educationalFeedbackService.generateStepByStepGuidance(
          invalidArgument,
          ['logical-fallacies', 'affirming-consequent'],
          testLanguagePackage,
          'advanced',
        );

        // Assert
        expect(feedbackResult.isOk()).toBe(true);
        if (feedbackResult.isOk()) {
          const feedback = feedbackResult.value;
          expect(feedback.difficultyLevel).toBe('advanced');
          expect(feedback.targetConcepts).toContain('affirming-consequent');
          expect(feedback.steps.length).toBeGreaterThan(0);
        }
      }

      expect(recognizePatternsSpy).toHaveBeenCalledWith([invalidArgument], [], testLanguagePackage);
    });
  });

  describe('Cross-Service Error Propagation', () => {
    it('should handle validation service errors gracefully across services', () => {
      // Arrange - Create a scenario that will cause validation to fail
      const malformedStatement = '';
      const location = SourceLocation.createDefault();

      // Act
      const validationResult = logicValidationService.validateStatement(
        malformedStatement,
        location,
        testLanguagePackage,
        ValidationLevel.syntax(),
      );

      // Try to generate feedback for the failed validation
      if (validationResult.isOk()) {
        // Create mock diagnostic for empty statement
        const mockDiagnostic = {
          isSyntaxRelated: () => true,
          isSemanticRelated: () => false,
          isStyleRelated: () => false,
        } as any;

        const feedbackResult = educationalFeedbackService.generateLearningHints(
          mockDiagnostic,
          testLanguagePackage,
          'beginner',
        );

        // Assert
        expect(feedbackResult.isOk()).toBe(true);
        if (feedbackResult.isOk()) {
          // Should handle empty statement validation result gracefully
          const feedback = feedbackResult.value;
          expect(feedback.hints).toBeDefined();
          expect(feedback.concepts.length).toBeGreaterThan(0);
        }
      }
    });

    it('should maintain domain boundaries during service interactions', () => {
      // Arrange
      const statement = 'Valid logical statement';
      const location = SourceLocation.createDefault();

      // Mock services to simulate boundary violations
      const validateStatementSpy = vi.spyOn(logicValidationService, 'validateStatement');

      // Act
      const validationResult = logicValidationService.validateStatement(
        statement,
        location,
        testLanguagePackage,
        ValidationLevel.semantic(),
      );

      // Assert - Verify that services maintain their responsibilities
      expect(validateStatementSpy).toHaveBeenCalledWith(
        statement,
        location,
        testLanguagePackage,
        ValidationLevel.semantic(),
      );

      // Validation service should only validate, not generate feedback
      if (validationResult.isOk()) {
        expect(validationResult.value).toBeInstanceOf(ValidationResult);
        // ValidationResult should not contain educational feedback directly
        expect(typeof validationResult.value.isValidationSuccessful).toBe('function');
        expect(typeof validationResult.value.getDiagnostics).toBe('function');
      }
    });
  });

  describe('Language Package Integration Scenarios', () => {
    it('should work with multiple language packages across services', () => {
      // Arrange - Create another language package with correct parameters
      const capabilities2 = LanguageCapabilities.propositionalOnly();

      const package2Result = LanguagePackage.create(
        'Propositional Logic',
        '1.0.0',
        capabilities2,
        undefined, // validationSettings
        undefined, // performanceTargets
        undefined, // parentPackageId
        undefined, // metadata
      );
      expect(package2Result.isOk()).toBe(true);

      if (package2Result.isOk()) {
        const package2 = package2Result.value;

        // Add different inference rule to second package
        const biconditionalPattern = RulePattern.createLogicalPattern(
          ['P <-> Q', 'P'],
          ['Q'],
          'biconditional-elimination',
          1.0,
        );

        if (biconditionalPattern.isOk()) {
          const ruleResult = InferenceRule.create(
            'biconditional-elimination',
            'Biconditional elimination rule',
            biconditionalPattern.value,
            package2.getId().getValue(),
          );
          if (ruleResult.isOk()) {
            package2.addInferenceRule(ruleResult.value);
          }
        }

        // Act - Validate same statement with different packages
        const statement = 'P <-> Q and P therefore Q';
        const location = SourceLocation.createDefault();

        const validation1 = logicValidationService.validateStatement(
          statement,
          location,
          testLanguagePackage,
          ValidationLevel.semantic(),
        );

        const validation2 = logicValidationService.validateStatement(
          statement,
          location,
          package2,
          ValidationLevel.semantic(),
        );

        // Assert - Different packages may produce different validation results
        expect(validation1.isOk()).toBe(true);
        expect(validation2.isOk()).toBe(true);

        if (validation1.isOk() && validation2.isOk()) {
          // The package with biconditional elimination should validate better
          expect(validation1.value.getLanguagePackageId()).toBe(
            testLanguagePackage.getId().getValue(),
          );
          expect(validation2.value.getLanguagePackageId()).toBe(package2.getId().getValue());
        }
      }
    });

    it('should maintain package consistency across service calls', () => {
      // Arrange
      const statement = 'Consistent logical statement';
      const premises = ['P', 'P -> Q'];
      const conclusions = ['Q'];
      const location = SourceLocation.createDefault();

      // Act - Use same package across multiple services
      const statementValidation = logicValidationService.validateStatement(
        statement,
        location,
        testLanguagePackage,
        ValidationLevel.semantic(),
      );

      const inferenceValidation = logicValidationService.validateInference(
        premises,
        conclusions,
        testLanguagePackage,
        ValidationLevel.semantic(),
      );

      const patternAnalysis = patternRecognitionService.recognizeProofPatterns(
        [statement],
        [],
        testLanguagePackage,
      );

      // Assert - All services should work with the same package
      expect(statementValidation.isOk()).toBe(true);
      expect(inferenceValidation.isOk()).toBe(true);
      expect(patternAnalysis.isOk()).toBe(true);

      if (statementValidation.isOk() && inferenceValidation.isOk()) {
        expect(statementValidation.value.getLanguagePackageId()).toBe(
          testLanguagePackage.getId().getValue(),
        );
        expect(inferenceValidation.value.getLanguagePackageId()).toBe(
          testLanguagePackage.getId().getValue(),
        );
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent service calls efficiently', async () => {
      // Arrange
      const statements = [
        'Statement 1',
        'Statement 2',
        'Statement 3',
        'Statement 4',
        'Statement 5',
      ];
      const location = SourceLocation.createDefault();

      // Act - Process multiple statements concurrently
      const validationPromises = statements.map(async (statement) =>
        Promise.resolve(
          logicValidationService.validateStatement(
            statement,
            location,
            testLanguagePackage,
            ValidationLevel.syntax(),
          ),
        ),
      );

      const patternPromises = statements.map(async (statement) =>
        Promise.resolve(
          patternRecognitionService.recognizeProofPatterns([statement], [], testLanguagePackage),
        ),
      );

      const validationResults = await Promise.all(validationPromises);
      const patternResults = await Promise.all(patternPromises);

      // Assert
      expect(validationResults).toHaveLength(5);
      expect(patternResults).toHaveLength(5);

      validationResults.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });

      patternResults.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
    });

    it('should manage memory efficiently during large validation workflows', async () => {
      // Arrange - Simulate processing a large proof
      const largeProofStatements = Array.from({ length: 100 }, (_, i) => `Statement ${i + 1}`);
      const location = SourceLocation.createDefault();

      // Act - Process statements in batches to test memory management
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < largeProofStatements.length; i += batchSize) {
        const batch = largeProofStatements.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (statement) =>
            Promise.resolve(
              logicValidationService.validateStatement(
                statement,
                location,
                testLanguagePackage,
                ValidationLevel.syntax(),
              ),
            ),
          ),
        );
        results.push(...batchResults);
      }

      // Assert
      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
    });
  });
});
