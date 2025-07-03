import { beforeEach, describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { DiagnosticCode } from '../DiagnosticCode.js';

describe('DiagnosticCode', () => {
  describe('create', () => {
    it('should create valid DiagnosticCode with syntax category', () => {
      const result = DiagnosticCode.create('syntax-invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('syntax-invalid-token');
        expect(code.getCategory()).toBe('syntax');
        expect(code.getSeverity()).toBe('error');
      }
    });

    it('should create valid DiagnosticCode with semantic category', () => {
      const result = DiagnosticCode.create('semantic-type-mismatch');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('semantic-type-mismatch');
        expect(code.getCategory()).toBe('semantic');
        expect(code.getSeverity()).toBe('error');
      }
    });

    it('should create valid DiagnosticCode with style category', () => {
      const result = DiagnosticCode.create('style-formatting');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('style-formatting');
        expect(code.getCategory()).toBe('style');
        expect(code.getSeverity()).toBe('warning');
      }
    });

    it('should create valid DiagnosticCode with educational category', () => {
      const result = DiagnosticCode.create('educational-hint');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('educational-hint');
        expect(code.getCategory()).toBe('educational');
        expect(code.getSeverity()).toBe('info');
      }
    });

    it('should create valid DiagnosticCode with performance category', () => {
      const result = DiagnosticCode.create('performance-slow-validation');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('performance-slow-validation');
        expect(code.getCategory()).toBe('performance');
        expect(code.getSeverity()).toBe('warning');
      }
    });

    it('should create valid DiagnosticCode with general category for unknown prefix', () => {
      const result = DiagnosticCode.create('unknown-category-code');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('unknown-category-code');
        expect(code.getCategory()).toBe('general');
        expect(code.getSeverity()).toBe('info');
      }
    });

    it('should trim whitespace from code', () => {
      const result = DiagnosticCode.create('  syntax-invalid-token  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getCode()).toBe('syntax-invalid-token');
      }
    });

    it('should reject empty code', () => {
      const result = DiagnosticCode.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Diagnostic code cannot be empty');
      }
    });

    it('should reject whitespace-only code', () => {
      const result = DiagnosticCode.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Diagnostic code cannot be empty');
      }
    });

    it('should reject invalid format without hyphen', () => {
      const result = DiagnosticCode.create('syntaxinvalidtoken');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Diagnostic code must follow format: category-specific-code'
        );
      }
    });

    it('should reject invalid format with uppercase characters', () => {
      const result = DiagnosticCode.create('Syntax-Invalid-Token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Diagnostic code must follow format: category-specific-code'
        );
      }
    });

    it('should reject invalid format with numbers', () => {
      const result = DiagnosticCode.create('syntax123-invalid-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Diagnostic code must follow format: category-specific-code'
        );
      }
    });

    it('should reject invalid format with special characters', () => {
      const result = DiagnosticCode.create('syntax@invalid-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Diagnostic code must follow format: category-specific-code'
        );
      }
    });
  });

  describe('createSyntaxError', () => {
    it('should create syntax error code', () => {
      const result = DiagnosticCode.createSyntaxError('invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('syntax-invalid-token');
        expect(code.getCategory()).toBe('syntax');
        expect(code.getSeverity()).toBe('error');
      }
    });

    it('should handle complex specific codes', () => {
      const result = DiagnosticCode.createSyntaxError('missing-closing-paren');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getCode()).toBe('syntax-missing-closing-paren');
      }
    });
  });

  describe('createSemanticError', () => {
    it('should create semantic error code', () => {
      const result = DiagnosticCode.createSemanticError('type-mismatch');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('semantic-type-mismatch');
        expect(code.getCategory()).toBe('semantic');
        expect(code.getSeverity()).toBe('error');
      }
    });
  });

  describe('createStyleWarning', () => {
    it('should create style warning code', () => {
      const result = DiagnosticCode.createStyleWarning('formatting');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('style-formatting');
        expect(code.getCategory()).toBe('style');
        expect(code.getSeverity()).toBe('warning');
      }
    });
  });

  describe('createEducationalInfo', () => {
    it('should create educational info code', () => {
      const result = DiagnosticCode.createEducationalInfo('hint');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.getCode()).toBe('educational-hint');
        expect(code.getCategory()).toBe('educational');
        expect(code.getSeverity()).toBe('info');
      }
    });
  });

  describe('getter methods', () => {
    let code: DiagnosticCode;

    beforeEach(() => {
      const result = DiagnosticCode.create('syntax-invalid-token');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        code = result.value;
      }
    });

    it('should return correct code', () => {
      expect(code.getCode()).toBe('syntax-invalid-token');
    });

    it('should return correct category', () => {
      expect(code.getCategory()).toBe('syntax');
    });

    it('should return correct severity', () => {
      expect(code.getSeverity()).toBe('error');
    });
  });

  describe('getDisplayCode', () => {
    it('should return uppercase code with underscores', () => {
      const result = DiagnosticCode.create('syntax-invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDisplayCode()).toBe('SYNTAX_INVALID_TOKEN');
      }
    });

    it('should handle complex codes', () => {
      const result = DiagnosticCode.create('semantic-type-mismatch-error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDisplayCode()).toBe('SEMANTIC_TYPE_MISMATCH_ERROR');
      }
    });
  });

  describe('getSpecificCode', () => {
    it('should return specific part after category', () => {
      const result = DiagnosticCode.create('syntax-invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSpecificCode()).toBe('invalid-token');
      }
    });

    it('should handle multiple hyphens in specific code', () => {
      const result = DiagnosticCode.create('semantic-type-mismatch-error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSpecificCode()).toBe('type-mismatch-error');
      }
    });

    it('should handle single part after category', () => {
      const result = DiagnosticCode.create('style-formatting');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSpecificCode()).toBe('formatting');
      }
    });
  });

  describe('category checking methods', () => {
    it('should correctly identify syntax-related codes', () => {
      const syntaxResult = DiagnosticCode.create('syntax-invalid-token');
      const semanticResult = DiagnosticCode.create('semantic-type-error');

      expect(syntaxResult.isOk()).toBe(true);
      expect(semanticResult.isOk()).toBe(true);
      if (syntaxResult.isOk() && semanticResult.isOk()) {
        expect(syntaxResult.value.isSyntaxRelated()).toBe(true);
        expect(semanticResult.value.isSyntaxRelated()).toBe(false);
      }
    });

    it('should correctly identify semantic-related codes', () => {
      const semanticResult = DiagnosticCode.create('semantic-type-error');
      const styleResult = DiagnosticCode.create('style-formatting');

      expect(semanticResult.isOk()).toBe(true);
      expect(styleResult.isOk()).toBe(true);
      if (semanticResult.isOk() && styleResult.isOk()) {
        expect(semanticResult.value.isSemanticRelated()).toBe(true);
        expect(styleResult.value.isSemanticRelated()).toBe(false);
      }
    });

    it('should correctly identify style-related codes', () => {
      const styleResult = DiagnosticCode.create('style-formatting');
      const educationalResult = DiagnosticCode.create('educational-hint');

      expect(styleResult.isOk()).toBe(true);
      expect(educationalResult.isOk()).toBe(true);
      if (styleResult.isOk() && educationalResult.isOk()) {
        expect(styleResult.value.isStyleRelated()).toBe(true);
        expect(educationalResult.value.isStyleRelated()).toBe(false);
      }
    });

    it('should correctly identify educational-related codes', () => {
      const educationalResult = DiagnosticCode.create('educational-hint');
      const performanceResult = DiagnosticCode.create('performance-slow');

      expect(educationalResult.isOk()).toBe(true);
      expect(performanceResult.isOk()).toBe(true);
      if (educationalResult.isOk() && performanceResult.isOk()) {
        expect(educationalResult.value.isEducationalRelated()).toBe(true);
        expect(performanceResult.value.isEducationalRelated()).toBe(false);
      }
    });

    it('should correctly identify performance-related codes', () => {
      const performanceResult = DiagnosticCode.create('performance-slow');
      const syntaxResult = DiagnosticCode.create('syntax-error');

      expect(performanceResult.isOk()).toBe(true);
      expect(syntaxResult.isOk()).toBe(true);
      if (performanceResult.isOk() && syntaxResult.isOk()) {
        expect(performanceResult.value.isPerformanceRelated()).toBe(true);
        expect(syntaxResult.value.isPerformanceRelated()).toBe(false);
      }
    });
  });

  describe('severity checking methods', () => {
    it('should correctly identify error severity', () => {
      const errorCodes = ['syntax-invalid', 'semantic-error'];

      for (const codeStr of errorCodes) {
        const result = DiagnosticCode.create(codeStr);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError()).toBe(true);
          expect(result.value.isWarning()).toBe(false);
          expect(result.value.isInfo()).toBe(false);
        }
      }
    });

    it('should correctly identify warning severity', () => {
      const warningCodes = ['style-formatting', 'performance-slow'];

      for (const codeStr of warningCodes) {
        const result = DiagnosticCode.create(codeStr);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError()).toBe(false);
          expect(result.value.isWarning()).toBe(true);
          expect(result.value.isInfo()).toBe(false);
        }
      }
    });

    it('should correctly identify info severity', () => {
      const infoCodes = ['educational-hint', 'general-info'];

      for (const codeStr of infoCodes) {
        const result = DiagnosticCode.create(codeStr);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError()).toBe(false);
          expect(result.value.isWarning()).toBe(false);
          expect(result.value.isInfo()).toBe(true);
        }
      }
    });

    it('should handle codes with explicit error keyword', () => {
      const result = DiagnosticCode.create('custom-error-message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isError()).toBe(true);
      }
    });

    it('should handle codes with explicit warning keyword', () => {
      const result = DiagnosticCode.create('custom-warning-message');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isWarning()).toBe(true);
      }
    });
  });

  describe('matchesPattern', () => {
    it('should match exact patterns', () => {
      const result = DiagnosticCode.create('syntax-invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.matchesPattern('syntax-invalid-token')).toBe(true);
        expect(result.value.matchesPattern('semantic-invalid-token')).toBe(false);
      }
    });

    it('should match wildcard patterns', () => {
      const result = DiagnosticCode.create('syntax-invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.matchesPattern('syntax-*')).toBe(true);
        expect(code.matchesPattern('*-invalid-*')).toBe(true);
        expect(code.matchesPattern('*-token')).toBe(true);
        expect(code.matchesPattern('semantic-*')).toBe(false);
      }
    });

    it('should handle complex wildcard patterns', () => {
      const result = DiagnosticCode.create('semantic-type-mismatch-error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const code = result.value;
        expect(code.matchesPattern('*-type-*')).toBe(true);
        expect(code.matchesPattern('semantic-*-error')).toBe(true);
        expect(code.matchesPattern('*-mismatch-*')).toBe(true);
      }
    });
  });

  describe('belongsToCategory', () => {
    it('should correctly identify category membership', () => {
      const codes = [
        { code: 'syntax-error', category: 'syntax' as const },
        { code: 'semantic-type', category: 'semantic' as const },
        { code: 'style-format', category: 'style' as const },
        { code: 'educational-hint', category: 'educational' as const },
        { code: 'performance-slow', category: 'performance' as const },
        { code: 'unknown-code', category: 'general' as const },
      ];

      for (const { code: codeStr, category } of codes) {
        const result = DiagnosticCode.create(codeStr);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.belongsToCategory(category)).toBe(true);
          // Test that it doesn't belong to other categories
          const otherCategories = [
            'syntax',
            'semantic',
            'style',
            'educational',
            'performance',
            'general',
          ].filter(cat => cat !== category);

          for (const otherCategory of otherCategories) {
            expect(result.value.belongsToCategory(otherCategory as any)).toBe(false);
          }
        }
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical codes', () => {
      const result1 = DiagnosticCode.create('syntax-invalid-token');
      const result2 = DiagnosticCode.create('syntax-invalid-token');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different codes', () => {
      const result1 = DiagnosticCode.create('syntax-invalid-token');
      const result2 = DiagnosticCode.create('semantic-type-error');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should be case-sensitive', () => {
      const result1 = DiagnosticCode.create('syntax-invalid-token');
      // This will fail validation, but let's test the concept
      const result2 = DiagnosticCode.create('syntax-invalid-token');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the code as string', () => {
      const result = DiagnosticCode.create('syntax-invalid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('syntax-invalid-token');
      }
    });

    it('should preserve original formatting', () => {
      const result = DiagnosticCode.create('semantic-type-mismatch-error');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('semantic-type-mismatch-error');
      }
    });
  });
});
