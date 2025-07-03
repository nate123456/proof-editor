import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { RuleDescription } from '../RuleDescription.js';

describe('RuleDescription', () => {
  describe('create', () => {
    it('should create valid RuleDescription', () => {
      const description =
        'This rule validates that all premises lead to a valid conclusion through logical inference.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(description);
      }
    });

    it('should trim whitespace from value', () => {
      const description =
        '  This is a rule description that explains the logical validation process.  ';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(
          'This is a rule description that explains the logical validation process.',
        );
      }
    });

    it('should accept minimum length of 10 characters', () => {
      const result = RuleDescription.create('Valid rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('Valid rule');
      }
    });

    it('should accept maximum length of 1000 characters', () => {
      const longDescription = 'A'.repeat(1000);
      const result = RuleDescription.create(longDescription);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(longDescription);
      }
    });

    it('should reject empty string', () => {
      const result = RuleDescription.create('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Rule description cannot be empty');
      }
    });

    it('should reject whitespace-only string', () => {
      const result = RuleDescription.create('   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule description cannot be empty');
      }
    });

    it('should reject string shorter than 10 characters', () => {
      const result = RuleDescription.create('Short');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule description must be at least 10 characters long');
      }
    });

    it('should reject string longer than 1000 characters', () => {
      const longDescription = 'A'.repeat(1001);
      const result = RuleDescription.create(longDescription);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule description cannot exceed 1000 characters');
      }
    });

    it('should reject string that becomes too short after trimming', () => {
      const result = RuleDescription.create('  Short  ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule description must be at least 10 characters long');
      }
    });
  });

  describe('getValue', () => {
    it('should return the original value', () => {
      const description = 'This rule validates logical inference patterns.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe(description);
      }
    });
  });

  describe('getSummary', () => {
    it('should return full text when shorter than max length', () => {
      const description = 'This is a short rule description.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSummary(100)).toBe(description);
      }
    });

    it('should truncate and add ellipsis when longer than max length', () => {
      const description =
        'This is a very long rule description that should be truncated because it exceeds the maximum length specified for summaries.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.getSummary(50);
        expect(summary.length).toBeLessThanOrEqual(50);
        expect(summary).toMatch(/\.\.\.$/);
      }
    });

    it('should break at word boundaries when possible', () => {
      const description =
        'This is a rule description that will be truncated at a word boundary to maintain readability.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.getSummary(50);
        expect(summary).toBe('This is a rule description that will be...');
      }
    });

    it('should use character truncation when no good word boundary exists', () => {
      const description = 'Thisisaverylongwordthatwillbetruncat';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.getSummary(20);
        expect(summary).toBe('Thisisaverylongwo...');
      }
    });

    it('should use default max length of 100', () => {
      const description =
        'This is a rule description that might be longer than the default maximum length and should be truncated appropriately.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.getSummary();
        expect(summary.length).toBeLessThanOrEqual(100);
        expect(summary).toMatch(/\.\.\.$/);
      }
    });
  });

  describe('getWordCount', () => {
    it('should count words correctly', () => {
      const description = 'This rule validates that all premises are logically sound.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getWordCount()).toBe(9);
      }
    });

    it('should handle multiple spaces', () => {
      const description = 'Word1   Word2     Word3    Word4';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getWordCount()).toBe(4);
      }
    });

    it('should handle single word', () => {
      const description = 'Description';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getWordCount()).toBe(1);
      }
    });
  });

  describe('containsKeyword', () => {
    it('should find keyword case-insensitively', () => {
      const description = 'This rule validates Logical Inference patterns.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const ruleDesc = result.value;
        expect(ruleDesc.containsKeyword('logical')).toBe(true);
        expect(ruleDesc.containsKeyword('INFERENCE')).toBe(true);
        expect(ruleDesc.containsKeyword('validates')).toBe(true);
        expect(ruleDesc.containsKeyword('missing')).toBe(false);
      }
    });

    it('should handle partial matches', () => {
      const description = 'Propositional logic validation rule';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.containsKeyword('position')).toBe(true);
        expect(result.value.containsKeyword('valid')).toBe(true);
        expect(result.value.containsKeyword('logic')).toBe(true);
      }
    });
  });

  describe('hasLogicalSymbols', () => {
    it('should return true when contains logical symbols', () => {
      const descriptions = [
        'Rule with ∀ quantifier',
        'Rule with ∃ quantifier',
        'Rule with ∧ conjunction',
        'Rule with ∨ disjunction',
        'Rule with → implication',
        'Rule with ↔ biconditional',
        'Rule with ¬ negation',
        'Rule with □ necessity',
        'Rule with ◇ possibility',
      ];

      for (const desc of descriptions) {
        const result = RuleDescription.create(desc);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.hasLogicalSymbols()).toBe(true);
        }
      }
    });

    it('should return false when no logical symbols present', () => {
      const description = 'This rule validates basic text without special symbols.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hasLogicalSymbols()).toBe(false);
      }
    });

    it('should handle multiple logical symbols', () => {
      const description = 'Rule with ∀x(P(x) → Q(x)) ∧ ∃y(R(y))';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hasLogicalSymbols()).toBe(true);
      }
    });
  });

  describe('getReadingTime', () => {
    it('should calculate reading time in minutes', () => {
      // 200 words should take 1 minute
      const words = Array(200).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReadingTime()).toBe(1);
      }
    });

    it('should round up partial minutes', () => {
      // 100 words should take 1 minute (rounded up from 0.5)
      const words = Array(100).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReadingTime()).toBe(1);
      }
    });

    it('should handle very short descriptions', () => {
      const description = 'Short rule description.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReadingTime()).toBe(1);
      }
    });

    it('should calculate correct time for longer texts', () => {
      // 200 words should take 1 minute (at 200 words per minute)
      const words = Array(200).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getReadingTime()).toBe(1);
      }
    });
  });

  describe('isDetailed', () => {
    it('should return true for descriptions with more than 50 words', () => {
      const words = Array(51).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isDetailed()).toBe(true);
      }
    });

    it('should return false for descriptions with 50 or fewer words', () => {
      const words = Array(50).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isDetailed()).toBe(false);
      }
    });

    it('should return false for short descriptions', () => {
      const description = 'Short rule description.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isDetailed()).toBe(false);
      }
    });
  });

  describe('isConcise', () => {
    it('should return true for descriptions with 20 or fewer words', () => {
      const words = Array(20).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isConcise()).toBe(true);
      }
    });

    it('should return false for descriptions with more than 20 words', () => {
      const words = Array(21).fill('word').join(' ');
      const result = RuleDescription.create(words);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isConcise()).toBe(false);
      }
    });

    it('should return true for very short descriptions', () => {
      const description = 'Short rule description.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isConcise()).toBe(true);
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical descriptions', () => {
      const description = 'This rule validates logical inference patterns.';
      const result1 = RuleDescription.create(description);
      const result2 = RuleDescription.create(description);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should return false for different descriptions', () => {
      const result1 = RuleDescription.create('First rule description.');
      const result2 = RuleDescription.create('Second rule description.');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should return true for descriptions with same trimmed content', () => {
      const result1 = RuleDescription.create('Rule description.');
      const result2 = RuleDescription.create('  Rule description.  ');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should be case-sensitive', () => {
      const result1 = RuleDescription.create('Rule description.');
      const result2 = RuleDescription.create('RULE DESCRIPTION.');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should return the description value as string', () => {
      const description = 'This rule validates logical inference patterns.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(description);
      }
    });

    it('should preserve original formatting', () => {
      const description = 'Rule with  multiple   spaces.';
      const result = RuleDescription.create(description);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe(description);
      }
    });
  });
});
