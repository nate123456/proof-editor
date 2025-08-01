import type { Result } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import {
  type AnalysisDepth,
  AnalysisInsight,
  type InsightCategory,
  type InsightPriority,
  MatchContext,
  PatternMatch,
  type PatternType,
  type Position,
  SourceLocation,
  type ValidationScope,
} from '../analysis-types.js';
import { ValidationError } from '../result.js';

// Helper function to safely unwrap results in tests
function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isOk()) {
    return result.value;
  }
  throw new Error(`Failed to unwrap result: ${String(result.error)}`);
}

describe('SourceLocation', () => {
  describe('create', () => {
    it('should create valid source location with basic coordinates', () => {
      const result = SourceLocation.create(1, 5, 2, 10);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getStartLine()).toBe(1);
        expect(result.value.getStartColumn()).toBe(5);
        expect(result.value.getEndLine()).toBe(2);
        expect(result.value.getEndColumn()).toBe(10);
        expect(result.value.getDocumentUri()).toBeUndefined();
      }
    });

    it('should create valid source location with document URI', () => {
      const uri = 'file:///test.ts';
      const result = SourceLocation.create(0, 0, 1, 5, uri);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe(uri);
      }
    });

    it('should reject negative start line', () => {
      const result = SourceLocation.create(-1, 0, 1, 5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Start line cannot be negative');
      }
    });

    it('should reject negative start column', () => {
      const result = SourceLocation.create(0, -1, 1, 5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Start column cannot be negative');
      }
    });

    it('should reject end line before start line', () => {
      const result = SourceLocation.create(5, 0, 3, 5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('End line cannot be before start line');
      }
    });

    it('should reject end column before start column on same line', () => {
      const result = SourceLocation.create(1, 10, 1, 5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('End column cannot be before start column on same line');
      }
    });

    it('should allow equal start and end positions', () => {
      const result = SourceLocation.create(1, 5, 1, 5);

      expect(result.isOk()).toBe(true);
    });

    it('should allow zero coordinates', () => {
      const result = SourceLocation.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('createSinglePosition', () => {
    it('should create single position location', () => {
      const result = SourceLocation.createSinglePosition(3, 7);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.getStartLine()).toBe(3);
        expect(location.getStartColumn()).toBe(7);
        expect(location.getEndLine()).toBe(3);
        expect(location.getEndColumn()).toBe(7);
        expect(location.isSinglePosition()).toBe(true);
      }
    });

    it('should create single position location with document URI', () => {
      const uri = 'file:///test.ts';
      const result = SourceLocation.createSinglePosition(1, 1, uri);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe(uri);
      }
    });

    it('should reject negative coordinates', () => {
      const result = SourceLocation.createSinglePosition(-1, 0);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('createLineRange', () => {
    it('should create line range location', () => {
      const result = SourceLocation.createLineRange(2, 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.getStartLine()).toBe(2);
        expect(location.getStartColumn()).toBe(0);
        expect(location.getEndLine()).toBe(5);
        expect(location.getEndColumn()).toBe(Number.MAX_SAFE_INTEGER);
        expect(location.isSingleLine()).toBe(false);
      }
    });

    it('should create line range with document URI', () => {
      const uri = 'file:///test.ts';
      const result = SourceLocation.createLineRange(0, 2, uri);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe(uri);
      }
    });

    it('should reject invalid line ranges', () => {
      const result = SourceLocation.createLineRange(5, 2);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('createDefault', () => {
    it('should create default location at origin', () => {
      const location = SourceLocation.createDefault();

      expect(location.getStartLine()).toBe(0);
      expect(location.getStartColumn()).toBe(0);
      expect(location.getEndLine()).toBe(0);
      expect(location.getEndColumn()).toBe(0);
      expect(location.getDocumentUri()).toBeUndefined();
    });
  });

  describe('createFromRange', () => {
    it('should create location from range object', () => {
      const start: Position = { line: 1, column: 5 };
      const end: Position = { line: 3, column: 10 };
      const result = SourceLocation.createFromRange(start, end);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.getStartLine()).toBe(1);
        expect(location.getStartColumn()).toBe(5);
        expect(location.getEndLine()).toBe(3);
        expect(location.getEndColumn()).toBe(10);
      }
    });

    it('should create location from range with document URI', () => {
      const start: Position = { line: 0, column: 0 };
      const end: Position = { line: 1, column: 1 };
      const uri = 'file:///test.ts';
      const result = SourceLocation.createFromRange(start, end, uri);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe(uri);
      }
    });

    it('should validate range coordinates', () => {
      const start: Position = { line: 5, column: 0 };
      const end: Position = { line: 2, column: 10 };
      const result = SourceLocation.createFromRange(start, end);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('getters', () => {
    it('should return correct position objects', () => {
      const result = SourceLocation.create(1, 5, 3, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const location = result.value;
        const startPos = location.getStartPosition();
        const endPos = location.getEndPosition();

        expect(startPos).toEqual({ line: 1, column: 5 });
        expect(endPos).toEqual({ line: 3, column: 10 });
      }
    });
  });

  describe('isSingleLine', () => {
    it('should return true for single-line location', () => {
      const result = SourceLocation.create(2, 5, 2, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isSingleLine()).toBe(true);
      }
    });

    it('should return false for multi-line location', () => {
      const result = SourceLocation.create(1, 5, 3, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isSingleLine()).toBe(false);
      }
    });
  });

  describe('isSinglePosition', () => {
    it('should return true for single position', () => {
      const result = SourceLocation.create(2, 5, 2, 5);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isSinglePosition()).toBe(true);
      }
    });

    it('should return false for range on same line', () => {
      const result = SourceLocation.create(2, 5, 2, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isSinglePosition()).toBe(false);
      }
    });

    it('should return false for multi-line range', () => {
      const result = SourceLocation.create(1, 5, 3, 5);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isSinglePosition()).toBe(false);
      }
    });
  });

  describe('getLineCount', () => {
    it('should return 1 for single line', () => {
      const result = SourceLocation.create(5, 0, 5, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getLineCount()).toBe(1);
      }
    });

    it('should return correct count for multi-line', () => {
      const result = SourceLocation.create(2, 0, 5, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getLineCount()).toBe(4); // lines 2, 3, 4, 5
      }
    });
  });

  describe('getColumnCount', () => {
    it('should return column span for single line', () => {
      const result = SourceLocation.create(2, 5, 2, 15);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getColumnCount()).toBe(10);
      }
    });

    it('should return 0 for multi-line location', () => {
      const result = SourceLocation.create(1, 5, 3, 10);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getColumnCount()).toBe(0);
      }
    });

    it('should return 0 for single position', () => {
      const result = SourceLocation.create(2, 5, 2, 5);
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getColumnCount()).toBe(0);
      }
    });
  });

  describe('contains', () => {
    it('should return true when location contains another', () => {
      const outer = unwrap(SourceLocation.create(1, 0, 5, 20));
      const inner = unwrap(SourceLocation.create(2, 5, 3, 10));

      expect(outer.contains(inner)).toBe(true);
    });

    it('should return false when location does not contain another', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10));
      const second = unwrap(SourceLocation.create(3, 0, 4, 10));

      expect(first.contains(second)).toBe(false);
    });

    it('should return true when locations are identical', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10));
      const second = unwrap(SourceLocation.create(1, 5, 3, 10));

      expect(first.contains(second)).toBe(true);
    });

    it('should return false for different documents', () => {
      const first = unwrap(SourceLocation.create(1, 0, 5, 20, 'file:///a.ts'));
      const second = unwrap(SourceLocation.create(2, 5, 3, 10, 'file:///b.ts'));

      expect(first.contains(second)).toBe(false);
    });

    it('should handle edge case with same start line different columns', () => {
      const outer = unwrap(SourceLocation.create(1, 0, 3, 10));
      const inner = unwrap(SourceLocation.create(1, 5, 2, 10));

      expect(outer.contains(inner)).toBe(true);
    });

    it('should handle edge case with same end line different columns', () => {
      const outer = unwrap(SourceLocation.create(1, 0, 3, 20));
      const inner = unwrap(SourceLocation.create(2, 5, 3, 10));

      expect(outer.contains(inner)).toBe(true);
    });
  });

  describe('overlapsRange', () => {
    it('should return true for overlapping ranges', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10));
      const second = unwrap(SourceLocation.create(2, 0, 4, 15));

      expect(first.overlapsRange(second)).toBe(true);
      expect(second.overlapsRange(first)).toBe(true);
    });

    it('should return false for non-overlapping ranges', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10));
      const second = unwrap(SourceLocation.create(3, 0, 4, 10));

      expect(first.overlapsRange(second)).toBe(false);
      expect(second.overlapsRange(first)).toBe(false);
    });

    it('should return true for adjacent ranges touching at boundary', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10));
      const second = unwrap(SourceLocation.create(2, 10, 3, 20));

      expect(first.overlapsRange(second)).toBe(true);
      expect(second.overlapsRange(first)).toBe(true);
    });

    it('should return false for adjacent ranges not touching', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10));
      const second = unwrap(SourceLocation.create(2, 11, 3, 20));

      expect(first.overlapsRange(second)).toBe(false);
      expect(second.overlapsRange(first)).toBe(false);
    });

    it('should return false for different documents', () => {
      const first = unwrap(SourceLocation.create(1, 0, 3, 10, 'file:///a.ts'));
      const second = unwrap(SourceLocation.create(2, 5, 4, 15, 'file:///b.ts'));

      expect(first.overlapsRange(second)).toBe(false);
    });

    it('should handle single-line overlap edge cases', () => {
      const first = unwrap(SourceLocation.create(2, 5, 2, 15));
      const second = unwrap(SourceLocation.create(2, 10, 2, 20));

      expect(first.overlapsRange(second)).toBe(true);
    });
  });

  describe('intersects', () => {
    it('should be alias for overlapsRange', () => {
      const first = unwrap(SourceLocation.create(1, 0, 3, 10));
      const second = unwrap(SourceLocation.create(2, 5, 4, 15));

      expect(first.intersects(second)).toBe(first.overlapsRange(second));
    });
  });

  describe('union', () => {
    it('should create union of two overlapping locations', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10));
      const second = unwrap(SourceLocation.create(2, 0, 4, 15));
      const result = first.union(second);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const union = result.value;
        expect(union.getStartLine()).toBe(1);
        expect(union.getStartColumn()).toBe(5);
        expect(union.getEndLine()).toBe(4);
        expect(union.getEndColumn()).toBe(15);
      }
    });

    it('should create union of non-overlapping locations', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10));
      const second = unwrap(SourceLocation.create(4, 5, 5, 15));
      const result = first.union(second);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const union = result.value;
        expect(union.getStartLine()).toBe(1);
        expect(union.getStartColumn()).toBe(0);
        expect(union.getEndLine()).toBe(5);
        expect(union.getEndColumn()).toBe(15);
      }
    });

    it('should handle same start line case', () => {
      const first = unwrap(SourceLocation.create(2, 10, 3, 5));
      const second = unwrap(SourceLocation.create(2, 5, 4, 15));
      const result = first.union(second);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const union = result.value;
        expect(union.getStartLine()).toBe(2);
        expect(union.getStartColumn()).toBe(5); // min of 10 and 5
        expect(union.getEndLine()).toBe(4);
        expect(union.getEndColumn()).toBe(15);
      }
    });

    it('should handle same end line case', () => {
      const first = unwrap(SourceLocation.create(1, 0, 3, 10));
      const second = unwrap(SourceLocation.create(2, 5, 3, 20));
      const result = first.union(second);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const union = result.value;
        expect(union.getStartLine()).toBe(1);
        expect(union.getStartColumn()).toBe(0);
        expect(union.getEndLine()).toBe(3);
        expect(union.getEndColumn()).toBe(20); // max of 10 and 20
      }
    });

    it('should reject union of locations from different documents', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10, 'file:///a.ts'));
      const second = unwrap(SourceLocation.create(1, 5, 3, 15, 'file:///b.ts'));
      const result = first.union(second);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Cannot union locations from different documents');
      }
    });

    it('should preserve document URI when one location has it', () => {
      const first = unwrap(SourceLocation.create(1, 0, 2, 10, 'file:///test.ts'));
      const second = unwrap(SourceLocation.create(1, 5, 3, 15));
      const result = first.union(second);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe('file:///test.ts');
      }
    });
  });

  describe('withDocument', () => {
    it('should create new location with document URI', () => {
      const original = unwrap(SourceLocation.create(1, 5, 3, 10));
      const withDoc = original.withDocument('file:///test.ts');

      expect(withDoc.getDocumentUri()).toBe('file:///test.ts');
      expect(withDoc.getStartLine()).toBe(1);
      expect(withDoc.getStartColumn()).toBe(5);
      expect(withDoc.getEndLine()).toBe(3);
      expect(withDoc.getEndColumn()).toBe(10);
    });

    it('should replace existing document URI', () => {
      const original = unwrap(SourceLocation.create(1, 5, 3, 10, 'file:///old.ts'));
      const withDoc = original.withDocument('file:///new.ts');

      expect(withDoc.getDocumentUri()).toBe('file:///new.ts');
    });
  });

  describe('toRange', () => {
    it('should convert to Range object', () => {
      const location = unwrap(SourceLocation.create(1, 5, 3, 10));
      const range = location.toRange();

      expect(range.start).toEqual({ line: 1, column: 5 });
      expect(range.end).toEqual({ line: 3, column: 10 });
    });
  });

  describe('toString', () => {
    it('should format single position', () => {
      const location = unwrap(SourceLocation.create(3, 7, 3, 7));
      expect(location.toString()).toBe('3:7');
    });

    it('should format single-line range', () => {
      const location = unwrap(SourceLocation.create(2, 5, 2, 15));
      expect(location.toString()).toBe('2:5-15');
    });

    it('should format multi-line range', () => {
      const location = unwrap(SourceLocation.create(1, 5, 3, 10));
      expect(location.toString()).toBe('1:5-3:10');
    });
  });

  describe('equals', () => {
    it('should return true for identical locations', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10, 'file:///test.ts'));
      const second = unwrap(SourceLocation.create(1, 5, 3, 10, 'file:///test.ts'));

      expect(first.equals(second)).toBe(true);
    });

    it('should return false for different coordinates', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10));
      const second = unwrap(SourceLocation.create(1, 5, 3, 11));

      expect(first.equals(second)).toBe(false);
    });

    it('should return false for different document URIs', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10, 'file:///a.ts'));
      const second = unwrap(SourceLocation.create(1, 5, 3, 10, 'file:///b.ts'));

      expect(first.equals(second)).toBe(false);
    });

    it('should return false when one has document URI and other does not', () => {
      const first = unwrap(SourceLocation.create(1, 5, 3, 10, 'file:///test.ts'));
      const second = unwrap(SourceLocation.create(1, 5, 3, 10));

      expect(first.equals(second)).toBe(false);
    });
  });
});

