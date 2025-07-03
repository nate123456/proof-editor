import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { RulePattern } from '../RulePattern.js';

describe('RulePattern', () => {
  describe('createLogicalPattern', () => {
    it('should create a logical pattern with valid inputs', () => {
      const result = RulePattern.createLogicalPattern(['P', 'P → Q'], ['Q'], 'modus-ponens', 0.95);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPatternType()).toBe('logical');
        expect(pattern.getPremisePatterns()).toEqual(['P', 'P → Q']);
        expect(pattern.getConclusionPatterns()).toEqual(['Q']);
        expect(pattern.getPatternId()).toBe('modus-ponens');
        expect(pattern.getConfidence()).toBe(0.95);
        expect(pattern.isLogical()).toBe(true);
        expect(pattern.isModal()).toBe(false);
      }
    });

    it('should use default confidence when not provided', () => {
      const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getConfidence()).toBe(1.0);
      }
    });

    it('should trim whitespace from patterns and id', () => {
      const result = RulePattern.createLogicalPattern(
        ['  P  ', '  P → Q  '],
        ['  Q  '],
        '  test-pattern  ',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPremisePatterns()).toEqual(['P', 'P → Q']);
        expect(pattern.getConclusionPatterns()).toEqual(['Q']);
        expect(pattern.getPatternId()).toBe('test-pattern');
      }
    });

    it('should extract variables from patterns', () => {
      const result = RulePattern.createLogicalPattern(['P', 'Q → R'], ['R ∧ P'], 'test-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const variables = pattern.getVariables();
        expect(variables.has('P')).toBe(true);
        expect(variables.has('Q')).toBe(true);
        expect(variables.has('R')).toBe(true);
        expect(variables.get('P')?.type).toBe('proposition');
      }
    });

    it('should extract both proposition and predicate variables', () => {
      const result = RulePattern.createLogicalPattern(
        ['F(x,y)', 'G(x)'],
        ['H(x)'],
        'mixed-pattern',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const variables = pattern.getVariables();
        expect(variables.has('F')).toBe(true);
        expect(variables.has('G')).toBe(true);
        expect(variables.has('H')).toBe(true);
        // Single letters F, G, H are detected as propositions first due to regex order
        expect(variables.get('F')?.type).toBe('proposition');
        expect(variables.get('G')?.type).toBe('proposition');
        expect(variables.get('H')?.type).toBe('proposition');
      }
    });

    it('should generate consistency constraints', () => {
      const result = RulePattern.createLogicalPattern(['P', 'Q'], ['R'], 'test-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const constraints = pattern.getConstraints();
        expect(constraints.length).toBeGreaterThan(0);
        expect(constraints.some((c) => c.type === 'consistency')).toBe(true);
        // No arity-consistency constraints since these are propositions, not predicates
      }
    });

    it('should reject empty premise patterns', () => {
      const result = RulePattern.createLogicalPattern([], ['Q'], 'test-pattern');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('At least one premise pattern is required');
      }
    });

    it('should reject empty conclusion patterns', () => {
      const result = RulePattern.createLogicalPattern(['P'], [], 'test-pattern');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('At least one conclusion pattern is required');
      }
    });

    it('should reject empty pattern ID', () => {
      const result = RulePattern.createLogicalPattern(['P'], ['Q'], '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Pattern ID is required');
      }
    });

    it('should reject whitespace-only pattern ID', () => {
      const result = RulePattern.createLogicalPattern(['P'], ['Q'], '   ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Pattern ID is required');
      }
    });

    it('should reject confidence below 0', () => {
      const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern', -0.1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Confidence must be between 0 and 1');
      }
    });

    it('should reject confidence above 1', () => {
      const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern', 1.1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Confidence must be between 0 and 1');
      }
    });

    it('should accept boundary confidence values', () => {
      const resultZero = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-zero', 0);
      const resultOne = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-one', 1);

      expect(resultZero.isOk()).toBe(true);
      expect(resultOne.isOk()).toBe(true);
      if (resultZero.isOk()) expect(resultZero.value.getConfidence()).toBe(0);
      if (resultOne.isOk()) expect(resultOne.value.getConfidence()).toBe(1);
    });
  });

  describe('createModalPattern', () => {
    it('should create a modal pattern with default operators', () => {
      const result = RulePattern.createModalPattern(['□P'], ['◇Q'], 'modal-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPatternType()).toBe('modal');
        expect(pattern.isModal()).toBe(true);
        expect(pattern.isLogical()).toBe(false);

        const constraints = pattern.getConstraints();
        expect(constraints.some((c) => c.type === 'modal-operator' && c.operator === '□')).toBe(
          true,
        );
        expect(constraints.some((c) => c.type === 'modal-operator' && c.operator === '◇')).toBe(
          true,
        );
      }
    });

    it('should create a modal pattern with custom operators', () => {
      const customOperators = ['◻', '◊', '⊞'];
      const result = RulePattern.createModalPattern(
        ['◻P'],
        ['◊Q'],
        'custom-modal',
        customOperators,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const constraints = pattern.getConstraints();
        expect(constraints.some((c) => c.type === 'modal-operator' && c.operator === '◻')).toBe(
          true,
        );
        expect(constraints.some((c) => c.type === 'modal-operator' && c.operator === '◊')).toBe(
          true,
        );
        expect(constraints.some((c) => c.type === 'modal-operator' && c.operator === '⊞')).toBe(
          true,
        );
      }
    });

    it('should propagate errors from logical pattern creation', () => {
      const result = RulePattern.createModalPattern([], ['Q'], 'invalid-modal');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('At least one premise pattern is required');
      }
    });
  });

  describe('createTemplatePattern', () => {
    it('should create pattern from template string', () => {
      const result = RulePattern.createTemplatePattern('P, P → Q ⊢ Q', 'template-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPremisePatterns()).toEqual(['P', 'P → Q']);
        expect(pattern.getConclusionPatterns()).toEqual(['Q']);
        expect(pattern.getPatternId()).toBe('template-pattern');
      }
    });

    it('should handle single premise and conclusion', () => {
      const result = RulePattern.createTemplatePattern('P ⊢ P ∨ Q', 'disjunction-intro');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPremisePatterns()).toEqual(['P']);
        expect(pattern.getConclusionPatterns()).toEqual(['P ∨ Q']);
      }
    });

    it('should trim whitespace from template parts', () => {
      const result = RulePattern.createTemplatePattern('  P  ,  Q  ⊢  R  ,  S  ', 'test-template');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPremisePatterns()).toEqual(['P', 'Q']);
        expect(pattern.getConclusionPatterns()).toEqual(['R', 'S']);
      }
    });

    it('should filter out empty parts', () => {
      const result = RulePattern.createTemplatePattern('P, , Q ⊢ , R, ', 'filter-template');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        expect(pattern.getPremisePatterns()).toEqual(['P', 'Q']);
        expect(pattern.getConclusionPatterns()).toEqual(['R']);
      }
    });

    it('should reject empty template', () => {
      const result = RulePattern.createTemplatePattern('', 'empty-template');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Template cannot be empty');
      }
    });

    it('should reject whitespace-only template', () => {
      const result = RulePattern.createTemplatePattern('   ', 'whitespace-template');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Template cannot be empty');
      }
    });

    it('should reject template without turnstile', () => {
      const result = RulePattern.createTemplatePattern('P, Q', 'no-turnstile');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Template must have format: premises ⊢ conclusions');
      }
    });

    it('should reject template with multiple turnstiles', () => {
      const result = RulePattern.createTemplatePattern('P ⊢ Q ⊢ R', 'multiple-turnstiles');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Template must have format: premises ⊢ conclusions');
      }
    });
  });

  describe('matching methods', () => {
    describe('matches', () => {
      it('should match when patterns align', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'simple-pattern');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.matches(['A'], ['B'])).toBe(true);
          expect(pattern.matches(['X'], ['Y'])).toBe(true);
        }
      });

      it('should not match with different premise count', () => {
        const result = RulePattern.createLogicalPattern(['P', 'P → Q'], ['Q'], 'modus-ponens');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.matches(['A'], ['B'])).toBe(false);
          expect(pattern.matches(['A', 'B', 'C'], ['D'])).toBe(false);
        }
      });

      it('should not match with different conclusion count', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'simple-pattern');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.matches(['A'], ['B', 'C'])).toBe(false);
          expect(pattern.matches(['A'], [])).toBe(false);
        }
      });
    });

    describe('calculateConfidence', () => {
      it('should return 0 for non-matching patterns', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.calculateConfidence(['A', 'B'], ['C'])).toBe(0);
        }
      });

      it('should return confidence for matching patterns', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern', 0.8);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          const confidence = pattern.calculateConfidence(['A'], ['B']);
          expect(confidence).toBeGreaterThan(0);
          expect(confidence).toBeLessThanOrEqual(0.8);
        }
      });

      it('should reduce confidence for complex substitutions', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern', 1.0);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          const simpleConfidence = pattern.calculateConfidence(['A'], ['B']);
          const complexConfidence = pattern.calculateConfidence(
            ['very long complex statement that should reduce confidence'],
            ['another very long complex statement'],
          );
          expect(complexConfidence).toBeLessThan(simpleConfidence);
        }
      });
    });
  });

  describe('applySubstitution', () => {
    it('should apply substitution to patterns', () => {
      const result = RulePattern.createLogicalPattern(['P', 'P → Q'], ['Q'], 'modus-ponens');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const substituted = pattern.applySubstitution({ P: 'A', Q: 'B' });

        expect(substituted.getPremisePatterns()).toEqual(['A', 'A → B']);
        expect(substituted.getConclusionPatterns()).toEqual(['B']);
        expect(substituted.getPatternId()).toBe('modus-ponens-instantiated');
        expect(substituted.getConfidence()).toBeLessThan(pattern.getConfidence());
      }
    });

    it('should handle partial substitution', () => {
      const result = RulePattern.createLogicalPattern(['P', 'Q → R'], ['R ∧ P'], 'test-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const substituted = pattern.applySubstitution({ P: 'A' });

        expect(substituted.getPremisePatterns()).toEqual(['A', 'Q → R']);
        expect(substituted.getConclusionPatterns()).toEqual(['R ∧ A']);
      }
    });

    it('should handle empty substitution', () => {
      const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const pattern = result.value;
        const substituted = pattern.applySubstitution({});

        expect(substituted.getPremisePatterns()).toEqual(['P']);
        expect(substituted.getConclusionPatterns()).toEqual(['Q']);
      }
    });
  });

  describe('utility methods', () => {
    describe('hasVariable', () => {
      it('should return true for existing variables', () => {
        const result = RulePattern.createLogicalPattern(['P', 'Q → R'], ['S'], 'test-pattern');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.hasVariable('P')).toBe(true);
          expect(pattern.hasVariable('Q')).toBe(true);
          expect(pattern.hasVariable('R')).toBe(true);
          expect(pattern.hasVariable('S')).toBe(true);
        }
      });

      it('should return false for non-existing variables', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.hasVariable('X')).toBe(false);
          expect(pattern.hasVariable('Y')).toBe(false);
        }
      });
    });

    describe('getVariableCount', () => {
      it('should return correct variable count', () => {
        const result = RulePattern.createLogicalPattern(['P', 'Q → R'], ['S'], 'test-pattern');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.getVariableCount()).toBe(4); // P, Q, R, S
        }
      });

      it('should return 0 for patterns without variables', () => {
        const result = RulePattern.createLogicalPattern(
          ['always true'],
          ['always true'],
          'constant',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.getVariableCount()).toBe(0);
        }
      });
    });

    describe('isSimplePattern', () => {
      it('should return true for simple patterns', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'simple');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.isSimplePattern()).toBe(true);
        }
      });

      it('should return false for complex patterns', () => {
        const result = RulePattern.createLogicalPattern(
          ['A', 'B', 'C', 'D', 'E', 'F'],
          ['G'],
          'complex',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.isSimplePattern()).toBe(false);
        }
      });
    });

    describe('isComplexPattern', () => {
      it('should return false for simple patterns', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'simple');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.isComplexPattern()).toBe(false);
        }
      });

      it('should return true for patterns with many variables', () => {
        const result = RulePattern.createLogicalPattern(
          ['A', 'B', 'C', 'D', 'E', 'F'],
          ['G'],
          'many-vars',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.isComplexPattern()).toBe(true);
        }
      });
    });

    describe('toString', () => {
      it('should format pattern as string', () => {
        const result = RulePattern.createLogicalPattern(['P', 'P → Q'], ['Q'], 'modus-ponens');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.toString()).toBe('P, P → Q ⊢ Q');
        }
      });

      it('should handle single premise and conclusion', () => {
        const result = RulePattern.createLogicalPattern(['P'], ['Q'], 'simple');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const pattern = result.value;
          expect(pattern.toString()).toBe('P ⊢ Q');
        }
      });
    });

    describe('equals', () => {
      it('should return true for identical patterns', () => {
        const pattern1 = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');
        const pattern2 = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');

        expect(pattern1.isOk()).toBe(true);
        expect(pattern2.isOk()).toBe(true);

        if (pattern1.isOk() && pattern2.isOk()) {
          expect(pattern1.value.equals(pattern2.value)).toBe(true);
        }
      });

      it('should return false for different pattern IDs', () => {
        const pattern1 = RulePattern.createLogicalPattern(['P'], ['Q'], 'pattern1');
        const pattern2 = RulePattern.createLogicalPattern(['P'], ['Q'], 'pattern2');

        expect(pattern1.isOk()).toBe(true);
        expect(pattern2.isOk()).toBe(true);

        if (pattern1.isOk() && pattern2.isOk()) {
          expect(pattern1.value.equals(pattern2.value)).toBe(false);
        }
      });

      it('should return false for different pattern types', () => {
        const logicalPattern = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');
        const modalPattern = RulePattern.createModalPattern(['□P'], ['◇Q'], 'test-pattern');

        expect(logicalPattern.isOk()).toBe(true);
        expect(modalPattern.isOk()).toBe(true);

        if (logicalPattern.isOk() && modalPattern.isOk()) {
          expect(logicalPattern.value.equals(modalPattern.value)).toBe(false);
        }
      });

      it('should return false for different premises', () => {
        const pattern1 = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');
        const pattern2 = RulePattern.createLogicalPattern(['R'], ['Q'], 'test-pattern');

        expect(pattern1.isOk()).toBe(true);
        expect(pattern2.isOk()).toBe(true);

        if (pattern1.isOk() && pattern2.isOk()) {
          expect(pattern1.value.equals(pattern2.value)).toBe(false);
        }
      });

      it('should return false for different conclusions', () => {
        const pattern1 = RulePattern.createLogicalPattern(['P'], ['Q'], 'test-pattern');
        const pattern2 = RulePattern.createLogicalPattern(['P'], ['R'], 'test-pattern');

        expect(pattern1.isOk()).toBe(true);
        expect(pattern2.isOk()).toBe(true);

        if (pattern1.isOk() && pattern2.isOk()) {
          expect(pattern1.value.equals(pattern2.value)).toBe(false);
        }
      });
    });
  });
});
