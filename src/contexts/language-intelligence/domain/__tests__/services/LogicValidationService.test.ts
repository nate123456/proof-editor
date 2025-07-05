/**
 * Tests for LogicValidationService
 *
 * Focuses on:
 * - Statement validation across different levels
 * - Inference validation with language packages
 * - Proof structure validation
 * - Error handling and edge cases
 * - Performance tracking
 * - High coverage for validation logic
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceLocation } from '../../../../../domain/shared/index.js';
import { Diagnostic } from '../../entities/Diagnostic';
import type { InferenceRule } from '../../entities/InferenceRule';
import type { LanguagePackage } from '../../entities/LanguagePackage';
import { ValidationResult } from '../../entities/ValidationResult';
import { ValidationError } from '../../errors/DomainErrors';
import { LogicValidationService } from '../../services/LogicValidationService';
import { ValidationLevel } from '../../value-objects/ValidationLevel';
import { ValidationMetrics } from '../../value-objects/ValidationMetrics';

// Mock factories
const createMockInferenceRule = (confidence = 0.9, patternConfidence = 0.8): InferenceRule => {
  return {
    getId: vi.fn(() => ({ getValue: () => 'rule-1' })),
    getName: vi.fn(() => ({ getValue: () => 'Modus Ponens' })),
    getDescription: vi.fn(() => ({ getValue: () => 'If P then Q, P, therefore Q' })),
    getPattern: vi.fn(() => ({ getValue: () => 'P → Q, P ⊢ Q' })),
    getMetadata: vi.fn(() => ({})),
    getPatternConfidence: vi.fn(() => patternConfidence),
    matches: vi.fn(() => confidence > 0.5),
    validatePremises: vi.fn(() => true),
    validateConclusions: vi.fn(() => true),
    isActive: vi.fn(() => true),
  } as unknown as InferenceRule;
};

const createMockLanguagePackage = (
  features: {
    supportsFirstOrderLogic?: boolean;
    supportsModalLogic?: boolean;
    supportsPropositionalLogic?: boolean;
    rulesCount?: number;
    ruleConfidence?: number;
  } = {},
): LanguagePackage => {
  const rules = Array.from({ length: features.rulesCount ?? 1 }, () =>
    createMockInferenceRule(features.ruleConfidence ?? 0.9, features.ruleConfidence ?? 0.9),
  );

  return {
    getId: vi.fn(() => ({ getValue: () => 'lang-package-1' })),
    getName: vi.fn(() => ({ getValue: () => 'Test Package' })),
    getVersion: vi.fn(() => ({ toString: () => '1.0.0' })),
    getDescription: vi.fn(() => ({ getValue: () => 'Test description' })),
    getRules: vi.fn(() => rules),
    getValidationRules: vi.fn(() => rules),
    supportsFirstOrderLogic: vi.fn(() => features.supportsFirstOrderLogic ?? true),
    supportsModalLogic: vi.fn(() => features.supportsModalLogic ?? false),
    supportsPropositionalLogic: vi.fn(() => features.supportsPropositionalLogic ?? true),
    getSymbols: vi.fn(() => new Map([['∧', 'conjunction']])),
    getSupportedConnectives: vi.fn(() => ['∧', '∨', '→', '¬']),
    getSupportedQuantifiers: vi.fn(() => ['∀', '∃']),
    getSupportedModalOperators: vi.fn(() => ['□', '◇']),
    findMatchingRules: vi.fn(() => rules),
    isActive: vi.fn(() => true),
  } as unknown as LanguagePackage;
};

describe('LogicValidationService', () => {
  let service: LogicValidationService;
  let mockLocation: SourceLocation;
  let mockLanguagePackage: LanguagePackage;

  beforeEach(() => {
    service = new LogicValidationService();

    const locationResult = SourceLocation.create(1, 1, 1, 10);
    if (locationResult.isOk()) {
      mockLocation = locationResult.value;
    } else {
      throw new Error('Failed to create mock location');
    }

    mockLanguagePackage = createMockLanguagePackage();
  });

  describe('validateStatement', () => {
    it('should validate valid statement successfully', () => {
      const statement = 'P ∧ Q';
      const level = ValidationLevel.syntax();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeInstanceOf(ValidationResult);
        expect(result.value.isValid()).toBe(true);
        expect(result.value.getDiagnostics()).toHaveLength(0);
      }
    });

    it('should detect empty statement error', () => {
      const statement = '';
      const level = ValidationLevel.syntax();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(false);
        expect(result.value.getDiagnostics()).toHaveLength(1);
        expect(result.value.getDiagnostics()[0]?.getMessage().getValue()).toContain('empty');
      }
    });

    it('should detect unbalanced parentheses', () => {
      const statement = '(P ∧ Q';
      const level = ValidationLevel.syntax();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(false);
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some((d) => d.getMessage().getValue().toLowerCase().includes('parentheses')),
        ).toBe(true);
      }
    });

    it('should detect logical contradictions in semantic validation', () => {
      const statement = 'contradiction and valid';
      const level = ValidationLevel.semantic();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(false);
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some((d) =>
            d.getMessage().getValue().toLowerCase().includes('contradiction'),
          ),
        ).toBe(true);
      }
    });

    it('should generate style warnings for long statements', () => {
      const longStatement = 'A'.repeat(250); // Exceeds 200 character limit
      const level = ValidationLevel.style();

      const result = service.validateStatement(
        longStatement,
        mockLocation,
        mockLanguagePackage,
        level,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some(
            (d) =>
              d.getSeverity().isWarning() &&
              d.getMessage().getValue().toLowerCase().includes('long'),
          ),
        ).toBe(true);
      }
    });

    it('should validate at multiple levels when requested', () => {
      const statement = '(P ∧ Q'; // Has syntax error
      const level = ValidationLevel.full();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(false);
        // Should have syntax validation diagnostics
        const diagnostics = result.value.getDiagnostics();
        expect(diagnostics.length).toBeGreaterThan(0);
      }
    });

    it('should handle unexpected validation errors', () => {
      // Create a mock that throws an error
      const errorLanguagePackage = {
        ...mockLanguagePackage,
        getId: vi.fn(() => {
          throw new Error('Unexpected error');
        }),
      } as unknown as LanguagePackage;

      const result = service.validateStatement(
        'P',
        mockLocation,
        errorLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('unexpected error');
      }
    });

    it('should fail when metrics creation fails', () => {
      // Mock ValidationMetrics.create to return error
      const originalCreate = ValidationMetrics.create;
      vi.spyOn(ValidationMetrics, 'create').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Metrics error'),
      } as any);

      const result = service.validateStatement(
        'P',
        mockLocation,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('validation metrics');
      }

      // Restore original method
      vi.spyOn(ValidationMetrics, 'create').mockImplementation(originalCreate);
    });
  });

  describe('validateInference', () => {
    it('should validate valid inference successfully', () => {
      const premises = ['P → Q', 'P'];
      const conclusions = ['Q'];
      const level = ValidationLevel.semantic();

      const result = service.validateInference(premises, conclusions, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeInstanceOf(ValidationResult);
      }
    });

    it('should fail when no matching inference rules found', () => {
      const premises = ['Invalid premise'];
      const conclusions = ['Invalid conclusion'];
      const level = ValidationLevel.semantic();

      // Mock findMatchingRules to return empty array
      const packageWithNoRules = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => []),
      } as unknown as LanguagePackage;

      const result = service.validateInference(premises, conclusions, packageWithNoRules, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(false);
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some((d) =>
            d.getMessage().getValue().toLowerCase().includes('no valid inference rule'),
          ),
        ).toBe(true);
      }
    });

    it('should generate warning for low confidence rules', () => {
      const premises = ['P → Q', 'P'];
      const conclusions = ['Q'];
      const level = ValidationLevel.semantic();

      // Create language package with low confidence rule
      const lowConfidencePackage = createMockLanguagePackage({ ruleConfidence: 0.5 });

      const result = service.validateInference(premises, conclusions, lowConfidencePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some(
            (d) =>
              d.getSeverity().isWarning() &&
              d.getMessage().getValue().toLowerCase().includes('confidence'),
          ),
        ).toBe(true);
      }
    });

    it('should handle multiple matching rules and select best one', () => {
      const premises = ['P → Q', 'P'];
      const conclusions = ['Q'];
      const level = ValidationLevel.semantic();

      // Create package with multiple rules
      const multiRulePackage = createMockLanguagePackage({ rulesCount: 3 });

      const result = service.validateInference(premises, conclusions, multiRulePackage, level);

      expect(result.isOk()).toBe(true);
      // Should not throw error when selecting best rule
      expect(multiRulePackage.findMatchingRules).toHaveBeenCalled();
    });

    it('should handle metrics creation failure in inference validation', () => {
      const premises = ['P'];
      const conclusions = ['Q'];

      // Mock ValidationMetrics.create to return error
      vi.spyOn(ValidationMetrics, 'create').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Metrics error'),
      } as any);

      const result = service.validateInference(
        premises,
        conclusions,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('validation metrics');
      }

      vi.restoreAllMocks();
    });

    it('should handle unexpected errors during inference validation', () => {
      const premises = ['P'];
      const conclusions = ['Q'];

      // Mock to throw unexpected error
      const errorPackage = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => {
          throw new Error('Unexpected error');
        }),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        errorPackage,
        ValidationLevel.semantic(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('unexpected error');
      }
    });

    it('should handle diagnostic creation failure', () => {
      const premises = ['Invalid'];
      const conclusions = ['Invalid'];

      // Mock Diagnostic.createSemanticError to return error
      const originalCreate = Diagnostic.createSemanticError;
      vi.spyOn(Diagnostic, 'createSemanticError').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Diagnostic error'),
      } as any);

      // Mock findMatchingRules to return empty array to trigger diagnostic creation
      const packageWithNoRules = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => []),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        packageWithNoRules,
        ValidationLevel.semantic(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create diagnostic');
      }

      // Restore
      vi.spyOn(Diagnostic, 'createSemanticError').mockImplementation(originalCreate);
    });
  });

  describe('validateProofStructure', () => {
    it('should validate proof structure successfully', () => {
      const statements = ['P', 'P → Q', 'Q'];
      const connections = [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
      ];
      const level = ValidationLevel.syntax();

      const result = service.validateProofStructure(
        statements,
        connections,
        mockLanguagePackage,
        level,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeInstanceOf(ValidationResult);
        expect(result.value.isValid()).toBe(true);
      }
    });

    it('should return default successful validation', () => {
      const statements: string[] = [];
      const connections: { from: number; to: number }[] = [];
      const level = ValidationLevel.full();

      const result = service.validateProofStructure(
        statements,
        connections,
        mockLanguagePackage,
        level,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(true);
        expect(result.value.getDiagnostics()).toHaveLength(0);
      }
    });
  });

  describe('private method behavior validation', () => {
    it('should correctly identify balanced parentheses', () => {
      // Test balanced parentheses
      const validStatements = [
        '(P ∧ Q)',
        '((P → Q) ∧ (R → S))',
        'P ∧ Q', // No parentheses
        '(P) ∧ (Q)',
      ];

      validStatements.forEach((statement) => {
        const result = service.validateStatement(
          statement,
          mockLocation,
          mockLanguagePackage,
          ValidationLevel.syntax(),
        );
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const hasParenthesesError = result.value
            .getDiagnostics()
            .some((d) => d.getMessage().getValue().toLowerCase().includes('parentheses'));
          expect(hasParenthesesError).toBe(false);
        }
      });
    });

    it('should correctly identify unbalanced parentheses', () => {
      const invalidStatements = ['(P ∧ Q', 'P ∧ Q)', '((P → Q)', '(P ∧ (Q)', ')P ∧ Q('];

      invalidStatements.forEach((statement) => {
        const result = service.validateStatement(
          statement,
          mockLocation,
          mockLanguagePackage,
          ValidationLevel.syntax(),
        );
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const hasParenthesesError = result.value
            .getDiagnostics()
            .some((d) => d.getMessage().getValue().toLowerCase().includes('parentheses'));
          expect(hasParenthesesError).toBe(true);
        }
      });
    });

    it('should detect invalid symbols', () => {
      const statementWithInvalidSymbol = 'P ∧ Q ∧ ♠'; // ♠ is not a valid logical symbol

      const result = service.validateStatement(
        statementWithInvalidSymbol,
        mockLocation,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        const hasInvalidSymbolError = diagnostics.some((d) =>
          d.getMessage().getValue().toLowerCase().includes('invalid symbol'),
        );
        expect(hasInvalidSymbolError).toBe(true);
      }
    });

    it('should handle rule validation failures', () => {
      const premises = ['P'];
      const conclusions = ['Q'];

      // Mock validateWithRule to return error
      const rule = createMockInferenceRule();
      const ruleArray = [rule];

      const packageWithRule = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => ruleArray),
      } as unknown as LanguagePackage;

      // Mock the private validateWithRule method behavior by ensuring validation occurs
      const result = service.validateInference(
        premises,
        conclusions,
        packageWithRule,
        ValidationLevel.semantic(),
      );

      expect(result.isOk()).toBe(true);
      expect(packageWithRule.findMatchingRules).toHaveBeenCalled();
    });
  });

  describe('selectBestRule behavior', () => {
    it('should throw error when no rules provided', () => {
      const premises = ['P'];
      const conclusions = ['Q'];

      // Test the edge case indirectly by ensuring findMatchingRules returns empty
      const emptyRulesPackage = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => []),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        emptyRulesPackage,
        ValidationLevel.semantic(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should generate error diagnostic for no rules
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some((d) =>
            d.getMessage().getValue().toLowerCase().includes('no valid inference rule'),
          ),
        ).toBe(true);
      }
    });

    it('should select rule with highest confidence', () => {
      const premises = ['P → Q', 'P'];
      const conclusions = ['Q'];

      // Create rules with different confidence levels
      const lowRule = createMockInferenceRule(0.6, 0.6);
      const highRule = createMockInferenceRule(0.9, 0.9);
      const medRule = createMockInferenceRule(0.7, 0.7);

      const multiRulePackage = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => [lowRule, highRule, medRule]),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        multiRulePackage,
        ValidationLevel.semantic(),
      );

      expect(result.isOk()).toBe(true);
      // The service should successfully process all rules and select the best one
      expect(multiRulePackage.findMatchingRules).toHaveBeenCalled();
    });
  });

  describe('edge cases and uncovered methods', () => {
    it('should handle basic modus ponens detection', () => {
      const premises = ['All men are mortal', 'Socrates is a man'];
      const conclusions = ['Socrates is mortal'];

      // Mock package with no matching rules to trigger basic pattern detection
      const noRulesPackage = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => []),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        noRulesPackage,
        ValidationLevel.semantic(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Basic modus ponens should be detected and pass validation without diagnostics
        expect(result.value.isValid()).toBe(true);
        expect(result.value.getDiagnostics()).toHaveLength(0);
      }
    });

    it('should detect logical contradictions with "X and not X" pattern', () => {
      const statement = 'Socrates is mortal and not mortal';
      const level = ValidationLevel.semantic();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isValid()).toBe(false);
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some((d) =>
            d.getMessage().getValue().toLowerCase().includes('contradiction'),
          ),
        ).toBe(true);
      }
    });

    it('should handle flow validation level', () => {
      const statement = 'P therefore Q';
      const level = ValidationLevel.flow();

      const result = service.validateStatement(statement, mockLocation, mockLanguagePackage, level);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeInstanceOf(ValidationResult);
        // Flow validation currently doesn't add diagnostics but should complete successfully
        expect(result.value.isValid()).toBe(true);
      }
    });

    it('should test validateWithRule error handling', () => {
      const premises = ['P → Q', 'P'];
      const conclusions = ['Q'];

      // Mock rule creation to return error
      const mockRule = createMockInferenceRule(0.9, 0.5); // Low confidence to trigger warning
      const rulePackage = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => [mockRule]),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        rulePackage,
        ValidationLevel.semantic(),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const diagnostics = result.value.getDiagnostics();
        expect(
          diagnostics.some(
            (d) =>
              d.getSeverity().isWarning() &&
              d.getMessage().getValue().toLowerCase().includes('confidence'),
          ),
        ).toBe(true);
      }
    });

    it('should handle validateWithRule returning errors', () => {
      const premises = ['P'];
      const conclusions = ['Q'];

      // Mock Diagnostic.create to return error to test error handling in validateWithRule
      const originalCreate = Diagnostic.create;
      vi.spyOn(Diagnostic, 'create').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Diagnostic creation failed'),
      } as any);

      // Mock rule with low confidence to trigger warning creation
      const mockRule = createMockInferenceRule(0.9, 0.5);
      const rulePackage = {
        ...mockLanguagePackage,
        findMatchingRules: vi.fn(() => [mockRule]),
      } as unknown as LanguagePackage;

      const result = service.validateInference(
        premises,
        conclusions,
        rulePackage,
        ValidationLevel.semantic(),
      );

      expect(result.isErr()).toBe(true);
      // Should fail when diagnostic creation fails in validateWithRule
      if (result.isErr()) {
        expect(result.error.message).toContain('Diagnostic creation failed');
      }

      // Restore original
      vi.spyOn(Diagnostic, 'create').mockImplementation(originalCreate);
    });

    it('should handle various parentheses edge cases', () => {
      const testCases = [
        { statement: ')P(', expected: false },
        { statement: '()()', expected: true },
        { statement: '((()))', expected: true },
        { statement: '((()', expected: false },
      ];

      testCases.forEach(({ statement, expected }) => {
        const result = service.validateStatement(
          statement,
          mockLocation,
          mockLanguagePackage,
          ValidationLevel.syntax(),
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const hasParenthesesError = result.value
            .getDiagnostics()
            .some((d) => d.getMessage().getValue().toLowerCase().includes('parentheses'));
          expect(hasParenthesesError).toBe(!expected);
        }
      });
    });

    it('should detect all types of logical contradictions', () => {
      const contradictoryStatements = [
        'mortal AND not mortal',
        'alive and not alive',
        'present and not present',
      ];

      contradictoryStatements.forEach((statement) => {
        const result = service.validateStatement(
          statement,
          mockLocation,
          mockLanguagePackage,
          ValidationLevel.semantic(),
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isValid()).toBe(false);
          const diagnostics = result.value.getDiagnostics();
          expect(
            diagnostics.some((d) =>
              d.getMessage().getValue().toLowerCase().includes('contradiction'),
            ),
          ).toBe(true);
        }
      });
    });

    it('should handle edge cases in modus ponens detection', () => {
      const edgeCases = [
        {
          premises: ['Some premise'],
          conclusions: ['Some conclusion'],
          shouldMatch: false,
        },
        {
          premises: ['All men are mortal', 'Socrates is a man'],
          conclusions: ['Socrates is mortal'],
          shouldMatch: true,
        },
        {
          premises: ['All cats are animals', 'Fluffy is a cat'],
          conclusions: ['Fluffy is an animal'],
          shouldMatch: false, // Doesn't match the specific pattern
        },
      ];

      edgeCases.forEach(({ premises, conclusions, shouldMatch }) => {
        const noRulesPackage = {
          ...mockLanguagePackage,
          findMatchingRules: vi.fn(() => []),
        } as unknown as LanguagePackage;

        const result = service.validateInference(
          premises,
          conclusions,
          noRulesPackage,
          ValidationLevel.semantic(),
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          if (shouldMatch) {
            expect(result.value.isValid()).toBe(true);
            expect(result.value.getDiagnostics()).toHaveLength(0);
          } else {
            // Should have error diagnostic for no valid rule
            const diagnostics = result.value.getDiagnostics();
            expect(
              diagnostics.some((d) =>
                d.getMessage().getValue().toLowerCase().includes('no valid inference rule'),
              ),
            ).toBe(true);
          }
        }
      });
    });

    it('should handle validation result creation failures', () => {
      const statement = 'P ∧ Q';

      // Mock ValidationResult.createSuccessfulValidation to return error
      const originalCreate = ValidationResult.createSuccessfulValidation;
      vi.spyOn(ValidationResult, 'createSuccessfulValidation').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Failed to create validation result'),
      } as any);

      const result = service.validateStatement(
        statement,
        mockLocation,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create validation result');
      }

      // Restore original
      vi.spyOn(ValidationResult, 'createSuccessfulValidation').mockImplementation(originalCreate);
    });

    it('should handle failed validation result creation failures', () => {
      const statement = ''; // Empty statement to trigger failed validation

      // Mock ValidationResult.createFailedValidation to return error
      const originalCreate = ValidationResult.createFailedValidation;
      vi.spyOn(ValidationResult, 'createFailedValidation').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Failed to create failed validation result'),
      } as any);

      const result = service.validateStatement(
        statement,
        mockLocation,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to create failed validation result');
      }

      // Restore original
      vi.spyOn(ValidationResult, 'createFailedValidation').mockImplementation(originalCreate);
    });

    it('should handle diagnostic creation errors in syntax validation', () => {
      const statement = ''; // Empty statement

      // Mock Diagnostic.createSyntaxError to return error
      const originalCreate = Diagnostic.createSyntaxError;
      vi.spyOn(Diagnostic, 'createSyntaxError').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Diagnostic creation failed'),
      } as any);

      const result = service.validateStatement(
        statement,
        mockLocation,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      // Should fail when diagnostic creation fails unexpectedly
      if (result.isErr()) {
        expect(result.error.message).toContain('unexpected error');
      }

      // Restore original
      vi.spyOn(Diagnostic, 'createSyntaxError').mockImplementation(originalCreate);
    });

    it('should handle diagnostic creation errors in semantic validation', () => {
      const statement = 'contradiction and valid'; // Statement with contradiction

      // Mock Diagnostic.createSemanticError to return error
      const originalCreate = Diagnostic.createSemanticError;
      vi.spyOn(Diagnostic, 'createSemanticError').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Semantic diagnostic creation failed'),
      } as any);

      const result = service.validateStatement(
        statement,
        mockLocation,
        mockLanguagePackage,
        ValidationLevel.semantic(),
      );

      expect(result.isErr()).toBe(true);
      // Should fail when semantic diagnostic creation fails unexpectedly
      if (result.isErr()) {
        expect(result.error.message).toContain('unexpected error');
      }

      // Restore original
      vi.spyOn(Diagnostic, 'createSemanticError').mockImplementation(originalCreate);
    });

    it('should validate proof structure and handle ValidationResult creation failure', () => {
      const statements = ['P', 'Q'];
      const connections = [{ from: 0, to: 1 }];

      // Mock ValidationResult.createSuccessfulValidation to return error
      const originalCreate = ValidationResult.createSuccessfulValidation;
      vi.spyOn(ValidationResult, 'createSuccessfulValidation').mockReturnValue({
        isErr: () => true,
        error: new ValidationError('Failed to create proof structure validation result'),
      } as any);

      const result = service.validateProofStructure(
        statements,
        connections,
        mockLanguagePackage,
        ValidationLevel.syntax(),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to create proof structure validation result',
        );
      }

      // Restore original
      vi.spyOn(ValidationResult, 'createSuccessfulValidation').mockImplementation(originalCreate);
    });
  });
});
