import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/DomainErrors.js';
import { ValidationLevel } from '../ValidationLevel.js';

describe('ValidationLevel', () => {
  describe('static factory methods', () => {
    it('should create syntax level', () => {
      const level = ValidationLevel.syntax();

      expect(level.getLevel()).toBe('syntax');
      expect(level.getPriority()).toBe(1);
      expect(level.getPerformanceTargetMs()).toBe(5);
    });

    it('should create flow level', () => {
      const level = ValidationLevel.flow();

      expect(level.getLevel()).toBe('flow');
      expect(level.getPriority()).toBe(2);
      expect(level.getPerformanceTargetMs()).toBe(8);
    });

    it('should create semantic level', () => {
      const level = ValidationLevel.semantic();

      expect(level.getLevel()).toBe('semantic');
      expect(level.getPriority()).toBe(3);
      expect(level.getPerformanceTargetMs()).toBe(10);
    });

    it('should create style level', () => {
      const level = ValidationLevel.style();

      expect(level.getLevel()).toBe('style');
      expect(level.getPriority()).toBe(4);
      expect(level.getPerformanceTargetMs()).toBe(15);
    });

    it('should create full level', () => {
      const level = ValidationLevel.full();

      expect(level.getLevel()).toBe('style');
      expect(level.getPriority()).toBe(4);
      expect(level.getPerformanceTargetMs()).toBe(15);
      expect(level.isStyle()).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should create syntax from string', () => {
      const result = ValidationLevel.fromString('syntax');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLevel()).toBe('syntax');
        expect(result.value.getPriority()).toBe(1);
      }
    });

    it('should create flow from string', () => {
      const result = ValidationLevel.fromString('flow');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLevel()).toBe('flow');
        expect(result.value.getPriority()).toBe(2);
      }
    });

    it('should create semantic from string', () => {
      const result = ValidationLevel.fromString('semantic');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLevel()).toBe('semantic');
        expect(result.value.getPriority()).toBe(3);
      }
    });

    it('should create style from string', () => {
      const result = ValidationLevel.fromString('style');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLevel()).toBe('style');
        expect(result.value.getPriority()).toBe(4);
      }
    });

    it('should handle case-insensitive input', () => {
      const results = [
        ValidationLevel.fromString('SYNTAX'),
        ValidationLevel.fromString('Flow'),
        ValidationLevel.fromString('SEMANTIC'),
        ValidationLevel.fromString('Style'),
      ];

      for (const result of results) {
        expect(result.isOk()).toBe(true);
      }
    });

    it('should reject invalid level string', () => {
      const result = ValidationLevel.fromString('invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Invalid validation level: invalid');
      }
    });

    it('should reject empty string', () => {
      const result = ValidationLevel.fromString('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Invalid validation level: ');
      }
    });
  });

  describe('getter methods', () => {
    it('should return correct properties for syntax', () => {
      const level = ValidationLevel.syntax();

      expect(level.getLevel()).toBe('syntax');
      expect(level.getPriority()).toBe(1);
      expect(level.getPerformanceTargetMs()).toBe(5);
    });

    it('should return correct properties for flow', () => {
      const level = ValidationLevel.flow();

      expect(level.getLevel()).toBe('flow');
      expect(level.getPriority()).toBe(2);
      expect(level.getPerformanceTargetMs()).toBe(8);
    });

    it('should return correct properties for semantic', () => {
      const level = ValidationLevel.semantic();

      expect(level.getLevel()).toBe('semantic');
      expect(level.getPriority()).toBe(3);
      expect(level.getPerformanceTargetMs()).toBe(10);
    });

    it('should return correct properties for style', () => {
      const level = ValidationLevel.style();

      expect(level.getLevel()).toBe('style');
      expect(level.getPriority()).toBe(4);
      expect(level.getPerformanceTargetMs()).toBe(15);
    });
  });

  describe('type checking methods', () => {
    it('should correctly identify syntax level', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      expect(syntax.isSyntax()).toBe(true);
      expect(flow.isSyntax()).toBe(false);
      expect(semantic.isSyntax()).toBe(false);
      expect(style.isSyntax()).toBe(false);
    });

    it('should correctly identify flow level', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      expect(syntax.isFlow()).toBe(false);
      expect(flow.isFlow()).toBe(true);
      expect(semantic.isFlow()).toBe(false);
      expect(style.isFlow()).toBe(false);
    });

    it('should correctly identify semantic level', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      expect(syntax.isSemantic()).toBe(false);
      expect(flow.isSemantic()).toBe(false);
      expect(semantic.isSemantic()).toBe(true);
      expect(style.isSemantic()).toBe(false);
    });

    it('should correctly identify style level', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      expect(syntax.isStyle()).toBe(false);
      expect(flow.isStyle()).toBe(false);
      expect(semantic.isStyle()).toBe(false);
      expect(style.isStyle()).toBe(true);
    });
  });

  describe('comparison methods', () => {
    it('should correctly compare priority levels (more critical)', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // Lower priority number = more critical
      expect(syntax.isMoreCriticalThan(flow)).toBe(true);
      expect(syntax.isMoreCriticalThan(semantic)).toBe(true);
      expect(syntax.isMoreCriticalThan(style)).toBe(true);
      expect(flow.isMoreCriticalThan(semantic)).toBe(true);
      expect(flow.isMoreCriticalThan(style)).toBe(true);
      expect(semantic.isMoreCriticalThan(style)).toBe(true);

      expect(flow.isMoreCriticalThan(syntax)).toBe(false);
      expect(semantic.isMoreCriticalThan(syntax)).toBe(false);
      expect(style.isMoreCriticalThan(syntax)).toBe(false);
    });

    it('should correctly compare priority levels (less critical)', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // Higher priority number = less critical
      expect(style.isLessCriticalThan(semantic)).toBe(true);
      expect(style.isLessCriticalThan(flow)).toBe(true);
      expect(style.isLessCriticalThan(syntax)).toBe(true);
      expect(semantic.isLessCriticalThan(flow)).toBe(true);
      expect(semantic.isLessCriticalThan(syntax)).toBe(true);
      expect(flow.isLessCriticalThan(syntax)).toBe(true);

      expect(syntax.isLessCriticalThan(flow)).toBe(false);
      expect(syntax.isLessCriticalThan(semantic)).toBe(false);
      expect(syntax.isLessCriticalThan(style)).toBe(false);
    });

    it('should return false when comparing same levels', () => {
      const syntax1 = ValidationLevel.syntax();
      const syntax2 = ValidationLevel.syntax();

      expect(syntax1.isMoreCriticalThan(syntax2)).toBe(false);
      expect(syntax1.isLessCriticalThan(syntax2)).toBe(false);
    });
  });

  describe('canCombineWith', () => {
    it('should always return true for any validation level', () => {
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
      ];

      for (const level1 of levels) {
        for (const level2 of levels) {
          expect(level1.canCombineWith(level2)).toBe(true);
        }
      }
    });
  });

  describe('combineWith', () => {
    it('should return more critical level when combining', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      expect(syntax.combineWith(flow)).toBe(syntax);
      expect(flow.combineWith(syntax)).toBe(syntax);
      expect(semantic.combineWith(style)).toBe(semantic);
      expect(style.combineWith(semantic)).toBe(semantic);
    });

    it('should return same level when combining identical levels', () => {
      const syntax1 = ValidationLevel.syntax();
      const syntax2 = ValidationLevel.syntax();

      expect(syntax1.combineWith(syntax2)).toBe(syntax1);
    });

    it('should handle all level combinations correctly', () => {
      const levels = [
        ValidationLevel.syntax(), // priority 1
        ValidationLevel.flow(), // priority 2
        ValidationLevel.semantic(), // priority 3
        ValidationLevel.style(), // priority 4
      ];

      for (let i = 0; i < levels.length; i++) {
        for (let j = 0; j < levels.length; j++) {
          const levelI = levels[i];
          const levelJ = levels[j];
          if (levelI && levelJ) {
            const combined = levelI.combineWith(levelJ);
            const expectedIndex = Math.min(i, j); // Lower index = higher priority
            const expectedLevel = levels[expectedIndex];
            if (expectedLevel) {
              expect(combined).toBe(expectedLevel);
            }
          }
        }
      }
    });
  });

  describe('getDescription', () => {
    it('should return correct descriptions', () => {
      expect(ValidationLevel.syntax().getDescription()).toBe(
        'Basic syntax and structure validation',
      );
      expect(ValidationLevel.flow().getDescription()).toBe(
        'Statement flow and connection validation',
      );
      expect(ValidationLevel.semantic().getDescription()).toBe(
        'Logical meaning and inference validation',
      );
      expect(ValidationLevel.style().getDescription()).toBe('Style and convention validation');
    });
  });

  describe('includesLevel', () => {
    it('should include levels with same or higher priority', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // Style includes all levels (priority 4 >= all others)
      expect(style.includesLevel(syntax)).toBe(true);
      expect(style.includesLevel(flow)).toBe(true);
      expect(style.includesLevel(semantic)).toBe(true);
      expect(style.includesLevel(style)).toBe(true);

      // Semantic includes syntax and flow (priority 3 >= 1,2,3)
      expect(semantic.includesLevel(syntax)).toBe(true);
      expect(semantic.includesLevel(flow)).toBe(true);
      expect(semantic.includesLevel(semantic)).toBe(true);
      expect(semantic.includesLevel(style)).toBe(false);

      // Flow includes only syntax and flow (priority 2 >= 1,2)
      expect(flow.includesLevel(syntax)).toBe(true);
      expect(flow.includesLevel(flow)).toBe(true);
      expect(flow.includesLevel(semantic)).toBe(false);
      expect(flow.includesLevel(style)).toBe(false);

      // Syntax includes only syntax (priority 1 >= 1)
      expect(syntax.includesLevel(syntax)).toBe(true);
      expect(syntax.includesLevel(flow)).toBe(false);
      expect(syntax.includesLevel(semantic)).toBe(false);
      expect(syntax.includesLevel(style)).toBe(false);
    });
  });

  describe('getIncludedLevels', () => {
    it('should return correct included levels for syntax', () => {
      const levels = ValidationLevel.syntax().getIncludedLevels();

      expect(levels).toHaveLength(1);
      const firstLevel = levels[0];
      if (firstLevel) {
        expect(firstLevel.getLevel()).toBe('syntax');
      }
    });

    it('should return correct included levels for flow', () => {
      const levels = ValidationLevel.flow().getIncludedLevels();

      expect(levels).toHaveLength(2);
      const firstLevel = levels[0];
      const secondLevel = levels[1];
      if (firstLevel) {
        expect(firstLevel.getLevel()).toBe('syntax');
      }
      if (secondLevel) {
        expect(secondLevel.getLevel()).toBe('flow');
      }
    });

    it('should return correct included levels for semantic', () => {
      const levels = ValidationLevel.semantic().getIncludedLevels();

      expect(levels).toHaveLength(3);
      const firstLevel = levels[0];
      const secondLevel = levels[1];
      const thirdLevel = levels[2];
      if (firstLevel) {
        expect(firstLevel.getLevel()).toBe('syntax');
      }
      if (secondLevel) {
        expect(secondLevel.getLevel()).toBe('flow');
      }
      if (thirdLevel) {
        expect(thirdLevel.getLevel()).toBe('semantic');
      }
    });

    it('should return correct included levels for style', () => {
      const levels = ValidationLevel.style().getIncludedLevels();

      expect(levels).toHaveLength(4);
      const firstLevel = levels[0];
      const secondLevel = levels[1];
      const thirdLevel = levels[2];
      const fourthLevel = levels[3];
      if (firstLevel) {
        expect(firstLevel.getLevel()).toBe('syntax');
      }
      if (secondLevel) {
        expect(secondLevel.getLevel()).toBe('flow');
      }
      if (thirdLevel) {
        expect(thirdLevel.getLevel()).toBe('semantic');
      }
      if (fourthLevel) {
        expect(fourthLevel.getLevel()).toBe('style');
      }
    });
  });

  describe('equals', () => {
    it('should return true for identical levels', () => {
      const syntax1 = ValidationLevel.syntax();
      const syntax2 = ValidationLevel.syntax();

      expect(syntax1.equals(syntax2)).toBe(true);
    });

    it('should return false for different levels', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();

      expect(syntax.equals(flow)).toBe(false);
    });

    it('should work with all level combinations', () => {
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
      ];

      for (let i = 0; i < levels.length; i++) {
        for (let j = 0; j < levels.length; j++) {
          const expected = i === j;
          const levelI = levels[i];
          const levelJ = levels[j];
          if (levelI && levelJ) {
            expect(levelI.equals(levelJ)).toBe(expected);
          }
        }
      }
    });
  });

  describe('toString', () => {
    it('should return level as string', () => {
      expect(ValidationLevel.syntax().toString()).toBe('syntax');
      expect(ValidationLevel.flow().toString()).toBe('flow');
      expect(ValidationLevel.semantic().toString()).toBe('semantic');
      expect(ValidationLevel.style().toString()).toBe('style');
    });
  });

  describe('performance target constants validation', () => {
    it('should have monotonic performance targets', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // Performance targets should increase with complexity
      expect(syntax.getPerformanceTargetMs()).toBeLessThan(flow.getPerformanceTargetMs());
      expect(flow.getPerformanceTargetMs()).toBeLessThan(semantic.getPerformanceTargetMs());
      expect(semantic.getPerformanceTargetMs()).toBeLessThan(style.getPerformanceTargetMs());
    });

    it('should have reasonable performance targets', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // All targets should be positive and under 100ms
      expect(syntax.getPerformanceTargetMs()).toBeGreaterThan(0);
      expect(syntax.getPerformanceTargetMs()).toBeLessThan(100);

      expect(flow.getPerformanceTargetMs()).toBeGreaterThan(0);
      expect(flow.getPerformanceTargetMs()).toBeLessThan(100);

      expect(semantic.getPerformanceTargetMs()).toBeGreaterThan(0);
      expect(semantic.getPerformanceTargetMs()).toBeLessThan(100);

      expect(style.getPerformanceTargetMs()).toBeGreaterThan(0);
      expect(style.getPerformanceTargetMs()).toBeLessThan(100);
    });
  });

  describe('immutability and value object properties', () => {
    it('should test theoretical immutability expectations', () => {
      const level = ValidationLevel.syntax();
      const originalLevel = level.getLevel();
      const originalPriority = level.getPriority();
      const originalTarget = level.getPerformanceTargetMs();

      // Note: ValidationLevel is not deeply immutable by design,
      // but it follows value object patterns for practical use
      expect(level.getLevel()).toBe(originalLevel);
      expect(level.getPriority()).toBe(originalPriority);
      expect(level.getPerformanceTargetMs()).toBe(originalTarget);
    });

    it('should create new instances for factory methods', () => {
      const syntax1 = ValidationLevel.syntax();
      const syntax2 = ValidationLevel.syntax();

      // Should be different object instances
      expect(syntax1).not.toBe(syntax2);
      // But should have same values
      expect(syntax1.equals(syntax2)).toBe(true);
      expect(syntax1.getLevel()).toBe(syntax2.getLevel());
    });

    it('should maintain referential equality within same call', () => {
      const level = ValidationLevel.semantic();

      // Same instance should equal itself
      expect(level.equals(level)).toBe(true);
      expect(level.toString()).toBe(level.toString());
    });
  });

  describe('edge cases and boundary testing', () => {
    it('should handle fromString with case-insensitive input', () => {
      const edgeCases = ['SYNTAX', 'Syntax', 'sYnTaX', 'Flow', 'SEMANTIC', 'Style'];

      edgeCases.forEach((input) => {
        const result = ValidationLevel.fromString(input);
        expect(result.isOk()).toBe(true);
      });
    });

    it('should reject fromString with whitespace in input', () => {
      const invalidEdgeCases = [
        'syntax ',
        ' syntax',
        ' SYNTAX ',
        ' flow ',
        '\tsemantic',
        'style\n',
      ];

      invalidEdgeCases.forEach((input) => {
        const result = ValidationLevel.fromString(input);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });

    it('should reject non-string-like invalid inputs', () => {
      const invalidInputs = [
        'unknown-level',
        'random',
        'validation',
        'level',
        'syntax-extended',
        'pre-syntax',
        'style-plus',
        '123',
        'null',
        'undefined',
      ];

      invalidInputs.forEach((input) => {
        const result = ValidationLevel.fromString(input);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain(`Invalid validation level: ${input}`);
        }
      });
    });

    it('should maintain type consistency across all operations', () => {
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
        ValidationLevel.full(),
      ];

      levels.forEach((level) => {
        expect(typeof level.getLevel()).toBe('string');
        expect(typeof level.getPriority()).toBe('number');
        expect(typeof level.getPerformanceTargetMs()).toBe('number');
        expect(typeof level.isSyntax()).toBe('boolean');
        expect(typeof level.isFlow()).toBe('boolean');
        expect(typeof level.isSemantic()).toBe('boolean');
        expect(typeof level.isStyle()).toBe('boolean');
        expect(typeof level.toString()).toBe('string');
        expect(typeof level.getDescription()).toBe('string');
      });
    });
  });

  describe('business logic validation', () => {
    it('should ensure priority and level consistency', () => {
      expect(ValidationLevel.syntax().getPriority()).toBe(1);
      expect(ValidationLevel.flow().getPriority()).toBe(2);
      expect(ValidationLevel.semantic().getPriority()).toBe(3);
      expect(ValidationLevel.style().getPriority()).toBe(4);
      expect(ValidationLevel.full().getPriority()).toBe(4); // full = style
    });

    it('should maintain logical level inclusion hierarchy', () => {
      const style = ValidationLevel.style();
      const semantic = ValidationLevel.semantic();
      const flow = ValidationLevel.flow();
      const syntax = ValidationLevel.syntax();

      // Style (highest) should include all others
      expect(style.includesLevel(syntax)).toBe(true);
      expect(style.includesLevel(flow)).toBe(true);
      expect(style.includesLevel(semantic)).toBe(true);
      expect(style.includesLevel(style)).toBe(true);

      // Semantic should include syntax and flow, but not style
      expect(semantic.includesLevel(syntax)).toBe(true);
      expect(semantic.includesLevel(flow)).toBe(true);
      expect(semantic.includesLevel(semantic)).toBe(true);
      expect(semantic.includesLevel(style)).toBe(false);

      // Flow should include syntax and flow, but not semantic or style
      expect(flow.includesLevel(syntax)).toBe(true);
      expect(flow.includesLevel(flow)).toBe(true);
      expect(flow.includesLevel(semantic)).toBe(false);
      expect(flow.includesLevel(style)).toBe(false);

      // Syntax should only include syntax
      expect(syntax.includesLevel(syntax)).toBe(true);
      expect(syntax.includesLevel(flow)).toBe(false);
      expect(syntax.includesLevel(semantic)).toBe(false);
      expect(syntax.includesLevel(style)).toBe(false);
    });

    it('should validate full() method returns most comprehensive level', () => {
      const full = ValidationLevel.full();
      const style = ValidationLevel.style();

      expect(full.equals(style)).toBe(true);
      expect(full.getLevel()).toBe('style');
      expect(full.getPriority()).toBe(4);

      // Full should include all levels
      expect(full.includesLevel(ValidationLevel.syntax())).toBe(true);
      expect(full.includesLevel(ValidationLevel.flow())).toBe(true);
      expect(full.includesLevel(ValidationLevel.semantic())).toBe(true);
      expect(full.includesLevel(ValidationLevel.style())).toBe(true);
    });
  });

  describe('error handling and robustness', () => {
    it('should handle combineWith operations correctly', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // Combining should always return the more critical (lower priority number)
      expect(syntax.combineWith(flow).equals(syntax)).toBe(true);
      expect(flow.combineWith(syntax).equals(syntax)).toBe(true);
      expect(semantic.combineWith(style).equals(semantic)).toBe(true);
      expect(style.combineWith(semantic).equals(semantic)).toBe(true);

      // Combining with self should return self
      expect(syntax.combineWith(syntax).equals(syntax)).toBe(true);
      expect(style.combineWith(style).equals(style)).toBe(true);
    });

    it('should provide meaningful descriptions for all levels', () => {
      const levels = [
        { level: ValidationLevel.syntax(), expectedKeywords: ['Basic', 'syntax', 'structure'] },
        { level: ValidationLevel.flow(), expectedKeywords: ['Statement', 'flow', 'connection'] },
        {
          level: ValidationLevel.semantic(),
          expectedKeywords: ['Logical', 'meaning', 'inference'],
        },
        { level: ValidationLevel.style(), expectedKeywords: ['Style', 'convention'] },
      ];

      levels.forEach(({ level, expectedKeywords }) => {
        const description = level.getDescription();
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(10);

        // Should contain at least one expected keyword (case insensitive)
        const hasExpectedKeyword = expectedKeywords.some((keyword) =>
          description.toLowerCase().includes(keyword.toLowerCase()),
        );
        expect(hasExpectedKeyword).toBe(true);
      });
    });
  });

  describe('architectural compliance', () => {
    it('should never reach the default case in getDescription', () => {
      // This test ensures that all valid validation levels have proper descriptions
      // and that the defensive default case is never reached
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
        ValidationLevel.full(),
      ];

      levels.forEach((level) => {
        const description = level.getDescription();
        expect(description).not.toBe('Unknown validation level');
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(5);
      });
    });

    it('should maintain consistent static constant values', () => {
      // Test that performance targets are defined as expected constants
      expect(ValidationLevel.syntax().getPerformanceTargetMs()).toBe(5);
      expect(ValidationLevel.flow().getPerformanceTargetMs()).toBe(8);
      expect(ValidationLevel.semantic().getPerformanceTargetMs()).toBe(10);
      expect(ValidationLevel.style().getPerformanceTargetMs()).toBe(15);
    });

    it('should have all levels properly represented in type union', () => {
      // This validates that ValidationLevelType covers all possible levels
      const levels: Array<{ level: string; shouldBeValid: boolean }> = [
        { level: 'syntax', shouldBeValid: true },
        { level: 'flow', shouldBeValid: true },
        { level: 'semantic', shouldBeValid: true },
        { level: 'style', shouldBeValid: true },
        { level: 'unknown', shouldBeValid: false },
      ];

      levels.forEach(({ level, shouldBeValid }) => {
        const result = ValidationLevel.fromString(level);
        expect(result.isOk()).toBe(shouldBeValid);
      });
    });
  });

  describe('defensive programming and edge case coverage', () => {
    it('should handle potential future extension of getDescription switch', () => {
      // Mock a ValidationLevel with an unknown level type to test default case
      const unknownLevel = ValidationLevel.syntax();
      // Force the level to an unknown value to test default case
      (unknownLevel as any).level = 'unknown' as any;

      const description = unknownLevel.getDescription();
      expect(description).toBe('Unknown validation level');
    });

    it('should maintain private constructor enforcement', () => {
      // ValidationLevel constructor is private, so we test that only factory methods work
      // TypeScript prevents direct instantiation, so we test proper factory method usage
      const level = ValidationLevel.syntax();
      expect(level).toBeDefined();
      expect(level.getLevel()).toBe('syntax');
    });

    it('should preserve immutability characteristics', () => {
      const level = ValidationLevel.syntax();
      const originalLevel = level.getLevel();
      const originalPriority = level.getPriority();
      const originalTarget = level.getPerformanceTargetMs();

      // ValidationLevel follows value object patterns - should maintain consistent values
      expect(level.getLevel()).toBe(originalLevel);
      expect(level.getPriority()).toBe(originalPriority);
      expect(level.getPerformanceTargetMs()).toBe(originalTarget);

      // Multiple calls should return same values
      expect(level.getLevel()).toBe('syntax');
      expect(level.getPriority()).toBe(1);
      expect(level.getPerformanceTargetMs()).toBe(5);
    });

    it('should handle static constant access patterns', () => {
      // Test that static constants are properly accessible
      expect((ValidationLevel as any).SYNTAX_TARGET_MS).toBe(5);
      expect((ValidationLevel as any).FLOW_TARGET_MS).toBe(8);
      expect((ValidationLevel as any).SEMANTIC_TARGET_MS).toBe(10);
      expect((ValidationLevel as any).STYLE_TARGET_MS).toBe(15);
    });
  });

  describe('enhanced coverage scenarios', () => {
    it('should handle getDescription default case for unknown validation levels', () => {
      // Test the defensive default case in getDescription
      const level = ValidationLevel.syntax();

      // Force the level to an unknown value to test default case
      (level as any).level = 'unknown-level' as any;

      const description = level.getDescription();
      expect(description).toBe('Unknown validation level');
    });

    it('should handle includesLevel with edge cases and boundary conditions', () => {
      const levels = [
        ValidationLevel.syntax(), // priority 1
        ValidationLevel.flow(), // priority 2
        ValidationLevel.semantic(), // priority 3
        ValidationLevel.style(), // priority 4
      ];

      // Test boundary conditions for includesLevel
      levels.forEach((level, i) => {
        levels.forEach((otherLevel, j) => {
          const shouldInclude = i >= j; // Higher or equal priority includes lower
          expect(level.includesLevel(otherLevel)).toBe(shouldInclude);
        });
      });
    });

    it('should handle getIncludedLevels with precise level ordering', () => {
      // Test that getIncludedLevels returns exact expected ordering
      const fullLevel = ValidationLevel.full();
      const includedLevels = fullLevel.getIncludedLevels();

      expect(includedLevels).toHaveLength(4);

      // Verify exact ordering and types
      expect(includedLevels[0]?.getLevel()).toBe('syntax');
      expect(includedLevels[0]?.getPriority()).toBe(1);

      expect(includedLevels[1]?.getLevel()).toBe('flow');
      expect(includedLevels[1]?.getPriority()).toBe(2);

      expect(includedLevels[2]?.getLevel()).toBe('semantic');
      expect(includedLevels[2]?.getPriority()).toBe(3);

      expect(includedLevels[3]?.getLevel()).toBe('style');
      expect(includedLevels[3]?.getPriority()).toBe(4);
    });

    it('should handle combineWith with equal priority levels edge case', () => {
      const syntax1 = ValidationLevel.syntax();
      const syntax2 = ValidationLevel.syntax();
      const flow1 = ValidationLevel.flow();
      const flow2 = ValidationLevel.flow();

      // When priorities are equal, should return the first operand
      expect(syntax1.combineWith(syntax2)).toBe(syntax1);
      expect(syntax2.combineWith(syntax1)).toBe(syntax2);
      expect(flow1.combineWith(flow2)).toBe(flow1);
      expect(flow2.combineWith(flow1)).toBe(flow2);
    });

    it('should handle isMoreCriticalThan and isLessCriticalThan with same levels', () => {
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
      ];

      // Same level comparisons should return false
      levels.forEach((level) => {
        const sameLevelInstance = ValidationLevel.fromString(level.getLevel());
        expect(sameLevelInstance.isOk()).toBe(true);

        if (sameLevelInstance.isOk()) {
          expect(level.isMoreCriticalThan(sameLevelInstance.value)).toBe(false);
          expect(level.isLessCriticalThan(sameLevelInstance.value)).toBe(false);
          expect(sameLevelInstance.value.isMoreCriticalThan(level)).toBe(false);
          expect(sameLevelInstance.value.isLessCriticalThan(level)).toBe(false);
        }
      });
    });

    it('should handle fromString with Unicode and special characters edge cases', () => {
      const invalidUnicodeInputs = [
        'syntax\u0000', // Null character
        'flow\u200B', // Zero-width space
        'semantic\uFEFF', // Byte order mark
        'style\u2028', // Line separator
        '\u2029semantic', // Paragraph separator
        'sémantic', // Accented character
        'flöw', // Umlaut
        'стиль', // Cyrillic
        '语法', // Chinese
        'シンタックス', // Japanese
        '🔥syntax', // Emoji
      ];

      invalidUnicodeInputs.forEach((input) => {
        const result = ValidationLevel.fromString(input);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain(`Invalid validation level: ${input}`);
        }
      });
    });

    it('should handle fromString case-insensitive with mixed case edge cases', () => {
      const mixedCaseInputs = [
        { input: 'SyNtAx', expected: 'syntax' },
        { input: 'FlOw', expected: 'flow' },
        { input: 'SEMANTIC', expected: 'semantic' },
        { input: 'sTyLe', expected: 'style' },
        { input: 'sYnTaX', expected: 'syntax' },
        { input: 'fLoW', expected: 'flow' },
        { input: 'SeMaNtIc', expected: 'semantic' },
        { input: 'StYlE', expected: 'style' },
      ];

      mixedCaseInputs.forEach(({ input, expected }) => {
        const result = ValidationLevel.fromString(input);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getLevel()).toBe(expected);
        }
      });
    });

    it('should handle static constant access for performance targets', () => {
      // Test that private static constants are accessible and correct
      expect((ValidationLevel as any).SYNTAX_TARGET_MS).toBe(5);
      expect((ValidationLevel as any).FLOW_TARGET_MS).toBe(8);
      expect((ValidationLevel as any).SEMANTIC_TARGET_MS).toBe(10);
      expect((ValidationLevel as any).STYLE_TARGET_MS).toBe(15);

      // Test that factory methods use these constants correctly
      expect(ValidationLevel.syntax().getPerformanceTargetMs()).toBe(5);
      expect(ValidationLevel.flow().getPerformanceTargetMs()).toBe(8);
      expect(ValidationLevel.semantic().getPerformanceTargetMs()).toBe(10);
      expect(ValidationLevel.style().getPerformanceTargetMs()).toBe(15);
    });

    it('should handle canCombineWith comprehensive testing', () => {
      const allLevels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
        ValidationLevel.full(),
      ];

      // Test all combinations - should always return true
      allLevels.forEach((level1) => {
        allLevels.forEach((level2) => {
          expect(level1.canCombineWith(level2)).toBe(true);
          expect(level2.canCombineWith(level1)).toBe(true);
        });
      });
    });

    it('should handle toString consistency across all level types', () => {
      const levelMappings = [
        { factory: ValidationLevel.syntax, expected: 'syntax' },
        { factory: ValidationLevel.flow, expected: 'flow' },
        { factory: ValidationLevel.semantic, expected: 'semantic' },
        { factory: ValidationLevel.style, expected: 'style' },
        { factory: ValidationLevel.full, expected: 'style' }, // full() returns style
      ];

      levelMappings.forEach(({ factory, expected }) => {
        const level = factory();
        expect(level.toString()).toBe(expected);
        expect(level.getLevel()).toBe(expected);

        // Multiple calls should be consistent
        expect(level.toString()).toBe(level.toString());
        expect(level.getLevel()).toBe(level.getLevel());
      });
    });

    it('should handle equals with reference equality and value equality', () => {
      // Test reference equality (same instance)
      const level = ValidationLevel.syntax();
      expect(level.equals(level)).toBe(true);

      // Test value equality (different instances, same values)
      const syntax1 = ValidationLevel.syntax();
      const syntax2 = ValidationLevel.syntax();
      expect(syntax1).not.toBe(syntax2); // Different instances
      expect(syntax1.equals(syntax2)).toBe(true); // Same values

      // Test inequality
      const flow = ValidationLevel.flow();
      expect(syntax1.equals(flow)).toBe(false);
      expect(flow.equals(syntax1)).toBe(false);
    });

    it('should handle priority number boundaries and edge cases', () => {
      const levels = [
        { level: ValidationLevel.syntax(), expectedPriority: 1 },
        { level: ValidationLevel.flow(), expectedPriority: 2 },
        { level: ValidationLevel.semantic(), expectedPriority: 3 },
        { level: ValidationLevel.style(), expectedPriority: 4 },
      ];

      levels.forEach(({ level, expectedPriority }) => {
        expect(level.getPriority()).toBe(expectedPriority);
        expect(Number.isInteger(level.getPriority())).toBe(true);
        expect(level.getPriority()).toBeGreaterThan(0);
        expect(level.getPriority()).toBeLessThan(10);
      });

      // Test priority ordering is strict
      for (let i = 0; i < levels.length - 1; i++) {
        const current = levels[i];
        const next = levels[i + 1];
        if (current && next) {
          expect(current.level.getPriority()).toBeLessThan(next.level.getPriority());
        }
      }
    });
  });

  describe('performance characteristics and optimization', () => {
    it('should demonstrate factory method efficiency', () => {
      const startTime = performance.now();

      // Create many instances to test performance
      for (let i = 0; i < 1000; i++) {
        ValidationLevel.syntax();
        ValidationLevel.flow();
        ValidationLevel.semantic();
        ValidationLevel.style();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 50ms for 4000 instantiations)
      expect(duration).toBeLessThan(50);
    });

    it('should handle fromString parsing efficiency', () => {
      const testCases = ['syntax', 'flow', 'semantic', 'style'];
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        testCases.forEach((level) => {
          ValidationLevel.fromString(level);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 100ms for 4000 string parsing operations)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('boundary condition testing', () => {
    it('should handle extreme case inputs for fromString', () => {
      const invalidCases = ['', ' ', '\t', '\n', '\r\n', '  syntax  ', 'SYNTAX\n', '\tflow\t'];

      const validCasesWithCaseVariations = ['seMaNtIc', 'StYlE'];

      invalidCases.forEach((input) => {
        const result = ValidationLevel.fromString(input);
        // These should fail validation (empty, whitespace, or have extra whitespace)
        expect(result.isErr()).toBe(true);
      });

      validCasesWithCaseVariations.forEach((input) => {
        const result = ValidationLevel.fromString(input);
        // These should succeed due to case-insensitive handling
        expect(result.isOk()).toBe(true);
      });
    });

    it('should validate priority ordering constraints', () => {
      const levels = [
        ValidationLevel.syntax(), // Priority 1
        ValidationLevel.flow(), // Priority 2
        ValidationLevel.semantic(), // Priority 3
        ValidationLevel.style(), // Priority 4
      ];

      // Ensure strict ordering
      for (let i = 0; i < levels.length - 1; i++) {
        const current = levels[i];
        const next = levels[i + 1];
        if (current && next) {
          expect(current.getPriority()).toBeLessThan(next.getPriority());
          expect(current.isMoreCriticalThan(next)).toBe(true);
          expect(next.isLessCriticalThan(current)).toBe(true);
        }
      }
    });

    it('should validate performance target progression', () => {
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
      ];

      // Ensure performance targets increase with complexity
      for (let i = 0; i < levels.length - 1; i++) {
        const current = levels[i];
        const next = levels[i + 1];
        if (current && next) {
          expect(current.getPerformanceTargetMs()).toBeLessThan(next.getPerformanceTargetMs());
        }
      }
    });
  });

  describe('comprehensive integration scenarios', () => {
    it('should handle complex level hierarchies correctly', () => {
      const syntax = ValidationLevel.syntax();
      const flow = ValidationLevel.flow();
      const semantic = ValidationLevel.semantic();
      const style = ValidationLevel.style();

      // Test comprehensive inclusion logic
      expect(style.includesLevel(syntax)).toBe(true);
      expect(style.includesLevel(flow)).toBe(true);
      expect(style.includesLevel(semantic)).toBe(true);
      expect(style.includesLevel(style)).toBe(true);

      expect(semantic.includesLevel(syntax)).toBe(true);
      expect(semantic.includesLevel(flow)).toBe(true);
      expect(semantic.includesLevel(semantic)).toBe(true);
      expect(semantic.includesLevel(style)).toBe(false);

      expect(flow.includesLevel(syntax)).toBe(true);
      expect(flow.includesLevel(flow)).toBe(true);
      expect(flow.includesLevel(semantic)).toBe(false);
      expect(flow.includesLevel(style)).toBe(false);

      expect(syntax.includesLevel(syntax)).toBe(true);
      expect(syntax.includesLevel(flow)).toBe(false);
      expect(syntax.includesLevel(semantic)).toBe(false);
      expect(syntax.includesLevel(style)).toBe(false);
    });

    it('should maintain consistency across all comparison methods', () => {
      const levels = [
        ValidationLevel.syntax(),
        ValidationLevel.flow(),
        ValidationLevel.semantic(),
        ValidationLevel.style(),
      ];

      levels.forEach((level1, i) => {
        levels.forEach((level2, j) => {
          // Test isMoreCriticalThan vs isLessCriticalThan consistency
          if (i < j) {
            expect(level1.isMoreCriticalThan(level2)).toBe(true);
            expect(level2.isLessCriticalThan(level1)).toBe(true);
            expect(level1.isLessCriticalThan(level2)).toBe(false);
            expect(level2.isMoreCriticalThan(level1)).toBe(false);
          } else if (i > j) {
            expect(level1.isMoreCriticalThan(level2)).toBe(false);
            expect(level2.isLessCriticalThan(level1)).toBe(false);
            expect(level1.isLessCriticalThan(level2)).toBe(true);
            expect(level2.isMoreCriticalThan(level1)).toBe(true);
          } else {
            expect(level1.isMoreCriticalThan(level2)).toBe(false);
            expect(level1.isLessCriticalThan(level2)).toBe(false);
          }

          // Test combineWith consistency
          const combined = level1.combineWith(level2);
          const moreCritical = i < j ? level1 : i > j ? level2 : level1;
          expect(combined.equals(moreCritical)).toBe(true);
        });
      });
    });
  });

  describe('cross-context validation workflows', () => {
    it('should handle validation level progression in proof validation workflow', () => {
      // Simulate a proof validation workflow that progresses through levels
      const validationSteps = [
        { level: ValidationLevel.syntax(), description: 'Parse proof structure' },
        { level: ValidationLevel.flow(), description: 'Validate statement connections' },
        { level: ValidationLevel.semantic(), description: 'Check logical inference rules' },
        { level: ValidationLevel.style(), description: 'Apply style conventions' },
      ];

      // Test progressive validation - each step should include previous steps
      validationSteps.forEach((step, index) => {
        const currentLevel = step.level;

        // Current level should include all previous levels
        for (let i = 0; i <= index; i++) {
          const prevStep = validationSteps[i];
          if (prevStep) {
            expect(currentLevel.includesLevel(prevStep.level)).toBe(true);
          }
        }

        // Current level should NOT include future levels
        for (let i = index + 1; i < validationSteps.length; i++) {
          const futureStep = validationSteps[i];
          if (futureStep) {
            expect(currentLevel.includesLevel(futureStep.level)).toBe(false);
          }
        }
      });
    });

    it('should handle validation level cascading for error reporting', () => {
      // Test how validation levels cascade when errors are found
      const errorScenarios = [
        {
          errorLevel: ValidationLevel.syntax(),
          reportedLevels: [ValidationLevel.syntax()],
          description: 'Syntax errors prevent further validation',
        },
        {
          errorLevel: ValidationLevel.flow(),
          reportedLevels: [ValidationLevel.syntax(), ValidationLevel.flow()],
          description: 'Flow errors allow syntax validation but prevent semantic validation',
        },
        {
          errorLevel: ValidationLevel.semantic(),
          reportedLevels: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
          ],
          description: 'Semantic errors allow syntax/flow validation but prevent style validation',
        },
        {
          errorLevel: ValidationLevel.style(),
          reportedLevels: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
            ValidationLevel.style(),
          ],
          description: 'Style errors allow all other validation levels',
        },
      ];

      errorScenarios.forEach(({ errorLevel, reportedLevels }) => {
        const includedLevels = errorLevel.getIncludedLevels();
        expect(includedLevels).toHaveLength(reportedLevels.length);

        // Verify each expected level is included
        reportedLevels.forEach((expectedLevel) => {
          const isIncluded = includedLevels.some((level) => level.equals(expectedLevel));
          expect(isIncluded).toBe(true);
        });
      });
    });

    it('should handle validation level optimization for performance-critical paths', () => {
      // Test performance-aware validation level selection
      const performanceCriticalScenarios = [
        {
          context: 'Real-time syntax highlighting',
          maxAllowedMs: 5,
          expectedLevel: ValidationLevel.syntax(),
        },
        {
          context: 'On-save validation',
          maxAllowedMs: 10,
          expectedLevel: ValidationLevel.semantic(),
        },
        {
          context: 'Background validation',
          maxAllowedMs: 20,
          expectedLevel: ValidationLevel.style(),
        },
      ];

      performanceCriticalScenarios.forEach(({ maxAllowedMs, expectedLevel }) => {
        // Find the highest validation level that meets performance requirements
        const availableLevels = [
          ValidationLevel.syntax(),
          ValidationLevel.flow(),
          ValidationLevel.semantic(),
          ValidationLevel.style(),
        ];

        const suitableLevels = availableLevels.filter(
          (level) => level.getPerformanceTargetMs() <= maxAllowedMs,
        );

        if (suitableLevels.length > 0) {
          // Get the most comprehensive level that meets performance requirements
          const bestLevel = suitableLevels.reduce((best, current) =>
            current.getPriority() > best.getPriority() ? current : best,
          );

          expect(bestLevel.equals(expectedLevel)).toBe(true);
          expect(bestLevel.getPerformanceTargetMs()).toBeLessThanOrEqual(maxAllowedMs);
        }
      });
    });

    it('should handle validation level combinations in multi-context scenarios', () => {
      // Test validation level combinations across different validation contexts
      const multiContextScenarios = [
        {
          contexts: [
            { name: 'proof-structure', level: ValidationLevel.flow() },
            { name: 'statement-syntax', level: ValidationLevel.syntax() },
            { name: 'logic-rules', level: ValidationLevel.semantic() },
          ],
          expectedCombined: ValidationLevel.syntax(), // Most critical
        },
        {
          contexts: [
            { name: 'style-guide', level: ValidationLevel.style() },
            { name: 'semantic-analysis', level: ValidationLevel.semantic() },
          ],
          expectedCombined: ValidationLevel.semantic(), // More critical than style
        },
        {
          contexts: [
            { name: 'flow-validation', level: ValidationLevel.flow() },
            { name: 'style-validation', level: ValidationLevel.style() },
            { name: 'semantic-validation', level: ValidationLevel.semantic() },
          ],
          expectedCombined: ValidationLevel.flow(), // Most critical
        },
      ];

      multiContextScenarios.forEach(({ contexts, expectedCombined }) => {
        let combinedLevel = contexts[0]?.level;

        // Combine all levels
        for (let i = 1; i < contexts.length; i++) {
          const contextLevel = contexts[i]?.level;
          if (combinedLevel && contextLevel) {
            combinedLevel = combinedLevel.combineWith(contextLevel);
          }
        }

        expect(combinedLevel?.equals(expectedCombined)).toBe(true);
      });
    });
  });

  describe('domain-specific validation patterns', () => {
    it('should handle proof validation level requirements', () => {
      // Test validation levels for different proof validation requirements
      const proofValidationRequirements = [
        {
          proofType: 'mathematical-proof',
          minimumLevel: ValidationLevel.semantic(),
          requiredLevels: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
          ],
          description: 'Mathematical proofs require semantic validation',
        },
        {
          proofType: 'formal-logic',
          minimumLevel: ValidationLevel.flow(),
          requiredLevels: [ValidationLevel.syntax(), ValidationLevel.flow()],
          description: 'Formal logic requires flow validation',
        },
        {
          proofType: 'natural-language-argument',
          minimumLevel: ValidationLevel.style(),
          requiredLevels: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
            ValidationLevel.style(),
          ],
          description: 'Natural language arguments require style validation',
        },
      ];

      proofValidationRequirements.forEach(({ minimumLevel, requiredLevels }) => {
        const includedLevels = minimumLevel.getIncludedLevels();

        // Verify all required levels are included
        requiredLevels.forEach((requiredLevel) => {
          const isIncluded = includedLevels.some((level) => level.equals(requiredLevel));
          expect(isIncluded).toBe(true);
          expect(minimumLevel.includesLevel(requiredLevel)).toBe(true);
        });
      });
    });

    it('should handle validation level escalation scenarios', () => {
      // Test validation level escalation when errors are detected
      const escalationScenarios = [
        {
          initialLevel: ValidationLevel.syntax(),
          detectedIssues: ['syntax-error'],
          escalatedLevel: ValidationLevel.syntax(), // Stay at syntax for syntax errors
        },
        {
          initialLevel: ValidationLevel.semantic(),
          detectedIssues: ['syntax-error'],
          escalatedLevel: ValidationLevel.syntax(), // Escalate down to syntax
        },
        {
          initialLevel: ValidationLevel.flow(),
          detectedIssues: ['flow-error'],
          escalatedLevel: ValidationLevel.syntax(), // Escalate down to syntax
        },
        {
          initialLevel: ValidationLevel.style(),
          detectedIssues: ['style-warning'],
          escalatedLevel: ValidationLevel.style(), // Stay at style for style issues
        },
      ];

      escalationScenarios.forEach(({ initialLevel, escalatedLevel }) => {
        // Test that escalation chooses the most critical level
        const combinedLevel = initialLevel.combineWith(escalatedLevel);
        const expectedLevel = initialLevel.isMoreCriticalThan(escalatedLevel)
          ? initialLevel
          : escalatedLevel;

        expect(combinedLevel.equals(expectedLevel)).toBe(true);
      });
    });

    it('should handle validation level filtering for user preferences', () => {
      // Test filtering validation levels based on user preferences
      const userPreferences = [
        {
          preference: 'performance-focused',
          maxPerformanceMs: 8,
          expectedLevels: [ValidationLevel.syntax(), ValidationLevel.flow()],
        },
        {
          preference: 'comprehensive',
          maxPerformanceMs: 20,
          expectedLevels: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
            ValidationLevel.style(),
          ],
        },
        {
          preference: 'syntax-only',
          maxPerformanceMs: 5,
          expectedLevels: [ValidationLevel.syntax()],
        },
      ];

      userPreferences.forEach(({ maxPerformanceMs, expectedLevels }) => {
        const allLevels = [
          ValidationLevel.syntax(),
          ValidationLevel.flow(),
          ValidationLevel.semantic(),
          ValidationLevel.style(),
        ];

        const filteredLevels = allLevels.filter(
          (level) => level.getPerformanceTargetMs() <= maxPerformanceMs,
        );

        expect(filteredLevels).toHaveLength(expectedLevels.length);

        expectedLevels.forEach((expectedLevel) => {
          const isPresent = filteredLevels.some((level) => level.equals(expectedLevel));
          expect(isPresent).toBe(true);
        });
      });
    });

    it('should handle validation level dependency resolution', () => {
      // Test dependency resolution between validation levels
      const dependencyScenarios = [
        {
          requestedLevel: ValidationLevel.semantic(),
          availableLevels: [ValidationLevel.syntax(), ValidationLevel.flow()],
          resolvedLevel: ValidationLevel.flow(), // Highest available that's included in requested
        },
        {
          requestedLevel: ValidationLevel.style(),
          availableLevels: [ValidationLevel.syntax(), ValidationLevel.semantic()],
          resolvedLevel: ValidationLevel.semantic(), // Highest available that's included in requested
        },
        {
          requestedLevel: ValidationLevel.flow(),
          availableLevels: [ValidationLevel.style()],
          resolvedLevel: null, // No suitable level available
        },
      ];

      dependencyScenarios.forEach(({ requestedLevel, availableLevels, resolvedLevel }) => {
        // Find the highest available level that's included in the requested level
        const suitableLevels = availableLevels.filter((availableLevel) =>
          requestedLevel.includesLevel(availableLevel),
        );

        if (suitableLevels.length > 0) {
          const bestAvailable = suitableLevels.reduce((best, current) =>
            current.getPriority() > best.getPriority() ? current : best,
          );

          if (resolvedLevel) {
            expect(bestAvailable.equals(resolvedLevel)).toBe(true);
          }
        } else {
          expect(resolvedLevel).toBeNull();
        }
      });
    });
  });

  describe('advanced validation level operations', () => {
    it('should handle validation level hierarchy traversal', () => {
      // Test traversing the validation level hierarchy
      const hierarchyTraversal = [
        {
          startLevel: ValidationLevel.style(),
          direction: 'down',
          expectedSequence: [
            ValidationLevel.style(),
            ValidationLevel.semantic(),
            ValidationLevel.flow(),
            ValidationLevel.syntax(),
          ],
        },
        {
          startLevel: ValidationLevel.syntax(),
          direction: 'up',
          expectedSequence: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
            ValidationLevel.style(),
          ],
        },
      ];

      hierarchyTraversal.forEach(({ startLevel, expectedSequence }) => {
        if (startLevel.equals(ValidationLevel.style())) {
          // Test downward traversal (from most comprehensive to least)
          const includedLevels = startLevel.getIncludedLevels();
          const reversedLevels = [...includedLevels].reverse();

          expectedSequence.forEach((expectedLevel, index) => {
            const actualLevel = reversedLevels[index];
            if (actualLevel) {
              expect(actualLevel.equals(expectedLevel)).toBe(true);
            }
          });
        }
      });
    });

    it('should handle validation level set operations', () => {
      // Test set-like operations on validation levels
      const setOperations = [
        {
          operation: 'intersection',
          set1: [ValidationLevel.syntax(), ValidationLevel.flow(), ValidationLevel.semantic()],
          set2: [ValidationLevel.flow(), ValidationLevel.semantic(), ValidationLevel.style()],
          expected: [ValidationLevel.flow(), ValidationLevel.semantic()],
        },
        {
          operation: 'union',
          set1: [ValidationLevel.syntax(), ValidationLevel.flow()],
          set2: [ValidationLevel.semantic(), ValidationLevel.style()],
          expected: [
            ValidationLevel.syntax(),
            ValidationLevel.flow(),
            ValidationLevel.semantic(),
            ValidationLevel.style(),
          ],
        },
      ];

      setOperations.forEach(({ operation, set1, set2, expected }) => {
        if (operation === 'intersection') {
          // Find levels present in both sets
          const intersection = set1.filter((level1) =>
            set2.some((level2) => level1.equals(level2)),
          );

          expect(intersection).toHaveLength(expected.length);
          expected.forEach((expectedLevel) => {
            const isPresent = intersection.some((level) => level.equals(expectedLevel));
            expect(isPresent).toBe(true);
          });
        } else if (operation === 'union') {
          // Combine sets, removing duplicates
          const union = [...set1];
          set2.forEach((level2) => {
            const isDuplicate = union.some((level1) => level1.equals(level2));
            if (!isDuplicate) {
              union.push(level2);
            }
          });

          expect(union).toHaveLength(expected.length);
          expected.forEach((expectedLevel) => {
            const isPresent = union.some((level) => level.equals(expectedLevel));
            expect(isPresent).toBe(true);
          });
        }
      });
    });

    it('should handle validation level conditional logic', () => {
      // Test conditional logic based on validation levels
      const conditionalScenarios = [
        {
          condition: 'is-critical-error',
          testLevel: ValidationLevel.syntax(),
          threshold: ValidationLevel.flow(),
          expectedResult: true, // Syntax is more critical than flow
        },
        {
          condition: 'requires-user-attention',
          testLevel: ValidationLevel.style(),
          threshold: ValidationLevel.semantic(),
          expectedResult: false, // Style is less critical than semantic
        },
        {
          condition: 'performance-acceptable',
          testLevel: ValidationLevel.flow(),
          performanceLimit: 10,
          expectedResult: true, // Flow target (8ms) is under limit (10ms)
        },
        {
          condition: 'performance-acceptable',
          testLevel: ValidationLevel.style(),
          performanceLimit: 10,
          expectedResult: false, // Style target (15ms) exceeds limit (10ms)
        },
      ];

      conditionalScenarios.forEach(
        ({ condition, testLevel, threshold, performanceLimit, expectedResult }) => {
          let actualResult: boolean;

          if (condition === 'is-critical-error' && threshold) {
            actualResult = testLevel.isMoreCriticalThan(threshold);
          } else if (condition === 'requires-user-attention' && threshold) {
            actualResult = testLevel.isMoreCriticalThan(threshold);
          } else if (condition === 'performance-acceptable' && performanceLimit) {
            actualResult = testLevel.getPerformanceTargetMs() <= performanceLimit;
          } else {
            actualResult = false;
          }

          expect(actualResult).toBe(expectedResult);
        },
      );
    });

    it('should handle validation level metadata and context', () => {
      // Test metadata and contextual information for validation levels
      const metadataTests = [
        {
          level: ValidationLevel.syntax(),
          expectedMetadata: {
            isFastValidation: true,
            isComprehensive: false,
            isUserFacing: true,
            isBackgroundSuitable: true,
          },
        },
        {
          level: ValidationLevel.semantic(),
          expectedMetadata: {
            isFastValidation: false,
            isComprehensive: true,
            isUserFacing: true,
            isBackgroundSuitable: true,
          },
        },
        {
          level: ValidationLevel.style(),
          expectedMetadata: {
            isFastValidation: false,
            isComprehensive: true,
            isUserFacing: false,
            isBackgroundSuitable: true,
          },
        },
      ];

      metadataTests.forEach(({ level, expectedMetadata }) => {
        // Test derived metadata properties
        const isFastValidation = level.getPerformanceTargetMs() <= 5;
        const isComprehensive = level.getPriority() >= 3;
        const isUserFacing = level.getPriority() <= 3;
        const isBackgroundSuitable = level.getPerformanceTargetMs() <= 20;

        expect(isFastValidation).toBe(expectedMetadata.isFastValidation);
        expect(isComprehensive).toBe(expectedMetadata.isComprehensive);
        expect(isUserFacing).toBe(expectedMetadata.isUserFacing);
        expect(isBackgroundSuitable).toBe(expectedMetadata.isBackgroundSuitable);
      });
    });

    it('should handle validation level error recovery strategies', () => {
      // Test error recovery strategies based on validation levels
      const recoveryScenarios = [
        {
          errorLevel: ValidationLevel.syntax(),
          recoveryStrategy: 'halt-validation',
          description: 'Syntax errors prevent further validation',
        },
        {
          errorLevel: ValidationLevel.flow(),
          recoveryStrategy: 'continue-with-warnings',
          description: 'Flow errors allow continued validation with warnings',
        },
        {
          errorLevel: ValidationLevel.semantic(),
          recoveryStrategy: 'continue-with-warnings',
          description: 'Semantic errors allow continued validation with warnings',
        },
        {
          errorLevel: ValidationLevel.style(),
          recoveryStrategy: 'continue-silently',
          description: 'Style errors do not interrupt validation',
        },
      ];

      recoveryScenarios.forEach(({ errorLevel, recoveryStrategy }) => {
        // Determine recovery strategy based on validation level criticality
        let expectedStrategy: string;

        if (errorLevel.equals(ValidationLevel.syntax())) {
          expectedStrategy = 'halt-validation';
        } else if (errorLevel.isMoreCriticalThan(ValidationLevel.style())) {
          expectedStrategy = 'continue-with-warnings';
        } else {
          expectedStrategy = 'continue-silently';
        }

        expect(expectedStrategy).toBe(recoveryStrategy);
      });
    });
  });
});
