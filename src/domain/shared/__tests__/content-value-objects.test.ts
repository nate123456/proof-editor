/**
 * Test suite for content value objects
 * Tests content-related value objects with rich behavior
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { StatementContent, Timestamp, Version } from '../value-objects/index.js';

const emptyOrWhitespaceArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n\r'),
  fc.constant('  \t  \n  '),
);

describe('Content Value Objects', () => {
  describe('StatementContent', () => {
    describe('creation and validation', () => {
      it('should create valid StatementContent from valid strings', () => {
        fc.assert(
          fc.property(fc.string({ minLength: 1, maxLength: 10000 }), (value) => {
            if (value.trim().length > 0) {
              const result = StatementContent.create(value);
              expect(result.isOk()).toBe(true);

              if (result.isOk()) {
                expect(result.value.getValue()).toBe(value.trim());
              }
            }
          }),
        );
      });

      it('should reject null and undefined values', () => {
        const nullResult = StatementContent.create(null as any);
        expect(nullResult.isErr()).toBe(true);

        if (nullResult.isErr()) {
          expect(nullResult.error.message).toContain('cannot be null or undefined');
        }

        const undefinedResult = StatementContent.create(undefined as any);
        expect(undefinedResult.isErr()).toBe(true);
      });

      it('should reject empty and whitespace-only content', () => {
        fc.assert(
          fc.property(emptyOrWhitespaceArbitrary, (value) => {
            const result = StatementContent.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('StatementContent cannot be empty');
            }
          }),
        );
      });

      it('should reject content exceeding 10000 characters', () => {
        const longContent = 'x'.repeat(10001);
        const result = StatementContent.create(longContent);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('cannot exceed 10000 characters');
        }
      });

      it('should handle boundary length values', () => {
        // Test exactly 10000 characters
        const maxContent = 'a'.repeat(10000);
        const result = StatementContent.create(maxContent);
        expect(result.isOk()).toBe(true);

        // Test 10001 characters
        const overContent = 'a'.repeat(10001);
        const overResult = StatementContent.create(overContent);
        expect(overResult.isErr()).toBe(true);
      });

      it('should trim whitespace during creation', () => {
        const content = '  This is a test statement  \n\t';
        const result = StatementContent.create(content);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('This is a test statement');
        }
      });
    });

    describe('isEmpty property', () => {
      it('should correctly identify empty content', () => {
        const validResult = StatementContent.create('   content   ');
        expect(validResult.isOk()).toBe(true);
        if (validResult.isOk()) {
          expect(validResult.value.isEmpty).toBe(false);
        }
      });
    });

    describe('wordCount property', () => {
      it('should count words correctly', () => {
        const testCases = [
          { content: 'one', expected: 1 },
          { content: 'one two', expected: 2 },
          { content: 'one  two   three', expected: 3 },
          { content: 'one\ntwo\tthree', expected: 3 },
          { content: 'word-with-dashes', expected: 1 },
          { content: 'punctuation, and symbols!', expected: 3 },
        ];

        testCases.forEach(({ content, expected }) => {
          const result = StatementContent.create(content);
          expect(result.isOk()).toBe(true);

          if (result.isOk()) {
            expect(result.value.wordCount).toBe(expected);
          }
        });
      });

      it('should handle edge cases in word counting', () => {
        const singleChar = StatementContent.create('a');
        expect(singleChar.isOk()).toBe(true);
        if (singleChar.isOk()) {
          expect(singleChar.value.wordCount).toBe(1);
        }

        const numbersAndSymbols = StatementContent.create('123 @#$ test');
        expect(numbersAndSymbols.isOk()).toBe(true);
        if (numbersAndSymbols.isOk()) {
          expect(numbersAndSymbols.value.wordCount).toBe(3);
        }
      });
    });

    describe('comprehensive validation', () => {
      it('should handle maximum allowed content length', () => {
        const maxContent = 'a'.repeat(10000);
        const result = StatementContent.create(maxContent);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(maxContent);
          expect(result.value.wordCount).toBe(1);
        }
      });

      it('should handle complex word counting scenarios', () => {
        const testCases = [
          { content: 'single', expectedWords: 1 },
          { content: 'two words', expectedWords: 2 },
          { content: 'multiple   spaces   between', expectedWords: 3 },
          { content: '\t\nwhitespace\r\n  handling\t', expectedWords: 2 },
          { content: 'punctuation, and; symbols!', expectedWords: 3 },
          { content: '123 456 789', expectedWords: 3 },
          { content: 'emoji 🚀 test', expectedWords: 3 },
        ];

        testCases.forEach(({ content, expectedWords }) => {
          const result = StatementContent.create(content);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.wordCount).toBe(expectedWords);
          }
        });
      });
    });
  });

  describe('Version', () => {
    describe('creation and validation', () => {
      it('should create valid Version from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const result = Version.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          }),
        );
      });

      it('should reject negative numbers', () => {
        fc.assert(
          fc.property(fc.integer({ max: -1 }), (value) => {
            const result = Version.create(value);
            expect(result.isErr()).toBe(true);

            if (result.isErr()) {
              expect(result.error.message).toContain('must be a non-negative integer');
            }
          }),
        );
      });

      it('should reject non-integers', () => {
        const floatResult = Version.create(1.5);
        expect(floatResult.isErr()).toBe(true);

        const nanResult = Version.create(Number.NaN);
        expect(nanResult.isErr()).toBe(true);

        const infinityResult = Version.create(Number.POSITIVE_INFINITY);
        expect(infinityResult.isErr()).toBe(true);
      });

      it('should create initial version', () => {
        const initial = Version.initial();
        expect(initial.getValue()).toBe(0);
      });
    });

    describe('version operations', () => {
      it('should increment version correctly', () => {
        fc.assert(
          fc.property(fc.nat({ max: 1000 }), (value) => {
            const versionResult = Version.create(value);
            expect(versionResult.isOk()).toBe(true);

            if (versionResult.isOk()) {
              const version = versionResult.value;
              const next = version.increment();
              expect(next.getValue()).toBe(value + 1);
            }
          }),
        );
      });

      it('should compare versions correctly', () => {
        const v1Result = Version.create(1);
        const v2Result = Version.create(2);
        const v3Result = Version.create(2);

        expect(v1Result.isOk()).toBe(true);
        expect(v2Result.isOk()).toBe(true);
        expect(v3Result.isOk()).toBe(true);

        if (v1Result.isOk() && v2Result.isOk() && v3Result.isOk()) {
          const v1 = v1Result.value;
          const v2 = v2Result.value;
          const v3 = v3Result.value;

          expect(v2.isAfter(v1)).toBe(true);
          expect(v1.isBefore(v2)).toBe(true);
          expect(v2.isAfter(v3)).toBe(false);
          expect(v3.isBefore(v2)).toBe(false);
        }
      });

      it('should satisfy version ordering properties', () => {
        fc.assert(
          fc.property(fc.nat(), fc.nat(), (a, b) => {
            const vaResult = Version.create(a);
            const vbResult = Version.create(b);

            expect(vaResult.isOk()).toBe(true);
            expect(vbResult.isOk()).toBe(true);

            if (vaResult.isOk() && vbResult.isOk()) {
              const va = vaResult.value;
              const vb = vbResult.value;

              // Trichotomy: exactly one of <, =, > must be true
              const isAfter = va.isAfter(vb);
              const isBefore = va.isBefore(vb);
              const isEqual = va.equals(vb);

              expect(Number(isAfter) + Number(isBefore) + Number(isEqual)).toBe(1);
            }
          }),
        );
      });
    });
  });

  describe('Timestamp', () => {
    describe('creation and validation', () => {
      it('should create valid Timestamp from non-negative integers', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const result = Timestamp.create(value);
            expect(result.isOk()).toBe(true);

            if (result.isOk()) {
              expect(result.value.getValue()).toBe(value);
            }
          }),
        );
      });

      it('should reject negative numbers and non-integers', () => {
        expect(Timestamp.create(-1).isErr()).toBe(true);
        expect(Timestamp.create(1.5).isErr()).toBe(true);
        expect(Timestamp.create(Number.NaN).isErr()).toBe(true);
      });

      it('should create timestamp from current time', () => {
        const now = Timestamp.now();
        const currentTime = Date.now();

        // Should be very close to current time (within 1 second)
        expect(Math.abs(now.getValue() - currentTime)).toBeLessThan(1000);
      });

      it('should create timestamp from Date object', () => {
        const date = new Date('2023-01-01T00:00:00.000Z');
        const timestamp = Timestamp.fromDate(date);

        expect(timestamp.getValue()).toBe(date.getTime());
      });
    });

    describe('timestamp operations', () => {
      it('should convert back to Date correctly', () => {
        fc.assert(
          fc.property(fc.nat(), (value) => {
            const timestampResult = Timestamp.create(value);
            expect(timestampResult.isOk()).toBe(true);

            if (timestampResult.isOk()) {
              const timestamp = timestampResult.value;
              const date = timestamp.toDate();
              expect(date.getTime()).toBe(value);
            }
          }),
        );
      });

      it('should compare timestamps correctly', () => {
        const t1Result = Timestamp.create(1000);
        const t2Result = Timestamp.create(2000);
        const t3Result = Timestamp.create(2000);

        expect(t1Result.isOk()).toBe(true);
        expect(t2Result.isOk()).toBe(true);
        expect(t3Result.isOk()).toBe(true);

        if (t1Result.isOk() && t2Result.isOk() && t3Result.isOk()) {
          const t1 = t1Result.value;
          const t2 = t2Result.value;
          const t3 = t3Result.value;

          expect(t2.isAfter(t1)).toBe(true);
          expect(t1.isBefore(t2)).toBe(true);
          expect(t2.isAfter(t3)).toBe(false);
          expect(t3.isBefore(t2)).toBe(false);
        }
      });

      it('should handle date conversions thoroughly', () => {
        const specificDate = new Date('2024-01-15T10:30:00.000Z');
        const timestampResult = Timestamp.fromDate(specificDate);

        expect(timestampResult.getValue()).toBe(specificDate.getTime());

        const convertedDate = timestampResult.toDate();
        expect(convertedDate.getTime()).toBe(specificDate.getTime());
        expect(convertedDate.toISOString()).toBe(specificDate.toISOString());
      });
    });
  });
});
