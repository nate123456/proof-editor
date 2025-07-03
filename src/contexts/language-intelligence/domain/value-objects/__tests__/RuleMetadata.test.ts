import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { RuleMetadata, type RuleMetadataOptions } from '../RuleMetadata.js';

describe('RuleMetadata', () => {
  describe('create', () => {
    it('should create with default values', () => {
      const result = RuleMetadata.create({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getComplexityLevel()).toBe('intermediate');
        expect(metadata.getCategory()).toBe('inference');
        expect(metadata.getLogicType()).toBe('propositional');
        expect(metadata.isBuiltInRule()).toBe(false);
        expect(metadata.isStandardRule()).toBe(false);
        expect(metadata.getTags()).toEqual([]);
        expect(metadata.getSourceReference()).toBe(null);
        expect(metadata.getEducationalLevel()).toBe('undergraduate');
        expect(metadata.getPrerequisiteKnowledge()).toEqual([]);
        expect(metadata.getRelatedConcepts()).toEqual([]);
      }
    });

    it('should create with custom values', () => {
      const options: RuleMetadataOptions = {
        complexityLevel: 'advanced',
        category: 'modal',
        logicType: 'first-order',
        isBuiltIn: true,
        isStandard: true,
        tags: ['tag1', 'tag2'],
        sourceReference: 'Source 123',
        educationalLevel: 'graduate',
        prerequisiteKnowledge: ['prereq1', 'prereq2'],
        relatedConcepts: ['concept1', 'concept2'],
      };

      const result = RuleMetadata.create(options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getComplexityLevel()).toBe('advanced');
        expect(metadata.getCategory()).toBe('modal');
        expect(metadata.getLogicType()).toBe('first-order');
        expect(metadata.isBuiltInRule()).toBe(true);
        expect(metadata.isStandardRule()).toBe(true);
        expect(metadata.getTags()).toEqual(['tag1', 'tag2']);
        expect(metadata.getSourceReference()).toBe('Source 123');
        expect(metadata.getEducationalLevel()).toBe('graduate');
        expect(metadata.getPrerequisiteKnowledge()).toEqual(['prereq1', 'prereq2']);
        expect(metadata.getRelatedConcepts()).toEqual(['concept1', 'concept2']);
      }
    });

    it('should trim whitespace from string inputs', () => {
      const options: RuleMetadataOptions = {
        tags: ['  tag1  ', '  tag2  '],
        sourceReference: '  source  ',
        prerequisiteKnowledge: ['  prereq1  ', '  prereq2  '],
        relatedConcepts: ['  concept1  ', '  concept2  '],
      };

      const result = RuleMetadata.create(options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getTags()).toEqual(['tag1', 'tag2']);
        expect(metadata.getSourceReference()).toBe('source');
        expect(metadata.getPrerequisiteKnowledge()).toEqual(['prereq1', 'prereq2']);
        expect(metadata.getRelatedConcepts()).toEqual(['concept1', 'concept2']);
      }
    });

    it('should handle null source reference', () => {
      const result = RuleMetadata.create({ sourceReference: null });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSourceReference()).toBe(null);
      }
    });

    it('should convert empty trimmed source reference to empty string', () => {
      const result = RuleMetadata.create({ sourceReference: '   ' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getSourceReference()).toBe('');
      }
    });

    it('should reject empty tags', () => {
      const result = RuleMetadata.create({ tags: ['valid', '', 'also-valid'] });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Tags cannot be empty');
      }
    });

    it('should reject whitespace-only tags', () => {
      const result = RuleMetadata.create({ tags: ['valid', '   ', 'also-valid'] });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Tags cannot be empty');
      }
    });

    it('should reject empty prerequisite knowledge items', () => {
      const result = RuleMetadata.create({
        prerequisiteKnowledge: ['valid', '', 'also-valid'],
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Prerequisite knowledge items cannot be empty');
      }
    });

    it('should reject whitespace-only prerequisite knowledge items', () => {
      const result = RuleMetadata.create({
        prerequisiteKnowledge: ['valid', '   ', 'also-valid'],
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Prerequisite knowledge items cannot be empty');
      }
    });

    it('should reject empty related concepts', () => {
      const result = RuleMetadata.create({ relatedConcepts: ['valid', '', 'also-valid'] });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Related concepts cannot be empty');
      }
    });

    it('should reject whitespace-only related concepts', () => {
      const result = RuleMetadata.create({ relatedConcepts: ['valid', '   ', 'also-valid'] });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Related concepts cannot be empty');
      }
    });
  });

  describe('createDefault', () => {
    it('should create metadata with all default values', () => {
      const metadata = RuleMetadata.createDefault();

      expect(metadata.getComplexityLevel()).toBe('intermediate');
      expect(metadata.getCategory()).toBe('inference');
      expect(metadata.getLogicType()).toBe('propositional');
      expect(metadata.isBuiltInRule()).toBe(false);
      expect(metadata.isStandardRule()).toBe(false);
      expect(metadata.getTags()).toEqual([]);
      expect(metadata.getSourceReference()).toBe(null);
      expect(metadata.getEducationalLevel()).toBe('undergraduate');
      expect(metadata.getPrerequisiteKnowledge()).toEqual([]);
      expect(metadata.getRelatedConcepts()).toEqual([]);
    });
  });

  describe('createForModusPonens', () => {
    it('should create modus ponens rule metadata', () => {
      const result = RuleMetadata.createForModusPonens();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getComplexityLevel()).toBe('basic');
        expect(metadata.getCategory()).toBe('inference');
        expect(metadata.getLogicType()).toBe('propositional');
        expect(metadata.isBuiltInRule()).toBe(true);
        expect(metadata.isStandardRule()).toBe(true);
        expect(metadata.getTags()).toEqual(['basic', 'fundamental', 'deductive']);
        expect(metadata.getEducationalLevel()).toBe('high-school');
        expect(metadata.getPrerequisiteKnowledge()).toEqual(['implication', 'logical-reasoning']);
        expect(metadata.getRelatedConcepts()).toEqual([
          'modus-tollens',
          'hypothetical-syllogism',
          'conditional-statements',
        ]);
      }
    });
  });

  describe('createForModalRule', () => {
    it('should create modal rule metadata', () => {
      const result = RuleMetadata.createForModalRule();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getComplexityLevel()).toBe('advanced');
        expect(metadata.getCategory()).toBe('modal');
        expect(metadata.getLogicType()).toBe('modal');
        expect(metadata.isBuiltInRule()).toBe(false);
        expect(metadata.isStandardRule()).toBe(true);
        expect(metadata.getTags()).toEqual(['modal', 'necessity', 'possibility']);
        expect(metadata.getEducationalLevel()).toBe('graduate');
        expect(metadata.getPrerequisiteKnowledge()).toEqual([
          'propositional-logic',
          'possible-worlds',
          'modal-operators',
        ]);
        expect(metadata.getRelatedConcepts()).toEqual([
          'accessibility-relations',
          'modal-axioms',
          'kripke-semantics',
        ]);
      }
    });
  });

  describe('createForQuantifierRule', () => {
    it('should create quantifier rule metadata', () => {
      const result = RuleMetadata.createForQuantifierRule();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.value;
        expect(metadata.getComplexityLevel()).toBe('intermediate');
        expect(metadata.getCategory()).toBe('quantifier');
        expect(metadata.getLogicType()).toBe('first-order');
        expect(metadata.isBuiltInRule()).toBe(true);
        expect(metadata.isStandardRule()).toBe(true);
        expect(metadata.getTags()).toEqual(['quantifier', 'universal', 'existential']);
        expect(metadata.getEducationalLevel()).toBe('undergraduate');
        expect(metadata.getPrerequisiteKnowledge()).toEqual([
          'predicate-logic',
          'variable-binding',
          'domains',
        ]);
        expect(metadata.getRelatedConcepts()).toEqual(['instantiation', 'generalization', 'scope']);
      }
    });
  });

  describe('tag related methods', () => {
    describe('hasTag', () => {
      it('should return true for existing tags', () => {
        const result = RuleMetadata.create({ tags: ['tag1', 'tag2', 'tag3'] });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const metadata = result.value;
          expect(metadata.hasTag('tag1')).toBe(true);
          expect(metadata.hasTag('tag2')).toBe(true);
          expect(metadata.hasTag('tag3')).toBe(true);
        }
      });

      it('should be case-insensitive', () => {
        const result = RuleMetadata.create({ tags: ['casesensitive'] });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const metadata = result.value;
          expect(metadata.hasTag('casesensitive')).toBe(true);
          expect(metadata.hasTag('CASESENSITIVE')).toBe(true);
          expect(metadata.hasTag('CaseSensitive')).toBe(true);
        }
      });

      it('should return false for non-existing tags', () => {
        const result = RuleMetadata.create({ tags: ['tag1', 'tag2'] });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const metadata = result.value;
          expect(metadata.hasTag('tag3')).toBe(false);
          expect(metadata.hasTag('nonexistent')).toBe(false);
        }
      });
    });

    describe('getTagsByCategory', () => {
      it('should categorize tags correctly', () => {
        const result = RuleMetadata.create({
          tags: [
            'basic',
            'propositional',
            'built-in',
            'fundamental',
            'intermediate',
            'modal',
            'standard',
            'concept',
          ],
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const categories = result.value.getTagsByCategory();
          expect(categories.educational).toEqual(['basic', 'intermediate']);
          expect(categories.logical).toEqual(['propositional', 'modal']);
          expect(categories.technical).toEqual(['built-in', 'standard']);
          expect(categories.conceptual).toEqual(['fundamental', 'concept']);
        }
      });

      it('should handle empty tags', () => {
        const result = RuleMetadata.create({ tags: [] });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const categories = result.value.getTagsByCategory();
          expect(categories.educational).toEqual([]);
          expect(categories.logical).toEqual([]);
          expect(categories.technical).toEqual([]);
          expect(categories.conceptual).toEqual([]);
        }
      });
    });
  });

  describe('complexity and level checks', () => {
    describe('isBasic', () => {
      it('should return true for basic complexity', () => {
        const result = RuleMetadata.create({ complexityLevel: 'basic' });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isBasic()).toBe(true);
        }
      });

      it('should return false for non-basic complexity', () => {
        const intermediate = RuleMetadata.create({ complexityLevel: 'intermediate' });
        const advanced = RuleMetadata.create({ complexityLevel: 'advanced' });

        expect(intermediate.isOk() && !intermediate.value.isBasic()).toBe(true);
        expect(advanced.isOk() && !advanced.value.isBasic()).toBe(true);
      });
    });

    describe('isAdvanced', () => {
      it('should return true for advanced complexity', () => {
        const result = RuleMetadata.create({ complexityLevel: 'advanced' });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isAdvanced()).toBe(true);
        }
      });

      it('should return false for non-advanced complexity', () => {
        const basic = RuleMetadata.create({ complexityLevel: 'basic' });
        const intermediate = RuleMetadata.create({ complexityLevel: 'intermediate' });

        expect(basic.isOk() && !basic.value.isAdvanced()).toBe(true);
        expect(intermediate.isOk() && !intermediate.value.isAdvanced()).toBe(true);
      });
    });

    describe('logic type checks', () => {
      it('should correctly identify modal logic', () => {
        const modal = RuleMetadata.create({ logicType: 'modal' });
        const propositional = RuleMetadata.create({ logicType: 'propositional' });

        expect(modal.isOk() && modal.value.isModalLogic()).toBe(true);
        expect(propositional.isOk() && !propositional.value.isModalLogic()).toBe(true);
      });

      it('should correctly identify first-order logic', () => {
        const firstOrder = RuleMetadata.create({ logicType: 'first-order' });
        const propositional = RuleMetadata.create({ logicType: 'propositional' });

        expect(firstOrder.isOk() && firstOrder.value.isFirstOrderLogic()).toBe(true);
        expect(propositional.isOk() && !propositional.value.isFirstOrderLogic()).toBe(true);
      });

      it('should correctly identify propositional logic', () => {
        const propositional = RuleMetadata.create({ logicType: 'propositional' });
        const firstOrder = RuleMetadata.create({ logicType: 'first-order' });

        expect(propositional.isOk() && propositional.value.isPropositionalLogic()).toBe(true);
        expect(firstOrder.isOk() && !firstOrder.value.isPropositionalLogic()).toBe(true);
      });
    });

    describe('requiresAdvancedKnowledge', () => {
      it('should return true for graduate educational level', () => {
        const result = RuleMetadata.create({ educationalLevel: 'graduate' });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.requiresAdvancedKnowledge()).toBe(true);
        }
      });

      it('should return true for advanced complexity', () => {
        const result = RuleMetadata.create({ complexityLevel: 'advanced' });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.requiresAdvancedKnowledge()).toBe(true);
        }
      });

      it('should return false for basic levels', () => {
        const result = RuleMetadata.create({
          educationalLevel: 'high-school',
          complexityLevel: 'basic',
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.requiresAdvancedKnowledge()).toBe(false);
        }
      });
    });

    describe('getSuitableForLevel', () => {
      it('should allow higher educational levels', () => {
        const result = RuleMetadata.create({ educationalLevel: 'high-school' });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const metadata = result.value;
          expect(metadata.getSuitableForLevel('high-school')).toBe(true);
          expect(metadata.getSuitableForLevel('undergraduate')).toBe(true);
          expect(metadata.getSuitableForLevel('graduate')).toBe(true);
        }
      });

      it('should reject lower educational levels', () => {
        const result = RuleMetadata.create({ educationalLevel: 'graduate' });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const metadata = result.value;
          expect(metadata.getSuitableForLevel('high-school')).toBe(false);
          expect(metadata.getSuitableForLevel('undergraduate')).toBe(false);
          expect(metadata.getSuitableForLevel('graduate')).toBe(true);
        }
      });
    });
  });

  describe('getDifficultyScore', () => {
    it('should calculate score based on complexity level', () => {
      const basic = RuleMetadata.create({ complexityLevel: 'basic' });
      const intermediate = RuleMetadata.create({ complexityLevel: 'intermediate' });
      const advanced = RuleMetadata.create({ complexityLevel: 'advanced' });

      expect(basic.isOk()).toBe(true);
      expect(intermediate.isOk()).toBe(true);
      expect(advanced.isOk()).toBe(true);

      if (basic.isOk() && intermediate.isOk() && advanced.isOk()) {
        const basicScore = basic.value.getDifficultyScore();
        const intermediateScore = intermediate.value.getDifficultyScore();
        const advancedScore = advanced.value.getDifficultyScore();

        expect(basicScore).toBeLessThan(intermediateScore);
        expect(intermediateScore).toBeLessThan(advancedScore);
      }
    });

    it('should calculate score based on logic type', () => {
      const propositional = RuleMetadata.create({ logicType: 'propositional' });
      const firstOrder = RuleMetadata.create({ logicType: 'first-order' });
      const modal = RuleMetadata.create({ logicType: 'modal' });
      const higherOrder = RuleMetadata.create({ logicType: 'higher-order' });

      const scores = [propositional, firstOrder, modal, higherOrder].map((result) => {
        expect(result.isOk()).toBe(true);
        return result.isOk() ? result.value.getDifficultyScore() : 0;
      });

      expect(scores.length).toBe(4);
      expect(scores[0]).toBeLessThan(scores[1]);
      expect(scores[1]).toBeLessThan(scores[2]);
      expect(scores[2]).toBeLessThan(scores[3]);
    });

    it('should include prerequisite knowledge in score', () => {
      const noPrereqs = RuleMetadata.create({ prerequisiteKnowledge: [] });
      const somePrereqs = RuleMetadata.create({
        prerequisiteKnowledge: ['prereq1', 'prereq2'],
      });
      const manyPrereqs = RuleMetadata.create({
        prerequisiteKnowledge: ['prereq1', 'prereq2', 'prereq3', 'prereq4'],
      });

      expect(noPrereqs.isOk()).toBe(true);
      expect(somePrereqs.isOk()).toBe(true);
      expect(manyPrereqs.isOk()).toBe(true);

      if (noPrereqs.isOk() && somePrereqs.isOk() && manyPrereqs.isOk()) {
        const noPrereqsScore = noPrereqs.value.getDifficultyScore();
        const somePrereqsScore = somePrereqs.value.getDifficultyScore();
        const manyPrereqsScore = manyPrereqs.value.getDifficultyScore();

        expect(noPrereqsScore).toBeLessThan(somePrereqsScore);
        expect(somePrereqsScore).toBeLessThan(manyPrereqsScore);
      }
    });

    it('should return a rounded score', () => {
      const result = RuleMetadata.create({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const score = result.value.getDifficultyScore();
        expect(score).toBe(Math.round(score * 10) / 10);
      }
    });
  });

  describe('withAdditionalTags', () => {
    it('should add new tags while preserving existing ones', () => {
      const original = RuleMetadata.create({ tags: ['tag1', 'tag2'] });

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const result = original.value.withAdditionalTags(['tag3', 'tag4']);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getTags()).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
        }
      }
    });

    it('should remove duplicate tags', () => {
      const original = RuleMetadata.create({ tags: ['tag1', 'tag2'] });

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const result = original.value.withAdditionalTags(['tag2', 'tag3']);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const tags = result.value.getTags();
          expect(tags).toContain('tag1');
          expect(tags).toContain('tag2');
          expect(tags).toContain('tag3');
          expect(tags.length).toBe(3);
        }
      }
    });

    it('should trim whitespace from new tags', () => {
      const original = RuleMetadata.create({ tags: ['tag1'] });

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const result = original.value.withAdditionalTags(['  tag2  ', '  tag3  ']);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getTags()).toEqual(['tag1', 'tag2', 'tag3']);
        }
      }
    });

    it('should reject empty new tags', () => {
      const original = RuleMetadata.create({ tags: ['tag1'] });

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const result = original.value.withAdditionalTags(['tag2', '', 'tag3']);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Tags cannot be empty');
        }
      }
    });
  });

  describe('withComplexityLevel', () => {
    it('should create new instance with different complexity level', () => {
      const original = RuleMetadata.create({ complexityLevel: 'basic' });

      expect(original.isOk()).toBe(true);
      if (original.isOk()) {
        const modified = original.value.withComplexityLevel('advanced');

        expect(modified.getComplexityLevel()).toBe('advanced');
        expect(original.value.getComplexityLevel()).toBe('basic'); // Original unchanged
        expect(modified.getCategory()).toBe(original.value.getCategory()); // Other properties preserved
      }
    });
  });

  describe('equals', () => {
    it('should return true for metadata with same core properties', () => {
      const metadata1 = RuleMetadata.create({
        complexityLevel: 'basic',
        category: 'inference',
        logicType: 'propositional',
        isBuiltIn: true,
        isStandard: false,
      });
      const metadata2 = RuleMetadata.create({
        complexityLevel: 'basic',
        category: 'inference',
        logicType: 'propositional',
        isBuiltIn: true,
        isStandard: false,
        tags: ['different'], // Different tags shouldn't affect equality
      });

      expect(metadata1.isOk()).toBe(true);
      expect(metadata2.isOk()).toBe(true);

      if (metadata1.isOk() && metadata2.isOk()) {
        expect(metadata1.value.equals(metadata2.value)).toBe(true);
      }
    });

    it('should return false for metadata with different core properties', () => {
      const metadata1 = RuleMetadata.create({
        complexityLevel: 'basic',
        category: 'inference',
        logicType: 'propositional',
        isBuiltIn: true,
        isStandard: false,
      });
      const metadata2 = RuleMetadata.create({
        complexityLevel: 'advanced', // Different complexity
        category: 'inference',
        logicType: 'propositional',
        isBuiltIn: true,
        isStandard: false,
      });

      expect(metadata1.isOk()).toBe(true);
      expect(metadata2.isOk()).toBe(true);

      if (metadata1.isOk() && metadata2.isOk()) {
        expect(metadata1.value.equals(metadata2.value)).toBe(false);
      }
    });
  });
});