describe('AnalysisInsight', () => {
  describe('create', () => {
    it('should create valid insight with required fields', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'Missing semicolon',
        'Statement is missing a semicolon',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        expect(insight.getCategory()).toBe('syntax');
        expect(insight.getTitle()).toBe('Missing semicolon');
        expect(insight.getDescription()).toBe('Statement is missing a semicolon');
        expect(insight.getPriority()).toBe('medium'); // default
        expect(insight.getConfidence()).toBe(1.0); // default
        expect(insight.getEvidence()).toEqual([]);
        expect(insight.getRecommendations()).toEqual([]);
        expect(insight.getRelatedPatterns()).toEqual([]);
      }
    });

    it('should create insight with all optional fields', () => {
      const evidence = ['Found at line 5', 'Pattern matches known syntax error'];
      const recommendations = ['Add semicolon', 'Enable linting'];
      const patterns = ['missing-punctuation', 'syntax-error'];

      const result = AnalysisInsight.create(
        'performance',
        'Inefficient loop',
        'Loop can be optimized',
        'high',
        0.85,
        evidence,
        recommendations,
        patterns,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        expect(insight.getCategory()).toBe('performance');
        expect(insight.getTitle()).toBe('Inefficient loop');
        expect(insight.getDescription()).toBe('Loop can be optimized');
        expect(insight.getPriority()).toBe('high');
        expect(insight.getConfidence()).toBe(0.85);
        expect(insight.getEvidence()).toEqual(evidence);
        expect(insight.getRecommendations()).toEqual(recommendations);
        expect(insight.getRelatedPatterns()).toEqual(patterns);
      }
    });

    it('should reject empty title', () => {
      const result = AnalysisInsight.create('syntax', '', 'Some description');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Insight title cannot be empty');
      }
    });

    it('should reject whitespace-only title', () => {
      const result = AnalysisInsight.create('syntax', '   \t\n  ', 'Some description');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Insight title cannot be empty');
      }
    });

    it('should reject empty description', () => {
      const result = AnalysisInsight.create('syntax', 'Valid title', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Insight description cannot be empty');
      }
    });

    it('should reject whitespace-only description', () => {
      const result = AnalysisInsight.create('syntax', 'Valid title', '   \t\n  ');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Insight description cannot be empty');
      }
    });

    it('should reject confidence below 0', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'Valid title',
        'Valid description',
        'medium',
        -0.1,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Confidence must be between 0 and 1');
      }
    });

    it('should reject confidence above 1', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'Valid title',
        'Valid description',
        'medium',
        1.1,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Confidence must be between 0 and 1');
      }
    });

    it('should accept confidence of 0', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'Valid title',
        'Valid description',
        'medium',
        0,
      );

      expect(result.isOk()).toBe(true);
    });

    it('should accept confidence of 1', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'Valid title',
        'Valid description',
        'medium',
        1,
      );

      expect(result.isOk()).toBe(true);
    });

    it('should trim title and description', () => {
      const result = AnalysisInsight.create(
        'syntax',
        '  Trimmed title  ',
        '  Trimmed description  ',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getTitle()).toBe('Trimmed title');
        expect(result.value.getDescription()).toBe('Trimmed description');
      }
    });
  });

  describe('createSyntaxInsight', () => {
    it('should create syntax insight with defaults', () => {
      const result = AnalysisInsight.createSyntaxInsight('Syntax error', 'Invalid syntax detected');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        expect(insight.getCategory()).toBe('syntax');
        expect(insight.getPriority()).toBe('high');
        expect(insight.getConfidence()).toBe(0.9);
        expect(insight.getEvidence()).toEqual([]);
        expect(insight.getRecommendations()).toEqual([]);
      }
    });

    it('should create syntax insight with custom priority and recommendations', () => {
      const recommendations = ['Fix syntax', 'Check documentation'];
      const result = AnalysisInsight.createSyntaxInsight(
        'Minor syntax issue',
        'Non-critical syntax problem',
        'low',
        recommendations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        expect(insight.getPriority()).toBe('low');
        expect(insight.getRecommendations()).toEqual(recommendations);
      }
    });

    it('should validate input like regular create method', () => {
      const result = AnalysisInsight.createSyntaxInsight('', 'Valid description');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('createSemanticInsight', () => {
    it('should create semantic insight with defaults', () => {
      const result = AnalysisInsight.createSemanticInsight(
        'Logic error',
        'Semantic inconsistency detected',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        expect(insight.getCategory()).toBe('semantics');
        expect(insight.getPriority()).toBe('medium');
        expect(insight.getConfidence()).toBe(0.8);
        expect(insight.getEvidence()).toEqual([]);
        expect(insight.getRecommendations()).toEqual([]);
      }
    });

    it('should create semantic insight with evidence and recommendations', () => {
      const evidence = ['Contradicts premise 1', 'Violates logical rule'];
      const recommendations = ['Review logic', 'Check assumptions'];

      const result = AnalysisInsight.createSemanticInsight(
        'Logical inconsistency',
        'Arguments contain contradiction',
        evidence,
        recommendations,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const insight = result.value;
        expect(insight.getEvidence()).toEqual(evidence);
        expect(insight.getRecommendations()).toEqual(recommendations);
      }
    });

    it('should validate input like regular create method', () => {
      const result = AnalysisInsight.createSemanticInsight('Valid title', '');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should identify high priority insights', () => {
      const high = unwrap(AnalysisInsight.create('syntax', 'Title', 'Description', 'high'));
      const medium = unwrap(AnalysisInsight.create('syntax', 'Title', 'Description', 'medium'));
      const low = unwrap(AnalysisInsight.create('syntax', 'Title', 'Description', 'low'));

      expect(high.isHighPriority()).toBe(true);
      expect(medium.isHighPriority()).toBe(false);
      expect(low.isHighPriority()).toBe(false);
    });

    it('should identify high confidence insights', () => {
      const highConf = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 0.8),
      );
      const mediumConf = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 0.7),
      );
      const equalConf = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 0.8),
      );

      expect(highConf.isHighConfidence()).toBe(true);
      expect(mediumConf.isHighConfidence()).toBe(false);
      expect(equalConf.isHighConfidence()).toBe(true);
    });

    it('should detect insights with evidence', () => {
      const withEvidence = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 1.0, ['evidence']),
      );
      const withoutEvidence = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 1.0, []),
      );

      expect(withEvidence.hasEvidence()).toBe(true);
      expect(withoutEvidence.hasEvidence()).toBe(false);
    });

    it('should detect insights with recommendations', () => {
      const withRecs = unwrap(
        AnalysisInsight.create(
          'syntax',
          'Title',
          'Description',
          'medium',
          1.0,
          [],
          ['recommendation'],
        ),
      );
      const withoutRecs = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 1.0, [], []),
      );

      expect(withRecs.hasRecommendations()).toBe(true);
      expect(withoutRecs.hasRecommendations()).toBe(false);
    });

    it('should identify actionable insights', () => {
      // High priority with recommendations
      const actionableHigh = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'high', 0.5, [], ['fix it']),
      );

      // High confidence with recommendations
      const actionableConf = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 0.9, [], ['fix it']),
      );

      // No recommendations
      const notActionable = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'high', 0.9, [], []),
      );

      // Low priority and confidence
      const notActionable2 = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'low', 0.5, [], ['fix it']),
      );

      expect(actionableHigh.isActionable()).toBe(true);
      expect(actionableConf.isActionable()).toBe(true);
      expect(notActionable.isActionable()).toBe(false);
      expect(notActionable2.isActionable()).toBe(false);
    });
  });

  describe('getters return immutable copies', () => {
    it('should return readonly copy of evidence array', () => {
      const evidence = ['evidence 1', 'evidence 2'];
      const insight = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 1.0, evidence),
      );

      const returnedEvidence = insight.getEvidence();

      // Should be different array instances
      expect(returnedEvidence).not.toBe(evidence);
      expect(returnedEvidence).toEqual(evidence);

      // Modifying original should not affect returned
      evidence.push('evidence 3');
      expect(insight.getEvidence()).toEqual(['evidence 1', 'evidence 2']);
    });

    it('should return readonly copy of recommendations array', () => {
      const recommendations = ['rec 1', 'rec 2'];
      const insight = unwrap(
        AnalysisInsight.create(
          'syntax',
          'Title',
          'Description',
          'medium',
          1.0,
          [],
          recommendations,
        ),
      );

      const returnedRecs = insight.getRecommendations();

      expect(returnedRecs).not.toBe(recommendations);
      expect(returnedRecs).toEqual(recommendations);

      recommendations.push('rec 3');
      expect(insight.getRecommendations()).toEqual(['rec 1', 'rec 2']);
    });

    it('should return readonly copy of related patterns array', () => {
      const patterns = ['pattern 1', 'pattern 2'];
      const insight = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'medium', 1.0, [], [], patterns),
      );

      const returnedPatterns = insight.getRelatedPatterns();

      expect(returnedPatterns).not.toBe(patterns);
      expect(returnedPatterns).toEqual(patterns);

      patterns.push('pattern 3');
      expect(insight.getRelatedPatterns()).toEqual(['pattern 1', 'pattern 2']);
    });
  });

  describe('equals', () => {
    it('should return true for insights with same category, title, and description', () => {
      const first = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'high', 0.9, ['evidence']),
      );
      const second = unwrap(
        AnalysisInsight.create('syntax', 'Title', 'Description', 'low', 0.5, []),
      );

      expect(first.equals(second)).toBe(true);
    });

    it('should return false for different categories', () => {
      const first = unwrap(AnalysisInsight.create('syntax', 'Title', 'Description'));
      const second = unwrap(AnalysisInsight.create('semantics', 'Title', 'Description'));

      expect(first.equals(second)).toBe(false);
    });

    it('should return false for different titles', () => {
      const first = unwrap(AnalysisInsight.create('syntax', 'Title 1', 'Description'));
      const second = unwrap(AnalysisInsight.create('syntax', 'Title 2', 'Description'));

      expect(first.equals(second)).toBe(false);
    });

    it('should return false for different descriptions', () => {
      const first = unwrap(AnalysisInsight.create('syntax', 'Title', 'Description 1'));
      const second = unwrap(AnalysisInsight.create('syntax', 'Title', 'Description 2'));

      expect(first.equals(second)).toBe(false);
    });
  });
});

