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
});
