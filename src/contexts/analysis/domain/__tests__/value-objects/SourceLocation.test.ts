/**
 * Comprehensive test suite for SourceLocation value object
 *
 * Priority: HIGH (Core value object for tracking positions in source)
 * Demonstrates:
 * - Value object creation with validation
 * - Factory methods for common patterns
 * - Range operations (contains, overlaps, union)
 * - Immutability and transformation
 * - Property-based testing for spatial relationships
 * - Edge cases and boundary conditions
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors/AnalysisErrors.js';
import { type Position, SourceLocation } from '../../value-objects/SourceLocation.js';

// Property-based test generators
const lineArbitrary = fc.integer({ min: 0, max: 10000 });
const columnArbitrary = fc.integer({ min: 0, max: 500 });
const documentUriArbitrary = fc.oneof(
  fc.constant(undefined),
  fc.webUrl(),
  fc.string({ minLength: 1, maxLength: 200 }).map(s => `file:///${s}`)
);

// Generate valid position pairs where end >= start
const validRangeArbitrary = fc
  .tuple(lineArbitrary, columnArbitrary, lineArbitrary, columnArbitrary)
  .filter(([sl, sc, el, ec]) => el > sl || (el === sl && ec >= sc));

// Generate two non-overlapping ranges
const _nonOverlappingRangesArbitrary = fc
  .tuple(
    lineArbitrary,
    columnArbitrary,
    fc.integer({ min: 1, max: 10 }),
    fc.integer({ min: 1, max: 50 })
  )
  .chain(([startLine, startCol, lineGap, colWidth]) => {
    const endLine1 = startLine;
    const endCol1 = startCol + colWidth;
    const startLine2 = startLine + lineGap;
    const startCol2 = 0;
    const endLine2 = startLine2;
    const endCol2 = colWidth;

    return fc.constant([
      [startLine, startCol, endLine1, endCol1],
      [startLine2, startCol2, endLine2, endCol2],
    ]);
  });

describe('SourceLocation Value Object', () => {
  describe('Creation and Validation', () => {
    describe('valid creation cases', () => {
      it('should create valid source location with all parameters', () => {
        const result = SourceLocation.create(10, 5, 15, 20, 'file:///test.ts');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.getStartLine()).toBe(10);
          expect(location.getStartColumn()).toBe(5);
          expect(location.getEndLine()).toBe(15);
          expect(location.getEndColumn()).toBe(20);
          expect(location.getDocumentUri()).toBe('file:///test.ts');
        }
      });

      it('should create valid source location without document URI', () => {
        const result = SourceLocation.create(0, 0, 0, 10);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.getStartLine()).toBe(0);
          expect(location.getStartColumn()).toBe(0);
          expect(location.getEndLine()).toBe(0);
          expect(location.getEndColumn()).toBe(10);
          expect(location.getDocumentUri()).toBeUndefined();
        }
      });

      it('should allow single position (same start and end)', () => {
        const result = SourceLocation.create(5, 10, 5, 10);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.isSinglePosition()).toBe(true);
          expect(location.isSingleLine()).toBe(true);
        }
      });

      it('should handle property-based valid creation', () => {
        fc.assert(
          fc.property(
            validRangeArbitrary,
            documentUriArbitrary,
            ([startLine, startColumn, endLine, endColumn], documentUri) => {
              const result = SourceLocation.create(
                startLine,
                startColumn,
                endLine,
                endColumn,
                documentUri
              );

              expect(result.isOk()).toBe(true);
              if (result.isOk()) {
                const location = result.value;
                expect(location.getStartLine()).toBe(startLine);
                expect(location.getStartColumn()).toBe(startColumn);
                expect(location.getEndLine()).toBe(endLine);
                expect(location.getEndColumn()).toBe(endColumn);
                expect(location.getDocumentUri()).toBe(documentUri);
              }
            }
          )
        );
      });
    });

    describe('invalid creation cases', () => {
      it('should reject negative start line', () => {
        const result = SourceLocation.create(-1, 0, 0, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Start line cannot be negative');
        }
      });

      it('should reject negative start column', () => {
        const result = SourceLocation.create(0, -1, 0, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('Start column cannot be negative');
        }
      });

      it('should reject end line before start line', () => {
        const result = SourceLocation.create(10, 0, 5, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe('End line cannot be before start line');
        }
      });

      it('should reject end column before start column on same line', () => {
        const result = SourceLocation.create(5, 20, 5, 10);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toBe(
            'End column cannot be before start column on same line'
          );
        }
      });

      it('should allow end column before start column on different lines', () => {
        const result = SourceLocation.create(5, 20, 6, 10);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.getStartLine()).toBe(5);
          expect(location.getStartColumn()).toBe(20);
          expect(location.getEndLine()).toBe(6);
          expect(location.getEndColumn()).toBe(10);
        }
      });
    });
  });

  describe('Factory Methods', () => {
    describe('createSinglePosition', () => {
      it('should create single position location', () => {
        const result = SourceLocation.createSinglePosition(10, 15, 'file:///test.ts');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.getStartLine()).toBe(10);
          expect(location.getStartColumn()).toBe(15);
          expect(location.getEndLine()).toBe(10);
          expect(location.getEndColumn()).toBe(15);
          expect(location.isSinglePosition()).toBe(true);
          expect(location.getDocumentUri()).toBe('file:///test.ts');
        }
      });

      it('should validate single position parameters', () => {
        const result = SourceLocation.createSinglePosition(-1, 0);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });

    describe('createLineRange', () => {
      it('should create line range with full column span', () => {
        const result = SourceLocation.createLineRange(5, 10, 'file:///test.ts');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.getStartLine()).toBe(5);
          expect(location.getStartColumn()).toBe(0);
          expect(location.getEndLine()).toBe(10);
          expect(location.getEndColumn()).toBe(Number.MAX_SAFE_INTEGER);
          expect(location.getDocumentUri()).toBe('file:///test.ts');
        }
      });

      it('should validate line range parameters', () => {
        const result = SourceLocation.createLineRange(10, 5);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
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
        expect(location.isSinglePosition()).toBe(true);
      });
    });

    describe('createFromRange', () => {
      it('should create location from position objects', () => {
        const start: Position = { line: 5, column: 10 };
        const end: Position = { line: 8, column: 20 };

        const result = SourceLocation.createFromRange(start, end, 'file:///test.ts');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const location = result.value;
          expect(location.getStartLine()).toBe(5);
          expect(location.getStartColumn()).toBe(10);
          expect(location.getEndLine()).toBe(8);
          expect(location.getEndColumn()).toBe(20);
          expect(location.getDocumentUri()).toBe('file:///test.ts');
        }
      });

      it('should validate range positions', () => {
        const start: Position = { line: 10, column: 0 };
        const end: Position = { line: 5, column: 0 };

        const result = SourceLocation.createFromRange(start, end);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });
  });

  describe('Position and Range Methods', () => {
    it('should return position objects', () => {
      const result = SourceLocation.create(5, 10, 8, 20);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        const startPos = location.getStartPosition();
        const endPos = location.getEndPosition();

        expect(startPos).toEqual({ line: 5, column: 10 });
        expect(endPos).toEqual({ line: 8, column: 20 });
      }
    });

    it('should convert to range object', () => {
      const result = SourceLocation.create(3, 5, 7, 15);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        const range = location.toRange();

        expect(range).toEqual({
          start: { line: 3, column: 5 },
          end: { line: 7, column: 15 },
        });
      }
    });
  });

  describe('Line and Column Analysis', () => {
    describe('single line checks', () => {
      it('should identify single line locations', () => {
        const singleLine = SourceLocation.create(5, 10, 5, 20);
        const multiLine = SourceLocation.create(5, 10, 6, 20);

        expect(singleLine.isOk()).toBe(true);
        expect(multiLine.isOk()).toBe(true);

        if (singleLine.isOk()) {
          expect(singleLine.value.isSingleLine()).toBe(true);
          expect(singleLine.value.getLineCount()).toBe(1);
          expect(singleLine.value.getColumnCount()).toBe(10); // 20 - 10
        }

        if (multiLine.isOk()) {
          expect(multiLine.value.isSingleLine()).toBe(false);
          expect(multiLine.value.getLineCount()).toBe(2);
          expect(multiLine.value.getColumnCount()).toBe(0); // not single line
        }
      });
    });

    describe('single position checks', () => {
      it('should identify single position locations', () => {
        const singlePos = SourceLocation.create(5, 10, 5, 10);
        const singleLine = SourceLocation.create(5, 10, 5, 20);

        expect(singlePos.isOk()).toBe(true);
        expect(singleLine.isOk()).toBe(true);

        if (singlePos.isOk()) {
          expect(singlePos.value.isSinglePosition()).toBe(true);
          expect(singlePos.value.isSingleLine()).toBe(true);
        }

        if (singleLine.isOk()) {
          expect(singleLine.value.isSinglePosition()).toBe(false);
          expect(singleLine.value.isSingleLine()).toBe(true);
        }
      });
    });

    describe('line count calculation', () => {
      it('should calculate line count correctly', () => {
        const testCases = [
          { start: 0, end: 0, expected: 1 },
          { start: 0, end: 1, expected: 2 },
          { start: 5, end: 5, expected: 1 },
          { start: 5, end: 10, expected: 6 },
          { start: 100, end: 200, expected: 101 },
        ];

        testCases.forEach(({ start, end, expected }) => {
          const result = SourceLocation.create(start, 0, end, 0);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.getLineCount()).toBe(expected);
          }
        });
      });
    });
  });

  describe('Spatial Relationships', () => {
    describe('contains', () => {
      it('should detect when one location contains another', () => {
        const outer = SourceLocation.create(5, 10, 10, 20);
        const inner = SourceLocation.create(6, 0, 8, 30);
        const outside = SourceLocation.create(11, 0, 12, 0);

        expect(outer.isOk()).toBe(true);
        expect(inner.isOk()).toBe(true);
        expect(outside.isOk()).toBe(true);

        if (outer.isOk() && inner.isOk() && outside.isOk()) {
          expect(outer.value.contains(inner.value)).toBe(true);
          expect(outer.value.contains(outside.value)).toBe(false);
          expect(inner.value.contains(outer.value)).toBe(false);
        }
      });

      it('should handle exact same locations', () => {
        const location1 = SourceLocation.create(5, 10, 8, 20);
        const location2 = SourceLocation.create(5, 10, 8, 20);

        expect(location1.isOk()).toBe(true);
        expect(location2.isOk()).toBe(true);

        if (location1.isOk() && location2.isOk()) {
          expect(location1.value.contains(location2.value)).toBe(true);
          expect(location2.value.contains(location1.value)).toBe(true);
        }
      });

      it('should handle edge cases for containment', () => {
        const outer = SourceLocation.create(5, 10, 10, 20);
        const startEdge = SourceLocation.create(5, 10, 5, 15);
        const endEdge = SourceLocation.create(10, 15, 10, 20);

        expect(outer.isOk()).toBe(true);
        expect(startEdge.isOk()).toBe(true);
        expect(endEdge.isOk()).toBe(true);

        if (outer.isOk() && startEdge.isOk() && endEdge.isOk()) {
          expect(outer.value.contains(startEdge.value)).toBe(true);
          expect(outer.value.contains(endEdge.value)).toBe(true);
        }
      });

      it('should respect document URI in containment', () => {
        const location1 = SourceLocation.create(5, 10, 10, 20, 'file1.ts');
        const location2 = SourceLocation.create(6, 0, 8, 30, 'file2.ts');

        expect(location1.isOk()).toBe(true);
        expect(location2.isOk()).toBe(true);

        if (location1.isOk() && location2.isOk()) {
          expect(location1.value.contains(location2.value)).toBe(false);
        }
      });
    });

    describe('overlaps and intersects', () => {
      it('should detect overlapping ranges', () => {
        const range1 = SourceLocation.create(5, 10, 10, 20);
        const range2 = SourceLocation.create(8, 0, 12, 30);
        const range3 = SourceLocation.create(11, 0, 15, 0);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);
        expect(range3.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk() && range3.isOk()) {
          expect(range1.value.overlapsRange(range2.value)).toBe(true);
          expect(range2.value.overlapsRange(range1.value)).toBe(true);
          expect(range1.value.overlapsRange(range3.value)).toBe(false);
          expect(range3.value.overlapsRange(range1.value)).toBe(false);
        }
      });

      it('should handle adjacent ranges', () => {
        const range1 = SourceLocation.create(5, 10, 5, 20);
        const range2 = SourceLocation.create(5, 20, 5, 30);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          expect(range1.value.overlapsRange(range2.value)).toBe(true); // touching at column 20
        }
      });

      it('should handle line-adjacent ranges', () => {
        const range1 = SourceLocation.create(5, 0, 5, 50);
        const range2 = SourceLocation.create(6, 0, 6, 50);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          expect(range1.value.overlapsRange(range2.value)).toBe(false);
        }
      });

      it('should have intersects as alias for overlapsRange', () => {
        const range1 = SourceLocation.create(5, 10, 10, 20);
        const range2 = SourceLocation.create(8, 0, 12, 30);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          expect(range1.value.intersects(range2.value)).toBe(
            range1.value.overlapsRange(range2.value)
          );
        }
      });

      it('should respect document URI in overlap detection', () => {
        const range1 = SourceLocation.create(5, 10, 10, 20, 'file1.ts');
        const range2 = SourceLocation.create(8, 0, 12, 30, 'file2.ts');

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          expect(range1.value.overlapsRange(range2.value)).toBe(false);
        }
      });
    });

    describe('union', () => {
      it('should create union of overlapping ranges', () => {
        const range1 = SourceLocation.create(5, 10, 8, 20);
        const range2 = SourceLocation.create(7, 0, 10, 30);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          const unionResult = range1.value.union(range2.value);

          expect(unionResult.isOk()).toBe(true);
          if (unionResult.isOk()) {
            const union = unionResult.value;
            expect(union.getStartLine()).toBe(5);
            expect(union.getStartColumn()).toBe(10);
            expect(union.getEndLine()).toBe(10);
            expect(union.getEndColumn()).toBe(30);
          }
        }
      });

      it('should create union of non-overlapping ranges', () => {
        const range1 = SourceLocation.create(5, 10, 5, 20);
        const range2 = SourceLocation.create(10, 0, 10, 30);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          const unionResult = range1.value.union(range2.value);

          expect(unionResult.isOk()).toBe(true);
          if (unionResult.isOk()) {
            const union = unionResult.value;
            expect(union.getStartLine()).toBe(5);
            expect(union.getStartColumn()).toBe(10);
            expect(union.getEndLine()).toBe(10);
            expect(union.getEndColumn()).toBe(30);
          }
        }
      });

      it('should handle same-line unions correctly', () => {
        const range1 = SourceLocation.create(5, 20, 5, 30);
        const range2 = SourceLocation.create(5, 10, 5, 25);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          const unionResult = range1.value.union(range2.value);

          expect(unionResult.isOk()).toBe(true);
          if (unionResult.isOk()) {
            const union = unionResult.value;
            expect(union.getStartLine()).toBe(5);
            expect(union.getStartColumn()).toBe(10);
            expect(union.getEndLine()).toBe(5);
            expect(union.getEndColumn()).toBe(30);
          }
        }
      });

      it('should reject union of locations from different documents', () => {
        const range1 = SourceLocation.create(5, 10, 8, 20, 'file1.ts');
        const range2 = SourceLocation.create(7, 0, 10, 30, 'file2.ts');

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          const unionResult = range1.value.union(range2.value);

          expect(unionResult.isErr()).toBe(true);
          if (unionResult.isErr()) {
            expect(unionResult.error).toBeInstanceOf(ValidationError);
            expect(unionResult.error.message).toBe(
              'Cannot union locations from different documents'
            );
          }
        }
      });

      it('should preserve document URI in union', () => {
        const range1 = SourceLocation.create(5, 10, 8, 20, 'file.ts');
        const range2 = SourceLocation.create(7, 0, 10, 30, 'file.ts');

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          const unionResult = range1.value.union(range2.value);

          expect(unionResult.isOk()).toBe(true);
          if (unionResult.isOk()) {
            expect(unionResult.value.getDocumentUri()).toBe('file.ts');
          }
        }
      });

      it('should handle union when one location has URI and other does not', () => {
        const range1 = SourceLocation.create(5, 10, 8, 20, 'file.ts');
        const range2 = SourceLocation.create(7, 0, 10, 30);

        expect(range1.isOk()).toBe(true);
        expect(range2.isOk()).toBe(true);

        if (range1.isOk() && range2.isOk()) {
          const unionResult = range1.value.union(range2.value);

          expect(unionResult.isOk()).toBe(true);
          if (unionResult.isOk()) {
            expect(unionResult.value.getDocumentUri()).toBe('file.ts');
          }
        }
      });
    });
  });

  describe('Document URI Management', () => {
    it('should add document URI to location', () => {
      const result = SourceLocation.create(5, 10, 8, 20);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        const withDoc = location.withDocument('file:///new-file.ts');

        // Original unchanged
        expect(location.getDocumentUri()).toBeUndefined();

        // New instance with document
        expect(withDoc.getDocumentUri()).toBe('file:///new-file.ts');
        expect(withDoc.getStartLine()).toBe(location.getStartLine());
        expect(withDoc.getEndLine()).toBe(location.getEndLine());
      }
    });

    it('should replace existing document URI', () => {
      const result = SourceLocation.create(5, 10, 8, 20, 'old-file.ts');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        const withNewDoc = location.withDocument('new-file.ts');

        expect(location.getDocumentUri()).toBe('old-file.ts');
        expect(withNewDoc.getDocumentUri()).toBe('new-file.ts');
      }
    });
  });

  describe('String Representation', () => {
    it('should format single position correctly', () => {
      const result = SourceLocation.create(10, 15, 10, 15);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('10:15');
      }
    });

    it('should format single line range correctly', () => {
      const result = SourceLocation.create(10, 15, 10, 25);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('10:15-25');
      }
    });

    it('should format multi-line range correctly', () => {
      const result = SourceLocation.create(10, 15, 12, 25);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('10:15-12:25');
      }
    });

    it('should handle zero-based positions', () => {
      const result = SourceLocation.create(0, 0, 0, 0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('0:0');
      }
    });
  });

  describe('Equality', () => {
    it('should implement value-based equality', () => {
      const result1 = SourceLocation.create(5, 10, 8, 20);
      const result2 = SourceLocation.create(5, 10, 8, 20);
      const result3 = SourceLocation.create(5, 10, 8, 21);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
        expect(result1.value.equals(result3.value)).toBe(false);
      }
    });

    it('should consider document URI in equality', () => {
      const result1 = SourceLocation.create(5, 10, 8, 20, 'file1.ts');
      const result2 = SourceLocation.create(5, 10, 8, 20, 'file1.ts');
      const result3 = SourceLocation.create(5, 10, 8, 20, 'file2.ts');
      const result4 = SourceLocation.create(5, 10, 8, 20);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);
      expect(result4.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk() && result3.isOk() && result4.isOk()) {
        expect(result1.value.equals(result2.value)).toBe(true);
        expect(result1.value.equals(result3.value)).toBe(false);
        expect(result1.value.equals(result4.value)).toBe(false);
      }
    });

    it('should satisfy equality properties', () => {
      const result = SourceLocation.create(5, 10, 8, 20);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;

        // Reflexivity
        expect(location.equals(location)).toBe(true);

        // Create another equal location
        const result2 = SourceLocation.create(5, 10, 8, 20);
        expect(result2.isOk()).toBe(true);

        if (result2.isOk()) {
          // Symmetry
          expect(location.equals(result2.value)).toBe(result2.value.equals(location));
        }
      }
    });
  });

  describe('Property-Based Testing', () => {
    it('should maintain containment transitivity', () => {
      fc.assert(
        fc.property(
          validRangeArbitrary,
          validRangeArbitrary,
          validRangeArbitrary,
          ([sl1, sc1, el1, ec1], [sl2, sc2, el2, ec2], [sl3, sc3, el3, ec3]) => {
            const loc1 = SourceLocation.create(sl1, sc1, el1, ec1);
            const loc2 = SourceLocation.create(sl2, sc2, el2, ec2);
            const loc3 = SourceLocation.create(sl3, sc3, el3, ec3);

            if (loc1.isOk() && loc2.isOk() && loc3.isOk()) {
              const l1 = loc1.value;
              const l2 = loc2.value;
              const l3 = loc3.value;

              // If l1 contains l2 and l2 contains l3, then l1 should contain l3
              if (l1.contains(l2) && l2.contains(l3)) {
                expect(l1.contains(l3)).toBe(true);
              }
            }
          }
        )
      );
    });

    it('should maintain union commutativity', () => {
      fc.assert(
        fc.property(
          validRangeArbitrary,
          validRangeArbitrary,
          ([sl1, sc1, el1, ec1], [sl2, sc2, el2, ec2]) => {
            const loc1 = SourceLocation.create(sl1, sc1, el1, ec1);
            const loc2 = SourceLocation.create(sl2, sc2, el2, ec2);

            if (loc1.isOk() && loc2.isOk()) {
              const union1 = loc1.value.union(loc2.value);
              const union2 = loc2.value.union(loc1.value);

              if (union1.isOk() && union2.isOk()) {
                expect(union1.value.equals(union2.value)).toBe(true);
              }
            }
          }
        )
      );
    });

    it('should maintain overlap symmetry', () => {
      fc.assert(
        fc.property(
          validRangeArbitrary,
          validRangeArbitrary,
          ([sl1, sc1, el1, ec1], [sl2, sc2, el2, ec2]) => {
            const loc1 = SourceLocation.create(sl1, sc1, el1, ec1);
            const loc2 = SourceLocation.create(sl2, sc2, el2, ec2);

            if (loc1.isOk() && loc2.isOk()) {
              expect(loc1.value.overlapsRange(loc2.value)).toBe(
                loc2.value.overlapsRange(loc1.value)
              );
            }
          }
        )
      );
    });

    it('should have valid line counts', () => {
      fc.assert(
        fc.property(validRangeArbitrary, ([startLine, , endLine]) => {
          const result = SourceLocation.create(startLine, 0, endLine, 0);

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            const lineCount = result.value.getLineCount();
            expect(lineCount).toBeGreaterThan(0);
            expect(lineCount).toBe(endLine - startLine + 1);
          }
        })
      );
    });

    it('should satisfy union containment property', () => {
      fc.assert(
        fc.property(
          validRangeArbitrary,
          validRangeArbitrary,
          ([sl1, sc1, el1, ec1], [sl2, sc2, el2, ec2]) => {
            const loc1 = SourceLocation.create(sl1, sc1, el1, ec1);
            const loc2 = SourceLocation.create(sl2, sc2, el2, ec2);

            if (loc1.isOk() && loc2.isOk()) {
              const unionResult = loc1.value.union(loc2.value);

              if (unionResult.isOk()) {
                const union = unionResult.value;
                // Union should contain both original locations
                expect(union.contains(loc1.value)).toBe(true);
                expect(union.contains(loc2.value)).toBe(true);
              }
            }
          }
        )
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum safe integer values', () => {
      const result = SourceLocation.create(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.getEndLine()).toBe(Number.MAX_SAFE_INTEGER);
        expect(location.getEndColumn()).toBe(Number.MAX_SAFE_INTEGER);
        expect(location.getLineCount()).toBe(Number.MAX_SAFE_INTEGER + 1);
      }
    });

    it('should handle zero-width ranges', () => {
      const result = SourceLocation.create(5, 10, 5, 10);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const location = result.value;
        expect(location.isSinglePosition()).toBe(true);
        expect(location.getColumnCount()).toBe(0);
      }
    });

    it('should handle very long document URIs', () => {
      const longUri = `file:///${'a'.repeat(1000)}/file.ts`;
      const result = SourceLocation.create(0, 0, 0, 0, longUri);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe(longUri);
      }
    });

    it('should handle special characters in document URI', () => {
      const specialUri = 'file:///path with spaces/特殊文字/file.ts';
      const result = SourceLocation.create(0, 0, 0, 0, specialUri);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getDocumentUri()).toBe(specialUri);
      }
    });

    it('should correctly handle adjacent non-overlapping ranges', () => {
      // Ranges that touch at a point but don't overlap
      const range1 = SourceLocation.create(5, 0, 5, 10);
      const range2 = SourceLocation.create(5, 11, 5, 20);

      expect(range1.isOk()).toBe(true);
      expect(range2.isOk()).toBe(true);

      if (range1.isOk() && range2.isOk()) {
        expect(range1.value.overlapsRange(range2.value)).toBe(false);
        expect(range1.value.contains(range2.value)).toBe(false);
        expect(range2.value.contains(range1.value)).toBe(false);
      }
    });

    it('should handle containment edge cases correctly', () => {
      const outer = SourceLocation.create(5, 10, 10, 20);
      const exactStart = SourceLocation.create(5, 10, 5, 10);
      const exactEnd = SourceLocation.create(10, 20, 10, 20);
      const slightlyBefore = SourceLocation.create(5, 9, 5, 10);
      const slightlyAfter = SourceLocation.create(10, 20, 10, 21);

      expect(outer.isOk()).toBe(true);
      expect(exactStart.isOk()).toBe(true);
      expect(exactEnd.isOk()).toBe(true);
      expect(slightlyBefore.isOk()).toBe(true);
      expect(slightlyAfter.isOk()).toBe(true);

      if (
        outer.isOk() &&
        exactStart.isOk() &&
        exactEnd.isOk() &&
        slightlyBefore.isOk() &&
        slightlyAfter.isOk()
      ) {
        expect(outer.value.contains(exactStart.value)).toBe(true);
        expect(outer.value.contains(exactEnd.value)).toBe(true);
        expect(outer.value.contains(slightlyBefore.value)).toBe(false);
        expect(outer.value.contains(slightlyAfter.value)).toBe(false);
      }
    });
  });
});
