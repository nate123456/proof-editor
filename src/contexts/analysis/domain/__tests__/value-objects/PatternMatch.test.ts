/**
 * Comprehensive test suite for PatternMatch value object
 *
 * Priority: HIGH (Core value object for pattern analysis)
 * Demonstrates:
 * - Complex value object creation with dependencies
 * - Factory methods for different pattern types
 * - Variable management and matching
 * - Context and quality calculations
 * - Property-based testing with complex data
 * - Immutability with transformation methods
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/AnalysisErrors.js';
import {
  MatchContext,
  type PatternIndicator,
  PatternMatch,
  type PatternType,
  type ValidationScope,
} from '../../value-objects/PatternMatch.js';
import { SourceLocation } from '../../value-objects/SourceLocation.js';

// Test helper to create valid source locations
const createTestLocation = (
  startLine = 1,
  startColumn = 0,
  endLine = 1,
  endColumn = 10,
): SourceLocation => {
  const result = SourceLocation.create(startLine, startColumn, endLine, endColumn);
  if (result.isErr()) throw new Error('Failed to create test location');
  return result.value;
};

// Property-based test generators
const validPatternIdArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

const patternTypeArbitrary = fc.constantFrom<PatternType>(
  'inference',
  'structural',
  'modal',
  'syntax',
  'semantic',
  'educational',
  'validation',
);

const validPatternNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const confidenceArbitrary = fc.float({ min: 0, max: 1, noNaN: true });

const validMatchedContentArbitrary = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => s.trim().length > 0);

const variableMapArbitrary = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.string({ minLength: 0, maxLength: 100 }),
  { maxKeys: 10 },
);

const locationArbitrary = fc
  .tuple(fc.nat({ max: 1000 }), fc.nat({ max: 100 }), fc.nat({ max: 1000 }), fc.nat({ max: 100 }))
  .filter(([sl, sc, el, ec]) => el > sl || (el === sl && ec >= sc))
  .map(([sl, sc, el, ec]) => createTestLocation(sl, sc, el, ec));

describe('PatternMatch Value Object', () => {
  describe('Creation and Validation', () => {
    describe('valid creation cases', () => {
      it('should create valid pattern match with minimal parameters', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Modus Ponens',
          location,
          0.85,
          'If P then Q, P, therefore Q',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getPatternId()).toBe('pattern-1');
          expect(match.getPatternType()).toBe('inference');
          expect(match.getPatternName()).toBe('Modus Ponens');
          expect(match.getLocation()).toBe(location);
          expect(match.getConfidence()).toBe(0.85);
          expect(match.getMatchedContent()).toBe('If P then Q, P, therefore Q');
          expect(match.getVariables().size).toBe(0);
          expect(match.getContext()).toBeDefined();
          expect(match.getValidationScope()).toBeUndefined();
        }
      });

      it('should create valid pattern match with all parameters', () => {
        const location = createTestLocation();
        const variables = new Map([
          ['P', 'It is raining'],
          ['Q', 'The ground is wet'],
        ]);
        const context = MatchContext.createForInference();
        const validationScope: ValidationScope = {
          type: 'atomic_argument',
          targetId: 'arg-1',
          includeConnected: true,
          depth: 2,
        };

        const result = PatternMatch.create(
          'pattern-2',
          'inference',
          'Modus Ponens',
          location,
          0.95,
          'If it is raining then the ground is wet',
          variables,
          context,
          validationScope,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getVariables().size).toBe(2);
          expect(match.getVariables().get('P')).toBe('It is raining');
          expect(match.getVariables().get('Q')).toBe('The ground is wet');
          expect(match.getContext()).toBe(context);
          expect(match.getValidationScope()).toEqual(validationScope);
        }
      });

      it('should trim whitespace from string fields', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          '  pattern-3  ',
          'syntax',
          '  Pattern Name  ',
          location,
          0.8,
          '  Matched content  ',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getPatternId()).toBe('pattern-3');
          expect(match.getPatternName()).toBe('Pattern Name');
          expect(match.getMatchedContent()).toBe('Matched content');
        }
      });

      it('should handle property-based valid creation', () => {
        fc.assert(
          fc.property(
            validPatternIdArbitrary,
            patternTypeArbitrary,
            validPatternNameArbitrary,
            locationArbitrary,
            confidenceArbitrary,
            validMatchedContentArbitrary,
            variableMapArbitrary,
            (
              patternId,
              patternType,
              patternName,
              location,
              confidence,
              matchedContent,
              variablesObj,
            ) => {
              const variables = new Map(Object.entries(variablesObj));
              const result = PatternMatch.create(
                patternId,
                patternType,
                patternName,
                location,
                confidence,
                matchedContent,
                variables,
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const match = result.value;
                expect(match.getPatternId()).toBe(patternId.trim());
                expect(match.getPatternType()).toBe(patternType);
                expect(match.getPatternName()).toBe(patternName.trim());
                expect(match.getLocation()).toBe(location);
                expect(match.getConfidence()).toBe(confidence);
                expect(match.getMatchedContent()).toBe(matchedContent.trim());
                expect(match.getVariables().size).toBe(variables.size);
              }
            },
          ),
        );
      });
    });

    describe('invalid creation cases', () => {
      it('should reject empty pattern ID', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          '',
          'inference',
          'Pattern Name',
          location,
          0.8,
          'Content',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Pattern ID cannot be empty');
        }
      });

      it('should reject whitespace-only pattern ID', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          '   ',
          'inference',
          'Pattern Name',
          location,
          0.8,
          'Content',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Pattern ID cannot be empty');
        }
      });

      it('should reject empty pattern name', () => {
        const location = createTestLocation();
        const result = PatternMatch.create('pattern-1', 'inference', '', location, 0.8, 'Content');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Pattern name cannot be empty');
        }
      });

      it('should reject negative confidence', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Pattern Name',
          location,
          -0.1,
          'Content',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Confidence must be between 0 and 1');
        }
      });

      it('should reject confidence greater than 1', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Pattern Name',
          location,
          1.1,
          'Content',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Confidence must be between 0 and 1');
        }
      });

      it('should reject empty matched content', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Pattern Name',
          location,
          0.8,
          '',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Matched content cannot be empty');
        }
      });

      it('should reject whitespace-only matched content', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Pattern Name',
          location,
          0.8,
          '   ',
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Matched content cannot be empty');
        }
      });
    });
  });

  describe('Factory Methods', () => {
    describe('createInferenceMatch', () => {
      it('should create inference pattern match with correct defaults', () => {
        const location = createTestLocation();
        const variables = new Map([
          ['P', 'Premise'],
          ['C', 'Conclusion'],
        ]);

        const result = PatternMatch.createInferenceMatch(
          'inf-1',
          'Modus Ponens',
          location,
          0.9,
          'If P then C',
          variables,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getPatternType()).toBe('inference');
          expect(match.getContext().getAnalysisDepth()).toBe('deep');
          expect(match.getContext().getSurroundingContext()).toBe('inference-rule');
          expect(match.getContext().getRelevanceScore()).toBe(0.9);
          expect(match.getVariables()).toEqual(variables);
        }
      });
    });

    describe('createStructuralMatch', () => {
      it('should create structural pattern match with correct defaults', () => {
        const location = createTestLocation();

        const result = PatternMatch.createStructuralMatch(
          'struct-1',
          'Tree Structure',
          location,
          0.85,
          'Branching argument pattern',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getPatternType()).toBe('structural');
          expect(match.getContext().getAnalysisDepth()).toBe('moderate');
          expect(match.getContext().getSurroundingContext()).toBe('structural-pattern');
          expect(match.getContext().getRelevanceScore()).toBe(0.7);
          expect(match.getVariables().size).toBe(0);
        }
      });
    });

    describe('createValidationPattern', () => {
      it('should create validation pattern match with indicators', () => {
        const location = createTestLocation();
        const validationScope: ValidationScope = {
          type: 'statement',
          targetId: 'stmt-1',
          includeConnected: false,
        };
        const indicators: PatternIndicator[] = [
          { type: 'structural', description: 'Missing premise', strength: 0.8 },
          { type: 'semantic', description: 'Ambiguous reference', strength: 0.6 },
        ];

        const result = PatternMatch.createValidationPattern(
          'val-1',
          'Validation Rule',
          location,
          0.95,
          'Validation pattern detected',
          validationScope,
          indicators,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getPatternType()).toBe('validation');
          expect(match.getValidationScope()).toEqual(validationScope);
          expect(match.getVariables().get('indicator_0')).toBe('Missing premise');
          expect(match.getVariables().get('indicator_1')).toBe('Ambiguous reference');
          expect(match.getContext().getAnalysisDepth()).toBe('deep');
        }
      });
    });

    describe('createModalMatch', () => {
      it('should create modal pattern match with operators', () => {
        const location = createTestLocation();
        const modalOperators = ['necessarily', 'possibly', 'always'];

        const result = PatternMatch.createModalMatch(
          'modal-1',
          'Modal Logic Pattern',
          location,
          0.88,
          'Necessarily P implies possibly Q',
          modalOperators,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.getPatternType()).toBe('modal');
          expect(match.getVariables().get('modal_op_0')).toBe('necessarily');
          expect(match.getVariables().get('modal_op_1')).toBe('possibly');
          expect(match.getVariables().get('modal_op_2')).toBe('always');
          expect(match.getContext().getAnalysisDepth()).toBe('deep');
          expect(match.getContext().getSurroundingContext()).toBe('modal-logic');
        }
      });
    });
  });

  describe('Behavior and Methods', () => {
    describe('confidence levels', () => {
      it('should correctly identify confidence levels', () => {
        const location = createTestLocation();
        const testCases = [
          { confidence: 0.95, high: true, medium: false, low: false },
          { confidence: 0.8, high: true, medium: false, low: false },
          { confidence: 0.79, high: false, medium: true, low: false },
          { confidence: 0.5, high: false, medium: true, low: false },
          { confidence: 0.49, high: false, medium: false, low: true },
          { confidence: 0.1, high: false, medium: false, low: true },
        ];

        testCases.forEach(({ confidence, high, medium, low }) => {
          const result = PatternMatch.create(
            'pattern-1',
            'inference',
            'Test Pattern',
            location,
            confidence,
            'Content',
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const match = result.value;
            expect(match.isHighConfidence()).toBe(high);
            expect(match.isMediumConfidence()).toBe(medium);
            expect(match.isLowConfidence()).toBe(low);
          }
        });
      });
    });

    describe('pattern type checks', () => {
      it('should correctly identify pattern types', () => {
        const location = createTestLocation();
        const types: PatternType[] = ['inference', 'structural', 'modal', 'syntax', 'validation'];

        types.forEach((type) => {
          const result = PatternMatch.create(
            'pattern-1',
            type,
            'Test Pattern',
            location,
            0.8,
            'Content',
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const match = result.value;
            expect(match.isInferencePattern()).toBe(type === 'inference');
            expect(match.isStructuralPattern()).toBe(type === 'structural');
            expect(match.isModalPattern()).toBe(type === 'modal');
            expect(match.isSyntaxPattern()).toBe(type === 'syntax');
            expect(match.isValidationPattern()).toBe(type === 'validation');
          }
        });
      });
    });

    describe('variable management', () => {
      it('should check for variable presence', () => {
        const location = createTestLocation();
        const variables = new Map([
          ['var1', 'value1'],
          ['var2', 'value2'],
        ]);

        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.8,
          'Content',
          variables,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          expect(match.hasVariables()).toBe(true);
          expect(match.getVariableCount()).toBe(2);
          expect(match.hasVariable('var1')).toBe(true);
          expect(match.hasVariable('var3')).toBe(false);
          expect(match.getVariable('var1')).toBe('value1');
          expect(match.getVariable('var3')).toBeUndefined();
        }
      });

      it('should return defensive copy of variables', () => {
        const location = createTestLocation();
        const variables = new Map([['key', 'value']]);

        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.8,
          'Content',
          variables,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          const returnedVars = match.getVariables();

          // Modify returned map
          (returnedVars as any).set('new', 'should not appear');

          // Original should be unchanged
          expect(match.getVariables().has('new')).toBe(false);
          expect(match.getVariableCount()).toBe(1);
        }
      });
    });

    describe('match quality calculation', () => {
      it('should calculate match quality correctly', () => {
        const location = createTestLocation();
        const variables = new Map([
          ['var1', 'value1'],
          ['var2', 'value2'],
          ['var3', ''], // unbound variable
        ]);

        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.9,
          'A reasonably sized matched content string',
          variables,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          const quality = match.getMatchQuality();

          expect(quality.confidence).toBe(0.9);
          expect(quality.completeness).toBeCloseTo(0.667, 2); // 2/3 variables bound
          expect(quality.precision).toBeGreaterThan(0.5);
          expect(quality.precision).toBeLessThanOrEqual(1);
          expect(quality.contextRelevance).toBe(0.5); // default context
          expect(quality.overallScore).toBeDefined();
          expect(quality.overallScore).toBeGreaterThan(0);
          expect(quality.overallScore).toBeLessThanOrEqual(1);
        }
      });

      it('should handle empty variables in quality calculation', () => {
        const location = createTestLocation();

        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.8,
          'Content',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const match = result.value;
          const quality = match.getMatchQuality();

          expect(quality.completeness).toBe(1); // No variables = complete
        }
      });
    });
  });

  describe('Immutability and Transformation', () => {
    describe('withHigherConfidence', () => {
      it('should increase confidence without modifying original', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.7,
          'Content',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const increased = original.withHigherConfidence(0.2);

          // Original unchanged
          expect(original.getConfidence()).toBe(0.7);

          // New instance with higher confidence
          expect(increased.getConfidence()).toBeCloseTo(0.9, 10);
          expect(increased.getPatternId()).toBe(original.getPatternId());
          expect(increased.getMatchedContent()).toBe(original.getMatchedContent());
        }
      });

      it('should cap confidence at 1.0', () => {
        const location = createTestLocation();
        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.9,
          'Content',
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const increased = original.withHigherConfidence(0.5);

          expect(increased.getConfidence()).toBe(1.0);
        }
      });
    });

    describe('withAdditionalVariables', () => {
      it('should add variables without modifying original', () => {
        const location = createTestLocation();
        const originalVars = new Map([['var1', 'value1']]);
        const newVars = new Map([
          ['var2', 'value2'],
          ['var3', 'value3'],
        ]);

        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.8,
          'Content',
          originalVars,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const withMore = original.withAdditionalVariables(newVars);

          // Original unchanged
          expect(original.getVariableCount()).toBe(1);
          expect(original.getVariable('var2')).toBeUndefined();

          // New instance with combined variables
          expect(withMore.getVariableCount()).toBe(3);
          expect(withMore.getVariable('var1')).toBe('value1');
          expect(withMore.getVariable('var2')).toBe('value2');
          expect(withMore.getVariable('var3')).toBe('value3');
        }
      });

      it('should override existing variables with new values', () => {
        const location = createTestLocation();
        const originalVars = new Map([['var1', 'old']]);
        const newVars = new Map([['var1', 'new']]);

        const result = PatternMatch.create(
          'pattern-1',
          'inference',
          'Test Pattern',
          location,
          0.8,
          'Content',
          originalVars,
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const updated = original.withAdditionalVariables(newVars);

          expect(original.getVariable('var1')).toBe('old');
          expect(updated.getVariable('var1')).toBe('new');
        }
      });
    });
  });

  describe('Display Format', () => {
    it('should convert to display format correctly', () => {
      const location = createTestLocation(10, 5, 10, 25);
      const variables = new Map([
        ['P', 'It rains'],
        ['Q', 'Ground is wet'],
      ]);

      const result = PatternMatch.create(
        'pattern-1',
        'inference',
        'Modus Ponens',
        location,
        0.856,
        'If it rains then the ground is wet, it rains, therefore the ground is wet',
        variables,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        const display = match.toDisplayFormat();

        expect(display.patternId).toBe('pattern-1');
        expect(display.patternType).toBe('inference');
        expect(display.patternName).toBe('Modus Ponens');
        expect(display.location).toBe('10:5-25');
        expect(display.confidence).toBe(86); // 0.856 * 100 rounded
        expect(display.matchedContentPreview).toContain('If it rains');
        expect(display.matchedContentPreview).toContain('...');
        expect(display.variableCount).toBe(2);
        expect(display.qualityScore).toBeGreaterThan(0);
        expect(display.contextInfo).toContain('basic analysis');
      }
    });

    it('should handle short content without truncation', () => {
      const location = createTestLocation();
      const result = PatternMatch.create(
        'pattern-1',
        'syntax',
        'Short Pattern',
        location,
        0.9,
        'Short content',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const display = result.value.toDisplayFormat();
        expect(display.matchedContentPreview).toBe('Short content');
        expect(display.matchedContentPreview).not.toContain('...');
      }
    });
  });

  describe('Equality', () => {
    it('should implement identity-based equality', () => {
      const location1 = createTestLocation(1, 0, 1, 10);
      const location2 = createTestLocation(2, 0, 2, 10);

      const result1 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location1,
        0.8,
        'Same content',
      );

      const result2 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location1,
        0.8,
        'Same content',
      );

      const result3 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location2,
        0.8,
        'Same content',
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        // Same pattern ID, location, and content
        expect(result1.value.equals(result2.value)).toBe(true);

        // Different location
        expect(result1.value.equals(result3.value)).toBe(false);
      }
    });

    it('should distinguish based on pattern ID', () => {
      const location = createTestLocation();

      const result1 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0.8,
        'Content',
      );

      const result2 = PatternMatch.create(
        'pattern-2',
        'inference',
        'Test Pattern',
        location,
        0.8,
        'Content',
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should distinguish based on matched content', () => {
      const location = createTestLocation();

      const result1 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0.8,
        'Content 1',
      );

      const result2 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0.8,
        'Content 2',
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should ignore other properties in equality', () => {
      const location = createTestLocation();

      const result1 = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0.8,
        'Same content',
        new Map([['var', 'value1']]),
      );

      const result2 = PatternMatch.create(
        'pattern-1',
        'structural', // different type
        'Different Name', // different name
        location,
        0.3, // different confidence
        'Same content',
        new Map([['var', 'value2']]), // different variables
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // Equal despite different type, name, confidence, and variables
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('MatchContext', () => {
    describe('factory methods', () => {
      it('should create default context', () => {
        const context = MatchContext.createDefault();

        expect(context.getAnalysisDepth()).toBe('basic');
        expect(context.getSurroundingContext()).toBe('');
        expect(context.getRelatedMatches()).toEqual([]);
        expect(context.getRelevanceScore()).toBe(0.5);
        expect(context.getAdditionalMetadata()).toEqual({});
      });

      it('should create specialized contexts', () => {
        const inference = MatchContext.createForInference();
        expect(inference.getAnalysisDepth()).toBe('deep');
        expect(inference.getSurroundingContext()).toBe('inference-rule');
        expect(inference.getRelevanceScore()).toBe(0.9);

        const structural = MatchContext.createForStructural();
        expect(structural.getAnalysisDepth()).toBe('moderate');
        expect(structural.getSurroundingContext()).toBe('structural-pattern');
        expect(structural.getRelevanceScore()).toBe(0.7);

        const modal = MatchContext.createForModal();
        expect(modal.getAnalysisDepth()).toBe('deep');
        expect(modal.getSurroundingContext()).toBe('modal-logic');
        expect(modal.getRelevanceScore()).toBe(0.8);

        const validation = MatchContext.createForValidation();
        expect(validation.getAnalysisDepth()).toBe('deep');
        expect(validation.getSurroundingContext()).toBe('validation-pattern');
        expect(validation.getRelevanceScore()).toBe(0.85);
      });
    });

    describe('display info', () => {
      it('should generate display info correctly', () => {
        const context = MatchContext.createForInference();
        const display = context.getDisplayInfo();

        expect(display).toBe('deep analysis in inference-rule context (90% relevant)');
      });

      it('should handle default context display', () => {
        const context = MatchContext.createDefault();
        const display = context.getDisplayInfo();

        expect(display).toBe('basic analysis in general context (50% relevant)');
      });
    });

    describe('immutability', () => {
      it('should return defensive copies', () => {
        const context = MatchContext.createForValidation();
        const metadata = context.getAdditionalMetadata();

        // Modify returned object
        (metadata as any).newKey = 'should not appear';

        // Original should be unchanged
        const freshMetadata = context.getAdditionalMetadata();
        expect(freshMetadata).not.toHaveProperty('newKey');
      });
    });
  });

  describe('Property-Based Testing', () => {
    it('should maintain invariants across transformations', () => {
      fc.assert(
        fc.property(
          validPatternIdArbitrary,
          patternTypeArbitrary,
          validPatternNameArbitrary,
          locationArbitrary,
          fc.float({ min: Math.fround(0), max: Math.fround(0.8), noNaN: true }),
          validMatchedContentArbitrary,
          variableMapArbitrary,
          (
            patternId,
            patternType,
            patternName,
            location,
            confidence,
            matchedContent,
            variablesObj,
          ) => {
            const variables = new Map(Object.entries(variablesObj));
            const result = PatternMatch.create(
              patternId,
              patternType,
              patternName,
              location,
              confidence,
              matchedContent,
              variables,
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const match = result.value;

              // Test withHigherConfidence invariants
              const increased = match.withHigherConfidence(0.1);
              expect(increased.getPatternId()).toBe(match.getPatternId());
              expect(increased.getPatternType()).toBe(match.getPatternType());
              expect(increased.getConfidence()).toBeGreaterThanOrEqual(match.getConfidence());
              expect(increased.getConfidence()).toBeLessThanOrEqual(1);

              // Test withAdditionalVariables invariants
              const withVars = match.withAdditionalVariables(new Map([['new', 'value']]));
              expect(withVars.getPatternId()).toBe(match.getPatternId());
              expect(withVars.getVariableCount()).toBeGreaterThanOrEqual(match.getVariableCount());
              expect(withVars.hasVariable('new')).toBe(true);
            }
          },
        ),
      );
    });

    it('should maintain quality score bounds', () => {
      fc.assert(
        fc.property(
          locationArbitrary,
          confidenceArbitrary,
          validMatchedContentArbitrary,
          variableMapArbitrary,
          (location, confidence, matchedContent, variablesObj) => {
            const variables = new Map(Object.entries(variablesObj));
            const result = PatternMatch.create(
              'pattern-1',
              'inference',
              'Test Pattern',
              location,
              confidence,
              matchedContent,
              variables,
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const quality = result.value.getMatchQuality();

              // All components should be between 0 and 1
              expect(quality.confidence).toBeGreaterThanOrEqual(0);
              expect(quality.confidence).toBeLessThanOrEqual(1);
              expect(quality.completeness).toBeGreaterThanOrEqual(0);
              expect(quality.completeness).toBeLessThanOrEqual(1);
              expect(quality.precision).toBeGreaterThanOrEqual(0);
              expect(quality.precision).toBeLessThanOrEqual(1);
              expect(quality.contextRelevance).toBeGreaterThanOrEqual(0);
              expect(quality.contextRelevance).toBeLessThanOrEqual(1);

              if (quality.overallScore !== undefined) {
                expect(quality.overallScore).toBeGreaterThanOrEqual(0);
                expect(quality.overallScore).toBeLessThanOrEqual(1);
              }
            }
          },
        ),
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extreme confidence values', () => {
      const location = createTestLocation();

      const zeroConfidence = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0,
        'Content',
      );

      const maxConfidence = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        1,
        'Content',
      );

      expect(zeroConfidence.isOk()).toBe(true);
      expect(maxConfidence.isOk()).toBe(true);

      if (zeroConfidence.isOk()) {
        expect(zeroConfidence.value.getConfidence()).toBe(0);
        expect(zeroConfidence.value.isLowConfidence()).toBe(true);
        const quality = zeroConfidence.value.getMatchQuality();
        expect(quality.confidence).toBe(0);
      }

      if (maxConfidence.isOk()) {
        expect(maxConfidence.value.getConfidence()).toBe(1);
        expect(maxConfidence.value.isHighConfidence()).toBe(true);
      }
    });

    it('should handle very long content', () => {
      const location = createTestLocation();
      const longContent = 'A'.repeat(500);
      const manyVariables = new Map(Array.from({ length: 50 }, (_, i) => [`var${i}`, `value${i}`]));

      const result = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0.8,
        longContent,
        manyVariables,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        expect(match.getMatchedContent()).toBe(longContent);
        expect(match.getVariableCount()).toBe(50);

        const display = match.toDisplayFormat();
        expect(display.matchedContentPreview).toHaveLength(50); // truncated
        expect(display.matchedContentPreview).toContain('...');
      }
    });

    it('should handle special characters in content', () => {
      const location = createTestLocation();
      const specialContent = '∀x∃y(P(x) → Q(y)) ∧ ¬R(z)';
      const unicodeVars = new Map([
        ['α', 'alpha value'],
        ['β', 'beta value'],
        ['γ', 'gamma value'],
      ]);

      const result = PatternMatch.create(
        'pattern-1',
        'modal',
        'Logic Pattern',
        location,
        0.9,
        specialContent,
        unicodeVars,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        expect(match.getMatchedContent()).toBe(specialContent);
        expect(match.getVariable('α')).toBe('alpha value');
        expect(match.getVariable('β')).toBe('beta value');
        expect(match.getVariable('γ')).toBe('gamma value');
      }
    });

    it('should handle empty variables in calculations', () => {
      const location = createTestLocation();
      const emptyVars = new Map([
        ['var1', ''],
        ['var2', '   '],
        ['var3', '\t\n'],
      ]);

      const result = PatternMatch.create(
        'pattern-1',
        'inference',
        'Test Pattern',
        location,
        0.8,
        'Content',
        emptyVars,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        const quality = match.getMatchQuality();

        // All variables are effectively unbound
        expect(quality.completeness).toBe(0);
      }
    });
  });
});
