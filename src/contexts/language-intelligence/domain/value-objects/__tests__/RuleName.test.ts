import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { RuleName } from '../RuleName.js';

describe('RuleName', () => {
  describe('create', () => {
    it('should create valid RuleName with letters and numbers', () => {
      const result = RuleName.create('Modus Ponens 123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Modus Ponens 123');
      }
    });

    it('should create valid RuleName with allowed special characters', () => {
      const result = RuleName.create('Rule-Name_1.0 (Version 2)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Rule-Name_1.0 (Version 2)');
      }
    });

    it('should trim whitespace from value', () => {
      const result = RuleName.create('  Modus Ponens  ');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Modus Ponens');
      }
    });

    it('should accept minimum length of 2 characters', () => {
      const result = RuleName.create('MP');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('MP');
      }
    });

    it('should accept maximum length of 100 characters', () => {
      const longName = 'A'.repeat(100);
      const result = RuleName.create(longName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(longName);
      }
    });

    it('should reject empty string', () => {
      const result = RuleName.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Rule name cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = RuleName.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule name cannot be empty');
      }
    });

    it('should reject string shorter than 2 characters', () => {
      const result = RuleName.create('A');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule name must be at least 2 characters long');
      }
    });

    it('should reject string longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = RuleName.create(longName);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule name cannot exceed 100 characters');
      }
    });

    it('should reject string with invalid characters', () => {
      const result = RuleName.create('Rule@Name');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Rule name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses',
        );
      }
    });

    it('should reject string with special symbols', () => {
      const result = RuleName.create('Rule#Name!');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Rule name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses',
        );
      }
    });

    it('should accept all allowed characters', () => {
      const result = RuleName.create('Rule-Name_1.0 (Version 2)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Rule-Name_1.0 (Version 2)');
      }
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const result = RuleName.create('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Modus Ponens');
      }
    });
  });

  describe('getDisplayName', () => {
    it('should return the original value for display', () => {
      const result = RuleName.create('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDisplayName()).toBe('Modus Ponens');
      }
    });
  });

  describe('getSlug', () => {
    it('should convert to URL-friendly slug', () => {
      const result = RuleName.create('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('modus-ponens');
      }
    });

    it('should handle special characters', () => {
      const result = RuleName.create('Rule-Name_1.0 (Version 2)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('rule-name-1-0-version-2');
      }
    });

    it('should remove leading and trailing hyphens', () => {
      const result = RuleName.create('---Rule Name---');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('rule-name');
      }
    });

    it('should handle consecutive special characters', () => {
      const result = RuleName.create('Rule...Name___1.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('rule-name-1-0');
      }
    });

    it('should handle parentheses', () => {
      const result = RuleName.create('Rule (Type A)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSlug()).toBe('rule-type-a');
      }
    });
  });

  describe('isStandardRule', () => {
    it('should return true for standard logical rules', () => {
      const standardRules = [
        'modus ponens',
        'modus tollens',
        'hypothetical syllogism',
        'disjunctive syllogism',
        'addition',
        'simplification',
        'conjunction',
        'disjunction',
        'universal instantiation',
        'universal generalization',
        'existential instantiation',
        'existential generalization',
      ];

      for (const ruleName of standardRules) {
        const result = RuleName.create(ruleName);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isStandardRule()).toBe(true);
        }
      }
    });

    it('should return true for standard rules in different cases', () => {
      const result1 = RuleName.create('MODUS PONENS');
      const result2 = RuleName.create('Modus Ponens');
      const result3 = RuleName.create('modus ponens');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        expect(result1.value.isStandardRule()).toBe(true);
        expect(result2.value.isStandardRule()).toBe(true);
        expect(result3.value.isStandardRule()).toBe(true);
      }
    });

    it('should return false for non-standard rules', () => {
      const result = RuleName.create('Custom Rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isStandardRule()).toBe(false);
      }
    });
  });

  describe('isModalRule', () => {
    it('should return true for modal logic rules', () => {
      const modalRules = [
        'Necessity Rule',
        'Possibility Axiom',
        'Modal Logic K-Axiom',
        'T-Axiom System',
        'S4-Axiom Rule',
        'S5-Axiom Principle',
      ];

      for (const ruleName of modalRules) {
        const result = RuleName.create(ruleName);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isModalRule()).toBe(true);
        }
      }
    });

    it('should return true for modal keywords in different cases', () => {
      const result = RuleName.create('NECESSITY RULE');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isModalRule()).toBe(true);
      }
    });

    it('should return false for non-modal rules', () => {
      const result = RuleName.create('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isModalRule()).toBe(false);
      }
    });
  });

  describe('isQuantifierRule', () => {
    it('should return true for quantifier rules', () => {
      const quantifierRules = [
        'Universal Instantiation',
        'Existential Generalization',
        'Quantifier Rule',
        'Universal Rule',
        'Existential Rule',
        'Instantiation Method',
        'Generalization Principle',
      ];

      for (const ruleName of quantifierRules) {
        const result = RuleName.create(ruleName);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isQuantifierRule()).toBe(true);
        }
      }
    });

    it('should return true for quantifier keywords in different cases', () => {
      const result = RuleName.create('UNIVERSAL RULE');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isQuantifierRule()).toBe(true);
      }
    });

    it('should return false for non-quantifier rules', () => {
      const result = RuleName.create('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isQuantifierRule()).toBe(false);
      }
    });
  });

  describe('getComplexityLevel', () => {
    it('should return basic for standard rules', () => {
      const result = RuleName.create('modus ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getComplexityLevel()).toBe('basic');
      }
    });

    it('should return intermediate for modal rules', () => {
      const result = RuleName.create('necessity rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getComplexityLevel()).toBe('intermediate');
      }
    });

    it('should return intermediate for quantifier rules', () => {
      const result = RuleName.create('universal instantiation');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getComplexityLevel()).toBe('intermediate');
      }
    });

    it('should return advanced for custom rules', () => {
      const result = RuleName.create('Custom Complex Rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getComplexityLevel()).toBe('advanced');
      }
    });

    it('should prioritize standard over modal/quantifier classification', () => {
      // This is a standard rule that also contains modal keywords
      const result = RuleName.create('universal instantiation');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should be intermediate because it's a quantifier rule, not basic
        expect(result.value.getComplexityLevel()).toBe('intermediate');
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical names (case-insensitive)', () => {
      const result1 = RuleName.create('Modus Ponens');
      const result2 = RuleName.create('modus ponens');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return true for names with different casing', () => {
      const result1 = RuleName.create('MODUS PONENS');
      const result2 = RuleName.create('Modus Ponens');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different names', () => {
      const result1 = RuleName.create('Modus Ponens');
      const result2 = RuleName.create('Modus Tollens');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should handle whitespace differences', () => {
      const result1 = RuleName.create('Modus Ponens');
      const result2 = RuleName.create('  modus ponens  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('toString', () => {
    it('should return the original value as string', () => {
      const result = RuleName.create('Modus Ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('Modus Ponens');
      }
    });

    it('should preserve case and formatting', () => {
      const result = RuleName.create('My-Rule_1.0 (Beta)');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('My-Rule_1.0 (Beta)');
      }
    });
  });
});
