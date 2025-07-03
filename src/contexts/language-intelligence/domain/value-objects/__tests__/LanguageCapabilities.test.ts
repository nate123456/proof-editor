/**
 * Tests for LanguageCapabilities value object
 *
 * Focuses on:
 * - Language capability creation and validation
 * - Logic system support flags
 * - Feature compatibility checking
 * - Capability comparison and merging
 * - Error handling for invalid capabilities
 */

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors';
import { LanguageCapabilities } from '../LanguageCapabilities';

describe('LanguageCapabilities', () => {
  describe('create', () => {
    it('should create valid capabilities with all features enabled', () => {
      const result = LanguageCapabilities.create(
        true, // propositional logic
        true, // first-order logic
        true, // modal logic
        true, // temporal logic
        true, // higher-order logic
        ['∧', '∨', '→', '¬'], // connectives
        ['∀', '∃'], // quantifiers
        ['□', '◇'], // modal operators
        ['G', 'F', 'X', 'U'] // temporal operators
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const capabilities = result.value;
        expect(capabilities.supportsPropositionalLogic()).toBe(true);
        expect(capabilities.supportsFirstOrderLogic()).toBe(true);
        expect(capabilities.supportsModalLogic()).toBe(true);
        expect(capabilities.supportsTemporalLogic()).toBe(true);
        expect(capabilities.supportsHigherOrderLogic()).toBe(true);
        expect(capabilities.getSupportedConnectives()).toEqual(['∧', '∨', '→', '¬']);
        expect(capabilities.getSupportedQuantifiers()).toEqual(['∀', '∃']);
        expect(capabilities.getSupportedModalOperators()).toEqual(['□', '◇']);
        expect(capabilities.getSupportedTemporalOperators()).toEqual(['G', 'F', 'X', 'U']);
      }
    });

    it('should create valid capabilities with minimal features', () => {
      const result = LanguageCapabilities.create(
        true, // propositional logic only
        false,
        false,
        false,
        false,
        ['∧', '∨'], // basic connectives
        [], // no quantifiers
        [], // no modal operators
        [] // no temporal operators
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const capabilities = result.value;
        expect(capabilities.supportsPropositionalLogic()).toBe(true);
        expect(capabilities.supportsFirstOrderLogic()).toBe(false);
        expect(capabilities.supportsModalLogic()).toBe(false);
        expect(capabilities.supportsTemporalLogic()).toBe(false);
        expect(capabilities.supportsHigherOrderLogic()).toBe(false);
        expect(capabilities.getSupportedConnectives()).toEqual(['∧', '∨']);
        expect(capabilities.getSupportedQuantifiers()).toEqual([]);
      }
    });

    it('should fail when no logic systems are supported', () => {
      const result = LanguageCapabilities.create(false, false, false, false, false, [], [], [], []);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('At least one logic system must be supported');
      }
    });

    it('should fail when propositional logic is disabled but connectives are provided', () => {
      const result = LanguageCapabilities.create(
        false, // propositional disabled
        true,
        false,
        false,
        false,
        ['∧', '∨'], // but connectives provided
        ['∀'],
        [],
        []
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain(
          'Cannot have connectives without propositional logic support'
        );
      }
    });

    it('should fail when first-order logic is disabled but quantifiers are provided', () => {
      const result = LanguageCapabilities.create(
        true,
        false, // first-order disabled
        false,
        false,
        false,
        ['∧'],
        ['∀', '∃'], // but quantifiers provided
        [],
        []
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain(
          'Cannot have quantifiers without first-order logic support'
        );
      }
    });

    it('should fail when modal logic is disabled but modal operators are provided', () => {
      const result = LanguageCapabilities.create(
        true,
        true,
        false, // modal disabled
        false,
        false,
        ['∧'],
        ['∀'],
        ['□', '◇'], // but modal operators provided
        []
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain(
          'Cannot have modal operators without modal logic support'
        );
      }
    });

    it('should fail when temporal logic is disabled but temporal operators are provided', () => {
      const result = LanguageCapabilities.create(
        true,
        true,
        false,
        false, // temporal disabled
        false,
        ['∧'],
        ['∀'],
        [],
        ['G', 'F'] // but temporal operators provided
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain(
          'Cannot have temporal operators without temporal logic support'
        );
      }
    });

    it('should handle empty operator arrays when logic is enabled', () => {
      const result = LanguageCapabilities.create(
        true,
        true,
        true,
        true,
        false,
        [], // empty connectives
        [], // empty quantifiers
        [], // empty modal operators
        [] // empty temporal operators
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const capabilities = result.value;
        expect(capabilities.getSupportedConnectives()).toEqual([]);
        expect(capabilities.getSupportedQuantifiers()).toEqual([]);
        expect(capabilities.getSupportedModalOperators()).toEqual([]);
        expect(capabilities.getSupportedTemporalOperators()).toEqual([]);
      }
    });
  });

  describe('predefined capabilities', () => {
    it('should create basic propositional logic capabilities', () => {
      const capabilities = LanguageCapabilities.propositionalOnly();

      expect(capabilities.supportsPropositionalLogic()).toBe(true);
      expect(capabilities.supportsFirstOrderLogic()).toBe(false);
      expect(capabilities.supportsModalLogic()).toBe(false);
      expect(capabilities.supportsTemporalLogic()).toBe(false);
      expect(capabilities.supportsHigherOrderLogic()).toBe(false);
      expect(capabilities.getSupportedConnectives()).toContain('∧');
      expect(capabilities.getSupportedConnectives()).toContain('∨');
      expect(capabilities.getSupportedConnectives()).toContain('→');
      expect(capabilities.getSupportedConnectives()).toContain('¬');
    });

    it('should create first-order logic capabilities', () => {
      const capabilities = LanguageCapabilities.firstOrderLogic();

      expect(capabilities.supportsPropositionalLogic()).toBe(true);
      expect(capabilities.supportsFirstOrderLogic()).toBe(true);
      expect(capabilities.supportsModalLogic()).toBe(false);
      expect(capabilities.getSupportedQuantifiers()).toContain('∀');
      expect(capabilities.getSupportedQuantifiers()).toContain('∃');
    });

    it('should create full featured capabilities', () => {
      const capabilities = LanguageCapabilities.fullFeatured();

      expect(capabilities.supportsPropositionalLogic()).toBe(true);
      expect(capabilities.supportsFirstOrderLogic()).toBe(true);
      expect(capabilities.supportsModalLogic()).toBe(true);
      expect(capabilities.supportsTemporalLogic()).toBe(true);
      expect(capabilities.supportsHigherOrderLogic()).toBe(true);
      expect(capabilities.getSupportedConnectives().length).toBeGreaterThan(0);
      expect(capabilities.getSupportedQuantifiers().length).toBeGreaterThan(0);
      expect(capabilities.getSupportedModalOperators().length).toBeGreaterThan(0);
      expect(capabilities.getSupportedTemporalOperators().length).toBeGreaterThan(0);
    });

    it('should create modal logic capabilities', () => {
      const capabilities = LanguageCapabilities.modalLogic();

      expect(capabilities.supportsPropositionalLogic()).toBe(true);
      expect(capabilities.supportsFirstOrderLogic()).toBe(true);
      expect(capabilities.supportsModalLogic()).toBe(true);
      expect(capabilities.getSupportedModalOperators()).toContain('□');
      expect(capabilities.getSupportedModalOperators()).toContain('◇');
    });
  });

  describe('operator support checking', () => {
    it('should check connective support correctly', () => {
      const capabilities = LanguageCapabilities.propositionalOnly();

      expect(capabilities.supportsConnective('∧')).toBe(true);
      expect(capabilities.supportsConnective('∨')).toBe(true);
      expect(capabilities.supportsConnective('→')).toBe(true);
      expect(capabilities.supportsConnective('¬')).toBe(true);
      expect(capabilities.supportsConnective('⊕')).toBe(false); // XOR not typically included
    });

    it('should check quantifier support correctly', () => {
      const capabilities = LanguageCapabilities.firstOrderLogic();

      expect(capabilities.supportsQuantifier('∀')).toBe(true);
      expect(capabilities.supportsQuantifier('∃')).toBe(true);
      expect(capabilities.supportsQuantifier('∃!')).toBe(false); // Unique existence not typically included
    });

    it('should check modal operator support correctly', () => {
      const capabilities = LanguageCapabilities.modalLogic();

      expect(capabilities.supportsModalOperator('□')).toBe(true);
      expect(capabilities.supportsModalOperator('◇')).toBe(true);
      expect(capabilities.supportsModalOperator('K')).toBe(false); // Knowledge operator not included by default
    });

    it('should check temporal operator support correctly', () => {
      const capabilities = LanguageCapabilities.fullFeatured();

      expect(capabilities.supportsTemporalOperator('G')).toBe(true); // Globally
      expect(capabilities.supportsTemporalOperator('F')).toBe(true); // Finally
      expect(capabilities.supportsTemporalOperator('X')).toBe(true); // Next
      expect(capabilities.supportsTemporalOperator('U')).toBe(true); // Until
      expect(capabilities.supportsTemporalOperator('R')).toBe(false); // Release not included by default
    });
  });

  describe('compatibility checking', () => {
    it('should check if capabilities are compatible with requirements', () => {
      const fullCapabilities = LanguageCapabilities.fullFeatured();
      const propOnly = LanguageCapabilities.propositionalOnly();

      expect(fullCapabilities.isCompatibleWith(propOnly)).toBe(true);
      expect(propOnly.isCompatibleWith(fullCapabilities)).toBe(false);
    });

    it('should check specific logic system compatibility', () => {
      const modalCapabilities = LanguageCapabilities.modalLogic();
      const propOnly = LanguageCapabilities.propositionalOnly();

      // Modal logic includes propositional, so it's compatible
      expect(modalCapabilities.isCompatibleWith(propOnly)).toBe(true);
      // But propositional only cannot satisfy modal logic requirements
      expect(propOnly.isCompatibleWith(modalCapabilities)).toBe(false);
    });

    it('should check operator compatibility', () => {
      const result1 = LanguageCapabilities.create(
        true,
        false,
        false,
        false,
        false,
        ['∧', '∨', '→'],
        [],
        [],
        []
      );
      const result2 = LanguageCapabilities.create(
        true,
        false,
        false,
        false,
        false,
        ['∧', '∨'],
        [],
        [],
        []
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const caps1 = result1.value;
        const caps2 = result2.value;

        expect(caps1.isCompatibleWith(caps2)).toBe(true); // caps1 has more operators
        expect(caps2.isCompatibleWith(caps1)).toBe(false); // caps2 missing '→'
      }
    });
  });

  describe('capability merging and intersection', () => {
    it('should merge capabilities correctly', () => {
      const propCapabilities = LanguageCapabilities.propositionalOnly();
      const modalCapabilities = LanguageCapabilities.modalLogic();

      const merged = propCapabilities.mergeWith(modalCapabilities);

      expect(merged.supportsPropositionalLogic()).toBe(true);
      expect(merged.supportsFirstOrderLogic()).toBe(true);
      expect(merged.supportsModalLogic()).toBe(true);
      expect(merged.getSupportedConnectives().length).toBeGreaterThan(0);
      expect(merged.getSupportedModalOperators().length).toBeGreaterThan(0);
    });

    it('should find intersection of capabilities', () => {
      const fullCapabilities = LanguageCapabilities.fullFeatured();
      const propOnly = LanguageCapabilities.propositionalOnly();

      const intersection = fullCapabilities.intersectWith(propOnly);

      expect(intersection.supportsPropositionalLogic()).toBe(true);
      expect(intersection.supportsFirstOrderLogic()).toBe(false);
      expect(intersection.supportsModalLogic()).toBe(false);
      expect(intersection.supportsTemporalLogic()).toBe(false);
      expect(intersection.supportsHigherOrderLogic()).toBe(false);
    });

    it('should handle merging of operator arrays', () => {
      const result1 = LanguageCapabilities.create(
        true,
        false,
        false,
        false,
        false,
        ['∧', '∨'],
        [],
        [],
        []
      );
      const result2 = LanguageCapabilities.create(
        true,
        false,
        false,
        false,
        false,
        ['→', '¬'],
        [],
        [],
        []
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        const caps1 = result1.value;
        const caps2 = result2.value;

        const merged = caps1.mergeWith(caps2);
        const connectives = merged.getSupportedConnectives();

        expect(connectives).toContain('∧');
        expect(connectives).toContain('∨');
        expect(connectives).toContain('→');
        expect(connectives).toContain('¬');
        expect(connectives.length).toBe(4);
      }
    });
  });

  describe('complexity and feature analysis', () => {
    it('should calculate complexity score correctly', () => {
      const propOnly = LanguageCapabilities.propositionalOnly();
      const fullFeatured = LanguageCapabilities.fullFeatured();

      expect(propOnly.getComplexityScore()).toBeLessThan(fullFeatured.getComplexityScore());
      expect(propOnly.getComplexityScore()).toBeGreaterThan(0);
    });

    it('should identify minimal vs extensive capabilities', () => {
      const propOnly = LanguageCapabilities.propositionalOnly();
      const fullFeatured = LanguageCapabilities.fullFeatured();

      expect(propOnly.isMinimal()).toBe(true);
      expect(fullFeatured.isMinimal()).toBe(false);
      expect(propOnly.isExtensive()).toBe(false);
      expect(fullFeatured.isExtensive()).toBe(true);
    });

    it('should count total supported operators', () => {
      const fullFeatured = LanguageCapabilities.fullFeatured();
      const totalOperators = fullFeatured.getTotalOperatorCount();

      expect(totalOperators).toBeGreaterThan(0);
      expect(totalOperators).toBe(
        fullFeatured.getSupportedConnectives().length +
          fullFeatured.getSupportedQuantifiers().length +
          fullFeatured.getSupportedModalOperators().length +
          fullFeatured.getSupportedTemporalOperators().length
      );
    });
  });

  describe('validation and requirements checking', () => {
    it('should validate against minimum requirements', () => {
      const propOnly = LanguageCapabilities.propositionalOnly();
      const minimal = LanguageCapabilities.create(true, false, false, false, false, [], [], [], []);

      expect(propOnly.meetsMinimumRequirements()).toBe(true);

      if (minimal.isOk()) {
        expect(minimal.value.meetsMinimumRequirements()).toBe(true); // Has propositional logic
      }
    });

    it('should check for specific feature requirements', () => {
      const modalCapabilities = LanguageCapabilities.modalLogic();

      expect(modalCapabilities.hasRequiredFeature('modal')).toBe(true);
      expect(modalCapabilities.hasRequiredFeature('temporal')).toBe(false);
      expect(modalCapabilities.hasRequiredFeature('propositional')).toBe(true);
      expect(modalCapabilities.hasRequiredFeature('first-order')).toBe(true);
    });

    it('should validate operator consistency', () => {
      const validCapabilities = LanguageCapabilities.firstOrderLogic();
      expect(validCapabilities.hasConsistentOperators()).toBe(true);

      // Test edge case with inconsistent operators (this would be caught at creation)
      const inconsistentResult = LanguageCapabilities.create(
        false,
        false,
        false,
        false,
        false,
        ['∧'],
        [],
        [],
        []
      );
      expect(inconsistentResult.isErr()).toBe(true);
    });
  });

  describe('string representation and serialization', () => {
    it('should provide readable string representation', () => {
      const capabilities = LanguageCapabilities.modalLogic();
      const str = capabilities.toString();

      expect(str).toContain('propositional');
      expect(str).toContain('first-order');
      expect(str).toContain('modal');
      expect(str).not.toContain('temporal');
      expect(str).not.toContain('higher-order');
    });

    it('should serialize to JSON correctly', () => {
      const capabilities = LanguageCapabilities.propositionalOnly();
      const json = capabilities.toJSON();

      expect(json).toHaveProperty('propositionalLogic', true);
      expect(json).toHaveProperty('firstOrderLogic', false);
      expect(json).toHaveProperty('modalLogic', false);
      expect(json).toHaveProperty('supportedConnectives');
      expect(json.supportedConnectives).toBeInstanceOf(Array);
    });

    it('should create capabilities from JSON', () => {
      const original = LanguageCapabilities.firstOrderLogic();
      const json = original.toJSON();
      const restored = LanguageCapabilities.fromJSON(json);

      expect(restored.isOk()).toBe(true);
      if (restored.isOk()) {
        const restoredCaps = restored.value;
        expect(restoredCaps.supportsPropositionalLogic()).toBe(
          original.supportsPropositionalLogic()
        );
        expect(restoredCaps.supportsFirstOrderLogic()).toBe(original.supportsFirstOrderLogic());
        expect(restoredCaps.getSupportedConnectives()).toEqual(original.getSupportedConnectives());
        expect(restoredCaps.getSupportedQuantifiers()).toEqual(original.getSupportedQuantifiers());
      }
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = {
        propositionalLogic: 'invalid', // should be boolean
        firstOrderLogic: true,
        supportedConnectives: 'not-an-array',
      };

      const result = LanguageCapabilities.fromJSON(malformedJson);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });
});
