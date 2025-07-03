/**
 * Comprehensive test suite for AnalysisInsight value object
 *
 * Priority: HIGH (Core value object for analysis domain)
 * Demonstrates:
 * - Value object creation and validation
 * - Immutability and behavior verification
 * - Error handling with neverthrow
 * - Factory methods for different insight types
 * - Property-based testing
 * - Edge cases and boundary conditions
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/AnalysisErrors.js';
import {
  AnalysisInsight,
  type InsightCategory,
  type InsightPriority,
} from '../../value-objects/AnalysisInsight.js';

// Property-based test generators
const validTitleArbitrary = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const validDescriptionArbitrary = fc
  .string({ minLength: 1, maxLength: 1000 })
  .filter(s => s.trim().length > 0);

const insightCategoryArbitrary = fc.constantFrom<InsightCategory>(
  'syntax',
  'semantics',
  'performance',
  'educational',
  'style',
  'structure',
  'patterns',
  'validation'
);

const insightPriorityArbitrary = fc.constantFrom<InsightPriority>('low', 'medium', 'high');

const confidenceArbitrary = fc.float({ min: 0, max: 1, noNaN: true });

const stringArrayArbitrary = fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
  maxLength: 10,
});

describe('AnalysisInsight Value Object', () => {
  describe('Creation and Validation', () => {
    describe('valid creation cases', () => {
      it('should create valid insight with minimal parameters', () => {
        const result = AnalysisInsight.create(
          'syntax',
          'Missing semicolon',
          'A semicolon is missing at the end of the statement'
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('syntax');
          expect(insight.getTitle()).toBe('Missing semicolon');
          expect(insight.getDescription()).toBe(
            'A semicolon is missing at the end of the statement'
          );
          expect(insight.getPriority()).toBe('medium'); // default
          expect(insight.getConfidence()).toBe(1.0); // default
          expect(insight.getEvidence()).toEqual([]);
          expect(insight.getRecommendations()).toEqual([]);
          expect(insight.getRelatedPatterns()).toEqual([]);
        }
      });

      it('should create valid insight with all parameters', () => {
        const evidence = ['Line 10: missing semicolon', 'Similar pattern on line 15'];
        const recommendations = ['Add semicolon at end of statement', 'Enable linting'];
        const relatedPatterns = ['pattern-1', 'pattern-2'];

        const result = AnalysisInsight.create(
          'syntax',
          'Missing semicolon',
          'A semicolon is missing at the end of the statement',
          'high',
          0.95,
          evidence,
          recommendations,
          relatedPatterns
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('syntax');
          expect(insight.getTitle()).toBe('Missing semicolon');
          expect(insight.getPriority()).toBe('high');
          expect(insight.getConfidence()).toBe(0.95);
          expect(insight.getEvidence()).toEqual(evidence);
          expect(insight.getRecommendations()).toEqual(recommendations);
          expect(insight.getRelatedPatterns()).toEqual(relatedPatterns);
        }
      });

      it('should trim whitespace from title and description', () => {
        const result = AnalysisInsight.create(
          'semantics',
          '  Logical inconsistency  ',
          '  The premise contradicts the conclusion  '
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getTitle()).toBe('Logical inconsistency');
          expect(insight.getDescription()).toBe('The premise contradicts the conclusion');
        }
      });

      it('should handle property-based valid creation', () => {
        fc.assert(
          fc.property(
            insightCategoryArbitrary,
            validTitleArbitrary,
            validDescriptionArbitrary,
            insightPriorityArbitrary,
            confidenceArbitrary,
            stringArrayArbitrary,
            stringArrayArbitrary,
            stringArrayArbitrary,
            (
              category,
              title,
              description,
              priority,
              confidence,
              evidence,
              recommendations,
              patterns
            ) => {
              const result = AnalysisInsight.create(
                category,
                title,
                description,
                priority,
                confidence,
                evidence,
                recommendations,
                patterns
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const insight = result.value;
                expect(insight.getCategory()).toBe(category);
                expect(insight.getTitle()).toBe(title.trim());
                expect(insight.getDescription()).toBe(description.trim());
                expect(insight.getPriority()).toBe(priority);
                expect(insight.getConfidence()).toBe(confidence);
                expect(insight.getEvidence()).toEqual(evidence);
                expect(insight.getRecommendations()).toEqual(recommendations);
                expect(insight.getRelatedPatterns()).toEqual(patterns);
              }
            }
          )
        );
      });
    });

    describe('invalid creation cases', () => {
      it('should reject empty title', () => {
        const result = AnalysisInsight.create('syntax', '', 'Valid description');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Insight title cannot be empty');
        }
      });

      it('should reject whitespace-only title', () => {
        const result = AnalysisInsight.create('syntax', '   ', 'Valid description');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Insight title cannot be empty');
        }
      });

      it('should reject empty description', () => {
        const result = AnalysisInsight.create('syntax', 'Valid title', '');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Insight description cannot be empty');
        }
      });

      it('should reject whitespace-only description', () => {
        const result = AnalysisInsight.create('syntax', 'Valid title', '   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Insight description cannot be empty');
        }
      });

      it('should reject negative confidence', () => {
        const result = AnalysisInsight.create(
          'syntax',
          'Valid title',
          'Valid description',
          'medium',
          -0.1
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Confidence must be between 0 and 1');
        }
      });

      it('should reject confidence greater than 1', () => {
        const result = AnalysisInsight.create(
          'syntax',
          'Valid title',
          'Valid description',
          'medium',
          1.1
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Confidence must be between 0 and 1');
        }
      });

      it('should reject null/undefined values', () => {
        const nullTitleResult = AnalysisInsight.create('syntax', null as any, 'Valid description');
        expect(nullTitleResult.isErr()).toBe(true);

        const undefinedTitleResult = AnalysisInsight.create(
          'syntax',
          undefined as any,
          'Valid description'
        );
        expect(undefinedTitleResult.isErr()).toBe(true);

        const nullDescResult = AnalysisInsight.create('syntax', 'Valid title', null as any);
        expect(nullDescResult.isErr()).toBe(true);

        const undefinedDescResult = AnalysisInsight.create(
          'syntax',
          'Valid title',
          undefined as any
        );
        expect(undefinedDescResult.isErr()).toBe(true);
      });
    });
  });

  describe('Factory Methods', () => {
    describe('createSyntaxInsight', () => {
      it('should create syntax insight with correct defaults', () => {
        const result = AnalysisInsight.createSyntaxInsight(
          'Syntax error',
          'Missing closing bracket',
          'high',
          ['Add closing bracket']
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('syntax');
          expect(insight.getTitle()).toBe('Syntax error');
          expect(insight.getDescription()).toBe('Missing closing bracket');
          expect(insight.getPriority()).toBe('high');
          expect(insight.getConfidence()).toBe(0.9); // syntax default
          expect(insight.getEvidence()).toEqual([]);
          expect(insight.getRecommendations()).toEqual(['Add closing bracket']);
        }
      });

      it('should use default priority when not specified', () => {
        const result = AnalysisInsight.createSyntaxInsight(
          'Syntax warning',
          'Inconsistent spacing'
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getPriority()).toBe('high'); // syntax default priority
        }
      });
    });

    describe('createSemanticInsight', () => {
      it('should create semantic insight with correct defaults', () => {
        const evidence = ['Premise A contradicts conclusion B'];
        const recommendations = ['Review logical flow'];

        const result = AnalysisInsight.createSemanticInsight(
          'Logical inconsistency',
          'The argument contains a contradiction',
          evidence,
          recommendations
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('semantics');
          expect(insight.getTitle()).toBe('Logical inconsistency');
          expect(insight.getPriority()).toBe('medium'); // semantic default
          expect(insight.getConfidence()).toBe(0.8); // semantic default
          expect(insight.getEvidence()).toEqual(evidence);
          expect(insight.getRecommendations()).toEqual(recommendations);
        }
      });
    });

    describe('createPerformanceInsight', () => {
      it('should create performance insight with correct defaults', () => {
        const result = AnalysisInsight.createPerformanceInsight(
          'Redundant operations',
          'Multiple identical calculations detected'
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('performance');
          expect(insight.getPriority()).toBe('low'); // performance default
          expect(insight.getConfidence()).toBe(0.95); // performance default
          expect(insight.getEvidence()).toEqual([]);
          expect(insight.getRecommendations()).toEqual([]);
        }
      });

      it('should accept custom confidence', () => {
        const result = AnalysisInsight.createPerformanceInsight(
          'Performance issue',
          'Slow operation detected',
          0.85
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getConfidence()).toBe(0.85);
        }
      });
    });

    describe('createEducationalInsight', () => {
      it('should create educational insight with correct defaults', () => {
        const recommendations = ['Read about logical fallacies', 'Practice argument analysis'];

        const result = AnalysisInsight.createEducationalInsight(
          'Learning opportunity',
          'This is an example of circular reasoning',
          recommendations
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('educational');
          expect(insight.getPriority()).toBe('medium'); // educational default
          expect(insight.getConfidence()).toBe(0.7); // educational default
          expect(insight.getEvidence()).toEqual([]);
          expect(insight.getRecommendations()).toEqual(recommendations);
        }
      });
    });

    describe('createValidationInsight', () => {
      it('should create validation insight with correct defaults', () => {
        const evidence = ['Rule X violated at position Y'];
        const recommendations = ['Fix violation', 'Add validation rule'];

        const result = AnalysisInsight.createValidationInsight(
          'Validation failed',
          'Custom validation rule violated',
          evidence,
          recommendations
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;
          expect(insight.getCategory()).toBe('validation');
          expect(insight.getPriority()).toBe('high'); // validation default
          expect(insight.getConfidence()).toBe(0.85); // validation default
          expect(insight.getEvidence()).toEqual(evidence);
          expect(insight.getRecommendations()).toEqual(recommendations);
        }
      });
    });
  });

  describe('Behavior and Methods', () => {
    describe('priority checks', () => {
      it('should correctly identify priority levels', () => {
        const highResult = AnalysisInsight.create('syntax', 'Title', 'Desc', 'high');
        const mediumResult = AnalysisInsight.create('syntax', 'Title', 'Desc', 'medium');
        const lowResult = AnalysisInsight.create('syntax', 'Title', 'Desc', 'low');

        expect(highResult.isOk()).toBe(true);
        expect(mediumResult.isOk()).toBe(true);
        expect(lowResult.isOk()).toBe(true);

        if (highResult.isOk()) {
          expect(highResult.value.isHighPriority()).toBe(true);
          expect(highResult.value.isMediumPriority()).toBe(false);
          expect(highResult.value.isLowPriority()).toBe(false);
        }

        if (mediumResult.isOk()) {
          expect(mediumResult.value.isHighPriority()).toBe(false);
          expect(mediumResult.value.isMediumPriority()).toBe(true);
          expect(mediumResult.value.isLowPriority()).toBe(false);
        }

        if (lowResult.isOk()) {
          expect(lowResult.value.isHighPriority()).toBe(false);
          expect(lowResult.value.isMediumPriority()).toBe(false);
          expect(lowResult.value.isLowPriority()).toBe(true);
        }
      });
    });

    describe('confidence checks', () => {
      it('should identify high confidence correctly', () => {
        const testCases = [
          { confidence: 0.95, expected: true },
          { confidence: 0.8, expected: true },
          { confidence: 0.79, expected: false },
          { confidence: 0.5, expected: false },
          { confidence: 1.0, expected: true },
        ];

        testCases.forEach(({ confidence, expected }) => {
          const result = AnalysisInsight.create(
            'syntax',
            'Title',
            'Description',
            'medium',
            confidence
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.isHighConfidence()).toBe(expected);
          }
        });
      });
    });

    describe('evidence and recommendations', () => {
      it('should check for presence of evidence', () => {
        const withEvidence = AnalysisInsight.create('syntax', 'Title', 'Desc', 'medium', 1.0, [
          'Evidence 1',
        ]);

        const withoutEvidence = AnalysisInsight.create('syntax', 'Title', 'Desc');

        expect(withEvidence.isOk()).toBe(true);
        expect(withoutEvidence.isOk()).toBe(true);

        if (withEvidence.isOk()) {
          expect(withEvidence.value.hasEvidence()).toBe(true);
        }

        if (withoutEvidence.isOk()) {
          expect(withoutEvidence.value.hasEvidence()).toBe(false);
        }
      });

      it('should check for presence of recommendations', () => {
        const withRecommendations = AnalysisInsight.create(
          'syntax',
          'Title',
          'Desc',
          'medium',
          1.0,
          [],
          ['Recommendation 1']
        );

        const withoutRecommendations = AnalysisInsight.create('syntax', 'Title', 'Desc');

        expect(withRecommendations.isOk()).toBe(true);
        expect(withoutRecommendations.isOk()).toBe(true);

        if (withRecommendations.isOk()) {
          expect(withRecommendations.value.hasRecommendations()).toBe(true);
        }

        if (withoutRecommendations.isOk()) {
          expect(withoutRecommendations.value.hasRecommendations()).toBe(false);
        }
      });
    });

    describe('actionability', () => {
      it('should determine actionability based on priority and confidence', () => {
        const testCases = [
          { priority: 'high', confidence: 0.9, hasRecs: true, expected: true },
          { priority: 'high', confidence: 0.5, hasRecs: true, expected: true },
          { priority: 'medium', confidence: 0.9, hasRecs: true, expected: true },
          { priority: 'low', confidence: 0.7, hasRecs: true, expected: false },
          { priority: 'high', confidence: 0.9, hasRecs: false, expected: false },
        ];

        testCases.forEach(({ priority, confidence, hasRecs, expected }) => {
          const result = AnalysisInsight.create(
            'syntax',
            'Title',
            'Description',
            priority as InsightPriority,
            confidence,
            [],
            hasRecs ? ['Do something'] : []
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.isActionable()).toBe(expected);
          }
        });
      });
    });

    describe('priority score calculation', () => {
      it('should calculate priority scores correctly', () => {
        const testCases = [
          { priority: 'high', confidence: 1.0, expectedScore: 3 },
          { priority: 'high', confidence: 0.5, expectedScore: 1.5 },
          { priority: 'medium', confidence: 1.0, expectedScore: 2 },
          { priority: 'medium', confidence: 0.5, expectedScore: 1 },
          { priority: 'low', confidence: 1.0, expectedScore: 1 },
          { priority: 'low', confidence: 0.5, expectedScore: 0.5 },
        ];

        testCases.forEach(({ priority, confidence, expectedScore }) => {
          const result = AnalysisInsight.create(
            'syntax',
            'Title',
            'Description',
            priority as InsightPriority,
            confidence
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.getPriorityScore()).toBe(expectedScore);
          }
        });
      });
    });
  });

  describe('Immutability and Transformation', () => {
    describe('withHigherPriority', () => {
      it('should increase priority level correctly', () => {
        const lowResult = AnalysisInsight.create('syntax', 'Title', 'Desc', 'low');

        expect(lowResult.isOk()).toBe(true);
        if (lowResult.isOk()) {
          const original = lowResult.value;
          const upgraded = original.withHigherPriority();

          // Original should be unchanged
          expect(original.getPriority()).toBe('low');

          // New instance should have higher priority
          expect(upgraded.getPriority()).toBe('medium');
          expect(upgraded.getTitle()).toBe(original.getTitle());
          expect(upgraded.getDescription()).toBe(original.getDescription());
          expect(upgraded.getConfidence()).toBe(original.getConfidence());
        }
      });

      it('should handle priority ceiling', () => {
        const highResult = AnalysisInsight.create('syntax', 'Title', 'Desc', 'high');

        expect(highResult.isOk()).toBe(true);
        if (highResult.isOk()) {
          const original = highResult.value;
          const upgraded = original.withHigherPriority();

          // Should remain at high
          expect(upgraded.getPriority()).toBe('high');
        }
      });

      it('should maintain full priority upgrade chain', () => {
        const result = AnalysisInsight.create('syntax', 'Title', 'Desc', 'low');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const low = result.value;
          const medium = low.withHigherPriority();
          const high = medium.withHigherPriority();
          const stillHigh = high.withHigherPriority();

          expect(low.getPriority()).toBe('low');
          expect(medium.getPriority()).toBe('medium');
          expect(high.getPriority()).toBe('high');
          expect(stillHigh.getPriority()).toBe('high');
        }
      });
    });

    describe('withAdditionalEvidence', () => {
      it('should add evidence without modifying original', () => {
        const result = AnalysisInsight.create('syntax', 'Title', 'Desc', 'medium', 1.0, [
          'Evidence 1',
        ]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const withMore = original.withAdditionalEvidence(['Evidence 2', 'Evidence 3']);

          // Original should be unchanged
          expect(original.getEvidence()).toEqual(['Evidence 1']);

          // New instance should have combined evidence
          expect(withMore.getEvidence()).toEqual(['Evidence 1', 'Evidence 2', 'Evidence 3']);
          expect(withMore.getTitle()).toBe(original.getTitle());
          expect(withMore.getCategory()).toBe(original.getCategory());
        }
      });

      it('should handle empty additional evidence', () => {
        const result = AnalysisInsight.create('syntax', 'Title', 'Desc', 'medium', 1.0, [
          'Evidence 1',
        ]);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const withEmpty = original.withAdditionalEvidence([]);

          expect(withEmpty.getEvidence()).toEqual(['Evidence 1']);
        }
      });
    });

    describe('withAdditionalRecommendations', () => {
      it('should add recommendations without modifying original', () => {
        const result = AnalysisInsight.create(
          'syntax',
          'Title',
          'Desc',
          'medium',
          1.0,
          [],
          ['Recommendation 1']
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const original = result.value;
          const withMore = original.withAdditionalRecommendations([
            'Recommendation 2',
            'Recommendation 3',
          ]);

          // Original should be unchanged
          expect(original.getRecommendations()).toEqual(['Recommendation 1']);

          // New instance should have combined recommendations
          expect(withMore.getRecommendations()).toEqual([
            'Recommendation 1',
            'Recommendation 2',
            'Recommendation 3',
          ]);
        }
      });
    });

    describe('immutability verification', () => {
      it('should return defensive copies of arrays', () => {
        const evidence = ['Evidence 1', 'Evidence 2'];
        const recommendations = ['Rec 1', 'Rec 2'];
        const patterns = ['Pattern 1'];

        const result = AnalysisInsight.create(
          'syntax',
          'Title',
          'Desc',
          'medium',
          1.0,
          evidence,
          recommendations,
          patterns
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const insight = result.value;

          // Get arrays
          const returnedEvidence = insight.getEvidence();
          const returnedRecommendations = insight.getRecommendations();
          const returnedPatterns = insight.getRelatedPatterns();

          // Modify returned arrays
          (returnedEvidence as any).push('New evidence');
          (returnedRecommendations as any).push('New rec');
          (returnedPatterns as any).push('New pattern');

          // Original should be unchanged
          expect(insight.getEvidence()).toEqual(['Evidence 1', 'Evidence 2']);
          expect(insight.getRecommendations()).toEqual(['Rec 1', 'Rec 2']);
          expect(insight.getRelatedPatterns()).toEqual(['Pattern 1']);
        }
      });
    });
  });

  describe('Display Format', () => {
    it('should convert to display format correctly', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'Missing semicolon',
        'A semicolon is missing at the end of the statement',
        'high',
        0.956,
        ['Line 10', 'Line 15'],
        ['Add semicolon'],
        []
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        const display = insight.toDisplayFormat();

        expect(display).toEqual({
          category: 'syntax',
          title: 'Missing semicolon',
          description: 'A semicolon is missing at the end of the statement',
          priority: 'high',
          confidence: 96, // 0.956 * 100 rounded
          evidenceCount: 2,
          recommendationCount: 1,
          isActionable: true,
          priorityScore: 2.868, // 3 * 0.956
        });
      }
    });

    it('should handle edge cases in display format', () => {
      const result = AnalysisInsight.create(
        'performance',
        'Performance issue',
        'Minor performance degradation',
        'low',
        0.333
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        const display = insight.toDisplayFormat();

        expect(display.confidence).toBe(33); // 0.333 * 100 rounded
        expect(display.evidenceCount).toBe(0);
        expect(display.recommendationCount).toBe(0);
        expect(display.isActionable).toBe(false);
        expect(display.priorityScore).toBeCloseTo(0.333, 3);
      }
    });
  });

  describe('Equality', () => {
    it('should implement value-based equality', () => {
      const result1 = AnalysisInsight.create('syntax', 'Same title', 'Same description');

      const result2 = AnalysisInsight.create('syntax', 'Same title', 'Same description');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // Same content = equal
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    it('should distinguish based on category', () => {
      const result1 = AnalysisInsight.create('syntax', 'Same title', 'Same description');

      const result2 = AnalysisInsight.create('semantics', 'Same title', 'Same description');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should distinguish based on title', () => {
      const result1 = AnalysisInsight.create('syntax', 'Title 1', 'Same description');

      const result2 = AnalysisInsight.create('syntax', 'Title 2', 'Same description');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should distinguish based on description', () => {
      const result1 = AnalysisInsight.create('syntax', 'Same title', 'Description 1');

      const result2 = AnalysisInsight.create('syntax', 'Same title', 'Description 2');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    it('should ignore other properties in equality', () => {
      const result1 = AnalysisInsight.create(
        'syntax',
        'Same title',
        'Same description',
        'high',
        0.9,
        ['Evidence']
      );

      const result2 = AnalysisInsight.create(
        'syntax',
        'Same title',
        'Same description',
        'low',
        0.1,
        []
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // Different priority, confidence, evidence - but still equal
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });
  });

  describe('Property-Based Testing', () => {
    it('should maintain invariants across transformations', () => {
      fc.assert(
        fc.property(
          insightCategoryArbitrary,
          validTitleArbitrary,
          validDescriptionArbitrary,
          insightPriorityArbitrary,
          confidenceArbitrary,
          stringArrayArbitrary,
          stringArrayArbitrary,
          (category, title, description, priority, confidence, evidence, recommendations) => {
            const result = AnalysisInsight.create(
              category,
              title,
              description,
              priority,
              confidence,
              evidence,
              recommendations
            );

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
              const insight = result.value;

              // Test withHigherPriority invariants
              const upgraded = insight.withHigherPriority();
              expect(upgraded.getCategory()).toBe(insight.getCategory());
              expect(upgraded.getTitle()).toBe(insight.getTitle());
              expect(upgraded.getDescription()).toBe(insight.getDescription());
              expect(upgraded.getConfidence()).toBe(insight.getConfidence());

              // Test withAdditionalEvidence invariants
              const withEvidence = insight.withAdditionalEvidence(['New evidence']);
              expect(withEvidence.getCategory()).toBe(insight.getCategory());
              expect(withEvidence.getPriority()).toBe(insight.getPriority());
              expect(withEvidence.getEvidence().length).toBeGreaterThanOrEqual(
                insight.getEvidence().length
              );

              // Test withAdditionalRecommendations invariants
              const withRecs = insight.withAdditionalRecommendations(['New rec']);
              expect(withRecs.getCategory()).toBe(insight.getCategory());
              expect(withRecs.getPriority()).toBe(insight.getPriority());
              expect(withRecs.getRecommendations().length).toBeGreaterThanOrEqual(
                insight.getRecommendations().length
              );
            }
          }
        )
      );
    });

    it('should maintain score relationships', () => {
      fc.assert(
        fc.property(
          insightPriorityArbitrary,
          fc.float({ min: Math.fround(0.1), max: Math.fround(1), noNaN: true }),
          (priority, confidence) => {
            const result1 = AnalysisInsight.create(
              'syntax',
              'Title',
              'Description',
              priority,
              confidence
            );

            const result2 = AnalysisInsight.create(
              'syntax',
              'Title',
              'Description',
              priority,
              confidence * 0.5
            );

            expect(result1.isOk()).toBe(true);
            expect(result2.isOk()).toBe(true);

            if (result1.isOk() && result2.isOk()) {
              // Higher confidence should yield higher score for same priority
              expect(result1.value.getPriorityScore()).toBeGreaterThan(
                result2.value.getPriorityScore()
              );
            }
          }
        )
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extreme confidence values', () => {
      const zeroConfidence = AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 0);

      const maxConfidence = AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 1);

      expect(zeroConfidence.isOk()).toBe(true);
      expect(maxConfidence.isOk()).toBe(true);

      if (zeroConfidence.isOk()) {
        expect(zeroConfidence.value.getConfidence()).toBe(0);
        expect(zeroConfidence.value.isHighConfidence()).toBe(false);
        expect(zeroConfidence.value.getPriorityScore()).toBe(0);
      }

      if (maxConfidence.isOk()) {
        expect(maxConfidence.value.getConfidence()).toBe(1);
        expect(maxConfidence.value.isHighConfidence()).toBe(true);
      }
    });

    it('should handle very long content', () => {
      const longTitle = 'A'.repeat(200);
      const longDescription = 'B'.repeat(1000);
      const manyEvidence = Array.from({ length: 100 }, (_, i) => `Evidence ${i}`);

      const result = AnalysisInsight.create(
        'syntax',
        longTitle,
        longDescription,
        'medium',
        1.0,
        manyEvidence
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTitle()).toBe(longTitle);
        expect(result.value.getDescription()).toBe(longDescription);
        expect(result.value.getEvidence()).toHaveLength(100);
      }
    });

    it('should handle special characters in content', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      const unicodeContent = '🔍 αβγδ 中文 العربية';

      const result = AnalysisInsight.create('syntax', specialChars, unicodeContent);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTitle()).toBe(specialChars);
        expect(result.value.getDescription()).toBe(unicodeContent);
      }
    });
  });
});
