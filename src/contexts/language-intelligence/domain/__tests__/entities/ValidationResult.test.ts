/**
 * Tests for ValidationResult entity
 *
 * Focuses on:
 * - Successful and failed validation creation
 * - Diagnostic management
 * - Performance target checking
 * - Result combination
 * - Error pattern analysis
 * - Educational feedback methods
 * - High coverage for all methods and edge cases
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { Diagnostic } from '../../entities/Diagnostic';
import { type CommonMistake, ValidationResult } from '../../entities/ValidationResult';
import { ValidationLevel } from '../../value-objects/ValidationLevel';
import { ValidationMetrics } from '../../value-objects/ValidationMetrics';

describe('ValidationResult', () => {
  const documentId = 'doc-123';
  const languagePackageId = 'lang-456';
  let mockLevel: ValidationLevel;
  let mockMetrics: ValidationMetrics;
  let mockLocation: SourceLocation;

  beforeEach(() => {
    mockLevel = ValidationLevel.syntax();

    const metricsResult = ValidationMetrics.create(50, 25, 10, 5);
    if (metricsResult.isOk()) {
      mockMetrics = metricsResult.value;
    }

    const locationResult = SourceLocation.createSinglePosition(1, 1);
    if (locationResult.isOk()) {
      mockLocation = locationResult.value;
    }
  });

  describe('createSuccessfulValidation', () => {
    it('should create successful validation result', () => {
      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.getId()).toBeDefined();
        expect(validationResult.getLevel()).toBe(mockLevel);
        expect(validationResult.isValidationSuccessful()).toBe(true);
        expect(validationResult.isValid()).toBe(true);
        expect(validationResult.getDiagnostics()).toEqual([]);
        expect(validationResult.getMetrics()).toBe(mockMetrics);
        expect(validationResult.getDocumentId()).toBe(documentId);
        expect(validationResult.getLanguagePackageId()).toBe(languagePackageId);
        expect(validationResult.getTimestamp()).toBeDefined();
      }
    });

    it('should have no diagnostics by default', () => {
      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.getDiagnostics()).toHaveLength(0);
        expect(validationResult.hasErrorDiagnostics()).toBe(false);
        expect(validationResult.hasWarningDiagnostics()).toBe(false);
        expect(validationResult.getErrorCount()).toBe(0);
        expect(validationResult.getWarningCount()).toBe(0);
        expect(validationResult.getInfoCount()).toBe(0);
      }
    });
  });

  describe('createFailedValidation', () => {
    let mockDiagnostics: Diagnostic[];

    beforeEach(() => {
      const errorResult = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        languagePackageId,
      );
      const warningResult = Diagnostic.createStyleWarning(
        'Style warning',
        mockLocation,
        languagePackageId,
      );

      if (errorResult.isOk() && warningResult.isOk()) {
        mockDiagnostics = [errorResult.value, warningResult.value];
      }
    });

    it('should create failed validation result with diagnostics', () => {
      const result = ValidationResult.createFailedValidation(
        mockLevel,
        mockDiagnostics,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.isValidationSuccessful()).toBe(false);
        expect(validationResult.isValid()).toBe(false);
        expect(validationResult.getDiagnostics()).toEqual(mockDiagnostics);
        expect(validationResult.getDiagnostics()).toHaveLength(2);
      }
    });

    it('should fail to create failed validation without diagnostics', () => {
      const result = ValidationResult.createFailedValidation(
        mockLevel,
        [],
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Failed validation must have at least one diagnostic');
      }
    });
  });

  describe('diagnostic management', () => {
    let successfulResult: ValidationResult;
    let failedResult: ValidationResult;
    let errorDiagnostic: Diagnostic;

    beforeEach(() => {
      const successResult = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      if (successResult.isOk()) {
        successfulResult = successResult.value;
      }

      const errorDiagResult = Diagnostic.createSyntaxError(
        'Initial error',
        mockLocation,
        languagePackageId,
      );
      if (errorDiagResult.isOk()) {
        errorDiagnostic = errorDiagResult.value;
        const failedResultResult = ValidationResult.createFailedValidation(
          mockLevel,
          [errorDiagnostic],
          documentId,
          languagePackageId,
          mockMetrics,
        );
        if (failedResultResult.isOk()) {
          failedResult = failedResultResult.value;
        }
      }
    });

    it('should not allow adding diagnostic to successful validation', () => {
      const newDiagnosticResult = Diagnostic.createSemanticError(
        'New error',
        mockLocation,
        languagePackageId,
      );

      expect(newDiagnosticResult.isOk()).toBe(true);
      if (newDiagnosticResult.isOk()) {
        const result = successfulResult.addDiagnostic(newDiagnosticResult.value);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(
            'Cannot add diagnostic to successful validation result',
          );
        }
      }
    });

    it('should add diagnostic to failed validation', () => {
      const newDiagnosticResult = Diagnostic.createSemanticError(
        'New error',
        mockLocation,
        languagePackageId,
      );

      expect(newDiagnosticResult.isOk()).toBe(true);
      if (newDiagnosticResult.isOk()) {
        const result = failedResult.addDiagnostic(newDiagnosticResult.value);

        expect(result.isOk()).toBe(true);
        expect(failedResult.getDiagnostics()).toContain(newDiagnosticResult.value);
        expect(failedResult.getDiagnostics()).toHaveLength(2);
      }
    });

    it('should remove diagnostic by ID', () => {
      const diagnosticId = errorDiagnostic.getId().getValue();
      const result = failedResult.removeDiagnostic(diagnosticId);

      expect(result.isOk()).toBe(true);
      expect(failedResult.getDiagnostics()).not.toContain(errorDiagnostic);
      expect(failedResult.getDiagnostics()).toHaveLength(0);
    });

    it('should fail to remove non-existent diagnostic', () => {
      const result = failedResult.removeDiagnostic('non-existent-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic not found');
      }
    });
  });

  describe('diagnostic counting and categorization', () => {
    let validationResult: ValidationResult;

    beforeEach(() => {
      const errorDiag = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        languagePackageId,
      );
      const warningDiag = Diagnostic.createStyleWarning(
        'Style warning',
        mockLocation,
        languagePackageId,
      );
      const infoDiag = Diagnostic.createEducationalInfo(
        'Educational info',
        mockLocation,
        languagePackageId,
      );

      if (errorDiag.isOk() && warningDiag.isOk() && infoDiag.isOk()) {
        const diagnostics = [errorDiag.value, warningDiag.value, infoDiag.value];
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          diagnostics,
          documentId,
          languagePackageId,
          mockMetrics,
        );
        if (result.isOk()) {
          validationResult = result.value;
        }
      }
    });

    it('should count diagnostics by severity', () => {
      expect(validationResult.hasErrorDiagnostics()).toBe(true);
      expect(validationResult.hasWarningDiagnostics()).toBe(true);
      expect(validationResult.getErrorCount()).toBe(1);
      expect(validationResult.getWarningCount()).toBe(1);
      expect(validationResult.getInfoCount()).toBe(1);
    });

    it('should analyze severity distribution', () => {
      const distribution = validationResult.analyzeSeverityDistribution();

      expect(distribution.error).toBe(1);
      expect(distribution.warning).toBe(1);
      expect(distribution.info).toBe(1);
    });
  });

  describe('performance target checking', () => {
    it('should check if performance target is met', () => {
      // Create metrics that meet target (4ms validation time, syntax level target is 5ms)
      const fastMetricsResult = ValidationMetrics.create(4, 25, 10, 5);
      expect(fastMetricsResult.isOk()).toBe(true);

      if (fastMetricsResult.isOk()) {
        const result = ValidationResult.createSuccessfulValidation(
          mockLevel,
          documentId,
          languagePackageId,
          fastMetricsResult.value,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.meetsPerformanceTarget()).toBe(true);
        }
      }
    });

    it('should detect when performance target is not met', () => {
      // Create metrics that exceed target (10ms validation time, syntax level target is 5ms)
      const slowMetricsResult = ValidationMetrics.create(10, 25, 10, 5);
      expect(slowMetricsResult.isOk()).toBe(true);

      if (slowMetricsResult.isOk()) {
        const result = ValidationResult.createSuccessfulValidation(
          mockLevel,
          documentId,
          languagePackageId,
          slowMetricsResult.value,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.meetsPerformanceTarget()).toBe(false);
        }
      }
    });
  });

  describe('result combination', () => {
    let result1: ValidationResult;
    let result2: ValidationResult;

    beforeEach(() => {
      const res1 = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );
      const res2 = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      if (res1.isOk() && res2.isOk()) {
        result1 = res1.value;
        result2 = res2.value;
      }
    });

    it('should combine two successful validations', () => {
      const combinedResult = result1.combineWith(result2);

      expect(combinedResult.isOk()).toBe(true);
      if (combinedResult.isOk()) {
        const combined = combinedResult.value;
        expect(combined.isValidationSuccessful()).toBe(true);
        expect(combined.getDocumentId()).toBe(documentId);
        expect(combined.getLanguagePackageId()).toBe(languagePackageId);
      }
    });

    it('should fail to combine results from different documents', () => {
      const differentDocResult = ValidationResult.createSuccessfulValidation(
        mockLevel,
        'different-doc',
        languagePackageId,
        mockMetrics,
      );

      expect(differentDocResult.isOk()).toBe(true);
      if (differentDocResult.isOk()) {
        const combinedResult = result1.combineWith(differentDocResult.value);

        expect(combinedResult.isErr()).toBe(true);
        if (combinedResult.isErr()) {
          expect(combinedResult.error.message).toBe(
            'Cannot combine validation results from different documents',
          );
        }
      }
    });

    it('should fail to combine incompatible validation levels', () => {
      const incompatibleLevel = ValidationLevel.semantic();
      const incompatibleResult = ValidationResult.createSuccessfulValidation(
        incompatibleLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(incompatibleResult.isOk()).toBe(true);
      if (incompatibleResult.isOk()) {
        // Mock the canCombineWith method to return false
        const mockLevel = result1.getLevel();
        mockLevel.canCombineWith = () => false;

        const combinedResult = result1.combineWith(incompatibleResult.value);

        expect(combinedResult.isErr()).toBe(true);
        if (combinedResult.isErr()) {
          expect(combinedResult.error.message).toBe(
            'Cannot combine validation results from incompatible levels',
          );
        }
      }
    });

    it('should combine successful with failed validation', () => {
      const errorDiagResult = Diagnostic.createSyntaxError(
        'Error',
        mockLocation,
        languagePackageId,
      );

      expect(errorDiagResult.isOk()).toBe(true);
      if (errorDiagResult.isOk()) {
        const failedResultResult = ValidationResult.createFailedValidation(
          mockLevel,
          [errorDiagResult.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        expect(failedResultResult.isOk()).toBe(true);
        if (failedResultResult.isOk()) {
          const combinedResult = result1.combineWith(failedResultResult.value);

          expect(combinedResult.isOk()).toBe(true);
          if (combinedResult.isOk()) {
            const combined = combinedResult.value;
            expect(combined.isValidationSuccessful()).toBe(false);
            expect(combined.getDiagnostics()).toContain(errorDiagResult.value);
          }
        }
      }
    });
  });

  describe('error pattern analysis', () => {
    let validationResult: ValidationResult;

    beforeEach(() => {
      const syntaxError1 = Diagnostic.createSyntaxError(
        'Syntax error 1',
        mockLocation,
        languagePackageId,
      );
      const syntaxError2 = Diagnostic.createSyntaxError(
        'Syntax error 2',
        mockLocation,
        languagePackageId,
      );
      const semanticError = Diagnostic.createSemanticError(
        'Semantic error',
        mockLocation,
        languagePackageId,
      );

      if (syntaxError1.isOk() && syntaxError2.isOk() && semanticError.isOk()) {
        const diagnostics = [syntaxError1.value, syntaxError2.value, semanticError.value];
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          diagnostics,
          documentId,
          languagePackageId,
          mockMetrics,
        );
        if (result.isOk()) {
          validationResult = result.value;
        }
      }
    });

    it('should analyze error patterns', () => {
      const patterns = validationResult.analyzeErrorPatterns();

      expect(patterns.get('syntax-error')).toBe(2);
      expect(patterns.get('semantic-error')).toBe(1);
    });

    it('should calculate error frequency', () => {
      const frequency = validationResult.calculateErrorFrequency();

      expect(frequency['syntax-error']).toBeCloseTo(2 / 3);
      expect(frequency['semantic-error']).toBeCloseTo(1 / 3);
    });
  });

  describe('educational feedback methods', () => {
    let validationResult: ValidationResult;

    beforeEach(() => {
      const errorDiag = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        languagePackageId,
      );

      if (errorDiag.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [errorDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );
        if (result.isOk()) {
          validationResult = result.value;
        }
      }
    });

    it('should detect circular reasoning', () => {
      const analysis = validationResult.detectCircularReasoning();

      expect(analysis.detected).toBe(false);
      expect(analysis.confidence).toBe(0);
      expect(analysis.instances).toEqual([]);
    });

    it('should detect invalid inferences', () => {
      const inferenceErrorDiag = Diagnostic.createSemanticError(
        'Invalid inference detected',
        mockLocation,
        languagePackageId,
      );

      if (inferenceErrorDiag.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [inferenceErrorDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const mistakes = result.value.detectInvalidInferences();

          expect(mistakes).toHaveLength(1);
          expect(mistakes[0]?.type).toBe('invalid-inference');
          expect(mistakes[0]?.confidence).toBe(0.8);
        }
      }
    });

    it('should detect missing premises', () => {
      const mistakes = validationResult.detectMissingPremises();

      expect(Array.isArray(mistakes)).toBe(true);
    });

    it('should detect modal logic errors', () => {
      const modalErrorDiag = Diagnostic.createSemanticError(
        'Modal logic error detected',
        mockLocation,
        languagePackageId,
      );

      if (modalErrorDiag.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [modalErrorDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const mistakes = result.value.detectModalLogicErrors();

          expect(mistakes).toHaveLength(1);
          expect(mistakes[0]?.type).toBe('modal-logic-error');
          expect(mistakes[0]?.confidence).toBe(0.85);
        }
      }
    });

    it('should identify improvement areas', () => {
      const mistakes: CommonMistake[] = [
        {
          type: 'invalid-inference',
          description: 'Test mistake',
          confidence: 0.8,
          instances: ['location1'],
          suggestion: 'Test suggestion',
        },
        {
          type: 'modal-logic-error',
          description: 'Test modal error',
          confidence: 0.9,
          instances: ['location2'],
          suggestion: 'Test modal suggestion',
        },
      ];

      const areas = validationResult.identifyImprovementAreas(mistakes);

      expect(areas).toContain('logical-reasoning');
      expect(areas).toContain('modal-logic');
    });

    it('should generate learning recommendations', () => {
      const mistakes: CommonMistake[] = [
        {
          type: 'invalid-inference',
          description: 'Test mistake',
          confidence: 0.8,
          instances: ['location1'],
          suggestion: 'Test suggestion',
        },
      ];

      const recommendations = validationResult.generateLearningRecommendations(mistakes);

      expect(recommendations).toContain(
        'Study basic inference rules (modus ponens, modus tollens, etc.)',
      );
    });
  });

  describe('equality checking', () => {
    it('should check equality correctly', () => {
      const result1Result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );
      const result2Result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result1Result.isOk()).toBe(true);
      expect(result2Result.isOk()).toBe(true);

      if (result1Result.isOk() && result2Result.isOk()) {
        const result1 = result1Result.value;
        const result2 = result2Result.value;

        expect(result1.equals(result2)).toBe(false);
        expect(result1.equals(result1)).toBe(true);
      }
    });
  });

  describe('static factory methods edge cases', () => {
    it('should create successful validation with all required properties', () => {
      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const validationResult = result.value;
        expect(validationResult.getId()).toBeDefined();
        expect(validationResult.getLevel()).toBe(mockLevel);
        expect(validationResult.isValidationSuccessful()).toBe(true);
        expect(validationResult.isValid()).toBe(true);
        expect(validationResult.getDiagnostics()).toEqual([]);
        expect(validationResult.getMetrics()).toBe(mockMetrics);
        expect(validationResult.getTimestamp()).toBeDefined();
        expect(validationResult.getDocumentId()).toBe(documentId);
        expect(validationResult.getLanguagePackageId()).toBe(languagePackageId);
      }
    });

    it('should create failed validation with all required properties', () => {
      const errorDiagResult = Diagnostic.createSyntaxError(
        'Test error',
        mockLocation,
        languagePackageId,
      );

      expect(errorDiagResult.isOk()).toBe(true);
      if (errorDiagResult.isOk()) {
        const diagnostics = [errorDiagResult.value];
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          diagnostics,
          documentId,
          languagePackageId,
          mockMetrics,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validationResult = result.value;
          expect(validationResult.getId()).toBeDefined();
          expect(validationResult.getLevel()).toBe(mockLevel);
          expect(validationResult.isValidationSuccessful()).toBe(false);
          expect(validationResult.isValid()).toBe(false);
          expect(validationResult.getDiagnostics()).toEqual(diagnostics);
          expect(validationResult.getMetrics()).toBe(mockMetrics);
          expect(validationResult.getTimestamp()).toBeDefined();
          expect(validationResult.getDocumentId()).toBe(documentId);
          expect(validationResult.getLanguagePackageId()).toBe(languagePackageId);
        }
      }
    });
  });

  describe('createSuccessfulValidationWithWarnings factory method', () => {
    it('should create successful validation with warning diagnostics', () => {
      const warningDiag = Diagnostic.createStyleWarning(
        'Style warning',
        mockLocation,
        languagePackageId,
      );
      const infoDiag = Diagnostic.createEducationalInfo(
        'Educational info',
        mockLocation,
        languagePackageId,
      );

      expect(warningDiag.isOk()).toBe(true);
      expect(infoDiag.isOk()).toBe(true);

      if (warningDiag.isOk() && infoDiag.isOk()) {
        const diagnostics = [warningDiag.value, infoDiag.value];
        const result = ValidationResult.createSuccessfulValidationWithWarnings(
          mockLevel,
          diagnostics,
          documentId,
          languagePackageId,
          mockMetrics,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validationResult = result.value;
          expect(validationResult.isValidationSuccessful()).toBe(true);
          expect(validationResult.isValid()).toBe(true);
          expect(validationResult.getDiagnostics()).toEqual(diagnostics);
          expect(validationResult.hasWarningDiagnostics()).toBe(true);
          expect(validationResult.hasErrorDiagnostics()).toBe(false);
        }
      }
    });

    it('should reject successful validation with error diagnostics', () => {
      const errorDiag = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        languagePackageId,
      );

      expect(errorDiag.isOk()).toBe(true);
      if (errorDiag.isOk()) {
        const diagnostics = [errorDiag.value];
        const result = ValidationResult.createSuccessfulValidationWithWarnings(
          mockLevel,
          diagnostics,
          documentId,
          languagePackageId,
          mockMetrics,
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe(
            'Successful validation cannot contain error diagnostics',
          );
        }
      }
    });

    it('should handle mixed warning and info diagnostics', () => {
      const warningDiag1 = Diagnostic.createStyleWarning(
        'Warning 1',
        mockLocation,
        languagePackageId,
      );
      const warningDiag2 = Diagnostic.createStyleWarning(
        'Warning 2',
        mockLocation,
        languagePackageId,
      );
      const infoDiag = Diagnostic.createEducationalInfo(
        'Info message',
        mockLocation,
        languagePackageId,
      );

      if (warningDiag1.isOk() && warningDiag2.isOk() && infoDiag.isOk()) {
        const diagnostics = [warningDiag1.value, warningDiag2.value, infoDiag.value];
        const result = ValidationResult.createSuccessfulValidationWithWarnings(
          mockLevel,
          diagnostics,
          documentId,
          languagePackageId,
          mockMetrics,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const validationResult = result.value;
          expect(validationResult.isValidationSuccessful()).toBe(true);
          expect(validationResult.getWarningCount()).toBe(2);
          expect(validationResult.getInfoCount()).toBe(1);
          expect(validationResult.getErrorCount()).toBe(0);
        }
      }
    });
  });

  describe('enhanced combination scenarios', () => {
    it('should combine successful validation with warnings and failed validation', () => {
      const warningDiag = Diagnostic.createStyleWarning(
        'Style warning',
        mockLocation,
        languagePackageId,
      );
      const errorDiag = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        languagePackageId,
      );

      if (warningDiag.isOk() && errorDiag.isOk()) {
        const successWithWarningsResult = ValidationResult.createSuccessfulValidationWithWarnings(
          mockLevel,
          [warningDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );
        const failedResult = ValidationResult.createFailedValidation(
          mockLevel,
          [errorDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        expect(successWithWarningsResult.isOk()).toBe(true);
        expect(failedResult.isOk()).toBe(true);

        if (successWithWarningsResult.isOk() && failedResult.isOk()) {
          const combinedResult = successWithWarningsResult.value.combineWith(failedResult.value);

          expect(combinedResult.isOk()).toBe(true);
          if (combinedResult.isOk()) {
            const combined = combinedResult.value;
            expect(combined.isValidationSuccessful()).toBe(false);
            expect(combined.getDiagnostics()).toHaveLength(2);
            expect(combined.hasWarningDiagnostics()).toBe(true);
            expect(combined.hasErrorDiagnostics()).toBe(true);
          }
        }
      }
    });

    it('should successfully combine two successful validations with combined metrics', () => {
      const result1 = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );
      const result2 = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const combinedResult = result1.value.combineWith(result2.value);

        expect(combinedResult.isOk()).toBe(true);
        if (combinedResult.isOk()) {
          const combined = combinedResult.value;
          expect(combined.isValidationSuccessful()).toBe(true);
          expect(combined.getDiagnostics()).toHaveLength(0);
          expect(combined.getDocumentId()).toBe(documentId);
          expect(combined.getLanguagePackageId()).toBe(languagePackageId);
          // Verify that a new ID was generated
          expect(combined.getId()).not.toEqual(result1.value.getId());
          expect(combined.getId()).not.toEqual(result2.value.getId());
        }
      }
    });
  });

  describe('comprehensive educational analysis methods', () => {
    it('should handle detectMissingPremises with semantic errors', () => {
      const semanticDiag = Diagnostic.createSemanticError(
        'Semantic validation failed',
        mockLocation,
        languagePackageId,
      );

      if (semanticDiag.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [semanticDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const mistakes = result.value.detectMissingPremises();

          expect(mistakes).toHaveLength(1);
          const mistake = mistakes[0];
          if (mistake) {
            expect(mistake.type).toBe('missing-premise');
            expect(mistake.confidence).toBe(0.6);
            expect(mistake.description).toBe('Possible missing premise detected');
            expect(mistake.suggestion).toContain('Consider if additional premises are needed');
          }
        }
      }
    });

    it('should handle detectMissingPremises with no semantic errors', () => {
      const syntaxDiag = Diagnostic.createSyntaxError(
        'Syntax error',
        mockLocation,
        languagePackageId,
      );

      if (syntaxDiag.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [syntaxDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const mistakes = result.value.detectMissingPremises();
          expect(mistakes).toHaveLength(0);
        }
      }
    });

    it('should detect multiple modal logic errors', () => {
      const modalError1 = Diagnostic.createSemanticError(
        'Modal necessity operator misused',
        mockLocation,
        languagePackageId,
      );
      const modalError2 = Diagnostic.createSemanticError(
        'Possibility logic error in argument',
        mockLocation,
        languagePackageId,
      );

      if (modalError1.isOk() && modalError2.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [modalError1.value, modalError2.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const mistakes = result.value.detectModalLogicErrors();

          expect(mistakes).toHaveLength(2);
          mistakes.forEach((mistake) => {
            expect(mistake.type).toBe('modal-logic-error');
            expect(mistake.confidence).toBe(0.85);
            expect(mistake.suggestion).toContain('modal logic principles');
          });
        }
      }
    });

    it('should handle identifyImprovementAreas with all mistake types', () => {
      const allMistakeTypes: CommonMistake[] = [
        {
          type: 'invalid-inference',
          description: 'Invalid inference',
          confidence: 0.8,
          instances: ['loc1'],
          suggestion: 'Check inference rules',
        },
        {
          type: 'missing-premise',
          description: 'Missing premise',
          confidence: 0.7,
          instances: ['loc2'],
          suggestion: 'Add missing premise',
        },
        {
          type: 'modal-logic-error',
          description: 'Modal error',
          confidence: 0.9,
          instances: ['loc3'],
          suggestion: 'Fix modal logic',
        },
        {
          type: 'circular-reasoning',
          description: 'Circular reasoning',
          confidence: 0.85,
          instances: ['loc4'],
          suggestion: 'Remove circularity',
        },
      ];

      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      if (result.isOk()) {
        const areas = result.value.identifyImprovementAreas(allMistakeTypes);

        expect(areas).toContain('logical-reasoning');
        expect(areas).toContain('argument-structure');
        expect(areas).toContain('modal-logic');
        expect(areas).toContain('logical-dependencies');
        expect(areas).toHaveLength(4);
      }
    });

    it('should handle generateLearningRecommendations for all mistake types', () => {
      const allMistakeTypes: CommonMistake[] = [
        {
          type: 'invalid-inference',
          description: 'Invalid inference',
          confidence: 0.8,
          instances: ['loc1'],
          suggestion: 'Check inference rules',
        },
        {
          type: 'modal-logic-error',
          description: 'Modal error',
          confidence: 0.9,
          instances: ['loc2'],
          suggestion: 'Fix modal logic',
        },
        {
          type: 'circular-reasoning',
          description: 'Circular reasoning',
          confidence: 0.85,
          instances: ['loc3'],
          suggestion: 'Remove circularity',
        },
      ];

      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      if (result.isOk()) {
        const recommendations = result.value.generateLearningRecommendations(allMistakeTypes);

        expect(recommendations).toContain(
          'Study basic inference rules (modus ponens, modus tollens, etc.)',
        );
        expect(recommendations).toContain('Review modal logic concepts and operator semantics');
        expect(recommendations).toContain(
          'Practice identifying logical dependencies and avoiding circular arguments',
        );
        expect(recommendations).toHaveLength(3);
      }
    });
  });

  describe('private constructor and factory pattern validation', () => {
    it('should only allow creation through factory methods', () => {
      // ValidationResult constructor is private, so we can only test that factory methods work
      // and that the class maintains proper encapsulation
      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeDefined();
        expect(result.value.getId()).toBeDefined();
        expect(result.value.isValidationSuccessful()).toBe(true);
      }
    });

    it('should generate unique IDs for each validation result', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = ValidationResult.createSuccessfulValidation(
          mockLevel,
          documentId,
          languagePackageId,
          mockMetrics,
        );
        if (result.isOk()) {
          results.push(result.value);
        }
      }

      expect(results).toHaveLength(5);
      const ids = results.map((r) => r.getId().getValue());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5); // All IDs should be unique
    });

    it('should generate timestamps for validation results', async () => {
      const result1Result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      expect(result1Result.isOk()).toBe(true);

      if (result1Result.isOk()) {
        const timestamp1 = result1Result.value.getTimestamp();

        // Timestamps should exist and be valid
        expect(timestamp1).toBeDefined();
        expect(timestamp1.getValue()).toBeInstanceOf(Date);
        expect(timestamp1.getMilliseconds()).toBeGreaterThan(0);
      }
    });
  });

  describe('diagnostic array immutability and safety', () => {
    it('should return immutable copy of diagnostics array', () => {
      const errorDiag = Diagnostic.createSyntaxError('Test error', mockLocation, languagePackageId);

      if (errorDiag.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [errorDiag.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const validationResult = result.value;
          const diagnostics1 = validationResult.getDiagnostics();
          const diagnostics2 = validationResult.getDiagnostics();

          // Should return new array each time (defensive copy)
          expect(diagnostics1).not.toBe(diagnostics2);
          expect(diagnostics1).toEqual(diagnostics2);

          // Modifying returned array should not affect internal state
          const mutableDiagnostics1 = [...diagnostics1];
          mutableDiagnostics1.push(errorDiag.value);
          expect(validationResult.getDiagnostics()).toHaveLength(1);
        }
      }
    });

    it('should handle empty error frequency calculation', () => {
      const result = ValidationResult.createSuccessfulValidation(
        mockLevel,
        documentId,
        languagePackageId,
        mockMetrics,
      );

      if (result.isOk()) {
        const frequency = result.value.calculateErrorFrequency();
        expect(frequency).toEqual({});
      }
    });

    it('should handle complex error frequency calculation', () => {
      const error1 = Diagnostic.createSyntaxError('Error 1', mockLocation, languagePackageId);
      const error2 = Diagnostic.createSyntaxError('Error 2', mockLocation, languagePackageId);
      const error3 = Diagnostic.createSemanticError('Error 3', mockLocation, languagePackageId);

      if (error1.isOk() && error2.isOk() && error3.isOk()) {
        const result = ValidationResult.createFailedValidation(
          mockLevel,
          [error1.value, error2.value, error3.value],
          documentId,
          languagePackageId,
          mockMetrics,
        );

        if (result.isOk()) {
          const frequency = result.value.calculateErrorFrequency();

          expect(frequency['syntax-error']).toBeCloseTo(2 / 3, 2);
          expect(frequency['semantic-error']).toBeCloseTo(1 / 3, 2);
        }
      }
    });
  });
});
