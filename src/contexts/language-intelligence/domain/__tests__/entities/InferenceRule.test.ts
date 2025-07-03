/**
 * Tests for InferenceRule entity
 *
 * Focuses on:
 * - Basic creation and validation
 * - Pre-built rules (Modus Ponens, Modus Tollens)
 * - Conflict and prerequisite management
 * - Pattern matching and logical analysis
 * - High coverage for core functionality
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { InferenceRule } from '../../entities/InferenceRule';
import { InferenceRuleId } from '../../value-objects/InferenceRuleId';
import { RuleMetadata } from '../../value-objects/RuleMetadata';
import { RulePattern } from '../../value-objects/RulePattern';

describe('InferenceRule', () => {
  const validLanguagePackageId = 'lang-package-123';

  describe('create', () => {
    it('should create a new inference rule with valid inputs', () => {
      const patternResult = RulePattern.createLogicalPattern(['P', 'Q'], ['P ∧ Q'], 'conjunction');
      expect(patternResult.isOk()).toBe(true);

      if (patternResult.isOk()) {
        const result = InferenceRule.create(
          'Test Rule',
          'A test inference rule',
          patternResult.value,
          validLanguagePackageId
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const rule = result.value;
          expect(rule.getName().getValue()).toBe('Test Rule');
          expect(rule.getDescription().getValue()).toBe('A test inference rule');
          expect(rule.getLanguagePackageId()).toBe(validLanguagePackageId);
          expect(rule.isRuleActive()).toBe(true);
          expect(rule.getUsageCount()).toBe(0);
          expect(rule.getExamples()).toEqual([]);
          expect(rule.getPrerequisites()).toEqual([]);
          expect(rule.getConflicts()).toEqual([]);
        }
      }
    });

    it('should create rule with examples and prerequisites', () => {
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');
      expect(patternResult.isOk()).toBe(true);

      if (patternResult.isOk()) {
        const examples = [
          {
            premises: ['A is true'],
            conclusions: ['A is true'],
            explanation: 'Identity rule',
          },
        ];
        const prerequisites = [InferenceRuleId.generate()];

        const result = InferenceRule.create(
          'Identity Rule',
          'What is true remains true',
          patternResult.value,
          validLanguagePackageId,
          examples,
          prerequisites
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getExamples()).toEqual(examples);
          expect(result.value.getPrerequisites()).toEqual(prerequisites);
        }
      }
    });

    it('should create rule with custom metadata', () => {
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');
      const metadata = RuleMetadata.create({
        complexityLevel: 'advanced',
        tags: ['logic', 'formal'],
        category: 'inference',
      });

      expect(patternResult.isOk()).toBe(true);
      expect(metadata.isOk()).toBe(true);

      if (patternResult.isOk() && metadata.isOk()) {
        const result = InferenceRule.create(
          'Advanced Rule',
          'An advanced inference rule with detailed explanation',
          patternResult.value,
          validLanguagePackageId,
          [],
          [],
          metadata.value
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getMetadata()).toBe(metadata.value);
          expect(result.value.isAdvancedRule()).toBe(true);
          expect(result.value.isBasicRule()).toBe(false);
        }
      }
    });

    it('should fail with invalid name', () => {
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');
      expect(patternResult.isOk()).toBe(true);

      if (patternResult.isOk()) {
        const result = InferenceRule.create(
          '',
          'A description',
          patternResult.value,
          validLanguagePackageId
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Rule name');
        }
      }
    });

    it('should fail with invalid description', () => {
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');
      expect(patternResult.isOk()).toBe(true);

      if (patternResult.isOk()) {
        const result = InferenceRule.create(
          'Valid Name',
          '',
          patternResult.value,
          validLanguagePackageId
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Rule description');
        }
      }
    });

    it('should fail with empty language package ID', () => {
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');
      expect(patternResult.isOk()).toBe(true);

      if (patternResult.isOk()) {
        const result = InferenceRule.create(
          'Valid Name',
          'Valid description',
          patternResult.value,
          ''
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Language package ID is required');
        }
      }
    });

    it('should fail with whitespace-only language package ID', () => {
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');
      expect(patternResult.isOk()).toBe(true);

      if (patternResult.isOk()) {
        const result = InferenceRule.create(
          'Valid Name',
          'Valid description',
          patternResult.value,
          '   '
        );

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toBe('Language package ID is required');
        }
      }
    });
  });

  describe('createModusPonens', () => {
    it('should create a valid Modus Ponens rule', () => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        expect(rule.getName().getValue()).toBe('Modus Ponens');
        expect(rule.getDescription().getValue()).toBe(
          'If P implies Q and P is true, then Q is true'
        );
        expect(rule.getLanguagePackageId()).toBe(validLanguagePackageId);
        expect(rule.getExamples()).toHaveLength(2);
        expect(rule.isRuleActive()).toBe(true);

        // Check pattern type
        const pattern = rule.getPattern();
        expect(pattern.getPatternId()).toBe('modus-ponens');
      }
    });

    it('should fail with invalid language package ID', () => {
      const result = InferenceRule.createModusPonens('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID is required');
      }
    });
  });

  describe('createModusTollens', () => {
    it('should create a valid Modus Tollens rule', () => {
      const result = InferenceRule.createModusTollens(validLanguagePackageId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const rule = result.value;
        expect(rule.getName().getValue()).toBe('Modus Tollens');
        expect(rule.getDescription().getValue()).toBe(
          'If P implies Q and Q is false, then P is false'
        );
        expect(rule.getLanguagePackageId()).toBe(validLanguagePackageId);
        expect(rule.getExamples()).toHaveLength(1);
        expect(rule.isRuleActive()).toBe(true);

        // Check pattern type
        const pattern = rule.getPattern();
        expect(pattern.getPatternId()).toBe('modus-tollens');
      }
    });

    it('should fail with invalid language package ID', () => {
      const result = InferenceRule.createModusTollens('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Language package ID is required');
      }
    });
  });

  describe('activation and usage', () => {
    let rule: InferenceRule;

    beforeEach(() => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        rule = result.value;
      }
    });

    it('should activate and deactivate rule', () => {
      expect(rule.isRuleActive()).toBe(true);

      rule.deactivate();
      expect(rule.isRuleActive()).toBe(false);

      rule.activate();
      expect(rule.isRuleActive()).toBe(true);
    });

    it('should increment usage count', () => {
      expect(rule.getUsageCount()).toBe(0);

      rule.incrementUsage();
      expect(rule.getUsageCount()).toBe(1);

      rule.incrementUsage();
      rule.incrementUsage();
      expect(rule.getUsageCount()).toBe(3);
    });
  });

  describe('conflict management', () => {
    let rule: InferenceRule;
    let otherRuleId: InferenceRuleId;

    beforeEach(() => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        rule = result.value;
      }
      otherRuleId = InferenceRuleId.generate();
    });

    it('should add conflict with another rule', () => {
      const result = rule.addConflict(otherRuleId);

      expect(result.isOk()).toBe(true);
      expect(rule.getConflicts()).toContain(otherRuleId);
      expect(rule.conflictsWith(otherRuleId)).toBe(true);
    });

    it('should not add conflict with itself', () => {
      const result = rule.addConflict(rule.getId());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Rule cannot conflict with itself');
      }
    });

    it('should not add duplicate conflicts', () => {
      rule.addConflict(otherRuleId);
      const result = rule.addConflict(otherRuleId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conflict already exists');
      }
    });

    it('should remove conflict', () => {
      rule.addConflict(otherRuleId);
      const result = rule.removeConflict(otherRuleId);

      expect(result.isOk()).toBe(true);
      expect(rule.getConflicts()).not.toContain(otherRuleId);
      expect(rule.conflictsWith(otherRuleId)).toBe(false);
    });

    it('should fail to remove non-existent conflict', () => {
      const result = rule.removeConflict(otherRuleId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Conflict not found');
      }
    });
  });

  describe('prerequisite checking', () => {
    it('should check if rule has prerequisite', () => {
      const prereqId = InferenceRuleId.generate();
      const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');

      expect(patternResult.isOk()).toBe(true);
      if (patternResult.isOk()) {
        const result = InferenceRule.create(
          'Rule with Prerequisites',
          'A rule that requires other rules',
          patternResult.value,
          validLanguagePackageId,
          [],
          [prereqId]
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.hasPrerequisite(prereqId)).toBe(true);
          expect(result.value.hasPrerequisite(InferenceRuleId.generate())).toBe(false);
        }
      }
    });
  });

  describe('canBeAppliedWith', () => {
    it('should allow application when no conflicts or prerequisites', () => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const rule = result.value;
        expect(rule.canBeAppliedWith([])).toBe(true);
      }
    });

    it('should not allow application when rule is inactive', () => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const rule = result.value;
        rule.deactivate();
        expect(rule.canBeAppliedWith([])).toBe(false);
      }
    });

    it('should not allow application when conflicting rule is active', () => {
      const result1 = InferenceRule.createModusPonens(validLanguagePackageId);
      const result2 = InferenceRule.createModusTollens(validLanguagePackageId);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const rule1 = result1.value;
        const rule2 = result2.value;

        rule1.addConflict(rule2.getId());

        expect(rule1.canBeAppliedWith([rule2])).toBe(false);
      }
    });

    it('should allow application when all prerequisites are met', () => {
      const prereqResult = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(prereqResult.isOk()).toBe(true);

      if (prereqResult.isOk()) {
        const prereqRule = prereqResult.value;
        const patternResult = RulePattern.createLogicalPattern(['P'], ['P'], 'identity');

        expect(patternResult.isOk()).toBe(true);
        if (patternResult.isOk()) {
          const ruleResult = InferenceRule.create(
            'Dependent Rule',
            'A rule that depends on Modus Ponens',
            patternResult.value,
            validLanguagePackageId,
            [],
            [prereqRule.getId()]
          );

          expect(ruleResult.isOk()).toBe(true);
          if (ruleResult.isOk()) {
            const rule = ruleResult.value;
            expect(rule.canBeAppliedWith([prereqRule])).toBe(true);
            expect(rule.canBeAppliedWith([])).toBe(false);
          }
        }
      }
    });
  });

  describe('pattern matching', () => {
    it('should match premises and conclusions against pattern', () => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const rule = result.value;

        // Should match modus ponens pattern
        expect(rule.matchesPattern(['P', 'P → Q'], ['Q'])).toBe(true);

        // Should not match incorrect pattern
        expect(rule.matchesPattern(['P'], ['Q'])).toBe(false);
        expect(rule.matchesPattern(['P', 'Q'], ['P ∧ Q'])).toBe(false);
      }
    });

    it('should calculate pattern confidence', () => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const rule = result.value;

        // High confidence for exact match
        const confidence1 = rule.getPatternConfidence(['P', 'P → Q'], ['Q']);
        expect(confidence1).toBeGreaterThan(0.8);

        // Lower confidence for non-match
        const confidence2 = rule.getPatternConfidence(['P'], ['Q']);
        expect(confidence2).toBeLessThan(0.5);
      }
    });
  });

  describe('analyzeLogicalPatterns', () => {
    let rule: InferenceRule;

    beforeEach(() => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        rule = result.value;
      }
    });

    it('should detect modus ponens pattern in statements', () => {
      const statements = ['P', 'P → Q', 'Q'];

      const patterns = rule.analyzeLogicalPatterns(statements);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'modus-ponens',
          name: 'Modus Ponens',
          confidence: 0.95,
        })
      );
    });

    it('should detect modus tollens pattern in statements', () => {
      const statements = ['P → Q', '¬Q', '¬P'];

      const patterns = rule.analyzeLogicalPatterns(statements);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'modus-tollens',
          name: 'Modus Tollens',
          confidence: 0.9,
        })
      );
    });

    it('should detect hypothetical syllogism pattern', () => {
      const statements = ['P → Q', 'Q → R', 'P → R'];

      const patterns = rule.analyzeLogicalPatterns(statements);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'hypothetical-syllogism',
          name: 'Hypothetical Syllogism',
          confidence: 0.88,
        })
      );
    });

    it('should handle empty statements array', () => {
      const patterns = rule.analyzeLogicalPatterns([]);
      expect(patterns).toEqual([]);
    });

    it('should handle statements with no logical patterns', () => {
      const statements = ['A', 'B', 'C'];
      const patterns = rule.analyzeLogicalPatterns(statements);
      expect(patterns).toEqual([]);
    });
  });

  describe('detectModalPatterns', () => {
    let rule: InferenceRule;

    beforeEach(() => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        rule = result.value;
      }
    });

    it('should detect necessity distribution pattern', () => {
      const patterns = rule.detectModalPatterns('□(P ∧ Q)', [], 0);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'necessity-distribution',
          name: 'Necessity Distribution',
          confidence: 0.7,
        })
      );
    });

    it('should detect modal duality pattern', () => {
      const patterns1 = rule.detectModalPatterns('◇P', [], 0);
      expect(patterns1).toContainEqual(
        expect.objectContaining({
          type: 'modal-duality',
          name: 'Modal Duality',
          confidence: 0.75,
        })
      );

      const patterns2 = rule.detectModalPatterns('¬□¬P', [], 0);
      expect(patterns2).toContainEqual(
        expect.objectContaining({
          type: 'modal-duality',
          name: 'Modal Duality',
          confidence: 0.75,
        })
      );
    });

    it('should return empty array for non-modal statements', () => {
      const patterns = rule.detectModalPatterns('P → Q', [], 0);
      expect(patterns).toEqual([]);
    });
  });

  describe('extractLogicalFeatures', () => {
    let rule: InferenceRule;

    beforeEach(() => {
      const result = InferenceRule.createModusPonens(validLanguagePackageId);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        rule = result.value;
      }
    });

    it('should extract features from logical statements', () => {
      const statements = ['∀x(P(x) → Q(x))', '∃x(R(x) ∧ S(x))', '¬P ∨ Q', 'P → Q', '□P ↔ ◇Q'];

      const features = rule.extractLogicalFeatures(statements);

      expect(features.hasQuantifiers).toBe(true);
      expect(features.hasModalOperators).toBe(true);
      expect(features.hasNegations).toBe(true);
      expect(features.hasImplications).toBe(true);
      expect(features.hasConjunctions).toBe(true);
      expect(features.hasDisjunctions).toBe(true);
      expect(features.logicalComplexity).toBeGreaterThan(0);
    });

    it('should handle simple statements', () => {
      const statements = ['P', 'Q', 'R'];
      const features = rule.extractLogicalFeatures(statements);

      expect(features.hasQuantifiers).toBe(false);
      expect(features.hasModalOperators).toBe(false);
      expect(features.hasNegations).toBe(false);
      expect(features.hasImplications).toBe(false);
      expect(features.hasConjunctions).toBe(false);
      expect(features.hasDisjunctions).toBe(false);
      expect(features.logicalComplexity).toBeGreaterThan(0);
    });

    it('should handle empty statements array', () => {
      const features = rule.extractLogicalFeatures([]);

      expect(features.hasQuantifiers).toBe(false);
      expect(features.hasModalOperators).toBe(false);
      expect(features.hasNegations).toBe(false);
      expect(features.hasImplications).toBe(false);
      expect(features.hasConjunctions).toBe(false);
      expect(features.hasDisjunctions).toBe(false);
      expect(features.logicalComplexity).toBe(0);
    });
  });

  describe('equals', () => {
    it('should compare rules by ID', () => {
      const result1 = InferenceRule.createModusPonens(validLanguagePackageId);
      const result2 = InferenceRule.createModusPonens(validLanguagePackageId);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // Different instances with different IDs
        expect(result1.value.equals(result2.value)).toBe(false);

        // Same instance
        expect(result1.value.equals(result1.value)).toBe(true);
      }
    });
  });
});