describe('PatternMatch', () => {
  const createTestLocation = () => unwrap(SourceLocation.create(1, 0, 2, 10));

  describe('create', () => {
    it('should create valid pattern match with required fields', () => {
      const location = createTestLocation();

      const result = PatternMatch.create(
        'pattern-1',
        'inference',
        'Modus Ponens',
        location,
        0.9,
        'if A then B, A, therefore B',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        expect(match.getPatternId()).toBe('pattern-1');
        expect(match.getPatternType()).toBe('inference');
        expect(match.getPatternName()).toBe('Modus Ponens');
        expect(match.getLocation()).toBe(location);
        expect(match.getConfidence()).toBe(0.9);
        expect(match.getMatchedContent()).toBe('if A then B, A, therefore B');
        expect(match.getVariables().size).toBe(0);
        expect(match.getContext()).toEqual(MatchContext.createDefault());
      }
    });

    it('should create pattern match with all optional fields', () => {
      const location = createTestLocation();
      const variables = new Map([
        ['A', 'All men are mortal'],
        ['B', 'Socrates is a man'],
      ]);
      const context = MatchContext.createForInference();
      const validationScope: ValidationScope = {
        type: 'statement',
        targetId: 'stmt-1',
        includeConnected: true,
      };

      const result = PatternMatch.create(
        'pattern-2',
        'structural',
        'Syllogism',
        location,
        0.8,
        'Major premise, minor premise, conclusion',
        variables,
        context,
        validationScope,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        expect(match.getVariables().get('A')).toBe('All men are mortal');
        expect(match.getVariables().get('B')).toBe('Socrates is a man');
        expect(match.getContext()).toBe(context);
      }
    });

    it('should reject empty pattern ID', () => {
      const result = PatternMatch.create(
        '',
        'inference',
        'Valid Name',
        createTestLocation(),
        0.8,
        'valid content',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Pattern ID cannot be empty');
      }
    });

    it('should reject whitespace-only pattern ID', () => {
      const result = PatternMatch.create(
        '   \t\n  ',
        'inference',
        'Valid Name',
        createTestLocation(),
        0.8,
        'valid content',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Pattern ID cannot be empty');
      }
    });

    it('should reject empty pattern name', () => {
      const result = PatternMatch.create(
        'valid-id',
        'inference',
        '',
        createTestLocation(),
        0.8,
        'valid content',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Pattern name cannot be empty');
      }
    });

    it('should reject whitespace-only pattern name', () => {
      const result = PatternMatch.create(
        'valid-id',
        'inference',
        '   \t\n  ',
        createTestLocation(),
        0.8,
        'valid content',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Pattern name cannot be empty');
      }
    });

    it('should reject confidence below 0', () => {
      const result = PatternMatch.create(
        'valid-id',
        'inference',
        'Valid Name',
        createTestLocation(),
        -0.1,
        'valid content',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Confidence must be between 0 and 1');
      }
    });

    it('should reject confidence above 1', () => {
      const result = PatternMatch.create(
        'valid-id',
        'inference',
        'Valid Name',
        createTestLocation(),
        1.1,
        'valid content',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Confidence must be between 0 and 1');
      }
    });

    it('should accept confidence of 0 and 1', () => {
      const result1 = PatternMatch.create(
        'valid-id',
        'inference',
        'Valid Name',
        createTestLocation(),
        0,
        'valid content',
      );
      const result2 = PatternMatch.create(
        'valid-id',
        'inference',
        'Valid Name',
        createTestLocation(),
        1,
        'valid content',
      );

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
    });

    it('should reject empty matched content', () => {
      const result = PatternMatch.create(
        'valid-id',
        'inference',
        'Valid Name',
        createTestLocation(),
        0.8,
        '',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Matched content cannot be empty');
      }
    });

    it('should reject whitespace-only matched content', () => {
      const result = PatternMatch.create(
        'valid-id',
        'inference',
        'Valid Name',
        createTestLocation(),
        0.8,
        '   \t\n  ',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Matched content cannot be empty');
      }
    });

    it('should trim pattern ID, name, and content', () => {
      const result = PatternMatch.create(
        '  pattern-id  ',
        'inference',
        '  Pattern Name  ',
        createTestLocation(),
        0.8,
        '  matched content  ',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const match = result.value;
        expect(match.getPatternId()).toBe('pattern-id');
        expect(match.getPatternName()).toBe('Pattern Name');
        expect(match.getMatchedContent()).toBe('matched content');
      }
    });
  });

  describe('utility methods', () => {
    it('should identify high confidence matches', () => {
      const highConf = unwrap(
        PatternMatch.create('id', 'inference', 'name', createTestLocation(), 0.8, 'content'),
      );
      const lowConf = unwrap(
        PatternMatch.create('id', 'inference', 'name', createTestLocation(), 0.7, 'content'),
      );
      const equalConf = unwrap(
        PatternMatch.create('id', 'inference', 'name', createTestLocation(), 0.8, 'content'),
      );

      expect(highConf.isHighConfidence()).toBe(true);
      expect(lowConf.isHighConfidence()).toBe(false);
      expect(equalConf.isHighConfidence()).toBe(true);
    });

    it('should detect matches with variables', () => {
      const withVars = unwrap(
        PatternMatch.create(
          'id',
          'inference',
          'name',
          createTestLocation(),
          0.8,
          'content',
          new Map([['A', 'value']]),
        ),
      );
      const withoutVars = unwrap(
        PatternMatch.create(
          'id',
          'inference',
          'name',
          createTestLocation(),
          0.8,
          'content',
          new Map(),
        ),
      );

      expect(withVars.hasVariables()).toBe(true);
      expect(withoutVars.hasVariables()).toBe(false);
    });

    it('should get specific variables', () => {
      const variables = new Map([
        ['A', 'All men'],
        ['B', 'Socrates'],
      ]);
      const match = unwrap(
        PatternMatch.create(
          'id',
          'inference',
          'name',
          createTestLocation(),
          0.8,
          'content',
          variables,
        ),
      );

      expect(match.getVariable('A')).toBe('All men');
      expect(match.getVariable('B')).toBe('Socrates');
      expect(match.getVariable('C')).toBeUndefined();
    });

    it('should check if variable exists', () => {
      const variables = new Map([['A', 'value']]);
      const match = unwrap(
        PatternMatch.create(
          'id',
          'inference',
          'name',
          createTestLocation(),
          0.8,
          'content',
          variables,
        ),
      );

      expect(match.hasVariable('A')).toBe(true);
      expect(match.hasVariable('B')).toBe(false);
    });
  });

  describe('getVariables returns immutable copy', () => {
    it('should return readonly copy of variables map', () => {
      const variables = new Map([
        ['A', 'value 1'],
        ['B', 'value 2'],
      ]);
      const match = unwrap(
        PatternMatch.create(
          'id',
          'inference',
          'name',
          createTestLocation(),
          0.8,
          'content',
          variables,
        ),
      );

      const returnedVars = match.getVariables();

      // Should be different map instances
      expect(returnedVars).not.toBe(variables);
      expect(returnedVars.get('A')).toBe('value 1');
      expect(returnedVars.get('B')).toBe('value 2');

      // Modifying original should not affect returned
      variables.set('C', 'value 3');
      expect(match.getVariables().has('C')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for matches with same pattern ID, location, and content', () => {
      const location = createTestLocation();
      const first = unwrap(
        PatternMatch.create('pattern-1', 'inference', 'Name 1', location, 0.9, 'content'),
      );
      const second = unwrap(
        PatternMatch.create('pattern-1', 'structural', 'Name 2', location, 0.5, 'content'),
      );

      expect(first.equals(second)).toBe(true);
    });

    it('should return false for different pattern IDs', () => {
      const location = createTestLocation();
      const first = unwrap(
        PatternMatch.create('pattern-1', 'inference', 'name', location, 0.8, 'content'),
      );
      const second = unwrap(
        PatternMatch.create('pattern-2', 'inference', 'name', location, 0.8, 'content'),
      );

      expect(first.equals(second)).toBe(false);
    });

    it('should return false for different locations', () => {
      const location1 = unwrap(SourceLocation.create(1, 0, 2, 10));
      const location2 = unwrap(SourceLocation.create(3, 0, 4, 10));
      const first = unwrap(
        PatternMatch.create('pattern-1', 'inference', 'name', location1, 0.8, 'content'),
      );
      const second = unwrap(
        PatternMatch.create('pattern-1', 'inference', 'name', location2, 0.8, 'content'),
      );

      expect(first.equals(second)).toBe(false);
    });

    it('should return false for different matched content', () => {
      const location = createTestLocation();
      const first = unwrap(
        PatternMatch.create('pattern-1', 'inference', 'name', location, 0.8, 'content 1'),
      );
      const second = unwrap(
        PatternMatch.create('pattern-1', 'inference', 'name', location, 0.8, 'content 2'),
      );

      expect(first.equals(second)).toBe(false);
    });
  });
});

describe('MatchContext', () => {
  describe('createDefault', () => {
    it('should create context with default values', () => {
      const context = MatchContext.createDefault();

      expect(context.getAnalysisDepth()).toBe('basic');
      expect(context.getSurroundingContext()).toBe('');
      expect(context.getRelevanceScore()).toBe(0.5);
      expect(context.getAdditionalMetadata()).toEqual({});
    });
  });

  describe('createForInference', () => {
    it('should create context optimized for inference analysis', () => {
      const context = MatchContext.createForInference();

      expect(context.getAnalysisDepth()).toBe('deep');
      expect(context.getSurroundingContext()).toBe('inference-rule');
      expect(context.getRelevanceScore()).toBe(0.9);
      expect(context.getAdditionalMetadata()).toEqual({ type: 'logical-inference' });
    });
  });

  describe('createForStructural', () => {
    it('should create context optimized for structural analysis', () => {
      const context = MatchContext.createForStructural();

      expect(context.getAnalysisDepth()).toBe('moderate');
      expect(context.getSurroundingContext()).toBe('structural-pattern');
      expect(context.getRelevanceScore()).toBe(0.7);
      expect(context.getAdditionalMetadata()).toEqual({ type: 'proof-structure' });
    });
  });

  describe('getAdditionalMetadata returns immutable copy', () => {
    it('should return copy of metadata object', () => {
      const context = MatchContext.createForInference();
      const metadata = context.getAdditionalMetadata();

      expect(metadata).toEqual({ type: 'logical-inference' });

      // Modifying returned object should not affect internal state
      metadata.newField = 'added';
      expect(context.getAdditionalMetadata()).toEqual({ type: 'logical-inference' });
    });
  });
});

describe('type validation', () => {
  it('should accept all InsightCategory values', () => {
    const categories: InsightCategory[] = [
      'syntax',
      'semantics',
      'performance',
      'educational',
      'style',
      'structure',
      'patterns',
      'validation',
    ];

    categories.forEach((category) => {
      const result = AnalysisInsight.create(category, 'Title', 'Description');
      expect(result.isOk()).toBe(true);
    });
  });

  it('should accept all InsightPriority values', () => {
    const priorities: InsightPriority[] = ['low', 'medium', 'high'];

    priorities.forEach((priority) => {
      const result = AnalysisInsight.create('syntax', 'Title', 'Description', priority);
      expect(result.isOk()).toBe(true);
    });
  });

  it('should accept all PatternType values', () => {
    const types: PatternType[] = [
      'inference',
      'structural',
      'modal',
      'syntax',
      'semantic',
      'educational',
      'validation',
    ];

    types.forEach((type) => {
      const result = PatternMatch.create(
        'id',
        type,
        'name',
        SourceLocation.createDefault(),
        0.8,
        'content',
      );
      expect(result.isOk()).toBe(true);
    });
  });

  it('should accept all AnalysisDepth values', () => {
    const depths: AnalysisDepth[] = ['basic', 'moderate', 'deep'];

    depths.forEach((depth) => {
      // Can't directly test AnalysisDepth since it's used internally in MatchContext
      // but we can verify through MatchContext factory methods
      expect(typeof depth).toBe('string');
    });
  });
});

describe('edge cases and boundary conditions', () => {
  describe('SourceLocation extreme values', () => {
    it('should handle maximum safe integer values', () => {
      const result = SourceLocation.create(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      expect(result.isOk()).toBe(true);
    });

    it('should handle very large coordinate differences', () => {
      const result = SourceLocation.create(0, 0, 1000000, 1000000);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getLineCount()).toBe(1000001);
      }
    });
  });

  describe('confidence edge cases', () => {
    it('should handle confidence at exact boundaries', () => {
      const resultZero = AnalysisInsight.create('syntax', 'title', 'description', 'medium', 0.0);
      const resultOne = AnalysisInsight.create('syntax', 'title', 'description', 'medium', 1.0);

      expect(resultZero.isOk()).toBe(true);
      expect(resultOne.isOk()).toBe(true);
    });

    it('should handle very small positive confidence', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'title',
        'description',
        'medium',
        Number.MIN_VALUE,
      );

      expect(result.isOk()).toBe(true);
    });

    it('should handle confidence very close to 1', () => {
      const result = AnalysisInsight.create(
        'syntax',
        'title',
        'description',
        'medium',
        1 - Number.EPSILON,
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('string content edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = AnalysisInsight.create('syntax', longString, longString);

      expect(result.isOk()).toBe(true);
    });

    it('should handle unicode content', () => {
      const unicode = '🔍 Analysis: ∀x(P(x) → Q(x)) ∧ P(a) ⊢ Q(a)';
      const result = AnalysisInsight.create('syntax', unicode, unicode);

      expect(result.isOk()).toBe(true);
    });

    it('should handle strings with only whitespace variations', () => {
      const spaces = '     ';
      const tabs = '\t\t\t';
      const newlines = '\n\n\n';
      const mixed = ' \t\n \t\n ';

      [spaces, tabs, newlines, mixed].forEach((whitespace) => {
        const result = AnalysisInsight.create('syntax', whitespace, 'valid');
        expect(result.isErr()).toBe(true);
      });
    });
  });

  describe('array and collection edge cases', () => {
    it('should handle empty collections correctly', () => {
      const insight = unwrap(
        AnalysisInsight.create('syntax', 'title', 'description', 'medium', 1.0, [], [], []),
      );

      expect(insight.hasEvidence()).toBe(false);
      expect(insight.hasRecommendations()).toBe(false);
      expect(insight.isActionable()).toBe(false);
      expect(insight.getEvidence()).toEqual([]);
      expect(insight.getRecommendations()).toEqual([]);
      expect(insight.getRelatedPatterns()).toEqual([]);
    });

    it('should handle very large collections', () => {
      const largeArray = Array(1000).fill('item');
      const insight = unwrap(
        AnalysisInsight.create(
          'syntax',
          'title',
          'description',
          'medium',
          1.0,
          largeArray,
          largeArray,
          largeArray,
        ),
      );

      expect(insight.getEvidence()).toHaveLength(1000);
      expect(insight.getRecommendations()).toHaveLength(1000);
      expect(insight.getRelatedPatterns()).toHaveLength(1000);
    });
  });
});
