import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { DiagnosticSeverity } from '../DiagnosticSeverity.js';
import {
  type IValidationRuleMetadata,
  ValidationRule,
  ValidationRuleMetadata,
  type ValidationRulePattern,
} from '../ValidationRule.js';

describe('ValidationRule', () => {
  const createTestPattern = (type: 'regex' | 'literal' = 'literal'): ValidationRulePattern => ({
    type,
    value: type === 'regex' ? '\\b[A-Z]+\\b' : 'test',
  });

  describe('create', () => {
    it('should create validation rule with valid inputs', () => {
      const result = ValidationRule.create(
        'Test Rule',
        'A test validation rule',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        expect(rule.getName()).toBe('Test Rule');
        expect(rule.getDescription()).toBe('A test validation rule');
        expect(rule.getCategory()).toBe('syntax');
        expect(rule.getSeverity().equals(DiagnosticSeverity.error())).toBe(true);
        expect(rule.getPattern()).toEqual(createTestPattern());
        expect(rule.isRuleActive()).toBe(true);
        expect(rule.getId()).toBeDefined();
        expect(rule.getId().length).toBeGreaterThan(0);
      }
    });

    it('should generate unique IDs for different rules', () => {
      const rule1 = ValidationRule.create(
        'Rule One',
        'First rule',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );
      const rule2 = ValidationRule.create(
        'Rule Two',
        'Second rule',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(rule1.isOk()).toBe(true);
      expect(rule2.isOk()).toBe(true);

      if (rule1.isOk() && rule2.isOk()) {
        expect(rule1.value.getId()).not.toBe(rule2.value.getId());
      }
    });

    it('should trim whitespace from name and description', () => {
      const result = ValidationRule.create(
        '  Test Rule  ',
        '  A test description  ',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        expect(rule.getName()).toBe('Test Rule');
        expect(rule.getDescription()).toBe('A test description');
      }
    });

    it('should use custom metadata when provided', () => {
      const customMetadata: IValidationRuleMetadata = {
        autoFix: true,
        educationalHints: ['Custom hint'],
        isExclusive: true,
        performanceWeight: 2,
        priority: 5,
        tags: ['custom'],
      };

      const result = ValidationRule.create(
        'Test Rule',
        'Test description',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern(),
        customMetadata
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        expect(rule.getMetadata()).toEqual(customMetadata);
      }
    });

    it('should reject empty rule name', () => {
      const result = ValidationRule.create(
        '',
        'Valid description',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Rule name cannot be empty');
      }
    });

    it('should reject whitespace-only rule name', () => {
      const result = ValidationRule.create(
        '   ',
        'Valid description',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule name cannot be empty');
      }
    });

    it('should reject empty description', () => {
      const result = ValidationRule.create(
        'Valid name',
        '',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Rule description cannot be empty');
      }
    });

    it('should reject whitespace-only description', () => {
      const result = ValidationRule.create(
        'Valid name',
        '   ',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule description cannot be empty');
      }
    });
  });

  describe('static factory methods', () => {
    describe('createSyntaxRule', () => {
      it('should create syntax rule with default error severity', () => {
        const result = ValidationRule.createSyntaxRule(
          'Syntax Rule',
          'A syntax validation rule',
          createTestPattern()
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getCategory()).toBe('syntax');
          expect(rule.getSeverity().isError()).toBe(true);
          expect(rule.getMetadata().autoFix).toBe(true);
          expect(rule.getMetadata().priority).toBe(10);
          expect(rule.getMetadata().tags).toContain('syntax');
          expect(rule.getMetadata().tags).toContain('critical');
        }
      });

      it('should create syntax rule with custom severity', () => {
        const result = ValidationRule.createSyntaxRule(
          'Syntax Rule',
          'A syntax validation rule',
          createTestPattern(),
          DiagnosticSeverity.warning()
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getSeverity().isWarning()).toBe(true);
        }
      });
    });

    describe('createSemanticRule', () => {
      it('should create semantic rule with default error severity', () => {
        const result = ValidationRule.createSemanticRule(
          'Semantic Rule',
          'A semantic validation rule',
          createTestPattern()
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getCategory()).toBe('semantic');
          expect(rule.getSeverity().isError()).toBe(true);
          expect(rule.getMetadata().educationalHints).toContain('Review logical structure');
          expect(rule.getMetadata().educationalHints).toContain('Check inference validity');
          expect(rule.getMetadata().priority).toBe(5);
          expect(rule.getMetadata().tags).toContain('semantic');
          expect(rule.getMetadata().tags).toContain('logic');
        }
      });

      it('should create semantic rule with custom severity', () => {
        const result = ValidationRule.createSemanticRule(
          'Semantic Rule',
          'A semantic validation rule',
          createTestPattern(),
          DiagnosticSeverity.info()
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getSeverity().isInfo()).toBe(true);
        }
      });
    });

    describe('createStyleRule', () => {
      it('should create style rule with default warning severity', () => {
        const result = ValidationRule.createStyleRule(
          'Style Rule',
          'A style validation rule',
          createTestPattern()
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getCategory()).toBe('style');
          expect(rule.getSeverity().isWarning()).toBe(true);
          expect(rule.getMetadata().autoFix).toBe(true);
          expect(rule.getMetadata().priority).toBe(1);
          expect(rule.getMetadata().tags).toContain('style');
          expect(rule.getMetadata().tags).toContain('formatting');
        }
      });

      it('should create style rule with custom severity', () => {
        const result = ValidationRule.createStyleRule(
          'Style Rule',
          'A style validation rule',
          createTestPattern(),
          DiagnosticSeverity.info()
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getSeverity().isInfo()).toBe(true);
        }
      });
    });
  });

  describe('pattern matching', () => {
    describe('matches', () => {
      it('should match with literal pattern', () => {
        const pattern: ValidationRulePattern = { type: 'literal', value: 'forbidden' };
        const result = ValidationRule.create(
          'Literal Rule',
          'Tests literal matching',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.matches('This contains forbidden text')).toBe(true);
          expect(rule.matches('This is clean text')).toBe(false);
        }
      });

      it('should match with regex pattern', () => {
        const pattern: ValidationRulePattern = { type: 'regex', value: '\\b[A-Z]{2,}\\b' };
        const result = ValidationRule.create(
          'Regex Rule',
          'Tests regex matching',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.matches('This has CAPS words')).toBe(true);
          expect(rule.matches('this has no caps')).toBe(false);
        }
      });

      it('should handle regex flags', () => {
        const pattern: ValidationRulePattern = {
          type: 'regex',
          value: 'test',
          flags: 'i', // Case insensitive
        };
        const result = ValidationRule.create(
          'Case Insensitive Rule',
          'Tests case insensitive matching',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.matches('This is a TEST')).toBe(true);
          expect(rule.matches('This is a Test')).toBe(true);
          expect(rule.matches('This has no match')).toBe(false);
        }
      });

      it('should return false for invalid regex', () => {
        const pattern: ValidationRulePattern = { type: 'regex', value: '[invalid' };
        const result = ValidationRule.create(
          'Invalid Regex Rule',
          'Tests invalid regex handling',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.matches('any text')).toBe(false);
        }
      });

      it('should return false for function patterns (security)', () => {
        const pattern: ValidationRulePattern = { type: 'function', value: 'return true' };
        const result = ValidationRule.create(
          'Function Rule',
          'Tests function pattern security',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.matches('any text')).toBe(false);
        }
      });

      it('should return false for AST patterns (not implemented)', () => {
        const pattern: ValidationRulePattern = { type: 'ast', value: 'some ast pattern' };
        const result = ValidationRule.create(
          'AST Rule',
          'Tests AST pattern',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.matches('any text')).toBe(false);
        }
      });

      it('should return false when rule is inactive', () => {
        const result = ValidationRule.create(
          'Inactive Rule',
          'An inactive rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern('literal')
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const inactiveRule = result.value.deactivate();
          expect(inactiveRule.matches('test')).toBe(false);
        }
      });
    });

    describe('getMatchPositions', () => {
      it('should return empty array for non-matching text', () => {
        const pattern: ValidationRulePattern = { type: 'literal', value: 'forbidden' };
        const result = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const matches = rule.getMatchPositions('clean text');
          expect(matches).toEqual([]);
        }
      });

      it('should return match positions for literal pattern', () => {
        const pattern: ValidationRulePattern = { type: 'literal', value: 'test' };
        const result = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const matches = rule.getMatchPositions('This is a test string with test word');
          expect(matches).toHaveLength(2);
          expect(matches[0]).toEqual({
            start: 10,
            end: 14,
            matchedText: 'test',
            confidence: 1.0,
          });
          expect(matches[1]).toEqual({
            start: 27,
            end: 31,
            matchedText: 'test',
            confidence: 1.0,
          });
        }
      });

      it('should return match positions for regex pattern', () => {
        const pattern: ValidationRulePattern = { type: 'regex', value: '\\b[A-Z]+\\b' };
        const result = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const matches = rule.getMatchPositions('This has CAPS and MORE words');
          expect(matches).toHaveLength(2);
          expect(matches[0]!.matchedText).toBe('CAPS');
          expect(matches[1]!.matchedText).toBe('MORE');
          expect(matches[0]!.confidence).toBeGreaterThan(0);
          expect(matches[1]!.confidence).toBeGreaterThan(0);
        }
      });

      it('should handle regex errors gracefully', () => {
        const pattern: ValidationRulePattern = { type: 'regex', value: '[invalid' };
        const result = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const matches = rule.getMatchPositions('any text');
          expect(matches).toEqual([]);
        }
      });
    });

    describe('validate', () => {
      it('should return validation result for clean text', () => {
        const pattern: ValidationRulePattern = { type: 'literal', value: 'forbidden' };
        const result = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const validationResult = rule.validate('clean text');
          expect(validationResult.isValid).toBe(true);
          expect(validationResult.matches).toEqual([]);
          expect(validationResult.ruleId).toBe(rule.getId());
          expect(validationResult.ruleName).toBe(rule.getName());
          expect(validationResult.severity.equals(rule.getSeverity())).toBe(true);
        }
      });

      it('should return validation result for text with violations', () => {
        const pattern: ValidationRulePattern = { type: 'literal', value: 'forbidden' };
        const result = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          pattern
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const validationResult = rule.validate('This has forbidden content');
          expect(validationResult.isValid).toBe(false);
          expect(validationResult.matches).toHaveLength(1);
          expect(validationResult.matches[0]!.matchedText).toBe('forbidden');
        }
      });

      it('should include suggestions when metadata has educational hints', () => {
        const metadata: IValidationRuleMetadata = {
          ...ValidationRuleMetadata.createDefault(),
          educationalHints: ['Consider alternative wording', 'Check grammar rules'],
        };
        const result = ValidationRule.create(
          'Educational Rule',
          'Rule with hints',
          'educational',
          DiagnosticSeverity.warning(),
          createTestPattern('literal'),
          metadata
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const validationResult = rule.validate('text with test word');
          expect(validationResult.suggestions).toContain('Consider alternative wording');
          expect(validationResult.suggestions).toContain('Check grammar rules');
        }
      });

      it('should include auto-fix suggestion when applicable', () => {
        const metadata: IValidationRuleMetadata = {
          ...ValidationRuleMetadata.createDefault(),
          autoFix: true,
        };
        const result = ValidationRule.create(
          'Auto-fix Rule',
          'Rule with auto-fix',
          'style',
          DiagnosticSeverity.warning(),
          createTestPattern('literal'),
          metadata
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          const validationResult = rule.validate('text with test word');
          expect(validationResult.suggestions).toContain('Apply automatic fix');
        }
      });
    });
  });

  describe('rule combination and modification', () => {
    describe('canCombineWith', () => {
      it('should allow combination of compatible rules', () => {
        const rule1Result = ValidationRule.create(
          'Rule 1',
          'First rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );
        const rule2Result = ValidationRule.create(
          'Rule 2',
          'Second rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );

        expect(rule1Result.isOk()).toBe(true);
        expect(rule2Result.isOk()).toBe(true);

        if (rule1Result.isOk() && rule2Result.isOk()) {
          expect(rule1Result.value.canCombineWith(rule2Result.value)).toBe(true);
        }
      });

      it('should reject combination of different categories', () => {
        const syntaxRule = ValidationRule.create(
          'Syntax Rule',
          'Syntax rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );
        const semanticRule = ValidationRule.create(
          'Semantic Rule',
          'Semantic rule',
          'semantic',
          DiagnosticSeverity.error(),
          createTestPattern()
        );

        expect(syntaxRule.isOk()).toBe(true);
        expect(semanticRule.isOk()).toBe(true);

        if (syntaxRule.isOk() && semanticRule.isOk()) {
          expect(syntaxRule.value.canCombineWith(semanticRule.value)).toBe(false);
        }
      });

      it('should reject combination of different severities', () => {
        const errorRule = ValidationRule.create(
          'Error Rule',
          'Error rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );
        const warningRule = ValidationRule.create(
          'Warning Rule',
          'Warning rule',
          'syntax',
          DiagnosticSeverity.warning(),
          createTestPattern()
        );

        expect(errorRule.isOk()).toBe(true);
        expect(warningRule.isOk()).toBe(true);

        if (errorRule.isOk() && warningRule.isOk()) {
          expect(errorRule.value.canCombineWith(warningRule.value)).toBe(false);
        }
      });

      it('should reject combination when either rule is exclusive', () => {
        const exclusiveMetadata: IValidationRuleMetadata = {
          ...ValidationRuleMetadata.createDefault(),
          isExclusive: true,
        };
        const normalRule = ValidationRule.create(
          'Normal Rule',
          'Normal rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );
        const exclusiveRule = ValidationRule.create(
          'Exclusive Rule',
          'Exclusive rule',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern(),
          exclusiveMetadata
        );

        expect(normalRule.isOk()).toBe(true);
        expect(exclusiveRule.isOk()).toBe(true);

        if (normalRule.isOk() && exclusiveRule.isOk()) {
          expect(normalRule.value.canCombineWith(exclusiveRule.value)).toBe(false);
          expect(exclusiveRule.value.canCombineWith(normalRule.value)).toBe(false);
        }
      });
    });

    describe('withSeverity', () => {
      it('should create new rule with different severity', () => {
        const originalResult = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );

        expect(originalResult.isOk()).toBe(true);
        if (originalResult.isOk()) {
          const original = originalResult.value;
          const modified = original.withSeverity(DiagnosticSeverity.warning());

          expect(modified.getSeverity().isWarning()).toBe(true);
          expect(original.getSeverity().isError()).toBe(true); // Original unchanged
          expect(modified.getName()).toBe(original.getName()); // Other properties preserved
          expect(modified.getId()).toBe(original.getId());
        }
      });
    });

    describe('activate and deactivate', () => {
      it('should create activated rule', () => {
        const originalResult = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );

        expect(originalResult.isOk()).toBe(true);
        if (originalResult.isOk()) {
          const original = originalResult.value;
          const deactivated = original.deactivate();
          const reactivated = deactivated.activate();

          expect(original.isRuleActive()).toBe(true);
          expect(deactivated.isRuleActive()).toBe(false);
          expect(reactivated.isRuleActive()).toBe(true);
        }
      });

      it('should preserve other properties when activating/deactivating', () => {
        const originalResult = ValidationRule.create(
          'Test Rule',
          'Test description',
          'syntax',
          DiagnosticSeverity.error(),
          createTestPattern()
        );

        expect(originalResult.isOk()).toBe(true);
        if (originalResult.isOk()) {
          const original = originalResult.value;
          const deactivated = original.deactivate();

          expect(deactivated.getName()).toBe(original.getName());
          expect(deactivated.getDescription()).toBe(original.getDescription());
          expect(deactivated.getCategory()).toBe(original.getCategory());
          expect(deactivated.getId()).toBe(original.getId());
        }
      });
    });
  });

  describe('equals', () => {
    it('should return true for rules with same ID', () => {
      const ruleResult = ValidationRule.create(
        'Test Rule',
        'Test description',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(ruleResult.isOk()).toBe(true);
      if (ruleResult.isOk()) {
        const rule = ruleResult.value;
        const modified = rule.withSeverity(DiagnosticSeverity.warning());
        expect(rule.equals(modified)).toBe(true); // Same ID despite different severity
      }
    });

    it('should return false for rules with different IDs', () => {
      const rule1Result = ValidationRule.create(
        'Rule 1',
        'First rule',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );
      const rule2Result = ValidationRule.create(
        'Rule 2',
        'Second rule',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern()
      );

      expect(rule1Result.isOk()).toBe(true);
      expect(rule2Result.isOk()).toBe(true);

      if (rule1Result.isOk() && rule2Result.isOk()) {
        expect(rule1Result.value.equals(rule2Result.value)).toBe(false);
      }
    });
  });

  describe('ValidationRuleMetadata factory methods', () => {
    describe('createDefault', () => {
      it('should create default metadata', () => {
        const metadata = ValidationRuleMetadata.createDefault();

        expect(metadata.autoFix).toBe(false);
        expect(metadata.educationalHints).toEqual([]);
        expect(metadata.isExclusive).toBe(false);
        expect(metadata.performanceWeight).toBe(1);
        expect(metadata.priority).toBe(0);
        expect(metadata.tags).toEqual([]);
      });
    });

    describe('createForSyntax', () => {
      it('should create syntax-specific metadata', () => {
        const metadata = ValidationRuleMetadata.createForSyntax();

        expect(metadata.autoFix).toBe(true);
        expect(metadata.priority).toBe(10);
        expect(metadata.tags).toContain('syntax');
        expect(metadata.tags).toContain('critical');
      });
    });

    describe('createForSemantic', () => {
      it('should create semantic-specific metadata', () => {
        const metadata = ValidationRuleMetadata.createForSemantic();

        expect(metadata.educationalHints).toContain('Review logical structure');
        expect(metadata.educationalHints).toContain('Check inference validity');
        expect(metadata.priority).toBe(5);
        expect(metadata.tags).toContain('semantic');
        expect(metadata.tags).toContain('logic');
      });
    });

    describe('createForStyle', () => {
      it('should create style-specific metadata', () => {
        const metadata = ValidationRuleMetadata.createForStyle();

        expect(metadata.autoFix).toBe(true);
        expect(metadata.priority).toBe(1);
        expect(metadata.tags).toContain('style');
        expect(metadata.tags).toContain('formatting');
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty text validation', () => {
      const result = ValidationRule.create(
        'Test Rule',
        'Test description',
        'syntax',
        DiagnosticSeverity.error(),
        createTestPattern('literal')
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        const validationResult = rule.validate('');
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.matches).toEqual([]);
      }
    });

    it('should handle very long text', () => {
      const longText = 'test '.repeat(10000);
      const pattern: ValidationRulePattern = { type: 'literal', value: 'test' };
      const result = ValidationRule.create(
        'Performance Rule',
        'Tests performance with long text',
        'syntax',
        DiagnosticSeverity.error(),
        pattern
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        const validationResult = rule.validate(longText);
        expect(validationResult.matches.length).toBe(10000);
      }
    });

    it('should handle special regex characters in literal patterns', () => {
      const pattern: ValidationRulePattern = { type: 'literal', value: '.*+?[]{}()^$|\\' };
      const result = ValidationRule.create(
        'Special Chars Rule',
        'Tests special characters',
        'syntax',
        DiagnosticSeverity.error(),
        pattern
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        expect(rule.matches('Text with .*+?[]{}()^$|\\ special chars')).toBe(true);
        expect(rule.matches('Text without special chars')).toBe(false);
      }
    });

    it('should handle patterns with context weight', () => {
      const pattern: ValidationRulePattern = {
        type: 'literal',
        value: 'test',
        contextWeight: 0.8,
      };
      const result = ValidationRule.create(
        'Context Rule',
        'Tests context weight',
        'syntax',
        DiagnosticSeverity.error(),
        pattern
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        const matches = rule.getMatchPositions('test');
        expect(matches[0]!.confidence).toBeGreaterThan(0);
        expect(matches[0]!.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
